/* Canvas effects for the focus page, two layers on one canvas:

   1. AMBIENT DETECTOR FIELD (ported from the personal site's field.js — the
      page is the gas volume of a TPC): moving the cursor ionizes the gas,
      seeding tiny electrons along the pointer's path that drift UPWARD toward
      an imaginary readout plane with diffusion wiggle; clicking deposits a
      charge cluster (an expanding accent avalanche ring + a small radial
      electron burst); every ~9–20 s a cosmic ray streaks across the sheet,
      sowing an ionization trail. This layer is alive whenever the page is on
      screen — idle, running or held.

   2. COLLIDER SCENARIO (the session layer): the reward mark is a detector
      cross-section and its centre is the INTERACTION POINT. Counter-moving
      bunch pairs ride the horizontal beamline in from both sides, meet at
      the centre, bloom, and spray dashed multi-coloured particle TRACKS
      fanning out through the detector layers (event-display style) — a
      couple of back-to-back jets plus soft scatter, with the solenoid field
      curling the low-momentum ones. Floating physics glyphs drift
      antigravity-style and scatter from the cursor, and a soft gradient
      ribbon rides the pointer. This layer crossfades in with the session
      (beamAlpha), and winds down on pause/stop — no CSS opacity gate any
      more.

   view-focus.js drives it: paintLive() calls sync() with the live flag every
   second, igniteStart() calls burst(), and the HUD reads events() for the
   EVT corner counter.

   Design constraints honoured here:
   - prefers-reduced-motion: the whole module no-ops (css also hides .focus-fx).
   - The canvas is pointer-events:none and sits UNDER .focus-stage (z-index 0
     vs 1), so it can never steal a click from the controls.
   - The ring centre/radius are measured from the live DOM (.focus-atom rect)
     every frame, so the canvas beam stays glued to the SVG ring across
     resize, zen-mode growth and the parallax tilt.
   - The rAF loop self-terminates when the router swaps the page out
     (canvas.isConnected check); while the page idles with nothing moving it
     parks itself and re-arms on pointer activity or the next cosmic ray.
   - Colours read live css tokens (--accent, --accent-deep, and the page's
     --fp-ion for the slate electrons), so dark mode re-derives; track
     colours are fixed muted mid-tones legible on both. */
