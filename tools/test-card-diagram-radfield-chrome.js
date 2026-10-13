#!/usr/bin/env node
/* Real-page check of the supp-radiation-field inline 3D diagram on the
   Recall card back. Isolated Chrome profile on a throwaway 127.0.0.1 port;
   never the saved studio. The status bridge on 127.0.0.1:4789 is refused by CSP.
   Run: node tools/test-card-diagram-radfield-chrome.js
   PGRE_RADFIELD_SHOTS=<dir> also saves one screenshot per stage. */
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
  var view = fs.readFileSync(path.join(ROOT, 'js', 'view-formulas.js'), 'utf8');
  var diagrams = fs.readFileSync(path.join(ROOT, 'js', 'card-diagrams.js'), 'utf8');
  var css = fs.readFileSync(path.join(ROOT, 'css', 'style.css'), 'utf8');
  check(/js\/card-diagrams\.js\?v=\d{8}[a-z]/.test(index),
    'index.html cache-busts card-diagrams.js');
  check(diagrams.indexOf("PGRE.cardDiagrams['supp-radiation-field']") !== -1,
    'the radiation-field diagram is registered by card id');
  check(view.indexOf('replaceRecallListWithDiagram') !== -1,
    'view-formulas backHTML consults the diagram registry');
  check(css.indexOf('.card-diagram-host') !== -1 &&
    css.indexOf('aspect-ratio') !== -1,
    'style.css sizes the diagram to the card width');
  check(diagrams.indexOf('role') !== -1 && diagrams.indexOf('aria-label') !== -1,
    'the diagram publishes an accessible name');
  check(diagrams.indexOf('pointerdown') !== -1 &&
    diagrams.indexOf('touch-action') === -1,
    'rotation is pointer-driven (touch-action lives in CSS)');
  check(css.indexOf('touch-action: none') !== -1,
    'CSS disables touch scrolling on the diagram host');
}

