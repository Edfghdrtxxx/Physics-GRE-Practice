/* Concept visualizer — Direction of Azimuth & Coordinate Comparison (Spherical vs Cylindrical)
   Directly connects Image 1 (|B|(2πr) = μ₀I ⟹ B = μ₀I/(2πr) φ̂) to spherical and cylindrical geometry. */
(function (global) {
  'use strict';

  var PGRE = global.PGRE = global.PGRE || {};
  PGRE.conceptVisualizers = PGRE.conceptVisualizers || {};

  var TWO_PI = Math.PI * 2;
  var MU_0 = 4 * Math.PI * 1e-7;
  var HIGHLIGHT_IDS = ['phi', 'theta', 'r', 'rho', 'bField', 'current', 'wire', 'basis', 'spherical', 'cylindrical'];
  var YAW = 0.68;
  var PITCH = 0.44;
  var COS_Y = Math.cos(YAW);
  var SIN_Y = Math.sin(YAW);
  var COS_P = Math.cos(PITCH);
  var SIN_P = Math.sin(PITCH);

  function clamp(v, lo, hi) {
    if (v < lo) return lo;
    if (v > hi) return hi;
    return v;
  }

  function wrapPhi(p) {
    p = p % TWO_PI;
    if (p < 0) p += TWO_PI;
    if (p >= TWO_PI) p = 0;
    return p;
  }

  function fmt(n, d) {
    var p = Math.pow(10, d);
    return (Math.round(n * p) / p).toFixed(d);
  }

  function tok(name, fb) {
    var cs = global.getComputedStyle ? getComputedStyle(document.documentElement) : null;
    var v = cs ? cs.getPropertyValue(name) : '';
    if (v) v = v.replace(/^\s+|\s+$/g, '');
    return v || fb;
  }

  function tokens() {
    return {
      bg: tok('--bg', '#faf9f5'),
      surface: tok('--surface', '#faf9f5'),
      line: tok('--line', '#e6dfd8'),
      ink: tok('--ink', '#141413'),
      ink2: tok('--ink-2', '#6c6a64'),
      ink3: tok('--ink-3', '#8e8b82'),
      accent: tok('--accent', '#cc785c'),
      accentDeep: tok('--accent-deep', '#964b32'),
      teal: tok('--teal', '#437a75'),
      gold: tok('--gold', '#ba7b2a'),
      copper: '#c86432'
    };
  }

  function prefersReduced() {
    try {
      return !!(global.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) {
      return false;
    }
  }

  function project(x, y, z, ox, oy, scale) {
    var x1 = x * COS_Y - y * SIN_Y;
    var y1 = x * SIN_Y + y * COS_Y;
    var y2 = y1 * COS_P - z * SIN_P;
    var z2 = y1 * SIN_P + z * COS_P;
    return { x: ox + x1 * scale, y: oy - z2 * scale, d: y2 };
  }

  function el(tag, attrs) {
    var n = document.createElement(tag);
    var k;
    attrs = attrs || {};
    for (k in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
      if (k === 'className') n.className = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k === 'css') n.style.cssText = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    return n;
  }

  function mount(host, opts) {
    opts = opts || {};
    var reduced = prefersReduced();
    var dead = false;
    var raf = 0;
    var hl = null;
    var dragging = false;
    var lastPx = 0;
    var lastPy = 0;

    var currentI = typeof opts.I === 'number' ? clamp(opts.I, 0.5, 6.0) : 3.0;
    var r = typeof opts.r === 'number' ? clamp(opts.r, 0.4, 1.5) : 1.0;
    var theta = typeof opts.theta === 'number' ? clamp(opts.theta, 0.08, Math.PI - 0.08) : Math.PI / 4;
    var phi = typeof opts.phi === 'number' ? wrapPhi(opts.phi) : Math.PI / 3;
    var showB = true;
    var showComparison = true;
    var root = el('div', {
      className: 'cv-azimuth',
      css: 'display:flex;flex-direction:column;gap:14px;color:var(--ink,#141413);'
    });
    root.setAttribute('data-viz', 'azimuth');

    var wrap = el('div', {
      className: 'viz-canvas-wrapper',
      css: 'height:360px;min-height:280px;cursor:grab;touch-action:none;position:relative;'
    });
    var canvas = el('canvas');
    canvas.setAttribute('aria-label', 'Direction of Azimuth and Ampère’s law');
    wrap.appendChild(canvas);
    root.appendChild(wrap);

    /* Readout strip */
    var readout = el('div', {
      className: 'cv-readout viz-legend-strip',
      css: 'display:flex;flex-wrap:wrap;gap:10px 24px;padding:8px 4px;font-size:13px;'
    });
    readout.setAttribute('aria-live', 'polite');

    function readoutItem(id, latex) {
      var row = el('div', {
        className: 'viz-legend-row cv-readout-item',
        css: 'display:flex;align-items:baseline;gap:6px;cursor:default;'
      });
      row.setAttribute('data-hl', id);
      var lab = el('span', { className: 'viz-legend-label', text: latex });
      var val = el('span', {
        className: 'viz-legend-value',
        css: 'font-family:var(--mono-instr),\'JetBrains Mono\',monospace;color:var(--accent-deep,#964b32);'
      });
      function onEnter() { highlight(id); }
      function onLeave() { highlight(null); }
      row.addEventListener('mouseenter', onEnter);
      row.addEventListener('mouseleave', onLeave);
      row.appendChild(lab);
      row.appendChild(val);
      readout.appendChild(row);
      return { row: row, val: val, onEnter: onEnter, onLeave: onLeave };
    }

    var itemB = readoutItem('bField', '$|\\mathbf{B}|$');
    var itemPhiHat = readoutItem('phi', '$\\hat{\\boldsymbol{\\phi}}$ (azimuth)');
    var itemRho = readoutItem('rho', '$\\rho = r\\sin\\theta$ (wire dist)');
    var itemZ = readoutItem('cylindrical', '$z = r\\cos\\theta$');
    root.appendChild(readout);

    /* Controls */
    var controls = el('div', { className: 'viz-controls-panel cv-azimuth-controls' });

    function sliderRow(id, latex, min, max, step, value, unit) {
      var row = el('div', { className: 'viz-param-row' });
      row.setAttribute('data-hl', id);
      var head = el('div', { className: 'viz-param-header' });
      var lab = el('label', { className: 'viz-param-label', text: latex });
      var val = el('span', { className: 'viz-param-val', text: fmt(value, 2) + (unit ? ' ' + unit : '') });
      var input = el('input', { className: 'viz-param-slider' });
      input.type = 'range';
      input.min = String(min);
      input.max = String(max);
      input.step = String(step);
      input.value = String(value);
      input.setAttribute('aria-label', id);
      lab.setAttribute('for', '');
      function onEnter() { highlight(id); }
      function onLeave() { highlight(null); }
      row.addEventListener('mouseenter', onEnter);
      row.addEventListener('mouseleave', onLeave);
      head.appendChild(lab);
      head.appendChild(val);
      row.appendChild(head);
      row.appendChild(input);
      controls.appendChild(row);
      return { row: row, lab: lab, val: val, input: input, onEnter: onEnter, onLeave: onLeave, unit: unit || '' };
    }

    var sI = sliderRow('current', 'Current $I$', 0.5, 6.0, 0.1, currentI, 'A');
    var sR = sliderRow('r', 'Spherical radius $r$', 0.4, 1.5, 0.01, r, 'm');
    var sTh = sliderRow('theta', 'Polar angle $\\theta$', 0.1, Math.PI - 0.1, 0.01, theta, 'rad');
    var sPh = sliderRow('phi', 'Azimuth $\\varphi$', 0, TWO_PI - 1e-6, 0.01, phi, 'rad');

    var toggleRow = el('div', {
      className: 'cv-basis-toggle-row',
      css: 'display:flex;flex-wrap:wrap;align-items:center;gap:18px;font-size:13px;color:var(--ink-2,#6c6a64);margin-top:6px;padding:4px 0;'
    });
    var chkShowB = el('input');
    chkShowB.type = 'checkbox';
    chkShowB.id = 'cv-show-b-toggle';
    chkShowB.checked = true;
    chkShowB.style.cursor = 'pointer';
    var labShowB = el('label', {
      text: 'Magnetic field B = μ₀I/(2πρ) φ̂ (teal)',
      css: 'cursor:pointer;user-select:none;margin-right:4px;'
    });
    labShowB.setAttribute('for', 'cv-show-b-toggle');
    toggleRow.appendChild(chkShowB);
    toggleRow.appendChild(labShowB);

    var chkCompare = el('input');
    chkCompare.type = 'checkbox';
    chkCompare.id = 'cv-compare-toggle';
    chkCompare.checked = true;
    chkCompare.style.cursor = 'pointer';
    var chkLab = el('label', {
      text: 'Basis comparison: Spherical (r̂, θ̂, φ̂) vs Cylindrical (ρ̂, φ̂, ẑ)',
      css: 'cursor:pointer;user-select:none;'
    });
    chkLab.setAttribute('for', 'cv-compare-toggle');
    toggleRow.appendChild(chkCompare);
    toggleRow.appendChild(chkLab);
    controls.appendChild(toggleRow);

    function onShowBChange() {
      showB = chkShowB.checked;
      scheduleDraw();
    }
    chkShowB.addEventListener('change', onShowBChange);

    function onCompareChange() {
      showComparison = chkCompare.checked;
      scheduleDraw();
    }
    chkCompare.addEventListener('change', onCompareChange);
    root.appendChild(controls);

    var note = el('p', {
      className: 'cv-convention-note',
      css: 'margin:0 0 4px;font-size:13px;color:var(--ink-2,#6c6a64);line-height:1.45;',
      text: 'Ampère’s law for a straight wire along $+z$: field $\\mathbf{B} = \\frac{\\mu_0 I}{2\\pi \\rho}\\hat{\\boldsymbol{\\phi}}$ curls purely in the azimuth direction $\\hat{\\boldsymbol{\\phi}} = -\\sin\\varphi\\,\\hat{\\mathbf{x}} + \\cos\\varphi\\,\\hat{\\mathbf{y}}$. The cylindrical radius is $\\rho = r\\sin\\theta$, not spherical $r$.'
    });
    root.insertBefore(note, wrap);
    if (host) host.appendChild(root);

    var ctx = canvas.getContext ? canvas.getContext('2d') : null;
    var ro = null;

    function coords() {
      var sinT = Math.sin(theta);
      var cosT = Math.cos(theta);
      var sinP = Math.sin(phi);
      var cosP = Math.cos(phi);
      var rho = r * sinT;
      var z = r * cosT;
      var x = rho * cosP;
      var y = rho * sinP;
      // Exact B field magnitude in microtesla:
      // B = μ₀ I / (2π ρ) where μ₀/(2π) = 2e-7 T·m/A. Converted to μT: 2e-7 * 1e6 = 0.2 μT·m/A.
      var B_uT = (rho > 0.005) ? ((MU_0 * currentI) / (TWO_PI * rho)) * 1e6 : Infinity;
      return {
        x: x, y: y, z: z,
        rho: rho,
        sinT: sinT, cosT: cosT,
        sinP: sinP, cosP: cosP,
        B_uT: B_uT
      };
    }

    function updateReadout() {
      var c = coords();
      if (c.rho < 0.05) {
        itemB.val.textContent = 'diverges on wire (ρ → 0)';
      } else {
        itemB.val.textContent = '= ' + fmt(c.B_uT, 2) + ' μT · φ̂';
      }
      var xComp = -c.sinP;
      var yComp = c.cosP;
      itemPhiHat.val.textContent = '= ' + (xComp >= 0 ? '+' : '') + fmt(xComp, 2) + 'x̂ ' + (yComp >= 0 ? '+' : '') + fmt(yComp, 2) + 'ŷ + 0.00ẑ';
      itemRho.val.textContent = '= ' + fmt(c.rho, 2) + ' m (vs r = ' + fmt(r, 2) + ' m)';
      itemZ.val.textContent = '= ' + fmt(c.z, 2) + ' m';
      sI.val.textContent = fmt(currentI, 1) + ' A';
      sR.val.textContent = fmt(r, 2) + ' m';
      sTh.val.textContent = fmt(theta, 2) + ' rad';
      sPh.val.textContent = fmt(phi, 2) + ' rad';
    }
    function syncInputs() {
      sI.input.value = String(currentI);
      sR.input.value = String(r);
      sTh.input.value = String(theta);
      sPh.input.value = String(phi);
      updateReadout();
    }

    function applyDomHl() {
      var t = tokens();
      function paint(node, on) {
        node.style.color = on ? t.accentDeep : '';
      }
      paint(itemB.row, hl === 'bField' || hl === 'phi');
      paint(itemPhiHat.row, hl === 'phi' || hl === 'basis');
      paint(itemRho.row, hl === 'rho' || hl === 'cylindrical');
      paint(itemZ.row, hl === 'cylindrical');
      paint(sI.lab, hl === 'current' || hl === 'wire');
      paint(sR.lab, hl === 'r' || hl === 'spherical');
      paint(sTh.lab, hl === 'theta' || hl === 'spherical');
      paint(sPh.lab, hl === 'phi');
    }

    function lw(base, id) {
      return hl === id ? base * 2.0 : base;
    }

    function col(base, id, t) {
      return hl === id ? t.accentDeep : base;
    }

    function arrow(c, a, b, color, width) {
      var dx, dy, len, ux, uy, s;
      if (!c) return;
      c.save();
      c.strokeStyle = color;
      c.lineWidth = width;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.beginPath();
      c.moveTo(a.x, a.y);
      c.lineTo(b.x, b.y);
      c.stroke();
      dx = b.x - a.x;
      dy = b.y - a.y;
      len = Math.sqrt(dx * dx + dy * dy) || 1;
      ux = dx / len;
      uy = dy / len;
      s = 8;
      c.beginPath();
      c.moveTo(b.x, b.y);
      c.lineTo(b.x - ux * s + uy * s * 0.42, b.y - uy * s - ux * s * 0.42);
      c.moveTo(b.x, b.y);
      c.lineTo(b.x - ux * s - uy * s * 0.42, b.y - uy * s + ux * s * 0.42);
      c.stroke();
      c.restore();
    }

    function label(c, text, x, y, color, align) {
      if (!c) return;
      c.save();
      c.font = '12px "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
      c.fillStyle = color;
      c.textAlign = align || 'left';
      c.textBaseline = 'middle';
      c.fillText(text, x, y);
      c.restore();
    }

    function labelHat(c, glyph, x, y, color, align) {
      if (!c) return;
      c.save();
      c.font = '12px "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
      c.fillStyle = color;
      c.textAlign = align || 'left';
      c.textBaseline = 'middle';
      c.fillText(glyph, x, y);
      var m = c.measureText(glyph);
      var w = m.width || 8;
      var hx = (align === 'center') ? x : (align === 'right' ? x - w / 2 : x + w / 2);
      c.beginPath();
      c.strokeStyle = color;
      c.lineWidth = 1.3;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.moveTo(hx - 3.5, y - 7);
      c.lineTo(hx, y - 10.5);
      c.lineTo(hx + 3.5, y - 7);
      c.stroke();
      c.restore();
    }

    function strokeCircleHorizontal(ctx, R, zVal, n, ox, oy, scale, color, width, dash) {
      var i, ph, p;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      if (dash) ctx.setLineDash(dash);
      ctx.beginPath();
      for (i = 0; i <= n; i++) {
        ph = TWO_PI * i / n;
        p = project(R * Math.cos(ph), R * Math.sin(ph), zVal, ox, oy, scale);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.restore();
    }

    function draw() {
      if (dead || !ctx) return;
      var t = tokens();
      var dpr = global.devicePixelRatio || 1;
      if (dpr > 2) dpr = 2;
      var cssW = (wrap.clientWidth || canvas.clientWidth || 640);
      var cssH = (wrap.clientHeight || canvas.clientHeight || 360);
      if (cssW < 2) cssW = 640;
      if (cssH < 2) cssH = 360;
      var needW = Math.round(cssW * dpr);
      var needH = Math.round(cssH * dpr);
      if (canvas.width !== needW) canvas.width = needW;
      if (canvas.height !== needH) canvas.height = needH;
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var w = cssW;
      var h = cssH;
      var ox = w * 0.50;
      var oy = h * 0.52;
      var scale = Math.min(w, h) * 0.38;
      var c = coords();

      ctx.fillStyle = t.bg;
      ctx.fillRect(0, 0, w, h);

      /* Points in 3D */
      var O = project(0, 0, 0, ox, oy, scale);
      var P = project(c.x, c.y, c.z, ox, oy, scale);
      var Pxy = project(c.x, c.y, 0, ox, oy, scale);
      var Pwire = project(0, 0, c.z, ox, oy, scale); // perpendicular foot on wire

      /* 1. Draw coordinate axes */
      function axis(dx, dy, dz, glyph, align) {
        var a0 = project(-0.25 * dx, -0.25 * dy, -0.25 * dz, ox, oy, scale);
        var a1 = project(1.7 * dx, 1.7 * dy, 1.7 * dz, ox, oy, scale);
        arrow(ctx, a0, a1, t.ink3, 1.1);
        label(ctx, glyph, a1.x + (align === 'right' ? -8 : 8), a1.y - 2, t.ink2, align);
      }
      axis(1, 0, 0, 'x', 'left');
      axis(0, 1, 0, 'y', 'right');

      /* 2. Central wire along z carrying current I */
      var wireLen = 1.9;
      var wBot = project(0, 0, -wireLen * 0.6, ox, oy, scale);
      var wTop = project(0, 0, wireLen, ox, oy, scale);
      var wireCol = (hl === 'wire' || hl === 'current') ? t.accentDeep : t.copper;
      var wireW = (hl === 'wire' || hl === 'current') ? 4.0 : 2.8;

      ctx.save();
      ctx.strokeStyle = wireCol;
      ctx.lineWidth = wireW;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(wBot.x, wBot.y);
      ctx.lineTo(wTop.x, wTop.y);
      ctx.stroke();
      ctx.restore();

      // Current arrow along wire pointing upward (+z)
      var cMid1 = project(0, 0, 0.45 * wireLen, ox, oy, scale);
      var cMid2 = project(0, 0, 0.65 * wireLen, ox, oy, scale);
      arrow(ctx, cMid1, cMid2, wireCol, wireW + 0.5);
      label(ctx, 'I (current along +z)', cMid2.x + 10, cMid2.y - 2, wireCol, 'left');

      /* 3. Concentric Magnetic Field Lines (curling azimuthally in horizontal planes) */
      var nRings = [0.45, c.rho, 1.15];
      nRings.forEach(function (rad) {
        var isProbeRing = Math.abs(rad - c.rho) < 0.01;
        var rCol = isProbeRing ? (hl === 'bField' || hl === 'phi' ? t.accentDeep : t.teal) : t.line;
        var rW = isProbeRing ? 1.8 : 1.0;
        var rDash = isProbeRing ? null : [3, 4];
        strokeCircleHorizontal(ctx, rad, c.z, 56, ox, oy, scale, rCol, rW, rDash);

        // Add 3 circulation arrows around the ring showing azimuthal direction (+φ̂)
        [0.2, 0.55, 0.88].forEach(function (frac) {
          var ang = frac * TWO_PI;
          var p1 = project(rad * Math.cos(ang), rad * Math.sin(ang), c.z, ox, oy, scale);
          var angNext = ang + 0.06;
          var p2 = project(rad * Math.cos(angNext), rad * Math.sin(angNext), c.z, ox, oy, scale);
          var adx = p2.x - p1.x;
          var ady = p2.y - p1.y;
          var alen = Math.sqrt(adx * adx + ady * ady) || 1;
          var aux = adx / alen;
          var auy = ady / alen;
          ctx.save();
          ctx.strokeStyle = rCol;
          ctx.lineWidth = rW;
          ctx.beginPath();
          ctx.moveTo(p2.x, p2.y);
          ctx.lineTo(p2.x - aux * 5 + auy * 2.5, p2.y - auy * 5 - aux * 2.5);
          ctx.moveTo(p2.x, p2.y);
          ctx.lineTo(p2.x - aux * 5 - auy * 2.5, p2.y - auy * 5 + aux * 2.5);
          ctx.stroke();
          ctx.restore();
        });
      });

      /* 4. Ground plane circle and angle φ arc */
      strokeCircleHorizontal(ctx, c.rho, 0, 48, ox, oy, scale, t.line, 0.8, [2, 3]);
      var arcR = 0.36;
      if (phi > 0.04) {
        var pts = [];
        var n, tt, pArc;
        for (n = 0; n <= 24; n++) {
          tt = phi * n / 24;
          pts.push(project(arcR * Math.cos(tt), arcR * Math.sin(tt), 0, ox, oy, scale));
        }
        ctx.save();
        ctx.strokeStyle = col(t.ink2, 'phi', t);
        ctx.lineWidth = lw(1.4, 'phi');
        ctx.beginPath();
        for (n = 0; n < pts.length; n++) {
          if (n === 0) ctx.moveTo(pts[n].x, pts[n].y);
          else ctx.lineTo(pts[n].x, pts[n].y);
        }
        ctx.stroke();
        // Directional arrowhead for azimuth sweep (+φ)
        if (pts.length >= 2) {
          var pL = pts[pts.length - 1];
          var pPr = pts[pts.length - 2];
          var ax = pL.x - pPr.x;
          var ay = pL.y - pPr.y;
          var al = Math.sqrt(ax * ax + ay * ay) || 1;
          var uax = ax / al;
          var uay = ay / al;
          ctx.beginPath();
          ctx.moveTo(pL.x, pL.y);
          ctx.lineTo(pL.x - uax * 6 + uay * 3, pL.y - uay * 6 - uax * 3);
          ctx.moveTo(pL.x, pL.y);
          ctx.lineTo(pL.x - uax * 6 - uay * 3, pL.y - uay * 6 + uax * 3);
          ctx.stroke();
        }
        ctx.restore();
        pArc = pts[Math.floor(pts.length / 2)];
        label(ctx, 'φ', pArc.x + 6, pArc.y + 8, col(t.ink, 'phi', t), 'left');
      }

      /* 5. Drop lines and projection geometry */
      ctx.save();
      ctx.strokeStyle = t.ink3;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      // Vertical drop line from P to Pxy
      ctx.beginPath();
      ctx.moveTo(P.x, P.y);
      ctx.lineTo(Pxy.x, Pxy.y);
      ctx.stroke();
      // Ground radial line from O to Pxy
      ctx.beginPath();
      ctx.moveTo(O.x, O.y);
      ctx.lineTo(Pxy.x, Pxy.y);
      ctx.stroke();
      // Cylindrical perpendicular radius from wire to P: ρ = r sinθ
      ctx.strokeStyle = col(t.accent, 'rho', t);
      ctx.lineWidth = lw(1.5, 'rho');
      ctx.beginPath();
      ctx.moveTo(Pwire.x, Pwire.y);
      ctx.lineTo(P.x, P.y);
      ctx.stroke();
      ctx.restore();

      // Label for ρ (cylindrical wire distance)
      var pMid = { x: (Pwire.x + P.x) * 0.5, y: (Pwire.y + P.y) * 0.5 };
      label(ctx, 'ρ = r sinθ', pMid.x, pMid.y - 10, col(t.accentDeep, 'rho', t), 'center');

      /* 6. Spherical position vector r from O to P */
      arrow(ctx, O, P, col(t.ink, 'spherical', t), lw(1.6, 'spherical'));
      label(ctx, 'r', (O.x + P.x) * 0.5 - 8, (O.y + P.y) * 0.5 - 6, col(t.ink, 'spherical', t), 'right');

      /* 7. Polar angle θ arc */
      if (theta > 0.06) {
        var thPts = [];
        var thR = 0.36;
        for (n = 0; n <= 18; n++) {
          tt = theta * n / 18;
          thPts.push(project(
            thR * Math.sin(tt) * c.cosP,
            thR * Math.sin(tt) * c.sinP,
            thR * Math.cos(tt),
            ox, oy, scale
          ));
        }
        ctx.save();
        ctx.strokeStyle = col(t.ink2, 'theta', t);
        ctx.lineWidth = lw(1.4, 'theta');
        ctx.beginPath();
        for (n = 0; n < thPts.length; n++) {
          if (n === 0) ctx.moveTo(thPts[n].x, thPts[n].y);
          else ctx.lineTo(thPts[n].x, thPts[n].y);
        }
        ctx.stroke();
        ctx.restore();
        var pThMid = thPts[Math.floor(thPts.length / 2)];
        label(ctx, 'θ', pThMid.x + 8, pThMid.y - 4, col(t.ink, 'theta', t), 'left');
      }

      /* 8. Point P marker */
      ctx.save();
      ctx.fillStyle = t.accentDeep;
      ctx.strokeStyle = t.ink;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(P.x, P.y, 4.8, 0, TWO_PI);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      label(ctx, 'P', P.x + 8, P.y - 12, t.ink, 'left');

      /* 9. Unit vectors and Magnetic Field at P */
      var vecL = 0.42;

      // Azimuth unit vector φ̂ = (-sinφ, cosφ, 0)
      var phiHat3D = {
        x: c.x - vecL * c.sinP,
        y: c.y + vecL * c.cosP,
        z: c.z
      };
      var phiHatScr = project(phiHat3D.x, phiHat3D.y, phiHat3D.z, ox, oy, scale);

      // Magnetic field B vector pointing along φ̂ (scales with current and 1/rho)
      var bScale = clamp(0.75 + 0.35 * (currentI / (c.rho || 1)), 0.8, 2.4);
      var bArrowL = vecL * bScale;
      var bHat3D = {
        x: c.x - bArrowL * c.sinP,
        y: c.y + bArrowL * c.cosP,
        z: c.z
      };
      var bHatScr = project(bHat3D.x, bHat3D.y, bHat3D.z, ox, oy, scale);

      // Compute 2D screen normal to prevent collinear B and φ̂ from swallowing each other
      var bdx = phiHatScr.x - P.x;
      var bdy = phiHatScr.y - P.y;
      var blen = Math.sqrt(bdx * bdx + bdy * bdy) || 1;
      var nx = -bdy / blen;
      var ny = bdx / blen;

      var pPhi = showB ? { x: P.x - 3.5 * nx, y: P.y - 3.5 * ny } : P;
      var endPhi = showB ? { x: phiHatScr.x - 3.5 * nx, y: phiHatScr.y - 3.5 * ny } : phiHatScr;

      // Draw Magnetic Field Vector B ∝ φ̂ if enabled
      if (showB) {
        var isBActive = hl === 'bField';
        var pB = { x: P.x + 5.5 * nx, y: P.y + 5.5 * ny };
        var endB = { x: bHatScr.x + 5.5 * nx, y: bHatScr.y + 5.5 * ny };
        var bCol = isBActive ? t.accentDeep : t.teal;
        var bW = isBActive ? 4.2 : 2.8;
        arrow(ctx, pB, endB, bCol, bW);
        label(ctx, 'B = μ₀I/(2πρ) φ̂', endB.x + 6, endB.y - 6, bCol, 'left');
      }

      // Draw Azimuth Unit Vector φ̂
      var isPhiActive = hl === 'phi' || hl === 'basis';
      arrow(ctx, pPhi, endPhi, isPhiActive ? t.accentDeep : t.accent, isPhiActive ? 3.0 : 2.2);
      labelHat(ctx, 'φ', endPhi.x + 6, endPhi.y + 12, isPhiActive ? t.accentDeep : t.accent, 'left');

      /* 10. Basis vector comparisons (Spherical vs Cylindrical) */
      if (showComparison || hl === 'basis') {
        // Cylindrical ρ̂ = (cosφ, sinφ, 0) — perpendicular to wire
        var rhoHat3D = { x: c.x + vecL * c.cosP, y: c.y + vecL * c.sinP, z: c.z };
        var rhoHatScr = project(rhoHat3D.x, rhoHat3D.y, rhoHat3D.z, ox, oy, scale);
        arrow(ctx, P, rhoHatScr, t.copper, 1.8);
        labelHat(ctx, 'ρ', rhoHatScr.x + 4, rhoHatScr.y - 4, t.copper, 'left');

        // Cylindrical ẑ = (0, 0, 1) — parallel to wire along +z
        var zHat3D = { x: c.x, y: c.y, z: c.z + vecL };
        var zHatScr = project(zHat3D.x, zHat3D.y, zHat3D.z, ox, oy, scale);
        arrow(ctx, P, zHatScr, t.copper, 1.8);
        labelHat(ctx, 'z', zHatScr.x + 4, zHatScr.y - 4, t.copper, 'left');

        // Spherical r̂ = (sinθ cosφ, sinθ sinφ, cosθ)
        var rHat3D = { x: c.x + vecL * c.sinT * c.cosP, y: c.y + vecL * c.sinT * c.sinP, z: c.z + vecL * c.cosT };
        var rHatScr = project(rHat3D.x, rHat3D.y, rHat3D.z, ox, oy, scale);
        arrow(ctx, P, rHatScr, t.ink2, 1.4);
        labelHat(ctx, 'r', rHatScr.x + 4, rHatScr.y - 4, t.ink2, 'left');

        // Spherical θ̂ = (cosθ cosφ, cosθ sinφ, -sinθ)
        var thHat3D = { x: c.x + vecL * c.cosT * c.cosP, y: c.y + vecL * c.cosT * c.sinP, z: c.z - vecL * c.sinT };
        var thHatScr = project(thHat3D.x, thHat3D.y, thHat3D.z, ox, oy, scale);
        arrow(ctx, P, thHatScr, t.ink2, 1.4);
        labelHat(ctx, 'θ', thHatScr.x + 4, thHatScr.y - 4, t.ink2, 'left');

        // Shared indicator callout
        label(ctx, 'φ̂ shared by both systems', endPhi.x + 24, endPhi.y + 12, t.accentDeep, 'left');
      }
    }
    function stopRaf() {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    }

    function scheduleDraw() {
      if (dead) return;
      if (!canvas.isConnected || document.hidden) {
        stopRaf();
        return;
      }
      if (reduced) {
        draw();
        return;
      }
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        if (dead || !canvas.isConnected || document.hidden) return;
        draw();
      });
    }

    function onI() {
      currentI = clamp(parseFloat(sI.input.value), 0.5, 6.0);
      updateReadout();
      scheduleDraw();
    }
    function onR() {
      r = clamp(parseFloat(sR.input.value), 0.4, 1.5);
      updateReadout();
      scheduleDraw();
    }
    function onTh() {
      theta = clamp(parseFloat(sTh.input.value), 0.08, Math.PI - 0.08);
      updateReadout();
      scheduleDraw();
    }
    function onPh() {
      phi = wrapPhi(parseFloat(sPh.input.value));
      updateReadout();
      scheduleDraw();
    }

    sI.input.addEventListener('input', onI);
    sI.input.addEventListener('change', onI);
    sR.input.addEventListener('input', onR);
    sR.input.addEventListener('change', onR);
    sTh.input.addEventListener('input', onTh);
    sTh.input.addEventListener('change', onTh);
    sPh.input.addEventListener('input', onPh);
    sPh.input.addEventListener('change', onPh);

    function onDown(ev) {
      dragging = true;
      lastPx = ev.clientX;
      lastPy = ev.clientY;
      wrap.style.cursor = 'grabbing';
      if (canvas.setPointerCapture && ev.pointerId != null) {
        try { canvas.setPointerCapture(ev.pointerId); } catch (e) {}
      }
      if (ev.preventDefault) ev.preventDefault();
    }
    function onMove(ev) {
      var dx, dy;
      if (!dragging) return;
      dx = ev.clientX - lastPx;
      dy = ev.clientY - lastPy;
      lastPx = ev.clientX;
      lastPy = ev.clientY;
      phi = wrapPhi(phi + dx * 0.01);
      theta = clamp(theta + dy * 0.008, 0.08, Math.PI - 0.08);
      syncInputs();
      scheduleDraw();
    }
    function onUp() {
      dragging = false;
      wrap.style.cursor = 'grab';
    }

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('lostpointercapture', onUp);

    function onResize() { scheduleDraw(); }
    function onVis() {
      if (document.hidden) stopRaf();
      else scheduleDraw();
    }
    global.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVis);
    if (typeof ResizeObserver === 'function') {
      ro = new ResizeObserver(onResize);
      ro.observe(wrap);
    }

    updateReadout();
    draw();

    var activeSearchHl = null;
    function highlight(id, fromSearch) {
      if (fromSearch) {
        activeSearchHl = (id && HIGHLIGHT_IDS.indexOf(id) >= 0) ? id : null;
        hl = activeSearchHl;
      } else if (id) {
        hl = (HIGHLIGHT_IDS.indexOf(id) >= 0) ? id : null;
      } else {
        hl = activeSearchHl;
      }
      applyDomHl();
      scheduleDraw();
    }
    function destroy() {
      dead = true;
      dragging = false;
      stopRaf();
      global.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
      if (ro) {
        try { ro.disconnect(); } catch (e) {}
        ro = null;
      }
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('lostpointercapture', onUp);
      sI.input.removeEventListener('input', onI);
      sI.input.removeEventListener('change', onI);
      sR.input.removeEventListener('input', onR);
      sR.input.removeEventListener('change', onR);
      sTh.input.removeEventListener('input', onTh);
      sTh.input.removeEventListener('change', onTh);
      sPh.input.removeEventListener('input', onPh);
      sPh.input.removeEventListener('change', onPh);
      chkShowB.removeEventListener('change', onShowBChange);
      chkCompare.removeEventListener('change', onCompareChange);
      [itemB, itemPhiHat, itemRho, itemZ, sI, sR, sTh, sPh].forEach(function (it) {
        if (it && it.row) {
          it.row.removeEventListener('mouseenter', it.onEnter);
          it.row.removeEventListener('mouseleave', it.onLeave);
        }
      });
    }

    function getState() {
      var c = coords();
      return { I: currentI, r: r, theta: theta, phi: phi, rho: c.rho, z: c.z, B: c.B_uT };
    }

    return {
      highlight: highlight,
      destroy: destroy,
      getState: getState
    };
  }

  PGRE.conceptVisualizers.azimuth = {
    id: 'azimuth',
    kind: 'concept',
    title: 'Direction of azimuth',
    topic: 'em',
    href: '#/concepts/azimuth',
    formulaLatex: '$$|\\mathbf{B}|(2\\pi \\rho) = \\mu_0 I \\implies \\mathbf{B} = \\frac{\\mu_0 I}{2\\pi \\rho}\\hat{\\boldsymbol{\\phi}} \\quad (\\rho = r\\sin\\theta)$$',
    physicalStory: 'Ampère’s law for an infinite wire: the magnetic field circles strictly in the direction of azimuth $\\hat{\\boldsymbol{\\phi}}$. Compare spherical $(r, \\theta, \\varphi)$ and cylindrical $(\\rho, \\varphi, z)$: both share the exact same azimuthal unit vector $\\hat{\\boldsymbol{\\phi}} = -\\sin\\varphi\\,\\hat{\\mathbf{x}} + \\cos\\varphi\\,\\hat{\\mathbf{y}}$, while the wire radius is $\\rho = r\\sin\\theta$.',
    highlightIds: HIGHLIGHT_IDS,
    mount: mount
  };
})(typeof window !== 'undefined' ? window : globalThis);
