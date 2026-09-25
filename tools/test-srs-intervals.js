#!/usr/bin/env node
/* Unit tests for PGRE.srs.nextIntervals / examCap — loads the shipped srs.js
   (no re-implementation). Run: node tools/test-srs-intervals.js */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var root = path.resolve(__dirname, '..');
var storeSrc = fs.readFileSync(path.join(root, 'js', 'store.js'), 'utf8');
var srsSrc = fs.readFileSync(path.join(root, 'js', 'srs.js'), 'utf8');
var storeState = {
  settings: { examDate: '', formulaExamCap: true },
  cards: {},
  cardReviews: []
};

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

var store = sandbox.PGRE.store;
store.load();
var storeState = store.state;

var srs = sandbox.PGRE.srs;
if (!srs || typeof srs.nextIntervals !== 'function') {
  console.error('FAIL: shipped srs.js did not export nextIntervals');
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

function ordered(iv) {
  return iv.again === 0 && iv.hard <= iv.good && iv.good <= iv.easy;
}

function resetStore(opts) {
  store.reset();
  storeState = store.state;
  storeState.settings.formulaExamCap = (opts && 'formulaExamCap' in opts) ? opts.formulaExamCap : true;
  storeState.settings.examDate = (opts && opts.examDate) || '';
  storeState.cards = {};
  storeState.cardReviews = [];
}

function daysFromNow(n) {
  var d = new Date();
  d.setDate(d.getDate() + n);
  return srs.dayStr(d);
}

console.log('new cards');
resetStore();
var fresh = srs.nextIntervals(null);
assert(fresh.again === 0 && fresh.hard === 1 && fresh.good === 1 && fresh.easy === 4,
  'stateless: Hard/Good 1 d, Easy 4 d');
assert(ordered(fresh), 'stateless: Hard ≤ Good ≤ Easy');

var zeroReps = srs.nextIntervals({ reps: 0, interval: 0, ease: 2.5 });
assert(zeroReps.easy === 4, 'reps=0 uses the new-card Easy interval of 4');

console.log('\nreview after Easy (the screenshot inversion)');
resetStore();
var afterEasy = { reps: 1, interval: 10, ease: 2.5 };
var uncapped = srs.nextIntervals(afterEasy);
assert(uncapped.hard === 12, 'ivl=10: Hard = round(10×1.2) = 12');
assert(uncapped.good === 25, 'ivl=10 ease=2.5: Good = round(10×2.5) = 25, not 3');
assert(uncapped.easy === 33, 'ivl=10: Easy = round(10×2.5×1.3) = 33');
assert(ordered(uncapped), 'after Easy: Hard ≤ Good ≤ Easy (uncapped)');
assert(uncapped.again < uncapped.hard && uncapped.hard < uncapped.good && uncapped.good < uncapped.easy,
  'ivl=10: strict monotonicity Again < Hard < Good < Easy');

console.log('\nhorizon examCap: uncapped vs clamped');
resetStore({ examDate: daysFromNow(65) }); // exam in 65 days → cap = 64
assert(srs.examCap() === 64, 'exam in 65 days → horizon cap 64');
var uncappedHorizon = srs.nextIntervals(afterEasy);
assert(uncappedHorizon.hard === 12 && uncappedHorizon.good === 25 && uncappedHorizon.easy === 33,
  'horizon cap 64: ivl=10 produces 12, 25, 33 (uncapped since 33 <= 64)');
assert(uncappedHorizon.again < uncappedHorizon.hard && uncappedHorizon.hard < uncappedHorizon.good && uncappedHorizon.good < uncappedHorizon.easy,
  'horizon cap 64: Again < Hard < Good < Easy strictly monotonic');

resetStore({ examDate: daysFromNow(51) }); // exam in 51 days → cap = 50
assert(srs.examCap() === 50, 'exam in 51 days → cap 50');
var largeIvl = { reps: 5, interval: 40, ease: 2.5 };
var clampedLarge = srs.nextIntervals(largeIvl); // raw: hard=48, good=100, easy=130
assert(clampedLarge.easy === 50 && clampedLarge.good === 49 && clampedLarge.hard === 48,
  'cap 50: large ivl (raw easy=130) produces easy=50, good=49, hard=48 with strict inequality');
assert(clampedLarge.again < clampedLarge.hard && clampedLarge.hard < clampedLarge.good && clampedLarge.good < clampedLarge.easy,
  'cap 50: Again < Hard < Good < Easy strict monotonicity preserved');

resetStore({ examDate: daysFromNow(14) }); // cap = Math.max(1, 14 - 1) = 13
assert(srs.examCap() === 13, 'exam in 14 days → cap 13');
var capped = srs.nextIntervals(afterEasy);
assert(capped.hard === 11 && capped.good === 12 && capped.easy === 13,
  'cap 13: Hard 11, Good 12, Easy 13 (backward cascade preserves Hard < Good < Easy)');
assert(capped.again < capped.hard && capped.hard < capped.good && capped.good < capped.easy,
  'cap 13: strict monotonicity Again < Hard < Good < Easy');
assert(ordered(capped), 'after Easy + cap: Hard ≤ Good ≤ Easy');
console.log('\ncap switch');
resetStore({ examDate: daysFromNow(65), formulaExamCap: false });
assert(srs.examCap() === null, 'formulaExamCap false → examCap is null');
var switched = srs.nextIntervals(afterEasy);
assert(switched.good === 25 && switched.easy === 33,
  'uncapped switch: Good/Easy keep full Anki length even with an exam date set');

resetStore({ examDate: daysFromNow(14) });
storeState.settings.formulaExamCap = undefined;
assert(srs.examCap() === 13, 'missing formulaExamCap key still caps (default ON)');
console.log('\nfirst review after graduating Good (interval 1)');
resetStore();
var young = srs.nextIntervals({ reps: 1, interval: 1, ease: 2.5 });
assert(young.hard === 2 && young.good === 3 && young.easy === 4,
  'ivl=1 ease=2.5: Hard 2, Good 3, Easy 4 (Hard at least current+1)');
assert(ordered(young), 'young review: ordered');

resetStore();
var ankiRust = srs.nextIntervals({ reps: 1, interval: 1, ease: 1.3 });
assert(ankiRust.hard === 2 && ankiRust.good === 3 && ankiRust.easy === 4,
  'Anki rust test: ivl=1 ease=1.3 → Hard 2, Good 3, Easy 4');

resetStore();
var ivl2 = srs.nextIntervals({ reps: 2, interval: 2, ease: 2.5 });
assert(ivl2.hard === 3 && ivl2.good === 5 && ivl2.easy === 7,
  'ivl=2 ease=2.5: Hard 3 (not 2), Good 5, Easy 7');

console.log('\nlow ease never inverts');
resetStore();
var leechEase = srs.nextIntervals({ reps: 4, interval: 8, ease: 1.3 });
assert(ordered(leechEase), 'ease at floor 1.3: Hard ≤ Good ≤ Easy');
assert(leechEase.good >= leechEase.hard, 'constrainedIvl: Good at least Hard');
assert(leechEase.easy >= leechEase.good, 'constrainedIvl: Easy at least Good');

console.log('\noverdue review gets Anki days-late bonus on Good/Easy, not Hard');
resetStore();
var overdue = srs.nextIntervals({
  reps: 3, interval: 10, ease: 2.5, due: daysFromNow(-4)
});
assert(overdue.hard === 12, '4 days late: Hard still round(10×1.2)=12 (no late bonus)');
assert(overdue.good === 30, 'Good = round((10+4/2)×2.5)=30');
assert(overdue.easy === 46, 'Easy = round((10+4)×2.5×1.3)=46');
assert(ordered(overdue), 'overdue: ordered');

console.log('\ngradeCard writes the previewed interval');
resetStore();
storeState.cards.f1 = { reps: 1, lapses: 0, interval: 10, ease: 2.5,
  due: srs.today(), reviews: 1 };
var preview = srs.nextIntervals(storeState.cards.f1);
var st = srs.gradeCard('f1', 'good');
assert(st.interval === preview.good,
  'gradeCard Good stores the same interval nextIntervals previewed (' + preview.good + ')');
assert(st.interval !== 3, 'gradeCard Good is not the old hardcoded 3-day shortcut');


console.log('\nexamCap horizon edge cases');
resetStore({ examDate: daysFromNow(0) });
assert(srs.examCap() === null, 'exam today (days=0) → null');
resetStore({ examDate: daysFromNow(1) });
assert(srs.examCap() === null, 'exam tomorrow (days=1) → null');
resetStore({ examDate: daysFromNow(-2) });
assert(srs.examCap() === null, 'exam in past (days=-2) → null');
resetStore({ examDate: 'not-a-date' });
assert(srs.examCap() === null, 'invalid exam date → null');
resetStore({ examDate: daysFromNow(2) });
assert(srs.examCap() === 1, 'exam in 2 days → cap 1');
resetStore({ examDate: daysFromNow(3) });
assert(srs.examCap() === 2, 'exam in 3 days → cap 2');
resetStore({ examDate: daysFromNow(4) });
assert(srs.examCap() === 3, 'exam in 4 days → cap 3');

console.log('\nbackward cascade clamping: cap < 3 vs cap >= 3');
resetStore({ examDate: daysFromNow(3) }); // cap = 2
var cap2 = srs.nextIntervals({ reps: 2, interval: 5, ease: 2.5 });
assert(cap2.hard <= 2 && cap2.good <= 2 && cap2.easy <= 2, 'cap 2 clamps all to at most 2');

resetStore({ examDate: daysFromNow(8) }); // cap = 7, outside the ≤7-day final pass
var cap3 = srs.nextIntervals({ reps: 2, interval: 5, ease: 2.5 });
assert(cap3.easy === 7 && cap3.good === 6 && cap3.hard === 5, 'cap 7 cascades to easy=7, good=6, hard=5');

resetStore({ examDate: daysFromNow(4) }); // cap = 3, also inside final pass
var cap3b = srs.nextIntervals({ reps: 2, interval: 5, ease: 2.5 });
assert(cap3b.easy === 1 && cap3b.good === 1 && cap3b.hard === 1, 'final pass holds all grades at 1 day');

console.log('\nstore.resetFormulaCards');
resetStore();
storeState.cards['f1'] = { reps: 3, interval: 10, ease: 2.5, due: srs.today(), reviews: 3 };
storeState.cardReviews.push({ d: srs.today(), id: 'f1', g: 'good', ivl: 5, m: 0, n: 1 });
storeState.formulaDay = { date: srs.today(), reviewIds: ['f1'], newIds: [] };
storeState.formulaStudy = { date: srs.today(), queueIds: ['f1'] };
storeState.formulaSuspended = { 'f2': 1 };
storeState.migrations = { easy10: '2026-09-01T00:00:00.000Z' };
storeState.attempts.push({ qid: 'q1', correct: true }); // non-flashcard data
storeState.mistakes['q1'] = { firstMissedAt: '2026-09-01T00:00:00.000Z', misses: 1, solves: 0 };
storeState.settings.formulaExamCap = true;
storeState.settings.theme = 'dark';
store.save();

store.resetFormulaCards();
assert(Object.keys(store.state.cards).length === 0, 'cards reset to empty object');
assert(store.state.cardReviews.length === 0, 'cardReviews reset to empty array');
assert(store.state.formulaDay === null, 'formulaDay reset to null');
assert(store.state.formulaStudy === null, 'formulaStudy reset to null');
assert(Object.keys(store.state.formulaSuspended).length === 0, 'formulaSuspended reset to empty object');
assert(!store.state.migrations.easy10, 'easy10 migration flag removed');
assert(store.state.attempts.length === 1 && store.state.attempts[0].qid === 'q1', 'attempts preserved');
assert(store.state.mistakes['q1'] && store.state.mistakes['q1'].misses === 1, 'mistakes preserved');
assert(store.state.settings.theme === 'dark', 'settings.theme preserved');

console.log('\nstore.load and importJSON ankiReset2026 migration');
resetStore();
storeState.cards['f1'] = { reps: 3, interval: 10, ease: 2.5, due: srs.today(), reviews: 3 };
storeState.cardReviews.push({ d: srs.today(), id: 'f1', g: 'good', ivl: 5, m: 0, n: 1 });
storeState.attempts.push({ qid: 'q1', correct: true });
delete storeState.migrations.ankiReset2026;
store.save();
store.load();
assert(Object.keys(store.state.cards).length === 0, 'load() resets cards when ankiReset2026 missing');
assert(typeof store.state.migrations.ankiReset2026 === 'string', 'load() stamps ankiReset2026');
assert(store.state.attempts.length === 1, 'load() preserves non-card state');

// Subsequent load does not wipe newly added cards
store.state.cards['f2'] = { reps: 1, interval: 4, ease: 2.5, due: srs.today(), reviews: 1 };
store.save();
store.load();
assert(store.state.cards['f2'] && store.state.cards['f2'].reps === 1, 'load() does not re-reset after ankiReset2026 stamped');

// importJSON migration
var backupWithoutMigration = JSON.stringify({
  xp: 100,
  today: { date: '2026-09-01' },
  cards: { f1: { reps: 5 } },
  cardReviews: [{ d: '2026-09-01' }],
  attempts: [{ qid: 'q2' }],
  migrations: {}
});
store.importJSON(backupWithoutMigration);
assert(Object.keys(store.state.cards).length === 0, 'importJSON() resets cards when ankiReset2026 missing');
assert(typeof store.state.migrations.ankiReset2026 === 'string', 'importJSON() stamps ankiReset2026');
assert(store.state.attempts.length === 1 && store.state.attempts[0].qid === 'q2', 'importJSON() preserves attempts');
console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
