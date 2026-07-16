/* Practice session: config → questions (immediate feedback + solution) → summary.
   Answering feeds the XP engine, daily challenges and achievements.

   Feature-wave additions (proposals #3/#4/#6/#14):
   - #3 Custom quiz: #/practice/custom consumes sessionStorage['pgre-quiz-config']
     ({ ids, label }) written by the builder (js/view-build.js) and runs it as a
     labelled session.
   - #4 Pace trainer: a live per-question timer chip (state.settings.paceTrainer)
     against the target pace (state.settings.paceTargetSec), with over/under-pace
     marking in the feedback block.
   - #6 Confidence tagging: after each answer, a one-tap "Knew it / Guessed"
     (keyboard g / k) that stamps the just-written attempt row and files
     correct-but-guessed answers as lucky guesses in the mistake book.
   - #14 Keyboard-first: A–E / 1–5 answer, Enter/Space/N advance, g/k tag. */
window.PGRE = window.PGRE || {};
PGRE.views = PGRE.views || {};

PGRE.views.practice = (function () {
  var LETTERS = ['A', 'B', 'C', 'D', 'E'];
  // { topicId, qs, i, correct, xpEarned, answers[], qStart, sid, label, custom,
  //   stage: 'question'|'feedback'|'summary', tagged }
  var session = null;
  var paceTimer = null;   // module-scoped so it survives a session reset
  var keyBound = false;   // the document keydown listener is installed once
  var noteTimers = {};    // qid -> debounce timeout id for the feedback note field

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function el() { return document.getElementById('practice-root'); }

  function settings() { return PGRE.store.state.settings; }

  /* PROPOSAL #12 — "Why the other choices tempt": an expandable list of the
     non-correct choices with their mined per-choice explanation (q.choiceSols[idx]).
     The field is optional (a pipeline fills it into the bank over time), so an
     absent or all-null array yields '' and no empty block shows. Choice text and
     explanation are trusted bank HTML/LaTeX, rendered like q.sol / q.choices and
     typeset by the caller's PGRE.typesetMath pass. */
  function distractorBlock(q) {
    var sols = q && q.choiceSols;
    if (!sols || !sols.length) return '';
    var items = '';
    for (var idx = 0; idx < q.choices.length; idx++) {
      if (idx === q.answer) continue;                 // only the tempting wrong choices
      var why = sols[idx];
      if (why == null || String(why).replace(/\s+/g, '') === '') continue;  // skip absent
      items += '<div class="distractor-item">' +
        '<div class="miss-pick is-bad"><span class="fb-icon">✗</span>' +
          '<strong>' + LETTERS[idx] + '</strong> — ' +
          '<span class="miss-pick-body">' + q.choices[idx] + '</span></div>' +
        '<div class="solution"><div class="solution-label">Why it tempts</div>' + why + '</div>' +
      '</div>';
    }
    if (!items) return '';
    return '<details class="miss distractors"><summary>Why the other choices tempt</summary>' +
      '<div class="distractor-list">' + items + '</div></details>';
  }

  /* PROPOSAL #6 — bookmark + margin note straight from the feedback panel.
     This is the only bootstrap entry point for the Notes & bookmarks feature:
     starring a question or typing a note here creates the first entry that the
     #/notes browser then lists. Reuses the storage API (PGRE.notes) and the
     shared .nb-star / .nb-note styling so the two surfaces stay consistent.
     q.id is a bank id (escaped for the attribute); the note is user text and is
     escaped before it lands in the textarea. */
  function notesBlock(q) {
    var on = PGRE.notes.isBookmarked(q.id);
    var note = PGRE.notes.get(q.id);
    return '<div class="practice-nb" data-qid="' + PGRE.ui.esc(q.id) + '">' +
      '<div class="practice-nb-bar">' +
        starButton(on) +
        '<span class="practice-nb-hint muted" data-star-label>' + starLabel(on) + '</span>' +
      '</div>' +
      '<div class="nb-noteblock">' +
        '<textarea class="nb-note" data-note rows="2" ' +
          'placeholder="Jot a note for this question…">' + PGRE.ui.esc(note) + '</textarea>' +
        '<span class="nb-saved" aria-live="polite"></span>' +
      '</div>' +
    '</div>';
  }

  function starButton(on) {
    var label = on ? 'Remove bookmark' : 'Bookmark this question';
    return '<button class="nb-star' + (on ? ' on' : '') + '" data-star type="button" ' +
      'aria-pressed="' + (on ? 'true' : 'false') + '" ' +
      'title="' + label + '" aria-label="' + label + '">' + (on ? '★' : '☆') + '</button>';
  }

  function starLabel(on) {
    return on ? 'Bookmarked — saved to Notes &amp; bookmarks' : 'Bookmark this question';
  }

  function bindNotes(fb, q) {
    var wrap = fb.querySelector('.practice-nb');
    if (!wrap) return;
    var star = wrap.querySelector('[data-star]');
    var label = wrap.querySelector('[data-star-label]');
    if (star) {
      star.addEventListener('click', function () {
        var on = PGRE.notes.toggleBookmark(q.id);
        star.classList.toggle('on', on);
        star.textContent = on ? '★' : '☆';
        star.setAttribute('aria-pressed', on ? 'true' : 'false');
        var t = on ? 'Remove bookmark' : 'Bookmark this question';
        star.setAttribute('title', t);
        star.setAttribute('aria-label', t);
        if (label) label.innerHTML = starLabel(on);
      });
    }
    var ta = wrap.querySelector('[data-note]');
    if (ta) {
      ta.addEventListener('input', function () { scheduleNoteSave(q.id, ta); });
      ta.addEventListener('blur', function () { flushNoteSave(q.id, ta); });
    }
  }

  function scheduleNoteSave(qid, ta) {
    if (noteTimers[qid]) clearTimeout(noteTimers[qid]);
    noteTimers[qid] = setTimeout(function () { doNoteSave(qid, ta); }, 500);
  }

  function flushNoteSave(qid, ta) {
    if (noteTimers[qid]) { clearTimeout(noteTimers[qid]); noteTimers[qid] = null; }
    doNoteSave(qid, ta);
  }

  function doNoteSave(qid, ta) {
    noteTimers[qid] = null;
    if (String(ta.value).trim() === String(PGRE.notes.get(qid)).trim()) return; // no change
    PGRE.notes.set(qid, ta.value);
    showNoteSaved(ta);
  }

  function showNoteSaved(ta) {
    var tick = ta.parentNode.querySelector('.nb-saved');
    if (!tick) return;
    tick.textContent = ta.value.trim() === '' ? 'Note cleared' : 'Saved ✓';
    tick.classList.add('show');
    clearTimeout(tick._t);
    tick._t = setTimeout(function () { tick.classList.remove('show'); }, 1600);
  }

  /* ——— Pace trainer (#4) ——— */
  function clearPace() {
    if (paceTimer) { clearInterval(paceTimer); paceTimer = null; }
  }

  function startPaceTimer() {
    clearPace();
    if (!settings().paceTrainer) return;
    paceTimer = setInterval(tickPace, 1000);
  }

  function tickPace() {
    var chip = document.getElementById('pace-chip');
    if (!chip || !session) { clearPace(); return; }
    var sec = Math.round((Date.now() - session.qStart) / 1000);
    var target = settings().paceTargetSec || 103;
    chip.textContent = '⏱ ' + sec + ' s';
    chip.classList.toggle('pace-over', sec > target);
  }

  function paceMark(elapsedMs) {
    if (!settings().paceTrainer) return '';
    var sec = Math.round(elapsedMs / 1000);
    var target = settings().paceTargetSec || 103;
    var over = sec > target;
    return '<div class="pace-mark ' + (over ? 'pace-over' : 'pace-under') + '">' +
      '⏱ ' + sec + ' s — ' + (over ? 'over pace' : 'under pace') +
      ' <span class="pace-target">(target ' + target + ' s)</span></div>';
  }

  /* ——— Config (topic / all modes) ——— */
  function renderConfig(topicId) {
    var t = topicId === 'all' ? null : PGRE.topicById(topicId);
    var bank = PGRE.questionsForTopic(topicId);
    var name = t ? t.name : 'All topics (mixed)';
    var counts = [5, 10, 20].filter(function (n) { return n < bank.length; });
    var html = '<div class="card practice-card">' +
      '<h1>Practice — ' + name + '</h1>' +
      '<p class="muted">' + bank.length + ' question' + (bank.length === 1 ? '' : 's') +
      ' available. Correct answers earn 10 XP (15 the first time); a wrong answer still earns 2 XP for the attempt.</p>' +
      '<div class="btn-row">';
    counts.forEach(function (n) {
      html += '<button class="btn btn-ghost" data-count="' + n + '">' + n + ' questions</button>';
    });
    html += '<button class="btn btn-primary" data-count="' + bank.length + '"' +
      (bank.length ? '' : ' disabled') + '>All ' + bank.length + '</button>' +
      '</div>' +
      '<p class="muted build-link-note">Want unseen / missed / slowest / bookmarked filters? ' +
      'Build a set in the <a href="' + (topicId === 'all' ? '#/build' : '#/build/topic-' + topicId) +
      '">custom quiz builder</a>.</p>' +
      '</div>';
    el().innerHTML = html;
    el().querySelectorAll('[data-count]').forEach(function (b) {
      b.addEventListener('click', function () {
        start(topicId, parseInt(b.getAttribute('data-count'), 10));
      });
    });
  }

  function start(topicId, count) {
    var qs = shuffle(PGRE.questionsForTopic(topicId)).slice(0, count);
    beginPractice(qs, { topicId: topicId });
  }

  /* ——— Custom quiz (#3): consume the builder's handoff ——— */
  function startCustom() {
    var raw = null;
    try { raw = sessionStorage.getItem('pgre-quiz-config'); } catch (e) { raw = null; }
    var cfg = null;
    if (raw) { try { cfg = JSON.parse(raw); } catch (e2) { cfg = null; } }
    if (!cfg || !cfg.ids || !cfg.ids.length) { renderNoCustom(); return; }
    var qs = [];
    cfg.ids.forEach(function (id) { var q = PGRE.questionById(id); if (q) qs.push(q); });
    if (!qs.length) { renderNoCustom(); return; }
    beginPractice(shuffle(qs), { topicId: 'custom', label: cfg.label || 'Custom quiz', custom: true });
  }

  function renderNoCustom() {
    el().innerHTML = '<div class="card practice-card">' +
      '<h1>Custom quiz</h1>' +
      '<p class="muted">No custom set is ready. Choose topics, difficulty and status ' +
      'filters in the builder, then start your set.</p>' +
      '<div class="btn-row"><a class="btn btn-primary" href="#/build">Open the quiz builder</a>' +
      '<a class="btn btn-ghost" href="#/practice/all">Mixed practice instead</a></div></div>';
  }

  function beginPractice(qs, opts) {
    opts = opts || {};
    var topicId = opts.topicId || 'all';
    session = { topicId: topicId, qs: qs, i: 0, correct: 0, xpEarned: 0, answers: [],
                qStart: Date.now(), label: opts.label || null, custom: !!opts.custom,
                stage: 'question', tagged: null,
                sid: PGRE.gamify.beginSession(topicId, 'practice', qs.length) };
    renderQuestion();
  }

  /* ——— Question stage ——— */
  function renderQuestion() {
    var q = session.qs[session.i];
    var t = PGRE.topicById(q.topic);
    session.stage = 'question';
    session.tagged = null;
    var html = '<div class="card practice-card">' +
      '<div class="practice-meta">' +
        '<span>Question ' + (session.i + 1) + ' of ' + session.qs.length + '</span>' +
        (session.label ? '<span class="chip chip-session">' + PGRE.ui.esc(session.label) + '</span>' : '') +
        '<span class="chip">' + t.name + '</span>' +
        '<span class="chip chip-diff">' + '●'.repeat(q.difficulty) + '○'.repeat(3 - q.difficulty) + '</span>' +
        (settings().paceTrainer ? '<span class="chip pace-chip" id="pace-chip">⏱ 0 s</span>' : '') +
      '</div>' +
      PGRE.ui.meter(100 * session.i / session.qs.length, 'meter-thin') +
      '<div class="q-text">' + q.q + '</div>' +
      '<div class="choices">';
    q.choices.forEach(function (c, idx) {
      html += '<button class="choice" data-idx="' + idx + '">' +
        '<span class="choice-letter">' + LETTERS[idx] + '</span><span class="choice-body">' + c + '</span></button>';
    });
    html += '</div>';
    if (settings().keyboard) {
      html += '<div class="practice-keys muted">' +
        '<span class="key-hint">A</span>–<span class="key-hint">E</span> or ' +
        '<span class="key-hint">1</span>–<span class="key-hint">5</span> to answer · ' +
        '<span class="key-hint">Enter</span> next · ' +
        '<span class="key-hint">G</span> guessed · <span class="key-hint">K</span> knew it</div>';
    }
    html += '<div id="feedback"></div></div>';
    el().innerHTML = html;
    PGRE.typesetMath(el());
    session.qStart = Date.now();
    startPaceTimer();

    el().querySelectorAll('.choice').forEach(function (b) {
      b.addEventListener('click', function () { answer(parseInt(b.getAttribute('data-idx'), 10)); });
    });
  }

  /* ——— Answer + feedback stage ——— */
  function answer(idx) {
    if (!session || session.stage !== 'question') return;
    var q = session.qs[session.i];
    var isCorrect = idx === q.answer;
    var elapsed = Date.now() - session.qStart;
    clearPace();
    var xp = PGRE.gamify.recordAnswer(q, isCorrect, elapsed,
                                      { picked: idx, sid: session.sid, mode: 'practice' });
    session.xpEarned += xp;
    if (isCorrect) session.correct++;
    session.answers.push({ q: q, picked: idx, correct: isCorrect });
    session.stage = 'feedback';

    el().querySelectorAll('.choice').forEach(function (b) {
      var i = parseInt(b.getAttribute('data-idx'), 10);
      b.disabled = true;
      if (i === q.answer) b.classList.add('is-answer');
      if (i === idx && !isCorrect) b.classList.add('is-wrong');
    });

    var fb = document.getElementById('feedback');
    fb.innerHTML =
      '<div class="feedback ' + (isCorrect ? 'feedback-good' : 'feedback-bad') + '">' +
        '<span class="fb-icon">' + (isCorrect ? '✓' : '✗') + '</span>' +
        '<strong>' + (isCorrect ? 'Correct' : 'Incorrect — the answer is ' + LETTERS[q.answer]) + '</strong>' +
        '<span class="fb-xp">+' + xp + ' XP</span>' +
      '</div>' +
      paceMark(elapsed) +
      '<div class="conf-row" id="conf-row">' +
        '<span class="conf-q">How sure were you?</span>' +
        '<button class="btn btn-ghost btn-sm" data-conf="sure">Knew it' +
          (settings().keyboard ? ' <span class="key-hint">K</span>' : '') + '</button>' +
        '<button class="btn btn-ghost btn-sm" data-conf="guess">Guessed' +
          (settings().keyboard ? ' <span class="key-hint">G</span>' : '') + '</button>' +
      '</div>' +
      '<div class="solution"><div class="solution-label">Solution</div>' + q.sol + '</div>' +
      distractorBlock(q) +
      notesBlock(q) +
      '<div class="btn-row"><button class="btn btn-primary" id="next-btn">' +
        (session.i + 1 < session.qs.length ? 'Next question →' : 'Finish session') + '</button></div>';
    PGRE.typesetMath(fb);
    fb.querySelectorAll('[data-conf]').forEach(function (b) {
      b.addEventListener('click', function () { tag(b.getAttribute('data-conf')); });
    });
    bindNotes(fb, q);
    var nb = document.getElementById('next-btn');
    nb.addEventListener('click', next);
    nb.focus();
  }

  /* One-tap confidence (#6). Committed once per question. */
  function tag(conf) {
    if (!session || session.stage !== 'feedback' || session.tagged) return;
    var a = session.answers[session.answers.length - 1];
    if (!a) return;
    session.tagged = conf;
    PGRE.srs.setLastConfidence(a.q.id, conf);
    var luckyFiled = false;
    if (conf === 'guess' && a.correct) { PGRE.srs.markLucky(a.q.id); luckyFiled = true; }
    // Answering it correctly and sure clears any stale "lucky guess" flag from a
    // prior correct-but-guessed attempt — you actually know it now.
    if (conf === 'sure' && a.correct) PGRE.srs.clearLucky(a.q.id);

    var row = document.getElementById('conf-row');
    if (row) {
      row.classList.add('is-tagged');
      // DESIGN §6: the confirmation text stays neutral; only the mark beside it
      // carries colour (green for "knew it", accent for a logged guess).
      row.innerHTML = conf === 'sure'
        ? '<span class="conf-done-ic" style="color:var(--good)" aria-hidden="true">✓</span> ' +
            '<span class="muted">Marked “knew it”.</span>'
        : '<span class="conf-done-ic" style="color:var(--accent-deep)" aria-hidden="true">⚑</span> ' +
            '<span class="muted">Logged as a guess' +
            (luckyFiled ? ' — filed as a lucky guess in your mistake book.' : '.') + '</span>';
    }
    if (luckyFiled) PGRE.refreshNavBadges();
  }

  function next() {
    if (!session) return;
    session.i++;
    if (session.i < session.qs.length) renderQuestion();
    else renderSummary();
  }

  /* ——— Summary ——— */
  function renderSummary() {
    clearPace();
    session.stage = 'summary';
    PGRE.gamify.endSession(session.sid);
    PGRE.gamify.recordSession(session.qs.length, session.correct);
    var pct = Math.round(100 * session.correct / session.qs.length);
    var verdict = pct === 100 ? 'Flawless.' :
                  pct >= 80 ? 'Strong work.' :
                  pct >= 60 ? 'Solid — review the misses below.' :
                  'Rough set — the reworking is where the learning happens.';
    var html = '<div class="card practice-card">' +
      '<h1>Session complete</h1>' +
      (session.label ? '<p class="muted session-label-line">' + PGRE.ui.esc(session.label) + '</p>' : '') +
      '<div class="summary-score">' + session.correct + ' / ' + session.qs.length +
        '<span class="summary-pct">' + pct + '%</span></div>' +
      '<p class="muted">' + verdict + ' You earned <strong>' + session.xpEarned + ' XP</strong> this session.</p>';

    var misses = session.answers.filter(function (a) { return !a.correct; });
    if (misses.length) {
      html += '<h2>Review your misses</h2>';
      misses.forEach(function (a) {
        html += '<details class="miss"><summary>' + a.q.q + '</summary>' +
          '<div class="solution"><div class="solution-label">Solution</div>' + a.q.sol + '</div></details>';
      });
    }
    var custom = session.custom;
    var backLink = custom ? '#/build' : (session.topicId === 'all' ? '#/' : '#/topic/' + session.topicId);
    html += '<div class="btn-row">' +
      '<button class="btn btn-primary" id="again-btn">' + (custom ? 'Run this set again' : 'Practice again') + '</button>' +
      '<a class="btn btn-ghost" href="' + backLink + '">Done</a>' +
    '</div></div>';
    var topicId = session.topicId;
    el().innerHTML = html;
    PGRE.typesetMath(el());
    document.getElementById('again-btn').addEventListener('click', function () {
      if (custom) startCustom();
      else renderConfig(topicId);
    });
  }

  /* ——— Keyboard-first practice (#14) ——— */
  function onKey(e) {
    if (!settings().keyboard) return;
    if (!session) return;
    if (!document.getElementById('practice-root')) return; // not on the practice view
    var tg = (e.target && e.target.tagName) || '';
    if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT' ||
        (e.target && e.target.isContentEditable)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var k = e.key;

    if (session.stage === 'question') {
      var idx = -1;
      if (/^[a-eA-E]$/.test(k)) idx = k.toUpperCase().charCodeAt(0) - 65;
      else if (/^[1-5]$/.test(k)) idx = parseInt(k, 10) - 1;
      if (idx >= 0 && idx < session.qs[session.i].choices.length) {
        e.preventDefault();
        answer(idx);
      }
    } else if (session.stage === 'feedback') {
      if (k === 'Enter' || k === ' ' || k === 'n' || k === 'N') {
        // Enter/Space on the focused Next button advances natively — don't double-fire.
        if ((k === 'Enter' || k === ' ') &&
            document.activeElement && document.activeElement.id === 'next-btn') return;
        e.preventDefault();
        var nb = document.getElementById('next-btn');
        if (nb) nb.click();
      } else if (k === 'g' || k === 'G') {
        e.preventDefault(); tag('guess');
      } else if (k === 'k' || k === 'K') {
        e.preventDefault(); tag('sure');
      }
    }
  }

  return {
    render: function () { return '<div id="practice-root"></div>'; },
    mount: function (params) {
      clearPace();
      session = null;
      if (!keyBound) { document.addEventListener('keydown', onKey); keyBound = true; }
      var id = params.id || 'all';
      if (id === 'custom') startCustom();
      else renderConfig(id);
    }
  };
})();
