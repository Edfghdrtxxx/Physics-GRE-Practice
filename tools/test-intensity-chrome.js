#!/usr/bin/env node
/* Headless Chrome, end to end: the Intensity feedback (js/intensity.js) on
   the shipped page. Three seeded study histories, ten days each, together
   put every one of the five metrics in each band (green, amber, red). For
   each history the test loads the dashboard and checks every row's value
   and band, the headline and its one action, the 7-day strip, the "Where to
   adjust" topic order, and PGRE.buildStatusSummary().intensity. In the
   first history it also uses the card: opens a reading with the mouse and
   the keyboard, opens the topic table, checks the phone layout, sits a
   timed pack, follows the summary's link back and checks where it lands and
   what changed, then lets a sibling tab write. Two more loads cover a new
   user and a no-pack Sunday (page clock moved forward). Expected numbers
   are worked out here from the seed, not read back from the module under
   test.

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
/* DAY_SHIFT moves "today" forward for the no-pack scenario, where the page
   clock is shifted by the same number of days. */
var DAY_SHIFT = 0;
function dayAgo(k) { var d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + DAY_SHIFT - k); return dayKey(d); }
function dayAhead(k) { return dayAgo(-k); }
/* ISO timestamp k days ago at local hour h, minute m, second s. */
function tsAgo(k, h, m, s) {
  var d = new Date();
  d.setDate(d.getDate() + DAY_SHIFT - k);
  d.setHours(h, m || 0, s || 0, 0);
  return d.toISOString();
}
/* No timed pack on Sunday (0) or Thursday (4), local time. Written out here,
   not read from js/intensity.js. SUNDAY_ONLY is the rule before Thursdays
   were added, kept to show that the numbers change. */
var NO_PACK = [0, 4];
var SUNDAY_ONLY = [0];
function workingDays(from, to, noPack) {
  noPack = noPack || NO_PACK;
  var n = 0;
  var d = new Date(from + 'T12:00:00');
  var end = new Date(to + 'T12:00:00');
  while (d <= end) { if (noPack.indexOf(d.getDay()) < 0) n++; d.setDate(d.getDate() + 1); }
  return n;
}
/* How many days ago the Thursday inside the last 7 days was (0 = today). */
var THU_AGO = (new Date().getDay() - 4 + 7) % 7;
/* On a no-pack weekday the card shows New questions below its target as
   "No pack today" (js/intensity.js review()); the computed band is unchanged. */
var NO_PACK_TODAY = NO_PACK.indexOf(new Date().getDay()) >= 0;
var DAYS_TO_SUNDAY = (7 - new Date().getDay()) % 7 || 7;
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

/* What the card prints beside each number: the target in words. */
function newText(n) { return n + (NO_PACK_TODAY && n < 15 ? ' no target today' : ' of 15'); }
/* What the row's chip shows; only New questions differs from its band. */
function shownAs(metric, bandName) {
  if (metric === 'newQuestions' && NO_PACK_TODAY && bandName !== 'green') return { band: 'none', chip: 'No pack today', show: 'rest' };
  return { band: bandName, chip: CHIP[bandName], show: bandName };
}
/* The reading the headline is about: off target before close, and within
   one band retakes, new questions, coverage, accuracy, pace. Written out
   here, not read from js/intensity.js. */
var LEAD_ORDER = ['repeatMinutes', 'newQuestions', 'coverage', 'firstAttemptAccuracy', 'paceSec'];
function leadOf(want) {
  var shown = {};
  LEAD_ORDER.forEach(function (m) { shown[m] = shownAs(m, want[m].band).show; });
  var reds = LEAD_ORDER.filter(function (m) { return shown[m] === 'red'; });
  var ambers = LEAD_ORDER.filter(function (m) { return shown[m] === 'amber'; });
  return reds[0] || ambers[0] || null;
}
/* Untried questions of one pack in a seed. */
function freshIn(packId, seed) {
  var tried = {};
  seed.attempts.forEach(function (a) { tried[a.qid] = 1; });
  return PACKS[packId].ids.filter(function (id) { return !tried[id]; }).length;
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
  var working7 = workingDays(dayAgo(6), dayAgo(0));
  var actual = round1(last7.length / working7);
  var wdlSun = workingDays(dayAgo(0), lastPackDay, SUNDAY_ONLY);
  var sundayOnly = { workingDaysLeft: wdlSun, required: round1(remaining / wdlSun),
                     actual: round1(last7.length / workingDays(dayAgo(6), dayAgo(0), SUNDAY_ONLY)) };
  var trendNew = [], trendPace = [];
  for (var d = 6; d >= 0; d--) {
    var rows = news.filter(function (n) { return n[0] === d; });
    trendNew.push(rows.length);
    trendPace.push(rows.length ? Math.round(median(rows.map(function (n) { return n[3]; }))) : null);
  }
  return {
    newQuestions: { value: today.length, band: bandNew(today.length), text: newText(today.length) },
    paceSec: { value: pace, band: bandPace(pace), text: (pace == null ? '—' : pace + ' s') + ' target 103 s or under' },
    firstAttemptAccuracy: { value: acc, band: bandAcc(acc), text: (acc == null ? '—' : acc + '%') + ' target 75% or more',
                            n: last7.length, correct: right7 },
    repeatMinutes: { value: repMin, band: bandRepeat(repMin), text: repMin + ' min limit 20 min' },
    coverage: { value: actual, band: bandCoverage(actual, required),
                text: actual.toFixed(1) + ' a day needed: ' + required.toFixed(1),
                remaining: remaining, workingDaysLeft: wdl, required: required, actual: actual,
                lastPackDay: lastPackDay, working7: working7, new7: last7.length, sundayOnly: sundayOnly },
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
    bands: { newQuestions: 'amber', paceSec: 'amber', firstAttemptAccuracy: 'amber', repeatMinutes: 'red', coverage: 'red' },
    // 45 min of retakes against the limit of 20 leads; 11 new is short of 15, so the action is the next pack
    // (on a no-pack weekday New questions has no target, so the advice is to stop and there is no button)
    lead: 'repeatMinutes', headline: '45 min of retakes today, 25 over the limit.', tone: 'attention',
    actionIsPack: !NO_PACK_TODAY
  },
  {
    n: 2, name: 'all green',
    examAhead: EXAM_AHEAD,
    bulk: 300,
    news: (function () {
      var out = [];
      for (var i = 0; i < 16; i++) out.push([0, ['cm', 'em', 'qm', 'th'][i % 4], i < 13, 90]);
      for (var j = 0; j < 20; j++) out.push([1 + (j % 6), ['cm', 'em', 'qm', 'th', 'at'][j % 5], j < 17, 95]);
      out.push([THU_AGO, 'cm', T, 95]);  // a new question on the Thursday: it still counts
      return out;
    }()),
    thursdayNew: true,
    repeats: [540, 540],               // 18 min
    bands: { newQuestions: 'green', paceSec: 'green', firstAttemptAccuracy: 'green', repeatMinutes: 'green', coverage: 'green' },
    lead: null, headline: 'On target on all five readings.', tone: 'good', actionIsPack: true
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
    bands: { newQuestions: 'red', paceSec: 'red', firstAttemptAccuracy: 'red', repeatMinutes: 'amber', coverage: 'amber' },
    // 5 new of 15 leads on a pack day; on a no-pack weekday accuracy (10 + 2 right of 24 = 50%) leads
    lead: NO_PACK_TODAY ? 'firstAttemptAccuracy' : 'newQuestions',
    headline: NO_PACK_TODAY ? 'First-try accuracy is 50% over the last 7 days.' : '10 new questions to go today.',
    tone: 'attention', actionIsPack: !NO_PACK_TODAY
  }
];

