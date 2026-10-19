#!/usr/bin/env node
/* Real-page check of the keyboard on the mistake-drill review page
   (#/mistakes/drill → results → a result): K G T F R regrade exactly as a
   click on the chip does, ← / → / Enter browse the answered results, Esc goes
   back to the results, and no key acts while a text field has focus.
   Synthetic questions in an isolated headless Chrome profile on a throwaway
   port; never the saved profile. Real key and mouse events (CDP Input).
   Requests to the OrbitOS status bridge (127.0.0.1:4789) are blocked before
   the page loads.
   Run: node tools/test-drill-review-keys-chrome.js
   PGRE_DRILL_KEYS_SHOTS=<dir> also saves screenshots. */
'use strict';

var fs = require('fs');
var http = require('http');
var os = require('os');
var path = require('path');
var spawn = require('child_process').spawn;

var ROOT = path.resolve(__dirname, '..');
var BRIDGE = /^https?:\/\/(127\.0\.0\.1|localhost):4789\//; // js/status.js ENDPOINT
var SHOTS = process.env.PGRE_DRILL_KEYS_SHOTS ? path.resolve(process.env.PGRE_DRILL_KEYS_SHOTS) : '';
var N = 20;
var MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.svg': 'image/svg+xml',
  '.png': 'image/png' };

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
var failures = 0;
function check(ok, msg) {
  console.log((ok ? 'PASS: ' : 'FAIL: ') + msg);
  if (!ok) failures++;
}

