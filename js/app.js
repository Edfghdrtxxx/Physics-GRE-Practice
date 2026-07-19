/* App shell: hash router, sidebar nav, shared UI helpers, toasts, boot. */
window.PGRE = window.PGRE || {};
PGRE.views = PGRE.views || {};

/* ——— Shared UI helpers ——— */
PGRE.ui = {
  esc: function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  },

  fmt: function (n) { return Number(n).toLocaleString('en-US'); },

  meter: function (pct, extraClass) {
    pct = Math.max(0, Math.min(100, pct || 0));
    return '<div class="meter ' + (extraClass || '') + '">' +
             '<div class="meter-fill" style="width:' + pct + '%"></div>' +
           '</div>';
  },

  statTile: function (label, value, sub) {
    return '<div class="stat-tile">' +
             '<div class="stat-label">' + label + '</div>' +
             '<div class="stat-value">' + value + '</div>' +
             (sub ? '<div class="stat-sub">' + sub + '</div>' : '') +
           '</div>';
  },

  monogram: function (topic) {
    return '<span class="mono mono-' + topic.id + '">' + topic.short + '</span>';
  },

  /* Difficulty dots, clamped to 1–3: bank data outside the range degrades to
     an odd chip instead of a repeat() RangeError blanking the whole view. */
  diffDots: function (difficulty) {
    var d = Math.max(0, Math.min(3, (Number(difficulty) || 0) | 0));
    return '●'.repeat(d) + '○'.repeat(3 - d);
  },

  timeAgo: function (iso) {
    var s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + ' h ago';
    var d = Math.floor(s / 86400);
    return d === 1 ? 'yesterday' : d + ' days ago';
  },

  dateRange: function (start, end) {
    var opts = { month: 'short', day: 'numeric' };
    var s = new Date(start + 'T12:00:00').toLocaleDateString('en-US', opts);
    var e = new Date(end + 'T12:00:00').toLocaleDateString('en-US', opts);
    return s + ' – ' + e;
  }
};

/* ——— Markdown + math rendering (vendored, fully offline) ———
   Imported book markdown comes from an external OCR pipeline and legitimately
   relies on raw-HTML passthrough for formatting (<sup>, <br>), so marked's
   output is run through an allowlist sanitizer before any caller injects it:
   unknown tags are unwrapped (their text kept), script-capable elements are
   dropped whole, and event-handler / script-URL attributes never survive. */
PGRE.renderMarkdown = (function () {
  var ALLOWED = { a: 1, b: 1, blockquote: 1, br: 1, code: 1, del: 1, div: 1,
                  em: 1, h1: 1, h2: 1, h3: 1, h4: 1, h5: 1, h6: 1, hr: 1, i: 1,
                  img: 1, li: 1, ol: 1, p: 1, pre: 1, s: 1, small: 1, span: 1,
                  strong: 1, sub: 1, sup: 1, table: 1, tbody: 1, td: 1,
                  tfoot: 1, th: 1, thead: 1, tr: 1, u: 1, ul: 1 };
  var DROP = { base: 1, button: 1, embed: 1, form: 1, iframe: 1, input: 1,
               link: 1, math: 1, meta: 1, noscript: 1, object: 1, script: 1,
               select: 1, style: 1, svg: 1, template: 1, textarea: 1, title: 1 };
  var ATTRS = { align: 1, alt: 1, class: 1, colspan: 1, height: 1, href: 1,
                rowspan: 1, src: 1, start: 1, title: 1, width: 1 };

  function safeUrl(v) {
    return !/^(javascript|vbscript|data):/
      .test(String(v).replace(/[\s\u0000-\u001f]+/g, '').toLowerCase());
  }

  function scrub(node) {
    var kids = Array.prototype.slice.call(node.childNodes);
    kids.forEach(function (child) {
      if (child.nodeType === 8) { node.removeChild(child); return; } // comments
      if (child.nodeType !== 1) return;                              // text stays
      var tag = child.tagName.toLowerCase();
      if (DROP[tag]) { node.removeChild(child); return; }
      if (!ALLOWED[tag]) {           // unknown tag (e.g. a stray <E>): keep its text
        scrub(child);
        while (child.firstChild) node.insertBefore(child.firstChild, child);
        node.removeChild(child);
        return;
      }
      Array.prototype.slice.call(child.attributes).forEach(function (a) {
        var name = a.name.toLowerCase();
        if (!ATTRS[name] || ((name === 'href' || name === 'src') && !safeUrl(a.value))) {
          child.removeAttribute(a.name);
        }
      });
      scrub(child);
    });
  }

  function sanitize(html) {
    var doc = new DOMParser().parseFromString(String(html), 'text/html');
    scrub(doc.body);
    return doc.body.innerHTML;
  }

  return function (text) {
    if (window.marked && marked.parse) {
      try { return sanitize(marked.parse(text)); } catch (e) { /* fall through */ }
    }
    return '<pre class="md-fallback">' + PGRE.ui.esc(text) + '</pre>';
  };
})();

