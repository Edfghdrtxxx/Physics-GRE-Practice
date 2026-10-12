#!/usr/bin/env node
/* Real-page check of the Study jump grid on #/formulas: click a box to
   change cards, then regrade a committed card without a second review.
   Isolated Chrome profile on a throwaway 127.0.0.1 port; never the saved
   studio. The status bridge on 127.0.0.1:4789 is refused by CSP.
   Run: node tools/test-recall-boxes-chrome.js
   PGRE_RECALL_BOXES_SHOTS=<dir> also saves one screenshot per stage. */
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

var STUDY_KEYS = ['id', 'date', 'dayBound', 'queueIds', 'done', 'again', 'steps',
  'pressCount', 'history', '_opAt', '_opId', 'completed'].sort();

function staticChecks() {
  function check(condition, message) {
    if (!condition) throw new Error(message);
    console.log('PASS: ' + message);
  }
  var view = fs.readFileSync(path.join(ROOT, 'js', 'view-formulas.js'), 'utf8');
  var css = fs.readFileSync(path.join(ROOT, 'css', 'style.css'), 'utf8');
  var index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  var persistAt = view.indexOf('function persistStudy()');
  var persistEnd = view.indexOf('function dropSavedStudy()');
  var persist = persistAt > 0 && persistEnd > persistAt ? view.slice(persistAt, persistEnd) : '';
  check(persist.indexOf('PGRE.store.state.formulaStudy = {') !== -1, 'persistStudy writes formulaStudy');
  STUDY_KEYS.forEach(function (k) {
    check(persist.indexOf(k) !== -1, 'persistStudy still writes ' + k);
  });
  check(!/\brosterIds\b|\bcurrentId\b|\breviewing\b/.test(persist),
    'persistStudy does not store roster or cursor fields');
  check(view.indexOf('function paletteHTML()') !== -1 &&
    view.indexOf('formula-palette') !== -1 &&
    view.indexOf('data-goto') !== -1,
    'Study renders a pal-cell jump grid');
  var palAt = view.indexOf('function paletteHTML()');
  var palEnd = view.indexOf('function bindPalette()');
  var pal = palAt > 0 && palEnd > palAt ? view.slice(palAt, palEnd) : '';
  check(view.indexOf('function boxIntervalText(id)') !== -1 &&
    pal.indexOf('data-box-tip') !== -1 &&
    pal.indexOf('boxHoverText') !== -1,
    'each box carries a hover/focus label');
  var intervalFn = view.indexOf('function boxIntervalText(id)');
  var intervalSrc = intervalFn > 0 ? view.slice(intervalFn, palAt) : '';
  check(intervalSrc.indexOf('cardState') !== -1 &&
    intervalSrc.indexOf('.interval') !== -1 &&
    intervalSrc.indexOf('daysUntil') === -1,
    'box interval is the stored SRS interval, not a due-date guess');
  check(view.indexOf('not graded yet') !== -1,
    'ungraded boxes say not graded yet');
  check(css.indexOf('.formula-palette .pal-cell[data-box-tip]:hover::after') !== -1 &&
    css.indexOf('.formula-palette .pal-cell[data-box-tip]:focus::after') !== -1,
    'hover and keyboard focus show the box label');
  check(view.indexOf('function regrade(g)') !== -1 &&
    view.indexOf('undoReview') !== -1,
    'regrade undoes the named review then writes the new grade');
  check(view.indexOf('function jumpTo(n)') !== -1,
    'clicking a box calls jumpTo');
  check(/@container\s+flash\s*\(min-width:\s*920px\)/.test(css),
    'wide layout uses a container query on #flash-body');
  check(/@media\s*\(max-width:\s*900px\)/.test(css) &&
    css.indexOf('.formula-study-live .formula-palette') !== -1,
    'narrow viewport stacks the grid below the card');
  check(/minmax\(760px,\s*1fr\)/.test(css),
    'the card column keeps a 760px floor beside the grid');
  check(/js\/view-formulas\.js\?v=\d{8}[a-z]/.test(index) &&
    /css\/style\.css\?v=\d{8}[a-z]/.test(index),
    'index.html cache-busts view-formulas.js and style.css');
  var flash = fs.readFileSync(path.join(ROOT, 'js', 'flashmodes.js'), 'utf8');
  check(flash.indexOf('formula-palette') === -1,
    'Match/Type/Quiz/Cloze do not render the Study jump grid');
}

