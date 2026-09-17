#!/usr/bin/env node
/* Unit tests for formula-picker ever-studied helpers and save filtering.
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
if (!srs || typeof srs.everStudied !== 'function' || typeof srs.countEverStudied !== 'function') {
  console.error('FAIL: shipped srs.js did not export everStudied / countEverStudied');
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

console.log('everStudied / countEverStudied (D1, D4)');
resetStore();
assert(!srs.everStudied('gauss'), 'missing card state is not ever-studied');
assert(srs.countEverStudied(deck) === 0, 'empty cards → ever 0');
storeState.cards.gauss = { reps: 1, interval: 4, ease: 2.5, due: '2099-01-01' };
storeState.cards.faraday = { reps: 2, interval: 8, ease: 2.5, due: '2099-02-01' };
assert(srs.everStudied('gauss') && srs.everStudied('faraday'), 'graded cards are ever-studied');
assert(!srs.everStudied('angular') && !srs.everStudied('ampere'), 'never-graded cards are not ever-studied');
assert(srs.countEverStudied(deck) === 2, 'deck-wide ever counts only cards with state');
assert(srs.countEverStudied([card('gauss'), card('ampere')]) === 1,
  'chapter ever count is lifetime studied / that list');
assert(srs.newInDeck(deck).map(function (c) { return c.id; }).join(',') === 'angular,ampere',
  'newInDeck is the inverse of ever-studied');

console.log('\nsetFormulaDayPicks saves today set only (D6)');
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

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
