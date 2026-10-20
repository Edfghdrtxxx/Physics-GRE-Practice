#!/usr/bin/env node
/* Real-page checks of Recall scheduling paths that could keep a graded
   card in the session, drop a grade, or keep a due card out. Each stage
   names the path it checks. Where a stage needs two tabs, a second app
   instance in an iframe on the same origin stands in for the second tab;
   it drops storage events to act like a tab that missed them.
   Isolated Chrome profile on a throwaway 127.0.0.1 port; never the saved
   studio. The status bridge on 127.0.0.1:4789 is refused by CSP.
   Run: node tools/test-recall-schedule-chrome.js
   PGRE_RECALL_SCHEDULE_SHOTS=<dir> also saves a screenshot after each stage
   that names one. */
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

async function helpers(page) {
  var URL = process.env.PGRE_RECALL_SCHEDULE_TEST_URL;
  function sleep(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
  var h = { sleep: sleep, URL: URL };

  h.assert = function (condition, message) {
    if (!condition) throw new Error(message);
    console.log('PASS: ' + message);
  };

  async function wait(selector) {
    for (var attempt = 0; attempt < 100; attempt++) {
      if (await page.eval('!!document.querySelector(' + JSON.stringify(selector) + ')')) return;
      await sleep(100);
    }
    throw new Error('Timeout waiting for ' + selector);
  }
  h.wait = wait;

  h.click = async function (selector) {
    await page.eval('() => { var b = document.querySelector(' + JSON.stringify(selector) +
      '); if (!b) throw new Error("missing " + ' + JSON.stringify(selector) + '); b.click(); }');
  };

  /* The synthetic deck in this page's globals. Re-applied after a reload,
     because PGRE.FORMULAS comes back as the shipped file. */
  h.useDeck = async function (cards) {
    await page.eval('() => { var spec = ' + JSON.stringify(cards) + ';' +
      'PGRE.FORMULAS = spec.map(function (c) { return { id: c.id, topic: c.topic, name: "Card " + c.id,' +
      '  front: "prompt " + c.id, back: "$" + c.id.replace(/[^a-z]/g, "") + "=1$", note: "" }; });' +
      'PGRE.BOOK_FORMULAS = []; PGRE.BOOK_LISTS = []; }');
  };

  /* Seed a synthetic deck and today's list. cards: [{ id, topic, learned,
     lapsed }]. A learned card is a review due today with a 5-day interval;
     a lapsed card was missed yesterday and is relearning (interval 0). */
  h.seed = async function (cards) {
    if (!(await page.eval('!!document.getElementById("main")'))) {
      await page.open(URL);
      await wait('#main');
    }
    await page.eval(function () { location.hash = '#/'; });
    await sleep(250);
    await h.useDeck(cards);
    await page.eval('() => { var spec = ' + JSON.stringify(cards) + ';' +
      'var s = PGRE.store.state, today = PGRE.srs.today(); s.cards = {}; s.cardReviews = []; s.reviewUndos = {};' +
      's.formulaPinFacts = {}; s.formulaSuspended = {}; s.formulaStudy = null; s.formulaStudyEnd = null;' +
      'spec.forEach(function (c) { if (c.learned) s.cards[c.id] = { reps: 2, lapses: 0, interval: 5,' +
      '  ease: 2.5, due: today, reviews: 2, lastGrade: "good", lastReviewedDay: PGRE.srs.addDaysTo(today, -5) };' +
      '  if (c.lapsed) s.cards[c.id] = { reps: 0, lapses: 1, interval: 0, ease: 2.3, due: today, reviews: 3,' +
      '  lastGrade: "again", lastReviewedDay: PGRE.srs.addDaysTo(today, -1) }; });' +
      's.formulaDay = { date: today,' +
      '  reviewIds: spec.filter(function (c) { return c.learned || c.lapsed; }).map(function (c) { return c.id; }),' +
      '  newIds: spec.filter(function (c) { return !c.learned && !c.lapsed; }).map(function (c) { return c.id; }) };' +
      's.settings.formulaDailyTarget = spec.length; s.settings.examDate = ""; s.settings.formulaReverse = false;' +
      'PGRE.store.save(); return PGRE.contentDB.put({ id: "formula-deck", kind: "formula-deck", cards: [] }); }');
  };

  h.study = async function () {
    await page.eval(function () { location.hash = '#/formulas'; });
    await wait('#study-btn, #resume-btn');
    await h.click('#study-btn, #resume-btn');
    await wait('.formula-palette .pal-cell.is-current');
  };

  h.seedAndStudy = async function (cards) {
    await h.seed(cards);
    await h.study();
  };

  /* What the screen and the store say right now. */
  h.look = async function () {
    return JSON.parse(await page.eval(function () {
      var s = PGRE.store.state;
      var disk = {};
      try { disk = JSON.parse(localStorage.getItem('pgre-state-v1') || '{}'); } catch (e) {}
      var cur = document.querySelector('.formula-palette .pal-cell.is-current');
      var line = document.querySelector('.formula-study-live .practice-meta > span:first-child');
      var cells = {};
      document.querySelectorAll('.formula-palette .pal-cell').forEach(function (b) {
        cells[b.getAttribute('data-id')] = {
          grade: (b.className.match(/is-(again|hard|good|easy|learning)/) || [])[1] || ''
        };
      });
      var fs = s.formulaStudy || {};
      var deck = PGRE.views.formulas.getDeck();
      return JSON.stringify({
        current: cur ? cur.getAttribute('data-id') : null,
        line: line ? line.textContent : '',
        summary: !!(document.querySelector('#flash-body h1') &&
          /Review complete/.test(document.querySelector('#flash-body h1').textContent)),
        flipped: !!(document.getElementById('fcard-back') && !document.getElementById('fcard-back').hidden),
        cells: cells,
        queueIds: fs.queueIds || [],
        diskQueueIds: (disk.formulaStudy && disk.formulaStudy.queueIds) || [],
        remaining: PGRE.srs.formulaDayRemaining(deck).map(function (c) { return c.id; }),
        cards: s.cards || {},
        diskCards: disk.cards || {},
        canWrite: PGRE.store.canWrite(),
        steps: fs.steps || {},
        text: (document.getElementById('flash-body') || document.body).textContent,
        chosen: (document.querySelector('#fcard-actions [data-grade][aria-pressed="true"]') || { getAttribute: function () { return ''; } }).getAttribute('data-grade'),
        toast: /Saving failed/.test(document.body.textContent),
        today: PGRE.srs.today()
      });
    }));
  };

  h.flip = async function () {
    var now = await h.look();
    if (!now.flipped) {
      await h.click('#flip-btn');
      await wait('#fcard-actions [data-grade="good"]');
    }
    return h.look();
  };

  h.press = async function (grade) {
    await h.click('#fcard-actions [data-grade="' + grade + '"]');
    await sleep(150);
    // An Again or a round checkpoint shows an overlay first; continue past it.
    for (var i = 0; i < 3; i++) {
      var more = await page.eval('!!document.getElementById("scaffold-continue") || !!document.getElementById("cp-keep")');
      if (!more) break;
      await page.eval('() => { var b = document.getElementById("scaffold-continue") || document.getElementById("cp-keep"); b.click(); }');
      await sleep(150);
    }
    return h.look();
  };

  /* A second app instance on the same origin, in an iframe, that drops
     every storage event the way a tab that missed one would. */
  h.openStaleTab = async function (cards) {
    await page.eval('() => new Promise(function (resolve, reject) {' +
      'var old = document.getElementById("stale-tab"); if (old) old.remove();' +
      'var f = document.createElement("iframe"); f.id = "stale-tab"; f.style.cssText = "width:1200px;height:800px";' +
      'f.src = "/index.html"; document.body.appendChild(f);' +
      'var n = 0; (function poll() { var w = f.contentWindow;' +
      '  if (w && w.PGRE && w.PGRE.store && w.PGRE.store.state && w.document.getElementById("main")) {' +
      '    w.addEventListener("storage", function (e) { e.stopImmediatePropagation(); }, true); resolve(); return; }' +
      '  if (++n > 100) { reject(new Error("stale tab did not boot")); return; } setTimeout(poll, 100); })(); })');
    await sleep(300);
    await page.eval('() => { var w = document.getElementById("stale-tab").contentWindow; var spec = ' + JSON.stringify(cards) + ';' +
      'w.PGRE.FORMULAS = spec.map(function (c) { return { id: c.id, topic: c.topic, name: "Card " + c.id,' +
      '  front: "prompt " + c.id, back: "$" + c.id.replace(/[^a-z]/g, "") + "=1$", note: "" }; });' +
      'w.PGRE.BOOK_FORMULAS = []; w.PGRE.BOOK_LISTS = []; }');
  };

  /* Open a graded card's box in the navigator and change its grade. */
  h.regradeTo = async function (id, grade) {
    await h.click('.formula-palette .pal-cell[data-id="' + id + '"]');
    await wait('.formula-study-live .peek-grade');
    await h.click('#fcard-actions [data-grade="' + grade + '"]');
    await sleep(200);
  };

  /* From the regrade view back to the live card: Back, then Resume study. */
  h.resumeLive = async function () {
    await h.click('#session-back');
    await wait('#peek-resume');
    await h.click('#peek-resume');
    await sleep(150);
  };

  /* Grade Good on every card until the summary. note(look) may return a
     value to record per card shown. */
  h.finish = async function (note) {
    var shown = [], notes = [];
    for (var guard = 0; guard < 14; guard++) {
      var now = await h.look();
      if (now.summary || !now.current) break;
      shown.push(now.current);
      now = await h.flip();
      if (note) { var v = note(now); if (v !== undefined) notes.push(v); }
      await h.press('good');
    }
    return { shown: shown, notes: notes, end: await h.look() };
  };

  /* One learned card graded live with first, then regraded through each of
     grades in turn. back: how many more times the card must be shown
     before the session ends (1 when the last regrade is Again). */
  h.regradeTrial = async function (page, first, grades, back) {
    await h.seedAndStudy([
      { id: 'rg-a', topic: 'cm', learned: true }, { id: 'rg-b', topic: 'em', learned: true },
      { id: 'rg-c', topic: 'qm', learned: true }
    ]);
    var start = await h.flip();
    var target = start.current;
    var graded = await h.press(first);
    var copies = graded.queueIds.filter(function (id) { return id === target; }).length;
    h.assert(copies === (first === 'again' ? 1 : 0),
      'live ' + first + ' leaves ' + copies + ' copy of the card in the queue');
    var now = graded;
    for (var i = 0; i < grades.length; i++) {
      await h.regradeTo(target, grades[i]);
      now = await h.look();
      var n = now.queueIds.filter(function (id) { return id === target; }).length;
      if (grades[i] === 'again') {
        h.assert(now.cards[target].lastGrade === 'again' && now.cards[target].due === now.today &&
          now.diskCards[target].lastGrade === 'again',
          'regrade to Again stores Again, due today');
        h.assert(n === 1 && now.queueIds[now.queueIds.length - 1] === target,
          'the card is in the queue once, at the end (queue: ' + now.queueIds.join(', ') + ')');
        h.assert(now.cells[target].grade === 'again', 'its box shows Again');
      } else {
        h.assert(now.cards[target].lastGrade === grades[i] && now.cards[target].due > now.today && n === 0,
          'regrade to ' + grades[i] + ' schedules a later day and takes the card out of the queue');
      }
    }
    await h.resumeLive();
    var run = await h.finish();
    var seen = run.shown.filter(function (id) { return id === target; }).length;
    h.assert(seen === back, 'the card is shown ' + back + ' more time(s) before the session ends (shown: ' +
      run.shown.join(', ') + ')');
    if (back) h.assert(run.shown[0] !== target && run.shown[run.shown.length - 1] === target,
      'leaving the regrade view goes back to the live card, and the Again card comes last');
    h.assert(run.end.summary, 'the session ends');
    h.assert(run.end.cards[target].due > run.end.today, 'the card ends scheduled for a later day');
    h.assert(back ? /1 came back for another pass/.test(run.end.text) : !/came back for another pass/.test(run.end.text),
      'the summary counts ' + back + ' card that came back');
  };

  h.FS_SPEC = [
    { id: 'fs-a', topic: 'cm', learned: true }, { id: 'fs-b', topic: 'em', learned: true },
    { id: 'fs-c', topic: 'qm', learned: true }
  ];

  /* One click while every write of the state blob throws, the way a full
     browser storage does. Returns whether saving worked just before. */
  h.clickWhileStorageFull = async function (selector) {
    return page.eval('() => { var orig = Storage.prototype.setItem;' +
      'Storage.prototype.setItem = function (k, v) { if (k === "pgre-state-v1") {' +
      '  var e = new Error("quota"); e.name = "QuotaExceededError"; throw e; } return orig.apply(this, arguments); };' +
      'var could = PGRE.store.canWrite();' +
      'try { document.querySelector(' + JSON.stringify(selector) + ').click(); }' +
      'finally { Storage.prototype.setItem = orig; } return could; }');
  };

  h.closeStaleTab = async function () {
    await page.eval('() => { var f = document.getElementById("stale-tab"); if (f) f.remove(); }');
  };

  return h;
}

var STAGES = [
  { name: 'regrade Good to Again puts the card back in the session', size: '1280x800',
    run: async function (page, h) {
      await h.regradeTrial(page, 'good', ['again'], 1);
    } },

  { name: 'regrade Hard to Again puts the card back in the session',
    run: async function (page, h) {
      await h.regradeTrial(page, 'hard', ['again'], 1);
    } },

  { name: 'regrade a requeued card: live Again, then Hard, then Again',
    run: async function (page, h) {
      await h.regradeTrial(page, 'again', ['hard', 'again'], 1);
    } },

  { name: 'regrade from Again to Good takes the repeat out of the session',
    run: async function (page, h) {
      await h.regradeTrial(page, 'again', ['good'], 0);
    } },

  { name: 'regrade Good to Again: the card is back on screen later in the session', shot: '01-regrade-again-back-live',
    run: async function (page, h) {
      await h.seedAndStudy([
        { id: 'rs-a', topic: 'cm', learned: true }, { id: 'rs-b', topic: 'em', learned: true },
        { id: 'rs-c', topic: 'qm', learned: true }
      ]);
      var start = await h.flip();
      var target = start.current;
      await h.press('good');
      await h.regradeTo(target, 'again');
      await h.resumeLive();
      var back = await h.look();
      h.assert(back.current !== target, 'leaving the regrade view shows the live card (' + back.current + '), not the Again card');
      for (var guard = 0; guard < 6; guard++) {
        var now = await h.look();
        if (now.current === target || now.summary) break;
        await h.flip();
        await h.press('good');
      }
      now = await h.look();
      h.assert(now.current === target && !now.summary && now.cells[target].grade === 'again',
        'the card regraded to Again is the live card again, its box still marked Again (' + now.line + ')');
    } },

  { name: 'regrade a new card from Easy to Again starts its learning over',
    run: async function (page, h) {
      await h.seedAndStudy([
        { id: 'rn-a', topic: 'cm' }, { id: 'rn-b', topic: 'em' }, { id: 'rn-c', topic: 'qm' }
      ]);
      var first = await h.flip();
      var target = first.current;
      var graded = await h.press('easy');
      h.assert(graded.cards[target] && graded.cards[target].interval === 4, 'Easy on a new card schedules it 4 days out');
      await h.regradeTo(target, 'again');
      var regraded = await h.look();
      h.assert(!regraded.cards[target] && regraded.diskCards[target] === undefined,
        'the regrade to Again leaves the card with no schedule, as a live Again on a new card does');
      h.assert(regraded.queueIds.filter(function (id) { return id === target; }).length === 1 &&
        regraded.queueIds[regraded.queueIds.length - 1] === target && regraded.steps[target] === 0,
        'the card is back once at the end of the queue, at learning step 0');
      await h.resumeLive();
      var run = await h.finish(function (now) {
        if (now.current === target) return (now.cards[target] ? 'scheduled' : 'no schedule') + ' step ' + now.steps[target];
      });
      h.assert(run.shown.filter(function (id) { return id === target; }).length === 2,
        'it comes back for its two learning passes (' + run.shown.join(', ') + ')');
      h.assert(run.notes[0] === 'no schedule step 0' && run.notes[1] === 'no schedule step 1',
        'it returns unscheduled at step 0, and after the first Good at step 1 (' + run.notes.join('; ') + ')');
      h.assert(run.end.cards[target].interval === 1 && run.end.cards[target].lapses === 0,
        'it ends with a 1-day interval and no lapse');
    } },

  { name: 'a Study grade whose save fails stays on screen, unrecorded', shot: '02-failed-save-card-stays',
    run: async function (page, h) {
      await h.seedAndStudy(h.FS_SPEC);
      var before = await h.flip();
      var target = before.current;
      var could = await h.clickWhileStorageFull('#fcard-actions [data-grade="good"]');
      await h.sleep(200);
      var failed = await h.look();
      h.assert(could === true, 'saving worked until this press');
      h.assert(failed.canWrite === false, 'the failed write is noticed (canWrite is false)');
      h.assert(failed.diskCards[target].reviews === 2, 'the stored card still has 2 reviews');
      h.assert(failed.current === target && failed.queueIds.indexOf(target) !== -1,
        'the card stays on screen and in the queue (on screen: ' + failed.current + ')');
      h.assert(/ 0 done /.test(failed.line), 'the count line still reads 0 done (' + failed.line + ')');
      h.assert(failed.cards[target].reviews === 2 && failed.cards[target].due === failed.today,
        'memory matches the store: the card was not graded (2 reviews, due today)');
      h.assert(failed.flipped && failed.chosen === '', 'its answer stays open with no grade marked');
      h.assert(failed.toast, 'the saving-failed warning is on screen');
    } },

  { name: 'once saving works the same Good goes through, and a reload keeps it',
    run: async function (page, h) {
      var before = await h.look();
      var target = before.current;
      await page.eval(function () { PGRE.store.save(); });
      var healed = await h.flip();
      h.assert(healed.canWrite === true && healed.current === target, 'saving works again with the same card on screen');
      var graded = await h.press('good');
      h.assert(graded.diskCards[target].reviews === 3 && graded.current !== target,
        'Good now stores 3 reviews and moves on');
      // Reload: the stored session does not bring the card back.
      await page.open(h.URL);
      await h.wait('#main');
      await h.useDeck(h.FS_SPEC);
      await page.eval(function () { location.hash = '#/formulas'; });
      await h.wait('#resume-btn');
      await h.click('#resume-btn');
      await h.wait('.formula-palette .pal-cell.is-current');
      var resumed = await h.look();
      h.assert(resumed.queueIds.indexOf(target) === -1 && resumed.current !== target,
        'after a reload and Resume the graded card is not in the queue');
    } },

  { name: 'a Study Undo whose save fails keeps the stored grade',
    run: async function (page, h) {
      await h.seedAndStudy(h.FS_SPEC);
      var first = await h.flip();
      var target = first.current;
      var graded = await h.press('good');
      h.assert(graded.diskCards[target].reviews === 3 && graded.queueIds.indexOf(target) === -1,
        'Good stores 3 reviews and takes the card out');
      await h.clickWhileStorageFull('#study-undo');
      await h.sleep(200);
      var failed = await h.look();
      h.assert(failed.diskCards[target].reviews === 3 && failed.cards[target].reviews === 3,
        'the undo did not reach storage, and memory keeps the grade too (3 reviews)');
      h.assert(failed.queueIds.indexOf(target) === -1 && failed.current === graded.current,
        'the screen stays on the next card, and the graded card stays out of the queue');
      await h.click('.formula-palette .pal-cell[data-id="' + target + '"]');
      await h.wait('.formula-study-live .peek-grade');
      var peek = await h.look();
      h.assert(peek.chosen === 'good' && peek.cells[target].grade === 'good',
        'opening its box still shows the Good grade');
      await page.eval(function () { PGRE.store.save(); });
      await h.click('#study-undo');
      await h.sleep(200);
      var undone = await h.look();
      h.assert(undone.diskCards[target].reviews === 2 && undone.cards[target].reviews === 2 && undone.current === target,
        'once saving works, Undo restores the card (2 reviews) and shows it again');
    } },

  { name: 'a regrade to Again whose save fails keeps the stored Good',
    run: async function (page, h) {
      await h.seedAndStudy(h.FS_SPEC);
      var first = await h.flip();
      var target = first.current;
      var graded = await h.press('good');
      h.assert(graded.diskCards[target].reviews === 3 && graded.diskCards[target].lastGrade === 'good',
        'Good stores 3 reviews');
      await h.click('.formula-palette .pal-cell[data-id="' + target + '"]');
      await h.wait('.formula-study-live .peek-grade');
      await h.clickWhileStorageFull('#fcard-actions [data-grade="again"]');
      await h.sleep(200);
      var failed = await h.look();
      h.assert(failed.canWrite === false && failed.diskCards[target].lastGrade === 'good' &&
        failed.cards[target].lastGrade === 'good' && failed.cards[target].reviews === 3,
        'the regrade did not reach storage, and memory keeps Good too (3 reviews)');
      h.assert(failed.queueIds.indexOf(target) === -1 && failed.chosen === 'good' &&
        failed.cells[target].grade === 'good',
        'the card stays out of the queue, and its view and its box still show Good');
      h.assert(failed.toast, 'the saving-failed warning is on screen');
      await page.eval(function () { PGRE.store.save(); });
      await h.click('#fcard-actions [data-grade="again"]');
      await h.sleep(200);
      var regraded = await h.look();
      h.assert(regraded.diskCards[target].lastGrade === 'again' &&
        regraded.queueIds.filter(function (id) { return id === target; }).length === 1 &&
        regraded.queueIds[regraded.queueIds.length - 1] === target,
        'once saving works, the regrade to Again is stored and the card is back once, at the end of the queue');
    } },

  { name: 'a Type grade whose save fails stays on screen, unrecorded',
    run: async function (page, h) {
      await h.seed(h.FS_SPEC);
      await page.eval(function () { location.hash = '#/formulas'; });
      await h.wait('[data-mode="type"]');
      await h.click('[data-mode="type"]');
      await h.wait('#game-start');
      await h.click('#game-start');
      await h.wait('#flash-submit');
      async function typeLook() {
        return JSON.parse(await page.eval(function () {
          var name = document.querySelector('.fcard-name');
          var disk = JSON.parse(localStorage.getItem('pgre-state-v1') || '{}');
          return JSON.stringify({
            id: name ? name.textContent.replace(/^Card /, '') : '',
            revealed: !!document.querySelector('#flash-reveal [data-grade="good"]'),
            cards: PGRE.store.state.cards, diskCards: disk.cards || {}, canWrite: PGRE.store.canWrite()
          });
        }));
      }
      await h.click('#flash-submit');
      await h.wait('#flash-reveal [data-grade="good"]');
      var shown = await typeLook();
      await h.clickWhileStorageFull('#flash-reveal [data-grade="good"]');
      await h.sleep(200);
      var failed = await typeLook();
      h.assert(failed.canWrite === false && failed.diskCards[shown.id].reviews === 2 &&
        failed.cards[shown.id].reviews === 2, 'Type: the failed save leaves the card ungraded in storage and in memory');
      h.assert(failed.id === shown.id && failed.revealed, 'Type: the same card stays on screen with its grade buttons');
      await page.eval(function () { PGRE.store.save(); });
      await h.click('#flash-reveal [data-grade="good"]');
      await h.sleep(200);
      var graded = await typeLook();
      h.assert(graded.diskCards[shown.id].reviews === 3 && graded.id !== shown.id,
        'Type: once saving works, Good stores 3 reviews and moves on');
    } },

  { name: 'after midnight the open session and its Resume take in new-day cards, not a card it graded',
    run: async function (page, h) {
      // ro-a..ro-c are relearning cards: Good gives a 1-day interval. ro-d is
      // a learned card due tomorrow and not on today's list.
      await h.seed([
        { id: 'ro-a', topic: 'cm', lapsed: true }, { id: 'ro-b', topic: 'em', lapsed: true },
        { id: 'ro-c', topic: 'qm', lapsed: true }, { id: 'ro-d', topic: 'cm', learned: true }
      ]);
      await page.eval(function () {
        var s = PGRE.store.state;
        s.formulaDay.reviewIds = s.formulaDay.reviewIds.filter(function (id) { return id !== 'ro-d'; });
        s.cards['ro-d'].due = PGRE.srs.addDays(1);
        PGRE.store.save();
      });
      await h.study();
      var first = await h.flip();
      var target = first.current;
      var graded = await h.press('good');
      var due = graded.cards[target].due;
      h.assert(graded.cards[target].interval === 1 && due === graded.cards['ro-d'].due &&
        graded.queueIds.indexOf(target) === -1 && graded.queueIds.indexOf('ro-d') === -1,
        'Good before midnight gives ' + target + ' a 1-day interval and takes it out of the session; ' +
        'ro-d, due the same day, is not in the session');
      // Midnight passes with the session open: the scheduler's day (today and
      // addDays) moves to the due day for the rest of this stage, and the tab
      // becomes visible.
      await page.eval('() => { var due = ' + JSON.stringify(due) + ';' +
        'window.__realClock = { today: PGRE.srs.today, addDays: PGRE.srs.addDays };' +
        'PGRE.srs.today = function () { return due; };' +
        'PGRE.srs.addDays = function (n) { return PGRE.srs.addDaysTo(due, n); };' +
        'document.dispatchEvent(new Event("visibilitychange")); }');
      var after = await h.look();
      h.assert(after.today === due && after.remaining.indexOf(target) !== -1 && after.remaining.indexOf('ro-d') !== -1,
        'on the new day ' + target + ' and ro-d are both on today\'s remaining list');
      h.assert(after.queueIds.indexOf('ro-d') !== -1 && after.queueIds.indexOf(target) === -1,
        'the open session takes in ro-d but not ' + target + ', which it graded (queue: ' + after.queueIds.join(', ') + ')');
      // Leave Recall and come back: Resume rebuilds the session from its
      // saved snapshot instead of the open page.
      await page.eval(function () { location.hash = '#/'; });
      await h.sleep(250);
      await page.eval(function () { location.hash = '#/formulas'; });
      await h.wait('#resume-btn');
      await h.click('#resume-btn');
      await h.wait('.formula-palette .pal-cell.is-current');
      var resumed = await h.look();
      h.assert(/ 1 done /.test(resumed.line), 'Resume continues the same session (' + resumed.line + ')');
      h.assert(resumed.queueIds.indexOf('ro-d') !== -1 && resumed.queueIds.indexOf(target) === -1,
        'after Resume the session still holds ro-d and not ' + target + ' (queue: ' + resumed.queueIds.join(', ') + ')');
      var run = await h.finish();
      h.assert(run.end.summary && run.shown.indexOf(target) === -1 && run.shown.indexOf('ro-d') !== -1,
        target + ' is not shown again before the session ends, and ro-d is (shown: ' + run.shown.join(', ') + ')');
      await page.eval(function () {
        PGRE.srs.today = window.__realClock.today;
        PGRE.srs.addDays = window.__realClock.addDays;
        delete window.__realClock;
        PGRE.store.state.formulaStudy = null;
        PGRE.store.save();
        location.hash = '#/';
      });
      await h.sleep(250);
    } },

  { name: 'a stale tab adopts a sibling\'s Add before its own Add',
    run: async function (page, h) {
      var spec = [{ id: 'sa-first', topic: 'cm' }, { id: 'sa-second', topic: 'em' }, { id: 'sa-other', topic: 'qm' }];
      await h.seed(spec);
      await page.eval(function () {
        PGRE.store.state.formulaDay = { date: PGRE.srs.today(), reviewIds: [], newIds: [] };
        PGRE.store.save();
      });
      await h.openStaleTab(spec);
      var res = JSON.parse(await page.eval('() => { var f = document.getElementById("stale-tab").contentWindow;' +
        'PGRE.srs.addFormulaDaySoft(PGRE.FORMULAS, ["sa-first"]);' +
        'var staleSaw = (f.PGRE.store.state.formulaDay.newIds || []).slice();' +
        'f.PGRE.srs.addFormulaDaySoft(f.PGRE.FORMULAS, ["sa-second"]);' +
        'var disk = JSON.parse(localStorage.getItem("pgre-state-v1")).formulaDay;' +
        'return JSON.stringify({ staleSaw: staleSaw, disk: disk.newIds.concat(disk.reviewIds) }); }'));
      h.assert(res.staleSaw.indexOf('sa-first') === -1, 'the stale tab had not seen the first Add');
      h.assert(res.disk.indexOf('sa-first') !== -1 && res.disk.indexOf('sa-second') !== -1,
        'today\'s stored list keeps both Adds (' + res.disk.join(', ') + ')');
      await h.closeStaleTab();
    } },

  { name: 'a stale tab\'s Add does not bring back a card a sibling removed',
    run: async function (page, h) {
      var spec = [{ id: 'sr-gone', topic: 'cm' }, { id: 'sr-keep', topic: 'em' }, { id: 'sr-new', topic: 'qm' }];
      await h.seed(spec);
      await page.eval(function () {
        PGRE.store.state.formulaDay = { date: PGRE.srs.today(), reviewIds: [], newIds: ['sr-gone', 'sr-keep'] };
        PGRE.store.save();
      });
      await h.openStaleTab(spec);
      var res = JSON.parse(await page.eval('() => { var f = document.getElementById("stale-tab").contentWindow;' +
        'PGRE.srs.removeFormulaDaySoft(PGRE.FORMULAS, ["sr-gone"]);' +
        'var staleSaw = (f.PGRE.store.state.formulaDay.newIds || []).slice();' +
        'f.PGRE.srs.addFormulaDaySoft(f.PGRE.FORMULAS, ["sr-new"]);' +
        'var disk = JSON.parse(localStorage.getItem("pgre-state-v1")).formulaDay;' +
        'return JSON.stringify({ staleSaw: staleSaw, disk: disk.newIds.concat(disk.reviewIds) }); }'));
      h.assert(res.staleSaw.indexOf('sr-gone') !== -1, 'the stale tab still listed the removed card');
      h.assert(res.disk.indexOf('sr-gone') === -1 && res.disk.indexOf('sr-new') !== -1 && res.disk.indexOf('sr-keep') !== -1,
        'today\'s stored list keeps the removal and the Add (' + res.disk.join(', ') + ')');
      await h.closeStaleTab();
    } },

  { name: 'a stale tab\'s Again is kept over a sibling\'s earlier Good', shot: '03-stale-tab-again-kept',
    run: async function (page, h) {
      var spec = [{ id: 'sx-a', topic: 'cm', learned: true }, { id: 'sx-b', topic: 'em', learned: true }];
      await h.seed(spec);
      await h.openStaleTab(spec);
      // The stale tab opens Study and shows a card.
      await page.eval('() => { document.getElementById("stale-tab").contentWindow.location.hash = "#/formulas"; }');
      for (var i = 0; i < 50; i++) {
        if (await page.eval('!!document.getElementById("stale-tab").contentDocument.getElementById("study-btn")')) break;
        await h.sleep(100);
      }
      var target = await page.eval('() => { var d = document.getElementById("stale-tab").contentDocument;' +
        'd.getElementById("study-btn").click(); d.getElementById("flip-btn").click();' +
        'return d.querySelector(".formula-palette .pal-cell.is-current").getAttribute("data-id"); }');
      await h.sleep(200);
      // This tab grades the same card Again, then Good; afterwards the stale
      // tab's Again is pressed on the card it still shows. One task, so no
      // timer in the stale tab can save (and adopt) in between.
      var res = JSON.parse(await page.eval('() => { var id = ' + JSON.stringify(target) + ';' +
        'PGRE.srs.gradeCard(id, "again"); PGRE.srs.gradeCard(id, "good"); PGRE.store.save();' +
        'var sibling = JSON.parse(JSON.stringify(PGRE.store.state.cards[id]));' +
        'var f = document.getElementById("stale-tab").contentWindow;' +
        'var staleBefore = f.PGRE.store.state.cards[id].reviews;' +
        'f.document.querySelector(\'#fcard-actions [data-grade="again"]\').click();' +
        'var disk = JSON.parse(localStorage.getItem("pgre-state-v1")).cards[id];' +
        'return JSON.stringify({ sibling: sibling, staleBefore: staleBefore, disk: disk, today: PGRE.srs.today() }); }'));
      var sibling = res.sibling;
      h.assert(sibling.lastGrade === 'good' && sibling.reviews === 4, 'the sibling stored Again then Good (4 reviews)');
      h.assert(res.staleBefore === 2, 'the stale tab still had 2 reviews when Again was pressed');
      h.assert(res.disk.lastGrade === 'again' && res.disk.due === res.today && res.disk.reviews === 5,
        'the stored card is the later Again, due today, on top of the sibling\'s 4 reviews (got ' +
        res.disk.lastGrade + ', ' + res.disk.due + ', ' + res.disk.reviews + ')');
      await h.closeStaleTab();
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
        (output ? '\n' + output : '')));
    });
    child.stdin.end(input || '');
  });
}

