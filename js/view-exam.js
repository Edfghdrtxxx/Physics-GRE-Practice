/* Timed mock-exam simulator — setup, exam room, and results/review.
   The scoring/draw model is js/exam-engine.js; this file is the UI: the
   full-screen exam room (countdown, palette, flags, pause, no feedback until
   submit), a custom in-page submit modal, resume-on-reload, and the per-topic
   + question-by-question results screen. Routes (app.js passes sub/sub2):
     #/exam                → setup + history
     #/exam/run            → the active sitting
     #/exam/review/<id>    → results for a submitted exam */
window.PGRE = window.PGRE || {};
PGRE.views = PGRE.views || {};

/* Fallback loader only: index.html lists js/exam-engine.js right before this
   file, so the guard below always finds PGRE.examEngine already present and
   the injector never runs. Kept as a defensive no-op should that <script>
   tag ever disappear. */
(function () {
  if (PGRE.examEngine) return;
  PGRE._examReadyQ = PGRE._examReadyQ || [];
  if (!document.querySelector('script[data-exam-engine]')) {
    var el = document.createElement('script');
    el.src = 'js/exam-engine.js';
    el.setAttribute('data-exam-engine', '1');
    el.onerror = function () { console.error('exam-engine failed to load'); };
    document.head.appendChild(el);
  }
})();

