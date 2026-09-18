/* Practice session: config → questions (immediate feedback + solution) → summary.
   Answering feeds the XP engine, daily challenges and achievements.

   Feature-wave additions (proposals #3/#4/#6/#14):
   - #3 Custom quiz: #/practice/custom consumes sessionStorage['pgre-quiz-config']
     ({ ids, label, criteria? }) written by the builder (js/view-build.js) or
     PGRE.launchPack (js/packs.js; also #/practice/pack/<NN>) and runs it as a
     labelled session. A criteria-built quiz stores its filter snapshot so
     the summary's replay can resample a fresh draw; ID-based sets replay exactly.
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
  //   criteria, stage: 'question'|'feedback'|'summary', tagged }
  var session = null;
  var paceTimer = null;   // module-scoped so it survives a session reset
  var keyBound = false;   // the document keydown listener is installed once
  var noteTimers = {};    // qid -> debounce timeout id for the feedback note field
  var lastRenderAt = 0;   // stamps each render so a double-click can't click through

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
        '<div class="miss-pick is-bad">' +
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

  /* Closing/reloading the tab mid-typing fires no blur and kills the debounce
     timer — flush the visible note field so the edit survives (same pagehide
     pattern as js/study-time.js). */
  window.addEventListener('pagehide', function () {
    var ta = document.querySelector('.practice-nb [data-note]');
    if (!ta) return;
    var wrap = ta.closest('.practice-nb');
    var qid = wrap && wrap.getAttribute('data-qid');
    if (qid) flushNoteSave(qid, ta);
  });

  function showNoteSaved(ta) {
    var tick = ta.parentNode.querySelector('.nb-saved');
    if (!tick) return;
    tick.textContent = ta.value.trim() === '' ? 'Note cleared' : 'Saved';
    tick.classList.add('show');
    clearTimeout(tick._t);
    tick._t = setTimeout(function () { tick.classList.remove('show'); }, 1600);
  }

  /* ——— Pace trainer (#4) ——— */
  var PACE_GRACE_MS = 5000; // a click inside the first 5 s is not pace data

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
    chip.textContent = sec + ' s';
    chip.classList.toggle('pace-over', sec > target);
  }

  function paceMark(elapsedMs) {
    if (!settings().paceTrainer) return '';
    if (elapsedMs < PACE_GRACE_MS) return '';
    var sec = Math.round(elapsedMs / 1000);
    var target = settings().paceTargetSec || 103;
    var over = sec > target;
    return '<div class="pace-mark ' + (over ? 'pace-over' : 'pace-under') + '">' +
      sec + ' s — ' + (over ? 'over pace' : 'under pace') +
      ' <span class="pace-target">(target ' + target + ' s)</span></div>';
  }

  /* ——— Question palette (same overview as mistake drill) ———
     Practice stays one-way (answer → next); the grid is a progress map, not
     free navigation. Live cells stay disabled so a click cannot skip ahead.
     Summary uses correct/miss tints once the set is closed. answers[n] lines
     up with qs[n] because practice never skips. */
  function paletteHTML(results) {
    if (!session || !session.qs || !session.qs.length) return '';
    var cells = '';
    session.qs.forEach(function (q, n) {
      var ans = (n < session.answers.length) ? session.answers[n] : null;
      var cls = 'pal-cell';
      if (ans) cls += results ? (ans.correct ? ' is-correct' : ' is-wrong') : ' is-answered';
      if (!results && n === session.i) cls += ' is-current';
      cells += '<button type="button" class="' + cls + '" disabled' +
        ' aria-label="Question ' + (n + 1) +
        (ans ? (results ? (ans.correct ? ', correct' : ', missed') : ', answered') : ', unanswered') +
        (!results && n === session.i ? ', current' : '') +
        '">' + (n + 1) + '</button>';
    });
    return '<div class="drill-palette practice-palette">' +
      '<div class="exam-palette-title">' +
        (results ? 'How this set went' : 'Questions in this set') + '</div>' +
      '<div class="exam-palette-grid">' + cells + '</div>' +
      '<div class="exam-legend drill-legend">' +
        (results
          ? '<span class="exam-legend-item"><span class="pal-swatch sw-correct"></span>Correct</span>' +
            '<span class="exam-legend-item"><span class="pal-swatch sw-wrong"></span>Missed</span>' +
            '<span class="exam-legend-item"><span class="pal-swatch"></span>Not answered</span>'
          : '<span class="exam-legend-item"><span class="pal-swatch"></span>Unanswered</span>' +
            '<span class="exam-legend-item"><span class="pal-swatch sw-answered"></span>Answered</span>') +
      '</div></div>';
  }

  function paintPalette() {
    var root = el().querySelector('.practice-palette');
    if (!root || !session) return;
    var buttons = root.querySelectorAll('.pal-cell');
    for (var n = 0; n < buttons.length; n++) {
      var btn = buttons[n];
      var ans = (n < session.answers.length) ? session.answers[n] : null;
      btn.classList.toggle('is-answered', !!ans);
      btn.classList.toggle('is-current', n === session.i);
      btn.setAttribute('aria-label', 'Question ' + (n + 1) +
        (ans ? ', answered' : ', unanswered') +
        (n === session.i ? ', current' : ''));
    }
  }


  /* ——— Mid-session persistence ———
     Leaving #/practice/<id> mid-set used to drop the queue silently. The
     in-flight session is mirrored to sessionStorage (same transient handoff
     the custom-quiz builder uses for 'pgre-quiz-config'): question ids, the
     position, the answered rows and the gamify session id. The config screen
     for the same topic/filter then offers Resume / Start over. Cleared when
     the summary renders or the user starts over. Attempts themselves are
     already in the saved profile, so nothing is double-counted on resume. */
  var SAVE_KEY = 'pgre-practice-session';

  function saveSession() {
    if (!session || session.stage === 'summary') return;
    var snap = {
      topicId: session.topicId, filter: session.filter, label: session.label,
      custom: session.custom, criteria: session.criteria, sid: session.sid,
      ids: session.qs.map(function (q) { return q.id; }),
      // answers only cover finished questions; the resume point is the next one
      i: session.answers.length, correct: session.correct, xpEarned: session.xpEarned,
      answers: session.answers.map(function (a) { return { qid: a.q.id, picked: a.picked, correct: a.correct }; }),
      savedAt: Date.now()
    };
    try { sessionStorage.setItem(SAVE_KEY, JSON.stringify(snap)); } catch (e) { /* storage blocked */ }
  }

  function clearSaved() {
    try { sessionStorage.removeItem(SAVE_KEY); } catch (e) { /* storage blocked */ }
  }

  function loadSaved(topicId, filter) {
    var raw = null;
    try { raw = sessionStorage.getItem(SAVE_KEY); } catch (e) { return null; }
    if (!raw) return null;
    var snap = null;
    try { snap = JSON.parse(raw); } catch (e2) { return null; }
    if (!snap || !snap.ids || !snap.ids.length) return null;
    if (snap.topicId !== topicId || (snap.filter || null) !== (filter || null)) return null;
    if (snap.i >= snap.ids.length) { clearSaved(); return null; }   // nothing left to do
    return snap;
  }

  function resumeSaved(snap) {
    var qs = [];
    snap.ids.forEach(function (id) { var q = PGRE.questionById(id); if (q) qs.push(q); });
    var answers = [];
    snap.answers.forEach(function (a) {
      var q = PGRE.questionById(a.qid);
      if (q) answers.push({ q: q, picked: a.picked, correct: a.correct });
    });
    var i = Math.min(snap.i, qs.length);
    if (!qs.length || i >= qs.length) { clearSaved(); return false; }  // bank changed under us
    session = { topicId: snap.topicId, qs: qs, i: i, correct: snap.correct || 0,
                xpEarned: snap.xpEarned || 0, answers: answers, qStart: Date.now(),
                label: snap.label || null, custom: !!snap.custom, criteria: snap.criteria || null,
                filter: snap.filter || null, stage: 'question', assess: null, sid: snap.sid };
    renderQuestion();
    return true;
  }

  function resumeCard(snap, name, onStartOver) {
    var left = snap.ids.length - snap.i;
    var html = '<div class="card practice-card practice-resume">' +
      '<h1>Practice — ' + name + '</h1>' +
      '<p class="muted">You left a set part-way through: ' + left + ' of ' + snap.ids.length +
      ' question' + (snap.ids.length === 1 ? '' : 's') + ' left, ' + snap.correct + ' correct so far.</p>' +
      '<div class="btn-row">' +
        '<button class="btn btn-primary" id="resume-btn">Resume session (' + left + ' of ' + snap.ids.length + ' left)</button>' +
        '<button class="btn btn-ghost" id="startover-btn">Start over</button>' +
      '</div></div>';
    lastRenderAt = Date.now();
    el().innerHTML = html;
    window.scrollTo(0, 0);
    document.getElementById('resume-btn').addEventListener('click', function () {
      if (!resumeSaved(snap)) onStartOver();
    });
    document.getElementById('startover-btn').addEventListener('click', function () {
      clearSaved();
      onStartOver();
    });
  }

  /* ——— Config (topic / all modes; optional done-status filter) ———
     filter 'new' keeps never-attempted questions, 'done' keeps those attempted
     at least once (state.questions — practice, drills and mock exams all
     count); anything else means the whole bank. The topic portal's split
     buttons land here via #/practice/<topic>/new and /done. */
  function isDone(q) {
    var r = PGRE.store.state.questions[q.id];
    return !!(r && r.attempts > 0);
  }

  function filteredBank(topicId, filter) {
    var bank = PGRE.questionsForTopic(topicId);
    if (filter === 'new') return bank.filter(function (q) { return !isDone(q); });
    if (filter === 'done') return bank.filter(isDone);
    return bank;
  }

  function renderConfig(topicId, filter, ignoreSaved) {
    if (filter !== 'new' && filter !== 'done') filter = null;
    var t = topicId === 'all' ? null : PGRE.topicById(topicId);
    var bank = filteredBank(topicId, filter);
    var name = (t ? t.name : 'All topics (mixed)') +
      (filter === 'new' ? ' · not yet done' : filter === 'done' ? ' · done before' : '');
    var saved = ignoreSaved ? null : loadSaved(topicId, filter);
    if (saved) {
      resumeCard(saved, name, function () { renderConfig(topicId, filter, true); });
      return;
    }
    var counts = [5, 10, 20].filter(function (n) { return n < bank.length; });
    var html = '<div class="card practice-card">' +
      '<h1>Practice — ' + name + '</h1>';
    if (!bank.length && filter) {
      html += '<p class="muted">' + (filter === 'new'
          ? 'Nothing left in this group — every question in this bank has been done at least once.'
          : 'Nothing here yet — a question joins this group once you have done it once.') + '</p>' +
        '<div class="btn-row">' +
          (t ? '<a class="btn btn-primary" href="#/topic/' + t.id + '">Back to the portal</a>' : '') +
          '<a class="btn btn-ghost" href="#/practice/' + topicId + '">Practice the whole bank</a>' +
        '</div></div>';
      lastRenderAt = Date.now();
      el().innerHTML = html;
      window.scrollTo(0, 0);
      return;
    }
    html += '<p class="muted">' + bank.length + ' question' + (bank.length === 1 ? '' : 's') +
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
    lastRenderAt = Date.now();
    el().innerHTML = html;
    window.scrollTo(0, 0);
    el().querySelectorAll('[data-count]').forEach(function (b) {
      b.addEventListener('click', function () {
        start(topicId, filter, parseInt(b.getAttribute('data-count'), 10));
      });
    });
  }

  function start(topicId, filter, count) {
    var qs = shuffle(filteredBank(topicId, filter)).slice(0, count);
    beginPractice(qs, { topicId: topicId, filter: filter,
                        label: filter === 'new' ? 'Not yet done'
                             : filter === 'done' ? 'Done before' : null });
  }

  /* ——— Custom quiz (#3): consume the builder's handoff ——— */
  function startCustom(resample, ignoreSaved) {
    var raw = null;
    try { raw = sessionStorage.getItem('pgre-quiz-config'); } catch (e) { raw = null; }
    var cfg = null;
    if (raw) { try { cfg = JSON.parse(raw); } catch (e2) { cfg = null; } }
    if (!cfg || !cfg.ids || !cfg.ids.length) { renderNoCustom(); return; }
    // a custom set left part-way through resumes too, as long as the builder's
    // handoff still describes the same questions
    var saved = (resample || ignoreSaved) ? null : loadSaved('custom', null);
    if (saved && sameIds(saved.ids, cfg.ids)) {
      resumeCard(saved, PGRE.ui.esc(cfg.label || 'Custom quiz'), function () { startCustom(false, true); });
      return;
    }
    var qs = [];
    // Replay ("Draw a fresh set") of a criteria-built quiz resamples from the
    // original criteria against the current pool; mounting #/practice/custom
    // or replaying an ID-based set (no criteria) reuses the exact ids.
    if (resample && cfg.criteria && PGRE.views.build && PGRE.views.build.resample) {
      PGRE.views.build.resample(cfg.criteria, cfg.ids.length).forEach(function (id) {
        var q = PGRE.questionById(id); if (q) qs.push(q);
      });
    } else {
      cfg.ids.forEach(function (id) { var q = PGRE.questionById(id); if (q) qs.push(q); });
    }
    if (!qs.length) { renderNoCustom(); return; }
    beginPractice(shuffle(qs), { topicId: 'custom', label: cfg.label || 'Custom quiz', custom: true,
                                 criteria: cfg.criteria || null });
  }

  function sameIds(a, b) {
    if (a.length !== b.length) return false;
    var set = {};
    a.forEach(function (id) { set[id] = true; });
    return b.every(function (id) { return set[id]; });
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
    clearSaved(); // a fresh set replaces whatever was left part-way
    var packId = inferPackId(qs.map(function (q) { return q.id; }), opts.label);
    session = { topicId: topicId, qs: qs, i: 0, correct: 0, xpEarned: 0, answers: [],
                qStart: Date.now(), label: opts.label || null, custom: !!opts.custom,
                criteria: opts.criteria || null,
                filter: opts.filter || null, stage: 'question', assess: null,
                sid: PGRE.gamify.beginSession(topicId, 'practice', qs.length,
                  { label: opts.label || null, pack: packId }) };
    renderQuestion();
  }

  /* ——— Question stage ——— */
  function renderQuestion() {
    var q = session.qs[session.i];
    var t = PGRE.topicById(q.topic) || { id: 'xx', short: '?', name: 'Unknown topic' };
    session.stage = 'question';
    session.assess = null;
    lastRenderAt = Date.now();
    var html = '<div class="card practice-card practice-live">' +
      '<div class="practice-scroll">' +
      '<div class="practice-meta">' +
        '<span>Question ' + (session.i + 1) + ' of ' + session.qs.length + '</span>' +
        (session.label ? '<span class="chip chip-session">' + PGRE.ui.esc(session.label) + '</span>' : '') +
        '<span class="chip">' + t.name + '</span>' +
        '<span class="chip chip-diff">' + PGRE.ui.diffDots(q.difficulty) + '</span>' +
        (settings().paceTrainer ? '<span class="chip pace-chip" id="pace-chip" title="Time on this question">0 s</span>' : '') +
      '</div>' +
      PGRE.ui.meter(100 * session.i / session.qs.length, 'meter-thin') +
      '<div class="q-text">' + q.q + '</div>' +
      '<div class="choices">';
    q.choices.forEach(function (c, idx) {
      html += '<button class="choice" data-idx="' + idx + '" aria-pressed="false">' +
        '<span class="choice-letter">' + LETTERS[idx] + '</span><span class="choice-body">' + c + '</span></button>';
    });
    html += '</div>';
    if (settings().keyboard) {
      // only the keys that work right now — the tagging keys appear on the
      // chips themselves once the answer is in
      html += '<div class="practice-keys muted">' +
        '<span class="key-hint">A</span>–<span class="key-hint">E</span> or ' +
        '<span class="key-hint">1</span>–<span class="key-hint">5</span> to answer</div>';
    }
    html += '<div id="feedback"></div>' + paletteHTML(false) + '</div></div>';
    el().innerHTML = html;
    PGRE.typesetMath(el());
    if (window.PGRE && PGRE.motion && PGRE.motion.animateMeter) {
      var mf = el().querySelector('.meter-thin .meter-fill');
      if (mf) PGRE.motion.animateMeter(mf, 100 * session.i / session.qs.length);
    }
    window.scrollTo(0, 0); // in-place swap: route()'s reset doesn't run here
    session.qStart = Date.now();
    startPaceTimer();
    saveSession();

    el().querySelectorAll('.choice').forEach(function (b) {
      b.addEventListener('click', function () { answer(parseInt(b.getAttribute('data-idx'), 10)); });
    });
  }

  /* ——— Answer + feedback stage ——— */
  function answer(idx) {
    // the second click of a double-click on "Next" lands on the freshly
    // rendered choices — ignore clicks inside the render's settling window
    if (Date.now() - lastRenderAt < 300) return;
    if (!session || session.stage !== 'question') return;
    var q = session.qs[session.i];
    var isCorrect = idx === q.answer;
    var elapsed = Date.now() - session.qStart;
    clearPace();
    var xp = PGRE.gamify.recordAnswer(q, isCorrect, elapsed,
                                      { picked: idx, sid: session.sid, mode: 'practice' });
    var refused = xp === null;
    if (refused) xp = 0;
    session.xpEarned += xp;
    if (isCorrect) session.correct++;
    session.answers.push({ q: q, picked: idx, correct: isCorrect });
    session.stage = 'feedback';
    paintPalette();

    el().querySelectorAll('.choice').forEach(function (b) {
      var i = parseInt(b.getAttribute('data-idx'), 10);
      b.disabled = true;
      if (i === q.answer) {
        b.classList.add('is-answer');
        if (PGRE.motion && !PGRE.motion.reduced) b.classList.add('answer-settle');
      }
      if (i === idx && !isCorrect) {
        b.classList.add('is-wrong');
        if (PGRE.motion && !PGRE.motion.reduced) b.classList.add('answer-shake');
      }
      b.setAttribute('aria-pressed', i === idx ? 'true' : 'false');
    });

    var fb = document.getElementById('feedback');
    fb.innerHTML =
      '<div class="feedback reveal-in ' + (isCorrect ? 'feedback-good' : 'feedback-bad') + '">' +
        '<strong>' + (isCorrect ? 'Correct' : 'Incorrect — the answer is ' + LETTERS[q.answer]) + '</strong>' +
        (refused
          ? '<span class="fb-xp">not recorded — saving failed</span>'
          : '<span class="fb-xp">+' + xp + ' XP</span>') +
      '</div>' +
      paceMark(elapsed) +
      PGRE.assess.html(settings().keyboard) +
      '<div class="solution"><div class="solution-label">Solution</div>' + q.sol + '</div>' +
      distractorBlock(q) +
      notesBlock(q);
    var card = el().querySelector('.practice-card');
    if (card) {
      card.insertAdjacentHTML('beforeend',
        '<div class="btn-row practice-actions"><button class="btn btn-primary" id="next-btn">' +
          (session.i + 1 < session.qs.length ? 'Next question' : 'Finish session') + '</button>' +
          (settings().keyboard ? '<span class="practice-keys muted"><span class="key-hint">Enter</span> next</span>' : '') +
        '</div>');
    }
    PGRE.typesetMath(fb);
    session.assess = PGRE.assess.bind(fb, q, isCorrect);
    bindNotes(fb, q);
    saveSession();
    if (session.answers.length === session.qs.length) persistAgentReceipt(buildAgentReceipt());
    if (window.PGRE && PGRE.motion && PGRE.motion.countUp) {
      var xpEl = fb.querySelector('.fb-xp');
      if (xpEl) PGRE.motion.countUp(xpEl, xp, { duration: 600, format: function (n) { return '+' + Math.round(n) + ' XP'; } });
    }
    if (PGRE.motion && !PGRE.motion.reduced) {
      var xpPop = fb.querySelector('.fb-xp');
      if (xpPop) xpPop.classList.add('xp-pop');
    }
    var nb = document.getElementById('next-btn');
    nb.addEventListener('click', next);
    // the action row is pinned to the bottom of the screen, so focusing Next
    // must not yank the page down past the feedback and solution
    try { nb.focus({ preventScroll: true }); } catch (e) { nb.focus(); }
  }

  /* Self-assessment (#6, multi-select): rendering, storage and the lucky-guess
     bookkeeping all live in the shared PGRE.assess component (js/app.js) —
     session.assess is the per-question controller it returns. */

  function next() {
    if (!session) return;
    session.i++;
    if (session.i < session.qs.length) renderQuestion();
    else renderSummary();
  }

  /* ——— Agent receipt (OrbitOS /practice-physics-gre-set log path) ———
     Builds a stable JSON payload the user copies into chat after a set.
     Durable write: sessionStorage + localStorage['pgre-agent-receipt'] +
     state.lastAgentReceipt (+ state.packReceipts[NN] for two-digit packs). */
  function sittingComplete(sess) {
    return !!(sess && sess.qs && sess.qs.length &&
              sess.answers && sess.answers.length === sess.qs.length);
  }

  function inferPackId(ids, label) {
    if (PGRE.PACKS && ids && ids.length) {
      for (var k in PGRE.PACKS) {
        if (!Object.prototype.hasOwnProperty.call(PGRE.PACKS, k)) continue;
        var p = PGRE.PACKS[k];
        if (p && p.ids && sameIds(p.ids, ids)) return k;
      }
    }
    var m = String(label || '').match(/\b(?:pack|set)\s*0*(\d{1,2})\b/i);
    if (!m) return null;
    var n = parseInt(m[1], 10);
    if (n < 1 || n > 35) return null;
    return n < 10 ? '0' + n : String(n);
  }

  function sessionSpanMin(sid) {
    var arr = (PGRE.store && PGRE.store.state && PGRE.store.state.sessions) || [];
    for (var i = arr.length - 1; i >= 0; i--) {
      if (arr[i].id !== sid) continue;
      if (!arr[i].startedAt || !arr[i].endedAt) return null;
      var ms = new Date(arr[i].endedAt) - new Date(arr[i].startedAt);
      if (!isFinite(ms) || ms < 0) return null;
      return Math.max(1, Math.round(ms / 60000));
    }
    return null;
  }

  function buildAgentReceipt() {
    if (!session) return null;
    var ids = session.qs.map(function (q) { return q.id; });
    var miss = session.answers.filter(function (a) { return !a.correct; }).map(function (a) {
      return {
        qid: a.q.id,
        topic: a.q.topic || null,
        picked: typeof a.picked === 'number' ? a.picked : null
      };
    });
    var n = session.qs.length;
    var correct = session.correct;
    var pct = n ? Math.round(100 * correct / n) : 0;
    var pack = inferPackId(ids, session.label);
    var durationMin = sessionSpanMin(session.sid);
    return {
      v: 1,
      kind: 'pgre-agent-receipt',
      pack: pack,
      label: session.label || null,
      score: { correct: correct, n: n, pct: pct },
      durationMin: durationMin,
      missQids: miss.map(function (m) { return m.qid; }),
      misses: miss,
      ids: ids,
      origin: (typeof location !== 'undefined' && location.href) ? location.href.split('#')[0] : null,
      sessionId: session.sid || null,
      xp: session.xpEarned || 0,
      completedAt: new Date().toISOString()
    };
  }

  function persistAgentReceipt(receipt, sess) {
    sess = sess || session;
    if (!receipt || !sittingComplete(sess)) return;
    var json = JSON.stringify(receipt);
    try { sessionStorage.setItem('pgre-agent-receipt', json); } catch (e) { /* quota / private mode */ }
    try { localStorage.setItem('pgre-agent-receipt', json); } catch (e2) { /* quota / private mode */ }
    var st = PGRE.store && PGRE.store.state;
    if (!st) return;
    st.lastAgentReceipt = receipt;
    var pack = receipt.pack;
    if (pack != null && /^\d{2}$/.test(String(pack))) {
      if (!st.packReceipts || typeof st.packReceipts !== 'object') st.packReceipts = {};
      st.packReceipts[String(pack)] = receipt;
    }
    PGRE.store.save();
  }

  function receiptFileName(receipt) {
    var day = '';
    if (PGRE.store && typeof PGRE.store.today === 'function') {
      day = String(PGRE.store.today()).replace(/-/g, '');
    }
    if (!/^\d{8}$/.test(day)) {
      var d = new Date();
      day = String(d.getFullYear()) +
        ('0' + (d.getMonth() + 1)).slice(-2) +
        ('0' + d.getDate()).slice(-2);
    }
    if (receipt && receipt.pack) return 'pgre-receipt-pack-' + receipt.pack + '-' + day + '.json';
    return 'pgre-receipt-' + day + '.json';
  }

  function downloadAgentReceipt(receipt) {
    if (!receipt) return;
    var blob = new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = receiptFileName(receipt);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
  }

  function copyAgentReceipt(receipt, btn) {
    var text = JSON.stringify(receipt, null, 2);
    function ok() {
      if (!btn) return;
      btn.textContent = 'Copied — paste in chat (“done” / log GRE set)';
      btn.classList.add('btn-ok');
      setTimeout(function () {
        btn.textContent = 'Copy agent receipt';
        btn.classList.remove('btn-ok');
      }, 3500);
    }
    function fail() {
      if (btn) btn.textContent = 'Copy failed — select JSON below';
      // last resort: show a selectable block once
      if (el().querySelector('#agent-receipt-fallback')) return;
      var pre = document.createElement('pre');
      pre.id = 'agent-receipt-fallback';
      pre.className = 'agent-receipt-fallback';
      pre.textContent = text;
      el().querySelector('.btn-row').insertAdjacentElement('afterend', pre);
      try {
        var range = document.createRange();
        range.selectNodeContents(pre);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (e2) { /* ignore */ }
    }
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(text).then(ok).catch(function () {
        // file:// often blocks clipboard — execCommand fallback
        try {
          var ta = document.createElement('textarea');
          ta.value = text;
          ta.setAttribute('readonly', '');
          ta.style.position = 'fixed';
          ta.style.left = '-9999px';
          document.body.appendChild(ta);
          ta.select();
          var worked = document.execCommand('copy');
          document.body.removeChild(ta);
          if (worked) ok(); else fail();
        } catch (e) { fail(); }
      });
      return;
    }
    try {
      var ta2 = document.createElement('textarea');
      ta2.value = text;
      ta2.setAttribute('readonly', '');
      ta2.style.position = 'fixed';
      ta2.style.left = '-9999px';
      document.body.appendChild(ta2);
      ta2.select();
      var worked2 = document.execCommand('copy');
      document.body.removeChild(ta2);
      if (worked2) ok(); else fail();
    } catch (e3) { fail(); }
  }

  /* ——— Summary ——— */
  function renderSummary() {
    clearPace();
    session.stage = 'summary';
    clearSaved();
    lastRenderAt = Date.now();
    PGRE.gamify.endSession(session.sid);
    PGRE.gamify.recordSession(session.qs.length, session.correct);
    var pct = Math.round(100 * session.correct / session.qs.length);
    var verdict = pct === 100 ? 'Flawless.' :
                  pct >= 80 ? 'Strong work.' :
                  pct >= 60 ? 'Solid — review the misses below.' :
                  'Rough set — the reworking is where the learning happens.';
    var receipt = buildAgentReceipt();
    persistAgentReceipt(receipt);
    var pack = receipt.pack;
    var isPack = pack != null && /^\d{2}$/.test(String(pack));
    var planLine = '';
    if (isPack) {
      var taskId = 'set-' + pack;
      var already = PGRE.gamify.taskDone(taskId);
      if (!already) {
        var xpKind = 'timed';
        var cw = PGRE.currentWeek();
        var weekTasks = PGRE.weekTasks(cw && cw.week);
        for (var wi = 0; wi < weekTasks.length; wi++) {
          if (weekTasks[wi].id === taskId && weekTasks[wi].kind === 'extra-set') {
            xpKind = 'extra-set';
            break;
          }
        }
        PGRE.gamify.toggleTask(taskId, PGRE.planSetXp(xpKind));
      }
      planLine = already
        ? 'Set ' + pack + ' was already done in your plan.'
        : 'Set ' + pack + ' marked done in your plan.';
    }
    var html = '<div class="card practice-card">' +
      '<h1>Session complete</h1>' +
      (session.label ? '<p class="muted session-label-line">' + PGRE.ui.esc(session.label) + '</p>' : '') +
      '<div class="summary-score">' + session.correct + ' / ' + session.qs.length +
        '<span class="summary-pct">' + pct + '%</span></div>' +
      '<p class="muted">' + verdict + ' You earned <strong>' + session.xpEarned + ' XP</strong> this session.</p>';
    if (planLine) html += '<p class="muted">' + planLine + '</p>';
    html += paletteHTML(true);

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
    if (isPack) backLink = '#/plan';
    html += '<div class="btn-row">' +
      '<button class="btn btn-primary" id="again-btn">' +
        (custom ? (session.criteria ? 'Draw a fresh set' : 'Run this set again') : 'Practice again') + '</button>';
    if (isPack) {
      html +=
        '<button class="btn btn-ghost" type="button" id="agent-receipt-btn" title="Copy JSON for OrbitOS agent log">' +
          'Copy agent receipt</button>' +
        '<button class="btn btn-ghost" type="button" id="agent-receipt-download-btn" title="Download JSON receipt">' +
          'Download .json</button>';
    }
    html += '<a class="btn btn-ghost" href="' + backLink + '">Done</a>' +
    '</div>';
    if (isPack) {
      html += '<p class="muted agent-receipt-hint">Your plan task here is already ticked. To log this set in the OrbitOS vault too (daily note and misses log), copy or download the receipt and say you are done in chat, or paste the JSON.</p>';
    }
    html += '</div>';
    var topicId = session.topicId, filter = session.filter;
    el().innerHTML = html;
    PGRE.typesetMath(el());
    if (window.PGRE && PGRE.motion && PGRE.motion.countUp) {
      var pctEl = el().querySelector('.summary-pct');
      if (pctEl) PGRE.motion.countUp(pctEl, pct, { duration: 900, format: function (n) { return Math.round(n) + '%'; } });
    }
    document.getElementById('again-btn').addEventListener('click', function () {
      if (Date.now() - lastRenderAt < 300) return; // Finish double-click guard
      if (custom) startCustom(true);
      else renderConfig(topicId, filter);
    });
    var receiptBtn = document.getElementById('agent-receipt-btn');
    if (receiptBtn && receipt) {
      receiptBtn.addEventListener('click', function () {
        if (Date.now() - lastRenderAt < 300) return;
        persistAgentReceipt(receipt);
        copyAgentReceipt(receipt, receiptBtn);
      });
    }
    var dlBtn = document.getElementById('agent-receipt-download-btn');
    if (dlBtn && receipt) {
      dlBtn.addEventListener('click', function () {
        if (Date.now() - lastRenderAt < 300) return;
        persistAgentReceipt(receipt);
        downloadAgentReceipt(receipt);
      });
    }
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
      } else if (session.assess && (k === 'g' || k === 'G')) {
        e.preventDefault(); session.assess.toggle('guess');
      } else if (session.assess && (k === 'k' || k === 'K')) {
        e.preventDefault(); session.assess.toggle('sure');
      } else if (session.assess && (k === 't' || k === 'T')) {
        e.preventDefault(); session.assess.toggle('slow');
      } else if (session.assess && (k === 'f' || k === 'F')) {
        e.preventDefault(); session.assess.toggle('forgot');
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
      else if (id === 'pack') {
        // #/practice/pack/<NN> writes the pack config and jumps to custom.
        if (PGRE.launchPack(params.sub2)) return;
        renderNoCustom();
      } else renderConfig(id, params.sub2); // #/practice/<id>/new | /done
    },
    persistAgentReceipt: persistAgentReceipt,
    inferPackId: inferPackId,
    sittingComplete: sittingComplete
  };
})();
