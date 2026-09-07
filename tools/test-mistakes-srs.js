#!/usr/bin/env node
/* Unit tests for the mistake-book interval ladder and archive state machine
   (js/srs.js mistake scheduler + the archive transitions its consumers
   perform). Loads the shipped store.js and srs.js (no re-implementation) and
   stubs localStorage + questionById as tools/test-srs-intervals.js does.
   Run: node tools/test-mistakes-srs.js */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var root = path.resolve(__dirname, '..');
var storeSrc = fs.readFileSync(path.join(root, 'js', 'store.js'), 'utf8');
var srsSrc = fs.readFileSync(path.join(root, 'js', 'srs.js'), 'utf8');

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
vm.runInContext(srsSrc, sandbox);

var PGRE = sandbox.PGRE;
var store = PGRE.store;
var srs = PGRE.srs;
if (!srs || typeof srs.mistakeMissed !== 'function') {
  console.error('FAIL: shipped srs.js did not export the mistake scheduler');
  process.exit(1);
}
store.load();

/* The mistake book resolves ids through PGRE.questionById; stub it so entries
   are listable without loading the whole bank. */
PGRE.questionById = function (id) { return { id: id, topic: 'cm' }; };

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

function resetState() {
  store.reset();
  return store.state;
}

function daysFromNow(n) {
  var d = new Date();
  d.setDate(d.getDate() + n);
  return srs.dayStr(d);
}

function mkEntry(qid, extra) {
  var mk = { firstMissedAt: new Date().toISOString(), misses: 1, solves: 0,
    wrongPicks: [], archivedAt: null, srs: null };
  if (extra) Object.keys(extra).forEach(function (k) { mk[k] = extra[k]; });
  store.state.mistakes[qid] = mk;
  return mk;
}

console.log('interval ladder');
assert(JSON.stringify(srs.MISTAKE_LADDER) === '[1,3,7,14,30,60]',
  'MISTAKE_LADDER is 1 -> 3 -> 7 -> 14 -> 30 -> 60 days');

resetState();
var mk = mkEntry('q1');
srs.mistakeMissed(mk);
assert(mk.srs.step === 0, 'a miss puts the entry at the bottom rung (step 0)');
assert(srs.daysUntil(mk.srs.due) === 1, 'a miss is due tomorrow');

srs.mistakeSolved(mk);
assert(mk.srs.step === 1 && srs.daysUntil(mk.srs.due) === 3,
  'first correct solve climbs to step 1, due in 3 days');
srs.mistakeSolved(mk);
assert(mk.srs.step === 2 && srs.daysUntil(mk.srs.due) === 7,
  'second solve climbs to step 2, due in 7 days');
srs.mistakeSolved(mk);
srs.mistakeSolved(mk);
assert(mk.srs.step === 4 && srs.daysUntil(mk.srs.due) === 30,
  'solves keep climbing: step 4, due in 30 days');
srs.mistakeSolved(mk);
assert(mk.srs.step === 5 && srs.daysUntil(mk.srs.due) === 60,
  'step 5 schedules 60 days out');
srs.mistakeSolved(mk);
assert(mk.srs.step === 5 && srs.daysUntil(mk.srs.due) === 60,
  'the ladder caps at the last rung (60 days) — entries are permanent');

resetState();
var fresh = mkEntry('q2');
srs.mistakeSolved(fresh);
assert(fresh.srs.step === 1 && srs.daysUntil(fresh.srs.due) === 3,
  'solving an entry with no srs state starts it on the ladder at step 1');

resetState();
var relapse = mkEntry('q3');
srs.mistakeSolved(relapse);
srs.mistakeSolved(relapse);
assert(relapse.srs.step === 2, 'entry climbed to step 2 before the relapse');
srs.mistakeMissed(relapse);
assert(relapse.srs.step === 0 && srs.daysUntil(relapse.srs.due) === 1,
  'a new miss resets the ladder to step 0, due tomorrow');
assert(store.state.mistakes['q3'], 'a miss never removes the entry from the book');

console.log('\narchive state machine (open / archived / due partitions)');
resetState();
var open1 = mkEntry('q4'); srs.mistakeMissed(open1);
open1.srs.due = daysFromNow(-1); // overdue
var open2 = mkEntry('q5'); srs.mistakeMissed(open2);
open2.srs.due = daysFromNow(5); // upcoming
var archived1 = mkEntry('q6', { archivedAt: new Date().toISOString() });
srs.mistakeMissed(archived1);
archived1.srs.due = daysFromNow(-2); // overdue BUT archived

