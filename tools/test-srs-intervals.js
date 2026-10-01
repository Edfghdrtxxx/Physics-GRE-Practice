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
assert(store.state.migrations.easy10 === '2026-09-01T00:00:00.000Z',
  'reset leaves easy10 satisfied (was: flag deleted, re-arming the migration)');
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

function stampMigrations() {
  store.state.migrations.ankiReset2026 = 'x';
  store.state.migrations.planRebuild2026 = 'x';
  if (!store.state.migrations.easy10) store.state.migrations.easy10 = 'x';
}

console.log('\nS1 refused gradeCard returns null and changes nothing');
resetStore();
stampMigrations();
store.state.cards['toy-a'] = {
  reps: 2, lapses: 0, interval: 4, ease: 2.5, due: srs.today(), reviews: 5, lastGrade: 'good'
};
store.state.formulaDay = { date: srs.today(), reviewIds: ['toy-a'], newIds: [], softIds: ['toy-a'] };
store.state.cardReviews = [{ d: srs.today(), id: 'toy-a', g: 'good', ivl: 1, m: 0, n: 1 }];
var beforeCard = JSON.stringify(store.state.cards['toy-a']);
var beforeLog = store.state.cardReviews.length;
var beforeSoft = store.state.formulaDay.softIds.slice();
store._persistFailed = true;
var refused = srs.gradeCard('toy-a', 'good');
assert(refused === null, 'refused gradeCard returns null');
assert(JSON.stringify(store.state.cards['toy-a']) === beforeCard, 'refused grade leaves the card unchanged');
assert(store.state.cardReviews.length === beforeLog, 'refused grade appends no review row');
assert(JSON.stringify(store.state.formulaDay.softIds) === JSON.stringify(beforeSoft),
  'refused grade leaves softIds unchanged');
store._persistFailed = false;

console.log('\nS11 a committed grade consumes the soft pin');
resetStore();
stampMigrations();
store.state.cards.pin = {
  reps: 2, lapses: 0, interval: 10, ease: 2.5, due: srs.addDays(20), reviews: 4,
  lastReviewedDay: '2020-01-01', lastGrade: 'good'
};
store.state.formulaDay = {
  date: srs.today(), reviewIds: ['pin'], newIds: [], softIds: ['pin', 'other']
};
var pinned = srs.gradeCard('pin', 'good');
assert(pinned && typeof pinned.lastReviewOpId === 'string' && pinned.lastReviewOpId,
  'accepted grade carries lastReviewOpId');
assert(!store.state.formulaDay.softIds || store.state.formulaDay.softIds.indexOf('pin') === -1,
  'accepted grade removes that id from softIds');
assert(store.state.formulaDay.softIds && store.state.formulaDay.softIds.indexOf('other') !== -1,
  'a different pin is left in place');
assert(store.state.cardReviews[store.state.cardReviews.length - 1].op === pinned.lastReviewOpId,
  'the review log row carries the same op');
pinned.lastReviewedDay = '2020-01-02';
sandbox.PGRE.formulaDeckStatus = {
  partial: false, complete: true, missing: [],
  sources: { bookFormulas: 'present', formulas: 'present', bookLists: 'present', indexedDB: 'empty' }
};
var overnight = srs.formulaDayRemaining([{ id: 'pin' }]).map(function (c) { return c.id; });
assert(overnight.indexOf('pin') === -1,
  'a pin consumed on the grade day is not owed on a later day');

console.log('\nS4 undo names the op and will not erase a newer grade');
resetStore();
stampMigrations();
var graded = srs.gradeCard('toy-a', 'good');
var opNew = graded.lastReviewOpId;
var diskGrade = JSON.parse(JSON.stringify(store.state));
var undone = srs.undoReview(opNew);
assert(undone && undone.ok === true && undone.card === null,
  'undoReview of the latest op returns ok and a null card when the grade created it');
assert(!store.state.cards['toy-a'], 'undo removes a card the grade created');
store._mergeFromDisk(diskGrade);
assert(!store.state.cards['toy-a'], 'a sibling copy of the undone grade does not come back');
assert(!store.state.cardReviews.some(function (r) { return r && r.op === opNew; }),
  'the undone op is not resurrected in the review log');
var first = srs.gradeCard('toy-b', 'good');
var opFirst = first.lastReviewOpId;
var second = srs.gradeCard('toy-b', 'again');
assert(srs.undoReview(opFirst) === null, 'undoReview refuses an op a later grade superseded');
assert(store.state.cards['toy-b'].lastGrade === 'again', 'the newer Again is still the card');
assert(store.state.cards['toy-b'].lastReviewOpId === second.lastReviewOpId,
  'the newer op is still lastReviewOpId');

console.log('\nS6 reset does not re-arm easy10, and current-scheme cards are not stretched');
resetStore({ examDate: daysFromNow(40) });
stampMigrations();
store.state.migrations.easy10 = '2026-09-01T00:00:00.000Z';
store.resetFormulaCards();
assert(store.state.migrations.easy10 === '2026-09-01T00:00:00.000Z',
  'resetFormulaCards keeps an existing easy10 stamp');
