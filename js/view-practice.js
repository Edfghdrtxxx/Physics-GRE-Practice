/* Practice session: config → questions (immediate feedback + solution) → summary.
   Answering feeds the XP engine, daily challenges and achievements.

   Feature-wave additions (proposals #3/#4/#6/#14):
   - #3 Custom quiz: #/practice/custom consumes sessionStorage['pgre-quiz-config']
     ({ ids, label, criteria? }) written by the builder (js/view-build.js) and runs
     it as a labelled session. A criteria-built quiz stores its filter snapshot so
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
    session = { topicId: topicId, qs: qs, i: 0, correct: 0, xpEarned: 0, answers: [],
                qStart: Date.now(), label: opts.label || null, custom: !!opts.custom,
                criteria: opts.criteria || null,
                filter: opts.filter || null, stage: 'question', assess: null,
                sid: PGRE.gamify.beginSession(topicId, 'practice', qs.length) };
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
    html += '<div id="feedback"></div></div></div>';
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
    session.xpEarned += xp;
    if (isCorrect) session.correct++;
    session.answers.push({ q: q, picked: idx, correct: isCorrect });
    session.stage = 'feedback';

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
        '<span class="fb-xp">+' + xp + ' XP</span>' +
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
      '<button class="btn btn-primary" id="again-btn">' +
        (custom ? (session.criteria ? 'Draw a fresh set' : 'Run this set again') : 'Practice again') + '</button>' +
      '<a class="btn btn-ghost" href="' + backLink + '">Done</a>' +
    '</div></div>';
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
      else renderConfig(id, params.sub2); // #/practice/<id>/new | /done
    }
  };
})();
