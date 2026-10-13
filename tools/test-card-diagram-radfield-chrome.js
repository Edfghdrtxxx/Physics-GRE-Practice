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
  check(diagrams.indexOf('data-cd-zoom') !== -1 &&
    /passive:\s*false/.test(diagrams),
    'zoom buttons and a non-passive wheel listener are present');
  check(css.indexOf('.card-diagram-zoom') !== -1,
    'style.css styles the zoom control cluster');
  check(diagrams.indexOf('data-lab="pattern"') !== -1 &&
    diagrams.indexOf('not field lines') !== -1,
    'the diagram labels the dashed rings as the power pattern');
  check(diagrams.indexOf('data-cd-pan') !== -1 &&
    diagrams.indexOf('data-cd-centre') !== -1,
    'Move and Centre controls are present');
  check(css.indexOf('touch-action: none') !== -1 &&
    diagrams.indexOf('touch-action') === -1,
    'touch-action stays in CSS');
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
      var pattern = host && host.querySelector('[data-lab="pattern"]');
      var hint = host && host.querySelector('.card-diagram-hint');
      return JSON.stringify({
        name: name ? name.textContent.trim() : '',
        hidden: !!(back && back.hidden),
        hasHost: !!host,
        hostId: host ? host.getAttribute('data-card-diagram') : '',
        role: host ? host.getAttribute('role') : '',
        label: host ? host.getAttribute('aria-label') : '',
        yaw: host ? host.getAttribute('data-yaw') : '',
        pitch: host ? host.getAttribute('data-pitch') : '',
        zoom: host ? host.getAttribute('data-zoom') : '',
        cx: host ? host.getAttribute('data-cx') : '',
        cy: host ? host.getAttribute('data-cy') : '',
        cz: host ? host.getAttribute('data-cz') : '',
        fx: host ? host.getAttribute('data-fx') : '',
        fy: host ? host.getAttribute('data-fy') : '',
        ox: host ? host.getAttribute('data-ox') : '',
        oy: host ? host.getAttribute('data-oy') : '',
        ocx: host ? host.getAttribute('data-ocx') : '',
        ocy: host ? host.getAttribute('data-ocy') : '',
        pan: host ? host.getAttribute('data-pan') : '',
        ink: host ? host.getAttribute('data-ink') : '',
        patternText: pattern ? (pattern.textContent || '') : '',
        patternVisible: !!(pattern && getComputedStyle(pattern).visibility !== 'hidden'),
        hintText: hint ? (hint.textContent || '') : '',
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

  h.clickZoom = async function (op) {
    await page.eval('() => { var b = document.querySelector("[data-cd-zoom=\\"' + op +
      '\\"]"); if (!b) throw new Error("missing zoom " + ' + JSON.stringify(op) +
      '); b.click(); }');
    await sleep(80);
  };

  h.labelOverlap = async function () {
    return JSON.parse(await page.eval(function () {
      var host = document.querySelector('[data-card-diagram]');
      var labs = host ? host.querySelectorAll('.cd-lab') : [];
      var boxes = [];
      var i, j, a, b, x, y, area, max = 0, pair = '';
      for (i = 0; i < labs.length; i++) {
        var el = labs[i];
        if (!el.getClientRects().length) continue;
        if (getComputedStyle(el).visibility === 'hidden') continue;
        boxes.push({
          id: el.getAttribute('data-lab') || String(i),
          r: el.getBoundingClientRect()
        });
      }
      for (i = 0; i < boxes.length; i++) {
        for (j = i + 1; j < boxes.length; j++) {
          a = boxes[i].r;
          b = boxes[j].r;
          x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
          y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
          area = x * y;
          if (area > max) {
            max = area;
            pair = boxes[i].id + '+' + boxes[j].id;
          }
        }
      }
      return JSON.stringify({ max: max, pair: pair, n: boxes.length });
    }));
  };

  h.uiOverlap = async function () {
    return JSON.parse(await page.eval(function () {
      var host = document.querySelector('[data-card-diagram]');
      if (!host) return JSON.stringify({ max: 0, pair: '', n: 0 });
      var nodes = [];
      host.querySelectorAll('.cd-lab').forEach(function (el) {
        if (!el.getClientRects().length) return;
        if (getComputedStyle(el).visibility === 'hidden') return;
        nodes.push({ id: el.getAttribute('data-lab') || 'lab', r: el.getBoundingClientRect() });
      });
      var hint = host.querySelector('.card-diagram-hint');
      if (hint && hint.getClientRects().length && getComputedStyle(hint).visibility !== 'hidden') {
        nodes.push({ id: 'hint', r: hint.getBoundingClientRect() });
      }
      var zoom = host.querySelector('.card-diagram-zoom');
      if (zoom && zoom.getClientRects().length) {
        nodes.push({ id: 'zoom', r: zoom.getBoundingClientRect() });
      }
      var i, j, a, b, x, y, area, max = 0, pair = '';
      for (i = 0; i < nodes.length; i++) {
        for (j = i + 1; j < nodes.length; j++) {
          a = nodes[i].r;
          b = nodes[j].r;
          x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
          y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
          area = x * y;
          if (area > max) {
            max = area;
            pair = nodes[i].id + '+' + nodes[j].id;
          }
        }
      }
      return JSON.stringify({ max: max, pair: pair, n: nodes.length });
    }));
  };

  h.scrollDiagram = async function () {
    await page.eval(function () {
      var host = document.querySelector('[data-card-diagram]');
      if (host && host.scrollIntoView) host.scrollIntoView({ block: 'center' });
    });
    await sleep(200);
  };

  h.panDiagram = async function () {
    await page.eval(function () {
      var host = document.querySelector('[data-card-diagram]');
      var canvas = host && host.querySelector('canvas');
      if (!canvas) throw new Error('no diagram canvas');
      var r = canvas.getBoundingClientRect();
      var x = r.left + r.width * 0.4;
      var y = r.top + r.height * 0.45;
      function fire(type, cx, cy) {
        host.dispatchEvent(new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerId: 7,
          pointerType: 'mouse',
          clientX: cx,
          clientY: cy,
          shiftKey: true,
          button: 0,
          buttons: type === 'pointerup' ? 0 : 1
        }));
      }
      fire('pointerdown', x, y);
      fire('pointermove', x + 70, y + 24);
      fire('pointerup', x + 70, y + 24);
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
      h.assert(snap.patternVisible && /not field/i.test(snap.patternText),
        'the power-pattern label is on the rings (got "' + snap.patternText + '")');
      var stroke = JSON.parse(await page.eval(function () {
        return JSON.stringify(PGRE.cardDiagramStroke || {});
      }));
      h.assert(stroke.doughnutDash && stroke.doughnutDash.length >= 2 &&
        (!stroke.vectorDash || stroke.vectorDash.length === 0),
        'ring dash style differs from solid vectors');
      h.assert(/Move pans|Move pan/i.test(snap.hintText),
        'the hint names pan (got "' + snap.hintText + '")');
      var ov0 = await h.uiOverlap();
      h.assert(ov0.max === 0,
        'no labels or chrome overlap at default view (got ' + ov0.max + ' px^2 on ' + ov0.pair + ')');
      await h.scrollDiagram();
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

  { name: 'zoom in about the diagram centre', shot: '07-zoomed-in', size: '1280x800',
    run: async function (page, h) {
      await h.showCard('supp-drift-current');
      await h.sleep(100);
      await h.showCard('supp-radiation-field');
      await h.flip();
      await h.clickZoom('reset');
      var before = await h.snapBack();
      await h.clickZoom('in');
      await h.clickZoom('in');
      var after = await h.snapBack();
      h.assert(Number(after.zoom) > Number(before.zoom),
        'zoom in raises data-zoom (' + before.zoom + ' -> ' + after.zoom + ')');
      h.assert(after.pixels !== before.pixels, 'zoom in changes the drawn scene');
      h.assert(after.yaw === before.yaw, 'zoom in keeps rotation');
    } },

  { name: 'zoom out about the diagram centre', shot: '08-zoomed-out',
    run: async function (page, h) {
      await h.clickZoom('reset');
      var before = await h.snapBack();
      await h.clickZoom('out');
      await h.clickZoom('out');
      var after = await h.snapBack();
      h.assert(Number(after.zoom) < Number(before.zoom),
        'zoom out lowers data-zoom (' + before.zoom + ' -> ' + after.zoom + ')');
      h.assert(Number(after.zoom) >= 0.6, 'zoom out stays at or above 0.6');
      h.assert(after.pixels !== before.pixels, 'zoom out changes the drawn scene');
    } },

  { name: 'reset restores default zoom and rotation',
    run: async function (page, h) {
      await h.dragDiagram();
      await h.clickZoom('in');
      await h.clickZoom('reset');
      var snap = await h.snapBack();
      h.assert(Math.abs(Number(snap.yaw) - 1.08) < 1e-6, 'reset restores yaw 1.08');
      h.assert(Math.abs(Number(snap.pitch) - 0.42) < 1e-6, 'reset restores pitch 0.42');
      h.assert(Math.abs(Number(snap.zoom) - 1) < 1e-6, 'reset restores zoom 1');
      h.assert(Math.abs(Number(snap.cx)) < 1e-3 && Math.abs(Number(snap.cy)) < 1e-3 &&
        Math.abs(Number(snap.cz)) < 1e-3, 'reset restores the view centre to the charge');
    } },

  { name: 'wheel over the diagram does not scroll the page',
    run: async function (page, h) {
      var out = JSON.parse(await page.eval(function () {
        var host = document.querySelector('[data-card-diagram]');
        if (!host) throw new Error('no host');
        var y0 = window.scrollY || document.documentElement.scrollTop || 0;
        var z0 = host.getAttribute('data-zoom');
        var ev = new WheelEvent('wheel', {
          bubbles: true,
          cancelable: true,
          deltaY: -120,
          deltaMode: 0
        });
        var prevented = !host.dispatchEvent(ev);
        return JSON.stringify({
          prevented: prevented,
          y0: y0,
          y1: window.scrollY || document.documentElement.scrollTop || 0,
          z0: z0,
          z1: host.getAttribute('data-zoom')
        });
      }));
      h.assert(out.prevented, 'wheel preventDefault ran on the diagram');
      h.assert(out.y1 === out.y0, 'wheel over the diagram left page scroll unchanged');
      h.assert(Number(out.z1) > Number(out.z0),
        'wheel zoomed in (zoom ' + out.z0 + ' -> ' + out.z1 + ')');
    } },

  { name: 'zoom is clamped to 0.6-3',
    run: async function (page, h) {
      await h.clickZoom('reset');
      var i;
      for (i = 0; i < 16; i++) await h.clickZoom('in');
      var hi = await h.snapBack();
      h.assert(Math.abs(Number(hi.zoom) - 3) < 1e-6, 'zoom in clamps at 3 (got ' + hi.zoom + ')');
      await h.clickZoom('reset');
      for (i = 0; i < 16; i++) await h.clickZoom('out');
      var lo = await h.snapBack();
      h.assert(Math.abs(Number(lo.zoom) - 0.6) < 1e-6, 'zoom out clamps at 0.6 (got ' + lo.zoom + ')');
      await h.clickZoom('reset');
    } },

  { name: 'shift-drag pans the view centre without changing rotation', shot: '11-panned',
    run: async function (page, h) {
      await h.clickZoom('reset');
      var before = await h.snapBack();
      await h.panDiagram();
      var after = await h.snapBack();
      h.assert(after.yaw === before.yaw && after.pitch === before.pitch,
        'pan keeps yaw/pitch (yaw ' + before.yaw + ' -> ' + after.yaw + ')');
      h.assert(after.cx !== before.cx || after.cy !== before.cy || after.cz !== before.cz,
        'pan changes the view centre');
      h.assert(after.fx !== before.fx || after.fy !== before.fy,
        'pan moves the field point on screen');
      await h.scrollDiagram();
    } },

  { name: 'Move toggle makes a plain drag pan',
    run: async function (page, h) {
      await h.clickZoom('reset');
      await page.eval(function () {
        var b = document.querySelector('[data-cd-pan]');
        if (!b) throw new Error('missing Move');
        b.click();
      });
      await h.sleep(80);
      var before = await h.snapBack();
      h.assert(before.pan === '1', 'Move is pressed');
      await page.eval(function () {
        var host = document.querySelector('[data-card-diagram]');
        var canvas = host.querySelector('canvas');
        var r = canvas.getBoundingClientRect();
        var x = r.left + r.width * 0.45;
        var y = r.top + r.height * 0.5;
        function fire(type, cx, cy) {
          host.dispatchEvent(new PointerEvent(type, {
            bubbles: true, cancelable: true, pointerId: 3, pointerType: 'mouse',
            clientX: cx, clientY: cy, button: 0, buttons: type === 'pointerup' ? 0 : 1
          }));
        }
        fire('pointerdown', x, y);
        fire('pointermove', x + 60, y - 20);
        fire('pointerup', x + 60, y - 20);
      });
      await h.sleep(120);
      var after = await h.snapBack();
      h.assert(after.yaw === before.yaw && after.pitch === before.pitch,
        'Move-drag keeps rotation');
      h.assert(after.cx !== before.cx || after.cy !== before.cy || after.cz !== before.cz,
        'Move-drag pans the view centre');
      await page.eval(function () { document.querySelector('[data-cd-pan]').click(); });
    } },

  { name: 'two-finger drag pans while pinch still zooms',
    run: async function (page, h) {
      await h.clickZoom('reset');
      var before = await h.snapBack();
      await page.eval(function () {
        var host = document.querySelector('[data-card-diagram]');
        var canvas = host.querySelector('canvas');
        var r = canvas.getBoundingClientRect();
        var x = r.left + r.width * 0.4;
        var y = r.top + r.height * 0.45;
        function fire(type, id, cx, cy) {
          host.dispatchEvent(new PointerEvent(type, {
            bubbles: true, cancelable: true, pointerId: id, pointerType: 'touch',
            clientX: cx, clientY: cy, button: 0, buttons: type === 'pointerup' ? 0 : 1
          }));
        }
        fire('pointerdown', 11, x, y);
        fire('pointerdown', 12, x + 40, y);
        fire('pointermove', 11, x + 50, y + 10);
        fire('pointermove', 12, x + 90, y + 10);
        fire('pointerup', 11, x + 50, y + 10);
        fire('pointerup', 12, x + 90, y + 10);
      });
      await h.sleep(150);
      var panned = await h.snapBack();
      h.assert(panned.yaw === before.yaw && panned.pitch === before.pitch,
        'two-finger translate keeps rotation');
      h.assert(panned.cx !== before.cx || panned.cy !== before.cy || panned.cz !== before.cz,
        'two-finger translate pans');
      h.assert(Math.abs(Number(panned.zoom) - Number(before.zoom)) < 1e-3,
        'two-finger translate does not zoom');
      await h.clickZoom('reset');
      var z0 = await h.snapBack();
      await page.eval(function () {
        var host = document.querySelector('[data-card-diagram]');
        var canvas = host.querySelector('canvas');
        var r = canvas.getBoundingClientRect();
        var x = r.left + r.width * 0.5;
        var y = r.top + r.height * 0.5;
        function fire(type, id, cx, cy) {
          host.dispatchEvent(new PointerEvent(type, {
            bubbles: true, cancelable: true, pointerId: id, pointerType: 'touch',
            clientX: cx, clientY: cy, button: 0, buttons: type === 'pointerup' ? 0 : 1
          }));
        }
        fire('pointerdown', 21, x - 20, y);
        fire('pointerdown', 22, x + 20, y);
        fire('pointermove', 21, x - 45, y);
        fire('pointermove', 22, x + 45, y);
        fire('pointerup', 21, x - 45, y);
        fire('pointerup', 22, x + 45, y);
      });
      await h.sleep(150);
      var pinched = await h.snapBack();
      h.assert(Number(pinched.zoom) > Number(z0.zoom),
        'two-finger pinch zooms (' + z0.zoom + ' -> ' + pinched.zoom + ')');
    } },

  { name: 'wheel zoom toward the pointer keeps that point fixed',
    run: async function (page, h) {
      await h.clickZoom('reset');
      var before = await h.snapBack();
      var out = JSON.parse(await page.eval(function () {
        var host = document.querySelector('[data-card-diagram]');
        var canvas = host.querySelector('canvas');
        var r = canvas.getBoundingClientRect();
        var fx = Number(host.getAttribute('data-fx'));
        var fy = Number(host.getAttribute('data-fy'));
        var cw = canvas.clientWidth || r.width;
        var ch = canvas.clientHeight || r.height;
        var clientX = r.left + fx * (r.width / cw);
        var clientY = r.top + fy * (r.height / ch);
        var ev = new WheelEvent('wheel', {
          bubbles: true,
          cancelable: true,
          deltaY: -140,
          deltaMode: 0,
          clientX: clientX,
          clientY: clientY
        });
        host.dispatchEvent(ev);
        return JSON.stringify({
          fx0: fx,
          fy0: fy,
          fx1: Number(host.getAttribute('data-fx')),
          fy1: Number(host.getAttribute('data-fy')),
          z0: host.getAttribute('data-zoom'),
          z1: host.getAttribute('data-zoom')
        });
      }));
      var after = await h.snapBack();
      h.assert(Number(after.zoom) > Number(before.zoom),
        'pointer wheel zoomed in (' + before.zoom + ' -> ' + after.zoom + ')');
      h.assert(Math.abs(Number(after.fx) - Number(before.fx)) <= 1 &&
        Math.abs(Number(after.fy) - Number(before.fy)) <= 1,
        'the field point stayed under the pointer (before ' + before.fx + ',' + before.fy +
        ' after ' + after.fx + ',' + after.fy + ')');
    } },

  { name: 'Centre on field point puts it at the panel centre', shot: '09-centred-field',
    run: async function (page, h) {
      await h.clickZoom('reset');
      await page.eval(function () {
        var b = document.querySelector('[data-cd-centre]');
        if (!b) throw new Error('missing Centre');
        b.click();
      });
      await h.sleep(100);
      var snap = await h.snapBack();
      h.assert(Math.abs(Number(snap.fx) - Number(snap.ocx)) <= 1.5 &&
        Math.abs(Number(snap.fy) - Number(snap.ocy)) <= 1.5,
        'field point is at the panel centre (fx,fy=' + snap.fx + ',' + snap.fy +
        ' oc=' + snap.ocx + ',' + snap.ocy + ')');
      h.assert(Math.abs(Number(snap.cx) - 2.85 * Math.sin(50 * Math.PI / 180)) < 0.02,
        'view centre is the field point');
      await h.scrollDiagram();
    } },

  { name: 'zoomed in on the recentred field point', shot: '12-zoomed-field',
    run: async function (page, h) {
      await h.clickZoom('in');
      await h.clickZoom('in');
      var snap = await h.snapBack();
      h.assert(Number(snap.zoom) > 1.2, 'field point is zoomed in (zoom ' + snap.zoom + ')');
      h.assert(Math.abs(Number(snap.fx) - Number(snap.ocx)) <= 2 &&
        Math.abs(Number(snap.fy) - Number(snap.ocy)) <= 2,
        'zoomed field point is still at the panel centre');
      await h.scrollDiagram();
    } },

  { name: 'rotation pivots about the recentred field point', shot: '10-rotated-about-field',
    run: async function (page, h) {
      var before = await h.snapBack();
      await h.dragDiagram();
      var after = await h.snapBack();
      h.assert(after.yaw !== before.yaw || after.pitch !== before.pitch,
        'drag rotated after recentre');
      h.assert(Math.abs(Number(after.fx) - Number(after.ocx)) <= 2 &&
        Math.abs(Number(after.fy) - Number(after.ocy)) <= 2,
        'the field point stayed at the panel centre while rotating');
      await h.scrollDiagram();
    } },

  { name: 'double-click the field point recentres',
    run: async function (page, h) {
      await h.clickZoom('reset');
      await page.eval(function () {
        var host = document.querySelector('[data-card-diagram]');
        var canvas = host.querySelector('canvas');
        var r = canvas.getBoundingClientRect();
        var fx = Number(host.getAttribute('data-fx'));
        var fy = Number(host.getAttribute('data-fy'));
        var cw = canvas.clientWidth || r.width;
        var ch = canvas.clientHeight || r.height;
        var ev = new MouseEvent('dblclick', {
          bubbles: true,
          cancelable: true,
          clientX: r.left + fx * (r.width / cw),
          clientY: r.top + fy * (r.height / ch)
        });
        host.dispatchEvent(ev);
      });
      await h.sleep(100);
      var snap = await h.snapBack();
      h.assert(Math.abs(Number(snap.fx) - Number(snap.ocx)) <= 1.5 &&
        Math.abs(Number(snap.fy) - Number(snap.ocy)) <= 1.5,
        'double-click recentred on the field point');
    } },

  { name: 'pan is clamped so the drawing stays on the panel',
    run: async function (page, h) {
      await h.clickZoom('reset');
      await page.eval(function () {
        var host = document.querySelector('[data-card-diagram]');
        var canvas = host.querySelector('canvas');
        var r = canvas.getBoundingClientRect();
        var x = r.left + r.width * 0.5;
        var y = r.top + r.height * 0.5;
        function fire(type, cx, cy) {
          host.dispatchEvent(new PointerEvent(type, {
            bubbles: true, cancelable: true, pointerId: 9, pointerType: 'mouse',
            clientX: cx, clientY: cy, shiftKey: true,
            button: 0, buttons: type === 'pointerup' ? 0 : 1
          }));
        }
        fire('pointerdown', x, y);
        fire('pointermove', x + 4000, y + 3000);
        fire('pointerup', x + 4000, y + 3000);
      });
      await h.sleep(120);
      var out = JSON.parse(await page.eval(function () {
        var host = document.querySelector('[data-card-diagram]');
        var w = host.clientWidth, hgt = host.clientHeight;
        var pts = [
          [Number(host.getAttribute('data-ox')), Number(host.getAttribute('data-oy'))],
          [Number(host.getAttribute('data-fx')), Number(host.getAttribute('data-fy'))]
        ];
        var pad = 80, i, on = false;
        for (i = 0; i < pts.length; i++) {
          if (pts[i][0] >= -pad && pts[i][0] <= w + pad &&
              pts[i][1] >= -pad && pts[i][1] <= hgt + pad) on = true;
        }
        return JSON.stringify({ on: on, w: w, h: hgt, pts: pts });
      }));
      h.assert(out.on, 'after a huge pan a drawn point is still on the panel');
    } },

  { name: 'no label overlap at zoom 0.6, 1, and 3',
    run: async function (page, h) {
      await h.clickZoom('reset');
      var z1 = await h.uiOverlap();
      h.assert(z1.max === 0, 'no overlap at zoom 1 (got ' + z1.max + ' on ' + z1.pair + ')');
      var i;
      for (i = 0; i < 16; i++) await h.clickZoom('out');
      var lo = await h.snapBack();
      h.assert(Math.abs(Number(lo.zoom) - 0.6) < 1e-6, 'at zoom floor for overlap check');
      var z06 = await h.uiOverlap();
      h.assert(z06.max === 0, 'no overlap at zoom 0.6 (got ' + z06.max + ' on ' + z06.pair + ')');
      var fs = JSON.parse(await page.eval(function () {
        var el = document.querySelector('[data-card-diagram] .cd-lab[data-lab="a"]');
        return JSON.stringify({ size: el ? getComputedStyle(el).fontSize : '' });
      }));
      h.assert(fs.size === '13px', 'label font size does not scale with zoom (got ' + fs.size + ')');
      await h.clickZoom('reset');
      for (i = 0; i < 16; i++) await h.clickZoom('in');
      var hi = await h.snapBack();
      h.assert(Math.abs(Number(hi.zoom) - 3) < 1e-6, 'at zoom ceiling for overlap check');
      var z3 = await h.uiOverlap();
      h.assert(z3.max === 0, 'no overlap at zoom 3 (got ' + z3.max + ' on ' + z3.pair + ')');
      await h.clickZoom('reset');
    } },

  { name: 'twelve remounts leave one canvas and one host',
    run: async function (page, h) {
      var out = JSON.parse(await page.eval(function () {
        var back = document.getElementById('fcard-back');
        var i, host, parent, fresh;
        for (i = 0; i < 12; i++) {
          host = back.querySelector('[data-card-diagram]');
          parent = host.parentNode;
          parent.removeChild(host);
          fresh = document.createElement('div');
          fresh.className = 'card-diagram-host';
          fresh.setAttribute('data-card-diagram', 'supp-radiation-field');
          parent.insertBefore(fresh, parent.firstChild);
          PGRE.mountCardDiagrams(back);
        }
        return JSON.stringify({
          hosts: back.querySelectorAll('[data-card-diagram]').length,
          canvases: back.querySelectorAll('canvas').length,
          mounted: back.querySelectorAll('[data-card-diagram][data-mounted="1"]').length
        });
      }));
      h.assert(out.hosts === 1 && out.canvases === 1 && out.mounted === 1,
        'after 12 remounts there is one host and one canvas (hosts=' + out.hosts +
        ' canvases=' + out.canvases + ')');
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
      var ov = await h.labelOverlap();
      h.assert(ov.n >= 6, 'vector labels are present at phone width');
      h.assert(ov.max === 0,
        'no two labels overlap at phone width (got ' + ov.max + ' px^2 on ' + ov.pair + ')');
      var ui = await h.uiOverlap();
      h.assert(ui.max === 0,
        'no label/hint/control overlap at 390 px (got ' + ui.max + ' px^2 on ' + ui.pair + ')');
      h.assert(/not field/i.test(snap.patternText),
        'the power-pattern label is present at phone width');
    } },

  { name: 'diagram in dark theme', shot: '06-back-dark', size: '1280x800',
    run: async function (page, h) {
      await page.eval(function () {
        if (PGRE.setTheme) PGRE.setTheme('light');
        else if (PGRE.applyTheme) PGRE.applyTheme('light');
      });
      await h.showCard('supp-radiation-field');
      await h.flip();
      await h.sleep(200);
      var before = await h.snapBack();
      await page.eval(function () {
        if (PGRE.setTheme) PGRE.setTheme('dark');
        else if (PGRE.applyTheme) PGRE.applyTheme('dark');
      });
      await h.sleep(250);
      var after = await h.snapBack();
      var theme = await page.eval(function () {
        return document.documentElement.getAttribute('data-theme') || '';
      });
      h.assert(theme === 'dark', 'html data-theme is dark');
      h.assert(after.pixels !== before.pixels, 'a live theme toggle redraws the canvas');
      h.assert(after.ink !== before.ink, 'a live theme toggle picks up new CSS colours');
      await h.showCard('supp-drift-current');
      await h.sleep(150);
      await h.showCard('supp-radiation-field');
      await h.flip();
      await page.eval(function () {
        var host = document.querySelector('[data-card-diagram]');
        if (host && host.scrollIntoView) host.scrollIntoView({ block: 'center' });
      });
      await h.sleep(250);
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
