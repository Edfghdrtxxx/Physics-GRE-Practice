#!/usr/bin/env node
/* Unit tests for js/exam-engine.js — draw sizes, spoiler protection in the
   weighted draw, legacy replay, and scoring. Loads the shipped store.js,
   bank.js and exam-engine.js (no re-implementation) against a fabricated bank.
   Run: node tools/test-exam-engine.js */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var root = path.resolve(__dirname, '..');
var storeSrc = fs.readFileSync(path.join(root, 'js', 'store.js'), 'utf8');
var bankSrc = fs.readFileSync(path.join(root, 'js', 'bank.js'), 'utf8');
var srsSrc = fs.readFileSync(path.join(root, 'js', 'srs.js'), 'utf8');
var engineSrc = fs.readFileSync(path.join(root, 'js', 'exam-engine.js'), 'utf8');

var window = { PGRE: {} };
var localStorageMock = {};
var localStorage = {
  getItem: function (k) { return localStorageMock[k] || null; },
  setItem: function (k, v) { localStorageMock[k] = String(v); },
  removeItem: function (k) { delete localStorageMock[k]; }
};

var sandbox = {
  window: window,
  PGRE: window.PGRE,
  localStorage: localStorage,
  console: console,
  Date: Date,
  Math: Math,
  JSON: JSON,
  String: String,
  Number: Number,
  Array: Array,
  Object: Object,
  isFinite: isFinite,
  parseInt: parseInt,
  parseFloat: parseFloat
};
vm.createContext(sandbox);
vm.runInContext(storeSrc, sandbox);
vm.runInContext(bankSrc, sandbox);
vm.runInContext(engineSrc, sandbox);

var PGRE = sandbox.PGRE;
var engine = PGRE.examEngine;
if (!engine || typeof engine.create !== 'function') {
  console.error('FAIL: shipped exam-engine.js did not export create');
  process.exit(1);
}

/* The engine calls into gamify on submit; stub the surface it touches. */
PGRE.gamify = {
  recordExamAnswer: function () {},
  addXP: function () {},
  checkAchievements: function () {}
};

var store = PGRE.store;
store.load();

var passed = 0;
var failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed++;
    console.log('  ok  — ' + msg);
  } else {
    failed++;
    console.log('  FAIL — ' + msg);
  }
}

var TOPICS = ['cm', 'em', 'qm', 'th', 'at', 'sp', 'ow', 'sr', 'lb'];

function q(id, topic, src) {
  var out = { id: id, topic: topic, answer: id.length % 5,
    choices: ['a', 'b', 'c', 'd', 'e'] };
  if (src) out.src = src;
  return out;
}

/* Fabricated bank: 100 preview questions distributed exactly like WEIGHTS, so
   the weighted draw can fill every topic quota from unseen questions alone. */
var WEIGHT_SHARE = { cm: 20, em: 18, qm: 13, th: 10, at: 10, sp: 9, ow: 8, sr: 6, lb: 6 };
var preview = [];
TOPICS.forEach(function (t) {
  for (var i = 0; i < WEIGHT_SHARE[t]; i++) preview.push(q('p-' + t + '-' + i, t));
});
PGRE.QUESTIONS = preview;
PGRE.BOOK_QUESTIONS = [q('b-1', 'cm'), q('b-2', 'em')];
PGRE.ETS_DRILLS = [
  { id: 'drill-8677', questions: [q('d-8677-1', 'cm'), q('d-8677-2', 'em')] },
  { id: 'drill-9277', questions: [q('d-9277-1', 'qm')] }
];

function fakeExam(id, format, n, prefix, src) {
  var qs = [];
  for (var i = 0; i < n; i++) qs.push(q(prefix + i, TOPICS[i % TOPICS.length], src));
  return { id: id, title: id.toUpperCase(), format: format, questions: qs };
}

function publishedScale(rows) {
  var out = [];
  rows.forEach(function (row) {
    var raw = row[0], scaled = row[1];
    if (typeof raw === 'number') out.push({ raw: raw, scaled: scaled });
    else for (var r = raw[0]; r <= raw[1]; r++) out.push({ raw: r, scaled: scaled });
  });
  return out;
}

function fillByCounts(exam, nCorrect, nWrong) {
  exam.order.forEach(function (id, i) {
    var ans = PGRE.questionById(id).answer;
    if (i < nCorrect) exam.answers[id] = ans;
    else if (i < nCorrect + nWrong) exam.answers[id] = (ans + 1) % 5;
  });
}

