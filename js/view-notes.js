/* Notes & bookmarks browser (#/notes) — every question you starred or
   annotated during practice, newest first. Rows carry an inline autosaving
   note, a bookmark toggle, a reveal-answer expander and quick links back into
   practice / the mistake book. The write path (the note field and star inside
   practice feedback) lives in the practice view; this page owns the browse
   side and the query internals in js/notes.js. Orphan safety: an id no longer
   in PGRE.questionById (its bank not imported yet) renders as a placeholder
   instead of crashing. */
window.PGRE = window.PGRE || {};
PGRE.views = PGRE.views || {};

PGRE.views.notes = (function () {
  var LETTERS = ['A', 'B', 'C', 'D', 'E'];
  var ui;
  var state;                 // { filter, topic, text }
  var saveTimers;            // qid -> debounce timeout id
  var searchTimer;           // text-filter debounce (matches view-search's 200 ms)

  function root() { return document.getElementById('notes-root'); }
  function listEl() { return document.getElementById('nb-list'); }
  function orphanMono() { return '<span class="mono nb-mono-q" aria-hidden="true">?</span>'; }

  /* ——— Shell: intro + stat tiles (persist across list re-renders) ——— */
  function build() {
    var c = PGRE.notes.counts();
    root().innerHTML =
      '<div class="card nb-intro"><h1>Notes &amp; bookmarks</h1>' +
        '<p class="muted">Everything you have starred or annotated while practicing, most recently ' +
          'updated first. Notes save as you type — clearing one removes it.</p></div>' +
      '<div class="nb-stats">' +
        ui.statTile('Notes', '<span id="nb-count-notes">' + c.notes + '</span>') +
        ui.statTile('Bookmarks', '<span id="nb-count-bm">' + c.bookmarks + '</span>') +
      '</div>' +
      '<div id="nb-body"></div>';
    renderBody();
  }

  /* Empty vs populated: the filter bar only appears once there's something to
     filter. Called on mount and on the rare empty<->populated transition. */
  function renderBody() {
    var c = PGRE.notes.counts();
    var body = document.getElementById('nb-body');
    if (c.notes === 0 && c.bookmarks === 0) {
      body.innerHTML =
        '<div class="card placeholder nb-empty">' +
          '<p><strong>No notes or bookmarks yet.</strong></p>' +
          '<p class="muted">While you practice, tap the ☆ on a question to bookmark it, or jot a ' +
            'note in the feedback panel. They gather here — searchable, editable, and one tap from a re-drill.</p>' +
          '<div class="btn-row"><a class="btn btn-primary" href="#/practice/all">Start practicing</a></div>' +
        '</div>';
      return;
    }
    body.innerHTML = filterBar() + '<div id="nb-list"></div>';
    attachControlHandlers();
    renderList();
  }

  function filterBar() {
    var segs = [['all', 'All'], ['notes', 'Notes'], ['bookmarks', 'Bookmarks']];
    var seg = '<div class="filter-row nb-segs">';
    segs.forEach(function (s) {
      seg += '<button class="filter-btn' + (state.filter === s[0] ? ' active' : '') +
             '" data-filter="' + s[0] + '">' + s[1] + '</button>';
    });
    seg += '</div>';

    var opts = '<option value="all">All topics</option>';
    PGRE.TOPICS.forEach(function (t) {
      opts += '<option value="' + t.id + '"' + (state.topic === t.id ? ' selected' : '') +
              '>' + ui.esc(t.name) + '</option>';
    });

    return '<div class="nb-filterbar">' + seg +
      '<div class="nb-filter-right">' +
        '<select class="hist-select nb-topic" id="nb-topic" aria-label="Filter by topic">' + opts + '</select>' +
        '<input class="nb-search" id="nb-search" type="search" ' +
          'placeholder="Filter by text…" aria-label="Filter by text" value="' + ui.esc(state.text) + '">' +
      '</div></div>';
  }

  function attachControlHandlers() {
    var body = document.getElementById('nb-body');
    body.querySelectorAll('[data-filter]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.filter = b.getAttribute('data-filter');
        body.querySelectorAll('[data-filter]').forEach(function (x) {
          x.classList.toggle('active', x === b);
        });
        renderList();
      });
    });
    var sel = document.getElementById('nb-topic');
    if (sel) sel.addEventListener('change', function () { state.topic = sel.value; renderList(); });
    var srch = document.getElementById('nb-search');
    if (srch) srch.addEventListener('input', function () {
      // debounced: renderList re-typesets every card, far too heavy per keystroke
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () { state.text = srch.value; renderList(); }, 200);
    });
  }

  /* ——— The list (re-rendered on filter change / bookmark toggle) ——— */
  function renderList() {
    var el = listEl();
    if (!el) return;
    var entries = PGRE.notes.list({ filter: state.filter, topic: state.topic, text: state.text });
    if (!entries.length) {
      var kind = state.filter === 'bookmarks' ? 'bookmarks' : state.filter === 'notes' ? 'notes' : 'entries';
      el.innerHTML = '<div class="card nb-nomatch"><p class="muted">No ' + kind +
        ' match these filters.</p></div>';
      return;
    }
    var html = '';
    entries.forEach(function (e) { html += entryCard(e); });
    el.innerHTML = html;
    PGRE.typesetMath(el);
    attachRowHandlers();
    markClampedStems();
  }

  function starButton(on) {
    return '<button class="nb-star' + (on ? ' on' : '') + '" data-star ' +
      'aria-pressed="' + (on ? 'true' : 'false') + '" ' +
      'title="' + (on ? 'Remove bookmark' : 'Bookmark this question') + '" ' +
      'aria-label="' + (on ? 'Remove bookmark' : 'Bookmark this question') + '">' +
      (on ? '★' : '☆') + '</button>';
  }

  function entryCard(e) {
    var star = starButton(e.bookmarked);
    var head, reveal = '', chips = '';

    if (e.q) {
      head = '<div class="nb-head">' + ui.monogram(e.topic) +
        '<div class="nb-stem">' + e.q.q + '</div>' + star + '</div>' +
        '<button class="nb-more" type="button" data-more hidden>Show more</button>';

      var choices = '<div class="nb-choices">';
      e.q.choices.forEach(function (c, idx) {
        var isAns = idx === e.q.answer;
        choices += '<div class="nb-opt' + (isAns ? ' is-answer' : '') + '">' +
          '<span class="nb-opt-letter">' + LETTERS[idx] + '</span>' +
          '<span class="nb-opt-body">' + c + '</span>' +
          (isAns ? '<span class="nb-correct-tag">✓ correct</span>' : '') +
          '</div>';
      });
      choices += '</div>';

      reveal = '<details class="nb-reveal"><summary>Reveal answer &amp; solution</summary>' +
        choices +
        '<div class="solution"><div class="solution-label">Solution</div>' + e.q.sol + '</div>' +
        '</details>';

      chips = '<div class="nb-chips">' +
        '<a class="chip nb-chip" href="#/practice/custom" data-drill="' + ui.esc(e.qid) + '">Drill this question →</a>';
      if (PGRE.store.state.mistakes[e.qid]) {
        chips += '<a class="chip nb-chip" href="#/mistakes">In your mistake book →</a>';
      }
      chips += '</div>';
    } else {
      head = '<div class="nb-head">' + orphanMono() +
        '<div class="nb-stem nb-orphan"><strong>This question is not in the current bank.</strong> ' +
          '<span class="muted">It will reappear here once its source is imported.</span>' +
          '<span class="nb-qid">' + ui.esc(e.qid) + '</span></div>' + star + '</div>';
    }

    var note = '<div class="nb-noteblock">' +
      '<textarea class="nb-note" data-note rows="2" placeholder="Add a note…">' + ui.esc(e.note) + '</textarea>' +
      '<span class="nb-saved" aria-live="polite"></span>' +
      '</div>';

    return '<div class="card nb-entry' + (e.q ? '' : ' is-orphan') + '" data-qid="' + ui.esc(e.qid) + '">' +
      head + note + reveal + chips + '</div>';
  }

  function attachRowHandlers() {
    listEl().querySelectorAll('.nb-entry').forEach(function (card) {
      var qid = card.getAttribute('data-qid');

      var star = card.querySelector('[data-star]');
      if (star) star.addEventListener('click', function () { toggleStar(qid); });

      var ta = card.querySelector('[data-note]');
      if (ta) {
        ta.addEventListener('input', function () { scheduleSave(qid, ta); });
        ta.addEventListener('blur', function () {
          flushSave(qid, ta);
          // Clearing a note to empty deletes its entry (notes.set drops it). A
          // note-only row — or any row under the Notes filter — then no longer
          // belongs in the list, so re-render on blur (never per keystroke) to
          // drop the stale blank row instead of leaving it until a reload. A
          // still-bookmarked row under All/Bookmarks stays put, note-less.
          var cleared = String(ta.value).trim() === '';
          var dropped = cleared && (!PGRE.notes.isBookmarked(qid) || state.filter === 'notes');
          if (dropped) {
            var c = PGRE.notes.counts();
            if (c.notes === 0 && c.bookmarks === 0) renderBody();
            else renderList();
          }
        });
      }

      var more = card.querySelector('[data-more]');
      var stem = card.querySelector('.nb-stem');
      if (more && stem) more.addEventListener('click', function () {
        var exp = stem.classList.toggle('is-expanded');
        more.textContent = exp ? 'Show less' : 'Show more';
      });

      var drill = card.querySelector('[data-drill]');
      if (drill) drill.addEventListener('click', function (ev) {
        ev.preventDefault();
        startDrill(drill.getAttribute('data-drill'));
      });
    });
  }

  /* Reveal the "Show more" toggle only on stems that actually overflow 3 lines. */
  function markClampedStems() {
    listEl().querySelectorAll('.nb-entry').forEach(function (card) {
      var stem = card.querySelector('.nb-stem');
      var more = card.querySelector('[data-more]');
      if (!stem || !more) return;
      more.hidden = stem.scrollHeight <= stem.clientHeight + 2;
    });
  }

  /* ——— Autosave ——— */
  function scheduleSave(qid, ta) {
    if (saveTimers[qid]) clearTimeout(saveTimers[qid]);
    saveTimers[qid] = setTimeout(function () { doSave(qid, ta); }, 500);
  }

  function flushSave(qid, ta) {
    if (saveTimers[qid]) { clearTimeout(saveTimers[qid]); saveTimers[qid] = null; }
    doSave(qid, ta);
  }

  function doSave(qid, ta) {
    saveTimers[qid] = null;
    if (String(ta.value).trim() === String(PGRE.notes.get(qid)).trim()) return; // no change
    PGRE.notes.set(qid, ta.value);
    showSaved(ta);
    updateCounts();
  }

  function showSaved(ta) {
    var tick = ta.parentNode.querySelector('.nb-saved');
    if (!tick) return;
    tick.textContent = ta.value.trim() === '' ? 'Note cleared' : 'Saved ✓';
    tick.classList.add('show');
    clearTimeout(tick._t);
    tick._t = setTimeout(function () { tick.classList.remove('show'); }, 1600);
  }

  /* Persist any note whose debounce is still pending before a re-render swaps
     its textarea out (so the freshly-rendered field shows the latest text). */
  function flushAllPending() {
    var el = listEl();
    if (!el) return;
    el.querySelectorAll('.nb-entry').forEach(function (card) {
      var qid = card.getAttribute('data-qid');
      if (!saveTimers[qid]) return;
      var ta = card.querySelector('[data-note]');
      if (ta) flushSave(qid, ta);
    });
  }

  /* Closing/reloading the tab mid-typing fires no blur and kills the debounce
     timers — flush pending notes so the edits survive (same pagehide pattern
     as js/study-time.js). flushAllPending no-ops when this view isn't mounted. */
  window.addEventListener('pagehide', function () { flushAllPending(); });

  function updateCounts() {
    var c = PGRE.notes.counts();
    var n = document.getElementById('nb-count-notes');
    var b = document.getElementById('nb-count-bm');
    if (n) n.textContent = c.notes;
    if (b) b.textContent = c.bookmarks;
  }

  function toggleStar(qid) {
    flushAllPending();
    PGRE.notes.toggleBookmark(qid);
    updateCounts();
    var c = PGRE.notes.counts();
    if (c.notes === 0 && c.bookmarks === 0) renderBody(); // last one gone -> empty state
    else renderList();
  }

  /* Single-question drill: hand a config to the practice view via sessionStorage
     and route to #/practice/custom (the practice view picks up the ids). */
  function startDrill(qid) {
    try {
      sessionStorage.setItem('pgre-quiz-config', JSON.stringify({ ids: [qid], label: 'From notes' }));
    } catch (e) { /* private mode: fall through to the route anyway */ }
    location.hash = '#/practice/custom';
  }

  return {
    render: function () { return '<div id="notes-root"></div>'; },
    mount: function () {
      ui = PGRE.ui;
      state = { filter: 'all', topic: 'all', text: '' };
      saveTimers = {};
      build();
    }
  };
})();
