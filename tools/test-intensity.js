#!/usr/bin/env node
/* PGRE.intensity.review(): the words, order and next action the dashboard
   Intensity card puts around one PGRE.intensity.compute() readout. No
   browser. Every history is built here on fixed calendar days (Friday
   2026-10-09, Sunday 2026-10-11, Thursday 2026-10-15) and handed to
   compute() with opts.today, so the result does not depend on the day of
   the run. Also pins what review() must leave alone: compute()'s shape,
   the thresholds, and its inputs. Run: node tools/test-intensity.js */
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
vm.runInContext(src('data-packs.js'), sandbox);
vm.runInContext(src('intensity.js'), sandbox);
var PGRE = sandbox.PGRE;
var I = PGRE.intensity;

/* ——— Pack question ids: every history draws fresh ids from the union ——— */
var PACK_UNION = [];
(function () {
  var seen = {};
  Object.keys(PGRE.PACKS).forEach(function (k) {
    PGRE.PACKS[k].ids.forEach(function (id) { if (!seen[id]) { seen[id] = 1; PACK_UNION.push(id); } });
  });
}());

var FRI = '2026-10-09';   // a pack day
var SUN = '2026-10-11';   // no timed pack: the full-sitting day
var THU = '2026-10-15';   // no timed pack: the group discussion day
var EXAM = '2026-11-01';  // pack cutoff date = Oct 29, itself a Thursday

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
/* Sundays and Thursdays excluded, written out here. */
function workingDays(from, to) {
  var n = 0;
  for (var k = from; k <= to; k = dayPlus(k, 1)) {
    var wd = new Date(k + 'T12:00:00').getDay();
    if (wd !== 0 && wd !== 4) n++;
  }
  return n;
}

/* history(today) -> a builder. add(daysAgo, count, o) appends `count` first
   tries in practice: o.right of them correct (default all), o.sec seconds
   each (default 90; null = no recorded time), o.topic (default 'cm'). */
function history(today) {
  var pool = PACK_UNION.slice();
  var attempts = [];
  var seq = 0;
  var api = {
    add: function (daysAgo, count, o) {
      o = o || {};
      var right = o.right == null ? count : o.right;
      for (var i = 0; i < count; i++) {
        if (!pool.length) throw new Error('history: no untried pack question left to add');
        var row = { ts: tsOn(dayPlus(today, -daysAgo), seq++), qid: pool.shift(), topic: o.topic || 'cm',
                    correct: i < right, mode: 'practice' };
        if (o.sec !== null) row.ms = (o.sec == null ? 90 : o.sec) * 1000;
        attempts.push(row);
      }
      return api;
    },
    /* Mistake-book retakes today, `minutes` in total over `count` rows. */
    repeat: function (minutes, count) {
      count = count || 4;
      for (var i = 0; i < count; i++) {
        attempts.push({ ts: tsOn(today, seq++), qid: attempts.length ? attempts[0].qid : pool[0], topic: 'cm',
                        correct: true, ms: minutes * 60000 / count, mode: 'mistakes' });
      }
      return api;
    },
    /* Everything in the pack union tried long ago, except `keep` ids. Call
       it first: a small remainder keeps coverage on target, so the history
       can show one of the other readings on its own. */
    exhaust: function (keep) {
      while (pool.length > (keep || 0)) {
        attempts.push({ ts: tsOn(dayPlus(today, -30), seq++), qid: pool.shift(), topic: 'cm',
                        correct: true, ms: 90000, mode: 'practice' });
      }
      return api;
    },
    state: function () { return { attempts: attempts, settings: { examDate: EXAM } }; },
    read: function () { return I.compute(api.state(), { today: today }); }
  };
  return api;
}

var PACK = { id: '17', title: 'Laws of Thermodynamics & State Equations', n: 9, fresh: 6 };
function ctx(over) {
  var c = { hasHistory: true, nextPack: PACK, unseen: 200, unseenByTopic: { cm: 40, em: 30 } };
  Object.keys(over || {}).forEach(function (k) { c[k] = over[k]; });
  return c;
}
function sum(tally) { return tally.green + tally.amber + tally.red + tally.none + tally.rest; }

/* ——— What review() must leave alone ——— */
console.log('compute() is unchanged');
var base = history(FRI).add(0, 3, { sec: 118 }).add(2, 6, { sec: 111 }).add(4, 5, { sec: 148, right: 4 }).repeat(8);
var d0 = base.read();
assert(Object.keys(d0).join(',') === 'date,newQuestions,paceSec,firstAttemptAccuracy,repeatMinutes,coverage,topics,days',
  'compute() returns the same top-level fields, in the same order');
