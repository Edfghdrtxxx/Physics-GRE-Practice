/* Formula visualizers — G3 Hooke / SHO phasor / coupled oscillators / amplitude resonance */
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
  var INK = '#141413';
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
    CREAM = t.bg; INK = t.ink; MUTED = t.muted; LINE = t.line; PANEL = t.panel;
  }

  function stageFill(ctx, w, h) {
    syncStageTheme();
    ctx.fillStyle = (CV && CV.colors && CV.colors.bg) || CREAM;
    ctx.fillRect(0, 0, w, h);
  }

  function theme() {
    return PGRE.vizStageTheme ? PGRE.vizStageTheme() : {
      bg: CREAM, ink: INK, muted: MUTED, line: LINE, panel: PANEL,
      inkFade: function (a) { return 'rgba(20, 20, 19, ' + a + ')'; },
      chipFade: function (a) { return 'rgba(250, 249, 245, ' + a + ')'; }
    };
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
      ctx.fillStyle = theme().chipFade(0.92);
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
      ctx.fillStyle = theme().chipFade(0.94);
      ctx.fillRect(mx - tw / 2 - 3, my - 7, tw + 6, 14);
      ctx.fillStyle = color;
      ctx.fillText(label, mx, my);
    }
    ctx.restore();
  }

  function hatchFloor(ctx, x0, x1, floorY) {
    ctx.save();
    ctx.strokeStyle = theme().inkFade(0.28);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x0, floorY);
    ctx.lineTo(x1, floorY);
    ctx.stroke();
    ctx.strokeStyle = theme().inkFade(0.12);
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

  function drawWall(ctx, x, y, w, h, side) {
    var th = theme();
    ctx.save();
    ctx.fillStyle = th.chipFade(0.72);
    ctx.strokeStyle = th.inkFade(0.32);
    ctx.lineWidth = 1.4;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.strokeStyle = th.inkFade(0.16);
    ctx.lineWidth = 1;
    ctx.beginPath();
    var step = 7;
    var py;
    if (side === 'right') {
      for (py = y; py < y + h + w; py += step) {
        ctx.moveTo(x + w, py);
        ctx.lineTo(x, py - w);
      }
    } else {
      for (py = y; py < y + h + w; py += step) {
        ctx.moveTo(x, py);
        ctx.lineTo(x + w, py - w);
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawMass(ctx, cx, cy, size, label, color, hot) {
    var half = size / 2;
    ctx.save();
    ctx.fillStyle = color || INK;
    ctx.strokeStyle = INK;
    ctx.lineWidth = hot ? 2.6 : 1.8;
    roundRectPath(ctx, cx - half, cy - half, size, size, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(cx, cy + half * 0.22, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = fontSans(11, '600');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = INK;
    ctx.fillText(String(label), cx, cy - 4);
    ctx.restore();
  }

  function drawSpring(ctx, x1, y1, x2, y2, coils, amp, color) {
    var len = Math.hypot(x2 - x1, y2 - y1);
    if (len < 20 || !(DrawUtils && DrawUtils.drawSpring)) {
      coilSpring(ctx, x1, y1, x2, y2, coils, amp, color);
      return;
    }
    DrawUtils.drawSpring(ctx, x1, y1, x2, y2, coils || 10, (amp || 8) * 2, color, 0);
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

  var SPEED_PARAM = { id: 'simSpeed', label: 'Simulation Speed', min: 0.2, max: 3.0, step: 0.2, default: 1.0, unit: 'x' };

  function wrapAngle(th) {
    var twoPi = 2 * Math.PI;
    var p = th % twoPi;
    if (p < 0) p += twoPi;
    return p;
  }

  /* x'' + gamma x' + omega^2 x = 0, exact for under/critical/over-damped. */
  function shoEvolve(x0, v0, omega, gamma, t) {
    omega = Math.max(1e-9, omega);
    var g2 = 0.5 * gamma;
    var x;
    var v;
    var e;
    var A;
    var B;
    var c;
    var s;
    if (gamma < 1e-8) {
      c = Math.cos(omega * t);
      s = Math.sin(omega * t);
      x = x0 * c + (v0 / omega) * s;
      v = -x0 * omega * s + v0 * c;
      return { x: x, v: v };
    }
    var disc = omega * omega - g2 * g2;
    if (disc > 1e-10) {
      var wd = Math.sqrt(disc);
      A = x0;
      B = (v0 + g2 * x0) / wd;
      e = Math.exp(-g2 * t);
      c = Math.cos(wd * t);
      s = Math.sin(wd * t);
      x = e * (A * c + B * s);
      v = -g2 * x + e * (-A * wd * s + B * wd * c);
      return { x: x, v: v };
    }
    if (disc >= -1e-10) {
      e = Math.exp(-g2 * t);
      A = x0;
      B = v0 + g2 * x0;
      x = e * (A + B * t);
      v = -g2 * x + e * B;
      return { x: x, v: v };
    }
    var w = Math.sqrt(-disc);
    A = x0;
    B = (v0 + g2 * x0) / w;
    e = Math.exp(-g2 * t);
    var ch = Math.cosh(w * t);
    var sh = Math.sinh(w * t);
    x = e * (A * ch + B * sh);
    v = -g2 * x + e * (A * w * sh + B * w * ch);
    return { x: x, v: v };
  }

  function captureCoupledICs(sim) {
    sim.Q10 = (sim.x1 + sim.x2) / Math.SQRT2;
    sim.Q20 = (sim.x1 - sim.x2) / Math.SQRT2;
    sim.Qd10 = (sim.v1 + sim.v2) / Math.SQRT2;
    sim.Qd20 = (sim.v1 - sim.v2) / Math.SQRT2;
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
    captureCoupledICs(sim);
  }

  PGRE.visualizers['cpgf-1.39'] = {
    id: 'cpgf-1.39',
    topic: 'cm',
    title: 'Spring Equation of Motion & Hooke\'s Law Dynamics',
    formulaLatex: '$$F = m\\ddot{x} = -kx \\iff \\ddot{x} + \\omega_0^2 x = 0,\\quad \\omega_0 = \\sqrt{\\frac{k}{m}}$$',
    physicalStory:
      'Hooke\'s law is the force from the universal quadratic well $V(x)=\\tfrac12 k x^2$ near any stable equilibrium: $F=-V\'(x)=-kx$. Newton\'s law then reads $\\ddot{x}+\\omega_0^2 x=0$ with $\\omega_0=\\sqrt{k/m}$. The picture is energy, not a physical hill: the particle moves on the $x$-axis while $V(x)$ is plotted vertically. At each $x$, the gap from $V$ up to the total energy $E$ is the kinetic energy $T=E-V$. Turning points sit where $V=E$. For $\\zeta=0$, $E$ is invariant and $T$ and $V$ trade with a $\\pi/2$ lag. Linear damping $\\zeta>0$ lowers the $E$ line as the motion spirals into the origin.',
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
        title: 'Energy Partition on the Well',
        formula: 'E = \\frac{1}{2}m v^2 + \\frac{1}{2}k x^2 = \\frac{1}{2}k A^2,\\quad T(x)=E-V(x),\\quad x_{\\mathrm{tp}}=\\pm A',
        text: 'The classically allowed region is $V(x)\\le E$. Kinetic energy is the vertical gap $E-V$; it is maximum at $x=0$ and vanishes at the turning points $\\pm A$.'
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
        x0: state.A,
        v0: 0.0,
        isDragging: false,
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
          if (block && Math.hypot(pos.x - block.x, pos.y - block.y) < block.size * 1.25) {
            state.sim.isDragging = true;
            state.sim.v = 0;
            state.sim.v0 = 0;
            state.sim.t = 0;
            if (e.cancelable) e.preventDefault();
          }
        };

        var onMove = function (e) {
          if (state.sim.isDragging && state.sim.originX !== undefined) {
            var pos = getPos(e);
            var scale = state.sim.pixelsPerMeter || 80;
            var newX = (pos.x - state.sim.originX) / scale;
            state.sim.x = Math.max(-2.2, Math.min(2.2, newX));
            state.sim.v = 0;
            state.sim.x0 = state.sim.x;
            state.sim.v0 = 0;
            state.sim.t = 0;
            if (redraw) redraw();
            if (e.cancelable) e.preventDefault();
          }
        };

        var onUp = function () {
          if (state.sim.isDragging) {
            state.sim.x0 = state.sim.x;
            state.sim.v0 = 0;
            state.sim.t = 0;
          }
          state.sim.isDragging = false;
        };

        return { onDown: onDown, onMove: onMove, onUp: onUp };
      });
    },

    draw(ctx, width, height, state, dt) {
      if (!state.sim) this.init(null, state);
      var sim = state.sim;
      width = width || 640;
      height = height || 420;

      var m = Math.max(0.1, finiteNum(state.m, 1.0));
      var k = Math.max(0.1, finiteNum(state.k, 16.0));
      var damping = Math.max(0, finiteNum(state.damping, 0.0));
      var Aset = finiteNum(state.A, 1.2);

      if (sim.lastA !== Aset) {
        sim.x = Aset;
        sim.v = 0;
        sim.x0 = Aset;
        sim.v0 = 0;
        sim.t = 0;
      } else if (!sim.isDragging && (
        sim.lastM !== m ||
        sim.lastK !== k ||
        sim.lastDamp !== damping
      )) {
        sim.x0 = sim.x;
        sim.v0 = sim.v;
        sim.t = 0;
      }
      sim.lastA = Aset;
      sim.lastM = m;
      sim.lastK = k;
      sim.lastDamp = damping;

      var omega0 = Math.sqrt(k / m);
      var gamma = 2 * damping * omega0;

      if (!sim.isDragging) {
        sim.t += scaledDt(dt, state);
        var ev = shoEvolve(sim.x0, sim.v0, omega0, gamma, sim.t);
        sim.x = ev.x;
        sim.v = ev.v;
      }

      var T = 0.5 * m * sim.v * sim.v;
      var V = 0.5 * k * sim.x * sim.x;
      var E = T + V;
      var A_E = Math.sqrt((2 * Math.max(0, E)) / k);

      stageFill(ctx, width, height);

      var pad = 16;
      var railY = height - 34;
      var wellX = 48;
      var wellY = 22;
      var wellW = width - wellX - 18;
      var wellH = railY - wellY - 52;
      var originX = wellX + wellW * 0.5;
      var vZeroY = wellY + wellH - 6;
      var xMax = Math.max(1.8, Aset * 1.35);
      var sx = (wellW * 0.46) / xMax;
      var Vmax = 0.5 * k * xMax * xMax;
      var sy = (wellH - 24) / Math.max(Vmax, 1e-6);

      sim.originX = originX;
      sim.pixelsPerMeter = sx;

      function toX(x) { return originX + x * sx; }
      function toY(val) { return vZeroY - val * sy; }

      ctx.save();
      ctx.beginPath();
      ctx.rect(wellX, wellY, wellW, wellH);
      ctx.clip();

      ctx.strokeStyle = theme().inkFade(0.07);
      ctx.lineWidth = 1;
      ctx.beginPath();
      var gx;
      for (gx = originX; gx < wellX + wellW; gx += 36) {
        ctx.moveTo(gx, wellY);
        ctx.lineTo(gx, wellY + wellH);
      }
      for (gx = originX; gx > wellX; gx -= 36) {
        ctx.moveTo(gx, wellY);
        ctx.lineTo(gx, wellY + wellH);
      }
      ctx.stroke();

      ctx.strokeStyle = theme().inkFade(0.28);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(wellX + 8, vZeroY);
      ctx.lineTo(wellX + wellW - 8, vZeroY);
      ctx.moveTo(originX, wellY + 8);
      ctx.lineTo(originX, vZeroY + 4);
      ctx.stroke();

      var xi;
      ctx.beginPath();
      for (xi = -xMax; xi <= xMax + 1e-9; xi += xMax / 48) {
        var px = toX(xi);
        var py = toY(0.5 * k * xi * xi);
        if (xi === -xMax) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = CORAL;
      ctx.lineWidth = 2.2;
      ctx.stroke();

      ctx.lineTo(toX(xMax), vZeroY);
      ctx.lineTo(toX(-xMax), vZeroY);
      ctx.closePath();
      ctx.fillStyle = 'rgba(204, 120, 92, 0.10)';
      ctx.fill();

      if (E > 1e-6 && A_E > 1e-4) {
        var xL = toX(-A_E);
        var xR = toX(A_E);
        var yE = toY(E);
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 1.4;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(xL, yE);
        ctx.lineTo(xR, yE);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.strokeStyle = theme().inkFade(0.18);
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(xL, yE);
        ctx.lineTo(xL, vZeroY);
        ctx.moveTo(xR, yE);
        ctx.lineTo(xR, vZeroY);
        ctx.stroke();
        ctx.setLineDash([]);

        var xNow = toX(sim.x);
        var yV = toY(V);
        var yTop = toY(E);
        if (yV > yTop + 1) {
          ctx.fillStyle = 'rgba(93, 184, 166, 0.38)';
          ctx.fillRect(xNow - 6, yTop, 12, yV - yTop);
        }
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(xNow, vZeroY);
        ctx.lineTo(xNow, yTop);
        ctx.stroke();
      }

      ctx.fillStyle = GOLD;
      ctx.strokeStyle = CORAL;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(toX(sim.x), toY(V), 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      inkLabel(ctx, 'V(x)', wellX + 6, wellY + 10, { color: CORAL, font: fontSans(11, '500'), align: 'left', pad: true });
      inkLabel(ctx, 'x', wellX + wellW - 12, vZeroY + 12, { color: MUTED, font: fontSans(11), align: 'right', pad: true });
      if (E > 1e-6) {
        inkLabel(ctx, 'E', toX(Math.min(xMax * 0.92, A_E + 0.05 * xMax)) + 10, toY(E), {
          color: GOLD, font: fontSans(11, '500'), align: 'left', pad: true
        });
      }

      hatchFloor(ctx, pad, width - pad, railY);

      ctx.save();
      ctx.strokeStyle = theme().inkFade(0.2);
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(originX, vZeroY);
      ctx.lineTo(originX, railY + 6);
      ctx.stroke();
      ctx.restore();
      inkLabel(ctx, 'x = 0', originX, railY + 16, { color: MUTED, font: fontSans(10) });

      var massSize = Math.max(34, Math.min(46, 30 + m * 5));
      var massX = Math.max(pad + massSize / 2, Math.min(width - pad - massSize / 2, toX(sim.x)));
      var massY = railY - massSize / 2;
      sim.blockScreenPos = { x: massX, y: massY, size: massSize };

      ctx.save();
      ctx.strokeStyle = theme().inkFade(0.16);
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(massX, Math.min(toY(V), railY - massSize - 4));
      ctx.lineTo(massX, massY - massSize / 2);
      ctx.stroke();
      ctx.restore();

      drawMass(ctx, massX, massY, massSize, 'm', CORAL, sim.isDragging);

      var forceVal = -k * sim.x;
      var fFrom = massX;
      var fCap = capLen(forceVal * 3.0, 0, 64);
      if (fCap.ok && Math.abs(forceVal) > 0.08) {
        arrow(ctx, fFrom, massY - massSize / 2 - 14, fFrom + fCap.dx, massY - massSize / 2 - 14, ROSE, 'F');
      }

      inkLabel(
        ctx,
        sim.isDragging ? 'dragging' : 'drag the mass',
        pad + 8,
        pad + 4,
        { color: MUTED, font: fontSans(10), align: 'left', baseline: 'top' }
      );

      legend('Oscillator', [
        { label: '$\\omega_0=\\sqrt{k/m}$', value: '$' + omega0.toFixed(2) + '\\,\\mathrm{rad/s}$' },
        { label: '$T_0=2\\pi/\\omega_0$', value: '$' + (2 * Math.PI / omega0).toFixed(3) + '\\,\\mathrm{s}$' },
        { label: '$x$', value: '$' + sim.x.toFixed(3) + '\\,\\mathrm{m}$' },
        { label: '$v$', value: '$' + sim.v.toFixed(3) + '\\,\\mathrm{m/s}$' }
      ]);
      legend('Energy well', [
        { label: '$T=E-V$', value: '$' + T.toFixed(2) + '\\,\\mathrm{J}$' },
        { label: '$V=\\tfrac12 k x^2$', value: '$' + V.toFixed(2) + '\\,\\mathrm{J}$' },
        { label: damping > 1e-6 ? '$E$ ($\\zeta>0$, decaying)' : '$E$ ($\\zeta=0$, conserved)', value: '$' + E.toFixed(2) + '\\,\\mathrm{J}$' },
        { label: '$x_{\\mathrm{tp}}=\\pm\\sqrt{2E/k}$', value: '$' + (A_E).toFixed(3) + '\\,\\mathrm{m}$' }
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
      'One-dimensional SHM is the real projection of uniform circular motion in the complex plane. The phasor $z(t)=A_0 e^{-\\gamma t}e^{i(\\omega t+\\phi_0)}$ rotates counterclockwise at $\\omega$; the physical coordinate is the shadow $x=\\mathrm{Re}(z)$ on the real axis. That shadow, copied to the right, writes $x(t)$. Differentiation multiplies by $i\\omega$, rotating the velocity phasor $+90^\\circ$ ahead of $z$; acceleration is antiparallel ($-\\omega^2 z$). With $\\gamma>0$ the tip traces a logarithmic spiral inward.',
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
        maxWaveLen: 240,
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
            if (dist < phasorCenter.radius * 1.35) {
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
      var sim = state.sim;
      width = width || 640;
      height = height || 420;

      var omega = Math.max(0.2, finiteNum(state.omega, 2.0));
      var A0 = Math.max(0.2, finiteNum(state.amplitude, 1.5));
      var phi0 = finiteNum(state.phase, 0.0);
      var decay = Math.max(0.0, finiteNum(state.decay, 0.0));

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

      if (!sim.isDraggingPhasor) sim.t += scaledDt(dt, state);

      var envelope = A0 * Math.exp(-decay * sim.t);
      var theta = omega * sim.t + phi0;
      var x_val = envelope * Math.cos(theta);
      var y_val = envelope * Math.sin(theta);
      var v_val = -decay * x_val - omega * y_val;
      var a_val = (decay * decay - omega * omega) * x_val + 2 * decay * omega * y_val;

      sim.waveHistory.push({ t: sim.t, x: x_val });
      if (sim.waveHistory.length > sim.maxWaveLen) sim.waveHistory.shift();
      if (decay > 0.005) {
        sim.phasorTrail.push({ x: x_val, y: y_val });
        if (sim.phasorTrail.length > 200) sim.phasorTrail.shift();
      } else {
        sim.phasorTrail = [];
      }

      stageFill(ctx, width, height);

      var pad = 16;
      var splitX = Math.round(width * 0.58);
      var cx = splitX * 0.5;
      var cy = height * 0.52;
      var maxRadiusPx = Math.min(splitX * 0.36, (height - cy) - pad - 10, cy - 40);
      var scale = maxRadiusPx / 2.5;
      sim.phasorCenter = { x: cx, y: cy, radius: maxRadiusPx, scale: scale };

      inkLabel(ctx, 'complex plane', splitX / 2, pad + 2, { color: MUTED, font: fontSans(11), baseline: 'top' });

      ctx.save();
      ctx.strokeStyle = theme().inkFade(0.26);
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
        var ti;
        for (ti = 1; ti < sim.phasorTrail.length; ti++) {
          var pt0 = sim.phasorTrail[ti - 1];
          var pt1 = sim.phasorTrail[ti];
          ctx.strokeStyle = 'rgba(204, 120, 92, ' + ((ti / sim.phasorTrail.length) * 0.7) + ')';
          ctx.beginPath();
          ctx.moveTo(cx + pt0.x * scale, cy - pt0.y * scale);
          ctx.lineTo(cx + pt1.x * scale, cy - pt1.y * scale);
          ctx.stroke();
        }
        ctx.restore();
      }

      var tipX = cx + x_val * scale;
      var tipY = cy - y_val * scale;
      arrow(ctx, cx, cy, tipX, tipY, CORAL, 'z');

      ctx.save();
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 1.3;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tipX, cy);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      ctx.save();
      ctx.fillStyle = CORAL;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(tipX, tipY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(tipX, cy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = theme().inkFade(0.22);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      var arcR = Math.max(14, Math.min(28, envelope * scale * 0.28));
      ctx.arc(cx, cy, arcR, -theta - 0.55, -theta - 0.08);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(splitX, pad);
      ctx.lineTo(splitX, height - pad);
      ctx.stroke();
      ctx.restore();

      var waveX = splitX + 22;
      var waveW = width - waveX - pad;
      var waveY = 36;
      var waveH = height - waveY - 24;
      inkLabel(ctx, 'x(t) = Re(z)', waveX, pad + 2, { color: MUTED, font: fontSans(11), align: 'left', baseline: 'top' });

      var waveMidY = waveY + waveH / 2;
      ctx.save();
      ctx.beginPath();
      ctx.rect(waveX, waveY, waveW, waveH);
      ctx.clip();

      ctx.strokeStyle = theme().inkFade(0.2);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(waveX, waveMidY);
      ctx.lineTo(waveX + waveW, waveMidY);
      ctx.stroke();

      if (sim.waveHistory.length > 1) {
        ctx.strokeStyle = CORAL;
        ctx.lineWidth = 2;
        ctx.beginPath();
        var i;
        for (i = 0; i < sim.waveHistory.length; i++) {
          var pt = sim.waveHistory[i];
          var px = waveX + (i / sim.maxWaveLen) * waveW;
          var py = waveMidY - pt.x * scale;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }

      var curWaveX = waveX + ((Math.max(1, sim.waveHistory.length) - 1) / sim.maxWaveLen) * waveW;
      var curWaveY = waveMidY - x_val * scale;
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(curWaveX, curWaveY, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = 'rgba(212, 160, 23, 0.55)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(tipX, cy);
      ctx.lineTo(curWaveX, curWaveY);
      ctx.stroke();
      ctx.restore();

      legend('Phasor', [
        { label: '$\\omega$', value: '$' + omega.toFixed(2) + '\\,\\mathrm{rad/s}$' },
        { label: '$\\theta(t)=\\omega t+\\phi_0$', value: '$' + wrapAngle(theta).toFixed(2) + '\\,\\mathrm{rad}$' },
        { label: '$|z|=A_0 e^{-\\gamma t}$', value: '$' + envelope.toFixed(2) + '\\,\\mathrm{m}$' }
      ]);
      legend('Projection', [
        { label: '$x=\\mathrm{Re}(z)$', value: '$' + x_val.toFixed(3) + '\\,\\mathrm{m}$' },
        { label: '$v=\\dot{x}$', value: '$' + v_val.toFixed(3) + '\\,\\mathrm{m/s}$' },
        { label: '$a=\\ddot{x}$', value: '$' + a_val.toFixed(3) + '\\,\\mathrm{m/s}^2$' }
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
      'Two equal masses with wall springs $k$ and coupling $k_c$ look messy in $x_1,x_2$, but they are two independent oscillators in the normal coordinates $Q_1=(x_1+x_2)/\\sqrt{2}$ (in-phase, $\\omega_1=\\sqrt{k/m}$) and $Q_2=(x_1-x_2)/\\sqrt{2}$ (anti-phase, $\\omega_2=\\sqrt{(k+2k_c)/m}$). Motion in the $(Q_1,Q_2)$ plane is a Lissajous figure: a pure mode is a line along one axis; a beat (both modes) fills a rectangle at incommensurate frequencies. At $k_c=0$ the frequencies coincide and energy does not transfer.',
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
        text: 'In Mode 1 (In-Phase), the coupling spring is unstretched. In Mode 2 (Anti-Phase), the coupling spring experiences double deformation. The normal coordinates $Q_1=(x_1+x_2)/\\sqrt{2}$, $Q_2=(x_1-x_2)/\\sqrt{2}$ each execute independent SHM.'
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
        explanation: 'The coupling spring exerts zero force at all times; no beating occurs and frequency is independent of kc. The $(Q_1,Q_2)$ trajectory is a line on the $Q_1$ axis.'
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
        maxHistoryLen: 280,
        lastMode: state.mode,
        Q10: 0,
        Q20: 0,
        Qd10: 0,
        Qd20: 0
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
            state.sim.v2 = 0;
            if (e.cancelable) e.preventDefault();
          } else if (b2 && Math.hypot(pos.x - b2.x, pos.y - b2.y) < b2.size * 1.1) {
            state.sim.draggedMass = 2;
            state.sim.v1 = 0;
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
              state.sim.v2 = 0;
            } else if (state.sim.draggedMass === 2) {
              state.sim.x2 = Math.max(-1.8, Math.min(1.8, (pos.x - state.sim.eq2X) / scale));
              state.sim.v1 = 0;
              state.sim.v2 = 0;
            }
            state.sim.t = 0;
            captureCoupledICs(state.sim);
            state.sim.history = [];
            if (redraw) redraw();
            if (e.cancelable) e.preventDefault();
          }
        };

        var onUp = function () {
          if (state.sim.draggedMass) {
            state.sim.v1 = 0;
            state.sim.v2 = 0;
            state.sim.t = 0;
            captureCoupledICs(state.sim);
          }
          state.sim.draggedMass = null;
        };

        return { onDown: onDown, onMove: onMove, onUp: onUp };
      });
    },

    draw(ctx, width, height, state, dt) {
      if (!state.sim) this.init(null, state);
      var sim = state.sim;
      width = width || 640;
      height = height || 420;

      var m = Math.max(0.1, finiteNum(state.m, 1.0));
      var k = Math.max(0.1, finiteNum(state.k_wall, 8.0));
      var kc = Math.max(0.0, finiteNum(state.k_couple, 6.0));
      var damping = Math.max(0.0, finiteNum(state.damping, 0.0));
      var mode = state.mode || 'beat';

      if (sim.lastMode !== mode && !sim.draggedMass) {
        applyCoupledICs(sim, mode);
      }
      sim.lastMode = mode;

      var omega1 = Math.sqrt(k / m);
      var omega2 = Math.sqrt((k + 2 * kc) / m);
      var gamma = damping * 2 * omega1;

      if (sim.Q10 === undefined) captureCoupledICs(sim);

      if (!sim.draggedMass) {
        sim.t += scaledDt(dt, state);
        var e1 = shoEvolve(sim.Q10, sim.Qd10, omega1, gamma, sim.t);
        var e2 = shoEvolve(sim.Q20, sim.Qd20, omega2, gamma, sim.t);
        var Q1 = e1.x;
        var Q2 = e2.x;
        var Qd1 = e1.v;
        var Qd2 = e2.v;
        sim.x1 = (Q1 + Q2) / Math.SQRT2;
        sim.x2 = (Q1 - Q2) / Math.SQRT2;
        sim.v1 = (Qd1 + Qd2) / Math.SQRT2;
        sim.v2 = (Qd1 - Qd2) / Math.SQRT2;
      }

      var Q1now = (sim.x1 + sim.x2) / Math.SQRT2;
      var Q2now = (sim.x1 - sim.x2) / Math.SQRT2;
      var Qd1now = (sim.v1 + sim.v2) / Math.SQRT2;
      var Qd2now = (sim.v1 - sim.v2) / Math.SQRT2;

      sim.history.push({ Q1: Q1now, Q2: Q2now });
      if (sim.history.length > sim.maxHistoryLen) sim.history.shift();

      var EQ1 = 0.5 * m * Qd1now * Qd1now + 0.5 * k * Q1now * Q1now;
      var EQ2 = 0.5 * m * Qd2now * Qd2now + 0.5 * (k + 2 * kc) * Q2now * Q2now;
      var A1 = Math.sqrt((2 * Math.max(0, EQ1)) / k);
      var A2 = Math.sqrt((2 * Math.max(0, EQ2)) / Math.max(k + 2 * kc, 1e-9));

      stageFill(ctx, width, height);

      var pad = 16;
      var topH = Math.round(Math.max(150, height * 0.40));
      var wallLeftX = pad;
      var wallW = 14;
      var wallRightX = width - pad - wallW;
      var floorY = topH - 40;
      var centerY = floorY - 22;
      var blockSize = Math.max(32, Math.min(42, 28 + m * 5));
      var inner = wallRightX - (wallLeftX + wallW);
      var eq1X = wallLeftX + wallW + inner * 0.32;
      var eq2X = wallLeftX + wallW + inner * 0.68;
      var gap = eq2X - eq1X;
      var scale = Math.max(24, Math.min(inner * 0.14, (gap - blockSize - 18) / 3.6));

      sim.eq1X = eq1X;
      sim.eq2X = eq2X;
      sim.scale = scale;

      var m1X = eq1X + sim.x1 * scale;
      var m2X = eq2X + sim.x2 * scale;
      sim.b1Pos = { x: m1X, y: centerY, size: blockSize };
      sim.b2Pos = { x: m2X, y: centerY, size: blockSize };

      drawWall(ctx, wallLeftX, centerY - 50, wallW, floorY - (centerY - 50) + 4, 'left');
      drawWall(ctx, wallRightX, centerY - 50, wallW, floorY - (centerY - 50) + 4, 'right');
      hatchFloor(ctx, wallLeftX + wallW, wallRightX, floorY);

      ctx.save();
      ctx.strokeStyle = theme().inkFade(0.2);
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(eq1X, pad + 18);
      ctx.lineTo(eq1X, floorY + 6);
      ctx.moveTo(eq2X, pad + 18);
      ctx.lineTo(eq2X, floorY + 6);
      ctx.stroke();
      ctx.restore();

      drawSpring(ctx, wallLeftX + wallW, centerY, m1X - blockSize / 2, centerY, 10, 8, CORAL);
      drawSpring(ctx, m1X + blockSize / 2, centerY, m2X - blockSize / 2, centerY, 12, 8, kc < 1e-9 ? theme().inkFade(0.22) : TEAL);
      drawSpring(ctx, m2X + blockSize / 2, centerY, wallRightX, centerY, 10, 8, CORAL);

      drawMass(ctx, m1X, centerY, blockSize, 'm1', CORAL, sim.draggedMass === 1);
      drawMass(ctx, m2X, centerY, blockSize, 'm2', GOLD, sim.draggedMass === 2);

      var v1c = capLen(sim.v1 * 18, 0, 36);
      var v2c = capLen(sim.v2 * 18, 0, 36);
      if (v1c.ok) arrow(ctx, m1X, centerY - blockSize / 2 - 12, m1X + v1c.dx, centerY - blockSize / 2 - 12, EMERALD, '');
      if (v2c.ok) arrow(ctx, m2X, centerY - blockSize / 2 - 12, m2X + v2c.dx, centerY - blockSize / 2 - 12, EMERALD, '');

      inkLabel(ctx, 'k', (wallLeftX + wallW + m1X - blockSize / 2) / 2, pad + 10, { color: CORAL, font: fontSans(11), pad: true });
      inkLabel(ctx, kc < 1e-9 ? 'kc = 0' : 'kc', (m1X + m2X) / 2, pad + 10, { color: TEAL, font: fontSans(11), pad: true });
      inkLabel(ctx, 'k', (m2X + blockSize / 2 + wallRightX) / 2, pad + 10, { color: CORAL, font: fontSans(11), pad: true });
      inkLabel(
        ctx,
        sim.draggedMass ? ('dragging m' + sim.draggedMass) : 'drag m1 or m2',
        width / 2,
        floorY + 18,
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

      var qSide = Math.min(width - 72, height - topH - 36);
      var qX = (width - qSide) / 2;
      var qY = topH + 22;
      inkLabel(ctx, 'normal coordinates (Q1, Q2)', width / 2, topH + 10, { color: MUTED, font: fontSans(11) });

      var qCx = qX + qSide / 2;
      var qCy = qY + qSide / 2;
      var qMax = 1.8;
      var hi;
      for (hi = 0; hi < sim.history.length; hi++) {
        qMax = Math.max(qMax, Math.abs(sim.history[hi].Q1) * 1.15, Math.abs(sim.history[hi].Q2) * 1.15);
      }
      qMax = Math.max(qMax, A1 * 1.2, A2 * 1.2, 1.2);
      var qS = (qSide * 0.42) / qMax;

      ctx.save();
      ctx.beginPath();
      ctx.rect(qX, qY, qSide, qSide);
      ctx.clip();

      ctx.strokeStyle = theme().inkFade(0.26);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(qX + 10, qCy);
      ctx.lineTo(qX + qSide - 10, qCy);
      ctx.moveTo(qCx, qY + 10);
      ctx.lineTo(qCx, qY + qSide - 10);
      ctx.stroke();

      if (A1 > 0.04 || A2 > 0.04) {
        var rw = Math.max(3, A1 * qS);
        var rh = Math.max(3, A2 * qS);
        ctx.strokeStyle = theme().inkFade(0.16);
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(qCx - rw, qCy - rh, rw * 2, rh * 2);
        ctx.setLineDash([]);
      }

      if (sim.history.length > 1) {
        ctx.lineWidth = 1.8;
        ctx.lineJoin = 'round';
        for (hi = 1; hi < sim.history.length; hi++) {
          var a = sim.history[hi - 1];
          var b = sim.history[hi];
          var alpha = (hi / sim.history.length) * 0.9;
          ctx.strokeStyle = 'rgba(204, 120, 92, ' + alpha + ')';
          ctx.beginPath();
          ctx.moveTo(qCx + a.Q1 * qS, qCy - a.Q2 * qS);
          ctx.lineTo(qCx + b.Q1 * qS, qCy - b.Q2 * qS);
          ctx.stroke();
        }
      }

      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(qCx + Q1now * qS, qCy - Q2now * qS, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      inkLabel(ctx, 'Q1', qX + qSide - 14, qCy + 12, { color: MUTED, font: fontSans(11), align: 'right', pad: true });
      inkLabel(ctx, 'Q2', qCx + 12, qY + 14, { color: MUTED, font: fontSans(11), align: 'left', pad: true });

      legend('Normal modes', [
        { label: '$\\omega_1=\\sqrt{k/m}$ (in-phase)', value: '$' + omega1.toFixed(2) + '\\,\\mathrm{rad/s}$' },
        { label: '$Q_1=(x_1+x_2)/\\sqrt{2}$', value: '$' + Q1now.toFixed(2) + '\\,\\mathrm{m}$' },
        { label: '$\\omega_2=\\sqrt{(k+2k_c)/m}$ (anti-phase)', value: '$' + omega2.toFixed(2) + '\\,\\mathrm{rad/s}$' },
        { label: '$Q_2=(x_1-x_2)/\\sqrt{2}$', value: '$' + Q2now.toFixed(2) + '\\,\\mathrm{m}$' },
        { label: '$\\omega_{\\mathrm{beat}}=|\\omega_2-\\omega_1|$', value: '$' + Math.abs(omega2 - omega1).toFixed(2) + '\\,\\mathrm{rad/s}$' },
        { label: 'Mode', value: kc < 1e-9 ? 'uncoupled ($k_c=0$)' : '$\\text{' + mode + '}$' }
      ]);
      legend('Mode energy', [
        { label: '$E_{Q_1}=\\tfrac12 m\\dot Q_1^2+\\tfrac12 k Q_1^2$', value: '$' + EQ1.toFixed(2) + '\\,\\mathrm{J}$' },
        { label: '$E_{Q_2}=\\tfrac12 m\\dot Q_2^2+\\tfrac12(k+2k_c)Q_2^2$', value: '$' + EQ2.toFixed(2) + '\\,\\mathrm{J}$' }
      ]);
    }
  };

  PGRE.visualizers['cpgf-1.45'] = {
    id: 'cpgf-1.45',
    topic: 'cm',
    title: 'Amplitude Resonance of a Driven Damped Oscillator: $\\omega_R = \\sqrt{\\omega_0^2 - 2\\beta^2}$',
    formulaLatex: '$$\\omega_R = \\sqrt{\\omega_0^2 - 2\\beta^2}$$',
    physicalStory:
      'A driven damped oscillator reaches steady state $x=A(\\omega)\\cos(\\omega t-\\varphi)$ whose amplitude peaks at $\\omega_R=\\sqrt{\\omega_0^2-2\\beta^2}$, not at $\\omega_0$ and not at $\\omega_d=\\sqrt{\\omega_0^2-\\beta^2}$. The peak exists only for $\\beta<\\omega_0/\\sqrt{2}$; heavier damping makes $A(\\omega)$ fall monotonically from $\\omega=0$. Velocity resonance stays exactly at $\\omega_0$. Drag the operating-point marker along the curve.',
    derivationSteps: [
      {
        step: 1,
        title: 'Steady-state amplitude',
        formula: 'm\\ddot{x}+b\\dot{x}+kx=F_0\\cos\\omega t,\\quad \\beta=b/(2m),\\quad A(\\omega)=\\frac{F_0/m}{\\sqrt{(\\omega_0^2-\\omega^2)^2+4\\beta^2\\omega^2}}',
        text: 'After transients die, the particular solution is $x=A(\\omega)\\cos(\\omega t-\\varphi)$. The amplitude is set by the modulus of the complex denominator $(\\omega_0^2-\\omega^2)+2i\\beta\\omega$.'
      },
      {
        step: 2,
        title: 'Minimize the denominator',
        formula: 'D(\\omega)=(\\omega_0^2-\\omega^2)^2+4\\beta^2\\omega^2,\\quad \\frac{dD}{d\\omega}=-4\\omega(\\omega_0^2-\\omega^2)+8\\beta^2\\omega',
        text: 'Maximizing $A$ is equivalent to minimizing $D(\\omega)$. The factor of $F_0/m$ does not shift the peak.'
      },
      {
        step: 3,
        title: 'Amplitude-resonance root',
        formula: '\\frac{dD}{d\\omega}=0 \\implies -(\\omega_0^2-\\omega^2)+2\\beta^2=0 \\implies \\omega_R^2=\\omega_0^2-2\\beta^2',
        text: 'Discard the root $\\omega=0$. The remaining stationary point is the GRE card: $\\omega_R=\\sqrt{\\omega_0^2-2\\beta^2}$.'
      },
      {
        step: 4,
        title: 'Existence, $\\omega_d$, and velocity resonance',
        formula: '\\omega_R\\ \\text{real iff }\\ \\beta<\\omega_0/\\sqrt{2};\\quad \\omega_d=\\sqrt{\\omega_0^2-\\beta^2};\\quad \\omega_{\\mathrm{vel}}=\\omega_0',
        text: 'If $\\beta\\ge\\omega_0/\\sqrt{2}$ then $D(\\omega)$ has no interior minimum and $A(\\omega)$ decreases from $\\omega=0$. The free-oscillation frequency is $\\omega_d$, distinct from $\\omega_R$. Power/velocity resonance sits exactly at $\\omega_0$. Peak height is $A_{\\max}=(F_0/m)/(2\\beta\\omega_d)$ when the peak exists.'
      }
    ],
    limitingCases: [
      {
        name: 'Undamped limit',
        condition: '\\beta \\to 0',
        result: '\\omega_R \\to \\omega_0,\\quad A_{\\max} \\to \\infty',
        explanation: 'The resonance peak collapses onto $\\omega_0$ and becomes an infinitely sharp peak of unbounded height. Any $\\beta>0$ both lowers and left-shifts the peak.'
      },
      {
        name: 'Peak about to vanish',
        condition: '\\beta = \\omega_0/\\sqrt{2}',
        result: '\\omega_R = 0,\\quad A_{\\max} = A(0) = (F_0/m)/\\omega_0^2',
        explanation: 'The stationary point has reached $\\omega=0$. There is no peak at $\\omega>0$: $A(\\omega)$ is already monotonically decreasing from the static value, matching the banner. $A_{\\max}$ coincides with $A(0)$.'
      },
      {
        name: 'No amplitude resonance',
        condition: '\\beta \\ge \\omega_0/\\sqrt{2}',
        result: 'A(\\omega)\\ \\text{decreases monotonically from }\\ \\omega=0',
        explanation: 'Heavier damping $\\beta\\ge\\omega_0/\\sqrt{2}$ — including still-underdamped free motion ($\\omega_0/\\sqrt{2}\\le\\beta<\\omega_0$, where $\\omega_d$ is still real) — makes $A(\\omega)$ fall monotonically from the static value $A(0)=F_0/k$. The $\\omega_R$ marker disappears (the GRE trap). Free overdamping is the stricter line $\\beta>\\omega_0$.'
      },
      {
        name: 'High-frequency drive',
        condition: '\\omega \\gg \\omega_0',
        result: 'A(\\omega) \\sim (F_0/m)/\\omega^2 \\to 0',
        explanation: 'Inertia dominates. Phase lag $\\varphi\\to\\pi$: the mass sits opposite the drive.'
      }
    ],
    greTraps: [
      {
        trap: 'Amplitude peak is not at $\\omega_0$',
        warning: 'Writing $\\omega_R=\\omega_0$ for a damped driven oscillator.',
        strategy: 'Minimize $D(\\omega)=(\\omega_0^2-\\omega^2)^2+4\\beta^2\\omega^2$. The peak sits at $\\omega_R=\\sqrt{\\omega_0^2-2\\beta^2}<\\omega_0$ whenever it exists.'
      },
      {
        trap: 'Confusing $\\omega_R$ with $\\omega_d$',
        warning: 'Using the damped natural frequency $\\omega_d=\\sqrt{\\omega_0^2-\\beta^2}$ as the driven amplitude peak.',
        strategy: '$\\omega_d$ is the free-decay oscillation frequency (transient). Amplitude resonance has a $2\\beta^2$ shift, not $\\beta^2$. Always $\\omega_R<\\omega_d<\\omega_0$ when all three are real.'
      },
      {
        trap: 'Assuming a peak always exists',
        warning: 'Plugging $\\beta>\\omega_0/\\sqrt{2}$ into $\\sqrt{\\omega_0^2-2\\beta^2}$ and taking a real frequency.',
        strategy: 'The card is conditional. If $2\\beta^2\\ge\\omega_0^2$ there is no peak at $\\omega>0$ (equality puts the stationary point at $\\omega=0$). That is a GRE favorite.'
      },
      {
        trap: 'Velocity resonance vs amplitude resonance',
        warning: 'Thinking power, current, or velocity also peak at $\\omega_R$.',
        strategy: 'Velocity amplitude $\\omega A(\\omega)$ (and time-averaged power) peak exactly at $\\omega_0$, independent of $\\beta$. Only displacement amplitude is pulled below $\\omega_0$.'
      }
    ],
    parameters: [
      { id: 'omega0', label: 'Natural Frequency ($\\omega_0$)', min: 1.5, max: 8.0, step: 0.1, default: 4.0, unit: 'rad/s' },
      { id: 'beta', label: 'Damping ($\\beta=b/2m$)', min: 0.05, max: 6.0, step: 0.05, default: 0.80, unit: 'rad/s' },
      { id: 'omega', label: 'Drive Frequency ($\\omega$)', min: 0.05, max: 16.0, step: 0.05, default: 3.80, unit: 'rad/s' },
      { id: 'f0m', label: 'Drive Strength ($F_0/m$)', min: 1.0, max: 20.0, step: 0.5, default: 8.0, unit: 'm/s²' },
      SPEED_PARAM
    ],
    challenge: {
      question:
        'A driven damped harmonic oscillator has natural frequency $\\omega_0$ and damping $\\beta=b/(2m)$. For which values of $\\beta$ does the amplitude $A(\\omega)$ have no peak at finite $\\omega>0$?',
      options: [
        'A) $\\beta \\ge \\omega_0$',
        'B) $\\beta \\ge \\omega_0/\\sqrt{2}$',
        'C) $\\beta \\ge \\omega_0/2$',
        'D) never (a peak always exists)',
        'E) $\\beta \\ge \\sqrt{2}\\,\\omega_0$'
      ],
      correct: 1,
      explanation:
        'Steady-state amplitude is $A(\\omega)=(F_0/m)/\\sqrt{D(\\omega)}$ with $D(\\omega)=(\\omega_0^2-\\omega^2)^2+4\\beta^2\\omega^2$. Setting $dD/d\\omega=0$ yields $\\omega_R^2=\\omega_0^2-2\\beta^2$. This is real and positive only for $\\beta<\\omega_0/\\sqrt{2}$. At and above that damping the curve decreases from $\\omega=0$ (static response $F_0/k$ is the maximum). Option A is the free critical/overdamped line $\\beta=\\omega_0$ (where $\\omega_d=0$); option C is the $Q=1$ line ($Q=\\omega_0/(2\\beta)$), a $2\\beta$-vs-$\\beta$ mix-up distractor; option E reverses the $\\sqrt{2}$. Velocity resonance remains at $\\omega_0$ for any $\\beta$.'
    },

    init(container, state, redraw) {
      state.omega0 = finiteNum(state.omega0, 4.0);
      state.beta = finiteNum(state.beta, 0.80);
      state.omega = finiteNum(state.omega, 3.80);
      state.f0m = finiteNum(state.f0m, 8.0);
      state.simSpeed = finiteNum(state.simSpeed, 1.0);

      state.sim = {
        t: 0.0,
        isDragging: false,
        plot: null,
        wMax: 10
      };

      attachDrag(container, '_cpgf145_bound', function (canvas) {
        var getPos = function (e) { return eventPos(canvas, e); };

        var omegaFromPos = function (pos) {
          var plot = state.sim.plot;
          var wMax = state.sim.wMax || 10;
          if (!plot || plot.w < 1) return state.omega;
          var w = ((pos.x - plot.x) / plot.w) * wMax;
          if (w < 0.05) w = 0.05;
          if (w > 16) w = 16;
          if (w > wMax) w = wMax;
          return w;
        };

        var onDown = function (e) {
          var pos = getPos(e);
          var plot = state.sim.plot;
          if (plot && pos.x >= plot.x - 8 && pos.x <= plot.x + plot.w + 8 &&
              pos.y >= plot.y - 8 && pos.y <= plot.y + plot.h + 12) {
            state.sim.isDragging = true;
            state.omega = omegaFromPos(pos);
            if (e.cancelable) e.preventDefault();
          }
        };

        var onMove = function (e) {
          if (state.sim.isDragging) {
            state.omega = omegaFromPos(getPos(e));
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
      var sim = state.sim;
      width = width || 640;
      height = height || 420;

      var w0 = Math.max(0.2, finiteNum(state.omega0, 4.0));
      var beta = Math.max(0.001, finiteNum(state.beta, 0.80));
      var omega = Math.max(0.0, finiteNum(state.omega, 3.80));
      var f0m = Math.max(0.1, finiteNum(state.f0m, 8.0));

      function Aof(w) {
        var det = w0 * w0 - w * w;
        var den = Math.sqrt(det * det + 4 * beta * beta * w * w);
        if (!(den > 1e-15)) return f0m / 1e-15;
        return f0m / den;
      }
      function phiOf(w) {
        return Math.atan2(2 * beta * w, w0 * w0 - w * w);
      }

      var wR2 = w0 * w0 - 2 * beta * beta;
      var hasRes = wR2 > 1e-10;
      var wR = hasRes ? Math.sqrt(wR2) : 0;
      var wd2 = w0 * w0 - beta * beta;
      var hasWd = wd2 > 1e-10;
      var wd = hasWd ? Math.sqrt(wd2) : 0;
      var Anow = Aof(omega);
      var phi = phiOf(omega);
      var A0 = Aof(0);
      var Amax = hasRes && hasWd ? (f0m / (2 * beta * wd)) : A0;

      sim.t += scaledDt(dt, state);
      var xNow = Anow * Math.cos(omega * sim.t - phi);

      var wMax = Math.max(2.2 * w0, 16);
      sim.wMax = wMax;

      var aScale = Math.max(Amax, Anow, A0, 1e-6) * 1.18;

      stageFill(ctx, width, height);

      var pad = 16;
      var stripH = 96;
      var plotX = 50;
      var plotY = 24;
      var plotW = width - plotX - 16;
      var plotH = height - stripH - plotY - 18;
      if (plotH < 80) plotH = 80;
      sim.plot = { x: plotX, y: plotY, w: plotW, h: plotH };

      function toX(w) { return plotX + (w / wMax) * plotW; }
      function toY(a) { return plotY + plotH - (a / aScale) * plotH; }

      ctx.save();
      ctx.beginPath();
      ctx.rect(plotX, plotY, plotW, plotH);
      ctx.clip();

      ctx.strokeStyle = theme().inkFade(0.07);
      ctx.lineWidth = 1;
      ctx.beginPath();
      var gx;
      for (gx = plotX; gx < plotX + plotW; gx += 36) {
        ctx.moveTo(gx, plotY);
        ctx.lineTo(gx, plotY + plotH);
      }
      ctx.stroke();

      function vline(w, color, dash) {
        var x = toX(w);
        if (x < plotX || x > plotX + plotW) return;
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.4;
        if (dash) ctx.setLineDash(dash);
        ctx.beginPath();
        ctx.moveTo(x, plotY);
        ctx.lineTo(x, plotY + plotH);
        ctx.stroke();
        ctx.restore();
      }
      if (hasWd) vline(wd, TEAL, [2, 4]);
      vline(w0, GOLD, [5, 4]);
      if (hasRes) vline(wR, ROSE, null);

      var N = 240;
      var i;
      var w;
      ctx.beginPath();
      for (i = 0; i <= N; i++) {
        w = (i / N) * wMax;
        if (i === 0) ctx.moveTo(toX(w), toY(Aof(w)));
        else ctx.lineTo(toX(w), toY(Aof(w)));
      }
      ctx.strokeStyle = CORAL;
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.lineTo(toX(wMax), plotY + plotH);
      ctx.lineTo(toX(0), plotY + plotH);
      ctx.closePath();
      ctx.fillStyle = 'rgba(204, 120, 92, 0.10)';
      ctx.fill();

      ctx.strokeStyle = theme().inkFade(0.18);
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(toX(omega), plotY + plotH);
      ctx.lineTo(toX(omega), toY(Anow));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = theme().inkFade(0.28);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(plotX, plotY);
      ctx.lineTo(plotX, plotY + plotH);
      ctx.lineTo(plotX + plotW, plotY + plotH);
      ctx.stroke();
      ctx.restore();

      inkLabel(ctx, 'A(w)', plotX + 6, plotY + 10, { color: CORAL, font: fontSans(11, '500'), align: 'left', pad: true });
      inkLabel(ctx, 'w', plotX + plotW - 10, plotY + plotH + 12, { color: MUTED, font: fontSans(11), align: 'right', pad: true });
      inkLabel(ctx, '0', plotX, plotY + plotH + 12, { color: MUTED, font: fontSans(10), pad: true });

      if (hasRes) {
        inkLabel(ctx, 'w_R', toX(wR), plotY + 10, { color: ROSE, font: fontSans(10, '600'), pad: true });
      } else {
        inkLabel(
          ctx,
          'no amplitude resonance  (beta >= w_0 / sqrt(2))',
          plotX + plotW - 8,
          plotY + 10,
          { color: ROSE, font: fontSans(11, '500'), align: 'right', pad: true }
        );
      }
      if (hasWd) {
        inkLabel(ctx, 'w_d', toX(wd), plotY + 22, { color: TEAL, font: fontSans(10, '500'), pad: true });
      }
      inkLabel(ctx, 'w_0', toX(w0), plotY + 34, { color: GOLD, font: fontSans(10, '500'), pad: true });

      ctx.fillStyle = GOLD;
      ctx.strokeStyle = CORAL;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(toX(omega), toY(Anow), sim.isDragging ? 7 : 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      inkLabel(
        ctx,
        sim.isDragging ? 'w (drag)' : 'w',
        toX(omega) + 10,
        toY(Anow) - 10,
        { color: GOLD, font: fontSans(10, '500'), align: 'left', pad: true }
      );

      var stripY = height - stripH;
      ctx.save();
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad, stripY);
      ctx.lineTo(width - pad, stripY);
      ctx.stroke();
      ctx.restore();

      var wallX = pad;
      var wallW = 14;
      var floorY = height - 28;
      var centerY = floorY - 22;
      var blockSize = 36;
      var eqX = pad + (width - 2 * pad) * 0.50;
      var travel = Math.min(110, (width - 2 * pad) * 0.22);
      var xPix = eqX + (aScale > 1e-9 ? (xNow / aScale) * travel : 0);
      xPix = Math.max(wallX + wallW + blockSize / 2 + 8, Math.min(width - pad - blockSize / 2, xPix));

      drawWall(ctx, wallX, centerY - 44, wallW, floorY - (centerY - 44) + 4, 'left');
      hatchFloor(ctx, wallX + wallW, width - pad, floorY);
      drawSpring(ctx, wallX + wallW, centerY, xPix - blockSize / 2, centerY, 12, 8, CORAL);
      drawMass(ctx, xPix, centerY, blockSize, 'm', CORAL, false);

      inkLabel(
        ctx,
        'steady state at drive w (drag the marker on A(w))',
        width / 2,
        stripY + 10,
        { color: MUTED, font: fontSans(10) }
      );

      legend('Resonance', [
        { label: '$\\omega_R=\\sqrt{\\omega_0^2-2\\beta^2}$', value: hasRes ? '$' + wR.toFixed(2) + '\\,\\mathrm{rad/s}$' : 'none ($\\beta\\ge\\omega_0/\\sqrt{2}$)' },
        { label: '$\\omega_d=\\sqrt{\\omega_0^2-\\beta^2}$', value: hasWd ? '$' + wd.toFixed(2) + '\\,\\mathrm{rad/s}$' : 'none' },
        { label: '$\\omega_0$', value: '$' + w0.toFixed(2) + '\\,\\mathrm{rad/s}$' },
        { label: '$\\omega$', value: '$' + omega.toFixed(2) + '\\,\\mathrm{rad/s}$' },
        { label: '$A(\\omega)$', value: '$' + Anow.toFixed(3) + '$' },
        { label: '$\\varphi=\\mathrm{atan2}(2\\beta\\omega,\\,\\omega_0^2-\\omega^2)$', value: '$' + phi.toFixed(2) + '\\,\\mathrm{rad}$' }
      ]);
      legend('Peak', [
        { label: hasRes ? '$A_{\\max}=(F_0/m)/(2\\beta\\omega_d)$' : '$A(0)=(F_0/m)/\\omega_0^2$', value: '$' + Amax.toFixed(3) + '$' },
        { label: '$\\beta/\\omega_0$', value: '$' + (beta / w0).toFixed(3) + '$' }
      ]);
    }
  };

})(typeof window !== 'undefined' ? window : globalThis);
