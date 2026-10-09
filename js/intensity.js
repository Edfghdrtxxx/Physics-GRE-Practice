/* Study-intensity feedback: one computation, read by three surfaces — the
   dashboard Intensity card (js/view-dashboard.js), the two pace lines on the
   practice summary (js/view-practice.js), and the `intensity` object of the
   agent status summary (js/status.js). It only reads state.attempts,
   state.settings.examDate, PGRE.PACKS and PGRE.TOPICS, so the three surfaces
   cannot disagree and nothing here writes study data.

   Definitions
   - Day: a local calendar day, midnight to midnight. This is the key
     store.today() and the status summary use for attempts. "Last N days"
     is today and the N - 1 days before it.
   - First attempt: the earliest state.attempts row for a qid, in any mode.
     Rows are ordered by ts; rows with the same ts keep their log order.
   - New question: a first attempt whose mode is 'practice' (a row without
     a mode counts as 'practice', the default gamify.recordAnswer writes).
   - Repeat: any attempt in mode 'mistakes'.
   - New questions (today): the number of today's new questions.
   - Pace (today): the median ms of today's new questions, in whole seconds.
     null (shown as "—") when there are none.
   - First-attempt accuracy (7 days): the share of new questions in the last
     7 days with correct === true, in whole percent.
   - Repeat minutes (today): the sum of ms over today's repeats, in whole
     minutes.
   - Coverage: remaining = qids in the union of PGRE.PACKS[*].ids that have
     no attempt at all. lastPackDay = settings.examDate (default 2026-11-01)
     minus 3 days. workingDaysLeft = the days from today through lastPackDay
     inclusive, Sundays excluded (Sundays are full-sitting days).
     required = remaining / workingDaysLeft. actual = new questions in the
     last 7 days / the non-Sunday days among those 7. Both to one decimal.
   - Per topic (14 days): for each ETS topic in PGRE.TOPICS, the new
     questions of the last 14 days (row.topic), their first-attempt accuracy,
     and the ETS weight. Sorted by weight x (0.79 - accuracy), largest first.
     A topic with fewer than 5 new questions is "too few to judge": it gets
     no band and sorts after the judged topics, heaviest weight first.

   Bands compare the rounded number that is shown, so a chip never disagrees
   with the value printed beside it. */
window.PGRE = window.PGRE || {};

