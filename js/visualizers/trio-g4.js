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
  var DEEP = '#964b32';

  function syncStageTheme() {
    var t = PGRE.vizStageTheme ? PGRE.vizStageTheme() : null;
    if (!t) return;
    INK = t.ink; MUTED = t.muted; CREAM = t.bg; PANEL = t.panel; LINE = t.line;
  }

  function creamFill(ctx, w, h) {
    syncStageTheme();
    ctx.fillStyle = (CV && CV.colors && CV.colors.bg) ? CV.colors.bg : CREAM;
    ctx.fillRect(0, 0, w, h);
  }

  function lightGrid(ctx, w, h, step) {
    step = step || 40;
    ctx.save();
    ctx.strokeStyle = (CV && CV.colors && CV.colors.grid) || (PGRE.vizStageTheme && PGRE.vizStageTheme().inkFade(0.06)) || LINE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    var x, y;
    for (x = 0; x <= w; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (y = 0; y <= h; y += step) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();
    ctx.restore();
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
    ctx.fillStyle = PGRE.vizStageTheme().chipFade(0.94);
    ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.10);
    ctx.lineWidth = 1;
    ctx.fillRect(left - 4, y - 8, tw + 8, 16);
    ctx.strokeRect(left - 4, y - 8, tw + 8, 16);
    ctx.fillStyle = color || INK;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function findVizCanvas(container) {
    var canvas = null;
    if (container && container.tagName === 'CANVAS') canvas = container;
    else if (container && typeof container.querySelector === 'function') {
      canvas = container.querySelector('canvas');
    }
    if (!canvas && typeof document !== 'undefined' && document && typeof document.getElementById === 'function') {
      canvas = document.getElementById('viz-canvas') || document.getElementById('viz-inline-canvas');
    }
    return canvas;
  }

  function numParam(state, key, fallback) {
    var n = parseFloat(state && state[key]);
    return isFinite(n) ? n : fallback;
  }

  function simSpeedOf(state) {
    var s = numParam(state, 'simSpeed', 1);
    if (s < 0.2) s = 0.2;
    if (s > 3) s = 3;
    return s;
  }

  function isOn(v, fallback) {
    if (v === undefined || v === null || v === '') return !!fallback;
    if (v === true || v === 1 || v === '1' || v === 'true' || v === 'on') return true;
    if (v === false || v === 0 || v === '0' || v === 'false' || v === 'off') return false;
    return !!v;
  }

  function latexNum(n, digits, unit) {
    var s = Number(n).toFixed(digits);
    return unit ? ('$' + s + '\\,' + unit + '$') : ('$' + s + '$');
  }

  function safeDt(dt) {
    var n = parseFloat(dt);
    if (!isFinite(n) || n < 0) return 0;
    if (n > 0.05) n = 0.05;
    return n;
  }

  function ringDot(ctx, x, y, r, fill, stroke) {
    ctx.save();
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  function glowBob(ctx, x, y, r, fill, glow) {
    if (CV && typeof CV.drawGlowCircle === 'function') {
      CV.drawGlowCircle(ctx, x, y, r, fill, glow || 'rgba(204, 120, 92, 0.45)', r * 1.8);
      return;
    }
    ringDot(ctx, x, y, r, fill, DEEP);
  }

  function shaft(ctx, x0, y0, x1, y1, color, width, dash) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 2;
    ctx.lineCap = 'round';
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.restore();
  }

  function drawCeiling(ctx, width, y) {
    ctx.save();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(10, y);
    ctx.lineTo(width - 10, y);
    ctx.stroke();
    ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.28);
    ctx.lineWidth = 1.2;
    var x;
    for (x = 16; x < width - 8; x += 9) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 7, y - 9);
      ctx.stroke();
    }
    ctx.restore();
  }


  /* Complete elliptic K(m), m = k^2. AGM. Pendulum T = T0 * (2/pi) K(sin^2(theta0/2)). */
  function ellipticK(m) {
    if (m >= 0.999999) return Infinity;
    if (m <= 0) return Math.PI / 2;
    var a = 1;
    var b = Math.sqrt(1 - m);
    var i;
    for (i = 0; i < 16; i++) {
      var an = 0.5 * (a + b);
      var bn = Math.sqrt(a * b);
      a = an;
      b = bn;
    }
    return Math.PI / (2 * a);
  }

  function pendulumPeriodRatio(theta0) {
    var k2 = Math.sin(Math.abs(theta0) / 2);
    k2 = k2 * k2;
    var K = ellipticK(k2);
    if (!isFinite(K)) return Infinity;
    return (2 / Math.PI) * K;
  }


  PGRE.visualizers['cpgf-1.47'] = {
    id: 'cpgf-1.47',
    topic: 'cm',
    title: 'Simple & Physical Pendulum Dynamics & Large-Angle Anharmonicity',
    formulaLatex:
      '$$\\ddot{\\theta} + \\frac{g}{L}\\sin\\theta = 0 \\xrightarrow{\\theta \\ll 1} \\omega_0 = \\sqrt{\\frac{g}{L}},\\quad T(\\theta_0) \\approx 2\\pi\\sqrt{\\frac{L}{g}}\\left(1 + \\frac{1}{16}\\theta_0^2 + \\frac{11}{3072}\\theta_0^4\\right)$$',
    physicalStory:
      'A simple pendulum is a point mass $m$ on a rigid massless rod of length $L$. Gravity supplies the restoring torque $\\tau = -mgL\\sin\\theta$. Because $\\sin\\theta < \\theta$ for $\\theta > 0$, the exact restoring torque is weaker than the small-angle estimate $-mgL\\theta$: large-amplitude swings run slow. The small-angle linearization $\\sin\\theta\\approx\\theta$ is isochronous, $T_0=2\\pi\\sqrt{L/g}$, independent of $m$ (Galilean equivalence). The exact period is the complete elliptic integral $T=T_0\\,(2/\\pi)K(\\sin^2(\\theta_0/2))$, which diverges as $\\theta_0\\to\\pi$. A uniform rod pivoted at one end is the same equation with $L_{\\mathrm{eff}}=2L/3$.',
    derivationSteps: [
      {
        step: 1,
        title: 'Rotational Form of Newton\'s 2nd Law',
        formula: '\\tau = I\\ddot{\\theta} = -mg(L\\sin\\theta),\\quad I = mL^2',
        text: 'The gravitational torque about the suspension pivot opposes angular displacement, with moment of inertia $I = mL^2$ for a point bob.'
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
        text: 'To first order in Taylor expansion, the motion reduces to simple harmonic motion with period $T_0 = 2\\pi\\sqrt{L/g}$.'
      },
      {
        step: 4,
        title: 'Physical Pendulum Generalization',
        formula: '\\omega = \\sqrt{\\frac{mg d}{I_{\\text{pivot}}}} = \\sqrt{\\frac{g}{L_{\\text{eff}}}},\\quad L_{\\text{eff}} = \\frac{I_{\\text{pivot}}}{md} = d + \\frac{I_{\\text{cm}}}{md}',
        text: 'For a uniform rod of length $L$ pivoted at one end ($I = \\frac13 mL^2$, $d = L/2$), effective length is $L_{\\mathrm{eff}} = \\frac23 L$, increasing frequency to $\\sqrt{3g/(2L)}$.'
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
        strategy: '$T = 2\\pi\\sqrt{L/g}$ contains no mass term. A $1\\,\\mathrm{kg}$ bob and a $100\\,\\mathrm{kg}$ bob have identical small-angle periods.'
      },
      {
        trap: 'Simple Pendulum vs Uniform Rod',
        warning: 'Treating a swinging rod as a simple pendulum of length L.',
        strategy: 'Always use the physical-pendulum formula: $L_{\\mathrm{eff}} = I/(md) = (\\frac13 mL^2)/(m L/2) = \\frac23 L$. The rod period is $T = 2\\pi\\sqrt{2L/(3g)}$.'
      },
      {
        trap: 'Large Angle Anharmonic Period Increase',
        warning: 'Assuming T is strictly constant for large release angles like 60°.',
        strategy: 'Large-angle period expands as $T \\approx T_0(1 + \\frac1{16}\\theta_0^2)$. At $60^\\circ$ ($\\pi/3\\,\\mathrm{rad}$), the period is about $7\\%$ longer than $T_0$. The exact factor is $(2/\\pi)K(\\sin^2(\\theta_0/2))$.'
      }
    ],
    parameters: [
      { id: 'L', label: 'Length ($L$)', min: 0.2, max: 2.5, step: 0.05, default: 1.0, unit: 'm' },
      { id: 'g', label: 'Gravity ($g$)', min: 1.0, max: 25.0, step: 0.1, default: 9.8, unit: 'm/s²' },
      { id: 'theta0_deg', label: 'Initial Angle ($\\theta_0$)', min: 5, max: 170, step: 5, default: 75, unit: 'deg' },
      { id: 'isRod', label: 'Uniform rod (physical pendulum)', type: 'toggle', default: false },
      { id: 'damping', label: 'Damping ($\\gamma$)', min: 0.0, max: 0.2, step: 0.01, default: 0.0, unit: 's⁻¹' },
      { id: 'simSpeed', label: 'Simulation Speed', min: 0.2, max: 3.0, step: 0.2, default: 1.0, unit: 'x' }
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

    init: function (container, state, redraw) {
      state.L = state.L !== undefined ? state.L : 1.0;
      state.g = state.g !== undefined ? state.g : 9.8;
      state.theta0_deg = state.theta0_deg !== undefined ? state.theta0_deg : 75;
      state.isRod = isOn(state.isRod, false);
      state.damping = state.damping !== undefined ? state.damping : 0.0;
      if (state.simSpeed === undefined) state.simSpeed = 1.0;

      var initRad = (Number(state.theta0_deg) * Math.PI) / 180;
      state.sim = {
        theta: initRad,
        omega: 0.0,
        theta_lin: initRad,
        omega_lin: 0.0,
        t: 0.0,
        isDragging: false,
        trail: [],
        amp: Math.abs(initRad)
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
          return { x: clientX - rect.left, y: clientY - rect.top };
        };

        var onDown = function (e) {
          var pos = getPos(e);
          var bob = state.sim.bobScreenPos;
          if (bob && Math.hypot(pos.x - bob.x, pos.y - bob.y) < bob.radius * 2.2) {
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
            state.sim.trail = [];
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

    draw: function (ctx, width, height, state, dt) {
      if (!state.sim) this.init(null, state);
      var sim = state.sim;

      var L = Math.max(0.2, numParam(state, 'L', 1.0));
      var g = Math.max(0.5, numParam(state, 'g', 9.8));
      var isRod = isOn(state.isRod, false);
      var damping = Math.max(0.0, numParam(state, 'damping', 0.0));
      var speed = simSpeedOf(state);
      var theta0deg = numParam(state, 'theta0_deg', 75);

      var sig = L + '|' + g + '|' + theta0deg + '|' + (isRod ? 1 : 0);
      if (sim.lastSig !== undefined && sim.lastSig !== sig && !sim.isDragging) {
        var initRad = (theta0deg * Math.PI) / 180;
        sim.theta = initRad;
        sim.theta_lin = initRad;
        sim.omega = 0.0;
        sim.omega_lin = 0.0;
        sim.t = 0.0;
        sim.amp = Math.abs(initRad);
        sim.trail = [];
      }
      sim.lastSig = sig;
      if (sim.amp === undefined) sim.amp = Math.abs(sim.theta);

      var Leff = isRod ? (2 / 3) * L : L;
      var omega0 = Math.sqrt(g / Leff);
      var T0 = (2 * Math.PI) / omega0;
      var thetaAmp = Math.max(sim.amp || 0, Math.abs(sim.theta));
      var ratio = pendulumPeriodRatio(thetaAmp);
      var T_exact = isFinite(ratio) ? T0 * ratio : Infinity;
      var series = T0 * (1 + (1 / 16) * thetaAmp * thetaAmp + (11 / 3072) * Math.pow(thetaAmp, 4));

      var dtEff = safeDt(dt) * speed;
      if (dtEff > 0.12) dtEff = 0.12;
      var subSteps = 10;
      var stepDt = dtEff / subSteps;
      var s;

      if (!sim.isDragging) {
        for (s = 0; s < subSteps; s++) {
          var f_nonlin = function (th, om) { return -(g / Leff) * Math.sin(th) - damping * om; };
          var k1_th = sim.omega;
          var k1_om = f_nonlin(sim.theta, sim.omega);
          var k2_th = sim.omega + 0.5 * stepDt * k1_om;
          var k2_om = f_nonlin(sim.theta + 0.5 * stepDt * k1_th, sim.omega + 0.5 * stepDt * k1_om);
          var k3_th = sim.omega + 0.5 * stepDt * k2_om;
          var k3_om = f_nonlin(sim.theta + 0.5 * stepDt * k2_th, sim.omega + 0.5 * stepDt * k2_om);
          var k4_th = sim.omega + stepDt * k3_om;
          var k4_om = f_nonlin(sim.theta + stepDt * k3_th, sim.omega + stepDt * k3_om);
          sim.theta += (stepDt / 6) * (k1_th + 2 * k2_th + 2 * k3_th + k4_th);
          sim.omega += (stepDt / 6) * (k1_om + 2 * k2_om + 2 * k3_om + k4_om);

          var a_lin = -(g / Leff) * sim.theta_lin - damping * sim.omega_lin;
          sim.omega_lin += a_lin * stepDt;
          sim.theta_lin += sim.omega_lin * stepDt;
          sim.t += stepDt;
        }
      }

      creamFill(ctx, width, height);
      lightGrid(ctx, width, height, 40);

      var ceilY = 22;
      drawCeiling(ctx, width, ceilY);

      var bobR = isRod ? 7 : 14;
      var pad = 18;
      var pivotX = width * 0.5;
      var pivotY = ceilY + 10;
      var maxArm = Math.min(pivotX - pad - bobR, width - pivotX - pad - bobR, height - pivotY - pad - bobR);
      var armLengthPx = Math.max(52, maxArm * (L / 2.5));
      sim.pivotPos = { x: pivotX, y: pivotY };

      ctx.save();
      ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.12);
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.arc(pivotX, pivotY, armLengthPx, Math.PI * 0.08, Math.PI - Math.PI * 0.08);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(pivotX, pivotY + armLengthPx + 8);
      ctx.stroke();
      ctx.restore();

      var ghostX = pivotX + armLengthPx * Math.sin(sim.theta_lin);
      var ghostY = pivotY + armLengthPx * Math.cos(sim.theta_lin);
      var bobX = pivotX + armLengthPx * Math.sin(sim.theta);
      var bobY = pivotY + armLengthPx * Math.cos(sim.theta);
      sim.bobScreenPos = { x: bobX, y: bobY, radius: isRod ? 22 : bobR };

      if (!sim.trail) sim.trail = [];
      if (!sim.isDragging) {
        sim.trail.push({ x: bobX, y: bobY });
        if (sim.trail.length > 56) sim.trail.shift();
      }
      if (sim.trail.length > 1) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        var ti;
        for (ti = 1; ti < sim.trail.length; ti++) {
          ctx.strokeStyle = 'rgba(204, 120, 92, ' + (ti / sim.trail.length) * 0.45 + ')';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(sim.trail[ti - 1].x, sim.trail[ti - 1].y);
          ctx.lineTo(sim.trail[ti].x, sim.trail[ti].y);
          ctx.stroke();
        }
        ctx.restore();
      }

      shaft(ctx, pivotX, pivotY, ghostX, ghostY, TEAL, isRod ? 5 : 1.8, [5, 4]);
      ctx.save();
      ctx.globalAlpha = 0.55;
      if (isRod) {
        ringDot(ctx, ghostX, ghostY, 4, TEAL, null);
      } else {
        ringDot(ctx, ghostX, ghostY, 9, TEAL, null);
      }
      ctx.restore();

      if (isRod) {
        ctx.save();
        ctx.translate(pivotX, pivotY);
        ctx.rotate(-sim.theta);
        ctx.fillStyle = 'rgba(204, 120, 92, 0.42)';
        ctx.strokeStyle = CORAL;
        ctx.lineWidth = 2;
        ctx.fillRect(-7, -6, 14, armLengthPx + 12);
        ctx.strokeRect(-7, -6, 14, armLengthPx + 12);
        ctx.restore();
        var cmX = pivotX + (armLengthPx * 0.5) * Math.sin(sim.theta);
        var cmY = pivotY + (armLengthPx * 0.5) * Math.cos(sim.theta);
        ringDot(ctx, cmX, cmY, 4, GOOD, CREAM);
        pill(ctx, 'CM', cmX + 12, cmY, GOOD, 'left');
      } else {
        shaft(ctx, pivotX, pivotY, bobX, bobY, PGRE.vizStageTheme().inkFade(0.55), 2);
        glowBob(ctx, bobX, bobY, bobR, CORAL, 'rgba(204, 120, 92, 0.4)');
        ctx.save();
        ctx.strokeStyle = DEEP;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(bobX, bobY, bobR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ringDot(ctx, pivotX, pivotY, 5, INK, CREAM);
      pill(ctx, 'pivot', pivotX + 12, pivotY + 1, MUTED, 'left');

      var arcR = Math.min(42, armLengthPx * 0.32);
      if (Math.abs(sim.theta) > 0.04) {
        ctx.save();
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        if (sim.theta >= 0) ctx.arc(pivotX, pivotY, arcR, Math.PI / 2, Math.PI / 2 + sim.theta, false);
        else ctx.arc(pivotX, pivotY, arcR, Math.PI / 2 + sim.theta, Math.PI / 2, false);
        ctx.stroke();
        ctx.restore();
        var mid = sim.theta / 2;
        pill(ctx, 'theta', pivotX + (arcR + 16) * Math.sin(mid), pivotY + (arcR + 16) * Math.cos(mid), GOLD, 'center');
      }

      var pct = isFinite(T_exact) ? Math.max(0, ((T_exact - T0) / T0) * 100) : Infinity;
      var tExactStr = isFinite(T_exact)
        ? ('$' + T_exact.toFixed(3) + '\\,\\mathrm{s}\\ (+' + pct.toFixed(1) + '\\%)$')
        : 'diverges ($\\theta_0\\to\\pi$)';
      vizLegend('Pendulum', [
        { label: 'Type', value: isRod ? 'Uniform rod,  $L_{\\mathrm{eff}}=2L/3$' : 'Simple pendulum,  $L_{\\mathrm{eff}}=L$' },
        { label: '$\\omega_0=\\sqrt{g/L_{\\mathrm{eff}}}$', value: latexNum(omega0, 2, '\\mathrm{rad/s}') },
        { label: '$T_0=2\\pi/\\omega_0$', value: latexNum(T0, 3, '\\mathrm{s}') },
        { label: '$T(\\theta_0)=(2/\\pi)K\\,T_0$', value: tExactStr },
        { label: 'Series $T_0(1+\\theta_0^2/16+\\cdots)$', value: latexNum(series, 3, '\\mathrm{s}') },
        { label: '$\\theta(t)$ exact / linear', value: '$' + ((sim.theta * 180) / Math.PI).toFixed(1) + '^\\circ$ / $' + ((sim.theta_lin * 180) / Math.PI).toFixed(1) + '^\\circ$' },
        { label: 'Traces', value: 'coral = $\\sin\\theta$;  teal dashed = linear $\\theta$' },
        { label: 'Drag', value: sim.isDragging ? 'setting release angle' : 'drag the bob to set $\\theta_0$' }
      ]);
    }
  };

  PGRE.visualizers['cpgf-1.24'] = {
    id: 'cpgf-1.24',
    topic: 'cm',
    title: 'Continuous Moment of Inertia & Mass Distribution',
    formulaLatex: 'I = \\int r^2 dm',
    physicalStory:
      'Moment of inertia is the rotational analogue of mass: $K_{\\mathrm{rot}}=\\frac12 I\\omega^2$ with $I=\\int r_\\perp^2\\,dm$. The $r_\\perp^2$ weight means mass far from the axis counts far more than mass near it — that is why a thin hoop ($I=MR^2$) resists spin more than a solid cylinder ($I=\\frac12 MR^2$) of the same $M$ and $R$. The $r$ in the integral is the perpendicular distance to the chosen axis, not the spherical radial coordinate. For a power-law rod $\\lambda\\propto x^n$ about $x=0$, $I=\\frac{n+1}{n+3}ML^2$.',
    derivationSteps: [
      {
        step: 1,
        latex: 'K_{\\text{rot}} = \\int \\frac{1}{2} v^2 dm = \\int \\frac{1}{2} (\\omega r_\\perp)^2 dm',
        explanation: 'Express the total kinetic energy of a rigid body rotating at angular velocity $\\omega$ about a fixed axis.'
      },
      {
        step: 2,
        latex: 'K_{\\text{rot}} = \\frac{1}{2} \\omega^2 \\int r_\\perp^2 dm \\equiv \\frac{1}{2} I \\omega^2',
        explanation: 'Factor out the constant angular velocity $\\omega$ to identify the moment of inertia integral $I$.'
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
      { id: 'massVal', label: 'Mass ($M$)', min: 0.5, max: 5.0, step: 0.1, default: 2.0, unit: 'kg' },
      { id: 'radVal', label: 'Radius / Length ($R$ or $L$)', min: 0.5, max: 3.0, step: 0.1, default: 1.5, unit: 'm' },
      { id: 'powerN', label: 'Density Exponent ($n$)', min: 0, max: 6, step: 1, default: 2, unit: 'power' },
      { id: 'numSlices', label: 'Integration Slices ($N$)', min: 4, max: 64, step: 4, default: 24, unit: 'elements' },
      { id: 'simSpeed', label: 'Simulation Speed', min: 0.2, max: 3.0, step: 0.2, default: 1.0, unit: 'x' }
    ],
    onParamChange: function (id, val, state) {
      if (id === 'shapeType' || id === 'radVal' || id === 'numSlices' || id === 'powerN') {
        state._trails = null;
      }
    },
    init: function (container, state, redraw) {
      state.shapeType = state.shapeType || 'Solid Disk / Cylinder';
      state.massVal = state.massVal !== undefined ? state.massVal : 2.0;
      state.radVal = state.radVal !== undefined ? state.radVal : 1.5;
      state.powerN = state.powerN !== undefined ? state.powerN : 2;
      state.numSlices = state.numSlices !== undefined ? state.numSlices : 24;
      if (state.simSpeed === undefined) state.simSpeed = 1.0;
      state.spin = state.spin || 0;
      state._trails = state._trails || null;
    },
    draw: function (ctx, width, height, state, dt) {
      state.shapeType = state.shapeType || 'Solid Disk / Cylinder';
      var M = numParam(state, 'massVal', 2.0);
      var R = numParam(state, 'radVal', 1.5);
      var N = Math.max(4, numParam(state, 'numSlices', 24) | 0);
      var nPow = Math.max(0, numParam(state, 'powerN', 2));
      var speed = simSpeedOf(state);
      var dtEff = safeDt(dt) * speed;

      var isDisk = state.shapeType === 'Solid Disk / Cylinder';
      var isHoop = state.shapeType === 'Thin Hoop / Ring';
      var isSphere = state.shapeType === 'Solid Sphere';
      var isRod = state.shapeType === 'Uniform Thin Rod';
      var isPowerRod = state.shapeType === 'Non-Uniform Power Rod (x^n)';

      var cFactor = 0.5;
      var formulaTex = '\\frac{1}{2} M R^2';
      var cLabel = '$c = I/(M R^2)$';
      var I_exact = 0.5 * M * R * R;
      var axisNote = 'axis through center, out of page';
      var dmTex = '$\\mathrm{d}m = 2\\pi r\\,\\mathrm{d}r\\,\\sigma$';

      if (isHoop) {
        cFactor = 1.0;
        formulaTex = 'M R^2';
        I_exact = M * R * R;
        dmTex = '$\\mathrm{d}m$ all at $r_\\perp = R$';
      } else if (isSphere) {
        cFactor = 0.4;
        formulaTex = '\\frac{2}{5} M R^2';
        I_exact = 0.4 * M * R * R;
        axisNote = 'diameter axis (vertical)';
        dmTex = '$r_\\perp = R\\sin\\vartheta$, not spherical $r$';
      } else if (isRod) {
        cFactor = 1 / 12;
        formulaTex = '\\frac{1}{12} M L^2';
        cLabel = '$c = I/(M L^2)$ about CM';
        I_exact = (1 / 12) * M * R * R;
        axisNote = 'axis through CM, out of page';
        dmTex = '$\\mathrm{d}m = \\lambda\\,\\mathrm{d}x$';
      } else if (isPowerRod) {
        cFactor = (nPow + 1) / (nPow + 3);
        formulaTex = '\\frac{' + nPow + '+1}{' + nPow + '+3} M L^2';
        cLabel = '$c = I/(M L^2)$ about $x=0$';
        I_exact = cFactor * M * R * R;
        axisNote = 'axis at x = 0 (light end)';
        dmTex = '$\\lambda(x)\\propto x^{' + nPow + '}$';
      }

      state.spin = (state.spin || 0) + 0.62 * dtEff;
      var phi = state.spin;

      creamFill(ctx, width, height);
      lightGrid(ctx, width, height, 40);

      var cx = width * 0.5;
      var cy = height * 0.52;
      var maxR = Math.min(width * 0.38, height * 0.38);
      var renderRad = Math.max(36, maxR * (R / 3.0));

      var tracers = [];
      var i;

      if (isSphere) {
        var grd = ctx.createRadialGradient(
          cx - renderRad * 0.28, cy - renderRad * 0.32, renderRad * 0.08,
          cx, cy, renderRad
        );
        grd.addColorStop(0, 'rgba(93, 184, 166, 0.58)');
        grd.addColorStop(1, 'rgba(93, 184, 166, 0.14)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(cx, cy, renderRad, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = TEAL;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.save();
        ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.16);
        ctx.lineWidth = 1;
        for (i = 1; i <= 4; i++) {
          var lat = (i / 5) * Math.PI;
          var ry = renderRad * Math.sin(lat);
          var yy = cy - renderRad * Math.cos(lat);
          ctx.beginPath();
          ctx.ellipse(cx, yy, Math.max(2, ry), Math.max(1.2, ry * 0.22), 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();

        shaft(ctx, cx, cy - renderRad - 14, cx, cy + renderRad + 14, INK, 1.4, [4, 4]);
        ringDot(ctx, cx, cy, 4, INK, CREAM);
        pill(ctx, 'axis', cx + 12, cy - renderRad - 8, INK, 'left');

        var thS = 1.05;
        var elX = cx + renderRad * Math.sin(thS) * Math.sin(phi);
        var elY = cy - renderRad * Math.cos(thS);
        var rPerp = Math.abs(elX - cx);
        shaft(ctx, cx, cy, elX, elY, MUTED, 1.5);
        shaft(ctx, cx, elY, elX, elY, CORAL, 2.2);
        glowBob(ctx, elX, elY, 5, GOLD, 'rgba(212, 160, 23, 0.4)');
        pill(ctx, 'r', (cx + elX) * 0.5 + 10, (cy + elY) * 0.5, MUTED, 'left');
        if (rPerp > 10) pill(ctx, 'r_perp', (cx + elX) * 0.5, elY + 14, CORAL, 'center');

        tracers = [
          { x: cx + renderRad * Math.sin(0.45) * Math.cos(phi), y: cy - renderRad * Math.cos(0.45) },
          { x: cx + renderRad * Math.sin(1.05) * Math.cos(phi), y: cy - renderRad * Math.cos(1.05) },
          { x: cx + renderRad * Math.sin(Math.PI / 2) * Math.cos(phi), y: cy }
        ];
      } else if (isDisk || isHoop) {
        if (isHoop) {
          var hoopThick = Math.max(10, renderRad * 0.13);
          ctx.fillStyle = 'rgba(204, 120, 92, 0.38)';
          ctx.strokeStyle = CORAL;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy, renderRad, 0, Math.PI * 2);
          ctx.arc(cx, cy, Math.max(4, renderRad - hoopThick), 0, Math.PI * 2, true);
          ctx.fill();
          ctx.stroke();
          var dAng = (2 * Math.PI) / Math.max(8, N);
          ctx.save();
          ctx.fillStyle = GOLD;
          ctx.beginPath();
          ctx.arc(cx, cy, renderRad, phi, phi + dAng);
          ctx.arc(cx, cy, Math.max(4, renderRad - hoopThick), phi + dAng, phi, true);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        } else {
          var dr = renderRad / N;
          for (i = 0; i < N; i++) {
            var rInner = i * dr;
            var rOuter = (i + 1) * dr;
            var rMid = (rInner + rOuter) * 0.5;
            var wgt = (rMid / renderRad) * (rMid / renderRad);
            ctx.fillStyle = 'rgba(93, 184, 166, ' + (0.08 + 0.72 * wgt) + ')';
            ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.08);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(cx, cy, rOuter, 0, Math.PI * 2);
            if (rInner > 0) ctx.arc(cx, cy, rInner, 0, Math.PI * 2, true);
            ctx.fill();
            ctx.stroke();
          }
          var hi = Math.min(N - 1, Math.max(0, Math.floor(N * (0.55 + 0.35 * Math.sin(phi)))));
          ctx.save();
          ctx.strokeStyle = GOLD;
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.arc(cx, cy, (hi + 0.5) * dr, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        shaft(ctx, cx, cy, cx + renderRad * Math.cos(phi), cy + renderRad * Math.sin(phi), CORAL, 2);
        ringDot(ctx, cx, cy, 4, INK, CREAM);
        pill(ctx, 'R', cx + renderRad * 0.55 * Math.cos(phi + 0.4), cy + renderRad * 0.55 * Math.sin(phi + 0.4), CORAL, 'center');

        if (isHoop) {
          tracers = [
            { x: cx + renderRad * Math.cos(phi), y: cy + renderRad * Math.sin(phi) },
            { x: cx + renderRad * Math.cos(phi + 2.1), y: cy + renderRad * Math.sin(phi + 2.1) },
            { x: cx + renderRad * Math.cos(phi + 4.2), y: cy + renderRad * Math.sin(phi + 4.2) }
          ];
        } else {
          tracers = [0.35, 0.65, 1.0].map(function (f) {
            return { x: cx + renderRad * f * Math.cos(phi), y: cy + renderRad * f * Math.sin(phi) };
          });
        }
      } else {
        var rodLenPx = Math.min(width - 56, renderRad * 2.55);
        var rodThick = 28;
        var rodStartX = isPowerRod ? (cx - rodLenPx * 0.42) : (cx - rodLenPx * 0.5);
        var rodY = cy - rodThick * 0.5;
        var dx = rodLenPx / N;
        var axisX = isRod ? cx : rodStartX;

        ctx.save();
        ctx.translate(axisX, cy);
        ctx.rotate(isPowerRod || isRod ? phi * 0.35 : 0);
        ctx.translate(-axisX, -cy);
        for (i = 0; i < N; i++) {
          var xFrac = (i + 0.5) / N;
          var xPos = rodStartX + i * dx;
          var dens = isRod ? 0.55 : Math.pow(xFrac, nPow);
          var rW = isRod ? Math.abs(xFrac - 0.5) * 2 : xFrac;
          var alpha = 0.16 + 0.78 * dens * (0.35 + 0.65 * rW * rW);
          ctx.fillStyle = 'rgba(204, 120, 92, ' + alpha + ')';
          ctx.fillRect(xPos, rodY, Math.max(1, dx - 1), rodThick);
          ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.10);
          ctx.strokeRect(xPos, rodY, Math.max(1, dx - 1), rodThick);
        }
        var goldI = isRod ? Math.floor(N * 0.78) : Math.floor(N * 0.82);
        ctx.fillStyle = GOLD;
        ctx.fillRect(rodStartX + goldI * dx, rodY, Math.max(1, dx - 1), rodThick);
        ctx.restore();

        ringDot(ctx, axisX, cy, 5, INK, CREAM);
        pill(ctx, isRod ? 'CM axis' : 'axis x=0', axisX + 10, cy - rodThick * 0.5 - 12, INK, 'left');

        var rEnds = isRod
          ? [0.15, 0.5, 0.85]
          : [0.25, 0.55, 0.92];
        tracers = rEnds.map(function (f) {
          var px = rodStartX + f * rodLenPx - axisX;
          var py = 0;
          var cosp = Math.cos(phi * 0.35);
          var sinp = Math.sin(phi * 0.35);
          return { x: axisX + px * cosp - py * sinp, y: cy + px * sinp + py * cosp };
        });
      }

      if (!state._trails || state._trails.length !== tracers.length) {
        state._trails = tracers.map(function () { return []; });
      }
      for (i = 0; i < tracers.length; i++) {
        state._trails[i].push(tracers[i]);
        if (state._trails[i].length > 22) state._trails[i].shift();
      }
      ctx.save();
      ctx.lineCap = 'round';
      for (i = 0; i < state._trails.length; i++) {
        var tr = state._trails[i];
        var k;
        for (k = 1; k < tr.length; k++) {
          ctx.strokeStyle = 'rgba(212, 160, 23, ' + (k / tr.length) * 0.7 + ')';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(tr[k - 1].x, tr[k - 1].y);
          ctx.lineTo(tr[k].x, tr[k].y);
          ctx.stroke();
        }
      }
      ctx.restore();
      for (i = 0; i < tracers.length; i++) {
        ringDot(ctx, tracers[i].x, tracers[i].y, 3.5, GOLD, CREAM);
      }

      pill(ctx, axisNote, 14, height - 16, MUTED, 'left');

      vizLegend('Continuous $I$', [
        { label: 'Geometry', value: state.shapeType },
        { label: '$I = \\int r_\\perp^2\\,\\mathrm{d}m$', value: latexNum(I_exact, 3, '\\mathrm{kg\\,m}^2') },
        { label: 'Formula', value: '$I = ' + formulaTex + '$' },
        { label: cLabel, value: '$' + cFactor.toFixed(3) + '$' },
        { label: '$\\mathrm{d}m$', value: dmTex },
        { label: 'Paint', value: isDisk ? 'ring opacity $\\propto r^2$' : (isPowerRod ? 'opacity $\\propto \\lambda(x)\\,x^2$' : 'gold tracers: $v=\\omega r_\\perp$') },
        { label: 'Slices $N$', value: '$' + N + '$' }
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
    topic: 'cm',
    title: 'Parallel-Axis (Steiner) Theorem & Physical Pendulum',
    formulaLatex: 'I = I_{\\text{CM}} + M d^2',
    physicalStory:
      'Steiner\'s theorem: the moment of inertia about any axis parallel to one through the center of mass is $I_P = I_{\\mathrm{CM}} + Md^2$. Equivalently $k_P^2 = k_g^2 + d^2$, a right triangle whose legs are the radius of gyration $k_g=\\sqrt{I_{\\mathrm{CM}}/M}$ and the shift $d$. $I_{\\mathrm{CM}}$ is the minimum for that axis direction. The extra $Md^2$ is the CM treated as a point mass orbiting the new axis. For a physical pendulum, $T=2\\pi\\sqrt{I_P/(Mgd)}$ is smallest at $d=k_g$.',
    derivationSteps: [
      {
        step: 1,
        latex: '\\mathbf{r} = \\mathbf{r}_{\\text{CM}} + \\mathbf{r}\'',
        explanation: 'Set up coordinates relative to the Center of Mass, such that $\\int \\mathbf{r}\' dm = \\mathbf{0}$.'
      },
      {
        step: 2,
        latex: 'I_P = \\int |\\mathbf{r}\' - \\mathbf{d}|^2 dm = \\int (r\'^2 - 2\\mathbf{r}\' \\cdot \\mathbf{d} + d^2) dm',
        explanation: 'Expand the squared perpendicular distance from a new parallel axis shifted by vector $\\mathbf{d}$.'
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
        fix: 'The formula $I = I_0 + Md^2$ is only valid if $I_0$ is about the center of mass. You cannot do $I_B = I_A + M d_{AB}^2$. Shift back to CM first: $I_{\\mathrm{CM}} = I_A - M d_A^2$, then $I_B = I_{\\mathrm{CM}} + M d_B^2$.'
      },
      {
        trap: 'Assuming a shorter pendulum always swings faster',
        fix: 'In a physical pendulum, shortening the pivot distance $d$ towards the CM makes $T = 2\\pi\\sqrt{I_p/(Mgd)}$ diverge to infinity because the restoring torque $Mgd$ vanishes faster than the inertia $I_p$.'
      }
    ],
    parameters: [
      { id: 'bodyShape', label: 'Body Geometry', type: 'select', options: ['Uniform Thin Rod (L)', 'Solid Disk (R)', 'Hollow Ring (R)'], default: 'Uniform Thin Rod (L)' },
      { id: 'bodyMass', label: 'Mass ($M$)', min: 0.5, max: 4.0, step: 0.1, default: 1.5, unit: 'kg' },
      { id: 'bodyDim', label: 'Size ($L$ or $R$)', min: 0.5, max: 2.5, step: 0.1, default: 1.2, unit: 'm' },
      { id: 'pivotShift', label: 'Shift Distance ($d$)', min: 0, max: 2.5, step: 0.02, default: 0.35, unit: 'm' },
      { id: 'paused', label: 'Pause rotation', type: 'toggle', default: false },
      { id: 'simSpeed', label: 'Simulation Speed', min: 0.2, max: 3.0, step: 0.2, default: 1.0, unit: 'x' }
    ],
    onParamChange: function (id, val, state) {
      if (id === 'bodyShape' || id === 'bodyDim') {
        state.spin = 0;
      }
    },
    init: function (container, state, redraw) {
      state.bodyShape = state.bodyShape || 'Uniform Thin Rod (L)';
      state.bodyMass = state.bodyMass !== undefined ? state.bodyMass : 1.5;
      state.bodyDim = state.bodyDim !== undefined ? state.bodyDim : 1.2;
      state.pivotShift = state.pivotShift !== undefined ? state.pivotShift : 0.35;
      state.paused = !!state.paused;
      if (state.simSpeed === undefined) state.simSpeed = 1.0;
      state.spin = state.spin || 0;
    },
    draw: function (ctx, width, height, state, dt) {
      var M = numParam(state, 'bodyMass', 1.5);
      var L = Math.max(0.2, numParam(state, 'bodyDim', 1.2));
      var d = Math.max(0, numParam(state, 'pivotShift', 0.35));
      var speed = simSpeedOf(state);
      var dtEff = safeDt(dt) * speed;
      state.bodyShape = state.bodyShape || 'Uniform Thin Rod (L)';
      var isRodBody = state.bodyShape === 'Uniform Thin Rod (L)';
      var isDiskBody = state.bodyShape === 'Solid Disk (R)';
      var isRingBody = state.bodyShape === 'Hollow Ring (R)';
      var paused = isOn(state.paused, false);

      var I_cm = (1 / 12) * M * L * L;
      if (isDiskBody) I_cm = 0.5 * M * L * L;
      else if (isRingBody) I_cm = M * L * L;

      var I_p = I_cm + M * d * d;
      var k_g = Math.sqrt(Math.max(0, I_cm / M));
      var k_p = Math.sqrt(k_g * k_g + d * d);
      var g = 9.81;
      var curT = (d > 0.01) ? 2 * Math.PI * Math.sqrt(I_p / (M * g * d)) : Infinity;
      var minT = 2 * Math.PI * Math.sqrt((2 * k_g) / g);

      if (!paused) state.spin = (state.spin || 0) + 0.55 * dtEff;
      var ang = state.spin || 0;

      creamFill(ctx, width, height);
      lightGrid(ctx, width, height, 40);

      var halfBody = isRodBody ? L * 0.5 : L;
      var need = d + halfBody + 0.08;
      var padFit = 40;
      var scale = Math.min(width - 2 * padFit, height - 2 * padFit) * 0.48 / Math.max(need, 0.4);
      var px = width * 0.50;
      var py = height * 0.50;

      var cmx = px + d * scale * Math.sin(ang);
      var cmy = py + d * scale * Math.cos(ang);
      var kgPx = k_g * scale;
      var dPx = d * scale;

      var vx = cmx - px;
      var vy = cmy - py;
      var vlen = Math.hypot(vx, vy) || 1;
      var ux = vx / vlen;
      var uy = vy / vlen;
      var gx = cmx - uy * kgPx;
      var gy = cmy + ux * kgPx;

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(-ang);

      if (isRodBody) {
        var rodLenPx = L * scale;
        var rodTop = dPx - rodLenPx * 0.5;
        ctx.fillStyle = 'rgba(204, 120, 92, 0.28)';
        ctx.strokeStyle = CORAL;
        ctx.lineWidth = 2;
        ctx.fillRect(-8, rodTop, 16, rodLenPx);
        ctx.strokeRect(-8, rodTop, 16, rodLenPx);
      } else {
        var diskRadPx = L * scale;
        ctx.strokeStyle = CORAL;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(0, dPx, diskRadPx, 0, Math.PI * 2);
        if (isRingBody) {
          ctx.stroke();
          ctx.lineWidth = 8;
          ctx.globalAlpha = 0.35;
          ctx.stroke();
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = 'rgba(204, 120, 92, 0.22)';
          ctx.fill();
          ctx.stroke();
        }
      }
      ctx.restore();

      if (kgPx > 8) {
        ctx.save();
        ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.22);
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.arc(cmx, cmy, kgPx, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (dPx > 6) {
        ctx.save();
        ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.16);
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(px, py, dPx, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.fillStyle = 'rgba(212, 160, 23, 0.14)';
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(cmx, cmy);
      ctx.lineTo(gx, gy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      shaft(ctx, px, py, cmx, cmy, GOLD, 2.4);
      shaft(ctx, cmx, cmy, gx, gy, TEAL, 2.2);
      shaft(ctx, px, py, gx, gy, CORAL, 2.2);

      ringDot(ctx, px, py, 6, INK, CREAM);
      ringDot(ctx, cmx, cmy, 6, GOOD, CREAM);
      ringDot(ctx, gx, gy, 5, GOLD, CREAM);

      pill(ctx, 'P', px + 12, py - 2, INK, 'left');
      if (dPx > 14) {
        var cmAlign = cmx > width * 0.58 ? 'right' : 'left';
        pill(ctx, 'CM', cmAlign === 'right' ? cmx - 12 : cmx + 12, cmy, GOOD, cmAlign);
        var mx = (px + cmx) / 2;
        var my = (py + cmy) / 2;
        var lx = mx - uy * 14;
        var ly = my + ux * 14;
        lx = Math.max(18, Math.min(width - 18, lx));
        ly = Math.max(16, Math.min(height - 14, ly));
        pill(ctx, 'd', lx, ly, GOLD, 'center');
      } else {
        pill(ctx, 'P = CM', px + 12, py + 16, INK, 'left');
      }
      if (kgPx > 16) {
        pill(ctx, 'k_g', (cmx + gx) / 2 + 10, (cmy + gy) / 2, TEAL, 'left');
      }
      if (Math.hypot(gx - px, gy - py) > 28 && dPx > 12) {
        pill(ctx, 'k_P', (px + gx) / 2 - 8, (py + gy) / 2 - 10, CORAL, 'center');
      }

      vizLegend('Parallel-axis theorem', [
        { label: 'Body', value: state.bodyShape },
        { label: '$I_{\\mathrm{CM}}$', value: latexNum(I_cm, 3, '\\mathrm{kg\\,m}^2') },
        { label: '$Md^2$', value: latexNum(M * d * d, 3, '\\mathrm{kg\\,m}^2') },
        { label: '$I_P = I_{\\mathrm{CM}} + Md^2$', value: latexNum(I_p, 3, '\\mathrm{kg\\,m}^2') },
        { label: '$k_g,\\ d,\\ k_P$', value: '$' + k_g.toFixed(3) + ',\\ ' + d.toFixed(2) + ',\\ ' + k_p.toFixed(3) + '\\,\\mathrm{m}$' },
        { label: '$k_P^2 = k_g^2 + d^2$', value: latexNum(k_p * k_p, 3, '\\mathrm{m}^2') },
        { label: '$T(d)$ physical pendulum', value: isFinite(curT) ? latexNum(curT, 2, '\\mathrm{s}') : 'infinite ($d = 0$)' },
        { label: '$T_{\\min}$ at $d = k_g$', value: latexNum(minT, 2, '\\mathrm{s}') }
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

  /* -------------------------------------------------------------------------- */
  /* cpgf-1.48: Physical pendulum small-oscillation ω = √(mgR/I)                 */
  /* -------------------------------------------------------------------------- */
  PGRE.visualizers['cpgf-1.48'] = {
    id: 'cpgf-1.48',
    topic: 'cm',
    title: 'Physical Pendulum Small Oscillations: $\\omega = \\sqrt{mgR/I}$',
    formulaLatex: '$$\\omega = \\sqrt{\\frac{mgR}{I}}$$',
    physicalStory:
      'A physical pendulum is a rigid body swinging about a fixed pivot. Gravity acts at the center of mass, a distance $R$ from the pivot, so the restoring torque is $\\tau = -mgR\\sin\\theta$. Rotational Newton $I\\ddot{\\theta}=\\tau$ with $I$ taken about the pivot (not the CM) yields $\\ddot{\\theta}+(mgR/I)\\sin\\theta=0$. Small angles $\\sin\\theta\\approx\\theta$ give the card, $\\omega=\\sqrt{mgR/I}$. Parallel-axis forbids $I\\le mR^2$ for a real body: $I=I_{\\mathrm{CM}}+mR^2$ and $L_{\\mathrm{eff}}=I/(mR)>R$. The teal ghost is the linear $\\theta$ model; coral is exact $\\sin\\theta$ — the GRE trap $\\sin\\theta\\approx\\theta$ is visible at large amplitude.',
    derivationSteps: [
      {
        step: 1,
        title: 'Torque about the pivot',
        formula: '\\tau = -mgR\\sin\\theta',
        text: 'Gravity acts at the center of mass. The lever arm is $R\\sin\\theta$, so the restoring torque is $-mgR\\sin\\theta$. $R$ is pivot-to-CM, not a rod length.'
      },
      {
        step: 2,
        title: 'Rotational Newton law',
        formula: 'I\\ddot{\\theta} = -mgR\\sin\\theta \\implies \\ddot{\\theta} + \\frac{mgR}{I}\\sin\\theta = 0',
        text: '$I$ is the moment of inertia about the pivot. An extended body is not a simple pendulum of length $R$: $I = I_{\\mathrm{CM}} + mR^2 > mR^2$.'
      },
      {
        step: 3,
        title: 'Small-angle frequency',
        formula: '\\sin\\theta \\approx \\theta \\implies \\omega = \\sqrt{\\frac{mgR}{I}},\\quad T = 2\\pi\\sqrt{\\frac{I}{mgR}}',
        text: 'This is the GRE card. The exact motion keeps $\\sin\\theta$, so large amplitudes run slow — same anharmonic trap as the simple pendulum.'
      },
      {
        step: 4,
        title: 'Effective simple-pendulum length',
        formula: 'L_{\\mathrm{eff}} = \\frac{I}{mR} = R + \\frac{I_{\\mathrm{CM}}}{mR},\\quad \\omega = \\sqrt{\\frac{g}{L_{\\mathrm{eff}}}}',
        text: 'A physical body always has $\\kappa = I/(mR^2) > 1$, hence $L_{\\mathrm{eff}} > R$ and a slower $\\omega$ than $\\sqrt{g/R}$.'
      }
    ],
    limitingCases: [
      {
        name: 'Point-mass (simple) limit',
        condition: 'I \\to mR^2',
        result: '\\omega \\to \\sqrt{g/R}',
        explanation: 'All mass sits at the CM. Recovers a simple pendulum of length $R$. A real body always has $I > mR^2$, so it always runs slower than this bound.'
      },
      {
        name: 'Uniform rod, end pivot',
        condition: 'I = \\tfrac{1}{3}mL^2,\\; R = L/2',
        result: '\\omega = \\sqrt{3g/(2L)} = \\sqrt{3g/(4R)}',
        explanation: '$L_{\\mathrm{eff}} = 2L/3$. Faster than a simple pendulum of length $L$, slower than one of length $R$.'
      },
      {
        name: 'Disk pivoted at the rim',
        condition: 'I = \\tfrac{3}{2}mR^2',
        result: '\\omega = \\sqrt{2g/(3R)}',
        explanation: 'Parallel-axis: $I_{\\mathrm{CM}} = \\tfrac{1}{2}mR^2$ plus $mR^2$.'
      },
      {
        name: 'Large amplitude',
        condition: '\\theta_0 \\not\\ll 1',
        result: 'T > 2\\pi/\\omega',
        explanation: '$\\sin\\theta < \\theta$ weakens the restoring torque. The card formula is the small-angle $\\omega$ only. Coral (exact) lags the teal linear ghost.'
      }
    ],
    greTraps: [
      {
        trap: 'Using $I_{\\mathrm{CM}}$ in the frequency',
        warning: 'Writing $\\omega=\\sqrt{mgR/I_{\\mathrm{CM}}}$ instead of the pivot inertia.',
        strategy: '$I$ in $\\omega=\\sqrt{mgR/I}$ is about the pivot. Always $I_{\\mathrm{pivot}} = I_{\\mathrm{CM}} + mR^2$.'
      },
      {
        trap: 'Treating it as a simple pendulum of length $R$',
        warning: 'Using $\\omega=\\sqrt{g/R}$ for an extended body.',
        strategy: 'That is the $\\kappa=1$ bound. Real bodies have $L_{\\mathrm{eff}} = I/(mR) > R$, so they oscillate slower.'
      },
      {
        trap: 'Small-angle formula at large $\\theta_0$',
        warning: 'Plugging $60^\\circ$ into $T=2\\pi\\sqrt{I/(mgR)}$ and expecting the lab period.',
        strategy: 'The exact equation is $\\ddot{\\theta}=-(mgR/I)\\sin\\theta$. Coral (exact) lags the teal linear ghost as amplitude grows.'
      }
    ],
    parameters: [
      { id: 'm', label: 'Mass ($m$)', min: 0.2, max: 4.0, step: 0.1, default: 1.0, unit: 'kg' },
      { id: 'I', label: 'Inertia about pivot ($I$)', min: 0.05, max: 8.0, step: 0.05, default: 0.40, unit: 'kg m²' },
      { id: 'R', label: 'Pivot to CM ($R$)', min: 0.15, max: 1.20, step: 0.05, default: 0.50, unit: 'm' },
      { id: 'g', label: 'Gravity ($g$)', min: 1.0, max: 25.0, step: 0.1, default: 9.8, unit: 'm/s²' },
      { id: 'theta0_deg', label: 'Initial Angle ($\\theta_0$)', min: 5, max: 170, step: 5, default: 30, unit: 'deg' },
      { id: 'damping', label: 'Damping ($\\gamma$)', min: 0.0, max: 0.2, step: 0.01, default: 0.0, unit: 's⁻¹' },
      { id: 'simSpeed', label: 'Simulation Speed', min: 0.2, max: 3.0, step: 0.2, default: 1.0, unit: 'x' }
    ],
    challenge: {
      question:
        'A rigid body of mass $m$ is pivoted a distance $R$ from its center of mass. Its moment of inertia about the pivot is $I$. What is the angular frequency of small oscillations?',
      options: [
        'A) $\\sqrt{g/R}$',
        'B) $\\sqrt{mgR/I}$',
        'C) $\\sqrt{I/(mgR)}$',
        'D) $\\sqrt{mg/I}$',
        'E) $\\sqrt{gI/(mR^3)}$'
      ],
      correct: 1,
      explanation:
        'Torque about the pivot is $\\tau=-mgR\\sin\\theta$. Rotational Newton gives $I\\ddot{\\theta}=-mgR\\sin\\theta$. For small angles $\\sin\\theta\\approx\\theta$, so $\\ddot{\\theta}+(mgR/I)\\theta=0$ and $\\omega=\\sqrt{mgR/I}$. Option A is the simple-pendulum bound $I=mR^2$; a real body has $I>mR^2$ and runs slower. Option C is $1/\\omega$. $I$ is about the pivot, not the CM.'
    },

    init: function (container, state, redraw) {
      state = state || {};
      state.m = state.m !== undefined ? state.m : 1.0;
      state.I = state.I !== undefined ? state.I : 0.40;
      state.R = state.R !== undefined ? state.R : 0.50;
      state.g = state.g !== undefined ? state.g : 9.8;
      state.theta0_deg = state.theta0_deg !== undefined ? state.theta0_deg : 30;
      state.damping = state.damping !== undefined ? state.damping : 0.0;
      if (state.simSpeed === undefined) state.simSpeed = 1.0;

      var initRad = (Number(state.theta0_deg) * Math.PI) / 180;
      state.sim = {
        theta: initRad,
        omega: 0.0,
        theta_lin: initRad,
        omega_lin: 0.0,
        t: 0.0,
        isDragging: false,
        trail: [],
        amp: Math.abs(initRad)
      };

      var canvas = findVizCanvas(container);
      if (canvas && !canvas._cpgf148_bound) {
        canvas._cpgf148_bound = true;

        var getPos = function (e) {
          var rect = canvas.getBoundingClientRect();
          var t = (e.touches && e.touches.length > 0) ? e.touches[0] :
                    ((e.changedTouches && e.changedTouches.length > 0) ? e.changedTouches[0] : null);
          var clientX = t ? t.clientX : e.clientX;
          var clientY = t ? t.clientY : e.clientY;
          return { x: clientX - rect.left, y: clientY - rect.top };
        };

        var onDown = function (e) {
          var pos = getPos(e);
          var bob = state.sim.bobScreenPos;
          if (bob && Math.hypot(pos.x - bob.x, pos.y - bob.y) < bob.radius * 2.2) {
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
            state.sim.trail = [];
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
          if (window._cpgf148_move) {
            window.removeEventListener('mousemove', window._cpgf148_move);
            window.removeEventListener('mouseup', window._cpgf148_up);
            window.removeEventListener('touchmove', window._cpgf148_move);
            window.removeEventListener('touchend', window._cpgf148_up);
          }
          window._cpgf148_move = onMove;
          window._cpgf148_up = onUp;
          window.addEventListener('mousemove', onMove);
          window.addEventListener('mouseup', onUp);
          window.addEventListener('touchmove', onMove, { passive: false });
          window.addEventListener('touchend', onUp);
        }
      }
    },

    draw: function (ctx, width, height, state, dt) {
      state = state || {};
      if (!state.sim) this.init(null, state);
      var sim = state.sim;

      var m = Math.max(0.2, numParam(state, 'm', 1.0));
      var R = Math.max(0.15, numParam(state, 'R', 0.50));
      var Iraw = Math.max(0.01, numParam(state, 'I', 0.40));
      var g = Math.max(0.5, numParam(state, 'g', 9.8));
      var damping = Math.max(0.0, numParam(state, 'damping', 0.0));
      var speed = simSpeedOf(state);
      var theta0deg = numParam(state, 'theta0_deg', 30);

      var mR2 = m * R * R;
      var Imin = mR2 * 1.02;
      var I = Iraw < Imin ? Imin : Iraw;
      var clamped = I > Iraw + 1e-12;

      var sig = m + '|' + Iraw + '|' + R + '|' + g + '|' + theta0deg;
      if (sim.lastSig !== undefined && sim.lastSig !== sig && !sim.isDragging) {
        var initRad = (theta0deg * Math.PI) / 180;
        sim.theta = initRad;
        sim.theta_lin = initRad;
        sim.omega = 0.0;
        sim.omega_lin = 0.0;
        sim.t = 0.0;
        sim.amp = Math.abs(initRad);
        sim.trail = [];
      }
      sim.lastSig = sig;
      if (sim.amp === undefined) sim.amp = Math.abs(sim.theta);

      var omega0sq = (m * g * R) / I;
      var omega0 = Math.sqrt(omega0sq);
      var T0 = (2 * Math.PI) / omega0;
      var Leff = I / (m * R);
      var kappa = I / mR2;

      var dtEff = safeDt(dt) * speed;
      if (dtEff > 0.12) dtEff = 0.12;
      var subSteps = 10;
      var stepDt = dtEff / subSteps;
      var s;

      if (!sim.isDragging) {
        for (s = 0; s < subSteps; s++) {
          var f_nonlin = function (th, om) { return -omega0sq * Math.sin(th) - damping * om; };
          var k1_th = sim.omega;
          var k1_om = f_nonlin(sim.theta, sim.omega);
          var k2_th = sim.omega + 0.5 * stepDt * k1_om;
          var k2_om = f_nonlin(sim.theta + 0.5 * stepDt * k1_th, sim.omega + 0.5 * stepDt * k1_om);
          var k3_th = sim.omega + 0.5 * stepDt * k2_om;
          var k3_om = f_nonlin(sim.theta + 0.5 * stepDt * k2_th, sim.omega + 0.5 * stepDt * k2_om);
          var k4_th = sim.omega + stepDt * k3_om;
          var k4_om = f_nonlin(sim.theta + stepDt * k3_th, sim.omega + stepDt * k3_om);
          sim.theta += (stepDt / 6) * (k1_th + 2 * k2_th + 2 * k3_th + k4_th);
          sim.omega += (stepDt / 6) * (k1_om + 2 * k2_om + 2 * k3_om + k4_om);

          var a_lin = -omega0sq * sim.theta_lin - damping * sim.omega_lin;
          sim.omega_lin += a_lin * stepDt;
          sim.theta_lin += sim.omega_lin * stepDt;
          sim.t += stepDt;
        }
      }

      creamFill(ctx, width, height);
      lightGrid(ctx, width, height, 40);

      var ceilY = 22;
      drawCeiling(ctx, width, ceilY);

      var pad = 18;
      var bodyW = Math.max(10, Math.min(18, 8 + 3 * m));
      var pivotX = width * 0.5;
      var pivotY = ceilY + 10;
      var maxArm = Math.min(pivotX - pad - bodyW, width - pivotX - pad - bodyW, height - pivotY - pad - 24);
      var armLengthPx = Math.max(52, maxArm * (R / 1.20));
      sim.pivotPos = { x: pivotX, y: pivotY };

      var kg = Math.sqrt(Math.max(I / m - R * R, 0));
      var halfBody = Math.max(14, armLengthPx * (kg / Math.max(R, 0.05)) * Math.sqrt(3));
      var maxHalf = Math.max(14, height - pivotY - armLengthPx - 16);
      if (halfBody > maxHalf) halfBody = maxHalf;
      if (halfBody > armLengthPx * 0.92) halfBody = armLengthPx * 0.92;
      var maxReach = Math.min(pivotX - pad, width - pivotX - pad, height - pivotY - pad);
      if (armLengthPx + halfBody > maxReach) {
        var fitScale = maxReach / (armLengthPx + halfBody);
        armLengthPx *= fitScale;
        halfBody *= fitScale;
      }

      ctx.save();
      ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.12);
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.arc(pivotX, pivotY, armLengthPx, Math.PI * 0.08, Math.PI - Math.PI * 0.08);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(pivotX, pivotY + armLengthPx + 8);
      ctx.stroke();
      ctx.restore();

      var ghostX = pivotX + armLengthPx * Math.sin(sim.theta_lin);
      var ghostY = pivotY + armLengthPx * Math.cos(sim.theta_lin);
      var cmX = pivotX + armLengthPx * Math.sin(sim.theta);
      var cmY = pivotY + armLengthPx * Math.cos(sim.theta);
      sim.bobScreenPos = { x: cmX, y: cmY, radius: Math.max(22, halfBody * 0.45) };

      if (!sim.trail) sim.trail = [];
      if (!sim.isDragging) {
        sim.trail.push({ x: cmX, y: cmY });
        if (sim.trail.length > 56) sim.trail.shift();
      }
      if (sim.trail.length > 1) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        var ti;
        for (ti = 1; ti < sim.trail.length; ti++) {
          ctx.strokeStyle = 'rgba(204, 120, 92, ' + (ti / sim.trail.length) * 0.45 + ')';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(sim.trail[ti - 1].x, sim.trail[ti - 1].y);
          ctx.lineTo(sim.trail[ti].x, sim.trail[ti].y);
          ctx.stroke();
        }
        ctx.restore();
      }

      shaft(ctx, pivotX, pivotY, ghostX, ghostY, TEAL, 1.8, [5, 4]);
      ctx.save();
      ctx.globalAlpha = 0.40;
      ctx.translate(pivotX, pivotY);
      ctx.rotate(-sim.theta_lin);
      ctx.strokeStyle = TEAL;
      ctx.lineWidth = 2;
      ctx.strokeRect(-bodyW / 2, Math.max(4, armLengthPx - halfBody), bodyW, 2 * halfBody);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = 0.55;
      ringDot(ctx, ghostX, ghostY, 4, TEAL, null);
      ctx.restore();

      ctx.save();
      ctx.translate(pivotX, pivotY);
      ctx.rotate(-sim.theta);
      ctx.fillStyle = 'rgba(204, 120, 92, 0.42)';
      ctx.strokeStyle = CORAL;
      ctx.lineWidth = 2;
      ctx.fillRect(-bodyW / 2, Math.max(4, armLengthPx - halfBody), bodyW, 2 * halfBody);
      ctx.strokeRect(-bodyW / 2, Math.max(4, armLengthPx - halfBody), bodyW, 2 * halfBody);
      ctx.restore();

      ringDot(ctx, cmX, cmY, 5, GOOD, CREAM);
      pill(ctx, 'CM', cmX + 12, cmY, GOOD, 'left');

      ringDot(ctx, pivotX, pivotY, 5, INK, CREAM);
      pill(ctx, 'pivot', pivotX + 12, pivotY + 1, MUTED, 'left');

      var arcR = Math.min(42, armLengthPx * 0.32);
      if (Math.abs(sim.theta) > 0.04) {
        ctx.save();
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        if (sim.theta >= 0) ctx.arc(pivotX, pivotY, arcR, Math.PI / 2, Math.PI / 2 + sim.theta, false);
        else ctx.arc(pivotX, pivotY, arcR, Math.PI / 2 + sim.theta, Math.PI / 2, false);
        ctx.stroke();
        ctx.restore();
        var mid = sim.theta / 2;
        pill(ctx, 'theta', pivotX + (arcR + 16) * Math.sin(mid), pivotY + (arcR + 16) * Math.cos(mid), GOLD, 'center');
      }

      var iVal = latexNum(I, 3, '\\mathrm{kg\\,m}^2');
      var iMinVal = latexNum(mR2, 3, '\\mathrm{kg\\,m}^2');
      vizLegend('Physical pendulum', [
        { label: '$\\omega=\\sqrt{mgR/I}$', value: latexNum(omega0, 2, '\\mathrm{rad/s}') },
        { label: '$T=2\\pi/\\omega$', value: latexNum(T0, 3, '\\mathrm{s}') },
        { label: '$L_{\\mathrm{eff}}=I/(mR)$', value: latexNum(Leff, 3, '\\mathrm{m}') },
        { label: '$I$ vs $mR^2$', value: iVal + ' / ' + iMinVal + (clamped ? ' (clamped $I>mR^2$)' : '') },
        { label: '$\\kappa=I/(mR^2)$', value: latexNum(kappa, 2) },
        { label: '$\\theta(t)$ exact / linear', value: '$' + ((sim.theta * 180) / Math.PI).toFixed(1) + '^\\circ$ / $' + ((sim.theta_lin * 180) / Math.PI).toFixed(1) + '^\\circ$' },
        { label: 'Traces', value: 'coral = $\\sin\\theta$;  teal dashed = linear $\\theta$' },
        { label: 'Drag', value: sim.isDragging ? 'setting release angle' : 'drag the body to set $\\theta_0$' }
      ]);
    }
  };

})(typeof window !== 'undefined' ? window : globalThis);
