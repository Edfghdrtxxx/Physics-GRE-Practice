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

  var INK = '#141413';
  var MUTED = '#6c6a64';
  var CORAL = '#cc785c';
  var GOLD = '#d4a017';
  var TEAL = '#5db8a6';
  var ROSE = '#e05666';
  var CREAM = '#faf9f5';
  var EMERALD = '#4e9b6f';
  var VIOLET = '#9d7cd8';
  var DEEP = '#964b32';
  var MASS_PALETTE = [CORAL, TEAL, GOLD, ROSE, VIOLET];

  function syncStageTheme() {
    var t = PGRE.vizStageTheme ? PGRE.vizStageTheme() : null;
    if (!t) return;
    INK = t.ink; MUTED = t.muted; CREAM = t.bg;
  }

  function fillCream(ctx, width, height) {
    syncStageTheme();
    ctx.fillStyle = (CV && CV.colors && CV.colors.bg) ? CV.colors.bg : CREAM;
    ctx.fillRect(0, 0, width, height);
  }

  function legend(title, rows) {
    if (PGRE.appendVizLegend) PGRE.appendVizLegend(title, rows || []);
  }

  function clampDt(dt) {
    if (dt === undefined || dt !== dt) return 0.016;
    if (dt < 0) return 0;
    if (dt > 0.1) return 0.1;
    return dt;
  }

  function simSpeedOf(state) {
    var s = Number(state && state.simSpeed);
    if (!(s > 0) || s !== s) return 1;
    if (s < 0.2) return 0.2;
    if (s > 3) return 3;
    return s;
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
    ctx.fillStyle = PGRE.vizStageTheme().chipFade(0.92);
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

  function tinyArrow(ctx, x1, y1, x2, y2, color) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    var len = Math.hypot(dx, dy);
    if (len < 2) return;
    var ang = Math.atan2(dy, dx);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 5.5 * Math.cos(ang - 0.42), y2 - 5.5 * Math.sin(ang - 0.42));
    ctx.lineTo(x2 - 5.5 * Math.cos(ang + 0.42), y2 - 5.5 * Math.sin(ang + 0.42));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function findVizCanvas() {
    if (typeof document === 'undefined') return null;
    return document.getElementById('viz-canvas') || document.getElementById('viz-inline-canvas');
  }

  function defaultParticles() {
    return [
      { x: 0.22, y: 0.48, m: 2.0, color: CORAL, label: 'm1' },
      { x: 0.52, y: 0.32, m: 3.5, color: TEAL, label: 'm2' },
      { x: 0.78, y: 0.58, m: 1.5, color: GOLD, label: 'm3' },
      { x: 0.36, y: 0.68, m: 2.5, color: ROSE, label: 'm4' },
      { x: 0.68, y: 0.22, m: 1.0, color: VIOLET, label: 'm5' }
    ];
  }


  PGRE.visualizers['cpgf-1.26'] = {
    id: 'cpgf-1.26',
    topic: 'cm',
    title: 'Continuous Center of Mass & Geometric Cutouts',
    formulaLatex: '\\mathbf{r}_{\\text{CM}} = \\frac{\\int \\mathbf{r} dm}{M}',
    physicalStory: `
      The Center of Mass (CM) is the unique mass-weighted average position of a continuous mass distribution. For continuous bodies, it represents the exact point where the first moment of mass vanishes: $\\int (\\mathbf{r} - \\mathbf{r}_{\\text{CM}}) dm = \\mathbf{0}$.

      Key analytical methods frequently tested on the PGRE:
      1. **Symmetry Arguments**: The CM MUST lie on any axis, line, or plane of geometric reflection symmetry.
      2. **Negative Mass / Superposition Method**: For bodies with cavities, holes, or cutouts, treat the missing region as an added object with **negative mass** ($M_{\\text{hole}} = -\\rho V_{\\text{hole}}$).
      3. **Plumb-Line Suspension**: If a rigid body is freely suspended from any pivot, the CM must lie strictly along the vertical gravity line extending through the suspension point!
    `,
    derivationSteps: [
      {
        step: 1,
        latex: 'M \\mathbf{r}_{\\text{CM}} = \\int \\mathbf{r} dm',
        explanation: 'Set the total first moment of mass equal to the total mass concentrated at the Center of Mass.'
      },
      {
        step: 2,
        latex: '\\mathbf{r}_{\\text{CM}} = \\frac{1}{M} \\int_V \\mathbf{r} \\rho(\\mathbf{r}) dV',
        explanation: 'Express $dm$ in terms of the spatial density distribution $\\rho(\\mathbf{r})$.'
      },
      {
        step: 3,
        latex: 'y_{\\text{CM, semi-disk}} = \\frac{1}{\\frac{1}{2}\\pi R^2} \\int_0^\\pi \\int_0^R (r \\sin\\theta) (r dr d\\theta)',
        explanation: 'Set up polar integral for a uniform semicircular disk of radius R in the upper half-plane.'
      },
      {
        step: 4,
        latex: 'y_{\\text{CM}} = \\frac{2}{\\pi R^2} \\left(\\int_0^\\pi \\sin\\theta d\\theta\\right) \\left(\\int_0^R r^2 dr\\right) = \\frac{2}{\\pi R^2} (2) \\left(\\frac{R^3}{3}\\right) = \\frac{4R}{3\\pi}',
        explanation: 'Evaluate the radial and angular integrals to obtain the standard formula.'
      },
      {
        step: 5,
        latex: '\\mathbf{r}_{\\text{CM}} = \\frac{M_{\\text{solid}} \\mathbf{r}_{\\text{solid}} - M_{\\text{hole}} \\mathbf{r}_{\\text{hole}}}{M_{\\text{solid}} - M_{\\text{hole}}}',
        explanation: 'Apply the Negative Mass superposition principle for bodies with geometric cutouts.'
      }
    ],
    limitingCases: [
      {
        condition: '\\text{Semicircle Disk vs Semicircle Hoop}',
        implication: 'y_{\\text{disk}} = \\frac{4R}{3\\pi} \\approx 0.424 R < y_{\\text{hoop}} = \\frac{2R}{\\pi} \\approx 0.637 R',
        description: 'The hoop has all its mass on the outer boundary, pulling its CM higher than the solid disk.'
      },
      {
        condition: '\\text{Hole at Center } (d_{\\text{hole}} = 0)',
        implication: '\\mathbf{r}_{\\text{CM}} = (0, 0)',
        description: 'Symmetry is preserved; CM remains at the center.'
      },
      {
        condition: 'R_{\\text{hole}} \\to R \\text{ (hole kept inside, tangent to the rim)}',
        implication: 'x_{\\text{CM}} \\to -R/2',
        description: 'With $x_h = R - r_h$, $x_{\\mathrm{CM}} = -r_h^2/(R + r_h) \\to -R/2$. A hole growing while staying centered ($x_h = 0$) leaves $x_{\\mathrm{CM}} = 0$ by symmetry.'
      }
    ],
    greTraps: [
      {
        trap: 'Mixing up semicircle and hemisphere CM formulas',
        fix: 'Memorize the ETS ranking: Semicircular Hoop (2R/\\pi \\approx 0.64R) > Hemispherical Shell (R/2 = 0.50R) > Semicircular Disk (4R/3\\pi \\approx 0.42R) > Solid Hemisphere (3R/8 = 0.375R) > Cone (h/4).'
      },
      {
        trap: 'Assuming Center of Mass must reside inside the physical material',
        fix: 'For hollow shapes (rings, donuts, boomerangs, L-brackets), the CM frequently lies in empty space.'
      }
    ],
    parameters: [
      { id: 'geoModel', label: 'Shape Model', type: 'select', options: ['Disk with hole', 'Semicircular Disk vs Wire', 'Solid Hemisphere vs Shell', 'Solid Cone vs Shell / Wedge'], default: 'Disk with hole' },
      { id: 'holeRadius', label: 'Hole radius ($r_h$)', min: 0.1, max: 0.6, step: 0.05, default: 0.45, unit: '$R$' },
      { id: 'holeOffset', label: 'Hole offset ($x_h$)', min: -0.5, max: 0.5, step: 0.05, default: 0.40, unit: '$R$' },
      { id: 'suspensionAngle', label: 'Pivot on rim', min: 0, max: 360, step: 15, default: 45, unit: 'deg' },
      { id: 'showPlumbLine', label: 'Line through $P$ and CM', type: 'toggle', default: true }
    ],
    init: function (container, state, redraw) {
      createStyleIfNotExists();
      if (state.geoModel === 'Disk with Draggable Hole') state.geoModel = 'Disk with hole';
      state.geoModel = state.geoModel || 'Disk with hole';
      state.holeRadius = state.holeRadius !== undefined ? state.holeRadius : 0.45;
      state.holeOffset = state.holeOffset !== undefined ? state.holeOffset : 0.40;
      state.suspensionAngle = state.suspensionAngle !== undefined ? state.suspensionAngle : 45;
      state.showPlumbLine = state.showPlumbLine !== undefined ? state.showPlumbLine : true;
    },
    draw: function (ctx, width, height, state, dt) {
      if (state.geoModel === 'Disk with Draggable Hole') state.geoModel = 'Disk with hole';
      state.geoModel = state.geoModel || 'Disk with hole';
      state.holeRadius = state.holeRadius !== undefined ? Number(state.holeRadius) : 0.45;
      state.holeOffset = state.holeOffset !== undefined ? Number(state.holeOffset) : 0.40;
      state.suspensionAngle = state.suspensionAngle !== undefined ? Number(state.suspensionAngle) : 45;
      state.showPlumbLine = state.showPlumbLine !== undefined ? state.showPlumbLine : true;

      fillCream(ctx, width, height);

      var centerX = width * 0.5;
      var centerY = height * 0.52;
      var R_px = Math.min(width * 0.34, height * 0.36);
      var rankingRows = [
        { label: 'wire (hoop)', value: '$2R/\\pi \\approx 0.637R$' },
        { label: 'hemispherical shell', value: '$R/2 = 0.500R$' },
        { label: 'semicircular disk', value: '$4R/(3\\pi) \\approx 0.424R$' },
        { label: 'solid hemisphere', value: '$3R/8 = 0.375R$' }
      ];

      if (state.geoModel === 'Disk with hole') {
        var r_h = Math.min(0.6, Math.max(0.1, state.holeRadius));
        var maxOffset = Math.max(0, 0.96 - r_h);
        var x_h = Math.max(-maxOffset, Math.min(maxOffset, state.holeOffset));

        var denom = Math.max(1e-4, 1.0 - r_h * r_h);
        var x_cm_val = -(r_h * r_h * x_h) / denom;
        var x_cm_px = centerX + x_cm_val * R_px;
        var y_cm_px = centerY;

        ctx.fillStyle = 'rgba(204, 120, 92, 0.28)';
        ctx.strokeStyle = CORAL;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(centerX, centerY, R_px, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        var holeX_px = centerX + x_h * R_px;
        var holeR_px = r_h * R_px;

        ctx.fillStyle = CREAM;
        ctx.strokeStyle = ROSE;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.arc(holeX_px, centerY, holeR_px, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = ROSE;
        ctx.beginPath();
        ctx.arc(holeX_px, centerY, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = INK;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 3.5, 0, Math.PI * 2);
        ctx.fill();

        drawCMMark(ctx, x_cm_px, y_cm_px, 7);

        var oTx = centerX - 18;
        var oTy = centerY + 26;
        var cmNearO = Math.abs(x_cm_px - centerX) < 40;
        var cmTx = x_cm_px;
        var cmTy = y_cm_px - 22;
        var cmAlign = 'center';
        if (!cmNearO) {
          cmTx = x_cm_px <= centerX ? x_cm_px - 14 : x_cm_px + 14;
          cmTy = y_cm_px;
          cmAlign = x_cm_px <= centerX ? 'right' : 'left';
        }

        var holeTx = holeX_px;
        var holeTy = centerY - holeR_px - 14;
        if (holeTy < 18) holeTy = centerY + holeR_px + 14;
        var holeAlign = holeX_px > width * 0.72 ? 'right' : (holeX_px < width * 0.28 ? 'left' : 'center');
        if (Math.abs(holeTx - cmTx) < 36 && Math.abs(holeTy - cmTy) < 20) {
          holeAlign = holeX_px >= centerX ? 'left' : 'right';
          holeTx = holeX_px >= centerX ? holeX_px + holeR_px + 10 : holeX_px - holeR_px - 10;
          holeTy = centerY;
        }

        labelHalo(ctx, holeTx, holeTy, '-M', ROSE, holeAlign);
        labelHalo(ctx, oTx, oTy, 'O', MUTED, 'right');
        labelHalo(ctx, cmTx, cmTy, 'CM', GOLD, cmAlign);

        if (state.showPlumbLine) {
          var suspAngRad = (state.suspensionAngle * Math.PI) / 180;
          var suspPivotX = centerX + Math.cos(suspAngRad) * R_px;
          var suspPivotY = centerY + Math.sin(suspAngRad) * R_px;
          var pDx = x_cm_px - suspPivotX;
          var pDy = y_cm_px - suspPivotY;
          var pLen = Math.sqrt(pDx * pDx + pDy * pDy) || 1;
          var ux = pDx / pLen;
          var uy = pDy / pLen;

          ctx.save();
          ctx.beginPath();
          ctx.rect(6, 6, width - 12, height - 12);
          ctx.clip();
          ctx.strokeStyle = GOLD;
          ctx.lineWidth = 1.6;
          ctx.setLineDash([5, 4]);
          ctx.beginPath();
          ctx.moveTo(suspPivotX - ux * 40, suspPivotY - uy * 40);
          ctx.lineTo(suspPivotX + ux * (pLen + 80), suspPivotY + uy * (pLen + 80));
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          ctx.fillStyle = GOLD;
          ctx.strokeStyle = INK;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(suspPivotX, suspPivotY, 5.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          var pOffX = -uy * 14;
          var pOffY = ux * 14;
          var pAlign = (suspPivotX + pOffX) < centerX ? 'right' : 'left';
          labelHalo(ctx, suspPivotX + pOffX, suspPivotY + pOffY, 'P', GOLD, pAlign);
        }

        legend('Disk with hole (negative mass)', [
          { label: '$x_{\\mathrm{CM}}/R$', value: '$' + x_cm_val.toFixed(3) + '$' },
          { label: '$r_h/R$', value: '$' + r_h.toFixed(2) + '$' },
          { label: '$x_h/R$', value: '$' + x_h.toFixed(2) + '$' },
          { label: '$M_{\\mathrm{hole}}/M$', value: '$' + (r_h * r_h).toFixed(3) + '$' },
          { label: 'recipe', value: '$(0 - M_h x_h)/(M - M_h)$' }
        ]);
        legend('High-yield CM (from diameter)', rankingRows);

      } else if (state.geoModel === 'Semicircular Disk vs Wire') {
        ctx.fillStyle = 'rgba(204, 120, 92, 0.22)';
        ctx.strokeStyle = CORAL;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, R_px, Math.PI, 0, false);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(centerX, centerY, R_px, Math.PI, 0, false);
        ctx.stroke();

        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(centerX - R_px, centerY);
        ctx.lineTo(centerX + R_px, centerY);
        ctx.stroke();

        var diskCmY = centerY - (4 * R_px) / (3 * Math.PI);
        var wireCmY = centerY - (2 * R_px) / Math.PI;

        ctx.fillStyle = GOLD;
        ctx.beginPath();
        ctx.arc(centerX, wireCmY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        labelHalo(ctx, centerX - 12, wireCmY, 'wire', GOLD, 'right');

        ctx.fillStyle = TEAL;
        ctx.beginPath();
        ctx.arc(centerX, diskCmY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.stroke();
        labelHalo(ctx, centerX + 12, diskCmY, 'disk', TEAL, 'left');

        legend('Semicircle: hoop sits above the disk', [
          { label: 'wire $y_{\\mathrm{CM}}$', value: '$2R/\\pi \\approx 0.637R$' },
          { label: 'disk $y_{\\mathrm{CM}}$', value: '$4R/(3\\pi) \\approx 0.424R$' },
          { label: 'why', value: 'hoop mass is all at the rim' }
        ]);
        legend('High-yield CM (from diameter)', rankingRows);

      } else if (state.geoModel === 'Solid Hemisphere vs Shell') {
        ctx.fillStyle = 'rgba(204, 120, 92, 0.20)';
        ctx.strokeStyle = CORAL;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, R_px, Math.PI, 0, false);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'rgba(93, 184, 166, 0.18)';
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, R_px, R_px * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = TEAL;
        ctx.lineWidth = 1.6;
        ctx.stroke();

        var solidHemiY = centerY - (3 / 8) * R_px;
        var shellHemiY = centerY - 0.5 * R_px;

        ctx.fillStyle = GOLD;
        ctx.beginPath();
        ctx.arc(centerX, shellHemiY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        labelHalo(ctx, centerX - 12, shellHemiY, 'shell', GOLD, 'right');

        ctx.fillStyle = TEAL;
        ctx.beginPath();
        ctx.arc(centerX, solidHemiY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        labelHalo(ctx, centerX + 12, solidHemiY, 'solid', TEAL, 'left');

        legend('Hemisphere: shell vs solid', [
          { label: 'hollow shell $z_{\\mathrm{CM}}$', value: '$R/2 = 0.500R$' },
          { label: 'solid $z_{\\mathrm{CM}}$', value: '$3R/8 = 0.375R$' },
          { label: 'why', value: 'shell mass lives farther from the base' }
        ]);
        legend('High-yield CM (from diameter)', rankingRows);

      } else if (state.geoModel === 'Solid Cone vs Shell / Wedge') {
        var coneH = Math.min(R_px * 1.55, height * 0.72);
        var coneBaseR = R_px * 0.72;
        var baseY = Math.min(height - 28, centerY + coneH * 0.42);
        var apexY = baseY - coneH;

        ctx.fillStyle = 'rgba(204, 120, 92, 0.22)';
        ctx.strokeStyle = CORAL;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(centerX, apexY);
        ctx.lineTo(centerX + coneBaseR, baseY);
        ctx.lineTo(centerX - coneBaseR, baseY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = MUTED;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(centerX, apexY);
        ctx.lineTo(centerX, baseY);
        ctx.stroke();
        ctx.setLineDash([]);
        labelHalo(ctx, centerX + coneBaseR + 8, (apexY + baseY) / 2, 'h', MUTED, 'left');

        var solidConeY = baseY - 0.25 * coneH;
        var shellConeY = baseY - (1 / 3) * coneH;

        ctx.fillStyle = GOLD;
        ctx.beginPath();
        ctx.arc(centerX, shellConeY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        labelHalo(ctx, centerX + 12, shellConeY, 'shell h/3', GOLD, 'left');

        ctx.fillStyle = TEAL;
        ctx.beginPath();
        ctx.arc(centerX, solidConeY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        labelHalo(ctx, centerX - 12, solidConeY, 'solid h/4', TEAL, 'right');

        legend('Cone / wedge: from the base', [
          { label: 'hollow cone / wedge $z_{\\mathrm{CM}}$', value: '$h/3 \\approx 0.333h$' },
          { label: 'solid cone $z_{\\mathrm{CM}}$', value: '$h/4 = 0.250h$' }
        ]);

      } else {
        legend('Continuous center of mass', rankingRows);
      }
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
      For a discrete collection of $N$ point particles with masses $m_i$ and positions $\\mathbf{r}_i$, the Center of Mass $\\mathbf{r}_{\\text{CM}}$ is the balance point of the system. 

      Key PGRE mechanics theorems:
      1. **Zero Net Torque about CM under Uniform Gravity**: The net gravitational torque calculated about the Center of Mass is identically zero: $\\boldsymbol{\\tau}_{\\text{CM}} = \\sum_i (\\mathbf{r}_i - \\mathbf{r}_{\\text{CM}}) \\times m_i \\mathbf{g} = \\mathbf{0}$.
      2. **Center-of-Mass Reference Frame (Zero-Momentum Frame)**: In the CM frame, the total linear momentum is strictly zero: $\\mathbf{P}' = \\sum m_i \\mathbf{v}'_i = \\mathbf{0}$.
      3. **Internal vs External Forces**: Internal forces (explosions, springs, collisions, friction between objects) cannot alter $\\mathbf{v}_{\\text{CM}}$. Only external forces accelerate the Center of Mass ($M \\mathbf{a}_{\\text{CM}} = \\mathbf{F}_{\\text{ext}}$).
    `,
    derivationSteps: [
      {
        step: 1,
        latex: 'M = \\sum_{i=1}^N m_i, \\quad \\mathbf{r}_{\\text{CM}} = \\frac{1}{M} \\sum_{i=1}^N m_i \\mathbf{r}_i',
        explanation: 'Define total mass M and Center of Mass position vector for N point particles.'
      },
      {
        step: 2,
        latex: '\\mathbf{P}_{\\text{total}} = \\sum_{i=1}^N m_i \\mathbf{v}_i = M \\frac{d\\mathbf{r}_{\\text{CM}}}{dt} = M \\mathbf{v}_{\\text{CM}}',
        explanation: 'Differentiate with respect to time to relate total momentum to Center of Mass velocity.'
      },
      {
        step: 3,
        latex: '\\frac{d\\mathbf{P}_{\\text{total}}}{dt} = \\sum_{i=1}^N \\mathbf{F}_i^{\\text{ext}} + \\sum_{i \\neq j} \\mathbf{F}_{ij} = \\mathbf{F}_{\\text{ext}}',
        explanation: 'Internal interaction forces cancel pairwise by Newton’s 3rd Law (F_ij = -F_ji).'
      },
      {
        step: 4,
        latex: 'M \\mathbf{a}_{\\text{CM}} = \\mathbf{F}_{\\text{ext}}',
        explanation: 'The system Center of Mass moves identically to a single point particle of mass M subjected to net external force.'
      }
    ],
    limitingCases: [
      {
        condition: 'm_1 = m_2 = \\dots = m_N',
        implication: '\\mathbf{r}_{\\text{CM}} = \\frac{1}{N} \\sum_{i=1}^N \\mathbf{r}_i',
        description: 'Equal masses reduce the Center of Mass to the pure geometric centroid.'
      },
      {
        condition: 'm_1 \\gg m_2',
        implication: '\\mathbf{r}_{\\text{CM}} \\to \\mathbf{r}_1',
        description: 'Heavy mass dominates (e.g., in the Earth-Sun system, the barycenter resides inside the Sun).'
      },
      {
        condition: '\\mathbf{F}_{\\text{ext}} = \\mathbf{0} \\text{ (isolated system)}',
        implication: '\\mathbf{v}_{\\text{CM}} = \\text{const}',
        description: 'Internal forces cannot change $\\mathbf{v}_{\\mathrm{CM}}$. $\\Delta\\mathbf{r}_{\\mathrm{CM}}=\\mathbf{0}$ only if the system also starts at rest (e.g. a person walking on a boat with $F_{\\mathrm{ext},x}=0$). A projectile has $\\mathbf{F}_{\\mathrm{ext}}=M\\mathbf{g}$, so the CM follows the original parabola while every fragment is still in the air.'
      }
    ],
    greTraps: [
      {
        trap: 'Walking on a boat / shifting masses on a frictionless surface',
        fix: 'If there is no horizontal external force AND the system starts at rest, the CM does not move ($\\Delta X_{\\mathrm{CM}} = 0$). When a person of mass $m$ walks distance $L$ relative to a boat of mass $M$, the boat shifts relative to water by $\\Delta x_{\\mathrm{boat}} = -\\frac{m}{m + M} L$.'
      },
      {
        trap: 'Exploding projectile trajectory shift',
        fix: 'If a shell explodes into multiple fragments in mid-air, the Center of Mass of all fragments continues along the EXACT original parabolic trajectory until the first fragment hits the ground.'
      }
    ],
    parameters: [
      { id: 'numMasses', label: 'Mass Count ($N$)', min: 2, max: 5, step: 1, default: 3, unit: 'particles' },
      { id: 'simMode', label: 'Simulation Mode', type: 'select', options: ['Interactive Multi-Mass Pivot', 'Man Walking on Boat', 'Exploding Projectile Parabola'], default: 'Interactive Multi-Mass Pivot' },
      { id: 'simSpeed', label: 'Simulation Speed', min: 0.2, max: 3.0, step: 0.2, default: 1.0, unit: 'x' }
    ],
    init: function (container, state, redraw) {
      createStyleIfNotExists();
      state.numMasses = state.numMasses || 3;
      state.simMode = state.simMode || 'Interactive Multi-Mass Pivot';
      state.boatPersonPos = state.boatPersonPos !== undefined ? state.boatPersonPos : 0;
      state.boatAnimDir = state.boatAnimDir || 1;
      state.projT = state.projT || 0;
      state.dragIdx = -1;
      if (!state.particles || state.particles.length === 0) {
        state.particles = defaultParticles();
      }

      function setupPointerEvents(canvas) {
        if (!canvas || canvas._pgreBoundG5) return;
        canvas._pgreBoundG5 = true;

        canvas.addEventListener('pointerdown', function (e) {
          if (state.simMode !== 'Interactive Multi-Mass Pivot') return;
          var rect = canvas.getBoundingClientRect();
          var px = e.clientX - rect.left;
          var py = e.clientY - rect.top;
          var cssW = rect.width || 1;
          var cssH = rect.height || 1;
          var activeList = state.particles.slice(0, state.numMasses);
          state.dragIdx = -1;
          for (var i = 0; i < activeList.length; i++) {
            var mx = activeList[i].x * cssW;
            var my = activeList[i].y * cssH;
            var r = 16 + activeList[i].m * 3.5;
            var distSq = (px - mx) * (px - mx) + (py - my) * (py - my);
            if (distSq <= r * r) {
              state.dragIdx = i;
              if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
              break;
            }
          }
        });

        canvas.addEventListener('pointermove', function (e) {
          if (state.dragIdx >= 0 && state.particles[state.dragIdx]) {
            var rect = canvas.getBoundingClientRect();
            var px = (e.clientX - rect.left) / (rect.width || 1);
            var py = (e.clientY - rect.top) / (rect.height || 1);
            state.particles[state.dragIdx].x = Math.max(0.08, Math.min(0.92, px));
            state.particles[state.dragIdx].y = Math.max(0.14, Math.min(0.70, py));
            if (redraw) redraw();
          }
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
      state.simMode = state.simMode || 'Interactive Multi-Mass Pivot';
      state.numMasses = state.numMasses !== undefined ? Number(state.numMasses) : 3;
      if (state.numMasses < 2) state.numMasses = 2;
      if (state.numMasses > 5) state.numMasses = 5;
      state.boatPersonPos = state.boatPersonPos !== undefined ? state.boatPersonPos : 0;
      state.boatAnimDir = state.boatAnimDir || 1;
      state.projT = state.projT || 0;
      if (!state.particles || state.particles.length === 0) {
        state.particles = defaultParticles();
      }

      fillCream(ctx, width, height);

      var activeParticles = state.particles.slice(0, state.numMasses);
      var i;

      if (state.simMode === 'Interactive Multi-Mass Pivot') {
        var totalM = 0;
        var sumMx = 0;
        var sumMy = 0;
        for (i = 0; i < activeParticles.length; i++) {
          totalM += activeParticles[i].m;
          sumMx += activeParticles[i].m * (activeParticles[i].x * width);
          sumMy += activeParticles[i].m * (activeParticles[i].y * height);
        }
        var cmX = totalM > 0 ? sumMx / totalM : width * 0.5;
        var cmY = totalM > 0 ? sumMy / totalM : height * 0.45;

        ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.12);
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 4]);
        for (i = 0; i < activeParticles.length; i++) {
          ctx.beginPath();
          ctx.moveTo(cmX, cmY);
          ctx.lineTo(activeParticles[i].x * width, activeParticles[i].y * height);
          ctx.stroke();
        }
        ctx.setLineDash([]);

        var massRows = [];
        for (i = 0; i < activeParticles.length; i++) {
          var p = activeParticles[i];
          var px = p.x * width;
          var py = p.y * height;
          var rSize = 10 + p.m * 3.2;
          var fill = MASS_PALETTE[i] || p.color || CORAL;

          ctx.fillStyle = fill;
          ctx.beginPath();
          ctx.arc(px, py, rSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = (state.dragIdx === i) ? GOLD : INK;
          ctx.lineWidth = (state.dragIdx === i) ? 2.4 : 1.3;
          ctx.stroke();

          var labAlign = px > width * 0.78 ? 'right' : 'left';
          var labX = px > width * 0.78 ? px - rSize - 6 : px + rSize + 6;
          labelHalo(ctx, labX, py, p.label, INK, labAlign);
          massRows.push({ label: '$m_{' + (i + 1) + '}$', value: '$' + p.m.toFixed(1) + '\\,\\mathrm{kg}$' });
        }

        drawCMMark(ctx, cmX, cmY, 8);
        var cmLabAlign = cmX > width * 0.72 ? 'right' : 'left';
        var cmLabX = cmX > width * 0.72 ? cmX - 14 : cmX + 14;
        var cmLabY = cmY < 28 ? cmY + 16 : cmY - 14;
        labelHalo(ctx, cmLabX, cmLabY, 'CM', GOLD, cmLabAlign);

        var fY = height - 34;
        ctx.fillStyle = '#efe9de';
        ctx.fillRect(28, fY, width - 56, 5);
        ctx.fillStyle = ROSE;
        ctx.beginPath();
        ctx.moveTo(cmX, fY);
        ctx.lineTo(cmX - 11, fY + 22);
        ctx.lineTo(cmX + 11, fY + 22);
        ctx.closePath();
        ctx.fill();
        var fulcrumAlign = cmX < 90 ? 'left' : (cmX > width - 90 ? 'right' : 'center');
        labelHalo(ctx, cmX, height - 8, 'fulcrum', ROSE, fulcrumAlign);

        massRows.push({ label: '$M$', value: '$' + totalM.toFixed(1) + '\\,\\mathrm{kg}$' });
        massRows.push({ label: '$\\mathbf{r}_{\\mathrm{CM}}$', value: '$(' + (cmX / width).toFixed(2) + ',\\,' + (cmY / height).toFixed(2) + ')$' });
        massRows.push({ label: '$\\tau$ about CM', value: '$0$ under uniform $g$' });
        massRows.push({ label: 'drag', value: 'move any mass on the picture' });
        legend('Discrete CM (balance point)', massRows);

      } else if (state.simMode === 'Man Walking on Boat') {
        var m_man = 60;
        var M_boat = 140;
        var L_boat = Math.min(260, width * 0.42);
        var waterY = height * 0.62;

        state.boatPersonPos += state.boatAnimDir * 0.32 * dt;
        if (state.boatPersonPos > 1.0) { state.boatPersonPos = 1.0; state.boatAnimDir = -1; }
        if (state.boatPersonPos < 0.0) { state.boatPersonPos = 0.0; state.boatAnimDir = 1; }

        var cmFixedX = width * 0.50;
        var u = (state.boatPersonPos - 0.5) * L_boat;
        var x_boat_center = cmFixedX - (m_man / (M_boat + m_man)) * u;
        var x_person = x_boat_center + u;

        ctx.fillStyle = 'rgba(93, 184, 166, 0.22)';
        ctx.fillRect(0, waterY + 18, width, height - waterY - 18);
        ctx.strokeStyle = TEAL;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(0, waterY + 18);
        ctx.lineTo(width, waterY + 18);
        ctx.stroke();

        var bLeft = x_boat_center - L_boat * 0.5;
        var bRight = x_boat_center + L_boat * 0.5;
        ctx.fillStyle = DEEP;
        ctx.strokeStyle = CORAL;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bLeft - 16, waterY - 8);
        ctx.lineTo(bRight + 16, waterY - 8);
        ctx.lineTo(bRight - 8, waterY + 18);
        ctx.lineTo(bLeft + 8, waterY + 18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        labelHalo(ctx, bLeft - 8, waterY - 4, 'boat', INK, 'right');

        ctx.fillStyle = CORAL;
        ctx.beginPath();
        ctx.arc(x_person, waterY - 28, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = CORAL;
        ctx.fillRect(x_person - 5, waterY - 20, 10, 14);
        var manAlign = x_person > width * 0.78 ? 'right' : 'left';
        var manX = x_person > width * 0.78 ? x_person - 12 : x_person + 12;
        labelHalo(ctx, manX, waterY - 40, 'm', CORAL, manAlign);

        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 1.8;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(cmFixedX, 22);
        ctx.lineTo(cmFixedX, height - 10);
        ctx.stroke();
        ctx.setLineDash([]);
        labelHalo(ctx, cmFixedX + 10, 16, 'CM (fixed)', GOLD, 'left');

        legend('Walking on a boat (starts at rest, $F_{\\mathrm{ext},x}=0$)', [
          { label: '$m$ person', value: '$' + m_man + '\\,\\mathrm{kg}$' },
          { label: '$M$ boat', value: '$' + M_boat + '\\,\\mathrm{kg}$' },
          { label: '$\\Delta X_{\\mathrm{CM}}$', value: '$0$ because $\\mathbf{v}_{\\mathrm{CM}}(0)=\\mathbf{0}$' },
          { label: 'canoe shift', value: '$m L / (m + M)$' }
        ]);

      } else if (state.simMode === 'Exploding Projectile Parabola') {
        state.projT = (state.projT + dt * 0.8) % 3.0;
        var t = state.projT;
        var tExplode = 1.8;
        var startX = 48;
        var groundY = height - 36;
        var v0x = Math.min(190, width * 0.30);
        var v0y = -Math.min(210, height * 0.52);
        var gPx = Math.min(120, height * 0.30);

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
        for (st = 0; st <= 4.0; st += 0.04) {
          var cxp = startX + v0x * st;
          var cyp = groundY + v0y * st + 0.5 * gPx * st * st;
          if (st === 0) ctx.moveTo(cxp, cyp);
          else ctx.lineTo(cxp, cyp);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        var cmNowX = startX + v0x * t;
        var cmNowY = groundY + v0y * t + 0.5 * gPx * t * t;

        if (t < tExplode) {
          ctx.fillStyle = CORAL;
          ctx.beginPath();
          ctx.arc(cmNowX, cmNowY, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = INK;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        } else {
          var dtPost = t - tExplode;
          var xExplode = startX + v0x * tExplode;
          var yExplode = groundY + v0y * tExplode + 0.5 * gPx * tExplode * tExplode;
          var f1X = xExplode + (v0x - 50) * dtPost;
          var f1Y = yExplode + (v0y + gPx * tExplode - 60) * dtPost + 0.5 * gPx * dtPost * dtPost;
          var f2X = xExplode + (v0x + 50) * dtPost;
          var f2Y = yExplode + (v0y + gPx * tExplode + 60) * dtPost + 0.5 * gPx * dtPost * dtPost;
          if (f1Y > groundY) f1Y = groundY;
          if (f2Y > groundY) f2Y = groundY;

          ctx.fillStyle = TEAL;
          ctx.beginPath();
          ctx.arc(f1X, f1Y, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = INK;
          ctx.lineWidth = 1.1;
          ctx.stroke();
          var f1Align = f1X > width - 40 ? 'right' : 'left';
          labelHalo(ctx, f1X + (f1Align === 'left' ? 10 : -10), f1Y, '1', TEAL, f1Align);

          ctx.fillStyle = CORAL;
          ctx.beginPath();
          ctx.arc(f2X, f2Y, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          var f2Align = f2X > width - 40 ? 'right' : 'left';
          labelHalo(ctx, f2X + (f2Align === 'left' ? 10 : -10), f2Y, '2', CORAL, f2Align);
        }

        drawCMMark(ctx, cmNowX, cmNowY, 6);
        var cmPAlign = cmNowX > width * 0.72 ? 'right' : 'left';
        labelHalo(ctx, cmNowX + (cmPAlign === 'left' ? 12 : -12), cmNowY - 14, 'CM', GOLD, cmPAlign);

        legend('Exploding projectile', [
          { label: 'CM path', value: t < tExplode ? 'intact shell' : 'original parabola (internal forces cannot change $\\mathbf{a}_{\\mathrm{CM}}$)' },
          { label: '$\\mathbf{F}_{\\mathrm{ext}}$', value: '$M\\mathbf{g}$ until a fragment hits the ground' }
        ]);
      } else {
        legend('Discrete center of mass', [{ label: 'mode', value: String(state.simMode) }]);
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
Work is the energy transferred by a force acting over a displacement. Because work is defined by the dot product $dW = \\mathbf{F} \\cdot d\\mathbf{l} = F_\\parallel \\, dl$, only the force component aligned with the instantaneous tangent does work.

For a **conservative force** ($\\nabla \\times \\mathbf{F} = 0$), work is strictly path-independent and vanishes along any closed circuit ($\\oint \\mathbf{F} \\cdot d\\mathbf{l} = 0$). For **non-conservative forces** (such as friction or vortex force fields with non-zero curl), work depends on the specific path taken.
    `.trim(),
    derivationSteps: [
      "1. The infinitesimal work done over displacement $d\\mathbf{l} = (dx, dy, dz)$ is $dW = \\mathbf{F} \\cdot d\\mathbf{l} = F_x dx + F_y dy + F_z dz$.",
      "2. Total work along parameterized trajectory $\\mathbf{r}(t)$ from $t_a$ to $t_b$: $W = \\int_{t_a}^{t_b} \\mathbf{F}(\\mathbf{r}(t)) \\cdot \\mathbf{v}(t) \\, dt$.",
      "3. Substitute Newton's Second Law $\\mathbf{F}_{\\text{net}} = m \\frac{d\\mathbf{v}}{dt}$: $\\mathbf{F} \\cdot \\mathbf{v} = m \\frac{d\\mathbf{v}}{dt} \\cdot \\mathbf{v} = \\frac{d}{dt}\\left( \\frac{1}{2}m v^2 \\right)$.",
      "4. Integrating over time produces the Work-Kinetic Energy Theorem: $W_{\\text{net}} = \\int_{t_a}^{t_b} \\frac{d}{dt}\\left(\\frac{1}{2}m v^2\\right) dt = \\frac{1}{2}m v_b^2 - \\frac{1}{2}m v_a^2 = \\Delta K$.",
      "5. By Stokes' Theorem, the work around a closed loop equals the surface integral of the curl: $\\oint_C \\mathbf{F} \\cdot d\\mathbf{l} = \\iint_S (\\nabla \\times \\mathbf{F}) \\cdot d\\mathbf{A}$. If $\\nabla \\times \\mathbf{F} = 0$, work is path-independent."
    ],
    limitingCases: [
      { condition: 'Perpendicular Force ($\\mathbf{F} \\perp d\\mathbf{l}$)', result: '$W = 0$', description: 'Magnetic Lorentz force and centripetal forces do zero work.' },
      { condition: 'Constant Force ($\\mathbf{F} = \\text{const}$)', result: '$W = \\mathbf{F} \\cdot \\Delta \\mathbf{r}$', description: 'Work depends only on the net displacement vector.' },
      { condition: 'Conservative Field ($\\nabla \\times \\mathbf{F} = 0$)', result: '$W = -\\Delta U$', description: 'Path-independent line integral.' }
    ],
    greTraps: [
      { trap: 'Work Done by Magnetic Fields', explanation: 'Static magnetic fields do ZERO work on moving charged particles because $\\mathbf{F} = q(\\mathbf{v} \\times \\mathbf{B}) \\perp \\mathbf{v}$, so $\\mathbf{F} \\cdot d\\mathbf{l} = 0$.' },
      { trap: 'Work Done by Normal Forces', explanation: 'Normal forces do zero work on stationary surfaces, but CAN do non-zero work in moving reference frames (e.g. accelerating elevators or wedge blocks).' }
    ],
    parameters: [
      { id: 'field', label: 'Force Field', type: 'select', default: 'vortex', options: [
        { value: 'conservative', label: 'Conservative: $\\mathbf{F}=(-x,-y)$' },
        { value: 'vortex', label: 'Non-conservative (curl): $\\mathbf{F}=(-y,x)$' },
        { value: 'gravity', label: 'Constant gravity: $\\mathbf{F}=(0,-mg)$' }
      ]},
      { id: 'detour', label: 'Path 2 Bulge', type: 'range', min: -2, max: 2, step: 0.1, default: 1.2, unit: '' },
      { id: 'simSpeed', label: 'Simulation Speed', min: 0.2, max: 3.0, step: 0.2, default: 1.0, unit: 'x' }
    ],
    init: function (container, state, redraw) {
      if (typeof state.field !== 'string') state.field = 'vortex';
      state.detour = state.detour !== undefined ? Number(state.detour) : 1.2;
      state.tAnim = state.tAnim || 0;
    },
    draw: function (ctx, width, height, state, dt) {
      dt = clampDt(dt) * simSpeedOf(state);
      if (typeof state.field !== 'string') state.field = 'vortex';
      if (state.field !== 'conservative' && state.field !== 'vortex' && state.field !== 'gravity') {
        state.field = 'vortex';
      }
      state.detour = state.detour !== undefined ? Number(state.detour) : 1.2;
      if (state.detour !== state.detour) state.detour = 1.2;
      state.tAnim = ((state.tAnim || 0) + dt * 0.35) % 1.0;

      fillCream(ctx, width, height);
      if (U && typeof U.drawGrid === 'function') {
        U.drawGrid(ctx, width, height, 36);
      } else if (CV && typeof CV.drawGrid === 'function') {
        CV.drawGrid(ctx, width, height, 36);
      }

      var cx = width * 0.50;
      var cy = height * 0.52;
      var scale = Math.min((width - 96) / 6.2, (height - 88) / 4.6);

      function getF(x, y) {
        if (state.field === 'conservative') return { fx: -x, fy: -y };
        if (state.field === 'vortex') return { fx: -y, fy: x };
        return { fx: 0, fy: -1.5 };
      }

      var fieldColor = state.field === 'vortex'
        ? 'rgba(93, 184, 166, 0.45)'
        : (state.field === 'conservative' ? 'rgba(204, 120, 92, 0.42)' : 'rgba(212, 160, 23, 0.45)');

      var gx, gy;
      for (gx = -3.0; gx <= 3.0; gx += 0.85) {
        for (gy = -2.2; gy <= 2.2; gy += 0.85) {
          var f = getF(gx, gy);
          var sx = cx + gx * scale;
          var sy = cy - gy * scale;
          var fLen = Math.hypot(f.fx, f.fy);
          if (fLen > 0.05) {
            var drawLen = Math.min(20, fLen * 9);
            var angle = Math.atan2(-f.fy, f.fx);
            tinyArrow(ctx, sx, sy, sx + Math.cos(angle) * drawLen, sy + Math.sin(angle) * drawLen, fieldColor);
          }
        }
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
        var bulge = Math.sin(s * Math.PI) * state.detour;
        return {
          x: straight.x + (perpX / perpLen) * bulge,
          y: straight.y + (perpY / perpLen) * bulge
        };
      }

      function computeWork(pathFn) {
        var steps = 120;
        var ds = 1.0 / steps;
        var W = 0;
        var i;
        for (i = 0; i < steps; i++) {
          var s = i * ds;
          var pt1 = pathFn(s);
          var pt2 = pathFn(s + ds);
          var ff = getF((pt1.x + pt2.x) * 0.5, (pt1.y + pt2.y) * 0.5);
          W += ff.fx * (pt2.x - pt1.x) + ff.fy * (pt2.y - pt1.y);
        }
        return W;
      }

      var W1 = computeWork(getPath1);
      var W2 = computeWork(getPath2);

      ctx.strokeStyle = CORAL;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      var i;
      for (i = 0; i <= 60; i++) {
        var pt = getPath1(i / 60);
        var p1x = cx + pt.x * scale;
        var p1y = cy - pt.y * scale;
        if (i === 0) ctx.moveTo(p1x, p1y);
        else ctx.lineTo(p1x, p1y);
      }
      ctx.stroke();

      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (i = 0; i <= 60; i++) {
        var pt2 = getPath2(i / 60);
        var p2x = cx + pt2.x * scale;
        var p2y = cy - pt2.y * scale;
        if (i === 0) ctx.moveTo(p2x, p2y);
        else ctx.lineTo(p2x, p2y);
      }
      ctx.stroke();

      var mid1 = getPath1(0.52);
      var mid2 = getPath2(0.45);
      labelHalo(ctx, cx + mid1.x * scale + 10, cy - mid1.y * scale + 14, 'path 1', CORAL, 'left');
      var path2Side = state.detour >= 0 ? -16 : 16;
      labelHalo(ctx, cx + mid2.x * scale + path2Side, cy - mid2.y * scale + (state.detour >= 0 ? -12 : 14), 'path 2', GOLD, state.detour >= 0 ? 'right' : 'left');

      var ax = cx + pA.x * scale;
      var ay = cy - pA.y * scale;
      var bx = cx + pB.x * scale;
      var by = cy - pB.y * scale;

      ctx.fillStyle = EMERALD;
      ctx.beginPath();
      ctx.arc(ax, ay, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      labelHalo(ctx, ax - 10, ay + 14, 'A', EMERALD, 'right');

      ctx.fillStyle = ROSE;
      ctx.beginPath();
      ctx.arc(bx, by, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      labelHalo(ctx, bx + 10, by - 12, 'B', ROSE, 'left');

      var curPt = getPath2(state.tAnim);
      var curF = getF(curPt.x, curPt.y);
      var curSx = cx + curPt.x * scale;
      var curSy = cy - curPt.y * scale;
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(curSx, curSy, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      var fScale = 22 / Math.max(0.6, Math.hypot(curF.fx, curF.fy));
      var fEx = curSx + curF.fx * fScale;
      var fEy = curSy - curF.fy * fScale;
      if (CV && typeof CV.drawArrow === 'function') {
        CV.drawArrow(ctx, curSx, curSy, fEx, fEy, CORAL, 'F', 2, 7);
      } else {
        tinyArrow(ctx, curSx, curSy, fEx, fEy, CORAL);
        labelHalo(ctx, (curSx + fEx) / 2 + 10, (curSy + fEy) / 2, 'F', CORAL, 'left');
      }

      var isConserv = state.field !== 'vortex';
      var fieldName = state.field === 'conservative' ? '$\\mathbf{F}=(-x,-y)$' : (state.field === 'vortex' ? '$\\mathbf{F}=(-y,x)$' : '$\\mathbf{F}=(0,-mg)$');
      var curlStr = state.field === 'vortex' ? '$2\\hat{\\mathbf{k}}$ (nonzero)' : '$\\mathbf{0}$';
      legend('$W = \\int \\mathbf{F} \\cdot d\\mathbf{l}$', [
        { label: 'field', value: fieldName },
        { label: '$\\nabla\\times\\mathbf{F}$', value: curlStr },
        { label: '$W_1$', value: '$' + W1.toFixed(2) + '\\,\\mathrm{J}$' },
        { label: '$W_2$', value: '$' + W2.toFixed(2) + '\\,\\mathrm{J}$' },
        { label: 'path dependence', value: isConserv ? '$W_1 = W_2$ (conservative)' : '$W_1 \\neq W_2$ (path dependent)' },
        { label: 'loop $W_2 - W_1$', value: isConserv ? '$\\approx 0$' : '$' + (W2 - W1).toFixed(2) + '\\,\\mathrm{J}$' }
      ]);
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
