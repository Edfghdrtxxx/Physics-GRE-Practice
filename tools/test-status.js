#!/usr/bin/env node
/* Agent status summary contract. Run: node tools/test-status.js */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var root = path.resolve(__dirname, '..');
var statusSrc = fs.readFileSync(path.join(root, 'js', 'status.js'), 'utf8');
var passed = 0;
var failed = 0;

function assert(condition, message) {
  if (condition) { passed++; console.log('  ok  — ' + message); }
  else { failed++; console.log('  FAIL — ' + message); }
}

function localDay(offset) {
  var d = new Date();
  d.setDate(d.getDate() + (offset || 0));
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function localIso(offset, hour) {
  var d = new Date();
  d.setDate(d.getDate() + (offset || 0));
  d.setHours(hour || 12, 0, 0, 0);
  return d.toISOString();
}

var today = localDay(0);
var yesterday = localDay(-1);
var fetchCall = null;
var state = {
  streak: { current: 5, best: 12, lastDay: today },
  today: { date: today, answered: 30, correct: 24 },
  settings: { dailyTargetMin: 60 },
  studyLog: {},
  sessions: [
    { id: 'done', mode: 'practice', topicId: 'cm', startedAt: localIso(0, 10),
      endedAt: localIso(0, 11), answered: 20, correct: 16, xp: 99 },
    { id: 'open', mode: 'practice', startedAt: localIso(0, 12), endedAt: null,
      answered: 2, correct: 1 },
    { id: 'old', mode: 'practice', startedAt: localIso(-1, 10),
      endedAt: localIso(-1, 11), answered: 10, correct: 8 }
  ],
  exams: [
    { id: 'exam-today', submittedAt: localIso(0, 14), format: '70x120',
      source: 'weighted', raw: 50, total: 70, scaledEst: 820, answers: { q: 1 } },
    { id: 'exam-old', submittedAt: localIso(-1, 14), format: '70x120',
      source: 'weighted', raw: 40, total: 70 }
  ],
  cards: {
    f1: { due: today },
    f2: { due: localDay(1) },
    f3: { due: today },
    f4: { due: yesterday }
  },
  formulaSuspended: { f3: 1 },
  cardReviews: [
    { d: today, id: 'f1' },
    { d: today, id: 'f2' },
    { d: yesterday, id: 'f1' }
  ],
  mistakes: {
    q1: { firstMissedAt: localIso(0, 9) },
    q2: { firstMissedAt: localIso(-1, 9) }
  },
  log: []
};
state.studyLog[today] = 2520;
for (var i = 0; i < 12; i++) state.log.push({ text: 'activity-' + i, ts: String(12 - i) });

var sandbox = {
  console: console,
  Promise: Promise,
  Date: Date,
  setTimeout: function () { return 1; },
  clearTimeout: function () {},
  setInterval: function () { return 1; },
  window: {
    addEventListener: function () {},
    fetch: function (url, options) {
      fetchCall = { url: url, options: options };
      return Promise.resolve({ ok: true });
    }
  }
};
sandbox.window.PGRE = {
  store: {
    state: state,
    today: function () { return today; },
    liveStreak: function () { return 5; }
  },
  BOOK_FORMULAS: [{ id: 'f1' }, { id: 'f2' }],
  FORMULAS: [{ id: 'f2' }, { id: 'f3' }]
};
sandbox.PGRE = sandbox.window.PGRE;
vm.createContext(sandbox);
vm.runInContext(statusSrc, sandbox);

var before = JSON.stringify(state);
var summary = sandbox.PGRE.buildStatusSummary();

console.log('summary contract');
assert(Object.keys(summary).join(',') ===
  'date,streak,today,sessions,exams,formulaCards,mistakesAdded,recentLog',
  'top-level fields match the bridge contract');
assert(summary.date === today, 'date uses the local studio day');
assert(summary.streak.current === 5 && summary.streak.best === 12,
  'streak reports current and best');
assert(summary.today.answered === 30 && summary.today.correct === 24 &&
  summary.today.minutesStudied === 42 && summary.today.dailyTargetMin === 60,
  'today reports question totals, rounded study minutes, and target');
assert(summary.sessions.length === 1 && summary.sessions[0].id === 'done',
  'sessions include completed-today records only');
assert(!('xp' in summary.sessions[0]), 'sessions omit fields outside the compact contract');
assert(summary.exams.length === 1 && summary.exams[0].id === 'exam-today',
  'exams include submitted-today records only');
assert(!('answers' in summary.exams[0]), 'exams omit full answer payloads');
assert(summary.formulaCards.reviewed === 2 && summary.formulaCards.due === 2,
  'formula counts include today reviews and unsuspended due cards');
assert(summary.mistakesAdded === 1, 'mistakes count local-day first additions');
assert(summary.recentLog.length === 10 && summary.recentLog[0] === 'activity-0' &&
  summary.recentLog[9] === 'activity-9', 'recent activity stays newest-first and capped at ten');
assert(JSON.stringify(state) === before, 'building a summary does not mutate study state');

sandbox.PGRE.pushStatus().then(function (ok) {
  console.log('\npush contract');
  assert(ok === true, 'successful bridge POST resolves true');
  assert(fetchCall && fetchCall.url === 'http://127.0.0.1:4789/pgre-status',
    'push targets the canonical localhost endpoint');
  assert(fetchCall.options.method === 'POST' &&
    fetchCall.options.headers['Content-Type'] === 'application/json',
    'push uses a JSON POST');
  assert(JSON.parse(fetchCall.options.body).today.minutesStudied === 42,
    'push body is the current status summary');

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  if (failed) process.exitCode = 1;
});
