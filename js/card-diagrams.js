/* Inline 3D diagrams drawn on a recall-card back in place of that card's
   .recall-list. Registry is keyed by card id. Not a visualizer: no Lab
   entry, no js/visualizers/ file. Drag rotates; wheel / pinch / buttons zoom. */
window.PGRE = window.PGRE || {};
PGRE.cardDiagrams = PGRE.cardDiagrams || {};

PGRE.replaceRecallListWithDiagram = function (html, cardId) {
  if (!cardId || !PGRE.cardDiagrams[cardId]) return html;
  return String(html).replace(
    /<ul class="recall-list">[\s\S]*?<\/ul>/,
    '<div class="card-diagram-host" data-card-diagram="' +
      String(cardId).replace(/"/g, '') + '"></div>'
  );
};

PGRE.mountCardDiagrams = function (root) {
  if (!root) return;
  var hosts = [];
  if (root.getAttribute && root.getAttribute('data-card-diagram')) hosts.push(root);
  if (root.querySelectorAll) {
    var found = root.querySelectorAll('[data-card-diagram]');
    for (var i = 0; i < found.length; i++) hosts.push(found[i]);
  }
  for (var j = 0; j < hosts.length; j++) {
    var host = hosts[j];
    if (host.getAttribute('data-mounted') === '1') continue;
    var id = host.getAttribute('data-card-diagram');
    var fn = PGRE.cardDiagrams[id];
    if (typeof fn !== 'function') continue;
    host.setAttribute('data-mounted', '1');
    fn(host);
  }
};

(function wrapTypesetMath() {
  function wrap() {
    var prev = PGRE.typesetMath;
    if (typeof prev !== 'function' || prev._pgreCardDiagrams) return;
    var wrapped = function (el) {
      prev.call(PGRE, el);
      PGRE.mountCardDiagrams(el);
    };
    wrapped._pgreCardDiagrams = true;
    PGRE.typesetMath = wrapped;
  }
  wrap();
  document.addEventListener('DOMContentLoaded', wrap);
})();

/* ——— Vector helpers (3-vectors as [x,y,z]) ——— */
function vadd(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function vsub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function vscale(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
function vdot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function vcross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function vlen(a) { return Math.sqrt(vdot(a, a)); }
function vnorm(a) {
  var n = vlen(a);
  return n < 1e-12 ? [0, 0, 0] : vscale(a, 1 / n);
}

/* Nonrelativistic radiation field of an accelerating point charge (v << c).
   a along +z; r-hat in the xz plane at polar angle theta from a.
   E_rad at the field point is -a_perp for q > 0. */
function radiationFieldVectors() {
  var theta = 50 * Math.PI / 180;
  var aLen = 1.38;
  var R = 2.85;
  var a = [0, 0, aLen];
  var rHat = [Math.sin(theta), 0, Math.cos(theta)];
  var aPar = vscale(rHat, vdot(a, rHat));
  var aPerp = vsub(a, aPar);
  var field = vscale(rHat, R);
  var eDir = vnorm(vscale(aPerp, -1));
  var eRad = vscale(eDir, 1.45);
  return {
    theta: theta,
    origin: [0, 0, 0],
    a: a,
    rHat: rHat,
    aPar: aPar,
    aPerp: aPerp,
    field: field,
    eRad: eRad,
    R: R
  };
}
PGRE.radiationFieldDiagramVectors = radiationFieldVectors;

var CD_YAW0 = 1.08;
var CD_PITCH0 = 0.42;
var CD_ZOOM_MIN = 0.6;
var CD_ZOOM_MAX = 3;
var CD_ZOOM_0 = 1;
PGRE.clampCardDiagramZoom = function (z) {
  z = Number(z);
  if (!isFinite(z) || z < CD_ZOOM_MIN) return CD_ZOOM_MIN;
  if (z > CD_ZOOM_MAX) return CD_ZOOM_MAX;
  return z;
};

function cssVar(el, name, fallback) {
  var raw = '';
  try { raw = getComputedStyle(el).getPropertyValue(name); } catch (e) { raw = ''; }
  raw = String(raw || '').trim();
  return raw || fallback;
}

function renderTex(el, tex, display) {
  if (!el) return;
  if (window.katex) {
    try {
      window.katex.render(tex, el, { throwOnError: false, displayMode: !!display });
      return;
    } catch (e) { /* fall through */ }
  }
  el.textContent = tex;
}

PGRE.cardDiagrams['supp-radiation-field'] = function (host) {
  var vec = radiationFieldVectors();
  var yaw = CD_YAW0;
  var pitch = CD_PITCH0;
  var zoom = CD_ZOOM_0;
  var dragging = false;
  var lastX = 0;
  var lastY = 0;
  var pointerId = null;
  var pointers = {};
  var pinching = false;
  var pinchStartDist = 0;
  var pinchStartZoom = CD_ZOOM_0;
  var lastNarrow = null;
  var eradLong = '\\mathbf{E}_{\\mathrm{rad}}\\ (q>0:\\ \\text{opp. }\\mathbf{a}_\\perp)';
  var eradShort = '\\mathbf{E}_{\\mathrm{rad}}';

  host.setAttribute('role', 'img');
  host.setAttribute('aria-label',
    'Nonrelativistic radiation field of a positive accelerating point charge. ' +
    'The radiation electric field at the field point points opposite the component ' +
    'of acceleration perpendicular to the line of sight. It lies in the plane of ' +
    'the line of sight and the acceleration, and is perpendicular to the line of ' +
    'sight. Its magnitude is proportional to sine of theta and the power per solid ' +
    'angle is proportional to sine squared theta: both are zero on the acceleration ' +
    'axis and largest at ninety degrees. Drag to rotate. Scroll, pinch, or use the ' +
    'zoom buttons to zoom. Reset returns zoom and rotation to the default view.');
  host.innerHTML =
    '<canvas></canvas>' +
    '<div class="card-diagram-labels" aria-hidden="true">' +
      '<span class="cd-lab" data-lab="q"></span>' +
      '<span class="cd-lab" data-lab="a"></span>' +
      '<span class="cd-lab" data-lab="apar"></span>' +
      '<span class="cd-lab" data-lab="aperp"></span>' +
      '<span class="cd-lab" data-lab="rhat"></span>' +
      '<span class="cd-lab" data-lab="erad"></span>' +
      '<span class="cd-lab" data-lab="theta"></span>' +
      '<span class="cd-lab cd-lab-sm cd-lab-plane" data-lab="plane"></span>' +
      '<span class="cd-lab cd-lab-muted cd-lab-corner" data-lab="ang"></span>' +
    '</div>' +
    '<p class="card-diagram-hint">Drag to rotate. Scroll or pinch to zoom.</p>' +
    '<div class="card-diagram-zoom" role="group" aria-label="Zoom">' +
      '<button type="button" class="cd-zoom-btn" data-cd-zoom="in" aria-label="Zoom in">+</button>' +
      '<button type="button" class="cd-zoom-btn" data-cd-zoom="out" aria-label="Zoom out">\u2212</button>' +
      '<button type="button" class="cd-zoom-btn cd-zoom-reset" data-cd-zoom="reset" aria-label="Reset view">Reset</button>' +
    '</div>';

  var canvas = host.querySelector('canvas');
  var labels = {};
  host.querySelectorAll('.cd-lab').forEach(function (el) {
    labels[el.getAttribute('data-lab')] = el;
  });
  renderTex(labels.q, 'q');
  renderTex(labels.a, '\\mathbf{a}');
  renderTex(labels.apar, '\\mathbf{a}_\\parallel');
  renderTex(labels.aperp, '\\mathbf{a}_\\perp');
  renderTex(labels.rhat, '\\hat{\\mathbf{r}}');
  renderTex(labels.erad, '\\mathbf{E}_{\\mathrm{rad}}\\ (q>0:\\ \\text{opp. }\\mathbf{a}_\\perp)');
  renderTex(labels.theta, '\\theta');
  renderTex(labels.plane, '\\text{plane of }\\hat{\\mathbf{r}},\\,\\mathbf{a}');
  renderTex(labels.ang,
    '\\begin{array}{c}|\\mathbf{E}_{\\mathrm{rad}}|\\propto\\sin\\theta\\\\' +
    'dP/d\\Omega\\propto\\sin^{2}\\theta\\\\' +
    '\\text{null at }0^{\\circ},180^{\\circ}\\text{; max at }90^{\\circ}\\end{array}');

  var ctx = canvas.getContext('2d');
  var W = 480, H = 384;

  function measure() {
    var w = host.clientWidth;
    var h = host.clientHeight;
    if (w < 40) {
      var node = host.parentElement;
      while (node && node.clientWidth < 40) node = node.parentElement;
      w = node ? Math.max(220, node.clientWidth - 8) : 480;
      h = Math.round(w * 0.8);
    }
    if (h < 40) h = Math.round(w * 0.8);
    return { w: w, h: h };
  }

  function project(p) {
    var cy = Math.cos(yaw), sy = Math.sin(yaw);
    var x1 = p[0] * cy - p[1] * sy;
    var y1 = p[0] * sy + p[1] * cy;
    var z1 = p[2];
    var cp = Math.cos(pitch), sp = Math.sin(pitch);
    var y2 = y1 * cp - z1 * sp;
    var z2 = y1 * sp + z1 * cp;
    var scale = Math.min(W, H) / (W < 420 ? 6.0 : 7.3) * zoom;
    var persp = 7.4 / (7.4 + y2);
    return {
      x: W / 2 + x1 * scale * persp,
      y: H * 0.56 - z2 * scale * persp,
      z: y2,
      k: persp
    };
  }

  function token() {
    return {
      ink: cssVar(host, '--ink', '#141413'),
      ink2: cssVar(host, '--ink-2', '#6c6a64'),
      ink3: cssVar(host, '--ink-3', '#8e8b82'),
      accent: cssVar(host, '--accent', '#cc785c'),
      accentDeep: cssVar(host, '--accent-deep', '#964b32'),
      line: cssVar(host, '--line', '#e6dfd8'),
      good: cssVar(host, '--good', '#3b6d11')
    };
  }

  function place(el, p, dx, dy) {
    var s = project(p);
    var x = s.x + (dx || 0);
    var y = s.y + (dy || 0);
    if (x < 18) x = 18;
    if (x > W - 18) x = W - 18;
    if (y < 14) y = 14;
    if (y > H - 22) y = H - 22;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.visibility = s.k > 0.15 ? 'visible' : 'hidden';
  }

  function drawArrow(from, to, color, width, dashed) {
    var a = project(from), b = project(to);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (dashed) ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.setLineDash([]);
    var dx = b.x - a.x, dy = b.y - a.y;
    var len = Math.hypot(dx, dy) || 1;
    var ux = dx / len, uy = dy / len;
    var ah = Math.max(7, 9 * b.k);
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - ux * ah + uy * ah * 0.42, b.y - uy * ah - ux * ah * 0.42);
    ctx.lineTo(b.x - ux * ah - uy * ah * 0.42, b.y - uy * ah + ux * ah * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawPolyline(pts, color, width, alpha) {
    if (pts.length < 2) return;
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    var p0 = project(pts[0]);
    ctx.moveTo(p0.x, p0.y);
    for (var i = 1; i < pts.length; i++) {
      var p = project(pts[i]);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function doughnutCurves() {
    var R0 = 0.88;
    var curves = [];
    var nPhi = 6, nTh = 32;
    var i, j, phi, th, r, pts;
    for (i = 0; i < nPhi; i++) {
      phi = i * Math.PI / nPhi;
      pts = [];
      for (j = 0; j <= nTh; j++) {
        th = j * Math.PI / nTh;
        r = R0 * Math.sin(th) * Math.sin(th);
        pts.push([
          r * Math.sin(th) * Math.cos(phi),
          r * Math.sin(th) * Math.sin(phi),
          r * Math.cos(th)
        ]);
      }
      curves.push(pts);
    }
    var lats = [Math.PI / 2, Math.PI / 3];
    for (i = 0; i < lats.length; i++) {
      th = lats[i];
      r = R0 * Math.sin(th) * Math.sin(th);
      pts = [];
      var n = 48;
      for (j = 0; j <= n; j++) {
        phi = j * 2 * Math.PI / n;
        pts.push([
          r * Math.sin(th) * Math.cos(phi),
          r * Math.sin(th) * Math.sin(phi),
          r * Math.cos(th)
        ]);
      }
      curves.push(pts);
    }
    return curves;
  }
  var doughnut = doughnutCurves();

  function planeQuad() {
    var rHat = vec.rHat, aHat = vnorm(vec.a);
    var p0 = vadd(vscale(rHat, -0.2), vscale(aHat, -0.15));
    var p1 = vadd(vscale(rHat, 1.85), vscale(aHat, -0.15));
    var p2 = vadd(vscale(rHat, 1.85), vscale(aHat, 1.2));
    var p3 = vadd(vscale(rHat, -0.2), vscale(aHat, 1.2));
    return [p0, p1, p2, p3];
  }

  function angleArc() {
    var pts = [];
    var rad = 0.46;
    var n = 18;
    for (var i = 0; i <= n; i++) {
      var t = vec.theta * i / n;
      pts.push([rad * Math.sin(t), 0, rad * Math.cos(t)]);
    }
    return pts;
  }

  function rightAngle() {
    var s = 0.2;
    var eHat = vnorm(vec.eRad);
    var a0 = vec.field;
    var a1 = vadd(a0, vscale(vec.rHat, -s));
    var a2 = vadd(a1, vscale(eHat, s));
    var a3 = vadd(a0, vscale(eHat, s));
    return [a1, a2, a3];
  }

  function draw() {
    var size = measure();
    W = size.w;
    H = size.h;
    var dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var narrow = W < 420;
    if (narrow) host.classList.add('is-narrow');
    else host.classList.remove('is-narrow');
    if (narrow !== lastNarrow) {
      lastNarrow = narrow;
      renderTex(labels.erad, narrow ? eradShort : eradLong);
    }
    var c = token();
    host.setAttribute('data-yaw', String(yaw));
    host.setAttribute('data-pitch', String(pitch));
    host.setAttribute('data-zoom', zoom.toFixed(3));
    host.setAttribute('data-ink', c.ink);

    var i;
    for (i = 0; i < doughnut.length; i++) {
      drawPolyline(doughnut[i], c.ink3, 1.1, 0.45);
    }

    var quad = planeQuad();
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = c.accent;
    ctx.beginPath();
    var q0 = project(quad[0]);
    ctx.moveTo(q0.x, q0.y);
    for (i = 1; i < quad.length; i++) {
      var qi = project(quad[i]);
      ctx.lineTo(qi.x, qi.y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    drawPolyline([vec.origin, vec.field], c.ink2, 1.4, 1);
    drawArrow(vec.origin, vec.aPar, c.ink2, 1.6, true);
    drawArrow(vec.origin, vec.aPerp, c.good, 2.1, false);
    drawArrow(vec.origin, vec.a, c.ink, 2.4, false);
    var rHatTip = vadd(vec.field, vscale(vec.rHat, 0.72));
    drawArrow(vec.field, rHatTip, c.ink, 2.0, false);
    drawArrow(vec.field, vadd(vec.field, vec.eRad), c.accentDeep, 2.6, false);
    drawPolyline(angleArc(), c.ink, 1.5, 1);
    drawPolyline(rightAngle(), c.accentDeep, 1.6, 1);

    var o = project(vec.origin);
    ctx.save();
    ctx.fillStyle = c.accent;
    ctx.strokeStyle = c.ink;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(o.x, o.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    var f = project(vec.field);
    ctx.fillStyle = c.ink;
    ctx.beginPath();
    ctx.arc(f.x, f.y, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    place(labels.q, vec.origin, -22, 18);
    place(labels.a, vscale(vec.a, 0.62), -24, -10);
    place(labels.aperp, vec.aPerp, -32, -6);
    place(labels.apar, vscale(vec.aPar, narrow ? 0.32 : 1), narrow ? 14 : 22, narrow ? 22 : 12);
    place(labels.rhat, rHatTip, 18, -12);
    if (narrow) {
      place(labels.erad, vadd(vec.field, vec.eRad), 22, 28);
    } else {
      place(labels.erad, vadd(vec.field, vec.eRad), 36, 6);
    }
    var thLab = [0.78 * Math.sin(vec.theta * 0.5), 0, 0.78 * Math.cos(vec.theta * 0.5)];
    place(labels.theta, thLab, narrow ? 8 : 10, narrow ? 14 : -6);
  }

  function pointerCount() {
    var n = 0, id;
    for (id in pointers) {
      if (Object.prototype.hasOwnProperty.call(pointers, id)) n++;
    }
    return n;
  }
  function pinchDist() {
    var ids = Object.keys(pointers);
    if (ids.length < 2) return 0;
    var a = pointers[ids[0]], b = pointers[ids[1]];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  function isZoomControl(el) {
    return !!(el && el.closest && el.closest('.card-diagram-zoom'));
  }

  function onDown(ev) {
    if (ev.button != null && ev.button !== 0) return;
    if (isZoomControl(ev.target)) return;
    pointers[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
    if (pointerCount() >= 2) {
      dragging = false;
      pinching = true;
      pinchStartDist = pinchDist();
      pinchStartZoom = zoom;
      host.classList.remove('is-dragging');
      if (ev.cancelable) ev.preventDefault();
      ev.stopPropagation();
      return;
    }
    dragging = true;
    lastX = ev.clientX;
    lastY = ev.clientY;
    pointerId = ev.pointerId;
    try { host.setPointerCapture(ev.pointerId); } catch (eCap) { /* older */ }
    host.classList.add('is-dragging');
    if (ev.cancelable) ev.preventDefault();
    ev.stopPropagation();
  }
  function onMove(ev) {
    if (pointers[ev.pointerId]) {
      pointers[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
    }
    if (pinching && pointerCount() >= 2) {
      var d = pinchDist();
      if (pinchStartDist > 1 && d > 1) {
        zoom = PGRE.clampCardDiagramZoom(pinchStartZoom * (d / pinchStartDist));
        draw();
      }
      if (ev.cancelable) ev.preventDefault();
      return;
    }
    if (!dragging) return;
    if (pointerId != null && ev.pointerId !== pointerId) return;
    var dx = ev.clientX - lastX;
    var dy = ev.clientY - lastY;
    lastX = ev.clientX;
    lastY = ev.clientY;
    yaw += dx * 0.008;
    pitch += dy * 0.008;
    if (pitch > 1.2) pitch = 1.2;
    if (pitch < -1.2) pitch = -1.2;
    draw();
    if (ev.cancelable) ev.preventDefault();
  }
  function onUp(ev) {
    delete pointers[ev.pointerId];
    if (pointerCount() < 2) pinching = false;
    if (pointerId != null && ev.pointerId !== pointerId && pointerCount() > 0) return;
    dragging = false;
    pointerId = null;
    host.classList.remove('is-dragging');
  }

  function onWheel(ev) {
    if (ev.cancelable) ev.preventDefault();
    ev.stopPropagation();
    var dy = ev.deltaY;
    if (ev.deltaMode === 1) dy *= 16;
    if (ev.deltaMode === 2) dy *= 120;
    var k = ev.ctrlKey ? 0.012 : 0.0022;
    zoom = PGRE.clampCardDiagramZoom(zoom * Math.exp(-dy * k));
    draw();
  }

  function applyZoomOp(op) {
    if (op === 'in') zoom = PGRE.clampCardDiagramZoom(zoom * 1.25);
    else if (op === 'out') zoom = PGRE.clampCardDiagramZoom(zoom / 1.25);
    else if (op === 'reset') {
      zoom = CD_ZOOM_0;
      yaw = CD_YAW0;
      pitch = CD_PITCH0;
    }
    draw();
  }

  host.addEventListener('pointerdown', onDown);
  host.addEventListener('pointermove', onMove);
  host.addEventListener('pointerup', onUp);
  host.addEventListener('pointercancel', onUp);
  host.addEventListener('lostpointercapture', onUp);
  host.addEventListener('wheel', onWheel, { passive: false });
  host.querySelectorAll('[data-cd-zoom]').forEach(function (btn) {
    btn.addEventListener('click', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      applyZoomOp(btn.getAttribute('data-cd-zoom'));
    });
    btn.addEventListener('pointerdown', function (ev) { ev.stopPropagation(); });
  });

  var ro = null;
  if (typeof ResizeObserver === 'function') {
    ro = new ResizeObserver(function () {
      if (!host.isConnected) {
        if (ro) ro.disconnect();
        if (themeObs) themeObs.disconnect();
        return;
      }
      draw();
    });
    ro.observe(host);
  }
  var themeObs = null;
  if (typeof MutationObserver === 'function' && document.documentElement) {
    themeObs = new MutationObserver(function () {
      if (host.isConnected) draw();
    });
    themeObs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
  }
  draw();
};
