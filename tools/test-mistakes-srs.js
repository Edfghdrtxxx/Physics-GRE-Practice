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
var gamifySrc = fs.readFileSync(path.join(root, 'js', 'gamify.js'), 'utf8');

var window = { PGRE: {} };
var localStorageMock = {};
var localStorage = {
  getItem: function (k) { return localStorageMock[k] || null; },
  setItem: function (k, v) { localStorageMock[k] = String(v); },
  removeItem: function (k) { delete localStorageMock[k]; }
};
var document = {
  querySelector: function () { return null; },
  getElementById: function () { return null; }
};

var sandbox = {
  window: window,
  PGRE: window.PGRE,
  localStorage: localStorage,
  document: document,
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
vm.runInContext(gamifySrc, sandbox);

var PGRE = sandbox.PGRE;
var store = PGRE.store;
var srs = PGRE.srs;
if (!srs || typeof srs.mistakeMissed !== 'function') {
  console.error('FAIL: shipped srs.js did not export the mistake scheduler');
  process.exit(1);
}
store.load();
PGRE.gamify.checkAchievements = function () {};
PGRE.gamify.checkChallenges = function () {};
PGRE.persistWarning = function () {};

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

console.log('\ntopic filter (additional factor on joined mistake lists)');
resetState();
var prevById = PGRE.questionById;
PGRE.questionById = function (id) {
  var topics = { qcm: 'cm', qem: 'em', qqm: 'qm', qarch: 'cm' };
  return { id: id, topic: topics[id] || 'cm' };
};
mkEntry('qcm'); srs.mistakeMissed(store.state.mistakes.qcm);
store.state.mistakes.qcm.srs.due = daysFromNow(-1);
mkEntry('qem'); srs.mistakeMissed(store.state.mistakes.qem);
store.state.mistakes.qem.srs.due = daysFromNow(4);
mkEntry('qqm'); srs.mistakeMissed(store.state.mistakes.qqm);
mkEntry('qarch', { archivedAt: new Date().toISOString() });
srs.mistakeMissed(store.state.mistakes.qarch);
assert(typeof srs.filterByTopic === 'function', 'srs.filterByTopic is exported');
assert(openIds(srs.filterByTopic(srs.openMistakes(), 'all')).join(',') === 'qcm,qem,qqm',
  'filterByTopic("all") leaves the open book unchanged');
assert(openIds(srs.filterByTopic(srs.openMistakes(), null)).join(',') === 'qcm,qem,qqm',
  'filterByTopic with no topic id leaves the list unchanged');
assert(openIds(srs.filterByTopic(srs.openMistakes(), 'cm')).join(',') === 'qcm',
  'filterByTopic("cm") keeps only Classical Mechanics open entries');
assert(openIds(srs.filterByTopic(srs.openMistakes(), 'em')).join(',') === 'qem',
  'filterByTopic("em") keeps only Electromagnetism open entries');
assert(srs.filterByTopic(srs.openMistakes(), 'sr').length === 0,
  'filterByTopic on a topic with no mistakes is empty');
assert(openIds(srs.filterByTopic(srs.dueMistakes(), 'cm')).join(',') === 'qcm',
  'topic filter stacks on dueMistakes — overdue CM only');
assert(srs.filterByTopic(srs.dueMistakes(), 'em').length === 0,
  'an upcoming EM entry is not due even when the topic matches');
assert(openIds(srs.filterByTopic(srs.archivedMistakes(), 'cm')).join(',') === 'qarch',
  'archived entries of the selected topic still match');
assert(srs.filterByTopic(srs.archivedMistakes(), 'em').length === 0,
  'archived CM is hidden when filtering to EM');
assert(srs.filterByTopic([], 'cm').length === 0,
  'filterByTopic on an empty list stays empty');
assert(srs.openMistakes().length === 3 && srs.dueMistakes().length === 1,
  'openMistakes / dueMistakes stay unfiltered for badges and other callers');
PGRE.questionById = prevById;

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

console.log('\nself-assessment review date');
assert(srs.assessWaitDays(3, {}) === 3 && srs.assessWaitDays(3, { sure: true }) === 3,
  'Knew it and no chip keep a 3-day wait');
assert(srs.assessWaitDays(3, { stuck: true }) === 1 &&
       srs.assessWaitDays(3, { stuck: true, guess: true, slow: true }) === 1 &&
       srs.assessWaitDays(3, { stuck: true, forgot: true }) === 1,
  'Keep failing brings a 3-day wait back to tomorrow, wins over a half, and does not stack with Forgot something');
assert(srs.assessWaitDays(3, { guess: true }) === 2 &&
       srs.assessWaitDays(3, { slow: true }) === 2 &&
       srs.assessWaitDays(3, { guess: true, slow: true }) === 2,
  'Guessed and Too slow halve a 3-day wait once, even together (2 days)');
assert(srs.assessWaitDays(3, { forgot: true }) === 1 &&
       srs.assessWaitDays(3, { forgot: true, guess: true, slow: true }) === 1,
  'Forgot something brings a 3-day wait back to tomorrow and wins over a half');
assert(srs.assessWaitDays(1, { guess: true }) === 1 && srs.assessWaitDays(0, { guess: true }) === 0 &&
       srs.assessWaitDays(2, { slow: true }) === 1 && srs.assessWaitDays(7, { guess: true }) === 4 &&
       srs.assessWaitDays(14, { slow: true }) === 7 && srs.assessWaitDays(30, { guess: true }) === 15 &&
       srs.assessWaitDays(60, { slow: true }) === 30,
  'halving rounds whole days up and never schedules sooner than tomorrow');
assert(srs.assessWaitDays(0, { forgot: true }) === 0 && srs.assessWaitDays(1, { forgot: true }) === 1 &&
       srs.assessWaitDays(14, { forgot: true }) === 1 &&
       srs.assessWaitDays(0, { stuck: true }) === 0 && srs.assessWaitDays(1, { stuck: true }) === 1 &&
       srs.assessWaitDays(14, { stuck: true }) === 1,
  'Forgot something and Keep failing leave an already-due review due and a future one at tomorrow');

resetState();
var graded = mkEntry('qGrade');
srs.mistakeMissed(graded);
srs.mistakeSolved(graded);
var baseDue = graded.srs.due;
var baseStep = graded.srs.step;
srs.noteAssessBase(graded);
assert(graded.srs.baseDue === baseDue && srs.daysUntil(baseDue) === 3 && baseStep === 1,
  'a first correct re-solve is the 3-day base the banner shows');
store.state.attempts.push({ qid: 'qGrade', correct: true, confidence: null });
var xpBefore = store.state.xp;
var attemptsBefore = store.state.attempts.length;
var missesBefore = graded.misses;
var solvesBefore = graded.solves;

srs.applyAssessSchedule('qGrade', { forgot: true });
assert(srs.daysUntil(graded.srs.due) === 1 && graded.srs.step === baseStep,
  'Forgot something stores tomorrow and does not move the ladder step');
assert(graded.misses === missesBefore && graded.solves === solvesBefore &&
       store.state.attempts.length === attemptsBefore && store.state.xp === xpBefore,
  'Forgot something adds no miss, solve, attempt, or XP');
var row = store.state.attempts[0];
srs.setLastAssess('qGrade', null, ['forgot']);
assert(store.state.attempts.length === 1 && store.state.attempts[0] === row &&
       row.tags && row.tags[0] === 'forgot',
  'Forgot something re-stamps the same attempt row');

srs.applyAssessSchedule('qGrade', {});
assert(graded.srs.due === baseDue && graded.srs.step === baseStep,
  'unpicking Forgot something restores the original 3-day date');
assert(graded.misses === missesBefore && graded.solves === solvesBefore &&
       store.state.attempts.length === 1 && store.state.xp === xpBefore,
  'unpicking restores the date without another attempt or XP');

srs.applyAssessSchedule('qGrade', { guess: true });
assert(srs.daysUntil(graded.srs.due) === 2 && graded.srs.step === baseStep,
  'Guessed stores half of the 3-day wait (2 days) on the same rung');
srs.applyAssessSchedule('qGrade', { guess: true, slow: true });
assert(srs.daysUntil(graded.srs.due) === 2,
  'Guessed plus Too slow still halves once');
srs.applyAssessSchedule('qGrade', { guess: true });
assert(srs.daysUntil(graded.srs.due) === 2,
  'applying Guessed again does not halve the already halved date');
srs.applyAssessSchedule('qGrade', { slow: true });
assert(srs.daysUntil(graded.srs.due) === 2 && graded.srs.due !== baseDue,
  'Too slow alone stores the same 2-day wait');
srs.applyAssessSchedule('qGrade', { sure: true });
assert(graded.srs.due === baseDue, 'Knew it restores the original date');
srs.applyAssessSchedule('qGrade', { stuck: true });
assert(srs.daysUntil(graded.srs.due) === 1 && graded.srs.step === baseStep && graded.stuck !== true,
  'Keep failing stores tomorrow and does not move the ladder step or set the flag');
assert(graded.misses === missesBefore && graded.solves === solvesBefore &&
       store.state.attempts.length === 1 && store.state.xp === xpBefore,
  'Keep failing adds no miss, solve, attempt, or XP');
srs.applyAssessSchedule('qGrade', { stuck: true, guess: true, slow: true });
assert(srs.daysUntil(graded.srs.due) === 1 && graded.srs.step === baseStep,
  'Keep failing wins over a half and still does not stack past tomorrow');
srs.applyAssessSchedule('qGrade', {});
assert(graded.srs.due === baseDue && graded.srs.step === baseStep,
  'unpicking Keep failing restores the original 3-day date');

resetState();
var archived = mkEntry('qArch', { archivedAt: new Date().toISOString() });
srs.mistakeMissed(archived);
srs.mistakeSolved(archived);
var archDue = archived.srs.due;
var archStep = archived.srs.step;
archived.srs.baseDue = srs.addDays(14);
archived.archivedAt = new Date().toISOString();
var archMisses = archived.misses;
var answered = PGRE.gamify.recordAnswer(
  { id: 'qArch', topic: 'cm', answer: 0, choices: ['a', 'b'] },
  true, 1200, { picked: 0, mode: 'mistakes' });
assert(typeof answered === 'number' && answered > 0, 'archived re-solve still records XP once');
assert(archived.archivedAt && archived.srs.step === archStep && archived.srs.due === archDue,
  'an archived correct answer stays archived and does not climb');
assert(archived.srs.baseDue === archDue,
  'that answer replaces an older chip base with the date it left in place');
var archAttempts = store.state.attempts.length;
var archXp = store.state.xp;
var archSolves = archived.solves;
srs.applyAssessSchedule('qArch', { forgot: true });
assert(srs.daysUntil(archived.srs.due) === 1 && archived.archivedAt &&
       archived.srs.step === archStep && archived.misses === archMisses &&
       archived.solves === archSolves,
  'Forgot something on an archived record pulls the date to tomorrow without a miss or a reopen');
assert(store.state.attempts.length === archAttempts && store.state.xp === archXp,
  'the archived chip writes no second attempt and no extra XP');
srs.setLastAssess('qArch', null, ['forgot']);
assert(store.state.attempts.length === archAttempts &&
       store.state.attempts[store.state.attempts.length - 1].tags[0] === 'forgot',
  'the archived answer\'s own attempt row receives the Forgot something tag');
srs.applyAssessSchedule('qArch', { slow: true });
assert(srs.daysUntil(archived.srs.due) === 2 && archived.srs.step === archStep,
  'Too slow on the archived record halves its own base, not an older one');
srs.applyAssessSchedule('qArch', {});
assert(archived.srs.due === archDue && archived.archivedAt,
  'clearing the chip restores the archived date and leaves it archived');
srs.applyAssessSchedule('qArch', { stuck: true });
assert(srs.daysUntil(archived.srs.due) === 1 && archived.archivedAt &&
       archived.srs.step === archStep && archived.misses === archMisses &&
       archived.solves === archSolves,
  'Keep failing on an archived record pulls the date to tomorrow without a miss or a reopen');
srs.applyAssessSchedule('qArch', {});
assert(archived.srs.due === archDue && archived.archivedAt,
  'unpicking Keep failing restores the archived date and leaves it archived');

resetState();
var flagged = mkEntry('qStuck');
srs.mistakeMissed(flagged);
srs.mistakeSolved(flagged);
srs.noteAssessBase(flagged);
var stuckBase = flagged.srs.due;
var stuckStep = flagged.srs.step;
store.state.attempts.push({ qid: 'qStuck', correct: true });
var stuckXp = store.state.xp;
var stuckAttempts = store.state.attempts.length;
var stuckMisses = flagged.misses;
srs.markStuck('qStuck');
srs.applyAssessSchedule('qStuck', { stuck: true });
assert(flagged.stuck === true && srs.daysUntil(flagged.srs.due) === 1 &&
       flagged.srs.step === stuckStep && flagged.srs.baseDue === stuckBase,
  'the Keep failing chip files the flag and stores tomorrow from the saved base');
assert(store.state.xp === stuckXp && store.state.attempts.length === stuckAttempts &&
       flagged.misses === stuckMisses,
  'that chip adds no miss, attempt, or XP');
srs.unmarkStuck('qStuck');
srs.applyAssessSchedule('qStuck', {});
assert(flagged.srs.due === stuckBase && flagged.stuck !== true && flagged.srs.step === stuckStep,
  'unpicking Keep failing restores the saved date and clears the flag');

resetState();
var openArch = mkEntry('qArchOpen');
srs.mistakeSolved(openArch);
srs.mistakeSolved(openArch); // step 2, 7 days
var seven = openArch.srs.due;
openArch.archivedAt = new Date().toISOString();
srs.noteAssessBase(openArch);
srs.markLucky('qArchOpen');
srs.applyAssessSchedule('qArchOpen', { guess: true });
assert(!openArch.archivedAt && openArch.lucky === true && openArch.srs.step === 2 &&
       srs.daysUntil(openArch.srs.due) === 4,
  'Guessed reopens an archived entry and halves its 7-day wait to 4 days');
var solvesAtGuess = openArch.solves;
var missesAtGuess = openArch.misses;
srs.unmarkLucky('qArchOpen');
srs.applyAssessSchedule('qArchOpen', {});
assert(openArch.srs.due === seven && openArch.srs.step === 2 &&
       openArch.solves === solvesAtGuess && openArch.misses === missesAtGuess &&
       !openArch.lucky,
  'unpicking Guessed restores the 7-day date on the same rung');

resetState();
store.state.attempts.push({ qid: 'qNone', correct: true });
assert(srs.applyAssessSchedule('qNone', { forgot: true }) === null &&
       !store.state.mistakes.qNone,
  'Forgot something does not create a mistake entry when nothing is scheduled');
srs.markLucky('qNone');
assert(store.state.mistakes.qNone && srs.daysUntil(store.state.mistakes.qNone.srs.due) === 1,
  'Guessed still seeds an unscheduled correct answer at tomorrow');
srs.applyAssessSchedule('qNone', { guess: true });
assert(srs.daysUntil(store.state.mistakes.qNone.srs.due) === 1 &&
       store.state.mistakes.qNone.srs.step === 0 && store.state.mistakes.qNone.misses === 0,
  'halving that seeded tomorrow stays tomorrow and still counts no miss');
srs.unmarkLucky('qNone');
assert(!store.state.mistakes.qNone, 'unpicking that Guessed still removes the lucky-only entry');

resetState();
var refused = mkEntry('qRefuse');
srs.mistakeSolved(refused);
var refusedDue = refused.srs.due;
store._persistFailed = true;
assert(srs.applyAssessSchedule('qRefuse', { forgot: true }) === null &&
       refused.srs.due === refusedDue,
  'a refused save does not move the review date in memory');
store._persistFailed = false;

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
