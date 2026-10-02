#!/usr/bin/env node
'use strict';

var fs = require('fs');
var http = require('http');
var path = require('path');
var spawn = require('child_process').spawn;
var ROOT = path.resolve(__dirname, '..');
var MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' };

async function browserTest() {
  async function wait(selector) {
    for (var attempt = 0; attempt < 100; attempt++) {
      if (await page.eval('!!document.querySelector(' + JSON.stringify(selector) + ')')) return;
      await new Promise(function (resolve) { setTimeout(resolve, 100); });
    }
    throw new Error('Timeout waiting for ' + selector);
  }

  async function click(selector) {
    await page.eval('() => { var button = document.querySelector(' + JSON.stringify(selector) +
      '); button.focus(); button.click(); }');
  }

  function assert(condition, message) {
    if (!condition) throw new Error(message);
    console.log('PASS: ' + message);
  }

  async function progress() {
    return page.eval(function () {
      var state = PGRE.store.state;
      var disk = JSON.parse(localStorage.getItem('pgre-state-v1'));
      return JSON.stringify({
        attempts: state.attempts, mistakes: state.mistakes,
        savedAttempts: disk.attempts, savedMistakes: disk.mistakes
      });
    });
  }

  async function pending() {
    return page.eval(function () {
      var confirmation = document.getElementById('assess-stuck-confirm');
      return !!confirmation && !confirmation.hidden;
    });
  }

  async function installWriteProbe() {
    await page.eval(function () {
      if (window.__writeProbe) return;
      window.__writeProbe = { markStuck: 0, unmarkStuck: 0, setLastAssess: 0,
        markLucky: 0, unmarkLucky: 0, clearLucky: 0 };
      Object.keys(window.__writeProbe).forEach(function (name) {
        var orig = PGRE.srs[name];
        PGRE.srs[name] = function () {
          window.__writeProbe[name]++;
          return orig.apply(this, arguments);
        };
      });
    });
  }

  async function writeProbe() {
    return page.eval(function () { return JSON.stringify(window.__writeProbe); });
  }

  function probeClean(json) {
    var counts = JSON.parse(json);
    return counts.markStuck === 0 && counts.unmarkStuck === 0 && counts.setLastAssess === 0 &&
      counts.markLucky === 0 && counts.unmarkLucky === 0 && counts.clearLucky === 0;
  }

  async function tabOutOfConfirm() {
    for (var i = 0; i < 8; i++) {
      var inside = await page.eval(function () {
        var confirmation = document.getElementById('assess-stuck-confirm');
        return !!(confirmation && confirmation.contains(document.activeElement));
      });
      if (!inside) return;
      await page.press('Tab');
    }
    throw new Error('Tab did not leave the Keep failing reminder');
  }

  await page.open(process.env.PGRE_CONFIRM_TEST_URL);
  var forcedRandom = process.env.PGRE_CONFIRM_RANDOM;
  if (forcedRandom != null && forcedRandom !== '') {
    var randomValue = Number(forcedRandom);
    if (randomValue !== randomValue) throw new Error('PGRE_CONFIRM_RANDOM is not a number');
    await page.eval('() => { var v = ' + randomValue + '; Math.random = function () { return v; }; }');
  }
  await wait('#main');
  await page.eval(function () {
    PGRE.store.state.settings.keyboard = true;
    ['keep-failing-first', 'keep-failing-second'].forEach(function (id) {
      PGRE.QUESTIONS.push({
        id: id, topic: 'em', difficulty: 1,
        q: '<p>Choose the first option for this interaction test: ' + id + '.</p>',
        choices: ['First option', 'Second option'], answer: 0,
        sol: '<p>The first option is the test answer.</p>'
      });
    });
    PGRE._resetBankCache();
    sessionStorage.setItem('pgre-quiz-config', JSON.stringify({
      ids: ['keep-failing-first', 'keep-failing-second'],
      label: 'Confirmation test', purpose: 'similar'
    }));
    location.hash = '#/practice/custom';
  });
  await wait('.choice[data-idx="0"]');
  await click('.choice[data-idx="0"]');
  await click('#confirm-btn');
  await wait('[data-assess="stuck"]');

  var before = await progress();
  await click('[data-assess="stuck"]');
  assert(await pending(), 'clicking Keep failing opens a confirmation');
  assert(await progress() === before, 'opening the reminder changes no assessment or mistake data');
  assert(await page.eval(function () {
    var chip = document.querySelector('[data-assess="stuck"]');
    var confirmation = document.getElementById('assess-stuck-confirm');
    return chip.getAttribute('aria-pressed') === 'false' &&
      chip.title === 'Use for repeated difficulty. This flags the problem for mistake-book retakes.' &&
      confirmation.textContent.indexOf('Mark this problem as Keep failing?') !== -1 &&
      confirmation.textContent.indexOf('Use this for repeated difficulty, not a one-off slip.') !== -1 &&
      confirmation.textContent.indexOf('This flags it in your mistake book for future retakes.') !== -1;
  }), 'the reminder and native hover tip explain repeated difficulty and retakes');
  await click('#assess-stuck-cancel');
  assert(!await pending() && await progress() === before, 'Cancel closes the reminder without flagging or saving');
  assert(await page.eval(function () {
    return document.activeElement.getAttribute('data-assess') === 'stuck';
  }), 'Cancel returns keyboard focus to Keep failing');

  await page.press('r');
  assert(await pending() && await progress() === before, 'R opens the same confirmation without flagging');
  await page.press('Escape');
  assert(!await pending() && await progress() === before, 'Escape cancels without flagging');

  await click('[data-assess="stuck"]');
  await click('[data-assess="slow"]');
  var afterSlow = await progress();
  assert(await pending() && await page.eval(function () {
    return document.querySelector('[data-assess="slow"]').getAttribute('aria-pressed') === 'true' &&
      document.querySelector('[data-assess="stuck"]').getAttribute('aria-pressed') === 'false';
  }), 'Too slow is recorded while the reminder stays open');
  await page.press('Escape');
  assert(!await pending() && await progress() === afterSlow, 'Escape after Too slow dismisses the reminder without further writes');
  assert(await page.eval(function () {
    return document.querySelector('[data-assess="slow"]').getAttribute('aria-pressed') === 'true' &&
      document.querySelector('[data-assess="stuck"]').getAttribute('aria-pressed') === 'false';
  }), 'Escape keeps the Too slow assessment and does not flag Keep failing');
  await click('[data-assess="slow"]');
  assert(await progress() === before, 'clearing Too slow restores the original answer record');

  await click('[data-assess="stuck"]');
  var tabBefore = await progress();
  await tabOutOfConfirm();
  await page.press('Escape');
  assert(!await pending() && await progress() === tabBefore,
    'Escape after Tab leaves the reminder cancels it without flagging');
  assert(await page.eval(function () {
    return document.querySelector('[data-assess="stuck"]').getAttribute('aria-pressed') === 'false';
  }), 'Tab then Escape does not mark Keep failing');

  await page.press('r');
  await page.press('r');
  await page.press('n');
  assert(await pending() && await progress() === before, 'repeated R and Next shortcuts cannot bypass the focused reminder');
  await page.press('Enter');
  assert(!await pending(), 'Enter activates Confirm rather than advancing the question');
  assert(await page.eval(function () {
    var state = PGRE.store.state;
    var attempt = state.attempts[state.attempts.length - 1];
    var mistake = state.mistakes[attempt.qid];
    return mistake.stuck === true && !!mistake.srs &&
      attempt.tags.indexOf('stuck') !== -1 &&
      document.querySelector('[data-assess="stuck"]').getAttribute('aria-pressed') === 'true' &&
      document.querySelector('.practice-meta').textContent.indexOf('Question 1 of 2') !== -1;
  }), 'Confirm flags the current problem and keeps its recorded answer on screen');
  await page.press('r');
  assert(!await pending() && await page.eval(function () {
    var attempt = PGRE.store.state.attempts.slice(-1)[0];
    return !PGRE.store.state.mistakes[attempt.qid] && (attempt.tags || []).indexOf('stuck') === -1;
  }), 'removing a confirmed flag stays immediate');

  await click('[data-assess="stuck"]');
  await click('#assess-stuck-yes');
  await new Promise(function (resolve) { setTimeout(resolve, 350); });
  await click('#next-btn');
  await wait('.choice[data-idx="0"]');
  await installWriteProbe();
  var returnBefore = await progress();
  await page.press('ArrowLeft');
  await wait('[data-assess="stuck"]');
  assert(!await pending() && await progress() === returnBefore && probeClean(await writeProbe()) &&
    await page.eval(function () {
      return document.querySelector('[data-assess="stuck"]').getAttribute('aria-pressed') === 'true';
    }), 'returning to a flagged answer restores the chip and leaves attempts and mistakes unchanged');

  await page.eval(function () {
    Object.keys(PGRE.store.state.mistakes).forEach(function (qid) {
      var mk = PGRE.store.state.mistakes[qid];
      if (mk && mk.stuck) mk.archivedAt = '2026-10-01T00:00:00.000Z';
    });
    PGRE.store.save();
  });
  var archivedBefore = await progress();
  var archivedWrites = await writeProbe();
  await page.eval(function () { location.hash = '#/practice/all'; });
  await wait('#practice-root h1');
  assert(await progress() === archivedBefore && await writeProbe() === archivedWrites,
    'leaving a flagged answer does not rewrite the archived mistake');
  await page.eval(function () { location.hash = '#/practice/custom'; });
  await wait('#resume-btn');
  await click('#resume-btn');
  await wait('[data-assess="stuck"]');
  assert(!await pending() && await progress() === archivedBefore && await writeProbe() === archivedWrites,
    'resuming flagged feedback leaves the attempt and the archived mistake unchanged');
  assert(await page.eval(function () {
    var archived = null;
    Object.keys(PGRE.store.state.mistakes).forEach(function (qid) {
      var mk = PGRE.store.state.mistakes[qid];
      if (mk && mk.stuck) archived = mk;
    });
    return !!archived && archived.archivedAt === '2026-10-01T00:00:00.000Z' &&
      document.querySelector('[data-assess="stuck"]').getAttribute('aria-pressed') === 'true';
  }), 'resume paints Keep failing and does not reopen the archived entry');
  await page.eval(function () {
    Object.keys(PGRE.store.state.mistakes).forEach(function (qid) {
      var mk = PGRE.store.state.mistakes[qid];
      if (mk && mk.archivedAt === '2026-10-01T00:00:00.000Z') mk.archivedAt = null;
    });
    PGRE.store.save();
    location.hash = '#/mistakes';
  });
  await wait('[data-drill-one]');
  await click('[data-drill-one]');
  await wait('.choice[data-idx="1"]');
  await click('.choice[data-idx="1"]');
  await click('#confirm-btn');
  await wait('[data-assess="stuck"]');
  var drillBefore = await progress();
  await page.press('r');
  assert(await pending() && await progress() === drillBefore, 'mistake-drill R also requests confirmation before changing data');
  await click('#assess-stuck-cancel');
  assert(await progress() === drillBefore, 'mistake-drill Cancel preserves its existing retake data');
  await click('[data-assess="stuck"]');
  await click('#assess-stuck-yes');
  assert(await page.eval(function () {
    return PGRE.store.state.attempts.slice(-1)[0].tags.indexOf('stuck') !== -1;
  }), 'mistake-drill Confirm stamps Keep failing on the fresh assessment');
  await page.eval(function () { location.hash = '#/mistakes'; });
  await wait('#drill-all');
  await page.eval(function () { location.hash = '#/mistakes/drill'; });
  await wait('#drill-finish');
  assert(!await pending(), 'restoring a mistake-drill result never opens the reminder');

  await page.eval(function () {
    var now = '2026-10-01T00:00:00.000Z';
    var today = PGRE.srs.today();
    PGRE.store.state.mistakes['keep-failing-first'] = {
      firstMissedAt: now, lastMissedAt: now, misses: 2, solves: 0,
      wrongPicks: [1], lastPick: 1, archivedAt: null, stuck: true,
      srs: { step: 1, due: today }
    };
    PGRE.store.state.mistakes['keep-failing-second'] = {
      firstMissedAt: now, lastMissedAt: now, misses: 1, solves: 0,
      wrongPicks: [1], lastPick: 1, archivedAt: null,
      srs: { step: 0, due: today }
    };
    PGRE.store.save();
    location.hash = '#/mistakes';
  });
  await wait('[data-stuck="keep-failing-first"]');
  await click('[data-stuck="keep-failing-first"]');
  assert(!await pending() && await page.eval(function () {
    return !PGRE.store.state.mistakes['keep-failing-first'].stuck;
  }), 'removing a mistake-book flag stays immediate');
  var bookBefore = await progress();
  await click('[data-stuck="keep-failing-first"]');
  assert(await pending() && await progress() === bookBefore, 'mistake-book marking opens the reminder before changing data');
  assert(await page.eval(function () {
    return document.querySelector('[data-stuck="keep-failing-first"]').title ===
      'Use for repeated difficulty. This flags the problem for mistake-book retakes.';
  }), 'mistake-book Keep failing uses the same hover tip');
  await click('#assess-stuck-cancel');
  assert(!await pending() && await progress() === bookBefore, 'mistake-book Cancel leaves the problem unflagged');
  assert(await page.eval(function () {
    return document.activeElement.getAttribute('data-stuck') === 'keep-failing-first';
  }), 'mistake-book Cancel returns focus to the selected problem');

  await click('[data-stuck="keep-failing-first"]');
  await click('[data-stuck="keep-failing-second"]');
  assert(await pending() && await progress() === bookBefore && await page.eval(function () {
    var confirmation = document.getElementById('assess-stuck-confirm');
    return document.querySelectorAll('#assess-stuck-confirm').length === 1 &&
      confirmation.closest('.miss-card').querySelector('[data-stuck]').getAttribute('data-stuck') ===
        'keep-failing-second';
  }), 'selecting another problem reuses one reminder next to the captured problem');
  await click('#assess-stuck-yes');
  assert(!await pending() && await page.eval(function () {
    return PGRE.store.state.mistakes['keep-failing-second'].stuck === true &&
      !PGRE.store.state.mistakes['keep-failing-first'].stuck;
  }), 'mistake-book Confirm flags only the selected problem');
  await click('[data-stuck="keep-failing-second"]');
  assert(!await pending() && await page.eval(function () {
    return !PGRE.store.state.mistakes['keep-failing-second'].stuck;
  }), 'mistake-book removal does not request confirmation');

  await click('[data-archive="keep-failing-first"]');
  await click('.archived-block > summary');
  var archivedBefore = await progress();
  await click('[data-stuck="keep-failing-first"]');
  assert(await pending() && await progress() === archivedBefore && await page.eval(function () {
    return !!PGRE.store.state.mistakes['keep-failing-first'].archivedAt;
  }), 'an archived problem stays archived and unflagged while confirmation is pending');
  await click('#assess-stuck-cancel');
  assert(!await pending() && await progress() === archivedBefore, 'Cancel preserves the archived entry and its retake schedule');
  await click('[data-stuck="keep-failing-first"]');
  await click('#assess-stuck-yes');
  assert(!await pending() && await page.eval(function () {
    var mistake = PGRE.store.state.mistakes['keep-failing-first'];
    return mistake.stuck === true && mistake.archivedAt === null &&
      !PGRE.store.state.mistakes['keep-failing-second'].stuck &&
      !document.querySelector('[data-stuck="keep-failing-first"]').closest('.miss-card').classList.contains('is-archived');
  }), 'Confirm reopens only the selected archived problem for retakes');
}

