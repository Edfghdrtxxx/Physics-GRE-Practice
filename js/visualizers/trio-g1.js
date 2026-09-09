/* Formula visualizers — G1 Kepler / effective potential / centripetal a */
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
  var VIOLET = '#9d7cd8';
  var LINE = 'rgba(20, 20, 19, 0.12)';

  function syncStageTheme() {
    var t = PGRE.vizStageTheme ? PGRE.vizStageTheme() : null;
    if (!t) return;
    CREAM = t.bg; INK = t.ink; MUTED = t.muted; LINE = t.hudBorder;
  }

  function creamFill(ctx, width, height) {
    syncStageTheme();
    ctx.fillStyle = (CV && CV.colors && CV.colors.bg) || CREAM;
    ctx.fillRect(0, 0, width, height);
  }

  function lightGrid(ctx, width, height, step) {
    step = step || 40;
    ctx.save();
    ctx.strokeStyle = (CV && CV.colors && CV.colors.grid) || PGRE.vizStageTheme().inkFade(0.06);
    ctx.lineWidth = 1;
    ctx.beginPath();
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
    if (n > 0.08) return 0.08;
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

  function pushLegend(title, rows) {
    if (PGRE.appendVizLegend) PGRE.appendVizLegend(title, rows);
    else if (CV && typeof CV.drawHUD === 'function') CV.drawHUD(null, 0, 0, 0, rows, title);
  }

  function panelTitle(ctx, text, x, y, align) {
    ctx.save();
    ctx.font = '600 11px Inter, sans-serif';
    ctx.fillStyle = MUTED;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function haloLabel(ctx, text, x, y, opts) {
    opts = opts || {};
    ctx.save();
    ctx.font = opts.font || '11px Inter, sans-serif';
    ctx.textAlign = opts.align || 'center';
    ctx.textBaseline = opts.baseline || 'middle';
    var w = ctx.measureText ? ctx.measureText(text).width : String(text).length * 6.5;
    var ax = opts.align === 'left' ? x : (opts.align === 'right' ? x - w : x - w / 2);
    var ay = opts.baseline === 'top' ? y : (opts.baseline === 'bottom' ? y - 12 : y - 7);
    ctx.fillStyle = PGRE.vizStageTheme().chipFade(0.92);
    ctx.fillRect(ax - 3, ay - 1, w + 6, 14);
    ctx.fillStyle = opts.color || INK;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function dividerV(ctx, x, y0, y1) {
    ctx.save();
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, y0);
    ctx.lineTo(x + 0.5, y1);
    ctx.stroke();
    ctx.restore();
  }

  // Unlabeled shaft via CV.drawArrow; one halo letter at mid or tip (never a pile at the origin).
  function labeledArrow(ctx, x0, y0, x1, y1, color, label, opts) {
    opts = opts || {};
    var lw = opts.lineWidth != null ? opts.lineWidth : 2.2;
    var ah = opts.arrowSize != null ? opts.arrowSize : 8;
    if (CV && typeof CV.drawArrow === 'function') {
      CV.drawArrow(ctx, x0, y0, x1, y1, color, '', lw, ah);
    } else {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      ctx.restore();
    }
    if (!label) return;
    var dx = x1 - x0;
    var dy = y1 - y0;
    var len = Math.hypot(dx, dy);
    if (len < 1) return;
    var ux = dx / len;
    var uy = dy / len;
    var nx = -uy;
    var ny = ux;
    var along = opts.along != null ? opts.along : 0.5;
    var side = opts.side != null ? opts.side : 1;
    var pad = opts.pad != null ? opts.pad : 12;
    var extra = opts.extraAlong != null ? opts.extraAlong : 0;
    var lx = x0 + dx * along + nx * side * pad + ux * extra;
    var ly = y0 + dy * along + ny * side * pad + uy * extra;
    var cw = opts.clampW;
    var ch = opts.clampH;
    if (cw && ch) {
      if (lx < 14 || lx > cw - 14 || ly < 16 || ly > ch - 12) {
        side = -side;
        lx = x0 + dx * along + nx * side * pad + ux * extra;
        ly = y0 + dy * along + ny * side * pad + uy * extra;
      }
      lx = Math.max(14, Math.min(cw - 14, lx));
      ly = Math.max(16, Math.min(ch - 12, ly));
    }
    haloLabel(ctx, label, lx, ly, { color: color });
  }

  function wrapAngle(a) {
    var t = a % (2 * Math.PI);
    if (t < 0) t += 2 * Math.PI;
    return t;
  }

  function angSpan(a, b) {
    return wrapAngle(b - a);
  }

  function keplerE(M, e) {
    var twoPi = 2 * Math.PI;
    M = ((M % twoPi) + twoPi) % twoPi;
    if (M > Math.PI) M -= twoPi;
    var E = M;
    var i, dE, denom;
    for (i = 0; i < 14; i++) {
      denom = 1 - e * Math.cos(E);
      if (Math.abs(denom) < 1e-12) break;
      dE = (E - e * Math.sin(E) - M) / denom;
      E -= dE;
      if (Math.abs(dE) < 1e-12) break;
    }
    if (!isFinite(E)) E = M;
    return E;
  }

  function trueFromM(M, e) {
    if (e < 1e-8) return wrapAngle(M);
    var E = keplerE(M, e);
    var ta = 2 * Math.atan2(
      Math.sqrt(1 + e) * Math.sin(E / 2),
      Math.sqrt(Math.max(1e-12, 1 - e)) * Math.cos(E / 2)
    );
    return wrapAngle(ta);
  }

  function polarR(phi, p, e) {
    var d = 1 + e * Math.cos(phi);
    if (d <= 1e-6) return Infinity;
    return p / d;
  }

  function paintPolarWedge(ctx, fx, fy, p, e, s, phi0, phi1, fill, stroke) {
    var dphi = angSpan(phi0, phi1);
    if (dphi < 1e-4) return;
    var n = Math.max(10, Math.ceil(dphi / 0.045));
    var k, ph, rv;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    for (k = 0; k <= n; k++) {
      ph = phi0 + dphi * (k / n);
      rv = polarR(ph, p, e);
      if (!isFinite(rv)) continue;
      ctx.lineTo(fx + rv * Math.cos(ph) * s, fy + rv * Math.sin(ph) * s);
    }
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    ctx.restore();
  }

  function wedgeCentroid(fx, fy, p, e, s, phi0, phi1) {
    var mid = phi0 + angSpan(phi0, phi1) * 0.5;
    var rv = polarR(mid, p, e);
    if (!isFinite(rv)) rv = p;
    return {
      x: fx + 0.52 * rv * Math.cos(mid) * s,
      y: fy + 0.52 * rv * Math.sin(mid) * s
    };
  }

  function disk(ctx, x, y, r, fill, glow) {
    if (!isFinite(x) || !isFinite(y) || !isFinite(r)) return;
    if (glow && CV && typeof CV.drawGlowCircle === 'function') {
      CV.drawGlowCircle(ctx, x, y, r, fill, glow, Math.max(8, r * 1.7));
      return;
    }
    ctx.save();
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1, r), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }


  PGRE.visualizers['cpgf-1.35'] = {
  id: 'cpgf-1.35',
  topic: 'cm',
  title: 'Conserved Angular Momentum & Kepler’s 2nd Law in Polar Coordinates',
  formulaLatex: 'l = m r^2 \\dot{\\phi} = \\text{constant} \\quad\\iff\\quad \\frac{dA}{dt} = \\frac{1}{2} r^2 \\dot{\\phi} = \\frac{l}{2m}',

  physicalStory: `In any central force field $\\mathbf{F}(\\mathbf{r}) = f(r)\\hat{\\mathbf{r}}$, the torque about the force center vanishes: $\\boldsymbol{\\tau} = \\mathbf{r} \\times \\mathbf{F} = \\mathbf{0}$. Angular momentum $\\mathbf{l} = \\mathbf{r} \\times m\\mathbf{v}$ is therefore constant, the motion is planar, and $l = m r^2 \\dot{\\phi}$ is an integral of motion.

The radius vector from the force center sweeps area $dA = \\frac{1}{2} r^2 d\\phi$. Constancy of $l$ is Kepler's second law: equal areas in equal times, $dA/dt = l/(2m)$, for every central force — not only gravity. On an ellipse the two highlighted sectors have identical duration $\\Delta t$ and therefore identical area. Near periapsis $r$ is small, so $\\dot{\\phi} \\propto 1/r^2$ is large and the sector is wide-angled and short. Near apoapsis the same $\\Delta t$ is a long, narrow sliver. The planet races through periapsis and crawls through apoapsis so that $r^2 \\dot{\\phi}$ never changes.`,

  derivationSteps: [
    "1. Torque definition: $\\boldsymbol{\\tau} = \\mathbf{r} \\times \\mathbf{F}(\\mathbf{r}) = \\mathbf{r} \\times [f(r)\\hat{\\mathbf{r}}] = f(r)(\\mathbf{r} \\times \\hat{\\mathbf{r}}) = \\mathbf{0}$.",
    "2. Conservation of angular momentum: $\\frac{d\\mathbf{L}}{dt} = \\boldsymbol{\\tau} = \\mathbf{0} \\implies \\mathbf{L} = \\mathbf{r} \\times (m\\mathbf{v}) = \\text{constant vector}$.",
    "3. Planar motion constraint: $\\mathbf{r}(t) \\cdot \\mathbf{L} = \\mathbf{r} \\cdot (\\mathbf{r} \\times m\\mathbf{v}) = 0 \\implies$ orbit is strictly 2-dimensional.",
    "4. Polar coordinate velocity: $\\mathbf{v} = \\dot{r}\\hat{\\mathbf{r}} + r\\dot{\\phi}\\hat{\\boldsymbol{\\phi}}$.",
    "5. Angular momentum magnitude: $\\mathbf{L} = (r\\hat{\\mathbf{r}}) \\times m(\\dot{r}\\hat{\\mathbf{r}} + r\\dot{\\phi}\\hat{\\boldsymbol{\\phi}}) = m r^2 \\dot{\\phi} \\hat{\\mathbf{z}} \\implies l = m r^2 \\dot{\\phi}$.",
    "6. Kepler's Second Law (Areal Velocity): Triangular sector $dA = \\frac{1}{2}|\\mathbf{r} \\times d\\mathbf{r}| = \\frac{1}{2} r (r d\\phi) \\implies \\frac{dA}{dt} = \\frac{1}{2}r^2\\dot{\\phi} = \\frac{l}{2m} = \\text{constant}$."
  ],

  limitingCases: [
    "Circular Orbit ($e = 0$): $r(t) = R = \\text{const} \\implies \\dot{\\phi} = \\omega = \\frac{l}{m R^2} = \\text{const}$, uniform circular motion.",
    "Perihelion ($r_p$) vs Aphelion ($r_a$): Since $\\dot{r} = 0$ at both apsides, linear speeds satisfy $v_p r_p = v_a r_a \\implies \\frac{v_p}{v_a} = \\frac{r_a}{r_p}$.",
    "Radial Plunge ($l \\to 0$): Orbital angular momentum vanishes; the areal sweep collapses to zero ($dA/dt = 0$) and motion collapses to a 1D straight-line collision into the center.",
    "Asymptotic Limit ($r \\to \\infty$ with impact parameter $b$ and initial speed $v_\\infty$): $l = m v_\\infty b$."
  ],

  greTraps: [
    "TRAP 1: Confusing $l = m r^2 \\dot{\\phi}$ with $l = m v r$. The relation $l = m v r$ is ONLY true at the apsides (perihelion & aphelion) where $\\mathbf{v} \\perp \\mathbf{r}$. At general orbital points, $v = \\sqrt{\\dot{r}^2 + r^2\\dot{\\phi}^2} > v_\\perp$, so $l = m r v_\\perp \\le m r v$.",
    "TRAP 2: Believing Kepler's 2nd Law ($dA/dt = \\text{const}$) only holds for $1/r^2$ gravity. In reality, $dA/dt = \\text{const}$ holds for ANY central force $f(r)$ because it depends solely on zero torque, not the inverse-square law!",
    "TRAP 3: Forgetting that $\\dot{\\phi} \\propto 1/r^2$ varies much more sharply than linear tangential velocity $v_\\perp \\propto 1/r$."
  ],

  parameters: [
    { id: 'eccentricity', label: 'Eccentricity ($e$)', min: 0.0, max: 0.85, step: 0.05, default: 0.50, unit: '' },
    { id: 'sectorDuration', label: 'Equal-time slice ($\\Delta t$)', min: 0.3, max: 1.2, step: 0.1, default: 0.5, unit: 's' },
    { id: 'simSpeed', label: 'Simulation Speed', min: 0.2, max: 3.0, step: 0.2, default: 1.0, unit: 'x' }
  ],

  init(container, state, redraw) {
    state._time = 0;
    state._trail = [];
  },

  draw(ctx, width, height, state, dt) {
    state = state || {};
    var size = canvasSize(width, height);
    width = size.w;
    height = size.h;
    creamFill(ctx, width, height);
    lightGrid(ctx, width, height, 40);

    var e = Math.max(0, Math.min(0.92, numParam(state, 'eccentricity', 0.50)));
    var sectorDt = Math.max(0.2, numParam(state, 'sectorDuration', 0.5));
    var speed = numParam(state, 'simSpeed', 1.0);
    dt = safeDt(dt);

    var m = 1.0;
    var T = 8.0;
    var nMot = (2 * Math.PI) / T;
    var a = 1.0;
    var b = Math.sqrt(Math.max(0.02, 1 - e * e));
    var p = a * (1 - e * e);
    var h = nMot * a * a * b;
    var l = m * h;
    var arealVelocity = 0.5 * h;
    var sectorArea = arealVelocity * sectorDt;

    var padT = 30;
    var padB = 26;
    var padL = 36;
    var padR = 28;
    var availW = Math.max(80, width - padL - padR);
    var availH = Math.max(80, height - padT - padB);
    var s = Math.min(availW / (2.12 * a), availH / (2.16 * b));
    if (!isFinite(s) || s <= 0) s = 1;

    var ecx = padL + availW / 2;
    var ecy = padT + availH / 2;
    var fx = ecx + a * e * s;
    var fy = ecy;

    state._time = (state._time || 0) + dt * speed;
    var meanAnomaly = wrapAngle(nMot * state._time);
    var trueAnomaly = trueFromM(meanAnomaly, e);
    var r = polarR(trueAnomaly, p, e);
    var px = fx + r * Math.cos(trueAnomaly) * s;
    var py = fy + r * Math.sin(trueAnomaly) * s;
    var phiDot = h / Math.max(r * r, 1e-8);
    var vPhi = h / Math.max(r, 1e-8);
    var vR = (h / Math.max(p, 1e-8)) * e * Math.sin(trueAnomaly);
    var vTot = Math.hypot(vR, vPhi);

    var dM = nMot * sectorDt;
    var peri0 = trueFromM(-0.5 * dM, e);
    var peri1 = trueFromM(0.5 * dM, e);
    var apo0 = trueFromM(Math.PI - 0.5 * dM, e);
    var apo1 = trueFromM(Math.PI + 0.5 * dM, e);
    var dPhiPeri = angSpan(peri0, peri1);
    var dPhiApo = angSpan(apo0, apo1);

    if (state._lastEcc !== e) {
      state._trail = [];
      state._lastEcc = e;
    }

    panelTitle(ctx, 'Equal areas in equal times', padL, 8, 'left');

    paintPolarWedge(ctx, fx, fy, p, e, s, peri0, peri1, 'rgba(204, 120, 92, 0.30)', 'rgba(204, 120, 92, 0.70)');
    paintPolarWedge(ctx, fx, fy, p, e, s, apo0, apo1, 'rgba(93, 184, 166, 0.30)', 'rgba(93, 184, 166, 0.70)');

    ctx.save();
    ctx.strokeStyle = (CV && CV.colors && CV.colors.orbit) || 'rgba(204, 120, 92, 0.55)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(ecx, ecy, a * s, b * s, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.16);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ecx - a * s, fy);
    ctx.lineTo(ecx + a * s, fy);
    ctx.stroke();
    ctx.restore();

    var periC = wedgeCentroid(fx, fy, p, e, s, peri0, peri1);
    var apoC = wedgeCentroid(fx, fy, p, e, s, apo0, apo1);
    haloLabel(ctx, 'dt', periC.x, periC.y, { color: CORAL });
    haloLabel(ctx, 'dt', apoC.x, apoC.y, { color: TEAL });

    disk(ctx, fx, fy, 11, (CV && CV.colors && CV.colors.sun) || GOLD, (CV && CV.colors && CV.colors.sunGlow) || 'rgba(212, 160, 23, 0.35)');

    labeledArrow(ctx, fx, fy, px, py, (CV && CV.colors && CV.colors.vecR) || TEAL, 'r', {
      along: 0.42, side: 1, pad: 13, clampW: width, clampH: height, lineWidth: 2, arrowSize: 7
    });

    if (!state._trail) state._trail = [];
    state._trail.push({ x: px, y: py });
    if (state._trail.length > 48) state._trail.shift();

    ctx.save();
    var ti;
    for (ti = 0; ti < state._trail.length - 1; ti++) {
      ctx.strokeStyle = 'rgba(204, 120, 92, ' + ((ti / state._trail.length) * 0.5) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(state._trail[ti].x, state._trail[ti].y);
      ctx.lineTo(state._trail[ti + 1].x, state._trail[ti + 1].y);
      ctx.stroke();
    }
    ctx.restore();

    disk(ctx, px, py, 7.5, (CV && CV.colors && CV.colors.particle) || CORAL, (CV && CV.colors && CV.colors.particleGlow) || 'rgba(204, 120, 92, 0.5)');

    if (e > 0.08) {
      haloLabel(ctx, 'peri', Math.min(width - 18, ecx + a * s - 8), Math.min(height - 14, fy + 20), { color: MUTED, align: 'right' });
      haloLabel(ctx, 'apo', Math.max(18, ecx - a * s + 8), Math.max(18, fy - 20), { color: MUTED, align: 'left' });
    }

    pushLegend('Kepler 2nd law', [
      { label: '$dA/dt = l/(2m)$', value: '$' + arealVelocity.toFixed(3) + '$' },
      { label: 'Sector area $A = (dA/dt)\\,\\Delta t$', value: '$' + sectorArea.toFixed(3) + '$' },
      { label: '$\\Delta\\phi$ peri', value: '$' + dPhiPeri.toFixed(2) + '$' },
      { label: '$\\Delta\\phi$ apo', value: '$' + dPhiApo.toFixed(2) + '$' },
      { label: '$r$', value: '$' + r.toFixed(2) + '$' },
      { label: '$\\dot{\\phi}$', value: '$' + phiDot.toFixed(2) + '$' },
      { label: '$l = m r^2 \\dot{\\phi}$', value: '$' + l.toFixed(3) + '$' },
      { label: '$|v|$', value: '$' + vTot.toFixed(2) + '$' }
    ]);
  },

  challenge: {
    question: "A planet moves in an elliptical orbit under a central gravitational force. At perihelion distance $r_p = 1.0 \\times 10^8\\text{ m}$, its orbital speed is $v_p = 30\\text{ km/s}$. What is its orbital speed $v_a$ at aphelion distance $r_a = 3.0 \\times 10^8\\text{ m}$?",
    options: [
      "10 km/s",
      "15 km/s",
      "3.33 km/s",
      "90 km/s"
    ],
    correct: 0,
    explanation: "At both perihelion and aphelion (the apsidal turning points), the radial velocity $\\dot{r} = 0$, meaning the velocity is purely azimuthal (strictly perpendicular to $\\mathbf{r}$). Conservation of angular momentum requires $l = m r_p v_p = m r_a v_a$. Therefore, $v_a = v_p \\left(\\frac{r_p}{r_a}\\right) = 30\\text{ km/s} \\times \\left(\\frac{1.0\\times 10^8}{3.0\\times 10^8}\\right) = 10\\text{ km/s}$."
  }
};

  PGRE.visualizers['cpgf-1.38'] = {
  id: 'cpgf-1.38',
  topic: 'cm',
  title: 'Total Energy & 1D Effective Potential Well in Central Forces',
  formulaLatex: 'E = \\frac{1}{2}m\\dot{r}^2 + \\frac{l^2}{2mr^2} + U(r) \\equiv \\frac{1}{2}m\\dot{r}^2 + V_{\\text{eff}}(r)',

  physicalStory: `Angular momentum $l = m r^2 \\dot{\\phi}$ is conserved, so $\\phi$ is cyclic. Substituting $\\dot{\\phi} = l/(m r^2)$ collapses the planar orbit to an equivalent 1D radial problem in the effective potential $V_{\\text{eff}}(r) = l^2/(2mr^2) + U(r)$. The first term is the centrifugal barrier: a repulsive $1/r^2$ wall that keeps $l \\ne 0$ trajectories from the origin.

For Newtonian gravity $U = -k/r$ the barrier plus the attractive well form an asymmetric bowl. The bead on that bowl is the same $r(t)$ as the orbit on the left. Energy $E$ is a waterline: $E = E_{\\min}$ sits at the bottom (circle), $E_{\\min} < E < 0$ sloshes between turning points (ellipse), $E = 0$ is parabolic escape, and $E > 0$ is a hyperbolic scatter. The shaded band between $E$ and $V_{\\text{eff}}$ is the radial kinetic energy $\\frac{1}{2}m\\dot{r}^2$. Tangential motion never stops: at an apsis $\\dot{r} = 0$ but $v_\\phi = l/(mr) \\ne 0$.`,

  derivationSteps: [
    "1. 2D Kinetic Energy in polar coordinates: $T = \\frac{1}{2}m(\\dot{r}^2 + r^2\\dot{\\phi}^2)$.",
    "2. Substitute conserved angular momentum $\\dot{\\phi} = \\frac{l}{mr^2}$: $T = \\frac{1}{2}m\\dot{r}^2 + \\frac{1}{2}mr^2\\left(\\frac{l}{mr^2}\\right)^2 = \\frac{1}{2}m\\dot{r}^2 + \\frac{l^2}{2mr^2}$.",
    "3. Total Mechanical Energy: $E = T + U(r) = \\frac{1}{2}m\\dot{r}^2 + \\frac{l^2}{2mr^2} + U(r)$.",
    "4. Define 1D Effective Potential: $V_{\\text{eff}}(r) \\equiv \\frac{l^2}{2mr^2} + U(r) \\implies E = \\frac{1}{2}m\\dot{r}^2 + V_{\\text{eff}}(r)$.",
    "5. Radial Velocity & Turning Points: $\\dot{r} = \\pm \\sqrt{\\frac{2}{m}\\left[E - V_{\\text{eff}}(r)\\right]}$. Turning points (apsides) occur where $\\dot{r} = 0 \\iff E = V_{\\text{eff}}(r)$.",
    "6. Circular Orbit Radius: $\\left.\\frac{dV_{\\text{eff}}}{dr}\\right|_{r_0} = -\\frac{l^2}{mr_0^3} + \\frac{k}{r_0^2} = 0 \\implies r_0 = \\frac{l^2}{mk}$ with minimum energy $E_{\\min} = -\\frac{mk^2}{2l^2}$."
  ],

  limitingCases: [
    "Circular Orbit ($E = E_{\\min} = -mk^2/(2l^2)$): Single turning point $r_{\\min} = r_{\\max} = r_0$, zero radial kinetic energy ($T_r = 0$).",
    "Bound Elliptic Orbit ($E_{\\min} < E < 0$): Two classical turning points ($r_{\\min}$ periapsis, $r_{\\max}$ apoapsis).",
    "Parabolic Escape ($E = 0$): $r_{\\min} = l^2/(2mk)$, particle escapes to $r \\to \\infty$ with asymptotic speed $v_\\infty = 0$.",
    "Hyperbolic Scatter ($E > 0$): Single periapsis turning point; particle escapes to $r \\to \\infty$ with residual speed $v_\\infty = \\sqrt{2E/m}$.",
    "Zero Angular Momentum ($l = 0$): Centrifugal barrier vanishes ($V_{\\text{eff}} = U(r)$); particle undergoes 1D free-fall collapse directly into $r = 0$."
  ],

  greTraps: [
    "TRAP 1: Sign of the centrifugal potential. Centrifugal force is OUTWARD (+), so its potential energy is POSITIVE $+l^2/(2mr^2)$ (repulsive). A common blunder is putting a minus sign on the centrifugal potential.",
    "TRAP 2: Thinking speed is zero at turning points. Only the RADIAL velocity $\\dot{r} = 0$ at $r_{\\min}$ and $r_{\\max}$. The tangential velocity $v_\\phi = l/(mr) \\ne 0$, so kinetic energy $T = l^2/(2mr^2) > 0$.",
    "TRAP 3: Orbit stability condition. A circular orbit is stable if and only if $\\left.\\frac{d^2V_{\\text{eff}}}{dr^2}\\right|_{r_0} > 0$. For a general power law force $F(r) = -k/r^n$, stable closed orbits only exist for $n < 3$ (Bertrand's Theorem)."
  ],

  parameters: [
    { id: 'relEnergy', label: 'Energy ($E / |E_{\\min}|$)', min: -1, max: 0.8, step: 0.05, default: -0.55, unit: '' },
    { id: 'angMom', label: 'Angular momentum ($l$)', min: 0.8, max: 2.0, step: 0.1, default: 1.3, unit: '' },
    { id: 'showParts', label: 'Decompose $V_{\\mathrm{eff}}$', type: 'toggle', default: true, unit: '' },
    { id: 'simSpeed', label: 'Simulation Speed', min: 0.2, max: 3.0, step: 0.2, default: 1.0, unit: 'x' }
  ],

  init(container, state, redraw) {
    state._phi = 0;
    state._orbitTrail = [];
  },

  draw(ctx, width, height, state, dt) {
    state = state || {};
    var size = canvasSize(width, height);
    width = size.w;
    height = size.h;
    creamFill(ctx, width, height);
    lightGrid(ctx, width, height, 40);

    var m = 1.0;
    var k = 24000;
    var l = numParam(state, 'angMom', 1.3) * 1200;
    var relE = numParam(state, 'relEnergy', -0.55);
    var speed = numParam(state, 'simSpeed', 1.0);
    var showParts = flagParam(state, 'showParts', true);
    dt = safeDt(dt);

    var r0 = (l * l) / (m * k);
    var Emin = -(m * k * k) / (2 * l * l);
    var E = relE * Math.abs(Emin);
    var eOrb = Math.sqrt(Math.max(0, 1 + E / Math.abs(Emin)));
    if (relE <= -0.999) eOrb = 0;
    var p = r0;
    var rMin = p / (1 + eOrb);
    var rMax = (eOrb < 0.999) ? p / Math.max(1e-6, 1 - eOrb) : Infinity;
    var almostCirc = eOrb < 0.045;
    var hSpec = l / m;

    var phiMax = Math.PI;
    if (eOrb > 1) {
      phiMax = Math.acos(Math.max(-1, Math.min(1, -1 / eOrb))) - 0.05;
    } else if (eOrb > 0.999) {
      phiMax = 2.55;
    }

    var splitX = Math.round(width * 0.40);
    var padT = 28;
    var ox = splitX * 0.50;
    var oy = padT + (height - padT) * 0.52;
    var orbitRoom = Math.min(splitX * 0.38, (height - padT - 16) * 0.42);
    var rView;
    if (eOrb < 1 && isFinite(rMax) && rMax < r0 * 5.5) rView = rMax * 1.10;
    else rView = Math.max(r0 * 2.5, rMin * 3.0, 80);
    var orbitScale = orbitRoom / Math.max(rView, 1);
    var rLeave = (orbitRoom * 1.15) / Math.max(orbitScale, 1e-6);

    var phiLaunch = (eOrb < 1) ? 0 : -Math.min(phiMax * 0.55, 1.2);
    var key = l.toFixed(2) + ':' + E.toFixed(2);
    if (state._key !== key) {
      state._key = key;
      state._phi = phiLaunch;
      state._orbitTrail = [];
    }
    if (!isFinite(state._phi)) state._phi = 0;

    var sub = 12;
    var hdt = (dt * speed) / sub;
    var step, rvPhi, den;
    for (step = 0; step < sub; step++) {
      den = 1 + eOrb * Math.cos(state._phi);
      rvPhi = den > 1e-4 ? p / den : p * 8;
      rvPhi = Math.max(p * 0.08, rvPhi);
      state._phi += (hSpec / (rvPhi * rvPhi)) * hdt;
    }
    if (eOrb >= 1 && (Math.abs(state._phi) > phiMax)) {
      state._phi = phiLaunch;
      state._orbitTrail = [];
    }

    den = 1 + eOrb * Math.cos(state._phi);
    var rNow = den > 1e-4 ? p / den : rLeave;
    if (!isFinite(rNow) || rNow < 1) rNow = rMin;
    if (eOrb >= 1 && rNow > rLeave) {
      state._phi = phiLaunch;
      state._orbitTrail = [];
      den = 1 + eOrb * Math.cos(state._phi);
      rNow = p / Math.max(den, 1e-4);
    }

    function veff(rv) {
      return (l * l) / (2 * m * rv * rv) - k / rv;
    }
    function vCent(rv) {
      return (l * l) / (2 * m * rv * rv);
    }
    function vGrav(rv) {
      return -k / rv;
    }

    var Tr = Math.max(0, E - veff(rNow));
    var px = ox + rNow * Math.cos(state._phi) * orbitScale;
    var py = oy + rNow * Math.sin(state._phi) * orbitScale;

    dividerV(ctx, splitX, 8, height - 8);
    panelTitle(ctx, 'Orbit  (same r)', 14, 8, 'left');
    panelTitle(ctx, 'Radial well', splitX + 14, 8, 'left');

    ctx.save();
    ctx.strokeStyle = (CV && CV.colors && CV.colors.orbit) || 'rgba(204, 120, 92, 0.50)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    var ph0 = (eOrb < 1) ? 0 : -phiMax;
    var ph1 = (eOrb < 1) ? Math.PI * 2 : phiMax;
    var dph = 0.04;
    var started = false;
    var ph, rr, xx, yy;
    for (ph = ph0; ph <= ph1 + 1e-9; ph += dph) {
      rr = polarR(ph, p, eOrb);
      if (!isFinite(rr) || rr > rView * 1.08) {
        started = false;
        continue;
      }
      xx = ox + rr * Math.cos(ph) * orbitScale;
      yy = oy + rr * Math.sin(ph) * orbitScale;
      if (!started) { ctx.moveTo(xx, yy); started = true; }
      else ctx.lineTo(xx, yy);
    }
    ctx.stroke();
    ctx.restore();

    if (rMin * orbitScale > 6 && rMin < rView) {
      ctx.save();
      ctx.strokeStyle = 'rgba(224, 86, 102, 0.40)';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(ox, oy, rMin * orbitScale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (isFinite(rMax) && rMax < rView && rMax * orbitScale < orbitRoom * 1.05) {
      ctx.save();
      ctx.strokeStyle = 'rgba(204, 120, 92, 0.40)';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(ox, oy, rMax * orbitScale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    disk(ctx, ox, oy, 10, (CV && CV.colors && CV.colors.sun) || GOLD, (CV && CV.colors && CV.colors.sunGlow) || 'rgba(212, 160, 23, 0.35)');

    if (!state._orbitTrail) state._orbitTrail = [];
    state._orbitTrail.push({ x: px, y: py });
    if (state._orbitTrail.length > 110) state._orbitTrail.shift();
    ctx.save();
    var ti;
    for (ti = 0; ti < state._orbitTrail.length - 1; ti++) {
      ctx.strokeStyle = 'rgba(204, 120, 92, ' + ((ti / state._orbitTrail.length) * 0.62) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(state._orbitTrail[ti].x, state._orbitTrail[ti].y);
      ctx.lineTo(state._orbitTrail[ti + 1].x, state._orbitTrail[ti + 1].y);
      ctx.stroke();
    }
    ctx.restore();

    if (CV && typeof CV.drawArrow === 'function') {
      CV.drawArrow(ctx, ox, oy, px, py, 'rgba(93, 184, 166, 0.75)', '', 1.5, 6);
    }
    disk(ctx, px, py, 7, (CV && CV.colors && CV.colors.particle) || CORAL, (CV && CV.colors && CV.colors.particleGlow) || 'rgba(204, 120, 92, 0.5)');

    var gx0 = splitX + 38;
    var gx1 = width - 16;
    var gy0 = 42;
    var gy1 = height - 24;
    if (gx1 < gx0 + 40) gx1 = gx0 + 40;
    if (gy1 < gy0 + 40) gy1 = gy0 + 40;
    var gZeroY = gy0 + (gy1 - gy0) * 0.36;
    var rPlotMax = (eOrb < 1 && isFinite(rMax) && rMax < r0 * 7) ? Math.max(r0 * 1.6, rMax * 1.18) : Math.max(r0 * 3.1, rMin * 3.4);
    var rPlotMin = Math.max(r0 * 0.16, 10);
    var rScale = (gx1 - gx0) / rPlotMax;
    var vScale = (gy1 - gZeroY) / (Math.abs(Emin) * 1.55);

    function plotX(rv) { return gx0 + rv * rScale; }
    function plotY(V) { return gZeroY - V * vScale; }

    ctx.save();
    ctx.beginPath();
    ctx.rect(gx0, gy0, gx1 - gx0, gy1 - gy0);
    ctx.clip();

    ctx.beginPath();
    ctx.moveTo(plotX(rPlotMin), gy1);
    var rv, yy;
    for (rv = rPlotMin; rv <= rPlotMax; rv += rPlotMax / 160) {
      yy = plotY(veff(rv));
      if (yy < gy0) yy = gy0;
      if (yy > gy1) yy = gy1;
      ctx.lineTo(plotX(rv), yy);
    }
    ctx.lineTo(plotX(rPlotMax), gy1);
    ctx.closePath();
    ctx.fillStyle = PGRE.vizStageTheme().inkFade(0.055);
    ctx.fill();

    var allowLo = rMin;
    var allowHi = (eOrb < 1 && isFinite(rMax)) ? rMax : rPlotMax;
    if (allowLo < rPlotMax && E > veff(r0) - 1e-6) {
      ctx.beginPath();
      started = false;
      var lastX = plotX(allowLo);
      for (rv = Math.max(allowLo, rPlotMin); rv <= Math.min(allowHi, rPlotMax); rv += rPlotMax / 180) {
        if (veff(rv) > E + 1e-6) {
          if (started) {
            ctx.lineTo(plotX(rv), plotY(E));
            ctx.lineTo(lastX, plotY(E));
            ctx.closePath();
          }
          started = false;
          continue;
        }
        yy = plotY(veff(rv));
        if (!started) {
          ctx.moveTo(plotX(rv), plotY(E));
          ctx.lineTo(plotX(rv), yy);
          started = true;
          lastX = plotX(rv);
        } else {
          ctx.lineTo(plotX(rv), yy);
          lastX = plotX(rv);
        }
      }
      if (started) {
        ctx.lineTo(lastX, plotY(E));
        ctx.closePath();
        ctx.fillStyle = 'rgba(93, 184, 166, 0.28)';
        ctx.fill();
      }
    }

    ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.22);
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(gx0, gZeroY);
    ctx.lineTo(gx1, gZeroY);
    ctx.moveTo(gx0, gy0);
    ctx.lineTo(gx0, gy1);
    ctx.stroke();

    function strokeFn(color, widthPx, dash, fn, dr) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = widthPx;
      ctx.setLineDash(dash || []);
      ctx.beginPath();
      started = false;
      for (rv = rPlotMin; rv <= rPlotMax; rv += dr) {
        yy = plotY(fn(rv));
        xx = plotX(rv);
        if (yy < gy0 - 6 || yy > gy1 + 6) { started = false; continue; }
        if (!started) { ctx.moveTo(xx, yy); started = true; }
        else ctx.lineTo(xx, yy);
      }
      ctx.stroke();
      ctx.restore();
    }

    if (showParts) {
      strokeFn('rgba(212, 160, 23, 0.70)', 1.4, [4, 4], vCent, 2);
      strokeFn('rgba(150, 75, 50, 0.65)', 1.4, [4, 4], vGrav, 2);
    }
    strokeFn(VIOLET, 2.5, [], veff, 1.4);

    var plotEY = plotY(E);
    ctx.strokeStyle = (CV && CV.colors && CV.colors.energy) || ROSE;
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(gx0, plotEY);
    ctx.lineTo(gx1, plotEY);
    ctx.stroke();

    ctx.setLineDash([2, 3]);
    ctx.lineWidth = 1;
    if (almostCirc) {
      ctx.strokeStyle = 'rgba(78, 155, 111, 0.75)';
      ctx.beginPath();
      ctx.moveTo(plotX(r0), gy0);
      ctx.lineTo(plotX(r0), gy1);
      ctx.stroke();
    } else {
      if (rMin < rPlotMax) {
        ctx.strokeStyle = 'rgba(224, 86, 102, 0.65)';
        ctx.beginPath();
        ctx.moveTo(plotX(rMin), gy0);
        ctx.lineTo(plotX(rMin), gy1);
        ctx.stroke();
      }
      if (isFinite(rMax) && rMax < rPlotMax) {
        ctx.strokeStyle = 'rgba(204, 120, 92, 0.65)';
        ctx.beginPath();
        ctx.moveTo(plotX(rMax), gy0);
        ctx.lineTo(plotX(rMax), gy1);
        ctx.stroke();
      }
    }

    var beadX = Math.max(gx0 + 4, Math.min(gx1 - 4, plotX(rNow)));
    ctx.strokeStyle = 'rgba(93, 184, 166, 0.45)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(beadX, gy0);
    ctx.lineTo(beadX, gy1);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    haloLabel(ctx, 'V = 0', gx0 + 6, gZeroY - 10, { align: 'left', color: MUTED });
    if (Math.abs(plotEY - gZeroY) < 14) {
      haloLabel(ctx, 'E', gx1 - 6, plotEY - 12, { align: 'right', color: ROSE });
      haloLabel(ctx, 'r', gx1 - 6, gZeroY + 12, { align: 'right', color: MUTED });
    } else {
      haloLabel(ctx, 'r', gx1 - 6, gZeroY - 10, { align: 'right', color: MUTED });
      haloLabel(ctx, 'E', gx1 - 6, plotEY - 8, { align: 'right', color: ROSE });
    }

    if (almostCirc) {
      haloLabel(ctx, 'r0', plotX(r0), gy1 - 8, { color: EMERALD });
    } else {
      if (rMin < rPlotMax) {
        haloLabel(ctx, 'rmin', plotX(rMin), gy1 - 8, {
          color: ROSE, align: (isFinite(rMax) && rMax - rMin < rPlotMax * 0.12) ? 'right' : 'center'
        });
      }
      if (isFinite(rMax) && rMax < rPlotMax) {
        haloLabel(ctx, 'rmax', plotX(rMax), gy1 - 8, {
          color: CORAL, align: (rMax - rMin < rPlotMax * 0.12) ? 'left' : 'center'
        });
      }
    }

    var beadY = Math.max(gy0 + 4, Math.min(gy1 - 4, plotY(veff(rNow))));
    disk(ctx, beadX, beadY, 7, VIOLET, 'rgba(157, 124, 216, 0.45)');

    var orbitKind = almostCirc
      ? 'circular'
      : (eOrb < 1 ? 'bound ellipse' : (Math.abs(eOrb - 1) < 0.02 ? 'parabolic escape' : 'hyperbolic scatter'));

    pushLegend('Effective potential', [
      { label: '$E / |E_{\\min}|$', value: '$' + (Math.abs(Emin) > 1e-9 ? (E / Math.abs(Emin)).toFixed(2) : '0') + '$' },
      { label: 'Orbit', value: orbitKind },
      { label: '$e$', value: '$' + eOrb.toFixed(2) + '$' },
      { label: '$r$', value: '$' + rNow.toFixed(1) + '$' },
      { label: '$r_0$', value: '$' + r0.toFixed(1) + '$' },
      { label: '$T_r = E - V_{\\mathrm{eff}}$', value: '$' + Tr.toFixed(1) + '$' },
      { label: '$E$', value: '$' + E.toFixed(1) + '$' },
      { label: '$E_{\\min}$', value: '$' + Emin.toFixed(1) + '$' }
    ]);
  },

  challenge: {
    question: "A particle of mass $m$ moves under an attractive central potential $U(r) = -\\frac{k}{r^2}$ ($k > 0$) with non-zero angular momentum $l$. For what critical value of $k$ does the effective potential lose its repulsive centrifugal barrier entirely, causing the particle to spiral uncontrollably into the origin?",
    options: [
      "$k > \\frac{l^2}{2m}$",
      "$k > \\frac{l^2}{m}$",
      "$k > \\frac{2l^2}{m}$",
      "$k > \\sqrt{\\frac{l^2}{2m}}$"
    ],
    correct: 0,
    explanation: "The effective potential for $U(r) = -k/r^2$ is $V_{\\text{eff}}(r) = \\frac{l^2}{2mr^2} - \\frac{k}{r^2} = \\left(\\frac{l^2}{2m} - k\\right)\\frac{1}{r^2}$. If $k > \\frac{l^2}{2m}$, the coefficient becomes strictly negative, meaning $V_{\\text{eff}}(r) \\to -\\infty$ as $r \\to 0$. There is no centrifugal barrier to turn the particle around, leading to orbital collapse and inward spiraling into $r = 0$ (orbital capture)."
  }
};

  PGRE.visualizers['cpgf-1.3'] = {
  id: 'cpgf-1.3',
  topic: 'cm',
  title: 'Centripetal Radial Acceleration & The Velocity Hodograph',
  formulaLatex: 'a_c = \\frac{v^2}{r} = \\omega^2 r = v\\omega',

  physicalStory: `Uniform circular motion has constant speed $v$ but a velocity vector that rotates. The geometric proof is a pair of similar isosceles triangles. In a short time the position vector turns through $\\Delta\\theta$; the two radii and the chord $\\Delta\\mathbf{r}$ form a triangle similar to the two velocity vectors and the chord $\\Delta\\mathbf{v}$ drawn from a common origin (the hodograph). Side ratios give $|\\Delta\\mathbf{v}|/v = |\\Delta\\mathbf{r}|/r = 2\\sin(\\Delta\\theta/2)$. Dividing by $\\Delta t = \\Delta\\theta/\\omega$ yields $|\\Delta\\mathbf{v}|/\\Delta t = v\\omega\\,\\mathrm{sinc}(\\Delta\\theta/2) \\to v^2/r$ as $\\Delta\\theta \\to 0$, directed along the angle bisector — toward the center.

The hodograph of uniform circular motion is itself a circle of radius $v$. The tip of $\\mathbf{v}$ runs around that circle at the same $\\omega$, so $\\mathbf{a} = d\\mathbf{v}/dt$ is tangent to the hodograph and perpendicular to $\\mathbf{v}$. Shrink $\\Delta\\theta$ to watch the finite chord become the true centripetal acceleration.`,

  derivationSteps: [
    "1. Parametric position vector: $\\mathbf{r}(t) = r\\cos(\\omega t)\\hat{\\mathbf{i}} + r\\sin(\\omega t)\\hat{\\mathbf{j}} = r\\hat{\\mathbf{r}}$.",
    "2. Tangential velocity vector: $\\mathbf{v}(t) = \\frac{d\\mathbf{r}}{dt} = -r\\omega\\sin(\\omega t)\\hat{\\mathbf{i}} + r\\omega\\cos(\\omega t)\\hat{\\mathbf{j}} = r\\omega\\hat{\\boldsymbol{\\theta}}$.",
    "3. Acceleration vector: $\\mathbf{a}(t) = \\frac{d\\mathbf{v}}{dt} = -r\\omega^2\\cos(\\omega t)\\hat{\\mathbf{i}} - r\\omega^2\\sin(\\omega t)\\hat{\\mathbf{j}} = -\\omega^2\\mathbf{r}(t) = -\\omega^2 r \\hat{\\mathbf{r}}$.",
    "4. Hodograph geometric proof: Triangle $(\\mathbf{r}, \\mathbf{r}+\\Delta\\mathbf{r}, \\Delta\\mathbf{r})$ is similar to velocity triangle $(\\mathbf{v}, \\mathbf{v}+\\Delta\\mathbf{v}, \\Delta\\mathbf{v})$.",
    "5. Ratio of sides: $\\frac{|\\Delta\\mathbf{v}|}{v} = \\frac{|\\Delta\\mathbf{r}|}{r} = 2\\sin(\\Delta\\theta/2)$. With $\\Delta t = \\Delta\\theta/\\omega$, $\\frac{|\\Delta\\mathbf{v}|}{\\Delta t} = v\\omega\\,\\frac{\\sin(\\Delta\\theta/2)}{\\Delta\\theta/2} \\to v\\omega$ as $\\Delta\\theta \\to 0$.",
    "6. Taking $\\Delta t \\to 0$: $\\mathbf{a}_c = \\lim_{\\Delta t \\to 0} \\frac{\\Delta\\mathbf{v}}{\\Delta t} = -\\frac{v^2}{r}\\hat{\\mathbf{r}} = -\\omega^2 r\\hat{\\mathbf{r}}$."
  ],

  limitingCases: [
    "Infinite Radius Limit ($r \\to \\infty$ at fixed $v$): $a_c = v^2/r \\to 0$, trajectory locally approaches a straight line with zero curvature.",
    "Rigid Body Rotation (fixed $\\omega$): $a_c = \\omega^2 r \\propto r$. Center point has zero acceleration; rim experiences maximum acceleration.",
    "Constant Speed Transport (fixed $v$): $a_c = v^2/r \\propto 1/r$. Tighter turns demand drastically higher centripetal accelerations.",
    "Arbitrary Planar Curve: Total acceleration decomposes into tangential and normal components: $\\mathbf{a} = \\dot{v}\\hat{\\mathbf{T}} + \\frac{v^2}{\\rho}\\hat{\\mathbf{N}}$, where $\\rho$ is the instantaneous radius of curvature."
  ],

  greTraps: [
    "TRAP 1: 'Does acceleration increase or decrease with radius?' For constant linear speed $v$, $a_c \\propto 1/r$. For constant angular speed $\\omega$, $a_c \\propto r$. Always verify whether $v$ or $\\omega$ is held constant in the problem statement!",
    "TRAP 2: Centripetal acceleration does ZERO WORK. Because $\\mathbf{a}_c \\perp \\mathbf{v}$, the instantaneous power is $P = m\\mathbf{a}_c \\cdot \\mathbf{v} = 0$. Centripetal acceleration alters velocity direction without changing kinetic energy.",
    "TRAP 3: Forgetting tangential acceleration in non-uniform circular motion: $a_{\\text{total}} = \\sqrt{a_c^2 + a_t^2} = \\sqrt{(v^2/r)^2 + (r\\alpha)^2}$."
  ],

  parameters: [
    { id: 'radius', label: 'Radius ($r$)', min: 60, max: 180, step: 10, default: 120, unit: '' },
    { id: 'omega', label: 'Angular velocity ($\\omega$)', min: 0.5, max: 4.0, step: 0.25, default: 1.8, unit: 'rad/s' },
    { id: 'deltaTheta', label: 'Finite angle $(\\Delta\\theta)$', min: 15, max: 75, step: 5, default: 40, unit: 'deg' },
    { id: 'simSpeed', label: 'Simulation Speed', min: 0.2, max: 3.0, step: 0.2, default: 1.0, unit: 'x' }
  ],

  init(container, state, redraw) {
    state._theta = 0;
  },

  draw(ctx, width, height, state, dt) {
    state = state || {};
    var size = canvasSize(width, height);
    width = size.w;
    height = size.h;
    creamFill(ctx, width, height);
    lightGrid(ctx, width, height, 40);

    var r = numParam(state, 'radius', 120);
    var omega = numParam(state, 'omega', 1.8);
    var dDeg = numParam(state, 'deltaTheta', 40);
    var speed = numParam(state, 'simSpeed', 1.0);
    dt = safeDt(dt);
    var dTh = Math.max(0.08, dDeg * Math.PI / 180);

    state._theta = (state._theta || 0) + omega * dt * speed;
    var theta = state._theta;
    var theta0 = theta - dTh;

    var padT = 28;
    var splitX = Math.round(width * 0.56);
    var cx = splitX * 0.50;
    var cy = padT + (height - padT) * 0.54;
    var rFit = Math.min(splitX * 0.32, (height - padT) * 0.32);
    var fit = rFit / Math.max(r, 1);
    if (!isFinite(fit) || fit <= 0) fit = 1;
    var rDraw = r * fit;

    var px = cx + rDraw * Math.cos(theta);
    var py = cy + rDraw * Math.sin(theta);
    var p0x = cx + rDraw * Math.cos(theta0);
    var p0y = cy + rDraw * Math.sin(theta0);

    var vMag = omega * r;
    var aMag = omega * omega * r;
    var aFromV2r = (vMag * vMag) / Math.max(r, 1e-6);
    var aFromVom = vMag * omega;
    var dVfin = 2 * vMag * Math.sin(dTh / 2);
    var dtFin = dTh / Math.max(omega, 1e-8);
    var aFin = dVfin / dtFin;

    panelTitle(ctx, 'Position space', 14, 8, 'left');

    ctx.save();
    ctx.fillStyle = 'rgba(93, 184, 166, 0.18)';
    ctx.strokeStyle = 'rgba(93, 184, 166, 0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(p0x, p0y);
    ctx.lineTo(px, py);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = (CV && CV.colors && CV.colors.orbit) || 'rgba(204, 120, 92, 0.50)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, rDraw, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.35);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(p0x, p0y);
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.restore();

    disk(ctx, cx, cy, 4.5, MUTED, 'rgba(108, 106, 100, 0.30)');
    disk(ctx, p0x, p0y, 5, 'rgba(204, 120, 92, 0.40)', null);
    disk(ctx, px, py, 8, (CV && CV.colors && CV.colors.particle) || CORAL, (CV && CV.colors && CV.colors.particleGlow) || 'rgba(204, 120, 92, 0.5)');

    labeledArrow(ctx, cx, cy, px, py, (CV && CV.colors && CV.colors.vecR) || TEAL, 'r', {
      along: 0.34, side: 1, pad: 13, clampW: splitX, clampH: height, lineWidth: 2, arrowSize: 7
    });

    var vPix = Math.min(44, rDraw * 0.40);
    var aPix = Math.min(40, rDraw * 0.36);
    var vx = -Math.sin(theta);
    var vy = Math.cos(theta);
    labeledArrow(ctx, px, py, px + vx * vPix, py + vy * vPix, (CV && CV.colors && CV.colors.vecV) || EMERALD, 'v', {
      along: 1, side: 1, pad: 11, extraAlong: 10, clampW: splitX, clampH: height, lineWidth: 2.4, arrowSize: 8
    });
    labeledArrow(ctx, px, py, px - Math.cos(theta) * aPix, py - Math.sin(theta) * aPix, (CV && CV.colors && CV.colors.vecA) || ROSE, 'a', {
      along: 1, side: -1, pad: 12, extraAlong: 10, clampW: splitX, clampH: height, lineWidth: 2.4, arrowSize: 8
    });

    var chordMx = (p0x + px) / 2;
    var chordMy = (p0y + py) / 2;
    if (Math.hypot(chordMx - cx, chordMy - cy) > 22) {
      haloLabel(ctx, 'dr', chordMx, chordMy, { color: MUTED });
    }

    dividerV(ctx, splitX, 8, height - 8);
    panelTitle(ctx, 'Velocity space  (hodograph)', splitX + 14, 8, 'left');

    var hx = splitX + (width - splitX) * 0.50;
    var hy = padT + (height - padT) * 0.52;
    var hodoRoom = Math.min((width - splitX) * 0.32, (height - padT) * 0.30);
    var hodoScale = hodoRoom / Math.max(vMag, 1e-6);
    var vxN = -r * omega * Math.sin(theta);
    var vyN = r * omega * Math.cos(theta);
    var vxP = -r * omega * Math.sin(theta0);
    var vyP = r * omega * Math.cos(theta0);
    var hvx = hx + vxN * hodoScale;
    var hvy = hy + vyN * hodoScale;
    var hvx0 = hx + vxP * hodoScale;
    var hvy0 = hy + vyP * hodoScale;

    ctx.save();
    ctx.fillStyle = 'rgba(93, 184, 166, 0.18)';
    ctx.strokeStyle = 'rgba(93, 184, 166, 0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hvx0, hvy0);
    ctx.lineTo(hvx, hvy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(78, 155, 111, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(hx, hy, vMag * hodoScale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    disk(ctx, hx, hy, 4, MUTED, 'rgba(108, 106, 100, 0.28)');

    ctx.save();
    ctx.strokeStyle = ROSE;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(hvx0, hvy0);
    ctx.lineTo(hvx, hvy);
    ctx.stroke();
    ctx.restore();
    haloLabel(ctx, 'dv', (hvx0 + hvx) / 2, (hvy0 + hvy) / 2, { color: ROSE });

    labeledArrow(ctx, hx, hy, hvx0, hvy0, 'rgba(78, 155, 111, 0.45)', '', {
      along: 0.5, side: 1, pad: 10, clampW: width, clampH: height, lineWidth: 1.6, arrowSize: 6
    });
    labeledArrow(ctx, hx, hy, hvx, hvy, (CV && CV.colors && CV.colors.vecV) || EMERALD, 'v', {
      along: 0.52, side: 1, pad: 12, clampW: width, clampH: height, lineWidth: 2.2, arrowSize: 7
    });

    var aHodoPix = Math.min(34, hodoRoom * 0.38);
    var axN = -r * omega * omega * Math.cos(theta);
    var ayN = -r * omega * omega * Math.sin(theta);
    var aHodoScale = aHodoPix / Math.max(aMag, 1e-6);
    labeledArrow(ctx, hvx, hvy, hvx + axN * aHodoScale, hvy + ayN * aHodoScale, (CV && CV.colors && CV.colors.vecA) || ROSE, 'a', {
      along: 1, side: 1, pad: 11, extraAlong: 10, clampW: width, clampH: height, lineWidth: 2.2, arrowSize: 7
    });

    pushLegend('Centripetal kinematics', [
      { label: '$v = \\omega r$', value: '$' + vMag.toFixed(1) + '$' },
      { label: '$a_c = v^2/r$', value: '$' + aFromV2r.toFixed(1) + '$' },
      { label: '$\\omega^2 r$', value: '$' + aMag.toFixed(1) + '$' },
      { label: '$v\\omega$', value: '$' + aFromVom.toFixed(1) + '$' },
      { label: '$|\\Delta v|/\\Delta t$', value: '$' + aFin.toFixed(1) + '$' },
      { label: '$\\Delta\\theta$', value: '$' + dDeg.toFixed(0) + '^\\circ$' },
      { label: '$\\omega$', value: '$' + omega.toFixed(2) + '$' },
      { label: '$T$', value: '$' + ((2 * Math.PI) / Math.max(omega, 1e-6)).toFixed(2) + '$' }
    ]);
  },

  challenge: {
    question: "A rigid disk of radius $R$ rotates about its central axis with constant angular velocity $\\omega$. Point A is located on the outer rim at distance $R$, and Point B is located at distance $R/2$. What is the ratio of centripetal acceleration $a_A / a_B$?",
    options: [
      "2",
      "4",
      "1/2",
      "1/4"
    ],
    correct: 0,
    explanation: "Because the disk is rigid, all points share the identical angular velocity $\\omega$. Using $a_c = \\omega^2 r$, we have $a_A = \\omega^2 R$ and $a_B = \\omega^2 (R/2)$. Thus, $\\frac{a_A}{a_B} = \\frac{\\omega^2 R}{\\omega^2 (R/2)} = 2$. (GRE Trap Note: If the points had equal linear speeds $v$ instead, the ratio $a = v^2/r$ would be $1/2$!)."
  }
};


})(typeof window !== 'undefined' ? window : globalThis);
