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

  /* Seed a synthetic deck and today's list. cards: [{ id, topic, learned }].
     A learned card is a review due today with a 5-day interval. */
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
      '  ease: 2.5, due: today, reviews: 2, lastGrade: "good", lastReviewedDay: PGRE.srs.addDaysTo(today, -5) }; });' +
      's.formulaDay = { date: today,' +
      '  reviewIds: spec.filter(function (c) { return c.learned; }).map(function (c) { return c.id; }),' +
      '  newIds: spec.filter(function (c) { return !c.learned; }).map(function (c) { return c.id; }) };' +
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
  { name: 'regrade to Again puts the card back in the session', shot: '01-regrade-again-requeued', size: '1280x800',
    run: async function (page, h) {
      await h.seedAndStudy([
        { id: 'rg-a', topic: 'cm', learned: true }, { id: 'rg-b', topic: 'em', learned: true },
        { id: 'rg-c', topic: 'qm', learned: true }
      ]);
      var first = await h.look();
      var target = first.current;
      await h.flip();
      var graded = await h.press('good');
      h.assert(graded.queueIds.indexOf(target) === -1, 'Good on a learned card takes it out of the session');
      await h.click('.formula-palette .pal-cell[data-id="' + target + '"]');
      await h.wait('.formula-study-live .peek-grade');
      await h.click('#fcard-actions [data-grade="again"]');
      await h.sleep(200);
      var regraded = await h.look();
      h.assert(regraded.cards[target].lastGrade === 'again' && regraded.cards[target].due === regraded.today,
        'the regrade stores Again, due today');
      h.assert(regraded.queueIds.filter(function (id) { return id === target; }).length === 1 &&
        regraded.queueIds[regraded.queueIds.length - 1] === target,
        'the card regraded to Again is back in this session\'s queue once, at the end');
      h.assert(regraded.cells[target].grade === 'again', 'its box shows Again');
      // Finish the session: the card comes up once more, then leaves.
      var shown = [];
      await h.click('.formula-palette .pal-cell:not(.is-graded)');
      await h.sleep(150);
      for (var guard = 0; guard < 8; guard++) {
        var now = await h.look();
        if (now.summary || !now.current) break;
        shown.push(now.current);
        await h.flip();
        await h.press('good');
      }
      h.assert(shown.filter(function (id) { return id === target; }).length === 1,
        'the card regraded to Again is shown once more before the session ends');
      var end = await h.look();
      h.assert(end.summary, 'the session ends after the Again card is graded Good');
      h.assert(end.cards[target].lastGrade === 'good' && end.cards[target].due > end.today,
        'the second grade schedules it for a later day');
    } },

  { name: 'regrade from Again to Good takes the repeat out of the session',
    run: async function (page, h) {
      await h.seedAndStudy([
        { id: 'rp-a', topic: 'cm', learned: true }, { id: 'rp-b', topic: 'em', learned: true },
        { id: 'rp-c', topic: 'qm', learned: true }
      ]);
      var first = await h.look();
      var target = first.current;
      await h.flip();
      var missed = await h.press('again');
      h.assert(missed.queueIds.filter(function (id) { return id === target; }).length === 1,
        'a live Again queues the card once more');
      await h.click('.formula-palette .pal-cell[data-id="' + target + '"]');
      await h.wait('.formula-study-live .peek-grade');
      await h.click('#fcard-actions [data-grade="good"]');
      await h.sleep(200);
      var regraded = await h.look();
      h.assert(regraded.cards[target].lastGrade === 'good' && regraded.queueIds.indexOf(target) === -1,
        'changing that Again to Good takes the card out of the queue');
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
