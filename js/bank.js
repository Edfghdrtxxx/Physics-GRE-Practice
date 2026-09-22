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

/* ——— Formula-card → practice-problem handoff ———
   Every flashcard surface offers "Find similar problem". Similarity is
   deliberately deterministic and conservative:
   - only the default practice pool (never intact exam questions — the
     spoiler rule in AGENTS.md applies here too),
   - the question must share the card's topic,
   - rank by distinct meaningful-token overlap between the card's
     name/tag/front/back/note/aliases and the question's
     subtopic/stem/choices,
   - two shared tokens is the minimum; ties keep bank order.
   A card with no qualifying candidate gets an honest disabled control
   rather than an unrelated question. */
PGRE._similarStop = {
  a: 1, an: 1, and: 1, are: 1, as: 1, at: 1, be: 1, by: 1, can: 1, do: 1,
  does: 1, for: 1, from: 1, given: 1, how: 1, if: 1, in: 1, into: 1, is: 1,
  it: 1, its: 1, of: 1, on: 1, or: 1, that: 1, the: 1, their: 1, then: 1,
  there: 1, these: 1, this: 1, to: 1, was: 1, what: 1, when: 1, which: 1,
  with: 1, you: 1
};

function _similarPlain(value) {
  return String(value == null ? '' : value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .toLowerCase();
}

function _similarTokens(parts) {
  var out = Object.create(null);
  (parts || []).forEach(function (part) {
    _similarPlain(part).split(/\s+/).forEach(function (word) {
      if (word.length < 3 || PGRE._similarStop[word]) return;
      out[word] = 1;
    });
  });
  return out;
}

PGRE.similarQuestionForCard = function (card) {
  if (!card || typeof PGRE.allQuestions !== 'function') return null;
  var cardTokens = _similarTokens([
    card.name, card.tag, card.front, card.back, card.note,
    Array.isArray(card.aliases) ? card.aliases.join(' ') : card.aliases
  ]);
  var best = null, bestOverlap = 1;
  PGRE.allQuestions().forEach(function (q) {
    if (!q || q.topic !== card.topic) return;
    var qTokens = _similarTokens([q.subtopic, q.q, (q.choices || []).join(' ')]);
    var overlap = 0;
    Object.keys(cardTokens).forEach(function (word) {
      if (qTokens[word]) overlap++;
    });
    if (overlap < 2 || overlap <= bestOverlap) return;
    best = q;
    bestOverlap = overlap;
  });
  return best;
};

PGRE.similarProblemButtonHTML = function (card, extraClass) {
  var ui = PGRE.ui || {};
  var esc = ui.esc || function (s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  };
  var q = PGRE.similarQuestionForCard(card);
  var cls = 'btn btn-ghost similar-problem-btn' + (extraClass ? ' ' + extraClass : '');
  if (!q) {
    return '<button type="button" class="' + cls + '" disabled aria-disabled="true" ' +
      'title="No similar practice problem meets the matching threshold">No similar problem</button>';
  }
  return '<button type="button" class="' + cls + '" data-similar-problem="' +
    esc(card.id) + '" aria-label="Practice the most similar problem">Find similar problem</button>';
};

/* Inline variant for surfaces where a real <button> cannot nest (Match tiles
   are already <button> elements). Same contract: disabled-looking, honest
   "No similar problem" when nothing qualifies. */
PGRE.similarProblemInlineHTML = function (card) {
  var q = PGRE.similarQuestionForCard(card);
  var label = q ? 'Find similar problem' : 'No similar problem';
  var disabled = q ? '' : ' aria-disabled="true"';
  return '<span class="similar-problem-inline' + (q ? '' : ' is-disabled') +
    '" role="button" tabindex="' + (q ? '0' : '-1') + '"' +
    (q ? ' data-similar-problem="' + String(card.id).replace(/"/g, '&quot;') + '"' : '') +
    disabled + '>' + label + '</span>';
};

/* Delegated wiring: any [data-similar-problem] inside root opens the card's
   most similar problem. Clicks are stopped so the control never flips the
   card or picks a Match tile underneath it. */
PGRE.wireSimilarProblemButtons = function (root) {
  if (!root || !root.querySelectorAll) return;
  root.querySelectorAll('[data-similar-problem]').forEach(function (button) {
    button.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var id = button.getAttribute('data-similar-problem');
      var card = PGRE._similarCardLookup && PGRE._similarCardLookup(id);
      if (card) PGRE.openSimilarProblem(card);
    });
    button.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      e.stopPropagation();
      button.click();
    });
  });
};

PGRE._similarCardLookup = function (id) {
  var deck = PGRE.deck || PGRE.FORMULAS || [];
  for (var i = 0; i < deck.length; i++) if (deck[i] && deck[i].id === id) return deck[i];
  return null;
};

/* Handoff: a one-question custom quiz through the same
   sessionStorage['pgre-quiz-config'] → #/practice/custom path the builder,
   notes and packs already use. */
PGRE.openSimilarProblem = function (card) {
  var q = PGRE.similarQuestionForCard(card);
  if (!q) {
    if (PGRE.toast) PGRE.toast('No similar practice problem meets the matching threshold.', 'info');
    return false;
  }
  try {
    sessionStorage.setItem('pgre-quiz-config', JSON.stringify({
      ids: [q.id],
      label: 'Similar problem · ' + (card.name || card.tag || card.id)
    }));
  } catch (e) {
    if (PGRE.toast) PGRE.toast('This browser could not prepare the practice problem.', 'warning');
    return false;
  }
  var hash = '#/practice/custom';
  if (location.hash === hash && typeof PGRE.route === 'function') PGRE.route();
  else location.hash = hash;
  return true;
};