var easy = srs.gradeCard('fresh', 'easy');
assert(easy.interval === 4, 'a new Easy outside final pass is 4 days');
assert(easy.scheme === 'current', 'gradeCard marks the card as the current scheme');
var due4 = easy.due;
store.state.migrations.ankiReset2026 = 'x';
store.state.migrations.planRebuild2026 = 'x';
store.save();
store.load();
assert(store.state.cards.fresh.interval === 4, 'reload does not stretch a current-scheme Easy to 10');
assert(store.state.cards.fresh.due === due4, 'reload keeps the 4-day due date');
delete store.state.migrations.easy10;
srs.migrateEasy10();
assert(store.state.cards.fresh.interval === 4,
  'migrateEasy10 does not stretch a card graded under the current scheme');
assert(store.state.migrations.easy10, 'migrateEasy10 still stamps the flag when it was absent');
store.state.cards.legacy = {
  reps: 1, lapses: 0, interval: 4, ease: 2.5, reviews: 1, lastGrade: 'easy',
  lastReviewedDay: '2026-09-01', due: '2026-09-05'
};
delete store.state.migrations.easy10;
srs.migrateEasy10();
assert(store.state.cards.legacy.interval === 10, 'a legacy Easy without scheme is still migrated once');
assert(store.state.cards.fresh.interval === 4, 'the current-scheme Easy stays 4 while a legacy card is migrated');
store.state.cards.currentNoScheme = {
  reps: 1, lapses: 0, interval: 4, ease: 2.5, reviews: 1, lastGrade: 'easy',
  lastReviewedDay: '2026-10-01', due: '2026-10-05'
};
store.state.cards.finalNoScheme = {
  reps: 1, lapses: 0, interval: 1, ease: 2.5, reviews: 1, lastGrade: 'easy',
  lastReviewedDay: '2026-09-07', due: '2026-09-08'
};
delete store.state.migrations.easy10;
srs.migrateEasy10();
assert(store.state.cards.currentNoScheme.interval === 4 &&
  store.state.cards.currentNoScheme.due === '2026-10-05',
  'an Easy reviewed on 2026-10-01 is not stretched when scheme is missing');
assert(store.state.cards.finalNoScheme.interval === 1 &&
  store.state.cards.finalNoScheme.due === '2026-09-08',
  'a final-pass Easy reviewed on 2026-09-07 is not stretched when scheme is missing');
resetStore({ examDate: daysFromNow(1) });
stampMigrations();
var finalEasy = srs.gradeCard('final-easy', 'easy');
assert(finalEasy.interval === 1, 'final-pass Easy is 1 day');
var dueFinal = finalEasy.due;
store.save();
store.load();
assert(store.state.cards['final-easy'].interval === 1, 'reload does not stretch a final-pass Easy to 10');
assert(store.state.cards['final-easy'].due === dueFinal, 'reload keeps the final-pass due date');

console.log('\nS8 import repairs a missing due and a malformed batch without throwing');
resetStore();
stampMigrations();
store.save();
var shell = JSON.parse(store.exportJSON());
shell.migrations = { ankiReset2026: 'x', planRebuild2026: 'x', easy10: 'x' };
shell.cards = {
  'toy-a': { reps: 2, reviews: 2, interval: 5, ease: 2.5, lapses: 0 }
};
shell.formulaDay = { date: srs.today(), reviewIds: null, newIds: ['toy-b'] };
var threw = false;
try { store.importJSON(JSON.stringify(shell)); } catch (eImp) { threw = eImp; }
assert(!threw, 'import of a batch with null reviewIds does not throw');
assert(typeof store.state.cards['toy-a'].due === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(store.state.cards['toy-a'].due),
  'a card with no due is repaired to a date');
assert(srs.cardDue('toy-a') === true, 'the repaired card is due instead of invisible');
var sugFixed = srs.suggestFormulaDay([{ id: 'toy-a' }, { id: 'toy-b' }, { id: 'toy-c' }]);
assert(sugFixed.reviewIds.indexOf('toy-a') !== -1, 'the repaired card is offered as a due review');
var remThrew = false;
try { srs.formulaDayRemaining([{ id: 'toy-b' }]); } catch (eRem) { remThrew = true; }
assert(!remThrew, 'formulaDayRemaining does not throw on the repaired batch');
assert(Array.isArray(store.state.formulaDay.reviewIds), 'null reviewIds was replaced with an array');

shell.formulaDay = { date: srs.today(), reviewIds: 'not-an-array', newIds: [], softIds: { bad: true } };
shell.cards = {};
threw = false;
try { store.importJSON(JSON.stringify(shell)); } catch (eImp2) { threw = true; }
assert(!threw, 'import of a string reviewIds does not throw');
remThrew = false;
try { srs.formulaDayRemaining([{ id: 'toy-b' }]); } catch (eRem2) { remThrew = true; }
assert(!remThrew, 'formulaDayRemaining does not throw after a string reviewIds import');
assert(Array.isArray(store.state.formulaDay.reviewIds) && store.state.formulaDay.reviewIds.length === 0,
  'a non-array reviewIds becomes an empty id list');

