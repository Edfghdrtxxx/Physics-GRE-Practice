#!/usr/bin/env node
/* Real-page check of the card that comes back after it was graded.
   A card with no schedule takes two Hard/Good presses in Study: the first
   is a learning pass that writes no schedule and puts the card three to
   five places later; the second schedules it. The grade buttons and the
   jump grid must say so. Controls: Easy on a new card, and Good on a
   learned card, schedule at once and never come back.
   Isolated Chrome profile on a throwaway 127.0.0.1 port; never the saved
   studio. The status bridge on 127.0.0.1:4789 is refused by CSP.
   Run: node tools/test-recall-learning-pass-chrome.js
   PGRE_LEARNING_PASS_SHOTS=<dir> also saves one screenshot per stage. */
'use strict';

var fs = require('fs');
var http = require('http');
var os = require('os');
var path = require('path');
var spawn = require('child_process').spawn;
var ROOT = path.resolve(__dirname, '..');
var MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
  '.png': 'image/png', '.svg': 'image/svg+xml'
};
var BRIDGE_PORT = 4789;
var CSP_REPORT_PATH = '/__csp-report';
var PAGE_CSP = "connect-src 'self'; report-uri " + CSP_REPORT_PATH;
function isBridgeUrl(u) { return /^https?:\/\/(127\.0\.0\.1|localhost):4789(\/|$)/.test(String(u)); }

