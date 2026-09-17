#!/usr/bin/env node
/* Headless Chrome: PGRE.launchPack → #/practice/custom shows Question 1 of n.
   Isolated profile + ephemeral ports. Run: node tools/test-pack-launch-chrome.js
   Override PGRE_TEST_PORT / PGRE_CDP_PORT / PGRE_ARTIFACT_DIR. */
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
var ARTIFACT_DIR = process.env.PGRE_ARTIFACT_DIR ||
  fs.mkdtempSync(path.join(os.tmpdir(), 'pgre-pack-launch-'));
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

async function main() {
  var chromeBin = findChrome();
  if (!chromeBin) {
    console.error('LAUNCHER_UNAVAILABLE: Chrome binary not found');
    process.exit(2);
  }
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  await new Promise(function (r) { server.listen(PORT, '127.0.0.1', r); });
  var httpPort = server.address().port;
  var cdpPort = CDP_PORT || await freePort();
  console.log('HTTP http://127.0.0.1:' + httpPort + '  CDP ' + cdpPort);

  var userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pgre-pack-launch-chrome-'));
  var chrome = spawn(chromeBin, [
    '--headless=new',
    '--remote-debugging-port=' + cdpPort,
    '--user-data-dir=' + userDataDir,
    '--no-first-run',
    '--window-size=1280,900',
    'http://127.0.0.1:' + httpPort + '/'
  ], { stdio: 'ignore' });

  var pageErrors = [];
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
      if (msg.method === 'Runtime.exceptionThrown') {
        var d = msg.params && msg.params.exceptionDetails;
        pageErrors.push((d && d.text) || JSON.stringify(d));
      }
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

    for (var w = 0; w < 50; w++) {
      var ready = await evaluate("typeof PGRE !== 'undefined' && typeof PGRE.launchPack === 'function' && !!(PGRE.PACKS && PGRE.PACKS['03'])");
      if (ready) break;
      await sleep(100);
    }
    var boot = await evaluate("typeof PGRE !== 'undefined' && typeof PGRE.launchPack === 'function' && !!(PGRE.PACKS && PGRE.PACKS['03'])");
    if (!boot) throw new Error('PGRE.launchPack / PACKS not ready');

    async function runPack(packId, shotName) {
      pageErrors.length = 0;
      var expectedN = await evaluate("PGRE.PACKS['" + packId + "'].n");
      var result = await evaluate(`(function () {
        try { sessionStorage.removeItem('pgre-quiz-config'); } catch (e) {}
        try { sessionStorage.removeItem('pgre-practice-session'); } catch (e2) {}
        var cfg = PGRE.launchPack('${packId}');
        return cfg && { n: cfg.ids.length, hash: location.hash, label: cfg.label };
      })()`);
      if (!result) throw new Error('launchPack(' + packId + ') returned null');
      if (result.hash !== '#/practice/custom') {
        throw new Error('hash after launch: ' + result.hash);
      }
      var text = null;
      for (var t = 0; t < 40; t++) {
        text = await evaluate(`(document.getElementById('practice-root') || document.body).innerText`);
        if (text && /Question\s+1\s+of\s+\d+/.test(text)) break;
        await sleep(100);
      }
      var m = text && text.match(/Question\s+1\s+of\s+(\d+)/);
      var shown = m ? parseInt(m[1], 10) : null;
      console.log('pack ' + packId + ' expected n=' + expectedN + ' shown=' + shown);
      if (shown !== expectedN) {
        throw new Error('pack ' + packId + ' expected Question 1 of ' + expectedN +
          ', got ' + JSON.stringify((text || '').slice(0, 400)));
      }
      if (text.indexOf(result.label) === -1) {
        throw new Error('pack ' + packId + ' label missing from practice surface: ' + result.label);
      }
      if (pageErrors.length) {
        throw new Error('page errors: ' + pageErrors.join(' | '));
      }
      var shot = await send('Page.captureScreenshot', { format: 'png' });
      var out = path.join(ARTIFACT_DIR, shotName);
      fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
      console.log('screenshot ' + out);
      return shown;
    }

    var a1 = await runPack('03', 'pack-03-run1.png');
    var a2 = await runPack('03', 'pack-03-run2.png');
    var b1 = await runPack('07', 'pack-07-run1.png');
    var b2 = await runPack('07', 'pack-07-run2.png');
    if (a1 !== a2) throw new Error('pack 03 n mismatch across launches');
    if (b1 !== b2) throw new Error('pack 07 n mismatch across launches');
    console.log('chrome pack launch ok: 03 n=' + a1 + '  07 n=' + b1);
  } finally {
    if (ws) try { ws.close(); } catch (e) {}
    await stopChrome(chrome);
    server.close();
    try { fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } catch (e2) {}
  }
}

main().catch(function (err) {
  console.error('Error during pack-launch chrome test:', err && err.stack || err);
  process.exit(1);
});
