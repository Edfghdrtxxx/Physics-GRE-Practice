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
tab1.store.state.notes['q09'] = { text: 're-added', updatedAt: '2099-01-01T00:00:00Z' };
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

console.log('\ncards: stale sibling save must not rewind a newer review');
deliverEvents = false;
tab1.store.state.cards['card-clobber'] = {
  reviews: 6, due: '2026-09-25', lastReviewedAt: '2026-09-15T12:00:00Z',
  interval: 10, ease: 2.5, lastGrade: 'good'
};
tab1.store.save();                       // tab2 misses this write
tab2.store.state.cards['card-clobber'] = {
  reviews: 5, due: '2026-09-16', lastReviewedAt: '2026-09-14T12:00:00Z',
  interval: 1, ease: 2.5, lastGrade: 'good'
};
assert(tab2.store.state.cards['card-clobber'].reviews === 5, 'tab2 heap is stale (missed event)');
tab2.store.save();                       // pre-save merge must keep tab1's card
d = diskState();
assert(d.cards['card-clobber'].reviews === 6,
  'disk kept the newer card (was: stale reviews/due clobber)');
assert(d.cards['card-clobber'].due === '2026-09-25', 'disk kept the later due');
deliverEvents = true;

console.log('\ncards: live stale heap heals when disk has higher reviews');
tab2.store.state.cards['card-heal'] = {
  reviews: 2, due: '2026-09-12', lastReviewedAt: '2026-09-08T00:00:00Z'
};
tab1.store.state.cards['card-heal'] = {
  reviews: 4, due: '2026-09-22', lastReviewedAt: '2026-09-15T00:00:00Z'
};
tab1.store.save();                       // storage event must adopt into tab2
assert(tab2.store.state.cards['card-heal'].reviews === 4,
  'storage event adopted the newer disk card into the stale heap');
assert(tab2.store.state.cards['card-heal'].due === '2026-09-22',
  'healed card kept the later due');

console.log('\ncards: equal reviews, later lastReviewedAt wins');
deliverEvents = false;
tab1.store.state.cards['card-tie'] = {
  reviews: 3, due: '2026-09-20', lastReviewedAt: '2026-09-15T10:00:00Z'
};
tab1.store.save();
tab2.store.state.cards['card-tie'] = {
  reviews: 3, due: '2026-09-18', lastReviewedAt: '2026-09-14T10:00:00Z'
};
tab2.store.save();
d = diskState();
assert(d.cards['card-tie'].lastReviewedAt === '2026-09-15T10:00:00Z',
  'later lastReviewedAt wins on a reviews tie');
assert(d.cards['card-tie'].due === '2026-09-20', 'tied-reviews winner keeps its due');
deliverEvents = true;

console.log('\nmistakes: higher misses+solves wins on collision');
deliverEvents = false;
tab1.store.state.mistakes['q-mk'] = {
  misses: 3, solves: 2, firstMissedAt: '2026-09-01T00:00:00Z'
};
tab1.store.save();
tab2.store.state.mistakes['q-mk'] = {
  misses: 2, solves: 1, firstMissedAt: '2026-09-01T00:00:00Z',
  archivedAt: '2026-09-14T00:00:00Z'
};
tab2.store.save();
d = diskState();
assert(d.mistakes['q-mk'].misses === 3 && d.mistakes['q-mk'].solves === 2,
  'disk kept the more-advanced mistake record');
assert(!d.mistakes['q-mk'].archivedAt,
  'stale archive flag did not beat higher misses+solves');
deliverEvents = true;

console.log('\ncards: equal reviews+lastReviewedAt, later due wins (migrateEasy10 shape)');
deliverEvents = false;
tab1.store.state.cards['card-easy'] = {
  reviews: 5, lastReviewedAt: '2026-09-10T00:00:00Z', due: '2026-10-01', lastGrade: 'easy'
};
tab1.store.save();
tab2.store.state.cards['card-easy'] = {
  reviews: 5, lastReviewedAt: '2026-09-10T00:00:00Z', due: '2026-09-20', lastGrade: 'easy'
};
tab2.store.save();
assert(diskState().cards['card-easy'].due === '2026-10-01',
  'later due survives a stale sibling save (was: migrateEasy10 clobber)');
deliverEvents = true;

