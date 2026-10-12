#!/usr/bin/env node
/* Real-page check of the dashboard Mock exam tile: with a fixed local
   "today", the tile names the next unsat plan mock on or after that day.
   Isolated Chrome profile on a throwaway 127.0.0.1 port; never the saved
   studio. The status bridge on 127.0.0.1:4789 is refused by CSP.
   Run: node tools/test-next-mock-tile-chrome.js
   PGRE_MOCK_TILE_SHOTS=<dir> also saves one screenshot per day pin. */
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

function staticChecks() {
  function check(condition, message) {
    if (!condition) throw new Error(message);
    console.log('PASS: ' + message);
  }
  var index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  check(/js\/view-dashboard\.js\?v=\d{8}[a-z]/.test(index),
    'index.html cache-busts view-dashboard.js');
}

async function helpers(page) {
  var URL = process.env.PGRE_MOCK_TILE_TEST_URL;
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
    throw new Error('Timeout waiting for ' + (what || expression));
  };

  h.open = async function () {
    await page.open(URL);
    await h.wait('typeof PGRE !== "undefined" && typeof PGRE.nextMockPointer === "function" && !!document.getElementById("today-agenda")',
      'dashboard with nextMockPointer');
  };

  h.ensureCatalog = async function () {
    await page.eval(function () {
      function stub(id, title, format) {
        return {
          id: id, title: title, format: format,
          questions: [{
            id: id + '-q1', topic: 'cm', q: '<p>q</p>',
            choices: ['a', 'b', 'c', 'd', 'e'], answer: 0
          }]
        };
      }
      var need = [
        stub('ets2024', 'ETS Official Practice Test (2024)', '70x120'),
        stub('gr1777', 'GR1777 Released Exam (2017)', '100x170'),
        stub('gr9677', 'GR9677 Released Exam (1996)', '100x170')
      ];
      var have = {};
      (PGRE.ETS_EXAMS || []).forEach(function (ex) {
        if (ex && ex.id) have[String(ex.id).toLowerCase()] = true;
      });
      var missing = need.filter(function (ex) { return !have[ex.id]; });
      if (missing.length) {
        PGRE.ETS_EXAMS = (PGRE.ETS_EXAMS || []).concat(missing);
        if (PGRE._resetBankCache) PGRE._resetBankCache();
      }
    });
  };

  h.pinToday = async function (iso) {
    await page.eval('() => { var iso = ' + JSON.stringify(iso) + ';' +
      'var Real = window.__pgreRealDate || Date;' +
      'window.__pgreRealDate = Real;' +
      'var p = iso.split("-");' +
      'var target = new Real(+p[0], +p[1] - 1, +p[2], 12, 0, 0, 0).getTime();' +
      'var off = target - Real.now();' +
      'function F() {' +
      '  if (!(this instanceof F)) return new Real(Real.now() + off).toString();' +
      '  if (arguments.length === 0) return new Real(Real.now() + off);' +
      '  return new (Function.prototype.bind.apply(Real, [null].concat([].slice.call(arguments))))();' +
      '}' +
      'F.prototype = Real.prototype;' +
      'F.now = function () { return Real.now() + off; };' +
      'F.parse = Real.parse;' +
      'F.UTC = Real.UTC;' +
      'window.Date = F;' +
      '}');
  };

  h.setSat = async function (ids) {
    await page.eval('() => { PGRE.store.state.exams = ' +
      JSON.stringify(ids) + '.map(function (id) {' +
      '  var seventy = id === "ets2024";' +
      '  return { id: "ex-mv35d-" + id, source: id,' +
      '    format: seventy ? "70x120" : "100x170",' +
      '    raw: 59, total: seventy ? 70 : 100,' +
      '    submittedAt: "2026-10-11T16:09:00.000Z" };' +
      '}); }');
  };

  h.showDashboard = async function () {
    await page.eval(function () {
      if (location.hash !== '#/' && location.hash !== '') location.hash = '#/';
      PGRE.route();
    });
    await h.wait('!!document.getElementById("today-agenda")', '#today-agenda');
  };

  h.tile = async function () {
    return JSON.parse(await page.eval(function () {
      var mockRow = null;
      document.querySelectorAll('#today-agenda .rq-row.rq-tile').forEach(function (row) {
        var k = row.querySelector('.rq-kicker');
        if (k && /Mock exam/i.test(k.textContent)) mockRow = row;
      });
      return JSON.stringify({
        today: PGRE.store.today(),
        pointer: PGRE.nextMockPointer(),
        status: mockRow && mockRow.querySelector('.rq-status')
          ? mockRow.querySelector('.rq-status').textContent : '',
        title: mockRow && mockRow.querySelector('.rq-count')
          ? mockRow.querySelector('.rq-count').textContent : ''
      });
    }));
  };

  h.showExam = async function () {
    await page.eval(function () {
      location.hash = '#/exam';
      PGRE.route();
    });
    await h.wait('!!document.querySelector(".exam-format")', 'exam lobby');
  };

  h.lobby = async function () {
    return JSON.parse(await page.eval(function () {
      var next = document.querySelector('.exam-next-mock');
      var nextBtn = next && next.querySelector('[data-replay]');
      function info(id) {
        var btn = document.querySelector('[data-replay="' + id + '"]');
        if (!btn) return null;
        return {
          text: btn.textContent.trim(),
          disabled: !!btn.disabled,
          inNext: !!(next && next.contains(btn))
        };
      }
      return JSON.stringify({
        pointer: PGRE.nextMockPointer(),
        heading: next && next.querySelector('h2') ? next.querySelector('h2').textContent : '',
        nextId: nextBtn ? nextBtn.getAttribute('data-replay') : null,
        nextText: nextBtn ? nextBtn.textContent.trim() : '',
        nextDisabled: nextBtn ? !!nextBtn.disabled : null,
        ets2024: info('ets2024'),
        gr1777: info('gr1777')
      });
    }));
  };

  return h;
}