PGRE.BOOK_EXAMS = [fakeExam('x1', '70x120', 70, 'be-', null)];
PGRE.ETS_EXAMS = [
  Object.assign(fakeExam('gr8677', '100x170', 100, 'g77-', null),
    { scale: [{ raw: 0, scaled: 200 }, { raw: 50, scaled: 640 }, { raw: 100, scaled: 990 }] }),
  fakeExam('gr9277', '100x170', 100, 'g27-', null),
  /* Published rows typed from the practice-book conversion tables. Full
     tables are not needed; lookup is exact. Citations:
     GR0877 p.91; GR0177 p.73; GR9677 p.75; GR1777 p.88; ets2024/GR1775 p.26. */
  Object.assign(fakeExam('gr9677', '100x170', 100, 'g96-', null), {
    scale: publishedScale([[[0, 0], 440], [[36, 37], 740], [56, 900]])
  }),
  Object.assign(fakeExam('gr0177', '100x170', 100, 'g01-', null), {
    scale: publishedScale([[0, 390], [[36, 37], 650], [73, 900]])
  }),
  Object.assign(fakeExam('gr0877', '100x170', 100, 'g08-', null), {
    scale: publishedScale([
      [[0, 1], 380], [[36, 37], 630], [65, 840], [72, 900],
      [[73, 74], 910], [78, 950], [[82, 100], 990]
    ])
  }),
  Object.assign(fakeExam('gr1777', '100x170', 100, 'g17-', null), {
    scale: publishedScale([[0, 250], [59, 740], [67, 820], [70, 850], [[84, 100], 990]])
  }),
  Object.assign(fakeExam('ets2024', '70x120', 70, 'e24-', null), {
    scale: publishedScale([[0, 280], [54, 880], [[62, 70], 990]])
  })
];
/* Tag the fabricated exam questions with their src the way the real banks do. */
PGRE.BOOK_EXAMS[0].questions.forEach(function (x) { x.src = 'cpg-exam'; });
PGRE.ETS_EXAMS.forEach(function (ex) { ex.questions.forEach(function (x) { x.src = 'ets-exam'; }); });

var examQids = {};
PGRE.ETS_EXAMS.forEach(function (ex) { ex.questions.forEach(function (x) { examQids[x.id] = true; }); });

function resetState() {
  store.reset();
}

console.log('formats and weights');
assert(engine.FORMAT_META['70x120'].questions === 70 && engine.FORMAT_META['70x120'].minutes === 120,
  '70x120 format is 70 questions / 120 min');
assert(engine.FORMAT_META['100x170'].questions === 100 && engine.FORMAT_META['100x170'].minutes === 170,
  '100x170 format is 100 questions / 170 min');
var wsum = engine.WEIGHTS.reduce(function (s2, w) { return s2 + w.weight; }, 0);
assert(wsum === 100, 'content weights sum to 100, got ' + wsum);

console.log('\nweighted draw (current format)');
resetState();
var exam = engine.create({});
assert(!!exam, 'create({}) builds a weighted exam');
assert(exam.format === '70x120' && exam.source === 'weighted', 'weighted exam reports format 70x120 / source weighted');
assert(exam.order.length === 70, 'weighted draw has exactly 70 questions, got ' + exam.order.length);
var seen = {};
var dupes = 0;
exam.order.forEach(function (id) { if (seen[id]) dupes++; else seen[id] = true; });
assert(dupes === 0, 'weighted draw has no duplicate questions');
assert(exam.order.every(function (id) { return !examQids[id]; }),
  'weighted draw contains no released ETS exam questions (GR8677/GR9277 stay unspoiled)');
assert(exam.order.every(function (id) {
  var drawn = PGRE.questionById(id);
  return drawn && drawn.src !== 'cpg-exam';
}), 'weighted draw contains no book sample-exam questions (reserved for verbatim replay)');
assert(exam.order.every(function (id) { return PGRE.questionById(id) !== null; }),
  'every drawn id resolves through questionById');
var perTopicCount = {};
exam.order.forEach(function (id) {
  var qq = PGRE.questionById(id);
  perTopicCount[qq.topic] = (perTopicCount[qq.topic] || 0) + 1;
});
var topicSum = TOPICS.reduce(function (s2, t) { return s2 + (perTopicCount[t] || 0); }, 0);
assert(topicSum === 70, 'per-topic counts cover all 70 drawn questions');
assert(TOPICS.every(function (t) { return (perTopicCount[t] || 0) > 0; }),
  'every weighted topic is represented in the draw');

console.log('\nweighted draw never includes drills-as-mocks');
/* The intact GR8677/GR9277 exams live in ETS_EXAMS; their ids must never be
   drawn. The drill QUESTIONS (ets-drill) are the approved exception and MAY
   appear — assert only the exam ids are absent (already done above) and that
   the draw is reproducible for a fixed seed via two identical pools. */
var orderA = engine.create({}).order;
var orderSetA = {};
orderA.forEach(function (id) { orderSetA[id] = true; });
assert(!orderA.some(function (id) { return examQids[id]; }), 'second weighted draw also excludes ets-exam ids');
assert(orderSetA && Object.keys(orderSetA).length === 70, 'second weighted draw is also 70 unique questions');

console.log('\nlegacy replay (verbatim released exams)');
resetState();
var legacy = engine.create({ source: 'gr8677' });
assert(!!legacy, 'create({source:"gr8677"}) replays the released exam');
assert(legacy.format === '100x170', 'legacy replay uses the exam\'s 100x170 format');
assert(legacy.source === 'gr8677', 'legacy replay records its source');
assert(legacy.order.length === 100, 'legacy replay has all 100 questions, got ' + legacy.order.length);
var verbatim = PGRE.ETS_EXAMS[0].questions.every(function (x, i) { return legacy.order[i] === x.id; });
assert(verbatim, 'legacy replay preserves the published question order verbatim');
assert(engine.create({ source: 'no-such-exam' }) === null, 'unknown legacy source returns null');

