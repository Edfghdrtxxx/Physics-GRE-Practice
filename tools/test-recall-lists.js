#!/usr/bin/env node
/* Recall list cards (kind: 'list').
   Deck merge order comes from shipped store.js. Match / Type / Cloze / Quiz
   filtering comes from shipped flashmodes.js. Synthetic cards only — nothing
   from the book.
   Run: node tools/test-recall-lists.js */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var root = path.resolve(__dirname, '..');
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

function load(files, extra) {
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
    JSON: JSON,
    String: String,
    Number: Number,
    Array: Array,
    Object: Object,
    Promise: Promise,
    RegExp: RegExp,
    Error: Error,
    isFinite: isFinite,
    parseInt: parseInt,
    parseFloat: parseFloat,
    location: { hash: '' }
  };
  if (extra) {
    Object.keys(extra).forEach(function (k) { sandbox[k] = extra[k]; });
  }
  vm.createContext(sandbox);
  files.forEach(function (rel) {
    var src = fs.readFileSync(path.join(root, rel), 'utf8');
    vm.runInContext(src, sandbox, { filename: rel });
  });
  sandbox.PGRE = sandbox.window.PGRE;
  return sandbox;
}

/* ——— formulaDeck merge order (store.js) ——— */
console.log('formulaDeck appends BOOK_LISTS after FORMULAS, before IndexedDB');
var storeBox = load(['js/store.js']);
var PGRE = storeBox.PGRE;
PGRE.BOOK_FORMULAS = [{ id: 'book-f' }];
PGRE.FORMULAS = [{ id: 'hand-f' }];
PGRE.BOOK_LISTS = [{ id: 'list-a', kind: 'list' }];
PGRE.contentDB.get = function () {
  return Promise.resolve({ id: 'formula-deck', cards: [{ id: 'idb-f' }] });
};

function idsOf(deck) {
  return deck.map(function (c) { return c.id; }).join(',');
}

var deckChecks = PGRE.formulaDeck().then(function (deck) {
  assert(idsOf(deck) === 'book-f,hand-f,list-a,idb-f',
    'four sources keep book, hand, list, IndexedDB order (got ' + idsOf(deck) + ')');
  PGRE.BOOK_LISTS = undefined;
  return PGRE.formulaDeck();
}).then(function (deck) {
  assert(idsOf(deck) === 'book-f,hand-f,idb-f',
    'an absent BOOK_LISTS leaves the other three sources (got ' + idsOf(deck) + ')');
});

/* ——— flashmodes: lists skip Match/Type/Cloze; Quiz is list-versus-list ——— */
console.log('\nflashmodes skips lists except Quiz');
var flashBox = load(['js/flashmodes.js']);
var fm = flashBox.PGRE.flashmodes;
if (!fm || typeof fm.quizOptions !== 'function' || typeof fm.pickQueue !== 'function') {
  console.error('FAIL: shipped flashmodes.js did not export quizOptions / pickQueue');
  process.exit(1);
}

var formulas = [];
var lists = [];
for (var i = 0; i < 6; i++) {
  formulas.push({
    id: 'cpgf-3.' + (i + 1),
    topic: 'cm',
    tag: 'Toy formula ' + i,
    front: 'Invented prompt ' + i + ' for a toy energy $E$.',
    back: '$E_{' + i + '} = ' + (i + 2) + ' k$'
  });
  lists.push({
    id: 'cpgl-3.0' + (i + 1),
    kind: 'list',
    topic: 'cm',
    tag: 'Toy list ' + i,
    name: 'Toy checklist ' + i + ' (list)',
    front: 'Name two invented checks, set ' + i + '. (2)',
    back: '<ul class="recall-list"><li>Point ' + i + ': $a_{' + i + '} \\lt b_{' + i + '}$.</li>' +
      '<li>Point ' + i + 'b: the toy ratio is $r_{' + i + '} \\gt 1$.</li></ul>'
  });
}
var mixed = formulas.concat(lists);
flashBox.PGRE.srs = {
  formulaDayRemaining: function () { return mixed.slice(); }
};

function listCount(cards) {
  return cards.filter(function (c) { return c && c.kind === 'list'; }).length;
}

var matched = fm.pickMatchCards(mixed);
assert(listCount(matched) === 0, 'pickMatchCards has no list (got ' + listCount(matched) + ')');

var typed = fm.pickQueue(mixed, 'type');
assert(listCount(typed) === 0, 'pickQueue(deck, type) has no list (got ' + listCount(typed) + ')');
assert(typed.length === formulas.length, 'type keeps the formula cards');

var quizzed = fm.pickQueue(mixed, 'quiz');
assert(listCount(quizzed) === lists.length,
  'pickQueue(deck, quiz) keeps the lists (got ' + listCount(quizzed) + ' of ' + lists.length + ')');

var cloze = fm.clozePool(mixed);
assert(listCount(cloze) === 0, 'clozePool has no list (got ' + listCount(cloze) + ')');

var listBuilt = fm.quizOptions(lists[0], lists);
assert(listBuilt.opts.length === 4,
  'a list card gets 4 quiz options (got ' + listBuilt.opts.length + ')');
var allLists = listBuilt.opts.every(function (o) {
  return String(o).indexOf('<ul class="recall-list">') === 0;
});
assert(allLists, 'every list option starts with <ul class="recall-list">');
assert(listBuilt.opts[listBuilt.correctIdx] === lists[0].back,
  'the correct list option is the card back');

var formulaDeck = formulas.concat(lists);
var leaked = false;
for (var n = 0; n < 50; n++) {
  var built = fm.quizOptions(formulas[0], formulaDeck);
  built.opts.forEach(function (o) {
    if (String(o).indexOf('recall-list') !== -1) leaked = true;
  });
}
assert(!leaked, 'quizOptions on a formula card never offers a recall-list, across 50 draws');

deckChecks.then(function () {
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
}).catch(function (err) {
  console.error('FAIL: formulaDeck rejected', err);
  process.exit(1);
});
