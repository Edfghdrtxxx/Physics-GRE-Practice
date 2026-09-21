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

console.log('\nlearn transfer custom quiz');

console.log('\nlearn selector ranks grounded concepts and excludes protected sources');
(function () {
  PGRE.allQuestions = function () {
    return [
      { id: 'match', src: 'cpg', topic: 'em', subtopic: 'capacitor energy', difficulty: 2, q: 'A capacitor stores energy.' },
      { id: 'weak', src: 'cpg', topic: 'em', subtopic: 'dielectric insertion', difficulty: 2, q: 'A dielectric changes capacitor energy.' },
      { id: 'same-topic', src: 'ets-drill', topic: 'em', subtopic: 'RC charging', difficulty: 1, q: 'A capacitor charges through a resistor.' },
      { id: 'other-topic', src: 'cpg', topic: 'cm', subtopic: 'projectile motion', difficulty: 2, q: 'A projectile moves.' },
      { id: 'protected', src: 'ets-exam', topic: 'em', subtopic: 'capacitor energy', difficulty: 2, q: 'Protected exam item.' }
    ];
  };
  var picked = PGRE.selectLearnQuestions({
    topicIds: ['em'],
    subtopics: ['capacitor energy'],
    concepts: ['stored capacitor energy'],
    weakSpots: ['dielectric'],
    difficulty: 2,
    excludeIds: ['same-topic']
  });
  assert(picked && picked.length === 3, 'selector returns exactly three questions');
  assert(picked[0] === 'match', 'selector ranks exact subtopic match first');
  assert(picked.indexOf('protected') === -1, 'selector excludes intact exam questions');
  assert(picked.indexOf('same-topic') === -1, 'selector honors current-session exclusions');
  var storage = mockStorage();
  var loc = { hash: '#/' };
  var cfg = PGRE.launchLearnDrill({
    topicIds: ['em'],
    concepts: ['capacitor energy'],
    weakSpots: ['dielectric'],
    difficulty: 2,
    label: 'Learn transfer · capacitor energy'
  }, storage, loc);
  assert(cfg && cfg.ids.length === 3 && cfg.learnDrill === true,
    'launchLearnDrill launches the selector result as a Learn handoff');
  var storedCfg = JSON.parse(storage.getItem('pgre-quiz-config'));
  assert(storedCfg.concepts[0] === 'capacitor energy' &&
         storedCfg.weakSpots[0] === 'dielectric' && storedCfg.difficulty === 2,
    'Learn handoff preserves all matching metadata in config');
})();

(function () {
  PGRE.allQuestions = function () {
    return [
      { id: 'cpg-1', src: 'cpg' },
      { id: 'cpg-2', src: 'cpg' },
      { id: 'cpg-3', src: 'ets-drill' },
      { id: 'exam-1', src: 'ets-exam' }
    ];
  };
  var storage = mockStorage();
  var loc = { hash: '#/' };
  var cfg = PGRE.launchCustomQuiz({
    ids: ['cpg-1', 'cpg-2', 'cpg-3'],
    label: 'Learn transfer · Circular orbit'
  }, storage, loc);
  assert(PGRE.launchCustomQuiz({ ids: ['exam-1', 'cpg-2', 'cpg-3'], label: 'exam leak' },
    mockStorage(), { hash: '#/' }) === null,
    'learn transfer rejects intact exam questions');
  assert(!!cfg, 'learn transfer returns config');
  assert(loc.hash === '#/practice/custom', 'learn transfer routes to custom practice');
  var stored = JSON.parse(storage.getItem('pgre-quiz-config'));
  assert(stored.ids.length === 3, 'learn transfer stores exactly three ids');
  assert(stored.learnDrill === true && stored.purpose === 'learn-drill',
    'learn transfer is marked as a Learn drill, not a timed pack');
  assert(PGRE.launchCustomQuiz({ ids: ['a', 'b'], label: 'too short' }, mockStorage(), { hash: '#/' }) === null,
    'learn transfer rejects non-three-question sets');
  assert(PGRE.launchCustomQuiz({ ids: ['a', 'a', 'b'], label: 'duplicate' }, mockStorage(), { hash: '#/' }) === null,
    'learn transfer rejects duplicate ids');
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
