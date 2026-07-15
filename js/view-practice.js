/* Practice session: config → questions (immediate feedback + solution) → summary.
   Answering feeds the XP engine, daily challenges and achievements. */
window.PGRE = window.PGRE || {};
PGRE.views = PGRE.views || {};

PGRE.views.practice = (function () {
  var session = null; // { topicId, qs, i, correct, xpEarned, answers[], qStart }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function el() { return document.getElementById('practice-root'); }

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
    html += '<button class="btn btn-primary" data-count="' + bank.length + '">All ' + bank.length + '</button>' +
      '</div></div>';
    el().innerHTML = html;
    el().querySelectorAll('[data-count]').forEach(function (b) {
      b.addEventListener('click', function () {
        start(topicId, parseInt(b.getAttribute('data-count'), 10));
      });
    });
  }

  function start(topicId, count) {
    var qs = shuffle(PGRE.questionsForTopic(topicId)).slice(0, count);
    session = { topicId: topicId, qs: qs, i: 0, correct: 0, xpEarned: 0, answers: [], qStart: Date.now(),
                sid: PGRE.gamify.beginSession(topicId, 'practice', qs.length) };
    renderQuestion();
  }

  function renderQuestion() {
    var q = session.qs[session.i];
    var t = PGRE.topicById(q.topic);
    var letters = ['A', 'B', 'C', 'D', 'E'];
    var html = '<div class="card practice-card">' +
      '<div class="practice-meta">' +
        '<span>Question ' + (session.i + 1) + ' of ' + session.qs.length + '</span>' +
        '<span class="chip">' + t.name + '</span>' +
        '<span class="chip chip-diff">' + '●'.repeat(q.difficulty) + '○'.repeat(3 - q.difficulty) + '</span>' +
      '</div>' +
      PGRE.ui.meter(100 * session.i / session.qs.length, 'meter-thin') +
      '<div class="q-text">' + q.q + '</div>' +
      '<div class="choices">';
    q.choices.forEach(function (c, idx) {
      html += '<button class="choice" data-idx="' + idx + '">' +
        '<span class="choice-letter">' + letters[idx] + '</span><span class="choice-body">' + c + '</span></button>';
    });
    html += '</div><div id="feedback"></div></div>';
    el().innerHTML = html;
    PGRE.typesetMath(el());
    session.qStart = Date.now();

    el().querySelectorAll('.choice').forEach(function (b) {
      b.addEventListener('click', function () { answer(parseInt(b.getAttribute('data-idx'), 10)); });
    });
  }

  function answer(idx) {
    var q = session.qs[session.i];
    var isCorrect = idx === q.answer;
    var elapsed = Date.now() - session.qStart;
    var xp = PGRE.gamify.recordAnswer(q, isCorrect, elapsed,
                                      { picked: idx, sid: session.sid, mode: 'practice' });
    session.xpEarned += xp;
    if (isCorrect) session.correct++;
    session.answers.push({ q: q, picked: idx, correct: isCorrect });

    var letters = ['A', 'B', 'C', 'D', 'E'];
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
        '<strong>' + (isCorrect ? 'Correct' : 'Incorrect — the answer is ' + letters[q.answer]) + '</strong>' +
        '<span class="fb-xp">+' + xp + ' XP</span>' +
      '</div>' +
      '<div class="solution"><div class="solution-label">Solution</div>' + q.sol + '</div>' +
      '<div class="btn-row"><button class="btn btn-primary" id="next-btn">' +
        (session.i + 1 < session.qs.length ? 'Next question →' : 'Finish session') + '</button></div>';
    PGRE.typesetMath(fb);
    document.getElementById('next-btn').addEventListener('click', next);
    document.getElementById('next-btn').focus();
  }

  function next() {
    session.i++;
    if (session.i < session.qs.length) renderQuestion();
    else renderSummary();
  }

  function renderSummary() {
    PGRE.gamify.endSession(session.sid);
    PGRE.gamify.recordSession(session.qs.length, session.correct);
    var pct = Math.round(100 * session.correct / session.qs.length);
    var verdict = pct === 100 ? 'Flawless.' :
                  pct >= 80 ? 'Strong work.' :
                  pct >= 60 ? 'Solid — review the misses below.' :
                  'Rough set — the reworking is where the learning happens.';
    var html = '<div class="card practice-card">' +
      '<h1>Session complete</h1>' +
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
    var backLink = session.topicId === 'all' ? '#/' : '#/topic/' + session.topicId;
    html += '<div class="btn-row">' +
      '<button class="btn btn-primary" id="again-btn">Practice again</button>' +
      '<a class="btn btn-ghost" href="' + backLink + '">Done</a>' +
    '</div></div>';
    var topicId = session.topicId;
    el().innerHTML = html;
    PGRE.typesetMath(el());
    document.getElementById('again-btn').addEventListener('click', function () {
      renderConfig(topicId);
    });
  }

  return {
    render: function () { return '<div id="practice-root"></div>'; },
    mount: function (params) {
      session = null;
      renderConfig(params.id || 'all');
    }
  };
})();
