/* Formula visualizers — G8 Delta U / E=-grad V / Poisson / E-par / E-perp / toroid B / Bn / mutual M12 */
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
  var clamp = H.clamp || function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var formatSci = H.formatSci;
  var getPotentialColor = H.getPotentialColor;
  var initCard1Charges = H.initCard1Charges;
  var drawMarchingContours = H.drawMarchingContours;
  var initAtomLattice = H.initAtomLattice;
  var EPSILON_0 = H.EPSILON_0;
  var K_COULOMB = H.K_COULOMB;

  var INK = '#141413';
  var CORAL = '#cc785c';
  var GOLD = '#d4a017';
  var TEAL = '#5db8a6';
  var CREAM = (CV && CV.colors && CV.colors.bg) ? CV.colors.bg : '#faf9f5';
  var MUTED = '#6c6a64';
  var PANEL = '#f5f0e8';
  var LINE = '#e6dfd8';
  var FONT = '12px Inter, -apple-system, sans-serif';
  var FONT_SM = '11px Inter, -apple-system, sans-serif';

  function theme() {
    return PGRE.vizStageTheme ? PGRE.vizStageTheme() : null;
  }

  function syncStageTheme() {
    var t = theme();
    if (!t) return;
    INK = t.ink; MUTED = t.muted; CREAM = t.bg; PANEL = t.panel; LINE = t.line;
  }

  function fillCream(ctx, width, height) {
    syncStageTheme();
    ctx.fillStyle = CREAM;
    ctx.fillRect(0, 0, width, height);
  }

  function faintGrid(ctx, width, height) {
    var t = theme();
    ctx.save();
    ctx.strokeStyle = (CV && CV.colors && CV.colors.grid) || (t && t.grid) || 'rgba(20,20,19,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    var step = 40;
    var x, y;
    for (x = 0; x <= width; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
    for (y = 0; y <= height; y += step) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
    ctx.stroke();
    ctx.restore();
  }

  function appendLegend(title, rows) {
    if (PGRE.appendVizLegend) PGRE.appendVizLegend(title, rows);
  }

  function simSpeedOf(state) {
    var s = Number(state && state.simSpeed);
    if (!isFinite(s)) s = 1.0;
    if (s < 0.2) s = 0.2;
    if (s > 3) s = 3;
    return s;
  }

  function scaledDt(dt, state) {
    var d = Number(dt);
    if (!isFinite(d) || d < 0) d = 0;
    if (d > 0.05) d = 0.05;
    return d * simSpeedOf(state);
  }

  function money(v, d) {
    if (d == null) d = 2;
    if (typeof v !== 'number' || !isFinite(v)) return '--';
    return '$' + v.toFixed(d) + '$';
  }

  function chip() {
    var t = theme();
    return (t && t.chipFade) ? t.chipFade(0.92) : 'rgba(250,249,245,0.92)';
  }

  function inkFade(a) {
    var t = theme();
    return (t && t.inkFade) ? t.inkFade(a) : ('rgba(20,20,19,' + a + ')');
  }

  function inkLabel(ctx, text, x, y, opts) {
    opts = opts || {};
    var color = opts.color || INK;
    var align = opts.align || 'left';
    var font = opts.font || FONT_SM;
    var canvasW = opts.width != null ? opts.width : 640;
    var canvasH = opts.height != null ? opts.height : 420;
    ctx.save();
    ctx.font = font;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    var tw = ctx.measureText(text).width;
    var th = 14;
    var pad = 4;
    var bx = x;
    if (align === 'center') bx = x - tw / 2;
    else if (align === 'right') bx = x - tw;
    bx = Math.max(6, Math.min(bx, canvasW - tw - 6));
    var by = Math.max(8, Math.min(y, canvasH - 8));
    var tx = bx;
    if (align === 'center') tx = bx + tw / 2;
    else if (align === 'right') tx = bx + tw;
    ctx.fillStyle = chip();
    ctx.fillRect(bx - pad, by - th / 2 - 2, tw + pad * 2, th + 4);
    ctx.fillStyle = color;
    ctx.fillText(text, tx, by);
    ctx.restore();
  }

  function drawSiteArrow(ctx, x1, y1, x2, y2, color, width) {
    width = width || 2;
    var dx = x2 - x1;
    var dy = y2 - y1;
    var len = Math.hypot(dx, dy);
    if (len < 1) return;
    var angle = Math.atan2(dy, dx);
    var head = Math.min(8, len * 0.35);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(angle - Math.PI / 6), y2 - head * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - head * Math.cos(angle + Math.PI / 6), y2 - head * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawDot(ctx, x, y, r, fill, ring) {
    ctx.save();
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    if (ring) {
      ctx.strokeStyle = ring;
      ctx.lineWidth = 1.3;
      ctx.stroke();
    }
    ctx.restore();
  }

  function clampArrowLen(sx, sy, nx, ny, want, margin, width, height) {
    var len = want;
    if (Math.abs(nx) > 1e-6) {
      var sxBound = nx > 0 ? (width - margin - sx) / nx : (margin - sx) / nx;
      if (sxBound > 0) len = Math.min(len, sxBound);
    }
    if (Math.abs(ny) > 1e-6) {
      var syBound = ny > 0 ? (height - margin - sy) / ny : (margin - sy) / ny;
      if (syBound > 0) len = Math.min(len, syBound);
    }
    return Math.max(12, len);
  }

  function samplePathPoints(pA, pB, pathType, n) {
    n = n || 80;
    var pts = [];
    var i, s, x, y;
    for (i = 0; i <= n; i++) {
      s = i / n;
      if (pathType === 'manhattan') {
        if (s <= 0.5) {
          var t = s * 2;
          x = pA.x + (pB.x - pA.x) * t;
          y = pA.y;
        } else {
          var u = (s - 0.5) * 2;
          x = pB.x;
          y = pA.y + (pB.y - pA.y) * u;
        }
      } else if (pathType === 'curved') {
        var dxp = pB.x - pA.x;
        var dyp = pB.y - pA.y;
        var plen = Math.hypot(dxp, dyp) || 1;
        var bump = 4 * 0.85 * s * (1 - s);
        x = pA.x + dxp * s + bump * (-dyp / plen);
        y = pA.y + dyp * s + bump * (dxp / plen);
      } else {
        x = pA.x + (pB.x - pA.x) * s;
        y = pA.y + (pB.y - pA.y) * s;
      }
      pts.push({ x: x, y: y });
    }
    return pts;
  }

  function lerpPt(x0, y0, x1, y1, v0, v1, L) {
    var d = v1 - v0;
    var t = Math.abs(d) < 1e-12 ? 0.5 : (L - v0) / d;
    if (t < 0) t = 0;
    if (t > 1) t = 1;
    return { x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t };
  }

  function drawLevelSets(ctx, getV, toNorm, width, height, levels, step) {
    step = step || 14;
    var cols = Math.floor((width - 1) / step);
    var rows = Math.floor((height - 1) / step);
    if (cols < 2 || rows < 2) return;
    var stride = cols + 1;
    var grid = new Array(stride * (rows + 1));
    var i, j;
    for (j = 0; j <= rows; j++) {
      for (i = 0; i <= cols; i++) {
        var nrm = toNorm(i * step, j * step);
        grid[j * stride + i] = getV(nrm.x, nrm.y);
      }
    }
    var li, L;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (li = 0; li < levels.length; li++) {
      L = levels[li];
      var zero = Math.abs(L) < 1e-8;
      ctx.strokeStyle = zero ? inkFade(0.36) : (L > 0 ? 'rgba(204,120,92,0.50)' : 'rgba(93,184,166,0.50)');
      ctx.lineWidth = zero ? 1.55 : 1.05;
      ctx.beginPath();
      for (j = 0; j < rows; j++) {
        for (i = 0; i < cols; i++) {
          var x0 = i * step, y0 = j * step, x1 = x0 + step, y1 = y0 + step;
          var v00 = grid[j * stride + i];
          var v10 = grid[j * stride + i + 1];
          var v11 = grid[(j + 1) * stride + i + 1];
          var v01 = grid[(j + 1) * stride + i];
          var m = 0;
          if (v00 >= L) m |= 1;
          if (v10 >= L) m |= 2;
          if (v11 >= L) m |= 4;
          if (v01 >= L) m |= 8;
          if (m === 0 || m === 15) continue;
          var bottom = lerpPt(x0, y0, x1, y0, v00, v10, L);
          var right = lerpPt(x1, y0, x1, y1, v10, v11, L);
          var top = lerpPt(x0, y1, x1, y1, v01, v11, L);
          var left = lerpPt(x0, y0, x0, y1, v00, v01, L);
          if (m === 1 || m === 14) { ctx.moveTo(left.x, left.y); ctx.lineTo(bottom.x, bottom.y); }
          else if (m === 2 || m === 13) { ctx.moveTo(bottom.x, bottom.y); ctx.lineTo(right.x, right.y); }
          else if (m === 3 || m === 12) { ctx.moveTo(left.x, left.y); ctx.lineTo(right.x, right.y); }
          else if (m === 4 || m === 11) { ctx.moveTo(right.x, right.y); ctx.lineTo(top.x, top.y); }
          else if (m === 6 || m === 9) { ctx.moveTo(bottom.x, bottom.y); ctx.lineTo(top.x, top.y); }
          else if (m === 7 || m === 8) { ctx.moveTo(left.x, left.y); ctx.lineTo(top.x, top.y); }
          else if (m === 5) {
            ctx.moveTo(left.x, left.y); ctx.lineTo(bottom.x, bottom.y);
            ctx.moveTo(right.x, right.y); ctx.lineTo(top.x, top.y);
          } else if (m === 10) {
            ctx.moveTo(bottom.x, bottom.y); ctx.lineTo(right.x, right.y);
            ctx.moveTo(left.x, left.y); ctx.lineTo(top.x, top.y);
          }
        }
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function rightAngleMark(ctx, x, y, ux, uy, vx, vy, size) {
    size = size || 8;
    ctx.save();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    ctx.moveTo(x + ux * size, y + uy * size);
    ctx.lineTo(x + ux * size + vx * size, y + uy * size + vy * size);
    ctx.lineTo(x + vx * size, y + vy * size);
    ctx.stroke();
    ctx.restore();
  }

  /* -------------------------------------------------------------------------- */
  /* cpgf-1.9: ΔU = −∫ F·dl                                                      */
  /* -------------------------------------------------------------------------- */
  PGRE.visualizers['cpgf-1.9'] = {
    id: 'cpgf-1.9',
    topic: 'cm',
    title: 'Potential Energy Difference: $\\Delta U = -\\int \\mathbf{F} \\cdot d\\mathbf{l}$',
    formulaLatex: '\\Delta U = U(b) - U(a) = -\\int_a^b \\mathbf{F} \\cdot d\\mathbf{l}',
    physicalStory: `
Potential energy difference is the negative of the work done by a conservative force:
$\\Delta U = U(b) - U(a) = -\\int_a^b \\mathbf{F}\\cdot d\\mathbf{l} = -W_{\\mathrm{field}}$.

The minus sign is the whole story. When $\\mathbf{F}$ does positive work, $U$ falls. Climbing against $\\mathbf{F}$ stores $U$. Because $\\nabla\\times\\mathbf{F}=0$, every path from $A$ to $B$ returns the same $\\Delta U$. GRE integrals therefore collapse onto axis-aligned (Manhattan) segments: $\\Delta U = -\\int F_x\\,dx - \\int F_y\\,dy$.
    `.trim(),
    derivationSteps: [
      "1. A force field is conservative if and only if $\\mathbf{F} = -\\nabla U$.",
      "2. Compute the line integral of force from $a$ to $b$: $\\int_a^b \\mathbf{F} \\cdot d\\mathbf{l} = -\\int_a^b \\nabla U \\cdot d\\mathbf{l}$.",
      "3. By the Gradient Theorem for line integrals: $\\int_a^b \\nabla U \\cdot d\\mathbf{l} = U(b) - U(a) = \\Delta U$.",
      "4. Therefore: $\\Delta U = U(b) - U(a) = -\\int_a^b \\mathbf{F} \\cdot d\\mathbf{l} = -W_{\\text{field}}$.",
      "5. GRE Integration Shortcut: Break diagonal 2D path $(x_a, y_a) \\to (x_b, y_b)$ into two axis-aligned segments: $\\Delta U = -\\int_{x_a}^{x_b} F_x(x, y_a) dx - \\int_{y_a}^{y_b} F_y(x_b, y) dy$."
    ],
    limitingCases: [
      { condition: 'Uniform Gravity ($\\mathbf{F} = -mg\\hat{\\mathbf{z}}$)', result: '\\Delta U = mg(z_b - z_a) = mg\\Delta z', description: 'Gravitational potential energy near Earth.' },
      { condition: 'Linear Hooke Spring ($\\mathbf{F} = -kx\\hat{\\mathbf{x}}$)', result: '\\Delta U = \\frac{1}{2}k(x_b^2 - x_a^2)', description: 'Elastic spring potential energy.' },
      { condition: 'Gravity (attractive $1/r^2$)', result: '\\Delta U = -GMm\\left(\\frac{1}{r_b} - \\frac{1}{r_a}\\right)', description: 'With $U(\\infty)=0$, $U(r)=-GMm/r$. Attractive; energy is negative.' },
      { condition: 'Coulomb (like charges)', result: '\\Delta U = +kQq\\left(\\frac{1}{r_b} - \\frac{1}{r_a}\\right)', description: 'Same-sign charges: $U(r)=+kQq/r$ (repulsive). Opposite signs recover the attractive $-k|Qq|/r$ form; that is not the Coulomb self-energy of like charges.' }
    ],
    greTraps: [
      { trap: 'Sign Confusion Between Internal vs External Work', warning: '$W_{\\text{field}} = -\\Delta U$, whereas external work against the field is $W_{\\text{ext}} = +\\Delta U$.' },
      { trap: 'Evaluating Along Complex Curved Paths', warning: 'Never parameterize a difficult curve when $\\nabla \\times \\mathbf{F} = 0$. Integrate along straight coordinate axes instead!' }
    ],
    parameters: [
      { id: 'landscape', label: 'Potential $U(x,y)$', type: 'select', value: 'gravity', default: 'gravity', options: [
        { value: 'gravity', label: 'Uniform gravity: $U = mgy$' },
        { value: 'harmonic', label: 'Harmonic bowl: $U = \\frac{1}{2}k(x^2+y^2)$' },
        { value: 'saddle', label: 'Saddle: $U = c(x^2 - y^2)$' }
      ], hint: 'Pick the conservative landscape $U(x,y)$. Gravity $U=mgy$, a harmonic bowl, or a saddle all have $\\nabla\\times\\mathbf{F}=0$, so $\\Delta U$ is path-independent.' },
      { id: 'pathType', label: 'Path $A\\to B$', type: 'select', value: 'manhattan', default: 'manhattan', options: [
        { value: 'direct', label: 'Straight line' },
        { value: 'manhattan', label: 'Manhattan (axis-aligned)' },
        { value: 'curved', label: 'Parabolic arc' }
      ], hint: 'Straight, Manhattan, or a parabolic arc from $A$ to $B$. Because $\\mathbf{F}=-\\nabla U$, every path returns the same $\\Delta U=-W_{\\mathrm{field}}$. GRE integrals collapse onto axis-aligned segments.' },
      { id: 'simSpeed', label: 'Simulation Speed', min: 0.2, max: 3.0, step: 0.2, default: 1.0, unit: 'x' }
    ],
    init: function (container, state) {
      state.landscape = state.landscape || 'gravity';
      state.pathType = state.pathType || 'manhattan';
      state.pA = { x: -1.55, y: -1.05 };
      state.pB = { x: 1.55, y: 1.05 };
      state.t = state.t || 0;
      if (state.simSpeed == null || isNaN(state.simSpeed)) state.simSpeed = 1.0;
    },
    draw: function (ctx, width, height, state, dt) {
      state = state || {};
      var dtp = scaledDt(dt, state);
      state.landscape = state.landscape || 'gravity';
      state.pathType = state.pathType || 'manhattan';
      var pA = { x: -1.55, y: -1.05 };
      var pB = { x: 1.55, y: 1.05 };
      state.pA = pA;
      state.pB = pB;

      fillCream(ctx, width, height);
      faintGrid(ctx, width, height);

      var pad = 36;
      var scale = Math.min((width - 2 * pad) / 6.2, (height - 2 * pad) / 4.4);
      var cx = width / 2;
      var cy = height / 2 + 4;

      function toScreen(nx, ny) {
        return { x: cx + nx * scale, y: cy - ny * scale };
      }
      function toNorm(sx, sy) {
        return { x: (sx - cx) / scale, y: (cy - sy) / scale };
      }

      function getU(x, y) {
        if (state.landscape === 'harmonic') return 0.75 * (x * x + y * y);
        if (state.landscape === 'saddle') return 0.8 * (x * x - y * y);
        return 1.6 * y;
      }
      function getForce(x, y) {
        var eps = 0.002;
        var dux = (getU(x + eps, y) - getU(x - eps, y)) / (2 * eps);
        var duy = (getU(x, y + eps) - getU(x, y - eps)) / (2 * eps);
        return { fx: -dux, fy: -duy };
      }

      var levels = state.landscape === 'saddle'
        ? [-2.4, -1.6, -0.8, 0, 0.8, 1.6, 2.4]
        : (state.landscape === 'harmonic' ? [0.4, 1.0, 1.8, 2.8, 4.0] : [-2.4, -1.6, -0.8, 0, 0.8, 1.6, 2.4]);
      drawLevelSets(ctx, getU, toNorm, width, height, levels, 12);

      var pathNames = ['direct', 'manhattan', 'curved'];
      var pi, pj;
      for (pi = 0; pi < pathNames.length; pi++) {
        if (pathNames[pi] === state.pathType) continue;
        var ghost = samplePathPoints(pA, pB, pathNames[pi], 48);
        ctx.save();
        ctx.strokeStyle = inkFade(0.16);
        ctx.lineWidth = 1.4;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        for (pj = 0; pj < ghost.length; pj++) {
          var gs = toScreen(ghost[pj].x, ghost[pj].y);
          if (pj === 0) ctx.moveTo(gs.x, gs.y);
          else ctx.lineTo(gs.x, gs.y);
        }
        ctx.stroke();
        ctx.restore();
      }

      var pts = samplePathPoints(pA, pB, state.pathType, 96);
      var Wfull = 0;
      for (pi = 1; pi < pts.length; pi++) {
        var mx = 0.5 * (pts[pi].x + pts[pi - 1].x);
        var my = 0.5 * (pts[pi].y + pts[pi - 1].y);
        var ff = getForce(mx, my);
        var dWx = ff.fx * (pts[pi].x - pts[pi - 1].x) + ff.fy * (pts[pi].y - pts[pi - 1].y);
        Wfull += dWx;
        var s0 = toScreen(pts[pi - 1].x, pts[pi - 1].y);
        var s1 = toScreen(pts[pi].x, pts[pi].y);
        ctx.save();
        ctx.strokeStyle = dWx >= 0 ? 'rgba(93,184,166,0.95)' : 'rgba(204,120,92,0.95)';
        ctx.lineWidth = 2.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(s0.x, s0.y);
        ctx.lineTo(s1.x, s1.y);
        ctx.stroke();
        ctx.restore();
      }

      if (state.pathType === 'manhattan') {
        var corner = toScreen(pB.x, pA.y);
        ctx.save();
        ctx.strokeStyle = TEAL;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(corner.x - 9, corner.y);
        ctx.lineTo(corner.x, corner.y);
        ctx.lineTo(corner.x, corner.y + (pB.y > pA.y ? -9 : 9));
        ctx.stroke();
        ctx.restore();
      }

      var uA = getU(pA.x, pA.y);
      var uB = getU(pB.x, pB.y);
      var deltaU = uB - uA;

      state.t = (state.t || 0) + dtp * 0.22;
      if (state.t > 1) state.t -= 1;
      var beadIdx = Math.min(pts.length - 1, Math.max(0, Math.round(state.t * (pts.length - 1))));
      var bead = pts[beadIdx];
      var sBead = toScreen(bead.x, bead.y);
      var Wrun = 0;
      for (pi = 1; pi <= beadIdx; pi++) {
        var mx2 = 0.5 * (pts[pi].x + pts[pi - 1].x);
        var my2 = 0.5 * (pts[pi].y + pts[pi - 1].y);
        var ff2 = getForce(mx2, my2);
        Wrun += ff2.fx * (pts[pi].x - pts[pi - 1].x) + ff2.fy * (pts[pi].y - pts[pi - 1].y);
      }
      var fBead = getForce(bead.x, bead.y);
      var fBeadLen = Math.hypot(fBead.fx, fBead.fy);
      if (fBeadLen > 0.04) {
        var nx = fBead.fx / fBeadLen;
        var ny = -(fBead.fy / fBeadLen);
        var fArrow = clampArrowLen(sBead.x, sBead.y, nx, ny, 30, 16, width, height);
        drawSiteArrow(ctx, sBead.x, sBead.y, sBead.x + nx * fArrow, sBead.y + ny * fArrow, TEAL, 2.2);
        inkLabel(ctx, 'F', sBead.x + nx * (fArrow + 10), sBead.y + ny * (fArrow + 10), {
          color: TEAL, align: 'center', width: width, height: height, font: '600 11px Inter, sans-serif'
        });
      }

      var sA = toScreen(pA.x, pA.y);
      var sB = toScreen(pB.x, pB.y);
      drawDot(ctx, sBead.x, sBead.y, 5, GOLD, INK);
      drawDot(ctx, sA.x, sA.y, 7, CORAL, INK);
      drawDot(ctx, sB.x, sB.y, 7, GOLD, INK);
      inkLabel(ctx, 'A', sA.x, sA.y + 16, { color: CORAL, align: 'center', width: width, height: height, font: '600 12px Inter, sans-serif' });
      inkLabel(ctx, 'B', sB.x, sB.y - 16, { color: GOLD, align: 'center', width: width, height: height, font: '600 12px Inter, sans-serif' });

      var landName = state.landscape === 'harmonic' ? 'harmonic bowl' : (state.landscape === 'saddle' ? 'saddle' : 'uniform gravity');
      var pathName = state.pathType === 'manhattan' ? 'Manhattan' : (state.pathType === 'curved' ? 'arc' : 'straight');
      appendLegend('$\\Delta U = -\\int \\mathbf{F}\\cdot d\\mathbf{l}$', [
        { label: 'Landscape', value: landName, hint: 'The conservative $U$ being traversed. Changing the landscape changes $U(A)$ and $U(B)$, hence $\\Delta U$, but never the identity $\\Delta U+W_{\\mathrm{field}}=0$.' },
        { label: 'Path', value: pathName, hint: 'The live $A\\to B$ curve (ghosts show the other two). Teal segments have $\\mathbf{F}\\cdot d\\mathbf{l}>0$ (the field does work, $U$ falls); coral is the reverse.' },
        { label: '$U(A)$', value: money(uA), hint: 'Potential energy at the coral start $A$. Only differences $U(B)-U(A)$ are physical; the integral never needs a curved parameterization.' },
        { label: '$U(B)$', value: money(uB), hint: 'Potential energy at the gold end $B$. $\\Delta U=U(B)-U(A)$ depends only on these two values.' },
        { label: '$\\Delta U$', value: money(deltaU), hint: 'Live $U(B)-U(A)=' + money(deltaU) + '$. Equals $-\\int_A^B\\mathbf{F}\\cdot d\\mathbf{l}$ on every path because $\\nabla\\times\\mathbf{F}=0$.' },
        { label: '$W_{\\mathrm{field}}(A\\to B)$', value: money(Wfull), hint: 'Work by the field along the live path, $W=\\int\\mathbf{F}\\cdot d\\mathbf{l}=' + money(Wfull) + '$. Check: $\\Delta U+W=0$.' },
        { label: '$W(s)$ running', value: money(Wrun), hint: 'Partial work from $A$ to the gold bead. It accumulates toward $W_{\\mathrm{field}}$ as the bead completes $A\\to B$.' },
        { label: 'Check', value: '$\\Delta U + W = 0$ on every path', hint: 'The conservative-force identity. If a GRE stem gives a path-dependent $\\Delta U$, the field is not $\\mathbf{F}=-\\nabla U$.' }
      ]);

      var spots19 = [
        { id: 'bead', kind: 'circle', x: sBead.x, y: sBead.y, r: 10, title: 'Running probe', body: 'Partial work so far $W(s)=' + money(Wrun) + '$ at $U=' + money(getU(bead.x, bead.y)) + '$. The bead traces the live path; $W$ must finish at $-\\Delta U$.' },
        { id: 'A', kind: 'circle', x: sA.x, y: sA.y, r: 12, title: 'Start $A$', body: '$U(A)=' + money(uA) + '$. The line integral begins here; only the endpoints matter for a conservative $\\mathbf{F}$.' },
        { id: 'B', kind: 'circle', x: sB.x, y: sB.y, r: 12, title: 'End $B$', body: '$U(B)=' + money(uB) + '$, so $\\Delta U=' + money(deltaU) + '$. Climbing against $\\mathbf{F}$ stores $U$; riding with $\\mathbf{F}$ spends it.' }
      ];
      if (fBeadLen > 0.04) {
        spots19.push({ id: 'F', kind: 'segment', x1: sBead.x, y1: sBead.y, x2: sBead.x + nx * fArrow, y2: sBead.y + ny * fArrow, halfW: 8, title: 'Force $\\mathbf{F}=-\\nabla U$', body: '$\\mathbf{F}$ points downhill on $U$ with $|\\mathbf{F}|=' + money(fBeadLen) + '$. Teal $W$ when $\\mathbf{F}\\cdot d\\mathbf{l}>0$.' });
      }
      if (state.pathType === 'manhattan') {
        var cnr = toScreen(pB.x, pA.y);
        spots19.push({ id: 'pathH', kind: 'segment', x1: sA.x, y1: sA.y, x2: cnr.x, y2: cnr.y, halfW: 8, title: 'Manhattan $x$-leg', body: 'Axis-aligned first: $\\int F_x\\,dx$ at fixed $y_A$. GRE shortcut for $\\nabla\\times\\mathbf{F}=0$.' });
        spots19.push({ id: 'pathV', kind: 'segment', x1: cnr.x, y1: cnr.y, x2: sB.x, y2: sB.y, halfW: 8, title: 'Manhattan $y$-leg', body: 'Then $\\int F_y\\,dy$ at fixed $x_B$. Sum of the two legs equals $\\Delta U$ on the diagonal as well.' });
      } else {
        spots19.push({ id: 'path', kind: 'segment', x1: sA.x, y1: sA.y, x2: sB.x, y2: sB.y, halfW: 10, title: 'Path $A\\to B$', body: 'Live path (' + pathName + '). $W_{\\mathrm{field}}=' + money(Wfull) + '$ matches $-\\Delta U$ even on the arc; never parameterize a hard curve when the field is conservative.' });
      }
      spots19.push({ id: 'landscape', kind: 'rect', x: 0, y: 0, w: width, h: height, title: 'Potential landscape $U(x,y)$', body: 'Level sets of $U$ (' + landName + '). Packed contours mean steep $|\\mathbf{F}|=|\\nabla U|$. Coral $U>0$, teal $U<0$, ink $U=0$.' });
      PGRE.setVizHotspots(spots19);
    },
    challenge: {
      question: "A 2D conservative force field is given by $\\mathbf{F} = (2xy^3 + 3)\\,\\hat{\\mathbf{i}} + (3x^2 y^2 - 4y)\\,\\hat{\\mathbf{j}}$. What is the potential energy function $U(x, y)$ assuming reference $U(0,0) = 0$?",
      options: [
        "A) $U(x, y) = -(x^2 y^3 + 3x - 2y^2)$",
        "B) $U(x, y) = x^2 y^3 + 3x - 2y^2$",
        "C) $U(x, y) = -(2x^2 y^3 + 3x - 4y^2)$",
        "D) $U(x, y) = -(x^2 y^3 + 3x + 2y^2)$",
        "E) Potential energy cannot be defined because the field has non-zero curl."
      ],
      correct: 0,
      explanation: "Using $\\mathbf{F} = -\\nabla U$: $-\\partial U/\\partial x = 2xy^3 + 3 \\Rightarrow U(x,y) = -(x^2 y^3 + 3x) + g(y)$. Differentiating with respect to $y$ gives $-\\partial U/\\partial y = 3x^2 y^2 - g'(y) = 3x^2 y^2 - 4y \\Rightarrow g'(y) = 4y \\Rightarrow g(y) = 2y^2 + C$. Setting $U(0,0) = 0$ yields $C = 0$, so $U(x,y) = -(x^2 y^3 + 3x - 2y^2)$."
    }
  };

  /* -------------------------------------------------------------------------- */
  /* cpgf-2.4: E = −∇V                                                           */
  /* -------------------------------------------------------------------------- */
  PGRE.visualizers['cpgf-2.4'] = {
    id: 'cpgf-2.4',
    topic: 'em',
    title: 'Electric Field from Potential Gradient: $\\mathbf{E} = -\\nabla V$',
    formulaLatex: '\\mathbf{E} = -\\nabla V',
    physicalStory: `
Electrostatics is conservative: $\\oint\\mathbf{E}\\cdot d\\mathbf{l}=0$ and $\\nabla\\times\\mathbf{E}=0$, so $\\mathbf{E}=-\\nabla V$. Field lines run downhill on $V$ and meet every equipotential at a right angle. Contour spacing is the field strength: packed lines mean a steep cliff and large $|\\mathbf{E}|$.

A GRE classic: midway between $+Q$ and $+Q$, $\\mathbf{E}=0$ but $V\\neq 0$. Midway between $+Q$ and $-Q$, $V=0$ but $\\mathbf{E}\\neq 0$. Slope, not height.
    `.trim(),
    derivationSteps: [
      { step: 1, title: "Coulomb's Law and Conservative Work", latex: "W = -q\\int_{\\mathbf{a}}^{\\mathbf{b}} \\mathbf{E}\\cdot d\\mathbf{l}", description: "Work against the electrostatic field depends only on the endpoints." },
      { step: 2, title: "Definition of Scalar Potential", latex: "V(\\mathbf{r}) \\equiv -\\int_{\\mathcal{O}}^{\\mathbf{r}} \\mathbf{E}\\cdot d\\mathbf{l}", description: "Potential is potential energy per unit charge, with a chosen reference (often infinity)." },
      { step: 3, title: "Fundamental Theorem of Gradients", latex: "V(\\mathbf{b}) - V(\\mathbf{a}) = \\int_{\\mathbf{a}}^{\\mathbf{b}} (\\nabla V)\\cdot d\\mathbf{l} = -\\int_{\\mathbf{a}}^{\\mathbf{b}} \\mathbf{E}\\cdot d\\mathbf{l}", description: "The integral of $(\\mathbf{E}+\\nabla V)$ along any path vanishes." },
      { step: 4, title: "Differential Vector Field Relation", latex: "\\mathbf{E} = -\\nabla V = -\\left(\\frac{\\partial V}{\\partial x}\\hat{\\mathbf{x}} + \\frac{\\partial V}{\\partial y}\\hat{\\mathbf{y}} + \\frac{\\partial V}{\\partial z}\\hat{\\mathbf{z}}\\right)", description: "Each component is the negative slope of $V$." },
      { step: 5, title: "Curvilinear Coordinate Representations", latex: "\\begin{aligned} \\text{Spherical: } & \\mathbf{E} = -\\left(\\frac{\\partial V}{\\partial r}\\hat{\\mathbf{r}} + \\frac{1}{r}\\frac{\\partial V}{\\partial \\theta}\\hat{\\boldsymbol{\\theta}} + \\frac{1}{r\\sin\\theta}\\frac{\\partial V}{\\partial \\phi}\\hat{\\boldsymbol{\\phi}}\\right) \\\\ \\text{Cylindrical: } & \\mathbf{E} = -\\left(\\frac{\\partial V}{\\partial s}\\hat{\\mathbf{s}} + \\frac{1}{s}\\frac{\\partial V}{\\partial \\phi}\\hat{\\boldsymbol{\\phi}} + \\frac{\\partial V}{\\partial z}\\hat{\\mathbf{z}}\\right) \\end{aligned}", description: "Scale factors enter the gradient in curvilinear coordinates." }
    ],
    limitingCases: [
      { name: "Uniform Electric Field (Parallel Plates)", condition: "V(x) = -E_0 x + C", formula: "\\mathbf{E} = E_0\\hat{\\mathbf{x}}", description: "Equipotentials are equally spaced planes; $\\mathbf{E}$ is uniform and normal to them." },
      { name: "Point Charge Coulomb Limit", condition: "V(r) = \\frac{q}{4\\pi\\epsilon_0 r}", formula: "\\mathbf{E} = \\frac{q}{4\\pi\\epsilon_0 r^2}\\hat{\\mathbf{r}}", description: "Equipotentials are concentric spheres; field lines are purely radial." },
      { name: "Electric Dipole (Far-Field)", condition: "r \\gg d, \\quad V(r, \\theta) \\approx \\frac{p\\cos\\theta}{4\\pi\\epsilon_0 r^2}", formula: "\\mathbf{E} = \\frac{p}{4\\pi\\epsilon_0 r^3}(2\\cos\\theta\\hat{\\mathbf{r}} + \\sin\\theta\\hat{\\boldsymbol{\\theta}})", description: "Dipole field falls as $1/r^3$." },
      { name: "Equipotential Conductor", condition: "V = \\text{const in and on a conductor}", formula: "\\mathbf{E}_{\\text{inside}} = 0, \\quad \\mathbf{E}_{\\text{surface}} = \\frac{\\sigma}{\\epsilon_0}\\hat{\\mathbf{n}}", description: "Surface fields are strictly normal to an equipotential conductor." }
    ],
    greTraps: [
      { trap: "Assuming $E = 0$ implies $V = 0$ (or $V = 0$ implies $E = 0$)", warning: "Midway between two equal $+Q$ charges, $\\mathbf{E}=0$ but $V\\neq 0$. Midway between $+Q$ and $-Q$, $V=0$ but $\\mathbf{E}\\neq 0$." },
      { trap: "Forgetting the Negative Sign in Vector Components", warning: "If $\\partial V/\\partial x > 0$, then $E_x = -\\partial V/\\partial x$ points toward $-x$ (downhill)." },
      { trap: "Equipotential Contour Spacing vs Field Magnitude", warning: "Packed contours mean steep $\\nabla V$ and large $|\\mathbf{E}|$. Field lines never cross." },
      { trap: "Gauge Invariance", warning: "$V\\to V+C$ leaves $\\mathbf{E}$ unchanged. Only differences $\\Delta V$ are physical." }
    ],
    parameters: [
      { id: 'preset', label: 'Charge configuration', type: 'select', default: 'dipole', options: [
        { value: 'dipole', label: 'Dipole $(+q,-q)$' },
        { value: 'point_pos', label: 'Point charge $+q$' },
        { value: 'like_charges', label: 'Like charges $(+q,+q)$' },
        { value: 'capacitor', label: 'Parallel plates' }
      ], hint: 'Dipole, a single $+q$, like charges, or parallel plates. Midway between $+q$ and $-q$, $V=0$ but $\\mathbf{E}\\neq 0$; midway between $+q$ and $+q$, $\\mathbf{E}=0$ but $V\\neq 0$.' },
      { id: 'chargeMag', label: 'Strength $q$ / $E_0$', min: 0.5, max: 2.5, step: 0.1, default: 1.0, hint: 'Sets $|q|$ or the plate field $E_0$. Larger $q$ packs the equipotentials and grows $|\\mathbf{E}|=|\\nabla V|$.' },
      { id: 'simSpeed', label: 'Simulation Speed', min: 0.2, max: 3.0, step: 0.2, default: 1.0, unit: 'x' }
    ],
    init: function (container, state) {
      state.preset = state.preset || 'dipole';
      if (state.chargeMag == null || isNaN(state.chargeMag)) state.chargeMag = 1.0;
      if (state.simSpeed == null || isNaN(state.simSpeed)) state.simSpeed = 1.0;
      state.t = state.t || 0;
      state.tracers = [];
    },
    draw: function (ctx, width, height, state, dt) {
      state = state || {};
      var dtp = scaledDt(dt, state);
      var preset = state.preset || 'dipole';
      var q = Number(state.chargeMag);
      if (!isFinite(q)) q = 1.0;
      state.t = (state.t || 0) + dtp;

      fillCream(ctx, width, height);

      var cx = width / 2;
      var cy = height / 2;
      var scale = Math.min(width, height) / 2.35;

      function toScreen(nx, ny) { return { x: cx + nx * scale, y: cy - ny * scale }; }
      function toNorm(sx, sy) { return { x: (sx - cx) / scale, y: (cy - sy) / scale }; }

      var charges = [];
      var plates = preset === 'capacitor';
      if (preset === 'dipole') {
        charges = [{ x: -0.42, y: 0, q: q }, { x: 0.42, y: 0, q: -q }];
      } else if (preset === 'like_charges') {
        charges = [{ x: -0.40, y: 0, q: q }, { x: 0.40, y: 0, q: q }];
      } else if (preset === 'point_pos') {
        charges = [{ x: 0, y: 0, q: q }];
      }

      var kV = 0.55;
      var plateE = 1.35 * q;
      var plateX = 0.46;

      function getV(nx, ny) {
        if (plates) {
          if (Math.abs(nx) > plateX + 0.02) return nx > 0 ? -plateE * plateX : plateE * plateX;
          return -plateE * nx;
        }
        var v = 0, i, c, dx, dy, r;
        for (i = 0; i < charges.length; i++) {
          c = charges[i];
          dx = nx - c.x; dy = ny - c.y;
          r = Math.sqrt(dx * dx + dy * dy + 0.012);
          v += kV * c.q / r;
        }
        return v;
      }
      function getE(nx, ny) {
        if (plates) {
          if (Math.abs(nx) > plateX) return { ex: 0, ey: 0, mag: 0 };
          return { ex: plateE, ey: 0, mag: plateE };
        }
        var ex = 0, ey = 0, i, c, dx, dy, r2, r, fac;
        for (i = 0; i < charges.length; i++) {
          c = charges[i];
          dx = nx - c.x; dy = ny - c.y;
          r2 = dx * dx + dy * dy + 0.012;
          r = Math.sqrt(r2);
          fac = kV * c.q / (r2 * r);
          ex += fac * dx;
          ey += fac * dy;
        }
        return { ex: ex, ey: ey, mag: Math.hypot(ex, ey) };
      }

      var levels;
      if (plates) {
        levels = [-1.2, -0.8, -0.4, 0, 0.4, 0.8, 1.2].map(function (s) { return s * plateE * plateX; });
      } else if (preset === 'like_charges') {
        levels = [0.4, 0.8, 1.2, 1.8, 2.6, 3.6].map(function (s) { return s * q; });
      } else if (preset === 'point_pos') {
        levels = [0.5, 0.9, 1.4, 2.1, 3.2].map(function (s) { return s * q; });
      } else {
        levels = [-2.4, -1.6, -1.0, -0.5, 0, 0.5, 1.0, 1.6, 2.4].map(function (s) { return s * q; });
      }
      drawLevelSets(ctx, getV, toNorm, width, height, levels, 10);

      if (plates) {
        var pL = toScreen(-plateX, 0);
        var pR = toScreen(plateX, 0);
        var y0 = toScreen(0, 0.78).y;
        var y1 = toScreen(0, -0.78).y;
        ctx.save();
        ctx.strokeStyle = CORAL;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(pL.x, y0); ctx.lineTo(pL.x, y1); ctx.stroke();
        ctx.strokeStyle = TEAL;
        ctx.beginPath(); ctx.moveTo(pR.x, y0); ctx.lineTo(pR.x, y1); ctx.stroke();
        ctx.restore();
        inkLabel(ctx, '+', pL.x, y0 - 10, { color: CORAL, align: 'center', width: width, height: height, font: '700 14px Inter, sans-serif' });
        inkLabel(ctx, '-', pR.x, y0 - 10, { color: TEAL, align: 'center', width: width, height: height, font: '700 14px Inter, sans-serif' });
      } else {
        var ci, cs;
        for (ci = 0; ci < charges.length; ci++) {
          cs = toScreen(charges[ci].x, charges[ci].y);
          drawDot(ctx, cs.x, cs.y, 11, charges[ci].q > 0 ? CORAL : TEAL, INK);
          ctx.save();
          ctx.fillStyle = INK;
          ctx.font = '700 13px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(charges[ci].q > 0 ? '+' : '-', cs.x, cs.y);
          ctx.restore();
        }
      }

      if (!state.tracers || state.tracers.length !== 10) {
        state.tracers = [];
        var ti;
        for (ti = 0; ti < 10; ti++) state.tracers.push({ x: 0, y: 0, age: 1 });
      }
      function spawnTracer(tr, i) {
        tr.age = 0;
        if (plates) {
          tr.x = -plateX + 0.04;
          tr.y = -0.65 + (i / 9) * 1.3;
        } else if (preset === 'dipole') {
          var ang = (i / 10) * Math.PI * 2;
          tr.x = charges[0].x + 0.14 * Math.cos(ang);
          tr.y = charges[0].y + 0.14 * Math.sin(ang);
        } else if (preset === 'like_charges') {
          var src = (i % 2 === 0) ? charges[0] : charges[1];
          var a2 = (i / 10) * Math.PI * 2;
          tr.x = src.x + 0.13 * Math.cos(a2);
          tr.y = src.y + 0.13 * Math.sin(a2);
        } else {
          var a3 = (i / 10) * Math.PI * 2;
          tr.x = 0.16 * Math.cos(a3);
          tr.y = 0.16 * Math.sin(a3);
        }
      }
      var tr, eTr, stepLen, near, cj;
      for (ti = 0; ti < state.tracers.length; ti++) {
        tr = state.tracers[ti];
        if (tr.age >= 1) spawnTracer(tr, ti);
        eTr = getE(tr.x, tr.y);
        if (eTr.mag > 0.04) {
          stepLen = 0.55 * dtp;
          tr.x += (eTr.ex / eTr.mag) * stepLen;
          tr.y += (eTr.ey / eTr.mag) * stepLen;
        }
        tr.age += dtp * 0.35;
        near = false;
        if (!plates) {
          for (cj = 0; cj < charges.length; cj++) {
            if (charges[cj].q < 0 && Math.hypot(tr.x - charges[cj].x, tr.y - charges[cj].y) < 0.09) near = true;
          }
        }
        if (near || Math.abs(tr.x) > 1.15 || Math.abs(tr.y) > 1.15 || (plates && tr.x > plateX - 0.03)) tr.age = 1;
        var ts = toScreen(tr.x, tr.y);
        var alpha = Math.max(0, Math.sin(tr.age * Math.PI) * 0.85);
        ctx.fillStyle = 'rgba(204,120,92,' + alpha + ')';
        ctx.beginPath();
        ctx.arc(ts.x, ts.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      var probe;
      var osc = Math.sin(state.t * 0.7);
      if (plates) probe = { x: 0.18, y: 0.62 * osc };
      else if (preset === 'dipole') probe = { x: 0, y: 0.22 + 0.50 * osc };
      else if (preset === 'like_charges') probe = { x: 0, y: 0.28 + 0.42 * osc };
      else probe = { x: 0.55 * Math.cos(state.t * 0.55), y: 0.55 * Math.sin(state.t * 0.55) };

      var ps = toScreen(probe.x, probe.y);
      var eP = getE(probe.x, probe.y);
      var vP = getV(probe.x, probe.y);
      drawDot(ctx, ps.x, ps.y, 4, GOLD, INK);
      ctx.save();
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(ps.x, ps.y, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      if (eP.mag > 0.03) {
        var ehatx = eP.ex / eP.mag;
        var ehaty = eP.ey / eP.mag;
        var sx = ehatx;
        var sy = -ehaty;
        var tanx = -sy;
        var tany = sx;
        var tanLen = clampArrowLen(ps.x, ps.y, tanx, tany, 34, 14, width, height);
        var tanLen2 = clampArrowLen(ps.x, ps.y, -tanx, -tany, 34, 14, width, height);
        ctx.save();
        ctx.strokeStyle = inkFade(0.35);
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(ps.x - tanx * tanLen2, ps.y - tany * tanLen2);
        ctx.lineTo(ps.x + tanx * tanLen, ps.y + tany * tanLen);
        ctx.stroke();
        ctx.restore();
        var eLen = clampArrowLen(ps.x, ps.y, sx, sy, Math.min(48, 16 + eP.mag * 8), 16, width, height);
        var gLen = clampArrowLen(ps.x, ps.y, -sx, -sy, eLen * 0.85, 16, width, height);
        drawSiteArrow(ctx, ps.x, ps.y, ps.x + sx * eLen, ps.y + sy * eLen, TEAL, 2.5);
        drawSiteArrow(ctx, ps.x, ps.y, ps.x - sx * gLen, ps.y - sy * gLen, CORAL, 2.2);
        inkLabel(ctx, 'E', ps.x + sx * (eLen + 11), ps.y + sy * (eLen + 11), { color: TEAL, align: 'center', width: width, height: height, font: '600 12px Inter, sans-serif' });
        inkLabel(ctx, 'grad V', ps.x - sx * (gLen + 14), ps.y - sy * (gLen + 14), { color: CORAL, align: 'center', width: width, height: height, font: '600 11px Inter, sans-serif' });
        rightAngleMark(ctx, ps.x, ps.y, sx, sy, tanx, tany, 8);
      }

      var trapNote = 'E downhill, 90 deg to the equipotential';
      if (preset === 'dipole' && Math.abs(probe.x) < 0.05) trapNote = 'on the midplane: $V=0$ but $\\mathbf{E}\\neq 0$';
      if (preset === 'like_charges' && Math.abs(probe.y) < 0.08 && Math.abs(probe.x) < 0.08) trapNote = 'midway: $\\mathbf{E}=0$ but $V\\neq 0$';
      appendLegend('$\\mathbf{E} = -\\nabla V$', [
        { label: 'Config', value: preset === 'capacitor' ? 'parallel plates' : (preset === 'dipole' ? 'dipole' : (preset === 'like_charges' ? 'like charges' : 'point charge')), hint: 'Charge layout. Field lines run downhill on $V$ and meet every equipotential at a right angle.' },
        { label: '$V$', value: money(vP), hint: 'Potential at the gold probe. Slope, not height: $V=0$ does not imply $\\mathbf{E}=0$, and $\\mathbf{E}=0$ does not imply $V=0$.' },
        { label: '$|\\mathbf{E}|$', value: money(eP.mag), hint: 'Field magnitude $|\\nabla V|$ at the probe. Packed contours mean a steep cliff and large $|\\mathbf{E}|$.' },
        { label: 'Geometry', value: trapNote, hint: 'Live geometry at the probe: $\\mathbf{E}\\perp$ the dashed equipotential. GRE trap: ' + trapNote + '.' }
      ]);

      var spots24 = [
        { id: 'probe', kind: 'circle', x: ps.x, y: ps.y, r: 12, title: 'Field probe', body: '$V=' + money(vP) + '$, $|\\mathbf{E}|=' + money(eP.mag) + '$. $\\mathbf{E}=-\\nabla V$ points downhill, always $90^\\circ$ to the local equipotential.' }
      ];
      if (eP.mag > 0.03) {
        spots24.push({ id: 'E', kind: 'segment', x1: ps.x, y1: ps.y, x2: ps.x + sx * eLen, y2: ps.y + sy * eLen, halfW: 8, title: 'Electric field $\\mathbf{E}$', body: '$\\mathbf{E}=-\\nabla V$ with $|\\mathbf{E}|=' + money(eP.mag) + '$. Teal arrow is downhill; it never crosses an equipotential.' });
        spots24.push({ id: 'gradV', kind: 'segment', x1: ps.x, y1: ps.y, x2: ps.x - sx * gLen, y2: ps.y - sy * gLen, halfW: 8, title: 'Gradient $\\nabla V$', body: '$\\nabla V=-\\mathbf{E}$ points uphill toward higher $V$. The two arrows are equal and opposite.' });
        spots24.push({ id: 'equipot', kind: 'segment', x1: ps.x - tanx * tanLen2, y1: ps.y - tany * tanLen2, x2: ps.x + tanx * tanLen, y2: ps.y + tany * tanLen, halfW: 7, title: 'Local equipotential', body: 'Dashed tangent to $V=\\mathrm{const}$. $\\mathbf{E}$ meets it at a right angle — the GRE geometry of $\\mathbf{E}=-\\nabla V$.' });
      }
      if (plates) {
        var pLs = toScreen(-plateX, 0);
        var pRs = toScreen(plateX, 0);
        var yTopP = toScreen(0, 0.78).y;
        var yBotP = toScreen(0, -0.78).y;
        spots24.push({ id: 'plateL', kind: 'segment', x1: pLs.x, y1: yTopP, x2: pLs.x, y2: yBotP, halfW: 10, title: 'Positive plate', body: 'Left plate at $V=+E_0 x_{\\mathrm{p}}$. Uniform $\\mathbf{E}=E_0\\hat{\\mathbf{x}}$ between the plates with $E_0=' + money(plateE) + '$.' });
        spots24.push({ id: 'plateR', kind: 'segment', x1: pRs.x, y1: yTopP, x2: pRs.x, y2: yBotP, halfW: 10, title: 'Negative plate', body: 'Right plate. Equipotentials are equally spaced vertical lines; $\\mathbf{E}$ is normal to them.' });
      } else {
        var qi, qcs, qch;
        for (qi = 0; qi < charges.length; qi++) {
          qch = charges[qi];
          qcs = toScreen(qch.x, qch.y);
          spots24.push({ id: 'q' + qi, kind: 'circle', x: qcs.x, y: qcs.y, r: 16, title: (qch.q > 0 ? 'Positive' : 'Negative') + ' charge', body: '$q=' + money(qch.q) + '$. ' + (qch.q > 0 ? 'Field lines leave a positive charge; $V$ is a hill.' : 'Field lines enter a negative charge; $V$ is a well.') });
        }
      }
      spots24.push({ id: 'contours', kind: 'rect', x: 0, y: 0, w: width, h: height, title: 'Equipotential contours', body: 'Level sets of $V$. Packed lines mean large $|\\mathbf{E}|$. Coral $V>0$, teal $V<0$. Field-line tracers (coral dots) run downhill.' });
      PGRE.setVizHotspots(spots24);
    },
    challenge: {
      question: "An electrostatic scalar potential in a three-dimensional region of space is given by $V(x, y, z) = 2x^2 - 3y^2 + 4z$. What is the electric field $\\mathbf{E}$ at the point $(1, -2, 3)$, and how much work is required by an external agent to move a test charge $q = +2\\,\\mathrm{C}$ at constant speed from $(0, 0, 0)$ to $(1, -2, 3)$?",
      options: [
        "$\\mathbf{E} = -4\\hat{\\mathbf{x}} - 12\\hat{\\mathbf{y}} - 4\\hat{\\mathbf{z}}$;  $W_{\\mathrm{ext}} = +12\\,\\mathrm{J}$",
        "$\\mathbf{E} = -4\\hat{\\mathbf{x}} - 12\\hat{\\mathbf{y}} - 4\\hat{\\mathbf{z}}$;  $W_{\\mathrm{ext}} = +4\\,\\mathrm{J}$",
        "$\\mathbf{E} = 4\\hat{\\mathbf{x}} + 12\\hat{\\mathbf{y}} + 4\\hat{\\mathbf{z}}$;   $W_{\\mathrm{ext}} = +24\\,\\mathrm{J}$",
        "$\\mathbf{E} = -4\\hat{\\mathbf{x}} - 12\\hat{\\mathbf{y}} - 4\\hat{\\mathbf{z}}$;  $W_{\\mathrm{ext}} = -24\\,\\mathrm{J}$",
        "$\\mathbf{E} = 4\\hat{\\mathbf{x}} + 12\\hat{\\mathbf{y}} + 4\\hat{\\mathbf{z}}$;   $W_{\\mathrm{ext}} = -4\\,\\mathrm{J}$"
      ],
      correct: 1,
      explanation: "Step 1: Compute the electric field via $\\mathbf{E} = -\\nabla V$:\n" +
        "$E_x = -\\partial V/\\partial x = -4x$ at $(1, -2, 3)$ gives $E_x = -4$.\n" +
        "$E_y = -\\partial V/\\partial y = +6y$ at $(1, -2, 3)$ gives $E_y = -12$.\n" +
        "$E_z = -\\partial V/\\partial z = -4$.\n" +
        "Thus $\\mathbf{E} = -4\\hat{\\mathbf{x}} - 12\\hat{\\mathbf{y}} - 4\\hat{\\mathbf{z}}$.\n\n" +
        "Step 2: External work $W_{\\mathrm{ext}} = q\\,\\Delta V = q[V(1,-2,3) - V(0,0,0)]$:\n" +
        "$V(1,-2,3) = 2(1)^2 - 3(-2)^2 + 4(3) = 2 - 12 + 12 = +2\\,\\mathrm{V}$.\n" +
        "$V(0,0,0) = 0$. Therefore $W_{\\mathrm{ext}} = (+2\\,\\mathrm{C})(2\\,\\mathrm{V}) = +4\\,\\mathrm{J}$."
    }
  };

  var POISSON_EPS0 = 1;

  function erfApprox(z) {
    var sign = z < 0 ? -1 : 1;
    var az = Math.abs(z);
    var t = 1 / (1 + 0.3275911 * az);
    var y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-az * az);
    return sign * y;
  }

  function poissonField(source, amp, sig, x) {
    var s = Math.max(Number(sig), 0.2);
    var a = amp;
    var eps = POISSON_EPS0;
    if (source === 'empty') {
      var L = 3.2;
      return { V: a * x / L, Vp: a / L, Vxx: 0, rho: 0 };
    }
    if (source === 'slab') {
      var w = s;
      var w2 = w * w;
      if (Math.abs(x) <= w) {
        return {
          V: a * (1 - (x * x) / w2),
          Vp: -2 * a * x / w2,
          Vxx: -2 * a / w2,
          rho: 2 * a * eps / w2
        };
      }
      var sgn = x >= 0 ? 1 : -1;
      return {
        V: 2 * a * (1 - Math.abs(x) / w),
        Vp: -2 * a / w * sgn,
        Vxx: 0,
        rho: 0
      };
    }
    function gaussCharge(x0, ampB) {
      var dx = x - x0;
      var g = Math.exp(-0.5 * dx * dx / (s * s));
      var rho = ampB * g;
      var k = 1 / (s * Math.SQRT2);
      var E = (ampB / eps) * s * Math.sqrt(Math.PI / 2) * erfApprox(dx * k);
      var edx = erfApprox(dx * k);
      var integErf = dx * edx + (Math.exp(-dx * dx * k * k) - 1) / (k * Math.sqrt(Math.PI));
      var Vrel = -(ampB / eps) * s * Math.sqrt(Math.PI / 2) * integErf;
      return { V: Vrel, Vp: -E, Vxx: -rho / eps, rho: rho };
    }
    if (source === 'well') return gaussCharge(0, -a);
    if (source === 'dipole') {
      var d = 1.15 * s;
      var pos = gaussCharge(d, a);
      var neg = gaussCharge(-d, -a);
      return { V: pos.V + neg.V, Vp: pos.Vp + neg.Vp, Vxx: pos.Vxx + neg.Vxx, rho: pos.rho + neg.rho };
    }
    return gaussCharge(0, a);
  }

  /* -------------------------------------------------------------------------- */
  /* cpgf-2.6: Poisson's equation ∇²V = −ρ/ε₀                                    */
  /* -------------------------------------------------------------------------- */
  PGRE.visualizers['cpgf-2.6'] = {
    id: 'cpgf-2.6',
    topic: 'em',
    title: "Poisson's Equation: $\\nabla^2 V = -\\rho/\\epsilon_0$",
    formulaLatex: '\\nabla^2 V = -\\frac{\\rho}{\\epsilon_0}',
    physicalStory: `
Poisson's equation is Gauss's law written in the potential. From $\\nabla\\cdot\\mathbf{E}=\\rho/\\epsilon_0$ and $\\mathbf{E}=-\\nabla V$ one has $\\nabla^2 V=-\\rho/\\epsilon_0$.

The Laplacian is the local curvature of $V$. Where $\\rho>0$, $\\nabla^2 V<0$: $V$ is a hill (local maximum) and $\\mathbf{E}=-\\nabla V$ points downhill, away from the charge. Where $\\rho<0$, $V$ is a well. In empty space $\\rho=0$ and Laplace's equation $\\nabla^2 V=0$ forbids local extrema — Earnshaw's theorem: no stable electrostatic equilibrium for a test charge in vacuum.

The picture is a one-dimensional slice, $\\partial^2 V/\\partial x^2=-\\rho/\\epsilon_0$. A gold probe rides $V(x)$; the short osculating parabola is that local curvature. The lower panel is $\\rho(x)$: Poisson integrates it twice into the $V(x)$ above. Positive $\\rho$ (coral) sits under a hill; negative $\\rho$ (teal) sits under a well. Empty space is Laplace: $\\rho=0$ and $V$ can only be a straight line.
    `.trim(),
    derivationSteps: [
      { step: 1, title: "Gauss's law (differential form)", latex: "\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\epsilon_0}", description: "The local divergence of $\\mathbf{E}$ equals the local charge density. This is the differential statement of Gauss's law in SI units." },
      { step: 2, title: "Electrostatics is conservative", latex: "\\mathbf{E} = -\\nabla V", description: "Because $\\nabla\\times\\mathbf{E}=0$ in electrostatics, $\\mathbf{E}$ is (minus) the gradient of a scalar potential." },
      { step: 3, title: "Substitute to obtain Poisson", latex: "\\nabla \\cdot (-\\nabla V) = \\frac{\\rho}{\\epsilon_0} \\implies \\nabla^2 V = -\\frac{\\rho}{\\epsilon_0}", description: "The Laplacian is $\\nabla^2\\equiv\\nabla\\cdot\\nabla$. The minus sign is inherited from $\\mathbf{E}=-\\nabla V$: a peak of $V$ has negative curvature and therefore positive $\\rho$." },
      { step: 4, title: "Cartesian components", latex: "\\frac{\\partial^2 V}{\\partial x^2} + \\frac{\\partial^2 V}{\\partial y^2} + \\frac{\\partial^2 V}{\\partial z^2} = -\\frac{\\rho}{\\epsilon_0}", description: "In one dimension (this picture) only $\\partial^2 V/\\partial x^2$ survives." },
      { step: 5, title: "Laplace's equation in vacuum", latex: "\\rho = 0 \\implies \\nabla^2 V = 0", description: "Harmonic functions obey the mean-value property: $V$ at a point equals its average on any surrounding sphere. Hence $V$ has no local max or min in empty space (Earnshaw)." }
    ],
    limitingCases: [
      { name: "Vacuum (Laplace)", condition: "\\rho = 0", formula: "\\nabla^2 V = 0", description: "No local extrema. In 1-D, $V(x)$ is strictly linear." },
      { name: "Uniform charge density", condition: "\\rho = \\mathrm{const}", formula: "V(x) = -\\frac{\\rho}{2\\epsilon_0}x^2 + Cx + D", description: "Quadratic $V$ (a hill if $\\rho>0$). The slab preset: parabola inside the charge, linear (Laplace) outside." },
      { name: "Point charge (distributional)", condition: "\\rho = q\\,\\delta^3(\\mathbf{r})", formula: "\\nabla^2\\!\\left(\\frac{1}{r}\\right) = -4\\pi\\delta^3(\\mathbf{r})", description: "Recovers $V=q/(4\\pi\\epsilon_0 r)$ with $V(\\infty)=0$. The Green's function of Poisson." },
      { name: "Conductor interior", condition: "$\\mathbf{E}=0$ in the bulk", formula: "V=\\mathrm{const},\\quad \\rho=0", description: "All free charge resides on the surface. Poisson is trivial inside; the interesting physics is the boundary." },
      { name: "cgs / Gaussian units", condition: "not SI", formula: "\\nabla^2 V = -4\\pi\\rho", description: "The $4\\pi$ is the whole difference. GRE items that quote Poisson without $\\epsilon_0$ are in Gaussian units." }
    ],
    greTraps: [
      { trap: "Dropping the minus sign", warning: "The GRE formula is $\\nabla^2 V=-\\rho/\\epsilon_0$, not $+\\rho/\\epsilon_0$. Positive charge makes a hill of $V$ (local maximum, $\\nabla^2 V<0$), not a well.", strategy: "Check one point: a point charge $q>0$ has $V>0$ that falls with $r$, so the origin is a peak." },
      { trap: "Gravity vs electrostatics", warning: "Gravitational Poisson is $\\nabla^2\\Phi=+4\\pi G\\rho$: mass makes a well. Electric Poisson has the opposite sign because like charges repel and $V$ is energy per unit positive charge.", strategy: "Mass attracts; positive charge repels other positive charges. Wells vs hills." },
      { trap: "Confusing $\\nabla^2 V=0$ with $V=0$", warning: "Laplace's equation says the curvature vanishes, not the value. A uniform field $V=-E_0 x$ has $V\\neq 0$ and $\\rho=0$. Midway between $+Q$ and $+Q$, $V\\neq 0$ but $\\mathbf{E}=0$; that is a statement about $\\nabla V$, not $\\nabla^2 V$.", strategy: "Laplacian = curvature = charge. Gradient = slope = field. Value of $V$ is gauge-dependent." },
      { trap: "Earnshaw and stable levitation", warning: "No local min or max of $V$ in empty space, so no stable electrostatic equilibrium for a test charge in vacuum. (Magnetic or time-varying fields are a different story.)", strategy: "If a stem says 'empty region' and asks for a stable point, the answer is that none exists." },
      { trap: "SI vs Gaussian $4\\pi$", warning: "SI: $\\nabla^2 V=-\\rho/\\epsilon_0$. Gaussian: $\\nabla^2 V=-4\\pi\\rho$. Mixing the $4\\pi$ with $\\epsilon_0$ is a common way to lose the item.", strategy: "If $\\epsilon_0$ is present, there is no $4\\pi$ in Poisson. If $4\\pi$ is present, there is no $\\epsilon_0$." }
    ],
    parameters: [
      { id: 'source', label: 'Charge $\\rho(x)$', type: 'select', default: 'hill', options: [
        { value: 'hill', label: 'Positive blob (hill in $V$)' },
        { value: 'well', label: 'Negative blob (well in $V$)' },
        { value: 'dipole', label: 'Dipole (hill + well)' },
        { value: 'slab', label: 'Uniform slab (quadratic $V$)' },
        { value: 'empty', label: 'Empty space (Laplace)' }
      ], hint: 'Choose $\\rho(x)$: a positive blob (hill in $V$), a negative blob (well), a dipole, a uniform slab, or empty space. Poisson says $\\nabla^2 V=-\\rho/\\epsilon_0$; Laplace ($\\rho=0$) forbids local extrema.' },
      { id: 'amp', label: 'Amplitude', min: 0.5, max: 2.0, step: 0.1, default: 1.2, hint: 'Overall scale of $\\rho$ and therefore of the curvature of $V$. Larger amplitude makes a taller hill or deeper well.' },
      { id: 'sigma', label: 'Width $\\sigma$', min: 0.40, max: 1.20, step: 0.05, default: 0.70, hint: 'Spatial width of the charge blob or slab. Wider $\\rho$ spreads the curvature of $V$ over a larger $x$ interval.' },
      { id: 'simSpeed', label: 'Simulation Speed', min: 0.2, max: 3.0, step: 0.2, default: 1.0, unit: 'x' }
    ],
    init: function (container, state) {
      state.source = state.source || 'hill';
      if (state.amp == null || isNaN(state.amp)) state.amp = 1.2;
      if (state.sigma == null || isNaN(state.sigma)) state.sigma = 0.70;
      if (state.simSpeed == null || isNaN(state.simSpeed)) state.simSpeed = 1.0;
      state.t = state.t || 0;
    },
    draw: function (ctx, width, height, state, dt) {
      state = state || {};
      var dtp = scaledDt(dt, state);
      var source = state.source || 'hill';
      var amp = Number(state.amp);
      if (!isFinite(amp)) amp = 1.2;
      var sig = Number(state.sigma);
      if (!isFinite(sig) || sig < 0.2) sig = 0.70;
      state.t = (state.t || 0) + dtp * 0.70;

      fillCream(ctx, width, height);

      var xMin = -3.2;
      var xMax = 3.2;
      var nSamp = 160;
      var i;
      var xs = [];
      var vs = [];
      var rhos = [];
      var vmin = Infinity;
      var vmax = -Infinity;
      var rhoAbs = 0;
      for (i = 0; i <= nSamp; i++) {
        var x = xMin + (xMax - xMin) * (i / nSamp);
        var f = poissonField(source, amp, sig, x);
        xs.push(x);
        vs.push(f.V);
        rhos.push(f.rho);
        if (f.V < vmin) vmin = f.V;
        if (f.V > vmax) vmax = f.V;
        var ar = Math.abs(f.rho);
        if (ar > rhoAbs) rhoAbs = ar;
      }
      if (!(vmax > vmin)) {
        vmin -= 1;
        vmax += 1;
      }
      var vPad = 0.10 * (vmax - vmin);
      vmin -= vPad;
      vmax += vPad;
      var rhoScale = Math.max(rhoAbs, 0.35);

      var left = 48;
      var right = width - 16;
      var topT = 14;
      var topB = Math.floor(height * 0.54);
      var botT = topB + 12;
      var botB = height - 12;

      function X(x) {
        return left + (x - xMin) / (xMax - xMin) * (right - left);
      }
      function Yv(v) {
        return topB - 8 - (v - vmin) / (vmax - vmin) * (topB - topT - 16);
      }
      var rhoMid = (botT + botB) / 2;
      var rhoHalf = (botB - botT) / 2 - 8;
      function Yrho(r) {
        return rhoMid - (r / rhoScale) * rhoHalf;
      }

      ctx.save();
      ctx.fillStyle = PANEL;
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 1;
      ctx.fillRect(left - 8, topT - 6, (right - left) + 16, (topB - topT) + 8);
      ctx.strokeRect(left - 8, topT - 6, (right - left) + 16, (topB - topT) + 8);
      ctx.fillRect(left - 8, botT - 6, (right - left) + 16, (botB - botT) + 8);
      ctx.strokeRect(left - 8, botT - 6, (right - left) + 16, (botB - botT) + 8);
      ctx.restore();

      if (vmin < 0 && vmax > 0) {
        ctx.save();
        ctx.strokeStyle = inkFade(0.18);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(left, Yv(0));
        ctx.lineTo(right, Yv(0));
        ctx.stroke();
        ctx.restore();
      }
      ctx.save();
      ctx.strokeStyle = inkFade(0.18);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(left, Yrho(0));
      ctx.lineTo(right, Yrho(0));
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.rect(left - 8, botT - 6, (right - left) + 16, (botB - botT) + 8);
      ctx.clip();
      for (i = 0; i < nSamp; i++) {
        var r0 = rhos[i];
        var r1 = rhos[i + 1];
        ctx.beginPath();
        ctx.moveTo(X(xs[i]), Yrho(0));
        ctx.lineTo(X(xs[i]), Yrho(r0));
        ctx.lineTo(X(xs[i + 1]), Yrho(r1));
        ctx.lineTo(X(xs[i + 1]), Yrho(0));
        ctx.closePath();
        ctx.fillStyle = (r0 + r1) >= 0 ? 'rgba(204,120,92,0.28)' : 'rgba(93,184,166,0.28)';
        ctx.fill();
      }
      ctx.strokeStyle = CORAL;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (i = 0; i <= nSamp; i++) {
        if (i === 0) ctx.moveTo(X(xs[i]), Yrho(rhos[i]));
        else ctx.lineTo(X(xs[i]), Yrho(rhos[i]));
      }
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.rect(left - 8, topT - 6, (right - left) + 16, (topB - topT) + 8);
      ctx.clip();
      ctx.strokeStyle = TEAL;
      ctx.lineWidth = 2.4;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (i = 0; i <= nSamp; i++) {
        if (i === 0) ctx.moveTo(X(xs[i]), Yv(vs[i]));
        else ctx.lineTo(X(xs[i]), Yv(vs[i]));
      }
      ctx.stroke();
      ctx.restore();

      var xP = 0.88 * xMax * Math.sin(state.t);
      var pFld = poissonField(source, amp, sig, xP);
      var pSx = X(xP);
      var pSy = Yv(pFld.V);
      var pSrho = Yrho(pFld.rho);

      ctx.save();
      ctx.strokeStyle = GOLD;
      ctx.setLineDash([3, 4]);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(pSx, topT);
      ctx.lineTo(pSx, botB);
      ctx.stroke();
      ctx.restore();

      if (Math.abs(pFld.Vxx) > 1e-4) {
        var halfW = 0.55;
        var pj;
        var paraColor = pFld.Vxx < 0 ? CORAL : TEAL;
        ctx.save();
        ctx.beginPath();
        ctx.rect(left - 8, topT - 6, (right - left) + 16, (topB - topT) + 8);
        ctx.clip();
        ctx.strokeStyle = paraColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        var started = false;
        for (pj = -12; pj <= 12; pj++) {
          var dxp = halfW * (pj / 12);
          var xv = xP + dxp;
          var yv = pFld.V + pFld.Vp * dxp + 0.5 * pFld.Vxx * dxp * dxp;
          var sx = X(xv);
          var sy = Yv(yv);
          if (!started) { ctx.moveTo(sx, sy); started = true; }
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
        ctx.restore();
      }

      drawDot(ctx, pSx, pSy, 4.5, GOLD, INK);
      drawDot(ctx, pSx, pSrho, 4, GOLD, INK);

      if (pFld.rho > 0.08) {
        drawDot(ctx, pSx, pSy - 16, 7, CORAL, INK);
        ctx.save();
        ctx.fillStyle = INK;
        ctx.font = '700 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+', pSx, pSy - 16);
        ctx.restore();
      } else if (pFld.rho < -0.08) {
        drawDot(ctx, pSx, pSy - 16, 7, TEAL, INK);
        ctx.save();
        ctx.fillStyle = INK;
        ctx.font = '700 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('-', pSx, pSy - 16);
        ctx.restore();
      }

      inkLabel(ctx, 'V', left - 14, topT + 10, { color: TEAL, align: 'center', width: width, height: height, font: FONT_SM });
      inkLabel(ctx, 'x', (left + right) / 2, botB - 8, { color: MUTED, align: 'center', width: width, height: height, font: FONT_SM });

      var sourceName = source === 'well' ? 'negative blob'
        : (source === 'dipole' ? 'dipole'
          : (source === 'slab' ? 'uniform slab'
            : (source === 'empty' ? 'empty space' : 'positive blob')));
      var check;
      if (source === 'empty') check = 'Laplace $\\nabla^2 V=0$';
      else if (pFld.rho > 0.08) check = 'hill: $\\nabla^2 V<0\\Rightarrow\\rho>0$';
      else if (pFld.rho < -0.08) check = 'well: $\\nabla^2 V>0\\Rightarrow\\rho<0$';
      else check = 'near $\\rho=0$';

      appendLegend("Poisson: $\\nabla^2 V=-\\rho/\\epsilon_0$", [
        { label: 'Source', value: sourceName, hint: 'Live $\\rho(x)$ preset: ' + sourceName + '. Positive $\\rho$ (coral) sits under a hill of $V$; negative $\\rho$ (teal) under a well.' },
        { label: '$x$', value: money(xP, 2), hint: 'Probe coordinate. The gold dashed line is this $x$; both panels are sampled here.' },
        { label: '$V$', value: money(pFld.V), hint: 'Potential at the probe. In 1-D, Poisson integrates $\\rho$ twice: $V\'\'=-\\rho/\\epsilon_0$.' },
        { label: '$\\nabla^2 V$', value: money(pFld.Vxx), hint: 'Local curvature $\\partial^2 V/\\partial x^2=' + money(pFld.Vxx) + '$. Negative curvature is a hill ($\\rho>0$); positive is a well.' },
        { label: '$\\rho$', value: money(pFld.rho), hint: 'Charge density at the probe. The GRE sign: $\\rho=-\\epsilon_0\\nabla^2 V$, so a peak of $V$ means positive charge.' },
        { label: '$-\\epsilon_0\\nabla^2 V$', value: money(-POISSON_EPS0 * pFld.Vxx), hint: 'Poisson check: this equals $\\rho=' + money(pFld.rho) + '$. If they disagree, the minus sign was dropped.' },
        { label: 'Read', value: check, hint: 'Local character at the probe: ' + check + '. Earnshaw: no stable electrostatic equilibrium in empty space.' }
      ]);

      var spots26 = [
        { id: 'probeV', kind: 'circle', x: pSx, y: pSy, r: 10, title: 'Probe on $V(x)$', body: '$V=' + money(pFld.V) + '$, $\\nabla^2 V=' + money(pFld.Vxx) + '$ at $x=' + money(xP, 2) + '$. The short osculating parabola is that local curvature.' },
        { id: 'probeRho', kind: 'circle', x: pSx, y: pSrho, r: 10, title: 'Probe on $\\rho(x)$', body: '$\\rho=' + money(pFld.rho) + '$. Coral fill is $\\rho>0$, teal $\\rho<0$. Poisson integrates this twice into $V(x)$ above.' },
        { id: 'xline', kind: 'segment', x1: pSx, y1: topT, x2: pSx, y2: botB, halfW: 6, title: 'Probe line $x$', body: 'Live sample $x=' + money(xP, 2) + '$. Both panels share this abscissa.' }
      ];
      if (pFld.rho > 0.08 || pFld.rho < -0.08) {
        spots26.push({ id: 'sign', kind: 'circle', x: pSx, y: pSy - 16, r: 12, title: pFld.rho > 0 ? 'Positive $\\rho$' : 'Negative $\\rho$', body: pFld.rho > 0 ? 'Positive charge: $V$ is a hill ($\\nabla^2 V<0$) and $\\mathbf{E}$ points away.' : 'Negative charge: $V$ is a well ($\\nabla^2 V>0$) and $\\mathbf{E}$ points inward.' });
      }
      if (source === 'slab') {
        var slabL = X(-sig);
        var slabR = X(sig);
        spots26.push({ id: 'slab', kind: 'rect', x: Math.min(slabL, slabR), y: topT - 6, w: Math.abs(slabR - slabL), h: (topB - topT) + 8, title: 'Uniform slab', body: 'Inside $|x|<\\sigma$, $V$ is quadratic ($\\rho=\\mathrm{const}$). Outside, $\\rho=0$ so $V$ is linear (Laplace).' });
      }
      spots26.push({ id: 'Vplot', kind: 'rect', x: left - 8, y: topT - 6, w: (right - left) + 16, h: (topB - topT) + 8, title: 'Potential $V(x)$', body: 'Teal curve is $V(x)$ for ' + sourceName + '. Packed curvature means large $|\\rho|$. Empty space is a straight line.' });
      spots26.push({ id: 'rhoplot', kind: 'rect', x: left - 8, y: botT - 6, w: (right - left) + 16, h: (botB - botT) + 8, title: 'Charge density $\\rho(x)$', body: 'Lower panel: $\\rho(x)$. Poisson $\\nabla^2 V=-\\rho/\\epsilon_0$ is the map from this plot to $V(x)$ above.' });
      PGRE.setVizHotspots(spots26);
    },
    challenge: {
      question: "A region of space has electrostatic potential $V(x,y,z)=a(x^2+y^2+z^2)$ with $a>0$. What is the charge density $\\rho$, and what is the character of $V$ at the origin?",
      options: [
        "$\\rho=-6a\\epsilon_0$ (negative); $V$ has a local minimum at the origin",
        "$\\rho=+6a\\epsilon_0$ (positive); $V$ has a local maximum at the origin",
        "$\\rho=-6a\\epsilon_0$ (negative); $V$ has a local maximum at the origin",
        "$\\rho=0$ (Laplace); $V$ is a saddle at the origin",
        "$\\rho=-2a\\epsilon_0$; $V$ has a local minimum at the origin"
      ],
      correct: 0,
      explanation: "Compute the Laplacian in Cartesian coordinates:\n" +
        "$\\partial^2 V/\\partial x^2=2a$, and likewise for $y$ and $z$, so $\\nabla^2 V=6a$.\n" +
        "Poisson's equation then gives $\\rho=-\\epsilon_0\\nabla^2 V=-6a\\epsilon_0<0$.\n" +
        "The function $V=ar^2$ with $a>0$ is a bowl: a local minimum at the origin. Negative charge sits in a well of $V$; positive charge would have been a hill ($\\nabla^2 V<0$).\n" +
        "Option B flips both the sign of $\\rho$ and the type of extremum. Option C gets $\\rho$ right but calls a minimum a maximum. Option E is the 1-D Laplacian $2a$ in place of $6a$."
    }
  };

  /* -------------------------------------------------------------------------- */
  /* cpgf-2.8: Poisson integral for V                                            */
  /* -------------------------------------------------------------------------- */
  PGRE.visualizers['cpgf-2.8'] = {
    id: 'cpgf-2.8',
    topic: 'em',
    title: 'Poisson Integral for Electric Potential',
    formulaLatex: 'V(\\mathbf{r}) = \\frac{1}{4\\pi\\epsilon_0} \\int \\frac{\\rho(\\mathbf{r\'})}{|\\mathbf{r} - \\mathbf{r\'}|} d^3\\mathbf{r\'}',
    physicalStory: `
The Poisson integral is free-space superposition: every charge element $dq=\\rho\\,dV'$ contributes $k\\,dq/|\\mathbf{r}-\\mathbf{r}'|$ to $V$. That kernel is the Green's function for $\\nabla^2 V=-\\rho/\\epsilon_0$ with $V(\\infty)=0$.

For a uniformly charged sphere the integral is Newton's shell theorem. Outside, $V=kQ/r$. Inside a solid sphere $V$ is a downward parabola with $V(0)=\\frac{3}{2}V(R)$. Inside a thin shell $V$ is strictly constant (Faraday cage). On the axis of a ring every $dq$ is equidistant, so $V(z)=kQ/\\sqrt{R^2+z^2}$.
    `.trim(),
    derivationSteps: [
      { step: 1, title: "Gauss's Law in Differential Form", latex: "\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\epsilon_0}", description: "Local divergence of $\\mathbf{E}$ equals local charge density." },
      { step: 2, title: "Substitution of Scalar Potential", latex: "\\nabla^2 V = -\\frac{\\rho}{\\epsilon_0}", description: "Insert $\\mathbf{E}=-\\nabla V$ to obtain Poisson's equation." },
      { step: 3, title: "Free-Space Green's Function", latex: "\\nabla^2 \\left( \\frac{1}{|\\mathbf{r} - \\mathbf{r'}|} \\right) = -4\\pi \\delta^3(\\mathbf{r} - \\mathbf{r'})", description: "The inverse-distance kernel is the impulse response of free space." },
      { step: 4, title: "Convolution over Source Distribution", latex: "V(\\mathbf{r}) = \\frac{1}{4\\pi\\epsilon_0}\\int \\frac{\\rho(\\mathbf{r'})}{|\\mathbf{r} - \\mathbf{r'}|} d^3\\mathbf{r'}", description: "Superpose every source element." },
      { step: 5, title: "Multipole Expansion Far-Field Limit", latex: "V(\\mathbf{r}) = \\frac{1}{4\\pi\\epsilon_0}\\left[ \\frac{Q_{\\text{tot}}}{r} + \\frac{\\mathbf{p}\\cdot\\hat{\\mathbf{r}}}{r^2} + \\mathcal{O}(r^{-3}) \\right]", description: "Taylor expand the kernel for $r\\gg r'$." }
    ],
    limitingCases: [
      { name: "Uniformly Charged Sphere", condition: "\\rho = \\mathrm{const},\\; r' < R", formula: "V(r)=kQ/r\\ (r\\ge R);\\quad V(r)=\\frac{kQ}{2R}(3-r^2/R^2)\\ (r<R)", description: "Outside it is a point charge. $V(0)=\\frac{3}{2}V(R)$." },
      { name: "Spherical Shell", condition: "\\sigma\\,\\delta(r'-R)", formula: "V=kQ/r\\ (r\\ge R);\\quad V=kQ/R\\ (r<R)", description: "Constant potential inside; $E=0$ (Faraday cage)." },
      { name: "Charged Ring on Axis", condition: "\\lambda=Q/(2\\pi R),\\; \\mathbf{r}=(0,0,z)", formula: "V(z)=kQ/\\sqrt{R^2+z^2}", description: "Every element is equidistant from an axial point." },
      { name: "Infinite Line", condition: "L\\to\\infty", formula: "V(s)=-(\\lambda/2\\pi\\epsilon_0)\\ln(s/s_0)", description: "Cannot set the reference at infinity." }
    ],
    greTraps: [
      { trap: "Integrating Vector $\\mathbf{E}$ vs Scalar $V$", warning: "Compute scalar $V=k\\int dq/r$ first, then $\\mathbf{E}=-\\nabla V$." },
      { trap: "Continuity of $V$ vs Jump in $\\mathbf{E}$", warning: "$V$ is continuous across a surface charge; $E_\\perp$ jumps by $\\sigma/\\epsilon_0$." },
      { trap: "Electrostatic Self-Energy Double Counting", warning: "Assembly work is $W=\\frac{1}{2}\\int\\rho V\\,dV$. For a uniform sphere, $W=\\frac{3}{5}kQ^2/R$." },
      { trap: "Origin Dependence of Dipole Moment", warning: "$\\mathbf{p}$ is origin-independent if and only if $Q_{\\mathrm{tot}}=0$." }
    ],
    parameters: [
      { id: 'geometry', label: 'Source $\\rho$', type: 'select', default: 'sphere_solid', options: [
        { value: 'sphere_solid', label: 'Uniform solid sphere' },
        { value: 'sphere_shell', label: 'Thin spherical shell' },
        { value: 'ring', label: 'Charged ring (on axis)' }
      ], hint: 'Solid sphere, thin shell, or a ring. Outside any spherical source $V=kQ/r$. Inside a solid sphere $V(0)=\\frac{3}{2}V(R)$; inside a shell $V$ is constant (Faraday cage).' },
      { id: 'radius', label: 'Radius $R$', min: 0.20, max: 0.55, step: 0.05, default: 0.35, hint: 'Source radius. For spheres this is the Gaussian-surface matching radius; for the ring it is the loop radius in $V(z)=kQ/\\sqrt{R^2+z^2}$.' },
      { id: 'totalCharge', label: 'Total charge $Q$', min: 0.4, max: 2.4, step: 0.1, default: 1.0, hint: 'Total charge. $V$ and $E$ both scale with $Q$; the shape $V(r)/V(R)$ does not.' },
      { id: 'simSpeed', label: 'Simulation Speed', min: 0.2, max: 3.0, step: 0.2, default: 1.0, unit: 'x' }
    ],
    init: function (container, state) {
      state.geometry = state.geometry || 'sphere_solid';
      if (state.radius == null || isNaN(state.radius)) state.radius = 0.35;
      if (state.totalCharge == null || isNaN(state.totalCharge)) state.totalCharge = 1.0;
      if (state.simSpeed == null || isNaN(state.simSpeed)) state.simSpeed = 1.0;
      state.t = state.t || 0;
    },
    draw: function (ctx, width, height, state, dt) {
      state = state || {};
      var dtp = scaledDt(dt, state);
      var geo = state.geometry || 'sphere_solid';
      var R = Number(state.radius);
      if (!isFinite(R)) R = 0.35;
      var Q = Number(state.totalCharge);
      if (!isFinite(Q)) Q = 1.0;
      var kQ = 1.0 * Q;
      state.t = (state.t || 0) + dtp * 0.55;
      var sweep = 0.5 + 0.5 * Math.sin(state.t);

      fillCream(ctx, width, height);

      var isRing = geo === 'ring';
      var rMax = isRing ? 2.2 * R : 2.4 * R;
      var rP = isRing ? (-rMax + 2 * rMax * sweep) : (0.02 + (rMax - 0.02) * sweep);
      var rAbs = Math.abs(rP);

      function Vof(r) {
        var ar = Math.abs(r);
        if (geo === 'sphere_shell') return ar >= R ? kQ / Math.max(ar, 1e-4) : kQ / R;
        if (geo === 'sphere_solid') {
          if (ar >= R) return kQ / Math.max(ar, 1e-4);
          return (kQ / (2 * R)) * (3 - (ar * ar) / (R * R));
        }
        return kQ / Math.sqrt(R * R + r * r);
      }
      function Eof(r) {
        var ar = Math.abs(r);
        if (geo === 'sphere_shell') return ar >= R ? kQ / (ar * ar) : 0;
        if (geo === 'sphere_solid') return ar >= R ? kQ / (ar * ar) : kQ * ar / (R * R * R);
        return kQ * Math.abs(r) / Math.pow(R * R + r * r, 1.5);
      }

      var Vpeak = Vof(0);
      var Vp = Vof(rP);
      var Ep = Eof(rP);
      var Vcoul = kQ / Math.max(rAbs, 1e-3);
      var inside = !isRing && rAbs < R;

      var plotT = 18;
      var plotB = height * 0.40;
      var plotL = 50;
      var plotR = width - 22;
      var plotW = plotR - plotL;
      var plotH = plotB - plotT;

      ctx.save();
      ctx.fillStyle = PANEL;
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 1;
      ctx.fillRect(plotL - 8, plotT - 8, plotW + 16, plotH + 16);
      ctx.strokeRect(plotL - 8, plotT - 8, plotW + 16, plotH + 16);
      ctx.restore();

      function xOfR(r) {
        if (isRing) return plotL + ((r + rMax) / (2 * rMax)) * plotW;
        return plotL + (r / rMax) * plotW;
      }
      function yOfV(v) {
        return plotB - (v / (Vpeak * 1.08)) * (plotH - 10);
      }

      if (!isRing) {
        var bSx = xOfR(R);
        ctx.save();
        ctx.strokeStyle = CORAL;
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(bSx, plotT);
        ctx.lineTo(bSx, plotB);
        ctx.stroke();
        ctx.restore();
        inkLabel(ctx, 'R', bSx + 8, plotT + 12, { color: CORAL, align: 'left', width: width, height: height, font: FONT_SM });
      }

      var nSamp = 120, si, rv, sx, sy;
      ctx.save();
      ctx.beginPath();
      ctx.rect(plotL - 8, plotT - 8, plotW + 16, plotH + 16);
      ctx.clip();
      ctx.strokeStyle = inkFade(0.28);
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      for (si = 0; si <= nSamp; si++) {
        rv = isRing ? (-rMax + (2 * rMax) * si / nSamp) : (0.03 + (rMax - 0.03) * si / nSamp);
        sx = xOfR(rv);
        sy = yOfV(kQ / Math.max(Math.abs(rv), 1e-3));
        if (si === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = TEAL;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (si = 0; si <= nSamp; si++) {
        rv = isRing ? (-rMax + (2 * rMax) * si / nSamp) : (0.0 + rMax * si / nSamp);
        sx = xOfR(rv);
        sy = yOfV(Vof(rv));
        if (si === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
      ctx.restore();

      var pPx = xOfR(rP);
      var pPy = yOfV(Vp);
      ctx.save();
      ctx.strokeStyle = GOLD;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(pPx, plotT);
      ctx.lineTo(pPx, plotB);
      ctx.stroke();
      ctx.restore();
      drawDot(ctx, pPx, pPy, 4.5, GOLD, INK);
      inkLabel(ctx, isRing ? 'z' : 'r', plotL + plotW / 2, plotB + 12, { color: MUTED, align: 'center', width: width, height: height, font: FONT_SM });
      inkLabel(ctx, 'V', plotL - 14, plotT + 8, { color: TEAL, align: 'center', width: width, height: height, font: FONT_SM });

      var geoCy = height * 0.72;
      var geoCx = width / 2;
      var geoScale = Math.min(width * 0.38, (height - plotB - 20) * 0.85) / Math.max(R * 2.4, 0.3);

      if (isRing) {
        var nRing = 20;
        var ri, phi, rx, ry, psx, psy, dist;
        var pScreen = { x: geoCx, y: geoCy - rP * geoScale };
        ctx.save();
        ctx.strokeStyle = inkFade(0.35);
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(geoCx, geoCy + 1.8 * R * geoScale);
        ctx.lineTo(geoCx, geoCy - 1.8 * R * geoScale);
        ctx.stroke();
        ctx.restore();
        for (ri = 0; ri < nRing; ri++) {
          phi = (ri / nRing) * Math.PI * 2;
          rx = geoCx + R * geoScale * Math.cos(phi);
          ry = geoCy + R * geoScale * 0.28 * Math.sin(phi);
          dist = Math.sqrt(R * R + rP * rP);
          ctx.save();
          ctx.strokeStyle = 'rgba(93,184,166,' + (0.18 + 0.35 * (R / Math.max(dist, 0.05))) + ')';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(pScreen.x, pScreen.y);
          ctx.stroke();
          ctx.restore();
          drawDot(ctx, rx, ry, 3.2, CORAL, null);
        }
        ctx.save();
        ctx.strokeStyle = CORAL;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(geoCx, geoCy, R * geoScale, R * geoScale * 0.28, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        drawDot(ctx, pScreen.x, pScreen.y, 5, GOLD, INK);
        inkLabel(ctx, 'P', pScreen.x + 12, pScreen.y, { color: GOLD, align: 'left', width: width, height: height, font: '600 12px Inter, sans-serif' });
      } else {
        var nShell = 5;
        var sh, rad, col;
        for (sh = nShell; sh >= 1; sh--) {
          rad = (sh / nShell) * R * geoScale;
          var rShell = (sh / nShell) * R;
          var enclosed = rAbs >= rShell;
          col = geo === 'sphere_shell'
            ? (sh === nShell ? CORAL : 'rgba(204,120,92,0.08)')
            : (enclosed ? 'rgba(204,120,92,0.22)' : 'rgba(93,184,166,0.18)');
          ctx.save();
          ctx.fillStyle = geo === 'sphere_shell' ? 'rgba(204,120,92,0.05)' : col;
          ctx.strokeStyle = enclosed ? CORAL : TEAL;
          ctx.lineWidth = geo === 'sphere_shell' && sh === nShell ? 3 : 1.2;
          ctx.beginPath();
          ctx.arc(geoCx, geoCy, rad, 0, Math.PI * 2);
          if (geo !== 'sphere_shell' || sh === nShell) {
            ctx.fill();
            ctx.stroke();
          }
          ctx.restore();
        }
        var pS = { x: geoCx + rP * geoScale, y: geoCy };
        ctx.save();
        ctx.strokeStyle = inkFade(0.25);
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(geoCx - rMax * geoScale, geoCy);
        ctx.lineTo(geoCx + rMax * geoScale, geoCy);
        ctx.stroke();
        ctx.restore();
        drawDot(ctx, pS.x, pS.y, 5, GOLD, INK);
        inkLabel(ctx, 'P', pS.x, pS.y - 14, { color: GOLD, align: 'center', width: width, height: height, font: '600 12px Inter, sans-serif' });
        inkLabel(ctx, 'R', geoCx + R * geoScale * 0.5, geoCy + 14, { color: MUTED, align: 'center', width: width, height: height, font: FONT_SM });
      }

      var geoName = geo === 'sphere_solid' ? 'solid sphere' : (geo === 'sphere_shell' ? 'spherical shell' : 'ring (axis)');
      var region = isRing ? (Math.abs(rP) < 0.15 * R ? 'center of ring' : 'on axis') : (inside ? 'inside' : 'outside');
      appendLegend('Poisson integral for $V$', [
        { label: 'Source', value: geoName, hint: 'Live geometry: ' + geoName + '. The Poisson integral $V=k\\int dq/|\\mathbf{r}-\\mathbf{r}\'|$ reduces to Newton\'s shell theorem here.' },
        { label: isRing ? '$z$' : '$r$', value: money(rP, 3) + ' (' + region + ')', hint: 'Probe location (' + region + '). Outside a sphere, $V$ matches the dashed Coulomb curve $kQ/r$.' },
        { label: '$V$', value: money(Vp), hint: 'Potential at the probe, $V=' + money(Vp) + '$ with $V(\\infty)=0$. Continuous even where $E_\\perp$ jumps.' },
        { label: '$|\\mathbf{E}|$', value: money(Ep), hint: 'Field $|E|=|dV/dr|=' + money(Ep) + '$. Inside a shell this is zero; inside a solid sphere it grows as $r$.' },
        { label: 'point-charge $kQ/r$', value: money(Vcoul), hint: 'Coulomb comparison $kQ/r=' + money(Vcoul) + '$. Equals $V$ only outside a spherical source (or far from a ring).' },
        { label: 'Match', value: (!isRing && !inside) ? 'outside: $V=kQ/r$' : (geo === 'sphere_solid' && inside ? '$V(0)=\\frac{3}{2}V(R)$' : (geo === 'sphere_shell' && inside ? 'cage: $V=kQ/R$, $E=0$' : 'on axis: $V=kQ/\\sqrt{R^2+z^2}$')), hint: 'Which closed form is live: outside Coulomb, interior parabola, Faraday cage, or ring-on-axis.' }
      ]);

      var spots28 = [
        { id: 'plotProbe', kind: 'circle', x: pPx, y: pPy, r: 10, title: 'Probe on $V$', body: '$V=' + money(Vp) + '$, $|\\mathbf{E}|=' + money(Ep) + '$ at ' + (isRing ? '$z=' : '$r=') + money(rP, 3) + '$ (' + region + ').' }
      ];
      if (isRing) {
        var pScr = { x: geoCx, y: geoCy - rP * geoScale };
        spots28.push({ id: 'P', kind: 'circle', x: pScr.x, y: pScr.y, r: 12, title: 'Axial point $P$', body: 'Every $dq$ is equidistant, so $V(z)=kQ/\\sqrt{R^2+z^2}=' + money(Vp) + '$. Teal rays are the Poisson kernel.' });
        spots28.push({ id: 'ring', kind: 'ring', x: geoCx, y: geoCy, r: R * geoScale, halfW: Math.max(10, R * geoScale * 0.32), title: 'Charged ring', body: 'Loop of radius $R=' + money(R, 2) + '$, total $Q=' + money(Q) + '$. $V$ on axis is $kQ/\\sqrt{R^2+z^2}$.' });
        spots28.push({ id: 'axis', kind: 'segment', x1: geoCx, y1: geoCy + 1.8 * R * geoScale, x2: geoCx, y2: geoCy - 1.8 * R * geoScale, halfW: 7, title: 'Ring axis', body: 'The $z$-axis. Off-axis $V$ needs elliptic integrals; GRE items stay on axis.' });
      } else {
        var pSph = { x: geoCx + rP * geoScale, y: geoCy };
        spots28.push({ id: 'P', kind: 'circle', x: pSph.x, y: pSph.y, r: 12, title: 'Field point $P$', body: (inside ? 'Inside: ' : 'Outside: ') + '$V=' + money(Vp) + '$, $|E|=' + money(Ep) + '$. ' + (inside ? (geo === 'sphere_shell' ? 'Faraday cage: $E=0$, $V=kQ/R$.' : '$E\\propto r$, $V(0)=\\frac{3}{2}V(R)$.') : 'Matches a point charge $kQ/r$.') });
        spots28.push({ id: 'gauss', kind: 'ring', x: geoCx, y: geoCy, r: Math.max(10, rAbs * geoScale), halfW: 10, title: 'Gaussian surface', body: 'Concentric sphere through $P$. Enclosed charge is ' + (inside && geo === 'sphere_solid' ? '$Q(r/R)^3$' : (inside && geo === 'sphere_shell' ? '$0$' : '$Q$')) + '.' });
        if (geo === 'sphere_shell') {
          spots28.push({ id: 'shell', kind: 'ring', x: geoCx, y: geoCy, r: R * geoScale, halfW: 12, title: 'Thin spherical shell', body: 'All charge on $r=R$. Inside: $V=kQ/R$, $E=0$. Outside: $V=kQ/r$.' });
          spots28.push({ id: 'cavity', kind: 'disk', x: geoCx, y: geoCy, r: Math.max(8, R * geoScale * 0.88), title: 'Shell interior', body: 'Empty cavity. Gauss: $E=0$ so $V$ is strictly constant — Faraday cage.' });
        } else {
          spots28.push({ id: 'enclosed', kind: 'disk', x: geoCx, y: geoCy, r: Math.max(8, Math.min(rAbs, R) * geoScale), title: 'Enclosed charge', body: inside ? 'Coral shells inside $P$ contribute $Q_{\\mathrm{enc}}=Q(r/R)^3$. Outer teal shells cancel by Newton.' : 'The whole sphere is enclosed, so $V=kQ/r$ as if all $Q$ sat at the center.' });
          spots28.push({ id: 'sphere', kind: 'annulus', x: geoCx, y: geoCy, r0: 4, r1: R * geoScale, title: 'Uniform solid sphere', body: 'Uniform $\\rho=Q/(\\frac{4}{3}\\pi R^3)$. Outside Coulomb; inside $V=\\frac{kQ}{2R}(3-r^2/R^2)$.' });
        }
        spots28.push({ id: 'Rmark', kind: 'segment', x1: xOfR(R), y1: plotT, x2: xOfR(R), y2: plotB, halfW: 6, title: 'Surface $r=R$', body: 'Matching radius. $V$ is continuous here; $E$ is continuous for a volume charge, discontinuous for a shell.' });
      }
      spots28.push({ id: 'Vplot', kind: 'rect', x: plotL - 8, y: plotT - 8, w: plotW + 16, h: plotH + 16, title: 'Potential $V(r)$', body: 'Teal: live $V$. Dashed: point-charge $kQ/r$. They meet outside a spherical source. Gold line is the probe.' });
      PGRE.setVizHotspots(spots28);
    },
    challenge: {
      question: "A solid insulating sphere of radius $R$ carries a total positive charge $Q$ distributed uniformly throughout its volume. What is the ratio of the electric potential at the exact center of the sphere $V(r = 0)$ to the electric potential at the surface of the sphere $V(r = R)$, with the reference potential set at infinity $V(\\infty) = 0$?",
      options: [
        "$V(0) / V(R) = 1.0$ (Potential is uniform throughout)",
        "$V(0) / V(R) = 1.5$ ($3/2$)",
        "$V(0) / V(R) = 2.0$ (Twice the surface potential)",
        "$V(0) / V(R) = 0.5$ (Half the surface potential)",
        "$V(0) / V(R) = 4/3$"
      ],
      correct: 1,
      explanation: "By integrating the Poisson kernel or using $V(0) = -\\int_{\\infty}^{0} E(r)\\, dr$:\n" +
        "1. Outside ($r \\ge R$): $E(r) = kQ/r^2$, so $V(R) = -\\int_{\\infty}^{R} (kQ/r^2)\\, dr = kQ/R$.\n" +
        "2. Inside ($r < R$): Gauss's law gives $E(r) = kQ r / R^3$.\n" +
        "3. Center potential: $V(0) = V(R) - \\int_R^0 E_{\\mathrm{in}}(r)\\, dr = kQ/R + \\int_0^R (kQ r / R^3)\\, dr = kQ/R + kQ/(2R) = (3/2) kQ/R = 1.5\\, V(R)$.\n" +
        "Thus the central potential is exactly $3/2$ times the surface potential."
    }
  };

  /* -------------------------------------------------------------------------- */
  /* cpgf-2.14: Electric Boundary Condition E_out^∥ − E_in^∥ = 0              */
  /* -------------------------------------------------------------------------- */
  PGRE.visualizers['cpgf-2.14'] = {
    id: 'cpgf-2.14',
    topic: 'em',
    title: 'Electric Boundary Condition: Tangential Component $E_{\\mathrm{out}}^\\parallel - E_{\\mathrm{in}}^\\parallel = 0$',
    formulaLatex: 'E_{\\mathrm{out}}^\\parallel - E_{\\mathrm{in}}^\\parallel = 0 \\iff \\oint_C \\mathbf{E}\\cdot d\\boldsymbol{\\ell}=0',
    physicalStory: `
Electrostatics has no circulation: $\\nabla\\times\\mathbf{E}=0$. Take a thin rectangular loop $C$ straddling the surface, with its long sides parallel to the interface. The two long sides contribute the tangential fields; the short sides vanish as the loop height $h\\to 0$.

Therefore the line integral forces $E_{\\mathrm{out}}^\\parallel-E_{\\mathrm{in}}^\\parallel=0$. A surface charge may change the normal component, but it cannot make the tangential electric field jump. The picture keeps the teal tangential arrows equal while the coral normal pieces may change.
    `.trim(),
    derivationSteps: [
      { step: 1, title: "Electrostatic Curl", latex: "\\nabla\\times\\mathbf{E}=0", description: "The electrostatic field is conservative, so its circulation around every closed loop vanishes." },
      { step: 2, title: "Thin Amperian-Style Loop", latex: "\\oint_C \\mathbf{E}\\cdot d\\boldsymbol{\\ell}=0", description: "Choose a rectangle crossing the interface with long sides parallel to the surface." },
      { step: 3, title: "Four-Side Decomposition", latex: "(E_{\\mathrm{out}}^\\parallel-E_{\\mathrm{in}}^\\parallel)\\,\\Delta \\ell + \\Phi_{\\mathrm{short}}=0", description: "The two long sides have opposite orientations; the short sides carry the normal field." },
      { step: 4, title: "Vanishing Short Sides", latex: "\\Phi_{\\mathrm{short}}\\to 0\\qquad(h\\to 0)", description: "The short-side lengths shrink with the loop height, so their contributions disappear." },
      { step: 5, title: "Tangential Continuity", latex: "E_{\\mathrm{out}}^\\parallel-E_{\\mathrm{in}}^\\parallel=0", description: "The tangential electric field is continuous across any electrostatic interface." }
    ],
    limitingCases: [
      { name: "No Surface Charge", condition: "\\sigma=0", formula: "\\mathbf{E}_{\\mathrm{out}}=\\mathbf{E}_{\\mathrm{in}}", description: "Both normal and tangential components match, so the field crosses without a kink." },
      { name: "Charged Sheet", condition: "\\sigma\\ne 0", formula: "E_{\\mathrm{out}}^\\perp-E_{\\mathrm{in}}^\\perp=\\sigma/\\epsilon_0", description: "The sheet changes only the normal component; $E^\\parallel$ remains continuous." },
      { name: "Conductor Surface", condition: "\\mathbf{E}_{\\mathrm{in}}=0", formula: "E_{\\mathrm{out}}^\\parallel=0", description: "Since the field inside an ideal conductor is zero, continuity makes the field just outside purely normal." },
      { name: "Vanishing Loop", condition: "h\\to 0", formula: "\\oint_C\\mathbf{E}\\cdot d\\boldsymbol{\\ell}=0", description: "Shrinking the short sides isolates the equality of the two tangential components." }
    ],
    greTraps: [
      { trap: "Applying the Surface-Charge Jump to the Wrong Component", warning: "$\\sigma/\\epsilon_0$ changes $E^\\perp$, not $E^\\parallel$. The tangential difference is always zero." },
      { trap: "Using the Isolated-Sheet Field as the Jump", warning: "Each side of an isolated sheet has magnitude $\\sigma/(2\\epsilon_0)$, but the normal discontinuity is $\\sigma/\\epsilon_0$." },
      { trap: "Confusing Electrostatics with Magnetostatics", warning: "For electrostatic $\\mathbf{E}$, $E^\\parallel$ is continuous. A free surface current instead changes the tangential magnetic-field rule." },
      { trap: "Forgetting the Loop Orientation", warning: "The two long sides of $C$ have opposite directions, producing $E_{\\mathrm{out}}^\\parallel-E_{\\mathrm{in}}^\\parallel$ rather than a sum." }
    ],
    parameters: [
      { id: 'eField', label: 'Incident $|\\mathbf{E}_{\\mathrm{in}}|$', min: 1.0, max: 5.0, step: 0.5, default: 3.0, unit: 'V/m', hint: 'Magnitude just below the interface. Its tangential piece is $E^\\parallel=|E|\\sin\\theta$ and is copied unchanged above the surface.' },
      { id: 'thetaIn', label: 'Incident angle $\\theta_{\\mathrm{in}}$', min: 0, max: 70, step: 5, default: 35, unit: 'deg', hint: 'Angle from the surface normal. Larger $\\theta$ gives a larger continuous tangential component $E^\\parallel$.' },
      { id: 'sigmaJump', label: 'Normal jump $\\sigma/\\epsilon_0$', min: -4.0, max: 4.0, step: 0.5, default: 2.0, unit: 'V/m', hint: 'Changes only $E^\\perp$: $E_{\\mathrm{out}}^\\perp-E_{\\mathrm{in}}^\\perp=\\sigma/\\epsilon_0$. It cannot change $E^\\parallel$.' },
      { id: 'simSpeed', label: 'Simulation Speed', min: 0.2, max: 3.0, step: 0.2, default: 1.0, unit: 'x' }
    ],
    init: function (container, state) {
      if (state.eField == null || isNaN(state.eField)) state.eField = 3.0;
      if (state.thetaIn == null || isNaN(state.thetaIn)) state.thetaIn = 35;
      if (state.sigmaJump == null || isNaN(state.sigmaJump)) state.sigmaJump = 2.0;
      if (state.simSpeed == null || isNaN(state.simSpeed)) state.simSpeed = 1.0;
      state.animTime = state.animTime || 0;
    },
    draw: function (ctx, width, height, state, dt) {
      state = state || {};
      state.animTime = (state.animTime || 0) + scaledDt(dt, state);
      var t = state.animTime;
      var eField = Number(state.eField); if (!isFinite(eField)) eField = 3.0;
      var thetaDeg = Number(state.thetaIn); if (!isFinite(thetaDeg)) thetaDeg = 35;
      var sigmaJump = Number(state.sigmaJump); if (!isFinite(sigmaJump)) sigmaJump = 2.0;
      var theta = thetaDeg * Math.PI / 180;
      var ePar = eField * Math.sin(theta);
      var eNormIn = eField * Math.cos(theta);
      var eNormOut = eNormIn + sigmaJump;
      var eOutMag = Math.hypot(ePar, eNormOut);

      fillCream(ctx, width, height);
      var ifaceY = Math.round(height * 0.53);
      ctx.fillStyle = PANEL;
      ctx.fillRect(0, 0, width, ifaceY);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, ifaceY);
      ctx.lineTo(width, ifaceY);
      ctx.stroke();
      inkLabel(ctx, 'out', 18, ifaceY - 18, { color: MUTED, width: width, height: height, font: FONT_SM });
      inkLabel(ctx, 'in', 18, ifaceY + 18, { color: MUTED, width: width, height: height, font: FONT_SM });
      inkLabel(ctx, 'surface', width - 18, ifaceY - 14, { color: CORAL, align: 'right', width: width, height: height, font: FONT_SM });

      /* Field traces share the same tangential component on both sides. */
      var lineCount = 5;
      var lineGap = Math.max(34, (width - 90) / lineCount);
      var lineX, lineY, lineLen = Math.min(150, width * 0.28);
      var uxIn = ePar / Math.max(eField, 1e-6);
      var uyIn = -eNormIn / Math.max(eField, 1e-6);
      var outDen = Math.max(eOutMag, 1e-6);
      var uxOut = ePar / outDen;
      var uyOut = -eNormOut / outDen;
      for (var li = 0; li < lineCount; li++) {
        lineX = 70 + li * lineGap;
        lineY = ifaceY + 66;
        drawSiteArrow(ctx, lineX - uxIn * lineLen * 0.5, lineY - uyIn * lineLen * 0.5,
          lineX + uxIn * lineLen * 0.5, lineY + uyIn * lineLen * 0.5, GOLD, 1.5);
        lineY = ifaceY - 66;
        drawSiteArrow(ctx, lineX - uxOut * lineLen * 0.5, lineY - uyOut * lineLen * 0.5,
          lineX + uxOut * lineLen * 0.5, lineY + uyOut * lineLen * 0.5, GOLD, 1.5);
      }

      /* Decomposed vectors: teal tangential pieces match; coral normal pieces may jump. */
      var vScale = Math.min(18, width / 34);
      var vx = Math.max(100, width * 0.24);
      var yIn = ifaceY + 88;
      var yOut = ifaceY - 88;
      var tanLen = Math.max(18, ePar * vScale);
      var normInLen = Math.max(18, Math.abs(eNormIn) * vScale);
      var normOutLen = Math.max(18, Math.abs(eNormOut) * vScale);
      drawSiteArrow(ctx, vx - tanLen, yIn, vx, yIn, TEAL, 2.8);
      drawSiteArrow(ctx, vx, yOut, vx + tanLen, yOut, TEAL, 2.8);
      drawSiteArrow(ctx, vx, yIn, vx, yIn - Math.sign(eNormIn || 1) * normInLen, CORAL, 2.0);
      drawSiteArrow(ctx, vx, yOut, vx, yOut - Math.sign(eNormOut || 1) * normOutLen, CORAL, 2.0);
      inkLabel(ctx, 'in', vx - tanLen - 6, yIn + 14, { color: TEAL, align: 'right', width: width, height: height, font: FONT_SM });
      inkLabel(ctx, 'out', vx + tanLen + 6, yOut - 14, { color: TEAL, align: 'left', width: width, height: height, font: FONT_SM });

      /* Thin rectangular loop C, animated toward h -> 0. */
      var loopCx = width * 0.68;
      var loopW = Math.min(180, width * 0.30);
      var hPulse = 16 + 14 * (0.5 + 0.5 * Math.cos(t * 1.2));
      var xL = loopCx - loopW * 0.5, xR = loopCx + loopW * 0.5;
      var yT = ifaceY - hPulse, yB = ifaceY + hPulse;
      ctx.save();
      ctx.strokeStyle = TEAL;
      ctx.lineWidth = 2.3;
      ctx.setLineDash([5, 3]);
      ctx.strokeRect(xL, yT, loopW, yB - yT);
      ctx.setLineDash([]);
      ctx.restore();
      drawSiteArrow(ctx, xL + 18, yT, xR - 18, yT, TEAL, 2.3);
      drawSiteArrow(ctx, xR - 18, yB, xL + 18, yB, TEAL, 2.3);
      inkLabel(ctx, 'C', xR + 10, yT + 4, { color: TEAL, width: width, height: height, font: '600 12px Inter, sans-serif' });
      inkLabel(ctx, 'h', xR + 10, ifaceY, { color: MUTED, width: width, height: height, font: FONT_SM });

      appendLegend('$E^\\parallel$ is continuous', [
        { label: '$E_{\\mathrm{in}}^\\parallel$', value: '$' + ePar.toFixed(2) + '\\,\\mathrm{V/m}$', hint: 'Tangential field just inside. It is the teal lower arrow: $E_{\\mathrm{in}}^\\parallel=|E|\\sin\\theta=' + ePar.toFixed(2) + '\\,\\mathrm{V/m}$.' },
        { label: '$E_{\\mathrm{out}}^\\parallel$', value: '$' + ePar.toFixed(2) + '\\,\\mathrm{V/m}$', hint: 'Tangential field just outside. It has the same value as inside, regardless of $\\sigma$.' },
        { label: '$\\Delta E^\\parallel$', value: '$0$ (always)', hint: 'The boundary condition: $E_{\\mathrm{out}}^\\parallel-E_{\\mathrm{in}}^\\parallel=0$.' },
        { label: '$\\oint_C\\mathbf{E}\\cdot d\\boldsymbol{\\ell}$', value: '$0$', hint: 'Electrostatic circulation vanishes. The long sides cancel because their tangential fields match; the short sides vanish as $h\\to0$.' },
        { label: '$\\Delta E^\\perp$', value: '$' + sigmaJump.toFixed(2) + '\\,\\mathrm{V/m}$', hint: 'Context only: the normal component may jump by $\\sigma/\\epsilon_0=' + sigmaJump.toFixed(2) + '\\,\\mathrm{V/m}$ while the tangential component stays fixed.' }
      ]);

      PGRE.setVizHotspots([
        { id: 'tanIn', kind: 'segment', x1: vx - tanLen, y1: yIn, x2: vx, y2: yIn, halfW: 9, title: '$E_{\\mathrm{in}}^\\parallel$', body: 'Teal lower arrow: $E_{\\mathrm{in}}^\\parallel=' + ePar.toFixed(2) + '\\,\\mathrm{V/m}$.' },
        { id: 'tanOut', kind: 'segment', x1: vx, y1: yOut, x2: vx + tanLen, y2: yOut, halfW: 9, title: '$E_{\\mathrm{out}}^\\parallel$', body: 'Teal upper arrow: $E_{\\mathrm{out}}^\\parallel=' + ePar.toFixed(2) + '\\,\\mathrm{V/m}=E_{\\mathrm{in}}^\\parallel$.' },
        { id: 'loop', kind: 'rect', x: xL - 8, y: yT - 8, w: loopW + 16, h: yB - yT + 16, title: 'Thin loop $C$', body: 'The long sides run parallel to the interface. Their contributions cancel; the short sides vanish as $h=' + (yB - yT).toFixed(0) + '\\,\\mathrm{px}\\to0$.' },
        { id: 'surface', kind: 'segment', x1: 0, y1: ifaceY, x2: width, y2: ifaceY, halfW: 10, title: 'Interface', body: 'A surface charge can change $E^\\perp$, but electrostatics requires $E_{\\mathrm{out}}^\\parallel-E_{\\mathrm{in}}^\\parallel=0$.' },
        { id: 'normalIn', kind: 'segment', x1: vx, y1: yIn, x2: vx, y2: yIn - Math.sign(eNormIn || 1) * normInLen, halfW: 7, title: '$E_{\\mathrm{in}}^\\perp$', body: 'Coral lower arrow: $E_{\\mathrm{in}}^\\perp=' + eNormIn.toFixed(2) + '\\,\\mathrm{V/m}$. This is the component a surface charge can change.' },
        { id: 'normalOut', kind: 'segment', x1: vx, y1: yOut, x2: vx, y2: yOut - Math.sign(eNormOut || 1) * normOutLen, halfW: 7, title: '$E_{\\mathrm{out}}^\\perp$', body: 'Coral upper arrow: $E_{\\mathrm{out}}^\\perp=' + eNormOut.toFixed(2) + '\\,\\mathrm{V/m}$.' },
        { id: 'out', kind: 'rect', x: 0, y: 0, w: width, h: ifaceY, title: 'Outside region', body: 'Above the interface. Gold field traces bend when the normal component changes, but their tangential component is continuous.' },
        { id: 'in', kind: 'rect', x: 0, y: ifaceY, w: width, h: height - ifaceY, title: 'Inside region', body: 'Below the interface. The lower teal arrow supplies the same tangential component as above.' }
      ]);
    },
    challenge: {
      question: "A rectangular loop straddles an electrostatic interface. The tangential field just inside is $E_{\\mathrm{in}}^\\parallel=4\\,\\mathrm{V/m}$, and the surface carries charge density $\\sigma$ with $\\sigma/\\epsilon_0=3\\,\\mathrm{V/m}$. What is $E_{\\mathrm{out}}^\\parallel$?",
      options: [
        "$E_{\\mathrm{out}}^\\parallel=4\\,\\mathrm{V/m}$",
        "$E_{\\mathrm{out}}^\\parallel=7\\,\\mathrm{V/m}$",
        "$E_{\\mathrm{out}}^\\parallel=1\\,\\mathrm{V/m}$",
        "$E_{\\mathrm{out}}^\\parallel=3\\,\\mathrm{V/m}$",
        "$E_{\\mathrm{out}}^\\parallel=0$"
      ],
      correct: 0,
      explanation: "The thin-loop argument uses $\\oint_C\\mathbf{E}\\cdot d\\boldsymbol{\\ell}=0$, so $E_{\\mathrm{out}}^\\parallel-E_{\\mathrm{in}}^\\parallel=0$. Therefore $E_{\\mathrm{out}}^\\parallel=4\\,\\mathrm{V/m}$. The surface charge changes the normal component by $\\sigma/\\epsilon_0=3\\,\\mathrm{V/m}$, not the tangential component."
    }
  };

  /* -------------------------------------------------------------------------- */
  /* cpgf-2.15: Electric Boundary Condition E_out^⊥ − E_in^⊥ = σ/ε₀              */
  /* -------------------------------------------------------------------------- */
  PGRE.visualizers['cpgf-2.15'] = {
    id: 'cpgf-2.15',
    topic: 'em',
    title: 'Electric Boundary Condition: Normal Component $E_{\\mathrm{out}}^\\perp - E_{\\mathrm{in}}^\\perp = \\sigma/\\epsilon_0$',
    formulaLatex: 'E_{\\mathrm{out}}^\\perp - E_{\\mathrm{in}}^\\perp = \\frac{\\sigma}{\\epsilon_0} \\iff \\oint_{\\mathcal{S}} \\mathbf{E} \\cdot d\\mathbf{a} = \\frac{Q_{\\mathrm{enc}}}{\\epsilon_0}',
    physicalStory: `
$\\nabla\\cdot\\mathbf{E}=\\rho/\\epsilon_0$: electric field lines begin and end on charge. A Gaussian pillbox straddling a sheet of charge $\\sigma$ therefore catches net flux, forcing the normal component to jump by $\\sigma/\\epsilon_0$ while the tangential component stays continuous ($\\nabla\\times\\mathbf{E}=0$). The sheet's own field is only $\\sigma/2\\epsilon_0$ on each side — the difference between the two sides is the full $\\sigma/\\epsilon_0$.
    `.trim(),
    derivationSteps: [
      { step: 1, title: "Differential Gauss's Law", latex: "\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\epsilon_0}", description: "Charge density is the local source of $\\mathbf{E}$: field lines start on positive charge and end on negative charge." },
      { step: 2, title: "Divergence Theorem over a Gaussian Pillbox", latex: "\\oint_{\\mathcal{S}} \\mathbf{E} \\cdot d\\mathbf{a} = \\frac{Q_{\\mathrm{enc}}}{\\epsilon_0} = \\frac{\\sigma\\,\\Delta A}{\\epsilon_0}", description: "A pillbox of cap area $\\Delta A$ and height $h$ straddles the sheet and encloses charge $\\sigma\\Delta A$." },
      { step: 3, title: "Flux Decomposition Across Caps and Rim", latex: "(E_{\\mathrm{out}}^\\perp - E_{\\mathrm{in}}^\\perp)\\,\\Delta A + \\Phi_{\\mathrm{rim}} = \\frac{\\sigma\\,\\Delta A}{\\epsilon_0}", description: "Outward normals on the two caps are opposite, so the cap fluxes enter with opposite signs." },
      { step: 4, title: "Vanishing Rim Limit $h\\to 0$", latex: "\\Phi_{\\mathrm{rim}} \\to 0", description: "The lateral area shrinks to zero; only the two caps contribute." },
      { step: 5, title: "Normal Jump, Tangential Continuity", latex: "E_{\\mathrm{out}}^\\perp - E_{\\mathrm{in}}^\\perp = \\frac{\\sigma}{\\epsilon_0}, \\qquad \\mathbf{E}_{\\mathrm{out}}^{\\parallel} = \\mathbf{E}_{\\mathrm{in}}^{\\parallel}", description: "The normal component is discontinuous by exactly $\\sigma/\\epsilon_0$; the parallel component never jumps (from $\\nabla\\times\\mathbf{E}=0$ applied to a thin Amperian-style loop)." }
    ],
    limitingCases: [
      { name: "Uncharged Interface", condition: "\\sigma = 0", formula: "\\mathbf{E}_{\\mathrm{out}} = \\mathbf{E}_{\\mathrm{in}}", description: "No kink: field lines pass straight through." },
      { name: "Isolated Sheet, Symmetric Field", condition: "E_{\\mathrm{in}}^\\perp = -E_{\\mathrm{out}}^\\perp", formula: "E_{\\mathrm{out}}^\\perp = \\frac{\\sigma}{2\\epsilon_0}", description: "Recovering the infinite-sheet result: the jump is shared symmetrically." },
      { name: "Conductor Surface", condition: "\\mathbf{E}_{\\mathrm{in}} = 0", formula: "E_{\\mathrm{out}}^\\perp = \\frac{\\sigma}{\\epsilon_0}", description: "Field just outside a conductor is normal to the surface with magnitude $\\sigma/\\epsilon_0$." },
      { name: "Field Reversal", condition: "\\sigma/\\epsilon_0 < -E_{\\mathrm{in}}^\\perp", formula: "E_{\\mathrm{out}}^\\perp < 0", description: "A strong negative sheet flips the normal component: above the sheet the field points back down into it." }
    ],
    greTraps: [
      { trap: "Confusing the Jump with the Sheet Field", warning: "$\\sigma/\\epsilon_0$ is the discontinuity $E_{\\mathrm{out}}^\\perp - E_{\\mathrm{in}}^\\perp$. An isolated sheet's field on one side is only $\\sigma/2\\epsilon_0$." },
      { trap: "Swapping Normal and Tangential Rules", warning: "Electrostatics: $E^\\parallel$ continuous, $E^\\perp$ jumps by $\\sigma/\\epsilon_0$. Magnetostatics is the mirror image: $B^\\perp$ continuous, $H^\\parallel$ jumps by $K_f$." },
      { trap: "Dropping the Sign of $\\sigma$", warning: "Negative $\\sigma$ makes $E_{\\mathrm{out}}^\\perp < E_{\\mathrm{in}}^\\perp$; field lines terminate on the sheet instead of starting there." },
      { trap: "Applying the Jump to $D$ in Vacuum", warning: "$\\sigma/\\epsilon_0$ multiplies into $E$, not $D$. In dielectrics the continuous quantity is $D^\\perp$ minus free surface charge." }
    ],
    parameters: [
      { id: 'eField', label: 'Incident $|\\mathbf{E}_{\\mathrm{in}}|$', min: 1.0, max: 5.0, step: 0.5, default: 3.0, unit: 'V/m', hint: 'Magnitude of $\\mathbf{E}$ just below the sheet. Split into $E^\\perp=|E|\\cos\\theta$ (jumps) and $E^\\parallel=|E|\\sin\\theta$ (continuous).' },
      { id: 'thetaIn', label: 'Incident angle $\\theta_{\\mathrm{in}}$', min: 0, max: 70, step: 5, default: 35, unit: 'deg', hint: 'Angle from the surface normal. $\\theta=0$ is pure normal incidence: the whole field jumps by $\\sigma/\\epsilon_0$.' },
      { id: 'sigmaJump', label: 'Sheet jump $\\sigma/\\epsilon_0$', min: -4.0, max: 4.0, step: 0.5, default: 2.0, unit: 'V/m', hint: 'The discontinuity $E_{\\mathrm{out}}^\\perp-E_{\\mathrm{in}}^\\perp=\\sigma/\\epsilon_0$. Not the one-sided sheet field $\\sigma/2\\epsilon_0$. Negative $\\sigma$ terminates field lines.' },
      { id: 'simSpeed', label: 'Simulation Speed', min: 0.2, max: 3.0, step: 0.2, default: 1.0, unit: 'x' }
    ],
    init: function (container, state) {
      if (state.eField == null || isNaN(state.eField)) state.eField = 3.0;
      if (state.thetaIn == null || isNaN(state.thetaIn)) state.thetaIn = 35;
      if (state.sigmaJump == null || isNaN(state.sigmaJump)) state.sigmaJump = 2.0;
      if (state.simSpeed == null || isNaN(state.simSpeed)) state.simSpeed = 1.0;
      state.animTime = state.animTime || 0;
    },
    draw: function (ctx, width, height, state, dt) {
      state = state || {};
      var dtp = scaledDt(dt, state);
      state.animTime = (state.animTime || 0) + dtp;
      var t = state.animTime;
      var eField = Number(state.eField); if (!isFinite(eField)) eField = 3.0;
      var thetaInDeg = Number(state.thetaIn); if (!isFinite(thetaInDeg)) thetaInDeg = 35;
      var sigmaJump = Number(state.sigmaJump); if (!isFinite(sigmaJump)) sigmaJump = 2.0;

      fillCream(ctx, width, height);

      var th1 = (thetaInDeg * Math.PI) / 180;
      var E1perp = eField * Math.cos(th1);
      var E1par = eField * Math.sin(th1);
      var E2perp = E1perp + sigmaJump;
      var E2par = E1par;
      var E2mag = Math.hypot(E2par, E2perp);
      var th2 = Math.atan2(E2par, Math.max(1e-4, Math.abs(E2perp)));
      var thetaOutDeg = (th2 * 180) / Math.PI;

      var ifaceY = Math.round(height * 0.52);
      ctx.fillStyle = PANEL;
      ctx.fillRect(0, ifaceY, width, height - ifaceY);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, ifaceY);
      ctx.lineTo(width, ifaceY);
      ctx.stroke();

      inkLabel(ctx, 'out', 18, ifaceY - 18, { color: MUTED, width: width, height: height, font: FONT_SM });
      inkLabel(ctx, 'in', 18, ifaceY + 18, { color: MUTED, width: width, height: height, font: FONT_SM });

      /* Field lines: traced per region, clipped to that region. Line spacing
         scales with 1/|E| so the density change across the sheet is visible;
         lines begin (sigma > 0) or end (sigma < 0) on the sheet. */
      function drawRegionLines(Epar, Eperp, yMin, yMax, phase) {
        var mag = Math.hypot(Epar, Eperp);
        if (mag < 0.15) return;
        var ux = Epar / mag, uy = -Eperp / mag; /* canvas y grows downward */
        var spacing = clamp(150 / mag, 42, 160);
        var cx = width * 0.5;
        var maxOff = width * 0.75 + Math.abs(ux) * (yMax - yMin);
        var off, x0, y0, tA, tB, xa, ya, xb, yb;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, yMin, width, yMax - yMin);
        ctx.clip();
        for (off = -maxOff; off <= maxOff; off += spacing) {
          x0 = cx + off; y0 = ifaceY;
          tA = -1e9; tB = 1e9;
          if (Math.abs(ux) > 1e-6) {
            var tx1 = (8 - x0) / ux, tx2 = (width - 8 - x0) / ux;
            tA = Math.max(tA, Math.min(tx1, tx2));
            tB = Math.min(tB, Math.max(tx1, tx2));
          } else if (x0 < 8 || x0 > width - 8) { continue; }
          if (Math.abs(uy) > 1e-6) {
            var ty1 = (yMin + 6 - y0) / uy, ty2 = (yMax - 6 - y0) / uy;
            tA = Math.max(tA, Math.min(ty1, ty2));
            tB = Math.min(tB, Math.max(ty1, ty2));
          } else {
            if (y0 < yMin + 6 || y0 > yMax - 6) continue;
          }
          if (tB - tA < 14) continue;
          xa = x0 + ux * tA; ya = y0 + uy * tA;
          xb = x0 + ux * tB; yb = y0 + uy * tB;
          ctx.strokeStyle = 'rgba(212,160,23,0.55)';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(xa, ya);
          ctx.lineTo(xb, yb);
          ctx.stroke();
          /* arrowhead at the along-field end */
          var ang = Math.atan2(yb - ya, xb - xa);
          var hd = 7;
          ctx.fillStyle = 'rgba(212,160,23,0.85)';
          ctx.beginPath();
          ctx.moveTo(xb, yb);
          ctx.lineTo(xb - hd * Math.cos(ang - Math.PI / 6), yb - hd * Math.sin(ang - Math.PI / 6));
          ctx.lineTo(xb - hd * Math.cos(ang + Math.PI / 6), yb - hd * Math.sin(ang + Math.PI / 6));
          ctx.closePath();
          ctx.fill();
          /* animated dot drifting along the field direction */
          var frac = (t * 0.4 + phase + off * 0.013) % 1;
          if (frac < 0) frac += 1;
          drawDot(ctx, xa + (xb - xa) * frac, ya + (yb - ya) * frac, 2.6, GOLD, null);
        }
        ctx.restore();
      }

      drawRegionLines(E1par, E1perp, ifaceY, height, 0);
      drawRegionLines(E2par, E2perp, 0, ifaceY, 0.37);

      /* Sheet charge markers: '+' for sigma > 0, '−' for sigma < 0 */
      var nCh = Math.round(clamp(Math.abs(sigmaJump) * 3, 0, 12));
      if (nCh > 0) {
        var chColor = sigmaJump > 0 ? CORAL : TEAL;
        var chSpan = Math.min(width - 120, nCh * 46);
        var chX0 = width * 0.5 - chSpan / 2;
        ctx.save();
        ctx.font = '600 13px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (var ci = 0; ci < nCh; ci++) {
          var chX = chX0 + (nCh === 1 ? chSpan / 2 : (ci / (nCh - 1)) * chSpan);
          drawDot(ctx, chX, ifaceY, 8, CREAM, chColor);
          ctx.fillStyle = chColor;
          ctx.fillText(sigmaJump > 0 ? '+' : '\u2212', chX, ifaceY);
        }
        ctx.restore();
      }

      var midX = width * 0.50;
      ctx.save();
      ctx.strokeStyle = inkFade(0.4);
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(midX, ifaceY - 70);
      ctx.lineTo(midX, ifaceY + 70);
      ctx.stroke();
      ctx.restore();
      drawSiteArrow(ctx, midX, ifaceY, midX, ifaceY - 40, INK, 1.8);
      inkLabel(ctx, 'n', midX + 12, ifaceY - 42, { color: INK, align: 'left', width: width, height: height, font: FONT_SM });

      /* Gaussian pillbox straddling the sheet; height breathes toward h -> 0 */
      var hPulse = 18 + 16 * (0.5 + 0.5 * Math.cos(t * 1.2));
      var pbW = Math.min(150, width * 0.22);
      var yTop = ifaceY - hPulse;
      var yBot = ifaceY + hPulse;
      ctx.save();
      ctx.fillStyle = 'rgba(204,120,92,0.08)';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(midX, yTop, pbW * 0.5, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(midX - pbW * 0.5, yTop);
      ctx.lineTo(midX - pbW * 0.5, yBot);
      ctx.moveTo(midX + pbW * 0.5, yTop);
      ctx.lineTo(midX + pbW * 0.5, yBot);
      ctx.stroke();
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.ellipse(midX, yBot, pbW * 0.5, 11, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      /* Vector decomposition at a point left of the pillbox:
         coral = normal components (jump by sigma/eps0),
         teal = tangential components (continuous), gold = total E. */
      var vScale = 11;
      var pyIn = Math.max(14, Math.abs(E1perp) * vScale);
      var pyOut = Math.max(14, Math.abs(E2perp) * vScale);
      var pxIn = E1par * vScale;
      var vx = midX - pbW * 0.5 - 36;
      if (vx < 70) vx = 70;

      /* normal components: below points up (+n), above points up if E2perp > 0 */
      drawSiteArrow(ctx, vx, ifaceY + pyIn, vx, ifaceY, CORAL, 2.4);
      if (E2perp >= 0) {
        drawSiteArrow(ctx, vx, ifaceY, vx, ifaceY - pyOut, CORAL, 2.4);
      } else {
        drawSiteArrow(ctx, vx, ifaceY - pyOut, vx, ifaceY, CORAL, 2.4);
      }
      inkLabel(ctx, 'E\u2099', vx - 10, ifaceY + pyIn * 0.5, { color: CORAL, align: 'right', width: width, height: height, font: '600 11px Inter, sans-serif' });
      inkLabel(ctx, 'E\u2099', vx - 10, ifaceY - pyOut * 0.5, { color: CORAL, align: 'right', width: width, height: height, font: '600 11px Inter, sans-serif' });

      /* tangential components: identical on both sides */
      drawSiteArrow(ctx, vx - pxIn, ifaceY + pyIn, vx, ifaceY + pyIn, TEAL, 2.0);
      drawSiteArrow(ctx, vx, ifaceY - pyOut, vx + pxIn, ifaceY - pyOut, TEAL, 2.0);

      /* total field vectors */
      drawSiteArrow(ctx, vx - pxIn, ifaceY + pyIn, vx, ifaceY, GOLD, 1.7);
      if (E2perp >= 0) {
        drawSiteArrow(ctx, vx, ifaceY, vx + pxIn, ifaceY - pyOut, GOLD, 1.7);
      } else {
        drawSiteArrow(ctx, vx + pxIn, ifaceY - pyOut, vx, ifaceY, GOLD, 1.7);
      }

      appendLegend('$E^\\perp$ jumps by $\\sigma/\\epsilon_0$', [
        { label: '$E_{\\mathrm{in}}^\\perp$', value: '$' + E1perp.toFixed(2) + '\\,\\mathrm{V/m}$', hint: 'Normal component just below the sheet, $E_{\\mathrm{in}}\\cos\\theta_{\\mathrm{in}}=' + E1perp.toFixed(2) + '\\,\\mathrm{V/m}$. Coral arrows.' },
        { label: '$E_{\\mathrm{out}}^\\perp$', value: '$' + E2perp.toFixed(2) + '\\,\\mathrm{V/m}$', hint: 'Normal component just above: $E_{\\mathrm{in}}^\\perp+\\sigma/\\epsilon_0=' + E2perp.toFixed(2) + '\\,\\mathrm{V/m}$. A large negative sheet can reverse it.' },
        { label: '$\\Delta E^\\perp$', value: '$' + sigmaJump.toFixed(2) + '\\,\\mathrm{V/m} = \\sigma/\\epsilon_0$', hint: 'Gauss pillbox: the jump equals $\\sigma/\\epsilon_0$, not $\\sigma/2\\epsilon_0$. The isolated-sheet field on one side is half of this.' },
        { label: '$E_{\\mathrm{in}}^\\parallel$', value: '$' + E1par.toFixed(2) + '\\,\\mathrm{V/m}$', hint: 'Tangential component below. $\\nabla\\times\\mathbf{E}=0$ forbids any jump in $E^\\parallel$.' },
        { label: '$E_{\\mathrm{out}}^\\parallel$', value: '$' + E2par.toFixed(2) + '\\,\\mathrm{V/m}$', hint: 'Tangential component above. Equal to $E_{\\mathrm{in}}^\\parallel$ for any $\\sigma$.' },
        { label: '$\\Delta E^\\parallel$', value: '$0$ (always)', hint: 'Always zero. Swapping this rule with the $E^\\perp$ jump is the classic GRE trap versus magnetostatics.' },
        { label: '$\\theta_{\\mathrm{in}} \\to \\theta_{\\mathrm{out}}$', value: '$' + thetaInDeg.toFixed(0) + '^\\circ \\to ' + thetaOutDeg.toFixed(0) + '^\\circ$', hint: 'The sheet kinks the field: $\\theta_{\\mathrm{out}}=\\mathrm{atan2}(E^\\parallel,|E_{\\mathrm{out}}^\\perp|)$. Live: $' + thetaInDeg.toFixed(0) + '^\\circ\\to' + thetaOutDeg.toFixed(0) + '^\\circ$.' },
        { label: '$Q_{\\mathrm{enc}}/\\Delta A$', value: '$\\sigma$', hint: 'Pillbox enclosed charge per cap area. Flux $(E_{\\mathrm{out}}^\\perp-E_{\\mathrm{in}}^\\perp)\\Delta A=\\sigma\\Delta A/\\epsilon_0$.' }
      ]);

      var spots215 = [
        { id: 'Ein', kind: 'segment', x1: vx - pxIn, y1: ifaceY + pyIn, x2: vx, y2: ifaceY, halfW: 8, title: 'Incident $\\mathbf{E}_{\\mathrm{in}}$', body: '$|\\mathbf{E}_{\\mathrm{in}}|=' + eField.toFixed(2) + '\\,\\mathrm{V/m}$ at $\\theta_{\\mathrm{in}}=' + thetaInDeg.toFixed(0) + '^\\circ$. Gold = total; coral $E^\\perp$, teal $E^\\parallel$.' },
        { id: 'Eout', kind: 'segment', x1: vx, y1: ifaceY, x2: vx + pxIn, y2: ifaceY - pyOut, halfW: 8, title: 'Transmitted $\\mathbf{E}_{\\mathrm{out}}$', body: '$|\\mathbf{E}_{\\mathrm{out}}|=' + E2mag.toFixed(2) + '\\,\\mathrm{V/m}$ at $\\theta_{\\mathrm{out}}=' + thetaOutDeg.toFixed(0) + '^\\circ$. Only the normal piece jumped.' },
        { id: 'EnIn', kind: 'segment', x1: vx, y1: ifaceY + pyIn, x2: vx, y2: ifaceY, halfW: 7, title: 'Normal $E_{\\mathrm{in}}^\\perp$', body: '$E_{\\mathrm{in}}^\\perp=' + E1perp.toFixed(2) + '\\,\\mathrm{V/m}$. This is the piece Gauss constrains.' },
        { id: 'EnOut', kind: 'segment', x1: vx, y1: ifaceY, x2: vx, y2: ifaceY - pyOut, halfW: 7, title: 'Normal $E_{\\mathrm{out}}^\\perp$', body: '$E_{\\mathrm{out}}^\\perp=' + E2perp.toFixed(2) + '\\,\\mathrm{V/m}=' + E1perp.toFixed(2) + '+' + sigmaJump.toFixed(2) + '$.' },
        { id: 'nhat', kind: 'segment', x1: midX, y1: ifaceY, x2: midX, y2: ifaceY - 40, halfW: 7, title: 'Surface normal $\\hat{\\mathbf{n}}$', body: 'Points from in (below) to out (above). $E^\\perp=\\mathbf{E}\\cdot\\hat{\\mathbf{n}}$.' },
        { id: 'pillbox', kind: 'rect', x: midX - pbW * 0.5, y: yTop - 11, w: pbW, h: (yBot - yTop) + 22, title: 'Gaussian pillbox', body: 'Caps catch $E^\\perp$; rim $\\to 0$ as $h\\to 0$. Flux jump is $\\sigma/\\epsilon_0=' + sigmaJump.toFixed(2) + '\\,\\mathrm{V/m}$.' },
        { id: 'sheet', kind: 'segment', x1: 0, y1: ifaceY, x2: width, y2: ifaceY, halfW: 10, title: 'Surface charge $\\sigma$', body: (sigmaJump === 0 ? 'Uncharged interface: $\\mathbf{E}$ does not kink.' : (sigmaJump > 0 ? 'Positive sheet: field lines begin here. ' : 'Negative sheet: field lines end here. ') + '$\\sigma/\\epsilon_0=' + sigmaJump.toFixed(2) + '\\,\\mathrm{V/m}$.') },
        { id: 'out', kind: 'rect', x: 0, y: 0, w: width, h: ifaceY, title: 'Out region', body: 'Above the sheet. Line density $\\propto |\\mathbf{E}_{\\mathrm{out}}|=' + E2mag.toFixed(2) + '\\,\\mathrm{V/m}$.' },
        { id: 'in', kind: 'rect', x: 0, y: ifaceY, w: width, h: height - ifaceY, title: 'In region', body: 'Below the sheet. $|\\mathbf{E}_{\\mathrm{in}}|=' + eField.toFixed(2) + '\\,\\mathrm{V/m}$ at $\\theta_{\\mathrm{in}}=' + thetaInDeg.toFixed(0) + '^\\circ$.' }
      ];
      PGRE.setVizHotspots(spots215);
    },
    challenge: {
      question: "A flat sheet at $z = 0$ carries uniform surface charge density $\\sigma$, with $\\sigma/\\epsilon_0 = 2\\;\\mathrm{V/m}$. The electric field just below the sheet is $\\mathbf{E}_{\\mathrm{in}} = 4\\hat{\\mathbf{x}} + 3\\hat{\\mathbf{z}}\\;\\mathrm{V/m}$, where $\\hat{\\mathbf{z}}$ points from below to above the sheet. What is the field $\\mathbf{E}_{\\mathrm{out}}$ just above the sheet?",
      options: [
        "$\\mathbf{E}_{\\mathrm{out}} = 4\\hat{\\mathbf{x}} + 5\\hat{\\mathbf{z}}\\;\\mathrm{V/m}$",
        "$\\mathbf{E}_{\\mathrm{out}} = 4\\hat{\\mathbf{x}} + 1\\hat{\\mathbf{z}}\\;\\mathrm{V/m}$",
        "$\\mathbf{E}_{\\mathrm{out}} = 6\\hat{\\mathbf{x}} + 3\\hat{\\mathbf{z}}\\;\\mathrm{V/m}$",
        "$\\mathbf{E}_{\\mathrm{out}} = 4\\hat{\\mathbf{x}} + 4\\hat{\\mathbf{z}}\\;\\mathrm{V/m}$",
        "$\\mathbf{E}_{\\mathrm{out}} = 2\\hat{\\mathbf{x}} + 5\\hat{\\mathbf{z}}\\;\\mathrm{V/m}$"
      ],
      correct: 0,
      explanation: "1. Normal component: the boundary condition $E_{\\mathrm{out}}^\\perp - E_{\\mathrm{in}}^\\perp = \\sigma/\\epsilon_0$ gives $E_{\\mathrm{out},z} = 3 + 2 = 5\\;\\mathrm{V/m}$.\n" +
        "2. Tangential component: $\\mathbf{E}^\\parallel$ is continuous across any surface, so $E_{\\mathrm{out},x} = E_{\\mathrm{in},x} = 4\\;\\mathrm{V/m}$.\n" +
        "Combining: $\\mathbf{E}_{\\mathrm{out}} = 4\\hat{\\mathbf{x}} + 5\\hat{\\mathbf{z}}\\;\\mathrm{V/m}$. The trap answers add $\\sigma/\\epsilon_0$ to the wrong component, subtract it, or use the isolated-sheet value $\\sigma/2\\epsilon_0 = 1\\;\\mathrm{V/m}$ as the jump."
    }
  };

  /* -------------------------------------------------------------------------- */
  /* cpgf-2.32: Toroid B = μ₀ N I / (2π r)                                       */
  /* Picture: top-down toroid. Core annulus shaded; Amperian circle at probe r;  */
  /* B arrows only inside the core. Outside and central hole stay B = 0.         */
  /* -------------------------------------------------------------------------- */
  PGRE.visualizers['cpgf-2.32'] = {
    id: 'cpgf-2.32',
    topic: 'em',
    title: 'Magnetic Field Inside a Toroid: $B = \\mu_0 N I / (2\\pi r)$',
    formulaLatex: 'B = \\frac{\\mu_0 N I}{2\\pi r}\\qquad (R - a < r < R + a)',
    physicalStory: `
A tightly wound toroid is a solenoid bent into a circle. Ampère's law on a concentric loop of radius $r$ gives
$$\\oint \\mathbf{B}\\cdot d\\boldsymbol{\\ell} = B\\,2\\pi r = \\mu_0 I_{\\mathrm{enc}}.$$
Only when the loop sits inside the core does it enclose all $N$ turns, so $I_{\\mathrm{enc}}=NI$ and
$$B=\\frac{\\mu_0 NI}{2\\pi r}.$$
In the central hole and outside the outer rim, net enclosed current is zero, so $B\\approx 0$ (ideal dense winding). Unlike the infinite solenoid, $B$ still falls as $1/r$ across the tube.
    `.trim(),
    derivationSteps: [
      {
        step: 1,
        title: "Symmetry of the tightly wound toroid",
        latex: '\\mathbf{B} = B_\\phi(r)\\,\\hat{\\boldsymbol{\\phi}}',
        description: 'Azimuthal field; magnitude depends only on the cylindrical radius from the toroid center.'
      },
      {
        step: 2,
        title: "Ampère loop concentric with the toroid",
        latex: '\\oint_C \\mathbf{B}\\cdot d\\boldsymbol{\\ell} = B(r)\\,2\\pi r',
        description: 'A circle of radius $r$ is everywhere parallel to $\\mathbf{B}$; path length $2\\pi r$.'
      },
      {
        step: 3,
        title: 'Enclosed current inside the core',
        latex: 'I_{\\mathrm{enc}} = N I \\qquad (R-a < r < R+a)',
        description: 'The Amperian disk is pierced once by each of the $N$ turns.'
      },
      {
        step: 4,
        title: "Ampère's law",
        latex: 'B(r)\\,2\\pi r = \\mu_0 N I',
        description: 'Right-hand side is total free current through the loop.'
      },
      {
        step: 5,
        title: 'Toroid field formula',
        latex: 'B(r) = \\frac{\\mu_0 N I}{2\\pi r}',
        description: 'Solve for $B$. Outside the core and in the hole, $I_{\\mathrm{enc}}=0\\Rightarrow B=0$.'
      }
    ],
    limitingCases: [
      {
        name: 'Thin toroid / local solenoid',
        condition: 'a \\ll R,\\; r\\approx R',
        formula: 'B \\approx \\mu_0 n I,\\quad n = N/(2\\pi R)',
        description: 'Recovers the infinite-solenoid result with turns per unit length along the mean circumference.'
      },
      {
        name: 'Central cavity',
        condition: 'r < R - a',
        formula: 'B = 0',
        description: 'No net current through an Amperian circle inside the hole.'
      },
      {
        name: 'Exterior',
        condition: 'r > R + a',
        formula: 'B = 0',
        description: 'Ideal dense winding: each turn contributes canceling pierce-throughs.'
      },
      {
        name: 'Reversed current',
        condition: 'I \\to -I',
        formula: 'B_\\phi \\to -B_\\phi',
        description: 'Field direction flips with the right-hand rule; magnitude formula unchanged.'
      }
    ],
    greTraps: [
      {
        trap: 'Using solenoid $B=\\mu_0 n I$ with $n=N$ raw',
        warning: 'Toroid uses total turns $N$ and radius $r$: $B=\\mu_0 N I/(2\\pi r)$. Solenoid $n$ is turns per unit length.',
        strategy: 'Ask whether the stem gives $n$ (per meter) or $N$ (count). Toroid stems almost always give $N$ and $r$.'
      },
      {
        trap: 'Writing $B=\\mu_0 N I / r$ (dropping $2\\pi$)',
        warning: 'Ampère path length is the full circumference $2\\pi r$, not $r$.',
        strategy: 'Start from $\\oint B\\,dl = B\\cdot 2\\pi r$ every time.'
      },
      {
        trap: 'Claiming $B$ is uniform across the core',
        warning: 'Even inside, $B\\propto 1/r$. Only the thin-toroid limit $a\\ll R$ is approximately flat.',
        strategy: 'Compare $B$ at $R-a$ and $R+a$; the ratio is $(R+a)/(R-a)$.'
      },
      {
        trap: 'Nonzero $B$ outside "like a loop dipole"',
        warning: 'Ideal continuous toroidal winding has $B=0$ outside. Leakage appears only for sparse turns.',
        strategy: 'GRE ideal-toroid items want $B=0$ for $r$ outside the tube.'
      }
    ],
    parameters: [
      { id: 'Nturns', label: 'Total turns ($N$)', min: 50, max: 600, step: 10, default: 200, unit: '', hint: 'Total winding count. Ampère: $I_{\\mathrm{enc}}=NI$ only inside the core, so $B=\\mu_0 NI/(2\\pi r)$. Not a turns-per-length $n$.' },
      { id: 'I', label: 'Current ($I$)', min: -8.0, max: 8.0, step: 0.25, default: 3.0, unit: 'A', hint: 'Current in each turn. Sign flips $\\mathbf{B}$ by the right-hand rule; $B\\propto I$. Outside and in the hole, $B=0$ regardless of $I$.' },
      { id: 'R', label: 'Mean radius ($R$)', min: 0.12, max: 0.40, step: 0.01, default: 0.22, unit: 'm', hint: 'Centerline of the tube. Thin-toroid limit $a\\ll R$ recovers the solenoid $B\\approx\\mu_0 n I$ with $n=N/(2\\pi R)$.' },
      { id: 'a', label: 'Tube radius ($a$)', min: 0.03, max: 0.12, step: 0.005, default: 0.06, unit: 'm', hint: 'Core half-width. $B$ is nonzero only for $R-a<r<R+a$, and even there $B\\propto 1/r$ is not uniform.' },
      { id: 'rProbe', label: 'Probe radius ($r$)', min: 0.02, max: 0.50, step: 0.005, default: 0.22, unit: 'm', hint: 'Ampère-loop radius from the toroid center. Inside the core $B=\\mu_0 NI/(2\\pi r)$; in the hole or outside, $I_{\\mathrm{enc}}=0\\Rightarrow B=0$.' },
      { id: 'simSpeed', label: 'Simulation Speed', min: 0.2, max: 3.0, step: 0.2, default: 1.0, unit: 'x' }
    ],
    init: function (container, state) {
      if (state.Nturns == null || isNaN(state.Nturns)) state.Nturns = 200;
      if (state.I == null || isNaN(state.I)) state.I = 3.0;
      if (state.R == null || isNaN(state.R)) state.R = 0.22;
      if (state.a == null || isNaN(state.a)) state.a = 0.06;
      if (state.rProbe == null || isNaN(state.rProbe)) state.rProbe = 0.22;
      if (state.simSpeed == null || isNaN(state.simSpeed)) state.simSpeed = 1.0;
      state.animTime = state.animTime || 0;
    },
    draw: function (ctx, width, height, state, dt) {
      state = state || {};
      var dtp = scaledDt(dt, state);
      state.animTime = (state.animTime || 0) + dtp;
      var t = state.animTime;

      var N = Math.max(1, Math.round(Number(state.Nturns) || 200));
      var I = Number(state.I); if (!isFinite(I)) I = 3.0;
      var R = Number(state.R); if (!isFinite(R) || R <= 0) R = 0.22;
      var a = Number(state.a); if (!isFinite(a) || a <= 0) a = 0.06;
      if (a > R * 0.85) a = R * 0.85;
      var rProbe = Number(state.rProbe); if (!isFinite(rProbe) || rProbe < 0) rProbe = R;

      var rIn = Math.max(1e-4, R - a);
      var rOut = R + a;
      /* Keep probe drawable; clamp only for geometry, not for B region test beyond rim */
      var rMaxShow = Math.max(rOut * 1.35, rProbe * 1.08, R * 1.5);

      var MU0 = 4 * Math.PI * 1e-7;
      var inside = rProbe > rIn && rProbe < rOut;
      var Bval = inside ? (MU0 * N * I) / (2 * Math.PI * rProbe) : 0;
      var Bmean = (MU0 * N * I) / (2 * Math.PI * R);
      var Ienc = inside ? N * I : 0;
      var nEq = N / (2 * Math.PI * R);
      var Isgn = I >= 0 ? 1 : -1;
      var Iabs = Math.abs(I);

      fillCream(ctx, width, height);
      faintGrid(ctx, width, height);

      var pad = 28;
      var cx = width * 0.48;
      var cy = height * 0.52;
      var scale = Math.min((width - pad * 2) * 0.48, (height - pad * 2) * 0.48) / rMaxShow;

      function sr(r) { return r * scale; }

      /* Core annulus */
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, sr(rOut), 0, Math.PI * 2);
      ctx.arc(cx, cy, sr(rIn), 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fillStyle = 'rgba(212,160,23,0.12)';
      ctx.fill();
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      /* Mean radius guide */
      ctx.save();
      ctx.strokeStyle = inkFade(0.22);
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, sr(R), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      /* Winding tick marks around mean circle (density cues N) */
      var nTicks = Math.min(48, Math.max(16, Math.round(N / 12)));
      var ti, ang, wx, wy, tx0, ty0, tx1, ty1, cang, sang;
      for (ti = 0; ti < nTicks; ti++) {
        ang = (ti / nTicks) * Math.PI * 2 + t * 0.05 * Isgn;
        cang = Math.cos(ang);
        sang = Math.sin(ang);
        tx0 = cx + sr(rIn + a * 0.08) * cang;
        ty0 = cy + sr(rIn + a * 0.08) * sang;
        tx1 = cx + sr(rOut - a * 0.08) * cang;
        ty1 = cy + sr(rOut - a * 0.08) * sang;
        ctx.save();
        ctx.strokeStyle = 'rgba(204,120,92,0.55)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(tx0, ty0);
        ctx.lineTo(tx1, ty1);
        ctx.stroke();
        ctx.restore();
        /* Current sense: · on outer rim, × on inner for I>0 (RH: B along +phi) */
        wx = cx + sr(rOut - 2 / scale) * cang;
        wy = cy + sr(rOut - 2 / scale) * sang;
        if (ti % 3 === 0) {
          if (Isgn >= 0) {
            drawDot(ctx, wx, wy, 2.2, CORAL, null);
          } else {
            ctx.save();
            ctx.strokeStyle = CORAL;
            ctx.lineWidth = 1.3;
            ctx.beginPath();
            ctx.moveTo(wx - 3, wy - 3);
            ctx.lineTo(wx + 3, wy + 3);
            ctx.moveTo(wx + 3, wy - 3);
            ctx.lineTo(wx - 3, wy + 3);
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      /* B field arcs inside core only */
      var nArcs = 5;
      var ai, rr, arcR, span, a0, beads, bi, bAng, bx, by, alpha;
      for (ai = 0; ai < nArcs; ai++) {
        rr = rIn + (ai + 0.5) / nArcs * (rOut - rIn);
        arcR = sr(rr);
        alpha = 0.25 + 0.45 * (Iabs > 1e-6 ? Math.min(1, Math.abs((MU0 * N * I) / (2 * Math.PI * rr)) / (Math.abs(Bmean) + 1e-12)) : 0);
        ctx.save();
        ctx.strokeStyle = 'rgba(212,160,23,' + (0.2 + 0.35 * alpha) + ')';
        ctx.lineWidth = 1.7;
        ctx.beginPath();
        ctx.arc(cx, cy, arcR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        /* Flowing beads — direction follows I (phi hat) */
        beads = 6;
        for (bi = 0; bi < beads; bi++) {
          bAng = (t * 0.7 * Isgn + bi / beads + ai * 0.07) * Math.PI * 2;
          if (bAng < 0) bAng += Math.PI * 2;
          bx = cx + arcR * Math.cos(bAng);
          by = cy + arcR * Math.sin(bAng);
          drawDot(ctx, bx, by, 2.3, GOLD, null);
        }

        /* A few tangent arrows on this ring */
        if (ai === Math.floor(nArcs / 2) && Iabs > 0.05) {
          var k, arrAng, ax0, ay0, ax1, ay1, tangX, tangY, alen;
          for (k = 0; k < 4; k++) {
            arrAng = (k / 4) * Math.PI * 2 + 0.2;
            tangX = -Math.sin(arrAng) * Isgn;
            tangY = Math.cos(arrAng) * Isgn;
            alen = 18;
            ax0 = cx + arcR * Math.cos(arrAng) - tangX * alen * 0.5;
            ay0 = cy + arcR * Math.sin(arrAng) - tangY * alen * 0.5;
            ax1 = ax0 + tangX * alen;
            ay1 = ay0 + tangY * alen;
            drawSiteArrow(ctx, ax0, ay0, ax1, ay1, GOLD, 1.8);
          }
        }
      }

      /* Amperian probe circle */
      var pr = sr(Math.max(rProbe, 1e-4));
      ctx.save();
      ctx.strokeStyle = inside ? TEAL : MUTED;
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, pr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      /* Probe point on +x */
      var pAng = -0.35 + 0.08 * Math.sin(t * 1.1);
      var px = cx + pr * Math.cos(pAng);
      var py = cy + pr * Math.sin(pAng);
      drawDot(ctx, px, py, 5, inside ? TEAL : MUTED, INK);
      drawDot(ctx, px, py, 2, CREAM, null);

      if (inside && Iabs > 0.05) {
        var tX = -Math.sin(pAng) * Isgn;
        var tY = Math.cos(pAng) * Isgn;
        var blen = clamp(22 + 50 * Math.min(1, Math.abs(Bval) / (Math.abs(Bmean) + 1e-12)), 14, 56);
        drawSiteArrow(ctx, px - tX * blen * 0.25, py - tY * blen * 0.25,
          px + tX * blen * 0.75, py + tY * blen * 0.75, TEAL, 2.4);
        inkLabel(ctx, 'B', px + tX * blen * 0.85 + 8, py + tY * blen * 0.85, {
          color: TEAL, align: 'left', width: width, height: height, font: '700 12px Inter, sans-serif'
        });
      } else {
        inkLabel(ctx, 'B = 0', px + 12, py - 10, {
          color: MUTED, align: 'left', width: width, height: height, font: '600 11px Inter, sans-serif'
        });
      }

      /* Radius callout along probe ray (avoids hole label) */
      var callAng = pAng;
      var r0 = 10;
      var r1 = pr - 8;
      if (r1 > r0 + 12) {
        ctx.save();
        ctx.strokeStyle = MUTED;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx + r0 * Math.cos(callAng), cy + r0 * Math.sin(callAng));
        ctx.lineTo(cx + r1 * Math.cos(callAng), cy + r1 * Math.sin(callAng));
        ctx.stroke();
        ctx.restore();
        var rm = (r0 + r1) * 0.5;
        inkLabel(ctx, 'r', cx + rm * Math.cos(callAng) + 10 * Math.sin(callAng),
          cy + rm * Math.sin(callAng) - 10 * Math.cos(callAng), {
            color: MUTED, align: 'center', width: width, height: height, font: FONT_SM
          });
      }

      inkLabel(ctx, 'R', cx + sr(R) * 0.55, cy - sr(R) - 8, {
        color: MUTED, align: 'center', width: width, height: height, font: FONT_SM
      });
      inkLabel(ctx, 'core', cx - sr(R) * 0.05, cy - sr(R) * 0.55, {
        color: GOLD, align: 'center', width: width, height: height, font: '600 11px Inter, sans-serif'
      });
      inkLabel(ctx, 'hole', cx, cy - 14, {
        color: MUTED, align: 'center', width: width, height: height, font: FONT_SM
      });

      /* Center mark */
      drawDot(ctx, cx, cy, 3, INK, null);

      /* Region strip chip */
      var region = rProbe < rIn ? 'cavity (B=0)' : (rProbe > rOut ? 'exterior (B=0)' : 'inside core');
      ctx.save();
      ctx.fillStyle = chip();
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 1;
      var chipW = Math.min(320, width - 24);
      var chipH = 28;
      var chipX = 12;
      var chipY = height - chipH - 10;
      ctx.fillRect(chipX, chipY, chipW, chipH);
      ctx.strokeRect(chipX, chipY, chipW, chipH);
      ctx.restore();
      inkLabel(ctx, 'Amp\u00e8re: B\u00b72\u03c0r = \u03bc\u2080 I_enc   ·  ' + region, chipX + 10, chipY + chipH / 2, {
        color: INK, align: 'left', width: width, height: height, font: '600 11px Inter, sans-serif'
      });

      function fmtB(b) {
        var abs = Math.abs(b);
        if (abs >= 1e-1) return b.toFixed(3) + '\\,\\mathrm{T}';
        if (abs >= 1e-4) return (b * 1e3).toFixed(2) + '\\,\\mathrm{mT}';
        if (abs >= 1e-7) return (b * 1e6).toFixed(2) + '\\,\\mu\\mathrm{T}';
        return b.toExponential(2) + '\\,\\mathrm{T}';
      }

      appendLegend('$B = \\mu_0 N I / (2\\pi r)$', [
        { label: '$N$', value: '$' + N + '$', hint: 'Total turns. GRE trap: do not treat $N$ as a per-meter $n$. The path length is $2\\pi r$, so $B=\\mu_0 NI/(2\\pi r)$.' },
        { label: '$I$', value: '$' + I.toFixed(2) + '\\,\\mathrm{A}$', hint: 'Drive current. $I_{\\mathrm{enc}}=NI$ only when the Amperian circle sits in the core.' },
        { label: '$r$', value: '$' + rProbe.toFixed(3) + '\\,\\mathrm{m}$', hint: 'Live probe radius. Region: ' + region + '. $B\\propto 1/r$ inside; zero elsewhere.' },
        { label: '$R\\pm a$', value: '$' + rIn.toFixed(3) + '\\text{–}' + rOut.toFixed(3) + '\\,\\mathrm{m}$', hint: 'Core annulus $R-a$ to $R+a$. Only here is $I_{\\mathrm{enc}}=NI$.' },
        { label: '$I_{\\mathrm{enc}}$', value: '$' + Ienc.toFixed(1) + '\\,\\mathrm{A}$', hint: 'Net current piercing the Amperian disk. $NI$ in the core, $0$ in the hole and outside (ideal dense winding).' },
        { label: '$B(r)$', value: '$' + fmtB(Bval) + '$', hint: 'Live field at the probe. Inside: $\\mu_0 NI/(2\\pi r)=' + fmtB(Bval) + '$. Dropping $2\\pi$ is a common miss.' },
        { label: '$B(R)$', value: '$' + fmtB(Bmean) + '$', hint: 'Field on the mean circle, $B(R)=\\mu_0 NI/(2\\pi R)=' + fmtB(Bmean) + '$. Equals $\\mu_0 n I$ with $n=N/(2\\pi R)$.' },
        { label: '$n_{\\mathrm{eq}}$', value: '$' + nEq.toFixed(1) + '\\,\\mathrm{m}^{-1}$', hint: 'Equivalent solenoid density $n=N/(2\\pi R)=' + nEq.toFixed(1) + '\\,\\mathrm{m}^{-1}$. Use this $n$ only in the thin-toroid limit.' }
      ]);

      /* Hover tooltips — specific targets first, broad regions last. */
      var bTipX = px;
      var bTipY = py;
      if (inside && Iabs > 0.05) {
        var tXb = -Math.sin(pAng) * Isgn;
        var tYb = Math.cos(pAng) * Isgn;
        var blenTip = clamp(22 + 50 * Math.min(1, Math.abs(Bval) / (Math.abs(Bmean) + 1e-12)), 14, 56);
        bTipX = px + tXb * blenTip * 0.55;
        bTipY = py + tYb * blenTip * 0.55;
      }
      var ampBody = inside
        ? ('$\\oint B\\,dl = B\\cdot 2\\pi r = \\mu_0 I_{\\mathrm{enc}}$ with $I_{\\mathrm{enc}} = NI = ' + Ienc.toFixed(1) + '\\,\\mathrm{A}$.')
        : ('Outside the core $I_{\\mathrm{enc}} = 0$, so $B\\cdot 2\\pi r = 0$.');
      var probeBody = inside
        ? ('$B(r) = \\mu_0 N I / (2\\pi r) = ' + fmtB(Bval) + '$. Direction $\\hat{\\phi}$ by the right-hand rule.')
        : ('Probe is ' + (rProbe < rIn ? 'in the cavity' : 'outside the toroid') + ': ideal $B = 0$.');
      var exteriorR = Math.max(sr(rOut) + 18, Math.min(Math.min(width, height) * 0.48, sr(rMaxShow) * 1.05));
      if (typeof PGRE.setVizHotspots === 'function') {
        PGRE.setVizHotspots([
          {
            id: 'probe',
            kind: 'circle',
            x: px,
            y: py,
            r: 16,
            title: 'Field probe at $r$',
            body: probeBody
          },
          {
            id: 'B',
            kind: 'circle',
            x: bTipX,
            y: bTipY,
            r: 18,
            title: 'Magnetic field $\\mathbf{B}$',
            body: inside
              ? ('Azimuthal $\\mathbf{B} = B_\\phi(r)\\,\\hat{\\phi}$ with $B = \\mu_0 N I/(2\\pi r) = ' + fmtB(Bval) + '$.')
              : 'No net Ampère current through this loop $\\Rightarrow B = 0$.'
          },
          {
            id: 'ampere',
            kind: 'ring',
            x: cx,
            y: cy,
            r: pr,
            halfW: 11,
            title: 'Ampère loop',
            body: ampBody
          },
          {
            id: 'meanR',
            kind: 'ring',
            x: cx,
            y: cy,
            r: sr(R),
            halfW: 9,
            title: 'Mean radius $R$',
            body: 'Centerline of the tube. Thin-toroid limit: $B(R) \\approx \\mu_0 n I$ with $n = N/(2\\pi R) = ' + nEq.toFixed(1) + '\\,\\mathrm{m}^{-1}$.'
          },
          {
            id: 'center',
            kind: 'circle',
            x: cx,
            y: cy,
            r: 14,
            title: 'Toroid center',
            body: 'Origin for cylindrical $r$. The formula uses distance from this point, not from the tube wall.'
          },
          {
            id: 'chip',
            kind: 'rect',
            x: chipX,
            y: chipY,
            w: chipW,
            h: chipH,
            title: "Ampère's law summary",
            body: '$B\\cdot 2\\pi r = \\mu_0 I_{\\mathrm{enc}}$. Region now: ' + region + '.'
          },
          {
            id: 'core',
            kind: 'annulus',
            x: cx,
            y: cy,
            r0: sr(rIn),
            r1: sr(rOut),
            title: 'Toroid core (windings)',
            body: 'Tightly wound turns ($N = ' + N + '$, $I = ' + I.toFixed(2) + '\\,\\mathrm{A}$). Only here $I_{\\mathrm{enc}} = NI$ and $B = \\mu_0 NI/(2\\pi r)$.'
          },
          {
            id: 'hole',
            kind: 'disk',
            x: cx,
            y: cy,
            r: sr(rIn),
            title: 'Central cavity',
            body: 'Amperian circle with $r < R - a$ encloses no net current $\\Rightarrow B = 0$.'
          },
          {
            id: 'exterior',
            kind: 'annulus',
            x: cx,
            y: cy,
            r0: sr(rOut),
            r1: exteriorR,
            title: 'Exterior region',
            body: 'Ideal dense winding: net $I_{\\mathrm{enc}} = 0$ for $r > R + a$, so $B = 0$ outside.'
          }
        ]);
      }
    },
    challenge: {
      question: "A tightly wound toroid has $N = 400$ turns and carries $I = 2.0\\,\\mathrm{A}$. At distance $r = 0.20\\,\\mathrm{m}$ from the center (well inside the core), what is $B$? Take $\\mu_0 = 4\\pi\\times 10^{-7}\\,\\mathrm{T\\cdot m/A}$.",
      options: [
        "$B = 8.0\\times 10^{-4}\\,\\mathrm{T}$",
        "$B = 4.0\\times 10^{-4}\\,\\mathrm{T}$",
        "$B = 2.0\\times 10^{-3}\\,\\mathrm{T}$",
        "$B = \\mu_0\\,(400)\\,(2.0) = 1.0\\times 10^{-3}\\,\\mathrm{T}$",
        "$B = 0$ (field is only nonzero at the mean radius)"
      ],
      correct: 0,
      explanation: "1. Inside the core, Ampère's law on a concentric loop yields $B\\cdot 2\\pi r = \\mu_0 N I$.\n" +
        "2. Therefore $B = \\mu_0 N I / (2\\pi r) = (4\\pi\\times 10^{-7})(400)(2.0) / (2\\pi\\cdot 0.20)$.\n" +
        "3. Simplify: $B = (2\\times 10^{-7}\\cdot 800) / 0.20 = (1.6\\times 10^{-4}) / 0.20 = 8.0\\times 10^{-4}\\,\\mathrm{T}$.\n" +
        "Dropping the $2\\pi$ or treating $N$ as a turns-per-length $n$ produces the distractors."
    }
  };

  /* -------------------------------------------------------------------------- */
  /* cpgf-2.33: Magnetic Boundary Condition B_out^⊥ − B_in^⊥ = 0                 */
  /* -------------------------------------------------------------------------- */
  PGRE.visualizers['cpgf-2.33'] = {
    id: 'cpgf-2.33',
    topic: 'em',
    title: 'Magnetic Boundary Condition: Normal Component $B_{\\mathrm{out}}^\\perp - B_{\\mathrm{in}}^\\perp = 0$',
    formulaLatex: 'B_{\\mathrm{out}}^\\perp - B_{\\mathrm{in}}^\\perp = 0 \\iff \\oint_{\\mathcal{S}} \\mathbf{B} \\cdot d\\mathbf{a} = 0',
    physicalStory: `
$\\nabla\\cdot\\mathbf{B}=0$: magnetic field lines neither begin nor end. A Gaussian pillbox hugging an interface then forces the normal component to match,
$B_{\\mathrm{out}}^\\perp = B_{\\mathrm{in}}^\\perp$,
even if $\\mu$ jumps or a free surface current $\\mathbf{K}_f$ is present. $\\mathbf{K}_f$ (and a $\\mu$ mismatch) can only kink the tangential field:
$\\hat{\\mathbf{n}}\\times(\\mathbf{H}_{\\mathrm{out}}-\\mathbf{H}_{\\mathrm{in}})=\\mathbf{K}_f$.
With $\\mathbf{K}_f=0$, $B_\\parallel$ scales with $\\mu$, so $\\tan\\theta_2/\\tan\\theta_1=\\mu_2/\\mu_1$.
    `.trim(),
    derivationSteps: [
      { step: 1, title: "Differential Gauss's Law for Magnetism", latex: "\\nabla \\cdot \\mathbf{B} = 0", description: "No magnetic monopoles: field lines are divergence-free." },
      { step: 2, title: "Divergence Theorem over a Gaussian Pillbox", latex: "\\oint_{\\mathcal{S}} \\mathbf{B} \\cdot d\\mathbf{a} = 0", description: "A pillbox of cap $\\Delta A$ and height $h$ straddles the interface." },
      { step: 3, title: "Flux Decomposition Across Caps and Rim", latex: "(B_{\\mathrm{out}}^\\perp - B_{\\mathrm{in}}^\\perp)\\Delta A + \\Phi_{\\mathrm{rim}} = 0", description: "Outward normals on the two caps are opposite." },
      { step: 4, title: "Vanishing Rim Limit $h\\to 0$", latex: "\\Phi_{\\mathrm{rim}} \\to 0", description: "Lateral area vanishes; even a finite surface current cannot source normal flux." },
      { step: 5, title: "Universal Normal Continuity", latex: "B_{\\mathrm{out}}^\\perp - B_{\\mathrm{in}}^\\perp = 0", description: "$B^\\perp$ is continuous across every interface. $B^\\parallel$ need not be." }
    ],
    limitingCases: [
      { name: "Non-Magnetic Boundary", condition: "\\mu_1=\\mu_2,\\; K_f=0", formula: "\\mathbf{B}_{\\mathrm{out}}=\\mathbf{B}_{\\mathrm{in}}", description: "No kink: lines pass straight through." },
      { name: "Normal Incidence", condition: "B^\\parallel=0", formula: "B_{\\mathrm{out}}=B_{\\mathrm{in}}=B^\\perp", description: "The whole field is normal, hence identical on both sides." },
      { name: "High-$\\mu$ Interface", condition: "\\mu_2/\\mu_1\\to\\infty", formula: "\\theta_2\\to 90^\\circ", description: "Inside iron, lines run nearly parallel to the boundary." },
      { name: "Superconductor (Meissner)", condition: "\\mathbf{B}_{\\mathrm{in}}=0", formula: "B_{\\mathrm{out}}^\\perp=0", description: "Outside, $\\mathbf{B}$ is purely tangential." }
    ],
    greTraps: [
      { trap: "Confusing Normal with Tangential Jump from $\\mathbf{K}$", warning: "$\\mathbf{K}_f$ jumps $H^\\parallel$ only. $B^\\perp$ never jumps." },
      { trap: "Swapping $E$ and $B$ Boundary Rules", warning: "Electrostatics: $E^\\parallel$ continuous, $E^\\perp$ jumps by $\\sigma/\\epsilon_0$. Magnetostatics: $B^\\perp$ continuous, $H^\\parallel$ jumps by $K_f$." },
      { trap: "Assuming $H^\\perp$ is Continuous", warning: "$H^\\perp=B^\\perp/\\mu$ jumps when $\\mu$ jumps. $B^\\perp$ does not." },
      { trap: "Iron Shielding", warning: "Lines leaving iron into air emerge nearly normal, analogous to $\\mathbf{E}$ at a conductor." }
    ],
    parameters: [
      { id: 'bField', label: 'Incident $|\\mathbf{B}_1|$', min: 1.0, max: 5.0, step: 0.5, default: 3.0, unit: 'T', hint: 'Magnitude of $\\mathbf{B}$ in medium 1 (below). $B^\\perp$ is the same on both sides; $B^\\parallel$ scales with $\\mu$ (and jumps if $K_f\\neq 0$).' },
      { id: 'thetaIn', label: 'Incident angle $\\theta_1$', min: 0, max: 70, step: 5, default: 35, unit: 'deg', hint: 'Angle from the normal in medium 1. With $K_f=0$, refraction is $\\tan\\theta_2/\\tan\\theta_1=\\mu_2/\\mu_1$.' },
      { id: 'muRatio', label: 'Permeability $\\mu_2/\\mu_1$', min: 0.3, max: 6.0, step: 0.1, default: 2.4, hint: 'Permeability jump. $B^\\perp$ ignores it; $B^\\parallel_2=(\\mu_2/\\mu_1)B^\\parallel_1$ when $K_f=0$. Large $\\mu_2$ sends lines nearly parallel to the boundary in medium 2.' },
      { id: 'surfaceK', label: 'Free current $\\mu_1 K_f$', min: -2.0, max: 2.0, step: 0.25, default: 0.0, unit: 'T', hint: 'Free surface current (in tesla, as $\\mu_1 K_f$). Jumps $H^\\parallel$ only: $\\hat{\\mathbf{n}}\\times(\\mathbf{H}_2-\\mathbf{H}_1)=\\mathbf{K}_f$. Never jumps $B^\\perp$.' },
      { id: 'simSpeed', label: 'Simulation Speed', min: 0.2, max: 3.0, step: 0.2, default: 1.0, unit: 'x' }
    ],
    init: function (container, state) {
      if (state.bField == null || isNaN(state.bField)) state.bField = 3.0;
      if (state.thetaIn == null || isNaN(state.thetaIn)) state.thetaIn = 35;
      if (state.muRatio == null || isNaN(state.muRatio)) state.muRatio = 2.4;
      if (state.surfaceK == null || isNaN(state.surfaceK)) state.surfaceK = 0.0;
      if (state.simSpeed == null || isNaN(state.simSpeed)) state.simSpeed = 1.0;
      state.animTime = state.animTime || 0;
    },
    draw: function (ctx, width, height, state, dt) {
      state = state || {};
      var dtp = scaledDt(dt, state);
      state.animTime = (state.animTime || 0) + dtp;
      var t = state.animTime;
      var bField = Number(state.bField); if (!isFinite(bField)) bField = 3.0;
      var thetaInDeg = Number(state.thetaIn); if (!isFinite(thetaInDeg)) thetaInDeg = 35;
      var muRatio = Number(state.muRatio); if (!isFinite(muRatio) || muRatio <= 0) muRatio = 2.4;
      var Kf = Number(state.surfaceK); if (!isFinite(Kf)) Kf = 0;

      fillCream(ctx, width, height);

      var th1 = (thetaInDeg * Math.PI) / 180;
      var B1perp = bField * Math.cos(th1);
      var B1par = bField * Math.sin(th1);
      var mu1 = 1;
      var mu2 = muRatio;
      var B2perp = B1perp;
      var H1par = B1par / mu1;
      var H2par = H1par + Kf;
      var B2par = mu2 * H2par;
      var th2 = Math.atan2(B2par, Math.max(1e-4, B2perp));
      var thetaOutDeg = (th2 * 180) / Math.PI;

      var ifaceY = Math.round(height * 0.52);
      ctx.fillStyle = PANEL;
      ctx.fillRect(0, ifaceY, width, height - ifaceY);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, ifaceY);
      ctx.lineTo(width, ifaceY);
      ctx.stroke();

      inkLabel(ctx, '\u03bc\u2082', 18, ifaceY - 18, { color: MUTED, width: width, height: height, font: FONT_SM });
      inkLabel(ctx, '\u03bc\u2081', 18, ifaceY + 18, { color: MUTED, width: width, height: height, font: FONT_SM });

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, width, height);
      ctx.clip();

      var nLines = 7;
      var margin = 36;
      var span = width - 2 * margin;
      var arm = Math.min(height * 0.42, 210);
      var li, ix, xIn, yIn, xOut, yOut, frac, bx, by, u;
      for (li = 0; li < nLines; li++) {
        ix = margin + ((li + 0.5) / nLines) * span;
        xIn = ix - arm * Math.sin(th1);
        yIn = ifaceY + arm * Math.cos(th1);
        xOut = ix + arm * Math.sin(th2);
        yOut = ifaceY - arm * Math.cos(th2);
        ctx.strokeStyle = 'rgba(212,160,23,0.55)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(xIn, yIn);
        ctx.lineTo(ix, ifaceY);
        ctx.lineTo(xOut, yOut);
        ctx.stroke();
        frac = (t * 0.45 + li * 0.12) % 1;
        if (frac < 0.5) {
          u = frac / 0.5;
          bx = xIn + (ix - xIn) * u;
          by = yIn + (ifaceY - yIn) * u;
        } else {
          u = (frac - 0.5) / 0.5;
          bx = ix + (xOut - ix) * u;
          by = ifaceY + (yOut - ifaceY) * u;
        }
        drawDot(ctx, bx, by, 2.8, GOLD, null);
      }
      ctx.restore();

      var midX = width * 0.50;
      ctx.save();
      ctx.strokeStyle = inkFade(0.4);
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(midX, ifaceY - 70);
      ctx.lineTo(midX, ifaceY + 70);
      ctx.stroke();
      ctx.restore();
      drawSiteArrow(ctx, midX, ifaceY, midX, ifaceY - 40, INK, 1.8);
      inkLabel(ctx, 'n', midX + 12, ifaceY - 42, { color: INK, align: 'left', width: width, height: height, font: FONT_SM });

      var hPulse = 18 + 16 * (0.5 + 0.5 * Math.cos(t * 1.2));
      var pbW = Math.min(150, width * 0.22);
      var yTop = ifaceY - hPulse;
      var yBot = ifaceY + hPulse;
      ctx.save();
      ctx.fillStyle = 'rgba(204,120,92,0.08)';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(midX, yTop, pbW * 0.5, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(midX - pbW * 0.5, yTop);
      ctx.lineTo(midX - pbW * 0.5, yBot);
      ctx.moveTo(midX + pbW * 0.5, yTop);
      ctx.lineTo(midX + pbW * 0.5, yBot);
      ctx.stroke();
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.ellipse(midX, yBot, pbW * 0.5, 11, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      var vScale = 11;
      var py = Math.max(16, Math.abs(B1perp) * vScale);
      var pxIn = B1par * vScale;
      var pxOut = B2par * vScale;
      var vx = midX - pbW * 0.5 - 36;
      if (vx < 70) vx = 70;

      drawSiteArrow(ctx, vx, ifaceY + py, vx, ifaceY, CORAL, 2.4);
      drawSiteArrow(ctx, vx, ifaceY, vx, ifaceY - py, CORAL, 2.4);
      inkLabel(ctx, 'B\u2099', vx - 10, ifaceY + py * 0.5, { color: CORAL, align: 'right', width: width, height: height, font: '600 11px Inter, sans-serif' });
      inkLabel(ctx, 'B\u2099', vx - 10, ifaceY - py * 0.5, { color: CORAL, align: 'right', width: width, height: height, font: '600 11px Inter, sans-serif' });

      drawSiteArrow(ctx, vx - pxIn, ifaceY + py, vx, ifaceY + py, TEAL, 2.0);
      drawSiteArrow(ctx, vx, ifaceY - py, vx + pxOut, ifaceY - py, TEAL, 2.0);

      drawSiteArrow(ctx, vx - pxIn, ifaceY + py, vx, ifaceY, GOLD, 1.7);
      drawSiteArrow(ctx, vx, ifaceY, vx + pxOut, ifaceY - py, GOLD, 1.7);

      appendLegend('$B^\\perp$ is continuous', [
        { label: '$B_{\\mathrm{in}}^\\perp$', value: '$' + B1perp.toFixed(2) + '\\,\\mathrm{T}$', hint: 'Normal component below, $B_1\\cos\\theta_1=' + B1perp.toFixed(2) + '\\,\\mathrm{T}$. No magnetic monopoles $\\Rightarrow$ this equals $B_{\\mathrm{out}}^\\perp$.' },
        { label: '$B_{\\mathrm{out}}^\\perp$', value: '$' + B2perp.toFixed(2) + '\\,\\mathrm{T}$', hint: 'Normal component above. Identically $B_{\\mathrm{in}}^\\perp$ — even if $\\mu$ jumps or $K_f\\neq 0$.' },
        { label: '$\\Delta B^\\perp$', value: '$0$ (always)', hint: 'Gauss for $\\mathbf{B}$: $\\oint\\mathbf{B}\\cdot d\\mathbf{a}=0$. The pillbox flux vanishes, so $B^\\perp$ never jumps. This is the magnetostatic mirror of $E^\\parallel$ continuity.' },
        { label: '$B_{\\mathrm{in}}^\\parallel$', value: '$' + B1par.toFixed(2) + '\\,\\mathrm{T}$', hint: 'Tangential $B$ below. $H^\\parallel=B^\\parallel/\\mu$ is what a free surface current jumps, not $B^\\perp$.' },
        { label: '$B_{\\mathrm{out}}^\\parallel$', value: '$' + B2par.toFixed(2) + '\\,\\mathrm{T}$', hint: 'Tangential $B$ above: $B_2^\\parallel=\\mu_2(B_1^\\parallel/\\mu_1+K_f)=' + B2par.toFixed(2) + '\\,\\mathrm{T}$. Scales with $\\mu$ when $K_f=0$.' },
        { label: '$\\Delta B^\\parallel$', value: '$' + (B2par - B1par).toFixed(2) + '\\,\\mathrm{T}$', hint: 'Tangential jump from the $\\mu$ mismatch and $K_f$. Live $\\Delta B^\\parallel=' + (B2par - B1par).toFixed(2) + '\\,\\mathrm{T}$.' },
        { label: '$\\theta_1 \\to \\theta_2$', value: '$' + thetaInDeg.toFixed(0) + '^\\circ \\to ' + thetaOutDeg.toFixed(0) + '^\\circ$', hint: 'Refraction of $\\mathbf{B}$. With $K_f=0$, $\\tan\\theta_2/\\tan\\theta_1=\\mu_2/\\mu_1$. Live: $' + thetaInDeg.toFixed(0) + '^\\circ\\to' + thetaOutDeg.toFixed(0) + '^\\circ$.' },
        { label: '$\\mu_2/\\mu_1$', value: money(muRatio, 1), hint: 'Permeability ratio $' + muRatio.toFixed(1) + '$. $H^\\perp=B^\\perp/\\mu$ jumps when $\\mu$ jumps; $B^\\perp$ does not.' }
      ]);

      var spots233 = [
        { id: 'Bin', kind: 'segment', x1: vx - pxIn, y1: ifaceY + py, x2: vx, y2: ifaceY, halfW: 8, title: 'Incident $\\mathbf{B}_1$', body: '$|\\mathbf{B}_1|=' + bField.toFixed(2) + '\\,\\mathrm{T}$ at $\\theta_1=' + thetaInDeg.toFixed(0) + '^\\circ$. Gold = total; coral $B^\\perp$ (continuous), teal $B^\\parallel$.' },
        { id: 'Bout', kind: 'segment', x1: vx, y1: ifaceY, x2: vx + pxOut, y2: ifaceY - py, halfW: 8, title: 'Transmitted $\\mathbf{B}_2$', body: '$B_2^\\perp=' + B2perp.toFixed(2) + '\\,\\mathrm{T}$ (unchanged), $B_2^\\parallel=' + B2par.toFixed(2) + '\\,\\mathrm{T}$, $\\theta_2=' + thetaOutDeg.toFixed(0) + '^\\circ$.' },
        { id: 'Bn', kind: 'segment', x1: vx, y1: ifaceY + py, x2: vx, y2: ifaceY - py, halfW: 7, title: 'Normal $B^\\perp$', body: 'Equal coral arrows: $B_{\\mathrm{in}}^\\perp=B_{\\mathrm{out}}^\\perp=' + B1perp.toFixed(2) + '\\,\\mathrm{T}$. No monopoles.' },
        { id: 'nhat', kind: 'segment', x1: midX, y1: ifaceY, x2: midX, y2: ifaceY - 40, halfW: 7, title: 'Surface normal $\\hat{\\mathbf{n}}$', body: 'Points from $\\mu_1$ (below) into $\\mu_2$ (above). $B^\\perp=\\mathbf{B}\\cdot\\hat{\\mathbf{n}}$ is continuous.' },
        { id: 'pillbox', kind: 'rect', x: midX - pbW * 0.5, y: yTop - 11, w: pbW, h: (yBot - yTop) + 22, title: 'Gaussian pillbox', body: 'Caps catch $B^\\perp$; rim $\\to 0$. $\\oint\\mathbf{B}\\cdot d\\mathbf{a}=0$ forces $\\Delta B^\\perp=0$ even with $K_f\\neq 0$.' },
        { id: 'iface', kind: 'segment', x1: 0, y1: ifaceY, x2: width, y2: ifaceY, halfW: 10, title: Kf === 0 ? 'Magnetic interface' : 'Free current sheet $K_f$', body: Kf === 0 ? '$K_f=0$: $H^\\parallel$ is continuous, so $B^\\parallel$ scales with $\\mu$. $B^\\perp$ is continuous regardless.' : 'Free surface current $\\mu_1 K_f=' + Kf.toFixed(2) + '\\,\\mathrm{T}$ jumps $H^\\parallel$ only. $B^\\perp$ still matches.' },
        { id: 'mu2', kind: 'rect', x: 0, y: 0, w: width, h: ifaceY, title: 'Medium $\\mu_2$', body: 'Above the interface, $\\mu_2/\\mu_1=' + muRatio.toFixed(1) + '$. High $\\mu$ pulls $\\mathbf{B}$ toward the tangent.' },
        { id: 'mu1', kind: 'rect', x: 0, y: ifaceY, w: width, h: height - ifaceY, title: 'Medium $\\mu_1$', body: 'Below the interface. $|\\mathbf{B}_1|=' + bField.toFixed(2) + '\\,\\mathrm{T}$ at $\\theta_1=' + thetaInDeg.toFixed(0) + '^\\circ$.' }
      ];
      PGRE.setVizHotspots(spots233);
    },
    challenge: {
      question: "A flat interface at $z = 0$ separates vacuum ($z < 0$, $\\mu_1 = \\mu_0$) from a linear magnetic material ($z > 0$, $\\mu_2 = 4\\mu_0$). No free surface currents flow on the interface. If the magnetic field in vacuum is $\\mathbf{B}_1 = 3\\hat{\\mathbf{x}} + 2\\hat{\\mathbf{z}}\\;\\mathrm{T}$ (where $\\hat{\\mathbf{z}}$ is normal to the surface pointing into the medium), what is the magnetic field $\\mathbf{B}_2$ inside the magnetic medium?",
      options: [
        "$\\mathbf{B}_2 = 12\\hat{\\mathbf{x}} + 2\\hat{\\mathbf{z}}\\;\\mathrm{T}$",
        "$\\mathbf{B}_2 = 3\\hat{\\mathbf{x}} + 8\\hat{\\mathbf{z}}\\;\\mathrm{T}$",
        "$\\mathbf{B}_2 = 0.75\\hat{\\mathbf{x}} + 2\\hat{\\mathbf{z}}\\;\\mathrm{T}$",
        "$\\mathbf{B}_2 = 12\\hat{\\mathbf{x}} + 8\\hat{\\mathbf{z}}\\;\\mathrm{T}$",
        "$\\mathbf{B}_2 = 3\\hat{\\mathbf{x}} + 2\\hat{\\mathbf{z}}\\;\\mathrm{T}$"
      ],
      correct: 0,
      explanation: "1. Normal component: along $\\hat{\\mathbf{z}}$, the boundary condition $B_{\\mathrm{out}}^\\perp - B_{\\mathrm{in}}^\\perp = 0$ forces the normal component to be strictly continuous: $B_{2z} = B_{1z} = 2\\;\\mathrm{T}$.\n" +
        "2. Tangential component: along $\\hat{\\mathbf{x}}$, in the absence of free surface currents ($K_f = 0$), the parallel auxiliary field is continuous: $H_{2x} = H_{1x} \\implies B_{2x} / \\mu_2 = B_{1x} / \\mu_1$.\n" +
        "3. Therefore, $B_{2x} = (\\mu_2 / \\mu_1) B_{1x} = 4 \\times 3\\;\\mathrm{T} = 12\\;\\mathrm{T}$.\n" +
        "Combining the components yields $\\mathbf{B}_2 = 12\\hat{\\mathbf{x}} + 2\\hat{\\mathbf{z}}\\;\\mathrm{T}$. Notice that the normal component is completely unaffected by permeability, while the tangential component scales by $\\mu_2 / \\mu_1$."
    }
  };

  /* -------------------------------------------------------------------------- */
  /* cpgf-2.43: Φ₂₁ = M₁₂ I₁  (mutual inductance definition)                     */
  /* Picture: two coaxial loops. Current in loop 1 threads flux through loop 2;  */
  /* M₁₂ = Φ₂₁/I₁ depends only on geometry (and μ₀), not on the drive current.   */
  /* -------------------------------------------------------------------------- */
  function completeEllipticKE(m) {
    /* m = k² ∈ [0,1). AGM + series hybrid; good to ~1e-6 for mutual-inductance k. */
    m = Math.max(0, Math.min(0.999999, Number(m) || 0));
    if (m < 1e-12) return { K: Math.PI / 2, E: Math.PI / 2 };
    var a = 1;
    var b = Math.sqrt(1 - m);
    var c = Math.sqrt(m);
    var sum = 0.5 * c * c;
    var pow2 = 1;
    var n, aNext, bNext, cNext;
    for (n = 0; n < 16; n++) {
      if (c < 1e-14) break;
      aNext = 0.5 * (a + b);
      bNext = Math.sqrt(a * b);
      cNext = 0.5 * (a - b);
      pow2 *= 2;
      sum += pow2 * cNext * cNext;
      a = aNext; b = bNext; c = cNext;
    }
    var K = Math.PI / (2 * a);
    var E = K * (1 - sum);
    return { K: K, E: E };
  }

  function coaxialMutualM(a, b, z, mu0) {
    /* Exact single-turn coaxial loop mutual inductance (Neumann → elliptic). */
    a = Math.max(1e-4, a);
    b = Math.max(1e-4, b);
    z = Math.abs(z);
    var denom = (a + b) * (a + b) + z * z;
    if (denom < 1e-18) return 0;
    var k2 = 4 * a * b / denom;
    if (k2 >= 1) k2 = 0.999999;
    var k = Math.sqrt(k2);
    if (k < 1e-8) {
      /* Far-field dipole: M ≈ (μ₀/2) π a² b² / (a²+z²)^{3/2} */
      return (mu0 / 2) * Math.PI * a * a * b * b / Math.pow(a * a + z * z, 1.5);
    }
    var KE = completeEllipticKE(k2);
    return mu0 * Math.sqrt(a * b) * ((2 / k - k) * KE.K - (2 / k) * KE.E);
  }

  PGRE.visualizers['cpgf-2.43'] = {
    id: 'cpgf-2.43',
    topic: 'em',
    title: 'Mutual Inductance: $\\Phi_{21} = M_{12} I_1$',
    formulaLatex: '\\Phi_{21} = M_{12} I_1',
    physicalStory: `
Current $I_1$ in loop 1 produces a magnetic field that threads loop 2. The flux linkage is strictly linear in the drive:
$$\\Phi_{21} = M_{12} I_1.$$
$M_{12}$ is fixed by geometry (loop radii, separation, relative orientation, and $\\mu$ of the medium) — never by $I_1$ itself. Neumann's formula makes the reciprocity $M_{12}=M_{21}$ obvious: swapping the two contour integrals leaves the double line integral unchanged. Faraday then gives the open-circuit secondary emf $\\mathcal{E}_2 = -M_{12}\\,dI_1/dt$.
    `.trim(),
    derivationSteps: [
      {
        step: 1,
        title: 'Flux through the secondary',
        latex: '\\Phi_{21} = \\int_{S_2} \\mathbf{B}_1 \\cdot d\\mathbf{a}',
        description: 'Only the field produced by loop 1 contributes to $\\Phi_{21}$.'
      },
      {
        step: 2,
        title: 'Linearity of the Biot–Savart law',
        latex: '\\mathbf{B}_1(\\mathbf{r}) \\propto I_1',
        description: 'In linear media every field scales with the source current, so the flux does too.'
      },
      {
        step: 3,
        title: 'Definition of mutual inductance',
        latex: 'M_{12} \\equiv \\frac{\\Phi_{21}}{I_1}\\qquad (I_1 \\neq 0)',
        description: 'Rearrangement of the defining relation $\\Phi_{21} = M_{12} I_1$.'
      },
      {
        step: 4,
        title: 'Neumann formula (geometry only)',
        latex: 'M_{12} = \\frac{\\mu_0}{4\\pi}\\oint_{C_1}\\oint_{C_2}\\frac{d\\boldsymbol{\\ell}_1\\cdot d\\boldsymbol{\\ell}_2}{r}',
        description: 'A pure double line integral over the two wire paths — no currents appear.'
      },
      {
        step: 5,
        title: 'Reciprocity',
        latex: 'M_{12} = M_{21}',
        description: 'The double integral is symmetric under $1\\leftrightarrow 2$, so $\\Phi_{12}/I_2 = \\Phi_{21}/I_1$.'
      }
    ],
    limitingCases: [
      {
        name: 'Far separation',
        condition: 'z \\gg a,b',
        formula: 'M_{12} \\sim \\frac{\\mu_0}{2}\\frac{\\pi a^2 b^2}{z^3}',
        description: 'Dipole falloff: flux through loop 2 tracks $B_z\\propto z^{-3}$.'
      },
      {
        name: 'Coincident equal loops',
        condition: 'a=b,\\; z\\to 0',
        formula: 'M_{12}\\to L\\quad(\\mathrm{self\\ inductance})',
        description: 'Mutual inductance continuously becomes the loop self-inductance (log-divergent for zero wire radius).'
      },
      {
        name: 'Orthogonal planes',
        condition: '\\hat{\\mathbf{n}}_1\\cdot\\hat{\\mathbf{n}}_2 = 0',
        formula: 'M_{12} = 0',
        description: 'No net flux linkage when the loops share no projected area (ideal transformer leakage limit).'
      },
      {
        name: 'Reversed primary current',
        condition: 'I_1 \\to -I_1',
        formula: '\\Phi_{21}\\to -\\Phi_{21},\\quad M_{12}\\ \\mathrm{unchanged}',
        description: 'Sign lives in the flux; $M_{12}$ is a geometric scalar (for fixed orientation).'
      }
    ],
    greTraps: [
      {
        trap: 'Writing $\\Phi_{21} = M_{12}/I_1$',
        warning: 'Mutual inductance multiplies current: $\\Phi = M I$, never $M/I$.',
        strategy: 'Check dimensions: $[M]=\\mathrm{H}=\\mathrm{Wb/A}$, so $\\Phi$ and $I$ must sit on opposite sides of a product.'
      },
      {
        trap: 'Thinking $M_{12}$ depends on $I_1$',
        warning: 'In linear media $M$ is geometry-only. Doubling $I_1$ doubles $\\Phi_{21}$, leaving $M$ fixed.',
        strategy: 'Compute $M=\\Phi/I$ at two currents; the ratio must match.'
      },
      {
        trap: 'Confusing $M$ with $L$',
        warning: 'Self-inductance $L$ links a circuit to its own current ($\\Phi = LI$). Mutual $M$ links two distinct circuits.',
        strategy: 'Ask: is there a second loop in the stem? If yes, reach for $M$; if one loop only, reach for $L$.'
      },
      {
        trap: 'Forgetting $M_{12}=M_{21}$',
        warning: 'Reciprocity holds even when the loops have wildly different sizes. The smaller loop does not get a smaller $M$.',
        strategy: 'Neumann is symmetric. GRE stems that swap which loop is driven are testing this.'
      }
    ],
    parameters: [
      { id: 'I1', label: 'Primary current ($I_1$)', min: -5.0, max: 5.0, step: 0.25, default: 2.0, unit: 'A', hint: 'Drive current in loop 1. $\\Phi_{21}=M_{12}I_1$ is linear in $I_1$; $M_{12}$ itself does not change when $I_1$ flips or doubles.' },
      { id: 'R1', label: 'Primary radius ($a$)', min: 0.20, max: 1.20, step: 0.05, default: 0.70, unit: 'm', hint: 'Radius of the driven loop. Far away, $M_{12}\\sim(\\mu_0/2)\\pi a^2 b^2/z^3$ — both areas enter, not just the smaller loop.' },
      { id: 'R2', label: 'Secondary radius ($b$)', min: 0.15, max: 1.00, step: 0.05, default: 0.45, unit: 'm', hint: 'Radius of the pickup loop. Reciprocity $M_{12}=M_{21}$ even if $b\\neq a$: Neumann is symmetric.' },
      { id: 'sep', label: 'Axial separation ($z$)', min: 0.10, max: 2.50, step: 0.05, default: 0.80, unit: 'm', hint: 'Center-to-center distance. Large $z$ is dipole falloff $M\\propto z^{-3}$. $z\\to 0$ with $a=b$ becomes self-inductance.' },
      { id: 'N2', label: 'Secondary turns ($N_2$)', min: 1, max: 8, step: 1, default: 1, unit: '', hint: 'Pickup turns. Flux linkage is $N_2$ times the single-turn flux, so $M_{12}=N_2 M_{\\mathrm{1\\text{-}turn}}$ (here $N_1=1$).' },
      { id: 'simSpeed', label: 'Simulation Speed', min: 0.2, max: 3.0, step: 0.2, default: 1.0, unit: 'x' }
    ],
    init: function (container, state) {
      if (state.I1 == null || isNaN(state.I1)) state.I1 = 2.0;
      if (state.R1 == null || isNaN(state.R1)) state.R1 = 0.70;
      if (state.R2 == null || isNaN(state.R2)) state.R2 = 0.45;
      if (state.sep == null || isNaN(state.sep)) state.sep = 0.80;
      if (state.N2 == null || isNaN(state.N2)) state.N2 = 1;
      if (state.simSpeed == null || isNaN(state.simSpeed)) state.simSpeed = 1.0;
      state.animTime = state.animTime || 0;
    },
    draw: function (ctx, width, height, state, dt) {
      state = state || {};
      var dtp = scaledDt(dt, state);
      state.animTime = (state.animTime || 0) + dtp;
      var t = state.animTime;

      var I1 = Number(state.I1); if (!isFinite(I1)) I1 = 2.0;
      var a = Number(state.R1); if (!isFinite(a) || a <= 0) a = 0.70;
      var b = Number(state.R2); if (!isFinite(b) || b <= 0) b = 0.45;
      var z = Number(state.sep); if (!isFinite(z) || z < 0) z = 0.80;
      var N2 = Math.max(1, Math.round(Number(state.N2) || 1));

      var MU0 = 4 * Math.PI * 1e-7;
      var M1turn = coaxialMutualM(a, b, z, MU0);
      var M12 = M1turn * N2; /* N1 = 1 */
      var Phi21 = M12 * I1;
      var Baxis = (MU0 * I1 / 2) * (a * a) / Math.pow(a * a + z * z, 1.5);

      fillCream(ctx, width, height);
      faintGrid(ctx, width, height);

      /* Layout: side view, axis vertical. Loop 1 near bottom, loop 2 above. */
      var padX = 56;
      var padY = 36;
      var stageH = height - padY * 2;
      var stageW = width - padX * 2;
      var zMaxDraw = Math.max(z * 1.15, a * 1.4, 1.2);
      var scaleY = stageH / zMaxDraw;
      var scaleR = Math.min(stageW * 0.42, stageH * 0.35) / Math.max(a, b, 0.3);
      var cx = width * 0.50;
      var y1 = padY + stageH - 8;
      var y2 = y1 - z * scaleY;
      y2 = Math.max(padY + 28, Math.min(y2, y1 - 36));
      var ra = a * scaleR;
      var rb = b * scaleR;

      /* Axis */
      ctx.save();
      ctx.strokeStyle = inkFade(0.25);
      ctx.setLineDash([4, 5]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx, padY + 8);
      ctx.lineTo(cx, y1 + 18);
      ctx.stroke();
      ctx.restore();
      inkLabel(ctx, 'z', cx + 10, padY + 14, { color: MUTED, align: 'left', width: width, height: height, font: FONT_SM });

      /* Separation bracket */
      var brX = Math.min(width - 28, cx + Math.max(ra, rb) + 28);
      ctx.save();
      ctx.strokeStyle = MUTED;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(brX, y1);
      ctx.lineTo(brX, y2);
      ctx.moveTo(brX - 5, y1);
      ctx.lineTo(brX + 5, y1);
      ctx.moveTo(brX - 5, y2);
      ctx.lineTo(brX + 5, y2);
      ctx.stroke();
      ctx.restore();
      inkLabel(ctx, 'z = ' + z.toFixed(2) + ' m', brX - 8, (y1 + y2) / 2, {
        color: MUTED, align: 'right', width: width, height: height, font: FONT_SM
      });

      /* B-field lines from primary (dipole-ish side view) */
      var Iabs = Math.abs(I1);
      var Isgn = I1 >= 0 ? 1 : -1;
      var nLines = 5;
      var li, side, s, pts, pi, u, px, py, ang, elev, reach, phase, bi;
      for (li = 0; li < nLines; li++) {
        elev = 0.35 + 0.55 * (li / Math.max(1, nLines - 1));
        reach = ra * (0.55 + 1.1 * elev);
        for (side = -1; side <= 1; side += 2) {
          ctx.strokeStyle = 'rgba(212,160,23,' + (0.22 + 0.12 * elev) + ')';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          pts = 28;
          for (pi = 0; pi <= pts; pi++) {
            u = pi / pts;
            /* Leave primary rim, arc upward through secondary plane, return far side */
            ang = -Math.PI * 0.15 + u * (Math.PI * 0.85);
            px = cx + side * (ra * 0.92 * Math.cos(Math.min(1, u * 1.15) * Math.PI) * (0.15 + 0.85 * (1 - u))
              + reach * Math.sin(u * Math.PI) * (0.35 + 0.65 * elev));
            py = y1 - (y1 - y2 + 40) * Math.sin(u * Math.PI) * elev
              - 18 * Math.sin(u * Math.PI * 2) * (1 - elev);
            if (pi === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();

          /* Flowing beads along field line (direction follows I sign) */
          phase = (t * 0.55 * Isgn + li * 0.17 + (side > 0 ? 0.08 : 0)) % 1;
          if (phase < 0) phase += 1;
          bi = Math.floor(phase * pts);
          u = bi / pts;
          px = cx + side * (ra * 0.92 * Math.cos(Math.min(1, u * 1.15) * Math.PI) * (0.15 + 0.85 * (1 - u))
            + reach * Math.sin(u * Math.PI) * (0.35 + 0.65 * elev));
          py = y1 - (y1 - y2 + 40) * Math.sin(u * Math.PI) * elev
            - 18 * Math.sin(u * Math.PI * 2) * (1 - elev);
          drawDot(ctx, px, py, 2.4, GOLD, null);
        }
      }

      /* Flux disk through secondary — alpha tracks |Φ| */
      var phiScale = Math.min(1, Math.abs(Phi21) / 2.5e-7);
      var fluxAlpha = 0.08 + 0.42 * phiScale;
      var fluxCol = Isgn >= 0 ? 'rgba(93,184,166,' + fluxAlpha + ')' : 'rgba(204,120,92,' + fluxAlpha + ')';
      ctx.save();
      ctx.fillStyle = fluxCol;
      ctx.beginPath();
      ctx.ellipse(cx, y2, rb, Math.max(5, rb * 0.22), 0, 0, Math.PI * 2);
      ctx.fill();
      /* Pulse ring */
      var pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
      ctx.strokeStyle = Isgn >= 0 ? 'rgba(93,184,166,' + (0.35 + 0.35 * pulse) + ')' : 'rgba(204,120,92,' + (0.35 + 0.35 * pulse) + ')';
      ctx.lineWidth = 2 + 2 * phiScale;
      ctx.stroke();
      ctx.restore();

      /* Secondary multi-turn stack */
      var ti, ty;
      for (ti = 0; ti < N2; ti++) {
        ty = y2 - (ti - (N2 - 1) / 2) * 5;
        ctx.save();
        ctx.strokeStyle = TEAL;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.ellipse(cx, ty, rb, Math.max(4, rb * 0.20), 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      inkLabel(ctx, 'loop 2  (N\u2082=' + N2 + ')', cx + rb + 12, y2 - 10, {
        color: TEAL, align: 'left', width: width, height: height, font: '600 11px Inter, sans-serif'
      });
      inkLabel(ctx, '\u03A6\u2082\u2081', cx, y2 - rb * 0.22 - 14, {
        color: Isgn >= 0 ? TEAL : CORAL, align: 'center', width: width, height: height, font: '700 12px Inter, sans-serif'
      });

      /* Primary loop */
      ctx.save();
      ctx.fillStyle = 'rgba(204,120,92,0.10)';
      ctx.strokeStyle = CORAL;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(cx, y1, ra, Math.max(6, ra * 0.22), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      inkLabel(ctx, 'loop 1', cx + ra + 12, y1 - 8, {
        color: CORAL, align: 'left', width: width, height: height, font: '600 11px Inter, sans-serif'
      });

      /* Current markers on primary rim (× / · into/out of page on left/right for I>0) */
      var markR = ra * 0.96;
      var my = y1;
      /* Right side: current out of page for I>0 (dot); left: into page (cross) — RH rule for +z B */
      var rightOut = Isgn >= 0;
      function drawInOut(x, y, out) {
        if (out) {
          drawDot(ctx, x, y, 4.2, CORAL, INK);
          drawDot(ctx, x, y, 1.6, CREAM, null);
        } else {
          ctx.save();
          ctx.strokeStyle = CORAL;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(x - 4, y - 4);
          ctx.lineTo(x + 4, y + 4);
          ctx.moveTo(x + 4, y - 4);
          ctx.lineTo(x - 4, y + 4);
          ctx.stroke();
          ctx.restore();
        }
      }
      drawInOut(cx + markR, my, rightOut);
      drawInOut(cx - markR, my, !rightOut);

      /* Moving charge beads along primary ellipse */
      var nBeads = 8;
      var bj, angB, bx, by, ellA, ellB;
      ellA = ra; ellB = Math.max(6, ra * 0.22);
      for (bj = 0; bj < nBeads; bj++) {
        angB = (t * 1.6 * Isgn + (bj / nBeads) * Math.PI * 2);
        bx = cx + ellA * Math.cos(angB);
        by = y1 + ellB * Math.sin(angB);
        drawDot(ctx, bx, by, 2.6, CORAL, null);
      }
      inkLabel(ctx, 'I\u2081 = ' + I1.toFixed(2) + ' A', cx, y1 + ellB + 16, {
        color: CORAL, align: 'center', width: width, height: height, font: '600 11px Inter, sans-serif'
      });

      /* B arrow on axis between loops */
      var bLen = clamp(28 + 40 * Math.min(1, Math.abs(Baxis) / 2e-6), 16, 70);
      var bY0 = (y1 + y2) / 2 + bLen * 0.5 * Isgn;
      var bY1 = (y1 + y2) / 2 - bLen * 0.5 * Isgn;
      if (Iabs > 0.05) {
        drawSiteArrow(ctx, cx, bY0, cx, bY1, GOLD, 2.2);
        inkLabel(ctx, 'B\u2081', cx - 14, (bY0 + bY1) / 2, {
          color: GOLD, align: 'right', width: width, height: height, font: '600 11px Inter, sans-serif'
        });
      }

      /* Definition chip */
      ctx.save();
      ctx.fillStyle = chip();
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 1;
      var chipW = Math.min(280, width - 24);
      var chipH = 28;
      var chipX = 12;
      var chipY = height - chipH - 10;
      ctx.fillRect(chipX, chipY, chipW, chipH);
      ctx.strokeRect(chipX, chipY, chipW, chipH);
      ctx.restore();
      inkLabel(ctx, '\u03A6\u2082\u2081 = M\u2081\u2082 I\u2081   (geometry only)', chipX + 10, chipY + chipH / 2, {
        color: INK, align: 'left', width: width, height: height, font: '600 12px Inter, sans-serif'
      });

      function fmtH(m) {
        var abs = Math.abs(m);
        if (abs >= 1e-3) return (m * 1e3).toFixed(2) + '\\,\\mathrm{mH}';
        if (abs >= 1e-6) return (m * 1e6).toFixed(2) + '\\,\\mu\\mathrm{H}';
        if (abs >= 1e-9) return (m * 1e9).toFixed(2) + '\\,\\mathrm{nH}';
        return m.toExponential(2) + '\\,\\mathrm{H}';
      }
      function fmtWb(p) {
        var abs = Math.abs(p);
        if (abs >= 1e-3) return (p * 1e3).toFixed(2) + '\\,\\mathrm{mWb}';
        if (abs >= 1e-6) return (p * 1e6).toFixed(2) + '\\,\\mu\\mathrm{Wb}';
        if (abs >= 1e-9) return (p * 1e9).toFixed(2) + '\\,\\mathrm{nWb}';
        return p.toExponential(2) + '\\,\\mathrm{Wb}';
      }

      appendLegend('$\\Phi_{21} = M_{12} I_1$', [
        { label: '$I_1$', value: '$' + I1.toFixed(2) + '\\,\\mathrm{A}$', hint: 'Primary current. Doubling $I_1$ doubles $\\Phi_{21}$ and leaves $M_{12}=\\Phi_{21}/I_1$ fixed.' },
        { label: '$M_{12}$', value: '$' + fmtH(M12) + '$', hint: 'Mutual inductance from geometry (and $N_2$), $M_{12}=' + fmtH(M12) + '$. Neumann: $M_{12}=M_{21}$. Never $M\\propto I_1$.' },
        { label: '$\\Phi_{21}$', value: '$' + fmtWb(Phi21) + '$', hint: 'Flux through the secondary, $\\Phi_{21}=M_{12}I_1=' + fmtWb(Phi21) + '$. Sign rides with $I_1$, not with a redefinition of $M$.' },
        { label: '$M_{12} I_1$', value: '$' + fmtWb(M12 * I1) + '$', hint: 'The defining product. Must match $\\Phi_{21}$. Trap: writing $\\Phi=M/I$ has the wrong dimensions.' },
        { label: '$B_z$ (axis @ 2)', value: '$' + (Baxis * 1e6).toFixed(2) + '\\,\\mu\\mathrm{T}$', hint: 'On-axis field of loop 1 at the secondary plane, $B_z=(\\mu_0 I_1/2)a^2/(a^2+z^2)^{3/2}$. Uniform-$B$ estimate $\\Phi\\approx B_z\\pi b^2$ is only a far-field sketch.' },
        { label: '$a,\\,b,\\,z$', value: '$' + a.toFixed(2) + ',\\,' + b.toFixed(2) + ',\\,' + z.toFixed(2) + '\\,\\mathrm{m}$', hint: 'The three lengths that fix $M_{12}$ for coaxial loops. Faraday then gives $\\mathcal{E}_2=-M_{12}\\,dI_1/dt$.' },
        { label: '$N_2$', value: '$' + N2 + '$', hint: 'Secondary turns. Linkage $\\Phi_{21}$ and $M_{12}$ both scale with $N_2$.' },
        { label: 'geometry only', value: '$M_{12}\\not\\propto I_1$', hint: 'In linear media $M$ is a geometric scalar. Flip $I_1$ and $\\Phi$ flips; $M$ does not.' }
      ]);

      var spots243 = [
        { id: 'Iplus', kind: 'circle', x: cx + markR, y: my, r: 10, title: 'Primary current sense', body: (rightOut ? 'Current out of the page on the right (dot).' : 'Current into the page on the right (cross).') + ' $I_1=' + I1.toFixed(2) + '\\,\\mathrm{A}$; right-hand rule sets $\\mathbf{B}_1$ along the axis.' },
        { id: 'Iminus', kind: 'circle', x: cx - markR, y: my, r: 10, title: 'Return current', body: 'Opposite side of loop 1. Together the pair is a circulating $I_1$ that sources $\\mathbf{B}_1$.' }
      ];
      if (Iabs > 0.05) {
        spots243.push({ id: 'B1', kind: 'segment', x1: cx, y1: bY0, x2: cx, y2: bY1, halfW: 8, title: 'Axial $\\mathbf{B}_1$', body: 'On-axis field of loop 1 at the midpoint, $B_z=' + (Baxis * 1e6).toFixed(2) + '\\,\\mu\\mathrm{T}$. Direction follows $I_1$.' });
      }
      spots243.push({ id: 'loop1', kind: 'ring', x: cx, y: y1, r: ra, halfW: Math.max(10, ellB + 4), title: 'Primary loop 1', body: 'Driven loop of radius $a=' + a.toFixed(2) + '\\,\\mathrm{m}$ carrying $I_1=' + I1.toFixed(2) + '\\,\\mathrm{A}$. Its $\\mathbf{B}_1$ threads loop 2.' });
      spots243.push({ id: 'loop2', kind: 'ring', x: cx, y: y2, r: rb, halfW: Math.max(10, Math.max(4, rb * 0.20) + 6), title: 'Secondary loop 2', body: 'Pickup loop of radius $b=' + b.toFixed(2) + '\\,\\mathrm{m}$ with $N_2=' + N2 + '$ turns. $\\Phi_{21}=M_{12}I_1=' + fmtWb(Phi21) + '$.' });
      spots243.push({ id: 'flux', kind: 'disk', x: cx, y: y2, r: rb, title: 'Flux linkage $\\Phi_{21}$', body: 'Shaded area is the flux through loop 2. Opacity tracks $|\\Phi_{21}|=' + fmtWb(Phi21) + '$. $M_{12}=\\Phi_{21}/I_1$ is geometry only.' });
      spots243.push({ id: 'sep', kind: 'segment', x1: brX, y1: y1, x2: brX, y2: y2, halfW: 8, title: 'Axial separation $z$', body: '$z=' + z.toFixed(2) + '\\,\\mathrm{m}$. Far-field $M_{12}\\propto z^{-3}$; coinciding equal loops become self-inductance.' });
      spots243.push({ id: 'axis', kind: 'segment', x1: cx, y1: padY + 8, x2: cx, y2: y1 + 18, halfW: 6, title: 'Common axis', body: 'Coaxial loops share this $z$-axis. Orthogonal planes would give $M_{12}=0$.' });
      spots243.push({ id: 'chip', kind: 'rect', x: chipX, y: chipY, w: chipW, h: chipH, title: 'Definition $\\Phi_{21}=M_{12}I_1$', body: '$M_{12}=' + fmtH(M12) + '$ is fixed by $a,b,z,N_2,\\mu_0$. Faraday: $\\mathcal{E}_2=-M_{12}\\,dI_1/dt$.' });
      PGRE.setVizHotspots(spots243);
    },
    challenge: {
      question: "Two single-turn coaxial loops have mutual inductance $M_{12} = 4\\,\\mu\\mathrm{H}$. With $I_1 = 3\\,\\mathrm{A}$ in loop 1, the flux through loop 2 is $\\Phi_{21}$. If the primary current is changed to $I_1' = -6\\,\\mathrm{A}$ without moving either loop, what are $\\Phi_{21}'$ and the new mutual inductance $M_{12}'$?",
      options: [
        "$\\Phi_{21}' = -24\\,\\mu\\mathrm{Wb},\\; M_{12}' = 4\\,\\mu\\mathrm{H}$",
        "$\\Phi_{21}' = -24\\,\\mu\\mathrm{Wb},\\; M_{12}' = -4\\,\\mu\\mathrm{H}$",
        "$\\Phi_{21}' = -12\\,\\mu\\mathrm{Wb},\\; M_{12}' = 4\\,\\mu\\mathrm{H}$",
        "$\\Phi_{21}' = 24\\,\\mu\\mathrm{Wb},\\; M_{12}' = 8\\,\\mu\\mathrm{H}$",
        "$\\Phi_{21}' = -24\\,\\mu\\mathrm{Wb},\\; M_{12}' = 8\\,\\mu\\mathrm{H}$"
      ],
      correct: 0,
      explanation: "1. Definition: $\\Phi_{21} = M_{12} I_1$. Originally $\\Phi_{21} = (4\\,\\mu\\mathrm{H})(3\\,\\mathrm{A}) = 12\\,\\mu\\mathrm{Wb}$.\n" +
        "2. After the current change, geometry is untouched, so $M_{12}' = M_{12} = 4\\,\\mu\\mathrm{H}$ (mutual inductance is not a signed function of $I_1$ in linear media).\n" +
        "3. New flux: $\\Phi_{21}' = M_{12} I_1' = (4\\,\\mu\\mathrm{H})(-6\\,\\mathrm{A}) = -24\\,\\mu\\mathrm{Wb}$.\n" +
        "The sign rides with the flux (or with a chosen orientation convention), never with a redefinition of $M$ when only the drive current flips."
    }
  };

})(typeof window !== 'undefined' ? window : globalThis);