PGRE.intensity = (function () {
  'use strict';

  /* Every tunable number lives here. */
  var THRESHOLDS = {
    newQuestions: { green: 15, amber: 8 },   // today: 15+ green, 8-14 amber, under 8 red
    paceSec: { green: 103, amber: 130 },     // median s: 103 or less green, 104-130 amber, over 130 red
    accuracyPct: { green: 75, amber: 60 },   // 7 days: 75%+ green, 60-74% amber, under 60% red
    repeatMin: { green: 20, amber: 40 },     // today: 20 or less green, 21-40 amber, over 40 red
    coverageSlack: 3,                        // actual >= required green; up to 3 below amber; more red
    topicMinNew: 5,                          // fewer new questions than this: too few to judge
    topicTargetAcc: 0.79,                    // per-topic sort key: weight x (0.79 - accuracy)
    lastPackLeadDays: 3,                     // last pack day = exam date minus 3 days
    accuracyDays: 7,
    coverageDays: 7,
    topicDays: 14,
    trendDays: 7,
    defaultExamDate: '2026-11-01'
  };

  var LABELS = { green: 'On target', amber: 'Close', red: 'Off target' };

  /* Whole-attempt cap, the same one gamify.recordAnswer applies to stored rows. */
  var MAX_MS = 15 * 60 * 1000;

  function pad2(n) { return String(n).padStart(2, '0'); }

  function dayKey(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function localDay(ts) {
    if (!ts) return null;
    var d = new Date(ts);
    return isNaN(d.getTime()) ? null : dayKey(d);
  }

  function isDayKey(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s); }

  /* Noon keeps a DST shift from moving the calendar day. */
  function parseDay(key) {
    var p = key.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2], 12, 0, 0, 0);
  }

  function addDays(key, n) {
    var d = parseDay(key);
    d.setDate(d.getDate() + n);
    return dayKey(d);
  }

  function isSunday(key) { return parseDay(key).getDay() === 0; }

  function round1(x) { return Math.round(x * 10) / 10; }

  function finiteMs(ms) { return typeof ms === 'number' && isFinite(ms) && ms >= 0; }

  function medianOf(list) {
    if (!list.length) return null;
    var a = list.slice().sort(function (x, y) { return x - y; });
    var mid = Math.floor(a.length / 2);
    return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
  }

  /* Median of a list of ms values, in whole seconds; null when empty. */
  function medianSec(msList) {
    var ms = (msList || []).filter(finiteMs).map(function (v) { return Math.min(v, MAX_MS); });
    var m = medianOf(ms);
    return m == null ? null : Math.round(m / 1000);
  }

  function bandHigh(value, t) {
    if (value == null) return null;
    if (value >= t.green) return 'green';
    if (value >= t.amber) return 'amber';
    return 'red';
  }

  function bandLow(value, t) {
    if (value == null) return null;
    if (value <= t.green) return 'green';
    if (value <= t.amber) return 'amber';
    return 'red';
  }

  /* Band for one rounded value of a named metric. */
  function band(metric, value) {
    if (metric === 'newQuestions') return bandHigh(value, THRESHOLDS.newQuestions);
    if (metric === 'paceSec') return bandLow(value, THRESHOLDS.paceSec);
    if (metric === 'accuracyPct') return bandHigh(value, THRESHOLDS.accuracyPct);
    if (metric === 'repeatMin') return bandLow(value, THRESHOLDS.repeatMin);
    return null;
  }

  function coverageBand(remaining, required, actual) {
    if (remaining === 0) return 'green';
    if (required == null) return 'red';                    // packs left and no working day left
    if (actual >= required - 1e-9) return 'green';
    if (actual >= required - THRESHOLDS.coverageSlack - 1e-9) return 'amber';
    return 'red';
  }

  function topicOf(row) {
    if (row.topic) return row.topic;
    var q = typeof PGRE.questionById === 'function' ? PGRE.questionById(row.qid) : null;
    return (q && q.topic) || null;
  }

  /* One pass over the log in time order: new questions, repeats, and the
     set of qids with any attempt. Sorts a copy; the log is not touched. */
  function classify(attempts) {
    var rows = [];
    (Array.isArray(attempts) ? attempts : []).forEach(function (row, i) {
      if (!row || !row.qid) return;
      var t = Date.parse(row.ts);
      rows.push({ row: row, i: i, t: isNaN(t) ? -Infinity : t });
    });
    rows.sort(function (a, b) { return (a.t - b.t) || (a.i - b.i); });
    var seen = Object.create(null);
    var news = [];
    var repeats = [];
    rows.forEach(function (r) {
      var row = r.row;
      var first = !seen[row.qid];
      seen[row.qid] = true;
      var mode = row.mode || 'practice';
      var day = localDay(row.ts);
      if (first && mode === 'practice') {
        news.push({ day: day, qid: row.qid, topic: topicOf(row), correct: row.correct === true, ms: row.ms });
      }
      if (mode === 'mistakes') repeats.push({ day: day, ms: row.ms });
    });
    return { news: news, repeats: repeats, attempted: seen };
  }

  function packQuestionIds() {
    var packs = PGRE.PACKS || {};
    var seen = Object.create(null);
    var out = [];
    Object.keys(packs).forEach(function (k) {
      var ids = packs[k] && Array.isArray(packs[k].ids) ? packs[k].ids : [];
      ids.forEach(function (id) {
        if (typeof id !== 'string' || !id || seen[id]) return;
        seen[id] = true;
        out.push(id);
      });
    });
    return out;
  }

  function examDateOf(state) {
    var s = (state && state.settings && state.settings.examDate) || PGRE.EXAM_DATE;
    return isDayKey(s) ? s : THRESHOLDS.defaultExamDate;
  }

  /* compute(state?, opts?) -> the whole intensity readout.
     opts.today: 'YYYY-MM-DD' (defaults to the local day of opts.now or now). */
  function compute(state, opts) {
    opts = opts || {};
    state = state || (PGRE.store && PGRE.store.state) || {};
    var T = THRESHOLDS;
    var today = isDayKey(opts.today) ? opts.today
      : dayKey(opts.now instanceof Date ? opts.now : new Date());
    var c = classify(state.attempts);

    function inLast(days) {
      var from = addDays(today, -(days - 1));
      return function (r) { return r.day && r.day >= from && r.day <= today; };
    }
    function msOf(list) { return list.map(function (r) { return r.ms; }); }

    // Today
    var newToday = c.news.filter(function (r) { return r.day === today; });
    var paceMs = msOf(newToday).filter(finiteMs);
    var pace = medianSec(paceMs);
    var repToday = c.repeats.filter(function (r) { return r.day === today; });
    var repMs = 0;
    repToday.forEach(function (r) { if (finiteMs(r.ms)) repMs += Math.min(r.ms, MAX_MS); });
    var repMin = Math.round(repMs / 60000);

    // First-attempt accuracy, last 7 days
    var news7 = c.news.filter(inLast(T.accuracyDays));
    var right7 = news7.filter(function (r) { return r.correct; }).length;
    var accPct = news7.length ? Math.round(100 * right7 / news7.length) : null;

    // Coverage
    var packIds = packQuestionIds();
    var remaining = packIds.filter(function (id) { return !c.attempted[id]; }).length;
    var examDate = examDateOf(state);
    var lastPackDay = addDays(examDate, -T.lastPackLeadDays);
    var workingDaysLeft = 0;
    var guard = 0;
    for (var d = today; d <= lastPackDay && guard < 400; d = addDays(d, 1), guard++) {
      if (!isSunday(d)) workingDaysLeft++;
    }
    var required = remaining === 0 ? 0
      : (workingDaysLeft > 0 ? round1(remaining / workingDaysLeft) : null);
    var coverNews = c.news.filter(inLast(T.coverageDays)).length;
    var coverWorking = 0;
    for (var k = 0; k < T.coverageDays; k++) {
      if (!isSunday(addDays(today, -k))) coverWorking++;
    }
    var actual = round1(coverNews / Math.max(1, coverWorking));

    // Per topic, last 14 days
    var news14 = c.news.filter(inLast(T.topicDays));
    var topics = (PGRE.TOPICS || []).map(function (t, order) {
      var rows = news14.filter(function (r) { return r.topic === t.id; });
      var n = rows.length;
      var right = rows.filter(function (r) { return r.correct; }).length;
      var judged = n >= T.topicMinNew;
      var pct = n ? Math.round(100 * right / n) : null;
      return {
        topic: t.id,
        name: t.name,
        short: t.short,
        weight: t.weight,
        newQuestions: n,
        correct: right,
        accuracy: judged ? pct : null,
        judged: judged,
        band: judged ? bandHigh(pct, T.accuracyPct) : null,
        score: judged ? Math.round(1000 * t.weight * (T.topicTargetAcc - right / n)) / 1000 : null,
        _order: order
      };
    });
    topics.sort(function (a, b) {
      if (a.judged !== b.judged) return a.judged ? -1 : 1;
      if (a.judged && a.score !== b.score) return b.score - a.score;
      if (a.weight !== b.weight) return b.weight - a.weight;
      return a._order - b._order;
    });
    topics.forEach(function (t) { delete t._order; });

    // Seven-day trend, oldest first
    var days = [];
    for (var i = T.trendDays - 1; i >= 0; i--) {
      var key = addDays(today, -i);
      var rowsDay = c.news.filter(function (r) { return r.day === key; });
      days.push({
        date: key,
        newQuestions: rowsDay.length,
        paceSec: medianSec(msOf(rowsDay))
      });
    }

    return {
      date: today,
      newQuestions: {
        value: newToday.length, threshold: T.newQuestions.green,
        band: bandHigh(newToday.length, T.newQuestions),
        unit: 'questions', window: 'today'
      },
      paceSec: {
        value: pace, threshold: T.paceSec.green,
        band: bandLow(pace, T.paceSec),
        unit: 'seconds', window: 'today', n: paceMs.length
      },
      firstAttemptAccuracy: {
        value: accPct, threshold: T.accuracyPct.green,
        band: bandHigh(accPct, T.accuracyPct),
        unit: 'percent', window: 'last 7 days', n: news7.length, correct: right7
      },
      repeatMinutes: {
        value: repMin, threshold: T.repeatMin.green,
        band: bandLow(repMin, T.repeatMin),
        unit: 'minutes', window: 'today', n: repToday.length
      },
      coverage: {
        value: actual, threshold: required,
        band: coverageBand(remaining, required, actual),
        unit: 'new questions per working day', window: 'last 7 days',
        remaining: remaining, workingDaysLeft: workingDaysLeft,
        required: required, actual: actual,
        lastPackDay: lastPackDay, examDate: examDate,
        packQuestions: packIds.length
      },
      topics: topics,
      days: days
    };
  }

  /* Median seconds over a practice session's answers ({ ms } objects;
     holes and missing ms are skipped). */
  function sessionMedianSec(answers) {
    var ms = [];
    (answers || []).forEach(function (a) { if (a && finiteMs(a.ms)) ms.push(a.ms); });
    return medianSec(ms);
  }

  /* Band chip: colour plus a word, never colour alone. */
  function chipHTML(bandName, text) {
    var b = (bandName === 'green' || bandName === 'amber' || bandName === 'red') ? bandName : 'none';
    var word = text || (b === 'none' ? 'No data' : LABELS[b]);
    return '<span class="band-chip band-' + b + '" data-band="' + b + '">' + word + '</span>';
  }

  return {
    THRESHOLDS: THRESHOLDS,
    LABELS: LABELS,
    compute: compute,
    band: band,
    medianSec: medianSec,
    sessionMedianSec: sessionMedianSec,
    chipHTML: chipHTML
  };
}());