PGRE.views.exam = (function () {
  var LETTERS = ['A', 'B', 'C', 'D', 'E'];
  var timer = null;      // setInterval handle for the countdown
  var lastPersist = 0;   // throttle durationSec writes
  var lastTickAt = 0;    // wall-clock anchor so background-tab throttling can't buy free time

  function whenEngine(cb) {
    if (PGRE.examEngine) { cb(); return; }
    (PGRE._examReadyQ = PGRE._examReadyQ || []).push(cb);
  }

  function root() { return document.getElementById('exam-root'); }

  /* ——— Full-screen takeover + timer lifecycle ——— */
  function setFullscreen(on) { document.body.classList.toggle('exam-fullscreen', !!on); }
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
  function leaveRoom() { stopTimer(); setFullscreen(false); }

  /* Clean up the takeover whenever we navigate away from the sitting. */
  window.addEventListener('hashchange', function () {
    if (!/^#\/exam\/run\b/.test(location.hash)) leaveRoom();
  });
  window.addEventListener('pagehide', function () {
    var ex = PGRE.examEngine && PGRE.examEngine.active();
    if (ex) PGRE.store.save(); // last unsaved seconds survive a reload
  });

  /* Keyboard: A–E to (de)select, ←/→ to navigate, F to flag. Registered once;
     only acts inside the room with no modal open. */
  document.addEventListener('keydown', function (e) {
    if (!document.body.classList.contains('exam-fullscreen')) return;
    var host = document.getElementById('exam-modal-host');
    if (host && host.firstChild) return; // pause / submit modal open
    var exam = PGRE.examEngine && PGRE.examEngine.active();
    if (!exam || exam.paused) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return; // ⌘C / ⌘F etc. must never answer or flag
    var k = e.key;
    if (/^[a-eA-E]$/.test(k)) {
      var idx = k.toUpperCase().charCodeAt(0) - 65;
      var q = PGRE.questionById(exam.order[exam.cursor]);
      if (q && idx < q.choices.length) { selectAnswer(exam, idx); e.preventDefault(); }
    } else if (k === 'ArrowRight' && exam.cursor < exam.order.length - 1) {
      goTo(exam, exam.cursor + 1); e.preventDefault();
    } else if (k === 'ArrowLeft' && exam.cursor > 0) {
      goTo(exam, exam.cursor - 1); e.preventDefault();
    } else if (k === 'f' || k === 'F') {
      toggleFlag(exam); e.preventDefault();
    }
  });

  /* ——— Small format helpers ——— */
  function fmtClock(sec) {
    sec = Math.max(0, Math.round(sec));
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    var mm = (h ? String(m).padStart(2, '0') : String(m));
    return (h ? h + ':' : '') + mm + ':' + String(s).padStart(2, '0');
  }
  function fmtDate(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' +
           d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  function fmtDur(sec) {
    var m = Math.round(sec / 60);
    if (m < 60) return m + ' min';
    return Math.floor(m / 60) + ' h ' + (m % 60) + ' min';
  }
  function answeredCount(exam) {
    return exam.order.filter(function (qid) { return exam.answers[qid] != null; }).length;
  }

  /* ——————————————————————————— Setup ——————————————————————————— */
  function renderSetup() {
    leaveRoom();
    if (PGRE.nav) PGRE.nav.setTrail([]);   // BUNDLE G: setup is the base exam screen
    var eng = PGRE.examEngine, ui = PGRE.ui;
    var act = eng.active();
    var pool = PGRE.allQuestions({ includeExam: true }).length;
    var need70 = eng.FORMAT_META['70x120'].questions;
    var exams = (PGRE.BOOK_EXAMS || []).slice(0, 3);

    var html = '<div class="card"><h1>Timed mock exam</h1>' +
      '<p class="muted">A full exam-room simulation: countdown clock, question palette, ' +
      'flag-for-review, and <strong>no feedback until you submit</strong>. Every sitting is ' +
      'scored, saved, and feeds your <a href="#/analytics">analytics</a> and the ' +
      '<a href="#/mistakes">mistake book</a>.</p></div>';

    if (act) {
      var doneN = answeredCount(act);
      var remain = Math.max(0, act.limitSec - act.durationSec);
      html += '<div class="card exam-resume">' +
        '<h2>Resume your sitting</h2>' +
        '<p class="muted">A ' + eng.FORMAT_META[act.format].label + ' exam is in progress — ' +
        doneN + ' of ' + act.order.length + ' answered, ' + fmtClock(remain) + ' on the clock' +
        (act.paused ? ' (paused)' : '') + '.</p>' +
        '<div class="btn-row">' +
          '<button class="btn btn-primary" id="exam-resume-go">Resume exam</button>' +
          '<button class="btn btn-danger-ghost" id="exam-resume-drop">Discard it</button>' +
        '</div></div>';
    }

    // Current format — weighted draw
    html += '<div class="card exam-format">' +
      '<div class="exam-format-head"><h2>Current format</h2>' +
      '<span class="chip">70 questions · 120 min</span></div>' +
      '<p class="muted">A weighted random draw across the nine topics at their official exam ' +
      'weights (CM 20 · EM 18 · QM 13 · TS 10 · AP 10 · ST 9 · OW 8 · SR 6 · LM 6), preferring ' +
      'questions you have not seen, from the full bank of ' + pool + ' question' +
      (pool === 1 ? '' : 's') + '.</p>';
    if (pool >= need70) {
      html += '<div class="btn-row"><button class="btn btn-primary" id="start-70"' +
        (act ? ' disabled' : '') + '>Start 70-question exam</button></div>';
    } else {
      html += bankNotReady(need70, pool, false);
    }
    html += '</div>';

    // Legacy format — verbatim sample-exam replay
    html += '<div class="card exam-format">' +
      '<div class="exam-format-head"><h2>Legacy format</h2>' +
      '<span class="chip">100 questions · 170 min</span></div>' +
      '<p class="muted">Replays a full released-style sample exam verbatim, in book order — ' +
      'matching the 100-question ETS practice tests your <a href="#/plan">study plan</a> ' +
      'schedules on paper.</p>';
    if (exams.length) {
      html += '<div class="btn-row">';
      exams.forEach(function (ex, i) {
        html += '<button class="btn btn-ghost" data-legacy="x' + (i + 1) + '"' +
          (act ? ' disabled' : '') + '>' + ui.esc(ex.title || ('Sample Exam ' + (i + 1))) + '</button>';
      });
      html += '</div>';
    } else {
      html += bankNotReady(100, 0, true);
    }
    html += '</div>';

    html += historyCard();

    root().innerHTML = html;
    PGRE.typesetMath(root());

    var g;
    if ((g = document.getElementById('exam-resume-go'))) g.addEventListener('click', function () { location.hash = '#/exam/run'; });
    if ((g = document.getElementById('exam-resume-drop'))) g.addEventListener('click', function () {
      eng.discard(act); PGRE.toast('In-progress exam discarded.', 'info'); renderSetup();
    });
    if ((g = document.getElementById('start-70'))) g.addEventListener('click', function () { startExam({ format: '70x120' }); });
    root().querySelectorAll('[data-legacy]').forEach(function (b) {
      b.addEventListener('click', function () {
        startExam({ format: '100x170', source: b.getAttribute('data-legacy') });
      });
    });
  }

  function bankNotReady(need, have, legacy) {
    return '<div class="exam-empty">' +
      '<span class="exam-empty-icon" aria-hidden="true">⌛</span>' +
      '<div><strong>Bank not imported yet.</strong> ' +
      '<span class="muted">' + (legacy
        ? 'No sample exams are in the bank. This format unlocks once the book’s sample exams are imported into content/bank/.'
        : 'This format needs ' + need + ' questions; the bank currently has ' + have +
          '. It unlocks once the book question bank is imported.') +
      '</span></div></div>';
  }

  function historyCard() {
    var eng = PGRE.examEngine, hist = eng.history();
    var html = '<div class="card"><h2>Past simulations</h2>';
    if (!hist.length) {
      html += '<p class="muted">No mock exams yet. Completed simulations are listed here with ' +
        'scores and a full review.</p>';
    } else {
      html += '<div class="exam-hist-rows">';
      hist.forEach(function (x) {
        var pct = x.total ? Math.round(100 * x.raw / x.total) : 0;
        html += '<a class="exam-hist-row" href="#/exam/review/' + PGRE.ui.esc(x.id) + '">' +
          '<span class="exam-hist-when">' + fmtDate(x.submittedAt) + '</span>' +
          '<span class="chip">' + eng.FORMAT_META[x.format].label + '</span>' +
          '<span class="exam-hist-score">' + x.raw + ' / ' + x.total + ' · ' + pct + '%</span>' +
          '<span class="exam-hist-scaled">~' + x.scaledEst + ' scaled</span>' +
        '</a>';
      });
      html += '</div>';
    }
    return html + '</div>';
  }

  function startExam(config) {
    var exam = PGRE.examEngine.create(config);
    if (!exam) { PGRE.toast('Could not build this exam — the bank is too small.', 'error'); return; }
    location.hash = '#/exam/run'; // routes to the room
  }

  /* ——————————————————————————— Exam room ——————————————————————————— */
  function renderRoom() {
    var exam = PGRE.examEngine.active();
    if (!exam) { location.hash = '#/exam'; return; }
    setFullscreen(true);

    var eng = PGRE.examEngine;
    root().innerHTML =
      '<div class="exam-room">' +
        '<div class="exam-bar">' +
          '<div class="exam-bar-left">' +
            '<span class="exam-title">' + PGRE.ui.esc(exam.title || 'Mock exam') + '</span>' +
            '<span class="chip">' + eng.FORMAT_META[exam.format].label + '</span>' +
          '</div>' +
          '<div class="exam-timer" id="exam-timer" role="timer" aria-live="off">–:––</div>' +
          '<div class="exam-bar-right">' +
            '<span class="exam-progress" id="exam-progress"></span>' +
            '<button class="btn btn-ghost btn-sm" id="exam-pause">Pause</button>' +
            '<button class="btn btn-primary btn-sm" id="exam-submit">Submit</button>' +
          '</div>' +
        '</div>' +
        '<div class="exam-body">' +
          '<div class="exam-main">' +
            '<div id="exam-q"></div>' +
            '<div class="exam-navrow">' +
              '<button class="btn btn-ghost" id="exam-prev">← Back</button>' +
              '<button class="btn btn-ghost" id="exam-flag">⚑ Flag for review</button>' +
              '<button class="btn btn-primary" id="exam-next">Next →</button>' +
            '</div>' +
          '</div>' +
          '<aside class="exam-palette">' +
            '<div class="exam-palette-title">Question palette</div>' +
            '<div class="exam-palette-grid" id="exam-palette"></div>' +
            '<div class="exam-legend">' +
              '<span class="exam-legend-item"><span class="pal-swatch sw-unanswered"></span>Unanswered</span>' +
              '<span class="exam-legend-item"><span class="pal-swatch sw-answered"></span>Answered</span>' +
              '<span class="exam-legend-item"><span class="pal-swatch sw-flagged">⚑</span>Flagged</span>' +
            '</div>' +
          '</aside>' +
        '</div>' +
      '</div>' +
      '<div id="exam-modal-host"></div>';

    document.getElementById('exam-pause').addEventListener('click', function () { togglePause(exam); });
    document.getElementById('exam-submit').addEventListener('click', function () { confirmSubmit(exam); });
    document.getElementById('exam-prev').addEventListener('click', function () {
      if (exam.cursor > 0) goTo(exam, exam.cursor - 1);
    });
    document.getElementById('exam-next').addEventListener('click', function () {
      if (exam.cursor < exam.order.length - 1) goTo(exam, exam.cursor + 1);
    });
    document.getElementById('exam-flag').addEventListener('click', function () { toggleFlag(exam); });

    renderQuestion(exam);
    renderPalette(exam);
    startTimer(exam);
    if (exam.paused) showPauseOverlay(exam);
  }

  function renderQuestion(exam) {
    var qid = exam.order[exam.cursor];
    var q = PGRE.questionById(qid);
    var box = document.getElementById('exam-q');
    if (!box) return;
    if (!q) {
      box.innerHTML = '<div class="exam-qmeta"><span>Question ' + (exam.cursor + 1) +
        ' of ' + exam.order.length + '</span></div>' +
        '<p class="muted">This question is no longer in the bank.</p>';
      updateNav(exam);
      return;
    }
    var t = PGRE.topicById(q.topic);
    var picked = exam.answers[qid];
    var flagged = exam.flags.indexOf(qid) !== -1;
    var html = '<div class="exam-qmeta">' +
      '<span>Question ' + (exam.cursor + 1) + ' of ' + exam.order.length + '</span>' +
      (t ? '<span class="chip">' + t.name + '</span>' : '') +
      (flagged ? '<span class="chip exam-flagchip">⚑ Flagged for review</span>' : '') +
    '</div>' +
    '<div class="q-text">' + q.q + '</div>' +
    '<div class="choices">';
    q.choices.forEach(function (c, idx) {
      html += '<button class="choice' + (idx === picked ? ' is-picked' : '') + '" data-idx="' + idx + '">' +
        '<span class="choice-letter">' + LETTERS[idx] + '</span>' +
        '<span class="choice-body">' + c + '</span></button>';
    });
    html += '</div>';
    box.innerHTML = html;
    PGRE.typesetMath(box);
    box.querySelectorAll('.choice').forEach(function (b) {
      b.addEventListener('click', function () { selectAnswer(exam, parseInt(b.getAttribute('data-idx'), 10)); });
    });
    updateNav(exam);
  }

  function updateNav(exam) {
    var prev = document.getElementById('exam-prev');
    var next = document.getElementById('exam-next');
    var flag = document.getElementById('exam-flag');
    if (prev) prev.disabled = exam.cursor === 0;
    if (next) next.disabled = exam.cursor >= exam.order.length - 1;
    if (flag) {
      var flagged = exam.flags.indexOf(exam.order[exam.cursor]) !== -1;
      flag.textContent = flagged ? '⚑ Unflag' : '⚑ Flag for review';
      flag.classList.toggle('is-flagged', flagged);
    }
  }

  function selectAnswer(exam, idx) {
    var qid = exam.order[exam.cursor];
    if (exam.answers[qid] === idx) delete exam.answers[qid]; // tap again to clear
    else exam.answers[qid] = idx;
    PGRE.store.save();
    var box = document.getElementById('exam-q');
    if (box) box.querySelectorAll('.choice').forEach(function (b) {
      b.classList.toggle('is-picked', parseInt(b.getAttribute('data-idx'), 10) === exam.answers[qid]);
    });
    refreshPaletteCell(exam, exam.cursor);
    updateProgress(exam);
  }

  function toggleFlag(exam) {
    var qid = exam.order[exam.cursor];
    var i = exam.flags.indexOf(qid);
    if (i === -1) exam.flags.push(qid); else exam.flags.splice(i, 1);
    PGRE.store.save();
    var box = document.getElementById('exam-q');
    // refresh the flag chip in the meta line without re-typesetting the choices
    if (box) {
      var meta = box.querySelector('.exam-qmeta');
      var chip = box.querySelector('.exam-flagchip');
      if (exam.flags.indexOf(qid) !== -1 && meta && !chip) {
        meta.insertAdjacentHTML('beforeend', '<span class="chip exam-flagchip">⚑ Flagged for review</span>');
      } else if (chip && exam.flags.indexOf(qid) === -1) {
        chip.remove();
      }
    }
    updateNav(exam);
    refreshPaletteCell(exam, exam.cursor);
  }

  function goTo(exam, i) {
    exam.cursor = i;
    PGRE.store.save();
    renderQuestion(exam);
    refreshPaletteActive(exam);
    var main = document.querySelector('.exam-main');
    if (main) main.scrollTop = 0;
  }

  /* ——— Palette ——— */
  function paletteCell(exam, i) {
    var qid = exam.order[i];
    var cls = 'pal-cell';
    if (i === exam.cursor) cls += ' is-current';
    if (exam.answers[qid] != null) cls += ' is-answered';
    if (exam.flags.indexOf(qid) !== -1) cls += ' is-flagged';
    return '<button class="' + cls + '" data-goto="' + i + '" title="Question ' + (i + 1) + '">' +
      (i + 1) + '</button>';
  }
  function renderPalette(exam) {
    var grid = document.getElementById('exam-palette');
    if (!grid) return;
    var html = '';
    for (var i = 0; i < exam.order.length; i++) html += paletteCell(exam, i);
    grid.innerHTML = html;
    grid.querySelectorAll('[data-goto]').forEach(function (b) {
      b.addEventListener('click', function () { goTo(exam, parseInt(b.getAttribute('data-goto'), 10)); });
    });
    updateProgress(exam);
  }
  function cellAt(i) {
    var grid = document.getElementById('exam-palette');
    return grid ? grid.querySelectorAll('.pal-cell')[i] : null;
  }
  function refreshPaletteCell(exam, i) {
    var cell = cellAt(i);
    if (!cell) return;
    var qid = exam.order[i];
    cell.classList.toggle('is-answered', exam.answers[qid] != null);
    cell.classList.toggle('is-flagged', exam.flags.indexOf(qid) !== -1);
  }
  function refreshPaletteActive(exam) {
    var grid = document.getElementById('exam-palette');
    if (!grid) return;
    grid.querySelectorAll('.pal-cell').forEach(function (c, i) {
      c.classList.toggle('is-current', i === exam.cursor);
    });
  }
  function updateProgress(exam) {
    var el = document.getElementById('exam-progress');
    if (el) el.textContent = answeredCount(exam) + ' / ' + exam.order.length + ' answered';
  }

  /* ——— Countdown ——— */
  function startTimer(exam) {
    stopTimer();
    lastTickAt = Date.now();  // (re)anchor: paused/hidden spans before this don't count
    updateTimer(exam);
    if (exam.paused) return; // resumes when the pause overlay is dismissed
    timer = setInterval(function () { tick(exam); }, 1000);
  }
  function tick(exam) {
    // Count real elapsed wall-clock, not one second per fire: a throttled
    // background tab fires late (or rarely), and adding a flat +1s there would
    // gift the sitter extra time. Pause-aware — startTimer re-anchors on resume.
    var now = Date.now();
    var delta = (now - lastTickAt) / 1000;
    lastTickAt = now;
    if (delta > 0) exam.durationSec += delta;   // guard against clock skew
    updateTimer(exam);
    if (now - lastPersist > 4000) { lastPersist = now; PGRE.store.save(); }
    if (exam.durationSec >= exam.limitSec) {
      exam.durationSec = exam.limitSec;
      stopTimer();
      PGRE.store.save();
      doSubmit(exam, true);
    }
  }
  function updateTimer(exam) {
    var el = document.getElementById('exam-timer');
    if (!el) return;
    var remaining = Math.max(0, exam.limitSec - exam.durationSec);
    var amber = remaining <= 15 * 60 && remaining > 5 * 60;
    var red = remaining <= 5 * 60;
    // status is icon + label, never colour alone (DESIGN §6)
    el.innerHTML = (red || amber ? '<span class="exam-timer-warn" aria-hidden="true">⚠</span>' : '') +
      '<span class="exam-timer-clock">' + fmtClock(remaining) + '</span>' +
      (red ? '<span class="exam-timer-note">under 5 min</span>'
           : amber ? '<span class="exam-timer-note">under 15 min</span>' : '');
    el.classList.toggle('is-amber', amber);
    el.classList.toggle('is-red', red);
  }

  /* ——— Pause (practice-integrity) ——— */
  function togglePause(exam) {
    if (exam.paused) {
      exam.paused = false; PGRE.store.save();
      hideModal(); startTimer(exam);
    } else {
      exam.paused = true; stopTimer(); PGRE.store.save();
      showPauseOverlay(exam);
    }
  }
  function showPauseOverlay(exam) {
    var host = document.getElementById('exam-modal-host');
    if (!host) return;
    host.innerHTML = '<div class="exam-overlay is-pause"><div class="exam-overlay-card card">' +
      '<h2>Paused</h2>' +
      '<p class="muted">The clock is stopped and the questions are hidden. A real GRE can’t be ' +
      'paused — use this sparingly so your practice reflects true test conditions.</p>' +
      '<div class="btn-row"><button class="btn btn-primary" id="exam-resume-btn">Resume exam</button></div>' +
    '</div></div>';
    document.getElementById('exam-resume-btn').addEventListener('click', function () { togglePause(exam); });
  }
  function hideModal() { var h = document.getElementById('exam-modal-host'); if (h) h.innerHTML = ''; }

  /* ——— Submit (custom in-page modal — never window.confirm) ——— */
  function confirmSubmit(exam) {
    var host = document.getElementById('exam-modal-host');
    if (!host) return;
    var done = answeredCount(exam);
    var blank = exam.order.length - done;
    var flagged = exam.flags.length;
    host.innerHTML = '<div class="exam-overlay"><div class="exam-overlay-card card">' +
      '<h2>Submit exam?</h2>' +
      '<p class="muted">You have answered <strong>' + done + '</strong> of ' + exam.order.length +
      ' questions' + (blank ? ', leaving <strong>' + blank + '</strong> blank' : '') +
      (flagged ? ', with <strong>' + flagged + '</strong> flagged for review' : '') +
      '. Blanks are scored as incorrect, and this can’t be undone.</p>' +
      '<div class="btn-row">' +
        '<button class="btn btn-primary" id="exam-confirm">Submit &amp; score</button>' +
        '<button class="btn btn-ghost" id="exam-cancel">Keep working</button>' +
      '</div></div></div>';
    document.getElementById('exam-confirm').addEventListener('click', function () { doSubmit(exam, false); });
    document.getElementById('exam-cancel').addEventListener('click', hideModal);
  }

  function doSubmit(exam, auto) {
    stopTimer();
    hideModal();
    PGRE.examEngine.submit(exam);
    setFullscreen(false);
    if (auto) PGRE.toast('Time — your exam was submitted automatically.', 'info');
    location.hash = '#/exam/review/' + exam.id;
  }

  /* ——————————————————————————— Results / review ——————————————————————————— */
  function renderResults(id) {
    leaveRoom();
    var eng = PGRE.examEngine, ui = PGRE.ui;
    var exam = eng.byId(id);
    if (!exam || !exam.submittedAt) { renderSetup(); return; }
    var pct = exam.total ? Math.round(100 * exam.raw / exam.total) : 0;
    var verdict = pct >= 85 ? 'Exceptional — that would be a very strong scaled score.' :
                  pct >= 65 ? 'Strong sitting. Mine the misses below for the last points.' :
                  pct >= 45 ? 'Solid base — the per-topic table shows where to aim next.' :
                  'A tough one. Every miss below is now in your mistake book for review.';

    var html = '<div class="card exam-result-hero">' +
      '<div class="exam-result-head">' +
        '<a class="btn btn-ghost btn-sm" href="#/exam">← All simulations</a>' +
        '<span class="chip">' + eng.FORMAT_META[exam.format].label + '</span>' +
        '<span class="muted">' + fmtDate(exam.submittedAt) + '</span>' +
      '</div>' +
      '<div class="summary-score">' + exam.raw + ' / ' + exam.total +
        '<span class="summary-pct">' + pct + '%</span></div>' +
      '<p class="muted">' + verdict + '</p>' +
      '<div class="stat-row exam-result-stats">' +
        ui.statTile('Raw score', exam.raw + ' / ' + exam.total) +
        ui.statTile('Scaled estimate', '~' + exam.scaledEst, 'ballpark, not ETS-equated') +
        ui.statTile('Time used', fmtDur(exam.durationSec), 'of ' + fmtDur(exam.limitSec)) +
        ui.statTile('Flagged', String(exam.flags.length)) +
      '</div>' +
      (exam.missing ? '<p class="muted exam-missing-note">⚠ ' + exam.missing + ' question' +
        (exam.missing === 1 ? '' : 's') + ' could not be matched to the current bank and ' +
        (exam.missing === 1 ? 'was' : 'were') + ' scored as incorrect — the bank changed ' +
        'since this sitting.</p>' : '') +
      '<p class="muted exam-scale-note">Scaled scores run 200–990; this estimate is interpolated ' +
      'from a hand-averaged lookalike of released ETS practice-test tables and is a rough ballpark only.</p>' +
    '</div>';

    // Per-topic breakdown
    html += '<div class="card"><h2>By topic</h2><div class="exam-topic-table">';
    eng.WEIGHTS.forEach(function (w) {
      var pt = exam.perTopic && exam.perTopic[w.topic];
      if (!pt || !pt.total) return;
      var t = PGRE.topicById(w.topic);
      var tp = Math.round(100 * pt.right / pt.total);
      html += '<div class="exam-topic-row">' +
        '<span class="exam-topic-name">' + ui.monogram(t) + ' ' + t.name + '</span>' +
        '<span class="exam-topic-meter">' + ui.meter(tp) + '</span>' +
        '<span class="exam-topic-score">' + pt.right + '/' + pt.total + ' · ' + tp + '%</span>' +
      '</div>';
    });
    html += '</div><p class="muted exam-topic-foot">This breakdown feeds the weak-topic ranking in ' +
      '<a href="#/analytics">analytics</a>.</p></div>';

    // Question-by-question review
    html += '<div class="card"><h2>Question-by-question review</h2>' +
      '<p class="muted">Your pick beside the correct answer, with the full solution. ' +
      '⚑ marks questions you flagged.</p></div>';
    exam.order.forEach(function (qid, i) {
      html += reviewCard(exam, qid, i);
    });

    html += '<div class="card"><div class="btn-row">' +
      '<a class="btn btn-primary" href="#/exam">Back to simulations</a>' +
      '<a class="btn btn-ghost" href="#/analytics">Open analytics →</a>' +
    '</div></div>';

    root().innerHTML = html;
    PGRE.typesetMath(root());
  }

  /* PROPOSAL #12 — "Why the other choices tempt": an expandable list of the
     non-correct choices with their mined per-choice explanation (q.choiceSols[idx]).
     The field is optional (the mining pipeline fills it into the bank over time),
     so an absent or all-null array yields '' and no empty block shows. Choice text
     and explanation are trusted bank HTML/LaTeX, rendered like q.sol / q.choices and
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

  function reviewCard(exam, qid, i) {
    var ui = PGRE.ui, q = PGRE.questionById(qid);
    var flagged = exam.flags.indexOf(qid) !== -1;
    var picked = exam.answers[qid] != null ? exam.answers[qid] : null;
    if (!q) {
      return '<div class="card exam-review-q"><div class="miss-head">' +
        '<span class="muted">Question ' + (i + 1) + ' — no longer in the bank</span></div></div>';
    }
    var t = PGRE.topicById(q.topic);
    var correct = picked === q.answer;
    var html = '<div class="card exam-review-q' + (correct ? ' is-right' : '') + '">' +
      '<div class="miss-head">' +
        '<span class="hist-mark ' + (correct ? 'is-good' : 'is-bad') + '">' + (correct ? '✓' : '✗') + '</span>' +
        (t ? ui.monogram(t) : '') +
        '<span class="muted">Question ' + (i + 1) + '</span>' +
        (flagged ? '<span class="chip exam-flagchip">⚑ Flagged</span>' : '') +
      '</div>' +
      '<div class="q-text">' + q.q + '</div>' +
      '<div class="miss-picks">';
    if (picked == null) {
      html += '<div class="miss-pick is-bad"><span class="fb-icon">✗</span><strong>Left blank</strong></div>';
    } else if (!correct) {
      html += '<div class="miss-pick is-bad"><span class="fb-icon">✗</span><strong>You picked ' +
        LETTERS[picked] + '</strong> — <span class="miss-pick-body">' + q.choices[picked] + '</span></div>';
    }
    html += '<div class="miss-pick is-good"><span class="fb-icon">✓</span><strong>' +
      (correct ? 'You picked ' : 'Correct: ') + LETTERS[q.answer] + '</strong> — ' +
      '<span class="miss-pick-body">' + q.choices[q.answer] + '</span></div>' +
    '</div>' +
    '<details class="miss"><summary>Solution</summary>' +
      '<div class="solution"><div class="solution-label">Solution</div>' + q.sol + '</div></details>' +
    distractorBlock(q) +
    '</div>';
    return html;
  }

  /* ——— View entry points ——— */
  return {
    render: function () {
      return '<div id="exam-root"><div class="card"><p class="muted">Loading the exam simulator…</p></div></div>';
    },
    mount: function (params) {
      whenEngine(function () {
        if (params.sub === 'run') renderRoom();
        else if (params.sub === 'review') renderResults(params.sub2);
        else renderSetup();
      });
    }
  };
})();
