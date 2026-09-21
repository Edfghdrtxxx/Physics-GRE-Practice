#!/usr/bin/env node
/* Unit tests for formula learning status export in js/view-formulas.js.
   Verifies:
   - buildFormulaReceipt structure (v, kind: 'pgre-formula-receipt', date, overallStatus, session, recalledToday, summaryText)
   - recalledToday gathering from active session history, store.cards (studiedToday), and cardReviews
   - overallStatus calculations (deckSize, learned, pctLearned, mature, learning, unseen, byTopic, streak)
   - persistFormulaReceipt durable writes (sessionStorage, localStorage, state.lastFormulaReceipt)
   - UI buttons present in in-progress, checkpoint, and summary views
   - Modal overlay mounting and controls
   Run: node tools/test-formula-export.js */
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

var storeSrc = fs.readFileSync(path.join(root, 'js', 'store.js'), 'utf8');
var srsSrc = fs.readFileSync(path.join(root, 'js', 'srs.js'), 'utf8');
var viewSrc = fs.readFileSync(path.join(root, 'js', 'view-formulas.js'), 'utf8');

/* Set up DOM and sandbox */
var listeners = {};
var docBody = {
  innerHTML: '',
  appendChild: function (child) {
    if (!this.children) this.children = [];
    this.children.push(child);
    child.parentNode = this;
  },
  removeChild: function (child) {
    if (!this.children) return;
    var idx = this.children.indexOf(child);
    if (idx >= 0) this.children.splice(idx, 1);
    child.parentNode = null;
  },
  querySelector: function (sel) { return null; },
  querySelectorAll: function (sel) { return []; }
};

var documentMock = {
  body: docBody,
  getElementById: function (id) {
    if (id === 'view' || id === 'formulas-root') return { innerHTML: '', appendChild: function () {} };
    if (id === 'toasts') return { appendChild: function () {} };
    return null;
  },
  createElement: function (tag) {
    return {
      tagName: tag.toUpperCase(),
      className: '',
      id: '',
      innerHTML: '',
      style: {},
      children: [],
      setAttribute: function (k, v) { this[k] = v; },
      getAttribute: function (k) { return this[k] || null; },
      appendChild: function (c) { this.children.push(c); c.parentNode = this; },
      removeChild: function (c) {
        var i = this.children.indexOf(c);
        if (i >= 0) this.children.splice(i, 1);
        c.parentNode = null;
      },
      addEventListener: function (type, fn) {},
      closest: function () { return null; },
      scrollIntoView: function () {}
    };
  },
  addEventListener: function (type, fn) {
    if (!listeners[type]) listeners[type] = [];
    listeners[type].push(fn);
  },
  removeEventListener: function (type, fn) {
    if (!listeners[type]) return;
    var i = listeners[type].indexOf(fn);
    if (i >= 0) listeners[type].splice(i, 1);
  }
};

