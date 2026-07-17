/* F3 focus timer — a manual start/stop timer for study you do away from the
   app (reading, deriving formulas on paper). Credits real wall-clock seconds
   into state.studyLog['YYYY-MM-DD'] using timestamps (state.timer.lastCredit),
   never accumulated setInterval counts, so a throttled/frozen tab or a reload
   neither loses nor double-counts time. Splits credit across local midnight.
   Persists, so it survives reload/close (boot credits the gap since lastCredit).
   While it runs the passive heartbeat (js/study-time.js) must NOT also credit.
   Booted from PGRE.boot after PGRE.studyTime.start(). */
window.PGRE = window.PGRE || {};

PGRE.timer = (function () {
  // A single credited gap is capped at 4 h. This is the "forgot to stop" guard:
  // 4 h is longer than any realistic single focused study block, so no genuine
  // reading/derivation session is ever truncated — yet if the app reopens after
  // an overnight close with the timer still "on", at most 4 h of phantom study
  // is credited before it auto-stops. The cap is PER GAP, not per session: a
  // continuously-running session with the tab open ticks ~every second, so each
  // gap is ~1 s and a legitimate 6 h session credits all 6 h. The cap only bites
  // on one >4 h silence (tab discarded/frozen, browser closed).
  var GAP_CAP   = 4 * 3600;   // 14400 s
  var SAVE_MS   = 30000;      // persist at most once per 30 s (mirrors study-time.js)
  var ACH_MS    = 180000;     // checkAchievements at most once per 3 min while running
  var TOUCH_SEC = 60;         // credit >= this in a session -> touchDay() (streak)

  var tickHandle = null;
  var lastSave = 0, lastAch = 0;
  var dirty = false;
  var sessionCredited = 0;      // seconds credited in the CURRENT session (60 s gate + sessions gate)
  var sessionDays = [];         // every distinct local day this session credited, chronological
  var touchedCount = 0;         // how many of sessionDays already passed to touchDay()
  var lifecycleBound = false;

  /* Same local YYYY-MM-DD convention as store.today / study-time.dayStr. */
  function dayStr(d) {
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function st() { return PGRE.store.state.timer; }

  function fmtDur(sec) {
    sec = Math.max(0, Math.floor(sec));
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    var p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return h > 0 ? h + ':' + p(m) + ':' + p(s) : m + ':' + p(s);
  }

  function flush(force) {
    if (!dirty && !force) return;
    lastSave = Date.now();
    dirty = false;
    PGRE.store.save();
  }

  function checkAch() {
    lastAch = Date.now();
    if (window.PGRE && PGRE.gamify && typeof PGRE.gamify.checkAchievements === 'function') {
      try { PGRE.gamify.checkAchievements(); } catch (e) { /* a badge must never crash the timer */ }
    }
  }

  /* Credit [fromMs, toMs] wall-clock seconds into studyLog, split at each local
     midnight so a session that spans days lands in the right buckets. Returns
     the distinct local day keys the span credited, in chronological order, so
     the caller can touchDay() every crossed day (not just today). */
  function addSpan(fromMs, toMs) {
    var keys = [];
    if (toMs <= fromMs) return keys;
    var log = PGRE.store.state.studyLog;
    var cursor = fromMs;
    while (cursor < toMs) {
      var d = new Date(cursor);
      var nextMid = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
      var segEnd = toMs < nextMid ? toMs : nextMid;
      var key = dayStr(d);
      log[key] = (log[key] || 0) + (segEnd - cursor) / 1000;
      keys.push(key);
      cursor = segEnd;
    }
    dirty = true;
    return keys;
  }

  /* Advance crediting up to nowMs. Timestamp-based: correct no matter how long
     since the last call (throttled tick, frozen tab, reload gap). Returns true
     iff the session auto-stopped (gap exceeded the cap). */
  function credit(nowMs) {
    var t = st();
    if (!t || !t.on) return false;
    // BUNDLE D: a PAUSED session credits nothing. Every credit path (live tick,
    // visibilitychange, pagehide, boot gap-credit) funnels through here, so this
    // one no-op is the whole "stop crediting while held" rule: the paused span
    // never lands in studyLog, never advances lastCredit, never trips the cap or
    // the goal boundary. lastCredit stays frozen at the pause instant, which is
    // what resume() reads to size the paused gap.
    if (t.paused) return false;

    // F5 countdown goal: never credit past startedAt + goalSec, and remember to
    // finalize the session as goal-met once the boundary is reached. This runs on
    // EVERY credit path (live tick, visibilitychange, pagehide, boot gap-credit),
    // so a goal completes even with no focus page open and even if the tab was
    // away when the boundary passed. BUNDLE D: the boundary slides by pausedMs so
    // held time doesn't eat into goal progress — a 25-min goal paused for 5 min
    // still needs a full 25 min of credited focus.
    var goalReached = false, goalEndMs = 0;
    if (typeof t.goalMin === 'number' && t.goalMin > 0 && t.startedAt) {
      goalEndMs = t.startedAt + Math.round(t.goalMin * 60) * 1000 + (t.pausedMs || 0);
      if (nowMs >= goalEndMs) { nowMs = goalEndMs; goalReached = true; }
    }

    var from = t.lastCredit || nowMs;
    var gap = (nowMs - from) / 1000;
    if (gap <= 0) {                     // at/behind the boundary, or clock set back
      t.lastCredit = nowMs;
      if (goalReached) { var gmA = t.goalMin; finalizeAndStop(true); toastGoal(gmA); return true; } // capture before finalizeAndStop() nulls goalMin
      return false;
    }
    var capStop = false, span = gap;
    if (gap > GAP_CAP) { span = GAP_CAP; capStop = true; } // forgot to stop -> credit the cap only
    var to = from + span * 1000;
    var creditedDays = addSpan(from, to);
    PGRE.store.state.timerStats.seconds += span;
    sessionCredited += span;
    t.lastCredit = to;
    // Remember every distinct day this session has credited, chronological. Time
    // only moves forward, so dedup against the last day kept. We accumulate ACROSS
    // credit() calls because the 60 s streak gate below may not be satisfied yet
    // on the tick that first crosses midnight.
    for (var ci = 0; ci < creditedDays.length; ci++) {
      if (!sessionDays.length || sessionDays[sessionDays.length - 1] !== creditedDays[ci]) {
        sessionDays.push(creditedDays[ci]);
      }
    }
    // Streak: a pure-reading day still counts once the session has credited >= 60 s.
    // touchDay() only marks today() by default, so a session straddling local
    // midnight must re-touch every day it crossed — otherwise a crossed day gets
    // studyLog seconds (addSpan splits them across midnight) but no daysActive
    // entry, which can silently break the streak. Touch every not-yet-touched day
    // in sessionDays, in chronological order (touchDay chains the streak only when
    // earlier days precede later ones). This covers the live-tick path where the
    // midnight-crossing tick is still under 60 s — its earlier day would otherwise
    // be dropped — as well as a SINGLE credit() call (frozen tab caught up on
    // refocus/stop, or boot() gap-credit) spanning the whole 11pm->1am span at
    // once. touchDay() is idempotent per day (daysActive guard).
    if (sessionCredited >= TOUCH_SEC && PGRE.store && typeof PGRE.store.touchDay === 'function') {
      while (touchedCount < sessionDays.length) {
        PGRE.store.touchDay(sessionDays[touchedCount++]);
        dirty = true;
      }
    }
    // 4 h silence wins for the CREDIT amount. If the cap bit before we actually
    // reached the boundary (to < goalEndMs), it's a plain forgot-to-stop auto-stop.
    if (capStop && !(goalReached && to >= goalEndMs)) {
      finalizeAndStop(false);  // rolls the session into timerStats, marks stopped, notifies
      if (window.PGRE && PGRE.toast) {
        PGRE.toast('Focus timer auto-stopped after 4 h (looks like it was left running).', 'info');
      }
      return true;
    }
    if (goalReached) {          // reached the boundary within the cap -> met
      var gmB = t.goalMin;      // capture before finalizeAndStop() nulls goalMin
      finalizeAndStop(true);
      toastGoal(gmB);
      return true;
    }
    return false;
  }

  function toastGoal(goalMin) {
    if (window.PGRE && PGRE.toast) {
      PGRE.toast('Focus goal complete — ' + goalMin + ' min in the books. Nice work.', 'achievement');
    }
  }

  /* Close out the running session: count it, clear timer state, stop ticking,
     restart the passive heartbeat chain cleanly, persist, re-check badges. */
  function finalizeAndStop(met) {
    var t = st();
    if (!t || !t.on) return;
    // Capture before clearing. lastCredit is the last instant we credited up to
    // (= now on a normal stop, = goalEnd on a goal-met stop, = start+4h on a cap
    // stop); startedAt is the session origin. Both persist across reloads, so this
    // span is the whole session's honest credited duration.
    var startedAtMs = t.startedAt || t.lastCredit || Date.now();
    var endedAtMs   = t.lastCredit || Date.now();
    // BUNDLE D: the wall-clock span (endedAt-startedAt) still includes any paused
    // stretches — lastCredit jumps forward to the resume instant on every resume,
    // so the held gaps sit inside [startedAt, lastCredit]. Subtract pausedMs to log
    // only credited focus. A session stopped WHILE paused froze lastCredit at that
    // pause instant, so its final (in-progress) hold is already excluded and is not
    // yet in pausedMs — no double subtraction.
    var seconds     = Math.max(0, Math.round((endedAtMs - startedAtMs) / 1000) - Math.round((t.pausedMs || 0) / 1000));
    var goalMin     = (typeof t.goalMin === 'number' && t.goalMin > 0) ? t.goalMin : null;

    // Ignore no-op taps (start immediately stopped, ~0 s). BUNDLE D: gate on the
    // PERSISTED honest span (seconds), not only the in-memory sessionCredited —
    // boot() resets sessionCredited to 0 and a restored PAUSED session credits
    // nothing on boot, so a user who reopens while paused and then Stops (without
    // resuming) still has a real multi-minute session that must be logged. The OR
    // keeps the original live-path behaviour exactly (both agree mid-session).
    if (seconds >= 1 || sessionCredited >= 1) {    // ignore no-op taps
      PGRE.store.state.timerStats.sessions += 1;   // <-- timerStats semantics UNCHANGED
      var fs = PGRE.store.state.focusSessions;
      if (!fs) fs = PGRE.store.state.focusSessions = [];   // defensive on very old in-memory state
      fs.push({
        startedAt: new Date(startedAtMs).toISOString(),
        endedAt:   new Date(endedAtMs).toISOString(),
        seconds:   seconds,
        goalMin:   goalMin,
        met:       !!met
      });
      if (fs.length > 300) fs.splice(0, fs.length - 300);   // cap ~300, oldest dropped
    }
    t.on = false; t.startedAt = null; t.lastCredit = null; t.goalMin = null; // <-- also clears goal
    t.paused = false; t.pausedMs = 0;                                        // BUNDLE D: reset held state
    stopTick();
    // lastBeat = 0 semantics: tell the passive tracker to start a fresh chain so
    // stopping the timer does not back-credit the just-focused span.
    if (PGRE.studyTime && typeof PGRE.studyTime.resetBeat === 'function') PGRE.studyTime.resetBeat();
    dirty = true;
    checkAch();     // requirement 8: checkAchievements on stop
    flush(true);    // persist the stop immediately
    render();
  }

  function startTick() { if (!tickHandle) tickHandle = setInterval(onTick, 1000); }
  function stopTick()  { if (tickHandle) { clearInterval(tickHandle); tickHandle = null; } }

  function onTick() {
    var t = st();
    if (!t || !t.on) { stopTick(); return; }
    if (t.paused) { stopTick(); return; }        // BUNDLE D: pause() stops the tick; belt-and-braces
    if (credit(Date.now())) return;              // auto-stopped: finalizeAndStop already flushed+rendered
    var now = Date.now();
    if (dirty && now - lastSave >= SAVE_MS) flush();     // throttle store.save() like study-time.js
    if (now - lastAch >= ACH_MS) checkAch();             // at most once per few minutes while running
    render();                                            // live elapsed readout, every second
  }

  function start(goalMin) {
    var t = st();
    if (!t || t.on) return;
    var now = Date.now();
    t.on = true; t.startedAt = now; t.lastCredit = now;
    // F5: arm a countdown goal (positive integer minutes) or open-ended (null).
    // Persisted on state.timer so a reload mid-session keeps the goal.
    t.goalMin = (typeof goalMin === 'number' && goalMin > 0) ? Math.round(goalMin) : null;
    t.paused = false; t.pausedMs = 0;   // BUNDLE D: a fresh session is never held
    sessionCredited = 0; sessionDays = []; touchedCount = 0;
    lastAch = now;                 // first in-run badge check happens ACH_MS later, not now
    startTick();
    dirty = true;
    flush(true);                   // persist the start so a crash right after resumes correctly
    render();
  }

  function stop() {
    var t = st();
    if (!t || !t.on) return;
    // Works from RUNNING and PAUSED. Paused: credit() no-ops (returns false), so
    // finalizeAndStop runs straight away and logs the honest span (lastCredit is
    // frozen at the pause instant, so the current hold is excluded).
    if (!credit(Date.now())) finalizeAndStop(false); // early stop credits honestly, met:false
  }

  /* BUNDLE D — pause: bank everything up to now, then stop crediting and stop the
     tick. credit() advances lastCredit to this instant and (importantly) does NOT
     yet see t.paused, so the pre-pause span is fully banked first; it may even
     finalize the session (goal boundary reached exactly at pause, or a >4 h gap),
     in which case there's nothing left to hold. Otherwise mark paused, freeze the
     tick, persist immediately. lastCredit now sits at the pause instant and stays
     there (credit() no-ops while paused), so resume() can measure the hold. */
  function pause() {
    var t = st();
    if (!t || !t.on || t.paused) return;
    credit(Date.now());
    t = st();
    if (!t || !t.on) return;           // credit() auto-finalized -> nothing to pause
    t.paused = true;
    stopTick();
    dirty = true;
    flush(true);
    render();
  }

  /* BUNDLE D — resume: the hold lasted (now - lastCredit) because lastCredit froze
     at the pause instant. Fold it into pausedMs (goal boundary + logged seconds
     both discount it), re-anchor lastCredit to now so the next credit() counts
     only fresh focus, clear paused, restart the tick, persist. */
  function resume() {
    var t = st();
    if (!t || !t.on || !t.paused) return;
    var now = Date.now();
    t.pausedMs = (t.pausedMs || 0) + Math.max(0, now - (t.lastCredit || now));
    t.lastCredit = now;
    t.paused = false;
    startTick();
    dirty = true;
    flush(true);
    render();
  }

  function render() {
    var wrap = document.getElementById('focus-timer');
    if (!wrap) return;
    var t = st();
    var on = !!(t && t.on);
    var paused = !!(on && t.paused);           // BUNDLE D: held-but-live
    // Three visual states: idle (neither class), running (is-running), paused
    // (is-paused). is-running drives the pulsing accent dot, so it must drop while
    // paused — the steadier is-paused look reads as "held".
    wrap.classList.toggle('is-running', on && !paused);
    wrap.classList.toggle('is-paused', paused);
    // Dynamic dressing: a quick pop on every state change (idle/running/paused),
    // and — for goal sessions — a left-to-right progress fill across the pill,
    // driven by the --fprog custom property (see the .has-goal css rules). The
    // first paint after load sets the baseline silently (no pop).
    var stateName = paused ? 'paused' : (on ? 'running' : 'idle');
    if (wrap.dataset.fstate && wrap.dataset.fstate !== stateName) {
      wrap.classList.remove('state-pop');
      void wrap.offsetWidth;                   // restart the pop animation
      wrap.classList.add('state-pop');
    }
    wrap.dataset.fstate = stateName;
    // Elapsed excludes held time (pausedMs) and, while paused, freezes at the
    // pause instant (lastCredit) instead of tracking the wall clock. Computed
    // once here from persisted fields for both the readout and the fill, so a
    // reload mid-pause shows the same frozen value.
    var refNow = paused ? (t.lastCredit || t.startedAt) : Date.now();
    var elapsed = (on && t.startedAt) ? (refNow - t.startedAt - (t.pausedMs || 0)) / 1000 : 0;
    var hasGoal = !!(on && typeof t.goalMin === 'number' && t.goalMin > 0);
    wrap.classList.toggle('has-goal', hasGoal);
    if (hasGoal) {
      var pct = Math.max(0, Math.min(100, 100 * elapsed / (t.goalMin * 60)));
      wrap.style.setProperty('--fprog', pct.toFixed(1) + '%');
    } else {
      wrap.style.removeProperty('--fprog');
    }
    var btn = document.getElementById('focus-toggle');
    var label = document.getElementById('focus-label');
    var time = document.getElementById('focus-time');
    // idle -> Start, running -> Stop, paused -> Resume (the top-bar widget has no
    // separate Pause control; Pause lives on the full-page #/focus face).
    if (label) label.textContent = paused ? 'Resume focus' : (on ? 'Stop focus' : 'Start focus');
    if (btn) {
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.setAttribute('aria-label', paused ? 'Focus timer paused — click to resume'
        : (on ? 'Focus timer running — click to stop' : 'Start focus timer'));
    }
    if (time) {
      if (on && t.startedAt) {
        time.hidden = false;
        var hint = paused ? ' · paused' : '';   // elapsed computed above
        if (typeof t.goalMin === 'number' && t.goalMin > 0) {
          // F5: a countdown-goal session. Show REMAINING (not elapsed) so this always-
          // visible widget agrees numerically with the full-page #/focus face, which
          // also counts down — both read the same state.timer. fmtDur here matches
          // view-focus.js fmtClock, so the two readouts render the identical string.
          var remain = Math.max(0, t.goalMin * 60 - elapsed);
          time.textContent = fmtDur(remain);
          time.title = fmtDur(remain) + ' left · ' + t.goalMin + '-min goal' + hint;
        } else {
          time.textContent = fmtDur(elapsed);   // open-ended: elapsed, unchanged from F3
          time.title = fmtDur(elapsed) + ' focused' + hint;
        }
      } else { time.hidden = true; time.textContent = '0:00'; time.removeAttribute('title'); }
    }
  }

  function bindControls() {
    var btn = document.getElementById('focus-toggle');
    if (!btn || btn._pgreBound) return;
    btn._pgreBound = true;
    btn.addEventListener('click', function () {
      var t = st();
      if (t && t.on) {
        if (t.paused) { resume(); return; }   // BUNDLE D: paused top-bar button = Resume
        stop();
        return;
      }
      // F5: when the full-page focus face is mounted with a goal picked, honor it so the
      // top-bar quick-start and the page hero agree on what Start does. pendingGoal()
      // returns null off that page, preserving the classic open-ended quick start.
      var g = null;
      if (window.PGRE && PGRE.views && PGRE.views.focus && typeof PGRE.views.focus.pendingGoal === 'function') {
        try { g = PGRE.views.focus.pendingGoal(); } catch (e) { g = null; }
      }
      start(g);
    });
  }

  function registerLifecycle() {
    if (lifecycleBound) return;
    lifecycleBound = true;
    // Bank + persist before the tab is frozen/discarded; catch up on return.
    document.addEventListener('visibilitychange', function () {
      var t = st();
      if (!t || !t.on) return;
      if (t.paused) return;                    // BUNDLE D: held -> no credit, no state change
      credit(Date.now());
      if (document.hidden) flush(true); else render();
    });
    // Last focused seconds survive closing. NB: pagehide does NOT stop the timer
    // — timer.on + lastCredit persist, and the next boot credits the gap. A PAUSED
    // session banks nothing here (credit no-ops) and its state already persisted at
    // pause; leave it untouched so it can rest across the close.
    window.addEventListener('pagehide', function () {
      var t = st();
      if (t && t.on && !t.paused) { credit(Date.now()); flush(true); }
    });
  }

  function boot() {
    // state.timer / state.timerStats are guaranteed present by store.defaults()+migrate().
    bindControls();
    registerLifecycle();
    var t = st();
    if (t && t.on) {
      sessionDays = []; touchedCount = 0; lastAch = Date.now();
      // Seed the 60 s streak/touchDay gate with the session's already-credited
      // honest span (same formula finalizeAndStop uses: lastCredit-startedAt minus
      // pausedMs) so the gate reflects the WHOLE session, not just what this boot
      // re-credits. Without it a session paused across a reload — whose paused
      // branch below skips credit(), so nothing re-accumulates — would need a fresh
      // 60 s after Resume before its day is added to daysActive, silently dropping
      // the streak credit for a >=60 s session split by a paused reload.
      sessionCredited = Math.max(0,
        Math.round(((t.lastCredit || t.startedAt) - t.startedAt) / 1000) -
        Math.round((t.pausedMs || 0) / 1000));
      if (t.paused) {
        // BUNDLE D: a paused session can rest across reload / overnight. Do NOT
        // credit the silent gap (credit() no-ops on paused anyway) and — crucially
        // — do NOT arm the tick or let the 4 h cap auto-stop it. Just restore it
        // held; the readout shows the frozen pre-pause elapsed.
      } else {
        // Survived reload/close while running: credit the gap since lastCredit.
        // credit() applies the 4 h cap and auto-stops if the gap is huge.
        if (!credit(Date.now()) && t.on) startTick(); // still under the cap -> resume ticking
      }
      flush(true);
    }
    render();
  }

  return {
    boot: boot,
    start: start,
    stop: stop,
    pause: pause,     // BUNDLE D
    resume: resume,   // BUNDLE D
    // isRunning stays TRUE while paused (the session is still live, just held) —
    // that's what callers that mean "a session is in progress" want. Ask isPaused()
    // to distinguish held from actively-crediting.
    isRunning: function () { var t = PGRE.store.state.timer; return !!(t && t.on); },
    isPaused:  function () { var t = PGRE.store.state.timer; return !!(t && t.on && t.paused); },
    stats: function () { return PGRE.store.state.timerStats; }
  };
})();