function run(args, env, input) {
  return new Promise(function (resolve, reject) {
    var child = spawn('chrome-devtools-axi', args, { env: env, stdio: ['pipe', 'pipe', 'pipe'] });
    var output = '';
    child.stdout.on('data', function (chunk) { output += chunk; });
    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
    child.on('error', reject);
    child.on('exit', function (code) {
      if (code === 0 && output.indexOf('BROWSER_TEST_FAILED:') === -1) resolve();
      else reject(new Error('chrome-devtools-axi ' + args[0] + ' exited ' + code));
    });
    child.stdin.end(input || '');
  });
}

async function main() {
  var profile = fs.mkdtempSync(path.join(ROOT, '.pgre-confirm-chrome-'));
  var server = http.createServer(function (request, response) {
    var pathname = decodeURIComponent(request.url.split('?')[0]);
    var file = path.resolve(ROOT, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      response.writeHead(404); response.end(); return;
    }
    response.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(response);
  });
  var env = Object.assign({}, process.env, {
    CHROME_DEVTOOLS_AXI_SESSION: 'pgre-keepfail-confirm-' + process.pid,
    CHROME_DEVTOOLS_AXI_AUTO_CONNECT: '0',
    CHROME_DEVTOOLS_AXI_BROWSER_URL: '',
    CHROME_DEVTOOLS_AXI_USER_DATA_DIR: profile
  });
  try {
    await new Promise(function (resolve) { server.listen(0, '127.0.0.1', resolve); });
    env.PGRE_CONFIRM_TEST_URL = 'http://127.0.0.1:' + server.address().port + '/';
    await run(['run'], env, 'try { await (' + browserTest.toString() +
      ')(); } catch (error) { console.log("BROWSER_TEST_FAILED: " + error.stack); }');
  } finally {
    await run(['stop'], env).catch(function (error) { console.error(error.message); });
    await new Promise(function (resolve) { server.close(resolve); });
    fs.rmSync(profile, { recursive: true, force: true });
  }
}

main().catch(function (error) { console.error(error.message); process.exitCode = 1; });
