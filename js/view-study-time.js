/* Study time — a dedicated page at #/study-time, reachable from the sidebar and
   from the dashboard's Study-time card ("Details →"). A deeper read of the same
   local data the dashboard card summarises, honestly labelled:
   - state.studyLog is DAY-granular seconds — passive heartbeat (js/study-time.js)
     PLUS any focus-timer time (js/timer.js), with no topic dimension.
   - state.timerStats / state.focusSessions are FOCUS-only (the timer).
   There is no per-topic time here because the data has none. Charts are a
   snapshot (no live interval). mount() binds the daily-activity-target editor. */

window.PGRE = window.PGRE || {};
PGRE.views = PGRE.views || {};

PGRE.views.studytime = (function () {
  var WEEK_LO = 15, WEEK_HI = 17;      // syllabus 15–17 h/wk (≈16 h scheduled)

  /* ——— Local date helpers (same Monday-based convention as js/study-time.js) ——— */
  function pad2(n) { return String(n).padStart(2, '0'); }
  function dayStr(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function dayKey(offset) {
    var d = new Date();
    d.setDate(d.getDate() + (offset || 0));
    return dayStr(d);
  }

  /* Focus-timer seconds keyed by local calendar day of endedAt — used by the
     daily chart's tooltip. */
  function focusSecByDay() {
    var map = {};
    (PGRE.store.state.focusSessions || []).forEach(function (r) {
      if (!r || !r.endedAt) return;
      var k = dayStr(new Date(r.endedAt));
      map[k] = (map[k] || 0) + (r.seconds || 0);
    });
    return map;
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

  /* ——— Daily activity target ——— */

  function clampDailyTargetMin(n) {
    n = parseInt(n, 10);
    if (!n || n <= 0) return 0;
    n = Math.round(n / 15) * 15;
    return Math.max(15, Math.min(480, n));
  }

  function dailyTargetMin() {
    var n = (PGRE.store.state.settings || {}).dailyTargetMin;
    if (typeof n !== 'number' || !isFinite(n) || n <= 0) return 0;
    return n;
  }

  /* Same math as view-focus elapsedSec: live seconds excluding paused time. */
  function liveFocusElapsedSec() {
    var t = PGRE.store.state.timer;
    if (!t || !t.on || !t.startedAt) return 0;
    var ref = t.paused ? (t.lastCredit || t.startedAt) : Date.now();
    return Math.max(0, (ref - t.startedAt - (t.pausedMs || 0)) / 1000);
  }

  function todayActiveSec() {
    if (PGRE.studyTime && typeof PGRE.studyTime.liveTodaySec === 'function') {
      return PGRE.studyTime.liveTodaySec();
    }
    return PGRE.studyTime.todaySec() + liveFocusElapsedSec();
  }

  function weekActiveSec() {
    var st = PGRE.studyTime;
    if (typeof st.liveTodaySec === 'function') {
      return st.weekSec() + (st.liveTodaySec() - st.todaySec());
    }
    return st.weekSec() + liveFocusElapsedSec();
  }

  function weeklyBandHTML() {
    var weekSec = weekActiveSec();
    var weekH = weekSec / 3600;
    var scaleH = Math.max(WEEK_HI, weekH);
    var fillPct = Math.min(100, 100 * weekH / scaleH);
    var bandLeft = 100 * WEEK_LO / scaleH;
    var bandW = 100 * (WEEK_HI - WEEK_LO) / scaleH;
    var weekLabel = hrs(weekSec);
    var tip = 'This week\\n' + weekLabel + ' h of the 15–17 h plan';
    var status = 'This week · ' + weekLabel + ' of 15–17 h';
    if (weekH > WEEK_HI) status += ' · above target';
    else if (weekH >= WEEK_LO) status += ' · on plan';
    else status += ' · ' + (WEEK_LO - weekH).toFixed(1) + ' h to the 15 h floor';
    return '<div class="st-at-meter" data-tip="' + PGRE.ui.esc(tip) + '">' +
      PGRE.ui.meter(fillPct, 'meter-thin meter-week') +
      '<div class="st-at-band" style="left:' + bandLeft + '%;width:' + bandW + '%"></div>' +
    '</div>' +
    '<div class="challenge-prog">' + PGRE.ui.esc(status) + '</div>';
  }

  /* ——— Exam horizon (third bar) ———
     Remaining = sum of non-historical PGRE.PLAN week `hours`, current week
     pro-rated by days left in that week. Source of truth is the vault syllabus
     (15–17 ≈ 16 h/wk, taper week lower) — NOT daysLeft × rate, and NOT lifetime
     studyLog surplus (past minutes do not cancel future timed sets / mocks).
     Fill = live-window logged hours / campaign total. Pace is advisory only. */
  function examDateKey() {
    var s = PGRE.store.state.settings || {};
    return s.examDate || PGRE.EXAM_DATE || '2026-11-01';
  }

  function parseDayKey(key) {
    if (!key || typeof key !== 'string') return null;
    var p = key.split('-');
    if (p.length !== 3) return null;
    var d = new Date(+p[0], +p[1] - 1, +p[2], 12, 0, 0);
    return isNaN(d.getTime()) ? null : d;
  }

  function daysBetweenKeys(a, b) {
    var da = parseDayKey(a), db = parseDayKey(b);
    if (!da || !db) return NaN;
    return Math.round((db.getTime() - da.getTime()) / 86400000);
  }

  function campaignStartKey() {
    var best = null;
    (PGRE.PLAN || []).forEach(function (phase) {
      (phase.weeks || []).forEach(function (w) {
        if (!w || w.historical || !w.start) return;
        if (!best || w.start < best) best = w.start;
      });
    });
    return best || '2026-09-14';
  }

  /* Active seconds on/after the live calendar start only. */
  function campaignActiveSec() {
    var start = campaignStartKey();
    var log = PGRE.store.state.studyLog || {};
    var total = 0, k;
    for (k in log) {
      if (!Object.prototype.hasOwnProperty.call(log, k)) continue;
      if (typeof log[k] !== 'number') continue;
      if (k < start) continue;
      total += log[k];
    }
    var today = dayKey(0);
    if (today >= start) {
      var stored = typeof log[today] === 'number' ? log[today] : 0;
      total += Math.max(0, todayActiveSec() - stored);
    }
    return total;
  }

  /* Syllabus hour budget from PLAN week rows (excludes historical). */
  function planHoursBudget() {
    var today = dayKey(0);
    var total = 0, done = 0, remain = 0;
    (PGRE.PLAN || []).forEach(function (phase) {
      (phase.weeks || []).forEach(function (w) {
        if (!w || w.historical) return;
        var h = +w.hours || 0;
        if (h <= 0) return;
        total += h;
        if (!w.start || !w.end) { remain += h; return; }
        if (w.end < today) { done += h; return; }
        if (w.start > today) { remain += h; return; }
        var span = daysBetweenKeys(w.start, w.end) + 1;
        if (!isFinite(span) || span < 1) span = 7;
        var left = daysBetweenKeys(today, w.end) + 1;
        if (!isFinite(left)) left = span;
        left = Math.max(0, Math.min(span, left));
        var credit = h * (left / span);
        remain += credit;
        done += h - credit;
      });
    });
    return { total: total, done: done, remain: remain };
  }

  function examHorizonHTML() {
    var daysLeft = (PGRE.gamify && typeof PGRE.gamify.daysToExam === 'function')
      ? PGRE.gamify.daysToExam()
      : (PGRE.srs ? PGRE.srs.daysUntil(examDateKey()) : 0);
    if (!isFinite(daysLeft) || daysLeft < 0) daysLeft = 0;

    var examKey = examDateKey();
    var examDate = parseDayKey(examKey);
    var examLabel = examDate
      ? examDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : examKey;

    var budget = planHoursBudget();
    var remainH = budget.remain;
    var totalH = budget.total;
    var loggedH = campaignActiveSec() / 3600;

    if (daysLeft <= 0 || remainH <= 0.05) {
      var doneTip = 'Exam runway\\nSyllabus window complete · ' + examLabel;
      return '<div class="st-at-meter" data-tip="' + PGRE.ui.esc(doneTip) + '">' +
        PGRE.ui.meter(100, 'meter-thin meter-horizon') +
      '</div>' +
      '<div class="challenge-prog">Until exam · runway complete · ' + PGRE.ui.esc(examLabel) + '</div>';
    }

    var fillPct = totalH > 0.01 ? Math.min(100, 100 * loggedH / totalH) : 0;
    var remainLabel = remainH >= 10 ? remainH.toFixed(0) : remainH.toFixed(1);
    var totalLabel = totalH >= 10 ? totalH.toFixed(0) : totalH.toFixed(1);

    var status = 'Until exam · ' + remainLabel + ' h scheduled left · ' +
      daysLeft + ' d to ' + examLabel;

    // Advisory pace vs calendar-expected PLAN hours (never shrinks remainH).
    var delta = loggedH - budget.done;
    if (delta >= 0.5) status += ' · ' + delta.toFixed(1) + ' h ahead of schedule';
    else if (delta <= -0.5) status += ' · ' + (-delta).toFixed(1) + ' h behind schedule';

    var tip = 'Exam runway to ' + examLabel + '\\n' +
      remainLabel + ' h still on the syllabus (of ' + totalLabel + ' h live window)\\n' +
      loggedH.toFixed(1) + ' h logged since ' + campaignStartKey() +
      ' · fill = campaign log / syllabus total';

    return '<div class="st-at-meter" data-tip="' + PGRE.ui.esc(tip) + '">' +
      PGRE.ui.meter(fillPct, 'meter-thin meter-horizon') +
    '</div>' +
    '<div class="challenge-prog">' + PGRE.ui.esc(status) + '</div>';
  }



  function activityTargetProgressHTML(targetMin, doneSec, timerOn) {
    var html;
    if (!targetMin) {
      html = '<p class="muted">Set a daily activity target to track it here.</p>';
    } else {
      var targetSec = targetMin * 60;
      var pct = Math.min(100, 100 * doneSec / targetSec);
      var pctR = Math.round(pct);
      var doneMin = Math.floor(doneSec / 60);
      var remainSec = Math.max(0, targetSec - doneSec);
      var remainMin = Math.ceil(remainSec / 60);
      var met = remainSec <= 0;
      var status = 'Today · ' + doneMin + ' of ' + targetMin + ' min';
      status += met ? ' · Target met — nice work.' : ' · ' + remainMin + ' min to go';
      var tip = 'Active time today\\n' + doneMin + ' of ' + targetMin + ' min (' + pctR + '%)';
      html = '<div data-tip="' + PGRE.ui.esc(tip) + '">' +
        PGRE.ui.meter(pct, 'meter-thin') + '</div>' +
        '<div class="challenge-prog">' + PGRE.ui.esc(status) + '</div>';
    }
    html += weeklyBandHTML();
    html += examHorizonHTML();
    if (timerOn && targetMin) html += '<p class="muted st-note">Session in progress.</p>';
    return html;
  }

  function activityTargetActionHTML(timerOn, targetMin, remainMin) {
    if (timerOn) {
      return '<a class="btn btn-ghost" href="#/focus">Focus session running — open timer →</a>';
    }
    if (targetMin > 0 && remainMin > 0) {
      return '<button type="button" class="btn btn-primary" id="st-at-start" data-at-remain="' +
        remainMin + '">Focus ' + remainMin + ' min →</button>';
    }
    return '<button type="button" class="btn btn-primary" id="st-at-start" data-at-remain="">' +
      'Start focus timer →</button>';
  }

  function activityTargetChipsHTML(targetMin) {
    var presets = [60, 120, 180];
    var html = '<button type="button" class="focus-chip' + (targetMin === 0 ? ' active' : '') +
      '" data-atarget="0">Off</button>';
    presets.forEach(function (m) {
      html += '<button type="button" class="focus-chip' + (targetMin === m ? ' active' : '') +
        '" data-atarget="' + m + '">' + m + ' min</button>';
    });
    var isPreset = targetMin === 0 || presets.indexOf(targetMin) >= 0;
    var customVal = (!isPreset && targetMin > 0) ? String(targetMin) : '';
    html += '<span class="focus-chip focus-chip-custom">' +
      '<input id="st-at-custom" class="focus-custom-in" type="number" min="15" max="480" step="15" ' +
      'inputmode="numeric" placeholder="min" aria-label="Custom daily activity minutes" ' +
      'value="' + customVal + '"></span>';
    return html;
  }

  function activityTargetHTML() {
    var targetMin = dailyTargetMin();
    var doneSec = todayActiveSec();
    var timerOn = !!(PGRE.store.state.timer && PGRE.store.state.timer.on);
    var remainMin = targetMin > 0
      ? Math.ceil(Math.max(0, targetMin * 60 - doneSec) / 60) : 0;
    return '<div class="card" id="st-active-target">' +
      '<h2>Daily activity target</h2>' +
      '<p class="muted st-lead">Active minutes today — tab activity plus the focus timer — against a goal you pick. Below: this week’s 15–17 h band, then remaining syllabus hours to the exam.</p>' +
      '<div id="st-at-progress">' + activityTargetProgressHTML(targetMin, doneSec, timerOn) + '</div>' +
      '<div class="chip-row" id="st-at-chips">' + activityTargetChipsHTML(targetMin) + '</div>' +
      '<div class="st-at-action" id="st-at-action">' +
        activityTargetActionHTML(timerOn, targetMin, remainMin) + '</div>' +
    '</div>';
  }

  function paintActivityTarget() {
    var progress = document.getElementById('st-at-progress');
    var action = document.getElementById('st-at-action');
    var targetMin = dailyTargetMin();
    var doneSec = todayActiveSec();
    var timerOn = !!(PGRE.store.state.timer && PGRE.store.state.timer.on);
    var remainMin = targetMin > 0
      ? Math.ceil(Math.max(0, targetMin * 60 - doneSec) / 60) : 0;
    if (progress) progress.innerHTML = activityTargetProgressHTML(targetMin, doneSec, timerOn);
    if (action) action.innerHTML = activityTargetActionHTML(timerOn, targetMin, remainMin);
    var chips = document.getElementById('st-at-chips');
    if (!chips) return;
    Array.prototype.forEach.call(chips.querySelectorAll('[data-atarget]'), function (b) {
      var v = parseInt(b.getAttribute('data-atarget'), 10);
      if (isNaN(v)) v = 0;
      b.classList.toggle('active', v === targetMin);
    });
  }

  function setDailyTargetMin(n) {
    PGRE.store.state.settings.dailyTargetMin = n;
    PGRE.store.save();
    paintActivityTarget();
  }


  /* ——— Last-28-days daily bar chart (pure-div bars; forecastHTML pattern) ——— */
  function dailyChartHTML() {

    var st = PGRE.studyTime, days = [], max = 1, i;
    var focusByDay = focusSecByDay();

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
        var dt = new Date(d.key + 'T12:00:00');
        var dayLbl = dt.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        var totalMin = Math.round(d.sec / 60);
        var line2 = totalMin < 60
          ? totalMin + ' min active'
          : Math.floor(totalMin / 60) + ' h ' + (totalMin % 60) + ' min active';
        var fm = Math.round((focusByDay[d.key] || 0) / 60);
        if (fm > 0) line2 += ' · ' + fm + ' min focus';
        var x = isToday ? 'today' : (d.ago % 7 === 0 ? (d.ago / 7) + 'w' : '');
        bars += '<div class="stbar-col" data-tip="' + PGRE.ui.esc(dayLbl + '\\n' + line2) + '">' +
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
      var range = PGRE.ui.dateRange(dayStr(wk.mon), dayStr(sun));
      var line2 = hh + ' h active';
      if (wk.current) line2 += ' · in progress';
      else if (met) line2 += ' · on plan';
      else line2 += ' · ' + (WEEK_LO - wk.sec / 3600).toFixed(1) + ' h under the 15 h floor';
      bars += '<div class="stweek-col" data-tip="' + PGRE.ui.esc('Week of ' + range + '\\n' + line2) + '">' +
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
      'band is the 15–17 h weekly syllabus target; bars that reach it are tinted. This week is still in progress.</p>' +
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
        (fPct > 0 ? '<div class="st-split-focus" style="width:' + fPct.toFixed(1) + '%" data-tip="' +
          PGRE.ui.esc('Focus timer\\n' + hrs(focusShown) + ' h · ' + Math.round(fPct) + '% of active time') +
          '"></div>' : '') +
        (pPct > 0 ? '<div class="st-split-passive" style="width:' + pPct.toFixed(1) + '%" data-tip="' +
          PGRE.ui.esc('App activity\\n' + hrs(passiveSec) + ' h · ' + Math.round(pPct) + '% of active time') +
          '"></div>' : '') +
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
      activityTargetHTML() +
      '<div class="two-col">' + dailyChartHTML() + weeklyStripHTML() + '</div>' +
      '<div class="two-col">' + splitHTML() + recentFocusHTML() + '</div>';
  }

  function mount() {
    var card = document.getElementById('st-active-target');
    if (!card) return;

    card.addEventListener('click', function (e) {
      var chip = e.target.closest && e.target.closest('[data-atarget]');
      if (chip && card.contains(chip)) {
        var n = parseInt(chip.getAttribute('data-atarget'), 10);
        if (isNaN(n)) n = 0;
        var input = document.getElementById('st-at-custom');
        if (input) input.value = '';
        setDailyTargetMin(n);
        return;
      }
      var startBtn = e.target.closest && e.target.closest('#st-at-start');
      if (!startBtn || !PGRE.timer) return;
      var remain = startBtn.getAttribute('data-at-remain');
      var goal = remain ? parseInt(remain, 10) : null;
      if (goal != null && (!isFinite(goal) || goal <= 0)) goal = null;
      PGRE.timer.start(goal);
      location.hash = '#/focus';
    });

    var input = document.getElementById('st-at-custom');
    if (!input) return;
    // Live paint only — store.save() is an unthrottled full-blob localStorage
    // write. view-focus's custom-minutes box also uses input for UI and commits
    // on blur (Start blurs the field first).
    input.addEventListener('input', function () {
      var n;
      if (!input.value) n = 0;
      else {
        var raw = parseInt(input.value, 10);
        n = (!raw || raw <= 0) ? 0 : clampDailyTargetMin(raw);
      }
      PGRE.store.state.settings.dailyTargetMin = n;
      paintActivityTarget();
    });
    input.addEventListener('blur', function () {
      var n = dailyTargetMin();
      var presets = [0, 60, 120, 180];
      input.value = (presets.indexOf(n) >= 0) ? '' : String(n);
      PGRE.store.save();
    });

  }


  return { render: render, mount: mount };
})();
