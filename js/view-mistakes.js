/* Mistake book — every missed question, kept permanently: your wrong pick
   beside the solution, re-drillable anytime, resurfaced on the spaced-
   repetition ladder (js/srs.js). Solving never removes an entry; only the
   manual Archive action hides it (a fresh miss reopens it). */
window.PGRE = window.PGRE || {};
PGRE.views = PGRE.views || {};

PGRE.views.mistakes = (function () {
  var LETTERS = ['A', 'B', 'C', 'D', 'E'];
  var drill = null; // { qs, st, i, skipped, done, reviewing, sid, qStart, assess } — see startDrill
  var lastRenderAt = 0; // stamps each drill render so a double-click can't click through
  var keyBound = false; // the document keydown listener is installed once
  var paceTimer = null; // live per-question chip; same contract as view-practice.js
  var topicFilter = 'all'; // additional book filter; 'all' or a PGRE.TOPICS id

  function settings() { return PGRE.store.state.settings || {}; }

  /* ——— Pace trainer (mirrors js/view-practice.js #4) ———
     Mistake drills already stamp attempt.ms via recordAnswer; this is the
     missing live chip + post-answer over/under mark gated by paceTrainer. */
  var PACE_GRACE_MS = 5000; // a click inside the first 5 s is not pace data

  function clearPace() {
    if (paceTimer) { clearInterval(paceTimer); paceTimer = null; }
  }

  function startPaceTimer() {
    clearPace();
    if (!settings().paceTrainer) return;
    if (!drill || drill.done) return;
    paceTimer = setInterval(tickPace, 1000);
  }

  function tickPace() {
    var chip = document.getElementById('pace-chip');
    if (!chip || !drill || drill.done) { clearPace(); return; }
    var sec = Math.round((Date.now() - drill.qStart) / 1000);
    var target = settings().paceTargetSec || 103;
    chip.textContent = sec + ' s';
    chip.classList.toggle('pace-over', sec > target);
  }

  function paceMark(elapsedMs) {
    if (!settings().paceTrainer) return '';
    if (elapsedMs == null || elapsedMs < PACE_GRACE_MS) return '';
    var sec = Math.round(elapsedMs / 1000);
    var target = settings().paceTargetSec || 103;
    var over = sec > target;
    return '<div class="pace-mark ' + (over ? 'pace-over' : 'pace-under') + '">' +
      sec + ' s — ' + (over ? 'over pace' : 'under pace') +
      ' <span class="pace-target">(target ' + target + ' s)</span></div>';
  }

  function root() { return document.getElementById('mistakes-root'); }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  /* ——— ITEM 8: user-set drill size ———
     How many questions "Drill due" / "Drill all" pull from the pool. Persisted in
     state.settings.mistakeDrillSize via PGRE.store.save(). Read defensively: an
     absent / 0 / invalid value all mean "draw the whole pool" (the original
     behaviour). A custom value is clamped to 1–99 to match the number input. */
  function drillSize() {
    var s = PGRE.store.state.settings || {};
    var n = parseInt(s.mistakeDrillSize, 10);
    if (!n || n < 1) return 0;          // 0 = the whole pool
    return n > 99 ? 99 : n;
  }
  function setDrillSize(n) {
    var s = PGRE.store.state.settings || (PGRE.store.state.settings = {});
    s.mistakeDrillSize = (n && n > 0) ? Math.min(99, n) : 0;
    PGRE.store.save();
  }
  /* Draw a random min(N, pool) sample; 0 or N≥pool keeps the whole pool.
     startDrill() reshuffles anyway, so the extra shuffle here is harmless. */
  function sampleForDrill(qs) {
    var n = drillSize();
    if (!n || n >= qs.length) return qs;
    return shuffle(qs).slice(0, n);
  }
  /* Honest button caption: "Drill due (5 of 7)" when a size caps the pool,
     plain "Drill due (7)" when the whole pool will be drawn. An empty pool
     gets plain-language copy instead of a "(0)" that looks like a live action. */
  function drillLabel(base, pool, emptyText) {
    if (!pool) return emptyText;
    var n = drillSize();
    return (n && n < pool) ? (base + ' (' + n + ' of ' + pool + ')')
                           : (base + ' (' + pool + ')');
  }
  function filterByTopic(list) {
    return PGRE.srs.filterByTopic(list, topicFilter);
  }

  /* Topic dropdown — same hist-select control as History / Notes. Lives next
     to the existing drill-size chips; does not replace them. */
  function topicFilterHTML() {
    var opts = '<option value="all"' + (topicFilter === 'all' ? ' selected' : '') +
      '>All topics</option>';
    PGRE.TOPICS.forEach(function (t) {
      opts += '<option value="' + t.id + '"' + (topicFilter === t.id ? ' selected' : '') +
        '>' + PGRE.ui.esc(t.name) + '</option>';
    });
    return '<div class="filter-row" id="miss-topic-row">' +
      '<select id="miss-topic" class="hist-select" aria-label="Filter by topic">' +
        opts + '</select></div>';
  }

  /* Preset chips (All / 5 / 10 / 15) + a custom number input, reusing the focus
     page's .focus-chip / .focus-custom-in look. Active preset reflects the saved
     size; a non-preset size prefills the custom box. */
  function drillSizeHTML() {
    var n = drillSize();
    var presets = [[0, 'All'], [5, '5'], [10, '10'], [15, '15']];
    var isPreset = false, chips = '';
    presets.forEach(function (p) {
      var on = (p[0] === n);
      if (on) isPreset = true;
      chips += '<button type="button" class="focus-chip' + (on ? ' active' : '') +
        '" data-size="' + p[0] + '">' + p[1] + '</button>';
    });
    var customVal = (!isPreset && n > 0) ? String(n) : '';
    return '<div class="chip-row" id="drill-size-row">' +
      '<span class="muted" style="align-self:center;">Questions per drill</span>' +
      chips +
      '<span class="focus-chip focus-chip-custom">' +
        '<input id="drill-size-custom" class="focus-custom-in" type="number" min="1" max="99" ' +
          'inputmode="numeric" placeholder="custom" aria-label="Custom questions per drill" ' +
          'value="' + customVal + '"></span>' +
    '</div>';
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

  /* Most recent recorded self-assessment for a question (confidence and/or
     tags — 'slow'/'forgot'), if any. Returns the attempt row or null. */
  function lastAssess(qid) {
    var arr = PGRE.store.state.attempts;
    for (var i = arr.length - 1; i >= 0; i--) {
      if (arr[i].qid === qid &&
          (arr[i].confidence || (arr[i].tags && arr[i].tags.length))) return arr[i];
    }
    return null;
  }

  /* ——— The book ——— */
  function missCard(e) {
    var ui = PGRE.ui, q = e.q, mk = e.mk;
    var t = PGRE.topicById(q.topic) || { id: 'xx', short: '?', name: 'Unknown topic' };
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
    // ITEM 7 — the book (list) page must NOT reveal the answer. Show the five
    // choices as a plain, non-interactive list: disabled .choice buttons (the
    // exact look practice leaves behind after answering) get no hover, no pointer,
    // and — crucially — NO is-answer / is-wrong marker, so nothing on the always-
    // visible card signals the key, not even by elimination. The reveal now lives
    // one click away, inside the <details> Solution block below.
    html += '<div class="choices miss-choices">';
    q.choices.forEach(function (c, idx) {
      html += '<button class="choice" disabled>' +
        '<span class="choice-letter">' + LETTERS[idx] + '</span>' +
        '<span class="choice-body">' + c + '</span></button>';
    });
    html += '</div>';
    var la = lastAssess(q.id);
    if (la) {
      var bits = [];
      if (la.confidence) bits.push(la.confidence === 'guess' ? 'Guessed' : 'Knew it');
      (la.tags || []).forEach(function (tg) { bits.push(PGRE.assess.LABELS[tg] || tg); });
      html += '<div class="conf-note muted">Your last self-assessment on this question: ' +
        '<strong>' + bits.join(' · ') + '</strong></div>';
    }
    html += '<details class="miss"><summary>Solution</summary>';
    if (wrong != null) {
      // moved here from the always-visible card body: your pick + the correct
      // letter are now gated behind the same one click as the worked solution.
      html += '<div class="miss-picks">' +
        '<div class="miss-pick is-bad"><span class="fb-icon">✗</span><strong>You picked ' +
          LETTERS[wrong] + '</strong> — <span class="miss-pick-body">' + q.choices[wrong] + '</span></div>' +
        '<div class="miss-pick is-good"><span class="fb-icon">✓</span><strong>Correct: ' +
          LETTERS[q.answer] + '</strong> — <span class="miss-pick-body">' + q.choices[q.answer] + '</span></div>' +
      '</div>';
    }
    html += '<div class="solution"><div class="solution-label">Solution</div>' + q.sol + '</div></details>' +
    distractorBlock(q) +
    '</div>';
    return html;
  }

  function renderBook() {
    clearPace();
    drill = null;
    if (PGRE.nav) PGRE.nav.setTrail([]);   // BUNDLE G: book list is the base screen
    var openAll = PGRE.srs.openMistakes();
    var dueAll = PGRE.srs.dueMistakes();
    var archivedAll = PGRE.srs.archivedMistakes();
    var hasBook = openAll.length || archivedAll.length;
    var open = filterByTopic(openAll);
    var due = filterByTopic(dueAll);
    var archived = filterByTopic(archivedAll);

    // due first (oldest due date first), then upcoming by due date
    open.sort(function (a, b) {
      return (a.mk.srs ? a.mk.srs.due : '9999') < (b.mk.srs ? b.mk.srs.due : '9999') ? -1 : 1;
    });

    var html = '<div class="card page-head"><h1>Mistake book</h1>' +
      '<p class="muted">Every question you have missed, kept until <em>you</em> archive it. ' +
      'Re-solving a mistake never removes it — it schedules the next review further out ' +
      '(' + PGRE.srs.MISTAKE_LADDER.join(' → ') + ' days). Missing it again resets the ladder.</p>' +
      (hasBook ? topicFilterHTML() : '') +
      '<div class="btn-row">' +
        '<button class="btn btn-primary" id="drill-due"' + (due.length ? '' : ' disabled') + '>' +
          drillLabel('Drill due', due.length, 'Nothing due today') + '</button>' +
        '<button class="btn btn-ghost" id="drill-all"' + (open.length ? '' : ' disabled') + '>' +
          drillLabel('Drill all', open.length, 'Nothing to drill') + '</button>' +
        (open.length ? '<button class="btn btn-ghost" id="print-mistakes">Print / PDF</button>' : '') +
      '</div>' +
      // The size picker only means something once there is a pool to draw from.
      (open.length ? drillSizeHTML() : '') +
      '</div>';

    if (!open.length && !archived.length) {
      if (!hasBook) {
        html += '<div class="card placeholder">' +
          '<p><strong>Nothing in the book yet.</strong></p>' +
          '<p class="muted">Miss a question in <a href="#/practice/all">practice</a> and it lands here — ' +
          'with your wrong pick, the solution, and a review schedule.</p></div>';
      } else {
        html += '<div class="card placeholder" id="miss-empty-topic">' +
          '<p class="muted">No mistakes in this topic.</p></div>';
      }
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
      startDrill(sampleForDrill(filterByTopic(PGRE.srs.dueMistakes()).map(function (e) { return e.q; })));
    });
    if (da) da.addEventListener('click', function () {
      startDrill(sampleForDrill(filterByTopic(PGRE.srs.openMistakes()).map(function (e) { return e.q; })));
    });
    var topicSel = document.getElementById('miss-topic');
    if (topicSel) topicSel.addEventListener('change', function () {
      topicFilter = topicSel.value || 'all';
      renderBook();
    });

    // ITEM 8 — drill-size control: preset chips + custom input, saved on change.
    // Labels update in place (mirrors the focus page's goal picker) so editing the
    // custom box never re-renders the book and steals the input's focus. due/open
    // are captured from this render; the disabled state depends only on the pool,
    // so it never changes with size — only the caption does.
    function applyLabels() {
      if (dd) dd.textContent = drillLabel('Drill due', due.length, 'Nothing due today');
      if (da) da.textContent = drillLabel('Drill all', open.length, 'Nothing to drill');
    }
    var sizeCustom = document.getElementById('drill-size-custom');
    root().querySelectorAll('.focus-chip[data-size]').forEach(function (b) {
      b.addEventListener('click', function () {
        setDrillSize(parseInt(b.getAttribute('data-size'), 10) || 0);
        if (sizeCustom) sizeCustom.value = '';
        root().querySelectorAll('.focus-chip[data-size]').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        applyLabels();
      });
    });
    if (sizeCustom) {
      sizeCustom.addEventListener('input', function () {
        var n = parseInt(sizeCustom.value, 10);
        setDrillSize((n > 0) ? Math.min(99, n) : 0);   // empty/≤0 falls back to "all"
        root().querySelectorAll('.focus-chip[data-size]').forEach(function (x) { x.classList.remove('active'); });
        applyLabels();
      });
      // Snap an out-of-range / fractional / non-positive entry to what was saved
      // once focus leaves the box, so the number shown matches what drills draw.
      sizeCustom.addEventListener('blur', function () {
        var n = parseInt(sizeCustom.value, 10);
        var norm = (n > 0) ? String(Math.min(99, n)) : '';
        if (sizeCustom.value !== norm) sizeCustom.value = norm;
      });
    }
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
        mk.archivedAt = mk.lastTouchedAt = new Date().toISOString();
        PGRE.gamify.checkAchievements(); // before save() so a just-unlocked badge persists now
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
        mk.lastTouchedAt = new Date().toISOString();
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
    var open = filterByTopic(PGRE.srs.openMistakes());
    if (!open.length) return;
    open.sort(function (a, b) {
      return (a.mk.srs ? a.mk.srs.due : '9999') < (b.mk.srs ? b.mk.srs.due : '9999') ? -1 : 1;
    });
    var topicName = topicFilter !== 'all'
      ? ((PGRE.topicById(topicFilter) || {}).name || topicFilter)
      : '';
    var html = '<header class="ps-head"><h1>Physics GRE — Mistake Book</h1>' +
      '<p class="ps-sub">' + open.length + ' entr' + (open.length === 1 ? 'y' : 'ies') +
      (topicName ? ' · ' + PGRE.ui.esc(topicName) : '') +
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

  /* ——— Re-drill: same answering pipeline as practice (mode: mistakes) ———
     The drill is browsable, not a one-way conveyor:
     - drill.qs holds the questions in play, drill.st the parallel per-question
       result (null while unanswered), drill.i the cursor.
     - ← Back / Next → and the question palette move the cursor freely, so a
       question can be revisited (and re-answered) or left for later.
     - Skip DROPS the question from this drill for good (spliced out of both
       arrays, mirroring the formula deck's skipCard) — nothing is recorded, so
       the question keeps its place in the book and its existing review date.
     - Re-answering REPLACES the earlier answer: gamify.revertAnswer() unwinds
       the first attempt (row, XP, tallies, mistake-book/SRS entry) before the
       new one is recorded, so one question never moves the ladder twice. */
  function startDrill(qs) {
    if (!qs.length) return;
    if (PGRE.nav) PGRE.nav.setTrail(['Drill']);   // BUNDLE G: drill is live
    var order = shuffle(qs);
    drill = { qs: order, st: order.map(function () { return null; }), i: 0,
              skipped: 0, done: false, reviewing: false,
              sid: PGRE.gamify.beginSession('mistakes', 'mistakes', qs.length) };
    renderDrillQuestion();
  }

  function answeredCount() {
    var n = 0;
    drill.st.forEach(function (s) { if (s) n++; });
    return n;
  }

  function correctCount() {
    var n = 0;
    drill.st.forEach(function (s) { if (s && s.correct) n++; });
    return n;
  }

  function earnedXP() {
    var n = 0;
    drill.st.forEach(function (s) { if (s) n += s.xp; });
    return n;
  }

  /* Numbered jump grid — reuses the exam room's .pal-cell look.
     While the drill runs the cells only say answered / not answered: a
     correct-vs-missed tint would tell you, from across the card, whether the
     answer you are about to walk back to was the right one, which is exactly
     what revisiting is supposed to make you recall. The results palette (with
     the tints) belongs to the summary. Answered cells open a read-only review
     of that question; unanswered stay inert. Nothing is re-recorded. */
  function paletteHTML(results, current) {
    if (!results && current == null) current = drill.i;
    var cells = '';
    drill.qs.forEach(function (q, n) {
      var st = drill.st[n];
      var cls = 'pal-cell';
      if (st) cls += results ? (st.correct ? ' is-correct' : ' is-wrong') : ' is-answered';
      if (current != null && n === current) cls += ' is-current';
      var label = 'Question ' + (n + 1);
      if (st) label += results ? (st.correct ? ', correct' : ', missed') : ', answered';
      else label += results ? ', not answered' : ', unanswered';
      if (current != null && n === current) label += ', current';
      var attrs;
      if (results) {
        if (st) {
          attrs = ' data-review="' + n + '" title="Review this question"';
          label += ', review';
        } else {
          attrs = ' disabled';
        }
      } else {
        attrs = ' data-goto="' + n + '"';
      }
      cells += '<button type="button" class="' + cls + '"' + attrs +
        ' aria-label="' + label + '">' + (n + 1) + '</button>';
    });
    return '<div class="drill-palette">' +
      '<div class="exam-palette-title">' +
        (results ? 'How this drill went' : 'Questions in this drill') + '</div>' +
      '<div class="exam-palette-grid">' + cells + '</div>' +
      '<div class="exam-legend drill-legend">' +
        (results
          ? '<span class="exam-legend-item"><span class="pal-swatch sw-correct"></span>Correct</span>' +
            '<span class="exam-legend-item"><span class="pal-swatch sw-wrong"></span>Missed</span>' +
            '<span class="exam-legend-item"><span class="pal-swatch"></span>Not answered</span>'
          : '<span class="exam-legend-item"><span class="pal-swatch"></span>Unanswered</span>' +
            '<span class="exam-legend-item"><span class="pal-swatch sw-answered"></span>Answered</span>') +
      '</div></div>';
  }

  function neighborAnswered(from, dir) {
    if (!drill) return -1;
    for (var i = from + dir; i >= 0 && i < drill.qs.length; i += dir) {
      if (drill.st[i]) return i;
    }
    return -1;
  }

  function bindReviewJumps() {
    root().querySelectorAll('[data-review]').forEach(function (b) {
      b.addEventListener('click', function () {
        renderDrillReview(parseInt(b.getAttribute('data-review'), 10));
      });
    });
  }

  /* The feedback panel under an answered question. `fresh` (just answered) gets
     the interactive self-assessment row; a re-revealed answer shows what was
     recorded instead, so re-reading a question never rewrites its assessment. */
  function feedbackHTML(q, st, fresh, locked) {
    var mk = PGRE.store.state.mistakes[q.id];
    var nextDue = mk && mk.srs ? PGRE.srs.ivlLabel(PGRE.srs.daysUntil(mk.srs.due)) : '';
    var html = '<div class="feedback reveal-in ' + (st.correct ? 'feedback-good' : 'feedback-bad') + '">' +
      '<span class="fb-icon">' + (st.correct ? '✓' : '✗') + '</span>' +
      '<strong>' + (st.correct ? 'Correct — next review in ' + nextDue
                               : 'Incorrect — the answer is ' + LETTERS[q.answer] +
                                 '; back to the bottom of the ladder') + '</strong>' +
      '<span class="fb-xp">+' + st.xp + ' XP</span>' +
    '</div>';
    html += paceMark(st.ms != null ? st.ms : (st.row && st.row.ms));
    if (fresh) {
      html += PGRE.assess.html(PGRE.store.state.settings.keyboard);
    } else {
      // read the assessment off THIS drill's own attempt row (st.row, which
      // PGRE.assess stamps in place) — lastAssess() would happily surface a
      // tag from some practice session weeks ago as if it belonged here
      var bits = [];
      if (st.row && st.row.confidence) bits.push(st.row.confidence === 'guess' ? 'Guessed' : 'Knew it');
      ((st.row && st.row.tags) || []).forEach(function (tg) { bits.push(PGRE.assess.LABELS[tg] || tg); });
      if (bits.length) {
        html += '<div class="conf-note muted">Your self-assessment: <strong>' +
          bits.join(' · ') + '</strong></div>';
      }
      if (!locked) {
        html += '<div class="drill-reanswer-hint muted">Select a different choice, then Confirm or double-click — ' +
          'it replaces this answer. Leave and come back and the question is blank again; ' +
          'confirming the same choice brings this result back.</div>';
      }
    }
    html += '<div class="solution"><div class="solution-label">Solution</div>' + q.sol + '</div>' +
      distractorBlock(q);
    return html;
  }

  /* opts:
       fresh  — rendered right after an answer: markers, solution and the
                interactive assessment row, and no scroll back to the top.
       reveal — the stored result put back on screen because you re-picked the
                choice you had already committed to (nothing is re-recorded).
     Neither flag means a plain visit, and then an answered question is
     indistinguishable from an unanswered one — not even which choice you took
     last time, since seeing your own earlier pick is itself a cue and the point
     of coming back is to recall the question cold. The palette (answered /
     unanswered) is the only record that you have been here; the mechanic is
     explained in the feedback panel, where the result is already on screen. */
  function renderDrillQuestion(opts) {
    opts = opts || {};
    lastRenderAt = Date.now();
    var q = drill.qs[drill.i];
    var st = drill.st[drill.i];
    var show = st && (opts.fresh || opts.reveal);   // is the result on screen?
    var t = PGRE.topicById(q.topic) || { id: 'xx', short: '?', name: 'Unknown topic' };
    var done = answeredCount();
    var keys = PGRE.store.state.settings.keyboard;
    var html = '<div class="card practice-card">' +
      '<div class="practice-meta">' +
        '<span>Mistake drill — ' + (drill.i + 1) + ' of ' + drill.qs.length + '</span>' +
        '<span class="chip">' + t.name + '</span>' +
        '<span class="chip">' + done + ' answered</span>' +
        (drill.skipped ? '<span class="chip">' + drill.skipped + ' skipped</span>' : '') +
        (settings().paceTrainer && !show
          ? '<span class="chip pace-chip" id="pace-chip" title="Time on this question">0 s</span>'
          : '') +
      '</div>' +
      PGRE.ui.meter(100 * done / drill.qs.length, 'meter-thin') +
      '<div class="q-text">' + q.q + '</div>' +
      '<div class="choices">';
    q.choices.forEach(function (c, idx) {
      var cls = 'choice';
      if (show) {
        if (idx === q.answer) cls += ' is-answer';
        if (idx === st.picked && !st.correct) cls += ' is-wrong';
      }
      html += '<button class="' + cls + '" data-idx="' + idx + '" aria-pressed="' +
        (show && idx === st.picked ? 'true' : 'false') + '">' +
        '<span class="choice-letter">' + LETTERS[idx] + '</span>' +
        '<span class="choice-body">' + c + '</span></button>';
    });
    html += '</div>';
    html += '<div class="btn-row choice-commit-row">' +
      '<button type="button" class="btn btn-primary" id="confirm-btn" disabled>Confirm</button>' +
      '<span class="practice-keys muted">or double-click a choice</span></div>';
    if (keys) {
      html += '<div class="practice-keys muted">' +
        '<span class="key-hint">A</span>–<span class="key-hint">E</span> select · ' +
        '<span class="key-hint">Enter</span> confirm · ' +
        '<span class="key-hint">←</span> back · <span class="key-hint">→</span> next · ' +
        '<span class="key-hint">S</span> skip</div>';
    }
    html += '<div id="feedback">' + (show ? feedbackHTML(q, st, !!opts.fresh) : '') + '</div>' +
      '<div class="btn-row drill-navrow">' +
        '<button class="btn btn-ghost" id="drill-prev"' + (drill.i === 0 ? ' disabled' : '') +
          '>← Back</button>' +
        // Skip keeps its slot (disabled) on an answered question: dropping the
        // button would slide Next → into its place, and a slow double-click on
        // Next would then land on Skip — irreversible, on the next question.
        '<button class="btn btn-ghost" id="drill-skip"' + (st ? ' disabled' : '') +
          '>Skip</button>' +
        '<button class="btn ' + (st ? 'btn-primary' : 'btn-ghost') + '" id="drill-next"' +
          (drill.i + 1 >= drill.qs.length ? ' disabled' : '') + '>Next →</button>' +
        '<button class="btn ' + (done >= drill.qs.length ? 'btn-primary' : 'btn-ghost') +
          ' drill-finish" id="drill-finish">Finish drill</button>' +
      '</div>' +
      paletteHTML() +
      '</div>';
    root().innerHTML = html;
    PGRE.typesetMath(root());
    if (window.PGRE && PGRE.motion && PGRE.motion.animateMeter) {
      var mf = root().querySelector('.meter-thin .meter-fill');
      if (mf) PGRE.motion.animateMeter(mf, 100 * done / drill.qs.length);
    }
    if (window.PGRE && PGRE.motion && PGRE.motion.countUp) {
      var xpEl = root().querySelector('.fb-xp');
      if (xpEl) PGRE.motion.countUp(xpEl, st.xp, { duration: 600, format: function (n) { return '+' + Math.round(n) + ' XP'; } });
    }
    // in-place swap: route()'s reset doesn't run here. Answering or revealing
    // keeps your place; only actually moving to another question scrolls up.
    if (!opts.fresh && !opts.reveal) window.scrollTo(0, 0);
    drill.qStart = Date.now();
    if (show) clearPace();
    else startPaceTimer();

    drill.choiceCommit = PGRE.ui.bindChoiceCommit(root(), { onCommit: drillAnswer });
    // the controller is per-render: any later re-render (browse, reveal)
    // orphans the old chip row, so only a fresh answer leaves live shortcuts
    drill.assess = opts.fresh
      ? PGRE.assess.bind(document.getElementById('feedback'), q, st.correct)
      : null;

    document.getElementById('drill-prev').addEventListener('click', function () { goTo(drill.i - 1); });
    document.getElementById('drill-next').addEventListener('click', function () { goTo(drill.i + 1); });
    document.getElementById('drill-finish').addEventListener('click', function (e) {
      // guard real clicks against the render's settling window, but never a
      // keyboard activation (detail 0) — Finish takes focus after the last
      // answer, and a swallowed Enter looks like a dead button
      if (e && e.detail > 0 && Date.now() - lastRenderAt < 300) return;
      renderDrillSummary();
    });
    var sk = document.getElementById('drill-skip');
    if (sk) sk.addEventListener('click', skipCurrent);
    root().querySelectorAll('[data-goto]').forEach(function (b) {
      b.addEventListener('click', function () { goTo(parseInt(b.getAttribute('data-goto'), 10)); });
    });
    if (opts.fresh) {
      var nb = document.getElementById('drill-next');
      (nb && !nb.disabled ? nb : document.getElementById('drill-finish')).focus();
    }
  }

  function goTo(idx) {
    if (!drill || idx < 0 || idx >= drill.qs.length || idx === drill.i) return;
    drill.i = idx;
    renderDrillQuestion();
  }

  /* Skip: drop the question from this drill entirely. Nothing is recorded, so
     it keeps its rung on the ladder and shows up again whenever it next falls
     due — it simply is not part of this run any more. */
  function skipCurrent() {
    if (!drill || drill.st[drill.i]) return;    // an answered question has nothing to skip
    if (Date.now() - lastRenderAt < 300) return;
    drill.qs.splice(drill.i, 1);
    drill.st.splice(drill.i, 1);
    drill.skipped++;
    PGRE.toast('Skipped — it stays in the book with its review date untouched.', 'info');
    if (!drill.qs.length) { renderDrillSummary(); return; }
    if (drill.i >= drill.qs.length) drill.i = drill.qs.length - 1;
    renderDrillQuestion();
  }

  /* Record one answer, replacing any earlier answer to the same question in
     this drill (see gamify.revertAnswer for exactly what a replacement undoes). */
  function commitAnswer(idx) {
    var q = drill.qs[drill.i];
    var prev = drill.st[drill.i];
    if (prev) PGRE.gamify.revertAnswer(prev);

    var s = PGRE.store.state;
    var mkBefore = s.mistakes[q.id] ? JSON.parse(JSON.stringify(s.mistakes[q.id])) : null;
    var qRecBefore = s.questions[q.id] ? JSON.parse(JSON.stringify(s.questions[q.id])) : null;
    var isCorrect = idx === q.answer;
    var elapsed = Date.now() - drill.qStart;
    var xp = PGRE.gamify.recordAnswer(q, isCorrect, elapsed,
                                      { picked: idx, sid: drill.sid, mode: 'mistakes' });
    if (xp === null) { drill.st[drill.i] = null; return; }   // refused: nothing to revert later
    if (isCorrect) PGRE.srs.clearLucky(q.id);   // a correct re-drill retires the lucky flag
    drill.st[drill.i] = {
      q: q, picked: idx, correct: isCorrect, xp: xp, ms: elapsed,
      row: s.attempts[s.attempts.length - 1],   // the row recordAnswer just pushed
      day: s.today.date, sid: drill.sid,
      mkBefore: mkBefore, qRecBefore: qRecBefore
    };
  }

  function drillAnswer(idx) {
    if (!drill) return;
    var prev = drill.st[drill.i];
    // Standing by the answer you already gave records nothing — it just puts
    // the verdict and solution back on screen, which is the only way to re-read
    // them without replacing the answer.
    if (prev && prev.picked === idx) { renderDrillQuestion({ reveal: true }); return; }
    commitAnswer(idx);
    if (!drill.st[drill.i]) {
      renderDrillQuestion();
      return;
    }
    renderDrillQuestion({ fresh: true });
  }

  function renderDrillReview(idx) {
    if (!drill || idx < 0 || idx >= drill.qs.length) return;
    var st = drill.st[idx];
    if (!st) return;
    if (drill.reviewing && drill.i === idx) return;
    clearPace();
    drill.i = idx;
    drill.reviewing = true;
    drill.choiceCommit = null;
    lastRenderAt = Date.now();
    if (PGRE.nav) PGRE.nav.setTrail(['Review']);
    var q = drill.qs[idx];
    var t = PGRE.topicById(q.topic) || { id: 'xx', short: '?', name: 'Unknown topic' };
    var prev = neighborAnswered(idx, -1);
    var next = neighborAnswered(idx, 1);
    var html = '<div class="card practice-card">' +
      '<div class="practice-meta">' +
        '<span>Review — ' + (idx + 1) + ' of ' + drill.qs.length + '</span>' +
        '<span class="chip">' + t.name + '</span>' +
        '<span class="chip">' + (st.correct ? 'Correct' : 'Missed') + '</span>' +
      '</div>' +
      '<div class="q-text">' + q.q + '</div>' +
      '<div class="choices">';
    q.choices.forEach(function (c, cidx) {
      var cls = 'choice';
      if (cidx === q.answer) cls += ' is-answer';
      if (cidx === st.picked && !st.correct) cls += ' is-wrong';
      html += '<button class="' + cls + '" disabled aria-pressed="' +
        (cidx === st.picked ? 'true' : 'false') + '">' +
        '<span class="choice-letter">' + LETTERS[cidx] + '</span>' +
        '<span class="choice-body">' + c + '</span></button>';
    });
    html += '</div>' +
      '<div id="feedback">' + feedbackHTML(q, st, false, true) + '</div>' +
      '<div class="btn-row drill-navrow">' +
        '<button class="btn btn-ghost" id="review-prev"' + (prev < 0 ? ' disabled' : '') + '>← Back</button>' +
        '<button class="btn btn-ghost" id="review-next"' + (next < 0 ? ' disabled' : '') + '>Next →</button>' +
        '<button class="btn btn-primary drill-finish" id="review-summary">Back to results</button>' +
      '</div>' +
      paletteHTML(true, idx) +
      '</div>';
    root().innerHTML = html;
    PGRE.typesetMath(root());
    window.scrollTo(0, 0);
    document.getElementById('review-prev').addEventListener('click', function () {
      if (prev >= 0) renderDrillReview(prev);
    });
    document.getElementById('review-next').addEventListener('click', function () {
      if (next >= 0) renderDrillReview(next);
    });
    document.getElementById('review-summary').addEventListener('click', renderDrillSummary);
    bindReviewJumps();
  }

  function renderDrillSummary() {
    clearPace();
    if (PGRE.nav) PGRE.nav.setTrail([]);   // BUNDLE G: drill over — back to base
    lastRenderAt = Date.now();
    var firstClose = !drill.done;
    drill.done = true;                     // the keys stop answering from here on
    drill.reviewing = false;
    var done = answeredCount(), correct = correctCount(), xp = earnedXP();
    var left = drill.qs.length - done;
    if (firstClose) {
      PGRE.gamify.endSession(drill.sid);
      PGRE.store.log('mistake', 'Mistake drill: ' + correct + '/' + done + ' correct' +
        (drill.skipped ? ' · ' + drill.skipped + ' skipped' : ''), 0);
      PGRE.gamify.checkAchievements(); // before save() so a just-unlocked badge persists now
      PGRE.store.save();
    }
    var stillDue = filterByTopic(PGRE.srs.dueMistakes()).length;
    var untouched = [];
    if (drill.skipped) untouched.push(drill.skipped + ' skipped');
    if (left) untouched.push(left + ' left unanswered');
    root().innerHTML = '<div class="card practice-card">' +
      '<h1>Drill complete</h1>' +
      // every question skipped or left behind: a score of 0 / 0 would read as a
      // wipeout rather than as "nothing was answered, so nothing changed"
      (done ? '<div class="summary-score">' + correct + ' / ' + done +
                '<span class="summary-pct">+' + xp + ' XP</span></div>'
            : '<p class="muted">You did not answer anything this time — the book is exactly ' +
              'as you left it.</p>') +
      (untouched.length
        ? '<p class="muted">' + untouched.join(' · ') + ' — those kept their place in the book ' +
          'and their existing review date.</p>'
        : '') +
      (done ? '<p class="muted">Solved mistakes stay in the book — their next review just moved ' +
              'further out. ' +
              (stillDue ? stillDue + ' still due now.' : 'Nothing else is due right now.') + '</p>'
            : '') +
      // tinted map: answered cells open read-only review; nothing is re-recorded
      (drill.qs.length ? paletteHTML(true) : '') +
      '<div class="btn-row">' +
        '<button class="btn btn-primary" id="back-book">Back to the book</button>' +
        '<a class="btn btn-ghost" href="#/">Dashboard</a>' +
      '</div></div>';
    document.getElementById('back-book').addEventListener('click', function () {
      renderBook();
      window.scrollTo(0, 0); // direct re-render, not a route change
    });
    bindReviewJumps();
  }

  /* ——— Keyboard (same opt-in setting as practice: settings.keyboard) ———
     A–E / 1–5 select, Enter confirms (or re-answers), ← / → browse, S skip,
     Enter/Space/N advance when nothing is pending, K / G / T / F self-assess
     (only while a fresh result is on screen). */
  function onKey(e) {
    if (!drill || drill.done) return;                       // no drill, or its summary is up
    if (drill.reviewing) return;                            // read-only review: click nav only
    if (!document.getElementById('mistakes-root')) return;  // not on the mistake-book view
    if (!PGRE.store.state.settings.keyboard) return;
    var tg = (e.target && e.target.tagName) || '';
    if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT' ||
        (e.target && e.target.isContentEditable)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var k = e.key;

    if (/^[a-eA-E]$/.test(k) || /^[1-5]$/.test(k)) {
      var idx = /^[1-5]$/.test(k) ? parseInt(k, 10) - 1 : k.toUpperCase().charCodeAt(0) - 65;
      if (idx < drill.qs[drill.i].choices.length) {
        e.preventDefault();
        if (drill.choiceCommit) drill.choiceCommit.select(idx);
      }
    } else if (k === 'ArrowLeft') {
      e.preventDefault(); goTo(drill.i - 1);
    } else if (k === 'ArrowRight') {
      e.preventDefault(); goTo(drill.i + 1);
    } else if (k === 's' || k === 'S') {
      e.preventDefault(); skipCurrent();
    } else if (k === 'Enter' && drill.choiceCommit && drill.choiceCommit.selected() != null) {
      // Only Confirm's native activation is the commit path. After a fresh
      // answer, Next/Finish is focused — A–E then Enter must still confirm
      // the pending re-pick, not advance.
      if (document.activeElement && document.activeElement.id === 'confirm-btn') return;
      e.preventDefault();
      drill.choiceCommit.commit();
    } else if (k === 'Enter' || k === ' ' || k === 'n' || k === 'N') {
      // Enter/Space on a focused button already activates it — don't double-fire
      if ((k === 'Enter' || k === ' ') && document.activeElement &&
          document.activeElement.tagName === 'BUTTON') return;
      e.preventDefault();
      var nb = document.getElementById('drill-next');
      if (nb && !nb.disabled) nb.click();
      else document.getElementById('drill-finish').click();
    } else if (drill.assess) {
      // self-assessment chips, same keys as practice: K knew it, G guessed,
      // T too slow, F forgot something
      var a = k.toLowerCase();
      if (a === 'k') { e.preventDefault(); drill.assess.toggle('sure'); }
      else if (a === 'g') { e.preventDefault(); drill.assess.toggle('guess'); }
      else if (a === 't') { e.preventDefault(); drill.assess.toggle('slow'); }
      else if (a === 'f') { e.preventDefault(); drill.assess.toggle('forgot'); }
    }
  }

  return {
    render: function () { return '<div id="mistakes-root"></div>'; },
    mount: function () {
      clearPace();
      topicFilter = 'all';
      if (!keyBound) { document.addEventListener('keydown', onKey); keyBound = true; }
      renderBook();
    }
  };
})();
