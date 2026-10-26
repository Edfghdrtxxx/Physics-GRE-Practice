#!/usr/bin/env node
/* Unit tests for cross-form duplicate questions (PGRE.DUPLICATE_OF,
   js/data-duplicates.js; helpers in js/bank.js). A duplicate id names the
   same question as its canonical id in another form, so practice must show
   it once, under the canonical id:
   - the shipped map is well formed (unique canonicals, no chains, ids only);
     when the gitignored ETS bank is present, every pair resolves and the
     answers match (tools/build-ets-exams.js runs the full text check);
   - a duplicate never enters the default pool; a sat duplicate form
     graduates its canonical even while the canonical's own form is unsat;
   - the duplicate still resolves by id and its intact form still replays
     verbatim in the simulator;
   - an exam answer and a lucky-guess mark on a duplicate id file under the
     canonical mistake-book entry, while the attempt row keeps the exam's id;
   - "seen" and first-time-correct count an answer under either id;
   - the status summary names the canonical in `dupOf`.
   Loads the shipped store.js, bank.js, srs.js, gamify.js, exam-engine.js and
   status.js against a fabricated bank (no exam content).
   Run: node tools/test-duplicates.js */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var root = path.resolve(__dirname, '..');
function src(name) { return fs.readFileSync(path.join(root, 'js', name), 'utf8'); }

var passed = 0;
var failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log('  ok  — ' + msg); }
  else { failed++; console.log('  FAIL — ' + msg); }
}

console.log('the shipped duplicate map');
var shipped = (function () {
  var box = { window: { PGRE: {} } };
  box.PGRE = box.window.PGRE;
  vm.runInNewContext(src('data-duplicates.js'), box);
  return box.PGRE.DUPLICATE_OF || {};
})();
var dupIds = Object.keys(shipped);
var canonIds = dupIds.map(function (d) { return shipped[d]; });
assert(dupIds.length === 70, 'the map lists the 70 ets2024 reprints of GR1777 (' + dupIds.length + ')');
assert(dupIds.every(function (d) { return /^ets24-\d+$/.test(d); }) &&
  canonIds.every(function (c) { return /^gr1777-\d+$/.test(c); }),
  'every duplicate is an ets24 id and every canonical a gr1777 id');
assert(new Set(canonIds).size === canonIds.length, 'no canonical id is claimed by two duplicates');
assert(canonIds.every(function (c) { return !(c in shipped); }), 'no chains: a canonical is never itself a duplicate');

var etsPath = path.join(root, 'content', 'bank', 'ets-exams.js');
if (fs.existsSync(etsPath)) {
  var etsBox = { window: { PGRE: {} } };
  etsBox.PGRE = etsBox.window.PGRE;
  vm.runInNewContext(fs.readFileSync(etsPath, 'utf8'), etsBox);
  var byId = {};
  (etsBox.PGRE.ETS_EXAMS || []).forEach(function (ex) {
    ex.questions.forEach(function (q) { byId[q.id] = q; });
  });
  var unresolved = dupIds.filter(function (d) { return !byId[d] || !byId[shipped[d]]; });
  assert(!unresolved.length, 'every pair resolves in the local ETS bank' +
    (unresolved.length ? ' (missing: ' + unresolved.join(', ') + ')' : ''));
  var answerMismatch = dupIds.filter(function (d) {
    return byId[d] && byId[shipped[d]] && byId[d].answer !== byId[shipped[d]].answer;
  });
  assert(!answerMismatch.length, 'every pair has the same answer' +
    (answerMismatch.length ? ' (differ: ' + answerMismatch.join(', ') + ')' : ''));
} else {
  console.log('  skip — content/bank/ets-exams.js absent (gitignored); pair checks run in tools/build-ets-exams.js');
}

/* Behaviour against a fabricated bank. */
var window = { PGRE: {}, addEventListener: function () {} };
var localStorageMock = {};
var sandbox = {
  window: window,
  PGRE: window.PGRE,
  localStorage: {
    getItem: function (k) { return localStorageMock[k] || null; },
    setItem: function (k, v) { localStorageMock[k] = String(v); },
    removeItem: function (k) { delete localStorageMock[k]; }
  },
  document: { querySelector: function () { return null; } },
  console: console, Date: Date, Math: Math, JSON: JSON, String: String,
  Number: Number, Array: Array, Object: Object, Promise: Promise,
  setTimeout: function () { return 1; }, clearTimeout: function () {},
  setInterval: function () { return 1; },
  isFinite: isFinite, parseInt: parseInt, parseFloat: parseFloat
};
vm.createContext(sandbox);
['store.js', 'bank.js', 'srs.js', 'gamify.js', 'exam-engine.js', 'status.js'].forEach(function (f) {
  vm.runInContext(src(f), sandbox, { filename: f });
});
var PGRE = sandbox.PGRE;
var store = PGRE.store;
var engine = PGRE.examEngine;
store.load();
PGRE.gamify.checkAchievements = function () { return []; };

