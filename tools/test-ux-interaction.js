#!/usr/bin/env node
/* Gating tests for interaction + motion: load SHIPPED js/motion.js and the
   interaction modules actually changed (view-formulas, flashmodes, view-exam,
   view-practice, app.js). No reimplementation of handlers. Run from repo root:
     node tools/test-ux-interaction.js
*/
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var root = path.resolve(__dirname, '..');

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

function wait(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

/* -------------------------------------------------------------------------- */
/* Minimal document stub — innerHTML builds a queryable tree.                 */
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
  function write(list) { el.className = list.join(' '); }
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
    contains: function (name) { return tokens().indexOf(String(name)) >= 0; },
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
    set: function (t, p, v) { t[p] = v; return true; }
  });
}

function walk(el, fn) {
  var kids = el.childNodes || [];
  for (var i = 0; i < kids.length; i++) {
    var c = kids[i];
    if (c.nodeType === 1) { fn(c); walk(c, fn); }
  }
}

function matchCompound(el, sel) {
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
      if (av === undefined) { if (has == null) return false; }
      else if (String(has) !== String(av)) return false;
    }
  }
  return saw || rest === '';
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
  var frag = {
    childNodes: [],
    appendChild: function (c) { this.childNodes.push(c); c.parentNode = this; return c; }
  };
  var i = 0;
  var stack = [frag];
  var s = String(html || '');
  while (i < s.length) {
    if (s.charCodeAt(i) !== 60) {
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
  return frag.childNodes;
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
    value: '',
    checked: false,
    selected: false,
    tabIndex: 0,
    type: tag === 'input' ? 'text' : '',
    _text: '',
    _htmlSrc: '',
    scrollWidth: 0,
    clientWidth: 0,
    isContentEditable: false
  };
  el.style = makeStyle();
  el.classList = makeClassList(el);
  el.dataset = {};
  Object.defineProperty(el, 'children', {
    get: function () { return el.childNodes.filter(function (c) { return c.nodeType === 1; }); }
  });
  Object.defineProperty(el, 'firstChild', {
    get: function () { return el.childNodes[0] || null; }
  });
  Object.defineProperty(el, 'isConnected', {
    get: function () {
      var n = el;
      while (n) {
        if (n.nodeType === 9) return true;
        n = n.parentNode;
      }
      return false;
    }
  });
  Object.defineProperty(el, 'offsetWidth', { get: function () { return 1; } });
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
  el.setAttribute = function (name, value) {
    var n = String(name);
    var v = value == null ? '' : String(value);
    el.attrs[n] = v;
    if (n === 'id') el.id = v;
    else if (n === 'class') el.className = v;
    else if (n === 'type') el.type = v;
    else if (n === 'value') el.value = v;
    else if (n === 'hidden') el.hidden = true;
    else if (n === 'disabled') el.disabled = true;
    else if (n === 'checked') el.checked = true;
    else if (n === 'tabindex') el.tabIndex = parseInt(v, 10) || 0;
    else if (n.slice(0, 5) === 'data-') {
      var dk = n.slice(5).replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); });
      el.dataset[dk] = v;
    }
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
    if (name === 'disabled') el.disabled = false;
  };
  el.hasAttribute = function (name) { return el.getAttribute(name) != null; };
  el.contains = function (node) {
    if (node === el) return true;
    var n = node;
    while (n) {
      if (n === el) return true;
      n = n.parentNode;
    }
    return false;
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
  el.remove = function () {
    if (el.parentNode && el.parentNode.removeChild) el.parentNode.removeChild(el);
  };
  Object.defineProperty(el, 'innerHTML', {
    get: function () { return el._htmlSrc; },
    set: function (v) {
      el._htmlSrc = v == null ? '' : String(v);
      el._text = '';
      el.childNodes = [];
      var nodes = parseFragment(el._htmlSrc, el.ownerDocument || owner);
      nodes.forEach(function (n) { el.appendChild(n); });
    }
  });
  el.querySelector = function (sel) {
    var all = el.querySelectorAll(sel);
    return all.length ? all[0] : null;
  };
  el.querySelectorAll = function (sel) {
    sel = String(sel || '').trim();
    if (sel === ':scope > *') return el.children.slice();
    var parts = sel.split(/\s+/).filter(Boolean);
    var out = [];
    walk(el, function (n) {
      if (parts.length === 1) {
        if (matchCompound(n, parts[0])) out.push(n);
        return;
      }
      if (!matchCompound(n, parts[parts.length - 1])) return;
      var ancestor = n.parentNode;
      var need = parts.slice(0, -1);
      var ki = need.length - 1;
      while (ancestor && ki >= 0) {
        if (ancestor.nodeType === 1 && matchCompound(ancestor, need[ki])) ki--;
        ancestor = ancestor.parentNode;
      }
      if (ki < 0) out.push(n);
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
  el.click = function () {
    var ev = {
      type: 'click',
      target: el,
      currentTarget: el,
      preventDefault: function () { ev.defaultPrevented = true; },
      stopPropagation: function () { ev._stopped = true; }
    };
    var n = el;
    while (n) {
      ev.currentTarget = n;
      var list = ((n.listeners && n.listeners.click) || []).slice();
      list.forEach(function (fn) { fn(ev); });
      if (ev._stopped) break;
      n = n.parentNode;
    }
  };
  el.focus = function () {
    if (el.ownerDocument) el.ownerDocument.activeElement = el;
  };
  el.blur = function () {
    if (el.ownerDocument && el.ownerDocument.activeElement === el) {
      el.ownerDocument.activeElement = el.ownerDocument.body;
    }
  };
  el.closest = function (sel) {
    var n = el;
    while (n && n.nodeType === 1) {
      if (matchCompound(n, sel)) return n;
      n = n.parentNode;
    }
    return null;
  };
  el.insertAdjacentHTML = function (pos, html) {
    var nodes = parseFragment(html, el.ownerDocument || owner);
    if (pos === 'beforeend') {
      nodes.forEach(function (n) { el.appendChild(n); });
    } else if (pos === 'afterbegin') {
      for (var i = nodes.length - 1; i >= 0; i--) el.insertBefore(nodes[i], el.firstChild);
    }
  };
  return el;
}

function makeDocument() {
  var doc = makeEl('document', null);
  doc.nodeType = 9;
  doc.tagName = '#DOCUMENT';
  doc.ownerDocument = doc;
  doc.hidden = false;
  doc.readyState = 'loading';
  doc.activeElement = null;

  var html = makeEl('html', doc);
  var head = makeEl('head', doc);
  var body = makeEl('body', doc);
  html.dataset = {};
  doc.documentElement = html;
  doc.head = head;
  doc.body = body;
  doc.appendChild(html);
  html.appendChild(head);
  html.appendChild(body);
  doc.activeElement = body;

  doc.createElement = function (tag) { return makeEl(tag, doc); };
  doc.createTextNode = function (str) { return makeText(str); };
  doc.getElementById = function (id) {
    if (html.id === id) return html;
    if (body.id === id) return body;
    var found = null;
    walk(doc, function (n) { if (!found && n.id === id) found = n; });
    return found;
  };
  doc.querySelector = function (sel) {
    var all = doc.querySelectorAll(sel);
    return all.length ? all[0] : null;
  };
  doc.querySelectorAll = function (sel) { return html.querySelectorAll(sel); };
  return doc;
}

function formulaCards(n) {
  var out = [];
  for (var i = 0; i < n; i++) {
    out.push({
      id: 'f' + i,
      topic: 'cm',
      name: 'Card ' + i,
      front: 'Prompt ' + i,
      back: '$$F = ' + (i + 2) + 'ma$$',
      note: '',
      aliases: []
    });
  }
  return out;
}

function practiceQuestions() {
  return [
    { id: 'pq1', topic: 'cm', q: 'First Q?', choices: ['w', 'x', 'y', 'z'], answer: 1, sol: 'S1', difficulty: 2 },
    { id: 'pq2', topic: 'cm', q: 'Second Q?', choices: ['w', 'x', 'y', 'z'], answer: 1, sol: 'S2', difficulty: 1 }
  ];
}

function loadShipped(reduced, opts) {
  opts = opts || {};
  var document = makeDocument();
  var rafQueue = [];
  var rafId = 1;
  var timeouts = [];
  var intervals = [];
  var timerId = 1;
  var mediaListeners = [];
  var reducedFlag = !!reduced;
  var cards = formulaCards(12);
  var cardStates = {};
  var examObj = {
    id: 'ex-ux',
    title: 'UX exam',
    format: 'full',
    order: ['eq1'],
    cursor: 0,
    answers: {},
    flags: [],
    paused: false,
    durationSec: 0,
    limitSec: 170 * 60
  };
  var examQ = {
    id: 'eq1',
    topic: 'cm',
    q: 'Exam Q?',
    choices: ['A1', 'A2', 'A3', 'A4', 'A5'],
    answer: 2,
    sol: 'Because',
    difficulty: 2
  };
  var pqs = practiceQuestions();

  function setTimeoutFake(fn, ms) {
    var id = timerId++;
    timeouts.push({ id: id, fn: fn, ms: ms == null ? 0 : ms });
    return id;
  }
  function clearTimeoutFake(id) {
    timeouts = timeouts.filter(function (t) { return t.id !== id; });
  }
  function setIntervalFake(fn, ms) {
    var id = timerId++;
    intervals.push({ id: id, fn: fn, ms: ms == null ? 0 : ms });
    return id;
  }
  function clearIntervalFake(id) {
    intervals = intervals.filter(function (t) { return t.id !== id; });
  }

  var locationObj = { hash: '#/', href: 'http://127.0.0.1/', pathname: '/', search: '' };

  var windowObj = {
    matchMedia: function (q) {
      var mq = {
        media: String(q || ''),
        get matches() {
          return /prefers-reduced-motion:\s*reduce/.test(String(q)) ? reducedFlag : false;
        },
        addEventListener: function (type, fn) { mediaListeners.push(fn); },
        addListener: function (fn) { mediaListeners.push(fn); },
        removeEventListener: function () {},
        removeListener: function () {}
      };
      return mq;
    },
    PGRE: null,
    scrollTo: function () {},
    print: function () {},
    listeners: {},
    addEventListener: function (type, fn) {
      var t = String(type);
      if (!windowObj.listeners[t]) windowObj.listeners[t] = [];
      windowObj.listeners[t].push(fn);
    },
    removeEventListener: function (type, fn) {
      var t = String(type);
      if (!windowObj.listeners[t]) return;
      windowObj.listeners[t] = windowObj.listeners[t].filter(function (f) { return f !== fn; });
    },
    requestAnimationFrame: function (cb) {
      var id = rafId++;
      rafQueue.push({ id: id, cb: cb });
      return id;
    },
    cancelAnimationFrame: function (id) {
      rafQueue = rafQueue.filter(function (x) { return x.id !== id; });
    },
    location: locationObj,
    history: { back: function () {}, forward: function () {}, pushState: function () {} },
    localStorage: { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} },
    sessionStorage: { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} },
    confirm: function () { return false; },
    innerWidth: 1280,
    innerHeight: 800
  };

  var pgre = {
    store: {
      state: {
        settings: {
          theme: 'light', keyboard: true, sidebarFolded: false,
          formulaDailyTarget: 20, examDate: '', formulaExamCap: true,
          formulaReverse: false, paceTrainer: false
        },
        cards: cardStates,
        cardReviews: [],
        cardNotes: {},
        questions: {},
        flags: {},
        formulaStudy: null,
        formulaCheckIn: { current: 0, best: 0, lastDay: null }
      },
      save: function () {},
      load: function () {},
      rollDay: function () {},
      touchDay: function () {},
      log: function () {},
      resetFormulaCards: function () { cardStates = {}; this.state.cards = cardStates; }
    },
    srs: {
      today: function () { return '2026-09-07'; },
      newInDeck: function (deck) {
        return (deck || []).filter(function (c) { return !cardStates[c.id]; });
      },
      studiedToday: function () { return false; },
      formulaDay: function () {
        return { reviewIds: [], newIds: cards.map(function (c) { return c.id; }), softIds: [] };
      },
      clampTarget: function (t) { return t || 20; },
      formulaDayRemaining: function (deck) { return (deck || cards).slice(); },
      formulaDayPostponed: function () { return 0; },
      finalPassActive: function () { return false; },
      isLeech: function () { return false; },
      isSuspended: function () { return false; },
      cardState: function (id) { return cardStates[id] || null; },
      everStudied: function (id) { return !!cardStates[id]; },
      countEverStudied: function (deck) {
        var n = 0;
        (deck || []).forEach(function (c) { if (c && cardStates[c.id]) n++; });
        return n;
      },
      gradeCard: function (id, g) {
        cardStates[id] = cardStates[id] || { interval: 1, reps: 1, due: '2026-09-08', lastGrade: g, lapses: 0 };
        cardStates[id].lastGrade = g;
        pgre.store.state.cardReviews.push({ id: id, d: '2026-09-07', g: g });
      },
      nextIntervals: function () { return { again: 0, hard: 1, good: 3, easy: 7 }; },
      ivlLabel: function (n) { return n + 'd'; },
      daysUntil: function () { return 1; },
      dueMistakes: function () { return []; },
      setLastAssess: function () {},
      markLucky: function () {},
      unmarkLucky: function () {},
      clearLucky: function () {},
      setFormulaDayPicks: function () {},
      addFormulaDaySoft: function () {},
      removeFormulaDaySoft: function () {}
    },
    visualizers: {},
    openVisualizerModal: function () {},
    views: {},
    formulaDeck: function () { return Promise.resolve(cards); },
    TOPICS: [{ id: 'cm', short: 'CM', name: 'Classical Mechanics', weight: 20 }],
    studyTime: { start: function () {} },
    contentDB: { open: function () {} },
    nav: { route: function () {}, setTrail: function () {} },
    gamify: {
      addXP: function () {},
      checkAchievements: function () {},
      beginSession: function () { return 'sid-1'; },
      recordAnswer: function () { return 10; },
      endSession: function () {},
      recordSession: function () {}
    },
    refreshNavBadges: function () {},
    typesetMath: function () {},
    formulaCheckIn: {
      stripHTML: function () { return ''; },
      celebrateHTML: function () { return ''; },
      alreadyHTML: function () { return ''; },
      record: function () { return { claimed: false }; }
    },
    notes: {
      isBookmarked: function () { return false; },
      get: function () { return ''; },
      set: function () {},
      toggleBookmark: function () { return false; }
    },
    topicById: function (id) {
      return id === 'cm' ? pgre.TOPICS[0] : { id: id || 'xx', short: '?', name: 'Unknown' };
    },
    questionById: function (id) {
      if (id === 'eq1') return examQ;
      for (var i = 0; i < pqs.length; i++) if (pqs[i].id === id) return pqs[i];
      return null;
    },
    questionsForTopic: function () { return pqs.slice(); },
    examEngine: {
      FORMAT_META: { full: { label: 'Full length' } },
      active: function () { return examObj; },
      create: function () { return examObj; },
      history: function () { return []; },
      submit: function () {},
      persistAnswer: function (exam, idx) {
        var qid = exam.order[exam.index || 0];
        if (exam.answers[qid] === idx) delete exam.answers[qid];
        else exam.answers[qid] = idx;
        return true;
      }
    },
    timer: { boot: function () {} }
  };
  windowObj.PGRE = pgre;

  var sandbox = {
    window: windowObj,
    document: document,
    console: console,
    Date: Date,
    Math: Math,
    JSON: JSON,
    String: String,
    Number: Number,
    Array: Array,
    Object: Object,
    Boolean: Boolean,
    RegExp: RegExp,
    Error: Error,
    Promise: Promise,
    isFinite: isFinite,
    parseInt: parseInt,
    parseFloat: parseFloat,
    setTimeout: setTimeoutFake,
    clearTimeout: clearTimeoutFake,
    setInterval: setIntervalFake,
    clearInterval: clearIntervalFake,
    requestAnimationFrame: windowObj.requestAnimationFrame,
    cancelAnimationFrame: windowObj.cancelAnimationFrame,
    PGRE: pgre,
    location: locationObj,
    navigator: { userAgent: 'node-test' },
    history: windowObj.history
  };
  windowObj.window = windowObj;
  windowObj.document = document;
  document.defaultView = windowObj;
  vm.createContext(sandbox);
  delete sandbox.module;
  delete sandbox.require;
  delete sandbox.exports;
  delete sandbox.process;

  function runFile(rel) {
    var src = fs.readFileSync(path.join(root, rel), 'utf8');
    vm.runInContext(src, sandbox, { filename: rel });
    sandbox.PGRE = sandbox.window.PGRE;
  }
  runFile('js/motion.js');
  runFile('js/app.js');
  if (opts.views) {
    runFile('js/flashmodes.js');
    runFile('js/view-formulas.js');
    runFile('js/view-exam.js');
    runFile('js/view-practice.js');
  }
  sandbox.PGRE = sandbox.window.PGRE;
  return {
    sandbox: sandbox,
    document: document,
    window: windowObj,
    location: locationObj,
    cards: cards,
    exam: examObj,
    cardStates: cardStates,
    rafQueue: function () { return rafQueue; },
    timeouts: function () { return timeouts; },
    setReduced: function (v) {
      reducedFlag = !!v;
      mediaListeners.forEach(function (fn) { try { fn(); } catch (e) { /* ignore */ } });
    },
    flushTimeouts: function (maxMs) {
      var cap = maxMs == null ? Infinity : maxMs;
      var ready = timeouts.filter(function (t) { return t.ms <= cap; });
      timeouts = timeouts.filter(function (t) { return ready.indexOf(t) < 0; });
      ready.forEach(function (t) { t.fn(); });
    },
    runRaf: function (now) {
      var q = rafQueue.slice();
      rafQueue.length = 0;
      q.forEach(function (x) { x.cb(now == null ? 0 : now); });
    }
  };
}

function dispatchKeydown(env, opts) {
  var doc = env.document;
  var target = opts.target || doc.activeElement || doc.body;
  var e = {
    type: 'keydown',
    key: opts.key,
    target: target,
    currentTarget: doc,
    preventDefault: function () { e.defaultPrevented = true; },
    stopPropagation: function () {},
    metaKey: !!opts.metaKey,
    ctrlKey: !!opts.ctrlKey,
    altKey: !!opts.altKey,
    shiftKey: !!opts.shiftKey,
    repeat: !!opts.repeat
  };
  var list = (doc.listeners.keydown || []).slice();
  list.forEach(function (fn) { fn(e); });
  if (target && target.listeners && target.listeners.keydown) {
    target.listeners.keydown.slice().forEach(function (fn) { fn(e); });
  }
  return e;
}

function dispatchEl(el, type, extra) {
  extra = extra || {};
  var ev = {
    type: type,
    target: el,
    currentTarget: el,
    detail: extra.detail != null ? extra.detail : 0,
    preventDefault: function () { ev.defaultPrevented = true; },
    stopPropagation: function () {}
  };
  (el.listeners[type] || []).slice().forEach(function (fn) { fn(ev); });
  return ev;
}

function fireChange(el) {
  var ev = {
    type: 'change', target: el, currentTarget: el,
    preventDefault: function () {}, stopPropagation: function () {}
  };
  ((el.listeners && el.listeners.change) || []).slice().forEach(function (fn) { fn(ev); });
}

function fireInput(el) {
  var ev = {
    type: 'input', target: el, currentTarget: el,
    preventDefault: function () {}, stopPropagation: function () {}
  };
  ((el.listeners && el.listeners.input) || []).slice().forEach(function (fn) { fn(ev); });
}

function boxesChecked(list) {
  var on = 0;
  for (var i = 0; i < list.length; i++) if (list[i].checked) on++;
  return on;
}

function ensureView(env, html) {
  var view = env.document.getElementById('view');
  if (!view) {
    view = env.document.createElement('div');
    view.id = 'view';
    view.setAttribute('id', 'view');
    env.document.body.appendChild(view);
  }
  if (html != null) view.innerHTML = html;
  return view;
}

console.log('ux-interaction (shipped motion.js + interaction modules)\n');

/* ——— (a) reduced-motion: loader / viewEnter / stagger / countUp / meter ——— */
console.log('reduced-motion no-ops');
var env = loadShipped(true);
var motion = env.window.PGRE.motion;
assert(!!motion, 'PGRE.motion installed from shipped motion.js');
assert(motion.reduced === true, 'motion.reduced is true when matchMedia reduce matches');

motion.loader.start();
var loaders = env.document.body.querySelectorAll('.motion-loader');
assert(loaders.length === 0, 'loader.start under reduce does not insert a crawl bar');
assert(env.rafQueue().length === 0, 'loader.start under reduce queues no rAF crawl');
motion.loader.done();
assert(env.document.body.querySelectorAll('.motion-loader').length === 0,
  'loader.done under reduce leaves no bar (snap-hidden / no-op)');

var view = env.document.createElement('div');
view.id = 'view';
env.document.body.appendChild(view);
motion.viewEnter(view);
assert(!view.classList.contains('view-enter'), 'viewEnter under reduce does not add .view-enter');

var grid = env.document.createElement('div');
var card = env.document.createElement('div');
card.classList.add('stagger-in');
grid.appendChild(card);
env.document.body.appendChild(grid);
motion.stagger(grid);
assert(!card.style.animationDelay, 'stagger under reduce does not set animation-delay');

var num = env.document.createElement('span');
num.textContent = '0';
motion.countUp(num, 42, { format: function (n) { return '+' + Math.round(n) + ' XP'; } });
assert(num.textContent === '+42 XP', 'countUp under reduce writes the final formatted value immediately');
assert(env.rafQueue().length === 0, 'countUp under reduce queues no tween frames');

var meter = env.document.createElement('div');
meter.className = 'meter-fill';
meter.style.width = '0%';
motion.animateMeter(meter, 75);
assert(meter.style.width === '75%', 'animateMeter under reduce sets final width immediately');
assert(env.rafQueue().length === 0, 'animateMeter under reduce queues no fill frames');

assert(typeof motion.letterSwapNav === 'function', 'motion.letterSwapNav is installed');
var navReduce = env.document.createElement('nav');
var aReduce = env.document.createElement('a');
aReduce.setAttribute('data-nav', 'dashboard');
aReduce.innerHTML = 'Dashboard';
navReduce.appendChild(aReduce);
env.document.body.appendChild(navReduce);
motion.letterSwapNav(navReduce);
assert(aReduce.querySelector('.letter-swap') == null,
  'letterSwapNav under reduce does not wrap labels');

/* ——— (a2) reduced=false control: motion actually runs ——— */
console.log('\nreduced=false control (motion is not always a no-op)');
var envOn = loadShipped(false);
var motionOn = envOn.window.PGRE.motion;
assert(motionOn.reduced === false, 'motion.reduced is false when matchMedia does not match reduce');

motionOn.loader.start();
var liveLoader = envOn.document.body.querySelector('.motion-loader');
assert(!!liveLoader, 'loader.start with motion on creates .motion-loader');
assert(envOn.rafQueue().length > 0, 'loader.start with motion on queues a crawl rAF');
motionOn.loader.done();

var viewOn = envOn.document.createElement('div');
viewOn.id = 'view-on';
envOn.document.body.appendChild(viewOn);
motionOn.viewEnter(viewOn);
assert(viewOn.classList.contains('view-enter'), 'viewEnter with motion on adds .view-enter');

var gridOn = envOn.document.createElement('div');
var cardOn = envOn.document.createElement('div');
cardOn.classList.add('stagger-in');
gridOn.appendChild(cardOn);
envOn.document.body.appendChild(gridOn);
motionOn.stagger(gridOn);
assert(!!cardOn.style.animationDelay, 'stagger with motion on sets animation-delay');

var numOn = envOn.document.createElement('span');
numOn.textContent = '0';
motionOn.countUp(numOn, 42, { format: function (n) { return '+' + Math.round(n) + ' XP'; } });
assert(envOn.rafQueue().length > 0, 'countUp with motion on queues rAF');
assert(numOn.textContent !== '+42 XP', 'countUp with motion on has not snapped to the final value yet');
envOn.runRaf(0);
assert(numOn.textContent !== '+42 XP', 'countUp first frame is an intermediate value, not the final');

var meterOn = envOn.document.createElement('div');
meterOn.className = 'meter-fill';
meterOn.style.width = '10%';
motionOn.animateMeter(meterOn, 75);
assert(meterOn.style.width === '0%', 'animateMeter with motion on zeros width before the fill');
assert(envOn.rafQueue().length > 0, 'animateMeter with motion on queues rAF to apply the target width');

var navLive = envOn.document.createElement('nav');
var aLive = envOn.document.createElement('a');
aLive.setAttribute('data-nav', 'dashboard');
aLive.innerHTML = 'Dashboard';
navLive.appendChild(aLive);
envOn.document.body.appendChild(navLive);
motionOn.letterSwapNav(navLive);
assert(!!aLive.querySelector('.letter-swap'), 'letterSwapNav with motion on wraps the label');
assert(!!aLive.querySelector('.letter-swap-sr'), 'letterSwapNav keeps a screen-reader label');
assert(aLive.querySelectorAll('.letter-swap-cell').length === 9,
  'letterSwapNav splits Dashboard into 9 cells');
assert(aLive.getAttribute('data-letter-swap') === '1', 'letterSwapNav marks the enhanced link');

var navNested = envOn.document.createElement('nav');
var aNested = envOn.document.createElement('a');
aNested.setAttribute('data-nav', 'dashboard');
aNested.innerHTML = '<svg></svg><span class="nav-label">Dashboard</span>';
navNested.appendChild(aNested);
envOn.document.body.appendChild(navNested);
motionOn.letterSwapNav(navNested);
assert(!!aNested.querySelector('.nav-label .letter-swap'),
  'letterSwapNav wraps the nested .nav-label');
assert(aNested.querySelectorAll('.letter-swap-cell').length === 9,
  'letterSwapNav splits nested Dashboard into 9 cells');
assert(aNested.getAttribute('data-letter-swap') === '1',
  'letterSwapNav marks the nested-label link');
/* ——— assess html() markers + bind on a parsed row ——— */
console.log('\nPGRE.assess.html + bind');
var assess = env.window.PGRE.assess;
assert(assess && typeof assess.html === 'function' && typeof assess.bind === 'function',
  'shipped PGRE.assess.html / bind are present');
var assessHtml = assess.html(true);
assert(/id="assess-row"/.test(assessHtml), 'assess.html() contains #assess-row');
assert(/data-assess/.test(assessHtml), 'assess.html() contains data-assess chips');

var box = env.document.createElement('div');
box.innerHTML = assessHtml;
env.document.body.appendChild(box);
var ctrl = assess.bind(box, { id: 'q-ux-1' }, true);
var sure = box.querySelector('[data-assess="sure"]');
var guess = box.querySelector('[data-assess="guess"]');
assert(!!sure && !!guess, 'bind() finds chips parsed from assess.html()');
sure.click();
assert(sure.getAttribute('aria-pressed') === 'true' && sure.classList.contains('active'),
  'click on html()-rendered Knew it sets aria-pressed/active');
assert(guess.getAttribute('aria-pressed') === 'false', 'click leaves Guessed unpressed');
ctrl.toggle('sure');
assert(sure.getAttribute('aria-pressed') === 'false', 'bind().toggle still shares the click path');

console.log('\nPGRE.ui.bindChoiceCommit');
var ui = env.window.PGRE.ui;
assert(ui && typeof ui.bindChoiceCommit === 'function', 'bindChoiceCommit is on PGRE.ui');
var commitBox = env.document.createElement('div');
commitBox.innerHTML =
  '<div class="choices">' +
    '<button class="choice" data-idx="0" aria-pressed="false">A</button>' +
    '<button class="choice" data-idx="1" aria-pressed="false">B</button>' +
  '</div>' +
  '<button type="button" class="btn btn-primary" id="confirm-btn" disabled>Confirm</button>';
env.document.body.appendChild(commitBox);
var commits = [];
ui.bindChoiceCommit(commitBox, { onCommit: function (i) { commits.push(i); } });
var c0 = commitBox.querySelector('.choice[data-idx="0"]');
var c1 = commitBox.querySelector('.choice[data-idx="1"]');
var cBtn = commitBox.querySelector('#confirm-btn');
assert(!!c0 && !!c1 && !!cBtn, 'commit fixture rendered choices and Confirm');
assert(cBtn.disabled === true, 'Confirm starts disabled');
c1.click();
assert(commits.length === 0, 'first click does not submit');
assert(c1.classList.contains('is-picked') && c1.getAttribute('aria-pressed') === 'true',
  'first click marks the choice picked');
assert(c0.getAttribute('aria-pressed') === 'false', 'unpicked choice stays unpressed');
assert(cBtn.disabled === false, 'Confirm enables after a pick');
c0.click();
assert(commits.length === 0, 'retargeting click still does not submit');
assert(c0.classList.contains('is-picked') && !c1.classList.contains('is-picked'),
  'a later click retargets the pending pick');
cBtn.click();
assert(commits.length === 1 && commits[0] === 0, 'Confirm submits the pending pick');
c1.click();
dispatchEl(c1, 'dblclick');
  assert(commits.length === 2 && commits[1] === 1, 'double-click submits that choice');
dispatchEl(c0, 'click', { detail: 2 });
assert(!c0.classList.contains('is-picked') && c1.classList.contains('is-picked'),
  'click detail>1 does not retarget the pending pick');
dispatchEl(c0, 'click', { detail: 1 });
assert(!c0.classList.contains('is-picked') && c1.classList.contains('is-picked'),
  'click-through (detail>=1, no mousedown) does not pick');
commitBox.remove();

/* sidebar aria-current + theme aria-pressed (same shipped functions the UI calls) */
console.log('\nshell aria');
var sidebar = env.document.createElement('aside');
sidebar.id = 'sidebar';
sidebar.setAttribute('id', 'sidebar');
['dashboard', 'exam', 'formulas'].forEach(function (id) {
  var a = env.document.createElement('a');
  a.setAttribute('data-nav', id);
  a.setAttribute('href', '#/' + (id === 'dashboard' ? '' : id));
  sidebar.appendChild(a);
});
env.document.body.appendChild(sidebar);
env.window.PGRE.setActiveNav('exam', {});
var examLink = sidebar.querySelector('a[data-nav="exam"]');
var dashLink = sidebar.querySelector('a[data-nav="dashboard"]');
assert(examLink.getAttribute('aria-current') === 'page', 'setActiveNav sets aria-current=page on the active link');
assert(dashLink.getAttribute('aria-current') == null, 'setActiveNav clears aria-current on inactive links');
assert(examLink.classList.contains('active'), 'setActiveNav still toggles .active');

var themeBtn = env.document.createElement('button');
themeBtn.id = 'theme-toggle';
themeBtn.setAttribute('id', 'theme-toggle');
env.document.body.appendChild(themeBtn);
env.window.PGRE.applyTheme('dark');
assert(themeBtn.getAttribute('aria-pressed') === 'true', 'applyTheme(dark) sets aria-pressed=true');
assert(themeBtn.textContent.indexOf('Light') !== -1, 'applyTheme(dark) relabels the button immediately');
env.window.PGRE.applyTheme('light');
assert(themeBtn.getAttribute('aria-pressed') === 'false', 'applyTheme(light) sets aria-pressed=false');

/* structural: reduced-motion CSS covers toast / shake / topic-card / meter / grade / tile */
console.log('\nreduced-motion CSS coverage');
var motionCss = fs.readFileSync(path.join(root, 'css', 'motion.css'), 'utf8');
var styleCss = fs.readFileSync(path.join(root, 'css', 'style.css'), 'utf8');
assert(/prefers-reduced-motion:\s*reduce/.test(motionCss), 'motion.css has a reduce block');
var motionFlat = motionCss.replace(/\s+/g, ' ');
var reduceAt = motionFlat.search(/prefers-reduced-motion:\s*reduce/);
var reduceFlat = reduceAt >= 0 ? motionFlat.slice(reduceAt) : '';
assert(/\.toast\s*\{[^}]*transition:\s*none/.test(motionFlat),
  'reduce block sets .toast { transition: none }');
assert(/\.flash-tile-shake\s*\{[^}]*animation:\s*none/.test(motionFlat),
  'reduce block sets .flash-tile-shake { animation: none }');
assert(/\.topic-card:hover\s*\{[^}]*transform:\s*none/.test(motionFlat),
  'reduce block sets .topic-card:hover { transform: none }');
assert(/\.grade-btn\s*\{[^}]*transition:\s*none/.test(reduceFlat),
  'reduce block sets .grade-btn { transition: none }');
assert(/\.flash-tile\s*\{[^}]*transition:\s*none/.test(reduceFlat),
  'reduce block sets .flash-tile { transition: none }');
assert(/\.letter-swap-a/.test(reduceFlat) && /letter-swap-b/.test(reduceFlat),
  'reduce block covers letter-swap layers');
assert(/width:\s*var\(--dur-slow\)\s+var\(--ease-out\)/.test(styleCss.replace(/\s+/g, ' ')) ||
  /width var\(--dur-slow\) var\(--ease-out\)/.test(styleCss),
  '.meter-fill uses duration/easing tokens, not 0.4s ease');

var indexSrc = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
var appAt = indexSrc.indexOf('js/app.js');
var motionAt = indexSrc.indexOf('js/motion.js');
assert(appAt >= 0 && motionAt > appAt, 'index.html loads motion.js after app.js');
assert(!/\stype=["']module["']/.test(indexSrc), 'index.html has no type=module scripts');
var motionSrc = fs.readFileSync(path.join(root, 'js', 'motion.js'), 'utf8');
assert(!/^\s*module\.exports\s*=/m.test(motionSrc), 'motion.js has no unguarded module.exports');

function runAsync() {
  console.log('\nshipped interaction modules');
  var ix = loadShipped(true, { views: true });
  var PGRE = ix.window.PGRE;
  assert(!!PGRE.flashmodes && typeof PGRE.flashmodes.startMatch === 'function',
    'loaded shipped js/flashmodes.js');
  assert(!!PGRE.views.formulas && typeof PGRE.views.formulas.mount === 'function',
    'loaded shipped js/view-formulas.js');
  assert(!!PGRE.views.exam && typeof PGRE.views.exam.mount === 'function',
    'loaded shipped js/view-exam.js');
  assert(!!PGRE.views.practice && typeof PGRE.views.practice.mount === 'function',
    'loaded shipped js/view-practice.js');
  /* Type-to-recall accepts notation-only differences without dropping
     semantic operators: rho_b/rho, nabla·/div, and vector decorations. */
  console.log('\ntype notation equivalence and sign safety');
  function typeVerdict(typed) {
    var host = ix.document.createElement('div');
    ix.document.body.appendChild(host);
    PGRE.flashmodes.startType({
      el: host,
      cards: [{
        id: 'repro-2.57',
        name: 'Dielectrics',
        front: 'What is the bound volume charge density rho_b in terms of the polarization P?',
        back: '$$\\rho_b = -\\nabla\\cdot\\mathbf{P}$$',
        eq: '2.57'
      }],
      onReplay: function () {},
      onExit: function () {}
    });
    host.querySelector('#flash-input').value = typed;
    host.querySelector('#flash-submit').click();
    var verdict = host.querySelector('.flash-auto');
    var matched = !!verdict && verdict.classList.contains('is-hit');
    host.remove();
    return matched;
  }
  assert(typeVerdict('rho = - divP vector'), 'notation-equivalent dielectric recall matches');
  assert(!typeVerdict('rho = divP vector'), 'wrong-sign dielectric recall misses');
  assert(!typeVerdict('rho_b = divP vector'), 'missing-minus dielectric recall misses');
  assert(!typeVerdict('sigma = - divE vector'), 'unrelated dielectric recall misses');


  /* PGRE.formulaTextHTML: angle-bracket expectation/average notation */
  console.log('\nformulaTextHTML: angle-bracket math notation');
  assert(typeof PGRE.formulaTextHTML === 'function', 'formulaTextHTML is exposed on PGRE');
  var dipolePrompt = 'What is the total average power <P>_B radiated by an oscillating magnetic dipole of amplitude m_0 at frequency \\omega?';
  var dipoleHTML = PGRE.formulaTextHTML(dipolePrompt);
  assert(dipoleHTML.indexOf('$\\langle P \\rangle_B$') !== -1,
    'formulaTextHTML converts <P>_B to $\\langle P \\rangle_B$, got: ' + dipoleHTML);
  assert(dipoleHTML.indexOf('<p>') === -1 && dipoleHTML.indexOf('<P>') === -1,
    'formulaTextHTML does not emit raw or unescaped HTML <p>/<P> tags');
  assert(dipoleHTML.indexOf('_B radiated') === -1,
    'formulaTextHTML leaves no orphaned subscript _B');
  assert(dipoleHTML.indexOf('$m_0$') !== -1 && dipoleHTML.indexOf('$\\omega$') !== -1,
    'formulaTextHTML formats $m_0$ and $\\omega$ in math');

  var eDipolePrompt = 'What is the total average power <P>_E radiated by an oscillating electric dipole of amplitude p_0 at frequency omega?';
  var eDipoleHTML = PGRE.formulaTextHTML(eDipolePrompt);
  assert(eDipoleHTML.indexOf('$\\langle P \\rangle_E$') !== -1,
    'formulaTextHTML converts <P>_E to $\\langle P \\rangle_E$');

  var poyntingPrompt = 'What is the time-averaged radiated intensity <S> of an oscillating electric dipole...';
  var poyntingHTML = PGRE.formulaTextHTML(poyntingPrompt);
  assert(poyntingHTML.indexOf('$\\langle S \\rangle$') !== -1,
    'formulaTextHTML converts <S> to $\\langle S \\rangle$');

  var expectations = PGRE.formulaTextHTML('Expectations <x>, <v>, and <x^2>');
  assert(expectations.indexOf('$\\langle x \\rangle$') !== -1 &&
         expectations.indexOf('$\\langle v \\rangle$') !== -1 &&
         expectations.indexOf('$\\langle x^2 \\rangle$') !== -1,
    'formulaTextHTML converts <x>, <v>, and <x^2>');

  /* Match: click and keyboard share onPick */
  console.log('\nmatch click vs keyboard (shipped onKey → onPick)');
  var matchHost = ix.document.createElement('div');
  matchHost.id = 'flash-body';
  matchHost.setAttribute('id', 'flash-body');
  ix.document.body.appendChild(matchHost);
  ix.location.hash = '#/formulas';
  var matchCtrl = PGRE.flashmodes.startMatch({
    el: matchHost,
    cards: ix.cards.slice(0, 2),
    onReplay: function () {},
    onExit: function () {}
  });
  var tiles = matchHost.querySelectorAll('.flash-tile');
  assert(tiles.length >= 4, 'startMatch rendered flash tiles from shipped flashmodes');
  tiles[0].click();
  assert(tiles[0].classList.contains('selected') && tiles[0].getAttribute('aria-pressed') === 'true',
    'click path calls onPick (tile 0 selected)');
  /* Motion-on so a mismatch still leaves .selected/.bad on tile 1 (under reduce,
     onPick reverts immediately and a no-op onKey would look the same). */
  ix.setReduced(false);
  var t1 = matchHost.querySelector('[data-tile="1"]');
  assert(!!t1, 'tile 1 exists for keyboard 2 → onPick(1)');
  var before = {
    pressed: t1.getAttribute('aria-pressed'),
    selected: t1.classList.contains('selected'),
    matched: t1.classList.contains('matched'),
    bad: t1.classList.contains('bad')
  };
  assert(typeof matchCtrl.onKey === 'function', 'startMatch returned the shipped Match onKey');
  var keyEv = {
    key: '2',
    preventDefault: function () { keyEv.defaultPrevented = true; },
    metaKey: false,
    ctrlKey: false,
    altKey: false
  };
  matchCtrl.onKey(keyEv);
  t1 = matchHost.querySelector('[data-tile="1"]');
  var after = {
    pressed: t1 ? t1.getAttribute('aria-pressed') : null,
    selected: !!(t1 && t1.classList.contains('selected')),
    matched: !!(t1 && t1.classList.contains('matched')),
    bad: !!(t1 && t1.classList.contains('bad'))
  };
  assert(after.pressed !== before.pressed || after.selected !== before.selected ||
    after.matched !== before.matched || after.bad !== before.bad,
    'keyboard 2 reaches shipped Match onKey → onPick (tile 1 aria-pressed/.selected/.matched/.bad changed)');
  var t0 = matchHost.querySelector('[data-tile="0"]');
  var samePair = t0 && t1 && (
    (t0.classList.contains('matched') && t1.classList.contains('matched')) ||
    (t0.classList.contains('bad') && t1.classList.contains('bad')) ||
    (t0.classList.contains('selected') && t1.classList.contains('selected'))
  );
  assert(samePair,
    'click tile 0 and keyboard 2 share onPick (same selected/matched/mismatch pair state)');
  ix.setReduced(true);
  if (matchCtrl && matchCtrl.stop) matchCtrl.stop();
  ix.flushTimeouts(600);

  /* Match mismatch delay under reduced vs motion-on */
  console.log('\nmatch mismatch delay (reduced vs motion-on)');
  function pickTwoPrompts(host) {
    var idxs = [];
    host.querySelectorAll('.flash-tile').forEach(function (t) {
      var kind = t.querySelector('.flash-tile-kind');
      if (kind && kind.textContent.indexOf('Prompt') !== -1) {
        idxs.push(parseInt(t.getAttribute('data-tile'), 10));
      }
    });
    return idxs;
  }
  var mmHost = ix.document.createElement('div');
  ix.document.body.appendChild(mmHost);
  ix.setReduced(true);
  PGRE.flashmodes.startMatch({
    el: mmHost, cards: ix.cards.slice(0, 2), onReplay: function () {}, onExit: function () {}
  });
  var prompts = pickTwoPrompts(mmHost);
  assert(prompts.length >= 2, 'match grid has two prompt tiles to force a mismatch');
  mmHost.querySelector('[data-tile="' + prompts[0] + '"]').click();
  mmHost.querySelector('[data-tile="' + prompts[1] + '"]').click();
  var has600 = ix.timeouts().some(function (t) { return t.ms === 600; });
  var a = mmHost.querySelector('[data-tile="' + prompts[0] + '"]');
  var b = mmHost.querySelector('[data-tile="' + prompts[1] + '"]');
  assert(!has600, 'mismatch under reduce does not schedule the 600ms hold');
  assert(a && !a.classList.contains('selected') && a.getAttribute('aria-pressed') === 'false',
    'mismatch under reduce reverts selected/aria-pressed immediately');
  assert(b && !b.classList.contains('selected') && b.getAttribute('aria-pressed') === 'false',
    'mismatch partner also unselected immediately under reduce');

  var mmHostOn = ix.document.createElement('div');
  ix.document.body.appendChild(mmHostOn);
  ix.setReduced(false);
  PGRE.flashmodes.startMatch({
    el: mmHostOn, cards: ix.cards.slice(0, 2), onReplay: function () {}, onExit: function () {}
  });
  var promptsOn = pickTwoPrompts(mmHostOn);
  mmHostOn.querySelector('[data-tile="' + promptsOn[0] + '"]').click();
  mmHostOn.querySelector('[data-tile="' + promptsOn[1] + '"]').click();
  var aOn = mmHostOn.querySelector('[data-tile="' + promptsOn[0] + '"]');
  assert(ix.timeouts().some(function (t) { return t.ms === 600; }),
    'mismatch with motion on keeps the 600ms revert timer');
  assert(aOn && (aOn.classList.contains('selected') || aOn.classList.contains('bad')),
    'mismatch with motion on still holds selected/bad until the timer fires');
  ix.setReduced(true);

  /* Cloze auto-advance under reduced-motion */
  console.log('\ncloze auto-advance (reduced vs motion-on)');
  var clozeHost = ix.document.createElement('div');
  clozeHost.id = 'cloze-host';
  clozeHost.setAttribute('id', 'cloze-host');
  ix.document.body.appendChild(clozeHost);
  ix.setReduced(true);
  var clozeCards = ix.cards.slice(0, 3);
  PGRE.flashmodes.startCloze({
    el: clozeHost, cards: clozeCards, deck: clozeCards,
    onReplay: function () {}, onExit: function () {}
  });
  var opt0 = clozeHost.querySelector('.cloze-option');
  assert(!!opt0, 'startCloze rendered option chips from shipped flashmodes');
  var hudBefore = (clozeHost.querySelector('.chip') || {}).textContent || '';
  opt0.click();
  var clozeDelay = ix.timeouts().some(function (t) { return t.ms === 650 || t.ms === 1200; });
  assert(!clozeDelay, 'cloze under reduce does not wait 650/1200ms');
  var hudAfter = (clozeHost.querySelector('.chip') || {}).textContent || '';
  var advanced = hudAfter !== hudBefore || /complete/i.test(clozeHost.textContent || '');
  assert(advanced, 'cloze under reduce advances (or finishes) immediately after painting tints');

  var clozeHostOn = ix.document.createElement('div');
  ix.document.body.appendChild(clozeHostOn);
  ix.setReduced(false);
  PGRE.flashmodes.startCloze({
    el: clozeHostOn, cards: clozeCards, deck: clozeCards,
    onReplay: function () {}, onExit: function () {}
  });
  var optOn = clozeHostOn.querySelector('.cloze-option');
  optOn.click();
  assert(ix.timeouts().some(function (t) { return t.ms === 650 || t.ms === 1200; }),
    'cloze with motion on keeps the 650/1200ms auto-advance timer');
  ix.setReduced(true);

  /* Exam: 1–5 / A–E keyboard and click share selectAnswer */
  console.log('\nexam 1–5 / A–E vs click (shipped selectAnswer)');
  ix.document.body.classList.remove('exam-fullscreen');
  var examView = ensureView(ix, PGRE.views.exam.render());
  PGRE.views.exam.mount({ sub: 'run' });
  var examChoice0 = ix.document.querySelector('#exam-q .choice[data-idx="0"]');
  var examChoice1 = ix.document.querySelector('#exam-q .choice[data-idx="1"]');
  assert(!!examChoice0 && !!examChoice1, 'exam room rendered choices from shipped view-exam.js');
  dispatchKeydown(ix, { key: 'B' });
  assert(examChoice1.classList.contains('is-picked') && examChoice1.getAttribute('aria-pressed') === 'true',
    'keyboard B reaches shipped exam key handler → selectAnswer');
  assert(ix.exam.answers.eq1 === 1, 'keyboard B stored answers[qid]=1');
  examChoice1.click();
  assert(ix.exam.answers.eq1 == null && examChoice1.getAttribute('aria-pressed') === 'false',
    'click on the same choice runs the same selectAnswer (toggle off)');
  examChoice0.click();
  assert(examChoice0.classList.contains('is-picked') && ix.exam.answers.eq1 === 0,
    'click path lands on the same is-picked / answers state as keyboard');
  dispatchKeydown(ix, { key: '3' });
  var examChoice2 = ix.document.querySelector('#exam-q .choice[data-idx="2"]');
  assert(examChoice2 && examChoice2.classList.contains('is-picked') && ix.exam.answers.eq1 === 2,
    'keyboard 3 (1–5) shares selectAnswer with A–E / click');

  /* Practice: first click / A–E select; Confirm or double-click commits */
  console.log('\npractice onKey vs click (select then confirm)');
  ix.document.body.classList.remove('exam-fullscreen');
  ensureView(ix, PGRE.views.practice.render());
  PGRE.views.practice.mount({ id: 'all' });
  var startAll = ix.document.querySelector('[data-count]');
  assert(!!startAll, 'practice config rendered a start-count button');
  var counts = ix.document.querySelectorAll('[data-count]');
  counts[counts.length - 1].click();
  return wait(350).then(function () {
    var pChoice1 = ix.document.querySelector('#practice-root .choice[data-idx="1"]');
    assert(!!pChoice1, 'practice question rendered choices');
    var promptOn1 = (ix.document.querySelector('#practice-root .q-text') || {}).textContent || '';
    var liveCells = ix.document.querySelectorAll('.practice-live .practice-palette .pal-cell');
    assert(liveCells.length === 2, 'live palette has a box per question');
    assert(!liveCells[0].disabled && !liveCells[1].disabled,
      'live palette cells are clickable during the drill');
    liveCells[1].click();
    var metaAfterJump = ix.document.querySelector('#practice-root .practice-meta');
    assert(metaAfterJump && metaAfterJump.textContent.indexOf('Question 2 of 2') !== -1,
      'clicking box 2 during the drill opens question 2');
    var promptOn2 = (ix.document.querySelector('#practice-root .q-text') || {}).textContent || '';
    assert(promptOn2 !== promptOn1, 'live palette jump changes the current question');
    var curLive = ix.document.querySelector('.practice-live .practice-palette .pal-cell.is-current');
    assert(curLive && curLive.textContent === '2', 'box 2 is marked is-current after live jump');
    liveCells = ix.document.querySelectorAll('.practice-live .practice-palette .pal-cell');
    liveCells[0].click();
    assert(ix.document.querySelector('#practice-root .practice-meta').textContent.indexOf('Question 1 of 2') !== -1,
      'clicking box 1 during the drill returns to question 1');
    assert(((ix.document.querySelector('#practice-root .q-text') || {}).textContent || '') === promptOn1,
      'returning via the palette restores question 1');
    dispatchKeydown(ix, { key: 'B' });
    pChoice1 = ix.document.querySelector('#practice-root .choice[data-idx="1"]');
    assert(pChoice1 && pChoice1.getAttribute('aria-pressed') === 'true',
      'keyboard B reaches shipped practice onKey → select, not answer()');
    assert(pChoice1.classList.contains('is-picked'), 'keyboard B paints is-picked');
    assert(!ix.document.getElementById('assess-row'),
      'keyboard B does not grade until Confirm');
    var confirmBtn = ix.document.getElementById('confirm-btn');
    assert(!!confirmBtn && confirmBtn.disabled === false, 'Confirm enables after B');
    confirmBtn.click();
    var assessRow = ix.document.getElementById('assess-row');
    assert(!!assessRow, 'Confirm commits through answer() (#assess-row present)');
    dispatchKeydown(ix, { key: 'k' });
    var sureChip = ix.document.querySelector('[data-assess="sure"]');
    assert(sureChip && sureChip.getAttribute('aria-pressed') === 'true',
      'keyboard K reaches shipped practice onKey → assess.toggle (same as click)');
    var guessChip = ix.document.querySelector('[data-assess="guess"]');
    guessChip.click();
    assert(guessChip.getAttribute('aria-pressed') === 'true',
      'click on Guessed uses the same bind().toggle the K key just used');
    assert(sureChip.getAttribute('aria-pressed') === 'false',
      'Knew it / Guessed stay mutually exclusive on mixed keyboard+click');

    liveCells = ix.document.querySelectorAll('.practice-live .practice-palette .pal-cell');
    liveCells[1].click();
    assert(ix.document.querySelector('#practice-root .practice-meta').textContent.indexOf('Question 2 of 2') !== -1,
      'palette jump from feedback opens the unanswered question');
    liveCells = ix.document.querySelectorAll('.practice-live .practice-palette .pal-cell');
    liveCells[0].click();
    assert(ix.document.querySelector('#practice-root .practice-meta').textContent.indexOf('Question 1 of 2') !== -1,
      'palette jump returns to the answered question');
    assessRow = ix.document.getElementById('assess-row');
    assert(!!assessRow, 'returning to an answered live question still shows Knew it / Guessed');
    guessChip = ix.document.querySelector('[data-assess="guess"]');
    assert(guessChip && guessChip.getAttribute('aria-pressed') === 'true',
      'Guessed tag survives the palette jump');
    dispatchKeydown(ix, { key: 'k' });
    sureChip = ix.document.querySelector('[data-assess="sure"]');
    assert(sureChip && sureChip.getAttribute('aria-pressed') === 'true',
      'keyboard K still toggles assess after returning via the palette');

    var nextBtn = ix.document.getElementById('next-btn');
    if (nextBtn) nextBtn.click();
    return wait(350);
  }).then(function () {
    var pChoice1b = ix.document.querySelector('#practice-root .choice[data-idx="1"]');
    if (pChoice1b) {
      pChoice1b.click();
      assert(pChoice1b.getAttribute('aria-pressed') === 'true',
        'click on a practice choice selects without grading');
      assert(!ix.document.getElementById('assess-row'),
        'first click does not open feedback');
      dispatchEl(pChoice1b, 'dblclick');
      assert(!!ix.document.getElementById('assess-row'),
        'double-click on a practice choice runs the same answer() as Confirm');
    } else {
      assert(false, 'second practice question rendered a choice to click');
    }

    var finishBtn = ix.document.getElementById('next-btn');
    assert(finishBtn && finishBtn.textContent === 'Finish session', 'second question shows Finish session button');
    if (finishBtn) finishBtn.click();
    var revButtons = ix.document.querySelectorAll('[data-review]');
    assert(revButtons.length === 2, 'summary renders data-review buttons for completed questions');
    revButtons[0].click();
    var reviewMeta = ix.document.querySelector('#practice-root .practice-meta');
    assert(reviewMeta && reviewMeta.textContent.indexOf('Review — 1 of 2') !== -1, 'clicking box 1 renders review card for question 1');
    var curCell = ix.document.querySelector('.practice-palette .pal-cell.is-current');
    assert(curCell && curCell.textContent === '1', 'box 1 is marked is-current in review');
    var reviewNext = ix.document.getElementById('review-next');
    assert(!!reviewNext, 'review renders review-next button');
    if (reviewNext) reviewNext.click();
    assert(ix.document.querySelector('#practice-root .practice-meta').textContent.indexOf('Review — 2 of 2') !== -1, 'review-next navigates to question 2');
    var reviewBack = ix.document.getElementById('review-summary');
    assert(!!reviewBack, 'review renders Back to results button');
    if (reviewBack) reviewBack.click();
    assert(ix.document.querySelector('#practice-root h1').textContent === 'Session complete', 'Back to results returns to summary');
    var revBtn0 = ix.document.querySelector('[data-review="0"]');
    if (revBtn0) revBtn0.click();
    dispatchKeydown(ix, { key: 'ArrowRight' });
    assert(ix.document.querySelector('#practice-root .practice-meta').textContent.indexOf('Review — 2 of 2') !== -1, 'ArrowRight advances to question 2 in review');
    dispatchKeydown(ix, { key: 'ArrowLeft' });
    assert(ix.document.querySelector('#practice-root .practice-meta').textContent.indexOf('Review — 1 of 2') !== -1, 'ArrowLeft returns to question 1 in review');
    dispatchKeydown(ix, { key: 'Escape' });
    assert(ix.document.querySelector('#practice-root h1').textContent === 'Session complete', 'Escape returns to summary');

    /* Formulas portal: Type undo (click + Ctrl+Z through the document handler)
       and checkpoint overlay (focused Finish must not Keep going). */
    console.log('\nformulas: type undo + overlay (shipped document key listener)');
    ix.location.hash = '#/formulas';
    /* Cloze earlier in this file calls reviewCard → gradeCard on shuffled cards.
       Clear the log so Type undo asserts the row it just wrote, not a leftover
       same-id review from that prior game. */
    PGRE.store.state.cardReviews = [];
    ensureView(ix, PGRE.views.formulas.render());
    PGRE.views.formulas.mount();
    return Promise.resolve()
      .then(function () { return Promise.resolve(); })
      .then(function () { return Promise.resolve(); })
      .then(function () { return wait(0); });
  }).then(function () {
    var typeTab = ix.document.querySelector('[data-mode="type"]');
    assert(!!typeTab, 'formulas shell rendered the Type tab from shipped view-formulas.js');
    typeTab.click();
    var startBtn = ix.document.getElementById('game-start');
    assert(!!startBtn, 'Type intro rendered Start from shipped launch path');
    startBtn.click();
    var inp = ix.document.getElementById('flash-input');
    assert(!!inp, 'startType rendered #flash-input');
    inp.value = 'nope';
    inp.focus();
    ix.document.getElementById('flash-submit').click();
    var gradeGood = ix.document.querySelector('[data-grade="good"]');
    assert(!!gradeGood, 'type reveal rendered grade buttons');
    gradeGood.click();
    var undoBtn = ix.document.getElementById('flash-undo');
    assert(!!undoBtn, 'grading a type card shows #flash-undo');
    var reviews = PGRE.store.state.cardReviews;
    assert(reviews.length > 0, 'gradeCard wrote a cardReviews entry (click path about to undo it)');
    var reviewsBefore = reviews.length;
    var clickRow = reviews[reviews.length - 1];
    undoBtn.click();
    assert(!ix.document.getElementById('flash-undo'), 'click on #flash-undo calls undoLast (link removed)');
    assert(PGRE.store.state.cardReviews.length === reviewsBefore - 1,
      'click undoLast popped the same cardReviews entry gradeCard wrote');
    assert(PGRE.store.state.cardReviews.indexOf(clickRow) === -1,
      'click undoLast restored SRS (the review object gradeCard just wrote is gone)');

    var inp2 = ix.document.getElementById('flash-input');
    if (inp2) { inp2.value = 'stillnope'; inp2.focus(); }
    var sub2 = ix.document.getElementById('flash-submit');
    if (sub2) sub2.click();
    var gradeAgain = ix.document.querySelector('[data-grade="again"]') ||
      ix.document.querySelector('[data-grade="good"]');
    if (gradeAgain) gradeAgain.click();
    var undo2 = ix.document.getElementById('flash-undo');
    assert(!!undo2, 'second grade restored an #flash-undo for the keyboard path');
    var reviewsBefore2 = PGRE.store.state.cardReviews.length;
    var keyRow = PGRE.store.state.cardReviews[reviewsBefore2 - 1];
    var inp3 = ix.document.getElementById('flash-input');
    if (inp3) inp3.focus();
    dispatchKeydown(ix, {
      key: 'z',
      ctrlKey: true,
      target: inp3 || ix.document.activeElement
    });
    assert(!ix.document.getElementById('flash-undo'),
      'Ctrl+Z while INPUT focused reaches shipped undoLast (same as click)');
    assert(PGRE.store.state.cardReviews.length === reviewsBefore2 - 1,
      'keyboard undoLast popped the same cardReviews entry the click path pops');
    assert(keyRow && PGRE.store.state.cardReviews.indexOf(keyRow) === -1,
      'keyboard undoLast restored the same SRS state the click path restored');

    /* Overlay: drive study to a checkpoint via Easy × 10 with cards remaining */
    var studyTab = ix.document.querySelector('[data-mode="study"]');
    studyTab.click();
    var studyBtn = ix.document.getElementById('study-btn');
    assert(!!studyBtn, 'Study home rendered #study-btn from remaining cards');
    studyBtn.click();
    var i;
    for (i = 0; i < 10; i++) {
      var flip = ix.document.getElementById('flip-btn');
      if (!flip) break;
      flip.click();
      var easy = ix.document.querySelector('[data-grade="easy"]');
      if (!easy) break;
      easy.click();
    }
    var finish = ix.document.getElementById('cp-finish');
    var keep = ix.document.getElementById('cp-keep');
    assert(!!finish && !!keep, '10 Easy grades with cards left opened the checkpoint overlay');
    finish.focus();
    assert(ix.document.activeElement && ix.document.activeElement.id === 'cp-finish',
      'Finish is the activeElement');
    dispatchKeydown(ix, { key: 'Enter', target: finish });
    assert(!!ix.document.getElementById('cp-finish'),
      'focused #cp-finish + Enter does not call Keep-going (runNextOverlay)');
    dispatchKeydown(ix, { key: ' ', target: finish });
    assert(!!ix.document.getElementById('cp-finish'),
      'focused #cp-finish + Space does not call Keep-going (runNextOverlay)');
    ix.document.body.focus();
    dispatchKeydown(ix, { key: 'Enter', target: ix.document.body });
    assert(!ix.document.getElementById('cp-finish'),
      'unfocused Enter on the overlay does Keep-going (shipped runNextOverlay)');

    console.log('\nformulas: Open Simulation from session peek');
    var vz = loadShipped(true, { views: true });
    var VP = vz.sandbox.PGRE;
    var openedViz = [];
    var closedViz = 0;
    VP.visualizers = {};
    VP.openVisualizerModal = function (id) { openedViz.push(id); };
    VP.closeVisualizerModal = function () { closedViz++; };
    vz.location.hash = '#/formulas';
    ensureView(vz, VP.views.formulas.render());
    VP.views.formulas.mount();
    return wait(0).then(function () {
      var studyBtn = vz.document.getElementById('study-btn');
      assert(!!studyBtn, 'Study remaining button rendered');
      studyBtn.click();
      vz.document.getElementById('flip-btn').click();
      var easy = vz.document.querySelector('[data-grade="easy"]');
      assert(!!easy, 'grade buttons rendered after flip');
      easy.click();
      var back = vz.document.getElementById('session-back');
      assert(!!back, 'Back appears after a graded press');
      back.click();
      assert(!vz.document.getElementById('peek-viz'),
        'peek overlay omits Open Simulation when the reviewed card has no sim');
      assert(!!vz.document.getElementById('peek-resume'),
        'Resume study still present without a visualizer');
      var i;
      for (i = 0; i < 12; i++) {
        VP.visualizers['f' + i] = { draw: function () {} };
      }
      vz.document.getElementById('peek-resume').click();
      vz.document.getElementById('session-back').click();
      var peekViz = vz.document.getElementById('peek-viz');
      assert(!!peekViz, 'peek overlay shows Open Simulation when the reviewed card has a sim');
      assert(peekViz.textContent === 'Open Simulation', 'peek CTA uses the Lab label');
      assert(peekViz.getAttribute('aria-haspopup') === 'dialog',
        'Open Simulation declares it opens a dialog');
      assert(!!peekViz.closest('.viz-open-strip'), 'peek Open Simulation uses the designed strip');
      assert(!peekViz.closest('.session-peek-bar'), 'peek Open Simulation is not in the resume-bar');
      openedViz = [];
      peekViz.click();
      assert(openedViz.length === 1 && openedViz[0] === peekViz.getAttribute('data-viz-open'),
        'peek Open Simulation calls openVisualizerModal with the reviewed card id');
      var closedBeforeResume = closedViz;
      vz.document.getElementById('peek-resume').click();
      assert(closedViz > closedBeforeResume, 'Resume study closes an open visualizer modal');
      assert(!vz.document.getElementById('peek-resume'),
        'Resume returns to the live study card');
    });
  }).then(function () {
    console.log('\nformulas: study flip Open Simulation, no inline canvas');
    var st = loadShipped(true, { views: true });
    var SP = st.sandbox.PGRE;
    var openedStudy = [];
    var si;
    for (si = 0; si < 12; si++) {
      SP.visualizers['f' + si] = { draw: function () {} };
    }
    SP.openVisualizerModal = function (id) { openedStudy.push(id); };
    st.location.hash = '#/formulas';
    ensureView(st, SP.views.formulas.render());
    SP.views.formulas.mount();
    return wait(0).then(function () {
      st.document.getElementById('study-btn').click();
      st.document.getElementById('flip-btn').click();
      assert(!st.document.querySelector('.viz-inline-container'),
        'study flip does not mount inline visualizer');
      assert(!st.document.getElementById('viz-inline-canvas'),
        'study flip does not mount inline canvas');
      var studyViz = st.document.getElementById('study-viz');
      assert(!!studyViz, 'flipped viz card shows Open Simulation');
      assert(studyViz.textContent === 'Open Simulation', 'study CTA uses Open Simulation');
      assert(!!studyViz.closest('#fcard-back'), 'Open Simulation sits on the card back');
      assert(!!studyViz.closest('.viz-open-strip'), 'study Open Simulation uses the designed strip');
      var grades = st.document.querySelectorAll('#fcard-actions [data-grade]');
      assert(grades.length === 4, 'grade row is Again/Hard/Good/Easy only');
      assert(!st.document.querySelector('#fcard-actions [data-viz-open]'),
        'Open Simulation is not in the grade row');
      openedStudy = [];
      studyViz.click();
      assert(openedStudy.length === 1 && openedStudy[0] === studyViz.getAttribute('data-viz-open'),
        'study Open Simulation calls openVisualizerModal');
      assert(!!st.document.getElementById('study-viz') &&
        st.document.querySelectorAll('#fcard-actions [data-grade]').length === 4,
        'Open Simulation click does not grade or leave the card');
    });
  }).then(function () {
    console.log('\nformulas: study flip omits Open Simulation without a sim');
    var nv = loadShipped(true, { views: true });
    var NP = nv.sandbox.PGRE;
    nv.location.hash = '#/formulas';
    ensureView(nv, NP.views.formulas.render());
    NP.views.formulas.mount();
    return wait(0).then(function () {
      nv.document.getElementById('study-btn').click();
      nv.document.getElementById('flip-btn').click();
      assert(!nv.document.getElementById('study-viz'),
        'non-viz study card has no Open Simulation');
      assert(!nv.document.querySelector('#fcard-back .viz-open-strip'),
        'non-viz card back has no simulation strip');
      assert(nv.document.querySelectorAll('#fcard-actions [data-grade]').length === 4,
        'non-viz grade row is still Again/Hard/Good/Easy only');
    });
  }).then(function () {
    console.log('\nformulas: F5 reverse Open Simulation on card back');
    var rv = loadShipped(true, { views: true });
    var RV = rv.sandbox.PGRE;
    RV.store.state.settings.formulaReverse = true;
    var ri;
    for (ri = 0; ri < 12; ri++) {
      RV.visualizers['f' + ri] = { draw: function () {} };
    }
    var openedRev = [];
    RV.openVisualizerModal = function (id) { openedRev.push(id); };
    rv.location.hash = '#/formulas';
    ensureView(rv, RV.views.formulas.render());
    RV.views.formulas.mount();
    return wait(0).then(function () {
      rv.document.getElementById('study-btn').click();
      rv.document.getElementById('flip-btn').click();
      var revViz = rv.document.getElementById('study-viz');
      assert(!!revViz, 'F5 reverse flipped viz card shows Open Simulation');
      assert(!!revViz.closest('#fcard-back'), 'F5 reverse Open Simulation sits on the card back');
      assert(!rv.document.querySelector('#fcard-actions [data-viz-open]'),
        'F5 reverse keeps Open Simulation out of the grade row');
      assert(!rv.document.querySelector('.viz-inline-container'),
        'F5 reverse flip does not mount inline visualizer');
      openedRev = [];
      revViz.click();
      assert(openedRev.length === 1 && openedRev[0] === revViz.getAttribute('data-viz-open'),
        'F5 reverse Open Simulation calls openVisualizerModal');
    });
  }).then(function () {
    console.log('\nformulas: search Open Simulation vs Complete view');
    var sr = loadShipped(true, { views: true });
    var RP = sr.sandbox.PGRE;
    RP.srs.isInFormulaDay = function () { return false; };
    RP.visualizers = { f0: { draw: function () {} } };
    vm.runInContext(
      fs.readFileSync(path.join(root, 'js/formula-search.js'), 'utf8'),
      sr.sandbox,
      { filename: 'js/formula-search.js' }
    );
    sr.location.hash = '#/formulas';
    ensureView(sr, RP.views.formulas.render());
    RP.views.formulas.mount();
    return wait(0).then(function () {
      var searchTab = sr.document.querySelector('.flash-tab[data-mode="search"]');
      assert(!!searchTab, 'Search tab rendered');
      searchTab.click();
      var vizBtn = sr.document.querySelector('[data-fs-modal="f0"]');
      var plainBtn = sr.document.querySelector('[data-fs-modal="f1"]');
      assert(!!vizBtn && vizBtn.textContent === 'Open Simulation',
        'search viz card labels Open Simulation');
      assert(vizBtn.getAttribute('aria-haspopup') === 'dialog',
        'search viz CTA declares it opens a dialog');
      assert(!!plainBtn && plainBtn.textContent === 'Complete view',
        'search non-viz card keeps Complete view');
    });
  }).then(function () {
    console.log('\nformulas: picker groups by chapter, lazy rows, fill + save');
    var pk = loadShipped(true, { views: true });
    var P = pk.sandbox.PGRE;
    // second chapter: cpgf-<ch>.<eq> ids drive the grouping
    pk.cards.push({ id: 'cpgf-2.1', topic: 'em', name: 'Gauss', front: 'Gauss law', back: '$$\\Phi = Q/\\epsilon_0$$', note: '', aliases: [] });
    pk.cards.push({ id: 'cpgf-2.2', topic: 'em', name: 'Ampere', front: 'Ampere law', back: '$$\\oint B = \\mu_0 I$$', note: '', aliases: [] });
    pk.cards.push({ id: 'cpgf-2.3', topic: 'em', name: 'Faraday', front: 'Faraday law', back: '$$\\mathcal{E} = -d\\Phi/dt$$', note: '', aliases: [] });
    pk.cardStates['cpgf-2.1'] = { due: '2026-09-07', interval: 1, reps: 1 };
    pk.cardStates['cpgf-2.3'] = { due: '2026-09-10', interval: 4, reps: 1 };
    P.srs.formulaDay = function () { return { reviewIds: [], newIds: [], softIds: [] }; };
    P.srs.formulaDayRemaining = function () { return []; };
    P.srs.buildMemHistory = function () { return null; };
    // cpgf-2.1 was already studied today -> locked, stays picked, excluded from Save
    P.srs.studiedToday = function (st) { return st === pk.cardStates['cpgf-2.1']; };
    var savedIds = null;
    P.srs.setFormulaDayPicks = function (deck, ids) { savedIds = ids; };
    pk.location.hash = '#/formulas';
    ensureView(pk, P.views.formulas.render());
    P.views.formulas.mount();
    return wait(0).then(function () {
      var pick = pk.document.getElementById('landing-pick-btn') ||
        pk.document.getElementById('pick-btn');
      assert(!!pick, 'picker entry rendered');
      pick.click();

      var chapters = pk.document.querySelectorAll('.picker-chapter');
      assert(chapters.length === 2, 'two chapter groups (ch 2 + other), got ' + chapters.length);
      var ch2 = null, other = null;
      chapters.forEach(function (tp) {
        if (tp.getAttribute('data-ch') === '2') ch2 = tp; else other = tp;
      });
      assert(!!ch2 && !!other, 'chapter 2 group and fallback group both present');
      var bodies = pk.document.querySelectorAll('.picker-chapter-body');
      var allHidden = true;
      bodies.forEach(function (b) { if (!b.hidden) allHidden = false; });
      assert(allHidden, 'chapter bodies start collapsed');
      assert(pk.document.querySelectorAll('.picker-box').length === 0,
        'no card rows in the DOM while collapsed');

      ch2.querySelector('.picker-ch-toggle').click();
      var boxes = ch2.querySelectorAll('.picker-box');
      assert(boxes.length === 3, 'expanding paints that chapter’s three rows');
      var peek = ch2.querySelector('.picker-preview');
      assert(!!peek && peek.textContent.indexOf('Phi') !== -1,
        'row shows the rendered formula, not a bare id');
      assert(boxes[0].getAttribute('data-locked') === '1' && boxes[0].checked,
        'studied-today card is locked and stays picked');
      assert(!boxes[1].checked, 'unseen card starts unchecked');

      var gaussRow = ch2.querySelector('.picker-row[data-cardid="cpgf-2.1"]');
      var ampereRow = ch2.querySelector('.picker-row[data-cardid="cpgf-2.2"]');
      var faradayRow = ch2.querySelector('.picker-row[data-cardid="cpgf-2.3"]');
      assert(!!gaussRow && gaussRow.classList.contains('picker-today'),
        'locked studied-today row is marked today');
      assert(!!ampereRow && !ampereRow.classList.contains('picker-learned-only') &&
        !ampereRow.classList.contains('picker-today'),
        'never-studied Ampere has an empty box');
      assert(!!faradayRow && faradayRow.classList.contains('picker-learned-only') &&
        boxes[2].checked && faradayRow.getAttribute('data-today') == null,
        'ever-studied Faraday is filled but not in today');

      var chCount = ch2.querySelector('.picker-ch-count');
      assert(chCount && chCount.textContent.indexOf('2/3') !== -1,
        'chapter fraction is ever-studied / size, got: ' + (chCount && chCount.textContent));
      var otherCount = other.querySelector('.picker-ch-count');
      assert(otherCount && otherCount.textContent.indexOf('0/12') !== -1,
        'unlearned chapter is 0/size, got: ' + (otherCount && otherCount.textContent));

      var count = pk.document.getElementById('picker-count');
      assert(count.textContent === 'today 1 · ever 2 · target 20',
        'counter starts with locked today + deck ever, got: ' + count.textContent);

      fireChange(boxes[2]);
      assert(faradayRow.classList.contains('picker-today') &&
        !faradayRow.classList.contains('picker-learned-only') &&
        faradayRow.getAttribute('data-today') === '1',
        'clicking a learned-only box adds it to today');
      assert(count.textContent === 'today 2 · ever 2 · target 20',
        'today count rises without changing ever, got: ' + count.textContent);
      fireChange(boxes[2]);
      assert(faradayRow.classList.contains('picker-learned-only') &&
        boxes[2].checked && faradayRow.getAttribute('data-today') == null,
        'second click removes Faraday from today but keeps the learned fill');
      assert(count.textContent === 'today 1 · ever 2 · target 20',
        'ever stays 2 after unpicking Faraday, got: ' + count.textContent);

      boxes[1].checked = true;
      fireChange(boxes[1]);
      assert(count.textContent === 'today 2 · ever 2 · target 20',
        'count tracks locked + manual pick, got: ' + count.textContent);
      assert(chCount.textContent.indexOf('2/3') !== -1,
        'chapter fraction ignores today picks, got: ' + chCount.textContent);

      var fill = pk.document.getElementById('picker-fill');
      assert(!!fill, 'fill-batch control rendered');
      fill.click();
      assert(count.textContent === 'today 14 · ever 2 · target 20',
        'fill stages every unseen card up to target (12 f-cards + cpgf-2.2), got: ' + count.textContent);
      assert(savedIds === null, 'fill does not persist — Save still owns the write');
      assert(boxes[2].checked && faradayRow.classList.contains('picker-learned-only'),
        'fill does not unlearn Faraday or add it to today');

      var saOther = other.querySelector('.picker-selall-box');
      saOther.checked = true;
      fireChange(saOther);
      assert(count.textContent === 'today 14 · ever 2 · target 20',
        'chapter select-all picks its 12 cards without opening it, got: ' + count.textContent);

      var filter = pk.document.getElementById('picker-filter');
      filter.value = 'ampere';
      fireInput(filter);
      assert(!!other.hidden, 'non-matching chapter hides under filter');
      assert(!ch2.hidden, 'matching chapter stays visible');
      filter.value = '';
      fireInput(filter);
      assert(!other.hidden, 'clearing filter restores the chapter');

      ch2.querySelector('.picker-ch-toggle').click();
      assert(ch2.querySelectorAll('.picker-box').length === 0,
        'collapsing removes the rows from the DOM');

      pk.document.getElementById('picker-save').click();
      assert(Array.isArray(savedIds) && savedIds.length === 13,
        'save persists picked minus locked (14 picked - 1 locked = 13), got ' +
          (savedIds && savedIds.length));
      assert(savedIds.indexOf('cpgf-2.1') === -1, 'locked card not written to the batch');
      assert(savedIds.indexOf('cpgf-2.3') === -1, 'learned-only Faraday is not saved');
      assert(savedIds.indexOf('cpgf-2.2') !== -1 && savedIds.indexOf('f0') !== -1,
        'manual pick and filled ids both saved');
    });
  });
}

runAsync().then(function () {
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
  console.log('ALL OK');
}).catch(function (err) {
  console.error('FAIL — uncaught: ' + (err && err.stack ? err.stack : err));
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(1);
});