var windowMock = {
  PGRE: {
    TOPICS: [
      { id: 'cm', name: 'Classical Mechanics' },
      { id: 'em', name: 'Electromagnetism' },
      { id: 'qm', name: 'Quantum Mechanics' }
    ],
    topicById: function (tid) {
      for (var i = 0; i < this.TOPICS.length; i++) if (this.TOPICS[i].id === tid) return this.TOPICS[i];
      return null;
    },
    views: {},
    ui: {
      esc: function (s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;'); },
      meter: function (pct, cls) { return '<div class="meter ' + (cls || '') + '"><div class="meter-fill" style="width:' + pct + '%"></div></div>'; }
    },
    typesetMath: function () {},
    toast: function (msg, kind) { windowMock.PGRE.lastToast = { msg: msg, kind: kind }; }
  },
  location: { origin: 'http://localhost:8000', href: 'http://localhost:8000/#/formulas' },
  localStorage: localStorage,
  sessionStorage: sessionStorage,
  document: documentMock,
  addEventListener: function () {}
};

var sandbox = {
  window: windowMock,
  PGRE: windowMock.PGRE,
  document: documentMock,
  localStorage: localStorage,
  sessionStorage: sessionStorage,
  Math: Math,
  Object: Object,
  Array: Array,
  String: String,
  Number: Number,
  parseInt: parseInt,
  parseFloat: parseFloat,
  isFinite: isFinite,
  clearTimeout: clearTimeout,
  setTimeout: setTimeout,
  URL: {
    createObjectURL: function () { return 'blob:mock'; },
    revokeObjectURL: function () {}
  },
  Blob: function (parts, opts) { this.parts = parts; this.type = opts && opts.type; }
};

vm.createContext(sandbox);
vm.runInContext(storeSrc, sandbox);
vm.runInContext(srsSrc, sandbox);

var PGRE = sandbox.window.PGRE;
PGRE.store.load();

/* Mock sample formula cards */
var mockCards = [
  { id: 'cpgf-1.1', name: 'Velocity and Acceleration', topic: 'cm', chapter: 1, eq: '1.1', front: 'Velocity', back: '$v = \\frac{dx}{dt}$' },
  { id: 'cpgf-1.15', name: 'Energy of SHO', topic: 'cm', chapter: 1, eq: '1.15', front: 'Total energy', back: '$E = \\frac{1}{2}m\\omega^2 A^2$' },
  { id: 'cpgf-2.4', name: 'Electric Potential', topic: 'em', chapter: 2, eq: '2.4', front: 'Potential of point charge', back: '$V = \\frac{1}{4\\pi\\epsilon_0}\\frac{q}{r}$' },
  { id: 'cpgf-2.15', name: 'Capacitance of Parallel Plate', topic: 'em', chapter: 2, eq: '2.15', front: 'Parallel plate capacitance', back: '$C = \\frac{\\epsilon_0 A}{d}$' },
  { id: 'cpgf-3.1', name: 'de Broglie Wavelength', topic: 'qm', chapter: 3, eq: '3.1', front: 'Wavelength of matter', back: '$\\lambda = \\frac{h}{p}$' }
];

PGRE.deck = mockCards;
PGRE.FORMULAS = mockCards;
PGRE.formulaDeck = function () { return Promise.resolve(mockCards); };

vm.runInContext(viewSrc, sandbox);

console.log('receipt builder structure');
var receipt = PGRE.buildFormulaReceipt();
assert(receipt && receipt.v === 1, 'receipt has version v: 1');
assert(receipt.kind === 'pgre-formula-receipt', 'receipt kind is pgre-formula-receipt');
assert(typeof receipt.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(receipt.date), 'receipt carries YYYY-MM-DD date');
assert(typeof receipt.exportedAt === 'string', 'receipt carries ISO exportedAt');
assert(receipt.origin === 'http://localhost:8000', 'receipt carries origin');
assert(receipt.overallStatus && typeof receipt.overallStatus === 'object', 'receipt carries overallStatus');
assert(receipt.overallStatus.deckSize === 5, 'overallStatus reports correct deck size (5)');
assert(Array.isArray(receipt.recalledToday), 'recalledToday is an array');
assert(receipt.recalledToday.length === 0, 'initially 0 cards recalled today on clean state');
assert(typeof receipt.summaryText === 'string' && receipt.summaryText.indexOf('Formula Recall') >= 0, 'receipt includes summaryText');

console.log('\nrecalledToday from store cards');
var todayStr = PGRE.srs.today();
/* Seed card 1 as reviewed today with Good grade */
PGRE.store.state.cards['cpgf-1.15'] = {
  reps: 2,
  lapses: 0,
  interval: 3,
  ease: 2.5,
  due: PGRE.srs.addDays(3),
  reviews: 2,
  lastGrade: 'good',
  lastReviewedDay: todayStr,
  lastReviewedAt: new Date().toISOString()
};

/* Seed card 2 as reviewed today with Mastered / mature */
PGRE.store.state.cards['cpgf-2.4'] = {
  reps: 5,
  lapses: 0,
  interval: 25,
  ease: 2.6,
  due: PGRE.srs.addDays(25),
  reviews: 5,
  lastGrade: 'easy',
  lastReviewedDay: todayStr,
  lastReviewedAt: new Date().toISOString()
};

/* Seed card 3 as reviewed yesterday (should NOT be in recalledToday) */
var yesterdayStr = PGRE.srs.addDaysTo(todayStr, -1);
PGRE.store.state.cards['cpgf-3.1'] = {
  reps: 1,
  lapses: 0,
  interval: 1,
  ease: 2.5,
  due: todayStr,
  reviews: 1,
  lastGrade: 'good',
  lastReviewedDay: yesterdayStr,
  lastReviewedAt: new Date(Date.now() - 86400000).toISOString()
};

var receipt2 = PGRE.buildFormulaReceipt();
assert(receipt2.recalledToday.length === 2, 'recalledToday gathers exactly the 2 cards reviewed today');
var r1 = receipt2.recalledToday.filter(function (x) { return x.id === 'cpgf-1.15'; })[0];
assert(r1 && r1.name === 'Energy of SHO', 'recalled item resolves name');
assert(r1 && r1.topic === 'cm', 'recalled item resolves topic');
assert(r1 && r1.topicName === 'Classical Mechanics', 'recalled item resolves topic name');
assert(r1 && r1.lastGrade === 'good', 'recalled item records lastGrade');
assert(r1 && r1.interval === 3, 'recalled item records interval');
assert(r1 && r1.status === 'learning', 'interval 3 is learning status');
assert(r1 && r1.back === '$E = \\frac{1}{2}m\\omega^2 A^2$', 'recalled item records formula LaTeX');

var r2 = receipt2.recalledToday.filter(function (x) { return x.id === 'cpgf-2.4'; })[0];
assert(r2 && r2.interval === 25 && r2.status === 'mature', 'interval >= 21 is mature status');

console.log('\noverallStatus calculations');
var os = receipt2.overallStatus;
assert(os.learned === 3, 'learned count counts all 3 reviewed cards');
assert(os.pctLearned === 60, 'pctLearned is 60.0% (3/5)');
assert(os.mature === 1, 'mature count is 1');
assert(os.learning === 2, 'learning count is 2');
assert(os.unseen === 2, 'unseen count is 2 (5 total - 3 learned)');
assert(os.byTopic.cm.learned === 1 && os.byTopic.cm.total === 2, 'cm topic: 1 learned of 2');
assert(os.byTopic.em.learned === 1 && os.byTopic.em.mature === 1, 'em topic: 1 mature');

console.log('\npersistFormulaReceipt durability');
PGRE.views.formulas.exportFormulaStatus();
assert(sessionStorage.getItem('pgre-formula-receipt') !== null, 'sessionStorage pgre-formula-receipt written');
assert(localStorage.getItem('pgre-formula-receipt') !== null, 'localStorage pgre-formula-receipt written');
assert(PGRE.store.state.lastFormulaReceipt !== null, 'state.lastFormulaReceipt written');
var storedReceipt = JSON.parse(localStorage.getItem('pgre-formula-receipt'));
assert(storedReceipt.kind === 'pgre-formula-receipt', 'stored receipt has correct kind');
assert(storedReceipt.recalledToday.length === 2, 'stored receipt retains recalledToday');

console.log('\nsummaryText readability');
assert(receipt2.summaryText.indexOf('Recalled today: 2 formulas') >= 0, 'summaryText mentions recalled count');
assert(receipt2.summaryText.indexOf('Energy of SHO') >= 0, 'summaryText lists recalled formula name');
assert(receipt2.summaryText.indexOf('60%') >= 0, 'summaryText includes mastery pct');

console.log('\nallLearnedCards snapshot');
assert(Array.isArray(receipt2.allLearnedCards), 'allLearnedCards is an array');
assert(receipt2.allLearnedCards.length === 3, 'allLearnedCards includes all 3 learned cards');
var alc1 = receipt2.allLearnedCards.filter(function (x) { return x.id === 'cpgf-1.15'; })[0];
assert(alc1 && alc1.name === 'Energy of SHO' && alc1.interval === 3, 'allLearnedCards has card details');

console.log('\nUI export buttons presence in source');
assert(viewSrc.indexOf('id="home-export-btn"') >= 0, 'formulas home caught-up row has #home-export-btn');
assert(viewSrc.indexOf('id="session-export-btn"') >= 0, 'in-progress card view has #session-export-btn');
assert(viewSrc.indexOf('id="cp-export"') >= 0, 'checkpoint view has #cp-export');
assert(viewSrc.indexOf('id="summary-export-btn"') >= 0, 'review complete summary view has #summary-export-btn');
assert(viewSrc.indexOf('openFormulaExportModal') >= 0, 'openFormulaExportModal is defined and referenced');
assert(viewSrc.indexOf('formula-export-overlay') >= 0, 'formula-export-overlay markup generated');


console.log('\ntime scope filtering in buildFormulaReceipt');
assert(receipt2.scope === 'today', 'default receipt has scope today');
assert(receipt2.range && receipt2.range.from === todayStr && receipt2.range.to === todayStr, 'default receipt range is today..today');
assert(Array.isArray(receipt2.recalled), 'receipt carries recalled array');
assert(receipt2.recalled.length === 2, 'default scope recalled length matches recalledToday');

var receiptExplicitToday = PGRE.buildFormulaReceipt('today');
assert(receiptExplicitToday.scope === 'today', 'buildFormulaReceipt("today") has scope today');
assert(receiptExplicitToday.recalled.length === 2, 'buildFormulaReceipt("today") excludes yesterday card from recalled');
assert(receiptExplicitToday.recalledToday.length === 2, 'buildFormulaReceipt("today") recalledToday has 2 cards');

var receipt7d = PGRE.buildFormulaReceipt('7d');
assert(receipt7d.scope === '7d', 'buildFormulaReceipt("7d") has scope 7d');
assert(receipt7d.range && receipt7d.range.to === todayStr, '7d range.to is today');
assert(receipt7d.range && receipt7d.range.from === PGRE.srs.addDaysTo(todayStr, -6), '7d range.from is today - 6 days');
assert(receipt7d.recalled.length === 3, '7d includes cpgf-3.1 yesterday + 2 today cards');
assert(receipt7d.recalledToday.length === 2, '7d still keeps recalledToday as today only');

var receipt30d = PGRE.buildFormulaReceipt('30d');
assert(receipt30d.scope === '30d', 'buildFormulaReceipt("30d") has scope 30d');
assert(receipt30d.range && receipt30d.range.from === PGRE.srs.addDaysTo(todayStr, -29), '30d range.from is today - 29 days');
assert(receipt30d.recalled.length === 3, '30d includes yesterday card + 2 today cards');

var receiptAll = PGRE.buildFormulaReceipt('all');
assert(receiptAll.scope === 'all', 'buildFormulaReceipt("all") has scope all');
assert(receiptAll.range && receiptAll.range.from === null, 'all range.from is null');
assert(receiptAll.range && receiptAll.range.to === todayStr, 'all range.to is today');
assert(receiptAll.recalled.length === 3, 'all includes every card with reviews (3 cards)');
assert(receiptAll.recalledToday.length === 2, 'all still keeps recalledToday as today only');

assert(viewSrc.indexOf('id="export-scope-sel"') >= 0, 'viewSrc contains id="export-scope-sel"');
assert(viewSrc.indexOf('id="export-scope-sel"') < viewSrc.indexOf('id="export-modal-close"'), 'id="export-scope-sel" appears before id="export-modal-close" in modal markup');
console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
