/* Sidebar search (PGRE.sidebarSearch) — the box under the brand, usable from
   every page. Typing drops a results panel in place: the Studio's own pages
   first, then the groups of the full search page (#/search), each cut to a few
   rows, and a last row that opens #/search with the same query.

   There is no second engine. Matching, ranking and the highlighted snippets
   all come from PGRE.search (js/search.js), loaded through the search view's
   one inject site on first use, so page load pays nothing. The Pages group is
   a second small index (the destinations PGRE.buildNav paints) run through the
   same PGRE.search.match. A row shows the engine's title and snippet and
   nothing else.

   Sealed exam questions (AGENTS.md, spoiler protection) get less than that.
   #/search is a page the user opens on purpose; this box is on every page. So
   an entry that shows a real-exam question is matched and shown by its title
   alone, and is not shown at all while a practice set or a mistake drill is on
   screen or a mock exam is unfinished (see isSealed and sessionRunning).

   One field, two homes. While the sidebar is on screen the field sits in it
   and the panel hangs under it. With the sidebar folded (or, below 860px, the
   drawer closed) a search button in the top bar opens the same panel and the
   field moves into its head.

   Choosing a result or pressing Escape empties the box; a press elsewhere
   closes the panel and keeps what was typed. Nothing here is persisted. */
window.PGRE = window.PGRE || {};