console.log('\nF7 duplicate daily ids collapse to one occurrence');
shell.cards = {
  same: { reps: 1, reviews: 1, interval: 1, ease: 2.5, lapses: 0, due: srs.today(), lastGrade: 'good' }
};
shell.formulaDay = {
  date: srs.today(), reviewIds: ['same'], newIds: ['same', 'same'], softIds: ['same', 'same', 'nope']
};
store.importJSON(JSON.stringify(shell));
function idCount(list, id) {
  return (list || []).filter(function (x) { return x === id; }).length;
}
var dayBatch = store.state.formulaDay;
assert(idCount(dayBatch.reviewIds, 'same') === 1, 'a duplicated id is kept once on the review list when it has state');
assert(idCount(dayBatch.newIds, 'same') === 0, 'the same id is not also left on the new list');
assert(idCount(dayBatch.softIds, 'same') <= 1, 'softIds keeps the duplicated pin at most once');
assert(!dayBatch.softIds || dayBatch.softIds.indexOf('nope') === -1,
  'a soft pin for an id outside the batch is dropped');
shell.cards = {};
shell.formulaDay = { date: srs.today(), reviewIds: ['same'], newIds: ['same', 'same'] };
store.importJSON(JSON.stringify(shell));
dayBatch = store.state.formulaDay;
assert(idCount(dayBatch.reviewIds, 'same') === 0 && idCount(dayBatch.newIds, 'same') === 1,
  'a duplicated id with no card state is kept once on the new list');

console.log('\nA1 a grade does not replace a sibling add, and the pin stays consumed');
resetStore();
stampMigrations();
store.state.cards.pin = {
  reps: 2, lapses: 0, interval: 10, ease: 2.5, due: srs.addDays(30), reviews: 4,
  lastReviewedDay: '2020-01-01', lastGrade: 'good'
};
store.state.formulaDay = {
  date: srs.today(), reviewIds: ['pin'], newIds: [], softIds: ['pin'],
  _opAt: 1000, _opId: 'batch-a', _opKind: 'add'
};
store.save();
var siblingAdd = JSON.parse(localStorage.getItem(store.KEY));
siblingAdd.formulaDay = {
  date: srs.today(), reviewIds: ['pin', 'extra'], newIds: ['fresh-add'], softIds: ['pin'],
  _opAt: 2000, _opId: 'batch-b', _opKind: 'add'
};
siblingAdd._rev = (store.state._rev || 0) + 1;
localStorage.setItem(store.KEY, JSON.stringify(siblingAdd));
srs.gradeCard('pin', 'good');
store.save();
var mergedBatch = JSON.parse(localStorage.getItem(store.KEY)).formulaDay;
assert(mergedBatch.reviewIds.indexOf('extra') !== -1, 'a missed-event add stays in the batch after the grade');
assert(mergedBatch.newIds.indexOf('fresh-add') !== -1, 'a missed-event new id stays in the batch after the grade');
assert(!mergedBatch.softIds || mergedBatch.softIds.indexOf('pin') === -1,
  'the consumed pin does not come back from the stale batch');
assert(mergedBatch._opKind !== 'soft-consume', 'the grade does not restamp the batch');
store.state.cards.pin.lastReviewedDay = '2020-01-01';
var repinned = srs.addFormulaDaySoft([{ id: 'pin' }, { id: 'extra' }, { id: 'fresh-add' }], ['pin']);
assert(repinned.batch.softIds && repinned.batch.softIds.indexOf('pin') !== -1,
  'addFormulaDaySoft can pin that id again after the grade');
store.save();
var repinDisk = JSON.parse(localStorage.getItem(store.KEY)).formulaDay;
assert(repinDisk.softIds && repinDisk.softIds.indexOf('pin') !== -1,
  'the later pin survives a merge against the consume fact');
assert(repinDisk.reviewIds.indexOf('extra') !== -1, 'the re-pin keeps the sibling id');

console.log('\nA2 shipped undo still shows a saved soft pin');
resetStore();
stampMigrations();
store.state.cards.pin = {
  reps: 2, lapses: 0, interval: 10, ease: 2.5, due: '2026-11-20', reviews: 4,
  lastReviewedDay: '2020-01-01', lastGrade: 'good'
};
store.state.cards.studied = {
  reps: 1, lapses: 0, interval: 5, ease: 2.5, due: srs.addDays(5), reviews: 1,
  lastReviewedDay: srs.today(), lastGrade: 'good'
};
store.state.formulaDay = {
  date: srs.today(), reviewIds: ['pin', 'studied'], newIds: [], softIds: ['pin', 'studied']
};
store.state.cardReviews = [];
assert(!store.state.cards.pin.softHold, 'the saved pin starts with no hold field');
assert(store.normalizeRecallState() === true, 'normalize stamps a hold for the saved pin');
assert(store.state.cards.pin.softHold === true, 'the pin not studied today receives the hold');
assert(!store.state.cards.studied.softHold, 'normalize does not stamp a card already studied today');
var preGrade = JSON.parse(JSON.stringify(store.state.cards.pin));
srs.gradeCard('pin', 'good');
assert(!store.state.cards.pin.softHold, 'gradeCard clears the hold only on the card it commits');
assert(preGrade.softHold === true, 'the pre-grade snapshot still has the hold');
store.state.cards.pin = preGrade;
var gradeDay = srs.today();
var reviewLog = store.state.cardReviews;
for (var ui = reviewLog.length - 1; ui >= 0; ui--) {
  if (reviewLog[ui] && reviewLog[ui].id === 'pin' && reviewLog[ui].d === gradeDay) {
    reviewLog.splice(ui, 1);
    break;
  }
}
store.save();
sandbox.PGRE.formulaDeckStatus = {
  partial: false, complete: true, missing: [],
  sources: { bookFormulas: 'present', formulas: 'present', bookLists: 'present', indexedDB: 'empty' }
};
var owedAfterUndo = srs.formulaDayRemaining([{ id: 'pin' }]).map(function (c) { return c.id; });
assert(owedAfterUndo.indexOf('pin') !== -1,
  'restoring the snapshot and popping the log row keeps the pin in formulaDayRemaining');
