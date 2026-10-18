#!/usr/bin/env node
/* Real-page check that submitting a mock marks every flagged question that was
   answered correctly as guessed and files it in the mistake book as a lucky
   guess, that a submit which does not persist marks nothing, and that
   unmarking on the results page still takes the entry back out. Synthetic
   questions in an isolated Chrome profile on a throwaway port; never the saved
   profile. Requests to the OrbitOS status bridge (127.0.0.1:4789) are refused
   by the page's Content-Security-Policy.
   Run: node tools/test-exam-flag-guess-chrome.js
   PGRE_GUESS_SHOTS=<dir> also saves the results page and mistake book. */
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
/* js/status.js posts to the OrbitOS status bridge on 127.0.0.1:4789 at load.
   chrome-devtools-axi cannot block a URL, so the test server sends a
   Content-Security-Policy that lets the page connect to this server only and
   reports the refusal to CSP_REPORT_PATH. */
var BRIDGE_PORT = 4789;
var CSP_REPORT_PATH = '/__csp-report';
var PAGE_CSP = "connect-src 'self'; report-uri " + CSP_REPORT_PATH;
function isBridgeUrl(u) { return /^https?:\/\/(127\.0\.0\.1|localhost):4789(\/|$)/.test(String(u)); }

async function helpers(page) {
  var URL = process.env.PGRE_GUESS_TEST_URL;
  var QUESTIONS = [];
  for (var n = 1; n <= 5; n++) {
    QUESTIONS.push({
      id: 'fg-q' + n, topic: 'cm', difficulty: 1,
      q: '<p>Flag-guess fixture question ' + n + '.</p>',
      choices: ['Choice A ' + n, 'Choice B ' + n, 'Choice C ' + n, 'Choice D ' + n, 'Choice E ' + n],
      answer: 0, sol: '<p>The answer is A.</p>'
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

  h.heading = function (n) {
    return h.wait('document.querySelector("#exam-q-heading") && ' +
      'document.querySelector("#exam-q-heading").textContent.indexOf("Question ' + n + '") !== -1',
      'question ' + n);
  };

  h.state = async function () {
    return JSON.parse(await page.eval(function () {
      var ex = PGRE.store.state.exams[PGRE.store.state.exams.length - 1];
      var mk = PGRE.store.state.mistakes;
      var out = {
        order: ex.order, flags: ex.flags, answers: ex.answers,
        submitted: !!ex.submittedAt, guessed: ex.guessed || null,
        origin: ex.guessOrigin || null, mistakes: {}
      };
      ex.order.forEach(function (id) {
        out.mistakes[id] = mk[id]
          ? { lucky: mk[id].lucky === true, misses: mk[id].misses, archived: !!mk[id].archivedAt }
          : null;
      });
      return JSON.stringify(out);
    }));
  };

  h.sit = async function () {
    await page.open(URL + '#/');
    await h.wait('!!document.getElementById("main")', '#main');
    await page.eval('() => { PGRE.BOOK_EXAMS = [{ id: "fg-exam", title: "Flag-guess fixture exam",' +
      ' format: "70x120", questions: ' + JSON.stringify(QUESTIONS) + ' }]; PGRE._resetBankCache(); }');
    await page.eval('() => { location.hash = "#/exam"; }');
    await h.wait('!!document.querySelector(\'[data-replay="fg-exam"]\')', 'the replay button');
    await h.click('[data-replay="fg-exam"]');
    await h.wait('location.hash === "#/exam/run" && !!document.getElementById("exam-q-heading")',
      'the mock-exam room');
    // position: [pick index or null, flagged]
    var plan = [[0, true], [0, true], [1, true], [0, false], [null, true]];
    for (var i = 0; i < plan.length; i++) {
      await h.heading(i + 1);
      if (plan[i][0] != null) await h.click('.choice[data-idx="' + plan[i][0] + '"]');
      if (plan[i][1]) await h.click('#exam-flag');
      if (i < plan.length - 1) await h.click('#exam-next');
    }
  };

  h.submit = async function () {
    await h.click('#exam-submit');
    await h.wait('!!document.getElementById("exam-confirm")', 'the Submit dialog');
    await h.click('#exam-confirm');
  };

  return h;
}

var STAGES = [
  { name: 'sit-and-fail-to-persist', size: '1280x900x2', shot: '', run: async function (page, h) {
    await h.sit();
    var s = await h.state();
    h.assert(s.flags.length === 4 && !s.submitted && !s.guessed,
      'before submit: 4 questions flagged, no guess marks');
    // Storage refuses the state blob, as a full disk would.
    await page.eval('() => { window.__realSet = Storage.prototype.setItem;' +
      ' Storage.prototype.setItem = function (k, v) {' +
      ' if (k === PGRE.store.KEY) throw new Error("quota");' +
      ' return window.__realSet.call(this, k, v); }; }');
    await h.submit();
    await h.sleep(500);
    s = await h.state();
    h.assert(!s.submitted && (await page.eval('() => location.hash')) === '#/exam/run',
      'a submit that does not persist leaves the sitting unsubmitted in the room');
    h.assert(!s.guessed && !s.origin, 'a submit that does not persist creates no guess marks');
    s.order.forEach(function (id) {
      h.assert(s.mistakes[id] === null, 'a submit that does not persist files nothing for ' + id);
    });
  } },

  { name: 'submit-and-auto-mark', size: '1280x900x2', shot: 'results-after-submit', run: async function (page, h) {
    await page.eval('() => { Storage.prototype.setItem = window.__realSet; }');
    await h.click('#exam-submit');
    await h.wait('!!document.getElementById("exam-confirm")', 'the Submit dialog');
    await h.click('#exam-confirm');
    await h.wait('location.hash.indexOf("#/exam/review/") === 0 && !!document.getElementById("exam-review-title")',
      'the results page');
    await h.sleep(600);
    var s = await h.state();
    var o = s.order;
    h.assert(s.submitted, 'the sitting is submitted once storage works');
    // positions: 0 right+flag, 1 right+flag, 2 wrong+flag, 3 right, 4 blank+flag
    h.assert(s.guessed && s.guessed.length === 2 && s.guessed.indexOf(o[0]) !== -1 && s.guessed.indexOf(o[1]) !== -1,
      'exam.guessed holds exactly the two flagged correct questions');
    h.assert(s.origin && s.origin[o[0]] === 'created' && s.origin[o[1]] === 'created' &&
      Object.keys(s.origin).length === 2, 'guessOrigin is "created" for both and absent for the rest');
    h.assert(s.mistakes[o[0]] && s.mistakes[o[0]].lucky && s.mistakes[o[0]].misses === 0 &&
      s.mistakes[o[1]] && s.mistakes[o[1]].lucky && s.mistakes[o[1]].misses === 0,
      'both flagged correct answers are lucky entries in the mistake book');
    h.assert(s.mistakes[o[2]] && !s.mistakes[o[2]].lucky && s.mistakes[o[2]].misses === 1,
      'the flagged wrong answer is an ordinary miss, not a lucky guess');
    h.assert(!s.mistakes[o[3]], 'the unflagged correct answer is not filed');
    h.assert(!(s.mistakes[o[4]] && s.mistakes[o[4]].lucky), 'the flagged blank is not a lucky guess');
    var ui = JSON.parse(await page.eval(function () {
      var bulk = document.getElementById('exam-guess-flagged');
      var on = document.querySelectorAll('[data-exam-guess][aria-pressed="true"]').length;
      return JSON.stringify({ bulkText: bulk ? bulk.textContent : '', bulkDisabled: bulk ? bulk.disabled : null, on: on });
    }));
    h.assert(ui.on === 2, 'the results page shows Guessed pressed on 2 questions');
    h.assert(ui.bulkDisabled === true && ui.bulkText === 'Flagged correct answers are marked as guessed',
      'the bulk button shows its already-marked state');
    await page.eval('() => { document.getElementById("toasts").innerHTML = ""; }');
  } },

  { name: 'results-guessed-chip', size: '1280x900x2', shot: 'results-guessed-chip', run: async function (page, h) {
    await page.eval('() => { document.querySelector("[data-exam-guess]").scrollIntoView({ block: "center" }); }');
    await h.sleep(300);
  } },

  { name: 'mistake-book', size: '1280x900x2', shot: 'mistake-book-after-submit', run: async function (page, h) {
    await page.eval('() => { location.hash = "#/mistakes"; }');
    await h.wait('document.body.textContent.indexOf("lucky guess") !== -1', 'the lucky entries');
    var n = await page.eval('() => document.querySelectorAll(".lucky-chip").length');
    h.assert(Number(n) === 2, 'the mistake book lists 2 lucky-guess chips');
    await page.eval('() => { document.getElementById("toasts").innerHTML = ""; }');
    await page.eval('() => { document.querySelector(".lucky-chip").scrollIntoView({ block: "center" }); }');
    await h.sleep(300);
  } },

  { name: 'unmark-one', size: '1280x900x2', shot: 'results-after-unmark', run: async function (page, h) {
    var before = await h.state();
    var gone = before.order[0];
    await page.eval('() => { location.hash = "#/exam/review/" + PGRE.store.state.exams[PGRE.store.state.exams.length - 1].id; }');
    await h.wait('!!document.querySelector("[data-exam-guess]")', 'the results page');
    await h.click('[data-exam-guess="' + gone + '"]');
    await h.sleep(400);
    var s = await h.state();
    h.assert(s.guessed.length === 1 && s.guessed.indexOf(gone) === -1,
      'unmarking one removes it from exam.guessed');
    h.assert(s.mistakes[gone] === null, 'the unmarked question leaves the mistake book');
    h.assert(s.mistakes[s.order[1]] && s.mistakes[s.order[1]].lucky,
      'the other lucky entry stays in the mistake book');
    var ui = JSON.parse(await page.eval(function () {
      var bulk = document.getElementById('exam-guess-flagged');
      return JSON.stringify({ bulkText: bulk.textContent, bulkDisabled: bulk.disabled });
    }));
    h.assert(!ui.bulkDisabled && ui.bulkText === 'Mark flagged correct as guessed',
      'the bulk button offers the unmarked question again');
    await page.eval('() => { document.getElementById("toasts").innerHTML = ""; }');
    await page.eval('() => { document.querySelector("[data-exam-guess]").scrollIntoView({ block: "center" }); }');
    await h.sleep(300);
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
  var profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pgre-flag-guess-chrome-'));
  var shots = process.env.PGRE_GUESS_SHOTS ? path.resolve(process.env.PGRE_GUESS_SHOTS) : '';
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
    CHROME_DEVTOOLS_AXI_SESSION: 'pgre-flag-guess',
    CHROME_DEVTOOLS_AXI_AUTO_CONNECT: '0',
    CHROME_DEVTOOLS_AXI_BROWSER_URL: '',
    CHROME_DEVTOOLS_AXI_USER_DATA_DIR: profile
  });
  try {
    await new Promise(function (resolve) { server.listen(0, '127.0.0.1', resolve); });
    env.PGRE_GUESS_TEST_URL = 'http://127.0.0.1:' + server.address().port + '/';
    await run(['open', env.PGRE_GUESS_TEST_URL], env);
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
