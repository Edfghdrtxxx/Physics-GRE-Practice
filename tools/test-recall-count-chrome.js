#!/usr/bin/env node
/* Real-page check of the Study count line on #/formulas: position in the
   set, cards done, cards left. Shipped deck in an isolated Chrome profile on
   a throwaway 127.0.0.1 port; never the saved studio. The status bridge on
   127.0.0.1:4789 is refused by CSP.
   Run: node tools/test-recall-count-chrome.js
   PGRE_RECALL_COUNT_SHOTS=<dir> also saves one screenshot per stage. */
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
  var URL = process.env.PGRE_RECALL_COUNT_TEST_URL;
  function sleep(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
  var h = { sleep: sleep };

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

  async function click(selector) {
    await page.eval('() => { var b = document.querySelector(' + JSON.stringify(selector) +
      '); b.focus(); b.click(); }');
  }
  h.click = click;

  h.openFormulas = async function () {
    await page.open(URL);
    await wait('#main');
    await page.eval(function () { location.hash = '#/formulas'; });
    await wait('#study-btn');
  };

  /* What the captain sees: the count line, and the navigator beside it. */
  h.seen = async function () {
    return JSON.parse(await page.eval(function () {
      var line = document.querySelector('.formula-study-live .practice-meta > span:first-child');
      var cells = document.querySelectorAll('.formula-palette .pal-cell');
      var current = document.querySelector('.formula-palette .pal-cell.is-current');
      var saved = PGRE.store.state.formulaStudy || {};
      var root = document.scrollingElement || document.documentElement;
      return JSON.stringify({
        line: line ? line.textContent : '',
        lineHeight: line ? Math.round(line.getBoundingClientRect().height) : 0,
        cells: cells.length,
        graded: document.querySelectorAll('.formula-palette .pal-cell.is-graded').length,
        current: current ? +current.getAttribute('data-goto') + 1 : 0,
        savedDone: saved.done,
        savedLeft: (saved.queueIds || []).length,
        pageScroll: root.scrollWidth - root.clientWidth
      });
    }));
  };

  h.gradeEasy = async function () {
    await wait('#flip-btn');
    await click('#flip-btn');
    await wait('[data-grade="easy"]');
    await click('[data-grade="easy"]');
    await wait('#flip-btn');
  };

  h.goto = async function (n) {
    await click('.formula-palette .pal-cell[data-goto="' + (n - 1) + '"]');
    await sleep(150);
  };

  h.expected = function (pos, s, done) {
    return 'Card ' + pos + ' of ' + s.cells + ' · ' + done + ' done · ' + (s.cells - done) + ' left';
  };

  return h;
}

var STAGES = [
  { name: 'two cards graded, a later card on screen', shot: '01-live-card-two-done', size: '1280x800',
    run: async function (page, h) {
      await h.openFormulas();
      await h.click('#study-btn');
      await h.gradeEasy();
      await h.gradeEasy();
      var s = await h.seen();
      h.assert(s.cells >= 4, 'the shipped deck starts a set of at least four cards (' + s.cells + ')');
      var pos = Math.min(19, s.cells - 3);
      await h.goto(pos);
      s = await h.seen();
      h.assert(s.current === pos, 'the navigator rings card ' + pos + ', the card on screen');
      h.assert(s.graded === 2 && s.savedDone === 2 && s.savedLeft === s.cells - 2,
        'two cards are graded: the navigator marks 2, the saved session holds done 2 and ' +
        (s.cells - 2) + ' left');
    } },

  { name: 'the live card names position, done and left',
    run: async function (page, h) {
      var s = await h.seen();
      h.assert(s.line === h.expected(s.current, s, 2),
        'count line reads "' + h.expected(s.current, s, 2) + '" (got "' + s.line + '")');
    } },

  { name: 'a graded card opened from the navigator', shot: '02-graded-card-two-done',
    run: async function (page, h) {
      var first = +(await page.eval(function () {
        return document.querySelector('.formula-palette .pal-cell.is-graded').getAttribute('data-goto');
      })) + 1;
      await h.goto(first);
      await h.wait('#fcard-actions [data-grade][aria-pressed="true"]');
      var s = await h.seen();
      h.assert(s.current === first && s.line === h.expected(first, s, 2),
        'the graded card reads "' + h.expected(first, s, 2) + '" (got "' + s.line + '")');
    } },

  { name: 'Undo takes one off done and adds one to left', shot: '03-after-undo-one-done',
    run: async function (page, h) {
      await h.click('#study-undo');
      await h.wait('#flip-btn');
      var s = await h.seen();
      h.assert(s.graded === 1 && s.savedDone === 1 && s.line === h.expected(s.current, s, 1),
        'after Undo the line reads "' + h.expected(s.current, s, 1) + '" (got "' + s.line + '")');
    } },

  { name: 'a third grade moves both numbers',
    run: async function (page, h) {
      await h.gradeEasy();
      await h.gradeEasy();
      var s = await h.seen();
      h.assert(s.graded === 3 && s.savedDone === 3 && s.line === h.expected(s.current, s, 3),
        'after two more Easy grades the line reads "' + h.expected(s.current, s, 3) + '" (got "' + s.line + '")');
    } },

  { name: 'the line stays whole at 700px', shot: '04-live-card-700', size: '700x800',
    run: async function (page, h) {
      await h.sleep(150);
      var s = await h.seen();
      h.assert(s.line === h.expected(s.current, s, 3) && s.lineHeight > 0 && s.lineHeight < 30,
        '700px window keeps the count on one line (' + s.lineHeight + 'px high)');
      h.assert(s.pageScroll <= 1, '700px window has no horizontal page scroll');
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
  var profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pgre-recall-count-chrome-'));
  var shots = process.env.PGRE_RECALL_COUNT_SHOTS ? path.resolve(process.env.PGRE_RECALL_COUNT_SHOTS) : '';
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
    CHROME_DEVTOOLS_AXI_SESSION: 'pgre-recall-count-' + process.pid,
    CHROME_DEVTOOLS_AXI_AUTO_CONNECT: '0',
    CHROME_DEVTOOLS_AXI_BROWSER_URL: '',
    CHROME_DEVTOOLS_AXI_USER_DATA_DIR: profile
  });
  try {
    await new Promise(function (resolve) { server.listen(0, '127.0.0.1', resolve); });
    env.PGRE_RECALL_COUNT_TEST_URL = 'http://127.0.0.1:' + server.address().port + '/';
    await run(['open', env.PGRE_RECALL_COUNT_TEST_URL], env);
    var size = '';
    for (var i = 0; i < STAGES.length; i++) {
      console.log('\n' + STAGES[i].name);
      if (STAGES[i].size && STAGES[i].size !== size) {
        size = STAGES[i].size;
        await run(['emulate', '--viewport', size], env);
      }
      await run(['run'], env, 'try { var h = await (' + helpers.toString() + ')(page); await (' +
        STAGES[i].run.toString() + ')(page, h); } catch (error) { console.log("BROWSER_TEST_FAILED: " + error.stack); }');
      if (shots && STAGES[i].shot) await run(['screenshot', path.join(shots, STAGES[i].shot + '.png')], env);
    }
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
