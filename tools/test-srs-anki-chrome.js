#!/usr/bin/env node
/* Headless Chrome check: Anki SM-2 grade buttons + exam-cap toggle.
   Run: node tools/test-srs-anki-chrome.js
   Isolated profile + ephemeral ports (override with PGRE_TEST_PORT /
   PGRE_CDP_PORT) so it never touches the user's browser or pinned services. */
'use strict';

var http = require('http');
var fs = require('fs');
var path = require('path');
var os = require('os');
var net = require('net');
var { spawn } = require('child_process');

var PORT = parseInt(process.env.PGRE_TEST_PORT || '0', 10);
var CDP_PORT = parseInt(process.env.PGRE_CDP_PORT || '0', 10);
var ROOT = path.resolve(__dirname, '..');
var MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

function freePort() {
  return new Promise(function (resolve, reject) {
    var srv = net.createServer();
    srv.listen(0, '127.0.0.1', function () {
      var p = srv.address().port;
      srv.close(function () { resolve(p); });
    });
    srv.on('error', reject);
  });
}

function findChrome() {
  var candidates = [
    process.env.CHROME_BIN,
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ].filter(Boolean);
  for (var i = 0; i < candidates.length; i++) {
    try { fs.accessSync(candidates[i], fs.constants.X_OK); return candidates[i]; } catch (e) {}
  }
  return candidates[0]; // let spawn fail with a clear error
}

