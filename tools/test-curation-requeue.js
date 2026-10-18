#!/usr/bin/env node
/* Recall curation 2026-10-14: PGRE.srs.requeueCuratedCards() brings the ids
   whose question was substantially rewritten due today, unless they were
   graded after the curation cutoff. Also checks every listed id is in the
   public or (when present) gitignored deck, so the list cannot rot silently.
   Run: node tools/test-curation-requeue.js */
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm');
var root = path.resolve(__dirname, '..');
var passed = 0, failed = 0;
function assert(c, m) { if (c) { passed++; console.log('  ok  — ' + m); } else { failed++; console.log('  FAIL — ' + m); } }

var saves = 0;
var sandbox = { window: { PGRE: {} }, console: console, Date: Date, Math: Math, JSON: JSON };
sandbox.PGRE = sandbox.window.PGRE;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'js/srs.js'), 'utf8'), sandbox, { filename: 'js/srs.js' });
var PGRE = sandbox.window.PGRE;
var srs = PGRE.srs;
var today = srs.today();
var ids = srs.CURATION_REQUEUE_IDS;
assert(Array.isArray(ids) && ids.length > 0, 'the requeue list exists');

PGRE.store = {
  state: { cards: {} },
  canWrite: function () { return true; },
  save: function () { saves++; }
};
var c = PGRE.store.state.cards;
c[ids[0]] = { reps: 5, interval: 20, due: '2099-01-01', lastReviewedAt: '2026-10-01T00:00:00.000Z' };
c[ids[1]] = { reps: 5, interval: 20, due: '2099-01-01', lastReviewedAt: '2026-10-15T00:00:00.000Z' };
c[ids[2]] = { reps: 1, interval: 1, due: '2000-01-01', lastReviewedAt: '2026-10-01T00:00:00.000Z' };
c['cpgf-not-listed'] = { reps: 5, interval: 20, due: '2099-01-01', lastReviewedAt: '2026-10-01T00:00:00.000Z' };

var moved = srs.requeueCuratedCards();
assert(moved === true && saves === 1, 'one save when a card moved');
assert(c[ids[0]].due === today, 'a listed card graded before the cutoff comes due today');
assert(c[ids[0]].interval === 20 && c[ids[0]].reps === 5, 'its other SRS fields are untouched');
assert(c[ids[1]].due === '2099-01-01', 'a listed card graded after the cutoff keeps its due date');
assert(c[ids[2]].due === '2000-01-01', 'a listed card already due keeps its earlier due date');
assert(c['cpgf-not-listed'].due === '2099-01-01', 'an unlisted card is untouched');
assert(!c[ids[3]], 'a listed card never seen stays unseen (it is already new)');
var again = srs.requeueCuratedCards();
assert(again === false && saves === 1, 'a second run moves nothing and does not save');

PGRE.store.canWrite = function () { return false; };
c[ids[0]].due = '2099-01-01';
srs.requeueCuratedCards();
assert(saves === 1, 'no save while writes are failing');

// every listed id exists in the deck sources that are present
function load(rel, key) {
  var p = path.join(root, rel);
  if (!fs.existsSync(p)) return null;
  var sb = { window: { PGRE: {} } }; sb.PGRE = sb.window.PGRE; vm.createContext(sb);
  vm.runInContext(fs.readFileSync(p, 'utf8'), sb);
  return sb.window.PGRE[key] || [];
}
var pub = load('js/data-formulas.js', 'FORMULAS');
var book = load('content/bank/cpg-formulas.js', 'BOOK_FORMULAS');
var lists = load('content/bank/cpg-lists.js', 'BOOK_LISTS');
var have = {};
[pub, book, lists].forEach(function (a) { (a || []).forEach(function (x) { have[x.id] = 1; }); });
ids.forEach(function (id) {
  var src = /^supp-/.test(id) ? pub : (/^cpgl-/.test(id) ? lists : book);
  if (!src) return;                                   // gitignored bank absent
  assert(!!have[id], 'listed id is in the deck: ' + id);
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
