/* Formula visualizers — G3 Hooke / SHO phasor / coupled oscillators */
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
  var MUTED = '#6c6a64';
  var CORAL = '#cc785c';
  var GOLD = '#d4a017';
  var TEAL = '#5db8a6';
  var ROSE = '#e05666';
  var EMERALD = '#4e9b6f';
  var LINE = '#e6dfd8';
  var PANEL = '#f5f0e8';

  function syncStageTheme() {
    var t = PGRE.vizStageTheme ? PGRE.vizStageTheme() : null;
    if (!t) return;
    CREAM = t.bg; MUTED = t.muted; LINE = t.line; PANEL = t.panel;
  }

  function stageFill(ctx, w, h) {
    syncStageTheme();
    ctx.fillStyle = (CV && CV.colors && CV.colors.bg) || CREAM;
    ctx.fillRect(0, 0, w, h);
  }

  function legend(title, rows) {
    if (PGRE.appendVizLegend) PGRE.appendVizLegend(title, rows);
  }

  function fontSans(px, weight) {
    return (weight ? String(weight) + ' ' : '') + String(px) + 'px Inter, -apple-system, sans-serif';
  }

  function inkLabel(ctx, text, x, y, opts) {
    opts = opts || {};
    ctx.save();
    ctx.font = opts.font || fontSans(11);
    ctx.textAlign = opts.align || 'center';
    ctx.textBaseline = opts.baseline || 'middle';
    if (opts.pad) {
      var tw = ctx.measureText(String(text)).width;
      var h = 14;
      var p = 3;
      var bx = x;
      if (opts.align === 'left') bx = x;
      else if (opts.align === 'right') bx = x - tw;
      else bx = x - tw / 2;
      var by = y;
      if (opts.baseline === 'top') by = y;
      else if (opts.baseline === 'bottom') by = y - h;
      else by = y - h / 2;
      ctx.fillStyle = PGRE.vizStageTheme().chipFade(0.92);
      ctx.fillRect(bx - p, by, tw + 2 * p, h);
    }
    ctx.fillStyle = opts.color || MUTED;
    ctx.fillText(String(text), x, y);
    ctx.restore();
  }

  function capLen(dx, dy, maxLen) {
    var L = Math.hypot(dx, dy);
    if (L < 1e-6) return { dx: 0, dy: 0, ok: false };
    if (L > maxLen) {
      var s = maxLen / L;
      return { dx: dx * s, dy: dy * s, ok: true };
    }
    return { dx: dx, dy: dy, ok: true };
  }

  function coilSpring(ctx, x1, y1, x2, y2, coils, amp, color) {
    coils = coils || 10;
    amp = amp || 8;
    color = color || CORAL;
    var dx = x2 - x1;
    var dy = y2 - y1;
    var len = Math.hypot(dx, dy);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    if (len < 8) {
      ctx.lineTo(x2, y2);
    } else {
      var i;
      for (i = 0; i <= coils; i++) {
        var t = i / coils;
        var x = x1 + dx * t;
        var y = y1 + dy * t;
        var off = (i === 0 || i === coils) ? 0 : (i % 2 === 1 ? -amp : amp);
        ctx.lineTo(x - (dy / len) * off, y + (dx / len) * off);
      }
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();
    ctx.restore();
  }

  function arrow(ctx, x1, y1, x2, y2, color, label) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    var len = Math.hypot(dx, dy);
    if (len < 8) return;
    var angle = Math.atan2(dy, dx);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    var head = Math.min(8, len * 0.35);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(angle - Math.PI / 6), y2 - head * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - head * Math.cos(angle + Math.PI / 6), y2 - head * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
    if (label) {
      ctx.font = fontSans(11, '500');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      var nx = -Math.sin(angle) * 12;
      var ny = Math.cos(angle) * 12;
      var mx = (x1 + x2) / 2 + nx;
      var my = (y1 + y2) / 2 + ny;
      var tw = ctx.measureText(label).width;
      ctx.fillStyle = PGRE.vizStageTheme().chipFade(0.94);
      ctx.fillRect(mx - tw / 2 - 3, my - 7, tw + 6, 14);
      ctx.fillStyle = color;
      ctx.fillText(label, mx, my);
    }
    ctx.restore();
  }

  function plotFrame(ctx, x, y, w, h) {
    ctx.save();
    ctx.fillStyle = PANEL;
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }

  function hatchFloor(ctx, x0, x1, floorY) {
    ctx.save();
    ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.28);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x0, floorY);
    ctx.lineTo(x1, floorY);
    ctx.stroke();
    ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.12);
    ctx.lineWidth = 1;
    ctx.beginPath();
    var fx;
    for (fx = x0; fx < x1; fx += 11) {
      ctx.moveTo(fx, floorY);
      ctx.lineTo(fx - 5, floorY + 7);
    }
    ctx.stroke();
    ctx.restore();
  }

  function finiteNum(v, fallback) {
    var n = Number(v);
    return isFinite(n) ? n : fallback;
  }

  function simSpeedOf(state) {
    var s = Number(state && state.simSpeed);
    if (!isFinite(s)) s = 1.0;
    if (s < 0.2) s = 0.2;
    if (s > 3) s = 3;
    return s;
  }

  function scaledDt(dt, state) {
    return Math.min(dt || 0.016, 0.05) * simSpeedOf(state);
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

  function eventPos(canvas, e) {
    var rect = canvas.getBoundingClientRect();
    var t = (e.touches && e.touches.length > 0) ? e.touches[0] :
              ((e.changedTouches && e.changedTouches.length > 0) ? e.changedTouches[0] : null);
    var clientX = t ? t.clientX : e.clientX;
    var clientY = t ? t.clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function bindCanvasDrag(canvas, flag, handlers) {
    if (!canvas || canvas[flag]) return;
    canvas[flag] = true;
    canvas.addEventListener('mousedown', handlers.onDown);
    canvas.addEventListener('touchstart', handlers.onDown, { passive: false });
    if (typeof window !== 'undefined') {
      var moveKey = flag + '_move';
      var upKey = flag + '_up';
      if (window[moveKey]) {
        window.removeEventListener('mousemove', window[moveKey]);
        window.removeEventListener('mouseup', window[upKey]);
        window.removeEventListener('touchmove', window[moveKey]);
        window.removeEventListener('touchend', window[upKey]);
      }
      window[moveKey] = handlers.onMove;
      window[upKey] = handlers.onUp;
      window.addEventListener('mousemove', handlers.onMove);
      window.addEventListener('mouseup', handlers.onUp);
      window.addEventListener('touchmove', handlers.onMove, { passive: false });
      window.addEventListener('touchend', handlers.onUp);
    }
  }

  function attachDrag(container, flag, makeHandlers) {
    function tryBind() {
      var canvas = findVizCanvas(container);
      if (!canvas) return false;
      bindCanvasDrag(canvas, flag, makeHandlers(canvas));
      return true;
    }
    if (!tryBind() && typeof document !== 'undefined') {
      setTimeout(tryBind, 80);
    }
  }

  function drawSpring(ctx, x1, y1, x2, y2, coils, amp, color) {
    var len = Math.hypot(x2 - x1, y2 - y1);
    if (len < 20 || !(DrawUtils && DrawUtils.drawSpring)) {
      coilSpring(ctx, x1, y1, x2, y2, coils, amp, color);
      return;
    }
    DrawUtils.drawSpring(ctx, x1, y1, x2, y2, coils || 10, (amp || 8) * 2, color, 0);
  }

  var SPEED_PARAM = { id: 'simSpeed', label: 'Simulation Speed', min: 0.2, max: 3.0, step: 0.2, default: 1.0, unit: 'x' };

  function wrapAngle(th) {
    var twoPi = 2 * Math.PI;
    var p = th % twoPi;
    if (p < 0) p += twoPi;
    return p;
  }

  function applyCoupledICs(sim, mode) {
    var A = 1.2;
    if (mode === 'in-phase') {
      sim.x1 = A;
      sim.x2 = A;
    } else if (mode === 'anti-phase') {
      sim.x1 = A;
      sim.x2 = -A;
    } else {
      sim.x1 = A;
      sim.x2 = 0;
    }
    sim.v1 = 0;
    sim.v2 = 0;
    sim.t = 0;
    sim.history = [];
    sim.lastMode = mode;
  }

  PGRE.visualizers['cpgf-1.39'] = {
    id: 'cpgf-1.39',
    topic: 'cm',
    title: 'Spring Equation of Motion & Hooke\'s Law Dynamics',
    formulaLatex: '$$F = m\\ddot{x} = -kx \\iff \\ddot{x} + \\omega_0^2 x = 0,\\quad \\omega_0 = \\sqrt{\\frac{k}{m}}$$',
    physicalStory:
      'A linear restoring force arises from the quadratic potential well $V(x)=\\tfrac12 k x^2$ (the universal leading Taylor term near any stable equilibrium). Newton\'s 2nd law yields an autonomous second-order linear ODE. When $\\zeta=0$, kinetic energy $T$ and elastic potential $V$ oscillate out of phase by $\\pi/2$, keeping total mechanical energy $E$ conserved. Linear damping $\\zeta>0$ spirals the phase-space ellipse inward as $E$ decays. In phase space $(x,p)$, the undamped trajectory traces an ellipse of invariant area $2\\pi E/\\omega_0$.',
    derivationSteps: [
      {
        step: 1,
        title: 'Hooke\'s Restoring Force from Potential Gradient',
        formula: 'F_{\\text{net}} = -\\frac{dV}{dx} = -\\frac{d}{dx}\\left(\\frac{1}{2}kx^2\\right) = -kx',
        text: 'For any small displacement from stable equilibrium, higher-order terms in the potential energy Taylor series are negligible, yielding a linear restoring force directed opposite to displacement.'
      },
      {
        step: 2,
        title: 'Newton\'s 2nd Law ODE',
        formula: 'm\\frac{d^2x}{dt^2} = -kx \\implies m\\ddot{x} + kx = 0 \\iff \\ddot{x} + \\left(\\frac{k}{m}\\right)x = 0',
        text: 'Divide through by inertial mass m to express the standard form of the homogeneous simple harmonic oscillator ODE.'
      },
      {
        step: 3,
        title: 'Natural Frequency Definition & Characteristic Equation',
        formula: '\\omega_0 \\equiv \\sqrt{\\frac{k}{m}},\\quad r^2 + \\omega_0^2 = 0 \\implies r = \\pm i\\omega_0',
        text: 'Substituting trial solution $x(t)=\\mathrm{e}^{rt}$ yields purely imaginary roots, producing undamped sinusoidal oscillation with period $T=2\\pi/\\omega_0=2\\pi\\sqrt{m/k}$.'
      },
      {
        step: 4,
        title: 'Phase Space Ellipse & Energy Conservation',
        formula: 'E = \\frac{1}{2}m v^2 + \\frac{1}{2}k x^2 = \\frac{p^2}{2m} + \\frac{1}{2}k x^2 = \\frac{1}{2}k A^2 = \\text{const}',
        text: 'Dividing by $E$ yields the canonical ellipse $(x/A)^2 + (p/p_{\\max})^2 = 1$ in phase space $(x,p)$, with semi-axes $A$ and $p_{\\max}=m\\omega_0 A$.'
      }
    ],
    limitingCases: [
      {
        name: 'Infinite Rigidity (Stiff Spring)',
        condition: 'k \\to \\infty',
        result: '\\omega_0 \\to \\infty,\\quad T = 2\\pi\\sqrt{\\frac{m}{k}} \\to 0',
        explanation: 'As spring constant approaches infinity, period vanishes and oscillation frequency becomes infinitely high with near-zero compliance.'
      },
      {
        name: 'Free Particle (Zero Spring Constant)',
        condition: 'k \\to 0',
        result: '\\ddot{x} = 0 \\implies x(t) = x_0 + v_0 t',
        explanation: 'With no restoring force, the particle exhibits uniform rectilinear motion with zero oscillation.'
      },
      {
        name: 'Infinite Inertia',
        condition: 'm \\to \\infty',
        result: '\\ddot{x} \\to 0,\\quad \\omega_0 \\to 0,\\quad T \\to \\infty',
        explanation: 'A finite spring force produces vanishing acceleration, so the mass continues in uniform motion ($\\dot{x}\\approx\\mathrm{const}$), not rest.'
      },
      {
        name: 'Equilibrium Crossing',
        condition: 'x = 0',
        result: 'F = 0,\\quad V = 0,\\quad |v| = v_{\\max} = \\omega_0 A,\\quad T = E',
        explanation: 'At the origin, spring force is zero, potential energy is completely converted to maximum kinetic energy.'
      }
    ],
    greTraps: [
      {
        trap: 'Cutting a Spring in Half Doubles Spring Constant',
        warning: 'Students often guess the spring constant is unchanged or halved when cut.',
        strategy: 'Remember $k=(YA)/L \\propto 1/L$. Cutting a spring into halves gives each half $k\'=2k$. A mass $m$ attached to one half oscillates with frequency $\\omega\'=\\sqrt{2k/m}=\\sqrt{2}\\,\\omega_0$.'
      },
      {
        trap: 'Series vs Parallel Spring Combinations',
        warning: 'Confusing spring combination rules with resistors.',
        strategy: 'Springs in parallel add directly: $k_{\\mathrm{eff}}=k_1+k_2$ (stiffer). Springs in series add reciprocally: $1/k_{\\mathrm{eff}}=1/k_1+1/k_2$ (more compliant).'
      },
      {
        trap: 'Vertical Spring Equilibrium vs Frequency',
        warning: 'Believing gravity g alters the oscillation frequency of a vertical spring.',
        strategy: 'Gravity only shifts the equilibrium position down by $\\Delta x_{\\mathrm{eq}}=mg/k$. The frequency $\\omega_0=\\sqrt{k/m}$ is completely independent of $g$.'
      },
      {
        trap: 'Energy Scaling with Amplitude',
        warning: 'Linear scaling confusion: $E\\propto A$ vs $E\\propto A^2$.',
        strategy: 'Total energy is quadratic in amplitude: $E=\\tfrac12 k A^2$. Doubling amplitude quadruples the stored mechanical energy.'
      }
    ],
    parameters: [
      { id: 'm', label: 'Mass ($m$)', min: 0.2, max: 4.0, step: 0.1, default: 1.0, unit: 'kg' },
      { id: 'k', label: 'Spring Constant ($k$)', min: 2.0, max: 40.0, step: 1.0, default: 16.0, unit: 'N/m' },
      { id: 'A', label: 'Initial Amplitude ($A$)', min: 0.2, max: 2.0, step: 0.1, default: 1.2, unit: 'm' },
      { id: 'damping', label: 'Damping Ratio ($\\zeta$)', min: 0.0, max: 0.3, step: 0.01, default: 0.0, unit: '' },
      SPEED_PARAM
    ],
    challenge: {
      question:
        'A uniform spring of spring constant $k$ is cut into two equal halves. One of the halves is connected to a mass $m$ on a frictionless horizontal plane. What is the new oscillation frequency $\\omega\'$ in terms of the original natural frequency $\\omega_0=\\sqrt{k/m}$?',
      options: [
        'A) $\\omega\' = \\tfrac12 \\omega_0$',
        'B) $\\omega\' = \\omega_0/\\sqrt{2}$',
        'C) $\\omega\' = \\omega_0$',
        'D) $\\omega\' = \\sqrt{2}\\,\\omega_0$',
        'E) $\\omega\' = 2\\omega_0$'
      ],
      correct: 3,
      explanation:
        'The spring constant of a uniform elastic spring is inversely proportional to its rest length: $k=(YA)/L$. Halving the length doubles the spring constant: $k\'=2k$. Therefore the new frequency is $\\omega\'=\\sqrt{k\'/m}=\\sqrt{2k/m}=\\sqrt{2}\\,\\omega_0$. Option D is correct.'
    },

    init(container, state, redraw) {
      state.m = finiteNum(state.m, 1.0);
      state.k = finiteNum(state.k, 16.0);
      state.A = finiteNum(state.A, 1.2);
      state.damping = finiteNum(state.damping, 0.0);
      state.simSpeed = finiteNum(state.simSpeed, 1.0);

      state.sim = {
        x: state.A,
        v: 0.0,
        t: 0.0,
        isDragging: false,
        phaseHistory: [],
        maxHistoryLen: 300,
        lastA: state.A,
        lastM: state.m,
        lastK: state.k,
        lastDamp: state.damping
      };

      attachDrag(container, '_cpgf139_bound', function (canvas) {
        var getPos = function (e) { return eventPos(canvas, e); };

        var onDown = function (e) {
          var pos = getPos(e);
          var block = state.sim.blockScreenPos;
          if (block && Math.hypot(pos.x - block.x, pos.y - block.y) < block.size * 1.2) {
            state.sim.isDragging = true;
            state.sim.v = 0;
            if (e.cancelable) e.preventDefault();
          }
        };

        var onMove = function (e) {
          if (state.sim.isDragging && state.sim.springOriginX !== undefined) {
            var pos = getPos(e);
            var scale = state.sim.pixelsPerMeter || 80;
            var newX = (pos.x - state.sim.springOriginX) / scale;
            state.sim.x = Math.max(-2.2, Math.min(2.2, newX));
            state.sim.v = 0;
            if (redraw) redraw();
            if (e.cancelable) e.preventDefault();
          }
        };

        var onUp = function () {
          state.sim.isDragging = false;
        };

        return { onDown: onDown, onMove: onMove, onUp: onUp };
      });
    },

    draw(ctx, width, height, state, dt) {
      if (!state.sim) this.init(null, state);
      const sim = state.sim;
      width = width || 640;
      height = height || 420;

      const m = Math.max(0.1, finiteNum(state.m, 1.0));
      const k = Math.max(0.1, finiteNum(state.k, 16.0));
      const damping = Math.max(0, finiteNum(state.damping, 0.0));
      const Aset = finiteNum(state.A, 1.2);

      if (!sim.isDragging && (
        sim.lastA !== Aset ||
        sim.lastM !== m ||
        sim.lastK !== k ||
        sim.lastDamp !== damping
      )) {
        sim.x = Aset;
        sim.v = 0.0;
        sim.t = 0.0;
        sim.phaseHistory = [];
      }
      sim.lastA = Aset;
      sim.lastM = m;
      sim.lastK = k;
      sim.lastDamp = damping;

      const omega0 = Math.sqrt(k / m);
      const gamma = 2 * damping * omega0;

      const subSteps = 10;
      const stepDt = scaledDt(dt, state) / subSteps;

      if (!sim.isDragging) {
        for (let i = 0; i < subSteps; i++) {
          const accel = (-k * sim.x - gamma * m * sim.v) / m;
          sim.v += accel * stepDt;
          sim.x += sim.v * stepDt;
          sim.t += stepDt;
        }
      }

      const p = m * sim.v;
      sim.phaseHistory.push({ x: sim.x, p: p, t: sim.t });
      if (sim.phaseHistory.length > sim.maxHistoryLen) {
        sim.phaseHistory.shift();
      }

      stageFill(ctx, width, height);

      const pad = 16;
      const wallW = 14;
      const topH = Math.round(Math.max(168, height * 0.46));
      const wallX = pad;
      const floorY = topH - 36;
      const centerY = floorY - 22;
      const massSize = Math.max(36, Math.min(46, 32 + m * 5));
      const minMassX = wallX + wallW + 36;
      const maxMassX = width - pad - massSize / 2 - 8;
      const eqX = wallX + wallW + (width - pad * 2 - wallW) * 0.40;
      const Aspan = Math.max(2.2, Aset);
      const pxPerM = Math.min((eqX - minMassX) / Aspan, (maxMassX - eqX) / Aspan);

      sim.springOriginX = eqX;
      sim.pixelsPerMeter = pxPerM;

      const massX = Math.max(minMassX, Math.min(maxMassX, eqX + sim.x * pxPerM));
      const massY = centerY;
      sim.blockScreenPos = { x: massX, y: massY, size: massSize };

      if (DrawUtils && DrawUtils.drawHatchedWall) {
        DrawUtils.drawHatchedWall(ctx, wallX, centerY - 58, wallW, floorY - (centerY - 58) + 4, 'vertical-left');
      }
      hatchFloor(ctx, wallX + wallW, width - pad, floorY);

      ctx.save();
      ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.22);
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(eqX, pad + 22);
      ctx.lineTo(eqX, floorY + 8);
      ctx.stroke();
      ctx.restore();
      inkLabel(ctx, 'x = 0', eqX, floorY + 20, { color: MUTED, font: fontSans(10) });

      drawSpring(ctx, wallX + wallW, centerY, massX - massSize / 2, centerY, 12, 9, CORAL);

      if (DrawUtils && DrawUtils.drawMassBlock) {
        DrawUtils.drawMassBlock(ctx, massX, massY, massSize, 'm', CORAL, sim.isDragging);
      }

      const forceVal = -k * sim.x;
      const fRoom = forceVal >= 0 ? (width - pad - massX) : (massX - pad);
      const fCap = capLen(forceVal * 3.2, 0, Math.min(70, Math.max(8, fRoom - 6)));
      if (fCap.ok && Math.abs(forceVal) > 0.05) {
        arrow(ctx, massX, massY - massSize / 2 - 16, massX + fCap.dx, massY - massSize / 2 - 16, ROSE, 'F');
      }

      const vFromX = massX + (sim.v >= 0 ? massSize / 2 : -massSize / 2);
      const vRoom = sim.v >= 0 ? (width - pad - vFromX) : (vFromX - pad);
      const vCap = capLen(sim.v * 22, 0, Math.min(70, Math.max(8, vRoom - 6)));
      if (vCap.ok && Math.abs(sim.v) > 0.02) {
        arrow(ctx, vFromX, massY, vFromX + vCap.dx, massY, EMERALD, 'v');
      }

      inkLabel(
        ctx,
        sim.isDragging ? 'dragging' : 'drag the mass',
        pad + 8,
        pad + 10,
        { color: MUTED, font: fontSans(10), align: 'left', baseline: 'top' }
      );

      ctx.save();
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad, topH);
      ctx.lineTo(width - pad, topH);
      ctx.stroke();
      ctx.restore();

      const plotX = 48;
      const plotY = topH + 28;
      const plotW = width - plotX - 20;
      const plotH = height - plotY - 22;
      inkLabel(ctx, 'phase space (x, p)', plotX, topH + 14, { color: MUTED, font: fontSans(11), align: 'left' });
      plotFrame(ctx, plotX, plotY, plotW, plotH);

      const phaseCx = plotX + plotW / 2;
      const phaseCy = plotY + plotH / 2;
      const T = 0.5 * m * sim.v * sim.v;
      const V = 0.5 * k * sim.x * sim.x;
      const E = T + V;
      const A_current = Math.sqrt((2 * Math.max(0.001, E)) / k);
      const p_max = Math.sqrt(2 * m * Math.max(0.001, E));
      const Aref = Aset;
      const axW = plotW * 0.38;
      const axH = plotH * 0.38;
      const scalePhaseX = axW / Math.max(1.8, Aref * 1.15);
      const scalePhaseP = axH / Math.max(7.0, Math.sqrt(2 * m * 0.5 * k * Aref * Aref) * 1.15);

      ctx.save();
      ctx.beginPath();
      ctx.rect(plotX + 1, plotY + 1, plotW - 2, plotH - 2);
      ctx.clip();

      ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.28);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(plotX + 12, phaseCy);
      ctx.lineTo(plotX + plotW - 12, phaseCy);
      ctx.moveTo(phaseCx, plotY + 12);
      ctx.lineTo(phaseCx, plotY + plotH - 12);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(204, 120, 92, 0.35)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.ellipse(phaseCx, phaseCy, Math.max(4, A_current * scalePhaseX), Math.max(4, p_max * scalePhaseP), 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      if (sim.phaseHistory.length > 1) {
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        for (let i = 1; i < sim.phaseHistory.length; i++) {
          const pt0 = sim.phaseHistory[i - 1];
          const pt1 = sim.phaseHistory[i];
          const alpha = (i / sim.phaseHistory.length) * 0.85;
          ctx.strokeStyle = 'rgba(204, 120, 92, ' + alpha + ')';
          ctx.beginPath();
          ctx.moveTo(phaseCx + pt0.x * scalePhaseX, phaseCy - pt0.p * scalePhaseP);
          ctx.lineTo(phaseCx + pt1.x * scalePhaseX, phaseCy - pt1.p * scalePhaseP);
          ctx.stroke();
        }
      }

      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(phaseCx + sim.x * scalePhaseX, phaseCy - p * scalePhaseP, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      inkLabel(ctx, 'x', plotX + plotW - 16, phaseCy + 12, { color: MUTED, font: fontSans(11), align: 'right', pad: true });
      inkLabel(ctx, 'p', phaseCx + 12, plotY + 14, { color: MUTED, font: fontSans(11), align: 'left', pad: true });

      legend('Oscillator', [
        { label: '$\\omega_0=\\sqrt{k/m}$', value: omega0.toFixed(2) + ' rad/s' },
        { label: '$T_0=2\\pi/\\omega_0$', value: (2 * Math.PI / omega0).toFixed(3) + ' s' },
        { label: '$x$', value: sim.x.toFixed(3) + ' m' },
        { label: '$v$', value: sim.v.toFixed(3) + ' m/s' },
        { label: 'Drag', value: sim.isDragging ? 'setting $x$' : 'drag the mass' }
      ]);
      legend('Energy', [
        { label: '$T=\\tfrac12 m v^2$', value: T.toFixed(2) + ' J' },
        { label: '$V=\\tfrac12 k x^2$', value: V.toFixed(2) + ' J' },
        { label: damping > 1e-6 ? '$E=T+V$ ($\\zeta>0$, decaying)' : '$E=T+V$ ($\\zeta=0$, conserved)', value: E.toFixed(2) + ' J' }
      ]);
    }
  };

  PGRE.visualizers['cpgf-1.41'] = {
    id: 'cpgf-1.41',
    topic: 'cm',
    title: 'SHO Complex-Exponential Solution & Phasor Geometry',
    formulaLatex:
      '$$x(t) = \\text{Re}\\left[\\tilde{A} e^{i\\omega t}\\right] = A_0 \\cos(\\omega t + \\phi_0),\\quad \\tilde{A} = A_0 e^{i\\phi_0}$$',
    physicalStory:
      'By Euler\'s identity $\\mathrm{e}^{i\\theta}=\\cos\\theta+i\\sin\\theta$, 1D simple harmonic motion is the real physical projection of steady circular motion in the complex plane. The complex displacement phasor $\\tilde{z}(t)$ rotates counter-clockwise at constant angular velocity $\\omega$. Differentiating multiplies the phasor by $i\\omega=\\omega\\,\\mathrm{e}^{i\\pi/2}$, rotating velocity by $+90^\\circ$ ahead of displacement, and acceleration by $+180^\\circ$ (antiparallel to $x$). With $\\gamma>0$ the tip traces an inward logarithmic spiral $A_0\\mathrm{e}^{-\\gamma t}$.',
    derivationSteps: [
      {
        step: 1,
        title: 'Complex Linear Ansatz',
        formula: '\\ddot{x} + \\omega^2 x = 0 \\xrightarrow{z(t) = \\tilde{A} e^{i\\omega t}} (i\\omega)^2 \\tilde{A} e^{i\\omega t} + \\omega^2 \\tilde{A} e^{i\\omega t} = 0',
        text: 'The linearity of the harmonic ODE allows extending the coordinate x into the complex plane z(t) = x(t) + i y(t), where the complex exponential neatly converts derivatives into algebraic multiplications by (iω).'
      },
      {
        step: 2,
        title: 'Derivative as a +90° Complex Rotation (Velocity)',
        formula: '\\dot{z}(t) = \\frac{d}{dt}\\left(\\tilde{A} e^{i\\omega t}\\right) = i\\omega \\tilde{A} e^{i\\omega t} = \\omega e^{i\\pi/2} z(t)',
        text: 'Multiplication by the imaginary unit $i=\\mathrm{e}^{i\\pi/2}$ corresponds to a counter-clockwise rotation by $90^\\circ$ in the Argand diagram. Thus velocity always leads displacement by a quarter cycle ($\\pi/2$).'
      },
      {
        step: 3,
        title: 'Second Derivative & +180° Anti-phase (Acceleration)',
        formula: '\\ddot{z}(t) = (i\\omega)^2 z(t) = -\\omega^2 z(t) = \\omega^2 e^{i\\pi} z(t)',
        text: 'Because $i^2=-1=\\mathrm{e}^{i\\pi}$, acceleration is antiparallel ($180^\\circ$ out of phase) to displacement at every instant, providing the defining restoring mechanism of Hooke\'s law.'
      },
      {
        step: 4,
        title: 'Extracting Real Physical Motion via Euler Expansion',
        formula: 'x(t) = \\text{Re}\\left[A_0 e^{i\\phi_0} e^{i\\omega t}\\right] = A_0 \\text{Re}\\left[e^{i(\\omega t + \\phi_0)}\\right] = A_0 \\cos(\\omega t + \\phi_0)',
        text: 'The physical observable is strictly the projection onto the Real Axis, unifying circular motion, complex algebra, and sinusoidal wave motion.'
      }
    ],
    limitingCases: [
      {
        name: 'Zero Frequency (Static Phasor)',
        condition: '\\omega \\to 0',
        result: 'z(t) \\to \\tilde{A} = A_0 e^{i\\phi_0} = \\text{const}',
        explanation: 'Phasor stops rotating; particle remains permanently displaced at $x=A_0\\cos\\phi_0$.'
      },
      {
        name: 'Cosine Mode (Zero Initial Phase)',
        condition: '\\phi_0 = 0',
        result: 'x(0) = A_0,\\quad v(0) = 0',
        explanation: 'Oscillator released from rest at maximum positive displacement.'
      },
      {
        name: 'Sine Mode (-90° Initial Phase)',
        condition: '\\phi_0 = -\\pi/2',
        result: 'x(t) = A_0 \\sin(\\omega t),\\quad x(0) = 0,\\quad v(0) = \\omega A_0',
        explanation: 'Oscillator kicked from equilibrium with maximum velocity at t = 0.'
      },
      {
        name: 'Damped Decay (Complex Frequency)',
        condition: '\\omega \\to \\omega_d + i\\gamma',
        result: 'z(t) = A_0 e^{-\\gamma t} e^{i(\\omega_d t + \\phi_0)}',
        explanation: 'In the presence of friction, the phasor tip traces a continuous inward logarithmic spiral toward the origin.'
      }
    ],
    greTraps: [
      {
        trap: 'Phase Lead vs Phase Lag Direction',
        warning: 'Mistaking whether velocity leads or lags displacement.',
        strategy: 'Remember: $v$ leads $x$ by $+90^\\circ$ (quarter period). When $x$ reaches its maximum, $v$ has already dropped to $0$ from its previous maximum. Acceleration $a$ leads $x$ by $+180^\\circ$ (exactly opposite sign).'
      },
      {
        trap: 'Squaring Complex Amplitudes for Energy',
        warning: 'Attempting to calculate physical energy by taking the real part after squaring z².',
        strategy: 'Physical energy involves $[\\mathrm{Re}(z)]^2$, not $\\mathrm{Re}(z^2)$. Note that $\\mathrm{Re}(z^2)=A^2\\cos(2\\omega t)$ has zero time average, whereas $\\langle[\\mathrm{Re}(z)]^2\\rangle=\\tfrac12 A^2$.'
      },
      {
        trap: 'Phasor Addition for Superposition',
        warning: 'Directly adding scalar amplitudes A_net = A1 + A2 for out-of-phase oscillations.',
        strategy: 'Two oscillations of the same frequency add vectorially in the complex plane: $A_{\\mathrm{net}}^2=A_1^2+A_2^2+2 A_1 A_2\\cos(\\Delta\\phi)$.'
      }
    ],
    parameters: [
      { id: 'omega', label: 'Angular Frequency ($\\omega$)', min: 0.5, max: 5.0, step: 0.1, default: 2.0, unit: 'rad/s' },
      { id: 'amplitude', label: 'Amplitude ($A_0$)', min: 0.5, max: 2.5, step: 0.1, default: 1.5, unit: 'm' },
      { id: 'phase', label: 'Initial Phase ($\\phi_0$)', min: -3.1, max: 3.1, step: 0.1, default: 0.0, unit: 'rad' },
      { id: 'decay', label: 'Decay Constant ($\\gamma$)', min: 0.0, max: 0.5, step: 0.02, default: 0.0, unit: 's⁻¹' },
      SPEED_PARAM
    ],
    challenge: {
      question:
        'Two simple harmonic oscillations along the $x$-axis are given by $x_1(t)=3\\cos(\\omega t)$ and $x_2(t)=4\\cos(\\omega t+\\pi/2)$. What is the total amplitude $A_{\\mathrm{total}}$ of the resultant superposed oscillation $x(t)=x_1(t)+x_2(t)$?',
      options: ['A) $1$', 'B) $5$', 'C) $7$', 'D) $\\sqrt{7}$', 'E) $12$'],
      correct: 1,
      explanation:
        'Using phasor addition in the complex plane: $\\tilde{z}_1=3$ and $\\tilde{z}_2=4\\mathrm{e}^{i\\pi/2}=4i$. Because the phase difference is $\\Delta\\phi=\\pi/2$ (orthogonal phasors), the resultant complex amplitude is $\\tilde{z}_{\\mathrm{total}}=3+4i$. Its magnitude is $|\\tilde{z}_{\\mathrm{total}}|=\\sqrt{3^2+4^2}=5$. Option B is correct.'
    },

    init(container, state, redraw) {
      state.omega = finiteNum(state.omega, 2.0);
      state.amplitude = finiteNum(state.amplitude, 1.5);
      state.phase = finiteNum(state.phase, 0.0);
      state.decay = finiteNum(state.decay, 0.0);
      state.simSpeed = finiteNum(state.simSpeed, 1.0);

      state.sim = {
        t: 0.0,
        isDraggingPhasor: false,
        waveHistory: [],
        phasorTrail: [],
        maxWaveLen: 220,
        lastOmega: state.omega,
        lastA0: state.amplitude,
        lastPhi: state.phase,
        lastDecay: state.decay
      };

      attachDrag(container, '_cpgf141_bound', function (canvas) {
        var getPos = function (e) { return eventPos(canvas, e); };

        var setFromPointer = function (pos) {
          var pc = state.sim.phasorCenter;
          if (!pc) return;
          var angle = Math.atan2(-(pos.y - pc.y), pos.x - pc.x);
          var omega = finiteNum(state.omega, 2.0);
          var rawPhase = angle - omega * state.sim.t;
          state.phase = wrapAngle(rawPhase + Math.PI) - Math.PI;
          var dist = Math.hypot(pos.x - pc.x, pos.y - pc.y);
          state.amplitude = Math.max(0.5, Math.min(2.5, dist / pc.scale));
        };

        var onDown = function (e) {
          var pos = getPos(e);
          var phasorCenter = state.sim.phasorCenter;
          if (phasorCenter) {
            var dist = Math.hypot(pos.x - phasorCenter.x, pos.y - phasorCenter.y);
            if (dist < phasorCenter.radius * 1.4) {
              state.sim.isDraggingPhasor = true;
              setFromPointer(pos);
              if (e.cancelable) e.preventDefault();
            }
          }
        };

        var onMove = function (e) {
          if (state.sim.isDraggingPhasor && state.sim.phasorCenter) {
            setFromPointer(getPos(e));
            if (redraw) redraw();
            if (e.cancelable) e.preventDefault();
          }
        };

        var onUp = function () {
          state.sim.isDraggingPhasor = false;
        };

        return { onDown: onDown, onMove: onMove, onUp: onUp };
      });
    },

    draw(ctx, width, height, state, dt) {
      if (!state.sim) this.init(null, state);
      const sim = state.sim;
      width = width || 640;
      height = height || 420;

      const omega = Math.max(0.2, finiteNum(state.omega, 2.0));
      const A0 = Math.max(0.2, finiteNum(state.amplitude, 1.5));
      const phi0 = finiteNum(state.phase, 0.0);
      const decay = Math.max(0.0, finiteNum(state.decay, 0.0));

      if (!sim.isDraggingPhasor && (
        sim.lastOmega !== omega ||
        sim.lastA0 !== A0 ||
        sim.lastPhi !== phi0 ||
        sim.lastDecay !== decay
      )) {
        sim.t = 0.0;
        sim.waveHistory = [];
        sim.phasorTrail = [];
      }
      sim.lastOmega = omega;
      sim.lastA0 = A0;
      sim.lastPhi = phi0;
      sim.lastDecay = decay;

      if (!sim.phasorTrail) sim.phasorTrail = [];

      sim.t += scaledDt(dt, state);

      const envelope = A0 * Math.exp(-decay * sim.t);
      const theta = omega * sim.t + phi0;

      const x_val = envelope * Math.cos(theta);
      const y_val = envelope * Math.sin(theta);
      const v_val = -decay * x_val - omega * y_val;
      const a_val = (decay * decay - omega * omega) * x_val + 2 * decay * omega * y_val;

      sim.waveHistory.push({ t: sim.t, x: x_val, v: v_val, a: a_val });
      if (sim.waveHistory.length > sim.maxWaveLen) {
        sim.waveHistory.shift();
      }
      if (decay > 0.005) {
        sim.phasorTrail.push({ x: x_val, y: y_val });
        if (sim.phasorTrail.length > 180) sim.phasorTrail.shift();
      } else {
        sim.phasorTrail = [];
      }

      stageFill(ctx, width, height);

      const pad = 16;
      const splitX = Math.round(width * 0.46);
      const leftW = splitX;

      inkLabel(ctx, 'complex plane', leftW / 2, pad + 2, { color: MUTED, font: fontSans(11), baseline: 'top' });

      const cx = leftW * 0.5;
      const cy = height * 0.52;
      const maxRadiusPx = Math.min(leftW * 0.34, (height - cy) - pad - 8, cy - 44);
      const scale = maxRadiusPx / 2.5;

      sim.phasorCenter = { x: cx, y: cy, radius: maxRadiusPx, scale: scale };

      ctx.save();
      ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.28);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx - maxRadiusPx - 10, cy);
      ctx.lineTo(cx + maxRadiusPx + 10, cy);
      ctx.moveTo(cx, cy + maxRadiusPx + 10);
      ctx.lineTo(cx, cy - maxRadiusPx - 10);
      ctx.stroke();
      ctx.restore();
      inkLabel(ctx, 'Re', cx + maxRadiusPx + 2, cy + 14, { color: MUTED, font: fontSans(10), align: 'right', pad: true });
      inkLabel(ctx, 'Im', cx + 12, cy - maxRadiusPx - 2, { color: MUTED, font: fontSans(10), align: 'left', pad: true });

      ctx.save();
      ctx.strokeStyle = 'rgba(204, 120, 92, 0.28)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(4, envelope * scale), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      if (sim.phasorTrail.length > 1) {
        ctx.save();
        ctx.lineWidth = 1.6;
        ctx.lineJoin = 'round';
        for (let ti = 1; ti < sim.phasorTrail.length; ti++) {
          const pt0 = sim.phasorTrail[ti - 1];
          const pt1 = sim.phasorTrail[ti];
          const alpha = (ti / sim.phasorTrail.length) * 0.7;
          ctx.strokeStyle = 'rgba(204, 120, 92, ' + alpha + ')';
          ctx.beginPath();
          ctx.moveTo(cx + pt0.x * scale, cy - pt0.y * scale);
          ctx.lineTo(cx + pt1.x * scale, cy - pt1.y * scale);
          ctx.stroke();
        }
        ctx.restore();
      }

      const phasorTipX = cx + x_val * scale;
      const phasorTipY = cy - y_val * scale;

      const vNormScale = scale / Math.max(0.5, omega);
      const vdx = (-decay * x_val - omega * y_val) * vNormScale * 0.35;
      const vdy = -(-decay * y_val + omega * x_val) * vNormScale * 0.35;
      const vC = capLen(vdx, vdy, 40);
      if (vC.ok) {
        arrow(ctx, phasorTipX, phasorTipY, phasorTipX + vC.dx, phasorTipY + vC.dy, TEAL, '');
        inkLabel(ctx, 'v', phasorTipX + vC.dx * 1.2, phasorTipY + vC.dy * 1.2, {
          color: TEAL, font: fontSans(11, '500'), pad: true
        });
      }

      const aRe = (decay * decay - omega * omega) * x_val + 2 * decay * omega * y_val;
      const aIm = (decay * decay - omega * omega) * y_val - 2 * decay * omega * x_val;
      const aNorm = scale / Math.max(0.5, omega * omega);
      const adx = aRe * aNorm * 0.22;
      const ady = -aIm * aNorm * 0.22;
      const aC = capLen(adx, ady, 36);
      if (aC.ok) {
        arrow(ctx, phasorTipX, phasorTipY, phasorTipX + aC.dx, phasorTipY + aC.dy, ROSE, '');
        inkLabel(ctx, 'a', phasorTipX + aC.dx * 1.15, phasorTipY + aC.dy * 1.15, {
          color: ROSE, font: fontSans(11, '500'), pad: true
        });
      }

      arrow(ctx, cx, cy, phasorTipX, phasorTipY, CORAL, 'z');

      ctx.save();
      ctx.fillStyle = CREAM;
      ctx.strokeStyle = CORAL;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(phasorTipX, phasorTipY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = 'rgba(212, 160, 23, 0.5)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(phasorTipX, phasorTipY);
      ctx.lineTo(phasorTipX, cy);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(phasorTipX, cy, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(splitX, pad);
      ctx.lineTo(splitX, height - pad);
      ctx.stroke();
      ctx.restore();

      const waveX = splitX + 28;
      const waveW = width - waveX - pad;
      const waveY = 40;
      const waveH = height - waveY - 28;
      inkLabel(ctx, 'x(t)', waveX, pad + 2, { color: MUTED, font: fontSans(11), align: 'left', baseline: 'top' });
      inkLabel(ctx, 'x', waveX + waveW - 72, pad + 2, { color: CORAL, font: fontSans(10), align: 'left', baseline: 'top' });
      inkLabel(ctx, 'v', waveX + waveW - 44, pad + 2, { color: TEAL, font: fontSans(10), align: 'left', baseline: 'top' });

      plotFrame(ctx, waveX, waveY, waveW, waveH);

      const waveMidY = waveY + waveH / 2;
      ctx.save();
      ctx.beginPath();
      ctx.rect(waveX + 1, waveY + 1, waveW - 2, waveH - 2);
      ctx.clip();

      ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.18);
      ctx.beginPath();
      ctx.moveTo(waveX, waveMidY);
      ctx.lineTo(waveX + waveW, waveMidY);
      ctx.stroke();

      if (sim.waveHistory.length > 1) {
        ctx.strokeStyle = CORAL;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < sim.waveHistory.length; i++) {
          const pt = sim.waveHistory[i];
          const px = waveX + (i / sim.maxWaveLen) * waveW;
          const py = waveMidY - pt.x * scale;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();

        ctx.strokeStyle = TEAL;
        ctx.lineWidth = 1.4;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        for (let i = 0; i < sim.waveHistory.length; i++) {
          const pt = sim.waveHistory[i];
          const px = waveX + (i / sim.maxWaveLen) * waveW;
          const py = waveMidY - (pt.v / omega) * scale;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      const curWaveX = waveX + ((Math.max(1, sim.waveHistory.length) - 1) / sim.maxWaveLen) * waveW;
      const curWaveY = waveMidY - x_val * scale;
      ctx.fillStyle = CORAL;
      ctx.beginPath();
      ctx.arc(curWaveX, curWaveY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      legend('Phasor', [
        { label: '$\\omega$', value: omega.toFixed(2) + ' rad/s' },
        { label: '$\\theta(t)$', value: wrapAngle(theta).toFixed(2) + ' rad' },
        { label: '$|z|=A_0 e^{-\\gamma t}$', value: envelope.toFixed(2) + ' m' }
      ]);
      legend('Observables', [
        { label: '$x=\\mathrm{Re}(z)$', value: x_val.toFixed(3) + ' m' },
        { label: '$v=\\dot{x}$', value: v_val.toFixed(3) + ' m/s' },
        { label: '$a=\\ddot{x}$', value: a_val.toFixed(3) + ' m/s²' }
      ]);
    }
  };

  PGRE.visualizers['cpgf-1.42'] = {
    id: 'cpgf-1.42',
    topic: 'cm',
    title: 'Coupled Oscillators & Normal-Mode Eigen-Ansatz',
    formulaLatex:
      '$$\\mathbf{M}\\mathbf{\\ddot{q}} + \\mathbf{K}\\mathbf{q} = \\mathbf{0} \\implies \\det(\\mathbf{K} - \\omega^2 \\mathbf{M}) = 0,\\quad q_k(t) = \\sum_r A_r a_k^{(r)} e^{i(\\omega_r t + \\phi_r)}$$',
    physicalStory:
      'In an $N$-degree-of-freedom coupled linear oscillator (masses connected by springs), individual coordinate trajectories exhibit quasiperiodic beats. There exist $N$ distinct collective normal modes wherein every particle oscillates at the same eigenfrequency $\\omega_r$ with fixed amplitude ratios and invariant phase coherence. The normal coordinates $Q_r$ cleanly decouple the system into $N$ independent harmonic oscillators. At $k_c=0$ the masses are independent: $\\omega_1=\\omega_2=\\sqrt{k/m}$ and energy does not transfer.',
    derivationSteps: [
      {
        step: 1,
        title: 'Equations of Motion in Matrix Form',
        formula: 'm\\ddot{x}_1 = -k x_1 + k_c(x_2 - x_1),\\quad m\\ddot{x}_2 = -k x_2 - k_c(x_2 - x_1) \\implies \\mathbf{M}\\mathbf{\\ddot{x}} + \\mathbf{K}\\mathbf{x} = \\mathbf{0}',
        text: 'Two identical masses $m$ between rigid walls with coupling spring $k_c$. The mass matrix is $M=\\mathrm{diag}(m,m)$ and stiffness matrix is $K=[[k+k_c,-k_c],[-k_c,k+k_c]]$.'
      },
      {
        step: 2,
        title: 'Normal-Mode Harmonic Ansatz',
        formula: '\\mathbf{x}(t) = \\mathbf{a} e^{i\\omega t} \\implies (\\mathbf{K} - \\omega^2 \\mathbf{M})\\mathbf{a} = \\mathbf{0}',
        text: 'All coordinates oscillate synchronously at frequency ω. Non-trivial amplitude eigenvectors a ≠ 0 exist if and only if the secular determinant vanishes.'
      },
      {
        step: 3,
        title: 'Secular Determinant & Eigenfrequency Roots',
        formula: '\\det \\begin{pmatrix} k + k_c - m\\omega^2 & -k_c \\\\ -k_c & k + k_c - m\\omega^2 \\end{pmatrix} = 0 \\implies (k + k_c - m\\omega^2)^2 - k_c^2 = 0',
        text: 'Solving the quadratic characteristic equation yields two distinct normal mode frequencies.'
      },
      {
        step: 4,
        title: 'Symmetric & Anti-symmetric Eigenmodes',
        formula: '\\omega_1 = \\sqrt{\\frac{k}{m}},\\; \\mathbf{a}^{(1)} = \\begin{pmatrix} 1 \\\\ 1 \\end{pmatrix};\\quad \\omega_2 = \\sqrt{\\frac{k + 2k_c}{m}},\\; \\mathbf{a}^{(2)} = \\begin{pmatrix} 1 \\\\ -1 \\end{pmatrix}',
        text: 'In Mode 1 (In-Phase), the coupling spring is unstretched. In Mode 2 (Anti-Phase), the coupling spring experiences double deformation.'
      }
    ],
    limitingCases: [
      {
        name: 'Uncoupled Limit (Independent Oscillators)',
        condition: 'k_c \\to 0',
        result: '\\omega_1 = \\omega_2 = \\sqrt{\\frac{k}{m}}',
        explanation: 'Both eigenfrequencies degenerate to the single spring-mass frequency; energy does not transfer between masses.'
      },
      {
        name: 'Strong Coupling Limit',
        condition: 'k_c \\gg k',
        result: '\\omega_1 = \\sqrt{\\frac{k}{m}},\\quad \\omega_2 \\approx \\sqrt{\\frac{2k_c}{m}} \\gg \\omega_1',
        explanation: 'Mode 1 remains a low-frequency center-of-mass sway, while Mode 2 becomes an extremely rapid anti-symmetric vibration.'
      },
      {
        name: 'Pure Symmetric Mode Excitation',
        condition: 'x_1(0) = x_2(0) = A',
        result: 'x_1(t) = x_2(t) = A\\cos(\\omega_1 t)',
        explanation: 'The coupling spring exerts zero force at all times; no beating occurs and frequency is independent of kc.'
      },
      {
        name: 'Beat Phenomenon (Single Mass Released)',
        condition: 'x_1(0) = A,\\; x_2(0) = 0',
        result: 'x_1(t) = A\\cos(\\bar{\\omega} t)\\cos(\\delta t),\\quad \\delta=(\\omega_2-\\omega_1)/2,\\quad \\omega_{\\mathrm{beat}}=|\\omega_2-\\omega_1|=2\\delta',
        explanation: 'Energy completely cycles back and forth between mass 1 and mass 2 with envelope frequency $\\delta=(\\omega_2-\\omega_1)/2$. The beat angular frequency is $|\\omega_2-\\omega_1|=2\\delta$.'
      }
    ],
    greTraps: [
      {
        trap: 'Coupling Spring Does NOT Affect Symmetric Mode Frequency',
        warning: 'Assuming ω1 must depend on kc.',
        strategy: 'In the symmetric mode ($x_1=x_2$), the coupling spring length is constant ($x_2-x_1=0$), so it exerts zero force. Therefore $\\omega_1=\\sqrt{k/m}$ regardless of $k_c$.'
      },
      {
        trap: 'The Factor of 2 in Anti-symmetric Mode',
        warning: 'Forgetting the factor of 2 in $\\omega_2=\\sqrt{(k+2k_c)/m}$.',
        strategy: 'When mass 1 moves right by $x$ and mass 2 moves left by $x$, the spring compresses by $2x$, exerting force $-k_c(2x)=-2k_c x$. Newton\'s 2nd law gives $m\\ddot{x}=-k x-2k_c x$, yielding $(k+2k_c)/m$.'
      },
      {
        trap: 'Coupled Identical Pendula',
        warning: 'Applying wall spring formulas directly to coupled pendula.',
        strategy: 'For two pendula of length $L$ coupled by spring $k$: $\\omega_1=\\sqrt{g/L}$ (spring unstretched), $\\omega_2=\\sqrt{g/L+2k/m}$.'
      }
    ],
    parameters: [
      { id: 'm', label: 'Mass $m_1=m_2$ ($m$)', min: 0.2, max: 3.0, step: 0.1, default: 1.0, unit: 'kg' },
      { id: 'k_wall', label: 'Wall Spring ($k$)', min: 2.0, max: 25.0, step: 1.0, default: 8.0, unit: 'N/m' },
      { id: 'k_couple', label: 'Coupling Spring ($k_c$)', min: 0.0, max: 25.0, step: 1.0, default: 6.0, unit: 'N/m' },
      { id: 'mode', label: 'Normal Mode', type: 'select', options: [
        { value: 'beat', label: 'Beat (m1 released)' },
        { value: 'in-phase', label: 'In-phase (symmetric)' },
        { value: 'anti-phase', label: 'Anti-phase (antisymmetric)' }
      ], default: 'beat' },
      { id: 'damping', label: 'Damping Ratio ($\\zeta$)', min: 0.0, max: 0.1, step: 0.005, default: 0.0, unit: '' },
      SPEED_PARAM
    ],
    challenge: {
      question:
        'Two identical simple pendula of length $L$ and bob mass $m$ are suspended side by side and connected by a light horizontal spring of constant $k$ at their bobs. For small oscillations, what are the two normal mode angular frequencies $\\omega_1$ and $\\omega_2$?',
      options: [
        'A) $\\omega_1=\\sqrt{g/L}$, $\\omega_2=\\sqrt{g/L+k/m}$',
        'B) $\\omega_1=\\sqrt{g/L}$, $\\omega_2=\\sqrt{g/L+2k/m}$',
        'C) $\\omega_1=\\sqrt{g/L-k/m}$, $\\omega_2=\\sqrt{g/L+k/m}$',
        'D) $\\omega_1=\\sqrt{k/m}$, $\\omega_2=\\sqrt{g/L+2k/m}$',
        'E) $\\omega_1=\\sqrt{g/L}$, $\\omega_2=\\sqrt{2g/L+k/m}$'
      ],
      correct: 1,
      explanation:
        'In the in-phase symmetric mode ($\\theta_1=\\theta_2$), the distance between the bobs remains constant, so the coupling spring is never stretched and $\\omega_1=\\sqrt{g/L}$. In the anti-phase mode ($\\theta_1=-\\theta_2$), when bob 1 moves right by $x$, bob 2 moves left by $x$, deforming the spring by $2x$ and providing an additional restoring force $-2kx$. The equation is $m\\ddot{x}=-mg(x/L)-2kx$, which gives $\\omega_2=\\sqrt{g/L+2k/m}$. Option B is correct.'
    },

    onParamChange: function (id, val, state) {
      if (id === 'mode' && state.sim) applyCoupledICs(state.sim, val || 'beat');
    },

    init(container, state, redraw) {
      state.m = finiteNum(state.m, 1.0);
      state.k_wall = finiteNum(state.k_wall, 8.0);
      state.k_couple = finiteNum(state.k_couple, 6.0);
      state.damping = finiteNum(state.damping, 0.0);
      state.simSpeed = finiteNum(state.simSpeed, 1.0);
      state.mode = state.mode || 'beat';

      state.sim = {
        x1: 1.2,
        x2: 0.0,
        v1: 0.0,
        v2: 0.0,
        t: 0.0,
        draggedMass: null,
        history: [],
        maxHistoryLen: 240,
        lastMode: state.mode
      };
      applyCoupledICs(state.sim, state.mode);

      attachDrag(container, '_cpgf142_bound', function (canvas) {
        var getPos = function (e) { return eventPos(canvas, e); };

        var onDown = function (e) {
          var pos = getPos(e);
          var b1 = state.sim.b1Pos;
          var b2 = state.sim.b2Pos;
          if (b1 && Math.hypot(pos.x - b1.x, pos.y - b1.y) < b1.size * 1.1) {
            state.sim.draggedMass = 1;
            state.sim.v1 = 0;
            if (e.cancelable) e.preventDefault();
          } else if (b2 && Math.hypot(pos.x - b2.x, pos.y - b2.y) < b2.size * 1.1) {
            state.sim.draggedMass = 2;
            state.sim.v2 = 0;
            if (e.cancelable) e.preventDefault();
          }
        };

        var onMove = function (e) {
          if (state.sim.draggedMass && state.sim.eq1X !== undefined) {
            var pos = getPos(e);
            var scale = state.sim.scale || 60;
            if (state.sim.draggedMass === 1) {
              state.sim.x1 = Math.max(-1.8, Math.min(1.8, (pos.x - state.sim.eq1X) / scale));
              state.sim.v1 = 0;
            } else if (state.sim.draggedMass === 2) {
              state.sim.x2 = Math.max(-1.8, Math.min(1.8, (pos.x - state.sim.eq2X) / scale));
              state.sim.v2 = 0;
            }
            if (redraw) redraw();
            if (e.cancelable) e.preventDefault();
          }
        };

        var onUp = function () {
          state.sim.draggedMass = null;
        };

        return { onDown: onDown, onMove: onMove, onUp: onUp };
      });
    },

    draw(ctx, width, height, state, dt) {
      if (!state.sim) this.init(null, state);
      const sim = state.sim;
      width = width || 640;
      height = height || 420;

      const m = Math.max(0.1, finiteNum(state.m, 1.0));
      const k = Math.max(0.1, finiteNum(state.k_wall, 8.0));
      const kc = Math.max(0.0, finiteNum(state.k_couple, 6.0));
      const damping = Math.max(0.0, finiteNum(state.damping, 0.0));
      const mode = state.mode || 'beat';

      if (sim.lastMode !== mode && !sim.draggedMass) {
        applyCoupledICs(sim, mode);
      }
      sim.lastMode = mode;

      const omega1 = Math.sqrt(k / m);
      const omega2 = Math.sqrt((k + 2 * kc) / m);

      const subSteps = 8;
      const stepDt = scaledDt(dt, state) / subSteps;

      if (!sim.draggedMass) {
        for (let s = 0; s < subSteps; s++) {
          const gamma = damping * 2 * omega1;
          const a1 = (-k * sim.x1 + kc * (sim.x2 - sim.x1) - gamma * m * sim.v1) / m;
          const a2 = (-k * sim.x2 - kc * (sim.x2 - sim.x1) - gamma * m * sim.v2) / m;

          sim.v1 += a1 * stepDt;
          sim.v2 += a2 * stepDt;
          sim.x1 += sim.v1 * stepDt;
          sim.x2 += sim.v2 * stepDt;
          sim.t += stepDt;
        }
      }

      sim.history.push({ t: sim.t, x1: sim.x1, x2: sim.x2 });
      if (sim.history.length > sim.maxHistoryLen) {
        sim.history.shift();
      }

      const Q1 = (sim.x1 + sim.x2) / Math.SQRT2;
      const Q2 = (sim.x1 - sim.x2) / Math.SQRT2;

      stageFill(ctx, width, height);

      const pad = 16;
      const topH = Math.round(Math.max(168, height * 0.46));
      const wallLeftX = pad;
      const wallW = 14;
      const wallRightX = width - pad - wallW;
      const floorY = topH - 44;
      const centerY = floorY - 22;
      const blockSize = Math.max(34, Math.min(44, 30 + m * 5));

      const inner = wallRightX - (wallLeftX + wallW);
      const eq1X = wallLeftX + wallW + inner * 0.32;
      const eq2X = wallLeftX + wallW + inner * 0.68;
      const gap = eq2X - eq1X;
      const scale = Math.max(24, Math.min(inner * 0.14, (gap - blockSize - 18) / 3.6));

      sim.eq1X = eq1X;
      sim.eq2X = eq2X;
      sim.scale = scale;

      const m1X = eq1X + sim.x1 * scale;
      const m2X = eq2X + sim.x2 * scale;

      sim.b1Pos = { x: m1X, y: centerY, size: blockSize };
      sim.b2Pos = { x: m2X, y: centerY, size: blockSize };

      if (DrawUtils && DrawUtils.drawHatchedWall) {
        DrawUtils.drawHatchedWall(ctx, wallLeftX, centerY - 50, wallW, floorY - (centerY - 50) + 4, 'vertical-left');
        DrawUtils.drawHatchedWall(ctx, wallRightX, centerY - 50, wallW, floorY - (centerY - 50) + 4, 'vertical-right');
      }
      hatchFloor(ctx, wallLeftX + wallW, wallRightX, floorY);

      ctx.save();
      ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.2);
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(eq1X, pad + 22);
      ctx.lineTo(eq1X, floorY + 8);
      ctx.moveTo(eq2X, pad + 22);
      ctx.lineTo(eq2X, floorY + 8);
      ctx.stroke();
      ctx.restore();

      drawSpring(ctx, wallLeftX + wallW, centerY, m1X - blockSize / 2, centerY, 10, 8, CORAL);
      drawSpring(ctx, m1X + blockSize / 2, centerY, m2X - blockSize / 2, centerY, 12, 8, kc < 1e-9 ? 'rgba(93, 184, 166, 0.28)' : TEAL);
      drawSpring(ctx, m2X + blockSize / 2, centerY, wallRightX, centerY, 10, 8, CORAL);

      if (DrawUtils && DrawUtils.drawMassBlock) {
        DrawUtils.drawMassBlock(ctx, m1X, centerY, blockSize, 'm1', CORAL, sim.draggedMass === 1);
        DrawUtils.drawMassBlock(ctx, m2X, centerY, blockSize, 'm2', GOLD, sim.draggedMass === 2);
      }

      inkLabel(ctx, 'k', (wallLeftX + wallW + m1X - blockSize / 2) / 2, pad + 10, { color: CORAL, font: fontSans(11), pad: true });
      inkLabel(ctx, kc < 1e-9 ? 'kc = 0' : 'kc', (m1X + m2X) / 2, pad + 10, { color: TEAL, font: fontSans(11), pad: true });
      inkLabel(ctx, 'k', (m2X + blockSize / 2 + wallRightX) / 2, pad + 10, { color: CORAL, font: fontSans(11), pad: true });

      inkLabel(
        ctx,
        sim.draggedMass ? ('dragging m' + sim.draggedMass) : 'drag m1 or m2',
        width / 2,
        floorY + 22,
        { color: MUTED, font: fontSans(10) }
      );

      ctx.save();
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad, topH);
      ctx.lineTo(width - pad, topH);
      ctx.stroke();
      ctx.restore();

      const plotX = 40;
      const plotY = topH + 26;
      const plotW = width - plotX - pad;
      const plotH = height - plotY - 18;
      inkLabel(ctx, 'x1(t), x2(t)', plotX, topH + 12, { color: MUTED, font: fontSans(11), align: 'left' });
      inkLabel(ctx, 'x1', plotX + plotW - 64, topH + 12, { color: CORAL, font: fontSans(10), align: 'left' });
      inkLabel(ctx, 'x2', plotX + plotW - 32, topH + 12, { color: GOLD, font: fontSans(10), align: 'left' });

      plotFrame(ctx, plotX, plotY, plotW, plotH);

      const graphMidY = plotY + plotH / 2;
      let yMax = 1.6;
      for (let i = 0; i < sim.history.length; i++) {
        yMax = Math.max(yMax, Math.abs(sim.history[i].x1), Math.abs(sim.history[i].x2));
      }
      const yScale = (plotH * 0.42) / yMax;

      ctx.save();
      ctx.beginPath();
      ctx.rect(plotX + 1, plotY + 1, plotW - 2, plotH - 2);
      ctx.clip();

      ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.18);
      ctx.beginPath();
      ctx.moveTo(plotX, graphMidY);
      ctx.lineTo(plotX + plotW, graphMidY);
      ctx.stroke();

      if (sim.history.length > 1) {
        ctx.strokeStyle = CORAL;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < sim.history.length; i++) {
          const pt = sim.history[i];
          const px = plotX + (i / sim.maxHistoryLen) * plotW;
          const py = graphMidY - pt.x1 * yScale;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();

        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < sim.history.length; i++) {
          const pt = sim.history[i];
          const px = plotX + (i / sim.maxHistoryLen) * plotW;
          const py = graphMidY - pt.x2 * yScale;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      ctx.restore();

      legend('Normal modes', [
        { label: '$\\omega_1=\\sqrt{k/m}$ (in-phase)', value: omega1.toFixed(2) + ' rad/s' },
        { label: '$Q_1=(x_1+x_2)/\\sqrt{2}$', value: Q1.toFixed(2) + ' m' },
        { label: '$\\omega_2=\\sqrt{(k+2k_c)/m}$ (anti-phase)', value: omega2.toFixed(2) + ' rad/s' },
        { label: '$Q_2=(x_1-x_2)/\\sqrt{2}$', value: Q2.toFixed(2) + ' m' },
        { label: '$\\omega_{\\mathrm{beat}}=|\\omega_2-\\omega_1|=2\\delta$', value: Math.abs(omega2 - omega1).toFixed(2) + ' rad/s' },
        { label: 'Mode', value: kc < 1e-9 ? 'uncoupled ($k_c=0$)' : mode }
      ]);
    }
  };


})(typeof window !== 'undefined' ? window : globalThis);
