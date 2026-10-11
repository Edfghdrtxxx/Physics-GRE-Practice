#!/usr/bin/env node
/* Headless Chrome, end to end: Table of Information in the mock-exam room.
   Starts a sitting on fixture questions, opens the table by button and by
   key, checks every official entry, checks the clock advanced while open,
   closes, checks the question and chosen answer are unchanged, and checks
   the control is absent outside the room. Before leaving the room it flags
   questions with the room's flag button, submits the sitting, and checks
   the flag list in PGRE.buildStatusSummary().exams.
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
      return {
        cursor: exam.cursor,
        qid: exam.order[exam.cursor],
        answer: exam.answers[exam.order[exam.cursor]],
        duration: exam.durationSec,
        scroll: main ? main.scrollTop : 0,
        heading: heading ? heading.textContent : '',
        paused: exam.paused
      };
    })()`);
    check(before.answer === 2, 'chose Charlie (index 2) on question 1');
    check(before.cursor === 0 && before.paused === false, 'sitting is on question 1 with the clock running');

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