PGRE.typesetMath = function (el) {
  if (window.renderMathInElement) {
    try {
      renderMathInElement(el, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '\\[', right: '\\]', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false }
        ],
        throwOnError: false,
        ignoredClasses: ['fcard-mnemonic'] // user mnemonics are plain text, never math
      });
    } catch (e) { /* math stays as source text */ }
  }
};

/* Formula-card imports contain prose as well as equations. Existing equations use
   $...$; this prepares the compact symbols in their prose for KaTeX without
   changing general site text or user mnemonics. */
PGRE.formulaTextHTML = function (text) {
  if (text == null || text === '') return '';
  var greek = {
    alpha: '\\alpha', beta: '\\beta', gamma: '\\gamma', delta: '\\delta',
    epsilon: '\\epsilon', theta: '\\theta', lambda: '\\lambda', mu: '\\mu',
    nu: '\\nu', rho: '\\rho', sigma: '\\sigma', tau: '\\tau', phi: '\\phi',
    omega: '\\omega', Omega: '\\Omega'
  };
  var protectedPart = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$[^$]*?\$|<[^>]*>)/g;

  function mathToken(tex) { return '$' + tex + '$'; }
  function plain(part) {
    // Handle named Greek variants first so tau_0 is one mathematical span.
    part = part.replace(/\b(alpha|beta|gamma|delta|epsilon|theta|lambda|mu|nu|rho|sigma|tau|phi|omega|Omega)(?:_([A-Za-z0-9]+|\{[^}]+\})|\^([A-Za-z0-9]+|\{[^}]+\}))?(\/\d+)?\b/g,
      function (_, name, sub, sup, frac) {
        return mathToken(greek[name] + (sub ? '_' + sub : '') + (sup ? '^' + sup : '') + (frac || ''));
      });
    // A subscript/superscript makes a one-letter token unambiguously mathematical.
    part = part.replace(/\b([A-Za-z])(_(?:[A-Za-z0-9]+|\{[^}]+\})|\^(?:[A-Za-z0-9]+|\{[^}]+\}))(\/\d+)?\b/g,
      function (_, base, decoration, frac) { return mathToken(base + decoration + (frac || '')); });
    // These are common standalone physics variables; omit prose words such as a,
    // an, and I so the formula-card prompt remains readable.
    return part.replace(/\b([A-Z]|[txyzvwrmEgFBpq])\b/g,
      function (_, symbol) { return mathToken(symbol); });
  }

  var parts = String(text).split(protectedPart);
  var codeDepth = 0;
  return parts.map(function (part) {
    if (!part) return part;
    if (part.charAt(0) === '<') {
      if (/^<(code|pre)\b/i.test(part)) codeDepth++;
      else if (/^<\/(code|pre)\b/i.test(part) && codeDepth) codeDepth--;
      return part;
    }
    if (/^(?:\$\$[\s\S]*\$\$|\\\[[\s\S]*\\\]|\\\([\s\S]*\\\)|\$[^$]*\$)$/.test(part)) return part;
    return codeDepth ? part : plain(part);
  }).join('');
};

/* ——— Toasts ——— */
PGRE.toast = function (html, kind, sticky) {
  var box = document.getElementById('toasts');
  if (!box) return null;
  var el = document.createElement('div');
  el.className = 'toast toast-' + (kind || 'info');
  el.innerHTML = html;
  box.appendChild(el);
  requestAnimationFrame(function () { el.classList.add('show'); });
  var dismiss = function () {
    el.classList.remove('show');
    setTimeout(function () { el.remove(); }, 350);
  };
  if (sticky) { // stays until clicked — for conditions the user must notice
    el.style.cursor = 'pointer';
    el.title = 'Dismiss';
    el.addEventListener('click', dismiss);
  } else {
    setTimeout(dismiss, 4200);
  }
  return el;
};

