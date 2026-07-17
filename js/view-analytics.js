/* Analytics & trends — reads state.attempts / state.sessions / state.exams /
   state.studyLog and hand-rolls every chart as inline SVG or DOM (no libraries,
   no external assets). Single accent hue + neutral steps per DESIGN §6:
   status is icon + label, meters carry no legend, text never wears data color.
   Everything degrades to a friendly prompt on a fresh, data-less profile. */
window.PGRE = window.PGRE || {};
PGRE.views = PGRE.views || {};

PGRE.views.analytics = (function () {
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  // pre-cap attempts may hold walked-away outliers (hours) — keep them out of
  // the pace stats (matches PGRE.gamify.MAX_ATTEMPT_MS at record time)
  var MAX_SANE_MS = 15 * 60 * 1000;

  /* ——— Date helpers (local, Monday-based — matches study-time & store) ——— */
  function pad2(n) { return String(n).padStart(2, '0'); }
  function dayStr(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function mondayOf(d) {
    var back = (d.getDay() + 6) % 7; // Mon = 0 … Sun = 6
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() - back);
  }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }

  function fmtSec(ms) {
    if (ms == null) return '—';
    var s = ms / 1000;
    return (s < 10 ? s.toFixed(1) : Math.round(s)) + ' s';
  }

  /* ——— Aggregation over the attempt log ——— */
  function aggregate() {
    var s = PGRE.store.state;
    var attempts = s.attempts || [];
    var total = attempts.length;
    var correct = 0, timed = [], byTopic = {}, byWeek = {}, byDay = {};
    attempts.forEach(function (a) {
      if (a.correct) correct++;
      if (a.ms != null && a.ms <= MAX_SANE_MS) timed.push(a.ms);
      var bt = byTopic[a.topic] || (byTopic[a.topic] = { total: 0, correct: 0 });
      bt.total++; if (a.correct) bt.correct++;
      var d = new Date(a.ts);
      var wk = dayStr(mondayOf(d));
      var bw = byWeek[wk] || (byWeek[wk] = { total: 0, correct: 0 });
      bw.total++; if (a.correct) bw.correct++;
      var day = dayStr(d);
      byDay[day] = (byDay[day] || 0) + 1;
    });
    return { attempts: attempts, total: total, correct: correct, timed: timed,
             byTopic: byTopic, byWeek: byWeek, byDay: byDay };
  }

  /* ——— (b) Weekly accuracy trend — last 10 Monday-anchored weeks ——— */
  function weeklyTrendSVG(byWeek) {
    var weeks = [], thisMon = mondayOf(new Date());
    for (var i = 9; i >= 0; i--) {
      var mon = addDays(thisMon, -i * 7);
      var key = dayStr(mon);
      var rec = byWeek[key] || { total: 0, correct: 0 };
      weeks.push({
        label: (mon.getMonth() + 1) + '/' + mon.getDate(),
        n: rec.total,
        acc: rec.total ? Math.round(100 * rec.correct / rec.total) : null
      });
    }
    var W = 600, H = 214, padL = 26, padR = 12, padT = 22, padB = 42;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var slot = plotW / weeks.length, bw = Math.min(30, slot * 0.56);
    var base = padT + plotH;
    function yFor(p) { return padT + plotH * (1 - p / 100); }

    var svg = '<svg class="an-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" ' +
      'aria-label="Accuracy by week, last 10 weeks">';
    [0, 50, 100].forEach(function (p) {
      var y = yFor(p);
      svg += '<line class="an-grid" x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '"/>';
      svg += '<text class="an-axis" x="' + (padL - 5) + '" y="' + (y + 3) + '" text-anchor="end">' + p + '</text>';
    });
    weeks.forEach(function (w, i) {
      var cx = padL + slot * i + slot / 2;
      if (w.n > 0) {
        var y = yFor(w.acc), h = Math.max(base - y, 2), yTop = base - h;
        svg += '<rect class="an-bar" x="' + (cx - bw / 2).toFixed(1) + '" y="' + yTop.toFixed(1) +
          '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="2">' +
          '<title>' + w.label + ': ' + w.acc + '% over ' + w.n + ' answer' + (w.n === 1 ? '' : 's') + '</title></rect>';
        svg += '<text class="an-val" x="' + cx.toFixed(1) + '" y="' + (yTop - 5).toFixed(1) + '" text-anchor="middle">' + w.acc + '%</text>';
      } else {
        svg += '<circle class="an-empty-dot" cx="' + cx.toFixed(1) + '" cy="' + base + '" r="1.6"/>';
      }
      svg += '<text class="an-axis" x="' + cx.toFixed(1) + '" y="' + (H - padB + 16) + '" text-anchor="middle">' + w.label + '</text>';
      svg += '<text class="an-axis an-axis-sm" x="' + cx.toFixed(1) + '" y="' + (H - padB + 27) + '" text-anchor="middle">' +
        (w.n > 0 ? 'n=' + w.n : '') + '</text>';
    });
    svg += '</svg>';
    var withData = weeks.filter(function (w) { return w.n > 0; }).length;
    return { svg: svg, withData: withData };
  }

  /* ——— (c) Per-topic accuracy vs weight → expected points lost ——— */
  function pointsLostRows(byTopic) {
    var rows = PGRE.TOPICS.map(function (t) {
      var d = byTopic[t.id] || { total: 0, correct: 0 };
      var acc = d.total ? d.correct / d.total : null;
      return { t: t, total: d.total, correct: d.correct, acc: acc,
               lost: acc == null ? null : t.weight * (1 - acc) };
    });
    var withData = rows.filter(function (r) { return r.total > 0; })
      .sort(function (a, b) { return b.lost - a.lost; });
    var noData = rows.filter(function (r) { return r.total === 0; });
    return { withData: withData, noData: noData };
  }

  function pointsLostCard(pl) {
    var ui = PGRE.ui;
    var html = '<div class="card"><h2>What’s costing you the most points</h2>' +
      '<p class="muted">Expected weight-points at risk on the real test = ' +
      'topic weight × (1 − your accuracy). Bigger bar, bigger priority.</p>';
    if (!pl.withData.length) {
      html += '<p class="muted an-gap">No topic has enough answers yet — practice a set and this ranking fills in.</p>';
    } else {
      var maxLost = pl.withData[0].lost || 1;
      html += '<div class="an-topics">';
      pl.withData.forEach(function (r) {
        var accPct = Math.round(r.acc * 100);
        html += '<div class="an-topic-row">' +
          ui.monogram(r.t) +
          '<div class="an-topic-main">' +
            '<div class="an-topic-line"><span class="an-topic-name">' + ui.esc(r.t.name) + '</span>' +
              '<span class="an-topic-lost">≈' + r.lost.toFixed(1) + ' pts</span></div>' +
            ui.meter(100 * r.lost / maxLost, 'meter-thin') +
            '<div class="an-topic-sub">' + r.t.weight + '% weight · ' + accPct + '% accuracy · ' +
              r.total + ' answer' + (r.total === 1 ? '' : 's') + '</div>' +
          '</div>' +
        '</div>';
      });
      html += '</div>';
    }
    if (pl.noData.length) {
      html += '<div class="an-nodata"><span class="an-nodata-label">No data yet</span>';
      pl.noData.forEach(function (r) {
        html += '<a class="an-nodata-chip" href="#/build/topic-' + r.t.id + '" title="Start ' +
          ui.esc(r.t.name) + '">' + r.t.short + '</a>';
      });
      html += '</div>';
    }
    html += '</div>';
    return html;
  }

  /* ——— (d) Time-per-question distribution ——— */
  function timeDistCard(timed, target) {
    // Pace boundary for the middle buckets + the dashed divider: derive it from
    // the user's pace target when it sits cleanly inside the histogram's fixed
    // 60–180 s span; otherwise fall back to the canonical 103 s edge so the
    // divider's label never lies about where the line is drawn.
    var pb = (target > 60 && target < 180) ? target : 103;
    var defs = [
      { label: '<30 s', lo: 0, hi: 30 },
      { label: '30–60 s', lo: 30, hi: 60 },
      { label: '60–' + pb + ' s', lo: 60, hi: pb },
      { label: pb + '–180 s', lo: pb, hi: 180 },
      { label: '>180 s', lo: 180, hi: Infinity }
    ];
    var counts = defs.map(function () { return 0; });
    var under = 0;
    timed.forEach(function (ms) {
      var sec = ms / 1000;
      for (var i = 0; i < defs.length; i++) {
        if (sec >= defs[i].lo && sec < defs[i].hi) { counts[i]++; break; }
      }
      if (sec <= target) under++;
    });
    var over = timed.length - under;

    var html = '<div class="card"><h2>Time per question</h2>' +
      '<p class="muted">Each answered question sorted into a speed bucket. The dashed line marks the ' +
      pb + '-second pace divider (70-question test).</p>';

    if (!timed.length) {
      html += '<p class="muted an-gap">No timed answers yet — answer a practice set and your pace shows up here.</p></div>';
      return html;
    }

    var W = 600, H = 200, padL = 24, padR = 12, padT = 22, padB = 40;
    var plotW = W - padL - padR, plotH = H - padT - padB, base = padT + plotH;
    var slot = plotW / defs.length, bw = Math.min(58, slot * 0.6);
    var max = Math.max.apply(null, counts) || 1;
    var svg = '<svg class="an-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Time-per-question distribution">';
    svg += '<line class="an-grid" x1="' + padL + '" y1="' + base + '" x2="' + (W - padR) + '" y2="' + base + '"/>';
    // pace divider sits on the boundary between the two middle buckets (index 3),
    // whose edge is pb — so the label reads the line's true position
    var divX = padL + slot * 3;
    svg += '<line class="an-budget" x1="' + divX + '" y1="' + (padT - 4) + '" x2="' + divX + '" y2="' + base + '"/>';
    svg += '<text class="an-axis an-budget-label" x="' + (divX + 4) + '" y="' + (padT + 5) + '" text-anchor="start">' + pb + ' s</text>';
    counts.forEach(function (c, i) {
      var cx = padL + slot * i + slot / 2;
      var h = c ? Math.max((plotH - 4) * c / max, 2) : 0, yTop = base - h;
      if (c) {
        svg += '<rect class="an-bar" x="' + (cx - bw / 2).toFixed(1) + '" y="' + yTop.toFixed(1) +
          '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="2"><title>' +
          c + ' answer' + (c === 1 ? '' : 's') + ' in ' + defs[i].label + '</title></rect>';
        svg += '<text class="an-val" x="' + cx.toFixed(1) + '" y="' + (yTop - 5).toFixed(1) + '" text-anchor="middle">' + c + '</text>';
      }
      svg += '<text class="an-axis" x="' + cx.toFixed(1) + '" y="' + (H - padB + 16) + '" text-anchor="middle">' + defs[i].label + '</text>';
    });
    svg += '</svg>';

    var upct = Math.round(100 * under / timed.length), opct = 100 - upct;
    html += '<div class="an-chart">' + svg + '</div>' +
      '<div class="an-pace-row">' +
        '<span class="an-pace-chip"><span class="an-pace-ic">✓</span> On pace (≤' + target + ' s) · ' +
          upct + '% · ' + under + '</span>' +
        '<span class="an-pace-chip"><span class="an-pace-ic">⏱</span> Over pace (>' + target + ' s) · ' +
          opct + '% · ' + over + '</span>' +
      '</div></div>';
    return html;
  }

  /* ——— (e) Practice-volume day heatmap — last 12 weeks ——— */
  function heatLevel(a, sec) {
    if (a >= 10) return 4;
    if (a >= 6) return 3;
    if (a >= 3) return 2;
    if (a >= 1) return 1;
    if (sec >= 60) return 1; // studied but answered nothing that day
    return 0;
  }

  function heatmapCard(byDay) {
    var log = PGRE.store.state.studyLog || {};
    var today = new Date(), todayKey = dayStr(today);
    var startMon = addDays(mondayOf(today), -11 * 7);
    var dayName = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // Precompute each column's month, then label a month only at its first
    // column and only if it spans ≥2 columns — that guarantees ≥2-column gaps
    // between labels (no text collisions) and skips thin month slivers.
    var colMonths = [];
    for (var cc = 0; cc < 12; cc++) colMonths.push(addDays(startMon, cc * 7).getMonth());
    var months = '', cols = '';
    for (var c = 0; c < 12; c++) {
      var colMon = addDays(startMon, c * 7);
      var firstOfMonth = c === 0 || colMonths[c] !== colMonths[c - 1];
      var span = 0;
      for (var sp = c; sp < 12 && colMonths[sp] === colMonths[c]; sp++) span++;
      var mLabel = (firstOfMonth && span >= 2) ? MONTHS[colMonths[c]] : '';
      months += '<span class="an-heat-month">' + mLabel + '</span>';
      for (var r = 0; r < 7; r++) {
        var d = addDays(colMon, r), key = dayStr(d);
        if (key > todayKey) { cols += '<span class="an-heat-cell an-heat-future"></span>'; continue; }
        var a = byDay[key] || 0, sec = log[key] || 0, lvl = heatLevel(a, sec);
        var mins = Math.round(sec / 60);
        var tip = MONTHS[d.getMonth()] + ' ' + d.getDate() + ' · ' + a + ' answered' +
          (mins ? ' · ' + mins + ' min studied' : '');
        cols += '<span class="an-heat-cell an-heat-l' + lvl + '" title="' + tip + '"></span>';
      }
    }
    var daylabels = '';
    dayName.forEach(function (nm, i) {
      daylabels += '<span class="an-heat-dl">' + (i % 2 === 0 ? nm[0] : '') + '</span>';
    });
    var scale = '';
    for (var l = 0; l <= 4; l++) scale += '<span class="an-heat-cell an-heat-l' + l + '"></span>';

    return '<div class="card"><h2>Practice volume</h2>' +
      '<p class="muted">Questions answered each day over the last 12 weeks (a light square marks a day you studied without answering).</p>' +
      '<div class="an-heat">' +
        '<div class="an-heat-top"><span class="an-heat-corner"></span>' +
          '<div class="an-heat-months">' + months + '</div></div>' +
        '<div class="an-heat-body"><div class="an-heat-daylabels">' + daylabels + '</div>' +
          '<div class="an-heat-cols">' + cols + '</div></div>' +
        '<div class="an-heat-legend"><span>Less</span>' + scale + '<span>More</span></div>' +
      '</div></div>';
  }

  /* ——— (f) Mock-exam results table ——— */
  function weakestTopic(perTopic) {
    var worst = null, worstRatio = 2;
    for (var tid in perTopic) {
      var pt = perTopic[tid];
      if (pt && pt.total > 0) {
        var ratio = pt.right / pt.total;
        if (ratio < worstRatio) { worstRatio = ratio; worst = tid; }
      }
    }
    return worst;
  }

  function fmtFormat(f) {
    if (f === '70x120') return '70 Q · 120 min';
    if (f === '100x170') return '100 Q · 170 min';
    return f || '—';
  }

  function examsCard(exams) {
    var ui = PGRE.ui;
    var done = exams.filter(function (x) { return x.submittedAt; })
      .sort(function (a, b) { return a.submittedAt < b.submittedAt ? 1 : -1; });
    if (!done.length) return '';
    var html = '<div class="card"><h2>Mock exam results</h2>' +
      '<div class="an-table-wrap"><table class="an-table">' +
      '<thead><tr><th>Date</th><th>Format</th><th>Raw</th><th>Scaled est.</th>' +
      '<th>Weakest topic</th><th></th></tr></thead><tbody>';
    done.forEach(function (x) {
      var d = new Date(x.submittedAt);
      var date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      var wid = weakestTopic(x.perTopic || {});
      var wt = wid ? PGRE.topicById(wid) : null;
      var raw = (x.raw != null ? x.raw : '—') + (x.total ? ' / ' + x.total : '');
      html += '<tr>' +
        '<td>' + date + '</td>' +
        '<td>' + fmtFormat(x.format) + '</td>' +
        '<td class="an-num">' + raw + '</td>' +
        '<td class="an-num">' + (x.scaledEst != null ? x.scaledEst : '—') + '</td>' +
        '<td>' + (wt ? ui.monogram(wt) + ' <span class="an-td-topic">' + ui.esc(wt.name) + '</span>' : '—') + '</td>' +
        '<td><a href="#/exam/review/' + ui.esc(x.id) + '">Review →</a></td>' +
      '</tr>';
    });
    html += '</tbody></table></div></div>';
    return html;
  }

  /* ——— Weakest-topics callout — the "do this next" build links ——— */
  function focusCallout(pl) {
    var ui = PGRE.ui;
    if (!pl.withData.length) return '';
    var top = pl.withData.slice(0, 3).filter(function (r) { return r.lost > 0; });
    if (!top.length) return '';
    var html = '<div class="card an-focus"><div class="an-focus-head">' +
      '<h2>Focus next</h2><span class="muted">Highest expected points at risk — drill these first.</span></div>' +
      '<div class="an-focus-row">';
    top.forEach(function (r) {
      html += '<a class="btn btn-ghost an-focus-btn" href="#/build/topic-' + r.t.id + '">' +
        ui.monogram(r.t) + '<span class="an-focus-name">' + ui.esc(r.t.name) + '</span>' +
        '<span class="an-focus-pts">≈' + r.lost.toFixed(1) + ' pts</span></a>';
    });
    html += '</div></div>';
    return html;
  }

  return {
    render: function () {
      var ui = PGRE.ui, s = PGRE.store.state;
      var target = (s.settings && s.settings.paceTargetSec) || 103;
      var agg = aggregate();

      var head = '<div class="card"><h1>Analytics &amp; trends</h1>' +
        '<p class="muted">Where your practice is going — accuracy over time, the topics costing you ' +
        'the most points, your pace against the ' + target + '-second budget, and how often you show up. ' +
        'Everything here is computed from your own answer log.</p></div>';

      // Fresh, data-less profile → one friendly prompt, nothing to chart.
      if (agg.total === 0 && (!s.exams || !s.exams.filter(function (x) { return x.submittedAt; }).length)) {
        return head + '<div class="card an-empty"><h2>Answer questions to unlock trends</h2>' +
          '<p class="muted">Once you start answering, this page fills with your weekly accuracy, a ' +
          'points-at-risk ranking by topic, a pace breakdown and a practice heatmap.</p>' +
          '<div class="btn-row"><a class="btn btn-primary" href="#/practice/all">Start practicing →</a>' +
          '<a class="btn btn-ghost" href="#/build">Build a custom quiz</a></div></div>';
      }

      // (a) headline stat tiles
      var acc = agg.total ? Math.round(100 * agg.correct / agg.total) + '%' : '—';
      var avgMs = agg.timed.length
        ? agg.timed.reduce(function (a, b) { return a + b; }, 0) / agg.timed.length : null;
      var paceSub;
      if (avgMs == null) paceSub = 'no timed answers yet';
      else {
        var diff = Math.round(avgMs / 1000 - target);
        paceSub = diff <= 0 ? Math.abs(diff) + ' s under · budget ' + target + ' s'
                            : diff + ' s over · budget ' + target + ' s';
      }
      var tiles = '<div class="stat-row stat-row-4">' +
        ui.statTile('Total answered', ui.fmt(agg.total)) +
        ui.statTile('Overall accuracy', acc) +
        ui.statTile('Avg. time / question', avgMs == null ? '—' : fmtSec(avgMs), paceSub) +
        ui.statTile('Active days', ui.fmt(s.daysActive.length)) +
      '</div>';

      var pl = pointsLostRows(agg.byTopic);
      var trend = weeklyTrendSVG(agg.byWeek);

      var trendCard = '<div class="card"><h2>Weekly accuracy</h2>' +
        '<p class="muted">Share of answers correct in each of the last 10 weeks. ' +
        (trend.withData < 2 ? 'Come back after a couple more weeks to see the trend take shape.' :
          'Value labels are that week’s accuracy; n is how many questions it’s based on.') + '</p>' +
        '<div class="an-chart">' + trend.svg + '</div></div>';

      return head +
        tiles +
        focusCallout(pl) +
        trendCard +
        pointsLostCard(pl) +
        timeDistCard(agg.timed, target) +
        heatmapCard(agg.byDay) +
        examsCard(s.exams || []);
    }
  };
})();
