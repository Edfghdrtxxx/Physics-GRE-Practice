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

  function fillStage(ctx, w, h) {
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
    ctx.strokeStyle = 'rgba(20, 20, 19, 0.12)';
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


  PGRE.visualizers['cpgf-1.28'] = {
    id: 'cpgf-1.28',
    title: 'Lagrangian Definition: L(q, q_dot, t) = T - U',
    formulaLatex: 'L(q, \\dot{q}, t) = T - U',
    physicalStory: `
The Lagrangian $L = T - U$ is the fundamental generating function of classical mechanics. While total mechanical energy $E = T + U$ is conserved along the physical path, it is the difference $L = T - U$ whose time integral—the Action $S = \\int L \\, dt$—is made stationary by nature (Hamilton's Principle of Stationary Action, $\\delta S = 0$).

Kinetic energy $T$ acts as a penalty against excessive velocity and spatial curvature, while potential energy $U$ penalizes spending time in high-potential regions. Hamilton's principle seeks the exact physical trajectory that balances kinetic cost with potential terrain.
    `.trim(),
    derivationSteps: [
      "1. Start from D'Alembert's principle of virtual work: $\\sum_i (m_i \\ddot{\\mathbf{r}}_i - \\mathbf{F}_i) \\cdot \\delta \\mathbf{r}_i = 0$.",
      "2. For monogenic, conservative systems, generalized force is $Q_j = -\\frac{\\partial U}{\\partial q_j}$, assuming $U = U(q)$ is velocity-independent.",
      "3. Transform inertial terms into generalized coordinates: $\\sum_i m_i \\ddot{\\mathbf{r}}_i \\cdot \\frac{\\partial \\mathbf{r}}_i{\\partial q_j} = \\frac{d}{dt}\\left(\\frac{\\partial T}{\\partial \\dot{q}_j}\\right) - \\frac{\\partial T}{\\partial q_j}$.",
      "4. Group kinetic and potential components: $\\frac{d}{dt}\\left(\\frac{\\partial T}{\\partial \\dot{q}_j}\\right) - \\frac{\\partial (T - U)}{\\partial q_j} = 0$.",
      "5. Since $\\frac{\\partial U}{\\partial \\dot{q}_j} = 0$, define $L \\equiv T - U$, which simplifies the equations of motion to $\\frac{d}{dt}\\left(\\frac{\\partial L}{\\partial \\dot{q}_j}\\right) - \\frac{\\partial L}{\\partial q_j} = 0$."
    ],
    limitingCases: [
      { condition: 'Free Particle ($U = 0$)', result: '$L = T = \\frac{1}{2}m\\dot{q}^2$', description: 'Straight-line uniform motion (geodesic in flat space).' },
      { condition: 'Constant Potential ($U = U_0$)', result: '$L = T - U_0$', description: 'Equations of motion are completely unchanged by constant potential shifts.' },
      { condition: 'Static Limit ($\\dot{q} = 0$)', result: '$L = -U(q)$', description: 'Stationary action reduces to minimizing potential energy $\\nabla U = 0$ (static equilibrium).' },
      { condition: 'Relativistic Limit', result: '$L = -mc^2\\sqrt{1 - v^2/c^2} - U$', description: 'Taylor expansion yields $\\frac{1}{2}mv^2 - mc^2 - U$, recovering $T - U$ up to a constant rest mass energy.' }
    ],
    greTraps: [
      { trap: 'Sign of Potential Energy', explanation: 'Never write $L = T + U$. Remember: Lagrangian has Less/Minus ($L = T - U$), Hamiltonian has Heavy/Plus ($H = T + U$).' },
      { trap: 'Gauge Invariance & Total Time Derivatives', explanation: 'Adding a total time derivative $\\frac{d F(q, t)}{dt}$ to $L$ produces identical Euler-Lagrange equations.' },
      { trap: 'Velocity-Dependent Potentials', explanation: 'For a charge $q$ in an electromagnetic field, $L = \\frac{1}{2}mv^2 - q\\phi + q\\mathbf{A}\\cdot\\mathbf{v}$. The potential term is generalized.' }
    ],
    parameters: [
      { id: 'alpha', label: 'Perturbation (α)', type: 'range', min: -2, max: 2, step: 0.05, value: 0.6, default: 0.6, format: v => v.toFixed(2) },
      { id: 'mode', label: 'Harmonic Mode (n)', type: 'range', min: 1, max: 3, step: 1, value: 1, default: 1, format: v => `${v}` },
      { id: 'potential', label: 'Potential U(q)', type: 'select', value: 'gravity', default: 'gravity', options: [
        { value: 'gravity', label: 'Uniform Gravity: U = mg q' },
        { value: 'harmonic', label: 'Harmonic Well: U = ½k q²' },
        { value: 'quartic', label: 'Double Well: U = a(q²-1)²' }
      ]},
      { id: 'animate', label: 'Playback', type: 'toggle', value: true, default: true }
    ],
    init(container, state, redraw) {
      state.alpha = state.alpha ?? 0.6;
      state.mode = state.mode ?? 1;
      state.potential = state.potential ?? 'gravity';
      state.animate = state.animate ?? true;
      state.tAnim = num(state.tAnim, 0);

      const controls = [
        { id: 'alpha', label: 'Perturbation α', type: 'range', min: -2, max: 2, step: 0.05, value: state.alpha, format: v => v.toFixed(2) },
        { id: 'mode', label: 'Mode n', type: 'range', min: 1, max: 3, step: 1, value: state.mode, format: v => `${v}` },
        { id: 'potential', label: 'Potential', type: 'select', value: state.potential, options: [
          { value: 'gravity', label: 'Uniform Gravity: U = mg q' },
          { value: 'harmonic', label: 'Harmonic: U = ½k q²' },
          { value: 'quartic', label: 'Double Well: U = 2(q²-1)²' }
        ]},
        { id: 'resetAlpha', label: 'Extremum (α=0)', type: 'button', text: 'Set True Path (α=0)', onClick: () => { state.alpha = 0; } }
      ];

      U.createControlUI(container, controls, (id, val) => {
        if (id === 'resetAlpha') {
          state.alpha = 0;
          const range = container.querySelector('input[type=range]');
          if (range) range.value = 0;
          const disp = container.querySelectorAll('span')[0];
          if (disp) disp.innerText = '0.00';
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
      const dtv = dtSafe(dt);
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
        const s = t / T_total;
        return q0 + (q1 - q0) * s - 0.45 * Math.sin(Math.PI * s);
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

      legend('Lagrangian L = T − U', [
        { label: 'T', value: fmt(curKin) },
        { label: 'U', value: fmt(curPot) },
        { label: 'L = T − U', value: fmt(curLag) },
        { label: 'S[α]', value: fmt(curAction, 3) },
        { label: 'path', value: atStationary ? 'stationary (α = 0)' : 'varied, α = ' + fmt(alpha) }
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
        ctx.strokeStyle = 'rgba(20, 20, 19, 0.22)';
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
      question: "A particle moves in 1D under a potential U(x) = ½kx². If the Lagrangian is L = ½mẋ² - ½kx², which of the following modified Lagrangians produces the EXACT SAME physical equations of motion?",
      options: [
        "A) L' = ½mẋ² + ½kx²",
        "B) L' = ½mẋ² - ½kx² + d/dt(c · x² · t)",
        "C) L' = mẋ² - kx² + c x",
        "D) L' = ½mẋ² - ½kx² + d/dt(m x ẋ)",
        "E) L' = (½mẋ² - ½kx²)²"
      ],
      correct: 1,
      explanation: "According to gauge invariance in Lagrangian mechanics, adding the total time derivative of any function of coordinates and time, dF(q, t)/dt, leaves the Euler-Lagrange equations unchanged because its variation δ∫(dF/dt)dt = δ[F(t2)-F(t1)] = 0 vanishes at fixed endpoints. Option B adds dF/dt with F(x,t) = c x² t. Option D adds a term with explicit velocity dependence in F, which is not a valid coordinate gauge function."
    }
  };

  PGRE.visualizers['cpgf-1.29'] = {
    id: 'cpgf-1.29',
    title: 'Euler-Lagrange Equations: d/dt(∂L/∂q̇) = ∂L/∂q',
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
      { condition: 'Cartesian Coordinate ($q = x$)', result: '$m\\ddot{x} = -\\frac{\\partial U}{\\partial x} = F_x$', description: 'Recovers standard Newtonian 2nd Law for a particle.' },
      { condition: 'Polar Coordinates ($q = \\theta$)', result: '$\\frac{d}{dt}(mr^2\\dot{\\theta}) = -\\frac{\\partial U}{\\partial \\theta} = \\tau_z$', description: 'Recovers rotational form of Newton 2nd Law (Torque = rate of change of angular momentum).' },
      { condition: 'Cyclic / Ignorable Coordinate ($\\partial L / \\partial q_k = 0$)', result: '$p_k = \\frac{\\partial L}{\\partial \\dot{q}_k} = \\text{const}$', description: 'Conservation of canonical momentum (Noether\'s Theorem).' }
    ],
    greTraps: [
      { trap: 'Total vs Partial Time Derivative', explanation: '$\\frac{d}{dt}\\left(\\frac{\\partial L}{\\partial \\dot{q}}\\right)$ is a TOTAL derivative. You must apply the chain rule: $\\frac{d}{dt} = \\dot{q}\\frac{\\partial}{\\partial q} + \\ddot{q}\\frac{\\partial}{\\partial \\dot{q}} + \\frac{\\partial}{\\partial t}$.' },
      { trap: 'Implicit Coordinate Dependencies', explanation: 'In polar coordinates $T = \\frac{1}{2}m(\\dot{r}^2 + r^2\\dot{\\theta}^2)$, $\\frac{\\partial L}{\\partial r} = mr\\dot{\\theta}^2$ represents the fictitious centrifugal force term. Do not forget it!' }
    ],
    parameters: [
      { id: 'omega', label: 'Hoop spin ω', type: 'range', min: 0, max: 6, step: 0.1, value: 3.5, default: 3.5, unit: 'rad/s' },
      { id: 'g', label: 'Gravity g', type: 'range', min: 1, max: 20, step: 0.5, value: 9.8, default: 9.8, unit: 'm/s²' },
      { id: 'theta0', label: 'Initial angle θ₀', type: 'range', min: -3.14, max: 3.14, step: 0.05, value: 0.8, default: 0.8 }
    ],
    init(container, state, redraw) {
      state.omega = state.omega ?? 3.5;
      state.g = state.g ?? 9.8;
      state.R = 1.0;
      state.theta = num(state.theta, num(state.theta0, 0.8));
      state.thetaDot = num(state.thetaDot, 0);
      state.phi = num(state.phi, 0);

      const controls = [
        { id: 'omega', label: 'Hoop Spin ω', type: 'range', min: 0, max: 6, step: 0.1, value: state.omega, format: v => `${v.toFixed(1)} rad/s` },
        { id: 'g', label: 'Gravity g', type: 'range', min: 1, max: 20, step: 0.5, value: state.g, format: v => `${v.toFixed(1)} m/s²` },
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

      const dtv = dtSafe(dt);
      const gamma = 0.25;
      const subSteps = 8;
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
        { label: 'ω', value: fmt(omega, 1) + ' rad/s' },
        { label: 'ω_c = √(g/R)', value: fmt(omega_c, 2) + ' rad/s' },
        { label: 'regime', value: isSupercritical ? 'supercritical (θ = 0 unstable)' : 'subcritical (θ = 0 stable)' },
        { label: 'θ', value: fmt(state.theta * 180 / Math.PI, 0) + '°' },
        { label: 'θ_eq', value: isSupercritical ? '±' + fmt(theta_eq * 180 / Math.PI, 0) + '°' : '0°' }
      ]);

      const splitX = Math.floor(width * 0.52);
      divider(ctx, splitX, height);

      const cx = splitX * 0.5;
      const cy = 22 + (height - 22 - 22) / 2;
      const rPixels = Math.max(24, Math.min(cx - 36, cy - 34, height - cy - 28));

      titleBand(ctx, 'Bead on a rotating hoop', 14, 18);

      ctx.save();
      clipRect(ctx, 8, 22, splitX - 16, height - 30);

      ctx.strokeStyle = 'rgba(20, 20, 19, 0.28)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cx, cy - rPixels - 18);
      ctx.lineTo(cx, cy + rPixels + 10);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = 'rgba(20, 20, 19, 0.14)';
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
      arrow(ctx, bx, by, bx, by + fgLen, ROSE, 2);
      arrow(ctx, bx, by, bx + cfSign * fcfLen * Math.cos(state.phi), by, GOLD, 2);

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

      ctx.strokeStyle = 'rgba(20, 20, 19, 0.22)';
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
      question: "A bead of mass m slides without friction on a circular hoop of radius R rotating at constant angular speed ω about its vertical diameter. What is the critical angular frequency ω_c above which a stable non-zero equilibrium angle θ ≠ 0 exists?",
      options: [
        "A) ω_c = √(g / R)",
        "B) ω_c = √(2g / R)",
        "C) ω_c = g / R",
        "D) ω_c = √(g / 2R)",
        "E) Stable equilibria at θ ≠ 0 never occur for any rotation speed."
      ],
      correct: 0,
      explanation: "From the Euler-Lagrange equation, the equilibrium condition dU_eff/dθ = 0 gives (ω² cosθ - g/R) sinθ = 0. Non-zero equilibrium angles require cosθ = g / (R ω²). Since |cosθ| ≤ 1, a real solution for θ ≠ 0 exists if and only if g / (R ω²) < 1, which means ω > ω_c = √(g / R). For ω > ω_c, the bottom position θ = 0 becomes an unstable local maximum, and two symmetric stable minima emerge at cosθ_0 = g/(R ω²)."
    }
  };

  PGRE.visualizers['cpgf-1.30'] = {
    id: 'cpgf-1.30',
    title: 'Canonical Momentum & Cyclic Coordinates: p_i = ∂L/∂q̇_i',
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
      { condition: 'Standard Cartesian ($U$ velocity-independent)', result: '$p_x = m\\dot{x}$', description: 'Canonical momentum equals standard Newtonian linear momentum.' },
      { condition: 'Polar Coordinates ($q = \\theta$, central force)', result: '$p_\\theta = mr^2\\dot{\\theta} = L_z$', description: 'Canonical momentum is orbital angular momentum.' },
      { condition: 'Landau Gauge $\\mathbf{A} = (0, Bx, 0)$', result: '$p_y = mv_y + qBx = \\text{const}$', description: 'Guiding center $X_0 = x + \\frac{v_y}{\\omega_c} = \\frac{p_y}{qB}$ is conserved.' }
    ],
    greTraps: [
      { trap: 'Canonical vs Mechanical Momentum in Magnetic Fields', explanation: 'Mechanical momentum $m\\mathbf{v} = \\mathbf{p} - q\\mathbf{A}$ changes direction during cyclotron orbits, but the canonical momentum $p_y$ in Landau gauge remains strictly invariant!' },
      { trap: 'Dimensions of Canonical Momentum', explanation: 'The product $p_i q_i$ always has dimensions of Action ($\\text{J}\\cdot\\text{s}$). If $q_i$ is an angle (dimensionless), $p_i$ has dimensions of angular momentum.' }
    ],
    parameters: [
      { id: 'B', label: 'Magnetic field B', type: 'range', min: 0.5, max: 3.0, step: 0.1, value: 1.5, default: 1.5, unit: 'T' },
      { id: 'q', label: 'Charge q', type: 'range', min: -2, max: 2, step: 1, value: 1, default: 1 },
      { id: 'gauge', label: 'Gauge choice', type: 'select', value: 'landau', default: 'landau', options: [
        { value: 'landau', label: 'Landau Gauge: A = (0, Bx, 0)' },
        { value: 'symmetric', label: 'Symmetric Gauge: A = ½B(-y, x, 0)' }
      ]}
    ],
    init(container, state, redraw) {
      state.B = state.B ?? 1.5;
      state.q = state.q ?? 1;
      state.gauge = state.gauge ?? 'landau';
      state.x = num(state.x, -0.5);
      state.y = num(state.y, 0);
      state.vx = num(state.vx, 0);
      state.vy = num(state.vy, 2.0);
      state.trail = state.trail || [];
      state.hist = state.hist || [];
      state.tSim = num(state.tSim, 0);

      const controls = [
        { id: 'B', label: 'B Field', type: 'range', min: 0.5, max: 3.0, step: 0.1, value: state.B, format: v => `${v.toFixed(1)} T` },
        { id: 'gauge', label: 'Gauge', type: 'select', value: state.gauge, options: [
          { value: 'landau', label: 'Landau: A = (0, Bx, 0)' },
          { value: 'symmetric', label: 'Symmetric: A = ½B(-y, x)' }
        ]},
        { id: 'reset', label: 'Reset Trajectory', type: 'button', text: 'Reset Particle', onClick: () => {
          state.x = -0.5; state.y = 0; state.vx = 0; state.vy = 2.0; state.trail = []; state.hist = []; state.tSim = 0;
        }}
      ];

      U.createControlUI(container, controls, (id, val) => {
        state[id] = val;
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

      const dtv = dtSafe(dt);
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

      legend('Canonical momentum  p = ∂L/∂q̇', [
        { label: 'gauge', value: landau ? 'Landau  A = (0, Bx, 0)' : 'symmetric  A = ½B(−y, x)' },
        { label: 'cyclic', value: landau ? 'y  →  P_y conserved' : 'θ  →  P_θ conserved' },
        { label: landau ? 'P_y = mv_y + qBx' : 'P_θ = L_z + ½ q B r²', value: fmt(conserved, 3) },
        { label: landau ? 'mv_y' : 'L_z = x mv_y − y mv_x', value: fmt(oscillating, 3) },
        { label: '|p_mech|', value: fmt(Math.hypot(pMechX, pMechY), 3) }
      ]);

      const splitX = Math.floor(width * 0.54);
      divider(ctx, splitX, height);

      const leftW = splitX - 16;
      const cx = 8 + leftW * 0.5;
      const cy = 24 + (height - 24 - 22) / 2;
      const viewR = 2.55;
      const scale = Math.max(12, Math.min(leftW / (2 * viewR), (height - 52) / (2 * viewR)));

      titleBand(ctx, 'Cyclotron orbit  (P = mv + qA)', 14, 18);

      ctx.save();
      clipRect(ctx, 8, 22, leftW, height - 32);

      ctx.strokeStyle = 'rgba(20, 20, 19, 0.22)';
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

      ctx.strokeStyle = 'rgba(20, 20, 19, 0.18)';
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
        ctx.strokeStyle = 'rgba(20, 20, 19, 0.22)';
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
      question: "A particle of mass m and charge q moves in a uniform magnetic field B = B ẑ using the Landau gauge A = (0, Bx, 0). Which quantity is an exact constant of motion?",
      options: [
        "A) m v_y",
        "B) m v_y + q B x",
        "C) m v_x + q B y",
        "D) m (v_x² + v_y²) + q B x",
        "E) m (v_x + v_y)"
      ],
      correct: 1,
      explanation: "The Lagrangian in Landau gauge is L = ½m(ẋ² + ẏ² + ż²) + q B x ẏ. Since the coordinate y does not appear explicitly in L (y is cyclic), the canonical conjugate momentum p_y = ∂L/∂ẏ = m v_y + q B x is strictly conserved (dp_y/dt = 0). The quantity p_y/(qB) represents the x-coordinate of the cyclotron guiding center."
    }
  };


})(typeof window !== 'undefined' ? window : globalThis);
