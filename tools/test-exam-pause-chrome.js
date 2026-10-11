#!/usr/bin/env node
/* Real-page check of the mock-exam Paused card: start a sitting from the
   exam page, answer some questions, flag one, pause, check the bar and
   every number against the sitting, reject spoiler copy, confirm the clock
   stays stopped, then resume and confirm it runs again. Synthetic questions
   in an isolated Chrome profile on a throwaway port; never the saved
   profile. Requests to the OrbitOS status bridge (127.0.0.1:4789) are
   refused by the page's Content-Security-Policy.
   Run: node tools/test-exam-pause-chrome.js
   PGRE_PAUSE_SHOTS=<dir> also saves light, dark, and 700 px screenshots. */
'use strict';

var fs = require('fs');
var http = require('http');
var os = require('os');
var path = require('path');
var spawn = require('child_process').spawn;
var ROOT = path.resolve(__dirname, '..');
var MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.svg': 'image/svg+xml'
};
/* js/status.js posts the status summary to the OrbitOS status bridge on
   127.0.0.1:4789. chrome-devtools-axi cannot block a URL, so the test server
   sends a Content-Security-Policy that lets the page connect to this server
   only. Chrome then refuses the bridge request, so this fixture sitting never
   replaces the snapshot agents read, and reports the refusal to
   CSP_REPORT_PATH. */
var BRIDGE_PORT = 4789; // js/status.js ENDPOINT
var CSP_REPORT_PATH = '/__csp-report';
var PAGE_CSP = "connect-src 'self'; report-uri " + CSP_REPORT_PATH;
function isBridgeUrl(u) { return /^https?:\/\/(127\.0\.0\.1|localhost):4789(\/|$)/.test(String(u)); }

