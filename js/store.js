/* Local state store. All data lives on this machine:
   - progress/XP/achievements/plan → localStorage (small, synchronous)
   - imported book markdown        → IndexedDB (can be megabytes)
   Nothing is ever sent over the network. */
window.PGRE = window.PGRE || {};

PGRE.store = {
  KEY: 'pgre-state-v1',
  state: null,
  // session-only flags, never part of the saved state (read by boot/UI):
  _recoveredFromCorruption: false, // load() had to discard an unreadable blob
  _persistFailed: false,           // the last save() could not write

  defaults: function () {
    return {
      created: new Date().toISOString(),
      xp: 0,
      // per-question record: { attempts, correct, firstCorrect }
      questions: {},
      // per-topic tallies: { attempted, correct, xp }
      topics: {},
      // achievements: id -> ISO timestamp of unlock
      achievements: {},
      // plan task completion: taskId -> { done: ISO ts, xpGranted: true }
      plan: {},
      // day tracking
      daysActive: [],                        // ['2026-07-14', ...]
      streak: { current: 0, best: 0, lastDay: null },
      // today's counters (reset when the date changes). examAnswered tracks
      // questions answered today in exam mode (recordExamAnswer keeps the other
      // counters practice-only); marathonDay reads answered + examAnswered so a
      // day split across both modes still counts toward Critical Mass.
      today: { date: null, answered: 0, correct: 0, run: 0, bestRun: 0,
               topics: [], planTasks: 0, notesVisited: false, claimed: [],
               examAnswered: 0,
               qotd: null }, // question of the day: null | { qid, correct }
      // one-shot event flags for achievements
      flags: {},
      // per-attempt log, append-only, newest last:
      // { ts, qid, topic, picked, answer, correct, ms, sid, mode,
      //   confidence: 'sure'|'guess'|null }
      attempts: [],
      // practice/drill sessions, newest last:
      // { id, mode, topicId, startedAt, endedAt, planned, answered, correct, xp }
      sessions: [],
      // mistake book: qid -> { firstMissedAt, lastMissedAt, lastPick, wrongPicks[],
      //   misses, solves, srs: { step, due }, archivedAt } — permanent until
      //   archived; a correct-but-guessed answer may add lucky: true
      mistakes: {},
      // mock-exam sessions (engine: js/exam-engine.js), newest last:
      // { id, startedAt, submittedAt, format: '70x120'|'100x170',
      //   source: 'weighted'|'x1'|'x2'|'x3', seed, order: [qid],
      //   answers: {qid: idx}, flags: [qid], durationSec, raw, total,
      //   scaledEst, perTopic: {topic: {right, total}} }
      exams: [],
      // per-question margin notes: qid -> { text, updatedAt } (js/notes.js)
      notes: {},
      // bookmarked questions: qid -> ISO timestamp of bookmarking
      bookmarks: {},
      // user preferences; theme is applied at boot (PGRE.setTheme persists it)
      settings: { theme: 'light', paceTrainer: true, paceTargetSec: 103,
                  keyboard: true, qotdTopicRotate: true, formulaDailyTarget: 10,
                  // exam date (F3) — drives the interval cap + final pass; literal
                  // mirrors PGRE.EXAM_DATE (js/data-topics.js)
                  examDate: '2026-10-28',
                  // F5 — formula Study direction: false = Prompt → Formula (recall
                  // the equation); true = Formula → Prompt (name/state it)
                  formulaReverse: false,
                  // sidebar fold state — the ☰ toggle in the top bar (app.js)
                  sidebarFolded: false },
      // today's progressive formula batch (js/srs.js): rebuilt when the date
      // rolls over — { date, reviewIds: [], newIds: [] }
      formulaDay: null,
      // ITEM 2 — in-progress formula Study session, so an exit/re-enter resumes
      // instead of restarting. Written by js/view-formulas.js on every grade/undo
      // (piggybacking its existing save); null when no session is mid-flight.
      //   { date, queueIds: [], done, again, steps: {id:step}, pressCount,
      //     history: [{id, grade}] } — the undo stack stays session-only
      formulaStudy: null,
      // one-shot data migrations already applied to THIS stored state:
      // name -> ISO timestamp (e.g. easy10, the ITEM 5 Easy-interval recompute)
      migrations: {},
      // passive active-study seconds per day: 'YYYY-MM-DD' -> seconds
      // (js/study-time.js heartbeat engine)
      studyLog: {},
      // F3 focus timer — manual start/stop crediting real elapsed seconds into
      // studyLog (js/timer.js). Same day-keyed seconds map the passive tracker
      // (js/study-time.js) feeds. lastCredit is the crediting anchor. F5 adds
      // goalMin: the armed countdown target in minutes (null = open-ended
      // stopwatch). It lives on state.timer so a reload mid-session keeps the
      // goal (js/timer.js reads it; js/view-focus.js re-arms its UI from it).
      // BUNDLE D adds Pause/Resume: paused freezes crediting without stopping
      // the session; pausedMs accumulates total paused wall-clock so the goal
      // boundary and the logged duration both exclude held time. migrate()'s
      // nested pass over `timer` backfills both on saves from before this build.
      timer: { on: false, startedAt: null, lastCredit: null, goalMin: null, paused: false, pausedMs: 0 },
      // F3 lifetime focus-timer totals: sessions counts on stop; seconds accrues
      // live as time is credited (gap-based, so monotonic across reloads).
      timerStats: { sessions: 0, seconds: 0 },
      // F5 focus session log — append-only, newest last, capped at 300 (oldest
      // dropped). Written by js/timer.js's finalize path so sidebar-stopped and
      // auto-stopped sessions log too. Shown on #/focus "Recent sessions".
      //   { startedAt: ISO, endedAt: ISO, seconds: int, goalMin: number|null, met: bool }
      focusSessions: [],
      // formula cards the user shelved mid-session ("put away"): cardId -> 1.
      // Excluded from all batch building and reconciliation until the user
      // re-selects via the picker or Browse.
      formulaSuspended: {},
      // formula-card SRS state: cardId ->
      //   { reps, lapses, interval, ease, due, reviews, lastGrade, lastReviewedAt }
      cards: {},
      // F10 — capped append-only formula review log (srs.gradeCard), newest last:
      //   { d: 'YYYY-MM-DD', id, g: grade, ivl: pre-review interval,
      //     m: was-mature (ivl>=21), n: had-prior-state } — feeds Memory stats
      cardReviews: [],
      // F2 — per-card mnemonic notes: cardId -> { text, updatedAt }
      cardNotes: {},
      // recent activity feed, newest first
      log: [],
      // content files metadata mirror (text itself is in IndexedDB)
      contentMeta: []
    };
  },

  load: function () {
    var raw = null;
    try {
      raw = localStorage.getItem(this.KEY);
      this.state = raw ? JSON.parse(raw) : this.defaults();
      if (raw && (!this.state || typeof this.state !== 'object' || Array.isArray(this.state))) {
        throw new Error('State is not an object');
      }
    } catch (e) {
      console.warn('State unreadable, starting fresh.', e);
      this._stashCorrupt(raw);
      this.state = this.defaults();
    }
    try {
      this.migrate();
      this.rollDay();
    } catch (e) {
      // parseable but malformed (bad restore, partial write) — same recovery
      console.warn('State malformed, starting fresh.', e);
      this._stashCorrupt(raw);
      this.state = this.defaults();
      this.migrate();
      this.rollDay();
    }
    // ITEM 5 — one-time Easy-interval recompute. Runs AFTER the try/catch so it
    // never trips the corruption-recovery path, and after migrate() has
    // backfilled settings.examDate. PGRE.srs is fully loaded before boot calls
    // load(); guard + isolate anyway so a failure here can't block startup.
    try {
      if (PGRE.srs && PGRE.srs.migrateEasy10) PGRE.srs.migrateEasy10();
    } catch (e) { console.warn('Easy-interval migration skipped', e); }
    return this.state;
  },

  /* Copy an unreadable blob to a side key before rollDay()'s save() overwrites
     the live key with defaults, so hand recovery stays possible. */
  _stashCorrupt: function (raw) {
    this._recoveredFromCorruption = true;
    try {
      if (raw) localStorage.setItem(this.KEY + '-corrupt-' + Date.now(), raw);
    } catch (e) { /* storage full or blocked — nothing more we can do */ }
  },

  /* Fill in keys the schema has grown since this state was saved. Top-level
     keys are added shallowly; `settings`, `today` and `timer` get a nested
     pass too, so new sub-keys appear on old states (e.g. F5's timer.goalMin).
     A non-object `settings`/`today`/`timer` is replaced wholesale rather than
     crashing the nested pass. */
  migrate: function () {
    var d = this.defaults(), st = this.state;
    for (var k in d) if (!(k in st)) st[k] = d[k];
    ['settings', 'today', 'timer'].forEach(function (k) {
      if (!st[k] || typeof st[k] !== 'object' || Array.isArray(st[k])) st[k] = d[k];
      for (var kk in d[k]) if (!(kk in st[k])) st[k][kk] = d[k][kk];
    });
  },

  save: function () {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(this.state));
      if (this._persistFailed) {
        this._persistFailed = false;
        if (PGRE.persistWarning) PGRE.persistWarning(false);
      }
    } catch (e) {
      console.error('Could not persist state', e);
      if (!this._persistFailed) {
        this._persistFailed = true;
        if (PGRE.persistWarning) PGRE.persistWarning(true);
      }
    }
  },

  reset: function () {
    this.state = this.defaults();
    this.save();
  },

  today: function () {
    var d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  },

  yesterday: function () {
    var d = new Date();
    d.setDate(d.getDate() - 1);
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  },

  /* The local calendar day before an arbitrary 'YYYY-MM-DD' (streak continuity
     for touchDay(day)). dayBefore(today()) === yesterday() by construction. */
  dayBefore: function (day) {
    var p = day.split('-');
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    d.setDate(d.getDate() - 1);
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  },

  /* Reset the today-counters when the calendar day changes. */
  rollDay: function () {
    var t = this.today();
    if (this.state.today.date !== t) {
      this.state.today = { date: t, answered: 0, correct: 0, run: 0, bestRun: 0,
                           topics: [], planTasks: 0, notesVisited: false, claimed: [],
                           examAnswered: 0,
                           qotd: null };
      this.save();
    }
  },

  /* Mark a day as a study day and maintain the streak. Defaults to today();
     an explicit 'YYYY-MM-DD' lets a focus session that straddled local midnight
     re-touch the earlier day it credited (js/timer.js) so that day still lands
     in daysActive and keeps the streak intact. Call earlier days before later
     ones so the streak counter chains correctly. */
  touchDay: function (day) {
    var t = day || this.today();
    if (this.state.daysActive.indexOf(t) === -1) {
      this.state.daysActive.push(t);
      var s = this.state.streak;
      if (s.lastDay === this.dayBefore(t)) s.current += 1;
      else if (s.lastDay !== t) s.current = 1;
      s.lastDay = t;
      if (s.current > s.best) s.best = s.current;
    }
    // secret: eve of battle
    if (t === '2026-10-27') this.state.flags.eveOfBattle = true;
  },

  /* Streak shown on the dashboard: broken if the last study day is older than yesterday. */
  liveStreak: function () {
    var s = this.state.streak;
    if (!s.lastDay) return 0;
    if (s.lastDay === this.today() || s.lastDay === this.yesterday()) return s.current;
    return 0;
  },

  log: function (kind, text, xp) {
    this.state.log.unshift({ kind: kind, text: text, xp: xp || 0, ts: new Date().toISOString() });
    if (this.state.log.length > 60) this.state.log.length = 60;
  },

  exportJSON: function () {
    return JSON.stringify(this.state, null, 2);
  },

  importJSON: function (text) {
    var obj = JSON.parse(text); // throws if invalid
    var isObj = function (v) { return !!v && typeof v === 'object' && !Array.isArray(v); };
    var err = new Error('Not a Physics GRE backup file.');
    if (!isObj(obj) || typeof obj.xp !== 'number' || !isObj(obj.today)) throw err;
    // reject wrong-kind containers up front: they would survive migrate() but
    // save a state the views crash on (absent keys are fine — migrate() fills
    // them, so e.g. pre-`settings` backups still import)
    var d = this.defaults();
    for (var k in d) {
      if (!(k in obj)) continue;
      if (Array.isArray(d[k]) ? !Array.isArray(obj[k]) : (isObj(d[k]) && !isObj(obj[k]))) throw err;
    }
    var prev = this.state; // keep the live state so a failed migrate rolls back
    this.state = obj;
    try {
      this.migrate();
    } catch (e) {
      this.state = prev;
      throw e;
    }
    // ITEM 5 — run the one-time Easy-interval recompute on the imported state too,
    // mirroring load(). A restored pre-build backup may still carry stale Easy
    // 3-day due dates and no migrations.easy10 flag; the Library restore handler
    // re-renders (PGRE.route()) rather than reloading, so load() won't run it for
    // this session. Isolated + guarded like load() so a failure can't abort the
    // import. (migrateEasy10 no-ops when the flag is already present.)
    try {
      if (PGRE.srs && PGRE.srs.migrateEasy10) PGRE.srs.migrateEasy10();
    } catch (e) { console.warn('Easy-interval migration skipped', e); }
    this.save();
  }
};