var server = http.createServer(function (req, res) {
  var reqPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  var filePath = path.join(ROOT, reqPath);
  if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404); res.end('not found'); return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

// SIGTERM Chrome, wait (bounded) for it to exit so its profile dir is
// released before we rm it; escalate to SIGKILL if it hangs.
function stopChrome(proc) {
  return new Promise(function (resolve) {
    if (!proc || proc.exitCode !== null || proc.signalCode !== null) return resolve();
    var settled = false;
    var finish = function () {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };
    var timer = setTimeout(function () {
      try { proc.kill('SIGKILL'); } catch (e) {}
      setTimeout(finish, 1000); // SIGKILL is uncatchable; brief grace then move on
    }, 5000);
    proc.once('exit', finish);
    try { proc.kill(); } catch (e) { finish(); }
  });
}

async function main() {
  await new Promise(function (r) { server.listen(PORT, '127.0.0.1', r); });
  var httpPort = server.address().port;
  var cdpPort = CDP_PORT || await freePort();
  var userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pgre-srs-anki-'));
  var chrome = null;
  var ws = null;
  try {
  chrome = spawn(findChrome(), [
    '--headless=new',
    '--remote-debugging-port=' + cdpPort,
    '--user-data-dir=' + userDataDir,
    '--no-first-run',
    '--window-size=1280,900',
    'http://127.0.0.1:' + httpPort + '/'
  ], { stdio: 'ignore' });

  var wsUrl = null;
  for (var i = 0; i < 40; i++) {
    await sleep(200);
    try {
      var list = await (await fetch('http://127.0.0.1:' + cdpPort + '/json/list')).json();
      var page = list.find(function (t) { return t.type === 'page'; });
      if (page && page.webSocketDebuggerUrl) { wsUrl = page.webSocketDebuggerUrl; break; }
    } catch (e) { /* chrome not up yet */ }
  }
  if (!wsUrl) throw new Error('no CDP page target');

  ws = new WebSocket(wsUrl);
  var idSeq = 1;
  var pending = new Map();
  ws.onmessage = function (ev) {
    var msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      var p = pending.get(msg.id); pending.delete(msg.id);
      if (msg.error) p.reject(msg.error); else p.resolve(msg.result);
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
  async function evaluate(expression) {
    var res = await send('Runtime.evaluate', {
      expression: expression, returnByValue: true, awaitPromise: true
    });
    if (res.exceptionDetails) throw new Error(JSON.stringify(res.exceptionDetails));
    return res.result.value;
  }

  for (var w = 0; w < 40; w++) {
    var ready = await evaluate("typeof PGRE !== 'undefined' && !!(PGRE.srs && PGRE.store && PGRE.contentDB)");
    if (ready) break;
    await sleep(100);
  }

  var seeded = await evaluate(`(async function () {
    PGRE.BOOK_FORMULAS = [];
    PGRE.FORMULAS = [];
    await PGRE.contentDB.put({
      id: 'formula-deck', kind: 'formula-deck',
      cards: [{ id: 'srs-test-1', topic: 'cm', name: 'Test card',
                front: 'front prompt', back: '$E = mc^2$', note: '' }]
    });
    var s = PGRE.store.state;
    s.settings.formulaExamCap = true;
    s.settings.formulaDailyTarget = 1;
    var d = new Date(); d.setDate(d.getDate() + 14);
    s.settings.examDate = PGRE.srs.dayStr(d);
    s.cards['srs-test-1'] = {
      reps: 1, lapses: 0, interval: 10, ease: 2.5,
      due: PGRE.srs.today(), reviews: 1
    };
    s.formulaDay = null;
    s.formulaStudy = null;
    PGRE.store.save();
    return { cap: PGRE.srs.examCap(), iv: PGRE.srs.nextIntervals(s.cards['srs-test-1']) };
  })()`);
  if (seeded.cap !== 13) throw new Error('expected cap 13, got ' + seeded.cap);
  if (!(seeded.iv.hard <= seeded.iv.good && seeded.iv.good <= seeded.iv.easy)) {
    throw new Error('scheduler inversion in nextIntervals: ' + JSON.stringify(seeded.iv));
  }

  await evaluate("location.hash = '#/formulas'");
  await sleep(800);
  var homeReady = false;
  for (var h = 0; h < 30; h++) {
    homeReady = await evaluate("!!document.getElementById('exam-cap-toggle') || !!document.getElementById('study-btn')");
    if (homeReady) break;
    await sleep(150);
  }
  var diag = await evaluate(`({
    hash: location.hash,
    toggle: !!(document.getElementById('exam-cap-toggle')),
    examDate: !!(document.getElementById('exam-date')),
    study: (document.getElementById('study-btn') || {}).textContent || null,
    bodyStart: (document.getElementById('formulas-root') || document.body).innerText.slice(0, 400),
    deckN: (window.PGRE && PGRE.store) ? 'store-ok' : 'no-store'
  })`);
  if (!diag.examDate) throw new Error('exam date input missing ' + JSON.stringify(diag));

  var homeUi = await evaluate(`({
    toggle: (document.getElementById('exam-cap-toggle') || {}).textContent,
    examDate: !!document.getElementById('exam-date'),
    study: (document.getElementById('study-btn') || {}).textContent
  })`);
  if (!homeUi.examDate) throw new Error('exam date input missing');
  if (homeUi.toggle !== 'Capped to exam day') {
    throw new Error('toggle default text: ' + JSON.stringify(homeUi.toggle));
  }
  if (!homeUi.study) throw new Error('Study button missing (card not in today batch?) ' + JSON.stringify(homeUi));

  await evaluate("document.getElementById('exam-cap-toggle').click()");
  await sleep(400);
  var toggled = await evaluate(`({
    toggle: (document.getElementById('exam-cap-toggle') || {}).textContent,
    capOn: PGRE.store.state.settings.formulaExamCap
  })`);
  if (toggled.capOn !== false) throw new Error('toggle did not turn cap off');
  if (toggled.toggle !== 'Classic Anki (uncapped)') {
    throw new Error('toggle off text: ' + JSON.stringify(toggled.toggle));
  }
  await evaluate("document.getElementById('exam-cap-toggle').click()");
  await sleep(400);
  var retoggled = await evaluate("PGRE.store.state.settings.formulaExamCap");
  if (retoggled !== true) throw new Error('toggle did not restore cap on');

  await evaluate("document.getElementById('study-btn').click()");
  await sleep(300);
  await evaluate("document.getElementById('flip-btn') && document.getElementById('flip-btn').click()");
  await sleep(200);

  var grades = await evaluate(`(function () {
    var btns = Array.prototype.slice.call(document.querySelectorAll('[data-grade]'));
    return btns.map(function (b) {
      var ivl = b.querySelector('.grade-ivl');
      return { grade: b.getAttribute('data-grade'), ivl: ivl ? ivl.textContent : '',
               text: b.textContent };
    });
  })()`);
  var keys = grades.map(function (g) { return g.grade; });
  if (keys.join(',') !== 'again,hard,good,easy') {
    throw new Error('expected four Anki grades, got ' + JSON.stringify(keys));
  }
  var by = {};
  grades.forEach(function (g) { by[g.grade] = g.ivl; });
  if (by.good === '3 d') throw new Error('Good still hardcoded to 3 d: ' + JSON.stringify(by));
  function days(lbl) {
    if (lbl === 'today') return 0;
    var m = /^(\d+)\s*d$/.exec(lbl);
    return m ? +m[1] : NaN;
  }
  if (!(days(by.hard) <= days(by.good) && days(by.good) <= days(by.easy))) {
    throw new Error('button inversion: ' + JSON.stringify(by));
  }
  if (days(by.hard) !== 11 || days(by.good) !== 12 || days(by.easy) !== 13) {
    throw new Error('expected Hard 11 / Good 12 / Easy 13 under cap, got ' + JSON.stringify(by));
  }

  await evaluate(`(function () {
    PGRE.store.state.formulaStudy = null;
    PGRE.store.state.cards['srs-test-1'] = {
      reps: 1, lapses: 0, interval: 1, ease: 2.5,
      due: PGRE.srs.today(), reviews: 1
    };
    PGRE.store.state.settings.formulaExamCap = false;
    PGRE.store.state.formulaDay = null;
    PGRE.store.save();
    location.hash = '#/';
    PGRE.route();
  })()`);
  await sleep(300);
  await evaluate("location.hash = '#/formulas'");
  await sleep(500);
  for (var y = 0; y < 20; y++) {
    if (await evaluate("!!document.getElementById('study-btn')")) break;
    await sleep(150);
  }
  await evaluate("document.getElementById('study-btn').click()");
  await sleep(300);
  await evaluate("document.getElementById('flip-btn') && document.getElementById('flip-btn').click()");
  await sleep(200);
  var youngBtns = await evaluate(`(function () {
    var by = {};
    Array.prototype.slice.call(document.querySelectorAll('[data-grade]')).forEach(function (b) {
      var ivl = b.querySelector('.grade-ivl');
      by[b.getAttribute('data-grade')] = ivl ? ivl.textContent : '';
    });
    return by;
  })()`);
  if (youngBtns.hard !== '2 d' || youngBtns.good !== '3 d' || youngBtns.easy !== '4 d') {
    throw new Error('young review should be Hard 2 d / Good 3 d / Easy 4 d, got ' + JSON.stringify(youngBtns));
  }

  await evaluate(`(async function () {
    PGRE.store.state.formulaStudy = null;
    delete PGRE.store.state.cards['srs-test-1'];
    PGRE.store.state.formulaDay = null;
    PGRE.store.save();
    location.hash = '#/';
    PGRE.route();
  })()`);
  await sleep(300);
  await evaluate("location.hash = '#/formulas'");
  await sleep(500);
  for (var n = 0; n < 20; n++) {
    if (await evaluate("!!document.getElementById('study-btn')")) break;
    await sleep(150);
  }
  await evaluate("document.getElementById('study-btn').click()");
  await sleep(300);
  await evaluate("document.getElementById('flip-btn') && document.getElementById('flip-btn').click()");
  await sleep(200);
  var fresh = await evaluate(`(function () {
    var btns = Array.prototype.slice.call(document.querySelectorAll('[data-grade]'));
    return btns.map(function (b) {
      var ivl = b.querySelector('.grade-ivl');
      return { grade: b.getAttribute('data-grade'), ivl: ivl ? ivl.textContent : '' };
    });
  })()`);
  var fby = {};
  fresh.forEach(function (g) { fby[g.grade] = g.ivl; });
  if (fby.hard !== 'soon' || fby.good !== 'soon') {
    throw new Error('new-card Hard/Good should be soon, got ' + JSON.stringify(fby));
  }
  if (fby.easy !== '4 d') {
    throw new Error('new-card Easy should be 4 d, got ' + JSON.stringify(fby));
  }

  await evaluate("PGRE.contentDB.del('formula-deck')");
  console.log('PASS — four Anki grades, no Mastered, screenshot inversion gone, Easy 4 d, young Hard 2 d, cap toggle works');
  console.log('  review (cap 13):', by);
  console.log('  young review (uncapped):', youngBtns);
  console.log('  new card:', fby);
  } finally {
    try { if (ws) ws.close(); } catch (e) {}
    try { await stopChrome(chrome); } catch (e) {}
    try { server.close(); } catch (e) {}
    try { fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } catch (e) {}
  }
}

main().catch(function (err) {
  console.error('FAIL', err);
  process.exit(1);
});
