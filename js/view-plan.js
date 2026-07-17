/* Study plan — Jul 13 → Oct 28, 2026 in three phases.
   Checking a task grants its XP (once) and counts as study activity. */
window.PGRE = window.PGRE || {};
PGRE.views = PGRE.views || {};

PGRE.views.plan = (function () {

  function weekProgress(w) {
    var done = w.tasks.filter(function (t) { return PGRE.gamify.taskDone(t.id); }).length;
    return { done: done, total: w.tasks.length, pct: Math.round(100 * done / w.tasks.length) };
  }

  function body() {
    var ui = PGRE.ui, g = PGRE.gamify;
    var today = PGRE.store.today();
    var days = g.daysToExam();
    var cw = PGRE.currentWeek();

    var allTasks = 0, allDone = 0;
    PGRE.PLAN.forEach(function (ph) {
      ph.weeks.forEach(function (w) {
        allTasks += w.tasks.length;
        allDone += w.tasks.filter(function (t) { return g.taskDone(t.id); }).length;
      });
    });

    var html = '<div class="card hero">' +
      '<div class="hero-left"><h1>Review plan</h1>' +
      '<p class="muted">July 13 → October 28, 2026 · intensive (~15–17 h/week) · two full passes, five released practice tests, then taper.</p>' +
      ui.meter(100 * allDone / Math.max(1, allTasks)) +
      '<div class="hero-xp-note">' + allDone + ' / ' + allTasks + ' tasks complete</div></div>' +
      '<div class="hero-right"><div class="countdown"><div class="countdown-num">' + days + '</div>' +
      '<div class="countdown-label">day' + (days === 1 ? '' : 's') + ' to go</div></div></div></div>';

    PGRE.PLAN.forEach(function (phase) {
      var phTasks = 0, phDone = 0;
      phase.weeks.forEach(function (w) {
        phTasks += w.tasks.length;
        phDone += w.tasks.filter(function (t) { return g.taskDone(t.id); }).length;
      });
      html += '<div class="phase"><div class="phase-head"><h2>' + ui.esc(phase.name) + '</h2>' +
        '<span class="muted">' + phDone + '/' + phTasks + '</span></div>' +
        '<p class="muted phase-desc">' + ui.esc(phase.desc) + '</p>';

      phase.weeks.forEach(function (w) {
        var p = weekProgress(w);
        var isCurrent = today >= w.start && today <= w.end;
        var isPast = today > w.end;
        var state = isCurrent ? 'current' : isPast ? (p.pct === 100 ? 'done' : 'past') : 'future';
        html += '<details class="week card week-' + state + '"' + (isCurrent ? ' open' : '') + ' data-week="' + w.id + '">' +
          '<summary><div class="week-sum">' +
            '<span class="week-badge">' + (isCurrent ? 'This week' : ui.dateRange(w.start, w.end)) + '</span>' +
            '<span class="week-title">' + ui.esc(w.title) + '</span>' +
            '<span class="week-meta">~' + w.hours + ' h · ' + p.done + '/' + p.total + '</span>' +
          '</div>' + ui.meter(p.pct, 'meter-thin') + '</summary>' +
          '<ul class="task-list">';
        w.tasks.forEach(function (t) {
          var done = g.taskDone(t.id);
          html += '<li class="task' + (done ? ' done' : '') + '">' +
            '<label><input type="checkbox" data-task="' + t.id + '" data-xp="' + t.xp + '"' + (done ? ' checked' : '') + '>' +
            '<span class="task-label">' + ui.esc(t.label) + '</span></label>' +
            '<span class="task-meta">' + t.hours + ' h · +' + t.xp + ' XP</span></li>';
        });
        html += '</ul>';
        // F4: each week names the topics it covers — offer a one-click jump to
        // those topic portals (the hub where you read up and drill them).
        if (w.topics && w.topics.length) {
          html += '<div class="week-links"><span class="week-links-label">Study:</span>';
          w.topics.forEach(function (tid) {
            var t = PGRE.topicById(tid);
            if (t) html += '<a class="btn btn-ghost btn-sm" href="#/topic/' + t.id + '">' + ui.esc(t.short) + ' →</a>';
          });
          html += '</div>';
        }
        html += '</details>';
      });
      html += '</div>';
    });
    return html;
  }

  function wire() {
    document.querySelectorAll('#plan-root input[data-task]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        PGRE.gamify.toggleTask(cb.getAttribute('data-task'), parseInt(cb.getAttribute('data-xp'), 10));
        // re-render, preserving which <details> are open
        var open = {};
        document.querySelectorAll('#plan-root details[data-week]').forEach(function (d) {
          open[d.getAttribute('data-week')] = d.open;
        });
        var root = document.getElementById('plan-root');
        root.innerHTML = body();
        document.querySelectorAll('#plan-root details[data-week]').forEach(function (d) {
          var id = d.getAttribute('data-week');
          if (id in open) d.open = open[id];
        });
        wire();
      });
    });
  }

  return {
    render: function () { return '<div id="plan-root">' + body() + '</div>'; },
    mount: function () { wire(); }
  };
})();
