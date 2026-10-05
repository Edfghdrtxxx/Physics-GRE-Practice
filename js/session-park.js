/* Parked sessions — the top-bar "N unfinished" count button and its drawer.
   A session is parked when the captain left it mid-flight: the mistake drill
   (sessionStorage['pgre-mistake-drill'], js/view-mistakes.js), a practice set
   ('pgre-practice-session', js/view-practice.js), a Recall study queue
   (state.formulaStudy), or an unfinished mock (examEngine.active()).

   Everything here is READ-ONLY with respect to the durable store and every
   snapshot: painting must never write — notably it must not call
   view-formulas' rehydrateSavedStudy, which reconciles and saves. The one
   thing this module writes is its own localStorage['pgre-park-ignored'] list
   (see ignoreBand): Ignore takes a session off the drawer and the dashboard
   reminder and leaves its snapshot — the progress — untouched. Each kind
   has at most one slot; starting a new session of a kind replaces that kind's
   slot (handled by the owning view), so nothing accumulates.

   The drawer lists one band per parked session. Continue (or the band itself)
   goes to that session's route; the caret beside Continue opens a one-item
   menu, Ignore (the practice band first arms 'pgre-practice-resume' so
   view-practice resumes onto the exact question instead of showing its resume
   card). The Home dashboard shows a dismissible reminder line fed by the same
   collect() data; dismissing is keyed to the parked-set signature, so a
   dismiss stays dismissed until the parked set itself changes. Both surfaces
   repaint from PGRE.route and from the owning views' save points via paint(). */
window.PGRE = window.PGRE || {};