var openIds = function (list) { return list.map(function (e) { return e.qid; }).sort(); };
assert(openIds(srs.openMistakes()).join(',') === 'q4,q5',
  'openMistakes lists exactly the non-archived entries');
assert(openIds(srs.archivedMistakes()).join(',') === 'q6',
  'archivedMistakes lists exactly the archived entries');
assert(openIds(srs.dueMistakes()).join(',') === 'q4',
  'dueMistakes includes the overdue open entry only');
assert(srs.dueMistakes().every(function (e) { return !e.mk.archivedAt; }),
  'archived entries are hidden from due counts even when overdue');

/* The Archive button (js/view-mistakes.js) stamps archivedAt; the Restore
   button clears it. The miss path (js/gamify.js) clears archivedAt and resets
   the ladder — "a new miss reopens it". */
archived1.archivedAt = null; // Restore
assert(openIds(srs.openMistakes()).join(',') === 'q4,q5,q6',
  'restoring an archived entry returns it to the open book');
archived1.archivedAt = new Date().toISOString(); // Archive again
srs.mistakeMissed(archived1);
archived1.archivedAt = null; // a new miss reopens it (gamify miss path)
assert(archived1.srs.step === 0 && srs.daysUntil(archived1.srs.due) === 1,
  'a new miss reopens the entry at the bottom rung');

console.log('\nlucky-guess filing (markLucky / unmarkLucky / clearLucky)');
resetState();
var lucky = srs.markLucky('q7');
assert(store.state.mistakes['q7'] === lucky, 'markLucky creates the mistake-book entry');
assert(lucky.lucky === true && lucky.misses === 0 && lucky.solves === 0,
  'a lucky guess never counts as a miss');
assert(lucky.srs && lucky.srs.step === 0 && srs.daysUntil(lucky.srs.due) === 1,
  'a lucky guess seeds the entry on the bottom rung, due tomorrow');

var reopened = mkEntry('q8', { lucky: false });
reopened.archivedAt = new Date().toISOString();
srs.mistakeSolved(reopened);
var stepBefore = reopened.srs.step;
srs.markLucky('q8');
assert(reopened.archivedAt === null, 'markLucky reopens an archived entry (fresh evidence)');
assert(reopened.lucky === true, 'markLucky flags the reopened entry');
assert(reopened.srs.step === stepBefore, 'markLucky leaves an existing schedule intact');

srs.unmarkLucky('q7');
assert(!store.state.mistakes['q7'],
  'unmarkLucky removes an entry that exists ONLY because of the lucky filing');
srs.unmarkLucky('q8');
assert(store.state.mistakes['q8'] && !store.state.mistakes['q8'].lucky &&
  !store.state.mistakes['q8'].lastLuckyAt,
  'unmarkLucky on an older entry just drops the flag, keeping the record');
assert(store.state.mistakes['q8'].srs && store.state.mistakes['q8'].srs.step === 1,
  'unmarkLucky leaves the ladder untouched');
var cleared = mkEntry('q9', { lucky: true, lastLuckyAt: new Date().toISOString() });
srs.mistakeMissed(cleared);
srs.mistakeSolved(cleared);
var dueBefore = cleared.srs.due;
srs.clearLucky('q9');
assert(!cleared.lucky && !cleared.lastLuckyAt, 'clearLucky retires the stale flag');
assert(cleared.misses === 1 && cleared.srs.step === 1 && cleared.srs.due === dueBefore,
  'clearLucky leaves misses, ladder and due date intact');

console.log('\ndate helpers');
assert(srs.daysUntil(daysFromNow(0)) === 0, 'daysUntil today is 0');
assert(srs.daysUntil(daysFromNow(9)) === 9, 'daysUntil counts forward whole days');
assert(srs.daysUntil(daysFromNow(-3)) === -3, 'daysUntil is negative for past dates');
assert(srs.addDaysTo('2026-01-28', 10) === '2026-02-07', 'addDaysTo crosses month boundaries');
assert(srs.ivlLabel(0) === 'today' && srs.ivlLabel(1) === '1 d' && srs.ivlLabel(7) === '7 d',
  'ivlLabel renders days');
assert(srs.ivlLabel(30) === '1 mo' && srs.ivlLabel(60) === '2 mo',
  'ivlLabel renders whole months');
assert(srs.ivlLabel(45) === '1.5 mo', 'ivlLabel renders fractional months');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
