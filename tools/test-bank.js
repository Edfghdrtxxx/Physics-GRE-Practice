#!/usr/bin/env node
/* Unit tests for js/bank.js — question partitioning and spoiler protection.
   Loads the shipped bank.js (no re-implementation) against a fabricated bank.
   Run: node tools/test-bank.js */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var root = path.resolve(__dirname, '..');
var bankSrc = fs.readFileSync(path.join(root, 'js', 'bank.js'), 'utf8');

var window = { PGRE: {} };
var sandbox = {
  window: window,
  PGRE: window.PGRE,
  console: console,
  Array: Array,
  Object: Object
};
vm.createContext(sandbox);
vm.runInContext(bankSrc, sandbox);

var PGRE = sandbox.PGRE;
if (typeof PGRE.allQuestions !== 'function' || typeof PGRE.questionById !== 'function') {
  console.error('FAIL: shipped bank.js did not export allQuestions/questionById');
  process.exit(1);
}

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

function q(id, topic) { return { id: id, topic: topic || 'cm', answer: 0, choices: ['a', 'b', 'c', 'd', 'e'] }; }

/* Fabricated bank. Note: 'dup' appears in BOTH the default pool (preview) and
   the released-exam bank, to prove dedup keeps the first occurrence. */
PGRE.QUESTIONS = [q('p1', 'cm'), q('p2', 'em'), q('dup', 'qm')];
PGRE.BOOK_QUESTIONS = [q('b1', 'th'), q('b2', 'cm')];
PGRE.ETS_DRILLS = [
  { id: 'drill-8677', questions: [q('d1', 'cm'), q('d2', 'em')] },
  { id: 'drill-9277', questions: [q('d3', 'qm')] }
];
PGRE.BOOK_EXAMS = [
  { id: 'x1', title: 'Book sample exam', format: '70x120', questions: [q('e1', 'at'), q('e2', 'sp')] }
];
PGRE.ETS_EXAMS = [
  { id: 'gr8677', title: 'GR8677', format: '100x170', questions: [q('dup', 'sr'), q('g2', 'ow'), q('g3', 'lb')] }
];

var EXAM_SRCS = ['cpg-exam', 'ets-exam'];

function srcs(pool) {
  var out = {};
  pool.forEach(function (x) { out[x.src] = (out[x.src] || 0) + 1; });
  return out;
}

console.log('default practice pool (spoiler protection)');
var def = PGRE.allQuestions();
assert(def.length === 8, 'default pool = preview(3) + cpg(2) + drills(3) = 8, got ' + def.length);
assert(def.every(function (x) { return EXAM_SRCS.indexOf(x.src) === -1; }),
  'default pool contains no cpg-exam / ets-exam questions');
assert(def.some(function (x) { return x.id === 'd1' && x.src === 'ets-drill'; }),
  'default pool includes ets-drill questions (GR8677/GR9277 exemption)');
assert(def.some(function (x) { return x.id === 'b1' && x.src === 'cpg'; }),
  'default pool includes book chapter problems tagged cpg');
assert(def.some(function (x) { return x.id === 'p1' && x.src === 'preview'; }),
  'default pool includes preview questions tagged preview');

console.log('\nincludeExam flattens the intact exams');
var full = PGRE.allQuestions({ includeExam: true });
assert(full.length === 12, 'includeExam pool = 13 entries minus the deduped id = 12, got ' + full.length);
var s = srcs(full);
assert(s['cpg-exam'] === 2 && s['ets-exam'] === 2,
  'includeExam tags book exams cpg-exam and ETS exams ets-exam (dup id keeps preview, so ets-exam = 2)');
assert(full.some(function (x) { return x.id === 'e1' && x.src === 'cpg-exam'; }),
  'book sample-exam questions present under includeExam');
assert(full.some(function (x) { return x.id === 'g2' && x.src === 'ets-exam'; }),
  'released ETS exam questions present under includeExam');

console.log('\nallQuestions memoizes per includeExam');
assert(PGRE.allQuestions() === def, 'allQuestions() returns the same array');
assert(PGRE.allQuestions({ includeExam: true }) === full, 'includeExam returns the same array');
assert(full !== def, 'includeExam cache is distinct from the default pool');
assert(full.length > def.length, 'includeExam pool is longer than default');

console.log('\nno duplicate ids across the pool');
var ids = {};
var dupes = 0;
full.forEach(function (x) { if (ids[x.id]) dupes++; else ids[x.id] = true; });
assert(dupes === 0, 'no duplicate ids in the includeExam pool');
var defIds = {};
var defDupes = 0;
def.forEach(function (x) { if (defIds[x.id]) defDupes++; else defIds[x.id] = true; });
assert(defDupes === 0, 'no duplicate ids in the default pool');
var dup = full.filter(function (x) { return x.id === 'dup'; });
assert(dup.length === 1 && dup[0].src === 'preview',
  'id present in two banks merges once, first occurrence (preview) wins');

console.log('\nby-id lookup reaches exam questions');
assert(PGRE.questionById('g3') && PGRE.questionById('g3').src === 'ets-exam',
  'questionById resolves released ETS exam questions');
assert(PGRE.questionById('e2') && PGRE.questionById('e2').src === 'cpg-exam',
  'questionById resolves book sample-exam questions');
assert(PGRE.questionById('d1') && PGRE.questionById('d1').src === 'ets-drill',
  'questionById resolves drill questions');
assert(PGRE.questionById('p2') && PGRE.questionById('p2').src === 'preview',
  'questionById resolves default-pool questions');
assert(PGRE.questionById('no-such-id') === null, 'questionById returns null for unknown ids');

console.log('\ntopic slice stays inside the default pool');
var cm = PGRE.questionsForTopic('cm');
assert(cm.every(function (x) { return EXAM_SRCS.indexOf(x.src) === -1; }),
  'questionsForTopic never leaks exam questions');
assert(cm.some(function (x) { return x.id === 'p1'; }) && cm.some(function (x) { return x.id === 'b2'; }),
  'questionsForTopic("cm") returns preview + cpg matches');
assert(PGRE.questionsForTopic('ow').length === 0,
  'topic that only exists in an exam is empty in the default pool');
assert(PGRE.questionsForTopic('all').length === def.length, 'questionsForTopic("all") == default pool');
assert(PGRE.questionsForTopic('all') === def, 'questionsForTopic("all") is the cached default pool');
assert(PGRE.questionsForTopic('cm') === cm, 'questionsForTopic memoizes per topic id');

console.log('\nguarded reads when bank files are absent');
(function () {
  var window2 = { PGRE: {} };
  var sandbox2 = {
    window: window2,
    PGRE: window2.PGRE,
    console: console,
    Array: Array,
    Object: Object
  };
  vm.createContext(sandbox2);
  vm.runInContext(bankSrc, sandbox2);
  var P = sandbox2.PGRE;
  P.QUESTIONS = [q('p1', 'cm'), q('p2', 'em'), q('dup', 'qm')];
  P.BOOK_EXAMS = null;
  P.ETS_EXAMS = null;
  P.ETS_DRILLS = null;
  P.BOOK_QUESTIONS = null;
  var bare = P.allQuestions({ includeExam: true });
  assert(bare.length === 3 && bare.every(function (x) { return x.src === 'preview'; }),
    'missing banks are skipped without throwing');
  assert(P.questionById('p1') !== null, 'questionById still works with missing banks');
})();

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
