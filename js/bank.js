/* Question bank — the single source of truth for question pools. Sources:
   - PGRE.QUESTIONS       (js/data-questions.js)          preview set, src 'preview'
   - PGRE.BOOK_QUESTIONS  (content/bank/cpg-questions.js) chapter problems, src 'cpg'
   - PGRE.ETS_DRILLS      (content/bank/ets-exams.js)     GR8677/GR9277 drills, src 'ets-drill'
   - PGRE.BOOK_EXAMS      (content/bank/cpg-exams.js)     sample exams, src 'cpg-exam'
   - PGRE.ETS_EXAMS       (content/bank/ets-exams.js)     released ETS exams, src 'ets-exam'
   The content/bank files are gitignored placeholders until the book extraction
   pipeline fills them, so every read below is guarded against absence.
   The helpers here supersede the preview-only fallbacks at the bottom of
   js/data-questions.js — this file loads after it, so these win. */
window.PGRE = window.PGRE || {};

/* Merged question pool, deduped by id (first occurrence wins). The default is
   the practice pool: preview questions + book chapter problems + the ETS
   drill sets (GR8677/GR9277 — the user-approved exception to the spoiler
   rule; see AGENTS.md → Content Rules). Pass { includeExam: true } to also
   flatten in the INTACT exam questions (book sample exams + kept released
   ETS exams) — only the exam simulator's draw and by-id lookups may do that,
   so those exams stay unspoiled for verbatim simulation. Each question is
   tagged with its src at merge time, so data files stay untouched. */
var _allQuestionsCache = {};
var _topicQuestionsCache = {};
var _questionByIdIndex = null;

PGRE._resetBankCache = function () {
  _allQuestionsCache = {};
  _topicQuestionsCache = {};
  _questionByIdIndex = null;
};

PGRE.allQuestions = function (opts) {
  opts = opts || {};
  var key = !!opts.includeExam;
  if (key in _allQuestionsCache) return _allQuestionsCache[key];
  var seen = {}, out = [];
  function add(list, src) {
    (list || []).forEach(function (q) {
      if (!q || !q.id || seen[q.id]) return;
      seen[q.id] = true;
      // Tag a shallow copy rather than the bank's own object: the merge never
      // writes back into the static data arrays. A question that already
      // carries a src passes through by reference, untouched.
      if (q.src) { out.push(q); return; }
      var tagged = {};
      for (var k in q) tagged[k] = q[k];
      tagged.src = src;
      out.push(tagged);
    });
  }
  add(PGRE.QUESTIONS, 'preview');
  add(PGRE.BOOK_QUESTIONS, 'cpg');
  (PGRE.ETS_DRILLS || []).forEach(function (d) {
    add(d && d.questions, 'ets-drill');
  });
  if (opts.includeExam) {
    (PGRE.BOOK_EXAMS || []).forEach(function (ex) {
      add(ex && ex.questions, 'cpg-exam');
    });
    (PGRE.ETS_EXAMS || []).forEach(function (ex) {
      add(ex && ex.questions, 'ets-exam');
    });
  }
  _allQuestionsCache[key] = out;
  return out;
};

/* Topic slice of the default pool. Mastery denominators (gamify.mastery),
   the topic portals and practice sets all draw from here, so the book bank
   lights up everywhere the moment its files carry content. */
PGRE.questionsForTopic = function (topicId) {
  var key = (!topicId || topicId === 'all') ? 'all' : topicId;
  if (key in _topicQuestionsCache) return _topicQuestionsCache[key];
  var pool = PGRE.allQuestions();
  var out = (key === 'all') ? pool : pool.filter(function (q) { return q.topic === topicId; });
  _topicQuestionsCache[key] = out;
  return out;
};

/* Lookup by id across EVERYTHING, exam questions included — history, the
   mistake book and notes must resolve any id ever answered. The index is
   built once per page load (the banks are static script files). */
PGRE.questionById = function (id) {
  if (!_questionByIdIndex) {
    _questionByIdIndex = {};
    PGRE.allQuestions({ includeExam: true }).forEach(function (q) { _questionByIdIndex[q.id] = q; });
  }
  return _questionByIdIndex[id] || null;
};