/* ——— Post-answer self-assessment (practice sessions + mistake drills) ———
   A multi-select chip row in the feedback block after every answer:
   Knew it / Guessed (mutually exclusive) plus Too slow / Forgot something
   (combine freely with anything). Every tap re-stamps the newest attempt row
   (srs.setLastAssess) and keeps the lucky-guess bookkeeping in sync, so the
   chips stay editable until the next question and a mid-session exit loses
   nothing. Tapping an active chip un-picks it. */
PGRE.assess = (function () {
  var OPTIONS = [
    { key: 'sure',   label: 'Knew it',          kbd: 'K' },
    { key: 'guess',  label: 'Guessed',          kbd: 'G' },
    { key: 'slow',   label: 'Too slow',         kbd: 'T' },
    { key: 'forgot', label: 'Forgot something', kbd: 'F' }
  ];
  var LABELS = {};
  OPTIONS.forEach(function (o) { LABELS[o.key] = o.label; });

  function html(showKeys) {
    var h = '<div class="conf-row assess-row" id="assess-row">' +
      '<span class="conf-q">How did it go?</span>';
    OPTIONS.forEach(function (o) {
      h += '<button type="button" class="focus-chip assess-chip" data-assess="' + o.key +
        '" aria-pressed="false">' + o.label +
        (showKeys ? ' <span class="key-hint">' + o.kbd + '</span>' : '') + '</button>';
    });
    h += '<span class="assess-note muted" id="assess-note">pick any that apply</span></div>';
    return h;
  }

  /* Wire a freshly rendered row for question q. Returns { toggle(key) } so
     keyboard shortcuts drive the exact same path as clicks. */
  function bind(container, q, isCorrect) {
    var row = container.querySelector('#assess-row');
    if (!row) return { toggle: function () {} };
    var on = { sure: false, guess: false, slow: false, forgot: false };
    var luckyFiled = false;

    function paint() {
      row.querySelectorAll('[data-assess]').forEach(function (b) {
        var k = b.getAttribute('data-assess');
        b.classList.toggle('active', !!on[k]);
        b.setAttribute('aria-pressed', on[k] ? 'true' : 'false');
      });
      var note = row.querySelector('#assess-note');
      if (note) {
        note.textContent = luckyFiled
          ? '⚑ filed as a lucky guess in your mistake book'
          : 'pick any that apply';
      }
    }

    function commit() {
      var conf = on.sure ? 'sure' : on.guess ? 'guess' : null;
      var tags = [];
      if (on.slow) tags.push('slow');
      if (on.forgot) tags.push('forgot');
      PGRE.srs.setLastAssess(q.id, conf, tags);
    }

    function toggle(key) {
      if (!(key in on)) return;
      on[key] = !on[key];
      if (key === 'sure' && on.sure) on.guess = false;
      if (key === 'guess' && on.guess) on.sure = false;
      // Lucky-guess bookkeeping applies to correct answers only (a wrong
      // answer already filed a real mistake-book entry when it was recorded).
      if (isCorrect) {
        var luckyChanged = false;
        if (on.guess && !luckyFiled) {
          PGRE.srs.markLucky(q.id); luckyFiled = true; luckyChanged = true;
        } else if (!on.guess && luckyFiled) {
          PGRE.srs.unmarkLucky(q.id); luckyFiled = false; luckyChanged = true;
        }
        if (on.sure) PGRE.srs.clearLucky(q.id); // knew it for real — retire stale flags
        if (luckyChanged) PGRE.refreshNavBadges();
      }
      commit();
      paint();
    }

    row.querySelectorAll('[data-assess]').forEach(function (b) {
      b.addEventListener('click', function () { toggle(b.getAttribute('data-assess')); });
    });

    return { toggle: toggle };
  }

  return { OPTIONS: OPTIONS, LABELS: LABELS, html: html, bind: bind };
})();

/* store.save() failure hook: a sticky warning while progress cannot be
   persisted (storage full or blocked), cleared once a save succeeds again. */
PGRE.persistWarning = (function () {
  var el = null;
  return function (failing) {
    if (failing) {
      if (!el || !el.isConnected) {
        el = PGRE.toast('Saving failed — browser storage may be full. Recent progress ' +
          'is <b>not</b> being recorded. Back up from the Library page, then free up space.',
          'error', true);
      }
    } else {
      if (el && el.isConnected) el.click();
      el = null;
      PGRE.toast('Saving works again — your progress is being recorded.', 'info');
    }
  };
})();

