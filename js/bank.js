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
   tagged with its src at merge time, so data files stay untouched.
   The copy also runs PGRE.bankHTML, so a later innerHTML assignment cannot
   read a LaTeX '<' as a tag. */
var _allQuestionsCache = {};
var _topicQuestionsCache = {};
var _questionByIdIndex = null;

PGRE._resetBankCache = function () {
  _allQuestionsCache = {};
  _topicQuestionsCache = {};
  _questionByIdIndex = null;
};

/* Views assign q.q / q.sol / choices with innerHTML. In HTML, '<' followed by
   a letter opens a tag even when the name is not a real element: $r<R$ is a
   tag that runs until the next '>', the '>' in $r>R$. The parser deletes the
   enclosed-charge sentence and leaves a stray '$', so KaTeX then sets the
   following prose as one math span — italic, spaces dropped, commands raw.
   Keep a real tag (allowlisted name, then '>', '/', or whitespace, quotes
   honored). Escape every other '<'. $r<R$ and $a<r<b$ fail the test and stay
   text; <p>, <em>, <img ...> pass through. */
var BANK_TAGS = {
  a: 1, b: 1, blockquote: 1, br: 1, caption: 1, code: 1, col: 1, colgroup: 1,
  del: 1, details: 1, div: 1, em: 1, figcaption: 1, figure: 1,
  h1: 1, h2: 1, h3: 1, h4: 1, h5: 1, h6: 1, hr: 1, i: 1, img: 1, li: 1,
  mark: 1, ol: 1, p: 1, pre: 1, s: 1, small: 1, span: 1, strong: 1,
  sub: 1, summary: 1, sup: 1, table: 1, tbody: 1, td: 1, tfoot: 1, th: 1,
  thead: 1, tr: 1, u: 1, ul: 1, wbr: 1
};

function bankTagEnd(html, lt) {
  var n = html.length;
  var j = lt + 1;
  if (j < n && html.charAt(j) === '/') j++;
  if (j >= n || !/[A-Za-z]/.test(html.charAt(j))) return -1;
  var nameStart = j;
  j++;
  while (j < n && /[A-Za-z0-9]/.test(html.charAt(j))) j++;
  if (!BANK_TAGS[html.slice(nameStart, j).toLowerCase()]) return -1;
  if (j >= n) return -1;
  var ch = html.charAt(j);
  if (ch !== '>' && ch !== '/' && !/\s/.test(ch)) return -1;
  var quote = '';
  for (; j < n; j++) {
    ch = html.charAt(j);
    if (quote) {
      if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === '>') return j + 1;
  }
  return -1;
}

PGRE.bankHTML = function (html) {
  if (typeof html !== 'string' || html.indexOf('<') < 0) return html;
  var out = '';
  var i = 0;
  var n = html.length;
  while (i < n) {
    var lt = html.indexOf('<', i);
    if (lt < 0) { out += html.slice(i); break; }
    out += html.slice(i, lt);
    var end = bankTagEnd(html, lt);
    if (end < 0) { out += '&lt;'; i = lt + 1; continue; }
    out += html.slice(lt, end);
    i = end;
  }
  return out;
};

