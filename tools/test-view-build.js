#!/usr/bin/env node
/* Unit tests for js/view-build.js — the include-sample-exam toggle never
   adds an unsat intact exam. Loads the shipped bank.js and view-build.js
   against a fabricated bank with one sat book exam, one unsat book exam,
   one sat ETS form, and one unsat ETS form. Run: node tools/test-view-build.js */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var root = path.resolve(__dirname, '..');
var bankSrc = fs.readFileSync(path.join(root, 'js', 'bank.js'), 'utf8');
var buildSrc = fs.readFileSync(path.join(root, 'js', 'view-build.js'), 'utf8');

var window = { PGRE: {} };
var sandbox = {
  window: window,
  PGRE: window.PGRE,
  console: console,
  Array: Array,
  Object: Object,
  Math: Math,
  JSON: JSON
};
vm.createContext(sandbox);
vm.runInContext(bankSrc, sandbox);
vm.runInContext(buildSrc, sandbox);

var PGRE = sandbox.PGRE;
if (!PGRE.views || !PGRE.views.build || typeof PGRE.views.build.resample !== 'function') {
  console.error('FAIL: shipped view-build.js did not export resample');
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

function q(id, topic) {
  return { id: id, topic: topic || 'cm', answer: 0, difficulty: 1,
    choices: ['a', 'b', 'c', 'd', 'e'] };
}

PGRE.QUESTIONS = [q('p1', 'cm')];
PGRE.BOOK_QUESTIONS = [];
PGRE.ETS_DRILLS = [];
PGRE.BOOK_EXAMS = [
  { id: 'x1', title: 'Book sample 1', format: '70x120', questions: [q('e1', 'at')] },
  { id: 'x2', title: 'Book sample 2', format: '70x120', questions: [q('e2', 'sp')] }
];
PGRE.ETS_EXAMS = [
  { id: 'gr1777', title: 'GR1777', format: '100x170', questions: [q('g17-1', 'cm')] },
  { id: 'ets2024', title: 'ets2024', format: '70x120', questions: [q('e24-1', 'em')] }
];
PGRE.store = {
  state: {
    exams: [
      { id: 'ex-book', source: 'x1', submittedAt: '2026-10-12T00:00:00.000Z' },
      { id: 'ex-ets', source: 'gr1777', submittedAt: '2026-10-12T00:00:00.000Z' }
    ]
  }
};
PGRE.topicById = function () { return { short: 'x' }; };

function setOf(ids) {
  var out = {};
  (ids || []).forEach(function (id) { out[id] = true; });
  return out;
}

console.log('custom-quiz builder never adds unsat intact exams');
var off = setOf(PGRE.views.build.resample({ includeExam: false }, 1000));
var on = setOf(PGRE.views.build.resample({ includeExam: true }, 1000));
assert(!!off.p1 && !!off.e1 && !!off['g17-1'],
  'toggle off includes the default pool (preview + sat book + sat ETS)');
assert(!off.e2 && !off['e24-1'],
  'toggle off excludes the unsat book exam and the unsat ETS form');
assert(!!on.p1 && !!on.e1 && !!on['g17-1'],
  'toggle on still includes sat book and sat ETS questions');
assert(!on.e2, 'toggle on does not add the unsat book sample exam');
assert(!on['e24-1'], 'toggle on does not add the unsat ETS form');
assert(Object.keys(off).sort().join(',') === Object.keys(on).sort().join(','),
  'toggle on and off draw the same ids once unsat forms stay protected');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
