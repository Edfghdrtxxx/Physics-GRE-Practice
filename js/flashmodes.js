/* Extra flashcard study modes for the formula portal (#/formulas) — the game
   logic behind the Match / Type / Quiz tabs. The view wiring, the mode tabs and
   the original flip-card "Study" mode live in js/view-formulas.js, which loads
   this file on demand and hands each game a small context:
     { el, cards, deck?, onReplay, onExit }
   Each start* returns a controller { onKey(e), stop() } so the view can route
   keystrokes and tear the game down on a mode switch or a route change.

   Card format is the formula-deck card (js/data-formulas.js):
     { id, topic, name, front, back, note, aliases? }
   All formula strings are LaTeX in $...$; the view calls PGRE.typesetMath after
   every render. Grades run through the SAME SM-2 path the flip mode uses
   (PGRE.srs.gradeCard); XP is awarded quietly through the formula-review hook
   (PGRE.gamify.addXP(..., '· formula review', true)), matching Study mode. */
window.PGRE = window.PGRE || {};

PGRE.flashmodes = (function () {
  var MAX_MATCH_PAIRS = 6; // a 2×N Match grid never exceeds N = 6 pairs
  var SESSION_CAP = 12;     // Type/Quiz run a bounded round, not the whole deck

  // F4: Type mode grades on the full Again/Hard/Good/Easy scale (keys 1–4), the
  // same order Study uses. Games commit gradeCard directly — no learning steps.
  var GRADES = [
    { key: 'again', label: 'Again', hint: '1' },
    { key: 'hard',  label: 'Hard',  hint: '2' },
    { key: 'good',  label: 'Good',  hint: '3' },
    { key: 'easy',  label: 'Easy',  hint: '4' }
  ];

  /* ——— Small shared helpers ——— */
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  /* mm:ss for a minute or more, tenths of a second below that. */
  function fmtTime(ms) {
    var s = ms / 1000;
    if (s < 60) return (Math.round(s * 10) / 10) + ' s';
    var m = Math.floor(s / 60), r = Math.round(s - m * 60);
    if (r === 60) { m++; r = 0; }
    return m + ':' + String(r).padStart(2, '0');
  }

  function formulaHTML(text) {
    return PGRE.formulaTextHTML ? PGRE.formulaTextHTML(text) : (text || '');
  }

  /* Plain-text normalization for the type-to-recall auto-check: peel the common
     LaTeX wrappers, then drop everything that isn't a letter or digit so
     spacing, case and punctuation stop mattering. It only lights an
     is-it-right hint — the user still self-grades, so fuzziness is fine. */
  function normText(s) {
    s = String(s == null ? '' : s);
    s = s.replace(/\$\$?/g, ' ');
    s = s.replace(/\\left|\\right/g, '');
    s = s.replace(/\\[,;:!> ]/g, ' ');
    s = s.replace(/\\(?:text|mathrm|mathbf|mathit|vec|hat|bar|tilde|dot|ddot|operatorname)\s*\{([^}]*)\}/g, '$1');
    s = s.replace(/\\frac\s*\{([^}]*)\}\s*\{([^}]*)\}/g, '($1)/($2)');
    s = s.replace(/\\([a-zA-Z]+)/g, '$1'); // remaining commands keep their name
    s = s.replace(/[{}]/g, '');
    return s.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  /* ——— F6 legend strip + near-miss generation ———
     Book-import backs carry the formula in a leading $$…$$ (or $…$) block, then an
     optional symbol legend ("$x_0$: initial position; …" or "\n$\rho$ = charge
     density"). stripLegend keeps only that leading math block (wrapper intact) so
     an option shows the formula alone. Display-only: Quiz grading stays index-based. */
  function stripLegend(back) {
    var s = String(back == null ? '' : back).trim();
    var m = s.match(/^\$\$([\s\S]*?)\$\$/);
    if (m) return '$$' + m[1] + '$$';
    m = s.match(/^\$([\s\S]*?)\$/);
    if (m) return '$' + m[1] + '$';
    return s;
  }

  /* Peel the $$…$$ / $…$ wrapper off a formula-only string → { inner, display }. */
  function mathInner(s) {
    s = String(s == null ? '' : s).trim();
    var m = s.match(/^\$\$([\s\S]*)\$\$$/);
    if (m) return { inner: m[1], display: true };
    m = s.match(/^\$([\s\S]*)\$$/);
    if (m) return { inner: m[1], display: false };
    return { inner: s, display: true };
  }

  /* Does a wrapped math string render without a KaTeX parse error? When KaTeX is
     unavailable we can't verify, so we don't block (return true). */
  function katexOK(wrapped) {
    if (!window.katex || !window.katex.renderToString) return true;
    var mi = mathInner(wrapped);
    try { window.katex.renderToString(mi.inner, { throwOnError: true, displayMode: mi.display }); return true; }
    catch (e) { return false; }
  }

  /* Brace-depth of position `idx` (count of unmatched "{" before it). */
  function depthAt(s, idx) {
    var depth = 0;
    for (var i = 0; i < idx && i < s.length; i++) {
      if (s[i] === '{') depth++;
      else if (s[i] === '}' && depth) depth--;
    }
    return depth;
  }

  /* Positions of any of `chars` at brace depth 0 (never inside {}). */
  function topLevelIndices(s, chars) {
    var depth = 0, out = [];
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (ch === '{') depth++;
      else if (ch === '}') { if (depth) depth--; }
      else if (depth === 0 && chars.indexOf(ch) !== -1) out.push(i);
    }
    return out;
  }

  /* Read a brace group starting at s[i] === '{' → { body, end } (end past the "}"). */
  function readGroup(s, i) {
    if (s[i] !== '{') return null;
    var depth = 0;
    for (var j = i; j < s.length; j++) {
      if (s[j] === '{') depth++;
      else if (s[j] === '}') { depth--; if (depth === 0) return { body: s.slice(i + 1, j), end: j + 1 }; }
    }
    return null;
  }

  /* Swap numerator/denominator of the first TOP-LEVEL \frac{a}{b} → \frac{b}{a}. */
  function swapFrac(inner) {
    var idx = inner.indexOf('\\frac');
    while (idx !== -1) {
      if (depthAt(inner, idx) === 0) {
        var p = idx + 5;
        var a = readGroup(inner, p);
        if (a && inner[a.end] === '{') {
          var b = readGroup(inner, a.end);
          if (b) return inner.slice(0, idx) + '\\frac{' + b.body + '}{' + a.body + '}' + inner.slice(b.end);
        }
      }
      idx = inner.indexOf('\\frac', idx + 1);
    }
    return null;
  }

  /* One variant per match of a global regex (single-substitution near-misses). */
  function eachSwap(inner, re, repl) {
    var out = [], m;
    re.lastIndex = 0;
    while ((m = re.exec(inner)) !== null) {
      var rep = repl(m);
      if (rep != null) out.push(inner.slice(0, m.index) + rep + inner.slice(m.index + m[0].length));
      if (m.index === re.lastIndex) re.lastIndex++;
    }
    return out;
  }

  /* F6: near-miss variants of a formula. Operates on the legend-stripped inner
     LaTeX and re-wraps each variant. Every candidate is brace-depth aware, must
     differ from the original, must render (katexOK), and is normText-deduped
     against the correct string and every earlier variant. */
  function perturbLatex(back) {
    var mi = mathInner(stripLegend(back));
    var inner = mi.inner, wrap = mi.display ? '$$' : '$';
    var cands = [];
    function add(s) { if (s && s !== inner) cands.push(s); }

    // flip a top-level + / -
    topLevelIndices(inner, '+-').forEach(function (i) {
      add(inner.slice(0, i) + (inner[i] === '+' ? '-' : '+') + inner.slice(i + 1));
    });
    // exponent swap: ^2 ↔ ^3 and ^{2} ↔ ^{3}
    eachSwap(inner, /\^([23])(?![0-9{}])/g, function (m) {
      return '^' + (m[1] === '2' ? '3' : '2');
    }).forEach(add);
    eachSwap(inner, /\^\{([23])\}/g, function (m) {
      return '^{' + (m[1] === '2' ? '3' : '2') + '}';
    }).forEach(add);
    // insert or remove a \frac{1}{2} factor
    if (inner.indexOf('\\frac{1}{2}') !== -1) {
      add(inner.replace('\\frac{1}{2}', ''));
    } else {
      var eq = topLevelIndices(inner, '=');
      if (eq.length) add(inner.slice(0, eq[0] + 1) + ' \\frac{1}{2}' + inner.slice(eq[0] + 1));
      else add('\\frac{1}{2}' + inner);
    }
    // 2\pi ↔ \pi
    if (inner.indexOf('2\\pi') !== -1) add(inner.replace('2\\pi', '\\pi'));
    else if (inner.indexOf('\\pi') !== -1) add(inner.replace('\\pi', '2\\pi'));
    // swap a top-level fraction's numerator/denominator
    add(swapFrac(inner));
    // \sin ↔ \cos
    if (inner.indexOf('\\sin') !== -1) add(inner.replace('\\sin', '\\cos'));
    if (inner.indexOf('\\cos') !== -1) add(inner.replace('\\cos', '\\sin'));

    var seen = {}, correctN = normText(wrap + inner + wrap);
    seen[correctN] = 1;
    var out = [];
    cands.forEach(function (c) {
      var wrapped = wrap + c + wrap, n = normText(wrapped);
      if (!n || seen[n]) return;         // differ from correct + each other
      if (!katexOK(wrapped)) return;     // never emit broken math
      seen[n] = 1; out.push(wrapped);
    });
    return out;
  }

  function acceptSet(c) {
    var out = [normText(c.back), normText(stripLegend(c.back))];
    if (c.answer) out.push(normText(c.answer));
    if (c.aliases && c.aliases.length) {
      c.aliases.forEach(function (a) { out.push(normText(a)); });
    }
    if (c.alts && c.alts.length) {           // F4: optional accepted alternatives
      c.alts.forEach(function (a) { out.push(normText(a)); });
    }
    return out.filter(function (x) { return x; });
  }

  /* Card heading: hand-authored cards carry a `name`, book-import cards a `tag`
     (SPEC bank contract — real formula cards have no `name`). Fall back through
     both so a heading never renders the literal string "undefined". */
  function cardName(c) { return (c && (c.name || c.tag)) || ''; }

  /* ——— Best-time store (Match) ———
     Kept under state.flags.matchBest, keyed by pair count so a 6-pair game and a
     4-pair game never compete. flags is an existing top-level object, so this
     survives save/load and store.migrate() (which only fills missing top-level
     keys) leaves it untouched — no store.js change needed. Times are ms. */
  function matchBest(pairs) {
    var f = PGRE.store.state.flags.matchBest;
    var v = f && f[String(pairs)];
    return typeof v === 'number' ? v : null;
  }

  function matchBestSet(pairs, ms) {
    var s = PGRE.store.state;
    if (!s.flags.matchBest) s.flags.matchBest = {};
    var key = String(pairs), cur = s.flags.matchBest[key];
    if (typeof cur !== 'number' || ms < cur) {
      s.flags.matchBest[key] = ms;
      PGRE.store.save();
      return true; // new best
    }
    return false;
  }

  /* ——— Shared card/XP hooks (mirror the flip mode) ——— */

  /* One graded review → the same SM-2 scheduler the flip mode calls, plus the
     study-day/streak touch. Save is left to the caller's flow. */
  function reviewCard(id, grade) {
    PGRE.srs.gradeCard(id, grade);
    PGRE.store.touchDay();
    PGRE.store.save();
  }

  /* Quiet, session-end XP through the formula-review hook (+2 per card/pair),
     logged into the activity feed just like a flip session. */
  function awardReviewXP(xp, detail) {
    if (xp > 0) PGRE.gamify.addXP(xp, '· formula review', true);
    PGRE.store.log('review', detail, xp);
    PGRE.gamify.checkAchievements();
    PGRE.store.save();
  }

  function onFormulasRoute() { return /^#\/formulas/.test(location.hash); }

  /* ——— Queue pickers ——— */

  /* Type/Quiz: today's remaining batch first; if it's empty, drill ONLY cards
     the user has already met (SRS state), never the full deck — games must not
     introduce never-studied cards behind the daily cap/picker. Capped. */
  function pickQueue(deck) {
    var pool = PGRE.srs.formulaDayRemaining(deck);
    if (!pool.length) {
      pool = deck.filter(function (c) { return PGRE.srs.cardState(c.id) && !PGRE.srs.isSuspended(c.id); });
    }
    return shuffle(pool).slice(0, Math.min(SESSION_CAP, pool.length));
  }

  /* Match: up to 6 pairs — today's remaining batch first, then the most recently
     reviewed studied cards. Never a never-studied card from outside the batch. */
  function pickMatchCards(deck) {
    var remaining = PGRE.srs.formulaDayRemaining(deck), inSet = {};
    remaining.forEach(function (c) { inSet[c.id] = 1; });
    var studied = deck.filter(function (c) {
      return !inSet[c.id] && PGRE.srs.cardState(c.id) && !PGRE.srs.isSuspended(c.id);
    });
    studied.sort(function (a, b) {
      var sa = PGRE.srs.cardState(a.id), sb = PGRE.srs.cardState(b.id);
      var ta = (sa && sa.lastReviewedAt) || '', tb = (sb && sb.lastReviewedAt) || '';
      return ta < tb ? 1 : ta > tb ? -1 : 0;
    });
    var pool = shuffle(remaining).concat(studied);
    // two equation numbers can share one formula text — identical tiles would
    // force a blind 50/50 pick, so keep only the first card per formula
    var seen = {};
    pool = pool.filter(function (c) {
      var k = normText(stripLegend(c.back));
      if (!k) return true;
      if (seen[k]) return false;
      seen[k] = 1;
      return true;
    });
    return pool.slice(0, Math.min(MAX_MATCH_PAIRS, pool.length));
  }

  /* ——— Match: timed prompt ↔ formula pairing ——— */
  function startMatch(ctx) {
    var el = ctx.el;
    var cards = ctx.cards || [];
    var st = { tiles: [], selected: [], cleared: 0, total: cards.length,
               locked: false, done: false, settled: false,
               start: Date.now(), timer: null };

    cards.forEach(function (c) {
      st.tiles.push({ id: c.id, kind: 'prompt',
        html: c.front ? formulaHTML(c.front) : PGRE.ui.esc(cardName(c)) });
      st.tiles.push({ id: c.id, kind: 'formula', html: formulaHTML(c.back) });
    });
    st.tiles = shuffle(st.tiles);

    /* Credit +2 XP per cleared pair, exactly once. finish() settles a full game;
       stop() settles a partially-cleared game abandoned via "Back to deck", a mode
       switch, or a route change (0 pairs cleared records nothing). */
    function settle(elapsed) {
      if (st.settled || st.cleared === 0) return;
      st.settled = true;
      awardReviewXP(2 * st.cleared, 'Match: ' + st.cleared + ' pair' +
        (st.cleared === 1 ? '' : 's') + ' in ' + fmtTime(elapsed));
    }

    function stop() {
      if (st.timer) { clearInterval(st.timer); st.timer = null; }
      if (!st.done) settle(Date.now() - st.start);
    }

    function tile(i) { return el.querySelector('[data-tile="' + i + '"]'); }

    function tick() {
      if (!onFormulasRoute()) { stop(); return; }
      var t = document.getElementById('flash-timer');
      if (t) t.textContent = fmtTime(Date.now() - st.start);
    }

    function updateHud() {
      var c = document.getElementById('flash-cleared');
      if (c) c.textContent = st.cleared + ' / ' + st.total + ' paired';
    }

    function render() {
      var grid = '';
      st.tiles.forEach(function (t, idx) {
        grid += '<button class="flash-tile" data-tile="' + idx + '">' +
          '<span class="flash-tile-kind">' + (t.kind === 'prompt' ? 'Prompt' : 'Formula') + '</span>' +
          '<span class="flash-tile-body">' + t.html + '</span></button>';
      });
      el.innerHTML = '<div class="card">' +
        '<div class="flash-hud"><span class="flash-title">Match · ' + st.total + ' pairs</span>' +
          '<span class="chip" id="flash-cleared">0 / ' + st.total + ' paired</span>' +
          '<span class="flash-timer" id="flash-timer">0 s</span></div>' +
        '<div class="flash-grid" id="flash-grid">' + grid + '</div>' +
        '<div class="btn-row"><button class="btn btn-ghost" id="flash-exit">Back to deck</button></div>' +
        '</div>';
      PGRE.typesetMath(el);
      el.querySelectorAll('.flash-tile').forEach(function (b) {
        b.addEventListener('click', function () {
          onPick(parseInt(b.getAttribute('data-tile'), 10));
        });
      });
      var x = document.getElementById('flash-exit');
      if (x) x.addEventListener('click', ctx.onExit);
      st.start = Date.now();
      st.timer = setInterval(tick, 100);
    }

    function onPick(idx) {
      if (st.locked || st.done) return;
      var t = st.tiles[idx];
      if (!t || t.matched) return;
      var pos = st.selected.indexOf(idx);
      if (pos !== -1) { // toggle off
        st.selected.splice(pos, 1);
        tile(idx).classList.remove('selected');
        return;
      }
      tile(idx).classList.add('selected');
      st.selected.push(idx);
      if (st.selected.length < 2) return;

      var iA = st.selected[0], iB = st.selected[1];
      var a = st.tiles[iA], b = st.tiles[iB];
      st.selected = [];
      if (a.id === b.id && a.kind !== b.kind) {
        a.matched = b.matched = true;
        [iA, iB].forEach(function (i) {
          var elm = tile(i);
          elm.classList.remove('selected');
          elm.classList.add('matched');
          elm.disabled = true;
        });
        st.cleared++;
        PGRE.store.touchDay();
        updateHud();
        if (st.cleared === st.total) finish();
      } else {
        st.locked = true;
        [iA, iB].forEach(function (i) {
          var elm = tile(i);
          elm.classList.add('bad', 'flash-tile-shake');
        });
        setTimeout(function () {
          [iA, iB].forEach(function (i) {
            var elm = tile(i);
            if (elm) elm.classList.remove('selected', 'bad', 'flash-tile-shake');
          });
          st.locked = false;
        }, 600);
      }
    }

    function finish() {
      st.done = true;   // set before stop() so stop() defers settling to us
      stop();
      var elapsed = Date.now() - st.start;
      var improved = matchBestSet(st.total, elapsed);
      var xp = 2 * st.cleared;
      settle(elapsed);
      var best = matchBest(st.total);
      var tail = improved ? ' · new best time' :
        (best != null ? ' · best ' + fmtTime(best) : '');
      el.innerHTML = '<div class="card">' +
        '<h2>Cleared</h2>' +
        '<div class="summary-score">' + fmtTime(elapsed) +
          '<span class="summary-pct">+' + xp + ' XP</span></div>' +
        '<p class="muted">' + st.total + ' pair' + (st.total === 1 ? '' : 's') + tail + '.</p>' +
        '<div class="btn-row"><button class="btn btn-primary" id="flash-replay">Play again</button>' +
        '<button class="btn btn-ghost" id="flash-exit">Back to deck</button></div></div>';
      document.getElementById('flash-replay').addEventListener('click', ctx.onReplay);
      document.getElementById('flash-exit').addEventListener('click', ctx.onExit);
    }

    render();
    return { onKey: function () {}, stop: stop };
  }

  /* ——— Type-to-recall ——— */
  function startType(ctx) {
    var el = ctx.el;
    // F1b: st.undo holds the LAST committed grade (one level, cleared at round end):
    //   { id, day, prevState (deep copy or null), prevDone, prevAgain }.
    var st = { queue: ctx.cards || [], i: 0, done: 0, again: 0, submitted: false,
               revealAt: 0, defaultGrade: 'good', undo: null, settled: false };

    function renderPrompt() {
      var c = st.queue[st.i];
      var nm = cardName(c);
      var undoLink = st.undo ?               // F1b: ghost undo of the previous card
        '<button class="btn btn-ghost btn-sm flash-undo-link" id="flash-undo">Undo last</button>' : '';
      el.innerHTML = '<div class="card">' +
        '<div class="flash-hud"><span class="flash-title">Type-to-recall</span>' +
          '<span class="chip">' + (st.i + 1) + ' / ' + st.queue.length + '</span>' +
          undoLink + '</div>' +
        PGRE.ui.meter(100 * st.i / st.queue.length, 'meter-thin') +
        (nm ? '<div class="fcard-name">' + PGRE.ui.esc(nm) + '</div>' : '') +
        '<div class="flash-type-prompt">' + formulaHTML(c.front || 'Recall the formula.') + '</div>' +
        '<input class="flash-type-input" id="flash-input" type="text" autocomplete="off" ' +
          'spellcheck="false" placeholder="Type the formula, then press Enter">' +
        '<div class="btn-row">' +
          '<button class="btn btn-primary" id="flash-submit">Check <span class="key-hint">enter</span></button>' +
          '<button class="btn btn-ghost" id="flash-reveal-btn">Reveal</button></div>' +
        '<div id="flash-reveal"></div></div>';
      PGRE.typesetMath(el);
      var inp = document.getElementById('flash-input');
      inp.focus();
      inp.addEventListener('keydown', function (e) {
        // ignore OS auto-repeat from a held Enter — it must not chain-submit
        if (e.key === 'Enter') { e.preventDefault(); if (!e.repeat) submit(); }
      });
      document.getElementById('flash-submit').addEventListener('click', submit);
      document.getElementById('flash-reveal-btn').addEventListener('click', submit);
      var ub = document.getElementById('flash-undo');
      if (ub) ub.addEventListener('click', undoLast);
    }

    function submit() {
      if (st.submitted) return;
      st.submitted = true;
      var c = st.queue[st.i];
      var inp = document.getElementById('flash-input');
      var typed = inp ? inp.value : '';
      var norm = normText(typed);
      var hit = norm !== '' && acceptSet(c).indexOf(norm) !== -1;
      if (inp) inp.disabled = true;
      var sub = document.getElementById('flash-submit');
      var rev = document.getElementById('flash-reveal-btn');
      if (sub) sub.disabled = true;
      if (rev) rev.disabled = true;

      // F4: auto-check is now just a verdict line; the user grades on the full
      // Again/Hard/Good/Easy scale with the auto-check result preselected
      // (matched → Good, no match → Again). Enter confirms the highlighted default.
      st.defaultGrade = hit ? 'good' : 'again';
      var gradesHtml = '';
      GRADES.forEach(function (g) {
        gradesHtml += '<button class="btn grade-btn grade-' + g.key +
          (g.key === st.defaultGrade ? ' is-default' : '') + '" data-grade="' + g.key + '">' +
          g.label + '<span class="key-hint">' + g.hint + '</span></button>';
      });
      var box = document.getElementById('flash-reveal');
      box.innerHTML =
        '<div class="flash-auto ' + (hit ? 'is-hit' : 'is-miss') + '">' +
          '<span class="fb-icon">' + (hit ? '✓' : '≈') + '</span>' +
          '<span>Auto-check: ' + (hit ? 'matched' : 'no match') + '</span></div>' +
        '<div class="flash-compare">' +
          '<div class="flash-compare-col"><div class="flash-compare-label">You typed</div>' +
            '<div class="flash-compare-body">' +
              (typed && typed.trim() ? PGRE.ui.esc(typed) : '<span class="muted">(blank)</span>') +
            '</div></div>' +
          '<div class="flash-compare-col is-real"><div class="flash-compare-label">Answer</div>' +
            '<div class="flash-compare-body">' + formulaHTML(c.back) +
              (c.note ? '<div class="fcard-note">' + formulaHTML(c.note) + '</div>' : '') + '</div></div>' +
        '</div>' +
        '<div class="btn-row">' + gradesHtml + '</div>';
      PGRE.typesetMath(box);
      box.querySelectorAll('[data-grade]').forEach(function (b) {
        b.addEventListener('click', function () { grade(b.getAttribute('data-grade')); });
      });
      // Grade only on an explicit click or the 1/2 keys — never autofocus a grade
      // button, or an Enter still held from submitting would activate it and
      // self-grade "Close enough". Drop focus and start a short key-guard so a
      // bounced key right after reveal can't grade either.
      st.revealAt = Date.now();
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    }

    /* Games commit gradeCard directly through reviewCard — no learning steps
       (those live in Study mode only). */
    function grade(g) {
      if (!st.submitted) return;
      var c = st.queue[st.i], id = c.id;
      var prev = PGRE.store.state.cards[id];
      st.undo = { id: id, day: PGRE.srs.today(),
                  prevState: prev ? JSON.parse(JSON.stringify(prev)) : null,
                  prevDone: st.done, prevAgain: st.again };
      reviewCard(id, g);
      st.done++;
      if (g === 'again') st.again++;
      st.i++;
      st.submitted = false;
      if (st.i < st.queue.length) renderPrompt();   // undo link rides the next prompt
      else finish();
    }

    /* F1b: revert the last committed grade — restore the card's SRS state, pop the
       matching trailing cardReviews entry, roll back the counters. One level; the
       undone question is not replayed. */
    function undoLast() {
      var u = st.undo;
      if (!u) return;
      if (u.prevState) PGRE.store.state.cards[u.id] = u.prevState;
      else delete PGRE.store.state.cards[u.id];
      var revs = PGRE.store.state.cardReviews;
      if (revs && revs.length) {
        var last = revs[revs.length - 1];
        if (last && last.id === u.id && last.d === u.day) revs.pop();
      }
      st.done = u.prevDone;
      st.again = u.prevAgain;
      st.undo = null;
      PGRE.store.save();
      var link = document.getElementById('flash-undo');
      if (link && link.parentNode) link.parentNode.removeChild(link);
    }

    /* Credit +2 XP per graded card exactly once — finish() settles a full
       round, stop() a round abandoned mid-way via a mode switch or a route
       change (0 cards graded records nothing). */
    function settle() {
      if (st.settled || st.done === 0) return;
      st.settled = true;
      awardReviewXP(2 * st.done, 'Type-to-recall: ' + st.done + ' card' + (st.done === 1 ? '' : 's'));
    }

    function finish() {
      settle();
      reviewSummary(el, 'Type-to-recall complete', st.done, st.again, 2 * st.done, ctx);
    }

    renderPrompt();
    return {
      onKey: function (e) {
        if (e.metaKey || e.ctrlKey || e.altKey) return; // browser chords never grade
        if (e.repeat) return;                // a held key confirms at most once
        if (st.i >= st.queue.length) return; // round over: the summary card is showing
        if (st.submitted) {
          // swallow a key that bounced in within 300 ms of the reveal (e.g. an
          // Enter still held from submitting) so it can't self-grade
          if (e.key >= '1' && e.key <= '4') {
            e.preventDefault();
            if (Date.now() - (st.revealAt || 0) < 300) return;
            grade(GRADES[parseInt(e.key, 10) - 1].key);
          } else if (e.key === 'Enter') {           // F4: confirm the highlighted default
            e.preventDefault();
            if (Date.now() - (st.revealAt || 0) < 300) return;
            grade(st.defaultGrade);
          }
        } else if (e.key === 'Enter') {
          e.preventDefault(); submit();
        }
      },
      stop: function () { settle(); }
    };
  }

  /* ——— Auto-quiz: multiple choice from the deck ——— */
  function startQuiz(ctx) {
    var el = ctx.el;
    var deck = ctx.deck || ctx.cards || [];
    // F1b: st.undo holds the LAST committed grade (one level, cleared at round end).
    var st = { queue: ctx.cards || [], i: 0, correct: 0, done: 0,
               streak: 0, best: 0, answered: false, built: null, undo: null,
               settled: false };

    /* F6: options are legend-stripped for display; grading stays index-based.
       Correct formula + up to 3 near-miss perturbations of it; if fewer than 3
       valid variants, fill with SAME-TOPIC other-card backs (legend-stripped),
       then any-topic backs. De-duplicated by normalized text. */
    function buildOptions(card) {
      var correctDisp = stripLegend(card.back), used = {};
      used[normText(correctDisp)] = 1;
      var opts = [correctDisp];
      shuffle(perturbLatex(card.back)).forEach(function (v) {   // near-miss first
        if (opts.length >= 4) return;
        var n = normText(v);
        if (!n || used[n]) return;
        used[n] = 1; opts.push(v);
      });
      function draw(list) {                                     // fall back to real backs
        shuffle(list).forEach(function (o) {
          if (opts.length >= 4 || o.id === card.id) return;
          var disp = stripLegend(o.back), n = normText(disp);
          if (!n || used[n] || !katexOK(disp)) return;
          used[n] = 1; opts.push(disp);
        });
      }
      if (opts.length < 4) draw(deck.filter(function (o) { return o.topic === card.topic; }));
      if (opts.length < 4) draw(deck);
      var shuffled = shuffle(opts);
      return { opts: shuffled, correctIdx: shuffled.indexOf(correctDisp) };
    }

    function render() {
      var c = st.queue[st.i];
      var nm = cardName(c);
      st.built = buildOptions(c);
      var html = '<div class="card">' +
        '<div class="flash-hud"><span class="flash-title">Auto-quiz</span>' +
          '<span class="chip">' + (st.i + 1) + ' / ' + st.queue.length + '</span>' +
          '<span class="flash-streak" id="flash-streak">' +
            (st.streak > 1 ? 'Streak ' + st.streak : '') + '</span></div>' +
        PGRE.ui.meter(100 * st.i / st.queue.length, 'meter-thin') +
        (nm ? '<div class="fcard-name">' + PGRE.ui.esc(nm) + '</div>' : '') +
        '<div class="q-text">' + formulaHTML(c.front || 'Which formula matches?') + '</div>' +
        '<div class="choices">';
      st.built.opts.forEach(function (o, idx) {
        html += '<button class="choice" data-idx="' + idx + '">' +
          '<span class="choice-letter">' + (idx + 1) + '</span>' +
          '<span class="choice-body">' + o + '</span></button>';
      });
      html += '</div><div id="flash-fb"></div></div>';
      el.innerHTML = html;
      PGRE.typesetMath(el);
      el.querySelectorAll('.choice').forEach(function (b) {
        b.addEventListener('click', function () {
          pick(parseInt(b.getAttribute('data-idx'), 10));
        });
      });
    }

    /* Games commit gradeCard directly through reviewCard — no learning steps. */
    function pick(idx) {
      if (st.answered) return;
      st.answered = true;
      var c = st.queue[st.i], correctIdx = st.built.correctIdx;
      var prev = PGRE.store.state.cards[c.id];
      st.undo = { id: c.id, day: PGRE.srs.today(),
                  prevState: prev ? JSON.parse(JSON.stringify(prev)) : null,
                  prevCorrect: st.correct, prevDone: st.done,
                  prevStreak: st.streak, prevBest: st.best };
      var isCorrect = idx === correctIdx;
      if (isCorrect) { st.correct++; st.streak++; if (st.streak > st.best) st.best = st.streak; }
      else { st.streak = 0; }
      reviewCard(c.id, isCorrect ? 'good' : 'again');
      st.done++;

      el.querySelectorAll('.choice').forEach(function (b) {
        var i = parseInt(b.getAttribute('data-idx'), 10);
        b.disabled = true;
        if (i === correctIdx) b.classList.add('is-answer');
        if (i === idx && !isCorrect) b.classList.add('is-wrong');
      });
      var fb = document.getElementById('flash-fb');
      fb.innerHTML =
        '<div class="feedback ' + (isCorrect ? 'feedback-good' : 'feedback-bad') + '">' +
          '<span class="fb-icon">' + (isCorrect ? '✓' : '✗') + '</span>' +
          '<strong>' + (isCorrect ? 'Correct' : 'Not quite — option ' + (correctIdx + 1)) + '</strong>' +
          (isCorrect && st.streak > 1 ? '<span class="fb-xp">Streak ' + st.streak + '</span>' : '') +
          '<button class="btn btn-ghost btn-sm flash-undo-link" id="flash-undo">Undo</button>' +
        '</div>' +
        (c.note ? '<div class="solution"><div class="solution-label">Note</div>' + formulaHTML(c.note) + '</div>' : '') +
        '<div class="btn-row"><button class="btn btn-primary" id="flash-next">' +
          (st.i + 1 < st.queue.length ? 'Next →' : 'Finish') + '</button></div>';
      PGRE.typesetMath(fb);
      var nx = document.getElementById('flash-next');
      nx.addEventListener('click', next);
      nx.focus();
      var ub = document.getElementById('flash-undo');
      if (ub) ub.addEventListener('click', undoLast);
    }

    /* F1b: revert the last committed grade — restore the card's SRS state, pop the
       matching trailing cardReviews entry, roll back score/streak counters. One
       level; the answered question stays on screen (it is not replayed). */
    function undoLast() {
      var u = st.undo;
      if (!u) return;
      if (u.prevState) PGRE.store.state.cards[u.id] = u.prevState;
      else delete PGRE.store.state.cards[u.id];
      var revs = PGRE.store.state.cardReviews;
      if (revs && revs.length) {
        var last = revs[revs.length - 1];
        if (last && last.id === u.id && last.d === u.day) revs.pop();
      }
      st.correct = u.prevCorrect;
      st.done = u.prevDone;
      st.streak = u.prevStreak;
      st.best = u.prevBest;
      st.undo = null;
      PGRE.store.save();
      var link = document.getElementById('flash-undo');
      if (link && link.parentNode) link.parentNode.removeChild(link);
    }

    function next() {
      st.i++;
      st.answered = false;
      if (st.i < st.queue.length) render();
      else finish();
    }

    /* Credit +2 XP per answer exactly once — finish() settles a full round,
       stop() a round abandoned mid-way (0 answers records nothing). */
    function settle() {
      if (st.settled || st.done === 0) return;
      st.settled = true;
      awardReviewXP(2 * st.done, 'Auto-quiz: ' + st.correct + '/' + st.done + ' correct');
    }

    function finish() {
      var total = st.queue.length, xp = 2 * st.done;
      settle();
      var pct = total ? Math.round(100 * st.correct / total) : 0;
      el.innerHTML = '<div class="card"><h2>Quiz complete</h2>' +
        '<div class="summary-score">' + st.correct + ' / ' + total +
          '<span class="summary-pct">' + pct + '%</span></div>' +
        '<p class="muted">Best streak ' + st.best + '. +' + xp + ' XP. ' +
          'Right answers scheduled Good, misses Again.</p>' +
        '<div class="btn-row"><button class="btn btn-primary" id="flash-replay">Again</button>' +
        '<button class="btn btn-ghost" id="flash-exit">Back to deck</button></div></div>';
      document.getElementById('flash-replay').addEventListener('click', ctx.onReplay);
      document.getElementById('flash-exit').addEventListener('click', ctx.onExit);
    }

    render();
    return {
      onKey: function (e) {
        if (e.metaKey || e.ctrlKey || e.altKey) return; // browser chords never answer
        if (st.i >= st.queue.length) return; // round over: the completion card is showing
        if (!st.answered) {
          var n = parseInt(e.key, 10);
          if (n >= 1 && n <= st.built.opts.length) { e.preventDefault(); pick(n - 1); }
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault(); next();
        }
      },
      stop: function () { settle(); }
    };
  }

  /* ——— Cloze mode (bundle 4) ———————————————————————————————————————————
     One top-level term of the formula is blanked to \boxed{?}; the player picks
     the missing token from four KaTeX chips. Generation is conservative — a card
     with no safe candidate (or whose boxed render throws) is simply skipped, never
     garbled. Grades commit gradeCard directly, like the other games — no learning
     steps (those are Study-only). */
  var CLOZE_CAP = 12;                       // a cloze round never exceeds 12 cards
  var CLOZE_FUNCS = ['sin', 'cos', 'tan', 'exp', 'ln', 'log'];

  /* Purely-numeric, short body — the only \frac{p}{q} shapes we blank (so a
     perturbation stays a clean coefficient-style fraction, never a garbled one). */
  function clozeSmallNum(body) { return /^[0-9]{1,2}$/.test(body); }

  /* Scan a top-level LaTeX segment (brace-depth aware) for blank candidates.
     Positions are relative to `s`. Categories: coef (integer/decimal), frac
     (small numeric \frac), exp (exponent — token is the CONTENT, replacement
     re-wraps as ^{\boxed{?}}), pi (\pi or n\pi), func (\sin…\log), sign (top-level
     ± — kept per spec, but four distinct chips can't form from it so it self-skips
     during option building). Subscript arguments are skipped so their digits are
     never mistaken for coefficients. */
  function clozeCandidates(s) {
    var cands = [], i = 0, n = s.length, depth = 0;
    while (i < n) {
      var ch = s[i];
      if (ch === '{') { depth++; i++; continue; }
      if (ch === '}') { if (depth) depth--; i++; continue; }
      if (depth !== 0) { i++; continue; }
      if (ch >= '0' && ch <= '9') {                 // coefficient, maybe n\pi
        var j = i + 1;
        while (j < n && ((s[j] >= '0' && s[j] <= '9') || s[j] === '.')) j++;
        if (s[j - 1] === '.') j--;                  // trailing dot isn't part of it
        if (s.substr(j, 3) === '\\pi') {
          cands.push({ start: i, end: j + 3, token: s.slice(i, j + 3), cat: 'pi' });
          i = j + 3; continue;
        }
        cands.push({ start: i, end: j, token: s.slice(i, j), cat: 'coef' });
        i = j; continue;
      }
      if (ch === '^') {                             // exponent: ^{...} or ^X
        if (s[i + 1] === '{') {
          var g = readGroup(s, i + 1);
          if (g && g.body.length <= 4 && g.body.length >= 1) {
            cands.push({ start: i, end: g.end, token: g.body, cat: 'exp' });
            i = g.end; continue;
          }
          i = g ? g.end : i + 1; continue;
        }
        var c2 = s[i + 1];
        if (c2 && /[0-9a-zA-Z]/.test(c2)) {
          cands.push({ start: i, end: i + 2, token: c2, cat: 'exp' });
          i += 2; continue;
        }
        i++; continue;
      }
      if (ch === '_') {                             // subscript — skip its argument
        if (s[i + 1] === '{') { var gs = readGroup(s, i + 1); i = gs ? gs.end : i + 1; }
        else i += 2;
        continue;
      }
      if (ch === '\\') {                            // command
        var m = /^\\([a-zA-Z]+)/.exec(s.slice(i));
        if (m) {
          var name = m[1];
          if (name === 'frac') {
            var a = readGroup(s, i + 5);
            if (a && s[a.end] === '{') {
              var b = readGroup(s, a.end);
              if (b) {
                if (clozeSmallNum(a.body) && clozeSmallNum(b.body)) {
                  cands.push({ start: i, end: b.end, token: s.slice(i, b.end), cat: 'frac' });
                }
                i = b.end; continue;
              }
            }
            i += 5; continue;
          }
          if (name === 'pi') {
            cands.push({ start: i, end: i + 3, token: '\\pi', cat: 'pi' });
            i += 3; continue;
          }
          if (CLOZE_FUNCS.indexOf(name) !== -1) {
            cands.push({ start: i, end: i + 1 + name.length, token: '\\' + name, cat: 'func' });
            i += 1 + name.length; continue;
          }
          i += 1 + name.length; continue;           // other command: skip its name
        }
        i++; continue;
      }
      if (ch === '+' || ch === '-') {
        cands.push({ start: i, end: i + 1, token: ch, cat: 'sign' });
        i++; continue;
      }
      i++;
    }
    return cands;
  }

  /* stripLegend → mathInner → scan the side after the FIRST top-level '=' (else the
     whole expression). Returns null when there's nothing to scan. */
  function clozeParts(back) {
    var mi = mathInner(stripLegend(back));
    var inner = mi.inner;
    if (!inner || !inner.trim()) return null;
    var eqs = topLevelIndices(inner, '=');
    var offset = eqs.length ? eqs[0] + 1 : 0;
    return { mi: mi, offset: offset, cands: clozeCandidates(inner.slice(offset)) };
  }

  /* Token-scale near-misses (bundle 3 rules dropped to a single token). Strings are
     option chips: full tokens for coef/frac/pi/func/sign, bare CONTENT for exp. */
  function clozeDistractors(cat, tok) {
    var out = [];
    if (cat === 'coef') {
      var v = Number(tok);
      if (!isNaN(v)) {
        [v + 1, v - 1, v * 2, v + 2, v + 3].forEach(function (x) { if (x > 0 && x !== v) out.push(String(x)); });
        out.push('\\frac{1}{2}'); out.push('2');
      }
    } else if (cat === 'exp') {
      ['2', '3', '4', '1/2', 'n'].forEach(function (x) { out.push(x); });
    } else if (cat === 'frac') {
      var fm = /^\\frac\{([0-9]{1,2})\}\{([0-9]{1,2})\}$/.exec(tok);
      if (fm) {
        var a = fm[1], b = fm[2], an = Number(a), bn = Number(b);
        if (a !== b) out.push('\\frac{' + b + '}{' + a + '}');
        out.push('\\frac{' + a + '}{' + (bn + 1) + '}');
        if (bn > 1) out.push('\\frac{' + a + '}{' + (bn - 1) + '}');
        out.push('\\frac{' + (an + 1) + '}{' + b + '}');
        out.push(a);
      }
    } else if (cat === 'pi') {
      ['\\pi', '2\\pi', '\\frac{\\pi}{2}', '4\\pi', '\\pi^2'].forEach(function (x) { out.push(x); });
    } else if (cat === 'func') {
      ['\\sin', '\\cos', '\\tan', '\\exp', '\\ln', '\\log'].forEach(function (x) { out.push(x); });
    } else if (cat === 'sign') {
      ['+', '-'].forEach(function (x) { out.push(x); });
    }
    return out;
  }

  /* Same-category tokens harvested from the whole deck — the fallback pool when a
     token's own perturbations can't reach four chips. Deduped by normText, bounded. */
  function clozeHarvest(deck) {
    var h = { coef: [], frac: [], exp: [], pi: [], func: [], sign: [] };
    var seen = { coef: {}, frac: {}, exp: {}, pi: {}, func: {}, sign: {} };
    deck.forEach(function (c) {
      var parts = clozeParts(c.back);
      if (!parts) return;
      parts.cands.forEach(function (cd) {
        var n = normText(cd.token);
        if (!n || seen[cd.cat][n] || h[cd.cat].length >= 60) return;
        seen[cd.cat][n] = 1; h[cd.cat].push(cd.token);
      });
    });
    return h;
  }

  /* Build a playable cloze for one card, or null when none of its candidates yields
     four distinct KaTeX-valid chips (and a boxed formula that renders). Tries every
     candidate in a shuffled order, so a card is "not cloze-able" only when nothing
     works — a stable decision the pool filter and the round agree on. */
  function buildCloze(card, harvest) {
    var parts = clozeParts(card.back);
    if (!parts || !parts.cands.length) return null;
    var mi = parts.mi, off = parts.offset, inner = mi.inner, wrap = mi.display ? '$$' : '$';
    var cands = shuffle(parts.cands);
    for (var ci = 0; ci < cands.length; ci++) {
      var cand = cands[ci], isExp = cand.cat === 'exp';
      var repl = isExp ? '^{\\boxed{\\,?\\,}}' : '\\boxed{\\,?\\,}';
      var boxedWrapped = wrap + (inner.slice(0, off + cand.start) + repl + inner.slice(off + cand.end)) + wrap;
      if (!katexOK(boxedWrapped)) continue;         // never show broken math
      var correct = cand.token, opts = [correct], used = {};
      used[normText(correct)] = 1;
      var addOpt = function (tex) {
        if (opts.length >= 4) return;
        var nn = normText(tex);
        if (!nn || used[nn]) return;                // empty (bare sign) or dup → drop
        if (!katexOK('$' + tex + '$')) return;      // each chip must render alone
        used[nn] = 1; opts.push(tex);
      };
      clozeDistractors(cand.cat, correct).forEach(addOpt);
      if (opts.length < 4 && harvest && harvest[cand.cat]) shuffle(harvest[cand.cat]).forEach(addOpt);
      if (opts.length < 4) continue;                // this candidate can't fill four chips
      var shuffled = shuffle(opts);
      return { display: boxedWrapped, opts: shuffled, correctIdx: shuffled.indexOf(correct) };
    }
    return null;
  }

  /* Pool: pickQueue's policy (remaining batch first, else already-studied cards —
     never a never-studied card outside the batch), filtered to cloze-able cards,
     capped at 12. Filtering stops once 12 are found, bounding the KaTeX probing. */
  function clozePool(deck) {
    var pool = PGRE.srs.formulaDayRemaining(deck);
    if (!pool.length) pool = deck.filter(function (c) { return PGRE.srs.cardState(c.id) && !PGRE.srs.isSuspended(c.id); });
    var harvest = clozeHarvest(deck);
    pool = shuffle(pool);
    var out = [];
    for (var i = 0; i < pool.length && out.length < CLOZE_CAP; i++) {
      if (buildCloze(pool[i], harvest)) out.push(pool[i]);
    }
    return out;
  }

  function startCloze(ctx) {
    var el = ctx.el;
    var deck = ctx.deck || ctx.cards || [];
    var harvest = clozeHarvest(deck);
    var st = { queue: (ctx.cards || []).slice(), i: 0, correct: 0, done: 0,
               answered: false, spec: null, timer: null, settled: false };

    function clearTimer() { if (st.timer) { clearTimeout(st.timer); st.timer = null; } }

    function render() {
      // Skip any card whose boxed render throws at round build (safety net — the
      // pool was already filtered, so this is rare).
      var spec = null;
      while (st.i < st.queue.length) {
        spec = buildCloze(st.queue[st.i], harvest);
        if (spec) break;
        st.i++;
      }
      if (st.i >= st.queue.length) return finish();
      st.spec = spec; st.answered = false;
      var c = st.queue[st.i], nm = cardName(c);
      var html = '<div class="card">' +
        '<div class="flash-hud"><span class="flash-title">Cloze</span>' +
          '<span class="chip">' + (st.i + 1) + ' / ' + st.queue.length + '</span></div>' +
        PGRE.ui.meter(100 * st.i / st.queue.length, 'meter-thin') +
        (nm ? '<div class="fcard-name">' + PGRE.ui.esc(nm) + '</div>' : '') +
        (c.front ? '<div class="q-text">' + formulaHTML(c.front) + '</div>' : '') +
        '<div class="cloze-formula">' + spec.display + '</div>' +
        '<div class="cloze-options">';
      spec.opts.forEach(function (o, idx) {
        html += '<button class="choice cloze-option" data-idx="' + idx + '">' +
          '<span class="choice-letter">' + (idx + 1) + '</span>' +
          '<span class="choice-body">$' + o + '$</span></button>';
      });
      html += '</div><div id="cloze-fb"></div></div>';
      el.innerHTML = html;
      PGRE.typesetMath(el);
      el.querySelectorAll('.cloze-option').forEach(function (b) {
        b.addEventListener('click', function () { pick(parseInt(b.getAttribute('data-idx'), 10)); });
      });
    }

    /* Games commit gradeCard directly through reviewCard — no learning steps. */
    function pick(idx) {
      if (st.answered) return;
      st.answered = true;
      var c = st.queue[st.i], correctIdx = st.spec.correctIdx;
      var isCorrect = idx === correctIdx;
      if (isCorrect) st.correct++;
      reviewCard(c.id, isCorrect ? 'good' : 'again');
      st.done++;
      el.querySelectorAll('.cloze-option').forEach(function (b) {
        var i = parseInt(b.getAttribute('data-idx'), 10);
        b.disabled = true;
        if (i === correctIdx) b.classList.add('is-answer');
        if (i === idx && !isCorrect) b.classList.add('is-wrong');
      });
      var fb = document.getElementById('cloze-fb');
      fb.innerHTML = '<div class="feedback ' + (isCorrect ? 'feedback-good' : 'feedback-bad') + '">' +
        '<span class="fb-icon">' + (isCorrect ? '✓' : '✗') + '</span>' +
        '<strong>' + (isCorrect ? 'Correct' : 'The box holds option ' + (correctIdx + 1)) + '</strong></div>';
      PGRE.typesetMath(fb);
      // A brief pause to read the highlighted answer, then advance automatically.
      clearTimer();
      st.timer = setTimeout(next, isCorrect ? 650 : 1200);
    }

    function next() {
      clearTimer();
      st.i++; st.answered = false;
      if (st.i < st.queue.length) render(); else finish();
    }

    /* Credit +2 XP per answer exactly once — finish() settles a full round,
       stop() a round abandoned mid-way (0 answers records nothing). */
    function settle() {
      if (st.settled || st.done === 0) return;
      st.settled = true;
      awardReviewXP(2 * st.done, 'Cloze: ' + st.correct + '/' + st.done + ' correct');
    }

    function finish() {
      clearTimer();
      var total = st.done, xp = 2 * st.done;
      settle();
      var pct = total ? Math.round(100 * st.correct / total) : 0;
      el.innerHTML = '<div class="card"><h2>Cloze complete</h2>' +
        '<div class="summary-score">' + st.correct + ' / ' + total +
          '<span class="summary-pct">' + pct + '%</span></div>' +
        '<p class="muted">+' + xp + ' XP. Right answers scheduled Good, misses Again.</p>' +
        '<div class="btn-row"><button class="btn btn-primary" id="flash-replay">Again</button>' +
        '<button class="btn btn-ghost" id="flash-exit">Back to deck</button></div></div>';
      document.getElementById('flash-replay').addEventListener('click', ctx.onReplay);
      document.getElementById('flash-exit').addEventListener('click', ctx.onExit);
    }

    render();
    return {
      onKey: function (e) {
        if (e.metaKey || e.ctrlKey || e.altKey) return; // browser chords never answer
        if (st.i >= st.queue.length || st.answered) return;
        var n = parseInt(e.key, 10);
        if (n >= 1 && n <= st.spec.opts.length) { e.preventDefault(); pick(n - 1); }
      },
      stop: function () { clearTimer(); settle(); }
    };
  }

  /* Shared Type/Quiz-style end card. */
  function reviewSummary(el, title, done, again, xp, ctx) {
    el.innerHTML = '<div class="card"><h2>' + title + '</h2>' +
      '<div class="summary-score">' + done + ' card' + (done === 1 ? '' : 's') +
        '<span class="summary-pct">+' + xp + ' XP</span></div>' +
      '<p class="muted">' + (again ? again + ' marked Missed for another pass. ' : '') +
        'Each grade set the card’s next review on its SM-2 track.</p>' +
      '<div class="btn-row"><button class="btn btn-primary" id="flash-replay">Again</button>' +
      '<button class="btn btn-ghost" id="flash-exit">Back to deck</button></div></div>';
    document.getElementById('flash-replay').addEventListener('click', ctx.onReplay);
    document.getElementById('flash-exit').addEventListener('click', ctx.onExit);
  }

  return {
    MAX_MATCH_PAIRS: MAX_MATCH_PAIRS,
    SESSION_CAP: SESSION_CAP,
    fmtTime: fmtTime,
    normText: normText,
    stripLegend: stripLegend,
    perturbLatex: perturbLatex,
    matchBest: matchBest,
    pickQueue: pickQueue,
    pickMatchCards: pickMatchCards,
    clozePool: clozePool,
    startMatch: startMatch,
    startType: startType,
    startQuiz: startQuiz,
    startCloze: startCloze
  };
})();