store.state.cards.studied.softHold = true;
store.state.formulaDay = {
  date: srs.today(), reviewIds: ['studied'], newIds: [], softIds: ['studied']
};
srs.formulaDay([{ id: 'studied' }]);
assert(!store.state.cards.studied.softHold, 'the studied-today filter clears the hold');
assert(!store.state.formulaDay.softIds || store.state.formulaDay.softIds.indexOf('studied') === -1,
  'the studied-today filter drops that pin');

console.log('\nA3 chained undos rewind a sibling that still has both grades');
resetStore();
stampMigrations();
store.state.cards.chain = {
  reps: 5, lapses: 0, interval: 10, ease: 2.5, reviews: 5, lastGrade: 'good',
  due: '2026-10-11', lastReviewedAt: '2026-09-01T00:00:00.000Z'
};
var chainGood = srs.gradeCard('chain', 'good');
var opChainGood = chainGood.lastReviewOpId;
var chainAgain = srs.gradeCard('chain', 'again');
var opChainAgain = chainAgain.lastReviewOpId;
var siblingGrades = JSON.parse(JSON.stringify(store.state));
var undoAgain = srs.undoReview(opChainAgain);
var undoGood = srs.undoReview(opChainGood);
assert(undoAgain && undoAgain.ok === true, 'undo of Again is accepted');
assert(undoGood && undoGood.ok === true, 'undo of the earlier Good is accepted');
assert(store.state.cards.chain.reviews === 5 && store.state.cards.chain.due === '2026-10-11',
  'both undos restore the pre-grade card locally');
store._mergeFromDisk(siblingGrades);
assert(store.state.cards.chain && store.state.cards.chain.reviews === 5,
  'the sibling copy rewinds past the intermediate Good');
assert(store.state.cards.chain.due === '2026-10-11',
  'the sibling copy keeps the pre-grade due');

console.log('\nA5 final pass keeps a prototype-name id');
resetStore({ examDate: daysFromNow(3) });
stampMigrations();
store.state.cards['constructor'] = {
  reps: 1, lapses: 0, interval: 4, ease: 2.5, due: srs.today(), reviews: 1, lastGrade: 'good'
};
store.state.cards.keep = {
  reps: 1, lapses: 0, interval: 4, ease: 2.5, due: srs.today(), reviews: 1, lastGrade: 'good'
};
store.state.formulaDay = { date: srs.today(), reviewIds: [], newIds: [] };
sandbox.PGRE.formulaDeckStatus = {
  partial: false, complete: true, missing: [],
  sources: { bookFormulas: 'present', formulas: 'present', bookLists: 'present', indexedDB: 'empty' }
};
var finalBatch = srs.fillFormulaDayFinalPass([{ id: 'constructor' }, { id: 'keep' }]);
assert(finalBatch.reviewIds.indexOf('keep') !== -1, 'final pass still appends an ordinary learned card');
assert(finalBatch.reviewIds.indexOf('constructor') !== -1,
  'final pass appends a learned card whose id is constructor');

function completeDeck() {
  sandbox.PGRE.formulaDeckStatus = {
    partial: false, complete: true, missing: [],
    sources: { bookFormulas: 'present', formulas: 'present', bookLists: 'present', indexedDB: 'empty' }
  };
}
function pinFactAt(id, action) {
  var facts = store.state.formulaPinFacts || {};
  var best = 0;
  for (var op in facts) {
    if (!Object.prototype.hasOwnProperty.call(facts, op)) continue;
    var fact = facts[op];
    if (!fact || fact.id !== id || fact.action !== action) continue;
    var at = Number(fact.at) || 0;
    if (at >= best) best = at;
  }
  return best;
}

console.log('\nB1 picker Save re-pins a consumed id, and a later stale batch does not');
resetStore();
stampMigrations();
completeDeck();
store.state.cards.pin = {
  reps: 2, lapses: 0, interval: 10, ease: 2.5, due: srs.addDays(30), reviews: 4,
  lastReviewedDay: '2020-01-01', lastGrade: 'good'
};
store.state.formulaDay = {
  date: srs.today(), reviewIds: ['pin'], newIds: [], softIds: ['pin'],
  _opAt: 1000, _opId: 'b1-a', _opKind: 'add'
};
store.save();
srs.gradeCard('pin', 'good');
store.save();
var staleLater = JSON.parse(localStorage.getItem(store.KEY));
staleLater.formulaDay = {
  date: srs.today(), reviewIds: ['pin', 'later'], newIds: [], softIds: ['pin'],
  _opAt: 9000, _opId: 'stale-later', _opKind: 'add'
};
staleLater._rev = (store.state._rev || 0) + 1;
localStorage.setItem(store.KEY, JSON.stringify(staleLater));
store.save();
assert(store.state.formulaDay.reviewIds.indexOf('later') !== -1,
  'a later stale batch keeps its new id');
