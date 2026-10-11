#!/usr/bin/env node
/* Unit checks for the mock-exam Paused card (js/view-exam.js): progress
   counts, stopped-clock numbers, pace, and a spoiler gate. The card must
   not mention accuracy, score, or right/wrong, and must not include
   question text or choices. Loads the shipped view against a stubbed DOM.
   Run: node tools/test-exam-pause-card.js */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var root = path.resolve(__dirname, '..');
var src = fs.readFileSync(path.join(root, 'js', 'view-exam.js'), 'utf8');

var listeners = [];
var documentStub = {
  getElementById: function () { return null; },
  querySelector: function () { return null; },
  addEventListener: function (type, fn) { listeners.push([type, fn]); },
  body: { classList: { contains: function () { return false; }, toggle: function () {} } }
};
var windowStub = {
  PGRE: { views: {}, ui: {} },
  addEventListener: function () {},
  document: documentStub
};
windowStub.PGRE.ui.esc = function (s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
};
windowStub.PGRE.ui.meter = function (pct, extraClass) {
  pct = Math.max(0, Math.min(100, Number(pct) || 0));
  return '<div class="meter meter--width ' + (extraClass || '') +
    '" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' +
    pct + '"><div class="meter-segment meter-fill" style="width:' + pct +
    '%"></div><div class="meter-segment meter-rest"></div></div>';
};
windowStub.PGRE.examEngine = {};

var sandbox = {
  window: windowStub,
  document: documentStub,
  PGRE: windowStub.PGRE,
  location: { hash: '#/exam/run' },
  console: console,
  Date: Date,
  Math: Math,
  JSON: JSON,
  String: String,
  Number: Number,
  Array: Array,
  Object: Object,
  parseInt: parseInt,
  isFinite: isFinite
};
vm.createContext(sandbox);
vm.runInContext(src, sandbox);

var view = sandbox.PGRE.views.exam;
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

function fixture(overrides) {
  var exam = {
    id: 'ex-pause-unit',
    order: ['pause-q1', 'pause-q2', 'pause-q3', 'pause-q4', 'pause-q5'],
    answers: { 'pause-q1': 1, 'pause-q2': 0 },
    flags: ['pause-q2'],
    cursor: 2,
    paused: true,
    durationSec: 90,
    limitSec: 7200
  };
  Object.keys(overrides || {}).forEach(function (k) { exam[k] = overrides[k]; });
  return exam;
}

assert(typeof view.pauseSnapshot === 'function' && typeof view.pauseCardHTML === 'function',
  'the exam view exports pauseSnapshot and pauseCardHTML');

var snap = view.pauseSnapshot(fixture());
assert(snap.answered === 2 && snap.total === 5 && snap.unanswered === 3,
  'snapshot counts 2 of 5 answered and 3 unanswered');
assert(snap.flagged === 1 && snap.onQuestion === 3,
  'snapshot reads the flag list and the current question number');
assert(snap.used === 90 && snap.remain === 7110,
  'snapshot uses the stopped clock (90 s used, 7110 s remaining)');
assert(snap.avgSec === 45 && snap.remainEachSec === 2370,
  'pace is 45 s per answered and 2370 s per leftover');

var html = view.pauseCardHTML(fixture());
assert(/<h2>Paused<\/h2>/.test(html), 'card keeps the Paused heading');
assert(html.indexOf('The clock is stopped and the questions are hidden.') !== -1,
  'card keeps the existing pause sentence');
assert(html.indexOf('id="exam-resume-btn">Resume exam</button>') !== -1,
  'card keeps the Resume exam button');
assert(html.indexOf('2 of 5 answered') !== -1, 'card prints 2 of 5 answered');
assert(/aria-valuenow="40"/.test(html), 'meter is 40 percent filled (2 of 5)');
assert(html.indexOf('id="exam-pause-used">1:30<') !== -1, 'time used is 1:30');
assert(html.indexOf('id="exam-pause-remain">1:58:30<') !== -1, 'time remaining is 1:58:30');
assert(html.indexOf('id="exam-pause-cursor">3 of 5<') !== -1, 'on question is 3 of 5');
assert(html.indexOf('id="exam-pause-blank">3<') !== -1, 'not yet answered is 3');
assert(html.indexOf('id="exam-pause-flagged">1<') !== -1, 'flagged is 1');
assert(html.indexOf('Average 0:45 per answered question.') !== -1, 'pace names 0:45 per answered');
assert(html.indexOf('Remaining clock allows 39:30 per leftover question.') !== -1,
  'remaining pace names 39:30 per leftover');
assert(html.indexOf('pauseCount') === -1 && !/paused \d|times paused/i.test(html),
  'card does not invent a pause count');

var stem = 'SPOILERSTEM unique pause-info accuracy score correct wrong right';
var choice = 'SPOILERCHOICE-A-correct-score';
var leaky = fixture();
leaky.order = ['pause-q1'];
leaky.answers = { 'pause-q1': 0 };
leaky.flags = [];
leaky.cursor = 0;
leaky._stem = stem;
leaky._choice = choice;
var card = view.pauseCardHTML(leaky);
var lower = card.toLowerCase();
assert(card.indexOf(stem) === -1 && card.indexOf(choice) === -1,
  'card HTML does not include question text or choices even if hung on the exam object');
['accuracy', 'score', 'correct', 'incorrect', 'wrong', 'scaled', 'raw score'].forEach(function (word) {
  assert(lower.indexOf(word) === -1, 'card does not say "' + word + '"');
});
assert(card.indexOf('class="choice"') === -1 && card.indexOf('q-text') === -1 &&
  card.indexOf('hist-mark') === -1,
  'card does not render choices, stems, or right/wrong marks');

var empty = view.pauseSnapshot(fixture({ answers: {}, flags: [], cursor: 0, durationSec: 0 }));
assert(empty.answered === 0 && empty.avgSec == null && empty.remainEachSec === 7200 / 5,
  'with no answers, average pace is omitted and leftover pace uses the full clock');
var emptyHtml = view.pauseCardHTML(fixture({ answers: {}, flags: [], cursor: 0, durationSec: 0 }));
assert(emptyHtml.indexOf('0 of 5 answered') !== -1, 'empty sitting still shows 0 of 5 answered');
assert(emptyHtml.indexOf('Average ') === -1, 'empty sitting omits average pace');
assert(emptyHtml.indexOf('per leftover question.') !== -1, 'empty sitting still shows leftover pace');

var done = view.pauseCardHTML(fixture({
  answers: { 'pause-q1': 0, 'pause-q2': 1, 'pause-q3': 2, 'pause-q4': 3, 'pause-q5': 4 },
  cursor: 4,
  durationSec: 100
}));
assert(done.indexOf('5 of 5 answered') !== -1, 'a finished sitting shows 5 of 5 answered');
assert(done.indexOf('per leftover question.') === -1, 'a finished sitting omits leftover pace');
assert(done.indexOf('Average 0:20 per answered question.') !== -1, 'a finished sitting keeps average pace');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
