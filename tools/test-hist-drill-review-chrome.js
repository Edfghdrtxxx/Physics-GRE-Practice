#!/usr/bin/env node
/* Real-page check: History opens a stored mistake drill or practice set on
   the same result and review screen the live session uses, reconstructed
   read-only from the session and its attempts. Synthetic questions in an
   isolated Chrome profile on a throwaway 127.0.0.1 port; never the saved
   studio. The status bridge on 127.0.0.1:4789 is refused by CSP.
   Run: node tools/test-hist-drill-review-chrome.js
   PGRE_HIST_DRILL_SHOTS=<dir> also saves one screenshot per named state. */
'use strict';

var fs = require('fs');
var http = require('http');
var os = require('os');
var path = require('path');
var spawn = require('child_process').spawn;
var ROOT = path.resolve(__dirname, '..');
var MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
  '.png': 'image/png', '.svg': 'image/svg+xml'
};
var BRIDGE_PORT = 4789;
var CSP_REPORT_PATH = '/__csp-report';
var PAGE_CSP = "connect-src 'self'; report-uri " + CSP_REPORT_PATH;
function isBridgeUrl(u) { return /^https?:\/\/(127\.0\.0\.1|localhost):4789(\/|$)/.test(String(u)); }

function staticChecks() {
  function check(condition, message) {
    if (!condition) throw new Error(message);
    console.log('PASS: ' + message);
  }
  var index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  check(/js\/view-history\.js\?v=\d{8}[a-z]/.test(index), 'index.html cache-busts view-history.js');
  check(/js\/view-mistakes\.js\?v=\d{8}[a-z]/.test(index), 'index.html cache-busts view-mistakes.js');
  check(/js\/view-practice\.js\?v=\d{8}[a-z]/.test(index), 'index.html cache-busts view-practice.js');
  check(/js\/app\.js\?v=\d{8}[a-z]/.test(index), 'index.html cache-busts app.js');
  var hist = fs.readFileSync(path.join(ROOT, 'js/view-history.js'), 'utf8');
  check(/hist-drill-open/.test(hist) && /#\/mistakes\/drill\//.test(hist),
    'History paints a Review this drill link to #/mistakes/drill/<sid>');
  check(/hist-set-open/.test(hist) && /#\/practice\/session\//.test(hist),
    'History paints a Review this set link to #/practice/session/<sid>');
  var miss = fs.readFileSync(path.join(ROOT, 'js/view-mistakes.js'), 'utf8');
  check(/reconstructArchive/.test(miss) && /params\.sub2/.test(miss),
    'view-mistakes reconstructs a past drill from params.sub2');
  check(/readonly/.test(miss) && /openArchive/.test(miss),
    'the History reconstruction is marked read-only');
  var prac = fs.readFileSync(path.join(ROOT, 'js/view-practice.js'), 'utf8');
  check(/reconstructArchive/.test(prac) && /params\.id === 'session'/.test(prac),
    'view-practice reconstructs a past set from #/practice/session/<sid>');
}

