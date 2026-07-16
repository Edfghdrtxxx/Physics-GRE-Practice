/* Question bank — the single source of truth for question pools. Sources:
   - PGRE.QUESTIONS       (js/data-questions.js)          preview set, src 'preview'
   - PGRE.BOOK_QUESTIONS  (content/bank/cpg-questions.js) chapter problems, src 'cpg'
   - PGRE.BOOK_EXAMS      (content/bank/cpg-exams.js)     sample exams, src 'cpg-exam'
   The content/bank files are gitignored placeholders until the book extraction
   pipeline fills them, so every read below is guarded against absence.
   The helpers here supersede the preview-only fallbacks at the bottom of
   js/data-questions.js — this file loads after it, so these win. */
window.PGRE = window.PGRE || {};

/* Merged question pool, deduped by id (first occurrence wins). The default is
   the practice pool: preview questions + book chapter problems. Pass
   { includeExam: true } to also flatten in the sample-exam questions (the
   exam simulator draws from the full bank). Each question is tagged with its
   src at merge time, so data files stay untouched. */
PGRE.allQuestions = function (opts) {
  opts = opts || {};
  var seen = {}, out = [];
  function add(list, src) {
    (list || []).forEach(function (q) {
      if (!q || !q.id || seen[q.id]) return;
      seen[q.id] = true;
      if (!q.src) q.src = src;
      out.push(q);
    });
  }
  add(PGRE.QUESTIONS, 'preview');
  add(PGRE.BOOK_QUESTIONS, 'cpg');
  if (opts.includeExam) {
    (PGRE.BOOK_EXAMS || []).forEach(function (ex) {
      add(ex && ex.questions, 'cpg-exam');
    });
  }
  return out;
};

/* Topic slice of the default pool. Mastery denominators (gamify.mastery),
   the topic portals and practice sets all draw from here, so the book bank
   lights up everywhere the moment its files carry content. */
PGRE.questionsForTopic = function (topicId) {
  var pool = PGRE.allQuestions();
  if (!topicId || topicId === 'all') return pool;
  return pool.filter(function (q) { return q.topic === topicId; });
};

/* Lookup by id across EVERYTHING, exam questions included — history, the
   mistake book and notes must resolve any id ever answered. The index is
   built once per page load (the banks are static script files). */
PGRE.questionById = (function () {
  var index = null;
  return function (id) {
    if (!index) {
      index = {};
      PGRE.allQuestions({ includeExam: true }).forEach(function (q) { index[q.id] = q; });
    }
    return index[id] || null;
  };
})();
