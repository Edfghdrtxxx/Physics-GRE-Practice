#!/usr/bin/env node
/* Gating tests for the 30 formula visualizers — loads the SHIPPED engine +
   trio scripts (no re-implementation of chrome/draw). Run from repo root:
     node tools/test-visualizer-aesthetics.js
*/
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var root = path.resolve(__dirname, '..');

var EXPECTED_IDS = [
  'cpgf-1.35', 'cpgf-1.38', 'cpgf-1.3',
  'cpgf-1.4', 'cpgf-1.22', 'cpgf-1.20',
  'cpgf-1.39', 'cpgf-1.41', 'cpgf-1.42',
  'cpgf-1.47', 'cpgf-1.24', 'cpgf-1.25', 'cpgf-1.48',
  'cpgf-1.26', 'cpgf-1.27', 'cpgf-1.15',
  'cpgf-1.28', 'cpgf-1.29', 'cpgf-1.30',
  'cpgf-1.31', 'cpgf-1.32', 'cpgf-1.33',
  'cpgf-1.9', 'cpgf-2.4', 'cpgf-2.8', 'cpgf-2.33',
  'cpgf-2.70', 'cpgf-4.14', 'cpgf-4.32', 'cpgf-5.18',
  'cpgf-5.27', 'cpgf-6.18', 'cpgf-7.17'
];

var TRIO_FILES = [];
for (var gi = 1; gi <= 10; gi++) TRIO_FILES.push('js/visualizers/trio-g' + gi + '.js');

var CREAM = '#faf9f5';
var LAB_W = 640;
var LAB_H = 420;

var passed = 0;
var failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed++;
    console.log('  ok  — ' + msg);
  } else {
    failed++;
    console.log('  FAIL — ' + msg);
  }
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isCreamColor(style) {
  if (style == null) return false;
  if (typeof style !== 'string') return false;
  var s = style.replace(/\s+/g, '').toLowerCase();
  if (s === CREAM) return true;
  if (s === 'rgb(250,249,245)') return true;
  if (s === 'rgba(250,249,245,1)') return true;
  if (s === 'rgba(250,249,245,1.0)') return true;
  return false;
}

function coversFullCanvas(op, w, h) {
  if (!op || op.op !== 'fillRect') return false;
  var x = Number(op.x), y = Number(op.y), rw = Number(op.w), rh = Number(op.h);
  if (!isFinite(x) || !isFinite(y) || !isFinite(rw) || !isFinite(rh)) return false;
  return x <= 0.5 && y <= 0.5 && (x + rw) >= w - 0.5 && (y + rh) >= h - 0.5 &&
    rw >= w * 0.95 && rh >= h * 0.95;
}

/* -------------------------------------------------------------------------- */
/* Recording 2d context — enough surface for the 30 draw() bodies to run.     */
/* -------------------------------------------------------------------------- */

function makeRecordingCtx(w, h) {
  var rec = [];
  var state = {
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    font: '10px sans-serif',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    globalAlpha: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    miterLimit: 10,
    shadowBlur: 0,
    shadowColor: 'rgba(0,0,0,0)',
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    globalCompositeOperation: 'source-over',
    filter: 'none',
    direction: 'ltr'
  };
  var stack = [];
  var canvas = { width: w, height: h };

  function grad() {
    return { addColorStop: function () { /* no-op */ } };
  }

  var target = {
    canvas: canvas,
    _ops: rec,
    save: function () { stack.push(Object.assign({}, state)); rec.push({ op: 'save' }); },
    restore: function () {
      if (stack.length) state = stack.pop();
      rec.push({ op: 'restore' });
    },
    fillRect: function (x, y, rw, rh) {
      rec.push({ op: 'fillRect', x: +x, y: +y, w: +rw, h: +rh, fillStyle: state.fillStyle });
    },
    strokeRect: function (x, y, rw, rh) {
      rec.push({ op: 'strokeRect', x: +x, y: +y, w: +rw, h: +rh });
    },
    clearRect: function (x, y, rw, rh) {
      rec.push({ op: 'clearRect', x: +x, y: +y, w: +rw, h: +rh });
    },
    beginPath: function () { rec.push({ op: 'beginPath' }); },
    closePath: function () { rec.push({ op: 'closePath' }); },
    moveTo: function () { rec.push({ op: 'moveTo' }); },
    lineTo: function () { rec.push({ op: 'lineTo' }); },
    arc: function () { rec.push({ op: 'arc' }); },
    arcTo: function () { rec.push({ op: 'arcTo' }); },
    ellipse: function () { rec.push({ op: 'ellipse' }); },
    rect: function () { rec.push({ op: 'rect' }); },
    roundRect: function () { rec.push({ op: 'roundRect' }); },
    quadraticCurveTo: function () { rec.push({ op: 'quadraticCurveTo' }); },
    bezierCurveTo: function () { rec.push({ op: 'bezierCurveTo' }); },
    fill: function () { rec.push({ op: 'fill', fillStyle: state.fillStyle }); },
    stroke: function () { rec.push({ op: 'stroke' }); },
    clip: function () { rec.push({ op: 'clip' }); },
    fillText: function () { rec.push({ op: 'fillText' }); },
    strokeText: function () { rec.push({ op: 'strokeText' }); },
    measureText: function (text) {
      var t = text == null ? '' : String(text);
      return { width: t.length * 7 };
    },
    setLineDash: function () { rec.push({ op: 'setLineDash' }); },
    getLineDash: function () { return []; },
    translate: function () { rec.push({ op: 'translate' }); },
    rotate: function () { rec.push({ op: 'rotate' }); },
    scale: function () { rec.push({ op: 'scale' }); },
    transform: function () { rec.push({ op: 'transform' }); },
    setTransform: function () { rec.push({ op: 'setTransform' }); },
    resetTransform: function () { rec.push({ op: 'resetTransform' }); },
    createLinearGradient: function () { rec.push({ op: 'createLinearGradient' }); return grad(); },
    createRadialGradient: function () { rec.push({ op: 'createRadialGradient' }); return grad(); },
    createPattern: function () { return null; },
    drawImage: function () { rec.push({ op: 'drawImage' }); },
    getImageData: function (x, y, rw, rh) {
      var n = Math.max(0, (rw | 0) * (rh | 0) * 4);
      return { width: rw | 0, height: rh | 0, data: new Uint8ClampedArray(n) };
    },
    putImageData: function () { rec.push({ op: 'putImageData' }); },
    createImageData: function (rw, rh) {
      var n = Math.max(0, (rw | 0) * (rh | 0) * 4);
      return { width: rw | 0, height: rh | 0, data: new Uint8ClampedArray(n) };
    },
    isPointInPath: function () { return false; },
    isPointInStroke: function () { return false; }
  };

  ['fillStyle', 'strokeStyle', 'lineWidth', 'font', 'textAlign', 'textBaseline',
    'globalAlpha', 'lineCap', 'lineJoin', 'miterLimit', 'shadowBlur', 'shadowColor',
    'shadowOffsetX', 'shadowOffsetY', 'globalCompositeOperation', 'filter',
    'direction', 'lineDashOffset'].forEach(function (k) {
    Object.defineProperty(target, k, {
      enumerable: true,
      configurable: true,
      get: function () { return state[k]; },
      set: function (v) { state[k] = v; }
    });
  });

  return new Proxy(target, {
    get: function (t, prop) {
      if (prop in t) return t[prop];
      if (typeof prop === 'symbol') return undefined;
      return function () { rec.push({ op: String(prop) }); };
    }
  });
}

