#!/usr/bin/env node
/* Drives the shipped PGRE.launchPack against the shipped catalog.
   Thin pack 07 and ordinary pack 03. No reimplementation of launch.
   Run: node tools/test-pack-launch.js */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var root = path.resolve(__dirname, '..');

function mustRead(rel) {
  var p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    console.error('FAIL: missing ' + rel);
    process.exit(1);
  }
  return fs.readFileSync(p, 'utf8');
}

var sandbox = {
  window: {},
  console: console,
  Array: Array,
  Object: Object,
  JSON: JSON,
  Math: Math,
  String: String,
  Number: Number,
  parseInt: parseInt,
  isNaN: isNaN
};
sandbox.window = sandbox;
sandbox.PGRE = {};
vm.createContext(sandbox);
vm.runInContext(mustRead('js/data-packs.js'), sandbox);
vm.runInContext(mustRead('js/packs.js'), sandbox);

var PGRE = sandbox.PGRE;
if (typeof PGRE.launchPack !== 'function' || typeof PGRE.packById !== 'function') {
  console.error('FAIL: shipped packs.js did not export launchPack/packById');
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

function mockStorage() {
  var data = {};
  return {
    setItem: function (k, v) { data[k] = String(v); },
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
    _data: data
  };
}

function sameMembers(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  var set = {};
  a.forEach(function (id) { set[id] = (set[id] || 0) + 1; });
  return b.every(function (id) {
    if (!set[id]) return false;
    set[id]--;
    return true;
  });
}

function drive(packId, kind) {
  console.log('launch ' + kind + ' pack ' + packId);
  var pack = PGRE.packById(packId);
  assert(!!pack, packId + ' packById returns a pack');
  if (!pack) return;
  var storage = mockStorage();
  var loc = { hash: '' };
  var cfg = PGRE.launchPack(packId, storage, loc);
  assert(!!cfg, packId + ' launchPack returned config');
  assert(loc.hash === '#/practice/custom', packId + ' hash is #/practice/custom (got ' + loc.hash + ')');
  var raw = storage.getItem('pgre-quiz-config');
  assert(!!raw, packId + ' wrote pgre-quiz-config');
  var stored = raw ? JSON.parse(raw) : { ids: [] };
  assert(stored.ids.length === pack.n,
    packId + ' stored ids length === pack n (' + stored.ids.length + ' === ' + pack.n + ')');
  assert(sameMembers(stored.ids, pack.ids),
    packId + ' stored ids are exactly the pack ids');
  assert(cfg.ids.length === pack.n && sameMembers(cfg.ids, pack.ids),
    packId + ' returned config ids match pack');
}

drive('03', 'ordinary');
drive('07', 'thin');

console.log('relaunch while already on custom');
(function () {
  var storage = mockStorage();
  var loc = { hash: '#/practice/custom' };
  var routed = 0;
  PGRE.route = function () { routed++; };
  var cfg = PGRE.launchPack('07', storage, loc);
  assert(!!cfg, 'relaunch returned config');
  assert(loc.hash === '#/practice/custom', 'relaunch keeps #/practice/custom');
  assert(routed === 1, 'relaunch calls PGRE.route when hash is already custom');
  var stored = JSON.parse(storage.getItem('pgre-quiz-config'));
  assert(stored.ids.length === PGRE.PACKS['07'].n, 'relaunch stored pack 07 n');
  delete PGRE.route;
})();

console.log('\nunknown pack');
var storage = mockStorage();
var loc = { hash: '#/plan' };
var miss = PGRE.launchPack('99', storage, loc);
assert(miss === null, 'unknown pack returns null');
assert(storage.getItem('pgre-quiz-config') === null, 'unknown pack does not write config');
assert(loc.hash === '#/plan', 'unknown pack does not change hash');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
