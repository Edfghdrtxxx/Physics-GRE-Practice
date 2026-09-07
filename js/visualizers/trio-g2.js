/* Formula visualizers — G2 centripetal force / Coriolis / rotational Newton */
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

  var C = {
    bg: '#faf9f5',
    ink: '#141413',
    muted: '#6c6a64',
    coral: '#cc785c',
    gold: '#d4a017',
    teal: '#5db8a6',
    rose: '#e05666',
    emerald: '#4e9b6f',
    violet: '#9d7cd8',
    line: '#e6dfd8',
    panel: '#f5f0e8',
    ivory: '#efe9de'
  };

  function syncStageTheme() {
    var t = PGRE.vizStageTheme ? PGRE.vizStageTheme() : null;
    if (!t) return;
    C.bg = t.bg; C.ink = t.ink; C.muted = t.muted; C.line = t.line; C.panel = t.panel; C.ivory = t.ivory;
  }

  function creamFill(ctx, width, height) {
    syncStageTheme();
    ctx.fillStyle = (CV && CV.colors && CV.colors.bg) ? CV.colors.bg : C.bg;
    ctx.fillRect(0, 0, width, height);
  }

  function lightGrid(ctx, width, height, step) {
    step = step || 40;
    ctx.save();
    ctx.strokeStyle = (CV && CV.colors && CV.colors.grid) ? CV.colors.grid : PGRE.vizStageTheme().inkFade(0.06);
    ctx.lineWidth = 1;
    ctx.beginPath();
    var x, y;
    for (x = 0; x <= width; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
    for (y = 0; y <= height; y += step) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
    ctx.stroke();
    ctx.restore();
  }

  function isOn(val, fallback) {
    if (val === undefined || val === null || val === '') return !!fallback;
    if (val === true || val === 1 || val === '1' || val === 'true' || val === 'on') return true;
    if (val === false || val === 0 || val === '0' || val === 'false' || val === 'off') return false;
    return Boolean(val);
  }

  function stepDt(dt) {
    if (dt == null || isNaN(dt)) return 0;
    if (dt > 0.1) return 0.1;
    if (dt < 0) return 0;
    return dt;
  }

  function legend(title, rows) {
    if (PGRE.appendVizLegend) PGRE.appendVizLegend(title, rows || []);
  }

  function pill(ctx, text, x, y, color, align, bounds) {
    if (!text) return;
    ctx.save();
    ctx.font = '600 11px Inter, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    var w = ctx.measureText(text).width;
    var pad = 5;
    var lx = x;
    if (align === 'center') lx = x - w / 2;
    else if (align === 'right') lx = x - w;
    var ly = y;
    var b = bounds || null;
    if (b) {
      if (lx < b.x + 4) lx = b.x + 4;
      if (lx + w + pad * 2 > b.x + b.w - 4) lx = b.x + b.w - w - pad * 2 - 4;
      if (ly < b.y + 10) ly = b.y + 10;
      if (ly > b.y + b.h - 10) ly = b.y + b.h - 10;
    }
    ctx.fillStyle = PGRE.vizStageTheme().chipFade(0.94);
    ctx.fillRect(lx - pad, ly - 8, w + pad * 2, 16);
    ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.10);
    ctx.lineWidth = 1;
    ctx.strokeRect(lx - pad, ly - 8, w + pad * 2, 16);
    ctx.fillStyle = color || C.ink;
    ctx.fillText(text, lx, ly);
    ctx.restore();
  }

  function arrow(ctx, x1, y1, x2, y2, color, lw) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    var len = Math.hypot(dx, dy);
    if (len < 2) return;
    var ang = Math.atan2(dy, dx);
    var head = Math.min(10, len * 0.35);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lw || 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(ang - Math.PI / 6), y2 - head * Math.sin(ang - Math.PI / 6));
    ctx.lineTo(x2 - head * Math.cos(ang + Math.PI / 6), y2 - head * Math.sin(ang + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function disc(ctx, x, y, r, fill, stroke) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1, r), 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  function captionBand(ctx, text, width, y, color) {
    ctx.save();
    ctx.font = '600 12px Inter, -apple-system, sans-serif';
    ctx.fillStyle = color || C.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, y);
    ctx.restore();
  }

  function chipSize(text) {
    return { w: String(text || '').length * 6.8 + 12, h: 16 };
  }

  function chipsOverlap(a, b) {
    if (!a || !b) return false;
    var sa = chipSize(a.text);
    var sb = chipSize(b.text);
    var dx = Math.abs(a.x - b.x);
    var dy = Math.abs(a.y - b.y);
    var tipDist = Math.hypot(a.x - b.x, a.y - b.y);
    return tipDist < 28 || (dx < (sa.w + sb.w) / 2 + 3 && dy < (sa.h + sb.h) / 2 + 3);
  }

  function pushShorterChip(a, b) {
    var shorter = a.len <= b.len ? a : b;
    var other = shorter === a ? b : a;
    var px = -shorter.dy;
    var py = shorter.dx;
    var n = Math.hypot(px, py) || 1;
    px /= n;
    py /= n;
    if (px * (shorter.x - other.x) + py * (shorter.y - other.y) < 0) {
      px = -px;
      py = -py;
    }
    var k;
    for (k = 0; k < 10 && chipsOverlap(a, b); k++) {
      shorter.x += px * 6;
      shorter.y += py * 6;
    }
    var dist = Math.hypot(a.x - b.x, a.y - b.y);
    if (dist < 28 && dist > 1e-6) {
      var extra = (28 - dist) / dist;
      shorter.x += (shorter.x - other.x) * extra;
      shorter.y += (shorter.y - other.y) * extra;
    }
  }


  PGRE.visualizers['cpgf-1.4'] = {
  id: 'cpgf-1.4',
  topic: 'cm',
  title: 'Centripetal Force & Newton’s 1st Law Tangential Fly-Off',
  formulaLatex: 'F_c = \\frac{m v^2}{r} = m \\omega^2 r',

  physicalStory: `Centripetal force is **not** a distinct physical interaction like gravity or electromagnetism; it is the net radial inward force required by Newton's second law $\\sum \\mathbf{F} = m\\mathbf{a}$ to constrain a mass $m$ to a curved path of radius $r$ at speed $v$. Real physical forces—such as string tension $T$, static friction $f_s$, normal force $N$, or gravity $F_g$—must provide this required inward pull.

If the net radial force suddenly ceases (for example, if a whirling tether snaps or friction vanishes on ice), $\\mathbf{F}_{\\text{net}} = \\mathbf{0}$. By Newton's First Law (Inertia), the body immediately ceases all curved motion and flies off in a straight line with constant velocity $\\mathbf{v}$ tangent to the circle at the exact release point. It never flies radially outward.`,

  derivationSteps: [
    "1. Kinematic radial acceleration requirement: $\\mathbf{a}_c = -\\frac{v^2}{r}\\hat{\\mathbf{r}}$.",
    "2. Newton's Second Law: $\\sum \\mathbf{F}_{\\text{net}} = m \\mathbf{a}_c$.",
    "3. Centripetal Force Magnitude: $F_c = m a_c = \\frac{m v^2}{r} = m \\omega^2 r$.",
    "4. Banked Turn without friction: $N\\sin\\theta = \\frac{mv^2}{r}$ and $N\\cos\\theta = mg \\implies \\tan\\theta = \\frac{v^2}{rg}$.",
    "5. Vertical Loop at top: $T_{\\text{top}} + mg = \\frac{mv^2}{r} \\implies v_{\\text{crit}} = \\sqrt{gr}$ for non-slack string ($T \\ge 0$).",
    "6. String Snap / Sudden Release: When $T = 0$, $\\mathbf{F}_{\\text{net}} = 0 \\implies \\mathbf{a} = 0 \\implies \\mathbf{r}(t) = \\mathbf{r}(t_0) + \\mathbf{v}(t_0)(t-t_0)$ (inertial tangent path)."
  ],

  limitingCases: [
    "String Snap / Zero Force ($F \\to 0$): Particle moves tangentially in a straight line at constant speed; radius diverges as $r(t) = \\sqrt{r_0^2 + v_0^2 t^2}$.",
    "Flat Road Maximum Speed: Static friction $f_s \\le \\mu_s mg = \\frac{mv^2}{r} \\implies v_{\\max} = \\sqrt{\\mu_s g r}$.",
    "Tension Difference in Vertical Circle: $T_{\\text{bottom}} - T_{\\text{top}} = 6mg$, strictly independent of radius $r$ or initial speed.",
    "Zero Radius or Infinite Mass: $F_c \\to \\infty$, proving it is impossible to sharply bend the trajectory of an ultra-massive object instantaneously."
  ],

  greTraps: [
    "TRAP 1: NEVER draw 'Centripetal Force' as a separate vector on a Free Body Diagram (FBD)! Centripetal force is the vector RESULTANT of actual forces (tension, normal, gravity, friction), not an applied force itself.",
    "TRAP 2: Believing a cut tether makes the mass fly 'radially outward'. It moves strictly along the instantaneous TANGENT velocity vector $\\mathbf{v}$.",
    "TRAP 3: Conical Pendulum tension: $T\\cos\\theta = mg$ and $T\\sin\\theta = m\\omega^2 (L\\sin\\theta) \\implies T = mg/\\cos\\theta > mg$."
  ],

  parameters: [
    { id: 'mass', label: 'Mass ($m$)', min: 0.5, max: 5.0, step: 0.5, default: 2.0, unit: 'kg' },
    { id: 'speed', label: 'Linear Speed ($v$)', min: 30, max: 120, step: 10, default: 70, unit: 'px/s' },
    { id: 'radius', label: 'Radius ($r$)', min: 60, max: 160, step: 10, default: 110, unit: 'px' },
    { id: 'cutString', label: 'Cut Tether (Inertial Fly-Off)', type: 'toggle', default: false, unit: '' },
    { id: 'simSpeed', label: 'Simulation Speed', min: 0.2, max: 3.0, step: 0.2, default: 1.0, unit: 'x' }
  ],

  init: function (container, state, redraw) {
    state._theta = 0;
    state._snapped = false;
    state._snapPos = null;
    state._snapVel = null;
    state._freePos = null;
    state._flyTrail = [];
  },

  draw: function (ctx, width, height, state, dt) {
    creamFill(ctx, width, height);
    lightGrid(ctx, width, height, 40);
    dt = stepDt(dt);
    state = state || {};

    var m = parseFloat(state.mass);
    if (isNaN(m)) m = 2.0;
    var v = parseFloat(state.speed);
    if (isNaN(v)) v = 70;
    var r = parseFloat(state.radius);
    if (isNaN(r)) r = 110;
    var isCut = isOn(state.cutString, false);
    var simSpeed = parseFloat(state.simSpeed);
    if (isNaN(simSpeed)) simSpeed = 1.0;

    var topBand = 28;
    var botBand = 8;
    var cx = width * 0.5;
    var cy = topBand + (height - topBand - botBand) * 0.5;
    var rDraw = Math.min(r, cx - 36, cy - topBand - 18, height - botBand - cy - 36);
    rDraw = Math.max(48, rDraw);
    var omega = v / Math.max(r, 1);
    var Fc = (m * v * v) / Math.max(r, 1);
    var vDraw = v * (rDraw / Math.max(r, 1));
    var massR = Math.max(6, Math.min(18, 5.5 + 2.6 * m));
    var fcFrac = Fc / (Fc + 80);
    var tLen = 16 + (rDraw * 0.58 - 16) * fcFrac;
    var tetherW = 1.6 + 2.4 * fcFrac;

    if (isCut && !state._snapped) {
      state._snapped = true;
      var curTheta = state._theta || 0;
      state._snapPos = { x: cx + rDraw * Math.cos(curTheta), y: cy + rDraw * Math.sin(curTheta) };
      state._snapVel = { x: -vDraw * Math.sin(curTheta), y: vDraw * Math.cos(curTheta) };
      state._freePos = { x: state._snapPos.x, y: state._snapPos.y };
      state._flyTrail = [];
    } else if (!isCut && state._snapped) {
      state._snapped = false;
      state._snapPos = null;
      state._snapVel = null;
      state._freePos = null;
      state._flyTrail = [];
    }

    var bounds = { x: 8, y: topBand, w: width - 16, h: height - topBand - botBand };

    captionBand(
      ctx,
      isCut ? 'Tether cut: Newton I — constant velocity along the tangent, never radially out' : 'F_c is the net inward force (do not draw it as a separate FBD arrow)',
      width,
      14,
      C.ink
    );

    if (!state._snapped) {
      state._theta = (state._theta || 0) + omega * dt * simSpeed;
      var theta = state._theta;
      var px = cx + rDraw * Math.cos(theta);
      var py = cy + rDraw * Math.sin(theta);
      var vx = -v * Math.sin(theta);
      var vy = v * Math.cos(theta);

      ctx.save();
      ctx.strokeStyle = C.coral;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(cx, cy, rDraw, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = C.muted;
      ctx.lineWidth = tetherW;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(px, py);
      ctx.stroke();
      ctx.restore();

      disc(ctx, cx, cy, 6, C.ink, C.gold);

      var uxIn = (cx - px) / Math.max(rDraw, 1);
      var uyIn = (cy - py) / Math.max(rDraw, 1);
      var tx = px + uxIn * tLen;
      var ty = py + uyIn * tLen;
      arrow(ctx, px, py, tx, ty, C.rose, 2.8);
      pill(ctx, 'T = F_c', (px + tx) / 2, (py + ty) / 2, C.rose, 'center', bounds);

      var vMag = Math.hypot(vx, vy) || 1;
      var vLen = Math.min(44, rDraw * 0.32);
      var vxe = px + (vx / vMag) * vLen;
      var vye = py + (vy / vMag) * vLen;
      arrow(ctx, px, py, vxe, vye, C.emerald, 2.4);
      pill(ctx, 'v', vxe, vye, C.emerald, 'center', bounds);

      disc(ctx, px, py, massR, C.coral, C.ink);
    } else if (state._snapPos && state._snapVel && state._freePos) {
      var step = dt * simSpeed;
      state._freePos.x += state._snapVel.x * step;
      state._freePos.y += state._snapVel.y * step;

      if (state._freePos.x < -60 || state._freePos.x > width + 60 || state._freePos.y < -60 || state._freePos.y > height + 60) {
        state._freePos = { x: state._snapPos.x, y: state._snapPos.y };
        state._flyTrail = [];
      }

      if (!state._flyTrail) state._flyTrail = [];
      state._flyTrail.push({ x: state._freePos.x, y: state._freePos.y });
      if (state._flyTrail.length > 80) state._flyTrail.shift();

      ctx.save();
      ctx.strokeStyle = C.muted;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, rDraw, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = C.rose;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + (state._snapPos.x - cx) * 0.28, cy + (state._snapPos.y - cy) * 0.28);
      ctx.stroke();
      ctx.restore();

      var tdx = state._snapVel.x;
      var tdy = state._snapVel.y;
      ctx.save();
      ctx.strokeStyle = C.teal;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(state._snapPos.x - tdx * 1.2, state._snapPos.y - tdy * 1.2);
      ctx.lineTo(state._snapPos.x + tdx * 8, state._snapPos.y + tdy * 8);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      var i;
      for (i = 0; i < state._flyTrail.length - 1; i++) {
        var alpha = (i / state._flyTrail.length) * 0.85;
        ctx.strokeStyle = 'rgba(93, 184, 166, ' + alpha + ')';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(state._flyTrail[i].x, state._flyTrail[i].y);
        ctx.lineTo(state._flyTrail[i + 1].x, state._flyTrail[i + 1].y);
        ctx.stroke();
      }
      ctx.restore();

      disc(ctx, cx, cy, 6, C.ink, C.gold);
      disc(ctx, state._snapPos.x, state._snapPos.y, 4, C.rose, C.ink);
      pill(ctx, 'release', state._snapPos.x + 10, state._snapPos.y - 12, C.rose, 'left', bounds);

      disc(ctx, state._freePos.x, state._freePos.y, massR, C.teal, C.ink);
      var sMag = Math.hypot(state._snapVel.x, state._snapVel.y) || 1;
      var sLen = 40;
      var sxe = state._freePos.x + (state._snapVel.x / sMag) * sLen;
      var sye = state._freePos.y + (state._snapVel.y / sMag) * sLen;
      arrow(ctx, state._freePos.x, state._freePos.y, sxe, sye, C.emerald, 2.4);
      pill(ctx, 'v const', sxe, sye, C.emerald, 'center', bounds);
    }

    var legendRows;
    if (isCut) {
      legendRows = [
        { label: '$F_{\\mathrm{net}}$', value: '$0$' },
        { label: '$T$', value: '$0$ (cut)' },
        { label: '$m$', value: '$' + m.toFixed(1) + '\\,\\mathrm{kg}$' },
        { label: '$v$', value: '$' + v.toFixed(0) + '\\,\\mathrm{px/s}$' },
        { label: '$r$', value: '$' + r.toFixed(0) + '\\,\\mathrm{px}$' },
        { label: '$K = \\frac{1}{2} mv^2$', value: '$' + (0.5 * m * v * v).toFixed(1) + '$' },
        { label: 'Path', value: 'tangent fly-off' }
      ];
    } else {
      legendRows = [
        { label: '$F_c = mv^2/r$', value: '$' + Fc.toFixed(1) + '$' },
        { label: '$m$', value: '$' + m.toFixed(1) + '\\,\\mathrm{kg}$' },
        { label: '$v$', value: '$' + v.toFixed(0) + '\\,\\mathrm{px/s}$' },
        { label: '$r$', value: '$' + r.toFixed(0) + '\\,\\mathrm{px}$' },
        { label: '$K = \\frac{1}{2} mv^2$', value: '$' + (0.5 * m * v * v).toFixed(1) + '$' },
        { label: 'Work by $F_c$', value: '$0$ ($F \\perp v$)' },
        { label: 'Path', value: 'uniform circle' }
      ];
    }
    legend('Centripetal dynamics', legendRows);
  },

  challenge: {
    question: "A mass $m$ attached to a string of length $L$ swings in a vertical circle under uniform gravity $g$. What is the difference in string tension between the lowest point and highest point of the trajectory ($T_{\\text{bottom}} - T_{\\text{top}}$)?",
    options: [
      "6 mg",
      "4 mg",
      "2 mg",
      "0 (equal by conservation of energy)"
    ],
    correct: 0,
    explanation: "At the top: $T_{\\text{top}} + mg = \\frac{m v_{\\text{top}}^2}{L} \\implies T_{\\text{top}} = \\frac{m v_{\\text{top}}^2}{L} - mg$. At the bottom: $T_{\\text{bottom}} - mg = \\frac{m v_{\\text{bottom}}^2}{L} \\implies T_{\\text{bottom}} = \\frac{m v_{\\text{bottom}}^2}{L} + mg$. By conservation of energy between top and bottom: $\\frac{1}{2}m v_{\\text{bottom}}^2 = \\frac{1}{2}m v_{\\text{top}}^2 + mg(2L) \\implies \\frac{m v_{\\text{bottom}}^2}{L} = \\frac{m v_{\\text{top}}^2}{L} + 4mg$. Substituting this into the tension difference gives: $T_{\\text{bottom}} - T_{\\text{top}} = \\left(\\frac{m v_{\\text{top}}^2}{L} + 4mg + mg\\right) - \\left(\\frac{m v_{\\text{top}}^2}{L} - mg\\right) = 6mg$."
  }
};

  PGRE.visualizers['cpgf-1.22'] = {
  id: 'cpgf-1.22',
  topic: 'cm',
  title: 'Coriolis Fictitious Force: Inertial vs Rotating Turntable Frame',
  formulaLatex: '\\mathbf{F}_{\\text{Coriolis}} = -2m (\\mathbf{\\Omega} \\times \\mathbf{v}_{\\text{rot}})',

  physicalStory: `In an accelerating or rotating reference frame with angular velocity $\\mathbf{\\Omega}$, Newton's laws do not hold directly unless fictitious inertial forces are included. For a frame rotating at constant $\\mathbf{\\Omega}$, two distinct fictitious forces emerge:
1. The **Centrifugal Force** $\\mathbf{F}_{\\text{cent}} = -m\\mathbf{\\Omega}\\times(\\mathbf{\\Omega}\\times\\mathbf{r}) = m\\Omega^2\\mathbf{r}_\\perp$ (purely position-dependent, directed outward).
2. The **Coriolis Force** $\\mathbf{F}_{\\text{Coriolis}} = -2m(\\mathbf{\\Omega}\\times\\mathbf{v}_{\\text{rot}})$ (strictly velocity-dependent, acting perpendicular to $\\mathbf{v}_{\\text{rot}}$ and $\\mathbf{\\Omega}$).

In the **Inertial Frame**, a frictionless puck launched across a rotating turntable moves in a crystal-clear **straight line** at constant speed (Newton's 1st Law).
In the **Rotating Frame** (where the turntable appears stationary), the exact same physical trajectory appears dramatically curved, deflected sideways by the Coriolis force. In a counter-clockwise rotating frame ($\mathbf{\\Omega} > 0$), the deflection is always to the **right** of the direction of relative motion.`,

  derivationSteps: [
    "1. Frame transformation for time derivatives: $\\left(\\frac{d\\mathbf{A}}{dt}\\right)_{\\text{inertial}} = \\left(\\frac{d\\mathbf{A}}{dt}\\right)_{\\text{rot}} + \\mathbf{\\Omega} \\times \\mathbf{A}$.",
    "2. Velocity transformation: $\\mathbf{v}_{\\text{inertial}} = \\mathbf{v}_{\\text{rot}} + \\mathbf{\\Omega} \\times \\mathbf{r}$.",
    "3. Acceleration transformation: $\\mathbf{a}_{\\text{inertial}} = \\left(\\frac{d}{dt}\\right)_{\\text{inertial}}(\\mathbf{v}_{\\text{rot}} + \\mathbf{\\Omega}\\times\\mathbf{r}) = \\mathbf{a}_{\\text{rot}} + 2(\\mathbf{\\Omega}\\times\\mathbf{v}_{\\text{rot}}) + \\mathbf{\\Omega}\\times(\\mathbf{\\Omega}\\times\\mathbf{r})$.",
    "4. Newton's 2nd Law in rotating frame: $m\\mathbf{a}_{\\text{rot}} = \\mathbf{F}_{\\text{real}} - 2m(\\mathbf{\\Omega}\\times\\mathbf{v}_{\\text{rot}}) - m\\mathbf{\\Omega}\\times(\\mathbf{\\Omega}\\times\\mathbf{r})$.",
    "5. Coriolis Force definition: $\\mathbf{F}_{\\text{Coriolis}} \\equiv -2m(\\mathbf{\\Omega}\\times\\mathbf{v}_{\\text{rot}})$.",
    "6. Work & Energy: $\\mathbf{F}_{\\text{Coriolis}} \\cdot \\mathbf{v}_{\\text{rot}} = -2m(\\mathbf{\\Omega}\\times\\mathbf{v}_{\\text{rot}})\\cdot\\mathbf{v}_{\\text{rot}} \\equiv 0$. The Coriolis force does strictly ZERO WORK."
  ],

  limitingCases: [
    "Stationary body in rotating frame ($\\mathbf{v}_{\\text{rot}} = \\mathbf{0}$): $\\mathbf{F}_{\\text{Coriolis}} = \\mathbf{0}$, only centrifugal force acts.",
    "Motion parallel to rotation axis ($\\mathbf{v}_{\\text{rot}} \\parallel \\mathbf{\\Omega}$): $\\mathbf{\\Omega} \\times \\mathbf{v}_{\\text{rot}} = \\mathbf{0} \\implies \\mathbf{F}_{\\text{Coriolis}} = \\mathbf{0}$.",
    "Pure radial launch $\\mathbf{v}_{\\text{rot}} = v_r\\hat{\\mathbf{r}}$ with $\\mathbf{\\Omega} = \\Omega\\hat{\\mathbf{z}}$: $\\mathbf{F}_{\\text{Cor}} = -2m\\Omega v_r \\hat{\\boldsymbol{\\phi}}$ (deflects purely azimuthally).",
    "Pure azimuthal motion $\\mathbf{v}_{\\text{rot}} = v_\\phi\\hat{\\boldsymbol{\\phi}}$: $\\mathbf{F}_{\\text{Cor}} = +2m\\Omega v_\\phi \\hat{\\mathbf{r}}$ (deflects radially; the Eötvös effect)."
  ],

  greTraps: [
    "TRAP 1: The factor of 2! The Coriolis acceleration is $2(\\mathbf{\\Omega}\\times\\mathbf{v})$, NOT $1(\\mathbf{\\Omega}\\times\\mathbf{v})$. One factor of $\\Omega\\times\\mathbf{v}$ comes from rotating basis vectors; the second comes from advection of relative velocity across the rotating grid.",
    "TRAP 2: Particle dropped from a tall tower at the equator: It deflects to the EAST, not west! As it falls downward ($-\\hat{\\mathbf{r}}$), $\\mathbf{F}_{\\text{Cor}} = -2m(\\mathbf{\\Omega}\\times\\mathbf{v})$ points eastward in the direction of Earth's spin.",
    "TRAP 3: Coriolis force does NO WORK. Since $\\mathbf{F}_{\\text{Cor}} \\perp \\mathbf{v}_{\\text{rot}}$, it curves the path without changing relative speed."
  ],

  parameters: [
    { id: 'omega', label: 'Turntable Spin Rate ($\\Omega$)', min: -3.0, max: 3.0, step: 0.25, default: 1.2, unit: 'rad/s' },
    { id: 'launchSpeed', label: 'Launch Speed ($v_0$)', min: 40, max: 140, step: 10, default: 80, unit: 'px/s' },
    { id: 'launchAngle', label: 'Launch Direction', min: 0, max: 360, step: 15, default: 0, unit: 'deg' },
    { id: 'showForces', label: 'Show Fictitious Vectors', type: 'toggle', default: true, unit: '' },
    { id: 'simSpeed', label: 'Simulation Speed', min: 0.2, max: 3.0, step: 0.2, default: 1.0, unit: 'x' }
  ],

  init: function (container, state, redraw) {
    state._time = 0;
    state._inertialTrail = [];
    state._rotTrail = [];
    state._rotAngle = 0;
  },

  draw: function (ctx, width, height, state, dt) {
    creamFill(ctx, width, height);
    lightGrid(ctx, width, height, 40);
    dt = stepDt(dt);
    state = state || {};

    var Omega = parseFloat(state.omega);
    if (isNaN(Omega)) Omega = 1.2;
    var v0 = parseFloat(state.launchSpeed);
    if (isNaN(v0)) v0 = 80;
    var angleDeg = parseFloat(state.launchAngle);
    if (isNaN(angleDeg)) angleDeg = 0;
    var showVecs = isOn(state.showForces, true);
    var simSpeed = parseFloat(state.simSpeed);
    if (isNaN(simSpeed)) simSpeed = 1.0;

    var angleRad = (angleDeg * Math.PI) / 180;
    var topBand = 30;
    var botBand = 24;
    var midX = width * 0.5;
    var leftCX = width * 0.25;
    var rightCX = width * 0.75;
    var cy = topBand + (height - topBand - botBand) * 0.48;
    var R = Math.min(width * 0.20, (height - topBand - botBand) * 0.40);
    R = Math.max(48, R);

    var dStep = dt * simSpeed;
    state._time = (state._time || 0) + dStep;
    state._rotAngle = (state._rotAngle || 0) - Omega * dStep;

    var cyclePeriod = (2.2 * R) / Math.max(20, v0);
    var curT = state._time % cyclePeriod;

    var in_x = -R * 0.85 * Math.cos(angleRad) + v0 * curT * Math.cos(angleRad);
    var in_y = -R * 0.85 * Math.sin(angleRad) + v0 * curT * Math.sin(angleRad);

    if (curT < dStep * 1.5) {
      state._inertialTrail = [];
      state._rotTrail = [];
      state._rotAngle = 0;
    }

    var curRot = state._rotAngle;
    var cP = Math.cos(curRot);
    var sP = Math.sin(curRot);
    var rot_x = in_x * cP + in_y * sP;
    var rot_y = -in_x * sP + in_y * cP;

    var v_in_x = v0 * Math.cos(angleRad);
    var v_in_y = v0 * Math.sin(angleRad);
    var vx_rel = v_in_x - Omega * in_y;
    var vy_rel = v_in_y + Omega * in_x;
    var v_rot_x = vx_rel * cP + vy_rel * sP;
    var v_rot_y = -vx_rel * sP + vy_rel * cP;

    if (!state._inertialTrail) state._inertialTrail = [];
    if (!state._rotTrail) state._rotTrail = [];
    state._inertialTrail.push({ x: leftCX + in_x, y: cy + in_y });
    state._rotTrail.push({ x: rightCX + rot_x, y: cy + rot_y });
    if (state._inertialTrail.length > 70) state._inertialTrail.shift();
    if (state._rotTrail.length > 70) state._rotTrail.shift();

    ctx.save();
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(midX, topBand - 4);
    ctx.lineTo(midX, height - botBand + 4);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.font = '600 12px Inter, -apple-system, sans-serif';
    ctx.fillStyle = C.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Lab frame (inertial)', leftCX, 14);
    ctx.fillText('Turntable frame (rotating)', rightCX, 14);
    ctx.restore();

    function drawTable(tcx, tcy, spinning) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(tcx, tcy, R, 0, Math.PI * 2);
      ctx.fillStyle = C.panel;
      ctx.fill();
      ctx.strokeStyle = spinning ? C.gold : C.coral;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = spinning ? 'rgba(212, 160, 23, 0.28)' : 'rgba(204, 120, 92, 0.28)';
      ctx.lineWidth = 1;
      var i;
      for (i = 0; i < 8; i++) {
        var sp = (spinning ? 0 : state._rotAngle) + (i * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(tcx, tcy);
        ctx.lineTo(tcx + R * Math.cos(sp), tcy + R * Math.sin(sp));
        ctx.stroke();
      }
      disc(ctx, tcx, tcy, 4, C.ink, null);
      ctx.restore();
    }

    drawTable(leftCX, cy, false);
    drawTable(rightCX, cy, true);

    var leftBounds = { x: 4, y: topBand, w: midX - 8, h: height - topBand - botBand };
    var rightBounds = { x: midX + 4, y: topBand, w: width - midX - 8, h: height - topBand - botBand };

    ctx.save();
    ctx.beginPath();
    ctx.rect(leftBounds.x, leftBounds.y, leftBounds.w, leftBounds.h);
    ctx.clip();
    var li;
    for (li = 0; li < state._inertialTrail.length - 1; li++) {
      var la = (li / state._inertialTrail.length) * 0.85;
      ctx.strokeStyle = 'rgba(204, 120, 92, ' + la + ')';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(state._inertialTrail[li].x, state._inertialTrail[li].y);
      ctx.lineTo(state._inertialTrail[li + 1].x, state._inertialTrail[li + 1].y);
      ctx.stroke();
    }
    var curInX = leftCX + in_x;
    var curInY = cy + in_y;
    disc(ctx, curInX, curInY, 7, C.coral, C.ink);
    var vInMag = Math.hypot(v_in_x, v_in_y) || 1;
    var vInLen = 36;
    arrow(ctx, curInX, curInY, curInX + (v_in_x / vInMag) * vInLen, curInY + (v_in_y / vInMag) * vInLen, C.emerald, 2.2);
    pill(ctx, 'v', curInX + (v_in_x / vInMag) * (vInLen + 10), curInY + (v_in_y / vInMag) * (vInLen + 10), C.emerald, 'center', leftBounds);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(rightBounds.x, rightBounds.y, rightBounds.w, rightBounds.h);
    ctx.clip();
    var ri;
    for (ri = 0; ri < state._rotTrail.length - 1; ri++) {
      var ra = (ri / state._rotTrail.length) * 0.85;
      ctx.strokeStyle = 'rgba(93, 184, 166, ' + ra + ')';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(state._rotTrail[ri].x, state._rotTrail[ri].y);
      ctx.lineTo(state._rotTrail[ri + 1].x, state._rotTrail[ri + 1].y);
      ctx.stroke();
    }
    var curRotX = rightCX + rot_x;
    var curRotY = cy + rot_y;
    disc(ctx, curRotX, curRotY, 7, C.teal, C.ink);
    var vRotMag = Math.hypot(v_rot_x, v_rot_y) || 1;
    var vRotLen = 36;
    var vTipX = curRotX + (v_rot_x / vRotMag) * vRotLen;
    var vTipY = curRotY + (v_rot_y / vRotMag) * vRotLen;
    arrow(ctx, curRotX, curRotY, vTipX, vTipY, C.emerald, 2.0);

    var forceChips = [];
    if (showVecs) {
      var f_cor_x = -2 * Omega * v_rot_y;
      var f_cor_y = 2 * Omega * v_rot_x;
      var fCorMag = Math.hypot(f_cor_x, f_cor_y);
      if (fCorMag > 1e-3) {
        var fLen = 44;
        var fux = f_cor_x / fCorMag;
        var fuy = f_cor_y / fCorMag;
        var fcx = curRotX + fux * fLen;
        var fcy = curRotY + fuy * fLen;
        arrow(ctx, curRotX, curRotY, fcx, fcy, C.violet, 2.4);
        forceChips.push({
          text: 'F_Cor',
          color: C.violet,
          x: fcx + fux * 12,
          y: fcy + fuy * 12,
          dx: fux,
          dy: fuy,
          len: fLen
        });
      }
      var f_cent_x = Omega * Omega * rot_x;
      var f_cent_y = Omega * Omega * rot_y;
      var fCentMag = Math.hypot(f_cent_x, f_cent_y);
      if (fCentMag > 1e-3) {
        var cLen = 28;
        var cux = f_cent_x / fCentMag;
        var cuy = f_cent_y / fCentMag;
        var ccx = curRotX + cux * cLen;
        var ccy = curRotY + cuy * cLen;
        arrow(ctx, curRotX, curRotY, ccx, ccy, C.gold, 2.0);
        forceChips.push({
          text: 'F_cent',
          color: C.gold,
          x: ccx + cux * 12,
          y: ccy + cuy * 12,
          dx: cux,
          dy: cuy,
          len: cLen
        });
      }
    }
    ctx.restore();

    function keepChipInPanel(ch, b) {
      var s = chipSize(ch.text);
      var minX = b.x + 6 + s.w / 2;
      var maxX = b.x + b.w - 6 - s.w / 2;
      var minY = b.y + 10;
      var maxY = b.y + b.h - 10;
      if (minX <= maxX) {
        if (ch.x < minX) ch.x = minX;
        if (ch.x > maxX) ch.x = maxX;
      }
      if (ch.y < minY) ch.y = minY;
      if (ch.y > maxY) ch.y = maxY;
    }
    if (forceChips.length === 2) {
      if (chipsOverlap(forceChips[0], forceChips[1])) {
        pushShorterChip(forceChips[0], forceChips[1]);
      }
      keepChipInPanel(forceChips[0], rightBounds);
      keepChipInPanel(forceChips[1], rightBounds);
      if (chipsOverlap(forceChips[0], forceChips[1])) {
        pushShorterChip(forceChips[0], forceChips[1]);
        keepChipInPanel(forceChips[0], rightBounds);
        keepChipInPanel(forceChips[1], rightBounds);
      }
    }
    var fi;
    for (fi = 0; fi < forceChips.length; fi++) {
      keepChipInPanel(forceChips[fi], rightBounds);
      pill(ctx, forceChips[fi].text, forceChips[fi].x, forceChips[fi].y, forceChips[fi].color, 'center', null);
    }

    ctx.save();
    ctx.font = '500 11px Inter, -apple-system, sans-serif';
    ctx.fillStyle = C.muted;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('straight line at constant v', leftCX, height - 12);
    ctx.fillText(Omega >= 0 ? 'curves to the right of v (CCW Ω)' : 'curves to the left of v (CW Ω)', rightCX, height - 12);
    ctx.restore();

    var v_rot_mag = Math.hypot(v_rot_x, v_rot_y);
    var f_cor_mag = Math.abs(2 * Omega * v_rot_mag);
    legend('Coriolis dynamics', [
      { label: '$\\Omega$', value: '$' + Omega.toFixed(2) + '\\,\\mathrm{rad/s}$' },
      { label: '$|\\mathbf{F}_{\\mathrm{Cor}}|$ ($m=1$)', value: '$' + f_cor_mag.toFixed(1) + '$' },
      { label: '$|\\mathbf{v}_{\\mathrm{rot}}|$', value: '$' + v_rot_mag.toFixed(1) + '\\,\\mathrm{px/s}$' },
      { label: 'Deflection', value: Omega >= 0 ? 'right of $v$ (CCW)' : 'left of $v$ (CW)' },
      { label: 'Work by $\\mathbf{F}_{\\mathrm{Cor}}$', value: '$0$ ($\\mathbf{F}_{\\mathrm{Cor}} \\perp \\mathbf{v}_{\\mathrm{rot}}$)' }
    ]);
  },

  challenge: {
    question: "A heavy ball is dropped from rest from the top of a vertical tower of height $h$ at latitude $\\lambda$ in the Northern Hemisphere. Neglecting air drag and terms of order $\\Omega^2$, in which direction and by what displacement $\\Delta x$ is the ball deflected by the Coriolis force when it strikes the ground?",
    options: [
      "East, $\\Delta x = \\frac{1}{3} \\Omega g \\cos\\lambda \\left(\\frac{2h}{g}\\right)^{3/2}$",
      "West, $\\Delta x = \\frac{1}{3} \\Omega g \\cos\\lambda \\left(\\frac{2h}{g}\\right)^{3/2}$",
      "South, $\\Delta x = \\Omega g \\sin\\lambda \\left(\\frac{2h}{g}\\right)^2$",
      "Zero deflection (falls strictly vertically)"
    ],
    correct: 0,
    explanation: "In local coordinates where $\\hat{\\mathbf{i}}$ points East, $\\hat{\\mathbf{j}}$ North, and $\\hat{\\mathbf{k}}$ Upward (zenith), Earth's angular velocity vector is $\\mathbf{\\Omega} = \\Omega\\cos\\lambda\\hat{\\mathbf{j}} + \\Omega\\sin\\lambda\\hat{\\mathbf{k}}$. As the object falls downward under gravity, its unperturbed velocity is $\\mathbf{v}(t) \\approx -gt\\hat{\\mathbf{k}}$. The resulting Coriolis force is: $\\mathbf{F}_{\\text{Cor}} = -2m(\\mathbf{\\Omega} \\times \\mathbf{v}) = -2m[(\\Omega\\cos\\lambda\\hat{\\mathbf{j}} + \\Omega\\sin\\lambda\\hat{\\mathbf{k}}) \\times (-gt\\hat{\\mathbf{k}})] = +2m\\Omega gt\\cos\\lambda\\hat{\\mathbf{i}}$ (directed strictly Eastward). Integrating $a_x(t) = 2\\Omega g t\\cos\\lambda$ twice with respect to time from $t=0$ to impact time $t_f = \\sqrt{2h/g}$ yields the eastward deflection: $\\Delta x = \\frac{1}{3}\\Omega g \\cos\\lambda t_f^3 = \\frac{1}{3}\\Omega g \\cos\\lambda \\left(\\frac{2h}{g}\\right)^{3/2}$."
  }
};

  PGRE.visualizers['cpgf-1.20'] = {
    id: 'cpgf-1.20',
    topic: 'cm',
    title: "Rotational Newton's Second Law & Gyroscopic Dynamics",
    formulaLatex: '\\boldsymbol{\\tau} = \\frac{d\\mathbf{L}}{dt}',
    physicalStory: `
      In translational mechanics, net force dictates the rate of change of linear momentum ($d\\mathbf{p}/dt$). In rotational mechanics, net external torque ($\\boldsymbol{\\tau} = \\mathbf{r} \\times \\mathbf{F}$) governs the instantaneous rate of change of the angular momentum vector ($\\mathbf{L}$). 

      Crucially, torque can alter $\\mathbf{L}$ in two fundamentally distinct ways:
      1. **Parallel Torque** ($\\boldsymbol{\\tau} \\parallel \\mathbf{L}$): Modifies the magnitude of $\\mathbf{L}$ (speeding up or slowing down the spin rate $\\omega$).
      2. **Perpendicular Torque** ($\\boldsymbol{\\tau} \\perp \\mathbf{L}$): Modifies ONLY the orientation of $\\mathbf{L}$ at constant magnitude, producing **gyroscopic precession** ($d\\mathbf{L} = \\boldsymbol{\\tau} dt \\implies \\mathbf{L}$ continuously chases $\\boldsymbol{\\tau}$).

      For a heavy symmetrical gyroscope on a pivot subject to gravitational torque $\\tau = M g d \\sin\\theta$, the resulting steady precession frequency is $\\Omega_p = \\frac{\\tau}{L_s \\sin\\theta} = \\frac{M g d}{I_s \\omega_s}$, which is independent of the tilt angle $\\theta$!
    `,
    derivationSteps: [
      {
        step: 1,
        latex: '\\mathbf{L} = \\mathbf{r} \\times \\mathbf{p}',
        explanation: 'Define the angular momentum of a single particle about an origin O.'
      },
      {
        step: 2,
        latex: '\\frac{d\\mathbf{L}}{dt} = \\frac{d\\mathbf{r}}{dt} \\times \\mathbf{p} + \\mathbf{r} \\times \\frac{d\\mathbf{p}}{dt}',
        explanation: 'Differentiate with respect to time using the vector product rule.'
      },
      {
        step: 3,
        latex: '\\frac{d\\mathbf{r}}{dt} \\times \\mathbf{p} = \\mathbf{v} \\times (m\\mathbf{v}) = m(\\mathbf{v} \\times \\mathbf{v}) = \\mathbf{0}',
        explanation: 'The velocity vector is parallel to itself, so its cross product vanishes identically.'
      },
      {
        step: 4,
        latex: '\\frac{d\\mathbf{L}}{dt} = \\mathbf{r} \\times \\mathbf{F}_{\\text{net}} = \\boldsymbol{\\tau}_{\\text{net}}',
        explanation: "Substitute Newton's 2nd Law (F_net = dp/dt) to obtain the fundamental torque relation."
      },
      {
        step: 5,
        latex: '\\sum_i \\frac{d\\mathbf{L}_i}{dt} = \\sum_i \\boldsymbol{\\tau}_i^{\\text{ext}} + \\sum_{i \\neq j} \\mathbf{r}_i \\times \\mathbf{F}_{ij} = \\boldsymbol{\\tau}_{\\text{ext}}',
        explanation: "For an extended rigid body, internal central forces cancel in action-reaction pairs (Newton's 3rd Law strong form), leaving only net external torque."
      },
      {
        step: 6,
        latex: 'd\\phi = \\frac{|d\\mathbf{L}|}{L_s \\sin\\theta} = \\frac{\\tau dt}{L_s \\sin\\theta} \\implies \\Omega_p = \\frac{d\\phi}{dt} = \\frac{M g d}{I_s \\omega_s}',
        explanation: 'For gyroscopic precession under gravity ($\\tau = M g d \\sin\\theta$), horizontal deflection of $\\mathbf{L}$ yields uniform steady precession.'
      }
    ],
    limitingCases: [
      {
        condition: '\\boldsymbol{\\tau}_{\\text{ext}} = \\mathbf{0}',
        implication: '\\mathbf{L} = \\text{constant}',
        description: 'Angular momentum is strictly conserved in magnitude and direction (e.g. isolated pulsar, free tumbling satellite).'
      },
      {
        condition: '\\omega_s \\to \\infty \\text{ (Fast-top limit)}',
        implication: '\\Omega_p = \\frac{M g d}{I_s \\omega_s} \\to 0',
        description: 'Extreme gyroscopic rigidity / stability: the top resists orientation changes and barely precesses.'
      },
      {
        condition: '\\omega_s \\to 0 \\text{ (Zero spin)}',
        implication: '\\alpha = \\frac{\\tau}{I_{\\text{pivot}}} = \\frac{M g d \\sin\\theta}{I_p}',
        description: 'The top does not precess; it instantly topples downward under gravity as a physical pendulum.'
      },
      {
        condition: '\\theta = 0 \\text{ (Vertical Sleeping Top)}',
        implication: '\\boldsymbol{\\tau} = \\mathbf{0}',
        description: 'No gravitational torque; stable vertical spin occurs if spin exceeds threshold $\\omega_s > \\frac{2}{I_s}\\sqrt{M g d I_\\perp}$.'
      }
    ],
    greTraps: [
      {
        trap: 'Applying \\boldsymbol{\\tau} = d\\mathbf{L}/dt about an accelerating non-CM point',
        fix: '\\boldsymbol{\\tau}_O = d\\mathbf{L}_O/dt is valid ONLY if (1) point O is fixed in an inertial frame, OR (2) point O is the Center of Mass (even if CM is accelerating!). About an arbitrary accelerating point P, an extra term -\\mathbf{r}_{\\text{CM}/P} \\times (M\\mathbf{a}_P) must be included.'
      },
      {
        trap: 'Assuming \\boldsymbol{\\tau} = I\\boldsymbol{\\alpha} is always valid in 3D',
        fix: '\\boldsymbol{\\tau} = I\\boldsymbol{\\alpha} is a scalar restriction that holds only when rotation is constrained to a fixed principal axis of symmetry. In general 3D rigid body motion, \\mathbf{L} = \\mathbf{I}\\boldsymbol{\\omega} and \\mathbf{L} is NOT parallel to \\boldsymbol{\\omega}.'
      },
      {
        trap: 'Thinking precession frequency \\Omega_p depends on tilt angle \\theta',
        fix: 'In the fast-top approximation, \\tau = Mgd sin\\theta and the radius of the L precession cone is L_s sin\\theta. The \\sin\\theta factors cancel exactly, giving \\Omega_p = \\frac{Mgd}{I_s \\omega_s} (independent of \\theta for \\theta \\neq 0).'
      }
    ],
    parameters: [
      { id: 'spinSpeed', label: 'Spin Rate ($\\omega_s$)', min: 5, max: 80, step: 1, default: 35, unit: 'rad/s' },
      { id: 'tiltAngle', label: 'Tilt Angle ($\\theta$)', min: 10, max: 80, step: 1, default: 45, unit: 'deg' },
      { id: 'axleLength', label: 'Axle Distance ($d$)', min: 5, max: 25, step: 1, default: 14, unit: 'cm' },
      { id: 'rotorMass', label: 'Rotor Mass ($M$)', min: 0.2, max: 2.0, step: 0.1, default: 0.8, unit: 'kg' },
      { id: 'torqueMode', label: 'Torque Mode', type: 'select', options: ['Gravity Precession', 'Axial Spin-Up (Parallel)', 'Impulse Perturbation'], default: 'Gravity Precession' },
      { id: 'simSpeed', label: 'Simulation Speed', min: 0.2, max: 3.0, step: 0.2, default: 1.0, unit: 'x' }
    ],
    init: function (container, state, redraw) {
      state.phi = state.phi || 0;
      state.spinPhase = state.spinPhase || 0;
      state.nutationAngle = state.nutationAngle || 0;
      state.tracePoints = [];
      state._lastMode = state.torqueMode || 'Gravity Precession';
    },
    onParamChange: function (id, val, state) {
      if (!state) return;
      if (id === 'torqueMode' && val === 'Impulse Perturbation') {
        state.nutationAngle = 0.28;
      }
      if (id === 'spinSpeed' || id === 'tiltAngle' || id === 'axleLength' || id === 'rotorMass' || id === 'torqueMode') {
        state.tracePoints = [];
      }
    },
    draw: function (ctx, width, height, state, dt) {
      creamFill(ctx, width, height);
      dt = stepDt(dt);
      state = state || {};

      var spinSpeed = parseFloat(state.spinSpeed);
      if (isNaN(spinSpeed)) spinSpeed = 35;
      var tiltAngle = parseFloat(state.tiltAngle);
      if (isNaN(tiltAngle)) tiltAngle = 45;
      var axleLength = parseFloat(state.axleLength);
      if (isNaN(axleLength)) axleLength = 14;
      var rotorMass = parseFloat(state.rotorMass);
      if (isNaN(rotorMass)) rotorMass = 0.8;
      var torqueMode = state.torqueMode || 'Gravity Precession';
      var simSpeed = parseFloat(state.simSpeed);
      if (isNaN(simSpeed)) simSpeed = 1.0;
      dt = dt * simSpeed;
      state.phi = state.phi || 0;
      state.spinPhase = state.spinPhase || 0;
      state.nutationAngle = state.nutationAngle || 0;
      if (!state.tracePoints) state.tracePoints = [];

      if (state._lastMode !== torqueMode) {
        if (torqueMode === 'Impulse Perturbation') state.nutationAngle = 0.28;
        state.tracePoints = [];
        state._lastMode = torqueMode;
      }

      var g = 9.81;
      var M = rotorMass;
      var R_rotor = 0.10;
      var I_s = 0.5 * M * R_rotor * R_rotor;
      var d = axleLength / 100;
      var thetaRad = (tiltAngle * Math.PI) / 180;
      var omega_s = spinSpeed;

      var tau_mag = M * g * d * Math.sin(thetaRad);
      var L_s = I_s * omega_s;
      var Omega_p = (L_s > 1e-4) ? (M * g * d) / (I_s * omega_s) : 0;

      var isSpinUp = torqueMode === 'Axial Spin-Up (Parallel)';
      var isImpulse = torqueMode === 'Impulse Perturbation';

      if (isSpinUp) {
        omega_s = Math.min(80, omega_s + 8.0 * dt);
        state.spinSpeed = omega_s;
        state.spinPhase += omega_s * dt;
        L_s = I_s * omega_s;
        Omega_p = (L_s > 1e-4) ? (M * g * d) / (I_s * omega_s) : 0;
      } else {
        state.phi += Omega_p * dt;
        state.spinPhase += omega_s * dt;
        if (Math.abs(state.nutationAngle) > 0.001) {
          state.nutationAngle *= Math.exp(-1.5 * dt);
        } else {
          state.nutationAngle = 0;
        }
      }

      var currentTheta = thetaRad + (isSpinUp ? 0 : state.nutationAngle * Math.sin(state.phi * 4 + state.spinPhase * 0.15));

      var topBand = 26;
      var originX = width * 0.50;
      var originY = height * 0.68;
      var axLen = 0.15 + (d / 0.25) * 0.14;
      var rotorDist = axLen * 0.72;
      var worldSpan = axLen + 0.12;
      var scale = Math.min(width * 0.42, (height - topBand) * 0.55) / Math.max(worldSpan, 0.18);

      var viewElevation = 0.45;
      function project(x, y, z) {
        var px = originX + (x - y * 0.6) * scale;
        var py = originY - (z - y * 0.35 * viewElevation) * scale;
        return { x: px, y: py, depth: y };
      }

      var bounds = { x: 8, y: topBand, w: width - 16, h: height - topBand - 6 };

      ctx.save();
      ctx.font = '600 12px Inter, -apple-system, sans-serif';
      ctx.fillStyle = C.ink;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      var modeLine = 'τ ⊥ L  —  L sweeps a cone (precession)';
      if (isSpinUp) modeLine = 'τ ∥ L  —  |L| grows, direction stays put';
      else if (isImpulse) modeLine = 'impulse: nutation on top of steady precession';
      ctx.fillText(modeLine, width / 2, 14);
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = C.ivory;
      ctx.lineWidth = 1;
      ctx.beginPath();
      var gi;
      for (gi = -0.4; gi <= 0.4; gi += 0.1) {
        var p1 = project(gi, -0.4, 0);
        var p2 = project(gi, 0.4, 0);
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        var p3 = project(-0.4, gi, 0);
        var p4 = project(0.4, gi, 0);
        ctx.moveTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
      }
      ctx.stroke();
      ctx.restore();

      var pivotBase = project(0, 0, -0.22);
      var pivotTop = project(0, 0, 0);

      ctx.save();
      ctx.strokeStyle = C.muted;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(pivotBase.x, pivotBase.y);
      ctx.lineTo(pivotTop.x, pivotTop.y);
      ctx.stroke();
      ctx.restore();

      var gradPivot = ctx.createRadialGradient(pivotTop.x - 2, pivotTop.y - 2, 1, pivotTop.x, pivotTop.y, 8);
      gradPivot.addColorStop(0, C.ink);
      gradPivot.addColorStop(1, C.muted);
      ctx.fillStyle = gradPivot;
      ctx.beginPath();
      ctx.arc(pivotTop.x, pivotTop.y, 7, 0, Math.PI * 2);
      ctx.fill();
      pill(ctx, 'pivot', pivotBase.x + 16, pivotBase.y + 2, C.muted, 'left', bounds);

      var dirX = Math.sin(currentTheta) * Math.cos(state.phi);
      var dirY = Math.sin(currentTheta) * Math.sin(state.phi);
      var dirZ = Math.cos(currentTheta);

      var tip3D = { x: dirX * axLen, y: dirY * axLen, z: dirZ * axLen };
      var rotor3D = { x: dirX * rotorDist, y: dirY * rotorDist, z: dirZ * rotorDist };
      var cm3D = { x: dirX * (rotorDist * 0.92), y: dirY * (rotorDist * 0.92), z: dirZ * (rotorDist * 0.92) };

      var tip2D = project(tip3D.x, tip3D.y, tip3D.z);
      var rotor2D = project(rotor3D.x, rotor3D.y, rotor3D.z);
      var cm2D = project(cm3D.x, cm3D.y, cm3D.z);

      if (!isSpinUp) {
        ctx.save();
        ctx.strokeStyle = 'rgba(204, 120, 92, 0.28)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        var stepA;
        for (stepA = 0; stepA <= 64; stepA++) {
          var a = (stepA / 64) * Math.PI * 2;
          var pCirc = project(Math.sin(currentTheta) * Math.cos(a) * axLen, Math.sin(currentTheta) * Math.sin(a) * axLen, Math.cos(currentTheta) * axLen);
          if (stepA === 0) ctx.moveTo(pCirc.x, pCirc.y);
          else ctx.lineTo(pCirc.x, pCirc.y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        state.tracePoints.push({ x: tip2D.x, y: tip2D.y });
        if (state.tracePoints.length > 120) state.tracePoints.shift();
        ctx.save();
        ctx.strokeStyle = 'rgba(204, 120, 92, 0.7)';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        var tp;
        for (tp = 0; tp < state.tracePoints.length; tp++) {
          var pt = state.tracePoints[tp];
          if (tp === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.strokeStyle = C.muted;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(pivotTop.x, pivotTop.y);
      ctx.lineTo(tip2D.x, tip2D.y);
      ctx.stroke();
      ctx.restore();

      var uX = -Math.sin(state.phi), uY = Math.cos(state.phi), uZ = 0;
      var vX = -Math.cos(currentTheta) * Math.cos(state.phi);
      var vY = -Math.cos(currentTheta) * Math.sin(state.phi);
      var vZ = Math.sin(currentTheta);

      var diskRad = 0.08;
      var diskPts = [];
      var di;
      for (di = 0; di < 32; di++) {
        var dAng = (di / 32) * Math.PI * 2;
        var rx = rotor3D.x + diskRad * (Math.cos(dAng) * uX + Math.sin(dAng) * vX);
        var ry = rotor3D.y + diskRad * (Math.cos(dAng) * uY + Math.sin(dAng) * vY);
        var rz = rotor3D.z + diskRad * (Math.cos(dAng) * uZ + Math.sin(dAng) * vZ);
        diskPts.push(project(rx, ry, rz));
      }

      ctx.save();
      ctx.fillStyle = 'rgba(204, 120, 92, 0.55)';
      ctx.strokeStyle = C.coral;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (di = 0; di < diskPts.length; di++) {
        if (di === 0) ctx.moveTo(diskPts[di].x, diskPts[di].y);
        else ctx.lineTo(diskPts[di].x, diskPts[di].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = C.bg;
      ctx.lineWidth = 2;
      var sp;
      for (sp = 0; sp < 4; sp++) {
        var sAng = state.spinPhase + (sp * Math.PI) / 2;
        var spX = rotor3D.x + diskRad * (Math.cos(sAng) * uX + Math.sin(sAng) * vX);
        var spY = rotor3D.y + diskRad * (Math.cos(sAng) * uY + Math.sin(sAng) * vY);
        var spZ = rotor3D.z + diskRad * (Math.cos(sAng) * uZ + Math.sin(sAng) * vZ);
        var sp2D = project(spX, spY, spZ);
        ctx.beginPath();
        ctx.moveTo(rotor2D.x, rotor2D.y);
        ctx.lineTo(sp2D.x, sp2D.y);
        ctx.stroke();
      }
      ctx.restore();
      disc(ctx, rotor2D.x, rotor2D.y, 3.5, C.ink, null);

      var lScale = 0.10 + 0.04 * Math.min(1, omega_s / 80);
      var lVecEnd3D = { x: dirX * (axLen + lScale), y: dirY * (axLen + lScale), z: dirZ * (axLen + lScale) };
      var lVecEnd2D = project(lVecEnd3D.x, lVecEnd3D.y, lVecEnd3D.z);
      arrow(ctx, tip2D.x, tip2D.y, lVecEnd2D.x, lVecEnd2D.y, C.coral, 3.2);
      pill(ctx, 'L', lVecEnd2D.x, lVecEnd2D.y - 10, C.coral, 'center', bounds);

      if (isSpinUp) {
        var tauPar3D = { x: dirX * (axLen + lScale + 0.07), y: dirY * (axLen + lScale + 0.07), z: dirZ * (axLen + lScale + 0.07) };
        var tauPar2D = project(tauPar3D.x, tauPar3D.y, tauPar3D.z);
        arrow(ctx, lVecEnd2D.x, lVecEnd2D.y, tauPar2D.x, tauPar2D.y, C.gold, 2.8);
        pill(ctx, 'τ (parallel)', tauPar2D.x, tauPar2D.y - 12, C.gold, 'center', bounds);
      } else {
        var fgEnd3D = { x: cm3D.x, y: cm3D.y, z: cm3D.z - 0.12 };
        var fgEnd2D = project(fgEnd3D.x, fgEnd3D.y, fgEnd3D.z);
        arrow(ctx, cm2D.x, cm2D.y, fgEnd2D.x, fgEnd2D.y, C.rose, 2.4);
        pill(ctx, 'Mg', fgEnd2D.x + 8, fgEnd2D.y, C.rose, 'left', bounds);

        var tauScale = 0.10;
        var tau3D = { x: cm3D.x - Math.sin(state.phi) * tauScale, y: cm3D.y + Math.cos(state.phi) * tauScale, z: cm3D.z };
        var tau2D = project(tau3D.x, tau3D.y, tau3D.z);
        arrow(ctx, cm2D.x, cm2D.y, tau2D.x, tau2D.y, C.gold, 3.0);
        pill(ctx, 'τ', tau2D.x, tau2D.y - 10, C.gold, 'center', bounds);

        var ringR = 0.09;
        var ringPts = [];
        var rs;
        for (rs = 0; rs <= 18; rs++) {
          var ra = state.phi + rs * 0.11;
          ringPts.push(project(ringR * Math.cos(ra), ringR * Math.sin(ra), 0.01));
        }
        ctx.save();
        ctx.strokeStyle = C.teal;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        for (rs = 0; rs < ringPts.length; rs++) {
          if (rs === 0) ctx.moveTo(ringPts[rs].x, ringPts[rs].y);
          else ctx.lineTo(ringPts[rs].x, ringPts[rs].y);
        }
        ctx.stroke();
        ctx.restore();
        var head = ringPts[ringPts.length - 1];
        var prev = ringPts[ringPts.length - 2];
        if (head && prev) arrow(ctx, prev.x, prev.y, head.x, head.y, C.teal, 2.2);
        if (head) pill(ctx, 'Ω_p', head.x + 8, head.y + 12, C.teal, 'left', bounds);
      }

      var Tprec = Omega_p > 0.01 ? (2 * Math.PI / Omega_p).toFixed(2) + '\\,\\mathrm{s}' : '\\infty';
      legend('Rotational dynamics (Eq 1.20)', [
        { label: 'Rule', value: '$d\\mathbf{L} = \\boldsymbol{\\tau}\\,dt$' },
        { label: 'Mode', value: isSpinUp ? '$\\tau \\parallel L$ (spin-up)' : (isImpulse ? 'impulse + precession' : '$\\tau \\perp L$ (precession)') },
        { label: '$\\omega_s$', value: '$' + omega_s.toFixed(1) + '\\,\\mathrm{rad/s}$' },
        { label: '$L_s$', value: '$' + L_s.toFixed(3) + '\\,\\mathrm{kg\\,m}^2/\\mathrm{s}$' },
        { label: '$\\tau_{\\mathrm{grav}}$', value: '$' + tau_mag.toFixed(3) + '\\,\\mathrm{N\\,m}$' },
        { label: '$\\Omega_p$', value: '$' + Omega_p.toFixed(3) + '\\,\\mathrm{rad/s}$' },
        { label: '$T_{\\mathrm{prec}}$', value: '$' + Tprec + '$' }
      ]);
    },
    challenge: {
      question: 'A symmetric gyroscope rotor has mass $M$, radius $R$, and is spinning with a rapid angular velocity $\\omega_s$ about a horizontal axle supported at a distance $d$ from the rotor ($I_s = \\frac{1}{2} M R^2$). If the rotor mass is doubled ($M \\to 2M$) and the spin speed is doubled ($\\omega_s \\to 2\\omega_s$), what happens to the steady precession angular frequency $\\Omega_p$?',
      options: [
        'A: It quadruples ($\\Omega_p \\to 4\\Omega_p$)',
        'B: It doubles ($\\Omega_p \\to 2\\Omega_p$)',
        'C: It remains unchanged ($\\Omega_p \\to \\Omega_p$)',
        'D: It halves ($\\Omega_p \\to \\Omega_p / 2$)',
        'E: It quarters ($\\Omega_p \\to \\Omega_p / 4$)'
      ],
      correct: 3,
      explanation: `
        The steady gyroscopic precession angular frequency is given by:
        $$\\Omega_p = \\frac{\\tau}{L_s} = \\frac{M g d}{I_s \\omega_s} = \\frac{M g d}{\\left(\\frac{1}{2} M R^2\\right) \\omega_s} = \\frac{2 g d}{R^2 \\omega_s}$$
        
        Notice that the mass $M$ in the numerator (gravitational torque) and in the denominator (moment of inertia) **cancels out completely**!
        Therefore, $\\Omega_p$ is strictly inversely proportional to $\\omega_s$:
        $$\\Omega_p \\propto \\frac{1}{\\omega_s}$$
        When $\\omega_s \\to 2\\omega_s$, the precession rate is **halved** ($\\Omega_p \\to \\Omega_p / 2$).
      `
    }
  };


})(typeof window !== 'undefined' ? window : globalThis);
