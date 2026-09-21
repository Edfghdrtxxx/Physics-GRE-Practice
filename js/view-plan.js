/* Study plan — vault calendar (Week 0 historical + 7 live weeks Sep 14–Nov 1).
   Checking a task grants its XP (once) and counts as study activity. */
window.PGRE = window.PGRE || {};
PGRE.views = PGRE.views || {};

PGRE.views.plan = (function () {

  function weekProgress(w) {
    var tasks = PGRE.weekTasks(w);
    var done = tasks.filter(function (t) { return PGRE.gamify.taskDone(t.id); }).length;
    var total = tasks.length;
    return { done: done, total: total, pct: total ? Math.round(100 * done / total) : 0 };
  }

  function body() {
    var ui = PGRE.ui, g = PGRE.gamify;
    var today = PGRE.store.today();
    var days = g.daysToExam();

    var allTasks = 0, allDone = 0, seen = {};
    PGRE.PLAN.forEach(function (ph) {
      ph.weeks.forEach(function (w) {
        PGRE.weekTasks(w).forEach(function (t) {
          if (seen[t.id]) return;
          seen[t.id] = true;
          allTasks++;
          if (g.taskDone(t.id)) allDone++;
        });
      });
    });

    var html = '<div class="card hero">' +
      '<div class="hero-left"><h1>Review plan</h1>' +
      '<p class="muted">Sep 14 → November 1, 2026 · 7 live weeks · ~16 h/wk: 5 timed sets, 6 formula sessions, 2 extras · checkpoint Oct 4 · intact mocks Oct 11 / 18 / 25 · exam-week taper</p>' +
      ui.meter(100 * allDone / Math.max(1, allTasks), '', {
        word: 'complete', meta: allDone + ' of ' + allTasks + ' tasks'
      }) +
      '<div class="hero-xp-note">' + allDone + ' / ' + allTasks + ' tasks complete</div></div>' +
      '<div class="hero-right"><div class="countdown"><div class="countdown-num">' + days + '</div>' +
      '<div class="countdown-label">day' + (days === 1 ? '' : 's') + ' to go</div></div></div></div>';

    PGRE.PLAN.forEach(function (phase) {
      var phTasks = 0, phDone = 0;
      phase.weeks.forEach(function (w) {
        var tasks = PGRE.weekTasks(w);
        phTasks += tasks.length;
        phDone += tasks.filter(function (t) { return g.taskDone(t.id); }).length;
      });
      html += '<div class="phase"><div class="phase-head"><h2>' + ui.esc(phase.name) + '</h2>' +
        '<span class="muted">' + phDone + '/' + phTasks + '</span></div>' +
        '<p class="muted phase-desc">' + ui.esc(phase.desc) + '</p>';

      phase.weeks.forEach(function (w) {
        var p = weekProgress(w);
        var tasks = PGRE.weekTasks(w);
        var isCurrent = today >= w.start && today <= w.end;
        var isPast = today > w.end;
        var state = isCurrent ? 'current' : isPast ? (p.pct === 100 ? 'done' : 'past') : 'future';
        var openWeek = isCurrent && !(w.historical || w.id === 'w0');
        html += '<details class="week card week-' + state + '"' + (openWeek ? ' open' : '') + ' data-week="' + w.id + '">' +
          '<summary><div class="week-sum">' +
            '<span class="week-badge">' + (isCurrent ? 'This week' : ui.dateRange(w.start, w.end)) + '</span>' +
            '<span class="week-title">' + ui.esc(w.title) + '</span>' +
            '<span class="week-meta">~' + w.hours + ' h · ' + p.done + '/' + p.total + '</span>' +
          '</div>' + ui.meter(p.pct, 'meter-thin') + '</summary>' +
          '<p class="muted week-focus">' + ui.esc(w.focus || '') +
            (w.notes ? ' — ' + ui.esc(w.notes) : '') + '</p>' +
          '<ul class="task-list">';
        tasks.forEach(function (t) {
          var done = g.taskDone(t.id);
          html += '<li class="task' + (done ? ' done' : '') + '">' +
            '<label><input type="checkbox" data-task="' + t.id + '" data-xp="' + t.xp + '"' + (done ? ' checked' : '') + '>' +
            '<span class="task-label">' + ui.esc(t.label) + '</span></label>' +
            (t.kind === 'mock' ? ' <a class="btn btn-ghost btn-sm" href="#/exam">Open simulator →</a>' : '') +
            ((t.kind === 'timed' || t.kind === 'extra-set')
              ? ' <button class="btn btn-primary btn-sm" data-launch-set="' +
                  ui.esc(String(t.id || '').replace(/^set-/, '')) + '">Start →</button>'
              : '') +
            '<span class="task-meta">' + t.hours + ' h</span></li>';
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
        var taskId = cb.getAttribute('data-task');
        var taskXp = parseInt(cb.getAttribute('data-xp'), 10);
        var weekDetails = cb.closest('details[data-week]');
        var weekId = weekDetails ? weekDetails.getAttribute('data-week') : null;

        // Capture previous widths of hero and affected week meters before re-render
        var prevWeekFill = weekDetails ? weekDetails.querySelector('summary .meter-fill') : null;
        var prevWeekWidth = prevWeekFill ? prevWeekFill.style.width : null;
        var prevHeroFill = document.querySelector('#plan-root .hero .meter-fill');
        var prevHeroWidth = prevHeroFill ? prevHeroFill.style.width : null;

        PGRE.gamify.toggleTask(taskId, taskXp);

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
        PGRE.typesetMath(root);
        wire();

        // Views-A: smoothly glide affected meters from previous to new value, and flash row
        if (PGRE.motion && !PGRE.motion.reduced) {
          var newHeroFill = document.querySelector('#plan-root .hero .meter-fill');
          var newWeekDetails = weekId ? document.querySelector('#plan-root details[data-week="' + weekId + '"]') : null;
          var newWeekFill = newWeekDetails ? newWeekDetails.querySelector('summary .meter-fill') : null;

          if (prevHeroWidth && newHeroFill) {
            var targetHeroWidth = newHeroFill.style.width;
            newHeroFill.style.transition = 'none';
            newHeroFill.style.width = prevHeroWidth;
            requestAnimationFrame(function () {
              requestAnimationFrame(function () {
                if (newHeroFill) {
                  newHeroFill.style.transition = '';
                  newHeroFill.style.width = targetHeroWidth;
                }
              });
            });
          }

          if (prevWeekWidth && newWeekFill) {
            var targetWeekWidth = newWeekFill.style.width;
            newWeekFill.style.transition = 'none';
            newWeekFill.style.width = prevWeekWidth;
            requestAnimationFrame(function () {
              requestAnimationFrame(function () {
                if (newWeekFill) {
                  newWeekFill.style.transition = '';
                  newWeekFill.style.width = targetWeekWidth;
                }
              });
            });
          }

          var input = document.querySelector(
            '#plan-root input[data-task="' + taskId + '"]');
          if (input && input.checked) {
            var row = input.closest('li.task');
            if (row) {
              row.classList.add('task-just-done');
              setTimeout(function () { row.classList.remove('task-just-done'); }, 300);
            }
          }
        }
      });
    });
    document.querySelectorAll('#plan-root [data-launch-set]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (PGRE.launchPack(btn.getAttribute('data-launch-set')) == null) {
          PGRE.toast('That set is not available.');
        }
      });
    });
  }

  /* Views-A: run all plan meters (hero + weeks) from 0 to their value on initial paint. */
  function animateMeters() {
    if (!(PGRE.motion && PGRE.motion.animateMeter)) return;
    document.querySelectorAll('#plan-root .meter-fill').forEach(function (f) {
      var pct = parseFloat(f.style.width);
      if (!isNaN(pct)) PGRE.motion.animateMeter(f, pct);
    });
  }

  return {
    render: function () { return '<div id="plan-root">' + body() + '</div>'; },
    mount: function () {
      PGRE.typesetMath(document.getElementById('plan-root'));
      wire();
      if (PGRE.motion && !PGRE.motion.reduced) {
        // the countdown paints at its final value — never tweened from 0
        var note = document.querySelector('#plan-root .hero-xp-note');
        if (note && PGRE.motion.countUp) {
          var nm = note.textContent.trim().match(/^(\d+)\s*\/\s*(\d+)(.*)$/);
          if (nm) {
            var targetDone = parseInt(nm[1], 10);
            var totalStr = nm[2] + nm[3];
            PGRE.motion.countUp(note, targetDone, {
              duration: 700,
              format: function (v) { return Math.round(v) + ' / ' + totalStr; }
            });
          }
        }
        animateMeters();
      }
    }
  };
})();