var STAGES = [
  { name: 'before the plan date (2026-10-10)', shot: 'tile-2026-10-10',
    run: async function (page, h) {
      await h.open();
      await h.ensureCatalog();
      await h.setSat([]);
      await h.pinToday('2026-10-10');
      await h.showDashboard();
      var t = await h.tile();
      h.assert(t.today === '2026-10-10', 'store.today is 2026-10-10, got ' + t.today);
      h.assert(t.pointer && t.pointer.id === 'ets2024' && t.pointer.scheduledFor === '2026-10-11',
        'pointer is ets2024 scheduled 2026-10-11, got ' + JSON.stringify(t.pointer));
      h.assert(t.status === 'Scheduled Oct 11', 'tile status Scheduled Oct 11, got ' + t.status);
      h.assert(t.title === 'ETS Official Practice Test (2024)', 'tile title ETS 2024, got ' + t.title);
      await h.showExam();
      var L = await h.lobby();
      h.assert(L.heading === 'Next scheduled mock' && L.nextId === 'ets2024' && L.nextDisabled === true,
        'lobby locks ets2024 until its date, got ' + JSON.stringify(L));
    } },

  { name: 'on the plan date (2026-10-11)', shot: 'tile-2026-10-11',
    run: async function (page, h) {
      await h.pinToday('2026-10-11');
      await h.showDashboard();
      var t = await h.tile();
      h.assert(t.today === '2026-10-11', 'store.today is 2026-10-11, got ' + t.today);
      h.assert(t.pointer && t.pointer.id === 'ets2024' && t.status === 'Scheduled Oct 11' &&
        t.title === 'ETS Official Practice Test (2024)',
        'on the date the tile still names ets2024, got ' + JSON.stringify(t));
      await h.showExam();
      var L = await h.lobby();
      h.assert(L.nextId === 'ets2024' && L.nextDisabled === false && L.heading === 'Your next mock',
        'on the date ets2024 is selectable as next mock, got ' + JSON.stringify(L));
    } },

  { name: 'after the plan date (2026-10-12)', shot: 'tile-2026-10-12',
    run: async function (page, h) {
      await h.pinToday('2026-10-12');
      await h.showDashboard();
      var t = await h.tile();
      h.assert(t.today === '2026-10-12', 'store.today is 2026-10-12, got ' + t.today);
      h.assert(t.pointer && t.pointer.id === 'gr1777' && t.pointer.scheduledFor === '2026-10-18',
        'pointer jumps to gr1777 on 2026-10-18, got ' + JSON.stringify(t.pointer));
      h.assert(t.status === 'Scheduled Oct 18', 'tile status Scheduled Oct 18, got ' + t.status);
      h.assert(t.title === 'GR1777 Released Exam (2017)', 'tile title GR1777, got ' + t.title);
      await h.showExam();
      var L = await h.lobby();
      h.assert(L.nextId === 'gr1777' && L.nextDisabled === true && L.heading === 'Next scheduled mock',
        'lobby protects GR1777 until Oct 18, got ' + JSON.stringify({
          heading: L.heading, nextId: L.nextId, nextDisabled: L.nextDisabled, nextText: L.nextText
        }));
      h.assert(L.ets2024 && L.ets2024.inNext === false && L.ets2024.disabled === false,
        'unsat ets2024 whose date has passed stays selectable in Other, got ' +
        JSON.stringify(L.ets2024));
    } },

  { name: 'sat 100Q form (gr1777) with ets2024 still unsat after its date',
    shot: 'tile-sat-gr1777',
    run: async function (page, h) {
      await h.ensureCatalog();
      await h.setSat(['gr1777']);
      await h.pinToday('2026-10-12');
      await h.showDashboard();
      var t = await h.tile();
      h.assert(t.today === '2026-10-12', 'store.today is 2026-10-12, got ' + t.today);
      h.assert(t.pointer && t.pointer.id !== 'gr1777',
        'the sat 100Q form is never the next mock, got ' + JSON.stringify(t.pointer));
      h.assert(t.pointer && t.pointer.id === 'gr9677' && t.pointer.scheduledFor === '2026-10-25',
        'skips passed ets2024 and sat gr1777, next is gr9677 on 2026-10-25, got ' +
        JSON.stringify(t.pointer));
      h.assert(t.status === 'Scheduled Oct 25', 'tile status Scheduled Oct 25, got ' + t.status);
      h.assert(t.title === 'GR9677 Released Exam (1996)', 'tile title GR9677, got ' + t.title);
      await h.showExam();
      var L = await h.lobby();
      h.assert(L.nextId === 'gr9677' && L.nextId !== 'gr1777',
        'lobby next is gr9677 not the sat 100Q form, got ' + L.nextId);
      h.assert(L.ets2024 && L.ets2024.inNext === false && L.ets2024.disabled === false,
        'unsat ets2024 stays selectable, got ' + JSON.stringify(L.ets2024));
      h.assert(L.gr1777 && L.gr1777.inNext === false,
        'sat gr1777 is not the next-mock card, got ' + JSON.stringify(L.gr1777));
    } },

  { name: 'no upcoming plan mock (2026-10-26)', shot: 'tile-2026-10-26',
    run: async function (page, h) {
      await h.setSat([]);
      await h.pinToday('2026-10-26');
      await h.showDashboard();
      var t = await h.tile();
      h.assert(t.today === '2026-10-26', 'store.today is 2026-10-26, got ' + t.today);
      h.assert(t.pointer && t.pointer.id === 'ets2024' && t.status === 'Scheduled Oct 11' &&
        t.title === 'ETS Official Practice Test (2024)',
        'with no upcoming plan mock the tile keeps the first unsat form, got ' + JSON.stringify(t));
    } },

  { name: 'a form with no plan date says Next intact form',
    run: async function (page, h) {
      await page.eval(function () {
        PGRE.store.state.exams = [{ source: 'ets2024' }];
        var extra = {
          id: 'gr0877', title: 'GR0877 Released Exam (2008)', format: '100x170',
          questions: [{
            id: 'gr0877-q1', topic: 'cm', q: '<p>q</p>',
            choices: ['a', 'b', 'c', 'd', 'e'], answer: 0
          }]
        };
        var list = (PGRE.ETS_EXAMS || []).filter(function (ex) {
          return !ex || String(ex.id).toLowerCase() !== 'gr0877';
        });
        PGRE.ETS_EXAMS = [extra].concat(list);
        if (PGRE._resetBankCache) PGRE._resetBankCache();
      });
      await h.pinToday('2026-10-12');
      await h.showDashboard();
      var t = await h.tile();
      h.assert(t.pointer && t.pointer.id === 'gr0877' && !t.pointer.scheduledFor,
        'first unsat form with no plan date stays the pointer, got ' + JSON.stringify(t.pointer));
      h.assert(t.status === 'Next intact form',
        'tile wording is Next intact form, got ' + t.status);
      h.assert(t.title === 'GR0877 Released Exam (2008)', 'tile title is the extra form, got ' + t.title);
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
  staticChecks();
  var profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pgre-next-mock-tile-chrome-'));
  var shots = process.env.PGRE_MOCK_TILE_SHOTS ? path.resolve(process.env.PGRE_MOCK_TILE_SHOTS) : '';
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
    CHROME_DEVTOOLS_AXI_SESSION: 'pgre-next-mock-tile',
    CHROME_DEVTOOLS_AXI_AUTO_CONNECT: '0',
    CHROME_DEVTOOLS_AXI_BROWSER_URL: '',
    CHROME_DEVTOOLS_AXI_USER_DATA_DIR: profile
  });
  try {
    await new Promise(function (resolve) { server.listen(0, '127.0.0.1', resolve); });
    env.PGRE_MOCK_TILE_TEST_URL = 'http://127.0.0.1:' + server.address().port + '/';
    await run(['open', env.PGRE_MOCK_TILE_TEST_URL], env);
    await run(['emulate', '--viewport', '1280x800'], env);
    for (var i = 0; i < STAGES.length; i++) {
      console.log('\n' + STAGES[i].name);
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
