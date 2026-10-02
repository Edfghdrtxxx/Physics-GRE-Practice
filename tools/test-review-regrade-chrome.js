#!/usr/bin/env node
/* Real-page check of the grading control on review-result pages: practice
   review (resumed session, unscheduled, incorrect and archived answers) and
   mistake-drill review and reveal (resumed drill). Synthetic questions in an
   isolated Chrome profile on a throwaway port; never the saved profile.
   Run: node tools/test-review-regrade-chrome.js
   PGRE_REGRADE_SHOTS=<dir> also saves one screenshot per stage. */
'use strict';

var fs = require('fs');
var http = require('http');
var path = require('path');
var spawn = require('child_process').spawn;
var ROOT = path.resolve(__dirname, '..');
var MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.svg': 'image/svg+xml' };

/* Runs inside `chrome-devtools-axi run` before every stage (each stage is a
   separate run against the same page, so nothing here may hold state). */
async function helpers(page) {
  var URL = process.env.PGRE_REGRADE_TEST_URL;
  var IDS = ['rr-a', 'rr-b', 'rr-c', 'rr-d'];

  function sleep(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
  var h = { sleep: sleep };

  function assert(condition, message) {
    if (!condition) throw new Error(message);
    console.log('PASS: ' + message);
  }

  async function wait(selector) {
    for (var attempt = 0; attempt < 100; attempt++) {
      if (await page.eval('!!document.querySelector(' + JSON.stringify(selector) + ')')) return;
      await h.sleep(100);
    }
    throw new Error('Timeout waiting for ' + selector);
  }

  async function click(selector) {
    await page.eval('() => { var b = document.querySelector(' + JSON.stringify(selector) +
      '); b.focus(); b.click(); }');
  }

  /* The synthetic bank lives in RAM, so every load re-adds it. */
  async function inject() {
    await wait('#main');
    await page.eval('() => { var ids = ' + JSON.stringify(IDS) + ';' +
      'PGRE.store.state.settings.keyboard = true;' +
      'ids.forEach(function (id) {' +
      '  if (PGRE.QUESTIONS.some(function (q) { return q.id === id; })) return;' +
      '  PGRE.QUESTIONS.push({ id: id, topic: "em", difficulty: 1,' +
      '    q: "<p>Synthetic review question " + id + ": choose the first option.</p>",' +
      '    choices: ["First option", "Second option"], answer: 0,' +
      '    sol: "<p>The first option is the test answer.</p>" });' +
      '});' +
      'PGRE._resetBankCache(); }');
  }

  async function onScreen() {
    return page.eval(function () {
      var t = document.querySelector('.q-text');
      var m = t && t.textContent.match(/rr-[a-d]/);
      return m ? m[0] : '';
    });
  }

  async function answer(correct) {
    await click('.choice[data-idx="' + (correct ? 0 : 1) + '"]');
    await click('#confirm-btn');
    await wait('[data-assess]');
  }

  /* Everything a regrade must leave alone, plus what it may change. */
  async function state() {
    return JSON.parse(await page.eval(function () {
      var s = PGRE.store.state;
      var disk = JSON.parse(localStorage.getItem('pgre-state-v1'));
      var out = { attempts: s.attempts.length, diskAttempts: disk.attempts.length,
        xp: s.xp, diskXp: disk.xp, rows: {}, mk: {} };
      s.attempts.forEach(function (a) {
        out.rows[a.qid] = { confidence: a.confidence || null, tags: (a.tags || []).join(',') };
      });
      Object.keys(s.mistakes).forEach(function (qid) {
        var mk = s.mistakes[qid];
        out.mk[qid] = { days: PGRE.srs.daysUntil(mk.srs.due),
          baseDays: mk.srs.baseDue ? PGRE.srs.daysUntil(mk.srs.baseDue) : null,
          step: mk.srs.step, misses: mk.misses, solves: mk.solves,
          lucky: !!mk.lucky, stuck: !!mk.stuck, archived: !!mk.archivedAt,
          diskDue: disk.mistakes[qid] && disk.mistakes[qid].srs.due === mk.srs.due };
      });
      return JSON.stringify(out);
    }));
  }

  /* What the captain sees in the grading panel. */
  async function panel() {
    return JSON.parse(await page.eval(function () {
      var row = document.getElementById('assess-row');
      var win = document.getElementById('assess-window');
      var label = document.getElementById('next-review-label');
      var phrase = document.getElementById('next-review-phrase');
      var sol = document.querySelector('.solution');
      var on = [];
      document.querySelectorAll('[data-assess][aria-pressed="true"]').forEach(function (b) {
        on.push(b.getAttribute('data-assess'));
      });
      return JSON.stringify({
        row: !!row, review: !!(row && row.classList.contains('assess-review')),
        readOnlyLine: !!document.querySelector('#feedback .conf-note'),
        on: on.join(','),
        from: win && !document.getElementById('assess-window-from').hidden
          ? document.getElementById('assess-window-from').textContent : '',
        to: win ? document.getElementById('assess-window-to').textContent : null,
        date: win ? document.getElementById('assess-window-date').textContent : '',
        moved: !!(win && win.classList.contains('is-moved')),
        pulse: !!(win && win.classList.contains('is-pulse')),
        banner: label && phrase && !phrase.hidden ? label.textContent : '',
        bannerText: (document.querySelector('#feedback .feedback strong') || {}).textContent || '',
        note: (document.getElementById('assess-note') || {}).textContent || '',
        confirmOpen: !!(document.getElementById('assess-stuck-confirm') &&
                        !document.getElementById('assess-stuck-confirm').hidden),
        rowHeight: row ? Math.round(row.getBoundingClientRect().height) : 0,
        solutionTop: sol ? Math.round(sol.getBoundingClientRect().top + window.scrollY) : 0,
        hints: document.querySelectorAll('#assess-row .key-hint').length
      });
    }));
  }

  /* What the strip must read for these chips, taken from the shared rule
     (srs.assessWaitDays) and the answer's saved base, so a chip's effect on
     the date is never restated here. */
  async function expected(qid, chips) {
    return JSON.parse(await page.eval('() => { var flags = {};' +
      JSON.stringify(chips) + '.forEach(function (k) { flags[k] = true; });' +
      'var mk = PGRE.store.state.mistakes[' + JSON.stringify(qid) + '];' +
      'var base = PGRE.srs.daysUntil(mk.srs.baseDue || mk.srs.due);' +
      'var days = PGRE.srs.assessWaitDays(base, flags);' +
      'return JSON.stringify({ days: days, to: PGRE.srs.ivlLabel(days),' +
      '  from: days === base ? "" : PGRE.srs.ivlLabel(base), moved: days !== base }); }'));
  }

  async function openReview(qid) {
    var n = await page.eval(function () { return document.querySelectorAll('[data-review]').length; });
    for (var i = 0; i < n; i++) {
      await page.eval('() => { document.querySelectorAll("[data-review]")[' + i + '].click(); }');
      await wait('#review-summary');
      if (await onScreen() === qid) return;
    }
    throw new Error('No review page for ' + qid);
  }

  async function frame() {
    await page.eval(function () {
      var row = document.getElementById('assess-row');
      if (row) row.scrollIntoView({ block: 'center' });
    });
    await h.sleep(650);   // let the one-shot pulse finish before a screenshot
  }

  return { sleep: sleep, URL: URL, IDS: IDS, assert: assert, wait: wait, click: click, inject: inject,
    onScreen: onScreen, answer: answer, state: state, panel: panel, expected: expected, openReview: openReview, frame: frame };
}

var STAGES = [
  { shot: '01-practice-review-opens-on-saved-grading', run: async function (page, h) {
    await page.open(h.URL);
    await h.inject();
    await page.eval(function () {
      var now = new Date().toISOString(), today = PGRE.srs.today();
      function entry(step, due, extra) {
        var mk = { firstMissedAt: now, lastMissedAt: now, misses: 1, solves: 0, wrongPicks: [1],
          lastPick: 1, archivedAt: null, srs: { step: step, due: due } };
        Object.keys(extra || {}).forEach(function (k) { mk[k] = extra[k]; });
        return mk;
      }
      PGRE.store.state.mistakes['rr-a'] = entry(0, today);              // a solve climbs to 3 d
      PGRE.store.state.mistakes['rr-d'] = entry(2, PGRE.srs.addDays(7), // archived: a solve keeps 7 d
        { archivedAt: now });
      PGRE.store.save();
      sessionStorage.setItem('pgre-quiz-config', JSON.stringify({
        ids: ['rr-a', 'rr-b', 'rr-c', 'rr-d'], label: 'Regrade test', purpose: 'similar' }));
      location.hash = '#/practice/custom';
    });
    // Answer up to and including rr-a, grading it Forgot something on the
    // answer page, then reload so the rest runs in a resumed session.
    var gradedA = false, guard = 0;
    while (!gradedA && guard++ < 6) {
      await h.wait('.choice[data-idx="0"]:not([disabled])');
      var qid = await h.onScreen();
      await h.answer(qid !== 'rr-c');
      if (qid === 'rr-a') {
        await h.click('[data-assess="forgot"]');
        gradedA = true;
      } else {
        await h.sleep(350);
        await h.click('#next-btn');
      }
    }
    h.assert(gradedA && (await h.state()).mk['rr-a'].days === 1,
      'answer page: Forgot something on a 3 d answer stores tomorrow');
    await page.open(h.URL);
    await h.inject();
    await page.eval(function () { location.hash = '#/practice/custom'; });
    await h.wait('#resume-btn');
    await h.click('#resume-btn');
    for (guard = 0; guard < 12; guard++) {
      await h.sleep(350);
      if (await page.eval('!!document.querySelector(".summary-score, #summary-export-btn, [data-review]") && !document.querySelector(".q-text")')) break;
      if (await page.eval('!!document.querySelector(".choice[data-idx]:not([disabled])")')) {
        await h.answer(await h.onScreen() !== 'rr-c');
        await h.sleep(350);
      }
      await h.click('#next-btn');
    }
    await h.wait('[data-review]');
    var base = await h.state();
    h.assert(base.attempts === 4 && base.diskAttempts === 4, 'resumed practice session finished with four recorded attempts');
    await page.eval('() => { window.__regradeBase = ' + JSON.stringify(JSON.stringify(base)) + '; }');
    await h.openReview('rr-a');
    var p = await h.panel();
    h.assert(p.row && p.review && !p.readOnlyLine,
      'practice review shows the grading chips in place of the read-only line');
    h.assert(p.on === 'forgot', 'the chip saved before the reload is the one selected');
    h.assert(p.from === '3 d' && p.to === '1 d' && p.moved && !p.pulse && p.banner === '1 d',
      'the review window opens on 3 d before and 1 d now, and the banner agrees');
    h.assert(p.hints === 5, 'the chips carry the same K G T F R hints as the answer page');
    h.assert(JSON.stringify(await h.state()) === JSON.stringify(base), 'opening the review page writes nothing');
    await h.frame();
  } },

  { shot: '02-practice-review-unpicked-restores-saved-date', run: async function (page, h) {
    var base = JSON.parse(await page.eval(function () { return window.__regradeBase; }));
    var before = await h.panel();
    await h.click('[data-assess="forgot"]');
    var p = await h.panel(), s = await h.state();
    h.assert(p.on === '' && p.from === '' && p.to === '3 d' && !p.moved && p.pulse && p.banner === '3 d',
      'unpicking Forgot something shows 3 d alone at once, in the strip and the banner');
    h.assert(s.mk['rr-a'].days === 3 && s.mk['rr-a'].baseDays === 3 && s.mk['rr-a'].diskDue,
      'the stored review date is back on the saved date, on disk too');
    h.assert(p.rowHeight === before.rowHeight && p.solutionTop === before.solutionTop,
      'the tap moves nothing on the page (panel height and solution position unchanged)');
    h.assert(s.attempts === base.attempts && s.xp === base.xp && s.mk['rr-a'].step === base.mk['rr-a'].step &&
      s.mk['rr-a'].misses === base.mk['rr-a'].misses && s.mk['rr-a'].solves === base.mk['rr-a'].solves,
      'no attempt, XP, miss, solve, or ladder step was added');
    await h.frame();
  } },

  { shot: '03-practice-review-guessed-by-keyboard', run: async function (page, h) {
    var base = JSON.parse(await page.eval(function () { return window.__regradeBase; }));
    var before = await h.panel();
    await page.press('g');
    var p = await h.panel(), s = await h.state();
    h.assert(p.on === 'guess' && p.from === '3 d' && p.to === '2 d' && p.moved && p.pulse && p.banner === '2 d',
      'G selects Guessed and the window reads 3 d then 2 d');
    h.assert(s.mk['rr-a'].days === 2 && s.mk['rr-a'].lucky && s.rows['rr-a'].confidence === 'guess',
      'the date, the lucky-guess flag and the attempt row all follow the regrade');
    h.assert(p.rowHeight === before.rowHeight && p.solutionTop === before.solutionTop, 'no layout movement on the key press');
    await page.press('t');
    p = await h.panel();
    h.assert(p.on === 'guess,slow' && p.to === '2 d', 'T adds Too slow and the wait is halved once, not twice');
    await page.press('t');
    s = await h.state();
    h.assert(s.attempts === base.attempts && s.xp === base.xp, 'keyboard regrades add no attempt or XP');
    await h.frame();
  } },

  { shot: '04-practice-review-keep-failing-asks-first', run: async function (page, h) {
    await page.press('g');
    var cleared = await h.state();
    h.assert(!cleared.mk['rr-a'].lucky && cleared.mk['rr-a'].days === 3 && cleared.rows['rr-a'].confidence === null,
      'unpicking Guessed removes the lucky flag and restores 3 d');
    await page.press('r');
    var p = await h.panel();
    h.assert(p.confirmOpen && p.on === '' && JSON.stringify(await h.state()) === JSON.stringify(cleared),
      'R opens the Keep failing confirmation and writes nothing yet');
    await h.frame();
  } },

  { shot: '05-practice-review-keep-failing-confirmed', run: async function (page, h) {
    await page.press('Escape');
    var p = await h.panel();
    h.assert(!p.confirmOpen && await page.eval('!!document.getElementById("review-summary")'),
      'Escape closes the confirmation and stays on the review page');
    await page.press('r');
    await page.press('Enter');
    p = await h.panel();
    var s = await h.state();
    var want = await h.expected('rr-a', ['stuck']);
    h.assert(p.on === 'stuck' && s.mk['rr-a'].stuck && p.to === want.to && p.from === want.from &&
      p.moved === want.moved && s.mk['rr-a'].days === want.days && p.banner === want.to,
      'confirmed Keep failing flags the problem and the window follows the shared rule (' +
        (want.from ? want.from + ' then ' : '') + want.to + ')');
    await page.press('k');
    p = await h.panel(); s = await h.state();
    want = await h.expected('rr-a', ['sure', 'stuck']);
    h.assert(p.on === 'sure,stuck' && p.to === want.to && p.from === want.from && p.moved === want.moved &&
      s.mk['rr-a'].days === want.days,
      'K adds Knew it and the window still follows the shared rule (' + want.to + ')');
    await h.frame();
  } },

  { shot: '06-practice-review-unscheduled-answer-guessed', run: async function (page, h) {
    await h.click('#review-summary');
    await h.wait('[data-review]');
    await h.openReview('rr-b');
    var p = await h.panel();
    h.assert(p.review && p.on === '' && p.to === 'not scheduled' && p.from === '' && p.banner === '',
      'a correct answer with no schedule reads not scheduled');
    await h.click('[data-assess="guess"]');
    p = await h.panel();
    var s = await h.state();
    h.assert(p.from === 'not scheduled' && p.to === '1 d' && p.banner === '1 d' && s.mk['rr-b'].lucky,
      'Guessed files it and the window reads not scheduled then 1 d');
    await h.frame();
  } },

  { shot: '07-practice-review-incorrect-answer', run: async function (page, h) {
    await h.click('[data-assess="guess"]');
    var s = await h.state();
    h.assert(!s.mk['rr-b'] && (await h.panel()).to === 'not scheduled', 'unpicking removes the lucky-only entry again');
    await h.openReview('rr-c');
    var p = await h.panel();
    h.assert(p.review && p.bannerText.indexOf('Incorrect') === 0 && p.to === '1 d' && p.from === '',
      'an incorrect answer shows the chips and its 1 d window');
    await h.click('[data-assess="slow"]');
    p = await h.panel(); s = await h.state();
    h.assert(p.on === 'slow' && p.to === '1 d' && !p.moved && s.rows['rr-c'].tags === 'slow' && s.mk['rr-c'].misses === 1,
      'Too slow is saved on it and a 1 d wait is never cut further');
    await h.frame();
  } },

  { shot: '08-practice-review-archived-entry', run: async function (page, h) {
    var base = JSON.parse(await page.eval(function () { return window.__regradeBase; }));
    await h.openReview('rr-d');
    var p = await h.panel();
    h.assert(p.review && p.to === '7 d' && p.from === '', 'an archived entry opens on its own 7 d window');
    await h.click('[data-assess="forgot"]');
    p = await h.panel();
    var s = await h.state();
    h.assert(p.from === '7 d' && p.to === '1 d' && s.mk['rr-d'].days === 1 && s.mk['rr-d'].archived &&
      s.mk['rr-d'].step === base.mk['rr-d'].step,
      'Forgot something moves it to tomorrow and leaves it archived on the same ladder step');
    await h.frame();
  } },

  { shot: '09-practice-results-then-reopened', run: async function (page, h) {
    var base = JSON.parse(await page.eval(function () { return window.__regradeBase; }));
    await h.click('#review-summary');
    await h.wait('[data-review]');
    await page.press('f');
    await page.press('g');
    var s = await h.state();
    h.assert(s.rows['rr-d'].tags === 'forgot' && s.rows['rr-a'].confidence === 'sure',
      'chip keys on the results page change nothing');
    await h.openReview('rr-a');
    var p = await h.panel();
    var want = await h.expected('rr-a', ['sure', 'stuck']);
    h.assert(p.on === 'sure,stuck' && p.to === want.to && p.from === want.from,
      'reopening a regraded question paints what was saved');
    h.assert(s.attempts === base.attempts && s.diskAttempts === base.attempts && s.xp === base.xp && s.diskXp === base.xp,
      'after every practice regrade: still four attempts and the same XP, in memory and on disk');
    await h.frame();
  } },

  { shot: '10-mistake-drill-result-after-resume', run: async function (page, h) {
    await page.eval(function () {
      var today = PGRE.srs.today();
      ['rr-a', 'rr-c'].forEach(function (qid) {
        var mk = PGRE.store.state.mistakes[qid];
        delete mk.stuck; delete mk.lastStuckAt; delete mk.stuckSole;
        mk.srs = { step: qid === 'rr-a' ? 1 : 0, due: today, baseDue: today };
      });
      PGRE.store.save();
      location.hash = '#/mistakes';
    });
    await h.wait('#drill-due');
    await h.click('#drill-due');
    await h.wait('.choice[data-idx="0"]');
    var first = await h.onScreen();
    await h.answer(true);
    await h.click('[data-assess="guess"]');
    var graded = await h.state();
    h.assert(graded.rows[first].confidence === 'guess' && graded.mk[first].days < graded.mk[first].baseDays,
      'mistake drill answer page: Guessed halves the fresh wait');
    await page.eval('() => { window.name = ' + JSON.stringify(first) + '; }');
    await page.open(h.URL);
    await h.inject();
    await page.eval(function () { location.hash = '#/mistakes/drill'; });
    await h.wait('#drill-finish');
    h.assert(await h.onScreen() === first, 'the resumed drill reopens on the answered question');
    var before = await h.state();
    // Put the saved result on screen if the resume has not already done so.
    if (!(await h.panel()).row) {
      await h.click('.choice[data-idx="0"]');
      await h.click('#confirm-btn');
    }
    await h.wait('#assess-row');
    var p = await h.panel(), s = await h.state();
    h.assert(p.review && !p.readOnlyLine && p.on === 'guess' && p.moved &&
      JSON.stringify(s) === JSON.stringify(before),
      'the saved result is back on screen with Guessed selected and nothing new recorded');
    await page.press('t');
    p = await h.panel(); s = await h.state();
    h.assert(p.on === 'guess,slow' && s.rows[first].tags === 'slow' && s.attempts === before.attempts && s.xp === before.xp,
      'T regrades the revealed result on the same attempt');
    await page.press('t');
    await h.frame();
  } },

  { shot: '11-mistake-drill-review-regraded', run: async function (page, h) {
    var first = await page.eval(function () { return window.name; });
    await h.click('#drill-next');
    await h.wait('.choice[data-idx="0"]');
    var second = await h.onScreen();
    h.assert(second && second !== first, 'the resumed drill moves on to the other question');
    await h.answer(true);
    await page.eval(function () { document.getElementById('drill-finish').click(); });
    await h.wait('[data-review]');
    var base = await h.state();
    await h.openReview(first);
    var p = await h.panel();
    var wasLabel = p.from, halved = p.to;
    h.assert(p.review && !p.readOnlyLine && p.on === 'guess' && p.moved && !p.pulse && p.hints === 5,
      'mistake-drill review shows the chips with the saved Guessed and the moved window');
    h.assert(JSON.stringify(await h.state()) === JSON.stringify(base), 'opening the mistake-drill review writes nothing');
    var before = p;
    await page.press('g');
    p = await h.panel();
    var s = await h.state();
    h.assert(p.on === '' && p.from === '' && p.to === wasLabel && p.banner === wasLabel &&
      s.mk[first].days === s.mk[first].baseDays,
      'G unpicks it and the window returns to the saved ' + wasLabel + ' (it was ' + halved + ')');
    h.assert(p.rowHeight === before.rowHeight && p.solutionTop === before.solutionTop, 'no layout movement in the drill review');
    await page.press('f');
    p = await h.panel(); s = await h.state();
    h.assert(p.on === 'forgot' && p.from === wasLabel && p.to === '1 d' && p.pulse && s.mk[first].days === 1,
      'F selects Forgot something: ' + wasLabel + ' then 1 d, stored as tomorrow');
    h.assert(s.attempts === base.attempts && s.diskAttempts === base.attempts && s.xp === base.xp &&
      s.mk[first].step === base.mk[first].step && s.mk[first].solves === base.mk[first].solves,
      'the drill regrade adds no attempt, XP, solve, or ladder step');
    await h.frame();
  } },

  { shot: '12-mistake-book-after-regrade', run: async function (page, h) {
    var first = await page.eval(function () { return window.name; });
    await h.click('#review-next');
    await h.sleep(200);
    if (await h.onScreen() === first) { await h.click('#review-prev'); await h.sleep(200); }
    var second = await h.onScreen();
    var p = await h.panel();
    h.assert(second !== first && p.review && p.on === '' && p.from === '',
      'the other drilled question opens ungraded on its own window');
    await h.click('[data-assess="sure"]');
    h.assert((await h.panel()).on === 'sure' && (await h.panel()).to === p.to, 'Knew it is saved and keeps its date');
    await h.click('#review-summary');
    await h.wait('#back-book');
    await h.click('#back-book');
    await h.wait('#drill-all');
    var s = await h.state();
    await page.press('f');
    await page.press('k');
    await page.press('g');
    h.assert(JSON.stringify(await h.state()) === JSON.stringify(s),
      'chip keys do nothing once the review page is gone');
    h.assert(s.mk[first].days === 1 && s.rows[first].tags === 'forgot' && s.rows[second].confidence === 'sure',
      'the book keeps the regraded date and both gradings');
    await h.sleep(300);
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
      else reject(new Error('chrome-devtools-axi ' + args[0] + ' exited ' + code));
    });
    child.stdin.end(input || '');
  });
}

