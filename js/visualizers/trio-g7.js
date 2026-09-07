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
    for (var x = 0; x <= width; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (var y = 0; y <= height; y += step) {
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
    // Cap RAW frame dt (tab-hitch guard) before simSpeed, so 3x actually triples the dynamics.
    return Math.min(dt, 0.04);
  }

  function simSpeedOf(state) {
    var s = (state && typeof state.simSpeed === 'number') ? state.simSpeed : 1.0;
    if (!isFinite(s)) s = 1.0;
    return Math.max(0.2, Math.min(3.0, s));
  }

  function scaledDt(dt, state) {
    return finiteDt(dt) * simSpeedOf(state);
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
    var L = Math.sqrt(alpha);
    var ch = Math.cosh(L * dt);
    var sh = Math.sinh(L * dt);
    return {
      r: r * ch + (rDot / L) * sh,
      rDot: r * L * sh + rDot * ch
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

  function divider(ctx, x, y0, y1) {
    ctx.save();
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Math.floor(x) + 0.5, y0);
    ctx.lineTo(Math.floor(x) + 0.5, y1);
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
    for (var i = 0; i < vals.length; i++) {
      var v = vals[i];
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

  function defaultHamiltonProbe(system) {
    if (system === 'doublewell') return { q: 1.0, p: 0.55 };
    if (system === 'sho') return { q: 0.85, p: 0.9 };
    return { q: 0.5, p: 1.2 };
  }

  function seedHamiltonSwarm(state) {
    var system = state.system || 'pendulum';
    var qCenter = system === 'doublewell' ? 1.0 : 0.8;
    var pCenter = 0.8;
    state.particles = [];
    var n = 80;
    for (var i = 0; i < n; i++) {
      var r = Math.sqrt(Math.random()) * 0.32;
      var theta = Math.random() * Math.PI * 2;
      state.particles.push({
        q: qCenter + r * Math.cos(theta),
        p: pCenter + r * Math.sin(theta)
      });
    }
    state._swarmSystem = system;
  }


  PGRE.visualizers['cpgf-1.31'] = {
    id: 'cpgf-1.31',
    topic: 'cm',
    title: 'Hamiltonian & The Legendre Transform: $H(q, p, t) = \\sum_i p_i \\dot{q}_i - L$',
    formulaLatex: 'H(q, p, t) = \\sum_i p_i \\dot{q}_i - L(q, \\dot{q}, t)',
    physicalStory: `
The Legendre transformation is the mathematical duality converting Lagrangian mechanics on tangent bundle $(q, \\dot{q})$ into Hamiltonian mechanics on phase space $(q, p)$. 

Geometrically, the slope of $L(\\dot{q})$ at velocity $\\dot{q}$ is the canonical momentum $p = \\frac{\\partial L}{\\partial \\dot{q}}$. The Hamiltonian $H(p)$ represents the negative vertical intercept of this tangent line. The area of the bounding rectangle $p\\dot{q}$ is partitioned exactly into $L + H$, proving that $H = p\\dot{q} - L$.
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
      { id: 'qdot', label: 'Velocity $\\dot{q}$', type: 'range', min: -3, max: 3, step: 0.1, value: 1.5, default: 1.5, format: v => v.toFixed(1) },
      { id: 'model', label: 'Kinetic model', type: 'select', value: 'classical', default: 'classical', options: [
        { value: 'classical', label: 'Classical $L = \\frac{1}{2}m\\dot{q}^2$' },
        { value: 'relativistic', label: 'Relativistic $L = -mc^2\\sqrt{1-\\dot{q}^2/c^2}$' },
        { value: 'quartic', label: 'Nonlinear $L = \\frac{1}{4}\\alpha\\dot{q}^4$' }
      ]}
    ],
    init(container, state, redraw) {
      state.qdot = (typeof state.qdot === 'number' && isFinite(state.qdot)) ? state.qdot : 1.5;
      if (state.model !== 'classical' && state.model !== 'relativistic' && state.model !== 'quartic') {
        state.model = 'classical';
      }

    },
    draw(ctx, width, height, state, dt) {
      creamStage(ctx, width, height);
      state = state || {};

      var model = state.model;
      if (model !== 'classical' && model !== 'relativistic' && model !== 'quartic') model = 'classical';
      var curV = (typeof state.qdot === 'number' && isFinite(state.qdot)) ? state.qdot : 1.5;
      curV = Math.max(-3, Math.min(3, curV));

      var m = 1.0;
      var c = 3.5;
      var vmaxRel = 0.95 * c;

      if (model === 'relativistic' && Math.abs(curV) > vmaxRel) {
        curV = (curV < 0 ? -1 : 1) * vmaxRel;
      }

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
      for (var v = -3.2; v <= 3.2; v += 0.04) {
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
      var Hdisp = Math.sqrt(curP * curP * c * c + m * m * c * c * c * c);

      var splitX = Math.floor(width * 0.52);
      var left = boxOf(28, 16, splitX - 10, height - 16);
      var right = boxOf(splitX + 12, 16, width - 16, height - 16);
      divider(ctx, splitX, 12, height - 12);

      var yVals = [-curH, curL, 0];
      var pVals = [curP, 0];
      var hVals = [curH, 0];
      for (var i = 0; i < pts.length; i++) {
        yVals.push(pts[i].L);
        pVals.push(pts[i].p);
        hVals.push(pts[i].H);
      }
      var vRange = { lo: -3.25, hi: 3.25 };
      var lRange = niceRange(yVals, 0.16);
      var pRange = niceRange(pVals, 0.16);
      var hRange = niceRange(hVals, 0.16);

      var Lmap = mapper(left, vRange.lo, vRange.hi, lRange.lo, lRange.hi);
      var Hmap = mapper(right, pRange.lo, pRange.hi, hRange.lo, hRange.hi);

      frameBox(ctx, left);

      ctx.save();
      clipBox(ctx, left);

      // Vertical teaching bar at q-dot: L (coral) and H (gold) so L+H = p q-dot.
      // When L and -H sit on opposite sides of 0 (classical), stack from the axis.
      // When both are negative (true relativistic L), place H from L down to -H
      // so the gold bar does not paint over coral.
      if (Math.abs(curV) > 0.08) {
        var xBar = Lmap.x(curV);
        var yZero = Lmap.y(0);
        var yL = Lmap.y(curL);
        var yNegH = Lmap.y(-curH);
        var barW = 9;
        ctx.fillStyle = 'rgba(204, 120, 92, 0.22)';
        ctx.fillRect(xBar - barW / 2, Math.min(yZero, yL), barW, Math.abs(yL - yZero));
        ctx.fillStyle = 'rgba(212, 160, 23, 0.28)';
        if (curL >= 0 && -curH <= 0) {
          ctx.fillRect(xBar - barW / 2, Math.min(yZero, yNegH), barW, Math.abs(yNegH - yZero));
        } else {
          ctx.fillRect(xBar - barW / 2, Math.min(yL, yNegH), barW, Math.abs(yNegH - yL));
        }
      }

      ctx.strokeStyle = CORAL;
      ctx.lineWidth = 2.4;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      var started = false;
      for (var j = 0; j < pts.length; j++) {
        var sx = Lmap.x(pts[j].v);
        var sy = Lmap.y(pts[j].L);
        if (!isFinite(sx) || !isFinite(sy)) continue;
        if (!started) { ctx.moveTo(sx, sy); started = true; }
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();

      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      var tLeft = curP * (vRange.lo - curV) + curL;
      var tRight = curP * (vRange.hi - curV) + curL;
      ctx.moveTo(Lmap.x(vRange.lo), Lmap.y(tLeft));
      ctx.lineTo(Lmap.x(vRange.hi), Lmap.y(tRight));
      ctx.stroke();

      var interceptX = Lmap.x(0);
      var interceptY = Lmap.y(-curH);
      ctx.strokeStyle = 'rgba(224, 86, 102, 0.45)';
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(interceptX, interceptY);
      ctx.lineTo(Lmap.x(curV), interceptY);
      ctx.stroke();
      ctx.setLineDash([]);

      var opX = Lmap.x(curV);
      var opY = Lmap.y(curL);
      disk(ctx, opX, opY, 5.5, CORAL);
      if (inBox(left, interceptX, interceptY, 6)) disk(ctx, interceptX, interceptY, 5, ROSE);
      ctx.restore();

      drawPlotAxes(ctx, left, Lmap.x(0), Lmap.y(0), 'q-dot', 'L', width, height);

      // Geometry labels only — live numbers go to the legend strip
      var showL = inBox(left, opX, opY, 12) && Math.abs(curL) > 0.12;
      var showNegH = inBox(left, interceptX, interceptY, 12) && Math.abs(curH) > 0.12;
      if (showL && showNegH && Math.hypot(opX - interceptX, opY - interceptY) < 26) {
        showL = false;
      }
      if (showL) {
        var lOff = curV >= 0 ? 10 : -10;
        creamText(ctx, 'L', opX + lOff, opY - 10, width, height, {
          align: curV >= 0 ? 'left' : 'right', color: CORAL, font: FONT
        });
      }
      if (showNegH) {
        var hLabelY = interceptY + ((interceptY < Lmap.y(0)) ? 12 : -12);
        creamText(ctx, '-H', interceptX + 10, hLabelY, width, height, { color: ROSE, font: FONT });
      }
      frameBox(ctx, right);

      ctx.save();
      clipBox(ctx, right);
      ctx.strokeStyle = TEAL;
      ctx.lineWidth = 2.4;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      started = false;
      for (var k = 0; k < pts.length; k++) {
        var hx = Hmap.x(pts[k].p);
        var hy = Hmap.y(pts[k].H);
        if (!isFinite(hx) || !isFinite(hy)) continue;
        if (!started) { ctx.moveTo(hx, hy); started = true; }
        else ctx.lineTo(hx, hy);
      }
      ctx.stroke();
      var dualX = Hmap.x(curP);
      var dualY = Hmap.y(curH);
      disk(ctx, dualX, dualY, 5.5, TEAL);
      ctx.restore();

      drawPlotAxes(ctx, right, Hmap.x(0), Hmap.y(0), 'p', 'H', width, height);

      if (inBox(right, dualX, dualY, 16) && dualY > right.y0 + 22) {
        creamText(ctx, 'H', dualX + 10, dualY - 10, width, height, { color: TEAL, font: FONT });
      }

      var modelLabel = 'Classical $L = \\frac{1}{2}m\\dot{q}^2$';
      if (model === 'relativistic') modelLabel = 'Relativistic $L = -mc^2\\sqrt{1-\\dot{q}^2/c^2}$';
      if (model === 'quartic') modelLabel = 'Nonlinear $L = \\frac{1}{4}\\alpha\\dot{q}^4$';

      var legendRows31 = [
        { label: 'model', value: modelLabel },
        { label: '$\\dot{q}$', value: mathNum(curV) },
        { label: '$L$', value: mathNum(curL) },
        { label: '$p = \\partial L/\\partial\\dot{q}$', value: mathNum(curP) },
        { label: '$H = p\\dot{q}-L$', value: mathNum(curH) },
        { label: '$p\\dot{q}$', value: mathNum(curP * curV) },
        { label: '$L+H$', value: mathNum(curL + curH) },
        { label: 'intercept', value: '$y=-H=' + fmt(-curH) + '$' }
      ];
      if (model === 'relativistic') {
        legendRows31.push({ label: '$\\sqrt{p^2 c^2 + m^2 c^4}$', value: mathNum(Hdisp) });
      }
      vizLegend('Legendre transform  $H = p\\dot{q} - L$', legendRows31);
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
A widespread GRE misconception is that the Hamiltonian is *always* total energy ($E = T + U$) and *always* conserved ($dH/dt = 0$). In reality, these are two completely independent properties:

1. **$H = E$** requires that the coordinate transformation $\\mathbf{r}_i = \\mathbf{r}_i(q)$ does not explicitly depend on time ($t$), so kinetic energy is purely homogeneous quadratic in velocities: $T = T_2$.
2. **$dH/dt = 0$ (Conservation of $H$)** requires that the Lagrangian has no explicit time dependence ($\\partial L/\\partial t = 0$).

For a bead on a rotating wire with constant angular speed $\\omega$, the transformation $\\mathbf{r}(t)$ depends on time, giving $H = T_2 - T_0 + U \\neq E$. Here $H$ (Jacobi's integral) is strictly conserved, while total energy $E$ fluctuates because the motor does work!
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
      { condition: 'Uniformly Rotating System ($\\omega = \\text{const}$)', result: '$H = T_2 - T_0 + U = E - m\\omega^2 r^2$', description: '$H$ is conserved ($dH/dt = 0$) while total energy $E$ is not conserved.' },
      { condition: 'Time-Varying Potential $U(q, t)$', result: 'H = E \\quad (dH/dt = \\partial U/\\partial t \\neq 0)', description: '$H$ equals total energy, but energy is not conserved.' }
    ],
    greTraps: [
      { trap: 'Assuming H = E Always', warning: 'In moving reference frames (rotating turntables, moving ramps), $H = T_2 - T_0 + U \\neq T + U$.' },
      { trap: 'Confusing Energy Conservation with H Conservation', warning: 'A system can have conserved $H$ even when mechanical energy $E$ changes due to external constraint forces doing work.' }
    ],
    parameters: [
      { id: 'omega', label: 'Rotation speed $\\omega$', type: 'range', min: 0, max: 4.5, step: 0.1, value: 2.5, default: 2.5, unit: 'rad/s', format: v => `${v.toFixed(1)} rad/s` },
      { id: 'k', label: 'Spring constant $k$', type: 'range', min: 2, max: 20, step: 0.5, value: 10.0, default: 10.0, unit: 'N/m', format: v => `${v.toFixed(1)} N/m` },
      { id: 'simSpeed', label: 'Simulation Speed', min: 0.2, max: 3.0, step: 0.2, value: 1.0, default: 1.0, unit: 'x' },
      { id: 'perturb', label: 'Perturb bead', type: 'boolean', default: false }
    ],
    init(container, state, redraw) {
      state.omega = (typeof state.omega === 'number' && isFinite(state.omega)) ? state.omega : 2.5;
      state.k = (typeof state.k === 'number' && isFinite(state.k)) ? state.k : 10.0;
      state.simSpeed = simSpeedOf(state);
      if (typeof state.r !== 'number' || !isFinite(state.r)) state.r = 0.8;
      if (typeof state.rDot !== 'number' || !isFinite(state.rDot)) state.rDot = 0;
      if (typeof state.phi !== 'number' || !isFinite(state.phi)) state.phi = 0;
      if (typeof state.t !== 'number' || !isFinite(state.t)) state.t = 0;
      if (!Array.isArray(state.history)) state.history = [];
    },
    onParamChange: function (id, val, state) {
      if (!state) return;
      if (id === 'omega' || id === 'k') {
        state.history = [];
        state.t = 0;
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
      if (typeof state.t !== 'number' || !isFinite(state.t)) state.t = 0;
      if (!Array.isArray(state.history)) state.history = [];
      if (state._histOmega !== omega || state._histK !== kSpr) {
        state.history = [];
        state.t = 0;
        state._histOmega = omega;
        state._histK = kSpr;
      }

      var R_WALL = 1.6;
      var alphaR = omega * omega - kSpr / m;
      var subSteps = 8;
      var subDt = dt / subSteps;
      for (var s = 0; s < subSteps; s++) {
        var Hkeep = radialJacobiH(m, state.r, state.rDot, omega, kSpr);
        var nxt = stepRadialExact(state.r, state.rDot, alphaR, subDt);
        if (Math.abs(nxt.r) > R_WALL) {
          var rWall = (nxt.r >= 0 ? 1 : -1) * R_WALL;
          state.r = rWall;
          var Vwall = 0.5 * (kSpr - m * omega * omega) * rWall * rWall;
          var rDotSq = (2 / m) * (Hkeep - Vwall);
          var bounceSgn = nxt.rDot >= 0 ? -1 : 1;
          state.rDot = bounceSgn * Math.sqrt(Math.max(0, rDotSq));
          state._wallHit = true;
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
      state.t += dt;

      var T2 = 0.5 * m * state.rDot * state.rDot;
      var T0 = 0.5 * m * state.r * state.r * omega * omega;
      var Uval = 0.5 * kSpr * state.r * state.r;
      var E_total = T2 + T0 + Uval;
      var H_val = T2 - T0 + Uval;

      state.history.push({ t: state.t, E: E_total, H: H_val });
      if (state.history.length > 200) state.history.shift();

      var splitX = Math.floor(width * 0.50);
      var left = boxOf(8, 8, splitX - 8, height - 8);
      var right = boxOf(splitX + 12, 16, width - 16, height - 16);
      divider(ctx, splitX, 12, height - 12);

      var cx = (left.x0 + left.x1) / 2;
      var cy = (left.y0 + left.y1) / 2;
      var rodLen = Math.min(left.w, left.h) * 0.42;
      var scale = rodLen / 1.7;

      ctx.save();
      clipBox(ctx, left);

      var cphi = Math.cos(state.phi);
      var sphi = Math.sin(state.phi);
      var rx1 = cx - cphi * rodLen;
      var ry1 = cy - sphi * rodLen;
      var rx2 = cx + cphi * rodLen;
      var ry2 = cy + sphi * rodLen;

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
        for (var i = 0; i <= nCoils; i++) {
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

      // Rotation cue: small ω arc at the hub so the left pane is a rotating rod.
      ctx.save();
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
      ctx.restore();
      ctx.restore();

      frameBox(ctx, right);
      var eVals = [E_total, H_val, 0];
      for (var hi = 0; hi < state.history.length; hi++) {
        eVals.push(state.history[hi].E);
        eVals.push(state.history[hi].H);
      }
      var eRange = niceRange(eVals, 0.12);
      // Keep 0 in view so conserved-H vs fluctuating-E is readable
      if (eRange.lo > -0.4) eRange.lo = Math.min(eRange.lo, -0.4);
      if (eRange.hi < 0.4) eRange.hi = Math.max(eRange.hi, 0.4);
      var tSpan = Math.max(200, state.history.length);
      var Emap = mapper(right, 0, tSpan, eRange.lo, eRange.hi);

      ctx.save();
      clipBox(ctx, right);
      ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.18);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(right.x0 + 4, Emap.y(0));
      ctx.lineTo(right.x1 - 4, Emap.y(0));
      ctx.stroke();

      if (state.history.length > 1) {
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        for (var ei = 0; ei < state.history.length; ei++) {
          var ex = Emap.x(ei);
          var ey = Emap.y(state.history[ei].E);
          if (ei === 0) ctx.moveTo(ex, ey);
          else ctx.lineTo(ex, ey);
        }
        ctx.stroke();

        ctx.strokeStyle = TEAL;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        for (var hj = 0; hj < state.history.length; hj++) {
          var hx2 = Emap.x(hj);
          var hy2 = Emap.y(state.history[hj].H);
          if (hj === 0) ctx.moveTo(hx2, hy2);
          else ctx.lineTo(hx2, hy2);
        }
        ctx.stroke();
      }
      ctx.restore();

      var tY = Emap.y(0);
      if (!inBox(right, right.x1 - 8, tY, 2)) tY = right.y1 - 4;
      creamText(ctx, 't', right.x1 - 6, tY - 3, width, height, {
        align: 'right', baseline: 'bottom', color: MUTED, font: FONT_SM
      });

      if (state.history.length > 1) {
        var last = state.history[state.history.length - 1];
        var lastX = Math.min(right.x1 - 18, Emap.x(state.history.length - 1));
        var yE = Emap.y(last.E);
        var yHline = Emap.y(last.H);
        if (Math.abs(yE - yHline) < 14) {
          if (yE <= yHline) { yE -= 8; yHline += 8; }
          else { yE += 8; yHline -= 8; }
        }
        if (Math.abs(yE - tY) < 12) yE -= 10;
        if (Math.abs(yHline - tY) < 12) yHline += 10;
        creamText(ctx, 'E', lastX, yE, width, height, { align: 'right', color: GOLD, font: FONT });
        creamText(ctx, 'H', lastX, yHline, width, height, { align: 'right', color: TEAL, font: FONT });
      }

      var heq = Math.abs(T0) < 1e-4;
      vizLegend('$H = T_2 - T_0 + U$ vs $E = T + U$', [
        { label: '$E = T + U$', value: mathNum(E_total) },
        { label: '$H = T_2 - T_0 + U$', value: mathNum(H_val) },
        { label: '$T_2$', value: mathNum(T2) },
        { label: '$T_0$', value: mathNum(T0) },
        { label: '$U$', value: mathNum(Uval) },
        { label: '$r$', value: mathNum(state.r) },
        { label: '$H$ vs $E$', value: heq ? '$H = E$ ($T_0 = 0$)' : '$H \\neq E$ ($T_0 \\neq 0$)' },
        { label: 'conservation', value: '$\\partial L/\\partial t = 0 \\Rightarrow dH/dt = 0$' }
      ]);
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
Hamilton's equations replace $n$ second-order differential equations with $2n$ coupled first-order equations in phase space $(q, p)$. 

The characteristic minus sign in $\\dot{p} = -\\partial H/\\partial q$ represents symplectic skew-symmetry: trajectories flow along level curves of constant energy $H(q, p) = E$. By **Liouville's Theorem**, the phase space velocity field is divergence-free:
$$\\nabla_{(q, p)} \\cdot (\\dot{q}, \\dot{p}) = \\frac{\\partial}{\\partial q}\\left(\\frac{\\partial H}{\\partial p}\\right) + \\frac{\\partial}{\\partial p}\\left(-\\frac{\\partial H}{\\partial q}\\right) = 0$$
Any phase volume $\\iint dq \\, dp$ behaves like an incompressible fluid.
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
      { id: 'system', label: 'Phase System', type: 'select', value: 'pendulum', default: 'pendulum', options: [
        { value: 'sho', label: 'Harmonic Oscillator' },
        { value: 'pendulum', label: 'Nonlinear Pendulum (with Separatrix)' },
        { value: 'doublewell', label: 'Double Well Potential' }
      ]},
      { id: 'swarm', label: 'Liouville Swarm', type: 'toggle', value: true, default: true, onText: 'Swarm Active', offText: 'Single Particle' },
      { id: 'simSpeed', label: 'Simulation Speed', min: 0.2, max: 3.0, step: 0.2, value: 1.0, default: 1.0, unit: 'x' },
      { id: 'resetCloud', label: 'Reset cloud', type: 'boolean', default: false }
    ],
    init(container, state, redraw) {
      if (state.system !== 'sho' && state.system !== 'pendulum' && state.system !== 'doublewell') {
        state.system = 'pendulum';
      }
      state.swarm = state.swarm === false || state.swarm === 0 || state.swarm === 'false' ? false : true;
      state.simSpeed = simSpeedOf(state);
      var probe0 = defaultHamiltonProbe(state.system);
      if (typeof state.q !== 'number' || !isFinite(state.q)) state.q = probe0.q;
      if (typeof state.p !== 'number' || !isFinite(state.p)) state.p = probe0.p;
      if (!Array.isArray(state.trail)) state.trail = [];
      seedHamiltonSwarm(state);

    },
    onParamChange: function (id, val, state) {
      if (!state) return;
      if (id === 'system') {
        state.system = val;
        seedHamiltonSwarm(state);
        var probe = defaultHamiltonProbe(state.system);
        state.q = probe.q;
        state.p = probe.p;
        state.trail = [];
      }
      if (id === 'swarm' && val) seedHamiltonSwarm(state);
      if (id === 'resetCloud') seedHamiltonSwarm(state);
    },
    draw(ctx, width, height, state, dt) {
      creamStage(ctx, width, height);
      state = state || {};
      dt = scaledDt(dt, state);

      if (state.system !== 'sho' && state.system !== 'pendulum' && state.system !== 'doublewell') {
        state.system = 'pendulum';
      }
      var swarmOn = !(state.swarm === false || state.swarm === 0 || state.swarm === 'false');
      if (typeof state.q !== 'number' || !isFinite(state.q)) state.q = defaultHamiltonProbe(state.system).q;
      if (typeof state.p !== 'number' || !isFinite(state.p)) state.p = defaultHamiltonProbe(state.system).p;
      if (!Array.isArray(state.trail)) state.trail = [];
      if (!state.particles || state._swarmSystem !== state.system) seedHamiltonSwarm(state);

      var m = 1.0;
      var getDq = function (q, p) {
        return p / m;
      };
      var getDp = function (q, p) {
        if (state.system === 'sho') return -2.0 * q;
        if (state.system === 'pendulum') return -m * 3.0 * 1.0 * Math.sin(q);
        return -4 * 1.5 * q * (q * q - 1.0);
      };
      var getH = function (q, p) {
        var T = (p * p) / (2 * m);
        if (state.system === 'sho') return T + 0.5 * 2.0 * q * q;
        if (state.system === 'pendulum') return T + m * 3.0 * 1.0 * (1 - Math.cos(q));
        return T + 1.5 * Math.pow(q * q - 1.0, 2);
      };

      var stage = boxOf(16, 14, width - 16, height - 14);
      var qLo = -3.3;
      var qHi = 3.3;
      // Pendulum separatrix peaks at p = ±2√(m g l) = ±2√3 ≈ ±3.46.
      // Keep those peaks inside the frame so the eye through (±π, 0) is real,
      // not a clip-box polygon.
      var pLo = state.system === 'pendulum' ? -3.85 : -2.7;
      var pHi = state.system === 'pendulum' ? 3.85 : 2.7;
      var Pmap = mapper(stage, qLo, qHi, pLo, pHi);
      var cx = Pmap.x(0);
      var cy = Pmap.y(0);

      frameBox(ctx, stage);

      ctx.save();
      clipBox(ctx, stage);

      var stepQ = 0.55;
      var stepP = 0.55;
      for (var qg = qLo + 0.2; qg <= qHi - 0.2; qg += stepQ) {
        for (var pg = pLo + 0.2; pg <= pHi - 0.2; pg += stepP) {
          var dq = getDq(qg, pg);
          var dp = getDp(qg, pg);
          var len = Math.hypot(dq, dp);
          if (len < 0.12) continue;
          if (Math.hypot(qg, pg) < 0.42) continue;
          var sx = Pmap.x(qg);
          var sy = Pmap.y(pg);
          var angle = Math.atan2(-dp * (stage.h / (pHi - pLo)), dq * (stage.w / (qHi - qLo)));
          var arrowLen = Math.min(12, 3.5 + len * 2.8);
          var ex = sx + Math.cos(angle) * arrowLen;
          var ey = sy + Math.sin(angle) * arrowLen;
          if (U && typeof U.drawVector === 'function') {
            U.drawVector(ctx, sx, sy, ex, ey, 'rgba(204, 120, 92, 0.28)', 1);
          } else {
            ctx.strokeStyle = 'rgba(204, 120, 92, 0.28)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
            ctx.stroke();
          }
        }
      }

      if (state.system === 'pendulum') {
        // True separatrix: H = p²/(2m) + mgl(1−cos q) = 2 mgl
        // with mgl = 3 ⇒ p = ±2√3 cos(q/2) on q ∈ [−π, π], peaks at (0, ±2√3).
        var pSepAmp = 2 * Math.sqrt(3.0);
        ctx.strokeStyle = ROSE;
        ctx.globalAlpha = 0.78;
        ctx.lineWidth = 1.6;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        var sepStart = false;
        for (var qs = -Math.PI; qs <= Math.PI; qs += 0.02) {
          var pSep = pSepAmp * Math.cos(qs * 0.5);
          var sxx = Pmap.x(qs);
          var sy1 = Pmap.y(pSep);
          if (!sepStart) { ctx.moveTo(sxx, sy1); sepStart = true; }
          else ctx.lineTo(sxx, sy1);
        }
        ctx.stroke();
        ctx.beginPath();
        sepStart = false;
        for (var qs2 = -Math.PI; qs2 <= Math.PI; qs2 += 0.02) {
          var pSep2 = -pSepAmp * Math.cos(qs2 * 0.5);
          var sx2 = Pmap.x(qs2);
          var sy2 = Pmap.y(pSep2);
          if (!sepStart) { ctx.moveTo(sx2, sy2); sepStart = true; }
          else ctx.lineTo(sx2, sy2);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }

      var subSteps = 6;
      var subDt = dt / subSteps;

      var stepHamilton = function (pt, h) {
        // Symplectic Euler: p then q so Liouville area is not eaten by explicit Euler.
        pt.p += getDp(pt.q, pt.p) * h;
        pt.q += getDq(pt.q, pt.p) * h;
        if (state.system === 'pendulum') {
          while (pt.q > Math.PI) pt.q -= 2 * Math.PI;
          while (pt.q < -Math.PI) pt.q += 2 * Math.PI;
        }
      };

      if (swarmOn && state.particles) {
        ctx.fillStyle = 'rgba(212, 160, 23, 0.72)';
        for (var pi = 0; pi < state.particles.length; pi++) {
          var pt = state.particles[pi];
          for (var ss = 0; ss < subSteps; ss++) {
            stepHamilton(pt, subDt);
          }
          if (!isFinite(pt.q) || !isFinite(pt.p)) continue;
          var psx = Pmap.x(pt.q);
          var psy = Pmap.y(pt.p);
          if (!inBox(stage, psx, psy, 1)) continue;
          ctx.beginPath();
          ctx.arc(psx, psy, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      for (var sp = 0; sp < subSteps; sp++) {
        stepHamilton(state, subDt);
      }
      if (!isFinite(state.q) || !isFinite(state.p)) {
        var reset = defaultHamiltonProbe(state.system);
        state.q = reset.q;
        state.p = reset.p;
        state.trail = [];
      }
      state.trail.push({ q: state.q, p: state.p });
      if (state.trail.length > 220) state.trail.shift();

      ctx.strokeStyle = CORAL;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      var trailOn = false;
      for (var ti = 0; ti < state.trail.length; ti++) {
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

      disk(ctx, Pmap.x(state.q), Pmap.y(state.p), 6, CORAL);
      ctx.restore();

      drawPlotAxes(ctx, stage, cx, cy, 'q', 'p', width, height);

      var sysLabel = 'Nonlinear pendulum';
      if (state.system === 'sho') sysLabel = 'Harmonic oscillator';
      if (state.system === 'doublewell') sysLabel = 'Double well';
      var qdotNow = getDq(state.q, state.p);
      var pdotNow = getDp(state.q, state.p);
      var legendRows = [
        { label: 'system', value: sysLabel },
        { label: '$q$', value: mathNum(state.q) },
        { label: '$p$', value: mathNum(state.p) },
        { label: '$\\dot{q} = \\partial H/\\partial p$', value: mathNum(qdotNow) },
        { label: '$\\dot{p} = -\\partial H/\\partial q$', value: mathNum(pdotNow) },
        { label: '$H$', value: mathNum(getH(state.q, state.p)) },
        { label: 'Liouville', value: '$\\nabla\\cdot(\\dot{q},\\dot{p}) = 0$' }
      ];
      if (state.system === 'pendulum') {
        legendRows.push({ label: 'dashed', value: 'separatrix $E = 2mgl$' });
      }
      vizLegend("Hamilton's equations  (phase flow)", legendRows);
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
