/* History — every answer ever given, durably recorded and browsable:
   session list (expandable to its attempts) and a filterable flat attempt log.
   Data comes from state.attempts / state.sessions (see store.js defaults). */
window.PGRE = window.PGRE || {};
PGRE.views = PGRE.views || {};

PGRE.views.history = (function () {
  var LETTERS = ['A', 'B', 'C', 'D', 'E'];
  var PAGE = 50;
  var SESS_PAGE = 20;
  // pre-cap attempts may hold walked-away outliers (hours) — keep them out of
  // the average (matches PGRE.gamify.MAX_ATTEMPT_MS at record time)
  var MAX_SANE_MS = 15 * 60 * 1000;
  var shown, shownSessions, topicFilter, resultFilter;

  var MODE_LABEL = { practice: 'Practice', mistakes: 'Mistake drill' };

  function fmtMs(ms) {
    if (ms == null) return '—';
    var s = ms / 1000;
    return (s < 10 ? s.toFixed(1) : Math.round(s)) + ' s';
  }

  function fmtWhen(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' +
           d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  function pickLabel(a) {
    if (a.picked == null) return '—';
    return a.correct ? LETTERS[a.picked]
                     : LETTERS[a.picked] + ' → ' + LETTERS[a.answer];
  }

  function attemptRow(a) {
    var q = PGRE.questionById(a.qid);
    var t = PGRE.topicById(a.topic);
    return '<div class="hist-row">' +
      '<span class="hist-mark ' + (a.correct ? 'is-good' : 'is-bad') + '">' +
        (a.correct ? '✓' : '✗') + '</span>' +
      '<span class="nav-mono">' + (t ? t.short : '?') + '</span>' +
      '<span class="hist-q">' + (q ? q.q : 'Question ' + PGRE.ui.esc(a.qid) +
        ' (no longer in the bank)') + '</span>' +
      '<span class="hist-pick">' + pickLabel(a) + '</span>' +
      '<span class="hist-ms">' + fmtMs(a.ms) + '</span>' +
      '<span class="hist-when">' + fmtWhen(a.ts) + '</span>' +
    '</div>';
  }

  function sessionCard(sess) {
    var ui = PGRE.ui;
    var t = sess.topicId && sess.topicId !== 'all' && sess.topicId !== 'mistakes'
            ? PGRE.topicById(sess.topicId) : null;
    var scope = sess.mode === 'mistakes' ? 'Mistake book'
              : sess.topicId === 'custom' ? (sess.label || 'Custom quiz')
              : t ? t.name : 'All topics';
    var open = !sess.endedAt && sess.answered < sess.planned;
    var dur = sess.endedAt
      ? Math.max(1, Math.round((new Date(sess.endedAt) - new Date(sess.startedAt)) / 60000)) + ' min'
      : 'unfinished';
    // attempt rows are filled lazily on first open (renderSessions) so a long
    // history doesn't render + typeset every answer ever given up front
    return '<details class="hist-session" data-sid="' + ui.esc(sess.id) + '">' +
      '<summary><span class="hist-sess-when">' + fmtWhen(sess.startedAt) + '</span>' +
        '<span>' + ui.esc(MODE_LABEL[sess.mode] || sess.mode) + ' · ' + ui.esc(scope) + '</span>' +
        '<span class="hist-sess-score">' + sess.correct + '/' + sess.answered +
          (open ? ' of ' + sess.planned : '') + '</span>' +
        '<span class="hist-sess-meta">' + dur + ' · +' + sess.xp + ' XP</span>' +
      '</summary><div class="hist-rows"></div></details>';
  }

  function renderSessions() {
    var box = document.getElementById('hist-sessions');
    if (!box) return;
    var s = PGRE.store.state;
    var list = s.sessions.slice().reverse();
    var bySid = {};  // one pass over the log, not one filter per session
    s.attempts.forEach(function (a) {
      if (a.sid) (bySid[a.sid] = bySid[a.sid] || []).push(a);
    });
    var html = '';
    list.slice(0, shownSessions).forEach(function (sess) { html += sessionCard(sess); });
    if (list.length > shownSessions) {
      html += '<div class="btn-row"><button class="btn btn-ghost" id="hist-sess-more">Show ' +
        Math.min(SESS_PAGE, list.length - shownSessions) + ' more (' +
        (list.length - shownSessions) + ' left)</button></div>';
    }
    box.innerHTML = html;
    box.querySelectorAll('.hist-session').forEach(function (det) {
      det.addEventListener('toggle', function () {
        if (!det.open || det.getAttribute('data-filled')) return;
        det.setAttribute('data-filled', '1');
        var rows = det.querySelector('.hist-rows');
        var mine = bySid[det.getAttribute('data-sid')] || [];
        var rh = '';
        mine.forEach(function (a) { rh += attemptRow(a); });
        rows.innerHTML = rh || '<p class="muted">No answers recorded in this session.</p>';
        PGRE.typesetMath(rows);
      });
    });
    var more = document.getElementById('hist-sess-more');
    if (more) more.addEventListener('click', function () {
      shownSessions += SESS_PAGE;
      renderSessions();
    });
  }

  function filteredAttempts() {
    var s = PGRE.store.state;
    return s.attempts.filter(function (a) {
      if (topicFilter !== 'all' && a.topic !== topicFilter) return false;
      if (resultFilter === 'correct' && !a.correct) return false;
      if (resultFilter === 'missed' && a.correct) return false;
      return true;
    }).slice().reverse(); // newest first
  }

  function renderLog() {
    var box = document.getElementById('hist-log');
    var list = filteredAttempts();
    if (!list.length) {
      box.innerHTML = '<p class="muted">Nothing here for this filter yet.</p>';
      return;
    }
    var html = '';
    list.slice(0, shown).forEach(function (a) { html += attemptRow(a); });
    box.innerHTML = '<div id="hist-rows-flat">' + html + '</div>' +
      '<div class="btn-row" id="hist-more-row"></div>';
    PGRE.typesetMath(document.getElementById('hist-rows-flat'));
    updateMoreBtn(list);
  }

  function updateMoreBtn(list) {
    var row = document.getElementById('hist-more-row');
    if (!row) return;
    var left = list.length - shown;
    if (left <= 0) { row.innerHTML = ''; return; }
    row.innerHTML = '<button class="btn btn-ghost" id="hist-more">Show ' +
      Math.min(PAGE, left) + ' more (' + left + ' left)</button>';
    document.getElementById('hist-more').addEventListener('click', function () {
      shown += PAGE;
      appendLog();
    });
  }

  /* "Show more" appends only the next page — the rows (and math) already on
     screen are not rebuilt or re-typeset. */
  function appendLog() {
    var rows = document.getElementById('hist-rows-flat');
    if (!rows) return;
    var list = filteredAttempts();
    var from = rows.children.length;
    var html = '';
    list.slice(from, shown).forEach(function (a) { html += attemptRow(a); });
    rows.insertAdjacentHTML('beforeend', html);
    for (var i = from; i < rows.children.length; i++) PGRE.typesetMath(rows.children[i]);
    updateMoreBtn(list);
  }

  return {
    render: function () {
      shown = PAGE; shownSessions = SESS_PAGE; topicFilter = 'all'; resultFilter = 'all';
      var ui = PGRE.ui, s = PGRE.store.state;
      var total = s.attempts.length;
      var correct = s.attempts.filter(function (a) { return a.correct; }).length;
      var acc = total ? Math.round(100 * correct / total) + '%' : '—';
      var timed = s.attempts.filter(function (a) { return a.ms != null && a.ms <= MAX_SANE_MS; });
      var avgMs = timed.length
        ? Math.round(timed.reduce(function (sum, a) { return sum + a.ms; }, 0) / timed.length) : null;
      var openMistakes = PGRE.srs.openMistakes().length;

      var html = '<div class="card"><h1>History</h1>' +
        '<p class="muted">Every answer you have ever given, kept for good — which question, ' +
        'what you picked, and how long it took. Misses feed the ' +
        '<a href="#/mistakes">mistake book</a>.</p></div>';

      html += '<div class="stat-row">' +
        ui.statTile('Attempts logged', ui.fmt(total)) +
        ui.statTile('All-time accuracy', acc) +
        ui.statTile('Sessions', ui.fmt(s.sessions.length)) +
        ui.statTile('Avg. time / question', avgMs == null ? '—' : fmtMs(avgMs)) +
        ui.statTile('Mistakes in the book', ui.fmt(openMistakes)) +
      '</div>';

      html += '<div class="card"><h2>Sessions</h2>';
      if (!s.sessions.length) {
        html += '<p class="muted">No sessions yet — <a href="#/practice/all">do a practice set</a> ' +
          'and it will be recorded here.</p>';
      } else {
        html += '<div id="hist-sessions"></div>';
      }
      html += '</div>';

      html += '<div class="card"><h2>Attempt log</h2>' +
        '<div class="filter-row">' +
          '<select id="hist-topic" class="hist-select"><option value="all">All topics</option>';
      PGRE.TOPICS.forEach(function (t) {
        html += '<option value="' + t.id + '">' + t.name + '</option>';
      });
      html += '</select>';
      [['all', 'All'], ['correct', 'Correct'], ['missed', 'Missed']].forEach(function (f) {
        html += '<button class="filter-btn' + (f[0] === 'all' ? ' active' : '') +
          '" data-result="' + f[0] + '">' + f[1] + '</button>';
      });
      html += '</div><div id="hist-log"></div></div>';

      return html;
    },

    mount: function () {
      renderSessions(); // session cards typeset their rows lazily, on first open
      renderLog();
      document.getElementById('hist-topic').addEventListener('change', function (e) {
        topicFilter = e.target.value; shown = PAGE; renderLog();
      });
      document.querySelectorAll('[data-result]').forEach(function (b) {
        b.addEventListener('click', function () {
          resultFilter = b.getAttribute('data-result'); shown = PAGE;
          document.querySelectorAll('[data-result]').forEach(function (x) {
            x.classList.toggle('active', x === b);
          });
          renderLog();
        });
      });
    }
  };
})();