/* -------------------------------------------------------------------------- */
/* Minimal document stub — no jsdom. innerHTML builds a queryable tree.       */
/* -------------------------------------------------------------------------- */

var VOID_TAGS = {
  area: 1, base: 1, br: 1, col: 1, embed: 1, hr: 1, img: 1, input: 1,
  link: 1, meta: 1, param: 1, source: 1, track: 1, wbr: 1
};

function parseAttrs(src) {
  var attrs = {};
  var re = /([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  var m;
  while ((m = re.exec(src))) {
    var name = m[1];
    var val = m[2] !== undefined ? m[2]
      : (m[3] !== undefined ? m[3]
        : (m[4] !== undefined ? m[4] : ''));
    attrs[name] = val;
  }
  return attrs;
}

function makeClassList(el) {
  function tokens() {
    return String(el.className || '').trim().split(/\s+/).filter(Boolean);
  }
  function write(list) {
    el.className = list.join(' ');
  }
  return {
    add: function () {
      var list = tokens();
      for (var i = 0; i < arguments.length; i++) {
        var n = String(arguments[i]);
        if (n && list.indexOf(n) < 0) list.push(n);
      }
      write(list);
    },
    remove: function () {
      var list = tokens();
      for (var i = 0; i < arguments.length; i++) {
        var n = String(arguments[i]);
        list = list.filter(function (x) { return x !== n; });
      }
      write(list);
    },
    contains: function (name) {
      return tokens().indexOf(String(name)) >= 0;
    },
    toggle: function (name, force) {
      var has = this.contains(name);
      if (force === undefined) {
        if (has) this.remove(name); else this.add(name);
        return !has;
      }
      if (force) this.add(name); else this.remove(name);
      return !!force;
    }
  };
}

function makeStyle() {
  var bag = {};
  return new Proxy(bag, {
    get: function (t, p) {
      if (p === 'cssText') {
        return Object.keys(t).map(function (k) { return k + ':' + t[k]; }).join(';');
      }
      return t[p] || '';
    },
    set: function (t, p, v) {
      t[p] = v;
      return true;
    }
  });
}

function matchesSimple(el, sel) {
  sel = String(sel || '').trim();
  if (!sel || sel === '*') return true;
  var rest = sel;
  var tagM = rest.match(/^[a-zA-Z][a-zA-Z0-9-]*/);
  if (tagM) {
    if (el.tagName !== tagM[0].toUpperCase()) return false;
    rest = rest.slice(tagM[0].length);
  }
  var tokenRe = /(\.[a-zA-Z0-9_-]+)|(#([a-zA-Z0-9_-]+))|(\[([^\]]+)\])/g;
  var tm;
  var saw = tagM != null;
  while ((tm = tokenRe.exec(rest))) {
    saw = true;
    if (tm[1]) {
      if (!el.classList.contains(tm[1].slice(1))) return false;
    } else if (tm[2]) {
      if (el.id !== tm[3]) return false;
    } else if (tm[4]) {
      var inner = tm[5];
      var eq = inner.match(/^([^\s=~|^$*]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s\]]+)))?$/);
      if (!eq) return false;
      var an = eq[1];
      var av = eq[2] !== undefined ? eq[2] : (eq[3] !== undefined ? eq[3] : eq[4]);
      var has = el.getAttribute(an);
      if (av === undefined) {
        if (has == null) return false;
      } else if (String(has) !== String(av)) {
        return false;
      }
    }
  }
  return saw || rest === '';
}

function walk(el, fn) {
  var kids = el.childNodes || [];
  for (var i = 0; i < kids.length; i++) {
    var c = kids[i];
    if (c.nodeType === 1) {
      fn(c);
      walk(c, fn);
    }
  }
}

