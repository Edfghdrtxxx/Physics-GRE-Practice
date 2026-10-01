#!/usr/bin/env node
/* Lane 2: formula search indexes the section tag on its own.
   Run: node tools/test-formula-consumers.js */
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

var window = { PGRE: { topicById: function () { return { id: 'em', name: 'Electromagnetism', short: 'EM' }; } } };
var sandbox = {
  window: window,
  PGRE: window.PGRE,
  console: console,
  Date: Date,
  Math: Math,
  JSON: JSON,
  String: String,
  Number: Number,
  Array: Array,
  Object: Object,
  RegExp: RegExp,
  isFinite: isFinite,
  parseInt: parseInt
};
sandbox.window.PGRE.store = { state: { cardNotes: {}, formulaDay: null } };
sandbox.window.PGRE.srs = {};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'js/formula-search.js'), 'utf8'), sandbox, {
  filename: 'js/formula-search.js'
});

var fseng = sandbox.window.PGRE.formulaSearch;
var deck = [{
  id: 'cpgf-2.56a',
  topic: 'em',
  name: 'Polarization',
  tag: 'Dielectrics',
  front: 'Bound charge in a linear material.',
  back: '$$P = \\epsilon_0 \\chi E$$',
  eq: '2.56'
}];
var index = fseng.build(deck);

function ids(q) {
  return fseng.run(index, q, {}).hits.map(function (h) { return h.card.id; });
}

console.log('tag filter uses the section tag');
assert(ids('tag:dielectrics').indexOf('cpgf-2.56a') !== -1, 'tag:dielectrics finds the card');
assert(ids('tag:"Dielectrics"').indexOf('cpgf-2.56a') !== -1, 'tag:"Dielectrics" finds the card');
assert(ids('Polarization').indexOf('cpgf-2.56a') !== -1, 'the name query still finds Polarization');
assert(ids('tag:polarization').indexOf('cpgf-2.56a') !== -1,
  'tag: still accepts the display name as an alias');

console.log('dashboard readiness reads deck status before the today count');
var dash = fs.readFileSync(path.join(root, 'js/view-dashboard.js'), 'utf8');
var mountThen = dash.lastIndexOf('PGRE.formulaDeck().then(function (deck) {');
var slice = dash.slice(mountThen, mountThen + 900);
var statusAt = slice.indexOf('formulaDeckStatus');
var countAt = slice.indexOf('formulaStatus(');
var noteFn = dash.indexOf('function deckRecoveryNote');
var readyFn = dash.indexOf('function formulaReadinessLine');
var noteBody = dash.slice(noteFn, readyFn + 1400);
var readyBody = dash.slice(readyFn, readyFn + 1400);
assert(dash.indexOf('id="formula-readiness"') !== -1,
  'dashboard has its own readiness paragraph');
assert(statusAt !== -1 && countAt !== -1 && statusAt < countAt,
  'dashboard copies formulaDeckStatus before formulaStatus');
assert(slice.indexOf('Open Recall') !== -1, 'dashboard readiness links to Recall');
assert(slice.indexOf('formulaReadinessLine(deck, deckStatus)') !== -1,
  'dashboard passes the deck status into the readiness line');
assert(slice.indexOf('partial && readyLine') === -1,
  'dashboard does not hide a partial warning behind an empty line');
assert(noteFn !== -1 && readyFn !== -1 &&
  noteBody.indexOf('this count can be low') !== -1 &&
  noteBody.indexOf('missing') !== -1 &&
  readyBody.indexOf('if (!unseen) return note') !== -1,
  'the readiness line names a partial read even when unseen is 0');
assert(readyFn !== -1 && readyBody.indexOf('suggestFormulaDay') === -1 &&
  readyBody.indexOf('autoFillFormulaDay') === -1,
  'the dashboard warning does not change the batch');

