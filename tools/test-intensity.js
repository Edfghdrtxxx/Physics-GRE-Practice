#!/usr/bin/env node
/* PGRE.intensity: compute() on fixed histories and review(), the words,
   order and next action the dashboard Intensity card puts around one
   readout. No browser. Every history is built here on fixed calendar days
   (Saturday 2026-10-17, Sunday 2026-10-18, Thursday 2026-10-29 = the last
   Daily work target day, Friday 2026-10-30) and handed to compute() with
   opts.today, so the result does not depend on the day of the run.
   Expected numbers are worked out here, not read back from the module.
   Run: node tools/test-intensity.js */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var root = path.resolve(__dirname, '..');
function src(name) { return fs.readFileSync(path.join(root, 'js', name), 'utf8'); }

var passed = 0;
var failed = 0;
function assert(condition, message) {
  if (condition) { passed++; console.log('  ok  — ' + message); }
  else { failed++; console.log('  FAIL — ' + message); }
}

var sandbox = { window: {}, console: console };
sandbox.window.PGRE = {};
sandbox.PGRE = sandbox.window.PGRE;
vm.createContext(sandbox);
vm.runInContext(src('data-topics.js'), sandbox);
vm.runInContext(src('intensity.js'), sandbox);
var PGRE = sandbox.PGRE;
var I = PGRE.intensity;

var SAT = '2026-10-17';   // a weak-spot day
var SUN = '2026-10-18';   // the full-mock day
var LAST = '2026-10-29';  // last Daily work target day = exam date minus 3
var AFTER = '2026-10-30'; // no target
var EXAM = '2026-11-01';

