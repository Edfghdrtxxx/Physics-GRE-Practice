#!/usr/bin/env node
/* Unit tests for per-question time in a mock sitting (js/exam-engine.js,
   exam.qSec): the count runs only while the clock runs, the sitting is not
   paused and the tab is visible; revisits add to one total; a flush keeps the
   saved total current; Submit closes the last span and writes each total to
   that question's attempt row as `ms`; the agent status summary reports it as
   `seconds`; a sitting saved before the field existed still submits with
   `ms: null`. Loads the shipped store.js, bank.js, srs.js, gamify.js,
   exam-engine.js and status.js against a fabricated bank (no exam content).
   Every span time is passed in, so no test waits on a real clock.
   Run: node tools/test-exam-dwell.js */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var root = path.resolve(__dirname, '..');
function src(name) { return fs.readFileSync(path.join(root, 'js', name), 'utf8'); }

var window = { PGRE: {}, addEventListener: function () {} };
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
  document: { querySelector: function () { return null; } },
  console: console,
  Date: Date,
  Math: Math,
  JSON: JSON,
  String: String,
  Number: Number,
  Array: Array,
  Object: Object,
  Promise: Promise,
  setTimeout: function () { return 1; },
  clearTimeout: function () {},
  setInterval: function () { return 1; },
  isFinite: isFinite,
  parseInt: parseInt,
  parseFloat: parseFloat
};
vm.createContext(sandbox);
['store.js', 'bank.js', 'srs.js', 'gamify.js', 'exam-engine.js', 'status.js'].forEach(function (f) {
  vm.runInContext(src(f), sandbox, { filename: f });
});

var PGRE = sandbox.PGRE;
var engine = PGRE.examEngine;
var store = PGRE.store;
store.load();
/* Achievement metrics need the plan catalog, which this test does not use. */
PGRE.gamify.checkAchievements = function () { return []; };

var passed = 0;
var failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log('  ok  — ' + msg); }
  else { failed++; console.log('  FAIL — ' + msg); }
}
function near(a, b) { return typeof a === 'number' && Math.abs(a - b) < 1e-9; }

/* Fabricated bank: one released-style exam of 6 questions, replayed by id. */
var TOPICS = ['cm', 'em', 'qm'];
var questions = [];
for (var i = 0; i < 6; i++) {
  questions.push({ id: 'dw-' + i, topic: TOPICS[i % 3], answer: i % 5, src: 'ets-exam',
    q: 'stem ' + i, choices: ['a', 'b', 'c', 'd', 'e'] });
}
PGRE.QUESTIONS = [];
PGRE.BOOK_QUESTIONS = [];
PGRE.ETS_DRILLS = [];
PGRE.BOOK_EXAMS = [];
PGRE.ETS_EXAMS = [{ id: 'dwell-mock', title: 'Dwell mock', format: '70x120', questions: questions }];

var RUN = { running: true, visible: true };
var HIDDEN = { running: true, visible: false };
var STOPPED = { running: false, visible: true };

function fresh() {
  store.reset();
  var exam = engine.create({ source: 'dwell-mock' });
  return exam;
}

console.log('a new sitting');
var exam = fresh();
assert(!!exam && exam.order.length === 6, 'the fabricated exam replays with 6 questions');
assert(exam.qSec && typeof exam.qSec === 'object' && !Array.isArray(exam.qSec) &&
  Object.keys(exam.qSec).length === 0, 'a new sitting starts with an empty qSec map');
assert(engine.questionSec(exam, exam.order[0]) === null, 'a question with no time reads null');

