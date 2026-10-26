/* Dotted-underline explanations on Recall cards. After PGRE.typesetMath, every
   card face (.fcard-name / -front / -back / -note, .ps-card-front / -back) is
   scanned for the words and KaTeX symbols listed in PGRE.CARD_TERMS
   (js/data-terms.js, plus content/bank/cpg-terms.js when present). The first
   occurrence of each term per face is wrapped in <span class="term">; hovering
   it shows one fixed .term-tip popover whose text may carry $…$ math.
   The question face of reverse mode (.fcard-front after .fcard-rev-q) is
   skipped, so a symbol tip never names the formula being asked for.
   Idempotent: text already inside a .term is never wrapped again. */
window.PGRE = window.PGRE || {};
PGRE.CARD_TERMS = PGRE.CARD_TERMS || [];

(function () {
  'use strict';

  var FACE_SEL = '.fcard-name, .fcard-front, .fcard-back, .fcard-note, .ps-card-front, .ps-card-back';
  var BACK_SEL = '.fcard-back, .ps-card-back';
  var SKIP_SEL = '.katex, .term, .fcard-mnemonic, button, a, textarea, input, select, script, style, .card-diagram-host';

  function normTex(s) {
    return String(s || '').replace(/\\tag\*?\{[^}]*\}/g, '').replace(/\s+/g, '');
  }

  function escRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  }

  /* Compiled once per CARD_TERMS length: phrases longest first, so "beat
     frequency" is wrapped before a shorter entry could claim "frequency". */
  var compiled = null, compiledLen = -1;
  function compile() {
    var list = PGRE.CARD_TERMS;
    if (compiled && compiledLen === list.length) return compiled;
    var words = [], texs = [];
    list.forEach(function (e, i) {
      if (!e || !e.tip) return;
      var cards = e.cards ? e.cards.slice() : null;
      (e.match || []).forEach(function (p) {
        words.push({
          i: i, len: p.length, cards: cards,
          re: new RegExp('(^|[^A-Za-z0-9])(' + escRe(p) + '(?:e?s)?)(?=[^A-Za-z0-9]|$)', 'i')
        });
      });
      (e.tex || []).forEach(function (t) { texs.push({ i: i, tex: normTex(t), cards: cards }); });
    });
    words.sort(function (a, b) { return b.len - a.len; });
    compiled = { words: words, texs: texs };
    compiledLen = list.length;
    return compiled;
  }

  function applies(rule, cardId) {
    return !rule.cards || (!!cardId && rule.cards.indexOf(cardId) !== -1);
  }

  function textNodes(face) {
    var out = [];
    var w = document.createTreeWalker(face, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentElement;
        if (!p || (p.closest && p.closest(SKIP_SEL))) return NodeFilter.FILTER_REJECT;
        return /\S/.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    while (w.nextNode()) out.push(w.currentNode);
    return out;
  }

  /* Terms already shown on this face. A back face counts its own spans; a
     front face counts the card minus its back, so the back (hidden until the
     flip) still underlines a term the question already underlined. */
  function usedOn(face) {
    var back = face.closest(BACK_SEL);
    var scope = back || face.closest('.fcard, .ps-card') || face;
    var used = {};
    var spans = scope.querySelectorAll('.term[data-term]');
    for (var k = 0; k < spans.length; k++) {
      if (!back && spans[k].closest(BACK_SEL)) continue;
      used[spans[k].getAttribute('data-term')] = true;
    }
    return used;
  }

  function wrapWord(face, rule) {
    var nodes = textNodes(face);
    for (var k = 0; k < nodes.length; k++) {
      var node = nodes[k];
      var m = rule.re.exec(node.nodeValue);
      if (!m) continue;
      var start = m.index + m[1].length;
      var hit = node.splitText(start);
      hit.splitText(m[2].length);
      var span = document.createElement('span');
      span.className = 'term';
      span.setAttribute('data-term', String(rule.i));
      hit.parentNode.replaceChild(span, hit);
      span.appendChild(hit);
      return true;
    }
    return false;
  }

  function annotateFace(face) {
    var prev = face.previousElementSibling;
    if (face.classList.contains('fcard-front') && prev && prev.classList.contains('fcard-rev-q')) return;
    var holder = face.closest('[data-card-id]');
    var cardId = holder ? holder.getAttribute('data-card-id') : '';
    var c = compile();
    var used = usedOn(face);

    var maths = face.querySelectorAll('.katex');
    for (var k = 0; k < maths.length; k++) {
      var kx = maths[k];
      if (kx.closest('.term')) continue;
      var ann = kx.querySelector('annotation[encoding="application/x-tex"]');
      if (!ann) continue;
      var src = normTex(ann.textContent);
      for (var t = 0; t < c.texs.length; t++) {
        var r = c.texs[t];
        if (used[r.i] || r.tex !== src || !applies(r, cardId)) continue;
        // Marked in place, not wrapped: a wrapper inside .katex-display breaks
        // the layout KaTeX gives an equation tag such as (supp).
        kx.classList.add('term', 'term-math');
        kx.setAttribute('data-term', String(r.i));
        used[r.i] = true;
        break;
      }
    }

    for (var j = 0; j < c.words.length; j++) {
      var w = c.words[j];
      if (used[w.i] || !applies(w, cardId)) continue;
      if (wrapWord(face, w)) used[w.i] = true;
    }
  }

  PGRE.annotateCardTerms = function (root) {
    if (!root || !root.querySelectorAll || !PGRE.CARD_TERMS.length) return;
    var faces = [];
    if (root.matches && root.matches(FACE_SEL)) faces.push(root);
    var found = root.querySelectorAll(FACE_SEL);
    for (var k = 0; k < found.length; k++) faces.push(found[k]);
    faces.forEach(function (f) {
      // A note inside a back face is scanned with that face.
      var outer = f.parentElement && f.parentElement.closest(FACE_SEL);
      if (outer && faces.indexOf(outer) !== -1) return;
      try { annotateFace(f); } catch (e) { /* the card still shows without underlines */ }
    });
  };

  /* ——— Popover ——— */
  var tip = null, current = null, cache = {};

  function ensureTip() {
    if (tip && tip.isConnected) return tip;
    tip = document.createElement('div');
    tip.className = 'term-tip';
    tip.setAttribute('role', 'tooltip');
    tip.setAttribute('aria-hidden', 'true');
    document.body.appendChild(tip);
    return tip;
  }

  function tipHTML(i) {
    if (cache[i]) return cache[i];
    var e = PGRE.CARD_TERMS[i];
    if (!e) return '';
    var box = document.createElement('div');
    box.innerHTML = e.tip;
    if (window.renderMathInElement) {
      try {
        renderMathInElement(box, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false }
          ],
          throwOnError: false
        });
      } catch (err) { /* tip keeps its source text */ }
    }
    cache[i] = box.innerHTML;
    return cache[i];
  }

  function place(span) {
    var r = span.getBoundingClientRect();
    var pad = 8;
    var w = tip.offsetWidth, h = tip.offsetHeight;
    var left = Math.min(Math.max(pad, r.left), window.innerWidth - w - pad);
    var top = r.bottom + 6;
    if (top + h > window.innerHeight - pad) top = r.top - h - 6;
    if (top < pad) top = pad;
    tip.style.left = Math.round(left) + 'px';
    tip.style.top = Math.round(top) + 'px';
  }

  function show(span) {
    var html = tipHTML(span.getAttribute('data-term'));
    if (!html) return;
    ensureTip();
    current = span;
    tip.innerHTML = html;
    tip.classList.add('is-on');
    tip.setAttribute('aria-hidden', 'false');
    place(span);
  }

  function hide() {
    current = null;
    if (!tip) return;
    tip.classList.remove('is-on');
    tip.setAttribute('aria-hidden', 'true');
  }

  document.addEventListener('mouseover', function (e) {
    var span = e.target && e.target.closest && e.target.closest('.term[data-term]');
    if (span === current) return;
    if (span) show(span); else hide();
  });
  window.addEventListener('scroll', hide, true);
  window.addEventListener('hashchange', hide);

  (function wrapTypesetMath() {
    function wrap() {
      var prev = PGRE.typesetMath;
      if (typeof prev !== 'function' || prev._pgreCardTerms) return;
      var wrapped = function (el) {
        prev.call(PGRE, el);
        PGRE.annotateCardTerms(el);
      };
      wrapped._pgreCardTerms = true;
      // Keep the card-diagrams flag visible so its own wrap() does not stack again.
      if (prev._pgreCardDiagrams) wrapped._pgreCardDiagrams = true;
      PGRE.typesetMath = wrapped;
    }
    wrap();
    document.addEventListener('DOMContentLoaded', wrap);
  })();
})();
