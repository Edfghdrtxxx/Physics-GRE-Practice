/* Concept Visualization Door Effect — Physics GRE Prep Studio
   Axonometric spherical coordinate instrument for the concept door.
   Self-terminating rAF loop, reduced-motion compliance, dark-mode CSS tokens. */
window.PGRE = window.PGRE || {};
var PGRE = window.PGRE;
PGRE.conceptDoorFx = (function () {
  'use strict';

  var canvas = null;
  var ctx = null;
  var raf = 0;
  var boundHost = null;
  var elapsed = 0;
  var lastNow = 0;
  var listenersAttached = false;

  var SQRT2 = Math.SQRT2;
  var SQRT3 = Math.sqrt(3);
  var SQRT6 = Math.sqrt(6);
  var SQRT_2_3 = Math.sqrt(2 / 3);

  function reduced() {
    return !!(typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function reqAnim(fn) {
    if (typeof requestAnimationFrame !== 'undefined') return requestAnimationFrame(fn);
    if (typeof window !== 'undefined' && window.requestAnimationFrame) return window.requestAnimationFrame(fn);
    return 0;
  }

  function cancelAnim(id) {
    if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(id);
    else if (typeof window !== 'undefined' && window.cancelAnimationFrame) window.cancelAnimationFrame(id);
  }

  function tok(name, fb) {
    if (typeof document === 'undefined' || !document.documentElement) return fb;
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fb;
  }

  /* Fixed axonometric projection:
     +z straight up
     +x lower-left ~150deg
     +y lower-right ~30deg */
  function project(x, y, z, ox, oy) {
    return {
      x: ox + (-x + y) / SQRT2,
      y: oy + (x + y) / SQRT6 - z * SQRT_2_3
    };
  }

  function syncCanvas() {
    if (!canvas || !boundHost) return { w: 0, h: 0 };
    var w = boundHost.clientWidth || 300;
    var h = boundHost.clientHeight || 300;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var rw = Math.round(w * dpr);
    var rh = Math.round(h * dpr);
    if (canvas.width !== rw || canvas.height !== rh) {
      canvas.width = rw;
      canvas.height = rh;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w: w, h: h };
  }

  function paint(w, h, theta, phi) {
    if (!ctx || w <= 0 || h <= 0) return;

    var ox = 0.5 * w;
    var R = Math.min(w, h) * 0.28;
    if (R <= 1) return;
    var oy = 0.70 * h;
    var minOy = 1.15 * R + 18;
    var maxOy = h - R - 20;
    if (oy < minOy) oy = minOy;
    if (oy > maxOy) oy = maxOy;

    var lineCol = tok('--line', '#e6dfd8');
    var ink3Col = tok('--ink-3', '#8e8b82');
    var accentCol = tok('--accent', '#cc785c');
    var accentDeepCol = tok('--accent-deep', '#964b32');

    ctx.clearRect(0, 0, w, h);

    // 1. Rear equator ellipse: dashed [2, 4]
    ctx.beginPath();
    ctx.ellipse(ox, oy, R, R / SQRT3, 0, Math.PI, 2 * Math.PI);
    ctx.strokeStyle = lineCol;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Axes: +x, +y, +z hairlines labeled 10px JetBrains Mono
    var axLen = 1.15 * R;
    var ax3D = axLen / SQRT_2_3;
    var tipX = project(ax3D, 0, 0, ox, oy);
    var tipY = project(0, ax3D, 0, ox, oy);
    var tipZ = project(0, 0, ax3D, ox, oy);

    ctx.strokeStyle = lineCol;
    ctx.lineWidth = 1;
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(tipX.x, tipX.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(tipY.x, tipY.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(tipZ.x, tipZ.y);
    ctx.stroke();

    ctx.font = '10px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = ink3Col;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('+z', tipZ.x, tipZ.y - 4);

    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('+x', tipX.x - 5, tipX.y + 3);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('+y', tipY.x + 5, tipY.y + 3);

    // 3. Point P on the sphere
    var px = R * Math.sin(theta) * Math.cos(phi);
    var py = R * Math.sin(theta) * Math.sin(phi);
    var pz = R * Math.cos(theta);
    var ptP = project(px, py, pz, ox, oy);

    // Foot of P down to xy-plane: (px, py, 0)
    var ptFoot = project(px, py, 0, ox, oy);

    // 4. Faint planar tie from O to the foot
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ptFoot.x, ptFoot.y);
    ctx.strokeStyle = lineCol;
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.stroke();

    // 5. Dashed drop [3, 5] from P down to xy-plane
    ctx.beginPath();
    ctx.moveTo(ptP.x, ptP.y);
    ctx.lineTo(ptFoot.x, ptFoot.y);
    ctx.strokeStyle = lineCol;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 6. r-vector from O to P
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ptP.x, ptP.y);
    ctx.strokeStyle = lineCol;
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.stroke();

    // 7. Front equator ellipse: solid
    ctx.beginPath();
    ctx.ellipse(ox, oy, R, R / SQRT3, 0, 0, Math.PI);
    ctx.strokeStyle = lineCol;
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.stroke();

    // 8. Outer horizon circle: solid
    ctx.beginPath();
    ctx.arc(ox, oy, R, 0, 2 * Math.PI);
    ctx.strokeStyle = lineCol;
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.stroke();

    // 9. One meridian through +z, P, -z
    ctx.beginPath();
    var merSteps = 64;
    for (var m = 0; m <= merSteps; m++) {
      var th = (m / merSteps) * Math.PI;
      var mx = R * Math.sin(th) * Math.cos(phi);
      var my = R * Math.sin(th) * Math.sin(phi);
      var mz = R * Math.cos(th);
      var mpt = project(mx, my, mz, ox, oy);
      if (m === 0) ctx.moveTo(mpt.x, mpt.y);
      else ctx.lineTo(mpt.x, mpt.y);
    }
    ctx.strokeStyle = lineCol;
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.stroke();

    // 10. Coral ONLY: 1px --accent arc for theta from +z down to r-vector
    var arcR = 0.32 * R;
    ctx.beginPath();
    var arcSteps = 24;
    for (var a = 0; a <= arcSteps; a++) {
      var psi = (a / arcSteps) * theta;
      var ax = arcR * Math.sin(psi) * Math.cos(phi);
      var ay = arcR * Math.sin(psi) * Math.sin(phi);
      var az = arcR * Math.cos(psi);
      var apt = project(ax, ay, az, ox, oy);
      if (a === 0) ctx.moveTo(apt.x, apt.y);
      else ctx.lineTo(apt.x, apt.y);
    }
    ctx.strokeStyle = accentCol;
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.stroke();

    // Label theta in --accent-deep near the arc
    var midPsi = theta * 0.5;
    var midX = arcR * Math.sin(midPsi) * Math.cos(phi);
    var midY = arcR * Math.sin(midPsi) * Math.sin(phi);
    var midZ = arcR * Math.cos(midPsi);
    var midPt = project(midX, midY, midZ, ox, oy);
    var vdx = midPt.x - ox;
    var vdy = midPt.y - oy;
    var vdist = Math.sqrt(vdx * vdx + vdy * vdy);
    var lx = vdist > 0.001 ? midPt.x + (vdx / vdist) * 11 : midPt.x + 8;
    var ly = vdist > 0.001 ? midPt.y + (vdy / vdist) * 11 : midPt.y - 8;

    ctx.font = '10px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = accentDeepCol;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('θ', lx, ly);

    // 11. Plus 1.5px coral cap on P
    ctx.beginPath();
    ctx.arc(ptP.x, ptP.y, 1.5, 0, 2 * Math.PI);
    ctx.fillStyle = accentCol;
    ctx.fill();
  }

  function paintStill() {
    var dims = syncCanvas();
    var theta = 45 * Math.PI / 180;
    var phi = 35 * Math.PI / 180;
    paint(dims.w, dims.h, theta, phi);
  }

  function frame(now) {
    raf = 0;
    if (!canvas || !canvas.isConnected) {
      hardStop();
      return;
    }
    if (reduced()) {
      paintStill();
      return;
    }
    if (typeof document !== 'undefined' && (document.hidden || document.visibilityState === 'hidden')) {
      return;
    }
    if (!lastNow) lastNow = now;
    var dt = (now - lastNow) / 1000;
    if (dt > 0.1) dt = 0.016;
    lastNow = now;
    elapsed += dt;

    // Motion: phi precess period 72s linear; theta(t) = 48deg + 6deg * sin(2pi t / 36s)
    var thetaDeg = 48 + 6 * Math.sin((2 * Math.PI * elapsed) / 36);
    var theta = thetaDeg * Math.PI / 180;
    var phi = ((35 + (360 * (elapsed / 72))) % 360) * Math.PI / 180;

    var dims = syncCanvas();
    paint(dims.w, dims.h, theta, phi);

    raf = reqAnim(frame);
  }

  function kick() {
    if (!raf && canvas && canvas.isConnected && !reduced()) {
      if (typeof document === 'undefined' || !(document.hidden || document.visibilityState === 'hidden')) {
        lastNow = 0;
        raf = reqAnim(frame);
      }
    }
  }

  function hardStop() {
    if (raf) {
      cancelAnim(raf);
      raf = 0;
    }
    lastNow = 0;
  }

  function onVisibilityChange() {
    if (!canvas || !canvas.isConnected) {
      hardStop();
      return;
    }
    if (document.hidden || document.visibilityState === 'hidden') {
      if (raf) {
        cancelAnim(raf);
        raf = 0;
      }
    } else {
      kick();
    }
  }

  function onResize() {
    if (!canvas || !canvas.isConnected) return;
    if (reduced()) {
      paintStill();
    }
  }

  function mount(hostEl) {
    if (!hostEl) return;
    if (canvas && canvas.isConnected && canvas.parentElement === hostEl) {
      if (reduced()) {
        hardStop();
        paintStill();
      } else {
        kick();
      }
      return;
    }

    hardStop();
    if (canvas && canvas.parentElement) {
      canvas.parentElement.removeChild(canvas);
    }

    canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';

    hostEl.appendChild(canvas);
    ctx = canvas.getContext('2d');
    boundHost = hostEl;

    if (!listenersAttached && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange);
      window.addEventListener('resize', onResize);
      listenersAttached = true;
    }

    if (reduced()) {
      paintStill();
    } else {
      kick();
    }
  }

  return {
    mount: mount,
    stop: hardStop
  };
})();
