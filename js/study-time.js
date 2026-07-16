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
    if (document.hidden) { flush(); lastBeat = 0; return; } // tab away: break the chain
    var now = Date.now();
    if (lastBeat) {
      var day = dayStr(new Date());
      var log = PGRE.store.state.studyLog;
      log[day] = (log[day] || 0) + Math.min((now - lastBeat) / 1000, GAP_MAX);
      dirty = true;
      if (now - lastSave >= SAVE_MS) flush();
    }
    lastBeat = now;
  }

  return {
    start: function () {
      ['click', 'keydown', 'hashchange', 'visibilitychange'].forEach(function (type) {
        var target = type === 'hashchange' ? window : document;
        target.addEventListener(type, beat, { capture: true, passive: true });
      });
      window.addEventListener('pagehide', flush); // last unsaved seconds survive closing
    },

    /* Active seconds on one day; date is a 'YYYY-MM-DD' string. */
    daySec: function (date) {
      return PGRE.store.state.studyLog[date] || 0;
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