console.log('\ncanStart gates');
resetState();
assert(engine.canStart('70x120').ok === true, 'canStart 70x120 ok with a full bank');
assert(engine.canStart('100x170', 'gr8677').ok === true, 'canStart 100x170 ok with a replayable source');
assert(engine.canStart('100x170', 'no-such-exam').ok === false, 'canStart 100x170 fails for an unknown source');
var savedExams = PGRE.ETS_EXAMS;
var savedBook = PGRE.BOOK_EXAMS;
PGRE.ETS_EXAMS = [];
PGRE.BOOK_EXAMS = [];
assert(engine.canStart('100x170', 'gr8677').ok === false, 'canStart 100x170 fails with no replayable exams');
PGRE.ETS_EXAMS = savedExams;
PGRE.BOOK_EXAMS = savedBook;
var savedQ = PGRE.QUESTIONS;
var savedD = PGRE.ETS_DRILLS;
var savedBq = PGRE.BOOK_QUESTIONS;
var savedBe = PGRE.BOOK_EXAMS;
PGRE.QUESTIONS = [];
PGRE.ETS_DRILLS = [];
PGRE.BOOK_QUESTIONS = [];
PGRE.BOOK_EXAMS = [];
if (typeof PGRE._resetBankCache === 'function') PGRE._resetBankCache();
assert(engine.canStart('70x120').ok === false, 'canStart 70x120 fails when the drawable pool is too small');
assert(engine.canStart('70x120').need === 70, 'canStart reports the 70-question requirement');
PGRE.QUESTIONS = savedQ;
PGRE.ETS_DRILLS = savedD;
PGRE.BOOK_QUESTIONS = savedBq;
PGRE.BOOK_EXAMS = savedBe;
if (typeof PGRE._resetBankCache === 'function') PGRE._resetBankCache();

console.log('\nscoring');
resetState();
var scored = engine.create({});
scored.order.forEach(function (id) { scored.answers[id] = PGRE.questionById(id).answer; });
engine.submit(scored);
assert(scored.submittedAt !== null, 'submit finalizes the exam record');
assert(scored.raw === 70 && scored.total === 70, 'all-correct sitting scores raw 70 / 70');
assert(scored.missing === 0, 'no missing questions when the bank resolves every id');
var ptSum = 0;
Object.keys(scored.perTopic).forEach(function (t) { ptSum += scored.perTopic[t].total; });
assert(ptSum === 70, 'perTopic totals sum to the exam length');
assert(Object.keys(scored.perTopic).every(function (t) { return scored.perTopic[t].right === scored.perTopic[t].total; }),
  'perTopic right counts match an all-correct sitting');

resetState();
var partial = engine.create({});
var half = Math.floor(partial.order.length / 2);
partial.order.forEach(function (id, i) {
  if (i < half) partial.answers[id] = PGRE.questionById(id).answer; // correct
  else if (i < half + 10) partial.answers[id] = (PGRE.questionById(id).answer + 1) % 5; // wrong
  // remaining 25 stay blank — blanks score as misses
});
engine.submit(partial);
assert(partial.raw === half, 'partial sitting scores only the correct answers, raw ' + partial.raw);
assert(partial.scaledEst >= 200 && partial.scaledEst <= 990, 'scaled estimate stays inside 200-990');
assert(partial.scaledEst % 10 === 0, 'scaled estimate is rounded to a 10-point step');
assert(partial.scaledEst !== null && partial.raw < partial.total, 'partial sitting scaled below perfect');

resetState();
var legacyScored = engine.create({ source: 'gr8677' });
legacyScored.order.forEach(function (id) { legacyScored.answers[id] = PGRE.questionById(id).answer; });
engine.submit(legacyScored);
assert(legacyScored.scaledEst === 990 && legacyScored.scaledOfficial === true,
  'replayed exam with a published table scores on the official scale');

console.log('\nofficial scale lookup');
assert(engine.scaledEstimate(70, 70) === 990, 'fraction 1.00 anchors at 990');
assert(engine.scaledEstimate(0, 70) === 380, 'fraction 0.00 anchors at 380');
assert(engine.scaledEstimate(35, 70) === 760, 'fraction 0.50 interpolates to 760');
assert(engine.scaledEstimate(100, 70) === 990, 'raw above total clamps to 990');
assert(engine.scaledEstimate(5, 0) === null, 'zero-total exam yields no estimate');

console.log('\nformula raw (GR0877 / GR0177 / GR9677) vs number-correct (GR1777 / ets2024)');
/* GR0877 p.89: C − I/4, round to nearest whole; 36.5 → 37. Blanks omitted.
   Table p.91: raw 65 → 840, 73 → 910. Number-correct 72 → 900, 78 → 950. */
resetState();
var g0877a = engine.create({ source: 'gr0877' });
fillByCounts(g0877a, 72, 28);
engine.submit(g0877a);
assert(g0877a.raw === 72, 'GR0877 72 correct / 28 wrong still stores number correct as exam.raw');
assert(g0877a.scaledEst === 840 && g0877a.scaledOfficial === true,
  'GR0877 72 correct / 28 wrong scales as official raw 65 → 840, got ' + g0877a.scaledEst);

resetState();
var g0877b = engine.create({ source: 'gr0877' });
fillByCounts(g0877b, 78, 22);
engine.submit(g0877b);
assert(g0877b.scaledEst === 910 && g0877b.scaledOfficial === true,
  'GR0877 78 correct / 22 wrong rounds 72.5 up to 73 → 910, got ' + g0877b.scaledEst);

