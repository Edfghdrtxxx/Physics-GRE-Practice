#!/usr/bin/env node
/* Unit tests for PGRE.focusSound — loads the shipped focus-sound.js (no
   re-implementation). Run: node tools/test-focus-sound.js */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var root = path.resolve(__dirname, '..');
var soundPath = path.join(root, 'js', 'focus-sound.js');
var src = fs.readFileSync(soundPath, 'utf8');

// Minimal store shim matching the real settings shape the module reads.
var saved = [];
var storeState = {
  settings: { theme: 'light', focusSound: 'off' }
};

var window = {
  PGRE: {
    store: {
      state: storeState,
      save: function () { saved.push(JSON.parse(JSON.stringify(storeState))); }
    }
  }
};

var sandbox = {
  window: window,
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
sandbox.PGRE = window.PGRE;
vm.createContext(sandbox);
vm.runInContext(src, sandbox);

var fsnd = sandbox.PGRE.focusSound;
if (!fsnd || typeof fsnd.play !== 'function') {
  console.error('FAIL: shipped focus-sound.js did not export PGRE.focusSound');
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

console.log('focus-sound unit tests (shipped js/focus-sound.js)\n');

// ——— catalog surface (≥4 selectable voices + off) ———
console.log('catalog');
var list = fsnd.list();
assert(Array.isArray(list) && list.length >= 5, 'list() has ≥5 entries (off + ≥4 sounds)');
var ids = list.map(function (s) { return s.id; });
assert(ids.indexOf('off') >= 0, 'catalog includes off');
var playable = ids.filter(function (id) { return id !== 'off'; });
assert(playable.length >= 4, 'at least 4 distinct playable sound ids: ' + playable.join(','));
assert(list.every(function (s) { return s.id && s.label; }), 'every entry has id + label');
// mutation safety
list[0].id = 'mutated';
assert(fsnd.list()[0].id !== 'mutated', 'list() returns a copy (catalog not mutated)');

// ——— resolve / invalid fallback ———
console.log('\nresolve & invalid fallback');
assert(fsnd.resolve('chime') === 'chime', 'resolve valid chime');
assert(fsnd.resolve('soft') === 'soft', 'resolve valid soft');
assert(fsnd.resolve(null) === 'off', 'null → off');
assert(fsnd.resolve(undefined) === 'off', 'undefined → off');
assert(fsnd.resolve('') === 'off', 'empty → off');
assert(fsnd.resolve('not-a-sound') === 'off', 'unknown id → off');
assert(fsnd.resolve(42) === 'off', 'number → off');
assert(fsnd.resolve({ id: 'chime' }) === 'off', 'object → off');
assert(fsnd.isValid('bell') === true, 'isValid(bell)');
assert(fsnd.isValid('nope') === false, 'isValid(nope) false');

// ——— get/setChoice persistence via store ———
console.log('\nget/setChoice + persistence');
assert(fsnd.getChoice() === 'off', 'default stored choice is off');
saved.length = 0;
var set1 = fsnd.setChoice('chime');
assert(set1 === 'chime', 'setChoice(chime) returns chime');
assert(fsnd.getChoice() === 'chime', 'getChoice reads chime');
assert(storeState.settings.focusSound === 'chime', 'settings.focusSound written');
assert(saved.length === 1 && saved[0].settings.focusSound === 'chime', 'store.save() called');

// each of the ≥4 playable choices
console.log('\neach playable choice accepted');
playable.forEach(function (id) {
  var r = fsnd.setChoice(id);
  assert(r === id && fsnd.getChoice() === id, 'set/get ' + id);
});

// invalid set falls back safely
var setBad = fsnd.setChoice('totally-fake');
assert(setBad === 'off', 'setChoice(invalid) → off');
assert(fsnd.getChoice() === 'off', 'getChoice after invalid is off');
assert(storeState.settings.focusSound === 'off', 'invalid write stores off not garbage');

// missing settings object
delete storeState.settings;
assert(fsnd.getChoice() === 'off', 'missing settings → off');
fsnd.setChoice('bell');
assert(storeState.settings && storeState.settings.focusSound === 'bell',
  'setChoice recreates settings bag');

// ——— shouldPlay gating ———
console.log('\nshouldPlay gating');
fsnd.setChoice('off');
assert(fsnd.shouldPlay() === false, 'shouldPlay() false when off');
assert(fsnd.shouldPlay('off') === false, 'shouldPlay(off) false');
fsnd.setChoice('chime');
assert(fsnd.shouldPlay() === true, 'shouldPlay() true when chime');
assert(fsnd.shouldPlay('click') === true, 'shouldPlay(click) true');
assert(fsnd.shouldPlay('garbage') === false, 'shouldPlay(garbage) false (resolves off)');

// ——— play decision path (test double, no AudioContext) ———
console.log('\nplay decision path');
var plays = [];
fsnd.setPlayHook(function (id, moment) {
  plays.push({ id: id, moment: moment });
});

fsnd.setChoice('off');
plays.length = 0;
var rOff = fsnd.play('start');
assert(rOff && rOff.played === false && rOff.id === 'off', 'play when off → not played');
assert(plays.length === 0, 'hook not invoked when off');

// cycle each playable id through play()
playable.forEach(function (id) {
  fsnd.setChoice(id);
  plays.length = 0;
  var r = fsnd.play('start');
  assert(r.played === true && r.id === id, 'play records id ' + id);
  assert(plays.length === 1 && plays[0].id === id && plays[0].moment === 'start',
    'hook invoked with ' + id + '/start');
  var rEnd = fsnd.play('end');
  assert(rEnd.played === true && rEnd.moment === 'end', 'play end for ' + id);
});

// lastPlay observer
var lp = fsnd.getLastPlay();
assert(lp && lp.played === true, 'getLastPlay reflects last play');

// ——— no throw when audio backend missing / broken ———
console.log('\nfailure isolation');
fsnd.setPlayHook(function () { throw new Error('audio boom'); });
fsnd.setChoice('chime');
var threw = false;
var rBoom;
try {
  rBoom = fsnd.play('start');
} catch (e) {
  threw = true;
}
assert(threw === false, 'play() does not throw when hook throws');
assert(rBoom && rBoom.error === true && rBoom.played === false, 'play reports error, not played');

// missing store entirely
var prevStore = window.PGRE.store;
window.PGRE.store = null;
assert(fsnd.getChoice() === 'off', 'null store → getChoice off');
assert(fsnd.setChoice('soft') === 'soft', 'setChoice without store still returns resolved id');
assert(fsnd.play('start') && typeof fsnd.play('start') === 'object', 'play without store returns object');
window.PGRE.store = prevStore;

// restore hook and ensure synth path does not throw without AudioContext
fsnd.setPlayHook(null);
fsnd.setChoice('bell');
var threwSynth = false;
try {
  fsnd.play('end');
} catch (e) {
  threwSynth = true;
}
assert(threwSynth === false, 'synth play without AudioContext does not throw');

// ——— structural: shipped source has ≥4 playable ids in product surface ———
console.log('\nstructural (source surface)');
var raw = fs.readFileSync(soundPath, 'utf8');
// catalog entries are product surface, not comments-only
var catalogIds = (raw.match(/id:\s*'([a-z]+)'/g) || []).map(function (m) {
  return m.replace(/id:\s*'/, '').replace(/'/, '');
});
var uniqPlayable = catalogIds.filter(function (id, i, a) {
  return id !== 'off' && a.indexOf(id) === i;
});
assert(uniqPlayable.length >= 4, 'source catalog declares ≥4 playable ids: ' + uniqPlayable.join(','));

// view-focus must render the sound picker (product surface)
var viewSrc = fs.readFileSync(path.join(root, 'js', 'view-focus.js'), 'utf8');
assert(viewSrc.indexOf('soundChipsHTML') >= 0, 'view-focus defines soundChipsHTML');
assert(viewSrc.indexOf('data-sound=') >= 0, 'view-focus emits data-sound chips');
assert(viewSrc.indexOf('focus-sounds') >= 0, 'view-focus has focus-sounds container');

// timer must call into the sound path on start/end/pause/resume
var timerSrc = fs.readFileSync(path.join(root, 'js', 'timer.js'), 'utf8');
assert(timerSrc.indexOf('focusSound.play') >= 0, 'timer.js calls focusSound.play');
assert(/play\(['"]start['"]\)/.test(timerSrc), 'timer start path plays start');
assert(/play\(['"]end['"]\)/.test(timerSrc), 'timer finalize path plays end');
assert(/play\(['"]pause['"]\)/.test(timerSrc), 'timer pause path plays pause');
assert(/play\(['"]resume['"]\)/.test(timerSrc), 'timer resume path plays resume');

// store default + migrate backfill key
var storeSrc = fs.readFileSync(path.join(root, 'js', 'store.js'), 'utf8');
assert(storeSrc.indexOf("focusSound: 'off'") >= 0, "store defaults include focusSound: 'off'");

// index.html loads the module
var indexSrc = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert(indexSrc.indexOf('js/focus-sound.js') >= 0, 'index.html loads focus-sound.js');

// ——— summary ———
console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
console.log('ALL OK');
