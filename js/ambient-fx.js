/* Site-wide ambient particle field — a sparse chamber of drifting charged
   particles behind all content. Each particle carries a charge, so a virtual
   solenoid field curls its track; the cursor acts as a moving charge with a
   soft 1/(d²+s²) falloff that attracts or repels depending on sign. Close
   particles connect with hairline "detector" links. Clicking injects a short
   radial burst of a few particles from the cursor.

   House rules honoured here (pattern from js/focus-fx.js):
   - The canvas is position:fixed, z-index 0, pointer-events:none — it can
     never steal a click; pointer tracking rides on window listeners.
   - Colours are read live from css custom properties (--ink, --ink-3,
     --line, --accent) and re-read whenever html[data-theme] flips, so dark
     mode re-derives with no repaint logic here.
   - prefers-reduced-motion: reduce → the loop never starts; a single static
     sparse field is painted instead (and re-painted on theme change/resize).
   - The rAF loop pauses on document.hidden and cancels in stop().
   - No allocations in the frame loop: particle state lives in preallocated
     typed arrays, trail history in a per-particle ring buffer.
   - No glows, no blur, no text: alpha stays ≤ .5 for particles and ≤ .15 for
     links, so it reads as texture under the cards, never as noise.

   MotionCore drives intensity: PGRE.ambient.setIntensity('calm') during
   #/exam/run, 'normal' elsewhere, 'off' to clear the layer entirely. */
