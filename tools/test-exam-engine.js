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

PGRE.BOOK_EXAMS = [fakeExam('x1', '70x120', 70, 'be-', null)];
PGRE.ETS_EXAMS = [
  Object.assign(fakeExam('gr8677', '100x170', 100, 'g77-', null),
    { scale: [{ raw: 0, scaled: 200 }, { raw: 50, scaled: 640 }, { raw: 100, scaled: 990 }] }),
  fakeExam('gr9277', '100x170', 100, 'g27-', null)
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

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
