#!/usr/bin/env node
/* Agent status summary contract. Run: node tools/test-status.js */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var root = path.resolve(__dirname, '..');
var statusSrc = fs.readFileSync(path.join(root, 'js', 'status.js'), 'utf8');
var intensitySrc = fs.readFileSync(path.join(root, 'js', 'intensity.js'), 'utf8');
var topicsSrc = fs.readFileSync(path.join(root, 'js', 'data-topics.js'), 'utf8');
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
// Exam date 13 days out puts the last pack day (exam minus 3) 10 days out,
// so the coverage numbers do not depend on the calendar date of the run.
var examDate = localDay(13);
var state = {
  streak: { current: 5, best: 12, lastDay: today },
  today: { date: today, answered: 30, correct: 24 },
  settings: { dailyTargetMin: 60, examDate: examDate },
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
    q1: { firstMissedAt: localIso(0, 9), lastMissedAt: localIso(0, 10), misses: 1, solves: 0,
      lastPick: 2, wrongPicks: [2], archivedAt: null, stuck: true, lastStuckAt: localIso(0, 10),
      srs: { step: 0, due: localDay(1) } },
    q2: { firstMissedAt: localIso(-1, 9), misses: 1, solves: 0, wrongPicks: [0],
      archivedAt: null, srs: { step: 0, due: today } },
    q3: { firstMissedAt: localIso(-1, 9), misses: 0, solves: 0, wrongPicks: [],
      archivedAt: null, lucky: true, lastLuckyAt: localIso(0, 10),
      lastTouchedAt: localIso(0, 10), srs: { step: 0, due: localDay(1) } },
    q4: { firstMissedAt: localIso(-3, 9), misses: 2, solves: 3, wrongPicks: [1],
      archivedAt: localIso(-1, 9), srs: { step: 4, due: yesterday } }
  },
  attempts: [
    { ts: localIso(-1, 10), qid: 'q2', topic: 'cm', picked: 0, answer: 1, correct: false,
      ms: 50000, sid: 'old', mode: 'practice', confidence: null },
    { ts: localIso(0, 10), qid: 'q1', topic: 'cm', picked: 2, answer: 3, correct: false,
      ms: 95449, sid: 'done', mode: 'practice', confidence: null, tags: ['slow', 'forgot'] },
    { ts: localIso(0, 10), qid: 'q3', topic: 'em', picked: 1, answer: 1, correct: true,
      ms: 30000, sid: 'done', mode: 'practice', confidence: 'guess' },
    { ts: localIso(0, 14), qid: 'x1', topic: 'qm', picked: null, answer: 4, correct: false,
      ms: null, sid: 'exam-today', mode: 'exam', confidence: null },
    { ts: localIso(0, 14), qid: 'x2', topic: 'qm', picked: 0, answer: 0, correct: true,
      ms: 1000, sid: 'exam-today', mode: 'exam', confidence: 'sure' }
  ],
  log: []
};
var practicePool = [
  { id: 'q1', topic: 'cm', subtopic: 'Lagrangians', src: 'cpg', q: 'Prompt one $x<y$',
    choices: ['a', 'b', 'c', 'd', 'e'], answer: 3, sol: 'SECRET-SOLUTION' },
  { id: 'q3', topic: 'em', subtopic: 'Gauss', src: 'ets-drill', q: 'Prompt three',
    choices: ['a', 'b', 'c', 'd', 'e'], answer: 1 }
];
var examPool = [
  { id: 'x1', topic: 'qm', subtopic: 'Spin', src: 'ets-exam', q: 'EXAM-PROMPT-1',
    choices: ['EXAM-CHOICE'], answer: 4 },
  { id: 'x2', topic: 'qm', src: 'cpg-exam', q: 'EXAM-PROMPT-2',
    choices: ['EXAM-CHOICE'], answer: 0 }
];
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
  FORMULAS: [{ id: 'f2' }, { id: 'f3' }],
  BOOK_LISTS: [{ id: 'cpgl-1.02' }, { id: 'cpgl-2.01' }],
  // pack questions: q1, q2 and x1 have attempts; p3 and p4 do not
  PACKS: { '01': { id: '01', n: 3, ids: ['q1', 'q2', 'p3'] }, '02': { id: '02', n: 3, ids: ['p3', 'p4', 'x1'] } },
  allQuestions: function (opts) {
    return (opts && opts.includeExam) ? practicePool.concat(examPool) : practicePool;
  },
  questionById: function (id) {
    return practicePool.concat(examPool).filter(function (q) { return q.id === id; })[0] || null;
  }
};
state.cards['cpgl-2.01'] = { due: today };
sandbox.PGRE = sandbox.window.PGRE;
vm.createContext(sandbox);
vm.runInContext(topicsSrc, sandbox);
vm.runInContext(intensitySrc, sandbox);
vm.runInContext(statusSrc, sandbox);