console.log('\nmistakes: equal counters, later lastTouchedAt wins (archive flag)');
deliverEvents = false;
tab1.store.state.mistakes['q-arch'] = {
  misses: 2, solves: 1, firstMissedAt: '2026-09-01T00:00:00Z',
  archivedAt: '2026-09-15T12:00:00Z', lastTouchedAt: '2026-09-15T12:00:00Z'
};
tab1.store.save();
tab2.store.state.mistakes['q-arch'] = {
  misses: 2, solves: 1, firstMissedAt: '2026-09-01T00:00:00Z',
  archivedAt: null, lastTouchedAt: '2026-09-10T00:00:00Z'
};
tab2.store.save();
d = diskState();
assert(d.mistakes['q-arch'].archivedAt === '2026-09-15T12:00:00Z',
  'disk kept the archived record (later lastTouchedAt, equal counters)');
assert(d.mistakes['q-arch'].lastTouchedAt === '2026-09-15T12:00:00Z',
  'disk kept the newer lastTouchedAt');
deliverEvents = true;

console.log('\nS5 same-millisecond Again beats a longer Good');
deliverEvents = false;
var raceStamp = '2026-10-01T12:00:00.000Z';
tab1.store.state.cards.race = {
  reviews: 6, due: '2026-10-01', lastReviewedAt: raceStamp, lastGrade: 'again', lapses: 1
};
tab1.store.save();
tab2.store.state.cards.race = {
  reviews: 6, due: '2026-10-26', lastReviewedAt: raceStamp, lastGrade: 'good', lapses: 0
};
tab2.store.save();
d = diskState();
assert(d.cards.race.lastGrade === 'again', 'merge keeps Again when the Good due is later');
assert(d.cards.race.due === '2026-10-01', 'merge keeps the Again due, not the longer Good due');
deliverEvents = true;

console.log('\nS3 formulaStudy treats done as a count');
deliverEvents = false;
tab1.store.state.formulaStudy = {
  done: 1, pressCount: 1, queueIds: ['toy-b'], date: todayStr(), completed: false
};
tab1.store.save();
tab2.store.state.formulaStudy = {
  done: 0, pressCount: 0, queueIds: ['toy-a', 'toy-b'], date: todayStr(), completed: false
};
tab2.store.save();
d = diskState();
assert(d.formulaStudy && d.formulaStudy.done === 1,
  'a stale done:0 snapshot does not beat a session with done 1');
assert(d.formulaStudy.queueIds.join(',') === 'toy-b',
  'the more advanced queue is the one that persists');
tab1.store.clearFormulaStudy({ id: 'sess-1', done: 1, _opAt: 5000 });
tab1.store.save();
tab2.store.state.formulaStudy = {
  id: 'sess-1', done: 0, pressCount: 0, queueIds: ['toy-a', 'toy-b'],
  date: todayStr(), _opAt: 1000, completed: false
};
tab2.store.save();
assert(diskState().formulaStudy == null, 'a cleared session is not resurrected by a stale snapshot');
tab1.store.state.formulaStudy = {
  id: 'sess-2', done: 0, pressCount: 0, queueIds: ['n'], _opAt: 9000, completed: false
};
tab1.store.save();
assert(diskState().formulaStudy && diskState().formulaStudy.id === 'sess-2',
  'a newer session after a clear is kept');
deliverEvents = false;
tab1.store.state.formulaStudy = null;
tab1.store.state.formulaStudyEnd = {
  id: 'done-1', done: 3, completed: true, _opAt: 50, _opId: 'end'
};
tab1.store.save();
tab2.store.state.formulaStudyEnd = null;
tab2.store.state.formulaStudy = {
  id: 'other', done: 8, pressCount: 8, queueIds: ['z']
};
tab2.store.save();
assert(diskState().formulaStudy == null,
  'a different session with no timestamp does not resurrect a finished one');
tab1.store.state.formulaStudyEnd = null;
tab1.store.state.formulaStudy = {
  id: 'tie', done: 1, pressCount: 1, queueIds: ['a'],
  _opAt: 80, _opId: 'm', completed: true
};
tab1.store.save();
tab2.store.state.formulaStudyEnd = null;
tab2.store.state.formulaStudy = {
  id: 'tie', done: 0, pressCount: 9, queueIds: ['b'],
  _opAt: 80, _opId: 'm', completed: false
};
tab2.store.save();
assert(diskState().formulaStudy && diskState().formulaStudy.completed === true,
  'a finished snapshot beats a higher press count at the same time');
tab1.store.state.formulaStudy = {
  id: 'tie', done: 1, pressCount: 1, queueIds: ['a'], _opAt: 90, _opId: 'a'
};
tab1.store.save();
tab2.store.state.formulaStudy = {
  id: 'tie', done: 2, pressCount: 1, queueIds: ['b'], _opAt: 90, _opId: 'z'
};
tab2.store.save();
assert(diskState().formulaStudy && diskState().formulaStudy._opId === 'z',
  'equal _opAt keeps the greater _opId');
