/* Formula-recall daily check-in (签到) — once per local calendar day after a
   qualifying Study / Match / Type / Quiz / Cloze settle. Pure day/streak/best
   transitions live here so Node can drive them without the DOM; DOM paint and
   XP live in the view + gamify hooks. Distinct from the global study streak
   (touchDay) and from F11 in-session round checkpoints. */
window.PGRE = window.PGRE || {};

PGRE.formulaCheckIn = (function () {
  /* Daily bonus through the existing gamify XP channel — meaningful but smaller
     than a bronze achievement, in the same band as a daily challenge. */
  var BONUS_XP = 15;

  function emptyState() {
    return { current: 0, best: 0, lastDay: null };
  }

  /* Sanitize any stored / test blob into a safe { current, best, lastDay }. */
  function coerce(raw) {
    var out = emptyState();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
    var cur = raw.current, best = raw.best, last = raw.lastDay;
    out.current = (typeof cur === 'number' && isFinite(cur) && cur >= 0)
      ? Math.floor(cur) : 0;
    out.best = (typeof best === 'number' && isFinite(best) && best >= 0)
      ? Math.floor(best) : 0;
    if (out.best < out.current) out.best = out.current;
    if (typeof last === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(last)) out.lastDay = last;
    else out.lastDay = null;
    return out;
  }

  function pad2(n) { return String(n).padStart(2, '0'); }

  function dayStr(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  /* Local calendar day before an arbitrary 'YYYY-MM-DD'. Pure; null on junk. */
  function dayBefore(day) {
    if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
    var p = day.split('-');
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    if (isNaN(d.getTime())) return null;
    d.setDate(d.getDate() - 1);
    return dayStr(d);
  }

  function isValidDay(day) {
    return typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day);
  }

  /* Pure transition: prior state + today → next state + claim flags.
     Same-day re-claim → claimed false, state unchanged, no bonus.
     Consecutive (lastDay === dayBefore(today)) → current += 1.
     Gap or first claim → current = 1. best is monotonic. */
  function apply(prior, today) {
    var s = coerce(prior);
    if (!isValidDay(today)) {
      return {
        next: s, claimed: false, bonus: 0,
        checkedToday: false, current: s.current, best: s.best, lastDay: s.lastDay
      };
    }
    if (s.lastDay === today) {
      return {
        next: s, claimed: false, bonus: 0,
        checkedToday: true, current: s.current, best: s.best, lastDay: s.lastDay
      };
    }
    var next = { current: 1, best: s.best, lastDay: today };
    if (s.lastDay && s.lastDay === dayBefore(today)) {
      next.current = s.current + 1;
    }
    if (next.current > next.best) next.best = next.current;
    return {
      next: next, claimed: true, bonus: BONUS_XP,
      checkedToday: true, current: next.current, best: next.best, lastDay: next.lastDay
    };
  }

  /* Display streak: 0 if the last check-in is older than yesterday (gap already
     opened). Mirrors store.liveStreak for the global study streak. */
  function liveStreak(prior, today) {
    var s = coerce(prior);
    if (!s.lastDay || !isValidDay(today)) return 0;
    if (s.lastDay === today) return s.current;
    if (s.lastDay === dayBefore(today)) return s.current;
    return 0;
  }

  function statusFrom(prior, today) {
    var s = coerce(prior);
    var checked = isValidDay(today) && s.lastDay === today;
    return {
      checkedToday: checked,
      current: liveStreak(s, today),
      best: s.best,
      lastDay: s.lastDay
    };
  }

  /* Force display numbers to safe non-negative integers (no string injection). */
  function safeInt(n, fallback) {
    if (typeof n !== 'number' || !isFinite(n) || n < 0) return fallback || 0;
    return Math.floor(n);
  }

  /* Motivational copy — fixed product strings; streak count is re-coerced. */
  function celebrateMessage(result) {
    if (!result || !result.claimed) return '';
    var n = safeInt(result.current, 0);
    var best = safeInt(result.best, 0);
    if (n === 1) return 'Formula check-in! Day 1 — the streak starts here.';
    if (n === 3) return 'Three days of formula recall. Momentum building.';
    if (n === 7) return 'One full week of formula check-ins. Keep the chain.';
    if (n === 14) return 'Two weeks strong — inertia is on your side.';
    if (n === 30) return 'Thirty days of formula recall. Perpetual motion.';
    if (n > 1 && n === best) {
      return 'Formula check-in! New best streak: ' + n + ' days.';
    }
    return 'Formula check-in! ' + n + '-day streak.';
  }

  function readState() {
    try {
      var st = window.PGRE && PGRE.store && PGRE.store.state;
      return coerce(st && st.formulaCheckIn);
    } catch (e) {
      return emptyState();
    }
  }

  function todayStr() {
    try {
      if (window.PGRE && PGRE.store && typeof PGRE.store.today === 'function') {
        return PGRE.store.today();
      }
    } catch (e) { /* fall through */ }
    return dayStr(new Date());
  }

  function status(todayOpt) {
    return statusFrom(readState(), todayOpt || todayStr());
  }


  /* Side-effecting entry point for settle paths: once-per-day claim, XP bonus
     via gamify, activity log line. Caller is expected to save state afterward
     (settleStudy / awardReviewXP already do). Returns the apply() result. */
  function record(todayOpt) {
    var today = todayOpt || todayStr();
    // close the missed-event race: read disk synchronously so a sibling tab's
    // claim is visible before we claim the same day twice
    try {
      var raw = localStorage.getItem(PGRE.store.KEY);
      if (raw && PGRE.store && typeof PGRE.store._adopt === 'function') {
        PGRE.store._adopt(JSON.parse(raw));
      }
    } catch (e) { /* unreadable disk — proceed on the live heap */ }
    var prior = readState();
    var r = apply(prior, today);
    if (!r.claimed) return r;
    try {
      if (!window.PGRE || !PGRE.store || !PGRE.store.state) return r;
      PGRE.store.state.formulaCheckIn = r.next;
      if (r.bonus > 0 && PGRE.gamify && typeof PGRE.gamify.addXP === 'function') {
        // quiet=false so the first check-in of the day surfaces a toast reward
        PGRE.gamify.addXP(r.bonus, '· formula check-in', false);
      }
      if (typeof PGRE.store.log === 'function') {
        PGRE.store.log('checkin',
          'Formula check-in' + (r.current > 1 ? ' · ' + r.current + '-day streak' : ''),
          r.bonus);
      }
    } catch (e) {
      // persistence / XP failure must never block session settle
      console.warn('formula check-in record failed', e);
    }
    return r;
  }

  /* Small HTML fragment for portal home / summaries. Fixed product copy only;
     numeric fields are re-coerced so a mis-shaped status object cannot inject. */
  function stripHTML(st) {
    if (!st) st = status();
    else {
      st = {
        checkedToday: !!st.checkedToday,
        current: safeInt(st.current, 0),
        best: safeInt(st.best, 0),
        lastDay: (typeof st.lastDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(st.lastDay))
          ? st.lastDay : null
      };
    }
    var badge = st.checkedToday
      ? '<span class="fci-badge fci-checked">Checked in today</span>'
      : '<span class="fci-badge fci-pending">Not yet today</span>';
    var streak = st.current > 0
      ? '<strong class="fci-streak"><span class="fci-num" data-to="' + st.current + '">' + st.current + '</span>-day streak</strong>'
      : '<strong class="fci-streak">No streak yet</strong>';
    var best = '';
    if (st.best > 0) {
      best = ' <span class="muted">· best ' + st.best + '</span>';
    }
    var hint = st.checkedToday
      ? 'Come back tomorrow to keep the chain — any formula Study or game settle counts.'
      : 'Finish a formula Study session or Match / Type / Quiz / Cloze round to check in.';
    return '<div class="card formula-checkin-card" id="formula-checkin" role="status">' +
      '<div class="fci-row">' +
      '<div class="fci-main">' + badge + ' ' + streak + best + '</div>' +
      '<p class="muted fci-hint">' + hint + '</p>' +
      '</div></div>';
  }

  function celebrateHTML(result) {
    if (!result || !result.claimed) return '';
    var msg = celebrateMessage(result);
    var bonus = safeInt(result.bonus, BONUS_XP) || BONUS_XP;
    return '<div class="card formula-checkin-celebrate" role="status">' +
      '<strong>' + msg + '</strong>' +
      ' <span class="muted">+<span class="fci-num" data-to="' + bonus + '">' + bonus + '</span> XP check-in bonus.</span>' +
      '</div>';
  }

  function alreadyHTML(st) {
    if (!st) st = status();
    else {
      st = {
        checkedToday: !!st.checkedToday,
        current: safeInt(st.current, 0),
        best: safeInt(st.best, 0)
      };
    }
    if (!st.checkedToday) return '';
    return '<div class="card formula-checkin-already" role="status">' +
      '<span class="fci-badge fci-checked">Already checked in today</span> ' +
      '<strong class="fci-streak"><span class="fci-num" data-to="' + st.current + '">' + st.current + '</span>-day streak</strong>' +
      (st.best ? ' <span class="muted">· best ' + st.best + '</span>' : '') +
      '</div>';
  }
  /* Count-up any .fci-num spans once they are inserted into the DOM. A
     rAF-debounced scan keeps this to one document query per frame at most;
     countUp itself is instant under reduced motion. */
  function animateNums(rootEl) {
    if (!window.PGRE || !PGRE.motion || !PGRE.motion.countUp) return;
    var nodes = (rootEl || document).querySelectorAll('.fci-num:not(.fci-num-done)');
    nodes.forEach(function (el) {
      el.classList.add('fci-num-done');
      PGRE.motion.countUp(el, parseInt(el.getAttribute('data-to'), 10) || 0);
    });
  }
  var numScanPending = false;
  function scheduleNumScan() {
    if (numScanPending) return;
    numScanPending = true;
    requestAnimationFrame(function () {
      numScanPending = false;
      animateNums();
    });
  }
  if (typeof MutationObserver !== 'undefined' && document.body) {
    new MutationObserver(scheduleNumScan).observe(document.body, { childList: true, subtree: true });
  }

  return {
    BONUS_XP: BONUS_XP,
    emptyState: emptyState,
    coerce: coerce,
    dayBefore: dayBefore,
    apply: apply,
    liveStreak: liveStreak,
    statusFrom: statusFrom,
    status: status,
    record: record,
    celebrateMessage: celebrateMessage,
    stripHTML: stripHTML,
    celebrateHTML: celebrateHTML,
    alreadyHTML: alreadyHTML,
    animate: animateNums
  };
})();