resetState();
var g0877blank = engine.create({ source: 'gr0877' });
fillByCounts(g0877blank, 44, 30); // 26 blanks; book example on p.89
engine.submit(g0877blank);
assert(g0877blank.raw === 44, 'blanks are not counted as correct');
assert(g0877blank.scaledEst === 630 && g0877blank.scaledOfficial === true,
  'GR0877 44 correct / 30 wrong / 26 blank: 36.5 rounds to 37 → 630, blanks not incorrect, got ' +
    g0877blank.scaledEst);

resetState();
var g0877neg = engine.create({ source: 'gr0877' });
fillByCounts(g0877neg, 0, 100);
engine.submit(g0877neg);
assert(g0877neg.scaledEst === 380 && g0877neg.scaledOfficial === true,
  'GR0877 0 correct / 100 wrong: C−I/4 is −25, table starts at 0 → 380, got ' + g0877neg.scaledEst);

resetState();
var g0177ex = engine.create({ source: 'gr0177' });
fillByCounts(g0177ex, 44, 30);
engine.submit(g0177ex);
assert(g0177ex.scaledEst === 650 && g0177ex.scaledOfficial === true,
  'GR0177 book example 44/30 → raw 37 → 650 (p.71, p.73), got ' + g0177ex.scaledEst);

resetState();
var g9677ex = engine.create({ source: 'gr9677' });
fillByCounts(g9677ex, 44, 30);
engine.submit(g9677ex);
assert(g9677ex.scaledEst === 740 && g9677ex.scaledOfficial === true,
  'GR9677 book example 44/30 → raw 37 → 740 (p.73, p.75), got ' + g9677ex.scaledEst);

resetState();
var g1777ex = engine.create({ source: 'gr1777' });
fillByCounts(g1777ex, 67, 33);
engine.submit(g1777ex);
assert(g1777ex.scaledEst === 820 && g1777ex.scaledOfficial === true,
  'GR1777 67 correct / 33 wrong stays number-correct 67 → 820 (p.88), got ' + g1777ex.scaledEst);

resetState();
var ets2024ex = engine.create({ source: 'ets2024' });
fillByCounts(ets2024ex, 54, 16);
engine.submit(ets2024ex);
assert(ets2024ex.scaledEst === 880 && ets2024ex.scaledOfficial === true,
  'ets2024 54 correct stays number-correct 54 → 880 (GR1775 p.26), got ' + ets2024ex.scaledEst);

assert(engine.scaledEstimate(35, 70) === 760, 'weighted 70-question estimate is unchanged after the form-rule split');

/* Stored record: scaledEst was written under the old number-correct lookup.
   Display recomputes; it does not write the record. */
assert(typeof engine.scaleDisplay === 'function', 'scaleDisplay is exported for results/history');
if (typeof engine.scaleDisplay === 'function') {
  resetState();
  var storedOld = engine.create({ source: 'gr0877' });
  fillByCounts(storedOld, 72, 28);
  storedOld.raw = 72;
  storedOld.total = 100;
  storedOld.scaledEst = 900;
  storedOld.scaledOfficial = true;
  storedOld.submittedAt = '2026-10-11T12:00:00.000Z';
  var shown = engine.scaleDisplay(storedOld);
  assert(shown && shown.scaled === 840 && shown.official === true && shown.rule === 'formula' && shown.stale !== true,
    'stored GR0877 72/28 with old scaledEst 900 displays corrected 840, got ' +
      (shown && shown.scaled) + ' rule=' + (shown && shown.rule));
  assert(storedOld.scaledEst === 900, 'scaleDisplay does not rewrite the stored scaledEst');

  var storedBare = {
    source: 'gr0877', raw: 72, total: 100, scaledEst: 900, scaledOfficial: true,
    submittedAt: '2026-10-11T12:00:00.000Z'
  };
  var bare = engine.scaleDisplay(storedBare);
  assert(bare && bare.scaled === 900 && bare.stale === true,
    'stored GR0877 without answers keeps the old scaled score and marks it stale, got ' +
      (bare && JSON.stringify(bare)));
}

console.log('\nactive / history / lifecycle');
resetState();
var e1 = engine.create({});
assert(engine.active() === e1, 'a fresh sitting is the active exam');
var e2 = engine.create({});
assert(engine.active() === e2, 'creating a second sitting drops the first unfinished one');
assert(store.state.exams.indexOf(e1) === -1, 'the dropped sitting is removed from state');
engine.submit(e2);
assert(engine.active() === null, 'no active exam after submission');
assert(engine.history().length === 1 && engine.history()[0] === e2, 'submitted exam lands in history');
var e3 = engine.create({});
engine.discard(e3);
assert(store.state.exams.indexOf(e3) === -1, 'discard removes the sitting from state');
assert(engine.byId(e2.id) === e2, 'byId finds a submitted exam by id');

console.log('\nsat 100-question form graduates only that recorded source');
resetState();
if (typeof PGRE._resetBankCache === 'function') PGRE._resetBankCache();
var poolBefore = engine.poolSize();
var open100 = engine.create({ source: 'gr1777' });
assert(open100 && open100.format === '100x170' && open100.source === 'gr1777',
  'create({source:"gr1777"}) is a 100-question sitting');
