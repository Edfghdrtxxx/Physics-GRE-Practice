/* Dashboard — the home view. Mirrors the PrepEx dashboard structure:
   level/XP hero, stat tiles, daily challenges, week-at-a-glance,
   topic portals, achievements summary, recent activity. */
window.PGRE = window.PGRE || {};
PGRE.views = PGRE.views || {};

PGRE.views.dashboard = {
  render: function () {
    var ui = PGRE.ui, g = PGRE.gamify, s = PGRE.store.state;
    var lvl = g.levelInfo(s.xp);
    var hour = new Date().getHours();
    var greet = hour < 5 ? 'Burning the midnight oil' :
                hour < 12 ? 'Good morning' :
                hour < 18 ? 'Good afternoon' : 'Good evening';
    var days = g.daysToExam();

    var m = g.metrics();
    var accuracy = '—';
    var totalAttempts = 0, totalCorrect = 0;
    for (var id in s.questions) { totalAttempts += s.questions[id].attempts; totalCorrect += s.questions[id].correct; }
    if (totalAttempts > 0) accuracy = Math.round(100 * totalCorrect / totalAttempts) + '%';

    var html = '<div class="hero card">' +
      '<div class="hero-left">' +
        '<h1>' + greet + '.</h1>' +
        '<div class="hero-level">Level ' + lvl.level + ' · <span class="level-title">' + lvl.title + '</span></div>' +
        ui.meter(lvl.pct, 'meter-xp') +
        '<div class="hero-xp-note">' + ui.fmt(lvl.into) + ' / ' + ui.fmt(lvl.span) + ' XP to Level ' + (lvl.level + 1) + '</div>' +
      '</div>' +
      '<div class="hero-right">' +
        '<div class="countdown"><div class="countdown-num">' + days + '</div>' +
        '<div class="countdown-label">day' + (days === 1 ? '' : 's') + ' until the exam<br>Wed, Oct 28, 2026</div></div>' +
      '</div>' +
    '</div>';

    html += '<div class="stat-row">' +
      ui.statTile('Total XP', ui.fmt(s.xp)) +
      ui.statTile('Day streak', PGRE.store.liveStreak(), 'best ' + s.streak.best) +
      ui.statTile('Questions answered', ui.fmt(m.answered)) +
      ui.statTile('Accuracy', accuracy) +
      ui.statTile('Days active', s.daysActive.length) +
    '</div>';

    // Review queue — the day's due work from the two SRS systems
    var dueM = PGRE.srs.dueMistakes().length;
    html += '<div class="card review-queue"><h2>Review queue</h2><div class="rq-rows">' +
      '<div class="rq-row"><span class="rq-label">Mistake book</span>' +
        '<span class="rq-count">' + (dueM ? dueM + ' due now' : 'nothing due') + '</span>' +
        '<a class="btn ' + (dueM ? 'btn-primary' : 'btn-ghost') + ' btn-sm" href="#/mistakes">' +
          (dueM ? 'Drill →' : 'Open →') + '</a></div>' +
      '<div class="rq-row"><span class="rq-label">Formula recall</span>' +
        '<span class="rq-count" id="rq-formulas">…</span>' +
        '<a class="btn btn-ghost btn-sm" href="#/formulas" id="rq-formulas-btn">Open →</a></div>' +
    '</div></div>';

    // Today's challenges + this week
    html += '<div class="two-col">';
    html += '<div class="card"><h2>Today’s challenges</h2><div class="challenge-list">';
    g.todaysChallenges().forEach(function (c) {
      html += '<div class="challenge' + (c.done ? ' done' : '') + '">' +
        '<div class="challenge-top"><span>' + (c.done ? '<span class="check">✓</span> ' : '') + ui.esc(c.label) + '</span>' +
        '<span class="challenge-xp">+' + c.xp + ' XP</span></div>' +
        ui.meter(100 * c.cur / c.max, 'meter-thin') +
        '<div class="challenge-prog">' + c.cur + ' / ' + c.max + '</div>' +
      '</div>';
    });
    html += '</div></div>';

    var cw = PGRE.currentWeek();
    var doneCount = cw.week.tasks.filter(function (t) { return g.taskDone(t.id); }).length;
    var nextTasks = cw.week.tasks.filter(function (t) { return !g.taskDone(t.id); }).slice(0, 3);
    html += '<div class="card"><h2>This week — ' + ui.esc(cw.week.title) + '</h2>' +
      '<div class="muted">' + ui.dateRange(cw.week.start, cw.week.end) + ' · ' + ui.esc(cw.phase.name) + ' · ~' + cw.week.hours + ' h</div>' +
      ui.meter(100 * doneCount / cw.week.tasks.length, 'meter-thin') +
      '<div class="challenge-prog">' + doneCount + ' / ' + cw.week.tasks.length + ' tasks done</div>';
    if (nextTasks.length) {
      html += '<ul class="next-tasks">';
      nextTasks.forEach(function (t) { html += '<li>' + ui.esc(t.label) + '</li>'; });
      html += '</ul>';
    } else {
      html += '<p class="muted">Everything for this week is done. Get ahead or rest — both count.</p>';
    }
    html += '<a class="btn btn-ghost" href="#/plan">Open study plan →</a></div>';
    html += '</div>';

    // Topic portals
    html += '<h2 class="section-title">Knowledge portals</h2><div class="topic-grid">';
    PGRE.TOPICS.forEach(function (t) {
      var rec = s.topics[t.id] || { attempted: 0, correct: 0 };
      var acc = rec.attempted ? Math.round(100 * rec.correct / rec.attempted) + '% acc.' : 'not started';
      var mastery = g.mastery(t.id);
      html += '<a class="topic-card card" href="#/topic/' + t.id + '">' +
        '<div class="topic-card-head">' + ui.monogram(t) +
          '<span class="weight-chip">' + t.weight + '%</span></div>' +
        '<div class="topic-card-name">' + t.name + '</div>' +
        ui.meter(mastery, 'meter-thin') +
        '<div class="topic-card-sub">' + mastery + '% mastery · ' + acc + '</div>' +
      '</a>';
    });
    html += '</div>';

    // Achievements summary + mock exam teaser
    var tiers = ['bronze', 'silver', 'gold', 'platinum'];
    var tierCounts = {};
    tiers.forEach(function (tier) {
      var total = PGRE.ACHIEVEMENTS.filter(function (a) { return a.tier === tier; }).length;
      var got = PGRE.ACHIEVEMENTS.filter(function (a) { return a.tier === tier && s.achievements[a.id]; }).length;
      tierCounts[tier] = got + '/' + total;
    });
    html += '<div class="two-col">';
    html += '<div class="card"><h2>Achievements</h2><div class="tier-chips">';
    tiers.forEach(function (tier) {
      html += '<span class="tier-chip tier-' + tier + '">' + tier.charAt(0).toUpperCase() + tier.slice(1) + ' ' + tierCounts[tier] + '</span>';
    });
    html += '</div>';
    var recent = PGRE.ACHIEVEMENTS
      .filter(function (a) { return s.achievements[a.id]; })
      .sort(function (a, b) { return s.achievements[b.id] < s.achievements[a.id] ? -1 : 1; })
      .slice(0, 3);
    if (recent.length) {
      html += '<ul class="mini-list">';
      recent.forEach(function (a) {
        html += '<li><span class="tier-dot tier-' + a.tier + '"></span>' + a.name +
          '<span class="muted"> · ' + PGRE.ui.timeAgo(s.achievements[a.id]) + '</span></li>';
      });
      html += '</ul>';
    } else {
      html += '<p class="muted">Nothing unlocked yet — answer your first question to get started.</p>';
    }
    html += '<a class="btn btn-ghost" href="#/achievements">All achievements →</a></div>';

    html += '<div class="card exam-teaser"><h2>Timed mock exam</h2>' +
      '<p class="muted">A full timed simulation of the test. Designed and documented — it unlocks once the real question bank is imported.</p>' +
      '<span class="soon-chip">Coming soon</span>' +
      '<a class="btn btn-ghost" href="#/exam">Read the design →</a></div>';
    html += '</div>';

    // Recent activity
    html += '<div class="card"><h2>Recent activity</h2>';
    if (s.log.length === 0) {
      html += '<p class="muted">Your activity will appear here.</p>';
    } else {
      html += '<ul class="activity-list">';
      s.log.slice(0, 8).forEach(function (e) {
        var icon = { practice: '✎', achievement: '★', plan: '☑', level: '↑', challenge: '◎',
                   import: '⤓', mistake: '✗', review: '⟳' }[e.kind] || '·';
        html += '<li><span class="act-icon act-' + e.kind + '">' + icon + '</span>' +
          '<span class="act-text">' + ui.esc(e.text) + '</span>' +
          (e.xp ? '<span class="act-xp">+' + e.xp + ' XP</span>' : '') +
          '<span class="act-time">' + ui.timeAgo(e.ts) + '</span></li>';
      });
      html += '</ul>';
    }
    html += '</div>';

    return html;
  },

  mount: function () {
    // formula due count arrives async from the IndexedDB-backed deck
    PGRE.formulaDeck().then(function (deck) {
      var el = document.getElementById('rq-formulas');
      if (!el) return;
      if (!deck.length) { el.textContent = 'deck empty — awaits the book'; return; }
      var n = PGRE.srs.dueDeck(deck).length;
      el.textContent = n ? n + ' due today' : 'all caught up';
      if (n) {
        var btn = document.getElementById('rq-formulas-btn');
        if (btn) { btn.classList.remove('btn-ghost'); btn.classList.add('btn-primary'); btn.textContent = 'Study →'; }
      }
    });
  }
};