assert(!store.state.formulaDay.softIds || store.state.formulaDay.softIds.indexOf('pin') === -1,
  'a later stale batch does not resurrect the consumed pin');

resetStore();
stampMigrations();
completeDeck();
store.state.cards.pin = {
  reps: 2, lapses: 0, interval: 10, ease: 2.5, due: srs.addDays(30), reviews: 4,
  lastReviewedDay: '2020-01-01', lastGrade: 'good'
};
store.state.formulaDay = {
  date: srs.today(), reviewIds: ['pin'], newIds: [], softIds: ['pin'],
  _opAt: 1000, _opId: 'b1-b', _opKind: 'add'
};
store.save();
srs.gradeCard('pin', 'good');
var gradedSnap = JSON.parse(JSON.stringify(store.state));
store.state.cards.pin.lastReviewedDay = '2020-01-01';
var pickedPin = srs.setFormulaDayPicks([{ id: 'pin' }], ['pin']);
assert(pickedPin.softIds && pickedPin.softIds.indexOf('pin') !== -1,
  'picker Save puts the consumed id back in softIds');
assert(pinFactAt('pin', 'restored') > pinFactAt('pin', 'consumed'),
  'picker Save records a restored fact later than the consume');
gradedSnap._rev = (store.state._rev || 0) + 1;
localStorage.setItem(store.KEY, JSON.stringify(gradedSnap));
store.save();
var owedPick = srs.formulaDayRemaining([{ id: 'pin' }]).map(function (c) { return c.id; });
assert(owedPick.indexOf('pin') !== -1,
  'a merge of the pre-pick snapshot still owes the re-pinned card');

console.log('\nB2 taking a card off today clears its soft hold');
function b2Pin() {
  resetStore({ examDate: daysFromNow(3) });
  stampMigrations();
  completeDeck();
  store.state.cards.pin = {
    reps: 2, lapses: 0, interval: 10, ease: 2.5, due: '2026-11-20', reviews: 4,
    lastReviewedDay: '2020-01-01', lastGrade: 'good'
  };
  store.state.cards.other = {
    reps: 1, lapses: 0, interval: 4, ease: 2.5, due: srs.today(), reviews: 1,
    lastGrade: 'good'
  };
  return [{ id: 'pin' }, { id: 'other' }];
}
var deckHold = b2Pin();
srs.addFormulaDaySoft(deckHold, ['pin']);
assert(store.state.cards.pin.softHold === true, 'the pinned card starts with a hold');
srs.setFormulaDayPicks(deckHold, ['pin', 'other']);
assert(store.state.cards.pin.softHold === true, 'a pin that stays in the batch keeps its hold');

deckHold = b2Pin();
srs.addFormulaDaySoft(deckHold, ['pin']);
srs.setFormulaDayPicks(deckHold, ['other']);
assert(!store.state.cards.pin.softHold, 'unchecking the pin clears its hold');
assert(srs.finalPassActive(), 'an exam three days out is the final pass');
srs.fillFormulaDayFinalPass(deckHold);
store.state.settings.examDate = '2027-06-01';
assert(!srs.finalPassActive(), 'a far exam turns the final pass off');
var owedUnchecked = srs.formulaDayRemaining(deckHold).map(function (c) { return c.id; });
assert(owedUnchecked.indexOf('pin') === -1,
  'after the final pass ends the unchecked pin is not owed');

deckHold = b2Pin();
srs.addFormulaDaySoft(deckHold, ['pin']);
srs.removeFormulaDaySoft(deckHold, ['pin']);
assert(!store.state.cards.pin.softHold, 'removeFormulaDaySoft clears the hold on the id it drops');
srs.fillFormulaDayFinalPass(deckHold);
store.state.settings.examDate = '2027-06-01';
var owedRemoved = srs.formulaDayRemaining(deckHold).map(function (c) { return c.id; });
assert(owedRemoved.indexOf('pin') === -1,
  'after the final pass ends a removed pin is not owed');

function latestPin(id) {
  var consumedAt = pinFactAt(id, 'consumed');
  var restoredAt = pinFactAt(id, 'restored');
  if (!consumedAt && !restoredAt) return null;
  return restoredAt > consumedAt ? 'restored' : 'consumed';
}
function listed(batch, id) {
  if (!batch) return false;
  if (batch.reviewIds && batch.reviewIds.indexOf(id) !== -1) return true;
  if (batch.newIds && batch.newIds.indexOf(id) !== -1) return true;
  return false;
}
function softListed(batch, id) {
  return !!(batch && batch.softIds && batch.softIds.indexOf(id) !== -1);
}
function owedHas(deck, id) {
  return srs.formulaDayRemaining(deck).map(function (c) { return c.id; }).indexOf(id) !== -1;
}
function futureCard(id, due) {
  store.state.cards[id] = {
    reps: 2, lapses: 0, interval: 10, ease: 2.5, due: due || '2026-11-20', reviews: 4,
    lastReviewedDay: '2020-01-01', lastGrade: 'good'
  };
}

