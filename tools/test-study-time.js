#!/usr/bin/env node
/* Passive study-time tracker gap cap. Loads shipped js/study-time.js.
   A 90 s gap credits 90 s, 120 s credits 120 s, 300 s credits 120 s;
   a hidden tab credits nothing; liveTodaySec caps the open gap at 120 s.
   Run: node tools/test-study-time.js */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var root = path.resolve(__dirname, '..');
var src = fs.readFileSync(path.join(root, 'js', 'study-time.js'), 'utf8');

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

var RealDate = Date;
var nowMs = new RealDate(2026, 9, 13, 12, 0, 0, 0).getTime();
function ClockDate() {
  if (!(this instanceof ClockDate)) {
    if (arguments.length === 0) return RealDate(nowMs);
    return RealDate.apply(null, arguments);
  }
  if (arguments.length === 0) return new RealDate(nowMs);
  if (arguments.length === 1) return new RealDate(arguments[0]);
  if (arguments.length === 2) return new RealDate(arguments[0], arguments[1]);
  if (arguments.length === 3) return new RealDate(arguments[0], arguments[1], arguments[2]);
  if (arguments.length === 4) {
    return new RealDate(arguments[0], arguments[1], arguments[2], arguments[3]);
  }
  if (arguments.length === 5) {
    return new RealDate(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4]);
  }
  if (arguments.length === 6) {
    return new RealDate(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4], arguments[5]);
  }
  return new RealDate(arguments[0], arguments[1], arguments[2], arguments[3],
    arguments[4], arguments[5], arguments[6]);
}
ClockDate.now = function () { return nowMs; };
ClockDate.parse = RealDate.parse;
ClockDate.UTC = RealDate.UTC;
ClockDate.prototype = RealDate.prototype;

var hidden = false;
var docListeners = {};
var winListeners = {};
var saves = 0;
var studyLog = {};
var timer = {};
var PGRE = {
  store: {
    state: { studyLog: studyLog, timer: timer },
    save: function () { saves++; }
  }
};

var documentStub = {
  get hidden() { return hidden; },
  addEventListener: function (type, fn) { docListeners[type] = fn; }
};
var windowStub = {
  PGRE: PGRE,
  addEventListener: function (type, fn) { winListeners[type] = fn; }
};

var sandbox = {
  window: windowStub,
  document: documentStub,
  PGRE: PGRE,
  Date: ClockDate,
  Math: Math,
  String: String,
  Number: Number,
  Object: Object,
  console: console
};
vm.createContext(sandbox);
vm.runInContext(src, sandbox);

var st = sandbox.PGRE.studyTime;
if (!st || typeof st.start !== 'function') {
  console.error('FAIL: shipped study-time.js did not export PGRE.studyTime');
  process.exit(1);
}

st.start();
var click = docListeners.click;
var vis = docListeners.visibilitychange;
if (typeof click !== 'function' || typeof vis !== 'function') {
  console.error('FAIL: start() did not bind click and visibilitychange');
  process.exit(1);
}

var T0 = new RealDate(2026, 9, 13, 12, 0, 0, 0).getTime();
var DAY = '2026-10-13';

function fresh() {
  Object.keys(PGRE.store.state.studyLog).forEach(function (k) {
    delete PGRE.store.state.studyLog[k];
  });
  PGRE.store.state.timer = {};
  hidden = false;
  st.resetBeat();
  nowMs = T0;
}

function beatClick(atMs) {
  nowMs = atMs;
  click({ type: 'click' });
}

function beatVis(atMs) {
  nowMs = atMs;
  vis({ type: 'visibilitychange' });
}

console.log('study-time gap cap (shipped js/study-time.js)\n');

console.log('90 s gap credits 90 s');
fresh();
beatClick(T0);
beatClick(T0 + 90 * 1000);
assert(st.todaySec() === 90, 'todaySec is 90 after a 90 s gap');
assert(PGRE.store.state.studyLog[DAY] === 90, 'studyLog[' + DAY + '] is 90');

console.log('\n120 s gap credits 120 s');
fresh();
beatClick(T0);
beatClick(T0 + 120 * 1000);
assert(st.todaySec() === 120, 'todaySec is 120 after a 120 s gap');
assert(PGRE.store.state.studyLog[DAY] === 120, 'studyLog[' + DAY + '] is 120');

console.log('\n300 s gap credits exactly 120 s');
fresh();
beatClick(T0);
beatClick(T0 + 300 * 1000);
assert(st.todaySec() === 120, 'todaySec is 120 after a 300 s gap');
assert(PGRE.store.state.studyLog[DAY] === 120, 'studyLog[' + DAY + '] is 120, not 300');

console.log('\nhidden tab credits nothing');
fresh();
beatClick(T0);
hidden = true;
beatVis(T0 + 1);
assert(st.todaySec() < 1, 'hiding credits only the 1 ms visible tail, not a full gap');
var afterHide = st.todaySec();
beatClick(T0 + 90 * 1000);
assert(st.todaySec() === afterHide, 'clicks while hidden add no studyLog seconds');
hidden = false;
beatVis(T0 + 90 * 1000);
assert(st.todaySec() === afterHide, 'becoming visible does not credit the hidden span');
beatClick(T0 + 100 * 1000);
assert(st.todaySec() === afterHide + 10, 'visible time after return credits the new gap');

console.log('\nliveTodaySec caps the open gap at 120 s and does not write');
fresh();
beatClick(T0);
nowMs = T0 + 90 * 1000;
assert(st.liveTodaySec() === 90, 'open 90 s gap displays 90');
nowMs = T0 + 120 * 1000;
assert(st.liveTodaySec() === 120, 'open 120 s gap displays 120');
nowMs = T0 + 300 * 1000;
var beforeLog = JSON.stringify(PGRE.store.state.studyLog);
assert(st.liveTodaySec() === 120, 'open 300 s gap displays 120, not 300');
assert(st.todaySec() === 0, 'liveTodaySec does not bank the open gap');
assert(JSON.stringify(PGRE.store.state.studyLog) === beforeLog,
  'liveTodaySec does not mutate studyLog');
hidden = true;
assert(st.liveTodaySec() === 0, 'hidden tab liveTodaySec ignores the open gap');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
