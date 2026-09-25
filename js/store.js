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
  _corruptKey: null,               // KEY-corrupt-<ts> written by _stashCorrupt
  _adoptHookBound: false,          // storage listener installed (load() may run twice)

  canWrite: function () { return !this._persistFailed; },

  /* Cross-tab persistence. Two documents of this origin share one localStorage
     key; a tab holding a stale heap used to overwrite a sibling's newer state
     wholesale (reproduced: idle dashboard's pagehide flush erased a study
     tab's recorded attempt). Two guards now prevent that:
       _rev   — monotonic write counter inside the saved blob. save() re-reads
                disk first; a newer disk _rev means a sibling wrote since our
                last sync, so we merge disk into the live heap before writing
                instead of clobbering it.
       _epoch — bumped by reset()/resetFormulaCards()/importJSON(). A higher
                disk epoch means the sibling deliberately wiped; adopt disk
                wholesale, do not resurrect merged-away data.
     A 'storage' event listener keeps idle heaps current so their later saves
     have nothing to merge; the save()-time disk read covers the race window
     between the last event and the write. */
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
      //   misses, solves, srs: { step, due }, archivedAt, lastTouchedAt } — permanent until
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
                  examDate: '2026-11-01',
                  // F3 — when true (default), nextIntervals clamps Hard/Good/Easy
                  // to examCap(); when false, classic uncapped Anki SM-2. Does not
                  // rewrite cards already scheduled; migrate() backfills true.
                  formulaExamCap: true,
                  // F5 — formula Study direction: false = Prompt → Formula (recall
                  // the equation); true = Formula → Prompt (name/state it)
                  formulaReverse: false,
                  // sidebar fold state — the ☰ toggle in the top bar (app.js)
                  sidebarFolded: false,
                  // F5 focus-timer SFX id (js/focus-sound.js catalog). Default
                  // 'off' so existing users are not surprised by sudden sound;
                  // migrate() backfills the key on older saves.
                  focusSound: 'off',
                  // Top-bar focus chip: 'timing' counts up (open-ended
                  // stopwatch); 'countdown' counts down from focusGoalMin
                  // (1–240). Idle pick only — a live session keeps timer.goalMin.
                  // migrate() nested settings pass backfills both keys.
                  focusMode: 'timing',
                  focusGoalMin: 25,
                  // daily activity target in minutes (js/view-study-time.js).
                  // Counts all active time (tab heartbeat + focus timer), not
                  // just focus. 0 = off (editor only, no meter). Default 120;
                  // migrate() backfills the key on older saves via the nested
                  // settings pass.
                  dailyTargetMin: 120 },

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
      // formula-recall daily check-in (签到) — once per local calendar day after a
      // qualifying Study / game settle (js/formula-checkin.js). Distinct from the
      // global study streak (daysActive / streak) so missing practice-only days
      // does not erase formula perseverance feedback.
      //   { current, best, lastDay: 'YYYY-MM-DD'|null }
      formulaCheckIn: { current: 0, best: 0, lastDay: null },
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
      contentMeta: [],
      // deletion markers for user-deletable maps (notes/bookmarks/cardNotes/
      // formulaSuspended) — stops a stale sibling heap resurrecting them
      tombstones: {},
      // last completed practice agent receipt (Website A durability). Also
      // mirrored at localStorage['pgre-agent-receipt']; packReceipts keeps
      // per-pack copies so a later non-pack sitting can overwrite last
      // without losing pack NN.
      lastAgentReceipt: null,
      // pack id '01'..'35' -> receipt object (kind: pgre-agent-receipt)
      packReceipts: {},
      // last formula learning status receipt (kind: pgre-formula-receipt)
      lastFormulaReceipt: null
    };
  },

  /* Merge a sibling tab's disk state into the live heap. Collections union by
     identity, counters take max, scalars prefer live. Keyed maps fill missing
     keys; collisions take the strictly newer record per map, else live.
     Returns nothing — mutates this.state in place. */
  _mergeFromDisk: function (disk) {
    var st = this.state;
    if (!st || !disk || typeof disk !== 'object') return;
    var isObj = function (v) { return !!v && typeof v === 'object' && !Array.isArray(v); };

    // append-only logs: union by identity, keep live order then unseen disk
    // entries appended after (chronological-ish).
    function unionArr(live, inc, keyFn, cap) {
      var seen = {}, out = [], i, k;
      for (i = 0; i < live.length; i++) { k = keyFn(live[i]); seen[k] = 1; out.push(live[i]); }
      for (i = 0; i < inc.length; i++) { k = keyFn(inc[i]); if (!seen[k]) { seen[k] = 1; out.push(inc[i]); } }
      if (cap && out.length > cap) out = out.slice(out.length - cap);
      return out;
    }
    var J = JSON.stringify;
    if (Array.isArray(disk.attempts)) st.attempts = unionArr(st.attempts || [], disk.attempts, function (a) { return a.ts + '|' + a.qid + '|' + a.sid; });
    if (Array.isArray(disk.sessions)) st.sessions = unionArr(st.sessions || [], disk.sessions, function (s) { return s.id || J(s); });
    if (Array.isArray(disk.exams)) st.exams = unionArr(st.exams || [], disk.exams, function (e) { return e.id || J(e); });
    if (Array.isArray(disk.focusSessions)) st.focusSessions = unionArr(st.focusSessions || [], disk.focusSessions, function (s) { return s.startedAt + '|' + s.endedAt; }, 300);
    if (Array.isArray(disk.cardReviews)) st.cardReviews = unionArr(st.cardReviews || [], disk.cardReviews, J);
    if (Array.isArray(disk.daysActive)) st.daysActive = unionArr(st.daysActive || [], disk.daysActive, function (d) { return d; }).sort();
    if (Array.isArray(disk.contentMeta)) st.contentMeta = unionArr(st.contentMeta || [], disk.contentMeta, function (m) { return m.id || J(m); });
    // activity log is newest-first; union then re-sort by ts desc, cap 60
    if (Array.isArray(disk.log)) {
      st.log = unionArr(st.log || [], disk.log, function (l) { return l.ts + '|' + l.kind + '|' + l.text; });
      st.log.sort(function (a, b) {
        return (b.ts || '') < (a.ts || '') ? -1 : ((b.ts || '') > (a.ts || '') ? 1 : 0);
      });
      if (st.log.length > 60) st.log.length = 60;
    }
    // tombstones: user-deletable maps mark deletions with a timestamp so a
    // stale sibling heap can't resurrect the key on a missed storage event.
    // A record whose own timestamp postdates the tombstone is a deliberate
    // re-add and survives (and clears the tombstone); older/untimed = stale.
    var TOMBED = { notes: 1, bookmarks: 1, cardNotes: 1, formulaSuspended: 1 };
    function recTs(map, val) {
      if (map === 'notes' || map === 'cardNotes') return val && val.updatedAt;
      return typeof val === 'string' ? val : null; // bookmarks: ISO; suspended: ISO
    }
    if (isObj(disk.tombstones)) {
      if (!isObj(st.tombstones)) st.tombstones = {};
      for (var tm in disk.tombstones) {
        if (!isObj(st.tombstones[tm])) st.tombstones[tm] = {};
        for (var tk in disk.tombstones[tm]) {
          var ts = disk.tombstones[tm][tk];
          if (!st.tombstones[tm][tk] || ts > st.tombstones[tm][tk]) st.tombstones[tm][tk] = ts;
        }
      }
    }
    // keyed records: union missing keys; on collision cards prefer higher
    // reviews then later lastReviewedAt then later due, mistakes higher
    // misses+solves then later lastTouchedAt, notes/cardNotes later
    // updatedAt, bookmarks/formulaSuspended later ISO;
    // questions/topics/plan/flags/migrations stay fill-missing. Else live.
    function recNewer(map, diskVal, liveVal) {
      if (map === 'cards') {
        var dR = (diskVal && diskVal.reviews) || 0, lR = (liveVal && liveVal.reviews) || 0;
        if (dR > lR) return true;
        if (dR < lR) return false;
        var dAt = (diskVal && diskVal.lastReviewedAt) || '', lAt = (liveVal && liveVal.lastReviewedAt) || '';
        if (dAt > lAt) return true;
        if (dAt < lAt) return false;
        return ((diskVal && diskVal.due) || '') > ((liveVal && liveVal.due) || '');
      }
      if (map === 'mistakes') {
        var dN = ((diskVal && diskVal.misses) || 0) + ((diskVal && diskVal.solves) || 0);
        var lN = ((liveVal && liveVal.misses) || 0) + ((liveVal && liveVal.solves) || 0);
        if (dN > lN) return true;
        if (dN < lN) return false;
        return ((diskVal && diskVal.lastTouchedAt) || '') > ((liveVal && liveVal.lastTouchedAt) || '');
      }
      if (map === 'notes' || map === 'cardNotes') {
        return ((diskVal && diskVal.updatedAt) || '') > ((liveVal && liveVal.updatedAt) || '');
      }
      if (map === 'bookmarks' || map === 'formulaSuspended') {
        return (diskVal || '') > (liveVal || '');
      }
      return false;
    }
    ['questions', 'topics', 'plan', 'mistakes', 'notes', 'bookmarks',
     'flags', 'cards', 'cardNotes', 'formulaSuspended', 'migrations'].forEach(function (k) {
      if (!isObj(disk[k])) return;
      if (!isObj(st[k])) st[k] = {};
      var tombed = st.tombstones && st.tombstones[k];
      for (var key in disk[k]) {
        if (tombed && tombed[key]) {
          var rt = recTs(k, disk[k][key]);
          if (!rt || rt <= tombed[key]) continue;      // stale copy — tombstone wins
          delete tombed[key];                          // newer record = re-add
        }
        if (!(key in st[k]) || recNewer(k, disk[k][key], st[k][key])) st[k][key] = disk[k][key];
      }
    });
    for (var tm2 in TOMBED) {
      var tb = st.tombstones && st.tombstones[tm2];
      if (!tb || !isObj(st[tm2])) continue;
      for (var tk2 in tb) {
        if (!(tk2 in st[tm2])) continue;
        var lts = recTs(tm2, st[tm2][tk2]);
        if (!lts || lts <= tb[tk2]) delete st[tm2][tk2]; // stale live copy
        else delete tb[tk2];                             // live re-add clears it
      }
    }
    // achievements: earliest unlock timestamp wins (first-earned is truth)
    if (isObj(disk.achievements)) {
      if (!isObj(st.achievements)) st.achievements = {};
      for (var a in disk.achievements) {
        if (!(a in st.achievements) || disk.achievements[a] < st.achievements[a]) st.achievements[a] = disk.achievements[a];
      }
    }
    // studyLog: per-day max — summing would double-count two tabs open at once
    if (isObj(disk.studyLog)) {
      if (!isObj(st.studyLog)) st.studyLog = {};
      for (var d in disk.studyLog) st.studyLog[d] = Math.max(st.studyLog[d] || 0, disk.studyLog[d]);
    }

    // counters / monotonic scalars
    st.xp = Math.max(st.xp || 0, disk.xp || 0);
    if (isObj(disk.timerStats)) {
      st.timerStats.sessions = Math.max(st.timerStats.sessions || 0, disk.timerStats.sessions || 0);
      st.timerStats.seconds = Math.max(st.timerStats.seconds || 0, disk.timerStats.seconds || 0);
    }
    // streaks: later lastDay wins; same day → higher current/best
    ['streak', 'formulaCheckIn'].forEach(function (k) {
      var l = st[k], r = disk[k];
      if (!isObj(r)) return;
      if (!isObj(l) || (r.lastDay || '') > (l.lastDay || '')) { st[k] = r; return; }
      if (r.lastDay === l.lastDay) {
        l.current = Math.max(l.current || 0, r.current || 0);
        l.best = Math.max(l.best || 0, r.best || 0);
      }
    });
    // today's counters: same date → per-field max; different date → live wins
    // (a stale-date disk blob is yesterday's leftover, never newer work)
    if (isObj(disk.today) && isObj(st.today) && disk.today.date === st.today.date) {
      var dt = disk.today, lt = st.today;
      ['answered', 'correct', 'run', 'bestRun', 'planTasks', 'examAnswered'].forEach(function (f) {
        lt[f] = Math.max(lt[f] || 0, dt[f] || 0);
      });
      lt.notesVisited = lt.notesVisited || dt.notesVisited;
      lt.topics = unionArr(lt.topics || [], dt.topics || [], function (x) { return x; });
      lt.claimed = unionArr(lt.claimed || [], dt.claimed || [], function (x) { return x; });
      if (!lt.qotd && dt.qotd) lt.qotd = dt.qotd;
    }
    // formulaDay is user selection state, not an append-only log. Explicit
    // writes carry a mutation timestamp/kind so a newer replace/remove from a
    // sibling cannot be undone by a stale heap. Legacy batches without the
    // marker retain the old disjoint-add union behavior.
    if (isObj(disk.formulaDay) && isObj(st.formulaDay)) {
      var df = disk.formulaDay, lf = st.formulaDay;
      var dd = String(df.date || ''), ld = String(lf.date || '');
      var da = Number(df._opAt) || 0, la = Number(lf._opAt) || 0;
      var di = String(df._opId || ''), li = String(lf._opId || '');
      if (dd !== ld) {
        // A current-day explicit fill must beat a stale previous-day shell.
        if (dd > ld) st.formulaDay = df;
      } else if (da && !la) {
        st.formulaDay = df;
      } else if (la && !da) {
        // The live tab has a newer explicit mutation; keep it.
      } else if (da > la) {
        st.formulaDay = df;
      } else if (la > da) {
        // Keep the newer live mutation.
      } else if (da && la && di && li && di !== li) {
        // Same-millisecond writes are still explicit mutations; choose one
        // deterministically instead of falling back to a resurrection-prone
        // union.
        if (di > li) st.formulaDay = df;
      } else {
        ['reviewIds', 'newIds', 'softIds'].forEach(function (f) {
          st.formulaDay[f] = unionArr(st.formulaDay[f] || [], df[f] || [], function (x) { return x; });
        });
      }
      // a soft pin only makes sense for a card still in the batch
      if (st.formulaDay.softIds) {
        var inBatch = {};
        st.formulaDay.reviewIds.concat(st.formulaDay.newIds).forEach(function (id) { inBatch[id] = 1; });
        st.formulaDay.softIds = st.formulaDay.softIds.filter(function (id) { return inBatch[id]; });
        if (!st.formulaDay.softIds.length) delete st.formulaDay.softIds;
      }
    } else if (isObj(disk.formulaDay) && !st.formulaDay) {
      st.formulaDay = disk.formulaDay;
    }
    // in-flight formula Study: an unfinished session beats a finished one;
    // same done-ness → the more-advanced session wins
    if (isObj(disk.formulaStudy)) {
      var ls = st.formulaStudy, ds = disk.formulaStudy;
      if (!isObj(ls) || (!!ls.done && !ds.done) ||
          (!!ls.done === !!ds.done && (ds.pressCount || 0) > (ls.pressCount || 0))) {
        st.formulaStudy = ds;
      }
    }
    // focus timer: a running timer wins; else merge monotonic fields
    if (isObj(disk.timer) && isObj(st.timer)) {
      if (disk.timer.on && !st.timer.on) st.timer = disk.timer;
      else if (!disk.timer.on && st.timer.on) { /* keep live */ }
      else {
        if ((disk.timer.lastCredit || 0) > (st.timer.lastCredit || 0)) st.timer.lastCredit = disk.timer.lastCredit;
        st.timer.pausedMs = Math.max(st.timer.pausedMs || 0, disk.timer.pausedMs || 0);
        if (st.timer.goalMin == null) st.timer.goalMin = disk.timer.goalMin;
      }
    }
    // agent receipts: later completedAt wins for last; per-pack map unions
    // with the same timestamp rule so a sibling's pack copy is not dropped.
    if (disk.lastAgentReceipt) {
      var dRec = disk.lastAgentReceipt, lRec = st.lastAgentReceipt;
      if (!lRec || ((dRec.completedAt || '') > (lRec.completedAt || ''))) {
        st.lastAgentReceipt = dRec;
      }
    }
    if (isObj(disk.packReceipts)) {
      if (!isObj(st.packReceipts)) st.packReceipts = {};
      for (var pk in disk.packReceipts) {
        var dPk = disk.packReceipts[pk], lPk = st.packReceipts[pk];
        if (!lPk || ((dPk && dPk.completedAt) || '') > ((lPk && lPk.completedAt) || '')) {
          st.packReceipts[pk] = dPk;
        }
      }
    }
    if (disk.lastFormulaReceipt) {
      var dF = disk.lastFormulaReceipt, lF = st.lastFormulaReceipt;
      if (!lF || ((dF.exportedAt || '') > (lF.exportedAt || ''))) {
        st.lastFormulaReceipt = dF;
      }
    }
    // settings: prefer live — the storage listener keeps idle heaps current,
    // so a live value differing from disk is this tab's own fresh change.
  },

  /* Mark a user deletion so a stale sibling heap can't resurrect the key on a
     missed storage event. Add paths must call untombstone so a deliberate
     re-add in this tab persists. */
  tombstone: function (map, key) {
    var t = this.state.tombstones || (this.state.tombstones = {});
    (t[map] || (t[map] = {}))[key] = new Date().toISOString();
  },
  untombstone: function (map, key) {
    var t = this.state.tombstones && this.state.tombstones[map];
    if (t) delete t[key];
  },

  /* Adopt a sibling tab's write into the live heap (storage event / pre-save
     read). Higher epoch → wholesale replace; same epoch → merge. */
  _adopt: function (disk) {
    if (!disk || typeof disk !== 'object' || !this.state) return;
    var diskEpoch = disk._epoch || 0, liveEpoch = this.state._epoch || 0;
    if (diskEpoch > liveEpoch) {
      this.state = disk;
      this.migrate();
    } else if (diskEpoch === liveEpoch) {
      if ((disk._rev || 0) > (this.state._rev || 0)) this._mergeFromDisk(disk);
      else return; // stale or own echo — nothing to absorb
    } else {
      return; // our epoch is ahead; disk is pre-reset leftovers
    }
    this.state._rev = Math.max(this.state._rev || 0, disk._rev || 0);
    if (typeof PGRE.onStateAdopted === 'function') {
      try { PGRE.onStateAdopted(); } catch (e) { /* repaint hook must not break persist */ }
    }
  },

  _bindAdoptHook: function () {
    if (this._adoptHookBound || typeof window === 'undefined' || !window.addEventListener) return;
    this._adoptHookBound = true;
    var self = this;
    window.addEventListener('storage', function (e) {
      if (!e || e.key !== self.KEY || !e.newValue) return;
      try { self._adopt(JSON.parse(e.newValue)); } catch (err) { /* peer write unreadable */ }
    });
  },

  load: function () {
    this._bindAdoptHook();
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
    // ankiReset2026 — one-time migration resetting formula card states to scratch
    if (!this.state.migrations || typeof this.state.migrations !== 'object') this.state.migrations = {};
    if (!this.state.migrations.ankiReset2026) {
      this.resetFormulaCards();
      this.state.migrations.ankiReset2026 = new Date().toISOString();
      this.save();
    }
    // planRebuild2026 — drop orphaned Jul-13 plan ids (XP already granted is kept)
    if (!this.state.migrations.planRebuild2026) {
      var plan = this.state.plan || {};
      Object.keys(plan).forEach(function (k) {
        if (/^w\d{2}t\d+$/.test(k)) delete plan[k];
      });
      this.state.migrations.planRebuild2026 = new Date().toISOString();
      this.save();
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
      if (raw) {
        var key = this.KEY + '-corrupt-' + Date.now();
        localStorage.setItem(key, raw);
        this._corruptKey = key;
      }
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
    if (st.settings && typeof st.settings === 'object' && !Array.isArray(st.settings)) {
      if (st.settings.dailyTargetMin === undefined && typeof st.settings.focusDailyMin === 'number') {
        st.settings.dailyTargetMin = st.settings.focusDailyMin;
      }
      delete st.settings.focusDailyMin;
    }
    ['settings', 'today', 'timer', 'formulaCheckIn', 'streak'].forEach(function (k) {
      if (!st[k] || typeof st[k] !== 'object' || Array.isArray(st[k])) st[k] = d[k];
      for (var kk in d[k]) if (!(kk in st[k])) st[k][kk] = d[k][kk];
    });
    if (typeof st._rev !== 'number') st._rev = 0;
    if (typeof st._epoch !== 'number') st._epoch = 0;
    if (st.settings.examDate === '2026-10-28') st.settings.examDate = '2026-11-01';
  },

  save: function () {
    try {
      // Absorb a sibling tab's newer write before overwriting: without this
      // read-merge-write a stale heap clobbers work recorded in another tab.
      var raw = localStorage.getItem(this.KEY);
      if (raw) {
        var disk = null;
        try { disk = JSON.parse(raw); } catch (e) { disk = null; }
        this._adopt(disk);
      }
      // _rev counts successful writes only: roll it back if setItem throws so
      // a recovering tab still sees a sibling's newer disk _rev and merges it.
      var nextRev = (this.state._rev || 0) + 1;
      this.state._rev = nextRev;
      var blob = JSON.stringify(this.state);
      try {
        localStorage.setItem(this.KEY, blob);
      } catch (we) {
        this.state._rev = nextRev - 1;
        throw we;
      }
      if (this.state._rev % 20 === 0) {
        try {
          localStorage.setItem(this.KEY + '-backup', blob);
        } catch (be) { /* backup is best-effort — do not flip _persistFailed */ }
      }
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

  /* Highest epoch seen anywhere (live heap + disk). Deliberate wipes must beat
     a sibling's missed-event epoch or save() would merge the wipe away. */
  _maxEpoch: function (extra) {
    var e = Math.max((this.state && this.state._epoch) || 0, extra || 0);
    try {
      var raw = localStorage.getItem(this.KEY);
      if (raw) {
        var disk = JSON.parse(raw);
        if (disk && disk._epoch > e) e = disk._epoch;
      }
    } catch (err) { /* unreadable disk — live epoch stands */ }
    return e;
  },

  reset: function () {
    var epoch = this._maxEpoch() + 1;
    this.state = this.defaults();
    this.state._epoch = epoch; // higher epoch forces siblings to adopt wholesale
    this.state._rev = 0;
    this.save();
  },

  resetFormulaCards: function () {
    if (!this.state) return;
    this.state.cards = {};
    this.state.cardReviews = [];
    this.state.formulaDay = null;
    this.state.formulaStudy = null;
    this.state.formulaSuspended = {};
    this.state.tombstones = {};
    this.state._epoch = this._maxEpoch() + 1; // deletions must not merge back
    if (this.state.migrations) delete this.state.migrations.easy10;
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
    // a restore replaces the dataset wholesale — bump epoch past live, disk,
    // and the imported blob so sibling tabs adopt instead of merging back
    this.state._epoch = this._maxEpoch(Math.max(obj._epoch || 0, (prev && prev._epoch) || 0)) + 1;
    this.state._rev = 0;
    try {
      this.migrate();
    } catch (e) {
      this.state = prev;
      throw e;
    }
    // ankiReset2026 — one-time migration resetting formula card states to scratch
    if (!this.state.migrations || typeof this.state.migrations !== 'object') this.state.migrations = {};
    if (!this.state.migrations.ankiReset2026) {
      this.resetFormulaCards();
      this.state.migrations.ankiReset2026 = new Date().toISOString();
      this.save();
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
  },

  restoreBackup: function () {
    var raw;
    try {
      raw = localStorage.getItem(this.KEY + '-backup');
    } catch (e) {
      return false;
    }
    if (!raw) return false;
    try {
      this.importJSON(raw);
      return true;
    } catch (e) {
      return false;
    }
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

/* Split imported book markdown into map-able {title, text} sections.
   Kahn (and similar ATX books) use # / ## for chapters and #### — with a
   handful of ### — for the sections people actually assign to topic portals.
   Splitting only on #{1,2} collapsed the real book into a few giant blobs.
   Section titles are prefixed with the parent chapter when one exists.
   Heading-less text still falls back to a single "Full document" chapter. */
PGRE.splitChapters = function (text) {
  var lines = String(text || '').split('\n');
  var chapters = [];
  var cur = null;
  var parentTitle = '';

  function cleanHeading(s) {
    s = String(s || '').trim();
    if (s.indexOf('**') === 0 && s.slice(-2) === '**' && s.length > 4) {
      s = s.slice(2, -2).trim();
    }
    return s;
  }

  lines.forEach(function (line, i) {
    var m = line.match(/^(#{1,4})\s+(.+)/);
    if (!m) return;
    if (cur) cur.endLine = i;
    var level = m[1].length;
    var raw = cleanHeading(m[2]);
    if (level <= 2) parentTitle = raw;
    var title = (level >= 3 && parentTitle) ? (parentTitle + ' · ' + raw) : raw;
    if (!title) title = 'Untitled';
    cur = { title: title, startLine: i, endLine: lines.length };
    chapters.push(cur);
  });
  if (chapters.length === 0) {
    chapters.push({ title: 'Full document', startLine: 0, endLine: lines.length });
  }
  chapters.forEach(function (ch) {
    ch.text = lines.slice(ch.startLine, ch.endLine).join('\n');
  });
  return chapters.map(function (ch) { return { title: ch.title, text: ch.text }; });
};
