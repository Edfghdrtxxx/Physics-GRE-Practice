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

  /* Lucky-guess entries (correct-but-guessed) carry a mk.lucky flag. */
  function luckyChip(mk) {
    return mk.lucky ? '<span class="due-chip lucky-chip">⚑ lucky guess</span>' : '';
  }

  /* PROPOSAL #12 — "Why the other choices tempt": an expandable list of the
     non-correct choices with their mined per-choice explanation (q.choiceSols[idx]).
     The field is optional (a pipeline fills it into the bank over time), so an
     absent or all-null array yields '' and no empty block shows. Choice text and
     explanation are trusted bank HTML/LaTeX, rendered like q.sol / q.choices and
     typeset by the caller's PGRE.typesetMath pass. */
  function distractorBlock(q) {
    var sols = q && q.choiceSols;
    if (!sols || !sols.length) return '';
    var items = '';
    for (var idx = 0; idx < q.choices.length; idx++) {
      if (idx === q.answer) continue;                 // only the tempting wrong choices
      var why = sols[idx];
      if (why == null || String(why).replace(/\s+/g, '') === '') continue;  // skip absent
      items += '<div class="distractor-item">' +
        '<div class="miss-pick is-bad"><span class="fb-icon">✗</span>' +
          '<strong>' + LETTERS[idx] + '</strong> — ' +
          '<span class="miss-pick-body">' + q.choices[idx] + '</span></div>' +
        '<div class="solution"><div class="solution-label">Why it tempts</div>' + why + '</div>' +
      '</div>';
    }
    if (!items) return '';
    return '<details class="miss distractors"><summary>Why the other choices tempt</summary>' +
      '<div class="distractor-list">' + items + '</div></details>';
  }

  /* Most recent recorded confidence for a question, if any. */
  function lastConfidence(qid) {
    var arr = PGRE.store.state.attempts;
    for (var i = arr.length - 1; i >= 0; i--) {
      if (arr[i].qid === qid && arr[i].confidence) return arr[i].confidence;
    }
    return null;
  }

  /* ——— The book ——— */
  function missCard(e) {
    var ui = PGRE.ui, q = e.q, mk = e.mk, t = PGRE.topicById(q.topic);
    var wrong = mk.lastPick != null ? mk.lastPick : mk.wrongPicks[mk.wrongPicks.length - 1];
    var metaBits = [];
    if (mk.misses > 0) metaBits.push('missed ×' + mk.misses);
    if (mk.solves) metaBits.push('re-solved ×' + mk.solves);
    if (mk.lucky && !(mk.misses > 0)) metaBits.push('correct but guessed');
    var lastTs = mk.lastMissedAt || mk.lastSolvedAt || mk.lastLuckyAt;
    if (lastTs) metaBits.push('last ' + ui.timeAgo(lastTs));
    var html = '<div class="card miss-card' + (mk.archivedAt ? ' is-archived' : '') + '">' +
      '<div class="miss-head">' + ui.monogram(t) + dueChip(mk) + luckyChip(mk) +
        '<span class="muted">' + metaBits.join(' · ') + '</span>' +
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
    var conf = lastConfidence(q.id);
    if (conf) {
      html += '<div class="conf-note muted">Your last confidence on this question: ' +
        '<strong>' + (conf === 'guess' ? 'Guessed' : 'Knew it') + '</strong></div>';
    }
    html += '<details class="miss"><summary>Solution</summary>' +
      '<div class="solution"><div class="solution-label">Solution</div>' + q.sol + '</div></details>' +
    distractorBlock(q) +
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
        (open.length ? '<button class="btn btn-ghost" id="print-mistakes">Print / PDF</button>' : '') +
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

    buildPrintSheet();
    var pb = document.getElementById('print-mistakes');
    if (pb) pb.addEventListener('click', printBook);
  }

  /* ——— Print / PDF (proposal #13) ———
     Builds a self-contained paper mistake book — every open entry's question,
     wrong pick(s), correct answer and full solution — into a hidden
     `.print-sheet` beside the interactive DOM; css/print.css lays it out and
     hides everything else at print time. Rebuilt on every renderBook so it is
     always current, and auto-discarded when the router repaints #view. */
  function printDate() {
    return new Date().toLocaleDateString('en-US',
      { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function missPrintEntry(e) {
    var ui = PGRE.ui, q = e.q, mk = e.mk, t = PGRE.topicById(q.topic);
    var meta = [];
    if (mk.misses > 0) meta.push('missed ×' + mk.misses);
    if (mk.solves) meta.push('re-solved ×' + mk.solves);
    if (mk.lucky && !(mk.misses > 0)) meta.push('correct but guessed');
    var metaLine = (t ? t.name : '') + (meta.length ? ' · ' + meta.join(' · ') : '');
    var h = '<article class="ps-miss">' +
      '<div class="ps-miss-head">' +
        '<span class="ps-mono">' + ui.esc(t ? t.short : '?') + '</span>' +
        '<span class="ps-meta">' + ui.esc(metaLine) + '</span>' +
      '</div>' +
      '<div class="ps-q">' + q.q + '</div>' +
      '<div class="ps-picks">';
    var picks = (mk.wrongPicks && mk.wrongPicks.length)
      ? mk.wrongPicks
      : (mk.lastPick != null ? [mk.lastPick] : []);
    picks.forEach(function (w) {
      if (w == null || w === q.answer || !q.choices[w]) return;
      h += '<div class="ps-pick ps-wrong"><span class="ps-ic">✗</span>' +
        '<strong>You picked ' + LETTERS[w] + '</strong> — ' + q.choices[w] + '</div>';
    });
    h += '<div class="ps-pick ps-right"><span class="ps-ic">✓</span>' +
        '<strong>Correct: ' + LETTERS[q.answer] + '</strong> — ' + q.choices[q.answer] + '</div>' +
      '</div>' +
      '<div class="ps-sol"><span class="ps-sol-label">Solution</span>' + q.sol + '</div>' +
    '</article>';
    return h;
  }

  function buildPrintSheet() {
    var view = document.getElementById('view');
    if (!view) return;
    var old = document.getElementById('mistakes-print');
    if (old) old.parentNode.removeChild(old);
    var open = PGRE.srs.openMistakes();
    if (!open.length) return;
    open.sort(function (a, b) {
      return (a.mk.srs ? a.mk.srs.due : '9999') < (b.mk.srs ? b.mk.srs.due : '9999') ? -1 : 1;
    });
    var html = '<header class="ps-head"><h1>Physics GRE — Mistake Book</h1>' +
      '<p class="ps-sub">' + open.length + ' entr' + (open.length === 1 ? 'y' : 'ies') +
      ' · printed ' + printDate() + '</p></header>';
    open.forEach(function (e) { html += missPrintEntry(e); });
    var sheet = document.createElement('section');
    sheet.className = 'print-sheet';
    sheet.id = 'mistakes-print';
    sheet.innerHTML = html;
    view.appendChild(sheet);
    PGRE.typesetMath(sheet);
  }

  function printBook() {
    buildPrintSheet();
    document.body.classList.add('pgre-printing');
    window.print();
  }

  window.addEventListener('afterprint', function () {
    document.body.classList.remove('pgre-printing');
  });

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
    if (isCorrect) { drill.correct++; PGRE.srs.clearLucky(q.id); } // a correct re-drill retires the lucky flag

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
