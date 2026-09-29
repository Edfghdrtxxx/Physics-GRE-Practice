#!/usr/bin/env node
/* Headless Chrome: after a practice answer, the stem must scroll back into
   .practice-scroll. The unanswered question stays at the scroll it loaded with.
   Isolated profile + ephemeral ports. Run: node tools/test-practice-scroll-stem-chrome.js
   Override PGRE_TEST_PORT / PGRE_CDP_PORT. */
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
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json'
};

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

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
  return null;
}

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
      setTimeout(finish, 1000);
    }, 5000);
    proc.once('exit', finish);
    try { proc.kill(); } catch (e) { finish(); }
  });
}

var server = http.createServer(function (req, res) {
  var reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  var filePath = path.join(ROOT, decodeURIComponent(reqPath));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); res.end('forbidden'); return;
  }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    var ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not found: ' + reqPath);
  }
});

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  var chromeBin = findChrome();
  if (!chromeBin) {
    console.error('LAUNCHER_UNAVAILABLE: Chrome binary not found');
    process.exit(2);
  }

  await new Promise(function (r) { server.listen(PORT, '127.0.0.1', r); });
  var httpPort = server.address().port;
  var cdpPort = CDP_PORT || await freePort();
  console.log('HTTP http://127.0.0.1:' + httpPort + '  CDP ' + cdpPort);

  var userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pgre-scroll-stem-chrome-'));
  var chrome = spawn(chromeBin, [
    '--headless=new',
    '--remote-debugging-port=' + cdpPort,
    '--user-data-dir=' + userDataDir,
    '--no-first-run',
    '--window-size=1280,900',
    'http://127.0.0.1:' + httpPort + '/'
  ], { stdio: 'ignore' });

  var ws = null;
  try {
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

    await send('Runtime.enable', {});
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1280, height: 900, deviceScaleFactor: 1, mobile: false
    });

    for (var w = 0; w < 50; w++) {
      var ready = await evaluate("typeof PGRE !== 'undefined' && typeof PGRE.questionById === 'function' && typeof PGRE._resetBankCache === 'function'");
      if (ready) break;
      await sleep(100);
    }
    if (!await evaluate("typeof PGRE !== 'undefined' && typeof PGRE._resetBankCache === 'function'")) {
      throw new Error('PGRE bank not ready');
    }

    var opened = await evaluate(`(function () {
      PGRE.QUESTIONS.push({
        id: 'scroll-stem-probe',
        topic: 'em',
        difficulty: 2,
        q: '<p>A loop antenna carries an alternating current. Both the amplitude and the frequency of that current are doubled. By what factor does the radiated power increase?</p>',
        choices: ['4', '8', '16', '32', '64'],
        answer: 4,
        sol: '<p>Radiated power grows with the fourth power of frequency and the square of amplitude. Doubling both multiplies the power by $2^{6} = 64$.</p>'
      });
      PGRE._resetBankCache();
      try { sessionStorage.removeItem('pgre-practice-session'); } catch (e) {}
      sessionStorage.setItem('pgre-quiz-config', JSON.stringify({
        ids: ['scroll-stem-probe'],
        label: 'Similar problem · Radiation',
        purpose: 'similar'
      }));
      location.hash = '#/practice/custom';
      return location.hash;
    })()`);
    assert(opened === '#/practice/custom', 'hash ' + opened);

    var unanswered = null;
    for (var t = 0; t < 40; t++) {
      unanswered = await evaluate(`(function () {
        var sc = document.querySelector('.practice-scroll');
        var qt = document.querySelector('.practice-scroll > .q-text');
        if (!sc || !qt) return null;
        var sr = sc.getBoundingClientRect();
        var qr = qt.getBoundingClientRect();
        var overlap = Math.min(qr.bottom, sr.bottom) - Math.max(qr.top, sr.top);
        return {
          innerWidth: window.innerWidth,
          scrollTop: sc.scrollTop,
          winY: window.scrollY,
          clientHeight: qt.clientHeight,
          scrollHeight: qt.scrollHeight,
          overlap: overlap,
          text: (qt.innerText || '').slice(0, 80)
        };
      })()`);
      if (unanswered && /loop antenna/.test(unanswered.text)) break;
      await sleep(100);
    }
    assert(unanswered && /loop antenna/.test(unanswered.text),
      'unanswered stem missing: ' + JSON.stringify(unanswered));
    assert(unanswered.innerWidth >= 901, 'viewport below the practice grid: ' + unanswered.innerWidth);
    assert(unanswered.scrollTop === 0 && unanswered.winY === 0,
      'unanswered scroll moved: ' + JSON.stringify(unanswered));
    assert(unanswered.clientHeight > 40 && unanswered.overlap >= unanswered.clientHeight - 1,
      'unanswered stem not in view: ' + JSON.stringify(unanswered));
    console.log('unanswered scrollTop=' + unanswered.scrollTop +
      ' stem=' + Math.round(unanswered.clientHeight) + 'px in view');

    var answered = await evaluate(`(function () {
      var b = document.querySelector('.choice[data-idx="4"]');
      if (!b) return { error: 'no choice' };
      b.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      b.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
      var confirmBtn = document.getElementById('confirm-btn');
      if (!confirmBtn || confirmBtn.disabled) return { error: 'confirm not ready' };
      confirmBtn.click();
      var sc = document.querySelector('.practice-scroll');
      var qt = document.querySelector('.practice-scroll > .q-text');
      var sol = document.querySelector('.solution');
      if (!sc || !qt || !sol) return { error: 'finished markup missing' };
      sc.scrollTop = sc.scrollHeight;
      var delta = qt.getBoundingClientRect().top - sc.getBoundingClientRect().top;
      sc.scrollTop = sc.scrollTop + delta;
      var sr = sc.getBoundingClientRect();
      var qr = qt.getBoundingClientRect();
      var overlap = Math.min(qr.bottom, sr.bottom) - Math.max(qr.top, sr.top);
      return {
        clientHeight: qt.clientHeight,
        scrollHeight: qt.scrollHeight,
        boxHeight: qr.height,
        overlap: overlap,
        scrollTop: sc.scrollTop,
        maxScroll: sc.scrollHeight - sc.clientHeight,
        hasSolution: /64/.test(sol.innerText || '')
      };
    })()`);
    console.log('finished ' + JSON.stringify(answered));
    assert(answered && !answered.error, 'answer failed: ' + JSON.stringify(answered));
    assert(answered.hasSolution, 'solution not shown');
    assert(answered.maxScroll > 0, 'finished view did not overflow the scrollport');
    assert(answered.clientHeight > 40 && answered.boxHeight > 40,
      'finished stem box collapsed: ' + JSON.stringify(answered));
    assert(answered.overlap >= Math.min(answered.boxHeight, 80) - 1,
      'scrolling up did not bring the stem into view: ' + JSON.stringify(answered));
    console.log('finished stem scrolls into view, overlap=' + Math.round(answered.overlap));
  } finally {
    if (ws) try { ws.close(); } catch (e) {}
    await stopChrome(chrome);
    server.close();
    try { fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } catch (e2) {}
  }
}

main().catch(function (err) {
  console.error('Error during practice scroll-stem test:', err && err.stack || err);
  process.exit(1);
});