/* ——— Finder-style breadcrumb top bar (BUNDLE G) ———
   A slim bar at the top of #main on every route: ◀ ▶ history arrows (wired at
   boot to history.back()/forward(), always enabled) + a clickable breadcrumb
   trail. route() calls PGRE.nav.route() on every navigation to derive the base
   trail from the current route and repaint the bar; a view may append deeper
   crumbs for an in-view state (formulas "Study" / "Choose new cards", mistakes
   "Drill") via PGRE.nav.setTrail(extra). Those refinements reset naturally on
   the next hashchange because route() rebuilds the base from scratch. */
PGRE.nav = (function () {
  // Human labels for each sidebar route, keyed by the router's view name. These
  // match the sidebar wording exactly (esc'd at paint time).
  var LABELS = {
    plan: 'Study plan', history: 'History', analytics: 'Analytics',
    build: 'Custom quiz', search: 'Search', notes: 'Notes & bookmarks',
    mistakes: 'Mistake book', formulas: 'Formula recall', focus: 'Focus timer',
    studytime: 'Study time', achievements: 'Achievements', library: 'Library',
    exam: 'Mock exam'
  };
  var HREF = {
    plan: '#/plan', history: '#/history', analytics: '#/analytics',
    build: '#/build', search: '#/search', notes: '#/notes',
    mistakes: '#/mistakes', formulas: '#/formulas', focus: '#/focus',
    studytime: '#/study-time', achievements: '#/achievements',
    library: '#/library', exam: '#/exam'
  };

  var base = [{ label: 'Home', href: '#/' }];   // base trail for the active route

  // Render a trail: every crumb except the last is an <a>; the last (current
  // page) is plain text with aria-current. A crumb with no href is never a link.
  function paint(trail) {
    var el = document.getElementById('breadcrumbs');
    if (!el) return;
    // Delegated once on the stable #breadcrumbs container (paint only swaps its
    // innerHTML, so this survives repaints). The in-view deep states — the formula
    // Study session and "Choose new cards" picker (both at #/formulas) and the
    // mistake Drill (at #/mistakes) — are entered WITHOUT a hash change, so an
    // ancestor crumb whose href equals the current hash would assign the same
    // fragment and fire NO hashchange: the router never reruns and the deep state
    // never clears. Detect that exact case and force a re-route, which re-mounts
    // the base view (settling/clearing the deep state) and rebuilds the base trail.
    // Every crumb label is plain esc'd text, so a click's target IS the <a>.
    if (!el._pgreCrumbBound) {
      el._pgreCrumbBound = true;
      el.addEventListener('click', function (e) {
        var a = e.target;
        if (!a || a.tagName !== 'A') return;
        var href = a.getAttribute('href');
        if (href && href.charAt(0) === '#' && href === location.hash) {
          e.preventDefault();
          PGRE.route();
        }
      });
    }
    var ui = PGRE.ui, h = '';
    trail.forEach(function (c, i) {
      var last = i === trail.length - 1;
      if (i) h += '<span class="crumb-sep" aria-hidden="true">▸</span>';
      if (last) {                       // current page — emphasised, never a link
        h += '<span class="crumb crumb-here" aria-current="page">' + ui.esc(c.label) + '</span>';
      } else if (c.href) {              // ancestor with a destination
        h += '<a class="crumb" href="' + c.href + '">' + ui.esc(c.label) + '</a>';
      } else {                          // ancestor with no page (e.g. "All topics")
        h += '<span class="crumb">' + ui.esc(c.label) + '</span>';
      }
    });
    el.innerHTML = h;
  }

  return {
    // Rebuild the base trail from the freshly-routed view + params and paint it.
    // Called by route() on every navigation.
    route: function (view, params) {
      var trail = [{ label: 'Home', href: '#/' }];
      params = params || {};
      if (view === 'dashboard') {
        /* Home alone. */
      } else if (view === 'topic') {
        var t = PGRE.topicById(params.id);
        trail.push({ label: t ? t.name : 'Topic' });
      } else if (view === 'practice') {
        var pt = params.id && params.id !== 'all' ? PGRE.topicById(params.id) : null;
        trail.push(pt ? { label: pt.name, href: '#/topic/' + pt.id }
                      : { label: 'All topics' });
        // sub2 carries the portal's done-status filter (#/practice/<id>/new|done)
        trail.push({ label: params.sub2 === 'new' ? 'Practice · not yet done'
                          : params.sub2 === 'done' ? 'Practice · done before'
                          : 'Practice' });
      } else if (LABELS[view]) {
        trail.push({ label: LABELS[view], href: HREF[view] });
        if (view === 'exam' && params.sub === 'run') trail.push({ label: 'Run' });
        else if (view === 'exam' && params.sub === 'review') trail.push({ label: 'Review' });
      }
      base = trail;
      paint(base);
    },

    // A view appends deeper crumbs for an in-view state. `extra` is an array of
    // label strings (or {label,href} objects); passing [] / nothing resets to
    // the base trail. Kept a one-liner at each view-internal transition.
    setTrail: function (extra) {
      var trail = base.slice();
      (extra || []).forEach(function (c) {
        trail.push(typeof c === 'string' ? { label: c } : c);
      });
      paint(trail);
    }
  };
})();

