#!/usr/bin/env node
/* Headless Chrome, end to end: per-question time in the mock-exam room
   (js/view-exam.js + js/exam-engine.js, exam.qSec). A five-question synthetic
   exam is sat on the shipped page with a page clock the test moves by hand,
   so every expected number is worked out here from the script, not read back:

     question 1: 10 s, then 7 s after a revisit      -> 17 s
     question 2: 20 s, then 3 + 4 s around a pause and a hidden tab, then 2 s -> 29 s
                 (100 s paused and 50 s with the tab hidden are not counted)
     question 3: 6 s on screen at Submit             -> 6 s
     questions 4 and 5: never shown                  -> no time

   After Submit it checks the exam record, the attempt rows (`ms`), the agent
   status summary (`seconds`), the review cards (a "Time m:ss" chip on each
   timed card only) and the History attempt log. A second sitting is reloaded
   mid-question to check the saved total survives and a Resume exam keeps
   counting; the same sitting then has its `qSec` removed (the shape a sitting
   saved before this field has), is resumed and submitted. A seeded submitted
   sitting without `qSec` is opened in the review page. The tab being hidden is
   simulated: document.hidden is overridden and `visibilitychange` is
   dispatched, which exercises the room's handler, not Chrome's own tab hiding.
   The question bank (content/bank/, gitignored) is not needed: the questions
   are synthetic.

   Isolated Chrome profile and ephemeral ports; nothing outside the temp
   profile is read or written. Requests to the OrbitOS status bridge
   (127.0.0.1:4789) are blocked in the CDP session and refused by the page's
   Content-Security-Policy; the test fails unless Chrome refused at least one
   such request and the bridge answered none.
   Run: node tools/test-exam-dwell-chrome.js
   PGRE_ARTIFACT_DIR=<dir> keeps a screenshot of the review cards. */
'use strict';

var http = require('http');
var fs = require('fs');
var path = require('path');
var os = require('os');
var net = require('net');
var spawn = require('child_process').spawn;

var ROOT = path.resolve(__dirname, '..');
var BRIDGE_PORT = 4789; // js/status.js ENDPOINT
var CSP_REPORT_PATH = '/__csp-report';
function isBridgeUrl(u) { return /^https?:\/\/(127\.0\.0\.1|localhost):4789(\/|$)/.test(String(u)); }
var ARTIFACT_DIR = process.env.PGRE_ARTIFACT_DIR || '';
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
function near(a, b, tol) { return typeof a === 'number' && Math.abs(a - b) <= (tol || 1e-9); }

/* Five synthetic questions; the right answer is always choice A (index 0). */
var BANK = [];
for (var n = 1; n <= 5; n++) {
  BANK.push({
    id: 'dwell-chrome-q' + n, topic: 'cm', difficulty: 1,
    q: '<p>Synthetic stem ' + n + '.</p>',
    choices: ['Choice A ' + n, 'Choice B ' + n, 'Choice C ' + n, 'Choice D ' + n, 'Choice E ' + n],
    answer: 0, sol: '<p>Synthetic solution ' + n + '.</p>'
  });
}
var QID = BANK.map(function (b) { return b.id; });
var EXAM_ID = 'dwell-chrome';

/* ——— Chrome + CDP plumbing (same pattern as test-intensity-chrome.js) ——— */
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

/* The page may connect to this server only. Chrome refuses the bridge request
   and reports it to CSP_REPORT_PATH; the test counts those reports to prove
   the page tried and the guard held. */
