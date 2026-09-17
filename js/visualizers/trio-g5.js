/* Formula visualizers — G5 continuous CM / discrete CM / work */
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
  var DEEP = '#964b32';
  var MASS_PALETTE = [CORAL, TEAL, GOLD, ROSE, VIOLET];
  var LINE = 'rgba(20, 20, 19, 0.12)';

  function syncStageTheme() {
    var t = PGRE.vizStageTheme ? PGRE.vizStageTheme() : null;
    if (!t) return;
    CREAM = t.bg; INK = t.ink; MUTED = t.muted; LINE = t.hudBorder || t.line;
  }

  function theme() {
    return PGRE.vizStageTheme ? PGRE.vizStageTheme() : {
      ink: INK, muted: MUTED, bg: CREAM,
      inkFade: function (a) { return 'rgba(20, 20, 19, ' + a + ')'; },
      chipFade: function (a) { return 'rgba(250, 249, 245, ' + a + ')'; }
    };
  }

  function fillCream(ctx, width, height) {
    syncStageTheme();
    ctx.fillStyle = (CV && CV.colors && CV.colors.bg) ? CV.colors.bg : CREAM;
    ctx.fillRect(0, 0, width, height);
  }

  function lightGrid(ctx, width, height, step) {
    step = step || 40;
    ctx.save();
    ctx.strokeStyle = (CV && CV.colors && CV.colors.grid) || theme().inkFade(0.06);
    ctx.lineWidth = 1;
    ctx.beginPath();
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

  function legend(title, rows) {
    if (PGRE.appendVizLegend) PGRE.appendVizLegend(title, rows || []);
  }

  function clampDt(dt) {
    if (dt === undefined || dt !== dt) return 0.016;
    if (dt < 0) return 0;
    if (dt > 0.08) return 0.08;
    return dt;
  }

  function simSpeedOf(state) {
    var s = Number(state && state.simSpeed);
    if (!(s > 0) || s !== s) return 1;
    if (s < 0.2) return 0.2;
    if (s > 3) return 3;
    return s;
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

  function labelHalo(ctx, x, y, text, color, align) {
    align = align || 'left';
    ctx.save();
    ctx.font = '600 11px Inter, -apple-system, sans-serif';
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    var w = ctx.measureText(text).width;
    var bx = x;
    if (align === 'center') bx = x - w / 2;
    else if (align === 'right') bx = x - w;
    ctx.fillStyle = theme().chipFade(0.92);
    ctx.fillRect(bx - 3, y - 8, w + 6, 16);
    ctx.fillStyle = color || INK;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function drawCMMark(ctx, x, y, r) {
    r = r || 7;
    ctx.save();
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x - r - 5, y);
    ctx.lineTo(x + r + 5, y);
    ctx.moveTo(x, y - r - 5);
    ctx.lineTo(x, y + r + 5);
    ctx.stroke();
    ctx.restore();
  }

  function tinyArrow(ctx, x1, y1, x2, y2, color, lw) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    var len = Math.hypot(dx, dy);
    if (len < 2) return;
    var ang = Math.atan2(dy, dx);
    var head = Math.min(6.5, len * 0.45);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lw || 1.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(ang - 0.42), y2 - head * Math.sin(ang - 0.42));
    ctx.lineTo(x2 - head * Math.cos(ang + 0.42), y2 - head * Math.sin(ang + 0.42));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function labeledArrow(ctx, x0, y0, x1, y1, color, label, opts) {
    opts = opts || {};
    var lw = opts.lineWidth != null ? opts.lineWidth : 2.2;
    var ah = opts.arrowSize != null ? opts.arrowSize : 8;
    if (CV && typeof CV.drawArrow === 'function') {
      CV.drawArrow(ctx, x0, y0, x1, y1, color, '', lw, ah);
    } else {
      tinyArrow(ctx, x0, y0, x1, y1, color, lw);
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
    var along = opts.along != null ? opts.along : 0.55;
    var side = opts.side != null ? opts.side : 1;
    var pad = opts.pad != null ? opts.pad : 12;
    var lx = x0 + dx * along + nx * side * pad;
    var ly = y0 + dy * along + ny * side * pad;
    var cw = opts.clampW;
    var ch = opts.clampH;
    if (cw && ch) {
      if (lx < 14 || lx > cw - 14 || ly < 16 || ly > ch - 12) {
        side = -side;
        lx = x0 + dx * along + nx * side * pad;
        ly = y0 + dy * along + ny * side * pad;
      }
      lx = Math.max(14, Math.min(cw - 14, lx));
      ly = Math.max(16, Math.min(ch - 12, ly));
    }
    labelHalo(ctx, lx, ly, label, color, 'center');
  }

  function findVizCanvas() {
    if (typeof document === 'undefined') return null;
    return document.getElementById('viz-canvas') || document.getElementById('viz-inline-canvas');
  }

  function defaultSeesawMasses() {
    return [
      { u: 0.18, m: 3.0, color: CORAL, label: 'm1' },
      { u: 0.42, m: 2.0, color: TEAL, label: 'm2' },
      { u: 0.72, m: 4.0, color: GOLD, label: 'm3' },
      { u: 0.88, m: 1.5, color: ROSE, label: 'm4' },
      { u: 0.30, m: 2.5, color: VIOLET, label: 'm5' }
    ];
  }

  function rot(px, py, c, s) {
    return { x: px * c - py * s, y: px * s + py * c };
  }


  PGRE.visualizers['cpgf-1.26'] = {
    id: 'cpgf-1.26',
    topic: 'cm',
    title: 'Continuous Center of Mass & Geometric Cutouts',
    formulaLatex: '\\mathbf{r}_{\\text{CM}} = \\frac{\\int \\mathbf{r} dm}{M}',
    physicalStory: `
A uniform lamina with a hole is the superposition of a full disk of mass $M$ minus a disk of mass $M_h = \rho A_h$. The remaining center of mass then sits on the line of centers, opposite the hole:
$$\mathbf{r}_{\mathrm{CM}} = \frac{M\,\mathbf{r}_O - M_h\,\mathbf{r}_h}{M - M_h}.$$
Hang the body from any rim point $P$. Gravity exerts no torque about the CM, so the unique equilibrium is the plumb line $P$–CM–down. Watch the disk settle onto that line.
    `.trim(),
    derivationSteps: [
      {
        step: 1,
        latex: 'M \\mathbf{r}_{\\mathrm{CM}} = \\int \\mathbf{r}\\,dm',
        explanation: 'The first moment about the CM vanishes, which is the definition of $\\mathbf{r}_{\\mathrm{CM}}$.'
      },
      {
        step: 2,
        latex: 'x_{\\mathrm{CM}} = \\frac{0 - (r_h/R)^2 x_h}{1 - (r_h/R)^2}',
        explanation: 'Uniform disk: $M_h/M = (r_h/R)^2$. The hole is a negative-mass disk centered at $x_h$.'
      },
      {
        step: 3,
        latex: '\\boldsymbol{\\tau}_P = (\\mathbf{r}_{\\mathrm{CM}} - \\mathbf{r}_P)\\times M\'\\mathbf{g}',
        explanation: 'A free hang from $P$ is a physical pendulum. Equilibrium is $\\mathbf{r}_{\\mathrm{CM}}-\\mathbf{r}_P$ parallel to $\\mathbf{g}$.'
      },
      {
        step: 4,
        latex: 'y_{\\mathrm{disk}} = \\frac{4R}{3\\pi},\\quad y_{\\mathrm{hoop}} = \\frac{2R}{\\pi}',
        explanation: 'GRE ranking from a diameter: hoop $2R/\\pi$ $>$ hemispherical shell $R/2$ $>$ disk $4R/(3\\pi)$ $>$ solid hemisphere $3R/8$.'
      }
    ],
    limitingCases: [
      {
        condition: 'Hole on center ($x_h = 0$)',
        implication: 'x_{\\mathrm{CM}} = 0',
        description: 'Reflection symmetry survives; the CM stays at the geometric origin.'
      },
      {
        condition: 'Hole tangent to the rim, $x_h = R - r_h$',
        implication: 'x_{\\mathrm{CM}} = -r_h^2 / (R + r_h)',
        description: 'As $r_h \\to R$ with the hole kept inside, $x_{\\mathrm{CM}} \\to -R/2$.'
      },
      {
        condition: 'Semicircular disk vs hoop',
        implication: '4R/(3\\pi) < 2R/\\pi',
        description: 'A hoop parks all of its mass on the rim, so its CM sits farther from the diameter.'
      }
    ],
    greTraps: [
      {
        trap: 'Mixing hoop, disk, shell, and hemisphere formulas',
        fix: 'From the diameter, memorize the ranking: hoop $2R/\\pi \\approx 0.64R$ $>$ hemispherical shell $R/2$ $>$ semicircular disk $4R/(3\\pi)\\approx 0.42R$ $>$ solid hemisphere $3R/8$.'
      },
      {
        trap: 'Assuming the CM must lie inside the remaining material',
        fix: 'The CM is a first moment, not a material point. Rings, L-brackets, and boomerangs have a CM in empty space.'
      }
    ],
    parameters: [
      { id: 'holeRadius', label: 'Hole radius ($r_h$)', min: 0.15, max: 0.55, step: 0.05, default: 0.45, unit: '$R$', hint: 'Larger $r_h$ removes more mass. For a uniform disk $M_h/M=(r_h/R)^2$, so $x_{\\mathrm{CM}}$ is pulled farther from the hole.' },
      { id: 'holeOffset', label: 'Hole offset ($x_h$)', min: -0.5, max: 0.5, step: 0.05, default: 0.40, unit: '$R$', hint: 'The hole is a negative-mass disk at $x_h$. The remaining CM sits on the line of centers, opposite the hole.' },
      { id: 'suspensionAngle', label: 'Pivot on rim', min: 0, max: 360, step: 15, default: 270, unit: 'deg', hint: 'Hang from rim point $P$. Gravity has no torque about the CM, so the unique equilibrium is the plumb line $P$–CM–down.' },
      { id: 'showConstruction', label: 'Negative-mass lever', type: 'toggle', default: true, hint: 'Show the geometric origin $O$, the hole center, and the lever that locates the remaining CM by superposition.' },
      { id: 'simSpeed', label: 'Simulation Speed', min: 0.2, max: 3.0, step: 0.2, default: 1.0, unit: 'x' }
    ],
    init: function (container, state, redraw) {
      createStyleIfNotExists();
      state.holeRadius = state.holeRadius !== undefined ? state.holeRadius : 0.45;
      state.holeOffset = state.holeOffset !== undefined ? state.holeOffset : 0.40;
      state.suspensionAngle = state.suspensionAngle !== undefined ? state.suspensionAngle : 270;
      if (state.showConstruction === undefined) state.showConstruction = true;
      state.psi = 0.65;
      state.omegaHang = 0;
    },
    draw: function (ctx, width, height, state, dt) {
      dt = clampDt(dt) * simSpeedOf(state);
      var r_h = Math.min(0.55, Math.max(0.15, numParam(state, 'holeRadius', 0.45)));
      var maxOff = Math.max(0.02, 0.92 - r_h);
      var x_h = Math.max(-maxOff, Math.min(maxOff, numParam(state, 'holeOffset', 0.40)));
      var alphaDeg = numParam(state, 'suspensionAngle', 270);
      var showCon = flagParam(state, 'showConstruction', true);

      var denom = Math.max(1e-4, 1 - r_h * r_h);
      var x_cm = -(r_h * r_h * x_h) / denom;
      var MhOverM = r_h * r_h;
      var Mrem = 1 - MhOverM;

      fillCream(ctx, width, height);
      lightGrid(ctx, width, height, 40);

      var Rpx = Math.min(width * 0.32, height * 0.30);
      var pLabX = width * 0.50;
      var pLabY = Math.max(26, height * 0.14);

      var alpha = (alphaDeg * Math.PI) / 180;
      var Px = Rpx * Math.cos(alpha);
      var Py = Rpx * Math.sin(alpha);
      var CMx = x_cm * Rpx;
      var CMy = 0;
      var vx = CMx - Px;
      var vy = CMy - Py;
      var L = Math.hypot(vx, vy) || 1;
      var phiEq = Math.atan2(vx, vy);

      if (state.psi === undefined || state.psi !== state.psi) state.psi = 0.65;
      if (state.omegaHang === undefined || state.omegaHang !== state.omegaHang) state.omegaHang = 0;
      var gPx = Math.max(220, height * 0.85);
      var omega0 = Math.sqrt(gPx / L);
      var zeta = 0.22;
      var acc = -omega0 * omega0 * Math.sin(state.psi) - 2 * zeta * omega0 * state.omegaHang;
      state.omegaHang += acc * dt;
      state.psi += state.omegaHang * dt;
      if (state.psi > 1.15) { state.psi = 1.15; state.omegaHang *= -0.2; }
      if (state.psi < -1.15) { state.psi = -1.15; state.omegaHang *= -0.2; }

      var phi = phiEq - state.psi;
      var c = Math.cos(phi);
      var s = Math.sin(phi);

      function bodyToLab(bx, by) {
        var rel = rot(bx - Px, by - Py, c, s);
        return { x: pLabX + rel.x, y: pLabY + rel.y };
      }
      var O = bodyToLab(0, 0);
      var H = bodyToLab(x_h * Rpx, 0);
      var CM = bodyToLab(CMx, CMy);
      var holeR = r_h * Rpx;

      ctx.save();
      ctx.beginPath();
      ctx.arc(O.x, O.y, Rpx, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = 'rgba(204, 120, 92, 0.32)';
      ctx.beginPath();
      ctx.arc(O.x, O.y, Rpx, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = CREAM;
      ctx.beginPath();
      ctx.arc(H.x, H.y, holeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = CORAL;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(O.x, O.y, Rpx, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = ROSE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(H.x, H.y, holeR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.rect(4, 4, width - 8, height - 8);
      ctx.clip();
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(pLabX, Math.max(8, pLabY - 18));
      ctx.lineTo(pLabX, height - 10);
      ctx.stroke();
      ctx.setLineDash([]);
      if (Math.hypot(CM.x - pLabX, CM.y - pLabY) > 6) {
        ctx.strokeStyle = theme().inkFade(0.28);
        ctx.lineWidth = 1.3;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(pLabX, pLabY);
        ctx.lineTo(CM.x, CM.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();

      if (showCon) {
        ctx.save();
        ctx.strokeStyle = theme().inkFade(0.22);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(H.x, H.y);
        ctx.lineTo(CM.x, CM.y);
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = CORAL;
        ctx.beginPath();
        ctx.arc(O.x, O.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = ROSE;
        ctx.beginPath();
        ctx.arc(H.x, H.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = GOLD;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(pLabX, pLabY, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      drawCMMark(ctx, CM.x, CM.y, 7);

      var pAlign = pLabX < width * 0.5 ? 'left' : 'right';
      labelHalo(ctx, pLabX + (pAlign === 'left' ? 12 : -12), Math.max(14, pLabY - 14), 'P', GOLD, pAlign);
      labelHalo(ctx, O.x - 12, O.y + 16, 'O', MUTED, 'right');
      var cmAlign = CM.x < O.x ? 'right' : 'left';
      labelHalo(ctx, CM.x + (cmAlign === 'left' ? 14 : -14), CM.y - 2, 'CM', GOLD, cmAlign);
      if (showCon) {
        var hAlign = H.x > width * 0.72 ? 'right' : 'left';
        labelHalo(ctx, H.x + (hAlign === 'left' ? holeR * 0.15 + 10 : -holeR * 0.15 - 10), H.y - holeR - 8, '-M', ROSE, hAlign);
      }

      legend('Disk with hole, hanging from $P$', [
        { label: '$x_{\\mathrm{CM}}/R$', value: '$' + x_cm.toFixed(3) + '$', hint: 'First-moment recipe $x_{\\mathrm{CM}}=(0-M_h x_h)/(M-M_h)$. Negative means the remaining CM sits opposite the hole.' },
        { label: '$r_h/R$', value: '$' + r_h.toFixed(2) + '$', hint: 'Hole radius in units of $R$. Cutout area (and mass) scales as $(r_h/R)^2$.' },
        { label: '$x_h/R$', value: '$' + x_h.toFixed(2) + '$', hint: 'Displacement of the hole center from the disk origin. If $x_h=0$, symmetry keeps $x_{\\mathrm{CM}}=0$.' },
        { label: '$M_h/M$', value: '$' + MhOverM.toFixed(3) + '$', hint: 'Mass fraction of the hole, $(r_h/R)^2$ for a uniform disk. Treat it as negative mass.' },
        { label: '$M\'/M$', value: '$' + Mrem.toFixed(3) + '$', hint: 'Remaining mass fraction $1-(r_h/R)^2$. This is the denominator of $x_{\\mathrm{CM}}$.' },
        { label: 'recipe', value: '$(0 - M_h x_h)/(M - M_h)$', hint: 'Superposition: full disk at $O$ minus hole at $x_h$. The CM is a first moment, not a material point.' }
      ]);
      legend('GRE ranking from a diameter', [
        { label: 'hoop', value: '$2R/\\pi \\approx 0.637R$', hint: 'Thin semicircular hoop: all mass on the rim, so $y_{\\mathrm{CM}}=2R/\\pi\\approx 0.637R$ from the diameter — farthest of the four.' },
        { label: 'hemispherical shell', value: '$R/2 = 0.500R$', hint: 'Thin hemispherical shell: $y_{\\mathrm{CM}}=R/2$. Ranked between hoop and disk.' },
        { label: 'semicircular disk', value: '$4R/(3\\pi) \\approx 0.424R$', hint: 'Uniform semicircular lamina: $y_{\\mathrm{CM}}=4R/(3\\pi)\\approx 0.424R$ from the diameter.' },
        { label: 'solid hemisphere', value: '$3R/8 = 0.375R$', hint: 'Uniform solid hemisphere: $y_{\\mathrm{CM}}=3R/8=0.375R$ — closest to the diameter of the four.' }
      ]);

      var spots126 = [
        { id: 'cm', kind: 'circle', x: CM.x, y: CM.y, r: 14, title: 'Remaining CM', body: 'First moment of the leftover lamina: $x_{\\mathrm{CM}}/R=' + x_cm.toFixed(3) + '$. Opposite the hole because the cutout is negative mass.' },
        { id: 'pivot', kind: 'circle', x: pLabX, y: pLabY, r: 12, title: 'Pivot $P$', body: 'Rim hang point at $' + alphaDeg.toFixed(0) + '^\\circ$. The body is a physical pendulum about $P$; equilibrium is $P$–CM vertical.' },
        { id: 'hole', kind: 'circle', x: H.x, y: H.y, r: Math.max(10, holeR), title: 'Hole (negative mass)', body: 'Cutout of radius $r_h=' + r_h.toFixed(2) + 'R$ centered at $x_h=' + x_h.toFixed(2) + 'R$. Mass fraction $M_h/M=' + MhOverM.toFixed(3) + '$.' },
        { id: 'disk', kind: 'circle', x: O.x, y: O.y, r: Rpx, title: 'Parent disk', body: 'Uniform disk of radius $R$. Remaining mass $M\'/M=' + Mrem.toFixed(3) + '$. Superposition: $M\\mathbf{r}_O-M_h\\mathbf{r}_h$.' },
        { id: 'plumb', kind: 'segment', x1: pLabX, y1: Math.max(8, pLabY - 18), x2: pLabX, y2: height - 10, halfW: 8, title: 'Local vertical', body: 'Plumb line through $P$. Gravity exerts no torque about the CM, so hang equilibrium is $P$–CM–down.' }
      ];
      if (showCon) {
        spots126.splice(2, 0,
          { id: 'origin', kind: 'circle', x: O.x, y: O.y, r: 10, title: 'Geometric origin $O$', body: 'Center of the parent disk. Not the CM unless the hole is concentric ($x_h=0$).' },
          { id: 'lever', kind: 'segment', x1: H.x, y1: H.y, x2: CM.x, y2: CM.y, halfW: 8, title: 'Negative-mass lever', body: 'Line of centers. First-moment balance $M\\cdot 0-M_h x_h=M\' x_{\\mathrm{CM}}$ with $x_{\\mathrm{CM}}/R=' + x_cm.toFixed(3) + '$.' }
        );
      }
      PGRE.setVizHotspots(spots126);
    },
    challenge: {
      question: 'A uniform circular flat disk of radius $R$ has a circular hole of radius $R/2$ drilled out of it. The edge of the hole passes through the center of the original disk (meaning the center of the hole is at distance $d = R/2$ along the $+x$-axis from the disk origin). Where is the Center of Mass of the remaining object?',
      options: [
        'A: $x_{\\text{CM}} = -R/3$',
        'B: $x_{\\text{CM}} = -R/4$',
        'C: $x_{\\text{CM}} = -R/6$',
        'D: $x_{\\text{CM}} = -R/8$',
        'E: $x_{\\text{CM}} = +R/6$'
      ],
      correct: 2,
      explanation: `
        Use the **Negative Mass Superposition Method**:
        - Total original solid disk: Area $A_0 = \\pi R^2$, centered at $x_0 = 0$.
        - Cutout circular hole: Area $A_h = \\pi (R/2)^2 = \\frac{1}{4}\\pi R^2$, centered at $x_h = +R/2$.
        - Remaining area: $A_{\\text{rem}} = A_0 - A_h = \\frac{3}{4}\\pi R^2$.

        Calculate $x_{\\text{CM}}$:
        $$x_{\\text{CM}} = \\frac{A_0(0) - A_h\\left(+\\frac{R}{2}\\right)}{A_{\\text{rem}}} = \\frac{-\\left(\\frac{1}{4}\\pi R^2\\right)\\left(\\frac{R}{2}\\right)}{\\frac{3}{4}\\pi R^2} = \\frac{-\\frac{1}{8}}{\\frac{3}{4}} R = -\\frac{R}{6}$$
      `
    }
  };

  PGRE.visualizers['cpgf-1.27'] = {
    id: 'cpgf-1.27',
    topic: 'cm',
    title: 'Discrete Center of Mass, Seesaw Equilibrium & CM Frame',
    formulaLatex: '\\mathbf{r}_{\\text{CM}} = \\frac{\\sum_i \\mathbf{r}_i m_i}{M}',
    physicalStory: `
For $N$ point masses the CM is the balance point $\\mathbf{r}_{\\mathrm{CM}} = (\\sum m_i \\mathbf{r}_i)/M$. Uniform gravity produces **zero net torque about the CM**, so a seesaw whose fulcrum sits at $x_{\\mathrm{CM}}$ does not tip.
Internal forces cannot move the CM: a walker on a frictionless boat keeps $\\Delta X_{\\mathrm{CM}} = 0$ if the system starts at rest, and fragments of an exploding shell follow the original parabola until the first piece hits the ground.
    `.trim(),
    derivationSteps: [
      {
        step: 1,
        latex: 'M = \\sum_i m_i,\\quad \\mathbf{r}_{\\mathrm{CM}} = \\frac{1}{M}\\sum_i m_i \\mathbf{r}_i',
        explanation: 'Definition of total mass and of the first-moment balance point.'
      },
      {
        step: 2,
        latex: '\\boldsymbol{\\tau}_{\\mathrm{CM}} = \\sum_i (\\mathbf{r}_i - \\mathbf{r}_{\\mathrm{CM}})\\times m_i \\mathbf{g} = \\mathbf{0}',
        explanation: 'Uniform $g$ factors out; the remaining sum is $M(\\mathbf{r}_{\\mathrm{CM}}-\\mathbf{r}_{\\mathrm{CM}})$.'
      },
      {
        step: 3,
        latex: 'M\\mathbf{a}_{\\mathrm{CM}} = \\mathbf{F}_{\\mathrm{ext}}',
        explanation: 'Internal pairs cancel by Newton’s third law. Only external force accelerates the CM.'
      },
      {
        step: 4,
        latex: '\\Delta x_{\\mathrm{boat}} = -\\frac{m}{m+M}L',
        explanation: 'Walker displaces $L$ relative to the boat; $F_{\\mathrm{ext},x}=0$ and $\\mathbf{v}_{\\mathrm{CM}}(0)=\\mathbf{0}$ freeze $X_{\\mathrm{CM}}$.'
      }
    ],
    limitingCases: [
      {
        condition: 'Equal masses',
        implication: '\\mathbf{r}_{\\mathrm{CM}} = \\frac{1}{N}\\sum_i \\mathbf{r}_i',
        description: 'The CM collapses to the geometric centroid.'
      },
      {
        condition: 'm_1 \\gg m_2',
        implication: '\\mathbf{r}_{\\mathrm{CM}} \\to \\mathbf{r}_1',
        description: 'The heavy mass owns the barycenter (Earth–Sun).'
      },
      {
        condition: '\\mathbf{F}_{\\mathrm{ext}}=\\mathbf{0} and \\mathbf{v}_{\\mathrm{CM}}(0)=\\mathbf{0}',
        implication: '\\Delta\\mathbf{r}_{\\mathrm{CM}} = \\mathbf{0}',
        description: 'A projectile still has $\\mathbf{F}_{\\mathrm{ext}}=M\\mathbf{g}$, so its CM follows the original parabola while every fragment is airborne.'
      }
    ],
    greTraps: [
      {
        trap: 'Walking on a boat / frictionless ice',
        fix: 'No horizontal external force **and** rest initially $\\Rightarrow \\Delta X_{\\mathrm{CM}}=0$. Boat shift is $mL/(m+M)$, not $L$.'
      },
      {
        trap: 'Exploding projectile “jumps” off the parabola',
        fix: 'Internal impulses cancel. The CM of all fragments stays on the original parabola until the first fragment hits the ground.'
      }
    ],
    parameters: [
      { id: 'simMode', label: 'Picture', type: 'select', default: 'seesaw', options: [
        { value: 'seesaw', label: 'Seesaw (torque about CM)' },
        { value: 'boat', label: 'Walker on a boat ($F_{\\mathrm{ext},x}=0$)' },
        { value: 'explode', label: 'Exploding projectile' }
      ], hint: 'Three GRE pictures of the same CM: torque balance on a seesaw, a walker on a frictionless boat ($F_{\\mathrm{ext},x}=0$), and fragments of an exploding projectile.' },
      { id: 'numMasses', label: 'Mass count ($N$)', min: 2, max: 5, step: 1, default: 3, unit: '', hint: 'How many point masses sit on the seesaw. $x_{\\mathrm{CM}}=(\\sum m_i x_i)/M$. Used in the seesaw picture.' },
      { id: 'fulcrumShift', label: 'Fulcrum shift from CM', min: -0.35, max: 0.35, step: 0.05, default: 0, unit: '$L$', hint: 'Displace the fulcrum from $x_{\\mathrm{CM}}$. Uniform $g$ produces zero net torque about the CM, so a shift makes the plank tip.' },
      { id: 'simSpeed', label: 'Simulation Speed', min: 0.2, max: 3.0, step: 0.2, default: 1.0, unit: 'x' }
    ],
    init: function (container, state, redraw) {
      createStyleIfNotExists();
      if (state.simMode === 'Interactive Multi-Mass Pivot') state.simMode = 'seesaw';
      if (state.simMode === 'Man Walking on Boat') state.simMode = 'boat';
      if (state.simMode === 'Exploding Projectile Parabola') state.simMode = 'explode';
      state.simMode = state.simMode || 'seesaw';
      state.numMasses = state.numMasses || 3;
      state.fulcrumShift = state.fulcrumShift !== undefined ? state.fulcrumShift : 0;
      state.boatPersonPos = 0;
      state.boatAnimDir = 1;
      state.projT = 0;
      state.theta = 0;
      state.omegaBeam = 0;
      state.dragIdx = -1;
      if (!state.masses || state.masses.length === 0) {
        state.masses = defaultSeesawMasses();
      }
      function setupPointerEvents(canvas) {
        if (!canvas || canvas._pgreBoundG5) return;
        canvas._pgreBoundG5 = true;
        canvas.addEventListener('pointerdown', function (e) {
          if (state.simMode !== 'seesaw') return;
          var rect = canvas.getBoundingClientRect();
          var px = e.clientX - rect.left;
          var py = e.clientY - rect.top;
          var cssW = rect.width || 1;
          var cssH = rect.height || 1;
          var n = Math.max(2, Math.min(5, Number(state.numMasses) || 3));
          var list = state.masses.slice(0, n);
          var plankY = cssH * 0.50;
          var left = cssW * 0.10;
          var span = cssW * 0.80;
          state.dragIdx = -1;
          var i;
          for (i = 0; i < list.length; i++) {
            var mx = left + list[i].u * span;
            var r = 14 + list[i].m * 2.4;
            var dx = px - mx;
            var dy = py - (plankY - r * 0.15);
            if (dx * dx + dy * dy <= r * r) {
              state.dragIdx = i;
              if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
              break;
            }
          }
        });
        canvas.addEventListener('pointermove', function (e) {
          if (state.dragIdx < 0 || !state.masses[state.dragIdx]) return;
          if (state.simMode !== 'seesaw') return;
          var rect = canvas.getBoundingClientRect();
          var u = (e.clientX - rect.left) / (rect.width || 1);
          var left = 0.10;
          var span = 0.80;
          state.masses[state.dragIdx].u = Math.max(0.04, Math.min(0.96, (u - left) / span));
          if (redraw) redraw();
        });
        canvas.addEventListener('pointerup', function (e) {
          if (state.dragIdx >= 0) {
            state.dragIdx = -1;
            try { if (canvas.releasePointerCapture) canvas.releasePointerCapture(e.pointerId); } catch (err) {}
          }
        });
      }
      var target = findVizCanvas();
      if (target) setupPointerEvents(target);
      else setTimeout(function () { setupPointerEvents(findVizCanvas()); }, 80);
    },
    draw: function (ctx, width, height, state, dt) {
      dt = clampDt(dt) * simSpeedOf(state);
      if (state.simMode === 'Interactive Multi-Mass Pivot') state.simMode = 'seesaw';
      if (state.simMode === 'Man Walking on Boat') state.simMode = 'boat';
      if (state.simMode === 'Exploding Projectile Parabola') state.simMode = 'explode';
      state.simMode = state.simMode || 'seesaw';
      var nMass = Math.max(2, Math.min(5, Math.round(numParam(state, 'numMasses', 3))));
      state.numMasses = nMass;
      var shift = numParam(state, 'fulcrumShift', 0);
      if (!state.masses || state.masses.length === 0) state.masses = defaultSeesawMasses();

      fillCream(ctx, width, height);
      lightGrid(ctx, width, height, 40);

      var i;

      if (state.simMode === 'seesaw') {
        var list = state.masses.slice(0, nMass);
        var left = width * 0.10;
        var span = width * 0.80;
        var plankY0 = height * 0.50;
        var totalM = 0;
        var sumMu = 0;
        for (i = 0; i < list.length; i++) {
          totalM += list[i].m;
          sumMu += list[i].m * list[i].u;
        }
        var uCM = totalM > 0 ? sumMu / totalM : 0.5;
        var xCM = left + uCM * span;
        var xF = left + Math.max(0.06, Math.min(0.94, uCM + shift)) * span;
        var lever = xCM - xF;

        if (state.theta === undefined || state.theta !== state.theta) state.theta = 0;
        if (state.omegaBeam === undefined || state.omegaBeam !== state.omegaBeam) state.omegaBeam = 0;
        var I = 0;
        for (i = 0; i < list.length; i++) {
          var xi = left + list[i].u * span;
          I += list[i].m * (xi - xF) * (xi - xF);
        }
        I = Math.max(I, 80);
        var tau = totalM * 420 * lever * Math.cos(state.theta);
        var accB = tau / I - 1.6 * state.omegaBeam;
        state.omegaBeam += accB * dt;
        state.theta += state.omegaBeam * dt;
        var maxTh = 0.55;
        if (state.theta > maxTh) { state.theta = maxTh; state.omegaBeam *= -0.15; }
        if (state.theta < -maxTh) { state.theta = -maxTh; state.omegaBeam *= -0.15; }
        if (Math.abs(shift) < 0.008) {
          state.theta += (0 - state.theta) * Math.min(1, 6 * dt);
          state.omegaBeam *= 0.84;
        }

        var th = state.theta;
        var ct = Math.cos(th);
        var st = Math.sin(th);
        function plankPt(x) {
          return { x: xF + (x - xF) * ct, y: plankY0 + (x - xF) * st };
        }
        var A = plankPt(left - 8);
        var B = plankPt(left + span + 8);

        ctx.strokeStyle = DEEP;
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(A.x, A.y);
        ctx.lineTo(B.x, B.y);
        ctx.stroke();
        ctx.strokeStyle = CORAL;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(A.x, A.y);
        ctx.lineTo(B.x, B.y);
        ctx.stroke();

        var fBase = plankY0 + 26;
        ctx.fillStyle = ROSE;
        ctx.beginPath();
        ctx.moveTo(xF, plankY0 + 4);
        ctx.lineTo(xF - 14, fBase);
        ctx.lineTo(xF + 14, fBase);
        ctx.closePath();
        ctx.fill();
        labelHalo(ctx, xF, fBase + 12, 'fulcrum', ROSE, 'center');

        var massRows = [];
        var netTau = 0;
        var spotsSaw = [];
        for (i = 0; i < list.length; i++) {
          var p = list[i];
          var px0 = left + p.u * span;
          var pt = plankPt(px0);
          var rSize = 9 + p.m * 2.8;
          var nx = -st;
          var ny = ct;
          var mx = pt.x - nx * (rSize + 2);
          var my = pt.y - ny * (rSize + 2);
          var fill = MASS_PALETTE[i] || p.color || CORAL;
          ctx.fillStyle = fill;
          ctx.beginPath();
          ctx.arc(mx, my, rSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = (state.dragIdx === i) ? GOLD : INK;
          ctx.lineWidth = (state.dragIdx === i) ? 2.4 : 1.3;
          ctx.stroke();
          var labAlign = mx > width * 0.78 ? 'right' : 'left';
          labelHalo(ctx, mx + (labAlign === 'left' ? rSize + 6 : -rSize - 6), my, p.label, INK, labAlign);
          var arm = px0 - xF;
          netTau += p.m * arm;
          labeledArrow(ctx, mx, my, mx, my + 28, theme().inkFade(0.45), '', { lineWidth: 1.4, arrowSize: 5 });
          massRows.push({
            label: '$m_{' + (i + 1) + '}$',
            value: '$' + p.m.toFixed(1) + '\\,\\mathrm{kg},\\; x=' + (p.u - 0.5).toFixed(2) + '\\,L$',
            hint: 'Point mass $m=' + p.m.toFixed(1) + '\\,\\mathrm{kg}$ at $x=' + (p.u - 0.5).toFixed(2) + 'L$ from mid-plank. Drag it; $x_{\\mathrm{CM}}$ is the mass-weighted average.'
          });
          spotsSaw.push({
            id: 'mass' + i,
            kind: 'circle',
            x: mx,
            y: my,
            r: rSize + 3,
            title: 'Mass $m_{' + (i + 1) + '}$',
            body: '$m=' + p.m.toFixed(1) + '\\,\\mathrm{kg}$ at $x=' + (p.u - 0.5).toFixed(2) + 'L$. Drag along the plank; the CM is $\\sum m_i x_i / M$.'
          });
        }

        var cmLab = plankPt(xCM);
        drawCMMark(ctx, cmLab.x, cmLab.y - 2, 7);
        labelHalo(ctx, cmLab.x + 14, cmLab.y - 16, 'CM', GOLD, 'left');

        massRows.push({ label: '$M$', value: '$' + totalM.toFixed(1) + '\\,\\mathrm{kg}$', hint: 'Total mass $M=\\sum m_i=' + totalM.toFixed(1) + '\\,\\mathrm{kg}$. The CM formula divides the first moment by this $M$.' });
        massRows.push({ label: '$x_{\\mathrm{CM}}$', value: '$' + ((uCM - 0.5) * 1).toFixed(3) + '\\,L$', hint: 'Balance point $x_{\\mathrm{CM}}=(\\sum m_i x_i)/M=' + (uCM - 0.5).toFixed(3) + 'L$ from mid-plank. Uniform $g$ produces zero net torque about this point.' });
        massRows.push({ label: '$\\tau$ about fulcrum', value: Math.abs(shift) < 0.008 ? '$0$ (fulcrum at CM)' : (netTau > 0 ? 'CW (right heavy)' : 'CCW (left heavy)'), hint: 'Net gravitational torque about the fulcrum. Vanishes when the fulcrum sits at the CM, independent of the individual $m_i$.' });
        massRows.push({ label: 'drag', value: 'slide any mass along the plank', hint: 'Pointer-drag any mass along the plank. The CM and the tipping torque update from the new first moment.' });
        legend('Seesaw: gravity torques cancel about the CM', massRows);

        spotsSaw.push({ id: 'cm', kind: 'circle', x: cmLab.x, y: cmLab.y - 2, r: 14, title: 'Center of mass', body: '$x_{\\mathrm{CM}}=' + (uCM - 0.5).toFixed(3) + 'L$ from mid-plank. Fulcrum offset $' + shift.toFixed(2) + 'L$; torque about the CM vanishes for uniform $g$.' });
        spotsSaw.push({ id: 'fulcrum', kind: 'circle', x: xF, y: plankY0 + 14, r: 16, title: 'Fulcrum', body: 'Pivot of the plank. Shifted $' + shift.toFixed(2) + 'L$ from the CM. A nonzero offset produces a net gravitational torque and the beam tips.' });
        spotsSaw.push({ id: 'plank', kind: 'segment', x1: A.x, y1: A.y, x2: B.x, y2: B.y, halfW: 10, title: 'Plank', body: 'Rigid beam. Gravity on each mass makes a torque $m g \\times$ (horizontal arm from the fulcrum); they cancel only about the CM.' });
        PGRE.setVizHotspots(spotsSaw);

      } else if (state.simMode === 'boat') {
        var mMan = 60;
        var Mboat = 140;
        var Lboat = Math.min(280, width * 0.46);
        var waterY = height * 0.64;
        if (state.boatPersonPos === undefined) state.boatPersonPos = 0;
        if (!state.boatAnimDir) state.boatAnimDir = 1;
        state.boatPersonPos += state.boatAnimDir * 0.28 * dt;
        if (state.boatPersonPos > 1) { state.boatPersonPos = 1; state.boatAnimDir = -1; }
        if (state.boatPersonPos < 0) { state.boatPersonPos = 0; state.boatAnimDir = 1; }

        var cmFixedX = width * 0.50;
        var u = (state.boatPersonPos - 0.5) * Lboat;
        var xBoat = cmFixedX - (mMan / (Mboat + mMan)) * u;
        var xPerson = xBoat + u;
        var boatShift = xBoat - cmFixedX;

        ctx.fillStyle = 'rgba(93, 184, 166, 0.20)';
        ctx.fillRect(0, waterY + 16, width, height - waterY - 16);
        ctx.strokeStyle = TEAL;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(0, waterY + 16);
        ctx.lineTo(width, waterY + 16);
        ctx.stroke();
        ctx.save();
        ctx.strokeStyle = theme().inkFade(0.10);
        ctx.lineWidth = 1;
        var wx;
        for (wx = 24; wx < width; wx += 36) {
          ctx.beginPath();
          ctx.moveTo(wx, waterY + 28);
          ctx.quadraticCurveTo(wx + 10, waterY + 34, wx + 20, waterY + 28);
          ctx.stroke();
        }
        ctx.restore();

        var bLeft = xBoat - Lboat * 0.5;
        var bRight = xBoat + Lboat * 0.5;
        ctx.fillStyle = DEEP;
        ctx.strokeStyle = CORAL;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bLeft - 14, waterY - 10);
        ctx.lineTo(bRight + 14, waterY - 10);
        ctx.lineTo(bRight - 10, waterY + 16);
        ctx.lineTo(bLeft + 10, waterY + 16);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        labelHalo(ctx, bLeft - 8, waterY - 6, 'boat', INK, 'right');

        ctx.fillStyle = CORAL;
        ctx.beginPath();
        ctx.arc(xPerson, waterY - 30, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillRect(xPerson - 5, waterY - 22, 10, 14);
        var manAlign = xPerson > width * 0.78 ? 'right' : 'left';
        labelHalo(ctx, xPerson + (manAlign === 'left' ? 12 : -12), waterY - 42, 'm', CORAL, manAlign);

        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 1.8;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(cmFixedX, 18);
        ctx.lineTo(cmFixedX, height - 8);
        ctx.stroke();
        ctx.setLineDash([]);
        labelHalo(ctx, cmFixedX + 10, 16, 'CM', GOLD, 'left');

        if (Math.abs(u) > 8) {
          labeledArrow(ctx, xPerson, waterY - 8, xPerson + (state.boatAnimDir > 0 ? 26 : -26), waterY - 8, CORAL, '', { lineWidth: 1.6, arrowSize: 6 });
          labeledArrow(ctx, xBoat, waterY + 6, xBoat - (state.boatAnimDir > 0 ? 22 : -22), waterY + 6, TEAL, '', { lineWidth: 1.6, arrowSize: 6 });
        }

        legend('Isolated boat (starts at rest)', [
          { label: '$m$ walker', value: '$' + mMan + '\\,\\mathrm{kg}$', hint: 'Walker mass. Heavier $m$ shifts the boat more: $\\Delta x_{\\mathrm{boat}}=-mL/(m+M)$.' },
          { label: '$M$ boat', value: '$' + Mboat + '\\,\\mathrm{kg}$', hint: 'Boat mass. Larger $M$ makes the boat recoil less for the same walker step.' },
          { label: '$\\Delta X_{\\mathrm{CM}}$', value: '$0$', hint: 'No horizontal external force and rest initially freeze $X_{\\mathrm{CM}}$. The gold line never moves.' },
          { label: 'walker on boat', value: '$' + ((state.boatPersonPos - 0.5) * 5).toFixed(2) + '\\,\\mathrm{m}$', hint: 'Walker position along the deck relative to the boat center. $F_{\\mathrm{ext},x}=0$ does not freeze this coordinate.' },
          { label: 'boat vs water', value: '$' + (boatShift * 5 / Lboat).toFixed(2) + '\\,\\mathrm{m}$', hint: 'Boat displacement relative to the water, opposite the walker, magnitude $m|\\Delta x_{\\mathrm{rel}}|/(m+M)$.' },
          { label: 'shift formula', value: '$\\Delta x_{\\mathrm{boat}} = - m L / (m+M)$', hint: 'Walker displaces $L$ on the boat; $X_{\\mathrm{CM}}$ fixed implies $\\Delta x_{\\mathrm{boat}}=-mL/(m+M)$.' }
        ]);

        var spotsBoat = [
          { id: 'walker', kind: 'circle', x: xPerson, y: waterY - 26, r: 18, title: 'Walker $m$', body: 'Mass $m=' + mMan + '\\,\\mathrm{kg}$ on the deck. Position on the boat $' + ((state.boatPersonPos - 0.5) * 5).toFixed(2) + '\\,\\mathrm{m}$ from center. Internal walk cannot move $X_{\\mathrm{CM}}$.' },
          { id: 'cmline', kind: 'segment', x1: cmFixedX, y1: 18, x2: cmFixedX, y2: height - 8, halfW: 8, title: 'Fixed $X_{\\mathrm{CM}}$', body: '$F_{\\mathrm{ext},x}=0$ and $\\mathbf{v}_{\\mathrm{CM}}(0)=\\mathbf{0}$ freeze the gold line. Boat and walker shift in opposite directions about it.' },
          { id: 'boat', kind: 'rect', x: bLeft - 14, y: waterY - 10, w: (bRight - bLeft) + 28, h: 26, title: 'Boat $M$', body: 'Mass $M=' + Mboat + '\\,\\mathrm{kg}$. Recoil vs water $' + (boatShift * 5 / Lboat).toFixed(2) + '\\,\\mathrm{m}$, equal to $-m\\,\\Delta x_{\\mathrm{rel}}/(m+M)$.' }
        ];
        if (Math.abs(u) > 8) {
          var wDir = state.boatAnimDir > 0 ? 26 : -26;
          spotsBoat.push({ id: 'walkArrow', kind: 'segment', x1: xPerson, y1: waterY - 8, x2: xPerson + wDir, y2: waterY - 8, halfW: 7, title: 'Walker step', body: 'Displacement relative to the boat. The boat recoils the other way so $m\\Delta x_m+M\\Delta x_M=0$.' });
          spotsBoat.push({ id: 'recoil', kind: 'segment', x1: xBoat, y1: waterY + 6, x2: xBoat - (state.boatAnimDir > 0 ? 22 : -22), y2: waterY + 6, halfW: 7, title: 'Boat recoil', body: 'Opposite the walker. Formula $\\Delta x_{\\mathrm{boat}}=-m L/(m+M)$ for a full end-to-end walk of length $L$.' });
        }
        spotsBoat.push({ id: 'water', kind: 'rect', x: 0, y: waterY + 16, w: width, h: Math.max(8, height - waterY - 16), title: 'Frictionless water', body: 'No horizontal external force from the water, so the CM of boat plus walker cannot accelerate horizontally.' });
        PGRE.setVizHotspots(spotsBoat);

      } else {
        if (state.projT === undefined) state.projT = 0;
        state.projT = (state.projT + dt * 0.72) % 3.2;
        var t = state.projT;
        var tExplode = 1.25;
        var startX = 48;
        var groundY = height - 32;
        var v0x = Math.min(180, width * 0.28);
        var v0y = -Math.min(200, height * 0.50);
        var gPx = Math.min(118, height * 0.28);
        var kick = 70;

        ctx.strokeStyle = MUTED;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(16, groundY);
        ctx.lineTo(width - 16, groundY);
        ctx.stroke();
        labelHalo(ctx, 20, groundY - 12, 'ground', MUTED, 'left');

        ctx.save();
        ctx.beginPath();
        ctx.rect(4, 4, width - 8, groundY - 4);
        ctx.clip();
        ctx.strokeStyle = CORAL;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        var st;
        for (st = 0; st <= 3.6; st += 0.04) {
          var cxp = startX + v0x * st;
          var cyp = groundY + v0y * st + 0.5 * gPx * st * st;
          if (st === 0) ctx.moveTo(cxp, cyp);
          else ctx.lineTo(cxp, cyp);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        var cmX = startX + v0x * t;
        var cmY = groundY + v0y * t + 0.5 * gPx * t * t;
        var airborne = cmY < groundY - 2;

        var spotsExp = [];
        if (t < tExplode) {
          ctx.fillStyle = CORAL;
          ctx.beginPath();
          ctx.arc(cmX, cmY, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = INK;
          ctx.lineWidth = 1.2;
          ctx.stroke();
          spotsExp.push({ id: 'shell', kind: 'circle', x: cmX, y: cmY, r: 14, title: 'Intact shell', body: 'Before the split ($t=' + t.toFixed(2) + '<t_{\\mathrm{ex}}=' + tExplode.toFixed(2) + '$). The CM of the shell already follows $x=v_{0x}t$, $y=v_{0y}t+\\tfrac12 gt^2$.' });
        } else {
          var dtPost = t - tExplode;
          var xE = startX + v0x * tExplode;
          var yE = groundY + v0y * tExplode + 0.5 * gPx * tExplode * tExplode;
          var vyE = v0y + gPx * tExplode;
          var f1X = xE + (v0x - kick) * dtPost;
          var f1Y = yE + vyE * dtPost + 0.5 * gPx * dtPost * dtPost;
          var f2X = xE + (v0x + kick) * dtPost;
          var f2Y = yE + vyE * dtPost + 0.5 * gPx * dtPost * dtPost;
          var hit = f1Y >= groundY || f2Y >= groundY;
          if (f1Y > groundY) f1Y = groundY;
          if (f2Y > groundY) f2Y = groundY;
          ctx.fillStyle = TEAL;
          ctx.beginPath();
          ctx.arc(f1X, f1Y, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = INK;
          ctx.lineWidth = 1.1;
          ctx.stroke();
          ctx.fillStyle = CORAL;
          ctx.beginPath();
          ctx.arc(f2X, f2Y, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          labelHalo(ctx, f1X - 10, f1Y - 12, '1', TEAL, 'right');
          labelHalo(ctx, f2X + 10, f2Y - 12, '2', CORAL, 'left');
          if (!hit && airborne) {
            labeledArrow(ctx, f1X, f1Y, f1X - 22, f1Y, TEAL, '', { lineWidth: 1.5, arrowSize: 5 });
            labeledArrow(ctx, f2X, f2Y, f2X + 22, f2Y, CORAL, '', { lineWidth: 1.5, arrowSize: 5 });
          }
          spotsExp.push({ id: 'frag1', kind: 'circle', x: f1X, y: f1Y, r: 12, title: 'Fragment 1', body: 'Equal-mass piece kicked left in the CM frame. Internal impulse cancels against fragment 2, so the pair CM stays on the original parabola until a hit.' });
          spotsExp.push({ id: 'frag2', kind: 'circle', x: f2X, y: f2Y, r: 12, title: 'Fragment 2', body: 'Equal-mass piece kicked right. CM-frame momenta cancel: $p_1+p_2=0$ internally, so $\\mathbf{a}_{\\mathrm{CM}}=\\mathbf{g}$ is unchanged.' });
        }

        if (airborne) {
          drawCMMark(ctx, cmX, cmY, 6);
          var cmPAlign = cmX > width * 0.72 ? 'right' : 'left';
          labelHalo(ctx, cmX + (cmPAlign === 'left' ? 12 : -12), cmY - 14, 'CM', GOLD, cmPAlign);
          spotsExp.push({ id: 'cm', kind: 'circle', x: cmX, y: cmY, r: 12, title: 'CM of all fragments', body: 'Still on the original parabola while every piece is airborne. Internal kicks cannot change $\\mathbf{a}_{\\mathrm{CM}}=\\mathbf{g}$.' });
        }

        var kPar;
        for (kPar = 0; kPar < 6; kPar++) {
          var t0p = (kPar / 6) * 3.2;
          var t1p = ((kPar + 1) / 6) * 3.2;
          spotsExp.push({
            id: 'parab' + kPar,
            kind: 'segment',
            x1: startX + v0x * t0p,
            y1: groundY + v0y * t0p + 0.5 * gPx * t0p * t0p,
            x2: startX + v0x * t1p,
            y2: groundY + v0y * t1p + 0.5 * gPx * t1p * t1p,
            halfW: 8,
            title: 'CM parabola',
            body: 'Trajectory of the intact shell, and of the CM after the split, until the first fragment hits. $\\mathbf{F}_{\\mathrm{ext}}=M\\mathbf{g}$.'
          });
        }
        spotsExp.push({ id: 'ground', kind: 'segment', x1: 16, y1: groundY, x2: width - 16, y2: groundY, halfW: 8, title: 'Ground', body: 'The first fragment to land feels a new external force. After that hit the airborne-CM theorem no longer applies to the whole set.' });
        PGRE.setVizHotspots(spotsExp);

        legend('Equal-mass split (horizontal kick)', [
          { label: 'CM path', value: t < tExplode ? 'intact shell' : (airborne ? 'original parabola' : 'a fragment has hit; CM no longer free'), hint: 'Internal impulses cancel. Until a fragment hits the ground, the CM of all pieces stays on the original parabola.' },
          { label: '$\\mathbf{F}_{\\mathrm{ext}}$', value: '$M\\mathbf{g}$ while airborne', hint: 'Only gravity is external while airborne, so $\\mathbf{a}_{\\mathrm{CM}}=\\mathbf{g}$ — the same parabola the intact shell would follow.' },
          { label: 'CM-frame $p$', value: 'equal-mass kicks cancel', hint: 'Equal-mass horizontal kicks are $\\pm$ pairs in the CM frame, so they cancel and do not move the CM.' }
        ]);
      }
    },
    challenge: {
      question: 'A person of mass $m = 60\\text{ kg}$ stands at one end of a flat uniform canoe of mass $M = 140\\text{ kg}$ and length $L = 5.0\\text{ m}$ floating stationary on frictionless water. If the person walks from one end of the canoe to the other, what is the magnitude of the displacement of the canoe relative to the water?',
      options: [
        'A: $1.0\\text{ m}$',
        'B: $1.5\\text{ m}$',
        'C: $2.14\\text{ m}$',
        'D: $2.5\\text{ m}$',
        'E: $3.5\\text{ m}$'
      ],
      correct: 1,
      explanation: `
        Because horizontal external friction from the water is zero ($F_{\\text{ext}, x} = 0$), the Center of Mass of the (man + canoe) system remains **strictly stationary** relative to the water:
        $$\\Delta X_{\\text{CM}} = \\frac{m \\Delta x_{\\text{man}} + M \\Delta x_{\\text{canoe}}}{m + M} = 0$$

        Let the displacement of the canoe relative to the water be $\\Delta x_c$.
        The displacement of the man relative to the water is $\\Delta x_m = \\Delta x_c + L$.

        Substitute into the CM conservation condition:
        $$m(\\Delta x_c + L) + M \\Delta x_c = 0 \\implies \\Delta x_c (m + M) = -m L$$

        The magnitude of the canoe's shift is:
        $$|\\Delta x_c| = \\frac{m L}{m + M} = \\frac{(60\\text{ kg})(5.0\\text{ m})}{60\\text{ kg} + 140\\text{ kg}} = \\frac{300}{200} = 1.5\\text{ m}$$
      `
    }
  };

  PGRE.visualizers['cpgf-1.15'] = {
    id: 'cpgf-1.15',
    topic: 'cm',
    title: 'Work Done by a Force',
    formulaLatex: 'W = \\int_{C} \\mathbf{F} \\cdot d\\mathbf{l} = \\int_{t_a}^{t_b} \\mathbf{F}(\\mathbf{r}(t)) \\cdot \\frac{d\\mathbf{r}}{dt} dt',
    physicalStory: `
Only the tangential piece of force does work: $dW = \\mathbf{F}\\cdot d\\mathbf{l} = F_\\parallel\\,dl$. If $\\nabla\\times\\mathbf{F}=\\mathbf{0}$ then $\\mathbf{F}=-\\nabla U$ and both paths from $A$ to $B$ pay the same $\\Delta U$. If the field has curl, Green’s theorem converts the mismatch into the enclosed area: for $\\mathbf{F}=(-y,x)$ one has $W_2-W_1 = 2\\times\\mathrm{Area}(C_1,C_2)$.
    `.trim(),
    derivationSteps: [
      '1. Infinitesimal work: $dW = \\mathbf{F}\\cdot d\\mathbf{l} = F_x\\,dx + F_y\\,dy$.',
      '2. Along $\\mathbf{r}(t)$: $W = \\int_{t_a}^{t_b} \\mathbf{F}(\\mathbf{r}(t))\\cdot\\mathbf{v}(t)\\,dt$.',
      '3. Work–energy: $\\mathbf{F}_{\\mathrm{net}}\\cdot\\mathbf{v} = \\frac{d}{dt}\\bigl(\\tfrac12 m v^2\\bigr)$, so $W_{\\mathrm{net}}=\\Delta K$.',
      '4. Stokes: $\\oint_C \\mathbf{F}\\cdot d\\mathbf{l} = \\iint_S (\\nabla\\times\\mathbf{F})\\cdot d\\mathbf{A}$. Vanishing curl $\\Rightarrow$ path independence.'
    ],
    limitingCases: [
      { condition: '$\\mathbf{F}\\perp d\\mathbf{l}$', result: '$W=0$', description: 'Magnetic Lorentz force and centripetal constraint forces do no work.' },
      { condition: 'Constant $\\mathbf{F}$', result: '$W=\\mathbf{F}\\cdot\\Delta\\mathbf{r}$', description: 'Only the net displacement survives.' },
      { condition: '$\\nabla\\times\\mathbf{F}=\\mathbf{0}$', result: '$W=-\\Delta U$', description: 'Both $C_1$ and $C_2$ return the same number.' }
    ],
    greTraps: [
      { trap: 'Work by static magnetic fields', explanation: '$\\mathbf{F}=q(\\mathbf{v}\\times\\mathbf{B})$ is always perpendicular to $\\mathbf{v}$, so $\\mathbf{F}\\cdot d\\mathbf{l}=0$.' },
      { trap: 'Normal forces never work', explanation: 'A stationary surface has $d\\mathbf{l}\\perp\\mathbf{N}$, but a moving wedge or elevator floor can do work.' }
    ],
    parameters: [
      { id: 'field', label: 'Force field', type: 'select', default: 'vortex', options: [
        { value: 'conservative', label: 'Conservative: $\\mathbf{F}=(-x,-y)$' },
        { value: 'vortex', label: 'Curl: $\\mathbf{F}=(-y,x)$' },
        { value: 'gravity', label: 'Uniform: $\\mathbf{F}=(0,-mg)$' }
      ], hint: 'Switch among $\\mathbf{F}=(-x,-y)$ (conservative), $\\mathbf{F}=(-y,x)$ (constant curl), and uniform gravity. Only the curl field makes $W(C_1)\\neq W(C_2)$.' },
      { id: 'detour', label: 'Path $C_2$ bulge', type: 'range', min: -2, max: 2, step: 0.1, default: 1.2, unit: '', hint: 'Signed bulge of $C_2$ off the straight segment $C_1$. For $\\mathbf{F}=(-y,x)$, Green\'s theorem gives $W_2-W_1=2\\times$ the enclosed area.' },
      { id: 'simSpeed', label: 'Simulation Speed', min: 0.2, max: 3.0, step: 0.2, default: 1.0, unit: 'x' }
    ],
    init: function (container, state, redraw) {
      if (typeof state.field !== 'string') state.field = 'vortex';
      state.detour = state.detour !== undefined ? Number(state.detour) : 1.2;
      state.tAnim = 0;
    },
    draw: function (ctx, width, height, state, dt) {
      dt = clampDt(dt) * simSpeedOf(state);
      if (typeof state.field !== 'string') state.field = 'vortex';
      if (state.field !== 'conservative' && state.field !== 'vortex' && state.field !== 'gravity') {
        state.field = 'vortex';
      }
      var detour = numParam(state, 'detour', 1.2);
      state.detour = detour;
      state.tAnim = ((state.tAnim || 0) + dt * 0.32) % 1;

      fillCream(ctx, width, height);
      lightGrid(ctx, width, height, 36);

      var cx = width * 0.50;
      var cy = height * 0.54;
      var scale = Math.min((width - 88) / 6.0, (height - 72) / 4.4);

      function getF(x, y) {
        if (state.field === 'conservative') return { fx: -x, fy: -y };
        if (state.field === 'vortex') return { fx: -y, fy: x };
        return { fx: 0, fy: -1.5 };
      }

      var pA = { x: -2.0, y: -1.0 };
      var pB = { x: 1.8, y: 1.15 };

      function getPath1(s) {
        return {
          x: pA.x + (pB.x - pA.x) * s,
          y: pA.y + (pB.y - pA.y) * s
        };
      }
      function getPath2(s) {
        var straight = getPath1(s);
        var perpX = -(pB.y - pA.y);
        var perpY = (pB.x - pA.x);
        var perpLen = Math.hypot(perpX, perpY) || 1;
        var bulge = Math.sin(s * Math.PI) * detour;
        return {
          x: straight.x + (perpX / perpLen) * bulge,
          y: straight.y + (perpY / perpLen) * bulge
        };
      }
      function toS(pt) {
        return { x: cx + pt.x * scale, y: cy - pt.y * scale };
      }

      if (state.field === 'conservative') {
        ctx.save();
        ctx.strokeStyle = 'rgba(204, 120, 92, 0.22)';
        ctx.lineWidth = 1.2;
        var rr;
        for (rr = 0.7; rr <= 2.6; rr += 0.65) {
          ctx.beginPath();
          ctx.arc(cx, cy, rr * scale, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      } else if (state.field === 'gravity') {
        ctx.save();
        ctx.strokeStyle = 'rgba(212, 160, 23, 0.28)';
        ctx.lineWidth = 1.1;
        var gy;
        for (gy = -1.8; gy <= 1.8; gy += 0.7) {
          var yy = cy - gy * scale;
          ctx.beginPath();
          ctx.moveTo(24, yy);
          ctx.lineTo(width - 24, yy);
          ctx.stroke();
        }
        ctx.restore();
      }

      var fieldColor = state.field === 'vortex'
        ? 'rgba(93, 184, 166, 0.40)'
        : (state.field === 'conservative' ? 'rgba(204, 120, 92, 0.38)' : 'rgba(212, 160, 23, 0.40)');
      var gx, gy;
      for (gx = -2.6; gx <= 2.6; gx += 1.15) {
        for (gy = -1.8; gy <= 1.8; gy += 1.15) {
          var f = getF(gx, gy);
          var sx = cx + gx * scale;
          var sy = cy - gy * scale;
          var fLen = Math.hypot(f.fx, f.fy);
          if (fLen > 0.08) {
            var drawLen = Math.min(18, 8 + fLen * 6);
            var ang = Math.atan2(-f.fy, f.fx);
            tinyArrow(ctx, sx, sy, sx + Math.cos(ang) * drawLen, sy + Math.sin(ang) * drawLen, fieldColor, 1.15);
          }
        }
      }

      function computeWork(pathFn) {
        var steps = 140;
        var ds = 1 / steps;
        var W = 0;
        var k;
        for (k = 0; k < steps; k++) {
          var s = k * ds;
          var a = pathFn(s);
          var b = pathFn(s + ds);
          var ff = getF((a.x + b.x) * 0.5, (a.y + b.y) * 0.5);
          W += ff.fx * (b.x - a.x) + ff.fy * (b.y - a.y);
        }
        return W;
      }
      function computeArea() {
        var steps = 140;
        var ds = 1 / steps;
        var areaAcc = 0;
        var k;
        for (k = 0; k < steps; k++) {
          var s = k * ds;
          var a = getPath2(s);
          var b = getPath2(s + ds);
          var c = getPath1(s + ds);
          var d = getPath1(s);
          areaAcc += 0.5 * ((a.x * b.y - b.x * a.y) + (b.x * c.y - c.x * b.y) + (c.x * d.y - d.x * c.y) + (d.x * a.y - a.x * d.y));
        }
        return areaAcc;
      }

      var W1 = computeWork(getPath1);
      var W2 = computeWork(getPath2);
      var area = computeArea();

      if (state.field === 'vortex' && Math.abs(detour) > 0.05) {
        ctx.save();
        ctx.beginPath();
        var i;
        for (i = 0; i <= 64; i++) {
          var q = toS(getPath2(i / 64));
          if (i === 0) ctx.moveTo(q.x, q.y);
          else ctx.lineTo(q.x, q.y);
        }
        for (i = 64; i >= 0; i--) {
          var q1 = toS(getPath1(i / 64));
          ctx.lineTo(q1.x, q1.y);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(93, 184, 166, 0.16)';
        ctx.fill();
        ctx.restore();
      }

      function strokePath(pathFn, color, widthPx) {
        ctx.strokeStyle = color;
        ctx.lineWidth = widthPx;
        ctx.beginPath();
        var i;
        for (i = 0; i <= 64; i++) {
          var q = toS(pathFn(i / 64));
          if (i === 0) ctx.moveTo(q.x, q.y);
          else ctx.lineTo(q.x, q.y);
        }
        ctx.stroke();
      }
      strokePath(getPath1, CORAL, 2.4);
      strokePath(getPath2, GOLD, 2.4);

      var mid1 = toS(getPath1(0.52));
      var mid2 = toS(getPath2(0.46));
      labelHalo(ctx, mid1.x + 10, mid1.y + 14, 'C1', CORAL, 'left');
      var side2 = detour >= 0 ? -14 : 14;
      labelHalo(ctx, mid2.x + side2, mid2.y + (detour >= 0 ? -12 : 14), 'C2', GOLD, detour >= 0 ? 'right' : 'left');

      var A = toS(pA);
      var Bpt = toS(pB);
      ctx.fillStyle = EMERALD;
      ctx.beginPath();
      ctx.arc(A.x, A.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      labelHalo(ctx, A.x - 10, A.y + 14, 'A', EMERALD, 'right');
      ctx.fillStyle = ROSE;
      ctx.beginPath();
      ctx.arc(Bpt.x, Bpt.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      labelHalo(ctx, Bpt.x + 10, Bpt.y - 12, 'B', ROSE, 'left');

      var sNow = state.tAnim;
      var cur = getPath2(sNow);
      var nxt = getPath2(Math.min(1, sNow + 0.02));
      var curS = toS(cur);
      var nxtS = toS(nxt);
      var tx = nxtS.x - curS.x;
      var ty = nxtS.y - curS.y;
      var tLen = Math.hypot(tx, ty) || 1;
      tx /= tLen; ty /= tLen;
      var curF = getF(cur.x, cur.y);
      var fEx = curF.fx;
      var fEy = -curF.fy;
      var fPix = Math.hypot(fEx, fEy) || 1;
      var fScale = 26 / Math.max(0.55, fPix);
      var Fsx = curS.x + fEx * fScale;
      var Fsy = curS.y + fEy * fScale;
      var FdotT = (fEx * tx + fEy * ty);
      var paraX = curS.x + tx * FdotT * fScale;
      var paraY = curS.y + ty * FdotT * fScale;

      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(curS.x, curS.y, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      labeledArrow(ctx, curS.x, curS.y, Fsx, Fsy, CORAL, 'F', {
        along: 0.72, side: 1, pad: 11, clampW: width, clampH: height, lineWidth: 2, arrowSize: 7
      });
      if (Math.abs(FdotT) > 0.05) {
        labeledArrow(ctx, curS.x, curS.y, paraX, paraY, TEAL, '', {
          along: 1, side: -1, pad: 11, clampW: width, clampH: height, lineWidth: 1.7, arrowSize: 6
        });
      }
      tinyArrow(ctx, curS.x, curS.y, curS.x + tx * 22, curS.y + ty * 22, MUTED, 1.3);

      var isConserv = state.field !== 'vortex';
      var fieldName = state.field === 'conservative' ? '$\\mathbf{F}=(-x,-y)$' : (state.field === 'vortex' ? '$\\mathbf{F}=(-y,x)$' : '$\\mathbf{F}=(0,-mg)$');
      var curlStr = state.field === 'vortex' ? '$2\\hat{\\mathbf{k}}$' : '$\\mathbf{0}$';
      var rows = [
        { label: 'field', value: fieldName, hint: 'Which $\\mathbf{F}$ is being integrated. Work is $\\int\\mathbf{F}\\cdot d\\mathbf{l}$, so only the tangential piece $F_\\parallel$ counts.' },
        { label: '$\\nabla\\times\\mathbf{F}$', value: curlStr, hint: 'Stokes: $\\oint\\mathbf{F}\\cdot d\\mathbf{l}=\\iint(\\nabla\\times\\mathbf{F})\\cdot d\\mathbf{A}$. Vanishing curl means path independence.' },
        { label: '$W(C_1)$', value: '$' + W1.toFixed(2) + '$', hint: 'Line integral of $\\mathbf{F}$ along the straight path $C_1$ from $A$ to $B$. Live value $W_1=' + W1.toFixed(2) + '$.' },
        { label: '$W(C_2)$', value: '$' + W2.toFixed(2) + '$', hint: 'Line integral along the bulged path $C_2$. Live $W_2=' + W2.toFixed(2) + '$.' }
      ];
      if (state.field === 'vortex') {
        rows.push({ label: 'enclosed area', value: '$' + area.toFixed(2) + '$', hint: 'Signed area between $C_1$ and $C_2$. For $\\mathbf{F}=(-y,x)$, $\\nabla\\times\\mathbf{F}=2\\hat{\\mathbf{k}}$ so $W_2-W_1=2\\times$ this area.' });
        rows.push({ label: '$W_2-W_1$', value: '$' + (W2 - W1).toFixed(2) + ' = 2\\times\\mathrm{area}$', hint: 'Mismatch of the two path integrals. Green\'s theorem converts it into $2\\times$ the enclosed area.' });
      } else if (state.field === 'conservative') {
        var UA = 0.5 * (pA.x * pA.x + pA.y * pA.y);
        var UB = 0.5 * (pB.x * pB.x + pB.y * pB.y);
        rows.push({ label: '$U=\\tfrac12(x^2+y^2)$', value: '$W=-\\Delta U=' + (UA - UB).toFixed(2) + '$', hint: 'Potential $U=\\tfrac12(x^2+y^2)$ for $\\mathbf{F}=-\\nabla U$. Both paths pay $W=-\\Delta U=' + (UA - UB).toFixed(2) + '$.' });
        rows.push({ label: 'path dependence', value: '$W_1=W_2$', hint: 'Curl-free field: $W$ depends only on the endpoints, so $W_1=W_2$.' });
      } else {
        rows.push({ label: '$W=-mg\\Delta y$', value: 'both paths', hint: 'Uniform $\\mathbf{F}=(0,-mg)$ does work $-mg\\Delta y$ on every path from $A$ to $B$.' });
        rows.push({ label: 'path dependence', value: '$W_1=W_2$', hint: 'Constant force is conservative. Only the net displacement $\\Delta\\mathbf{r}$ survives, so both paths agree.' });
      }
      legend('$W=\\int \\mathbf{F}\\cdot d\\mathbf{l}$', rows);

      var spotsW = [
        { id: 'ptA', kind: 'circle', x: A.x, y: A.y, r: 12, title: 'Start $A$', body: 'Lower endpoint of both paths. Work is $\\int_A^B\\mathbf{F}\\cdot d\\mathbf{l}$, not a state function unless $\\nabla\\times\\mathbf{F}=\\mathbf{0}$.' },
        { id: 'ptB', kind: 'circle', x: Bpt.x, y: Bpt.y, r: 12, title: 'End $B$', body: 'Upper endpoint. For a conservative field $W=-\\Delta U$ depends only on $A$ and $B$; here $W_1=' + W1.toFixed(2) + '$, $W_2=' + W2.toFixed(2) + '$.' },
        { id: 'probe', kind: 'circle', x: curS.x, y: curS.y, r: 12, title: 'Running $W$ along $C_2$', body: 'Test particle on $C_2$. Instantaneous $dW=\\mathbf{F}\\cdot d\\mathbf{l}$; accumulated $W(C_2)=' + W2.toFixed(2) + '$. Only $F_\\parallel$ contributes.' },
        { id: 'F', kind: 'segment', x1: curS.x, y1: curS.y, x2: Fsx, y2: Fsy, halfW: 8, title: 'Force $\\mathbf{F}$', body: fieldName + ' at the probe. The perpendicular piece does no work; $dW=F_\\parallel\\,dl$.' },
        { id: 'C1', kind: 'segment', x1: A.x, y1: A.y, x2: Bpt.x, y2: Bpt.y, halfW: 8, title: 'Path $C_1$', body: 'Straight path from $A$ to $B$. Line integral $W_1=' + W1.toFixed(2) + '$.' }
      ];
      if (Math.abs(FdotT) > 0.05) {
        spotsW.push({ id: 'Fpar', kind: 'segment', x1: curS.x, y1: curS.y, x2: paraX, y2: paraY, halfW: 7, title: 'Tangential $F_\\parallel$', body: 'Projection of $\\mathbf{F}$ along $d\\mathbf{l}$. This is the only piece that accumulates into $W$.' });
      }
      var si;
      for (si = 0; si < 5; si++) {
        var paC = toS(getPath2(si / 5));
        var pbC = toS(getPath2((si + 1) / 5));
        spotsW.push({ id: 'C2-' + si, kind: 'segment', x1: paC.x, y1: paC.y, x2: pbC.x, y2: pbC.y, halfW: 8, title: 'Path $C_2$', body: 'Bulged path (detour $' + detour.toFixed(1) + '$). Line integral $W_2=' + W2.toFixed(2) + '$.' });
      }
      spotsW.push({
        id: 'field',
        kind: 'rect',
        x: cx - 2.6 * scale,
        y: cy - 1.8 * scale,
        w: 5.2 * scale,
        h: 3.6 * scale,
        title: 'Force field $\\mathbf{F}$',
        body: fieldName + ', curl $' + (state.field === 'vortex' ? '2\\hat{\\mathbf{k}}' : '\\mathbf{0}') + '$. Arrows show $\\mathbf{F}$ sampled on the plane; $W=\\int\\mathbf{F}\\cdot d\\mathbf{l}$.'
      });
      PGRE.setVizHotspots(spotsW);
    },
    challenge: {
      question: 'A particle travels in the $xy$-plane from $(0,0)$ to $(1,1)$ under the force field $\\mathbf{F} = 2xy\\,\\hat{\\imath} + x^{2}\\hat{\\jmath}$. Path 1 is the line $y = x$; Path 2 is the parabola $y = x^{2}$. What is the work done along each path?',
      options: [
        'A) $W_1 = 1\\,\\mathrm{J}$, $W_2 = 1\\,\\mathrm{J}$ (force is conservative)',
        'B) $W_1 = 1\\,\\mathrm{J}$, $W_2 = 2/3\\,\\mathrm{J}$',
        'C) $W_1 = 2\\,\\mathrm{J}$, $W_2 = 1\\,\\mathrm{J}$',
        'D) $W_1 = 4/3\\,\\mathrm{J}$, $W_2 = 1\\,\\mathrm{J}$',
        'E) $W_1 = 0\\,\\mathrm{J}$, $W_2 = 0\\,\\mathrm{J}$'
      ],
      correct: 0,
      explanation: 'Check the curl: $(\\nabla\\times\\mathbf{F})_z = \\partial F_y/\\partial x - \\partial F_x/\\partial y = \\partial(x^{2})/\\partial x - \\partial(2xy)/\\partial y = 2x - 2x = 0$. Since the curl vanishes identically throughout the plane, the force is conservative with potential $U(x,y) = -x^{2}y$. The work done is simply $W = -\\Delta U = -(U(1,1) - U(0,0)) = -(-1 - 0) = 1\\,\\mathrm{J}$ for both paths.'
    }
  };

})(typeof window !== 'undefined' ? window : globalThis);