PGRE.sessionPark = (function () {
  var DRILL_KEY = 'pgre-mistake-drill';
  var PRACTICE_KEY = 'pgre-practice-session';
  var RESUME_KEY = 'pgre-practice-resume';   // one-shot flag consumed by view-practice
  var DISMISS_KEY = 'pgre-park-dismissed';
  var IGNORE_KEY = 'pgre-park-ignored';      // localStorage: ["kind:id", ...]

  var bound = false;

  function read(key) {
    var raw = null;
    try { raw = sessionStorage.getItem(key); } catch (e) { return null; }
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e2) { return null; }
  }

  function answeredRows(list) {
    var n = 0;
    (list || []).forEach(function (a) { if (a && a.qid != null) n++; });
    return n;
  }

  function bandKey(b) { return b.kind + ':' + b.id; }

  function ignoredKeys() {
    var raw = null;
    try { raw = localStorage.getItem(IGNORE_KEY); } catch (e) { return []; }
    if (!raw) return [];
    try {
      var list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch (e2) { return []; }
  }

  /* The bands the captain has not ignored. An ignore is keyed to the session's
     own id, so a replaced or newly parked session of that kind lists again. */
  function collect() {
    var ignored = ignoredKeys();
    if (!ignored.length) return collectAll();
    return collectAll().filter(function (b) { return ignored.indexOf(bandKey(b)) < 0; });
  }

  /* Stop listing and reminding about one parked session. Its snapshot is not
     touched: the session's own page still offers to resume it. Keys of
     sessions that no longer exist are dropped here so the list cannot grow. */
  function ignoreBand(b) {
    var live = collectAll().map(bandKey);
    var keep = ignoredKeys().filter(function (k) { return live.indexOf(k) >= 0; });
    if (keep.indexOf(bandKey(b)) < 0) keep.push(bandKey(b));
    try { localStorage.setItem(IGNORE_KEY, JSON.stringify(keep)); } catch (e) { return false; }
    paint();
    var line = document.getElementById('parked-reminder');
    if (line) {
      var fresh = reminderHTML();
      if (fresh) line.outerHTML = fresh;
      else if (line.remove) line.remove();
    }
    return true;
  }

  /* One band per real parked slot, or none. Read-only. */
  function collectAll() {
    var bands = [];

    var drill = read(DRILL_KEY);
    if (drill && Array.isArray(drill.ids) && drill.ids.length) {
      var dDone = answeredRows(drill.results);
      bands.push({
        kind: 'mistakes',
        label: 'Mistake drill',
        detail: dDone + ' of ' + drill.ids.length + ' answered' +
          (drill.skipped ? ' · ' + drill.skipped + ' skipped' : ''),
        hash: '#/mistakes/drill',
        id: drill.sid || ''
      });
    }

    var pr = read(PRACTICE_KEY);
    if (pr && Array.isArray(pr.ids) && pr.ids.length) {
      var pDone = answeredRows(pr.answers);
      var name = 'Practice';
      if (pr.label) name = String(pr.label);
      else if (pr.learnDrill) name = 'Learn transfer';
      else if (pr.topicId && pr.topicId !== 'custom') {
        var pt = PGRE.topicById ? PGRE.topicById(pr.topicId) : null;
        name = 'Practice · ' + (pt ? pt.name : 'All topics');
      }
      bands.push({
        kind: 'practice',
        label: name,
        detail: pDone >= pr.ids.length
          ? 'All answered — finish to see your results'
          : pDone + ' of ' + pr.ids.length + ' answered',
        hash: '#/practice/' + (pr.topicId || 'all') + (pr.filter ? '/' + pr.filter : ''),
        id: pr.sid || ''
      });
    }

    // Recall study: peek at the saved queue only. rehydrateSavedStudy can
    // reconcile and WRITE the store — a painter must never call it.
    var fs = (PGRE.store && PGRE.store.state && PGRE.store.state.formulaStudy) || null;
    if (fs && PGRE.srs && fs.date === PGRE.srs.today() &&
        Array.isArray(fs.queueIds) && fs.queueIds.length) {
      bands.push({
        kind: 'formulas',
        label: 'Recall study',
        detail: fs.queueIds.length + (fs.queueIds.length === 1 ? ' card left' : ' cards left'),
        hash: '#/formulas',
        id: fs.id || ''
      });
    }

    var act = (PGRE.examEngine && typeof PGRE.examEngine.active === 'function')
      ? PGRE.examEngine.active() : null;
    if (act && !act.submittedAt && act.order && act.order.length) {
      var eDone = act.answers ? Object.keys(act.answers).length : 0;
      bands.push({
        kind: 'exam',
        label: 'Mock exam',
        detail: eDone + ' of ' + act.order.length + ' answered' + (act.paused ? ' · paused' : ''),
        hash: '#/exam/run',
        id: act.id || ''
      });
    }

    return bands;
  }

  /* Stable identity of the parked set for the dismissible dashboard reminder.
     Kind + the session's own id: progress within a parked session keeps the
     same signature (a dismissed line stays dismissed), while a replaced or
     newly parked session changes it and brings the reminder back. */
  function signature(bands) {
    return (bands || collect()).map(bandKey).sort().join('|');
  }

  function dismissedSig() {
    try { return sessionStorage.getItem(DISMISS_KEY) || ''; } catch (e) { return ''; }
  }

  function wrapEl() { return document.getElementById('session-park'); }
  function btnEl() { return document.getElementById('parked-btn'); }
  function panelEl() { return document.getElementById('parked-panel'); }

  function closePanel() {
    var panel = panelEl(), btn = btnEl();
    if (panel) panel.hidden = true;
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function openPanel() {
    var panel = panelEl(), btn = btnEl();
    if (!panel || !btn) return;
    paintBands(collect());
    panel.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    var first = panel.querySelector('.parked-continue');
    if (first) first.focus();
  }

  function paintBands(bands) {
    var panel = panelEl();
    if (!panel) return;
    var h = '<div class="parked-panel-title">Unfinished sessions</div>';
    bands.forEach(function (b) {
      var name = PGRE.ui.esc(b.label);
      h += '<div class="parked-band" data-kind="' + b.kind + '">' +
        '<span class="parked-band-text">' +
          '<span class="parked-band-label">' + name + '</span>' +
          '<span class="parked-band-detail">' + PGRE.ui.esc(b.detail) + '</span>' +
        '</span>' +
        '<span class="parked-split">' +
          '<button type="button" class="parked-continue" data-park-act="continue">Continue</button>' +
          '<button type="button" class="parked-caret" data-park-act="menu" aria-haspopup="true" ' +
            'aria-expanded="false" aria-label="More options for ' + name + '"></button>' +
          '<span class="parked-menu">' +
            '<button type="button" class="parked-ignore" data-park-act="ignore" ' +
              'title="Stop listing and reminding about this session. Its progress is kept.">' +
              'Ignore</button>' +
          '</span>' +
        '</span>' +
        '</div>';
    });
    panel.innerHTML = h;
  }

  /* Navigate to a band's session. A click on the band for the route already on
     screen just closes the drawer — except practice, which still re-routes so
     its armed resume flag can turn the resume card into the real question. */
  function goBand(b) {
    closePanel();
    if (b.kind === 'practice') {
      try { sessionStorage.setItem(RESUME_KEY, '1'); } catch (e) { /* storage blocked */ }
    }
    if (location.hash === b.hash && b.kind !== 'practice') return;
    if (location.hash === b.hash) { if (PGRE.route) PGRE.route(); return; }
    location.hash = b.hash;
  }

  /* The single dashboard reminder line. Dismissal sticks until the parked set
     changes; a fresh parked set (new signature) brings it back. */
  function reminderHTML(bands) {
    bands = bands || collect();
    if (!bands.length) return '';
    if (dismissedSig() === signature(bands)) return '';
    var msg = bands.length === 1
      ? 'You left ' + bands[0].label + ' unfinished — ' + bands[0].detail + '.'
      : 'You left ' + bands.length + ' sessions unfinished — pick up where you stopped.';
    return '<div class="parked-reminder" id="parked-reminder" role="status">' +
      '<span class="parked-reminder-text">' + PGRE.ui.esc(msg) + '</span>' +
      '<button type="button" class="btn btn-primary btn-sm" data-park-resume>Resume</button>' +
      '<button type="button" class="parked-dismiss" data-park-dismiss ' +
        'aria-label="Dismiss reminder">Dismiss</button></div>';
  }

  /* Delegated once on #view (the dashboard's render target): Resume opens the
     single parked session directly, or the drawer when several are parked. */
  function wireDashboard() {
    var view = document.getElementById('view');
    if (!view || view._pgreParkBound) return;
    view._pgreParkBound = true;
    view.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('[data-park-resume],[data-park-dismiss]') : null;
      if (!t || !view.contains(t)) return;
      if (t.hasAttribute('data-park-dismiss')) {
        try { sessionStorage.setItem(DISMISS_KEY, signature()); } catch (e2) { /* storage blocked */ }
        var line = document.getElementById('parked-reminder');
        if (line) line.remove();
      } else {
        var bands = collect();
        if (bands.length === 1) goBand(bands[0]);
        else if (bands.length > 1) openPanel();
      }
    });
  }

  function bind() {
    if (bound) return;
    bound = true;
    var btn = btnEl();
    if (btn) {
      btn.addEventListener('click', function () {
        var panel = panelEl();
        if (panel && !panel.hidden) closePanel();
        else openPanel();
      });
    }
    var panel = panelEl();
    if (panel) {
      panel.addEventListener('click', function (e) {
        var t = e.target && e.target.closest ? e.target.closest('.parked-band') : null;
        if (!t || !panel.contains(t)) return;
        var actEl = e.target.closest('[data-park-act]');
        var act = actEl ? actEl.getAttribute('data-park-act') : 'continue';
        if (act === 'menu') {
          // Hover opens the menu through CSS; a click pins it open for touch
          // and keyboard.
          var menu = actEl.parentNode.querySelector('.parked-menu');
          var open = menu.classList.toggle('is-open');
          actEl.setAttribute('aria-expanded', open ? 'true' : 'false');
          return;
        }
        var bands = collect();
        for (var i = 0; i < bands.length; i++) {
          if (bands[i].kind !== t.getAttribute('data-kind')) continue;
          if (act === 'ignore') {
            ignoreBand(bands[i]);
            var next = panel.querySelector('.parked-continue') || btnEl();
            if (next && !panel.hidden) next.focus();
          } else goBand(bands[i]);
          return;
        }
      });
    }
    document.addEventListener('click', function (e) {
      var w = wrapEl();
      // Ignore repaints the drawer, which detaches the clicked button before
      // this runs; a detached target is not a click outside.
      if (e.target && e.target.isConnected === false) return;
      if (w && !w.contains(e.target)) closePanel();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var panel = panelEl();
      if (panel && !panel.hidden) {
        closePanel();
        var b = btnEl();
        if (b) b.focus();
      }
    });
  }

  /* Repaint the button + open panel. Called from PGRE.route on every
     navigation and from the owning views whenever a slot is written. */
  function paint() {
    var wrap = wrapEl(), btn = btnEl();
    if (!wrap || !btn) return;
    bind();
    var bands = collect();
    if (!bands.length) {
      wrap.hidden = true;
      closePanel();
      return;
    }
    wrap.hidden = false;
    btn.textContent = bands.length === 1 ? '1 unfinished' : bands.length + ' unfinished';
    var panel = panelEl();
    if (panel && !panel.hidden) paintBands(bands);
  }

  return {
    DRILL_KEY: DRILL_KEY,
    PRACTICE_KEY: PRACTICE_KEY,
    RESUME_KEY: RESUME_KEY,
    IGNORE_KEY: IGNORE_KEY,
    collect: collect,
    collectAll: collectAll,
    ignoreBand: ignoreBand,
    signature: signature,
    paint: paint,
    closePanel: closePanel,
    reminderHTML: reminderHTML,
    wireDashboard: wireDashboard
  };
})();
