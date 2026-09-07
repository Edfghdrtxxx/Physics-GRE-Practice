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


  PGRE.visualizers['cpgf-1.35'] = {
  id: 'cpgf-1.35',
  topic: 'cm',
  title: 'Conserved Angular Momentum & Kepler’s 2nd Law in Polar Coordinates',
  formulaLatex: 'l = m r^2 \\dot{\\phi} = \\text{constant} \\quad\\iff\\quad \\frac{dA}{dt} = \\frac{1}{2} r^2 \\dot{\\phi} = \\frac{l}{2m}',

  physicalStory: `In any central force field $\\mathbf{F}(\\mathbf{r}) = f(r)\\hat{\\mathbf{r}}$, the line of action passes directly through the origin (force center). Consequently, the net torque vanishes identically: $\\boldsymbol{\\tau} = \\mathbf{r} \\times \\mathbf{F} = \\mathbf{0}$. By Noether's theorem and rotational symmetry, the orbital angular momentum vector $\\mathbf{L} = \\mathbf{r} \\times \\mathbf{p}$ is an invariant of motion, confining the orbit to a fixed 2D plane perpendicular to $\\mathbf{L}$.

In plane polar coordinates $(r, \\phi)$, the angular momentum magnitude is $l = m r^2 \\dot{\\phi}$. Geometrically, the infinitesimal area swept out by the radial position vector in time $dt$ is $dA = \\frac{1}{2} r (r d\\phi) = \\frac{1}{2} r^2 \\dot{\\phi} dt$. The constancy of $l$ guarantees that the areal velocity $dA/dt = l/(2m)$ is strictly constant throughout the entire orbit (Kepler's Second Law). When the orbiting body nears periapsis ($r$ decreases), its angular speed $\\dot{\\phi}$ must drastically surge as $1/r^2$ so that the swept area per second remains impeccably conserved.`,

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
    { id: 'eccentricity', label: 'Eccentricity ($e$)', min: 0.0, max: 0.85, step: 0.05, default: 0.65, unit: '' },
    { id: 'semiMajorAxis', label: 'Semi-major axis ($a$)', min: 100, max: 220, step: 10, default: 160, unit: '' },
    { id: 'mass', label: 'Mass ($m$)', min: 0.5, max: 4.0, step: 0.5, default: 1.0, unit: '' },
    { id: 'sectorDuration', label: 'Sector sweep interval', min: 0.5, max: 2.5, step: 0.25, default: 1.0, unit: 's' },
    { id: 'showVectors', label: 'Show velocity vectors', type: 'toggle', default: true, unit: '' },
    { id: 'simSpeed', label: 'Simulation Speed', min: 0.2, max: 3.0, step: 0.2, default: 1.0, unit: 'x' }
  ],

  init(container, state, redraw) {
    state._time = 0;
    state._trueAnomaly = 0;
    state._sectors = [];
    state._lastSectorTime = 0;
    state._lastSectorPhi = 0;
    state._trail = [];
  },

  draw(ctx, width, height, state, dt) {
    state = state || {};
    var size = canvasSize(width, height);
    width = size.w;
    height = size.h;
    creamFill(ctx, width, height);
    lightGrid(ctx, width, height, 40);

    var e = Math.max(0, Math.min(0.92, numParam(state, 'eccentricity', 0.65)));
    var aPhys = numParam(state, 'semiMajorAxis', 160);
    var m = Math.max(0.05, numParam(state, 'mass', 1.0));
    var sectorDt = Math.max(0.2, numParam(state, 'sectorDuration', 1.0));
    var showVecs = flagParam(state, 'showVectors', true);
    var speed = numParam(state, 'simSpeed', 1.0);
    dt = safeDt(dt);

    var padT = 28;
    var padB = 22;
    var padL = 50;
    var padR = 28;
    var availW = Math.max(80, width - padL - padR);
    var availH = Math.max(80, height - padT - padB);
    var bPhys = aPhys * Math.sqrt(Math.max(0.001, 1 - e * e));
    var aFit = 220;
    var s = Math.min(availW / (2 * aFit), availH / (2 * aFit));
    if (!isFinite(s) || s <= 0) s = 1;
    var planetR = 5.5 + 4.5 * Math.sqrt(m);

    var a = aPhys;
    var b = bPhys;
    var ecx = padL + availW / 2;
    var ecy = padT + availH / 2;
    var cx = ecx + a * e * s;
    var cy = ecy;

    var GM = 120000;
    var p = a * (1 - e * e);
    var h = Math.sqrt(Math.max(1, GM * p));
    var l = m * h;
    var period = (2 * Math.PI * Math.pow(a, 1.5)) / Math.sqrt(GM);

    state._time = (state._time || 0) + dt * speed;
    var nMot = (2 * Math.PI) / Math.max(period, 1e-6);
    var meanAnomaly = (nMot * state._time) % (2 * Math.PI);

    var E_anom = meanAnomaly;
    for (var iter = 0; iter < 10; iter++) {
      var fKep = E_anom - e * Math.sin(E_anom) - meanAnomaly;
      var fprime = 1 - e * Math.cos(E_anom);
      if (Math.abs(fprime) < 1e-10) break;
      E_anom -= fKep / fprime;
      if (!isFinite(E_anom)) { E_anom = meanAnomaly; break; }
    }

    var trueAnomaly = 2 * Math.atan2(
      Math.sqrt(1 + e) * Math.sin(E_anom / 2),
      Math.sqrt(Math.max(0.001, 1 - e)) * Math.cos(E_anom / 2)
    );
    if (trueAnomaly < 0) trueAnomaly += 2 * Math.PI;
    state._trueAnomaly = trueAnomaly;

    var r = p / (1 + e * Math.cos(trueAnomaly));
    var px = cx + r * Math.cos(trueAnomaly) * s;
    var py = cy + r * Math.sin(trueAnomaly) * s;

    var v_phi = h / Math.max(r, 1e-6);
    var v_r = (h / Math.max(p, 1e-6)) * e * Math.sin(trueAnomaly);
    var v_total = Math.hypot(v_r, v_phi);
    var phi_dot = h / (r * r);
    var arealVelocity = 0.5 * r * r * phi_dot;

    if (state._lastEcc !== e || state._lastA !== a) {
      state._sectors = [];
      state._trail = [];
      state._lastSectorTime = state._time;
      state._lastSectorPhi = trueAnomaly;
      state._lastEcc = e;
      state._lastA = a;
    }

    panelTitle(ctx, 'Equal areas in equal times', padL, 8, 'left');

    ctx.save();
    ctx.strokeStyle = (CV && CV.colors && CV.colors.orbit) || 'rgba(204, 120, 92, 0.45)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.ellipse(ecx, ecy, a * s, b * s, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    if (!state._sectors) state._sectors = [];
    if (state._lastSectorTime === undefined) {
      state._lastSectorTime = state._time;
      state._lastSectorPhi = trueAnomaly;
    }

    if (state._time - state._lastSectorTime >= sectorDt) {
      var startP = state._lastSectorPhi;
      var endP = trueAnomaly;
      if (endP < startP) endP += 2 * Math.PI;
      state._sectors.push({
        startPhi: startP,
        endPhi: endP,
        colorIndex: state._sectors.length % 2,
        time: state._time
      });
      state._lastSectorPhi = trueAnomaly;
      state._lastSectorTime = state._time;
      if (state._sectors.length > 8) state._sectors.shift();
    }

    function paintWedge(startPhi, endPhi, fill, stroke) {
      ctx.save();
      ctx.fillStyle = fill;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      var dPhi = endPhi - startPhi;
      var numSteps = 28;
      for (var k = 0; k <= numSteps; k++) {
        var phi_s = startPhi + (dPhi * k) / numSteps;
        var r_s = p / (1 + e * Math.cos(phi_s));
        ctx.lineTo(cx + r_s * Math.cos(phi_s) * s, cy + r_s * Math.sin(phi_s) * s);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    for (var si = 0; si < state._sectors.length; si++) {
      var sec = state._sectors[si];
      if (sec.colorIndex === 0) {
        paintWedge(sec.startPhi, sec.endPhi, (CV && CV.colors && CV.colors.sectorA) || 'rgba(204, 120, 92, 0.22)', 'rgba(204, 120, 92, 0.45)');
      } else {
        paintWedge(sec.startPhi, sec.endPhi, (CV && CV.colors && CV.colors.sectorB) || 'rgba(93, 184, 166, 0.22)', 'rgba(93, 184, 166, 0.45)');
      }
    }

    if (state._lastSectorPhi !== undefined) {
      var currStart = state._lastSectorPhi;
      var currEnd = trueAnomaly;
      if (currEnd < currStart) currEnd += 2 * Math.PI;
      paintWedge(currStart, currEnd, 'rgba(212, 160, 23, 0.18)', 'rgba(212, 160, 23, 0.35)');
    }

    ctx.save();
    ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.18);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ecx - a * s, cy);
    ctx.lineTo(ecx + a * s, cy);
    ctx.stroke();
    ctx.restore();

    var sunR = 12;
    if (CV && CV.drawGlowCircle) {
      CV.drawGlowCircle(ctx, cx, cy, sunR, (CV.colors && CV.colors.sun) || GOLD, (CV.colors && CV.colors.sunGlow) || 'rgba(212, 160, 23, 0.35)', 18);
    } else {
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(cx, cy, sunR, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.save();
    ctx.fillStyle = '#78350f';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('M', cx, cy);
    ctx.restore();

    labeledArrow(ctx, cx, cy, px, py, (CV && CV.colors && CV.colors.vecR) || TEAL, 'r', {
      along: 0.45, side: 1, pad: 14, clampW: width, clampH: height, lineWidth: 2, arrowSize: 7
    });

    if (!state._trail) state._trail = [];
    state._trail.push({ x: px, y: py });
    if (state._trail.length > 60) state._trail.shift();

    ctx.save();
    for (var i = 0; i < state._trail.length - 1; i++) {
      var alpha = (i / state._trail.length) * 0.55;
      ctx.strokeStyle = 'rgba(204, 120, 92, ' + alpha + ')';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(state._trail[i].x, state._trail[i].y);
      ctx.lineTo(state._trail[i + 1].x, state._trail[i + 1].y);
      ctx.stroke();
    }
    ctx.restore();

    if (CV && CV.drawGlowCircle) {
      CV.drawGlowCircle(ctx, px, py, planetR, (CV.colors && CV.colors.particle) || CORAL, (CV.colors && CV.colors.particleGlow) || 'rgba(204, 120, 92, 0.5)', planetR * 2);
    } else {
      ctx.fillStyle = CORAL;
      ctx.beginPath();
      ctx.arc(px, py, planetR, 0, Math.PI * 2);
      ctx.fill();
    }

    if (showVecs) {
      var vPix = 52;
      var vScale = vPix / Math.max(v_total, 1e-6);
      var totVx = v_r * Math.cos(trueAnomaly) + v_phi * (-Math.sin(trueAnomaly));
      var totVy = v_r * Math.sin(trueAnomaly) + v_phi * Math.cos(trueAnomaly);
      labeledArrow(ctx, px, py, px + totVx * vScale, py + totVy * vScale, CORAL, 'v', {
        along: 1, side: 1, pad: 12, extraAlong: 11, clampW: width, clampH: height, lineWidth: 2.4, arrowSize: 8
      });
    }

    var periX = ecx + a * s;
    var apoX = ecx - a * s;
    var periLabelX = periX - Math.max(36, sunR + 20);
    if (periLabelX < cx + sunR + 10) periLabelX = Math.min(periX - 8, cx - sunR - 18);
    periLabelX = Math.max(padL + 8, Math.min(width - padR - 8, periLabelX));
    haloLabel(ctx, 'periapsis', periLabelX, Math.min(height - 14, cy + 22), { color: MUTED });
    haloLabel(ctx, 'apoapsis', apoX + 32, Math.max(18, cy - 22), { color: MUTED });

    pushLegend('Kepler 2nd law', [
      { label: '$m$', value: '$' + m.toFixed(1) + '$' },
      { label: '$l = m r^2 \\dot{\\phi}$', value: '$' + l.toFixed(1) + '$' },
      { label: '$dA/dt = l/(2m)$', value: '$' + arealVelocity.toFixed(1) + '$' },
      { label: '$r$', value: '$' + r.toFixed(1) + '$' },
      { label: '$\\dot{\\phi}$', value: '$' + phi_dot.toFixed(3) + '$' },
      { label: '$v_\\phi$', value: '$' + v_phi.toFixed(1) + '$' },
      { label: '$v_r$', value: '$' + v_r.toFixed(1) + '$' },
      { label: '$|v|$', value: '$' + v_total.toFixed(1) + '$' }
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

  physicalStory: `By virtue of angular momentum conservation $l = m r^2 \\dot{\\phi} = \\text{const}$, the azimuthal coordinate $\\phi$ is cyclic. We can eliminate $\\dot{\\phi} = l / (m r^2)$ from the 2D kinetic energy, mapping the entire 2D orbital motion onto an equivalent 1D radial motion governed by the effective potential $V_{\\text{eff}}(r) = \\frac{l^2}{2mr^2} + U(r)$.

The term $\\frac{l^2}{2mr^2}$ is the fictitious centrifugal barrier, a steeply repulsive $1/r^2$ potential generated by angular momentum that physically prevents the particle from falling into the origin. For Newtonian gravity $U(r) = -k/r$, the combination of the repulsive centrifugal barrier at short range and the attractive gravitational well at long range forms an asymmetric potential well.

The total mechanical energy $E$ determines the orbit geometry. When $E = V_{\\text{eff},\\min}$, the motion is circular at the equilibrium radius $r_0 = l^2/(mk)$ with $\\dot{r} = 0$. When $V_{\\text{eff},\\min} < E < 0$, a bound ellipse oscillates between turning points $r_{\\min}$ and $r_{\\max}$ where $E = V_{\\text{eff}}(r)$. When $E = 0$, the orbit is a parabolic escape with a single turning point ($e = 1$). When $E > 0$, the motion is an unbound hyperbolic scatter ($e > 1$).`,

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
    { id: 'relEnergy', label: 'Energy ($E / |E_{\\min}|$)', min: -1, max: 0.8, step: 0.05, default: -0.6, unit: '' },
    { id: 'angMom', label: 'Angular momentum ($l$)', min: 0.8, max: 2.0, step: 0.1, default: 1.3, unit: '' },
    { id: 'showRadialKinetic', label: 'Show radial kinetic $T_r$', type: 'toggle', default: true, unit: '' },
    { id: 'simSpeed', label: 'Simulation Speed', min: 0.2, max: 3.0, step: 0.2, default: 1.0, unit: 'x' }
  ],

  init(container, state, redraw) {
    state._r = 100;
    state._rdot = 0;
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
    var relE = numParam(state, 'relEnergy', -0.6);
    var speed = numParam(state, 'simSpeed', 1.0);
    var showTr = flagParam(state, 'showRadialKinetic', true);
    dt = safeDt(dt);

    var r0 = (l * l) / (m * k);
    var Emin = -(m * k * k) / (2 * l * l);
    var E = relE * Math.abs(Emin);

    var disc = k * k + (2 * E * l * l) / m;
    var r_min;
    var r_max;
    if (Math.abs(E) < 1e-4) {
      r_min = (l * l) / (2 * m * k);
      r_max = 99999;
    } else if (E < 0) {
      if (disc >= 0) {
        r_min = (k - Math.sqrt(disc)) / (2 * Math.abs(E));
        r_max = (k + Math.sqrt(disc)) / (2 * Math.abs(E));
      } else {
        r_min = r0;
        r_max = r0;
      }
    } else {
      r_min = (Math.sqrt(Math.max(0, disc)) - k) / (2 * E);
      r_max = 99999;
    }
    if (!isFinite(r_min) || r_min < 8) r_min = Math.max(8, r0 * 0.4);
    if (!isFinite(r_max)) r_max = 99999;

    var splitX = Math.round(width * 0.44);
    var padT = 28;
    var ox = splitX * 0.5;
    var oy = padT + (height - padT) * 0.5;
    var orbitRoom = Math.min(splitX * 0.38, (height - padT - 16) * 0.42);
    var rView = (E < 0 && r_max < 800) ? Math.max(r_max, r0) * 1.12 : Math.max(r0 * 2.4, r_min * 2.8, 90);
    var orbitScale = orbitRoom / Math.max(rView, 1);
    var rLeave = (orbitRoom * 1.08) / Math.max(orbitScale, 1e-6);

    var subSteps = 10;
    var simDt = (dt * speed) / subSteps;

    if (!state._r || isNaN(state._r) || state._lastL !== l || Math.abs((state._lastE ?? 0) - E) > 1e-3) {
      state._r = r_min;
      state._rdot = 0;
      state._phi = 0;
      state._orbitTrail = [];
      state._escaped = false;
      state._lastL = l;
      state._lastE = E;
    }

    if (!state._escaped) {
      for (var step = 0; step < subSteps; step++) {
        var r_curr = Math.max(15, state._r);
        var f_eff = (l * l) / (m * r_curr * r_curr * r_curr) - k / (r_curr * r_curr);
        var r_ddot = f_eff / m;
        state._rdot += r_ddot * simDt;
        state._r += state._rdot * simDt;
        if (state._r <= r_min) {
          state._r = r_min;
          if (state._rdot < 0) state._rdot = -state._rdot;
        } else if (E < 0 && state._r >= r_max) {
          state._r = r_max;
          if (state._rdot > 0) state._rdot = -state._rdot;
        }
        var phi_dot = l / (m * state._r * state._r);
        state._phi += phi_dot * simDt;
      }
      if (E >= 0 && state._r > rLeave) {
        state._r = rLeave;
        state._rdot = 0;
        state._escaped = true;
      }
    }

    function toOrbitX(rv, phi) { return ox + rv * Math.cos(phi) * orbitScale; }
    function toOrbitY(rv, phi) { return oy + rv * Math.sin(phi) * orbitScale; }

    dividerV(ctx, splitX, 8, height - 8);
    panelTitle(ctx, 'Orbit in the plane', 14, 8, 'left');
    panelTitle(ctx, 'Radial well', splitX + 14, 8, 'left');

    function dashCircle(radius, color) {
      if (radius < 4) return;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(ox, oy, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (r_min * orbitScale < orbitRoom * 1.05) {
      dashCircle(r_min * orbitScale, 'rgba(224, 86, 102, 0.45)');
    }
    if (r_max < 800 && r_max * orbitScale < orbitRoom * 1.05) {
      dashCircle(r_max * orbitScale, 'rgba(204, 120, 92, 0.45)');
    }
    dashCircle(r0 * orbitScale, 'rgba(78, 155, 111, 0.35)');

    if (CV && CV.drawGlowCircle) {
      CV.drawGlowCircle(ctx, ox, oy, 11, (CV.colors && CV.colors.sun) || GOLD, (CV.colors && CV.colors.sunGlow) || 'rgba(212, 160, 23, 0.35)', 16);
    } else {
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(ox, oy, 11, 0, Math.PI * 2);
      ctx.fill();
    }

    var px = toOrbitX(state._r, state._phi);
    var py = toOrbitY(state._r, state._phi);

    if (!state._orbitTrail) state._orbitTrail = [];
    if (!state._escaped) {
      state._orbitTrail.push({ x: px, y: py });
      if (state._orbitTrail.length > 120) state._orbitTrail.shift();
    }

    ctx.save();
    for (var ti = 0; ti < state._orbitTrail.length - 1; ti++) {
      var ta = (ti / state._orbitTrail.length) * 0.65;
      ctx.strokeStyle = 'rgba(204, 120, 92, ' + ta + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(state._orbitTrail[ti].x, state._orbitTrail[ti].y);
      ctx.lineTo(state._orbitTrail[ti + 1].x, state._orbitTrail[ti + 1].y);
      ctx.stroke();
    }
    ctx.restore();

    if (CV && CV.drawArrow) {
      CV.drawArrow(ctx, ox, oy, px, py, 'rgba(93, 184, 166, 0.7)', '', 1.5, 6);
    }
    if (CV && CV.drawGlowCircle) {
      CV.drawGlowCircle(ctx, px, py, 7, (CV.colors && CV.colors.particle) || CORAL, (CV.colors && CV.colors.particleGlow) || 'rgba(204, 120, 92, 0.5)', 12);
    } else {
      ctx.fillStyle = CORAL;
      ctx.beginPath();
      ctx.arc(px, py, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    var gx0 = splitX + 40;
    var gx1 = width - 18;
    var gy0 = 44;
    var gy1 = height - 26;
    if (gx1 <= gx0 + 40) gx1 = gx0 + 40;
    if (gy1 <= gy0 + 40) gy1 = gy0 + 40;
    var gZeroY = gy0 + (gy1 - gy0) * 0.38;
    var rPlotMax = (E < 0 && r_max < 800) ? Math.max(140, r_max * 1.18) : Math.max(180, r0 * 2.5);
    var rScale = (gx1 - gx0) / rPlotMax;
    var vScale = (gy1 - gZeroY) / (Math.abs(Emin) * 1.55);

    function plotX(rv) { return gx0 + rv * rScale; }
    function plotY(V) { return gZeroY - V * vScale; }

    ctx.save();
    ctx.beginPath();
    ctx.rect(gx0, gy0, gx1 - gx0, gy1 - gy0);
    ctx.clip();

    ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.22);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(gx0, gZeroY);
    ctx.lineTo(gx1, gZeroY);
    ctx.moveTo(gx0, gy0);
    ctx.lineTo(gx0, gy1);
    ctx.stroke();

    function strokeCurve(color, widthPx, dash, fn, dr) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = widthPx;
      ctx.setLineDash(dash || []);
      ctx.beginPath();
      var started = false;
      for (var rv = 18; rv < rPlotMax; rv += dr) {
        var yy = plotY(fn(rv));
        var xx = plotX(rv);
        if (yy < gy0 - 8 || yy > gy1 + 8) {
          started = false;
          continue;
        }
        if (!started) { ctx.moveTo(xx, yy); started = true; }
        else ctx.lineTo(xx, yy);
      }
      ctx.stroke();
      ctx.restore();
    }

    strokeCurve('rgba(212, 160, 23, 0.75)', 1.5, [4, 4], function(rv) {
      return (l * l) / (2 * m * rv * rv);
    }, 2);
    strokeCurve('rgba(204, 120, 92, 0.7)', 1.5, [4, 4], function(rv) {
      return -k / rv;
    }, 2);
    strokeCurve(VIOLET, 2.6, [], function(rv) {
      return (l * l) / (2 * m * rv * rv) - k / rv;
    }, 1.5);

    var plotEY = plotY(E);
    ctx.strokeStyle = (CV && CV.colors && CV.colors.energy) || ROSE;
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(gx0, plotEY);
    ctx.lineTo(gx1, plotEY);
    ctx.stroke();

    var almostCirc = E < 0 && Math.abs(r_max - r_min) < 10;
    if (almostCirc) {
      var t0 = plotX(r0);
      ctx.strokeStyle = 'rgba(78, 155, 111, 0.8)';
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(t0, gy0);
      ctx.lineTo(t0, gy1);
      ctx.stroke();
    } else {
      if (r_min < rPlotMax) {
        var tmin = plotX(r_min);
        ctx.strokeStyle = 'rgba(224, 86, 102, 0.75)';
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(tmin, gy0);
        ctx.lineTo(tmin, gy1);
        ctx.stroke();
      }
      if (r_max < rPlotMax) {
        var tmax = plotX(r_max);
        ctx.strokeStyle = 'rgba(204, 120, 92, 0.75)';
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(tmax, gy0);
        ctx.lineTo(tmax, gy1);
        ctx.stroke();
      }
    }
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
      haloLabel(ctx, 'r_0', plotX(r0), gy1 - 8, { color: EMERALD });
    } else {
      if (r_min < rPlotMax) {
        haloLabel(ctx, 'r_min', plotX(r_min), gy1 - 8, { color: ROSE, align: r_max - r_min < 28 ? 'right' : 'center' });
      }
      if (r_max < rPlotMax) {
        haloLabel(ctx, 'r_max', plotX(r_max), gy1 - 8, { color: CORAL, align: r_max - r_min < 28 ? 'left' : 'center' });
      }
    }

    var currentR = state._r;
    var currentVeff = (l * l) / (2 * m * currentR * currentR) - k / currentR;
    var beadX = plotX(currentR);
    var beadY = plotY(currentVeff);
    beadX = Math.max(gx0 + 4, Math.min(gx1 - 4, beadX));
    beadY = Math.max(gy0 + 4, Math.min(gy1 - 4, beadY));

    if (showTr && !state._escaped && plotEY <= beadY - 2 && beadX > gx0 && beadX < gx1) {
      ctx.save();
      var barH = Math.min(beadY, gy1) - Math.max(plotEY, gy0);
      if (barH > 2) {
        ctx.fillStyle = 'rgba(78, 155, 111, 0.28)';
        ctx.fillRect(beadX - 4, Math.max(plotEY, gy0), 8, barH);
        ctx.strokeStyle = EMERALD;
        ctx.lineWidth = 1.2;
        ctx.strokeRect(beadX - 4, Math.max(plotEY, gy0), 8, barH);
      }
      ctx.restore();
    }

    if (CV && CV.drawGlowCircle) {
      CV.drawGlowCircle(ctx, beadX, beadY, 7, VIOLET, 'rgba(157, 124, 216, 0.45)', 12);
    } else {
      ctx.fillStyle = VIOLET;
      ctx.beginPath();
      ctx.arc(beadX, beadY, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    var orbitKind = almostCirc
      ? 'circular'
      : (E < 0
        ? 'bound ellipse'
        : (Math.abs(E) < 1e-4 ? 'parabolic escape' : 'hyperbolic scatter'));
    if (state._escaped) orbitKind += ' (frozen at view edge)';
    var Tr = state._escaped ? 0 : Math.max(0, E - currentVeff);
    pushLegend('Effective potential', [
      { label: '$E$', value: '$' + E.toFixed(1) + '$' },
      { label: '$E_{\\min}$', value: '$' + Emin.toFixed(1) + '$' },
      { label: '$E / |E_{\\min}|$', value: '$' + (Math.abs(Emin) > 1e-9 ? (E / Math.abs(Emin)).toFixed(2) : '0') + '$' },
      { label: 'Orbit', value: orbitKind },
      { label: '$r$', value: '$' + currentR.toFixed(1) + '$' },
      { label: '$r_0$', value: '$' + r0.toFixed(1) + '$' },
      { label: '$T_r$', value: '$' + Tr.toFixed(1) + '$' },
      { label: 'Curves', value: '$l^2/(2mr^2)$, $-k/r$, $V_{\\mathrm{eff}}$' }
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

  physicalStory: `Even when an object moves with uniform speed $v$ around a circular path of radius $r$, it is accelerating because its velocity vector $\\mathbf{v}$ continuously rotates in direction. The rate of change of the direction of $\\mathbf{v}$ produces a centripetal acceleration vector $\\mathbf{a}_c$ that points strictly perpendicular to $\\mathbf{v}$, oriented inward toward the instantaneous center of curvature.

Geometrically, consider an infinitesimal time $dt$: the position vector rotates through angle $d\\theta = \\omega dt = (v/r) dt$. The velocity vector rotates by the identical angle $d\\theta$, creating a difference vector $|\\Delta\\mathbf{v}| = v d\\theta = v (v/r) dt = (v^2/r) dt$. Dividing by $dt$ yields the centripetal acceleration $a_c = v^2/r$.

In the velocity hodograph (the locus of velocity vectors plotted from a common origin), the tip of $\\mathbf{v}(t)$ traces out a circle of radius $v$ with angular speed $\\omega$. The velocity of the velocity vector is the acceleration vector $\\mathbf{a} = d\\mathbf{v}/dt = \\omega v = v^2/r$.`,

  derivationSteps: [
    "1. Parametric position vector: $\\mathbf{r}(t) = r\\cos(\\omega t)\\hat{\\mathbf{i}} + r\\sin(\\omega t)\\hat{\\mathbf{j}} = r\\hat{\\mathbf{r}}$.",
    "2. Tangential velocity vector: $\\mathbf{v}(t) = \\frac{d\\mathbf{r}}{dt} = -r\\omega\\sin(\\omega t)\\hat{\\mathbf{i}} + r\\omega\\cos(\\omega t)\\hat{\\mathbf{j}} = r\\omega\\hat{\\boldsymbol{\\theta}}$.",
    "3. Acceleration vector: $\\mathbf{a}(t) = \\frac{d\\mathbf{v}}{dt} = -r\\omega^2\\cos(\\omega t)\\hat{\\mathbf{i}} - r\\omega^2\\sin(\\omega t)\\hat{\\mathbf{j}} = -\\omega^2\\mathbf{r}(t) = -\\omega^2 r \\hat{\\mathbf{r}}$.",
    "4. Hodograph geometric proof: Triangle $(\\mathbf{r}, \\mathbf{r}+\\Delta\\mathbf{r}, \\Delta\\mathbf{r})$ is similar to velocity triangle $(\\mathbf{v}, \\mathbf{v}+\\Delta\\mathbf{v}, \\Delta\\mathbf{v})$.",
    "5. Ratio of sides: $\\frac{|\\Delta\\mathbf{v}|}{v} = \\frac{|\\Delta\\mathbf{r}|}{r} = \\frac{v\\Delta t}{r} \\implies \\frac{|\\Delta\\mathbf{v}|}{\\Delta t} = \\frac{v^2}{r}$.",
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
    { id: 'showHodograph', label: 'Show velocity-space hodograph', type: 'toggle', default: true, unit: '' },
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
    var showHodo = flagParam(state, 'showHodograph', true);
    var speed = numParam(state, 'simSpeed', 1.0);
    dt = safeDt(dt);

    state._theta = (state._theta || 0) + omega * dt * speed;
    var theta = state._theta;

    var padT = 28;
    var splitX = showHodo ? Math.round(width * 0.55) : width;
    var leftW = splitX;
    var cx = leftW * 0.5;
    var cy = padT + (height - padT) * 0.52;
    var rFit = Math.min(leftW * 0.34, (height - padT) * 0.34);
    var fit = rFit / Math.max(r, 1);
    if (!isFinite(fit) || fit <= 0) fit = 1;
    var rDraw = r * fit;

    var px = cx + rDraw * Math.cos(theta);
    var py = cy + rDraw * Math.sin(theta);
    var vxDraw = -rDraw * omega * Math.sin(theta);
    var vyDraw = rDraw * omega * Math.cos(theta);
    var axDraw = -rDraw * omega * omega * Math.cos(theta);
    var ayDraw = -rDraw * omega * omega * Math.sin(theta);
    var v_mag = omega * r;
    var a_mag = omega * omega * r;
    var a_from_v2r = (v_mag * v_mag) / Math.max(r, 1e-6);
    var a_from_vom = v_mag * omega;

    ctx.save();
    ctx.strokeStyle = (CV && CV.colors && CV.colors.orbit) || 'rgba(204, 120, 92, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, rDraw, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    panelTitle(ctx, 'Position space', 14, 8, 'left');

    if (CV && CV.drawGlowCircle) {
      CV.drawGlowCircle(ctx, cx, cy, 5, MUTED, 'rgba(108, 106, 100, 0.35)', 8);
    } else {
      ctx.fillStyle = MUTED;
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    var vPix = Math.min(42, rDraw * 0.42);
    var aPix = Math.min(38, rDraw * 0.38);
    var vDrawMag = Math.max(Math.hypot(vxDraw, vyDraw), 1e-6);
    var aDrawMag = Math.max(Math.hypot(axDraw, ayDraw), 1e-6);
    var vScalePos = vPix / vDrawMag;
    var aScalePos = aPix / aDrawMag;

    labeledArrow(ctx, cx, cy, px, py, (CV && CV.colors && CV.colors.vecR) || TEAL, 'r', {
      along: 0.32, side: 1, pad: 14, clampW: splitX, clampH: height, lineWidth: 2, arrowSize: 7
    });
    if (CV && CV.drawGlowCircle) {
      CV.drawGlowCircle(ctx, px, py, 8, (CV.colors && CV.colors.particle) || CORAL, (CV.colors && CV.colors.particleGlow) || 'rgba(204, 120, 92, 0.5)', 14);
    } else {
      ctx.fillStyle = CORAL;
      ctx.beginPath();
      ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    labeledArrow(ctx, px, py, px + vxDraw * vScalePos, py + vyDraw * vScalePos, (CV && CV.colors && CV.colors.vecV) || EMERALD, 'v', {
      along: 1, side: 1, pad: 11, extraAlong: 10, clampW: splitX, clampH: height, lineWidth: 2.4, arrowSize: 8
    });
    labeledArrow(ctx, px, py, px + axDraw * aScalePos, py + ayDraw * aScalePos, (CV && CV.colors && CV.colors.vecA) || ROSE, 'a', {
      along: 1, side: -1, pad: 12, extraAlong: 10, clampW: splitX, clampH: height, lineWidth: 2.6, arrowSize: 8
    });

    if (showHodo) {
      dividerV(ctx, splitX, 8, height - 8);
      panelTitle(ctx, 'Velocity space  (hodograph)', splitX + 14, 8, 'left');

      var hx = splitX + (width - splitX) * 0.5;
      var hy = padT + (height - padT) * 0.50;
      var hodoRoom = Math.min((width - splitX) * 0.32, (height - padT) * 0.30);
      var vHodo = omega * r;
      var hodoScale = hodoRoom / Math.max(vHodo, 1e-6);
      var vx = -r * omega * Math.sin(theta);
      var vy = r * omega * Math.cos(theta);
      var ax = -r * omega * omega * Math.cos(theta);
      var ay = -r * omega * omega * Math.sin(theta);

      ctx.save();
      ctx.strokeStyle = 'rgba(78, 155, 111, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.arc(hx, hy, vHodo * hodoScale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      if (CV && CV.drawGlowCircle) {
        CV.drawGlowCircle(ctx, hx, hy, 4, MUTED, 'rgba(108, 106, 100, 0.3)', 6);
      }

      var hvx = hx + vx * hodoScale;
      var hvy = hy + vy * hodoScale;
      var aHodoPix = Math.min(34, hodoRoom * 0.38);
      var aHodoScale = aHodoPix / Math.max(a_mag, 1e-6);
      labeledArrow(ctx, hx, hy, hvx, hvy, (CV && CV.colors && CV.colors.vecV) || EMERALD, 'v', {
        along: 0.5, side: 1, pad: 12, clampW: width, clampH: height, lineWidth: 2, arrowSize: 7
      });
      labeledArrow(ctx, hvx, hvy, hvx + ax * aHodoScale, hvy + ay * aHodoScale, (CV && CV.colors && CV.colors.vecA) || ROSE, 'a', {
        along: 1, side: 1, pad: 11, extraAlong: 10, clampW: width, clampH: height, lineWidth: 2.2, arrowSize: 7
      });
    }

    pushLegend('Centripetal kinematics', [
      { label: '$v = \\omega r$', value: '$' + v_mag.toFixed(1) + '$' },
      { label: '$a_c = v^2/r$', value: '$' + a_from_v2r.toFixed(1) + '$' },
      { label: '$\\omega^2 r$', value: '$' + a_mag.toFixed(1) + '$' },
      { label: '$v\\omega$', value: '$' + a_from_vom.toFixed(1) + '$' },
      { label: '$\\omega$', value: '$' + omega.toFixed(2) + '$' },
      { label: '$r$', value: '$' + r.toFixed(0) + '$' },
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