assert(Object.keys(d0.newQuestions).join(',') === 'value,threshold,band,unit,window' &&
  Object.keys(d0.paceSec).join(',') === 'value,threshold,band,unit,window,n' &&
  Object.keys(d0.firstAttemptAccuracy).join(',') === 'value,threshold,band,unit,window,n,correct' &&
  Object.keys(d0.repeatMinutes).join(',') === 'value,threshold,band,unit,window,n' &&
  Object.keys(d0.coverage).join(',') === 'value,threshold,band,unit,window,remaining,workingDaysLeft,workingDays7,' +
    'noPackWeekdays,required,actual,lastPackDay,examDate,packQuestions',
  'each of the five readings keeps its fields');
assert(Object.keys(d0.topics[0]).join(',') === 'topic,name,short,weight,newQuestions,correct,accuracy,judged,band,score' &&
  Object.keys(d0.days[0]).join(',') === 'date,newQuestions,paceSec',
  'topic rows and trend days keep their fields');
var T = I.THRESHOLDS;
assert(T.newQuestions.green === 15 && T.newQuestions.amber === 8 && T.paceSec.green === 103 && T.paceSec.amber === 130 &&
  T.accuracyPct.green === 75 && T.accuracyPct.amber === 60 && T.repeatMin.green === 20 && T.repeatMin.amber === 40 &&
  T.coverageSlack === 3 && T.topicMinNew === 5 && T.topicTargetAcc === 0.79 && T.lastPackLeadDays === 3,
  'every threshold has the value it had before review() existed');
assert(I.NO_PACK_WEEKDAYS.join(',') === '0,4', 'the no-pack weekdays are still Sunday and Thursday');
// The numbers themselves, for a fixed history: 3 new on Fri Oct 9 (118 s),
// 6 on Wed Oct 7 (111 s), 5 on Mon Oct 5 (148 s, 4 right), 8 min of retakes.
var left0 = PACK_UNION.length - 14;
assert(JSON.stringify([d0.newQuestions.value, d0.newQuestions.threshold, d0.newQuestions.band]) === '[3,15,"red"]' &&
  JSON.stringify([d0.paceSec.value, d0.paceSec.threshold, d0.paceSec.band, d0.paceSec.n]) === '[118,103,"amber",3]' &&
  JSON.stringify([d0.firstAttemptAccuracy.value, d0.firstAttemptAccuracy.threshold, d0.firstAttemptAccuracy.band,
    d0.firstAttemptAccuracy.n, d0.firstAttemptAccuracy.correct]) === '[93,75,"green",14,13]' &&
  JSON.stringify([d0.repeatMinutes.value, d0.repeatMinutes.threshold, d0.repeatMinutes.band, d0.repeatMinutes.n]) === '[8,20,"green",4]',
  'new questions 3 of 15 red, pace 118 of 103 amber over 3 timed, accuracy 93% (13 of 14) green, repeat 8 of 20 green over 4 retakes');
assert(JSON.stringify([d0.coverage.actual, d0.coverage.remaining, d0.coverage.workingDaysLeft, d0.coverage.workingDays7,
    d0.coverage.required, d0.coverage.band, d0.coverage.lastPackDay, d0.coverage.examDate, d0.coverage.packQuestions]) ===
  JSON.stringify([2.8, left0, 15, 5, Math.round(10 * left0 / 15) / 10, 'red', '2026-10-29', EXAM, PACK_UNION.length]),
  'coverage 14 / 5 = 2.8 a day against ' + left0 + ' / 15 working days through 2026-10-29, red');
assert(d0.days.map(function (x) { return x.date.slice(5) + ':' + x.newQuestions + ':' + x.paceSec; }).join(' ') ===
  '10-03:0:null 10-04:0:null 10-05:5:148 10-06:0:null 10-07:6:111 10-08:0:null 10-09:3:118',
  'the 7 trend days carry 0, 0, 5 (148 s), 0, 6 (111 s), 0, 3 (118 s)');
var cm0 = d0.topics.filter(function (t) { return t.topic === 'cm'; })[0];
assert(d0.topics.length === 9 && JSON.stringify([cm0.newQuestions, cm0.correct, cm0.accuracy, cm0.judged, cm0.band]) ===
  '[14,13,93,true,"green"]' && d0.topics.filter(function (t) { return t.judged; }).length === 1,
  'nine topics; Classical Mechanics is the one judged: 13 of 14, 93%, green');
var frozenD = JSON.stringify(d0);
var c0 = ctx();
var frozenC = JSON.stringify(c0);
var r0 = I.review(d0, c0);
assert(JSON.stringify(d0) === frozenD && JSON.stringify(c0) === frozenC,
  'review() changes neither the readout nor the context it is given');
assert(typeof I.review === 'function' && typeof I.compute === 'function' && typeof I.chipHTML === 'function' &&
  typeof I.sessionMedianSec === 'function' && typeof I.band === 'function',
  'the module still exports what the practice summary and the status payload call');