/* ——— IndexedDB store for imported book content ———
   The connection is opened lazily so the app never blocks (or breaks) on it —
   on browsers that refuse IndexedDB (e.g. some file:// contexts) every call
   degrades gracefully to "no content". */
PGRE.contentDB = {
  db: null,
  _opening: null,

  open: function () {
    var self = this;
    if (self.db) return Promise.resolve(self.db);
    if (self._opening) return self._opening;
    self._opening = new Promise(function (resolve) {
      var idb;
      try { idb = window.indexedDB; } catch (e) { idb = null; }
      if (!idb) { resolve(null); return; }
      var req;
      try { req = idb.open('pgre-content', 1); }
      catch (e) { console.warn('IndexedDB unavailable', e); resolve(null); return; }
      req.onupgradeneeded = function (e) {
        e.target.result.createObjectStore('files', { keyPath: 'id' });
      };
      req.onsuccess = function (e) { self.db = e.target.result; resolve(self.db); };
      req.onerror = function () { console.warn('IndexedDB unavailable'); resolve(null); };
      req.onblocked = function () { console.warn('IndexedDB blocked'); resolve(null); };
    });
    return self._opening;
  },

  put: function (rec) {
    var self = this;
    return self.open().then(function () { return self._put(rec); });
  },

  _put: function (rec) {
    var self = this;
    return new Promise(function (resolve, reject) {
      if (!self.db) { reject(new Error('no db')); return; }
      var tx = self.db.transaction('files', 'readwrite');
      tx.objectStore('files').put(rec);
      tx.oncomplete = function () { resolve(rec); };
      tx.onerror = function (e) { reject(e); };
      tx.onabort = function () { reject(tx.error || new Error('IndexedDB transaction aborted')); };
    });
  },

  all: function () {
    var self = this;
    return self.open().then(function () { return self._all(); });
  },

  _all: function () {
    var self = this;
    return new Promise(function (resolve) {
      if (!self.db) { resolve([]); return; }
      var out = [];
      var tx = self.db.transaction('files', 'readonly');
      tx.objectStore('files').openCursor().onsuccess = function (e) {
        var cur = e.target.result;
        if (cur) { out.push(cur.value); cur.continue(); }
        else resolve(out);
      };
      tx.onerror = function () { resolve([]); };
    });
  },

  get: function (id) {
    var self = this;
    return self.open().then(function () {
      return new Promise(function (resolve) {
        if (!self.db) { resolve(null); return; }
        var req = self.db.transaction('files', 'readonly').objectStore('files').get(id);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { resolve(null); };
      });
    });
  },

  del: function (id) {
    var self = this;
    return self.open().then(function () { return self._del(id); });
  },

  _del: function (id) {
    var self = this;
    return new Promise(function (resolve) {
      if (!self.db) { resolve(); return; }
      var tx = self.db.transaction('files', 'readwrite');
      tx.objectStore('files').delete(id);
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { resolve(); };
      tx.onabort = function () { resolve(); }; // best-effort delete: settle, don't hang
    });
  }
};

