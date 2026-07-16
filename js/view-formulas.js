/* Formula recall — four study modes on one portal, chosen with a tab switcher:
   • Study — the original vocabulary-app flip cards with Again/Hard/Good/Easy
     self-grading driving SM-2 intervals (js/srs.js) and a daily due queue. It
     is the default mode and its behaviour is unchanged.
   • Match — timed prompt ↔ formula pairing game.
   • Type  — see the prompt, type the formula, self-grade Close-enough / Missed.
   • Quiz  — multiple choice auto-generated from the deck.
   • Cloze — one blanked term of the formula, picked from four chips.
   The Match/Type/Quiz/Cloze game logic lives in js/flashmodes.js; this file owns the
   tabs, the Study flow, and loading flashmodes.js on demand. The deck
   (js/data-formulas.js) stays empty until cards arrive from the "Conquering the
   Physics GRE" import — with no deck the game tabs are disabled. */
window.PGRE = window.PGRE || {};
PGRE.views = PGRE.views || {};

PGRE.views.formulas = (function () {
  var deck = [];
  var mode = 'study';
  // Study session: { queue, total, done, again, xp, flipped, history, peek,
  //   overlay: null|'peek'|'scaffold'|'checkpoint', steps: {id->learningStep},
  //   undo: [snapshots], pressCount, pendingOverlays: [] }
  var study = null;
  var activeGame = null; // Match/Type/Quiz controller { onKey, stop } or null
  var browseTab = 'learned'; // Browse sub-tab: 'learned' | 'upcoming'
  var memStatsOpen = false;  // F10: Memory stats card starts collapsed each mount
  var ROUND_SIZE = 10;   // F11: grade presses per round (every press counts)
  var GRADES = [
    { key: 'again', label: 'Again', hint: '1' },
    { key: 'hard',  label: 'Hard',  hint: '2' },
    { key: 'good',  label: 'Good',  hint: '3' },
    { key: 'easy',  label: 'Easy',  hint: '4' }
  ];
  // F8: generic reconstruction prompts — used by "Rebuild hints" (pre-flip) and
  // the post-Again interstitial. Deriving beats re-reading.
  var SCAFFOLD_PROMPTS = [
    'Units of the result?',
    'Limiting behavior as each variable → 0 or ∞?',
    'How does it scale with each quantity?',
    'Expected sign?',
    'One-sentence physical story?'
  ];

  function root() { return document.getElementById('formulas-root'); }
  function body() { return document.getElementById('flash-body'); }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  /* F9 — topic interleaving: group by topic, shuffle within each group, then
     round-robin one card per topic per cycle in a freshly-shuffled topic order,
     avoiding a same-topic repeat across the cycle boundary. Consecutive cards
     therefore differ in topic whenever more than one topic still has cards. */
  function interleaveByTopic(cards) {
    var groups = {};
    cards.forEach(function (c) {
      var k = c.topic || '_';
      (groups[k] = groups[k] || []).push(c);
    });
    var keys = Object.keys(groups);
    keys.forEach(function (k) { groups[k] = shuffle(groups[k]); });
    var out = [], last = null;
    while (out.length < cards.length) {
      var avail = keys.filter(function (k) { return groups[k].length; });
      if (!avail.length) break;
      var cycle = shuffle(avail);
      if (cycle.length > 1 && cycle[0] === last) {  // don't repeat across boundary
        var sw = cycle[1]; cycle[1] = cycle[0]; cycle[0] = sw;
      }
      cycle.forEach(function (k) {
        if (groups[k].length) { out.push(groups[k].shift()); last = k; }
      });
    }
    return out;
  }

  /* F8: the 5-prompt reconstruction list, shared by the pre-flip scaffold and
     the post-Again interstitial. */
  function scaffoldPromptsHTML() {
    var h = '<ul class="scaffold-list">';
    SCAFFOLD_PROMPTS.forEach(function (p) { h += '<li>' + PGRE.ui.esc(p) + '</li>'; });
    return h + '</ul>';
  }

  /* Card heading: hand-authored cards carry a `name`, book-import cards a `tag`
     (SPEC bank contract — real formula cards have no `name`). Fall back through
     both so the deck never renders the literal string "undefined". */
  function cardName(c) { return (c && (c.name || c.tag)) || ''; }

  function deckById(id) {
    for (var i = 0; i < deck.length; i++) if (deck[i].id === id) return deck[i];
    return null;
  }

  /* ——— F2 mnemonic notes (state.cardNotes: id -> { text, updatedAt }) ——— */
  function mnemonicNote(id) {
    var m = PGRE.store.state.cardNotes;
    return (m && m[id]) || null;
  }
  /* Plain text, trimmed; an empty save clears the note. */
  function setMnemonic(id, text) {
    var s = PGRE.store.state;
    if (!s.cardNotes) s.cardNotes = {};
    text = (text || '').trim();
    if (!text) delete s.cardNotes[id];
    else s.cardNotes[id] = { text: text, updatedAt: new Date().toISOString() };
    PGRE.store.save();
  }
  /* Rendered mnemonic block (plain text — ui.esc, never typeset), shown under the
     card note after a flip. Empty string when the card has no mnemonic. */
  function mnemonicHTML(id) {
    var n = mnemonicNote(id);
    if (!n || !n.text) return '';
    return '<div class="fcard-mnemonic"><span class="mnemonic-label">Mnemonic</span>' +
      PGRE.ui.esc(n.text) + '</div>';
  }

  /* js/flashmodes.js is not linked from the (infra-owned) index.html, so it is
     loaded on first entry with a one-shot dynamic <script> — the game logic
     stays in its own file without editing the shell. Resolves even on failure
     so Study mode keeps working. */
  var flashLoad = null;
  function ensureFlashmodes() {
    if (PGRE.flashmodes) return Promise.resolve();
    if (flashLoad) return flashLoad;
    flashLoad = new Promise(function (resolve) {
      var s = document.createElement('script');
      s.src = 'js/flashmodes.js';
      s.onload = function () { resolve(); };
      s.onerror = function () { resolve(); };
      document.head.appendChild(s);
    });
    return flashLoad;
  }

  function teardownGame() {
    if (activeGame && activeGame.stop) activeGame.stop();
    activeGame = null;
  }

  /* ——— Shell: mode tabs + a persistent body the modes render into ——— */
  function renderShell() {
    var empty = !deck.length;
    var tabs = [['study', 'Study'], ['match', 'Match'], ['type', 'Type'], ['quiz', 'Quiz'], ['cloze', 'Cloze']];
    var html = '<div class="flash-tabs" role="tablist">';
    tabs.forEach(function (t) {
      var dis = empty && t[0] !== 'study';
      html += '<button class="flash-tab' + (mode === t[0] ? ' active' : '') + '" role="tab"' +
        ' data-mode="' + t[0] + '"' + (dis ? ' disabled' : '') + '>' + t[1] + '</button>';
    });
    html += '</div>';
    if (empty) {
      html += '<p class="flash-tab-note muted">Match, Type and Quiz arrive with the ' +
        'book import — they light up once the deck fills.</p>';
    } else {
      html += '<div class="flash-print-row">' +
        '<button class="btn btn-ghost btn-sm" id="print-formulas">Print formula sheet</button></div>';
    }
    html += '<div id="flash-body"></div>';
    root().innerHTML = html;
    root().querySelectorAll('.flash-tab').forEach(function (b) {
      if (b.disabled) return;
      b.addEventListener('click', function () { switchMode(b.getAttribute('data-mode')); });
    });
    var pf = document.getElementById('print-formulas');
    if (pf) pf.addEventListener('click', printSheet);
    renderMode();
  }

  /* ——— Print / PDF (proposal #13) ———
     A compact per-topic formula sheet — every card's front + back, grouped by
     topic in a two-column print layout — built into a hidden `.print-sheet`
     beside the interactive DOM. css/print.css shows only the sheet at print
     time; the router discards it when #view repaints. Rendering ALL cards (not
     just the on-screen browse list, which shows names only) is the whole point,
     so it is generated from the full loaded deck. */
  function printDate() {
    return new Date().toLocaleDateString('en-US',
      { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function topicCardsHTML(cards) {
    var ui = PGRE.ui, h = '<div class="ps-cards">';
    cards.forEach(function (c) {
      var nm = cardName(c);
      h += '<div class="ps-card">' +
        (nm ? '<div class="ps-card-tag">' + ui.esc(nm) + '</div>' : '') +
        '<div class="ps-card-front">' + (c.front || '') + '</div>' +
        '<div class="ps-card-back">' + (c.back || '') + '</div>' +
      '</div>';
    });
    return h + '</div>';
  }

  function buildPrintSheet() {
    var view = document.getElementById('view');
    if (!view) return;
    var old = document.getElementById('formulas-print');
    if (old) old.parentNode.removeChild(old);
    if (!deck.length) return;
    var ui = PGRE.ui, known = {};
    var html = '<header class="ps-head"><h1>Physics GRE — Formula Sheet</h1>' +
      '<p class="ps-sub">' + deck.length + ' card' + (deck.length === 1 ? '' : 's') +
      ' · printed ' + printDate() + '</p></header>';
    PGRE.TOPICS.forEach(function (t) {
      known[t.id] = 1;
      var cards = deck.filter(function (c) { return c.topic === t.id; });
      if (!cards.length) return;
      html += '<div class="ps-topic"><h2 class="ps-topic-head">' +
        ui.esc(t.short) + ' · ' + ui.esc(t.name) + '</h2>' + topicCardsHTML(cards) + '</div>';
    });
    var others = deck.filter(function (c) { return !known[c.topic]; });
    if (others.length) {
      html += '<div class="ps-topic"><h2 class="ps-topic-head">Other</h2>' +
        topicCardsHTML(others) + '</div>';
    }
    var sheet = document.createElement('section');
    sheet.className = 'print-sheet';
    sheet.id = 'formulas-print';
    sheet.innerHTML = html;
    view.appendChild(sheet);
    PGRE.typesetMath(sheet);
  }

  function printSheet() {
    buildPrintSheet();
    document.body.classList.add('pgre-printing');
    window.print();
  }

  window.addEventListener('afterprint', function () {
    document.body.classList.remove('pgre-printing');
  });

  function switchMode(m) {
    if (m === mode) return;
    teardownGame();
    study = null;
    mode = m;
    renderShell();
  }

  function renderMode() {
    if (mode === 'match' || mode === 'type' || mode === 'quiz' || mode === 'cloze') return renderGameIntro(mode);
    return renderHome();
  }

  /* ——— Study mode home — progressive daily batch, rendered into body ——— */
  function renderHome() {
    study = null;
    var ui = PGRE.ui, srs = PGRE.srs;
    var fresh = srs.newInDeck(deck);
    var reviewedToday = 0;
    var cardsState = PGRE.store.state.cards;
    for (var id in cardsState) {
      if (srs.studiedToday(cardsState[id])) reviewedToday++;
    }

    var html = '<div class="card"><h1>Formula recall</h1>' +
      '<p class="muted">Flip cards the way vocabulary apps do it: see the prompt, recall the ' +
      'formula, flip, then grade yourself — <strong>Again / Hard / Good / Easy</strong> sets ' +
      'when the card returns. Each day serves a fixed batch of reviews plus a few new cards. ' +
      'The tabs above add <strong>Match</strong>, <strong>Type</strong> and <strong>Quiz</strong> ' +
      'drills over the same deck.</p></div>';

    if (!deck.length) {
      html += '<div class="stat-row stat-row-4">' +
        ui.statTile('Cards in the deck', ui.fmt(0)) +
        ui.statTile('Remaining today', ui.fmt(0)) +
        ui.statTile('Reviewed today', ui.fmt(reviewedToday)) +
        ui.statTile('Not yet introduced', ui.fmt(0)) +
      '</div>';
      html += '<div class="card placeholder">' +
        '<p><strong>The deck is empty — by design.</strong></p>' +
        '<p class="muted">No hand-written starter cards: formulas arrive with the ' +
        '<em>Conquering the Physics GRE</em> markdown. Import it in the ' +
        '<a href="#/library">Library</a>; when parser v2 extracts the formula sheets, ' +
        'cards appear here and the daily batch starts filling. The card format is ' +
        'documented in <code>js/data-formulas.js</code>.</p></div>';
      body().innerHTML = html;
      PGRE.typesetMath(body());
      PGRE.refreshNavBadges();
      return;
    }

    var batch = srs.formulaDay(deck);
    var T = srs.clampTarget(PGRE.store.state.settings.formulaDailyTarget);
    var M = srs.formulaDayRemaining(deck).length;
    var reviewsN = batch.reviewIds.length, newN = batch.newIds.length;
    var S = Math.max(0, T - reviewsN);        // open + filled new-card slots
    var postponed = srs.formulaDayPostponed(deck);

    html += '<div class="stat-row stat-row-4">' +
      ui.statTile('Cards in the deck', ui.fmt(deck.length)) +
      ui.statTile('Remaining today', ui.fmt(M) + ' <span class="stat-unit">/ ' + T + '</span>') +
      ui.statTile('Reviewed today', ui.fmt(reviewedToday)) +
      ui.statTile('Not yet introduced', ui.fmt(fresh.length)) +
    '</div>';

    // ——— Final-pass banner (F3) — active in the last week before the exam ———
    if (srs.finalPassActive()) {
      var days = srs.daysUntil(PGRE.store.state.settings.examDate);
      var learnedN = deck.filter(function (c) { return srs.cardState(c.id); }).length;
      var perDay = Math.ceil(learnedN / days);
      html += '<div class="card final-pass-banner"><strong>Final pass</strong> — ' +
        learnedN + ' learned formula' + (learnedN === 1 ? '' : 's') + ', ' +
        days + ' day' + (days === 1 ? '' : 's') + ' left ' +
        '<span class="muted">(aim for ' + perDay + '/day)</span></div>';
    }

    // ——— Leech nudge (F2) — cards that keep slipping despite reviews ———
    var leeches = deck.filter(function (c) { return srs.isLeech(srs.cardState(c.id)); });
    if (leeches.length) {
      html += '<div class="card leech-banner"><strong>' + leeches.length +
        ' formula' + (leeches.length === 1 ? '' : 's') + ' keep' +
        (leeches.length === 1 ? 's' : '') + ' slipping</strong> ' +
        '<span class="muted">— worth a mnemonic more than another rep.</span>' +
        '<div class="btn-row"><button class="btn btn-ghost" id="leech-drill">Drill ' +
        leeches.length + ' struggling</button></div></div>';
    }

    // ——— Today's formulas ———
    html += '<div class="card"><h2>Today’s formulas</h2>';
    html += '<div class="target-stepper"><span class="target-label">Formulas per day</span>' +
      '<div class="target-controls">' +
      '<button class="btn btn-ghost stepper-btn" id="target-dec"' + (T <= 1 ? ' disabled' : '') + '>−</button>' +
      '<span class="target-value" id="target-value">' + T + '</span>' +
      '<button class="btn btn-ghost stepper-btn" id="target-inc"' + (T >= 100 ? ' disabled' : '') + '>+</button>' +
      '</div></div>';
    // F3: exam-day date input — drives the interval cap + final pass. An invalid
    // or past date silently disables capping (srs.examCap returns null).
    html += '<div class="exam-day-row"><span class="exam-day-label">Exam day</span>' +
      '<input type="date" id="exam-date" class="exam-date-input" value="' +
      ui.esc(PGRE.store.state.settings.examDate || '') + '"></div>';
    // F5: Study direction toggle. false = Prompt → Formula (recall the equation);
    // true = Formula → Prompt (name it / say when it applies). Persists + re-renders.
    var reverse = !!PGRE.store.state.settings.formulaReverse;
    html += '<div class="direction-row"><span class="exam-day-label">Direction</span>' +
      '<button class="btn btn-ghost btn-sm" id="dir-toggle">' +
      (reverse ? 'Formula → Prompt' : 'Prompt → Formula') + '</button></div>';

    var comp = reviewsN + ' review' + (reviewsN === 1 ? '' : 's') + ' + ' +
      newN + ' new today.';
    if (postponed > 0) {
      comp += ' ' + postponed + ' more review' + (postponed === 1 ? '' : 's') +
        ' wait' + (postponed === 1 ? 's' : '') + ' for tomorrow.';
    }
    if (S === 0 && fresh.length > 0) {
      comp += ' ' + fresh.length + ' formula' + (fresh.length === 1 ? '' : 's') +
        ' not yet introduced — raise the daily target to start them.';
    }
    html += '<p class="muted comp-line">' + comp + '</p>';

    if (M > 0) {
      html += '<div class="btn-row"><button class="btn btn-primary" id="study-btn">Study ' +
        M + ' remaining</button>';
    } else {
      html += '<h3 class="caught-up">You’re all caught up</h3>' +
        '<p class="muted">Today’s batch is done — the next cards return on their schedule.</p>' +
        '<div class="btn-row">';
    }
    if (S > 0) {
      html += '<button class="btn btn-ghost" id="pick-btn">Choose today’s new cards</button>' +
        '<button class="btn btn-ghost" id="reroll-btn">Re-roll random picks</button>';
    }
    html += '</div></div>';

    // ——— Memory stats (F10) — collapsed by default ———
    html += '<div class="card mem-stats-card"><div class="mem-stats-head">' +
      '<h2>Memory stats</h2>' +
      '<button class="btn btn-ghost btn-sm" id="mem-stats-toggle">' +
      (memStatsOpen ? 'Hide' : 'Show') + '</button></div>' +
      '<div id="mem-stats-body"' + (memStatsOpen ? '' : ' hidden') + '>' +
      (memStatsOpen ? memStatsHTML() : '') + '</div></div>';

    // ——— Browse ———
    html += '<div class="card"><h2>Browse the deck</h2>' +
      '<div class="browse-tabs" role="tablist">' +
      '<button class="browse-tab' + (browseTab === 'learned' ? ' active' : '') +
        '" data-btab="learned">Learned</button>' +
      '<button class="browse-tab' + (browseTab === 'upcoming' ? ' active' : '') +
        '" data-btab="upcoming">Upcoming</button>' +
      '</div><div id="browse-body">' + browseBodyHTML() + '</div></div>';

    body().innerHTML = html;
    PGRE.typesetMath(body());
    PGRE.refreshNavBadges(); // remaining counts change without a route change

    var sb = document.getElementById('study-btn');
    if (sb) sb.addEventListener('click', function () {
      startStudy(PGRE.srs.formulaDayRemaining(deck));
    });
    wireStepper();
    var ed = document.getElementById('exam-date');
    if (ed) ed.addEventListener('change', function () {
      PGRE.store.state.settings.examDate = ed.value;   // '' when cleared → cap off
      PGRE.store.save();
      renderHome();
    });
    var pb = document.getElementById('pick-btn');
    if (pb) pb.addEventListener('click', renderPicker);
    var rb = document.getElementById('reroll-btn');
    if (rb) rb.addEventListener('click', function () {
      PGRE.srs.rerollFormulaNewPicks(deck);
      renderHome();
    });
    // F2: drill the leeches — a normal-grading session independent of the daily
    // batch (these cards may already be studied today; they still surface here).
    var ld = document.getElementById('leech-drill');
    if (ld) ld.addEventListener('click', function () {
      startStudy(deck.filter(function (c) { return PGRE.srs.isLeech(PGRE.srs.cardState(c.id)); }));
    });
    // F5: flip the Study direction, persist, re-render.
    var dt = document.getElementById('dir-toggle');
    if (dt) dt.addEventListener('click', function () {
      PGRE.store.state.settings.formulaReverse = !PGRE.store.state.settings.formulaReverse;
      PGRE.store.save();
      renderHome();
    });
    // F10: collapse/expand Memory stats (built lazily on first open).
    var mt = document.getElementById('mem-stats-toggle');
    if (mt) mt.addEventListener('click', function () {
      memStatsOpen = !memStatsOpen;
      mt.textContent = memStatsOpen ? 'Hide' : 'Show';
      var mb = document.getElementById('mem-stats-body');
      if (mb) {
        if (memStatsOpen) { mb.innerHTML = memStatsHTML(); PGRE.typesetMath(mb); }
        mb.hidden = !memStatsOpen;
      }
    });
    wireBrowse();
  }

  /* ——— F10 Memory stats: maturity mix, 30-day retention, 14-day forecast ——— */
  function memStatsHTML() {
    var srs = PGRE.srs, ui = PGRE.ui;
    var mature = 0, young = 0, learning = 0;
    deck.forEach(function (c) {
      var st = srs.cardState(c.id);
      if (st && (st.interval || 0) >= 21) mature++;
      else if (st && st.reps > 0 && (st.interval || 0) < 21) young++;
      else learning++;                       // no state, or state with reps === 0
    });

    var matR = retentionRate(1), yngR = retentionRate(0);
    function pct(r) {
      return r == null ? '<span class="muted">collecting data</span>'
        : '<strong>' + Math.round(r * 100) + '%</strong>';
    }

    var h = '<div class="mem-mix stat-row stat-row-3">' +
      ui.statTile('Mature', ui.fmt(mature) + ' <span class="stat-unit">≥ 21 d</span>') +
      ui.statTile('Young', ui.fmt(young) + ' <span class="stat-unit">&lt; 21 d</span>') +
      ui.statTile('Learning / new', ui.fmt(learning)) +
    '</div>';

    h += '<div class="mem-retention"><h3>30-day retention</h3>' +
      '<p class="muted">Pass rate (Hard/Good/Easy) on real reviews, last 30 days. ' +
      'A bucket needs 20+ reviews before a number shows.</p>' +
      '<div class="retention-row"><span>Mature cards</span>' + pct(matR) + '</div>' +
      '<div class="retention-row"><span>Young cards</span>' + pct(yngR) + '</div></div>';

    h += forecastHTML();
    return h;
  }

  /* Retention over the last 30 days for one maturity bucket (mFlag: 1 = mature,
     0 = young). Only real reviews (n === 1) count; fewer than 20 qualifying
     entries returns null → the caller shows "collecting data". */
  function retentionRate(mFlag) {
    var revs = PGRE.store.state.cardReviews || [];
    var cutoff = PGRE.srs.addDays(-30);
    var pass = 0, total = 0;
    revs.forEach(function (r) {
      if (r.n !== 1 || r.m !== mFlag || r.d < cutoff) return;
      total++;
      if (r.g !== 'again') pass++;
    });
    return total < 20 ? null : pass / total;
  }

  /* 14-day due forecast as pure-div bars. Day 0 = today INCLUDING overdue; days
     1–13 read future due dates from state.cards. Plus a 30-day total line. */
  function forecastHTML() {
    var srs = PGRE.srs;
    var days = [], i;
    for (i = 0; i < 14; i++) days.push(0);
    var total30 = 0;
    deck.forEach(function (c) {
      var st = srs.cardState(c.id);
      if (!st) return;
      var du = srs.daysUntil(st.due);
      if (du <= 0) { days[0]++; total30++; }
      else {
        if (du <= 13) days[du]++;
        if (du <= 29) total30++;
      }
    });
    var max = 1;
    for (i = 0; i < 14; i++) if (days[i] > max) max = days[i];
    var bars = '';
    for (i = 0; i < 14; i++) {
      var n = days[i];
      var pctH = Math.round(100 * n / max);
      var lbl = i === 0 ? 'today' : 'in ' + i + ' d';
      bars += '<div class="fc-col" title="' + n + ' due ' + lbl + '">' +
        '<div class="fc-bar' + (n ? '' : ' fc-empty') + '" style="height:' +
        (n ? Math.max(4, pctH) : 0) + '%"></div>' +
        '<span class="fc-x">' + (i === 0 ? 'now' : (i % 7 === 0 ? '+' + i : '')) + '</span></div>';
    }
    return '<div class="mem-forecast"><h3>14-day forecast</h3>' +
      '<div class="forecast-strip">' + bars + '</div>' +
      '<p class="muted forecast-total">' + total30 + ' review' +
      (total30 === 1 ? '' : 's') + ' due in the next 30 days.</p></div>';
  }

  function wireStepper() {
    function step(d) {
      var cur = PGRE.srs.clampTarget(PGRE.store.state.settings.formulaDailyTarget);
      var next = PGRE.srs.clampTarget(cur + d);
      if (next === cur) return;
      PGRE.store.state.settings.formulaDailyTarget = next;
      PGRE.store.save();
      PGRE.srs.formulaDay(deck);   // reconcile the batch to the new target
      renderHome();
    }
    var dec = document.getElementById('target-dec');
    var inc = document.getElementById('target-inc');
    if (dec) dec.addEventListener('click', function () { step(-1); });
    if (inc) inc.addEventListener('click', function () { step(1); });
  }

  /* ——— Browse sub-tabs (Learned / Upcoming) with expandable peek rows ——— */
  function browseBodyHTML() {
    var ui = PGRE.ui, srs = PGRE.srs;
    var batch = srs.formulaDay(deck), inBatch = {};
    batch.reviewIds.concat(batch.newIds).forEach(function (id) { inBatch[id] = 1; });
    var learned = browseTab === 'learned';
    var any = false, html = '';
    PGRE.TOPICS.forEach(function (t) {
      var cards = deck.filter(function (c) {
        var st = srs.cardState(c.id);
        return c.topic === t.id && (learned ? !!st : !st);
      });
      if (!cards.length) return;
      any = true;
      html += '<div class="deck-topic"><h3>' + ui.monogram(t) + ' ' + t.name + '</h3>';
      cards.forEach(function (c) {
        var st = srs.cardState(c.id), chips = '';
        if (learned) {
          if (st.lastGrade) {
            chips += '<span class="grade-chip grade-' + st.lastGrade + '">' +
              ui.esc(st.lastGrade) + '</span>';
          }
          var du = srs.daysUntil(st.due);
          var when = du <= 0 ? 'due now' : 'due in ' + srs.ivlLabel(du);
          chips += '<span class="due-chip' + (du <= 0 ? ' due-now' : '') + '">' + when + '</span>';
          if (srs.isLeech(st)) chips += '<span class="grade-chip leech-chip" title="failed ' +
            st.lapses + ' times — consider a mnemonic">leech</span>';
        } else {
          chips += '<span class="due-chip">new</span>';
        }
        if (inBatch[c.id]) chips += '<span class="due-chip today-chip">today</span>';
        html += '<div class="browse-row" data-cardid="' + ui.esc(c.id) + '">' +
          '<span class="deck-name">' + ui.esc(cardName(c)) + '</span>' +
          '<span class="browse-chips">' + chips + '</span></div>' +
          '<div class="browse-peek" data-peek="' + ui.esc(c.id) + '" hidden></div>';
      });
      html += '</div>';
    });
    // cards with a topic outside PGRE.TOPICS
    var known = {};
    PGRE.TOPICS.forEach(function (t) { known[t.id] = 1; });
    var others = deck.filter(function (c) {
      var st = srs.cardState(c.id);
      return !known[c.topic] && (learned ? !!st : !st);
    });
    if (others.length) {
      any = true;
      html += '<div class="deck-topic"><h3>Other</h3>';
      others.forEach(function (c) {
        var st = srs.cardState(c.id), chips = '';
        if (learned) {
          if (st.lastGrade) chips += '<span class="grade-chip grade-' + st.lastGrade + '">' + ui.esc(st.lastGrade) + '</span>';
          var du = srs.daysUntil(st.due);
          chips += '<span class="due-chip' + (du <= 0 ? ' due-now' : '') + '">' +
            (du <= 0 ? 'due now' : 'due in ' + srs.ivlLabel(du)) + '</span>';
          if (srs.isLeech(st)) chips += '<span class="grade-chip leech-chip" title="failed ' +
            st.lapses + ' times — consider a mnemonic">leech</span>';
        } else {
          chips += '<span class="due-chip">new</span>';
        }
        if (inBatch[c.id]) chips += '<span class="due-chip today-chip">today</span>';
        html += '<div class="browse-row" data-cardid="' + ui.esc(c.id) + '">' +
          '<span class="deck-name">' + ui.esc(cardName(c)) + '</span>' +
          '<span class="browse-chips">' + chips + '</span></div>' +
          '<div class="browse-peek" data-peek="' + ui.esc(c.id) + '" hidden></div>';
      });
      html += '</div>';
    }
    if (!any) {
      html = '<p class="muted">' + (learned ?
        'No cards studied yet — start today’s batch to begin building this list.' :
        'Every card has been introduced. Nice work.') + '</p>';
    }
    return html;
  }

  function wireBrowse() {
    var box = document.getElementById('browse-body');
    if (!box) return;
    root().querySelectorAll('.browse-tab').forEach(function (b) {
      b.addEventListener('click', function () {
        var tab = b.getAttribute('data-btab');
        if (tab === browseTab) return;
        browseTab = tab;
        root().querySelectorAll('.browse-tab').forEach(function (o) {
          o.classList.toggle('active', o.getAttribute('data-btab') === tab);
        });
        box.innerHTML = browseBodyHTML();
        wirePeek(box);
      });
    });
    wirePeek(box);
  }

  /* Row click toggles a view-only peek (front + back + note); the schedule is
     never touched. The peek is typeset lazily on first open. */
  function wirePeek(box) {
    box.querySelectorAll('.browse-row').forEach(function (row) {
      row.addEventListener('click', function () {
        var id = row.getAttribute('data-cardid');
        var peek = box.querySelector('.browse-peek[data-peek="' + cssAttr(id) + '"]');
        if (!peek) return;
        if (!peek.hidden) { peek.hidden = true; row.classList.remove('open'); return; }
        if (!peek.getAttribute('data-filled')) {
          var c = deckById(id);
          if (c) {
            peek.innerHTML = '<div class="fcard-front">' + (c.front || '') + '</div>' +
              '<div class="fcard-back">' + (c.back || '') +
              (c.note ? '<div class="fcard-note">' + c.note + '</div>' : '') + '</div>' +
              '<div class="peek-mnemonic" data-mnem-for="' + cssAttr(c.id) + '"></div>';
            peek.setAttribute('data-filled', '1');
            PGRE.typesetMath(peek);
            // F2: mnemonic editor lives below the card body (plain text, no math).
            wireMnemonic(peek.querySelector('.peek-mnemonic'), c.id);
          }
        }
        peek.hidden = false;
        row.classList.add('open');
      });
    });
  }

  /* F2: Add/Edit mnemonic control inside a browse peek. Self-contained: it draws
     its own view (button → textarea+Save/Cancel → rendered note) and re-draws in
     place on save. Plain text only; ui.esc on render. Clicks stay inside the peek
     (a sibling of .browse-row), so they never re-toggle the row. */
  function wireMnemonic(section, id) {
    if (!section) return;
    function draw(editing) {
      var note = mnemonicNote(id), ui = PGRE.ui, h;
      if (editing) {
        h = '<textarea class="mnemonic-input" rows="3" ' +
          'placeholder="A hook to remember this — plain text.">' +
          (note ? ui.esc(note.text) : '') + '</textarea>' +
          '<div class="btn-row mnemonic-actions">' +
          '<button class="btn btn-primary btn-sm" data-mnem="save">Save</button>' +
          '<button class="btn btn-ghost btn-sm" data-mnem="cancel">Cancel</button></div>';
      } else if (note && note.text) {
        h = '<div class="fcard-mnemonic"><span class="mnemonic-label">Mnemonic</span>' +
          ui.esc(note.text) + '</div>' +
          '<button class="btn btn-ghost btn-sm" data-mnem="edit">Edit mnemonic</button>';
      } else {
        h = '<button class="btn btn-ghost btn-sm" data-mnem="edit">Add mnemonic</button>';
      }
      section.innerHTML = h;
      var ed = section.querySelector('[data-mnem="edit"]');
      if (ed) ed.addEventListener('click', function () {
        draw(true);
        var ta = section.querySelector('.mnemonic-input');
        if (ta) ta.focus();
      });
      var sv = section.querySelector('[data-mnem="save"]');
      if (sv) sv.addEventListener('click', function () {
        var ta = section.querySelector('.mnemonic-input');
        setMnemonic(id, ta ? ta.value : '');
        draw(false);
      });
      var cn = section.querySelector('[data-mnem="cancel"]');
      if (cn) cn.addEventListener('click', function () { draw(false); });
    }
    draw(false);
  }

  /* Escape a card id for a CSS attribute selector (ids are equation-numbered,
     but guard the quote/backslash cases regardless). */
  function cssAttr(s) { return String(s).replace(/["\\]/g, '\\$&'); }

  /* ——— New-card picker: topic-grouped checklist, capped at the open slots ——— */
  function renderPicker() {
    var ui = PGRE.ui, srs = PGRE.srs;
    var batch = srs.formulaDay(deck);
    var T = srs.clampTarget(PGRE.store.state.settings.formulaDailyTarget);
    var S = Math.max(0, T - batch.reviewIds.length);
    var newSet = {};
    batch.newIds.forEach(function (id) { newSet[id] = 1; });

    var html = '<div class="card"><h2>Choose today’s new cards</h2>' +
      '<p class="muted">Pick which never-studied formulas fill today’s open slots. ' +
      'Cards already studied today are locked in.</p>' +
      '<div class="picker-bar"><span class="picker-count" id="picker-count"></span>' +
      '<div class="btn-row picker-actions">' +
      '<button class="btn btn-primary" id="picker-save">Save picks</button>' +
      '<button class="btn btn-ghost" id="picker-cancel">Cancel</button></div></div>';

    function rowsFor(cards) {
      var h = '';
      cards.forEach(function (c) {
        var st = srs.cardState(c.id);
        var locked = newSet[c.id] && srs.studiedToday(st);
        var checked = !!newSet[c.id];
        h += '<label class="picker-row' + (locked ? ' is-locked' : '') + '">' +
          '<input type="checkbox" class="picker-box" value="' + ui.esc(c.id) + '"' +
            (checked ? ' checked' : '') + (locked ? ' disabled data-locked="1"' : '') + '>' +
          '<span class="deck-name">' + ui.esc(cardName(c)) + '</span>' +
          (locked ? '<span class="due-chip today-chip">done today</span>' : '') +
          '</label>';
      });
      return h;
    }

    var any = false;
    PGRE.TOPICS.forEach(function (t) {
      var cards = deck.filter(function (c) {
        var st = srs.cardState(c.id);
        return c.topic === t.id && (!st || (newSet[c.id] && srs.studiedToday(st)));
      });
      if (!cards.length) return;
      any = true;
      html += '<div class="picker-topic"><div class="picker-topic-head">' +
        '<label class="picker-selall"><input type="checkbox" class="picker-selall-box" ' +
          'data-topic="' + ui.esc(t.id) + '"> ' + ui.monogram(t) + ' ' + ui.esc(t.name) +
        '</label></div>' + rowsFor(cards) + '</div>';
    });
    if (!any) {
      html += '<p class="muted">No never-studied cards left to choose.</p>';
    }
    html += '</div>';

    body().innerHTML = html;
    PGRE.typesetMath(body());

    var boxes = body().querySelectorAll('.picker-box');
    var lockedCount = 0;
    boxes.forEach(function (b) { if (b.getAttribute('data-locked')) lockedCount++; });

    function selectable() { // non-locked checkboxes
      return Array.prototype.filter.call(boxes, function (b) { return !b.getAttribute('data-locked'); });
    }
    function countChecked() {
      var n = lockedCount;
      selectable().forEach(function (b) { if (b.checked) n++; });
      return n;
    }
    function refresh() {
      var n = countChecked();
      var full = n >= S;
      selectable().forEach(function (b) { b.disabled = full && !b.checked; });
      var cc = document.getElementById('picker-count');
      if (cc) cc.textContent = n + ' of ' + S + ' new slot' + (S === 1 ? '' : 's');
    }
    boxes.forEach(function (b) {
      if (b.getAttribute('data-locked')) return;
      b.addEventListener('change', refresh);
    });
    body().querySelectorAll('.picker-selall-box').forEach(function (sa) {
      sa.addEventListener('change', function () {
        var topic = sa.getAttribute('data-topic');
        var rows = Array.prototype.filter.call(selectable(), function (b) {
          var c = deckById(b.value);
          return c && c.topic === topic;
        });
        if (sa.checked) {
          rows.forEach(function (b) {
            if (b.checked) return;
            if (countChecked() >= S) return;
            b.checked = true;
          });
        } else {
          rows.forEach(function (b) { b.checked = false; });
        }
        refresh();
      });
    });
    refresh();

    document.getElementById('picker-cancel').addEventListener('click', renderHome);
    document.getElementById('picker-save').addEventListener('click', function () {
      var ids = [];
      selectable().forEach(function (b) { if (b.checked) ids.push(b.value); });
      PGRE.srs.setFormulaNewPicks(deck, ids);
      renderHome();
    });
  }

  function startStudy(cards) {
    if (!cards.length) return;
    study = { queue: interleaveByTopic(cards), total: cards.length, done: 0,
              again: 0, xp: 0, flipped: false, history: [], peek: null,
              overlay: null, steps: {}, undo: [], pressCount: 0,
              pendingOverlays: [] };
    renderCard();
  }

  function renderCard() {
    var c = study.queue[0];
    var t = PGRE.topicById(c.topic);
    var nm = cardName(c);
    var step = study.steps[c.id] || 0;   // F7 learning step (0 or 1)
    var learnChip = step === 1 ? '<span class="chip learn-chip">learning 1/2</span>' : '';
    var undoBtn = study.undo.length ?      // F1a ghost undo when the stack is live
      '<button class="btn btn-ghost btn-sm study-undo" id="study-undo">Undo ' +
        '<span class="key-hint">⌘Z</span></button>' : '';
    var noteHTML = c.note ? '<div class="fcard-note">' + c.note + '</div>' : '';
    var mnem = mnemonicHTML(c.id);         // F2: shown under the note after a flip
    // F5: reverse direction shows the formula as the question ("what is this?")
    // and reveals name + prompt + note + mnemonic. Same SM-2 state and grading —
    // only the two faces swap; learning steps / undo / scaffold / rounds untouched.
    var reverse = !!PGRE.store.state.settings.formulaReverse;
    var frontFace, backFace;
    if (reverse) {
      frontFace = '<div class="fcard-rev-q">What is this? When does it apply?</div>' +
        '<div class="fcard-front" id="fcard-front">' + (c.back || '') + '</div>';
      backFace = (nm ? '<div class="fcard-name">' + PGRE.ui.esc(nm) + '</div>' : '') +
        '<div class="fcard-rev-prompt">' + (c.front || '') + '</div>' + noteHTML + mnem;
    } else {
      frontFace = (nm ? '<div class="fcard-name">' + PGRE.ui.esc(nm) + '</div>' : '') +
        '<div class="fcard-front" id="fcard-front">' + (c.front || 'Recall the formula.') + '</div>';
      backFace = c.back + noteHTML + mnem;
    }
    var html = '<div class="card practice-card">' +
      '<div class="practice-meta">' +
        '<span>Card ' + (study.done + 1) + ' · ' + study.queue.length + ' left</span>' +
        (study.history.length ? '<button class="btn btn-ghost btn-sm session-back" id="session-back">' +
          '← Back <span class="key-hint">←</span></button>' : '') +
        undoBtn +
        (t ? '<span class="chip">' + t.name + '</span>' : '') +
        learnChip +
      '</div>' +
      PGRE.ui.meter(100 * study.done / (study.done + study.queue.length), 'meter-thin') +
      '<div class="fcard" id="fcard">' +
        frontFace +
        '<div class="fcard-back" id="fcard-back" hidden>' + backFace + '</div>' +
      '</div>' +
      '<div class="btn-row" id="fcard-actions">' +
        '<button class="btn btn-primary" id="flip-btn">Show answer <span class="key-hint">space</span></button>' +
        // F8 scaffold prompts reconstruct a formula, so they only fit the
        // forward face — suppress in reverse (F5) where the formula IS the prompt.
        (reverse ? '' : '<button class="btn btn-ghost" id="rebuild-btn">Rebuild hints</button>') +
      '</div></div>';
    body().innerHTML = html;
    PGRE.typesetMath(body());
    study.flipped = false;
    study.peek = null;
    study.overlay = null;
    document.getElementById('flip-btn').addEventListener('click', flip);
    document.getElementById('fcard').addEventListener('click', function () {
      if (!study.flipped) flip();
    });
    var bk = document.getElementById('session-back');
    if (bk) bk.addEventListener('click', function (e) { e.stopPropagation(); openPeek(); });
    var ub = document.getElementById('study-undo');
    if (ub) ub.addEventListener('click', function (e) { e.stopPropagation(); undoGrade(); });
    var rb = document.getElementById('rebuild-btn');
    if (rb) rb.addEventListener('click', function (e) { e.stopPropagation(); showRebuildHints(); });
  }

  /* F8 pre-flip scaffold: swap the card front for the generic prompt list; the
     answer is still one flip away. One-way for this card view. */
  function showRebuildHints() {
    if (!study || study.flipped) return;
    var front = document.getElementById('fcard-front');
    if (front) front.innerHTML = scaffoldPromptsHTML();
    var rb = document.getElementById('rebuild-btn');
    if (rb && rb.parentNode) rb.parentNode.removeChild(rb);
    var fc = document.getElementById('fcard');
    if (fc) PGRE.typesetMath(fc);
  }

  /* ——— In-session back-stepping: a view-only look at already-graded cards.
     Grades stand — this never re-schedules anything. ——— */
  function openPeek() {
    if (!study || !study.history.length || study.overlay) return;
    study.overlay = 'peek';   // F8: peek is now one of the overlay states
    study.peek = { idx: study.history.length - 1 };
    renderPeek();
  }

  function renderPeek() {
    var n = study.history.length, idx = study.peek.idx;
    var entry = study.history[idx], c = entry.c;
    var t = PGRE.topicById(c.topic), nm = cardName(c);
    var atNewest = idx >= n - 1;
    var html = '<div class="card practice-card">' +
      '<div class="practice-meta">' +
        '<span>Reviewed ' + (idx + 1) + ' of ' + n + '</span>' +
        (t ? '<span class="chip">' + t.name + '</span>' : '') +
        '<span class="grade-chip grade-' + entry.grade + ' peek-grade">Graded ' + entry.grade + '</span>' +
      '</div>' +
      '<div class="fcard">' +
        (nm ? '<div class="fcard-name">' + PGRE.ui.esc(nm) + '</div>' : '') +
        '<div class="fcard-front">' + (c.front || '') + '</div>' +
        '<div class="fcard-back">' + (c.back || '') +
          (c.note ? '<div class="fcard-note">' + c.note + '</div>' : '') + '</div>' +
      '</div>' +
      '<div class="btn-row session-peek-bar">' +
        '<button class="btn btn-ghost" id="peek-older"' + (idx <= 0 ? ' disabled' : '') +
          '>← Older</button>' +
        '<button class="btn btn-ghost" id="peek-newer"' + (atNewest ? ' disabled' : '') +
          '>Newer →</button>' +
        '<button class="btn btn-primary" id="peek-resume">Resume study</button>' +
      '</div></div>';
    body().innerHTML = html;
    PGRE.typesetMath(body());
    var ob = document.getElementById('peek-older');
    var nb = document.getElementById('peek-newer');
    if (ob) ob.addEventListener('click', function () { peekStep(-1); });
    if (nb) nb.addEventListener('click', function () { peekStep(1); });
    document.getElementById('peek-resume').addEventListener('click', resumePeek);
  }

  function peekStep(d) {
    if (!study || study.overlay !== 'peek' || !study.peek) return;
    var n = study.history.length, idx = study.peek.idx + d;
    if (idx < 0) idx = 0;
    if (idx > n - 1) idx = n - 1;
    study.peek.idx = idx;
    renderPeek();
  }

  function resumePeek() {
    if (!study) return;
    study.peek = null;
    study.overlay = null;
    renderCard();
  }

  function flip() {
    var c = study.queue[0];
    study.flipped = true;
    document.getElementById('fcard-back').hidden = false;
    var rb = document.getElementById('rebuild-btn');
    if (rb && rb.parentNode) rb.parentNode.removeChild(rb);
    var st = PGRE.srs.cardState(c.id);
    var ivls = PGRE.srs.nextIntervals(st);      // already exam-cap clamped (F3)
    var stateless = !st, step = study.steps[c.id] || 0;
    var html = '';
    GRADES.forEach(function (g) {
      // F7: a stateless card at step 0 requeues in-session on Hard/Good (a learning
      // step, not a scheduled interval) — show "soon"; Easy commits its real
      // interval, and a step-1 card shows real committed intervals for all grades.
      var lbl = (stateless && step === 0 && (g.key === 'hard' || g.key === 'good'))
        ? 'soon' : PGRE.srs.ivlLabel(ivls[g.key]);
      html += '<button class="btn grade-btn grade-' + g.key + '" data-grade="' + g.key + '">' +
        g.label + '<span class="grade-ivl">' + lbl + '</span>' +
        '<span class="key-hint">' + g.hint + '</span></button>';
    });
    var box = document.getElementById('fcard-actions');
    box.innerHTML = html;
    box.querySelectorAll('[data-grade]').forEach(function (b) {
      b.addEventListener('click', function () { grade(b.getAttribute('data-grade')); });
    });
  }

  /* F7 learning steps live ONLY in Study mode. Match/Type/Quiz commit gradeCard
     directly (no steps) — see js/flashmodes.js. */
  function grade(g) {
    if (study.overlay) return;                  // no grading while an overlay is up
    var c = study.queue[0], id = c.id;
    var stateless = !PGRE.srs.cardState(id);
    var step = study.steps[id] || 0;

    // F1a: snapshot the whole session + card state BEFORE any mutation.
    pushUndo(id);
    study.pressCount++;                         // F11: every press counts toward a round

    var recycled = false;                       // an Again press → post-Again scaffold

    if (stateless) {
      if (g === 'easy') {                       // graduate immediately
        PGRE.srs.gradeCard(id, 'easy');
        delete study.steps[id];
        study.queue.shift();
        study.done++;
      } else if (g === 'again') {               // reset to step 0 — no commit, no lapse
        study.steps[id] = 0;
        study.again++;
        recycled = true;
        reinsertCard();
      } else if (step === 0) {                  // Hard/Good step 0 → learning step 1
        study.steps[id] = 1;
        reinsertCard();
      } else {                                  // Hard/Good step 1 → graduate
        PGRE.srs.gradeCard(id, g);
        delete study.steps[id];
        study.queue.shift();
        study.done++;
      }
    } else {                                    // review card: commit directly
      PGRE.srs.gradeCard(id, g);
      study.queue.shift();
      study.done++;
      if (g === 'again') { study.queue.push(c); study.again++; recycled = true; }
    }

    PGRE.store.touchDay();          // reviewing formulas counts as a study day
    study.xp += 2;                  // every press rewards effort (unchanged from before)
    study.history.push({ c: c, grade: g }); // every press (a card can recur)
    PGRE.store.save();

    // F8 + F11: queue overlays. When the round-closing press is an Again, the
    // scaffold shows first and the checkpoint after it.
    study.pendingOverlays = [];
    if (recycled) study.pendingOverlays.push({ type: 'scaffold', card: c });
    if (study.pressCount % ROUND_SIZE === 0 && study.queue.length) {
      study.pendingOverlays.push({ type: 'checkpoint' });
    }
    if (study.pendingOverlays.length) runNextOverlay();
    else if (study.queue.length) renderCard();
    else renderStudySummary();
  }

  /* F7: pull the current card off the front and reinsert it a few cards back so a
     learning card returns within the session without immediately repeating. */
  function reinsertCard() {
    var c = study.queue.shift();
    var p = Math.min(study.queue.length, 3 + Math.floor(Math.random() * 3));
    study.queue.splice(p, 0, c);
  }

  /* F1a: undo stack, max 10, dies with the session. Snapshot BEFORE the mutation
     so a pop restores the exact pre-press session + card state. */
  function pushUndo(id) {
    var prev = PGRE.store.state.cards[id];
    var stepsCopy = {};
    for (var k in study.steps) stepsCopy[k] = study.steps[k];
    study.undo.push({
      id: id,
      prevCardState: prev ? JSON.parse(JSON.stringify(prev)) : null,
      queueIds: study.queue.slice(),          // shallow copy of the queue (card refs)
      done: study.done, xp: study.xp, again: study.again,
      historyLen: study.history.length,
      steps: stepsCopy,
      pressCount: study.pressCount
    });
    if (study.undo.length > 10) study.undo.shift();
  }

  /* F1a: pop the last snapshot, restore session + card state, and drop the
     trailing cardReviews entry when it matches (bundle 2 — array may not exist). */
  function undoGrade() {
    if (!study || study.overlay || !study.undo.length) return;
    var e = study.undo.pop();
    if (e.prevCardState) PGRE.store.state.cards[e.id] = e.prevCardState;
    else delete PGRE.store.state.cards[e.id];
    var revs = PGRE.store.state.cardReviews;
    if (revs && revs.length) {
      var last = revs[revs.length - 1];
      if (last && last.id === e.id && last.d === PGRE.srs.today()) revs.pop();
    }
    study.queue = e.queueIds.slice();
    study.done = e.done;
    study.xp = e.xp;
    study.again = e.again;
    study.history.length = e.historyLen;
    study.steps = {};
    for (var k in e.steps) study.steps[k] = e.steps[k];
    study.pressCount = e.pressCount;
    study.overlay = null;
    study.pendingOverlays = [];
    PGRE.store.save();
    renderCard();
  }

  /* F8/F11 overlay pump: run one queued overlay at a time; when the queue drains,
     resume the live card (or the summary if the batch is done). */
  function runNextOverlay() {
    var p = study.pendingOverlays.shift();
    if (!p) {
      study.overlay = null;
      if (study.queue.length) renderCard();
      else renderStudySummary();
      return;
    }
    if (p.type === 'scaffold') renderScaffold(p.card);
    else renderCheckpoint();
  }

  /* F8 post-Again interstitial: the formula + the same 5 prompts, then Continue. */
  function renderScaffold(c) {
    study.overlay = 'scaffold';
    body().innerHTML = '<div class="card practice-card scaffold-card">' +
      '<h2>Reconstruct it</h2>' +
      '<p class="muted">Missed — rebuild this one from the ground up before moving on.</p>' +
      '<div class="fcard-back scaffold-back">' + (c.back || '') + '</div>' +
      scaffoldPromptsHTML() +
      '<div class="btn-row"><button class="btn btn-primary" id="scaffold-continue">' +
      'Continue <span class="key-hint">space</span></button></div></div>';
    PGRE.typesetMath(body());
    document.getElementById('scaffold-continue').addEventListener('click', runNextOverlay);
  }

  /* F11 round checkpoint: pause after ROUND_SIZE presses with cards still queued. */
  function renderCheckpoint() {
    study.overlay = 'checkpoint';
    body().innerHTML = '<div class="card practice-card checkpoint-card">' +
      '<h2>Round complete</h2>' +
      '<p class="muted">' + study.done + ' card' + (study.done === 1 ? '' : 's') +
        ' graded · ' + study.queue.length + ' left in queue · +' + study.xp + ' XP so far.</p>' +
      '<div class="btn-row">' +
      '<button class="btn btn-primary" id="cp-keep">Keep going <span class="key-hint">space</span></button>' +
      '<button class="btn btn-ghost" id="cp-finish">Finish for now</button></div></div>';
    PGRE.typesetMath(body());
    document.getElementById('cp-keep').addEventListener('click', runNextOverlay);
    document.getElementById('cp-finish').addEventListener('click', function () {
      study.overlay = null;
      renderStudySummary();
    });
  }

  function renderStudySummary() {
    PGRE.gamify.addXP(study.xp, '· formula review', true);
    PGRE.store.log('review', 'Formula review: ' + study.done + ' card' +
      (study.done === 1 ? '' : 's') + (study.again ? ' (' + study.again + ' repeated)' : ''), study.xp);
    PGRE.gamify.checkAchievements();
    PGRE.store.save();
    body().innerHTML = '<div class="card practice-card">' +
      '<h1>Review complete</h1>' +
      '<div class="summary-score">' + study.done + ' card' + (study.done === 1 ? '' : 's') +
        '<span class="summary-pct">+' + study.xp + ' XP</span></div>' +
      '<p class="muted">' + (study.again ? study.again + ' came back for another pass this session. ' : '') +
      'Each card returns on the schedule your grade set.</p>' +
      '<div class="btn-row"><button class="btn btn-primary" id="back-deck">Back to the deck</button>' +
      '<a class="btn btn-ghost" href="#/">Dashboard</a></div></div>';
    document.getElementById('back-deck').addEventListener('click', function () {
      study = null;
      renderHome();
    });
    study = null;
  }

  /* ——— Match / Type / Quiz intros ——— */
  var INTRO = {
    match: { title: 'Match',
      desc: 'Pair each prompt with its formula against the clock — a wrong pair shakes and flips back. +2 XP per pair.' },
    type: { title: 'Type-to-recall',
      desc: 'See the prompt, type the formula, then grade yourself Again / Hard / Good / Easy — an auto-check preselects the default. Your grade schedules the card just like flip mode.' },
    quiz: { title: 'Auto-quiz',
      desc: 'Multiple choice built from your deck. Answer with 1–4 or a click; a right answer schedules the card Good, a miss Again.' },
    cloze: { title: 'Cloze',
      desc: 'One term of the formula is blanked — pick what goes in the box. The detail you’d fumble on exam day.' }
  };

  function renderGameIntro(kind) {
    teardownGame();
    if (!PGRE.flashmodes) { body().innerHTML = '<div class="card"><p class="muted">Loading…</p></div>'; return; }
    var ui = PGRE.ui, m = INTRO[kind];
    var remaining = PGRE.srs.formulaDayRemaining(deck).length;
    var metNote = 'Study today’s formulas first — games drill cards you’ve met.';
    var html = '<div class="card"><h2>' + m.title + '</h2><p class="muted">' + m.desc + '</p>';

    if (kind === 'match') {
      // Pair count comes from the ACTUAL pooled pick, not min(6, deck.length).
      var mcards = PGRE.flashmodes.pickMatchCards(deck);
      var pairs = mcards.length;
      var best = PGRE.flashmodes.matchBest(pairs);
      html += '<div class="stat-row stat-row-4">' +
        ui.statTile('Pairs this game', ui.fmt(pairs)) +
        ui.statTile('Best · ' + pairs + ' pairs', best != null ? PGRE.flashmodes.fmtTime(best) : '—') +
      '</div>';
      if (!pairs) {
        html += '<p class="muted">' + metNote + '</p></div>';
        body().innerHTML = html; return;
      }
      if (pairs < 2) {
        html += '<p class="muted">Match needs at least two cards to play.</p></div>';
        body().innerHTML = html; return;
      }
      html += '<div class="btn-row"><button class="btn btn-primary" id="game-start">Start ' +
        pairs + '-pair game</button></div>';
    } else if (kind === 'cloze') {
      // Round size is the ACTUAL cloze-able pool (pickQueue policy, filtered, cap 12).
      var cpool = PGRE.flashmodes.clozePool(deck);
      html += '<div class="stat-row stat-row-4">' +
        ui.statTile('This round', ui.fmt(cpool.length)) + '</div>';
      if (!cpool.length) {
        html += '<p class="muted">No cloze-able cards in today’s pool yet.</p></div>';
        body().innerHTML = html; return;
      }
      html += '<div class="btn-row"><button class="btn btn-primary" id="game-start">Start</button></div>';
    } else {
      var q = PGRE.flashmodes.pickQueue(deck);
      html += '<div class="stat-row stat-row-4">' +
        ui.statTile('Today remaining', ui.fmt(remaining)) +
        ui.statTile('This round', ui.fmt(q.length)) +
      '</div>' +
      '<p class="muted">' + (remaining ? 'Today’s remaining cards come first.' :
        (q.length ? 'Drilling cards you’ve already met.' : metNote)) + '</p>';
      if (kind === 'quiz' && deck.length < 2) {
        html += '<p class="muted">Quiz needs at least two cards to build choices.</p></div>';
        body().innerHTML = html; return;
      }
      if (!q.length) {
        html += '</div>';
        body().innerHTML = html; return;
      }
      html += '<div class="btn-row"><button class="btn btn-primary" id="game-start">Start</button></div>';
    }
    html += '</div>';
    body().innerHTML = html;
    PGRE.typesetMath(body());
    var b = document.getElementById('game-start');
    if (b) b.addEventListener('click', function () { launchGame(kind); });
  }

  function launchGame(kind) {
    teardownGame();
    var base = {
      el: body(),
      onReplay: function () { launchGame(kind); },
      onExit: function () { teardownGame(); renderGameIntro(kind); }
    };
    if (kind === 'match') {
      base.cards = PGRE.flashmodes.pickMatchCards(deck);
      activeGame = PGRE.flashmodes.startMatch(base);
    } else if (kind === 'type') {
      base.cards = PGRE.flashmodes.pickQueue(deck);
      activeGame = PGRE.flashmodes.startType(base);
    } else if (kind === 'cloze') {
      base.cards = PGRE.flashmodes.clozePool(deck);
      base.deck = deck;
      activeGame = PGRE.flashmodes.startCloze(base);
    } else {
      base.cards = PGRE.flashmodes.pickQueue(deck);
      base.deck = deck;
      activeGame = PGRE.flashmodes.startQuiz(base);
    }
  }

  /* One persistent, guarded keyboard handler (the view is a singleton). Study
     keeps its space/1–4 flow; the game modes route through their controller.
     While a text input is focused (Type mode), the input handles its own keys. */
  document.addEventListener('keydown', function (e) {
    if (!/^#\/formulas/.test(location.hash)) return;
    var typing = e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName);
    if (mode === 'study') {
      if (!study || typing) return;
      // F8: route strictly by the single overlay field — exactly one overlay at a
      // time, and each consumes only its own keys (never flipping/grading a hidden
      // live card underneath).
      var ov = study.overlay;
      if (ov === 'peek') {
        if (e.key === 'ArrowLeft') { e.preventDefault(); peekStep(-1); }
        else if (e.key === 'ArrowRight') {
          e.preventDefault();
          if (study.peek.idx >= study.history.length - 1) resumePeek();
          else peekStep(1);
        } else if (e.key === 'Escape') { e.preventDefault(); resumePeek(); }
        return;
      }
      if (ov === 'scaffold' || ov === 'checkpoint') {   // space/Enter = continue
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); runNextOverlay(); }
        return;
      }
      // ov === null: normal flip/grade flow + F1a undo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault(); undoGrade();
      } else if ((e.key === ' ' || e.key === 'Enter') && !study.flipped) {
        e.preventDefault(); flip();
      } else if (study.flipped && e.key >= '1' && e.key <= '4') {
        e.preventDefault(); grade(GRADES[parseInt(e.key, 10) - 1].key);
      } else if (e.key === 'ArrowLeft' && study.history.length) {
        e.preventDefault(); openPeek();
      }
      return;
    }
    if (typing) return;
    if (activeGame && activeGame.onKey) activeGame.onKey(e);
  });

  /* Leaving the portal mid-game stops any timers/intervals promptly. */
  window.addEventListener('hashchange', function () {
    if (!/^#\/formulas/.test(location.hash)) { teardownGame(); study = null; }
  });

  return {
    render: function () { return '<div id="formulas-root"></div>'; },
    mount: function () {
      study = null;
      teardownGame();
      mode = 'study';
      memStatsOpen = false;   // F10: honor "starts collapsed each mount"
      ensureFlashmodes().then(function () {
        return PGRE.formulaDeck();
      }).then(function (d) {
        deck = d;
        if (root()) { renderShell(); buildPrintSheet(); }
      });
    }
  };
})();
