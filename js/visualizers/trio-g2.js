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

  function numParam(state, key, fallback) {
    var n = parseFloat(state && state[key]);
    return isFinite(n) ? n : fallback;
  }

  function legend(title, rows) {
    if (PGRE.appendVizLegend) PGRE.appendVizLegend(title, rows || []);
  }

  function halo(ctx, text, x, y, color, align) {
    if (!text) return;
    ctx.save();
    ctx.font = '600 11px Inter, -apple-system, sans-serif';
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    var w = ctx.measureText(String(text)).width;
    var pad = 4;
    var lx = x;
    if (align === 'left') lx = x;
    else if (align === 'right') lx = x - w;
    else lx = x - w / 2;
    ctx.fillStyle = PGRE.vizStageTheme().chipFade(0.92);
    ctx.fillRect(lx - pad, y - 8, w + pad * 2, 16);
    ctx.fillStyle = color || C.ink;
    ctx.fillText(String(text), x, y);
    ctx.restore();
  }

  function panelTitle(ctx, text, x, y, align) {
    ctx.save();
    ctx.font = '600 11px Inter, -apple-system, sans-serif';
    ctx.fillStyle = C.muted;
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(text), x, y);
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

  function strokeTrail(ctx, pts, rgb, lw) {
    if (!pts || pts.length < 2) return;
    ctx.save();
    var i;
    for (i = 0; i < pts.length - 1; i++) {
      ctx.strokeStyle = 'rgba(' + rgb + ',' + ((i / pts.length) * 0.88) + ')';
      ctx.lineWidth = lw || 2.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(pts[i].x, pts[i].y);
      ctx.lineTo(pts[i + 1].x, pts[i + 1].y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function dashedCircle(ctx, cx, cy, r, color, lw, dash) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lw || 1.6;
    ctx.setLineDash(dash || [5, 5]);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
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
      { id: 'mass', label: 'Mass ($m$)', min: 0.5, max: 5.0, step: 0.5, default: 2.0, unit: 'kg', hint: 'Inertia that must be given radial acceleration $v^2/r$. At fixed $v$ and $r$, $T = mv^2/r$ scales linearly with $m$.' },
      { id: 'speed', label: 'Speed ($v$)', min: 1.0, max: 8.0, step: 0.5, default: 3.5, unit: 'm/s', hint: 'Tangential speed. Required centripetal force $mv^2/r$ grows as $v^2$, so doubling $v$ quadruples $T$.' },
      { id: 'radius', label: 'Radius ($r$)', min: 0.40, max: 1.20, step: 0.05, default: 0.70, unit: 'm', hint: 'Radius of the constrained circle. At fixed $v$, a tighter $r$ raises $a_c = v^2/r$ and the tension that must supply it.' },
      { id: 'cutString', label: 'Cut tether (tangent fly-off)', type: 'toggle', default: false, unit: '', hint: 'Snap the tether: $T=0$ so $\\mathbf{F}_{\\mathrm{net}}=0$. The mass then flies in a straight line along the instantaneous tangent $\\mathbf{v}$, never radially outward.' },
      { id: 'simSpeed', label: 'Simulation Speed', min: 0.2, max: 3.0, step: 0.2, default: 1.0, unit: 'x' }
    ],

    init: function (container, state, redraw) {
      state._theta = 0;
      state._snapped = false;
      state._snapPos = null;
      state._snapVel = null;
      state._freePos = null;
      state._flyTrail = [];
      state._ticks = [];
      state._tickAcc = 0;
    },

    draw: function (ctx, width, height, state, dt) {
      creamFill(ctx, width, height);
      lightGrid(ctx, width, height, 40);
      dt = stepDt(dt);
      state = state || {};

      var m = numParam(state, 'mass', 2.0);
      var v = numParam(state, 'speed', 3.5);
      var r = numParam(state, 'radius', 0.70);
      var isCut = isOn(state.cutString, false);
      var simSpeed = numParam(state, 'simSpeed', 1.0);
      if (simSpeed < 0.2) simSpeed = 0.2;
      if (simSpeed > 3) simSpeed = 3;
      if (r < 0.05) r = 0.05;

      var cx = width * 0.5;
      var cy = height * 0.52;
      var tableR = Math.min(width, height) * 0.44;
      tableR = Math.max(70, tableR);
      var s = tableR / 1.28;
      var rDraw = r * s;
      var omega = v / r;
      var Fc = (m * v * v) / r;
      var vPx = omega * rDraw;
      var massR = Math.max(6, Math.min(16, 5 + 2.2 * m));
      var tFrac = Math.min(1, Fc / (Fc + 40));
      var tetherW = 1.5 + 2.2 * tFrac;

      state._theta = state._theta || 0;
      state._theta += omega * dt * simSpeed;
      var theta = state._theta;
      var gx = cx + rDraw * Math.cos(theta);
      var gy = cy + rDraw * Math.sin(theta);
      var tx = -Math.sin(theta);
      var ty = Math.cos(theta);

      if (isCut && !state._snapped) {
        state._snapped = true;
        state._snapPos = { x: gx, y: gy };
        state._snapVel = { x: vPx * tx, y: vPx * ty };
        state._freePos = { x: gx, y: gy };
        state._flyTrail = [];
      } else if (!isCut && state._snapped) {
        state._snapped = false;
        state._snapPos = null;
        state._snapVel = null;
        state._freePos = null;
        state._flyTrail = [];
      }

      if (state._snapped && state._freePos && state._snapVel) {
        state._freePos.x += state._snapVel.x * dt * simSpeed;
        state._freePos.y += state._snapVel.y * dt * simSpeed;
        if (state._freePos.x < -50 || state._freePos.x > width + 50 ||
            state._freePos.y < -50 || state._freePos.y > height + 50) {
          state._snapPos = { x: gx, y: gy };
          state._snapVel = { x: vPx * tx, y: vPx * ty };
          state._freePos = { x: gx, y: gy };
          state._flyTrail = [];
        }
        if (!state._flyTrail) state._flyTrail = [];
        state._flyTrail.push({ x: state._freePos.x, y: state._freePos.y });
        if (state._flyTrail.length > 90) state._flyTrail.shift();
      }

      if (state._rWas !== r || state._vWas !== v) {
        state._ticks = [];
        state._rWas = r;
        state._vWas = v;
        if (state._snapped) {
          state._snapPos = { x: gx, y: gy };
          state._snapVel = { x: vPx * tx, y: vPx * ty };
          state._freePos = { x: gx, y: gy };
          state._flyTrail = [];
        }
      }
      state._tickAcc = (state._tickAcc || 0) + dt * simSpeed;
      if (!state._ticks) state._ticks = [];
      while (state._tickAcc >= 0.14) {
        state._tickAcc -= 0.14;
        if (state._snapped && state._freePos) {
          state._ticks.push({ x: state._freePos.x, y: state._freePos.y, free: true });
        } else {
          state._ticks.push({ x: gx, y: gy, free: false });
        }
        if (state._ticks.length > 28) state._ticks.shift();
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, tableR, 0, Math.PI * 2);
      ctx.fillStyle = C.panel;
      ctx.fill();
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      dashedCircle(ctx, cx, cy, rDraw, C.coral, 1.8, [5, 5]);
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = C.coral;
      ctx.setLineDash([]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, rDraw, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      var k;
      for (k = 0; k < state._ticks.length; k++) {
        var tk = state._ticks[k];
        disc(ctx, tk.x, tk.y, tk.free ? 2.4 : 2.1, tk.free ? C.teal : C.coral, null);
      }

      if (state._snapped && state._snapPos) {
        ctx.save();
        ctx.strokeStyle = C.muted;
        ctx.globalAlpha = 0.45;
        ctx.lineWidth = 1.3;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(cx - (state._snapPos.x - cx) * 0.25, cy - (state._snapPos.y - cy) * 0.25);
        ctx.lineTo(state._snapPos.x + (state._snapPos.x - cx) * 0.55, state._snapPos.y + (state._snapPos.y - cy) * 0.55);
        ctx.stroke();
        ctx.restore();

        var svx = state._snapVel.x;
        var svy = state._snapVel.y;
        var sm = Math.hypot(svx, svy) || 1;
        ctx.save();
        ctx.strokeStyle = C.teal;
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 5]);
        ctx.beginPath();
        ctx.moveTo(state._snapPos.x - (svx / sm) * 40, state._snapPos.y - (svy / sm) * 40);
        ctx.lineTo(state._snapPos.x + (svx / sm) * tableR * 1.6, state._snapPos.y + (svy / sm) * tableR * 1.6);
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = C.rose;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + (state._snapPos.x - cx) * 0.22, cy + (state._snapPos.y - cy) * 0.22);
        ctx.stroke();
        ctx.restore();

        strokeTrail(ctx, state._flyTrail, '93,184,166', 2.6);
        disc(ctx, state._snapPos.x, state._snapPos.y, 3.5, C.rose, C.ink);
        halo(ctx, 'release', state._snapPos.x + 12, state._snapPos.y - 12, C.rose, 'left');

        disc(ctx, gx, gy, massR, 'rgba(204,120,92,0.28)', C.coral);

        disc(ctx, state._freePos.x, state._freePos.y, massR, C.teal, C.ink);
        var sLen = 36;
        arrow(ctx, state._freePos.x, state._freePos.y,
          state._freePos.x + (svx / sm) * sLen, state._freePos.y + (svy / sm) * sLen, C.emerald, 2.4);
        halo(ctx, 'v', state._freePos.x + (svx / sm) * (sLen + 10),
          state._freePos.y + (svy / sm) * (sLen + 10), C.emerald, 'center');
      } else {
        ctx.save();
        ctx.strokeStyle = C.muted;
        ctx.lineWidth = tetherW;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(gx, gy);
        ctx.stroke();
        ctx.restore();

        var tLen = 18 + rDraw * 0.28 * tFrac;
        var ux = (cx - gx) / Math.max(rDraw, 1);
        var uy = (cy - gy) / Math.max(rDraw, 1);
        arrow(ctx, gx, gy, gx + ux * tLen, gy + uy * tLen, C.rose, 2.6);
        halo(ctx, 'T', gx + ux * (tLen * 0.55) - uy * 12, gy + uy * (tLen * 0.55) + ux * 12, C.rose, 'center');

        var vLen = Math.min(42, rDraw * 0.34);
        arrow(ctx, gx, gy, gx + tx * vLen, gy + ty * vLen, C.emerald, 2.4);
        halo(ctx, 'v', gx + tx * (vLen + 11), gy + ty * (vLen + 11), C.emerald, 'center');

        disc(ctx, gx, gy, massR, C.coral, C.ink);
      }

      disc(ctx, cx, cy, 7, C.ink, C.gold);
      disc(ctx, cx, cy, 2.4, C.gold, null);

      if (isCut) {
        legend('Centripetal dynamics', [
          { label: '$F_{\\mathrm{net}}$', value: '$0$', hint: 'With no real force after the cut, $\\mathbf{a}=0$ and $\\mathbf{v}$ is constant (Newton 1st law).' },
          { label: '$T$', value: '$0$ (cut)', hint: 'A cut string cannot pull. Removing $T$ removes the only inward force that had been supplying $mv^2/r$.' },
          { label: '$m$', value: '$' + m.toFixed(1) + '\\,\\mathrm{kg}$', hint: 'Inertia is unchanged by the cut. Because $T\\perp v$ before the snap, $K$ is unchanged too.' },
          { label: '$v$', value: '$' + v.toFixed(1) + '\\,\\mathrm{m/s}$', hint: 'Speed just after the snap equals the orbital speed just before: the cut does no impulse along $\\mathbf{v}$.' },
          { label: '$r$', value: '$' + r.toFixed(2) + '\\,\\mathrm{m}$', hint: 'Radius of the circle the mass was on. After the cut the path is straight, so this $r$ is no longer a curvature radius.' },
          { label: '$K = \\frac{1}{2}mv^2$', value: '$' + (0.5 * m * v * v).toFixed(1) + '\\,\\mathrm{J}$', hint: 'Work by $T$ was always zero ($T\\perp v$), so kinetic energy is the same on the circle and on the fly-off.' },
          { label: 'Path', value: 'inertial tangent (not radial)', hint: 'GRE trap: the mass does not fly radially outward. It continues along $\\mathbf{v}$ at the release point.' }
        ]);
      } else {
        legend('Centripetal dynamics', [
          { label: '$T = mv^2/r$', value: '$' + Fc.toFixed(1) + '\\,\\mathrm{N}$', hint: 'This tension is the centripetal force. Do not draw a separate $F_c$ on an FBD; $T$ is the real inward force.' },
          { label: '$m$', value: '$' + m.toFixed(1) + '\\,\\mathrm{kg}$', hint: 'Larger mass at the same $v$ and $r$ needs a proportionally larger $T$.' },
          { label: '$v$', value: '$' + v.toFixed(1) + '\\,\\mathrm{m/s}$', hint: 'Speed on the circle. Because $T\\propto v^2$, a modest increase in $v$ is a large increase in tension.' },
          { label: '$r$', value: '$' + r.toFixed(2) + '\\,\\mathrm{m}$', hint: 'Instantaneous radius of curvature. Shrinking $r$ at fixed $v$ raises $a_c = v^2/r$.' },
          { label: '$\\omega = v/r$', value: '$' + omega.toFixed(2) + '\\,\\mathrm{rad/s}$', hint: 'Angular speed on the circle. Equivalently $T = m\\omega^2 r$.' },
          { label: 'Work by $T$', value: '$0$ ($T \\perp v$)', hint: 'A force perpendicular to the displacement does no work, so $K$ is constant on the uniform circle.' },
          { label: 'Path', value: 'uniform circle', hint: 'Uniform circular motion: $|\\mathbf{v}|$ is fixed and $\\mathbf{a}$ is purely radial inward.' }
        ]);
      }
      var spots14 = [];
      if (state._snapped && state._freePos && state._snapPos && state._snapVel) {
        var smH = Math.hypot(state._snapVel.x, state._snapVel.y) || 1;
        var sLenH = 36;
        spots14.push(
          { id: 'mass', kind: 'circle', x: state._freePos.x, y: state._freePos.y, r: massR + 8, title: 'Free mass $m$', body: 'Tether gone: $\\mathbf{F}_{\\mathrm{net}}=0$, so this mass coasts at constant $v = ' + v.toFixed(1) + '\\,\\mathrm{m/s}$ along the release tangent.' },
          { id: 'v', kind: 'segment', x1: state._freePos.x, y1: state._freePos.y, x2: state._freePos.x + (state._snapVel.x / smH) * sLenH, y2: state._freePos.y + (state._snapVel.y / smH) * sLenH, halfW: 8, title: 'Velocity $\\mathbf{v}$', body: 'Frozen at the instant of the snap. Direction stays tangent to the old circle, never radial.' },
          { id: 'release', kind: 'circle', x: state._snapPos.x, y: state._snapPos.y, r: 10, title: 'Release point', body: 'Where the string snapped. The fly-off line is the tangent here, not the outward radius.' },
          { id: 'ghost', kind: 'circle', x: gx, y: gy, r: massR + 6, title: 'Would-be orbital mass', body: 'Faint marker of where $m$ would be if the tether still supplied $T = mv^2/r = ' + Fc.toFixed(1) + '\\,\\mathrm{N}$.' },
          { id: 'stub', kind: 'segment', x1: cx, y1: cy, x2: cx + (state._snapPos.x - cx) * 0.22, y2: cy + (state._snapPos.y - cy) * 0.22, halfW: 8, title: 'Cut tether stub', body: '$T = 0$. The remaining stump cannot provide the centripetal force.' },
          { id: 'tangent', kind: 'segment', x1: state._snapPos.x, y1: state._snapPos.y, x2: state._snapPos.x + (state._snapVel.x / smH) * tableR * 0.8, y2: state._snapPos.y + (state._snapVel.y / smH) * tableR * 0.8, halfW: 8, title: 'Inertial tangent', body: 'Straight-line coast $\\mathbf{r}(t)=\\mathbf{r}_0+\\mathbf{v}_0 t$. GRE trap: this is not a radial fly-out.' }
        );
      } else {
        var tLenH = 18 + rDraw * 0.28 * tFrac;
        var uxH = (cx - gx) / Math.max(rDraw, 1);
        var uyH = (cy - gy) / Math.max(rDraw, 1);
        var vLenH = Math.min(42, rDraw * 0.34);
        spots14.push(
          { id: 'mass', kind: 'circle', x: gx, y: gy, r: massR + 8, title: 'Orbiting mass $m$', body: '$m = ' + m.toFixed(1) + '\\,\\mathrm{kg}$ on a circle of $r = ' + r.toFixed(2) + '\\,\\mathrm{m}$ at $v = ' + v.toFixed(1) + '\\,\\mathrm{m/s}$.' },
          { id: 'T', kind: 'segment', x1: gx, y1: gy, x2: gx + uxH * tLenH, y2: gy + uyH * tLenH, halfW: 8, title: 'Tension $\\mathbf{T}$', body: 'The real inward force. $T = mv^2/r = ' + Fc.toFixed(1) + '\\,\\mathrm{N}$. Do not also draw an $F_c$ on the FBD.' },
          { id: 'v', kind: 'segment', x1: gx, y1: gy, x2: gx + tx * vLenH, y2: gy + ty * vLenH, halfW: 8, title: 'Velocity $\\mathbf{v}$', body: 'Tangential. $T\\perp v$ so tension does no work and $|\\mathbf{v}|$ stays $' + v.toFixed(1) + '\\,\\mathrm{m/s}$.' },
          { id: 'tether', kind: 'segment', x1: cx, y1: cy, x2: gx, y2: gy, halfW: 8, title: 'Tether', body: 'Constraint that supplies $T$. Line thickness tracks $T = ' + Fc.toFixed(1) + '\\,\\mathrm{N}$.' }
        );
      }
      spots14.push(
        { id: 'pivot', kind: 'circle', x: cx, y: cy, r: 12, title: 'Fixed pivot', body: 'Origin of $\\mathbf{r}$. The string pulls the mass toward this point, producing $\\mathbf{a}_c = -v^2/r\\,\\hat{\\mathbf{r}}$.' },
        { id: 'orbit', kind: 'ring', x: cx, y: cy, r: rDraw, halfW: 8, title: 'Constrained circle', body: 'Path of radius $r = ' + r.toFixed(2) + '\\,\\mathrm{m}$. Required $a_c = v^2/r = ' + (v * v / r).toFixed(2) + '\\,\\mathrm{m/s}^2$.' },
        { id: 'table', kind: 'circle', x: cx, y: cy, r: tableR, title: 'Table', body: 'Horizontal plane of the motion. With no friction, the only horizontal force is the tether.' }
      );
      if (PGRE.setVizHotspots) PGRE.setVizHotspots(spots14);
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
In the **Rotating Frame** (where the turntable appears stationary), the exact same physical trajectory appears dramatically curved, deflected sideways by the Coriolis force. In a counter-clockwise rotating frame ($\\mathbf{\\Omega} > 0$), the deflection is always to the **right** of the direction of relative motion.`,

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
      { id: 'omega', label: 'Turntable spin ($\\Omega$)', min: -2.5, max: 2.5, step: 0.25, default: 1.0, unit: 'rad/s', hint: 'Signed table spin. $\\mathbf{F}_{\\mathrm{Cor}}=-2m(\\boldsymbol{\\Omega}\\times\\mathbf{v}_{\\mathrm{rot}})$: CCW ($\\Omega>0$) deflects to the right of $\\mathbf{v}_{\\mathrm{rot}}$; CW to the left. $\\Omega=0$ recovers a straight inertial throw.' },
      { id: 'launchSpeed', label: 'Throw speed ($v_{\\mathrm{rot}}$)', min: 0.6, max: 2.2, step: 0.1, default: 1.2, unit: 'm/s', hint: 'Speed of the throw as measured on the table. Coriolis grows as $|\\mathbf{F}_{\\mathrm{Cor}}|=2m|\\Omega||v_{\\mathrm{rot}}|$; a stationary puck ($v_{\\mathrm{rot}}=0$) feels only centrifugal force.' },
      { id: 'launchAngle', label: 'Aim offset', min: -60, max: 60, step: 5, default: 0, unit: 'deg', hint: 'Aim offset in the rotating frame. Nonzero angle tilts $\\mathbf{v}_{\\mathrm{rot}}$ off the thrower-catcher line, so even the inertial straight-line miss is biased before Coriolis curves it further.' },
      { id: 'showForces', label: 'Show fictitious vectors', type: 'toggle', default: true, unit: '', hint: 'Toggle the fictitious vectors in the rotating panel. $\\mathbf{F}_{\\mathrm{Cor}}\\perp\\mathbf{v}_{\\mathrm{rot}}$ (does no work); $\\mathbf{F}_{\\mathrm{cent}}=m\\Omega^2\\mathbf{r}_\\perp$ is purely outward.' },
      { id: 'simSpeed', label: 'Simulation Speed', min: 0.2, max: 3.0, step: 0.2, default: 1.0, unit: 'x' }
    ],

    init: function (container, state, redraw) {
      state._t = 0;
      state._inertialTrail = [];
      state._rotTrail = [];
    },

    onParamChange: function (id, val, state) {
      if (!state) return;
      if (id === 'omega' || id === 'launchSpeed' || id === 'launchAngle') {
        state._t = 0;
        state._inertialTrail = [];
        state._rotTrail = [];
      }
    },

    draw: function (ctx, width, height, state, dt) {
      creamFill(ctx, width, height);
      lightGrid(ctx, width, height, 40);
      dt = stepDt(dt);
      state = state || {};

      var Omega = numParam(state, 'omega', 1.0);
      var v0 = numParam(state, 'launchSpeed', 1.2);
      var angleDeg = numParam(state, 'launchAngle', 0);
      var showVecs = isOn(state.showForces, true);
      var simSpeed = numParam(state, 'simSpeed', 1.0);
      if (simSpeed < 0.2) simSpeed = 0.2;
      if (simSpeed > 3) simSpeed = 3;

      var alpha = (angleDeg * Math.PI) / 180;
      var padT = 26;
      var midX = width * 0.5;
      var leftCX = width * 0.25;
      var rightCX = width * 0.75;
      var cy = padT + (height - padT) * 0.52;
      var Rpx = Math.max(52, Math.min(width * 0.205, (height - padT) * 0.40));
      var s = Rpx;
      var R = 1;

      var xt = -0.70 * R;
      var yt = 0;
      var xf = 0.70 * R;
      var yf = 0;
      var vrx0 = v0 * Math.cos(alpha);
      var vry0 = v0 * Math.sin(alpha);
      var vinx = vrx0 + (-Omega * yt);
      var viny = vry0 + (Omega * xt);

      var dStep = dt * simSpeed;
      state._t = (state._t || 0) + dStep;
      var t = state._t;
      var xin = xt + vinx * t;
      var yin = yt + viny * t;
      var rho = Math.hypot(xin, yin);
      if (t > 3.6 || rho > 1.35 * R) {
        state._t = 0;
        t = 0;
        xin = xt;
        yin = yt;
        rho = Math.hypot(xin, yin);
        state._inertialTrail = [];
        state._rotTrail = [];
      }

      var phi = Omega * t;
      var cP = Math.cos(phi);
      var sP = Math.sin(phi);
      var xrot = xin * cP + yin * sP;
      var yrot = -xin * sP + yin * cP;
      var xfi = xf * cP - yf * sP;
      var yfi = xf * sP + yf * cP;
      var xti = xt * cP - yt * sP;
      var yti = xt * sP + yt * cP;

      var omxXin = -Omega * yin;
      var omxYin = Omega * xin;
      var vrelx = vinx - omxXin;
      var vrely = viny - omxYin;
      var vrotX = vrelx * cP + vrely * sP;
      var vrotY = -vrelx * sP + vrely * cP;

      if (!state._inertialTrail) state._inertialTrail = [];
      if (!state._rotTrail) state._rotTrail = [];
      if (dt > 0) {
        state._inertialTrail.push({ x: leftCX + xin * s, y: cy - yin * s });
        state._rotTrail.push({ x: rightCX + xrot * s, y: cy - yrot * s });
        if (state._inertialTrail.length > 80) state._inertialTrail.shift();
        if (state._rotTrail.length > 80) state._rotTrail.shift();
      }

      ctx.save();
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(midX + 0.5, 8);
      ctx.lineTo(midX + 0.5, height - 8);
      ctx.stroke();
      ctx.restore();

      panelTitle(ctx, 'Lab (inertial)', leftCX, 14, 'center');
      panelTitle(ctx, 'Table (rotating)', rightCX, 14, 'center');

      function omegaArc(tcx, tcy, sense) {
        if (Math.abs(sense) < 0.05) return;
        var rad = 13;
        var a0 = -0.85;
        var a1 = 0.85;
        ctx.save();
        ctx.strokeStyle = C.gold;
        ctx.fillStyle = C.gold;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        if (sense > 0) ctx.arc(tcx, tcy, rad, a0, a1, false);
        else ctx.arc(tcx, tcy, rad, Math.PI - a0, Math.PI - a1, true);
        ctx.stroke();
        var ae = sense > 0 ? a1 : (Math.PI - a1);
        var dir = sense > 0 ? 1 : -1;
        var hx = tcx + rad * Math.cos(ae);
        var hy = tcy + rad * Math.sin(ae);
        var tang = ae + dir * Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(hx - 6 * Math.cos(tang - 0.45), hy - 6 * Math.sin(tang - 0.45));
        ctx.lineTo(hx - 6 * Math.cos(tang + 0.45), hy - 6 * Math.sin(tang + 0.45));
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      function drawTable(tcx, tcy, tablePhi, spinningLab) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(tcx, tcy, Rpx, 0, Math.PI * 2);
        ctx.fillStyle = C.panel;
        ctx.fill();
        ctx.strokeStyle = spinningLab ? C.coral : C.gold;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.strokeStyle = spinningLab ? 'rgba(204,120,92,0.28)' : 'rgba(212,160,23,0.30)';
        ctx.lineWidth = 1;
        var i;
        for (i = 0; i < 8; i++) {
          var sp = tablePhi + (i * Math.PI) / 4;
          ctx.beginPath();
          ctx.moveTo(tcx, tcy);
          ctx.lineTo(tcx + Rpx * Math.cos(sp), tcy - Rpx * Math.sin(sp));
          ctx.stroke();
        }
        disc(ctx, tcx, tcy, 3.5, C.ink, null);
        ctx.restore();
      }

      drawTable(leftCX, cy, phi, true);
      drawTable(rightCX, cy, 0, false);
      omegaArc(leftCX, cy, Omega);
      omegaArc(rightCX, cy, Omega);

      var leftBounds = { x: 4, y: padT, w: midX - 8, h: height - padT - 6 };
      var rightBounds = { x: midX + 4, y: padT, w: width - midX - 8, h: height - padT - 6 };

      function seat(px, py, fill) {
        disc(ctx, px, py, 6, fill, C.ink);
      }

      ctx.save();
      ctx.beginPath();
      ctx.rect(leftBounds.x, leftBounds.y, leftBounds.w, leftBounds.h);
      ctx.clip();
      ctx.save();
      ctx.strokeStyle = C.gold;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(leftCX + xti * s, cy - yti * s);
      ctx.lineTo(leftCX + xfi * s, cy - yfi * s);
      ctx.stroke();
      ctx.restore();
      seat(leftCX + xti * s, cy - yti * s, C.coral);
      seat(leftCX + xfi * s, cy - yfi * s, C.gold);
      strokeTrail(ctx, state._inertialTrail, '204,120,92', 2.5);
      var curInX = leftCX + xin * s;
      var curInY = cy - yin * s;
      disc(ctx, curInX, curInY, 7, C.coral, C.ink);
      var vInMag = Math.hypot(vinx, viny) || 1;
      var vInLen = 34;
      arrow(ctx, curInX, curInY,
        curInX + (vinx / vInMag) * vInLen,
        curInY - (viny / vInMag) * vInLen, C.emerald, 2.2);
      halo(ctx, 'v', curInX + (vinx / vInMag) * (vInLen + 10),
        curInY - (viny / vInMag) * (vInLen + 10), C.emerald, 'center');
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.rect(rightBounds.x, rightBounds.y, rightBounds.w, rightBounds.h);
      ctx.clip();
      ctx.save();
      ctx.strokeStyle = C.gold;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(rightCX + xt * s, cy - yt * s);
      ctx.lineTo(rightCX + xf * s, cy - yf * s);
      ctx.stroke();
      ctx.restore();
      seat(rightCX + xt * s, cy - yt * s, C.coral);
      seat(rightCX + xf * s, cy - yf * s, C.gold);
      strokeTrail(ctx, state._rotTrail, '93,184,166', 2.5);
      var curRotX = rightCX + xrot * s;
      var curRotY = cy - yrot * s;
      disc(ctx, curRotX, curRotY, 7, C.teal, C.ink);
      var vRotMag = Math.hypot(vrotX, vrotY) || 1;
      var vRotLen = 34;
      arrow(ctx, curRotX, curRotY,
        curRotX + (vrotX / vRotMag) * vRotLen,
        curRotY - (vrotY / vRotMag) * vRotLen, C.emerald, 2.0);

      if (showVecs) {
        var fCorX = 2 * Omega * vrotY;
        var fCorY = -2 * Omega * vrotX;
        var fCorMag = Math.hypot(fCorX, fCorY);
        if (fCorMag > 1e-3) {
          var fLen = 42;
          var fux = fCorX / fCorMag;
          var fuy = fCorY / fCorMag;
          arrow(ctx, curRotX, curRotY,
            curRotX + fux * fLen, curRotY - fuy * fLen, C.violet, 2.4);
          halo(ctx, 'F_Cor', curRotX + fux * fLen + 10, curRotY - fuy * fLen, C.violet, 'center');
        }
        var fCentX = Omega * Omega * xrot;
        var fCentY = Omega * Omega * yrot;
        var fCentMag = Math.hypot(fCentX, fCentY);
        if (fCentMag > 1e-3) {
          var cLen = 26;
          var cux = fCentX / fCentMag;
          var cuy = fCentY / fCentMag;
          arrow(ctx, curRotX, curRotY,
            curRotX + cux * cLen, curRotY - cuy * cLen, C.gold, 2.0);
          halo(ctx, 'F_cent', curRotX + cux * cLen, curRotY - cuy * cLen - 12, C.gold, 'center');
        }
      }
      ctx.restore();

      var vRotAbs = Math.hypot(vrotX, vrotY);
      var fCorAbs = 2 * Math.abs(Omega) * vRotAbs;
      var defl = 'none ($\\Omega=0$)';
      if (Omega > 0.02) defl = 'right of $v$ (CCW)';
      else if (Omega < -0.02) defl = 'left of $v$ (CW)';
      legend('Coriolis dynamics', [
        { label: '$\\Omega$', value: '$' + Omega.toFixed(2) + '\\,\\mathrm{rad/s}$', hint: 'The frame angular velocity. It is not a real force; it only appears when you write $m\\mathbf{a}_{\\mathrm{rot}}=\\mathbf{F}_{\\mathrm{real}}+\\mathbf{F}_{\\mathrm{fict}}$.' },
        { label: '$|\\mathbf{F}_{\\mathrm{Cor}}|$ ($m=1$)', value: '$' + fCorAbs.toFixed(2) + '\\,\\mathrm{N}$', hint: 'Magnitude $2m|\\Omega||v_{\\mathrm{rot}}|$ with $m=1\\,\\mathrm{kg}$ here. The factor of 2 is a GRE favorite: one $\\Omega$ from rotating basis vectors, one from advecting $\\mathbf{v}_{\\mathrm{rot}}$.' },
        { label: '$|\\mathbf{v}_{\\mathrm{rot}}|$', value: '$' + vRotAbs.toFixed(2) + '\\,\\mathrm{m/s}$', hint: 'Speed relative to the table. Coriolis vanishes if this is zero or if $\\mathbf{v}_{\\mathrm{rot}}\\parallel\\boldsymbol{\\Omega}$.' },
        { label: 'Deflection', value: defl, hint: 'CCW rotation ($\\Omega>0$) deflects to the right of the velocity; CW to the left. Same rule as the Northern-Hemisphere weather mnemonic.' },
        { label: 'Work by $\\mathbf{F}_{\\mathrm{Cor}}$', value: '$0$ ($\\mathbf{F}_{\\mathrm{Cor}} \\perp \\mathbf{v}_{\\mathrm{rot}}$)', hint: '$\\mathbf{F}_{\\mathrm{Cor}}\\cdot\\mathbf{v}_{\\mathrm{rot}}=0$ identically, so Coriolis changes direction but not rotating-frame speed.' }
      ]);
      var spots22 = [
        { id: 'puckIn', kind: 'circle', x: curInX, y: curInY, r: 12, title: 'Puck (inertial frame)', body: 'No real horizontal force, so the lab path is a straight line at $v_{\\mathrm{in}} = ' + Math.hypot(vinx, viny).toFixed(2) + '\\,\\mathrm{m/s}$.' },
        { id: 'puckRot', kind: 'circle', x: curRotX, y: curRotY, r: 12, title: 'Puck (rotating frame)', body: 'Same motion, viewed from the table. The curve is fictitious: $\\mathbf{F}_{\\mathrm{Cor}}=-2m(\\boldsymbol{\\Omega}\\times\\mathbf{v}_{\\mathrm{rot}})$ with $|\\mathbf{F}_{\\mathrm{Cor}}| = ' + fCorAbs.toFixed(2) + '\\,\\mathrm{N}$.' },
        { id: 'vIn', kind: 'segment', x1: curInX, y1: curInY, x2: curInX + (vinx / vInMag) * vInLen, y2: curInY - (viny / vInMag) * vInLen, halfW: 8, title: 'Inertial velocity', body: 'Constant lab velocity. $v_{\\mathrm{in}} = v_{\\mathrm{rot}}+\\boldsymbol{\\Omega}\\times\\mathbf{r}$ at launch, then never changes.' },
        { id: 'vRot', kind: 'segment', x1: curRotX, y1: curRotY, x2: curRotX + (vrotX / vRotMag) * vRotLen, y2: curRotY - (vrotY / vRotMag) * vRotLen, halfW: 8, title: 'Rotating-frame velocity', body: '$|\\mathbf{v}_{\\mathrm{rot}}| = ' + vRotAbs.toFixed(2) + '\\,\\mathrm{m/s}$. Coriolis is always perpendicular to this vector, so it does no work.' },
        { id: 'throwL', kind: 'circle', x: leftCX + xti * s, y: cy - yti * s, r: 10, title: 'Thrower (lab)', body: 'Launch seat, rotating with the table in the lab view. The puck leaves this point with $\\mathbf{v}_{\\mathrm{in}}=\\mathbf{v}_{\\mathrm{rot}}+\\boldsymbol{\\Omega}\\times\\mathbf{r}$.' },
        { id: 'catchL', kind: 'circle', x: leftCX + xfi * s, y: cy - yfi * s, r: 10, title: 'Target (lab)', body: 'Catcher rotating with the table. The inertial straight line generally misses this moving seat.' },
        { id: 'throwR', kind: 'circle', x: rightCX + xt * s, y: cy - yt * s, r: 10, title: 'Thrower (table frame)', body: 'Fixed on the table. Launch is from $x = ' + xt.toFixed(2) + '\\,R$ along the aimed $\\mathbf{v}_{\\mathrm{rot}}$.' },
        { id: 'catchR', kind: 'circle', x: rightCX + xf * s, y: cy - yf * s, r: 10, title: 'Target (table frame)', body: 'Fixed catcher. In this frame the puck curves away from the intended dashed line under Coriolis.' },
        { id: 'aimL', kind: 'segment', x1: leftCX + xti * s, y1: cy - yti * s, x2: leftCX + xfi * s, y2: cy - yfi * s, halfW: 8, title: 'Intended throw (lab)', body: 'Thrower-catcher chord, spinning with the table. The puck does not follow this line in the lab.' },
        { id: 'aimR', kind: 'segment', x1: rightCX + xt * s, y1: cy - yt * s, x2: rightCX + xf * s, y2: cy - yf * s, halfW: 8, title: 'Intended throw (table)', body: 'Fixed dashed chord in the rotating frame. Coriolis peels the actual trail off this line.' },
        { id: 'hubL', kind: 'circle', x: leftCX, y: cy, r: 14, title: 'Lab turntable hub', body: 'Table angle $\\phi=\\Omega t$ with $\\Omega = ' + Omega.toFixed(2) + '\\,\\mathrm{rad/s}$. The puck ignores this rotation and goes straight.' },
        { id: 'hubR', kind: 'circle', x: rightCX, y: cy, r: 14, title: 'Rotating-frame origin', body: 'Here the table is at rest. Fictitious Coriolis and centrifugal forces are added so $m\\mathbf{a}_{\\mathrm{rot}}=\\mathbf{F}_{\\mathrm{real}}+\\mathbf{F}_{\\mathrm{fict}}$.' }
      ];
      if (showVecs) {
        var fCorXh = 2 * Omega * vrotY;
        var fCorYh = -2 * Omega * vrotX;
        var fCorMagH = Math.hypot(fCorXh, fCorYh);
        if (fCorMagH > 1e-3) {
          spots22.push({ id: 'fCor', kind: 'segment', x1: curRotX, y1: curRotY, x2: curRotX + (fCorXh / fCorMagH) * 42, y2: curRotY - (fCorYh / fCorMagH) * 42, halfW: 8, title: 'Coriolis force', body: '$\\mathbf{F}_{\\mathrm{Cor}}=-2m(\\boldsymbol{\\Omega}\\times\\mathbf{v}_{\\mathrm{rot}})$, magnitude $' + fCorAbs.toFixed(2) + '\\,\\mathrm{N}$. Perpendicular to $\\mathbf{v}_{\\mathrm{rot}}$; CCW $\\Omega$ deflects to the right.' });
        }
        var fCentXh = Omega * Omega * xrot;
        var fCentYh = Omega * Omega * yrot;
        var fCentMagH = Math.hypot(fCentXh, fCentYh);
        if (fCentMagH > 1e-3) {
          spots22.push({ id: 'fCent', kind: 'segment', x1: curRotX, y1: curRotY, x2: curRotX + (fCentXh / fCentMagH) * 26, y2: curRotY - (fCentYh / fCentMagH) * 26, halfW: 8, title: 'Centrifugal force', body: '$\\mathbf{F}_{\\mathrm{cent}}=m\\Omega^2\\mathbf{r}_\\perp$, purely outward. It depends on position, not velocity, and is $' + fCentMagH.toFixed(2) + '\\,\\mathrm{N}$ here ($m=1$).' });
        }
      }
      if (state._inertialTrail && state._inertialTrail.length >= 2) {
        var tIn0 = state._inertialTrail[0];
        var tIn1 = state._inertialTrail[state._inertialTrail.length - 1];
        spots22.push({ id: 'trailIn', kind: 'segment', x1: tIn0.x, y1: tIn0.y, x2: tIn1.x, y2: tIn1.y, halfW: 9, title: 'Inertial trail', body: 'Straight lab path: Newton 1st law on a frictionless table. Curvature appears only after you switch frames.' });
      }
      if (state._rotTrail && state._rotTrail.length >= 2) {
        var rtH = state._rotTrail;
        var strideH = Math.max(1, Math.floor((rtH.length - 1) / 3));
        var tiH;
        for (tiH = 0; tiH < rtH.length - 1; tiH += strideH) {
          var aH = rtH[tiH];
          var bH = rtH[Math.min(tiH + strideH, rtH.length - 1)];
          spots22.push({ id: 'trailRot' + tiH, kind: 'segment', x1: aH.x, y1: aH.y, x2: bH.x, y2: bH.y, halfW: 10, title: 'Rotating-frame trail', body: 'The same inertial straight line, sampled in the table frame. Sideways Coriolis makes it look curved; $|\\mathbf{v}_{\\mathrm{rot}}|$ is not changed by that force.' });
        }
      }
      spots22.push(
        { id: 'tableL', kind: 'circle', x: leftCX, y: cy, r: Rpx, title: 'Lab turntable', body: 'Disk spinning at $\\Omega = ' + Omega.toFixed(2) + '\\,\\mathrm{rad/s}$ in the lab. Spokes rotate; the puck does not stick to them.' },
        { id: 'tableR', kind: 'circle', x: rightCX, y: cy, r: Rpx, title: 'Rotating turntable', body: 'Same disk, drawn at rest. All of the curvature and the fictitious arrows live in this frame.' },
        { id: 'panelL', kind: 'rect', x: leftBounds.x, y: leftBounds.y, w: leftBounds.w, h: leftBounds.h, title: 'Lab (inertial) panel', body: 'Newton 1st law: straight line at constant speed. $\\Omega$ only moves the painted table under the puck.' },
        { id: 'panelR', kind: 'rect', x: rightBounds.x, y: rightBounds.y, w: rightBounds.w, h: rightBounds.h, title: 'Table (rotating) panel', body: 'Non-inertial view. To keep $m\\mathbf{a}_{\\mathrm{rot}}=\\sum\\mathbf{F}$ you must add $\\mathbf{F}_{\\mathrm{Cor}}$ and $\\mathbf{F}_{\\mathrm{cent}}$.' }
      );
      if (PGRE.setVizHotspots) PGRE.setVizHotspots(spots22);
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
      { id: 'spinSpeed', label: 'Spin Rate ($\\omega_s$)', min: 5, max: 80, step: 1, default: 35, unit: 'rad/s', hint: 'Rotor spin $\\omega_s$. Fast-top formula $\\Omega_p=Mgd/(I_s\\omega_s)$: doubling spin halves the precession rate (gyroscopic rigidity).' },
      { id: 'tiltAngle', label: 'Tilt Angle ($\\theta$)', min: 10, max: 80, step: 1, default: 45, unit: 'deg', hint: 'Lean $\\theta$ from the vertical. Gravitational torque is $Mgd\\sin\\theta$, but the $L$ cone radius is $L_s\\sin\\theta$, so $\\sin\\theta$ cancels and $\\Omega_p$ is independent of $\\theta$.' },
      { id: 'axleLength', label: 'Axle Distance ($d$)', min: 5, max: 25, step: 1, default: 14, unit: 'cm', hint: 'CM offset $d$ from the pivot. Larger $d$ means larger $\\tau=Mgd\\sin\\theta$ and faster precession, $\\Omega_p\\propto d$.' },
      { id: 'rotorMass', label: 'Rotor Mass ($M$)', min: 0.2, max: 2.0, step: 0.1, default: 0.8, unit: 'kg', hint: 'Rotor mass $M$. It cancels in $\\Omega_p=Mgd/(I_s\\omega_s)$ when $I_s\\propto M$, so a heavier disk precesses at the same rate if $\\omega_s$ is unchanged.' },
      { id: 'torqueMode', label: 'Torque Mode', type: 'select', options: ['Gravity Precession', 'Axial Spin-Up (Parallel)', 'Impulse Perturbation'], default: 'Gravity Precession', hint: 'Gravity: $\\boldsymbol{\\tau}\\perp\\mathbf{L}$ so $L$ precesses at $\\Omega_p=Mgd/(I_s\\omega_s)$. Parallel: $\\boldsymbol{\\tau}\\parallel\\mathbf{L}$ changes $|L|$ (spin-up). Impulse: a knock plus the same slow precession, with decaying nutation.' },
      { id: 'simSpeed', label: 'Simulation Speed', min: 0.2, max: 3.0, step: 0.2, default: 1.0, unit: 'x' }
    ],
    init: function (container, state, redraw) {
      state.phi = state.phi || 0;
      state.spinPhase = state.spinPhase || 0;
      state.nutationAngle = state.nutationAngle || 0;
      state.tracePoints = [];
      state._lastMode = state.torqueMode || 'Gravity Precession';
      state._spinUpClock = 0;
    },
    onParamChange: function (id, val, state) {
      if (!state) return;
      if (id === 'torqueMode' && val === 'Impulse Perturbation') {
        state.nutationAngle = 0.28;
      }
      if (id === 'spinSpeed' || id === 'tiltAngle' || id === 'axleLength' || id === 'rotorMass' || id === 'torqueMode') {
        state.tracePoints = [];
        if (id === 'spinSpeed' || id === 'torqueMode') state._spinUpClock = 0;
      }
    },
    draw: function (ctx, width, height, state, dt) {
      creamFill(ctx, width, height);
      dt = stepDt(dt);
      state = state || {};

      var spinSpeed = numParam(state, 'spinSpeed', 35);
      var tiltAngle = numParam(state, 'tiltAngle', 45);
      var axleLength = numParam(state, 'axleLength', 14);
      var rotorMass = numParam(state, 'rotorMass', 0.8);
      var torqueMode = state.torqueMode || 'Gravity Precession';
      var simSpeed = numParam(state, 'simSpeed', 1.0);
      if (simSpeed < 0.2) simSpeed = 0.2;
      if (simSpeed > 3) simSpeed = 3;
      dt = dt * simSpeed;
      state.phi = state.phi || 0;
      state.spinPhase = state.spinPhase || 0;
      state.nutationAngle = state.nutationAngle || 0;
      if (!state.tracePoints) state.tracePoints = [];

      if (state._lastMode !== torqueMode) {
        if (torqueMode === 'Impulse Perturbation') state.nutationAngle = 0.28;
        state.tracePoints = [];
        state._spinUpClock = 0;
        state._lastMode = torqueMode;
      }

      var g = 9.81;
      var M = rotorMass;
      var R_rotor = 0.10;
      var I_s = 0.5 * M * R_rotor * R_rotor;
      var d = axleLength / 100;
      var thetaRad = (tiltAngle * Math.PI) / 180;
      var isSpinUp = torqueMode === 'Axial Spin-Up (Parallel)';
      var isImpulse = torqueMode === 'Impulse Perturbation';

      var omega_s = spinSpeed;
      if (isSpinUp) {
        state._spinUpClock = (state._spinUpClock || 0) + dt;
        omega_s = Math.min(80, spinSpeed + 8.0 * state._spinUpClock);
      } else {
        state._spinUpClock = 0;
      }

      var tau_mag = M * g * d * Math.sin(thetaRad);
      var L_s = I_s * omega_s;
      var Omega_p = (L_s > 1e-4) ? (M * g * d) / (I_s * omega_s) : 0;

      if (isSpinUp) {
        state.spinPhase += omega_s * dt;
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

      var originX = width * 0.50;
      var originY = height * 0.70;
      var axLen = 0.16 + (d / 0.25) * 0.12;
      var rotorDist = axLen * 0.70;
      var worldSpan = axLen + 0.14;
      var scale = Math.min(width * 0.44, height * 0.58) / Math.max(worldSpan, 0.20);

      function project(x, y, z) {
        var px = originX + (x - y * 0.55) * scale;
        var py = originY - (z - y * 0.30) * scale;
        return { x: px, y: py, depth: y };
      }

      ctx.save();
      ctx.strokeStyle = C.ivory;
      ctx.lineWidth = 1;
      ctx.beginPath();
      var gi;
      for (gi = -0.38; gi <= 0.38; gi += 0.095) {
        var p1 = project(gi, -0.38, 0);
        var p2 = project(gi, 0.38, 0);
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        var p3 = project(-0.38, gi, 0);
        var p4 = project(0.38, gi, 0);
        ctx.moveTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
      }
      ctx.stroke();
      ctx.restore();

      var zAxisTop = project(0, 0, axLen + 0.08);
      var pivotBase = project(0, 0, -0.20);
      var pivotTop = project(0, 0, 0);
      ctx.save();
      ctx.strokeStyle = PGRE.vizStageTheme().inkFade(0.22);
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(pivotTop.x, pivotTop.y);
      ctx.lineTo(zAxisTop.x, zAxisTop.y);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = C.muted;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(pivotBase.x, pivotBase.y);
      ctx.lineTo(pivotTop.x, pivotTop.y);
      ctx.stroke();
      ctx.restore();
      disc(ctx, pivotTop.x, pivotTop.y, 7, C.ink, C.gold);

      var dirX = Math.sin(currentTheta) * Math.cos(state.phi);
      var dirY = Math.sin(currentTheta) * Math.sin(state.phi);
      var dirZ = Math.cos(currentTheta);

      var tip3D = { x: dirX * axLen, y: dirY * axLen, z: dirZ * axLen };
      var rotor3D = { x: dirX * rotorDist, y: dirY * rotorDist, z: dirZ * rotorDist };
      var cm3D = { x: dirX * (rotorDist * 0.92), y: dirY * (rotorDist * 0.92), z: dirZ * (rotorDist * 0.92) };
      var tip2D = project(tip3D.x, tip3D.y, tip3D.z);
      var rotor2D = project(rotor3D.x, rotor3D.y, rotor3D.z);
      var cm2D = project(cm3D.x, cm3D.y, cm3D.z);
      var shadow = project(rotor3D.x, rotor3D.y, 0);

      ctx.save();
      ctx.fillStyle = PGRE.vizStageTheme().inkFade(0.08);
      ctx.beginPath();
      ctx.ellipse(shadow.x, shadow.y, 18, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (!isSpinUp) {
        ctx.save();
        ctx.strokeStyle = 'rgba(204, 120, 92, 0.30)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        var stepA;
        for (stepA = 0; stepA <= 64; stepA++) {
          var a = (stepA / 64) * Math.PI * 2;
          var pCirc = project(
            Math.sin(currentTheta) * Math.cos(a) * axLen,
            Math.sin(currentTheta) * Math.sin(a) * axLen,
            Math.cos(currentTheta) * axLen
          );
          if (stepA === 0) ctx.moveTo(pCirc.x, pCirc.y);
          else ctx.lineTo(pCirc.x, pCirc.y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        state.tracePoints.push({ x: tip2D.x, y: tip2D.y });
        if (state.tracePoints.length > 140) state.tracePoints.shift();
        ctx.save();
        ctx.strokeStyle = 'rgba(204, 120, 92, 0.72)';
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

      var diskRad = 0.085;
      var diskPts = [];
      var di;
      for (di = 0; di < 32; di++) {
        var dAng = (di / 32) * Math.PI * 2;
        diskPts.push(project(
          rotor3D.x + diskRad * (Math.cos(dAng) * uX + Math.sin(dAng) * vX),
          rotor3D.y + diskRad * (Math.cos(dAng) * uY + Math.sin(dAng) * vY),
          rotor3D.z + diskRad * (Math.cos(dAng) * uZ + Math.sin(dAng) * vZ)
        ));
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
        var sp2D = project(
          rotor3D.x + diskRad * (Math.cos(sAng) * uX + Math.sin(sAng) * vX),
          rotor3D.y + diskRad * (Math.cos(sAng) * uY + Math.sin(sAng) * vY),
          rotor3D.z + diskRad * (Math.cos(sAng) * uZ + Math.sin(sAng) * vZ)
        );
        ctx.beginPath();
        ctx.moveTo(rotor2D.x, rotor2D.y);
        ctx.lineTo(sp2D.x, sp2D.y);
        ctx.stroke();
      }
      ctx.restore();
      disc(ctx, rotor2D.x, rotor2D.y, 3.5, C.ink, null);

      var lScale = 0.09 + 0.06 * Math.min(1, omega_s / 80);
      var lVecEnd3D = { x: dirX * (axLen + lScale), y: dirY * (axLen + lScale), z: dirZ * (axLen + lScale) };
      var lVecEnd2D = project(lVecEnd3D.x, lVecEnd3D.y, lVecEnd3D.z);
      arrow(ctx, tip2D.x, tip2D.y, lVecEnd2D.x, lVecEnd2D.y, C.coral, 3.2);
      halo(ctx, 'L', lVecEnd2D.x, lVecEnd2D.y - 11, C.coral, 'center');

      if (isSpinUp) {
        var tauPar3D = { x: dirX * (axLen + lScale + 0.07), y: dirY * (axLen + lScale + 0.07), z: dirZ * (axLen + lScale + 0.07) };
        var tauPar2D = project(tauPar3D.x, tauPar3D.y, tauPar3D.z);
        arrow(ctx, lVecEnd2D.x, lVecEnd2D.y, tauPar2D.x, tauPar2D.y, C.gold, 2.8);
        halo(ctx, 'tau', tauPar2D.x, tauPar2D.y - 12, C.gold, 'center');
        halo(ctx, 'dL', (lVecEnd2D.x + tauPar2D.x) / 2 + 12, (lVecEnd2D.y + tauPar2D.y) / 2, C.gold, 'left');
      } else {
        var fgEnd3D = { x: cm3D.x, y: cm3D.y, z: cm3D.z - 0.12 };
        var fgEnd2D = project(fgEnd3D.x, fgEnd3D.y, fgEnd3D.z);
        arrow(ctx, cm2D.x, cm2D.y, fgEnd2D.x, fgEnd2D.y, C.rose, 2.4);
        halo(ctx, 'Mg', fgEnd2D.x + 8, fgEnd2D.y, C.rose, 'left');

        var tauScale = 0.10;
        var tau3D = { x: cm3D.x - Math.sin(state.phi) * tauScale, y: cm3D.y + Math.cos(state.phi) * tauScale, z: cm3D.z };
        var tau2D = project(tau3D.x, tau3D.y, tau3D.z);
        arrow(ctx, cm2D.x, cm2D.y, tau2D.x, tau2D.y, C.gold, 3.0);
        halo(ctx, 'tau', tau2D.x, tau2D.y - 10, C.gold, 'center');

        var dLx = tau2D.x - cm2D.x;
        var dLy = tau2D.y - cm2D.y;
        var dLm = Math.hypot(dLx, dLy) || 1;
        var dL2x = lVecEnd2D.x + (dLx / dLm) * 16;
        var dL2y = lVecEnd2D.y + (dLy / dLm) * 16;
        arrow(ctx, lVecEnd2D.x, lVecEnd2D.y, dL2x, dL2y, C.gold, 2.2);
        halo(ctx, 'dL', dL2x + 8, dL2y, C.gold, 'left');

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
        if (head) halo(ctx, 'Omega', head.x + 8, head.y + 12, C.teal, 'left');
      }

      var Tprec = Omega_p > 0.01 ? (2 * Math.PI / Omega_p).toFixed(2) + '\\,\\mathrm{s}' : '\\infty';
      var modeStr = isSpinUp ? '$\\tau \\parallel L$ (spin-up)' : (isImpulse ? 'impulse + precession' : '$\\tau \\perp L$ (precession)');
      legend('Rotational dynamics', [
        { label: 'Rule', value: '$d\\mathbf{L} = \\boldsymbol{\\tau}\\,dt$', hint: 'Torque tells $\\mathbf{L}$ how to move: $\\mathrm{d}\\mathbf{L}=\\boldsymbol{\\tau}\\,\\mathrm{d}t$. Parallel $\\boldsymbol{\\tau}$ changes $|L|$; perpendicular $\\boldsymbol{\\tau}$ changes only direction.' },
        { label: 'Mode', value: modeStr, hint: isSpinUp ? 'Parallel torque changes $|\\mathbf{L}|$. The axle is held fixed while $\\omega_s$ ramps; there is no precession cone.' : (isImpulse ? 'A knock seeds nutation on top of the slow gravitational precession. Nutation damps here so the fast-top cone remains visible.' : 'Perpendicular torque: $\\mathrm{d}\\mathbf{L}$ is horizontal, so $\\mathbf{L}$ walks around a cone at $\\Omega_p=Mgd/(I_s\\omega_s)$.') },
        { label: '$\\omega_s$', value: '$' + omega_s.toFixed(1) + '\\,\\mathrm{rad/s}$', hint: 'Spin about the symmetry axis. $L_s=I_s\\omega_s$ with $I_s=\\frac12 M R^2$.' },
        { label: '$L_s$', value: '$' + L_s.toFixed(3) + '\\,\\mathrm{kg\\,m}^2/\\mathrm{s}$', hint: 'Spin angular momentum. Slow precession needs large $L_s$; the GRE fast-top limit is $\\omega_s\\to\\infty\\Rightarrow\\Omega_p\\to 0$.' },
        { label: '$\\tau_{\\mathrm{grav}}$', value: '$' + tau_mag.toFixed(3) + '\\,\\mathrm{N\\,m}$', hint: '$\\tau=M g d \\sin\\theta = ' + tau_mag.toFixed(3) + '\\,\\mathrm{N\\,m}$. Horizontal and perpendicular to the axle, so it changes the direction of $\\mathbf{L}$, not $|L|$.' },
        { label: '$\\Omega_p = Mgd/(I_s\\omega_s)$', value: '$' + Omega_p.toFixed(3) + '\\,\\mathrm{rad/s}$', hint: 'Steady precession. Independent of $\\theta$ in the fast-top approximation; inversely proportional to $\\omega_s$.' },
        { label: '$T_{\\mathrm{prec}}$', value: '$' + Tprec + '$', hint: 'Period $2\\pi/\\Omega_p$. Diverges as $\\omega_s$ grows (the rigid, slowly precessing top).' }
      ]);
      var rotorHitR = 16;
      var diH;
      for (diH = 0; diH < diskPts.length; diH++) {
        var ddrH = Math.hypot(diskPts[diH].x - rotor2D.x, diskPts[diH].y - rotor2D.y);
        if (ddrH > rotorHitR) rotorHitR = ddrH;
      }
      rotorHitR += 4;
      var spots20 = [
        { id: 'rotor', kind: 'circle', x: rotor2D.x, y: rotor2D.y, r: rotorHitR, title: 'Rotor', body: 'Symmetric disk $M = ' + M.toFixed(1) + '\\,\\mathrm{kg}$, $I_s=\\frac12 M R^2 = ' + I_s.toFixed(4) + '\\,\\mathrm{kg\\,m}^2$, spinning at $\\omega_s = ' + omega_s.toFixed(1) + '\\,\\mathrm{rad/s}$.' },
        { id: 'axle', kind: 'segment', x1: pivotTop.x, y1: pivotTop.y, x2: tip2D.x, y2: tip2D.y, halfW: 8, title: 'Spin axis', body: 'Symmetry axis of the top. $\\mathbf{L}_s$ lies along this axle. Tilt from vertical is $\\theta = ' + (currentTheta * 180 / Math.PI).toFixed(1) + '^{\\circ}$.' },
        { id: 'L', kind: 'segment', x1: tip2D.x, y1: tip2D.y, x2: lVecEnd2D.x, y2: lVecEnd2D.y, halfW: 8, title: 'Angular momentum $\\mathbf{L}$', body: '$L_s = I_s\\omega_s = ' + L_s.toFixed(3) + '\\,\\mathrm{kg\\,m}^2/\\mathrm{s}$. Torque changes this vector: parallel $\\boldsymbol{\\tau}$ stretches it, perpendicular $\\boldsymbol{\\tau}$ swings it.' },
        { id: 'pivot', kind: 'circle', x: pivotTop.x, y: pivotTop.y, r: 12, title: 'Pivot', body: 'Fixed support. $\\boldsymbol{\\tau}=\\mathbf{r}_{\\mathrm{CM}}\\times M\\mathbf{g}$ is taken about this point, which is inertial, so $\\boldsymbol{\\tau}=\\mathrm{d}\\mathbf{L}/\\mathrm{d}t$ applies.' },
        { id: 'stand', kind: 'segment', x1: pivotBase.x, y1: pivotBase.y, x2: pivotTop.x, y2: pivotTop.y, halfW: 8, title: 'Support stand', body: 'Holds the pivot fixed in the lab. Without this point there is no gravitational torque about a stationary origin.' }
      ];
      if (isSpinUp) {
        spots20.push(
          { id: 'tau', kind: 'segment', x1: lVecEnd2D.x, y1: lVecEnd2D.y, x2: tauPar2D.x, y2: tauPar2D.y, halfW: 8, title: 'Parallel torque', body: '$\\boldsymbol{\\tau}\\parallel\\mathbf{L}$, so $|L|$ grows and $\\omega_s$ ramps ($\\omega_s = ' + omega_s.toFixed(1) + '\\,\\mathrm{rad/s}$). The axle direction is held fixed.' },
          { id: 'dL', kind: 'segment', x1: lVecEnd2D.x, y1: lVecEnd2D.y, x2: tauPar2D.x, y2: tauPar2D.y, halfW: 8, title: '$\\mathrm{d}\\mathbf{L}$', body: 'Increment of $\\mathbf{L}$ along the axle. Parallel torque changes magnitude, not orientation, so there is no precession cone.' }
        );
      } else {
        spots20.push(
          { id: 'Mg', kind: 'segment', x1: cm2D.x, y1: cm2D.y, x2: fgEnd2D.x, y2: fgEnd2D.y, halfW: 8, title: 'Weight $Mg$', body: 'Gravity $Mg = ' + (M * g).toFixed(2) + '\\,\\mathrm{N}$ at the CM, offset $d = ' + d.toFixed(3) + '\\,\\mathrm{m}$ from the pivot, producing $\\tau=Mgd\\sin\\theta$.' },
          { id: 'tau', kind: 'segment', x1: cm2D.x, y1: cm2D.y, x2: tau2D.x, y2: tau2D.y, halfW: 8, title: 'Gravitational torque', body: '$\\boldsymbol{\\tau}=\\mathbf{r}\\times Mg$, horizontal and $\\perp\\mathbf{L}$. Magnitude $' + tau_mag.toFixed(3) + '\\,\\mathrm{N\\,m}$. This is what walks $\\mathbf{L}$ around the cone.' },
          { id: 'dL', kind: 'segment', x1: lVecEnd2D.x, y1: lVecEnd2D.y, x2: dL2x, y2: dL2y, halfW: 8, title: '$\\mathrm{d}\\mathbf{L}$', body: '$\\mathrm{d}\\mathbf{L}=\\boldsymbol{\\tau}\\,\\mathrm{d}t$ is parallel to $\\boldsymbol{\\tau}$ and $\\perp\\mathbf{L}$, so $|L|$ is fixed while the tip of $\\mathbf{L}$ precesses.' }
        );
        var precC = project(0, 0, Math.cos(currentTheta) * axLen);
        var precR = Math.max(12, Math.abs(Math.sin(currentTheta) * axLen * scale));
        spots20.push({ id: 'prec', kind: 'ring', x: precC.x, y: precC.y, r: precR, halfW: 12, title: 'Precession circle', body: 'Tip of the axle sweeps this cone. $\\Omega_p = Mgd/(I_s\\omega_s) = ' + Omega_p.toFixed(3) + '\\,\\mathrm{rad/s}$, independent of $\\theta$ in the fast-top limit.' });
        var omC = project(0, 0, 0.01);
        var omR = 0.09 * scale;
        spots20.push({ id: 'Omega', kind: 'ring', x: omC.x, y: omC.y, r: Math.max(10, omR), halfW: 10, title: 'Precession $\\Omega_p$', body: 'Slow rotation of the axle about the vertical. Period $T_{\\mathrm{prec}} = ' + Tprec + '$. Faster spin $\\Rightarrow$ slower $\\Omega_p$.' });
      }
      if (PGRE.setVizHotspots) PGRE.setVizHotspots(spots20);
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