PGRE.sidebarSearch = (function () {
  var MIN = 2;          // characters before a query runs (as #/search)
  var DEBOUNCE = 150;   // ms between the last keystroke and the match
  var PER_GROUP = 4;    // rows per group; the group count still reports every hit
  var MAC = /Mac|iPhone|iPad/.test(navigator.platform || '');
  var KEYS = MAC ? '⌘K' : 'Ctrl K';
  // the glyph for a row whose entry has no topic to draw a monogram from
  var KIND_ICON = { question: 'play', exam: 'stopwatch', mistake: 'mistake',
                    formula: 'cards', book: 'folder', note: 'note' };
  var X_ICON = '<svg class="sbs-x" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M6 6l12 12M18 6L6 18"/></svg>';

  var pages = [];        // index entries for the sidebar destinations
  var idx = null;        // PGRE.search's index, once built, less its sealed entries
  var sealed = [];       // those sealed entries, cut down to their titles
  var warming = false;   // an index build is in flight
  var failed = false;    // the engine script did not load
  var el = null;         // the nodes built by build()
  var rows = [];         // the options on screen, in keyboard order
  var active = -1;
  var shownFor = null;   // the query the rows on screen answer
  var timer = null;
  var isOpen = false;
  var inPanel = false;   // the field is docked in the panel head
  var moving = false;    // the field is changing homes: its focus loss is not a close
  var returnTo = null;   // where focus goes back to on Escape

  function esc(s) { return PGRE.ui.esc(s); }
  function icon(name) { return PGRE.sidebarIcon ? PGRE.sidebarIcon(name) : ''; }

  /* An entry in the engine's own shape, so PGRE.search.match can rank it and
     mark the match. `where` is the quiet word at the row's right edge: the
     sidebar group of a destination, the portal of a subtopic. */
  function pageEntry(href, title, where, iconName, topicId) {
    return {
      kind: 'page', id: href, title: title, body: '', href: href,
      topic: topicId || null, icon: iconName || null, where: where,
      text: title, hay: title.toLowerCase()
    };
  }

  function build() {
    var sidebar = document.getElementById('sidebar');
    var nav = document.getElementById('sidebar-nav');
    var toggle = document.getElementById('sidebar-toggle');
    if (!sidebar || !nav) return false;

    var slot = document.createElement('div');
    slot.className = 'sbs';
    slot.setAttribute('role', 'search');
    slot.innerHTML = '<div class="sbs-field">' + icon('search') +
      '<input class="sbs-input" id="sbs-input" type="text" role="combobox" ' +
        'aria-label="Search the studio" aria-autocomplete="list" aria-expanded="false" ' +
        'aria-controls="sbs-list" autocomplete="off" autocapitalize="off" ' +
        'spellcheck="false" enterkeyhint="search" placeholder="Search">' +
      '<span class="key-hint sbs-kbd" aria-hidden="true">' + KEYS + '</span>' +
      '<button class="sbs-clear" type="button" aria-label="Clear search" hidden>' +
        X_ICON + '</button>' +
      '</div>';
    sidebar.insertBefore(slot, nav);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'sbs-open';
    btn.className = 'topbar-arrow sbs-open';
    btn.title = 'Search (' + KEYS + ')';
    btn.setAttribute('aria-label', 'Search');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'sbs-panel');
    btn.innerHTML = icon('search');
    if (toggle && toggle.parentNode) toggle.parentNode.insertBefore(btn, toggle.nextSibling);

    var panel = document.createElement('div');
    panel.id = 'sbs-panel';
    panel.className = 'sbs-panel';
    panel.hidden = true;
    panel.innerHTML = '<div class="sbs-head" hidden></div>' +
      '<div class="sbs-note"></div>' +
      '<div class="sbs-results" id="sbs-list" role="listbox" aria-label="Search results" hidden>' +
        '<div class="sbs-scroll"></div><div class="sbs-all"></div></div>' +
      '<div class="sbs-keys" aria-hidden="true">' +
        '<span class="key-hint">↑</span><span class="key-hint">↓</span> move' +
        '<span class="sbs-dot">·</span><span class="key-hint">Enter</span> open' +
        '<span class="sbs-dot">·</span><span class="key-hint">Esc</span> clear</div>' +
      '<div class="sbs-status" role="status" aria-live="polite"></div>';
    document.body.appendChild(panel);

    el = {
      slot: slot, field: slot.firstChild, btn: btn, panel: panel,
      input: slot.querySelector('.sbs-input'), clear: slot.querySelector('.sbs-clear'),
      head: panel.querySelector('.sbs-head'), note: panel.querySelector('.sbs-note'),
      results: panel.querySelector('.sbs-results'), scroll: panel.querySelector('.sbs-scroll'),
      all: panel.querySelector('.sbs-all'), status: panel.querySelector('.sbs-status')
    };
    wire();
    return true;
  }

  /* ——— Where the field lives and where the panel hangs ——— */

  /* Read from the shell's own state, not from computed style: #sidebar fades
     out over .35s before its display flips (css/style.css, zen block), so a
     shortcut pressed right after folding would still measure it as shown. */
  function sidebarShown() {
    var body = document.body.classList;
    if (body.contains('sidebar-folded') || body.contains('exam-fullscreen') ||
        body.contains('focus-zen')) return false;
    var sb = document.getElementById('sidebar');
    return !!sb && !sb.hasAttribute('inert');   // inert: the narrow drawer is closed
  }

  function dock(toPanel) {
    if (toPanel === inPanel) return;
    moving = true;
    (toPanel ? el.head : el.slot).appendChild(el.field);
    moving = false;
    inPanel = toPanel;
    el.head.hidden = !toPanel;
  }

  function place() {
    var a = (inPanel ? el.btn : el.field).getBoundingClientRect();
    var vw = document.documentElement.clientWidth;
    var left = Math.max(12, Math.min(a.left, vw - el.panel.offsetWidth - 12));
    var top = a.bottom + 6;
    el.panel.style.left = left + 'px';
    el.panel.style.top = top + 'px';
    el.panel.style.setProperty('--sbs-room', Math.max(180, window.innerHeight - top - 12) + 'px');
  }

  function open() {
    if (isOpen) return;
    isOpen = true;
    dock(!sidebarShown());
    el.panel.hidden = false;
    place();
    el.input.setAttribute('aria-expanded', 'true');
    el.btn.setAttribute('aria-expanded', 'true');
    shownFor = null;   // a reopened box starts from its first row, kept query or not
    warm();
    run();
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    clearTimeout(timer);
    el.panel.hidden = true;
    el.input.setAttribute('aria-expanded', 'false');
    el.input.removeAttribute('aria-activedescendant');
    el.btn.setAttribute('aria-expanded', 'false');
    dock(false);
    returnTo = null;
  }

  /* ——— The index: built on first use, refreshed on every later open ———
     The old index keeps answering while the fresh one builds, so a reopened
     box never waits, and a note or mistake made a minute ago still shows up. */
  function warm() {
    if (warming || failed) return;
    var view = PGRE.views && PGRE.views.search;
    if (!view || !view.ensureEngine) { failed = true; return; }
    warming = true;
    view.ensureEngine().then(function () {
      if (!PGRE.search) { failed = true; return null; }
      PGRE.search.invalidate();
      return PGRE.search.buildIndex();
    }).then(function (built) {
      warming = false;
      if (built) take(built);
      if (isOpen) run();
    }, function () {
      warming = false;
      failed = true;
      if (isOpen) run();
    });
  }

  /* ——— Sealed exam questions ———
     An entry is sealed when it shows a question from a real exam (src
     'cpg-exam' or 'ets-exam'): the question itself, or a mistake or a note
     that belongs to one. Its body holds the choices, the solution, the wrong
     picks or the stem, so the box keeps a copy with the title only: a query
     cannot find it through its answer, and no snippet can show one. */
  function isSealed(e) {
    if (e.kind === 'exam') return true;
    if (e.kind !== 'mistake' && e.kind !== 'note') return false;
    var q = PGRE.questionById(e.id);
    return !!q && (q.src === 'cpg-exam' || q.src === 'ets-exam');
  }

  function take(built) {
    idx = built.filter(function (e) { return !isSealed(e); });
    sealed = built.filter(isSealed).map(function (e) {
      return { kind: e.kind, id: e.id, title: e.title, body: '', topic: e.topic, href: e.href,
               text: e.title, hay: e.title.toLowerCase() };
    });
  }

  /* A practice set or a mistake drill is on screen, or a mock exam is not yet
     submitted (in its room, or left unfinished). A set the user has left is
     paused (its question clock restarts on return), so it does not count. */
  function sessionRunning() {
    if (/^#\/(practice|mistakes\/drill|exam\/run)/.test(location.hash)) return true;
    return !!(PGRE.examEngine && PGRE.examEngine.active());
  }

  /* ——— Rendering ——— */

  function setActive(i, scroll) {
    if (rows[active]) rows[active].setAttribute('aria-selected', 'false');
    active = rows[i] ? i : -1;
    if (active === -1) { el.input.removeAttribute('aria-activedescendant'); return; }
    rows[active].setAttribute('aria-selected', 'true');
    el.input.setAttribute('aria-activedescendant', rows[active].id);
    if (!scroll) return;
    if (active === 0) el.scroll.scrollTop = 0;   // bring the first group's heading back too
    else rows[active].scrollIntoView({ block: 'nearest' });
  }

  function note(title, body) {
    el.note.innerHTML = '<p class="sbs-note-title">' + title + '</p>' +
      (body ? '<p class="sbs-note-body">' + body + '</p>' : '');
    el.note.hidden = false;
    el.results.hidden = true;
    el.status.textContent = '';
    setActive(-1);
    rows = [];
    shownFor = null;
  }

  /* The engine cuts each snippet from `title — body`. A snippet with no
     leading ellipsis starts at the title, so it stands in for the title line;
     otherwise the match lies deeper and the title goes above it. */
  function rowHtml(h, i) {
    var e = h.entry;
    var topic = e.topic ? PGRE.topicById(e.topic) : null;
    var lead = e.icon ? icon(e.icon)
      : topic ? '<span class="sbs-mono">' + esc(topic.short) + '</span>'
      : icon(KIND_ICON[e.kind]);
    var deep = h.snippet.charAt(0) === '…';
    return '<a class="sbs-row" role="option" id="sbs-opt-' + i + '" tabindex="-1" ' +
        'aria-selected="false" href="' + esc(e.href) + '">' +
      '<span class="sbs-lead">' + lead + '</span>' +
      '<span class="sbs-text">' +
        (deep
          ? '<span class="sbs-title">' + esc(e.title || '(untitled)') + '</span>' +
            '<span class="sbs-snip">' + h.snippet + '</span>'
          : '<span class="sbs-title sbs-title-hit">' + h.snippet + '</span>') +
      '</span>' +
      (e.where ? '<span class="sbs-meta">' + esc(e.where) + '</span>' : '') +
      '</a>';
  }

  function renderResults(q) {
    var pageHits = PGRE.search.match(pages, q).hits;
    var hits = PGRE.search.match(idx, q).hits;
    if (!sessionRunning()) hits = hits.concat(PGRE.search.match(sealed, q).hits);
    if (!pageHits.length && !hits.length) {
      note('No matches for “' + esc(q) + '”.',
        'Try fewer or different words — every word must appear for a result to match.');
      el.status.textContent = 'No matches';
      return;
    }
    var byKind = { page: pageHits };
    hits.forEach(function (h) {
      (byKind[h.entry.kind] = byKind[h.entry.kind] || []).push(h);
    });
    var html = '', n = 0;
    [{ key: 'page', label: 'Pages' }].concat(PGRE.search.KINDS).forEach(function (k) {
      var list = byKind[k.key];
      if (!list || !list.length) return;
      html += '<div class="sbs-group" role="group" aria-labelledby="sbs-g-' + k.key + '">' +
        '<div class="sbs-group-head" id="sbs-g-' + k.key + '"><span>' + k.label + '</span>' +
        '<span class="sbs-count">' + PGRE.ui.fmt(list.length) + '</span></div>';
      list.slice(0, PER_GROUP).forEach(function (h) { html += rowHtml(h, n++); });
      html += '</div>';
    });
    el.scroll.innerHTML = html;
    // the Search page does not list pages: with page hits only it would open on "No matches"
    el.all.hidden = !hits.length;
    el.all.innerHTML = !hits.length ? '' :
      '<a class="sbs-row sbs-row-all" role="option" id="sbs-opt-' + n +
        '" tabindex="-1" aria-selected="false" href="#/search/' + encodeURIComponent(q) + '">' +
      '<span class="sbs-lead">' + icon('search') + '</span>' +
      '<span class="sbs-text"><span class="sbs-title">Open “' + esc(q) +
        '” on the Search page</span></span>' +
      '<span class="sbs-meta">' + PGRE.ui.fmt(hits.length) + ' result' +
        (hits.length === 1 ? '' : 's') + '</span>' +
      '</a>';
    el.note.hidden = true;
    el.results.hidden = false;
    var total = pageHits.length + hits.length;
    el.status.textContent = PGRE.ui.fmt(total) + ' result' + (total === 1 ? '' : 's');
    rows = Array.prototype.slice.call(el.results.querySelectorAll('.sbs-row'));
    // a refreshed index repaints the same query: the highlighted row keeps its place
    var keep = q === shownFor ? Math.min(active, rows.length - 1) : 0;
    shownFor = q;
    active = -1;
    setActive(Math.max(0, keep), true);
  }

  function run() {
    var q = el.input.value.trim();
    el.clear.hidden = !el.input.value;
    el.field.classList.toggle('has-value', !!el.input.value);
    if (q.length < MIN) {
      note('Search the studio', 'Questions, the mistake book, formula cards, book sections, ' +
        'notes and pages. Type two or more characters.');
    } else if (failed) {
      note('Search is unavailable — the index engine failed to load.');
    } else if (!idx) {
      note('Building the search index…');
    } else {
      renderResults(q);
    }
  }

  /* ——— Acting on a result ——— */

  /* A result was chosen. The query has done its work, so the box goes back to
     rest (left in place it would read as a filter on every later page; a press
     outside, which chooses nothing, keeps it). Then hand the keyboard to the
     page: a view's own keys ignore events that come from an input. */
  function leave() {
    close();
    clear();
    var main = document.getElementById('main');
    if (main && main.focus) main.focus({ preventScroll: true });
    else el.input.blur();
  }

  function openActive() {
    var row = rows[active];
    if (!row) return;
    var href = row.getAttribute('href');
    leave();
    if (location.hash !== href) location.hash = href;
  }

  function clear() {
    el.input.value = '';
    clearTimeout(timer);
    if (isOpen) run();
    else {
      el.clear.hidden = true;
      el.field.classList.remove('has-value');
    }
  }

  function dismiss() {
    var back = returnTo;
    clear();
    close();
    if (back && back.isConnected && back.focus && back !== document.body) back.focus();
    else el.input.blur();
  }

  /* ——— Keys ——— */

  function typing(t) {
    return !!t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || '') || t.isContentEditable);
  }

  /* A clock is running on an answer, or the shell is off screen: the mock-exam
     room and focus zen hide the sidebar and the top bar; a practice or
     mistake-drill question with Confirm still up is being timed; Match runs a
     stopwatch; a dialog owns the keyboard. The shortcut stays out of all of
     them. (The box itself still answers a click wherever it is on screen.) */
  function timedFlow() {
    var body = document.body.classList;
    if (body.contains('exam-fullscreen') || body.contains('focus-zen')) return true;
    return !!document.querySelector('#practice-root #confirm-btn, #mistakes-root #confirm-btn, ' +
      '#flash-timer, #viz-modal-backdrop, [aria-modal="true"]');
  }

  function focusBox() {
    var from = document.activeElement;
    if (from !== el.input) returnTo = from;
    open();
    el.input.focus();
    el.input.select();
  }

  /* "/" and Cmd+K. Off the Mac the chord is Ctrl+K; on the Mac Ctrl+K stays the
     text-editing key it is. Neither fires while the user types in a field.
     Recall's Search tab owns "/" for its own box (js/view-formulas.js), so it
     is left alone there. */
  function onShortcut(e) {
    var chord = (MAC ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey) &&
      !e.altKey && !e.shiftKey && (e.key === 'k' || e.key === 'K');
    var slash = e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey;
    if (!chord && !slash) return;
    if (e.target === el.input) {
      if (chord) e.preventDefault();   // already here; keep the browser's own Ctrl+K out
      return;
    }
    if (e.defaultPrevented || typing(e.target)) return;
    if (slash && document.getElementById('fs-input')) return;
    if (timedFlow()) return;
    e.preventDefault();
    focusBox();
  }

  function onInputKey(e) {
    if (e.isComposing) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) { open(); return; }
      if (!rows.length) return;
      var step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((active + step + rows.length) % rows.length, true);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!isOpen) { open(); return; }
      clearTimeout(timer);
      run();                           // a fast Enter must not act on stale rows
      openActive();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();             // the narrow drawer closes on its own, later Escape
      dismiss();
    }
  }

  function wire() {
    el.input.addEventListener('focus', open);
    el.input.addEventListener('input', function () {
      el.clear.hidden = !el.input.value;
      el.field.classList.toggle('has-value', !!el.input.value);
      if (!isOpen) open();
      clearTimeout(timer);
      timer = setTimeout(run, DEBOUNCE);
    });
    el.input.addEventListener('keydown', onInputKey);
    // focus leaving the field for anything but the panel closes it; the query stays
    el.field.addEventListener('focusout', function (e) {
      if (moving) return;
      var to = e.relatedTarget;
      if (to && (el.field.contains(to) || el.panel.contains(to))) return;
      close();
    });
    // the icon and the padding are part of the box
    el.field.addEventListener('mousedown', function (e) {
      if (e.target === el.input || el.clear.contains(e.target)) return;
      e.preventDefault();
      el.input.focus();
    });
    el.clear.addEventListener('mousedown', function (e) { e.preventDefault(); });
    el.clear.addEventListener('click', function () { clear(); el.input.focus(); });

    // a press on the panel must not take focus from the field (that would close it)
    el.panel.addEventListener('mousedown', function (e) {
      if (!el.field.contains(e.target)) e.preventDefault();
    });
    // the pointer and the arrow keys share one highlighted row
    el.panel.addEventListener('mousemove', function (e) {
      var row = e.target.closest ? e.target.closest('.sbs-row') : null;
      var i = row ? rows.indexOf(row) : -1;
      if (i !== -1 && i !== active) setActive(i, false);
    });
    el.panel.addEventListener('click', function (e) {
      var row = e.target.closest ? e.target.closest('.sbs-row') : null;
      if (!row) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;   // a new tab: the panel stays
      leave();                                            // the link itself navigates
    });

    el.btn.addEventListener('mousedown', function (e) { e.preventDefault(); });
    el.btn.addEventListener('click', function () {
      if (isOpen) { close(); el.btn.focus(); return; }
      returnTo = el.btn;
      open();
      el.input.focus();
      el.input.select();
    });

    // a press anywhere else closes it (focusout alone misses browsers where a
    // clicked button takes no focus)
    document.addEventListener('mousedown', function (e) {
      if (!isOpen) return;
      var t = e.target;
      if (el.field.contains(t) || el.panel.contains(t) || el.btn.contains(t)) return;
      close();
    }, true);

    document.addEventListener('keydown', onShortcut);
    window.addEventListener('hashchange', close);
    window.addEventListener('resize', function () {
      if (!isOpen) return;
      if (sidebarShown() === inPanel) close();   // the layout changed under the panel
      else place();
    });
  }

  return {
    /* Called by PGRE.buildNav with the destinations it has just painted, so
       the Pages group can never drift from the sidebar. Every knowledge portal
       is a page, and each of its subtopics leads to it (the portal lists them).
       Equal scores keep this order: destinations, portals, then subtopics. */
    mount: function (items, groupLabels) {
      var box = document.createElement('span');   // buildNav's labels are HTML (`&amp;`)
      pages = [];
      Object.keys(items || {}).forEach(function (g) {
        items[g].forEach(function (it) {
          box.innerHTML = it.label;
          pages.push(pageEntry(it.href, box.textContent, groupLabels[g], it.icon, null));
        });
      });
      var topics = PGRE.TOPICS || [];
      topics.forEach(function (t) {
        pages.push(pageEntry('#/topic/' + t.id, t.name, groupLabels.topics, null, t.id));
      });
      topics.forEach(function (t) {
        (t.subtopics || []).forEach(function (st) {
          pages.push(pageEntry('#/topic/' + t.id, st, t.name, null, t.id));
        });
      });
      if (!el) build();
    }
  };
})();
