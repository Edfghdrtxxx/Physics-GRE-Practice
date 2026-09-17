#!/usr/bin/env node
/* Unit tests for the shipped pack catalog against the real local practice pool.
   Loads js/data-packs.js + js/bank.js (no reimplementation, no fabricated
   pack list as the unit under test).
   Run: node tools/test-packs.js */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var root = path.resolve(__dirname, '..');

function mustRead(rel) {
  var p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    console.error('FAIL: missing ' + rel + ' (needed to test shipped packs against the real pool)');
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

vm.runInContext(mustRead('js/data-questions.js'), sandbox);
vm.runInContext(mustRead('content/bank/cpg-questions.js'), sandbox);
vm.runInContext(mustRead('content/bank/ets-exams.js'), sandbox);
vm.runInContext(mustRead('js/bank.js'), sandbox);
vm.runInContext(mustRead('js/data-packs.js'), sandbox);

var PGRE = sandbox.PGRE;
if (typeof PGRE.allQuestions !== 'function' || typeof PGRE.questionById !== 'function') {
  console.error('FAIL: shipped bank.js did not export allQuestions/questionById');
  process.exit(1);
}
if (!PGRE.PACKS || typeof PGRE.PACKS !== 'object') {
  console.error('FAIL: shipped data-packs.js did not export PGRE.PACKS');
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

var EXAM_SRCS = { 'cpg-exam': 1, 'ets-exam': 1 };
var pool = PGRE.allQuestions();
var poolIds = {};
pool.forEach(function (q) { poolIds[q.id] = q; });

var keys = [];
for (var i = 1; i <= 35; i++) keys.push(i < 10 ? '0' + i : String(i));

console.log('pack catalog 01–35 vs real default pool');
assert(keys.every(function (k) { return PGRE.PACKS[k]; }), 'keys 01–35 all present');

var seen = {};
var crossDup = 0;
keys.forEach(function (k) {
  var p = PGRE.PACKS[k];
  assert(p && Array.isArray(p.ids), k + ' has ids array');
  if (!p || !Array.isArray(p.ids)) return;
  assert(p.n === p.ids.length, k + ' n === ids.length (' + p.n + ' === ' + p.ids.length + ')');
  assert(p.n >= 1, k + ' n >= 1 (got ' + p.n + ')');
  var local = {};
  var localDup = 0;
  var missing = [];
  var examSrc = [];
  p.ids.forEach(function (id) {
    if (local[id]) localDup++;
    local[id] = true;
    if (seen[id]) crossDup++;
    seen[id] = k;
    var q = PGRE.questionById(id);
    if (!q) missing.push(id);
    else if (EXAM_SRCS[q.src]) examSrc.push(id + ':' + q.src);
    else if (!poolIds[id]) missing.push(id + '(not in default pool)');
  });
  assert(localDup === 0, k + ' ids unique within pack');
  assert(missing.length === 0, k + ' every id resolves in default pool' +
    (missing.length ? ' missing=' + missing.slice(0, 5).join(',') : ''));
  assert(examSrc.length === 0, k + ' no cpg-exam/ets-exam ids' +
    (examSrc.length ? ' ' + examSrc.slice(0, 3).join(',') : ''));
});
assert(crossDup === 0, 'ids unique across packs 01–35');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