async function main() {
  var profile = fs.mkdtempSync(path.join(ROOT, '.pgre-regrade-chrome-'));
  var shots = process.env.PGRE_REGRADE_SHOTS ? path.resolve(process.env.PGRE_REGRADE_SHOTS) : '';
  if (shots) fs.mkdirSync(shots, { recursive: true });
  var server = http.createServer(function (request, response) {
    var pathname = decodeURIComponent(request.url.split('?')[0]);
    var file = path.resolve(ROOT, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      response.writeHead(404); response.end(); return;
    }
    response.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(response);
  });
  var env = Object.assign({}, process.env, {
    CHROME_DEVTOOLS_AXI_SESSION: 'pgre-review-regrade-' + process.pid,
    CHROME_DEVTOOLS_AXI_AUTO_CONNECT: '0',
    CHROME_DEVTOOLS_AXI_BROWSER_URL: '',
    CHROME_DEVTOOLS_AXI_USER_DATA_DIR: profile
  });
  try {
    await new Promise(function (resolve) { server.listen(0, '127.0.0.1', resolve); });
    env.PGRE_REGRADE_TEST_URL = 'http://127.0.0.1:' + server.address().port + '/';
    for (var i = 0; i < STAGES.length; i++) {
      console.log('\n' + STAGES[i].shot);
      await run(['run'], env, 'try { var h = await (' + helpers.toString() + ')(page); await (' +
        STAGES[i].run.toString() + ')(page, h); } catch (error) { console.log("BROWSER_TEST_FAILED: " + error.stack); }');
      if (shots) {
        if (i === 0) await run(['resize', '1180', '900'], env);
        await run(['screenshot', path.join(shots, STAGES[i].shot + '.png')], env);
      }
    }
    console.log('\nALL OK');
  } finally {
    await run(['stop'], env).catch(function (error) { console.error(error.message); });
    await new Promise(function (resolve) { server.close(resolve); });
    fs.rmSync(profile, { recursive: true, force: true });
  }
}

main().catch(function (error) { console.error(error.message); process.exitCode = 1; });