async function main() {
  var profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pgre-recall-schedule-chrome-'));
  var shots = process.env.PGRE_RECALL_SCHEDULE_SHOTS ? path.resolve(process.env.PGRE_RECALL_SCHEDULE_SHOTS) : '';
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
    // Synthetic cards only: never serve the gitignored book deck.
    if (/^\/content\/bank\//.test(pathname) || !file.startsWith(ROOT + path.sep) ||
        !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      response.writeHead(404); response.end(); return;
    }
    response.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Content-Security-Policy': PAGE_CSP
    });
    fs.createReadStream(file).pipe(response);
  });
  var env = Object.assign({}, process.env, {
    CHROME_DEVTOOLS_AXI_SESSION: 'pgre-recall-schedule-' + process.pid,
    CHROME_DEVTOOLS_AXI_AUTO_CONNECT: '0',
    CHROME_DEVTOOLS_AXI_BROWSER_URL: '',
    CHROME_DEVTOOLS_AXI_USER_DATA_DIR: profile
  });
  if (!env.CHROME_DEVTOOLS_AXI_MCP_PATH) {
    env.CHROME_DEVTOOLS_AXI_MCP_PATH =
      '/Users/leyi/.npm/_npx/15c61037b1978c83/node_modules/chrome-devtools-mcp/build/src/bin/chrome-devtools-mcp.js';
  }
  try {
    await new Promise(function (resolve) { server.listen(0, '127.0.0.1', resolve); });
    env.PGRE_RECALL_SCHEDULE_TEST_URL = 'http://127.0.0.1:' + server.address().port + '/';
    await run(['open', env.PGRE_RECALL_SCHEDULE_TEST_URL], env);
    var size = '';
    var failed = [];
    // Every stage runs even after a failure, so one run reports each check.
    for (var i = 0; i < STAGES.length; i++) {
      console.log('\n' + STAGES[i].name);
      if (STAGES[i].size && STAGES[i].size !== size) {
        size = STAGES[i].size;
        await run(['emulate', '--viewport', size], env);
      }
      try {
        await run(['run'], env, 'try { var h = await (' + helpers.toString() + ')(page); await (' +
          STAGES[i].run.toString() + ')(page, h); } catch (error) { console.log("BROWSER_TEST_FAILED: " + error.stack); }');
      } catch (stageError) {
        failed.push(STAGES[i].name);
      }
      if (shots && STAGES[i].shot) await run(['screenshot', path.join(shots, STAGES[i].shot + '.png')], env);
    }
    if (failed.length) throw new Error('FAILED stages: ' + failed.join('; '));
    if (!bridge.refused) {
      throw new Error('Chrome reported no refused request to the status bridge on port ' + BRIDGE_PORT);
    }
    console.log('\nPASS: the status bridge on port ' + BRIDGE_PORT + ' received nothing (Chrome refused the request on ' +
      bridge.refused + ' page load(s))');
    console.log('\nALL OK');
  } finally {
    await run(['stop'], env).catch(function (error) { console.error(error.message); });
    await new Promise(function (resolve) { server.close(resolve); });
    fs.rmSync(profile, { recursive: true, force: true });
  }
}

main().catch(function (error) { console.error(error.message); process.exitCode = 1; });
