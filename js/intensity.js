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
     minus 3 days. A working day is a day whose local weekday is not in
     NO_PACK_WEEKDAYS (Sunday and Thursday). workingDaysLeft = the working
     days from today through lastPackDay inclusive. required = remaining /
     workingDaysLeft. actual = new questions in the last 7 days (any
     weekday) / the working days among those 7. Both to one decimal.
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

  /* Local weekdays with no timed pack (0 = Sunday ... 6 = Saturday):
     Sunday is the full-sitting day, Thursday the weekly group discussion.
     Coverage counts every other weekday as a working day. */
  var NO_PACK_WEEKDAYS = Object.freeze([0, 4]);

  /* Every other tunable number lives here. */
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

  function isWorkingDay(key) { return NO_PACK_WEEKDAYS.indexOf(parseDay(key).getDay()) < 0; }

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
      if (isWorkingDay(d)) workingDaysLeft++;
    }
    var required = remaining === 0 ? 0
      : (workingDaysLeft > 0 ? round1(remaining / workingDaysLeft) : null);
    var coverNews = c.news.filter(inLast(T.coverageDays)).length;
    var coverWorking = 0;
    for (var k = 0; k < T.coverageDays; k++) {
      if (isWorkingDay(addDays(today, -k))) coverWorking++;
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
        workingDays7: coverWorking, noPackWeekdays: NO_PACK_WEEKDAYS.slice(),
        required: required, actual: actual,
        lastPackDay: lastPackDay, examDate: examDate,
        packQuestions: packIds.length
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
       nextPack       { id, title, n, fresh }: the next timed pack that
                      still has untried questions, fresh = how many
       unseen         untried questions left in the default practice pool
       unseenByTopic  topic id -> untried questions in that pool

     Two display rules, both for New questions below its target. On a
     weekday in NO_PACK_WEEKDAYS the chip reads "No pack today", because no
     timed pack is planned on that day. When ctx.unseen is 0 it reads
     "None left", because no first try is left to make. In both cases
     row.band keeps the computed band and row.show (what the chip displays)
     is 'rest'; such a row is not counted as needing attention. */
  var NO_PACK_REASON = { 0: 'the full-sitting day', 4: 'the group discussion day' };
  var WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  /* When several readings are off, the first one here leads the headline:
     stop repeating, then add new questions, then the two quality readings. */
  var ATTENTION_ORDER = ['repeatMinutes', 'newQuestions', 'coverage', 'firstAttemptAccuracy', 'paceSec'];
  /* Review-only numbers; no band reads them. */
  var REVIEW = {
    heavyDayFactor: 2,      // today's new questions at 2x the target or more, with accuracy off: say so
    meterHeadroom: 1.25     // a meter runs to 1.25x its target, or to the value when that is larger
  };

  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }

  function shortDay(key) {
    return parseDay(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function listWords(words) {
    if (words.length < 2) return words.join('');
    return words.slice(0, -1).join(', ') + ' or ' + words[words.length - 1];
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

  function packAction(pack) {
    if (!pack || !pack.id) return null;
    return { kind: 'pack', pack: pack.id, href: '#/practice/pack/' + pack.id, label: 'Start Set ' + pack.id };
  }

  function packName(pack) { return 'Set ' + pack.id + (pack.title ? ' · ' + pack.title : ''); }

  /* The date of the n-th working day counting from `from` (inclusive). */
  function nthWorkingDay(from, n) {
    var key = from;
    var left = n;
    for (var guard = 0; guard < 800; guard++) {
      if (isWorkingDay(key)) { left--; if (left <= 0) return key; }
      key = addDays(key, 1);
    }
    return null;
  }

  /* How long the untried pack questions take at the 7-day rate. A green
     band never reads as late: required is rounded for display, so the
     whole-day count is capped at the days left when the band is green. */
  function coverageProjection(d) {
    var cov = d.coverage;
    if (!cov.remaining || !(cov.actual > 0)) return null;
    var days = Math.ceil(cov.remaining / cov.actual - 1e-9);
    if (cov.band === 'green' && days > cov.workingDaysLeft) days = cov.workingDaysLeft;
    return {
      workingDays: days,
      finishDay: days > 0 && days <= 400 ? nthWorkingDay(d.date, days) : null,
      spare: cov.workingDaysLeft - days
    };
  }

  function review(d, ctx) {
    ctx = ctx || {};
    var T = THRESHOLDS;
    var nq = d.newQuestions, pace = d.paceSec, acc = d.firstAttemptAccuracy,
        rep = d.repeatMinutes, cov = d.coverage;
    var weekday = parseDay(d.date).getDay();
    var noPack = cov.noPackWeekdays || NO_PACK_WEEKDAYS;
    var workingDay = noPack.indexOf(weekday) < 0;
    var pack = ctx.nextPack && ctx.nextPack.id ? ctx.nextPack : null;
    // A reading that is behind never asks for a timed pack on a no-pack weekday.
    var packNow = workingDay ? pack : null;
    var unseen = typeof ctx.unseen === 'number' ? ctx.unseen : null;
    // The 7-day strip and the coverage window are the same days while both are 7.
    var news7 = T.trendDays === T.coverageDays
      ? d.days.reduce(function (sum, day) { return sum + day.newQuestions; }, 0)
      : Math.round(cov.actual * cov.workingDays7);
    var accOff = acc.band === 'amber' || acc.band === 'red';
    var noPackNames = listWords(noPack.map(function (n) { return WEEKDAY_NAMES[n] + 's'; }));
    var historyAction = { kind: 'link', href: '#/history', label: 'Open History' };
    var off = function (b) { return b === 'amber' || b === 'red'; };
    var packLine = pack ? packName(pack) + ' has ' + pack.fresh + ' you have not tried.' : '';
    var nqNeed = '';
    var nqGap = nq.threshold - nq.value;
    // Fewer untried questions than the gap to the target: say that first.
    var nqScarce = unseen != null && unseen > 0 && unseen < nqGap;
    var onlyLeft = 'Only ' + plural(unseen || 0, 'untried question') + (unseen === 1 ? ' is' : ' are') +
      ' left in the practice pool';

    // ——— New questions ———
    var nqRest = !workingDay && nq.band !== 'green';
    var nqDone = !nqRest && unseen === 0 && nq.band !== 'green';
    var nqRow = {
      key: 'newQuestions', label: 'New questions', window: 'today',
      value: String(nq.value), unit: '',
      target: nqRest ? 'no target today' : (nqDone ? 'none left to try' : 'of ' + nq.threshold),
      band: nq.band, show: nqRest || nqDone ? 'rest' : nq.band,
      chip: nqRest ? 'No pack today' : (nqDone ? 'None left' : LABELS[nq.band]),
      meter: meterOf(nq.value, nq.threshold, false),
      hint: '', advice: '', action: null,
      how: [
        'Counts your first try at a question when you answer it in practice: a timed pack, mixed practice ' +
          'or a topic set. Mistake-book retakes, the question of the day and mock exams do not count, and a ' +
          'question you first answered in one of those does not count later.',
        'Last 7 days: ' + plural(news7, 'new question') + '.'
      ],
      cuts: [
        { band: 'green', text: nq.threshold + ' or more' },
        { band: 'amber', text: T.newQuestions.amber + ' to ' + (nq.threshold - 1) },
        { band: 'red', text: 'under ' + T.newQuestions.amber }
      ],
      links: []
    };
    // Same scale as on a pack day, without the target tick.
    if (nqRest || nqDone) nqRow.meter.mark = null;
    if (nqRest) {
      nqRow.hint = 'No timed pack is planned on ' + WEEKDAY_NAMES[weekday] + 's' +
        (NO_PACK_REASON[weekday] ? ' (' + NO_PACK_REASON[weekday] + ')' : '') +
        '. The target of ' + nq.threshold + ' applies on pack days.';
    } else if (nqDone) {
      nqRow.hint = 'Every question in the practice pool has had a first try. With none left to try, the ' +
        'target of ' + nq.threshold + ' is not applied.';
    } else if (off(nq.band)) {
      nqNeed = nqScarce
        ? onlyLeft + '; reaching ' + nq.threshold + ' needs ' + nqGap + '.'
        : 'Answer ' + plural(nqGap, 'more new question') + ' to reach ' + nq.threshold + '.';
      var nqWhere;
      if (pack) {
        nqWhere = packLine;
        nqRow.action = packAction(pack);
      } else {
        nqWhere = unseen && !nqScarce ? plural(unseen, 'untried question') + (unseen === 1 ? ' is' : ' are') +
          ' in the practice pool.' : '';
        nqRow.action = { kind: 'link', href: unseen ? '#/practice/all/new' : '#/practice/all',
          label: unseen ? 'Practice untried questions' : 'Start mixed practice' };
      }
      // advice follows a headline that already gives the count
      nqRow.advice = (nqScarce ? 'Reaching ' + nq.threshold + ' today needs ' + nqGap + '.' : '') +
        (nqScarce && nqWhere ? ' ' : '') + nqWhere;
      nqRow.hint = nqNeed + (nqWhere ? ' ' + nqWhere : '');
    } else if (nq.value >= REVIEW.heavyDayFactor * nq.threshold && accOff && acc.value != null) {
      // A note, not a call to action: the accuracy row carries the link.
      nqRow.hint = 'At least twice the target today, while first-try accuracy is ' + acc.value +
        '%. Read the solutions of today\'s sets before you start another.';
    }
    if (packNow) nqRow.links.push(packAction(packNow));
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

    // ——— Repeat time ———
    var repRow = {
      key: 'repeatMinutes', label: 'Repeat time', window: 'today · mistake-book retakes',
      value: String(rep.value), unit: ' min', target: 'limit ' + rep.threshold + ' min',
      band: rep.band, show: rep.band, chip: LABELS[rep.band],
      meter: meterOf(rep.value, rep.threshold, true),
      hint: '', advice: '', action: null,
      how: [
        'The time of today\'s mistake-book retakes, added up' +
          (rep.n ? ' (' + plural(rep.n, 'retake') + ')' : '') + '. The limit keeps retakes from taking ' +
          'the time of new questions.'
      ],
      cuts: [
        { band: 'green', text: rep.threshold + ' min or under' },
        { band: 'amber', text: (rep.threshold + 1) + ' to ' + T.repeatMin.amber + ' min' },
        { band: 'red', text: 'over ' + T.repeatMin.amber + ' min' }
      ],
      links: [{ kind: 'link', href: '#/mistakes', label: 'Open Mistake book' }]
    };
    if (off(rep.band)) {
      // New questions already at their target (or none left to try): the
      // advice is to stop, not to add more.
      var enoughNew = nq.band === 'green' || nqDone || nqRest;
      repRow.advice = enoughNew ? 'Leave the remaining retakes for another day.'
        : 'Spend the rest of today on new questions.';
      repRow.hint = (rep.value - rep.threshold) + ' min over the limit of ' + rep.threshold + '. ' + repRow.advice;
      repRow.action = enoughNew ? null : packAction(pack);
    }

    // ——— Coverage ———
    var proj = coverageProjection(d);
    var lastPack = shortDay(cov.lastPackDay);
    // Pack questions left and no working day to try them in: there is no
    // rate to draw against, so the bar stays empty instead of reading as full.
    var covStuck = cov.remaining > 0 && cov.required == null;
    var covRow = {
      key: 'coverage', label: 'Coverage', window: 'last 7 days · new questions per working day',
      value: cov.actual.toFixed(1), unit: ' a day',
      target: cov.remaining === 0 ? 'every pack question tried'
        : (cov.required == null ? 'no working day left' : 'needed: ' + cov.required.toFixed(1)),
      band: cov.band, show: cov.band, chip: LABELS[cov.band],
      meter: meterOf(covStuck ? 0 : cov.actual, cov.remaining === 0 ? null : cov.required, false),
      hint: '', advice: '', action: null, how: [],
      cuts: [
        { band: 'green', text: 'at or above the needed rate' },
        { band: 'amber', text: 'up to ' + T.coverageSlack + ' below it' },
        { band: 'red', text: 'more than ' + T.coverageSlack + ' below it' }
      ],
      links: [{ kind: 'link', href: '#/plan', label: 'Open Study plan' }]
    };
    if (packNow) covRow.links.unshift(packAction(packNow));
    var rateLine = 'Last 7 days: ' + plural(news7, 'new question') + ' over ' +
      plural(cov.workingDays7, 'working day') + ' = ' + cov.actual.toFixed(1) + ' a day.';
    if (cov.remaining === 0) {
      covRow.how.push('Every one of the ' + cov.packQuestions + ' pack questions has had a first try.');
      covRow.how.push(rateLine);
    } else {
      covRow.how.push(cov.remaining + ' of ' + cov.packQuestions + ' pack questions have no first try yet.');
      covRow.how.push(plural(cov.workingDaysLeft, 'working day') + (cov.workingDaysLeft === 1 ? ' is' : ' are') +
        ' left through ' + lastPack + ', the pack cutoff date (' + T.lastPackLeadDays +
        ' days before the exam on ' + shortDay(cov.examDate) + ')' +
        (noPackNames ? ', with no timed pack on ' + noPackNames : '') + '.');
      if (cov.required != null) {
        covRow.how.push('Needed: ' + cov.remaining + ' / ' + cov.workingDaysLeft + ' = ' +
          cov.required.toFixed(1) + ' new questions each working day.');
      }
      covRow.how.push(rateLine);
      // Off target, the hint (or the headline) already gives this projection.
      if (proj && cov.required != null && !off(cov.band)) {
        covRow.how.push('At that rate the rest takes about ' + plural(proj.workingDays, 'working day') +
          (proj.spare >= 0 && proj.finishDay
            ? ', done around ' + shortDay(proj.finishDay) + ': ' + plural(proj.spare, 'working day') + ' to spare.'
            : '; ' + cov.workingDaysLeft + (cov.workingDaysLeft === 1 ? ' is' : ' are') + ' left.'));
      }
    }
    if (off(cov.band)) {
      if (cov.required == null) {
        covRow.hint = 'No working day is left through ' + lastPack + ', the pack cutoff date, with ' +
          plural(cov.remaining, 'pack question') + ' not started.';
        covRow.action = { kind: 'link', href: '#/plan', label: 'Open Study plan' };
      } else {
        // advice follows a headline that already names the date and the gap
        var slow = proj
          ? 'At ' + cov.actual.toFixed(1) + ' a working day, the ' + plural(cov.remaining, 'pack question') +
            ' left take about ' + plural(proj.workingDays, 'working day') + '; ' + cov.workingDaysLeft +
            (cov.workingDaysLeft === 1 ? ' is' : ' are') + ' left'
          : 'No new questions in the last 7 days, with ' + plural(cov.remaining, 'pack question') + ' left';
        covRow.advice = slow + '.';
        covRow.hint = slow + (proj ? ' through ' + lastPack : '') + '. Finishing by ' + lastPack + ' needs ' +
          cov.required.toFixed(1) + ' each working day.';
        covRow.action = packAction(packNow) || { kind: 'link', href: '#/plan', label: 'Open Study plan' };
      }
    }

    // The new-user list shows each reading's target with no value beside it.
    nqRow.preview = 'target ' + nq.threshold + ' a day';
    paceRow.preview = paceRow.target;
    accRow.preview = accRow.target;
    repRow.preview = repRow.target;
    covRow.preview = cov.remaining === 0 || cov.required == null ? covRow.target
      : plural(cov.remaining, 'pack question') + ' by ' + lastPack + ': ' + cov.required.toFixed(1) +
        ' each working day';

    var rows = [nqRow, paceRow, accRow, repRow, covRow];
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
    if (empty) {
      verdict.tone = 'empty';
      verdict.mark = 'none';
      verdict.headline = 'Nothing measured yet.';
      verdict.detail = 'Intensity reads your answers. After your first practice set, these five readings ' +
        'fill in.';
      verdict.action = packAction(pack) || { kind: 'link', href: '#/practice/all', label: 'Start mixed practice' };
      if (pack) verdict.detail += ' ' + packName(pack) + ' is the next timed pack in your plan.';
    } else if (attention.length) {
      var top = attention[0];
      verdict.tone = 'attention';
      verdict.mark = top.show;
      verdict.focus = top.key;
      if (top.key === 'newQuestions') {
        verdict.headline = nqScarce ? onlyLeft + '.'
          : (nq.value === 0 ? 'No new questions yet today.' : plural(nqGap, 'new question') + ' to go today.');
      } else if (top.key === 'repeatMinutes') {
        verdict.headline = rep.value + ' min of retakes today, ' + (rep.value - rep.threshold) +
          ' over the limit.';
      } else if (top.key === 'coverage') {
        verdict.headline = cov.required == null
          ? 'No working day is left through ' + lastPack + ', with ' + plural(cov.remaining, 'pack question') +
            ' not started.'
          : 'Coverage is ' + round1(cov.required - cov.actual).toFixed(1) + ' a day under the rate that ' +
            'finishes the packs by ' + lastPack + '.';
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
      if (verdict.action && verdict.action.kind === 'pack' && pack && top.advice.indexOf(packLine) < 0) {
        also.push(packLine);
      }
      var others = attention.slice(1);
      var reds = others.filter(function (r) { return r.show === 'red'; }).map(function (r) { return r.label; });
      var ambers = others.filter(function (r) { return r.show === 'amber'; }).map(function (r) { return r.label; });
      if (reds.length) also.push('Also off target: ' + reds.join(', ') + '.');
      if (ambers.length) also.push('Also close: ' + ambers.join(', ') + '.');
      verdict.detail = also.join(' ');
    } else if (nqRest) {
      verdict.tone = 'rest';
      verdict.mark = 'none';
      nqRow.lead = true;
      verdict.headline = 'No timed pack today.';
      verdict.detail = WEEKDAY_NAMES[weekday] + ' is ' + (NO_PACK_REASON[weekday] || 'a no-pack day') +
        ', so the target of ' + nq.threshold + ' new questions applies on pack days only. ' +
        (tally.none ? 'The readings with data are on target.' : 'The other readings are on target.');
      if (weekday === 0) verdict.action = { kind: 'link', href: '#/exam', label: 'Open Mock exam' };
    } else if (nqDone) {
      verdict.tone = 'rest';
      verdict.mark = 'none';
      nqRow.lead = true;
      verdict.headline = 'No untried practice question is left.';
      verdict.detail = 'With none left to try, the target of ' + nq.threshold +
        ' new questions is not applied. ' +
        (tally.none ? 'The readings with data are on target.' : 'The other readings are on target.');
    } else {
      verdict.headline = tally.none
        ? 'On target on the ' + plural(tally.green, 'reading') + ' with data.'
        : 'On target on all five readings.';
      if (pack) {
        verdict.detail = 'Next when you want it: ' + packName(pack) + ', ' +
          plural(pack.fresh, 'untried question') + '.';
        verdict.action = packAction(pack);
      } else if (unseen === 0) {
        verdict.detail = 'Every question in the practice pool has had a first try.';
      }
    }
    // A row does not repeat the headline's own button, nor the pack the
    // headline block has just named.
    rows.forEach(function (r) {
      if (r.action && verdict.action && r.action.href === verdict.action.href) r.action = null;
    });
    if (!nqRow.lead && nqNeed && pack && verdict.detail.indexOf(packLine) >= 0) nqRow.hint = nqNeed;

    // ——— Seven days ———
    var days = d.days.map(function (day, i) {
      var date = parseDay(day.date);
      var wd = date.getDay();
      return {
        date: day.date,
        isToday: i === d.days.length - 1,
        weekday: wd,
        workingDay: noPack.indexOf(wd) < 0,
        short: date.toLocaleDateString('en-US', { weekday: 'short' }),
        full: date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
        newQuestions: day.newQuestions,
        newBand: bandHigh(day.newQuestions, T.newQuestions),
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
      workingDay: workingDay,
      rows: rows,
      row: byKey,
      tally: tally,
      attention: attention.map(function (r) { return r.key; }),
      verdict: verdict,
      projection: proj,
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
    NO_PACK_WEEKDAYS: NO_PACK_WEEKDAYS,
    THRESHOLDS: THRESHOLDS,
    LABELS: LABELS,
    compute: compute,
    review: review,
    band: band,
    medianSec: medianSec,
    sessionMedianSec: sessionMedianSec,
    chipHTML: chipHTML
  };
}());
