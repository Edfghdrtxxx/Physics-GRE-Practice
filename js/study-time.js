/* Passive study-time tracker — counts active seconds into
   state.studyLog['YYYY-MM-DD'] with no start/stop button. Interaction events
   (click, keydown, hashchange, visibilitychange) are heartbeats: the gap
   since the previous heartbeat is credited, capped at GAP_MAX seconds, so
   idle stretches never inflate the log and a hidden tab counts nothing.
   Saves are throttled to at most one per SAVE_MS. Booted from PGRE.boot. */
window.PGRE = window.PGRE || {};

PGRE.studyTime = (function () {
  var GAP_MAX = 60;      // seconds — a longer silence credits at most this
  var SAVE_MS = 30000;   // persist at most once per 30 s
  var lastBeat = 0;      // ms timestamp of the previous heartbeat (0 = chain broken)
  var lastSave = 0;
  var dirty = false;

  /* Same local YYYY-MM-DD convention as store.today. */
  function dayStr(d) {
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function flush() {
    if (!dirty) return;
    lastSave = Date.now();
    dirty = false;
    PGRE.store.save();
  }

  function beat() {
    var now = Date.now();
    // F3: while the focus timer is actively crediting it owns crediting — the
    // passive heartbeat must not also credit (double counting). Break the chain
    // (lastBeat = 0) so stopping the timer doesn't back-credit the focused
    // span, but keep flushing any earlier pending write on the usual throttle.
    // BUNDLE D: a PAUSED session credits nothing (js/timer.js credit() no-ops on
    // paused), and the user is back to using the app — so passive crediting must
    // resume while held. Guard on actively-running only (t.on && !t.paused); when
    // paused this falls through to the normal heartbeat below. No double count:
    // the focus timer resumes crediting from the resume instant, and the first
    // beat after resume re-breaks this chain (t.on && !t.paused is true again).
    var t = PGRE.store.state.timer;
    if (t && t.on && !t.paused) {
      if (now - lastSave >= SAVE_MS) flush();
      lastBeat = 0;
      return;
    }
    if (lastBeat) {
      var gap = (now - lastBeat) / 1000;
      if (gap > 0) { // a clock set backwards credits nothing
        var day = dayStr(new Date());
        var log = PGRE.store.state.studyLog;
        log[day] = (log[day] || 0) + Math.min(gap, GAP_MAX);
        dirty = true;
      }
    }
    if (document.hidden) { flush(); lastBeat = 0; return; } // tab away: break the chain
    if (now - lastSave >= SAVE_MS) flush();
    lastBeat = now;
  }

  return {
    start: function () {
      ['click', 'keydown', 'hashchange', 'visibilitychange'].forEach(function (type) {
        var target = type === 'hashchange' ? window : document;
        target.addEventListener(type, beat, { capture: true, passive: true });
      });
      window.addEventListener('pagehide', function () { beat(); flush(); }); // last unsaved seconds survive closing
    },

    /* F3: the focus timer calls this on stop so the passive chain restarts
       cleanly (lastBeat = 0) — no back-credit of the just-focused span. */
    resetBeat: function () { lastBeat = 0; },

    /* Active seconds on one day; date is a 'YYYY-MM-DD' string. */
    daySec: function (date) {
      return Math.max(0, PGRE.store.state.studyLog[date] || 0);
    },

    todaySec: function () {
      return this.daySec(dayStr(new Date()));
    },

    /* Monday-based week: seconds from this week's Monday through today. */
    weekSec: function () {
      var now = new Date();
      var back = (now.getDay() + 6) % 7; // Mon = 0 … Sun = 6
      var total = 0;
      for (var i = 0; i <= back; i++) {
        var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        total += this.daySec(dayStr(d));
      }
      return total;
    }
  };
})();