async function helpers(page) {
  var URL = process.env.PGRE_PAUSE_TEST_URL;
  var QUESTIONS = [];
  for (var n = 1; n <= 5; n++) {
    QUESTIONS.push({
      id: 'pause-info-q' + n,
      topic: 'cm',
      difficulty: 1,
      q: '<p>SPOILERSTEM pause-info unique stem ' + n +
        ' mentions accuracy score correct wrong right.</p>',
      choices: [
        'SPOILERCHOICE-A-' + n,
        'SPOILERCHOICE-B-' + n,
        'Choice C ' + n,
        'Choice D ' + n,
        'Choice E ' + n
      ],
      answer: 0,
      sol: '<p>SPOILERSOL the correct answer is A.</p>'
    });
  }
  function sleep(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
  var h = { sleep: sleep };

  h.assert = function (condition, message) {
    if (!condition) throw new Error(message);
    console.log('PASS: ' + message);
  };

  h.wait = async function (expression, what) {
    for (var attempt = 0; attempt < 100; attempt++) {
      if (await page.eval(expression)) return;
      await sleep(100);
    }
    throw new Error('Timeout waiting for ' + what);
  };

  h.click = async function (selector) {
    await page.eval('() => { var b = document.querySelector(' + JSON.stringify(selector) +
      '); b.focus(); b.click(); }');
  };

  h.inject = async function () {
    await h.wait('!!document.getElementById("main")', '#main');
    await page.eval('() => { var bank = ' + JSON.stringify(QUESTIONS) + ';' +
      'PGRE.BOOK_EXAMS = [{ id: "pause-info-exam", title: "Pause-info test exam",' +
      '  format: "70x120", questions: bank }];' +
      'PGRE._resetBankCache(); }');
  };

  h.startSitting = async function () {
    await page.open(URL + '#/');
    await h.inject();
    await page.eval('() => { location.hash = "#/exam"; }');
    await h.wait('!!document.querySelector(\'[data-replay="pause-info-exam"]\')',
      'the pause-info replay button');
    await h.click('[data-replay="pause-info-exam"]');
    await h.wait('location.hash === "#/exam/run" && document.body.classList.contains("exam-fullscreen") && ' +
      '!!document.getElementById("exam-q-heading")', 'the mock-exam room');
  };

  h.card = async function () {
    return JSON.parse(await page.eval(function () {
      function clock(sec) {
        sec = Math.max(0, Math.round(sec));
        var hr = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
        var mm = hr ? String(m).padStart(2, '0') : String(m);
        return (hr ? hr + ':' : '') + mm + ':' + String(s).padStart(2, '0');
      }
      var exam = PGRE.examEngine.active();
      var card = document.querySelector('.exam-overlay-card.is-pause-card');
      var overlay = document.querySelector('.exam-overlay.is-pause');
      var fill = document.querySelector('.exam-pause-meter .meter-fill');
      var doc = document.documentElement;
      var answered = exam ? exam.order.filter(function (id) { return exam.answers[id] != null; }).length : 0;
      var unanswered = exam ? exam.order.length - answered : 0;
      return JSON.stringify({
        hash: location.hash,
        paused: !!(exam && exam.paused),
        durationSec: exam ? exam.durationSec : null,
        limitSec: exam ? exam.limitSec : null,
        cursor: exam ? exam.cursor : null,
        total: exam ? exam.order.length : 0,
        answered: answered,
        unanswered: unanswered,
        flagged: exam && exam.flags ? exam.flags.length : 0,
        answers: exam ? exam.answers : {},
        flags: exam ? exam.flags : [],
        clockUsed: exam ? clock(exam.durationSec) : '',
        clockRemain: exam ? clock(Math.max(0, exam.limitSec - exam.durationSec)) : '',
        avg: exam && answered ? clock(exam.durationSec / answered) : '',
        remainEach: exam && unanswered ? clock(Math.max(0, exam.limitSec - exam.durationSec) / unanswered) : '',
        hasCard: !!card,
        heading: card && card.querySelector('h2') ? card.querySelector('h2').textContent : '',
        sentence: card && card.querySelector('p.muted') ? card.querySelector('p.muted').textContent : '',
        resume: card && document.getElementById('exam-resume-btn')
          ? document.getElementById('exam-resume-btn').textContent : '',
        count: card && document.getElementById('exam-pause-count')
          ? document.getElementById('exam-pause-count').textContent : '',
        used: card && document.getElementById('exam-pause-used')
          ? document.getElementById('exam-pause-used').textContent : '',
        remain: card && document.getElementById('exam-pause-remain')
          ? document.getElementById('exam-pause-remain').textContent : '',
        onQ: card && document.getElementById('exam-pause-cursor')
          ? document.getElementById('exam-pause-cursor').textContent : '',
        blank: card && document.getElementById('exam-pause-blank')
          ? document.getElementById('exam-pause-blank').textContent : '',
        flaggedText: card && document.getElementById('exam-pause-flagged')
          ? document.getElementById('exam-pause-flagged').textContent : '',
        pace: card && document.getElementById('exam-pause-pace')
          ? document.getElementById('exam-pause-pace').textContent : '',
        cardText: card ? card.textContent : '',
        hasChoice: !!(card && card.querySelector('.choice, .q-text, .hist-mark')),
        fillPct: fill && fill.style.width ? parseFloat(fill.style.width) : null,
        overlayBg: overlay ? getComputedStyle(overlay).backgroundColor : '',
        overlayZ: overlay ? getComputedStyle(overlay).zIndex : '',
        theme: document.documentElement.dataset.theme || 'light',
        scroll: {
          doc: doc.scrollWidth,
          client: doc.clientWidth,
          body: document.body.scrollWidth,
          card: card ? card.scrollWidth : 0,
          cardClient: card ? card.clientWidth : 0
        }
      });
    }));
  };

  return h;
}

var STAGES = [
  { name: 'pause-light', size: '1280x800x2', shot: 'pause-card-light', run: async function (page, h) {
    await h.startSitting();
    await h.click('.choice[data-idx="1"]');
    await h.click('#exam-next');
    await h.wait('document.querySelector("#exam-q-heading").textContent.indexOf("Question 2") !== -1',
      'question 2');
    await h.click('.choice[data-idx="2"]');
    await h.click('#exam-flag');
    await h.click('#exam-next');
    await h.wait('document.querySelector("#exam-q-heading").textContent.indexOf("Question 3") !== -1',
      'question 3');
    await h.sleep(1200);
    await h.click('#exam-pause');
    await h.wait('!!document.querySelector(".exam-overlay-card.is-pause-card")', 'the Paused card');

    var u = await h.card();
    h.assert(u.heading === 'Paused', 'heading is still Paused');
    h.assert(u.sentence.indexOf('The clock is stopped and the questions are hidden.') !== -1 &&
      u.sentence.indexOf("A real GRE") !== -1 &&
      u.sentence.indexOf('use this sparingly so your practice reflects true test conditions.') !== -1,
      'the original pause sentence is still on the card');
    h.assert(u.resume === 'Resume exam', 'Resume exam is still the button');
    h.assert(u.answered === 2 && u.total === 5 && u.count === '2 of 5 answered',
      'progress reads 2 of 5 answered');
    h.assert(u.fillPct === 40, 'the meter fill is 40% for 2 of 5');
    h.assert(u.used === u.clockUsed, 'time used matches the stopped clock');
    h.assert(u.remain === u.clockRemain, 'time remaining matches the stopped clock');
    h.assert(u.onQ === '3 of 5' && u.cursor === 2, 'the card shows question 3 of 5');
    h.assert(u.blank === '3' && u.unanswered === 3, 'not yet answered is 3');
    h.assert(u.flaggedText === '1' && u.flagged === 1, 'flagged for review is 1');
    h.assert(u.pace.indexOf('Average ' + u.avg + ' per answered question.') !== -1,
      'pace uses time used divided by answered questions');
    h.assert(u.pace.indexOf('Remaining clock allows ' + u.remainEach + ' per leftover question.') !== -1,
      'leftover pace uses remaining clock divided by unanswered questions');

    var lower = u.cardText.toLowerCase();
    ['accuracy', 'score', 'correct', 'incorrect', 'wrong', 'scaled', 'raw score'].forEach(function (word) {
      h.assert(lower.indexOf(word) === -1, 'Paused card does not say "' + word + '"');
    });
    h.assert(u.cardText.indexOf('SPOILERSTEM') === -1 &&
      u.cardText.indexOf('SPOILERCHOICE') === -1 &&
      u.cardText.indexOf('SPOILERSOL') === -1 &&
      !u.hasChoice,
      'Paused card does not show question text, choices, or right/wrong marks');
    h.assert(u.overlayBg && u.overlayBg !== 'rgba(0, 0, 0, 0)' && u.overlayBg !== 'transparent',
      'pause overlay backdrop is opaque');

    var frozen = u.durationSec;
    await h.sleep(1500);
    var still = await h.card();
    h.assert(still.paused && still.durationSec === frozen,
      'the clock stays stopped while the Paused card is shown');
    h.assert(still.hasCard && still.resume === 'Resume exam', 'the card is still up after the wait');
  } },

  { name: 'pause-dark', size: '1280x800x2', shot: 'pause-card-dark', run: async function (page, h) {
    await page.eval('() => { PGRE.setTheme("dark"); }');
    await h.sleep(200);
    var u = await h.card();
    h.assert(u.theme === 'dark' && u.hasCard && u.count === '2 of 5 answered',
      'dark theme keeps the same Paused card');
  } },

  { name: 'pause-700', size: '700x800x2', shot: 'pause-card-700', run: async function (page, h) {
    await page.eval('() => { PGRE.setTheme("light"); }');
    await h.sleep(250);
    var u = await h.card();
    h.assert(u.hasCard && u.count === '2 of 5 answered', '700 px window still shows the Paused card');
    h.assert(u.scroll.doc <= u.scroll.client + 1 && u.scroll.body <= u.scroll.client + 1 &&
      u.scroll.card <= u.scroll.cardClient + 1,
      'no horizontal scroll at a 700 px window');
  } },

  { name: 'resume', size: '1280x800x2', shot: '', run: async function (page, h) {
    await page.eval('() => { if ((document.documentElement.dataset.theme || "light") === "dark") PGRE.setTheme("light"); }');
    var before = await h.card();
    h.assert(before.paused && before.hasCard, 'still paused before Resume');
    await h.click('#exam-resume-btn');
    await h.wait('!document.querySelector(".exam-overlay-card.is-pause-card") && ' +
      '!!document.getElementById("exam-q-heading")', 'the exam room after resume');
    var gone = JSON.parse(await page.eval(function () {
      var exam = PGRE.examEngine.active();
      return JSON.stringify({
        paused: !!(exam && exam.paused),
        durationSec: exam ? exam.durationSec : null,
        overlay: !!document.querySelector('.exam-overlay.is-pause'),
        heading: document.getElementById('exam-q-heading')
          ? document.getElementById('exam-q-heading').textContent : ''
      });
    }));
    h.assert(!gone.paused && !gone.overlay && gone.heading.indexOf('Question 3') !== -1,
      'Resume exam closes the card and returns to question 3');
    var start = gone.durationSec;
    await h.sleep(1500);
    var later = JSON.parse(await page.eval(function () {
      var exam = PGRE.examEngine.active();
      return JSON.stringify({ durationSec: exam.durationSec, paused: !!exam.paused });
    }));
    h.assert(!later.paused && later.durationSec > start,
      'the clock runs again after resume');
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
        (output.indexOf('BROWSER_TEST_FAILED:') !== -1
          ? '\n' + output.split('BROWSER_TEST_FAILED:').pop()
          : '')));
    });
    child.stdin.end(input || '');
  });
}

