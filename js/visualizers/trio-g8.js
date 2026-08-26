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

  function fillCream(ctx, width, height) {
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
    ctx.fillStyle = 'rgba(250, 249, 245, 0.94)';
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
        x = pA.x + (pB.x - pA.x) * s;
        y = pA.y + (pB.y - pA.y) * s + Math.sin(s * Math.PI) * 1.0;
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
    title: 'Potential Energy Difference: ΔU = -∫ F · dl',
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
      { condition: 'Uniform Gravity ($\\mathbf{F} = -mg\\hat{\\mathbf{z}}$)', result: '$\\Delta U = mg(z_b - z_a) = mg\\Delta z$', description: 'Gravitational potential energy near Earth.' },
      { condition: 'Linear Hooke Spring ($\\mathbf{F} = -kx\\hat{\\mathbf{x}}$)', result: '$\\Delta U = \\frac{1}{2}k(x_b^2 - x_a^2)$', description: 'Elastic spring potential energy.' },
      { condition: 'Coulomb / Gravitational Inverse-Square', result: '$\\Delta U = -k(1/r_b - 1/r_a)$', description: 'Reference $U(\\infty) = 0$ yields $U(r) = -k/r$.' }
    ],
    greTraps: [
      { trap: 'Sign Confusion Between Internal vs External Work', explanation: '$W_{\\text{field}} = -\\Delta U$, whereas external work against the field is $W_{\\text{ext}} = +\\Delta U$.' },
      { trap: 'Evaluating Along Complex Curved Paths', explanation: 'Never parameterize a difficult curve when $\\nabla \\times \\mathbf{F} = 0$. Integrate along straight coordinate axes instead!' }
    ],
    parameters: [
      { id: 'landscape', label: 'Potential Well', type: 'select', value: 'saddle', default: 'saddle', options: [
        { value: 'harmonic', label: 'Harmonic Bowl: U = ½k(x² + y²)' },
        { value: 'saddle', label: 'Saddle Surface: U = c(x² - y²)' },
        { value: 'doublewell', label: 'Double Well: U = a(x²-1)² + b y²' }
      ]},
      { id: 'pathType', label: 'Integration Path', type: 'select', value: 'manhattan', default: 'manhattan', options: [
        { value: 'direct', label: 'Path 1: Direct Diagonal Line' },
        { value: 'manhattan', label: 'Path 2: Manhattan (GRE Axis-Aligned)' },
        { value: 'curved', label: 'Path 3: Parabolic Arc' }
      ]}
    ],
    init(container, state, redraw) {
      state.landscape = state.landscape || 'saddle';
      state.pathType = state.pathType || 'manhattan';
      state.pA = state.pA || { x: -1.5, y: -1.0 };
      state.pB = state.pB || { x: 1.5, y: 1.0 };
      state.t = state.t || 0;
    },
    draw(ctx, width, height, state, dt) {
      state = state || {};
      dt = dt || 0;
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

      state.t = (state.t || 0) + dt * 0.22;
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
      appendLegend('ΔU = −∫ F · dl', [
        { label: 'Landscape', value: landName },
        { label: 'Path', value: pathName },
        { label: 'U(A)', value: uA.toFixed(2) + ' J' },
        { label: 'U(B)', value: uB.toFixed(2) + ' J' },
        { label: 'ΔU = U(B) − U(A)', value: deltaU.toFixed(2) + ' J' },
        { label: 'W_field = ∫ F · dl', value: W.toFixed(2) + ' J' },
        { label: 'Check', value: 'ΔU ≈ −W on every path' }
      ]);
    },
    challenge: {
      question: "A 2D conservative force field is given by F = (2xy³ + 3) î + (3x²y² - 4y) ĵ. What is the potential energy function U(x, y) assuming reference U(0,0) = 0?",
      options: [
        "A) U(x, y) = -(x² y³ + 3x - 2y²)",
        "B) U(x, y) = x² y³ + 3x - 2y²",
        "C) U(x, y) = -(2x² y³ + 3x - 4y²)",
        "D) U(x, y) = -(x² y³ + 3x + 2y²)",
        "E) Potential energy cannot be defined because the field has non-zero curl."
      ],
      correct: 0,
      explanation: "Using F = -∇U: -∂U/∂x = 2xy³ + 3 ⇒ U(x,y) = -(x²y³ + 3x) + g(y). Differentiating with respect to y gives -∂U/∂y = 3x²y² - g'(y) = 3x²y² - 4y ⇒ g'(y) = 4y ⇒ g(y) = 2y² + C. Setting U(0,0) = 0 yields C = 0, so U(x,y) = -(x²y³ + 3x - 2y²)."
    }
  };

  PGRE.visualizers['cpgf-2.4'] = {
    id: "cpgf-2.4",
    title: "Electric Field from Potential Gradient: E = -∇V",
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
        trap: "Assuming E = 0 implies V = 0 (or V = 0 implies E = 0)",
        explanation: "Midway between two equal +Q charges, E = 0 by symmetry, but V = 2kQ/d ≠ 0. Midway between +Q and -Q, V = 0, but E = 2kQ/(d/2)² x̂ ≠ 0! E measures the spatial slope (derivative) of V, not its absolute value."
      },
      {
        trap: "Forgetting the Negative Sign in Vector Components",
        explanation: "If potential increases along the +x axis (∂V/∂x > 0), the electric field component E_x = -∂V/∂x is NEGATIVE (points in the -x direction, towards lower potential)."
      },
      {
        trap: "Equipotential Contour Spacing vs Field Magnitude",
        explanation: "On PGRE topographic potential maps, where contour lines are packed closest together, the gradient is steepest and |E| is largest. Field lines must NEVER cross each other."
      },
      {
        trap: "Gauge Invariance and Reference Point Freedom",
        explanation: "Adding any arbitrary constant C to V(r) leaves E = -∇(V + C) = -∇V completely unchanged. Only potential differences ΔV produce physical forces."
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
      { id: "chargeMag", label: "Charge Magnitude (q)", type: "range", min: 0.5, max: 3.0, step: 0.1, default: 1.0 },
      { id: "showEquipotentials", label: "Equipotential Contours", type: "toggle", default: true },
      { id: "showVectors", label: "E-Field Vectors (-∇V)", type: "toggle", default: true },
      { id: "showStreamlines", label: "Field Streamlines", type: "toggle", default: true },
      { id: "showHeatmap", label: "Potential Heatmap", type: "toggle", default: true },
      { id: "showProfile", label: "1D Potential/Field Profile", type: "toggle", default: true }
    ],

    init: function(container, state, redraw) {
      state.preset = state.preset || "dipole";
      state.chargeMag = state.chargeMag !== undefined ? state.chargeMag : 1.0;
      state.showEquipotentials = state.showEquipotentials !== undefined ? state.showEquipotentials : true;
      state.showVectors = state.showVectors !== undefined ? state.showVectors : true;
      state.showStreamlines = state.showStreamlines !== undefined ? state.showStreamlines : true;
      state.showHeatmap = state.showHeatmap !== undefined ? state.showHeatmap : true;
      state.showProfile = state.showProfile !== undefined ? state.showProfile : true;
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
      dt = dt || 0.016;
      state = state || {};
      state.time = (state.time || 0) + dt;

      // Ensure state defaults
      state.preset = state.preset || "dipole";
      state.chargeMag = state.chargeMag !== undefined ? state.chargeMag : 1.0;
      state.showEquipotentials = state.showEquipotentials !== undefined ? state.showEquipotentials : true;
      state.showVectors = state.showVectors !== undefined ? state.showVectors : true;
      state.showStreamlines = state.showStreamlines !== undefined ? state.showStreamlines : true;
      state.showHeatmap = state.showHeatmap !== undefined ? state.showHeatmap : true;
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
          p.age += dt * 30;
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
            p.x += (ex / (mag + 0.01)) * vSpeed * dt;
            p.y += (ey / (mag + 0.01)) * vSpeed * dt;
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
          { label: 'V(r)', value: vAtProbe.toFixed(2) + ' V' },
          { label: '|E|', value: mag.toFixed(2) + ' N/C' },
          { label: 'angle', value: (Math.atan2(ey, ex) * 180 / Math.PI).toFixed(1) + ' deg' },
          { label: 'Geometry', value: 'E downhill, perpendicular to the equipotential' }
        ];
        if (state.showProfile) {
          legendRows.push({ label: 'Slice', value: 'V(x) teal, E_x gold at y = ' + tp.y.toFixed(2) });
        }
        appendLegend('E = −∇V at probe', legendRows);
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
        ctx.strokeStyle = "#e6dfd8";
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
      question: "An electrostatic scalar potential in a three-dimensional region of space is given by the function V(x, y, z) = 2x² - 3y² + 4z. What is the electric field vector E at the point (1, -2, 3), and how much work is required by an external agent to move a test charge q = +2 C at constant speed from (0, 0, 0) to (1, -2, 3)?",
      options: [
        "E = -4x̂ - 12ŷ - 4ẑ;  W_ext = +12 J",
        "E = -4x̂ - 12ŷ - 4ẑ;  W_ext = +4 J",
        "E = 4x̂ + 12ŷ + 4ẑ;   W_ext = +24 J",
        "E = -4x̂ - 12ŷ - 4ẑ;  W_ext = -24 J",
        "E = 4x̂ + 12ŷ + 4ẑ;   W_ext = -4 J"
      ],
      correct: 1,
      explanation: "Step 1: Compute the electric field via E = -∇V:\n" +
        "E_x = -∂V/∂x = -4x  ==> At (1, -2, 3), E_x = -4(1) = -4\n" +
        "E_y = -∂V/∂y = -(-6y) = +6y  ==> At (1, -2, 3), E_y = 6(-2) = -12\n" +
        "E_z = -∂V/∂z = -4  ==> At (1, -2, 3), E_z = -4\n" +
        "Thus, E = -4x̂ - 12ŷ - 4ẑ.\n\n" +
        "Step 2: Compute the external work W_ext = q ΔV = q [V(1, -2, 3) - V(0, 0, 0)]:\n" +
        "V(1, -2, 3) = 2(1)² - 3(-2)² + 4(3) = 2 - 12 + 12 = +2 V.\n" +
        "V(0, 0, 0) = 0 V.\n" +
        "Therefore, W_ext = q(V_final - V_initial) = (+2 C) * (2 V - 0 V) = +4 J.\n" +
        "Option 2 correctly gives E = -4x̂ - 12ŷ - 4ẑ and W_ext = +4 J!"
    }
  };

  PGRE.visualizers['cpgf-2.8'] = {
    id: "cpgf-2.8",
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
        trap: "Integrating Vector E vs Scalar V",
        explanation: "Never attempt to integrate Coulomb's vector field E = k ∫ (dq/r²) r̂ directly when computing fields of symmetric bodies unless forced. Always calculate scalar V(r) = k ∫ (dq/r) first, then differentiate E = -∇V."
      },
      {
        trap: "Continuity of V vs Discontinuity of E Across Surface Charge",
        explanation: "The electric potential V(r) is ALWAYS continuous across any surface charge layer sigma. However, the normal electric field component jumps abruptly by ΔE_perp = σ / ε0, corresponding to a sharp kink in V."
      },
      {
        trap: "Electrostatic Self-Energy and Double Counting",
        explanation: "The work required to assemble a continuous charge distribution is W = (1/2) ∫ ρ V d³r. The prefactor of 1/2 is crucial to avoid double-counting pairwise interactions! For a uniform solid sphere, W = (3/5) Q² / (4πε0 R)."
      },
      {
        trap: "Origin Dependence of Dipole Moment",
        explanation: "The electric dipole moment p = ∫ r' ρ(r') d³r' is origin-independent IF AND ONLY IF the net total charge Q_tot = 0. If Q_tot ≠ 0, shifting origin by a changes dipole moment: p' = p - Q_tot a."
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
      { id: "radius", label: "Dimension (R / L)", type: "range", min: 0.15, max: 0.65, step: 0.02, default: 0.35 },
      { id: "totalCharge", label: "Total Charge (Q)", type: "range", min: 0.2, max: 3.0, step: 0.1, default: 1.0 },
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
      dt = dt || 0.016;
      state = state || {};
      state.time = (state.time || 0) + dt;

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
          appendLegend('Poisson integral for V', [
            { label: 'Source', value: geoLabel },
            { label: 'r', value: r.toFixed(3) + (r < R ? ' (inside)' : ' (outside)') },
            { label: 'V(r)', value: v.toFixed(2) + ' V' },
            { label: '|E|', value: mag.toFixed(2) + ' N/C' },
            { label: 'Coulomb 1/r', value: (28.0 * Q / Math.max(0.01, r)).toFixed(2) + ' V' }
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

        ctx.strokeStyle = "#efe9de";
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
          ctx.strokeStyle = "rgba(20, 20, 19, 0.08)";
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
        appendLegend('3D potential landscape V(x, y)', [
          { label: 'Source', value: geoLabel3 },
          { label: 'Elevation', value: 'z = V(r)' },
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
        ctx.fillText("r", pLeft + pW / 2, pBottom + 28);

        const maxR = 1.2;
        const maxV = (28.0 * Q) / (geo === "sphere_solid" ? R * 0.6 : R);
        const maxE = (28.0 * Q) / (R * R);

        const vPoints = [];
        const ePoints = [];
        const coulombPoints = [];
        const N = 200;

        for (let i = 1; i <= N; i++) {
          const r = (i / N) * maxR;
          const res = calcVandE(r, 0);
          const v = res.v, mag = res.mag;
          const sx = pLeft + (r / maxR) * pW;
          const syV = pBottom - clamp(v / maxV, 0, 1) * (pH - 30);
          const syE = pBottom - clamp(mag / maxE, 0, 1) * (pH - 30);

          vPoints.push({ sx: sx, sy: syV });
          ePoints.push({ sx: sx, sy: syE });

          const vCoulomb = (28.0 * Q) / r;
          coulombPoints.push({ sx: sx, sy: pBottom - clamp(vCoulomb / maxV, 0, 1) * (pH - 30) });
        }

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
        appendLegend('Radial V(r) and |E(r)|', [
          { label: 'Source', value: geoLabel1 },
          { label: 'V(r)', value: 'teal' },
          { label: '|E(r)|', value: 'gold' },
          { label: 'Dashed', value: 'Coulomb 1/r (outside match)' },
          { label: 'r = R', value: R.toFixed(2) }
        ]);

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
      question: "A solid insulating sphere of radius R carries a total positive charge Q distributed uniformly throughout its volume. What is the ratio of the electric potential at the exact center of the sphere V(r = 0) to the electric potential at the surface of the sphere V(r = R), with the reference potential set at infinity V(∞) = 0?",
      options: [
        "V(0) / V(R) = 1.0 (Potential is uniform throughout)",
        "V(0) / V(R) = 1.5 (3/2)",
        "V(0) / V(R) = 2.0 (Twice the surface potential)",
        "V(0) / V(R) = 0.5 (Half the surface potential)",
        "V(0) / V(R) = 4/3"
      ],
      correct: 1,
      explanation: "By integrating the Poisson kernel or using V(0) = -∫_{∞}^0 E(r) dr:\n" +
        "1. Outside (r ≥ R): E(r) = kQ/r², so V(R) = -∫_{∞}^R (kQ/r²) dr = kQ/R.\n" +
        "2. Inside (r < R): Gauss's law gives E(r) = kQ r / R³.\n" +
        "3. Center potential:\n" +
        "   V(0) = V(R) - ∫_R^0 E_in(r) dr = kQ/R + ∫_0^R (kQ r / R³) dr = kQ/R + kQ/(2R) = (3/2) kQ/R = 1.5 V(R).\n" +
        "Thus, the central potential is exactly 1.5 times (3/2) the surface potential!"
    }
  };


})(typeof window !== 'undefined' ? window : globalThis);
