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

/* ——— Markdown + math rendering (vendored, fully offline) ——— */
PGRE.renderMarkdown = function (text) {
  if (window.marked && marked.parse) {
    try { return marked.parse(text); } catch (e) { /* fall through */ }
  }
  return '<pre class="md-fallback">' + PGRE.ui.esc(text) + '</pre>';
};

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
        throwOnError: false
      });
    } catch (e) { /* math stays as source text */ }
  }
};

/* ——— Toasts ——— */
PGRE.toast = function (html, kind) {
  var box = document.getElementById('toasts');
  if (!box) return;
  var el = document.createElement('div');
  el.className = 'toast toast-' + (kind || 'info');
  el.innerHTML = html;
  box.appendChild(el);
  requestAnimationFrame(function () { el.classList.add('show'); });
  setTimeout(function () {
    el.classList.remove('show');
    setTimeout(function () { el.remove(); }, 350);
  }, 4200);
};

/* ——— Router ——— */
PGRE.route = function () {
  var hash = location.hash.replace(/^#\/?/, '');
  var parts = hash.split('/').filter(Boolean);
  var view, params = {};

  if (parts.length === 0) { view = 'dashboard'; }
  else if (parts[0] === 'topic' && parts[1]) { view = 'topic'; params.id = parts[1]; }
  else if (parts[0] === 'practice') { view = 'practice'; params.id = parts[1] || 'all'; }
  else if (parts[0] === 'plan') { view = 'plan'; }
  else if (parts[0] === 'history') { view = 'history'; }
  else if (parts[0] === 'mistakes') { view = 'mistakes'; }
  else if (parts[0] === 'formulas') { view = 'formulas'; }
  else if (parts[0] === 'achievements') { view = 'achievements'; }
  else if (parts[0] === 'library') { view = 'library'; }
  else if (parts[0] === 'exam') { view = 'exam'; }
  else { view = 'dashboard'; }

  var v = PGRE.views[view];
  var main = document.getElementById('view');
  if (!v) { main.innerHTML = '<p>Unknown view.</p>'; return; }

  PGRE.store.rollDay();
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
    var n = PGRE.srs.dueDeck(deck).length;
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
    '<a href="#/mistakes" data-nav="mistakes">Mistake book' +
      '<span class="nav-badge nav-badge-due" id="nav-mist-due" hidden></span></a>' +
    '<a href="#/formulas" data-nav="formulas">Formula recall' +
      '<span class="nav-badge nav-badge-due" id="nav-form-due" hidden></span></a>' +
    '<a href="#/achievements" data-nav="achievements">Achievements</a>' +
    '<a href="#/library" data-nav="library">Library</a>' +
    '<a href="#/exam" data-nav="exam">Mock exam <span class="nav-badge">soon</span></a>' +
    '<div class="nav-heading">Knowledge portals</div>';
  PGRE.TOPICS.forEach(function (t) {
    html += '<a href="#/topic/' + t.id + '" data-nav="topic-' + t.id + '">' +
      '<span class="nav-mono">' + t.short + '</span>' + t.name +
      '<span class="nav-weight">' + t.weight + '%</span></a>';
  });
  el.innerHTML = html;
};

/* ——— Boot ——— */
PGRE.boot = function () {
  PGRE.store.load();
  PGRE.buildNav();
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
