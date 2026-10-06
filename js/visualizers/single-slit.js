/* Concept visualizer — single-slit diffraction: what is θ?
   Figure, slider, buttons, and read-outs follow the published artifact.
   Ids and helpers stay inside this mount so they do not collide with the studio. */
(function (global) {
  'use strict';

  var PGRE = global.PGRE = global.PGRE || {};
  PGRE.conceptVisualizers = PGRE.conceptVisualizers || {};

  var CX = 120, CY = 210, H = 40, L = 300, SX = 420, AL = 5;

  function intensity(s) {
    var b = Math.PI * AL * s;
    return b === 0 ? 1 : Math.pow(Math.sin(b) / b, 2);
  }

  function setAttrs(el, o) {
    var k;
    for (k in o) {
      if (Object.prototype.hasOwnProperty.call(o, k)) el.setAttribute(k, o[k]);
    }
  }

  function markup() {
    return '<div class="cv-slit">' +
      '<h1>Single-slit diffraction: what is θ?</h1>' +
      '<p class="formula">Dark fringes where <i>a</i> sin <i>θ</i> = <i>m</i>λ, &nbsp;<i>m</i> = 1, 2, 3, …</p>' +
      '<div class="fig">' +
        '<svg viewBox="0 0 680 420" role="img" aria-labelledby="cvslit-ft cvslit-fd">' +
          '<title id="cvslit-ft">Single slit geometry</title>' +
          '<desc id="cvslit-fd">Light passes a slit of width a. Rays leave at angle theta. The extra path a sin theta is highlighted, and the brightness on the screen is plotted.</desc>' +
          '<g stroke="var(--ray)" stroke-width="1" opacity="0.35">' +
            '<line x1="20" y1="185" x2="110" y2="185"/>' +
            '<line x1="20" y1="210" x2="110" y2="210"/>' +
            '<line x1="20" y1="235" x2="110" y2="235"/>' +
          '</g>' +
          '<rect x="112" y="20" width="10" height="150" fill="var(--wall)"/>' +
          '<rect x="112" y="250" width="10" height="150" fill="var(--wall)"/>' +
          '<line x1="102" y1="170" x2="102" y2="250" stroke="var(--ink)" stroke-width="1"/>' +
          '<line x1="98" y1="170" x2="106" y2="170" stroke="var(--ink)" stroke-width="1"/>' +
          '<line x1="98" y1="250" x2="106" y2="250" stroke="var(--ink)" stroke-width="1"/>' +
          '<text x="90" y="214" font-size="15" font-family="var(--serif)" font-style="italic" text-anchor="end" fill="var(--ink)">a</text>' +
          '<line x1="122" y1="210" x2="420" y2="210" stroke="var(--ink-3)" stroke-width="0.6" stroke-dasharray="4 4"/>' +
          '<line x1="420" y1="20" x2="420" y2="400" stroke="var(--ink-2)" stroke-width="2"/>' +
          '<text x="420" y="414" font-size="12" text-anchor="middle" fill="var(--ink-2)">screen</text>' +
          '<path id="cvslit-curve" fill="none" stroke="var(--curve)" stroke-width="1.5"/>' +
          '<text x="600" y="414" font-size="12" text-anchor="middle" fill="var(--ink-2)">brightness</text>' +
          '<line id="cvslit-center" stroke="var(--ink-3)" stroke-width="1" stroke-dasharray="3 3"/>' +
          '<line id="cvslit-rtop" stroke="var(--ray)" stroke-width="1.5"/>' +
          '<line id="cvslit-rbot" stroke="var(--ray)" stroke-width="1.5"/>' +
          '<line id="cvslit-perp" stroke="var(--ink-2)" stroke-width="1" stroke-dasharray="3 3"/>' +
          '<line id="cvslit-extra" stroke="var(--extra)" stroke-width="4" stroke-linecap="round"/>' +
          '<path id="cvslit-arc" fill="none" stroke="var(--ink)" stroke-width="1"/>' +
          '<text id="cvslit-th-lbl" font-size="15" font-family="var(--serif)" font-style="italic" fill="var(--ink)" text-anchor="middle">θ</text>' +
          '<text id="cvslit-ex-lbl" font-size="12" fill="var(--extra)">a sin θ</text>' +
          '<circle id="cvslit-dot" r="5" stroke="var(--ink)" stroke-width="1"/>' +
          '<line id="cvslit-tick" stroke="var(--ink)" stroke-width="0.5" stroke-dasharray="2 2"/>' +
        '</svg>' +
      '</div>' +
      '<div class="row">' +
        '<label for="cvslit-th">Angle θ</label>' +
        '<input type="range" id="cvslit-th" min="-30" max="30" step="0.1" value="8">' +
        '<span id="cvslit-th-out" class="val">8.0°</span>' +
      '</div>' +
      '<div class="btns">' +
        '<button type="button" data-set="0">θ = 0 (center)</button>' +
        '<button type="button" data-set="1">Go to m = 1</button>' +
        '<button type="button" data-set="2">Go to m = 2</button>' +
      '</div>' +
      '<div class="stats">' +
        '<div class="stat"><span>sin θ</span><b id="cvslit-sin">0.139</b></div>' +
        '<div class="stat"><span>Extra path a sin θ</span><b id="cvslit-path">0.70 λ</b></div>' +
        '<div class="stat"><span>On the screen</span><b id="cvslit-screen">Bright</b></div>' +
      '</div>' +
      '<p class="note">Here a = 5λ (the slit is drawn much bigger than a real one). Dark spots appear where a sin θ = 1λ, 2λ, …</p>' +
      '<section class="explain">' +
        '<p>θ is the angle between the straight-ahead direction and the direction to a point on the screen. The blue lines are rays from the top and bottom edges of the slit. After the dashed line they travel the same distance, so the only difference is the orange piece: a sin θ.</p>' +
        '<p>When a sin θ = λ, split the slit into a top half and a bottom half. Each ray in the top half has a partner in the bottom half that is λ/2 behind it, so every pair cancels (destructive interference). At θ = 0 all rays arrive in step, so the center is the brightest spot.</p>' +
      '</section>' +
    '</div>';
  }

  function mount(host) {
    var dead = false;
    host.innerHTML = markup();
    var root = host.querySelector('.cv-slit');

    function byId(id) {
      return root.querySelector('#' + id);
    }

    var curve = byId('cvslit-curve');
    var th = byId('cvslit-th');
    var thOut = byId('cvslit-th-out');
    var sinOut = byId('cvslit-sin');
    var pathOut = byId('cvslit-path');
    var screenOut = byId('cvslit-screen');
    var center = byId('cvslit-center');
    var rTop = byId('cvslit-rtop');
    var rBot = byId('cvslit-rbot');
    var perp = byId('cvslit-perp');
    var extra = byId('cvslit-extra');
    var arc = byId('cvslit-arc');
    var thLbl = byId('cvslit-th-lbl');
    var exLbl = byId('cvslit-ex-lbl');
    var dot = byId('cvslit-dot');
    var tick = byId('cvslit-tick');
    var btn0 = root.querySelector('[data-set="0"]');
    var btn1 = root.querySelector('[data-set="1"]');
    var btn2 = root.querySelector('[data-set="2"]');

    var d = '';
    var y;
    for (y = 24; y <= 396; y += 2) {
      var ang = Math.atan((CY - y) / L);
      var x = SX + 12 + 170 * intensity(Math.sin(ang));
      d += (d ? 'L' : 'M') + x.toFixed(1) + ' ' + y;
    }
    curve.setAttribute('d', d);

    function upd() {
      if (dead) return;
      var deg = parseFloat(th.value);
      var t = deg * Math.PI / 180;
      var s = Math.sin(t);
      var c = Math.cos(t);
      var len = (SX - CX) / c;
      var dx = c;
      var dy = -s;
      var yS = CY - L * Math.tan(t);
      setAttrs(center, { x1: CX, y1: CY, x2: SX, y2: yS });
      setAttrs(rTop, { x1: CX, y1: CY - H, x2: CX + dx * len, y2: CY - H + dy * len });
      setAttrs(rBot, { x1: CX, y1: CY + H, x2: CX + dx * len, y2: CY + H + dy * len });
      var p = 2 * H * s;
      var fx = CX + p * dx;
      var fy = CY + H + p * dy;
      setAttrs(extra, { x1: CX, y1: CY + H, x2: fx, y2: fy });
      setAttrs(perp, { x1: CX, y1: CY - H, x2: fx, y2: fy });
      extra.style.opacity = Math.abs(p) < 1 ? 0 : 1;
      var r = 60;
      var ex = CX + r * c;
      var ey = CY - r * s;
      arc.setAttribute('d', 'M' + (CX + r) + ' ' + CY + ' A' + r + ' ' + r + ' 0 0 ' + (t > 0 ? 0 : 1) + ' ' + ex.toFixed(1) + ' ' + ey.toFixed(1));
      var half = t / 2;
      setAttrs(thLbl, {
        x: (CX + 76 * Math.cos(half)).toFixed(1),
        y: (CY - 76 * Math.sin(half) + 5).toFixed(1)
      });
      thLbl.style.opacity = Math.abs(deg) < 3 ? 0 : 1;
      setAttrs(exLbl, {
        x: (fx / 2 + CX / 2 + 10).toFixed(1),
        y: ((fy + CY + H) / 2 + (t > 0 ? 18 : -8)).toFixed(1)
      });
      exLbl.style.opacity = Math.abs(deg) < 3 ? 0 : 1;
      var inten = intensity(s);
      setAttrs(dot, {
        cx: SX,
        cy: yS.toFixed(1),
        fill: 'rgba(239,159,39,' + (0.15 + 0.85 * inten).toFixed(3) + ')'
      });
      setAttrs(tick, {
        x1: SX,
        y1: yS.toFixed(1),
        x2: (SX + 12 + 170 * inten).toFixed(1),
        y2: yS.toFixed(1)
      });
      var m = AL * s;
      thOut.textContent = deg.toFixed(1) + '°';
      sinOut.textContent = s.toFixed(3);
      pathOut.textContent = m.toFixed(2) + ' λ';
      var n = Math.round(Math.abs(m));
      var st;
      if (Math.abs(deg) < 0.3) st = 'Brightest (center)';
      else if (n >= 1 && Math.abs(Math.abs(m) - n) < 0.04) st = 'Dark (m = ' + n + ')';
      else st = inten > 0.3 ? 'Bright' : 'Dim';
      screenOut.textContent = st;
      screenOut.style.color = st.indexOf('Dark') === 0 ? 'var(--dark)' : 'var(--ink)';
    }

    function setTh(v) {
      th.value = v.toFixed(1);
      upd();
    }

    function onInput() { upd(); }
    function on0() { setTh(0); }
    function on1() { setTh(Math.asin(0.2) * 180 / Math.PI); }
    function on2() { setTh(Math.asin(0.4) * 180 / Math.PI); }

    th.addEventListener('input', onInput);
    btn0.addEventListener('click', on0);
    btn1.addEventListener('click', on1);
    btn2.addEventListener('click', on2);
    upd();

    function destroy() {
      if (dead) return;
      dead = true;
      th.removeEventListener('input', onInput);
      btn0.removeEventListener('click', on0);
      btn1.removeEventListener('click', on1);
      btn2.removeEventListener('click', on2);
    }

    function getState() {
      return {
        deg: thOut.textContent,
        sin: sinOut.textContent,
        path: pathOut.textContent,
        screen: screenOut.textContent
      };
    }

    return {
      destroy: destroy,
      getState: getState,
      setTh: setTh
    };
  }

  PGRE.conceptVisualizers['single-slit'] = {
    id: 'single-slit',
    kind: 'concept',
    title: 'Single-slit diffraction: what is θ?',
    topic: 'ow',
    href: '#/concepts/single-slit',
    formulaLatex: 'a \\sin\\theta = m\\lambda,\\; m = 1, 2, 3, \\ldots',
    physicalStory: 'θ is the angle between the straight-ahead direction and the direction to a point on the screen. The blue lines are rays from the top and bottom edges of the slit. After the dashed line they travel the same distance, so the only difference is the orange piece: a sin θ. When a sin θ = λ, split the slit into a top half and a bottom half. Each ray in the top half has a partner in the bottom half that is λ/2 behind it, so every pair cancels (destructive interference). At θ = 0 all rays arrive in step, so the center is the brightest spot.',
    mount: mount
  };
})(typeof window !== 'undefined' ? window : globalThis);