var before = JSON.stringify(state);
var summary = sandbox.PGRE.buildStatusSummary();

console.log('summary contract');
assert(Object.keys(summary).join(',') ===
  'date,streak,today,sessions,exams,formulaCards,mistakesAdded,recentLog,' +
  'attempts,questions,mistakeBook,intensity',
  'top-level fields match the bridge contract, with intensity appended last');
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
assert(summary.formulaCards.reviewed === 2,
  'formula counts include today reviews');
assert(summary.formulaCards.total === 5 &&
  summary.formulaCards.suspended === 1 && summary.formulaCards.unseen === 1 &&
  summary.formulaCards.due === 2 && summary.formulaCards.scheduled === 1,
  'formula counts partition the deck once and include cpgl- list cards');
assert(summary.formulaCards.total ===
  summary.formulaCards.unseen + summary.formulaCards.due +
  summary.formulaCards.scheduled + summary.formulaCards.suspended,
  'formula buckets sum to the deck total');
assert(summary.formulaCards.orphaned === 1,
  'card records with no deck card count as orphaned, not due');
assert(summary.recentLog.length === 10 && summary.recentLog[0] === 'activity-0' &&
  summary.recentLog[9] === 'activity-9', 'recent activity stays newest-first and capped at ten');
assert(summary.mistakesAdded === 1, 'mistakesAdded still counts first-missed-today entries');

console.log('\nper-question results');
var a1 = summary.attempts[0];
assert(summary.attempts.length === 4 &&
  summary.attempts.map(function (a) { return a.qid; }).join(',') === 'q1,q3,x1,x2',
  'attempts list today\'s rows only, oldest first');
assert(Object.keys(a1).join(',') ===
  'ts,sessionId,mode,qid,topic,subtopic,src,correct,picked,answer,seconds,tags',
  'attempt rows carry the documented fields');
assert(a1.sessionId === 'done' && a1.mode === 'practice' && a1.topic === 'cm' &&
  a1.subtopic === 'Lagrangians' && a1.src === 'cpg' && a1.correct === false &&
  a1.picked === 2 && a1.answer === 3 && a1.seconds === 95.4,
  'a miss reports session, topic, subtopic, picked and correct index, and seconds');
assert(a1.tags.join(',') === 'too-slow,forgot-something,keep-failing',
  'tags map slow/forgot chips and the mistake-book keep-failing flag');
assert(summary.attempts[1].correct === true && summary.attempts[1].tags.join(',') === 'guessed',
  'a guessed correct answer is tagged guessed');
assert(summary.attempts[2].picked === null && summary.attempts[2].seconds === null &&
  summary.attempts[2].mode === 'exam' && summary.attempts[2].src === 'ets-exam',
  'a blank exam answer keeps picked and seconds null');
assert(summary.attempts[3].tags.join(',') === 'knew-it', 'a sure answer is tagged knew-it');
assert(Object.keys(summary.questions).sort().join(',') === 'q1,q3' &&
  summary.questions.q1.prompt === 'Prompt one $x<y$' &&
  summary.questions.q1.choices.length === 5 &&
  Object.keys(summary.questions.q1).join(',') === 'prompt,choices',
  'practice-pool questions carry prompt and choices only');
var serialized = JSON.stringify(summary);
assert(serialized.indexOf('EXAM-PROMPT') === -1 && serialized.indexOf('EXAM-CHOICE') === -1,
  'intact exam questions never contribute text');
assert(serialized.indexOf('SECRET-SOLUTION') === -1, 'solutions are not published');

console.log('\nmistake book');
var book = summary.mistakeBook;
assert(book.active === 3 && book.due === 1,
  'active counts open entries; due counts open entries due by today');
assert(book.today.map(function (m) { return m.qid; }).join(',') === 'q1,q3',
  'today lists entries added or updated today');
assert(book.today[0].added === true && book.today[0].keepFailing === true &&
  book.today[0].luckyGuess === false && book.today[0].misses === 1 &&
  book.today[0].lastPick === 2 && book.today[0].wrongPicks.join(',') === '2' &&
  book.today[0].due === localDay(1) && book.today[0].topic === 'cm' &&
  book.today[0].archived === false,
  'a new miss reports its counts, picks, due date, and keep-failing flag');