function makeEl(tag, owner) {
  tag = String(tag || 'div').toLowerCase();
  var el = {
    nodeType: 1,
    tagName: tag.toUpperCase(),
    id: '',
    className: '',
    childNodes: [],
    parentNode: null,
    ownerDocument: owner || null,
    attrs: {},
    listeners: {},
    disabled: false,
    hidden: false,
    selected: false,
    checked: false,
    value: '',
    type: tag === 'input' ? 'text' : '',
    _width: tag === 'canvas' ? 300 : 0,
    _height: tag === 'canvas' ? 150 : 0,
    _text: '',
    _htmlSrc: '',
    _ctx: null
  };
  el.style = makeStyle();
  el.classList = makeClassList(el);

  Object.defineProperty(el, 'parentElement', {
    get: function () {
      return el.parentNode && el.parentNode.nodeType === 1 ? el.parentNode : null;
    }
  });
  Object.defineProperty(el, 'children', {
    get: function () {
      return el.childNodes.filter(function (c) { return c.nodeType === 1; });
    }
  });
  Object.defineProperty(el, 'textContent', {
    get: function () {
      if (el.childNodes.length === 0) return el._text;
      return el.childNodes.map(function (c) {
        return c.nodeType === 3 ? c.textContent : (c.textContent || '');
      }).join('');
    },
    set: function (v) {
      el._text = v == null ? '' : String(v);
      el.childNodes = [];
    }
  });
  Object.defineProperty(el, 'innerText', {
    get: function () { return el.textContent; },
    set: function (v) { el.textContent = v; }
  });
  Object.defineProperty(el, 'width', {
    get: function () { return el._width; },
    set: function (v) { el._width = Number(v) || 0; }
  });
  Object.defineProperty(el, 'height', {
    get: function () { return el._height; },
    set: function (v) { el._height = Number(v) || 0; }
  });

  el.setAttribute = function (name, value) {
    var n = String(name);
    var v = value == null ? '' : String(value);
    el.attrs[n] = v;
    if (n === 'id') el.id = v;
    else if (n === 'class') el.className = v;
    else if (n === 'type') el.type = v;
    else if (n === 'value') el.value = v;
    else if (n === 'width') el._width = Number(v) || 0;
    else if (n === 'height') el._height = Number(v) || 0;
    else if (n === 'hidden') el.hidden = true;
    else if (n === 'disabled') el.disabled = true;
    else if (n === 'selected') el.selected = true;
    else if (n === 'checked') el.checked = true;
  };
  el.getAttribute = function (name) {
    var n = String(name);
    if (n === 'id') return el.id || null;
    if (n === 'class') return el.className || null;
    if (Object.prototype.hasOwnProperty.call(el.attrs, n)) return el.attrs[n];
    return null;
  };
  el.removeAttribute = function (name) {
    delete el.attrs[String(name)];
    if (name === 'id') el.id = '';
    if (name === 'class') el.className = '';
    if (name === 'hidden') el.hidden = false;
  };
  el.hasAttribute = function (name) {
    return el.getAttribute(name) != null;
  };

  el.appendChild = function (child) {
    if (!child) return child;
    if (child.parentNode && child.parentNode.removeChild) {
      try { child.parentNode.removeChild(child); } catch (e) { /* already detached */ }
    }
    child.parentNode = el;
    el.childNodes.push(child);
    return child;
  };
  el.removeChild = function (child) {
    var i = el.childNodes.indexOf(child);
    if (i < 0) throw new Error('NotFoundError');
    el.childNodes.splice(i, 1);
    child.parentNode = null;
    return child;
  };
  el.insertBefore = function (child, ref) {
    if (!ref) return el.appendChild(child);
    if (child.parentNode && child.parentNode.removeChild) {
      try { child.parentNode.removeChild(child); } catch (e) { /* already detached */ }
    }
    var i = el.childNodes.indexOf(ref);
    if (i < 0) return el.appendChild(child);
    child.parentNode = el;
    el.childNodes.splice(i, 0, child);
    return child;
  };

  function parseInto(html) {
    el.childNodes = [];
    var nodes = parseFragment(String(html || ''), el.ownerDocument || owner);
    nodes.forEach(function (n) { el.appendChild(n); });
  }
  Object.defineProperty(el, 'innerHTML', {
    get: function () { return el._htmlSrc; },
    set: function (v) {
      el._htmlSrc = v == null ? '' : String(v);
      el._text = '';
      parseInto(el._htmlSrc);
    }
  });

  el.querySelector = function (sel) {
    var all = el.querySelectorAll(sel);
    return all.length ? all[0] : null;
  };
  el.querySelectorAll = function (sel) {
    var out = [];
    walk(el, function (n) {
      if (matchesSimple(n, sel)) out.push(n);
    });
    return out;
  };

  el.addEventListener = function (type, fn) {
    var t = String(type);
    if (!el.listeners[t]) el.listeners[t] = [];
    el.listeners[t].push(fn);
  };
  el.removeEventListener = function (type, fn) {
    var t = String(type);
    if (!el.listeners[t]) return;
    el.listeners[t] = el.listeners[t].filter(function (f) { return f !== fn; });
  };
  el.getBoundingClientRect = function () {
    var w = el._width || 0;
    var h = el._height || 0;
    if (el.tagName === 'CANVAS') {
      if (!w) w = LAB_W;
      if (!h) h = LAB_H;
    }
    return { x: 0, y: 0, top: 0, left: 0, right: w, bottom: h, width: w, height: h };
  };
  el.getContext = function (kind) {
    if (String(kind).indexOf('2d') !== 0) return null;
    if (!el._ctx) el._ctx = makeRecordingCtx(el._width || LAB_W, el._height || LAB_H);
    return el._ctx;
  };
  el.setPointerCapture = function () { /* no-op */ };
  el.releasePointerCapture = function () { /* no-op */ };
  el.focus = function () { /* no-op */ };
  el.blur = function () { /* no-op */ };
  el.click = function () { /* no-op */ };

  return el;
}

function makeText(str) {
  return {
    nodeType: 3,
    tagName: '',
    textContent: str == null ? '' : String(str),
    parentNode: null,
    childNodes: []
  };
}

function parseFragment(html, owner) {
  var root = { childNodes: [], appendChild: function (c) { this.childNodes.push(c); c.parentNode = this; return c; } };
  var i = 0;
  var stack = [root];
  var s = String(html || '');
  while (i < s.length) {
    if (s.charCodeAt(i) !== 60 /* < */) {
      var j = s.indexOf('<', i);
      if (j < 0) j = s.length;
      var text = s.slice(i, j);
      if (text) stack[stack.length - 1].appendChild(makeText(text));
      i = j;
      continue;
    }
    if (s.slice(i, i + 4) === '<!--') {
      var endc = s.indexOf('-->', i + 4);
      i = endc < 0 ? s.length : endc + 3;
      continue;
    }
    if (s.slice(i, i + 2) === '</') {
      var gt = s.indexOf('>', i + 2);
      if (gt < 0) break;
      if (stack.length > 1) stack.pop();
      i = gt + 1;
      continue;
    }
    var gt2 = s.indexOf('>', i + 1);
    if (gt2 < 0) break;
    var raw = s.slice(i + 1, gt2);
    var selfClose = raw.charAt(raw.length - 1) === '/';
    if (selfClose) raw = raw.slice(0, -1);
    var sp = raw.search(/\s/);
    var tname = (sp < 0 ? raw : raw.slice(0, sp)).toLowerCase();
    var attrSrc = sp < 0 ? '' : raw.slice(sp);
    if (!/^[a-z][a-z0-9-]*$/.test(tname)) {
      stack[stack.length - 1].appendChild(makeText(s.slice(i, gt2 + 1)));
      i = gt2 + 1;
      continue;
    }
    var node = makeEl(tname, owner);
    var attrs = parseAttrs(attrSrc);
    Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    stack[stack.length - 1].appendChild(node);
    var isVoid = VOID_TAGS[tname] || selfClose;
    if (!isVoid) stack.push(node);
    i = gt2 + 1;
  }
  return root.childNodes;
}