async function helpers(page) {
  var URL = process.env.PGRE_HIST_DRILL_TEST_URL;
  function sleep(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
  var h = { sleep: sleep };

  h.assert = function (condition, message) {
    if (!condition) throw new Error(message);
    console.log('PASS: ' + message);
  };

  h.wait = async function (expression, what) {
    for (var attempt = 0; attempt < 100; attempt++) {
      if (await page.eval(expression)) return;
      await sleep(100);
    }
    throw new Error('Timeout waiting for ' + (what || expression));
  };

  h.click = async function (selector) {
    await page.eval('() => { var b = document.querySelector(' + JSON.stringify(selector) +
      '); b.focus(); b.click(); }');
  };

  h.go = async function (hash) {
    await page.eval('() => { location.hash = ' + JSON.stringify(hash) + '; PGRE.route(); }');
  };

  h.inject = async function () {
    await h.wait('!!document.getElementById("main") && typeof PGRE !== "undefined" && PGRE.store',
      '#main with PGRE.store');
    await page.eval(function () {
      var qs = [
        { id: 'hdr-old-a', topic: 'em', difficulty: 1,
          q: '<p>OLD-A stem: choose the first option.</p>',
          choices: ['Old A first', 'Old A second', 'Old A third', 'Old A fourth', 'Old A fifth'],
          answer: 0, sol: '<p>OLD-A solution is the first option.</p>' },
        { id: 'hdr-old-b', topic: 'em', difficulty: 1,
          q: '<p>OLD-B stem: choose the first option.</p>',
          choices: ['Old B first', 'Old B second', 'Old B third', 'Old B fourth', 'Old B fifth'],
          answer: 0, sol: '<p>OLD-B solution is the first option.</p>' },
        { id: 'hdr-new-a', topic: 'cm', difficulty: 1,
          q: '<p>NEW-A stem: choose the first option.</p>',
          choices: ['New A first', 'New A second', 'New A third', 'New A fourth', 'New A fifth'],
          answer: 0, sol: '<p>NEW-A solution is the first option.</p>' },
        { id: 'hdr-new-b', topic: 'cm', difficulty: 1,
          q: '<p>NEW-B stem: choose the first option.</p>',
          choices: ['New B first', 'New B second', 'New B third', 'New B fourth', 'New B fifth'],
          answer: 0, sol: '<p>NEW-B solution is the first option.</p>' },
        { id: 'hdr-live', topic: 'mech', difficulty: 1,
          q: '<p>LIVE-DRILL-STEM: choose the first option.</p>',
          choices: ['Live first', 'Live second', 'Live third', 'Live fourth', 'Live fifth'],
          answer: 0, sol: '<p>LIVE solution is the first option.</p>' },
        { id: 'hdr-prac-old-a', topic: 'em', difficulty: 1,
          q: '<p>PRAC-OLD-A stem: choose the first option.</p>',
          choices: ['Prac old A first', 'Prac old A second', 'Prac old A third', 'Prac old A fourth', 'Prac old A fifth'],
          answer: 0, sol: '<p>PRAC-OLD-A solution is the first option.</p>' },
        { id: 'hdr-prac-old-b', topic: 'em', difficulty: 1,
          q: '<p>PRAC-OLD-B stem: choose the first option.</p>',
          choices: ['Prac old B first', 'Prac old B second', 'Prac old B third', 'Prac old B fourth', 'Prac old B fifth'],
          answer: 0, sol: '<p>PRAC-OLD-B solution is the first option.</p>' },
        { id: 'hdr-prac-new-a', topic: 'cm', difficulty: 1,
          q: '<p>PRAC-NEW-A stem: choose the first option.</p>',
          choices: ['Prac new A first', 'Prac new A second', 'Prac new A third', 'Prac new A fourth', 'Prac new A fifth'],
          answer: 0, sol: '<p>PRAC-NEW-A solution is the first option.</p>' },
        { id: 'hdr-prac-new-b', topic: 'cm', difficulty: 1,
          q: '<p>PRAC-NEW-B stem: choose the first option.</p>',
          choices: ['Prac new B first', 'Prac new B second', 'Prac new B third', 'Prac new B fourth', 'Prac new B fifth'],
          answer: 0, sol: '<p>PRAC-NEW-B solution is the first option.</p>' },
        { id: 'hdr-prac-live', topic: 'cm', difficulty: 1,
          q: '<p>LIVE-PRAC-STEM: choose the first option.</p>',
          choices: ['Live prac first', 'Live prac second', 'Live prac third', 'Live prac fourth', 'Live prac fifth'],
          answer: 0, sol: '<p>LIVE-PRAC solution is the first option.</p>' }
      ];
      qs.forEach(function (q) {
        if (PGRE.QUESTIONS.some(function (x) { return x.id === q.id; })) return;
        PGRE.QUESTIONS.push(q);
      });
      PGRE._resetBankCache();
      PGRE.store.state.today.date = PGRE.store.today();
    });
  };

  h.plant = async function () {
    await page.eval(function () {
      var s = PGRE.store.state;
      s.sessions.push(
        { id: 's-old-drill', mode: 'mistakes', topicId: 'mistakes',
          startedAt: '2026-09-01T12:00:00.000Z', endedAt: '2026-09-01T12:15:00.000Z',
          planned: 2, answered: 2, correct: 1, xp: 12 },
        { id: 's-new-drill', mode: 'mistakes', topicId: 'mistakes',
          startedAt: '2026-10-01T12:00:00.000Z', endedAt: '2026-10-01T12:12:00.000Z',
          planned: 2, answered: 2, correct: 1, xp: 17 },
        { id: 's-gone-drill', mode: 'mistakes', topicId: 'mistakes',
          startedAt: '2026-10-05T12:00:00.000Z', endedAt: '2026-10-05T12:08:00.000Z',
          planned: 1, answered: 1, correct: 0, xp: 2 },
        { id: 's-prac-old', mode: 'practice', topicId: 'all',
          startedAt: '2026-08-01T12:00:00.000Z', endedAt: '2026-08-01T12:18:00.000Z',
          planned: 2, answered: 2, correct: 1, xp: 12 },
        { id: 's-prac-new', mode: 'practice', topicId: 'all',
          startedAt: '2026-10-08T12:00:00.000Z', endedAt: '2026-10-08T12:16:00.000Z',
          planned: 2, answered: 2, correct: 1, xp: 17 },
        { id: 's-prac-gone', mode: 'practice', topicId: 'all',
          startedAt: '2026-10-09T12:00:00.000Z', endedAt: '2026-10-09T12:07:00.000Z',
          planned: 1, answered: 1, correct: 0, xp: 2 },
        { id: 's-prac-custom', mode: 'practice', topicId: 'custom', label: 'Custom quiz',
          startedAt: '2026-10-10T12:00:00.000Z', endedAt: '2026-10-10T12:11:00.000Z',
          planned: 1, answered: 1, correct: 1, xp: 15 },
        { id: 's-prac-live', mode: 'practice', topicId: 'all',
          startedAt: '2026-10-20T12:30:00.000Z', endedAt: null,
          planned: 1, answered: 0, correct: 0, xp: 0 },
        { id: 's-live-drill', mode: 'mistakes', topicId: 'mistakes',
          startedAt: '2026-10-20T12:00:00.000Z', endedAt: null,
          planned: 1, answered: 0, correct: 0, xp: 0 }
      );
      s.attempts.push(
        { ts: '2026-09-01T12:01:00.000Z', qid: 'hdr-old-a', topic: 'em', picked: 1, answer: 0,
          correct: false, ms: 4100, sid: 's-old-drill', mode: 'mistakes',
          confidence: 'guess', tags: ['slow'] },
        { ts: '2026-09-01T12:02:00.000Z', qid: 'hdr-old-b', topic: 'em', picked: 0, answer: 0,
          correct: true, ms: 3200, sid: 's-old-drill', mode: 'mistakes',
          confidence: 'sure' },
        { ts: '2026-10-01T12:01:00.000Z', qid: 'hdr-new-a', topic: 'cm', picked: 0, answer: 0,
          correct: true, ms: 2800, sid: 's-new-drill', mode: 'mistakes',
          confidence: 'sure' },
        { ts: '2026-10-01T12:02:00.000Z', qid: 'hdr-new-b', topic: 'cm', picked: 2, answer: 0,
          correct: false, ms: 6400, sid: 's-new-drill', mode: 'mistakes',
          tags: ['forgot'] },
        { ts: '2026-10-05T12:01:00.000Z', qid: 'hdr-gone', topic: 'em', picked: 3, answer: 1,
          correct: false, ms: 5000, sid: 's-gone-drill', mode: 'mistakes' },
        { ts: '2026-08-01T12:01:00.000Z', qid: 'hdr-prac-old-a', topic: 'em', picked: 1, answer: 0,
          correct: false, ms: 4300, sid: 's-prac-old', mode: 'practice',
          confidence: 'guess', tags: ['slow'] },
        { ts: '2026-08-01T12:02:00.000Z', qid: 'hdr-prac-old-b', topic: 'em', picked: 0, answer: 0,
          correct: true, ms: 2500, sid: 's-prac-old', mode: 'practice',
          confidence: 'sure' },
        { ts: '2026-10-08T12:01:00.000Z', qid: 'hdr-prac-new-a', topic: 'cm', picked: 0, answer: 0,
          correct: true, ms: 2100, sid: 's-prac-new', mode: 'practice',
          confidence: 'sure' },
        { ts: '2026-10-08T12:02:00.000Z', qid: 'hdr-prac-new-b', topic: 'cm', picked: 2, answer: 0,
          correct: false, ms: 7200, sid: 's-prac-new', mode: 'practice',
          tags: ['forgot'] },
        { ts: '2026-10-09T12:01:00.000Z', qid: 'hdr-prac-gone', topic: 'cm', picked: 3, answer: 1,
          correct: false, ms: 4800, sid: 's-prac-gone', mode: 'practice' },
        { ts: '2026-10-10T12:01:00.000Z', qid: 'hdr-prac-new-a', topic: 'cm', picked: 0, answer: 0,
          correct: true, ms: 1800, sid: 's-prac-custom', mode: 'practice',
          confidence: 'sure' }
      );
      sessionStorage.setItem('pgre-mistake-drill', JSON.stringify({
        v: 1, sid: 's-live-drill', i: 0, skipped: 0,
        ids: ['hdr-live'], results: [null], savedAt: Date.now()
      }));
      sessionStorage.setItem('pgre-practice-session', JSON.stringify({
        topicId: 'all', filter: null, label: null, custom: false, learnDrill: false,
        sid: 's-prac-live', stage: 'question',
        ids: ['hdr-prac-live'], i: 0, correct: 0, xpEarned: 0,
        answers: [null], savedAt: Date.now()
      }));
      PGRE.store.save();
    });
  };

  h.installProbes = async function () {
    await page.eval(function () {
      window.__histWrites = { save: 0, recordAnswer: 0, gradeCard: 0, endSession: 0 };
      var save = PGRE.store.save;
      PGRE.store.save = function () {
        var stack = (new Error()).stack || '';
        // The passive study-time tracker flushes on click/hashchange. That is
        // not the History review path. Let it run, but it is not a test fail.
        if (/\bbeat\b|\bflush\b/.test(stack)) return;
        window.__histWrites.save++;
        return save.apply(this, arguments);
      };
      var rec = PGRE.gamify.recordAnswer;
      PGRE.gamify.recordAnswer = function () {
        window.__histWrites.recordAnswer++;
        return rec.apply(this, arguments);
      };
      if (PGRE.srs && typeof PGRE.srs.gradeCard === 'function') {
        var gc = PGRE.srs.gradeCard;
        PGRE.srs.gradeCard = function () {
          window.__histWrites.gradeCard++;
          return gc.apply(this, arguments);
        };
      }
      var end = PGRE.gamify.endSession;
      PGRE.gamify.endSession = function () {
        window.__histWrites.endSession++;
        return end.apply(this, arguments);
      };
      if (typeof PGRE.gamify.recordSession === 'function') {
        var recSess = PGRE.gamify.recordSession;
        PGRE.gamify.recordSession = function () {
          window.__histWrites.save++;
          return recSess.apply(this, arguments);
        };
      }
    });
  };

  h.blob = async function () {
    return page.eval(function () { return localStorage.getItem('pgre-state-v1'); });
  };

  h.writes = async function () {
    return JSON.parse(await page.eval(function () { return JSON.stringify(window.__histWrites); }));
  };

  h.screen = async function () {
    return JSON.parse(await page.eval(function () {
      var title = document.querySelector('#mistakes-root h1, #practice-root h1');
      var pal = document.querySelector('.exam-palette-title');
      var q = document.querySelector('.q-text');
      var conf = document.querySelector('.conf-note');
      var sol = document.querySelector('.solution');
      var histLinks = [];
      document.querySelectorAll('.hist-drill-open').forEach(function (a) {
        histLinks.push(a.getAttribute('href'));
      });
      var setLinks = [];
      document.querySelectorAll('.hist-set-open').forEach(function (a) {
        setLinks.push(a.getAttribute('href'));
      });
      return JSON.stringify({
        hash: location.hash,
        title: title ? title.textContent : '',
        palette: pal ? pal.textContent : '',
        q: q ? q.textContent : '',
        conf: conf ? conf.textContent : '',
        sol: sol ? sol.textContent : '',
        score: (document.querySelector('.summary-score') || {}).textContent || '',
        backHistory: !!document.getElementById('back-history'),
        backResults: !!document.getElementById('review-summary'),
        assess: !!document.getElementById('assess-row'),
        reviewCells: document.querySelectorAll('[data-review]').length,
        crumb: (document.getElementById('breadcrumbs') || {}).textContent || '',
        histLinks: histLinks,
        setLinks: setLinks,
        resumeCard: !!document.getElementById('resume-btn'),
        liveDrill: !!(PGRE.views.mistakes._test && PGRE.views.mistakes._test.drill),
        liveSid: PGRE.views.mistakes._test && PGRE.views.mistakes._test.drill
          ? PGRE.views.mistakes._test.drill.sid : null,
        parked: sessionStorage.getItem('pgre-mistake-drill'),
        parkedPractice: sessionStorage.getItem('pgre-practice-session')
      });
    }));
  };

  return h;
}

var STAGES = [
  { name: 'History lists Review this drill', shot: 'history-list',
    run: async function (page, h) {
      await h.inject();
      await h.plant();
      await h.go('#/history');
      await h.wait('!!document.querySelector(".hist-drill-open")', 'History review links');
      // Snapshot after History has mounted: the passive study-time tracker
      // may flush once on that first hashchange. Opening a past drill after
      // this must not write pgre-state-v1 again.
      var before = await h.blob();
      h.assert(!!before, 'planted state reached localStorage');
      await page.eval(function () {
        window.__histBefore = localStorage.getItem('pgre-state-v1');
        if (PGRE.studyTime && typeof PGRE.studyTime.resetBeat === 'function') PGRE.studyTime.resetBeat();
      });
      await h.installProbes();
      var hist = await h.screen();
      h.assert(hist.histLinks.indexOf('#/mistakes/drill/s-old-drill') !== -1,
        'History lists Review this drill for the old mistake drill');
      h.assert(hist.histLinks.indexOf('#/mistakes/drill/s-new-drill') !== -1,
        'History lists Review this drill for the later mistake drill');
      h.assert(hist.histLinks.indexOf('#/mistakes/drill/s-gone-drill') !== -1,
        'History lists Review this drill for the missing-question drill');
      h.assert(hist.setLinks.indexOf('#/practice/session/s-prac-old') !== -1,
        'History lists Review this set for the old practice session');
      h.assert(hist.setLinks.indexOf('#/practice/session/s-prac-new') !== -1,
        'History lists Review this set for the later practice session');
      h.assert(hist.setLinks.indexOf('#/practice/session/s-prac-gone') !== -1,
        'History lists Review this set for the missing-question practice session');
      h.assert(hist.setLinks.indexOf('#/practice/session/s-prac-custom') !== -1,
        'History lists Review this set for a custom quiz');
    } },
  { name: 'finished drill results from History', shot: 'new-drill-results',
    run: async function (page, h) {
      await h.inject();
      await h.click('a.hist-drill-open[href="#/mistakes/drill/s-new-drill"]');
      await h.wait('location.hash === "#/mistakes/drill/s-new-drill" && ' +
        '!!document.querySelector(".exam-palette-title")', 'new-drill results');
      var neu = await h.screen();
      h.assert(neu.palette.indexOf('How this drill went') !== -1,
        'finished drill from History shows How this drill went');
      h.assert(neu.reviewCells === 2, 'new drill palette has two review cells, got ' + neu.reviewCells);
      h.assert(neu.score.indexOf('1 / 2') !== -1, 'new drill score is 1 / 2, got ' + neu.score);
      h.assert(neu.backHistory, 'results offer Back to History');
      h.assert(!neu.assess, 'results do not mount grading chips');
      h.assert(neu.crumb.indexOf('History') !== -1, 'breadcrumb names History, got ' + neu.crumb);
      var afterOpen = await h.blob();
      var before = await page.eval(function () { return window.__histBefore; });
      h.assert(afterOpen === before, 'opening a past drill left localStorage pgre-state-v1 byte-identical');
      var writes = await h.writes();
      h.assert(writes.save === 0 && writes.recordAnswer === 0 && writes.gradeCard === 0 && writes.endSession === 0,
        'opening a past drill called no save / recordAnswer / gradeCard / endSession, got ' + JSON.stringify(writes));
    } },
  { name: 'finished drill per-question review', shot: 'new-drill-review',
    run: async function (page, h) {
      await h.inject();
      await h.click('[data-review="0"]');
      await h.wait('!!document.getElementById("review-summary")', 'new-drill question 1');
      var n1 = await h.screen();
      h.assert(n1.q.indexOf('NEW-A stem') !== -1, 'review 1 shows NEW-A, got ' + n1.q);
      h.assert(n1.sol.indexOf('NEW-A solution') !== -1, 'review 1 shows the stored solution');
      h.assert(n1.conf.indexOf('Knew it') !== -1, 'review 1 shows Knew it, got ' + n1.conf);
      h.assert(!n1.assess, 'review does not mount grading chips');
      h.assert(n1.backResults, 'review offers Back to results');
      var n1Pick = JSON.parse(await page.eval(function () {
        var ans = document.querySelector('.choice.is-answer');
        var pressed = document.querySelector('.choice[aria-pressed="true"]');
        return JSON.stringify({
          answer: ans ? ans.textContent : '',
          pressed: pressed ? pressed.textContent : '',
          wrong: !!document.querySelector('.choice.is-wrong')
        });
      }));
      h.assert(n1Pick.answer.indexOf('New A first') !== -1 && n1Pick.pressed.indexOf('New A first') !== -1,
        'correct review marks the stored pick as the answer');
      h.assert(!n1Pick.wrong, 'a correct review has no wrong-choice tint');

      await h.click('[data-review="1"]');
      await h.wait('document.querySelector(".q-text") && document.querySelector(".q-text").textContent.indexOf("NEW-B stem") !== -1',
        'new-drill question 2');
      var n2 = await h.screen();
      h.assert(n2.q.indexOf('NEW-B stem') !== -1, 'review 2 shows NEW-B');
      h.assert(n2.sol.indexOf('NEW-B solution') !== -1, 'review 2 shows the stored solution');
      h.assert(n2.conf.indexOf('Forgot something') !== -1, 'review 2 shows Forgot something, got ' + n2.conf);
      var n2Pick = JSON.parse(await page.eval(function () {
        var ans = document.querySelector('.choice.is-answer');
        var wrong = document.querySelector('.choice.is-wrong');
        return JSON.stringify({
          answer: ans ? ans.textContent : '',
          wrong: wrong ? wrong.textContent : ''
        });
      }));
      h.assert(n2Pick.answer.indexOf('New B first') !== -1, 'missed review still marks the correct choice');
      h.assert(n2Pick.wrong.indexOf('New B third') !== -1, 'missed review tints the stored pick');
    } },
  { name: 'older drill from History', shot: 'old-drill-review',
    run: async function (page, h) {
      await h.inject();
      await h.go('#/history');
      await h.wait('!!document.querySelector(\'a.hist-drill-open[href="#/mistakes/drill/s-old-drill"]\')',
        'History after new-drill');
      await h.click('a.hist-drill-open[href="#/mistakes/drill/s-old-drill"]');
      await h.wait('location.hash === "#/mistakes/drill/s-old-drill" && !!document.querySelector(".summary-score")',
        'old-drill results');
      var old = await h.screen();
      h.assert(old.palette.indexOf('How this drill went') !== -1, 'old drill shows How this drill went');
      h.assert(old.reviewCells === 2, 'old drill palette has two review cells');
      h.assert(old.score.indexOf('1 / 2') !== -1, 'old drill score is 1 / 2, got ' + old.score);

      await h.click('[data-review="0"]');
      await h.wait('document.querySelector(".q-text") && document.querySelector(".q-text").textContent.indexOf("OLD-A stem") !== -1',
        'old-drill question 1');
      var o1 = await h.screen();
      h.assert(o1.q.indexOf('OLD-A stem') !== -1, 'old review 1 shows OLD-A');
      h.assert(o1.sol.indexOf('OLD-A solution') !== -1, 'old review 1 shows the solution');
      h.assert(o1.conf.indexOf('Guessed') !== -1 && o1.conf.indexOf('Too slow') !== -1,
        'old review 1 shows Guessed and Too slow, got ' + o1.conf);
      var o1Time = await page.eval(function () {
        var chips = [];
        document.querySelectorAll('.practice-meta .chip').forEach(function (c) { chips.push(c.textContent); });
        return chips.join(' | ');
      });
      h.assert(/4\.1 s/.test(o1Time), 'old review 1 shows the stored time, got ' + o1Time);
    } },
  { name: 'missing question fallback', shot: 'missing-question',
    run: async function (page, h) {
      await h.inject();
      await h.go('#/mistakes/drill/s-gone-drill');
      await h.wait('!!document.querySelector("[data-review]")', 'gone-drill results');
      await h.click('[data-review="0"]');
      await h.wait('!!document.getElementById("missing-q-note") || ' +
        '(document.querySelector(".q-text") && /no longer in the bank/.test(document.querySelector(".q-text").textContent))',
        'missing-question fallback');
      var goneNote = await page.eval(function () {
        var n = document.getElementById('missing-q-note');
        var q = document.querySelector('.q-text');
        return (n ? n.textContent : '') + ' ' + (q ? q.textContent : '');
      });
      h.assert(/no longer in the bank/.test(goneNote), 'missing fallback copy is on screen: ' + goneNote);
      var writes = await h.writes();
      h.assert(writes.recordAnswer === 0 && writes.gradeCard === 0 && writes.endSession === 0,
        'missing-question review called no recordAnswer / gradeCard / endSession, got ' + JSON.stringify(writes));
      var core = JSON.parse(await page.eval(function () {
        var now = JSON.parse(localStorage.getItem('pgre-state-v1'));
        var before = JSON.parse(window.__histBefore);
        return JSON.stringify({
          attempts: JSON.stringify(now.attempts) === JSON.stringify(before.attempts),
          sessions: JSON.stringify(now.sessions) === JSON.stringify(before.sessions),
          mistakes: JSON.stringify(now.mistakes) === JSON.stringify(before.mistakes),
          xp: now.xp === before.xp
        });
      }));
      h.assert(core.attempts && core.sessions && core.mistakes && core.xp,
        'attempts, sessions, mistakes, and XP are unchanged after reviewing past drills');
    } },
  { name: 'live parked drill still resumes', shot: 'live-resume',
    run: async function (page, h) {
      await h.inject();
      await h.go('#/mistakes/drill/s-live-drill');
      await h.wait('!!document.querySelector("#mistakes-root h1")', 'unfinished archive heading');
      var unfinished = await h.screen();
      h.assert(unfinished.title.indexOf('Mistake drill') !== -1 || unfinished.title.indexOf('Drill complete') !== -1,
        'an unfinished History drill opens the results screen, got ' + unfinished.title);
      h.assert(unfinished.backHistory, 'unfinished archive offers Back to History');
      var parked = await page.eval(function () { return sessionStorage.getItem('pgre-mistake-drill'); });
      h.assert(parked && parked.indexOf('s-live-drill') !== -1 && parked.indexOf('hdr-live') !== -1,
        'parked live drill snapshot is still in sessionStorage');
      await h.go('#/mistakes/drill');
      await h.wait('document.querySelector(".q-text") && document.querySelector(".q-text").textContent.indexOf("LIVE-DRILL-STEM") !== -1',
        'live parked drill resumes');
      var live = await h.screen();
      h.assert(live.q.indexOf('LIVE-DRILL-STEM') !== -1, 'resumed live drill shows its question');
      h.assert(live.hash === '#/mistakes/drill', 'live resume stays on #/mistakes/drill, got ' + live.hash);
      var liveKey = await page.eval(function () {
        return !document.querySelector('.choice.is-answer') && !document.querySelector('.feedback-good, .feedback-bad');
      });
      h.assert(liveKey, 'resumed live drill still hides the unanswered key');
      var writes = await h.writes();
      h.assert(writes.recordAnswer === 0 && writes.gradeCard === 0 && writes.endSession === 0,
        'resuming the live drill called no recordAnswer / gradeCard / endSession, got ' + JSON.stringify(writes));
      var core = JSON.parse(await page.eval(function () {
        var now = JSON.parse(localStorage.getItem('pgre-state-v1'));
        var before = JSON.parse(window.__histBefore);
        return JSON.stringify({
          attempts: JSON.stringify(now.attempts) === JSON.stringify(before.attempts),
          sessions: JSON.stringify(now.sessions) === JSON.stringify(before.sessions),
          mistakes: JSON.stringify(now.mistakes) === JSON.stringify(before.mistakes),
          xp: now.xp === before.xp,
          liveEnded: (now.sessions.filter(function (x) { return x.id === 's-live-drill'; })[0] || {}).endedAt
        });
      }));
      h.assert(core.attempts && core.sessions && core.mistakes && core.xp,
        'attempts, sessions, mistakes, and XP are unchanged after resuming the live drill');
      h.assert(core.liveEnded == null, 'the unfinished live drill was not closed');
    } },
  { name: 'finished practice set results from History', shot: 'practice-results',
    run: async function (page, h) {
      await h.inject();
      await h.go('#/history');
      await h.wait('!!document.querySelector(\'a.hist-set-open[href="#/practice/session/s-prac-new"]\')',
        'History practice review link');
      await h.click('a.hist-set-open[href="#/practice/session/s-prac-new"]');
      await h.wait('location.hash === "#/practice/session/s-prac-new" && ' +
        '!!document.querySelector(".exam-palette-title")', 'new-practice results');
      var neu = await h.screen();
      h.assert(neu.palette.indexOf('How this set went') !== -1,
        'finished practice from History shows How this set went');
      h.assert(neu.reviewCells === 2, 'new practice palette has two review cells, got ' + neu.reviewCells);
      h.assert(neu.score.indexOf('1 / 2') !== -1, 'new practice score is 1 / 2, got ' + neu.score);
      h.assert(neu.backHistory, 'practice results offer Back to History');
      h.assert(!neu.assess, 'practice results do not mount grading chips');
      h.assert(neu.crumb.indexOf('History') !== -1, 'practice breadcrumb names History, got ' + neu.crumb);
      var afterOpen = await h.blob();
      var before = await page.eval(function () { return window.__histBefore; });
      h.assert(afterOpen === before, 'opening a past practice set left localStorage pgre-state-v1 byte-identical');
      var writes = await h.writes();
      h.assert(writes.save === 0 && writes.recordAnswer === 0 && writes.gradeCard === 0 && writes.endSession === 0,
        'opening a past practice set called no save / recordAnswer / gradeCard / endSession, got ' + JSON.stringify(writes));
    } },
  { name: 'finished practice per-question review', shot: 'practice-review',
    run: async function (page, h) {
      await h.inject();
      await h.click('[data-review="1"]');
      await h.wait('document.querySelector(".q-text") && document.querySelector(".q-text").textContent.indexOf("PRAC-NEW-B stem") !== -1',
        'new-practice question 2');
      var n2 = await h.screen();
      h.assert(n2.q.indexOf('PRAC-NEW-B stem') !== -1, 'practice review shows PRAC-NEW-B');
      h.assert(n2.sol.indexOf('PRAC-NEW-B solution') !== -1, 'practice review shows the stored solution');
      h.assert(n2.conf.indexOf('Forgot something') !== -1, 'practice review shows Forgot something, got ' + n2.conf);
      h.assert(!n2.assess, 'practice review does not mount grading chips');
      h.assert(n2.backResults, 'practice review offers Back to results');
      var n2Pick = JSON.parse(await page.eval(function () {
        var ans = document.querySelector('.choice.is-answer');
        var wrong = document.querySelector('.choice.is-wrong');
        return JSON.stringify({
          answer: ans ? ans.textContent : '',
          wrong: wrong ? wrong.textContent : ''
        });
      }));
      h.assert(n2Pick.answer.indexOf('Prac new B first') !== -1, 'missed practice review marks the correct choice');
      h.assert(n2Pick.wrong.indexOf('Prac new B third') !== -1, 'missed practice review tints the stored pick');
    } },
  { name: 'older practice set from History', shot: 'practice-old-review',
    run: async function (page, h) {
      await h.inject();
      await h.go('#/practice/session/s-prac-old');
      await h.wait('!!document.querySelector(".summary-score")', 'old-practice results');
      var old = await h.screen();
      h.assert(old.palette.indexOf('How this set went') !== -1, 'old practice shows How this set went');
      h.assert(old.reviewCells === 2, 'old practice palette has two review cells');
      await h.click('[data-review="0"]');
      await h.wait('document.querySelector(".q-text") && document.querySelector(".q-text").textContent.indexOf("PRAC-OLD-A stem") !== -1',
        'old-practice question 1');
      var o1 = await h.screen();
      h.assert(o1.q.indexOf('PRAC-OLD-A stem') !== -1, 'old practice review shows PRAC-OLD-A');
      h.assert(o1.conf.indexOf('Guessed') !== -1 && o1.conf.indexOf('Too slow') !== -1,
        'old practice review shows Guessed and Too slow, got ' + o1.conf);
      var o1Time = await page.eval(function () {
        var chips = [];
        document.querySelectorAll('.practice-meta .chip').forEach(function (c) { chips.push(c.textContent); });
        return chips.join(' | ');
      });
      h.assert(/4\.3 s/.test(o1Time), 'old practice review shows the stored time, got ' + o1Time);
    } },
  { name: 'missing practice question fallback', shot: 'practice-missing',
    run: async function (page, h) {
      await h.inject();
      await h.go('#/practice/session/s-prac-gone');
      await h.wait('!!document.querySelector("[data-review]")', 'gone-practice results');
      await h.click('[data-review="0"]');
      await h.wait('!!document.getElementById("missing-q-note") || ' +
        '(document.querySelector(".q-text") && /no longer in the bank/.test(document.querySelector(".q-text").textContent))',
        'missing practice-question fallback');
      var goneNote = await page.eval(function () {
        var n = document.getElementById('missing-q-note');
        var q = document.querySelector('.q-text');
        return (n ? n.textContent : '') + ' ' + (q ? q.textContent : '');
      });
      h.assert(/no longer in the bank/.test(goneNote), 'practice missing fallback copy is on screen: ' + goneNote);
      var writes = await h.writes();
      h.assert(writes.recordAnswer === 0 && writes.gradeCard === 0 && writes.endSession === 0,
        'missing-question practice review called no recordAnswer / gradeCard / endSession, got ' + JSON.stringify(writes));
    } },
  { name: 'live parked practice set still resumes', shot: 'practice-live-resume',
    run: async function (page, h) {
      await h.inject();
      var parked = await page.eval(function () { return sessionStorage.getItem('pgre-practice-session'); });
      h.assert(parked && parked.indexOf('s-prac-live') !== -1 && parked.indexOf('hdr-prac-live') !== -1,
        'parked live practice snapshot is still in sessionStorage');
      await h.go('#/practice/all');
      await h.wait('!!document.getElementById("resume-btn")', 'practice resume card');
      var live = await h.screen();
      h.assert(live.resumeCard, 'the parked practice set still offers Resume');
      await page.eval(function () {
        sessionStorage.setItem('pgre-practice-resume', '1');
      });
      await h.go('#/practice/all');
      await h.wait('document.querySelector(".q-text") && document.querySelector(".q-text").textContent.indexOf("LIVE-PRAC-STEM") !== -1',
        'live parked practice resumes');
      var q = await page.eval(function () {
        var t = document.querySelector('.q-text');
        return t ? t.textContent : '';
      });
      h.assert(q.indexOf('LIVE-PRAC-STEM') !== -1, 'resumed live practice shows its question');
      var liveKey = await page.eval(function () {
        return !document.querySelector('.choice.is-answer') && !document.querySelector('.feedback-good, .feedback-bad');
      });
      h.assert(liveKey, 'resumed live practice still hides the unanswered key');
      var writes = await h.writes();
      h.assert(writes.recordAnswer === 0 && writes.gradeCard === 0 && writes.endSession === 0,
        'resuming the live practice set called no recordAnswer / gradeCard / endSession, got ' + JSON.stringify(writes));
    } }
];

function run(args, env, input) {
  return new Promise(function (resolve, reject) {
    var child = spawn('chrome-devtools-axi', args, { env: env, stdio: ['pipe', 'pipe', 'pipe'] });
    var output = '';
    child.stdout.on('data', function (chunk) { output += chunk; });
    if (args[0] === 'run') child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
    child.on('error', reject);
    child.on('exit', function (code) {
      if (code === 0 && output.indexOf('BROWSER_TEST_FAILED:') === -1) resolve();
      else reject(new Error('chrome-devtools-axi ' + args[0] + ' exited ' + code +
        (output.indexOf('BROWSER_TEST_FAILED:') !== -1
          ? '\n' + output.split('BROWSER_TEST_FAILED:').pop()
          : '')));
    });
    child.stdin.end(input || '');
  });
}

async function main() {
  staticChecks();
  var profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pgre-hist-drill-review-chrome-'));
  var shots = process.env.PGRE_HIST_DRILL_SHOTS ? path.resolve(process.env.PGRE_HIST_DRILL_SHOTS) : '';
  if (shots) fs.mkdirSync(shots, { recursive: true });
  var bridge = { refused: 0 };
  var server = http.createServer(function (request, response) {
    var pathname = decodeURIComponent(request.url.split('?')[0]);
    if (request.method === 'POST' && pathname === CSP_REPORT_PATH) {
      var report = '';
      request.on('data', function (chunk) { report += chunk; });
      request.on('end', function () {
        try { if (isBridgeUrl(JSON.parse(report)['csp-report']['blocked-uri'])) bridge.refused++; } catch (e) {}
        response.writeHead(204); response.end();
      });
      return;
    }
    var file = path.resolve(ROOT, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      response.writeHead(404); response.end(); return;
    }
    response.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Content-Security-Policy': PAGE_CSP
    });
    fs.createReadStream(file).pipe(response);
  });
  var env = Object.assign({}, process.env, {
    CHROME_DEVTOOLS_AXI_SESSION: 'pgre-hist-drill-review-' + process.pid,
    CHROME_DEVTOOLS_AXI_AUTO_CONNECT: '0',
    CHROME_DEVTOOLS_AXI_BROWSER_URL: '',
    CHROME_DEVTOOLS_AXI_USER_DATA_DIR: profile
  });
  try {
    await new Promise(function (resolve) { server.listen(0, '127.0.0.1', resolve); });
    env.PGRE_HIST_DRILL_TEST_URL = 'http://127.0.0.1:' + server.address().port + '/';
    await run(['open', env.PGRE_HIST_DRILL_TEST_URL], env);
    await run(['emulate', '--viewport', '1280x800'], env);
    for (var i = 0; i < STAGES.length; i++) {
      console.log('\n' + STAGES[i].name);
      await run(['run'], env, 'try { var h = await (' + helpers.toString() + ')(page); await (' +
        STAGES[i].run.toString() +
        ')(page, h); } catch (error) { console.log("BROWSER_TEST_FAILED: " + error.stack); }');
      if (shots && STAGES[i].shot) {
        await run(['screenshot', path.join(shots, STAGES[i].shot + '.png')], env);
        console.log('screenshot ' + STAGES[i].shot + '.png');
      }
    }
    if (!bridge.refused) {
      throw new Error('Chrome reported no refused request to the status bridge on port ' + BRIDGE_PORT);
    }
    console.log('PASS: the status bridge on port ' + BRIDGE_PORT + ' received nothing (Chrome refused the request on ' +
      bridge.refused + ' page load(s))');
    console.log('\nALL OK');
  } finally {
    await run(['stop'], env).catch(function (error) { console.error(error.message); });
    await new Promise(function (resolve) { server.close(resolve); });
    fs.rmSync(profile, { recursive: true, force: true });
  }
}

main().catch(function (error) { console.error(error.message); process.exitCode = 1; });
