/* Concept search engine — index, match and teach-highlight resolution.
   Indexes formula visualizers (with .draw) and concept visualizers.
   Strips LaTeX to searchable letters and folds Greek names/symbols. */
(function () {
  'use strict';

  var root = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this);
  root.PGRE = root.PGRE || {};

  var GREEK_COMMANDS = [
    { re: /\\[vV]artheta\b/g, rep: ' theta ' },
    { re: /\\[tT]heta\b/g, rep: ' theta ' },
    { re: /\\[vV]arphi\b/g, rep: ' phi ' },
    { re: /\\[pP]hi\b/g, rep: ' phi ' },
    { re: /\\[oO]mega\b/g, rep: ' omega ' },
    { re: /\\[aA]lpha\b/g, rep: ' alpha ' },
    { re: /\\[bB]eta\b/g, rep: ' beta ' },
    { re: /\\[gG]amma\b/g, rep: ' gamma ' },
    { re: /\\[dD]elta\b/g, rep: ' delta ' },
    { re: /\\[vV]arepsilon\b/g, rep: ' epsilon ' },
    { re: /\\[eE]psilon\b/g, rep: ' epsilon ' },
    { re: /\\[zZ]eta\b/g, rep: ' zeta ' },
    { re: /\\[eE]ta\b/g, rep: ' eta ' },
    { re: /\\[kK]appa\b/g, rep: ' kappa ' },
    { re: /\\[lL]ambda\b/g, rep: ' lambda ' },
    { re: /\\[mM]u\b/g, rep: ' mu ' },
    { re: /\\[nN]u\b/g, rep: ' nu ' },
    { re: /\\[xX]i\b/g, rep: ' xi ' },
    { re: /\\[vV]arpi\b/g, rep: ' pi ' },
    { re: /\\[pP]i\b/g, rep: ' pi ' },
    { re: /\\[vV]arrho\b/g, rep: ' rho ' },
    { re: /\\[rR]ho\b/g, rep: ' rho ' },
    { re: /\\[vV]arsigma\b/g, rep: ' sigma ' },
    { re: /\\[sS]igma\b/g, rep: ' sigma ' },
    { re: /\\[tT]au\b/g, rep: ' tau ' },
    { re: /\\[uU]psilon\b/g, rep: ' upsilon ' },
    { re: /\\[cC]hi\b/g, rep: ' chi ' },
    { re: /\\[pP]si\b/g, rep: ' psi ' }
  ];

  var GREEK_UNICODE = [
    { re: /[θϑ]/g, rep: ' theta ' },
    { re: /[φϕ]/g, rep: ' phi ' },
    { re: /[ωΩ]/g, rep: ' omega ' },
    { re: /[αΑ]/g, rep: ' alpha ' },
    { re: /[βΒ]/g, rep: ' beta ' },
    { re: /[γΓ]/g, rep: ' gamma ' },
    { re: /[δΔ]/g, rep: ' delta ' },
    { re: /[εϵΕ]/g, rep: ' epsilon ' },
    { re: /[ζΖ]/g, rep: ' zeta ' },
    { re: /[ηΗ]/g, rep: ' eta ' },
    { re: /[κΚ]/g, rep: ' kappa ' },
    { re: /[λΛ]/g, rep: ' lambda ' },
    { re: /[μΜ]/g, rep: ' mu ' },
    { re: /[νΝ]/g, rep: ' nu ' },
    { re: /[ξΞ]/g, rep: ' xi ' },
    { re: /[πϖΠ]/g, rep: ' pi ' },
    { re: /[ρϱΡ]/g, rep: ' rho ' },
    { re: /[σςΣ]/g, rep: ' sigma ' },
    { re: /[τΤ]/g, rep: ' tau ' },
    { re: /[υΥ]/g, rep: ' upsilon ' },
    { re: /[χΧ]/g, rep: ' chi ' },
    { re: /[ψΨ]/g, rep: ' psi ' }
  ];

  var TEACH_RULES = [
    { id: 'theta', match: /\bfrom\s+z\b/i, len: 10 },
    { id: 'phi', match: /\bfrom\s+x\b/i, len: 10 },
    { id: 'theta', match: /\bcolatitudes?\b/i, len: 10 },
    { id: 'phi', match: /\bazimuth(?:al)?s?\b/i, len: 8 },
    { id: 'equator', match: /\bequators?\b/i, len: 7 },
    { id: 'sphere', match: /\bspheres?\b/i, len: 6 },
    { id: 'sphere', match: /\bshells?\b/i, len: 5 },
    { id: 'origin', match: /\borigins?\b/i, len: 6 },
    { id: 'r', match: /\bradi(?:us|i)\b/i, len: 6 },
    { id: 'theta', match: /\bpolar\b/i, len: 5 },
    { id: 'phi', match: /\bvarphis?\b/i, len: 6 },
    { id: 'phi', match: /\\varphi\b/i, len: 7 },
    { id: 'theta', match: /\bthetas?\b/i, len: 5 },
    { id: 'theta', match: /\\theta\b/i, len: 6 },
    { id: 'theta', match: /\\vartheta\b/i, len: 8 },
    { id: 'phi', match: /\bphis?\b/i, len: 3 },
    { id: 'phi', match: /\\phi\b/i, len: 4 },
    { id: 'equator', match: /\bxy\b/i, len: 2 },
    { id: 'theta', match: /[θϑ]/, len: 2 },
    { id: 'phi', match: /[φϕ]/, len: 2 },
    { id: 'r', match: /\br\b/i, len: 1 },
    { id: 'x', match: /\bx\b/i, len: 1 },
    { id: 'y', match: /\by\b/i, len: 1 },
    { id: 'z', match: /\bz\b/i, len: 1 },
    { id: 'origin', match: /\bo\b/i, len: 1 }
  ];

  var index = null;

  function esc(s) {
    if (s == null) return '';
    if (root.PGRE && root.PGRE.ui && typeof root.PGRE.ui.esc === 'function') {
      return root.PGRE.ui.esc(s);
    }
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function escRe(t) {
    return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function plain(s) {
    if (s == null) return '';
    var str = String(s)
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
      .replace(/\${1,2}/g, ' ');

    for (var i = 0; i < GREEK_COMMANDS.length; i++) {
      str = str.replace(GREEK_COMMANDS[i].re, GREEK_COMMANDS[i].rep);
    }

    str = str.replace(/\\[a-zA-Z]+/g, ' ');

    for (var j = 0; j < GREEK_UNICODE.length; j++) {
      str = str.replace(GREEK_UNICODE[j].re, GREEK_UNICODE[j].rep);
    }

    str = str.replace(/[\\{}^_~`#*>|[\]]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return str;
  }

  function terms(qstr) {
    if (!qstr) return [];
    var s = plain(qstr).toLowerCase();
    return s.split(/\s+/).map(function (t) {
      return t.replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, '');
    }).filter(function (t) {
      return t.length > 0 && /[a-z0-9]/i.test(t);
    });
  }

  function getTopicName(code) {
    if (!code || !root.PGRE || !Array.isArray(root.PGRE.TOPICS)) return '';
    for (var i = 0; i < root.PGRE.TOPICS.length; i++) {
      var t = root.PGRE.TOPICS[i];
      if (t && t.id === code) {
        return ' ' + (t.name || '') + ' ' + (t.short || '') + ' ';
      }
    }
    return '';
  }

  function snippet(text, ts) {
    if (!text) return '';
    var lc = text.toLowerCase(), pos = -1, mlen = 0;
    ts.forEach(function (t) {
      var p = lc.indexOf(t);
      if (p !== -1 && (pos === -1 || p < pos)) { pos = p; mlen = t.length; }
    });
    if (pos === -1) pos = 0;
    var start = Math.max(0, pos - 60);
    var end = Math.min(text.length, pos + mlen + 60);
    var win = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
    if (!ts.length) return esc(win);
    var re = new RegExp('(' + ts.map(escRe).join('|') + ')', 'gi');
    var out = '', last = 0, m;
    while ((m = re.exec(win)) !== null) {
      out += esc(win.slice(last, m.index)) + '<mark>' + esc(m[0]) + '</mark>';
      last = m.index + m[0].length;
      if (m.index === re.lastIndex) re.lastIndex++;
    }
    return out + esc(win.slice(last));
  }

  function scoreEntry(e, ts) {
    var s = 0;
    for (var i = 0; i < ts.length; i++) {
      var t = ts[i];
      if (e.titleHay.indexOf(t) !== -1) s += 10;
      if (e.hay.indexOf(t) !== -1) s += 1;
    }
    return s;
  }

  function countTitleHits(e, ts) {
    var count = 0;
    for (var i = 0; i < ts.length; i++) {
      if (e.titleHay.indexOf(ts[i]) !== -1) count++;
    }
    return count;
  }

  function createEntry(kind, id, title, topic, formulaLatex, physicalStory, href, idx) {
    var t = title || '';
    var top = topic || '';
    var form = formulaLatex || '';
    var story = physicalStory || '';

    var pt = plain(t);
    var pTop = plain(top);
    var topName = getTopicName(top);
    var pf = plain(form);
    var ps = plain(story);
    var pid = plain(id || '');

    var titleHay = (pt + ' ' + t).toLowerCase();
    var hay = (titleHay + ' ' + pTop + ' ' + topName + ' ' + pf + ' ' + form + ' ' + ps + ' ' + pid).toLowerCase();

    var displayText = pt;
    if (ps) displayText += ' — ' + ps;
    if (pf) displayText += (ps ? ' ' : ' — ') + pf;

    return {
      kind: kind,
      id: id || '',
      title: t,
      topic: top,
      formulaLatex: form,
      physicalStory: story,
      href: href || '',
      idx: idx,
      titleHay: titleHay,
      hay: hay,
      displayText: displayText
    };
  }

  function build() {
    var out = [];
    var idx = 0;

    var viz = (root.PGRE && root.PGRE.visualizers) || {};
    var vizKeys = Object.keys(viz);
    for (var i = 0; i < vizKeys.length; i++) {
      var k = vizKeys[i];
      var v = viz[k];
      if (v && typeof v.draw === 'function') {
        out.push(createEntry(
          'formula',
          v.id || k,
          v.title || '',
          v.topic || '',
          v.formulaLatex || '',
          v.physicalStory || '',
          '',
          idx++
        ));
      }
    }

    var cvs = (root.PGRE && root.PGRE.conceptVisualizers) || {};
    if (Array.isArray(cvs)) {
      for (var j = 0; j < cvs.length; j++) {
        var c = cvs[j];
        if (c && typeof c === 'object') {
          out.push(createEntry(
            'concept',
            c.id || ('concept-' + j),
            c.title || '',
            c.topic || '',
            c.formulaLatex || c.formula || '',
            c.physicalStory || c.story || '',
            c.href || '',
            idx++
          ));
        }
      }
    } else if (typeof cvs === 'object') {
      var cvKeys = Object.keys(cvs);
      for (var m = 0; m < cvKeys.length; m++) {
        var ck = cvKeys[m];
        var item = cvs[ck];
        if (item && typeof item === 'object') {
          out.push(createEntry(
            'concept',
            item.id || ck,
            item.title || '',
            item.topic || '',
            item.formulaLatex || item.formula || '',
            item.physicalStory || item.story || '',
            item.href || '',
            idx++
          ));
        }
      }
    }

    index = out;
    return index;
  }

  function matchSession(q) {
    if (!q || !String(q).trim()) return [];
    var ts = terms(q);
    if (!ts.length) return [];

    if (index === null) build();

    var hits = [];
    for (var i = 0; i < index.length; i++) {
      var e = index[i];
      var matchesAll = true;
      for (var j = 0; j < ts.length; j++) {
        if (e.hay.indexOf(ts[j]) === -1) {
          matchesAll = false;
          break;
        }
      }
      if (matchesAll) {
        var thCount = countTitleHits(e, ts);
        var s = scoreEntry(e, ts);
        hits.push({
          entry: e,
          titleHit: thCount > 0,
          titleHitsCount: thCount,
          score: s,
          idx: e.idx,
          snippet: snippet(e.displayText, ts)
        });
      }
    }

    hits.sort(function (a, b) {
      if (a.titleHit !== b.titleHit) {
        return a.titleHit ? -1 : 1;
      }
      if (a.titleHitsCount !== b.titleHitsCount) {
        return b.titleHitsCount - a.titleHitsCount;
      }
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      return a.idx - b.idx;
    });

    return hits.map(function (h) {
      return {
        kind: h.entry.kind,
        id: h.entry.id,
        title: h.entry.title,
        topic: h.entry.topic,
        href: h.entry.href,
        snippet: h.snippet
      };
    });
  }

  function matchGallery(q, items) {
    if (!items || !Array.isArray(items)) return [];
    if (!q || !String(q).trim()) return items.slice();
    var ts = terms(q);
    if (!ts.length) return items.slice();

    var results = [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (!item) continue;
      var title = item.title || '';
      var topic = item.topic || '';
      var formula = item.formulaLatex || item.formula || '';
      var story = item.physicalStory || item.story || '';
      var id = item.id || '';

      var pt = plain(title);
      var ptop = plain(topic);
      var topName = getTopicName(topic);
      var pf = plain(formula);
      var ps = plain(story);
      var pid = plain(id);

      var hay = (pt + ' ' + title + ' ' + ptop + ' ' + topName + ' ' + pf + ' ' + formula + ' ' + ps + ' ' + pid).toLowerCase();

      var matchesAll = true;
      for (var j = 0; j < ts.length; j++) {
        if (hay.indexOf(ts[j]) === -1) {
          matchesAll = false;
          break;
        }
      }
      if (matchesAll) {
        results.push(item);
      }
    }
    return results;
  }

  function matchTeach(q) {
    if (q == null) return null;
    var s = String(q).toLowerCase().trim();
    if (!s) return null;

    var best = null;
    for (var i = 0; i < TEACH_RULES.length; i++) {
      var rule = TEACH_RULES[i];
      var m = rule.match.exec(s);
      if (m) {
        if (!best || rule.len > best.len) {
          best = { id: rule.id, len: rule.len, index: m.index };
        } else if (rule.len === best.len && m.index < best.index) {
          best = { id: rule.id, len: rule.len, index: m.index };
        }
      }
    }
    return best ? best.id : null;
  }

  root.PGRE.conceptSearch = {
    build: build,
    matchSession: matchSession,
    matchGallery: matchGallery,
    matchTeach: matchTeach
  };
})();