function makeDocument() {
  var doc = makeEl('document', null);
  doc.nodeType = 9;
  doc.tagName = '#DOCUMENT';
  doc.ownerDocument = doc;

  var body = makeEl('body', doc);
  var head = makeEl('head', doc);
  doc.body = body;
  doc.head = head;
  doc.appendChild(head);
  doc.appendChild(body);

  doc.createElement = function (tag) {
    return makeEl(tag, doc);
  };
  doc.createTextNode = function (str) {
    return makeText(str);
  };
  doc.getElementById = function (id) {
    var found = null;
    if (body.id === id) return body;
    walk(doc, function (n) {
      if (!found && n.id === id) found = n;
    });
    return found;
  };
  doc.querySelector = function (sel) {
    var all = doc.querySelectorAll(sel);
    return all.length ? all[0] : null;
  };
  doc.querySelectorAll = function (sel) {
    var out = [];
    walk(doc, function (n) {
      if (matchesSimple(n, sel)) out.push(n);
    });
    return out;
  };
  doc.addEventListener = function () { /* no-op on document */ };
  doc.removeEventListener = function () { /* no-op */ };
  return doc;
}

/* -------------------------------------------------------------------------- */
/* Sandbox: classic-script window, no Node module/require.                    */
/* -------------------------------------------------------------------------- */

function loadShipped() {
  var document = makeDocument();
  var rafCbs = [];
  var rafId = 0;

  var sandbox = {
    console: console,
    Math: Math,
    Date: Date,
    JSON: JSON,
    String: String,
    Number: Number,
    Array: Array,
    Object: Object,
    Boolean: Boolean,
    RegExp: RegExp,
    Error: Error,
    TypeError: TypeError,
    RangeError: RangeError,
    Uint8ClampedArray: Uint8ClampedArray,
    Float32Array: Float32Array,
    Int32Array: Int32Array,
    isFinite: isFinite,
    isNaN: isNaN,
    parseInt: parseInt,
    parseFloat: parseFloat,
    Infinity: Infinity,
    NaN: NaN,
    undefined: undefined,
    document: document,
    performance: { now: function () { return Date.now(); } },
    requestAnimationFrame: function (cb) {
      rafId += 1;
      rafCbs.push({ id: rafId, cb: cb });
      return rafId;
    },
    cancelAnimationFrame: function (id) {
      rafCbs = rafCbs.filter(function (x) { return x.id !== id; });
    },
    setTimeout: function () { return 0; },
    clearTimeout: function () { /* no-op — do not run delayed modal teardown */ },
    setInterval: function () { return 0; },
    clearInterval: function () { /* no-op */ },
    devicePixelRatio: 1
  };

  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.PGRE = {};
  sandbox.window.PGRE = sandbox.PGRE;
  sandbox.window.document = document;
  sandbox.window.devicePixelRatio = 1;
  sandbox.window.addEventListener = function (type, fn) {
    if (!sandbox._winListeners) sandbox._winListeners = {};
    var t = String(type);
    if (!sandbox._winListeners[t]) sandbox._winListeners[t] = [];
    sandbox._winListeners[t].push(fn);
  };
  sandbox.window.removeEventListener = function (type, fn) {
    if (!sandbox._winListeners) return;
    var t = String(type);
    if (!sandbox._winListeners[t]) return;
    sandbox._winListeners[t] = sandbox._winListeners[t].filter(function (f) { return f !== fn; });
  };
  sandbox._rafCbs = rafCbs;

  vm.createContext(sandbox);
  vm.runInContext(
    'delete this.module; delete this.require; delete this.exports; delete this.process;',
    sandbox
  );

  var enginePath = path.join(root, 'js', 'visualizer-engine.js');
  var engineSrc = fs.readFileSync(enginePath, 'utf8');
  try {
    vm.runInContext(engineSrc, sandbox, { filename: 'js/visualizer-engine.js' });
  } catch (err) {
    return { sandbox: sandbox, document: document, loadError: 'visualizer-engine.js: ' + err.message, trioErrors: [] };
  }

  var trioErrors = [];
  TRIO_FILES.forEach(function (rel) {
    var src = fs.readFileSync(path.join(root, rel), 'utf8');
    try {
      vm.runInContext(src, sandbox, { filename: rel });
    } catch (err) {
      trioErrors.push(rel + ': ' + err.message);
    }
  });

  return { sandbox: sandbox, document: document, loadError: null, trioErrors: trioErrors };
}

function defaultState(viz) {
  var state = {};
  (viz.parameters || []).forEach(function (p) {
    if (!p || !p.id) return;
    var val;
    if (p.default !== undefined) val = p.default;
    else if (p.value !== undefined) val = p.value;
    else if (p.options && p.options.length) {
      var opt0 = p.options[0];
      val = (typeof opt0 === 'object' && opt0 && opt0.value !== undefined) ? opt0.value : opt0;
    } else if (p.min !== undefined) val = p.min;
    else val = 0;
    state[p.id] = val;
  });
  return state;
}

function elementChildren(el) {
  return (el && el.childNodes || []).filter(function (c) { return c && c.nodeType === 1; });
}

function classHas(el, name) {
  return !!(el && el.classList && el.classList.contains(name));
}

function cssRuleBody(css, selector) {
  var re = new RegExp('(?:^|[}\\s])' + escapeRe(selector) + '\\s*\\{([^}]+)\\}');
  var m = css.match(re);
  return m ? m[1] : '';
}

/* -------------------------------------------------------------------------- */
/* Tests                                                                      */
/* -------------------------------------------------------------------------- */

console.log('formula visualizer aesthetics (shipped engine + trio-g1…g10)\n');

