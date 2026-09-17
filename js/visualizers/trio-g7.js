/* Formula visualizers — G7 Hamiltonian / H=T+U / Hamilton equations */
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
  var ROSE = '#e05666';
  var CREAM = '#faf9f5';
  var LINE = '#e6dfd8';
  var FONT = '11px Inter, -apple-system, sans-serif';
  var FONT_SM = '10px Inter, -apple-system, sans-serif';

  function syncStageTheme() {
    var t = PGRE.vizStageTheme ? PGRE.vizStageTheme() : null;
    if (!t) return;
    INK = t.ink; MUTED = t.muted; CREAM = t.bg; LINE = t.line;
  }

  function creamStage(ctx, width, height) {
    syncStageTheme();
    var bg = (CV && CV.colors && CV.colors.bg) || CREAM;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.strokeStyle = (CV && CV.colors && CV.colors.grid) || PGRE.vizStageTheme().inkFade(0.06);
    ctx.lineWidth = 1;
    ctx.beginPath();
    var step = 40;
    var x, y;
    for (x = 0; x <= width; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (y = 0; y <= height; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function fmt(v, d) {
    if (typeof d !== 'number') d = 2;
    if (typeof v !== 'number' || !isFinite(v)) return '--';
    return v.toFixed(d);
  }

  function vizLegend(title, rows) {
    if (PGRE && typeof PGRE.appendVizLegend === 'function') {
      PGRE.appendVizLegend(title, rows);
    }
  }

  function finiteDt(dt) {
    if (typeof dt !== 'number' || !isFinite(dt) || dt < 0) return 0;
    return Math.min(dt, 0.04);
  }

  function simSpeedOf(state) {
    var s = Number(state && state.simSpeed);
    if (!isFinite(s)) s = 1.0;
    return Math.max(0.2, Math.min(3.0, s));
  }

  function scaledDt(dt, state) {
    return finiteDt(dt) * simSpeedOf(state);
  }

  function flagOn(v, fallback) {
    if (v === undefined || v === null) return !!fallback;
    if (v === false || v === 0 || v === 'false' || v === 'off') return false;
    return true;
  }

  function radialJacobiH(m, r, rDot, omega, kSpr) {
    return 0.5 * m * rDot * rDot + 0.5 * (kSpr - m * omega * omega) * r * r;
  }

  // Exact step of r̈ = α r. Conserves Jacobi H between wall collisions.
  function stepRadialExact(r, rDot, alpha, dt) {
    if (!(dt > 0) || !isFinite(r) || !isFinite(rDot)) return { r: r, rDot: rDot };
    if (!isFinite(alpha) || Math.abs(alpha) < 1e-14) {
      return { r: r + rDot * dt, rDot: rDot };
    }
    if (alpha < 0) {
      var W = Math.sqrt(-alpha);
      var c = Math.cos(W * dt);
      var s = Math.sin(W * dt);
      return {
        r: r * c + (rDot / W) * s,
        rDot: -r * W * s + rDot * c
      };
    }
    var Lh = Math.sqrt(alpha);
    var ch = Math.cosh(Lh * dt);
    var sh = Math.sinh(Lh * dt);
    return {
      r: r * ch + (rDot / Lh) * sh,
      rDot: r * Lh * sh + rDot * ch
    };
  }

  function mathNum(v, d) {
    return '$' + fmt(v, d) + '$';
  }

  function boxOf(x0, y0, x1, y1) {
    var w = Math.max(10, x1 - x0);
    var h = Math.max(10, y1 - y0);
    return { x0: x0, y0: y0, x1: x0 + w, y1: y0 + h, w: w, h: h };
  }

  function mapper(box, xLo, xHi, yLo, yHi) {
    var dx = (xHi - xLo) || 1;
    var dy = (yHi - yLo) || 1;
    return {
      x: function (xv) { return box.x0 + (xv - xLo) / dx * box.w; },
      y: function (yv) { return box.y1 - (yv - yLo) / dy * box.h; }
    };
  }

  function clipBox(ctx, box) {
    ctx.beginPath();
    ctx.rect(box.x0, box.y0, box.w, box.h);
    ctx.clip();
  }

  function fillPanel(ctx, box) {
    ctx.save();
    var t = PGRE.vizStageTheme ? PGRE.vizStageTheme() : null;
    ctx.fillStyle = t ? t.chipFade(0.38) : 'rgba(245, 240, 232, 0.38)';
    ctx.fillRect(box.x0, box.y0, box.w, box.h);
    ctx.restore();
  }

  function frameBox(ctx, box) {
    ctx.save();
    ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.12);
    ctx.lineWidth = 1;
    ctx.strokeRect(box.x0 + 0.5, box.y0 + 0.5, box.w - 1, box.h - 1);
    ctx.restore();
  }

  function creamText(ctx, text, x, y, canvasW, canvasH, opts) {
    opts = opts || {};
    if (!text) return { x: x, y: y, w: 0, h: 0 };
    ctx.save();
    ctx.font = opts.font || FONT_SM;
    var align = opts.align || 'left';
    var baseline = opts.baseline || 'middle';
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    var tw = ctx.measureText(text).width;
    var th = 12;
    var ax = x;
    if (align === 'center') ax = x - tw / 2;
    else if (align === 'right') ax = x - tw;
    var ay = y;
    if (baseline === 'middle') ay = y - th / 2;
    else if (baseline === 'bottom') ay = y - th;
    if (ax < 4) ax = 4;
    if (ax + tw > canvasW - 4) ax = Math.max(4, canvasW - 4 - tw);
    if (ay < 2) ay = 2;
    if (ay + th > canvasH - 2) ay = Math.max(2, canvasH - 2 - th);
    ctx.fillStyle = PGRE.vizStageTheme().chipFade(0.92);
    ctx.fillRect(ax - 3, ay - 1, tw + 6, th + 2);
    var dx = ax;
    if (align === 'center') dx = ax + tw / 2;
    else if (align === 'right') dx = ax + tw;
    var dy = ay;
    if (baseline === 'middle') dy = ay + th / 2;
    else if (baseline === 'bottom') dy = ay + th;
    ctx.fillStyle = opts.color || INK;
    ctx.fillText(text, dx, dy);
    ctx.restore();
    return { x: ax, y: ay, w: tw + 6, h: th + 2 };
  }

  function drawPlotAxes(ctx, box, originX, originY, xLabel, yLabel, canvasW, canvasH) {
    ctx.save();
    clipBox(ctx, box);
    ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.32);
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    if (originY >= box.y0 && originY <= box.y1) {
      ctx.beginPath();
      ctx.moveTo(box.x0 + 6, originY);
      ctx.lineTo(box.x1 - 6, originY);
      ctx.stroke();
    }
    if (originX >= box.x0 && originX <= box.x1) {
      ctx.beginPath();
      ctx.moveTo(originX, box.y1 - 6);
      ctx.lineTo(originX, box.y0 + 6);
      ctx.stroke();
    }
    ctx.restore();

    var xLabY = originY - 3;
    if (!(xLabY > box.y0 + 10 && xLabY < box.y1 - 2)) xLabY = box.y1 - 4;
    creamText(ctx, xLabel, box.x1 - 6, xLabY, canvasW, canvasH, {
      align: 'right', baseline: 'bottom', color: MUTED, font: FONT_SM
    });

    var yLabX = originX + 7;
    if (!(yLabX > box.x0 + 4 && yLabX < box.x1 - 14)) yLabX = box.x0 + 6;
    creamText(ctx, yLabel, yLabX, box.y0 + 7, canvasW, canvasH, {
      align: 'left', baseline: 'top', color: MUTED, font: FONT_SM
    });
  }

  function disk(ctx, x, y, r, color) {
    if (!isFinite(x) || !isFinite(y) || !isFinite(r)) return;
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PGRE.vizStageTheme().chipFade(0.95);
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
  }

  function inBox(box, x, y, pad) {
    pad = pad || 0;
    return x >= box.x0 + pad && x <= box.x1 - pad && y >= box.y0 + pad && y <= box.y1 - pad;
  }

  function niceRange(vals, padFrac) {
    var lo = Infinity;
    var hi = -Infinity;
    var i, v;
    for (i = 0; i < vals.length; i++) {
      v = vals[i];
      if (typeof v === 'number' && isFinite(v)) {
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    }
    if (!isFinite(lo) || !isFinite(hi)) {
      lo = -1;
      hi = 1;
    }
    if (lo === hi) {
      lo -= 1;
      hi += 1;
    }
    var pad = (hi - lo) * (padFrac == null ? 0.14 : padFrac);
    return { lo: lo - pad, hi: hi + pad };
  }

  function arrow(ctx, x1, y1, x2, y2, color, lw) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    var len = Math.hypot(dx, dy);
    if (len < 4) return;
    var ang = Math.atan2(dy, dx);
    var ah = Math.min(8, len * 0.34);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lw || 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
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
    var i;
    for (i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function shoelace(pts) {
    var a = 0;
    var n = pts.length;
    var i, j;
    for (i = 0; i < n; i++) {
      j = (i + 1) % n;
      a += pts[i].q * pts[j].p - pts[j].q * pts[i].p;
    }
    return 0.5 * a;
  }

  function hamV(system, q) {
    if (system === 'sho') return q * q;
    if (system === 'pendulum') return 3.0 * (1 - Math.cos(q));
    return 1.5 * Math.pow(q * q - 1.0, 2);
  }

  function hamForce(system, q) {
    if (system === 'sho') return -2.0 * q;
    if (system === 'pendulum') return -3.0 * Math.sin(q);
    return -6.0 * q * (q * q - 1.0);
  }

  function hamH(system, q, p) {
    return 0.5 * p * p + hamV(system, q);
  }

  function hamSepE(system) {
    if (system === 'sho') return 1.6;
    if (system === 'pendulum') return 6.0;
    return 1.5;
  }

  function placeOnOrbit(system, frac) {
    if (!isFinite(frac)) frac = 0.45;
    frac = Math.max(0.12, Math.min(1.85, frac));
    var Href = hamSepE(system);
    var energy = frac * Href;
    var p = Math.sqrt(Math.max(0, 2 * energy));
    if (system === 'doublewell') return { q: 1.0, p: p };
    return { q: 0, p: p };
  }

  function stepLeapfrog(pt, h, system) {
    var dp = hamForce(system, pt.q);
    var pMid = pt.p + 0.5 * h * dp;
    pt.q += h * pMid;
    dp = hamForce(system, pt.q);
    pt.p = pMid + 0.5 * h * dp;
    if (system === 'pendulum') {
      while (pt.q > Math.PI) pt.q -= 2 * Math.PI;
      while (pt.q < -Math.PI) pt.q += 2 * Math.PI;
    }
  }

  function seedLiouvilleRing(state) {
    var n = 16;
    var i, th;
    var dq = 0.20;
    var dp = 0.20;
    state.particles = [];
    for (i = 0; i < n; i++) {
      th = (i / n) * Math.PI * 2;
      state.particles.push({
        q: state.q + dq * Math.cos(th),
        p: state.p + dp * Math.sin(th)
      });
    }
    state._swarmSystem = state.system;
    state._swarmArea0 = Math.abs(shoelace(state.particles));
  }

  function contourBranches(system, energy, qLo, qHi, n) {
    var branches = [];
    var upper = [];
    var lower = [];
    var i, q, V, arg, p;
    var flush = function () {
      if (upper.length > 1) branches.push(upper);
      if (lower.length > 1) branches.push(lower);
      upper = [];
      lower = [];
    };
    for (i = 0; i <= n; i++) {
      q = qLo + (qHi - qLo) * (i / n);
      V = hamV(system, q);
      arg = 2 * (energy - V);
      if (arg >= -1e-6) {
        p = Math.sqrt(Math.max(0, arg));
        upper.push({ q: q, p: p });
        lower.push({ q: q, p: -p });
      } else {
        flush();
      }
    }
    flush();
    return branches;
  }


  PGRE.visualizers['cpgf-1.31'] = {
    id: 'cpgf-1.31',
    topic: 'cm',
    title: 'Hamiltonian & The Legendre Transform: $H(q, p, t) = \\sum_i p_i \\dot{q}_i - L$',
    formulaLatex: 'H(q, p, t) = \\sum_i p_i \\dot{q}_i - L(q, \\dot{q}, t)',
    physicalStory: `
The Legendre transform is a geometric duality: it trades the slope of $L(\\dot{q})$ for a new coordinate $p$. At a chosen velocity the tangent to $L$ has slope $p = \\partial L/\\partial\\dot{q}$ and equation $y = p\\,\\xi - H$. That tangent is parallel to the ray $y = p\\,\\xi$ through the origin; the constant vertical gap between those two lines is $H$ itself.

At the contact point the same gap plus $L$ reconstructs the Young identity $L + H = p\\dot{q}$. The dual function $H(p)$ is whatever intercept makes this true after inverting $p(\\dot{q})$. No $\\dot{q}$ may remain in $H$.
    `.trim(),
    derivationSteps: [
      "1. Total differential of $L(q, \\dot{q}, t)$: $dL = \\sum_i \\frac{\\partial L}{\\partial q_i} dq_i + \\sum_i \\frac{\\partial L}{\\partial \\dot{q}_i} d\\dot{q}_i + \\frac{\\partial L}{\\partial t} dt$.",
      "2. Substitute canonical momentum $p_i = \\frac{\\partial L}{\\partial \\dot{q}_i}$: $dL = \\sum_i \\dot{p}_i dq_i + \\sum_i p_i d\\dot{q}_i + \\frac{\\partial L}{\\partial t} dt$.",
      "3. Use the product rule differential $d(p_i \\dot{q}_i) = p_i d\\dot{q}_i + \\dot{q}_i dp_i \\implies p_i d\\dot{q}_i = d(p_i \\dot{q}_i) - \\dot{q}_i dp_i$.",
      "4. Rearrange terms: $d\\left( \\sum_i p_i \\dot{q}_i - L \\right) = \\sum_i \\dot{q}_i dp_i - \\sum_i \\dot{p}_i dq_i - \\frac{\\partial L}{\\partial t} dt$.",
      "5. Define the Hamiltonian: $H(q, p, t) \\equiv \\sum_i p_i \\dot{q}_i - L(q, \\dot{q}, t)$.",
      "6. Comparing with $dH = \\sum_i \\frac{\\partial H}{\\partial p_i} dp_i + \\sum_i \\frac{\\partial H}{\\partial q_i} dq_i + \\frac{\\partial H}{\\partial t} dt$ directly establishes Hamilton's equations."
    ],
    limitingCases: [
      { condition: 'Standard Classical ($T = \\frac{1}{2}m\\dot{q}^2$)', result: '$p = m\\dot{q} \\implies H = \\frac{p^2}{2m} + U$', description: 'Direct quadratic inversion yields standard kinetic plus potential energy.' },
      { condition: 'Relativistic Particle', result: '$L = -mc^2\\sqrt{1 - v^2/c^2} \\implies H = \\sqrt{p^2c^2 + m^2c^4}$', description: 'Legendre transform of square-root Lagrangian produces the relativistic dispersion relation.' },
      { condition: 'Quartic Kinetic Term ($L = \\frac{1}{4}\\alpha\\dot{q}^4$)', result: '$p = \\alpha\\dot{q}^3 \\implies H = \\frac{3}{4}\\alpha^{-1/3}p^{4/3}$', description: 'Dual exponent scaling via conjugate Young-Fenchel exponents ($1/4 + 3/4 = 1$).' }
    ],
    greTraps: [
      { trap: 'Failure to Invert Velocities', warning: 'A Hamiltonian expression MUST NOT contain any velocity $\\dot{q}$ terms! You must invert $p = \\partial L/\\partial \\dot{q}$ to express $\\dot{q} = \\dot{q}(p)$ and substitute throughout.' },
      { trap: 'Sign of Tangent Intercept', warning: 'The tangent line to $L(\\dot{q})$ at $\\dot{q}$ has equation $y = p \\xi - H(p)$. The y-intercept is $-H$, NOT $+H$.' }
    ],
    parameters: [
      { id: 'qdot', label: 'Velocity $\\dot{q}$', type: 'range', min: -3, max: 3, step: 0.1, value: 1.5, default: 1.5, format: v => v.toFixed(1), hint: 'Independent velocity where the tangent to $L(\\dot{q})$ is taken. Canonical momentum is that slope, $p = \\partial L/\\partial\\dot{q}$.' },
      { id: 'model', label: 'Kinetic model', type: 'select', value: 'classical', default: 'classical', hint: 'Pick the kinetic term. Classical inverts as $p = m\\dot{q}$; relativistic $H = \\sqrt{p^2 c^2 + m^2 c^4}$; quartic scales as $H \\propto p^{4/3}$.', options: [
        { value: 'classical', label: 'Classical $L = \\frac{1}{2}m\\dot{q}^2$' },
        { value: 'relativistic', label: 'Relativistic $L = -mc^2\\sqrt{1-\\dot{q}^2/c^2}$' },
        { value: 'quartic', label: 'Nonlinear $L = \\frac{1}{4}\\alpha\\dot{q}^4$' }
      ]},
      { id: 'roll', label: 'Roll the tangent', type: 'toggle', value: true, default: true, hint: 'Sweeps $\\dot{q}$ so the tangent rolls on $L$ and the intercept $-H$ traces the dual. Turn off to freeze one contact.' },
      { id: 'simSpeed', label: 'Simulation Speed', min: 0.2, max: 3.0, step: 0.2, value: 1.0, default: 1.0, unit: 'x' }
    ],
    init(container, state, redraw) {
      state.qdot = (typeof state.qdot === 'number' && isFinite(state.qdot)) ? state.qdot : 1.5;
      if (state.model !== 'classical' && state.model !== 'relativistic' && state.model !== 'quartic') {
        state.model = 'classical';
      }
      state.roll = flagOn(state.roll, true);
      state.simSpeed = simSpeedOf(state);
      if (typeof state._phase !== 'number' || !isFinite(state._phase)) {
        state._phase = Math.asin(Math.max(-1, Math.min(1, state.qdot / 2.6)));
      }
    },
    onParamChange: function (id, val, state) {
      if (!state) return;
      if (id === 'qdot' && !flagOn(state.roll, true)) {
        var amp = 2.6;
        state._phase = Math.asin(Math.max(-1, Math.min(1, val / amp)));
      }
      if (id === 'model') state._ghosts = [];
    },
    draw(ctx, width, height, state, dt) {
      creamStage(ctx, width, height);
      state = state || {};
      dt = scaledDt(dt, state);

      var model = state.model;
      if (model !== 'classical' && model !== 'relativistic' && model !== 'quartic') model = 'classical';
      var rolling = flagOn(state.roll, true);

      var m = 1.0;
      var c = 3.5;
      var vmaxRel = 0.92 * c;
      var amp = model === 'relativistic' ? vmaxRel : 2.6;

      if (rolling) {
        if (typeof state._phase !== 'number' || !isFinite(state._phase)) state._phase = 0.6;
        state._phase += dt * 0.70;
        state.qdot = amp * Math.sin(state._phase);
      }

      var curV = (typeof state.qdot === 'number' && isFinite(state.qdot)) ? state.qdot : 1.5;
      if (model === 'relativistic') {
        if (Math.abs(curV) > vmaxRel) curV = (curV < 0 ? -1 : 1) * vmaxRel;
      } else {
        curV = Math.max(-3, Math.min(3, curV));
      }
      state.qdot = curV;

      var getL = function (v) {
        if (model === 'classical') return 0.5 * m * v * v;
        if (model === 'relativistic') {
          var beta2 = (v * v) / (c * c);
          if (!(beta2 < 1)) return NaN;
          return -m * c * c * Math.sqrt(Math.max(0, 1 - beta2));
        }
        return 0.25 * m * Math.pow(v, 4);
      };

      var getP = function (v) {
        if (model === 'classical') return m * v;
        if (model === 'relativistic') {
          var sR = Math.sqrt(Math.max(1e-12, 1 - (v * v) / (c * c)));
          return (m * v) / sR;
        }
        return m * Math.pow(v, 3);
      };

      var pts = [];
      var v;
      for (v = -3.2; v <= 3.2; v += 0.03) {
        if (model === 'relativistic' && Math.abs(v) >= vmaxRel) continue;
        var Lv = getL(v);
        var pv = getP(v);
        var Hv = pv * v - Lv;
        if (!isFinite(Lv) || !isFinite(pv) || !isFinite(Hv)) continue;
        pts.push({ v: v, L: Lv, p: pv, H: Hv });
      }

      var curL = getL(curV);
      var curP = getP(curV);
      var curH = curP * curV - curL;
      if (!isFinite(curL)) curL = 0;
      if (!isFinite(curP)) curP = 0;
      if (!isFinite(curH)) curH = 0;
      var pvProd = curP * curV;
      var Hdisp = Math.sqrt(curP * curP * c * c + m * m * c * c * c * c);

      if (!Array.isArray(state._ghosts)) state._ghosts = [];
      if (rolling) {
        state._ghosts.push({ v: curV, L: curL, p: curP, H: curH });
        if (state._ghosts.length > 18) state._ghosts.shift();
      }

      var plot = boxOf(36, 18, width - 18, height - 18);
      fillPanel(ctx, plot);
      frameBox(ctx, plot);

      var yVals = [0, curL, -curH, pvProd];
      var i;
      for (i = 0; i < pts.length; i++) yVals.push(pts[i].L);
      if (Math.abs(pvProd) > 18) {
        yVals = [0, curL, -curH];
        for (i = 0; i < pts.length; i++) yVals.push(pts[i].L);
      }
      var vRange = { lo: -3.25, hi: 3.25 };
      var lRange = niceRange(yVals, 0.18);
      var Lmap = mapper(plot, vRange.lo, vRange.hi, lRange.lo, lRange.hi);

      ctx.save();
      clipBox(ctx, plot);

      var barX = Lmap.x(curV);
      var yZero = Lmap.y(0);
      var yL = Lmap.y(curL);
      var yPV = Lmap.y(pvProd);
      var yNegH = Lmap.y(-curH);
      var barW = 10;

      ctx.fillStyle = 'rgba(204, 120, 92, 0.28)';
      ctx.fillRect(barX - barW / 2, Math.min(yZero, yL), barW, Math.max(2, Math.abs(yL - yZero)));
      ctx.fillStyle = 'rgba(212, 160, 23, 0.32)';
      ctx.fillRect(barX - barW / 2, Math.min(yL, yPV), barW, Math.max(2, Math.abs(yPV - yL)));

      var g;
      for (g = 0; g < state._ghosts.length; g++) {
        var gh = state._ghosts[g];
        var alpha = 0.08 + 0.10 * (g / state._ghosts.length);
        ctx.strokeStyle = 'rgba(212, 160, 23, ' + alpha + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        var gLeft = gh.p * (vRange.lo - gh.v) + gh.L;
        var gRight = gh.p * (vRange.hi - gh.v) + gh.L;
        ctx.moveTo(Lmap.x(vRange.lo), Lmap.y(gLeft));
        ctx.lineTo(Lmap.x(vRange.hi), Lmap.y(gRight));
        ctx.stroke();
      }

      ctx.strokeStyle = CORAL;
      ctx.lineWidth = 2.6;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      var started = false;
      for (i = 0; i < pts.length; i++) {
        var sx = Lmap.x(pts[i].v);
        var sy = Lmap.y(pts[i].L);
        if (!isFinite(sx) || !isFinite(sy)) continue;
        if (!started) { ctx.moveTo(sx, sy); started = true; }
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();

      ctx.strokeStyle = TEAL;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(Lmap.x(vRange.lo), Lmap.y(curP * vRange.lo));
      ctx.lineTo(Lmap.x(vRange.hi), Lmap.y(curP * vRange.hi));
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      var tLeft = curP * (vRange.lo - curV) + curL;
      var tRight = curP * (vRange.hi - curV) + curL;
      ctx.moveTo(Lmap.x(vRange.lo), Lmap.y(tLeft));
      ctx.lineTo(Lmap.x(vRange.hi), Lmap.y(tRight));
      ctx.stroke();

      ctx.strokeStyle = 'rgba(224, 86, 102, 0.45)';
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Lmap.x(0), yNegH);
      ctx.lineTo(barX, yNegH);
      ctx.stroke();
      ctx.setLineDash([]);

      disk(ctx, barX, yL, 5.5, CORAL);
      if (inBox(plot, Lmap.x(0), yNegH, 6)) disk(ctx, Lmap.x(0), yNegH, 5, ROSE);
      if (inBox(plot, barX, yPV, 6) && Math.abs(yPV - yL) > 10) disk(ctx, barX, yPV, 4, TEAL);
      ctx.restore();

      drawPlotAxes(ctx, plot, Lmap.x(0), Lmap.y(0), 'q-dot', 'L', width, height);

      if (inBox(plot, barX, yL, 12)) {
        creamText(ctx, 'L', barX + (curV >= 0 ? 12 : -12), yL - 10, width, height, {
          align: curV >= 0 ? 'left' : 'right', color: CORAL, font: FONT
        });
      }
      if (inBox(plot, Lmap.x(0), yNegH, 10) && Math.abs(curH) > 0.08) {
        creamText(ctx, '-H', Lmap.x(0) + 10, yNegH + (yNegH < yZero ? 12 : -12), width, height, {
          color: ROSE, font: FONT
        });
      }
      if (inBox(plot, barX, (yL + yPV) / 2, 8) && Math.abs(yPV - yL) > 16) {
        creamText(ctx, 'H', barX + 12, (yL + yPV) / 2, width, height, { color: GOLD, font: FONT });
      }
      var pLabX = Lmap.x(curV >= 0 ? vRange.hi * 0.62 : vRange.lo * 0.62);
      var pLabY = Lmap.y(curP * (curV >= 0 ? vRange.hi * 0.62 : vRange.lo * 0.62));
      if (inBox(plot, pLabX, pLabY, 10) && Math.abs(curP) > 0.15) {
        creamText(ctx, 'slope p', pLabX, pLabY - 10, width, height, { color: TEAL, font: FONT_SM, align: 'center' });
      }

      var modelLabel = 'Classical $L = \\frac{1}{2}m\\dot{q}^2$';
      if (model === 'relativistic') modelLabel = 'Relativistic $L = -mc^2\\sqrt{1-\\dot{q}^2/c^2}$';
      if (model === 'quartic') modelLabel = 'Nonlinear $L = \\frac{1}{4}\\alpha\\dot{q}^4$';

      var legendRows31 = [
        { label: 'model', value: modelLabel, hint: 'Which $L(\\dot{q})$ is dualized. The Legendre geometry is the same; only the $p(\\dot{q})$ inversion changes.' },
        { label: '$\\dot{q}$', value: mathNum(curV), hint: 'Contact abscissa. $p$ is the slope of $L$ here, and $H = p\\dot{q} - L$ is read from the intercept.' },
        { label: '$L$', value: mathNum(curL), hint: 'Lagrangian at this $\\dot{q}$. The coral curve is $L$ versus velocity.' },
        { label: '$p = \\partial L/\\partial\\dot{q}$', value: mathNum(curP), hint: 'Canonical momentum — slope of $L$ at this $\\dot{q}$. The dashed teal ray through the origin has the same slope.' },
        { label: '$H = p\\dot{q}-L$', value: mathNum(curH), hint: 'Legendre dual. After inverting $p(\\dot{q})$, no $\\dot{q}$ may remain. The gold tangent $y = p\\xi - H$ has $y$-intercept $-H$, not $+H$.' },
        { label: '$p\\dot{q}$', value: mathNum(pvProd), hint: 'Young pairing $p\\dot{q} = L + H$. The vertical gap from $L$ up to this product equals $H$.' },
        { label: '$L+H$', value: mathNum(curL + curH), hint: 'Equals $p\\dot{q}$ at the contact (Young identity). A GRE check that $H$ was formed correctly.' },
        { label: 'parallel gap', value: 'origin line $y=p\\xi$ minus tangent $= H$', hint: 'The origin line $y = p\\xi$ is parallel to the tangent. Their constant vertical separation is $H$ itself.' }
      ];
      if (model === 'relativistic') {
        legendRows31.push({ label: '$\\sqrt{p^2 c^2 + m^2 c^4}$', value: mathNum(Hdisp), hint: 'On-shell relativistic energy. For $L = -mc^2\\sqrt{1-\\dot{q}^2/c^2}$ the Legendre transform is exactly this $H(p)$.' });
      }
      vizLegend('Legendre transform  $H = p\\dot{q} - L$', legendRows31);

      var spots31 = [];
      spots31.push({
        id: 'contact',
        kind: 'circle',
        x: barX,
        y: yL,
        r: 10,
        title: 'Contact $L(\\dot{q})$',
        body: '$L = ' + curL.toFixed(2) + '$ at $\\dot{q} = ' + curV.toFixed(2) + '$. Canonical $p$ is the slope of the coral curve here.'
      });
      if (inBox(plot, Lmap.x(0), yNegH, 4)) {
        spots31.push({
          id: 'negH',
          kind: 'circle',
          x: Lmap.x(0),
          y: yNegH,
          r: 10,
          title: 'Intercept $-H$',
          body: 'Tangent $y = p\\xi - H$ meets the $L$-axis at $-H = ' + (-curH).toFixed(2) + '$, not $+H$.'
        });
      }
      if (inBox(plot, barX, yPV, 6) && Math.abs(yPV - yL) > 10) {
        spots31.push({
          id: 'pqdot',
          kind: 'circle',
          x: barX,
          y: yPV,
          r: 8,
          title: '$p\\dot{q}$',
          body: '$p\\dot{q} = ' + pvProd.toFixed(2) + ' = L + H$ (Young identity at the contact).'
        });
      }
      spots31.push({
        id: 'Hbar',
        kind: 'segment',
        x1: barX,
        y1: yL,
        x2: barX,
        y2: yPV,
        halfW: 8,
        title: 'Gap $H$',
        body: 'Vertical gap from $L$ to $p\\dot{q}$ is $H = ' + curH.toFixed(2) + '$. Same $H$ as minus the tangent intercept.'
      });
      spots31.push({
        id: 'Lbar',
        kind: 'segment',
        x1: barX,
        y1: yZero,
        x2: barX,
        y2: yL,
        halfW: 8,
        title: 'Bar $L$',
        body: 'Height from the $\\dot{q}$-axis to the coral curve is $L = ' + curL.toFixed(2) + '$.'
      });
      spots31.push({
        id: 'tangent',
        kind: 'segment',
        x1: Lmap.x(vRange.lo),
        y1: Lmap.y(tLeft),
        x2: Lmap.x(vRange.hi),
        y2: Lmap.y(tRight),
        halfW: 7,
        title: 'Tangent $y = p\\xi - H$',
        body: 'Slope $p = \\partial L/\\partial\\dot{q} = ' + curP.toFixed(2) + '$. Intercept $-H = ' + (-curH).toFixed(2) + '.'
      });
      spots31.push({
        id: 'originRay',
        kind: 'segment',
        x1: Lmap.x(vRange.lo),
        y1: Lmap.y(curP * vRange.lo),
        x2: Lmap.x(vRange.hi),
        y2: Lmap.y(curP * vRange.hi),
        halfW: 6,
        title: 'Origin ray $y = p\\xi$',
        body: 'Through the origin with slope $p = ' + curP.toFixed(2) + '$. Parallel to the tangent; the constant gap is $H$.'
      });
      if (pts.length >= 2) {
        var iL = 0;
        var best = Infinity;
        var iC, dvC;
        for (iC = 0; iC < pts.length; iC++) {
          dvC = Math.abs(pts[iC].v - curV);
          if (dvC < best) { best = dvC; iL = iC; }
        }
        var iA = Math.max(0, iL - 14);
        var iB = Math.min(pts.length - 1, iL + 14);
        spots31.push({
          id: 'Lcurve',
          kind: 'segment',
          x1: Lmap.x(pts[iA].v),
          y1: Lmap.y(pts[iA].L),
          x2: Lmap.x(pts[iB].v),
          y2: Lmap.y(pts[iB].L),
          halfW: 10,
          title: 'Lagrangian $L(\\dot{q})$',
          body: 'Coral $L(\\dot{q})$ for this kinetic model. At $\\dot{q} = ' + curV.toFixed(2) + '$, $L = ' + curL.toFixed(2) + '$ and $p = ' + curP.toFixed(2) + '$.'
        });
      }
      spots31.push({
        id: 'plot',
        kind: 'rect',
        x: plot.x0,
        y: plot.y0,
        w: plot.w,
        h: plot.h,
        title: '$L$ versus $\\dot{q}$',
        body: 'Legendre picture: trade slope $p$ of $L(\\dot{q})$ for intercept $-H$. Current $H = p\\dot{q} - L = ' + curH.toFixed(2) + '$.'
      });
      PGRE.setVizHotspots(spots31);
    },
    challenge: {
      question: "For a 1D system with Lagrangian L = ¼ α q̇⁴ - ½ k q², where α is a positive constant, what is the correct Hamiltonian H(q, p)?",
      options: [
        "A) H = ¾ (p / α)^{4/3} + ½ k q²",
        "B) H = ¾ α^{-1/3} p^{4/3} + ½ k q²",
        "C) H = ¼ α^{-1/3} p^{4/3} + ½ k q²",
        "D) H = p² / (2α) + ½ k q²",
        "E) H = ¾ α p^{4/3} - ½ k q²"
      ],
      correct: 1,
      explanation: "Calculate canonical momentum: p = ∂L/∂q̇ = α q̇³ ⇒ q̇ = (p/α)^{1/3} = α^{-1/3} p^{1/3}. Next, apply the Legendre transform: H = p q̇ - L = p (α^{-1/3} p^{1/3}) - [¼ α (α^{-1/3} p^{1/3})⁴ - ½ k q²] = α^{-1/3} p^{4/3} - ¼ α^{-1/3} p^{4/3} + ½ k q² = ¾ α^{-1/3} p^{4/3} + ½ k q²."
    }
  };

  PGRE.visualizers['cpgf-1.32'] = {
    id: 'cpgf-1.32',
    topic: 'cm',
    title: 'Hamiltonian as Total Energy & Conservation Criteria: $H = T + U$',
    formulaLatex: 'H = T + U \\iff \\begin{cases} \\mathbf{r} = \\mathbf{r}(q) \\text{ (time-independent coordinate transformation)} \\\\ U = U(q) \\text{ (velocity-independent potential)} \\end{cases}',
    physicalStory: `
A widespread GRE misconception is that the Hamiltonian is *always* total energy ($E = T + U$) and *always* conserved ($dH/dt = 0$). These are independent:

1. **$H = E$** requires a time-independent map $\\mathbf{r}_i = \\mathbf{r}_i(q)$, so $T$ is purely quadratic ($T = T_2$).
2. **$dH/dt = 0$** requires $\\partial L/\\partial t = 0$.

A bead on a rod spinning at constant $\\omega$ has $x = r\\cos\\omega t$, $y = r\\sin\\omega t$. Then $T = T_2 + T_0$ with $T_0 = \\frac{1}{2}m\\omega^2 r^2$, so $H = T_2 - T_0 + U$ and $E - H = 2T_0$. The motor does work: $E$ breathes while Jacobi $H$ stays flat.
    `.trim(),
    derivationSteps: [
      "1. General kinetic energy expansion for time-dependent transformations $\\mathbf{r}_i(q, t)$: $T = T_2 + T_1 + T_0$, where $T_n$ is homogeneous of degree $n$ in velocities $\\dot{q}$.",
      "2. Canonical momentum is: $p_j = \\frac{\\partial T}{\\partial \\dot{q}_j} = \\frac{\\partial T_2}{\\partial \\dot{q}_j} + \\frac{\\partial T_1}{\\partial \\dot{q}_j}$.",
      "3. Applying Euler's homogeneous function theorem: $\\sum_j p_j \\dot{q}_j = 2 T_2 + T_1$.",
      "4. The Legendre transform evaluates to: $H = \\sum_j p_j \\dot{q}_j - L = (2T_2 + T_1) - (T_2 + T_1 + T_0 - U) = T_2 - T_0 + U$.",
      "5. If the transformation is time-independent, $T_1 = 0$ and $T_0 = 0$, yielding $H = T_2 + U = T + U = E$.",
      "6. The total time derivative of $H$ satisfies: $\\frac{dH}{dt} = -\\frac{\\partial L}{\\partial t}$. Thus $H$ is conserved if and only if $\\partial L/\\partial t = 0$."
    ],
    limitingCases: [
      { condition: 'Stationary Coordinate System', result: '$T = T_2 \\implies H = T + U = E$', description: 'Hamiltonian equals total mechanical energy.' },
      { condition: 'Uniformly Rotating System ($\\omega = \\text{const}$)', result: '$H = T_2 - T_0 + U = E - 2T_0$', description: '$H$ is conserved ($dH/dt = 0$) while total energy $E$ is not conserved.' },
      { condition: 'Time-Varying Potential $U(q, t)$', result: 'H = E \\quad (dH/dt = \\partial U/\\partial t \\neq 0)', description: '$H$ equals total energy, but energy is not conserved.' }
    ],
    greTraps: [
      { trap: 'Assuming H = E Always', warning: 'In moving reference frames (rotating turntables, moving ramps), $H = T_2 - T_0 + U \\neq T + U$.' },
      { trap: 'Confusing Energy Conservation with H Conservation', warning: 'A system can have conserved $H$ even when mechanical energy $E$ changes due to external constraint forces doing work.' }
    ],
    parameters: [
      { id: 'omega', label: 'Rotation speed $\\omega$', type: 'range', min: 0, max: 4.5, step: 0.1, value: 2.5, default: 2.5, unit: 'rad/s', format: v => `${v.toFixed(1)} rad/s`, hint: 'Lab-frame spin of the rod. Sets $T_0 = \\frac{1}{2}m\\omega^2 r^2$, so larger $\\omega$ drives $H = T_2 - T_0 + U$ farther from $E$.' },
      { id: 'k', label: 'Spring constant $k$', type: 'range', min: 2, max: 20, step: 0.5, value: 10.0, default: 10.0, unit: 'N/m', format: v => `${v.toFixed(1)} N/m`, hint: 'Spring $U = \\frac{1}{2}k r^2$. Jacobi well $V_J = \\frac{1}{2}(k - m\\omega^2)r^2$ is bound only if $\\omega^2 < k/m$.' },
      { id: 'simSpeed', label: 'Simulation Speed', min: 0.2, max: 3.0, step: 0.2, value: 1.0, default: 1.0, unit: 'x' },
      { id: 'perturb', label: 'Perturb bead', type: 'boolean', default: false, hint: 'Kicks $r$ outward. $H$ stays the Jacobi integral of the conservative $V_J$, but $E$ jumps because $T_0$ depends on $r$.' }
    ],
    init(container, state, redraw) {
      state.omega = (typeof state.omega === 'number' && isFinite(state.omega)) ? state.omega : 2.5;
      state.k = (typeof state.k === 'number' && isFinite(state.k)) ? state.k : 10.0;
      state.simSpeed = simSpeedOf(state);
      if (typeof state.r !== 'number' || !isFinite(state.r)) state.r = 0.8;
      if (typeof state.rDot !== 'number' || !isFinite(state.rDot)) state.rDot = 0;
      if (typeof state.phi !== 'number' || !isFinite(state.phi)) state.phi = 0;
      if (!Array.isArray(state.labTrail)) state.labTrail = [];
    },
    onParamChange: function (id, val, state) {
      if (!state) return;
      if (id === 'omega' || id === 'k') {
        state.labTrail = [];
      }
      if (id === 'perturb') {
        state.r = ((typeof state.r === 'number' && isFinite(state.r)) ? state.r : 0.8) + 0.3;
      }
    },
    draw(ctx, width, height, state, dt) {
      creamStage(ctx, width, height);
      state = state || {};
      dt = scaledDt(dt, state);

      var m = 1.0;
      var omega = (typeof state.omega === 'number' && isFinite(state.omega)) ? state.omega : 2.5;
      var kSpr = (typeof state.k === 'number' && isFinite(state.k)) ? state.k : 10.0;
      if (typeof state.r !== 'number' || !isFinite(state.r)) state.r = 0.8;
      if (typeof state.rDot !== 'number' || !isFinite(state.rDot)) state.rDot = 0;
      if (typeof state.phi !== 'number' || !isFinite(state.phi)) state.phi = 0;
      if (!Array.isArray(state.labTrail)) state.labTrail = [];
      if (state._histOmega !== omega || state._histK !== kSpr) {
        state.labTrail = [];
        state._histOmega = omega;
        state._histK = kSpr;
      }

      var R_WALL = 1.6;
      var alphaR = omega * omega - kSpr / m;
      var subSteps = 8;
      var subDt = dt / subSteps;
      var s;
      for (s = 0; s < subSteps; s++) {
        var Hkeep = radialJacobiH(m, state.r, state.rDot, omega, kSpr);
        var nxt = stepRadialExact(state.r, state.rDot, alphaR, subDt);
        if (Math.abs(nxt.r) > R_WALL) {
          var rWall = (nxt.r >= 0 ? 1 : -1) * R_WALL;
          state.r = rWall;
          var Vwall = 0.5 * (kSpr - m * omega * omega) * rWall * rWall;
          var rDotSq = (2 / m) * (Hkeep - Vwall);
          var bounceSgn = nxt.rDot >= 0 ? -1 : 1;
          state.rDot = bounceSgn * Math.sqrt(Math.max(0, rDotSq));
        } else {
          state.r = nxt.r;
          state.rDot = nxt.rDot;
        }
      }
      if (!isFinite(state.r) || !isFinite(state.rDot)) {
        state.r = 0.8;
        state.rDot = 0;
      }
      state.phi += omega * dt;

      var T2 = 0.5 * m * state.rDot * state.rDot;
      var T0 = 0.5 * m * state.r * state.r * omega * omega;
      var Uval = 0.5 * kSpr * state.r * state.r;
      var E_total = T2 + T0 + Uval;
      var H_val = T2 - T0 + Uval;

      state.labTrail.push({ r: state.r, phi: state.phi });
      if (state.labTrail.length > 110) state.labTrail.shift();

      var left = boxOf(8, 8, width - 8, height - 8);

      var cx = (left.x0 + left.x1) / 2;
      var cy = (left.y0 + left.y1) / 2 + 4;
      var rodLen = Math.min(left.w, left.h) * 0.42;
      var scale = rodLen / 1.7;

      ctx.save();
      clipBox(ctx, left);

      ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.10);
      ctx.lineWidth = 1;
      var ring, aTick;
      for (ring = 1; ring <= 3; ring++) {
        ctx.beginPath();
        ctx.arc(cx, cy, rodLen * (ring / 3), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      for (aTick = 0; aTick < 8; aTick++) {
        var ta = aTick * Math.PI / 4;
        ctx.moveTo(cx + Math.cos(ta) * 8, cy + Math.sin(ta) * 8);
        ctx.lineTo(cx + Math.cos(ta) * rodLen, cy + Math.sin(ta) * rodLen);
      }
      ctx.stroke();

      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.22);
      ctx.beginPath();
      ctx.arc(cx, cy, R_WALL * scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      var cphi = Math.cos(state.phi);
      var sphi = Math.sin(state.phi);
      var rx1 = cx - cphi * rodLen;
      var ry1 = cy - sphi * rodLen;
      var rx2 = cx + cphi * rodLen;
      var ry2 = cy + sphi * rodLen;

      if (state.labTrail.length > 2) {
        ctx.lineWidth = 1.6;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        var ti, tr, tphi, tx, ty, started = false;
        for (ti = 0; ti < state.labTrail.length; ti++) {
          tr = state.labTrail[ti].r * scale;
          tphi = state.labTrail[ti].phi;
          tx = cx + Math.cos(tphi) * tr;
          ty = cy + Math.sin(tphi) * tr;
          if (!started) { ctx.moveTo(tx, ty); started = true; }
          else ctx.lineTo(tx, ty);
        }
        ctx.strokeStyle = 'rgba(212, 160, 23, 0.55)';
        ctx.stroke();
      }

      ctx.strokeStyle = '#8e8b82';
      ctx.lineWidth = 3.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(rx1, ry1);
      ctx.lineTo(rx2, ry2);
      ctx.stroke();

      var bx = cx + cphi * state.r * scale;
      var by = cy + sphi * state.r * scale;

      if (Math.abs(state.r) * scale > 10 && DrawUtils && typeof DrawUtils.drawSpring === 'function') {
        DrawUtils.drawSpring(ctx, cx, cy, bx, by, 10, 11, CORAL, 0);
      } else if (Math.abs(state.r) * scale > 10) {
        ctx.strokeStyle = CORAL;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        var nCoils = 10;
        var i;
        for (i = 0; i <= nCoils; i++) {
          var frac = i / nCoils;
          var curDist = frac * state.r * scale;
          var perp = (i % 2 === 0 ? 6 : -6) * (i > 0 && i < nCoils ? 1 : 0);
          var px = cx + cphi * curDist - sphi * perp;
          var py = cy + sphi * curDist + cphi * perp;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }

      disk(ctx, cx, cy, 5, INK);
      disk(ctx, bx, by, 7, CORAL);

      if (omega > 0.05) {
        ctx.strokeStyle = MUTED;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(cx, cy, 16, state.phi, state.phi + 1.15);
        ctx.stroke();
        var ax = cx + Math.cos(state.phi + 1.15) * 16;
        var ay = cy + Math.sin(state.phi + 1.15) * 16;
        var ang = state.phi + 1.15 + Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax - Math.cos(ang) * 5 - Math.cos(state.phi + 1.15) * 3,
                   ay - Math.sin(ang) * 5 - Math.sin(state.phi + 1.15) * 3);
        ctx.lineTo(ax + Math.cos(ang) * 5 - Math.cos(state.phi + 1.15) * 3,
                   ay + Math.sin(ang) * 5 - Math.sin(state.phi + 1.15) * 3);
        ctx.closePath();
        ctx.fillStyle = MUTED;
        ctx.fill();
      }
      ctx.restore();

      var heq = Math.abs(T0) < 1e-4;
      var unbound = alphaR > 0;
      vizLegend('$H = T_2 - T_0 + U$ vs $E = T + U$', [
        { label: '$E = T + U$', value: mathNum(E_total), hint: 'Lab energy $T_2 + T_0 + U$. The spinning constraint does work, so $E$ is not conserved.' },
        { label: '$H = T_2 - T_0 + U$', value: mathNum(H_val), hint: 'Jacobi integral $T_2 - T_0 + U$. $\\partial L/\\partial t = 0$ at fixed $\\omega$, so $dH/dt = 0$ between wall hits.' },
        { label: '$E - H = 2T_0$', value: mathNum(E_total - H_val), hint: 'Always $2T_0 = m\\omega^2 r^2$. Vanishes only if $\\omega = 0$, which is the case $H = E$.' },
        { label: '$T_2$', value: mathNum(T2), hint: 'Quadratic kinetic piece $\\frac{1}{2}m\\dot{r}^2$ from radial motion along the rod.' },
        { label: '$T_0$', value: mathNum(T0), hint: 'Leftover $\\frac{1}{2}m\\omega^2 r^2$ from the time-dependent map $\\mathbf{r}(r,t)$. This is why $H \\neq E$.' },
        { label: '$U$', value: mathNum(Uval), hint: 'Spring $\\frac{1}{2}k r^2$. Velocity-independent, so it enters $H$ and $E$ the same way.' },
        { label: '$r$', value: mathNum(state.r), hint: 'Bead distance from the pivot. This is the single generalized coordinate.' },
        { label: '$H$ vs $E$', value: heq ? '$H = E$ ($T_0 = 0$)' : '$H \\neq E$ ($T_0 \\neq 0$)', hint: 'Equal iff $T_0 = 0$ (time-independent $\\mathbf{r}(q)$). A spinning rod is the GRE counterexample.' },
        { label: 'radial', value: unbound ? '$\\omega^2 > k/m$ (unbound in $V_J$)' : '$\\omega^2 < k/m$ (oscillation in $V_J$)', hint: 'Sign of $\\alpha = \\omega^2 - k/m$ selects oscillation versus runaway in $V_J$.' },
        { label: 'conservation', value: '$\\partial L/\\partial t = 0 \\Rightarrow dH/dt = 0$', hint: 'No explicit $t$ in $L(r,\\dot{r})$ at constant $\\omega$ conserves $H$, not mechanical $E$.' }
      ]);

      var spots32 = [];
      spots32.push({
        id: 'bead',
        kind: 'circle',
        x: bx,
        y: by,
        r: 12,
        title: 'Bead',
        body: 'Mass $m = 1$ at $r = ' + state.r.toFixed(2) + '$ with $\\dot{r} = ' + state.rDot.toFixed(2) + '$. Canonical coordinate is $r$ along the spinning rod.'
      });
      spots32.push({
        id: 'pivot',
        kind: 'circle',
        x: cx,
        y: cy,
        r: 10,
        title: 'Pivot',
        body: 'Rotation axis. Lab map $x = r\\cos\\omega t$, $y = r\\sin\\omega t$ produces $T_0 = \\frac{1}{2}m\\omega^2 r^2$, so $H \\neq E$.'
      });
      if (omega > 0.05) {
        spots32.push({
          id: 'omegaArrow',
          kind: 'circle',
          x: cx + Math.cos(state.phi + 1.15) * 16,
          y: cy + Math.sin(state.phi + 1.15) * 16,
          r: 12,
          title: 'Frame rotation $\\omega$',
          body: 'Constant $\\omega = ' + omega.toFixed(2) + '\\,\\mathrm{rad/s}$. $\\partial L/\\partial t = 0$ at this $\\omega$, so $dH/dt = 0$ even while $E$ breathes.'
        });
      }
      if (Math.abs(state.r) * scale > 10) {
        spots32.push({
          id: 'spring',
          kind: 'segment',
          x1: cx,
          y1: cy,
          x2: bx,
          y2: by,
          halfW: 8,
          title: 'Spring',
          body: '$U = \\frac{1}{2}k r^2$ with $k = ' + kSpr.toFixed(1) + '\\,\\mathrm{N/m}$. Velocity-independent, so $U$ enters $H$ and $E$ equally.'
        });
      }
      spots32.push({
        id: 'rod',
        kind: 'segment',
        x1: rx1,
        y1: ry1,
        x2: rx2,
        y2: ry2,
        halfW: 8,
        title: 'Rotating rod',
        body: 'Spins at $\\omega = ' + omega.toFixed(2) + '\\,\\mathrm{rad/s}$. The time-dependent map $\\mathbf{r}(r,t)$ is why $H \\neq E$.'
      });
      spots32.push({
        id: 'wall',
        kind: 'ring',
        x: cx,
        y: cy,
        r: R_WALL * scale,
        halfW: 8,
        title: 'Radial wall',
        body: 'Hard stop at $|r| = ' + R_WALL.toFixed(1) + '$. Jacobi $H = ' + H_val.toFixed(2) + '$ is conserved between hits; a bounce flips $\\dot{r}$ at fixed $H$.'
      });
      spots32.push({
        id: 'lab',
        kind: 'rect',
        x: left.x0,
        y: left.y0,
        w: left.w,
        h: left.h,
        title: 'Lab-frame picture',
        body: 'Bead on a spinning rod. $H = T_2 - T_0 + U = ' + H_val.toFixed(2) + '$ is conserved; $E = T + U = ' + E_total.toFixed(2) + '$ is not.'
      });
      PGRE.setVizHotspots(spots32);
    },
    challenge: {
      question: "A bead of mass m slides frictionlessly along a straight rod rotating in a horizontal plane with constant angular speed ω. If r is the radial distance from the rotation axis, what is the relationship between the Hamiltonian H and total mechanical energy E?",
      options: [
        "A) H = E = T + U, and both are conserved.",
        "B) H = E = T + U, but neither is conserved.",
        "C) H = ½mṙ² - ½mω²r² + U(r) ≠ E, and H is conserved while E is not conserved.",
        "D) H = ½mṙ² + ½mω²r² + U(r) = E, and H is not conserved.",
        "E) Mechanical energy E is conserved because the normal force does no work in the lab frame."
      ],
      correct: 2,
      explanation: "Since the coordinate transformation x = r cos(ωt), y = r sin(ωt) depends explicitly on time, kinetic energy has two components: quadratic T₂ = ½mṙ² and velocity-independent T₀ = ½mr²ω². The Hamiltonian is H = T₂ - T₀ + U = ½mṙ² - ½mr²ω² + U(r), which differs from E = T₂ + T₀ + U. Because the Lagrangian has no explicit time dependence (∂L/∂t = 0), H is strictly conserved (dH/dt = 0), whereas the rotating rod exerts a normal force that does work, causing E to fluctuate."
    }
  };

  PGRE.visualizers['cpgf-1.33'] = {
    id: 'cpgf-1.33',
    topic: 'cm',
    title: 'Hamilton\'s Canonical Equations & Phase Space Flow',
    formulaLatex: '\\dot{q}_i = \\frac{\\partial H}{\\partial p_i}, \\qquad \\dot{p}_i = -\\frac{\\partial H}{\\partial q_i}',
    physicalStory: `
Hamilton's equations are first-order flow on phase space: $\\dot{q} = \\partial H/\\partial p$ and $\\dot{p} = -\\partial H/\\partial q$. For autonomous $H(q,p)$ that vector is everywhere tangent to a level set $H = E$, so orbits cannot leave their energy contour.

The minus sign is symplectic: $\\nabla_{(q,p)}\\cdot(\\dot{q},\\dot{p}) = 0$. A small patch of initial conditions shears and filaments, but its area $\\iint dq\\,dp$ is constant (Liouville). Trajectories of an autonomous 1-D system never cross.
    `.trim(),
    derivationSteps: [
      "1. Compute the total differential of the Hamiltonian function $H(q, p, t)$: $dH = \\sum_i \\left( \\frac{\\partial H}{\\partial q_i} dq_i + \\frac{\\partial H}{\\partial p_i} dp_i \\right) + \\frac{\\partial H}{\\partial t} dt$.",
      "2. From the Legendre transform $H = \\sum_i p_i \\dot{q}_i - L(q, \\dot{q}, t)$, take the differential: $dH = \\sum_i (p_i d\\dot{q}_i + \\dot{q}_i dp_i) - \\left[ \\sum_i \\left( \\frac{\\partial L}{\\partial q_i} dq_i + \\frac{\\partial L}{\\partial \\dot{q}_i} d\\dot{q}_i \\right) + \\frac{\\partial L}{\\partial t} dt \\right]$.",
      "3. Use $p_i = \\frac{\\partial L}{\\partial \\dot{q}_i}$ to cancel the $d\\dot{q}_i$ terms: $dH = \\sum_i \\dot{q}_i dp_i - \\sum_i \\frac{\\partial L}{\\partial q_i} dq_i - \\frac{\\partial L}{\\partial t} dt$.",
      "4. Apply the Euler-Lagrange equations $\\dot{p}_i = \\frac{\\partial L}{\\partial q_i}$: $dH = \\sum_i \\dot{q}_i dp_i - \\sum_i \\dot{p}_i dq_i - \\frac{\\partial L}{\\partial t} dt$.",
      "5. Matching differentials of independent phase coordinates $(dq_i, dp_i, dt)$ directly yields Hamilton's Canonical Equations: $\\dot{q}_i = \\frac{\\partial H}{\\partial p_i}$, $\\dot{p}_i = -\\frac{\\partial H}{\\partial q_i}$, and $\\frac{\\partial H}{\\partial t} = -\\frac{\\partial L}{\\partial t}$."
    ],
    limitingCases: [
      { condition: 'Harmonic Oscillator ($H = \\frac{p^2}{2m} + \\frac{1}{2}kq^2$)', result: '$\\dot{q} = p/m, \\quad \\dot{p} = -kq$', description: 'Elliptical phase orbits with constant area $\\pi A B = 2\\pi E / \\omega$.' },
      { condition: 'Free Particle ($H = \\frac{p^2}{2m}$)', result: '$\\dot{q} = p/m, \\quad \\dot{p} = 0$', description: 'Straight horizontal flow lines in phase space.' },
      { condition: 'Nonlinear Pendulum (Separatrix)', result: 'E = 2mgl', description: 'Divides closed libration orbits from circulating rotation orbits.' }
    ],
    greTraps: [
      { trap: 'Phase Trajectory Intersections', warning: 'Phase trajectories for autonomous systems NEVER cross or intersect each other (uniqueness theorem of 1st-order ODEs).' },
      { trap: 'Sign in Momentum Equation', warning: 'Remember that $\\dot{p} = -\\partial H/\\partial q$ carries a negative sign, reflecting that generalized force is the negative gradient of potential.' }
    ],
    parameters: [
      { id: 'system', label: 'Phase System', type: 'select', value: 'pendulum', default: 'pendulum', hint: 'Chooses $H(q,p)$. SHO: nested ellipses. Pendulum: separatrix at $E = 2mgl$. Double well: saddle at $U(0)$.', options: [
        { value: 'sho', label: 'Harmonic Oscillator' },
        { value: 'pendulum', label: 'Nonlinear Pendulum (with Separatrix)' },
        { value: 'doublewell', label: 'Double Well Potential' }
      ]},
      { id: 'energyFrac', label: 'Orbit energy / separatrix', type: 'range', min: 0.15, max: 1.7, step: 0.05, value: 0.45, default: 0.45, hint: 'Orbit energy as a fraction of the reference separatrix (or SHO scale). Pendulum: below $1$ librates; above $1$ rotates.' },
      { id: 'swarm', label: 'Liouville patch', type: 'toggle', value: true, default: true, onText: 'Patch on', offText: 'Orbit only', hint: 'Tiny blob of neighboring initial conditions. Hamiltonian flow is incompressible, so the enclosed area is Liouville-invariant.' },
      { id: 'simSpeed', label: 'Simulation Speed', min: 0.2, max: 3.0, step: 0.2, value: 1.0, default: 1.0, unit: 'x' },
      { id: 'resetCloud', label: 'Reset patch', type: 'boolean', default: false, hint: 'Re-seeds the Liouville patch around the current $(q,p)$ so you can watch area preservation from a compact blob.' }
    ],
    init(container, state, redraw) {
      if (state.system !== 'sho' && state.system !== 'pendulum' && state.system !== 'doublewell') {
        state.system = 'pendulum';
      }
      state.swarm = flagOn(state.swarm, true);
      state.simSpeed = simSpeedOf(state);
      if (typeof state.energyFrac !== 'number' || !isFinite(state.energyFrac)) state.energyFrac = 0.45;
      var probe0 = placeOnOrbit(state.system, state.energyFrac);
      if (typeof state.q !== 'number' || !isFinite(state.q)) state.q = probe0.q;
      if (typeof state.p !== 'number' || !isFinite(state.p)) state.p = probe0.p;
      if (!Array.isArray(state.trail)) state.trail = [];
      seedLiouvilleRing(state);
    },
    onParamChange: function (id, val, state) {
      if (!state) return;
      if (id === 'system' || id === 'energyFrac') {
        if (id === 'system') state.system = val;
        var probe = placeOnOrbit(state.system, state.energyFrac);
        state.q = probe.q;
        state.p = probe.p;
        state.trail = [];
        seedLiouvilleRing(state);
      }
      if (id === 'swarm' && val) seedLiouvilleRing(state);
      if (id === 'resetCloud') seedLiouvilleRing(state);
    },
    draw(ctx, width, height, state, dt) {
      creamStage(ctx, width, height);
      state = state || {};
      dt = scaledDt(dt, state);

      if (state.system !== 'sho' && state.system !== 'pendulum' && state.system !== 'doublewell') {
        state.system = 'pendulum';
      }
      var swarmOn = flagOn(state.swarm, true);
      if (typeof state.energyFrac !== 'number' || !isFinite(state.energyFrac)) state.energyFrac = 0.45;
      if (typeof state.q !== 'number' || !isFinite(state.q)) {
        var placed = placeOnOrbit(state.system, state.energyFrac);
        state.q = placed.q;
        state.p = placed.p;
      }
      if (typeof state.p !== 'number' || !isFinite(state.p)) state.p = placeOnOrbit(state.system, state.energyFrac).p;
      if (!Array.isArray(state.trail)) state.trail = [];
      if (!state.particles || state._swarmSystem !== state.system) seedLiouvilleRing(state);

      var system = state.system;
      var stage = boxOf(16, 14, width - 16, height - 14);
      var qLo = -3.3;
      var qHi = 3.3;
      var pLo = system === 'pendulum' ? -3.85 : -2.85;
      var pHi = system === 'pendulum' ? 3.85 : 2.85;
      var Pmap = mapper(stage, qLo, qHi, pLo, pHi);
      var cx = Pmap.x(0);
      var cy = Pmap.y(0);

      fillPanel(ctx, stage);
      frameBox(ctx, stage);

      ctx.save();
      clipBox(ctx, stage);

      var subSteps = 8;
      var subDt = dt / subSteps;
      var ss, k;
      if (swarmOn && state.particles) {
        for (k = 0; k < state.particles.length; k++) {
          for (ss = 0; ss < subSteps; ss++) stepLeapfrog(state.particles[k], subDt, system);
        }
      }
      for (ss = 0; ss < subSteps; ss++) stepLeapfrog(state, subDt, system);
      if (!isFinite(state.q) || !isFinite(state.p)) {
        var reset = placeOnOrbit(system, state.energyFrac);
        state.q = reset.q;
        state.p = reset.p;
        state.trail = [];
      }
      state.trail.push({ q: state.q, p: state.p });
      if (state.trail.length > 240) state.trail.shift();

      var levels;
      if (system === 'sho') levels = [0.5, 1.2, 2.0, 3.2];
      else if (system === 'pendulum') levels = [1.5, 3.0, 6.0, 9.0, 12.5];
      else levels = [0.35, 0.85, 1.5, 2.4, 3.6];

      var li, bi, brs, px, py;
      for (li = 0; li < levels.length; li++) {
        var isSep = (system === 'pendulum' && Math.abs(levels[li] - 6) < 1e-6) ||
                    (system === 'doublewell' && Math.abs(levels[li] - 1.5) < 1e-6);
        brs = contourBranches(system, levels[li], qLo, qHi, 260);
        for (bi = 0; bi < brs.length; bi++) {
          var cpts = [];
          for (k = 0; k < brs[bi].length; k++) {
            cpts.push({ x: Pmap.x(brs[bi][k].q), y: Pmap.y(brs[bi][k].p) });
          }
          strokePoly(ctx, cpts, isSep ? ROSE : PGRE.vizStageTheme().inkFade(0.22), isSep ? 1.7 : 1.15, isSep ? [5, 4] : null);
        }
      }

      var orbitE = hamH(system, state.q, state.p);
      brs = contourBranches(system, orbitE, qLo, qHi, 280);
      for (bi = 0; bi < brs.length; bi++) {
        var opts = [];
        for (k = 0; k < brs[bi].length; k++) {
          opts.push({ x: Pmap.x(brs[bi][k].q), y: Pmap.y(brs[bi][k].p) });
        }
        strokePoly(ctx, opts, CORAL, 2.2, null);
      }

      disk(ctx, Pmap.x(0), Pmap.y(0), 3.2, system === 'doublewell' ? ROSE : TEAL);
      if (system === 'pendulum') {
        disk(ctx, Pmap.x(Math.PI), Pmap.y(0), 3.2, ROSE);
        disk(ctx, Pmap.x(-Math.PI), Pmap.y(0), 3.2, ROSE);
      }
      if (system === 'doublewell') {
        disk(ctx, Pmap.x(1), Pmap.y(0), 3.2, TEAL);
        disk(ctx, Pmap.x(-1), Pmap.y(0), 3.2, TEAL);
      }

      if (swarmOn && state.particles) {
        var polyOk = true;
        var screenPts = [];
        for (k = 0; k < state.particles.length; k++) {
          var pt = state.particles[k];
          if (!isFinite(pt.q) || !isFinite(pt.p)) { polyOk = false; continue; }
          var nxt = state.particles[(k + 1) % state.particles.length];
          if (Math.abs(pt.q - nxt.q) > 1.4) polyOk = false;
          screenPts.push({ x: Pmap.x(pt.q), y: Pmap.y(pt.p) });
        }
        if (polyOk && screenPts.length > 3) {
          ctx.beginPath();
          ctx.moveTo(screenPts[0].x, screenPts[0].y);
          for (k = 1; k < screenPts.length; k++) ctx.lineTo(screenPts[k].x, screenPts[k].y);
          ctx.closePath();
          ctx.fillStyle = 'rgba(212, 160, 23, 0.22)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(212, 160, 23, 0.85)';
          ctx.lineWidth = 1.3;
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(212, 160, 23, 0.9)';
        for (k = 0; k < state.particles.length; k++) {
          px = Pmap.x(state.particles[k].q);
          py = Pmap.y(state.particles[k].p);
          if (!inBox(stage, px, py, 1)) continue;
          ctx.beginPath();
          ctx.arc(px, py, 2.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.strokeStyle = CORAL;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      var trailOn = false;
      var ti;
      for (ti = 0; ti < state.trail.length; ti++) {
        var tpt = state.trail[ti];
        var tx = Pmap.x(tpt.q);
        var ty = Pmap.y(tpt.p);
        if (!isFinite(tx) || !isFinite(ty)) { trailOn = false; continue; }
        if (!trailOn) { ctx.moveTo(tx, ty); trailOn = true; }
        else if (ti > 0 && Math.hypot(tpt.q - state.trail[ti - 1].q, tpt.p - state.trail[ti - 1].p) > 1.2) {
          ctx.moveTo(tx, ty);
        } else {
          ctx.lineTo(tx, ty);
        }
      }
      ctx.stroke();

      var qdotNow = state.p;
      var pdotNow = hamForce(system, state.q);
      var sx0 = Pmap.x(state.q);
      var sy0 = Pmap.y(state.p);
      var angFlow = Math.atan2(-pdotNow * (stage.h / (pHi - pLo)), qdotNow * (stage.w / (qHi - qLo)));
      var flowLen = 28;
      arrow(ctx, sx0, sy0, sx0 + Math.cos(angFlow) * flowLen, sy0 + Math.sin(angFlow) * flowLen, TEAL, 2.2);
      disk(ctx, sx0, sy0, 6, CORAL);
      ctx.restore();

      drawPlotAxes(ctx, stage, cx, cy, 'q', 'p', width, height);

      var sysLabel = 'Nonlinear pendulum';
      if (system === 'sho') sysLabel = 'Harmonic oscillator';
      if (system === 'doublewell') sysLabel = 'Double well';
      var areaNow = (swarmOn && state.particles) ? Math.abs(shoelace(state.particles)) : 0;
      var area0 = state._swarmArea0 || 0;
      var sepE = hamSepE(system);
      var legendRows = [
        { label: 'system', value: sysLabel, hint: 'Which $H$ generates the arrows. Autonomous orbits cannot leave their level set $H = E$.' },
        { label: '$q$', value: mathNum(state.q), hint: 'Generalized coordinate. Hamilton says $\\dot{q} = \\partial H/\\partial p$.' },
        { label: '$p$', value: mathNum(state.p), hint: 'Canonical momentum. Hamilton says $\\dot{p} = -\\partial H/\\partial q$ — the minus sign is the usual GRE trap.' },
        { label: '$\\dot{q} = \\partial H/\\partial p$', value: mathNum(qdotNow), hint: 'Horizontal phase speed. For $T = p^2/2$ (here $m = 1$) this is just $p$.' },
        { label: '$\\dot{p} = -\\partial H/\\partial q$', value: mathNum(pdotNow), hint: 'Vertical phase speed $-\\partial V/\\partial q$, the generalized force.' },
        { label: '$H$', value: mathNum(orbitE), hint: 'Hamiltonian on this orbit. The coral contour is the level set $H = E$; the flow is tangent to it.' }
      ];
      if (system === 'sho') {
        legendRows.push({ label: 'contour', value: 'closed ellipse (no separatrix)', hint: 'Harmonic level sets are ellipses. No separatrix: every finite-$E$ orbit is closed.' });
      } else {
        legendRows.push({
          label: 'contour',
          value: orbitE < sepE - 0.05 ? 'inside separatrix' : (orbitE > sepE + 0.05 ? 'outside / rotating' : 'near separatrix'),
          hint: 'Inside the separatrix: libration. Outside: rotation. On it: approach the saddle in infinite time.'
        });
      }
      if (system === 'pendulum') {
        legendRows.push({ label: 'dashed rose', value: 'separatrix $E = 2mgl$', hint: 'Homoclinic $E = 2mgl$. Divides swinging from circulating motion.' });
      }
      if (system === 'doublewell') {
        legendRows.push({ label: 'dashed rose', value: 'saddle energy $U(0)$', hint: 'Barrier energy $U(0)$. Below it each well has its own closed orbits.' });
      }
      if (swarmOn && area0 > 0) {
        legendRows.push({ label: 'Liouville area', value: mathNum(areaNow, 3) + ' / $A_0=' + fmt(area0, 3) + '$', hint: 'Shoelace area of the gold patch. The blob shears and filaments, but $A$ stays near $A_0$.' });
      }
      legendRows.push({ label: 'flow', value: '$\\nabla\\cdot(\\dot{q},\\dot{p}) = 0$', hint: 'Symplectic identity $\\partial\\dot{q}/\\partial q + \\partial\\dot{p}/\\partial p = 0$. Phase volume is conserved.' });
      vizLegend("Hamilton's equations  (level sets of $H$)", legendRows);

      var spots33 = [];
      spots33.push({
        id: 'phase',
        kind: 'circle',
        x: sx0,
        y: sy0,
        r: 10,
        title: 'Phase point $(q, p)$',
        body: 'Current state $q = ' + state.q.toFixed(2) + '$, $p = ' + state.p.toFixed(2) + '$. Autonomous flow stays on $H = ' + orbitE.toFixed(2) + '$.'
      });
      spots33.push({
        id: 'flow',
        kind: 'segment',
        x1: sx0,
        y1: sy0,
        x2: sx0 + Math.cos(angFlow) * flowLen,
        y2: sy0 + Math.sin(angFlow) * flowLen,
        halfW: 8,
        title: 'Hamiltonian vector $(\\dot{q}, \\dot{p})$',
        body: '$\\dot{q} = \\partial H/\\partial p = ' + qdotNow.toFixed(2) + '$, $\\dot{p} = -\\partial H/\\partial q = ' + pdotNow.toFixed(2) + '$. The minus sign is symplectic.'
      });
      spots33.push({
        id: 'origin',
        kind: 'circle',
        x: Pmap.x(0),
        y: Pmap.y(0),
        r: 9,
        title: system === 'doublewell' ? 'Saddle $q = 0$' : 'Fixed point $q = 0$',
        body: system === 'doublewell'
          ? ('Barrier top $U(0)$. Separatrix energy $H = ' + sepE.toFixed(2) + '$ passes through this saddle.')
          : ('Equilibrium at the origin. For the pendulum this is the hanging point; for SHO it is the unique center.')
      });
      if (system === 'pendulum') {
        spots33.push({
          id: 'saddleR',
          kind: 'circle',
          x: Pmap.x(Math.PI),
          y: Pmap.y(0),
          r: 9,
          title: 'Separatrix saddle $\\pi$',
          body: 'Unstable inverted point. Dashed rose is $E = 2mgl = ' + sepE.toFixed(2) + '$; it divides libration from rotation.'
        });
        spots33.push({
          id: 'saddleL',
          kind: 'circle',
          x: Pmap.x(-Math.PI),
          y: Pmap.y(0),
          r: 9,
          title: 'Separatrix saddle $-\\pi$',
          body: 'The other copy of the inverted point on the periodic $q$-circle. Homoclinic orbits approach it in infinite time.'
        });
        var pSep = Math.sqrt(Math.max(0, 2 * (sepE - hamV(system, 0))));
        spots33.push({
          id: 'sepTop',
          kind: 'circle',
          x: Pmap.x(0),
          y: Pmap.y(pSep),
          r: 10,
          title: 'Separatrix $E = 2mgl$',
          body: 'Dashed rose contour $H = ' + sepE.toFixed(2) + '$. Divides closed libration from circulating rotation. Orbit $H = ' + orbitE.toFixed(2) + '$.'
        });
      }
      if (system === 'doublewell') {
        spots33.push({
          id: 'wellR',
          kind: 'circle',
          x: Pmap.x(1),
          y: Pmap.y(0),
          r: 9,
          title: 'Well $q = +1$',
          body: 'Stable minimum. Below saddle energy $U(0) = ' + sepE.toFixed(2) + '$ the orbit is trapped in one well.'
        });
        spots33.push({
          id: 'wellL',
          kind: 'circle',
          x: Pmap.x(-1),
          y: Pmap.y(0),
          r: 9,
          title: 'Well $q = -1$',
          body: 'The other minimum of $U = \\frac{3}{2}(q^2-1)^2$. Crossing needs $H > ' + sepE.toFixed(2) + '$.'
        });
      }
      if (swarmOn && state.particles && state.particles.length > 2) {
        var swMinX = Infinity, swMinY = Infinity, swMaxX = -Infinity, swMaxY = -Infinity;
        var sk, spx, spy;
        for (sk = 0; sk < state.particles.length; sk++) {
          spx = Pmap.x(state.particles[sk].q);
          spy = Pmap.y(state.particles[sk].p);
          if (!isFinite(spx) || !isFinite(spy)) continue;
          if (spx < swMinX) swMinX = spx;
          if (spy < swMinY) swMinY = spy;
          if (spx > swMaxX) swMaxX = spx;
          if (spy > swMaxY) swMaxY = spy;
        }
        if (isFinite(swMinX) && swMaxX - swMinX > 4 && swMaxY - swMinY > 4) {
          spots33.push({
            id: 'swarm',
            kind: 'rect',
            x: swMinX,
            y: swMinY,
            w: swMaxX - swMinX,
            h: swMaxY - swMinY,
            title: 'Liouville patch',
            body: 'Neighboring initial conditions. Area $A = ' + areaNow.toFixed(3) + '$ versus $A_0 = ' + area0.toFixed(3) + '$; Hamiltonian flow keeps $A$ fixed.'
          });
        }
      }
      spots33.push({
        id: 'phasePlane',
        kind: 'rect',
        x: stage.x0,
        y: stage.y0,
        w: stage.w,
        h: stage.h,
        title: 'Phase plane $(q, p)$',
        body: 'Level sets of $H$. Flow is tangent to $H = E = ' + orbitE.toFixed(2) + '$; $\\nabla\\cdot(\\dot{q},\\dot{p}) = 0$ (Liouville).'
      });
      PGRE.setVizHotspots(spots33);
    },
    challenge: {
      question: "For a 1D system with Hamiltonian H(q, p) = α q p, where α is a positive constant, what is the exact time dependence of the generalized coordinate q(t) with initial position q(0) = q_0?",
      options: [
        "A) q(t) = q_0 e^{α t}",
        "B) q(t) = q_0 e^{-α t}",
        "C) q(t) = q_0 + α t",
        "D) q(t) = q_0 / (1 - α q_0 t)",
        "E) q(t) = q_0 cos(α t)"
      ],
      correct: 0,
      explanation: "From Hamilton's canonical equations, q̇ = ∂H/∂p = α q. This is a first-order separable linear ODE: dq/dt = α q ⇒ dq/q = α dt ⇒ ln(q/q_0) = α t ⇒ q(t) = q_0 e^{α t}. Meanwhile, ṗ = -∂H/∂q = -α p gives p(t) = p_0 e^{-α t}, ensuring that the phase space area q(t)p(t) = q_0 p_0 remains constant."
    }
  };


})(typeof window !== 'undefined' ? window : globalThis);