console.log('\nthe count runs on the question at the cursor');
var Q = exam.order;
exam.cursor = 0;
assert(engine.dwellSync(exam, RUN, 0) === true, 'a running, visible, unpaused sitting opens a span');
exam.cursor = 1;                                  // the room moves the cursor, then syncs
engine.dwellSync(exam, RUN, 10000);
assert(near(exam.qSec[Q[0]], 10), 'moving on gives the question just left its 10 s, not the new one');
exam.cursor = 0;
engine.dwellSync(exam, RUN, 25000);
assert(near(exam.qSec[Q[1]], 15), 'the second question holds the 15 s it was on screen');
exam.cursor = 1;
engine.dwellSync(exam, RUN, 32000);
assert(near(exam.qSec[Q[0]], 17), 'a revisit adds to the same total (10 s + 7 s)');
assert(engine.questionSec(exam, Q[0]) === 17 && engine.questionSec(exam, Q[1]) === 15,
  'questionSec returns each total');
assert(engine.questionSec(exam, Q[2]) === null, 'a question never shown reads null');

console.log('\npause stops the count');
engine.dwellSync(exam, STOPPED, 32000);           // close the span left open by the revisit, adding nothing
exam.cursor = 1;
engine.dwellSync(exam, RUN, 100000);              // the count restarts here; the gap before is not dwell
assert(near(exam.qSec[Q[1]], 15), 'a restart adds nothing for the gap before it');
engine.dwellSync(exam, STOPPED, 104000);          // Pause stops the countdown, which stops the count
var afterPause = exam.qSec[Q[1]];
assert(near(afterPause, 15 + 4), 'the 4 s before Pause are counted');
engine.dwellSync(exam, STOPPED, 900000);
assert(near(exam.qSec[Q[1]], afterPause), 'nothing accrues while the clock is stopped');
exam.paused = true;
assert(engine.dwellSync(exam, RUN, 900000) === false, 'a paused sitting opens no span even if the gate says run');
engine.dwellSync(exam, RUN, 1000000);
assert(near(exam.qSec[Q[1]], afterPause), 'nothing accrues while exam.paused is set');
exam.paused = false;
assert(engine.dwellSync(exam, RUN, 1000000) === true, 'Resume opens a span again');
engine.dwellSync(exam, STOPPED, 1010000);
assert(near(exam.qSec[Q[1]], afterPause + 10), 'time after Resume is counted (10 s), the pause is not');

console.log('\na hidden tab stops the count');
var before = exam.qSec[Q[1]];
engine.dwellSync(exam, RUN, 2000000);
engine.dwellSync(exam, HIDDEN, 2003000);
assert(near(exam.qSec[Q[1]], before + 3), 'the 3 s while visible are counted');
engine.dwellSync(exam, HIDDEN, 2500000);
assert(near(exam.qSec[Q[1]], before + 3), 'nothing accrues while the tab is hidden');
engine.dwellSync(exam, RUN, 3000000);
engine.dwellSync(exam, STOPPED, 3002000);
assert(near(exam.qSec[Q[1]], before + 3 + 2), 'counting resumes when the tab is shown (+2 s), without the hidden gap');

console.log('\nclose and flush');
var t0 = 5000000;
engine.dwellSync(exam, RUN, t0);
var q1Start = exam.qSec[Q[1]];
assert(engine.dwellFlush(t0 + 5000) === true, 'flush with a span open reports true');
assert(near(exam.qSec[Q[1]], q1Start + 5), 'flush moves the 5 s into qSec');
engine.dwellFlush(t0 + 8000);
assert(near(exam.qSec[Q[1]], q1Start + 8), 'a second flush adds only the new 3 s (the span stays open)');
var shown = engine.dwellClose(t0 + 9000);
assert(near(shown, 1) && near(exam.qSec[Q[1]], q1Start + 9), 'close adds the last second and returns it');
assert(engine.dwellClose(t0 + 99000) === 0 && near(exam.qSec[Q[1]], q1Start + 9),
  'a second close is a no-op');
assert(engine.dwellFlush(t0 + 99000) === false, 'flush with no span open does nothing');
engine.dwellSync(exam, RUN, t0 + 100000);
engine.dwellSync(exam, RUN, t0 + 99000);
assert(near(exam.qSec[Q[1]], q1Start + 9), 'a clock that runs backward adds nothing');
engine.dwellClose(t0 + 99000);

