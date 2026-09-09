/* Formula visualizers — G10 free particle / relativistic KE / decay */
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

  var CREAM = '#faf9f5';
  var PANEL = '#f5f0e8';
  var LINE = '#e6dfd8';
  var INK = '#141413';
  var MUTED = '#6c6a64';
  var CORAL = '#cc785c';
  var CORAL_DEEP = '#964b32';
  var GOLD = '#d4a017';
  var TEAL = '#5db8a6';
  var AXIS = '#8e8b82';
  var ROSE = '#e05666';
  var GRID = 'rgba(20, 20, 19, 0.08)';
  var SANS = '11px Inter, -apple-system, sans-serif';
  var SANS_B = '600 11px Inter, -apple-system, sans-serif';

  function stageTheme() {
    if (PGRE.vizStageTheme) return PGRE.vizStageTheme();
    return {
      bg: CREAM, ink: INK, muted: MUTED, line: LINE, panel: PANEL,
      gridMid: GRID,
      inkFade: function (a) { return 'rgba(20, 20, 19, ' + a + ')'; },
      chipFade: function (a) { return 'rgba(250, 249, 245, ' + a + ')'; }
    };
  }

  function syncStageTheme() {
    var t = PGRE.vizStageTheme ? PGRE.vizStageTheme() : null;
    if (!t) return;
    CREAM = t.bg; PANEL = t.panel; LINE = t.line; INK = t.ink; MUTED = t.muted; GRID = t.gridMid;
  }

  function fillStage(ctx, width, height) {
    syncStageTheme();
    ctx.fillStyle = (CV && CV.colors && CV.colors.bg) || CREAM;
    ctx.fillRect(0, 0, width, height);
  }

  function vizLegend(title, rows) {
    if (PGRE.appendVizLegend) PGRE.appendVizLegend(title, rows);
  }

  function numParam(state, key, fallback) {
    var n = parseFloat(state && state[key]);
    return isFinite(n) ? n : fallback;
  }

  function flagParam(state, key, fallback) {
    var v = state ? state[key] : undefined;
    if (v === undefined || v === null || v === '') return !!fallback;
    if (v === true || v === 1 || v === '1' || v === 'true' || v === 'on') return true;
    if (v === false || v === 0 || v === '0' || v === 'false' || v === 'off') return false;
    return !!v;
  }

  function safeDt(dt) {
    var n = parseFloat(dt);
    if (!isFinite(n) || n < 0) return 0;
    if (n > 0.05) return 0.05;
    return n;
  }

  function canvasSize(width, height) {
    var w = parseFloat(width);
    var h = parseFloat(height);
    return {
      w: isFinite(w) && w > 0 ? w : 640,
      h: isFinite(h) && h > 0 ? h : 420
    };
  }

  function inkFade(a) {
    var t = stageTheme();
    return t.inkFade ? t.inkFade(a) : ('rgba(20, 20, 19, ' + a + ')');
  }

  function haloLabel(ctx, text, x, y, opts) {
    opts = opts || {};
    ctx.save();
    ctx.font = opts.font || SANS_B;
    ctx.textAlign = opts.align || 'center';
    ctx.textBaseline = opts.baseline || 'middle';
    var w = ctx.measureText ? ctx.measureText(text).width : String(text).length * 6.5;
    var ax = opts.align === 'left' ? x : (opts.align === 'right' ? x - w : x - w / 2);
    var ay = opts.baseline === 'top' ? y : (opts.baseline === 'bottom' ? y - 12 : y - 7);
    var th = stageTheme();
    ctx.fillStyle = th.chipFade ? th.chipFade(0.92) : 'rgba(250, 249, 245, 0.92)';
    ctx.fillRect(ax - 3, ay - 1, w + 6, 14);
    ctx.fillStyle = opts.color || INK;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function shaftArrow(ctx, x0, y0, x1, y1, color, lw) {
    lw = lw == null ? 2.2 : lw;
    if (CV && typeof CV.drawArrow === 'function') {
      CV.drawArrow(ctx, x0, y0, x1, y1, color, '', lw, 7);
      return;
    }
    var dx = x1 - x0;
    var dy = y1 - y0;
    var len = Math.hypot(dx, dy);
    if (len < 2) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    var ux = dx / len;
    var uy = dy / len;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - ux * 8 + uy * 4, y1 - uy * 8 - ux * 4);
    ctx.lineTo(x1 - ux * 8 - uy * 4, y1 - uy * 8 + ux * 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }


  PGRE.visualizers['cpgf-5.27'] = {
    id: 'cpgf-5.27',
    topic: 'qm',
    title: 'Free Particle Quantum Wave & Energy: $\\psi(x) = e^{\\pm ikx}, \\; E = \\hbar^2 k^2/(2m)$',
    formulaLatex: '\\psi(x) = e^{\\pm ikx}, \\qquad E = \\frac{\\hbar^2 k^2}{2m} = \\hbar \\omega',
    physicalStory: `For a free quantum particle ($V(x) = 0$), energy eigenstates are plane waves $\\psi(x) = e^{\\pm ikx}$ with exact momentum $p = \\hbar k$ and uniform $|\\psi|^2$. A localized particle is a packet of those waves. The Schrödinger dispersion $\\omega(k) = \\hbar k^2/(2m)$ is quadratic, so the envelope (group) rides at the classical speed $v_g = d\\omega/dk = p/m$ while every phase crest travels at half that speed: $v_p = \\omega/k = v_g/2$. Watch the tagged crest slip backward through the packet — that factor of two is the whole picture. Envelope width is held fixed so the slip stays readable; a free packet also spreads as $\\Delta k$ components drift.`,

    derivationSteps: [
      {
        step: "1. Free Particle Schrödinger Equation",
        latex: "-\\frac{\\hbar^2}{2m} \\frac{d^2 \\psi}{dx^2} = E \\psi(x) \\implies \\frac{d^2 \\psi}{dx^2} + k^2 \\psi(x) = 0",
        explanation: "Where wavenumber $k = \\frac{\\sqrt{2mE}}{\\hbar}$ is real for any unbound scattering energy $E > 0$."
      },
      {
        step: "2. Plane Wave Momentum Eigenstates",
        latex: "\\hat{p} e^{ikx} = -i\\hbar \\frac{d}{dx} e^{ikx} = \\hbar k e^{ikx} \\implies p = \\hbar k = \\frac{h}{\\lambda}",
        explanation: "$e^{+ikx}$ is an exact right-moving momentum eigenstate with eigenvalue $+p$; $e^{-ikx}$ represents left-moving momentum $-p$."
      },
      {
        step: "3. Time-Dependent State & Dispersion Relation",
        latex: "\\Psi(x,t) = e^{i(kx - \\omega t)}, \\quad \\hbar \\omega = E = \\frac{\\hbar^2 k^2}{2m} \\implies \\omega(k) = \\frac{\\hbar k^2}{2m}",
        explanation: "The angular frequency $\\omega$ scales quadratically with $k$, unlike classical light waves where $\\omega = c k$ is linear."
      },
      {
        step: "4. Phase Velocity vs Group Velocity Factor of 2",
        latex: "v_p = \\frac{\\omega}{k} = \\frac{\\hbar k}{2m} = \\frac{v}{2}, \\qquad v_g = \\frac{d\\omega}{dk} = \\frac{\\hbar k}{m} = v",
        explanation: "The individual phase ripples move at $v/2$, while the localized packet envelope containing the particle moves at classical velocity $v = p/m$."
      }
    ],

    limitingCases: [
      {
        name: "Zero Momentum ($k \\to 0$)",
        condition: "k \\to 0",
        formula: "\\lambda \\to \\infty, \\quad E = 0, \\quad \\psi(x) = 1",
        explanation: "Static constant wavefunction with zero kinetic energy and infinite de Broglie wavelength."
      },
      {
        name: "Standing Wave Superposition",
        condition: "\\psi(x) = \\frac{e^{ikx} + e^{-ikx}}{2} = \\cos(kx)",
        formula: "|\\psi(x)|^2 = \\cos^2(kx), \\quad j = 0",
        explanation: "Equal counter-propagating waves create stationary spatial nodes with zero net probability current flux."
      },
      {
        name: "Relativistic de Broglie Wave",
        condition: "E = \\sqrt{p^2 c^2 + m^2 c^4} = \\gamma m c^2",
        formula: "v_p = \\frac{\\omega}{k} = \\frac{E}{p} = \\frac{c^2}{v} > c, \\quad v_g = v < c, \\quad v_p \\cdot v_g = c^2",
        explanation: "In special relativity, the phase velocity exceeds the speed of light, while the physical group velocity remains strictly subluminal."
      },
      {
        name: "Probability Current Density",
        condition: "j = \\frac{\\hbar}{2mi}\\left(\\psi^* \\nabla \\psi - \\psi \\nabla \\psi^*\\right)",
        formula: "j = \\frac{\\hbar k}{m} |A|^2 = v \\cdot \\rho",
        explanation: "Directly gives the classical fluid flux of probability flowing in the direction of wave propagation."
      }
    ],

    greTraps: [
      {
        trap: "Phase Velocity is $v/2$, Not $v$",
        description: "For non-relativistic Schrödinger matter waves, $v_{\\text{phase}} = v_{\\text{particle}} / 2$, while $v_{\\text{group}} = v_{\\text{particle}}$.",
        proTip: "Favorite PGRE multiple-choice question! If asked for phase velocity of an electron, divide the particle speed by 2."
      },
      {
        trap: "Non-Normalizability of Pure Plane Waves",
        description: "Pure plane waves $e^{ikx}$ cannot be normalized to 1 over infinite space ($\\int |e^{ikx}|^2 dx = \\infty$).",
        proTip: "They use Dirac delta normalization $\\langle k|k'\\rangle = 2\\pi \\delta(k - k')$. Physical localized particles are wavepackets formed by continuous Fourier integrals."
      },
      {
        trap: "Relativistic vs Non-Relativistic Dispersion",
        description: "Non-relativistic: $E \\propto k^2$ ($v_p = v/2$). Massless photons: $E = \\hbar c k \\propto k$ ($v_p = v_g = c$). Relativistic massive: $E^2 = (\\hbar k)^2 c^2 + m^2 c^4$ ($v_p = c^2/v > c$).",
        proTip: "Always identify whether the particle is non-relativistic or relativistic before computing $v_p$."
      }
    ],

    parameters: [
      { id: 'k', label: 'Wavenumber $k$', min: 1.6, max: 5.6, step: 0.2, default: 3.2, unit: '' },
      { id: 'sigma', label: 'Packet width $\\sigma$', min: 0.7, max: 2.2, step: 0.1, default: 1.2, unit: '' },
      { id: 'simSpeed', label: 'Simulation Speed', min: 0.2, max: 3.0, step: 0.2, default: 1.0, unit: 'x' }
    ],

    init: function (container, state) {
      if (state._t === undefined) state._t = 0;
    },

    onParamChange: function (id, val, state) {
      if (!state) return;
      if (id === 'k' || id === 'sigma') state._t = 0;
    },

    draw: function (ctx, width, height, state, dt) {
      state = state || {};
      var size = canvasSize(width, height);
      width = size.w;
      height = size.h;
      fillStage(ctx, width, height);

      var k = Math.max(0.4, numParam(state, 'k', 3.2));
      var sigma = Math.max(0.35, numParam(state, 'sigma', 1.2));
      var speed = numParam(state, 'simSpeed', 1.0);
      if (!isFinite(speed) || speed <= 0) speed = 1;
      dt = safeDt(dt);

      // Units ħ = m = 1: ω = k²/2, v_p = k/2, v_g = k.
      var omega = 0.5 * k * k;
      var vp = 0.5 * k;
      var vg = k;

      var xMin = 0;
      var xMax = 12;
      var xSpan = xMax - xMin;
      var x0 = 2.2 * sigma;
      if (x0 < 1.4) x0 = 1.4;
      var travel = Math.max(2.5, xMax - x0 - 2.4 * sigma);
      var loopT = travel / Math.max(vg, 0.05);
      state._t = (state._t || 0) + dt * speed;
      var tLoop = state._t % loopT;
      if (tLoop < 0) tLoop += loopT;

      var xc = x0 + vg * tLoop;
      var xcr = x0 + vp * tLoop;
      var phase0 = k * x0;

      var padL = 18;
      var padR = 18;
      var padT = 14;
      var padB = 44;
      var plotX = padL;
      var plotW = Math.max(40, width - padL - padR);
      var plotY = padT;
      var plotH = Math.max(40, height - padT - padB);
      var midY = plotY + plotH * 0.58;
      var amp = plotH * 0.40;

      function mapX(x) {
        return plotX + ((x - xMin) / xSpan) * plotW;
      }
      function envAt(x) {
        var d = (x - xc) / sigma;
        return Math.exp(-0.5 * d * d);
      }
      function psiR(x) {
        return envAt(x) * Math.cos(k * x - omega * tLoop - phase0);
      }

      ctx.save();

      ctx.strokeStyle = LINE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(plotX, midY);
      ctx.lineTo(plotX + plotW, midY);
      ctx.stroke();

      var nPts = 280;
      ctx.beginPath();
      ctx.moveTo(mapX(xMin), midY);
      var i;
      for (i = 0; i <= nPts; i++) {
        var x = xMin + (i / nPts) * xSpan;
        ctx.lineTo(mapX(x), midY - envAt(x) * amp);
      }
      ctx.lineTo(mapX(xMax), midY);
      ctx.closePath();
      ctx.fillStyle = 'rgba(93, 184, 166, 0.18)';
      ctx.fill();

      ctx.strokeStyle = 'rgba(93, 184, 166, 0.55)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (i = 0; i <= nPts; i++) {
        x = xMin + (i / nPts) * xSpan;
        var ey = midY - envAt(x) * amp;
        if (i === 0) ctx.moveTo(mapX(x), ey);
        else ctx.lineTo(mapX(x), ey);
      }
      ctx.stroke();

      ctx.strokeStyle = CORAL;
      ctx.lineWidth = 2.3;
      ctx.beginPath();
      for (i = 0; i <= nPts; i++) {
        x = xMin + (i / nPts) * xSpan;
        var py = midY - psiR(x) * amp;
        if (i === 0) ctx.moveTo(mapX(x), py);
        else ctx.lineTo(mapX(x), py);
      }
      ctx.stroke();

      var peakX = mapX(xc);
      var peakY = midY - amp;
      var crestX = mapX(xcr);
      var crestY = midY - psiR(xcr) * amp;

      ctx.strokeStyle = inkFade(0.18);
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(peakX, peakY);
      ctx.lineTo(peakX, midY + 10);
      ctx.moveTo(crestX, crestY);
      ctx.lineTo(crestX, midY + 10);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(peakX, midY + 8);
      ctx.lineTo(crestX, midY + 8);
      ctx.stroke();

      ctx.fillStyle = GOLD;
      ctx.strokeStyle = CORAL_DEEP;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(peakX, peakY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = TEAL;
      ctx.strokeStyle = '#3d8f82';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(crestX, crestY, 4.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      var baseY = plotY + plotH + 18;
      var vgLen = 46;
      var vpLen = 23;
      var ax0 = plotX + 6;
      shaftArrow(ctx, ax0, baseY, ax0 + vgLen, baseY, GOLD, 2.4);
      shaftArrow(ctx, ax0, baseY + 14, ax0 + vpLen, baseY + 14, TEAL, 2.2);
      haloLabel(ctx, 'group', ax0 + vgLen + 20, baseY, { color: GOLD, align: 'left' });
      haloLabel(ctx, 'phase', ax0 + vpLen + 20, baseY + 14, { color: TEAL, align: 'left' });

      haloLabel(ctx, 'x', plotX + plotW - 2, midY + 10, { color: MUTED, align: 'right', baseline: 'top' });

      ctx.restore();

      vizLegend('Free-particle packet', [
        { label: 'Units', value: '$\\hbar = m = 1$' },
        { label: '$k$', value: '$' + k.toFixed(1) + '$' },
        { label: '$\\omega = k^2/2$', value: '$' + omega.toFixed(2) + '$' },
        { label: 'Gold peak / long arrow', value: 'envelope at $v_g = k$' },
        { label: 'Teal crest / short arrow', value: 'phase at $v_p = k/2$' },
        { label: '$v_g$', value: '$' + vg.toFixed(2) + '$' },
        { label: '$v_p$', value: '$' + vp.toFixed(2) + '$' },
        { label: '$v_g / v_p$', value: '$2$' }
      ]);
    },

    challenge: {
      question: "A non-relativistic free particle of mass $m$ is described by the plane wave $\\Psi(x,t) = A \\exp(i(kx - \\omega t))$. If the classical particle velocity is $v = p/m$, what is the relationship between its quantum phase velocity $v_p = \\omega/k$ and its classical velocity $v$?",
      options: [
        "$v_p = v$",
        "$v_p = 2v$",
        "$v_p = v / 2$",
        "$v_p = c^2 / v$",
        "$v_p = v / 4$"
      ],
      correct: 2,
      explanation: "For a non-relativistic Schrödinger particle, $E = p^2/(2m) = \\hbar^2 k^2/(2m) = \\hbar \\omega$, so the dispersion relation is $\\omega(k) = \\hbar k^2/(2m)$. Phase velocity is $v_p = \\omega/k = \\hbar k/(2m) = p/(2m) = v/2$. Group velocity is $v_g = d\\omega/dk = \\hbar k/m = p/m = v$. Thus, the phase velocity is exactly HALF the classical particle velocity ($v_p = v/2$)."
    }
  };

  PGRE.visualizers['cpgf-6.18'] = {
    id: 'cpgf-6.18',
    topic: 'sr',
    title: 'Relativistic Kinetic Energy: $T = (\\gamma - 1)mc^2$',
    formulaLatex: 'T = E - mc^2 = (\\gamma - 1)mc^2, \\qquad \\gamma = \\frac{1}{\\sqrt{1 - v^2/c^2}}',
    physicalStory: `Kinetic energy is the work that lifts a massive particle up its mass shell. On the $(pc, E)$ plane the allowed states are the hyperbola $E^2 - (pc)^2 = (mc^2)^2$; $T$ is the vertical rise above rest energy $mc^2$. As $\\beta \\to 1$ that rise diverges and the worldline only asymptotes the light cone. The same speed in Newtonian mechanics traces a short curve that dies at $(pc, E) = (mc^2,\\, 1.5\\, mc^2)$ — it never reaches $c$, and it never pays the true energy cost.`,

    derivationSteps: [
      {
        step: "1. Relativistic Work-Energy Theorem",
        latex: "W = \\int_0^x F\\, dx' = \\int_0^t \\frac{dp}{dt} v\\, dt' = \\int_0^v v\\, dp",
        explanation: "Work done by an external force accumulates as relativistic kinetic energy $T = W$."
      },
      {
        step: "2. Relativistic Momentum Integration",
        latex: "p = \\gamma m v = \\frac{mv}{\\sqrt{1 - v^2/c^2}} \\implies dp = \\gamma^3 m\\, dv",
        explanation: "Differentiating $p(v)$ yields the longitudinal relativistic mass factor $\\gamma^3 m$."
      },
      {
        step: "3. Direct Integration",
        latex: "T = \\int_0^v v (\\gamma^3 m)\\, dv = m \\int_0^v \\frac{v\\, dv}{(1 - v^2/c^2)^{3/2}} = mc^2 \\left[ \\frac{1}{\\sqrt{1 - v^2/c^2}} - 1 \\right] = (\\gamma - 1)mc^2",
        explanation: "Evaluating the definite integral from rest ($v=0, \\gamma=1$) to speed $v$ gives the exact relativistic kinetic energy."
      },
      {
        step: "4. Low-Velocity Taylor Expansion",
        latex: "\\gamma = (1 - \\beta^2)^{-1/2} = 1 + \\frac{1}{2}\\beta^2 + \\frac{3}{8}\\beta^4 + \\mathcal{O}(\\beta^6) \\implies T \\approx \\frac{1}{2}mv^2 + \\frac{3}{8}m\\frac{v^4}{c^2}",
        explanation: "For $v \\ll c$, the first term reproduces Newtonian $\\frac{1}{2}mv^2$. The second term is the first relativistic fine-structure correction."
      }
    ],

    limitingCases: [
      {
        name: "Classical Non-Relativistic Limit ($\\beta \\to 0$)",
        condition: "\\beta = v/c \\ll 1",
        formula: "T \\approx \\frac{1}{2}mv^2, \\quad E \\approx mc^2 + \\frac{1}{2}mv^2",
        explanation: "Relativistic discrepancy is less than $1\\%$ for speeds below $\\beta \\approx 0.115$."
      },
      {
        name: "Ultra-Relativistic Limit ($\\beta \\to 1, \\; \\gamma \\gg 1$)",
        condition: "\\gamma \\gg 1 \\implies E \\gg mc^2",
        formula: "T \\approx E \\approx pc \\approx \\gamma mc^2",
        explanation: "Rest mass becomes negligible; particle behaves like a massless photon with $E \\approx pc$ (e.g. LHC protons, cosmic rays)."
      },
      {
        name: "Massless Particle Limit ($m = 0$)",
        condition: "m = 0",
        formula: "E = pc, \\quad v = c \\text{ always}",
        explanation: "Photons and gluons possess zero rest mass and travel strictly at $c$, carrying energy purely via momentum."
      },
      {
        name: "Invariant Momentum-Energy Relation",
        condition: "E^2 - p^2 c^2 = m^2 c^4",
        formula: "pc = \\sqrt{T(T + 2mc^2)}",
        explanation: "Extremely useful PGRE formula relating momentum directly to kinetic energy without calculating $\\gamma$ or $v$."
      }
    ],

    greTraps: [
      {
        trap: "Confusing Total Energy $E$ with Kinetic Energy $T$",
        description: "Total energy is $E = \\gamma mc^2$. Kinetic energy is $T = (\\gamma - 1)mc^2$. If a question says 'total energy is 3 times rest energy', then $\\gamma = 3$ and $T = 2 mc^2$.",
        proTip: "Always check whether the problem asks for Total Energy $E$ or Kinetic Energy $T$!"
      },
      {
        trap: "Using $T = \\frac{1}{2} m v^2$ at High Speeds",
        description: "At $v = 0.8c$, $\\gamma = 1/0.6 = 1.667$. Exact $T = 0.667 mc^2$, whereas classical formula gives $0.32 mc^2$ (over $100\\%$ error!).",
        proTip: "Whenever $\\beta > 0.1$, you MUST use the relativistic formula $T = (\\gamma - 1)mc^2$."
      },
      {
        trap: "Electron Accelerated Across 1 MV",
        description: "An electron accelerated across potential $V$ acquires $T = e V$. For $V = 0.511\\text{ MV}$, $T = 1 m_e c^2 \\implies \\gamma = 2 \\implies v = (\\sqrt{3} / 2)c \\approx 0.866c$.",
        proTip: "Memorize $m_e c^2 \\approx 0.511\\text{ MeV}$ and $m_p c^2 \\approx 938\\text{ MeV}$ for rapid PGRE calculations."
      }
    ],

    parameters: [
      { id: 'beta', label: 'Velocity ratio $\\beta = v/c$', min: 0.0, max: 0.99, step: 0.01, default: 0.80, unit: '' },
      { id: 'particle', label: 'Particle', type: 'select', options: [
        { value: 'electron', label: '$e^-$ $(0.511\\,\\mathrm{MeV})$' },
        { value: 'muon', label: '$\\mu^-$ $(105.7\\,\\mathrm{MeV})$' },
        { value: 'proton', label: '$p$ $(938.3\\,\\mathrm{MeV})$' }
      ], default: 'electron' }
    ],

    draw: function (ctx, width, height, state) {
      state = state || {};
      var size = canvasSize(width, height);
      width = size.w;
      height = size.h;
      fillStage(ctx, width, height);

      var beta = numParam(state, 'beta', 0.80);
      if (beta < 0) beta = 0;
      if (beta > 0.99) beta = 0.99;
      var particle = (state.particle || 'electron');

      var restMassMeV = 0.511;
      if (particle === 'proton') restMassMeV = 938.3;
      if (particle === 'muon') restMassMeV = 105.7;

      var oneMinus = Math.max(1e-8, 1 - beta * beta);
      var gamma = 1 / Math.sqrt(oneMinus);
      var uRel = gamma * beta;
      var eRel = gamma;
      var tRel = gamma - 1;
      var uN = beta;
      var eN = 1 + 0.5 * beta * beta;
      var tN = 0.5 * beta * beta;
      var T_rel = tRel * restMassMeV;
      var T_class = tN * restMassMeV;
      var pc_MeV = Math.sqrt(Math.max(0, T_rel * (T_rel + 2 * restMassMeV)));
      var newtonRelErr = tN > 1e-9 ? ((tRel - tN) / tN) * 100 : 0;

      var padL = 50;
      var padR = 16;
      var padT = 18;
      var padB = 36;
      var originX = padL;
      var originY = height - padB;
      var plotW = Math.max(40, width - padL - padR);
      var plotH = Math.max(40, originY - padT);

      var uMax = Math.max(1.45, uRel * 1.22);
      var eMax = Math.max(1.85, eRel * 1.18);

      function mapU(u) { return originX + (u / uMax) * plotW; }
      function mapE(e) { return originY - (e / eMax) * plotH; }

      ctx.save();

      ctx.strokeStyle = GRID;
      ctx.lineWidth = 1;
      var gi;
      for (gi = 1; gi <= 4; gi++) {
        var gv = (gi / 4) * uMax;
        ctx.beginPath();
        ctx.moveTo(mapU(gv), originY);
        ctx.lineTo(mapU(gv), originY - plotH);
        ctx.stroke();
        var ge = (gi / 4) * eMax;
        ctx.beginPath();
        ctx.moveTo(originX, mapE(ge));
        ctx.lineTo(originX + plotW, mapE(ge));
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.rect(originX, originY - plotH, plotW, plotH);
      ctx.clip();

      var lightX = mapU(Math.min(uMax, eMax));
      var lightY = mapE(Math.min(uMax, eMax));
      ctx.strokeStyle = ROSE;
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(mapU(0), mapE(0));
      ctx.lineTo(lightX, lightY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = TEAL;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(originX, mapE(1));
      ctx.lineTo(originX + plotW, mapE(1));
      ctx.stroke();

      ctx.strokeStyle = GOLD;
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      var nB = 80;
      var bi;
      for (bi = 0; bi <= nB; bi++) {
        var b = (bi / nB) * 0.999;
        var px = mapU(b);
        var py = mapE(1 + 0.5 * b * b);
        if (bi === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = CORAL;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      var nU = 140;
      var ui;
      for (ui = 0; ui <= nU; ui++) {
        var u = (ui / nU) * uMax;
        var eH = Math.sqrt(1 + u * u);
        var hx = mapU(u);
        var hy = mapE(eH);
        if (ui === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.stroke();

      var xR = mapU(uRel);
      var yR = mapE(eRel);
      var yRest = mapE(1);
      if (tRel > 0.02) {
        ctx.strokeStyle = CORAL_DEEP;
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(xR, yRest);
        ctx.lineTo(xR, yR);
        ctx.stroke();
      }

      var xC = mapU(uN);
      var yC = mapE(eN);
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(xC, yC, 4.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = CREAM;
      ctx.strokeStyle = CORAL;
      ctx.lineWidth = 2.3;
      ctx.beginPath();
      ctx.arc(xR, yR, 5.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.restore();

      ctx.save();
      ctx.strokeStyle = AXIS;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(originX, originY - plotH);
      ctx.lineTo(originX, originY);
      ctx.lineTo(originX + plotW, originY);
      ctx.stroke();
      ctx.restore();

      haloLabel(ctx, 'pc', originX + plotW - 4, originY + 14, { color: MUTED, align: 'right' });
      haloLabel(ctx, 'E', originX - 14, originY - plotH + 2, { color: MUTED, align: 'right', baseline: 'top' });
      if (tRel * plotH / eMax > 28) {
        haloLabel(ctx, 'T', xR + 12, (yR + yRest) / 2, { color: CORAL_DEEP, align: 'left' });
      }
      var restLabelX = originX + 10;
      haloLabel(ctx, 'rest', restLabelX, mapE(1) - 10, { color: TEAL, align: 'left' });
      var lightLabelU = Math.min(uMax * 0.72, eMax * 0.72);
      haloLabel(ctx, 'light', mapU(lightLabelU) + 10, mapE(lightLabelU) - 8, { color: ROSE, align: 'left' });

      vizLegend('Mass shell', [
        { label: 'Particle', value: particle },
        { label: 'Coral curve', value: '$E^2 - (pc)^2 = (mc^2)^2$' },
        { label: 'Coral riser', value: '$T = E - mc^2$' },
        { label: 'Gold curve / dot', value: 'same $\\beta$, $T_N = \\frac{1}{2}mv^2$' },
        { label: '$\\beta = v/c$', value: '$' + beta.toFixed(2) + '$' },
        { label: '$\\gamma$', value: '$' + gamma.toFixed(3) + '$' },
        { label: '$mc^2$', value: '$' + restMassMeV.toFixed(3) + '\\text{ MeV}$' },
        { label: '$T = (\\gamma-1)mc^2$', value: '$' + T_rel.toFixed(3) + '\\text{ MeV}$' },
        { label: '$T_N = \\frac{1}{2}mv^2$', value: '$' + T_class.toFixed(3) + '\\text{ MeV}$' },
        { label: '$pc$', value: '$' + pc_MeV.toFixed(3) + '\\text{ MeV}$' },
        { label: '$(T - T_N)/T_N$', value: '$' + newtonRelErr.toFixed(1) + '\\%$' }
      ]);
    },

    challenge: {
      question: "An electron of rest mass $m_e$ ($m_e c^2 \\approx 0.511\\text{ MeV}$) is accelerated from rest across a potential difference of $\\Delta V = 1.022\\text{ MV}$, acquiring kinetic energy $T = 2 m_e c^2$. What is the electron's final speed $v$ in terms of $c$?",
      options: [
        "$(\\sqrt{3} / 2) c \\approx 0.866 c$",
        "$(2\\sqrt{2} / 3) c \\approx 0.943 c$",
        "$(1 / 3) c \\approx 0.333 c$",
        "$(8 / 9) c \\approx 0.889 c$",
        "$2 c$"
      ],
      correct: 1,
      explanation: "Kinetic energy is $T = (\\gamma - 1) m_e c^2 = 2 m_e c^2 \\implies \\gamma - 1 = 2 \\implies \\gamma = 3$. By definition of $\\gamma = 1 / \\sqrt{1 - \\beta^2}$, we have $1 - \\beta^2 = 1 / \\gamma^2 = 1/9 \\implies \\beta^2 = 8/9 \\implies \\beta = \\sqrt{8}/3 = 2\\sqrt{2} / 3 \\approx 0.9428 c$. Note: Using classical $T = \\frac{1}{2} m v^2 = 2 mc^2$ would yield $v = 2c > c$, which violates relativity."
    }
  };

  function seedDecay(state, n0) {
    var n = Math.max(8, Math.round(n0));
    state._nuclei = [];
    var i;
    for (i = 0; i < n; i++) {
      state._nuclei.push({
        alive: true,
        x: (i + 0.5 + (Math.random() - 0.5) * 0.35) / n,
        j: (Math.random() - 0.5)
      });
    }
    state._simTime = 0;
    state._hist = [{ t: 0, n: n }];
    state._n0 = n;
  }

  PGRE.visualizers['cpgf-7.17'] = {
    id: 'cpgf-7.17',
    topic: 'lb',
    title: 'Radioactive Decay Law: $N(t) = N_0 e^{-t/\\tau}$',
    formulaLatex: 'N(t) = N_0 e^{-t/\\tau} = N_0 e^{-\\lambda t} = N_0 \\left(\\frac{1}{2}\\right)^{t/t_{1/2}}',
    physicalStory: `Each nucleus waits an exponential time with rate $\\lambda$, memorylessly. The ensemble is $N(t) = N_0 e^{-t/\\tau}$ with $\\tau = 1/\\lambda$. Half-life $t_{1/2} = \\tau \\ln 2$ is earlier: the curve hits $N_0/2$ first (gold) and $N_0/e$ later (teal). Mean life is always longer than half-life. The staircase is one finite sample; the smooth exponential is the expectation.`,

    derivationSteps: [
      {
        step: "1. Differential Decay Rate & Poisson Probability",
        latex: "dN = -\\lambda N(t)\\, dt \\implies \\frac{dN}{N} = -\\lambda\\, dt",
        explanation: "The rate of loss of parent nuclei is directly proportional to the number of surviving nuclei $N(t)$ present at time $t$."
      },
      {
        step: "2. Direct Integration",
        latex: "\\int_{N_0}^{N(t)} \\frac{dN'}{N'} = -\\lambda \\int_0^t dt' \\implies \\ln\\left(\\frac{N(t)}{N_0}\\right) = -\\lambda t \\implies N(t) = N_0 e^{-\\lambda t}",
        explanation: "Integrating both sides yields the classical exponential radioactive decay law."
      },
      {
        step: "3. Half-Life & Lifetime Relationship",
        latex: "N(t_{1/2}) = \\frac{N_0}{2} = N_0 e^{-t_{1/2}/\\tau} \\implies t_{1/2} = \\tau \\ln 2 = \\frac{\\ln 2}{\\lambda} \\approx 0.69315\\, \\tau",
        explanation: "Because $\\ln 2 < 1$, the half-life $t_{1/2}$ is always shorter than the mean lifetime $\\tau$."
      },
      {
        step: "4. Mean Lifetime & Activity",
        latex: "\\langle t \\rangle = \\frac{\\int_0^\\infty t \\lambda N_0 e^{-\\lambda t}\\, dt}{N_0} = \\frac{1}{\\lambda} = \\tau, \\qquad A(t) = -\\frac{dN}{dt} = \\lambda N(t) = A_0 e^{-\\lambda t}",
        explanation: "Activity $A(t)$ (measured in Becquerels $1\\text{ Bq} = 1\\text{ decay/s}$) decays exponentially in lockstep with the number of nuclei."
      }
    ],

    limitingCases: [
      {
        name: "Short Time Limit ($t \\ll \\tau$)",
        condition: "t \\ll \\tau",
        formula: "N(t) \\approx N_0 (1 - \\lambda t) = N_0\\left(1 - \\frac{t}{\\tau}\\right)",
        explanation: "Taylor expansion shows approximately linear decay for times much shorter than the mean lifetime."
      },
      {
        name: "Multi-Half-Life Binary Progression",
        condition: "t = n \\cdot t_{1/2}",
        formula: "N(n\\, t_{1/2}) = N_0 \\left(\\frac{1}{2}\\right)^n, \\quad \\frac{N_{\\text{daughter}}}{N_{\\text{parent}}} = 2^n - 1",
        explanation: "After 1 half-life: $1/2$ left; after 2: $1/4$; after 3: $1/8$; after 4: $1/16$; after 10: $1/1024 < 0.1\\%$."
      },
      {
        name: "Branching Parallel Decays",
        condition: "\\lambda_{\\text{total}} = \\lambda_1 + \\lambda_2",
        formula: "\\frac{1}{\\tau_{\\text{total}}} = \\frac{1}{\\tau_1} + \\frac{1}{\\tau_2}, \\quad \\text{Branching Ratio}_1 = \\frac{\\lambda_1}{\\lambda_1 + \\lambda_2}",
        explanation: "When multiple decay channels exist (e.g. $\\alpha$ vs $\\beta$), decay rates add linearly, reducing the net lifetime."
      },
      {
        name: "Secular Radioactive Equilibrium",
        condition: "A \\xrightarrow{\\lambda_A} B \\xrightarrow{\\lambda_B} C \\quad (\\tau_A \\gg \\tau_B)",
        formula: "A_B(t) = A_A(t) \\implies \\lambda_B N_B = \\lambda_A N_A",
        explanation: "When parent is much longer-lived than daughter, the daughter's activity equals the parent's activity."
      }
    ],

    greTraps: [
      {
        trap: "Confusing Half-Life $t_{1/2}$ with Mean Lifetime $\\tau$",
        description: "$t_{1/2} = \\tau \\ln 2 \\approx 0.693 \\tau < \\tau$. Mean lifetime is ALWAYS longer than half-life.",
        proTip: "If a problem specifies lifetime $\\tau = 10\\text{ s}$, do NOT assume half-life is $10\\text{ s}$ (half-life is $6.93\\text{ s}$)."
      },
      {
        trap: "Daughter to Parent Ratio Question",
        description: "After 3 half-lives, remaining parent is $1/8 N_0$, so daughter count is $7/8 N_0$. The ratio $N_{\\text{daughter}} / N_{\\text{parent}} = 7$ (NOT 8 or 1/8).",
        proTip: "Read carefully: Does the question ask for $N_{\\text{parent}} / N_0$, $N_{\\text{daughter}} / N_0$, or $N_{\\text{daughter}} / N_{\\text{parent}}$?"
      },
      {
        trap: "Activity Proportionality",
        description: "Activity $A = \\lambda N = N / \\tau$. A sample with half the lifetime has twice the activity for the same number of atoms.",
        proTip: "High activity = fast decay = short half-life."
      }
    ],

    parameters: [
      { id: 'tHalf', label: 'Half-life $t_{1/2}$', min: 2.0, max: 12.0, step: 0.5, default: 5.0, unit: 's' },
      { id: 'n0', label: 'Sample $N_0$', min: 24, max: 96, step: 8, default: 64, unit: '' },
      { id: 'playing', label: 'Run decay', type: 'toggle', default: true },
      { id: 'simSpeed', label: 'Simulation Speed', min: 0.2, max: 3.0, step: 0.2, default: 1.0, unit: 'x' },
      { id: 'reseed', label: 'Reset sample', type: 'toggle', default: false }
    ],

    init: function (container, state) {
      seedDecay(state, numParam(state, 'n0', 64));
    },

    onParamChange: function (id, val, state) {
      if (!state) return;
      if (id === 'tHalf' || id === 'n0' || id === 'reseed') {
        seedDecay(state, numParam(state, 'n0', 64));
      }
    },

    draw: function (ctx, width, height, state, dt) {
      state = state || {};
      var size = canvasSize(width, height);
      width = size.w;
      height = size.h;

      var tHalf = Math.max(0.4, numParam(state, 'tHalf', 5.0));
      var n0Wanted = Math.max(8, Math.round(numParam(state, 'n0', 64)));
      var isPlaying = flagParam(state, 'playing', true);
      var simSpeed = numParam(state, 'simSpeed', 1.0);
      if (!isFinite(simSpeed) || simSpeed <= 0) simSpeed = 1;
      dt = safeDt(dt);

      var tau = tHalf / Math.LN2;
      var lambda = 1 / tau;

      if (!state._nuclei || state._nuclei.length !== n0Wanted) seedDecay(state, n0Wanted);
      if (!state._hist) state._hist = [{ t: 0, n: state._nuclei.length }];

      var totalAtoms = state._nuclei.length || 1;
      if (isPlaying && (state._simTime || 0) < 6 * tHalf) {
        var step = dt * simSpeed;
        state._simTime = (state._simTime || 0) + step;
        var decayProb = 1 - Math.exp(-lambda * step);
        var nBefore = 0;
        var ai;
        for (ai = 0; ai < state._nuclei.length; ai++) {
          if (state._nuclei[ai].alive) nBefore++;
        }
        for (ai = 0; ai < state._nuclei.length; ai++) {
          if (state._nuclei[ai].alive && Math.random() < decayProb) {
            state._nuclei[ai].alive = false;
          }
        }
        var nAfter = 0;
        for (ai = 0; ai < state._nuclei.length; ai++) {
          if (state._nuclei[ai].alive) nAfter++;
        }
        var last = state._hist[state._hist.length - 1];
        if (!last || nAfter !== last.n || state._simTime - last.t > 0.12) {
          state._hist.push({ t: state._simTime, n: nAfter });
          if (state._hist.length > 360) state._hist.shift();
        }
      }

      var curTime = state._simTime || 0;
      var surviving = 0;
      var si;
      for (si = 0; si < state._nuclei.length; si++) {
        if (state._nuclei[si].alive) surviving++;
      }
      var nTheory = totalAtoms * Math.exp(-curTime / tau);
      var daughters = totalAtoms - surviving;
      var ratio = surviving > 0 ? daughters / surviving : Infinity;
      var activity = lambda * surviving;

      fillStage(ctx, width, height);

      var padL = 44;
      var padR = 16;
      var padT = 14;
      var padB = 50;
      var originX = padL;
      var originY = height - padB;
      var plotW = Math.max(40, width - padL - padR);
      var plotH = Math.max(40, originY - padT);
      var maxTime = Math.max(3.4 * tHalf, curTime * 1.08, tau * 1.25);

      function mapT(tVal) { return originX + (tVal / maxTime) * plotW; }
      function mapN(n) { return originY - (n / totalAtoms) * plotH; }

      ctx.save();

      ctx.strokeStyle = GRID;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(originX, mapN(totalAtoms * 0.5));
      ctx.lineTo(originX + plotW, mapN(totalAtoms * 0.5));
      ctx.moveTo(originX, mapN(totalAtoms / Math.E));
      ctx.lineTo(originX + plotW, mapN(totalAtoms / Math.E));
      ctx.stroke();

      var tHalfX = mapT(tHalf);
      var tauX = mapT(tau);
      var yHalf = mapN(totalAtoms * 0.5);
      var yTau = mapN(totalAtoms / Math.E);

      if (tauX > tHalfX) {
        ctx.fillStyle = 'rgba(93, 184, 166, 0.10)';
        ctx.fillRect(tHalfX, originY - plotH, tauX - tHalfX, plotH);
      }

      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(originX, yHalf);
      ctx.lineTo(tHalfX, yHalf);
      ctx.lineTo(tHalfX, originY);
      ctx.stroke();

      ctx.strokeStyle = TEAL;
      ctx.beginPath();
      ctx.moveTo(originX, yTau);
      ctx.lineTo(tauX, yTau);
      ctx.lineTo(tauX, originY);
      ctx.stroke();
      ctx.setLineDash([]);

      if (state._hist && state._hist.length > 1) {
        ctx.strokeStyle = inkFade(0.28);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        var hi;
        ctx.moveTo(mapT(state._hist[0].t), mapN(state._hist[0].n));
        for (hi = 1; hi < state._hist.length; hi++) {
          var ht = Math.min(state._hist[hi].t, maxTime);
          ctx.lineTo(mapT(ht), mapN(state._hist[hi - 1].n));
          ctx.lineTo(mapT(ht), mapN(state._hist[hi].n));
        }
        ctx.lineTo(mapT(Math.min(curTime, maxTime)), mapN(surviving));
        ctx.stroke();
      }

      ctx.strokeStyle = CORAL;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      var nPts = 160;
      var pi;
      for (pi = 0; pi <= nPts; pi++) {
        var tv = (pi / nPts) * maxTime;
        var gx = mapT(tv);
        var gy = mapN(totalAtoms * Math.exp(-tv / tau));
        if (pi === 0) ctx.moveTo(gx, gy);
        else ctx.lineTo(gx, gy);
      }
      ctx.stroke();

      var nowX = mapT(Math.min(curTime, maxTime));
      var nowY = mapN(nTheory);
      ctx.strokeStyle = inkFade(0.2);
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(nowX, originY);
      ctx.lineTo(nowX, nowY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = CREAM;
      ctx.strokeStyle = CORAL;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(nowX, nowY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = AXIS;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(originX, originY - plotH);
      ctx.lineTo(originX, originY);
      ctx.lineTo(originX + plotW, originY);
      ctx.stroke();

      ctx.restore();

      haloLabel(ctx, 't', originX + plotW - 2, originY + 12, { color: MUTED, align: 'right' });
      haloLabel(ctx, 'N', originX - 12, originY - plotH + 4, { color: MUTED, align: 'right', baseline: 'top' });
      if (tHalfX > originX + 18 && tHalfX < originX + plotW - 18) {
        haloLabel(ctx, 'half', tHalfX, originY + 12, { color: GOLD });
      }
      if (tauX > originX + 18 && tauX < originX + plotW - 18 && Math.abs(tauX - tHalfX) > 36) {
        haloLabel(ctx, 'mean', tauX, originY + 12, { color: TEAL });
      }

      var stripY = originY + 28;
      var dotR = Math.max(1.8, Math.min(3.4, plotW / (totalAtoms * 1.35)));
      for (si = 0; si < state._nuclei.length; si++) {
        var a = state._nuclei[si];
        var ax = originX + a.x * plotW;
        var ay = stripY + a.j * 6;
        ctx.beginPath();
        if (a.alive) {
          ctx.fillStyle = CORAL;
          ctx.arc(ax, ay, dotR, 0, Math.PI * 2);
        } else {
          ctx.fillStyle = inkFade(0.14);
          ctx.arc(ax, ay, dotR * 0.75, 0, Math.PI * 2);
        }
        ctx.fill();
      }

      vizLegend('Radioactive decay', [
        { label: 'Gold corner', value: '$N_0/2$ at $t_{1/2}$' },
        { label: 'Teal corner', value: '$N_0/e$ at $\\tau$' },
        { label: 'Coral curve', value: '$N_0 e^{-t/\\tau}$' },
        { label: 'Ink staircase', value: 'one finite sample' },
        { label: '$t$', value: '$' + curTime.toFixed(2) + '\\text{ s}$' },
        { label: '$t_{1/2}$', value: '$' + tHalf.toFixed(1) + '\\text{ s}$' },
        { label: '$\\tau = t_{1/2}/\\ln 2$', value: '$' + tau.toFixed(2) + '\\text{ s}$' },
        { label: '$N_{\\text{parent}}$', value: '$' + surviving + '/' + totalAtoms + '$' },
        { label: '$N_Y/N_X$', value: isFinite(ratio) ? '$' + ratio.toFixed(2) + '$' : '$\\infty$' },
        { label: '$A = \\lambda N$', value: '$' + activity.toFixed(1) + '\\text{ Bq}$' }
      ]);
    },

    challenge: {
      question: "A pure sample initially contains $N_0$ radioactive nuclei of isotope X, which decays with a half-life $t_{1/2} = 4\\text{ hours}$ into a stable daughter isotope Y. After $12\\text{ hours}$, what is the ratio of the number of daughter nuclei $N_Y$ to the remaining parent nuclei $N_X$?",
      options: [
        "$3$",
        "$4$",
        "$7$",
        "$8$",
        "$1 / 8$"
      ],
      correct: 2,
      explanation: "Elapsed time $t = 12\\text{ hours}$ corresponds to $n = 12 / 4 = 3$ half-lives. The fraction of parent nuclei remaining is $N_X(t) = N_0 (1/2)^3 = 1/8 N_0$. The number of decayed parent nuclei (which have transformed into daughter nuclei) is $N_Y(t) = N_0 - N_X(t) = N_0 - 1/8 N_0 = 7/8 N_0$. The ratio of daughter to parent nuclei is $N_Y / N_X = (7/8 N_0) / (1/8 N_0) = 7$. (GRE Trap: Do not confuse $N_Y / N_X = 7$ with $N_0 / N_X = 8$)."
    }
  };


})(typeof window !== 'undefined' ? window : globalThis);
