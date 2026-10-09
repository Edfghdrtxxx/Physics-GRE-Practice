/* Read-only agent status summary and best-effort localhost publishing.
   `intensity` is PGRE.intensity.compute() (js/intensity.js): the five banded
   metrics, the coverage inputs, the per-topic rows and the 7-day trend. */
window.PGRE = window.PGRE || {};

(function () {
  'use strict';

  var ENDPOINT = 'http://127.0.0.1:4789/pgre-status';
  var PUSH_INTERVAL_MS = 30000;
  var MAX_BODY_CHARS = 300000; // worst case 3 UTF-8 bytes per char stays under the bridge's 1 MiB
  var lastPushAt = 0;
  var pendingPush = null;

  function nonNegative(value) {
    return (typeof value === 'number' && isFinite(value)) ? Math.max(0, value) : 0;
  }

  function localDay(value) {
    var d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return null;
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function compact(source, fields) {
    var out = {};
    fields.forEach(function (field) {
      if (source[field] !== undefined && source[field] !== null) out[field] = source[field];
    });
    return out;
  }

  /* Counts every deck card exactly once: suspended first, then unseen
     (no card record), due (record due by today), scheduled (record due
     later or without a usable due). The static pools mirror
     PGRE.formulaDeck()'s committed sources (js/store.js); the IndexedDB
     deck can't be awaited from this sync summary, so records whose ids
     are in no listed pool land in `orphaned` instead. */
  function formulaCardCounts(state, date) {
    var cards = state.cards || {};
    var suspended = state.formulaSuspended || {};
    var seen = {};
    var counts = { total: 0, unseen: 0, due: 0, scheduled: 0, suspended: 0, orphaned: 0 };
    var deck = (PGRE.BOOK_FORMULAS || [])
      .concat(PGRE.FORMULAS || [], PGRE.BOOK_LISTS || []);

    deck.forEach(function (card) {
      if (!card || !card.id || seen[card.id]) return;
      seen[card.id] = true;
      counts.total++;
      if (suspended[card.id]) { counts.suspended++; return; }
      var cardState = cards[card.id];
      if (!cardState) counts.unseen++;
      else if (cardState.due && cardState.due <= date) counts.due++;
      else counts.scheduled++;
    });

    Object.keys(cards).forEach(function (id) {
      if (seen[id]) return;
      counts.orphaned++;
    });
    return counts;
  }

  /* Today's attempt rows (state.attempts), one object per answered question,
     oldest first. `picked` and `answer` are 0-based choice indexes (`picked`
     null = blank); `tags` are the self-assessment chips: knew-it / guessed
     (row.confidence), too-slow / forgot-something (row.tags), keep-failing
     (the question's current mistake-book flag, which is not stored per
     attempt). Prompt and choices go into `texts` once per qid, and only for
     the default practice pool: intact exam questions stay qid-only (spoiler
     rule, AGENTS.md → Content Rules). */
  function attemptResults(state, date, texts) {
    var mistakes = state.mistakes || {};
    var pool = {};
    if (typeof PGRE.allQuestions === 'function') {
      (PGRE.allQuestions() || []).forEach(function (q) { if (q && q.id) pool[q.id] = q; });
    }
    return (Array.isArray(state.attempts) ? state.attempts : [])
      .filter(function (row) { return row && row.qid && localDay(row.ts) === date; })
      .map(function (row) {
        var q = pool[row.qid] ||
          (typeof PGRE.questionById === 'function' ? PGRE.questionById(row.qid) : null) || {};
        var tags = [];
        if (row.confidence === 'sure') tags.push('knew-it');
        if (row.confidence === 'guess') tags.push('guessed');
        (Array.isArray(row.tags) ? row.tags : []).forEach(function (tag) {
          if (tag === 'slow') tags.push('too-slow');
          else if (tag === 'forgot') tags.push('forgot-something');
        });
        if (mistakes[row.qid] && mistakes[row.qid].stuck) tags.push('keep-failing');
        var isExam = q.src === 'ets-exam' || q.src === 'cpg-exam';
        if (pool[row.qid] && !isExam && !texts[row.qid]) {
          texts[row.qid] = {
            prompt: typeof q.q === 'string' ? q.q : '',
            choices: Array.isArray(q.choices) ? q.choices.slice() : []
          };
        }
        return {
          ts: row.ts,
          sessionId: row.sid || null,
          mode: row.mode || null,
          qid: row.qid,
          topic: row.topic || q.topic || null,
          subtopic: q.subtopic || null,
          src: q.src || null,
          correct: !!row.correct,
          picked: typeof row.picked === 'number' ? row.picked : null,
          answer: typeof row.answer === 'number' ? row.answer : null,
          seconds: typeof row.ms === 'number' ? Math.round(row.ms / 100) / 10 : null,
          tags: tags
        };
      });
  }

  /* Mistake book: open (not archived) and due counts, plus every entry whose
     record changed today (missed, solved, flagged, or rescheduled). */
  function mistakeBookSummary(state, date) {
    var mistakes = state.mistakes || {};
    var out = { active: 0, due: 0, today: [] };
    Object.keys(mistakes).forEach(function (qid) {
      var mk = mistakes[qid];
      if (!mk) return;
      var due = (mk.srs && mk.srs.due) || null;
      if (!mk.archivedAt) {
        out.active++;
        if (due && due <= date) out.due++;
      }
      var touched = ['firstMissedAt', 'lastMissedAt', 'lastSolvedAt', 'lastLuckyAt',
        'lastStuckAt', 'lastTouchedAt'].some(function (field) {
        return mk[field] && localDay(mk[field]) === date;
      });
      if (!touched) return;
      var q = (typeof PGRE.questionById === 'function' ? PGRE.questionById(qid) : null) || {};
      out.today.push({
        qid: qid,
        topic: q.topic || null,
        added: localDay(mk.firstMissedAt) === date,
        misses: nonNegative(mk.misses),
        solves: nonNegative(mk.solves),
        lastPick: typeof mk.lastPick === 'number' ? mk.lastPick : null,
        wrongPicks: Array.isArray(mk.wrongPicks) ? mk.wrongPicks.slice() : [],
        luckyGuess: !!mk.lucky,
        keepFailing: !!mk.stuck,
        due: due,
        archived: !!mk.archivedAt
      });
    });
    return out;
  }

  PGRE.buildStatusSummary = function () {
    var store = PGRE.store || {};
    var state = store.state || {};
    var date = (typeof store.today === 'function') ? store.today() : localDay(new Date());
    var todayState = (state.today && state.today.date === date) ? state.today : {};
    var studySeconds = nonNegative((state.studyLog || {})[date]);
    var settings = state.settings || {};
    var streak = state.streak || {};

    var sessions = (Array.isArray(state.sessions) ? state.sessions : [])
      .filter(function (session) {
        return session && session.endedAt && localDay(session.endedAt) === date;
      })
      .map(function (session) {
        return compact(session, [
          'id', 'mode', 'topicId', 'startedAt', 'endedAt', 'answered', 'correct'
        ]);
      });

    var exams = (Array.isArray(state.exams) ? state.exams : [])
      .filter(function (exam) {
        return exam && exam.submittedAt && localDay(exam.submittedAt) === date;
      })
      .map(function (exam) {
        return compact(exam, [
          'id', 'submittedAt', 'format', 'source', 'raw', 'total', 'scaledEst'
        ]);
      });

    var reviewed = (Array.isArray(state.cardReviews) ? state.cardReviews : [])
      .filter(function (review) { return review && review.d === date; }).length;

    var mistakesAdded = 0;
    var mistakes = state.mistakes || {};
    Object.keys(mistakes).forEach(function (id) {
      if (mistakes[id] && localDay(mistakes[id].firstMissedAt) === date) mistakesAdded++;
    });

    var recentLog = (Array.isArray(state.log) ? state.log : [])
      .filter(function (entry) { return entry && typeof entry.text === 'string'; })
      .slice(0, 10)
      .map(function (entry) { return entry.text; });

    var questionTexts = {};
    var attempts = attemptResults(state, date, questionTexts);

    return {
      date: date,
      streak: {
        current: nonNegative(typeof store.liveStreak === 'function' ? store.liveStreak() : streak.current),
        best: nonNegative(streak.best)
      },
      today: {
        answered: nonNegative(todayState.answered),
        correct: nonNegative(todayState.correct),
        minutesStudied: Math.round(studySeconds / 60),
        dailyTargetMin: nonNegative(settings.dailyTargetMin)
      },
      sessions: sessions,
      exams: exams,
      formulaCards: (function () {
        var counts = formulaCardCounts(state, date);
        counts.reviewed = reviewed;
        return counts;
      })(),
      mistakesAdded: mistakesAdded,
      recentLog: recentLog,
      attempts: attempts,
      questions: questionTexts,
      mistakeBook: mistakeBookSummary(state, date),
      // Banded study-intensity readout (js/intensity.js) — the same numbers
      // the dashboard Intensity card and the practice summary show.
      intensity: (PGRE.intensity && typeof PGRE.intensity.compute === 'function')
        ? PGRE.intensity.compute(state, { today: date })
        : null
    };
  };

  function postStatus() {
    lastPushAt = Date.now();
    if (!PGRE.store || !PGRE.store.state || typeof window.fetch !== 'function') {
      return Promise.resolve(false);
    }

    var body;
    try {
      var summary = PGRE.buildStatusSummary();
      body = JSON.stringify(summary);
      // The bridge rejects bodies over 1 MiB; question text is the only large
      // part, so drop it before the per-question results are lost with it.
      if (body.length > MAX_BODY_CHARS) {
        summary.questions = {};
        body = JSON.stringify(summary);
      }
    } catch (e) {
      return Promise.resolve(false);
    }

    try {
      return window.fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body
      }).then(function (response) {
        return !!(response && response.ok);
      }, function () {
        return false;
      });
    } catch (e) {
      return Promise.resolve(false);
    }
  }

  PGRE.pushStatus = function () {
    var wait = PUSH_INTERVAL_MS - (Date.now() - lastPushAt);
    if (wait <= 0) {
      if (pendingPush !== null) {
        clearTimeout(pendingPush);
        pendingPush = null;
      }
      return postStatus();
    }
    if (pendingPush === null) {
      pendingPush = setTimeout(function () {
        pendingPush = null;
        postStatus();
      }, wait);
    }
    return Promise.resolve(false);
  };

  window.addEventListener('DOMContentLoaded', function () {
    setTimeout(PGRE.pushStatus, 0);
    setInterval(PGRE.pushStatus, PUSH_INTERVAL_MS);
  });
}());
