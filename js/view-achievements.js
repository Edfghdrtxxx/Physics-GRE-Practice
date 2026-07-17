/* Achievements — every badge (see js/data-achievements.js), with progress. */
window.PGRE = window.PGRE || {};
PGRE.views = PGRE.views || {};

PGRE.views.achievements = (function () {
  var filter = 'all';         // category dimension
  var statusFilter = 'all';   // earned dimension: all / unlocked / locked

  function card(a) {
    var s = PGRE.store.state, ui = PGRE.ui;
    var unlockedAt = s.achievements[a.id];
    var hidden = a.secret && !unlockedAt;
    var p = PGRE.gamify.achievementProgress(a);
    var pct = Math.round(100 * p.cur / p.max);

    var html = '<div class="ach-card' + (unlockedAt ? ' unlocked' : ' locked') + '">' +
      '<div class="ach-top">' +
        '<span class="tier-dot tier-' + a.tier + '"></span>' +
        '<span class="ach-tier-name">' + a.tier + '</span>' +
        '<span class="ach-xp">+' + PGRE.TIER_XP[a.tier] + ' XP</span>' +
      '</div>';
    if (hidden) {
      html += '<div class="ach-name">???</div>' +
        '<div class="ach-desc muted">Hidden achievement — keep exploring.</div>';
    } else {
      html += '<div class="ach-name">' + a.name + '</div>' +
        '<div class="ach-desc muted">' + a.desc + '</div>';
      if (unlockedAt) {
        html += '<div class="ach-unlocked">✓ Unlocked ' + ui.timeAgo(unlockedAt) + '</div>';
      } else if (!a.flag) {
        html += ui.meter(pct, 'meter-thin') +
          '<div class="ach-prog">' + ui.fmt(p.cur) + ' / ' + ui.fmt(p.max) + '</div>';
      }
    }
    html += '</div>';
    return html;
  }

  function body() {
    var s = PGRE.store.state;
    var total = PGRE.ACHIEVEMENTS.length;
    var got = Object.keys(s.achievements).length;

    var html = '<div class="card"><div class="ach-header">' +
      '<div><h1>Achievements</h1>' +
      '<p class="muted">' + got + ' of ' + total + ' unlocked · tier bonuses: Bronze +25 · Silver +50 · Gold +100 · Platinum +200 XP</p></div>' +
      '</div>' + PGRE.ui.meter(100 * got / total) + '</div>';

    html += '<div class="filter-row" id="ach-filters">' +
      '<button class="filter-btn' + (filter === 'all' ? ' active' : '') + '" data-f="all">All</button>';
    PGRE.ACH_CATEGORIES.forEach(function (c) {
      html += '<button class="filter-btn' + (filter === c.id ? ' active' : '') + '" data-f="' + c.id + '">' + c.name + '</button>';
    });
    html += '</div>';

    // Earned filter — composes with the category filter above. Counts reflect
    // whichever category is currently selected so they match what's shown.
    var nUnlocked = 0, nLocked = 0;
    PGRE.ACHIEVEMENTS.forEach(function (a) {
      if (filter !== 'all' && a.cat !== filter) return;
      if (s.achievements[a.id]) nUnlocked++; else nLocked++;
    });
    html += '<div class="filter-row" id="ach-status-filters">' +
      '<button class="filter-btn' + (statusFilter === 'all' ? ' active' : '') + '" data-s="all">All</button>' +
      '<button class="filter-btn' + (statusFilter === 'unlocked' ? ' active' : '') + '" data-s="unlocked">Unlocked (' + nUnlocked + ')</button>' +
      '<button class="filter-btn' + (statusFilter === 'locked' ? ' active' : '') + '" data-s="locked">Locked (' + nLocked + ')</button>' +
      '</div>';

    html += '<div class="ach-grid">';
    PGRE.ACHIEVEMENTS.forEach(function (a) {
      if (filter !== 'all' && a.cat !== filter) return;
      var unlocked = !!s.achievements[a.id];
      if (statusFilter === 'unlocked' && !unlocked) return;
      if (statusFilter === 'locked' && unlocked) return;
      html += card(a);
    });
    html += '</div>';
    return html;
  }

  function wire() {
    function rerender() {
      var root = document.getElementById('ach-root');
      root.innerHTML = body();
      wire();
    }
    document.querySelectorAll('#ach-filters .filter-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        filter = b.getAttribute('data-f');
        rerender();
      });
    });
    document.querySelectorAll('#ach-status-filters .filter-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        statusFilter = b.getAttribute('data-s');
        rerender();
      });
    });
  }

  return {
    render: function () { return '<div id="ach-root">' + body() + '</div>'; },
    mount: function () { wire(); }
  };
})();