console.log('\nthe total is saved with the sitting');
var saveExam = fresh();
saveExam.cursor = 2;
engine.dwellSync(saveExam, RUN, 0);
engine.dwellFlush(12345);
store.save();
var blob = JSON.parse(localStorage.getItem(store.KEY));
var saved = blob.exams.filter(function (x) { return x.id === saveExam.id; })[0];
assert(saved && near(saved.qSec[saveExam.order[2]], 12.345),
  'the saved blob holds the flushed total to the millisecond (12.345 s)');
assert(saved.qSec[saveExam.order[0]] === undefined, 'a question never shown has no entry in the blob');
engine.dwellClose(12345);

console.log('\nbad or missing data');
var odd = fresh();
odd.qSec = [];
odd.cursor = 0;
engine.dwellSync(odd, RUN, 0);
engine.dwellSync(odd, STOPPED, 2000);
assert(odd.qSec && !Array.isArray(odd.qSec) && near(odd.qSec[odd.order[0]], 2),
  'an array in qSec is replaced by a map and counting still works');
delete odd.qSec;
engine.dwellSync(odd, RUN, 0);
engine.dwellSync(odd, STOPPED, 3000);
assert(odd.qSec && near(odd.qSec[odd.order[0]], 3),
  'a sitting saved without qSec gains the map the first time a span closes');
odd.qSec = { a: -4, b: 'x', c: NaN, d: 0, e: Infinity };
assert(['a', 'b', 'c', 'd', 'e', 'missing'].every(function (k) { return engine.questionSec(odd, k) === null; }),
  'negative, text, NaN, zero, infinite, and absent entries all read null');
assert(engine.questionSec(null, 'x') === null && engine.questionSec({}, 'x') === null,
  'questionSec tolerates a missing sitting or map');
assert(engine.dwellSync(null, RUN, 0) === false && engine.dwellSync(odd, null, 0) === false,
  'dwellSync with no sitting or no gate opens nothing');
engine.dwellClose(0);

console.log('\nSubmit writes ms to the attempt rows');
var sub = fresh();
sub.cursor = 0;
engine.dwellSync(sub, RUN, 0);
sub.cursor = 1;
engine.dwellSync(sub, RUN, 17346);                 // question 1: 17.346 s
sub.cursor = 0;
engine.dwellSync(sub, RUN, 17346 + 29000);         // question 2: 29 s
sub.cursor = 1;
engine.dwellSync(sub, RUN, 17346 + 29000 + 1000);  // question 1 again: +1 s
engine.dwellSync(sub, STOPPED, 17346 + 29000 + 2000); // question 2 again: +1 s
sub.cursor = 3;                                    // question 4 is on screen at Submit
var openedAt = Date.now() - 6000;
engine.dwellSync(sub, RUN, openedAt);
sub.answers[sub.order[0]] = PGRE.questionById(sub.order[0]).answer;
sub.answers[sub.order[1]] = (PGRE.questionById(sub.order[1]).answer + 1) % 5;
var done = engine.submit(sub);
assert(done === sub && !!sub.submittedAt, 'the sitting submits');
function row(qid) {
  var rows = store.state.attempts.filter(function (a) { return a.sid === sub.id && a.qid === qid; });
  return rows.length === 1 ? rows[0] : null;
}
assert(sub.order.every(function (qid) { return row(qid) && row(qid).mode === 'exam'; }),
  'every question has one exam attempt row');
assert(row(sub.order[0]).ms === 18346, 'question 1 row: ms 18346 (17.346 s + 1 s over two visits)');
assert(row(sub.order[1]).ms === 30000, 'question 2 row: ms 30000');
assert(row(sub.order[3]).ms >= 6000 && row(sub.order[3]).ms < 7000,
  'the question on screen at Submit gets its time up to the click (about 6 s), got ' + row(sub.order[3]).ms);
