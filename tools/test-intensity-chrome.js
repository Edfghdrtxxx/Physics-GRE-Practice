#!/usr/bin/env node
/* Headless Chrome, end to end: the Intensity feedback (js/intensity.js) on
   the shipped page. Three seeded study histories, ten days each, together
   put every one of the five metrics in each band (green, amber, red). For
   each history the test loads the dashboard and checks every row's value
   and band, the 7-day trend, the "Where to adjust" topic order, and
   PGRE.buildStatusSummary().intensity. In the first history it then sits a
   timed pack and checks the two lines on the practice summary, the
   receipt's medianSec, and that the dashboard and the status payload move
   with it. Expected numbers are worked out here from the seed, not read
   back from the module under test.

   Isolated Chrome profile and ephemeral ports; nothing outside the temp
   profile is read or written. Requests to the OrbitOS status bridge
   (127.0.0.1:4789) are blocked. Run: node tools/test-intensity-chrome.js
   PGRE_ARTIFACT_DIR=<dir> keeps the screenshots (otherwise they are
   written to a temp dir that is removed). PGRE_TEST_PORT / PGRE_CDP_PORT
   pin the ports. */
'use strict';

var http = require('http');
var fs = require('fs');
var path = require('path');
var os = require('os');
var net = require('net');
var vm = require('vm');
var { spawn } = require('child_process');

var PORT = parseInt(process.env.PGRE_TEST_PORT || '0', 10);
var CDP_PORT = parseInt(process.env.PGRE_CDP_PORT || '0', 10);
var ROOT = path.resolve(__dirname, '..');
var BRIDGE_PORT = 4789; // js/status.js ENDPOINT
function isBridgeUrl(u) { return /^https?:\/\/(127\.0\.0\.1|localhost):4789\//.test(String(u)); }
var KEEP_ARTIFACTS = !!process.env.PGRE_ARTIFACT_DIR;
var ARTIFACT_DIR = process.env.PGRE_ARTIFACT_DIR ||
  fs.mkdtempSync(path.join(os.tmpdir(), 'pgre-intensity-shots-'));
var MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
  '.png': 'image/png', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.json': 'application/json'
};

var passed = 0;
var failed = 0;
function check(cond, msg) {
  if (cond) { passed++; console.log('  ok  — ' + msg); }
  else { failed++; console.log('  FAIL — ' + msg); }
}
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

