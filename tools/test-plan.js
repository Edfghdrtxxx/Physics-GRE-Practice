#!/usr/bin/env node
/* Unit tests for the generated plan + runtime weekTasks resolver.
   Run: node tools/test-plan.js */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var root = path.resolve(__dirname, '..');
var dataSrc = fs.readFileSync(path.join(root, 'js', 'data-plan.js'), 'utf8');
var engineSrc = fs.readFileSync(path.join(root, 'js', 'plan-engine.js'), 'utf8');

var sandbox = {
  window: null,
  PGRE: {},
  console: console,
  Date: Date,
  Math: Math,
  JSON: JSON,
  String: String,
  Number: Number,
  Array: Array,
  Object: Object,
  parseInt: parseInt,
  isNaN: isNaN
};
sandbox.window = sandbox;
sandbox.PGRE = sandbox.PGRE;
sandbox.PGRE.store = {
  state: { plan: {} },
  today: function () { return '2026-09-11'; }
};
vm.createContext(sandbox);
vm.runInContext(dataSrc, sandbox);
vm.runInContext(engineSrc, sandbox);

var PGRE = sandbox.PGRE;
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

function weekById(id) {
  var all = PGRE.planWeeks();
  for (var i = 0; i < all.length; i++) {
    if (all[i].week.id === id) return all[i].week;
  }
  return null;
}

function ids(tasks) {
  return tasks.map(function (t) { return t.id; });
}

function timedIds(tasks) {
  return tasks.filter(function (t) { return t.kind === 'timed'; }).map(function (t) { return t.id; });
}

function resetPlan(plan) {
  PGRE.store.state.plan = plan || {};
}

assert(PGRE.PLAN && PGRE.PLAN.length === 3, '3 phases');
assert(PGRE.planWeeks().length === 8, '8 weeks');

var weeks = PGRE.planWeeks().map(function (x) { return x.week; });
assert(weeks[0].start === '2026-09-07', 'first start Sep 7');
assert(weeks[weeks.length - 1].end === '2026-11-01', 'last end Nov 1');
var contig = true;
for (var i = 0; i < weeks.length; i++) {
  var w = weeks[i];
  if (w.tasks) { contig = false; console.log('  note — ' + w.id + ' still has .tasks'); }
  if (i > 0) {
    var prevEnd = new Date(weeks[i - 1].end + 'T00:00:00Z');
    prevEnd.setUTCDate(prevEnd.getUTCDate() + 1);
    if (prevEnd.toISOString().slice(0, 10) !== w.start) contig = false;
  }
}
assert(contig && !weeks.some(function (x) { return x.tasks; }), 'contiguous Sep 7→Nov 1, no static .tasks');

var w1 = weekById('w1');
var w2 = weekById('w2');
assert(w1 && w1.timedSets && w1.timedSets.join(',') === '3,4,5,6,7', 'w1 default timed = 03–07');
assert(weekById('w0').historical === true, 'w0.historical === true');

resetPlan({});
var w1none = PGRE.weekTasks(w1);
assert(timedIds(w1none).join(',') === 'set-02,set-03,set-04,set-05,set-06',
  'set-02 absent → carried timed 02–06');
assert(w1none.some(function (t) { return t.id === 'set-07' && t.kind === 'extra-set'; }),
  'set-02 absent → set-07 extra-set on w1');
var w2carried = PGRE.weekTasks(w2);
assert(w2carried.some(function (t) { return t.id === 'set-07' && t.kind === 'extra-set'; }),
  'carried → w2 also has set-07 extra-set');

resetPlan({ 'set-02': { done: '2026-09-14T12:00:00.000Z', xpGranted: true } });
var w1late = PGRE.weekTasks(w1);
assert(timedIds(w1late).join(',') === 'set-02,set-03,set-04,set-05,set-06',
  "done='2026-09-14T12:00:00.000Z' → carried");
assert(w1late.some(function (t) { return t.id === 'set-07' && t.kind === 'extra-set'; }),
  'late done → set-07 extra-set');