/* ——— A pack day with a gap ——— */
console.log('\na pack day with a gap (Friday, 3 new)');
assert(d0.newQuestions.value === 3 && d0.newQuestions.band === 'red' && d0.paceSec.value === 118 &&
  d0.paceSec.band === 'amber' && d0.repeatMinutes.value === 8, 'the history reads 3 new (red), pace 118 s (amber), 8 min of retakes');
assert(r0.date === FRI && r0.weekday === 5 && r0.workingDay === true && r0.empty === false,
  'review reports the day, its weekday and that it is a pack day');
assert(r0.rows.map(function (r) { return r.key; }).join(',') ===
  'newQuestions,paceSec,firstAttemptAccuracy,repeatMinutes,coverage', 'five rows in the card order');
assert(r0.row.newQuestions.value === '3' && r0.row.newQuestions.target === 'of 15' &&
  r0.row.paceSec.value === '118' && r0.row.paceSec.unit === ' s' && r0.row.paceSec.target === 'target 103 s or under' &&
  r0.row.firstAttemptAccuracy.target === 'target 75% or more' && r0.row.repeatMinutes.target === 'limit 20 min' &&
  /^needed: \d+\.\d$/.test(r0.row.coverage.target),
  'each target says in words which way is good: "of 15", "target 103 s or under", "target 75% or more", "limit 20 min", "needed: x"');
assert(r0.rows.every(function (r) { return r.band === (d0[r.key].band || null); }),
  'row.band is the computed band for every row');
assert(r0.verdict.tone === 'attention' && r0.verdict.mark === 'red' && r0.verdict.focus === 'newQuestions' &&
  r0.verdict.headline === '12 new questions to go today.',
  'headline: "12 new questions to go today." (got "' + r0.verdict.headline + '")');
assert(r0.verdict.action && r0.verdict.action.kind === 'pack' && r0.verdict.action.pack === '17' &&
  r0.verdict.action.href === '#/practice/pack/17' && r0.verdict.action.label === 'Start Set 17',
  'the one action launches the next pack: #/practice/pack/17, "Start Set 17"');
assert(r0.verdict.detail.indexOf('Set 17 · Laws of Thermodynamics & State Equations has 6 you have not tried.') === 0,
  'the headline block names the pack and how many of its questions are untried');
assert(/Also off target: Coverage\./.test(r0.verdict.detail) && /Also close: Pace\./.test(r0.verdict.detail),
  'it lists the other readings that need attention, off target before close');
assert(r0.row.newQuestions.lead === true && r0.row.newQuestions.action === null,
  'the leading row carries no second copy of the headline button');
assert(r0.attention.join(',') === 'newQuestions,coverage,paceSec',
  'attention order: off target first (new questions, coverage), then close (pace)');
assert(r0.tally.green === 2 && r0.tally.amber === 1 && r0.tally.red === 2 && sum(r0.tally) === 5,
  'tally: 2 on target, 1 close, 2 off target');
assert(/^15 s over the exam pace of 103 s\./.test(r0.row.paceSec.hint) && r0.row.paceSec.action === null,
  'the pace hint gives the gap in seconds');
assert(r0.row.firstAttemptAccuracy.hint === '' && r0.row.repeatMinutes.hint === '',
  'a row on target has no hint');

var one = I.review(history(FRI).exhaust(40).add(0, 14).read(), ctx());
assert(one.verdict.headline === '1 new question to go today.' && one.verdict.mark === 'amber',
  'singular wording at 14 of 15: "1 new question to go today."');
var none = I.review(history(FRI).add(1, 16).read(), ctx());
assert(none.verdict.headline === 'No new questions yet today.' && none.row.paceSec.hint === '' &&
  none.row.paceSec.value === '—' && none.row.paceSec.show === 'none' && none.row.paceSec.chip === 'No data',
  'a day with no answers yet: "No new questions yet today.", pace shows "—" and "No data" with no hint');

var noPackCtx = I.review(d0, ctx({ nextPack: null, unseen: 40 }));
assert(noPackCtx.verdict.action.href === '#/practice/all/new' && noPackCtx.verdict.action.label === 'Practice untried questions' &&
  /40 untried questions are in the practice pool\./.test(noPackCtx.verdict.detail),
  'with no pack to name, the action is the untried-questions practice set');
var bare = I.review(d0);
assert(bare.verdict.action.href === '#/practice/all' && bare.empty === false,
  'review(d) with no context still returns a usable action (mixed practice)');

/* ——— Meters ——— */
console.log('\nmeters');
assert(r0.row.newQuestions.meter.pct === 16 && r0.row.newQuestions.meter.mark === 80 &&
  r0.row.newQuestions.meter.lowIsGood === false,
  '3 of 15: the scale runs to 1.25 x the target, so the fill is 16% and the tick sits at 80%');
assert(r0.row.paceSec.meter.lowIsGood === true && r0.row.repeatMinutes.meter.lowIsGood === true &&
  r0.row.firstAttemptAccuracy.meter.lowIsGood === false && r0.row.coverage.meter.lowIsGood === false,
  'pace and repeat time are marked as less-is-better');