assert(row(sub.order[2]).ms === null && row(sub.order[4]).ms === null && row(sub.order[5]).ms === null,
  'questions never shown keep ms: null');
assert(near(sub.qSec[sub.order[3]], row(sub.order[3]).ms / 1000),
  'the exam record keeps the same total the row got');
assert(engine.dwellClose(Date.now()) === 0, 'Submit left no span open');
var tooLate = sub.qSec[sub.order[3]];
engine.dwellSync(sub, RUN, 0);
engine.dwellClose(1e9);
assert(sub.qSec[sub.order[3]] === tooLate && !sub.qSec[sub.order[4]],
  'a submitted sitting takes no more time');

console.log('\nthe agent status summary reports seconds');
var summary = PGRE.buildStatusSummary();
function statusRow(qid) {
  return summary.attempts.filter(function (a) { return a.qid === qid && a.sessionId === sub.id; })[0];
}
assert(statusRow(sub.order[0]).mode === 'exam' && statusRow(sub.order[0]).seconds === 18.3,
  'status row for question 1: mode exam, seconds 18.3');
assert(statusRow(sub.order[1]).seconds === 30, 'status row for question 2: seconds 30');
assert(statusRow(sub.order[2]).seconds === null, 'status row for a question never shown: seconds null');

console.log('\ncap and old sittings');
var capped = fresh();
capped.qSec = {};
capped.qSec[capped.order[0]] = 3600;
engine.submit(capped);
var capRow = store.state.attempts.filter(function (a) { return a.sid === capped.id && a.qid === capped.order[0]; })[0];
assert(capRow.ms === PGRE.gamify.MAX_ATTEMPT_MS, 'an hour on one question is stored as the 15 min cap');

var old = fresh();
delete old.qSec;
old.answers[old.order[0]] = 0;
var oldDone = engine.submit(old);
assert(!!oldDone.submittedAt, 'a sitting with no qSec submits');
var oldRows = store.state.attempts.filter(function (a) { return a.sid === old.id; });
assert(oldRows.length === 6 && oldRows.every(function (a) { return a.ms === null; }),
  'a sitting with no qSec writes ms: null on all 6 rows');
assert(engine.questionSec(old, old.order[0]) === null, 'questionSec reads null on a sitting with no qSec');
var oldSummary = PGRE.buildStatusSummary();
assert(oldSummary.attempts.filter(function (a) { return a.sessionId === old.id; })
  .every(function (a) { return a.seconds === null; }), 'status seconds stay null for that sitting');

console.log('\na refused save keeps the time');
var fail = fresh();
fail.cursor = 4;
engine.dwellSync(fail, RUN, Date.now() - 4000);
var realSetItem = localStorage.setItem;
localStorage.setItem = function (k, v) {
  if (k === store.KEY) throw new Error('quota');
  return realSetItem.call(localStorage, k, v);
};
var refused = engine.submit(fail);
assert(refused === fail && !fail.submittedAt, 'a refused save leaves the sitting unsubmitted');
assert(fail.qSec[fail.order[4]] >= 4 && fail.qSec[fail.order[4]] < 5,
  'the 4 s on the question stay in qSec after the refusal, got ' + fail.qSec[fail.order[4]]);
assert(store.state.attempts.filter(function (a) { return a.sid === fail.id; }).length === 0,
  'no attempt rows were kept');
localStorage.setItem = realSetItem;
engine.dwellSync(fail, RUN, Date.now() - 2000);    // the room reopens the count after a refusal
var retried = engine.submit(fail);
assert(!!retried.submittedAt, 'the retry submits once saving works');
var failRow = store.state.attempts.filter(function (a) { return a.sid === fail.id && a.qid === fail.order[4]; })[0];
assert(failRow && failRow.ms >= 6000 && failRow.ms < 7500,
  'the retried row holds the time before and after the refusal (about 6 s), got ' + (failRow && failRow.ms));

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
