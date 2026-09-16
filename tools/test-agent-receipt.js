#!/usr/bin/env node
/* Durable agent-receipt writes (Website A): last + per-pack map, incomplete
   sittings must not stamp a complete receipt, shuffle-safe pack id match.
   Run: node tools/test-agent-receipt.js */
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

var disk = {};
var sessionDisk = {};

function storageFor(map) {
  return {
    getItem: function (k) {
      return Object.prototype.hasOwnProperty.call(map, k) ? map[k] : null;
    },
    setItem: function (k, v) { map[k] = String(v); },
    removeItem: function (k) { delete map[k]; }
  };
}

var localStorage = storageFor(disk);
var sessionStorage = storageFor(sessionDisk);

var sandbox = {
  console: console,
  Date: Date,
  JSON: JSON,
  Math: Math,
  Object: Object,
  Array: Array,
  String: String,
  Number: Number,
  parseInt: parseInt,
  isFinite: isFinite,
  location: { href: 'file:///tmp/index.html' }
};
sandbox.window = sandbox;
sandbox.document = {
  addEventListener: function () {},
  getElementById: function () { return null; },
  querySelector: function () { return null; }
};
sandbox.localStorage = localStorage;
sandbox.sessionStorage = sessionStorage;
sandbox.addEventListener = function () {};
sandbox.PGRE = {};
vm.createContext(sandbox);

vm.runInContext(fs.readFileSync(path.join(root, 'js', 'store.js'), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'js', 'view-practice.js'), 'utf8'), sandbox);

var PGRE = sandbox.PGRE;
var practice = PGRE.views.practice;

PGRE.PACKS = {
  '03': { ids: ['q-a', 'q-b', 'q-c'], n: 3, label: 'Pack 03' }
};

function makeReceipt(overrides) {
  var r = {
    v: 1,
    kind: 'pgre-agent-receipt',
    pack: '03',
    label: 'Pack 03',
    score: { correct: 2, n: 3, pct: 67 },
    durationMin: 12,
    missQids: ['q-c'],
    misses: [{ qid: 'q-c', topic: 'cm', picked: 1 }],
    ids: ['q-a', 'q-b', 'q-c'],
    origin: 'file:///tmp/index.html',
    sessionId: 's-test',
    xp: 30,
    completedAt: '2026-09-16T10:00:00.000Z'
  };
  if (overrides) {
    Object.keys(overrides).forEach(function (k) { r[k] = overrides[k]; });
  }
  return r;
}

function completeSess(ids) {
  ids = ids || ['q-a', 'q-b', 'q-c'];
  return {
    qs: ids.map(function (id) { return { id: id }; }),
    answers: ids.map(function (id, i) {
      return { q: { id: id }, picked: 0, correct: i !== ids.length - 1 };
    })
  };
}

function lsReceipt() {
  var raw = localStorage.getItem('pgre-agent-receipt');
  return raw ? JSON.parse(raw) : null;
}

console.log('defaults + migrate fill lastAgentReceipt / packReceipts');
PGRE.store.load();
assert(PGRE.store.state.lastAgentReceipt === null, 'fresh lastAgentReceipt is null');
assert(PGRE.store.state.packReceipts && typeof PGRE.store.state.packReceipts === 'object' &&
       !Array.isArray(PGRE.store.state.packReceipts) &&
       Object.keys(PGRE.store.state.packReceipts).length === 0,
  'fresh packReceipts is empty object');

var old = JSON.parse(disk[PGRE.store.KEY]);
delete old.lastAgentReceipt;
delete old.packReceipts;
disk[PGRE.store.KEY] = JSON.stringify(old);
PGRE.store.state = JSON.parse(disk[PGRE.store.KEY]);
PGRE.store.migrate();
assert(PGRE.store.state.lastAgentReceipt === null, 'migrate fills lastAgentReceipt');
assert(PGRE.store.state.packReceipts && typeof PGRE.store.state.packReceipts === 'object',
  'migrate fills packReceipts');

console.log('\ninferPackId set-compare survives shuffle');
assert(practice.inferPackId(['q-c', 'q-a', 'q-b'], 'Custom quiz') === '03',
  'shuffled ids still match pack 03');
assert(practice.inferPackId(['q-a', 'q-b'], 'nope') === null,
  'partial id list is not a pack');
assert(practice.inferPackId(['x'], 'Pack 07 timed') === '07',
  'label fallback still parses pack NN');

console.log('\nincomplete sitting does not write a complete receipt');
PGRE.store.load();
var incomplete = {
  qs: [{ id: 'q-a' }, { id: 'q-b' }, { id: 'q-c' }],
  answers: [{ q: { id: 'q-a' }, picked: 0, correct: true }]
};
assert(practice.sittingComplete(incomplete) === false, 'sittingComplete false when answered < planned');
practice.persistAgentReceipt(makeReceipt(), incomplete);
assert(PGRE.store.state.lastAgentReceipt === null, 'incomplete does not set lastAgentReceipt');
assert(lsReceipt() === null, 'incomplete does not write localStorage pgre-agent-receipt');
assert(Object.keys(PGRE.store.state.packReceipts).length === 0,
  'incomplete does not write packReceipts');
assert(sessionStorage.getItem('pgre-agent-receipt') === null,
  'incomplete does not write sessionStorage receipt');

console.log('\ncomplete pack writes durable last + per-pack');
var packReceipt = makeReceipt();
practice.persistAgentReceipt(packReceipt, completeSess());
assert(practice.sittingComplete(completeSess()) === true, 'sittingComplete true when answered === planned');
var last = PGRE.store.state.lastAgentReceipt;
assert(last && last.kind === 'pgre-agent-receipt', 'lastAgentReceipt kind');
assert(last.score && last.score.n > 0, 'lastAgentReceipt score.n > 0');
assert(Array.isArray(last.missQids), 'lastAgentReceipt missQids array');
assert(lsReceipt() && lsReceipt().kind === 'pgre-agent-receipt' && lsReceipt().pack === '03',
  'localStorage pgre-agent-receipt written');
assert(JSON.parse(sessionStorage.getItem('pgre-agent-receipt')).pack === '03',
  'sessionStorage pgre-agent-receipt written');
assert(PGRE.store.state.packReceipts['03'] && PGRE.store.state.packReceipts['03'].pack === '03',
  'packReceipts[03] stored');

console.log('\npackReceipts survives later non-pack overwrite of last');
var customReceipt = makeReceipt({
  pack: null,
  label: 'Custom quiz',
  score: { correct: 1, n: 1, pct: 100 },
  missQids: [],
  misses: [],
  ids: ['q-z'],
  completedAt: '2026-09-16T11:00:00.000Z'
});
practice.persistAgentReceipt(customReceipt, completeSess(['q-z']));
assert(PGRE.store.state.lastAgentReceipt.pack === null, 'last overwritten by non-pack sitting');
assert(lsReceipt().pack === null, 'localStorage last overwritten by non-pack');
assert(PGRE.store.state.packReceipts['03'] && PGRE.store.state.packReceipts['03'].pack === '03',
  'packReceipts[03] survives last overwrite');
assert(PGRE.store.state.packReceipts['03'].score.n === 3,
  'surviving pack receipt keeps pack score.n');

console.log('\nincomplete after a complete write must not clobber');
practice.persistAgentReceipt(makeReceipt({ pack: '09', label: 'Pack 09' }), incomplete);
assert(PGRE.store.state.lastAgentReceipt.pack === null, 'incomplete does not clobber last');
assert(PGRE.store.state.packReceipts['09'] === undefined, 'incomplete does not invent pack 09');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
