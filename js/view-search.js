/* Search view (#/search) — one box across the whole studio. Autofocused,
   debounced input; ≥2 characters run a query against PGRE.search's in-memory
   index, grouped by kind with per-group counts and highlighted snippets. An
   empty box shows this session's recent searches and an index-stats card.
   The index (PGRE.search) is built lazily on first mount and cached for the
   page load; recent searches live only in this module's memory. */
window.PGRE = window.PGRE || {};
PGRE.views = PGRE.views || {};

PGRE.views.search = (function () {
  var MIN = 2;          // characters before a query runs
  var PER_GROUP = 40;   // hits rendered per group (the count is still reported in full)
  var recent = [];      // this-session recent searches, newest first (memory-only)
  var idx = null;       // the built index, once ready

  /* The matching engine lives in js/search.js. index.html script-tags this
     view (the router needs it) but not the engine, so we lazy-load the engine
     on first mount — which also honours "build the index only on first use".
     Injecting a <script> keeps the no-build, fully-offline contract. */
  function ensureEngine() {
    if (window.PGRE && PGRE.search) return Promise.resolve();
    if (ensureEngine._p) return ensureEngine._p;
    ensureEngine._p = new Promise(function (resolve) {
      var s = document.createElement('script');
      s.src = 'js/search.js';
      s.onload = function () { resolve(); };
      s.onerror = function () { resolve(); };   // resolve anyway; mount() guards
      document.head.appendChild(s);
    });
    return ensureEngine._p;
  }

  function esc(s) { return PGRE.ui.esc(s); }

  function pushRecent(q) {
    q = String(q || '').trim();
    if (q.length < MIN) return;
    recent = recent.filter(function (r) { return r.toLowerCase() !== q.toLowerCase(); });
    recent.unshift(q);
    if (recent.length > 8) recent.length = 8;
  }

  function monoHtml(topic) {
    var t = topic ? PGRE.topicById(topic) : null;
    return t ? PGRE.ui.monogram(t) : '';
  }

  function hitHtml(h) {
    var e = h.entry;
    return '<a class="srch-hit" href="' + esc(e.href) + '">' +
        '<span class="srch-hit-mono">' + monoHtml(e.topic) + '</span>' +
        '<span class="srch-hit-body">' +
          '<span class="srch-hit-title">' + esc(e.title || '(untitled)') + '</span>' +
          '<span class="srch-hit-snip">' + h.snippet + '</span>' +
        '</span>' +
      '</a>';
  }

  function groupsHtml(hits) {
    var byKind = {};
    hits.forEach(function (h) {
      (byKind[h.entry.kind] = byKind[h.entry.kind] || []).push(h);
    });
    var html = '';
    PGRE.search.KINDS.forEach(function (k) {
      var list = byKind[k.key];
      if (!list || !list.length) return;
      html += '<div class="srch-group"><div class="srch-group-head">' +
        '<h2>' + k.label + '</h2><span class="srch-count">' + list.length + '</span></div>';
      list.slice(0, PER_GROUP).forEach(function (h) { html += hitHtml(h); });
      if (list.length > PER_GROUP) {
        html += '<p class="muted srch-more">+' + (list.length - PER_GROUP) +
          ' more — refine your search to narrow these down.</p>';
      }
      html += '</div>';
    });
    return html;
  }

  function statsHtml() {
    if (!idx) return '';
    var s = PGRE.search.stats(idx);
    var tiles = '';
    PGRE.search.KINDS.forEach(function (k) {
      tiles += '<div class="srch-stat"><div class="srch-stat-val">' +
        PGRE.ui.fmt(s.byKind[k.key] || 0) + '</div><div class="srch-stat-lab">' +
        k.label + '</div></div>';
    });
    return '<div class="card srch-statcard"><h2>What’s searchable</h2>' +
      '<p class="muted">' + PGRE.ui.fmt(s.total) + ' item' + (s.total === 1 ? '' : 's') +
      ' indexed this session — questions, the mistake book, formula cards, imported ' +
      'book sections and your notes. The index rebuilds on every page load.</p>' +
      '<div class="srch-stats">' + tiles + '</div></div>';
  }

  function recentHtml() {
    if (!recent.length) return '';
    var chips = recent.map(function (r) {
      return '<button class="srch-chip" data-q="' + esc(r) + '">' + esc(r) + '</button>';
    }).join('');
    return '<div class="card srch-recentcard"><h2>Recent searches</h2>' +
      '<div class="srch-recent">' + chips + '</div></div>';
  }

  function results() { return document.getElementById('srch-results'); }
  function statusEl() { return document.getElementById('srch-status'); }

  function renderEmpty() {
    statusEl().textContent = '';
    results().innerHTML = recentHtml() + statsHtml() +
      (idx ? '' : '<div class="card"><p class="muted">Building the search index…</p></div>');
    wireRecent();
  }

  function renderResults(q) {
    var r = PGRE.search.match(idx, q);
    if (!r.total) {
      results().innerHTML = '<div class="card srch-empty"><p><strong>No matches for “' +
        esc(q) + '”.</strong></p><p class="muted">Try fewer or different words — ' +
        'every word must appear for a result to match.</p></div>';
    } else {
      results().innerHTML = groupsHtml(r.hits);
    }
    statusEl().textContent = PGRE.ui.fmt(r.total) + ' result' + (r.total === 1 ? '' : 's') +
      ' · ' + (r.ms < 10 ? r.ms.toFixed(1) : Math.round(r.ms)) + ' ms';
  }

  function run(q) {
    q = String(q || '');
    if (q.trim().length < MIN) { renderEmpty(); return; }
    if (!idx) { statusEl().textContent = 'Building index…'; return; }
    renderResults(q.trim());
  }

  function wireRecent() {
    results().querySelectorAll('.srch-chip').forEach(function (b) {
      b.addEventListener('click', function () {
        var q = b.getAttribute('data-q');
        var input = document.getElementById('srch-input');
        input.value = q;
        input.focus();
        run(q);
      });
    });
  }

  return {
    render: function () {
      return '<div class="srch-wrap">' +
        '<div class="card srch-box">' +
          '<h1>Search</h1>' +
          '<p class="muted">One box across questions, solutions, the mistake book, ' +
          'formula cards, imported book sections and your notes.</p>' +
          '<input type="search" id="srch-input" class="srch-input" autofocus ' +
            'autocomplete="off" spellcheck="false" ' +
            'placeholder="Search everything… (e.g. Carnot efficiency)">' +
          '<div id="srch-status" class="srch-status muted" aria-live="polite"></div>' +
        '</div>' +
        '<div id="srch-results"></div>' +
      '</div>';
    },

    mount: function () {
      idx = null;
      var input = document.getElementById('srch-input');
      var timer = null;

      renderEmpty();   // recents + a "building…" note while the index warms up

      ensureEngine().then(function () {
        if (!window.PGRE || !PGRE.search) {
          results().innerHTML = '<div class="card"><p class="muted">Search is ' +
            'unavailable — the index engine failed to load.</p></div>';
          return;
        }
        return PGRE.search.buildIndex().then(function (built) {
          idx = built;
          run(input.value);   // re-render for whatever is in the box now
        });
      });

      input.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(function () { run(input.value); }, 200);
      });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          clearTimeout(timer);
          pushRecent(input.value);
          run(input.value);
        }
      });
      // remember the query behind any result the user follows
      results().addEventListener('mousedown', function (e) {
        if (e.target.closest && e.target.closest('.srch-hit')) pushRecent(input.value);
      });

      input.focus();
    }
  };
})();