console.log('\nC unchecking a re-pinned card consumes the pin across a merge');
function cMerge(deck) {
  var copy = JSON.parse(JSON.stringify(store.state));
  copy._rev = (store.state._rev || 0) + 1;
  store._mergeFromDisk(copy);
  assert(!softListed(store.state.formulaDay, 'pin'),
    'the merge does not soft-pin the removed card during the final week');
  assert(owedHas(deck, 'pin'), 'final pass still owes the removed card while the week is on');
  store.state.settings.examDate = '2027-06-01';
  assert(!srs.finalPassActive(), 'moving the exam to 2027-06-01 ends the final pass');
  assert(!owedHas(deck, 'pin'), 'after the week the removed card is not owed');
  assert(!softListed(store.state.formulaDay, 'pin'),
    'after the week the removed card is not soft-pinned');
}
resetStore();
stampMigrations();
completeDeck();
futureCard('pin');
store.state.cards.other = {
  reps: 1, lapses: 0, interval: 4, ease: 2.5, due: srs.today(), reviews: 1, lastGrade: 'good'
};
store.state.cards.keep = {
  reps: 2, lapses: 0, interval: 10, ease: 2.5, due: '2026-11-20', reviews: 3,
  lastReviewedDay: '2020-01-01', lastGrade: 'good'
};
var deckC = [{ id: 'pin' }, { id: 'other' }, { id: 'keep' }];
store.state.formulaDay = {
  date: srs.today(), reviewIds: ['pin'], newIds: [], softIds: ['pin'],
  _opAt: 1000, _opId: 'c-grade', _opKind: 'add'
};
srs.gradeCard('pin', 'good');
store.state.cards.pin.lastReviewedDay = '2020-01-01';
srs.setFormulaDayPicks(deckC, ['pin', 'keep']);
assert(latestPin('pin') === 'restored', 'picker Save of the graded card records restored');
assert(store.state.cards.pin.softHold === true, 'picker Save stamps a hold on the pin it keeps');
assert(latestPin('keep') === null, 'a first pin that stays has no pin fact');
srs.setFormulaDayPicks(deckC, ['other', 'keep']);
assert(latestPin('pin') === 'consumed', 'unchecking the restored pin records consumed');
assert(latestPin('keep') === null, 'a pin that stays is not given a consumed fact');
assert(store.state.cards.keep.softHold === true, 'a pin that stays keeps its hold');
assert(!store.state.cards.pin.softHold, 'unchecking the restored pin clears its hold');
assert(!listed(store.state.formulaDay, 'pin'), 'the unchecked pin leaves the batch');
store.state.settings.examDate = daysFromNow(3);
assert(srs.finalPassActive(), 'the merge sequence starts with final pass on');
srs.fillFormulaDayFinalPass(deckC);
cMerge(deckC);

resetStore();
stampMigrations();
completeDeck();
futureCard('pin');
var deckRemove = [{ id: 'pin' }];
store.state.formulaDay = {
  date: srs.today(), reviewIds: ['pin'], newIds: [], softIds: ['pin'],
  _opAt: 1000, _opId: 'c-remove', _opKind: 'add'
};
srs.gradeCard('pin', 'good');
store.state.cards.pin.lastReviewedDay = '2020-01-01';
srs.setFormulaDayPicks(deckRemove, ['pin']);
srs.removeFormulaDaySoft(deckRemove, ['pin']);
assert(latestPin('pin') === 'consumed', 'removeFormulaDaySoft records consumed for a restored pin');
assert(!store.state.cards.pin.softHold, 'removeFormulaDaySoft still clears the hold');
assert(!listed(store.state.formulaDay, 'pin'), 'removeFormulaDaySoft takes the restored pin off the batch');
store.state.settings.examDate = daysFromNow(3);
srs.fillFormulaDayFinalPass(deckRemove);
cMerge(deckRemove);

