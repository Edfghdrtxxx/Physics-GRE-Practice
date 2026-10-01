#!/usr/bin/env node
/* Unit tests for the formula picker's save filtering and the auto-pick
   (suggestFormulaDay / autoFillFormulaDay).
   Loads shipped store.js + srs.js (no re-implementation).
   Run: node tools/test-formula-picker.js */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var root = path.resolve(__dirname, '..');
var storeSrc = fs.readFileSync(path.join(root, 'js', 'store.js'), 'utf8');
var srsSrc = fs.readFileSync(path.join(root, 'js', 'srs.js'), 'utf8');

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
if (!srs || typeof srs.suggestFormulaDay !== 'function' || typeof srs.autoFillFormulaDay !== 'function') {
  console.error('FAIL: shipped srs.js did not export suggestFormulaDay / autoFillFormulaDay');
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

function resetStore() {
  store.reset();
  storeState = store.state;
  storeState.cards = {};
  storeState.cardReviews = [];
  storeState.formulaDay = null;
}

function card(id) { return { id: id }; }

var deck = [card('gauss'), card('faraday'), card('angular'), card('ampere')];

console.log('setFormulaDayPicks saves today set only (D6)');
resetStore();
storeState.cards.gauss = {
  reps: 1, interval: 1, ease: 2.5, due: srs.today(), lastReviewedDay: srs.today()
};
storeState.cards.faraday = {
  reps: 2, interval: 8, ease: 2.5, due: '2099-02-01', lastReviewedDay: '2020-01-01'
};
storeState.formulaDay = {
  date: srs.today(), reviewIds: ['gauss'], newIds: []
};

var batch = srs.setFormulaDayPicks(deck, ['ampere']);
assert(batch.newIds.indexOf('ampere') !== -1, 'today pick of a never-studied card is saved');
assert(batch.reviewIds.indexOf('faraday') === -1,
  'learned-only Faraday is not written unless today-selected');
assert(batch.reviewIds.indexOf('gauss') !== -1,
  'studied-today Gauss stays locked in the batch');
assert(batch.newIds.indexOf('angular') === -1, 'unpicked never-studied Angular is not saved');

batch = srs.setFormulaDayPicks(deck, ['ampere', 'faraday']);
assert(batch.reviewIds.indexOf('faraday') !== -1,
  'Faraday is saved only after it is in the today set');
assert(batch.reviewIds.indexOf('gauss') !== -1, 'locked Gauss still kept when Faraday is added');

console.log('\nsuggestFormulaDay — due first, then new in book order, up to target');
resetStore();
var t = srs.today();
var bookDeck = ['supp-a', 'cpgf-3.1', 'cpgf-1.2', 'late', 'cpgf-1.1', 'lapsed', 'plain',
  'future', 'graded', 'shelved', 'cpgf-2.1'].map(card);
function ids(list) { return list.join(','); }
storeState.settings.formulaDailyTarget = 5;
storeState.settings.examDate = '';
storeState.cards.late = { reps: 2, interval: 3, ease: 2.5, lapses: 0, due: srs.addDays(-4) };
storeState.cards.lapsed = { reps: 3, interval: 2, ease: 2.1, lapses: 3, due: t };
storeState.cards.plain = { reps: 2, interval: 2, ease: 2.5, lapses: 0, due: t };
storeState.cards.future = { reps: 2, interval: 9, ease: 2.5, lapses: 0, due: srs.addDays(4) };
storeState.cards.graded = { reps: 1, interval: 1, ease: 2.5, lapses: 1, due: t, lastReviewedDay: t };
storeState.cards.shelved = { reps: 1, interval: 1, ease: 2.5, lapses: 0, due: srs.addDays(-9) };
storeState.formulaSuspended = { shelved: new Date().toISOString() };

var sug = srs.suggestFormulaDay(bookDeck);
assert(ids(sug.reviewIds) === 'late,lapsed,plain',
  'due reviews: most overdue first, then most lapses (got ' + ids(sug.reviewIds) + ')');
assert(ids(sug.newIds) === 'cpgf-1.2,cpgf-1.1',
  'new cards fill the room in chapter order, deck order within a chapter (got ' + ids(sug.newIds) + ')');
assert(sug.reviewIds.indexOf('future') === -1 && sug.reviewIds.indexOf('graded') === -1 &&
  sug.reviewIds.indexOf('shelved') === -1,
  'not-yet-due, graded-today and suspended cards are never auto-picked');
assert(storeState.formulaDay.reviewIds.length === 0 && storeState.formulaDay.newIds.length === 0,
  'suggesting adds nothing to the batch');

storeState.settings.formulaDailyTarget = 2;
sug = srs.suggestFormulaDay(bookDeck);
assert(ids(sug.reviewIds) === 'late,lapsed' && !sug.newIds.length,
  'a due backlog fills the whole target before any new card');
storeState.settings.formulaDailyTarget = 10;
sug = srs.suggestFormulaDay(bookDeck, { fresh: false });
assert(!sug.newIds.length && sug.reviewIds.length === 3, 'fresh:false offers due reviews only');
sug = srs.suggestFormulaDay(bookDeck, { have: { late: 1, 'cpgf-1.2': 1 }, room: 3 });
assert(ids(sug.reviewIds) + '|' + ids(sug.newIds) === 'lapsed,plain|cpgf-1.1',
  'have/room let the picker top up a draft (got ' + ids(sug.reviewIds) + '|' + ids(sug.newIds) + ')');

var d = new Date(); d.setDate(d.getDate() + 5);
storeState.settings.examDate = srs.dayStr(d);
sug = srs.suggestFormulaDay(bookDeck, { have: {}, room: 10 });
assert(!sug.newIds.length, 'final-pass week: new cards stay manual');
storeState.settings.examDate = '';

console.log('\nautoFillFormulaDay — appends, never replaces');
storeState.settings.formulaDailyTarget = 5;
storeState.formulaDay = { date: srs.addDays(-1), reviewIds: [], newIds: ['cpgf-3.1'] };
var filled = srs.autoFillFormulaDay(bookDeck);
assert(ids(filled.newIds) === 'cpgf-3.1,cpgf-1.2' && ids(filled.reviewIds) === 'late,lapsed,plain',
  'an active pick keeps its place; the room under the target is auto-picked (got ' +
    ids(filled.reviewIds) + '|' + ids(filled.newIds) + ')');
assert(filled.date === t, 'the first population of the day stamps today on a carried shell');
assert(typeof filled._opAt === 'number', 'the fill is marked for cross-tab reconciliation');
var again = srs.autoFillFormulaDay(bookDeck);
assert(ids(again.reviewIds) + '|' + ids(again.newIds) === 'late,lapsed,plain|cpgf-3.1,cpgf-1.2',
  'a full list is left alone');
assert(srs.formulaChapter('cpgf-12.3') === 12 && srs.formulaChapter('supp-x') === Infinity,
  'formulaChapter reads the book chapter from the id');
assert(srs.formulaChapter('cpgl-5.03') === 5,
  'formulaChapter reads a book-list id (cpgl-) as its chapter');

console.log('\nlist cards join their chapter, after that chapter’s formulas');
resetStore();
storeState.settings.formulaDailyTarget = 10;
storeState.settings.examDate = '';
var chapterDeck = ['cpgf-1.1', 'cpgf-2.1', 'supp-a', 'cpgl-1.01', 'cpgl-2.01'].map(card);
sug = srs.suggestFormulaDay(chapterDeck, { have: {}, room: 10 });
assert(ids(sug.newIds) === 'cpgf-1.1,cpgl-1.01,cpgf-2.1,cpgl-2.01,supp-a',
  'new cards: chapter, then deck order, so lists follow that chapter’s formulas (got ' +
    ids(sug.newIds) + ')');
assert(!sug.reviewIds.length, 'no card state means the pick is all new cards');

console.log('\nF4 a nonempty partial deck does not durably prune saved ids');
resetStore();
storeState.formulaDay = { date: srs.today(), reviewIds: ['book', 'supp'], newIds: [] };
store.save();
var revBefore = store.state._rev;
sandbox.PGRE.formulaDeckStatus = {
  partial: true, complete: false, missing: ['bookFormulas'],
  sources: { bookFormulas: 'missing', formulas: 'present', bookLists: 'present', indexedDB: 'empty' }
};
var kept = srs.formulaDay([{ id: 'supp' }]);
assert(kept.reviewIds.indexOf('book') !== -1, 'partial read keeps a saved id that is absent from the deck');
assert(kept.reviewIds.indexOf('supp') !== -1, 'partial read keeps an id that is present');
assert(store.state._rev === revBefore, 'partial read does not save a prune');
var picked = srs.setFormulaDayPicks([{ id: 'supp' }], ['supp']);
assert(picked.reviewIds.indexOf('book') !== -1 || picked.newIds.indexOf('book') !== -1,
  'an explicit save during a partial read keeps the unresolved id');
sandbox.PGRE.formulaDeckStatus = {
  partial: false, complete: true, missing: [],
  sources: { bookFormulas: 'present', formulas: 'present', bookLists: 'present', indexedDB: 'empty' }
};
var pruned = srs.formulaDay([{ id: 'supp' }]);
assert(pruned.reviewIds.indexOf('book') === -1 && pruned.newIds.indexOf('book') === -1,
  'a complete deck still drops an id that has left the deck');
assert(pruned.reviewIds.indexOf('supp') !== -1 || pruned.newIds.indexOf('supp') !== -1,
  'a complete deck keeps the id that is still there');

console.log('\nI3 prototype-name ids stay schedulable');
resetStore();
assert(srs.cardState('constructor') === null, 'constructor is not a card until it is stored');
assert(srs.isSuspended('constructor') === false, 'constructor is not suspended by the map prototype');
assert(srs.isSuspended('toString') === false, 'toString is not suspended by the map prototype');
var protoDeck = [{ id: 'constructor' }, { id: 'toString' }, { id: '__proto__' }, { id: 'keep' }];
sandbox.PGRE.formulaDeckStatus = {
  partial: false, complete: true, missing: [],
  sources: { bookFormulas: 'present', formulas: 'present', bookLists: 'present', indexedDB: 'empty' }
};
var protoSug = srs.suggestFormulaDay(protoDeck, { have: {}, room: 10 });
assert(ids(protoSug.newIds) === 'constructor,toString,__proto__,keep',
  'prototype-name ids are offered as new cards (got ' + ids(protoSug.newIds) + ')');
storeState.formulaDay = {
  date: srs.today(), reviewIds: ['constructor', 'keep'], newIds: [], softIds: ['constructor']
};
var protoBatch = srs.removeFormulaDaySoft(protoDeck, ['keep']);
assert(protoBatch.reviewIds.indexOf('constructor') !== -1,
  'removing another id does not drop a prototype-name pick');
assert(protoBatch.reviewIds.indexOf('keep') === -1, 'the named id is still removed');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
