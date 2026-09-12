#!/usr/bin/env node
/* Regression tests for cross-tab persistence in js/store.js.
   Two vm contexts share one localStorage stub; writes deliver a 'storage'
   event to the OTHER tab only (matching browser semantics). Covers the
   reproduced clobber: an idle tab's pagehide flush used to erase a study
   tab's recorded attempt. Run: node tools/test-store-persist.js */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var root = path.resolve(__dirname, '..');
var storeSrc = fs.readFileSync(path.join(root, 'js', 'store.js'), 'utf8');

var passed = 0;
var failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log('  ok  — ' + msg); }
  else { failed++; console.log('  FAIL — ' + msg); }
}

/* Shared localStorage: setItem fires 'storage' on every OTHER tab's
   listeners, like a real browser (the writer never sees its own event).
   deliver=false simulates a missed event for the pre-save merge path. */
var disk = {};
var tabs = [];
var deliverEvents = true;
var localStorageStub = {
  getItem: function (k) { return k in disk ? disk[k] : null; },
  setItem: function (k, v) {
    disk[k] = String(v);
    if (!deliverEvents) return;
    tabs.forEach(function (t) {
      t.listeners.forEach(function (fn) { fn({ key: k, newValue: disk[k] }); });
    });
  },
  removeItem: function (k) { delete disk[k]; }
};

function makeTab() {
  var tab = { listeners: [] };
  var sandbox = {
    console: console,
    localStorage: localStorageStub,
    window: {
      addEventListener: function (type, fn) { if (type === 'storage') tab.listeners.push(fn); },
      indexedDB: null
    },
    setTimeout: setTimeout,
    Promise: Promise
  };
  sandbox.window.PGRE = {};
  sandbox.PGRE = sandbox.window.PGRE;
  vm.createContext(sandbox);
  vm.runInContext(storeSrc, sandbox);
  tab.PGRE = sandbox.PGRE;
  tab.store = sandbox.PGRE.store;
  tabs.push(tab);
  return tab;
}

function todayStr() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function seedState() {
  var s = tab1.store.defaults();
  s.today.date = todayStr();
  s.migrations = { ankiReset2026: 'x', planRebuild2026: 'x', easy10: 'x' };
  return s;
}

function diskState() { return JSON.parse(disk[tab1.store.KEY]); }

/* --- setup: tab1 loads fresh defaults, both tabs open --------------------- */
var tab1 = makeTab();
disk[tab1.store.KEY] = JSON.stringify((function () {
  var s = tab1.store.defaults();
  s.today.date = todayStr();
  s.migrations = { ankiReset2026: 'x', planRebuild2026: 'x', easy10: 'x' };
  return s;
})());
tab1.store.load();
var tab2 = makeTab();
tab2.store.load();

console.log('baseline: both tabs loaded, rev counter present');
assert(typeof tab1.store.state._rev === 'number', 'state carries _rev after load');
assert(typeof tab1.store.state._epoch === 'number', 'state carries _epoch after load');

console.log('\nstorage event keeps the idle tab current');
tab1.store.state.attempts.push({ ts: 't1', qid: 'q01', sid: 's1', correct: true });
tab1.store.state.xp = 10;
tab1.store.save();
assert(tab2.store.state.attempts.length === 1 && tab2.store.state.attempts[0].qid === 'q01',
  'idle tab adopted the sibling attempt via storage event');
assert(tab2.store.state.xp === 10, 'idle tab adopted sibling xp');
assert(tab2.store.state._rev === tab1.store.state._rev, 'idle tab tracks the written _rev');

console.log('\nTHE CLOBBER: idle tab pagehide save must not erase sibling work');
tab2.store.save(); // the old bug: stale heap overwrote disk wholesale
var d = diskState();
assert(d.attempts.length === 1 && d.attempts[0].qid === 'q01',
  'attempt survives the idle tab\'s save (was: erased by stale heap)');
assert(d.xp === 10, 'xp survives the idle tab\'s save');

console.log('\nmissed storage event: save() still merges disk before writing');
deliverEvents = false;
tab1.store.state.attempts.push({ ts: 't2', qid: 'q02', sid: 's1', correct: false });
tab1.store.save();                       // tab2 never sees this write
assert(tab2.store.state.attempts.length === 1, 'tab2 heap is stale (missed event)');
tab2.store.state.attempts.push({ ts: 't3', qid: 'q03', sid: 's2', correct: true });
tab2.store.save();                       // pre-save read must merge q02, keep q03
d = diskState();
var qids = d.attempts.map(function (a) { return a.qid; }).sort();
assert(qids.join(',') === 'q01,q02,q03',
  'disk unions both tabs\' attempts after missed event, got ' + qids.join(','));
