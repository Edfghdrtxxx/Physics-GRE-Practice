/* ——— Motion system ———
   Public API: PGRE.motion = { loader, countUp, animateMeter, stagger, reduced }
   All animations respect prefers-reduced-motion and pause when tab hidden. */
(function () {
  'use strict';

  var motion = {};
  motion.reduced = false;

  function computeReduced() {
    try {
      return window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) { return false; }
  }
  motion.reduced = computeReduced();
  try {
    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      var onChange = function () { motion.reduced = computeReduced(); };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }
  } catch (e) { /* keep initial value */ }

  /* ——— Top loading bar ———
     Thin fixed bar at viewport top, z-index 30 (above topbar 10, under
     toasts 50). start() eases an indeterminate crawl toward 90%; done()
     snaps to 100% then fades out. Overlapping start/done calls are handled
     with a counter so nested async work keeps the bar alive. */
  var loader = (function () {
    var el = null;
    var active = 0;          // outstanding start() calls
    var raf = 0;
    var startedAt = 0;
    var finishTimer = 0;       // deferred finish() timer, cleared on new start()
    var MIN_VISIBLE_MS = 350;   // keep the bar perceptible on fast views
    var CRAWL_MS = 8000;        // time to asymptotically approach 90%

    function ensureEl() {
      if (el && el.isConnected) return el;
      el = document.createElement('div');
      el.className = 'motion-loader';
      el.setAttribute('role', 'progressbar');
      el.setAttribute('aria-label', 'Loading');
      el.setAttribute('aria-hidden', 'true');
      document.body.appendChild(el);
      return el;
    }

    function paint(now) {
      if (!el || !el.isConnected) return;
      var elapsed = now - startedAt;
      // Eased asymptotic approach to 90%: fast start, slowing crawl.
      var frac = 1 - Math.exp(-elapsed / (CRAWL_MS / 3));
      var pct = 8 + frac * 82;
      el.style.width = pct.toFixed(2) + '%';
      raf = requestAnimationFrame(paint);
    }

    function start() {
      active += 1;
      if (active > 1) return;   // already running for an outer operation
      if (finishTimer) { clearTimeout(finishTimer); finishTimer = 0; }   // a pending finish must not kill a new run
      if (motion.reduced) return;   // visual no-op: no crawl, no 60% stand-in
      el = ensureEl();
      el.classList.remove('motion-loader-done', 'motion-loader-hide');
      el.style.opacity = '1';
      el.style.width = '0%';
      startedAt = Date.now();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(paint);
    }

    function done() {
      if (active > 0) active -= 1;
      if (active > 0) return;   // outer operation still pending
      if (motion.reduced) {
        cancelAnimationFrame(raf);
        raf = 0;
        if (el && el.isConnected) el.remove();
        el = null;
        return;
      }
      if (!el || !el.isConnected) return;
      cancelAnimationFrame(raf);
      var bar = el;
      var finish = function () {
        bar.style.width = '100%';
        bar.classList.add('motion-loader-done');
        setTimeout(function () {
          bar.classList.add('motion-loader-hide');
          setTimeout(function () {
            if (bar.isConnected) bar.remove();
            if (el === bar) el = null;
          }, 400);
        }, 120);
      };
      var waited = Date.now() - startedAt;
      if (waited >= MIN_VISIBLE_MS) finish();
      else finishTimer = setTimeout(finish, MIN_VISIBLE_MS - waited);
    }

  /* Pause any running loader when the tab is hidden. */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && el) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else if (!document.hidden && el && active > 0 && !raf && !motion.reduced) {
      raf = requestAnimationFrame(paint);
    }
  });

    return { start: start, done: done };
  })();
  motion.loader = loader;

  /* ——— View-enter transition ———
     Adds .view-enter to #view (fade + rise, see css/motion.css). The class
     is removed on animationend so re-renders inside a view can re-trigger. */
  motion.viewEnter = function (viewEl) {
    var el = viewEl || document.getElementById('view');
    if (!el) return;
    el.classList.remove('view-enter');
    if (motion.reduced) return;   // reduced motion: no enter animation
    // Force a reflow so removing + re-adding restarts the animation.
    void el.offsetWidth;
    el.classList.add('view-enter');
    var cleared = false;
    var clear = function () {
      if (cleared) return;
      cleared = true;
      el.classList.remove('view-enter');
      el.removeEventListener('animationend', onEnd);
    };
    var onEnd = function (e) {
      if (e.target !== el) return;   // ignore bubbled child animations
      clear();
    };
    el.addEventListener('animationend', onEnd);
    // Safety net: never leave the class stuck if animationend is missed.
    setTimeout(clear, 600);
  };

  /* ——— Staggered children ———
     Sets incremental animation-delay on direct children (or `selector`
     matches) carrying the .stagger-in class so card grids cascade in.
     Reduced motion: no-op (children just appear). */
  motion.stagger = function (container, opts) {
    if (!container || motion.reduced) return;
    var options = opts || {};
    var selector = options.selector || ':scope > *';
    var step = typeof options.step === 'number' ? options.step : 30;
    var max = typeof options.max === 'number' ? options.max : 12;
    var children;
    try {
      children = container.querySelectorAll(selector);
    } catch (e) { return; }
    var n = 0;
    for (var i = 0; i < children.length && n < max; i++) {
      var child = children[i];
      if (!child.classList.contains('stagger-in')) continue;
      child.style.animationDelay = (n * step) + 'ms';
      n += 1;
    }
  };

  /* ——— countUp ———
     rAF-driven number tween writing el.textContent. Options:
     { duration (ms, default 900), decimals (default 0),
       format (fn(number) -> string; overrides decimals) }
     Reduced motion: writes the final formatted value immediately. */
  motion.countUp = function (el, to, opts) {
    if (!el) return;
    var options = opts || {};
    var decimals = typeof options.decimals === 'number' ? options.decimals : 0;
    var format = typeof options.format === 'function' ? options.format : null;
    var duration = typeof options.duration === 'number' ? options.duration : 900;
    var target = Number(to) || 0;

    function render(value) {
      el.textContent = format ? format(value)
        : value.toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
          });
    }

    var startTs = null;
    if (el._cu) cancelAnimationFrame(el._cu);   // cancel any prior tween on this element
    if (motion.reduced) { render(target); el._cu = 0; return; }
    function frame(now) {
      if (!el.isConnected) return;   // stop if the element left the DOM
      if (startTs === null) startTs = now;
      var t = Math.min(1, (now - startTs) / duration);
      var eased = 1 - Math.pow(1 - t, 3);   // ease-out cubic
      render(target * eased);
      if (t < 1) el._cu = requestAnimationFrame(frame);
      else { render(target); el._cu = 0; }
    }
    el._cu = requestAnimationFrame(frame);
  };

  /* ——— animateMeter ———
     For .meter-fill elements: set width to 0 now, then to `pct` on the next
     frame so the existing `transition: width var(--dur-slow)` (style.css)
     animates on first paint instead of snapping. Reduced motion: set final width. */
  motion.animateMeter = function (el, pct) {
    if (!el) return;
    var target = Math.max(0, Math.min(100, Number(pct) || 0));
    if (motion.reduced) { el.style.width = target + '%'; return; }
    el.style.width = '0%';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { el.style.width = target + '%'; });
    });
  };


  window.PGRE = window.PGRE || {};
  window.PGRE.motion = motion;
})();
