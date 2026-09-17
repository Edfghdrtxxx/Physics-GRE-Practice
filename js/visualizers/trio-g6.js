/* Formula visualizers — G6 Lagrangian / Euler-Lagrange / canonical p */
(function (global) {
  'use strict';
  global.PGRE = global.PGRE || {};
  global.PGRE.visualizers = global.PGRE.visualizers || {};
  var PGRE = global.PGRE;
  var visualizers = PGRE.visualizers;
  var CV = PGRE.CV;
  var DrawUtils = PGRE.DrawUtils;
  var U = PGRE.VizU;
  function createStyleIfNotExists() { return; }
  function createControlStyles() { return; }
  var H = PGRE.VizH || {};
  var clamp = H.clamp;
  var formatSci = H.formatSci;
  var getPotentialColor = H.getPotentialColor;
  var initCard1Charges = H.initCard1Charges;
  var drawMarchingContours = H.drawMarchingContours;
  var initAtomLattice = H.initAtomLattice;
  var EPSILON_0 = H.EPSILON_0;
  var K_COULOMB = H.K_COULOMB;

  var CREAM = (CV && CV.colors && CV.colors.bg) || '#faf9f5';
  var INK = '#141413';
  var MUTED = '#6c6a64';
  var CORAL = '#cc785c';
  var GOLD = '#d4a017';
  var TEAL = '#5db8a6';
  var ROSE = '#e05666';
  var PANEL = 'rgba(245, 240, 232, 0.55)';
  var FRAME = 'rgba(20, 20, 19, 0.16)';
  var GRID = 'rgba(20, 20, 19, 0.06)';

  function num(v, fallback) {
    return Number.isFinite(v) ? v : fallback;
  }

  function dtSafe(dt) {
    var d = Number(dt);
    if (!Number.isFinite(d) || d < 0) return 0;
    return Math.min(d, 0.05);
  }

  function syncStageTheme() {
    var t = PGRE.vizStageTheme ? PGRE.vizStageTheme() : null;
    if (!t) return;
    CREAM = t.bg; INK = t.ink; MUTED = t.muted;
    PANEL = t.chipFade(0.55); FRAME = t.inkFade(0.16); GRID = t.grid;
  }

  function fillStage(ctx, w, h) {
    syncStageTheme();
    ctx.fillStyle = CREAM;
    ctx.fillRect(0, 0, w, h);
  }

  function legend(title, rows) {
    if (PGRE.appendVizLegend) PGRE.appendVizLegend(title, rows);
  }

  function drawDot(ctx, x, y, r, fill, ring) {
    ctx.save();
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1, r), 0, Math.PI * 2);
    ctx.fill();
    if (ring) {
      ctx.strokeStyle = ring;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    ctx.restore();
  }

  function plotBox(ctx, x, y, w, h) {
    ctx.save();
    ctx.fillStyle = PANEL;
    ctx.strokeStyle = FRAME;
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }

  function innerGrid(ctx, x, y, w, h, nx, ny) {
    ctx.save();
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var i = 1; i < nx; i++) {
      var gx = x + (i / nx) * w;
      ctx.moveTo(gx, y);
      ctx.lineTo(gx, y + h);
    }
    for (var j = 1; j < ny; j++) {
      var gy = y + (j / ny) * h;
      ctx.moveTo(x, gy);
      ctx.lineTo(x + w, gy);
    }
    ctx.stroke();
    ctx.restore();
  }

  function axisText(ctx, text, x, y, align) {
    ctx.save();
    ctx.fillStyle = MUTED;
    ctx.font = '10px Inter, -apple-system, sans-serif';
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function strokePoly(ctx, pts, color, width, dash) {
    if (!pts || pts.length < 2) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function fillPoly(ctx, pts, color) {
    if (!pts || pts.length < 3) return;
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function arrow(ctx, x1, y1, x2, y2, color, lw) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    var len = Math.hypot(dx, dy);
    if (len < 3) return;
    var ang = Math.atan2(dy, dx);
    var ah = Math.min(8, len * 0.35);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lw || 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - ah * Math.cos(ang - Math.PI / 6), y2 - ah * Math.sin(ang - Math.PI / 6));
    ctx.lineTo(x2 - ah * Math.cos(ang + Math.PI / 6), y2 - ah * Math.sin(ang + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function clipRect(ctx, x, y, w, h) {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
  }

  function fmt(v, digits) {
    var n = Number(v);
    if (!Number.isFinite(n)) return '—';
    return n.toFixed(digits == null ? 2 : digits);
  }

  function simSpeedOf(state) {
    var s = Number(state && state.simSpeed);
    if (!Number.isFinite(s) || s <= 0) return 1;
    if (s < 0.2) return 0.2;
    if (s > 3) return 3;
    return s;
  }

  function scaledDt(dt, state) {
    return dtSafe(dt) * simSpeedOf(state);
  }

  var SPEED_PARAM = {
    id: 'simSpeed',
    label: 'Simulation Speed',
    type: 'range',
    min: 0.2,
    max: 3.0,
    step: 0.2,
    value: 1.0,
    default: 1.0,
    unit: 'x'
  };

  function haloLabel(ctx, x, y, text, color, align) {
    align = align || 'left';
    ctx.save();
    ctx.font = '600 10px Inter, -apple-system, sans-serif';
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    var w = ctx.measureText(text).width;
    var bx = x;
    if (align === 'center') bx = x - w / 2;
    else if (align === 'right') bx = x - w;
    ctx.fillStyle = PGRE.vizStageTheme().chipFade(0.92);
    ctx.fillRect(bx - 3, y - 7, w + 6, 14);
    ctx.fillStyle = color || INK;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function potentialU(q, kind) {
    if (kind === 'double') {
      var z = q * q - 1;
      return 2 * z * z;
    }
    if (kind === 'cosine') return 1 - Math.cos(q);
    return 0.5 * q * q;
  }

  function potentialDU(q, kind) {
    if (kind === 'double') return 8 * q * (q * q - 1);
    if (kind === 'cosine') return Math.sin(q);
    return q;
  }

  function wrapPi(q) {
    var twoPi = 2 * Math.PI;
    while (q > Math.PI) q -= twoPi;
    while (q < -Math.PI) q += twoPi;
    return q;
  }

  function hoopProject(th, phi, cam, cx, cy, s) {
    var x = Math.sin(th) * Math.cos(phi);
    var y = Math.sin(th) * Math.sin(phi);
    var z = -Math.cos(th);
    var ca = Math.cos(cam);
    var sa = Math.sin(cam);
    return {
      sx: cx + s * (x * ca - y * sa),
      sy: cy - s * z,
      depth: x * sa + y * ca
    };
  }

  function resetOscillator(state) {
    var amp = num(state.amp, 1.2);
    state.q = amp;
    state.v = 0;
    state.tSim = 0;
    state.trail = [];
  }

  function resetCyclotron(state) {
    state.x = -0.55;
    state.y = 0;
    state.vx = 0;
    state.vy = 2.0;
    state.trail = [];
    state.tSim = 0;
  }


  PGRE.visualizers['cpgf-1.28'] = {
    id: 'cpgf-1.28',
    topic: 'cm',
    title: 'Lagrangian Definition: $L(q, \\dot{q}, t) = T - U$',
    formulaLatex: 'L(q, \\dot{q}, t) = T - U',
    physicalStory: `
The Lagrangian of a conservative system is the difference $L = T - U$, not the sum. Mechanical energy $E = T + U$ is constant along the motion (when $L$ has no explicit time dependence and constraints are scleronomic), but it is $L$ whose time integral $S = \\int L\\,dt$ is stationary.

For unit mass in one dimension, $T = \\frac12\\dot{q}^{2}$ and $U = U(q)$. In a harmonic well $U = \\frac12 q^{2}$ one has $L = T - U = -E\\cos(2t)$ if $q(0) = A$, $\\dot{q}(0) = 0$: $L$ oscillates at twice the frequency of $q(t)$, flipping sign twice per period, while $E$ never moves.
    `.trim(),
    derivationSteps: [
      "1. D'Alembert: $\\sum_i (m_i\\ddot{\\mathbf{r}}_i - \\mathbf{F}_i)\\cdot\\delta\\mathbf{r}_i = 0$ for virtual displacements consistent with the constraints.",
      "2. Conservative monogenic forces give generalized forces $Q_j = -\\partial U/\\partial q_j$ with $U = U(q)$.",
      "3. Inertial terms in generalized coordinates become $\\frac{d}{dt}(\\partial T/\\partial\\dot{q}_j) - \\partial T/\\partial q_j$.",
      "4. Collecting terms yields $\\frac{d}{dt}(\\partial T/\\partial\\dot{q}_j) - \\partial(T - U)/\\partial q_j = 0$.",
      "5. If $U$ is velocity-independent, $\\partial U/\\partial\\dot{q}_j = 0$, so $L \\equiv T - U$ produces the Euler–Lagrange equation."
    ],
    limitingCases: [
      { condition: 'Free particle ($U = 0$)', result: 'L = T = \\frac12 m\\dot{q}^{2}', description: 'Stationary action recovers uniform straight-line motion.' },
      { condition: 'Constant shift $U \\to U + U_0$', result: 'L \\to L - U_0', description: 'Equations of motion unchanged: $U_0$ is a total time derivative of $U_0 t$.' },
      { condition: 'Harmonic oscillator', result: 'L = -E\\cos(2\\omega t + \\phi)', description: '$L$ has frequency $2\\omega$; $E = T + U$ is constant.' },
      { condition: 'Static limit $\\dot{q} = 0$', result: 'L = -U(q)', description: 'Stationary action reduces to $\\nabla U = 0$.' }
    ],
    greTraps: [
      { trap: 'Sign of $U$', description: 'Never write $L = T + U$. Lagrangian is the difference; Hamiltonian $H = \\dot{q}p - L$ is $T + U$ for standard $T$.' },
      { trap: 'Gauge $dF(q,t)/dt$', description: 'Adding a total time derivative of $F(q,t)$ leaves the Euler–Lagrange equations invariant.' },
      { trap: 'Velocity-dependent $U$', description: 'Charges in $\\mathbf{A}$ use $L = \\frac12 mv^{2} - q\\phi + q\\mathbf{A}\\cdot\\mathbf{v}$, not $T - q\\phi$.' }
    ],
    parameters: [
      { id: 'potential', label: 'Potential $U(q)$', type: 'select', value: 'harmonic', default: 'harmonic', options: [
        { value: 'harmonic', label: 'Harmonic: $U = \\frac12 q^{2}$' },
        { value: 'double', label: 'Double well: $U = 2(q^{2}-1)^{2}$' },
        { value: 'cosine', label: 'Pendulum: $U = 1 - \\cos q$' }
      ], hint: 'Selects $U(q)$. Harmonic $U=\\frac12 q^{2}$ makes $L$ oscillate at $2\\omega$; the double well can trap or let the particle cross $U(0)=2$; the pendulum $U=1-\\cos q$ is $2\\pi$-periodic.' },
      { id: 'amp', label: 'Release $q(0)$', type: 'range', min: 0.35, max: 1.85, step: 0.05, value: 1.20, default: 1.20, hint: 'Release from rest at this $q(0)$. Larger amplitude raises $E=T+U$ on the well; $L=T-U$ still changes sign twice per period in the harmonic case.' },
      SPEED_PARAM
    ],
    init: function (container, state, redraw) {
      state.potential = state.potential || 'harmonic';
      state.amp = num(state.amp, 1.2);
      state.simSpeed = simSpeedOf(state);
      if (!Number.isFinite(state.q)) resetOscillator(state);
      if (!Number.isFinite(state.v)) state.v = 0;
      if (!Number.isFinite(state.tSim)) state.tSim = 0;
      if (!Array.isArray(state.trail)) state.trail = [];
    },
    onParamChange: function (id, val, state) {
      if (id === 'amp' || id === 'potential') {
        if (id === 'amp') state.amp = val;
        if (id === 'potential') state.potential = val;
        resetOscillator(state);
      }
    },
    draw: function (ctx, width, height, state, dt) {
      fillStage(ctx, width, height);
      state = state || {};
      var kind = state.potential || 'harmonic';
      if (kind !== 'double' && kind !== 'cosine') kind = 'harmonic';
      var amp = num(state.amp, 1.2);
      if (!Number.isFinite(state.q)) state.q = amp;
      if (!Number.isFinite(state.v)) state.v = 0;
      if (!Number.isFinite(state.tSim)) state.tSim = 0;
      if (!Array.isArray(state.trail)) state.trail = [];

      var dtv = scaledDt(dt, state);
      var sub = Math.max(6, Math.min(20, Math.round(8 * simSpeedOf(state))));
      var hdt = dtv / sub;
      var i, a1, a2;
      if (kind === 'harmonic') {
        // Exact: q̈ = -q, ω = 1.
        var c = Math.cos(dtv);
        var s = Math.sin(dtv);
        var qn = state.q * c + state.v * s;
        state.v = -state.q * s + state.v * c;
        state.q = qn;
        state.tSim += dtv;
      } else if (dtv > 0) {
        for (i = 0; i < sub; i++) {
          a1 = -potentialDU(state.q, kind);
          state.q += state.v * hdt + 0.5 * a1 * hdt * hdt;
          a2 = -potentialDU(state.q, kind);
          state.v += 0.5 * (a1 + a2) * hdt;
        }
        if (kind === 'cosine') state.q = wrapPi(state.q);
        state.tSim += dtv;
      }

      var Tkin = 0.5 * state.v * state.v;
      var Upot = potentialU(state.q, kind);
      var Lval = Tkin - Upot;
      var Emech = Tkin + Upot;
      var omegaNote = kind === 'harmonic'
        ? '$L$ oscillates at $2\\omega$ ($\\omega = 1$)'
        : (kind === 'double' ? (Emech < 2 ? 'trapped in one well' : 'crosses the barrier $U(0)=2$') : 'pendulum well');

      legend('$L = T - U$', [
        { label: '$T$', value: fmt(Tkin, 3), hint: 'Kinetic energy $T=\\frac12\\dot{q}^{2}$ (unit mass). Peaks at the bottom of $U$, where the particle is fastest.' },
        { label: '$U$', value: fmt(Upot, 3), hint: 'Potential at the present $q$. The force in the Euler–Lagrange equation is $-\\partial U/\\partial q$.' },
        { label: '$L = T - U$', value: fmt(Lval, 3), hint: 'Lagrangian $L=T-U$, the difference not the sum. Hamilton\'s principle makes $\\int L\\,dt$ stationary; $E=T+U$ is the conserved energy.' },
        { label: '$E = T + U$', value: fmt(Emech, 3), hint: 'Mechanical energy $E=T+U$. For this conservative $U(q)$ it is constant along the motion, while $L$ is not.' },
        { label: 'motion', value: omegaNote, hint: 'In the harmonic well $L$ oscillates at $2\\omega$. Double well: $E<2$ traps in one pocket; $E>2$ crosses the barrier. Pendulum: libration in $U=1-\\cos q$.' }
      ]);

      var padL = 36;
      var padR = 88;
      var padT = 18;
      var padB = 26;
      var lx = padL;
      var ly = padT;
      var lw = Math.max(40, width - padL - padR);
      var lh = Math.max(40, height - padT - padB);

      var qLo, qHi;
      if (kind === 'cosine') { qLo = -Math.PI; qHi = Math.PI; }
      else if (kind === 'double') { qLo = -2.15; qHi = 2.15; }
      else { qLo = -2.2; qHi = 2.2; }

      var uMax = 0.4;
      var nSample = 120;
      var qs, uq;
      for (i = 0; i <= nSample; i++) {
        qs = qLo + (qHi - qLo) * (i / nSample);
        uq = potentialU(qs, kind);
        if (uq > uMax) uMax = uq;
      }
      uMax = Math.max(uMax, Emech, 0.5) * 1.18;
      var uLo = kind === 'cosine' ? -0.15 : -0.08 * uMax;

      var toX = function (q) { return lx + ((q - qLo) / (qHi - qLo)) * lw; };
      var toY = function (u) { return ly + lh * (1 - (u - uLo) / (uMax - uLo)); };

      plotBox(ctx, lx, ly, lw, lh);
      innerGrid(ctx, lx, ly, lw, lh, 4, 4);

      ctx.save();
      clipRect(ctx, lx, ly, lw, lh);

      var zeroY = toY(0);
      ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.22);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(lx, zeroY);
      ctx.lineTo(lx + lw, zeroY);
      ctx.stroke();

      var curve = [];
      var under = [{ x: toX(qLo), y: zeroY }];
      for (i = 0; i <= nSample; i++) {
        qs = qLo + (qHi - qLo) * (i / nSample);
        uq = potentialU(qs, kind);
        curve.push({ x: toX(qs), y: toY(uq) });
        under.push({ x: toX(qs), y: toY(Math.max(0, uq)) });
      }
      under.push({ x: toX(qHi), y: zeroY });
      fillPoly(ctx, under, 'rgba(204, 120, 92, 0.22)');
      strokePoly(ctx, curve, CORAL, 2.3);

      state.trail.push({ q: state.q, u: Upot });
      if (state.trail.length > 90) state.trail.shift();
      if (state.trail.length > 2) {
        var tr = [];
        for (i = 0; i < state.trail.length; i++) {
          tr.push({ x: toX(state.trail[i].q), y: toY(state.trail[i].u) });
        }
        strokePoly(ctx, tr, 'rgba(204, 120, 92, 0.45)', 1.6);
      }

      var px = toX(state.q);
      var py = toY(Upot);
      var dUq = potentialDU(state.q, kind);
      var tx = 1;
      var tyScreen = -(dUq) * (lh / (uMax - uLo)) / (lw / (qHi - qLo));
      var tlen = Math.hypot(tx, tyScreen) || 1;
      var vPix = Math.max(-36, Math.min(36, state.v * 18));
      arrow(ctx, px, py, px + vPix * tx / tlen, py + vPix * tyScreen / tlen, GOLD, 2);

      drawDot(ctx, px, py, 6.5, CORAL, INK);
      ctx.restore();

      axisText(ctx, kind === 'cosine' ? '−π' : fmt(qLo, 1), lx, height - 8, 'left');
      axisText(ctx, 'q', lx + lw * 0.5, height - 8, 'center');
      axisText(ctx, kind === 'cosine' ? '+π' : fmt(qHi, 1), lx + lw, height - 8, 'right');
      axisText(ctx, 'U', 10, ly + 12, 'left');

      var bx = width - padR + 14;
      var by = ly + 8;
      var bw = Math.max(18, padR - 24);
      var bh = lh - 16;
      var colW = Math.max(6, (bw - 12) / 3);
      var gap = 3;
      var scale = Math.max(Emech, Math.abs(Lval), Tkin, Upot, 0.35);
      var zeroBarY = by + bh * 0.62;

      function posBar(x0, val, color) {
        var hgt = (Math.max(0, val) / scale) * (zeroBarY - by - 8);
        ctx.fillStyle = color;
        ctx.fillRect(x0, zeroBarY - hgt, colW, Math.max(1, hgt));
      }

      ctx.save();
      ctx.fillStyle = PGRE.vizStageTheme().chipFade(0.45);
      ctx.fillRect(bx - 6, by - 4, bw + 10, bh + 8);
      posBar(bx, Tkin, GOLD);
      posBar(bx + colW + gap, Upot, CORAL);
      var Lh = (Lval / scale) * (zeroBarY - by - 8);
      ctx.fillStyle = TEAL;
      if (Lh >= 0) ctx.fillRect(bx + 2 * (colW + gap), zeroBarY - Lh, colW, Math.max(1, Lh));
      else ctx.fillRect(bx + 2 * (colW + gap), zeroBarY, colW, Math.max(1, -Lh));
      ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.28);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bx - 2, zeroBarY);
      ctx.lineTo(bx + bw, zeroBarY);
      ctx.stroke();
      ctx.restore();

      haloLabel(ctx, bx + colW * 0.5, height - 14, 'T', GOLD, 'center');
      haloLabel(ctx, bx + colW + gap + colW * 0.5, height - 14, 'U', CORAL, 'center');
      haloLabel(ctx, bx + 2 * (colW + gap) + colW * 0.5, height - 14, 'L', TEAL, 'center');

      var vxTip = px + vPix * tx / tlen;
      var vyTip = py + vPix * tyScreen / tlen;
      if (PGRE.setVizHotspots) {
        PGRE.setVizHotspots([
          { id: 'particle', kind: 'circle', x: px, y: py, r: 14, title: 'Particle', body: 'Unit mass at $q=' + fmt(state.q, 2) + '$, $\\dot{q}=' + fmt(state.v, 2) + '$. $T=' + fmt(Tkin, 3) + '$, $U=' + fmt(Upot, 3) + '$, so $L=T-U=' + fmt(Lval, 3) + '$ while $E=T+U=' + fmt(Emech, 3) + '$ stays put.' },
          { id: 'qdot', kind: 'segment', x1: px, y1: py, x2: vxTip, y2: vyTip, halfW: 8, title: 'Velocity $\\dot{q}$', body: 'Tangent to $U(q)$ with $\\dot{q}=' + fmt(state.v, 2) + '$. Kinetic $T=\\frac12\\dot{q}^{2}=' + fmt(Tkin, 3) + '$; the gold arrow vanishes at turning points.' },
          { id: 'barT', kind: 'rect', x: bx, y: by, w: colW, h: bh, title: 'Kinetic $T$', body: '$T=\\frac12\\dot{q}^{2}=' + fmt(Tkin, 3) + '$. It trades with $U$ so that $E=T+U=' + fmt(Emech, 3) + '$ is constant.' },
          { id: 'barU', kind: 'rect', x: bx + colW + gap, y: by, w: colW, h: bh, title: 'Potential $U$', body: '$U(q)=' + fmt(Upot, 3) + '$ at $q=' + fmt(state.q, 2) + '$. The coral bar is $U$; $L$ is gold minus coral, not the sum.' },
          { id: 'barL', kind: 'rect', x: bx + 2 * (colW + gap), y: by, w: colW, h: bh, title: 'Lagrangian $L$', body: '$L=T-U=' + fmt(Lval, 3) + '$ can be negative (bar drops below the zero line). Stationary action uses this difference, not $E$.' },
          { id: 'Uq', kind: 'rect', x: lx, y: ly, w: lw, h: lh, title: 'Potential $U(q)$', body: 'Coral curve is $U(q)$ on $q\\in[' + fmt(qLo, 1) + ',' + fmt(qHi, 1) + ']$. The particle slides on this well; $-\\partial U/\\partial q=' + fmt(-dUq, 2) + '$ is the generalized force.' }
        ]);
      }
    },
    challenge: {
      question: "A particle moves in 1D under a potential $U(x) = \\frac{1}{2}kx^{2}$. If the Lagrangian is $L = \\frac{1}{2}m\\dot{x}^{2} - \\frac{1}{2}kx^{2}$, which of the following modified Lagrangians produces the EXACT SAME physical equations of motion?",
      options: [
        "A) $L' = \\frac{1}{2}m\\dot{x}^{2} + \\frac{1}{2}kx^{2}$",
        "B) $L' = \\frac{1}{2}m\\dot{x}^{2} - \\frac{1}{2}kx^{2} + \\frac{d}{dt}(c \\cdot x^{2} \\cdot t)$",
        "C) $L' = m\\dot{x}^{2} - kx^{2} + c x$",
        "D) $L' = \\frac{1}{2}m\\dot{x}^{2} - \\frac{1}{2}kx^{2} + \\frac{d}{dt}(m x \\dot{x})$",
        "E) $L' = \\left(\\frac{1}{2}m\\dot{x}^{2} - \\frac{1}{2}kx^{2}\\right)^{2}$"
      ],
      correct: 1,
      explanation: "Adding the total time derivative of any $F(q,t)$ leaves the Euler–Lagrange equations unchanged, because $\\delta\\int (dF/dt)\\,dt = \\delta[F(t_2)-F(t_1)] = 0$ at fixed endpoints. Option B adds $dF/dt$ with $F(x,t) = c x^{2} t$. Option D uses an $F$ that depends on $\\dot{x}$, which is not a legal coordinate gauge function $F(q,t)$."
    }
  };

  PGRE.visualizers['cpgf-1.29'] = {
    id: 'cpgf-1.29',
    topic: 'cm',
    title: 'Euler-Lagrange Equations: $\\frac{d}{dt}\\left(\\frac{\\partial L}{\\partial \\dot{q}_i}\\right) = \\frac{\\partial L}{\\partial q_i}$',
    formulaLatex: '\\frac{d}{dt}\\left(\\frac{\\partial L}{\\partial \\dot{q}_i}\\right) = \\frac{\\partial L}{\\partial q_i}',
    physicalStory: `
Euler–Lagrange is Newton in generalized coordinates, with holonomic constraint forces already eliminated. For a bead of mass $m$ on a hoop of radius $R$ spinning at constant $\\omega$ about its vertical diameter, the only coordinate is $\\theta$ measured from the bottom, and
$$L = \\tfrac12 m R^{2}\\dot{\\theta}^{2} + \\tfrac12 m R^{2}\\omega^{2}\\sin^{2}\\theta + mgR\\cos\\theta.$$
The wire's normal never appears. Equilibria satisfy $(\\omega^{2}\\cos\\theta - g/R)\\sin\\theta = 0$. For $\\omega > \\omega_c = \\sqrt{g/R}$ the bottom $\\theta = 0$ is unstable and two stable latitudes peel off at $\\cos\\theta_{\\mathrm{eq}} = g/(R\\omega^{2})$ — a supercritical pitchfork. The motion here is frictionless: the bead conserves the Jacobi integral and oscillates about whichever well it occupies.
    `.trim(),
    derivationSteps: [
      "1. Hamilton's principle: $S = \\int_{t_1}^{t_2} L(q,\\dot{q},t)\\,dt$ is stationary for variations with $\\delta q(t_1)=\\delta q(t_2)=0$.",
      "2. First variation: $\\delta S = \\int(\\partial L/\\partial q\\,\\delta q + \\partial L/\\partial\\dot{q}\\,\\delta\\dot{q})\\,dt = 0$.",
      "3. $\\delta\\dot{q} = d(\\delta q)/dt$; integrate the second term by parts.",
      "4. Boundary term $[(\\partial L/\\partial\\dot{q})\\delta q]_{t_1}^{t_2}$ vanishes.",
      "5. $\\int[\\partial L/\\partial q - d(\\partial L/\\partial\\dot{q})/dt]\\,\\delta q\\,dt = 0$ for arbitrary $\\delta q$ implies the Euler–Lagrange equation.",
      "6. Hoop: $\\partial L/\\partial\\dot{\\theta} = m R^{2}\\dot{\\theta}$ and $\\partial L/\\partial\\theta = m R^{2}\\omega^{2}\\sin\\theta\\cos\\theta - mgR\\sin\\theta$, so $\\ddot{\\theta} = (\\omega^{2}\\cos\\theta - g/R)\\sin\\theta$."
    ],
    limitingCases: [
      { condition: 'Cartesian $q = x$', result: 'm\\ddot{x} = -\\partial U/\\partial x', description: 'Recovers Newtonian $F = ma$.' },
      { condition: '$\\omega = 0$', result: '\\ddot{\\theta} = -(g/R)\\sin\\theta', description: 'Ordinary pendulum on a fixed hoop.' },
      { condition: '$\\omega > \\sqrt{g/R}$', result: '\\cos\\theta_{\\mathrm{eq}} = g/(R\\omega^{2})', description: 'Two stable latitudes; $\\theta = 0$ is a local maximum of $U_{\\mathrm{eff}}$.' },
      { condition: 'Cyclic coordinate $\\partial L/\\partial q_k = 0$', result: 'p_k = \\mathrm{const}', description: 'Noether conservation of the conjugate momentum.' }
    ],
    greTraps: [
      { trap: 'Total vs partial $d/dt$', description: '$d(\\partial L/\\partial\\dot{q})/dt$ is a total derivative: chain-rule through $q$, $\\dot{q}$, and $t$.' },
      { trap: '$\\theta = 0$ is always an equilibrium', description: '$\\sin\\theta = 0$ solves the EL equation for every $\\omega$. Above $\\omega_c$ it is unstable; a bead placed exactly at the bottom with $\\dot{\\theta}=0$ never leaves.' },
      { trap: 'Centrifugal term', description: 'The $m R^{2}\\omega^{2}\\sin^{2}\\theta$ piece of $T$ produces $\\partial L/\\partial\\theta \\supset m R^{2}\\omega^{2}\\sin\\theta\\cos\\theta$. It is not an extra Newtonian force you add by hand in the inertial frame.' }
    ],
    parameters: [
      { id: 'omega', label: 'Hoop spin $\\omega$', type: 'range', min: 0, max: 6, step: 0.1, value: 3.5, default: 3.5, unit: 'rad/s', hint: 'Spin about the vertical diameter. For $\\omega>\\omega_c=\\sqrt{g/R}$ the bottom is unstable and two stable latitudes appear at $\\cos\\theta_{\\mathrm{eq}}=g/(R\\omega^{2})$.' },
      { id: 'g', label: 'Gravity $g$', type: 'range', min: 1, max: 20, step: 0.5, value: 9.8, default: 9.8, unit: 'm/s²', hint: 'Gravitational acceleration. Raising $g$ increases $\\omega_c=\\sqrt{g/R}$ and, at fixed $\\omega$, pulls $\\theta_{\\mathrm{eq}}$ toward the bottom.' },
      { id: 'theta0', label: 'Release $\\theta_0$', type: 'range', min: -3.14, max: 3.14, step: 0.05, value: 0.8, default: 0.8, hint: 'Release angle from the bottom with $\\dot{\\theta}=0$. $\\theta=0$ is always an equilibrium; above $\\omega_c$ it is unstable, so a kick is needed to leave it.' },
      SPEED_PARAM
    ],
    init: function (container, state, redraw) {
      state.omega = num(state.omega, 3.5);
      state.g = num(state.g, 9.8);
      state.R = 1.0;
      state.simSpeed = simSpeedOf(state);
      state.theta = num(state.theta, num(state.theta0, 0.8));
      state.thetaDot = num(state.thetaDot, 0);
      state.phi = num(state.phi, 0);
      state.trail = Array.isArray(state.trail) ? state.trail : [];
      if (U && typeof U.createControlUI === 'function') {
        U.createControlUI(container, [
          { id: 'kick', label: 'Perturb bead', type: 'button', text: 'Kick bead', onClick: function () { state.thetaDot += 1.2; } }
        ], function () { redraw(); });
      }
    },
    onParamChange: function (id, val, state) {
      if (id === 'theta0') {
        state.theta = val;
        state.thetaDot = 0;
        state.trail = [];
      }
    },
    draw: function (ctx, width, height, state, dt) {
      fillStage(ctx, width, height);
      state = state || {};
      var omega = num(state.omega, 3.5);
      var g = num(state.g, 9.8);
      var R = 1.0;
      if (!Number.isFinite(state.theta)) state.theta = num(state.theta0, 0.8);
      if (!Number.isFinite(state.thetaDot)) state.thetaDot = 0;
      if (!Number.isFinite(state.phi)) state.phi = 0;
      if (!Array.isArray(state.trail)) state.trail = [];

      var dtv = scaledDt(dt, state);
      var sub = Math.max(8, Math.min(28, Math.round(10 * simSpeedOf(state))));
      var hdt = dtv / sub;
      var step, acc;
      for (step = 0; step < sub; step++) {
        acc = (omega * omega * Math.cos(state.theta) - g / R) * Math.sin(state.theta);
        state.thetaDot += acc * hdt;
        state.theta += state.thetaDot * hdt;
      }
      state.phi += omega * dtv;
      state.theta = wrapPi(state.theta);

      var omegaC = Math.sqrt(Math.max(0, g / R));
      var supercritical = omega > omegaC + 1e-6;
      var thetaEq = supercritical ? Math.acos(Math.max(-1, Math.min(1, g / (R * omega * omega)))) : 0;
      var Ueff = -g * R * Math.cos(state.theta) - 0.5 * omega * omega * R * R * Math.sin(state.theta) * Math.sin(state.theta);
      var Ejac = 0.5 * R * R * state.thetaDot * state.thetaDot + Ueff;

      legend('Bead on a rotating hoop', [
        { label: '$\\omega / \\omega_c$', value: fmt(omega / Math.max(omegaC, 1e-6), 2) + '  ($\\omega_c=\\sqrt{g/R}$)', hint: 'Ratio to the pitchfork threshold $\\omega_c=\\sqrt{g/R}$. Greater than $1$ is supercritical: $\\theta=0$ is a local maximum of $U_{\\mathrm{eff}}$.' },
        { label: 'regime', value: supercritical ? 'supercritical — $\\theta=0$ unstable' : 'subcritical — $\\theta=0$ stable', hint: 'Subcritical: only the bottom is stable. Supercritical: two stable latitudes, and $\\theta=0$ is unstable.' },
        { label: '$\\theta$', value: fmt(state.theta * 180 / Math.PI, 0) + '°', hint: 'Angle from the bottom. Euler–Lagrange gives $\\ddot{\\theta}=(\\omega^{2}\\cos\\theta-g/R)\\sin\\theta$; the wire\'s constraint force never appears.' },
        { label: '$\\theta_{\\mathrm{eq}}$', value: supercritical ? '$\\pm$' + fmt(thetaEq * 180 / Math.PI, 0) + '°' : '$0^{\\circ}$', hint: 'Stable latitude. $\\cos\\theta_{\\mathrm{eq}}=g/(R\\omega^{2})$ when $\\omega>\\omega_c$; otherwise $\\theta_{\\mathrm{eq}}=0$.' },
        { label: '$E$ (Jacobi)', value: fmt(Ejac, 2), hint: 'Jacobi integral $\\frac12 R^{2}\\dot{\\theta}^{2}+U_{\\mathrm{eff}}$, with $U_{\\mathrm{eff}}=-gR\\cos\\theta-\\frac12\\omega^{2}R^{2}\\sin^{2}\\theta$. Conserved for this scleronomic constraint.' },
        { label: 'friction', value: 'none; kick to leave $\\theta=0$', hint: 'No dissipation: the bead oscillates in whichever well of $U_{\\mathrm{eff}}$ it occupies. Use Kick bead to leave $\\theta=0$.' }
      ]);

      var cx = width * 0.5;
      var cy = 16 + (height - 36) * 0.48;
      var s = Math.max(28, Math.min(cx - 40, cy - 28, height - cy - 28));
      var cam = 0.42;
      var phi = state.phi;

      function proj(th) { return hoopProject(th, phi, cam, cx, cy, s); }

      ctx.save();
      clipRect(ctx, 8, 8, width - 16, height - 16);

      ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.28);
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cx, cy - s - 16);
      ctx.lineTo(cx, cy + s + 12);
      ctx.stroke();
      ctx.setLineDash([]);

      function drawLatitude(th, color, lw) {
        var pts = [];
        var k, psi, x, y, z, ca, sa, xr;
        ca = Math.cos(cam); sa = Math.sin(cam);
        var rad = Math.sin(th);
        z = -Math.cos(th);
        for (k = 0; k <= 48; k++) {
          psi = (k / 48) * Math.PI * 2;
          x = rad * Math.cos(psi);
          y = rad * Math.sin(psi);
          xr = x * ca - y * sa;
          pts.push({ x: cx + s * xr, y: cy - s * z });
        }
        strokePoly(ctx, pts, color, lw, [3, 4]);
      }
      if (supercritical) {
        drawLatitude(thetaEq, 'rgba(212, 160, 23, 0.55)', 1.6);
        drawLatitude(-thetaEq, 'rgba(212, 160, 23, 0.55)', 1.6);
      } else {
        drawLatitude(0, 'rgba(93, 184, 166, 0.45)', 1.4);
      }

      var hoopN = 96;
      var back = [];
      var front = [];
      var h, p, p2;
      for (h = 0; h < hoopN; h++) {
        p = hoopProject(-Math.PI + (2 * Math.PI * h) / hoopN, phi, cam, cx, cy, s);
        p2 = hoopProject(-Math.PI + (2 * Math.PI * (h + 1)) / hoopN, phi, cam, cx, cy, s);
        if (0.5 * (p.depth + p2.depth) < 0) back.push([p, p2]);
        else front.push([p, p2]);
      }
      function strokeSegs(segs, color, lw) {
        ctx.strokeStyle = color;
        ctx.lineWidth = lw;
        ctx.lineCap = 'round';
        ctx.beginPath();
        var si;
        for (si = 0; si < segs.length; si++) {
          ctx.moveTo(segs[si][0].sx, segs[si][0].sy);
          ctx.lineTo(segs[si][1].sx, segs[si][1].sy);
        }
        ctx.stroke();
      }
      strokeSegs(back, PGRE.vizStageTheme().inkFade(0.22), 2);
      strokeSegs(front, CORAL, 2.6);

      var eqA = proj(thetaEq);
      var eqB = proj(-thetaEq);
      if (supercritical) {
        drawDot(ctx, eqA.sx, eqA.sy, 3.4, GOLD, null);
        drawDot(ctx, eqB.sx, eqB.sy, 3.4, GOLD, null);
      } else {
        var bot = proj(0);
        drawDot(ctx, bot.sx, bot.sy, 3.4, TEAL, null);
      }

      var bead = proj(state.theta);
      state.trail.push({ x: bead.sx, y: bead.sy, d: bead.depth });
      if (state.trail.length > 70) state.trail.shift();
      if (state.trail.length > 2) {
        strokePoly(ctx, state.trail.map(function (pt) { return { x: pt.x, y: pt.y }; }), 'rgba(204, 120, 92, 0.4)', 1.8);
      }

      var gLen = Math.min(32, 18 * (g / 9.8));
      arrow(ctx, bead.sx, bead.sy, bead.sx, bead.sy + gLen, ROSE, 2);
      if (gLen > 12) haloLabel(ctx, bead.sx + (bead.sx > cx ? 10 : -10), bead.sy + gLen * 0.55, 'mg', ROSE, bead.sx > cx ? 'left' : 'right');

      drawDot(ctx, bead.sx, bead.sy, 7, CORAL, INK);
      ctx.restore();

      axisText(ctx, 'bottom  θ = 0', cx, height - 8, 'center');
      axisText(ctx, 'top', cx, 16, 'center');

      var hoopSpots = [
        { id: 'bead', kind: 'circle', x: bead.sx, y: bead.sy, r: 14, title: 'Bead', body: 'Slides on the wire at $\\theta=' + fmt(state.theta * 180 / Math.PI, 0) + '^{\\circ}$, $\\dot{\\theta}=' + fmt(state.thetaDot, 2) + '\\,\\mathrm{rad/s}$. Euler–Lagrange already eliminated the hoop\'s normal.' }
      ];
      if (supercritical) {
        hoopSpots.push(
          { id: 'eqA', kind: 'circle', x: eqA.sx, y: eqA.sy, r: 10, title: 'Equilibrium $\\theta_{\\mathrm{eq}}$', body: 'Stable latitude $\\theta_{\\mathrm{eq}}=' + fmt(thetaEq * 180 / Math.PI, 0) + '^{\\circ}$ where $\\cos\\theta_{\\mathrm{eq}}=g/(R\\omega^{2})=' + fmt(g / (R * omega * omega), 2) + '$.' },
          { id: 'eqB', kind: 'circle', x: eqB.sx, y: eqB.sy, r: 10, title: 'Equilibrium $-\\theta_{\\mathrm{eq}}$', body: 'The pitchfork partner at $-\\theta_{\\mathrm{eq}}$. Both are minima of $U_{\\mathrm{eff}}$ for $\\omega/\\omega_c=' + fmt(omega / Math.max(omegaC, 1e-6), 2) + '$.' }
        );
      } else {
        var botPt = proj(0);
        hoopSpots.push({ id: 'bottomEq', kind: 'circle', x: botPt.sx, y: botPt.sy, r: 10, title: 'Bottom $\\theta=0$', body: 'Subcritical: $\\omega/\\omega_c=' + fmt(omega / Math.max(omegaC, 1e-6), 2) + '<1$, so $\\theta=0$ is the only stable equilibrium of $U_{\\mathrm{eff}}$.' });
      }
      hoopSpots.push(
        { id: 'mg', kind: 'segment', x1: bead.sx, y1: bead.sy, x2: bead.sx, y2: bead.sy + gLen, halfW: 8, title: 'Gravity $mg$', body: 'True gravity $g=' + fmt(g, 1) + '\\,\\mathrm{m/s}^{2}$ points down. The centrifugal piece of $T$ is already in $L$, not drawn as an extra force.' }
      );
      if (supercritical) {
        hoopSpots.push({ id: 'latitude', kind: 'ring', x: cx, y: cy + s * Math.cos(thetaEq), r: Math.max(4, s * Math.abs(Math.sin(thetaEq))), halfW: 8, title: 'Equilibrium latitude', body: 'Circle of constant $\\theta=\\pm\\theta_{\\mathrm{eq}}$. The bead\'s equilibria are where this parallel meets the wire.' });
      }
      hoopSpots.push(
        { id: 'omegaAxis', kind: 'segment', x1: cx, y1: cy - s - 16, x2: cx, y2: cy + s + 12, halfW: 8, title: 'Rotation axis', body: 'Vertical diameter. The hoop spins at $\\omega=' + fmt(omega, 1) + '\\,\\mathrm{rad/s}$; $\\omega_c=\\sqrt{g/R}=' + fmt(omegaC, 2) + '\\,\\mathrm{rad/s}$.' },
        { id: 'hoop', kind: 'ring', x: cx, y: cy, r: s, halfW: 10, title: 'Rotating hoop', body: 'Wire of radius $R=1$. The bead is constrained to this circle; $\\theta$ from the bottom is the only generalized coordinate.' }
      );
      if (PGRE.setVizHotspots) PGRE.setVizHotspots(hoopSpots);
    },
    challenge: {
      question: "A bead of mass $m$ slides without friction on a circular hoop of radius $R$ rotating at constant angular speed $\\omega$ about its vertical diameter. What is the critical angular frequency $\\omega_c$ above which a stable non-zero equilibrium angle $\\theta \\neq 0$ exists?",
      options: [
        "A) $\\omega_c = \\sqrt{g / R}$",
        "B) $\\omega_c = \\sqrt{2g / R}$",
        "C) $\\omega_c = g / R$",
        "D) $\\omega_c = \\sqrt{g / 2R}$",
        "E) Stable equilibria at $\\theta \\neq 0$ never occur for any rotation speed."
      ],
      correct: 0,
      explanation: "With $\\theta$ measured from the bottom, equilibrium requires $(\\omega^{2}\\cos\\theta - g/R)\\sin\\theta = 0$. Nonzero roots need $\\cos\\theta = g/(R\\omega^{2})$, which is possible iff $\\omega > \\omega_c = \\sqrt{g/R}$. Above $\\omega_c$, $\\theta = 0$ is unstable and two symmetric minima sit at those latitudes."
    }
  };

  PGRE.visualizers['cpgf-1.30'] = {
    id: 'cpgf-1.30',
    topic: 'cm',
    title: 'Canonical Momentum & Cyclic Coordinates: $p_i \\equiv \\frac{\\partial L}{\\partial \\dot{q}_i}$',
    formulaLatex: 'p_i \\equiv \\frac{\\partial L}{\\partial \\dot{q}_i}',
    physicalStory: `
Canonical momentum $p_i = \\partial L/\\partial\\dot{q}_i$ is conjugate to $q_i$. It is not always $m\\mathbf{v}$. For a charge in a magnetic field,
$$L = \\tfrac12 m v^{2} + q\\mathbf{A}\\cdot\\mathbf{v},\\qquad \\mathbf{p} = m\\mathbf{v} + q\\mathbf{A}.$$
If $q_k$ is cyclic ($\\partial L/\\partial q_k = 0$), then $\\dot{p}_k = 0$. In the Landau gauge $\\mathbf{A} = (0, Bx, 0)$ the coordinate $y$ never appears, so
$$p_y = m v_y + q B x = q B X_c$$
is strictly constant: it is the $x$-coordinate of the cyclotron guiding center. Mechanical $m v_y$ still oscillates. In the symmetric gauge $\\mathbf{A} = \\frac12 B(-y,x)$ it is $p_\\theta$ that is conserved, not $p_y$. The orbit itself is gauge-invariant; which Cartesian $p_i$ is constant is not.
    `.trim(),
    derivationSteps: [
      "1. Define $p_i \\equiv \\partial L/\\partial\\dot{q}_i$.",
      "2. Euler–Lagrange says $\\dot{p}_i = \\partial L/\\partial q_i$.",
      "3. Cyclic $q_k$ ($\\partial L/\\partial q_k = 0$) $\\Rightarrow p_k$ constant.",
      "4. Charge in $\\mathbf{B} = B\\hat{\\mathbf{z}}$: $L = \\frac12 m(v_x^{2}+v_y^{2}+v_z^{2}) + q\\mathbf{A}\\cdot\\mathbf{v}$.",
      "5. Landau gauge $\\mathbf{A}=(0,Bx,0)$: $y$ is cyclic, $p_y = mv_y + qBx$.",
      "6. Guiding center $X_c = x + v_y/\\omega_c = p_y/(qB)$ with $\\omega_c = qB/m$ is therefore invariant. Mechanical $mv_y$ is not."
    ],
    limitingCases: [
      { condition: 'No $\\mathbf{A}$', result: 'p_x = m\\dot{x}', description: 'Canonical momentum equals mechanical momentum.' },
      { condition: 'Polar angle, central force', result: 'p_\\theta = m r^{2}\\dot{\\theta}', description: 'Canonical momentum is angular momentum.' },
      { condition: 'Landau gauge', result: 'p_y = mv_y + qBx = const', description: 'Vertical line $x = X_c$ never moves.' },
      { condition: 'Symmetric gauge', result: 'p_\\theta = L_z + \\tfrac12 q B r^{2} = const', description: '$L_z$ itself still oscillates unless the orbit is centered at the origin.' }
    ],
    greTraps: [
      { trap: 'Canonical vs mechanical', description: '$m\\mathbf{v} = \\mathbf{p} - q\\mathbf{A}$ turns with the cyclotron motion. In Landau gauge $p_y$ does not.' },
      { trap: 'Gauge dependence', description: 'Which component of $\\mathbf{p}$ is conserved depends on the gauge, even though $\\mathbf{B}$ and the orbit do not.' },
      { trap: 'Dimensions', description: 'If $q_i$ is an angle, $p_i$ has dimensions of angular momentum. The product $p_i q_i$ always has dimensions of action.' }
    ],
    parameters: [
      { id: 'B', label: 'Magnetic field $B$', type: 'range', min: 0.5, max: 3.0, step: 0.1, value: 1.5, default: 1.5, unit: 'T', hint: 'Uniform $\\mathbf{B}=B\\hat{\\mathbf{z}}$. Cyclotron frequency $\\omega_c=qB/m$; larger $B$ shrinks the gyroradius $\\rho=v_\\perp/|\\omega_c|$.' },
      { id: 'q', label: 'Charge $q$', type: 'range', min: -2, max: 2, step: 1, value: 1, default: 1, hint: 'Particle charge. The sign of $q$ flips $\\omega_c$ and the sense of gyration. Canonical $\\mathbf{p}=m\\mathbf{v}+q\\mathbf{A}$, so $q=0$ recovers $p=mv$.' },
      { id: 'gauge', label: 'Gauge choice', type: 'select', value: 'landau', default: 'landau', options: [
        { value: 'landau', label: 'Landau: $\\mathbf{A} = (0, Bx, 0)$' },
        { value: 'symmetric', label: 'Symmetric: $\\mathbf{A} = \\frac12 B(-y, x)$' }
      ], hint: 'Choice of $\\mathbf{A}$ with $\\nabla\\times\\mathbf{A}=\\mathbf{B}$. Landau $\\mathbf{A}=(0,Bx,0)$ makes $y$ cyclic so $p_y$ is conserved; the symmetric gauge conserves $p_\\theta$ instead. The orbit itself is gauge-invariant.' },
      SPEED_PARAM
    ],
    init: function (container, state, redraw) {
      state.B = num(state.B, 1.5);
      state.q = num(state.q, 1);
      state.gauge = state.gauge || 'landau';
      state.simSpeed = simSpeedOf(state);
      if (!Number.isFinite(state.x)) resetCyclotron(state);
      if (!Array.isArray(state.trail)) state.trail = [];
      if (U && typeof U.createControlUI === 'function') {
        U.createControlUI(container, [
          { id: 'reset', label: 'Reset trajectory', type: 'button', text: 'Reset particle', onClick: function () { resetCyclotron(state); } }
        ], function () { redraw(); });
      }
    },
    onParamChange: function (id, val, state) {
      if (id === 'B' || id === 'q' || id === 'gauge') resetCyclotron(state);
    },
    draw: function (ctx, width, height, state, dt) {
      fillStage(ctx, width, height);
      state = state || {};
      var mass = 1.0;
      var B = Math.max(0.05, num(state.B, 1.5));
      var qCh = num(state.q, 1);
      var gauge = state.gauge === 'symmetric' ? 'symmetric' : 'landau';
      if (!Number.isFinite(state.x)) state.x = -0.55;
      if (!Number.isFinite(state.y)) state.y = 0;
      if (!Number.isFinite(state.vx)) state.vx = 0;
      if (!Number.isFinite(state.vy)) state.vy = 2.0;
      if (!Array.isArray(state.trail)) state.trail = [];
      if (!Number.isFinite(state.tSim)) state.tSim = 0;

      var dtv = scaledDt(dt, state);
      var omegaC = (qCh * B) / mass;
      var Xc = state.x;
      var Yc = state.y;
      if (Math.abs(omegaC) > 1e-8) {
        Xc = state.x + state.vy / omegaC;
        Yc = state.y - state.vx / omegaC;
      }

      if (dtv > 0) {
        if (Math.abs(omegaC) < 1e-8) {
          state.x += state.vx * dtv;
          state.y += state.vy * dtv;
        } else {
          var cyc = Math.cos(omegaC * dtv);
          var syc = Math.sin(omegaC * dtv);
          var vxNew = state.vx * cyc + state.vy * syc;
          var vyNew = -state.vx * syc + state.vy * cyc;
          state.vx = vxNew;
          state.vy = vyNew;
          state.x = Xc - vyNew / omegaC;
          state.y = Yc + vxNew / omegaC;
        }
        state.tSim += dtv;
        if (Math.hypot(state.x, state.y) > 4.5) resetCyclotron(state);
        state.trail.push({ x: state.x, y: state.y });
        if (state.trail.length > 220) state.trail.shift();
      }

      var Ax, Ay;
      if (gauge === 'landau') {
        Ax = 0;
        Ay = B * state.x;
      } else {
        Ax = -0.5 * B * state.y;
        Ay = 0.5 * B * state.x;
      }
      var pMechX = mass * state.vx;
      var pMechY = mass * state.vy;
      var pCanonX = pMechX + qCh * Ax;
      var pCanonY = pMechY + qCh * Ay;
      var pTheta = state.x * pCanonY - state.y * pCanonX;
      var Lz = state.x * pMechY - state.y * pMechX;
      var landau = gauge === 'landau';
      var conserved = landau ? pCanonY : pTheta;
      var oscillating = landau ? pMechY : Lz;

      legend('Canonical $p = \\partial L/\\partial\\dot{q}$', [
        { label: 'gauge', value: landau ? '$\\mathbf{A}=(0,Bx,0)$, $y$ cyclic' : '$\\mathbf{A}=\\frac12 B(-y,x)$, $\\theta$ cyclic', hint: 'Which coordinate is cyclic depends on the gauge, not on $\\mathbf{B}$. The trajectory is gauge-invariant; which $p_i$ is constant is not.' },
        { label: landau ? '$p_y = mv_y + qBx$' : '$p_\\theta = L_z + \\frac12 q B r^{2}$', value: fmt(conserved, 3), hint: 'Canonical $p_i=\\partial L/\\partial\\dot{q}_i$. Landau: $p_y=mv_y+qBx=qB X_c$ (guiding-center $x$). Symmetric: $p_\\theta=L_z+\\frac12 q B r^{2}$.' },
        { label: landau ? '$mv_y$' : '$L_z$', value: fmt(oscillating, 3), hint: 'Mechanical $mv_y$ (or $L_z$) still oscillates with the cyclotron motion. It is not the conserved canonical momentum.' },
        { label: '$|m\\mathbf{v}|$', value: fmt(Math.hypot(pMechX, pMechY), 3), hint: 'Speed is constant in a static $\\mathbf{B}$ (magnetic force does no work). $|m\\mathbf{v}|$ is not the canonical $|\\mathbf{p}|$.' },
        { label: landau ? 'geometry' : 'orbit', value: landau ? '$x=X_c=p_y/(qB)$ is the gold line' : 'same cyclotron; different conserved $p$', hint: 'Landau: the gold line $x=X_c=p_y/(qB)$ never moves. Symmetric: the same cyclotron circle, but the conserved quantity is $p_\\theta$, not a Cartesian line.' }
      ]);

      var pad = 18;
      var cx = width * 0.5;
      var cy = 12 + (height - 28) * 0.5;
      var viewR = 2.6;
      var scale = Math.max(16, Math.min((width - 2 * pad) / (2 * viewR), (height - 40) / (2 * viewR)));
      function sx(x) { return cx + x * scale; }
      function sy(y) { return cy - y * scale; }

      ctx.save();
      clipRect(ctx, pad, 8, width - 2 * pad, height - 20);

      ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.22);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx(-viewR), cy);
      ctx.lineTo(sx(viewR), cy);
      ctx.moveTo(cx, sy(-viewR));
      ctx.lineTo(cx, sy(viewR));
      ctx.stroke();

      if (Math.abs(omegaC) > 1e-8) {
        var rho = Math.hypot(state.x - Xc, state.y - Yc);
        ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.16);
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(sx(Xc), sy(Yc), Math.max(2, rho * scale), 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        drawDot(ctx, sx(Xc), sy(Yc), 3.2, GOLD, null);
        if (landau) {
          ctx.strokeStyle = 'rgba(212, 160, 23, 0.7)';
          ctx.lineWidth = 1.6;
          ctx.setLineDash([5, 4]);
          ctx.beginPath();
          ctx.moveTo(sx(Xc), sy(-viewR));
          ctx.lineTo(sx(Xc), sy(viewR));
          ctx.stroke();
          ctx.setLineDash([]);
          haloLabel(ctx, sx(Xc) + 8, sy(viewR) + 4, 'Xc', GOLD, 'left');
        }
      }

      if (state.trail.length > 1) {
        strokePoly(ctx, state.trail.map(function (pt) {
          return { x: sx(pt.x), y: sy(pt.y) };
        }), 'rgba(204, 120, 92, 0.55)', 2);
      }

      var px = sx(state.x);
      var py = sy(state.y);
      var vScale = 16;
      var mx2 = px + pMechX * vScale;
      var my2 = py - pMechY * vScale;
      var ax2 = px + qCh * Ax * vScale;
      var ay2 = py - qCh * Ay * vScale;
      var Px2 = px + pCanonX * vScale;
      var Py2 = py - pCanonY * vScale;

      ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.18);
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(mx2, my2);
      ctx.lineTo(Px2, Py2);
      ctx.lineTo(ax2, ay2);
      ctx.stroke();
      ctx.setLineDash([]);

      arrow(ctx, px, py, mx2, my2, CORAL, 2.2);
      if (Math.hypot(qCh * Ax, qCh * Ay) > 0.04) arrow(ctx, px, py, ax2, ay2, GOLD, 2.2);
      arrow(ctx, px, py, Px2, Py2, TEAL, 2.5);

      if (Math.hypot(mx2 - px, my2 - py) > 14) haloLabel(ctx, mx2, my2 - 10, 'mv', CORAL, 'center');
      if (Math.hypot(ax2 - px, ay2 - py) > 14) haloLabel(ctx, ax2, ay2 - 10, 'qA', GOLD, 'center');
      if (Math.hypot(Px2 - px, Py2 - py) > 14) haloLabel(ctx, Px2, Py2 + 12, 'P', TEAL, 'center');

      drawDot(ctx, px, py, 6, CORAL, INK);
      ctx.restore();

      axisText(ctx, 'x', sx(viewR) - 6, cy - 6, 'right');
      axisText(ctx, 'y', cx + 8, sy(viewR) + 12, 'left');

      var cycSpots = [
        { id: 'charge', kind: 'circle', x: px, y: py, r: 14, title: 'Charged particle', body: 'At $(' + fmt(state.x, 2) + ',' + fmt(state.y, 2) + ')$ with $q=' + fmt(qCh, 0) + '$, $B=' + fmt(B, 1) + '\\,\\mathrm{T}$. Mechanical $\\mathbf{p}_{\\mathrm{mech}}=m\\mathbf{v}$; canonical $\\mathbf{p}=m\\mathbf{v}+q\\mathbf{A}$.' },
        { id: 'mv', kind: 'segment', x1: px, y1: py, x2: mx2, y2: my2, halfW: 8, title: 'Mechanical $m\\mathbf{v}$', body: '$m\\mathbf{v}=(' + fmt(pMechX, 2) + ',' + fmt(pMechY, 2) + ')$. This coral arrow turns with the cyclotron motion; it is not conserved in Landau gauge.' },
        { id: 'Pcan', kind: 'segment', x1: px, y1: py, x2: Px2, y2: Py2, halfW: 8, title: 'Canonical $\\mathbf{p}$', body: '$\\mathbf{p}=m\\mathbf{v}+q\\mathbf{A}=(' + fmt(pCanonX, 2) + ',' + fmt(pCanonY, 2) + ')$. Landau conserves $p_y=' + fmt(pCanonY, 3) + '$; the symmetric gauge conserves $p_\\theta=' + fmt(pTheta, 3) + '$ instead.' }
      ];
      if (Math.hypot(qCh * Ax, qCh * Ay) > 0.04) {
        cycSpots.push({ id: 'qA', kind: 'segment', x1: px, y1: py, x2: ax2, y2: ay2, halfW: 8, title: 'Minimal coupling $q\\mathbf{A}$', body: '$q\\mathbf{A}=(' + fmt(qCh * Ax, 2) + ',' + fmt(qCh * Ay, 2) + ')$. This gold piece is what makes $\\mathbf{p}\\neq m\\mathbf{v}$; it is gauge-dependent.' });
      }
      if (Math.abs(omegaC) > 1e-8) {
        var rhoPix = Math.max(2, Math.hypot(state.x - Xc, state.y - Yc) * scale);
        cycSpots.push({ id: 'guide', kind: 'circle', x: sx(Xc), y: sy(Yc), r: 10, title: 'Guiding center', body: 'Cyclotron center $(X_c,Y_c)=(' + fmt(Xc, 2) + ',' + fmt(Yc, 2) + ')$. In Landau gauge $X_c=p_y/(qB)$ is an exact constant of motion.' });
        if (landau) {
          cycSpots.push({ id: 'Xc', kind: 'segment', x1: sx(Xc), y1: sy(-viewR), x2: sx(Xc), y2: sy(viewR), halfW: 8, title: 'Conserved $x=X_c$', body: 'Landau gauge: $y$ is cyclic so $p_y=mv_y+qBx=' + fmt(pCanonY, 3) + '$ is constant, hence this gold line $x=X_c=' + fmt(Xc, 2) + '$ never moves.' });
        }
        cycSpots.push({ id: 'orbit', kind: 'ring', x: sx(Xc), y: sy(Yc), r: rhoPix, halfW: 8, title: 'Cyclotron orbit', body: 'Gyroradius $\\rho=' + fmt(Math.hypot(state.x - Xc, state.y - Yc), 2) + '$ at $\\omega_c=qB/m=' + fmt(omegaC, 2) + '\\,\\mathrm{rad/s}$. The circle is gauge-invariant; which $p_i$ is conserved is not.' });
      }
      if (PGRE.setVizHotspots) PGRE.setVizHotspots(cycSpots);
    },
    challenge: {
      question: "A particle of mass $m$ and charge $q$ moves in a uniform magnetic field $\\mathbf{B} = B \\hat{\\mathbf{z}}$ using the Landau gauge $\\mathbf{A} = (0, Bx, 0)$. Which quantity is an exact constant of motion?",
      options: [
        "A) $m v_y$",
        "B) $m v_y + q B x$",
        "C) $m v_x + q B y$",
        "D) $m (v_x^{2} + v_y^{2}) + q B x$",
        "E) $m (v_x + v_y)$"
      ],
      correct: 1,
      explanation: "In Landau gauge $L = \\frac12 m(\\dot{x}^{2}+\\dot{y}^{2}+\\dot{z}^{2}) + q B x\\dot{y}$. The coordinate $y$ is cyclic, so $p_y = \\partial L/\\partial\\dot{y} = mv_y + qBx$ is strictly conserved. $p_y/(qB)$ is the $x$-coordinate of the cyclotron guiding center."
    }
  };

})(typeof window !== 'undefined' ? window : globalThis);