/* Runs in the page: every clock read moves forward by `off` ms. */
function clockShim(off) {
  var R = Date;
  function F() {
    if (!(this instanceof F)) return new R(R.now() + off).toString();
    if (arguments.length === 0) return new R(R.now() + off);
    return new (Function.prototype.bind.apply(R, [null].concat([].slice.call(arguments))))();
  }
  F.prototype = R.prototype;
  F.now = function () { return R.now() + off; };
  F.parse = R.parse;
  F.UTC = R.UTC;
  window.Date = F;
}

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

    /* The card as a reader meets it. A row's own chip is the direct child of
       its button (the opened panel lists all three bands). The topic table
       sits in a closed disclosure, so its cells are read as textContent. */
    async function readCard() {
      return ev('(function(){var out={rows:{},trend:{newQuestions:[],paceSec:[]},topics:[]};' +
        'function t(el){return el?el.textContent.replace(/\\s+/g," ").trim():"";}' +
        'var card=document.getElementById("intensity-card");' +
        'card.querySelectorAll(".intensity-row").forEach(function(r){' +
          'var chip=r.querySelector(".intensity-toggle > .band-chip");var hint=r.querySelector(".intensity-hint");' +
          'var link=r.querySelector(".intensity-next a");var delta=r.querySelector(".intensity-delta");' +
          'var btn=r.querySelector(".intensity-toggle");var val=r.querySelector(".intensity-value");' +
          'out.rows[r.getAttribute("data-metric")]={band:r.getAttribute("data-band"),show:r.getAttribute("data-show"),' +
          'value:t(val),preview:t(r.querySelector(".intensity-preview")),chip:chip?t(chip):null,' +
          'chipBand:chip&&chip.getAttribute("data-band"),hint:t(hint),link:link?link.getAttribute("href"):null,' +
          'delta:delta?t(delta).replace(" since your last look,",""):"",expanded:btn.getAttribute("aria-expanded"),' +
          'meter:!!r.querySelector(".imeter")};});' +
        'card.querySelectorAll(".iweek-day").forEach(function(c){var p=c.getAttribute("data-pace");' +
          'out.trend.newQuestions.push(Number(c.getAttribute("data-new")));out.trend.paceSec.push(p===""?null:Number(p));});' +
        'card.querySelectorAll("#intensity-adjust tbody tr").forEach(function(tr){var td=tr.querySelectorAll("td");' +
          'out.topics.push({topic:tr.getAttribute("data-topic"),band:tr.getAttribute("data-band"),' +
          'weight:t(td[1]),n:Number(t(td[2])),acc:t(td[3]),bandText:t(td[4])});});' +
        'var v=card.querySelector(".intensity-verdict");var a=v.querySelector("a");' +
        'out.verdict={tone:v.getAttribute("data-tone"),mark:v.getAttribute("data-mark"),focus:v.getAttribute("data-focus"),' +
          'headline:t(v.querySelector(".intensity-headline")),detail:t(v.querySelector(".intensity-detail")),' +
          'href:a?a.getAttribute("href"):null,label:a?t(a):null,primary:a?a.classList.contains("btn-primary"):false};' +
        'out.tally=Array.prototype.map.call(card.querySelectorAll(".intensity-tally-item"),t).join(" ");' +
        'out.empty=card.classList.contains("is-empty");' +
        'out.week=!!card.querySelector("#intensity-week");out.adjust=!!card.querySelector("#intensity-adjust");' +
        'out.tabindex0=card.querySelectorAll("[tabindex=\\"0\\"]").length;' +
        'var ids=Array.prototype.map.call(document.getElementById("view").children,function(c){return c.id||c.className;});' +
        'out.order=ids;return out;})()');
    }
    /* A real mouse click in the middle of an element. */
    async function clickOn(selector) {
      var p = await ev('(function(){var e=document.querySelector(' + JSON.stringify(selector) + ');' +
        'e.scrollIntoView({block:"center"});var r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()');
      await sleep(150);
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y });
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', clickCount: 1 });
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1 });
      await sleep(250);
    }
    async function pressKey(key, code, vk) {
      // No nativeVirtualKeyCode: 13 is the W key on macOS, and headless Chrome
      // then floods the page with key events that starve the toggle event.
      var base = { key: key, code: code, windowsVirtualKeyCode: vk };
      await send('Input.dispatchKeyEvent', Object.assign({ type: 'rawKeyDown' }, base));
      if (key === 'Enter') await send('Input.dispatchKeyEvent', Object.assign({ type: 'char', text: '\r' }, base));
      if (key === ' ') await send('Input.dispatchKeyEvent', Object.assign({ type: 'char', text: ' ' }, base));
      await send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, base));
      await sleep(150);
    }
    function rowSel(metric) { return '#intensity-card .intensity-row[data-metric="' + metric + '"]'; }
    /* How the readings are laid out: stacked or one line, and how many
       names touch their meter or are cut off. */
    function rowLayout() {
      return ev('(function(){var card=document.getElementById("intensity-card");var clash=0;' +
        'card.querySelectorAll(".intensity-toggle").forEach(function(b){var n=b.querySelector(".intensity-label"),m=b.querySelector(".imeter"),' +
        'box=b.querySelector(".intensity-name");if(!n||!m)return;var a=n.getBoundingClientRect(),q=m.getBoundingClientRect();' +
        'if(a.right>q.left+0.5&&a.bottom>q.top&&a.top<q.bottom)clash++;if(box.scrollWidth>box.clientWidth+1)clash++;});' +
        'var side=document.getElementById("sidebar");var sr=side?side.getBoundingClientRect():null;' +
        'return {stacked:/read read read/.test(getComputedStyle(card.querySelector(".intensity-toggle")).gridTemplateAreas),clash:clash,' +
        'card:Math.round(card.getBoundingClientRect().width),sidebar:sr&&sr.right>0&&getComputedStyle(side).display!=="none"?Math.round(sr.width):0,' +
        'overflow:document.documentElement.scrollWidth-window.innerWidth};})()');
    }
    /* Per reading: how many band limits are marked as current, and whether
       the marked one carries the same word as the row's chip. */
    function bandMarks() {
      return ev('(function(){var out={};document.querySelectorAll("#intensity-card .intensity-row").forEach(function(row){' +
        'var chip=row.querySelector(".intensity-toggle > .band-chip");var now=row.querySelectorAll(".intensity-cuts li.is-now");' +
        'out[row.getAttribute("data-metric")]={n:now.length,show:row.getAttribute("data-show"),' +
        'same:now.length===1&&!!chip&&now[0].querySelector(".band-chip").textContent.trim()===chip.textContent.trim()};});return out;})()');
    }
    async function panelOf(metric) {
      return ev('(function(){var b=document.querySelector(' + JSON.stringify(rowSel(metric) + ' .intensity-toggle') + ');' +
        'var p=document.getElementById(b.getAttribute("aria-controls"));' +
        'return {expanded:b.getAttribute("aria-expanded"),hidden:p.hidden,height:p.offsetHeight,' +
        'text:p.innerText.replace(/\\s+/g," ").trim(),' +
        'links:Array.prototype.map.call(p.querySelectorAll("a"),function(a){return a.getAttribute("href");})};})()');
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
      var lead = leadOf(want);
      METRICS.forEach(function (m) {
        var row = card.rows[m] || {};
        var shown = shownAs(m, want[m].band);
        check(row.value === want[m].text, m + ' shows "' + want[m].text + '" (got "' + row.value + '")');
        check(row.band === want[m].band && row.chipBand === shown.band && row.chip === shown.chip && row.show === shown.show,
          m + ' band is ' + want[m].band + ' with the label "' + shown.chip + '" (got ' +
          row.band + ' / ' + row.chip + ')');
        check(want[m].band === spec.bands[m], m + ' lands in the ' + spec.bands[m] + ' band this history was built for');
        // The headline block speaks for the leading row, so that row prints no hint.
        var wantsHint = want[m].band !== 'green' && m !== lead;
        check(wantsHint === (row.hint !== ''),
          m + (want[m].band === 'green' ? ' has no hint when green'
            : (m === lead ? ' is the headline, so it prints no second hint' : ' carries a hint when ' + want[m].band)));
        check(row.meter && row.expanded === 'false', m + ' has a meter and starts closed');
      });
      check(lead === spec.lead && card.verdict.focus === lead && card.verdict.tone === spec.tone &&
        card.verdict.headline === spec.headline,
        'headline: "' + spec.headline + '" (got "' + card.verdict.headline + '", about ' + card.verdict.focus + ')');
      check(card.verdict.mark === (lead ? shownAs(lead, want[lead].band).band : 'green'),
        'the headline carries the band shape of the reading it is about (' + card.verdict.mark + ')');
      if (spec.actionIsPack) {
        var packId = (/^#\/practice\/pack\/(\d\d)$/.exec(card.verdict.href || '') || [])[1];
        var fresh = packId ? freshIn(packId, seed) : 0;
        check(!!packId && fresh > 0 && card.verdict.label === 'Start Set ' + packId + ' →',
          'the one button launches a pack that still has untried questions: ' + card.verdict.href + ', ' + fresh + ' untried');
        check(packId && card.verdict.detail.indexOf('Set ' + packId + ' · ' + PACKS[packId].title) >= 0 &&
          card.verdict.detail.indexOf(fresh + (lead ? ' you have not tried' : ' untried question')) >= 0,
          'the headline block names that pack and its ' + fresh + ' untried questions');
        check(card.verdict.primary === (spec.tone === 'attention'),
          spec.tone === 'attention' ? 'the button is the primary button when a reading needs attention'
            : 'the button is a quiet one when everything is on target');
        check(METRICS.every(function (m) { return card.rows[m].link !== card.verdict.href; }),
          'no row repeats the headline button');
      } else {
        check(card.verdict.href !== null ? !/\/practice\/pack\//.test(card.verdict.href) : true,
          'the headline does not ask for another pack (' + (card.verdict.href || 'no button') + ')');
      }
      var counts = { green: 0, amber: 0, red: 0, none: 0, rest: 0 };
      METRICS.forEach(function (m) { counts[shownAs(m, want[m].band).show]++; });
      var tallyWant = [[counts.green, 'on target'], [counts.amber, 'close'], [counts.red, 'off target'],
                       [counts.none, 'no data'], [counts.rest, 'without a target']]
        .filter(function (x) { return x[0]; }).map(function (x) { return x[0] + ' ' + x[1]; }).join(' ');
      check(card.tally === tallyWant, 'tally: "' + tallyWant + '" (got "' + card.tally + '")');
      check(card.tabindex0 === 0, 'no chart bar is a tab stop');
      check(JSON.stringify(card.trend.newQuestions) === JSON.stringify(want.trendNew),
        'new-question strip, oldest first: ' + JSON.stringify(want.trendNew) + ' (got ' + JSON.stringify(card.trend.newQuestions) + ')');
      check(JSON.stringify(card.trend.paceSec) === JSON.stringify(want.trendPace),
        'median-pace strip, oldest first: ' + JSON.stringify(want.trendPace) + ' (got ' + JSON.stringify(card.trend.paceSec) + ')');

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
      check(want.coverage.working7 === 5 && payload.coverage.workingDays7 === 5 &&
        JSON.stringify(payload.coverage.noPackWeekdays) === '[0,4]',
        'the last 7 days (' + dayAgo(6) + ' to ' + dayAgo(0) + ') hold Thursday ' + dayAgo(THU_AGO) +
        ' and one Sunday, so actual divides by 5 working days (got ' + payload.coverage.workingDays7 + ')');
      if (s === 0) {
        var so = want.coverage.sundayOnly;
        check(JSON.stringify(await ev('Array.prototype.slice.call(PGRE.intensity.NO_PACK_WEEKDAYS)')) === '[0,4]',
          'PGRE.intensity.NO_PACK_WEEKDAYS is [0, 4]: Sunday and Thursday');
        check(want.coverage.actual !== so.actual && payload.coverage.actual === want.coverage.actual,
          'Thursday changes actual: ' + want.coverage.new7 + ' new / 5 working days = ' + want.coverage.actual +
          ' (Sundays only: / 6 = ' + so.actual + ')');
        check(want.coverage.workingDaysLeft < so.workingDaysLeft && want.coverage.required !== so.required &&
          payload.coverage.required === want.coverage.required,
          'Thursdays change required: ' + want.coverage.remaining + ' / ' + want.coverage.workingDaysLeft +
          ' working days = ' + want.coverage.required + ' (Sundays only: / ' + so.workingDaysLeft + ' = ' + so.required + ')');

        /* Use the card: open a reading with the mouse, then with the keyboard. */
        console.log('\nopening a reading (history 1)');
        var covBefore = await panelOf('coverage');
        check(covBefore.expanded === 'false' && covBefore.hidden === true && covBefore.height === 0,
          'the coverage explanation is closed and takes no room at first');
        await clickOn(rowSel('coverage') + ' .intensity-toggle');
        var covOpen = await panelOf('coverage');
        check(covOpen.expanded === 'true' && covOpen.hidden === false && covOpen.height > 40,
          'a click on the Coverage row opens how it is computed');
        check(covOpen.text.indexOf(want.coverage.remaining + ' of ' + PACK_UNION.length + ' pack questions have no first try yet.') >= 0 &&
          covOpen.text.indexOf('Needed: ' + want.coverage.remaining + ' / ' + want.coverage.workingDaysLeft + ' = ' +
            want.coverage.required.toFixed(1) + ' new questions each working day.') >= 0 &&
          covOpen.text.indexOf('Last 7 days: ' + want.coverage.new7 + ' new questions over 5 working days = ' +
            want.coverage.actual.toFixed(1) + ' a day.') >= 0,
          'it shows both divisions: ' + want.coverage.remaining + ' / ' + want.coverage.workingDaysLeft + ' and ' +
          want.coverage.new7 + ' / 5');
        check(/with no timed pack on Sundays or Thursdays\./.test(covOpen.text),
          'it says there is no timed pack on Sundays or Thursdays');
        check(/On target at or above the needed rate Close up to 3 below it Off target more than 3 below it/.test(covOpen.text),
          'it lists the three bands and their limits');
        check(covOpen.links.indexOf('#/plan') >= 0, 'it links to the Study plan');
        var marks = await bandMarks();
        check(METRICS.every(function (m) {
          var judged = marks[m].show === 'green' || marks[m].show === 'amber' || marks[m].show === 'red';
          return judged ? marks[m].n === 1 && marks[m].same : marks[m].n === 0;
        }), 'in each reading the one band limit marked as current is the band on its chip; a reading without a band marks none');
        var daySay = await ev('Array.prototype.map.call(document.querySelectorAll("#intensity-card .iweek-day .ivh"),' +
          'function(e){return e.textContent;})');
        check(daySay.length === 7 && daySay.some(function (t) { return /median pace/.test(t); }) &&
          daySay.every(function (t) { return !/median pace/.test(t) || /median pace \d+ seconds \((on target|close|off target)\)\.$/.test(t); }),
          'each day\'s sentence for screen readers gives the pace band as a word, for example "' +
          (daySay.filter(function (t) { return /median pace/.test(t); })[0] || '') + '"');
        await clickOn(rowSel('newQuestions') + ' .intensity-toggle');
        var nqOpen = await panelOf('newQuestions');
        check(nqOpen.expanded === 'true' && (await panelOf('coverage')).expanded === 'true',
          'a second reading opens without closing the first');
        check(/15 or more Close 8 to 14 Off target under 8/.test(nqOpen.text) &&
          /Mistake-book retakes, the question of the day and mock exams do not count/.test(nqOpen.text),
          'New questions explains what counts and prints its limits: 15 or more, 8 to 14, under 8');
        await shotOf('#intensity-card', 'intensity-card-open.png');
        await clickOn(rowSel('newQuestions') + ' .intensity-toggle');
        await clickOn(rowSel('coverage') + ' .intensity-toggle');
        check((await panelOf('coverage')).hidden === true && (await panelOf('newQuestions')).hidden === true,
          'a second click closes each one again');
        await ev('document.querySelector(' + JSON.stringify(rowSel('paceSec') + ' .intensity-toggle') + ').focus(); true');
        await pressKey('Enter', 'Enter', 13);
        var paceOpen = await panelOf('paceSec');
        check(paceOpen.expanded === 'true' && /103 s or under Close 104 to 130 s Off target over 130 s/.test(paceOpen.text),
          'Enter on a focused reading opens it: pace limits 103, 104 to 130, over 130');
        await pressKey(' ', 'Space', 32);
        check((await panelOf('paceSec')).expanded === 'false', 'Space closes it');
        var tabOrder = await ev('(function(){var card=document.getElementById("intensity-card");' +
          'return Array.prototype.filter.call(card.querySelectorAll("a[href],button,summary"),function(e){' +
          'return e.offsetParent!==null && !e.closest("[hidden]") && !(e.closest("details:not([open])") && e.tagName!=="SUMMARY");})' +
          '.map(function(e){return e.tagName.toLowerCase()+(e.classList.contains("intensity-toggle")?":reading":"");});})()');
        check(tabOrder.filter(function (x) { return x === 'button:reading'; }).length === 5 && tabOrder.length <= 12,
          'the card has ' + tabOrder.length + ' tab stops: the five readings, the links and the topic table (it had 23, 14 of them chart bars)');

        /* The topic table: closed at first, and it remembers being opened. */
        var topicsOpen0 = await ev('document.getElementById("intensity-topics").open');
        await clickOn('#intensity-topics > summary');
        var topicsOpen1 = await ev('document.getElementById("intensity-topics").open');
        var savedOpen = await ev('JSON.parse(localStorage.getItem("pgre-state-v1")).settings.intensityTopicsOpen');
        check(topicsOpen0 === false && topicsOpen1 === true && savedOpen === true,
          'the 9-topic table opens on request and the choice is saved as settings.intensityTopicsOpen');
        var focusLine = await ev('document.querySelector("#intensity-adjust .intensity-focus").innerText.replace(/\\s+/g," ").trim()');
        check(/^Where to adjust Classical Mechanics Off target 50% on 10 new questions in 14 days, 20% of the exam\./.test(focusLine),
          'above the table one line names the topic to work on: Classical Mechanics, 50% on 10 (got "' + focusLine + '")');
        var focusHref = await ev('(function(){var a=document.querySelector("#intensity-adjust .intensity-focus a.btn");return a?a.getAttribute("href"):null;})()');
        check(focusHref === '#/practice/cm/new' || focusHref === '#/topic/cm',
          'with a link into that topic (' + focusHref + ')');
        await go(base + '/#/');
        await waitFor('!!document.getElementById("intensity-card")', 'the Intensity card after a reload');
        await sleep(300);
        check(await ev('document.getElementById("intensity-topics").open') === true, 'the table is still open after a reload');
        var stateKeys = await ev('Object.keys(JSON.parse(localStorage.getItem("pgre-state-v1")).settings).sort().join(",")');
        check(/(^|,)intensityTopicsOpen(,|$)/.test(stateKeys) && /(^|,)examDate(,|$)/.test(stateKeys) && /(^|,)paceTargetSec(,|$)/.test(stateKeys),
          'the new preference sits beside the existing settings, which are kept');
      }
      if (spec.thursdayNew) {
        check(spec.news.some(function (n) { return n[0] === THU_AGO; }) &&
          payload.coverage.actual === round1(want.coverage.new7 / 5),
          'a new question answered on Thursday ' + dayAgo(THU_AGO) + ' still counts: ' + want.coverage.new7 +
          ' new / 5 working days = ' + payload.coverage.actual);
      }
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
        // The topic table is open here (see above); open one reading too.
        await ev('document.querySelector(' + JSON.stringify(rowSel('coverage') + ' .intensity-toggle') + ').click(); true');
        await sleep(250);
        var tableFits = await ev('(function(){var c=document.getElementById("intensity-card").getBoundingClientRect();' +
          'var bad=[];document.querySelectorAll("#intensity-card .intensity-table td, #intensity-card .intensity-toggle > *, ' +
          '#intensity-card .intensity-next > *, #intensity-card .intensity-more > *, #intensity-card .intensity-verdict > *, ' +
          '#intensity-card .iweek-day, #intensity-card .iweek-day > *, #intensity-card .intensity-focus > *, #intensity-card .intensity-tally-item")' +
          '.forEach(function(el){if(el.classList.contains("ivh"))return;var r=el.getBoundingClientRect();' +
          'if(r.width&&(r.right>c.right-1||r.left<c.left+1))bad.push(el.className);});return bad;})()');
        check(tableFits.length === 0, 'at 375 px every row, strip cell, opened panel and table cell stays inside the card' +
          (tableFits.length ? ' (outside: ' + tableFits.join(', ') + ')' : ''));
        var overflow2 = await ev('document.documentElement.scrollWidth - window.innerWidth');
        check(overflow2 <= 0, 'with a reading and the table open the page still has no horizontal scroll (overflow ' + overflow2 + ' px)');
        var touch = await ev('(function(){var small=[];document.querySelectorAll("#intensity-card .intensity-toggle, ' +
          '#intensity-card a.btn, #intensity-card summary").forEach(function(el){if(el.closest("[hidden]"))return;' +
          'var r=el.getBoundingClientRect();if(r.height&&r.height<43.5)small.push(el.className+":"+Math.round(r.height));});return small;})()');
        check(touch.length === 0, 'on a touch screen every control in the card is at least 44 px tall' +
          (touch.length ? ' (short: ' + touch.join(', ') + ')' : ''));
        await shotOf('#intensity-card', 'intensity-card-phone.png');
        await ev('document.querySelector(' + JSON.stringify(rowSel('coverage') + ' .intensity-toggle') + ').click();' +
          'document.querySelector("#intensity-topics > summary").click(); true');
        await sleep(250);
        check(await ev('JSON.parse(localStorage.getItem("pgre-state-v1")).settings.intensityTopicsOpen') === false,
          'closing the table saves that too');
        await send('Emulation.clearDeviceMetricsOverride', {});
        await sleep(300);

        /* 900 px with the sidebar open: the card, not the window, is narrow. */
        var wide = await rowLayout();
        await send('Emulation.setDeviceMetricsOverride', { width: 900, height: 800, deviceScaleFactor: 1, mobile: false });
        await sleep(500);
        var mid = await rowLayout();
        check(wide.stacked === false && wide.clash === 0,
          'at the full window width the readings are one line each (card ' + wide.card + ' px)');
        check(mid.sidebar > 200 && mid.card < wide.card && mid.stacked === true && mid.clash === 0 && mid.overflow <= 0,
          'at 900 px with the ' + mid.sidebar + ' px sidebar open the card is ' + mid.card + ' px wide: the readings stack, ' +
          'no name runs into its meter and the page does not scroll sideways (clashes ' + mid.clash + ', overflow ' + mid.overflow + ' px)');
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
        /* Follow the summary's own link back to the dashboard. */
        var link = await ev('(function(){var a=document.querySelector(".intensity-summary-link");' +
          'return {href:a.getAttribute("href"),focus:a.getAttribute("data-dash-focus")};})()');
        check(link.href === '#/' && link.focus === 'intensity-card', 'the summary link points at the Intensity card');
        await clickOn('.intensity-summary-link');
        await waitFor('!!document.getElementById("intensity-card")', 'the Intensity card after the pack');
        await sleep(900);
        var landed = await ev('(function(){var r=document.getElementById("intensity-card").getBoundingClientRect();' +
          'var bar=document.getElementById("topbar").getBoundingClientRect();var a=document.activeElement;' +
          'return {top:Math.round(r.top),bar:Math.round(bar.bottom),scrollY:Math.round(window.scrollY),focus:a&&a.id,' +
          'flag:sessionStorage.getItem("pgre-dash-focus")};})()');
        check(landed.scrollY > 200 && landed.top >= landed.bar && landed.top <= landed.bar + 40,
          'the link lands on the card, just under the top bar (card top ' + landed.top + ' px, bar ends ' + landed.bar +
          ' px, page scrolled ' + landed.scrollY + ' px; it used to land on the top of the page)');
        check(landed.focus === 'intensity-title' && landed.flag === null,
          'keyboard focus moves to the card heading, and the one-shot note is cleared');
        var card2 = await readCard();
        check(card2.rows.newQuestions.value === newText(newAfter) &&
          card2.rows.paceSec.value === paceAfter + ' s target 103 s or under',
          'the dashboard agrees with the summary and the payload after the pack');
        var paceDelta = paceAfter - want.paceSec.value;
        check(card2.rows.newQuestions.delta === '+' + sat &&
          card2.rows.paceSec.delta === (paceDelta ? (paceDelta > 0 ? '+' : '−') + Math.abs(paceDelta) + ' s' : ''),
          'each reading shows what the pack changed: new questions +' + sat + ', pace ' +
          (paceDelta ? (paceDelta > 0 ? '+' : '−') + Math.abs(paceDelta) + ' s' : 'unchanged') +
          ' (got "' + card2.rows.newQuestions.delta + '", "' + card2.rows.paceSec.delta + '")');
        check(card2.rows.repeatMinutes.delta === '', 'a reading the pack did not move shows no change');
        await shotOf('#intensity-card', 'intensity-card-after-pack.png', rowSel('coverage'));
        await ev('location.hash = "#/plan"; true');
        await waitFor('!document.getElementById("intensity-card")', 'another page');
        await ev('location.hash = "#/"; true');
        await waitFor('!!document.getElementById("intensity-card")', 'the dashboard again');
        await sleep(400);
        var card3 = await readCard();
        check(METRICS.every(function (m) { return card3.rows[m].delta === ''; }) &&
          await ev('window.scrollY') === 0,
          'the next visit opens at the top of the page with no change markers');

        /* A sibling tab records two more new questions; this tab repaints the
           card in place and keeps the opened reading and the focus. */
        await ev('(function(){var b=document.querySelector(' + JSON.stringify(rowSel('coverage') + ' .intensity-toggle') + ');' +
          'b.click();b.focus();return true;})()');
        var siblingSave = function (n) {
          return ev('(function(){var raw=localStorage.getItem("pgre-state-v1");var st=JSON.parse(raw);var tried={};' +
            'st.attempts.forEach(function(a){tried[a.qid]=1;});var ids=[];Object.keys(PGRE.PACKS).sort().forEach(function(k){' +
            'PGRE.PACKS[k].ids.forEach(function(id){if(!tried[id]&&ids.indexOf(id)<0)ids.push(id);});});' +
            'ids.slice(0,' + n + ').forEach(function(id,i){st.attempts.push({ts:new Date(window.__pgreRealNow.call(Date)-i*1000).toISOString(),' +
            'qid:id,topic:"cm",picked:0,answer:0,correct:true,ms:120000,sid:"sibling",mode:"practice",confidence:null,tags:[]});});' +
            'st._rev=(st._rev||0)+3;var next=JSON.stringify(st);localStorage.setItem("pgre-state-v1",next);' +
            'window.dispatchEvent(new StorageEvent("storage",{key:"pgre-state-v1",oldValue:raw,newValue:next,' +
            'storageArea:localStorage,url:location.href}));return true;})()');
        };
        await siblingSave(2);
        await sleep(700);
        var card4 = await readCard();
        var keptFocus = await ev('(function(){var a=document.activeElement;var r=a&&a.closest&&a.closest(".intensity-row");' +
          'return r?r.getAttribute("data-metric"):null;})()');
        check(card4.rows.newQuestions.value === newText(newAfter + 2) && card4.rows.newQuestions.delta === '+2',
          'after a sibling tab saves 2 new questions the card reads ' + (newAfter + 2) + ' with "+2", without a reload (got "' +
          card4.rows.newQuestions.value + '", "' + card4.rows.newQuestions.delta + '")');
        check(card4.rows.coverage.expanded === 'true' && keptFocus === 'coverage',
          'the opened reading stays open and keeps the keyboard focus through that repaint');
        // Focus on a control that is not a reading: the topic disclosure, then a link in the opened panel.
        await ev('document.querySelector("#intensity-topics > summary").focus(); true');
        await siblingSave(1);
        await sleep(700);
        var card4b = await readCard();
        var keptTag = await ev('document.activeElement ? document.activeElement.tagName : null');
        check(card4b.rows.newQuestions.value === newText(newAfter + 3) && keptTag === 'SUMMARY',
          'focus on the topic disclosure survives a repaint too (now on ' + keptTag + ')');
        await ev('document.querySelector(' + JSON.stringify(rowSel('coverage') + ' .intensity-links a[href="#/plan"]') + ').focus(); true');
        await siblingSave(1);
        await sleep(700);
        var keptLink = await ev('(function(){var a=document.activeElement;return a&&a.closest("#intensity-card")?' +
          'a.tagName+" "+a.getAttribute("href"):(a?a.tagName:null);})()');
        check(keptLink === 'A #/plan', 'and so does focus on a link inside an opened reading (now on ' + keptLink + ')');
        await ev('Date.now = window.__pgreRealNow; true');

        /* The tab stays open past midnight: coming back to the window
           repaints the card for the new day. (The focus event is used here
           because a headless page may report itself hidden.) */
        await ev('(' + clockShim.toString() + ')(86400000); window.dispatchEvent(new Event("focus")); true');
        await sleep(600);
        var card5 = await readCard();
        var kicker = await ev('document.querySelector("#intensity-card .kicker").innerText');
        var tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
        var tomorrowLine = tomorrow.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase();
        check(kicker.toUpperCase() === tomorrowLine && /^0 /.test(card5.rows.newQuestions.value) &&
          card5.rows.paceSec.value === '— target 103 s or under',
          'after midnight the card shows the new day (' + kicker + ') with 0 new questions and no pace, without a reload');
      }

      check(pageErrors.length === 0, 'no page errors' + (pageErrors.length ? ': ' + pageErrors.join(' | ') : ''));
      check(bridge.answered === 0, 'the status bridge on port ' + BRIDGE_PORT + ' received nothing (' + bridge.sent +
        ' request(s) blocked, ' + bridge.answered + ' answered)');
    }

    /* ——— A new user: nothing answered yet ——— */
    console.log('\nnew user (no answers)');
    pageErrors.length = 0;
    await seedAndOpen(buildSeed({ n: 8, news: [], examDate: dayAhead(EXAM_AHEAD) }));
    var fresh0 = await readCard();
    check(fresh0.empty === true && fresh0.verdict.tone === 'empty' && fresh0.verdict.headline === 'Nothing measured yet.',
      'the card says "Nothing measured yet."');
    check(/^#\/practice\/pack\/\d\d$/.test(fresh0.verdict.href || '') && fresh0.verdict.primary === true,
      'its one button starts the first timed pack (' + fresh0.verdict.href + ')');
    check(METRICS.every(function (m) { return fresh0.rows[m].chip === null && fresh0.rows[m].meter === false &&
      fresh0.rows[m].value === '' && fresh0.rows[m].hint === ''; }),
      'no reading is judged: no band chip, no meter, no value and no hint (it used to open with two red chips)');
    var needAll = round1(PACK_UNION.length / workingDays(dayAgo(0), dayAhead(EXAM_AHEAD - 3)));
    check(fresh0.rows.newQuestions.preview === 'target 15 a day' && fresh0.rows.paceSec.preview === 'target 103 s or under' &&
      fresh0.rows.firstAttemptAccuracy.preview === 'target 75% or more' && fresh0.rows.repeatMinutes.preview === 'limit 20 min' &&
      fresh0.rows.coverage.preview === PACK_UNION.length + ' pack questions by ' +
        new Date(dayAhead(EXAM_AHEAD - 3) + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
        ': ' + needAll.toFixed(1) + ' each working day',
      'each row shows its target instead: 15 a day, 103 s or under, 75% or more, 20 min, and ' + needAll.toFixed(1) +
      ' a working day for all ' + PACK_UNION.length + ' pack questions (got "' + fresh0.rows.coverage.preview + '")');
    check(fresh0.week === false && fresh0.adjust === false && fresh0.tally === '',
      'the 7-day strip, the topic table and the tally wait for the first answers');
    await clickOn(rowSel('repeatMinutes') + ' .intensity-toggle');
    var repOpen = await panelOf('repeatMinutes');
    check(repOpen.expanded === 'true' && /20 min or under Close 21 to 40 min Off target over 40 min/.test(repOpen.text),
      'a reading still opens to explain itself');
    var freshMarks = await bandMarks();
    check(METRICS.every(function (m) { return freshMarks[m].n === 0; }),
      'and marks none of its three band limits as the current one');
    await shotOf('#intensity-card', 'intensity-card-new-user.png');
    var emptyPayload = await ev('PGRE.buildStatusSummary().intensity');
    check(emptyPayload.newQuestions.band === 'red' && emptyPayload.newQuestions.value === 0 && emptyPayload.paceSec.band === null,
      'the status payload is unchanged by this: it still reports 0 new questions as red');
    check(pageErrors.length === 0, 'no page errors' + (pageErrors.length ? ': ' + pageErrors.join(' | ') : ''));

    /* ——— A no-pack Sunday: the page clock is moved to the next Sunday ——— */
    console.log('\nno-pack Sunday (page clock +' + DAYS_TO_SUNDAY + ' days)');
    pageErrors.length = 0;
    DAY_SHIFT = DAYS_TO_SUNDAY;
    var shim = await send('Page.addScriptToEvaluateOnNewDocument',
      { source: '(' + clockShim.toString() + ')(' + (DAYS_TO_SUNDAY * 86400000) + ');' });
    var sunSpec = {
      n: 9, examAhead: EXAM_AHEAD, examDate: dayAhead(EXAM_AHEAD), bulk: 270,
      news: (function () {
        var out = [];
        [1, 2, 4, 5].forEach(function (k) { for (var i = 0; i < 16; i++) out.push([k, ['cm', 'em', 'qm', 'th'][i % 4], i < 14, 95]); });
        return out;
      }())
    };
    var sunSeed = buildSeed(sunSpec);
    var sunWant = expectFor(sunSpec, sunSeed);
    await seedAndOpen(sunSeed);
    var sun = await readCard();
    var pageDay = await ev('new Date().getDay()');
    check(pageDay === 0 && sunWant.newQuestions.value === 0 && sunWant.newQuestions.band === 'red',
      'the page clock reads Sunday, and the history has no new question on it');
    check(sun.rows.newQuestions.band === 'red' && sun.rows.newQuestions.show === 'rest' &&
      sun.rows.newQuestions.chip === 'No pack today' && sun.rows.newQuestions.chipBand === 'none' &&
      sun.rows.newQuestions.value === '0 no target today',
      'New questions reads "0, no target today" with the chip "No pack today", not "Off target" (got "' +
      sun.rows.newQuestions.value + '" / ' + sun.rows.newQuestions.chip + ')');
    check(sun.verdict.tone === 'rest' && sun.verdict.headline === 'No timed pack today.' &&
      /^Sunday is the full-sitting day/.test(sun.verdict.detail) && sun.verdict.href === '#/exam' && sun.verdict.primary === false,
      'headline: "No timed pack today." with a quiet link to the mock exam (it used to say "Answer 15 more new questions ... Start the next pack.")');
    check(sun.rows.coverage.band === 'green' && sun.rows.firstAttemptAccuracy.band === 'green' &&
      sun.tally === '3 on target 1 no data 1 without a target',
      'the other readings are judged as on any day; tally "3 on target 1 no data 1 without a target" (got "' + sun.tally + '")');
    var strip = await ev('Array.prototype.map.call(document.querySelectorAll("#intensity-card .iweek-day"),function(c){' +
      'return (c.classList.contains("is-rest")?"rest":"pack")+":"+c.querySelector(".iweek-pace").textContent.trim();}).join(" ")');
    check(strip === 'pack:— pack:95 s pack:95 s rest:no pack pack:95 s pack:95 s rest:no pack',
      'the 7-day strip marks Thursday and Sunday as "no pack", apart from a pack day with nothing answered (got "' + strip + '")');
    var sunMarks = await bandMarks();
    var sunPackLinks = await ev('document.querySelectorAll(\'#intensity-card a[href^="#/practice/pack/"]\').length');
    check(sunMarks.newQuestions.n === 0 && sunMarks.coverage.n === 1 && sunMarks.coverage.same && sunPackLinks === 0,
      'the New questions row marks no band limit as current, and no link on the card starts a timed pack (' +
      sunPackLinks + ' pack links)');
    var sunPayload = await ev('PGRE.buildStatusSummary().intensity.newQuestions');
    check(sunPayload.value === 0 && sunPayload.threshold === 15 && sunPayload.band === 'red',
      'PGRE.intensity.compute() and the status payload still report 0 of 15, red: only the card wording differs');
    await shotOf('#intensity-card', 'intensity-card-no-pack-day.png');
    await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: shim.identifier });
    DAY_SHIFT = 0;
    check(pageErrors.length === 0, 'no page errors' + (pageErrors.length ? ': ' + pageErrors.join(' | ') : ''));
    check(bridge.answered === 0, 'the status bridge on port ' + BRIDGE_PORT + ' received nothing (' + bridge.sent +
      ' request(s) blocked, ' + bridge.answered + ' answered)');
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