async function helpers(page) {
  var URL = process.env.PGRE_LEARNING_PASS_TEST_URL;
  function sleep(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
  var h = { sleep: sleep };

  h.assert = function (condition, message) {
    if (!condition) throw new Error(message);
    console.log('PASS: ' + message);
  };

  async function wait(selector) {
    for (var attempt = 0; attempt < 100; attempt++) {
      if (await page.eval('!!document.querySelector(' + JSON.stringify(selector) + ')')) return;
      await sleep(100);
    }
    throw new Error('Timeout waiting for ' + selector);
  }
  h.wait = wait;

  h.click = async function (selector) {
    await page.eval('() => { var b = document.querySelector(' + JSON.stringify(selector) +
      '); if (!b) throw new Error("missing " + ' + JSON.stringify(selector) + '); b.click(); }');
  };

  /* Seed a synthetic deck and today's list, then open Study on it.
     cards: [{ id, topic, learned }]. A learned card is a due review. */
  h.seedAndStudy = async function (cards) {
    if (!(await page.eval('!!document.getElementById("main")'))) {
      await page.open(URL);
      await wait('#main');
    }
    await page.eval('() => { var spec = ' + JSON.stringify(cards) + ';' +
      'PGRE.FORMULAS = spec.map(function (c) { return { id: c.id, topic: c.topic, name: "Card " + c.id,' +
      '  front: "prompt " + c.id, back: "$" + c.id.replace(/[^a-z]/g, "") + "=1$", note: "" }; });' +
      'PGRE.BOOK_FORMULAS = []; PGRE.BOOK_LISTS = [];' +
      'var s = PGRE.store.state; s.cards = {}; s.cardReviews = []; s.reviewUndos = {};' +
      's.formulaPinFacts = {}; s.formulaSuspended = {}; s.formulaStudy = null; s.formulaStudyEnd = null;' +
      'spec.forEach(function (c) { if (c.learned) s.cards[c.id] = { reps: 2, lapses: 0, interval: 5,' +
      '  ease: 2.5, due: "2020-01-01", reviews: 2, lastGrade: "good", lastReviewedDay: "2019-12-27" }; });' +
      's.formulaDay = { date: PGRE.srs.today(),' +
      '  reviewIds: spec.filter(function (c) { return c.learned; }).map(function (c) { return c.id; }),' +
      '  newIds: spec.filter(function (c) { return !c.learned; }).map(function (c) { return c.id; }) };' +
      's.settings.formulaDailyTarget = spec.length; s.settings.examDate = ""; s.settings.formulaReverse = false;' +
      'PGRE.store.save(); return PGRE.contentDB.put({ id: "formula-deck", kind: "formula-deck", cards: [] }); }');
    await page.eval(function () { location.hash = '#/'; });
    await sleep(250);
    await page.eval(function () { location.hash = '#/formulas'; });
    await wait('#study-btn');
    await h.click('#study-btn');
    await wait('.formula-palette .pal-cell.is-current');
  };

  /* What the screen and the store say right now. */
  h.look = async function () {
    return JSON.parse(await page.eval(function () {
      var s = PGRE.store.state;
      var cur = document.querySelector('.formula-palette .pal-cell.is-current');
      var cells = {};
      document.querySelectorAll('.formula-palette .pal-cell').forEach(function (b) {
        var id = b.getAttribute('data-id');
        cells[id] = {
          grade: (b.className.match(/is-(again|hard|good|easy|learning)/) || [])[1] || '',
          tip: b.getAttribute('data-box-tip') || '',
          label: b.getAttribute('aria-label') || ''
        };
      });
      var labels = {};
      document.querySelectorAll('#fcard-actions [data-grade]').forEach(function (b) {
        var ivl = b.querySelector('.grade-ivl');
        labels[b.getAttribute('data-grade')] = ivl ? ivl.textContent : '';
      });
      var legend = [];
      document.querySelectorAll('.formula-palette .exam-legend-item').forEach(function (n) {
        legend.push(n.textContent.trim());
      });
      var fs = s.formulaStudy || {};
      return JSON.stringify({
        current: cur ? cur.getAttribute('data-id') : null,
        live: !!document.getElementById('flip-btn') || !!document.querySelector('.formula-study-live #fcard-actions [data-grade]'),
        reviewing: !!document.querySelector('.formula-study-live .peek-grade'),
        summary: !!(document.querySelector('#flash-body h1') &&
          /Review complete/.test(document.querySelector('#flash-body h1').textContent)),
        learnChip: !!document.querySelector('.formula-study-live .learn-chip'),
        flipped: !!(document.getElementById('fcard-back') && !document.getElementById('fcard-back').hidden),
        labels: labels,
        cells: cells,
        legend: legend,
        queueIds: fs.queueIds || [],
        steps: fs.steps || {},
        cards: s.cards || {},
        rows: (s.cardReviews || []).map(function (r) { return { id: r.id, g: r.g }; }),
        today: PGRE.srs.today(),
        tomorrow: PGRE.srs.addDays(1)
      });
    }));
  };

  h.flip = async function () {
    var now = await h.look();
    if (!now.flipped) {
      await h.click('#flip-btn');
      await wait('#fcard-actions [data-grade="good"]');
    }
    return h.look();
  };

  h.press = async function (grade) {
    await h.click('#fcard-actions [data-grade="' + grade + '"]');
    await sleep(150);
    // An Again or a round checkpoint shows an overlay first; continue past it.
    for (var i = 0; i < 3; i++) {
      var more = await page.eval('!!document.getElementById("scaffold-continue") || !!document.getElementById("cp-keep")');
      if (!more) break;
      await page.eval('() => { var b = document.getElementById("scaffold-continue") || document.getElementById("cp-keep"); b.click(); }');
      await sleep(150);
    }
    return h.look();
  };

  return h;
}

/* One trial of the reported symptom: the first Good on a new card, then
   the card coming back. Returns the observations for the trial table. */
async function learningTrial(page, h, trial) {
  // Seven cards: the subject is reinserted 3-5 places later, so at least one
  // card still follows it and the grid is on screen after its second Good.
  var spec = [
    { id: 'lp-x', topic: 'cm' }, { id: 'lp-y', topic: 'em' }, { id: 'lp-z', topic: 'qm' },
    { id: 'lp-w', topic: 'lb' }, { id: 'lp-v', topic: 'op' }, { id: 'lp-u', topic: 'tp' },
    { id: 'lp-l', topic: 'sr', learned: true }
  ];
  await h.seedAndStudy(spec);
  var shown = [];
  var subject = null, control = null, firstLabels = null, afterFirst = null, back = null, afterSecond = null;
  for (var guard = 0; guard < 20; guard++) {
    var now = await h.look();
    if (now.summary || !now.current) break;
    var id = now.current;
    shown.push(id);
    var flipped = await h.flip();
    var cardState = flipped.cards[id];
    var g;
    if (cardState) {
      g = 'good';                                  // learned control: Good schedules at once
    } else if (!subject) {
      subject = id;
      firstLabels = flipped.labels;
      g = 'good';                                  // the reported press
    } else if (id === subject) {
      back = { position: shown.length, chip: flipped.learnChip, labels: flipped.labels,
               between: shown.length - shown.indexOf(subject) - 2 };
      g = 'good';
    } else {
      if (!control) control = id;
      g = 'easy';                                  // new-card control: Easy schedules at once
    }
    var after = await h.press(g);
    if (id === subject && !afterFirst) {
      afterFirst = {
        inQueue: after.queueIds.indexOf(subject) !== -1,
        step: after.steps[subject],
        hasState: !!after.cards[subject],
        rows: after.rows.filter(function (r) { return r.id === subject; }).length,
        cell: after.cells[subject],
        legend: after.legend
      };
    } else if (id === subject) {
      afterSecond = {
        inQueue: after.queueIds.indexOf(subject) !== -1,
        interval: after.cards[subject] && after.cards[subject].interval,
        due: after.cards[subject] && after.cards[subject].due,
        tomorrow: after.tomorrow,
        rows: after.rows.filter(function (r) { return r.id === subject; }).length,
        cell: after.cells[subject]
      };
    }
  }
  var count = function (id) { return shown.filter(function (x) { return x === id; }).length; };
  var obs = {
    trial: trial, shown: shown, subject: subject, firstLabels: firstLabels, afterFirst: afterFirst,
    back: back, afterSecond: afterSecond,
    subjectShown: count(subject), controlEasy: control, controlEasyShown: count(control),
    learnedShown: count('lp-l')
  };
  console.log('OBSERVED trial ' + trial + ': ' + JSON.stringify(obs));
  return obs;
}

function checkTrial(h, o) {
  // The symptom, end to end.
  h.assert(o.subject && o.subjectShown === 2,
    'trial ' + o.trial + ': the new card graded Good once is shown twice in one session');
  h.assert(o.afterFirst.inQueue && o.afterFirst.step === 1 && !o.afterFirst.hasState && o.afterFirst.rows === 0,
    'trial ' + o.trial + ': the first Good writes no schedule and no review row; the card stays queued at learning step 1');
  h.assert(o.back && o.back.chip && o.back.between >= 0 && o.back.between <= 5,
    'trial ' + o.trial + ': the card returns after at most five other cards, with the learning 1/2 chip');
  h.assert(o.afterSecond && !o.afterSecond.inQueue && o.afterSecond.interval === 1 &&
    o.afterSecond.due === o.afterSecond.tomorrow && o.afterSecond.rows === 1,
    'trial ' + o.trial + ': the second Good schedules the card for tomorrow and it leaves the session');
  // Controls: no return without the learning branch.
  h.assert(o.controlEasy && o.controlEasyShown === 1,
    'trial ' + o.trial + ': a new card graded Easy is shown once');
  h.assert(o.learnedShown === 1, 'trial ' + o.trial + ': a learned card graded Good is shown once');
  // The learning pass is visible as one.
  h.assert(o.firstLabels.hard === 'returns this session' && o.firstLabels.good === 'returns this session',
    'trial ' + o.trial + ': Hard and Good on a new card say "returns this session"');
  h.assert(o.firstLabels.easy === '4 d', 'trial ' + o.trial + ': Easy on a new card still says 4 d');
  h.assert(o.afterFirst.cell && o.afterFirst.cell.grade === 'learning' &&
    o.afterFirst.cell.tip === 'Learning pass, returns this session',
    'trial ' + o.trial + ': after the first Good the box is a learning pass, not Good');
  h.assert(o.afterFirst.legend.indexOf('Learning pass') !== -1,
    'trial ' + o.trial + ': the grid legend names the learning pass');
  h.assert(o.back.labels.good === '1 d', 'trial ' + o.trial + ': on its return Good says 1 d');
  h.assert(o.afterSecond.cell && o.afterSecond.cell.grade === 'good' &&
    o.afterSecond.cell.tip === 'Good, 1 day',
    'trial ' + o.trial + ': after the second Good the box shows Good, 1 day');
}

var STAGES = [
  { name: 'trial 1: first Good on a new card is a learning pass', shot: '01-first-pass-buttons', size: '1280x800',
    run: async function (page, h) {
      // Stop on the subject's grade buttons for the screenshot, then finish.
      await h.seedAndStudy([
        { id: 'lp-x', topic: 'cm' }, { id: 'lp-y', topic: 'em' }, { id: 'lp-l', topic: 'sr', learned: true }
      ]);
      for (var i = 0; i < 4; i++) {
        var now = await h.look();
        if (!now.cards[now.current]) break;
        await h.flip();
        await h.press('good');
      }
      var onNew = await h.flip();
      h.assert(!onNew.cards[onNew.current], 'a new card is on screen with its grade buttons');
      h.assert(onNew.labels.good === 'returns this session' && onNew.labels.hard === 'returns this session',
        'the new card\'s Hard and Good say "returns this session"');
    } },
  { name: 'trial 1: the graded card comes back', shot: '02-grid-learning-box',
    run: async function (page, h) {
      var o = await learningTrial(page, h, 1);
      checkTrial(h, o);
      // Leave a learning box on screen for the screenshot.
      await h.seedAndStudy([{ id: 'lp-x', topic: 'cm' }, { id: 'lp-y', topic: 'em' }, { id: 'lp-z', topic: 'qm' }]);
      var first = await h.look();
      await h.flip();
      var after = await h.press('good');
      h.assert(after.cells[first.current] && after.cells[first.current].grade === 'learning',
        'the screenshot state has a learning box on the grid');
    } },
  { name: 'trial 2: the graded card comes back', shot: '03-returned-learning-chip',
    run: async function (page, h) {
      var o = await learningTrial(page, h, 2);
      checkTrial(h, o);
      // Bring a learning card back on screen for the screenshot.
      await h.seedAndStudy([{ id: 'lp-x', topic: 'cm' }, { id: 'lp-y', topic: 'em' }]);
      for (var i = 0; i < 4; i++) {
        var now = await h.look();
        if (now.learnChip) break;
        await h.flip();
        await h.press(now.current === 'lp-x' ? 'good' : 'easy');
      }
      var back = await h.flip();
      h.assert(back.learnChip && back.labels.good === '1 d',
        'the returned card shows learning 1/2 and Good 1 d');
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
        (output ? '\n' + output : '')));
    });
    child.stdin.end(input || '');
  });
}

