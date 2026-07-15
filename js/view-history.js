/* History — every answer ever given, durably recorded and browsable:
   session list (expandable to its attempts) and a filterable flat attempt log.
   Data comes from state.attempts / state.sessions (see store.js defaults). */
window.PGRE = window.PGRE || {};
PGRE.views = PGRE.views || {};

PGRE.views.history = (function () {
  var LETTERS = ['A', 'B', 'C', 'D', 'E'];
  var PAGE = 50;
  var shown, topicFilter, resultFilter;

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

  function sessionCard(sess, attempts) {
    var ui = PGRE.ui;
    var t = sess.topicId && sess.topicId !== 'all' && sess.topicId !== 'mistakes'
            ? PGRE.topicById(sess.topicId) : null;
    var scope = sess.mode === 'mistakes' ? 'Mistake book'
              : t ? t.name : 'All topics';
    var mine = attempts.filter(function (a) { return a.sid === sess.id; });
    var open = !sess.endedAt && sess.answered < sess.planned;
    var dur = sess.endedAt
      ? Math.max(1, Math.round((new Date(sess.endedAt) - new Date(sess.startedAt)) / 60000)) + ' min'
      : 'unfinished';
    var html = '<details class="hist-session">' +
      '<summary><span class="hist-sess-when">' + fmtWhen(sess.startedAt) + '</span>' +
        '<span>' + (MODE_LABEL[sess.mode] || sess.mode) + ' · ' + ui.esc(scope) + '</span>' +
        '<span class="hist-sess-score">' + sess.correct + '/' + sess.answered +
          (open ? ' of ' + sess.planned : '') + '</span>' +
        '<span class="hist-sess-meta">' + dur + ' · +' + sess.xp + ' XP</span>' +
      '</summary><div class="hist-rows">';
    if (mine.length) mine.forEach(function (a) { html += attemptRow(a); });
    else html += '<p class="muted">No answers recorded in this session.</p>';
    html += '</div></details>';
    return html;
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
    var html = '';
    list.slice(0, shown).forEach(function (a) { html += attemptRow(a); });
    if (!list.length) html = '<p class="muted">Nothing here for this filter yet.</p>';
    if (list.length > shown) {
      html += '<div class="btn-row"><button class="btn btn-ghost" id="hist-more">Show ' +
        Math.min(PAGE, list.length - shown) + ' more (' + (list.length - shown) + ' left)</button></div>';
    }
    box.innerHTML = html;
    PGRE.typesetMath(box);
    var more = document.getElementById('hist-more');
    if (more) more.addEventListener('click', function () { shown += PAGE; renderLog(); });
  }

  return {
    render: function () {
      shown = PAGE; topicFilter = 'all'; resultFilter = 'all';
      var ui = PGRE.ui, s = PGRE.store.state;
      var total = s.attempts.length;
      var correct = s.attempts.filter(function (a) { return a.correct; }).length;
      var acc = total ? Math.round(100 * correct / total) + '%' : '—';
      var timed = s.attempts.filter(function (a) { return a.ms != null; });
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
        s.sessions.slice().reverse().forEach(function (sess) {
          html += sessionCard(sess, s.attempts);
        });
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
      renderLog();
      var view = document.getElementById('view');
      PGRE.typesetMath(view); // session cards contain question text
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
