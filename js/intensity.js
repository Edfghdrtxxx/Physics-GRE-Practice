/* Study-intensity feedback: one computation, read by three surfaces — the
   dashboard Intensity card (js/view-dashboard.js), the two pace lines on the
   practice summary (js/view-practice.js), and the `intensity` object of the
   agent status summary (js/status.js). It only reads state.attempts,
   state.exams, state.settings.examDate and PGRE.TOPICS, so the three
   surfaces cannot disagree and nothing here writes study data.

   The plan it measures (OrbitOS 8-Week-Syllabus, "Mock-first 2026-10-17"):
   new material comes from the Sunday full mocks; the other days go to the
   mistake book. So the daily target is Daily work, and New questions and
   Repeat time are shown without a target or a band.

   Definitions
   - Day: a local calendar day, midnight to midnight. This is the key
     store.today() and the status summary use for attempts. "Last N days"
     is today and the N - 1 days before it.
   - First attempt: the earliest state.attempts row for a qid, in any mode.
     Rows are ordered by ts; rows with the same ts keep their log order.
   - New question: a first attempt whose mode is 'practice' (a row without
     a mode counts as 'practice', the default gamify.recordAnswer writes).
   - Repeat: any attempt in mode 'mistakes'.
   - Full mock: a state.exams row with submittedAt, any source (an intact
     form or the weighted 70-question draw); every exam format is a full
     sitting. Its day is the local day of submittedAt.
   - New questions (today): the number of today's new questions. No band.
   - Pace (today): the median ms of today's new questions, in whole seconds.
     null (shown as "—") when there are none.
   - First-attempt accuracy (7 days): the share of new questions in the last
     7 days with correct === true, in whole percent.
   - Repeat minutes (today): the sum of ms over today's repeats, in whole
     minutes. No band.
   - Daily work (today): value = today's repeats (each answered retake
     counts once). lastTargetDay = settings.examDate (default 2026-11-01)
     minus 3 days. Through lastTargetDay the band is green when value >= 40
     or a full mock was submitted today, amber at 25-39, red under 25.
     After lastTargetDay there is no target and no band.
   - Day strip: the last N days, oldest first. N = opts.trendDays (the
     dashboard passes settings.intensityTrendDays), a whole number from 2 to
     90; anything else is 7. The status payload keeps 7.
   - Per topic (14 days): for each ETS topic in PGRE.TOPICS, the new
     questions of the last 14 days (row.topic), their first-attempt accuracy,
     and the ETS weight. Sorted by weight x (0.79 - accuracy), largest first.
     A topic with fewer than 5 new questions is "too few to judge": it gets
     no band and sorts after the judged topics, heaviest weight first.

   Bands compare the rounded number that is shown, so a chip never disagrees
   with the value printed beside it.

   review(d, ctx) reads one compute() result and returns the words the
   dashboard card puts around it (targets, hints, the order of attention,
   one headline, one next action). It adds no number to compute() and
   changes no band; the status payload stays compute() alone. */
window.PGRE = window.PGRE || {};

