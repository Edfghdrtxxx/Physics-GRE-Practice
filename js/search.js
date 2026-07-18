/* Search engine — one box across the whole studio (feature #9, #/search).
   Builds a lazy, in-memory index over every corner of the app: questions
   (incl. sample-exam ones), the mistake book, formula cards, imported book
   sections and personal notes. The index is built on first use and cached
   until invalidate() — nothing is persisted, so the banks and IndexedDB are
   re-read fresh on every rebuild. All searchable text is run through plain()
   first, which strips HTML tags and reduces LaTeX to its bare letters, so
   `$\frac{v^2}{R}$` is findable as "v 2 R". The view (js/view-search.js) owns
   the input, grouping and rendering; this module owns the index and matching. */
window.PGRE = window.PGRE || {};

PGRE.search = (function () {
  var index = null;     // cached entries[] once built (until invalidate())
  var building = null;  // in-flight build promise, so concurrent calls share it

  /* Result groups, in display order. */
  var KINDS = [
    { key: 'question', label: 'Questions' },
    { key: 'exam',     label: 'Sample-exam questions' },
    { key: 'mistake',  label: 'Mistakes' },
    { key: 'formula',  label: 'Formula cards' },
    { key: 'book',     label: 'Book sections' },
    { key: 'note',     label: 'Notes' }
  ];

  /* Reduce an authored HTML + LaTeX string to plain searchable text: drop tags,
     decode the handful of entities the bank uses, strip $…$ / $$…$$ delimiters
     and LaTeX command names (\frac, \mathrm …), then the leftover TeX / markdown
     punctuation — leaving only words and numbers. */
  function plain(s) {
    if (s == null) return '';
    return String(s)
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
      .replace(/\${1,2}/g, ' ')             // inline & display math delimiters
      .replace(/\\[a-zA-Z]+/g, ' ')         // LaTeX command names
      .replace(/[\\{}^_~`#*>|[\]]/g, ' ')   // leftover TeX / markdown markers
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* One index entry. `text` is the display haystack the snippet window is cut
     from; `hay` is the same, pre-lowercased, that matching runs against. */
  function entry(kind, id, title, body, topic, href) {
    title = title || '';
    body = body || '';
    return {
      kind: kind, id: id, title: title, body: body, topic: topic || null, href: href,
      text: title + (body ? ' — ' + body : ''),
      hay: (title + ' ' + body).toLowerCase()
    };
  }

  function buildQuestions(out) {
    PGRE.allQuestions({ includeExam: true }).forEach(function (q) {
      // intact released ETS exams stay out of the index — they must stay
      // fresh for verbatim replay (CLAUDE.md spoiler rule); the book's
      // sample exams remain searchable under the 'exam' group as before
      if (q.src === 'ets-exam') return;
      var choices = (q.choices || []).map(plain).join(' · ');
      var kind = q.src === 'cpg-exam' ? 'exam' : 'question';
      out.push(entry(kind, q.id, plain(q.q),
        choices + ' ' + plain(q.sol), q.topic, '#/topic/' + q.topic));
    });
  }

  function buildMistakes(out) {
    PGRE.srs.mistakeEntries().forEach(function (e) {
      var q = e.q, mk = e.mk;
      var picks = (mk.wrongPicks || []).map(function (idx) {
        return plain((q.choices || [])[idx]);
      }).filter(Boolean).join(' · ');
      out.push(entry('mistake', q.id, plain(q.q),
        picks ? 'wrong picks ' + picks : '', q.topic, '#/mistakes'));
    });
  }

  function buildFormulas(out, cards) {
    (cards || []).forEach(function (c) {
      if (!c) return;
      var front = plain(c.front), back = plain(c.back);
      // The title must go through plain() like every other field — a card name
      // (or a book card's tag) can carry raw $…$ LaTeX that would otherwise show
      // verbatim in the result heading.
      var name = plain(c.name || c.tag);
      out.push(entry('formula', c.id, name || front,
        (name ? front + ' ' : '') + back + ' ' + plain(c.note), c.topic, '#/formulas'));
    });
  }

  function buildBook(out, files) {
    (files || []).forEach(function (f) {
      if (!f || f.kind === 'formula-deck') return;   // the deck shares the store
      (f.chapters || []).forEach(function (ch, i) {
        var topic = (f.mapping && f.mapping[i]) || null;
        out.push(entry('book', f.id + ':' + i, ch.title, plain(ch.text),
          topic, topic ? '#/topic/' + topic : '#/library'));
      });
    });
  }

  function buildNotes(out) {
    var notes = PGRE.notes.all().notes;
    for (var qid in notes) {
      if (!notes.hasOwnProperty(qid)) continue;
      var q = PGRE.questionById(qid);
      out.push(entry('note', qid, plain(notes[qid].text),
        q ? plain(q.q) : '', q ? q.topic : null, '#/notes'));
    }
  }

  /* Assemble the full index. Questions, mistakes and notes are synchronous; the
     formula deck and imported book sections live in IndexedDB, so the whole
     build resolves through a promise. Cached after the first successful build. */
  function buildIndex() {
    if (index) return Promise.resolve(index);
    if (building) return building;
    building = Promise.all([
      PGRE.contentDB.all().catch(function () { return []; }),
      PGRE.formulaDeck().catch(function () { return []; })
    ]).then(function (res) {
      var out = [];
      buildQuestions(out);
      buildMistakes(out);
      buildFormulas(out, res[1]);
      buildBook(out, res[0]);
      buildNotes(out);
      index = out;
      building = null;
      return index;
    });
    return building;
  }

  function invalidate() { index = null; building = null; }

  /* ——— Matching ——— */

  function terms(qstr) {
    return String(qstr || '').toLowerCase().split(/\s+/).filter(function (t) {
      return t.length > 0;
    });
  }

  function escRe(t) { return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  /* A window of ±60 characters around the earliest matched term, with every
     term <mark>ed and all surrounding text escaped, so nothing that isn't a
     match can inject HTML. */
  function snippet(text, ts) {
    var lc = text.toLowerCase(), pos = -1, mlen = 0;
    ts.forEach(function (t) {
      var p = lc.indexOf(t);
      if (p !== -1 && (pos === -1 || p < pos)) { pos = p; mlen = t.length; }
    });
    if (pos === -1) pos = 0;
    var start = Math.max(0, pos - 60);
    var end = Math.min(text.length, pos + mlen + 60);
    var win = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
    var re = new RegExp('(' + ts.map(escRe).join('|') + ')', 'gi');
    var out = '', last = 0, m;
    while ((m = re.exec(win)) !== null) {
      out += PGRE.ui.esc(win.slice(last, m.index)) + '<mark>' + PGRE.ui.esc(m[0]) + '</mark>';
      last = m.index + m[0].length;
      if (m.index === re.lastIndex) re.lastIndex++;   // never loop on a zero-length hit
    }
    return out + PGRE.ui.esc(win.slice(last));
  }

  /* Rank: a term in the title outweighs one only in the body; more terms
     present ranks higher. */
  function score(e, ts) {
    var tl = e.title.toLowerCase(), s = 0;
    ts.forEach(function (t) {
      if (tl.indexOf(t) !== -1) s += 3;
      if (e.hay.indexOf(t) !== -1) s += 1;
    });
    return s;
  }

  /* Run a query against an already-built index — AND across terms (every term
     must appear). Returns the matching hits (each with its snippet), sorted by
     score, plus the total and the wall-clock match time in ms. */
  function match(idx, qstr) {
    var t0 = (window.performance && performance.now) ? performance.now() : Date.now();
    var ts = terms(qstr), hits = [];
    if (ts.length) {
      idx.forEach(function (e) {
        for (var i = 0; i < ts.length; i++) {
          if (e.hay.indexOf(ts[i]) === -1) return;   // AND — every term required
        }
        hits.push({ entry: e, snippet: snippet(e.text, ts), score: score(e, ts) });
      });
      hits.sort(function (a, b) { return b.score - a.score; });
    }
    var t1 = (window.performance && performance.now) ? performance.now() : Date.now();
    return { hits: hits, total: hits.length, ms: Math.max(0, t1 - t0) };
  }

  function stats(idx) {
    var by = {};
    KINDS.forEach(function (k) { by[k.key] = 0; });
    idx.forEach(function (e) { by[e.kind] = (by[e.kind] || 0) + 1; });
    return { total: idx.length, byKind: by };
  }

  return {
    KINDS: KINDS,
    plain: plain,
    buildIndex: buildIndex,
    invalidate: invalidate,
    match: match,
    stats: stats
  };
})();
