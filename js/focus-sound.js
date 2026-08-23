/* Focus-timer sound effects — selectable SFX for session start / end.
   Pure decision logic (resolve / shouldPlay / get|setChoice) is free of
   AudioContext so Node unit tests can load this module. Playback uses a short
   Web Audio synthesis path (no network assets) and is fully try/catch-wrapped
   so a missing or blocked audio backend never touches timer crediting. */
window.PGRE = window.PGRE || {};

PGRE.focusSound = (function () {
  var DEFAULT = 'off';

  // At least four distinct playable voices + an explicit off. Labels are
  // fixed product copy (never user-influenced → no XSS surface in the chips).
  var CATALOG = [
    { id: 'off',   label: 'Off' },
    { id: 'chime', label: 'Chime' },
    { id: 'soft',  label: 'Soft beep' },
    { id: 'bell',  label: 'Bell' },
    { id: 'click', label: 'Click' }
  ];

  var VALID = Object.create(null);
  for (var i = 0; i < CATALOG.length; i++) VALID[CATALOG[i].id] = CATALOG[i];

  var ctx = null;            // lazy AudioContext
  var lastPlay = null;       // { id, moment, played, error? } — test/observe
  var playHook = null;       // optional test double: function(id, moment)

  function list() {
    // return a shallow copy so callers cannot mutate the catalog
    return CATALOG.map(function (s) { return { id: s.id, label: s.label }; });
  }

  function isValid(id) {
    return typeof id === 'string' && !!VALID[id];
  }

  /* Map any stored / user-supplied value to a safe catalog id.
     Missing, empty, non-string, or unknown → DEFAULT ('off'). */
  function resolve(id) {
    if (id == null || id === '') return DEFAULT;
    if (typeof id !== 'string') return DEFAULT;
    return isValid(id) ? id : DEFAULT;
  }

  function getChoice() {
    try {
      var s = (window.PGRE && PGRE.store && PGRE.store.state && PGRE.store.state.settings) || null;
      var raw = s && s.focusSound;
      var resolved = resolve(raw);
      // Coerce corrupt stored values in place so export/import stay clean
      // (migrate only backfills missing keys; runtime is the other gate).
      if (s && raw !== resolved) {
        try {
          s.focusSound = resolved;
          if (typeof PGRE.store.save === 'function') PGRE.store.save();
        } catch (e2) { /* ignore persist failure */ }
      }
      return resolved;
    } catch (e) {
      return DEFAULT;
    }
  }

  function setChoice(id) {
    var resolved = resolve(id);
    try {
      if (!window.PGRE || !PGRE.store || !PGRE.store.state) return resolved;
      if (!PGRE.store.state.settings || typeof PGRE.store.state.settings !== 'object') {
        PGRE.store.state.settings = {};
      }
      PGRE.store.state.settings.focusSound = resolved;
      if (typeof PGRE.store.save === 'function') PGRE.store.save();
    } catch (e) { /* persistence failure must not throw to the UI */ }
    return resolved;
  }

  function shouldPlay(id) {
    var c = (id === undefined) ? getChoice() : resolve(id);
    return c !== DEFAULT && c !== 'off';
  }

  function getLastPlay() { return lastPlay; }

  /* Test seam: replace the audio backend. Pass null to restore synthesis. */
  function setPlayHook(fn) {
    playHook = (typeof fn === 'function') ? fn : null;
  }

  function ensureCtx() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    return ctx;
  }

  /* Resume a suspended context (autoplay policy). Safe no-op if unavailable. */
  function resumeCtx(c) {
    if (c && c.state === 'suspended' && typeof c.resume === 'function') {
      try { c.resume(); } catch (e) { /* ignore */ }
    }
  }

  function tone(c, freq, t0, dur, type, gainPeak, freqEnd) {
    var o = c.createOscillator();
    var g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (typeof freqEnd === 'number') {
      o.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gainPeak), t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  function noiseBurst(c, t0, dur, gainPeak) {
    // Short filtered noise for the "click" voice — no external assets.
    var n = Math.max(1, Math.floor(c.sampleRate * dur));
    var buf = c.createBuffer(1, n, c.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var src = c.createBufferSource();
    src.buffer = buf;
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gainPeak), t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    var f = c.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 1200;
    src.connect(f);
    f.connect(g);
    g.connect(c.destination);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  /* moment: 'start' | 'end' | 'preview' — slight shape differences only. */
  function synthPlay(id, moment) {
    var c = ensureCtx();
    if (!c) return;
    resumeCtx(c);
    var t0 = c.currentTime + 0.01;
    var soft = moment === 'preview';
    var peak = soft ? 0.08 : 0.14;

    if (id === 'chime') {
      // Two-note ascending chime
      tone(c, 523.25, t0, 0.18, 'sine', peak);           // C5
      tone(c, 783.99, t0 + 0.12, 0.28, 'sine', peak * 0.85); // G5
    } else if (id === 'soft') {
      // Single low soft beep
      tone(c, 392, t0, soft ? 0.12 : 0.22, 'sine', peak * 0.7);
    } else if (id === 'bell') {
      // Fundamental + partials (bell-ish)
      tone(c, 660, t0, 0.45, 'sine', peak);
      tone(c, 1320, t0, 0.3, 'sine', peak * 0.35);
      tone(c, 1760, t0, 0.2, 'triangle', peak * 0.15);
    } else if (id === 'click') {
      noiseBurst(c, t0, 0.05, peak * 1.1);
      tone(c, 1800, t0, 0.04, 'square', peak * 0.25, 600);
    }
  }

  /* Play the user's chosen sound for a focus-session moment.
     Never throws. Returns a small result object for tests / debugging. */
  function play(moment) {
    moment = moment || 'end';
    lastPlay = null;
    try {
      var id = getChoice();
      if (!shouldPlay(id)) {
        lastPlay = { id: id, moment: moment, played: false };
        return lastPlay;
      }
      lastPlay = { id: id, moment: moment, played: true };
      if (playHook) {
        playHook(id, moment);
      } else {
        synthPlay(id, moment);
      }
      return lastPlay;
    } catch (e) {
      lastPlay = { id: resolve(null), moment: moment, played: false, error: true };
      return lastPlay;
    }
  }

  /* Convenience: play current choice as a short preview (chip click).
     Also warms/resumes AudioContext under the user gesture so a later
     goal-complete end chime (tick-driven, no gesture) is more likely to
     succeed under browser autoplay policy. */
  function preview() {
    try {
      var c = ensureCtx();
      resumeCtx(c);
    } catch (e) { /* ignore */ }
    return play('preview');
  }

  return {
    DEFAULT: DEFAULT,
    list: list,
    isValid: isValid,
    resolve: resolve,
    getChoice: getChoice,
    setChoice: setChoice,
    shouldPlay: shouldPlay,
    play: play,
    preview: preview,
    getLastPlay: getLastPlay,
    setPlayHook: setPlayHook
  };
})();