console.log('index.html classic script tags');
var indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert(/<script src="js\/visualizer-engine\.js[^"]*"(?: defer)?><\/script>/.test(indexHtml),
  'index.html loads js/visualizer-engine.js as a classic <script src>');
assert(!/<script[^>]*type\s*=\s*["']module["'][^>]*visualizer-engine/.test(indexHtml) &&
  !/<script[^>]*visualizer-engine[^>]*type\s*=\s*["']module["']/.test(indexHtml),
  'visualizer-engine.js is not type="module"');

var engineIdx = indexHtml.search(/<script src="js\/visualizer-engine\.js/);
var lastTrioIdx = engineIdx;
var triosInOrder = true;
for (var n = 1; n <= 10; n++) {
  var tagRe = new RegExp('<script src="js/visualizers/trio-g' + n + '\\.js[^"]*"(?: defer)?><\\/script>');
  assert(tagRe.test(indexHtml), 'index.html loads trio-g' + n + '.js as classic <script src>');
  assert(!(new RegExp('<script[^>]*type\\s*=\\s*["\']module["\'][^>]*trio-g' + n)).test(indexHtml),
    'trio-g' + n + '.js is not type="module"');
  var idx = indexHtml.search(new RegExp('<script src="js/visualizers/trio-g' + n + '\\.js'));
  if (idx < lastTrioIdx) triosInOrder = false;
  lastTrioIdx = idx;
}
assert(triosInOrder && engineIdx >= 0 && engineIdx < lastTrioIdx,
  'engine loads before trio-g1…g10 (classic script order)');

console.log('\nload shipped engine + trios into window sandbox');
var loaded = loadShipped();
assert(!loaded.loadError, loaded.loadError ? loaded.loadError : 'visualizer-engine.js evaluated without error');
assert(loaded.trioErrors.length === 0,
  loaded.trioErrors.length
    ? ('trio eval errors: ' + loaded.trioErrors.join(' | '))
    : 'all 10 trio files evaluated without error');

var PGRE = loaded.sandbox.PGRE || (loaded.sandbox.window && loaded.sandbox.window.PGRE) || {};
assert(!!PGRE, 'sandbox exports PGRE');
assert(typeof PGRE.openVisualizerModal === 'function', 'PGRE.openVisualizerModal is callable');
assert(typeof PGRE.renderInlineVisualizer === 'function', 'PGRE.renderInlineVisualizer is callable');
assert(typeof PGRE.appendVizLegend === 'function', 'PGRE.appendVizLegend is callable');
assert(!!PGRE.CV && PGRE.CV.colors && isCreamColor(PGRE.CV.colors.bg),
  'PGRE.CV.colors.bg is site cream ' + CREAM);
assert(!!PGRE.DrawUtils, 'PGRE.DrawUtils is present');
assert(!!PGRE.VizH, 'PGRE.VizH is present');
assert(!!PGRE.visualizers && typeof PGRE.visualizers === 'object', 'PGRE.visualizers is an object');

console.log('\n(a) thirty cpgf- registrations');
var visualizers = PGRE.visualizers || {};
var cpgfKeys = Object.keys(visualizers).filter(function (k) { return k.indexOf('cpgf-') === 0; }).sort();
assert(cpgfKeys.length === EXPECTED_IDS.length,
  'exactly ' + EXPECTED_IDS.length + ' cpgf- keys (got ' + cpgfKeys.length + ': ' + cpgfKeys.join(', ') + ')');

var missing = EXPECTED_IDS.filter(function (id) { return cpgfKeys.indexOf(id) < 0; });
var extra = cpgfKeys.filter(function (id) { return EXPECTED_IDS.indexOf(id) < 0; });
assert(missing.length === 0, missing.length ? ('missing cpgf- ids: ' + missing.join(', ')) : 'all expected cpgf- ids present');
assert(extra.length === 0, extra.length ? ('extra cpgf- ids: ' + extra.join(', ')) : 'no extra cpgf- keys');

Object.keys(visualizers).forEach(function (k) {
  if (k === 'cluster3' || k === 'cluster-5') {
    console.log('  ok  — ignoring non-cpgf key ' + k);
  }
});

EXPECTED_IDS.forEach(function (id) {
  var viz = visualizers[id];
  assert(!!viz, id + ' is registered');
  assert(!!viz && typeof viz.draw === 'function', id + ' has a callable draw');
});

console.log('\n(b) stacked chrome — openVisualizerModal + renderInlineVisualizer + CSS');
var cssSrc = fs.readFileSync(path.join(root, 'css', 'visualizer.css'), 'utf8');
var simGridBody = cssRuleBody(cssSrc, '.viz-sim-grid');
assert(!!simGridBody, 'css/visualizer.css declares .viz-sim-grid');
assert(/grid-template-columns\s*:\s*1fr\s*;/.test(simGridBody),
  '.viz-sim-grid uses grid-template-columns: 1fr (not a 310px side column)');
assert(!/310px/.test(simGridBody), '.viz-sim-grid rule body does not mention 310px');

var probeId = EXPECTED_IDS.filter(function (id) { return visualizers[id] && typeof visualizers[id].draw === 'function'; })[0];
assert(!!probeId, 'have a registered viz to drive chrome builders (' + (probeId || 'none') + ')');

function assertStackedGrid(rootEl, label, opts) {
  opts = opts || {};
  var grid = rootEl.querySelector('.viz-sim-grid');
  assert(!!grid, label + ' emits .viz-sim-grid');
  if (!grid) return;
  var kids = elementChildren(grid);
  var expectControls = opts.controlsInGrid !== false;
  if (expectControls) {
    assert(kids.length >= 3, label + ' .viz-sim-grid has ≥3 children (got ' + kids.length + ')');
  } else {
    assert(kids.length === 2, label + ' .viz-sim-grid has canvas + legend only (got ' + kids.length + ')');
  }
  assert(classHas(kids[0], 'viz-canvas-wrapper') || (kids[0] && kids[0].querySelector && kids[0].querySelector('canvas')),
    label + ' first grid child is the canvas wrapper');
  assert(classHas(kids[1], 'viz-legend-strip'),
    label + ' second grid child is .viz-legend-strip');
  if (expectControls) {
    assert(classHas(kids[2], 'viz-controls-panel'),
      label + ' third grid child is .viz-controls-panel');
  } else {
    assert(!grid.querySelector('.viz-controls-panel'),
      label + ' does not keep .viz-controls-panel in the sim grid');
  }
  var canvas = grid.querySelector('canvas');
  assert(!!canvas, label + ' grid contains a canvas');
}

function fireClick(el) {
  var list = el && el.listeners && el.listeners.click;
  if (!list) return;
  var evt = { type: 'click', target: el, preventDefault: function () {}, stopPropagation: function () {} };
  for (var i = 0; i < list.length; i++) list[i](evt);
}

if (probeId) {
  try {
    PGRE.openVisualizerModal(probeId);
    var backdrop = loaded.document.getElementById('viz-modal-backdrop');
    assert(!!backdrop, 'openVisualizerModal mounts #viz-modal-backdrop');
    if (backdrop) assertStackedGrid(backdrop, 'modal', { controlsInGrid: false });
    var modalCanvas = loaded.document.getElementById('viz-canvas');
    assert(!!modalCanvas, 'modal canvas is #viz-canvas');
    if (modalCanvas) {
      assert(Number(modalCanvas.width) === LAB_W && Number(modalCanvas.height) === LAB_H,
        'modal canvas default size is ' + LAB_W + '×' + LAB_H +
        ' (got ' + modalCanvas.width + '×' + modalCanvas.height + ')');
    }
    var modalCanvasCss = cssRuleBody(cssSrc, '.viz-modal-body .viz-canvas-wrapper');
    assert(/clamp\(\s*300px\s*,\s*44vh\s*,\s*420px\s*\)/.test(modalCanvasCss),
      'modal canvas wrapper keeps height: clamp(300px, 44vh, 420px)');
    var overlayCss = cssRuleBody(cssSrc, '.viz-params-overlay');
    assert(!!overlayCss, 'css/visualizer.css declares .viz-params-overlay');
    assert(/position\s*:\s*absolute/.test(overlayCss), '.viz-params-overlay is position:absolute');
    assert(/21rem/.test(overlayCss), '.viz-params-overlay width is 21rem');
    assert(/60vh/.test(overlayCss), '.viz-params-overlay max-height is 60vh');
    assert(!/310px/.test(overlayCss), '.viz-params-overlay does not use a 310px column');
    var formulaBannerCss = cssRuleBody(cssSrc, '.viz-formula-banner');
    assert(!!formulaBannerCss, 'css/visualizer.css declares .viz-formula-banner');
    assert(!/flex-shrink/.test(formulaBannerCss),
      'shared .viz-formula-banner does not set flex-shrink');
    assert(!/overflow-y/.test(formulaBannerCss),
      'shared .viz-formula-banner does not set overflow-y');
    var modalBannerCss = cssRuleBody(cssSrc, '.viz-modal-body .viz-formula-banner');
    assert(/flex-shrink\s*:\s*0/.test(modalBannerCss),
      'modal .viz-formula-banner keeps flex-shrink: 0');

    var actions = backdrop && backdrop.querySelector('.viz-header-actions');
    assert(!!actions, 'draw modal header has .viz-header-actions');
    var actionKids = elementChildren(actions);
    assert(actionKids[0] && actionKids[0].id === 'viz-params-btn',
      'Parameters button is immediately left of close');
    assert(actionKids[1] && actionKids[1].id === 'viz-close-btn',
      'close button remains last in the header actions');
    assert(actionKids[0] && /^\s*Parameters\s*$/.test(actionKids[0].textContent),
      'Parameters button is text-only');

    var overlay = loaded.document.getElementById('viz-controls-panel');
    assert(!!overlay && classHas(overlay, 'viz-params-overlay'),
      'draw modal mounts #viz-controls-panel as the compact overlay');
    assert(overlay.hidden && !classHas(overlay, 'viz-params-open'),
      'parameters overlay is collapsed by default');
    var handle = loaded.document.getElementById('viz-params-handle');
    assert(!!handle && classHas(handle, 'viz-controls-heading'),
      'overlay heading is the drag handle');
    assert(handle && handle.textContent.indexOf('Parameters & Controls') >= 0,
      'overlay heading is Parameters & Controls');
    var closeParams = loaded.document.getElementById('viz-params-close-btn');
    assert(!!closeParams && /^\s*Close\s*$/.test(closeParams.textContent),
      'overlay has a Close text button');
    assert(!!loaded.document.getElementById('viz-params-container'),
      'buildControls still targets #viz-params-container');

    var formulaBanner = backdrop && backdrop.querySelector('.viz-formula-banner');
    assert(!!formulaBanner, 'draw modal emits .viz-formula-banner above the canvas');
    assert(formulaBanner && String(formulaBanner.textContent || '').trim().length > 0,
      'formula banner contains formula text');

    var paramsBtn = loaded.document.getElementById('viz-params-btn');
    fireClick(paramsBtn);
    assert(overlay && classHas(overlay, 'viz-params-open') && !overlay.hidden,
      'Parameters button opens the overlay');
    fireClick(closeParams);
    assert(overlay && !classHas(overlay, 'viz-params-open') && overlay.hidden,
      'Close on the card dismisses the overlay');
    fireClick(paramsBtn);
    assert(overlay && classHas(overlay, 'viz-params-open'),
      'Parameters button reopens the overlay');
    fireClick(paramsBtn);
    assert(overlay && !classHas(overlay, 'viz-params-open'),
      'Parameters button toggles the overlay closed');
  } catch (err) {
    assert(false, 'openVisualizerModal threw: ' + err.message);
  }

  try {
    var host = loaded.document.createElement('div');
    host.id = 'viz-inline-host';
    loaded.document.body.appendChild(host);
    PGRE.renderInlineVisualizer(probeId, host);
    var wrap = loaded.document.getElementById('viz-inline-container') || host.querySelector('.viz-inline-container');
    assert(!!wrap, 'renderInlineVisualizer mounts .viz-inline-container');
    if (wrap) assertStackedGrid(wrap, 'inline');
    var inlineCanvas = loaded.document.getElementById('viz-inline-canvas');
    assert(!!inlineCanvas, 'inline canvas is #viz-inline-canvas');
    if (inlineCanvas) {
      assert(Number(inlineCanvas.width) === LAB_W && Number(inlineCanvas.height) === 380,
        'inline canvas default size is ' + LAB_W + '×380 (got ' +
        inlineCanvas.width + '×' + inlineCanvas.height + ')');
    }
  } catch (err) {
    assert(false, 'renderInlineVisualizer threw: ' + err.message);
  }
}

console.log('\n(b2) comprehensive detail modal for non-visualizer cards');
PGRE.TOPICS = [
  { id: 'cm', short: 'CM', name: 'Classical Mechanics' },
  { id: 'em', short: 'EM', name: 'Electricity & Magnetism' }
];
PGRE.topicById = function (id) {
  return PGRE.TOPICS.find(function (t) { return t.id === id; }) || null;
};
PGRE.FORMULAS = [
  {
    id: 'cpg-f-test-nonviz',
    topic: 'cm',
    name: 'Kepler Test Law',
    front: 'Relate period to orbital radius.',
    back: '$T^2 = k r^3$',
    note: 'Valid for central force power-law potentials.',
    eq: '1.99'
  },
  {
    id: 'cpg-f-test-mnem',
    topic: 'em',
    name: 'Gauss Law Test',
    front: 'Relate flux to charge.',
    back: '$\\Phi_E = Q/\\epsilon_0$',
    mnemonic: 'Flux equals charge enclosed'
  }
];

try {
  PGRE.openVisualizerModal('cpg-f-test-nonviz');
  var nonvizBackdrop = loaded.document.getElementById('viz-modal-backdrop');
  assert(!!nonvizBackdrop, 'openVisualizerModal mounts #viz-modal-backdrop for non-visualizer card');
  assert(!!nonvizBackdrop.querySelector('.viz-detail-window'),
    'non-visualizer modal has .viz-detail-window');
  assert(!nonvizBackdrop.querySelector('#viz-params-btn'),
    'detail modal has no Parameters button');
  assert(nonvizBackdrop.innerHTML.indexOf('Kepler Test Law') >= 0, 'detail modal includes card title');
  assert(nonvizBackdrop.innerHTML.indexOf('Classical Mechanics') >= 0, 'detail modal includes topic badge');
  assert(nonvizBackdrop.innerHTML.indexOf('Eq 1.99') >= 0, 'detail modal includes equation tag');
  assert(nonvizBackdrop.innerHTML.indexOf('viz-formula-banner') >= 0, 'detail modal includes formula banner');
  assert(nonvizBackdrop.innerHTML.indexOf('Relate period to orbital radius') >= 0, 'detail modal includes prompt section');
  assert(nonvizBackdrop.innerHTML.indexOf('Valid for central force') >= 0, 'detail modal includes notes section');
  assert(nonvizBackdrop.innerHTML.indexOf('Interactive simulation in development for this formula') >= 0, 'detail modal includes status notice');
  assert(!!loaded.document.getElementById('viz-close-btn'), 'detail modal has #viz-close-btn');

  PGRE.openVisualizerModal('cpg-f-test-mnem');
  var mnemBackdrop = loaded.document.getElementById('viz-modal-backdrop');
  assert(mnemBackdrop.innerHTML.indexOf('viz-detail-mnemonic') >= 0, 'detail modal shows mnemonic section when present');
  assert(mnemBackdrop.innerHTML.indexOf('Flux equals charge enclosed') >= 0, 'detail modal includes mnemonic text');

  PGRE.closeVisualizerModal();
  assert(!mnemBackdrop.classList.contains('viz-open'), 'closeVisualizerModal removes viz-open class');
} catch (err) {
  assert(false, 'non-visualizer detail modal threw: ' + err.message);
}

console.log('\nHUD helpers route to appendVizLegend (no overlay fillRect)');
(function testHudHelpers() {
  var orig = PGRE.appendVizLegend;
  var calls = [];
  PGRE.appendVizLegend = function (title, rows) {
    calls.push({ title: title, rows: rows });
    if (typeof orig === 'function') return orig.apply(this, arguments);
  };

  function runHelper(name, fn) {
    var before = calls.length;
    var ctx = makeRecordingCtx(LAB_W, LAB_H);
    var threw = null;
    try {
      fn(ctx);
    } catch (err) {
      threw = err;
    }
    assert(!threw, name + ' did not throw' + (threw ? (' (' + threw.message + ')') : ''));
    assert(calls.length > before, name + ' writes through PGRE.appendVizLegend');
    var fills = ctx._ops.filter(function (op) { return op.op === 'fillRect' || op.op === 'fill'; });
    assert(fills.length === 0, name + ' does not paint overlay HUD boxes (no fillRect/fill)');
  }

  if (PGRE.CV && typeof PGRE.CV.drawHUD === 'function') {
    runHelper('CV.drawHUD', function (ctx) {
      PGRE.CV.drawHUD(ctx, 10, 10, 200, [{ label: 'L', value: '1' }], 'HUD');
    });
  } else {
    assert(false, 'CV.drawHUD is callable');
  }

  if (PGRE.DrawUtils && typeof PGRE.DrawUtils.drawHud === 'function') {
    runHelper('DrawUtils.drawHud', function (ctx) {
      PGRE.DrawUtils.drawHud(ctx, 10, 10, 200, 80, 'HUD', [{ label: 'L', val: '1' }]);
    });
  } else if (PGRE.DrawUtils && typeof PGRE.DrawUtils.drawHUD === 'function') {
    runHelper('DrawUtils.drawHUD', function (ctx) {
      PGRE.DrawUtils.drawHUD(ctx, 10, 10, 200, [{ label: 'L', value: '1' }], 'HUD');
    });
  } else {
    assert(false, 'DrawUtils.drawHud / DrawUtils.drawHUD is callable');
  }

  if (PGRE.VizH && typeof PGRE.VizH.drawHud === 'function') {
    runHelper('VizH.drawHud', function (ctx) {
      PGRE.VizH.drawHud(ctx, 10, 10, 200, 80, 'HUD', [{ label: 'L', val: '1' }]);
    });
  } else if (PGRE.VizH && typeof PGRE.VizH.drawHUD === 'function') {
    runHelper('VizH.drawHUD', function (ctx) {
      PGRE.VizH.drawHUD(ctx, 10, 10, 200, [{ label: 'L', value: '1' }], 'HUD');
    });
  }
  // VizH.drawHud is optional on the exported helper bag; CV/DrawUtils are the shipped HUD path.

  PGRE.appendVizLegend = orig;
})();

console.log('\n(c) each draw() at Lab size ' + LAB_W + '×' + LAB_H + ' — cream first fill, no throw');
EXPECTED_IDS.forEach(function (id) {
  var viz = visualizers[id];
  if (!viz || typeof viz.draw !== 'function') {
    assert(false, id + ' skipped (missing draw)');
    return;
  }
  var state = defaultState(viz);
  var dummy = loaded.document.createElement('div');
  var threwInit = null;
  if (typeof viz.init === 'function') {
    try {
      viz.init(dummy, state, function () { /* redraw no-op */ });
    } catch (err) {
      threwInit = err;
    }
  }
  assert(!threwInit, id + ' init did not throw' + (threwInit ? (' (' + threwInit.message + ')') : ''));

  var ctx = makeRecordingCtx(LAB_W, LAB_H);
  var threwDraw = null;
  try {
    viz.draw(ctx, LAB_W, LAB_H, state, 0.016);
  } catch (err) {
    threwDraw = err;
  }
  assert(!threwDraw, id + ' draw did not throw' + (threwDraw ? (' (' + threwDraw.message + ')') : ''));
  if (threwDraw) return;

  var firstFull = null;
  for (var i = 0; i < ctx._ops.length; i++) {
    if (coversFullCanvas(ctx._ops[i], LAB_W, LAB_H)) {
      firstFull = ctx._ops[i];
      break;
    }
  }
  if (!firstFull) {
    assert(false, id + ' first full-canvas fillRect is site cream ' + CREAM +
      ' (no fillRect covering 0,0,' + LAB_W + ',' + LAB_H + ')');
    return;
  }
  var cream = isCreamColor(firstFull.fillStyle);
  var bg = PGRE.CV && PGRE.CV.colors && PGRE.CV.colors.bg;
  if (!cream && bg && firstFull.fillStyle === bg) cream = isCreamColor(bg);
  assert(cream, id + ' first full-canvas fill is cream ' + CREAM +
    ' / CV.colors.bg (got ' + JSON.stringify(firstFull.fillStyle) + ')');
});

console.log('\n(d) LaTeX formatting and typesetting integrity');
EXPECTED_IDS.forEach(function (id) {
  var viz = visualizers[id];
  if (!viz) return;
  assert(typeof viz.formulaLatex === 'string' && viz.formulaLatex.trim().length > 0,
    id + ' formulaLatex is non-empty string');
  assert(typeof viz.title === 'string' && viz.title.trim().length > 0,
    id + ' title is non-empty string');
  // Titles should not use raw unicode math approximations
  var hasUnicodeMath = /[∂∫∇ΣΔ\u0307]/.test(viz.title);
  assert(!hasUnicodeMath, id + ' title uses LaTeX math formatting instead of plain unicode approximations');
  if (viz.parameters) {
    viz.parameters.forEach(function (p) {
      if (p.options) {
        p.options.forEach(function (opt) {
          var lbl = typeof opt === 'object' ? opt.label : opt;
          var hasBadMath = /[²³½¼¾¹⁰½±×=∂∫∇ΣΔ\u0307]/.test(lbl) && !/\$.*?\$/.test(lbl);
          assert(!hasBadMath, id + ' param option ' + JSON.stringify(lbl) + ' uses LaTeX format when expressing formulas');
        });
      }
    });
  }
});

// Test limiting cases and derivation steps LaTeX parse integrity with vendored KaTeX
var katex = require(path.join(root, 'vendor', 'katex', 'katex.min.js'));

function decodeEntities(s) {
  return s.replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
}

function assertMathParses(html, label) {
  var delims = [['$$', '$$', true], ['$', '$', false]];
  var text = decodeEntities(html);
  var i = 0;
  while (i < text.length) {
    var best = -1, bestIdx = -1;
    for (var d = 0; d < delims.length; d++) {
      var idx = text.indexOf(delims[d][0], i);
      if (idx === -1) continue;
      if (bestIdx === -1 || idx < bestIdx || (idx === bestIdx && delims[d][0].length > delims[best][0].length)) {
        best = d; bestIdx = idx;
      }
    }
    if (best === -1) break;
    var l = delims[best][0], r = delims[best][1], display = delims[best][2];
    var end = text.indexOf(r, bestIdx + l.length);
    if (end === -1) { i = bestIdx + l.length; continue; }
    var tex = text.slice(bestIdx + l.length, end);
    try {
      katex.renderToString(tex, { displayMode: display, throwOnError: true });
      assert(true, label + ' math segment parses cleanly: ' + tex.slice(0, 40));
    } catch (err) {
      assert(false, label + ' math parse error (' + err.message + ') on: ' + tex);
    }
    i = end + r.length;
  }
}

EXPECTED_IDS.forEach(function (id) {
  var viz = visualizers[id];
  if (!viz) return;
  if (viz.limitingCases) {
    var limHtml = PGRE.formatLimitingCases(viz.limitingCases);
    assertMathParses(limHtml, id + ' limitingCases');
  }
  if (viz.derivationSteps) {
    var derivHtml = PGRE.formatDerivations(viz.derivationSteps);
    assertMathParses(derivHtml, id + ' derivationSteps');
  }
});

// Test card teaser truncator logic ensures balanced math delimiters
var tokenRegex = /(\$\$[\s\S]*?\$\$|\$[^$]*?\$|\*\*[^*]+?\*\*|[^\s$*]+|\s+)/g;
EXPECTED_IDS.forEach(function (id) {
  var viz = visualizers[id];
  if (!viz || !viz.physicalStory) return;
  var clean = String(viz.physicalStory).trim().replace(/\s+/g, ' ');
  var match, result = '', limit = 135;
  tokenRegex.lastIndex = 0;
  while ((match = tokenRegex.exec(clean)) !== null) {
    var token = match[0];
    if (result.length + token.length > limit && result.length >= 60) break;
    result += token;
  }
  var dollarCount = (result.match(/\$/g) || []).length;
  assert(dollarCount % 2 === 0, id + ' card teaser has balanced math delimiters ($...$) (count: ' + dollarCount + ')');
});

console.log('\n────────────────────────────────');
console.log('passed: ' + passed + '  failed: ' + failed);
if (failed) process.exit(1);
console.log('ALL GREEN');
process.exit(0);