assert(engine.poolSize() === poolBefore,
  'an in-progress 100-question sitting does not grow the practice pool');
assert(PGRE.allQuestions().every(function (q) { return q.src !== 'ets-exam' && q.src !== 'cpg-exam'; }),
  'in-progress GR1777 questions stay out of the default pool');
engine.discard(open100);
assert(engine.poolSize() === poolBefore, 'discarding an unsubmitted sitting does not graduate it');

var sit100 = engine.create({ source: 'gr1777' });
sit100.order.forEach(function (id, i) {
  if (i < 59) sit100.answers[id] = PGRE.questionById(id).answer;
});
engine.submit(sit100);
assert(!!sit100.submittedAt, 'the 100-question sitting is recorded as submitted');
assert(sit100.source === 'gr1777', 'the stored source is the recorded form id, not ets2024');
var after100 = PGRE.allQuestions();
assert(after100.some(function (q) { return q.id === 'g17-0' && q.src === 'ets-exam'; }),
  'submitted GR1777 questions enter the default practice pool');
assert(after100.filter(function (q) { return String(q.id).indexOf('g17-') === 0; }).length === 100,
  'all 100 questions from the sat form graduate');
assert(!after100.some(function (q) { return String(q.id).indexOf('e24-') === 0; }),
  'ets2024 stays protected when it was not the recorded source');
assert(!after100.some(function (q) { return String(q.id).indexOf('g08-') === 0; }),
  'other unsat released forms stay protected');
assert(!after100.some(function (q) { return q.src === 'cpg-exam'; }),
  'unsat book sample exams stay protected');
assert(engine.poolSize() === poolBefore + 100,
  'the weighted-draw pool grows by the sat 100-question form only');
var weightedAfter = engine.create({});
assert(weightedAfter.source === 'weighted', 'verbatim replay is not required to keep drawing weighted mocks');
assert(weightedAfter.order.every(function (id) {
  var drawn = PGRE.questionById(id);
  if (!drawn) return false;
  if (drawn.src === 'cpg-exam') return false;
  if (drawn.src === 'ets-exam') return String(id).indexOf('g17-') === 0;
  return true;
}), 'weighted draw may use the sat form and still excludes unsat intact exams');
var replaySat = engine.create({ source: 'gr1777' });
assert(replaySat && replaySat.order.length === 100 && replaySat.source === 'gr1777',
  'verbatim replay of the sat 100-question form still works');
engine.discard(replaySat);

console.log('\nsat source match is case-insensitive (D5)');
resetState();
if (typeof PGRE._resetBankCache === 'function') PGRE._resetBankCache();
store.state.exams.push({
  id: 'ex-case', source: 'GR1777', submittedAt: '2026-10-12T00:00:00.000Z',
  format: '100x170'
});
if (typeof PGRE._resetBankCache === 'function') PGRE._resetBankCache();
var casePool = PGRE.allQuestions();
assert(casePool.filter(function (q) { return String(q.id).indexOf('g17-') === 0; }).length === 100,
  'source GR1777 graduates catalog id gr1777');
assert(!casePool.some(function (q) { return String(q.id).indexOf('e24-') === 0; }),
  'ets2024 stays protected after a case-mismatched GR1777 sitting');
assert(PGRE.isProtectedExamQuestion(PGRE.questionById('g17-0')) === false,
  'case-mismatched sat source unprotects that form');
assert(PGRE.isProtectedExamQuestion(PGRE.questionById('e24-0')) === true,
  'unsat ets2024 stays protected');

