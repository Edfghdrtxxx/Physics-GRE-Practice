#!/usr/bin/env node
/* Unit tests for PGRE.srs.buildMemHistory — loads the shipped srs.js (no
   re-implementation). Run: node tools/test-mem-history.js */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var root = path.resolve(__dirname, '..');
var srsPath = path.join(root, 'js', 'srs.js');
var src = fs.readFileSync(srsPath, 'utf8');

var window = { PGRE: { store: { state: { settings: {}, cards: {} } } } };
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
// srs.js attaches to window.PGRE; mirror for direct access
sandbox.PGRE = window.PGRE;
vm.createContext(sandbox);
vm.runInContext(src, sandbox);

var srs = sandbox.PGRE.srs;
if (!srs || typeof srs.buildMemHistory !== 'function') {
  console.error('FAIL: shipped srs.js did not export buildMemHistory');
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

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

console.log('buildMemHistory unit tests (shipped js/srs.js)\n');

// ——— empty / missing ———
console.log('empty & missing');
assert(srs.buildMemHistory(null, 'c1') === null, 'null reviews → null');
assert(srs.buildMemHistory(undefined, 'c1') === null, 'undefined reviews → null');
assert(srs.buildMemHistory([], 'c1') === null, 'empty array → null');
assert(srs.buildMemHistory([{ d: '2026-07-01', id: 'c1', g: 'good' }], '') === null,
  'empty cardId → null');
assert(srs.buildMemHistory([{ d: '2026-07-01', id: 'c1', g: 'good' }], null) === null,
  'null cardId → null');

// ——— single review ———
console.log('\nsingle review');
var single = srs.buildMemHistory(
  [{ d: '2026-07-02', id: 'c1', g: 'good', ivl: 0, m: 0, n: 0 }],
  'c1'
);
assert(single && single.count === 1, 'single: count 1');
assert(single.firstDay === '2026-07-02' && single.lastDay === '2026-07-02',
  'single: first=last day');
assert(single.chips.length === 1 && single.chips[0].day === 1 &&
  single.chips[0].grade === 'good', 'single: D1@good');
assert(single.pending === null, 'single: no pending without due');

// ——— multi-day + isolation by id ———
console.log('\nmulti-day & card isolation');
var log = [
  { d: '2026-07-02', id: 'c1', g: 'again', ivl: 0, m: 0, n: 0 },
  { d: '2026-07-02', id: 'other', g: 'easy', ivl: 0, m: 0, n: 0 },  // ignore
  { d: '2026-07-03', id: 'c1', g: 'hard', ivl: 0, m: 0, n: 1 },
  { d: '2026-07-04', id: 'c1', g: 'hard', ivl: 1, m: 0, n: 1 },
  { d: '2026-07-06', id: 'c1', g: 'good', ivl: 1, m: 0, n: 1 },
  { d: '2026-07-08', id: 'c1', g: 'good', ivl: 3, m: 0, n: 1 },
  { d: '2026-07-16', id: 'c1', g: 'hard', ivl: 3, m: 0, n: 1 },
  { d: '2026-07-20', id: 'c1', g: 'good', ivl: 3, m: 0, n: 1 },
  { d: '2026-07-20', id: 'c2', g: 'mastered', ivl: 5, m: 0, n: 1 } // ignore
];
var multi = srs.buildMemHistory(log, 'c1', {
  due: '2026-07-30',
  today: '2026-07-20'
});
assert(multi && multi.count === 7, 'multi: 7 reviews for c1 (others ignored)');
assert(multi.firstDay === '2026-07-02' && multi.lastDay === '2026-07-20',
  'multi: date range first→last');
assert(deepEqual(multi.chips.map(function (c) { return 'D' + c.day + '@' + c.grade; }),
  ['D1@again', 'D2@hard', 'D3@hard', 'D5@good', 'D7@good', 'D15@hard', 'D19@good']),
  'multi: day offsets match reference Dn pattern');
assert(multi.pending && multi.pending.kind === 'pending' && multi.pending.day === 29,
  'multi: pending chip day = 29 (2026-07-30 from first)');
assert(multi.pending.label === 'next due',
  'multi: future due → next due (today is 2026-07-20)');

// ——— pending due today ———
console.log('\npending due chip');
var dueToday = srs.buildMemHistory(
  [{ d: '2026-07-01', id: 'c1', g: 'good' }],
  'c1',
  { due: '2026-07-10', today: '2026-07-10' }
);
assert(dueToday.pending && dueToday.pending.label === 'due today' &&
  dueToday.pending.day === 10, 'pending: due today when due <= today');

var overdue = srs.buildMemHistory(
  [{ d: '2026-07-01', id: 'c1', g: 'again' }],
  'c1',
  { due: '2026-07-05', today: '2026-07-10' }
);
assert(overdue.pending && overdue.pending.label === 'due today',
  'pending: overdue also labels due today');

// ——— corrupt entries skipped ———
console.log('\ncorrupt / defensive');
var messy = srs.buildMemHistory([
  null,
  undefined,
  'string',
  42,
  { d: '2026-07-01', id: 'c1' },                 // missing grade
  { d: '2026-07-01', id: 'c1', g: 'bogus' },      // invalid grade
  { d: 'not-a-date', id: 'c1', g: 'good' },       // bad date
  { d: '2026/07/01', id: 'c1', g: 'good' },       // wrong format
  { id: 'c1', g: 'good' },                        // missing d
  { d: '2026-07-02', id: 'c1', g: 'easy' },       // valid
  { d: '2026-07-03', id: 'c1', g: 'mastered' }    // valid
], 'c1');
assert(messy && messy.count === 2, 'corrupt: only 2 valid entries kept');
assert(messy.chips[0].grade === 'easy' && messy.chips[1].grade === 'mastered',
  'corrupt: grades easy then mastered');
assert(messy.chips[0].day === 1 && messy.chips[1].day === 2,
  'corrupt: day indices from first valid day');

// ——— same-day multiple reviews ———
console.log('\nsame-day multiples');
var same = srs.buildMemHistory([
  { d: '2026-07-05', id: 'c1', g: 'again' },
  { d: '2026-07-05', id: 'c1', g: 'good' }
], 'c1');
assert(same.count === 2 && same.chips[0].day === 1 && same.chips[1].day === 1,
  'same-day: two chips both D1');

// ——— gradeCard-shaped log produces non-empty strip ———
console.log('\ngradeCard-shaped sequence');
// Mirror what gradeCard pushes: { d, id, g, ivl, m, n }
var shaped = [];
function pushGrade(d, g, ivl, had) {
  shaped.push({
    d: d, id: 'form-cm-1', g: g, ivl: ivl,
    m: ivl >= 21 ? 1 : 0, n: had ? 1 : 0
  });
}
pushGrade('2026-06-01', 'good', 0, false);
pushGrade('2026-06-02', 'hard', 1, true);
pushGrade('2026-06-05', 'easy', 1, true);
var afterGrade = srs.buildMemHistory(shaped, 'form-cm-1', {
  due: '2026-06-15', today: '2026-06-05'
});
assert(afterGrade && afterGrade.count === 3 && afterGrade.chips.length === 3,
  'gradeCard shape: non-empty strip after sequence');
assert(afterGrade.pending && afterGrade.pending.day === 15,
  'gradeCard shape: pending day from due');

// ——— dayIndexFrom helper ———
console.log('\ndayIndexFrom');
assert(srs.dayIndexFrom('2026-07-02', '2026-07-02') === 1, 'D1 on first day');
assert(srs.dayIndexFrom('2026-07-02', '2026-07-20') === 19, 'D19 = +18 days');
assert(srs.dayIndexFrom('2026-07-02', '2026-07-30') === 29, 'D29 pending');

// ——— no throw on missing cardReviews path (caller passes []) ———
console.log('\nno-throw contract');
var threw = false;
try {
  srs.buildMemHistory([], 'x');
  srs.buildMemHistory([{ d: '2026-01-01', id: 'x', g: 'good' }], 'x', {});
  srs.buildMemHistory([{ d: '2026-01-01', id: 'x', g: 'good' }], 'x',
    { due: 'bad', today: null });
} catch (e) {
  threw = true;
  console.log('  exception:', e.message);
}
assert(!threw, 'never throws on empty/missing/bad opts');

// ——— own-key grade allowlist (prototype names must not pass) ———
console.log('\nown-key grade allowlist');
assert(!srs.isMemGrade('constructor'), 'isMemGrade: constructor rejected');
assert(!srs.isMemGrade('toString'), 'isMemGrade: toString rejected');
assert(!srs.isMemGrade('__proto__'), 'isMemGrade: __proto__ rejected');
assert(!srs.isMemGrade('hasOwnProperty'), 'isMemGrade: hasOwnProperty rejected');
assert(srs.isMemGrade('good') && srs.isMemGrade('mastered'), 'isMemGrade: real grades ok');
var protoish = srs.buildMemHistory([
  { d: '2026-07-01', id: 'c1', g: 'constructor' },
  { d: '2026-07-01', id: 'c1', g: 'toString' },
  { d: '2026-07-02', id: 'c1', g: 'good' }
], 'c1');
assert(protoish && protoish.count === 1 && protoish.chips[0].grade === 'good',
  'prototype-key grades dropped from history');

// ——— due before first surviving day: no fake D1 ———
console.log('\ndue before first surviving day');
var dueBefore = srs.buildMemHistory(
  [{ d: '2026-07-10', id: 'c1', g: 'good' }],
  'c1',
  { due: '2026-07-01', today: '2026-07-15' }
);
assert(dueBefore.pending && dueBefore.pending.day === null &&
  dueBefore.pending.label === 'due today',
  'due < firstDay → pending.day null (no fake D1), still due today');

// ——— chip cap: count is total, chips are last N ———
console.log('\nchip cap');
var many = [];
for (var mi = 0; mi < 100; mi++) {
  many.push({ d: '2026-01-01', id: 'c1', g: 'good' });
}
var capped = srs.buildMemHistory(many, 'c1', { maxChips: 10 });
assert(capped.count === 100 && capped.chips.length === 10 && capped.chipsTruncated,
  'maxChips=10: count 100, chips 10, truncated flag');
var uncapped = srs.buildMemHistory(many, 'c1', { maxChips: 0 });
assert(uncapped.count === 100 && uncapped.chips.length === 100 && !uncapped.chipsTruncated,
  'maxChips=0: unlimited for tests');

// ——— purity: input array not mutated ———
console.log('\npurity');
var frozen = [
  { d: '2026-07-01', id: 'c1', g: 'again' },
  { d: '2026-07-02', id: 'other', g: 'easy' }
];
var before = JSON.stringify(frozen);
srs.buildMemHistory(frozen, 'c1', { due: '2026-07-05', today: '2026-07-03' });
assert(JSON.stringify(frozen) === before, 'reviews array content unchanged after build');

// ——— summary ———
console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed) process.exit(1);
console.log('ALL PASS');