async function main() {
  var profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pgre-pause-info-chrome-'));
  var shots = process.env.PGRE_PAUSE_SHOTS ? path.resolve(process.env.PGRE_PAUSE_SHOTS) : '';
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
    CHROME_DEVTOOLS_AXI_SESSION: 'pgre-pause-info',
    CHROME_DEVTOOLS_AXI_AUTO_CONNECT: '0',
    CHROME_DEVTOOLS_AXI_BROWSER_URL: '',
    CHROME_DEVTOOLS_AXI_USER_DATA_DIR: profile
  });
  try {
    await new Promise(function (resolve) { server.listen(0, '127.0.0.1', resolve); });
    env.PGRE_PAUSE_TEST_URL = 'http://127.0.0.1:' + server.address().port + '/';
    await run(['open', env.PGRE_PAUSE_TEST_URL], env);
    var size = '';
    for (var i = 0; i < STAGES.length; i++) {
      console.log('\n' + STAGES[i].name);
      if (STAGES[i].size !== size) {
        size = STAGES[i].size;
        await run(['emulate', '--viewport', size], env);
      }
      await run(['run'], env, 'try { var h = await (' + helpers.toString() + ')(page); await (' +
        STAGES[i].run.toString() +
        ')(page, h); } catch (error) { console.log("BROWSER_TEST_FAILED: " + error.stack); }');
      if (shots && STAGES[i].shot) {
        await run(['screenshot', path.join(shots, STAGES[i].shot + '.png')], env);
        console.log('screenshot ' + STAGES[i].shot + '.png');
      }
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
