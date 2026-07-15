/* Local state store. All data lives on this machine:
   - progress/XP/achievements/plan → localStorage (small, synchronous)
   - imported book markdown        → IndexedDB (can be megabytes)
   Nothing is ever sent over the network. */
window.PGRE = window.PGRE || {};

PGRE.store = {
  KEY: 'pgre-state-v1',
  state: null,

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
      // today's counters (reset when the date changes)
      today: { date: null, answered: 0, correct: 0, run: 0, bestRun: 0,
               topics: [], planTasks: 0, notesVisited: false, claimed: [] },
      // one-shot event flags for achievements
      flags: {},
      // per-attempt log, append-only, newest last:
      // { ts, qid, topic, picked, answer, correct, ms, sid, mode }
      attempts: [],
      // practice/drill sessions, newest last:
      // { id, mode, topicId, startedAt, endedAt, planned, answered, correct, xp }
      sessions: [],
      // mistake book: qid -> { firstMissedAt, lastMissedAt, lastPick, wrongPicks[],
      //   misses, solves, srs: { step, due }, archivedAt } — permanent until archived
      mistakes: {},
      // formula-card SRS state: cardId ->
      //   { reps, lapses, interval, ease, due, reviews, lastGrade, lastReviewedAt }
      cards: {},
      // recent activity feed, newest first
      log: [],
      // content files metadata mirror (text itself is in IndexedDB)
      contentMeta: []
    };
  },

  load: function () {
    try {
      var raw = localStorage.getItem(this.KEY);
      this.state = raw ? JSON.parse(raw) : this.defaults();
    } catch (e) {
      console.warn('State unreadable, starting fresh.', e);
      this.state = this.defaults();
    }
    // migrate missing keys if schema grew
    var d = this.defaults();
    for (var k in d) if (!(k in this.state)) this.state[k] = d[k];
    this.rollDay();
    return this.state;
  },

  save: function () {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Could not persist state', e);
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

  /* Reset the today-counters when the calendar day changes. */
  rollDay: function () {
    var t = this.today();
    if (this.state.today.date !== t) {
      this.state.today = { date: t, answered: 0, correct: 0, run: 0, bestRun: 0,
                           topics: [], planTasks: 0, notesVisited: false, claimed: [] };
      this.save();
    }
  },

  /* Mark today as a study day and maintain the streak. */
  touchDay: function () {
    var t = this.today();
    if (this.state.daysActive.indexOf(t) === -1) {
      this.state.daysActive.push(t);
      var s = this.state.streak;
      if (s.lastDay === this.yesterday()) s.current += 1;
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
    if (typeof obj.xp !== 'number' || !obj.today) throw new Error('Not a Physics GRE backup file.');
    this.state = obj;
    var d = this.defaults();
    for (var k in d) if (!(k in this.state)) this.state[k] = d[k];
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
    });
  }
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