async function helpers(page) {
  var URL = process.env.PGRE_RECALL_BOXES_TEST_URL;
  function sleep(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
  var h = { sleep: sleep };

  function assert(condition, message) {
    if (!condition) throw new Error(message);
    console.log('PASS: ' + message);
  }
  h.assert = assert;
  h.studyKeys = ['id', 'date', 'dayBound', 'queueIds', 'done', 'again', 'steps',
    'pressCount', 'history', '_opAt', '_opId', 'completed'].sort();

  async function wait(selector) {
    for (var attempt = 0; attempt < 100; attempt++) {
      if (await page.eval('!!document.querySelector(' + JSON.stringify(selector) + ')')) return;
      await sleep(100);
    }
    throw new Error('Timeout waiting for ' + selector);
  }
  h.wait = wait;

  async function click(selector) {
    await page.eval('() => { var b = document.querySelector(' + JSON.stringify(selector) +
      '); if (!b) throw new Error("missing " + ' + JSON.stringify(selector) + '); b.focus(); b.click(); }');
  }
  h.click = click;

  h.openFormulas = async function () {
    await page.open(URL);
    await wait('#main');
    await page.eval(function () { location.hash = '#/formulas'; });
    await wait('#formulas-root');
    for (var i = 0; i < 50; i++) {
      if (await page.eval('!!document.getElementById("study-btn") || !!document.getElementById("resume-btn")')) return;
      await sleep(100);
    }
    throw new Error('Timeout waiting for Study on #/formulas');
  };

  h.seedThree = async function () {
    await page.eval(function () {
      var cards = [
        { id: 'box-a', topic: 'cm', name: 'Box A', front: 'prompt A', back: '$A=1$', note: '' },
        { id: 'box-b', topic: 'cm', name: 'Box B', front: 'prompt B', back: '$B=2$', note: '' },
        { id: 'box-c', topic: 'em', name: 'Box C', front: 'prompt C', back: '$C=3$', note: '' }
      ];
      PGRE.FORMULAS = cards;
      PGRE.BOOK_FORMULAS = [];
      PGRE.BOOK_LISTS = [];
      var s = PGRE.store.state;
      s.cards = {
        'box-c': { reps: 2, lapses: 0, interval: 10, ease: 2.5,
          due: '2020-01-01', reviews: 2, lastGrade: 'good' }
      };
      s.cardReviews = [];
      s.reviewUndos = {};
      s.formulaDay = { date: PGRE.srs.today(), reviewIds: [], newIds: ['box-a', 'box-b', 'box-c'] };
      s.formulaStudy = null;
      s.formulaStudyEnd = null;
      s.formulaSuspended = {};
      s.settings.formulaDailyTarget = 3;
      s.settings.examDate = '';
      s.settings.keyboard = true;
      PGRE.store.save();
    });
    if (await page.eval('typeof PGRE.contentDB !== "undefined" && !!PGRE.contentDB.put')) {
      await page.eval(function () {
        return PGRE.contentDB.put({ id: 'formula-deck', kind: 'formula-deck', cards: [] });
      });
    }
    await page.eval(function () { location.hash = '#/'; });
    await sleep(250);
    await page.eval(function () { location.hash = '#/formulas'; });
    await wait('#study-btn, #resume-btn');
    await page.eval(function () {
      var s = PGRE.store.state;
      s.formulaDay = { date: PGRE.srs.today(), reviewIds: [], newIds: ['box-a', 'box-b', 'box-c'] };
      s.formulaStudy = null;
      PGRE.store.save();
    });
    if (await page.eval('!!document.getElementById("resume-btn")')) {
      await page.eval(function () {
        if (typeof PGRE.store.clearFormulaStudy === 'function') {
          PGRE.store.clearFormulaStudy({ id: 'test', done: 0, _opAt: Date.now(), _opId: 'test:end' });
        } else {
          PGRE.store.state.formulaStudy = null;
        }
        PGRE.store.save();
        location.hash = '#/';
      });
      await sleep(200);
      await page.eval(function () { location.hash = '#/formulas'; });
      await wait('#study-btn');
    }
    await click('#study-btn');
    await wait('.formula-palette .pal-cell');
  };

  h.focusBox = async function (selector) {
    await page.eval('() => { var b = document.querySelector(' + JSON.stringify(selector) +
      '); if (!b) throw new Error("missing " + ' + JSON.stringify(selector) +
      '); b.focus(); }');
    await sleep(50);
  };

  h.snap = async function () {
    return JSON.parse(await page.eval(function () {
      var st = PGRE.store.state;
      var disk = JSON.parse(localStorage.getItem('pgre-state-v1') || '{}');
      function keys(obj) { return obj ? Object.keys(obj).sort() : []; }
      var nameEl = document.querySelector('.fcard-name');
      var cells = [];
      document.querySelectorAll('.formula-palette .pal-cell').forEach(function (b) {
        var after = window.getComputedStyle(b, ':after');
        var content = after && after.content ? after.content : '';
        if (content === 'none' || content === 'normal') content = '';
        content = content.replace(/^["']|["']$/g, '');
        cells.push({
          n: b.textContent.trim(),
          id: b.getAttribute('data-id'),
          current: b.classList.contains('is-current'),
          grade: (b.className.match(/is-(again|hard|good|easy)/) || [])[1] || '',
          label: b.getAttribute('aria-label') || '',
          tip: b.getAttribute('data-box-tip') || '',
          after: content,
          afterOpacity: after ? after.opacity : '',
          interval: (st.cards && st.cards[b.getAttribute('data-id')] &&
            st.cards[b.getAttribute('data-id')].interval)
        });
      });
      var chosen = [];
      document.querySelectorAll('#fcard-actions [data-grade][aria-pressed="true"]').forEach(function (b) {
        chosen.push(b.getAttribute('data-grade'));
      });
      var main = document.querySelector('.study-main');
      var pal = document.querySelector('.formula-palette');
      var mr = main && main.getBoundingClientRect();
      var pr = pal && pal.getBoundingClientRect();
      var side = !!(mr && pr && pr.left >= mr.right - 2 && pr.top < mr.bottom);
      var below = !!(mr && pr && pr.top >= mr.bottom - 2);
      return JSON.stringify({
        name: nameEl ? nameEl.textContent.trim() : '',
        cells: cells,
        cellCount: cells.length,
        chosen: chosen,
        reviewing: !!document.querySelector('.formula-study-live .grade-chip'),
        flipped: !!(document.getElementById('fcard-back') && !document.getElementById('fcard-back').hidden),
        reviews: (st.cardReviews || []).length,
        diskReviews: (disk.cardReviews || []).length,
        done: st.formulaStudy && st.formulaStudy.done,
        pressCount: st.formulaStudy && st.formulaStudy.pressCount,
        history: (st.formulaStudy && st.formulaStudy.history) || [],
        studyKeys: keys(st.formulaStudy),
        diskStudyKeys: keys(disk.formulaStudy),
        lastGrades: st.cards,
        xp: st.xp,
        attempts: (st.attempts || []).length,
        layout: {
          side: side,
          below: below,
          mainWidth: mr ? Math.round(mr.width) : 0,
          palLeft: pr ? Math.round(pr.left) : 0,
          palTop: pr ? Math.round(pr.top) : 0,
          inner: window.innerWidth
        }
      });
    }));
  };

  return h;
}

var STAGES = [
  { name: 'grid has one box per session card; click jumps', shot: '01-wide-jump', size: '1280x800',
    run: async function (page, h) {
      await h.openFormulas();
      await h.seedThree();
      var before = await h.snap();
      h.assert(before.cellCount === 3, 'live Study shows three pal-cells');
      h.assert(before.studyKeys.join(',') === h.studyKeys.join(','),
        'formulaStudy keys stay ' + h.studyKeys.join(', '));
      var current = before.cells.filter(function (c) { return c.current; })[0];
      h.assert(!!current, 'one box is marked current');
      var other = before.cells.filter(function (c) { return !c.current && c.id !== 'box-c'; })[0]
        || before.cells.filter(function (c) { return !c.current; })[0];
      h.assert(!!other, 'a second box is available to jump to');
      var nameBefore = before.name;
      await h.click('.formula-palette .pal-cell[data-id="' + other.id + '"]');
      await h.sleep(200);
      var after = await h.snap();
      h.assert(after.name !== nameBefore, 'clicking a box shows a different card');
      var now = after.cells.filter(function (c) { return c.current; })[0];
      h.assert(now && now.id === other.id, 'the jumped-to box is is-current');
      h.assert(after.layout.side, 'at 1280px the grid sits to the right of the card');
      h.assert(after.layout.mainWidth >= 760,
        'the card column stays at least 760px beside the grid (got ' + after.layout.mainWidth + ')');
      after.cells.forEach(function (cell) {
        if (cell.id === 'box-c') {
          h.assert(cell.tip === 'not graded yet, 10 days',
            'box ' + cell.n + ' shows the stored 10-day interval while ungraded this session');
          h.assert(cell.after === 'not graded yet, 10 days',
            'box ' + cell.n + ' CSS label is the stored interval, not a due-date guess');
          h.assert(cell.label.indexOf('not graded yet') !== -1 && cell.label.indexOf('10 days') !== -1,
            'box ' + cell.n + ' aria-label names the ungraded state and 10 days');
        } else {
          h.assert(cell.tip === 'not graded yet, new',
            'box ' + cell.n + ' tip is "not graded yet, new" before any grade');
          h.assert(cell.after === 'not graded yet, new',
            'box ' + cell.n + ' CSS label matches the tip before any grade');
          h.assert(cell.label.indexOf('not graded yet') !== -1 && cell.label.indexOf('new') !== -1,
            'box ' + cell.n + ' aria-label names the ungraded state and new interval');
        }
      });
      var focusSel = '.formula-palette .pal-cell[data-id="' + now.id + '"]';
      await h.focusBox(focusSel);
      var focused = await h.snap();
      var focusedCell = focused.cells.filter(function (c) { return c.id === now.id; })[0];
      h.assert(focusedCell && focusedCell.afterOpacity === '1',
        'keyboard focus shows the box label');
    } },

  { name: 'after Easy the box shows Easy and 4 days', shot: '02-wide-easy',
    run: async function (page, h) {
      var start = await h.snap();
      var id = (start.cells.filter(function (c) { return c.current; })[0] || {}).id;
      h.assert(!!id, 'a current card id is on the grid');
      if (!start.flipped) {
        await h.click('#flip-btn');
        await h.wait('[data-grade="easy"]');
      }
      await h.click('[data-grade="easy"]');
      await h.sleep(250);
      var graded = await h.snap();
      h.assert(graded.reviews === 1 && graded.diskReviews === 1, 'Easy writes one cardReviews row');
      h.assert(graded.done === 1, 'session done climbs by one');
      h.assert(graded.pressCount === 1, 'one press is counted');
      h.assert(graded.attempts === 0, 'formula grades write no practice attempts');
      var easyCell = graded.cells.filter(function (c) { return c.id === id; })[0];
      h.assert(easyCell && easyCell.grade === 'easy', 'the graded box shows Easy');
      var easyIvl = graded.lastGrades && graded.lastGrades[id] && graded.lastGrades[id].interval;
      h.assert(easyIvl === 4, 'Easy on a new card stores interval 4');
      h.assert(easyCell.tip === 'Easy, 4 days' && easyCell.after === 'Easy, 4 days',
        'after Easy the box label is "Easy, 4 days"');
      h.assert(easyCell.label.indexOf('Easy') !== -1 && easyCell.label.indexOf('4 days') !== -1,
        'after Easy the aria-label names Easy and 4 days');
      await h.focusBox('.formula-palette .pal-cell[data-id="' + id + '"]');
      var focusedEasy = await h.snap();
      var focusedEasyCell = focusedEasy.cells.filter(function (c) { return c.id === id; })[0];
      h.assert(focusedEasyCell && focusedEasyCell.afterOpacity === '1',
        'keyboard focus shows the Easy label');
    } },

  { name: 'regrade changes the grade without a second review', shot: '03-wide-regrade',
    run: async function (page, h) {
      var graded = await h.snap();
      var easyCell = graded.cells.filter(function (c) { return c.grade === 'easy'; })[0];
      h.assert(!!easyCell, 'an Easy box is on the grid');
      var id = easyCell.id;
      var xpBefore = graded.xp || 0;
      await page.eval('() => { var id = ' + JSON.stringify(id) +
        '; var st = PGRE.store.state.cards[id]; if (st) st.due = "2020-01-01"; }');
      await h.click('.formula-palette .pal-cell[data-id="' + id + '"]');
      await h.wait('#fcard-actions [data-grade="good"]');
      var onGraded = await h.snap();
      h.assert(onGraded.reviewing, 'navigating to the graded card opens the regrade view');
      h.assert(onGraded.chosen.join(',') === 'easy', 'Easy stays pressed');
      var stillEasy = onGraded.cells.filter(function (c) { return c.id === id; })[0];
      h.assert(stillEasy && stillEasy.tip === 'Easy, 4 days',
        'label uses the stored interval after due is moved, not a due-date guess');
      await h.click('[data-grade="good"]');
      await h.sleep(250);
      var regraded = await h.snap();
      h.assert(regraded.reviews === 1 && regraded.diskReviews === 1,
        'regrade keeps a single cardReviews row');
      h.assert(regraded.done === 1, 'regrade does not climb done');
      h.assert(regraded.pressCount === 1, 'regrade does not count a second press');
      h.assert(regraded.attempts === 0, 'regrade writes no practice attempts');
      h.assert((regraded.xp || 0) === (graded.xp || 0),
        'regrade does not award a second XP settle yet');
      var card = regraded.lastGrades[id];
      h.assert(card && card.lastGrade === 'good', 'SRS lastGrade is now good');
      var goodCell = regraded.cells.filter(function (c) { return c.id === id; })[0];
      h.assert(goodCell && goodCell.grade === 'good', 'the box shows Good');
      var goodIvl = regraded.lastGrades && regraded.lastGrades[id] && regraded.lastGrades[id].interval;
      h.assert(goodIvl === 1, 'regrade to Good on a new card stores interval 1');
      h.assert(goodCell.tip === 'Good, 1 day' && goodCell.after === 'Good, 1 day',
        'after regrade the box label is "Good, 1 day"');
      h.assert(goodCell.label.indexOf('Good') !== -1 && goodCell.label.indexOf('1 day') !== -1,
        'after regrade the aria-label names Good and 1 day');
      h.assert(regraded.chosen.join(',') === 'good', 'Good is the pressed grade button');
      await h.focusBox('.formula-palette .pal-cell[data-id="' + id + '"]');
      var focusedGood = await h.snap();
      var focusedGoodCell = focusedGood.cells.filter(function (c) { return c.id === id; })[0];
      h.assert(focusedGoodCell && focusedGoodCell.afterOpacity === '1',
        'keyboard focus still shows the label after a regrade');
      h.assert(regraded.history.filter(function (row) { return row.id === id; }).length === 1,
        'history keeps one row for the card');
      h.assert(regraded.studyKeys.join(',') === h.studyKeys.join(','),
        'regrade does not grow formulaStudy keys');
      h.assert((regraded.xp || 0) >= xpBefore, 'the original Easy still counted as study work');
    } },

  { name: 'narrow width stacks the grid below the card', shot: '04-narrow-below', size: '700x800',
    run: async function (page, h) {
      await h.sleep(300);
      var snap = await h.snap();
      h.assert(snap.cellCount === 3, 'the grid still has three boxes at 700px');
      h.assert(snap.layout.below, 'at 700px the grid sits below the card');
      h.assert(!snap.layout.side, 'at 700px the grid is not beside the card');
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
  staticChecks();
  var profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pgre-recall-boxes-chrome-'));
  var shots = process.env.PGRE_RECALL_BOXES_SHOTS ? path.resolve(process.env.PGRE_RECALL_BOXES_SHOTS) : '';
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
    CHROME_DEVTOOLS_AXI_SESSION: 'pgre-recall-boxes-' + process.pid,
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
    env.PGRE_RECALL_BOXES_TEST_URL = 'http://127.0.0.1:' + server.address().port + '/';
    await run(['open', env.PGRE_RECALL_BOXES_TEST_URL], env);
    var size = '';
    for (var i = 0; i < STAGES.length; i++) {
      console.log('\n' + STAGES[i].name);
      if (STAGES[i].size && STAGES[i].size !== size) {
        size = STAGES[i].size;
        await run(['emulate', '--viewport', size], env);
      }
      await run(['run'], env, 'try { var h = await (' + helpers.toString() + ')(page); await (' +
        STAGES[i].run.toString() + ')(page, h); } catch (error) { console.log("BROWSER_TEST_FAILED: " + error.stack); }');
      if (shots && STAGES[i].shot) await run(['screenshot', path.join(shots, STAGES[i].shot + '.png')], env);
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