console.log('\nT soft pin, pin fact, and hold transitions');
function tRow(name, deck, id, exp) {
  srs.formulaDay(deck);
  var batch = store.state.formulaDay;
  var card = store.state.cards[id];
  var got = [
    listed(batch, id) ? 1 : 0,
    softListed(batch, id) ? 1 : 0,
    card && card.softHold ? 1 : 0,
    latestPin(id) || '-',
    owedHas(deck, id) ? 1 : 0
  ].join(' ');
  assert(got === exp, name + ' [' + got + ']');
}
resetStore();
stampMigrations();
completeDeck();
futureCard('pin');
futureCard('stay');
var deckT = [{ id: 'pin' }, { id: 'stay' }];
// batch soft hold fact owed
var transitions = [
  function () {
    srs.addFormulaDaySoft(deckT, ['pin']);
    tRow('add first pin', deckT, 'pin', '1 1 1 - 1');
  },
  function () {
    srs.gradeCard('pin', 'good');
    tRow('grade consumes the pin and clears the live hold', deckT, 'pin', '1 0 0 consumed 0');
  },
  function () {
    var op = store.state.cards.pin.lastReviewOpId;
    var undone = srs.undoReview(op);
    assert(undone && undone.ok === true, 'undoReview of that grade is accepted');
    tRow('undoReview restores the pin and the hold', deckT, 'pin', '1 1 1 restored 1');
  },
  function () {
    srs.gradeCard('pin', 'good');
    store.state.cards.pin.lastReviewedDay = '2020-01-01';
    srs.addFormulaDaySoft(deckT, ['pin', 'stay']);
    tRow('add after a consume records restored and a hold', deckT, 'pin', '1 1 1 restored 1');
    tRow('a first pin added beside it has a hold and no fact', deckT, 'stay', '1 1 1 - 1');
  },
  function () {
    srs.setFormulaDayPicks(deckT, ['pin', 'stay']);
    tRow('picker keeps a restored pin', deckT, 'pin', '1 1 1 restored 1');
    tRow('picker keeps the other pin', deckT, 'stay', '1 1 1 - 1');
  },
  function () {
    srs.removeFormulaDaySoft(deckT, ['pin']);
    tRow('remove of a restored pin consumes it', deckT, 'pin', '0 0 0 consumed 0');
    tRow('remove of one pin leaves the other', deckT, 'stay', '1 1 1 - 1');
  },
  function () {
    store.state.cards.pin.lastReviewedDay = '2020-01-01';
    srs.setFormulaDayPicks(deckT, ['pin', 'stay']);
    tRow('picker re-pin of a consumed id restores it and stamps a hold', deckT, 'pin', '1 1 1 restored 1');
  },
  function () {
    var pre = JSON.parse(JSON.stringify(store.state.cards.pin));
    srs.gradeCard('pin', 'good');
    store.state.cards.pin = pre;
    var log = store.state.cardReviews;
    for (var i = log.length - 1; i >= 0; i--) {
      if (log[i] && log[i].id === 'pin') { log.splice(i, 1); break; }
    }
    store.save();
    tRow('shipped undo after a picker pin still owes the card', deckT, 'pin', '1 1 1 restored 1');
  },
  function () {
    srs.setFormulaDayPicks(deckT, ['stay']);
    tRow('picker uncheck consumes the restored pin', deckT, 'pin', '0 0 0 consumed 0');
    tRow('picker uncheck does not consume the pin that stays', deckT, 'stay', '1 1 1 - 1');
  },
  function () {
    store.state.settings.examDate = daysFromNow(3);
    srs.fillFormulaDayFinalPass(deckT);
    tRow('final pass appends the consumed card without soft-pinning it', deckT, 'pin', '1 0 0 consumed 1');
  },
  function () {
    var stale = JSON.parse(JSON.stringify(store.state));
    stale.formulaDay = {
      date: srs.today(),
      reviewIds: ['pin', 'later'],
      newIds: [],
      softIds: ['pin'],
      _opAt: (Number(store.state.formulaDay._opAt) || 0) + 5000,
      _opId: 't-stale-newer',
      _opKind: 'add'
    };
    stale._rev = (store.state._rev || 0) + 1;
    store._mergeFromDisk(stale);
    assert(listed(store.state.formulaDay, 'later'), 'a newer stale batch keeps its extra id');
    tRow('a newer stale batch does not restore a consumed pin', deckT, 'pin', '1 0 0 consumed 1');
  },
  function () {
    store.state.settings.examDate = '2027-06-01';
    tRow('after the week the consumed card is not owed', deckT, 'pin', '0 0 0 consumed 0');
    tRow('a newer batch that dropped the other pin cleared its hold', deckT, 'stay', '0 0 0 - 0');
  }
];
for (var ti = 0; ti < transitions.length; ti++) transitions[ti]();

console.log('\nS put away consumes a restored pin across a merge');
function armPin(deck) {
  futureCard('pin');
  store.state.formulaDay = {
    date: srs.today(), reviewIds: ['pin'], newIds: [], softIds: ['pin'],
    _opAt: 1000, _opId: 's-arm', _opKind: 'add'
  };
  srs.gradeCard('pin', 'good');
  store.state.cards.pin.lastReviewedDay = '2020-01-01';
  srs.setFormulaDayPicks(deck, ['pin']);
}
resetStore();
stampMigrations();
completeDeck();
futureCard('keep');
var deckS = [{ id: 'pin' }, { id: 'keep' }];
armPin(deckS);
assert(latestPin('pin') === 'restored', 'the suspend sequence starts from a restored pin');
assert(store.state.cards.pin.softHold === true, 'the suspend sequence starts with a hold');
var suspendOpAt = store.state.formulaDay._opAt;
var suspendOpId = store.state.formulaDay._opId;
srs.suspendCard('pin');
assert(latestPin('pin') === 'consumed', 'suspendCard records consumed for a restored pin');
assert(!store.state.cards.pin.softHold, 'suspendCard clears the hold');
assert(!listed(store.state.formulaDay, 'pin'), 'suspendCard takes the pin off the batch');
assert(!softListed(store.state.formulaDay, 'pin'), 'suspendCard takes the pin out of softIds');
assert(store.state.formulaDay._opAt === suspendOpAt && store.state.formulaDay._opId === suspendOpId,
  'suspendCard does not stamp the batch');
assert(srs.isSuspended('pin'), 'suspendCard still marks the card suspended');
srs.unsuspendCard('pin');
assert(!srs.isSuspended('pin'), 'unsuspendCard clears the suspended flag');
assert(latestPin('pin') === 'consumed', 'unsuspend does not restore the pin fact');
assert(!listed(store.state.formulaDay, 'pin'), 'unsuspend does not put the card back on today');
store.state.settings.examDate = daysFromNow(3);
assert(srs.finalPassActive(), 'the suspend merge starts with final pass on');
srs.fillFormulaDayFinalPass(deckS);
cMerge(deckS);