/* ——— Dates: local calendar days, the Studio's day key ——— */
function pad2(n) { return String(n).padStart(2, '0'); }
function dayKey(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function dayAgo(k) { var d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - k); return dayKey(d); }
function dayAhead(k) { return dayAgo(-k); }
/* ISO timestamp k days ago at local hour h, minute m, second s. */
function tsAgo(k, h, m, s) {
  var d = new Date();
  d.setDate(d.getDate() - k);
  d.setHours(h, m || 0, s || 0, 0);
  return d.toISOString();
}
function isSunday(key) { return new Date(key + 'T12:00:00').getDay() === 0; }
function workingDays(from, to) {
  var n = 0;
  var d = new Date(from + 'T12:00:00');
  var end = new Date(to + 'T12:00:00');
  while (d <= end) { if (d.getDay() !== 0) n++; d.setDate(d.getDate() + 1); }
  return n;
}
function round1(x) { return Math.round(x * 10) / 10; }
function median(list) {
  var a = list.slice().sort(function (x, y) { return x - y; });
  var mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

/* ——— Bands, written out from the spec table (not from js/intensity.js) ——— */
function bandNew(v) { return v >= 15 ? 'green' : v >= 8 ? 'amber' : 'red'; }
function bandPace(v) { return v == null ? 'none' : v <= 103 ? 'green' : v <= 130 ? 'amber' : 'red'; }
function bandAcc(v) { return v == null ? 'none' : v >= 75 ? 'green' : v >= 60 ? 'amber' : 'red'; }
function bandRepeat(v) { return v <= 20 ? 'green' : v <= 40 ? 'amber' : 'red'; }
function bandCoverage(actual, required) {
  return actual >= required ? 'green' : actual >= required - 3 ? 'amber' : 'red';
}
var CHIP = { green: 'On target', amber: 'Close', red: 'Off target', none: 'No data' };

/* ——— Pack question ids, read from the shipped data file ——— */
var dataCtx = { window: {} };
vm.createContext(dataCtx);
vm.runInContext('var window = this.window; window.PGRE = {}; var PGRE = window.PGRE;\n' +
  fs.readFileSync(path.join(ROOT, 'js', 'data-packs.js'), 'utf8'), dataCtx);
var PACKS = dataCtx.window.PGRE.PACKS;
var PACK_UNION = [];
(function () {
  var seen = {};
  Object.keys(PACKS).forEach(function (k) {
    PACKS[k].ids.forEach(function (id) { if (!seen[id]) { seen[id] = 1; PACK_UNION.push(id); } });
  });
}());
var SIT_PACK = '09';                       // the pack the test sits; the seeds never use its ids
var SIT_IDS = {};
PACKS[SIT_PACK].ids.forEach(function (id) { SIT_IDS[id] = 1; });
var SEED_POOL = PACK_UNION.filter(function (id) { return !SIT_IDS[id]; });

/* ——— Seed builder ———
   news: [dayAgo, topic, correct, seconds]; every entry is the first attempt
   of a fresh pack qid in mode 'practice'. */
function buildSeed(spec) {
  var pool = SEED_POOL.slice();
  var attempts = [];
  var seq = 0;
  function take() { var id = pool.shift(); if (!id) throw new Error('seed pool exhausted'); return id; }
  function push(k, qid, topic, correct, sec, mode) {
    seq++;
    attempts.push({
      ts: tsAgo(k, 1, 0, seq % 3600), qid: qid, topic: topic, picked: correct ? 0 : 1, answer: 0,
      correct: correct, ms: sec * 1000, sid: 'seed-' + k, mode: mode, confidence: null, tags: []
    });
  }
  // Bulk history 20-25 days back: outside every window, only shrinks coverage.
  for (var b = 0; b < (spec.bulk || 0); b++) push(20 + (b % 6), take(), 'cm', true, 100, 'practice');
  var firstNewQid = null;
  spec.news.forEach(function (n) {
    var qid = take();
    if (!firstNewQid) firstNewQid = qid;
    push(n[0], qid, n[1], n[2], n[3], 'practice');
  });
  (spec.extra || []).forEach(function (fn) { fn({ take: take, push: push, firstNewQid: firstNewQid }); });
  (spec.repeats || []).forEach(function (sec) { push(0, firstNewQid, 'cm', true, sec, 'mistakes'); });
  var iso = new Date().toISOString();
  return {
    created: iso, xp: 0, attempts: attempts,
    settings: { theme: 'light', examDate: spec.examDate, keyboard: true, paceTrainer: true,
                paceTargetSec: 103, dailyTargetMin: 120 },
    migrations: { ankiReset2026: iso, planRebuild2026: iso, easy10: iso },
    _epoch: 1000 + spec.n, _rev: 1
  };
}

function attemptedPackCount(seed) {
  var inPack = {};
  PACK_UNION.forEach(function (id) { inPack[id] = 1; });
  var seen = {};
  var n = 0;
  seed.attempts.forEach(function (a) { if (inPack[a.qid] && !seen[a.qid]) { seen[a.qid] = 1; n++; } });
  return n;
}

/* Expected readout for a seed, from the definitions in the spec. */
function expectFor(spec, seed) {
  var news = spec.news;
  var today = news.filter(function (n) { return n[0] === 0; });
  var pace = today.length ? Math.round(median(today.map(function (n) { return n[3]; }))) : null;
  var last7 = news.filter(function (n) { return n[0] <= 6; });
  var right7 = last7.filter(function (n) { return n[2]; }).length;
  var acc = last7.length ? Math.round(100 * right7 / last7.length) : null;
  var repMin = Math.round((spec.repeats || []).reduce(function (s, x) { return s + x; }, 0) / 60);
  var lastPackDay = dayAhead(spec.examAhead - 3);
  var wdl = workingDays(dayAgo(0), lastPackDay);
  var remaining = PACK_UNION.length - attemptedPackCount(seed);
  var required = round1(remaining / wdl);
  var working7 = 0;
  for (var k = 0; k < 7; k++) if (!isSunday(dayAgo(k))) working7++;
  var actual = round1(last7.length / working7);
  var trendNew = [], trendPace = [];
  for (var d = 6; d >= 0; d--) {
    var rows = news.filter(function (n) { return n[0] === d; });
    trendNew.push(rows.length);
    trendPace.push(rows.length ? Math.round(median(rows.map(function (n) { return n[3]; }))) : null);
  }
  return {
    newQuestions: { value: today.length, band: bandNew(today.length), text: today.length + ' / 15' },
    paceSec: { value: pace, band: bandPace(pace), text: (pace == null ? '—' : pace + ' s') + ' / 103' },
    firstAttemptAccuracy: { value: acc, band: bandAcc(acc), text: (acc == null ? '—' : acc + '%') + ' / 75%',
                            n: last7.length, correct: right7 },
    repeatMinutes: { value: repMin, band: bandRepeat(repMin), text: repMin + ' min / 20' },
    coverage: { value: actual, band: bandCoverage(actual, required),
                text: actual.toFixed(1) + ' / ' + required.toFixed(1),
                remaining: remaining, workingDaysLeft: wdl, required: required, actual: actual,
                lastPackDay: lastPackDay },
    trendNew: trendNew, trendPace: trendPace
  };
}

/* ——— The three histories ——— */
var EXAM_AHEAD = 20;   // exam 20 days out, last pack day 17 days out
var T = true, F = false;
var SPECS = [
  {
    n: 1, name: 'mixed',
    examAhead: EXAM_AHEAD,
    news: [
      // today: 11 new, median 128 s; 8 right
      [0, 'cm', F, 60], [0, 'cm', T, 90], [0, 'em', T, 100], [0, 'em', F, 110], [0, 'qm', T, 120],
      [0, 'qm', T, 128], [0, 'th', T, 130], [0, 'at', T, 135], [0, 'sp', F, 140], [0, 'cm', T, 150],
      [0, 'em', T, 170],
      [1, 'cm', T, 100], [1, 'cm', F, 100], [1, 'em', T, 100], [1, 'em', T, 100], [1, 'qm', T, 100],
      [1, 'th', T, 100], [1, 'at', F, 100], [1, 'ow', T, 100],
      [2, 'cm', F, 100], [2, 'em', F, 100], [2, 'qm', T, 100], [2, 'th', F, 100], [2, 'sp', T, 100],
      [2, 'sr', T, 100],
      [4, 'cm', T, 100], [4, 'em', T, 100], [4, 'qm', T, 100], [4, 'at', T, 100], [4, 'lb', T, 100],
      // 7-9 days back: inside the 14-day topic window only
      [7, 'cm', F, 100], [7, 'cm', T, 100], [7, 'em', F, 100],
      [8, 'cm', F, 100], [8, 'qm', T, 100], [8, 'th', T, 100],
      [9, 'th', T, 100], [9, 'at', T, 100], [9, 'sp', T, 100], [9, 'ow', F, 100]
    ],
    extra: [
      // first tried 21 days ago in practice, again today: not new today
      function (h) { var q = h.take(); h.push(21, q, 'cm', T, 100, 'practice'); h.push(0, q, 'cm', T, 800, 'practice'); },
      // first try today is the question of the day: never a new question
      function (h) { var q = h.take(); h.push(0, q, 'em', T, 30, 'qotd'); h.push(0, q, 'em', T, 700, 'practice'); },
      // first try in a mock exam 2 days ago, practice today: not new
      function (h) { var q = h.take(); h.push(2, q, 'qm', F, 90, 'exam'); h.push(0, q, 'qm', T, 600, 'practice'); }
    ],
    repeats: [900, 900, 900],          // 45 min of mistake-book retakes today
    topicOrder: ['cm', 'em', 'th', 'qm', 'at', 'sp', 'ow', 'sr', 'lb'],
    topicBands: { cm: 'red', em: 'amber', th: 'green', qm: 'green', at: 'none', sp: 'none', ow: 'none', sr: 'none', lb: 'none' },
    topicNew: { cm: 10, em: 8, th: 5, qm: 6, at: 4, sp: 3, ow: 2, sr: 1, lb: 1 },
    topicAcc: { cm: '50%', em: '63%', th: '80%', qm: '100%' },
    bands: { newQuestions: 'amber', paceSec: 'amber', firstAttemptAccuracy: 'amber', repeatMinutes: 'red', coverage: 'red' }
  },
  {
    n: 2, name: 'all green',
    examAhead: EXAM_AHEAD,
    bulk: 300,
    news: (function () {
      var out = [];
      for (var i = 0; i < 16; i++) out.push([0, ['cm', 'em', 'qm', 'th'][i % 4], i < 13, 90]);
      for (var j = 0; j < 20; j++) out.push([1 + (j % 6), ['cm', 'em', 'qm', 'th', 'at'][j % 5], j < 17, 95]);
      return out;
    }()),
    repeats: [540, 540],               // 18 min
    bands: { newQuestions: 'green', paceSec: 'green', firstAttemptAccuracy: 'green', repeatMinutes: 'green', coverage: 'green' }
  },
  {
    n: 3, name: 'slow and short',
    examAhead: EXAM_AHEAD,
    bulk: 252,
    news: (function () {
      var out = [[0, 'cm', T, 140], [0, 'em', F, 150], [0, 'qm', T, 160], [0, 'th', F, 170], [0, 'at', F, 180]];
      for (var j = 0; j < 19; j++) out.push([1 + (j % 6), ['cm', 'em', 'qm'][j % 3], j < 10, 120]);
      return out;
    }()),
    repeats: [900, 900],               // 30 min
    bands: { newQuestions: 'red', paceSec: 'red', firstAttemptAccuracy: 'red', repeatMinutes: 'amber', coverage: 'amber' }
  }
];

/* ——— Chrome + CDP plumbing (same pattern as test-pack-launch-chrome.js) ——— */
function freePort() {
  return new Promise(function (resolve, reject) {
    var srv = net.createServer();
    srv.listen(0, '127.0.0.1', function () { var p = srv.address().port; srv.close(function () { resolve(p); }); });
    srv.on('error', reject);
  });
}
function findChrome() {
  var c = [process.env.CHROME_BIN, process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean);
  for (var i = 0; i < c.length; i++) { try { fs.accessSync(c[i], fs.constants.X_OK); return c[i]; } catch (e) {} }
  return null;
}
function stopChrome(proc) {
  return new Promise(function (resolve) {
    if (!proc || proc.exitCode !== null || proc.signalCode !== null) return resolve();
    var done = false;
    var finish = function () { if (done) return; done = true; clearTimeout(timer); resolve(); };
    var timer = setTimeout(function () { try { proc.kill('SIGKILL'); } catch (e) {} setTimeout(finish, 1000); }, 5000);
    proc.once('exit', finish);
    try { proc.kill(); } catch (e) { finish(); }
  });
}
var server = http.createServer(function (req, res) {
  var reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  var filePath = path.join(ROOT, decodeURIComponent(reqPath));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('forbidden'); return; }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

async function main() {
  var chromeBin = findChrome();
  if (!chromeBin) { console.error('LAUNCHER_UNAVAILABLE: Chrome binary not found'); process.exit(2); }
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  await new Promise(function (r) { server.listen(PORT, '127.0.0.1', r); });
  var base = 'http://127.0.0.1:' + server.address().port;
  var cdpPort = CDP_PORT || await freePort();
  console.log('HTTP ' + base + '  CDP ' + cdpPort);
  var userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pgre-intensity-chrome-'));
  var chrome = spawn(chromeBin, ['--headless=new', '--remote-debugging-port=' + cdpPort,
    '--user-data-dir=' + userDataDir, '--no-first-run', '--window-size=1280,900',
    base + '/__blank__'], { stdio: 'ignore' });

  var pageErrors = [];
  var bridge = { sent: 0, answered: 0 };
  var ws = null;
  try {
    var wsUrl = null;
    for (var i = 0; i < 50 && !wsUrl; i++) {
      await sleep(200);
      try {
        var list = await (await fetch('http://127.0.0.1:' + cdpPort + '/json/list')).json();
        var page = list.find(function (t) { return t.type === 'page'; });
        if (page && page.webSocketDebuggerUrl) wsUrl = page.webSocketDebuggerUrl;
      } catch (e) { /* not up yet */ }
    }
    if (!wsUrl) throw new Error('no CDP page target');
    ws = new WebSocket(wsUrl);
    var idSeq = 1;
    var pending = new Map();
    ws.onmessage = function (ev) {
      var msg = JSON.parse(ev.data);
      if (msg.method === 'Runtime.exceptionThrown') {
        var d = msg.params && msg.params.exceptionDetails;
        pageErrors.push((d && d.exception && d.exception.description) || (d && d.text) || JSON.stringify(d));
      }
      if (msg.method === 'Network.requestWillBeSent' && isBridgeUrl(msg.params.request.url)) bridge.sent++;
      if (msg.method === 'Network.responseReceived' && isBridgeUrl(msg.params.response.url)) bridge.answered++;
      if (msg.id && pending.has(msg.id)) {
        var p = pending.get(msg.id); pending.delete(msg.id);
        if (msg.error) p.reject(new Error(JSON.stringify(msg.error))); else p.resolve(msg.result);
      }
    };
    await new Promise(function (res, rej) { ws.onopen = res; ws.onerror = rej; });
    function send(method, params) {
      return new Promise(function (resolve, reject) {
        var id = idSeq++;
        pending.set(id, { resolve: resolve, reject: reject });
        ws.send(JSON.stringify({ id: id, method: method, params: params || {} }));
      });
    }
    async function ev(expression) {
      var res = await send('Runtime.evaluate', { expression: expression, returnByValue: true, awaitPromise: true });
      if (res.exceptionDetails) throw new Error('evaluate: ' + JSON.stringify(res.exceptionDetails).slice(0, 600));
      return res.result.value;
    }
    async function waitFor(expression, label, tries) {
      for (var t = 0; t < (tries || 80); t++) {
        try { if (await ev(expression)) return true; } catch (e) { /* page mid-navigation */ }
        await sleep(100);
      }
      throw new Error('timed out waiting for ' + label);
    }
    async function go(url) {
      await send('Page.navigate', { url: url });
      await sleep(250);
    }
    /* Clip from the top of `selector` to the bottom of `untilSelector`
       (default: the same element). The page is scrolled so the element
       starts below the sticky top bar. */
    async function shotOf(selector, file, untilSelector) {
      var rect = await ev('(function(){var el=document.querySelector(' + JSON.stringify(selector) + ');' +
        'var end=document.querySelector(' + JSON.stringify(untilSelector || selector) + ');' +
        'var toasts=document.getElementById("toasts");if(toasts)toasts.style.visibility="hidden";' +
        'var r=el.getBoundingClientRect();var top=r.top+window.scrollY;' +
        'window.scrollTo(0,Math.max(0,top-90));r=el.getBoundingClientRect();var e=end.getBoundingClientRect();' +
        'return {x:r.left+window.scrollX,y:r.top+window.scrollY,w:r.width,h:e.bottom-r.top};})()');
      await sleep(400);
      var shot = await send('Page.captureScreenshot', {
        format: 'png', captureBeyondViewport: true,
        clip: { x: Math.max(0, rect.x - 12), y: Math.max(0, rect.y - 12), width: rect.w + 24, height: rect.h + 24, scale: 1 }
      });
      var out = path.join(ARTIFACT_DIR, file);
      fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
      console.log('  screenshot ' + out);
    }

    await send('Runtime.enable', {});
    await send('Page.enable', {});
    /* js/status.js posts the status summary to the OrbitOS status bridge on
       127.0.0.1:4789. Block that port, so a seeded test history never
       replaces the snapshot that agents read for the real study data. */
    await send('Network.enable', {});
    await send('Network.setBlockedURLs', { urls: ['*://127.0.0.1:' + BRIDGE_PORT + '/*', '*://localhost:' + BRIDGE_PORT + '/*'] });

    /* Seed on a script-free page of the same origin, then open the app. */
    async function seedAndOpen(seed) {
      await go(base + '/__blank__');
      await waitFor('document.readyState === "complete" && !window.PGRE', 'blank page');
      await ev('localStorage.clear(); sessionStorage.clear(); localStorage.setItem("pgre-state-v1", ' +
        JSON.stringify(JSON.stringify(seed)) + '); true');
      await go(base + '/#/');
      await waitFor('!!document.getElementById("intensity-card")', 'the Intensity card');
      await sleep(300);
    }

    async function readCard() {
      return ev('(function(){var out={rows:{},trend:{},topics:[]};' +
        'document.querySelectorAll("#intensity-card .intensity-row").forEach(function(r){' +
          'var chip=r.querySelector(".band-chip");var hint=r.querySelector(".intensity-hint");' +
          'out.rows[r.getAttribute("data-metric")]={band:r.getAttribute("data-band"),' +
          'value:r.querySelector(".intensity-value").innerText.trim(),chip:chip&&chip.innerText.trim(),' +
          'chipBand:chip&&chip.getAttribute("data-band"),hint:hint?hint.innerText.trim():""};});' +
        'document.querySelectorAll("#intensity-card [data-trend]").forEach(function(f){' +
          'out.trend[f.getAttribute("data-trend")]=Array.prototype.map.call(f.querySelectorAll(".itrend-col"),' +
          'function(c){var v=c.getAttribute("data-value");return v===""?null:Number(v);});});' +
        'document.querySelectorAll("#intensity-adjust tbody tr").forEach(function(tr){var td=tr.querySelectorAll("td");' +
          'out.topics.push({topic:tr.getAttribute("data-topic"),band:tr.getAttribute("data-band"),' +
          'weight:td[1].innerText.trim(),n:Number(td[2].innerText),acc:td[3].innerText.trim(),bandText:td[4].innerText.trim()});});' +
        'var ids=Array.prototype.map.call(document.getElementById("view").children,function(c){return c.id||c.className;});' +
        'out.order=ids;return out;})()');
    }

    var METRICS = ['newQuestions', 'paceSec', 'firstAttemptAccuracy', 'repeatMinutes', 'coverage'];

    for (var s = 0; s < SPECS.length; s++) {
      var spec = SPECS[s];
      spec.examDate = dayAhead(spec.examAhead);
      var seed = buildSeed(spec);
      var want = expectFor(spec, seed);
      pageErrors.length = 0;
      console.log('\nhistory ' + spec.n + ' (' + spec.name + ')');
      await seedAndOpen(seed);
      var card = await readCard();

      if (s === 0) {
        var at = card.order.indexOf('st-active-target');
        check(at >= 0 && card.order[at + 1] === 'intensity-card',
          'the Intensity card sits right after the Daily activity target card');
      }
      METRICS.forEach(function (m) {
        var row = card.rows[m] || {};
        check(row.value === want[m].text, m + ' shows "' + want[m].text + '" (got "' + row.value + '")');
        check(row.band === want[m].band && row.chipBand === want[m].band && row.chip === CHIP[want[m].band],
          m + ' band is ' + want[m].band + ' with the label "' + CHIP[want[m].band] + '" (got ' +
          row.band + ' / ' + row.chip + ')');
        check(want[m].band === spec.bands[m], m + ' lands in the ' + spec.bands[m] + ' band this history was built for');
        check((want[m].band === 'green') === (row.hint === ''),
          m + (want[m].band === 'green' ? ' has no hint when green' : ' carries a hint when ' + want[m].band));
      });
      check(JSON.stringify(card.trend.newQuestions) === JSON.stringify(want.trendNew),
        'new-question trend, oldest first: ' + JSON.stringify(want.trendNew) + ' (got ' + JSON.stringify(card.trend.newQuestions) + ')');
      check(JSON.stringify(card.trend.paceSec) === JSON.stringify(want.trendPace),
        'median-pace trend, oldest first: ' + JSON.stringify(want.trendPace) + ' (got ' + JSON.stringify(card.trend.paceSec) + ')');

      var payload = await ev('PGRE.buildStatusSummary().intensity');
      METRICS.forEach(function (m) {
        check(payload[m].value === want[m].value && payload[m].band === (want[m].band === 'none' ? null : want[m].band),
          'status payload ' + m + ' = ' + want[m].value + ' (' + want[m].band + ')');
      });
      check(payload.coverage.remaining === want.coverage.remaining &&
        payload.coverage.workingDaysLeft === want.coverage.workingDaysLeft &&
        payload.coverage.required === want.coverage.required &&
        payload.coverage.actual === want.coverage.actual &&
        payload.coverage.lastPackDay === want.coverage.lastPackDay,
        'status payload coverage inputs: remaining ' + want.coverage.remaining + ', working days ' +
        want.coverage.workingDaysLeft + ', required ' + want.coverage.required + ', actual ' + want.coverage.actual);
      check(payload.firstAttemptAccuracy.n === want.firstAttemptAccuracy.n &&
        payload.firstAttemptAccuracy.correct === want.firstAttemptAccuracy.correct,
        'status payload accuracy counts ' + want.firstAttemptAccuracy.correct + ' of ' + want.firstAttemptAccuracy.n);
      check(payload.topics.map(function (t) { return t.topic; }).join(',') ===
        card.topics.map(function (t) { return t.topic; }).join(','),
        'status payload topic rows are in the same order as the table');

      if (spec.topicOrder) {
        check(card.topics.map(function (t) { return t.topic; }).join(',') === spec.topicOrder.join(','),
          'Where to adjust order: ' + spec.topicOrder.join(', '));
        card.topics.forEach(function (t) {
          var wantBand = spec.topicBands[t.topic];
          var okBand = t.band === wantBand &&
            (wantBand === 'none' ? t.bandText === 'too few to judge' : t.bandText === CHIP[wantBand]);
          var okAcc = wantBand === 'none' ? t.acc === '—' : t.acc === spec.topicAcc[t.topic];
          check(okBand && okAcc && t.n === spec.topicNew[t.topic],
            t.topic + ': ' + spec.topicNew[t.topic] + ' new, ' +
            (wantBand === 'none' ? 'too few to judge' : spec.topicAcc[t.topic] + ', ' + wantBand) +
            ' (got ' + t.n + ', ' + t.acc + ', ' + t.bandText + ')');
        });
        check(card.topics[0].weight === '20%' && card.topics[1].weight === '18%',
          'topic rows show the ETS weight');
      }

      if (s === 0) {
        await shotOf('#intensity-card', 'intensity-card-light.png');
        // Phone width: no horizontal page scroll.
        await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 2, mobile: true });
        await sleep(500);
        var overflow = await ev('document.documentElement.scrollWidth - window.innerWidth');
        check(overflow <= 0, 'at 375 px the page has no horizontal scroll (overflow ' + overflow + ' px)');
        var cardFits = await ev('(function(){var r=document.getElementById("intensity-card").getBoundingClientRect();' +
          'return r.right <= window.innerWidth + 0.5 && r.left >= -0.5;})()');
        check(cardFits, 'at 375 px the Intensity card fits the viewport');
        var tableFits = await ev('(function(){var c=document.getElementById("intensity-card").getBoundingClientRect();' +
          'var ok=true;document.querySelectorAll("#intensity-card .intensity-table td, #intensity-card .intensity-row > *")' +
          '.forEach(function(el){var r=el.getBoundingClientRect();if(r.width&&r.right>c.right-1)ok=false;});return ok;})()');
        check(tableFits, 'at 375 px every row and table cell ends inside the card');
        await shotOf('#intensity-card', 'intensity-card-phone.png');
        await send('Emulation.clearDeviceMetricsOverride', {});
        await sleep(300);

        /* Sit the pack: each answer takes 120 s on the page clock. */
        console.log('\npractice summary after a timed pack (history 1)');
        await ev('(function(){var real=Date.now;window.__pgreRealNow=real;window.__pgreOffset=0;' +
          'Date.now=function(){return real.call(Date)+window.__pgreOffset;};return true;})()');
        var launched = await ev('!!PGRE.launchPack(' + JSON.stringify(SIT_PACK) + ')');
        check(launched, 'PGRE.launchPack("' + SIT_PACK + '") opens the pack');
        await waitFor('!!document.getElementById("confirm-btn")', 'the first question');
        var sat = 0;
        for (var q = 0; q < 40; q++) {
          var state = await ev('document.getElementById("intensity-summary") ? "summary" : ' +
            '(document.getElementById("confirm-btn") ? "question" : (document.getElementById("next-btn") ? "feedback" : "wait"))');
          if (state === 'summary') break;
          if (state === 'question') {
            await ev('(function(){window.__pgreOffset+=120000;' +
              'document.querySelector(".choice[data-idx=\\"0\\"]").click();' +
              'document.getElementById("confirm-btn").click();return true;})()');
            sat++;
            await waitFor('!!document.getElementById("next-btn")', 'feedback ' + sat);
          } else if (state === 'feedback') {
            await ev('document.getElementById("next-btn").click(); true');
            await sleep(150);
          } else {
            await sleep(150);
          }
        }
        await waitFor('!!document.getElementById("intensity-summary")', 'the session summary');
        var summary = await ev('(function(){function line(k){var l=document.querySelector("[data-line=\\""+k+"\\"]");' +
          'return {band:l.getAttribute("data-band"),value:l.querySelector(".intensity-line-value").innerText.trim(),' +
          'label:l.querySelector(".intensity-line-label").innerText.trim(),chip:l.querySelector(".band-chip").innerText.trim()};}' +
          'return {pace:line("pace"),fresh:line("new"),heading:document.querySelector("#practice-root h1").innerText};})()');
        await sleep(1000); // the score percentage counts up for 900 ms
        await shotOf('#practice-root .practice-card', 'practice-summary-light.png', '#intensity-summary');
        var newAfter = want.newQuestions.value + sat;
        check(sat >= 1, 'answered ' + sat + ' question(s) of pack ' + SIT_PACK);
        check(/^Median seconds per question/.test(summary.pace.label) && /this pack/.test(summary.pace.label),
          'summary line 1 reads "Median seconds per question" for this pack');
        check(summary.pace.value === '120 / 103' && summary.pace.band === 'amber' && summary.pace.chip === CHIP.amber,
          'summary pace line: 120 / 103, amber (got ' + summary.pace.value + ', ' + summary.pace.band + ')');
        check(/^New questions today/.test(summary.fresh.label) &&
          summary.fresh.value === newAfter + ' / 15' && summary.fresh.band === bandNew(newAfter) &&
          summary.fresh.chip === CHIP[bandNew(newAfter)],
          'summary new-question line: ' + newAfter + ' / 15, ' + bandNew(newAfter) +
          ' (got ' + summary.fresh.value + ', ' + summary.fresh.band + ')');

        var receipts = await ev('(function(){var st=PGRE.store.state;return {last:st.lastAgentReceipt&&st.lastAgentReceipt.medianSec,' +
          'pack:st.packReceipts&&st.packReceipts[' + JSON.stringify(SIT_PACK) + ']&&st.packReceipts[' + JSON.stringify(SIT_PACK) + '].medianSec,' +
          'keys:st.packReceipts&&st.packReceipts[' + JSON.stringify(SIT_PACK) + ']?Object.keys(st.packReceipts[' + JSON.stringify(SIT_PACK) + ']):[]};})()');
        check(receipts.last === 120 && receipts.pack === 120,
          'the agent receipt and packReceipts["' + SIT_PACK + '"] carry medianSec 120');
        check(['pack', 'score', 'durationMin', 'missQids', 'ids', 'completedAt'].every(function (k) {
          return receipts.keys.indexOf(k) >= 0; }), 'the pack receipt keeps its existing fields');

        // Today's pace now includes the pack's answers, read from the log.
        var todayMs = await ev('(function(){var out=[];var seen={};var rows=PGRE.store.state.attempts.slice()' +
          '.map(function(r,i){return {r:r,i:i,t:Date.parse(r.ts)};}).sort(function(a,b){return (a.t-b.t)||(a.i-b.i);});' +
          'var d=new Date();var today=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");' +
          'rows.forEach(function(x){var r=x.r;var first=!seen[r.qid];seen[r.qid]=1;var t=new Date(r.ts);' +
          'var k=t.getFullYear()+"-"+String(t.getMonth()+1).padStart(2,"0")+"-"+String(t.getDate()).padStart(2,"0");' +
          'if(first&&r.mode==="practice"&&k===today)out.push(r.ms);});return out;})()');
        var paceAfter = Math.round(median(todayMs) / 1000);
        var after = await ev('PGRE.buildStatusSummary().intensity');
        check(after.newQuestions.value === newAfter && after.paceSec.value === paceAfter,
          'status payload after the pack: ' + newAfter + ' new today, pace ' + paceAfter + ' s');
        await go(base + '/#/');
        await waitFor('!!document.getElementById("intensity-card")', 'the Intensity card after the pack');
        await sleep(300);
        var card2 = await readCard();
        check(card2.rows.newQuestions.value === newAfter + ' / 15' &&
          card2.rows.paceSec.value === paceAfter + ' s / 103',
          'the dashboard agrees with the summary and the payload after the pack');
        await ev('Date.now = window.__pgreRealNow; true');
      }

      check(pageErrors.length === 0, 'no page errors' + (pageErrors.length ? ': ' + pageErrors.join(' | ') : ''));
      check(bridge.answered === 0, 'the status bridge on port ' + BRIDGE_PORT + ' received nothing (' + bridge.sent +
        ' request(s) blocked, ' + bridge.answered + ' answered)');
    }
  } finally {
    if (ws) try { ws.close(); } catch (e) {}
    await stopChrome(chrome);
    server.close();
    try { fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } catch (e2) {}
    if (!KEEP_ARTIFACTS) {
      try { fs.rmSync(ARTIFACT_DIR, { recursive: true, force: true }); } catch (e3) {}
    }
  }
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  if (failed) process.exitCode = 1;
}

main().catch(function (err) {
  console.error('Error during intensity chrome test:', err && err.stack || err);
  process.exit(1);
});
