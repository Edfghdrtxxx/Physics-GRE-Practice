/* Mock-exam engine — the model behind the timed simulator (UI lives in
   js/view-exam.js). Owns: question-draw (weighted current format / verbatim
   legacy replay), the in-progress exam record, scoring, the raw→scaled
   estimate, and submission (which commits answers to the attempt log + mistake
   book and awards the completion XP). Loaded synchronously by index.html (the
   <script> tag right before view-exam.js); the dynamic-injector fallback in
   view-exam.js is dormant under that load order. */
window.PGRE = window.PGRE || {};

PGRE.examEngine = (function () {

  /* ——— Formats ——— */
  var FORMAT_META = {
    '70x120':  { questions: 70,  minutes: 120, label: '70 questions · 120 min' },
    '100x170': { questions: 100, minutes: 170, label: '100 questions · 170 min' }
  };

  /* Official GRE Physics content weights (ETS test-content outline), keyed on
     this app's topic ids. Order is the draw/report order. Sums to 100. */
  var WEIGHTS = [
    { topic: 'cm', weight: 20 }, { topic: 'em', weight: 18 }, { topic: 'qm', weight: 13 },
    { topic: 'th', weight: 10 }, { topic: 'at', weight: 10 }, { topic: 'sp', weight: 9 },
    { topic: 'ow', weight: 8 },  { topic: 'sr', weight: 6 },  { topic: 'lb', weight: 6 }
  ];

  /* ——— Raw → scaled score estimate ———
     GRE Physics scaled scores run 200–990 in 10-point steps. ETS does not
     publish a single official conversion; each released practice book
     (GR8677, GR9277, GR9677, GR0177, GR1777) prints its own raw→scaled table
     and they differ test to test. The anchors below are a hand-averaged
     "lookalike" of those published tables, expressed against FRACTION CORRECT
     so it works for both the 70- and 100-question formats. It is an ESTIMATE
     ONLY — treat it as a ballpark, not an ETS-equated score. Linear
     interpolation between anchors, rounded to the nearest 10, clamped 200–990. */
  var SCALE_ANCHORS = [
    [1.00, 990], [0.85, 940], [0.70, 870], [0.55, 790], [0.45, 730],
    [0.35, 660], [0.25, 590], [0.15, 510], [0.08, 450], [0.00, 380]
  ];

  function scaledEstimate(raw, total) {
    if (!total) return null;
    var f = raw / total, a = SCALE_ANCHORS, scaled;
    if (f >= a[0][0]) scaled = a[0][1];
    else if (f <= a[a.length - 1][0]) scaled = a[a.length - 1][1];
    else {
      for (var i = 0; i < a.length - 1; i++) {
        var hi = a[i], lo = a[i + 1];
        if (f <= hi[0] && f >= lo[0]) {
          var t = (f - lo[0]) / (hi[0] - lo[0]);
          scaled = lo[1] + t * (hi[1] - lo[1]);
          break;
        }
      }
    }
    scaled = Math.round(scaled / 10) * 10;
    return Math.max(200, Math.min(990, scaled));
  }

  /* ——— Seeded RNG (mulberry32) — reproducible draws per seed ——— */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function newSeed() {
    return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
  }

  /* Largest-remainder apportionment of `total` questions across the weights,
     so the per-topic counts always sum to exactly `total`. */
  function allocate(total) {
    var rows = WEIGHTS.map(function (w) {
      var exact = total * w.weight / 100;
      return { topic: w.topic, n: Math.floor(exact), frac: exact - Math.floor(exact) };
    });
    var used = rows.reduce(function (s, r) { return s + r.n; }, 0);
    var left = total - used;
    var byFrac = rows.slice().sort(function (a, b) { return b.frac - a.frac; });
    for (var i = 0; i < left; i++) byFrac[i % byFrac.length].n += 1;
    var map = {};
    rows.forEach(function (r) { map[r.topic] = r.n; });
    return map;
  }

  /* ——— Draw: current format (weighted, prefer-unseen) ——— */
  function buildWeighted(seed) {
    var pool = PGRE.allQuestions({ includeExam: true });
    var need = FORMAT_META['70x120'].questions;
    if (pool.length < need) return null;

    var rand = rng(seed);
    var seen = PGRE.store.state.questions; // qid -> record; presence == attempted
    var byTopic = {};
    pool.forEach(function (q) { (byTopic[q.topic] = byTopic[q.topic] || []).push(q); });

    function shuffleSeed(arr) {
      var b = arr.slice();
      for (var i = b.length - 1; i > 0; i--) {
        var j = Math.floor(rand() * (i + 1));
        var tmp = b[i]; b[i] = b[j]; b[j] = tmp;
      }
      return b;
    }
    // unseen questions first, each group shuffled by the seed
    function unseenFirst(arr) {
      var unseen = [], done = [];
      arr.forEach(function (q) { (seen[q.id] ? done : unseen).push(q); });
      return shuffleSeed(unseen).concat(shuffleSeed(done));
    }

    var alloc = allocate(need);
    var chosen = [], taken = {};
    WEIGHTS.forEach(function (w) {
      var want = alloc[w.topic] || 0;
      unseenFirst(byTopic[w.topic] || []).slice(0, want).forEach(function (q) {
        chosen.push(q); taken[q.id] = true;
      });
    });
    // topics short on questions leave a gap — fill it from the rest of the bank
    if (chosen.length < need) {
      var rest = pool.filter(function (q) { return !taken[q.id]; });
      unseenFirst(rest).slice(0, need - chosen.length).forEach(function (q) {
        chosen.push(q); taken[q.id] = true;
      });
    }
    // interleave topics like a real sitting
    var order = shuffleSeed(chosen).slice(0, need).map(function (q) { return q.id; });
    return { order: order, format: '70x120', source: 'weighted', title: null };
  }

  /* ——— Draw: legacy format (verbatim sample-exam replay) ——— */
  function legacyExam(source) {
    var idx = { x1: 0, x2: 1, x3: 2 }[source];
    if (idx == null) return null;
    var ex = (PGRE.BOOK_EXAMS || [])[idx];
    if (!ex || !ex.questions || !ex.questions.length) return null;
    return {
      order: ex.questions.map(function (q) { return q.id; }),
      format: ex.format || '100x170',
      source: source,
      title: ex.title || ('Sample Exam ' + (idx + 1))
    };
  }

  /* Is there enough content to start this format/source right now? */
  function canStart(format, source) {
    if (format === '100x170') {
      var built = legacyExam(source);
      return built ? { ok: true } : { ok: false, need: 0, have: 0, legacy: true };
    }
    var have = PGRE.allQuestions({ includeExam: true }).length;
    var need = FORMAT_META['70x120'].questions;
    return have >= need ? { ok: true } : { ok: false, need: need, have: have, legacy: false };
  }

  /* ——— The in-progress record lives in state.exams (submittedAt == null).
     Only one may be active; creating a new one drops any prior unfinished one. */
  function active() {
    var arr = PGRE.store.state.exams;
    for (var i = arr.length - 1; i >= 0; i--) if (!arr[i].submittedAt) return arr[i];
    return null;
  }

  function byId(id) {
    var arr = PGRE.store.state.exams;
    for (var i = arr.length - 1; i >= 0; i--) if (arr[i].id === id) return arr[i];
    return null;
  }

  function history() {
    return PGRE.store.state.exams.filter(function (x) { return x.submittedAt; })
      .slice().sort(function (a, b) { return a.submittedAt < b.submittedAt ? 1 : -1; });
  }

  function create(config) {
    var seed = newSeed();
    var built = config.format === '100x170' ? legacyExam(config.source) : buildWeighted(seed);
    if (!built) return null;
    var s = PGRE.store.state;
    // drop any earlier unfinished exam — only one active sitting at a time
    s.exams = s.exams.filter(function (x) { return x.submittedAt; });
    var meta = FORMAT_META[built.format];
    var exam = {
      id: 'ex-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e6).toString(36),
      startedAt: new Date().toISOString(),
      submittedAt: null,
      format: built.format,
      source: built.source,
      title: built.title,
      seed: seed,
      order: built.order,
      answers: {},        // qid -> choice index
      flags: [],          // [qid]
      cursor: 0,          // resume position
      paused: false,
      durationSec: 0,     // elapsed seconds (advances only while running)
      limitSec: meta.minutes * 60,
      raw: null, total: built.order.length, scaledEst: null, perTopic: null
    };
    s.exams.push(exam);
    PGRE.store.save();
    return exam;
  }

  function discard(exam) {
    var s = PGRE.store.state;
    s.exams = s.exams.filter(function (x) { return x !== exam; });
    PGRE.store.save();
  }

  /* Score, commit every question to the log + mistake book (no per-answer XP),
     award the flat completion bonus, and finalize the record. */
  function submit(exam) {
    if (!exam || exam.submittedAt) return exam;
    var perTopic = {}, raw = 0, missing = 0, answered = 0;
    exam.order.forEach(function (qid) {
      var q = PGRE.questionById(qid);
      if (!q) { missing += 1; return; }
      var picked = exam.answers[qid] != null ? exam.answers[qid] : null;
      if (picked != null) answered += 1;
      var correct = picked === q.answer;
      if (correct) raw += 1;
      var pt = perTopic[q.topic] || { right: 0, total: 0 };
      pt.total += 1; if (correct) pt.right += 1;
      perTopic[q.topic] = pt;
      // durable attempt row + mistake-book upkeep, WITHOUT recordAnswer's XP
      PGRE.gamify.recordExamAnswer(q, correct, null, { picked: picked, sid: exam.id });
    });
    exam.raw = raw;
    exam.total = exam.order.length;
    // qids the bank no longer resolves — still in total (scored as wrong), but
    // surfaced on the results hero. Absent on older records; read it as 0.
    exam.missing = missing;
    exam.perTopic = perTopic;
    exam.scaledEst = scaledEstimate(raw, exam.total);
    exam.paused = false;
    exam.submittedAt = new Date().toISOString();

    PGRE.store.touchDay(); // sitting a full exam counts as a study day
    // crit-mass ("Answer 30 questions in a single day"): exam answers bypass
    // td.answered (recordExamAnswer keeps the day counters practice-only), so we
    // bank this sitting's answered count into td.examAnswered and set marathonDay
    // from practice + exam combined. This covers both the full-sitting case and a
    // day split across a sub-30 exam plus sub-30 practice (35 total still unlocks).
    PGRE.store.rollDay(); // ensure td is today's before crediting the counter
    var td = PGRE.store.state.today;
    td.examAnswered = (td.examAnswered || 0) + answered;
    if (td.answered + td.examAnswered >= 30) PGRE.store.state.flags.marathonDay = true;
    PGRE.gamify.addXP(150 + raw, '· mock exam complete'); // +150 completion, +1 / correct
    PGRE.store.log('exam', 'Mock exam: ' + raw + ' / ' + exam.total + ' (' +
      FORMAT_META[exam.format].label + ')', 150 + raw);
    PGRE.gamify.checkAchievements();
    PGRE.store.save();
    return exam;
  }

  return {
    FORMAT_META: FORMAT_META,
    WEIGHTS: WEIGHTS,
    SCALE_ANCHORS: SCALE_ANCHORS,
    scaledEstimate: scaledEstimate,
    canStart: canStart,
    create: create,
    active: active,
    byId: byId,
    history: history,
    submit: submit,
    discard: discard
  };
})();

/* Flush any callbacks queued by view-exam.js while this engine was loading. */
(function () {
  var q = PGRE._examReadyQ || [];
  PGRE._examReadyQ = [];
  q.forEach(function (cb) { try { cb(); } catch (e) { console.error(e); } });
})();