deliverEvents = true;

console.log('\nS4 an undo tombstone beats a sibling copy of the grade');
deliverEvents = false;
tab1.store.state.cards['undo-card'] = {
  reviews: 6, due: '2026-10-26', lastReviewedAt: '2026-10-01T00:00:00.000Z',
  lastGrade: 'good', lastReviewOpId: 'op-good'
};
tab1.store.state.cardReviews = tab1.store.state.cardReviews || [];
tab1.store.state.cardReviews.push({
  op: 'op-good', id: 'undo-card', d: '2026-10-01', g: 'good'
});
tab1.store.save();
tab2.store.state.reviewUndos = {
  'op-good': {
    at: '2026-10-01T00:00:01.000Z', cardId: 'undo-card',
    prev: {
      reviews: 5, due: '2026-10-11', lastReviewedAt: '2026-09-01T00:00:00.000Z', lastGrade: 'good'
    }
  }
};
tab2.store.state.cards['undo-card'] = {
  reviews: 5, due: '2026-10-11', lastReviewedAt: '2026-09-01T00:00:00.000Z', lastGrade: 'good'
};
tab2.store.save();
d = diskState();
assert(d.cards['undo-card'] && d.cards['undo-card'].reviews === 5,
  'undo keeps the pre-grade card when a sibling still has the grade');
assert(!(d.cardReviews || []).some(function (r) { return r && r.op === 'op-good'; }),
  'the undone review row stays out of the merged log');
deliverEvents = true;

console.log('\nsubscribeStateAdopted runs beside onStateAdopted');
var hookN = 0, subN = 0;
tab2.PGRE.onStateAdopted = function () { hookN++; };
var unsub = tab2.PGRE.subscribeStateAdopted(function () { subN++; });
tab1.store.state.xp = (tab1.store.state.xp || 0) + 1;
tab1.store.save();
assert(hookN === 1 && subN === 1, 'the timer hook and a subscriber both see one adopt');
unsub();
tab1.store.state.xp = (tab1.store.state.xp || 0) + 1;
tab1.store.save();
assert(hookN === 2 && subN === 1, 'unsubscribe removes only the subscriber');

console.log('\nI2 and I3 formulaDeck reports missing sources and keeps prototype ids');
var deckPGRE = tab1.PGRE;
deckPGRE.BOOK_FORMULAS = undefined;
deckPGRE.FORMULAS = [{ id: 'pub' }];
deckPGRE.BOOK_LISTS = [{ id: 'list' }];
deckPGRE.formulaDeck().then(function (missingDeck) {
  assert(Array.isArray(missingDeck), 'formulaDeck still resolves to an array when a private source is missing');
  assert(missingDeck.map(function (c) { return c.id; }).indexOf('pub') !== -1,
    'the public cards are still in the partial deck');
  var st = deckPGRE.formulaDeckStatus;
  assert(st && st.partial === true, 'a missing private source sets formulaDeckStatus.partial');
  assert(st.missing.indexOf('bookFormulas') !== -1, 'formulaDeckStatus.missing names bookFormulas');
  assert(st.sources.bookFormulas === 'missing', 'sources.bookFormulas is missing');
  assert(st.sources.indexedDB === 'unavailable', 'a missing IndexedDB is reported as unavailable');
  assert(st.missing.indexOf('indexedDB') !== -1, 'formulaDeckStatus.missing names indexedDB');
  deckPGRE.BOOK_FORMULAS = [];
  deckPGRE.FORMULAS = [{ id: 'pub' }];
  deckPGRE.BOOK_LISTS = [];
  var realGet = deckPGRE.contentDB.get;
  deckPGRE.contentDB.get = function () {
    return Promise.resolve({
      cards: [
        { id: 'constructor' }, { id: 'toString' }, { id: '__proto__' }, { id: 'audit-safe' }
      ]
    });
  };
  return deckPGRE.formulaDeck().then(function (protoDeck) {
    deckPGRE.contentDB.get = realGet;
    var ids = protoDeck.map(function (c) { return c.id; });
    assert(ids.indexOf('constructor') !== -1, 'constructor survives dedupe');
    assert(ids.indexOf('toString') !== -1, 'toString survives dedupe');
    assert(ids.indexOf('__proto__') !== -1, '__proto__ survives dedupe');
    assert(ids.indexOf('audit-safe') !== -1, 'an ordinary id still survives beside prototype names');
    assert(ids.indexOf('pub') !== -1, 'script cards stay in front of the IndexedDB cards');
  });
}).then(function () {
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
}).catch(function (err) {
  console.error('FAIL: formulaDeck checks rejected', err);
  process.exit(1);
});