function dayPlus(key, n) {
  var p = key.split('-');
  var d = new Date(+p[0], +p[1] - 1, +p[2], 12);
  d.setDate(d.getDate() + n);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function tsOn(key, seq) {
  var p = key.split('-');
  return new Date(+p[0], +p[1] - 1, +p[2], 9, Math.floor(seq / 60) % 60, seq % 60).toISOString();
}

/* history(today) -> a builder.
   add(daysAgo, count, o): `count` first tries in practice; o.right of them
     correct (default all), o.sec seconds each (default 90; null = no
     recorded time), o.topic (default 'cm').
   repeat(daysAgo, count, minutes): `count` mistake-book retakes, `minutes`
     in total.
   mock(daysAgo, o): a full mock; o.source (default 'gr1777'), o.format
     (default '100x170'), o.submitted (default true); it also logs three
     answers in mode 'exam'. */
function history(today) {
  var attempts = [];
  var exams = [];
  var seq = 0;
  var n = 0;
  var api = {
    add: function (daysAgo, count, o) {
      o = o || {};
      var right = o.right == null ? count : o.right;
      for (var i = 0; i < count; i++) {
        var row = { ts: tsOn(dayPlus(today, -daysAgo), seq++), qid: 'p-' + (n++), topic: o.topic || 'cm',
                    correct: i < right, mode: 'practice' };
        if (o.sec !== null) row.ms = (o.sec == null ? 90 : o.sec) * 1000;
        attempts.push(row);
      }
      return api;
    },
    repeat: function (daysAgo, count, minutes) {
      for (var i = 0; i < count; i++) {
        attempts.push({ ts: tsOn(dayPlus(today, -daysAgo), seq++), qid: 'm-' + (n++), topic: 'cm',
                        correct: true, ms: (minutes || count) * 60000 / count, mode: 'mistakes' });
      }
      return api;
    },
    mock: function (daysAgo, o) {
      o = o || {};
      var day = dayPlus(today, -daysAgo);
      for (var i = 0; i < 3; i++) {
        attempts.push({ ts: tsOn(day, seq++), qid: 'x-' + (n++), topic: 'em', correct: false, ms: 100000, mode: 'exam' });
      }
      exams.push({ id: 'ex-' + (n++), source: o.source || 'gr1777', format: o.format || '100x170',
                   submittedAt: o.submitted === false ? null : tsOn(day, seq++) });
      return api;
    },
    state: function () { return { attempts: attempts, exams: exams, settings: { examDate: EXAM } }; },
    read: function () { return I.compute(api.state(), { today: today }); }
  };
  return api;
}

function ctx(over) {
  var c = { hasHistory: true, unseen: 200, unseenByTopic: { cm: 40, em: 30 } };
  Object.keys(over || {}).forEach(function (k) { c[k] = over[k]; });
  return c;
}
function sum(tally) { return tally.green + tally.amber + tally.red + tally.none + tally.rest; }
function work(today, retakes, o) {
  var h = history(today).add(1, 20, { sec: 95 }).repeat(0, retakes, 40);
  if (o && o.mock) h.mock(0, o.mock);
  return h.read();
}

/* ——— compute(): shape, thresholds, numbers ——— */
console.log('compute()');
var base = history(SAT).add(0, 3, { sec: 118 }).add(2, 6, { sec: 111 }).add(4, 5, { sec: 148, right: 4 })
  .repeat(0, 30, 39).repeat(1, 45, 50).mock(6, { source: 'gr0877' });
var d0 = base.read();
assert(Object.keys(d0).join(',') === 'date,newQuestions,paceSec,firstAttemptAccuracy,repeatMinutes,dailyWork,topics,days',
  'top-level fields: Daily work replaces coverage');
assert(Object.keys(d0.newQuestions).join(',') === 'value,threshold,band,unit,window' &&
  Object.keys(d0.paceSec).join(',') === 'value,threshold,band,unit,window,n' &&
  Object.keys(d0.firstAttemptAccuracy).join(',') === 'value,threshold,band,unit,window,n,correct' &&
  Object.keys(d0.repeatMinutes).join(',') === 'value,threshold,band,unit,window,n' &&
  Object.keys(d0.dailyWork).join(',') === 'value,threshold,band,unit,window,retakes,mocks,lastTargetDay,examDate',
  'each of the five readings has its fields');
assert(Object.keys(d0.topics[0]).join(',') === 'topic,name,short,weight,newQuestions,correct,accuracy,judged,band,score' &&
  Object.keys(d0.days[0]).join(',') === 'date,newQuestions,paceSec,retakes,mocks,workBand',
  'topic rows and trend days have their fields');
var T = I.THRESHOLDS;
assert(T.dailyWork.green === 40 && T.dailyWork.amber === 25 && T.paceSec.green === 103 && T.paceSec.amber === 130 &&
  T.accuracyPct.green === 75 && T.accuracyPct.amber === 60 && T.topicMinNew === 5 && T.topicTargetAcc === 0.79 &&
  T.lastTargetLeadDays === 3 && T.newQuestions === undefined && T.repeatMin === undefined,
  'thresholds: Daily work 40 / 25, pace 103 / 130, accuracy 75 / 60; none for new questions or repeat time');
assert(I.MOCK_WEEKDAY === 0 && I.NO_PACK_WEEKDAYS === undefined, 'Sunday is the mock weekday; no no-pack weekdays');
// 3 new today (118 s), 6 on Oct 15 (111 s), 5 on Oct 13 (148 s, 4 right);
// 30 retakes today in 39 min, 45 on Oct 16; GR0877 submitted Oct 11.
assert(JSON.stringify([d0.newQuestions.value, d0.newQuestions.threshold, d0.newQuestions.band]) === '[3,null,null]' &&
  JSON.stringify([d0.paceSec.value, d0.paceSec.threshold, d0.paceSec.band, d0.paceSec.n]) === '[118,103,"amber",3]' &&
  JSON.stringify([d0.firstAttemptAccuracy.value, d0.firstAttemptAccuracy.band, d0.firstAttemptAccuracy.n,
    d0.firstAttemptAccuracy.correct]) === '[93,"green",14,13]' &&
  JSON.stringify([d0.repeatMinutes.value, d0.repeatMinutes.threshold, d0.repeatMinutes.band, d0.repeatMinutes.n]) === '[39,null,null,30]',
  'new questions 3 (no band), pace 118 amber, accuracy 93% (13 of 14) green, repeat 39 min over 30 retakes (no band)');
assert(JSON.stringify([d0.dailyWork.value, d0.dailyWork.threshold, d0.dailyWork.band, d0.dailyWork.retakes,
    d0.dailyWork.mocks.length, d0.dailyWork.lastTargetDay, d0.dailyWork.examDate]) ===
  JSON.stringify([30, 40, 'amber', 30, 0, LAST, EXAM]),
  'Daily work 30 of 40, amber; no mock today; target through 2026-10-29');
assert(d0.days.map(function (x) {
  return x.date.slice(5) + ':' + x.newQuestions + ':' + x.paceSec + ':' + x.retakes + ':' + x.mocks + ':' + x.workBand;
}).join(' ') ===
  '10-11:0:null:0:1:green 10-12:0:null:0:0:red 10-13:5:148:0:0:red 10-14:0:null:0:0:red ' +
  '10-15:6:111:0:0:red 10-16:0:null:45:0:green 10-17:3:118:30:0:amber',
  'the 7 days carry new questions, pace, retakes, mocks and the Daily work band (Oct 11 green by its mock)');
assert(d0.newQuestions.value === 3 && d0.firstAttemptAccuracy.n === 14,
  'answers in mode \'exam\' count as neither new questions nor retakes');

/* ——— Daily work bands ——— */
console.log('\nDaily work bands');
function bandAt(n) { return work(SAT, n).dailyWork.band; }
assert([40, 39, 25, 24, 0].map(bandAt).join(',') === 'green,amber,amber,red,red',
  '40 green, 39 and 25 amber, 24 and 0 red');
var dMock = work(SAT, 0, { mock: {} });
assert(dMock.dailyWork.band === 'green' && dMock.dailyWork.value === 0 && dMock.dailyWork.mocks.length === 1 &&
  dMock.dailyWork.mocks[0].source === 'gr1777' && dMock.dailyWork.mocks[0].format === '100x170',
  'a full mock submitted today is green with 0 retakes, and the payload names it');
assert(work(SAT, 3, { mock: { source: 'weighted', format: '70x120' } }).dailyWork.band === 'green',
  'the weighted 70-question draw counts as a full mock');
assert(work(SAT, 3, { mock: { submitted: false } }).dailyWork.band === 'red',
  'a sitting not yet submitted does not count');
assert(history(SAT).repeat(0, 10).mock(1).read().dailyWork.band === 'red',
  'a mock submitted yesterday does not count today');
var dLast = work(LAST, 10);
var dAfter = work(AFTER, 10);
assert(dLast.dailyWork.threshold === 40 && dLast.dailyWork.band === 'red' &&
  dAfter.dailyWork.threshold === null && dAfter.dailyWork.band === null && dAfter.dailyWork.value === 10,
  'Oct 29 still has the target; Oct 30 has none and no band');
var movedState = history(SAT).repeat(0, 10).state();
movedState.settings.examDate = '2026-10-19';
var dMoved = I.compute(movedState, { today: SAT });
assert(dMoved.dailyWork.lastTargetDay === '2026-10-16' && dMoved.dailyWork.band === null,
  'the last target day follows settings.examDate');
assert(I.band('dailyWork', 40) === 'green' && I.band('dailyWork', 25) === 'amber' && I.band('newQuestions', 3) === null &&
  I.band('repeatMin', 90) === null && I.band('paceSec', 104) === 'amber',
  'band() knows Daily work, pace and accuracy, and has no band for new questions or repeat time');

/* ——— review(): the card ——— */
console.log('\nreview(): a weak-spot day short of 40');
var frozenD = JSON.stringify(d0);
var c0 = ctx();
var frozenC = JSON.stringify(c0);
var r0 = I.review(d0, c0);
assert(JSON.stringify(d0) === frozenD && JSON.stringify(c0) === frozenC,
  'review() changes neither the readout nor the context it is given');
assert(r0.date === SAT && r0.weekday === 6 && r0.mockDay === false && r0.empty === false,
  'review reports the day and that it is not the mock day');
assert(r0.rows.map(function (r) { return r.key; }).join(',') ===
  'dailyWork,firstAttemptAccuracy,paceSec,repeatMinutes,newQuestions', 'five rows, Daily work first');
assert(r0.row.dailyWork.label === 'Daily work' && r0.row.dailyWork.value === '30' && r0.row.dailyWork.target === 'of 40' &&
  r0.row.newQuestions.target === 'no target' && r0.row.repeatMinutes.target === 'no limit' &&
  r0.row.paceSec.target === 'target 103 s or under' && r0.row.firstAttemptAccuracy.target === 'target 75% or more',
  'targets in words: "of 40", "no target", "no limit", "target 103 s or under", "target 75% or more"');
assert(r0.rows.every(function (r) { return r.band === (d0[r.key].band || null); }), 'row.band is the computed band for every row');
assert(r0.verdict.tone === 'attention' && r0.verdict.mark === 'amber' && r0.verdict.focus === 'dailyWork' &&
  r0.verdict.headline === '10 mistake-book questions to go today.',
  'headline: "10 mistake-book questions to go today." (got "' + r0.verdict.headline + '")');
assert(r0.verdict.action && r0.verdict.action.href === '#/mistakes' && r0.verdict.action.label === 'Open Mistake book',
  'the one action opens the mistake book');
assert(r0.verdict.detail === 'A full mock submitted today also meets the target. Also close: Pace.',
  'the detail says a full mock also counts, then the other reading that is close (got "' + r0.verdict.detail + '")');
assert(r0.row.dailyWork.lead === true && r0.row.dailyWork.action === null,
  'the leading row carries no second copy of the headline button');
assert(r0.attention.join(',') === 'dailyWork,paceSec' &&
  r0.tally.green === 1 && r0.tally.amber === 2 && r0.tally.red === 0 && r0.tally.rest === 2 && sum(r0.tally) === 5,
  'attention: Daily work, then pace; tally 1 on target, 2 close, 2 without a target');
assert(work(SAT, 39).dailyWork.band === 'amber' &&
  I.review(work(SAT, 39), ctx()).verdict.headline === '1 mistake-book question to go today.',
  'singular at 39: "1 mistake-book question to go today."');
var rZero = I.review(history(SAT).add(1, 20).read(), ctx());
assert(rZero.verdict.headline === 'No mistake-book questions yet today.' && rZero.verdict.mark === 'red',
  'nothing yet today: "No mistake-book questions yet today."');

console.log('\nthe mock day');
var rSun = I.review(history(SUN).add(1, 20).read(), ctx());
assert(rSun.mockDay === true && rSun.verdict.focus === 'dailyWork' &&
  rSun.verdict.headline === 'No mistake-book questions yet today.' &&
  rSun.verdict.action.href === '#/exam' && rSun.verdict.action.label === 'Open Mock exam' &&
  rSun.verdict.detail.indexOf('Today is the full-mock day: a submitted mock meets the target on its own.') === 0,
  'Sunday short of 40: the button opens the mock exam and the detail says the mock meets the target');
var rSunDone = I.review(history(SUN).add(1, 20, { sec: 95 }).mock(0).read(), ctx());
assert(rSunDone.row.dailyWork.show === 'green' && rSunDone.row.dailyWork.target === 'full mock submitted' &&
  rSunDone.verdict.tone === 'good' && rSunDone.verdict.headline === 'Full mock submitted today.',
  'Sunday after the mock: green, "full mock submitted", headline "Full mock submitted today."');
assert(rSunDone.row.dailyWork.meter.pct === 80 && rSunDone.row.dailyWork.meter.mark === 80,
  'a submitted mock fills the meter to the target tick');
assert(/1 mock submitted today\.$/.test(rSunDone.row.dailyWork.how[0]), 'the opened row counts the mock');

console.log('\nanother reading leads');
var accHist = history(SAT).add(0, 16, { right: 8, sec: 95 }).add(1, 16, { right: 9, sec: 95 }).repeat(0, 25);
var rAcc = I.review(accHist.read(), ctx());
assert(rAcc.verdict.focus === 'firstAttemptAccuracy' && rAcc.verdict.mark === 'red' &&
  rAcc.verdict.headline === 'First-try accuracy is 53% over the last 7 days.' && rAcc.verdict.action.href === '#/history',
  'accuracy red outranks Daily work amber: "First-try accuracy is 53% over the last 7 days."');
assert(rAcc.row.dailyWork.hint === 'Answer 15 more mistake-book questions to reach 40. ' +
    'A full mock submitted today also meets the target.' &&
  rAcc.row.dailyWork.action && rAcc.row.dailyWork.action.href === '#/mistakes',
  'the Daily work row then gives the count and its own link (got "' + rAcc.row.dailyWork.hint + '")');

console.log('\nno target after Oct 29');
var rAfter = I.review(dAfter, ctx());
assert(rAfter.row.dailyWork.show === 'rest' && rAfter.row.dailyWork.chip === 'No target' &&
  rAfter.row.dailyWork.target === 'no target today' && rAfter.row.dailyWork.meter.empty === true &&
  rAfter.attention.indexOf('dailyWork') < 0 && rAfter.tally.rest === 3,
  'Daily work shows "No target", needs no attention, and counts as without a target');
assert(rAfter.verdict.tone === 'rest' && rAfter.verdict.headline === 'No daily target today.' &&
  // No new question today, so pace has no data.
  rAfter.verdict.detail === 'The daily target ended on Oct 29, 3 days before the exam on Nov 1. The readings with data are on target.' &&
  rAfter.verdict.action === null,
  'headline "No daily target today." with the end date and no button (got "' + rAfter.verdict.detail + '")');
var rLast = I.review(dLast, ctx());
assert(rLast.row.dailyWork.target === 'of 40' && rLast.verdict.focus === 'dailyWork',
  'Oct 29 (a Thursday) still asks for 40');

console.log('\nreadings without a target');
var heavy = I.review(history(SAT).repeat(0, 120, 150).read(), ctx());
assert(heavy.row.repeatMinutes.value === '150' && heavy.row.repeatMinutes.show === 'rest' &&
  heavy.row.newQuestions.value === '0' && heavy.row.newQuestions.show === 'rest' &&
  heavy.attention.indexOf('repeatMinutes') < 0 && heavy.attention.indexOf('newQuestions') < 0,
  '150 min of retakes and 0 new questions never need attention');
['newQuestions', 'repeatMinutes'].forEach(function (k) {
  var row = r0.row[k];
  assert(row.band === null && row.show === 'rest' && row.chip === 'No target' && row.cuts.length === 0 &&
    row.meter.empty === true && row.meter.mark === null && row.hint === '' && row.action === null,
    k + ': no band, chip "No target", no band limits, a bare meter, no hint');
});
assert(/\(30 retakes\)\.$/.test(r0.row.repeatMinutes.how[0]) &&
  r0.row.repeatMinutes.how[1] === 'No limit: the daily target counts retakes, not minutes (see Daily work).' &&
  r0.row.newQuestions.how[1] === 'No daily target: new material comes from the Sunday full mocks.' &&
  r0.row.newQuestions.how[2] === 'Last 7 days: 14 new questions.',
  'the opened rows say why there is no target and carry their counts');

console.log('\nall on target');
var goodHist = history(SAT).add(0, 16, { sec: 98, right: 14 }).add(1, 15).repeat(0, 40);
var rGood = I.review(goodHist.read(), ctx());
assert(rGood.attention.length === 0 && rGood.verdict.tone === 'good' && rGood.verdict.mark === 'green' &&
  rGood.verdict.headline === 'Daily work done: 40 mistake-book questions.' &&
  rGood.verdict.detail === 'The other readings are on target.' && rGood.verdict.action === null &&
  rGood.tally.green === 3 && rGood.tally.rest === 2,
  'headline "Daily work done: 40 mistake-book questions."');
assert(rGood.rows.every(function (r) { return r.hint === '' && r.action === null; }), 'no row has a hint or a link');
var rGoodNoPace = I.review(history(SAT).add(1, 15).repeat(0, 40).read(), ctx());
assert(rGoodNoPace.tally.none === 1 && rGoodNoPace.verdict.detail === 'The readings with data are on target.',
  'with pace empty: "The readings with data are on target."');

console.log('\nmeters');
assert(r0.row.dailyWork.meter.pct === 60 && r0.row.dailyWork.meter.mark === 80 && r0.row.dailyWork.meter.lowIsGood === false,
  '30 of 40: the scale runs to 1.25 x the target, so the fill is 60% and the tick sits at 80%');
var big = I.review(work(SAT, 60), ctx());
assert(big.row.dailyWork.meter.pct === 100 && big.row.dailyWork.meter.mark === 66.7,
  '60 of 40: the scale stretches to the value, the tick moves left');
assert(r0.row.paceSec.meter.lowIsGood === true && r0.row.firstAttemptAccuracy.meter.mark === 75,
  'pace is less-is-better; accuracy runs 0-100 with the tick at 75');

console.log('\nanswers without a recorded time');
var rUntimed = I.review(history(SAT).add(0, 6, { sec: null }).repeat(0, 40).read(), ctx());
assert(rUntimed.row.paceSec.value === '—' &&
  rUntimed.row.paceSec.hint === 'Today\'s 6 new questions have no recorded time, so there is no median.',
  'pace says the 6 new questions have no recorded time');

console.log('\nnew user');
var dEmpty = I.compute({ attempts: [], settings: { examDate: EXAM } }, { today: SAT });
var rEmpty = I.review(dEmpty, ctx({ hasHistory: false }));
assert(rEmpty.empty === true && rEmpty.verdict.tone === 'empty' && rEmpty.verdict.headline === 'Nothing measured yet.' &&
  rEmpty.verdict.action.href === '#/exam', 'empty state: "Nothing measured yet." with the mock exam as the action');
assert(rEmpty.row.dailyWork.preview === '40 mistake-book questions a day, or a full mock' &&
  rEmpty.row.newQuestions.preview === 'no target' && rEmpty.row.repeatMinutes.preview === 'no limit' &&
  rEmpty.row.paceSec.preview === 'target 103 s or under' && rEmpty.row.firstAttemptAccuracy.preview === 'target 75% or more',
  'each row offers its target as a preview');
assert(I.review(dEmpty, ctx()).empty === false && I.review(dEmpty).empty === false,
  'empty needs hasHistory === false; a missing flag or context is not "new user"');

console.log('\nseven days');
assert(r0.days.length === 7 && r0.days[6].isToday === true && r0.days[0].mocks === 1 && r0.days[0].workBand === 'green' &&
  r0.days.every(function (x) { return x.target === 40; }) &&
  r0.days.map(function (x) { return x.retakes; }).join(',') === '0,0,0,0,0,45,30',
  'the strip carries retakes, the mock and the target of 40 each day');
var rLate = I.review(history('2026-10-31').repeat(2, 41).read(), ctx());
assert(rLate.days.map(function (x) { return x.date.slice(5) + ':' + x.target + ':' + x.workBand; }).join(' ') ===
  '10-25:40:red 10-26:40:red 10-27:40:red 10-28:40:red 10-29:40:green 10-30:null:null 10-31:null:null',
  'Oct 30 and 31 have no target and no band in the strip');

console.log('\ntopic to work on');
var topicHist = history(SAT).add(0, 6, { topic: 'em', right: 4 }).add(1, 8, { topic: 'cm', right: 8 }).add(2, 3, { topic: 'qm', right: 0 });
var rTopic = I.review(topicHist.read(), ctx());
assert(rTopic.topic && rTopic.topic.topic === 'em' && rTopic.topic.band === 'amber' && rTopic.topic.accuracy === 67 &&
  rTopic.topic.text === '67% on 6 new questions in 14 days, 18% of the exam.',
  'the topic shown is the first judged topic not on target (em, 67% on 6); qm has too few to judge');
assert(rTopic.topic.action.href === '#/practice/em/new' && rTopic.topic.action.label === 'Practice 30 untried questions',
  'its action opens that topic\'s untried questions');
var rTopicNone = I.review(topicHist.read(), ctx({ unseenByTopic: { em: 0 } }));
assert(rTopicNone.topic.action.href === '#/topic/em', 'with nothing untried in the topic the action opens the topic page');
assert(rTopic.judgedTopics === 2 && rEmpty.topic === null && rEmpty.judgedTopics === 0,
  'two topics judged; none for a new user');

console.log('\nthe opened row');
assert(r0.row.dailyWork.cuts.map(function (c) { return c.band + ':' + c.text; }).join(' | ') ===
    'green:40 or more, or a full mock | amber:25 to 39 | red:under 25' &&
  r0.row.paceSec.cuts.map(function (c) { return c.text; }).join(' | ') === '103 s or under | 104 to 130 s | over 130 s' &&
  r0.row.firstAttemptAccuracy.cuts.map(function (c) { return c.text; }).join(' | ') === '75% or more | 60 to 74% | under 60%',
  'the band limits printed are the thresholds compute() uses');
assert(r0.row.dailyWork.links.map(function (a) { return a.href; }).join(',') === '#/mistakes,#/exam' &&
  r0.row.repeatMinutes.links.map(function (a) { return a.href; }).join(',') === '#/mistakes' &&
  r0.row.firstAttemptAccuracy.links[0].href === '#/history' && r0.row.paceSec.links[0].href === '#/analytics' &&
  r0.row.newQuestions.links.map(function (a) { return a.href; }).join(',') === '#/practice/all/new' &&
  I.review(d0, ctx({ unseen: 0 })).row.newQuestions.links.length === 0,
  'each opened row links to the place that moves it');
assert(r0.row.dailyWork.how[0] === 'Counts your answers in the mistake book today (30 retakes). ' +
    'A full mock submitted today meets the target on its own.' &&
  r0.row.dailyWork.how[2] === 'The target of 40 a day runs through Oct 29, 3 days before the exam on Nov 1.' &&
  /\(3 timed\)/.test(r0.row.paceSec.how[0]) && /13 of 14\.$/.test(r0.row.firstAttemptAccuracy.how[0]),
  'the explanations carry the counts and the dates behind each number');
assert(typeof I.review === 'function' && typeof I.compute === 'function' && typeof I.chipHTML === 'function' &&
  typeof I.sessionMedianSec === 'function' && typeof I.band === 'function',
  'the module exports what the practice summary and the status payload call');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed) process.exitCode = 1;