PGRE.intensity = (function () {
  'use strict';

  /* Local weekday of the scheduled full mock (0 = Sunday). It only picks
     the words and the link of an unmet Daily work target, never a band. */
  var MOCK_WEEKDAY = 0;

  /* Every tunable number lives here. */
  var THRESHOLDS = {
    dailyWork: { green: 40, amber: 25 },     // retakes today: 40+ (or a full mock) green, 25-39 amber, under 25 red
    paceSec: { green: 103, amber: 130 },     // median s: 103 or less green, 104-130 amber, over 130 red
    accuracyPct: { green: 75, amber: 60 },   // 7 days: 75%+ green, 60-74% amber, under 60% red
    topicMinNew: 5,                          // fewer new questions than this: too few to judge
    topicTargetAcc: 0.79,                    // per-topic sort key: weight x (0.79 - accuracy)
    lastTargetLeadDays: 3,                   // last day with a Daily work target = exam date minus 3 days
    accuracyDays: 7,
    topicDays: 14,
    trendDays: 7,                            // day strip default; 2-90 on request
    trendDaysMin: 2,
    trendDaysMax: 90,
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

  /* Band for one rounded value of a named metric. New questions and repeat
     minutes have none. */
  function band(metric, value) {
    if (metric === 'paceSec') return bandLow(value, THRESHOLDS.paceSec);
    if (metric === 'accuracyPct') return bandHigh(value, THRESHOLDS.accuracyPct);
    if (metric === 'dailyWork') return bandHigh(value, THRESHOLDS.dailyWork);
    return null;
  }

  /* Daily work band for one day: none after the last target day; green on
     a day with a full mock submitted. */
  function workBand(day, lastTargetDay, retakes, mock) {
    if (day > lastTargetDay) return null;
    return mock ? 'green' : bandHigh(retakes, THRESHOLDS.dailyWork);
  }

  function topicOf(row) {
    if (row.topic) return row.topic;
    var q = typeof PGRE.questionById === 'function' ? PGRE.questionById(row.qid) : null;
    return (q && q.topic) || null;
  }

  /* One pass over the log in time order: new questions and repeats. Sorts
     a copy; the log is not touched. */
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
    return { news: news, repeats: repeats };
  }

  /* Submitted full mocks by local day of submittedAt, in submit order. */
  function mocksByDay(exams) {
    var out = Object.create(null);
    (Array.isArray(exams) ? exams : []).filter(function (x) { return x && x.submittedAt; })
      .slice().sort(function (a, b) { return a.submittedAt < b.submittedAt ? -1 : a.submittedAt > b.submittedAt ? 1 : 0; })
      .forEach(function (x) {
        var day = localDay(x.submittedAt);
        if (!day) return;
        (out[day] = out[day] || []).push({
          id: x.id || null, source: x.source || null, format: x.format || null, submittedAt: x.submittedAt
        });
      });
    return out;
  }

  function examDateOf(state) {
    var s = (state && state.settings && state.settings.examDate) || PGRE.EXAM_DATE;
    return isDayKey(s) ? s : THRESHOLDS.defaultExamDate;
  }

  /* A day-strip length: a whole number from trendDaysMin to trendDaysMax,
     else the default. */
  function trendDaysOf(n) {
    var T = THRESHOLDS;
    n = Number(n);
    return Math.floor(n) === n && n >= T.trendDaysMin && n <= T.trendDaysMax ? n : T.trendDays;
  }

  /* compute(state?, opts?) -> the whole intensity readout.
     opts.today: 'YYYY-MM-DD' (defaults to the local day of opts.now or now).
     opts.trendDays: length of d.days (see trendDaysOf). */
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

    // Daily work: today's retakes, or a full mock submitted today
    var examDate = examDateOf(state);
    var lastTargetDay = addDays(examDate, -T.lastTargetLeadDays);
    var mocks = mocksByDay(state.exams);
    var mocksToday = mocks[today] || [];
    var workTarget = today <= lastTargetDay;

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

    // Day strip, oldest first
    var days = [];
    for (var i = trendDaysOf(opts.trendDays) - 1; i >= 0; i--) {
      var key = addDays(today, -i);
      var rowsDay = c.news.filter(function (r) { return r.day === key; });
      var retakesDay = c.repeats.filter(function (r) { return r.day === key; }).length;
      var mockDay = (mocks[key] || []).length;
      days.push({
        date: key,
        newQuestions: rowsDay.length,
        paceSec: medianSec(msOf(rowsDay)),
        retakes: retakesDay,
        mocks: mockDay,
        workBand: workBand(key, lastTargetDay, retakesDay, mockDay > 0)
      });
    }

    return {
      date: today,
      newQuestions: {
        value: newToday.length, threshold: null, band: null,
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
        value: repMin, threshold: null, band: null,
        unit: 'minutes', window: 'today', n: repToday.length
      },
      dailyWork: {
        value: repToday.length, threshold: workTarget ? T.dailyWork.green : null,
        band: workBand(today, lastTargetDay, repToday.length, mocksToday.length > 0),
        unit: 'mistake-book retakes', window: 'today',
        retakes: repToday.length, mocks: mocksToday,
        lastTargetDay: lastTargetDay, examDate: examDate
      },
      topics: topics,
      days: days
    };
  }

  /* ——— Review: the words around one readout ———
     review(d, ctx) turns a compute() result into what the dashboard card
     says about it: for each reading its target in words, a meter, a hint,
     an action and the numbers behind it; then the order the readings need
     attention in, one headline and one next action. It reads d and ctx
     only and never changes a value or a band, so compute() stays the one
     source the three surfaces and the status payload share.

     ctx (every field optional; the view looks them up):
       hasHistory     false when the log holds no answered question
       unseen         untried questions left in the default practice pool
       unseenByTopic  topic id -> untried questions in that pool

     New questions and Repeat time have no target: row.band is null and
     row.show (what the chip displays) is 'rest'. Daily work after its last
     target day is shown the same way. A 'rest' row never needs attention. */
  var WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  /* When several readings are off, the first one here leads the headline. */
  var ATTENTION_ORDER = ['dailyWork', 'firstAttemptAccuracy', 'paceSec'];
  /* Review-only numbers; no band reads them. */
  var REVIEW = {
    meterHeadroom: 1.25     // a meter runs to 1.25x its target, or to the value when that is larger
  };

  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }

  function shortDay(key) {
    return parseDay(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function clampPct(x) { return Math.max(0, Math.min(100, Math.round(x * 10) / 10)); }

  /* Fill and target mark as percentages of one scale. */
  function meterOf(value, target, lowIsGood) {
    var v = value == null ? 0 : Math.max(0, value);
    var hasTarget = target != null && target > 0;
    var max = Math.max(hasTarget ? target * REVIEW.meterHeadroom : 0, v, 1e-9);
    return {
      pct: clampPct(100 * v / max),
      mark: hasTarget ? clampPct(100 * target / max) : null,
      lowIsGood: !!lowIsGood,
      empty: value == null
    };
  }

  /* A reading without a target draws no fill: there is nothing to fill toward. */
  function bareMeter() { return { pct: 0, mark: null, lowIsGood: false, empty: true }; }

  function mistakesAction() { return { kind: 'link', href: '#/mistakes', label: 'Open Mistake book' }; }
  function mockAction() { return { kind: 'link', href: '#/exam', label: 'Open Mock exam' }; }

  function review(d, ctx) {
    ctx = ctx || {};
    var T = THRESHOLDS;
    var nq = d.newQuestions, pace = d.paceSec, acc = d.firstAttemptAccuracy,
        rep = d.repeatMinutes, work = d.dailyWork;
    var weekday = parseDay(d.date).getDay();
    var mockDay = weekday === MOCK_WEEKDAY;
    var unseen = typeof ctx.unseen === 'number' ? ctx.unseen : null;
    var news7 = acc.n;
    var accOff = acc.band === 'amber' || acc.band === 'red';
    var historyAction = { kind: 'link', href: '#/history', label: 'Open History' };
    var off = function (b) { return b === 'amber' || b === 'red'; };

    // ——— Daily work ———
    var mocked = work.mocks.length > 0;
    var hasTarget = work.threshold != null;
    var workGap = hasTarget ? Math.max(0, work.threshold - work.value) : 0;
    var lastDay = shortDay(work.lastTargetDay);
    var targetSpan = T.lastTargetLeadDays + ' days before the exam on ' + shortDay(work.examDate);
    var workRow = {
      key: 'dailyWork', label: 'Daily work', window: 'today · mistake-book retakes, or a full mock',
      value: String(work.value), unit: '',
      target: !hasTarget ? 'no target today' : (mocked ? 'full mock submitted' : 'of ' + work.threshold),
      band: work.band, show: work.band || 'rest', chip: work.band ? LABELS[work.band] : 'No target',
      // A submitted mock meets the target, so its meter reads full.
      meter: !hasTarget ? bareMeter()
        : meterOf(mocked ? Math.max(work.value, work.threshold) : work.value, work.threshold, false),
      hint: '', advice: '', action: null,
      how: [
        'Counts your answers in the mistake book today' +
          (work.retakes ? ' (' + plural(work.retakes, 'retake') + ')' : '') +
          '. A full mock submitted today meets the target on its own' +
          (mocked ? ': ' + plural(work.mocks.length, 'mock') + ' submitted today.' : '.'),
        'New material comes from the Sunday full mocks; the other days go to the mistake book.',
        hasTarget
          ? 'The target of ' + work.threshold + ' a day runs through ' + lastDay + ', ' + targetSpan + '.'
          : 'The daily target ended on ' + lastDay + ', ' + targetSpan + '.'
      ],
      cuts: [
        { band: 'green', text: T.dailyWork.green + ' or more, or a full mock' },
        { band: 'amber', text: T.dailyWork.amber + ' to ' + (T.dailyWork.green - 1) },
        { band: 'red', text: 'under ' + T.dailyWork.amber }
      ],
      links: [mistakesAction(), mockAction()]
    };
    var workNeed = 'Answer ' + plural(workGap, 'more mistake-book question') + ' to reach ' + work.threshold + '.';
    if (off(work.band)) {
      // advice follows a headline that already gives the count
      workRow.advice = mockDay
        ? 'Today is the full-mock day: a submitted mock meets the target on its own.'
        : 'A full mock submitted today also meets the target.';
      workRow.hint = workNeed + ' ' + workRow.advice;
      workRow.action = mockDay ? mockAction() : mistakesAction();
    } else if (!hasTarget) {
      workRow.hint = 'The daily target ended on ' + lastDay + '.';
    }

    // ——— New questions (no target) ———
    var nqRow = {
      key: 'newQuestions', label: 'New questions', window: 'today',
      value: String(nq.value), unit: '', target: 'no target',
      band: null, show: 'rest', chip: 'No target',
      meter: bareMeter(),
      hint: '', advice: '', action: null,
      how: [
        'Counts your first try at a question when you answer it in practice: a timed pack, mixed practice ' +
          'or a topic set. Mistake-book retakes, the question of the day and mock exams do not count, and a ' +
          'question you first answered in one of those does not count later.',
        'No daily target: new material comes from the Sunday full mocks.',
        'Last 7 days: ' + plural(news7, 'new question') + '.'
      ],
      cuts: [],
      links: []
    };
    if (unseen) nqRow.links.push({ kind: 'link', href: '#/practice/all/new', label: 'Practice untried questions' });

    // ——— Pace ———
    var paceRow = {
      key: 'paceSec', label: 'Pace', window: 'today · median per new question',
      value: pace.value == null ? '—' : String(pace.value), unit: pace.value == null ? '' : ' s',
      target: 'target ' + pace.threshold + ' s or under',
      band: pace.band, show: pace.band || 'none', chip: pace.band ? LABELS[pace.band] : 'No data',
      meter: meterOf(pace.value, pace.threshold, true),
      hint: '', advice: '', action: null,
      how: [
        'The median time of today\'s new questions' +
          (pace.n ? ' (' + pace.n + ' timed)' : '') + '. The median is the middle value, so one very ' +
          'long question changes it little.',
        'The target of ' + pace.threshold + ' s a question is the exam pace' +
          // 120 min / 70 questions = 102.9 s (the '70x120' format in js/exam-engine.js)
          (pace.threshold === 103 ? ': 70 questions in 120 minutes.' : '.')
      ],
      cuts: [
        { band: 'green', text: pace.threshold + ' s or under' },
        { band: 'amber', text: (pace.threshold + 1) + ' to ' + T.paceSec.amber + ' s' },
        { band: 'red', text: 'over ' + T.paceSec.amber + ' s' }
      ],
      links: [{ kind: 'link', href: '#/analytics', label: 'Open Analytics' }]
    };
    if (pace.value == null) {
      // A count without timings is not "no questions": say which one it is.
      if (nq.value > 0) {
        paceRow.hint = 'Today\'s ' + plural(nq.value, 'new question') + ' ' +
          (nq.value === 1 ? 'has' : 'have') + ' no recorded time, so there is no median.';
      }
    } else if (off(pace.band)) {
      paceRow.advice = 'When a question passes ' + pace.threshold + ' s, pick your best guess and move on.';
      paceRow.hint = (pace.value - pace.threshold) + ' s over the exam pace of ' + pace.threshold +
        ' s. ' + paceRow.advice;
    } else if (accOff && acc.value != null &&
               pace.threshold - pace.value >= T.paceSec.amber - T.paceSec.green) {
      paceRow.hint = (pace.threshold - pace.value) + ' s inside the exam pace, while first-try accuracy is ' +
        acc.value + '%. Use some of that time to check each answer.';
    }

    // ——— First-try accuracy ———
    var accFrom = addDays(d.date, -(T.accuracyDays - 1));
    var accRow = {
      key: 'firstAttemptAccuracy', label: 'First-try accuracy', window: 'last 7 days',
      value: acc.value == null ? '—' : String(acc.value), unit: acc.value == null ? '' : '%',
      target: 'target ' + acc.threshold + '% or more',
      band: acc.band, show: acc.band || 'none', chip: acc.band ? LABELS[acc.band] : 'No data',
      // Percent runs on a fixed 0-100 scale.
      meter: { pct: clampPct(acc.value == null ? 0 : acc.value), mark: acc.threshold,
               lowIsGood: false, empty: acc.value == null },
      hint: '', advice: '', action: null,
      how: [
        'The share of the new questions of the last 7 days (' + shortDay(accFrom) + ' to ' + shortDay(d.date) +
          ') that were right on the first try' + (acc.n ? ': ' + acc.correct + ' of ' + acc.n + '.' : '.')
      ],
      cuts: [
        { band: 'green', text: acc.threshold + '% or more' },
        { band: 'amber', text: T.accuracyPct.amber + ' to ' + (acc.threshold - 1) + '%' },
        { band: 'red', text: 'under ' + T.accuracyPct.amber + '%' }
      ],
      links: [historyAction]
    };
    if (acc.value == null) {
      accRow.hint = 'No new questions in the last 7 days.';
    } else if (accOff) {
      var readFirst = 'Read every solution of the last set before you start the next one.';
      accRow.advice = acc.correct + ' of ' + acc.n + ' new questions right on the first try; the target is ' +
        acc.threshold + '%. ' + readFirst;
      accRow.hint = 'Under ' + acc.threshold + '% on first tries: ' + acc.correct + ' of ' + acc.n + '. ' + readFirst;
      accRow.action = historyAction;
    }

    // ——— Repeat time (no target) ———
    var repRow = {
      key: 'repeatMinutes', label: 'Repeat time', window: 'today · mistake-book retakes',
      value: String(rep.value), unit: ' min', target: 'no limit',
      band: null, show: 'rest', chip: 'No target',
      meter: bareMeter(),
      hint: '', advice: '', action: null,
      how: [
        'The time of today\'s mistake-book retakes, added up' +
          (rep.n ? ' (' + plural(rep.n, 'retake') + ')' : '') + '.',
        'No limit: the daily target counts retakes, not minutes (see Daily work).'
      ],
      cuts: [],
      links: [mistakesAction()]
    };

    // The new-user list shows each reading's target with no value beside it.
    workRow.preview = T.dailyWork.green + ' mistake-book questions a day, or a full mock';
    nqRow.preview = nqRow.target;
    paceRow.preview = paceRow.target;
    accRow.preview = accRow.target;
    repRow.preview = repRow.target;

    var rows = [workRow, accRow, paceRow, repRow, nqRow];
    var byKey = {};
    rows.forEach(function (r) { byKey[r.key] = r; });
    var tally = { green: 0, amber: 0, red: 0, none: 0, rest: 0 };
    rows.forEach(function (r) { tally[r.show] = (tally[r.show] || 0) + 1; });

    // Readings that need attention: off target first, then close, each in
    // ATTENTION_ORDER.
    var attention = rows.filter(function (r) { return off(r.show); }).sort(function (a, b) {
      if (a.show !== b.show) return a.show === 'red' ? -1 : 1;
      return ATTENTION_ORDER.indexOf(a.key) - ATTENTION_ORDER.indexOf(b.key);
    });

    // ——— Headline and next action ———
    var verdict = { tone: 'good', headline: '', detail: '', action: null, mark: 'green' };
    var empty = ctx.hasHistory === false;
    var restLine = tally.none ? 'The readings with data are on target.' : 'The other readings are on target.';
    if (empty) {
      verdict.tone = 'empty';
      verdict.mark = 'none';
      verdict.headline = 'Nothing measured yet.';
      verdict.detail = 'Intensity reads your answers. After your first full mock or mistake-book session, ' +
        'these five readings fill in.';
      verdict.action = mockAction();
    } else if (attention.length) {
      var top = attention[0];
      verdict.tone = 'attention';
      verdict.mark = top.show;
      verdict.focus = top.key;
      if (top.key === 'dailyWork') {
        verdict.headline = work.value === 0 ? 'No mistake-book questions yet today.'
          : plural(workGap, 'mistake-book question') + ' to go today.';
      } else if (top.key === 'firstAttemptAccuracy') {
        verdict.headline = 'First-try accuracy is ' + acc.value + '% over the last 7 days.';
      } else {
        verdict.headline = 'Today\'s pace is ' + pace.value + ' s a question, ' +
          (pace.value - pace.threshold) + ' s over the exam pace.';
      }
      // The headline block says what the leading row's own hint would, so
      // that row prints no hint under it (row.lead).
      top.lead = true;
      verdict.action = top.action;
      var also = [];
      if (top.advice) also.push(top.advice);
      var others = attention.slice(1);
      var reds = others.filter(function (r) { return r.show === 'red'; }).map(function (r) { return r.label; });
      var ambers = others.filter(function (r) { return r.show === 'amber'; }).map(function (r) { return r.label; });
      if (reds.length) also.push('Also off target: ' + reds.join(', ') + '.');
      if (ambers.length) also.push('Also close: ' + ambers.join(', ') + '.');
      verdict.detail = also.join(' ');
    } else if (!hasTarget) {
      verdict.tone = 'rest';
      verdict.mark = 'none';
      workRow.lead = true;
      verdict.headline = 'No daily target today.';
      verdict.detail = 'The daily target ended on ' + lastDay + ', ' + targetSpan + '. ' + restLine;
    } else {
      verdict.headline = mocked ? 'Full mock submitted today.'
        : 'Daily work done: ' + plural(work.value, 'mistake-book question') + '.';
      verdict.detail = restLine;
    }
    // A row does not repeat the headline's own button.
    rows.forEach(function (r) {
      if (r.action && verdict.action && r.action.href === verdict.action.href) r.action = null;
    });

    // ——— Day strip ———
    var days = d.days.map(function (day, i) {
      var date = parseDay(day.date);
      return {
        date: day.date,
        isToday: i === d.days.length - 1,
        weekday: date.getDay(),
        short: date.toLocaleDateString('en-US', { weekday: 'short' }),
        full: date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
        retakes: day.retakes,
        mocks: day.mocks,
        workBand: day.workBand,
        target: day.date <= work.lastTargetDay ? T.dailyWork.green : null,
        newQuestions: day.newQuestions,
        paceSec: day.paceSec,
        paceBand: bandLow(day.paceSec, T.paceSec)
      };
    });

    // ——— Topic to work on: the first judged topic that is not on target ———
    var judged = d.topics.filter(function (t) { return t.judged; });
    var weak = judged.filter(function (t) { return t.band !== 'green'; })[0] || null;
    var topic = null;
    if (weak) {
      var fresh = ctx.unseenByTopic ? (ctx.unseenByTopic[weak.topic] || 0) : null;
      topic = {
        topic: weak.topic, name: weak.name, short: weak.short, band: weak.band,
        accuracy: weak.accuracy, newQuestions: weak.newQuestions, weight: weak.weight,
        text: weak.accuracy + '% on ' + plural(weak.newQuestions, 'new question') + ' in ' + T.topicDays +
          ' days, ' + weak.weight + '% of the exam.',
        action: fresh
          ? { kind: 'link', href: '#/practice/' + weak.topic + '/new',
              label: 'Practice ' + plural(fresh, 'untried question') }
          : { kind: 'link', href: '#/topic/' + weak.topic, label: 'Open the topic' }
      };
    }

    return {
      date: d.date,
      empty: empty,
      weekday: weekday,
      mockDay: mockDay,
      rows: rows,
      row: byKey,
      tally: tally,
      attention: attention.map(function (r) { return r.key; }),
      verdict: verdict,
      days: days,
      topic: topic,
      judgedTopics: judged.length
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
    MOCK_WEEKDAY: MOCK_WEEKDAY,
    THRESHOLDS: THRESHOLDS,
    LABELS: LABELS,
    compute: compute,
    trendDays: trendDaysOf,
    review: review,
    band: band,
    medianSec: medianSec,
    sessionMedianSec: sessionMedianSec,
    chipHTML: chipHTML
  };
}());