async function helpers(page) {
  var URL = process.env.PGRE_RADFIELD_TEST_URL;
  function sleep(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
  var h = { sleep: sleep };

  function assert(condition, message) {
    if (!condition) throw new Error(message);
    console.log('PASS: ' + message);
  }
  h.assert = assert;

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

  h.seedTwoLists = async function () {
    await page.eval(function () {
      var rad = PGRE.FORMULAS.filter(function (c) { return c.id === 'supp-radiation-field'; })[0];
      var other = PGRE.FORMULAS.filter(function (c) { return c.id === 'supp-drift-current'; })[0];
      if (!rad || !other) throw new Error('missing list cards in PGRE.FORMULAS');
      PGRE.FORMULAS = [rad, other];
      PGRE.BOOK_FORMULAS = [];
      PGRE.BOOK_LISTS = [];
      var s = PGRE.store.state;
      s.cards = {};
      s.cardReviews = [];
      s.reviewUndos = {};
      s.formulaDay = {
        date: PGRE.srs.today(),
        reviewIds: [],
        newIds: ['supp-radiation-field', 'supp-drift-current']
      };
      s.formulaStudy = null;
      s.formulaStudyEnd = null;
      s.formulaSuspended = {};
      s.settings.formulaDailyTarget = 2;
      s.settings.examDate = '';
      s.settings.keyboard = true;
      s.settings.formulaReverse = false;
      s.settings.theme = 'light';
      PGRE.store.save();
      if (PGRE.applyTheme) PGRE.applyTheme('light');
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
    await wait('#fcard');
  };

  h.showCard = async function (id) {
    var name = await page.eval(function () {
      var n = document.querySelector('.fcard-name');
      return n ? n.textContent : '';
    });
    var currentId = await page.eval(function () {
      var cell = document.querySelector('.formula-palette .pal-cell.is-current');
      return cell ? cell.getAttribute('data-id') : '';
    });
    if (currentId !== id) {
      var sel = '.formula-palette .pal-cell[data-id="' + id + '"]';
      if (await page.eval('!!document.querySelector(' + JSON.stringify(sel) + ')')) {
        await click(sel);
        await sleep(200);
      } else {
        await page.eval('() => { if (window.PGRE && PGRE.views && PGRE.views.formulas) { /* palette missing */ } }');
        throw new Error('no palette cell for ' + id + ' (on screen: ' + name + ', current=' + currentId + ')');
      }
    }
  };

  h.flip = async function () {
    var flipped = await page.eval(function () {
      var b = document.getElementById('fcard-back');
      return !!(b && !b.hidden);
    });
    if (!flipped) {
      await click('#flip-btn');
      await sleep(250);
    }
  };

  h.snapBack = async function () {
    return JSON.parse(await page.eval(function () {
      var back = document.getElementById('fcard-back');
      var host = back && back.querySelector('[data-card-diagram]');
      var canvas = host && host.querySelector('canvas');
      var list = back && back.querySelector('.recall-list');
      var name = document.querySelector('.fcard-name');
      var similar = document.querySelector('#fcard-actions .similar-problem, #fcard-actions [data-similar], .btn-row .similar-problem');
      var similarBtns = [];
      document.querySelectorAll('#fcard-actions button, #fcard-actions a, #fcard-actions span').forEach(function (el) {
        similarBtns.push((el.textContent || '').trim());
      });
      return JSON.stringify({
        name: name ? name.textContent.trim() : '',
        hidden: !!(back && back.hidden),
        hasHost: !!host,
        hostId: host ? host.getAttribute('data-card-diagram') : '',
        role: host ? host.getAttribute('role') : '',
        label: host ? host.getAttribute('aria-label') : '',
        yaw: host ? host.getAttribute('data-yaw') : '',
        pitch: host ? host.getAttribute('data-pitch') : '',
        hasCanvas: !!canvas,
        canvasW: canvas ? canvas.width : 0,
        canvasH: canvas ? canvas.height : 0,
        pixels: canvas ? canvas.toDataURL() : '',
        hasList: !!list,
        listCount: list ? list.querySelectorAll('li').length : 0,
        similarText: similarBtns.join(' | '),
        similarPresent: similarBtns.some(function (t) {
          return /similar/i.test(t);
        })
      });
    }));
  };

  h.dragDiagram = async function () {
    await page.eval(function () {
      var host = document.querySelector('[data-card-diagram]');
      var canvas = host && host.querySelector('canvas');
      if (!canvas) throw new Error('no diagram canvas');
      var r = canvas.getBoundingClientRect();
      var x = r.left + r.width * 0.4;
      var y = r.top + r.height * 0.45;
      function fire(type, cx, cy) {
        canvas.dispatchEvent(new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerId: 1,
          pointerType: 'mouse',
          clientX: cx,
          clientY: cy,
          buttons: type === 'pointerup' ? 0 : 1
        }));
      }
      fire('pointerdown', x, y);
      fire('pointermove', x + 90, y + 40);
      fire('pointerup', x + 90, y + 40);
    });
    await sleep(150);
  };

  return h;
}

var STAGES = [
  { name: 'radiation-field card front', shot: '01-front', size: '1280x800',
    run: async function (page, h) {
      await h.openFormulas();
      await h.seedTwoLists();
      await h.showCard('supp-radiation-field');
      var front = JSON.parse(await page.eval(function () {
        var name = document.querySelector('.fcard-name');
        var frontEl = document.getElementById('fcard-front');
        var back = document.getElementById('fcard-back');
        return JSON.stringify({
          name: name ? name.textContent.trim() : '',
          front: frontEl ? frontEl.textContent : '',
          backHidden: !!(back && back.hidden)
        });
      }));
      h.assert(/Nonrelativistic radiation-field direction/.test(front.name),
        'Study shows the radiation-field card front');
      h.assert(front.backHidden, 'the back is hidden before flip');
    } },

  { name: 'radiation-field back is a 3D diagram, not four bullets', shot: '02-back-default',
    run: async function (page, h) {
      await h.flip();
      await h.wait('#fcard-back [data-card-diagram="supp-radiation-field"]');
      var snap = await h.snapBack();
      h.assert(snap.hasHost && snap.hasCanvas, 'the diagram host and canvas are on the back');
      h.assert(snap.role === 'img' && /radiation/.test(snap.label),
        'the diagram has role=img and an accessible name');
      h.assert(!snap.hasList && snap.listCount === 0,
        'the four recall-list bullets are absent');
      h.assert(snap.canvasW > 0 && snap.canvasH > 0, 'the canvas has a drawn buffer');
      h.assert(snap.similarPresent, 'Find similar problem is still on the card');
      var note = await page.eval(function () {
        var n = document.querySelector('#fcard-back .fcard-note');
        return n ? n.textContent : '';
      });
      h.assert(/Supplemental/.test(note),
        'the note line still renders under the diagram');
    } },

  { name: 'pointer drag changes the projected view', shot: '03-back-rotated',
    run: async function (page, h) {
      var before = await h.snapBack();
      h.assert(before.yaw !== '', 'default yaw is published for the test');
      await h.dragDiagram();
      var after = await h.snapBack();
      h.assert(after.yaw !== before.yaw || after.pitch !== before.pitch,
        'drag updates yaw/pitch (before yaw=' + before.yaw + ' after=' + after.yaw + ')');
      h.assert(after.pixels !== before.pixels,
        'drag changes the drawn projection');
      h.assert(!after.hasList, 'bullets stay absent after rotate');
    } },

  { name: 'diagram at a narrow phone width', shot: '04-back-phone', size: '390x844',
    run: async function (page, h) {
      await h.showCard('supp-drift-current');
      await h.sleep(150);
      await h.showCard('supp-radiation-field');
      await h.flip();
      await page.eval(function () {
        var host = document.querySelector('[data-card-diagram]');
        if (host && host.scrollIntoView) host.scrollIntoView({ block: 'center' });
      });
      await h.sleep(200);
      var snap = await h.snapBack();
      h.assert(snap.hasHost && snap.hasCanvas, 'the diagram is present at phone width');
      h.assert(!snap.hasList, 'bullets stay absent at phone width');
    } },

  { name: 'diagram in dark theme', shot: '06-back-dark', size: '1280x800',
    run: async function (page, h) {
      await page.eval(function () {
        if (PGRE.setTheme) PGRE.setTheme('dark');
        else if (PGRE.applyTheme) PGRE.applyTheme('dark');
      });
      await h.showCard('supp-drift-current');
      await h.sleep(150);
      await h.showCard('supp-radiation-field');
      await h.flip();
      await page.eval(function () {
        var host = document.querySelector('[data-card-diagram]');
        if (host && host.scrollIntoView) host.scrollIntoView({ block: 'center' });
      });
      await h.sleep(250);
      var theme = await page.eval(function () {
        return document.documentElement.getAttribute('data-theme') || '';
      });
      h.assert(theme === 'dark', 'html data-theme is dark');
      var snap = await h.snapBack();
      h.assert(snap.hasHost && snap.hasCanvas, 'the diagram is present in dark theme');
      h.assert(!snap.hasList, 'bullets stay absent in dark theme');
    } },

  { name: 'another list card still shows its bullets', shot: '05-other-list-back',
    run: async function (page, h) {
      await page.eval(function () {
        if (PGRE.setTheme) PGRE.setTheme('light');
        else if (PGRE.applyTheme) PGRE.applyTheme('light');
      });
      await h.showCard('supp-drift-current');
      await h.flip();
      await h.sleep(200);
      var snap = JSON.parse(await page.eval(function () {
        var back = document.getElementById('fcard-back');
        var name = document.querySelector('.fcard-name');
        var list = back && back.querySelector('.recall-list');
        var host = back && back.querySelector('[data-card-diagram]');
        return JSON.stringify({
          name: name ? name.textContent.trim() : '',
          hasList: !!list,
          listCount: list ? list.querySelectorAll('li').length : 0,
          hasHost: !!host
        });
      }));
      h.assert(/drift|Ohm|current/i.test(snap.name),
        'the control card is the drift-current list (got ' + snap.name + ')');
      h.assert(snap.hasList && snap.listCount >= 3,
        'the unregistered list card still shows its bullets');
      h.assert(!snap.hasHost, 'the control card has no diagram host');
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
  var profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pgre-radfield-chrome-'));
  var shots = process.env.PGRE_RADFIELD_SHOTS ? path.resolve(process.env.PGRE_RADFIELD_SHOTS) : '';
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
    CHROME_DEVTOOLS_AXI_SESSION: 'pgre-radfield-' + process.pid,
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
    env.PGRE_RADFIELD_TEST_URL = 'http://127.0.0.1:' + server.address().port + '/';
    await run(['open', env.PGRE_RADFIELD_TEST_URL], env);
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
