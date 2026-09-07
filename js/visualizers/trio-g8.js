/* Formula visualizers — G8 Delta U / E=-grad V / Poisson V */
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
  var CORAL = '#cc785c';
  var GOLD = '#d4a017';
  var TEAL = '#5db8a6';
  var CREAM = (CV && CV.colors && CV.colors.bg) ? CV.colors.bg : '#faf9f5';
  var MUTED = '#6c6a64';
  var PANEL = '#f5f0e8';
  var LINE = '#e6dfd8';

  function syncStageTheme() {
    var t = PGRE.vizStageTheme ? PGRE.vizStageTheme() : null;
    if (!t) return;
    INK = t.ink; MUTED = t.muted; CREAM = t.bg; PANEL = t.panel; LINE = t.line;
  }

  function fillCream(ctx, width, height) {
    syncStageTheme();
    ctx.fillStyle = CREAM;
    ctx.fillRect(0, 0, width, height);
  }

  function appendLegend(title, rows) {
    if (PGRE.appendVizLegend) PGRE.appendVizLegend(title, rows);
  }

  function creamPotentialColor(v, maxV, alpha) {
    maxV = maxV || 50;
    alpha = alpha !== undefined ? alpha : 0.28;
    var t = typeof clamp === 'function' ? clamp(v / maxV, -1, 1) : Math.max(-1, Math.min(1, v / maxV));
    var r, g, b;
    if (t < 0) {
      var u = -t;
      r = Math.round(250 + (93 - 250) * u);
      g = Math.round(249 + (184 - 249) * u);
      b = Math.round(245 + (166 - 245) * u);
    } else {
      r = Math.round(250 + (204 - 250) * t);
      g = Math.round(249 + (120 - 249) * t);
      b = Math.round(245 + (92 - 245) * t);
    }
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  function inkLabel(ctx, text, x, y, opts) {
    opts = opts || {};
    var color = opts.color || INK;
    var align = opts.align || 'left';
    var font = opts.font || '12px sans-serif';
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
    ctx.fillStyle = PGRE.vizStageTheme().chipFade(0.94);
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
    return Math.max(14, len);
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

  PGRE.visualizers['cpgf-1.9'] = {
    id: 'cpgf-1.9',
    topic: 'cm',
    title: 'Potential Energy Difference: $\\Delta U = -\\int \\mathbf{F} \\cdot d\\mathbf{l}$',
    formulaLatex: '\\Delta U = U(b) - U(a) = -\\int_a^b \\mathbf{F} \\cdot d\\mathbf{l}',
    physicalStory: `
Potential energy difference $\\Delta U$ is defined as the negative of the work done by internal conservative forces during displacement from state $a$ to state $b$.

The negative sign is physically crucial: when a force does positive work (accelerating an object downhill), the system's potential energy *decreases* ($\\Delta U < 0$). Conversely, external work done *against* the force stores potential energy. Because the line integral is path-independent, GRE problems are solved rapidly by picking axis-aligned orthogonal paths (Manhattan integration: $\\int F_x dx + \\int F_y dy$).
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
      { id: 'landscape', label: 'Potential Well', type: 'select', value: 'saddle', default: 'saddle', options: [
        { value: 'harmonic', label: 'Harmonic Bowl: $U = \\frac{1}{2}k(x^2 + y^2)$' },
        { value: 'saddle', label: 'Saddle Surface: $U = c(x^2 - y^2)$' },
        { value: 'doublewell', label: 'Double Well: $U = a(x^2 - 1)^2 + b y^2$' }
      ]},
      { id: 'pathType', label: 'Integration Path', type: 'select', value: 'manhattan', default: 'manhattan', options: [
        { value: 'direct', label: 'Path 1: Direct Diagonal Line' },
        { value: 'manhattan', label: 'Path 2: Manhattan (GRE Axis-Aligned)' },
        { value: 'curved', label: 'Path 3: Parabolic Arc' }
      ]},
      { id: 'simSpeed', label: 'Simulation Speed', min: 0.2, max: 3.0, step: 0.2, default: 1.0, unit: 'x' }
    ],
    init(container, state, redraw) {
      state.landscape = state.landscape || 'saddle';
      state.pathType = state.pathType || 'manhattan';
      state.pA = state.pA || { x: -1.5, y: -1.0 };
      state.pB = state.pB || { x: 1.5, y: 1.0 };
      state.t = state.t || 0;
      if (state.simSpeed == null || isNaN(state.simSpeed)) state.simSpeed = 1.0;
    },
    draw(ctx, width, height, state, dt) {
      state = state || {};
      dt = (dt == null || isNaN(dt)) ? 0 : dt;
      var speed = parseFloat(state.simSpeed);
      if (isNaN(speed)) speed = 1.0;
      state.landscape = state.landscape || 'saddle';
      state.pathType = state.pathType || 'manhattan';
      state.pA = state.pA || { x: -1.5, y: -1.0 };
      state.pB = state.pB || { x: 1.5, y: 1.0 };

      fillCream(ctx, width, height);
      if (CV && CV.drawGrid) {
        CV.drawGrid(ctx, width, height, 40);
      } else if (U && U.drawGrid) {
        U.drawGrid(ctx, width, height, 40);
      }

      var pad = 36;
      var scale = Math.min((width - 2 * pad) / 6.4, (height - 2 * pad) / 4.6);
      var cx = width / 2;
      var cy = height / 2 + 4;

      function toScreen(nx, ny) {
        return { x: cx + nx * scale, y: cy - ny * scale };
      }
      function toNorm(sx, sy) {
        return { x: (sx - cx) / scale, y: (cy - sy) / scale };
      }

      function getU(x, y) {
        if (state.landscape === 'harmonic') return 0.5 * 1.5 * (x * x + y * y);
        if (state.landscape === 'saddle') return 0.8 * (x * x - y * y);
        return 1.2 * Math.pow(x * x - 1.0, 2) + 0.8 * y * y;
      }

      function getForce(x, y) {
        var eps = 0.001;
        var du_dx = (getU(x + eps, y) - getU(x - eps, y)) / (2 * eps);
        var du_dy = (getU(x, y + eps) - getU(x, y - eps)) / (2 * eps);
        return { fx: -du_dx, fy: -du_dy };
      }

      var contourLevels = [-2.0, -1.0, 0, 0.5, 1.0, 2.0, 3.0];
      if (typeof drawMarchingContours === 'function') {
        drawMarchingContours(ctx, getU, toNorm, toScreen, width, height, contourLevels, 10);
      }

      var pA = state.pA;
      var pB = state.pB;
      var sA = toScreen(pA.x, pA.y);
      var sB = toScreen(pB.x, pB.y);

      var gx, gy, f, fLen, drawLen, sx, sy;
      for (gx = -2.6; gx <= 2.6; gx += 0.85) {
        for (gy = -1.7; gy <= 1.7; gy += 0.85) {
          if (Math.hypot(gx - pA.x, gy - pA.y) < 0.45) continue;
          if (Math.hypot(gx - pB.x, gy - pB.y) < 0.45) continue;
          f = getForce(gx, gy);
          fLen = Math.hypot(f.fx, f.fy);
          if (fLen > 0.08) {
            drawLen = Math.min(16, 6 + fLen * 4);
            sx = cx + gx * scale;
            sy = cy - gy * scale;
            drawSiteArrow(ctx, sx, sy, sx + (f.fx / fLen) * drawLen, sy - (f.fy / fLen) * drawLen, 'rgba(204, 120, 92, 0.38)', 1.1);
          }
        }
      }

      var pathType = state.pathType;
      var pts = samplePathPoints(pA, pB, pathType, 80);
      var pathColor = pathType === 'manhattan' ? TEAL : (pathType === 'curved' ? GOLD : CORAL);
      ctx.save();
      ctx.strokeStyle = pathColor;
      ctx.lineWidth = 2.6;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      pts.forEach(function(p, i) {
        var s = toScreen(p.x, p.y);
        if (i === 0) ctx.moveTo(s.x, s.y);
        else ctx.lineTo(s.x, s.y);
      });
      ctx.stroke();
      ctx.restore();

      if (pathType === 'manhattan') {
        var corner = toScreen(pB.x, pA.y);
        ctx.save();
        ctx.strokeStyle = TEAL;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(corner.x - 8, corner.y);
        ctx.lineTo(corner.x, corner.y);
        ctx.lineTo(corner.x, corner.y + (pB.y > pA.y ? -8 : 8));
        ctx.stroke();
        ctx.restore();
      }

      var uA = getU(pA.x, pA.y);
      var uB = getU(pB.x, pB.y);
      var deltaU = uB - uA;

      var W = 0;
      var i;
      for (i = 1; i < pts.length; i++) {
        var mx = 0.5 * (pts[i].x + pts[i - 1].x);
        var my = 0.5 * (pts[i].y + pts[i - 1].y);
        var ff = getForce(mx, my);
        W += ff.fx * (pts[i].x - pts[i - 1].x) + ff.fy * (pts[i].y - pts[i - 1].y);
      }

      state.t = (state.t || 0) + dt * speed * 0.22;
      if (state.t > 1) state.t -= 1;
      var beadIdx = Math.min(pts.length - 1, Math.max(0, Math.round(state.t * (pts.length - 1))));
      var bead = pts[beadIdx];
      var sBead = toScreen(bead.x, bead.y);
      var fBead = getForce(bead.x, bead.y);
      var fBeadLen = Math.hypot(fBead.fx, fBead.fy);
      if (fBeadLen > 0.05) {
        var fArrow = clampArrowLen(sBead.x, sBead.y, fBead.fx / fBeadLen, -(fBead.fy / fBeadLen), 28, 18, width, height);
        drawSiteArrow(
          ctx, sBead.x, sBead.y,
          sBead.x + (fBead.fx / fBeadLen) * fArrow,
          sBead.y - (fBead.fy / fBeadLen) * fArrow,
          TEAL, 2.2
        );
      }

      ctx.save();
      ctx.fillStyle = GOLD;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(sBead.x, sBead.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = CORAL;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(sA.x, sA.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(sB.x, sB.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      inkLabel(ctx, 'A', sA.x, sA.y + 16, { color: CORAL, align: 'center', width: width, height: height, font: 'bold 12px sans-serif' });
      inkLabel(ctx, 'B', sB.x, sB.y - 16, { color: GOLD, align: 'center', width: width, height: height, font: 'bold 12px sans-serif' });

      var landName = state.landscape === 'harmonic' ? 'harmonic bowl' : (state.landscape === 'saddle' ? 'saddle' : 'double well');
      var pathName = pathType === 'manhattan' ? 'Manhattan (axis-aligned)' : (pathType === 'curved' ? 'parabolic arc' : 'direct line');
      appendLegend('$\\Delta U = -\\int \\mathbf{F} \\cdot d\\mathbf{l}$', [
        { label: 'Landscape', value: landName },
        { label: 'Path', value: pathName },
        { label: '$U(A)$', value: uA.toFixed(2) + ' J' },
        { label: '$U(B)$', value: uB.toFixed(2) + ' J' },
        { label: '$\\Delta U = U(B) - U(A)$', value: deltaU.toFixed(2) + ' J' },
        { label: '$W_{\\mathrm{field}} = \\int \\mathbf{F} \\cdot d\\mathbf{l}$', value: W.toFixed(2) + ' J' },
        { label: 'Check', value: '$\\Delta U \\approx -W$ on every path' }
      ]);
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

  PGRE.visualizers['cpgf-2.4'] = {
    id: "cpgf-2.4",
    topic: 'em',
    title: 'Electric Field from Potential Gradient: $\\mathbf{E} = -\\nabla V$',
    formulaLatex: "\\mathbf{E} = -\\nabla V",
    physicalStory: `In electrostatics, the Coulomb force is conservative: the line integral around any closed loop vanishes identically ($\\oint \\mathbf{E}\\cdot d\\mathbf{l} = 0$), which by Stokes' theorem is equivalent to $\\nabla \\times \\mathbf{E} = 0$. By Helmholtz's theorem and the Poincaré lemma, any curl-free vector field can be expressed without loss of generality as the gradient of a single-valued scalar potential: $\\mathbf{E} = -\\nabla V$.

The physical significance of the minus sign is profound: the electric field vectors always point down the potential hill—in the direction of the steepest descent of potential energy per unit charge. Positive charges naturally accelerate down $V$, while negative charges accelerate up $V$.

Geometrically, the equipotential surfaces $V(\\mathbf{r}) = \\text{const}$ form nested topological level sets. Because the directional derivative along any tangent vector to an equipotential surface is zero ($dV = \\nabla V \\cdot d\\mathbf{l} = 0$), the gradient $\\nabla V$ is everywhere strictly normal (perpendicular) to the equipotential contours. Consequently, electric field lines must intersect equipotential surfaces at right angles ($90^\\circ$). The spacing between equipotential lines is inversely proportional to field strength: tightly packed contours signify a steep potential cliff and an intense electric field ($|\\mathbf{E}| = |\\partial V / \\partial n|$).`,
    
    derivationSteps: [
      {
        step: 1,
        title: "Coulomb's Law and Conservative Work",
        latex: "W = -q\\int_{\\mathbf{a}}^{\\mathbf{b}} \\mathbf{E}\\cdot d\\mathbf{l}",
        description: "The work done by an external agent against the electrostatic field when moving a test charge q from point a to point b depends solely on the endpoints and is entirely path-independent."
      },
      {
        step: 2,
        title: "Definition of Scalar Potential",
        latex: "V(\\mathbf{r}) \\equiv -\\int_{\\mathcal{O}}^{\\mathbf{r}} \\mathbf{E}\\cdot d\\mathbf{l}",
        description: "Choosing a standard reference point O (conventionally at infinity for localized charge distributions, where V(∞) = 0), the electric potential V(r) is the potential energy per unit charge."
      },
      {
        step: 3,
        title: "Fundamental Theorem of Gradients",
        latex: "V(\\mathbf{b}) - V(\\mathbf{a}) = \\int_{\\mathbf{a}}^{\\mathbf{b}} (\\nabla V)\\cdot d\\mathbf{l} = -\\int_{\\mathbf{a}}^{\\mathbf{b}} \\mathbf{E}\\cdot d\\mathbf{l}",
        description: "By the gradient theorem for line integrals, the integral of (E + ∇V) along any path vanishes identically."
      },
      {
        step: 4,
        title: "Differential Vector Field Relation",
        latex: "\\mathbf{E} = -\\nabla V = -\\left(\\frac{\\partial V}{\\partial x}\\hat{\\mathbf{x}} + \\frac{\\partial V}{\\partial y}\\hat{\\mathbf{y}} + \\frac{\\partial V}{\\partial z}\\hat{\\mathbf{z}}\\right)",
        description: "In Cartesian coordinates, each vector component of E is the negative spatial derivative of V along that axis: E_x = -∂V/∂x, E_y = -∂V/∂y, E_z = -∂V/∂z."
      },
      {
        step: 5,
        title: "Curvilinear Coordinate Representations",
        latex: "\\begin{aligned} \\text{Spherical: } & \\mathbf{E} = -\\left(\\frac{\\partial V}{\\partial r}\\hat{\\mathbf{r}} + \\frac{1}{r}\\frac{\\partial V}{\\partial \\theta}\\hat{\\boldsymbol{\\theta}} + \\frac{1}{r\\sin\\theta}\\frac{\\partial V}{\\partial \\phi}\\hat{\\boldsymbol{\\phi}}\\right) \\\\ \\text{Cylindrical: } & \\mathbf{E} = -\\left(\\frac{\\partial V}{\\partial s}\\hat{\\mathbf{s}} + \\frac{1}{s}\\frac{\\partial V}{\\partial \\phi}\\hat{\\boldsymbol{\\phi}} + \\frac{\\partial V}{\\partial z}\\hat{\\mathbf{z}}\\right) \\end{aligned}",
        description: "In spherical and cylindrical coordinates, metric scale factors enter the spatial gradient derivatives."
      }
    ],

    limitingCases: [
      {
        name: "Uniform Electric Field (Parallel Plates)",
        condition: "V(x) = -E_0 x + C",
        formula: "\\mathbf{E} = E_0\\hat{\\mathbf{x}}",
        description: "Equipotentials are planar sheets parallel to the plates with equal spacing. The field is perfectly uniform and perpendicular to the sheets."
      },
      {
        name: "Point Charge Coulomb Limit",
        condition: "V(r) = \\frac{q}{4\\pi\\epsilon_0 r}",
        formula: "\\mathbf{E} = -\\frac{dV}{dr}\\hat{\\mathbf{r}} = \\frac{q}{4\\pi\\epsilon_0 r^2}\\hat{\\mathbf{r}}",
        description: "Equipotentials are concentric spheres. Field lines radiate strictly radially outward (q>0) or inward (q<0)."
      },
      {
        name: "Electric Dipole (Far-Field)",
        condition: "r \\gg d, \\quad V(r, \\theta) \\approx \\frac{p\\cos\\theta}{4\\pi\\epsilon_0 r^2}",
        formula: "\\mathbf{E} = \\frac{p}{4\\pi\\epsilon_0 r^3}(2\\cos\\theta\\hat{\\mathbf{r}} + \\sin\\theta\\hat{\\boldsymbol{\\theta}})",
        description: "Equipotential surfaces form nested surfaces; field strength decays with the characteristic 1/r³ dipole power law."
      },
      {
        name: "Equipotential Conductor in Electrostatic Equilibrium",
        condition: "V = \\text{const everywhere in and on conductor}",
        formula: "\\nabla V = 0 \\implies \\mathbf{E}_{\\text{inside}} = 0, \\quad \\mathbf{E}_{\\text{surface}} = \\frac{\\sigma}{\\epsilon_0}\\hat{\\mathbf{n}}",
        description: "The interior of a static conductor is an equipotential volume with zero electric field. The surface is an equipotential, so surface electric fields are strictly normal."
      }
    ],

    greTraps: [
      {
        trap: "Assuming $E = 0$ implies $V = 0$ (or $V = 0$ implies $E = 0$)",
        warning: "Midway between two equal $+Q$ charges, $\\mathbf{E} = 0$ by symmetry, but $V = 2kQ/d \\neq 0$. Midway between $+Q$ and $-Q$, $V = 0$, but $\\mathbf{E} \\neq 0$. $\\mathbf{E}$ measures the spatial slope of $V$, not its absolute value."
      },
      {
        trap: "Forgetting the Negative Sign in Vector Components",
        warning: "If potential increases along the $+x$ axis ($\\partial V/\\partial x > 0$), the electric field component $E_x = -\\partial V/\\partial x$ is negative (points in the $-x$ direction, towards lower potential)."
      },
      {
        trap: "Equipotential Contour Spacing vs Field Magnitude",
        warning: "On PGRE topographic potential maps, where contour lines are packed closest together, the gradient is steepest and $|\\mathbf{E}|$ is largest. Field lines must never cross each other."
      },
      {
        trap: "Gauge Invariance and Reference Point Freedom",
        warning: "Adding any arbitrary constant $C$ to $V(\\mathbf{r})$ leaves $\\mathbf{E} = -\\nabla(V + C) = -\\nabla V$ completely unchanged. Only potential differences $\\Delta V$ produce physical forces."
      }
    ],

    parameters: [
      { id: "preset", label: "Charge Configuration", type: "select", default: "dipole", options: [
        { value: "dipole", label: "Electric dipole (+ / -)" },
        { value: "point_pos", label: "Single positive point" },
        { value: "point_neg", label: "Single negative point" },
        { value: "like_charges", label: "Two like charges (+ / +)" },
        { value: "quadrupole", label: "Quadrupole (+ - + -)" },
        { value: "capacitor", label: "Parallel-plate capacitor" }
      ]},
      { id: "chargeMag", label: "Charge Magnitude ($q$)", type: "range", min: 0.5, max: 3.0, step: 0.1, default: 1.0 },
      { id: "showEquipotentials", label: "Equipotential Contours", type: "toggle", default: true },
      { id: "showVectors", label: "E-Field Vectors ($-\\nabla V$)", type: "toggle", default: true },
      { id: "showStreamlines", label: "Field Streamlines", type: "toggle", default: false },
      { id: "showHeatmap", label: "Potential Heatmap", type: "toggle", default: false },
      { id: "showProfile", label: "1D Potential/Field Profile", type: "toggle", default: true },
      { id: "simSpeed", label: "Simulation Speed", min: 0.2, max: 3.0, step: 0.2, default: 1.0, unit: "x" }
    ],

    init: function(container, state, redraw) {
      state.preset = state.preset || "dipole";
      state.chargeMag = state.chargeMag !== undefined ? state.chargeMag : 1.0;
      state.showEquipotentials = state.showEquipotentials !== undefined ? state.showEquipotentials : true;
      state.showVectors = state.showVectors !== undefined ? state.showVectors : true;
      state.showStreamlines = state.showStreamlines !== undefined ? state.showStreamlines : false;
      state.showHeatmap = state.showHeatmap !== undefined ? state.showHeatmap : false;
      state.showProfile = state.showProfile !== undefined ? state.showProfile : true;
      if (state.simSpeed == null || isNaN(state.simSpeed)) state.simSpeed = 1.0;
      state.charges = state.charges || [];
      state.testCharge = state.testCharge || { x: 0.0, y: -0.35, q: 1.0, active: true };
      state.isDragging = null;
      state.particles = state.particles || [];
      if (!state.charges.length) initCard1Charges(state);
      if (!state.particles.length) {
        for (var i = 0; i < 40; i++) {
          state.particles.push({
            x: (Math.random() - 0.5) * 1.6,
            y: (Math.random() - 0.5) * 1.6,
            age: Math.random() * 100,
            maxAge: 80 + Math.random() * 60
          });
        }
      }
    },
    onParamChange: function(id, val, state) {
      if (id === "preset" || id === "chargeMag") initCard1Charges(state);
    },

    draw: function(ctx, width, height, state, dt) {
      dt = (dt == null || isNaN(dt)) ? 0 : dt;
      state = state || {};
      var speed = parseFloat(state.simSpeed);
      if (isNaN(speed)) speed = 1.0;

      // Ensure state defaults
      state.preset = state.preset || "dipole";
      state.chargeMag = state.chargeMag !== undefined ? state.chargeMag : 1.0;
      state.showEquipotentials = state.showEquipotentials !== undefined ? state.showEquipotentials : true;
      state.showVectors = state.showVectors !== undefined ? state.showVectors : true;
      state.showStreamlines = state.showStreamlines !== undefined ? state.showStreamlines : false;
      state.showHeatmap = state.showHeatmap !== undefined ? state.showHeatmap : false;
      state.showProfile = state.showProfile !== undefined ? state.showProfile : true;
      state.testCharge = state.testCharge || { x: 0.0, y: -0.35, q: 1.0, active: true };

      if (!state.charges || state.charges.length === 0) {
        initCard1Charges(state);
      }

      if (!state.particles || state.particles.length === 0) {
        state.particles = [];
        for (let i = 0; i < 40; i++) {
          state.particles.push({
            x: (Math.random() - 0.5) * 1.6,
            y: (Math.random() - 0.5) * 1.6,
            age: Math.random() * 100,
            maxAge: 80 + Math.random() * 60
          });
        }
      }

      // Dynamic Coordinate Transform Calculation
      const plotHeight = state.showProfile ? height * 0.72 : height;
      const size = Math.min(width - 40, plotHeight - 40);
      const cx = width / 2;
      const cy = plotHeight / 2;
      const scale = size / 2.2;

      function toScreen(nx, ny) {
        return { x: cx + nx * scale, y: cy + ny * scale };
      }

      function toNorm(sx, sy) {
        return { x: (sx - cx) / scale, y: (sy - cy) / scale };
      }

      fillCream(ctx, width, height);

      // Potential & Field Calculation Helpers: E = -∇V
      function getV(nx, ny) {
        let v = 0;
        const epsSq = 0.008;
        for (let i = 0; i < state.charges.length; i++) {
          const c = state.charges[i];
          const dx = nx - c.x;
          const dy = ny - c.y;
          const dist = Math.sqrt(dx * dx + dy * dy + epsSq);
          v += (25.0 * c.q) / dist;
        }
        return v;
      }

      function getE(nx, ny) {
        let ex = 0, ey = 0;
        const epsSq = 0.008;
        for (let i = 0; i < state.charges.length; i++) {
          const c = state.charges[i];
          const dx = nx - c.x;
          const dy = ny - c.y;
          const distSq = dx * dx + dy * dy + epsSq;
          const dist = Math.sqrt(distSq);
          // E = -∇V ==> E_x = +k*q*dx / dist^3
          const factor = (25.0 * c.q) / (distSq * dist);
          ex += factor * dx;
          ey += factor * dy;
        }
        return { ex: ex, ey: ey, mag: Math.sqrt(ex * ex + ey * ey) };
      }

      // 1. Potential Heatmap
      if (state.showHeatmap) {
        const gridStep = 8;
        const cols = Math.ceil(width / gridStep);
        const rows = Math.ceil(plotHeight / gridStep);

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const sx = c * gridStep;
            const sy = r * gridStep;
            const norm = toNorm(sx + gridStep / 2, sy + gridStep / 2);
            const v = getV(norm.x, norm.y);
            ctx.fillStyle = creamPotentialColor(v, 45, 0.32);
            ctx.fillRect(sx, sy, gridStep, gridStep);
          }
        }
      }

      // 2. Continuous Equipotential Contours via Marching Squares
      if (state.showEquipotentials) {
        const isoLevels = [-60, -45, -30, -20, -12, -6, -2, 0, 2, 6, 12, 20, 30, 45, 60];
        drawMarchingContours(ctx, getV, toNorm, toScreen, width, plotHeight, isoLevels, 8);
      }

      // 3. Electric Field Vector Grid: E = -∇V
      if (state.showVectors) {
        ctx.save();
        const vCols = 11;
        const vRows = 8;
        const dx = (width - 48) / (vCols - 1);
        const dy = (plotHeight - 48) / (vRows - 1);

        for (let i = 0; i < vCols; i++) {
          for (let j = 0; j < vRows; j++) {
            const sx = 24 + i * dx;
            const sy = 24 + j * dy;
            const norm = toNorm(sx, sy);
            let tooClose = false;
            if (state.charges) {
              for (let ci = 0; ci < state.charges.length; ci++) {
                if (Math.hypot(norm.x - state.charges[ci].x, norm.y - state.charges[ci].y) < 0.16) {
                  tooClose = true;
                  break;
                }
              }
            }
            if (state.testCharge && Math.hypot(norm.x - state.testCharge.x, norm.y - state.testCharge.y) < 0.18) tooClose = true;
            if (tooClose) continue;
            const res = getE(norm.x, norm.y);
            const ex = res.ex, ey = res.ey, mag = res.mag;

            if (mag > 0.1) {
              const len = Math.min(16, 5 + Math.log10(mag + 1) * 5);
              const angle = Math.atan2(ey, ex);

              const intensity = clamp(mag / 80, 0, 1);
              ctx.strokeStyle = "rgba(212, 160, 23, " + (0.28 + 0.5 * intensity) + ")";
              ctx.fillStyle = "rgba(212, 160, 23, " + (0.32 + 0.5 * intensity) + ")";
              ctx.lineWidth = 1.15;

              ctx.beginPath();
              ctx.moveTo(sx, sy);
              const tox = sx + Math.cos(angle) * len;
              const toy = sy + Math.sin(angle) * len;
              ctx.lineTo(tox, toy);
              ctx.stroke();

              const headLen = 3.5;
              ctx.beginPath();
              ctx.moveTo(tox, toy);
              ctx.lineTo(tox - headLen * Math.cos(angle - Math.PI / 6), toy - headLen * Math.sin(angle - Math.PI / 6));
              ctx.lineTo(tox - headLen * Math.cos(angle + Math.PI / 6), toy - headLen * Math.sin(angle + Math.PI / 6));
              ctx.closePath();
              ctx.fill();
            }
          }
        }
        ctx.restore();
      }

      // 4. Streamline Tracers
      if (state.showStreamlines && state.particles) {
        ctx.save();
        state.particles.forEach(p => {
          p.age += dt * speed * 30;
          if (p.age > p.maxAge || Math.abs(p.x) > 1.2 || Math.abs(p.y) > 1.2) {
            p.x = (Math.random() - 0.5) * 1.6;
            p.y = (Math.random() - 0.5) * 1.6;
            p.age = 0;
            p.maxAge = 60 + Math.random() * 60;
          }

          const res = getE(p.x, p.y);
          const ex = res.ex, ey = res.ey, mag = res.mag;
          if (mag > 0.05) {
            const vSpeed = 0.4 / Math.pow(mag + 0.5, 0.4);
            p.x += (ex / (mag + 0.01)) * vSpeed * dt * speed;
            p.y += (ey / (mag + 0.01)) * vSpeed * dt * speed;
          }

          const screenPos = toScreen(p.x, p.y);
          const alpha = Math.sin((p.age / p.maxAge) * Math.PI) * 0.75;
          ctx.fillStyle = "rgba(204, 120, 92, " + alpha + ")";
          ctx.beginPath();
          ctx.arc(screenPos.x, screenPos.y, 1.8, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      }

      // 5. Render Source Charges
      state.charges.forEach(c => {
        const s = toScreen(c.x, c.y);
        ctx.save();

        const rad = 14;
        const grad = ctx.createRadialGradient(s.x, s.y, 2, s.x, s.y, rad * 1.8);
        if (c.q > 0) {
          grad.addColorStop(0, "rgba(204, 120, 92, 0.9)");
          grad.addColorStop(1, "rgba(204, 120, 92, 0.0)");
        } else {
          grad.addColorStop(0, "rgba(93, 184, 166, 0.9)");
          grad.addColorStop(1, "rgba(93, 184, 166, 0.0)");
        }
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(s.x, s.y, rad * 1.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = c.q > 0 ? CORAL : TEAL;
        ctx.beginPath();
        ctx.arc(s.x, s.y, rad, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = CREAM;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = CREAM;
        ctx.font = "bold 15px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(c.q > 0 ? "+" : "−", s.x, s.y);
        ctx.restore();
      });

      // 6. Test Charge Probe & Detailed Orthogonality Vector Display
      if (state.testCharge && state.testCharge.active) {
        const tp = state.testCharge;
        const s = toScreen(tp.x, tp.y);
        const res = getE(tp.x, tp.y);
        const ex = res.ex, ey = res.ey, mag = res.mag;
        const vAtProbe = getV(tp.x, tp.y);

        ctx.save();
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 8, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = GOLD;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 3.5, 0, Math.PI * 2);
        ctx.fill();

        if (mag > 0.01) {
          const normEx = ex / mag;
          const normEy = ey / mag;
          const tanLen = clampArrowLen(s.x, s.y, -normEy, normEx, 36, 16, width, plotHeight);
          const tanLen2 = clampArrowLen(s.x, s.y, normEy, -normEx, 36, 16, width, plotHeight);
          const arrowLen = clampArrowLen(s.x, s.y, normEx, normEy, Math.min(52, 18 + mag * 0.5), 18, width, plotHeight);
          const gradLen = clampArrowLen(s.x, s.y, -normEx, -normEy, arrowLen * 0.85, 18, width, plotHeight);

          ctx.strokeStyle = MUTED;
          ctx.setLineDash([3, 3]);
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(s.x - (-normEy) * tanLen2, s.y - normEx * tanLen2);
          ctx.lineTo(s.x + (-normEy) * tanLen, s.y + normEx * tanLen);
          ctx.stroke();
          ctx.setLineDash([]);

          const gx = s.x - normEx * gradLen;
          const gy = s.y - normEy * gradLen;
          drawSiteArrow(ctx, s.x, s.y, gx, gy, CORAL, 2.4);

          const exTox = s.x + normEx * arrowLen;
          const eyToy = s.y + normEy * arrowLen;
          drawSiteArrow(ctx, s.x, s.y, exTox, eyToy, TEAL, 2.8);

          inkLabel(ctx, 'E', exTox + normEx * 10, eyToy + normEy * 10, { color: TEAL, align: 'center', width: width, height: plotHeight, font: 'bold 12px sans-serif' });
          inkLabel(ctx, '∇V', gx - normEx * 10, gy - normEy * 10, { color: CORAL, align: 'center', width: width, height: plotHeight, font: 'bold 12px sans-serif' });

          const rSize = 8;
          ctx.strokeStyle = INK;
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(s.x + normEx * rSize, s.y + normEy * rSize);
          ctx.lineTo(s.x + normEx * rSize + (-normEy) * rSize, s.y + normEy * rSize + normEx * rSize);
          ctx.lineTo(s.x + (-normEy) * rSize, s.y + normEx * rSize);
          ctx.stroke();
        }

        ctx.restore();

        var legendRows = [
          { label: '$V(\\mathbf{r})$', value: vAtProbe.toFixed(2) + ' V' },
          { label: '$|\\mathbf{E}|$', value: mag.toFixed(2) + ' N/C' },
          { label: 'angle', value: (Math.atan2(ey, ex) * 180 / Math.PI).toFixed(1) + ' deg' },
          { label: 'Geometry', value: '$\\mathbf{E}$ downhill, perpendicular to the equipotential' }
        ];
        if (state.showProfile) {
          legendRows.push({ label: 'Slice', value: '$V(x)$ teal, $E_x$ gold at y = ' + tp.y.toFixed(2) });
        }
        appendLegend('$\\mathbf{E} = -\\nabla V$ at probe', legendRows);
      }

      // 7. Bottom 1D Cross-Section Graph: V(x) and E_x(x) = -dV/dx
      if (state.showProfile) {
        const pTop = plotHeight + 6;
        const pHeight = height - pTop - 8;
        const pWidth = width - 30;
        const pLeft = 15;

        ctx.save();
        ctx.fillStyle = PANEL;
        ctx.strokeStyle = LINE;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(pLeft, pTop, pWidth, pHeight, 6);
        ctx.fill();
        ctx.stroke();

        inkLabel(ctx, 'V', pLeft + 16, pTop + 12, { color: TEAL, align: 'left', width: width, height: height, font: 'bold 11px sans-serif' });
        inkLabel(ctx, 'E_x', pLeft + 40, pTop + 12, { color: GOLD, align: 'left', width: width, height: height, font: 'bold 11px sans-serif' });

        const midY = pTop + pHeight / 2 + 6;
        ctx.strokeStyle = LINE;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(pLeft + 5, midY);
        ctx.lineTo(pLeft + pWidth - 5, midY);
        ctx.stroke();
        ctx.setLineDash([]);

        const scanY = state.testCharge ? state.testCharge.y : 0;
        const samples = 120;
        const vPoints = [];
        const ePoints = [];

        for (let i = 0; i <= samples; i++) {
          const nx = -1.0 + (2.0 * i) / samples;
          const v = getV(nx, scanY);
          const ex = getE(nx, scanY).ex;
          const sx = pLeft + 10 + (i / samples) * (pWidth - 20);
          vPoints.push({ sx: sx, sy: midY - clamp(v * 0.7, -pHeight * 0.42, pHeight * 0.42) });
          ePoints.push({ sx: sx, sy: midY - clamp(ex * 0.4, -pHeight * 0.42, pHeight * 0.42) });
        }

        ctx.strokeStyle = TEAL;
        ctx.lineWidth = 2;
        ctx.beginPath();
        vPoints.forEach((pt, i) => {
          if (i === 0) ctx.moveTo(pt.sx, pt.sy);
          else ctx.lineTo(pt.sx, pt.sy);
        });
        ctx.stroke();

        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ePoints.forEach((pt, i) => {
          if (i === 0) ctx.moveTo(pt.sx, pt.sy);
          else ctx.lineTo(pt.sx, pt.sy);
        });
        ctx.stroke();

        if (state.testCharge) {
          const probeSx = pLeft + 10 + ((state.testCharge.x + 1.0) / 2.0) * (pWidth - 20);
          ctx.strokeStyle = GOLD;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.moveTo(probeSx, pTop + 20);
          ctx.lineTo(probeSx, pTop + pHeight - 4);
          ctx.stroke();
        }

        ctx.restore();
      }

      // Mouse/Touch Drag Handlers with dynamic coordinates and touch support
      if (!state._handlersAttached && ctx.canvas) {
        state._handlersAttached = true;
        const cvs = ctx.canvas;

        function getMousePos(evt) {
          const rect = cvs.getBoundingClientRect();
          const clientX = evt.touches && evt.touches.length > 0 ? evt.touches[0].clientX : evt.clientX;
          const clientY = evt.touches && evt.touches.length > 0 ? evt.touches[0].clientY : evt.clientY;
          return {
            x: (clientX - rect.left) * (cvs.width / rect.width),
            y: (clientY - rect.top) * (cvs.height / rect.height)
          };
        }

        function getDynTransforms() {
          const w = cvs.width;
          const h = cvs.height;
          const pH = state.showProfile ? h * 0.72 : h;
          const sz = Math.min(w - 40, pH - 40);
          const cX = w / 2;
          const cY = pH / 2;
          const sc = sz / 2.2;
          return {
            toScreen: (nx, ny) => ({ x: cX + nx * sc, y: cY + ny * sc }),
            toNorm: (sx, sy) => ({ x: (sx - cX) / sc, y: (sy - cY) / sc })
          };
        }

        function onDown(evt) {
          const m = getMousePos(evt);
          const trans = getDynTransforms();
          if (state.testCharge) {
            const tpScreen = trans.toScreen(state.testCharge.x, state.testCharge.y);
            if (Math.hypot(m.x - tpScreen.x, m.y - tpScreen.y) < 22) {
              state.isDragging = "test";
              if (evt.cancelable) evt.preventDefault();
              return;
            }
          }
          if (state.charges) {
            for (let i = 0; i < state.charges.length; i++) {
              const c = state.charges[i];
              const cpScreen = trans.toScreen(c.x, c.y);
              if (Math.hypot(m.x - cpScreen.x, m.y - cpScreen.y) < 20) {
                state.isDragging = i;
                if (evt.cancelable) evt.preventDefault();
                return;
              }
            }
          }
        }

        function onMove(evt) {
          if (state.isDragging === null) return;
          if (evt.cancelable) evt.preventDefault();
          const m = getMousePos(evt);
          const trans = getDynTransforms();
          const norm = trans.toNorm(m.x, m.y);
          const clampedX = clamp(norm.x, -0.95, 0.95);
          const clampedY = clamp(norm.y, -0.95, 0.95);

          if (state.isDragging === "test" && state.testCharge) {
            state.testCharge.x = clampedX;
            state.testCharge.y = clampedY;
          } else if (typeof state.isDragging === "number" && state.charges && state.charges[state.isDragging]) {
            state.charges[state.isDragging].x = clampedX;
            state.charges[state.isDragging].y = clampedY;
          }
        }

        function onUp() {
          state.isDragging = null;
        }

        if (cvs.addEventListener) {
          cvs.addEventListener("mousedown", onDown);
          cvs.addEventListener("mousemove", onMove);
          cvs.addEventListener("touchstart", onDown, { passive: false });
          cvs.addEventListener("touchmove", onMove, { passive: false });
        }
        if (typeof window !== "undefined" && window.addEventListener) {
          window.addEventListener("mouseup", onUp);
          window.addEventListener("touchend", onUp);
          window.addEventListener("touchcancel", onUp);
        }
      }
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

  PGRE.visualizers['cpgf-2.8'] = {
    id: "cpgf-2.8",
    topic: 'em',
    title: "Poisson Integral for Electric Potential",
    formulaLatex: "V(\\mathbf{r}) = \\frac{1}{4\\pi\\epsilon_0} \\int \\frac{\\rho(\\mathbf{r'})}{|\\mathbf{r} - \\mathbf{r'}|} d^3\\mathbf{r'}",
    physicalStory: `The Poisson integral represents the fundamental Green's function solution to Poisson's equation $\\nabla^2 V = -\\rho / \\epsilon_0$ subject to the Dirichlet boundary condition that the potential vanishes at infinity ($V \\to 0$ as $r \\to \\infty$).

In the language of linear differential operators, the Green's function $G(\\mathbf{r}, \\mathbf{r'}) = \\frac{1}{4\\pi|\\mathbf{r} - \\mathbf{r'}|}$ is the impulse response of free space to a unit point charge: $\\nabla^2\\left(\\frac{-1}{4\\pi|\\mathbf{r} - \\mathbf{r'}|}\\right) = \\delta^3(\\mathbf{r} - \\mathbf{r'})$. By invoking the Principle of Linear Superposition, any arbitrary continuous charge distribution $\\rho(\\mathbf{r'})$ can be viewed as an uncountably infinite ensemble of point charges $dq = \\rho(\\mathbf{r'}) d^3\\mathbf{r'}$.

Because electric potential is a true scalar field (unlike the vector electric field $\\mathbf{E}$, which demands tedious component-by-component trigonometric integrals), integrating the Poisson kernel is vastly more tractable. Once the global scalar potential $V(\\mathbf{r})$ is determined analytically or numerically, the electric field is readily recovered everywhere by taking the spatial gradient $\\mathbf{E} = -\\nabla V$.

Furthermore, expanding the Poisson kernel $|\\mathbf{r} - \\mathbf{r'}|^{-1}$ in terms of Legendre polynomials for field points far from the source ($r \\gg r'$) directly generates the multipole expansion: monopole ($1/r$), dipole ($1/r^2$), quadrupole ($1/r^3$), and higher $2^l$-pole moments.`,

    derivationSteps: [
      {
        step: 1,
        title: "Gauss's Law in Differential Form",
        latex: "\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\epsilon_0}",
        description: "Maxwell's first equation connects the local divergence of the electric field to the local volume charge density rho."
      },
      {
        step: 2,
        title: "Substitution of Scalar Potential",
        latex: "\\nabla \\cdot (-\\nabla V) = \\frac{\\rho}{\\epsilon_0} \\implies \\nabla^2 V = -\\frac{\\rho}{\\epsilon_0}",
        description: "Inserting E = -∇V yields Poisson's equation, the central second-order linear PDE of electrostatics."
      },
      {
        step: 3,
        title: "Free-Space Green's Function",
        latex: "\\nabla^2 \\left( \\frac{1}{|\\mathbf{r} - \\mathbf{r'}|} \\right) = -4\\pi \\delta^3(\\mathbf{r} - \\mathbf{r'})",
        description: "The Laplacian of the inverse distance kernel is zero everywhere except at r = r', where it yields a 3D Dirac delta function."
      },
      {
        step: 4,
        title: "Convolution over Source Distribution",
        latex: "V(\\mathbf{r}) = \\int G(\\mathbf{r}, \\mathbf{r'}) \\left(\\frac{\\rho(\\mathbf{r'})}{\\epsilon_0}\\right) d^3\\mathbf{r'} = \\frac{1}{4\\pi\\epsilon_0}\\int \\frac{\\rho(\\mathbf{r'})}{|\\mathbf{r} - \\mathbf{r'}|} d^3\\mathbf{r'}",
        description: "Convolving the source distribution rho(r') with the Green's kernel yields the complete Poisson integral."
      },
      {
        step: 5,
        title: "Multipole Expansion Far-Field Limit",
        latex: "V(\\mathbf{r}) = \\frac{1}{4\\pi\\epsilon_0}\\left[ \\frac{Q_{\\text{tot}}}{r} + \\frac{\\mathbf{p}\\cdot\\hat{\\mathbf{r}}}{r^2} + \\frac{1}{2r^3}\\sum_{j,k} Q_{jk}\\hat{r}_j\\hat{r}_k + \\mathcal{O}\\left(\\frac{1}{r^4}\\right) \\right]",
        description: "Taylor expanding the kernel |r - r'|⁻¹ for r >> r' yields the hierarchy of multipole moments."
      }
    ],

    limitingCases: [
      {
        name: "Uniformly Charged Sphere (Radius R, Total Charge Q)",
        condition: "\\rho(r') = \\frac{3Q}{4\\pi R^3} \\Theta(R - r')",
        formula: "V(r) = \\begin{cases} \\frac{Q}{4\\pi\\epsilon_0 r} & r \\ge R \\\\ \\frac{Q}{8\\pi\\epsilon_0 R}\\left(3 - \\frac{r^2}{R^2}\\right) & r < R \\end{cases}",
        description: "Newton's Shell Theorem: Outside the sphere, potential is identical to a point charge Q at the center. Inside, potential is parabolic with a maximum at origin V(0) = 1.5 V_surface."
      },
      {
        name: "Spherical Shell (Radius R, Total Charge Q)",
        condition: "\\sigma(r') = \\frac{Q}{4\\pi R^2} \\delta(r' - R)",
        formula: "V(r) = \\begin{cases} \\frac{Q}{4\\pi\\epsilon_0 r} & r \\ge R \\\\ \\frac{Q}{4\\pi\\epsilon_0 R} & r < R \\end{cases}",
        description: "Inside a hollow charged shell, V(r) is strictly constant everywhere, guaranteeing E = -∇V = 0 (Faraday cage effect)."
      },
      {
        name: "Charged Ring (Radius R, on Axis z)",
        condition: "\\lambda = \\frac{Q}{2\\pi R}, \\quad \\mathbf{r} = (0, 0, z)",
        formula: "V(z) = \\frac{Q}{4\\pi\\epsilon_0 \\sqrt{R^2 + z^2}}",
        description: "Every element of the ring is equidistant d = sqrt(R²+z²) from the axial field point. As z >> R, V(z) -> Q / (4πε0 z)."
      },
      {
        name: "Infinite Line of Charge (Divergence at Infinity)",
        condition: "L \\to \\infty, \\quad \\lambda = \\text{const}",
        formula: "V(s) = -\\frac{\\lambda}{2\\pi\\epsilon_0}\\ln\\left(\\frac{s}{s_0}\\right)",
        description: "For infinite non-localized distributions, the integral diverges if the reference point is set at infinity. The reference must be placed at a finite distance s_0."
      }
    ],

    greTraps: [
      {
        trap: "Integrating Vector $\\mathbf{E}$ vs Scalar $V$",
        warning: "Never attempt to integrate Coulomb's vector field $\\mathbf{E} = k \\int (dq/r^2)\\,\\hat{\\mathbf{r}}$ directly when computing fields of symmetric bodies unless forced. Always calculate scalar $V(\\mathbf{r}) = k \\int (dq/r)$ first, then differentiate $\\mathbf{E} = -\\nabla V$."
      },
      {
        trap: "Continuity of $V$ vs Discontinuity of $\\mathbf{E}$ Across Surface Charge",
        warning: "The electric potential $V(\\mathbf{r})$ is always continuous across any surface charge layer $\\sigma$. However, the normal electric field component jumps by $\\Delta E_\\perp = \\sigma / \\epsilon_0$, corresponding to a sharp kink in $V$."
      },
      {
        trap: "Electrostatic Self-Energy and Double Counting",
        warning: "The work required to assemble a continuous charge distribution is $W = \\frac{1}{2}\\int \\rho V\\, d^3r$. The prefactor of $1/2$ avoids double-counting pairwise interactions. For a uniform solid sphere, $W = \\frac{3}{5} Q^2 / (4\\pi\\epsilon_0 R)$."
      },
      {
        trap: "Origin Dependence of Dipole Moment",
        warning: "The electric dipole moment $\\mathbf{p} = \\int \\mathbf{r}' \\rho(\\mathbf{r}') d^3r'$ is origin-independent if and only if the net total charge $Q_{\\mathrm{tot}} = 0$. If $Q_{\\mathrm{tot}} \\neq 0$, shifting origin by $\\mathbf{a}$ changes the dipole: $\\mathbf{p}' = \\mathbf{p} - Q_{\\mathrm{tot}}\\mathbf{a}$."
      }
    ],

    parameters: [
      { id: "geometry", label: "Charge Geometry", type: "select", default: "sphere_solid", options: [
        { value: "sphere_solid", label: "Uniform solid sphere" },
        { value: "sphere_shell", label: "Hollow spherical shell" },
        { value: "ring", label: "Charged circular ring" },
        { value: "line_segment", label: "Finite line segment" },
        { value: "disk", label: "Uniform charged disk" }
      ]},
      { id: "viewMode", label: "Visualizer Mode", type: "select", default: "2d_contour", options: [
        { value: "2d_contour", label: "2D contour map" },
        { value: "3d_surface", label: "3D potential surface" },
        { value: "1d_falloff", label: "1D radial profile" }
      ]},
      { id: "radius", label: "Dimension ($R$ / $L$)", type: "range", min: 0.15, max: 0.65, step: 0.02, default: 0.35 },
      { id: "totalCharge", label: "Total Charge ($Q$)", type: "range", min: 0.2, max: 3.0, step: 0.1, default: 1.0 },
      { id: "rotX", label: "3D Tilt Angle", type: "range", min: 20, max: 80, step: 2, default: 55 },
      { id: "rotZ", label: "3D Azimuth Angle", type: "range", min: -180, max: 180, step: 5, default: 35 }
    ],

    init: function(container, state, redraw) {
      state.geometry = state.geometry || "sphere_solid";
      state.viewMode = state.viewMode || "2d_contour";
      state.radius = state.radius !== undefined ? state.radius : 0.35;
      state.totalCharge = state.totalCharge !== undefined ? state.totalCharge : 1.0;
      state.rotX = state.rotX !== undefined ? state.rotX : 55;
      state.rotZ = state.rotZ !== undefined ? state.rotZ : 35;
      state.probe = state.probe || { x: 0.45, y: 0.25 };
      state.isDraggingProbe = false;
    },

    draw: function(ctx, width, height, state, dt) {
      state = state || {};

      state.geometry = state.geometry || "sphere_solid";
      state.viewMode = state.viewMode || "2d_contour";
      state.radius = state.radius !== undefined ? state.radius : 0.35;
      state.totalCharge = state.totalCharge !== undefined ? state.totalCharge : 1.0;
      state.rotX = state.rotX !== undefined ? state.rotX : 55;
      state.rotZ = state.rotZ !== undefined ? state.rotZ : 35;
      state.probe = state.probe || { x: 0.45, y: 0.25 };

      fillCream(ctx, width, height);

      const R = state.radius;
      const Q = state.totalCharge;
      const geo = state.geometry;

      function calcVandE(x, y) {
        const r = Math.sqrt(x * x + y * y);
        const kQ = 28.0 * Q;
        let v = 0, er = 0, ex = 0, ey = 0;

        if (geo === "sphere_solid") {
          if (r >= R) {
            v = kQ / (r + 0.001);
            er = kQ / ((r + 0.001) * (r + 0.001));
          } else {
            v = (kQ / (2 * R)) * (3 - (r * r) / (R * R));
            er = (kQ * r) / (R * R * R);
          }
          if (r > 0.0001) {
            ex = er * (x / r);
            ey = er * (y / r);
          }
        } else if (geo === "sphere_shell") {
          if (r >= R) {
            v = kQ / (r + 0.001);
            er = kQ / ((r + 0.001) * (r + 0.001));
          } else {
            v = kQ / R;
            er = 0;
          }
          if (r > 0.0001) {
            ex = er * (x / r);
            ey = er * (y / r);
          }
        } else if (geo === "ring") {
          const N = 36;
          let sumV = 0, sumEx = 0, sumEy = 0;
          for (let i = 0; i < N; i++) {
            const phi = (i / N) * 2 * Math.PI;
            const rx = R * Math.cos(phi);
            const ry = R * Math.sin(phi);
            const dx = x - rx;
            const dy = y - ry;
            const dist = Math.sqrt(dx * dx + dy * dy + 0.006);
            const dq = kQ / N;
            sumV += dq / dist;
            sumEx += (dq * dx) / (dist * dist * dist);
            sumEy += (dq * dy) / (dist * dist * dist);
          }
          v = sumV;
          ex = sumEx;
          ey = sumEy;
        } else if (geo === "line_segment") {
          const L = R;
          const y1 = y + L;
          const y2 = y - L;
          const d1 = Math.sqrt(x * x + y1 * y1 + 0.005);
          const d2 = Math.sqrt(x * x + y2 * y2 + 0.005);
          const lambda = kQ / (2 * L);
          v = lambda * Math.log(Math.max(1e-5, (y1 + d1) / (y2 + d2 + 1e-6)));

          const h = 0.005;
          const v_px = lambda * Math.log(Math.max(1e-5, (y1 + Math.sqrt((x + h) * (x + h) + y1 * y1)) / (y2 + Math.sqrt((x + h) * (x + h) + y2 * y2))));
          const v_mx = lambda * Math.log(Math.max(1e-5, (y1 + Math.sqrt((x - h) * (x - h) + y1 * y1)) / (y2 + Math.sqrt((x - h) * (x - h) + y2 * y2))));
          const v_py = lambda * Math.log(Math.max(1e-5, ((y + h + L) + Math.sqrt(x * x + (y + h + L) * (y + h + L))) / ((y + h - L) + Math.sqrt(x * x + (y + h - L) * (y + h - L)))));
          const v_my = lambda * Math.log(Math.max(1e-5, ((y - h + L) + Math.sqrt(x * x + (y - h + L) * (y - h + L))) / ((y - h - L) + Math.sqrt(x * x + (y - h - L) * (y - h - L)))));
          ex = -(v_px - v_mx) / (2 * h);
          ey = -(v_py - v_my) / (2 * h);
        } else if (geo === "disk") {
          const rings = 6;
          const sectors = 16;
          let sumV = 0, sumEx = 0, sumEy = 0;
          let totalW = 0;
          for (let ri = 1; ri <= rings; ri++) {
            const rad = (ri / rings) * R;
            const w = ri;
            totalW += w * sectors;
            for (let si = 0; si < sectors; si++) {
              const phi = (si / sectors) * 2 * Math.PI;
              const rx = rad * Math.cos(phi);
              const ry = rad * Math.sin(phi);
              const dx = x - rx;
              const dy = y - ry;
              const dist = Math.sqrt(dx * dx + dy * dy + 0.008);
              sumV += w / dist;
              sumEx += (w * dx) / (dist * dist * dist);
              sumEy += (w * dy) / (dist * dist * dist);
            }
          }
          v = (kQ * sumV) / totalW;
          ex = (kQ * sumEx) / totalW;
          ey = (kQ * sumEy) / totalW;
        }

        const mag = Math.sqrt(ex * ex + ey * ey);
        return { v: v, ex: ex, ey: ey, mag: mag, r: r };
      }

      function calcAxisVandE(z) {
        var kQ = 28.0 * Q;
        var d = Math.sqrt(R * R + z * z + 1e-12);
        if (geo === "ring") {
          return { v: kQ / d, mag: Math.abs(kQ * z) / (d * d * d) };
        }
        var two = (2 * kQ) / (R * R + 1e-12);
        var absZ = Math.abs(z);
        return { v: two * (d - absZ), mag: two * (1 - absZ / d) };
      }

      // ==========================================
      // VIEW MODE 1: 2D CONTOUR & EQUIPOTENTIALS
      // ==========================================
      if (state.viewMode === "2d_contour") {
        const cx = width / 2;
        const cy = height / 2;
        const scale = Math.min(width, height) / 2.3;

        function toScreen(nx, ny) {
          return { x: cx + nx * scale, y: cy + ny * scale };
        }
        function toNorm(sx, sy) {
          return { x: (sx - cx) / scale, y: (sy - cy) / scale };
        }

        // Potential Heatmap
        const step = 8;
        const cols = Math.ceil(width / step);
        const rows = Math.ceil(height / step);
        for (let j = 0; j < rows; j++) {
          for (let i = 0; i < cols; i++) {
            const norm = toNorm(i * step + step / 2, j * step + step / 2);
            const v = calcVandE(norm.x, norm.y).v;
            ctx.fillStyle = creamPotentialColor(v, 70, 0.34);
            ctx.fillRect(i * step, j * step, step, step);
          }
        }

        // Marching Squares Equipotential Contours
        const isoLevels = [10, 20, 30, 45, 60, 80, 100, 130];
        drawMarchingContours(ctx, (nx, ny) => calcVandE(nx, ny).v, toNorm, toScreen, width, height, isoLevels, 8);

        // Render Geometry Source Boundary
        ctx.save();
        const centerScreen = toScreen(0, 0);
        const rScreen = R * scale;

        if (geo === "sphere_solid" || geo === "disk") {
          ctx.fillStyle = "rgba(204, 120, 92, 0.22)";
          ctx.strokeStyle = CORAL;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(centerScreen.x, centerScreen.y, rScreen, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.strokeStyle = INK;
          ctx.lineWidth = 1.2;
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.moveTo(centerScreen.x, centerScreen.y);
          ctx.lineTo(centerScreen.x + rScreen, centerScreen.y);
          ctx.stroke();
          ctx.setLineDash([]);
          inkLabel(ctx, 'R', centerScreen.x + rScreen / 2, centerScreen.y - 10, { color: INK, align: 'center', width: width, height: height, font: 'bold 11px sans-serif' });
        } else if (geo === "sphere_shell") {
          ctx.strokeStyle = CORAL;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(centerScreen.x, centerScreen.y, rScreen, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = "rgba(204, 120, 92, 0.08)";
          ctx.fill();
        } else if (geo === "ring") {
          ctx.strokeStyle = CORAL;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(centerScreen.x, centerScreen.y, rScreen, 0, Math.PI * 2);
          ctx.stroke();
        } else if (geo === "line_segment") {
          const lScreen = R * scale;
          ctx.strokeStyle = CORAL;
          ctx.lineWidth = 6;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(centerScreen.x, centerScreen.y - lScreen);
          ctx.lineTo(centerScreen.x, centerScreen.y + lScreen);
          ctx.stroke();
          ctx.lineCap = "butt";
        }
        ctx.restore();

        // Vector Field
        ctx.save();
        const vStep = 36;
        for (let sx = 20; sx < width; sx += vStep) {
          for (let sy = 20; sy < height; sy += vStep) {
            const norm = toNorm(sx, sy);
            if (state.probe && Math.hypot(norm.x - state.probe.x, norm.y - state.probe.y) < 0.16) continue;
            const res = calcVandE(norm.x, norm.y);
            const ex = res.ex, ey = res.ey, mag = res.mag;
            if (mag > 0.2) {
              const len = Math.min(18, 5 + Math.log10(mag + 1) * 6);
              const angle = Math.atan2(ey, ex);
              ctx.strokeStyle = "rgba(212, 160, 23, 0.55)";
              ctx.fillStyle = "rgba(212, 160, 23, 0.55)";
              ctx.lineWidth = 1.2;

              ctx.beginPath();
              ctx.moveTo(sx, sy);
              const tox = sx + Math.cos(angle) * len;
              const toy = sy + Math.sin(angle) * len;
              ctx.lineTo(tox, toy);
              ctx.stroke();

              ctx.beginPath();
              ctx.moveTo(tox, toy);
              ctx.lineTo(tox - 3 * Math.cos(angle - Math.PI / 6), toy - 3 * Math.sin(angle - Math.PI / 6));
              ctx.lineTo(tox - 3 * Math.cos(angle + Math.PI / 6), toy - 3 * Math.sin(angle + Math.PI / 6));
              ctx.closePath();
              ctx.fill();
            }
          }
        }
        ctx.restore();

        // Draggable Probe Badge
        if (state.probe) {
          const ps = toScreen(state.probe.x, state.probe.y);
          const res = calcVandE(state.probe.x, state.probe.y);
          const v = res.v, mag = res.mag, r = res.r;

          ctx.save();
          ctx.strokeStyle = GOLD;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(ps.x, ps.y, 8, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = GOLD;
          ctx.beginPath();
          ctx.arc(ps.x, ps.y, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          var geoLabel = geo === "sphere_solid" ? "solid sphere" : (geo === "sphere_shell" ? "spherical shell" : (geo === "ring" ? "ring" : (geo === "disk" ? "disk" : "line segment")));
          appendLegend('Poisson integral for $V$', [
            { label: 'Source', value: geoLabel },
            { label: '$r$', value: r.toFixed(3) + (r < R ? ' (inside)' : ' (outside)') },
            { label: '$V(r)$', value: v.toFixed(2) + ' V' },
            { label: '$|\\mathbf{E}|$', value: mag.toFixed(2) + ' N/C' },
            { label: 'Coulomb $kQ/r$ (matches outside / far field)', value: (28.0 * Q / Math.max(0.01, r)).toFixed(2) + ' V' },
            { label: '3D tilt', value: 'unused in this view' }
          ]);
        }
      }

      // ==========================================
      // VIEW MODE 2: 3D POTENTIAL FUNNEL SURFACE
      // ==========================================
      else if (state.viewMode === "3d_surface") {
        ctx.save();
        const rotXRad = (state.rotX * Math.PI) / 180;
        const rotZRad = (state.rotZ * Math.PI) / 180;

        const gridN = 32;
        const bound = 1.0;
        const cx = width / 2;
        const cy = height / 2 + 30;
        const gridScale = Math.min(width, height) * 0.44;

        function project3D(nx, ny, nz) {
          const cosZ = Math.cos(rotZRad), sinZ = Math.sin(rotZRad);
          const x1 = nx * cosZ - ny * sinZ;
          const y1 = nx * sinZ + ny * cosZ;
          const cosX = Math.cos(rotXRad), sinX = Math.sin(rotXRad);
          const y2 = y1 * cosX - nz * sinX;
          const z2 = y1 * sinX + nz * cosX;

          return {
            x: cx + x1 * gridScale,
            y: cy + y2 * gridScale,
            depth: z2
          };
        }

        ctx.strokeStyle = PGRE.vizStageTheme().ivory;
        ctx.lineWidth = 1;
        for (let i = -gridN / 2; i <= gridN / 2; i += 4) {
          const u = (i / (gridN / 2)) * bound;
          const p1 = project3D(u, -bound, 0);
          const p2 = project3D(u, bound, 0);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();

          const p3 = project3D(-bound, u, 0);
          const p4 = project3D(bound, u, 0);
          ctx.beginPath();
          ctx.moveTo(p3.x, p3.y);
          ctx.lineTo(p4.x, p4.y);
          ctx.stroke();
        }

        const quads = [];
        const dCoord = (2 * bound) / gridN;

        for (let i = 0; i < gridN; i++) {
          for (let j = 0; j < gridN; j++) {
            const x0 = -bound + i * dCoord;
            const y0 = -bound + j * dCoord;
            const x1 = x0 + dCoord;
            const y1 = y0 + dCoord;

            const v00 = calcVandE(x0, y0).v * 0.015;
            const v10 = calcVandE(x1, y0).v * 0.015;
            const v11 = calcVandE(x1, y1).v * 0.015;
            const v01 = calcVandE(x0, y1).v * 0.015;

            const p00 = project3D(x0, y0, v00);
            const p10 = project3D(x1, y0, v10);
            const p11 = project3D(x1, y1, v11);
            const p01 = project3D(x0, y1, v01);

            const avgDepth = (p00.depth + p10.depth + p11.depth + p01.depth) / 4;
            const avgV = (v00 + v10 + v11 + v01) / 4;

            quads.push({ p00: p00, p10: p10, p11: p11, p01: p01, depth: avgDepth, v: avgV / 0.015 });
          }
        }

        quads.sort((a, b) => a.depth - b.depth);

        quads.forEach(q => {
          ctx.fillStyle = creamPotentialColor(q.v, 50, 0.72);
          ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.08);
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(q.p00.x, q.p00.y);
          ctx.lineTo(q.p10.x, q.p10.y);
          ctx.lineTo(q.p11.x, q.p11.y);
          ctx.lineTo(q.p01.x, q.p01.y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        });

        var geoLabel3 = geo === "sphere_solid" ? "solid sphere" : (geo === "sphere_shell" ? "spherical shell" : (geo === "ring" ? "ring" : (geo === "disk" ? "disk" : "line segment")));
        appendLegend('3D potential landscape $V(x, y)$', [
          { label: 'Source', value: geoLabel3 },
          { label: 'Elevation', value: '$z = V(r)$' },
          { label: 'Drag', value: 'rotate the surface' }
        ]);

        ctx.restore();
      }

      // ==========================================
      // VIEW MODE 3: 1D RADIAL FALLOFF PLOT
      // ==========================================
      else if (state.viewMode === "1d_falloff") {
        ctx.save();
        const pMargin = 60;
        const pLeft = pMargin;
        const pRight = width - 40;
        const pTop = 50;
        const pBottom = height - 60;
        const pW = pRight - pLeft;
        const pH = pBottom - pTop;

        ctx.fillStyle = PANEL;
        ctx.strokeStyle = LINE;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(pLeft - 10, pTop - 10, pW + 20, pH + 20, 8);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = MUTED;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(pLeft, pTop);
        ctx.lineTo(pLeft, pBottom);
        ctx.lineTo(pRight, pBottom);
        ctx.stroke();

        ctx.fillStyle = MUTED;
        ctx.font = "11px sans-serif";
        ctx.textAlign = "center";
        var useAxis = (geo === "ring" || geo === "disk");
        ctx.fillText(useAxis ? "z" : "r", pLeft + pW / 2, pBottom + 28);

        const maxR = 1.2;
        const N = 200;
        const raw = [];
        var i1d;
        var maxV = 1e-6;
        var maxE = 1e-6;
        for (i1d = 1; i1d <= N; i1d++) {
          var coord = (i1d / N) * maxR;
          var res1d = useAxis ? calcAxisVandE(coord) : calcVandE(coord, 0);
          var v1 = res1d.v;
          var mag1 = res1d.mag;
          if (v1 > maxV) maxV = v1;
          if (mag1 > maxE) maxE = mag1;
          raw.push({ coord: coord, v: v1, mag: mag1, vCoulomb: (28.0 * Q) / coord });
        }

        const vPoints = [];
        const ePoints = [];
        const coulombPoints = [];
        raw.forEach(function(s) {
          var sx = pLeft + (s.coord / maxR) * pW;
          vPoints.push({ sx: sx, sy: pBottom - clamp(s.v / maxV, 0, 1) * (pH - 30) });
          ePoints.push({ sx: sx, sy: pBottom - clamp(s.mag / maxE, 0, 1) * (pH - 30) });
          coulombPoints.push({ sx: sx, sy: pBottom - clamp(s.vCoulomb / maxV, 0, 1) * (pH - 30) });
        });

        var showRadialBoundary = (geo === "sphere_solid" || geo === "sphere_shell");
        if (showRadialBoundary) {
          const boundarySx = pLeft + (R / maxR) * pW;
          ctx.strokeStyle = CORAL;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(boundarySx, pTop);
          ctx.lineTo(boundarySx, pBottom);
          ctx.stroke();
          ctx.setLineDash([]);

          var rLabelX = boundarySx + 8;
          if (rLabelX > pRight - 50) rLabelX = boundarySx - 8;
          inkLabel(ctx, 'r = R', rLabelX, pTop + 16, { color: CORAL, align: rLabelX < boundarySx ? 'right' : 'left', width: width, height: height, font: 'bold 11px sans-serif' });
        }

        ctx.strokeStyle = MUTED;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        coulombPoints.forEach((pt, i) => {
          if (i === 0) ctx.moveTo(pt.sx, pt.sy);
          else ctx.lineTo(pt.sx, pt.sy);
        });
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.strokeStyle = TEAL;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        vPoints.forEach((pt, i) => {
          if (i === 0) ctx.moveTo(pt.sx, pt.sy);
          else ctx.lineTo(pt.sx, pt.sy);
        });
        ctx.stroke();

        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ePoints.forEach((pt, i) => {
          if (i === 0) ctx.moveTo(pt.sx, pt.sy);
          else ctx.lineTo(pt.sx, pt.sy);
        });
        ctx.stroke();

        var geoLabel1 = geo === "sphere_solid" ? "solid sphere" : (geo === "sphere_shell" ? "spherical shell" : (geo === "ring" ? "ring" : (geo === "disk" ? "disk" : "line segment")));
        var legend1d = [
          { label: 'Source', value: geoLabel1 },
          { label: 'Cut', value: useAxis ? 'along the axis (not in-plane)' : 'in-plane radial' },
          { label: '$V$', value: 'teal' },
          { label: '$|\\mathbf{E}|$', value: 'gold' },
          { label: 'Scales', value: '$V$ and $|\\mathbf{E}|$ independently scaled' },
          { label: 'Dashed', value: 'Coulomb $kQ/r$ (outside / far-field match)' },
          { label: '$R$', value: R.toFixed(2) },
          { label: '3D tilt', value: 'unused in this view' }
        ];
        appendLegend(useAxis ? 'Axial $V(z)$ and $|\\mathbf{E}(z)|$' : 'Radial $V(r)$ and $|\\mathbf{E}(r)|$', legend1d);

        ctx.restore();
      }

      // Drag Events for 2D Probe or 3D Camera Rotation (with touch support and dynamic sizing)
      if (!state._handlersAttached && ctx.canvas) {
        state._handlersAttached = true;
        const cvs = ctx.canvas;

        let lastX = 0, lastY = 0;
        let isMouseDown = false;

        function getPos(evt) {
          const rect = cvs.getBoundingClientRect();
          const cx = evt.touches && evt.touches.length > 0 ? evt.touches[0].clientX : evt.clientX;
          const cy = evt.touches && evt.touches.length > 0 ? evt.touches[0].clientY : evt.clientY;
          return {
            x: (cx - rect.left) * (cvs.width / rect.width),
            y: (cy - rect.top) * (cvs.height / rect.height)
          };
        }

        function onStart(e) {
          isMouseDown = true;
          const p = getPos(e);
          lastX = p.x;
          lastY = p.y;
          if (state.viewMode === "2d_contour" && state.probe) {
            const currentScale = Math.min(cvs.width, cvs.height) / 2.3;
            state.probe.x = clamp((p.x - cvs.width / 2) / currentScale, -0.95, 0.95);
            state.probe.y = clamp((p.y - cvs.height / 2) / currentScale, -0.95, 0.95);
          }
          if (e.cancelable) e.preventDefault();
        }

        function onMove(e) {
          if (!isMouseDown) return;
          if (e.cancelable) e.preventDefault();
          const p = getPos(e);
          const dx = p.x - lastX;
          const dy = p.y - lastY;
          lastX = p.x;
          lastY = p.y;

          if (state.viewMode === "3d_surface") {
            state.rotZ = (state.rotZ + dx * 0.6) % 360;
            state.rotX = clamp(state.rotX - dy * 0.4, 15, 85);
          } else if (state.viewMode === "2d_contour" && state.probe) {
            const currentScale = Math.min(cvs.width, cvs.height) / 2.3;
            state.probe.x = clamp((p.x - cvs.width / 2) / currentScale, -0.95, 0.95);
            state.probe.y = clamp((p.y - cvs.height / 2) / currentScale, -0.95, 0.95);
          }
        }

        function onEnd() {
          isMouseDown = false;
        }

        if (cvs.addEventListener) {
          cvs.addEventListener("mousedown", onStart);
          cvs.addEventListener("mousemove", onMove);
          cvs.addEventListener("touchstart", onStart, { passive: false });
          cvs.addEventListener("touchmove", onMove, { passive: false });
        }

        if (typeof window !== "undefined" && window.addEventListener) {
          window.addEventListener("mouseup", onEnd);
          window.addEventListener("touchend", onEnd);
          window.addEventListener("touchcancel", onEnd);
        }
      }
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
  /* cpgf-2.33: Magnetic Boundary Condition $B_{\mathrm{out}}^\perp - B_{\mathrm{in}}^\perp = 0$ */
  /* -------------------------------------------------------------------------- */
  PGRE.visualizers['cpgf-2.33'] = {
    id: 'cpgf-2.33',
    topic: 'em',
    title: 'Magnetic Boundary Condition: Normal Component $B_{\\mathrm{out}}^\\perp - B_{\\mathrm{in}}^\\perp = 0$',
    formulaLatex: 'B_{\\mathrm{out}}^\\perp - B_{\\mathrm{in}}^\\perp = 0 \\iff \\oint_{\\mathcal{S}} \\mathbf{B} \\cdot d\\mathbf{a} = 0',
    physicalStory: `Maxwell's second equation, Gauss's law for magnetism $\\nabla \\cdot \\mathbf{B} = 0$, embodies the fundamental experimental observation that isolated magnetic monopoles do not exist in classical electrodynamics. Every magnetic field line forms an unbroken, continuous loop without beginning or ending on magnetic charge.

When applied to a thin Gaussian pillbox (a cylinder of infinitesimal thickness $h \\to 0$ and cross-sectional cap area $\\Delta A$) straddling the interface between two media, the net outward magnetic flux must vanish identically:
$$\\oint_{\\mathcal{S}} \\mathbf{B} \\cdot d\\mathbf{a} = \\left(\\mathbf{B}_{\\mathrm{out}} \\cdot \\hat{\\mathbf{n}} - \\mathbf{B}_{\\mathrm{in}} \\cdot \\hat{\\mathbf{n}}\\right)\\Delta A + \\Phi_{\\mathrm{rim}} = 0$$

As the pillbox height shrinks to zero ($h \\to 0$), the lateral rim area vanishes ($2\\pi r h \\to 0$), ensuring that $\\Phi_{\\mathrm{rim}} \\to 0$ even in the presence of localized surface currents. Evaluating the cap integrals yields the universal magnetostatic boundary condition:
$$B_{\\mathrm{out}}^\\perp = B_{\\mathrm{in}}^\\perp \\quad \\iff \\quad B_{\\mathrm{out}}^\\perp - B_{\\mathrm{in}}^\\perp = 0$$

Crucially, the perpendicular component $B^\\perp$ is strictly continuous across all physical boundaries, regardless of changes in magnetic permeability $\\mu$ or the presence of a dense surface current sheet $\\mathbf{K}$. While a surface current creates a sharp jump in the tangential component $\\mathbf{B}_{\\mathrm{out}}^\\parallel - \\mathbf{B}_{\\mathrm{in}}^\\parallel = \\mu_0 (\\mathbf{K} \\times \\hat{\\mathbf{n}})$, the normal component $B^\\perp$ never experiences a discontinuity.`,

    derivationSteps: [
      {
        step: 1,
        title: "Differential Gauss's Law for Magnetism",
        latex: "\\nabla \\cdot \\mathbf{B} = 0",
        description: "Because magnetic monopoles have never been observed, magnetic field lines are divergence-free everywhere in space."
      },
      {
        step: 2,
        title: "Divergence Theorem over a Gaussian Pillbox",
        latex: "\\int_{\\mathcal{V}} (\\nabla \\cdot \\mathbf{B})\\, d^3\\mathbf{r} = \\oint_{\\mathcal{S}} \\mathbf{B} \\cdot d\\mathbf{a} = 0",
        description: "Construct a Gaussian pillbox of cross-sectional area $\\Delta A$ and height $h$ straddling the interface between Medium 1 (in) and Medium 2 (out)."
      },
      {
        step: 3,
        title: "Flux Decomposition Across Caps and Rim",
        latex: "\\oint_{\\mathcal{S}} \\mathbf{B} \\cdot d\\mathbf{a} = \\int_{\\mathrm{top}} \\mathbf{B} \\cdot \\hat{\\mathbf{n}}\\, da - \\int_{\\mathrm{bottom}} \\mathbf{B} \\cdot \\hat{\\mathbf{n}}\\, da + \\int_{\\mathrm{rim}} \\mathbf{B} \\cdot d\\mathbf{a} = 0",
        description: "The outward unit normal on the top cap is $+\\hat{\\mathbf{n}}$, while on the bottom cap it is $-\\hat{\\mathbf{n}}$, pointing into Medium 1."
      },
      {
        step: 4,
        title: "Vanishing Rim Limit as Height $h \\to 0$",
        latex: "\\lim_{h \\to 0} \\left|\\int_{\\mathrm{rim}} \\mathbf{B} \\cdot d\\mathbf{a}\\right| \\le |\\mathbf{B}|_{\\max} (2\\pi r h) = 0",
        description: "Shrinking the pillbox height to zero while keeping the cap area $\\Delta A$ fixed forces the lateral mantle flux to vanish identically."
      },
      {
        step: 5,
        title: "Universal Normal Continuity Across the Boundary",
        latex: "(B_{\\mathrm{out}}^\\perp - B_{\\mathrm{in}}^\\perp)\\,\\Delta A = 0 \\implies B_{\\mathrm{out}}^\\perp - B_{\\mathrm{in}}^\\perp = 0",
        description: "Dividing by cap area $\\Delta A$ demonstrates that the perpendicular component of $\\mathbf{B}$ is universally continuous across any interface."
      }
    ],

    limitingCases: [
      {
        name: "Non-Magnetic Boundary",
        condition: "\\mu_1 = \\mu_2, \\; \\mathbf{K} = \\mathbf{0}",
        formula: "\\mathbf{B}_{\\mathrm{out}} = \\mathbf{B}_{\\mathrm{in}}",
        description: "Both normal and tangential components match identically across the boundary; field lines pass straight through without deflection."
      },
      {
        name: "Normal Incidence",
        condition: "\\mathbf{B} \\parallel \\hat{\\mathbf{n}} \\; (B^\\parallel = 0)",
        formula: "B_{\\mathrm{out}} = B_{\\mathrm{in}} = B^\\perp",
        description: "When field lines strike the interface perpendicularly, the entire field is normal. Because $B^\\perp$ is continuous, the field is identical on both sides regardless of $\\mu$."
      },
      {
        name: "Grazing Incidence",
        condition: "\\mathbf{B} \\perp \\hat{\\mathbf{n}} \\; (B^\\perp = 0)",
        formula: "B_{\\mathrm{out}}^\\perp = B_{\\mathrm{in}}^\\perp = 0",
        description: "When field lines run strictly parallel to the boundary, the normal component vanishes on both sides. Field magnitude is governed by $H_1^\\parallel = H_2^\\parallel$."
      },
      {
        name: "High-Permeability Ferromagnetic Interface",
        condition: "\\mu_2 / \\mu_1 \\to \\infty \\; (\\text{e.g. soft iron})",
        formula: "\\frac{\\tan\\theta_2}{\\tan\\theta_1} = \\frac{\\mu_2}{\\mu_1} \\to \\infty \\implies \\theta_2 \\to 90^\\circ",
        description: "Field lines inside ferromagnetic material are refracted to run almost parallel to the boundary (magnetic shielding). Exiting into air, lines emerge nearly normal ($\\theta \\approx 0$)."
      },
      {
        name: "Superconducting Boundary (Meissner Effect)",
        condition: "\\mathbf{B}_{\\mathrm{in}} = \\mathbf{0} \\; (\\text{Type-I superconductor})",
        formula: "B_{\\mathrm{out}}^\\perp = 0 \\implies \\mathbf{B}_{\\mathrm{out}} \\parallel \\text{surface}",
        description: "Because magnetic fields are expelled from the bulk ($\\mathbf{B}_{\\mathrm{in}} = \\mathbf{0}$), normal continuity forces $B_{\\mathrm{out}}^\\perp = 0$. Outside a superconductor, $\\mathbf{B}$ is purely tangential."
      }
    ],

    greTraps: [
      {
        trap: "Confusing Normal with Tangential Discontinuity from Surface Current $\\mathbf{K}$",
        warning: "A surface current sheet $\\mathbf{K}$ produces a discontinuity ONLY in the tangential component $\\mathbf{B}_{\\mathrm{out}}^\\parallel - \\mathbf{B}_{\\mathrm{in}}^\\parallel = \\mu_0 (\\mathbf{K} \\times \\hat{\\mathbf{n}})$. The normal component $B^\\perp$ is universally continuous ($B_{\\mathrm{out}}^\\perp = B_{\\mathrm{in}}^\\perp$), regardless of $\\mathbf{K}$."
      },
      {
        trap: "Swapping Electrostatic and Magnetostatic Boundary Jump Rules",
        warning: "Remember the reciprocal mnemonic: in electrostatics, $E^\\parallel$ is continuous while $E^\\perp$ jumps by $\\sigma/\\epsilon_0$. In magnetostatics, $B^\\perp$ is continuous while $B^\\parallel$ jumps by $\\mu_0 K$. Normal $B$ mirrors parallel $E$."
      },
      {
        trap: "Assuming $H^\\perp$ is Continuous Across Media of Different Permeability",
        warning: "While $B^\\perp$ is universally continuous, the auxiliary magnetic field $H^\\perp = B^\\perp / \\mu$ is NOT continuous across a material interface with $\\mu_1 \\neq \\mu_2$. In fact, $H_2^\\perp / H_1^\\perp = \\mu_1 / \\mu_2$. Conversely, $H^\\parallel$ is continuous when $K_f = 0$."
      },
      {
        trap: "Magnetic Shielding and Field Line Direction at Iron Boundaries",
        warning: "Because $\\mu_{\\mathrm{iron}} \\sim 10^3 \\mu_0$, field lines entering or exiting ferromagnetic material into air bend sharply to emerge almost perpendicular to the iron surface, exactly analogous to electric field lines on a conductor."
      }
    ],

    parameters: [
      { id: "viewMode", label: "Visualizer Mode", type: "select", default: "pillbox", options: [
        { value: "pillbox", label: "Gaussian pillbox flux balance" },
        { value: "refraction", label: "Field line refraction ($\\mu_1$ vs $\\mu_2$)" },
        { value: "current_sheet", label: "Surface current sheet ($\\mathbf{K}$)" },
        { value: "comparison", label: "EM comparison ($B^\\perp$ vs $E^\\perp$)" }
      ]},
      { id: "bField", label: "Incident Field ($|\\mathbf{B}_1|$)", type: "range", min: 1.0, max: 5.0, step: 0.5, default: 3.0, unit: "T" },
      { id: "thetaIn", label: "Incident Angle ($\\theta_1$)", type: "range", min: 0, max: 75, step: 5, default: 35, unit: "°" },
      { id: "muRatio", label: "Permeability Ratio ($\\mu_2 / \\mu_1$)", type: "range", min: 0.2, max: 5.0, step: 0.2, default: 2.4, unit: "x" },
      { id: "surfaceK", label: "Surface Current ($K$)", type: "range", min: -3.0, max: 3.0, step: 0.5, default: 0.0, unit: "kA/m" },
      { id: "pillboxHeight", label: "Pillbox Height ($h$)", type: "range", min: 0.05, max: 0.60, step: 0.05, default: 0.30, unit: "h₀" },
      { id: "showComponents", label: "Resolve Vector Components", type: "toggle", default: true },
      { id: "simSpeed", label: "Simulation Speed", min: 0.2, max: 3.0, step: 0.2, default: 1.0, unit: "x" }
    ],

    init: function(container, state, redraw) {
      state.viewMode = state.viewMode || "pillbox";
      state.bField = state.bField != null ? Number(state.bField) : 3.0;
      state.thetaIn = state.thetaIn != null ? Number(state.thetaIn) : 35;
      state.muRatio = state.muRatio != null ? Number(state.muRatio) : 2.4;
      state.surfaceK = state.surfaceK != null ? Number(state.surfaceK) : 0.0;
      state.pillboxHeight = state.pillboxHeight != null ? Number(state.pillboxHeight) : 0.30;
      state.showComponents = state.showComponents !== undefined ? !!state.showComponents : true;
      state.simSpeed = state.simSpeed != null ? Number(state.simSpeed) : 1.0;
      state.animTime = 0;
    },

    draw: function(ctx, width, height, state, dt) {
      state = state || {};
      state.viewMode = state.viewMode || "pillbox";
      var bField = state.bField != null ? Number(state.bField) : 3.0;
      var thetaInDeg = state.thetaIn != null ? Number(state.thetaIn) : 35;
      var muRatio = state.muRatio != null ? Number(state.muRatio) : 2.4;
      var surfaceK = state.surfaceK != null ? Number(state.surfaceK) : 0.0;
      var pbHeightParam = state.pillboxHeight != null ? Number(state.pillboxHeight) : 0.30;
      var showComponents = state.showComponents !== undefined ? !!state.showComponents : true;
      var speed = Number(state.simSpeed);
      if (!isFinite(speed) || speed < 0.2) speed = 1.0;
      if (speed > 3.0) speed = 3.0;

      state.animTime = (state.animTime || 0) + (dt || 0.016) * speed;
      var t = state.animTime;

      fillCream(ctx, width, height);

      var thetaInRad = (thetaInDeg * Math.PI) / 180;
      var B1_perp = bField * Math.cos(thetaInRad);
      var B1_par = bField * Math.sin(thetaInRad);
      var B2_perp = B1_perp; // universally continuous!
      var B2_par = B1_par * muRatio + surfaceK * 0.4;
      var B2_mag = Math.hypot(B2_perp, B2_par);
      var thetaOutRad = Math.atan2(Math.abs(B2_par), Math.max(1e-4, B2_perp));
      var thetaOutDeg = (thetaOutRad * 180) / Math.PI;
      var rimFlux = (bField * 0.5 * pbHeightParam * Math.sin(thetaInRad));

      // Off-canvas telemetry strip
      appendLegend('Normal boundary matching ($B^\\perp$)', [
        { label: '$B_{\\mathrm{in}}^\\perp$', value: '$' + B1_perp.toFixed(2) + '\\;\\mathrm{T}$' },
        { label: '$B_{\\mathrm{out}}^\\perp$', value: '$' + B2_perp.toFixed(2) + '\\;\\mathrm{T}$' },
        { label: '$\\Delta B^\\perp = B_{\\mathrm{out}}^\\perp - B_{\\mathrm{in}}^\\perp$', value: '$0.00\\;\\mathrm{T}$ (strictly continuous)' }
      ]);

      appendLegend('Tangential boundary matching ($B^\\parallel$)', [
        { label: '$B_{\\mathrm{in}}^\\parallel$', value: '$' + B1_par.toFixed(2) + '\\;\\mathrm{T}$' },
        { label: '$B_{\\mathrm{out}}^\\parallel$', value: '$' + B2_par.toFixed(2) + '\\;\\mathrm{T}$' },
        { label: '$\\Delta B^\\parallel = B_{\\mathrm{out}}^\\parallel - B_{\\mathrm{in}}^\\parallel$', value: '$' + (B2_par - B1_par).toFixed(2) + '\\;\\mathrm{T}$' }
      ]);

      appendLegend('Pillbox flux & refraction angles', [
        { label: '$\\Phi_{\\mathrm{top}} = +B_{\\mathrm{out}}^\\perp \\Delta A$', value: '$+' + (B2_perp * 1.0).toFixed(2) + '\\;\\mathrm{Wb}$' },
        { label: '$\\Phi_{\\mathrm{bottom}} = -B_{\\mathrm{in}}^\\perp \\Delta A$', value: '$-' + (B1_perp * 1.0).toFixed(2) + '\\;\\mathrm{Wb}$' },
        { label: '$\\Phi_{\\mathrm{rim}} \\propto 2\\pi r h$', value: '$' + rimFlux.toFixed(2) + '\\;\\mathrm{Wb} \\to 0$' },
        { label: '$\\Phi_{\\mathrm{net}} = \\oint \\mathbf{B} \\cdot d\\mathbf{a}$', value: '$0.00\\;\\mathrm{Wb}$' },
        { label: '$\\theta_1$ (incident)', value: '$' + thetaInDeg.toFixed(1) + '^\\circ$' },
        { label: '$\\theta_2$ (refracted)', value: '$' + thetaOutDeg.toFixed(1) + '^\\circ$' }
      ]);

      var mode = state.viewMode;

      if (mode === 'pillbox') {
        drawPillboxMode(ctx, width, height, B1_perp, B1_par, B2_perp, B2_par, bField, pbHeightParam, showComponents, t);
      } else if (mode === 'refraction') {
        drawRefractionMode(ctx, width, height, thetaInRad, thetaOutRad, muRatio, B1_perp, B1_par, B2_par, showComponents, t);
      } else if (mode === 'current_sheet') {
        drawCurrentSheetMode(ctx, width, height, B1_perp, B1_par, B2_perp, B2_par, surfaceK, showComponents, t);
      } else if (mode === 'comparison') {
        drawComparisonMode(ctx, width, height, B1_perp, t);
      }

      function drawPillboxMode(ctx, w, h, bInPerp, bInPar, bOutPerp, bOutPar, bMag, pbHFrac, withComp, time) {
        var ifaceY = Math.round(h * 0.50);
        var cx = Math.round(w * 0.38);
        var rx = Math.max(90, Math.min(175, Math.round(w * 0.17)));
        var ry = Math.max(16, Math.min(30, Math.round(rx * 0.18)));
        var hHalf = Math.max(14, Math.min(55, Math.round(pbHFrac * h * 0.20)));
        // Medium backgrounds
        ctx.fillStyle = PANEL;
        ctx.fillRect(0, ifaceY, w, h - ifaceY);

        // Interface divider line
        ctx.strokeStyle = LINE;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, ifaceY);
        ctx.lineTo(w, ifaceY);
        ctx.stroke();

        // Medium labels
        inkLabel(ctx, "Medium 2: Out (z > 0, μ₂)", 24, ifaceY - 26, { color: MUTED, width: w, height: h });
        inkLabel(ctx, "Medium 1: In (z < 0, μ₁)", 24, ifaceY + 26, { color: MUTED, width: w, height: h });

        // Pillbox caps
        var yTop = ifaceY - hHalf;
        var yBot = ifaceY + hHalf;

        // Lower cylinder body (dashed back/side)
        ctx.save();
        ctx.fillStyle = 'rgba(204, 120, 92, 0.08)';
        ctx.beginPath();
        ctx.ellipse(cx, yBot, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = MUTED;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.restore();

        // Lateral sides of pillbox
        ctx.save();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(cx - rx, yTop);
        ctx.lineTo(cx - rx, yBot);
        ctx.moveTo(cx + rx, yTop);
        ctx.lineTo(cx + rx, yBot);
        ctx.stroke();
        ctx.restore();

        // Top cylinder cap
        ctx.save();
        ctx.fillStyle = 'rgba(93, 184, 166, 0.18)';
        ctx.beginPath();
        ctx.ellipse(cx, yTop, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.restore();

        // Normal unit vector n-hat at boundary
        drawSiteArrow(ctx, cx - rx - 35, ifaceY, cx - rx - 35, ifaceY - 42, INK, 2.2);
        inkLabel(ctx, "n̂", cx - rx - 35, ifaceY - 50, { align: 'center', color: INK, width: w, height: h });
        // Area normal vectors on caps
        var daX = cx + Math.round(rx * 0.52);
        drawSiteArrow(ctx, daX, yTop, daX, yTop - 30, INK, 1.8);
        inkLabel(ctx, "+da_top = +n̂ da", daX + 6, yTop - 24, { align: 'left', font: '11px sans-serif', color: MUTED, width: w, height: h });

        drawSiteArrow(ctx, daX, yBot, daX, yBot + 30, INK, 1.8);
        inkLabel(ctx, "+da_bot = −n̂ da", daX + 6, yBot + 24, { align: 'left', font: '11px sans-serif', color: MUTED, width: w, height: h });

        // Animated continuous flux lines traversing through pillbox
        ctx.save();
        var lineXOffsets = [-0.6, -0.25, 0.1, 0.45];
        ctx.strokeStyle = 'rgba(212, 160, 23, 0.35)';
        ctx.lineWidth = 1.4;
        for (var i = 0; i < lineXOffsets.length; i++) {
          var lx = cx + lineXOffsets[i] * rx;
          ctx.beginPath();
          ctx.moveTo(lx - 20, yBot + 40);
          ctx.lineTo(lx, yBot);
          ctx.lineTo(lx, yTop);
          ctx.lineTo(lx + 25, yTop - 40);
          ctx.stroke();

          // Animated tracer dot
          var frac = ((time * 0.75 + i * 0.25) % 1.0);
          var dotY = (yBot + 40) - frac * ((yBot + 40) - (yTop - 40));
          var dotX = lx;
          if (dotY > yBot) dotX = (lx - 20) + (lx - (lx - 20)) * ((yBot + 40 - dotY) / 40);
          else if (dotY < yTop) dotX = lx + 25 * ((yTop - dotY) / 40);
          ctx.fillStyle = GOLD;
          ctx.beginPath();
          ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        // Field vectors
        var vScale = Math.max(18, Math.min(32, Math.round(h * 0.048)));
        var vPerpLen = Math.max(18, bInPerp * vScale);
        var vInParLen = bInPar * vScale;
        var vOutParLen = bOutPar * vScale;

        var inAnchorX = cx - 28;
        var inAnchorY = yBot;
        var inStartX = inAnchorX - vInParLen;
        var inStartY = inAnchorY + vPerpLen;

        var outAnchorX = cx - 28;
        var outAnchorY = yTop;
        var outEndX = outAnchorX + vOutParLen;
        var outEndY = outAnchorY - vPerpLen;

        // Incoming vector B_in
        drawSiteArrow(ctx, inStartX, inStartY, inAnchorX, inAnchorY, GOLD, 2.8);
        inkLabel(ctx, "B_in", (inStartX + inAnchorX) / 2 - 14, (inStartY + inAnchorY) / 2, { align: 'right', font: 'bold 12px sans-serif', color: GOLD, width: w, height: h });

        // Outgoing vector B_out
        drawSiteArrow(ctx, outAnchorX, outAnchorY, outEndX, outEndY, GOLD, 2.8);
        inkLabel(ctx, "B_out", (outAnchorX + outEndX) / 2 + 14, (outAnchorY + outEndY) / 2, { align: 'left', font: 'bold 12px sans-serif', color: GOLD, width: w, height: h });

        if (withComp) {
          // Components of B_in
          // Normal component (coral)
          drawSiteArrow(ctx, inAnchorX - 16, inAnchorY + vPerpLen, inAnchorX - 16, inAnchorY, CORAL, 2.2);
          inkLabel(ctx, "B_in^⊥", inAnchorX - 22, inAnchorY + vPerpLen * 0.5, { align: 'right', color: CORAL, width: w, height: h });

          // Tangential component (teal)
          drawSiteArrow(ctx, inStartX, inAnchorY + vPerpLen, inAnchorX - 16, inAnchorY + vPerpLen, TEAL, 2.0);
          inkLabel(ctx, "B_in^∥", (inStartX + inAnchorX) * 0.5 - 10, inAnchorY + vPerpLen + 14, { align: 'center', color: TEAL, width: w, height: h });

          // Components of B_out
          // Normal component (coral)
          drawSiteArrow(ctx, outAnchorX - 16, outAnchorY, outAnchorX - 16, outAnchorY - vPerpLen, CORAL, 2.2);
          inkLabel(ctx, "B_out^⊥", outAnchorX - 22, outAnchorY - vPerpLen * 0.5, { align: 'right', color: CORAL, width: w, height: h });

          // Tangential component (teal)
          drawSiteArrow(ctx, outAnchorX - 16, outAnchorY - vPerpLen, outEndX, outAnchorY - vPerpLen, TEAL, 2.0);
          inkLabel(ctx, "B_out^∥", (outAnchorX + outEndX) * 0.5, outAnchorY - vPerpLen - 12, { align: 'center', color: TEAL, width: w, height: h });
        }
        // Equality indicator bracket / banner on right side
        var eqX = cx + rx + Math.max(20, Math.round(w * 0.03));
        ctx.save();
        ctx.strokeStyle = CORAL;
        ctx.lineWidth = 1.6;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(inAnchorX - 16, inAnchorY);
        ctx.lineTo(eqX, inAnchorY);
        ctx.moveTo(outAnchorX - 16, outAnchorY - vPerpLen);
        ctx.lineTo(eqX, outAnchorY - vPerpLen);
        ctx.stroke();
        ctx.restore();

        // Vertical bracket showing identical normal height
        ctx.save();
        ctx.strokeStyle = CORAL;
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(eqX + 4, outAnchorY - vPerpLen);
        ctx.lineTo(eqX + 12, outAnchorY - vPerpLen);
        ctx.lineTo(eqX + 12, inAnchorY);
        ctx.lineTo(eqX + 4, inAnchorY);
        ctx.stroke();
        ctx.restore();

        inkLabel(ctx, "B_out^⊥ − B_in^⊥ = 0", eqX + 18, (outAnchorY - vPerpLen + inAnchorY) * 0.5 - 10, { align: 'left', font: 'bold 13px sans-serif', color: CORAL, width: w, height: h });
        inkLabel(ctx, "Strictly continuous across boundary", eqX + 18, (outAnchorY - vPerpLen + inAnchorY) * 0.5 + 10, { align: 'left', font: '11px sans-serif', color: MUTED, width: w, height: h });
        // Pillbox height label showing h -> 0
        ctx.save();
        ctx.strokeStyle = MUTED;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx - rx - 10, yTop);
        ctx.lineTo(cx - rx - 16, yTop);
        ctx.lineTo(cx - rx - 16, yBot);
        ctx.lineTo(cx - rx - 10, yBot);
        ctx.stroke();
        ctx.restore();
        inkLabel(ctx, "h → 0", cx - rx - 24, ifaceY, { align: 'right', font: '11px sans-serif', color: MUTED, width: w, height: h });
      }

      function drawRefractionMode(ctx, w, h, thInRad, thOutRad, muR, bPerp, bInPar, bOutPar, withComp, time) {
        var ifaceY = Math.round(h * 0.52);

        // Medium backgrounds
        ctx.fillStyle = PANEL;
        ctx.fillRect(0, ifaceY, w, h - ifaceY);

        // Interface divider
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, ifaceY);
        ctx.lineTo(w, ifaceY);
        ctx.stroke();

        inkLabel(ctx, "Medium 2: μ₂ = " + muR.toFixed(1) + " μ₁", 20, ifaceY - 26, { color: MUTED, width: w, height: h });
        inkLabel(ctx, "Medium 1: μ₁", 20, ifaceY + 26, { color: MUTED, width: w, height: h });

        // Refraction law formula banner
        inkLabel(ctx, "tan θ₁ / tan θ₂ = μ₁ / μ₂   (B^⊥ continuous)", w - 20, 24, { align: 'right', font: 'bold 12px sans-serif', color: CORAL, width: w, height: h });

        // 6 parallel refracted lines across the interface
        var numLines = 6;
        var spacing = Math.round(w / (numLines + 1));
        var armLenIn = Math.round(Math.min(h * 0.40, 220));
        var armLenOut = Math.round(Math.min(h * 0.40, 220));
        for (var i = 1; i <= numLines; i++) {
          var ix = i * spacing;
          var xIn = ix - armLenIn * Math.sin(thInRad);
          var yIn = ifaceY + armLenIn * Math.cos(thInRad);
          var xOut = ix + armLenOut * Math.sin(thOutRad);
          var yOut = ifaceY - armLenOut * Math.cos(thOutRad);

          // Incident ray
          ctx.strokeStyle = 'rgba(212, 160, 23, 0.45)';
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.moveTo(xIn, yIn);
          ctx.lineTo(ix, ifaceY);
          ctx.lineTo(xOut, yOut);
          ctx.stroke();

          // Animated bead
          var segProgress = (time * 0.6 + i * 0.18) % 1.0;
          var bx, by;
          if (segProgress < 0.5) {
            var u = segProgress / 0.5;
            bx = xIn + (ix - xIn) * u;
            by = yIn + (ifaceY - yIn) * u;
          } else {
            var u = (segProgress - 0.5) / 0.5;
            bx = ix + (xOut - ix) * u;
            by = ifaceY + (yOut - ifaceY) * u;
          }
          ctx.fillStyle = GOLD;
          ctx.beginPath();
          ctx.arc(bx, by, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Center line highlight & normal angle arcs
        var midIdx = Math.round(numLines / 2);
        var midX = midIdx * spacing;

        // Normal axis (dashed)
        ctx.save();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.4;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(midX, ifaceY - 85);
        ctx.lineTo(midX, ifaceY + 85);
        ctx.stroke();
        ctx.restore();

        // Normal unit vector n-hat
        drawSiteArrow(ctx, midX, ifaceY, midX, ifaceY - 45, INK, 2.0);
        inkLabel(ctx, "n̂", midX + 8, ifaceY - 46, { align: 'left', color: INK, width: w, height: h });

        // Angle arc theta_1
        ctx.save();
        ctx.strokeStyle = MUTED;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(midX, ifaceY, 36, Math.PI / 2, Math.PI / 2 + thInRad);
        ctx.stroke();
        ctx.restore();
        inkLabel(ctx, "θ₁ = " + ((thInRad * 180) / Math.PI).toFixed(0) + "°", midX - 28, ifaceY + 44, { align: 'right', font: '11px sans-serif', color: MUTED, width: w, height: h });

        // Angle arc theta_2
        ctx.save();
        ctx.strokeStyle = MUTED;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(midX, ifaceY, 36, -Math.PI / 2, -Math.PI / 2 + thOutRad);
        ctx.stroke();
        ctx.restore();
        inkLabel(ctx, "θ₂ = " + ((thOutRad * 180) / Math.PI).toFixed(0) + "°", midX + 28, ifaceY - 44, { align: 'left', font: '11px sans-serif', color: MUTED, width: w, height: h });

        if (withComp) {
          // Vector triangle offset slightly to the right so it never collides with angle arc
          var compScale = Math.max(16, Math.min(28, Math.round(h * 0.042)));
          var pyLen = bPerp * compScale;
          var pxInLen = bInPar * compScale;
          var pxOutLen = bOutPar * compScale;
          var vRefX = midX + Math.max(50, Math.round(w * 0.08));

          // Lower vector components
          drawSiteArrow(ctx, vRefX, ifaceY + pyLen, vRefX, ifaceY, CORAL, 2.4);
          inkLabel(ctx, "B_in^⊥", vRefX - 8, ifaceY + pyLen * 0.5, { align: 'right', color: CORAL, width: w, height: h });

          drawSiteArrow(ctx, vRefX - pxInLen, ifaceY + pyLen, vRefX, ifaceY + pyLen, TEAL, 2.0);
          inkLabel(ctx, "B_in^∥", vRefX - pxInLen * 0.5, ifaceY + pyLen + 14, { align: 'center', color: TEAL, width: w, height: h });

          // Upper vector components
          drawSiteArrow(ctx, vRefX, ifaceY, vRefX, ifaceY - pyLen, CORAL, 2.4);
          inkLabel(ctx, "B_out^⊥", vRefX - 8, ifaceY - pyLen * 0.5, { align: 'right', color: CORAL, width: w, height: h });

          drawSiteArrow(ctx, vRefX, ifaceY - pyLen, vRefX + pxOutLen, ifaceY - pyLen, TEAL, 2.0);
          inkLabel(ctx, "B_out^∥", vRefX + pxOutLen * 0.5, ifaceY - pyLen - 12, { align: 'center', color: TEAL, width: w, height: h });
        }
      }

      function drawCurrentSheetMode(ctx, w, h, bInPerp, bInPar, bOutPerp, bOutPar, surfK, withComp, time) {
        var ifaceY = Math.round(h * 0.52);
        var cx = Math.round(w * 0.46);

        // Backgrounds
        ctx.fillStyle = PANEL;
        ctx.fillRect(0, ifaceY, w, h - ifaceY);

        // Boundary line
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(0, ifaceY);
        ctx.lineTo(w, ifaceY);
        ctx.stroke();

        // Surface current indicators along the boundary line
        var numMarkers = 9;
        var startM = 40;
        var endM = w - 40;
        var stepM = (endM - startM) / (numMarkers - 1);

        for (var m = 0; m < numMarkers; m++) {
          var mx = startM + m * stepM;
          ctx.save();
          ctx.fillStyle = CREAM;
          ctx.strokeStyle = GOLD;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(mx, ifaceY, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = GOLD;
          if (surfK >= 0) {
            // Out of page (dot)
            ctx.beginPath();
            ctx.arc(mx, ifaceY, 2.8, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Into page (cross)
            ctx.strokeStyle = GOLD;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(mx - 4, ifaceY - 4);
            ctx.lineTo(mx + 4, ifaceY + 4);
            ctx.moveTo(mx + 4, ifaceY - 4);
            ctx.lineTo(mx - 4, ifaceY + 4);
            ctx.stroke();
          }
          ctx.restore();
        }

        inkLabel(ctx, "Surface current density K = " + surfK.toFixed(1) + " kA/m " + (surfK >= 0 ? "(⊙ out)" : "(⊗ in)"), 24, ifaceY - 26, { color: GOLD, width: w, height: h });
        inkLabel(ctx, "B_out^∥ − B_in^∥ = μ₀ (K × n̂)", w - 24, ifaceY - 26, { align: 'right', color: TEAL, width: w, height: h });

        // Key teaching callout: normal component has ZERO jump from K
        inkLabel(ctx, "B_out^⊥ − B_in^⊥ = 0   (No discontinuity from K!)", w * 0.5, 30, { align: 'center', font: 'bold 13px sans-serif', color: CORAL, width: w, height: h });

        // Vectors at center
        var scale = Math.max(22, Math.min(42, Math.round(h * 0.058)));
        var py = bInPerp * scale;
        var pxIn = bInPar * scale;
        var pxOut = bOutPar * scale;

        // B_in vector
        drawSiteArrow(ctx, cx - pxIn, ifaceY + py, cx, ifaceY, GOLD, 2.8);
        inkLabel(ctx, "B_in", cx - pxIn * 0.5 - 16, ifaceY + py * 0.5, { align: 'right', font: 'bold 12px sans-serif', color: GOLD, width: w, height: h });

        // B_out vector
        drawSiteArrow(ctx, cx, ifaceY, cx + pxOut, ifaceY - py, GOLD, 2.8);
        inkLabel(ctx, "B_out", cx + pxOut * 0.5 + 16, ifaceY - py * 0.5, { align: 'left', font: 'bold 12px sans-serif', color: GOLD, width: w, height: h });

        if (withComp) {
          // Normal components: identical height
          drawSiteArrow(ctx, cx - 22, ifaceY + py, cx - 22, ifaceY, CORAL, 2.4);
          inkLabel(ctx, "B_in^⊥", cx - 30, ifaceY + py * 0.5, { align: 'right', color: CORAL, width: w, height: h });

          drawSiteArrow(ctx, cx - 22, ifaceY, cx - 22, ifaceY - py, CORAL, 2.4);
          inkLabel(ctx, "B_out^⊥", cx - 30, ifaceY - py * 0.5, { align: 'right', color: CORAL, width: w, height: h });

          // Tangential jump
          drawSiteArrow(ctx, cx - pxIn, ifaceY + py, cx - 22, ifaceY + py, TEAL, 2.0);
          inkLabel(ctx, "B_in^∥", (cx - pxIn + cx - 22) * 0.5, ifaceY + py + 14, { align: 'center', color: TEAL, width: w, height: h });

          drawSiteArrow(ctx, cx - 22, ifaceY - py, cx + pxOut, ifaceY - py, TEAL, 2.0);
          inkLabel(ctx, "B_out^∥", (cx - 22 + cx + pxOut) * 0.5, ifaceY - py - 14, { align: 'center', color: TEAL, width: w, height: h });
        }
      }

      function drawComparisonMode(ctx, w, h, bPerp, time) {
        var midX = Math.round(w * 0.5);
        var ifaceY = Math.round(h * 0.55);

        // Vertical divider
        ctx.strokeStyle = LINE;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(midX, 20);
        ctx.lineTo(midX, h - 20);
        ctx.stroke();

        var leftW = midX;
        var rightW = w - midX;
        var rightCx = midX + rightW * 0.5;
        var leftCx = leftW * 0.5;

        // --- Left Panel: Magnetostatics ---
        ctx.fillStyle = PANEL;
        ctx.fillRect(0, ifaceY, leftW - 8, h - ifaceY);

        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(12, ifaceY);
        ctx.lineTo(leftW - 12, ifaceY);
        ctx.stroke();

        inkLabel(ctx, "Magnetostatics: ∇ · B = 0", leftCx, 36, { align: 'center', font: 'bold 13px sans-serif', color: CORAL, width: w, height: h });
        inkLabel(ctx, "B_out^⊥ − B_in^⊥ = 0", leftCx, 62, { align: 'center', font: 'bold 14px sans-serif', color: CORAL, width: w, height: h });
        inkLabel(ctx, "No magnetic monopoles → continuous flux", leftCx, 86, { align: 'center', font: '11px sans-serif', color: MUTED, width: w, height: h });

        // Pillbox on left
        var pbLw = Math.max(75, Math.min(130, Math.round(leftW * 0.28)));
        var pbLh = Math.max(30, Math.min(60, Math.round(h * 0.085)));
        ctx.fillStyle = 'rgba(204, 120, 92, 0.08)';
        ctx.fillRect(leftCx - pbLw * 0.5, ifaceY - pbLh, pbLw, pbLh * 2);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.6;
        ctx.strokeRect(leftCx - pbLw * 0.5, ifaceY - pbLh, pbLw, pbLh * 2);

        // Continuous field lines passing straight through without stopping
        var armLen = Math.max(50, Math.min(95, Math.round(h * 0.14)));
        for (var li = -2; li <= 2; li++) {
          var fx = leftCx + li * (pbLw * 0.20);
          drawSiteArrow(ctx, fx, ifaceY + armLen, fx, ifaceY - armLen, GOLD, 2.2);

          // Animated tracer dot
          var frac = ((time * 0.8 + (li + 2) * 0.2) % 1.0);
          var dotY = (ifaceY + armLen) - frac * (2 * armLen);
          ctx.fillStyle = GOLD;
          ctx.beginPath();
          ctx.arc(fx, dotY, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        inkLabel(ctx, "Flux lines pass through unbroken", leftCx, ifaceY + armLen + 24, { align: 'center', font: '11px sans-serif', color: MUTED, width: w, height: h });

        // --- Right Panel: Electrostatics ---
        ctx.fillStyle = PANEL;
        ctx.fillRect(midX + 8, ifaceY, w - (midX + 8), h - ifaceY);

        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(midX + 12, ifaceY);
        ctx.lineTo(w - 12, ifaceY);
        ctx.stroke();

        inkLabel(ctx, "Electrostatics: ∇ · E = ρ / ε₀", rightCx, 36, { align: 'center', font: 'bold 13px sans-serif', color: TEAL, width: w, height: h });
        inkLabel(ctx, "E_out^⊥ − E_in^⊥ = σ / ε₀", rightCx, 62, { align: 'center', font: 'bold 14px sans-serif', color: TEAL, width: w, height: h });
        inkLabel(ctx, "Surface charge σ causes jump", rightCx, 86, { align: 'center', font: '11px sans-serif', color: MUTED, width: w, height: h });

        // Surface charges (plus signs) along boundary
        ctx.save();
        for (var c = -3; c <= 3; c++) {
          var cxq = rightCx + c * 20;
          ctx.fillStyle = CREAM;
          ctx.strokeStyle = '#c25953';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(cxq, ifaceY, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#c25953';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('+', cxq, ifaceY);
        }
        ctx.restore();

        // Pillbox enclosing surface charge
        ctx.fillStyle = 'rgba(93, 184, 166, 0.08)';
        ctx.fillRect(rightCx - pbLw * 0.5, ifaceY - pbLh, pbLw, pbLh * 2);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.6;
        ctx.strokeRect(rightCx - pbLw * 0.5, ifaceY - pbLh, pbLw, pbLh * 2);

        // Electric field lines originating on surface charges (discontinuous!)
        for (var ei = -2; ei <= 2; ei++) {
          var efx = rightCx + ei * (pbLw * 0.20);
          drawSiteArrow(ctx, efx, ifaceY - 8, efx, ifaceY - armLen, TEAL, 2.0);
          drawSiteArrow(ctx, efx, ifaceY + 8, efx, ifaceY + armLen, TEAL, 2.0);
        }
        inkLabel(ctx, "Field originates on charges: ΔE^⊥ = σ / ε₀", rightCx, ifaceY + armLen + 24, { align: 'center', font: '11px sans-serif', color: MUTED, width: w, height: h });
      }
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


})(typeof window !== 'undefined' ? window : globalThis);