PGRE.graphChoiceHTML = function (html) {
  if (typeof html !== 'string' || /<(?:svg|img)\b/i.test(html)) return html;
  var heading = html.match(/^<em>Graph of (\$[^$]+\$) vs (\$[^$]+\$):<\/em>/);
  if (!heading || !/\$t_1\$/.test(html)) return html;
  var decay = /decays exponentially to zero/.test(html);
  var rapid = /rises rapidly to a positive plateau/.test(html);
  var gradual = /rises gradually to a positive plateau/.test(html);
  var oscillation = /rises with a damped oscillation to a positive plateau/.test(html);
  if (!decay && !rapid && !gradual && !oscillation) return html;
  var smallDip = /dips to a small negative value/.test(html);
  var largeDip = /drops sharply to a large negative value/.test(html);
  var gradualEnd = /decays gradually back toward zero/.test(html);
  var abruptEnd = /drops steeply back to zero/.test(html);
  var oscillatingEnd = /drops with a damped oscillation to a negative value/.test(html);
  if (!(decay && (smallDip || largeDip)) && !(rapid && gradualEnd) &&
      !(gradual && abruptEnd) && !(oscillation && oscillatingEnd)) return html;
  var zero = 70;
  var switchX = 175;
  var curve = [];
  function point(horizontal, voltage) {
    curve.push((curve.length ? 'L' : 'M') + horizontal.toFixed(2) + ' ' +
      (zero - voltage * 48).toFixed(2));
  }
  for (var before = 0; before <= 147; before++) {
    var elapsed = before / 147;
    var voltage;
    if (decay) voltage = (smallDip ? 1 : 0.75) * Math.exp(-9 * elapsed);
    else if (oscillation) voltage = 0.75 * (1 - Math.exp(-8 * elapsed) * Math.cos(24 * elapsed));
    else voltage = 0.75 * (1 - Math.exp(-(rapid ? 14 : 7) * elapsed));
    point(28 + before, voltage);
  }
  for (var after = 0; after <= 110; after++) {
    var time = after / 110;
    var tail;
    if (decay) tail = -(smallDip ? 0.35 : 1.35) * Math.exp(-7 * time);
    else if (oscillation) tail = -0.65 * Math.exp(-6 * time) * Math.cos(20 * time);
    else tail = abruptEnd ? 0 : 0.75 * Math.exp(-6 * time);
    point(switchX + after, tail);
  }
  return '<div class="choice-graph" style="position:relative;width:300px;max-width:100%;margin:8px 0">' +
    '<span style="position:absolute;left:0;top:0">' + heading[1] + '</span>' +
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 180" role="img" ' +
      'aria-label="Curve described in the text below" style="display:block;width:100%;height:auto">' +
      '<path d="M28 8V155 M20 70H292 M24 14L28 8L32 14 M286 66L292 70L286 74" ' +
        'fill="none" stroke="currentColor" stroke-width="1.2"/>' +
      '<path d="M175 16V155" stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="3 4"/>' +
      '<path class="choice-graph-curve" d="' + curve.join(' ') + '" fill="none" ' +
        'stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>' +
    '</svg><span style="position:absolute;left:57%;top:87%">$t_1$</span>' +
    '<span style="position:absolute;right:0;top:40%">' + heading[2] + '</span></div>' + html;
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
      // Shallow copy, never the bank's own object: static data stays raw.
      // String fields views inject are shielded here; see PGRE.bankHTML.
      var copy = {};
      for (var k in q) copy[k] = q[k];
      if (!copy.src) copy.src = src;
      if (typeof copy.q === 'string') copy.q = PGRE.bankHTML(copy.q);
      if (typeof copy.sol === 'string') copy.sol = PGRE.bankHTML(copy.sol);
      if (Array.isArray(q.choices)) {
        copy.choices = q.choices.map(function (c) {
          return typeof c === 'string' ? PGRE.graphChoiceHTML(PGRE.bankHTML(c)) : c;
        });
      }
      if (Array.isArray(q.choiceSols)) {
        copy.choiceSols = q.choiceSols.map(function (c) {
          return typeof c === 'string' ? PGRE.bankHTML(c) : c;
        });
      }
      out.push(copy);
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

/* Formula-card → practice-problem handoff.
   Similarity is deliberately deterministic and conservative:
   - only the default practice pool (never intact exam questions — the
     spoiler rule in AGENTS.md applies here too, and the src check below
     keeps it true even if a caller widened the pool),
   - same topic is required, except circuit cards allow the book's lb↔em split,
   - score specific token overlap, weighting card identity and question subtopics,
   - a positive score threshold is required; ties keep bank order.
   A formula with no qualifying candidate gets an honest disabled control rather
   than an unrelated question. */
PGRE._similarStop = {
  a: 1, an: 1, and: 1, are: 1, as: 1, at: 1, be: 1, by: 1, can: 1, do: 1,
  does: 1, for: 1, from: 1, given: 1, how: 1, if: 1, in: 1, into: 1, is: 1,
  it: 1, its: 1, of: 1, on: 1, or: 1, that: 1, the: 1, their: 1, then: 1,
  there: 1, these: 1, this: 1, to: 1, was: 1, what: 1, when: 1, which: 1,
  accurately: 1, expressed: 1, dependence: 1, angular: 1, frequency: 1,
  circuit: 1, connected: 1, series: 1, parallel: 1, voltage: 1, current: 1,
  supply: 1, element: 1, elements: 1, total: 1, closed: 1, loop: 1,
  flowing: 1, node: 1, rule: 1, around: 1, across: 1, power: 1, dissipated: 1,
  time: 1, constant: 1, magnitude: 1,
  one: 1, two: 1, three: 1, four: 1, five: 1, first: 1, second: 1
};

function _similarPlain(value) {
  return String(value == null ? '' : value)
    .replace(/\\(omega|Delta|theta|lambda|mu|epsilon|hbar)\b/gi, ' $1 ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .toLowerCase();
}

function _similarTokens(parts) {
  var out = Object.create(null);
  var aliases = {
    circuits: 'circuit', capacitors: 'capacitor', capacitance: 'capacitor',
    inductors: 'inductor', inductance: 'inductor', resistors: 'resistor',
    resistances: 'resistor', reactances: 'reactance', admittances: 'admittance',
    phasors: 'phasor'
  };
  var shortWords = { ac: 1, dc: 1, lc: 1, rc: 1, rl: 1, emf: 1 };
  (parts || []).forEach(function (part) {
    _similarPlain(part).split(/\s+/).forEach(function (word) {
      if (word.length < 3 && !shortWords[word]) return;
      word = aliases[word] || word;
      if (PGRE._similarStop[word]) return;
      out[word] = 1;
    });
  });
  return out;
}

PGRE.similarQuestionForCard = function (card) {
  if (!card || typeof PGRE.allQuestions !== 'function') return null;
  var identity = _similarTokens([card.name, card.tag]);
  var body = _similarTokens([
    card.front, card.back, card.note,
    Array.isArray(card.aliases) ? card.aliases.join(' ') : card.aliases
  ]);
  var circuit = { circuit: 1, impedance: 1, capacitor: 1, capacitance: 1,
    inductor: 1, inductance: 1, resistor: 1, resistance: 1, phasor: 1,
    reactance: 1, admittance: 1 };
  var best = null, bestScore = 2;
  PGRE.allQuestions().forEach(function (q) {
    if (!q || q.src === 'ets-exam' || q.src === 'cpg-exam') return;
    var topicOK = q.topic === card.topic;
    if (!topicOK && (
      (card.topic === 'lb' && q.topic === 'em') ||
      (card.topic === 'em' && q.topic === 'lb')
    )) {
      topicOK = Object.keys(circuit).some(function (word) { return identity[word] || body[word]; });
    }
    if (!topicOK) return;
    var sub = _similarTokens([q.subtopic]);
    var stem = _similarTokens([q.q]);
    var score = 0, hits = 0, specificHit = false;
    Object.keys(identity).forEach(function (word) {
      if (sub[word]) { score += 5; hits++; specificHit = specificHit || !!circuit[word]; }
      else if (stem[word]) { score += 4; hits++; specificHit = specificHit || !!circuit[word]; }
    });
    Object.keys(body).forEach(function (word) {
      if (identity[word]) return;
      if (sub[word]) { score += 3; hits++; specificHit = specificHit || !!circuit[word]; }
      else if (stem[word]) { score += 2; hits++; specificHit = specificHit || !!circuit[word]; }
    });
    if (!hits || score <= bestScore || (hits < 2 && score < 5 && !specificHit)) return;
    best = q;
    bestScore = score;
  });
  return best;
};

/* The control every flashcard surface renders. When nothing qualifies the
   control degrades to an inert label — never an unrelated question. */
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
    return '<span class="' + cls + '" aria-disabled="true" role="status" ' +
      'title="No similar practice problem meets the matching threshold">No similar problem</span>';
  }
  return '<button type="button" class="' + cls + '" data-similar-problem="' +
    esc(card.id) + '" aria-label="Practice the most similar problem">Find similar problem</button>';
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
  if (typeof PGRE.getFormulaCard === 'function') return PGRE.getFormulaCard(id);
  var deck = (PGRE.deck && PGRE.deck.length) ? PGRE.deck :
    ((PGRE.BOOK_FORMULAS && PGRE.BOOK_FORMULAS.length) ? PGRE.BOOK_FORMULAS :
      (PGRE.FORMULAS || []));
  for (var i = 0; i < deck.length; i++) if (deck[i] && deck[i].id === id) return deck[i];
  return null;
};

/* UI-facing entry point: resolve the match, hand it to the injectable
   launcher in packs.js, and toast honestly when either step fails. */
PGRE.openSimilarProblem = function (card) {
  var q = PGRE.similarQuestionForCard(card);
  if (!q) {
    if (PGRE.toast) PGRE.toast('No similar practice problem meets the matching threshold.', 'info');
    return false;
  }
  var cfg = PGRE.launchSimilarProblem(card);
  if (!cfg) {
    if (PGRE.toast) PGRE.toast('This browser could not prepare the practice problem.', 'warning');
    return false;
  }
  return true;
};
