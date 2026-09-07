/* Formula recall — four study modes on one portal, chosen with a tab switcher:
   • Study — the original vocabulary-app flip cards with Again/Hard/Good/Easy
     self-grading driving SM-2 intervals (js/srs.js) and a daily due queue. It
     is the default mode and its behaviour is unchanged.
   • Match — timed prompt ↔ formula pairing game.
   • Type  — see the prompt, type the formula, self-grade Close-enough / Missed.
   • Quiz  — multiple choice auto-generated from the deck.
   • Cloze — one blanked term of the formula, picked from four chips.
   • Search — find cards by name, prompt wording, topic or equation shape; the
     results ARE flashcards (face-down, one click to reveal) and can be studied
     as an ad-hoc session. An empty box browses the whole deck.
   The Match/Type/Quiz/Cloze game logic lives in js/flashmodes.js and the search
   matching in js/formula-search.js; this file owns the tabs, the Study flow, the
   search UI, and loading both helpers on demand. The deck
   (js/data-formulas.js) stays empty until cards arrive from the "Conquering the
   Physics GRE" import — with no deck the game tabs are disabled. */
window.PGRE = window.PGRE || {};
PGRE.views = PGRE.views || {};

PGRE.views.formulas = (function () {
  var deck = [];
  var mode = 'study';
  // Study session: { queue, total, done, again, xp, flipped, history, peek,
  //   overlay: null|'peek'|'scaffold'|'checkpoint', steps: {id->learningStep},
  //   undo: [snapshots], pressCount, pendingOverlays: [], settled }
  var study = null;
  var activeGame = null; // Match/Type/Quiz controller { onKey, stop } or null
  var browseTab = 'learned'; // Browse sub-tab: 'learned' | 'upcoming'
  var memStatsOpen = false;  // F10: Memory stats card starts collapsed each mount
  var ROUND_SIZE = 10;   // F11: grade presses per round (every press counts)
  // Classic Anki SM-2: four grades. (A legacy 'mastered' value may still
  // appear in cardReviews / lastGrade from older sessions; history chips
  // keep rendering it. Key 5 no longer grades.)
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
    PGRE.gamify.checkAchievements(); // before save() so a just-unlocked badge persists now
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
     loaded on first entry with a dynamic <script> — the game logic stays in
     its own file without editing the shell. Resolves even on failure so Study
     mode keeps working; a failed load clears the cached promise so the game
     tabs' Retry (and the next mount) can try again. */
  var flashLoad = null;
  function ensureFlashmodes() {
    if (PGRE.flashmodes) return Promise.resolve();
    if (flashLoad) return flashLoad;
    flashLoad = new Promise(function (resolve) {
      var s = document.createElement('script');
      s.src = 'js/flashmodes.js?v=20260906b';
      s.onload = function () { resolve(); };
      s.onerror = function () { flashLoad = null; resolve(); };
      document.head.appendChild(s);
    });
    return flashLoad;
  }

  /* js/formula-search.js is loaded the same way, on first entry to the Search
     tab — the matching engine is dead weight for every other mode. */
  var searchLoad = null, searchFailed = false;
  function ensureSearchEngine() {
    if (PGRE.formulaSearch) return Promise.resolve();
    if (searchLoad) return searchLoad;
    searchLoad = new Promise(function (resolve) {
      var s = document.createElement('script');
      s.src = 'js/formula-search.js';
      s.onload = function () { resolve(); };
      s.onerror = function () { searchLoad = null; searchFailed = true; resolve(); };
      document.head.appendChild(s);
    });
    return searchLoad;
  }

  function teardownGame() {
    if (activeGame && activeGame.stop) activeGame.stop();
    activeGame = null;
  }

  /* ——— Shell: mode tabs + a persistent body the modes render into ——— */
  function renderShell() {
    var empty = !deck.length;
    var tabs = [['study', 'Study'], ['match', 'Match'], ['type', 'Type'],
                ['quiz', 'Quiz'], ['cloze', 'Cloze'], ['visual', 'Lab'], ['search', 'Search']];
    var html = '<div class="flash-tabs-bar"><div class="flash-tabs" role="tablist">';
    tabs.forEach(function (t) {
      var dis = empty && t[0] !== 'study';
      var extra = '';
      if (t[0] === 'visual') {
        extra = ' title="Interactive Formula Visualizer Laboratory" aria-label="Visualizer Lab"';
      }
      html += '<button class="flash-tab' + (mode === t[0] ? ' active' : '') + '" role="tab"' +
        ' data-mode="' + t[0] + '"' + (dis ? ' disabled' : '') + extra + '>' + t[1] + '</button>';
    });
    html += '</div>';
    if (empty) {
      html += '<p class="flash-tab-note muted">The drills and Search arrive with the ' +
        'book import — they light up once the deck fills.</p>';
    } else {
      html += '<div class="flash-print-row">' +
        '<button class="btn btn-ghost btn-sm" id="print-formulas">Print formula sheet</button></div>';
    }
    html += '</div>';
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

  function formulaHTML(text) {
    return PGRE.formulaTextHTML ? PGRE.formulaTextHTML(text) : (text || '');
  }

  /* The answer face of a card: the same formula with its book equation number
     tagged on at RENDER time. Tag first, then formulaHTML — the prose mangler
     treats $$…$$ as a protected part, so the tag rides through untouched. Cards
     without an eq (hand-seeded PGRE.FORMULAS, imported decks) render bare. */
  function backHTML(c) {
    return formulaHTML(PGRE.formulaBackTagged ? PGRE.formulaBackTagged(c.back, c.eq) : c.back);
  }

  function topicCardsHTML(cards) {
    var ui = PGRE.ui, h = '<div class="ps-cards">';
    cards.forEach(function (c) {
      var nm = cardName(c);
      h += '<div class="ps-card">' +
        (nm ? '<div class="ps-card-tag">' + ui.esc(nm) + '</div>' : '') +
        '<div class="ps-card-front">' + formulaHTML(c.front) + '</div>' +
        '<div class="ps-card-back">' + backHTML(c) + '</div>' +
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
    flagWideCards();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(flagWideCards); // re-measure with real metrics
    }
  }

  function printSheet() {
    buildPrintSheet();
    document.body.classList.add('pgre-printing');
    window.print();
  }

  window.addEventListener('afterprint', function () {
    document.body.classList.remove('pgre-printing');
  });

  /* Flag cards too wide for print.css's 2-column grid so they span both
     columns (.ps-card.wide) instead of clipping. The sheet can't be measured
     in place: it is display:none on screen, and Chromium fires beforeprint
     BEFORE switching to print-media layout, so every width reads 0 there.
     Instead `.measuring` (css/style.css) lays the sheet out offscreen at one
     print column's card metrics. An overlong equation shows up as overflow of
     its .katex-display box — style.css gives those overflow-x:auto, which
     keeps the card's own scrollWidth put — so the boxes are checked directly;
     the card-level check still catches wide inline math. Runs at build time
     (headless Page.printToPDF fires no print events) and again on beforeprint
     so real prints re-measure after webfonts settle. */
  function flagWideCards() {
    var sheet = document.getElementById('formulas-print');
    if (!sheet) return;
    sheet.classList.add('measuring');
    var cards = sheet.querySelectorAll('.ps-card'), flags = [];
    cards.forEach(function (card) {
      var over = card.scrollWidth > card.clientWidth + 1;
      if (!over) {
        var maths = card.querySelectorAll('.katex-display');
        for (var i = 0; i < maths.length; i++) {
          if (maths[i].scrollWidth > maths[i].clientWidth + 1) { over = true; break; }
        }
      }
      flags.push(over);
    });
    cards.forEach(function (card, i) { card.classList.toggle('wide', flags[i]); });
    sheet.classList.remove('measuring');
  }

  window.addEventListener('beforeprint', flagWideCards);

  function switchMode(m) {
    if (m === mode) {
      /* Re-clicking the tab you are already on is normally a no-op — but a live
         Study session has taken the body over, and its own tab is the obvious
         "back to the deck" affordance. Nothing is lost: the round was persisted
         on every grade, so the home screen meets you with Resume. */
      if (m === 'study' && study) { settleStudy(); study = null; renderMode(); }
      return;
    }
    teardownGame();
    settleStudy();
    study = null;
    mode = m;
    renderShell();
  }

  function renderMode() {
    if (mode === 'match' || mode === 'type' || mode === 'quiz' || mode === 'cloze') return renderGameIntro(mode);
    if (mode === 'visual') return renderVisualizerLab();
    if (mode === 'search') return renderSearch();
    return renderHome();
  }

  function renderVisualizerLab() {
    teardownGame();
    if (PGRE.nav) PGRE.nav.setTrail([{ label: 'Visualizer Lab' }]);
    var filterTopic = 'all';

    function formatThumbFormula(formula) {
      if (!formula) return '';
      var latex = String(formula).trim();
      if (!latex.startsWith('$$') && !latex.startsWith('$') && !latex.startsWith('\\(') && !latex.startsWith('\\[')) {
        latex = '$$' + latex + '$$';
      }
      return latex;
    }

    function formatThumbStory(text, maxLen) {
      if (!text) return '';
      var clean = String(text).trim().replace(/\s+/g, ' ');
      var tokenRegex = /(\$\$[\s\S]*?\$\$|\$[^$]*?\$|\*\*[^*]+?\*\*|[^\s$*]+|\s+)/g;
      var match;
      var result = '';
      var limit = maxLen || 135;
      while ((match = tokenRegex.exec(clean)) !== null) {
        var token = match[0];
        if (result.length + token.length > limit && result.length >= 60) {
          break;
        }
        result += token;
      }
      result = result.trim();
      if (result.length < clean.length) {
        result = result.replace(/[,;:\s]+$/, '') + '...';
      }
      return result.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
    }

    function renderLabContent() {
      var allVizIds = Object.keys((window.PGRE && window.PGRE.visualizers) || {}).filter(function (k) {
        return k.startsWith('cpgf-');
      });
      var cards = allVizIds.map(function (id) {
        var v = PGRE.visualizers[id];
        var c = deckById(id) || { id: id, topic: (v && v.topic) || 'cm', name: (v && v.title) || id, front: (v && v.title) || id, back: (v && v.formulaLatex) || '' };
        return { id: id, viz: v, card: c };
      });

      var topicsList = [
        { id: 'all', name: 'All (' + cards.length + ')' },
        { id: 'cm', name: 'Classical Mechanics' },
        { id: 'em', name: 'Electromagnetism' },
        { id: 'ow', name: 'Optics & Waves' },
        { id: 'th', name: 'Thermodynamics' },
        { id: 'qm', name: 'Quantum Mechanics' },
        { id: 'at', name: 'Atomic Physics' },
        { id: 'sr', name: 'Special Relativity' },
        { id: 'lb', name: 'Lab Methods' },
        { id: 'sp', name: 'Special Topics' }
      ];

      var filtered = cards.filter(function (item) {
        return (filterTopic === 'all' || item.card.topic === filterTopic || (item.viz && item.viz.topic === filterTopic));
      });

      var html = '<div class="viz-lab-container">' +
        '<div class="viz-lab-header">' +
          '<h1 class="viz-lab-title">Interactive Formula Visualizer Laboratory</h1>' +
          '<p class="viz-lab-sub">Hands-on simulations, vector fields, phase-space flows, and limiting cases for Physics GRE formulas.</p>' +
        '</div>' +
        '<div class="viz-filter-bar">' +
          topicsList.map(function (tp) {
            return '<button class="viz-filter-chip' + (filterTopic === tp.id ? ' active' : '') + '" data-topic="' + tp.id + '">' + tp.name + '</button>';
          }).join('') +
        '</div>' +
        '<div class="viz-cards-grid">';

      filtered.forEach(function (item) {
        var v = item.viz, c = item.card;
        var tObj = PGRE.topicById(c.topic);
        var tName = tObj ? tObj.name : c.topic.toUpperCase();
        var rawStory = (v && v.physicalStory) || (c && c.front) || '';
        var shortStory = formatThumbStory(rawStory, 135);
        var rawFormula = (v && v.formulaLatex) || (c && c.back) || '';
        var formulaLatex = formatThumbFormula(rawFormula);
        var titleText = (v && v.title) || (c && c.name) || '';

        html += '<div class="viz-thumb-card" data-viz-id="' + item.id + '">' +
          '<div class="viz-thumb-head">' +
            '<span class="viz-inline-badge">' + tName + '</span>' +
            '<span class="viz-thumb-eq">' + (c.eq ? ('Eq ' + c.eq) : item.id) + '</span>' +
          '</div>' +
          '<div class="viz-thumb-title">' + PGRE.ui.esc(titleText) + '</div>' +
          '<div class="viz-thumb-formula">' + formulaLatex + '</div>' +
          '<div class="viz-thumb-desc">' + shortStory + '</div>' +
          '<button class="btn btn-primary btn-sm" style="margin-top:auto;">Open Simulation</button>' +
        '</div>';
      });

      html += '</div></div>';
      body().innerHTML = html;
      PGRE.typesetMath(body());

      body().querySelectorAll('.viz-filter-chip').forEach(function (chip) {
        chip.addEventListener('click', function () {
          filterTopic = chip.getAttribute('data-topic');
          renderLabContent();
        });
      });

      body().querySelectorAll('.viz-thumb-card').forEach(function (cardEl) {
        cardEl.addEventListener('click', function () {
          var id = cardEl.getAttribute('data-viz-id');
          if (window.PGRE.openVisualizerModal) window.PGRE.openVisualizerModal(id);
        });
      });
    }

    renderLabContent();
  }

  /* ——— Study mode home — progressive daily batch, rendered into body ——— */
  function renderHome() {
    study = null;
    if (PGRE.nav) PGRE.nav.setTrail([]);   // BUNDLE G: back to base (Home ▸ Formula recall)
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
      'when the card returns. Each day <strong>you pick</strong> which cards to recall. ' +
      'The tabs above add <strong>Match</strong>, <strong>Type</strong> and <strong>Quiz</strong> ' +
      'drills over the same deck.</p></div>';

    // Game-style daily check-in strip (formula-specific streak; not the global study streak).
    if (PGRE.formulaCheckIn && typeof PGRE.formulaCheckIn.stripHTML === 'function') {
      html += PGRE.formulaCheckIn.stripHTML();
    }

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
    var pickedN = reviewsN + newN;            // the batch is fully user-curated
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
      html += '<div class="card final-pass-banner"><strong>Final pass</strong> — ' +
        learnedN + ' learned formula' + (learnedN === 1 ? '' : 's') + ', ' +
        days + ' day' + (days === 1 ? '' : 's') + ' left. ' +
        '<span class="muted">Pick due cards into today’s batch so every formula ' +
        'gets one more look before exam day.</span></div>';
    }

    // ——— Leech nudge (F2) — cards that keep slipping despite reviews ———
    var leeches = deck.filter(function (c) {
      return srs.isLeech(srs.cardState(c.id)) && !srs.isSuspended(c.id);
    });
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
    // Interval-cap switch: exam-capped Anki (default) vs uncapped classic Anki.
    // Does not rewrite cards already scheduled — only the next grade and the
    // numbers on the buttons. Missing key (pre-migrate) reads as ON.
    var capOn = PGRE.store.state.settings.formulaExamCap !== false;
    html += '<div class="direction-row"><span class="exam-day-label">Intervals</span>' +
      '<button class="btn btn-ghost btn-sm" id="exam-cap-toggle">' +
      (capOn ? 'Capped to exam day' : 'Classic Anki (uncapped)') + '</button></div>';
    // F5: Study direction toggle. false = Prompt → Formula (recall the equation);
    // true = Formula → Prompt (name it / say when it applies). Persists + re-renders.
    var reverse = !!PGRE.store.state.settings.formulaReverse;
    html += '<div class="direction-row"><span class="exam-day-label">Direction</span>' +
      '<button class="btn btn-ghost btn-sm" id="dir-toggle">' +
      (reverse ? 'Formula → Prompt' : 'Prompt → Formula') + '</button></div>';
    html += '<div class="direction-row"><span class="exam-day-label">Card progress</span>' +
      '<button class="btn btn-ghost btn-sm" id="reset-cards-btn">Reset card progress</button></div>';

    var comp = pickedN
      ? reviewsN + ' review' + (reviewsN === 1 ? '' : 's') + ' + ' +
        newN + ' new picked for today.'
      : 'Nothing picked yet — choose today’s cards below.';
    if (pickedN && postponed > 0) {
      comp += ' ' + postponed + ' more review' + (postponed === 1 ? ' is' : 's are') +
        ' due but not picked.';
    }
    html += '<p class="muted comp-line">' + comp + '</p>';
    if (batch.softIds && batch.softIds.length) {
      var nSoft = batch.softIds.length;
      html += '<p class="muted soft-pin-note">' + nSoft + ' card' +
        (nSoft === 1 ? '' : 's') +
        ' added from Search before their due date (kept until studied).</p>';
    }

    // Primary action: resume a mid-flight session, study what remains of the
    // picked batch, or — when the batch is empty or done — point at the picker.
    var resumeCards = rehydrateSavedStudy();
    if (resumeCards) {
      html += '<div class="btn-row"><button class="btn btn-primary" id="resume-btn">' +
        'Resume session — ' + resumeCards.length + ' left</button>';
    } else if (M > 0) {
      html += '<div class="btn-row"><button class="btn btn-primary" id="study-btn">Study ' +
        M + ' remaining</button>';
    } else {
      html += '<h3 class="caught-up">' + (pickedN ? 'You’re all caught up' : 'Nothing picked yet') + '</h3>' +
        '<p class="muted">' + (pickedN
          ? 'Today’s picks are done — the next cards return on their schedule.'
          : 'Pick the formulas you want to recall today — nothing is chosen for you.') + '</p>' +
        '<div class="btn-row">';
    }
    html += '<button class="btn btn-ghost" id="pick-btn">Pick today’s cards</button>';
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
    // ITEM 2: resume the persisted session (re-rehydrate at click time in case
    // the deck/session shifted; fall back to a home refresh if it vanished).
    var rsb = document.getElementById('resume-btn');
    if (rsb) rsb.addEventListener('click', function () {
      var cards = rehydrateSavedStudy();
      if (cards) resumeStudy(cards);
      else renderHome();
    });
    wireStepper();
    var ed = document.getElementById('exam-date');
    if (ed) ed.addEventListener('change', function () {
      PGRE.store.state.settings.examDate = ed.value;   // '' when cleared → cap off
      PGRE.store.save();
      renderHome();
    });
    var ect = document.getElementById('exam-cap-toggle');
    if (ect) ect.addEventListener('click', function () {
      var s = PGRE.store.state.settings;
      s.formulaExamCap = s.formulaExamCap === false;
      PGRE.store.save();
      renderHome();
    });
    var pb = document.getElementById('pick-btn');
    if (pb) pb.addEventListener('click', renderPicker);
    // F2: drill the leeches — a normal-grading session independent of the daily
    // batch (these cards may already be studied today; they still surface here).
    // Put-away cards are excluded: a shelved card is very often also a leech,
    // and grading it here would rewrite the schedule the user shelved it to avoid.
    var ld = document.getElementById('leech-drill');
    if (ld) ld.addEventListener('click', function () {
      startStudy(deck.filter(function (c) {
        return PGRE.srs.isLeech(PGRE.srs.cardState(c.id)) && !PGRE.srs.isSuspended(c.id);
      }));
    });
    // F5: flip the Study direction, persist, re-render.
    var dt = document.getElementById('dir-toggle');
    if (dt) dt.addEventListener('click', function () {
      PGRE.store.state.settings.formulaReverse = !PGRE.store.state.settings.formulaReverse;
      PGRE.store.save();
      renderHome();
    });
    var rcb = document.getElementById('reset-cards-btn');
    if (rcb) rcb.addEventListener('click', function () {
      if (confirm('Reset all formula flashcard intervals and progress so you can recall them from scratch? Your question bank and exam scores will not be affected.')) {
        PGRE.store.resetFormulaCards();
        renderHome();
        if (PGRE.toast) PGRE.toast('All formula cards have been reset to new.', 'info');
      }
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
        if (srs.isSuspended(c.id)) chips += '<span class="due-chip suspended-chip">put away</span>';
        if (inBatch[c.id]) chips += '<span class="due-chip today-chip">today</span>';
        html += '<div class="browse-row" data-cardid="' + ui.esc(c.id) + '">' +
          '<span class="deck-name">' + ui.esc(cardName(c)) + '</span>' +
          '<span class="browse-chips">' + chips + '</span>' +
          '<button type="button" class="btn btn-ghost btn-sm browse-batch-btn" ' +
            'data-bid="' + ui.esc(c.id) + '" data-batch="' + (inBatch[c.id] ? 'rm' : 'add') + '">' +
            (inBatch[c.id] ? '− today' : '+ today') + '</button></div>' +
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
        if (srs.isSuspended(c.id)) chips += '<span class="due-chip suspended-chip">put away</span>';
        if (inBatch[c.id]) chips += '<span class="due-chip today-chip">today</span>';
        html += '<div class="browse-row" data-cardid="' + ui.esc(c.id) + '">' +
          '<span class="deck-name">' + ui.esc(cardName(c)) + '</span>' +
          '<span class="browse-chips">' + chips + '</span>' +
          '<button type="button" class="btn btn-ghost btn-sm browse-batch-btn" ' +
            'data-bid="' + ui.esc(c.id) + '" data-batch="' + (inBatch[c.id] ? 'rm' : 'add') + '">' +
            (inBatch[c.id] ? '− today' : '+ today') + '</button></div>' +
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

  /* "+ today" / "− today" chip on each browse row: add/remove the card from
     the picked batch in place. Re-renders the list so chips and button labels
     stay truthful. */
  function wireBatchToggle(box) {
    box.querySelectorAll('.browse-batch-btn').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();          // never toggle the row's peek
        var bid = b.getAttribute('data-bid');
        if (b.getAttribute('data-batch') === 'rm') {
          PGRE.srs.removeFormulaDaySoft(deck, [bid]);
        } else {
          PGRE.srs.addFormulaDaySoft(deck, [bid]);
        }
        box.innerHTML = browseBodyHTML();
        PGRE.typesetMath(box);
        wirePeek(box);
        wireBatchToggle(box);
        if (PGRE.refreshNavBadges) PGRE.refreshNavBadges();
      });
    });
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
        PGRE.typesetMath(box);   // deck names/tags can carry $…$ — typeset the swapped-in list
        wirePeek(box);
        wireBatchToggle(box);
      });
    });
    wirePeek(box);
    wireBatchToggle(box);
  }

  /* Read-only memorizing-history strip from cardReviews + current due.
     Pure model via srs.buildMemHistory; all labels escaped. Empty → ''.
     Viewing never mutates schedule or the log. */
  function memHistoryHTML(id) {
    var st = PGRE.srs.cardState(id);
    var log = PGRE.store.state.cardReviews || [];
    var model = PGRE.srs.buildMemHistory(log, id, {
      due: st && st.due,
      today: PGRE.srs.today()
    });
    var ui = PGRE.ui;
    // Learned card with no surviving log rows (cap eviction / pre-log grades).
    if (!model) {
      if (!st) return '';
      return '<div class="mem-hist mem-hist-empty">' +
        '<div class="mem-hist-summary">No review history retained in the log.</div></div>';
    }
    var summary = ui.esc(model.firstDay) + ' → ' + ui.esc(model.lastDay) +
      ' <span class="mem-hist-sep">|</span> ' +
      model.count + ' review' + (model.count === 1 ? '' : 's');
    if (model.chipsTruncated) {
      summary += ' <span class="mem-hist-note">(showing last ' +
        model.chips.length + ')</span>';
    }
    // Global FIFO cap honesty: D1 is first *surviving* day, not necessarily life-of-card.
    if (log.length >= 8000) {
      summary += '<div class="mem-hist-note">Recent reviews only — global log is capped.</div>';
    }
    var chips = '';
    model.chips.forEach(function (ch) {
      var g = ch.grade;
      // Class only via own-key allowlist — never interpolate unknown grades.
      var cls = PGRE.srs.isMemGrade(g) ? (' grade-' + g) : '';
      var dayN = (typeof ch.day === 'number' && isFinite(ch.day)) ? String(ch.day | 0) : '?';
      chips += '<span class="grade-chip mem-hist-chip' + cls + '" title="' +
        ui.esc(ch.d + ' · ' + g) + '">D' + dayN + '@' + ui.esc(g) + '</span>';
    });
    if (model.pending) {
      var p = model.pending;
      var pDay = (typeof p.day === 'number' && isFinite(p.day) && p.day >= 1)
        ? ('D' + (p.day | 0) + ' ') : '';
      chips += '<span class="due-chip mem-hist-chip mem-hist-pending' +
        (p.label === 'due today' ? ' due-now' : '') + '" title="' +
        ui.esc(p.d + ' · ' + p.label) + '">' + pDay + ui.esc(p.label) + '</span>';
    }
    return '<div class="mem-hist" data-mem-hist="' + ui.esc(id) + '">' +
      '<div class="mem-hist-summary">' + summary + '</div>' +
      '<div class="mem-hist-chips">' + chips + '</div></div>';
  }

  /* Paint (or clear) the history section. Called on every peek open so a
     grade committed elsewhere still shows without re-filling the card body. */
  function wireMemHistory(section, id) {
    if (!section) return;
    section.innerHTML = memHistoryHTML(id);
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
            // HTML attributes use PGRE.ui.esc (not cssAttr — that is only for
            // querySelector). History slot needs no data-id; row id is passed in.
            peek.innerHTML = '<div class="fcard-front">' + formulaHTML(c.front) + '</div>' +
              '<div class="fcard-back">' + backHTML(c) +
              (c.note ? '<div class="fcard-note">' + formulaHTML(c.note) + '</div>' : '') + '</div>' +
              '<div class="peek-history"></div>' +
              '<div class="peek-suspend" data-susp-for="' + PGRE.ui.esc(c.id) + '"></div>' +
              '<div class="peek-mnemonic" data-mnem-for="' + PGRE.ui.esc(c.id) + '"></div>';
            peek.setAttribute('data-filled', '1');
            PGRE.typesetMath(peek);
            // F2: mnemonic editor lives below the card body (plain text, no math).
            wireMnemonic(peek.querySelector('.peek-mnemonic'), c.id);
          }
        }
        // Redrawn on every open (not just the first fill) so the control tracks
        // the card’s current suspended state rather than the state at fill time.
        wireRestore(peek.querySelector('.peek-suspend'), id, row);
        // History is view-only over the durable log + current due — refresh each open.
        wireMemHistory(peek.querySelector('.peek-history'), id);
        peek.hidden = false;
        row.classList.add('open');
      });
    });
  }

  /* Restore ("un-put-away") control inside a browse peek. Draws nothing for a
     card that isn’t suspended. Restoring only clears the flag — the card never
     re-enters the batch on its own; the user picks it (picker or "+ today").
     Updates the row in place so the open peek and the scroll position survive. */
  function wireRestore(section, id, row) {
    if (!section) return;
    if (!PGRE.srs.isSuspended(id)) { section.innerHTML = ''; return; }
    section.innerHTML = '<p class="peek-suspend-note">Put away — held out of the daily batch.</p>' +
      '<button class="btn btn-ghost btn-sm" data-susp="restore">Restore to deck</button>';
    var b = section.querySelector('[data-susp="restore"]');
    if (b) b.addEventListener('click', function () {
      PGRE.srs.unsuspendCard(id);
      PGRE.store.save();
      var chip = row.querySelector('.suspended-chip');
      if (chip && chip.parentNode) chip.parentNode.removeChild(chip);
      section.innerHTML = '<p class="peek-suspend-note">Restored — add it to today’s ' +
        'batch with “+ today” or the picker if you want it now.</p>';
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

  /* ——— Daily picker: due reviews first, then upcoming, then new ———
     The only surface that composes a batch from scratch; browse chips and
     search Add edit the same batch one card at a time. No cap: the daily
     target is a soft suggestion shown live in the count line. */
  function renderPicker() {
    if (PGRE.nav) PGRE.nav.setTrail(['Pick today’s cards']);   // BUNDLE G
    var ui = PGRE.ui, srs = PGRE.srs;
    var batch = srs.formulaDay(deck);
    var T = srs.clampTarget(PGRE.store.state.settings.formulaDailyTarget);
    var inBatch = {};
    batch.reviewIds.concat(batch.newIds).forEach(function (id) { inBatch[id] = 1; });

    var html = '<div class="card"><h2>Pick today’s cards</h2>' +
      '<p class="muted">Choose which formulas to recall today — due cards first, ' +
      'then upcoming and never-studied. Cards already studied today are locked in.</p>' +
      '<div class="picker-bar"><input type="text" id="picker-filter" ' +
      'placeholder="Filter by name">' +
      '<span class="picker-count" id="picker-count"></span>' +
      '<div class="btn-row picker-actions">' +
      '<button class="btn btn-primary" id="picker-save">Save picks</button>' +
      '<button class="btn btn-ghost" id="picker-clear">Clear all</button>' +
      '<button class="btn btn-ghost" id="picker-cancel">Cancel</button></div></div>';

    function rowHTML(c) {
      var st = srs.cardState(c.id);
      var locked = srs.studiedToday(st);
      var chip;
      if (!st) {
        chip = '<span class="due-chip">new</span>';
      } else {
        var du = srs.daysUntil(st.due);
        chip = '<span class="due-chip' + (du <= 0 ? ' due-now' : '') + '">' +
          (du <= 0 ? 'due now' : 'due in ' + srs.ivlLabel(du)) + '</span>';
      }
      if (locked) chip += '<span class="due-chip today-chip">done today</span>';
      return '<label class="picker-row' + (locked ? ' is-locked' : '') + '">' +
        '<input type="checkbox" class="picker-box" value="' + ui.esc(c.id) + '"' +
          (inBatch[c.id] ? ' checked' : '') + (locked ? ' disabled data-locked="1"' : '') + '>' +
        '<span class="deck-name">' + ui.esc(cardName(c)) + '</span>' + chip + '</label>';
    }

    // Three sections, each topic-grouped: due now, upcoming, never-studied.
    var today = srs.today();
    var sections = [
      { title: 'Due now', test: function (st) { return !!st && st.due <= today; } },
      { title: 'Upcoming', test: function (st) { return !!st && st.due > today; } },
      { title: 'New', test: function (st) { return !st; } }
    ];
    sections.forEach(function (sec) {
      var anySec = false, secHTML = '';
      PGRE.TOPICS.forEach(function (t) {
        var cards = deck.filter(function (c) {
          return c.topic === t.id && sec.test(srs.cardState(c.id));
        });
        if (!cards.length) return;
        anySec = true;
        secHTML += '<div class="picker-topic"><div class="picker-topic-head">' +
          '<label class="picker-selall"><input type="checkbox" class="picker-selall-box" ' +
            'data-topic="' + ui.esc(t.id) + '"> ' + ui.monogram(t) + ' ' + ui.esc(t.name) +
          '</label></div>' + cards.map(rowHTML).join('') + '</div>';
      });
      if (anySec) {
        html += '<h3 class="picker-section">' + sec.title + '</h3>' + secHTML;
      }
    });
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
      var cc = document.getElementById('picker-count');
      if (cc) cc.textContent = n + ' picked · target ' + T;
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
        rows.forEach(function (b) { b.checked = sa.checked; });
        refresh();
      });
    });
    // Name filter: hide non-matching rows, then topics with nothing visible.
    var filter = document.getElementById('picker-filter');
    if (filter) filter.addEventListener('input', function () {
      var q = filter.value.trim().toLowerCase();
      body().querySelectorAll('.picker-row').forEach(function (r) {
        var name = r.querySelector('.deck-name');
        r.hidden = !!q && !!name && name.textContent.toLowerCase().indexOf(q) === -1;
      });
      body().querySelectorAll('.picker-topic').forEach(function (tp) {
        var visible = Array.prototype.some.call(
          tp.querySelectorAll('.picker-row'), function (r) { return !r.hidden; });
        tp.hidden = !visible;
      });
    });
    refresh();

    document.getElementById('picker-clear').addEventListener('click', function () {
      selectable().forEach(function (b) { b.checked = false; });
      body().querySelectorAll('.picker-selall-box').forEach(function (sa) { sa.checked = false; });
      refresh();
    });
    document.getElementById('picker-cancel').addEventListener('click', renderHome);
    document.getElementById('picker-save').addEventListener('click', function () {
      var ids = [];
      selectable().forEach(function (b) { if (b.checked) ids.push(b.value); });
      PGRE.srs.setFormulaDayPicks(deck, ids);
      renderHome();
    });
  }

  function startStudy(cards) {
    if (!cards.length) return;
    if (PGRE.nav) PGRE.nav.setTrail(['Study']);   // BUNDLE G: session is live
    study = { queue: interleaveByTopic(cards), total: cards.length, done: 0,
              doneBase: 0, again: 0, againBase: 0, xp: 0, flipped: false,
              history: [], peek: null,
              overlay: null, steps: {}, undo: [], pressCount: 0,
              pendingOverlays: [], settled: false };
    persistStudy();          // ITEM 2: snapshot the fresh order so a resume matches
    PGRE.store.save();
    renderCard();
  }

  /* ——— ITEM 2: in-session persistence ———
     Mirror the live session into state.formulaStudy so an exit/re-enter resumes
     it instead of restarting. Card objects are stored as ids only (rehydrated
     from the deck on resume); counters, learning steps and history ride along.
     The undo stack is deliberately NOT persisted — it stays session-only.
     persistStudy() only stages state; the caller's existing store.save() writes
     it, so there is no extra save churn. leech-drill sessions persist too (they
     go through startStudy like every other session — the resume simply restores
     whatever queue was mid-flight). */
  function persistStudy() {
    if (!study) return;
    var stepsCopy = {};
    for (var k in study.steps) stepsCopy[k] = study.steps[k];
    PGRE.store.state.formulaStudy = {
      date: PGRE.srs.today(),
      queueIds: study.queue.map(function (c) { return c.id; }),
      done: study.done,
      again: study.again,
      steps: stepsCopy,
      pressCount: study.pressCount,
      history: study.history.map(function (h) { return { id: h.c.id, grade: h.grade }; })
    };
  }

  /* Rebuild the card list for a session saved earlier TODAY, or null. Drops ids
     that have left the deck; drops (and clears) the whole saved session when it
     is from another day or rehydrates to an empty queue. Never touches the
     schedule — it only reads the deck. */
  function rehydrateSavedStudy() {
    var saved = PGRE.store.state.formulaStudy;
    // Array.isArray (not a truthy check): a corrupt/hand-edited backup may carry a
    // same-day formulaStudy whose queueIds is a non-array (e.g. a string) — that has
    // a .length so a truthy guard would pass, then .forEach below throws and aborts
    // renderHome. Requiring a real array drops such a session as unresumable.
    if (!saved || saved.date !== PGRE.srs.today() ||
        !Array.isArray(saved.queueIds) || !saved.queueIds.length) {
      if (saved) { PGRE.store.state.formulaStudy = null; PGRE.store.save(); }
      return null;
    }
    var cards = [];
    saved.queueIds.forEach(function (id) {
      var c = deckById(id);
      if (c) cards.push(c);
    });
    if (!cards.length) {
      PGRE.store.state.formulaStudy = null;
      PGRE.store.save();
      return null;
    }
    return cards;
  }

  /* Resume the saved session: restore the exact queue order, learning steps,
     counters and history (card objects rehydrated from the deck by id). Per the
     brief, XP restarts at 0 for the resumed segment — the earlier segment's XP
     already settled on exit — and settled resets to false so this segment settles
     too. The undo stack starts empty (it never crossed the exit). */
  function resumeStudy(cards) {
    if (PGRE.nav) PGRE.nav.setTrail(['Study']);   // BUNDLE G: resumed session is live
    var saved = PGRE.store.state.formulaStudy || {};
    var history = [];
    // Guard against a corrupt backup where history/steps are the wrong type: a
    // truthy non-array history would throw on .forEach, and a non-object steps
    // would enumerate garbage. Both fall back to empty rather than aborting.
    (Array.isArray(saved.history) ? saved.history : []).forEach(function (h) {
      var c = deckById(h.id);
      if (c) history.push({ c: c, grade: h.grade });
    });
    var stepsCopy = {};
    var savedSteps = (saved.steps && typeof saved.steps === 'object') ? saved.steps : {};
    for (var k in savedSteps) stepsCopy[k] = savedSteps[k];
    study = { queue: cards, total: (saved.done || 0) + cards.length,
              done: saved.done || 0, doneBase: saved.done || 0,
              again: saved.again || 0, againBase: saved.again || 0, xp: 0,
              flipped: false, history: history, peek: null, overlay: null,
              steps: stepsCopy, undo: [], pressCount: saved.pressCount || 0,
              pendingOverlays: [], settled: false };
    renderCard();
  }

  function renderCard() {
    if (window.PGRE && window.PGRE.teardownInlineVisualizer) {
      window.PGRE.teardownInlineVisualizer();
    }
    var c = study.queue[0];
    var t = PGRE.topicById(c.topic);
    var nm = cardName(c);
    var step = study.steps[c.id] || 0;   // F7 learning step (0 or 1)
    var learnChip = step === 1 ? '<span class="chip learn-chip">learning 1/2</span>' : '';
    var undoBtn = study.undo.length ?      // F1a ghost undo when the stack is live
      '<button class="btn btn-ghost btn-sm study-undo" id="study-undo">Undo ' +
        '<span class="key-hint">⌘Z</span></button>' : '';
    var noteHTML = c.note ? '<div class="fcard-note">' + formulaHTML(c.note) + '</div>' : '';
    var mnem = mnemonicHTML(c.id);         // F2: shown under the note after a flip
    // F5: reverse direction shows the formula as the question ("what is this?")
    // and reveals name + prompt + note + mnemonic. Same SM-2 state and grading —
    // only the two faces swap; learning steps / undo / scaffold / rounds untouched.
    var reverse = !!PGRE.store.state.settings.formulaReverse;
    var frontFace, backFace;
    if (reverse) {
      frontFace = '<div class="fcard-rev-q">What is this? When does it apply?</div>' +
        '<div class="fcard-front" id="fcard-front">' + formulaHTML(c.back) + '</div>';
      backFace = (nm ? '<div class="fcard-name">' + PGRE.ui.esc(nm) + '</div>' : '') +
        '<div class="fcard-rev-prompt">' + formulaHTML(c.front) + '</div>' + noteHTML + mnem;
    } else {
      frontFace = (nm ? '<div class="fcard-name">' + PGRE.ui.esc(nm) + '</div>' : '') +
        '<div class="fcard-front" id="fcard-front">' + formulaHTML(c.front || 'Recall the formula.') + '</div>';
      backFace = backHTML(c) + noteHTML + mnem;
    }
    var html = '<div class="card practice-card">' +
      '<div class="practice-meta">' +
        '<span>Card ' + (study.done + 1) + ' · ' + study.queue.length + ' left</span>' +
        (study.history.length ? '<button class="btn btn-ghost btn-sm session-back" id="session-back">' +
          'Back <span class="key-hint">←</span></button>' : '') +
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
        '<button class="btn btn-ghost" id="skip-btn">Skip</button>' +
        '<button class="btn btn-ghost" id="putaway-btn">Put away</button>' +
      '</div></div>';
    body().innerHTML = html;
    PGRE.typesetMath(body());
    if (window.PGRE && PGRE.motion && PGRE.motion.animateMeter) {
      var mf = body().querySelector('.meter-thin .meter-fill');
      if (mf) PGRE.motion.animateMeter(mf, 100 * study.done / (study.done + study.queue.length));
    }
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
    var sb = document.getElementById('skip-btn');
    if (sb) sb.addEventListener('click', function (e) { e.stopPropagation(); skipCard(); });
    var pa = document.getElementById('putaway-btn');
    if (pa) pa.addEventListener('click', function (e) { e.stopPropagation(); putAwayCard(); });
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
        '<div class="fcard-front">' + formulaHTML(c.front) + '</div>' +
        '<div class="fcard-back">' + backHTML(c) +
          (c.note ? '<div class="fcard-note">' + formulaHTML(c.note) + '</div>' : '') + '</div>' +
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
    var backEl = document.getElementById('fcard-back');
    if (backEl) {
      backEl.hidden = false;
      backEl.classList.add('reveal-in');   // fade + 4px rise via motion tokens
      if (window.PGRE && window.PGRE.renderInlineVisualizer) {
        window.PGRE.renderInlineVisualizer(c.id, backEl);
      }
    }
    // F5 reverse: the equation is the QUESTION, so its book number would give the
    // answer away. It is withheld until here, then the front is re-rendered with
    // the tag and typeset on its own (re-running it over the whole card would
    // re-typeset the already-rendered back).
    if (PGRE.store.state.settings.formulaReverse) {
      var front = document.getElementById('fcard-front');
      if (front) { front.innerHTML = backHTML(c); PGRE.typesetMath(front); }
    }
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
      var lbl;
      if (stateless && step === 0 && (g.key === 'hard' || g.key === 'good')) lbl = 'soon';
      else lbl = PGRE.srs.ivlLabel(ivls[g.key]);
      html += '<button class="btn grade-btn grade-' + g.key + '" data-grade="' + g.key + '">' +
        '<span class="grade-top">' + g.label + ' <span class="key-hint">' + g.hint + '</span></span>' +
        '<span class="grade-ivl">' + lbl + '</span></button>';
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
    var pressed = document.querySelector('#fcard-actions [data-grade="' + g + '"]');
    if (pressed) pressed.classList.add('chosen');   // instant tint, no delay — keyboard flow unaffected
    var step = study.steps[id] || 0;

    // F1a: snapshot the whole session + card state BEFORE any mutation.
    pushUndo(id);
    study.pressCount++;                         // F11: every press counts toward a round

    var recycled = false;                       // an Again press → post-Again scaffold

    if (stateless) {
      if (g === 'easy') {                        // Anki: Easy graduates immediately
        PGRE.srs.gradeCard(id, g);
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
    persistStudy();                 // ITEM 2: stage the resume snapshot into the same save
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
  function skipCard() {
    if (!study || study.overlay) return;
    study.queue.shift();
    study.total--;
    study.undo = [];
    persistStudy();
    PGRE.store.save();
    if (study.queue.length) renderCard();
    else renderStudySummary();
  }

  function putAwayCard() {
    if (!study || study.overlay) return;
    var c = study.queue.shift();
    PGRE.srs.suspendCard(c.id);
    study.total--;
    study.undo = [];
    persistStudy();
    PGRE.store.save();
    if (study.queue.length) renderCard();
    else renderStudySummary();
  }

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
      day: PGRE.srs.today(),   // grade-time day, so an undo across midnight still pops its row
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
      if (last && last.id === e.id && last.d === e.day) revs.pop();
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
    persistStudy();                 // ITEM 2: keep the resume snapshot in step with the undo
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
      '<div class="fcard-back scaffold-back">' + backHTML(c) + '</div>' +
      scaffoldPromptsHTML() +
      '<div class="btn-row"><button class="btn btn-primary" id="scaffold-continue">' +
      'Continue <span class="key-hint">space</span></button></div></div>';
    PGRE.typesetMath(body());
    document.getElementById('scaffold-continue').addEventListener('click', runNextOverlay);
  }

  /* F11 round checkpoint: pause after ROUND_SIZE presses with cards still queued. */
  function renderCheckpoint() {
    study.overlay = 'checkpoint';
    // study.done is cumulative across a resume (doneBase carries the earlier
    // segment's cards forward) but study.xp resets to 0 on resume, so pairing
    // them understates the session's XP. Use the session-wide pressCount * 2 —
    // the same honest basis renderStudySummary uses — beside the card count.
    var totalXp = study.pressCount * 2;
    body().innerHTML = '<div class="card practice-card checkpoint-card">' +
      '<h2>Round complete</h2>' +
      '<p class="muted">' + study.done + ' card' + (study.done === 1 ? '' : 's') +
        ' graded · ' + study.queue.length + ' left in queue · +' + totalXp + ' XP so far.</p>' +
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

  /* Settle the session's XP + activity-log line exactly once. The summary
     path calls it on a natural finish; switchMode / hashchange / mount call
     it when a round is abandoned after grades were already committed. */
  function settleStudy() {
    if (!study || study.settled || study.xp === 0) return;
    study.settled = true;
    PGRE.gamify.addXP(study.xp, '· formula review', true);
    // Log only the cards graded in THIS segment. done is cumulative across a
    // resume (resumeStudy carries saved.done forward), so subtract the segment's
    // starting count — otherwise a resumed segment re-counts the earlier segment's
    // cards in the recent-activity feed (which already logged them on exit).
    var segDone = study.done - (study.doneBase || 0);
    var segAgain = study.again - (study.againBase || 0);
    PGRE.store.log('review', 'Formula review: ' + segDone + ' card' +
      (segDone === 1 ? '' : 's') + (segAgain ? ' (' + segAgain + ' repeated)' : ''), study.xp);
    // Formula daily check-in (once per local day) — auto-claim on first settle.
    if (PGRE.formulaCheckIn && typeof PGRE.formulaCheckIn.record === 'function') {
      study.checkInResult = PGRE.formulaCheckIn.record();
    }
    if (study.done >= 20 && study.again === 0) PGRE.store.state.flags.cleanRecall = true;
    PGRE.gamify.checkAchievements();
    PGRE.store.save();
  }

  function renderStudySummary() {
    if (PGRE.nav) PGRE.nav.setTrail([]);   // BUNDLE G: session over — back to base
    settleStudy();
    // ITEM 2: the session is finished (queue drained or "Finish for now") — drop
    // the resume snapshot so the home screen offers a fresh batch, not a resume.
    PGRE.store.state.formulaStudy = null;
    PGRE.store.save();
    // study.done/again are cumulative across the whole logical session, but study.xp
    // resets to 0 on a resume (each segment settles its own XP on exit). Pairing the
    // cumulative card count with the segment-only XP reads as if the whole session
    // earned only the resumed segment's XP. Every press awards a flat +2 XP and
    // pressCount carries across resumes, so pressCount * 2 is the session-wide XP —
    // the honest figure to sit beside the cumulative card count.
    var totalXp = study.pressCount * 2;
    var checkInHtml = '';
    if (PGRE.formulaCheckIn) {
      if (study.checkInResult && study.checkInResult.claimed) {
        checkInHtml = PGRE.formulaCheckIn.celebrateHTML(study.checkInResult);
      } else {
        checkInHtml = PGRE.formulaCheckIn.alreadyHTML();
      }
    }
    body().innerHTML = '<div class="card practice-card">' +
      '<h1>Review complete</h1>' +
      '<div class="summary-score">' + study.done + ' card' + (study.done === 1 ? '' : 's') +
        '<span class="summary-pct">+' + totalXp + ' XP</span></div>' +
      '<p class="muted">' + (study.again ? study.again + ' came back for another pass this session. ' : '') +
      'Each card returns on the schedule your grade set.</p></div>' +
      checkInHtml +
      '<div class="card practice-card"><div class="btn-row">' +
      '<button class="btn btn-primary" id="back-deck">Back to the deck</button>' +
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
    if (PGRE.nav) PGRE.nav.setTrail([]);   // BUNDLE G: game tabs sit at base
    teardownGame();
    if (!PGRE.flashmodes) {
      // load failed earlier (mount already tried): say so and offer a retry
      body().innerHTML = '<div class="card"><p class="muted">Game modes are unavailable — ' +
        'flashmodes failed to load. Study mode still works.</p>' +
        '<div class="btn-row"><button class="btn btn-ghost" id="flash-retry">Retry</button></div></div>';
      var rt = document.getElementById('flash-retry');
      if (rt) rt.addEventListener('click', function () {
        ensureFlashmodes().then(function () { renderGameIntro(kind); });
      });
      return;
    }
    var ui = PGRE.ui, m = INTRO[kind];
    var remaining = PGRE.srs.formulaDayRemaining(deck).length;
    var metNote = 'Nothing picked for today — pick cards in Formula recall first; ' +
      'games drill only the batch you picked.';
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
      '<p class="muted">' + (q.length ? 'Drawn from today’s picked batch.' : metNote) + '</p>';
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

  /* ——————————————— Search mode ———————————————
     The box drives js/formula-search.js; the results are rendered as face-down
     flashcards. Search itself is side-effect free (status:today never builds a
     batch). Explicit Add buttons add hits into the picked batch via
     srs.addFormulaDaySoft. "Study these N" remains a separate ad-hoc session
     that grades SRS but does not edit the daily batch. */

  var SEARCH_PAGE = 30;                 // cards rendered before "show more"
  // Survives tab switches within a visit (the query is usually still wanted) but
  // is reset by mount(); `open` remembers which result cards were flipped face-up.
  var searchQ = { q: '', topic: '', status: '', sort: 'relevance' };
  var searchShown = SEARCH_PAGE;
  var searchOpen = Object.create(null);
  var searchIndex = null;
  var searchLast = null;                // last result set, for paging + the drill
  // Module-scoped so a re-render (or Clear) can cancel a keystroke still in
  // flight — a stray timer from a discarded panel used to fire afterwards and
  // repopulate the fresh one with the old query's results.
  var searchTimer = null;

  var WHY_ORDER = ['equation', 'acronym', 'synonym', 'fuzzy', 'substr', 'stem'];
  var SEARCH_EXAMPLES = [
    'centripetal', 'capacitence', 'shm', 'v^2/r', 'emf',
    'topic:qm uncertainty', 'status:new', '"time dilation"'
  ];

  function searchResultsEl() { return document.getElementById('fs-results'); }

  function renderSearch() {
    if (PGRE.nav) PGRE.nav.setTrail([]);
    teardownGame();
    clearTimeout(searchTimer);          // no stale keystroke may outlive this panel
    // The portal's DOM is gone once the route changes; the async engine-load path
    // below can land here after that, and writing into a null body would throw.
    if (!body()) return;
    if (!PGRE.formulaSearch) {
      if (searchFailed) {
        body().innerHTML = '<div class="card"><p class="muted">Search is unavailable — ' +
          'the matching engine failed to load. Every other mode still works.</p>' +
          '<div class="btn-row"><button class="btn btn-ghost" id="fs-retry">Retry</button></div></div>';
        var rt = document.getElementById('fs-retry');
        if (rt) rt.addEventListener('click', function () {
          searchFailed = false;
          renderSearch();
        });
        return;
      }
      body().innerHTML = '<div class="card"><p class="muted">Loading search…</p></div>';
      ensureSearchEngine().then(function () {
        // A script that loads but defines nothing (a parse error inside it) still
        // resolves, so failure has to be judged on the engine — not on onerror
        // alone, or this would re-render into the same load attempt forever.
        if (!PGRE.formulaSearch) { searchFailed = true; searchLoad = null; }
        if (mode === 'search') renderSearch();
      });
      return;
    }

    // Rebuilt on every entry to the tab: it costs a few milliseconds over a few
    // hundred cards and keeps mnemonics (which live in the store, not the deck)
    // in the index without any invalidation bookkeeping.
    searchIndex = PGRE.formulaSearch.build(deck);

    var ui = PGRE.ui;
    var topicOpts = '<option value="">All topics</option>';
    PGRE.TOPICS.forEach(function (t) {
      topicOpts += '<option value="' + ui.esc(t.id) + '"' +
        (searchQ.topic === t.id ? ' selected' : '') + '>' + ui.esc(t.name) + '</option>';
    });
    var statusOpts = '';
    PGRE.formulaSearch.STATUSES.forEach(function (s) {
      statusOpts += '<option value="' + ui.esc(s.key) + '"' +
        (searchQ.status === s.key ? ' selected' : '') + '>' + ui.esc(s.label) + '</option>';
    });
    var sortOpts = '';
    [['relevance', 'Best match'], ['order', 'Book order'], ['due', 'Due soonest']]
      .forEach(function (o) {
        sortOpts += '<option value="' + o[0] + '"' +
          (searchQ.sort === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
      });

    var egs = SEARCH_EXAMPLES.map(function (e) {
      return '<button type="button" class="fs-eg" data-q="' + ui.esc(e) + '">' +
        ui.esc(e) + '</button>';
    }).join('');

    var html = '<div class="card fs-box">' +
      '<h2>Search the deck</h2>' +
      '<p class="muted">Find a card by its name, by the words in its prompt, or by the ' +
      'shape of the equation itself — <code>v^2/r</code> finds the one that <em>is</em> ' +
      'that. Misspellings and word endings are forgiven, and shorthand like ' +
      '<strong>SHM</strong> or <strong>emf</strong> finds what it stands for. ' +
      'Leave the box empty to browse the whole deck.</p>' +
      '<input type="search" id="fs-input" class="fs-input" autocomplete="off" ' +
        'spellcheck="false" placeholder="Search ' + deck.length + ' formula cards…" ' +
        'value="' + ui.esc(searchQ.q) + '">' +
      '<div class="fs-controls">' +
        '<label class="fs-ctl"><span>Topic</span><select id="fs-topic">' + topicOpts + '</select></label>' +
        '<label class="fs-ctl"><span>Status</span><select id="fs-status-sel">' + statusOpts + '</select></label>' +
        '<label class="fs-ctl"><span>Sort</span><select id="fs-sort">' + sortOpts + '</select></label>' +
        '<button class="btn btn-ghost btn-sm fs-reset" id="fs-clear">Clear</button>' +
      '</div>' +
      '<div class="fs-statusline muted" id="fs-status" aria-live="polite"></div>' +
      '<details class="fs-help"><summary>Search tips</summary>' +
        '<p class="muted">Every word has to appear somewhere on the card. If nothing ' +
        'matches them all, the closest cards are shown instead and labelled as such.</p>' +
        '<ul class="fs-tips">' +
          '<li><code>"exact phrase"</code> — quotes demand the words together</li>' +
          '<li><code>topic:qm</code> — one of ' +
            PGRE.TOPICS.map(function (t) { return '<code>' + ui.esc(t.id) + '</code>'; }).join(', ') + '</li>' +
          '<li><code>tag:optics</code> — the card’s section name</li>' +
          '<li><code>eq:5.16</code> one equation, <code>eq:5</code> a whole chapter</li>' +
          '<li><code>status:new</code> · <code>due</code> · <code>leech</code> · ' +
            '<code>away</code> · <code>mnemonic</code> — same list as the dropdown</li>' +
        '</ul>' +
        '<div class="fs-egs">' + egs + '</div>' +
      '</details>' +
    '</div>' +
    '<div id="fs-actions"></div>' +
    '<div id="fs-results"></div>';

    body().innerHTML = html;
    wireSearch();
    runSearch(true);
    var inp = document.getElementById('fs-input');
    if (inp) inp.focus();
  }

  function wireSearch() {
    var inp = document.getElementById('fs-input');
    inp.addEventListener('input', function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        if (!inp.isConnected) return;   // this panel was replaced mid-keystroke
        searchQ.q = inp.value;
        runSearch(true);
      }, 180);
    });
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { clearTimeout(searchTimer); searchQ.q = inp.value; runSearch(true); }
      else if (e.key === 'Escape' && inp.value) {
        e.preventDefault();
        clearTimeout(searchTimer);
        inp.value = ''; searchQ.q = ''; runSearch(true);
      }
    });
    function bindSel(id, key) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('change', function () {
        searchQ[key] = el.value;
        runSearch(true);
      });
    }
    bindSel('fs-topic', 'topic');
    bindSel('fs-status-sel', 'status');
    bindSel('fs-sort', 'sort');
    var cl = document.getElementById('fs-clear');
    if (cl) cl.addEventListener('click', function () {
      clearTimeout(searchTimer);
      searchQ = { q: '', topic: '', status: '', sort: 'relevance' };
      renderSearch();
    });

    // One delegated handler for the whole result list — it survives every
    // re-render, so paging and re-queries never need to re-wire anything.
    searchResultsEl().addEventListener('click', function (e) {
      if (e.target.closest('#fs-more')) {
        searchShown += SEARCH_PAGE;
        renderSearchList();
        return;
      }
      var fix = e.target.closest('[data-fsfix]');
      if (fix) {
        var box = document.getElementById('fs-input');
        box.value = fix.getAttribute('data-fsfix');
        searchQ.q = box.value;
        runSearch(true);
        box.focus();
        return;
      }
      // Open visualizer / complete view modal without toggling the card.
      var modalBtn = e.target.closest('[data-fs-modal]');
      if (modalBtn) {
        e.preventDefault();
        e.stopPropagation();
        var cardId = modalBtn.getAttribute('data-fs-modal');
        if (cardId && window.PGRE && window.PGRE.openVisualizerModal) {
          window.PGRE.openVisualizerModal(cardId);
        }
        return;
      }
      // Soft-add one card into today's batch without flipping the card.
      var addBtn = e.target.closest('[data-fs-add]');
      if (addBtn) {
        e.preventDefault();
        e.stopPropagation();
        softAddToToday([addBtn.getAttribute('data-fs-add')]);
        return;
      }
      // The revealed face is for reading, not a second toggle: collapsing the
      // card out from under the formula you are studying (or mid text-selection)
      // is never what was meant. The button and the prompt still flip it.
      if (e.target.closest('.fs-back')) return;
      var sel = window.getSelection && window.getSelection();
      if (sel && !sel.isCollapsed && String(sel).trim()) return;
      var art = e.target.closest('.fs-card');
      if (art) toggleSearchCard(art);
    });
    // Example chips live in the tips block, above the results.
    body().querySelectorAll('.fs-eg').forEach(function (b) {
      b.addEventListener('click', function () {
        var box = document.getElementById('fs-input');
        box.value = b.getAttribute('data-q');
        searchQ.q = box.value;
        runSearch(true);
        box.focus();
      });
    });
  }

  function runSearch(reset) {
    if (reset) searchShown = SEARCH_PAGE;
    searchLast = PGRE.formulaSearch.run(searchIndex, searchQ.q, {
      topic: searchQ.topic, status: searchQ.status, sort: searchQ.sort
    });
    var st = document.getElementById('fs-status');
    var r = searchLast;
    if (st) {
      if (r.notice) {
        st.textContent = r.notice;
      } else if (r.browsing) {
        st.textContent = 'Browsing ' + PGRE.ui.fmt(r.total) + ' card' +
          (r.total === 1 ? '' : 's') + ' — type to search.';
      } else {
        st.textContent = PGRE.ui.fmt(r.total) + ' card' + (r.total === 1 ? '' : 's') +
          ' · ' + (r.ms < 10 ? r.ms.toFixed(1) : Math.round(r.ms)) + ' ms' +
          (r.loose ? ' · no card had every word — showing the closest' : '');
      }
    }
    renderSearchActions();
    renderSearchList();
  }

  function renderSearchActions() {
    var box = document.getElementById('fs-actions');
    if (!box) return;
    var n = searchLast ? searchLast.total : 0;
    if (!n) { box.innerHTML = ''; return; }
    /* Starting a drill overwrites whatever session was saved mid-flight (the
       leech drill has always done the same). Search makes that one click away
       from a browse of the entire deck, so say it plainly BEFORE the click
       rather than letting a half-finished daily round vanish unannounced. */
    var pending = rehydrateSavedStudy();
    var warn = pending ?
      '<span class="fs-actionwarn">Replaces the session you have in progress (' +
        pending.length + ' left).</span>' : '';
    var addLabel = n === 1 ? 'Add to today' : 'Add these ' + n + ' to today';
    box.innerHTML = '<div class="card fs-actionbar">' +
      '<button class="btn btn-primary" id="fs-drill">Study these ' + n +
        ' card' + (n === 1 ? '' : 's') + '</button>' +
      '<button class="btn btn-ghost" id="fs-add-today" type="button">' +
        addLabel + '</button>' +
      '<span class="muted fs-actionnote">Study grades without editing today’s list. ' +
      'Add soft-pins into the daily batch (may exceed your target)' +
      (n > 50 ? '. That is a long queue; a round checkpoint lets you stop at any point' : '') +
      '.</span>' + warn + '</div>';
    var b = document.getElementById('fs-drill');
    if (b) b.addEventListener('click', drillSearchResults);
    var add = document.getElementById('fs-add-today');
    if (add) add.addEventListener('click', function () {
      if (!searchLast || !searchLast.total) return;
      softAddToToday(searchLast.hits.map(function (h) { return h.card.id; }));
    });
  }

  /* Soft-pin card ids into today's formulaDay batch (may exceed T). Re-renders
     action/result chrome so "In today" chips update, and refreshes nav badges. */
  function softAddToToday(ids) {
    if (!ids || !ids.length) return;
    var srs = PGRE.srs;
    var res = srs.addFormulaDaySoft(deck, ids);
    var batch = res.batch;
    var N = batch.reviewIds.length + batch.newIds.length;
    var T = srs.clampTarget(PGRE.store.state.settings.formulaDailyTarget);
    var parts = [];
    if (res.added.length) {
      parts.push('Added ' + res.added.length);
    }
    if (res.already.length) {
      parts.push(res.already.length + ' already in today');
    }
    if (res.skipped.length) {
      parts.push(res.skipped.length + ' skipped');
    }
    if (!parts.length) parts.push('No change');
    var msg = parts.join(' · ') + ' · batch now ' + N + ' (target ' + T + ')';
    if (PGRE.toast) PGRE.toast(msg, 'info');
    if (PGRE.refreshNavBadges) PGRE.refreshNavBadges();
    renderSearchActions();
    renderSearchList();
  }

  /* Hand the matched cards to the ordinary Study flow. Going through switchMode
     (rather than assigning `mode` by hand) is what keeps the tab bar honest:
     setting the variable directly left switchMode's `m === mode` guard thinking
     the Study tab was already showing, so clicking it afterwards did nothing at
     all. switchMode renders the Study home first; startStudy then replaces it. */
  function drillSearchResults() {
    if (!searchLast || !searchLast.total) return;
    var cards = searchLast.hits.map(function (h) { return h.card; });
    switchMode('study');
    startStudy(cards);
  }

  /* The "why did this card come back" chip — only for the matches a reader would
     not otherwise explain to themselves. An exact or prefix hit needs no caption. */
  function whyChipHTML(h) {
    var fs = PGRE.formulaSearch, bits = [];
    for (var i = 0; i < WHY_ORDER.length; i++) {
      if (h.kinds.indexOf(WHY_ORDER[i]) !== -1) { bits.push(fs.KIND_LABEL[WHY_ORDER[i]]); break; }
    }
    var where = h.fields.filter(function (f) { return f !== 'front'; });
    if (where.length) {
      bits.push('in the ' + where.map(function (f) { return fs.FIELD_LABEL[f] || f; }).join(' + '));
    }
    return bits.length ? '<span class="fs-why">' + PGRE.ui.esc(bits.join(' · ')) + '</span>' : '';
  }

  /* Schedule chips, matching the ones the browse list uses. */
  function searchChipsHTML(c) {
    var srs = PGRE.srs, ui = PGRE.ui, st = srs.cardState(c.id), chips = '';
    if (st) {
      if (st.lastGrade) {
        chips += '<span class="grade-chip grade-' + st.lastGrade + '">' +
          ui.esc(st.lastGrade) + '</span>';
      }
      var du = srs.daysUntil(st.due);
      chips += '<span class="due-chip' + (du <= 0 ? ' due-now' : '') + '">' +
        (du <= 0 ? 'due now' : 'due in ' + srs.ivlLabel(du)) + '</span>';
      if (srs.isLeech(st)) chips += '<span class="grade-chip leech-chip">leech</span>';
    } else {
      chips += '<span class="due-chip">new</span>';
    }
    if (srs.isSuspended(c.id)) chips += '<span class="due-chip suspended-chip">put away</span>';
    if (mnemonicNote(c.id)) chips += '<span class="due-chip fs-mnem-chip">mnemonic</span>';
    return chips;
  }

  function searchCardHTML(h) {
    var c = h.card, ui = PGRE.ui;
    var t = PGRE.topicById(c.topic);
    var open = !!searchOpen[c.id];
    var nm = cardName(c);
    // isInFormulaDay reads the saved batch only — never formulaDay() — so
    // rendering search results stays side-effect free.
    var inToday = PGRE.srs.isInFormulaDay(deck, c.id);
    var addCtrl = inToday
      ? '<span class="due-chip today-chip">In today</span>'
      : '<button type="button" class="btn btn-ghost btn-sm" data-fs-add="' +
          ui.esc(c.id) + '">Add to today</button>';
    // The id is read straight back with getAttribute (never as a CSS selector),
    // so HTML-escaping is the only escaping it needs.
    return '<article class="fs-card' + (open ? ' is-open' : '') +
        '" data-fsid="' + ui.esc(c.id) + '">' +
      '<div class="fs-card-head">' +
        (t ? ui.monogram(t) : '') +
        (nm ? '<span class="fs-tag">' + ui.esc(nm) + '</span>' : '') +
        (c.eq ? '<span class="fs-eq">eq ' + ui.esc(c.eq) + '</span>' : '') +
        whyChipHTML(h) +
      '</div>' +
      '<div class="fs-front">' + formulaHTML(c.front || 'Recall the formula.') + '</div>' +
      '<div class="fs-back"' + (open ? '' : ' hidden') + '></div>' +
      '<div class="fs-card-foot">' +
        '<button type="button" class="btn btn-ghost btn-sm fs-flip">' +
          (open ? 'Hide formula' : 'Show formula') + '</button>' +
        '<span class="fs-card-actions">' +
          '<button type="button" class="btn btn-ghost btn-sm fs-modal-btn" data-fs-modal="' +
            ui.esc(c.id) + '">Complete view</button>' +
          addCtrl +
        '</span>' +
        '<span class="fs-chips">' + searchChipsHTML(c) + '</span>' +
      '</div>' +
    '</article>';
  }

  function renderSearchList() {
    var el = searchResultsEl();
    if (!el || !searchLast) return;
    var r = searchLast, ui = PGRE.ui;

    if (!r.total) {
      var fix = '';
      if (r.suggestion) {
        // Case-insensitively: the misspelling is reported lower-cased by the
        // tokenizer, so a literal replace silently no-ops on "Gravitionall" and
        // the button just re-runs the same failing query.
        var swapped = String(searchQ.q).replace(
          new RegExp(escRe(r.suggestion.from), 'i'), r.suggestion.to);
        fix = '<p class="muted">Did you mean <button type="button" class="fs-fix" ' +
          'data-fsfix="' + ui.esc(swapped) + '">' + ui.esc(r.suggestion.to) + '</button>?</p>';
      }
      el.innerHTML = '<div class="card fs-empty"><p><strong>No card matches that.</strong></p>' +
        fix + '<p class="muted">Spelling is already forgiven, so try fewer words, or a ' +
        'symbol from the formula itself.</p></div>';
      return;
    }

    var slice = r.hits.slice(0, searchShown);
    var html = '';
    // Book order reads better grouped — and that is what an empty box falls back
    // to, so a plain browse comes out as the deck's own table of contents.
    if (r.sort === 'order') {
      var curTopic = null;
      slice.forEach(function (h) {
        if (h.card.topic !== curTopic) {
          if (curTopic !== null) html += '</div>';
          curTopic = h.card.topic;
          var t = PGRE.topicById(curTopic);
          html += '<div class="fs-group"><h3 class="fs-group-head">' +
            (t ? ui.monogram(t) + ' ' + ui.esc(t.name) : 'Other') + '</h3>';
        }
        html += searchCardHTML(h);
      });
      if (curTopic !== null) html += '</div>';
    } else {
      slice.forEach(function (h) { html += searchCardHTML(h); });
    }
    if (r.total > slice.length) {
      html += '<div class="btn-row fs-morerow"><button class="btn btn-ghost" id="fs-more">' +
        'Show ' + Math.min(SEARCH_PAGE, r.total - slice.length) + ' more · ' +
        (r.total - slice.length) + ' still hidden</button></div>';
    }
    el.innerHTML = html;
    PGRE.typesetMath(el);
    // Re-fill the faces of cards the reader had already flipped open.
    el.querySelectorAll('.fs-card.is-open').forEach(function (art) { fillSearchBack(art); });
    markSearchHits(el, collectMarks(slice));
  }

  /* Every literal word the engine actually matched, across the rendered slice —
     these are real card words (a fuzzy hit contributes the card's spelling, not
     the reader's), so highlighting them is always truthful. */
  function collectMarks(slice) {
    var seen = Object.create(null), out = [];   // a card word may be "constructor"
    slice.forEach(function (h) {
      h.marks.forEach(function (m) {
        if (m && !seen[m]) { seen[m] = 1; out.push(m); }
      });
    });
    // Longest first: regex alternation takes the first branch that matches, so
    // without this "harmonic oscillator" loses to a bare "harmonic" listed earlier
    // and the same phrase highlights inconsistently from card to card.
    return out.sort(function (a, b) { return b.length - a.length; });
  }

  function escRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  /* Highlight matched words in the prompts. Done on the DOM AFTER KaTeX has run,
     walking text nodes and skipping anything inside a .katex subtree — building
     the marks into the HTML string instead would corrupt the LaTeX before it is
     ever typeset. Text nodes are rewritten as text, so nothing can inject HTML. */
  function markSearchHits(root, marks) {
    if (!marks || !marks.length) return;
    var pattern = '\\b(' + marks.map(escRe).join('|') + ')';
    root.querySelectorAll('.fs-front, .fs-tag').forEach(function (host) {
      var walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT, null, false);
      var nodes = [], n;
      while ((n = walker.nextNode())) {
        if (n.parentNode && n.parentNode.closest && n.parentNode.closest('.katex')) continue;
        if (n.nodeValue && n.nodeValue.trim()) nodes.push(n);
      }
      nodes.forEach(function (node) {
        var re = new RegExp(pattern, 'gi'), text = node.nodeValue;
        var frag = null, last = 0, m;
        while ((m = re.exec(text)) !== null) {
          if (!frag) frag = document.createDocumentFragment();
          if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
          var mk = document.createElement('mark');
          mk.textContent = m[0];
          frag.appendChild(mk);
          last = m.index + m[0].length;
          if (m.index === re.lastIndex) re.lastIndex++;   // never loop on a zero-length hit
        }
        if (!frag) return;
        if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
        node.parentNode.replaceChild(frag, node);
      });
    });
  }

  /* Fill a result card's hidden face on first reveal — same content as a browse
     peek (formula, the card's own note, your mnemonic), typeset once. */
  function fillSearchBack(art) {
    var back = art.querySelector('.fs-back');
    if (!back || back.getAttribute('data-filled')) return;
    var c = deckById(art.getAttribute('data-fsid'));
    if (!c) return;
    back.innerHTML = '<div class="fcard-back">' + backHTML(c) +
      (c.note ? '<div class="fcard-note">' + formulaHTML(c.note) + '</div>' : '') + '</div>' +
      mnemonicHTML(c.id);
    back.setAttribute('data-filled', '1');
    PGRE.typesetMath(back);
  }

  function toggleSearchCard(art) {
    var id = art.getAttribute('data-fsid');
    var back = art.querySelector('.fs-back');
    if (!back) return;
    var open = !searchOpen[id];
    searchOpen[id] = open;
    if (open) fillSearchBack(art);
    back.hidden = !open;
    art.classList.toggle('is-open', open);
    var btn = art.querySelector('.fs-flip');
    if (btn) btn.textContent = open ? 'Hide formula' : 'Show formula';
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
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        if (e.key === 'ArrowLeft') { e.preventDefault(); peekStep(-1); }
        else if (e.key === 'ArrowRight') {
          e.preventDefault();
          if (study.peek.idx >= study.history.length - 1) resumePeek();
          else peekStep(1);
        } else if (e.key === 'Escape') { e.preventDefault(); resumePeek(); }
        return;
      }
      if (ov === 'scaffold' || ov === 'checkpoint') {   // space/Enter = continue
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); runNextOverlay(); }
        return;
      }
      // ov === null: normal flip/grade flow + F1a undo. ⌘Z is the only chord
      // that acts — any other held modifier (⌘1…4 tab switching etc.) is inert.
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault(); undoGrade();
      } else if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      } else if ((e.key === ' ' || e.key === 'Enter') && !study.flipped) {
        e.preventDefault(); flip();
      } else if (study.flipped && e.key >= '1' && e.key <= '4') {
        e.preventDefault(); grade(GRADES[parseInt(e.key, 10) - 1].key);
      } else if (e.key === 'ArrowLeft' && study.history.length) {
        e.preventDefault(); openPeek();
      }
      return;
    }
    // Search: the box owns every key while it has focus; "/" from anywhere else
    // on the page puts the cursor back in it.
    if (mode === 'search') {
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '/') {
        e.preventDefault();
        var box = document.getElementById('fs-input');
        if (box) box.focus();
      }
      return;
    }
    if (typing) return;
    if (activeGame && activeGame.onKey) activeGame.onKey(e);
  });

  /* Leaving the portal mid-game stops any timers/intervals promptly (and
     settles an abandoned Study round's earned XP). */
  window.addEventListener('hashchange', function () {
    if (!/^#\/formulas/.test(location.hash)) { teardownGame(); settleStudy(); study = null; }
  });

  /* A tab/window close fires neither hashchange nor mount, so a mid-session
     segment's earned XP would otherwise never reach the total — and the
     summary's session-wide pressCount * 2 figure would then overstate what was
     actually awarded once a later segment resumes. Settle on pagehide to close
     that gap; settleStudy is a no-op once a segment is settled or has no XP. */
  window.addEventListener('pagehide', function () { settleStudy(); });

  /* bfcache twist: a same-tab cross-document Back/Forward (or a mobile
     freeze/restore) fires pagehide — settling the live segment (settled=true,
     xp awarded) — then restores THIS document from memory with the graded card
     DOM still interactive. settleStudy can't null study here (the preserved grade
     buttons dereference it), so post-restore grades would keep accumulating
     pressCount/xp that a later settleStudy short-circuits away on the settled
     flag — yet renderCheckpoint/renderStudySummary read pressCount * 2, re-
     overstating the awarded total. Treat the restore like a resume: re-open the
     already-settled segment exactly as resumeStudy does (fresh xp, rebased
     done/again bases, pressCount carried forward) so post-restore grades settle
     on their own and pressCount * 2 stays honest. The pagehide award stays
     awarded; only the new segment's XP is added on the next settle. */
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted || !study || !study.settled) return;
    study.settled = false;
    study.xp = 0;
    study.doneBase = study.done;
    study.againBase = study.again;
  });

  return {
    render: function () { return '<div id="formulas-root"></div>'; },
    mount: function () {
      settleStudy();
      study = null;
      teardownGame();
      mode = 'study';
      memStatsOpen = false;   // F10: honor "starts collapsed each mount"
      // Search starts fresh each visit too, the way memStatsOpen does — a query
      // and a set of flipped-open cards from an hour ago are not context worth
      // restoring when you walk back into the portal.
      clearTimeout(searchTimer);
      searchQ = { q: '', topic: '', status: '', sort: 'relevance' };
      searchShown = SEARCH_PAGE;
      searchOpen = Object.create(null);
      searchLast = null;
      var r = root();
      if (r) {
        r.innerHTML = '<div class="card practice-card fcard-skeleton">' +
          '<div class="skel-bar" style="width:35%"></div>' +
          '<div class="skel-bar" style="width:82%"></div>' +
          '<div class="skel-bar" style="width:64%"></div></div>';
      }
      if (window.PGRE && PGRE.motion && PGRE.motion.loader) PGRE.motion.loader.start();
      ensureFlashmodes().then(function () {
        return PGRE.formulaDeck();
      }).then(function (d) {
        deck = d;
        PGRE.deck = d;
        PGRE.getFormulaCard = deckById;
        if (root()) { renderShell(); buildPrintSheet(); }
        if (window.PGRE && PGRE.motion && PGRE.motion.loader) PGRE.motion.loader.done();
      });
    },
    getCard: deckById,
    getDeck: function () { return deck; }
  };
})();
