/* Formula visualizers — G9 Ohm / First Law / Heisenberg / Cp */
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

  function clamp(v, lo, hi) {
    v = Number(v);
    if (v !== v) v = lo;
    return Math.max(lo, Math.min(hi, v));
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
  function simDt(state, dt) {
    var speed = clamp(numParam(state, 'simSpeed', 1.0), 0.2, 3.0);
    var n = parseFloat(dt);
    if (!isFinite(n) || n < 0) n = 0.016;
    if (n > 0.08) n = 0.08;
    return n * speed;
  }
  function collideP(lambda, dt) {
    if (!(lambda > 0) || !(dt > 0)) return false;
    var p = 1 - Math.exp(-lambda * dt);
    if (p > 1) p = 1;
    return Math.random() < p;
  }
  function legend(title, rows) {
    if (typeof PGRE.appendVizLegend === 'function') {
      PGRE.appendVizLegend(title, rows || []);
    }
  }
  function canvasSize(width, height) {
    var w = parseFloat(width);
    var h = parseFloat(height);
    return {
      w: isFinite(w) && w > 0 ? w : 640,
      h: isFinite(h) && h > 0 ? h : 420
    };
  }
  var C = {
    get bg() { return PGRE.vizStageTheme().bg; },
    get panel() { return PGRE.vizStageTheme().panel; },
    get ivory() { return PGRE.vizStageTheme().ivory; },
    get line() { return PGRE.vizStageTheme().line; },
    get ink() { return PGRE.vizStageTheme().ink; },
    get muted() { return PGRE.vizStageTheme().muted; },
    coral: '#cc785c',
    deep: '#964b32',
    gold: '#d4a017',
    teal: '#5db8a6',
    stone: '#8e8b82',
    rose: '#e05666'
  };
  function panelPath(ctx, x, y, w, h, r) {
    r = r == null ? 8 : r;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
  }
  function haloLabel(ctx, text, x, y, opts) {
    opts = opts || {};
    ctx.save();
    ctx.font = opts.font || '600 11px Inter, sans-serif';
    ctx.textAlign = opts.align || 'center';
    ctx.textBaseline = opts.baseline || 'middle';
    var w = ctx.measureText ? ctx.measureText(text).width : String(text).length * 6.5;
    var ax = opts.align === 'left' ? x : (opts.align === 'right' ? x - w : x - w / 2);
    var ay = opts.baseline === 'top' ? y : (opts.baseline === 'bottom' ? y - 12 : y - 7);
    var theme = PGRE.vizStageTheme();
    ctx.fillStyle = theme.chipFade(0.92);
    ctx.fillRect(ax - 3, ay - 1, w + 6, 14);
    ctx.strokeStyle = theme.chipLine;
    ctx.lineWidth = 1;
    ctx.strokeRect(ax - 3, ay - 1, w + 6, 14);
    ctx.fillStyle = opts.color || C.ink;
    ctx.fillText(text, x, y);
    ctx.restore();
  }
  function creamFill(ctx, width, height) {
    ctx.fillStyle = (CV && CV.colors && CV.colors.bg) || C.bg;
    ctx.fillRect(0, 0, width, height);
  }
  function lightGrid(ctx, width, height, step) {
    step = step || 40;
    ctx.save();
    ctx.strokeStyle = (CV && CV.colors && CV.colors.grid) || PGRE.vizStageTheme().inkFade(0.06);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var x = 0; x <= width; x += step) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, height);
    }
    for (var y = 0; y <= height; y += step) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(width, y + 0.5);
    }
    ctx.stroke();
    ctx.restore();
  }
  function arrow(ctx, x0, y0, x1, y1, color, lw) {
    if (CV && typeof CV.drawArrow === 'function') {
      CV.drawArrow(ctx, x0, y0, x1, y1, color, '', lw || 2, 7);
      return;
    }
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lw || 2;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.restore();
  }

  function seedOhmCarriers(state, n) {
    n = n || 52;
    state._e = [];
    var i, th;
    for (i = 0; i < n; i++) {
      th = Math.random() * 2 * Math.PI;
      state._e.push({
        x: Math.random(),
        y: 0.08 + Math.random() * 0.84,
        vx: Math.cos(th),
        vy: Math.sin(th)
      });
    }
    state._ions = [];
    var r, c;
    for (r = 0; r < 3; r++) {
      for (c = 0; c < 10; c++) {
        state._ions.push({ fx: (c + 0.5) / 10, fy: (r + 0.5) / 3 });
      }
    }
  }

  function seedGas(state, n) {
    n = n || 36;
    state._particles = [];
    var i;
    for (i = 0; i < n; i++) {
      state._particles.push({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2
      });
    }
  }

  function seedPhase(state, n, sig0, p0) {
    n = n || 40;
    var sigP = 0.5 / Math.max(0.12, sig0);
    state._phase = [];
    var i;
    for (i = 0; i < n; i++) {
      state._phase.push({
        x: (Math.random() * 2 - 1) * sig0 * 0.85 + randn() * sig0 * 0.55,
        p: p0 + randn() * sigP
      });
    }
    state._sig0 = sig0;
    state._p0 = p0;
    state._tPack = 0;
  }

  function randn() {
    var u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function seedGasP432(state, n) {
    n = n || 22;
    state._particlesP = [];
    var i;
    for (i = 0; i < n; i++) {
      state._particlesP.push({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2
      });
    }
  }
  function seedGasV432(state, n) {
    n = n || 22;
    state._particlesV = [];
    var i;
    for (i = 0; i < n; i++) {
      state._particlesV.push({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2
      });
    }
  }
  function cvOverR(gasType, t) {
    t = Math.max(1, t);
    if (gasType === 'monatomic') return 1.5;
    if (gasType === 'solid_dulong') {
      var theta = 280;
      var x = t / theta;
      var x3 = x * x * x;
      return 3.0 * x3 / (0.08 + x3);
    }
    var rotFrac = 1 / (1 + Math.exp(-(Math.log(t) - Math.log(70)) * 2.2));
    var vibFrac = 1 / (1 + Math.exp(-(Math.log(t) - Math.log(900)) * 2.0));
    if (gasType === 'diatomic_high') return 1.5 + rotFrac + vibFrac;
    return 1.5 + rotFrac;
  }
  function mayerGapOverR(gasType, cvR) {
    if (gasType === 'solid_dulong') return 0.10 * (cvR / 3.0);
    return 1.0;
  }
  function bounceParticles(list, dt, speed) {
    var i, p;
    for (i = 0; i < list.length; i++) {
      p = list[i];
      p.x += p.vx * speed * dt;
      p.y += p.vy * speed * dt;
      if (p.x < 0) { p.x = 0; p.vx = Math.abs(p.vx); }
      if (p.x > 1) { p.x = 1; p.vx = -Math.abs(p.vx); }
      if (p.y < 0) { p.y = 0; p.vy = Math.abs(p.vy); }
      if (p.y > 1) { p.y = 1; p.vy = -Math.abs(p.vy); }
    }
  }
  function drawParticles(ctx, list, x, y, w, h, color, r) {
    ctx.fillStyle = color;
    var i, p;
    for (i = 0; i < list.length; i++) {
      p = list[i];
      ctx.beginPath();
      ctx.arc(x + p.x * w, y + p.y * h, r || 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  function tempFill(hot) {
    hot = clamp(hot, 0, 1);
    var r = Math.floor(204 * hot + 93 * (1 - hot));
    var g = Math.floor(120 * hot + 184 * (1 - hot));
    var b = Math.floor(92 * hot + 166 * (1 - hot));
    return 'rgba(' + r + ', ' + g + ', ' + b + ', 0.42)';
  }
  function drawCrystalBlock(ctx, x, y, w, h, T, expandFrac, t, locked) {
    ctx.fillStyle = C.ivory;
    ctx.strokeStyle = locked ? C.teal : C.coral;
    ctx.lineWidth = 1.6;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    var cols = 5, rows = 4;
    var jitter = Math.sqrt(Math.max(0.2, T / 300)) * 2.4;
    var inset = 12;
    var spanX = (w - inset * 2) * expandFrac;
    var spanY = (h - inset * 2) * expandFrac;
    var ox = x + (w - spanX) / 2;
    var oy = y + (h - spanY) / 2;
    var ionR = 5;
    var r, c, jx, jy, sx, sy;
    for (r = 0; r < rows; r++) {
      for (c = 0; c < cols; c++) {
        jx = Math.sin(t * 18 + r * 2.1 + c * 1.4) * jitter;
        jy = Math.cos(t * 16 + r * 1.7 + c * 2.2) * jitter;
        sx = ox + ((c + 0.5) / cols) * spanX + jx;
        sy = oy + ((r + 0.5) / rows) * spanY + jy;
        ctx.fillStyle = C.gold;
        ctx.beginPath();
        ctx.arc(sx, sy, ionR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = C.deep;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  /* -------------------------------------------------------------------------- */
  /* cpgf-2.70  Ohm  V_R = I R                                                   */
  /* Picture: one wire. Lattice + thermal electrons with a tiny leftward drift.  */
  /* -------------------------------------------------------------------------- */
  PGRE.visualizers['cpgf-2.70'] = {
    id: 'cpgf-2.70',
    topic: 'em',
    title: "Ohm's Law: $V_R = IR$",
    formulaLatex: 'V_R = IR',
    physicalStory: `Macroscopic Ohm's law $V_R = IR$ is the spatial integral of the linear isotropic constitutive relation $\\mathbf{J} = \\sigma \\mathbf{E}$.

In the Drude picture, conduction electrons form a Fermi gas moving through a lattice of positive ions. Their thermal speeds are enormous ($v_{\\mathrm{th}} \\sim 10^6\\,\\mathrm{m/s}$), while the field-induced drift is sluggish ($v_d \\sim 10^{-4}\\,\\mathrm{m/s}$). Between collisions of mean time $\\tau$, the field accelerates electrons by $\\mathbf{a} = -e\\mathbf{E}/m_e$, leaving a net drift
$$\\mathbf{v}_d = -\\frac{e\\tau}{m_e}\\mathbf{E}.$$
Then $I = n e v_d A$ and $E = V_R/L$ recover $V_R = I(\\rho_R L/A) = IR$. Stretching a wire at constant volume ($L\\to 2L$, $A\\to A/2$) quadruples $R$ — a GRE favorite. Energy in the circuit is carried by the Poynting field, not by the crawling electrons.`,

    derivationSteps: [
      {
        step: 1,
        title: 'Drude equation of motion',
        latex: "m_e \\frac{d\\langle\\mathbf{v}\\rangle}{dt} = -e\\mathbf{E} - \\frac{m_e}{\\tau}\\langle\\mathbf{v}\\rangle",
        description: "Electrostatic force $-e\\mathbf{E}$ plus a momentum-relaxing drag from lattice collisions."
      },
      {
        step: 2,
        title: 'Steady-state drift',
        latex: "\\mathbf{v}_d = -\\frac{e\\tau}{m_e}\\mathbf{E}",
        description: "Terminal drift is linear in $\\mathbf{E}$. Mobility $\\mu_e = e\\tau/m_e$."
      },
      {
        step: 3,
        title: 'Current density',
        latex: "\\mathbf{J} = -n e \\mathbf{v}_d = \\sigma \\mathbf{E},\\quad \\sigma = \\frac{n e^2 \\tau}{m_e}",
        description: "Resistivity $\\rho_R = 1/\\sigma = m_e/(n e^2 \\tau)$."
      },
      {
        step: 4,
        title: 'Geometry',
        latex: "I = \\sigma E A = \\sigma (V_R/L) A",
        description: "Uniform cylinder: $E = V_R/L$ and $I = JA$."
      },
      {
        step: 5,
        title: "Ohm's law",
        latex: "V_R = I\\,\\rho_R L/A = IR",
        description: "Resistance $R = \\rho_R L/A$."
      }
    ],

    limitingCases: [
      {
        name: 'Ideal conductor ($R \\to 0$)',
        condition: '\\sigma \\to \\infty',
        formula: 'V_R = 0 \\quad (\\mathbf{E}_{\\mathrm{in}} = 0\\ \\mathrm{for\\ finite}\\ I)',
        description: 'A superconductor below $T_c$ carries current with strictly zero voltage drop.'
      },
      {
        name: 'Open circuit ($R \\to \\infty$)',
        condition: '\\sigma \\to 0',
        formula: 'I = 0,\\quad V_{\\mathrm{gap}} = \\mathcal{E}',
        description: 'No current; the source EMF appears entirely across the gap.'
      },
      {
        name: 'Metal, $T \\gtrsim T_{\\mathrm{Debye}}$',
        condition: '\\rho(T) \\propto T',
        formula: '\\rho(T) = \\rho_0[1 + \\alpha(T - T_0)]',
        description: 'Phonon amplitude grows with $T$, shortening $\\tau$ and raising $R$.'
      },
      {
        name: 'Intrinsic semiconductor',
        condition: 'n(T) \\propto e^{-E_g/(2k_B T)}',
        formula: '\\rho(T) \\propto e^{+E_g/(2k_B T)}',
        description: 'Carrier activation wins: resistivity falls as $T$ rises.'
      }
    ],

    greTraps: [
      {
        trap: 'Wire stretch at constant volume',
        description: 'If $L\\to 2L$ at fixed volume, $A\\to A/2$ and $R\\to 4R$, not $2R$.',
        proTip: 'Always write $R = \\rho L/A$ and impose $AL = \\mathrm{const}$ before scaling.'
      },
      {
        trap: 'Drift vs signal speed',
        description: 'Electrons crawl at $v_d \\sim 0.1\\,\\mathrm{mm/s}$. The lamp lights because $\\mathbf{S} = \\mathbf{E}\\times\\mathbf{B}/\\mu_0$ travels at $\\sim c$.',
        proTip: 'Never equate $v_d$ with the speed of electrical energy.'
      },
      {
        trap: 'Internal resistance and max power',
        description: 'A battery $\\mathcal{E}, r$ delivers $P_{\\max} = \\mathcal{E}^2/(4r)$ when $R = r$. Terminal voltage is then $\\mathcal{E}/2$.',
        proTip: 'Matched load is 50% efficient; that is the power theorem, not a contradiction of Ohm.'
      },
      {
        trap: "Ohm is constitutive, not Maxwell",
        description: 'Diodes, filaments, and superconductors are non-ohmic: $V/I$ is not a constant.',
        proTip: 'Apply $V = IR$ only where $\\mathbf{J} = \\sigma\\mathbf{E}$ with constant $\\sigma$.'
      }
    ],

    parameters: [
      { id: 'emf', label: 'Battery EMF ($\\mathcal{E}$)', min: 1.0, max: 24.0, step: 0.5, default: 12.0, unit: 'V' },
      { id: 'resistorR', label: 'Load ($R_0$)', min: 1.0, max: 20.0, step: 0.5, default: 6.0, unit: '\\Omega' },
      { id: 'internalR', label: 'Internal ($r$)', min: 0.0, max: 5.0, step: 0.2, default: 1.0, unit: '\\Omega' },
      { id: 'temperature', label: 'Lattice $T$', min: 80, max: 600, step: 10, default: 300, unit: 'K' },
      { id: 'stretch2x', label: 'Stretch $L\\to 2L$ ($R\\to 4R$)', type: 'toggle', default: false },
      { id: 'simSpeed', label: 'Simulation Speed', min: 0.2, max: 3.0, step: 0.2, default: 1.0, unit: 'x' }
    ],

    init: function (container, state) {
      state = state || {};
      seedOhmCarriers(state);
    },

    draw: function (ctx, width, height, state, dt) {
      var size = canvasSize(width, height);
      width = size.w;
      height = size.h;
      dt = simDt(state, dt);
      state = state || {};
      state.time = (state.time || 0) + dt;
      if (!state._e || !state._ions) seedOhmCarriers(state);

      var emf = Math.max(0.01, numParam(state, 'emf', 12));
      var R0 = Math.max(0.2, numParam(state, 'resistorR', 6));
      var rInt = Math.max(0, numParam(state, 'internalR', 1));
      var T = clamp(numParam(state, 'temperature', 300), 40, 900);
      var stretch = flagParam(state, 'stretch2x', false);
      var geoR = R0 * (stretch ? 4 : 1);
      var effectiveR = Math.max(0.05, geoR * (1 + 0.0039 * (T - 293)));
      var current = emf / (effectiveR + rInt);
      var vLoad = current * effectiveR;
      var power = current * vLoad;
      var nCu = 8.47e28;
      var eCharge = 1.602e-19;
      var Awire = 1.0e-6;
      var vdPhys = current / (nCu * eCharge * Awire);
      var vthPhys = 1.57e6 * Math.sqrt(T / 300);

      legend("Ohm $V_R = I R$", [
        { label: '$I$', value: '$' + current.toFixed(2) + '\\,\\mathrm{A}$' },
        { label: '$V_R$', value: '$' + vLoad.toFixed(2) + '\\,\\mathrm{V}$' },
        { label: '$R$', value: '$' + effectiveR.toFixed(2) + '\\,\\Omega$' },
        { label: '$r$', value: '$' + rInt.toFixed(1) + '\\,\\Omega$' },
        { label: '$P = I V_R$', value: '$' + power.toFixed(2) + '\\,\\mathrm{W}$' },
        { label: '$v_d$', value: '$' + (vdPhys * 1e3).toFixed(3) + '\\,\\mathrm{mm/s}$' },
        { label: '$v_{\\mathrm{th}}/v_d$', value: vdPhys > 1e-12 ? '$' + (vthPhys / vdPhys).toExponential(1) + '$' : '—' }
      ]);

      creamFill(ctx, width, height);

      var pad = 18;
      var wireW = width - pad * 2;
      var wireH = clamp(height * (stretch ? 0.28 : 0.42), 70, height - 70);
      if (stretch) {
        wireW = width - pad * 2;
      } else {
        wireW = (width - pad * 2) * 0.72;
      }
      var wireX = (width - wireW) / 2;
      var wireY = (height - wireH) / 2;

      var grad = ctx.createLinearGradient(wireX, 0, wireX + wireW, 0);
      grad.addColorStop(0, 'rgba(204, 120, 92, 0.38)');
      grad.addColorStop(1, 'rgba(93, 184, 166, 0.30)');
      ctx.fillStyle = grad;
      panelPath(ctx, wireX, wireY, wireW, wireH, 12);
      ctx.fill();
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 1.6;
      ctx.stroke();

      ctx.fillStyle = C.coral;
      ctx.fillRect(wireX, wireY, 10, wireH);
      ctx.fillStyle = C.teal;
      ctx.fillRect(wireX + wireW - 10, wireY, 10, wireH);
      haloLabel(ctx, '+', wireX + 5, wireY - 12, { color: C.coral });
      haloLabel(ctx, '−', wireX + wireW - 5, wireY - 12, { color: C.teal });

      var eY = wireY - 22;
      if (eY > 16) {
        arrow(ctx, wireX + 36, eY, wireX + wireW - 36, eY, C.coral, 1.8);
        haloLabel(ctx, 'E', (wireX + wireX + wireW) / 2, eY - 12, { color: C.coral });
      }

      var innerX = wireX + 14;
      var innerY = wireY + 8;
      var innerW = wireW - 28;
      var innerH = wireH - 16;
      var thermalAmp = Math.sqrt(T / 300) * 2.2;
      var ionR = stretch ? 4.2 : 5.5;
      var i, site, sx, sy, jitterX, jitterY;
      ctx.save();
      panelPath(ctx, wireX + 10, wireY + 4, wireW - 20, wireH - 8, 8);
      ctx.clip();

      for (i = 0; i < state._ions.length; i++) {
        site = state._ions[i];
        jitterX = Math.sin(state.time * 22 + i * 1.7) * thermalAmp;
        jitterY = Math.cos(state.time * 19 + i * 2.1) * thermalAmp;
        sx = innerX + site.fx * innerW + jitterX;
        sy = innerY + site.fy * innerH + jitterY;
        ctx.fillStyle = C.gold;
        ctx.beginPath();
        ctx.arc(sx, sy, ionR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = C.deep;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      var vth = 1.6 * Math.sqrt(Math.max(0.2, T / 300));
      var lambda = 6 * (T / 300);
      var visVd = clamp(0.12 + 0.09 * current, 0.08, 0.7);
      var el;
      for (i = 0; i < state._e.length; i++) {
        el = state._e[i];
        if (collideP(lambda, dt)) {
          var phi = Math.random() * 2 * Math.PI;
          el.vx = Math.cos(phi);
          el.vy = Math.sin(phi);
        }
        el.x += (el.vx * vth - visVd) * dt;
        el.y += el.vy * vth * dt * 0.55;
        if (el.x > 1) el.x -= 1;
        if (el.x < 0) el.x += 1;
        if (el.y < 0.06) { el.y = 0.06; el.vy = Math.abs(el.vy); }
        if (el.y > 0.94) { el.y = 0.94; el.vy = -Math.abs(el.vy); }
        sx = innerX + el.x * innerW;
        sy = innerY + el.y * innerH;
        ctx.fillStyle = C.coral;
        ctx.beginPath();
        ctx.arc(sx, sy, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(wireX, wireY + wireH + 16);
      ctx.lineTo(wireX + wireW, wireY + wireH + 16);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(wireX, wireY + wireH + 12);
      ctx.lineTo(wireX, wireY + wireH + 20);
      ctx.moveTo(wireX + wireW, wireY + wireH + 12);
      ctx.lineTo(wireX + wireW, wireY + wireH + 20);
      ctx.stroke();
      haloLabel(ctx, stretch ? '2L' : 'L', wireX + wireW / 2, wireY + wireH + 28, { color: C.muted });
    },

    challenge: {
      question: "A cylindrical copper wire with initial resistance $R_0$ is uniformly drawn so that its length doubles ($L_{\\mathrm{new}} = 2 L_0$) at constant mass and density. It is then connected across a real battery of EMF $\\mathcal{E}$ and internal resistance $r = R_0$. What are the current $I$ and the power $P$ dissipated in the stretched wire?",
      options: [
        "$I = \\frac{\\mathcal{E}}{3 R_0}, \\quad P = \\frac{2\\mathcal{E}^2}{9 R_0}$",
        "$I = \\frac{\\mathcal{E}}{5 R_0}, \\quad P = \\frac{4\\mathcal{E}^2}{25 R_0}$",
        "$I = \\frac{\\mathcal{E}}{8 R_0}, \\quad P = \\frac{\\mathcal{E}^2}{16 R_0}$",
        "$I = \\frac{\\mathcal{E}}{4 R_0}, \\quad P = \\frac{\\mathcal{E}^2}{8 R_0}$",
        "$I = \\frac{\\mathcal{E}}{5 R_0}, \\quad P = \\frac{2\\mathcal{E}^2}{25 R_0}$"
      ],
      correct: 1,
      explanation: "Constant volume: $L\\to 2L_0$ implies $A\\to A_0/2$, so $R_{\\mathrm{new}} = \\rho (2L_0)/(A_0/2) = 4R_0$. Loop resistance $4R_0 + R_0 = 5R_0$, hence $I = \\mathcal{E}/(5R_0)$ and $P = I^2 R_{\\mathrm{new}} = 4\\mathcal{E}^2/(25 R_0)$."
    }
  };

  /* -------------------------------------------------------------------------- */
  /* cpgf-4.14  First law  ΔU = Q − W                                            */
  /* Picture: one P–V plane. Shaded area is W; the state point walks the path.   */
  /* -------------------------------------------------------------------------- */
  PGRE.visualizers['cpgf-4.14'] = {
    id: 'cpgf-4.14',
    topic: 'th',
    title: 'First Law of Thermodynamics: $\\Delta U = Q - W$',
    formulaLatex: '\\Delta U = Q - W = \\int \\delta Q - \\int P\\,dV',
    physicalStory: `The First Law is energy conservation for a closed system. Internal energy $U$ is a state function (for an ideal gas, $U = n C_V T$). Heat $Q$ and work $W = \\int P\\,dV$ (physics sign: work *by* the system) are path-dependent. Their difference is not:
$$\\Delta U = Q - W.$$
On a $P$–$V$ diagram the work is the area under the path. Clockwise cycles enclose $W_{\\mathrm{net}} > 0$ (engines); counterclockwise cycles are refrigerators. Adiabats ($Q=0$) fall steeper than isotherms by a factor $\\gamma$.`,

    derivationSteps: [
      {
        step: '1. Energy accounting',
        latex: 'dU = \\delta Q - \\delta W',
        explanation: 'For a stationary closed system, all transfers change the microscopic internal energy.'
      },
      {
        step: '2. $P\\,dV$ work',
        latex: '\\delta W = P\\,dV,\\qquad W = \\int_{V_i}^{V_f} P(V)\\,dV',
        explanation: '$W>0$ on expansion. Chemistry uses the opposite sign in $\\Delta U = Q + W$.'
      },
      {
        step: '3. Ideal gas',
        latex: 'U = n C_V T = \\tfrac{f}{2} n R T,\\qquad C_P = C_V + R',
        explanation: 'Joule: $U=U(T)$ only. Equipartition fixes $f=3$ (monatomic) or $5$ (diatomic, room $T$).'
      },
      {
        step: '4. Cycles',
        latex: '\\oint dU = 0 \\implies Q_{\\mathrm{net}} = W_{\\mathrm{net}} = \\oint P\\,dV',
        explanation: 'Enclosed area on the indicator diagram is the net work of the cycle.'
      }
    ],

    limitingCases: [
      {
        name: 'Isochoric',
        condition: 'dV = 0',
        formula: 'W = 0,\\quad \\Delta U = Q = n C_V \\Delta T',
        explanation: 'No boundary displacement: every joule of heat stays as $\\Delta U$.'
      },
      {
        name: 'Isobaric',
        condition: 'P = \\mathrm{const}',
        formula: 'W = P\\Delta V = nR\\Delta T,\\quad Q = n C_P \\Delta T',
        explanation: 'Heat pays for both $\\Delta U$ and expansion work. $W/Q = (\\gamma-1)/\\gamma$.'
      },
      {
        name: 'Isothermal (ideal gas)',
        condition: 'T = \\mathrm{const}',
        formula: '\\Delta U = 0,\\quad Q = W = nRT\\ln(V_f/V_i)',
        explanation: 'All absorbed heat leaves as work.'
      },
      {
        name: 'Adiabatic',
        condition: 'Q = 0',
        formula: 'P V^{\\gamma} = \\mathrm{const},\\quad \\Delta U = -W',
        explanation: 'Expansion cools the gas: work is paid from $U$.'
      },
      {
        name: 'Free expansion',
        condition: 'Q = 0,\\ W = 0',
        formula: '\\Delta U = 0 \\implies T_f = T_i\\ (\\mathrm{ideal}),\\quad \\Delta S > 0',
        explanation: 'Into vacuum $P_{\\mathrm{ext}}=0$, so $W=0$. Irreversible, but $U$ is unchanged.'
      }
    ],

    greTraps: [
      {
        trap: 'Physics vs chemistry sign',
        description: 'Physics: $\\Delta U = Q - W$ with $W=\\int P\\,dV$ by the system. Chemistry: $\\Delta U = Q + W$ with $W=-\\int P\\,dV$.',
        proTip: "Read the words: 'work done by' vs 'work done on'."
      },
      {
        trap: '$U$ depends only on the endpoints',
        description: 'For an ideal gas $\\Delta U = n C_V \\Delta T$ on *any* path, reversible or not. $Q$ and $W$ do not.',
        proTip: 'If $P_i V_i = P_f V_f$ then $T_i=T_f$ and $\\Delta U=0$, whatever the wiggly path.'
      },
      {
        trap: 'Adiabat vs isotherm slope',
        description: '$(dP/dV)_{\\mathrm{ad}} = -\\gamma P/V$ vs $(dP/dV)_{\\mathrm{iso}} = -P/V$.',
        proTip: 'The steeper curve is the adiabat ($\\gamma=5/3$ or $7/5$).'
      }
    ],

    parameters: [
      {
        id: 'process',
        label: 'Process',
        type: 'select',
        options: [
          { value: 'isothermal', label: 'Isothermal ($\\Delta U = 0$)' },
          { value: 'adiabatic', label: 'Adiabatic ($Q = 0$)' },
          { value: 'isobaric', label: 'Isobaric ($P$ const)' },
          { value: 'isochoric', label: 'Isochoric ($W = 0$)' }
        ],
        default: 'isothermal'
      },
      { id: 'vRatio', label: 'Extent ($V_f/V_i$ or $P_f/P_i$)', min: 1.2, max: 4.0, step: 0.1, default: 2.5, unit: 'x' },
      {
        id: 'gasType',
        label: 'Gas',
        type: 'select',
        options: [
          { value: 'monatomic', label: 'Monatomic ($\\gamma = 5/3$)' },
          { value: 'diatomic', label: 'Diatomic ($\\gamma = 7/5$)' }
        ],
        default: 'monatomic'
      },
      { id: 'simSpeed', label: 'Simulation Speed', min: 0.2, max: 3.0, step: 0.2, default: 1.0, unit: 'x' }
    ],

    init: function (container, state) {
      state = state || {};
      state._phi = 0;
    },

    draw: function (ctx, width, height, state, dt) {
      var size = canvasSize(width, height);
      width = size.w;
      height = size.h;
      state = state || {};
      var dtEff = simDt(state, dt);
      state._phi = (state._phi || 0) + dtEff * 0.42;
      var progress = 0.5 - 0.5 * Math.cos(state._phi);

      var process = state.process || 'isothermal';
      var vRatio = clamp(numParam(state, 'vRatio', 2.5), 1.2, 4.0);
      var isMonatomic = (state.gasType || 'monatomic') === 'monatomic';
      var gamma = isMonatomic ? 5 / 3 : 7 / 5;
      var f = isMonatomic ? 3 : 5;

      var P1 = 3.2;
      var V1 = 1.0;
      var T1 = P1 * V1;
      var V2 = V1 * vRatio;
      var P2, T2, curV, curP, curT, W_val, DeltaU_val, Q_val;
      var curve = [];
      var nPts = 80;
      var i, v, p, tFrac;

      if (process === 'isothermal') {
        P2 = (P1 * V1) / V2;
        T2 = T1;
        curV = V1 + (V2 - V1) * progress;
        curP = (P1 * V1) / curV;
        curT = T1;
        W_val = T1 * Math.log(curV / V1);
        DeltaU_val = 0;
        Q_val = W_val;
        for (i = 0; i <= nPts; i++) {
          v = V1 + (V2 - V1) * (i / nPts);
          curve.push({ v: v, p: (P1 * V1) / v });
        }
      } else if (process === 'adiabatic') {
        P2 = P1 * Math.pow(V1 / V2, gamma);
        T2 = P2 * V2;
        curV = V1 + (V2 - V1) * progress;
        curP = P1 * Math.pow(V1 / curV, gamma);
        curT = curP * curV;
        W_val = (P1 * V1 - curP * curV) / (gamma - 1);
        DeltaU_val = (f / 2) * (curT - T1);
        Q_val = 0;
        for (i = 0; i <= nPts; i++) {
          v = V1 + (V2 - V1) * (i / nPts);
          curve.push({ v: v, p: P1 * Math.pow(V1 / v, gamma) });
        }
      } else if (process === 'isobaric') {
        P2 = P1;
        T2 = P2 * V2;
        curV = V1 + (V2 - V1) * progress;
        curP = P1;
        curT = curP * curV;
        W_val = P1 * (curV - V1);
        DeltaU_val = (f / 2) * (curT - T1);
        Q_val = DeltaU_val + W_val;
        for (i = 0; i <= nPts; i++) {
          v = V1 + (V2 - V1) * (i / nPts);
          curve.push({ v: v, p: P1 });
        }
      } else {
        V2 = V1;
        P2 = P1 * vRatio;
        curV = V1;
        curP = P1 + (P2 - P1) * progress;
        curT = curP * curV;
        W_val = 0;
        DeltaU_val = (f / 2) * (curT - T1);
        Q_val = DeltaU_val;
        for (i = 0; i <= nPts; i++) {
          p = P1 + (P2 - P1) * (i / nPts);
          curve.push({ v: V1, p: p });
        }
      }

      var procName = process;
      legend('First law $\\Delta U = Q - W$', [
        { label: 'Path', value: procName },
        { label: '$P$', value: '$' + curP.toFixed(2) + '\\,P_0$' },
        { label: '$V$', value: '$' + curV.toFixed(2) + '\\,V_0$' },
        { label: '$T$', value: '$' + curT.toFixed(2) + '\\,T_0$' },
        { label: '$Q$', value: '$' + (Q_val >= 0 ? '+' : '') + Q_val.toFixed(2) + '$' },
        { label: '$W$', value: '$' + (W_val >= 0 ? '+' : '') + W_val.toFixed(2) + '$' },
        { label: '$\\Delta U$', value: '$' + (DeltaU_val >= 0 ? '+' : '') + DeltaU_val.toFixed(2) + '$' },
        { label: '$\\gamma$', value: isMonatomic ? '$5/3$' : '$7/5$' }
      ]);

      creamFill(ctx, width, height);
      lightGrid(ctx, width, height, 40);

      var padL = 48;
      var padR = 22;
      var padT = 28;
      var padB = 36;
      var originX = padL;
      var originY = height - padB;
      var plotW = width - padL - padR;
      var plotH = height - padT - padB;
      var maxV = 4.8;
      var maxP = 4.6;
      function mapV(vv) { return originX + (vv / maxV) * plotW; }
      function mapP(pp) { return originY - (pp / maxP) * plotH; }

      ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.10);
      ctx.lineWidth = 1;
      for (i = 1; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo(mapV(i), mapP(0));
        ctx.lineTo(mapV(i), mapP(maxP));
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(mapV(0), mapP(i));
        ctx.lineTo(mapV(maxV), mapP(i));
        ctx.stroke();
      }

      ctx.save();
      ctx.strokeStyle = 'rgba(212, 160, 23, 0.28)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.2;
      [2.0, 3.2, 4.4].forEach(function (Tiso) {
        ctx.beginPath();
        var started = false;
        for (v = 0.7; v <= maxV; v += 0.08) {
          p = Tiso / v;
          if (p > maxP || p < 0) continue;
          if (!started) { ctx.moveTo(mapV(v), mapP(p)); started = true; }
          else ctx.lineTo(mapV(v), mapP(p));
        }
        ctx.stroke();
      });
      ctx.setLineDash([]);
      ctx.restore();

      if (process === 'adiabatic') {
        ctx.save();
        ctx.strokeStyle = 'rgba(93, 184, 166, 0.45)';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        for (v = V1; v <= V2; v += 0.05) {
          p = (P1 * V1) / v;
          if (v === V1) ctx.moveTo(mapV(v), mapP(p));
          else ctx.lineTo(mapV(v), mapP(p));
        }
        ctx.stroke();
        ctx.restore();
      }

      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(mapV(0), mapP(maxP));
      ctx.lineTo(mapV(0), mapP(0));
      ctx.lineTo(mapV(maxV), mapP(0));
      ctx.stroke();
      haloLabel(ctx, 'P', mapV(0) + 14, mapP(maxP) + 4, { color: C.muted });
      haloLabel(ctx, 'V', mapV(maxV) - 8, originY - 14, { color: C.muted, align: 'right' });

      var activeN = Math.max(2, Math.floor(curve.length * progress));
      if (process !== 'isochoric' && curve.length > 1) {
        ctx.beginPath();
        ctx.moveTo(mapV(curve[0].v), mapP(0));
        ctx.lineTo(mapV(curve[0].v), mapP(curve[0].p));
        for (i = 1; i < activeN; i++) ctx.lineTo(mapV(curve[i].v), mapP(curve[i].p));
        ctx.lineTo(mapV(curve[activeN - 1].v), mapP(0));
        ctx.closePath();
        ctx.fillStyle = 'rgba(204, 120, 92, 0.22)';
        ctx.fill();
      }

      ctx.strokeStyle = C.coral;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      for (i = 0; i < curve.length; i++) {
        if (i === 0) ctx.moveTo(mapV(curve[i].v), mapP(curve[i].p));
        else ctx.lineTo(mapV(curve[i].v), mapP(curve[i].p));
      }
      ctx.stroke();

      ctx.fillStyle = C.gold;
      ctx.strokeStyle = C.deep;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(mapV(curV), mapP(curP), 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = C.muted;
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (i = 1; i <= 4; i++) ctx.fillText(String(i), mapV(i), originY + 6);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (i = 1; i <= 4; i++) ctx.fillText(String(i), originX - 8, mapP(i));
    },

    challenge: {
      question: "One mole of a monatomic ideal gas ($C_V = \\frac{3}{2}R,\\; C_P = \\frac{5}{2}R$) expands isobarically from $V_0$ to $2V_0$. What fraction of the heat $Q$ absorbed is converted into work $W$ done by the gas?",
      options: [
        "$2/3\\ (66.7\\%)$",
        "$2/5\\ (40.0\\%)$",
        "$3/5\\ (60.0\\%)$",
        "$1/2\\ (50.0\\%)$",
        "$5/2\\ (250\\%)$"
      ],
      correct: 1,
      explanation: "Isobaric: $W = P_0\\Delta V = R\\Delta T$ and $Q = C_P\\Delta T = \\tfrac{5}{2} R\\Delta T$. Thus $W/Q = 2/5$. The rest, $3/5$, is $\\Delta U = C_V\\Delta T$."
    }
  };

  /* -------------------------------------------------------------------------- */
  /* cpgf-5.18  Heisenberg  σx σp ≥ ħ/2                                          */
  /* Picture: one phase-space ellipse. Squeeze x, it grows in p. Free shear.     */
  /* -------------------------------------------------------------------------- */
  PGRE.visualizers['cpgf-5.18'] = {
    id: 'cpgf-5.18',
    topic: 'qm',
    title: 'Heisenberg Uncertainty Principle: $\\sigma_x \\sigma_p \\ge \\hbar/2$',
    formulaLatex: '\\sigma_x \\sigma_p \\ge \\frac{\\hbar}{2}, \\qquad [\\hat{x}, \\hat{p}] = i\\hbar',
    physicalStory: `The bound $\\sigma_x \\sigma_p \\ge \\hbar/2$ is Cauchy–Schwarz on the commutator $[\\hat{x},\\hat{p}]=i\\hbar$. A Gaussian saturates it. In phase space that state is an untilted ellipse of area $\\pi\\hbar$.

Free evolution shears the ellipse: $\\dot x = p/m$, $\\dot p = 0$. The momentum width $\\sigma_p$ is frozen, but $\\sigma_x(t) = \\sigma_x(0)\\sqrt{1+(t/\\tau)^2}$ with $\\tau = 2m\\sigma_x(0)^2/\\hbar$, so the product rises. The shear is a position–momentum correlation (chirp). Squeezing $\\sigma_x(0)$ makes a tall thin ellipse: you cannot flatten the blob below $\\hbar/2$.`,

    derivationSteps: [
      {
        step: '1. Canonical commutator',
        latex: '[\\hat{x},\\hat{p}] = i\\hbar',
        explanation: 'No common eigenstate of position and momentum exists.'
      },
      {
        step: '2. Robertson relation',
        latex: '\\sigma_A^2\\sigma_B^2 \\ge \\tfrac{1}{4}|\\langle[\\hat A,\\hat B]\\rangle|^2',
        explanation: 'Cauchy–Schwarz on $|\\alpha\\rangle=(\\hat A-\\langle A\\rangle)|\\psi\\rangle$ and $|\\beta\\rangle=(\\hat B-\\langle B\\rangle)|\\psi\\rangle$.'
      },
      {
        step: '3. Bound',
        latex: '\\sigma_x\\sigma_p \\ge \\hbar/2',
        explanation: 'The rigorous RMS statement. Heuristic estimates often write $\\hbar$ or $h$.'
      },
      {
        step: '4. Gaussian saturation',
        latex: '\\psi(x)\\propto e^{-(x-x_0)^2/(4\\sigma_x^2)+i p_0 x/\\hbar} \\implies \\sigma_x\\sigma_p=\\hbar/2',
        explanation: 'Equality iff the wavefunction is an unchirped Gaussian (SHO ground state).'
      }
    ],

    limitingCases: [
      {
        name: 'Spatial pinch',
        condition: '\\sigma_x \\to 0',
        formula: '\\sigma_p \\to \\infty,\\quad \\langle T\\rangle \\to \\infty',
        explanation: 'A Dirac packet has infinite kinetic energy.'
      },
      {
        name: 'Plane wave',
        condition: '\\sigma_p \\to 0',
        formula: '\\sigma_x \\to \\infty,\\quad |\\psi(x)|^2 = \\mathrm{const}',
        explanation: 'Sharp momentum is complete delocalization.'
      },
      {
        name: 'SHO ground state',
        condition: '\\sigma_x=\\sqrt{\\hbar/(2m\\omega)}',
        formula: '\\sigma_x\\sigma_p = \\hbar/2,\\quad E_0=\\hbar\\omega/2',
        explanation: 'Zero-point energy is the uncertainty floor in a well.'
      },
      {
        name: 'Energy–time (Mandelstam–Tamm)',
        condition: '\\Delta t = \\sigma_Q/|d\\langle Q\\rangle/dt|',
        formula: '\\Delta E\\,\\Delta t \\ge \\hbar/2',
        explanation: 'A resonance of width $\\Gamma$ lives a time $\\sim\\hbar/\\Gamma$.'
      }
    ],

    greTraps: [
      {
        trap: '$\\hbar/2$ vs $\\hbar$ vs $h$',
        description: 'The theorem is $\\sigma_x\\sigma_p\\ge\\hbar/2$ for RMS deviations. Order-of-magnitude estimates use $\\hbar$ or $h$.',
        proTip: 'If the question says "rigorous lower bound", pick $\\hbar/2$.'
      },
      {
        trap: 'Confinement energy',
        description: 'Size $L$ implies $\\Delta p\\sim\\hbar/L$, so $E\\sim\\hbar^2/(2m L^2)$ (nonrel) or $\\hbar c/L$ (ultrarel).',
        proTip: 'This estimates ground states of wells, nuclei, and dots in one line.'
      },
      {
        trap: 'Chirp raises the product',
        description: 'A quadratic phase $e^{i\\alpha x^2}$ leaves $|\\psi(x)|^2$ alone but widens $\\sigma_p$.',
        proTip: 'Only unchirped Gaussians sit on the bound. Free evolution generates chirp.'
      }
    ],

    parameters: [
      { id: 'sigmaX', label: 'Prepared width $\\sigma_x(0)$', min: 0.25, max: 1.8, step: 0.05, default: 0.7, unit: 'x_0' },
      { id: 'evolve', label: 'Free evolution (shear)', type: 'toggle', default: true },
      { id: 'simSpeed', label: 'Simulation Speed', min: 0.2, max: 3.0, step: 0.2, default: 1.0, unit: 'x' }
    ],

    init: function (container, state) {
      state = state || {};
      seedPhase(state, 44, 0.7, 0);
    },

    draw: function (ctx, width, height, state, dt) {
      var size = canvasSize(width, height);
      width = size.w;
      height = size.h;
      state = state || {};
      var dtEff = simDt(state, dt);
      var sigma0 = clamp(numParam(state, 'sigmaX', 0.7), 0.2, 2.2);
      var evolve = flagParam(state, 'evolve', true);
      var hbar = 1;
      var m = 1;
      var sigmaP = hbar / (2 * sigma0);
      var tau = 2 * m * sigma0 * sigma0 / hbar;

      if (!state._phase || state._sig0 !== sigma0) seedPhase(state, 44, sigma0, 0);
      if (evolve) {
        state._tPack = (state._tPack || 0) + dtEff;
        if (state._tPack > 5.5 * tau) {
          seedPhase(state, 44, sigma0, 0);
        }
      } else {
        if ((state._tPack || 0) !== 0) seedPhase(state, 44, sigma0, 0);
      }

      var t = state._tPack || 0;
      var xi = t / Math.max(tau, 1e-6);
      var sigmaX = sigma0 * Math.sqrt(1 + xi * xi);
      var product = sigmaX * sigmaP;
      var isMin = product < 0.51;
      var Sxx = sigmaX * sigmaX;
      var Spp = sigmaP * sigmaP;
      var Sxp = xi / 2;

      legend('Heisenberg $\\sigma_x\\sigma_p\\ge\\hbar/2$', [
        { label: '$\\sigma_x$', value: '$' + sigmaX.toFixed(2) + '$' },
        { label: '$\\sigma_p$', value: '$' + sigmaP.toFixed(2) + '\\,\\hbar$' },
        { label: '$\\sigma_x\\sigma_p$', value: '$' + product.toFixed(3) + '\\,\\hbar$' },
        { label: 'Bound', value: '$\\hbar/2 = 0.500\\,\\hbar$' },
        { label: 'State', value: isMin ? 'minimum (Gaussian)' : 'sheared (chirped)' }
      ]);

      creamFill(ctx, width, height);
      lightGrid(ctx, width, height, 40);

      var padL = 44;
      var padR = 20;
      var padT = 24;
      var padB = 28;
      var ox = padL + (width - padL - padR) / 2;
      var oy = padT + (height - padT - padB) / 2;
      var xRange = 6.4;
      var pRange = 3.6;
      var sx = ((width - padL - padR) / 2) / xRange;
      var sy = ((height - padT - padB) / 2) / pRange;
      function X(x) { return ox + x * sx; }
      function P(p) { return oy - p * sy; }

      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(padL, oy);
      ctx.lineTo(width - padR, oy);
      ctx.moveTo(ox, height - padB);
      ctx.lineTo(ox, padT);
      ctx.stroke();
      haloLabel(ctx, 'x', width - padR - 6, oy + 14, { color: C.muted, align: 'right' });
      haloLabel(ctx, 'p', ox + 14, padT + 8, { color: C.muted, align: 'left' });

      function drawCovEllipse(sxx, spp, sxp, stroke, fill, dash) {
        var a = Math.max(sxx, 1e-8);
        var c = sxp;
        var b = Math.max(spp, 1e-8);
        var l21 = c / Math.sqrt(a);
        var l22 = Math.sqrt(Math.max(1e-8, b - (c * c) / a));
        var l11 = Math.sqrt(a);
        ctx.save();
        ctx.beginPath();
        var k, ang, ux, up, px, py;
        for (k = 0; k <= 64; k++) {
          ang = (k / 64) * 2 * Math.PI;
          ux = Math.cos(ang);
          up = Math.sin(ang);
          px = l11 * ux;
          py = l21 * ux + l22 * up;
          if (k === 0) ctx.moveTo(X(px), P(py));
          else ctx.lineTo(X(px), P(py));
        }
        ctx.closePath();
        if (fill) {
          ctx.fillStyle = fill;
          ctx.fill();
        }
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2.2;
        if (dash) ctx.setLineDash(dash);
        ctx.stroke();
        ctx.restore();
      }

      drawCovEllipse(sigma0 * sigma0, sigmaP * sigmaP, 0, 'rgba(93, 184, 166, 0.70)', null, [5, 4]);
      drawCovEllipse(Sxx, Spp, Sxp, C.coral, 'rgba(204, 120, 92, 0.16)', null);

      var j, pt, xNew;
      ctx.fillStyle = C.gold;
      for (j = 0; j < state._phase.length; j++) {
        pt = state._phase[j];
        if (evolve) {
          xNew = pt.x + (pt.p / m) * dtEff;
          pt.x = xNew;
        }
        ctx.beginPath();
        ctx.arc(X(pt.x), P(pt.p), 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    },

    challenge: {
      question: "A particle of mass $m$ is in the ground state of a 1D harmonic oscillator of frequency $\\omega$, $\\psi_0(x) = \\bigl(m\\omega/(\\pi\\hbar)\\bigr)^{1/4}\\exp(-m\\omega x^2/(2\\hbar))$. What is $\\sigma_x\\sigma_p$?",
      options: [
        "$\\hbar$",
        "$\\hbar/2$",
        "$\\hbar/\\sqrt{2}$",
        "$3\\hbar/2$",
        "$0$"
      ],
      correct: 1,
      explanation: "The SHO ground state is an unchirped Gaussian with $\\sigma_x=\\sqrt{\\hbar/(2m\\omega)}$ and $\\sigma_p=\\sqrt{m\\hbar\\omega/2}$. The product is exactly $\\hbar/2$, saturating Heisenberg. Excited states have $\\sigma_x\\sigma_p=(n+1/2)\\hbar$."
    }
  };

  /* -------------------------------------------------------------------------- */
  /* cpgf-4.32  Cp = (∂Q/∂T)_P                                                   */
  /* Picture: same heat, two chambers. Free piston stays cooler; locked runs hot.*/
  /* -------------------------------------------------------------------------- */
  PGRE.visualizers['cpgf-4.32'] = {
    id: 'cpgf-4.32',
    topic: 'th',
    title: 'Heat Capacity at Constant Pressure: $C_P = (\\partial Q/\\partial T)_P$',
    formulaLatex: 'C_P = \\left(\\frac{\\partial Q}{\\partial T}\\right)_P = \\left(\\frac{\\partial H}{\\partial T}\\right)_P = T \\left(\\frac{\\partial S}{\\partial T}\\right)_P',
    physicalStory: `Heat capacity $C=\\delta Q/dT$ depends on the constraint. At fixed volume, $W=0$ and $C_V=(\\partial U/\\partial T)_V$: every joule becomes temperature. At fixed pressure the piston is free, so part of the heat is spent as $P\\,dV$ work:
$$\\delta Q_P = dU + P\\,dV = dH,\\qquad C_P = (\\partial H/\\partial T)_P.$$
Hence $C_P>C_V$. For an ideal gas Mayer's relation is $C_P-C_V=nR$. For any stable substance $C_P-C_V = VT\\beta^2/\\kappa_T\\ge 0$. Equal heat therefore raises $T$ more in the locked chamber than in the free one.`,

    derivationSteps: [
      {
        step: '1. First law',
        latex: '\\delta Q = dU + P\\,dV',
        explanation: 'Decompose $dU=(\\partial U/\\partial T)_V dT + (\\partial U/\\partial V)_T dV$.'
      },
      {
        step: '2. Enthalpy at constant $P$',
        latex: 'C_P = (\\partial H/\\partial T)_P,\\quad H\\equiv U+PV',
        explanation: '$dH=\\delta Q + V\\,dP$. At $dP=0$, $\\delta Q_P=dH$.'
      },
      {
        step: "3. Mayer",
        latex: 'C_P - C_V = nR',
        explanation: 'Ideal gas: $(\\partial U/\\partial V)_T=0$ and $P(\\partial V/\\partial T)_P=nR$.'
      },
      {
        step: '4. Identity',
        latex: 'C_P - C_V = VT\\beta^2/\\kappa_T \\ge 0',
        explanation: 'Stability $\\kappa_T>0$ forbids $C_P<C_V$, even when $\\beta<0$ (water near $4^\\circ\\mathrm{C}$).'
      }
    ],

    limitingCases: [
      {
        name: 'Monatomic ideal gas',
        condition: 'f=3',
        formula: 'C_V=\\tfrac{3}{2}R,\\ C_P=\\tfrac{5}{2}R,\\ \\gamma=5/3',
        explanation: 'Translation only at all ordinary $T$.'
      },
      {
        name: 'Diatomic, room $T$',
        condition: 'f=5',
        formula: 'C_V=\\tfrac{5}{2}R,\\ C_P=\\tfrac{7}{2}R,\\ \\gamma=7/5',
        explanation: 'Rotation on, vibration frozen ($\\Theta_{\\mathrm{vib}}\\sim 10^3\\,\\mathrm{K}$).'
      },
      {
        name: 'Diatomic, high $T$',
        condition: 'f=7',
        formula: 'C_V=\\tfrac{7}{2}R,\\ C_P=\\tfrac{9}{2}R,\\ \\gamma=9/7',
        explanation: 'One vib mode contributes a full $R$ (kinetic plus potential).'
      },
      {
        name: 'Incompressible solid',
        condition: '\\beta\\to 0',
        formula: 'C_P\\approx C_V\\approx 3R\\ (\\mathrm{Dulong–Petit})',
        explanation: 'Expansion work is negligible; the two capacities coincide.'
      }
    ],

    greTraps: [
      {
        trap: '$H$ with $P$, $U$ with $V$',
        description: '$C_P=(\\partial H/\\partial T)_P$ and $C_V=(\\partial U/\\partial T)_V$.',
        proTip: 'Constant $P$ means $dH=\\delta Q$; constant $V$ means $dU=\\delta Q$.'
      },
      {
        trap: 'Vibration adds $R$, not $R/2$',
        description: 'A harmonic vib mode has two quadratic terms.',
        proTip: 'Diatomic with vib: $C_V=7R/2$, $C_P=9R/2$.'
      },
      {
        trap: 'Why $C_P>C_V$',
        description: 'The free piston does $W=P\\Delta V$. That energy does not raise $T$.',
        proTip: 'Same $\\Delta Q$ $\\Rightarrow$ $\\Delta T_V>\\Delta T_P$.'
      },
      {
        trap: 'Water $0$–$4^\\circ\\mathrm{C}$',
        description: '$\\beta<0$ but $C_P-C_V\\propto\\beta^2$, so the inequality survives.',
        proTip: '$C_P\\ge C_V$ for every stable single-phase equilibrium.'
      }
    ],

    parameters: [
      {
        id: 'gasType',
        label: 'Substance',
        type: 'select',
        options: [
          { value: 'monatomic', label: 'Monatomic ($\\gamma=5/3$)' },
          { value: 'diatomic_rt', label: 'Diatomic room $T$ ($\\gamma=7/5$)' },
          { value: 'diatomic_high', label: 'Diatomic + vib ($\\gamma=9/7$)' },
          { value: 'solid_dulong', label: 'Solid (Dulong–Petit)' }
        ],
        default: 'diatomic_rt'
      },
      { id: 'heatInput', label: 'Heat pulse $\\Delta Q$', min: 100, max: 1000, step: 50, default: 500, unit: 'J' },
      { id: 'tempK', label: 'Base $T_0$', min: 40, max: 1500, step: 10, default: 300, unit: 'K' },
      { id: 'simSpeed', label: 'Simulation Speed', min: 0.2, max: 3.0, step: 0.2, default: 1.0, unit: 'x' }
    ],

    init: function (container, state) {
      state = state || {};
      if (!state._particlesP) seedGasP432(state);
      if (!state._particlesV) seedGasV432(state);
      state._phi = 0;
    },

    draw: function (ctx, width, height, state, dt) {
      var size = canvasSize(width, height);
      width = size.w;
      height = size.h;
      state = state || {};
      var dtEff = simDt(state, dt);
      state._phi = (state._phi || 0) + dtEff * 0.38;
      var heatFrac = 0.5 - 0.5 * Math.cos(state._phi);
      var tAnim = state._phi;

      if (!state._particlesP) seedGasP432(state);
      if (!state._particlesV) seedGasV432(state);

      var gasType = state.gasType || 'diatomic_rt';
      var heatInput = numParam(state, 'heatInput', 500) * heatFrac;
      var T0 = numParam(state, 'tempK', 300);
      var R = 8.314;
      var n = 1.0;
      var isSolid = gasType === 'solid_dulong';
      var cvR = cvOverR(gasType, T0);
      var gapR = mayerGapOverR(gasType, cvR);
      var Cp_m = (cvR + gapR) * R;
      var Cv_m = cvR * R;
      var gamma = Cp_m / Cv_m;
      var CP = n * Cp_m;
      var CV = n * Cv_m;
      var DeltaT_P = heatInput / Math.max(CP, 1e-6);
      var DeltaT_V = heatInput / Math.max(CV, 1e-6);
      var T_P = T0 + DeltaT_P;
      var T_V = T0 + DeltaT_V;
      var W_P = isSolid ? (heatInput * gapR / (cvR + gapR)) : (n * R * DeltaT_P);
      var DeltaU_P = heatInput - W_P;
      var vRatio_P = 1 + (DeltaT_P / Math.max(40, T0)) * (isSolid ? 0.12 : 0.7);
      var gasLabel = 'diatomic';
      if (gasType === 'monatomic') gasLabel = 'monatomic';
      else if (gasType === 'diatomic_high') gasLabel = 'diatomic + vib';
      else if (isSolid) gasLabel = 'solid';

      legend('Heat capacity $C_P=(\\partial Q/\\partial T)_P$', [
        { label: 'Model', value: gasLabel },
        { label: '$C_P$', value: '$' + (Cp_m / R).toFixed(2) + '\\,R$' },
        { label: '$C_V$', value: '$' + (Cv_m / R).toFixed(2) + '\\,R$' },
        { label: '$\\gamma$', value: '$' + gamma.toFixed(3) + '$' },
        { label: '$\\Delta T_P$', value: '$+' + DeltaT_P.toFixed(1) + '\\,\\mathrm{K}$' },
        { label: '$\\Delta T_V$', value: '$+' + DeltaT_V.toFixed(1) + '\\,\\mathrm{K}$' },
        { label: '$W_P$', value: '$' + W_P.toFixed(0) + '\\,\\mathrm{J}$' },
        { label: '$\\Delta U_P$', value: '$' + DeltaU_P.toFixed(0) + '\\,\\mathrm{J}$' }
      ]);

      creamFill(ctx, width, height);

      var pad = 16;
      var gap = 18;
      var colW = (width - pad * 2 - gap) / 2;
      var colH = height - pad * 2;
      var leftX = pad;
      var rightX = pad + colW + gap;
      var top = pad;

      function chamber(x, locked) {
        ctx.fillStyle = C.panel;
        ctx.strokeStyle = C.line;
        ctx.lineWidth = 1;
        panelPath(ctx, x, top, colW, colH, 8);
        ctx.fill();
        ctx.stroke();
        haloLabel(ctx, locked ? 'V locked' : 'P free', x + colW / 2, top + 14, {
          color: locked ? C.teal : C.coral
        });
      }
      chamber(leftX, false);
      chamber(rightX, true);

      var cylW = Math.min(colW - 28, 160);
      var cylH = Math.min(colH - 70, 220);
      var cylY = top + 36;
      var c1X = leftX + (colW - cylW) / 2;
      var c2X = rightX + (colW - cylW) / 2;

      if (isSolid) {
        var expP = clamp(vRatio_P, 1.0, 1.16);
        drawCrystalBlock(ctx, c1X, cylY, cylW, cylH, T_P, expP, tAnim, false);
        drawCrystalBlock(ctx, c2X, cylY, cylW, cylH, T_V, 1.0, tAnim, true);
        ctx.fillStyle = C.deep;
        ctx.fillRect(c2X - 4, cylY + 10, 8, 7);
        ctx.fillRect(c2X + cylW - 4, cylY + 10, 8, 7);
        ctx.fillRect(c2X - 4, cylY + cylH - 16, 8, 7);
        ctx.fillRect(c2X + cylW - 4, cylY + cylH - 16, 8, 7);
      } else {
        var baseGasH = cylH * 0.48;
        var expandH = baseGasH * clamp(vRatio_P, 1.0, 1.7);
        var pistonY1 = cylY + cylH - expandH;
        var gasH1 = cylY + cylH - pistonY1;
        var pistonY2 = cylY + cylH - baseGasH;
        var gasH2 = baseGasH;

        ctx.fillStyle = C.ivory;
        ctx.strokeStyle = C.stone;
        ctx.lineWidth = 1.6;
        ctx.fillRect(c1X, cylY, cylW, cylH);
        ctx.strokeRect(c1X, cylY, cylW, cylH);
        ctx.fillRect(c2X, cylY, cylW, cylH);
        ctx.strokeRect(c2X, cylY, cylW, cylH);

        ctx.fillStyle = tempFill(clamp((T_P - T0) / 80, 0, 1) * 0.7 + 0.25);
        ctx.fillRect(c1X + 2, pistonY1, cylW - 4, gasH1 - 2);
        ctx.fillStyle = tempFill(clamp((T_V - T0) / 80, 0, 1) * 0.7 + 0.25);
        ctx.fillRect(c2X + 2, pistonY2, cylW - 4, gasH2 - 2);

        var spdP = Math.sqrt(Math.max(0.2, T_P / 300)) * 1.35;
        var spdV = Math.sqrt(Math.max(0.2, T_V / 300)) * 1.35;
        bounceParticles(state._particlesP, dtEff, spdP);
        bounceParticles(state._particlesV, dtEff, spdV);
        drawParticles(ctx, state._particlesP, c1X + 6, pistonY1 + 4, cylW - 12, Math.max(8, gasH1 - 8), T_P > T0 + 20 ? C.gold : C.coral, 2.3);
        drawParticles(ctx, state._particlesV, c2X + 6, pistonY2 + 4, cylW - 12, Math.max(8, gasH2 - 8), T_V > T0 + 20 ? C.gold : C.coral, 2.3);

        ctx.fillStyle = C.stone;
        ctx.fillRect(c1X + 2, pistonY1 - 9, cylW - 4, 9);
        ctx.fillRect(c2X + 2, pistonY2 - 9, cylW - 4, 9);
        ctx.fillStyle = C.muted;
        var shaftH = Math.max(4, pistonY1 - 9 - (cylY + 6));
        ctx.fillRect(c1X + cylW / 2 - 3, cylY + 6, 6, shaftH);
        ctx.fillStyle = C.deep;
        ctx.fillRect(c1X + cylW / 2 - 16, cylY + 4, 32, 8);
        ctx.fillRect(c2X - 4, pistonY2 - 12, 8, 7);
        ctx.fillRect(c2X + cylW - 4, pistonY2 - 12, 8, 7);

        if (W_P > 8) {
          arrow(ctx, c1X + cylW - 12, pistonY1 - 6, c1X + cylW - 12, Math.max(cylY + 16, pistonY1 - 22), C.coral, 2);
        }
      }

      var coilY = cylY + cylH + 8;
      var glow = 0.18 + 0.45 * heatFrac;
      ctx.fillStyle = 'rgba(204, 120, 92, ' + glow + ')';
      ctx.fillRect(c1X, coilY, cylW, 10);
      ctx.fillRect(c2X, coilY, cylW, 10);
    },

    challenge: {
      question: "A cylinder holds $2.0$ moles of ideal diatomic gas at room temperature ($C_V=\\tfrac{5}{2}R$, $C_P=\\tfrac{7}{2}R$). A heater delivers $\\Delta Q=700\\,\\mathrm{J}$ at constant pressure. Find $W$ and $\\Delta U$.",
      options: [
        "$W = 200\\,\\mathrm{J},\\quad \\Delta U = 500\\,\\mathrm{J}$",
        "$W = 0\\,\\mathrm{J},\\quad \\Delta U = 700\\,\\mathrm{J}$",
        "$W = 280\\,\\mathrm{J},\\quad \\Delta U = 420\\,\\mathrm{J}$",
        "$W = 500\\,\\mathrm{J},\\quad \\Delta U = 200\\,\\mathrm{J}$",
        "$W = 700\\,\\mathrm{J},\\quad \\Delta U = 0\\,\\mathrm{J}$"
      ],
      correct: 0,
      explanation: "Isobaric: $W = nR\\Delta T = (R/C_P)Q = (2/7)\\times 700\\,\\mathrm{J} = 200\\,\\mathrm{J}$ and $\\Delta U = (C_V/C_P)Q = (5/7)\\times 700\\,\\mathrm{J} = 500\\,\\mathrm{J}$."
    }
  };

})(typeof window !== 'undefined' ? window : globalThis);
