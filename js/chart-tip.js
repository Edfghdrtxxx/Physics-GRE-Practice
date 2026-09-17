/* Delegated chart tooltip — any [data-tip] in the document (SVG or HTML)
   shows a single fixed popover. Delegation survives innerHTML re-renders;
   there is no per-chart wiring. data-tip is plain text (escaped at build
   time); "\n" in the attribute becomes a line break. */
(function () {
  'use strict';

  var el = null;
  var current = null;

  function ensure() {
    if (el && el.isConnected) return el;
    el = document.createElement('div');
    el.className = 'chart-tip';
    el.setAttribute('role', 'tooltip');
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
    return el;
  }

  function closestTip(node) {
    if (!node || node.nodeType !== 1) {
      node = node && node.parentElement;
    }
    if (!node || typeof node.closest !== 'function') return null;
    return node.closest('[data-tip]');
  }

  function tipText(node) {
    return String(node.getAttribute('data-tip') || '').replace(/\\n/g, '\n');
  }

  function hide() {
    current = null;
    if (!el) return;
    el.classList.remove('is-on');
    el.setAttribute('aria-hidden', 'true');
  }

  function place(x, y) {
    var tip = el;
    var pad = 8;
    var w = tip.offsetWidth;
    var h = tip.offsetHeight;
    var left = x + 14;
    var top = y - h - 10;
    if (top < pad) top = y + 18;
    if (left + w > window.innerWidth - pad) left = x - w - 14;
    if (left < pad) left = pad;
    if (top + h > window.innerHeight - pad) top = window.innerHeight - h - pad;
    if (top < pad) top = pad;
    tip.style.left = Math.round(left) + 'px';
    tip.style.top = Math.round(top) + 'px';
  }

  function show(node, x, y) {
    if (!node || !node.isConnected) { hide(); return; }
    var text = tipText(node);
    if (!text) { hide(); return; }
    var tip = ensure();
    tip.textContent = text;
    current = node;
    tip.classList.toggle('is-fast', node.hasAttribute('data-tip-fast'));
    place(x, y);
    tip.classList.add('is-on');
    tip.setAttribute('aria-hidden', 'false');
  }

  document.addEventListener('mouseover', function (e) {
    var node = closestTip(e.target);
    if (node) show(node, e.clientX, e.clientY);
  });

  document.addEventListener('mouseout', function (e) {
    var next = closestTip(e.relatedTarget);
    if (!next) hide();
  });

  document.addEventListener('mousemove', function (e) {
    if (!current) return;
    if (!current.isConnected) { hide(); return; }
    var node = closestTip(e.target);
    if (node === current) show(current, e.clientX, e.clientY);
  });

  document.addEventListener('focusin', function (e) {
    var node = closestTip(e.target);
    if (!node) return;
    var r = node.getBoundingClientRect();
    show(node, r.left + r.width / 2, r.top);
  });

  document.addEventListener('focusout', function (e) {
    var next = closestTip(e.relatedTarget);
    if (!next) hide();
  });

  document.addEventListener('scroll', hide, true);
  document.addEventListener('pointerdown', hide);
})();