function q(id, answer) {
  return { id: id, topic: 'cm', answer: answer, q: 'stem ' + id, choices: ['a', 'b', 'c', 'd', 'e'] };
}
PGRE.QUESTIONS = [q('p-1', 0)];
PGRE.BOOK_QUESTIONS = [];
PGRE.ETS_DRILLS = [];
PGRE.BOOK_EXAMS = [];
// form-old holds the originals; form-new reprints two of them and adds one
PGRE.ETS_EXAMS = [
  { id: 'form-new', title: 'New form', format: '70x120',
    questions: [q('new-1', 1), q('new-2', 2), q('new-3', 3)] },
  { id: 'form-old', title: 'Old form', format: '70x120',
    questions: [q('old-1', 1), q('old-2', 2), q('old-3', 4)] }
];
PGRE.DUPLICATE_OF = { 'new-1': 'old-1', 'new-2': 'old-2', 'new-9': 'old-3' };
PGRE._resetBankCache();

function poolIds() {
  return PGRE.allQuestions().map(function (x) { return x.id; }).sort().join(',');
}
function sit(source) {
  store.state.exams.push({ id: 'ex-' + source, source: source, submittedAt: new Date().toISOString() });
}

console.log('\nids and helpers');
assert(PGRE.canonicalQid('new-1') === 'old-1', 'a duplicate maps to its canonical');
assert(PGRE.canonicalQid('old-1') === 'old-1' && PGRE.canonicalQid('new-3') === 'new-3',
  'a canonical and an unpaired question map to themselves');
assert(PGRE.canonicalQid('new-9') === 'new-9', 'a pair the bank cannot resolve is ignored');
assert(PGRE.isDuplicateQuestion({ id: 'new-2' }) && !PGRE.isDuplicateQuestion('old-2'),
  'isDuplicateQuestion accepts a question or an id');
assert(PGRE.duplicatesOf('old-1').join() === 'new-1' && PGRE.duplicatesOf('old-3').length === 0,
  'duplicatesOf lists the resolvable duplicates of a canonical');

console.log('\nthe default pool');
store.reset();
assert(poolIds() === 'p-1', 'with no form sat, neither form enters the pool');
sit('form-new');
assert(poolIds() === 'new-3,old-1,old-2,p-1',
  'sitting the reprint graduates its unpaired question and the canonicals, not the duplicates (' + poolIds() + ')');
assert(!PGRE.isProtectedExamQuestion(PGRE.questionById('old-1')) &&
  PGRE.isProtectedExamQuestion(PGRE.questionById('old-3')),
  'a canonical seen through its reprint is unprotected; the rest of its form stays protected');
assert(PGRE.questionById('new-1') && PGRE.questionById('new-1').id === 'new-1',
  'the duplicate still resolves by id for exam review');
store.reset();
sit('form-old');
assert(poolIds() === 'old-1,old-2,old-3,p-1', 'sitting the original form adds it whole and no duplicate');
sit('form-new');
assert(poolIds() === 'new-3,old-1,old-2,old-3,p-1', 'sitting both forms still lists each question once');

console.log('\nthe intact sitting');
store.reset();
var exam = engine.create({ source: 'form-new' });
assert(exam && exam.order.join() === 'new-1,new-2,new-3', 'the reprint form replays verbatim under its own ids');
exam.answers['new-1'] = 0;     // wrong
exam.answers['new-2'] = 2;     // right
exam.answers['new-3'] = 3;     // right
engine.submit(exam);
var m = store.state.mistakes;
assert(m['old-1'] && !m['new-1'], 'a miss on a duplicate files under the canonical mistake entry');
assert(!m['old-2'] && !m['new-2'], 'a right answer files nothing');
var rows = store.state.attempts.filter(function (a) { return a.sid === exam.id; });
assert(rows.map(function (a) { return a.qid; }).join() === 'new-1,new-2,new-3',
  'attempt rows keep the ids the sitting showed');
assert(exam.raw === 2, 'the sitting scores on its own answers');

console.log('\nlucky guess from the exam review');
assert(engine.markGuessed(exam, 'new-2') === true, 'a correct duplicate can be marked guessed');
assert(m['old-2'] && m['old-2'].lucky && !m['new-2'], 'the lucky entry files under the canonical id');
assert(engine.unmarkGuessed(exam, 'new-2') === true && !m['old-2'],
  'unmarking removes the canonical entry it created');

console.log('\nrecords count either id');
var rec = PGRE.questionRecord('old-2');
assert(rec && rec.attempts === 1 && rec.firstCorrect === true,
  'the canonical record includes the answer given under the duplicate id');
store.state.questions['old-2'] = { attempts: 2, correct: 0, firstCorrect: false };
rec = PGRE.questionRecord('old-2');
assert(rec.attempts === 3 && rec.correct === 1 && rec.firstCorrect === true, 'records under both ids are summed');
assert(PGRE.questionRecord('p-1') === null, 'an unanswered question has no record');

console.log('\nstatus summary');
var summary = PGRE.buildStatusSummary();
var row1 = summary.attempts.filter(function (a) { return a.qid === 'new-1'; })[0];
var row3 = summary.attempts.filter(function (a) { return a.qid === 'new-3'; })[0];
assert(row1 && row1.dupOf === 'old-1', 'a duplicate row names its canonical in dupOf');
assert(row3 && row3.dupOf === null, 'an unpaired row has dupOf null');
assert(summary.questions['old-1'] && !summary.questions['new-1'],
  'question texts are published once, under the canonical id');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