async function main() {
  var profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pgre-learning-pass-chrome-'));
  var shots = process.env.PGRE_LEARNING_PASS_SHOTS ? path.resolve(process.env.PGRE_LEARNING_PASS_SHOTS) : '';
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
    // Synthetic cards only: never serve the gitignored book deck.
    if (/^\/content\/bank\//.test(pathname) || !file.startsWith(ROOT + path.sep) ||
        !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      response.writeHead(404); response.end(); return;
    }
    response.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Content-Security-Policy': PAGE_CSP
    });
    fs.createReadStream(file).pipe(response);
  });
  var env = Object.assign({}, process.env, {
    CHROME_DEVTOOLS_AXI_SESSION: 'pgre-learning-pass-' + process.pid,
    CHROME_DEVTOOLS_AXI_AUTO_CONNECT: '0',
    CHROME_DEVTOOLS_AXI_BROWSER_URL: '',
    CHROME_DEVTOOLS_AXI_USER_DATA_DIR: profile
  });
  if (!env.CHROME_DEVTOOLS_AXI_MCP_PATH) {
    env.CHROME_DEVTOOLS_AXI_MCP_PATH =
      '/Users/leyi/.npm/_npx/15c61037b1978c83/node_modules/chrome-devtools-mcp/build/src/bin/chrome-devtools-mcp.js';
  }
  try {
    await new Promise(function (resolve) { server.listen(0, '127.0.0.1', resolve); });
    env.PGRE_LEARNING_PASS_TEST_URL = 'http://127.0.0.1:' + server.address().port + '/';
    await run(['open', env.PGRE_LEARNING_PASS_TEST_URL], env);
    var size = '';
    var failed = [];
    // Every stage runs even after a failure, so one run reports each check.
    for (var i = 0; i < STAGES.length; i++) {
      console.log('\n' + STAGES[i].name);
      if (STAGES[i].size && STAGES[i].size !== size) {
        size = STAGES[i].size;
        await run(['emulate', '--viewport', size], env);
      }
      try {
        await run(['run'], env, 'try { var h = await (' + helpers.toString() + ')(page); ' +
          'var learningTrial = ' + learningTrial.toString() + '; var checkTrial = ' + checkTrial.toString() +
          '; await (' + STAGES[i].run.toString() + ')(page, h); } catch (error) { console.log("BROWSER_TEST_FAILED: " + error.stack); }');
      } catch (stageError) {
        failed.push(STAGES[i].name);
      }
      if (shots && STAGES[i].shot) await run(['screenshot', path.join(shots, STAGES[i].shot + '.png')], env);
    }
    if (failed.length) throw new Error('FAILED stages: ' + failed.join('; '));
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