assert(r0.row.firstAttemptAccuracy.meter.mark === 75 &&
  r0.row.firstAttemptAccuracy.meter.pct === d0.firstAttemptAccuracy.value,
  'accuracy runs on a fixed 0-100 scale with the tick at 75');
var big = I.review(history(FRI).add(0, 38).read(), ctx());
assert(big.row.newQuestions.meter.pct === 100 && big.row.newQuestions.meter.mark === Math.round(1000 * 15 / 38) / 10,
  '38 of 15: the scale stretches to the value, the tick moves left');
assert(none.row.paceSec.meter.empty === true && none.row.paceSec.meter.pct === 0, 'a reading with no data has an empty meter');

/* ——— No-pack weekdays ——— */
console.log('\nno-pack weekdays');
var sunHist = history(SUN).exhaust(100).add(1, 16, { sec: 95 }).add(2, 18, { sec: 95 }).add(3, 0).add(4, 17, { sec: 94 }).add(5, 16).add(6, 15);
var dSun = sunHist.read();
var rSun = I.review(dSun, ctx());
assert(dSun.newQuestions.value === 0 && dSun.newQuestions.band === 'red' && dSun.newQuestions.threshold === 15,
  'compute() still reports Sunday with 0 new as red against 15');
assert(rSun.workingDay === false && rSun.row.newQuestions.band === 'red' && rSun.row.newQuestions.show === 'rest' &&
  rSun.row.newQuestions.chip === 'No pack today' && rSun.row.newQuestions.target === 'no target today' &&
  rSun.row.newQuestions.meter.mark === null,
  'the card shows that row as "No pack today" with no target tick, and keeps the computed band in row.band');
assert(rSun.attention.indexOf('newQuestions') < 0 && rSun.tally.rest === 1 && rSun.tally.red === 0 && sum(rSun.tally) === 5,
  'it is not counted as off target; the tally still adds up to five');
assert(rSun.verdict.tone === 'rest' && rSun.verdict.headline === 'No timed pack today.' &&
  /^Sunday is the full-sitting day/.test(rSun.verdict.detail) &&
  rSun.verdict.action && rSun.verdict.action.href === '#/exam',
  'Sunday headline: "No timed pack today.", the full-sitting day, with a link to the mock exam');
var rThu = I.review(history(THU).exhaust(60).add(1, 16).add(2, 16).add(3, 16).read(), ctx());
assert(rThu.verdict.tone === 'rest' && /^Thursday is the group discussion day/.test(rThu.verdict.detail) &&
  rThu.verdict.action === null, 'Thursday: the group discussion day, and no button');
assert(/No timed pack is planned on Thursdays \(the group discussion day\)\./.test(rThu.row.newQuestions.hint),
  'the row hint names the weekday and its reason');
var rSunBusy = I.review(history(SUN).exhaust(40).add(0, 16).add(1, 16).read(), ctx());
assert(rSunBusy.row.newQuestions.show === 'green' && rSunBusy.row.newQuestions.target === 'of 15' &&
  rSunBusy.tally.rest === 0, 'a Sunday that reaches 15 anyway reads On target like any other day');
var rSunSlow = I.review(history(SUN).exhaust(40).add(0, 5, { sec: 140 }).add(1, 16).read(), ctx());
assert(rSunSlow.row.newQuestions.show === 'rest' && rSunSlow.verdict.tone === 'attention' &&
  rSunSlow.verdict.focus === 'paceSec' && rSunSlow.row.newQuestions.lead !== true && rSunSlow.row.newQuestions.hint !== '',
  'on a no-pack day another reading can still lead: pace at 140 s is the headline');
var packHrefs = function (r) {
  var out = [];
  if (r.verdict.action && r.verdict.action.kind === 'pack') out.push('verdict');
  r.rows.forEach(function (row) {
    if (row.action && row.action.kind === 'pack') out.push(row.key + ' action');
    row.links.forEach(function (a) { if (a.kind === 'pack') out.push(row.key + ' link'); });
  });
  return out;
};
[[SUN, 'Sunday'], [THU, 'Thursday']].forEach(function (pair) {
  var dBehind = history(pair[0]).add(1, 2).add(2, 2).read();
  var rBehind = I.review(dBehind, ctx());
  assert(dBehind.coverage.band === 'red' && rBehind.workingDay === false && rBehind.verdict.focus === 'coverage',
    pair[1] + ' with coverage far behind: coverage leads the card');
  assert(rBehind.verdict.action.href === '#/plan' && packHrefs(rBehind).length === 0 &&
    rBehind.verdict.detail.indexOf('Set 17') < 0 && rBehind.row.newQuestions.chip === 'No pack today',
    'it links to the Study plan and nothing on the card asks for a timed pack, beside "No pack today"' +
    (packHrefs(rBehind).length ? ' (pack offered by: ' + packHrefs(rBehind).join(', ') + ')' : ''));
  assert(rBehind.row.newQuestions.links.map(function (a) { return a.href; }).join(',') === '#/practice/all/new' &&
    rBehind.row.coverage.links.map(function (a) { return a.href; }).join(',') === '#/plan',
    'the opened rows keep the untried-questions set and the Study plan');
});
assert(packHrefs(rSun).length === 0 && packHrefs(rThu).length === 0 && packHrefs(rSunSlow).length === 0,
  'no other no-pack-day history offers a pack while New questions is below 15');