async function main() {
  var server = http.createServer(function (req, res) {
    var p = decodeURIComponent(req.url.split('?')[0]);
    var f = path.resolve(ROOT, '.' + (p === '/' ? '/index.html' : p));
    if (!f.startsWith(ROOT + path.sep) || !fs.existsSync(f) || !fs.statSync(f).isFile()) {
      res.writeHead(404); res.end(); return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise(function (r) { server.listen(0, '127.0.0.1', r); });
  var profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pgre-drill-keys-'));
  var cdpPort = 9400 + Math.floor(Math.random() * 400);
  var chrome = spawn(process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ['--headless=new', '--remote-debugging-port=' + cdpPort, '--user-data-dir=' + profile,
     '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });
  var ws, bridge = { sent: 0, recv: 0 }, errors = [];
  try {
    var list = [];
    for (var t = 0; t < 60 && !list.length; t++) {
      try {
        list = (await (await fetch('http://127.0.0.1:' + cdpPort + '/json/list')).json())
          .filter(function (x) { return x.type === 'page'; });
      } catch (e) { /* not up yet */ }
      if (!list.length) await sleep(200);
    }
    if (!list.length) throw new Error('Chrome did not start');
    ws = new WebSocket(list[0].webSocketDebuggerUrl);
    await new Promise(function (r) { ws.onopen = r; });
    var seq = 0, pending = {};
    ws.onmessage = function (m) {
      var d = JSON.parse(m.data);
      if (d.id && pending[d.id]) { pending[d.id](d); delete pending[d.id]; return; }
      if (d.method === 'Network.requestWillBeSent' && BRIDGE.test(d.params.request.url)) bridge.sent++;
      if (d.method === 'Network.responseReceived' && BRIDGE.test(d.params.response.url)) bridge.recv++;
      if (d.method === 'Runtime.exceptionThrown') errors.push(d.params.exceptionDetails.text);
    };
    var send = function (method, params) {
      return new Promise(function (resolve, reject) {
        var id = ++seq;
        pending[id] = function (d) { d.error ? reject(new Error(method + ': ' + d.error.message)) : resolve(d.result); };
        ws.send(JSON.stringify({ id: id, method: method, params: params || {} }));
      });
    };
    // the bridge block first, before the page ever loads
    await send('Network.enable');
    await send('Network.setBlockedURLs', { urls: ['*://127.0.0.1:4789/*', '*://localhost:4789/*'] });
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1180, height: 900, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: 'http://127.0.0.1:' + server.address().port + '/' });

    var ev = async function (expr) {
      var r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error('evaluate: ' + JSON.stringify(r.exceptionDetails).slice(0, 400));
      return r.result.value;
    };
    var waitFor = async function (sel) {
      for (var i = 0; i < 100; i++) {
        if (await ev('!!document.querySelector(' + JSON.stringify(sel) + ')')) return;
        await sleep(100);
      }
      throw new Error('Timeout waiting for ' + sel);
    };
    var click = async function (sel) {
      var box = await ev('(function () { var e = document.querySelector(' + JSON.stringify(sel) + ');' +
        'if (!e) return null; e.scrollIntoView({ block: "center" }); var r = e.getBoundingClientRect();' +
        'return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()');
      if (!box) throw new Error('No element ' + sel);
      await sleep(60);
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
      await sleep(250);
    };
    var NAMED = { ArrowLeft: 37, ArrowRight: 39, Enter: 13, Escape: 27 };
    var key = async function (k) {
      var p = NAMED[k]
        ? { key: k, code: k, windowsVirtualKeyCode: NAMED[k] }
        : { key: k, code: 'Key' + k.toUpperCase(), text: k, windowsVirtualKeyCode: k.toUpperCase().charCodeAt(0) };
      if (k === 'Enter') p.text = '\r';
      await send('Input.dispatchKeyEvent', Object.assign({ type: NAMED[k] && k !== 'Enter' ? 'rawKeyDown' : 'keyDown' }, p));
      await send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, p));
      await sleep(250);
    };
    var shot = async function (name) {
      if (!SHOTS) return;
      // top of the page, so the "Review — n of 20" line and the chips are both in frame
      await ev('(function () { window.scrollTo(0, 0); var a = document.activeElement; if (a && a.blur) a.blur(); })()');
      await sleep(700);   // let the window pulse finish
      var r = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(SHOTS, name + '.png'), Buffer.from(r.data, 'base64'));
    };
    // what the grading panel shows plus what is stored for the question on screen
    var read = async function () {
      return JSON.parse(await ev('(function () {' +
        'var meta = document.querySelector(".practice-meta span");' +
        'var m = meta && meta.textContent.match(/Review — (\\d+) of/);' +
        'var qt = document.querySelector(".q-text"); var id = qt && (qt.textContent.match(/dk-\\d+/) || [""])[0];' +
        'var on = []; document.querySelectorAll("[data-assess][aria-pressed=\\"true\\"]").forEach(function (b) { on.push(b.dataset.assess); });' +
        'var s = PGRE.store.state, mk = s.mistakes[id], row = null;' +
        's.attempts.forEach(function (a) { if (a.qid === id) row = a; });' +
        'var w = function (i) { var e = document.getElementById(i); return e && !e.hidden ? e.textContent : ""; };' +
        'var c = document.getElementById("assess-stuck-confirm");' +
        'return JSON.stringify({ review: m ? +m[1] : 0, id: id, summary: !!document.querySelector(".summary-score"),' +
        '  on: on.join(","), from: w("assess-window-from"), to: w("assess-window-to"), banner: w("next-review-label"),' +
        '  days: mk ? PGRE.srs.daysUntil(mk.srs.due) : null, lucky: !!(mk && mk.lucky), stuck: !!(mk && mk.stuck),' +
        '  conf: row ? row.confidence || null : null, tags: row ? (row.tags || []).join(",") : "",' +
        '  attempts: s.attempts.length, xp: s.xp, confirmOpen: !!(c && !c.hidden) });' +
        '})()'));
    };
    var same = function (a, b) {
      var keys = ['on', 'from', 'to', 'banner', 'days', 'lucky', 'stuck', 'conf', 'tags', 'attempts', 'xp'];
      return keys.every(function (k) { return a[k] === b[k]; });
    };

    // ——— a 20-question drill: every fourth question missed, the rest solved ———
    await waitFor('#main');
    await ev('(function () {' +
      'PGRE.store.state.settings.keyboard = true;' +
      'var now = new Date().toISOString(), today = PGRE.srs.today();' +
      'for (var i = 0; i < ' + N + '; i++) { var id = "dk-" + i;' +
      '  PGRE.QUESTIONS.push({ id: id, topic: "em", difficulty: 1,' +
      '    q: "<p>Synthetic drill question " + id + ": choose the second option.</p>",' +
      '    choices: ["First option", "Second option"], answer: 1, sol: "<p>The second option is the test answer.</p>" });' +
      '  PGRE.store.state.mistakes[id] = { firstMissedAt: now, lastMissedAt: now, misses: 1, solves: 0,' +
      '    wrongPicks: [0], lastPick: 0, archivedAt: null, srs: { step: 0, due: today } }; }' +
      'PGRE._resetBankCache(); PGRE.store.save(); location.hash = "#/mistakes"; })()');
    await waitFor('#drill-due');
    await click('#drill-due');
    for (var q = 0; q < N; q++) {
      await waitFor('.choice[data-idx="1"]');
      await click('.choice[data-idx="' + (q % 4 === 3 ? 0 : 1) + '"]');
      await click('#confirm-btn');
      await waitFor('#assess-row');
      if (q < N - 1) await click('#drill-next');
    }
    await click('#drill-finish');
    await waitFor('[data-review="6"]');
    await click('[data-review="6"]');
    await waitFor('#review-summary');
    var base = await read();
    check(base.review === 7 && base.on === '' && base.to === '3 d' && base.banner === '3 d',
      'review 7 of 20 opens ungraded on its 3 d window (correct answer)');
    await shot('01-review-7-before-keys');

    // ——— each chip key against a click on the same chip ———
    var CHIPS = [['k', 'sure'], ['g', 'guess'], ['t', 'slow'], ['f', 'forgot']];
    for (var c = 0; c < CHIPS.length; c++) {
      var k = CHIPS[c][0], chip = CHIPS[c][1];
      await key(k);
      var byKey = await read();
      await key(k);
      var undoneKey = await read();
      await click('[data-assess="' + chip + '"]');
      var byClick = await read();
      await click('[data-assess="' + chip + '"]');
      check(byKey.on === chip && same(byKey, byClick),
        k.toUpperCase() + ' selects ' + chip + ' exactly as a click does (window ' +
        (byKey.from ? byKey.from + ' → ' : '') + byKey.to + ', stored ' + byKey.days + ' d, row ' +
        (byKey.conf || '') + (byKey.tags ? ' ' + byKey.tags : '') + ')');
      check(same(undoneKey, base), k.toUpperCase() + ' again unpicks it and restores the saved window');
    }
    await shot('02-review-7-after-key-checks');

    // R asks first, like the click; Enter on the focused Confirm applies it
    await key('r');
    var askKey = await read();
    await key('Enter');
    var stuckKey = await read();
    await key('r');                    // an active Keep failing toggles off without asking
    var unstuckKey = await read();
    await click('[data-assess="stuck"]');
    var askClick = await read();
    await click('#assess-stuck-yes');
    var stuckClick = await read();
    await click('[data-assess="stuck"]');
    check(askKey.confirmOpen && askKey.on === '' && askClick.confirmOpen && same(askKey, askClick),
      'R opens the Keep failing confirmation and writes nothing, as the click does');
    check(stuckKey.on === 'stuck' && stuckKey.stuck && same(stuckKey, stuckClick),
      'R then Confirm flags Keep failing exactly as click then Confirm (stored ' + stuckKey.days + ' d)');
    check(same(unstuckKey, base) && same(await read(), base), 'R on an active Keep failing unpicks it at once');

    // changing a grading that is already chosen
    await key('k');
    await key('g');
    var changed = await read();
    check(changed.on === 'guess' && changed.conf === 'guess' && changed.lucky && changed.to === '2 d' &&
      changed.from === '3 d' && changed.banner === '2 d' && changed.days === 2,
      'K then G replaces Knew it with Guessed: window 3 d → 2 d, banner 2 d, stored 2 d');
    await key('f');
    var both = await read();
    check(both.on === 'guess,forgot' && both.to === '1 d' && both.days === 1 && both.banner === '1 d',
      'F adds Forgot something: window 3 d → 1 d, stored tomorrow');
    await shot('03-review-7-regraded-by-keys');
    check(both.attempts === base.attempts && both.xp === base.xp, 'no key added an attempt or XP');

    // no key while a text field has focus
    var hasField = await ev('!!document.querySelector("input[type=search], input[type=text], #sidebar input")');
    if (hasField) {
      await ev('document.querySelector("input[type=search], input[type=text], #sidebar input").focus()');
      await key('k');
      await key('ArrowRight');
      var typed = await read();
      check(typed.on === both.on && typed.review === 7 && typed.days === both.days,
        'K and → do nothing while a text field has focus');
      await ev('(function () { var f = document.activeElement; f.value = ""; f.dispatchEvent(new Event("input", { bubbles: true })); f.blur(); })()');
      await key('Escape');   // close any panel the typing opened; also Esc to results
      await waitFor('[data-review="6"]');
      await click('[data-review="6"]');
      await waitFor('#review-summary');
    } else {
      check(false, 'a text field exists on the page for the typing check');
    }

    // ——— browsing: ← / → / Enter / Esc ———
    await key('ArrowRight');
    var r8 = await read();
    await shot('04-review-8-by-right-arrow');
    await key('ArrowLeft');
    var r7 = await read();
    check(r8.review === 8 && r7.review === 7 && r7.on === 'guess,forgot',
      '→ opens review 8, ← comes back to 7 with its grading kept');
    await click('[data-assess="slow"]');   // a click leaves the chip focused
    var slowOn = await read();
    await key('Enter');
    var byEnter = await read();
    check(slowOn.on === 'guess,slow,forgot' && byEnter.review === 8,
      'Enter opens the next result and does not press the chip a click left focused');
    await key('ArrowLeft');
    check((await read()).on === 'guess,slow,forgot', 'the chip clicked before Enter kept its one toggle');
    await click('[data-review]');          // nothing focused: walk to the first result
    for (var s = 0; s < N && (await read()).review !== 1; s++) await key('ArrowLeft');
    await key('ArrowLeft');
    check((await read()).review === 1, '← on the first result stays put');
    for (s = 0; s < N && (await read()).review !== N; s++) await key('ArrowRight');
    await key('ArrowRight');
    await key('Enter');
    check((await read()).review === N, '→ and Enter on the last result stay put');
    await key('Escape');
    var summary = await read();
    check(summary.summary && summary.review === 0, 'Esc goes back to the results');
    await shot('05-results-after-esc');
    var before = await read();
    await key('k');
    await key('ArrowRight');
    check(same(await read(), before) && (await read()).summary, 'keys on the results page change nothing');

    check(errors.length === 0, 'no page exceptions' + (errors.length ? ': ' + errors.join(' | ') : ''));
  } finally {
    // quit Chrome while the bridge block is still in place, then disconnect
    try { chrome.kill(); } catch (e) { /* gone */ }
    await new Promise(function (r) { if (chrome.exitCode !== null) r(); else chrome.once('exit', r); setTimeout(r, 4000); });
    try { if (ws) ws.close(); } catch (e) { /* closed */ }
    server.close();
    fs.rmSync(profile, { recursive: true, force: true });
  }
  check(bridge.recv === 0, 'the status bridge on port 4789 answered nothing (' + bridge.sent + ' blocked request(s))');
  console.log(failures ? '\n' + failures + ' FAILED' : '\nALL OK');
  if (failures) process.exitCode = 1;
}

if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
main().catch(function (e) { console.error(e.stack || e.message); process.exitCode = 1; });