window.PGRE = window.PGRE || {};
PGRE.ambient = (function () {
  var canvas = null, ctx = null;
  var raf = 0, started = false, level = 'normal';
  var t0 = 0, W = 0, H = 0;

  /* ——— preallocated particle pool (the frame loop never allocates) ——— */
  var MAXP = 120, TRAILN = 4;
  var px = new Float32Array(MAXP), py = new Float32Array(MAXP);
  var pvx = new Float32Array(MAXP), pvy = new Float32Array(MAXP);
  var pq = new Float32Array(MAXP);        // charge, -1..1: sign sets curl direction
  var pr = new Float32Array(MAXP);        // dot radius, px
  var pa = new Float32Array(MAXP);        // base alpha, 0.25..0.5
  var pph = new Float32Array(MAXP);       // wander phase
  var pcol = new Uint8Array(MAXP);        // palette index
  var phead = new Uint8Array(MAXP);       // trail ring-buffer write head
  var ptrail = new Float32Array(MAXP * TRAILN * 2);
  var active = 0;                         // particles currently simulated + drawn

  /* ——— click-burst pool (separate, short-lived) ——— */
  var MAXB = 48;
  var bx = new Float32Array(MAXB), by = new Float32Array(MAXB);
  var bvx = new Float32Array(MAXB), bvy = new Float32Array(MAXB);
  var bt = new Float32Array(MAXB), blife = new Float32Array(MAXB);

  var mouse = { x: -1e4, y: -1e4, in: false };

  /* ——— tuning ——— */
  var CURL = 1.1;          // rad/s of velocity rotation per unit charge (the B field)
  var CUR_K = 1.2e6;       // cursor charge strength: a = CUR_K·q / (d² + SOFT²)
  var CUR_SOFT = 2500;     // softening radius², px²
  var CUR_R = 280;         // influence radius, px
  var CUR_CAP = 500;       // acceleration cap, px/s²
  var V_MIN = 14, V_MAX = 90;   // speed clamp, px/s (calm scales both)
  var LINK_D = 90;         // hairline-link distance, px
  var LINK_A = 0.15;       // max link alpha (design law: texture, not noise)
  var BURST_N = 10;        // particles per click burst

  var mqReduced = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var finePointer = window.matchMedia
    ? window.matchMedia('(pointer: fine)').matches : true;

  /* palette, read from the live theme tokens and re-read on data-theme flips */
  var colors = { ink: '#141413', ink3: '#8e8b82', line: '#e6dfd8', accent: '#cc785c' };
  var themeObs = null, resizeT = 0;

  function reduced() { return !!(mqReduced && mqReduced.matches); }

  function readTokens() {
    var cs = getComputedStyle(document.documentElement);
    var t = function (name, fb) {
      var v = cs.getPropertyValue(name).trim();
      return v || fb;
    };
    colors.ink = t('--ink', '#141413');
    colors.ink3 = t('--ink-3', '#8e8b82');
    colors.line = t('--line', '#e6dfd8');
    colors.accent = t('--accent', '#cc785c');
  }

  function colorOf(i) {
    // 70% ink-3 dust, 15% ink (brighter), 15% the single coral accent
    return pcol[i] === 0 ? colors.ink3 : (pcol[i] === 1 ? colors.accent : colors.ink);
  }

  /* ——— sizing ——— */
  function sizeCanvas() {
    if (!canvas) return;
    W = window.innerWidth; H = window.innerHeight;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    retarget();
    if (reduced()) renderStatic();
  }

  /* particle count scales with viewport area; caps: ~120 desktop, ~50 mobile */
  function targetCount() {
    var cap = finePointer ? MAXP : 50;
    var n = Math.round((W * H) / 16000);
    n = Math.max(24, Math.min(cap, n));
    if (level === 'calm') n = Math.min(n, 40);
    return n;
  }

  function retarget() {
    var n = targetCount();
    while (active < n) initParticle(active++);
    active = n;
  }

  function initParticle(i) {
    px[i] = Math.random() * W;
    py[i] = Math.random() * H;
    var a = Math.random() * Math.PI * 2;
    var v = V_MIN + Math.random() * (V_MAX - V_MIN) * 0.5;
    pvx[i] = Math.cos(a) * v; pvy[i] = Math.sin(a) * v;
    pq[i] = Math.random() < 0.5 ? -1 : 1;
    pr[i] = 1.2 + Math.random() * 1.4;
    pa[i] = 0.25 + Math.random() * 0.25;
    pph[i] = Math.random() * Math.PI * 2;
    var r = Math.random();
    pcol[i] = r < 0.7 ? 0 : (r < 0.85 ? 1 : 2);
    phead[i] = 0;
    for (var k = 0; k < TRAILN; k++) {
      ptrail[(i * TRAILN + k) * 2] = px[i];
      ptrail[(i * TRAILN + k) * 2 + 1] = py[i];
    }
  }

  /* ——— simulation ——— */
  function step(dt, now) {
    var calm = level === 'calm';
    var speedScale = calm ? 0.5 : 1;
    var vMax = V_MAX * speedScale, vMin = V_MIN * speedScale;
    var i, dx, dy, d2, d, f, sp2, th, c, s, nvx, nvy;

    for (i = 0; i < active; i++) {
      // solenoid curl: rotate the velocity by q·B·dt — speed is conserved,
      // so tracks bend instead of spiralling in
      th = pq[i] * CURL * dt * speedScale;
      c = Math.cos(th); s = Math.sin(th);
      nvx = pvx[i] * c - pvy[i] * s;
      nvy = pvx[i] * s + pvy[i] * c;
      pvx[i] = nvx; pvy[i] = nvy;

      // gentle wander so the field never freezes into rings
      pvx[i] += Math.cos(now / 1000 * 0.7 + pph[i]) * 8 * dt;
      pvy[i] += Math.sin(now / 1000 * 0.9 + pph[i]) * 8 * dt;

      // cursor as a moving charge: like signs repel, opposite attract;
      // calm mode (the exam) switches the reaction off entirely
      if (!calm && mouse.in) {
        dx = px[i] - mouse.x; dy = py[i] - mouse.y;
        d2 = dx * dx + dy * dy;
        if (d2 < CUR_R * CUR_R) {
          d = Math.sqrt(d2) + 0.001;
          f = CUR_K * pq[i] / (d2 + CUR_SOFT);
          if (f > CUR_CAP) f = CUR_CAP; else if (f < -CUR_CAP) f = -CUR_CAP;
          pvx[i] += (dx / d) * f * dt;
          pvy[i] += (dy / d) * f * dt;
        }
      }

      // light drag toward the clamp band, then clamp speed both ways
      sp2 = pvx[i] * pvx[i] + pvy[i] * pvy[i];
      if (sp2 > vMax * vMax) {
        f = vMax / Math.sqrt(sp2);
        pvx[i] *= f; pvy[i] *= f;
      } else if (sp2 < vMin * vMin && sp2 > 0.01) {
        f = vMin / Math.sqrt(sp2);
        pvx[i] *= f; pvy[i] *= f;
      }

      px[i] += pvx[i] * dt;
      py[i] += pvy[i] * dt;

      // wrap the chamber edges
      if (px[i] < -20) px[i] = W + 18; else if (px[i] > W + 20) px[i] = -18;
      if (py[i] < -20) py[i] = H + 18; else if (py[i] > H + 20) py[i] = -18;

      // trail ring buffer: overwrite the oldest point
      var h = phead[i];
      ptrail[(i * TRAILN + h) * 2] = px[i];
      ptrail[(i * TRAILN + h) * 2 + 1] = py[i];
      phead[i] = (h + 1) % TRAILN;
    }

    // click bursts: radial kick, exponential drag, age out
    for (i = 0; i < MAXB; i++) {
      if (blife[i] <= 0) continue;
      blife[i] -= dt;
      if (blife[i] <= 0) continue;
      var drag = Math.exp(-2.4 * dt);
      bvx[i] *= drag; bvy[i] *= drag;
      bx[i] += bvx[i] * dt;
      by[i] += bvy[i] * dt;
    }
  }

  /* ——— painting ——— */
  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    var calm = level === 'calm';
    var i, j, dx, dy, d2, k, h, p;

    // hairline detector links between close particles (alpha ≤ .15)
    ctx.lineWidth = 1;
    ctx.strokeStyle = colors.ink3;
    for (i = 0; i < active; i++) {
      for (j = i + 1; j < active; j++) {
        dx = px[i] - px[j]; dy = py[i] - py[j];
        d2 = dx * dx + dy * dy;
        if (d2 > LINK_D * LINK_D) continue;
        k = (1 - Math.sqrt(d2) / LINK_D) * LINK_A * (calm ? 0.7 : 1);
        ctx.globalAlpha = k;
        ctx.beginPath();
        ctx.moveTo(px[i], py[i]);
        ctx.lineTo(px[j], py[j]);
        ctx.stroke();
      }
    }

    // faint short trails: the last few positions as a 1px polyline
    ctx.lineCap = 'round';
    for (i = 0; i < active; i++) {
      ctx.globalAlpha = pa[i] * 0.35;
      ctx.strokeStyle = colorOf(i);
      ctx.beginPath();
      h = phead[i];                       // oldest point first
      for (k = 0; k < TRAILN; k++) {
        p = (i * TRAILN + ((h + k) % TRAILN)) * 2;
        if (k === 0) ctx.moveTo(ptrail[p], ptrail[p + 1]);
        else ctx.lineTo(ptrail[p], ptrail[p + 1]);
      }
      ctx.stroke();
    }

    // the particles themselves — tiny dots, alpha 0.25..0.5
    for (i = 0; i < active; i++) {
      ctx.globalAlpha = pa[i];
      ctx.fillStyle = colorOf(i);
      ctx.beginPath();
      ctx.arc(px[i], py[i], pr[i], 0, Math.PI * 2);
      ctx.fill();
    }

    // click burst — a brief radial spray of accent dots
    for (i = 0; i < MAXB; i++) {
      if (blife[i] <= 0) continue;
      ctx.globalAlpha = 0.5 * (blife[i] / blifeMax(i));
      ctx.fillStyle = colors.accent;
      ctx.beginPath();
      ctx.arc(bx[i], by[i], 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // burst life0 is not stored separately: recover it from the initial speed
  // band (0.5–0.9 s) — store it instead in bt[] at spawn time
  function blifeMax(i) { return bt[i]; }

  function renderStatic() {
    // reduced motion: one calm frame, never animated
    if (!ctx) return;
    retarget();
    draw(0);
  }

  /* ——— loop ——— */
  function frame(now) {
    raf = 0;
    if (!running() || !canvas || !canvas.isConnected) return;
    if (reduced()) { renderStatic(); return; }
    var dt = Math.min(0.05, (now - (t0 || now)) / 1000);   // clamp tab-switch jumps
    t0 = now;
    step(dt, now);
    draw(now);
    raf = requestAnimationFrame(frame);
  }

  function running() { return started && level !== 'off' && !document.hidden; }

  function kick() {
    if (!raf && running() && !reduced()) {
      t0 = 0;
      raf = requestAnimationFrame(frame);
    }
  }

  function haltLoop() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  /* ——— pointer feed (window-level; the canvas ignores pointer events) ——— */
  function onMove(e) {
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.in = true;
    kick();
  }
  function onLeave() { mouse.x = -1e4; mouse.y = -1e4; mouse.in = false; }
  function onDown(e) {
    // keyboard activations and synthetic el.click() report detail 0 at (0,0)
    if (!e.detail || reduced() || level !== 'normal') return;
    var x = e.clientX, y = e.clientY, n = 0;
    for (var i = 0; i < MAXB && n < BURST_N; i++) {
      if (blife[i] > 0) continue;
      var a = Math.random() * Math.PI * 2;
      var v = 90 + Math.random() * 130;
      bx[i] = x; by[i] = y;
      bvx[i] = Math.cos(a) * v; bvy[i] = Math.sin(a) * v;
      blife[i] = 0.5 + Math.random() * 0.4;
      bt[i] = blife[i];
      n++;
    }
    kick();
  }

  function onVisChange() {
    if (document.hidden) haltLoop();
    else { t0 = 0; kick(); }
  }

  function onResize() {
    if (resizeT) clearTimeout(resizeT);
    resizeT = setTimeout(function () { resizeT = 0; sizeCanvas(); }, 150);
  }

  function onReducedChange() {
    if (reduced()) { haltLoop(); renderStatic(); }
    else kick();
  }

  function onThemeChange() {
    readTokens();
    if (reduced() || !running()) renderStatic();
  }

  /* ——— listeners / observers ——— */
  function addListeners() {
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisChange);
    document.addEventListener('pointerleave', onLeave);
    if (mqReduced) {
      if (mqReduced.addEventListener) mqReduced.addEventListener('change', onReducedChange);
      else if (mqReduced.addListener) mqReduced.addListener(onReducedChange);
    }
    themeObs = new MutationObserver(onThemeChange);
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  function removeListeners() {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerdown', onDown);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVisChange);
    document.removeEventListener('pointerleave', onLeave);
    if (mqReduced) {
      if (mqReduced.removeEventListener) mqReduced.removeEventListener('change', onReducedChange);
      else if (mqReduced.removeListener) mqReduced.removeListener(onReducedChange);
    }
    if (themeObs) { themeObs.disconnect(); themeObs = null; }
    if (resizeT) { clearTimeout(resizeT); resizeT = 0; }
  }

  /* ——— public api ——— */
  function start() {
    if (started) { kick(); return; }
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'ambient-fx';
      canvas.setAttribute('aria-hidden', 'true');
      document.body.insertBefore(canvas, document.body.firstChild);
      ctx = canvas.getContext('2d');
    }
    readTokens();
    sizeCanvas();
    addListeners();
    started = true;
    kick();
    if (reduced()) renderStatic();
  }

  function stop() {
    haltLoop();
    removeListeners();
    started = false;
    mouse.in = false;
    if (ctx) ctx.clearRect(0, 0, W, H);
  }

  function setIntensity(lv) {
    if (lv !== 'off' && lv !== 'calm' && lv !== 'normal') return;
    level = lv;
    if (lv === 'off') {
      haltLoop();
      if (ctx) ctx.clearRect(0, 0, W, H);
      return;
    }
    if (started) {
      retarget();
      if (reduced()) { haltLoop(); renderStatic(); }
      else kick();
    }
  }

  /* test hook: sample live particle state without touching the render path */
  function _debug() {
    var sample = [], i;
    for (i = 0; i < Math.min(active, 8); i++) {
      sample.push([Math.round(px[i]), Math.round(py[i])]);
    }
    return { active: active, level: level, reduced: reduced(), sample: sample };
  }

  /* self-initialize behind all content once the shell exists */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  return { start: start, stop: stop, setIntensity: setIntensity, _debug: _debug };
})();