assert(rSun.days.length === 7 && rSun.days[6].isToday === true && rSun.days[6].workingDay === false &&
  rSun.days.filter(function (x) { return !x.workingDay; }).length === 2 &&
  rSun.days.map(function (x) { return x.newQuestions; }).join(',') === '15,16,17,0,18,16,0',
  'the 7-day strip marks its Sunday and its Thursday as no-pack days and keeps compute()\'s counts');
assert(rSun.days[2].paceSec === 94 && rSun.days[2].paceBand === 'green' && rSun.days[3].paceBand === null,
  'each day carries its median pace and that pace\'s band');

/* ——— Nothing left to try ——— */
console.log('\nevery practice question tried');
var doneHist = history(FRI).exhaust(10).add(0, 10, { sec: 92 });
var dDone = doneHist.read();
var rDone = I.review(dDone, ctx({ unseen: 0, nextPack: null, unseenByTopic: {} }));
assert(dDone.newQuestions.band === 'amber' && dDone.coverage.remaining === 0 && dDone.coverage.band === 'green',
  'compute(): 10 new today is amber, coverage has nothing remaining');
assert(rDone.row.newQuestions.show === 'rest' && rDone.row.newQuestions.chip === 'None left' &&
  rDone.row.newQuestions.target === 'none left to try' && rDone.attention.indexOf('newQuestions') < 0,
  'the card does not ask for more new questions when none is left: "None left"');
assert(rDone.verdict.tone === 'rest' && rDone.verdict.headline === 'No untried practice question is left.' &&
  rDone.verdict.action === null, 'headline: "No untried practice question is left.", no button');
assert(rDone.row.coverage.target === 'every pack question tried' && rDone.projection === null,
  'coverage reads "every pack question tried"');
var rDoneUnknown = I.review(dDone, ctx({ unseen: null, nextPack: null }));
assert(rDoneUnknown.row.newQuestions.show === 'amber',
  'an unknown pool size (the question bank did not load) is not treated as "none left"');

/* ——— Fewer untried questions than the gap ——— */
console.log('\nfewer untried questions than the gap to 15');
var lastPack4 = { id: '35', title: 'Last Set', n: 9, fresh: 4 };
var rScarce = I.review(d0, ctx({ unseen: 4, nextPack: lastPack4 }));
assert(rScarce.verdict.focus === 'newQuestions' &&
  rScarce.verdict.headline === 'Only 4 untried questions are left in the practice pool.' &&
  rScarce.verdict.detail.indexOf('Reaching 15 today needs 12. Set 35 · Last Set has 4 you have not tried.') === 0 &&
  rScarce.verdict.action.href === '#/practice/pack/35',
  '3 new, 4 untried: the headline gives the 4 that are left, the detail the 12 that 15 needs, the button the pack');
var rScarce1 = I.review(d0, ctx({ unseen: 1, nextPack: null }));
assert(rScarce1.verdict.headline === 'Only 1 untried question is left in the practice pool.' &&
  rScarce1.verdict.detail.indexOf('Reaching 15 today needs 12.') === 0 &&
  !/1 untried question is in the practice pool/.test(rScarce1.verdict.detail) &&
  rScarce1.verdict.action.href === '#/practice/all/new',
  'singular, and the pool is not counted twice: "Only 1 untried question is left in the practice pool."');
var rScarceRow = I.review(history(FRI).add(0, 3).add(1, 16).repeat(45).read(), ctx({ unseen: 4, nextPack: lastPack4 }));
assert(rScarceRow.verdict.focus === 'repeatMinutes' &&
  rScarceRow.row.newQuestions.hint === 'Only 4 untried questions are left in the practice pool; reaching 15 needs 12.',
  'when another reading leads, the New questions row says it in one sentence');
assert(I.review(d0, ctx({ unseen: 12 })).verdict.headline === '12 new questions to go today.' &&
  I.review(d0, ctx({ unseen: null })).verdict.headline === '12 new questions to go today.',
  'with 12 or more untried, or an unknown pool, the headline is the plain gap');

/* ——— Answers without a recorded time ——— */
console.log('\nanswers without a recorded time');
var rUntimed = I.review(history(FRI).add(0, 6, { sec: null }).read(), ctx());
assert(rUntimed.row.paceSec.value === '—' &&
  rUntimed.row.paceSec.hint === 'Today\'s 6 new questions have no recorded time, so there is no median.',
  'pace says the 6 new questions have no recorded time (it used to say there were no new questions)');
