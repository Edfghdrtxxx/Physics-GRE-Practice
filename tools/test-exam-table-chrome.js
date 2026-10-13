#!/usr/bin/env node
/* Headless Chrome, end to end: Table of Information in the mock-exam room.
   Starts a sitting on fixture questions, opens the table by button and by
   key, checks every official entry, checks the clock advanced while open,
   closes, checks the question and chosen answer are unchanged, and checks
   the control is absent outside the room. Before leaving the room it flags
   questions with the room's flag button, submits the sitting, and checks
   the flag list in PGRE.buildStatusSummary().exams. On the results page it
   checks that the Flagged tile switches the review list to the flagged
   questions and back, and that the question navigator beside the list
   jumps to a question and follows that filter.
   Isolated profile + ephemeral ports. Requests to the OrbitOS status bridge
   (127.0.0.1:4789) are blocked before the page loads. Run:
     node tools/test-exam-table-chrome.js
   PGRE_ARTIFACT_DIR keeps screenshots. PGRE_TEST_PORT / PGRE_CDP_PORT pin ports. */
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
var BRIDGE_PORT = 4789; // js/status.js ENDPOINT
function isBridgeUrl(u) { return /^https?:\/\/(127\.0\.0\.1|localhost):4789\//.test(String(u)); }
var KEEP_ARTIFACTS = !!process.env.PGRE_ARTIFACT_DIR;
var ARTIFACT_DIR = process.env.PGRE_ARTIFACT_DIR ||
  fs.mkdtempSync(path.join(os.tmpdir(), 'pgre-exam-table-shots-'));
var MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
  '.png': 'image/png', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.json': 'application/json'
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

var passed = 0;
var failed = 0;
function check(cond, msg) {
  if (cond) { passed++; console.log('  ok  — ' + msg); }
  else { failed++; console.log('  FAIL — ' + msg); }
}

/* Source list: GRE Physics Test Practice Book (ETS current) page 8;
   identical on GR1777 p.8 and GR0877 p.10. */
var SOURCE = [
  { name: 'Rest mass of the electron', needles: ['9.11', '31', 'kg'] },
  { name: 'Magnitude of the electron charge', needles: ['1.60', '19', 'C'] },
  { name: "Avogadro's number", needles: ['6.02', '23'] },
  { name: 'Universal gas constant', needles: ['8.31', 'J', 'mol', 'K'] },
  { name: "Boltzmann's constant", needles: ['1.38', '23', 'J'] },
  { name: 'Speed of light', needles: ['3.00', 'm/s'] },
  { name: "Planck's constant", needles: ['6.63', '34', '4.14', '15', 'eV'] },
  { name: 'reduced Planck', needles: ['h/2'] },
  { name: 'hc', needles: ['1240', 'nm'] },
  { name: 'Vacuum permittivity', needles: ['8.85', '12'] },
  { name: 'Vacuum permeability', needles: ['10', '7'] },
  { name: 'Universal gravitational constant', needles: ['6.67', '11'] },
  { name: 'Acceleration due to gravity', needles: ['9.80'] },
  { name: '1 atmosphere pressure', needles: ['1.0', 'Pa'] },
  { name: '1 angstrom', needles: ['0.1', 'nm'] }
];
var PREFIX_NAMES = ['femto', 'pico', 'nano', 'micro', 'milli', 'centi', 'kilo', 'mega', 'giga', 'tera', 'peta'];
var INERTIA_NAMES = ['Rod', 'Disc', 'Sphere'];
var STEM = 'TOI fixture stem unique-xyz';

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
  console.log('shots ' + ARTIFACT_DIR);

  var userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pgre-exam-table-chrome-'));
  var chrome = spawn(chromeBin, [
    '--headless=new',
    '--remote-debugging-port=' + cdpPort,
    '--user-data-dir=' + userDataDir,
    '--no-first-run',
    '--window-size=1280,900',
    'about:blank'
  ], { stdio: 'ignore' });

  var bridge = { sent: 0, answered: 0 };
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
      if (msg.method === 'Network.requestWillBeSent' && isBridgeUrl(msg.params.request.url)) bridge.sent++;
      if (msg.method === 'Network.responseReceived' && isBridgeUrl(msg.params.response.url)) bridge.answered++;
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
    async function shot(name) {
      var res = await send('Page.captureScreenshot', { format: 'png' });
      var dest = path.join(ARTIFACT_DIR, name);
      fs.writeFileSync(dest, Buffer.from(res.data, 'base64'));
      console.log('  shot ' + dest);
      return dest;
    }
    async function press(key, code, vk) {
      var payload = {
        type: 'keyDown', key: key, code: code || key,
        windowsVirtualKeyCode: vk || 0, nativeVirtualKeyCode: vk || 0
      };
      await send('Input.dispatchKeyEvent', payload);
      payload.type = 'keyUp';
      await send('Input.dispatchKeyEvent', payload);
      await sleep(120);
    }
    /* Enter as a keyboard sends it, with its character: the browser presses a
       focused button or band heading unless the page prevents it. */
    async function pressEnter() {
      var payload = {
        type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r', unmodifiedText: '\r',
        windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13
      };
      await send('Input.dispatchKeyEvent', payload);
      await send('Input.dispatchKeyEvent', {
        type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13
      });
      await sleep(120);
    }
    /* A real pointer click on the element `expr` names: the pressed control
       takes focus, as it does for a reader. `scroll` first brings it to the
       middle of its scroll area. */
    async function clickAt(expr, scroll) {
      var at = await evaluate('(function () { var el = ' + expr + ';' +
        (scroll ? ' el.scrollIntoView({ block: "center" });' : '') +
        ' var r = el.getBoundingClientRect();' +
        ' return { x: r.left + r.width / 2, y: r.top + r.height / 2, h: window.innerHeight }; })()');
      if (!(at.y > 0 && at.y < at.h)) throw new Error('clickAt target is off screen: ' + expr);
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: at.x, y: at.y });
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: at.x, y: at.y, button: 'left', clickCount: 1 });
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: at.x, y: at.y, button: 'left', clickCount: 1 });
      await sleep(120);
    }
    async function until(expr, label, n) {
      n = n || 80;
      for (var w = 0; w < n; w++) {
        if (await evaluate(expr)) return;
        await sleep(100);
      }
      throw new Error('timeout waiting for ' + (label || expr));
    }

    await send('Runtime.enable', {});
    await send('Page.enable', {});
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1280, height: 900, deviceScaleFactor: 1, mobile: false
    });
    /* js/status.js posts the status summary to the OrbitOS status bridge on
       127.0.0.1:4789. Block that port before the app loads, so this
       fixture sitting never replaces the snapshot agents read. */
    await send('Network.enable', {});
    await send('Network.setBlockedURLs', { urls: ['*://127.0.0.1:' + BRIDGE_PORT + '/*', '*://localhost:' + BRIDGE_PORT + '/*'] });
    await send('Page.navigate', { url: 'http://127.0.0.1:' + httpPort + '/' });
    await sleep(250);

    await until("typeof PGRE !== 'undefined' && typeof PGRE._resetBankCache === 'function'", 'PGRE boot');

    var setup = await evaluate(`(function () {
      var tall = '<p>${STEM}</p>';
      for (var n = 0; n < 40; n++) tall += '<p>Spacer line ' + n + ' for scroll.</p>';
      for (var i = 0; i < 70; i++) {
        PGRE.QUESTIONS.push({
          id: 'toi-q' + i, topic: 'cm', difficulty: 1,
          q: i === 0 ? tall : '<p>Fixture question ' + i + '.</p>',
          choices: ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo'],
          answer: 0, sol: '<p>Alpha</p>'
        });
      }
      PGRE._resetBankCache();
      location.hash = '#/exam';
      return PGRE.allQuestions().length;
    })()`);
    check(setup >= 70, 'fixture bank is large enough for a 70-question mock (' + setup + ')');

    await until('!!document.getElementById("start-70")', 'start-70');
    check(!(await evaluate('!!document.getElementById("exam-table-btn")')),
      'Table of Information control is absent on the exam setup page');

    await evaluate('document.getElementById("start-70").click()');
    await until('location.hash === "#/exam/run" && document.body.classList.contains("exam-fullscreen") && !!document.getElementById("exam-q-heading")',
      'exam room');

    check(await evaluate('!!document.getElementById("exam-table-btn")'),
      'Table of Information button is in the exam bar');
    check(await evaluate('!document.getElementById("exam-table-host").firstChild'),
      'table panel starts closed');

    /* The weighted 70-draw mixes these fixtures with the gitignored bank.
       Put the tall fixture first before the scroll steps so a still-
       typesetting bank stem cannot move .exam-main scrollTop via overflow-
       anchor during the table-open wait. Click a different palette cell
       first: a click on the already-current cell may leave the bank
       question on screen. The scrollTop comparison stays a strict
       equality; a product that drops the position still fails. */
    await evaluate(`(function () {
      var exam = PGRE.examEngine.active();
      var want = 'toi-q0';
      var i = exam.order.indexOf(want);
      if (i === -1) exam.order[0] = want;
      else if (i > 0) {
        var tmp = exam.order[0];
        exam.order[0] = exam.order[i];
        exam.order[i] = tmp;
      }
      PGRE.store.save();
      var other = document.querySelector('#exam-palette [data-goto="1"]');
      if (other) other.click();
    })()`);
    await until('PGRE.examEngine.active().cursor === 1', 'palette moved off question 1');
    await evaluate('document.querySelector(\'#exam-palette [data-goto="0"]\').click()');
    await until('PGRE.examEngine.active().cursor === 0', 'palette back on question 1');
    var pinned = await evaluate(`(function () {
      var exam = PGRE.examEngine.active();
      var qtext = document.querySelector('#exam-q .q-text');
      return {
        qid: exam.order[0],
        shown: qtext ? qtext.textContent : ''
      };
    })()`);
    check(pinned.qid === 'toi-q0' && (pinned.shown || '').indexOf(STEM) !== -1,
      'scroll check shows the tall fixture as question 1 (qid ' + pinned.qid +
      ', shown ' + JSON.stringify((pinned.shown || '').slice(0, 60)) + ')');

    await evaluate(`(function () {
      var choice = document.querySelector('.choice[data-idx="2"]');
      if (choice) choice.click();
      var qtext = document.querySelector('#exam-q .q-text');
      if (qtext) qtext.style.minHeight = '1600px';
      var main = document.querySelector('.exam-main');
      if (main) main.scrollTop = 240;
    })()`);
    await sleep(200);

    var before = await evaluate(`(function () {
      var exam = PGRE.examEngine.active();
      var main = document.querySelector('.exam-main');
      var heading = document.getElementById('exam-q-heading');
      var qtext = document.querySelector('#exam-q .q-text');
      return {
        cursor: exam.cursor,
        qid: exam.order[exam.cursor],
        answer: exam.answers[exam.order[exam.cursor]],
        duration: exam.durationSec,
        scroll: main ? main.scrollTop : 0,
        heading: heading ? heading.textContent : '',
        shown: qtext ? qtext.textContent : '',
        paused: exam.paused
      };
    })()`);
    check(before.answer === 2, 'chose Charlie (index 2) on question 1');
    check(before.cursor === 0 && before.paused === false, 'sitting is on question 1 with the clock running');
    check(before.qid === 'toi-q0' && (before.shown || '').indexOf(STEM) !== -1,
      'question 1 on screen is the tall fixture during the scroll steps (qid ' +
      before.qid + ', shown ' + JSON.stringify((before.shown || '').slice(0, 60)) + ')');

    await evaluate('document.getElementById("exam-table-btn").click()');
    await until('!!document.getElementById("exam-table-dialog")', 'table drawer in the DOM');
    await evaluate(`(function () {
      var card = document.getElementById('exam-table-dialog');
      if (!card) return;
      card.style.transition = 'none';
      card.style.transform = 'translateX(-42%)';
    })()`);
    await sleep(40);
    await shot('04-table-mid-slide.png');
    await evaluate(`(function () {
      var card = document.getElementById('exam-table-dialog');
      if (!card) return;
      card.style.transition = '';
      card.style.transform = '';
    })()`);
    await until('!!(document.getElementById("exam-table-overlay") && document.getElementById("exam-table-overlay").classList.contains("is-open"))',
      'table drawer open');
    await sleep(250);

    var openInfo = await evaluate(`(function () {
      var dialog = document.getElementById('exam-table-dialog');
      var exam = PGRE.examEngine.active();
      return {
        text: dialog ? dialog.innerText : '',
        html: dialog ? dialog.innerHTML : '',
        duration: exam.durationSec,
        paused: exam.paused,
        hasNotes: !!dialog.querySelector('textarea, .practice-nb, [data-note]'),
        hasSearch: !!dialog.querySelector('input, .fs-card, #fs-input'),
        hasStem: dialog && dialog.innerText.indexOf('${STEM}') !== -1
      };
    })()`);
    console.log('\n--- panel text ---\n' + openInfo.text + '\n--- end panel text ---\n');
    check(!!openInfo.text, 'panel rendered text');
    check(openInfo.paused === false, 'exam is not paused while the table is open');
    check(!openInfo.hasNotes && !openInfo.hasSearch && !openInfo.hasStem,
      'panel has no notes, search, or question text');

    SOURCE.forEach(function (row) {
      var hasName = row.name === 'reduced Planck' || row.name === 'hc' ||
        openInfo.text.indexOf(row.name) !== -1;
      var missing = row.needles.filter(function (n) { return openInfo.text.indexOf(n) === -1; });
      check(hasName && missing.length === 0,
        row.name + (missing.length ? ' missing ' + missing.join(', ') : ' present with value and unit'));
    });
    PREFIX_NAMES.forEach(function (n) {
      check(openInfo.text.indexOf(n) !== -1, 'prefix ' + n);
    });
    INERTIA_NAMES.forEach(function (n) {
      check(openInfo.text.indexOf(n) !== -1, 'inertia ' + n);
    });
    check(openInfo.text.indexOf('Prefixes for Powers of 10') !== -1, 'prefixes heading in panel');
    check(openInfo.text.indexOf('Rotational inertia about center of mass') !== -1, 'inertia heading in panel');

    await shot('01-table-light.png');

    var durOpen = await evaluate('PGRE.examEngine.active().durationSec');
    await sleep(2200);
    var durLater = await evaluate('PGRE.examEngine.active().durationSec');
    check(durLater - durOpen >= 1.5, 'clock advanced while the table was open (' +
      durOpen.toFixed(2) + 's -> ' + durLater.toFixed(2) + 's)');

    await evaluate('document.documentElement.dataset.theme = "dark"');
    await sleep(200);
    await shot('02-table-dark.png');
    await evaluate('document.documentElement.dataset.theme = "light"');

    await send('Emulation.setDeviceMetricsOverride', {
      width: 700, height: 900, deviceScaleFactor: 1, mobile: false
    });
    await sleep(300);
    var overflow = await evaluate(`(function () {
      var de = document.documentElement;
      var body = document.body;
      return {
        scrollWidth: Math.max(de.scrollWidth, body.scrollWidth),
        clientWidth: de.clientWidth,
        overlayOverflow: document.getElementById('exam-table-overlay')
          ? document.getElementById('exam-table-overlay').scrollWidth : 0
      };
    })()`);
    check(overflow.scrollWidth <= overflow.clientWidth + 1,
      '700 px window has no horizontal page scroll (' + overflow.scrollWidth + ' / ' + overflow.clientWidth + ')');
    await shot('03-table-700.png');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1280, height: 900, deviceScaleFactor: 1, mobile: false
    });
    await sleep(200);

    await evaluate('document.getElementById("exam-table-close").click()');
    await until('!document.getElementById("exam-table-dialog")', 'closed by Close', 40);

    var after = await evaluate(`(function () {
      var exam = PGRE.examEngine.active();
      var main = document.querySelector('.exam-main');
      var heading = document.getElementById('exam-q-heading');
      var picked = document.querySelector('.choice.is-picked');
      return {
        cursor: exam.cursor,
        qid: exam.order[exam.cursor],
        answer: exam.answers[exam.order[exam.cursor]],
        scroll: main ? main.scrollTop : 0,
        heading: heading ? heading.textContent : '',
        pickedIdx: picked ? parseInt(picked.getAttribute('data-idx'), 10) : null,
        tableOpen: !!document.getElementById('exam-table-dialog')
      };
    })()`);
    check(after.cursor === before.cursor && after.qid === before.qid,
      'same question after close');
    check(after.answer === before.answer && after.pickedIdx === 2,
      'chosen answer unchanged after close');
    check(after.heading === before.heading, 'question heading unchanged after close');
    check(before.scroll >= 200, 'question was scrolled before opening the table (' + before.scroll + ')');
    check(Math.abs(after.scroll - before.scroll) < 2, 'scroll position unchanged after close (' +
      before.scroll + ' -> ' + after.scroll + ')');
    check(!after.tableOpen, 'panel is closed');

    await press('t', 'KeyT', 84);
    await until('!!(document.getElementById("exam-table-overlay") && document.getElementById("exam-table-overlay").classList.contains("is-open"))', 'opened by T');
    check(await evaluate('!!document.getElementById("exam-table-dialog") && document.getElementById("exam-table-overlay").classList.contains("is-open")'),
      'T opens the table');
    await press('t', 'KeyT', 84);
    await until('!document.getElementById("exam-table-dialog")', 'closed by T');
    check(!(await evaluate('!!document.getElementById("exam-table-dialog")')), 'T closes the table');

    await press('t', 'KeyT', 84);
    await until('!!(document.getElementById("exam-table-overlay") && document.getElementById("exam-table-overlay").classList.contains("is-open"))',
      'opened by T again');
    await press('Escape', 'Escape', 27);
    await until('!document.getElementById("exam-table-dialog")', 'closed by Escape');
    check(!(await evaluate('!!document.getElementById("exam-table-dialog")')), 'Escape closes the table');

    await evaluate('document.getElementById("exam-pause").click()');
    await until('!!document.querySelector(".exam-overlay.is-pause")', 'Paused card shown');
    await press('t', 'KeyT', 84);
    await sleep(400);
    var pausedT = await evaluate(`(function () {
      var exam = PGRE.examEngine.active();
      return {
        paused: !!(exam && exam.paused),
        pauseCard: !!document.querySelector('.exam-overlay.is-pause'),
        table: !!document.getElementById('exam-table-dialog')
      };
    })()`);
    check(pausedT.paused && pausedT.pauseCard && !pausedT.table,
      'T does nothing while the Paused card is shown');
    await evaluate('document.getElementById("exam-resume-btn").click()');
    await until('!document.querySelector(".exam-overlay.is-pause")', 'resumed after T-while-paused');

    var stillSame = await evaluate(`(function () {
      var exam = PGRE.examEngine.active();
      return exam.cursor === 0 && exam.answers[exam.order[0]] === 2;
    })()`);
    check(stillSame, 'question and answer still unchanged after key toggles');

    /* Enter goes to the next question. A choice keeps focus after a real
       click, and Enter must not press it a second time, which would clear
       the answer. On a control reached with Tab, Enter presses that control. */
    async function roomState() {
      return evaluate(`(function () {
        var exam = PGRE.examEngine.active(), ae = document.activeElement;
        function picked(i) { var a = exam.answers[exam.order[i]]; return a == null ? null : a; }
        return {
          cursor: exam.cursor, last: exam.order.length - 1,
          first: picked(0), second: picked(1), final: picked(exam.order.length - 1),
          focusChoice: ae && ae.classList.contains('choice') ? parseInt(ae.getAttribute('data-idx'), 10) : null,
          focusId: ae ? ae.id : ''
        };
      })()`);
    }
    await clickAt('document.querySelector(\'#exam-q .choice[data-idx="1"]\')', true);
    var room = await roomState();
    check(room.cursor === 0 && room.first === 1 && room.focusChoice === 1,
      'a real click on choice B answers question 1 and leaves focus on that choice');
    await pressEnter();
    room = await roomState();
    check(room.cursor === 1 && room.first === 1,
      'Enter then opens question 2, and question 1 keeps its answer');
    await press('ArrowLeft', 'ArrowLeft', 37);
    var wentBack = (await roomState()).cursor;
    await pressEnter();
    room = await roomState();
    check(wentBack === 0 && room.cursor === 1 && room.focusId === 'exam-q-heading',
      'Left arrow opens question 1 again and Enter opens question 2');
    // a bank question may hold a focusable box (a wide formula that scrolls) before its choices
    var tabOn = null;
    for (var tabPress = 0; tabPress < 6 && tabOn == null; tabPress++) {
      await press('Tab', 'Tab', 9);
      tabOn = (await roomState()).focusChoice;
    }
    await pressEnter();
    var afterPick = await roomState();
    await pressEnter();
    room = await roomState();
    check(tabOn === 0 && afterPick.cursor === 1 && afterPick.second === 0 && room.cursor === 1 && room.second === null,
      'Tab moves focus to choice A of question 2; Enter there presses that choice (picks it, then clears it) and stays on ' +
      'question 2 (focus on choice ' + tabOn + ', answer ' + afterPick.second + ' then ' + room.second + ')');
    await evaluate('document.querySelector(\'#exam-palette [data-goto="' + room.last + '"]\').click()');
    await until('PGRE.examEngine.active().cursor === ' + room.last, 'last question');
    /* clickAt records the choice's box, then sends the pointer later. A
       bank stem with an <img> can still move that box in the gap (the
       gitignored figure files are absent in this worktree, so the image
       finishes as a broken-icon layout). Wait until every image in the
       question has completed and the choice has sat still for two
       samples, then one click. The stored-answer check fails if that
       click missed. Enter then still fails the next check if it clears
       the pick or leaves the question. */
    var prevChoiceY = null;
    var lastChoiceReady = false;
    for (var settle = 0; settle < 40 && !lastChoiceReady; settle++) {
      var box = await evaluate(`(function () {
        var imgs = document.querySelectorAll('#exam-q img');
        var pending = 0;
        for (var i = 0; i < imgs.length; i++) if (!imgs[i].complete) pending++;
        var c = document.querySelector('#exam-q .choice[data-idx="0"]');
        var r = c ? c.getBoundingClientRect() : null;
        return { pending: pending, y: r ? r.top : null, h: r ? r.height : 0 };
      })()`);
      lastChoiceReady = box.pending === 0 && box.h > 0 && prevChoiceY != null &&
        Math.abs(prevChoiceY - box.y) < 0.5;
      prevChoiceY = box.y;
      if (!lastChoiceReady) await sleep(50);
    }
    if (!lastChoiceReady) throw new Error('timeout waiting for last question choice 0 to settle');
    await clickAt('document.querySelector(\'#exam-q .choice[data-idx="0"]\')', true);
    room = await roomState();
    check(room.cursor === room.last && room.final === 0,
      'click on the settled choice stored the answer');
    await pressEnter();
    room = await roomState();
    check(room.cursor === room.last && room.final === 0,
      'on the last question Enter stays there and keeps the clicked answer');
    check(await evaluate('document.getElementById("exam-next").title === "Next question (Right arrow or Enter)" && ' +
      'document.getElementById("exam-prev").title === "Previous question (Left arrow)"'),
      'the Back and Next buttons name their keys in their tooltips');

    /* Flags reach the agent status summary (js/status.js). Flag question 5,
       then question 2, so the stored click order is the reverse of the exam
       order; flag and unflag question 3; submit through the room's dialog. */
    async function flagQuestion(n) {
      await evaluate('document.querySelector(\'#exam-palette [data-goto="' + (n - 1) + '"]\').click()');
      await until('PGRE.examEngine.active().cursor === ' + (n - 1), 'question ' + n);
      await evaluate('document.getElementById("exam-flag").click()');
    }
    await flagQuestion(5);
    await flagQuestion(2);
    // answer question 2 right; the draw mixes fixture and bank questions, so read its key
    await evaluate(`(function () {
      var exam = PGRE.examEngine.active();
      var key = PGRE.questionById(exam.order[exam.cursor]).answer;
      document.querySelector('#exam-q .choice[data-idx="' + key + '"]').click();
    })()`);
    await flagQuestion(3);
    await evaluate('document.getElementById("exam-flag").click()');
    var sitting = await evaluate(`(function () {
      var exam = PGRE.examEngine.active();
      return { id: exam.id, order: exam.order.slice(), stored: exam.flags.slice() };
    })()`);
    check(sitting.stored.join(',') === [sitting.order[4], sitting.order[1]].join(','),
      'the room stores the flags in click order: question 5, then question 2');

    await evaluate('document.getElementById("exam-submit").click()');
    await until('!!document.getElementById("exam-confirm")', 'submit dialog');
    await evaluate('document.getElementById("exam-confirm").click()');
    await until('location.hash === ' + JSON.stringify('#/exam/review/' + sitting.id), 'results page');

    var examRows = await evaluate('PGRE.buildStatusSummary().exams');
    var examRow = examRows[0] || {};
    check(examRows.length === 1 && examRow.id === sitting.id,
      'the status summary lists the submitted sitting');
    check(JSON.stringify(examRow.flags) === JSON.stringify([sitting.order[1], sitting.order[4]]),
      'its flags are the flagged question ids in exam order (question 2, then question 5), without the unflagged question 3');
    check(Object.keys(examRow).join(',') === 'id,submittedAt,format,source,raw,total,scaledEst,flags',
      'the exam row carries ids and scores only: no answers map, question text, or choices');
    check(bridge.answered === 0, 'the status bridge on port ' + BRIDGE_PORT + ' received nothing (' + bridge.sent +
      ' request(s) blocked, ' + bridge.answered + ' answered)');

    /* Results page: the Flagged tile switches the review list to the flagged
       questions and scrolls to it; the tile and "Show all" both switch back. */
    async function reviewState() {
      return evaluate(`(function () {
        function seen(el) { return !!el && el.getClientRects().length > 0; }
        var cards = Array.prototype.slice.call(document.querySelectorAll('#exam-root .exam-review-q'));
        var tile = document.getElementById('exam-flagged-tile');
        var head = document.getElementById('exam-review-head');
        return {
          total: cards.length,
          shown: cards.map(function (c, i) { return seen(c) ? i + 1 : 0; }).filter(Boolean).join(','),
          chips: cards.filter(function (c) { return seen(c) && !!c.querySelector('.exam-flagchip'); }).length,
          tag: tile ? tile.tagName : '',
          pressed: tile ? tile.getAttribute('aria-pressed') : '',
          value: tile ? tile.querySelector('.stat-value').textContent : '',
          sub: tile ? tile.querySelector('.stat-sub').textContent : '',
          bar: seen(document.getElementById('exam-review-filter')),
          text: document.getElementById('exam-review-filter-text').textContent,
          all: document.getElementById('exam-review-all').textContent,
          headTop: Math.round(head.getBoundingClientRect().top),
          viewport: window.innerHeight,
          focus: document.activeElement ? document.activeElement.id : ''
        };
      })()`);
    }
    var everyCard = sitting.order.map(function (qid, i) { return i + 1; }).join(',');
    await until('!!document.getElementById("exam-flagged-tile")', 'Flagged tile');
    var review = await reviewState();
    check(review.tag === 'BUTTON' && review.value === '2' && review.pressed === 'false' &&
      review.sub === 'Show only these',
      'the Flagged tile is a button showing 2, not pressed, labelled "Show only these"');
    check(review.total === sitting.order.length && review.shown === everyCard && !review.bar,
      'the review list starts with all ' + sitting.order.length + ' questions and no filter line');
    // offsetTop is the laid-out position (tile in the row, plus label in its tile);
    // the entrance animation moves the tiles on screen but not these numbers
    var labelTops = await evaluate(`Array.prototype.map.call(
      document.querySelectorAll('.exam-result-stats .stat-label'),
      function (el) { return el.closest('.stat-tile').offsetTop + el.offsetTop; })`);
    check(labelTops.length === 4 && labelTops.every(function (t) { return t === labelTops[0]; }),
      'the four tile labels sit on one line (offsets ' + labelTops.join(', ') + ' px)');
    var startTop = review.headTop;

    await evaluate('document.getElementById("exam-flagged-tile").click()');
    review = await reviewState();
    await sleep(500);
    await shot('20-flagged-only.png');
    check(review.shown === '2,5' && review.chips === 2,
      'a click on the tile leaves questions 2 and 5, both with a Flagged chip (shown: ' + review.shown + ')');
    check(review.pressed === 'true' && review.sub === 'Show all ' + sitting.order.length,
      'the tile is pressed and labelled "Show all ' + sitting.order.length + '"');
    check(review.bar && review.text === 'Showing 2 flagged questions' &&
      review.all === 'Show all ' + sitting.order.length,
      'the filter line reads "Showing 2 flagged questions" beside "Show all ' + sitting.order.length + '"');
    check(review.headTop >= 0 && review.headTop < review.viewport && review.headTop < startTop &&
      review.focus === 'exam-review-title',
      'the page scrolled to the review heading and moved focus to it (top ' + startTop + ' px, then ' +
      review.headTop + ' px)');

    await evaluate('document.getElementById("exam-flagged-tile").click()');
    review = await reviewState();
    check(review.shown === everyCard && review.pressed === 'false' && !review.bar &&
      review.sub === 'Show only these' && review.text === '',
      'a second click on the tile shows every question again');

    await evaluate('document.getElementById("exam-flagged-tile").click()');
    await evaluate('window.scrollTo(0, 0)');
    await sleep(300);
    await shot('21-tile-pressed.png');
    await evaluate('document.getElementById("exam-review-all").click()');
    review = await reviewState();
    check(review.shown === everyCard && review.pressed === 'false' && !review.bar &&
      review.focus === 'exam-review-title',
      '"Show all" shows every question again and keeps focus on the review heading');

    /* Results page: the question navigator beside the cards. Question 2 was
       answered right and flagged; question 5 was flagged and left blank. */
    async function navState() {
      return evaluate(`(function () {
        function seen(el) { return !!el && el.getClientRects().length > 0; }
        function numbers(list, test) {
          return list.map(function (el, i) { return test(el) ? i + 1 : 0; }).filter(Boolean).join(',');
        }
        var nav = document.getElementById('exam-review-nav');
        var cells = Array.prototype.slice.call(nav.querySelectorAll('.pal-cell'));
        var cards = Array.prototype.slice.call(document.querySelectorAll('#exam-root .exam-review-q'));
        var toggle = document.getElementById('exam-nav-flagged');
        var exam = PGRE.examEngine.byId(${JSON.stringify(sitting.id)});
        function top(i) { return seen(cards[i]) ? Math.round(cards[i].getBoundingClientRect().top) : null; }
        return {
          seen: seen(nav),
          cells: cells.length,
          scored: numbers(exam.order, function (qid) {
            var q = PGRE.questionById(qid);
            return !!q && exam.answers[qid] === q.answer;
          }),
          right: numbers(cells, function (c) { return c.classList.contains('is-correct'); }),
          flagged: numbers(cells, function (c) { return c.classList.contains('is-flagged'); }),
          current: numbers(cells, function (c) { return c.getAttribute('aria-current') === 'true'; }),
          disabled: cells.filter(function (c) { return c.disabled; }).length,
          agree: cells.every(function (c, i) {
            var right = cards[i].classList.contains('is-right');
            return c.classList.contains('is-correct') === right && c.classList.contains('is-wrong') !== right;
          }),
          labels: cells[1].getAttribute('aria-label') + ' | ' + cells[4].getAttribute('aria-label'),
          pressed: toggle ? toggle.getAttribute('aria-pressed') : '',
          tile: document.getElementById('exam-flagged-tile').getAttribute('aria-pressed'),
          shown: numbers(cards, seen),
          top4: top(3),
          top5: top(4),
          navTop: Math.round(nav.getBoundingClientRect().top),
          viewport: window.innerHeight,
          pageWidth: document.documentElement.scrollWidth,
          windowWidth: document.documentElement.clientWidth
        };
      })()`);
    }
    function near(value, target) { return value != null && Math.abs(value - target) <= 2; }
    var total = sitting.order.length;
    var nav = await navState();
    check(nav.seen && nav.cells === total && nav.pressed === 'false' && nav.disabled === 0,
      'the question navigator shows ' + total + ' enabled cells and an unpressed "Flagged only" toggle');
    check(nav.right === nav.scored && nav.right.split(',').indexOf('2') !== -1 && nav.flagged === '2,5' && nav.agree,
      'its cells mark the right answers (' + nav.right + ', question 2 among them) and questions 2 and 5 flagged, ' +
      'and agree with every review card');
    check(nav.labels === 'Question 2, right, flagged | Question 5, wrong, flagged',
      'cell labels state the result and the flag (' + nav.labels + ')');

    await evaluate('document.querySelector(\'#exam-review-nav [data-review-goto="3"]\').click()');
    nav = await navState();
    check(near(nav.top4, 64) && nav.current === '4',
      'a click on cell 4 puts question 4 under the top bar and rings that cell (top ' + nav.top4 + ' px)');
    check(near(nav.navTop, 72), 'the navigator stays in view while the page scrolls (top ' + nav.navTop + ' px)');

    await evaluate('document.getElementById("exam-nav-flagged").click()');
    nav = await navState();
    await sleep(300);
    await shot('22-nav-flagged-only.png');
    check(nav.shown === '2,5' && nav.pressed === 'true' && nav.tile === 'true' && nav.disabled === total - 2,
      'the navigator toggle shows the flagged questions only, presses the Flagged tile, and disables ' +
      (total - 2) + ' cells');
    check(nav.top5 != null && nav.top5 >= 0 && nav.top5 < nav.viewport && nav.current === '5',
      'from question 4 the page moves to question 5, the next flagged question (top ' + nav.top5 + ' px)');

    await evaluate('document.getElementById("exam-nav-flagged").click()');
    nav = await navState();
    await sleep(300);
    await shot('23-nav-all.png');
    check(nav.shown === everyCard && nav.pressed === 'false' && nav.tile === 'false' && nav.disabled === 0,
      'the navigator toggle shows every question again and releases the Flagged tile');
    check(near(nav.top5, 64) && nav.current === '5',
      'question 5 stays under the top bar when the other questions return (top ' + nav.top5 + ' px)');

    await evaluate('window.scrollTo(0, 0)');
    await sleep(200);
    nav = await navState();
    check(nav.current === '', 'no cell is ringed above the review list');

    /* Results page keys: Right arrow or Enter for the next shown question,
       Left arrow for the previous one. `ring` is the question number of the
       ringed navigator cell, 0 when none. */
    async function keyState() {
      return evaluate(`(function () {
        function seen(el) { return !!el && el.getClientRects().length > 0; }
        var cards = Array.prototype.slice.call(document.querySelectorAll('#exam-root .exam-review-q'));
        var cells = Array.prototype.slice.call(document.querySelectorAll('#exam-review-nav .pal-cell'));
        var ring = -1;
        cells.forEach(function (c, i) { if (c.getAttribute('aria-current') === 'true') ring = i; });
        var ae = document.activeElement;
        var band = ae && ae.tagName === 'SUMMARY' ? ae.parentNode : null;
        return {
          ring: ring + 1,
          top: ring >= 0 && seen(cards[ring]) ? Math.round(cards[ring].getBoundingClientRect().top) : null,
          focusCard: cards.indexOf(ae) + 1,
          focusTag: ae ? ae.tagName : '',
          atEnd: window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2,
          bandFocused: !!band && band.classList.contains('exam-review-choices'),
          bandOpen: !!band && band.open,
          bandChoices: band ? band.querySelectorAll('.choice').length : 0,
          // a closed band keeps boxes for its content, so ask the browser whether a choice is rendered
          bandSeen: band ? Array.prototype.filter.call(band.querySelectorAll('.choice'),
            function (row) { return row.checkVisibility(); }).length : 0,
          solutionsOpen: cards.map(function (c, i) {
            var d = c.querySelector('details.miss:not(.exam-review-choices):not(.exam-review-pick):not(.distractors)');
            return d && d.open ? i + 1 : 0;
          }).filter(Boolean).join(','),
          hint: (document.querySelector('#exam-review-nav .practice-keys') || {}).textContent || ''
        };
      })()`);
    }
    await press('ArrowRight', 'ArrowRight', 39);
    var keys = await keyState();
    check(keys.ring === 1 && near(keys.top, 64) && keys.focusCard === 1,
      'from the top of the page the Right arrow puts question 1 under the top bar and moves focus to its card (top ' +
      keys.top + ' px)');
    check(keys.hint === '← previous → or Enter next', 'the navigator names the keys (' + keys.hint + ')');
    await pressEnter();
    keys = await keyState();
    check(keys.ring === 2 && near(keys.top, 64), 'Enter opens question 2 (top ' + keys.top + ' px)');
    await press('ArrowLeft', 'ArrowLeft', 37);
    var backTo = (await keyState()).ring;
    await press('ArrowLeft', 'ArrowLeft', 37);
    keys = await keyState();
    check(backTo === 1 && keys.ring === 1 && near(keys.top, 64),
      'the Left arrow opens question 1 again, and a second press stays on question 1');

    // a real click on a Solution heading leaves focus there; question 1 or 2, whichever is not the tall fixture
    var base = sitting.order[0] === 'toi-q0' ? 2 : 1;
    if (base === 2) await press('ArrowRight', 'ArrowRight', 39);
    await clickAt('document.querySelectorAll("#exam-root .exam-review-q")[' + (base - 1) +
      '].querySelector("details.miss:not(.exam-review-choices):not(.exam-review-pick):not(.distractors) > summary")');
    var opened = await keyState();
    await pressEnter();
    keys = await keyState();
    check(opened.solutionsOpen === String(base) && opened.focusTag === 'SUMMARY' &&
      keys.ring === base + 1 && keys.solutionsOpen === String(base),
      'after a real click opens the Solution of question ' + base + ', Enter opens question ' + (base + 1) +
      ' and leaves that Solution open');

    // inside the note field the keys belong to the text
    await evaluate('document.querySelectorAll("#exam-root .exam-review-q")[' + base +
      '].querySelector("textarea[data-note]").focus({ preventScroll: true })');
    await press('ArrowRight', 'ArrowRight', 39);
    await press('Enter', 'Enter', 13);
    keys = await keyState();
    check(keys.ring === base + 1 && keys.focusTag === 'TEXTAREA',
      'the Right arrow and Enter move nothing while the note field of question ' + (base + 1) + ' has focus');

    // Tab from the note field reaches the next "All choices" heading; Enter there opens that band
    for (var tabs = 0; tabs < 4 && !(await keyState()).bandFocused; tabs++) await press('Tab', 'Tab', 9);
    var onBand = await keyState();
    await pressEnter();
    keys = await keyState();
    await sleep(300);
    await shot('24-all-choices.png');
    check(onBand.bandFocused && !onBand.bandOpen && onBand.bandSeen === 0 && keys.bandFocused && keys.bandOpen &&
      keys.bandChoices > 1 && keys.bandSeen === keys.bandChoices && keys.ring === onBand.ring,
      'Enter on an "All choices" heading reached with Tab opens that band (' + onBand.bandSeen + ' choices shown before, ' +
      keys.bandSeen + ' of ' + keys.bandChoices + ' after) and does not move to another question');

    var bands = await evaluate(`(function () {
      var exam = PGRE.examEngine.byId(${JSON.stringify(sitting.id)});
      var cards = Array.prototype.slice.call(document.querySelectorAll('#exam-root .exam-review-q'));
      var bad = [], closed = 0;
      cards.forEach(function (card, i) {
        var q = PGRE.questionById(exam.order[i]);
        var picked = exam.answers[exam.order[i]];
        var band = card.querySelector('details.exam-review-choices');
        var rows = band ? Array.prototype.slice.call(band.querySelectorAll('.choice')) : [];
        var next = band && band.nextElementSibling;
        if (band && !band.open) closed++;
        var ok = !!q && !!band && band.querySelector('summary').textContent === 'All choices' &&
          !!next && next.tagName === 'DETAILS' && next.querySelector('summary').textContent === 'Solution' &&
          rows.length === q.choices.length &&
          rows.every(function (row, idx) {
            return row.disabled && row.querySelector('.choice-letter').textContent === 'ABCDE'.charAt(idx) &&
              row.classList.contains('is-answer') === (idx === q.answer) &&
              row.classList.contains('is-wrong') === (idx === picked && idx !== q.answer) &&
              (row.getAttribute('aria-pressed') === 'true') === (idx === picked);
          });
        if (!ok) bad.push(i + 1);
      });
      return { cards: cards.length, closed: closed, bad: bad.join(',') };
    })()`);
    check(bands.cards === total && bands.bad === '' && bands.closed === total - 1,
      'every review card has an "All choices" band directly above "Solution": each choice with its letter, the key and ' +
      'the pick marked as the sitting recorded them, closed until opened (' + bands.closed + ' of ' + bands.cards +
      ' closed' + (bands.bad ? ', wrong on questions ' + bands.bad : '') + ')');

    var pickBands = await evaluate(`(function () {
      var exam = PGRE.examEngine.byId(${JSON.stringify(sitting.id)});
      var LETTERS = 'ABCDE';
      var cards = Array.prototype.slice.call(document.querySelectorAll('#exam-root .exam-review-q'));
      var bad = [], open = 0, flaggedOk = true, letterLeak = [];
      function attrsLeak(el) {
        if (!el || !el.attributes) return false;
        return Array.prototype.some.call(el.attributes, function (a) {
          var n = a.name, v = a.value || '';
          return (n === 'aria-label' || n === 'title' || n.indexOf('data-') === 0) &&
            /\\b[A-E]\\b/.test(v);
        });
      }
      cards.forEach(function (card, i) {
        var qid = exam.order[i];
        var q = PGRE.questionById(qid);
        var picked = exam.answers[qid];
        var pickedNull = picked == null;
        var hasKey = q && typeof q.answer === 'number';
        var correct = hasKey && picked === q.answer;
        var flagged = exam.flags.indexOf(qid) !== -1;
        var rows = Array.prototype.slice.call(card.querySelectorAll('details.exam-review-pick'));
        rows.forEach(function (row) { if (row.open) open++; });
        var labels = rows.map(function (row) {
          return (row.querySelector('summary') || {}).textContent.trim();
        });
        var expected;
        if (pickedNull) expected = ['Left blank', 'Correct answer'];
        else if (!correct) expected = ['You picked', 'Correct answer'];
        else expected = ['You picked'];
        var kinds = rows.map(function (row) {
          return row.classList.contains('is-bad') ? 'bad' : (row.classList.contains('is-good') ? 'good' : '?');
        });
        var expectedKinds = correct ? ['good'] : ['bad', 'good'];
        var bodiesOk = rows.every(function (row, ri) {
          var bodyEl = row.querySelector('.exam-review-pick-body');
          var text = bodyEl ? bodyEl.textContent.replace(/\\s+/g, ' ').trim() : '';
          if (labels[ri] === 'Left blank') return !bodyEl;
          if (!hasKey && labels[ri] === 'Correct answer') return !bodyEl;
          var want = (labels[ri] === 'You picked' && !pickedNull) ? LETTERS.charAt(picked)
            : LETTERS.charAt(q.answer);
          return !!bodyEl && text.indexOf(want + ' —') === 0 && text.length > (want + ' —').length;
        });
        var allChoices = card.querySelector('details.exam-review-choices');
        var afterPicks = rows.length ? rows[rows.length - 1].nextElementSibling : null;
        if (correct && afterPicks && afterPicks.classList.contains('conf-row')) {
          afterPicks = afterPicks.nextElementSibling;
        }
        var chip = card.querySelector('.exam-flagchip');
        if (!!chip !== flagged) flaggedOk = false;
        var foldedOk = rows.every(function (row) {
          var summary = row.querySelector('summary');
          var label = (summary || {}).textContent.trim();
          return !/\\b[A-E]\\b/.test(label) && !attrsLeak(row) && !attrsLeak(summary);
        });
        if (!foldedOk) letterLeak.push(i + 1);
        var ok = !!q && rows.length === expected.length &&
          labels.join('|') === expected.join('|') &&
          kinds.join('|') === expectedKinds.join('|') &&
          bodiesOk && afterPicks === allChoices && foldedOk &&
          rows.every(function (row) { return row.tagName === 'DETAILS' && !row.open; });
        if (!ok) bad.push(i + 1);
      });
      return { cards: cards.length, open: open, bad: bad.join(','), flaggedOk: flaggedOk,
        letterLeak: letterLeak.join(',') };
    })()`);
    check(pickBands.cards === total && pickBands.bad === '' && pickBands.open === 0 && pickBands.flaggedOk,
      'every review card folds the pick and correct rows as closed details bands under the stem, with ' +
      'letter-free headers (You picked / Correct answer / Left blank) and the Flagged chip still on the card head' +
      (pickBands.bad ? ' (wrong on questions ' + pickBands.bad + ')' : ''));
    check(pickBands.letterLeak === '',
      'folded pick and key headers carry no choice letter in summary, aria-label, title, or data-*' +
      (pickBands.letterLeak ? ' (leaked on questions ' + pickBands.letterLeak + ')' : ''));

    var nokey = await evaluate(`(function () {
      var q = {
        id: 'bands-nokey', topic: 'cm', difficulty: 1,
        q: 'A question whose bank row has no recorded key.',
        choices: ['$C_P$', '$C_V$', '$\\\\gamma$', '$R$', '$T$'],
        sol: 'No key was stored.'
      };
      PGRE.QUESTIONS.push(q);
      if (typeof PGRE._resetBankCache === 'function') PGRE._resetBankCache();
      var exam = {
        id: 'ex-bands-nokey',
        startedAt: new Date().toISOString(),
        submittedAt: new Date().toISOString(),
        format: '70x120', source: null, title: 'No-key fixture', seed: 1,
        order: [q.id], answers: { 'bands-nokey': 0 }, flags: [],
        cursor: 0, paused: false, durationSec: 1, limitSec: 7200,
        raw: 0, total: 1, scaledEst: 390, perTopic: { cm: { right: 0, total: 1 } }
      };
      PGRE.store.state.exams.push(exam);
      PGRE.store.save();
      location.hash = '#/exam/review/ex-bands-nokey';
      if (typeof PGRE.route === 'function') PGRE.route();
      var card = document.querySelector('#exam-root .exam-review-q');
      var rows = card ? Array.prototype.slice.call(card.querySelectorAll('details.exam-review-pick')) : [];
      var labels = rows.map(function (row) {
        return (row.querySelector('summary') || {}).textContent.trim();
      });
      var bodies = rows.map(function (row) {
        var el = row.querySelector('.exam-review-pick-body');
        return el ? el.textContent.replace(/\\s+/g, ' ').trim() : '';
      });
      function attrsLeak(el) {
        if (!el || !el.attributes) return false;
        return Array.prototype.some.call(el.attributes, function (a) {
          var n = a.name, v = a.value || '';
          return (n === 'aria-label' || n === 'title' || n.indexOf('data-') === 0) &&
            /\\b[A-E]\\b/.test(v);
        });
      }
      var foldedOk = rows.every(function (row) {
        var summary = row.querySelector('summary');
        return !row.open && !/\\b[A-E]\\b/.test((summary || {}).textContent.trim()) &&
          !attrsLeak(row) && !attrsLeak(summary);
      });
      return {
        labels: labels.join('|'),
        kinds: rows.map(function (row) {
          return row.classList.contains('is-bad') ? 'bad' : (row.classList.contains('is-good') ? 'good' : '?');
        }).join('|'),
        bodies: bodies,
        foldedOk: foldedOk,
        undefinedText: (card && card.innerHTML.indexOf('undefined') !== -1)
      };
    })()`);
    check(nokey.labels === 'You picked|Correct answer' && nokey.kinds === 'bad|good' &&
      nokey.bodies[0].indexOf('A —') === 0 && nokey.bodies[1] === '' &&
      nokey.foldedOk && !nokey.undefinedText,
      'a pick with no recorded key is two closed letter-free bands: "You picked" with the letter in the body, ' +
      '"Correct answer" with no body');
    await evaluate('location.hash = ' + JSON.stringify('#/exam/review/' + sitting.id) +
      '; if (typeof PGRE.route === "function") PGRE.route();');
    await until('document.querySelectorAll("#exam-root .exam-review-q").length === ' + total,
      'original review sitting restored');

    // a dark-theme picture for a human check; transitions are off so the capture shows the final colours
    await evaluate(`(function () {
      var off = document.createElement('style');
      off.id = 'test-no-transition';
      off.textContent = '*, *::before, *::after { transition: none !important; }';
      document.head.appendChild(off);
      PGRE.applyTheme('dark');
    })()`);
    await sleep(400);
    await shot('25-all-choices-dark.png');
    await evaluate('PGRE.applyTheme(PGRE.store.state.settings.theme)');
    await sleep(200);
    await evaluate('document.getElementById("test-no-transition").remove()');

    // with "Flagged only" on, the keys move among questions 2 and 5
    await evaluate('document.getElementById("exam-nav-flagged").click()');
    await evaluate('document.querySelector(\'#exam-review-nav [data-review-goto="1"]\').click()');
    var walk = [(await keyState()).ring];
    for (var hop = 0; hop < 4; hop++) {
      await press(hop < 2 ? 'ArrowRight' : 'ArrowLeft', hop < 2 ? 'ArrowRight' : 'ArrowLeft', hop < 2 ? 39 : 37);
      walk.push((await keyState()).ring);
    }
    check(walk.join(',') === '2,5,5,2,2',
      'with "Flagged only" on: from question 2 the Right arrow opens 5 and stops there, the Left arrow opens 2 and stops there (' +
      walk.join(', ') + ')');
    await evaluate('document.getElementById("exam-nav-flagged").click()');

    /* End of the page. The last two cards are made short, so neither can
       reach the top bar: the ring must still name the question asked for,
       and the Left arrow must walk back one question at a time. */
    await evaluate(`Array.prototype.slice.call(document.querySelectorAll('#exam-root .exam-review-q'), -2)
      .forEach(function (card) { card.style.height = '120px'; card.style.overflow = 'hidden'; })`);
    await evaluate('document.querySelector(\'#exam-review-nav [data-review-goto="' + (total - 2) + '"]\').click()');
    await sleep(150);
    var end = await keyState();
    walk = [end.ring];
    for (hop = 0; hop < 5; hop++) {
      await press(hop < 2 ? 'ArrowRight' : 'ArrowLeft', hop < 2 ? 'ArrowRight' : 'ArrowLeft', hop < 2 ? 39 : 37);
      walk.push((await keyState()).ring);
    }
    check(end.atEnd && end.top > 96,
      'a click on cell ' + (total - 1) + ' reaches the end of the page before that question reaches the top bar (top ' +
      end.top + ' px)');
    check(walk.join(',') === [total - 1, total, total, total - 1, total - 2, total - 3].join(','),
      'there the ring names question ' + (total - 1) + '; the Right arrow opens ' + total + ' and stops; the Left arrow opens ' +
      (total - 1) + ', ' + (total - 2) + ', ' + (total - 3) + ' in turn (' + walk.join(', ') + ')');
    await evaluate('window.scrollTo(0, 0)');
    await sleep(200);

    await send('Emulation.setDeviceMetricsOverride', {
      width: 700, height: 900, deviceScaleFactor: 1, mobile: false
    });
    await sleep(300);
    nav = await navState();
    check(!nav.seen && nav.pageWidth <= nav.windowWidth,
      'a 700 px window hides the navigator and has no horizontal page scroll (' + nav.pageWidth + ' / ' +
      nav.windowWidth + ')');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1280, height: 900, deviceScaleFactor: 1, mobile: false
    });
    await sleep(200);

    await evaluate('location.hash = "#/"');
    await until('!document.getElementById("exam-root") && !document.body.classList.contains("exam-fullscreen")', 'dashboard');
    check(!(await evaluate('!!document.getElementById("exam-table-btn")')),
      'Table of Information control is absent on the dashboard');

    await evaluate('location.hash = "#/exam"');
    await until('!!document.getElementById("exam-root")', 'exam setup again');
    await sleep(200);
    check(!(await evaluate('!!document.getElementById("exam-table-btn")')),
      'Table of Information control is absent on exam setup after leaving the room');

    if (failed) {
      await shot('99-failure.png');
      throw new Error(failed + ' checks failed');
    }
    console.log('\n' + passed + ' passed, 0 failed');
  } finally {
    if (ws) try { ws.close(); } catch (e) {}
    await stopChrome(chrome);
    await new Promise(function (r) { server.close(r); });
    if (!KEEP_ARTIFACTS) {
      try { fs.rmSync(ARTIFACT_DIR, { recursive: true, force: true }); } catch (e) {}
    }
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (e) {}
  }
}

main().catch(function (err) {
  console.error(err && err.stack || err);
  process.exit(1);
});