window.PGRE = window.PGRE || {};
PGRE.focusFx = (function () {
  var canvas = null, ctx = null, raf = 0, live = false;
  var parts = [];            // floating physics glyphs (session layer)
  var sparks = [];           // one-shot ignition burst particles
  var trail = [];            // recent cursor points, ~0.5 s of life
  var bunches = [];          // bunch pairs closing on the IP ({d}: distance from centre)
  var tracks = [];           // dashed collision tracks fanning out from the IP
  var blooms = [];           // short-lived glow spots where bunches hit the ring
  var electrons = [];        // ambient field: ionization electrons (drift up)
  var pings = [];            // ambient field: click avalanche rings
  var rays = [];             // ambient field: cosmic rays + their trails
  var beamAlpha = 0;         // session layer crossfade 0..1 (chases `live`)
  var nextBunch = 0;         // performance.now() timestamp of the next bunch-pair spawn
  var nextCosmic = 0;        // performance.now() timestamp of the next cosmic ray
  var cosmicT = 0;           // parked-loop wake-up timer for that cosmic ray
  var evt = 0;               // event counter (collisions, avalanches, cosmics) — HUD reads it
  var mouse = { x: -1e4, y: -1e4 };
  var lastIx = -1, lastIy = -1;   // previous pointer point for ionization seeding
  var boundPage = null;      // page element the pointer listeners are on
  var t0 = 0;

  var GLYPHS = ['ψ', 'ħ', '∇', '∫', 'π', 'λ', 'Σ', 'φ', 'Ω', 'μ', 'Δ', 'α',
                'γ', '∂', 'ε₀', 'ℏω', 'E=mc²', '⟨ψ|ψ⟩', 'k_B', '∮'];
  var N = 24;                // glyph count — light enough for a calm 60 fps
  var TRAIL_LIFE = 480;      // ms a trail point stays visible
  var REPEL_R = 120;         // px — cursor influence radius (the antigravity push)
  var DEFLECT_R = 150;       // px — cursor deflector radius on beam and tracks
  var BEAM_V = 300;          // px/s — bunch approach speed along the beamline
  var TRACK_CAP = 48;        // hard cap so the fans never clutter
  var BLOOM_MS = 600;        // life of the collision glow at the IP
  var MAX_ELECTRONS = 500;   // ambient pool cap; oldest evicted so bursts never stall
  // muted event-display palette — blue/green/orange snapped to the Anthropic
  // brand accents (#6A9BCC / #788C5D / #D97757), rest kept from the reference
  var PALETTE = ['#6a9bcc', '#788c5d', '#d97757', '#b89b4f',
                 '#a06a8c', '#8b7ab8', '#97a86b'];

  function reduced() {
    return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  var finePointer = window.matchMedia && matchMedia('(pointer: fine)').matches;
  function tok(name, fb) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fb;
  }
  // page-scoped token (--fp-ion lives on .focus-page so the dark layer swaps it)
  function pageTok(name, fb) {
    if (!boundPage) return fb;
    var v = getComputedStyle(boundPage).getPropertyValue(name).trim();
    return v || fb;
  }

  /* The detector geometry, measured live from the SVG mark: the interaction
     point (ring centre) in canvas coords + the timing-ring radius (r=88 in a
     200 viewBox -> 44% of the rendered width). Falls back to page
     proportions if the mark is somehow absent. */
  function geom(w, h) {
    var el = document.querySelector('#focus-page .focus-atom');
    if (el && canvas) {
      var r = el.getBoundingClientRect(), c = canvas.getBoundingClientRect();
      if (r.width > 40) {
        return { cx: r.left + r.width / 2 - c.left,
                 cy: r.top + r.height / 2 - c.top,
                 R: r.width * 0.44 };
      }
    }
    return { cx: w / 2, cy: h * 0.42, R: Math.min(w, h) * 0.26 };
  }

  /* ——— ambient field: ionization electrons, avalanches, cosmic rays ———
     Physics kept in the original's px-per-frame units (60 fps reference) and
     scaled by f = dt*60 each step, so the numbers stay faithful to field.js. */
  function spawnElectron(x, y, vx, vy, life, bright) {
    if (electrons.length >= MAX_ELECTRONS) electrons.shift();
    electrons.push({
      x: x, y: y,
      vx: vx + (Math.random() - 0.5) * 0.35,
      vy: vy - 0.55 - Math.random() * 0.5,   // drift toward the readout plane (up)
      life: life, t: 0,
      r: 0.6 + Math.random() * 0.9,
      bright: bright || 0.5
    });
  }
  function spawnPing(x, y, strength) {
    pings.push({ x: x, y: y, t: 0, life: 26, strength: strength || 1 });
  }
  function fireCosmic(w, h) {
    // enter from a random side, cross at a steep-ish angle, sow ionization
    var fromLeft = Math.random() < 0.5;
    var x0 = fromLeft ? -30 : w + 30;
    var y0 = Math.random() * h * 0.5;
    var ang = fromLeft ? (0.25 + Math.random() * 0.5)
                       : (Math.PI - 0.25 - Math.random() * 0.5);
    var sp = 8 + Math.random() * 4;          // px/frame
    rays.push({ x: x0, y: y0, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
                t: 0, life: 220, trail: [] });
    evt++;
  }

  /* ——— session layer: glyphs ——— */
  function seed(w, h) {
    parts = [];
    for (var i = 0; i < N; i++) {
      var depth = 0.35 + Math.random() * 0.65;          // 0.35 near-far … 1 near
      parts.push({
        x: Math.random() * w,
        y: Math.random() * h,
        depth: depth,
        size: 10 + depth * 12,                          // nearer = bigger
        glyph: GLYPHS[i % GLYPHS.length],
        rise: 8 + depth * 16,                           // px/s upward drift (antigravity)
        swayA: 6 + Math.random() * 10,                  // sway amplitude px
        swayW: 0.3 + Math.random() * 0.5,               // sway angular freq rad/s
        ph: Math.random() * Math.PI * 2,
        vx: 0, vy: 0                                    // impulse from the cursor, decays
      });
    }
  }

  /* ——— beam: bunch pairs closing on the IP + dashed tracks off the collision ——— */
  // room from (x,y) to the canvas edge along direction (ca,sa), small margin
  function edgeLim(x, y, ca, sa, w, h) {
    var lim = 1e9;
    if (ca > 1e-4) lim = Math.min(lim, (w - 24 - x) / ca);
    else if (ca < -1e-4) lim = Math.min(lim, (24 - x) / ca);
    if (sa > 1e-4) lim = Math.min(lim, (h - 20 - y) / sa);
    else if (sa < -1e-4) lim = Math.min(lim, (20 - y) / sa);
    return lim;
  }
  // a bunch pair meets at the interaction point: bloom the IP and spray an
  // event of curved tracks out through the detector — a pair of back-to-back
  // jets plus soft isotropic scatter (event-display style)
  function collide(x, y, w, h, now) {
    blooms.push({ x: x, y: y, t: now });
    if (blooms.length > 10) blooms.shift();
    evt++;
    var jetA = Math.random() * Math.PI * 2;             // leading jet axis
    var n = 6 + ((Math.random() * 4) | 0), k;
    for (k = 0; k < n; k++) {
      var a;
      if (k < 2)      a = jetA + (Math.random() - 0.5) * 0.5;            // leading jet
      else if (k < 4) a = jetA + Math.PI + (Math.random() - 0.5) * 0.7;  // recoil jet
      else            a = Math.random() * Math.PI * 2;                   // soft scatter
      var ca = Math.cos(a), sa = Math.sin(a);
      var lim = edgeLim(x, y, ca, sa, w, h);
      var maxLen = Math.max(60, lim * (0.45 + Math.random() * 0.5));
      tracks.push({
        x: x, y: y, a: a,
        // solenoid bend, rad/px of arc; the odd low-p_T track curls hard
        curv: (Math.random() - 0.5) * (Math.random() < 0.3 ? 0.010 : 0.004),
        len: 0,
        maxLen: maxLen,
        v: 240 + Math.random() * 280,                   // growth speed px/s
        age: 0,
        life: 3.4 + Math.random() * 1.6,                // s total on screen
        wpx: 2.2 + Math.random() * 1.4,                 // stroke width
        dash: 7 + Math.random() * 4,                    // dash length
        dashOff: Math.random() * 100,                   // animated -> dashes flow
        color: PALETTE[(Math.random() * PALETTE.length) | 0]
      });
    }
    if (tracks.length > TRACK_CAP) tracks.splice(0, tracks.length - TRACK_CAP);
  }
  // sideways bow a point feels near the cursor, perpendicular to its path;
  // grows with arc position so the origin stays pinned
  function bend(px, py, perpX, perpY, along) {
    var dx = px - mouse.x, dy = py - mouse.y;
    var d2 = dx * dx + dy * dy;
    if (d2 >= DEFLECT_R * DEFLECT_R || d2 < 1) return 0;
    var s = 1 - Math.sqrt(d2) / DEFLECT_R;
    var sign = (dx * perpX + dy * perpY) >= 0 ? 1 : -1;
    return sign * s * s * 38 * Math.min(1, along / 70);
  }

  function step(dt, w, h, now, g) {
    var i, p;
    var f = dt * 60;                                    // frames elapsed at 60 fps reference
    // the session layer chases `live`: powers up on start, winds down on hold/stop
    var target = live ? 1 : 0;
    beamAlpha += (target - beamAlpha) * Math.min(1, dt * 2.4);
    if (Math.abs(beamAlpha - target) < 0.01) beamAlpha = target;

    // ambient field — always on
    // cosmic rays cross the sheet on their own clock
    if (now >= nextCosmic) {
      fireCosmic(w, h);
      nextCosmic = now + 9000 + Math.random() * 11000;
    }
    for (i = rays.length - 1; i >= 0; i--) {
      p = rays[i];
      p.t += f;
      p.x += p.vx * f;
      p.y += p.vy * f;
      // sow ionization along the path
      if (Math.random() < Math.min(1, 0.75 * f)) {
        spawnElectron(p.x, p.y, 0, 0, 55 + Math.random() * 55, 0.55);
      }
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 26) p.trail.shift();
      var off = p.x < -60 || p.x > w + 60 || p.y > h + 60;
      if (p.t > p.life || off) rays.splice(i, 1);
    }
    for (i = electrons.length - 1; i >= 0; i--) {
      p = electrons[i];
      p.t += f;
      p.x += p.vx * f + Math.sin((p.t + p.y) * 0.05) * 0.18 * f;   // diffusion wiggle
      p.y += p.vy * f;
      p.vx *= Math.pow(0.985, f);
      if (p.t >= p.life || p.y < -10) electrons.splice(i, 1);      // reached the readout plane
    }
    for (i = pings.length - 1; i >= 0; i--) {
      p = pings[i];
      p.t += f;
      if (p.t >= p.life) pings.splice(i, 1);
    }

    // session layer — skipped entirely while faded out
    if (beamAlpha > 0.01) {
      // bunch pairs ride the beamline in from both sides and meet at the IP;
      // they enter symmetrically, so one distance-from-centre drives the pair
      if (live && now >= nextBunch) {
        var d0 = Math.max(g.R + 40, Math.min(320, Math.min(g.cx, w - g.cx) - 10));
        bunches.push({ d: d0 });
        nextBunch = now + 1500 + Math.random() * 1000;
      }
      for (i = bunches.length - 1; i >= 0; i--) {
        p = bunches[i];
        p.d -= BEAM_V * dt;
        if (p.d <= 0) {
          collide(g.cx, g.cy, w, h, now);
          bunches.splice(i, 1);
        }
      }
      // hit blooms just age out (drawn from their timestamps)
      while (blooms.length && now - blooms[0].t > BLOOM_MS) blooms.shift();
      // tracks: grow to full length, linger, fade out via age/life in draw()
      for (i = tracks.length - 1; i >= 0; i--) {
        p = tracks[i];
        p.age += dt;
        if (p.age >= p.life) { tracks.splice(i, 1); continue; }
        if (p.len < p.maxLen) p.len = Math.min(p.maxLen, p.len + p.v * dt);
        p.dashOff -= dt * 40;                             // dashes drift outward
      }
      for (i = 0; i < parts.length; i++) {
        p = parts[i];
        // cursor repulsion — the signature interaction: chips scatter, then settle
        var dx = p.x - mouse.x, dy = p.y - mouse.y;
        var d2 = dx * dx + dy * dy;
        if (d2 < REPEL_R * REPEL_R && d2 > 1) {
          var d = Math.sqrt(d2), fr = (1 - d / REPEL_R) * 260 * p.depth;   // px/s²
          p.vx += (dx / d) * fr * dt;
          p.vy += (dy / d) * fr * dt;
        }
        p.vx *= Math.pow(0.12, dt);                       // strong damping back to calm
        p.vy *= Math.pow(0.12, dt);
        p.x += p.vx * dt + Math.cos(now / 1000 * p.swayW + p.ph) * p.swayA * dt * 0.6;
        p.y += p.vy * dt - p.rise * dt;                   // gentle anti-gravity rise
        // wrap: risen off the top -> re-enter from below at a fresh x
        if (p.y < -30) { p.y = h + 24; p.x = Math.random() * w; }
        if (p.x < -40) p.x = w + 30; else if (p.x > w + 40) p.x = -30;
      }
    } else {
      // idle: drop any leftover beam state so a restart begins clean
      if (bunches.length) bunches = [];
      if (tracks.length) tracks = [];
      if (blooms.length) blooms = [];
    }
    for (i = sparks.length - 1; i >= 0; i--) {
      p = sparks[i];
      p.life -= dt;
      if (p.life <= 0) { sparks.splice(i, 1); continue; }
      p.vx *= Math.pow(0.3, dt); p.vy *= Math.pow(0.3, dt);
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
    while (trail.length && now - trail[0].t > TRAIL_LIFE) trail.shift();
  }

  function draw(w, h, now, g) {
    ctx.clearRect(0, 0, w, h);
    var accent = tok('--accent', '#d97757'), deep = tok('--accent-deep', '#c0502b');
    var ion = pageTok('--fp-ion', '#6a9bcc');
    var i, j, p, k;

    // ——— ambient field: behind everything, instrument noise on the paper ———
    // ionization electrons — tiny slate squares, alpha = life fade × brightness
    for (i = 0; i < electrons.length; i++) {
      p = electrons[i];
      k = 1 - p.t / p.life;
      if (k <= 0) continue;
      ctx.globalAlpha = k * p.bright;
      ctx.fillStyle = ion;
      ctx.fillRect(p.x, p.y, p.r, p.r);
    }
    ctx.globalAlpha = 1;
    // cosmic-ray streaks — thin polyline trails
    for (i = 0; i < rays.length; i++) {
      p = rays[i];
      if (p.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(p.trail[0].x, p.trail[0].y);
        for (j = 1; j < p.trail.length; j++) ctx.lineTo(p.trail[j].x, p.trail[j].y);
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = ion;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    // ——— session layer, faded as a unit by beamAlpha ———
    if (beamAlpha > 0.01) {
      // the beamline, dashed, across the whole sheet through the IP — the
      // canvas extension of the two dashed halves inside the SVG mark
      ctx.globalAlpha = 0.07 * beamAlpha; ctx.strokeStyle = accent; ctx.lineWidth = 1;
      ctx.setLineDash([2, 9]);
      ctx.beginPath(); ctx.moveTo(0, g.cy); ctx.lineTo(w, g.cy); ctx.stroke();
      ctx.setLineDash([]);
      // collision tracks — dashed helices fanning out from the IP through the
      // detector, curled by the solenoid field (walked segment by segment),
      // dashes flowing, sections bowing away from the cursor
      ctx.lineCap = 'round';
      for (i = 0; i < tracks.length; i++) {
        p = tracks[i];
        var fadeIn = Math.min(1, p.age / 0.25);
        var left = p.life - p.age;
        var fadeOut = Math.min(1, left / (p.life * 0.4));
        var alpha = 0.5 * fadeIn * fadeOut * beamAlpha;
        if (alpha <= 0.01 || p.len < 2) continue;
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.wpx;
        ctx.setLineDash([p.dash, p.dash * 0.9]);
        ctx.lineDashOffset = p.dashOff;
        ctx.beginPath();
        var nSeg = Math.max(2, Math.ceil(p.len / 18));
        var ds = p.len / nSeg;
        // walk the arc: heading turns by curv per px, so momentum sets radius
        var wx = p.x, wy = p.y, ang = p.a;
        for (j = 0; j <= nSeg; j++) {
          var perpX = -Math.sin(ang), perpY = Math.cos(ang);
          var b = bend(wx, wy, perpX, perpY, j * ds);
          var px = wx + perpX * b, py = wy + perpY * b;   // cursor bow is display-only
          if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          ang += p.curv * ds;
          wx += Math.cos(ang) * ds; wy += Math.sin(ang) * ds;
        }
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
      // collision blooms at the IP — brief glows where a pair just met
      for (i = 0; i < blooms.length; i++) {
        p = blooms[i];
        var hitAge = (now - p.t) / BLOOM_MS;
        if (hitAge < 0 || hitAge >= 1) continue;
        var gt = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 30);
        gt.addColorStop(0, accent); gt.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = 0.32 * (1 - hitAge) * beamAlpha; ctx.fillStyle = gt;
        ctx.beginPath(); ctx.arc(p.x, p.y, 30, 0, Math.PI * 2); ctx.fill();
      }
      // the interaction point — a soft breathing glow at the detector centre
      var pulse = (0.1 + 0.05 * Math.sin(now / 420)) * beamAlpha;
      var gs = ctx.createRadialGradient(g.cx, g.cy, 0, g.cx, g.cy, 22);
      gs.addColorStop(0, accent); gs.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = pulse; ctx.fillStyle = gs;
      ctx.beginPath(); ctx.arc(g.cx, g.cy, 22, 0, Math.PI * 2); ctx.fill();
      // the bunch pair — one glow either side of the IP closing head-on along
      // the beamline, elongated by motion blur, bowed vertically near the cursor
      for (i = 0; i < bunches.length; i++) {
        p = bunches[i];
        for (var sgn = -1; sgn <= 1; sgn += 2) {
          var bx = g.cx + sgn * p.d, by = g.cy + bend(g.cx + sgn * p.d, g.cy, 0, 1, p.d);
          var gb = ctx.createRadialGradient(bx, by, 0, bx, by, 16);
          gb.addColorStop(0, accent); gb.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.globalAlpha = 0.14 * beamAlpha; ctx.fillStyle = gb;
          ctx.beginPath(); ctx.arc(bx, by, 16, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 0.45 * beamAlpha;
          ctx.fillStyle = deep;
          ctx.beginPath();
          ctx.ellipse(bx, by, 8, 2.4, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // floating glyphs — farther chips fainter and smaller
      for (i = 0; i < parts.length; i++) {
        p = parts[i];
        ctx.globalAlpha = (0.08 + p.depth * 0.16) * beamAlpha;
        ctx.fillStyle = deep;
        ctx.font = '600 ' + p.size.toFixed(0) + 'px Georgia, serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(p.glyph, p.x, p.y);
      }
    }

    // click avalanches — expanding accent rings over everything below
    for (i = 0; i < pings.length; i++) {
      p = pings[i];
      k = 1 - p.t / p.life;
      if (k <= 0) continue;
      var rad = (1 - k) * 24 * p.strength + 2;
      ctx.globalAlpha = k * 0.6;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // ignition sparks
    for (i = 0; i < sparks.length; i++) {
      p = sparks[i];
      ctx.globalAlpha = Math.max(0, p.life / p.life0) * 0.85;
      ctx.fillStyle = (i % 2) ? accent : deep;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    // cursor trail — tapered gradient ribbon over the last ~0.5 s of movement
    if (trail.length > 1 && beamAlpha > 0.01) {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (i = 1; i < trail.length; i++) {
        var a = trail[i - 1], b2 = trail[i];
        var age = (now - b2.t) / TRAIL_LIFE;             // 0 fresh … 1 gone
        if (age >= 1) continue;
        ctx.globalAlpha = (1 - age) * 0.28 * beamAlpha;
        ctx.strokeStyle = age < 0.5 ? accent : deep;
        ctx.lineWidth = 1.5 + (1 - age) * 7;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b2.x, b2.y); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  function busy() {
    return live || beamAlpha > 0.01 || sparks.length || trail.length ||
           electrons.length || pings.length || rays.length ||
           bunches.length || tracks.length || blooms.length;
  }

  function frame(now) {
    raf = 0;
    if (!canvas || !canvas.isConnected) { hardStop(); return; }   // view swapped out
    // reduce-motion turned on mid-visit: tear down like a disconnect (css is
    // already hiding the canvas); sync() rebuilds if the setting flips back
    if (reduced()) { hardStop(); return; }
    var page = canvas.parentElement;
    var w = page.clientWidth, h = page.clientHeight;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      if (!parts.length) seed(w, h);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var dt = Math.min(0.05, (now - (t0 || now)) / 1000);          // clamp tab-switch jumps
    t0 = now;
    var g = geom(w, h);                                           // live ring centre + radius
    step(dt, w, h, now, g);
    draw(w, h, now, g);
    if (busy()) raf = requestAnimationFrame(frame);
    else parkUntilCosmic();                                       // idle: sleep till the next ray
  }

  function kick() { if (!raf && canvas) { t0 = 0; raf = requestAnimationFrame(frame); } }

  // nothing moving on an idle page: stop the loop and set an alarm for the
  // next cosmic ray so the sheet still feels alive without burning frames
  function parkUntilCosmic() {
    if (cosmicT) clearTimeout(cosmicT);
    var wait = Math.max(250, nextCosmic - performance.now());
    cosmicT = setTimeout(function () { cosmicT = 0; kick(); }, wait);
  }

  /* ——— pointer feed (on the page, since the canvas ignores pointer events) ——— */
  function onMove(e) {
    var r = canvas ? canvas.getBoundingClientRect() : null;
    if (!r) return;
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    if (live) trail.push({ x: mouse.x, y: mouse.y, t: performance.now() });
    // cursor ionization (fine pointers only): seed electrons along the moved
    // segment — density ~ path length, faster sweeps ionize brighter
    if (finePointer) {
      if (lastIx < 0) { lastIx = mouse.x; lastIy = mouse.y; kick(); return; }
      var dx = mouse.x - lastIx, dy = mouse.y - lastIy;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var steps = Math.min(6, Math.max(1, Math.floor(dist / 9)));
      for (var i = 0; i < steps; i++) {
        var t = (i + Math.random()) / steps;
        if (Math.random() < 0.55) {
          spawnElectron(
            lastIx + dx * t, lastIy + dy * t,
            dx * 0.006, dy * 0.006,
            60 + Math.random() * 60,
            0.35 + Math.min(0.4, dist * 0.004)
          );
        }
      }
      lastIx = mouse.x; lastIy = mouse.y;
    }
    kick();
  }
  function onLeave() { mouse.x = -1e4; mouse.y = -1e4; lastIx = -1; lastIy = -1; }
  // clicking deposits a charge cluster: avalanche ring + radial electron burst
  function onClick(e) {
    // keyboard activations and synthetic el.click() report detail 0 and land
    // at (0,0) — only real pointer clicks ionize
    if (!e.detail) return;
    var r = canvas ? canvas.getBoundingClientRect() : null;
    if (!r) return;
    var x = e.clientX - r.left, y = e.clientY - r.top;
    spawnPing(x, y, 1);
    for (var i = 0; i < 12; i++) {
      var a = Math.random() * Math.PI * 2;
      var v = 0.4 + Math.random() * 1.4;
      spawnElectron(x, y, Math.cos(a) * v, Math.sin(a) * v * 0.5,
                    70 + Math.random() * 50, 0.8);
    }
    evt++;
    kick();
  }

  function ensureCanvas(page) {
    if (canvas && canvas.isConnected && canvas.parentElement === page) return;
    hardStop();
    canvas = document.createElement('canvas');
    canvas.className = 'focus-fx';
    canvas.setAttribute('aria-hidden', 'true');
    // under the stage (z 0 vs 1), above the graph paper (insert after it)
    var amb = page.querySelector('.focus-ambient');
    if (amb && amb.nextSibling) page.insertBefore(canvas, amb.nextSibling);
    else page.appendChild(canvas);
    ctx = canvas.getContext('2d');
    parts = []; sparks = []; trail = []; bunches = []; tracks = []; blooms = [];
    electrons = []; pings = []; rays = [];
    beamAlpha = 0;
    nextCosmic = performance.now() + 5000 + Math.random() * 9000;
    boundPage = page;
    page.addEventListener('mousemove', onMove);
    page.addEventListener('mouseleave', onLeave);
    page.addEventListener('click', onClick);
  }

  function hardStop() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    if (cosmicT) { clearTimeout(cosmicT); cosmicT = 0; }
    if (boundPage) {
      boundPage.removeEventListener('mousemove', onMove);
      boundPage.removeEventListener('mouseleave', onLeave);
      boundPage.removeEventListener('click', onClick);
      boundPage = null;
    }
    if (canvas && canvas.parentElement) canvas.parentElement.removeChild(canvas);
    canvas = null; ctx = null;
    parts = []; sparks = []; trail = []; bunches = []; tracks = []; blooms = [];
    electrons = []; pings = []; rays = [];
    beamAlpha = 0;
    lastIx = -1; lastIy = -1;
    live = false;
  }

  /* ——— public api ——— */
  // sync(running, page): called every paint from view-focus.js. The ambient
  // detector field runs whenever the page exists; `running` only powers the
  // session layer up or down (beamAlpha crossfades it in the draw loop).
  function sync(running, page) {
    if (reduced() || !page) return;
    ensureCanvas(page);
    if (running && !live) {
      live = true;
      nextBunch = performance.now();          // the first bunch pair enters immediately
    } else if (!running) {
      live = false;                           // beamline winds down; ambient stays
    }
    kick();
  }

  // burst(): spark shower from the reward mark when a session ignites.
  function burst() {
    if (reduced() || !canvas || !ctx) return;
    var w = canvas.parentElement.clientWidth, h = canvas.parentElement.clientHeight;
    var g = geom(w, h);                          // measured mark centre, not a guess
    for (var i = 0; i < 26; i++) {
      var a = Math.random() * Math.PI * 2, v = 140 + Math.random() * 260;
      var life = 0.55 + Math.random() * 0.45;
      sparks.push({ x: g.cx, y: g.cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
                    r: 1.5 + Math.random() * 2.5, life: life, life0: life });
    }
    kick();
  }

  // events(): running event counter (ring collisions, click avalanches,
  // cosmic rays) — the page HUD's EVT readout.
  function events() { return evt; }

  return { sync: sync, burst: burst, events: events };
})();
