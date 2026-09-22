/* Read-only agent status summary and best-effort localhost publishing. */
window.PGRE = window.PGRE || {};

(function () {
  'use strict';

  var ENDPOINT = 'http://127.0.0.1:4789/pgre-status';
  var PUSH_INTERVAL_MS = 30000;
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

  function formulaDueCount(state, date) {
    var cards = state.cards || {};
    var suspended = state.formulaSuspended || {};
    var seen = {};
    var due = 0;
    var deck = (PGRE.BOOK_FORMULAS || []).concat(PGRE.FORMULAS || []);

    deck.forEach(function (card) {
      if (!card || !card.id || seen[card.id]) return;
      seen[card.id] = true;
      if (suspended[card.id]) return;
      var cardState = cards[card.id];
      if (!cardState || !cardState.due || cardState.due <= date) due++;
    });

    Object.keys(cards).forEach(function (id) {
      if (seen[id] || suspended[id]) return;
      var cardState = cards[id];
      if (cardState && cardState.due && cardState.due <= date) due++;
    });
    return due;
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
      formulaCards: {
        reviewed: reviewed,
        due: formulaDueCount(state, date)
      },
      mistakesAdded: mistakesAdded,
      recentLog: recentLog
    };
  };

  function postStatus() {
    lastPushAt = Date.now();
    if (!PGRE.store || !PGRE.store.state || typeof window.fetch !== 'function') {
      return Promise.resolve(false);
    }

    var body;
    try {
      body = JSON.stringify(PGRE.buildStatusSummary());
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