assert(book.today[1].added === false && book.today[1].luckyGuess === true,
  'a lucky-guess filing on an older entry is an update, not an addition');
console.log('\nintensity');
var it = summary.intensity;
// No timed pack on Sunday (0) or Thursday (4), local time.
function workingDays(from, to) {
  var n = 0;
  var d = new Date(from + 'T12:00:00');
  var end = new Date(to + 'T12:00:00');
  while (d <= end) { if (d.getDay() !== 0 && d.getDay() !== 4) n++; d.setDate(d.getDate() + 1); }
  return n;
}
var lastPack = localDay(10);
var wdl = workingDays(today, lastPack);
var wd7 = workingDays(localDay(-6), today);
assert(it && it.date === today, 'intensity uses the summary date');
assert(Object.keys(it).join(',') ===
  'date,newQuestions,paceSec,firstAttemptAccuracy,repeatMinutes,coverage,topics,days',
  'intensity carries the five metrics, the topic rows and the 7-day trend');
['newQuestions', 'paceSec', 'firstAttemptAccuracy', 'repeatMinutes', 'coverage'].forEach(function (k) {
  assert('value' in it[k] && 'threshold' in it[k] && 'band' in it[k],
    k + ' reports value, threshold and band');
});
assert(it.newQuestions.value === 2 && it.newQuestions.threshold === 15 && it.newQuestions.band === 'red',
  'new questions today count first practice tries only (exam rows are not new): 2 / 15, red');
assert(it.paceSec.value === 63 && it.paceSec.threshold === 103 && it.paceSec.band === 'green',
  'pace is the median of today\'s new-question times in whole seconds: 63 / 103, green');
assert(it.firstAttemptAccuracy.value === 33 && it.firstAttemptAccuracy.n === 3 &&
  it.firstAttemptAccuracy.correct === 1 && it.firstAttemptAccuracy.band === 'red',
  'first-try accuracy over 7 days: 1 of 3 = 33%, red');
assert(it.repeatMinutes.value === 0 && it.repeatMinutes.band === 'green',
  'no mistake-book retakes: 0 minutes, green');
assert(it.coverage.remaining === 2 && it.coverage.packQuestions === 5,
  'coverage counts pack questions (union of pack ids) with no attempt of any mode');
assert(it.coverage.lastPackDay === lastPack && it.coverage.examDate === examDate,
  'last pack day is the exam date minus 3 days');
assert(sandbox.PGRE.intensity.NO_PACK_WEEKDAYS.join(',') === '0,4' &&
  it.coverage.noPackWeekdays.join(',') === '0,4',
  'Sunday and Thursday are the no-pack weekdays, in the module and the payload');
assert(it.coverage.workingDaysLeft === wdl,
  'working days run from today through the last pack day, Sundays and Thursdays excluded (' + wdl + ')');
assert(wd7 === 5 && it.coverage.workingDays7 === 5,
  'any 7 days hold one Sunday and one Thursday, so 5 working days');
assert(it.coverage.required === Math.round(10 * 2 / wdl) / 10 && it.coverage.actual === 0.6 &&
  it.coverage.band === 'green',
  'required = remaining / working days; actual = 3 new in 7 days / 5 working days = 0.6; green');
assert(it.topics.length === 9 && it.topics.every(function (t) { return !t.judged && t.band === null; }),
  'every topic has fewer than 5 new questions, so none gets a band');
assert(it.topics.map(function (t) { return t.topic; }).join(',') === 'cm,em,qm,th,at,sp,ow,sr,lb',
  'too-few topics sort by exam weight, heaviest first');
assert(it.topics[0].newQuestions === 2 && it.topics[0].weight === 20 && it.topics[1].newQuestions === 1,
  'topic rows count new questions by row topic and carry the ETS weight');
assert(it.days.length === 7 && it.days[6].date === today && it.days[6].newQuestions === 2 &&
  it.days[6].paceSec === 63 && it.days[5].newQuestions === 1 && it.days[5].paceSec === 50,
  'the 7-day trend ends today with per-day new questions and median pace');
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
  assert(JSON.parse(fetchCall.options.body).attempts.length === 4 &&
    JSON.parse(fetchCall.options.body).mistakeBook.active === 3,
    'push body carries per-question results and the mistake-book summary');

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  if (failed) process.exitCode = 1;
});
