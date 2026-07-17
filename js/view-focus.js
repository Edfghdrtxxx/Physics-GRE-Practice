/* F5 — full-page focus app at #/focus. A calm face over the js/timer.js engine
   (single source of truth). The engine credits wall-clock time and owns
   start/stop/auto-stop; this view only reads state and repaints. Its 1 s tick is
   display-only and self-terminates when the router swaps #view out. */
window.PGRE = window.PGRE || {};
PGRE.views = PGRE.views || {};

PGRE.views.focus = (function () {
  var faceTimer = null;          // single self-terminating display interval
  var selectedGoal = null;       // idle picker: null = open-ended, else minutes
  var wasOn = false;             // transition detector (running -> stopped)
  var lastRunLen = 0;            // focusSessions.length observed WHILE running (pre-finalize);
                                 // lets the stop-transition flash tell a real log-append from a no-op tap

  /* ——— formatting ——— */
  function fmtClock(sec) {
    sec = Math.max(0, Math.floor(sec));
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    var p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return h > 0 ? h + ':' + p(m) + ':' + p(s) : m + ':' + p(s);
  }
  function st() { return PGRE.store.state.timer; }
  function isOn() { var t = st(); return !!(t && t.on); }
  function isPaused() { var t = st(); return !!(t && t.on && t.paused); }   // BUNDLE D: held-but-live
  // Focused seconds so far, excluding held time. While paused it FREEZES at the
  // pause instant (lastCredit) instead of tracking the wall clock, and it always
  // discounts pausedMs — so the clock, sub caption and reward all read from the
  // same persisted-field math and agree across a reload mid-pause.
  function elapsedSec() {
    var t = st();
    if (!t || !t.on || !t.startedAt) return 0;
    var ref = t.paused ? (t.lastCredit || t.startedAt) : Date.now();
    return (ref - t.startedAt - (t.pausedMs || 0)) / 1000;
  }

  /* ——— reward atom (static SVG; paint only toggles classes + one ring offset) ——— */
  var RING_C = 553;              // 2*pi*88, rounded — matches r="88" in the markup
  function atomSVG() {
    return '' +
      '<svg class="focus-atom" id="focus-atom" viewBox="0 0 200 200" role="img" aria-label="Focus progress">' +
        '<circle class="fa-track" cx="100" cy="100" r="88"/>' +
        '<circle class="fa-ring"  cx="100" cy="100" r="88" id="fa-ring"/>' +
        '<g class="fa-orbit-grp fa-g1"><ellipse class="fa-orbit" cx="100" cy="100" rx="72" ry="27"/>' +
          '<circle class="fa-electron" cx="172" cy="100" r="5"/></g>' +
        '<g class="fa-orbit-grp fa-g2" transform="rotate(60 100 100)"><ellipse class="fa-orbit" cx="100" cy="100" rx="72" ry="27"/>' +
          '<circle class="fa-electron" cx="172" cy="100" r="5"/></g>' +
        '<g class="fa-orbit-grp fa-g3" transform="rotate(120 100 100)"><ellipse class="fa-orbit" cx="100" cy="100" rx="72" ry="27"/>' +
          '<circle class="fa-electron" cx="172" cy="100" r="5"/></g>' +
        '<circle class="fa-nucleus" cx="100" cy="100" r="13"/>' +
      '</svg>';
  }
  // progress in [0,1]; orbitCount 0..3 (which orbits are lit); complete adds a pulse.
  function paintAtom(progress, orbitCount, complete) {
    var atom = document.getElementById('focus-atom');
    var ring = document.getElementById('fa-ring');
    if (!atom || !ring) return;
    ring.style.strokeDasharray = RING_C;
    ring.style.strokeDashoffset = Math.max(0, Math.min(RING_C, RING_C * (1 - progress)));
    atom.classList.toggle('orbits-1', orbitCount >= 1);
    atom.classList.toggle('orbits-2', orbitCount >= 2);
    atom.classList.toggle('orbits-3', orbitCount >= 3);
    // BUNDLE D: keep is-running while paused so the orbit animation stays applied,
    // then is-paused pauses it in place (animation-play-state) instead of resetting
    // the electrons to their start angle. The ring is frozen too because progress
    // is computed from the frozen elapsedSec().
    atom.classList.toggle('is-running', isOn());
    atom.classList.toggle('is-paused', isPaused());
    atom.classList.toggle('is-complete', !!complete);
  }

  /* ——— goal picker (idle only) ——— */
  function goalChipsHTML() {
    function chip(val, label) {
      var active = (selectedGoal === val) ? ' active' : '';
      return '<button type="button" class="focus-chip' + active + '" data-goal="' +
             (val == null ? '' : val) + '">' + label + '</button>';
    }
    return '<div class="focus-goals" id="focus-goals">' +
      chip(null, 'Open-ended') + chip(25, '25 min') + chip(50, '50 min') +
      '<span class="focus-chip focus-chip-custom">' +
        '<input id="focus-custom" class="focus-custom-in" type="number" min="1" max="240" ' +
               'inputmode="numeric" placeholder="min" aria-label="Custom minutes">' +
      '</span>' +
    '</div>';
  }

  /* ——— quiet stats (studyLog day buckets + timerStats), Recent sessions ——— */
  function statsHTML() {
    var stt = PGRE.studyTime, ts = PGRE.store.state.timerStats || { sessions: 0, seconds: 0 };
    var todayMin = Math.round(stt.todaySec() / 60);
    var todayDisp = (stt.todaySec() > 0 && todayMin === 0) ? '<1' : String(todayMin);
    var weekH = (stt.weekSec() / 3600).toFixed(1);
    var lifeH = ((ts.seconds || 0) / 3600).toFixed(1);
    var ui = PGRE.ui;
    return '<div class="focus-stats" id="focus-stats">' +
      ui.statTile('Today', todayDisp + '<span class="stat-unit"> min</span>', 'active time') +
      ui.statTile('This week', weekH + '<span class="stat-unit"> h</span>', 'toward 15–17 h') +
      ui.statTile('Focus sessions', ui.fmt(ts.sessions || 0), 'lifetime') +
      ui.statTile('Focus hours', lifeH + '<span class="stat-unit"> h</span>', 'on the timer') +
    '</div>';
  }

  function recentHTML() {
    var list = (PGRE.store.state.focusSessions || []).slice(-6).reverse();
    if (!list.length) {
      return '<div class="focus-recent" id="focus-recent"><h2>Recent sessions</h2>' +
        '<p class="muted">No focus sessions yet — start one above. Reading or deriving on paper counts.</p></div>';
    }
    var rows = list.map(function (r) {
      var dur = fmtClock(r.seconds);
      var tag = (r.goalMin == null)
        ? '<span class="focus-tag">stopwatch</span>'
        : (r.met ? '<span class="focus-tag focus-tag-met">' + r.goalMin + ' min · met ✓</span>'
                 : '<span class="focus-tag">' + r.goalMin + ' min · stopped early</span>');
      return '<li class="focus-sess"><span class="focus-sess-dur">' + dur + '</span>' + tag +
        '<span class="focus-sess-when muted">' + PGRE.ui.timeAgo(r.endedAt) + '</span></li>';
    }).join('');
    return '<div class="focus-recent" id="focus-recent"><h2>Recent sessions</h2>' +
      '<ul class="focus-sess-list">' + rows + '</ul></div>';
  }

  /* ——— render: static skeleton the mount() drives ——— */
  function render() {
    return '' +
    '<div class="focus-page" id="focus-page">' +
      '<div class="focus-ambient" aria-hidden="true"></div>' +
      '<div class="focus-stage">' +
        '<div class="focus-reward">' + atomSVG() + '</div>' +
        '<div class="focus-clock" id="focus-clock">0:00</div>' +
        '<div class="focus-sub"  id="focus-sub">Choose a length, then start.</div>' +
        goalChipsHTML() +
        '<div class="focus-controls">' +
          '<button class="btn btn-primary focus-hero" id="focus-hero">Start focus</button>' +
          // BUNDLE D: secondary action — Pause while running, Stop while paused.
          // Hidden when idle. paintLive() drives its label + visibility.
          '<button class="btn btn-ghost focus-pause" id="focus-pause" hidden>Pause</button>' +
          '<button class="btn btn-ghost focus-zen-btn" id="focus-zen-btn">Zen mode</button>' +
        '</div>' +
        statsHTML() +
        recentHTML() +
      '</div>' +
      '<button class="focus-zen-exit" id="focus-zen-exit" type="button" hidden>Exit zen ✕</button>' +
    '</div>';
  }

  /* ——— live paint (fast bits): clock, sub, atom, and the ticking "today"/"week" ——— */
  function paintLive() {
    var t = st(), on = !!(t && t.on);
    var paused = !!(on && t.paused);            // BUNDLE D: held-but-live
    var clock = document.getElementById('focus-clock');
    var sub = document.getElementById('focus-sub');
    var hero = document.getElementById('focus-hero');
    var pauseBtn = document.getElementById('focus-pause');
    var goals = document.getElementById('focus-goals');
    var page = document.getElementById('focus-page');
    if (page) page.classList.toggle('is-paused', paused);

    var progress = 0, orbits = 0;
    if (on) {
      var e = elapsedSec();                     // frozen while paused (see elapsedSec)
      if (typeof t.goalMin === 'number' && t.goalMin > 0) {
        var goalSec = t.goalMin * 60;
        var remain = Math.max(0, goalSec - e);
        if (clock) clock.textContent = fmtClock(remain);          // countdown shows remaining (frozen if paused)
        if (sub) sub.textContent = paused
          ? ('Paused · ' + t.goalMin + ' min goal  (' + fmtClock(e) + ' in)')
          : ('Goal · ' + t.goalMin + ' min  (' + fmtClock(e) + ' elapsed)');
        progress = Math.min(1, e / goalSec);
        orbits = e >= goalSec ? 3 : (progress >= 0.66 ? 3 : progress >= 0.33 ? 2 : 1);
      } else {
        if (clock) clock.textContent = fmtClock(e);               // open-ended counts up (frozen if paused)
        if (sub) sub.textContent = paused
          ? ('Paused · ' + fmtClock(e) + ' focused')
          : 'Open-ended · focusing';
        // orbits accrue over time; ring gently reflects progress toward the next rung
        orbits = e >= 1500 ? 3 : e >= 600 ? 2 : 1;                // 10 min, 25 min rungs
        progress = (e % 600) / 600;
      }
      // Controls: hero is the primary action (Stop when running, Resume when held);
      // the secondary is Pause when running, Stop when held. Goal chips stay hidden
      // the whole time the session is live, paused included.
      if (hero) hero.textContent = paused ? 'Resume focus' : 'Stop focus';
      if (pauseBtn) { pauseBtn.hidden = false; pauseBtn.textContent = paused ? 'Stop focus' : 'Pause'; }
      if (goals) goals.hidden = true;
    } else {
      if (clock) clock.textContent = '0:00';
      if (hero) hero.textContent = 'Start focus';
      if (pauseBtn) pauseBtn.hidden = true;
      if (goals) goals.hidden = false;
      if (sub && !sub.dataset.flash) sub.textContent = selectedGoal
        ? ('Ready · ' + selectedGoal + ' min goal') : 'Ready · open-ended. Press start.';
    }
    // While a post-stop completion flash owns the caption for 6 s (sub.dataset.flash),
    // preserve the celebratory atom flashComplete() bloomed (paintAtom(1,3,true)): the
    // idle reset here would otherwise collapse it after ~1 s and desync the reward from
    // its 'Goal complete' caption. Gate the atom exactly like the caption above.
    if (on || !(sub && sub.dataset.flash)) paintAtom(progress, orbits, false);

    // the "Today"/"This week" tiles tick up ONLY while the engine is crediting; on an
    // idle page (the feature's whole premise is being left open) their values can't
    // move, so skip the per-second teardown/rebuild. paintAll() handles the one-shot
    // refresh at the stop transition when on has just flipped false.
    if (on) paintStats();
  }

  // Rebuild the four stat tiles in place (outerHTML keeps the #id).
  function paintStats() {
    var statsBox = document.getElementById('focus-stats');
    if (statsBox) statsBox.outerHTML = statsHTML();
  }

  /* Full repaint of the sections that only change on a state transition. */
  function paintAll() {
    paintLive();
    paintStats();          // refresh once on transitions (incl. stop, where paintLive skips it)
    syncChips();           // reconcile the goal-picker highlight with selectedGoal (reload mid-session)
    var recent = document.getElementById('focus-recent');
    if (recent) recent.outerHTML = recentHTML();
    syncZen();
  }

  /* ——— the single, self-terminating display interval ——— */
  function stopFace() { if (faceTimer) { clearInterval(faceTimer); faceTimer = null; } }
  function startFace() {
    stopFace();
    faceTimer = setInterval(faceTick, 1000);
  }
  function faceTick() {
    var page = document.getElementById('focus-page');
    if (!page || !page.isConnected) { stopFace(); return; }   // router swapped us out -> die
    var nowOn = isOn();
    if (wasOn && !nowOn) {                                     // engine finalized (manual/goal/4h)
      wasOn = false;
      paintAll();            // refresh Recent sessions + controls (repaints atom idle)
      flashComplete(lastRunLen); // then lay the completion state on top — but only if a session was actually logged
      return;
    }
    wasOn = nowOn;
    if (nowOn) lastRunLen = (PGRE.store.state.focusSessions || []).length; // pre-append baseline for the next stop
    paintLive();
  }

  // prevLen: the focusSessions.length from just BEFORE this stop. finalizeAndStop()
  // skips the log append for a sub-second no-op tap (sessionCredited < 1), so without
  // this guard flashComplete() would re-announce the PREVIOUS session as if it just ended.
  function flashComplete(prevLen) {
    var log = PGRE.store.state.focusSessions || [];
    if (typeof prevLen === 'number' && log.length <= prevLen) return;   // nothing new logged this stop
    var last = log[log.length - 1];
    var sub = document.getElementById('focus-sub');
    if (last && last.met) {
      paintAtom(1, 3, true);                                  // completed atom pulse
      if (sub) { sub.textContent = 'Goal complete — ' + last.goalMin + ' min logged.'; sub.dataset.flash = '1'; }
    } else if (last) {
      if (sub) { sub.textContent = 'Session logged — ' + fmtClock(last.seconds) + '.'; sub.dataset.flash = '1'; }
    }
    if (sub) setTimeout(function () { if (sub.isConnected) { delete sub.dataset.flash; } }, 6000);
  }

  /* ——— zen mode (ephemeral body class; cleaned up on leaving #/focus) ——— */
  function zenOn() { return document.body.classList.contains('focus-zen'); }
  function setZen(on) {
    document.body.classList.toggle('focus-zen', !!on);
    syncZen();
  }
  function syncZen() {
    var btn = document.getElementById('focus-zen-btn');
    var exit = document.getElementById('focus-zen-exit');
    if (btn) btn.textContent = zenOn() ? 'Exit zen' : 'Zen mode';
    if (exit) exit.hidden = !zenOn();
  }

  /* ——— arm the picker from live state (return-to-page / reload mid-session) ——— */
  function armFromState() {
    var t = st();
    if (t && t.on) { selectedGoal = (typeof t.goalMin === 'number' && t.goalMin > 0) ? t.goalMin : null; }
    // when idle, keep whatever the user last picked this session (module var persists)
  }

  /* Reconcile the goal-picker chips (+ custom input) with selectedGoal. render()
     builds the chips from the module default, but armFromState() may set selectedGoal
     from a live session AFTER render() has run; the picker is hidden while running, so
     without this the stale 'Open-ended' highlight would resurface when a session stops
     even though selectedGoal is (say) 50. Called from paintAll() (transitions only, not
     per second), so it never fights an in-progress custom-input edit. */
  function syncChips() {
    var page = document.getElementById('focus-page');
    if (!page) return;
    var matched = false;
    page.querySelectorAll('.focus-chip[data-goal]').forEach(function (b) {
      var v = b.getAttribute('data-goal');
      var val = (v === '') ? null : parseInt(v, 10);
      var on = (val === selectedGoal);
      b.classList.toggle('active', on);
      if (on) matched = true;
    });
    var custom = document.getElementById('focus-custom');
    // a custom goal (no preset chip matches) shows in the input; a preset/open-ended clears it
    if (custom) custom.value = (!matched && typeof selectedGoal === 'number' && selectedGoal > 0) ? selectedGoal : '';
  }

  // Drop the post-stop completion flash so the idle sub caption — and, via paintLive's
  // matching gate, the reward atom — refresh immediately when the user picks a new goal
  // inside the 6 s flash window, instead of clinging to the stale 'Session logged …' /
  // 'Goal complete …' message until the timeout clears it.
  function clearFlash() {
    var sub = document.getElementById('focus-sub');
    if (sub) delete sub.dataset.flash;
  }

  function mount() {
    // Every fresh arrival starts non-zen; the module-level hashchange handler
    // (below, registered once) removes the class when leaving, so it never leaks.
    if (!/^#\/focus\b/.test(location.hash)) return;   // guard against a stale mount
    armFromState();
    wasOn = isOn();
    if (wasOn) lastRunLen = (PGRE.store.state.focusSessions || []).length; // baseline for a session already running on arrival
    paintAll();
    startFace();

    var page = document.getElementById('focus-page');
    if (!page) return;

    // Idle-page stat freshness: study-time.js's heartbeat (js/study-time.js `beat`,
    // a CAPTURE-phase listener on document) credits studyLog on every click/keydown
    // while the focus timer is OFF, so the "Today"/"This week" tiles would otherwise
    // lag behind the freshly-banked seconds until the next start/stop (paintLive skips
    // paintStats when idle). Refresh the tiles after each in-page interaction. This
    // capture listener sits on `page`, an inner descendant of document, so the outer
    // document heartbeat always runs first and the seconds are already banked by here.
    // Bound on `page` (not document) so it's garbage-collected when the router swaps
    // #view out — no cross-view leak. No-op while running (faceTick rebuilds the tiles
    // each second then, and a running timer suppresses the heartbeat anyway).
    function refreshStatsOnActivity() { if (!isOn()) paintStats(); }
    page.addEventListener('click', refreshStatsOnActivity, true);
    page.addEventListener('keydown', refreshStatsOnActivity, true);

    // hero (primary): idle -> Start (with the selected goal); running -> Stop;
    // paused -> Resume. finalizeAndStop only fires on the Stop branch.
    var hero = document.getElementById('focus-hero');
    if (hero) hero.addEventListener('click', function () {
      var t = st();
      if (t && t.on) {
        if (t.paused) { PGRE.timer.resume(); paintLive(); return; }     // Resume: keep the session live
        var prevLen = (PGRE.store.state.focusSessions || []).length;    // capture before stop appends (or not)
        PGRE.timer.stop(); wasOn = false; paintAll(); flashComplete(prevLen);
      } else {
        var g = readCustomThenSelected();
        lastRunLen = (PGRE.store.state.focusSessions || []).length;    // pre-append baseline for the eventual stop
        PGRE.timer.start(g);            // number|null; engine persists goalMin
        wasOn = true;
        clearFlash();
        paintLive();
      }
    });

    // secondary: Pause while running, Stop while paused. Only meaningful mid-session.
    var pauseBtn = document.getElementById('focus-pause');
    if (pauseBtn) pauseBtn.addEventListener('click', function () {
      var t = st();
      if (!t || !t.on) return;
      if (t.paused) {                                                   // held -> Stop (log the honest span)
        var prevLen = (PGRE.store.state.focusSessions || []).length;
        PGRE.timer.stop(); wasOn = false; paintAll(); flashComplete(prevLen);
      } else {                                                          // running -> Pause (freeze)
        PGRE.timer.pause(); paintLive();
      }
    });

    // goal chips (idle only)
    page.querySelectorAll('.focus-chip[data-goal]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (isOn()) return;
        var v = b.getAttribute('data-goal');
        selectedGoal = v === '' ? null : parseInt(v, 10);
        var input = document.getElementById('focus-custom'); if (input) input.value = '';
        page.querySelectorAll('.focus-chip[data-goal]').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        clearFlash();   // a fresh pick supersedes any lingering post-stop flash caption/atom
        paintLive();
      });
    });
    var custom = document.getElementById('focus-custom');
    if (custom) {
      custom.addEventListener('input', function () {
        var n = parseInt(custom.value, 10);
        selectedGoal = (n > 0) ? Math.min(240, n) : null;
        page.querySelectorAll('.focus-chip[data-goal]').forEach(function (x) { x.classList.remove('active'); });
        clearFlash();   // editing the custom length supersedes any lingering post-stop flash
        paintLive();
      });
      // Snap the box to the value Start will actually arm once focus leaves the field, so it
      // can't keep displaying an out-of-range (>240), fractional, or non-positive number that
      // disagrees with the countdown. Uses the same clamp as readCustomThenSelected(). Clicking
      // Start (page hero or the sidebar quick-start) blurs this input first, so the number read
      // at start matches what's shown; setting .value here fires no input/change event -> no loop.
      custom.addEventListener('blur', function () {
        var n = parseInt(custom.value, 10);
        var norm = (n > 0) ? String(Math.min(240, n)) : '';
        if (custom.value !== norm) custom.value = norm;
      });
    }

    // zen toggles
    var zb = document.getElementById('focus-zen-btn');
    if (zb) zb.addEventListener('click', function () { setZen(!zenOn()); });
    var ze = document.getElementById('focus-zen-exit');
    if (ze) ze.addEventListener('click', function () { setZen(false); });
  }

  function readCustomThenSelected() {
    var custom = document.getElementById('focus-custom');
    if (custom && custom.value) { var n = parseInt(custom.value, 10); if (n > 0) return Math.min(240, n); }
    return (typeof selectedGoal === 'number' && selectedGoal > 0) ? selectedGoal : null;
  }

  // F5 single-source-of-truth bridge. When the full-page focus face is mounted, its hero
  // 'Start focus' AND the always-visible sidebar quick-start (#focus-toggle) are on screen
  // together. The sidebar button calls PGRE.timer.start() blind; this lets it adopt the
  // page's picked goal so both Start controls agree. Returns null when the page is gone
  // (element absent) so the sidebar keeps its classic open-ended stopwatch elsewhere.
  function pendingGoal() {
    var page = document.getElementById('focus-page');
    if (!page || !page.isConnected) return null;
    return readCustomThenSelected();
  }

  // Registered ONCE at module eval (like view-exam's leaveRoom): whenever the hash
  // leaves #/focus, drop the zen body class so it can never leak to another view.
  // The display interval self-terminates on its own via isConnected.
  window.addEventListener('hashchange', function () {
    if (!/^#\/focus\b/.test(location.hash)) document.body.classList.remove('focus-zen');
  });

  return { render: render, mount: mount, pendingGoal: pendingGoal };
})();
