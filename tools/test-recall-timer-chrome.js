#!/usr/bin/env node
/* Real-page check of the Study recall timer on #/formulas.
   Isolated Chrome profile on a throwaway 127.0.0.1 port; never the saved
   studio. The status bridge on 127.0.0.1:4789 is refused by CSP.
   A fake Date.now on the test page reaches 0:00 without waiting two minutes.
   Run: node tools/test-recall-timer-chrome.js
   PGRE_RECALL_TIMER_SHOTS=<dir> also saves one screenshot per stage. */
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
  var view = fs.readFileSync(path.join(ROOT, 'js', 'view-formulas.js'), 'utf8');
  var css = fs.readFileSync(path.join(ROOT, 'css', 'style.css'), 'utf8');
  var index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  var persistAt = view.indexOf('PGRE.store.state.formulaStudy = {');
  var persistEnd = view.indexOf('};', persistAt);
  var persist = view.slice(persistAt, persistEnd + 2);
  check(persistAt > 0, 'persistStudy writes formulaStudy');
  check(!/recall|timer|startedAt|elapsed/i.test(persist),
    'persistStudy stores no timer fields');
  var cardAt = view.indexOf('function renderCard()');
  var peekAt = view.indexOf('function renderPeek()');
  var cardFn = view.slice(cardAt, peekAt);
  check(cardFn.indexOf('id="recall-timer"') !== -1,
    'renderCard puts #recall-timer in the Study meta row');
  var peekFn = view.slice(peekAt, view.indexOf('function peekStep'));
  check(peekFn.indexOf('recall-timer') === -1,
    'renderPeek does not show the recall timer');
  check(view.indexOf('function startRecallTimer()') !== -1 &&
    view.indexOf('function freezeRecallTimer()') !== -1 &&
    view.indexOf('Date.now()') !== -1,
    'the clock reads Date.now so a test page can stub it');
  check(/\.practice-meta \.recall-timer\.is-over\s*\{\s*color:\s*var\(--bad\)/.test(css),
    'overtime uses the --bad danger token');
  check(/js\/view-formulas\.js\?v=\d{8}[a-z]/.test(index) &&
    /css\/style\.css\?v=\d{8}[a-z]/.test(index),
    'index.html cache-busts view-formulas.js and style.css');
  var flash = fs.readFileSync(path.join(ROOT, 'js', 'flashmodes.js'), 'utf8');
  check(flash.indexOf('recall-timer') === -1,
    'Match/Type/Quiz/Cloze do not render the Study timer');
}