/* ——— Router ———
   Every view receives the generic sub-path params sub/sub2
   (#/exam/run → sub 'run'; #/exam/review/<id> → sub 'review', sub2 <id>);
   topic and practice additionally keep their id param. */
PGRE.route = function () {
  var hash = location.hash.replace(/^#\/?/, '');
  var parts = hash.split('/').filter(Boolean);
  var view, params = { sub: parts[1] || null, sub2: parts[2] || null };

  if (parts.length === 0) { view = 'dashboard'; }
  else if (parts[0] === 'topic' && parts[1]) { view = 'topic'; params.id = parts[1]; }
  else if (parts[0] === 'practice') { view = 'practice'; params.id = parts[1] || 'all'; }
  else if (parts[0] === 'plan') { view = 'plan'; }
  else if (parts[0] === 'history') { view = 'history'; }
  else if (parts[0] === 'analytics') { view = 'analytics'; }
  else if (parts[0] === 'build') { view = 'build'; }
  else if (parts[0] === 'search') { view = 'search'; }
  else if (parts[0] === 'notes') { view = 'notes'; }
  else if (parts[0] === 'mistakes') { view = 'mistakes'; }
  else if (parts[0] === 'formulas') { view = 'formulas'; }
  else if (parts[0] === 'focus') { view = 'focus'; }
  else if (parts[0] === 'study-time') { view = 'studytime'; }
  else if (parts[0] === 'achievements') { view = 'achievements'; }
  else if (parts[0] === 'library') { view = 'library'; }
  else if (parts[0] === 'exam') { view = 'exam'; }
  else { view = 'dashboard'; }

  var v = PGRE.views[view];
  var main = document.getElementById('view');
  if (!v) { main.innerHTML = '<p>Unknown view.</p>'; return; }

  PGRE.store.rollDay();
  PGRE.nav.route(view, params);   // base breadcrumb trail before the view mounts
  main.innerHTML = v.render(params);
  if (v.mount) v.mount(params);
  main.scrollTop = 0;
  window.scrollTo(0, 0);
  PGRE.setActiveNav(view, params);
  PGRE.refreshNavBadges();
};

/* Due counts on the sidebar (mistakes are synchronous; the formula deck
   loads from IndexedDB, so its badge fills in a beat later). */
PGRE.refreshNavBadges = function () {
  var m = PGRE.srs.dueMistakes().length;
  var el = document.getElementById('nav-mist-due');
  if (el) { el.textContent = m + ' due'; el.hidden = m === 0; }
  PGRE.formulaDeck().then(function (deck) {
    var n = PGRE.srs.formulaDayRemaining(deck).length;
    var el2 = document.getElementById('nav-form-due');
    if (el2) { el2.textContent = n + ' due'; el2.hidden = n === 0; }
  });
};

PGRE.setActiveNav = function (view, params) {
  document.querySelectorAll('#sidebar a[data-nav]').forEach(function (a) {
    var key = a.getAttribute('data-nav');
    var active = key === view || (view === 'topic' && key === 'topic-' + params.id) ||
                 (view === 'practice' && key === 'topic-' + params.id);
    a.classList.toggle('active', active);
  });
};

PGRE.buildNav = function () {
  var g = PGRE.gamify;
  var el = document.getElementById('sidebar-nav');
  var html =
    '<a href="#/" data-nav="dashboard">Dashboard</a>' +
    '<a href="#/plan" data-nav="plan">Study plan</a>' +
    '<a href="#/history" data-nav="history">History</a>' +
    '<a href="#/analytics" data-nav="analytics">Analytics</a>' +
    '<a href="#/build" data-nav="build">Custom quiz</a>' +
    '<a href="#/search" data-nav="search">Search</a>' +
    '<a href="#/notes" data-nav="notes">Notes &amp; bookmarks</a>' +
    '<a href="#/mistakes" data-nav="mistakes">Mistake book' +
      '<span class="nav-badge nav-badge-due" id="nav-mist-due" hidden></span></a>' +
    '<a href="#/formulas" data-nav="formulas">Formula recall' +
      '<span class="nav-badge nav-badge-due" id="nav-form-due" hidden></span></a>' +
    '<a href="#/focus" data-nav="focus">Focus timer</a>' +
    '<a href="#/study-time" data-nav="studytime">Study time</a>' +
    '<a href="#/achievements" data-nav="achievements">Achievements</a>' +
    '<a href="#/library" data-nav="library">Library</a>' +
    '<a href="#/exam" data-nav="exam">Mock exam</a>' +
    '<div class="nav-heading">Knowledge portals</div>';
  PGRE.TOPICS.forEach(function (t) {
    html += '<a href="#/topic/' + t.id + '" data-nav="topic-' + t.id + '">' +
      '<span class="nav-mono">' + t.short + '</span>' + t.name +
      '<span class="nav-weight">' + t.weight + '%</span></a>';
  });
  el.innerHTML = html;
};

/* ——— Foldable sidebar ———
   The ☰ button in the top bar hides/shows #sidebar (body.sidebar-folded, see
   css). Persisted in settings.sidebarFolded so the choice survives reloads. */
PGRE.applySidebar = function (folded) {
  document.body.classList.toggle('sidebar-folded', !!folded);
  var btn = document.getElementById('sidebar-toggle');
  if (btn) {
    var label = folded ? 'Show sidebar' : 'Hide sidebar';
    btn.setAttribute('aria-expanded', folded ? 'false' : 'true');
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
  }
};

PGRE.toggleSidebar = function () {
  var s = PGRE.store.state.settings;
  s.sidebarFolded = !s.sidebarFolded;
  PGRE.store.save();
  PGRE.applySidebar(s.sidebarFolded);
};

/* ——— Theme: 'light' (default) or 'dark', a data-theme layer on <html> ——— */
PGRE.applyTheme = function (t) {
  t = t || 'light';
  document.documentElement.dataset.theme = t;
  var btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = t === 'dark' ? 'Light mode' : 'Dark mode';
};

/* Persist + apply — the sidebar toggle and any settings UI call this. */
PGRE.setTheme = function (t) {
  PGRE.store.state.settings.theme = t;
  PGRE.store.save();
  PGRE.applyTheme(t);
};

/* ——— Boot ——— */
PGRE.boot = function () {
  PGRE.store.load();
  PGRE.applyTheme(PGRE.store.state.settings.theme);
  PGRE.applySidebar(PGRE.store.state.settings.sidebarFolded);
  var sbToggle = document.getElementById('sidebar-toggle');
  if (sbToggle) sbToggle.addEventListener('click', PGRE.toggleSidebar);
  PGRE.buildNav();
  PGRE.studyTime.start();       // passive active-minutes heartbeat
  if (PGRE.timer) PGRE.timer.boot();   // F3 focus timer: resume/credit + wire the top-bar widget
  var toggle = document.getElementById('theme-toggle');
  if (toggle) toggle.addEventListener('click', function () {
    PGRE.setTheme(PGRE.store.state.settings.theme === 'dark' ? 'light' : 'dark');
  });
  // Finder-style history arrows — hash routes ride the browser session history,
  // so back/forward are always meaningful; a no-op click is harmless.
  var tbBack = document.getElementById('topbar-back');
  var tbFwd = document.getElementById('topbar-fwd');
  if (tbBack) tbBack.addEventListener('click', function () { history.back(); });
  if (tbFwd) tbFwd.addEventListener('click', function () { history.forward(); });
  window.addEventListener('hashchange', PGRE.route);
  PGRE.route();                 // first paint never waits on IndexedDB
  PGRE.contentDB.open();        // warm the connection in the background
};

window.addEventListener('unhandledrejection', function (e) {
  console.error('Unhandled rejection:', e.reason);
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', PGRE.boot);
} else {
  PGRE.boot();
}
