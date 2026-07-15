/* Mistake book — every missed question, kept permanently: your wrong pick
   beside the solution, re-drillable anytime, resurfaced on the spaced-
   repetition ladder (js/srs.js). Solving never removes an entry; only the
   manual Archive action hides it (a fresh miss reopens it). */
window.PGRE = window.PGRE || {};
PGRE.views = PGRE.views || {};

PGRE.views.mistakes = (function () {
  var LETTERS = ['A', 'B', 'C', 'D', 'E'];
  var drill = null; // { qs, i, correct, xp, sid }

  function root() { return document.getElementById('mistakes-root'); }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function dueChip(mk) {
    if (mk.archivedAt) return '<span class="due-chip due-archived">archived</span>';
    if (!mk.srs) return '';
    var d = PGRE.srs.daysUntil(mk.srs.due);
    if (d <= 0) return '<span class="due-chip due-now">due now</span>';
    return '<span class="due-chip">due in ' + PGRE.srs.ivlLabel(d) + '</span>';
  }

  /* ——— The book ——— */
  function missCard(e) {
    var ui = PGRE.ui, q = e.q, mk = e.mk, t = PGRE.topicById(q.topic);
    var wrong = mk.lastPick != null ? mk.lastPick : mk.wrongPicks[mk.wrongPicks.length - 1];
    var html = '<div class="card miss-card' + (mk.archivedAt ? ' is-archived' : '') + '">' +
      '<div class="miss-head">' + ui.monogram(t) + dueChip(mk) +
        '<span class="muted">missed ×' + mk.misses +
          (mk.solves ? ' · re-solved ×' + mk.solves : '') +
          ' · last ' + ui.timeAgo(mk.lastMissedAt) + '</span>' +
        '<span class="miss-actions">' +
          (mk.archivedAt
            ? '<button class="btn btn-ghost btn-sm" data-restore="' + q.id + '">Restore</button>'
            : '<button class="btn btn-ghost btn-sm" data-drill-one="' + q.id + '">Re-drill</button>' +
              '<button class="btn btn-danger-ghost btn-sm" data-archive="' + q.id + '">Archive</button>') +
        '</span>' +
      '</div>' +
      '<div class="q-text">' + q.q + '</div>';
    if (wrong != null) {
      html += '<div class="miss-picks">' +
        '<div class="miss-pick is-bad"><span class="fb-icon">✗</span><strong>You picked ' +
          LETTERS[wrong] + '</strong> — <span class="miss-pick-body">' + q.choices[wrong] + '</span></div>' +
        '<div class="miss-pick is-good"><span class="fb-icon">✓</span><strong>Correct: ' +
          LETTERS[q.answer] + '</strong> — <span class="miss-pick-body">' + q.choices[q.answer] + '</span></div>' +
      '</div>';
    }
    html += '<details class="miss"><summary>Solution</summary>' +
      '<div class="solution"><div class="solution-label">Solution</div>' + q.sol + '</div></details>' +
    '</div>';
    return html;
  }

  function renderBook() {
    drill = null;
    var open = PGRE.srs.openMistakes();
    var due = PGRE.srs.dueMistakes();
    var archived = PGRE.srs.archivedMistakes();

    // due first (oldest due date first), then upcoming by due date
    open.sort(function (a, b) {
      return (a.mk.srs ? a.mk.srs.due : '9999') < (b.mk.srs ? b.mk.srs.due : '9999') ? -1 : 1;
    });

    var html = '<div class="card"><h1>Mistake book</h1>' +
      '<p class="muted">Every question you have missed, kept until <em>you</em> archive it. ' +
      'Re-solving a mistake never removes it — it schedules the next review further out ' +
      '(' + PGRE.srs.MISTAKE_LADDER.join(' → ') + ' days). Missing it again resets the ladder.</p>' +
      '<div class="btn-row">' +
        '<button class="btn btn-primary" id="drill-due"' + (due.length ? '' : ' disabled') + '>' +
          'Drill due (' + due.length + ')</button>' +
        '<button class="btn btn-ghost" id="drill-all"' + (open.length ? '' : ' disabled') + '>' +
          'Drill all (' + open.length + ')</button>' +
      '</div></div>';

    if (!open.length && !archived.length) {
      html += '<div class="card placeholder">' +
        '<p><strong>Nothing in the book yet.</strong></p>' +
        '<p class="muted">Miss a question in <a href="#/practice/all">practice</a> and it lands here — ' +
        'with your wrong pick, the solution, and a review schedule.</p></div>';
    }

    open.forEach(function (e) { html += missCard(e); });

    if (archived.length) {
      html += '<details class="card archived-block"><summary>Archived (' + archived.length +
        ') — hidden from drills and due counts</summary>';
      archived.forEach(function (e) { html += missCard(e); });
      html += '</details>';
    }

    root().innerHTML = html;
    PGRE.typesetMath(root());
    PGRE.refreshNavBadges(); // due counts change without a route change

    var dd = document.getElementById('drill-due');
    var da = document.getElementById('drill-all');
    if (dd) dd.addEventListener('click', function () {
      startDrill(PGRE.srs.dueMistakes().map(function (e) { return e.q; }));
    });
    if (da) da.addEventListener('click', function () {
      startDrill(PGRE.srs.openMistakes().map(function (e) { return e.q; }));
    });
    root().querySelectorAll('[data-drill-one]').forEach(function (b) {
      b.addEventListener('click', function () {
        var q = PGRE.questionById(b.getAttribute('data-drill-one'));
        if (q) startDrill([q]);
      });
    });
    root().querySelectorAll('[data-archive]').forEach(function (b) {
      b.addEventListener('click', function () {
        var mk = PGRE.store.state.mistakes[b.getAttribute('data-archive')];
        if (!mk) return;
        mk.archivedAt = new Date().toISOString();
        PGRE.store.save();
        PGRE.toast('Archived — it stays in the book, hidden from drills. A new miss reopens it.', 'info');
        renderBook();
      });
    });
    root().querySelectorAll('[data-restore]').forEach(function (b) {
      b.addEventListener('click', function () {
        var mk = PGRE.store.state.mistakes[b.getAttribute('data-restore')];
        if (!mk) return;
        mk.archivedAt = null;
        PGRE.store.save();
        PGRE.toast('Restored to the active book.', 'info');
        renderBook();
      });
    });
  }

  /* ——— Re-drill: same answering pipeline as practice (mode: mistakes) ——— */
  function startDrill(qs) {
    if (!qs.length) return;
    drill = { qs: shuffle(qs), i: 0, correct: 0, xp: 0,
              sid: PGRE.gamify.beginSession('mistakes', 'mistakes', qs.length) };
    renderDrillQuestion();
  }

  function renderDrillQuestion() {
    var q = drill.qs[drill.i];
    var t = PGRE.topicById(q.topic);
    var html = '<div class="card practice-card">' +
      '<div class="practice-meta">' +
        '<span>Mistake drill — ' + (drill.i + 1) + ' of ' + drill.qs.length + '</span>' +
        '<span class="chip">' + t.name + '</span>' +
      '</div>' +
      PGRE.ui.meter(100 * drill.i / drill.qs.length, 'meter-thin') +
      '<div class="q-text">' + q.q + '</div>' +
      '<div class="choices">';
    q.choices.forEach(function (c, idx) {
      html += '<button class="choice" data-idx="' + idx + '">' +
        '<span class="choice-letter">' + LETTERS[idx] + '</span>' +
        '<span class="choice-body">' + c + '</span></button>';
    });
    html += '</div><div id="feedback"></div></div>';
    root().innerHTML = html;
    PGRE.typesetMath(root());
    drill.qStart = Date.now();

    root().querySelectorAll('.choice').forEach(function (b) {
      b.addEventListener('click', function () {
        drillAnswer(parseInt(b.getAttribute('data-idx'), 10));
      });
    });
  }

  function drillAnswer(idx) {
    var q = drill.qs[drill.i];
    var isCorrect = idx === q.answer;
    var xp = PGRE.gamify.recordAnswer(q, isCorrect, Date.now() - drill.qStart,
                                      { picked: idx, sid: drill.sid, mode: 'mistakes' });
    drill.xp += xp;
    if (isCorrect) drill.correct++;

    root().querySelectorAll('.choice').forEach(function (b) {
      var i = parseInt(b.getAttribute('data-idx'), 10);
      b.disabled = true;
      if (i === q.answer) b.classList.add('is-answer');
      if (i === idx && !isCorrect) b.classList.add('is-wrong');
    });

    var mk = PGRE.store.state.mistakes[q.id];
    var nextDue = mk && mk.srs ? PGRE.srs.ivlLabel(PGRE.srs.daysUntil(mk.srs.due)) : '';
    var fb = document.getElementById('feedback');
    fb.innerHTML =
      '<div class="feedback ' + (isCorrect ? 'feedback-good' : 'feedback-bad') + '">' +
        '<span class="fb-icon">' + (isCorrect ? '✓' : '✗') + '</span>' +
        '<strong>' + (isCorrect ? 'Correct — next review in ' + nextDue
                                : 'Incorrect — the answer is ' + LETTERS[q.answer] +
                                  '; back to the bottom of the ladder') + '</strong>' +
        '<span class="fb-xp">+' + xp + ' XP</span>' +
      '</div>' +
      '<div class="solution"><div class="solution-label">Solution</div>' + q.sol + '</div>' +
      '<div class="btn-row"><button class="btn btn-primary" id="next-btn">' +
        (drill.i + 1 < drill.qs.length ? 'Next →' : 'Finish drill') + '</button></div>';
    PGRE.typesetMath(fb);
    document.getElementById('next-btn').addEventListener('click', function () {
      drill.i++;
      if (drill.i < drill.qs.length) renderDrillQuestion();
      else renderDrillSummary();
    });
    document.getElementById('next-btn').focus();
  }

  function renderDrillSummary() {
    PGRE.gamify.endSession(drill.sid);
    PGRE.store.log('mistake', 'Mistake drill: ' + drill.correct + '/' + drill.qs.length + ' correct', 0);
    PGRE.store.save();
    var stillDue = PGRE.srs.dueMistakes().length;
    root().innerHTML = '<div class="card practice-card">' +
      '<h1>Drill complete</h1>' +
      '<div class="summary-score">' + drill.correct + ' / ' + drill.qs.length +
        '<span class="summary-pct">+' + drill.xp + ' XP</span></div>' +
      '<p class="muted">Solved mistakes stay in the book — their next review just moved further out. ' +
      (stillDue ? stillDue + ' still due now.' : 'Nothing else is due right now.') + '</p>' +
      '<div class="btn-row">' +
        '<button class="btn btn-primary" id="back-book">Back to the book</button>' +
        '<a class="btn btn-ghost" href="#/">Dashboard</a>' +
      '</div></div>';
    document.getElementById('back-book').addEventListener('click', renderBook);
  }

  return {
    render: function () { return '<div id="mistakes-root"></div>'; },
    mount: function () { renderBook(); }
  };
})();