resetStore();
stampMigrations();
completeDeck();
futureCard('pin');
var deckFirst = [{ id: 'pin' }];
srs.setFormulaDayPicks(deckFirst, ['pin']);
assert(latestPin('pin') === null, 'a first pin still has no fact before suspend');
srs.suspendCard('pin');
assert(latestPin('pin') === null, 'suspend of a first pin records no fact');
assert(!store.state.cards.pin.softHold, 'suspend of a first pin still clears the hold');
srs.unsuspendCard('pin');
store.state.settings.examDate = daysFromNow(3);
srs.fillFormulaDayFinalPass(deckFirst);
assert(owedHas(deckFirst, 'pin'), 'final pass still owes the unsuspended first pin while the week is on');
assert(!softListed(store.state.formulaDay, 'pin'), 'a first pin is not soft-pinned by final pass');
var firstCopy = JSON.parse(JSON.stringify(store.state));
firstCopy._rev = (store.state._rev || 0) + 1;
store._mergeFromDisk(firstCopy);
assert(!softListed(store.state.formulaDay, 'pin'), 'a merge does not soft-pin a first pin');
store.state.settings.examDate = '2027-06-01';
assert(!owedHas(deckFirst, 'pin'), 'after the week a suspended first pin is not owed');
assert(!softListed(store.state.formulaDay, 'pin'), 'after the week a suspended first pin is not soft-pinned');
assert(latestPin('pin') === null, 'the first pin still has no fact after the merge');

resetStore();
stampMigrations();
completeDeck();
futureCard('pin');
store.state.formulaDay = {
  date: srs.today(), reviewIds: ['pin'], newIds: [], softIds: ['pin'],
  _opAt: 1000, _opId: 's-consumed', _opKind: 'add'
};
srs.gradeCard('pin', 'good');
var consumedAt = pinFactAt('pin', 'consumed');
srs.suspendCard('pin');
assert(pinFactAt('pin', 'consumed') === consumedAt,
  'suspend of an already consumed pin does not record another fact');
srs.suspendCard('pin');
assert(pinFactAt('pin', 'consumed') === consumedAt,
  'suspend of an id that is not in the batch records no fact');

resetStore();
stampMigrations();
completeDeck();
armPin([{ id: 'pin' }]);
store.state.formulaDay.reviewIds = [];
store.state.formulaDay.newIds = [];
delete store.state.formulaDay.softIds;
srs.suspendCard('pin');
assert(latestPin('pin') === 'restored',
  'suspend does not consume a restored pin that was already off the batch');

console.log('\nU each drop path records consumed through one helper');
function armRow() {
  resetStore();
  stampMigrations();
  completeDeck();
  futureCard('pin');
  futureCard('stay');
  var deck = [{ id: 'pin' }, { id: 'stay' }];
  store.state.formulaDay = {
    date: srs.today(), reviewIds: ['pin', 'stay'], newIds: [], softIds: ['pin', 'stay'],
    _opAt: 1000, _opId: 'u-arm', _opKind: 'add'
  };
  srs.gradeCard('pin', 'good');
  store.state.cards.pin.lastReviewedDay = '2020-01-01';
  srs.setFormulaDayPicks(deck, ['pin', 'stay']);
  return deck;
}
var deckU = armRow();
srs.setFormulaDayPicks(deckU, ['stay']);
tRow('picker uncheck consumes the restored pin', deckU, 'pin', '0 0 0 consumed 0');
tRow('picker uncheck leaves the pin that stays', deckU, 'stay', '1 1 1 - 1');

deckU = armRow();
srs.removeFormulaDaySoft(deckU, ['pin']);
tRow('removeFormulaDaySoft consumes the restored pin', deckU, 'pin', '0 0 0 consumed 0');
tRow('removeFormulaDaySoft leaves the pin that stays', deckU, 'stay', '1 1 1 - 1');

deckU = armRow();
srs.suspendCard('pin');
tRow('suspendCard consumes the restored pin', deckU, 'pin', '0 0 0 consumed 0');
tRow('suspendCard leaves the pin that stays', deckU, 'stay', '1 1 1 - 1');

deckU = armRow();
srs.gradeCard('pin', 'good');
tRow('grade consumes the restored pin', deckU, 'pin', '1 0 0 consumed 0');
tRow('grade leaves the other pin', deckU, 'stay', '1 1 1 - 1');

deckU = armRow();
delete store.state.cards.pin.softHold;
store.state.formulaDay.softIds = ['stay'];
tRow('reconcile prunes a restored id that lost its pin', deckU, 'pin', '0 0 0 consumed 0');
tRow('reconcile keeps the pin that is still soft', deckU, 'stay', '1 1 1 - 1');

deckU = armRow();
store.state.formulaDay.reviewIds = ['stay'];
store.state.formulaDay.newIds = [];
store.state.formulaDay.softIds = ['stay'];
tRow('reconcile does not consume a restored id the batch already omitted', deckU, 'pin', '0 0 0 restored 0');
tRow('the pin that stayed in that batch is unchanged', deckU, 'stay', '1 1 1 - 1');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
