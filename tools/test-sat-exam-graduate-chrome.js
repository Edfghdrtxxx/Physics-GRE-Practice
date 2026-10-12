#!/usr/bin/env node
/* Real-page check: submitting an intact exam graduates only that form into
   the default practice pool. A 100-question-format sitting (recorded source
   gr1777) enters the pool; ets2024 and an unsat book exam stay out. An
   in-progress sitting does not graduate. Verbatim replay of the sat form
   still starts. Synthetic questions in an isolated Chrome profile on a
   throwaway port; never the saved profile. Requests to the OrbitOS status
   bridge (127.0.0.1:4789) are refused by the page's Content-Security-Policy.
   Run: node tools/test-sat-exam-graduate-chrome.js
   PGRE_SAT_SHOTS=<dir> also saves exam-setup screenshots. */
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
var BRIDGE_PORT = 4789;
var CSP_REPORT_PATH = '/__csp-report';
var PAGE_CSP = "connect-src 'self'; report-uri " + CSP_REPORT_PATH;
function isBridgeUrl(u) { return /^https?:\/\/(127\.0\.0\.1|localhost):4789(\/|$)/.test(String(u)); }

async function helpers(page) {
  var URL = process.env.PGRE_SAT_TEST_URL;
  function fixtureExam(id, title, format, prefix, src, n) {
    var questions = [];
    for (var i = 1; i <= n; i++) {
      questions.push({
        id: prefix + i,
        topic: i === 1 ? 'cm' : 'em',
        difficulty: 1,
        q: '<p>SATGRAD unique stem ' + id + ' #' + i + '.</p>',
        choices: ['A-' + prefix + i, 'B-' + prefix + i, 'C-' + prefix + i, 'D-' + prefix + i, 'E-' + prefix + i],
        answer: 0,
        sol: '<p>SATGRAD sol ' + prefix + i + '.</p>',
        src: src
      });
    }
    return { id: id, title: title, format: format, questions: questions };
  }
  var BOOK = fixtureExam('x1', 'Book sample exam', '100x170', 'be-sat-', 'cpg-exam', 3);
  var BOOK2 = fixtureExam('x2', 'Book sample exam 2', '100x170', 'be-unsat-', 'cpg-exam', 3);
  var GR1777 = fixtureExam('gr1777', 'GR1777 fixture', '100x170', 'g17-sat-', 'ets-exam', 3);
  var ETS2024 = fixtureExam('ets2024', 'ets2024 fixture', '70x120', 'e24-sat-', 'ets-exam', 3);
  function sleep(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
  var h = { sleep: sleep, URL: URL };

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
    await h.wait('!!document.getElementById("main") && !!window.PGRE && !!PGRE.examEngine && !!PGRE.allQuestions',
      'PGRE exam engine');
    await page.eval('() => { var book = ' + JSON.stringify(BOOK) + ';' +
      'var book2 = ' + JSON.stringify(BOOK2) + ';' +
      'var gr = ' + JSON.stringify(GR1777) + ';' +
      'var e24 = ' + JSON.stringify(ETS2024) + ';' +
      'PGRE.BOOK_EXAMS = [book, book2];' +
      'PGRE.ETS_EXAMS = [gr, e24];' +
      'if (PGRE._resetBankCache) PGRE._resetBankCache(); }');
  };

  h.openExam = async function () {
    await page.open(URL + '#/');
    await h.inject();
    await page.eval('() => { location.hash = "#/exam"; }');
    await h.wait('!!document.querySelector(\'[data-replay="gr1777"]\') && ' +
      '!!document.querySelector(\'[data-replay="ets2024"]\')',
      'replay buttons for both fixture exams');
  };

  h.pool = async function () {
    return JSON.parse(await page.eval(function () {
      var ids = (PGRE.allQuestions() || []).map(function (q) { return q.id; });
      var sat = PGRE.satExamSources ? PGRE.satExamSources() : {};
      var exams = (PGRE.store.state.exams || []).map(function (x) {
        return { id: x.id, source: x.source, submittedAt: x.submittedAt || null, format: x.format };
      });
      return JSON.stringify({
        ids: ids,
        hasG17: ids.indexOf('g17-sat-1') !== -1,
        hasE24: ids.indexOf('e24-sat-1') !== -1,
        hasBook: ids.indexOf('be-sat-1') !== -1,
        hasBook2: ids.indexOf('be-unsat-1') !== -1,
        poolSize: PGRE.examEngine.poolSize(),
        satSources: Object.keys(sat).sort(),
        exams: exams,
        setupText: document.querySelector('.exam-format:nth-of-type(n)') ?
          Array.prototype.map.call(document.querySelectorAll('.exam-format p.muted'), function (p) {
            return p.textContent;
          }).join(' | ') : '',
        replayGr: !!document.querySelector('[data-replay="gr1777"]'),
        replayE24: !!document.querySelector('[data-replay="ets2024"]')
      });
    }));
  };

  h.startReplay = async function (id) {
    await h.click('[data-replay="' + id + '"]');
    await h.wait('location.hash === "#/exam/run" && !!document.getElementById("exam-submit")',
      'exam room for ' + id);
  };

  h.submitSitting = async function () {
    await h.click('#exam-submit');
    await h.wait('!!document.getElementById("exam-confirm")', 'submit confirm');
    await h.click('#exam-confirm');
    await h.wait('location.hash.indexOf("#/exam/review/") === 0 && !PGRE.examEngine.active()',
      'submitted review page');
  };

  h.search = async function (query) {
    var hash = await page.eval('() => location.hash');
    if (String(hash).indexOf('#/search') !== 0) {
      await page.eval('() => { location.hash = "#/search"; }');
      await h.wait('!!document.getElementById("srch-input")', 'search input');
      await h.wait('!!(window.PGRE && PGRE.search)', 'search engine');
      await page.eval('() => { window.__srchIdx = false; PGRE.search.buildIndex().then(function () { window.__srchIdx = true; }); }');
      await h.wait('!!window.__srchIdx', 'search index');
      await h.sleep(400);
    }
    await page.eval('() => { var i = document.getElementById("srch-input"); i.value = ' +
      JSON.stringify(query) +
      '; i.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); }');
    await h.sleep(250);
    await h.wait('!!document.querySelector(".srch-empty, .srch-hit")', 'search results for ' + query);
    return JSON.parse(await page.eval(function () {
      var empty = document.querySelector('.srch-empty');
      var hits = document.querySelectorAll('.srch-hit');
      var status = document.getElementById('srch-status');
      return JSON.stringify({
        empty: !!(empty && /No matches/.test(empty.textContent || '')),
        emptyText: empty ? empty.textContent : '',
        hitCount: hits.length,
        status: status ? status.textContent : '',
        results: document.getElementById('srch-results')
          ? document.getElementById('srch-results').textContent : ''
      });
    }));
  };

  return h;
}

