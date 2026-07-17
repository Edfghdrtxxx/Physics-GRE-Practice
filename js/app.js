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
        trail.push({ label: 'Practice' });
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
  PGRE.buildNav();
  PGRE.studyTime.start();       // passive active-minutes heartbeat
  if (PGRE.timer) PGRE.timer.boot();   // F3 focus timer: resume/credit + wire the sidebar widget
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