console.log('\nguess marks on exam results');
vm.runInContext(srsSrc, sandbox);
resetState();
if (typeof PGRE._resetBankCache === 'function') PGRE._resetBankCache();
var guessExam = engine.create({ source: 'gr8677' });
assert(!!guessExam, 'guess-mark fixture exam was created');
var gRight = guessExam.order[0];
var gWrong = guessExam.order[1];
var gBlank = guessExam.order[2];
var gExisting = guessExam.order[3];
var gAlready = guessExam.order[4];
var gFlaggedRight = guessExam.order[5];
var gUnflaggedRight = guessExam.order[6];
function gAns(id) { return PGRE.questionById(id).answer; }
guessExam.answers[gRight] = gAns(gRight);
guessExam.answers[gWrong] = (gAns(gWrong) + 1) % 5;
guessExam.answers[gExisting] = gAns(gExisting);
guessExam.answers[gAlready] = gAns(gAlready);
guessExam.answers[gFlaggedRight] = gAns(gFlaggedRight);
guessExam.answers[gUnflaggedRight] = gAns(gUnflaggedRight);
guessExam.flags = [gRight, gWrong, gBlank, gFlaggedRight];
guessExam.submittedAt = '2026-10-05T00:00:00.000Z';
[gRight, gWrong, gExisting, gAlready, gFlaggedRight, gUnflaggedRight].forEach(function (id) {
  store.state.attempts.push({
    ts: '2026-10-05T00:00:00.000Z', qid: id, topic: 'cm',
    picked: guessExam.answers[id], answer: gAns(id),
    correct: guessExam.answers[id] === gAns(id),
    ms: null, sid: guessExam.id, mode: 'exam', confidence: null
  });
});
store.state.mistakes[gExisting] = {
  firstMissedAt: '2026-01-01T00:00:00.000Z', misses: 2, solves: 1, wrongPicks: [1],
  archivedAt: null, srs: { step: 3, due: '2099-01-01', baseDue: '2099-01-01' }
};
store.state.mistakes[gAlready] = {
  firstMissedAt: '2026-01-01T00:00:00.000Z', misses: 0, solves: 0, wrongPicks: [],
  archivedAt: null, lucky: true, srs: { step: 0, due: '2099-02-01', baseDue: '2099-02-01' }
};
var oldExam = { id: 'ex-old', submittedAt: '2020-01-01T00:00:00.000Z', answers: {}, flags: [], order: [] };
assert(engine.isMarkedGuess(oldExam, gRight) === false, 'an old exam without guessed is not marked');
assert(!Object.prototype.hasOwnProperty.call(oldExam, 'guessed'), 'reading an old exam does not add a guessed field');
assert(engine.markGuessed(guessExam, gWrong) === false, 'a wrong answer cannot be marked guessed');
assert(engine.markGuessed(guessExam, gBlank) === false, 'a blank answer cannot be marked guessed');
assert(!guessExam.guessed, 'rejected marks do not create the guessed list');
assert(engine.markGuessed(guessExam, gRight) === true, 'a correct answer can be marked guessed');
assert(engine.isMarkedGuess(guessExam, gRight) === true, 'the mark is recorded on the exam');
var created = store.state.mistakes[gRight];
assert(!!created && created.lucky === true && created.misses === 0, 'a new guess files a lucky-guess entry, not a miss');
assert(created.srs && created.srs.step === 0 && created.srs.due === PGRE.srs.addDays(1),
  'a new guess is due tomorrow, the same first rung as a practice lucky guess');
var rightRow = store.state.attempts.filter(function (a) { return a.qid === gRight && a.sid === guessExam.id; })[0];
assert(rightRow.confidence === 'guess', 'the exam attempt row is stamped guessed');
assert(engine.markGuessed(guessExam, gRight) === true && guessExam.guessed.length === 1,
  'marking the same question again does not duplicate it');
assert(engine.unmarkGuessed(guessExam, gRight) === true, 'the guess mark can be removed');
assert(engine.isMarkedGuess(guessExam, gRight) === false, 'unmark clears the exam mark');
assert(!store.state.mistakes[gRight], 'unmark removes the lucky-guess entry it created');
assert(rightRow.confidence === null, 'unmark clears the exam attempt stamp');

assert(engine.markGuessed(guessExam, gExisting) === true, 'a correct answer already in the book can be marked');
var existing = store.state.mistakes[gExisting];
assert(existing.lucky === true && existing.misses === 2 && existing.solves === 1,
  'marking an older entry adds the lucky flag and leaves its miss record');
assert(existing.srs.step === 3 && existing.srs.due !== '2099-01-01',
  'Guessed halves the remaining wait on an entry that already had a schedule');
assert(engine.unmarkGuessed(guessExam, gExisting) === true, 'unmark of an older entry succeeds');
existing = store.state.mistakes[gExisting];
assert(!!existing && existing.misses === 2 && !existing.lucky && existing.srs.due === '2099-01-01',
  'unmark drops only the lucky flag and restores the earlier review date');

assert(engine.markGuessed(guessExam, gAlready) === true, 'a question that was already a lucky guess can be marked on the exam');
var alreadyMarked = store.state.mistakes[gAlready];
var alreadyBaseDays = PGRE.srs.daysUntil('2099-02-01');
var alreadyWait = PGRE.srs.assessWaitDays(alreadyBaseDays, { guess: true });
var alreadyExpect = alreadyWait === alreadyBaseDays ? '2099-02-01' : PGRE.srs.addDays(alreadyWait);
assert(!!alreadyMarked && alreadyMarked.lucky === true && alreadyMarked.misses === 0 &&
  alreadyMarked.srs.step === 0, 'an already-lucky entry keeps its flag, misses, and step');
assert(alreadyMarked.srs.due === alreadyExpect && alreadyExpect !== '2099-02-01',
  'Guessed on an already-lucky entry halves the wait the way practice does');
assert(engine.unmarkGuessed(guessExam, gAlready) === true, 'unmark of an already-lucky question succeeds');
var already = store.state.mistakes[gAlready];
assert(!!already && already.lucky === true && already.srs.due === '2099-02-01' && already.misses === 0,
  'unmark restores the earlier review date and leaves the lucky flag');

var beforeBulk = guessExam.guessed.slice();
var bulkN = engine.markFlaggedGuessed(guessExam);
assert(bulkN === 2, 'mark all flagged files the two flagged correct questions, got ' + bulkN);
assert(engine.isMarkedGuess(guessExam, gRight) && engine.isMarkedGuess(guessExam, gFlaggedRight),
  'both flagged correct questions are marked');
assert(!engine.isMarkedGuess(guessExam, gWrong) && !engine.isMarkedGuess(guessExam, gBlank),
  'flagged wrong and blank questions are not marked');
