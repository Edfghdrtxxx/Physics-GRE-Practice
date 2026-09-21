/* Concept visualizer — spherical coordinates (physics convention) */
(function (global) {
  'use strict';

  var PGRE = global.PGRE = global.PGRE || {};
  PGRE.conceptVisualizers = PGRE.conceptVisualizers || {};

  var TWO_PI = Math.PI * 2;
  var HIGHLIGHT_IDS = ['r', 'theta', 'phi', 'x', 'y', 'z', 'origin', 'equator', 'sphere', 'phiHat', 'basis'];
  var YAW = 0.62;
  var PITCH = 0.48;
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
      line: tok('--line', '#e6dfd8'),
      ink: tok('--ink', '#141413'),
      ink2: tok('--ink-2', '#6c6a64'),
      ink3: tok('--ink-3', '#8e8b82'),
      accent: tok('--accent', '#cc785c'),
      accentDeep: tok('--accent-deep', '#964b32')
    };
  }

  function prefersReduced() {
    try {
      return !!(global.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) {
      return false;
    }
  }

  function cartesianOf(r, theta, phi) {
    var s = Math.sin(theta);
    return {
      x: r * s * Math.cos(phi),
      y: r * s * Math.sin(phi),
      z: r * Math.cos(theta)
    };
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
    var r = typeof opts.r === 'number' ? clamp(opts.r, 0.4, 1.6) : 1;
    var theta = typeof opts.theta === 'number' ? clamp(opts.theta, 0, Math.PI) : Math.PI / 4;
    var phi = typeof opts.phi === 'number' ? wrapPhi(opts.phi) : Math.PI / 3;

    var root = el('div', {
      className: 'cv-spherical',
      css: 'display:flex;flex-direction:column;gap:12px;color:var(--ink,#141413);'
    });
    root.setAttribute('data-viz', 'spherical');

    var wrap = el('div', {
      className: 'viz-canvas-wrapper',
      css: 'height:320px;min-height:260px;cursor:grab;touch-action:none;'
    });
    var canvas = el('canvas');
    canvas.setAttribute('aria-label', 'Spherical coordinates');
    wrap.appendChild(canvas);
    root.appendChild(wrap);

    var readout = el('div', {
      className: 'cv-readout viz-legend-strip',
      css: 'display:flex;flex-wrap:wrap;gap:12px 28px;padding:8px 4px;'
    });
    readout.setAttribute('aria-live', 'polite');

    function readoutItem(id, latex) {
      var row = el('div', {
        className: 'viz-legend-row cv-readout-item',
        css: 'display:flex;align-items:baseline;gap:8px;'
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

    var itemX = readoutItem('x', '$x$');
    var itemY = readoutItem('y', '$y$');
    var itemZ = readoutItem('z', '$z$');
    var itemPhiHat = readoutItem('phi', '$\\hat{\\boldsymbol{\\phi}}$ (azimuth)');
    root.appendChild(readout);

    var controls = el('div', { className: 'viz-controls-panel cv-spherical-controls' });

    function sliderRow(id, latex, min, max, step, value) {
      var row = el('div', { className: 'viz-param-row' });
      row.setAttribute('data-hl', id);
      var head = el('div', { className: 'viz-param-header' });
      var lab = el('label', { className: 'viz-param-label', text: latex });
      var val = el('span', { className: 'viz-param-val', text: fmt(value, 2) });
      var input = el('input', { className: 'viz-param-slider' });
      input.type = 'range';
      input.min = String(min);
      input.max = String(max);
      input.step = String(step);
      input.value = String(value);
      input.setAttribute('aria-label', id);
      lab.setAttribute('for', '');
      head.appendChild(lab);
      function onEnter() { highlight(id); }
      function onLeave() { highlight(null); }
      row.addEventListener('mouseenter', onEnter);
      row.addEventListener('mouseleave', onLeave);
      row.appendChild(head);
      row.appendChild(input);
      controls.appendChild(row);
      return { row: row, lab: lab, val: val, input: input, onEnter: onEnter, onLeave: onLeave };
    }

    var sR = sliderRow('r', '$r$', 0.4, 1.6, 0.01, r);
    var sTh = sliderRow('theta', '$\\theta$', 0, Math.PI, 0.01, theta);
    var sPh = sliderRow('phi', '$\\varphi$', 0, TWO_PI - 1e-6, 0.01, phi);
    var showBasis = true;
    var toggleRow = el('div', {
      className: 'cv-basis-toggle-row',
      css: 'display:flex;align-items:center;gap:8px;font-size:13px;color:var(--ink-2,#6c6a64);margin-top:6px;padding:4px 0;'
    });
    var chkBasis = el('input');
    chkBasis.type = 'checkbox';
    chkBasis.id = 'cv-basis-toggle';
    chkBasis.checked = true;
    chkBasis.style.cursor = 'pointer';
    var chkLab = el('label', {
      text: 'Show unit vectors (r̂, θ̂, φ̂) · φ̂ is azimuth direction',
      css: 'cursor:pointer;user-select:none;'
    });
    chkLab.setAttribute('for', 'cv-basis-toggle');
    toggleRow.appendChild(chkBasis);
    toggleRow.appendChild(chkLab);
    controls.appendChild(toggleRow);

    function onBasisChange() {
      showBasis = chkBasis.checked;
      scheduleDraw();
    }
    chkBasis.addEventListener('change', onBasisChange);

    root.appendChild(controls);

    var note = el('p', {
      className: 'cv-convention-note',
      css: 'margin:0 0 4px;font-size:13px;color:var(--ink-2,#6c6a64);line-height:1.45;',
      text: 'Physics convention: $\\theta$ is polar angle down from $+z$; $\\varphi$ is azimuth from $+x$ in $xy$-plane. Azimuth unit vector $\\hat{\\boldsymbol{\\phi}} = -\\sin\\varphi\\,\\hat{\\mathbf{x}} + \\cos\\varphi\\,\\hat{\\mathbf{y}}$ (as in Ampère\'s law $\\mathbf{B} = \\frac{\\mu_0 I}{2\\pi \\rho}\\hat{\\boldsymbol{\\phi}}$ with cylindrical radius $\\rho = r\\sin\\theta$).'
    });
    root.insertBefore(note, wrap);
    if (host) host.appendChild(root);

    var ctx = canvas.getContext ? canvas.getContext('2d') : null;
    var ro = null;

    function cart() {
      return cartesianOf(r, theta, phi);
    }

    function updateReadout() {
      var c = cart();
      itemX.val.textContent = '= ' + fmt(c.x, 3);
      itemY.val.textContent = '= ' + fmt(c.y, 3);
      itemZ.val.textContent = '= ' + fmt(c.z, 3);
      var sinPh = Math.sin(phi);
      var cosPh = Math.cos(phi);
      var xComp = -sinPh;
      var yComp = cosPh;
      itemPhiHat.val.textContent = '= ' + (xComp >= 0 ? '+' : '') + fmt(xComp, 2) + 'x̂ ' + (yComp >= 0 ? '+' : '') + fmt(yComp, 2) + 'ŷ + 0.00ẑ';
      sR.val.textContent = fmt(r, 2);
      sTh.val.textContent = fmt(theta, 2);
      sPh.val.textContent = fmt(phi, 2);
    }
    function syncInputs() {
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
      paint(itemX.row, hl === 'x');
      paint(itemY.row, hl === 'y');
      paint(itemZ.row, hl === 'z');
      paint(itemPhiHat.row, hl === 'phi' || hl === 'phiHat' || hl === 'basis');
      paint(sR.lab, hl === 'r');
      paint(sTh.lab, hl === 'theta');
      paint(sPh.lab, hl === 'phi' || hl === 'phiHat');
    }
    function lw(base, id) {
      return hl === id ? base * 1.9 : base;
    }

    function col(base, id, t) {
      return hl === id ? t.accent : base;
    }

    function strokeSegs(c, pts, pred, color, width, dash) {
      var i;
      var started = false;
      if (!c || !pts || pts.length < 2) return;
      c.save();
      c.strokeStyle = color;
      c.lineWidth = width;
      c.lineJoin = 'round';
      c.lineCap = 'round';
      if (dash) c.setLineDash(dash);
      c.beginPath();
      for (i = 0; i < pts.length - 1; i++) {
        if (!pred(pts[i], pts[i + 1])) {
          started = false;
          continue;
        }
        if (!started) {
          c.moveTo(pts[i].x, pts[i].y);
          started = true;
        }
        c.lineTo(pts[i + 1].x, pts[i + 1].y);
      }
      c.stroke();
      c.restore();
    }

    function isFront(a, b) {
      return (a.d + b.d) < 0;
    }

    function isBack(a, b) {
      return !isFront(a, b);
    }

    function always() {
      return true;
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


    function meridian(R, ph, n, ox, oy, scale) {
      var out = [];
      var i, th, s;
      for (i = 0; i <= n; i++) {
        th = Math.PI * i / n;
        s = Math.sin(th);
        out.push(project(R * s * Math.cos(ph), R * s * Math.sin(ph), R * Math.cos(th), ox, oy, scale));
      }
      return out;
    }

    function parallel(R, th, n, ox, oy, scale) {
      var out = [];
      var i, ph, s, cz;
      s = Math.sin(th);
      cz = R * Math.cos(th);
      for (i = 0; i <= n; i++) {
        ph = TWO_PI * i / n;
        out.push(project(R * s * Math.cos(ph), R * s * Math.sin(ph), cz, ox, oy, scale));
      }
      return out;
    }

    function draw() {
      if (dead || !ctx) return;
      var t = tokens();
      var dpr = global.devicePixelRatio || 1;
      if (dpr > 2) dpr = 2;
      var cssW = (wrap.clientWidth || canvas.clientWidth || 640);
      var cssH = (wrap.clientHeight || canvas.clientHeight || 320);
      if (cssW < 2) cssW = 640;
      if (cssH < 2) cssH = 320;
      var needW = Math.round(cssW * dpr);
      var needH = Math.round(cssH * dpr);
      if (canvas.width !== needW) canvas.width = needW;
      if (canvas.height !== needH) canvas.height = needH;
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var w = cssW;
      var h = cssH;
      var ox = w * 0.52;
      var oy = h * 0.52;
      var scale = Math.min(w, h) * 0.42;
      var axisL = 1.78;
      var i;
      var c = cart();
      var P = project(c.x, c.y, c.z, ox, oy, scale);
      var Pxy = project(c.x, c.y, 0, ox, oy, scale);
      var O = project(0, 0, 0, ox, oy, scale);
      var sphereCol = hl === 'sphere' ? t.accent : t.ink3;
      var sphereFront = hl === 'sphere' ? t.accentDeep : t.ink2;
      var sphereW = hl === 'sphere' ? 1.7 : 1;

      ctx.fillStyle = t.bg;
      ctx.fillRect(0, 0, w, h);

      for (i = 0; i < 8; i++) {
        strokeSegs(ctx, meridian(r, i * Math.PI / 4, 28, ox, oy, scale), isBack, sphereCol, sphereW, null);
      }
      for (i = 1; i <= 5; i++) {
        strokeSegs(ctx, parallel(r, i * Math.PI / 6, 48, ox, oy, scale), isBack, sphereCol, sphereW, null);
      }

      function axis(id, dx, dy, dz, glyph, align) {
        var a0 = project(-0.22 * dx, -0.22 * dy, -0.22 * dz, ox, oy, scale);
        var a1 = project(axisL * dx, axisL * dy, axisL * dz, ox, oy, scale);
        var color = col(t.ink, id, t);
        arrow(ctx, a0, a1, color, lw(1.25, id));
        label(ctx, glyph, a1.x + (align === 'right' ? -8 : 8), a1.y - 2, color, align);
      }
      axis('x', 1, 0, 0, 'x', 'left');
      axis('y', 0, 1, 0, 'y', 'right');
      axis('z', 0, 0, 1, 'z', 'left');

      strokeSegs(ctx, parallel(r, Math.PI / 2, 56, ox, oy, scale), always, col(t.ink2, 'equator', t), lw(1.45, 'equator'), null);

      strokeSegs(ctx, meridian(r, phi, 28, ox, oy, scale), isFront, hl === 'theta' ? t.accent : t.ink2, 1.25, null);
      strokeSegs(ctx, parallel(r, theta, 48, ox, oy, scale), isFront, hl === 'phi' || hl === 'theta' || hl === 'phiHat' ? t.accent : t.ink2, 1.25, null);
      if (hl === 'phi' || hl === 'phiHat') {
        strokeSegs(ctx, parallel(r, theta, 48, ox, oy, scale), isBack, t.accent, 1.2, [3, 4]);
      }

      for (i = 0; i < 8; i++) {
        strokeSegs(ctx, meridian(r, i * Math.PI / 4, 28, ox, oy, scale), isFront, sphereFront, sphereW, null);
      }
      for (i = 1; i <= 5; i++) {
        if (i === 3) continue;
        strokeSegs(ctx, parallel(r, i * Math.PI / 6, 48, ox, oy, scale), isFront, sphereFront, sphereW, null);
      }

      var arcR = 0.42 * Math.max(0.75, r);
      var n, tt, pts;
      if (theta > 0.04) {
        pts = [];
        for (n = 0; n <= 24; n++) {
          tt = theta * n / 24;
          pts.push(project(
            arcR * Math.sin(tt) * Math.cos(phi),
            arcR * Math.sin(tt) * Math.sin(phi),
            arcR * Math.cos(tt),
            ox, oy, scale
          ));
        }
        strokeSegs(ctx, pts, always, col(t.accent, 'theta', t), lw(2, 'theta'), null);
        n = pts[Math.floor(pts.length / 2)];
        label(ctx, 'θ', n.x + 8, n.y - 6, col(t.accent, 'theta', t), 'left');
      }

      if (phi > 0.04) {
        pts = [];
        for (n = 0; n <= 28; n++) {
          tt = phi * n / 28;
          pts.push(project(arcR * Math.cos(tt), arcR * Math.sin(tt), 0, ox, oy, scale));
        }
        strokeSegs(ctx, pts, always, col(t.ink3, 'phi', t), lw(1.35, 'phi'), null);
        if (pts.length >= 2) {
          var pLast = pts[pts.length - 1];
          var pPrev = pts[pts.length - 2];
          var adx = pLast.x - pPrev.x;
          var ady = pLast.y - pPrev.y;
          var alen = Math.sqrt(adx * adx + ady * ady) || 1;
          var aux = adx / alen;
          var auy = ady / alen;
          var asize = (hl === 'phi' || hl === 'phiHat') ? 7.5 : 5.5;
          ctx.save();
          ctx.strokeStyle = col(t.ink3, 'phi', t);
          ctx.lineWidth = lw(1.35, 'phi');
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(pLast.x, pLast.y);
          ctx.lineTo(pLast.x - aux * asize + auy * asize * 0.45, pLast.y - auy * asize - aux * asize * 0.45);
          ctx.moveTo(pLast.x, pLast.y);
          ctx.lineTo(pLast.x - aux * asize - auy * asize * 0.45, pLast.y - auy * asize + aux * asize * 0.45);
          ctx.stroke();
          ctx.restore();
        }
        n = pts[Math.floor(pts.length / 2)];
        label(ctx, 'φ', n.x + 6, n.y + 10, col(t.ink2, 'phi', t), 'left');
      }

      ctx.save();
      ctx.strokeStyle = t.ink3;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(P.x, P.y);
      ctx.lineTo(Pxy.x, Pxy.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(O.x, O.y);
      ctx.lineTo(Pxy.x, Pxy.y);
      ctx.stroke();
      ctx.restore();

      arrow(ctx, O, P, col(t.accentDeep, 'r', t), lw(1.7, 'r'));
      label(ctx, 'r', (O.x + P.x) * 0.5 + 8, (O.y + P.y) * 0.5 - 6, col(t.accentDeep, 'r', t), 'left');

      ctx.save();
      ctx.fillStyle = hl === 'origin' ? t.accent : t.ink;
      ctx.beginPath();
      ctx.arc(O.x, O.y, hl === 'origin' ? 4.5 : 3.2, 0, TWO_PI);
      ctx.fill();
      ctx.restore();
      label(ctx, 'O', O.x - 12, O.y + 12, col(t.ink2, 'origin', t), 'right');

      ctx.save();
      ctx.fillStyle = t.accent;
      ctx.strokeStyle = t.ink;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(P.x, P.y, 4.5, 0, TWO_PI);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      label(ctx, 'P', P.x + 9, P.y - 9, t.ink, 'left');

      /* Unit vectors at point P */
      var vecLen = 0.38;
      var sinT = Math.sin(theta);
      var cosT = Math.cos(theta);
      var sinPhV = Math.sin(phi);
      var cosPhV = Math.cos(phi);

      var rHat3 = {
        x: c.x + vecLen * sinT * cosPhV,
        y: c.y + vecLen * sinT * sinPhV,
        z: c.z + vecLen * cosT
      };
      var rHatScr = project(rHat3.x, rHat3.y, rHat3.z, ox, oy, scale);

      var thHat3 = {
        x: c.x + vecLen * cosT * cosPhV,
        y: c.y + vecLen * cosT * sinPhV,
        z: c.z - vecLen * sinT
      };
      var thHatScr = project(thHat3.x, thHat3.y, thHat3.z, ox, oy, scale);

      var phiHat3 = {
        x: c.x - vecLen * sinPhV,
        y: c.y + vecLen * cosPhV,
        z: c.z
      };
      var phiHatScr = project(phiHat3.x, phiHat3.y, phiHat3.z, ox, oy, scale);

      if (showBasis || hl === 'theta' || hl === 'basis') {
        arrow(ctx, P, thHatScr, col(t.ink2, 'theta', t), lw(1.6, 'theta'));
        labelHat(ctx, 'θ', thHatScr.x + 5, thHatScr.y - 4, col(t.ink2, 'theta', t), 'left');
      }

      if (showBasis || hl === 'r' || hl === 'basis') {
        arrow(ctx, P, rHatScr, col(t.accentDeep, 'r', t), lw(1.6, 'r'));
        labelHat(ctx, 'r', rHatScr.x + 5, rHatScr.y - 4, col(t.accentDeep, 'r', t), 'left');
      }

      /* φ̂ — Azimuth direction */
      var isPhiHl = hl === 'phi' || hl === 'phiHat' || hl === 'basis';
      var phiCol = isPhiHl ? t.accentDeep : (showBasis ? t.accent : t.ink2);
      var phiW = isPhiHl ? 2.8 : (showBasis ? 2.0 : 1.5);
      if (showBasis || isPhiHl) {
        arrow(ctx, P, phiHatScr, phiCol, phiW);
        labelHat(ctx, 'φ', phiHatScr.x + 6, phiHatScr.y - 4, phiCol, 'left');
        if (isPhiHl) {
          label(ctx, 'azimuth', phiHatScr.x + 20, phiHatScr.y - 4, phiCol, 'left');
        }
      }

      if (theta < 0.06 || theta > Math.PI - 0.06) {
        label(ctx, 'φ̂ degenerate at pole', P.x + 10, P.y + 12, t.ink3, 'left');
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
      if (!canvas.isConnected) {
        stopRaf();
        return;
      }
      if (document.hidden) {
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
        if (dead) return;
        if (!canvas.isConnected || document.hidden) {
          stopRaf();
          return;
        }
        draw();
      });
    }

    function onR() {
      r = clamp(parseFloat(sR.input.value), 0.4, 1.6);
      updateReadout();
      scheduleDraw();
    }
    function onTh() {
      theta = clamp(parseFloat(sTh.input.value), 0, Math.PI);
      updateReadout();
      scheduleDraw();
    }
    function onPh() {
      phi = wrapPhi(parseFloat(sPh.input.value));
      updateReadout();
      scheduleDraw();
    }

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
      theta = clamp(theta + dy * 0.008, 0, Math.PI);
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

    function onResize() {
      scheduleDraw();
    }
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

    function highlight(id) {
      if (!id || HIGHLIGHT_IDS.indexOf(id) < 0) hl = null;
      else hl = id;
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
      sR.input.removeEventListener('input', onR);
      sR.input.removeEventListener('change', onR);
      sTh.input.removeEventListener('input', onTh);
      sTh.input.removeEventListener('change', onTh);
      sPh.input.removeEventListener('input', onPh);
      sPh.input.removeEventListener('change', onPh);
      chkBasis.removeEventListener('change', onBasisChange);
      [itemX, itemY, itemZ, itemPhiHat, sR, sTh, sPh].forEach(function (it) {
        if (it && it.row) {
          it.row.removeEventListener('mouseenter', it.onEnter);
          it.row.removeEventListener('mouseleave', it.onLeave);
        }
      });
    }

    function getState() {
      var c = cart();
      return { r: r, theta: theta, phi: phi, x: c.x, y: c.y, z: c.z };
    }

    return {
      highlight: highlight,
      destroy: destroy,
      getState: getState
    };
  }

  PGRE.conceptVisualizers.spherical = {
    id: 'spherical',
    kind: 'concept',
    title: 'Spherical coordinates',
    topic: 'cm',
    href: '#/concepts/spherical',
    formulaLatex: '$$x = r \\sin\\theta \\cos\\varphi,\\; y = r \\sin\\theta \\sin\\varphi,\\; z = r \\cos\\theta$$',
    physicalStory: 'Physics convention: $\\theta$ is the polar angle down from $+z$; $\\varphi$ is the azimuth from $+x$ in the $xy$-plane. Azimuth unit vector: $\\hat{\\boldsymbol{\\phi}} = -\\sin\\varphi\\,\\hat{\\mathbf{x}} + \\cos\\varphi\\,\\hat{\\mathbf{y}}$ (Ampère\'s law: $\\mathbf{B} = \\frac{\\mu_0 I}{2\\pi \\rho}\\hat{\\boldsymbol{\\phi}}$ with cylindrical distance $\\rho = r\\sin\\theta$).',
    highlightIds: ['r', 'theta', 'phi', 'x', 'y', 'z', 'origin', 'equator', 'sphere', 'phiHat', 'basis'],
    mount: mount
  };
})(typeof window !== 'undefined' ? window : globalThis);
