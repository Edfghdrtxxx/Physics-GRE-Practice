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

  /* Pause a live session / resume a held one — shared by the clock tap and the
     Space shortcut. No-op when idle (starting stays on the hero button). */
  function toggleHold() {
    var t = st();
    if (!t || !t.on) return;
    if (t.paused) PGRE.timer.resume(); else PGRE.timer.pause();
    paintLive();
  }

  /* Space starts / pauses / resumes; Esc leaves zen. Bound ONCE on document
     (mount sets keyBound) and self-gating: inert unless the focus page is in
     the DOM, and it never steals keys from form fields, buttons, links, or the
     clock (which handles its own Enter/Space as a role=button). */
  var keyBound = false;
  function onKey(e) {
    var page = document.getElementById('focus-page');
    if (!page || !page.isConnected) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var el = e.target, tg = (el && el.tagName) || '';
    if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT' || tg === 'BUTTON' ||
        tg === 'A' || (el && el.isContentEditable) || (el && el.id === 'focus-clock')) return;
    if (e.key === ' ') {
      e.preventDefault();
      if (isOn()) { toggleHold(); return; }
      var hero = document.getElementById('focus-hero');
      if (hero) hero.click();               // idle: start with the picked goal
    } else if (e.key === 'Escape' && zenOn()) {
      setZen(false);
    }
  }

  /* ——— reward mark (static SVG; paint only toggles classes + one ring offset) ———
     The mark is a COLLIDER EVENT DISPLAY: the transverse cross-section of a
     cylindrical detector (beam pipe → tracker → calorimeters → solenoid →
     muon yoke) drawn as a hairline instrument figure, with the dotted timing
     ring around it. Its centre is the INTERACTION POINT: js/focus-fx.js
     streams bunch pairs in along the horizontal beamline and collides them
     at the centre, spraying curved tracks out through the layers (the canvas
     measures the ring's live position/radius from this element every frame).
     The detector lights up from the inside out on the existing orbits-1..3
     rungs — tracker first, then calorimeters, then solenoid + muon system —
     so the longer focus holds, the deeper the event penetrates. */
  var RING_C = 553;              // 2*pi*88, rounded — matches r="88" in the markup
  function detectorSVG() {
    return '' +
      '<svg class="focus-atom" id="focus-atom" viewBox="0 0 200 200" role="img"' +
           ' aria-label="Focus progress — collider detector cross-section inside the timing ring">' +
        // gradient for the progress arc — both stops are tokens, so dark theme re-derives
        '<defs><linearGradient id="fa-grad" x1="0" y1="0" x2="1" y2="1">' +
          '<stop offset="0" stop-color="var(--accent)"/>' +
          '<stop offset="1" stop-color="var(--accent-deep)"/>' +
        '</linearGradient></defs>' +
        // the beamline: two dashed halves aimed at the IP; while running the
        // css streams their dashes toward the centre from both sides
        '<line class="det-beam det-beam-l" x1="10" y1="100" x2="96" y2="100"/>' +
        '<line class="det-beam det-beam-r" x1="190" y1="100" x2="104" y2="100"/>' +
        '<circle class="fa-track" cx="100" cy="100" r="88"/>' +
        '<circle class="fa-ring"  cx="100" cy="100" r="88" id="fa-ring"/>' +
        // ——— the detector, outside in (segment wedges are css dasharrays) ———
        // muon return yoke: two staggered rings of chamber segments + the solenoid coil
        '<g class="det-mu">' +
          '<circle class="det-yoke1" cx="100" cy="100" r="76"/>' +
          '<circle class="det-yoke2" cx="100" cy="100" r="66"/>' +
          '<circle class="det-sol"   cx="100" cy="100" r="57"/>' +
        '</g>' +
        // calorimeters: coarse HCAL wedges around a finely segmented ECAL crystal ring
        '<g class="det-cal">' +
          '<circle class="det-hcal" cx="100" cy="100" r="48"/>' +
          '<circle class="det-ecal" cx="100" cy="100" r="38"/>' +
        '</g>' +
        // inner tracker: dotted silicon barrels around the beam pipe
        '<g class="det-trk">' +
          '<circle class="det-t" cx="100" cy="100" r="16"/>' +
          '<circle class="det-t" cx="100" cy="100" r="24"/>' +
          '<circle class="det-t" cx="100" cy="100" r="32"/>' +
        '</g>' +
        '<circle class="det-pipe" cx="100" cy="100" r="5"/>' +
        '<circle class="det-core" cx="100" cy="100" r="2.6"/>' +
        '<text class="det-label" x="100" y="121">IP</text>' +
        // comet head riding the arc tip: the wrapper rotates by --fa-tip (paintAtom)
        // around the mark centre; the dot itself sits at 12 o'clock (progress 0)
        '<g class="fa-tipwrap"><circle class="fa-tip" cx="100" cy="12" r="4.5"/></g>' +
      '</svg>';
  }
  // progress in [0,1]; orbitCount 0..3 (how many detector layers are lit); complete adds a pulse.
  function paintAtom(progress, orbitCount, complete) {
    var atom = document.getElementById('focus-atom');
    var ring = document.getElementById('fa-ring');
    if (!atom || !ring) return;
    ring.style.strokeDasharray = RING_C;
    ring.style.strokeDashoffset = Math.max(0, Math.min(RING_C, RING_C * (1 - progress)));
    // the comet head tracks the arc tip; CSS transitions the rotation between ticks
    atom.style.setProperty('--fa-tip', (360 * Math.max(0, Math.min(1, progress))).toFixed(1) + 'deg');
    atom.classList.toggle('orbits-1', orbitCount >= 1);
    atom.classList.toggle('orbits-2', orbitCount >= 2);
    atom.classList.toggle('orbits-3', orbitCount >= 3);
    // BUNDLE D: keep is-running while paused so the drift/breathe animations stay
    // applied, then is-paused holds them in place (animation-play-state) instead
    // of resetting the spark wheel to its start angle. The ring is frozen too
    // because progress is computed from the frozen elapsedSec().
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

  /* ——— HUD corner telemetry (instrument voice; painted by paintHud) ——— */
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function dayStamp() {
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  function hudHTML() {
    return '<div class="focus-hud" aria-hidden="true">' +
      '<div class="fhud fhud-tl"><span id="fhud-run">Run ' + dayStamp() + '</span><br>' +
        '<span id="fhud-state">Standby</span></div>' +
      '<div class="fhud fhud-tr"><span id="fhud-clock">--:--:--</span></div>' +
      '<div class="fhud fhud-bl"><span id="fhud-evt">Evt 000000</span></div>' +
      '<div class="fhud fhud-br"><span id="fhud-today">Today 0:00</span></div>' +
    '</div>';
  }
  // Every second (and on transitions): run state, wall clock, fx event
  // counter, today's credited time. All four corners are aria-hidden
  // flavour — the real readouts live in the stage and stat tiles.
  function paintHud(on, paused) {
    var run = document.getElementById('fhud-run');
    if (run) run.textContent = 'Run ' + dayStamp();   // stays honest across midnight
    var stEl = document.getElementById('fhud-state');
    if (stEl) stEl.textContent = paused ? 'Held' : (on ? 'Beam on' : 'Standby');
    var ck = document.getElementById('fhud-clock');
    if (ck) {
      var d = new Date();
      ck.textContent = pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
    }
    var ev = document.getElementById('fhud-evt');
    if (ev && PGRE.focusFx && PGRE.focusFx.events) {
      var n = String(PGRE.focusFx.events());
      while (n.length < 6) n = '0' + n;
      ev.textContent = 'Evt ' + n;
    }
    var td = document.getElementById('fhud-today');
    if (td) td.textContent = 'Today ' + fmtClock(PGRE.studyTime.todaySec());
  }

  /* ——— render: static skeleton the mount() drives ——— */
  function render() {
    return '' +
    '<div class="focus-page" id="focus-page">' +
      '<div class="focus-ambient" aria-hidden="true"></div>' +
      hudHTML() +
      '<div class="focus-stage">' +
        '<div class="focus-sec-tag">&sect; F5 / Focus run</div>' +
        '<div class="focus-reward">' + detectorSVG() + '</div>' +
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
        // .focus-quiet: the "everything else" band. One stable wrapper (never
        // rebuilt by the per-second paints inside it) so zen mode can fade and
        // collapse it as a unit with a CSS display transition.
        '<div class="focus-quiet" id="focus-quiet">' +
          '<div class="focus-keys muted"><span class="key-hint">Space</span> start / pause · ' +
            'tap the clock to pause · <span class="key-hint">Esc</span> exit zen</div>' +
          statsHTML() +
          recentHTML() +
        '</div>' +
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
    if (page) {
      page.classList.toggle('is-paused', paused);
      // is-running drives the live dressing: warmer ambient glow, breathing
      // clock (css). Dropped while paused so the page visibly "holds".
      page.classList.toggle('is-running', on && !paused);
      // ambient canvas fx (floating glyphs + cursor trail) run with the session;
      // frozen on pause, faded out by css when is-running drops
      if (PGRE.focusFx) PGRE.focusFx.sync(on && !paused, page);
    }
    // The oversized clock doubles as a pause/resume control while a session is
    // live (mount() wires the click/keydown); reflect that in its affordances.
    if (clock) {
      clock.classList.toggle('is-live', on);
      if (on) {
        var act = paused ? 'Resume — click or press Space' : 'Pause — click or press Space';
        clock.setAttribute('role', 'button');
        clock.setAttribute('tabindex', '0');
        clock.setAttribute('title', act);
        clock.setAttribute('aria-label', act);
      } else {
        clock.removeAttribute('role');
        clock.removeAttribute('tabindex');
        clock.removeAttribute('title');
        clock.removeAttribute('aria-label');
      }
    }

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

    // corner telemetry ticks every paint (its wall clock moves even when idle)
    paintHud(on, paused);
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
    if (!wasOn && nowOn) igniteStart();  // started from the top-bar quick-start while this page is open
    wasOn = nowOn;
    if (nowOn) lastRunLen = (PGRE.store.state.focusSessions || []).length; // pre-append baseline for the next stop
    paintLive();
  }

  /* One-shot ignition burst on the reward mark when a session starts (css
     .ignite). remove -> reflow -> add so back-to-back starts re-fire it; a
     stale celebrate class is dropped so the two bursts never stack. */
  function igniteStart() {
    var reward = document.querySelector('#focus-page .focus-reward');
    if (!reward) return;
    reward.classList.remove('celebrate');
    reward.classList.remove('ignite');
    void reward.offsetWidth;
    reward.classList.add('ignite');
    // spark shower from the mark on start — sync first so the fx canvas exists
    // even when ignite runs ahead of the next paintLive()
    var page = document.getElementById('focus-page');
    if (PGRE.focusFx && page) { PGRE.focusFx.sync(true, page); PGRE.focusFx.burst(); }
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
      // celebration burst: expanding rings + atom bounce (css .celebrate);
      // remove → reflow → add so back-to-back completions re-fire it
      var reward = document.querySelector('#focus-page .focus-reward');
      if (reward) {
        reward.classList.remove('ignite');       // never let the start burst stack on this one
        reward.classList.remove('celebrate');
        void reward.offsetWidth;
        reward.classList.add('celebrate');
      }
      if (sub) { sub.textContent = 'Goal complete — ' + last.goalMin + ' min logged.'; sub.dataset.flash = '1'; }
    } else if (last) {
      if (sub) { sub.textContent = 'Session logged — ' + fmtClock(last.seconds) + '.'; sub.dataset.flash = '1'; }
    }
    if (sub) setTimeout(function () { if (sub.isConnected) { delete sub.dataset.flash; } }, 6000);
  }

  /* ——— zen mode (ephemeral body class; cleaned up on leaving #/focus) ——— */
  function zenOn() { return document.body.classList.contains('focus-zen'); }
  var zenEnteredAt = 0;   // suppresses the mouse-move peek right after entering (the
                          // pointer inevitably moves off the just-clicked button)
  var peekT = null;
  function setZen(on) {
    document.body.classList.toggle('focus-zen', !!on);
    if (on) zenEnteredAt = Date.now();
    else {
      // leave cleanly: no lingering peek state or pending un-peek timer
      var page = document.getElementById('focus-page');
      if (page) page.classList.remove('zen-peek');
      if (peekT) { clearTimeout(peekT); peekT = null; }
    }
    syncZen();
  }
  /* Pointer activity in zen briefly surfaces the faded controls (css .zen-peek),
     video-player style, then they sink away again after a beat of stillness. */
  function zenPeek() {
    if (!zenOn()) return;
    if (Date.now() - zenEnteredAt < 1200) return;   // let the enter-fade finish first
    var page = document.getElementById('focus-page');
    if (!page) return;
    page.classList.add('zen-peek');
    if (peekT) clearTimeout(peekT);
    peekT = setTimeout(function () {
      peekT = null;
      if (page.isConnected) page.classList.remove('zen-peek');
    }, 2600);
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

    // keyboard shortcuts (Space / Esc) — one document listener for the app's life
    if (!keyBound) { document.addEventListener('keydown', onKey); keyBound = true; }

    // the big clock is a pause/resume control while live (affordances set in
    // paintLive); Enter/Space here follow the role=button convention
    var clockEl = document.getElementById('focus-clock');
    if (clockEl) {
      clockEl.addEventListener('click', toggleHold);
      clockEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleHold(); }
      });
    }

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

    // zen: pointer activity briefly surfaces the faded controls (no-op outside zen)
    page.addEventListener('mousemove', zenPeek);
    page.addEventListener('touchstart', zenPeek, { passive: true });

    // parallax (Antigravity-style): while running, the cursor position feeds
    // --fxx/--fxy in [-1,1]; css tilts the reward mark toward the pointer.
    // Reduced-motion users are covered twice: the css transform is disabled
    // there, and the vars are inert without it.
    page.addEventListener('mousemove', function (e) {
      if (!page.classList.contains('is-running')) return;
      var r = page.getBoundingClientRect();
      if (!r.width || !r.height) return;
      page.style.setProperty('--fxx', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
      page.style.setProperty('--fxy', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
    });
    page.addEventListener('mouseleave', function () {
      page.style.setProperty('--fxx', '0');
      page.style.setProperty('--fxy', '0');
    });

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
        wasOn = true;                   // set before faceTick, so ignite fires here instead
        igniteStart();
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
      // Start (page hero or the top-bar quick-start) blurs this input first, so the number read
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
  // 'Start focus' AND the always-visible top-bar quick-start (#focus-toggle) are on screen
  // together. The top-bar button calls PGRE.timer.start() blind; this lets it adopt the
  // page's picked goal so both Start controls agree. Returns null when the page is gone
  // (element absent) so the top-bar widget keeps its classic open-ended stopwatch elsewhere.
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