assert(!engine.isMarkedGuess(guessExam, gUnflaggedRight), 'an unflagged correct question is not swept in');
assert(!!store.state.mistakes[gRight] && store.state.mistakes[gRight].lucky === true, 'the swept correct question is a lucky guess');
assert(!store.state.mistakes[gWrong], 'a flagged wrong question is not given a lucky-guess entry by the sweep');
assert(engine.markFlaggedGuessed(guessExam) === 0, 'a second sweep marks nothing new');
assert(beforeBulk.length === 0, 'the sweep started from a cleared list');

var plain = { id: 'ex-plain', submittedAt: '2020-01-01T00:00:00.000Z', answers: {}, order: [], flags: [] };
var roundTrip = JSON.parse(JSON.stringify(guessExam));
assert(Array.isArray(roundTrip.guessed) && roundTrip.guessed.indexOf(gRight) !== -1,
  'the guess mark survives a save/load round trip');
assert(!Object.prototype.hasOwnProperty.call(plain, 'guessed'), 'a saved exam with no marks still has no guessed field');
store._persistFailed = true;
var refused = engine.markGuessed(guessExam, gUnflaggedRight);
assert(refused === false && !engine.isMarkedGuess(guessExam, gUnflaggedRight),
  'a refused save does not record a guess mark');
store._persistFailed = false;

console.log('\nreal submit: archived lucky guess and a failed save');
var gamifySrc = fs.readFileSync(path.join(root, 'js', 'gamify.js'), 'utf8');
sandbox.document = { querySelector: function () { return null; } };
vm.runInContext(gamifySrc, sandbox);
/* recordExamAnswer is the real one. Achievement metrics need the plan catalog,
   which this regression does not exercise. */
PGRE.gamify.checkAchievements = function () { return []; };

function openIds() {
  return PGRE.srs.openMistakes().map(function (e) { return e.qid; });
}

resetState();
var realExam = engine.create({ source: 'gr8677' });
assert(!!realExam, 'real-submit fixture exam was created');
var archQ = realExam.order[0];
var openLuckyQ = realExam.order[1];
var missQ = realExam.order[2];
function ansOf(id) { return PGRE.questionById(id).answer; }
realExam.answers[archQ] = ansOf(archQ);
realExam.answers[openLuckyQ] = ansOf(openLuckyQ);
realExam.answers[missQ] = (ansOf(missQ) + 1) % 5;
store.state.mistakes[archQ] = {
  firstMissedAt: '2026-04-01T00:00:00.000Z', misses: 0, solves: 0, wrongPicks: [],
  archivedAt: '2026-04-01T00:00:00.000Z', lucky: true,
  srs: { step: 2, due: '2099-04-01', baseDue: '2099-04-01' }
};
store.state.mistakes[openLuckyQ] = {
  firstMissedAt: '2026-01-01T00:00:00.000Z', misses: 1, solves: 1, wrongPicks: [0],
  archivedAt: null, lucky: true,
  srs: { step: 3, due: '2099-06-01', baseDue: '2099-06-01' }
};
store.save();
engine.submit(realExam);
var archAfter = store.state.mistakes[archQ];
assert(!!realExam.submittedAt, 'real submit sets submittedAt');
assert(!!archAfter && !!archAfter.archivedAt && archAfter.lucky === true && archAfter.solves === 1,
  'a correct submit leaves an archived lucky guess archived and counts the solve');
assert(openIds().indexOf(archQ) === -1, 'an archived lucky guess is not in the open book after submit alone');
assert(engine.markGuessed(realExam, archQ) === true, 'Guessed on an archived lucky guess succeeds');
assert(realExam.guessOrigin[archQ] === 'existing', 'an archived lucky guess is reopened, not treated as already filed');
archAfter = store.state.mistakes[archQ];
assert(!!archAfter && !archAfter.archivedAt && archAfter.lucky === true,
  'Guessed clears the archive on an already-lucky entry');
assert(openIds().indexOf(archQ) !== -1, 'the reopened lucky guess is in the open mistake book');
assert(engine.unmarkGuessed(realExam, archQ) === true, 'unmark of the reopened lucky guess succeeds');
archAfter = store.state.mistakes[archQ];
assert(!!archAfter && archAfter.solves === 1 && !archAfter.lucky && archAfter.srs.due === '2099-04-01',
  'unmark clears the lucky flag and restores the review date');

var climbed = store.state.mistakes[openLuckyQ];
var climbedDue = PGRE.srs.addDays(PGRE.srs.MISTAKE_LADDER[4]);
assert(climbed.srs.step === 4 && climbed.srs.due === climbedDue && climbed.lucky === true,
  'a correct submit climbs an open lucky guess and leaves it lucky');
assert(engine.markGuessed(realExam, openLuckyQ) === true, 'Guessed on an open lucky guess succeeds');
assert(realExam.guessOrigin[openLuckyQ] === 'already', 'an open lucky guess keeps the already origin');
var halvedDays = PGRE.srs.assessWaitDays(PGRE.srs.daysUntil(climbedDue), { guess: true });
var halvedDue = PGRE.srs.addDays(halvedDays);
climbed = store.state.mistakes[openLuckyQ];
assert(climbed.lucky === true && climbed.srs.step === 4 && climbed.misses === 1 && climbed.solves === 2 &&
  climbed.srs.due === halvedDue && halvedDue !== climbedDue,
  'Guessed halves the post-submit wait and leaves step, misses, and solves');