assert(tab2.store.state.attempts.length === 3, 'saving tab absorbed sibling attempt into its heap');
deliverEvents = true;

console.log('\nper-day studyLog merge takes max, never sums');
deliverEvents = false;
tab1.store.state.studyLog[todayStr()] = 100;
tab1.store.save();                       // tab2 misses this write
tab2.store.state.studyLog[todayStr()] = 60;
tab2.store.save();                       // pre-save merge must keep 100, not sum/overwrite
assert(diskState().studyLog[todayStr()] === 100, 'studyLog day keeps the larger value');
deliverEvents = true;

console.log('\nreset() bumps epoch: siblings adopt wholesale, no resurrection');
tab1.store.reset();
d = diskState();
assert(d.attempts.length === 0 && d.xp === 0, 'reset writes a clean state');
assert(tab2.store.state.attempts.length === 0 && tab2.store.state.xp === 0,
  'sibling adopted the reset wholesale via storage event');
deliverEvents = false;
tab2.store.state.attempts.push({ ts: 't9', qid: 'qGhost', sid: 's2' }); // pre-reset leftover work
tab2.store.save();
d = diskState();
assert(d.attempts.length === 1 && d.attempts[0].qid === 'qGhost',
  'post-reset save keeps only genuinely new work (epoch blocks resurrecting q01-q03)');
assert(d.attempts.every(function (a) { return a.qid !== 'q01'; }), 'pre-reset attempts stay deleted');
deliverEvents = true;

console.log('\ntombstones: a missed-event sibling cannot resurrect a deleted note');
tab1.store.state.notes['q09'] = { text: 'keep', updatedAt: '2026-09-12T00:00:00Z' };
tab1.store.save();                       // tab2 adopts q09
deliverEvents = false;
tab1.store.tombstone('notes', 'q09');
delete tab1.store.state.notes['q09'];
tab1.store.save();                       // tab2 misses the delete
tab2.store.state.xp = 42;                // tab2 still holds q09 in its heap
tab2.store.save();                       // stale heap must not resurrect it
d = diskState();
assert(!d.notes.q09, 'deleted note stays deleted after stale sibling save');
assert(d.tombstones && d.tombstones.notes && d.tombstones.notes.q09,
  'tombstone persisted to disk');
tab1.store.untombstone('notes', 'q09');
tab1.store.state.notes['q09'] = { text: 're-added', updatedAt: '2026-09-14T00:00:00Z' };
tab1.store.save();
assert(diskState().notes.q09.text === 're-added',
  'deliberate re-add clears the tombstone and persists');
deliverEvents = true;

console.log('\nepoch: a missed sibling wipe beats a stale heap save');
deliverEvents = false;
tab1.store.reset();                      // epoch E2 via _maxEpoch(disk); tab2 misses it
tab2.store.state.attempts.push({ ts: 'tz', qid: 'qStale', sid: 's9' });
tab2.store.save();                       // adopts the wipe; its unsaved mutation is discarded
d = diskState();
assert(d.attempts.length === 0, 'higher-epoch wipe wins over stale sibling save');
assert(tab2.store.state._epoch === d._epoch, 'sibling adopted the wipe epoch');
deliverEvents = true;

console.log('\nformulaDay merge unions softIds and drops orphaned pins');
deliverEvents = false;
var todayD = todayStr();
tab1.store.state.formulaDay = { date: todayD, reviewIds: ['a'], newIds: [], softIds: ['a'] };
tab1.store.save();
tab2.store.state.formulaDay = { date: todayD, reviewIds: ['c'], newIds: [], softIds: ['c'] };
tab2.store.save();
d = diskState();
assert(d.formulaDay.reviewIds.sort().join(',') === 'a,c', 'reviewIds unioned');
assert(d.formulaDay.softIds.sort().join(',') === 'a,c',
  'softIds unioned (was: silently dropped)');
deliverEvents = true;

console.log('\nonStateAdopted hook fires on adopt');
var fired = 0;
tab2.PGRE.onStateAdopted = function () { fired++; };
tab1.store.state.xp = 99;
tab1.store.save();
assert(fired === 1, 'hook fired once on the sibling\'s write');
assert(tab2.store.state.xp === 99, 'hook saw the adopted state');

console.log('\nsingle-tab regression: save round-trips and rev increments');
var revBefore = tab1.store.state._rev;
tab1.store.state.notes['q01'] = { text: 'hi', updatedAt: 't' };
tab1.store.save();
d = diskState();
assert(d._rev === revBefore + 1, '_rev increments each save');
assert(d.notes.q01.text === 'hi', 'normal writes still persist');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