var rUntimed1 = I.review(history(FRI).add(0, 1, { sec: null }).read(), ctx());
assert(/^Today's 1 new question has no recorded time/.test(rUntimed1.row.paceSec.hint), 'singular: "1 new question has"');

/* ——— Doing too much ——— */
console.log('\ndoing too much');
var overHist = history(FRI).add(0, 38, { sec: 54, right: 20 }).add(1, 20, { sec: 60, right: 12 }).repeat(61, 6);
var dOver = overHist.read();
var rOver = I.review(dOver, ctx());
assert(dOver.repeatMinutes.value === 61 && dOver.repeatMinutes.band === 'red' && dOver.newQuestions.band === 'green' &&
  dOver.firstAttemptAccuracy.band === 'red', 'the history reads 61 min of retakes (red), 38 new (green), accuracy red');
assert(rOver.verdict.focus === 'repeatMinutes' && rOver.verdict.headline === '61 min of retakes today, 41 over the limit.',
  'retakes over the limit lead: "61 min of retakes today, 41 over the limit."');
assert(/^Leave the remaining retakes for another day\./.test(rOver.verdict.detail) && rOver.verdict.action === null,
  'with new questions already at target the advice is to stop, and there is no "start a pack" button');
assert(/^At least twice the target today, while first-try accuracy is \d+%/.test(rOver.row.newQuestions.hint) &&
  rOver.row.newQuestions.show === 'green',
  'New questions stays On target and adds a note: at least twice the target while accuracy is off');
var rTwice = I.review(history(FRI).add(0, 30, { right: 15 }).read(), ctx());
var rUnderTwice = I.review(history(FRI).add(0, 29, { right: 14 }).read(), ctx());
assert(/^At least twice the target today/.test(rTwice.row.newQuestions.hint) && rUnderTwice.row.newQuestions.hint === '',
  'the note starts at exactly 30 new questions (twice 15), which "at least twice" covers; 29 has no note');
assert(/inside the exam pace, while first-try accuracy is/.test(rOver.row.paceSec.hint),
  'Pace stays On target and notes the unused time while accuracy is off');
assert(rOver.row.firstAttemptAccuracy.action && rOver.row.firstAttemptAccuracy.action.href === '#/history' &&
  rOver.rows.filter(function (r) { return r.action && r.action.href === '#/history'; }).length === 1,
  'the History link appears once, on the accuracy row');
var rRepLow = I.review(history(FRI).add(0, 3).add(1, 16).repeat(45).read(), ctx());
assert(rRepLow.verdict.focus === 'repeatMinutes' && /^Spend the rest of today on new questions\./.test(rRepLow.verdict.detail) &&
  rRepLow.verdict.action.href === '#/practice/pack/17' && rRepLow.row.newQuestions.hint === 'Answer 12 more new questions to reach 15.',
  'retakes over the limit with new questions short: spend the rest on new questions, button = next pack, and the pack is named once');
var rAcc = I.review(history(FRI).exhaust(60).add(0, 16, { right: 9 }).add(1, 16, { right: 11 }).read(), ctx());
assert(rAcc.verdict.focus === 'firstAttemptAccuracy' && rAcc.verdict.headline === 'First-try accuracy is 63% over the last 7 days.' &&
  /^20 of 32 new questions right on the first try; the target is 75%\./.test(rAcc.verdict.detail) &&
  rAcc.verdict.action.href === '#/history',
  'accuracy leading: the headline gives the percent, the detail the count, the button opens History');

/* ——— Coverage ——— */
console.log('\ncoverage');
var wdl = workingDays(FRI, '2026-10-29');
assert(wdl === 15 && d0.coverage.workingDaysLeft === 15, 'Oct 9 through Oct 29 holds 15 working days');
var remaining = PACK_UNION.length - 14;
assert(d0.coverage.remaining === remaining && d0.coverage.actual === 2.8,
  'the gap history leaves ' + remaining + ' pack questions and averages 14 / 5 = 2.8 a working day');
var wantDays = Math.ceil(remaining / 2.8);
assert(r0.projection && r0.projection.workingDays === wantDays && r0.projection.spare === 15 - wantDays,
  'projection: ' + remaining + ' / 2.8 rounds up to ' + wantDays + ' working days, ' + (15 - wantDays) + ' to spare');
assert(r0.row.coverage.hint.indexOf('At 2.8 a working day, the ' + remaining + ' pack questions left take about ' +
  wantDays + ' working days; 15 are left through Oct 29.') === 0 &&
  /Finishing by Oct 29 needs \d+\.\d each working day\.$/.test(r0.row.coverage.hint),
  'the coverage hint turns the two rates into days: needed against left, counted through the cutoff date');
assert(r0.row.coverage.how.some(function (line) { return /^Needed: \d+ \/ 15 = \d+\.\d new questions each working day\.$/.test(line); }) &&
  r0.row.coverage.how.some(function (line) { return line === 'Last 7 days: 14 new questions over 5 working days = 2.8 a day.'; }),
  'the opened row shows both divisions');
var greenCov = history(FRI).exhaust(60).add(0, 16).add(1, 16).add(2, 16);
var rGreenCov = I.review(greenCov.read(), ctx());
assert(rGreenCov.row.coverage.band === 'green' && rGreenCov.projection.workingDays <= 15 && rGreenCov.projection.spare >= 0 &&
  rGreenCov.row.coverage.how.some(function (line) { return /to spare\.$/.test(line); }),
  'on target, the opened row says about when the packs are done and how many working days are spare');
var lateState = history(FRI).add(0, 9).add(2, 9).state();
lateState.settings.examDate = '2026-10-10';   // pack cutoff date Oct 7: already past
var dLate = I.compute(lateState, { today: FRI });
var rLate = I.review(dLate, ctx());
assert(dLate.coverage.required === null && dLate.coverage.band === 'red' && rLate.row.coverage.target === 'no working day left',
  'past the pack cutoff date compute() has no required rate; the row reads "no working day left"');
assert(rLate.verdict.focus === 'coverage' &&
  /^No working day is left through Oct 7, with \d+ pack questions not started\.$/.test(rLate.verdict.headline) &&
  rLate.verdict.action.href === '#/plan', 'that leads the card, with a link to the Study plan');
assert(rLate.row.coverage.value === dLate.coverage.actual.toFixed(1) && dLate.coverage.actual > 0 &&
  rLate.row.coverage.meter.pct === 0 && rLate.row.coverage.meter.mark === null && rLate.row.coverage.meter.empty === false,
  'its meter has no tick and stays empty: a full bar beside "Off target" would read as done');
// The cutoff date can itself be a no-pack weekday: Oct 29, 2026 is a Thursday.
var dCut = I.compute(history('2026-10-29').add(1, 9).add(2, 9).state(), { today: '2026-10-29' });
var rCut = I.review(dCut, ctx());
var cutText = JSON.stringify(rCut);
assert(dCut.coverage.lastPackDay === '2026-10-29' && dCut.coverage.workingDaysLeft === 0 && dCut.coverage.required === null &&
  /^No working day is left through Oct 29, with \d+ pack questions not started\.$/.test(rCut.verdict.headline) &&
  rCut.verdict.action.href === '#/plan',
  'on the cutoff date itself (a Thursday) the card says no working day is left through Oct 29');
assert(!/has passed/.test(cutText) && !/last pack day/.test(cutText) &&
  rCut.row.coverage.how.some(function (line) {
    return line === '0 working days are left through Oct 29, the pack cutoff date (3 days before the exam on Nov 1), ' +
      'with no timed pack on Sundays or Thursdays.';
  }),
  'it does not say the date "has passed" and does not call a Thursday a pack day');
var covLead = I.review(history(FRI).add(0, 9).add(1, 3).read(), ctx());
assert(covLead.verdict.focus === 'coverage' && /^Coverage is \d+\.\d a day under the rate that finishes the packs by Oct 29\.$/.test(covLead.verdict.headline) &&
  covLead.verdict.action.href === '#/practice/pack/17' &&
  covLead.row.newQuestions.hint === 'Answer 6 more new questions to reach 15.' && covLead.row.newQuestions.action === null,
  'coverage off target outranks new questions that are only close; the pack is named once and its button appears once');

/* ——— All on target ——— */
console.log('\nall on target');
var goodHist = history(FRI).exhaust(60).add(0, 16, { sec: 98, right: 14 }).add(1, 15).add(2, 15).repeat(15);
var rGood = I.review(goodHist.read(), ctx());
assert(rGood.attention.length === 0 && rGood.verdict.tone === 'good' && rGood.verdict.mark === 'green' &&
  rGood.verdict.headline === 'On target on all five readings.' && rGood.tally.green === 5,
  'headline: "On target on all five readings."');
assert(rGood.verdict.action.href === '#/practice/pack/17' && /^Next when you want it: Set 17/.test(rGood.verdict.detail),
  'the next pack is offered, not demanded');
assert(rGood.rows.every(function (r) { return r.hint === '' && r.action === null; }), 'no row has a hint or a link');
var rGoodNoPace = I.review(history(FRI).exhaust(40).add(0, 16, { sec: null }).add(1, 15).read(), ctx());
assert(rGoodNoPace.tally.none === 1 && rGoodNoPace.verdict.headline === 'On target on the 4 readings with data.' &&
  rGoodNoPace.verdict.tone === 'good', 'a reading with no data is not counted as on target: "On target on the 4 readings with data."');

/* ——— New user ——— */
console.log('\nnew user');
var dEmpty = I.compute({ attempts: [], settings: { examDate: EXAM } }, { today: FRI });
var rEmpty = I.review(dEmpty, ctx({ hasHistory: false, unseen: PACK_UNION.length }));
assert(rEmpty.empty === true && rEmpty.verdict.tone === 'empty' && rEmpty.verdict.headline === 'Nothing measured yet.' &&
  rEmpty.verdict.action.href === '#/practice/pack/17', 'empty state: "Nothing measured yet." with the first pack as the action');
assert(rEmpty.row.newQuestions.preview === 'target 15 a day' && rEmpty.row.paceSec.preview === 'target 103 s or under' &&
  rEmpty.row.firstAttemptAccuracy.preview === 'target 75% or more' && rEmpty.row.repeatMinutes.preview === 'limit 20 min' &&
  rEmpty.row.coverage.preview === PACK_UNION.length + ' pack questions by Oct 29: ' +
    (Math.round(10 * PACK_UNION.length / 15) / 10).toFixed(1) + ' each working day',
  'each row offers its target as a preview, coverage with the rate the whole plan needs');
var rEmptyNoPack = I.review(dEmpty, { hasHistory: false });
assert(rEmptyNoPack.verdict.action.href === '#/practice/all' && rEmptyNoPack.verdict.action.label === 'Start mixed practice',
  'with no pack data the empty state falls back to mixed practice');
assert(I.review(dEmpty, ctx()).empty === false, 'empty needs hasHistory === false; a missing flag is not "new user"');

/* ——— Topic to work on ——— */
console.log('\ntopic to work on');
var topicHist = history(FRI).add(0, 6, { topic: 'em', right: 4 }).add(1, 8, { topic: 'cm', right: 8 }).add(2, 3, { topic: 'qm', right: 0 });
var dTopic = topicHist.read();
var rTopic = I.review(dTopic, ctx());
assert(rTopic.topic && rTopic.topic.topic === 'em' && rTopic.topic.band === 'amber' && rTopic.topic.accuracy === 67 &&
  rTopic.topic.text === '67% on 6 new questions in 14 days, 18% of the exam.',
  'the topic shown is the first judged topic that is not on target (em, 67% on 6); qm has too few to judge');
assert(rTopic.topic.action.href === '#/practice/em/new' && rTopic.topic.action.label === 'Practice 30 untried questions',
  'its action opens that topic\'s untried questions');
var rTopicNone = I.review(dTopic, ctx({ unseenByTopic: { em: 0 } }));
assert(rTopicNone.topic.action.href === '#/topic/em' && rTopicNone.topic.action.label === 'Open the topic',
  'with nothing untried in the topic the action opens the topic page');
assert(rTopic.judgedTopics === 2 && rGood.topic === null && rGood.judgedTopics >= 1,
  'when every judged topic is on target no topic is singled out');
assert(rEmpty.topic === null && rEmpty.judgedTopics === 0, 'no topic is judged for a new user');

/* ——— The opened row ——— */
console.log('\nthe opened row');
assert(r0.rows.every(function (r) {
  return r.how.length >= 1 && r.cuts.length === 3 && r.cuts.map(function (c) { return c.band; }).join(',') === 'green,amber,red';
}), 'every row explains how it is computed and lists its three bands');
assert(r0.row.newQuestions.cuts.map(function (c) { return c.text; }).join(' | ') === '15 or more | 8 to 14 | under 8' &&
  r0.row.paceSec.cuts.map(function (c) { return c.text; }).join(' | ') === '103 s or under | 104 to 130 s | over 130 s' &&
  r0.row.firstAttemptAccuracy.cuts.map(function (c) { return c.text; }).join(' | ') === '75% or more | 60 to 74% | under 60%' &&
  r0.row.repeatMinutes.cuts.map(function (c) { return c.text; }).join(' | ') === '20 min or under | 21 to 40 min | over 40 min',
  'the band limits printed are the thresholds compute() uses');
assert(r0.row.newQuestions.links.map(function (a) { return a.href; }).join(',') === '#/practice/pack/17,#/practice/all/new' &&
  r0.row.repeatMinutes.links[0].href === '#/mistakes' && r0.row.firstAttemptAccuracy.links[0].href === '#/history' &&
  r0.row.paceSec.links[0].href === '#/analytics' &&
  r0.row.coverage.links.map(function (a) { return a.href; }).join(',') === '#/practice/pack/17,#/plan',
  'each opened row links to the place that moves it');
assert(/14 new questions\.$/.test(r0.row.newQuestions.how[1]) &&
  /\(3 timed\)/.test(r0.row.paceSec.how[0]) && /13 of 14\.$/.test(r0.row.firstAttemptAccuracy.how[0]) &&
  /\(4 retakes\)/.test(r0.row.repeatMinutes.how[0]),
  'the explanations carry the counts behind each number');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed) process.exitCode = 1;