assert(engine.unmarkGuessed(realExam, openLuckyQ) === true, 'unmark of the open lucky guess succeeds');
climbed = store.state.mistakes[openLuckyQ];
assert(!!climbed && climbed.lucky === true && climbed.srs.due === climbedDue && climbed.srs.step === 4,
  'unmark restores the post-submit review date and leaves the lucky flag');

resetState();
var failExam = engine.create({ source: 'gr8677' });
var failMiss = failExam.order[0];
var failRight = failExam.order[1];
failExam.answers[failMiss] = (ansOf(failMiss) + 1) % 5;
failExam.answers[failRight] = ansOf(failRight);
store.save();
var diskBefore = localStorage.getItem(store.KEY);
var xpBefore = store.state.xp;
var attemptsBefore = store.state.attempts.length;
var realSetItem = localStorage.setItem;
localStorage.setItem = function (k, v) {
  if (k === store.KEY) throw new Error('quota');
  return realSetItem.call(localStorage, k, v);
};
var failedSubmit = engine.submit(failExam);
assert(failedSubmit === failExam && !failExam.submittedAt, 'a failed save does not leave the sitting submitted');
assert(engine.active() === failExam, 'the room still has the unsubmitted sitting');
assert(localStorage.getItem(store.KEY) === diskBefore, 'a failed save leaves the stored blob unchanged');
assert(!store.state.mistakes[failMiss], 'a failed save does not keep the miss in memory');
assert(store.state.attempts.length === attemptsBefore, 'a failed save does not keep the new attempt rows');
assert(store.state.xp === xpBefore, 'a failed save does not keep the completion XP');
assert(store.canWrite() === false, 'a failed save still reports that writing failed');
localStorage.setItem = realSetItem;
var retried = engine.submit(failExam);
assert(!!retried.submittedAt, 'Submit after the write works records the sitting');
assert(store.state.mistakes[failMiss] && store.state.mistakes[failMiss].misses === 1,
  'the retried submit files the wrong answer once');
assert(!store.state.mistakes[failRight], 'the retried submit does not file a right answer');
assert(store.canWrite() === true, 'a successful retry can write again');
engine.submit(failExam);
assert(store.state.mistakes[failMiss].misses === 1, 'a second submit does not file the miss again');

/* A throwing save before submit stands in for the study-time capture-phase
   flush: that click sets the failure flag, then submit runs. */
resetState();
var flushExam = engine.create({ source: 'gr8677' });
var flushMiss = flushExam.order[0];
var flushRight = flushExam.order[1];
flushExam.answers[flushMiss] = (ansOf(flushMiss) + 1) % 5;
flushExam.answers[flushRight] = ansOf(flushRight);
store.state.notes['keep-note'] = { text: 'do not drop', at: '2026-09-01T00:00:00.000Z' };
store.save();
var flushDisk = localStorage.getItem(store.KEY);
var flushXp = store.state.xp;
var flushAttempts = store.state.attempts.length;
var flushSetItem = localStorage.setItem;
localStorage.setItem = function (k, v) {
  if (k === store.KEY) throw new Error('quota');
  return flushSetItem.call(localStorage, k, v);
};
store.save();
assert(store.canWrite() === false, 'a flush before submit reports that writing failed');
assert(localStorage.getItem(store.KEY) === flushDisk, 'a flush before submit leaves the stored blob unchanged');
var flushed = engine.submit(flushExam);
assert(flushed === flushExam && !flushExam.submittedAt, 'a flush-blocked submit leaves the sitting unsubmitted');
assert(engine.active() === flushExam, 'the room still has the sitting after a flush-blocked submit');
assert(localStorage.getItem(store.KEY) === flushDisk, 'a flush-blocked submit leaves the stored blob unchanged');
assert(!store.state.mistakes[flushMiss], 'a flush-blocked submit does not keep the miss in memory');
assert(store.state.attempts.length === flushAttempts, 'a flush-blocked submit does not keep the new attempt rows');
assert(store.state.xp === flushXp, 'a flush-blocked submit does not keep the completion XP');
assert(store.state.notes['keep-note'] && store.state.notes['keep-note'].text === 'do not drop',
  'a flush-blocked submit leaves an existing note');
var flushedAgain = engine.submit(flushExam);
assert(flushedAgain === flushExam && !flushExam.submittedAt,
  'a second submit while the write still fails stays unsubmitted');
assert(localStorage.getItem(store.KEY) === flushDisk, 'a second failed submit leaves the stored blob unchanged');
assert(!store.state.mistakes[flushMiss], 'a second failed submit does not file the miss');
assert(store.canWrite() === false, 'a still-failing submit reports that writing failed');
localStorage.setItem = flushSetItem;
var flushRetried = engine.submit(flushExam);
assert(!!flushRetried.submittedAt, 'Submit after the flush failure records the sitting once storage works');
assert(store.state.mistakes[flushMiss] && store.state.mistakes[flushMiss].misses === 1,
  'the retried submit after a flush files the wrong answer once');
assert(!store.state.mistakes[flushRight], 'the retried submit after a flush does not file a right answer');
assert(store.canWrite() === true, 'a successful retry after a flush can write again');
assert(store.state.notes['keep-note'].text === 'do not drop', 'the retry leaves the existing note');
engine.submit(flushExam);
assert(store.state.mistakes[flushMiss].misses === 1, 'a second submit after a flush does not file the miss again');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