/* The formula deck, merged from its three sources (first occurrence of an id
   wins): book-derived cards in content/bank/cpg-formulas.js
   (PGRE.BOOK_FORMULAS — gitignored, may be absent), hand-appended literals in
   PGRE.FORMULAS (js/data-formulas.js), and the { id: 'formula-deck',
   cards: [...] } record in the IndexedDB content store. Async because of the
   last one. */
PGRE.formulaDeck = function () {
  return PGRE.contentDB.get('formula-deck').then(function (rec) {
    var seen = {};
    return (PGRE.BOOK_FORMULAS || [])
      .concat(PGRE.FORMULAS, (rec && rec.cards) || [])
      .filter(function (c) {
        if (!c || !c.id || seen[c.id]) return false;
        seen[c.id] = true;
        return true;
      });
  });
};

/* Naive chapter splitter for the raw book markdown (placeholder until the
   real parser is written against the actual file — see docs/Project Docs/DESIGN.md).
   Splits on level-1/level-2 headings. */
PGRE.splitChapters = function (text) {
  var lines = text.split('\n');
  var chapters = [];
  var cur = null;
  lines.forEach(function (line, i) {
    var m = line.match(/^(#{1,2})\s+(.+)/);
    if (m) {
      if (cur) cur.endLine = i;
      cur = { title: m[2].trim(), startLine: i, endLine: lines.length };
      chapters.push(cur);
    }
  });
  if (chapters.length === 0) chapters.push({ title: 'Full document', startLine: 0, endLine: lines.length });
  chapters.forEach(function (ch) {
    ch.text = lines.slice(ch.startLine, ch.endLine).join('\n');
  });
  return chapters.map(function (ch) { return { title: ch.title, text: ch.text }; });
};
