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
  var GOOD = '#22c55e';
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

  function titleBand(ctx, text, x, y) {
    ctx.save();
    ctx.fillStyle = INK;
    ctx.font = '600 12px Inter, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, x, y);
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

  function divider(ctx, x, h) {
    ctx.save();
    ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.12);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, 8);
    ctx.lineTo(x, h - 8);
    ctx.stroke();
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

  /* Stationary (EL) path for U = 2(q^2-1)^2, q(0)=-1.2, q(1)=1.2.
     Energy quadrature: unique E > barrier with travel time T = 1. */
  var QUARTIC_SAMPLES = null;
  var QUARTIC_Q0 = -1.2;
  var QUARTIC_Q1 = 1.2;
  var QUARTIC_T = 1.0;

  function quarticU(q) {
    var z = q * q - 1.0;
    return 2.0 * z * z;
  }

  function quarticTravelTime(E, nQ) {
    var dq = (QUARTIC_Q1 - QUARTIC_Q0) / nQ;
    var t = 0;
    var i, q, kin;
    for (i = 0; i < nQ; i++) {
      q = QUARTIC_Q0 + (i + 0.5) * dq;
      kin = E - quarticU(q);
      if (kin < 1e-10) return 1e9;
      t += dq / Math.sqrt(2.0 * kin);
    }
    return t;
  }

  function ensureQuarticSamples() {
    if (QUARTIC_SAMPLES) return QUARTIC_SAMPLES;
    var nQ = 400;
    var targetT = QUARTIC_T;
    var lo = 2.02;
    var hi = 40;
    var k, mid, tm;
    for (k = 0; k < 48; k++) {
      mid = 0.5 * (lo + hi);
      tm = quarticTravelTime(mid, nQ);
      if (tm > targetT) lo = mid;
      else hi = mid;
    }
    var E = 0.5 * (lo + hi);
    var samples = [{ t: 0, q: QUARTIC_Q0 }];
    var dq = (QUARTIC_Q1 - QUARTIC_Q0) / nQ;
    var t = 0;
    var i, qMid, kin;
    for (i = 0; i < nQ; i++) {
      qMid = QUARTIC_Q0 + (i + 0.5) * dq;
      kin = Math.max(1e-10, E - quarticU(qMid));
      t += dq / Math.sqrt(2.0 * kin);
      samples.push({ t: t, q: QUARTIC_Q0 + (i + 1) * dq });
    }
    samples[samples.length - 1].t = QUARTIC_T;
    samples[samples.length - 1].q = QUARTIC_Q1;
    QUARTIC_SAMPLES = samples;
    return samples;
  }

  function quarticTrueQ(t) {
    var samples = ensureQuarticSamples();
    if (t <= 0) return samples[0].q;
    if (t >= QUARTIC_T) return samples[samples.length - 1].q;
    var lo = 0;
    var hi = samples.length - 1;
    var m;
    while (hi - lo > 1) {
      m = (lo + hi) >> 1;
      if (samples[m].t <= t) lo = m;
      else hi = m;
    }
    var a = samples[lo];
    var b = samples[hi];
    var span = b.t - a.t;
    if (!(span > 0)) return a.q;
    var f = (t - a.t) / span;
    return a.q + f * (b.q - a.q);
  }


  PGRE.visualizers['cpgf-1.28'] = {
    id: 'cpgf-1.28',
    topic: 'cm',
    title: 'Lagrangian Definition: $L(q, \\dot{q}, t) = T - U$',
    formulaLatex: 'L(q, \\dot{q}, t) = T - U',
    physicalStory: `
The Lagrangian $L = T - U$ is the fundamental generating function of classical mechanics. While total mechanical energy $E = T + U$ is conserved along the physical path, it is the difference $L = T - U$ whose time integral—the Action $S = \\int L \\, dt$—is made stationary by nature (Hamilton's Principle of Stationary Action, $\\delta S = 0$).

Kinetic energy $T$ acts as a penalty against excessive velocity and spatial curvature, while potential energy $U$ penalizes spending time in high-potential regions. Hamilton's principle seeks the exact physical trajectory that balances kinetic cost with potential terrain.
    `.trim(),
    derivationSteps: [
      "1. Start from D'Alembert's principle of virtual work: $\\sum_i (m_i \\ddot{\\mathbf{r}}_i - \\mathbf{F}_i) \\cdot \\delta \\mathbf{r}_i = 0$.",
      "2. For monogenic, conservative systems, generalized force is $Q_j = -\\frac{\\partial U}{\\partial q_j}$, assuming $U = U(q)$ is velocity-independent.",
      "3. Transform inertial terms into generalized coordinates: $\\sum_i m_i \\ddot{\\mathbf{r}}_i \\cdot \\frac{\\partial \\mathbf{r}_i}{\\partial q_j} = \\frac{d}{dt}\\left(\\frac{\\partial T}{\\partial \\dot{q}_j}\\right) - \\frac{\\partial T}{\\partial q_j}$.",
      "4. Group kinetic and potential components: $\\frac{d}{dt}\\left(\\frac{\\partial T}{\\partial \\dot{q}_j}\\right) - \\frac{\\partial (T - U)}{\\partial q_j} = 0$.",
      "5. Since $\\frac{\\partial U}{\\partial \\dot{q}_j} = 0$, define $L \\equiv T - U$, which simplifies the equations of motion to $\\frac{d}{dt}\\left(\\frac{\\partial L}{\\partial \\dot{q}_j}\\right) - \\frac{\\partial L}{\\partial q_j} = 0$."
    ],
    limitingCases: [
      { condition: 'Free Particle ($U = 0$)', result: 'L = T = \\frac{1}{2}m\\dot{q}^2', description: 'Straight-line uniform motion (geodesic in flat space).' },
      { condition: 'Constant Potential ($U = U_0$)', result: 'L = T - U_0', description: 'Equations of motion are completely unchanged by constant potential shifts.' },
      { condition: 'Static Limit ($\\dot{q} = 0$)', result: 'L = -U(q)', description: 'Stationary action reduces to minimizing potential energy $\\nabla U = 0$ (static equilibrium).' },
      { condition: 'Relativistic Limit', result: 'L = -mc^2\\sqrt{1 - v^2/c^2} - U', description: 'Taylor expansion yields $\\frac{1}{2}mv^2 - mc^2 - U$, recovering $T - U$ up to a constant rest mass energy.' }
    ],
    greTraps: [
      { trap: 'Sign of Potential Energy', description: 'Never write $L = T + U$. Remember: Lagrangian has Less/Minus ($L = T - U$), Hamiltonian has Heavy/Plus ($H = T + U$).' },
      { trap: 'Gauge Invariance & Total Time Derivatives', description: 'Adding a total time derivative $\\frac{d F(q, t)}{dt}$ to $L$ produces identical Euler-Lagrange equations.' },
      { trap: 'Velocity-Dependent Potentials', description: 'For a charge $q$ in an electromagnetic field, $L = \\frac{1}{2}mv^2 - q\\phi + q\\mathbf{A}\\cdot\\mathbf{v}$. The potential term is generalized.' }
    ],
    parameters: [
      { id: 'alpha', label: 'Perturbation $\\alpha$', type: 'range', min: -2, max: 2, step: 0.05, value: 0.6, default: 0.6, format: v => v.toFixed(2) },
      { id: 'mode', label: 'Harmonic mode $n$', type: 'range', min: 1, max: 3, step: 1, value: 1, default: 1, format: v => `${v}` },
      { id: 'potential', label: 'Potential $U(q)$', type: 'select', value: 'gravity', default: 'gravity', options: [
        { value: 'gravity', label: 'Uniform gravity: $U = mg q$' },
        { value: 'harmonic', label: 'Harmonic well: $U = \\frac{1}{2}k q^{2}$' },
        { value: 'quartic', label: 'Double well: $U = 2(q^{2}-1)^{2}$' }
      ]},
      { id: 'animate', label: 'Playback', type: 'toggle', value: true, default: true },
      SPEED_PARAM
    ],
    init(container, state, redraw) {
      state.alpha = state.alpha ?? 0.6;
      state.mode = state.mode ?? 1;
      state.potential = state.potential ?? 'gravity';
      state.animate = state.animate ?? true;
      state.simSpeed = simSpeedOf(state);
      state.tAnim = num(state.tAnim, 0);

      const controls = [
        { id: 'resetAlpha', label: 'Extremum ($\\alpha=0$)', type: 'button', text: 'Set True Path (α=0)', onClick: () => { state.alpha = 0; } }
      ];

      U.createControlUI(container, controls, (id, val) => {
        if (id === 'resetAlpha') {
          state.alpha = 0;
          // Init container holds only action buttons; sync the standard parameters-panel slider.
          const panel = container.parentNode;
          const range = panel && panel.querySelector('#viz-ctrl-alpha');
          if (range) range.value = 0;
          const disp = panel && panel.querySelector('#viz-val-alpha');
          if (disp) disp.textContent = '0';
        } else {
          state[id] = val;
        }
        redraw();
      });
    },
    draw(ctx, width, height, state, dt) {
      fillStage(ctx, width, height);
      state = state || {};

      const alpha = num(state.alpha, 0.6);
      const mode = Math.max(1, Math.round(num(state.mode, 1)));
      const potential = state.potential || 'gravity';
      const animate = state.animate !== false;
      const dtv = scaledDt(dt, state);
      if (!Number.isFinite(state.tAnim)) state.tAnim = 0;
      if (animate) state.tAnim = (state.tAnim + dtv * 0.8) % 1.0;

      const m = 1.0;
      const T_total = 1.0;
      const q0 = -1.2, q1 = 1.2;

      const getTruePath = (t) => {
        if (potential === 'gravity') {
          const g = 4.0;
          return q0 + (q1 - q0) * (t / T_total) + 0.5 * g * t * (T_total - t);
        } else if (potential === 'harmonic') {
          const omega = 2.5;
          const A = q0;
          const den = Math.sin(omega * T_total);
          const B = den === 0 ? 0 : (q1 - q0 * Math.cos(omega * T_total)) / den;
          return A * Math.cos(omega * t) + B * Math.sin(omega * t);
        }
        return quarticTrueQ(t);
      };

      const getPerturbedPath = (t, a) => {
        const eta = Math.sin(mode * Math.PI * (t / T_total));
        return getTruePath(t) + a * eta;
      };

      const getU = (q) => {
        if (potential === 'gravity') return 4.0 * q;
        if (potential === 'harmonic') return 0.5 * 6.25 * q * q;
        return 2.0 * Math.pow(q * q - 1.0, 2);
      };

      const computeAction = (a) => {
        const steps = 80;
        const dtStep = T_total / steps;
        let S = 0;
        for (let i = 0; i < steps; i++) {
          const t = i * dtStep;
          const tNext = (i + 1) * dtStep;
          const qMid = getPerturbedPath(t + dtStep * 0.5, a);
          const v = (getPerturbedPath(tNext, a) - getPerturbedPath(t, a)) / dtStep;
          S += (0.5 * m * v * v - getU(qMid)) * dtStep;
        }
        return S;
      };

      const curT = state.tAnim * T_total;
      const curQ = getPerturbedPath(curT, alpha);
      const dtSmall = 0.001;
      const vCur = (getPerturbedPath(curT + dtSmall, alpha) - getPerturbedPath(curT - dtSmall, alpha)) / (2 * dtSmall);
      const curKin = 0.5 * m * vCur * vCur;
      const curPot = getU(curQ);
      const curLag = curKin - curPot;
      const curAction = computeAction(alpha);
      const atStationary = Math.abs(alpha) < 0.03;

      legend('Lagrangian $L = T - U$', [
        { label: '$T$', value: fmt(curKin) },
        { label: '$U$', value: fmt(curPot) },
        { label: '$L = T - U$', value: fmt(curLag) },
        { label: '$S[\\alpha]$', value: fmt(curAction, 3) },
        { label: 'path', value: atStationary ? 'stationary ($\\alpha = 0$)' : 'varied, $\\alpha = ' + fmt(alpha) + '$' }
      ]);

      const splitX = Math.floor(width * 0.56);
      divider(ctx, splitX, height);

      const titleY = 18;
      const boxTop = 28;
      const boxBot = height - 26;
      const boxH = Math.max(12, boxBot - boxTop);

      // LEFT: q(t)
      const lPadL = 40;
      const lPadR = 12;
      const lx = lPadL;
      const ly = boxTop;
      const lw = Math.max(12, splitX - lPadL - lPadR);
      const lh = boxH;

      titleBand(ctx, 'Path q(t)', 14, titleY);
      plotBox(ctx, lx, ly, lw, lh);
      innerGrid(ctx, lx, ly, lw, lh, 4, 4);

      let qMin = Infinity, qMax = -Infinity;
      for (let i = 0; i <= 80; i++) {
        const t = (i / 80) * T_total;
        const qP = getPerturbedPath(t, alpha);
        const qTr = getTruePath(t);
        qMin = Math.min(qMin, qP, qTr);
        qMax = Math.max(qMax, qP, qTr);
      }
      const qPad = Math.max(0.35, (qMax - qMin) * 0.18);
      qMin -= qPad;
      qMax += qPad;
      if (qMax <= qMin) { qMin = -3; qMax = 3; }

      const toSX = (t) => lx + (t / T_total) * lw;
      const toSY = (q) => ly + lh * (1 - (q - qMin) / (qMax - qMin));

      ctx.save();
      clipRect(ctx, lx, ly, lw, lh);

      if (qMin < 0 && qMax > 0) {
        ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.22);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(lx, toSY(0));
        ctx.lineTo(lx + lw, toSY(0));
        ctx.stroke();
      }

      const truePts = [];
      const varPts = [];
      for (let i = 0; i <= 80; i++) {
        const t = (i / 80) * T_total;
        truePts.push({ x: toSX(t), y: toSY(getTruePath(t)) });
        varPts.push({ x: toSX(t), y: toSY(getPerturbedPath(t, alpha)) });
      }
      strokePoly(ctx, truePts, GOOD, 2.4, [5, 4]);
      strokePoly(ctx, varPts, CORAL, 2.2);

      drawDot(ctx, toSX(0), toSY(q0), 4, INK, null);
      drawDot(ctx, toSX(T_total), toSY(q1), 4, INK, null);
      drawDot(ctx, toSX(curT), toSY(curQ), 6, GOLD, INK);
      ctx.restore();

      axisText(ctx, 't = 0', lx, height - 10, 'left');
      axisText(ctx, 't = T', lx + lw, height - 10, 'right');
      axisText(ctx, 'q', 12, ly + 12, 'left');

      // RIGHT: S(α)
      const rx0 = splitX + 16;
      const rPadL = 36;
      const rx = rx0 + rPadL;
      const ry = boxTop;
      const rw = Math.max(12, width - rx - 14);
      const rh = boxH;

      titleBand(ctx, 'Action S[α]', rx0, titleY);
      plotBox(ctx, rx, ry, rw, rh);
      innerGrid(ctx, rx, ry, rw, rh, 4, 4);

      const alphaPoints = [];
      let minS = Infinity, maxS = -Infinity;
      for (let a = -2.0; a <= 2.05; a += 0.1) {
        const sVal = computeAction(a);
        alphaPoints.push({ a, s: sVal });
        if (sVal < minS) minS = sVal;
        if (sVal > maxS) maxS = sVal;
      }
      const sPadding = Math.max(0.4, (maxS - minS) * 0.18);
      minS -= sPadding;
      maxS += sPadding;
      if (maxS <= minS) { minS -= 1; maxS += 1; }

      const toAX = (a) => rx + ((a + 2.0) / 4.0) * rw;
      const toAY = (s) => ry + rh * (1 - (s - minS) / (maxS - minS));

      ctx.save();
      clipRect(ctx, rx, ry, rw, rh);

      const s0x = toAX(0);
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.45)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(s0x, ry);
      ctx.lineTo(s0x, ry + rh);
      ctx.stroke();
      ctx.setLineDash([]);

      const sPts = alphaPoints.map(pt => ({ x: toAX(pt.a), y: toAY(pt.s) }));
      strokePoly(ctx, sPts, TEAL, 2.3);

      const s0 = computeAction(0);
      drawDot(ctx, s0x, toAY(s0), 5, GOOD, INK);
      drawDot(ctx, toAX(alpha), toAY(curAction), 6, CORAL, INK);
      ctx.restore();

      axisText(ctx, '−2', rx, height - 10, 'left');
      axisText(ctx, '0', s0x, height - 10, 'center');
      axisText(ctx, '+2', rx + rw, height - 10, 'right');
      axisText(ctx, 'S', rx0 + 4, ry + 12, 'left');
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
      explanation: "According to gauge invariance in Lagrangian mechanics, adding the total time derivative of any function of coordinates and time, $\\frac{d F(q, t)}{dt}$, leaves the Euler-Lagrange equations unchanged because its variation $\\delta\\int (\\mathrm{d}F/\\mathrm{d}t)\\,\\mathrm{d}t = \\delta[F(t_2)-F(t_1)] = 0$ vanishes at fixed endpoints. Option B adds $\\mathrm{d}F/\\mathrm{d}t$ with $F(x,t) = c x^{2} t$. Option D adds a term with explicit velocity dependence in $F$, which is not a valid coordinate gauge function."
    }
  };

  PGRE.visualizers['cpgf-1.29'] = {
    id: 'cpgf-1.29',
    topic: 'cm',
    title: 'Euler-Lagrange Equations: $\\frac{d}{dt}\\left(\\frac{\\partial L}{\\partial \\dot{q}_i}\\right) = \\frac{\\partial L}{\\partial q_i}$',
    formulaLatex: '\\frac{d}{dt}\\left(\\frac{\\partial L}{\\partial \\dot{q}_i}\\right) = \\frac{\\partial L}{\\partial q_i}',
    physicalStory: `
The Euler-Lagrange equations are the cornerstone of variational mechanics. They assert that the rate of change of canonical momentum $\\frac{d}{dt}(\\frac{\\partial L}{\\partial \\dot{q}})$ precisely equals the generalized force $\\frac{\\partial L}{\\partial q}$. 

Remarkably, the Euler-Lagrange formulation automatically eliminates all workless holonomic constraint forces (such as the normal force holding a bead on a rotating wire), bypassing the complex vector projections required by Newton's Second Law.
    `.trim(),
    derivationSteps: [
      "1. Hamilton's Principle asserts that the action $S = \\int_{t_1}^{t_2} L(q, \\dot{q}, t) \\, dt$ is stationary under variations $\\delta q(t)$ with $\\delta q(t_1) = \\delta q(t_2) = 0$.",
      "2. Expand the variation to first order: $\\delta S = \\int_{t_1}^{t_2} \\left( \\frac{\\partial L}{\\partial q} \\delta q + \\frac{\\partial L}{\\partial \\dot{q}} \\delta \\dot{q} \\right) dt = 0$.",
      "3. Use the identity $\\delta \\dot{q} = \\frac{d}{dt}(\\delta q)$ and integrate the second term by parts: $\\int_{t_1}^{t_2} \\frac{\\partial L}{\\partial \\dot{q}} \\frac{d}{dt}(\\delta q) dt = \\left[ \\frac{\\partial L}{\\partial \\dot{q}} \\delta q \\right]_{t_1}^{t_2} - \\int_{t_1}^{t_2} \\frac{d}{dt}\\left(\\frac{\\partial L}{\\partial \\dot{q}}\\right) \\delta q \\, dt$.",
      "4. The boundary term vanishes since endpoints are fixed: $\\delta q(t_1) = \\delta q(t_2) = 0$.",
      "5. Combining gives $\\int_{t_1}^{t_2} \\left[ \\frac{\\partial L}{\\partial q} - \\frac{d}{dt}\\left(\\frac{\\partial L}{\\partial \\dot{q}}\\right) \\right] \\delta q(t) \\, dt = 0$.",
      "6. By the Fundamental Lemma of the Calculus of Variations, since $\\delta q(t)$ is arbitrary, the integrand must vanish identically: $\\frac{d}{dt}\\left(\\frac{\\partial L}{\\partial \\dot{q}}\\right) = \\frac{\\partial L}{\\partial q}$."
    ],
    limitingCases: [
      { condition: 'Cartesian Coordinate ($q = x$)', result: 'm\\ddot{x} = -\\frac{\\partial U}{\\partial x} = F_x', description: 'Recovers standard Newtonian 2nd Law for a particle.' },
      { condition: 'Polar Coordinates ($q = \\theta$)', result: '\\frac{d}{dt}(mr^2\\dot{\\theta}) = -\\frac{\\partial U}{\\partial \\theta} = \\tau_z', description: 'Recovers rotational form of Newton 2nd Law (Torque = rate of change of angular momentum).' },
      { condition: 'Cyclic / Ignorable Coordinate ($\\partial L / \\partial q_k = 0$)', result: 'p_k = \\frac{\\partial L}{\\partial \\dot{q}_k} = \\text{const}', description: 'Conservation of canonical momentum (Noether\'s Theorem).' }
    ],
    greTraps: [
      { trap: 'Total vs Partial Time Derivative', description: '$\\frac{d}{dt}\\left(\\frac{\\partial L}{\\partial \\dot{q}}\\right)$ is a TOTAL derivative. You must apply the chain rule: $\\frac{d}{dt} = \\dot{q}\\frac{\\partial}{\\partial q} + \\ddot{q}\\frac{\\partial}{\\partial \\dot{q}} + \\frac{\\partial}{\\partial t}$.' },
      { trap: 'Implicit Coordinate Dependencies', description: 'In polar coordinates $T = \\frac{1}{2}m(\\dot{r}^2 + r^2\\dot{\\theta}^2)$, $\\frac{\\partial L}{\\partial r} = mr\\dot{\\theta}^2$ represents the fictitious centrifugal force term. Do not forget it!' }
    ],
    parameters: [
      { id: 'omega', label: 'Hoop spin $\\omega$', type: 'range', min: 0, max: 6, step: 0.1, value: 3.5, default: 3.5, unit: 'rad/s' },
      { id: 'g', label: 'Gravity $g$', type: 'range', min: 1, max: 20, step: 0.5, value: 9.8, default: 9.8, unit: 'm/s²' },
      { id: 'theta0', label: 'Initial angle $\\theta_0$', type: 'range', min: -3.14, max: 3.14, step: 0.05, value: 0.8, default: 0.8 },
      SPEED_PARAM
    ],
    init(container, state, redraw) {
      state.omega = state.omega ?? 3.5;
      state.g = state.g ?? 9.8;
      state.R = 1.0;
      state.simSpeed = simSpeedOf(state);
      state.theta = num(state.theta, num(state.theta0, 0.8));
      state.thetaDot = num(state.thetaDot, 0);
      state.phi = num(state.phi, 0);

      const controls = [
        { id: 'reset', label: 'Perturb Bead', type: 'button', text: 'Kick Bead (+1.5 rad/s)', onClick: () => { state.thetaDot += 1.5; } }
      ];
      U.createControlUI(container, controls, (id, val) => {
        state[id] = val;
        redraw();
      });
    },
    onParamChange(id, val, state) {
      if (id === 'theta0') {
        state.theta = val;
        state.thetaDot = 0;
      }
    },
    draw(ctx, width, height, state, dt) {
      fillStage(ctx, width, height);
      state = state || {};

      const omega = num(state.omega, 3.5);
      const g = num(state.g, 9.8);
      const R = 1.0;
      if (!Number.isFinite(state.theta)) state.theta = num(state.theta0, 0.8);
      if (!Number.isFinite(state.thetaDot)) state.thetaDot = 0;
      if (!Number.isFinite(state.phi)) state.phi = 0;

      const dtv = scaledDt(dt, state);
      const gamma = 0.25;
      const subSteps = Math.max(8, Math.min(24, Math.round(8 * simSpeedOf(state))));
      const subDt = dtv / subSteps;
      for (let step = 0; step < subSteps; step++) {
        const accel = (omega * omega * Math.cos(state.theta) - g / R) * Math.sin(state.theta) - gamma * state.thetaDot;
        state.thetaDot += accel * subDt;
        state.theta += state.thetaDot * subDt;
      }
      state.phi += omega * dtv;

      while (state.theta > Math.PI) state.theta -= 2 * Math.PI;
      while (state.theta < -Math.PI) state.theta += 2 * Math.PI;

      const omega_c = Math.sqrt(Math.max(0, g / R));
      const isSupercritical = omega > omega_c + 1e-6;
      const theta_eq = isSupercritical ? Math.acos(Math.max(-1, Math.min(1, g / (R * omega * omega)))) : 0;

      const getUeff = (th) => {
        return -g * R * Math.cos(th) - 0.5 * omega * omega * R * R * Math.sin(th) * Math.sin(th);
      };

      legend('Euler–Lagrange: bead on a rotating hoop', [
        { label: '$\\omega$', value: fmt(omega, 1) + ' rad/s' },
        { label: '$\\omega_c = \\sqrt{g/R}$', value: fmt(omega_c, 2) + ' rad/s' },
        { label: 'regime', value: isSupercritical ? 'supercritical ($\\theta = 0$ unstable)' : 'subcritical ($\\theta = 0$ stable)' },
        { label: '$\\theta$', value: fmt(state.theta * 180 / Math.PI, 0) + '°' },
        { label: '$\\theta_{\\mathrm{eq}}$', value: isSupercritical ? '$\\pm$' + fmt(theta_eq * 180 / Math.PI, 0) + '°' : '$0^{\\circ}$' },
        { label: 'damping', value: 'linear $\\gamma\\dot{\\theta}$ with $\\gamma = 0.25$ (added so the bead settles; the GRE hoop is frictionless)' },
        { label: 'arrows', value: 'rose $mg$; gold $F_c = m\\omega^{2}\\rho$ with $\\rho = R\\sin\\theta$' }
      ]);

      const splitX = Math.floor(width * 0.52);
      divider(ctx, splitX, height);

      const cx = splitX * 0.5;
      const cy = 22 + (height - 22 - 22) / 2;
      const rPixels = Math.max(24, Math.min(cx - 36, cy - 34, height - cy - 28));

      titleBand(ctx, 'Bead on a rotating hoop', 14, 18);

      ctx.save();
      clipRect(ctx, 8, 22, splitX - 16, height - 30);

      ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.28);
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cx, cy - rPixels - 18);
      ctx.lineTo(cx, cy + rPixels + 10);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.14);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, rPixels, 0, Math.PI * 2);
      ctx.stroke();

      const aspect = Math.abs(Math.cos(state.phi));
      ctx.strokeStyle = CORAL;
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.max(3, rPixels * aspect), rPixels, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;

      const markEq = (th) => {
        const mx = cx + rPixels * Math.sin(th) * Math.cos(state.phi);
        const my = cy + rPixels * Math.cos(th);
        drawDot(ctx, mx, my, 3.5, GOOD, null);
      };
      if (isSupercritical) {
        markEq(theta_eq);
        markEq(-theta_eq);
      } else {
        markEq(0);
      }

      const bx = cx + rPixels * Math.sin(state.theta) * Math.cos(state.phi);
      const by = cy + rPixels * Math.cos(state.theta);

      const fgLen = Math.min(36, 22 * (g / 9.8));
      const rho = Math.abs(Math.sin(state.theta)) * R;
      const fcfLen = Math.min(40, 16 * (omega * omega * rho / 8));
      const cfSign = Math.sin(state.theta) >= 0 ? 1 : -1;
      const gx2 = bx;
      const gy2 = by + fgLen;
      const cfx2 = bx + cfSign * fcfLen * Math.cos(state.phi);
      const cfy2 = by;
      arrow(ctx, bx, by, gx2, gy2, ROSE, 2);
      arrow(ctx, bx, by, cfx2, cfy2, GOLD, 2);
      if (fgLen > 12) {
        var gAlign = bx > cx ? 'left' : 'right';
        haloLabel(ctx, bx + (gAlign === 'left' ? 8 : -8), by + fgLen * 0.55, 'mg', ROSE, gAlign);
      }
      if (Math.hypot(cfx2 - bx, cfy2 - by) > 12) {
        haloLabel(ctx, (bx + cfx2) / 2, by - 11, 'Fc', GOLD, 'center');
      }

      drawDot(ctx, bx, by, 7, CORAL, INK);
      ctx.restore();

      axisText(ctx, 'θ = 0 (bottom)', cx, height - 10, 'center');

      const rPadL = 34;
      const rx0 = splitX + 14;
      const rx = rx0 + rPadL;
      const ry = 28;
      const rw = Math.max(12, width - rx - 14);
      const rh = Math.max(12, height - ry - 26);

      titleBand(ctx, 'U_eff(θ)', rx0, 18);
      plotBox(ctx, rx, ry, rw, rh);
      innerGrid(ctx, rx, ry, rw, rh, 4, 4);

      const thPoints = [];
      let minU = Infinity, maxU = -Infinity;
      for (let th = -Math.PI; th <= Math.PI; th += 0.04) {
        const u = getUeff(th);
        thPoints.push({ th, u });
        if (u < minU) minU = u;
        if (u > maxU) maxU = u;
      }
      const uPad = Math.max(0.8, (maxU - minU) * 0.16);
      minU -= uPad;
      maxU += uPad;
      if (maxU <= minU) { minU -= 1; maxU += 1; }

      const toThX = (th) => rx + ((th + Math.PI) / (2 * Math.PI)) * rw;
      const toUY = (u) => ry + rh * (1 - (u - minU) / (maxU - minU));

      ctx.save();
      clipRect(ctx, rx, ry, rw, rh);

      const uPts = thPoints.map(pt => ({ x: toThX(pt.th), y: toUY(pt.u) }));
      strokePoly(ctx, uPts, CORAL, 2.3);

      ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.22);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(toThX(0), ry);
      ctx.lineTo(toThX(0), ry + rh);
      ctx.stroke();

      if (isSupercritical) {
        drawDot(ctx, toThX(theta_eq), toUY(getUeff(theta_eq)), 4, GOOD, INK);
        drawDot(ctx, toThX(-theta_eq), toUY(getUeff(-theta_eq)), 4, GOOD, INK);
      } else {
        drawDot(ctx, toThX(0), toUY(getUeff(0)), 4, GOOD, INK);
      }
      drawDot(ctx, toThX(state.theta), toUY(getUeff(state.theta)), 6, GOLD, INK);
      ctx.restore();

      axisText(ctx, '−π', rx, height - 10, 'left');
      axisText(ctx, '0', toThX(0), height - 10, 'center');
      axisText(ctx, '+π', rx + rw, height - 10, 'right');
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
      explanation: "From the Euler-Lagrange equation, the equilibrium condition $\\mathrm{d}U_{\\mathrm{eff}}/\\mathrm{d}\\theta = 0$ gives $(\\omega^{2} \\cos\\theta - g/R) \\sin\\theta = 0$. Non-zero equilibrium angles require $\\cos\\theta = g / (R \\omega^{2})$. Since $|\\cos\\theta| \\le 1$, a real solution for $\\theta \\neq 0$ exists if and only if $g / (R \\omega^{2}) < 1$, which means $\\omega > \\omega_c = \\sqrt{g / R}$. For $\\omega > \\omega_c$, the bottom position $\\theta = 0$ becomes an unstable local maximum, and two symmetric stable minima emerge at $\\cos\\theta_0 = g/(R \\omega^{2})$."
    }
  };

  PGRE.visualizers['cpgf-1.30'] = {
    id: 'cpgf-1.30',
    topic: 'cm',
    title: 'Canonical Momentum & Cyclic Coordinates: $p_i \\equiv \\frac{\\partial L}{\\partial \\dot{q}_i}$',
    formulaLatex: 'p_i \\equiv \\frac{\\partial L}{\\partial \\dot{q}_i}',
    physicalStory: `
Canonical momentum $p_i$ is the conjugate momentum to coordinate $q_i$. Crucially, canonical momentum is NOT always equal to mechanical momentum $m\\mathbf{v}$.

In polar coordinates, $p_\\theta = mr^2\\dot{\\theta}$ represents angular momentum (with units $\\text{kg}\\cdot\\text{m}^2/\\text{s}$, not $\\text{kg}\\cdot\\text{m}/\\text{s}$). In electrodynamics with a vector potential $\\mathbf{A}$, canonical momentum is $\\mathbf{p} = m\\mathbf{v} + q\\mathbf{A}$. If a coordinate $q_k$ is cyclic (absent from $L$), its conjugate momentum $p_k$ is strictly conserved!
    `.trim(),
    derivationSteps: [
      "1. Define generalized canonical momentum: $p_i \\equiv \\frac{\\partial L}{\\partial \\dot{q}_i}$.",
      "2. Euler-Lagrange equation states: $\\dot{p}_i = \\frac{d}{dt}\\left(\\frac{\\partial L}{\\partial \\dot{q}_i}\\right) = \\frac{\\partial L}{\\partial q_i}$.",
      "3. If coordinate $q_k$ does not appear in $L$ (cyclic/ignorable coordinate, $\\frac{\\partial L}{\\partial q_k} = 0$), then $\\dot{p}_k = 0 \\implies p_k = \\text{constant}$.",
      "4. Charged particle in magnetic field has Lagrangian: $L = \\frac{1}{2}m\\mathbf{v}^2 - q\\phi + q\\mathbf{A}\\cdot\\mathbf{v}$.",
      "5. Canonical momentum is: $\\mathbf{p} = \\frac{\\partial L}{\\partial \\mathbf{v}} = m\\mathbf{v} + q\\mathbf{A}$.",
      "6. In Landau gauge $\\mathbf{A} = (0, Bx, 0)$, the coordinate $y$ is cyclic, which guarantees that $p_y = mv_y + qBx = \\text{constant}$ is strictly conserved throughout cyclotron motion."
    ],
    limitingCases: [
      { condition: 'Standard Cartesian ($U$ velocity-independent)', result: 'p_x = m\\dot{x}', description: 'Canonical momentum equals standard Newtonian linear momentum.' },
      { condition: 'Polar Coordinates ($q = \\theta$, central force)', result: 'p_\\theta = mr^2\\dot{\\theta} = L_z', description: 'Canonical momentum is orbital angular momentum.' },
      { condition: 'Landau Gauge $\\mathbf{A} = (0, Bx, 0)$', result: 'p_y = mv_y + qBx = \\text{const}', description: 'Guiding center $X_0 = x + \\frac{v_y}{\\omega_c} = \\frac{p_y}{qB}$ is conserved.' }
    ],
    greTraps: [
      { trap: 'Canonical vs Mechanical Momentum in Magnetic Fields', description: 'Mechanical momentum $m\\mathbf{v} = \\mathbf{p} - q\\mathbf{A}$ changes direction during cyclotron orbits, but the canonical momentum $p_y$ in Landau gauge remains strictly invariant!' },
      { trap: 'Dimensions of Canonical Momentum', description: 'The product $p_i q_i$ always has dimensions of Action ($\\text{J}\\cdot\\text{s}$). If $q_i$ is an angle (dimensionless), $p_i$ has dimensions of angular momentum.' }
    ],
    parameters: [
      { id: 'B', label: 'Magnetic field $B$', type: 'range', min: 0.5, max: 3.0, step: 0.1, value: 1.5, default: 1.5, unit: 'T' },
      { id: 'q', label: 'Charge $q$', type: 'range', min: -2, max: 2, step: 1, value: 1, default: 1 },
      { id: 'gauge', label: 'Gauge choice', type: 'select', value: 'landau', default: 'landau', options: [
        { value: 'landau', label: 'Landau gauge: $\\mathbf{A} = (0, Bx, 0)$' },
        { value: 'symmetric', label: 'Symmetric gauge: $\\mathbf{A} = \\frac{1}{2}B(-y, x, 0)$' }
      ]},
      SPEED_PARAM
    ],
    init(container, state, redraw) {
      state.B = state.B ?? 1.5;
      state.q = state.q ?? 1;
      state.gauge = state.gauge ?? 'landau';
      state.simSpeed = simSpeedOf(state);
      state.x = num(state.x, -0.5);
      state.y = num(state.y, 0);
      state.vx = num(state.vx, 0);
      state.vy = num(state.vy, 2.0);
      state.trail = state.trail || [];
      state.hist = state.hist || [];
      state.tSim = num(state.tSim, 0);

      const controls = [
        { id: 'reset', label: 'Reset Trajectory', type: 'button', text: 'Reset Particle', onClick: () => {
          state.x = -0.5; state.y = 0; state.vx = 0; state.vy = 2.0; state.trail = []; state.hist = []; state.tSim = 0;
        }}
      ];
      U.createControlUI(container, controls, () => {
        redraw();
      });
    },
    onParamChange(id, val, state) {
      if (id === 'B' || id === 'q' || id === 'gauge') {
        state.x = -0.5;
        state.y = 0;
        state.vx = 0;
        state.vy = 2.0;
        state.trail = [];
        state.hist = [];
        state.tSim = 0;
      }
    },
    draw(ctx, width, height, state, dt) {
      fillStage(ctx, width, height);
      state = state || {};

      const mass = 1.0;
      const B = Math.max(0.05, num(state.B, 1.5));
      const q = num(state.q, 1);
      const gauge = state.gauge || 'landau';
      if (!Number.isFinite(state.x)) state.x = -0.5;
      if (!Number.isFinite(state.y)) state.y = 0;
      if (!Number.isFinite(state.vx)) state.vx = 0;
      if (!Number.isFinite(state.vy)) state.vy = 2.0;
      if (!Array.isArray(state.trail)) state.trail = [];
      if (!Array.isArray(state.hist)) state.hist = [];
      if (!Number.isFinite(state.tSim)) state.tSim = 0;

      const dtv = scaledDt(dt, state);
      const omega_c = (q * B) / mass;

      if (dtv > 0) {
        if (Math.abs(omega_c) < 1e-8) {
          state.x += state.vx * dtv;
          state.y += state.vy * dtv;
        } else {
          const Xc = state.x + state.vy / omega_c;
          const Yc = state.y - state.vx / omega_c;
          const c = Math.cos(omega_c * dtv);
          const s = Math.sin(omega_c * dtv);
          const vxNew = state.vx * c + state.vy * s;
          const vyNew = -state.vx * s + state.vy * c;
          state.vx = vxNew;
          state.vy = vyNew;
          state.x = Xc - vyNew / omega_c;
          state.y = Yc + vxNew / omega_c;
        }
        state.tSim += dtv;
        state.trail.push({ x: state.x, y: state.y });
        if (state.trail.length > 220) state.trail.shift();
      }

      let Ax = 0, Ay = 0;
      if (gauge === 'landau') {
        Ax = 0;
        Ay = B * state.x;
      } else {
        Ax = -0.5 * B * state.y;
        Ay = 0.5 * B * state.x;
      }

      const pMechX = mass * state.vx;
      const pMechY = mass * state.vy;
      const pCanonX = pMechX + q * Ax;
      const pCanonY = pMechY + q * Ay;
      const pCanonTheta = state.x * pCanonY - state.y * pCanonX;
      const LzMech = state.x * pMechY - state.y * pMechX;

      if (dtv > 0) {
        state.hist.push({
          t: state.tSim,
          py: pCanonY,
          pth: pCanonTheta,
          pvy: pMechY,
          lz: LzMech
        });
        if (state.hist.length > 180) state.hist.shift();
      }

      const landau = gauge === 'landau';
      const conserved = landau ? pCanonY : pCanonTheta;
      const oscillating = landau ? pMechY : LzMech;

      legend('Canonical momentum', [
        { label: 'gauge', value: landau ? 'Landau  $\\mathbf{A} = (0, Bx, 0)$' : 'symmetric  $\\mathbf{A} = \\frac{1}{2}B(-y, x)$' },
        { label: 'cyclic', value: landau ? '$y \\to P_y$ conserved' : '$\\theta \\to P_{\\theta}$ conserved' },
        { label: landau ? '$P_y = mv_y + qBx$' : '$P_{\\theta} = L_z + \\frac{1}{2} q B r^{2}$', value: fmt(conserved, 3) },
        { label: landau ? '$mv_y$' : '$L_z = x mv_y - y mv_x$', value: fmt(oscillating, 3) },
        { label: '$|p_{\\mathrm{mech}}|$', value: fmt(Math.hypot(pMechX, pMechY), 3) },
        { label: 'arrows', value: 'coral $m\\mathbf{v}$; gold $q\\mathbf{A}$; teal $\\mathbf{P} = m\\mathbf{v} + q\\mathbf{A}$' }
      ]);

      const splitX = Math.floor(width * 0.54);
      divider(ctx, splitX, height);

      const leftW = splitX - 16;
      const cx = 8 + leftW * 0.5;
      const cy = 24 + (height - 24 - 22) / 2;
      const viewR = 2.55;
      const scale = Math.max(12, Math.min(leftW / (2 * viewR), (height - 52) / (2 * viewR)));

      titleBand(ctx, 'Cyclotron orbit', 14, 18);
      haloLabel(ctx, splitX - 16, 18, 'P', TEAL, 'right');
      haloLabel(ctx, splitX - 38, 18, 'qA', GOLD, 'right');
      haloLabel(ctx, splitX - 68, 18, 'mv', CORAL, 'right');

      ctx.save();
      clipRect(ctx, 8, 22, leftW, height - 32);

      ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.22);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - viewR * scale, cy);
      ctx.lineTo(cx + viewR * scale, cy);
      ctx.moveTo(cx, cy - viewR * scale);
      ctx.lineTo(cx, cy + viewR * scale);
      ctx.stroke();

      for (let gx = -2.4; gx <= 2.4; gx += 0.8) {
        for (let gy = -2.0; gy <= 2.0; gy += 0.8) {
          let gax = 0, gay = 0;
          if (landau) {
            gay = B * gx * 0.22;
          } else {
            gax = -0.5 * B * gy * 0.22;
            gay = 0.5 * B * gx * 0.22;
          }
          const sx1 = cx + gx * scale;
          const sy1 = cy - gy * scale;
          arrow(ctx, sx1, sy1, sx1 + gax * 16, sy1 - gay * 16, 'rgba(212, 160, 23, 0.38)', 1);
        }
      }

      if (state.trail.length > 1) {
        const tPts = state.trail.map(pt => ({ x: cx + pt.x * scale, y: cy - pt.y * scale }));
        strokePoly(ctx, tPts, 'rgba(204, 120, 92, 0.55)', 2);
      }

      const px = cx + state.x * scale;
      const py = cy - state.y * scale;
      const vScale = 18;
      const mx2 = px + pMechX * vScale;
      const my2 = py - pMechY * vScale;
      const ax2 = px + q * Ax * vScale;
      const ay2 = py - q * Ay * vScale;
      const Px2 = px + pCanonX * vScale;
      const Py2 = py - pCanonY * vScale;

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
      arrow(ctx, px, py, ax2, ay2, GOLD, 2.2);
      arrow(ctx, px, py, Px2, Py2, TEAL, 2.6);
      if (Math.hypot(mx2 - px, my2 - py) > 14) {
        haloLabel(ctx, mx2, my2 - 10, 'mv', CORAL, 'center');
      }
      if (Math.hypot(ax2 - px, ay2 - py) > 14) {
        haloLabel(ctx, ax2, ay2 - 10, 'qA', GOLD, 'center');
      }
      if (Math.hypot(Px2 - px, Py2 - py) > 14) {
        haloLabel(ctx, Px2, Py2 + 12, 'P', TEAL, 'center');
      }
      drawDot(ctx, px, py, 6, CORAL, INK);
      ctx.restore();

      axisText(ctx, 'x', cx + viewR * scale - 8, cy - 6, 'right');
      axisText(ctx, 'y', cx + 8, cy - viewR * scale + 12, 'left');

      const rPadL = 36;
      const rx0 = splitX + 14;
      const rx = rx0 + rPadL;
      const ry = 28;
      const rw = Math.max(12, width - rx - 14);
      const rh = Math.max(12, height - ry - 26);

      titleBand(ctx, landau ? 'P_y (conserved) vs mv_y' : 'P_θ (conserved) vs L_z', rx0, 18);
      plotBox(ctx, rx, ry, rw, rh);
      innerGrid(ctx, rx, ry, rw, rh, 4, 4);

      const series = state.hist;
      let yMin = Infinity, yMax = -Infinity;
      for (let i = 0; i < series.length; i++) {
        const a = landau ? series[i].py : series[i].pth;
        const b = landau ? series[i].pvy : series[i].lz;
        yMin = Math.min(yMin, a, b);
        yMax = Math.max(yMax, a, b);
      }
      if (!Number.isFinite(yMin)) { yMin = -2; yMax = 2; }
      const yPad = Math.max(0.4, (yMax - yMin) * 0.18);
      yMin -= yPad;
      yMax += yPad;
      if (yMax <= yMin) { yMin -= 1; yMax += 1; }

      const t0 = series.length ? series[0].t : 0;
      const t1 = series.length ? series[series.length - 1].t : 1;
      const tSpan = Math.max(0.2, t1 - t0);
      const toTX = (t) => rx + ((t - t0) / tSpan) * rw;
      const toHY = (v) => ry + rh * (1 - (v - yMin) / (yMax - yMin));

      ctx.save();
      clipRect(ctx, rx, ry, rw, rh);
      if (yMin < 0 && yMax > 0) {
        ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.22);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(rx, toHY(0));
        ctx.lineTo(rx + rw, toHY(0));
        ctx.stroke();
      }
      if (series.length > 1) {
        const consPts = series.map(s => ({ x: toTX(s.t), y: toHY(landau ? s.py : s.pth) }));
        const oscPts = series.map(s => ({ x: toTX(s.t), y: toHY(landau ? s.pvy : s.lz) }));
        strokePoly(ctx, oscPts, CORAL, 2);
        strokePoly(ctx, consPts, GOOD, 2.4);
      }
      ctx.restore();

      axisText(ctx, 't', rx + rw, height - 10, 'right');
      axisText(ctx, landau ? 'P' : 'P_θ', rx0 + 2, ry + 12, 'left');
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
      explanation: "The Lagrangian in Landau gauge is $L = \\frac{1}{2}m(\\dot{x}^{2} + \\dot{y}^{2} + \\dot{z}^{2}) + q B x \\dot{y}$. Since the coordinate $y$ does not appear explicitly in $L$ ($y$ is cyclic), the canonical conjugate momentum $p_y = \\partial L/\\partial \\dot{y} = m v_y + q B x$ is strictly conserved ($\\mathrm{d}p_y/\\mathrm{d}t = 0$). The quantity $p_y/(qB)$ represents the $x$-coordinate of the cyclotron guiding center."
    }
  };


})(typeof window !== 'undefined' ? window : globalThis);
