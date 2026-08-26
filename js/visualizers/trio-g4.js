/* Formula visualizers — G4 pendulum / continuous I / parallel-axis */
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

  var INK = '#141413';
  var MUTED = '#6c6a64';
  var CORAL = '#cc785c';
  var GOLD = '#d4a017';
  var TEAL = '#5db8a6';
  var CREAM = '#faf9f5';
  var PANEL = '#f5f0e8';
  var LINE = '#e6dfd8';
  var ROSE = '#e05666';
  var GOOD = '#4e9b6f';

  function creamFill(ctx, w, h) {
    ctx.fillStyle = (CV && CV.colors && CV.colors.bg) ? CV.colors.bg : CREAM;
    ctx.fillRect(0, 0, w, h);
  }

  function vizLegend(title, rows) {
    if (PGRE.appendVizLegend) PGRE.appendVizLegend(title, rows);
  }

  function pill(ctx, text, x, y, color, align) {
    if (!text) return;
    align = align || 'left';
    ctx.save();
    ctx.font = '600 11px Inter, -apple-system, sans-serif';
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    var tw = ctx.measureText(text).width;
    var left = align === 'right' ? x - tw : (align === 'center' ? x - tw / 2 : x);
    ctx.fillStyle = 'rgba(250, 249, 245, 0.94)';
    ctx.strokeStyle = 'rgba(20, 20, 19, 0.10)';
    ctx.lineWidth = 1;
    ctx.fillRect(left - 4, y - 8, tw + 8, 16);
    ctx.strokeRect(left - 4, y - 8, tw + 8, 16);
    ctx.fillStyle = color || INK;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function panelRect(ctx, x, y, w, h) {
    ctx.save();
    ctx.fillStyle = PANEL;
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }

  function findVizCanvas(container) {
    var canvas = null;
    if (container && container.tagName === 'CANVAS') canvas = container;
    else if (container && typeof container.querySelector === 'function') {
      canvas = container.querySelector('canvas');
    }
    if (!canvas && typeof document !== 'undefined') {
      canvas = document.getElementById('viz-canvas') || document.getElementById('viz-inline-canvas');
    }
    return canvas;
  }


  PGRE.visualizers['cpgf-1.47'] = {
    id: 'cpgf-1.47',
    title: 'Simple & Physical Pendulum Dynamics & Large-Angle Anharmonicity',
    formulaLatex:
      '$$\\ddot{\\theta} + \\frac{g}{L}\\sin\\theta = 0 \\xrightarrow{\\theta \\ll 1} \\omega_0 = \\sqrt{\\frac{g}{L}},\\quad T(\\theta_0) \\approx 2\\pi\\sqrt{\\frac{L}{g}}\\left(1 + \\frac{1}{16}\\theta_0^2 + \\frac{11}{3072}\\theta_0^4\\right)$$',
    physicalStory:
      'A simple pendulum consists of a point mass m suspended by a massless rigid rod of length L. The restoring torque is provided by the tangential component of gravity τ = -mgL sin θ. For small angles (sin θ ≈ θ), the equation linearizes to a simple harmonic oscillator with frequency ω = √(g/L), which is strictly independent of the mass m (Galilean equivalence principle). At large release angles, the softening of sin θ < θ prolongs the oscillation period (anharmonicity), diverging logarithmically to infinity at θ0 = π (separatrix).',
    derivationSteps: [
      {
        step: 1,
        title: 'Rotational Form of Newton\'s 2nd Law',
        formula: '\\tau = I\\ddot{\\theta} = -mg(L\\sin\\theta),\\quad I = mL^2',
        text: 'The gravitational torque about the suspension pivot opposes angular displacement, with moment of inertia I = mL² for a point bob.'
      },
      {
        step: 2,
        title: 'Non-Linear Exact Equation of Motion',
        formula: 'mL^2\\ddot{\\theta} + mgL\\sin\\theta = 0 \\implies \\ddot{\\theta} + \\left(\\frac{g}{L}\\right)\\sin\\theta = 0',
        text: 'Dividing out the mass m proves that the pendulum dynamics are fundamentally independent of bob mass.'
      },
      {
        step: 3,
        title: 'Small-Angle Linearization & Natural Frequency',
        formula: '\\sin\\theta = \\theta - \\frac{\\theta^3}{6} + \\dots \\xrightarrow{\\theta \\ll 1} \\ddot{\\theta} + \\left(\\frac{g}{L}\\right)\\theta = 0 \\implies \\omega_0 = \\sqrt{\\frac{g}{L}}',
        text: 'To first order in Taylor expansion, the motion reduces to simple harmonic motion with period T0 = 2π√(L/g).'
      },
      {
        step: 4,
        title: 'Physical Pendulum Generalization',
        formula: '\\omega = \\sqrt{\\frac{mg d}{I_{\\text{pivot}}}} = \\sqrt{\\frac{g}{L_{\\text{eff}}}},\\quad L_{\\text{eff}} = \\frac{I_{\\text{pivot}}}{md} = d + \\frac{I_{\\text{cm}}}{md}',
        text: 'For a uniform rod of length L pivoted at one end (I = (1/3)mL², d = L/2), effective length is L_eff = (2/3)L, increasing frequency to √(1.5 g/L).'
      }
    ],
    limitingCases: [
      {
        name: 'Small-Angle Harmonic Limit',
        condition: '\\theta_0 \\to 0',
        result: 'T \\to T_0 = 2\\pi\\sqrt{\\frac{L}{g}}',
        explanation: 'Sinusoidal small oscillations where period is completely amplitude-independent (isochronism).'
      },
      {
        name: 'Separatrix Inverted Equilibrium',
        condition: '\\theta_0 \\to \\pi \\; (180^\\circ)',
        result: 'T(\\theta_0) \\to \\infty',
        explanation: 'The bob takes infinite time to reach the unstable top apex where net restoring torque vanishes.'
      },
      {
        name: 'Accelerating Elevator Reference Frame',
        condition: '\\vec{a} = a\\hat{z} \\; (\\text{upward})',
        result: 'g_{\\text{eff}} = g + a \\implies \\omega = \\sqrt{\\frac{g + a}{L}}',
        explanation: 'In a rising elevator accelerating upward at a, effective gravity increases, speeding up the pendulum oscillation.'
      },
      {
        name: 'Uniform Rod Physical Pendulum',
        condition: 'I = \\frac{1}{3}ML^2,\\; d = \\frac{L}{2}',
        result: '\\omega = \\sqrt{\\frac{Mg(L/2)}{\\frac{1}{3}ML^2}} = \\sqrt{\\frac{3g}{2L}}',
        explanation: 'A uniform rod oscillates faster than a simple pendulum of the same length because its mass center is closer to the pivot.'
      }
    ],
    greTraps: [
      {
        trap: 'Mass Independence of Simple Pendulum',
        warning: 'Believing that doubling the bob mass doubles or halves the period.',
        strategy: 'T = 2π√(L/g) contains NO mass term! A 1 kg bob and a 100 kg bob have identical small-angle periods.'
      },
      {
        trap: 'Simple Pendulum vs Uniform Rod',
        warning: 'Treating a swinging rod as a simple pendulum of length L.',
        strategy: 'Always use physical pendulum formula: L_eff = I/(m d) = ((1/3)mL²)/(m L/2) = (2/3)L. The rod period is T = 2π√(2L / 3g).'
      },
      {
        trap: 'Large Angle Anharmonic Period Increase',
        warning: 'Assuming T is strictly constant for large release angles like 60°.',
        strategy: 'Large angle period expands as T ≈ T0(1 + (1/16)θ0²). At 60° (π/3 rad ≈ 1.05 rad), period is ~7% longer than T0!'
      }
    ],
    parameters: [
      { id: 'L', label: 'Length (L)', min: 0.2, max: 2.5, step: 0.05, default: 1.0, unit: 'm' },
      { id: 'g', label: 'Gravity (g)', min: 1.0, max: 25.0, step: 0.5, default: 9.8, unit: 'm/s²' },
      { id: 'theta0_deg', label: 'Initial Angle (θ0)', min: 5, max: 170, step: 5, default: 45, unit: 'deg' },
      { id: 'isRod', label: 'Pendulum Type (0=Simple, 1=Rod)', min: 0, max: 1, step: 1, default: 0, unit: '' },
      { id: 'damping', label: 'Damping (γ)', min: 0.0, max: 0.2, step: 0.01, default: 0.0, unit: 's⁻¹' }
    ],
    challenge: {
      question:
        'A uniform thin rod of mass M and length L is pivoted smoothly at one end to oscillate in a vertical plane as a physical pendulum. What is the length L_simple of a simple pendulum that has the exact same period of small oscillations?',
      options: [
        'A) L_simple = (1/2) L',
        'B) L_simple = (2/3) L',
        'C) L_simple = (3/4) L',
        'D) L_simple = L',
        'E) L_simple = (4/3) L'
      ],
      correct: 1,
      explanation:
        'For a physical pendulum, the angular frequency is ω = √(Mg d / I). For a uniform rod pivoted at one end, the moment of inertia is I = (1/3)ML² and the center of mass is at d = L/2. Substituting these gives ω = √(Mg(L/2) / ((1/3)ML²)) = √(3g / 2L). Comparing this to a simple pendulum ω = √(g / L_simple), we set g / L_simple = 3g / 2L, which yields L_simple = (2/3)L. Option B is correct.'
    },

    init(container, state, redraw) {
      state.L = state.L !== undefined ? state.L : 1.0;
      state.g = state.g !== undefined ? state.g : 9.8;
      state.theta0_deg = state.theta0_deg !== undefined ? state.theta0_deg : 45;
      state.isRod = state.isRod !== undefined ? state.isRod : 0;
      state.damping = state.damping !== undefined ? state.damping : 0.0;

      const initRad = (state.theta0_deg * Math.PI) / 180;
      state.sim = {
        theta: initRad,
        omega: 0.0,
        theta_lin: initRad,
        omega_lin: 0.0,
        t: 0.0,
        isDragging: false,
        phaseHistory: [],
        maxHistoryLen: 240
      };

      var canvas = findVizCanvas(container);
      if (canvas && !canvas._cpgf147_bound) {
        canvas._cpgf147_bound = true;

        var getPos = function (e) {
          var rect = canvas.getBoundingClientRect();
          var t = (e.touches && e.touches.length > 0) ? e.touches[0] :
                    ((e.changedTouches && e.changedTouches.length > 0) ? e.changedTouches[0] : null);
          var clientX = t ? t.clientX : e.clientX;
          var clientY = t ? t.clientY : e.clientY;
          var cssW = rect.width || 1;
          var cssH = rect.height || 1;
          return {
            x: (clientX - rect.left) * (cssW / cssW),
            y: (clientY - rect.top) * (cssH / cssH)
          };
        };

        var onDown = function (e) {
          var pos = getPos(e);
          var bob = state.sim.bobScreenPos;
          if (bob && Math.hypot(pos.x - bob.x, pos.y - bob.y) < bob.radius * 1.8) {
            state.sim.isDragging = true;
            state.sim.omega = 0;
            state.sim.omega_lin = 0;
            if (e.cancelable) e.preventDefault();
          }
        };

        var onMove = function (e) {
          if (state.sim.isDragging && state.sim.pivotPos) {
            var pos = getPos(e);
            var piv = state.sim.pivotPos;
            var angle = Math.atan2(pos.x - piv.x, pos.y - piv.y);
            state.sim.theta = Math.max(-Math.PI * 0.98, Math.min(Math.PI * 0.98, angle));
            state.sim.theta_lin = state.sim.theta;
            state.sim.omega = 0;
            state.sim.omega_lin = 0;
            state.sim.amp = Math.abs(state.sim.theta);
            if (e.cancelable) e.preventDefault();
          }
        };

        var onUp = function () {
          if (state.sim.isDragging) {
            state.sim.amp = Math.abs(state.sim.theta);
          }
          state.sim.isDragging = false;
        };

        canvas.addEventListener('mousedown', onDown);
        canvas.addEventListener('touchstart', onDown, { passive: false });

        if (typeof window !== 'undefined') {
          if (window._cpgf147_move) {
            window.removeEventListener('mousemove', window._cpgf147_move);
            window.removeEventListener('mouseup', window._cpgf147_up);
            window.removeEventListener('touchmove', window._cpgf147_move);
            window.removeEventListener('touchend', window._cpgf147_up);
          }
          window._cpgf147_move = onMove;
          window._cpgf147_up = onUp;
          window.addEventListener('mousemove', onMove);
          window.addEventListener('mouseup', onUp);
          window.addEventListener('touchmove', onMove, { passive: false });
          window.addEventListener('touchend', onUp);
        }
      }
    },

    draw(ctx, width, height, state, dt) {
      if (!state.sim) this.init(null, state);
      const sim = state.sim;

      if (sim.lastTheta0 !== undefined && (sim.lastTheta0 !== state.theta0_deg || sim.lastIsRod !== state.isRod) && !sim.isDragging) {
        const initRad = (Number(state.theta0_deg) * Math.PI) / 180;
        sim.theta = initRad;
        sim.theta_lin = initRad;
        sim.omega = 0.0;
        sim.omega_lin = 0.0;
        sim.t = 0.0;
        sim.amp = Math.abs(initRad);
        sim.phaseHistory = [];
      }
      sim.lastTheta0 = state.theta0_deg;
      sim.lastIsRod = state.isRod;
      if (sim.amp === undefined) sim.amp = Math.abs(sim.theta);

      const L = Math.max(0.2, Number(state.L) || 1.0);
      const g = Math.max(0.5, Number(state.g) || 9.8);
      const isRod = Number(state.isRod) === 1;
      const damping = Math.max(0.0, Number(state.damping) || 0.0);

      const Leff = isRod ? (2 / 3) * L : L;
      const omega0 = Math.sqrt(g / Leff);
      const T0 = (2 * Math.PI) / omega0;

      const thetaAmp = Math.max(sim.amp || 0, Math.abs(sim.theta));
      const T_exact_approx = T0 * (1 + (1 / 16) * thetaAmp * thetaAmp + (11 / 3072) * Math.pow(thetaAmp, 4));

      const subSteps = 12;
      const stepDt = Math.min(dt || 0.016, 0.05) / subSteps;

      if (!sim.isDragging) {
        for (let s = 0; s < subSteps; s++) {
          const f_nonlin = (th, om) => -(g / Leff) * Math.sin(th) - damping * om;
          const k1_th = sim.omega;
          const k1_om = f_nonlin(sim.theta, sim.omega);

          const k2_th = sim.omega + 0.5 * stepDt * k1_om;
          const k2_om = f_nonlin(sim.theta + 0.5 * stepDt * k1_th, sim.omega + 0.5 * stepDt * k1_om);

          const k3_th = sim.omega + 0.5 * stepDt * k2_om;
          const k3_om = f_nonlin(sim.theta + 0.5 * stepDt * k2_th, sim.omega + 0.5 * stepDt * k2_om);

          const k4_th = sim.omega + stepDt * k3_om;
          const k4_om = f_nonlin(sim.theta + stepDt * k3_th, sim.omega + stepDt * k3_om);

          sim.theta += (stepDt / 6) * (k1_th + 2 * k2_th + 2 * k3_th + k4_th);
          sim.omega += (stepDt / 6) * (k1_om + 2 * k2_om + 2 * k3_om + k4_om);

          const a_lin = -(g / Leff) * sim.theta_lin - damping * sim.omega_lin;
          sim.omega_lin += a_lin * stepDt;
          sim.theta_lin += sim.omega_lin * stepDt;

          sim.t += stepDt;
        }
      }

      sim.phaseHistory.push({ theta: sim.theta, omega: sim.omega });
      if (sim.phaseHistory.length > sim.maxHistoryLen) {
        sim.phaseHistory.shift();
      }

      creamFill(ctx, width, height);

      const splitX = Math.round(width * 0.58);
      const leftW = splitX;
      const bobRadius = isRod ? 8 : 15;
      const pad = 18;
      const pivotX = leftW * 0.5;
      const pivotY = height * 0.5;
      const maxArm = Math.min(
        pivotX - pad - bobRadius,
        leftW - pivotX - pad - bobRadius,
        pivotY - pad - bobRadius,
        height - pivotY - pad - bobRadius
      );
      const armLengthPx = Math.max(48, Math.min(maxArm, 170));

      sim.pivotPos = { x: pivotX, y: pivotY };

      ctx.save();
      ctx.strokeStyle = 'rgba(20, 20, 19, 0.10)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.arc(pivotX, pivotY, armLengthPx, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(pivotX, pivotY + armLengthPx + 6);
      ctx.stroke();
      ctx.restore();

      const ghostBobX = pivotX + armLengthPx * Math.sin(sim.theta_lin);
      const ghostBobY = pivotY + armLengthPx * Math.cos(sim.theta_lin);

      ctx.save();
      ctx.strokeStyle = TEAL;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1.6;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(ghostBobX, ghostBobY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = TEAL;
      ctx.beginPath();
      ctx.arc(ghostBobX, ghostBobY, isRod ? 6 : 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const bobX = pivotX + armLengthPx * Math.sin(sim.theta);
      const bobY = pivotY + armLengthPx * Math.cos(sim.theta);
      sim.bobScreenPos = { x: bobX, y: bobY, radius: bobRadius };

      ctx.save();
      ctx.strokeStyle = isRod ? CORAL : INK;
      ctx.globalAlpha = isRod ? 1 : 0.55;
      ctx.lineWidth = isRod ? 7 : 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(bobX, bobY);
      ctx.stroke();
      ctx.restore();

      if (!isRod) {
        ctx.save();
        ctx.fillStyle = CORAL;
        ctx.strokeStyle = '#964b32';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(bobX, bobY, bobRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.save();
        ctx.fillStyle = CORAL;
        ctx.beginPath();
        ctx.arc(bobX, bobY, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.save();
      ctx.fillStyle = INK;
      ctx.strokeStyle = CREAM;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pivotX, pivotY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      const arcRadius = Math.min(36, armLengthPx * 0.28);
      if (Math.abs(sim.theta) > 0.04) {
        ctx.save();
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (sim.theta >= 0) {
          ctx.arc(pivotX, pivotY, arcRadius, Math.PI / 2, Math.PI / 2 + sim.theta, false);
        } else {
          ctx.arc(pivotX, pivotY, arcRadius, Math.PI / 2 + sim.theta, Math.PI / 2, false);
        }
        ctx.stroke();
        ctx.restore();
        const mid = sim.theta / 2;
        const lx = pivotX + (arcRadius + 14) * Math.sin(mid);
        const ly = pivotY + (arcRadius + 14) * Math.cos(mid);
        pill(ctx, 'θ', lx, ly, GOLD, 'center');
      }

      pill(ctx, 'pivot', pivotX + 12, pivotY - 14, MUTED, 'left');

      const cardX = splitX + 10;
      const cardY = 12;
      const cardW = width - cardX - 12;
      const cardH = height - 24;
      panelRect(ctx, cardX, cardY, cardW, cardH);

      ctx.save();
      ctx.fillStyle = MUTED;
      ctx.font = '600 11px Inter, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('Phase portrait  (θ,  θ̇)', cardX + 12, cardY + 10);
      ctx.restore();

      const phaseCx = cardX + cardW * 0.5;
      const phaseCy = cardY + cardH * 0.54;
      const phaseW = Math.min(cardW * 0.38, cardH * 0.32, 110);
      const maxOmegaSep = Math.max(2 * omega0, 0.4);
      const thetaScale = phaseW / Math.PI;
      const omegaScale = (phaseW * 0.85) / maxOmegaSep;

      ctx.save();
      ctx.beginPath();
      ctx.rect(cardX + 8, cardY + 28, cardW - 16, cardH - 36);
      ctx.clip();

      ctx.strokeStyle = 'rgba(20, 20, 19, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(phaseCx - phaseW - 8, phaseCy);
      ctx.lineTo(phaseCx + phaseW + 8, phaseCy);
      ctx.moveTo(phaseCx, phaseCy - phaseW - 8);
      ctx.lineTo(phaseCx, phaseCy + phaseW + 8);
      ctx.stroke();
      pill(ctx, 'θ', phaseCx + phaseW + 4, phaseCy - 12, MUTED, 'left');
      pill(ctx, 'θ̇', phaseCx + 10, phaseCy - phaseW - 4, MUTED, 'left');

      ctx.save();
      ctx.strokeStyle = 'rgba(224, 86, 102, 0.40)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      let firstSep = true;
      for (let th = -Math.PI + 0.05; th <= Math.PI - 0.05; th += 0.08) {
        const omSep = 2 * omega0 * Math.cos(th / 2);
        const px = phaseCx + th * thetaScale;
        const py = phaseCy - omSep * omegaScale;
        if (firstSep) { ctx.moveTo(px, py); firstSep = false; }
        else ctx.lineTo(px, py);
      }
      for (let th = Math.PI - 0.05; th >= -Math.PI + 0.05; th -= 0.08) {
        const omSep = -2 * omega0 * Math.cos(th / 2);
        const px = phaseCx + th * thetaScale;
        const py = phaseCy - omSep * omegaScale;
        ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

      if (sim.phaseHistory.length > 1) {
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        for (let i = 1; i < sim.phaseHistory.length; i++) {
          const pt0 = sim.phaseHistory[i - 1];
          const pt1 = sim.phaseHistory[i];
          const alpha = (i / sim.phaseHistory.length) * 0.9;
          ctx.strokeStyle = 'rgba(204, 120, 92, ' + alpha + ')';
          ctx.beginPath();
          ctx.moveTo(phaseCx + pt0.theta * thetaScale, phaseCy - pt0.omega * omegaScale);
          ctx.lineTo(phaseCx + pt1.theta * thetaScale, phaseCy - pt1.omega * omegaScale);
          ctx.stroke();
        }
      }

      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(phaseCx + sim.theta * thetaScale, phaseCy - sim.omega * omegaScale, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const pctShift = Math.max(0, ((T_exact_approx - T0) / T0) * 100);
      vizLegend('Pendulum', [
        { label: 'Type', value: isRod ? 'Uniform rod,  Leff = 2L/3' : 'Simple pendulum,  Leff = L' },
        { label: 'ω0 = √(g/Leff)', value: omega0.toFixed(2) + ' rad/s' },
        { label: 'T0 = 2π/ω0', value: T0.toFixed(3) + ' s' },
        { label: 'T(θ0) anharmonic', value: T_exact_approx.toFixed(3) + ' s  (+' + pctShift.toFixed(1) + '%)' },
        { label: 'θ(t)', value: ((sim.theta * 180) / Math.PI).toFixed(1) + ' deg' },
        { label: 'Traces', value: 'coral = exact sin θ;  teal dashed = linear θ' },
        { label: 'Drag', value: sim.isDragging ? 'setting release angle' : 'drag the bob to set θ' }
      ]);
    }
  };

  PGRE.visualizers['cpgf-1.24'] = {
    id: 'cpgf-1.24',
    title: 'Continuous Moment of Inertia & Mass Distribution',
    formulaLatex: 'I = \\int r^2 dm',
    physicalStory: `
      Moment of inertia ($I$) is the rotational analogue of inertial mass. It quantifies a body's resistance to angular acceleration. Unlike scalar translational mass ($M = \\int dm$), the moment of inertia depends quadratically on the perpendicular distance ($r_\\perp$) of each infinitesimal mass element ($dm$) from the chosen axis of rotation.

      Because of the $r^2$ weighting, mass distributed further from the rotation axis contributes vastly more rotational inertia than mass packed near the center. This governs why a hollow cylindrical hoop ($I = MR^2$) rolls significantly slower down an incline than a solid cylinder ($I = \\frac{1}{2}MR^2$) or a solid sphere ($I = \\frac{2}{5}MR^2$).
    `,
    derivationSteps: [
      {
        step: 1,
        latex: 'K_{\\text{rot}} = \\int \\frac{1}{2} v^2 dm = \\int \\frac{1}{2} (\\omega r_\\perp)^2 dm',
        explanation: 'Express the total kinetic energy of a rigid body rotating at angular velocity \\omega about a fixed axis.'
      },
      {
        step: 2,
        latex: 'K_{\\text{rot}} = \\frac{1}{2} \\omega^2 \\int r_\\perp^2 dm \\equiv \\frac{1}{2} I \\omega^2',
        explanation: 'Factor out the constant angular velocity \\omega to identify the moment of inertia integral I.'
      },
      {
        step: 3,
        latex: 'dm = \\rho dV \\quad (\\text{3D}), \\quad dm = \\sigma dA \\quad (\\text{2D}), \\quad dm = \\lambda dx \\quad (\\text{1D})',
        explanation: 'Convert infinitesimal mass dm into spatial coordinate differentials using density.'
      },
      {
        step: 4,
        latex: 'I_{\\text{disk}} = \\int_0^R r^2 \\left( \\frac{M}{\\pi R^2} 2\\pi r dr \\right) = \\frac{2M}{R^2} \\int_0^R r^3 dr = \\frac{1}{2} M R^2',
        explanation: 'Evaluate the integral for a uniform thin disk of radius R using concentric thin annular rings.'
      },
      {
        step: 5,
        latex: 'I_{\\text{rod, end}} = \\int_0^L x^2 \\left(\\frac{M}{L} dx\\right) = \\frac{M}{L} \\left[\\frac{x^3}{3}\\right]_0^L = \\frac{1}{3} M L^2',
        explanation: 'Evaluate the integral for a uniform thin rod of length L pivoted at one end.'
      }
    ],
    limitingCases: [
      {
        condition: '\\text{Hoop / Thin Ring vs Solid Disk}',
        implication: 'I_{\\text{hoop}} = M R^2 > I_{\\text{disk}} = \\frac{1}{2} M R^2',
        description: 'For a thin hoop, 100% of mass is located at maximum radius R, maximizing rotational inertia.'
      },
      {
        condition: '\\text{Solid Sphere vs Spherical Shell}',
        implication: 'I_{\\text{solid}} = \\frac{2}{5}MR^2 < I_{\\text{shell}} = \\frac{2}{3}MR^2',
        description: 'Solid sphere has mass packed towards the central axis, resulting in lower resistance to rotation.'
      },
      {
        condition: '\\text{Density power law } \\lambda(x) \\propto x^n',
        implication: 'I = \\frac{n+1}{n+3} M L^2 \\xrightarrow{n \\to \\infty} M L^2',
        description: 'As mass concentrates entirely at the outer tip (n -> infty), I approaches point-mass limit ML^2.'
      }
    ],
    greTraps: [
      {
        trap: 'Confusing spherical radial distance with perpendicular cylindrical distance',
        fix: 'The r in I = \\int r^2 dm is strictly the PERPENDICULAR distance from the rotation axis to the mass element dm, NOT the distance from the origin.'
      },
      {
        trap: 'Assuming mass or radius affects who wins an incline race',
        fix: 'For pure rolling without slipping down an incline, linear acceleration is a = \\frac{g \\sin\\theta}{1 + c}, where I = c M R^2. The shape factor c alone determines acceleration: Solid Sphere (c=0.4) > Solid Disk (c=0.5) > Shell (c=0.67) > Hoop (c=1.0), independent of M and R!'
      },
      {
        trap: 'Misapplying the Perpendicular-Axis Theorem to 3D bodies',
        fix: 'I_z = I_x + I_y holds EXCLUSIVELY for flat 2D planar laminas lying in the xy-plane. It is invalid for solid 3D cylinders, spheres, or blocks.'
      }
    ],
    parameters: [
      { id: 'shapeType', label: 'Rigid Geometry', type: 'select', options: ['Uniform Thin Rod', 'Solid Disk / Cylinder', 'Thin Hoop / Ring', 'Solid Sphere', 'Non-Uniform Power Rod (x^n)'], default: 'Solid Disk / Cylinder' },
      { id: 'massVal', label: 'Mass (M)', min: 0.5, max: 5.0, step: 0.1, default: 2.0, unit: 'kg' },
      { id: 'radVal', label: 'Radius / Length (R or L)', min: 0.5, max: 3.0, step: 0.1, default: 1.5, unit: 'm' },
      { id: 'powerN', label: 'Density Exponent (n)', min: 0, max: 6, step: 1, default: 2, unit: 'power' },
      { id: 'numSlices', label: 'Integration Slices (N)', min: 4, max: 64, step: 4, default: 24, unit: 'elements' },
      { id: 'raceActive', label: 'Incline race', type: 'toggle', default: false }
    ],
    onParamChange: function (id, val, state) {
      if (id === 'raceActive') state.raceTime = 0;
    },
    init: function (container, state, redraw) {
      state.shapeType = state.shapeType || 'Solid Disk / Cylinder';
      state.massVal = state.massVal !== undefined ? state.massVal : 2.0;
      state.radVal = state.radVal !== undefined ? state.radVal : 1.5;
      state.powerN = state.powerN !== undefined ? state.powerN : 2;
      state.numSlices = state.numSlices !== undefined ? state.numSlices : 24;
      state.raceActive = !!state.raceActive;
      state.raceTime = state.raceTime || 0;
    },
    draw: function (ctx, width, height, state, dt) {
      if (dt === undefined) dt = 0.016;
      if (dt > 0.1) dt = 0.1;

      state.massVal = state.massVal !== undefined ? state.massVal : 2.0;
      state.radVal = state.radVal !== undefined ? state.radVal : 1.5;
      state.numSlices = state.numSlices !== undefined ? state.numSlices : 24;
      state.powerN = state.powerN !== undefined ? state.powerN : 2;
      state.shapeType = state.shapeType || 'Solid Disk / Cylinder';
      state.raceTime = state.raceTime || 0;

      creamFill(ctx, width, height);

      var M = state.massVal;
      var R = state.radVal;
      var N = Math.max(4, state.numSlices | 0);

      var cFactor = 0.5;
      var formulaStr = '1/2 M R^2';
      var I_exact = 0.5 * M * R * R;
      var axisNote = 'axis through center, out of page';
      var dmNote = 'dm = 2 pi r dr sigma';

      if (state.shapeType === 'Thin Hoop / Ring') {
        cFactor = 1.0;
        formulaStr = 'M R^2';
        I_exact = M * R * R;
        dmNote = 'dm = lambda R d theta  (all mass at r = R)';
      } else if (state.shapeType === 'Solid Sphere') {
        cFactor = 0.4;
        formulaStr = '2/5 M R^2';
        I_exact = 0.4 * M * R * R;
        dmNote = 'outer shells carry more I  (r^2 weighting)';
      } else if (state.shapeType === 'Uniform Thin Rod') {
        cFactor = 1 / 12;
        formulaStr = '1/12 M L^2  (about CM)';
        I_exact = (1 / 12) * M * R * R;
        axisNote = 'axis through CM, perpendicular to rod';
        dmNote = 'dm = lambda dx';
      } else if (state.shapeType === 'Non-Uniform Power Rod (x^n)') {
        var n = state.powerN;
        cFactor = (n + 1) / (n + 3);
        formulaStr = '(' + n + '+1)/(' + n + '+3) M L^2  (pivot at x=0)';
        I_exact = cFactor * M * R * R;
        axisNote = 'axis at x = 0 (light end)';
        dmNote = 'lambda(x) proportional to x^n';
      }

      var leftW = Math.round(width * 0.52);
      var captionH = 36;
      var centerX = leftW * 0.5;
      var centerY = 22 + (height - captionH - 22) * 0.5;
      var renderRad = Math.min(leftW * 0.38, (height - captionH - 36) * 0.42);

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, leftW, height);
      ctx.clip();

      ctx.fillStyle = MUTED;
      ctx.font = '600 12px Inter, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('I = integral r^2 dm', 14, 10);

      var highlightIdx = Math.min(N - 1, Math.max(0, Math.floor(N * 0.65)));

      if (state.shapeType === 'Solid Disk / Cylinder' || state.shapeType === 'Thin Hoop / Ring' || state.shapeType === 'Solid Sphere') {
        var dr = renderRad / Math.max(1, N);

        if (state.shapeType === 'Thin Hoop / Ring') {
          var hoopThick = Math.max(10, renderRad * 0.12);
          ctx.fillStyle = 'rgba(204, 120, 92, 0.35)';
          ctx.strokeStyle = CORAL;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(centerX, centerY, renderRad, 0, Math.PI * 2);
          ctx.arc(centerX, centerY, renderRad - hoopThick, 0, Math.PI * 2, true);
          ctx.fill();
          ctx.stroke();

          var dAngle = (2 * Math.PI) / N;
          ctx.fillStyle = GOLD;
          ctx.beginPath();
          ctx.arc(centerX, centerY, renderRad, -0.15, dAngle - 0.15);
          ctx.arc(centerX, centerY, renderRad - hoopThick, dAngle - 0.15, -0.15, true);
          ctx.closePath();
          ctx.fill();
        } else {
          for (var i = 0; i < N; i++) {
            var rInner = i * dr;
            var rOuter = (i + 1) * dr;
            var frac = (i + 0.5) / N;
            var alpha = 0.10 + 0.70 * (state.shapeType === 'Solid Sphere' ? Math.sqrt(Math.max(0, 1 - frac * frac)) : frac);
            ctx.fillStyle = 'rgba(93, 184, 166, ' + alpha + ')';
            ctx.strokeStyle = 'rgba(20, 20, 19, 0.10)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(centerX, centerY, rOuter, 0, Math.PI * 2);
            if (rInner > 0) ctx.arc(centerX, centerY, rInner, 0, Math.PI * 2, true);
            ctx.fill();
            ctx.stroke();

            if (i === highlightIdx) {
              ctx.fillStyle = 'rgba(212, 160, 23, 0.45)';
              ctx.fill();
              ctx.strokeStyle = GOLD;
              ctx.lineWidth = 2;
              ctx.stroke();
            }
          }
        }

        ctx.fillStyle = INK;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = CREAM;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.strokeStyle = CORAL;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX + renderRad, centerY);
        ctx.stroke();

        pill(ctx, 'R', centerX + renderRad * 0.55, centerY + 14, CORAL, 'center');
      } else {
        var rodLenPx = Math.min(leftW - 48, renderRad * 2.4);
        var rodThick = 26;
        var rodStartX = centerX - rodLenPx * 0.5;
        var rodY = centerY - rodThick * 0.5;
        var dx = rodLenPx / Math.max(1, N);

        for (var ri = 0; ri < N; ri++) {
          var xFrac = (ri + 0.5) / N;
          var xPos = rodStartX + ri * dx;
          var rodAlpha = 0.18 + 0.72 * (state.shapeType === 'Uniform Thin Rod' ? 0.55 : Math.pow(xFrac, state.powerN));
          ctx.fillStyle = 'rgba(204, 120, 92, ' + rodAlpha + ')';
          ctx.fillRect(xPos, rodY, Math.max(1, dx - 1), rodThick);
          ctx.strokeStyle = 'rgba(20, 20, 19, 0.10)';
          ctx.strokeRect(xPos, rodY, Math.max(1, dx - 1), rodThick);

          if (ri === Math.floor(N * 0.75)) {
            ctx.fillStyle = GOLD;
            ctx.fillRect(xPos, rodY, Math.max(1, dx - 1), rodThick);
            ctx.strokeStyle = GOLD;
            ctx.lineWidth = 2;
            ctx.strokeRect(xPos, rodY, Math.max(1, dx - 1), rodThick);
          }
        }

        var axisX = (state.shapeType === 'Uniform Thin Rod') ? centerX : rodStartX;
        ctx.fillStyle = INK;
        ctx.beginPath();
        ctx.arc(axisX, centerY, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = CREAM;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.restore();

      pill(ctx, axisNote, 14, height - 28, MUTED, 'left');
      pill(ctx, dmNote, 14, height - 12, GOLD, 'left');

      ctx.strokeStyle = LINE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(leftW, 12);
      ctx.lineTo(leftW, height - 12);
      ctx.stroke();

      var rightX = leftW + 12;
      var rightW = width - rightX - 12;
      var keyH = 52;
      var rampStartX = rightX + 10;
      var rampStartY = 64;
      var rampLen = rightW - 20;
      var rampHeight = Math.min(height - keyH - rampStartY - 20, height * 0.42);
      var rampEndX = rampStartX + rampLen;
      var rampEndY = rampStartY + rampHeight;

      ctx.fillStyle = MUTED;
      ctx.font = '600 12px Inter, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('Rolling race   a = g sin theta / (1 + c)', rightX + 4, 10);

      ctx.beginPath();
      ctx.moveTo(rampStartX, rampStartY);
      ctx.lineTo(rampEndX, rampEndY);
      ctx.lineTo(rampStartX, rampEndY);
      ctx.closePath();
      ctx.fillStyle = 'rgba(239, 233, 222, 0.7)';
      ctx.fill();
      ctx.strokeStyle = MUTED;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      var thetaIncline = Math.atan2(rampHeight, rampLen);
      var gSinTheta = 9.81 * Math.sin(thetaIncline);

      var racers = [
        { name: 'sphere', c: 0.40, color: GOOD, letter: 'S' },
        { name: 'disk', c: 0.50, color: CORAL, letter: 'D' },
        { name: 'shell', c: 0.67, color: GOLD, letter: 'H' },
        { name: 'hoop', c: 1.00, color: ROSE, letter: 'R' }
      ];

      if (state.raceActive) {
        state.raceTime += dt;
      } else {
        state.raceTime = 0;
      }

      var maxTrackPx = Math.max(8, rampLen - 28);
      var pxScale = maxTrackPx / 2.0;

      racers.forEach(function (rc, idx) {
        var aLin = gSinTheta / (1 + rc.c);
        var distMeters = 0.5 * aLin * (state.raceTime * state.raceTime);
        var distPx = Math.min(maxTrackPx, distMeters * pxScale);
        var u = distPx / maxTrackPx;
        var startX = rampStartX + 16;
        var startY = rampStartY + 18 + idx * 20;
        var endX = rampEndX - 14;
        var endY = rampEndY - 16 - (3 - idx) * 6;
        var rX = startX + u * (endX - startX);
        var rY = startY + u * (endY - startY);

        ctx.fillStyle = rc.color;
        ctx.beginPath();
        ctx.arc(rX, rY, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = CREAM;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = CREAM;
        ctx.font = '700 9px Inter, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(rc.letter, rX, rY);
      });

      var keyY = height - keyH + 10;
      var colW = rightW / 4;
      racers.forEach(function (rc, idx) {
        var kx = rightX + colW * (idx + 0.5);
        ctx.fillStyle = rc.color;
        ctx.beginPath();
        ctx.arc(kx - 22, keyY, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = INK;
        ctx.font = '500 10px Inter, -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(rc.letter + ' ' + rc.name, kx - 14, keyY);
        ctx.fillStyle = MUTED;
        ctx.font = '500 9px Inter, -apple-system, sans-serif';
        ctx.fillText('c = ' + rc.c.toFixed(2), kx - 14, keyY + 14);
      });

      vizLegend('Continuous I', [
        { label: 'Geometry', value: state.shapeType },
        { label: 'I', value: I_exact.toFixed(3) + ' kg m^2' },
        { label: 'Formula', value: 'I = ' + formulaStr },
        { label: 'c = I / (M R^2)', value: cFactor.toFixed(3) },
        { label: 'a / (g sin theta)', value: (1 / (1 + cFactor)).toFixed(3) },
        { label: 'Race time', value: state.raceActive ? state.raceTime.toFixed(2) + ' s' : 'off (toggle to start)' }
      ]);
    },
    challenge: {
      question: 'A thin straight rod of length $L$ and total mass $M$ has a non-uniform linear mass density $\\lambda(x) = \\lambda_0 \\frac{x^2}{L^2}$ for $0 \\le x \\le L$, where $x=0$ is one end of the rod. What is the moment of inertia $I$ of the rod about a perpendicular axis passing through the end $x=0$?',
      options: [
        'A: $\\frac{1}{3} M L^2$',
        'B: $\\frac{1}{5} M L^2$',
        'C: $\\frac{3}{5} M L^2$',
        'D: $\\frac{2}{5} M L^2$',
        'E: $\\frac{3}{4} M L^2$'
      ],
      correct: 2,
      explanation: `
        First, compute the total mass $M$ in terms of $\\lambda_0$:
        $$M = \\int_0^L \\lambda(x) dx = \\lambda_0 \\int_0^L \\frac{x^2}{L^2} dx = \\frac{\\lambda_0}{L^2} \\left[\\frac{x^3}{3}\\right]_0^L = \\frac{\\lambda_0 L}{3} \\implies \\lambda_0 = \\frac{3M}{L}$$
        
        Next, compute the moment of inertia integral $I = \\int x^2 dm = \\int_0^L x^2 \\lambda(x) dx$:
        $$I = \\int_0^L x^2 \\left( \\lambda_0 \\frac{x^2}{L^2} \\right) dx = \\frac{\\lambda_0}{L^2} \\int_0^L x^4 dx = \\frac{\\lambda_0}{L^2} \\left[\\frac{x^5}{5}\\right]_0^L = \\frac{\\lambda_0 L^3}{5}$$
        
        Substitute $\\lambda_0 = \\frac{3M}{L}$:
        $$I = \\frac{\\left(\\frac{3M}{L}\\right) L^3}{5} = \\frac{3}{5} M L^2$$
      `
    }
  };

  PGRE.visualizers['cpgf-1.25'] = {
    id: 'cpgf-1.25',
    title: 'Parallel-Axis (Steiner) Theorem & Physical Pendulum',
    formulaLatex: 'I = I_{\\text{CM}} + M d^2',
    physicalStory: `
      Calculating the moment of inertia about every possible axis from direct integration is tedious. The **Parallel-Axis Theorem** (Steiner's Theorem) states that the moment of inertia $I$ about any axis parallel to an axis through the Center of Mass (CM) equals $I_{\\text{CM}}$ plus the mass $M$ multiplied by the square of the perpendicular shift distance $d^2$.

      Two foundational physical insights emerge:
      1. **$I_{\\text{CM}}$ is the absolute global minimum**: For a given axis direction, the moment of inertia is strictly minimized when passing through the Center of Mass ($d=0$).
      2. **Physical Pendulum Period**: When pivoted at distance $d$ from CM, the oscillation period is $T = 2\\pi \\sqrt{\\frac{I_{\\text{CM}} + M d^2}{M g d}}$. As $d \\to 0$, $T \\to \\infty$ (no restoring gravitational torque); as $d \\to \\infty$, $T \\to \\infty$ (large rotational inertia). Hence, there exists a unique optimal pivot distance $d = \\sqrt{I_{\\text{CM}}/M} = k_g$ (radius of gyration) that **minimizes the oscillation period**!
    `,
    derivationSteps: [
      {
        step: 1,
        latex: '\\mathbf{r} = \\mathbf{r}_{\\text{CM}} + \\mathbf{r}\'',
        explanation: 'Set up coordinates relative to the Center of Mass, such that \\int \\mathbf{r}\' dm = \\mathbf{0}.'
      },
      {
        step: 2,
        latex: 'I_P = \\int |\\mathbf{r}\' - \\mathbf{d}|^2 dm = \\int (r\'^2 - 2\\mathbf{r}\' \\cdot \\mathbf{d} + d^2) dm',
        explanation: 'Expand the squared perpendicular distance from a new parallel axis shifted by vector \\mathbf{d}.'
      },
      {
        step: 3,
        latex: 'I_P = \\int r\'^2 dm - 2\\mathbf{d} \\cdot \\left(\\int \\mathbf{r}\' dm\\right) + d^2 \\int dm',
        explanation: 'Split into three separate integrals.'
      },
      {
        step: 4,
        latex: '\\int \\mathbf{r}\' dm = M \\mathbf{r}\'_{\\text{CM}} = \\mathbf{0}',
        explanation: 'By the very definition of the Center of Mass, the linear cross-term vanishes identically!'
      },
      {
        step: 5,
        latex: 'I_P = I_{\\text{CM}} + M d^2',
        explanation: 'The remaining terms yield the parallel-axis formula.'
      }
    ],
    limitingCases: [
      {
        condition: 'd = 0 \\text{ (Pivot at CM)}',
        implication: 'I = I_{\\text{CM}} \\quad (\\text{Minimum})',
        description: 'No parallel shift; rotational inertia is at its absolute lowest value.'
      },
      {
        condition: 'd \\gg R \\text{ (Far Pivot)}',
        implication: 'I \\approx M d^2',
        description: 'The internal geometry of the body becomes negligible; it behaves as a point mass orbiting the pivot.'
      },
      {
        condition: 'd = k_g = \\sqrt{I_{\\text{CM}}/M}',
        implication: 'T_{\\text{min}} = 2\\pi \\sqrt{\\frac{2 k_g}{g}}',
        description: 'Physical pendulum period achieves its global minimum (Kater pendulum principle).'
      }
    ],
    greTraps: [
      {
        trap: 'Shifting directly between two non-CM parallel axes A and B',
        fix: 'CRITICAL GRE TRAP: The formula I = I_0 + Md^2 is ONLY valid if I_0 is the moment of inertia about the CENTER OF MASS! You CANNOT do I_B = I_A + M d_{AB}^2. You must first shift back to CM: I_CM = I_A - M d_A^2, then shift to B: I_B = I_CM + M d_B^2.'
      },
      {
        trap: 'Assuming a shorter pendulum always swings faster',
        fix: 'In a physical pendulum, shortening the pivot distance d towards CM makes T = 2\\pi\\sqrt{\\frac{I_p}{Mgd}} diverge to infinity because the restoring torque (Mgd) vanishes faster than the inertia I_p.'
      }
    ],
    parameters: [
      { id: 'bodyShape', label: 'Body Geometry', type: 'select', options: ['Uniform Thin Rod (L)', 'Solid Disk (R)', 'Hollow Ring (R)'], default: 'Uniform Thin Rod (L)' },
      { id: 'bodyMass', label: 'Mass (M)', min: 0.5, max: 4.0, step: 0.1, default: 1.5, unit: 'kg' },
      { id: 'bodyDim', label: 'Size (L or R)', min: 0.5, max: 2.5, step: 0.1, default: 1.2, unit: 'm' },
      { id: 'pivotShift', label: 'Shift Distance (d)', min: 0, max: 1.2, step: 0.02, default: 0.35, unit: 'm' },
      { id: 'paused', label: 'Pause swing', type: 'toggle', default: false }
    ],
    onParamChange: function (id, val, state) {
      if (id === 'bodyShape' || id === 'pivotShift' || id === 'bodyDim' || id === 'bodyMass') {
        state.pendulumAngle = 0.40;
        state.pendulumOmega = 0;
      }
      if (id === 'paused' && !val) {
        state.pendulumAngle = 0.40;
        state.pendulumOmega = 0;
      }
    },
    init: function (container, state, redraw) {
      state.bodyShape = state.bodyShape || 'Uniform Thin Rod (L)';
      state.bodyMass = state.bodyMass !== undefined ? state.bodyMass : 1.5;
      state.bodyDim = state.bodyDim !== undefined ? state.bodyDim : 1.2;
      state.pivotShift = state.pivotShift !== undefined ? state.pivotShift : 0.35;
      state.pendulumAngle = state.pendulumAngle !== undefined ? state.pendulumAngle : 0.35;
      state.pendulumOmega = state.pendulumOmega || 0;
      state.paused = !!state.paused;
    },
    draw: function (ctx, width, height, state, dt) {
      if (dt === undefined) dt = 0.016;
      if (dt > 0.1) dt = 0.1;

      state.bodyMass = state.bodyMass !== undefined ? state.bodyMass : 1.5;
      state.bodyDim = state.bodyDim !== undefined ? state.bodyDim : 1.2;
      state.pivotShift = state.pivotShift !== undefined ? state.pivotShift : 0.35;
      state.bodyShape = state.bodyShape || 'Uniform Thin Rod (L)';
      state.pendulumAngle = state.pendulumAngle !== undefined ? state.pendulumAngle : 0.35;
      state.pendulumOmega = state.pendulumOmega || 0;

      creamFill(ctx, width, height);

      var M = state.bodyMass;
      var L = Math.max(0.2, state.bodyDim);
      var d = Math.min(state.pivotShift, L * 0.5);
      var g = 9.81;

      var I_cm = (1 / 12) * M * L * L;
      if (state.bodyShape === 'Solid Disk (R)') {
        I_cm = 0.5 * M * (L * 0.5) * (L * 0.5);
      } else if (state.bodyShape === 'Hollow Ring (R)') {
        I_cm = M * (L * 0.5) * (L * 0.5);
      }

      var I_p = I_cm + M * d * d;
      var k_g = Math.sqrt(Math.max(0, I_cm / M));
      var curT = (d > 0.01) ? 2 * Math.PI * Math.sqrt(I_p / (M * g * d)) : Infinity;
      var minT = 2 * Math.PI * Math.sqrt((2 * k_g) / g);

      if (!state.paused && d > 0.005 && I_p > 1e-9) {
        var alphaP = -(M * g * d * Math.sin(state.pendulumAngle)) / I_p;
        state.pendulumOmega += alphaP * dt;
        state.pendulumOmega *= Math.exp(-0.15 * dt);
        state.pendulumAngle += state.pendulumOmega * dt;
      }

      var leftW = Math.round(width * 0.46);
      var pivotPxX = leftW * 0.5;
      var pxScale = Math.min(leftW, height) * 0.36;
      var halfBody = (state.bodyShape === 'Uniform Thin Rod (L)') ? pxScale * 0.45 : pxScale * 0.42;
      var pivotPxY = Math.max(18, halfBody + 14);
      var dPx = (d / (L * 0.5 || 1)) * (pxScale * 0.45);
      var cmPxY = dPx;
      var ang = state.pendulumAngle;
      var cmX = pivotPxX - Math.sin(ang) * cmPxY;
      var cmY = pivotPxY + Math.cos(ang) * cmPxY;

      DrawUtils.drawHatchedWall(ctx, pivotPxX - 26, pivotPxY - 10, 52, 10, 'horizontal-top');

      ctx.save();
      ctx.translate(pivotPxX, pivotPxY);
      ctx.rotate(ang);

      if (state.bodyShape === 'Uniform Thin Rod (L)') {
        var rodLenPx = pxScale * 0.9;
        var rodTopY = cmPxY - rodLenPx * 0.5;
        ctx.fillStyle = 'rgba(204, 120, 92, 0.38)';
        ctx.strokeStyle = CORAL;
        ctx.lineWidth = 2.5;
        ctx.fillRect(-9, rodTopY, 18, rodLenPx);
        ctx.strokeRect(-9, rodTopY, 18, rodLenPx);
      } else {
        var diskRadPx = pxScale * 0.42;
        ctx.strokeStyle = CORAL;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, cmPxY, diskRadPx, 0, Math.PI * 2);
        if (state.bodyShape === 'Hollow Ring (R)') {
          ctx.stroke();
          ctx.lineWidth = 7;
          ctx.globalAlpha = 0.45;
          ctx.stroke();
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = 'rgba(204, 120, 92, 0.32)';
          ctx.fill();
          ctx.stroke();
        }
      }

      if (dPx > 6) {
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, cmPxY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.fillStyle = GOOD;
      ctx.beginPath();
      ctx.arc(0, cmPxY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = CREAM;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = CREAM;
      ctx.stroke();
      ctx.restore();

      if (dPx < 14) {
        pill(ctx, 'pivot = CM', pivotPxX + 12, pivotPxY - 2, INK, 'left');
      } else {
        pill(ctx, 'pivot', pivotPxX + 12, pivotPxY - 2, INK, 'left');
        var cmAlign = cmX > leftW * 0.55 ? 'right' : 'left';
        var cmLabelX = cmAlign === 'right' ? cmX - 12 : cmX + 12;
        pill(ctx, 'CM', cmLabelX, cmY, GOOD, cmAlign);

        var mx = (pivotPxX + cmX) / 2;
        var my = (pivotPxY + cmY) / 2;
        var vx = cmX - pivotPxX;
        var vy = cmY - pivotPxY;
        var vlen = Math.hypot(vx, vy) || 1;
        var lx = mx - (vy / vlen) * 16;
        var ly = my + (vx / vlen) * 16;
        if (lx < 18) lx = 18;
        if (lx > leftW - 18) lx = leftW - 18;
        pill(ctx, 'd', lx, ly, GOLD, 'center');
      }

      ctx.strokeStyle = LINE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(leftW, 12);
      ctx.lineTo(leftW, height - 12);
      ctx.stroke();

      var rightX = leftW + 10;
      var rightW = width - rightX - 10;
      var g1Y = 10;
      var g1H = (height - 28) * 0.48;
      var g2Y = g1Y + g1H + 8;
      var g2H = height - g2Y - 10;
      var maxD = L * 0.5;
      var maxI = I_cm + M * maxD * maxD;

      function plotBox(x, y, w, h, title, xLab, yLab) {
        panelRect(ctx, x, y, w, h);
        ctx.save();
        ctx.fillStyle = MUTED;
        ctx.font = '600 11px Inter, -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(title, x + 10, y + 8);
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(xLab, x + w - 8, y + h - 5);
        ctx.restore();
        return { x: x + 16, y: y + 26, w: w - 28, h: h - 42 };
      }

      var inner1 = plotBox(rightX, g1Y, rightW, g1H, 'I(d) = I_CM + M d^2', 'd', 'I');
      ctx.save();
      ctx.beginPath();
      ctx.rect(inner1.x, inner1.y, inner1.w, inner1.h);
      ctx.clip();
      ctx.strokeStyle = CORAL;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (var s = 0; s <= 50; s++) {
        var dStep = (s / 50) * maxD;
        var iStep = I_cm + M * dStep * dStep;
        var gx = inner1.x + (maxD > 0 ? (dStep / maxD) * inner1.w : 0);
        var gy = inner1.y + inner1.h - (maxI > 0 ? (iStep / (maxI * 1.05)) * inner1.h : 0);
        if (s === 0) ctx.moveTo(gx, gy);
        else ctx.lineTo(gx, gy);
      }
      ctx.stroke();
      var curGx = inner1.x + (maxD > 0 ? (d / maxD) * inner1.w : 0);
      var curGy = inner1.y + inner1.h - (maxI > 0 ? (I_p / (maxI * 1.05)) * inner1.h : 0);
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(curGx, curGy, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      var inner2 = plotBox(rightX, g2Y, rightW, g2H, 'T(d) = 2 pi sqrt(I_P / M g d)', 'd', 'T');
      var tMinY = minT * 0.75;
      var tMaxY = minT * 2.6;
      ctx.save();
      ctx.beginPath();
      ctx.rect(inner2.x, inner2.y, inner2.w, inner2.h);
      ctx.clip();
      ctx.strokeStyle = GOOD;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      var firstPt = true;
      for (var s2 = 1; s2 <= 60; s2++) {
        var dS = (s2 / 60) * maxD;
        if (dS < 0.01) continue;
        var iS = I_cm + M * dS * dS;
        var tS = 2 * Math.PI * Math.sqrt(iS / (M * g * dS));
        if (tS > tMaxY) continue;
        var tx = inner2.x + (maxD > 0 ? (dS / maxD) * inner2.w : 0);
        var ty = inner2.y + inner2.h - ((tS - tMinY) / (tMaxY - tMinY)) * inner2.h;
        if (firstPt) { ctx.moveTo(tx, ty); firstPt = false; }
        else ctx.lineTo(tx, ty);
      }
      ctx.stroke();

      if (maxD > 0 && k_g <= maxD) {
        var kgX = inner2.x + (k_g / maxD) * inner2.w;
        ctx.strokeStyle = ROSE;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(kgX, inner2.y);
        ctx.lineTo(kgX, inner2.y + inner2.h);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = ROSE;
        ctx.beginPath();
        ctx.arc(kgX, inner2.y + inner2.h - ((minT - tMinY) / (tMaxY - tMinY)) * inner2.h, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      if (d > 0.01 && isFinite(curT) && curT < tMaxY) {
        var curTx = inner2.x + (maxD > 0 ? (d / maxD) * inner2.w : 0);
        var curTy = inner2.y + inner2.h - ((curT - tMinY) / (tMaxY - tMinY)) * inner2.h;
        ctx.fillStyle = GOLD;
        ctx.beginPath();
        ctx.arc(curTx, curTy, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      if (maxD > 0 && k_g <= maxD) {
        var kgLabelX = inner2.x + (k_g / maxD) * inner2.w;
        var kgAlign = kgLabelX > rightX + rightW - 36 ? 'right' : 'center';
        pill(ctx, 'k_g', kgLabelX, g2Y + g2H - 10, ROSE, kgAlign);
      }

      vizLegend('Parallel-axis theorem', [
        { label: 'Body', value: state.bodyShape },
        { label: 'I_CM', value: I_cm.toFixed(3) + ' kg m^2' },
        { label: 'd', value: d.toFixed(2) + ' m' },
        { label: 'I_P = I_CM + M d^2', value: I_p.toFixed(3) + ' kg m^2' },
        { label: 'k_g = sqrt(I_CM/M)', value: k_g.toFixed(3) + ' m' },
        { label: 'T(d)', value: isFinite(curT) ? curT.toFixed(2) + ' s' : 'infinite (d = 0)' },
        { label: 'T_min at d = k_g', value: minT.toFixed(2) + ' s' }
      ]);
    },
    challenge: {
      question: 'A uniform thin disk of mass $M$ and radius $R$ is pivoted to oscillate as a physical pendulum about a horizontal axis located on its outer rim (pivot distance $d = R$). What is the period $T$ of small-amplitude oscillations?',
      options: [
        'A: $2\\pi \\sqrt{\\frac{R}{g}}$',
        'B: $2\\pi \\sqrt{\\frac{3R}{2g}}$',
        'C: $2\\pi \\sqrt{\\frac{2R}{3g}}$',
        'D: $2\\pi \\sqrt{\\frac{R}{2g}}$',
        'E: $2\\pi \\sqrt{\\frac{5R}{4g}}$'
      ],
      correct: 1,
      explanation: `
        First, the moment of inertia of a uniform disk about its Center of Mass is:
        $$I_{\\text{CM}} = \\frac{1}{2} M R^2$$
        
        Using the Parallel-Axis Theorem, shift the axis to the rim ($d = R$):
        $$I_{\\text{pivot}} = I_{\\text{CM}} + M d^2 = \\frac{1}{2} M R^2 + M R^2 = \\frac{3}{2} M R^2$$
        
        The period of a physical pendulum pivoted at distance $d = R$ from the CM is:
        $$T = 2\\pi \\sqrt{\\frac{I_{\\text{pivot}}}{M g d}} = 2\\pi \\sqrt{\\frac{\\frac{3}{2} M R^2}{M g R}} = 2\\pi \\sqrt{\\frac{3R}{2g}}$$
      `
    }
  };


})(typeof window !== 'undefined' ? window : globalThis);
