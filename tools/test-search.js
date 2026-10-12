#!/usr/bin/env node
/* Unit tests for js/search.js — unsat intact exams stay out of the index.
   Loads the shipped bank.js and search.js against a fabricated bank with
   one sat book exam, one unsat book exam, one sat ETS form, and one unsat
   ETS form. Run: node tools/test-search.js */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var root = path.resolve(__dirname, '..');
var bankSrc = fs.readFileSync(path.join(root, 'js', 'bank.js'), 'utf8');
var searchSrc = fs.readFileSync(path.join(root, 'js', 'search.js'), 'utf8');

var window = { PGRE: {} };
var sandbox = {
  window: window,
  PGRE: window.PGRE,
  console: console,
  Array: Array,
  Object: Object,
  String: String,
  Promise: Promise
};
vm.createContext(sandbox);
vm.runInContext(bankSrc, sandbox);
vm.runInContext(searchSrc, sandbox);

var PGRE = sandbox.PGRE;
if (!PGRE.search || typeof PGRE.search.buildIndex !== 'function') {
  console.error('FAIL: shipped search.js did not export buildIndex');
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

function q(id, topic, stem) {
  return {
    id: id,
    topic: topic || 'cm',
    answer: 0,
    choices: ['alpha-' + id, 'beta-' + id],
    q: stem || ('stem ' + id),
    sol: 'solution ' + id
  };
}

PGRE.QUESTIONS = [q('p1', 'cm', 'preview capacitor energy')];
PGRE.BOOK_QUESTIONS = [];
PGRE.ETS_DRILLS = [];
PGRE.BOOK_EXAMS = [
  { id: 'x1', title: 'Book sample 1', format: '70x120',
    questions: [q('e1', 'at', 'sat book unique stem x1')] },
  { id: 'x2', title: 'Book sample 2', format: '70x120',
    questions: [q('e2', 'sp', 'unsat book unique stem x2')] }
];
PGRE.ETS_EXAMS = [
  { id: 'gr1777', title: 'GR1777', format: '100x170',
    questions: [q('g17-1', 'cm', 'sat ets unique stem gr1777')] },
  { id: 'ets2024', title: 'ets2024', format: '70x120',
    questions: [q('e24-1', 'em', 'unsat ets unique stem ets2024')] }
];
PGRE.store = {
  state: {
    exams: [
      { id: 'ex-book', source: 'x1', submittedAt: '2026-10-12T00:00:00.000Z' },
      { id: 'ex-ets', source: 'gr1777', submittedAt: '2026-10-12T00:00:00.000Z' }
    ]
  }
};
PGRE.contentDB = { all: function () { return Promise.resolve([]); } };
PGRE.formulaDeck = function () { return Promise.resolve([]); };
PGRE.srs = { mistakeEntries: function () { return []; } };
PGRE.notes = { all: function () { return { notes: {} }; } };
PGRE.ui = { esc: function (s) { return String(s == null ? '' : s); } };

function byId(idx, id) {
  for (var i = 0; i < idx.length; i++) {
    if (idx[i].id === id) return idx[i];
  }
  return null;
}

console.log('search index omits unsat intact exams');
PGRE.search.buildIndex().then(function (idx) {
  assert(!!byId(idx, 'p1'), 'preview questions stay in the index');
  assert(!!byId(idx, 'e1'), 'sat book sample-exam questions index as questions');
  assert(byId(idx, 'e1') && byId(idx, 'e1').kind === 'question',
    'sat book items are kind question, not exam');
  assert(!byId(idx, 'e2'), 'unsat book sample-exam questions are omitted');
  assert(!!byId(idx, 'g17-1') && byId(idx, 'g17-1').kind === 'question',
    'sat ETS questions index as normal questions');
  assert(!byId(idx, 'e24-1'), 'unsat ETS questions are omitted');
  var unsatBook = PGRE.search.match(idx, 'unsat book unique stem x2');
  assert(unsatBook.total === 0, 'a query for an unsat book stem has no hits');
  var satBook = PGRE.search.match(idx, 'sat book unique stem x1');
  assert(satBook.total === 1 && satBook.hits[0].entry.id === 'e1',
    'a query for a sat book stem hits that question');
  var unsatEts = PGRE.search.match(idx, 'unsat ets unique stem ets2024');
  assert(unsatEts.total === 0, 'a query for an unsat ETS stem has no hits');

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
}).catch(function (err) {
  console.error(err);
  process.exit(1);
});
