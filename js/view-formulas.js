/* Formula recall — vocabulary-app-style flip cards with Again/Hard/Good/Easy
   self-grading driving SM-2 intervals (js/srs.js) and a proactive daily due
   queue. The frame is complete; the deck (js/data-formulas.js) stays empty
   until cards arrive from the "Conquering the Physics GRE" import. */
window.PGRE = window.PGRE || {};
PGRE.views = PGRE.views || {};

PGRE.views.formulas = (function () {
  var deck = [];
  var study = null; // { queue, total, done, again, xp, flipped }
  var GRADES = [
    { key: 'again', label: 'Again', hint: '1' },
    { key: 'hard',  label: 'Hard',  hint: '2' },
    { key: 'good',  label: 'Good',  hint: '3' },
    { key: 'easy',  label: 'Easy',  hint: '4' }
  ];

  function root() { return document.getElementById('formulas-root'); }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  /* ——— Home ——— */
  function renderHome() {
    study = null;
    var ui = PGRE.ui;
    var due = PGRE.srs.dueDeck(deck);
    var fresh = PGRE.srs.newInDeck(deck);
    var t = PGRE.srs.today();
    var reviewedToday = 0;
    var cardsState = PGRE.store.state.cards;
    for (var id in cardsState) {
      var st = cardsState[id];
      if (st.lastReviewedAt && st.lastReviewedAt.slice(0, 10) === t) reviewedToday++;
    }

    var html = '<div class="card"><h1>Formula recall</h1>' +
      '<p class="muted">Flip cards the way vocabulary apps do it: see the prompt, recall the ' +
      'formula, flip, then grade yourself — <strong>Again / Hard / Good / Easy</strong> sets ' +
      'when the card returns. Due cards queue up for you daily.</p></div>';

    html += '<div class="stat-row stat-row-4">' +
      ui.statTile('Cards in the deck', ui.fmt(deck.length)) +
      ui.statTile('Due today', ui.fmt(due.length)) +
      ui.statTile('Never studied', ui.fmt(fresh.length)) +
      ui.statTile('Reviewed today', ui.fmt(reviewedToday)) +
    '</div>';

    if (!deck.length) {
      html += '<div class="card placeholder">' +
        '<p><strong>The deck is empty — by design.</strong></p>' +
        '<p class="muted">No hand-written starter cards: formulas arrive with the ' +
        '<em>Conquering the Physics GRE</em> markdown. Import it in the ' +
        '<a href="#/library">Library</a>; when parser v2 extracts the formula sheets, ' +
        'cards appear here and the daily queue starts filling. The card format is ' +
        'documented in <code>js/data-formulas.js</code>.</p></div>';
    } else {
      html += '<div class="card">';
      if (due.length) {
        html += '<h2>Today’s queue</h2>' +
          '<p class="muted">' + due.length + ' card' + (due.length === 1 ? '' : 's') +
          ' waiting. Space flips, 1–4 grade.</p>' +
          '<div class="btn-row"><button class="btn btn-primary" id="study-btn">Study ' +
          due.length + ' due</button></div>';
      } else {
        html += '<h2>You’re all caught up</h2>' +
          '<p class="muted">Nothing due today — the next cards return on their schedule.</p>';
      }
      html += '</div>';

      html += '<div class="card"><h2>Browse the deck</h2>';
      PGRE.TOPICS.forEach(function (t) {
        var cards = deck.filter(function (c) { return c.topic === t.id; });
        if (!cards.length) return;
        html += '<div class="deck-topic"><h3>' + ui.monogram(t) + ' ' + t.name + '</h3>';
        cards.forEach(function (c) {
          var st = PGRE.srs.cardState(c.id);
          var when = !st ? 'new' :
            PGRE.srs.daysUntil(st.due) <= 0 ? 'due now' :
            'due in ' + PGRE.srs.ivlLabel(PGRE.srs.daysUntil(st.due));
          html += '<div class="deck-row"><span class="deck-name">' + ui.esc(c.name) + '</span>' +
            '<span class="due-chip' + (when === 'due now' ? ' due-now' : '') + '">' + when + '</span></div>';
        });
        html += '</div>';
      });
      html += '</div>';
    }

    root().innerHTML = html;
    PGRE.typesetMath(root());
    PGRE.refreshNavBadges(); // due counts change without a route change
    var sb = document.getElementById('study-btn');
    if (sb) sb.addEventListener('click', function () {
      startStudy(PGRE.srs.dueDeck(deck));
    });
  }

  /* ——— Study session ——— */
  function startStudy(cards) {
    if (!cards.length) return;
    study = { queue: shuffle(cards), total: cards.length, done: 0, again: 0, xp: 0, flipped: false };
    renderCard();
  }

  function renderCard() {
    var c = study.queue[0];
    var t = PGRE.topicById(c.topic);
    var html = '<div class="card practice-card">' +
      '<div class="practice-meta">' +
        '<span>Card ' + (study.done + 1) + ' · ' + study.queue.length + ' left</span>' +
        (t ? '<span class="chip">' + t.name + '</span>' : '') +
      '</div>' +
      PGRE.ui.meter(100 * study.done / (study.done + study.queue.length), 'meter-thin') +
      '<div class="fcard" id="fcard">' +
        '<div class="fcard-name">' + PGRE.ui.esc(c.name) + '</div>' +
        '<div class="fcard-front">' + (c.front || 'Recall the formula.') + '</div>' +
        '<div class="fcard-back" id="fcard-back" hidden>' + c.back +
          (c.note ? '<div class="fcard-note">' + c.note + '</div>' : '') + '</div>' +
      '</div>' +
      '<div class="btn-row" id="fcard-actions">' +
        '<button class="btn btn-primary" id="flip-btn">Show answer <span class="key-hint">space</span></button>' +
      '</div></div>';
    root().innerHTML = html;
    PGRE.typesetMath(root());
    study.flipped = false;
    document.getElementById('flip-btn').addEventListener('click', flip);
    document.getElementById('fcard').addEventListener('click', function () {
      if (!study.flipped) flip();
    });
  }

  function flip() {
    var c = study.queue[0];
    study.flipped = true;
    document.getElementById('fcard-back').hidden = false;
    var ivls = PGRE.srs.nextIntervals(PGRE.srs.cardState(c.id));
    var html = '';
    GRADES.forEach(function (g) {
      html += '<button class="btn grade-btn grade-' + g.key + '" data-grade="' + g.key + '">' +
        g.label + '<span class="grade-ivl">' + PGRE.srs.ivlLabel(ivls[g.key]) + '</span>' +
        '<span class="key-hint">' + g.hint + '</span></button>';
    });
    var box = document.getElementById('fcard-actions');
    box.innerHTML = html;
    box.querySelectorAll('[data-grade]').forEach(function (b) {
      b.addEventListener('click', function () { grade(b.getAttribute('data-grade')); });
    });
  }

  function grade(g) {
    var c = study.queue.shift();
    PGRE.srs.gradeCard(c.id, g);
    PGRE.store.touchDay();          // reviewing formulas counts as a study day
    study.done++;
    study.xp += 2;
    if (g === 'again') { study.queue.push(c); study.again++; } // cycles back this session
    PGRE.store.save();
    if (study.queue.length) renderCard();
    else renderStudySummary();
  }

  function renderStudySummary() {
    PGRE.gamify.addXP(study.xp, '· formula review', true);
    PGRE.store.log('review', 'Formula review: ' + study.done + ' card' +
      (study.done === 1 ? '' : 's') + (study.again ? ' (' + study.again + ' repeated)' : ''), study.xp);
    PGRE.gamify.checkAchievements();
    PGRE.store.save();
    root().innerHTML = '<div class="card practice-card">' +
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

  /* One persistent, guarded keyboard handler (views are singletons). */
  document.addEventListener('keydown', function (e) {
    if (!study || !/^#\/formulas/.test(location.hash)) return;
    if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    if ((e.key === ' ' || e.key === 'Enter') && !study.flipped) {
      e.preventDefault(); flip();
    } else if (study.flipped && e.key >= '1' && e.key <= '4') {
      e.preventDefault(); grade(GRADES[parseInt(e.key, 10) - 1].key);
    }
  });

  return {
    render: function () { return '<div id="formulas-root"></div>'; },
    mount: function () {
      study = null;
      PGRE.formulaDeck().then(function (d) {
        deck = d;
        if (root()) renderHome();
      });
    }
  };
})();