console.log('dashboard shows the partial warning when every loaded card is introduced');
var dw = {
  PGRE: {
    motion: { reduced: true },
    store: {
      state: {
        today: {},
        settings: { examDate: '2026-11-01', formulaDailyTarget: 10, keyboard: false },
        cards: {}, questions: {}, attempts: [], exams: [], topics: {},
        achievements: {}, streak: { best: 0 }, xp: 0, daysActive: [], log: []
      },
      save: function () {}
    },
    allQuestions: function () { return []; },
    formulaDeckStatus: {
      sources: ['book'], missing: ['bookLists'], partial: true, complete: false
    },
    TOPICS: [],
    ACHIEVEMENTS: [],
    EXAM_DATE: '2026-11-01',
    PLAN: [],
    ETS_EXAMS: [],
    launchPack: function () { return null; },
    toast: function () {},
    typesetMath: function () {},
    studyTime: {
      todaySec: function () { return 0; },
      weekSec: function () { return 0; },
      daySec: function () { return 0; }
    },
    ui: {
      esc: function (s) { return String(s); },
      fmt: function (n) { return String(n); },
      meter: function () { return ''; },
      statTile: function () { return ''; },
      dateRange: function () { return ''; },
      monogram: function () { return ''; }
    },
    gamify: {
      levelInfo: function () { return { level: 1, title: 't', pct: 0, into: 0, span: 100 }; },
      metrics: function () { return { answered: 0 }; },
      taskDone: function () { return false; },
      todaysChallenges: function () { return []; },
      mastery: function () { return 0; },
      seededPick: function () { return []; }
    },
    currentWeek: function () {
      return { week: { title: 'w', start: '', end: '', hours: 1 }, phase: { name: 'p' } };
    },
    weekTasks: function () { return []; }
  }
};
var batch = { date: '2026-10-01', reviewIds: ['cpgf-1.1'], newIds: [] };
var alloc = { suggest: 0, auto: 0 };
dw.PGRE.srs = {
  clampTarget: function (n) { return n || 10; },
  cardState: function () { return { due: '2026-10-20', reviews: 2, interval: 4 }; },
  isSuspended: function () { return false; },
  daysUntil: function () { return 30; },
  studiedToday: function () { return false; },
  formulaDay: function () { return batch; },
  formulaDayRemaining: function () { return []; },
  formulaDayPostponed: function () { return 0; },
  newInDeck: function () { return []; },
  fillFormulaDayFinalPass: function () { return batch; },
  finalPassActive: function () { return false; },
  dueMistakes: function () { return []; },
  suggestFormulaDay: function () {
    alloc.suggest++;
    return { reviewIds: [], newIds: [] };
  },
  autoFillFormulaDay: function () {
    alloc.auto++;
    return batch;
  }
};
dw.PGRE.formulaDeck = function () {
  return Promise.resolve([
    { id: 'cpgf-1.1', topic: 'cm' },
    { id: 'cpgf-2.1', topic: 'cm' }
  ]);
};
function dashNode(id) {
  return {
    id: id,
    hidden: true,
    textContent: '',
    disabled: false,
    classList: { remove: function () {}, add: function () {} },
    addEventListener: function () {},
    appendChild: function (child) { this.textContent += child.textContent || ''; }
  };
}
var dashNodes = {
  'formula-readiness': dashNode('formula-readiness'),
  'today-formulas': dashNode('today-formulas'),
  'today-formulas-btn': dashNode('today-formulas-btn'),
  view: dashNode('view')
};
dw.document = {
  addEventListener: function () {},
  getElementById: function (id) { return dashNodes[id] || null; },
  querySelector: function () { return null; },
  querySelectorAll: function () { return []; },
  createElement: function () {
    return { href: '', textContent: '', classList: { add: function () {}, remove: function () {} } };
  }
};
dw.window = dw;
dw.console = console;
dw.Promise = Promise;
dw.Date = Date;
dw.Math = Math;
dw.JSON = JSON;
dw.Object = Object;
dw.Array = Array;
dw.String = String;
dw.Number = Number;
vm.createContext(dw);
vm.runInContext(fs.readFileSync(path.join(root, 'js/view-dashboard.js'), 'utf8'), dw, {
  filename: 'js/view-dashboard.js'
});
dw.PGRE.views.dashboard.mount();
Promise.resolve().then(function () {
  var ready = dashNodes['formula-readiness'];
  assert(!ready.hidden && ready.textContent.indexOf('incomplete') !== -1 &&
    ready.textContent.indexOf('bookLists') !== -1 &&
    ready.textContent.indexOf('Open Recall') !== -1,
    'dashboard warns on a partial deck with no unseen cards, got: ' + ready.textContent);
  assert(batch.reviewIds.join(',') === 'cpgf-1.1' && batch.newIds.length === 0 &&
    alloc.auto === 0,
    'the dashboard warning does not change the daily ids');
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
}).catch(function (err) {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
return;
process.exit(failed ? 1 : 0);