async function helpers(page) {
  var URL = process.env.PGRE_RECALL_TIMER_TEST_URL;
  function sleep(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
  var h = { sleep: sleep };

  function assert(condition, message) {
    if (!condition) throw new Error(message);
    console.log('PASS: ' + message);
  }
  h.assert = assert;

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

  h.installClock = async function () {
    await page.eval(function () {
      if (window.__recallClock != null) return;
      window.__recallOrigin = Date.now();
      window.__recallClock = window.__recallOrigin;
      Date.now = function () { return window.__recallClock; };
    });
  };

  h.advance = async function (ms) {
    await page.eval('() => { window.__recallClock = window.__recallOrigin + ' + (+ms) + '; }');
    await sleep(400);
  };

  h.jumpOvertime = async function () {
    await page.eval(function () {
      window.__recallOrigin = Date.now();
      window.__recallClock = window.__recallOrigin;
    });
    await h.advance(121000);
  };

  h.ensureLiveTimer = async function () {
    if (await page.eval('!!document.getElementById("recall-timer")')) return;
    await h.wait('#resume-btn, #study-btn');
    if (await page.eval('!!document.getElementById("resume-btn")')) await h.click('#resume-btn');
    else await h.click('#study-btn');
    await h.wait('#recall-timer');
  };

  h.timer = async function () {
    return JSON.parse(await page.eval(function () {
      var el = document.getElementById('recall-timer');
      if (!el) return JSON.stringify({ present: false });
      var cs = getComputedStyle(el);
      var probe = document.createElement('span');
      probe.style.color = getComputedStyle(document.documentElement).getPropertyValue('--bad').trim();
      document.body.appendChild(probe);
      var bad = getComputedStyle(probe).color;
      probe.remove();
      return JSON.stringify({
        present: true,
        text: el.textContent,
        over: el.classList.contains('is-over'),
        color: cs.color,
        bad: bad,
        width: Math.round(el.getBoundingClientRect().width * 10) / 10,
        inMeta: !!(el.closest && el.closest('.practice-meta'))
      });
    }));
  };

  h.scroll = async function () {
    return JSON.parse(await page.eval(function () {
      var root = document.scrollingElement || document.documentElement;
      return JSON.stringify({
        client: root.clientWidth,
        scroll: root.scrollWidth,
        inner: window.innerWidth
      });
    }));
  };

  h.snap = async function () {
    return JSON.parse(await page.eval(function () {
      var st = PGRE.store.state;
      var disk = JSON.parse(localStorage.getItem('pgre-state-v1') || '{}');
      function keys(obj) { return obj ? Object.keys(obj).sort() : []; }
      var studyJson = JSON.stringify(st.formulaStudy || {});
      var diskStudyJson = JSON.stringify(disk.formulaStudy || {});
      return JSON.stringify({
        studyKeys: keys(st.formulaStudy),
        diskStudyKeys: keys(disk.formulaStudy),
        study: st.formulaStudy,
        diskStudy: disk.formulaStudy,
        cards: st.cards,
        diskCards: disk.cards,
        reviews: (st.cardReviews || []).length,
        diskReviews: (disk.cardReviews || []).length,
        attempts: (st.attempts || []).length,
        diskAttempts: (disk.attempts || []).length,
        studyHasTimer: /recallTimer|recall-timer|recallSecs/.test(studyJson + diskStudyJson)
      });
    }));
  };

  h.studyKeys = ['id', 'date', 'dayBound', 'queueIds', 'done', 'again', 'steps',
    'pressCount', 'history', '_opAt', '_opId', 'completed'].sort();

  h.openFormulas = async function () {
    await page.open(URL);
    await wait('#main');
    await page.eval(function () { location.hash = '#/formulas'; });
    await wait('#formulas-root');
    for (var i = 0; i < 50; i++) {
      if (await page.eval('!!document.getElementById("study-btn")')) return;
      await sleep(100);
    }
    throw new Error('Timeout waiting for #study-btn');
  };

  return h;
}

var STAGES = [
  { name: 'start Study and count down', shot: '01-countdown-light', size: '1280x800',
    run: async function (page, h) {
      await h.openFormulas();
      await h.installClock();
      await h.click('#study-btn');
      await h.wait('#recall-timer');
      var t = await h.timer();
      h.assert(t.present && t.inMeta && t.text === '2:00' && !t.over,
        'a new card shows 2:00 in .practice-meta');
      await h.advance(1000);
      t = await h.timer();
      h.assert(t.text === '1:59' && !t.over, 'after one fake second the clock reads 1:59');
      await page.eval(function () { window.__widthAtCountdown = document.getElementById('recall-timer').getBoundingClientRect().width; });
    } },

  { name: 'overtime in red', shot: '02-overtime-light',
    run: async function (page, h) {
      await h.advance(120000);
      var zero = await h.timer();
      h.assert(zero.text === '0:00' && !zero.over, 'at two minutes the clock reads 0:00 and is not red');
      var w0 = zero.width;
      await h.advance(121000);
      var t = await h.timer();
      h.assert(t.text === '+0:01' && t.over, 'one second past zero reads +0:01');
      h.assert(t.color === t.bad, 'overtime uses the computed --bad colour, got ' + t.color);
      h.assert(Math.abs(t.width - w0) < 1,
        'width holds from 0:00 to +0:01 (' + w0 + ' -> ' + t.width + ')');
    } },

  { name: 'reveal freezes the clock', shot: '03-frozen-light',
    run: async function (page, h) {
      var before = await h.timer();
      await h.click('#flip-btn');
      await h.wait('[data-grade="good"]');
      var frozen = await h.timer();
      h.assert(frozen.text === before.text && frozen.over === before.over,
        'reveal keeps ' + before.text);
      await h.advance(125000);
      var still = await h.timer();
      h.assert(still.text === frozen.text,
        'four more fake seconds after reveal leave the clock at ' + frozen.text);
      await page.eval(function () {
        window.__preGrade = JSON.parse(JSON.stringify({
          study: PGRE.store.state.formulaStudy,
          cards: PGRE.store.state.cards,
          reviews: PGRE.store.state.cardReviews,
          attempts: PGRE.store.state.attempts
        }));
      });
    } },

  { name: 'next card restarts; grading and save unchanged',
    run: async function (page, h) {
      var before = JSON.parse(await page.eval(function () { return JSON.stringify(window.__preGrade); }));
      h.assert(before.study && Array.isArray(before.study.queueIds) && before.study.queueIds.length >= 2,
        'session has at least two cards so the next card stays on Study');
      await h.click('[data-grade="easy"]');
      var t = null;
      for (var i = 0; i < 40; i++) {
        t = await h.timer();
        if (t.present && t.text === '2:00' && !t.over) break;
        await h.sleep(50);
      }
      h.assert(t && t.text === '2:00' && !t.over, 'the next card restarts at 2:00');
      var after = await h.snap();
      h.assert(after.studyKeys.join(',') === h.studyKeys.join(','),
        'formulaStudy keys stay ' + h.studyKeys.join(', '));
      h.assert(after.diskStudyKeys.join(',') === h.studyKeys.join(','),
        'disk formulaStudy keys match RAM');
      h.assert(!after.studyHasTimer, 'formulaStudy stores no timer fields');
      h.assert(after.attempts === 0 && after.diskAttempts === 0,
        'grading a formula card still writes no practice attempts');
      h.assert(after.reviews === (before.reviews || []).length + 1 &&
        after.diskReviews === after.reviews,
        'Easy writes one cardReviews row on RAM and disk');
      h.assert(after.study.done === (before.study.done || 0) + 1,
        'session done count climbs by one');
      h.assert(after.study.queueIds[0] !== before.study.queueIds[0],
        'the graded card left the front of the queue');
      var firstId = before.study.queueIds[0];
      h.assert(!!after.cards[firstId] && after.cards[firstId].lastGrade === 'easy',
        'SRS lastGrade for the graded card is easy');
      h.assert(JSON.stringify(after.cards[firstId]) === JSON.stringify(after.diskCards[firstId]),
        'RAM and disk card records match');
    } },

  { name: 'overtime in dark theme', shot: '04-overtime-dark',
    run: async function (page, h) {
      await h.ensureLiveTimer();
      await h.jumpOvertime();
      await page.eval(function () { PGRE.setTheme('dark'); });
      await h.sleep(50);
      var t = await h.timer();
      h.assert(t.over && t.color === t.bad,
        'dark theme overtime uses --bad (' + t.text + ', ' + t.color + ')');
    } },

  { name: 'overtime at 700px', shot: '05-overtime-700', size: '700x800',
    run: async function (page, h) {
      await page.eval(function () { PGRE.setTheme('light'); });
      await h.sleep(50);
      await h.ensureLiveTimer();
      await h.jumpOvertime();
      var t = await h.timer();
      var sc = await h.scroll();
      h.assert(t.over && t.color === t.bad,
        '700px window shows overtime in --bad (' + t.text + ')');
      h.assert(sc.scroll <= sc.client + 1,
        '700px window has no horizontal page scroll (' + sc.scroll + ' / ' + sc.client + ')');
    } },

  { name: 'leaving Study drops the timer', size: '1280x800',
    run: async function (page, h) {
      await h.ensureLiveTimer();
      await h.click('button.flash-tab[data-mode="study"]');
      await h.wait('#study-btn, #resume-btn');
      h.assert(!(await page.eval('!!document.getElementById("recall-timer")')),
        'leaving Study removes the timer from the page');
      await page.eval(function () { location.hash = '#/'; });
      await h.sleep(300);
      h.assert(!(await page.eval('!!document.getElementById("recall-timer")')),
        'the dashboard has no recall timer');
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
  staticChecks();
  var profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pgre-recall-timer-chrome-'));
  var shots = process.env.PGRE_RECALL_TIMER_SHOTS ? path.resolve(process.env.PGRE_RECALL_TIMER_SHOTS) : '';
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
    CHROME_DEVTOOLS_AXI_SESSION: 'pgre-recall-timer-' + process.pid,
    CHROME_DEVTOOLS_AXI_AUTO_CONNECT: '0',
    CHROME_DEVTOOLS_AXI_BROWSER_URL: '',
    CHROME_DEVTOOLS_AXI_USER_DATA_DIR: profile
  });
  try {
    await new Promise(function (resolve) { server.listen(0, '127.0.0.1', resolve); });
    env.PGRE_RECALL_TIMER_TEST_URL = 'http://127.0.0.1:' + server.address().port + '/';
    await run(['open', env.PGRE_RECALL_TIMER_TEST_URL], env);
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