resetPlan({ 'set-02': { done: '2026-09-12T12:00:00.000Z', xpGranted: true } });
var w1early = PGRE.weekTasks(w1);
assert(timedIds(w1early).join(',') === 'set-03,set-04,set-05,set-06,set-07',
  'done local date < Sep 14 → not carried');
assert(!w1early.some(function (t) { return t.kind === 'extra-set'; }),
  'not carried → w1 no extra-set');
assert(!PGRE.weekTasks(w2).some(function (t) { return t.kind === 'extra-set'; }),
  'w2 without carry has no extra-set');

resetPlan({});
var w3 = PGRE.weekTasks(weekById('w3'));
var w6 = PGRE.weekTasks(weekById('w6'));
assert(w3.some(function (t) { return t.id === 'w3-checkpoint' && t.kind === 'checkpoint'; }),
  'w3 checkpoint task present');
assert(w6.some(function (t) { return t.id === 'gr9677' && t.kind === 'mock'; }),
  'w6 emits the GR9677 mock task');
assert(!w6.some(function (t) { return t.id === 'w6-checkpoint'; }),
  'w6 checkpoint folds into the mock row (no duplicate sitting)');

var w7 = PGRE.weekTasks(weekById('w7'));
var w7ids = ids(w7);
assert(w7ids.indexOf('set-32') !== -1 && w7ids.indexOf('set-33') !== -1, 'w7 has set-32/33');
assert(w7ids.indexOf('w7-replay-1') !== -1, 'w7-replay-1');
assert(w7ids.indexOf('w7-replay-2') !== -1, 'w7-replay-2');
assert(w7ids.indexOf('w7-logistics') !== -1, 'w7 logistics');
assert(w7ids.indexOf('w7-rest') !== -1, 'w7 rest');
assert(w7ids.indexOf('w7-exam') !== -1, 'w7 exam');
assert(timedIds(w7).join(',') === 'set-32,set-33', 'w7 has no other timed sets');

var allOk = true;
PGRE.planWeeks().forEach(function (row) {
  PGRE.weekTasks(row.week).forEach(function (t) {
    if (!t.id || !t.label || typeof t.hours !== 'number' || typeof t.xp !== 'number') allOk = false;
    if (t.id.indexOf('set-') === 0) {
      var num = t.id.slice(4);
      if (!PGRE.PLAN_SETS[num]) allOk = false;
    }
  });
});
assert(allOk, 'every resolved task has id/label/hours/xp; every set id has a PLAN_SETS title');

assert(PGRE.currentWeek('2026-10-04').week.id === 'w3', "currentWeek('2026-10-04')→w3");
assert(PGRE.currentWeek('2026-11-01').week.id === 'w7', "currentWeek('2026-11-01')→w7");
assert(PGRE.currentWeek('2026-09-11').week.id === 'w0', "currentWeek('2026-09-11')→w0");

function allMocks() {
  var out = [];
  PGRE.PLAN.forEach(function (ph) {
    (ph.weeks || []).forEach(function (w) {
      (w.mocks || []).forEach(function (t) { out.push(t); });
    });
  });
  return out;
}
var mocks = allMocks();
var mockIds = mocks.map(function (t) { return String(t.id).toLowerCase(); });
['ets2024', 'gr1777', 'gr9677'].forEach(function (id) {
  assert(mockIds.indexOf(id) !== -1, 'PLAN schedules ' + id);
});
var mockDates = mocks.map(function (t) { return t.date; });
assert(mockDates.length === 3, '3 scheduled mocks');
assert(new Set(mockDates).size === 3, 'mock dates distinct');
assert(mockDates.every(function (d) { return d && d < '2026-11-01'; }), 'mocks before exam day');
assert(mocks.every(function (t) {
  return t.label && typeof t.xp === 'number' && t.kind === 'mock';
}), 'mock task shape: label, xp, kind');
assert(mockIds.indexOf('gr8677') === -1 && mockIds.indexOf('gr9277') === -1,
  'GR8677/GR9277 are not scheduled mocks');


if (failed) {
  console.log('\n' + failed + ' failed, ' + passed + ' passed');
  process.exit(1);
}
console.log('\nAll ' + passed + ' assertions passed.');
