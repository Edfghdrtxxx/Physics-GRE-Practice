/* Study time — a dedicated page at #/study-time, reachable from the sidebar and
   from the dashboard's Study-time card ("Details →"). A deeper read of the same
   local data the dashboard card summarises, honestly labelled:
   - state.studyLog is DAY-granular seconds — passive heartbeat (js/study-time.js)
     PLUS any focus-timer time (js/timer.js), with no topic dimension.
   - state.timerStats / state.focusSessions are FOCUS-only (the timer).
   There is no per-topic time here because the data has none. The page is static
   (no live figures move on a page that's just being read), so it needs no
   self-terminating interval — just render(). */
window.PGRE = window.PGRE || {};
PGRE.views = PGRE.views || {};

PGRE.views.studytime = (function () {
  var WEEK_LO = 15, WEEK_HI = 17;      // plan's 15–17 h/week budget (matches dashboard)

  /* ——— Local date helpers (same Monday-based convention as js/study-time.js) ——— */
  function pad2(n) { return String(n).padStart(2, '0'); }
  function dayStr(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function dayKey(offset) {
    var d = new Date();
    d.setDate(d.getDate() + (offset || 0));
    return dayStr(d);
  }
  function hrs(sec) { return (sec / 3600).toFixed(1); }
  function monDayShort(d) { return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }

  /* Duration clock for a focus session (matches view-focus fmtClock). */
  function fmtClock(sec) {
    sec = Math.max(0, Math.floor(sec));
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    var p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return h > 0 ? h + ':' + p(m) + ':' + p(s) : m + ':' + p(s);
  }

  /* Monday that opens the week `offsetWeeks` back (0 = this week). */
  function weekMonday(offsetWeeks) {
    var now = new Date();
    var back = (now.getDay() + 6) % 7;   // Mon = 0 … Sun = 6
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - back - 7 * offsetWeeks);
  }
  function weekTotalSec(offsetWeeks) {
    var mon = weekMonday(offsetWeeks), total = 0, st = PGRE.studyTime;
    for (var i = 0; i < 7; i++) {
      var d = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i);
      total += st.daySec(dayStr(d));     // future days of the current week read 0
    }
    return total;
  }

  /* Total active seconds over the last `n` calendar days (day 0 = today). */
  function totalLastDays(n) {
    var st = PGRE.studyTime, total = 0;
    for (var i = 0; i < n; i++) total += st.daySec(dayKey(-i));
    return total;
  }

  /* Best single day ever, scanned across the whole studyLog. */
  function bestDay() {
    var log = PGRE.store.state.studyLog || {};
    var bestSec = 0, bestKey = null;
    for (var k in log) {
      var v = log[k];
      if (typeof v === 'number' && v > bestSec) { bestSec = v; bestKey = k; }
    }
    return { sec: bestSec, key: bestKey };
  }

  /* ——— Stat tiles ——— */
  function tilesHTML() {
    var ui = PGRE.ui, st = PGRE.studyTime, s = PGRE.store.state;

    var todaySec = st.todaySec();
    var todayMin = Math.round(todaySec / 60);
    var todayDisp = (todaySec > 0 && todayMin === 0) ? '<1' : String(todayMin);

    var total30 = totalLastDays(30);
    var avg30Sec = total30 / 30;

    var best = bestDay();
    var bestVal = best.sec > 0 ? hrs(best.sec) + '<span class="stat-unit"> h</span>' : '—';
    var bestSub = best.key
      ? new Date(best.key + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'no active days yet';

    var live = PGRE.store.liveStreak();
    var best0 = (s.streak && s.streak.best) || 0;

    var ts = s.timerStats || { sessions: 0, seconds: 0 };

    return '<div class="stat-row st-stats">' +
      ui.statTile('Today', todayDisp + '<span class="stat-unit"> min</span>', 'active in this tab') +
      ui.statTile('This week', hrs(st.weekSec()) + '<span class="stat-unit"> h</span>', 'of the 15–17 h plan') +
      ui.statTile('Last 30 days', hrs(total30) + '<span class="stat-unit"> h</span>', 'total active time') +
      ui.statTile('Daily average', hrs(avg30Sec) + '<span class="stat-unit"> h</span>', 'per day, last 30 d') +
      ui.statTile('Best day', bestVal, bestSub) +
      ui.statTile('Current streak', live + '<span class="stat-unit"> d</span>', 'best ' + best0 + ' day' + (best0 === 1 ? '' : 's')) +
      ui.statTile('Focus sessions', ui.fmt(ts.sessions || 0), 'lifetime, on the timer') +
      ui.statTile('Focus hours', hrs(ts.seconds || 0) + '<span class="stat-unit"> h</span>', 'logged on the timer') +
    '</div>';
  }

  /* ——— Last-28-days daily bar chart (pure-div bars; forecastHTML pattern) ——— */
  function dailyChartHTML() {
    var st = PGRE.studyTime, days = [], max = 1, i;
    for (i = 27; i >= 0; i--) {
      var key = dayKey(-i);
      var sec = st.daySec(key);
      if (sec > max) max = sec;
      days.push({ key: key, sec: sec, ago: i });
    }
    var total = days.reduce(function (a, d) { return a + d.sec; }, 0);

    var body;
    if (total <= 0) {
      body = '<p class="muted">No active time logged in the last 28 days — the passive tracker ' +
        'counts seconds as you interact with the app, and the focus timer adds any time you log there.</p>';
    } else {
      var bars = '';
      days.forEach(function (d) {
        var pctH = Math.round(100 * d.sec / max);
        var h = d.sec > 0 ? Math.max(4, pctH) : 0;
        var isToday = d.ago === 0;
        var cls = 'stbar' + (d.sec > 0 ? (isToday ? ' stbar-today' : '') : ' stbar-zero');
        var lbl = new Date(d.key + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        var m = Math.round(d.sec / 60);
        // an x-axis marker every 7 days back from today, plus "today" at the end
        var x = isToday ? 'today' : (d.ago % 7 === 0 ? (d.ago / 7) + 'w' : '');
        bars += '<div class="stbar-col" title="' + PGRE.ui.esc(lbl + ' · ' + m + ' min') + '">' +
          '<div class="' + cls + '" style="height:' + h + '%"></div>' +
          '<span class="stbar-x' + (isToday ? ' stbar-x-cur' : '') + '">' + x + '</span></div>';
      });
      body = '<div class="stbar-strip">' + bars + '</div>' +
        '<p class="muted st-note">Active time each day for the last 28 days — the passive heartbeat ' +
        'plus any focus-timer time, combined. Today is highlighted.</p>';
    }
    return '<div class="card"><h2>Daily activity</h2>' + body + '</div>';
  }

  /* ——— Weekly totals — last 8 Monday-based weeks, with the 15–17 h target band ——— */
  function weeklyStripHTML() {
    var weeks = [], scale = WEEK_HI * 3600, w;   // seed scale so the target band is always visible
    for (w = 7; w >= 0; w--) {
      var sec = weekTotalSec(w);
      if (sec > scale) scale = sec;
      weeks.push({ sec: sec, mon: weekMonday(w), current: w === 0 });
    }
    var bandBottom = 100 * WEEK_LO * 3600 / scale;
    var bandHeight = 100 * (WEEK_HI - WEEK_LO) * 3600 / scale;

    var bars = '', labs = '';
    weeks.forEach(function (wk) {
      var hh = hrs(wk.sec);
      var pctH = wk.sec > 0 ? Math.max(4, Math.round(100 * wk.sec / scale)) : 0;
      var met = wk.sec >= WEEK_LO * 3600;
      var cls = 'stweek-bar' + (met ? ' stweek-met' : '') + (wk.current ? ' stweek-current' : '');
      var sun = new Date(wk.mon.getFullYear(), wk.mon.getMonth(), wk.mon.getDate() + 6);
      var tip = 'Week of ' + PGRE.ui.dateRange(dayStr(wk.mon), dayStr(sun)) + ' · ' + hh + ' h';
      bars += '<div class="stweek-col" title="' + PGRE.ui.esc(tip) + '">' +
        '<div class="' + cls + '" style="height:' + pctH + '%"></div></div>';
      labs += '<div class="stweek-lab">' +
        '<span class="stweek-h' + (met ? ' stweek-h-met' : '') + '">' + hh + '</span>' +
        '<span class="stweek-x' + (wk.current ? ' stweek-x-cur' : '') + '">' +
          (wk.current ? 'this wk' : monDayShort(wk.mon)) + '</span></div>';
    });

    return '<div class="card"><h2>Weekly totals</h2>' +
      '<div class="stweek">' +
        '<div class="stweek-plot">' +
          '<div class="stweek-band" style="bottom:' + bandBottom.toFixed(1) + '%;height:' + bandHeight.toFixed(1) + '%"></div>' +
          bars +
        '</div>' +
        '<div class="stweek-labels">' + labs + '</div>' +
      '</div>' +
      '<p class="muted st-note">Total active hours per week (Mon–Sun) for the last 8 weeks. The shaded ' +
      'band is the 15–17 h weekly plan target; bars that reach it are tinted. This week is still in progress.</p>' +
    '</div>';
  }

  /* ——— Focus vs. app-activity split over the last 30 days ——— */
  function splitHTML() {
    var s = PGRE.store.state;
    var total30 = totalLastDays(30);
    var cutoff = Date.now() - 30 * 86400000;
    var focusSec = 0;
    (s.focusSessions || []).forEach(function (r) {
      var t = r && r.endedAt ? new Date(r.endedAt).getTime() : 0;
      if (t >= cutoff) focusSec += (r.seconds || 0);
    });
    // The timer credits studyLog too, so focus time is a SUBSET of the 30-day
    // active total; the remainder is passive app activity. Clamp so edge cases
    // (a session straddling the window edge, the 4 h cap) can't overrun the bar.
    var focusShown = Math.min(focusSec, total30);
    var passiveSec = Math.max(0, total30 - focusShown);

    var body;
    if (total30 <= 0) {
      body = '<p class="muted">No active time in the last 30 days yet.</p>';
    } else {
      var fPct = 100 * focusShown / total30;
      var pPct = 100 - fPct;
      var seg = '<div class="st-split-bar">' +
        (fPct > 0 ? '<div class="st-split-focus" style="width:' + fPct.toFixed(1) + '%"></div>' : '') +
        (pPct > 0 ? '<div class="st-split-passive" style="width:' + pPct.toFixed(1) + '%"></div>' : '') +
      '</div>';
      var legend = '<div class="st-split-legend">' +
        '<div class="st-split-item"><span class="st-swatch st-swatch-focus"></span>' +
          'Focus timer — <strong>' + hrs(focusShown) + ' h</strong> ' +
          '<span class="muted">(' + Math.round(fPct) + '%)</span></div>' +
        '<div class="st-split-item"><span class="st-swatch st-swatch-passive"></span>' +
          'App activity — <strong>' + hrs(passiveSec) + ' h</strong> ' +
          '<span class="muted">(' + Math.round(pPct) + '%)</span></div>' +
      '</div>';
      body = seg + legend +
        '<p class="muted st-note">"App activity" is time the passive heartbeat credited while you used the ' +
        'app outside a running timer — reading, clicking, answering. "Focus timer" is time you logged on the ' +
        'timer, which also counts reading and derivations you do on paper.</p>';
    }
    return '<div class="card"><h2>Focus vs. app activity</h2>' +
      '<p class="muted st-lead">Last 30 days, split by where the time was counted.</p>' + body + '</div>';
  }

  /* ——— Recent focus sessions (row style borrowed from view-focus) ——— */
  function recentFocusHTML() {
    var list = (PGRE.store.state.focusSessions || []).slice(-6).reverse();
    var head = '<div class="st-recent-head"><h2>Recent focus sessions</h2>' +
      '<a class="btn btn-ghost btn-sm" href="#/focus">Focus timer →</a></div>';
    if (!list.length) {
      return '<div class="card">' + head +
        '<p class="muted">No focus sessions yet — start one on the ' +
        '<a href="#/focus">focus timer</a>. Reading or deriving on paper counts.</p></div>';
    }
    var rows = list.map(function (r) {
      var dur = fmtClock(r.seconds);
      var tag = (r.goalMin == null)
        ? '<span class="focus-tag">stopwatch</span>'
        : (r.met ? '<span class="focus-tag focus-tag-met">' + r.goalMin + ' min · met ✓</span>'
                 : '<span class="focus-tag">' + r.goalMin + ' min · stopped early</span>');
      return '<li class="focus-sess"><span class="focus-sess-dur">' + dur + '</span>' + tag +
        '<span class="focus-sess-when muted">' + PGRE.ui.timeAgo(r.endedAt) + '</span></li>';
    }).join('');
    return '<div class="card">' + head + '<ul class="focus-sess-list">' + rows + '</ul></div>';
  }

  function render() {
    var head = '<div class="card"><h1>Study time</h1>' +
      '<p class="muted">A deeper look at how much you show up — active minutes, weekly hours against ' +
      'the 15–17 h plan, your longest streaks, and time logged on the focus timer. Everything here is ' +
      'computed from your own local activity; there is no per-topic breakdown because this data is ' +
      'day-level only.</p></div>';

    return head +
      tilesHTML() +
      '<div class="two-col">' + dailyChartHTML() + weeklyStripHTML() + '</div>' +
      '<div class="two-col">' + splitHTML() + recentFocusHTML() + '</div>';
  }

  /* Static page: nothing to wire, no interval to start. Kept for the view
     contract (render, mount) that the router expects. */
  function mount() {}

  return { render: render, mount: mount };
})();