var STAGES = [
  { name: 'unsat pool', size: '1280x800x2', shot: 'setup-unsat', run: async function (page, h) {
    await h.openExam();
    var pool = await h.pool();
    h.assert(!pool.hasG17 && !pool.hasE24 && !pool.hasBook && !pool.hasBook2,
      'unsat intact exams are absent from the default pool');
    h.assert(pool.satSources.length === 0, 'no sat exam sources before a sitting');
    h.assert(pool.setupText.indexOf('unsat released-ETS question') !== -1,
      'setup copy names unsat released-ETS questions as reserved');
  } },

  { name: 'in-progress 100Q does not graduate', size: '1280x800x2', shot: '', run: async function (page, h) {
    await h.startReplay('gr1777');
    var mid = JSON.parse(await page.eval(function () {
      var act = PGRE.examEngine.active();
      var ids = (PGRE.allQuestions() || []).map(function (q) { return q.id; });
      return JSON.stringify({
        source: act && act.source,
        format: act && act.format,
        submittedAt: act && act.submittedAt,
        hasG17: ids.indexOf('g17-sat-1') !== -1
      });
    }));
    h.assert(mid.source === 'gr1777' && mid.format === '100x170' && !mid.submittedAt,
      'the live sitting records source gr1777 as a 100-question form');
    h.assert(!mid.hasG17, 'an in-progress sitting does not graduate its questions');
    await page.eval('() => { location.hash = "#/exam"; }');
    await h.wait('!!document.getElementById("exam-resume-drop")', 'resume card');
    await h.click('#exam-resume-drop');
    await h.wait('!!document.querySelector(\'[data-replay="gr1777"]\') && !PGRE.examEngine.active()',
      'discarded sitting, setup restored');
    var afterDrop = await h.pool();
    h.assert(!afterDrop.hasG17, 'discarding an unsubmitted sitting leaves the form protected');
  } },

  { name: 'submit 100Q graduates only that source', size: '1280x800x2', shot: 'setup-sat-gr1777', run: async function (page, h) {
    await h.startReplay('gr1777');
    await h.submitSitting();
    var recorded = JSON.parse(await page.eval(function () {
      var hist = PGRE.examEngine.history();
      var last = hist[0];
      return JSON.stringify({
        source: last && last.source,
        format: last && last.format,
        submittedAt: last && last.submittedAt,
        total: last && last.total
      });
    }));
    h.assert(recorded.source === 'gr1777' && recorded.format === '100x170' && !!recorded.submittedAt,
      'history records the submitted 100-question form as source gr1777');
    h.assert(recorded.total === 3, 'fixture sitting length is the injected form');
    await page.eval('() => { location.hash = "#/exam"; }');
    await h.wait('!!document.querySelector(\'[data-replay="ets2024"]\')', 'setup after submit');
    var pool = await h.pool();
    h.assert(pool.hasG17, 'submitted GR1777 questions enter the default pool');
    h.assert(!pool.hasE24, 'ets2024 stays protected when it was not the recorded source');
    h.assert(!pool.hasBook && !pool.hasBook2, 'unsat book sample exams stay protected');
    h.assert(pool.satSources.join(',') === 'gr1777',
      'sat sources are the recorded exam source only');
    h.assert(pool.replayGr && pool.replayE24, 'verbatim replay buttons remain for sat and unsat forms');
    h.assert(pool.setupText.indexOf('from exams already sat') !== -1,
      'setup copy counts sat exam questions in the drawable pool');
    var extra = JSON.parse(await page.eval(function () {
      var topic = (PGRE.questionsForTopic('cm') || []).map(function (q) { return q.id; });
      return JSON.stringify({
        topicHasG17: topic.indexOf('g17-sat-1') !== -1,
        poolEq: PGRE.examEngine.poolSize() === PGRE.allQuestions().length
      });
    }));
    h.assert(extra.topicHasG17, 'topic practice includes the sat form');
    h.assert(extra.poolEq, 'weighted-draw pool size is the default allQuestions pool');
    await page.eval('() => { document.querySelectorAll(".toast, .toasts, [class*=toast]").forEach(function (el) { el.remove(); }); }');
  } },

  { name: 'custom quiz includes sat form', size: '1280x800x2', shot: 'custom-quiz-sat', run: async function (page, h) {
    await page.eval('() => { location.hash = "#/build"; }');
    await h.wait('!!document.getElementById("build-preview")', 'custom quiz preview');
    var preview = JSON.parse(await page.eval(function () {
      var el = document.getElementById('build-preview');
      var ids = (PGRE.allQuestions() || []).map(function (q) { return q.id; });
      return JSON.stringify({
        text: el ? el.textContent : '',
        hasG17: ids.indexOf('g17-sat-1') !== -1,
        hasE24: ids.indexOf('e24-sat-1') !== -1,
        n: ids.length
      });
    }));
    h.assert(preview.hasG17 && !preview.hasE24,
      'custom-quiz default pool includes the sat form and excludes ets2024');
    h.assert(preview.text.indexOf(String(preview.n)) !== -1,
      'custom quiz match count uses the graduated default pool');
  } },

  { name: 'replay sat form still starts', size: '1280x800x2', shot: '', run: async function (page, h) {
    await page.eval('() => { location.hash = "#/exam"; }');
    await h.wait('!!document.querySelector(\'[data-replay="gr1777"]\')', 'exam setup replay button');
    await h.startReplay('gr1777');
    var live = JSON.parse(await page.eval(function () {
      var act = PGRE.examEngine.active();
      return JSON.stringify({
        source: act && act.source,
        order0: act && act.order && act.order[0],
        hash: location.hash
      });
    }));
    h.assert(live.source === 'gr1777' && live.order0 === 'g17-sat-1' && live.hash === '#/exam/run',
      'verbatim replay of the sat form still starts in published order');
    await page.eval('() => { location.hash = "#/exam"; }');
    await h.wait('!!document.getElementById("exam-resume-drop")', 'resume after replay start');
    await h.click('#exam-resume-drop');
    await h.wait('!!document.querySelector(\'[data-replay="ets2024"]\')', 'discarded replay');
  } },

  { name: 'search omits unsat book exam', size: '1280x800x2', shot: 'search-unsat-book', run: async function (page, h) {
    var unsat = await h.search('satgrad unique stem x1');
    h.assert(unsat.empty && unsat.hitCount === 0,
      'unsat book sample-exam stem has no search result');
  } },

  { name: 'search finds sat ETS exam', size: '1280x800x2', shot: '', run: async function (page, h) {
    var satEts = await h.search('satgrad unique stem gr1777');
    h.assert(!satEts.empty && satEts.hitCount > 0,
      'sat ETS stem is searchable as a normal question');
  } },

  { name: 'sit book exam then search and builder', size: '1280x800x2', shot: 'custom-quiz-count', run: async function (page, h) {
    await page.eval('() => { location.hash = "#/exam"; }');
    await h.wait('!!document.querySelector(\'[data-replay="x1"]\')', 'book exam replay button');
    await h.startReplay('x1');
    await h.submitSitting();
    var satBook = await h.search('satgrad unique stem x1');
    h.assert(!satBook.empty && satBook.hitCount > 0,
      'sat book sample-exam stem is searchable');
    var stillUnsat = await h.search('satgrad unique stem x2');
    h.assert(stillUnsat.empty && stillUnsat.hitCount === 0,
      'the other unsat book exam still has no search result');
    await page.eval('() => { location.hash = "#/build"; }');
    await h.wait('!!document.getElementById("build-preview") && !!document.querySelector("[data-source=exam]")',
      'custom quiz builder');
    var counts = JSON.parse(await page.eval(function () {
      function n() {
        var el = document.querySelector('.build-count-num');
        return el ? el.textContent : '';
      }
      var off = n();
      var btn = document.querySelector('[data-source="exam"]');
      btn.click();
      var on = n();
      var hint = btn ? btn.textContent : '';
      var ids = (PGRE.allQuestions() || []).map(function (q) { return q.id; });
      var onPool = JSON.parse(JSON.stringify(
        (PGRE.views.build.resample({ includeExam: true }, 1000) || [])
      ));
      return JSON.stringify({
        off: off, on: on, hint: hint,
        hasG17: ids.indexOf('g17-sat-1') !== -1,
        hasBook: ids.indexOf('be-sat-1') !== -1,
        hasBook2: ids.indexOf('be-unsat-1') !== -1,
        resampleHasUnsat: onPool.indexOf('be-unsat-1') !== -1
      });
    }));
    h.assert(counts.off === counts.on,
      'builder toggle on and off report the same match count');
    h.assert(counts.hasG17 && counts.hasBook && !counts.hasBook2,
      'default pool has the sat forms and not the remaining unsat book exam');
    h.assert(!counts.resampleHasUnsat,
      'toggle on does not add the unsat book exam');
    h.assert(counts.hint.indexOf('unsat stay reserved') !== -1,
      'toggle copy says unsat exams stay reserved');
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
  var profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pgre-sat-exam-graduate-chrome-'));
  var shots = process.env.PGRE_SAT_SHOTS ? path.resolve(process.env.PGRE_SAT_SHOTS) : '';
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
    CHROME_DEVTOOLS_AXI_SESSION: 'fm-studio-sat-exam-graduate',
    CHROME_DEVTOOLS_AXI_AUTO_CONNECT: '0',
    CHROME_DEVTOOLS_AXI_BROWSER_URL: '',
    CHROME_DEVTOOLS_AXI_USER_DATA_DIR: profile
  });
  try {
    await new Promise(function (resolve) { server.listen(0, '127.0.0.1', resolve); });
    env.PGRE_SAT_TEST_URL = 'http://127.0.0.1:' + server.address().port + '/';
    await run(['open', env.PGRE_SAT_TEST_URL], env);
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