var bridge = { refused: 0, sent: 0, answered: 0 };
var server = http.createServer(function (req, res) {
  var reqPath = decodeURIComponent(req.url.split('?')[0]);
  if (req.method === 'POST' && reqPath === CSP_REPORT_PATH) {
    var report = '';
    req.on('data', function (chunk) { report += chunk; });
    req.on('end', function () {
      try { if (isBridgeUrl(JSON.parse(report)['csp-report']['blocked-uri'])) bridge.refused++; } catch (e) {}
      res.writeHead(204); res.end();
    });
    return;
  }
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  var filePath = path.join(ROOT, reqPath);
  if (!filePath.startsWith(ROOT + path.sep)) { res.writeHead(403); res.end('forbidden'); return; }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Content-Security-Policy': "connect-src 'self'; report-uri " + CSP_REPORT_PATH
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

async function main() {
  var chromeBin = findChrome();
  if (!chromeBin) { console.error('LAUNCHER_UNAVAILABLE: Chrome binary not found'); process.exit(2); }
  await new Promise(function (r) { server.listen(0, '127.0.0.1', r); });
  var base = 'http://127.0.0.1:' + server.address().port;
  var cdpPort = await freePort();
  console.log('HTTP ' + base + '  CDP ' + cdpPort);
  var userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pgre-dwell-chrome-'));
  var chrome = spawn(chromeBin, ['--headless=new', '--remote-debugging-port=' + cdpPort,
    '--user-data-dir=' + userDataDir, '--no-first-run', '--window-size=1280,900', 'about:blank'],
    { stdio: 'ignore' });

  var pageErrors = [];
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
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        pageErrors.push('console.error: ' + (msg.params.args || []).map(function (a) {
          return a.value !== undefined ? a.value : a.description;
        }).join(' '));
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

    await send('Runtime.enable', {});
    await send('Page.enable', {});
    /* js/status.js posts the status summary to the OrbitOS status bridge on
       127.0.0.1:4789 when the page loads. Block that port before the first
       navigation, so this fixture never replaces the snapshot agents read. */
    await send('Network.enable', {});
    await send('Network.setBlockedURLs', { urls: ['*://127.0.0.1:' + BRIDGE_PORT + '/*', '*://localhost:' + BRIDGE_PORT + '/*'] });

    /* ——— In-page helpers ——— */
    var BOOT = '!!window.PGRE && !!PGRE.examEngine && !!PGRE.questionById && !!PGRE.views && !!PGRE.views.exam && ' +
      'document.readyState === "complete" && !!document.getElementById("view")';
    async function boot(hash) {
      await send('Page.navigate', { url: base + '/' + (hash || '#/') });
      await sleep(250);
      await waitFor(BOOT, 'the app');
    }
    /* The synthetic exam appears under "Legacy format" as a replay button. */
    async function injectBank() {
      await ev('(function(){PGRE.BOOK_EXAMS=[{id:' + JSON.stringify(EXAM_ID) + ',title:"Dwell test exam",' +
        'format:"70x120",questions:' + JSON.stringify(BANK) + '}];PGRE._resetBankCache();return true;})()');
    }
    /* A page clock the test moves by hand. Only Date.now() is replaced: the
       room's countdown and the per-question count both read it. */
    async function installClock() {
      await ev('(function(){window.__clk={t:Date.now()};Date.now=function(){return window.__clk.t;};return true;})()');
    }
    function advance(ms) { return ev('(function(){window.__clk.t+=' + ms + ';return window.__clk.t;})()'); }
    function setHidden(on) {
      return ev('(function(){Object.defineProperty(document,"hidden",{configurable:true,get:function(){return ' +
        (on ? 'true' : 'false') + ';}});document.dispatchEvent(new Event("visibilitychange"));return true;})()');
    }
    function click(selector) {
      return ev('(function(){var b=document.querySelector(' + JSON.stringify(selector) + ');' +
        'if(!b)throw new Error("no element " + ' + JSON.stringify(selector) + ');b.click();return true;})()');
    }
    function active() {
      return ev('(function(){var x=PGRE.examEngine.active();return x?JSON.stringify({id:x.id,cursor:x.cursor,' +
        'paused:!!x.paused,qSec:x.qSec===undefined?null:x.qSec}):null;})()').then(function (s) { return s && JSON.parse(s); });
    }
    function heading() {
      return ev('(function(){var h=document.getElementById("exam-q-heading");return h?h.textContent:"";})()');
    }
    async function startSitting() {
      await ev('location.hash = "#/exam"');
      await waitFor('!!document.querySelector(\'[data-replay="' + EXAM_ID + '"]\')', 'the replay button');
      await click('[data-replay="' + EXAM_ID + '"]');
      await waitFor('location.hash === "#/exam/run" && document.body.classList.contains("exam-fullscreen") && ' +
        '!!document.getElementById("exam-q-heading")', 'the exam room');
    }
    async function goNext(label) {
      await click('#exam-next');
      await waitFor('document.getElementById("exam-q-heading").textContent.indexOf("' + label + '") !== -1', label);
    }
    async function goBack(label) {
      await click('#exam-prev');
      await waitFor('document.getElementById("exam-q-heading").textContent.indexOf("' + label + '") !== -1', label);
    }

    /* ——— Sitting 1: the scripted route ——— */
    console.log('sitting 1: question 1 (10 s), 2 (20 s), back to 1 (7 s), on to 2');
    await boot('#/');
    await injectBank();
    await installClock();
    await startSitting();
    var a = await active();
    check(a && a.qSec && Object.keys(a.qSec).length === 0, 'a new sitting starts with an empty qSec map');
    check((await heading()).indexOf('Question 1 of 5') !== -1, 'the room opens on question 1');
    var examId = a.id;

    await advance(10000);
    await goNext('Question 2 of 5');
    a = await active();
    check(near(a.qSec[QID[0]], 10), 'Next gives question 1 its 10 s (qSec ' + JSON.stringify(a.qSec) + ')');
    check(a.qSec[QID[1]] === undefined, 'question 2 has no time yet');

    await advance(20000);
    await goBack('Question 1 of 5');
    a = await active();
    check(near(a.qSec[QID[1]], 20) && near(a.qSec[QID[0]], 10), 'Back gives question 2 its 20 s and leaves question 1 at 10 s');

    await advance(7000);
    await goNext('Question 2 of 5');
    a = await active();
    check(near(a.qSec[QID[0]], 17), 'a revisit adds to the same total: question 1 is 17 s');

    console.log('\nsitting 1: pause, hidden tab');
    await advance(3000);
    await click('#exam-pause');
    await waitFor('!!document.querySelector(".exam-overlay.is-pause")', 'the Paused card');
    a = await active();
    check(a.paused && near(a.qSec[QID[1]], 23), 'Pause stops the count with question 2 at 23 s');
    await advance(100000);
    await sleep(1300);                      // a real countdown tick would fire here if the clock were running
    a = await active();
    check(near(a.qSec[QID[1]], 23), '100 s of pause add nothing to question 2');
    await click('#exam-resume-btn');
    await waitFor('!document.querySelector(".exam-overlay.is-pause")', 'the room after Resume');
    a = await active();
    check(!a.paused && near(a.qSec[QID[1]], 23), 'Resume adds nothing for the pause');

    await advance(4000);
    await setHidden(true);
    a = await active();
    check(near(a.qSec[QID[1]], 27), 'hiding the tab closes the count: question 2 has its 4 s since Resume (27 s)');
    await advance(50000);
    await sleep(1300);
    a = await active();
    check(near(a.qSec[QID[1]], 27), '50 s with the tab hidden add nothing');
    await setHidden(false);
    await advance(2000);
    await goNext('Question 3 of 5');
    a = await active();
    check(near(a.qSec[QID[1]], 29), 'showing the tab starts the count again: question 2 ends at 29 s');

    console.log('\nsitting 1: Submit');
    await advance(6000);
    await click('#exam-submit');
    await waitFor('!!document.getElementById("exam-confirm")', 'the submit dialog');
    await click('#exam-confirm');
    await waitFor('location.hash === "#/exam/review/' + examId + '"', 'the review page');
    await waitFor('document.querySelectorAll(".exam-review-q").length === 5', 'five review cards');
    var rec = JSON.parse(await ev('JSON.stringify(PGRE.examEngine.byId(' + JSON.stringify(examId) + ').qSec)'));
    check(near(rec[QID[0]], 17) && near(rec[QID[1]], 29) && near(rec[QID[2]], 6) &&
      rec[QID[3]] === undefined && rec[QID[4]] === undefined,
      'the submitted record holds 17 s, 29 s, 6 s and no entry for questions 4 and 5 (' + JSON.stringify(rec) + ')');

    var rows = JSON.parse(await ev('JSON.stringify(PGRE.store.state.attempts.filter(function(r){return r.sid===' +
      JSON.stringify(examId) + ';}).map(function(r){return {qid:r.qid,ms:r.ms,mode:r.mode};}))'));
    function rowMs(rs, qid) { var r = rs.filter(function (x) { return x.qid === qid; })[0]; return r ? r.ms : undefined; }
    check(rows.length === 5 && rows.every(function (r) { return r.mode === 'exam'; }), 'Submit wrote 5 exam attempt rows');
    check(rowMs(rows, QID[0]) === 17000 && rowMs(rows, QID[1]) === 29000 && rowMs(rows, QID[2]) === 6000,
      'attempt rows carry ms 17000, 29000 and 6000');
    check(rowMs(rows, QID[3]) === null && rowMs(rows, QID[4]) === null, 'questions never shown keep ms: null');

    var st = JSON.parse(await ev('JSON.stringify(PGRE.buildStatusSummary().attempts.filter(function(r){return r.sessionId===' +
      JSON.stringify(examId) + ';}).map(function(r){return {qid:r.qid,seconds:r.seconds,mode:r.mode};}))'));
    function secOf(qid) { var r = st.filter(function (x) { return x.qid === qid; })[0]; return r ? r.seconds : undefined; }
    check(st.length === 5 && secOf(QID[0]) === 17 && secOf(QID[1]) === 29 && secOf(QID[2]) === 6 &&
      secOf(QID[3]) === null && secOf(QID[4]) === null,
      'the status summary reports seconds 17, 29, 6, null, null');

    console.log('\nsitting 1: review page');
    var chips = JSON.parse(await ev('JSON.stringify(Array.prototype.map.call(document.querySelectorAll(".exam-review-q"),' +
      'function(c){var t=c.querySelector(".exam-review-time");return t?t.textContent:null;}))'));
    var chipText = chips.map(function (c) { return c === null ? 'none' : c; }).join('|');
    check(chipText === 'Time 0:17|Time 0:29|Time 0:06|none|none',
      'review cards show Time 0:17, 0:29, 0:06 and no chip on the two unvisited questions (' + chipText + ')');
    var chipPlace = await ev('(function(){var t=document.querySelector(".exam-review-q .exam-review-time");' +
      'return !!t && !!t.parentNode && t.parentNode.classList.contains("miss-head");})()');
    check(chipPlace === true, 'the chip sits in the card header beside the question number');
    if (ARTIFACT_DIR) {
      fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
      await ev('(function(){var t=document.getElementById("toasts");if(t)t.style.visibility="hidden";' +
        'var c=document.querySelector(".exam-review-q");window.scrollTo(0,c.getBoundingClientRect().top+window.scrollY-90);return true;})()');
      await sleep(500);
      var shot = await send('Page.captureScreenshot', { format: 'png' });
      var out = path.join(ARTIFACT_DIR, 'exam-review-time.png');
      fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
      console.log('  screenshot ' + out);
    }

    console.log('\nsitting 1: History attempt log');
    await ev('location.hash = "#/history"');
    await waitFor('document.querySelectorAll("#hist-log .hist-ms").length >= 5', 'the attempt log');
    var msTexts = JSON.parse(await ev('JSON.stringify(Array.prototype.map.call(document.querySelectorAll("#hist-log .hist-ms"),' +
      'function(e){return e.textContent;}))'));
    var count = function (t) { return msTexts.filter(function (x) { return x === t; }).length; };
    check(count('17 s') === 1 && count('29 s') === 1 && count('6.0 s') === 1 && count('—') === 2,
      'History shows 17 s, 29 s, 6.0 s and two empty times for the exam rows (' + msTexts.join(', ') + ')');

    /* ——— Sitting 2: reload mid-question, then a sitting saved without qSec ——— */
    console.log('\nsitting 2: the saved total survives a reload');
    await ev('location.hash = "#/exam"');
    await startSitting();
    var s2 = await active();
    await advance(9000);
    await send('Page.reload', {});
    await sleep(300);
    await waitFor(BOOT, 'the app after reload');
    var disk = JSON.parse(await ev('(function(){var b=JSON.parse(localStorage.getItem("pgre-state-v1"));' +
      'var x=b.exams.filter(function(e){return e.id===' + JSON.stringify(s2.id) + ';})[0];' +
      'return JSON.stringify(x?x.qSec:null);})()'));
    check(disk && disk[QID[0]] >= 9 && disk[QID[0]] < 12,
      'after a reload the stored qSec still holds question 1’s 9 s (' + JSON.stringify(disk) + ')');

    await injectBank();
    await ev('location.hash = "#/exam"');
    await waitFor('!!document.getElementById("exam-resume-go")', 'the Resume exam button');
    await click('#exam-resume-go');
    await waitFor('location.hash === "#/exam/run" && !!document.getElementById("exam-q-heading")', 'the room after Resume exam');
    var s2b = await active();
    check(s2b.id === s2.id && s2b.qSec[QID[0]] >= 9, 'Resume exam returns to the same sitting with its time');

    console.log('\nsitting 2: a sitting saved without qSec');
    await ev('(function(){var x=PGRE.examEngine.active();delete x.qSec;PGRE.store.save();return true;})()');
    await installClock();
    await setHidden(false);                 // re-anchors the open count on the test clock
    await advance(4000);
    await goNext('Question 2 of 5');
    var s2c = await active();
    check(s2c.qSec && s2c.qSec[QID[0]] >= 4 && s2c.qSec[QID[0]] < 7,
      'the map is created again and counting continues (question 1: ' + (s2c.qSec && s2c.qSec[QID[0]]) + ' s)');
    await click('#exam-submit');
    await waitFor('!!document.getElementById("exam-confirm")', 'the submit dialog');
    await click('#exam-confirm');
    await waitFor('location.hash === "#/exam/review/' + s2.id + '"', 'the review page of sitting 2');
    var rows2 = JSON.parse(await ev('JSON.stringify(PGRE.store.state.attempts.filter(function(r){return r.sid===' +
      JSON.stringify(s2.id) + ';}).map(function(r){return {qid:r.qid,ms:r.ms};}))'));
    check(rows2.length === 5 && rowMs(rows2, QID[0]) >= 4000 && rowMs(rows2, QID[0]) < 7000 &&
      QID.slice(1).every(function (q) { return rowMs(rows2, q) === null; }),
      'the resumed sitting writes ms for question 1 only (' + JSON.stringify(rows2.map(function (r) { return r.ms; })) + ')');

    console.log('\nan old submitted sitting without qSec');
    await ev('(function(){var s=PGRE.store.state;s.exams.push({id:"ex-old-format",startedAt:"2026-10-11T08:00:00.000Z",' +
      'submittedAt:"2026-10-11T10:00:00.000Z",format:"70x120",source:' + JSON.stringify(EXAM_ID) + ',title:"Old sitting",' +
      'seed:1,order:' + JSON.stringify(QID) + ',answers:{},flags:[],cursor:0,paused:false,durationSec:7200,limitSec:7200,' +
      'raw:0,total:5,scaledEst:380,perTopic:{cm:{right:0,total:5}}});PGRE.store.save();return true;})()');
    await ev('location.hash = "#/exam/review/ex-old-format"');
    await waitFor('document.querySelectorAll(".exam-review-q").length === 5', 'the old sitting review cards');
    var oldChips = await ev('document.querySelectorAll(".exam-review-time").length');
    check(oldChips === 0, 'an old sitting’s review shows five cards and no time chips');
    await ev('location.hash = "#/exam"');
    await waitFor('!!document.querySelector(".exam-hist-row")', 'the past simulations list');
    check(await ev('document.querySelectorAll(".exam-hist-row").length') === 3,
      'the past simulations list shows all three sittings');

    check(pageErrors.length === 0, 'the page raised no errors' + (pageErrors.length ? ': ' + pageErrors[0] : ''));
    check(bridge.refused > 0 && bridge.answered === 0,
      'the status bridge on port ' + BRIDGE_PORT + ' answered nothing (Chrome refused ' + bridge.refused +
      ' request(s) to it; ' + bridge.sent + ' left the page)');
  } finally {
    try { if (ws) ws.close(); } catch (e) {}
    await stopChrome(chrome);
    await new Promise(function (r) { server.close(r); });
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (e) {}
  }
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
}

main().catch(function (err) {
  console.error(err && err.stack || err);
  try { server.close(); } catch (e) {}
  process.exit(1);
});
