/* Dashboard — the home view. Mirrors the PrepEx dashboard structure:
   level/XP hero, stat tiles, daily challenges, week-at-a-glance,
   topic portals, achievements summary, recent activity.
   Proposal widgets slotted in without disturbing the existing cards:
   #7 Question of the day, #11 Study-time, #10 Readiness / score estimate. */
window.PGRE = window.PGRE || {};
PGRE.views = PGRE.views || {};

PGRE.views.dashboard = (function () {
  var LETTERS = ['A', 'B', 'C', 'D', 'E'];
  var WEEK_TARGET_LO = 15, WEEK_TARGET_HI = 17;   // plan's 15–17 h/week budget

  /* F4: where each daily challenge is actually completed, so its card offers a
     one-click jump there (keyed by CHALLENGE_POOL id). Answering-based challenges
     go to mixed practice; the plan/notes challenges go to their own views. */
  var CHALLENGE_NAV = {
    'c-answer8':  { href: '#/practice/all', label: 'Practice' },
    'c-correct5': { href: '#/practice/all', label: 'Practice' },
    'c-run4':     { href: '#/practice/all', label: 'Practice' },
    'c-topics2':  { href: '#/practice/all', label: 'Practice' },
    'c-plantask': { href: '#/plan',         label: 'Study plan' },
    'c-notes':    { href: '#/topic/cm',     label: 'Open a topic' }
  };
  var qotdStart = 0;                              // per-render answer timer
  var qotdBoundDate = null;                       // today.date when the card was wired
  var keyBound = false;                           // the document keydown listener is installed once

  /* Local YYYY-MM-DD for an offset from the 03:00 study-day (same window as
     todaySec / studyLog keys). Before 03:00, offset 0 is yesterday's date. */
  function dayKey(offset) {
    var now = new Date();
    var d = new Date(now.getTime());
    d.setHours(3, 0, 0, 0);
    if (now.getTime() < d.getTime()) d.setDate(d.getDate() - 1);
    d.setDate(d.getDate() + (offset || 0));
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  /* ————————————————————————————————————————————————————————————
     #7 Question of the day
     A deterministic pick from the default pool, seeded by the date, so it is
     stable all day and changes tomorrow. Answering runs through the SAME
     pipeline practice uses (gamify.recordAnswer with mode 'qotd'), so it feeds
     the streak, today-counters, challenges and the mistake book. The result is
     stored in today.qotd = {qid, correct}; a second render shows the completed
     state instead of re-asking.
     ———————————————————————————————————————————————————————————— */

  /* The day's question. If one was already answered today, resolve that exact
     question by id and return it — or null if its bank is gone. Crucially, an
     answered-but-unresolvable qid does NOT fall through to a fresh seed-pick:
     re-asking a different question would let it be answered (and counted) twice
     and lose the recorded result. Only an unanswered day seed-picks. */
  function qotdPick() {
    var s = PGRE.store.state;
    if (s.today.qotd && s.today.qotd.qid) {
      return PGRE.questionById(s.today.qotd.qid) || null;
    }
    var pool = PGRE.allQuestions();
    if (!pool.length) return null;
    return PGRE.gamify.seededPick('pgre-qotd-' + s.today.date, pool, 1)[0] || null;
  }

  function qotdSolvedFeedback(q, isCorrect, xp) {
    return '<div class="feedback reveal-in ' + (isCorrect ? 'feedback-good' : 'feedback-bad') + '">' +
        '<span class="fb-icon">' + (isCorrect ? '✓' : '✗') + '</span>' +
        '<strong>' + (isCorrect ? 'Correct' : 'Not quite — the answer is ' + LETTERS[q.answer]) + '</strong>' +
        (xp != null ? '<span class="fb-xp">+' + xp + ' XP</span>' : '') +
      '</div>' +
      '<details class="dash-qotd-sol"><summary>Show solution</summary>' +
        '<div class="solution"><div class="solution-label">Solution</div>' + q.sol + '</div>' +
      '</details>' +
      '<p class="muted dash-qotd-tomorrow">That’s today’s question — come back tomorrow for a new one.</p>';
  }

  /* Inner body of the QOTD card (re-rendered in place after an answer). */
  function qotdBody(q) {
    var s = PGRE.store.state;
    var done = (s.today.qotd && s.today.qotd.qid === q.id) ? s.today.qotd : null;
    var t = PGRE.topicById(q.topic);
    var html = '<div class="dash-qotd-meta">' +
        (t ? '<span class="chip">' + PGRE.ui.esc(t.name) + '</span>' : '') +
        '<span class="chip chip-diff">' + PGRE.ui.diffDots(q.difficulty) + '</span>' +
      '</div>' +
      '<div class="q-text">' + q.q + '</div>' +
      '<div class="choices dash-qotd-choices">';
    q.choices.forEach(function (c, idx) {
      var cls = 'choice';
      if (done && idx === q.answer) cls += ' is-answer';
      // done.picked (added to the schema) lets a reload after a wrong answer show
      // your actual wrong pick, not just the correct choice. Older stored results
      // predate the field (picked undefined) and degrade to answer-only.
      if (done && done.picked != null && idx === done.picked && !done.correct) cls += ' is-wrong';
      html += '<button class="' + cls + '" data-idx="' + idx + '"' + (done ? ' disabled' : '') +
        ' aria-pressed="' + (done && done.picked === idx ? 'true' : 'false') + '">' +
        '<span class="choice-letter">' + LETTERS[idx] + '</span>' +
        '<span class="choice-body">' + c + '</span></button>';
    });
    html += '</div>';
    if (!done && PGRE.store.state.settings.keyboard) {
      html += '<div class="practice-keys muted">' +
        '<span class="key-hint">A</span>–<span class="key-hint">E</span> answer</div>';
    }
    html += done ? qotdSolvedFeedback(q, done.correct, null) : '<div id="qotd-feedback"></div>';
    return html;
  }

  function qotdCard() {
    var s = PGRE.store.state;
    var answered = !!(s.today.qotd && s.today.qotd.qid);
    var q = qotdPick();
    var stamp = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    var inner;
    if (q) inner = qotdBody(q);
    else if (answered) {
      // answered earlier today, but the stored question has since left the bank —
      // show a quiet unavailable note rather than silently re-asking a new one
      inner = '<p class="muted">Today’s question is no longer in the bank — it may have changed since you answered it. A fresh question arrives tomorrow.</p>';
    } else {
      inner = '<p class="muted">The question bank is still loading — the daily question arrives once the book import fills the bank.</p>';
    }
    return '<div class="card dash-qotd-card">' +
      '<div class="dash-qotd-head"><h2>Question of the day</h2>' +
        '<span class="dash-qotd-date">' + stamp + '</span></div>' +
      '<div id="qotd-body">' + inner + '</div></div>';
  }

  /* Record the tapped answer through the shared pipeline, then swap the card to
     its solved state without a full re-route (keeps the feedback on screen). */
  function answerQotd(q, idx) {
    var s = PGRE.store.state;
    if (s.today.qotd) return;                       // guard a double tap
    var isCorrect = idx === q.answer;
    var xp = PGRE.gamify.recordAnswer(q, isCorrect, Date.now() - qotdStart,
                                      { picked: idx, mode: 'qotd' });
    // recordAnswer's rollDay may have started a fresh day mid-interaction: the
    // attempt is already durably logged, but yesterday's question must not
    // claim the NEW day's QOTD slot — re-route so today's question appears.
    if (PGRE.store.state.today.date !== qotdBoundDate) {
      PGRE.toast('A new day started — your answer was logged, and today’s fresh question is ready.', 'info');
      PGRE.route();
      return;
    }
    // schema: today.qotd gains `picked` (the chosen idx) alongside {qid, correct}
    // so a reload can redraw your wrong pick. store.migrate tolerates extra keys.
    s.today.qotd = { qid: q.id, correct: isCorrect, picked: idx };
    PGRE.store.save();

    var body = document.getElementById('qotd-body');
    if (!body) return;
    body.querySelectorAll('.choice').forEach(function (b) {
      var i = parseInt(b.getAttribute('data-idx'), 10);
      b.disabled = true;
      if (i === q.answer) b.classList.add('is-answer');
      if (i === idx && !isCorrect) b.classList.add('is-wrong');
      b.setAttribute('aria-pressed', i === idx ? 'true' : 'false');
    });
    var fb = document.getElementById('qotd-feedback');
    if (fb) { fb.innerHTML = qotdSolvedFeedback(q, isCorrect, xp); PGRE.typesetMath(fb); }
  }

  function bindQotd() {
    var q = qotdPick();
    var body = document.getElementById('qotd-body');
    if (!q || !body) return;
    PGRE.typesetMath(body);
    if (PGRE.store.state.today.qotd) return;         // already solved: nothing to bind
    qotdStart = Date.now();
    qotdBoundDate = PGRE.store.state.today.date;
    body.querySelectorAll('.choice').forEach(function (b) {
      b.addEventListener('click', function () {
        answerQotd(q, parseInt(b.getAttribute('data-idx'), 10));
      });
    });
  }

  /* ——— Keyboard (same opt-in setting as practice: settings.keyboard) ———
     A–E / 1–5 answer the Question of the day, matching the practice room's
     convention. Live only while today's question is on screen unanswered. */
  function onKey(e) {
    if (!PGRE.store.state.settings.keyboard) return;
    if (PGRE.store.state.today.qotd) return;           // already solved today
    if (!document.getElementById('qotd-body')) return; // not on the dashboard
    var tg = (e.target && e.target.tagName) || '';
    if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT' ||
        (e.target && e.target.isContentEditable)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var k = e.key;
    var idx = -1;
    if (/^[a-eA-E]$/.test(k)) idx = k.toUpperCase().charCodeAt(0) - 65;
    else if (/^[1-5]$/.test(k)) idx = parseInt(k, 10) - 1;
    if (idx < 0) return;
    var q = qotdPick();
    if (!q || idx >= q.choices.length) return;
    e.preventDefault();
    answerQotd(q, idx);
  }

  /* ————————————————————————————————————————————————————————————
     #11 Study-time card
     Today's active minutes and this week's hours against the 15–17 h plan
     target, plus a last-7-days mini bar row. "Active minutes" are the passive
     heartbeat seconds (PGRE.studyTime) — honest about tab-only semantics.
     ———————————————————————————————————————————————————————————— */
  function studyCard() {
    var st = PGRE.studyTime;
    var todaySec = st.todaySec();
    var weekH = st.weekSec() / 3600;
    var todayMin = Math.round(todaySec / 60);
    var todayDisp = todaySec > 0 && todayMin === 0 ? '<1' : String(todayMin);

    // meter fills toward the low end of the range: reaching 15 h reads as "on plan"
    var pct = Math.min(100, 100 * weekH / WEEK_TARGET_LO);

    // last 7 days (oldest → today) as a tiny inline SVG bar row
    var days = [];
    var maxSec = 1;
    for (var i = 6; i >= 0; i--) {
      var key = dayKey(-i);
      var sec = st.daySec(key);
      if (sec > maxSec) maxSec = sec;
      days.push({ key: key, sec: sec, today: i === 0 });
    }
    var total7 = days.reduce(function (a, d) { return a + d.sec; }, 0);

    var spark = '';
    if (total7 > 0) {
      var W = 168, BH = 36, bw = 16, gap = (W - 7 * bw) / 6;
      var bars = '';
      days.forEach(function (d, i) {
        var x = i * (bw + gap);
        var h = d.sec > 0 ? Math.max(3, Math.round(BH * d.sec / maxSec)) : 2;
        var cls = d.sec > 0 ? (d.today ? 'dash-bar dash-bar-today' : 'dash-bar') : 'dash-bar dash-bar-zero';
        var mins = Math.round(d.sec / 60);
        var lbl = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][new Date(d.key + 'T12:00:00').getDay()];
        bars += '<rect x="' + x.toFixed(1) + '" y="' + (BH - h) + '" width="' + bw + '" height="' + h +
                '" rx="2" class="' + cls + '"><title>' + d.key + ': ' + mins + ' min</title></rect>' +
                '<text x="' + (x + bw / 2).toFixed(1) + '" y="47" text-anchor="middle" class="dash-spark-lbl' +
                (d.today ? ' dash-spark-lbl-today' : '') + '">' + lbl + '</text>';
      });
      spark = '<svg class="dash-spark" viewBox="0 0 168 50" role="img" ' +
        'aria-label="Active minutes over the last 7 days">' + bars + '</svg>';
    } else {
      spark = '<p class="muted">No active time logged yet — the timer starts as you use the app.</p>';
    }

    return '<div class="card dash-study-card"><h2>Study time</h2>' +
      '<div class="dash-study-top">' +
        '<div class="dash-study-fig"><div class="dash-study-big">' + todayDisp +
          '<span class="stat-unit"> min</span></div><div class="muted">active today</div></div>' +
        '<div class="dash-study-fig"><div class="dash-study-big">' + weekH.toFixed(1) +
          '<span class="stat-unit"> h</span></div><div class="muted">this week</div></div>' +
      '</div>' +
      PGRE.ui.meter(pct, 'meter-thin') +
      '<div class="challenge-prog">' + weekH.toFixed(1) + ' of ' + WEEK_TARGET_LO + '–' + WEEK_TARGET_HI + ' h weekly target</div>' +
      spark +
      '<p class="muted dash-study-note">Counts active time in this tab only — a heartbeat while you interact. ' +
      'Reading on paper or in another tab isn’t tracked.</p>' +
      '<a class="btn btn-ghost btn-sm dash-study-more" href="#/study-time">Details →</a>' +
    '</div>';
  }

  /* ————————————————————————————————————————————————————————————
     #10 Readiness / score estimate  (labeled an ESTIMATE)
     Readiness blends (70%) weight-adjusted per-topic accuracy over the last
     30 days with (30%) coverage of the default pool. Unattempted topics count
     as 0 accuracy; the 2–3 emptiest surface as "blind spots". A projected
     scaled score is mapped onto the reported 200–990 band (naive; see below),
     blended 50/50 toward the latest submitted sim's own scaledEst when sims
     exist. Full sims are the trustworthy signal — this is a rough gauge.
     ———————————————————————————————————————————————————————————— */
  function readinessData() {
    var s = PGRE.store.state;
    var now = Date.now();
    var WINDOW = 30 * 86400000;

    // per-topic right/total over the last 30 days of attempts
    var per = {};
    PGRE.TOPICS.forEach(function (t) { per[t.id] = { right: 0, total: 0 }; });
    s.attempts.forEach(function (a) {
      if (!a.ts || now - new Date(a.ts).getTime() > WINDOW) return;
      var p = per[a.topic];
      if (!p) return;
      p.total += 1;
      if (a.correct) p.right += 1;
    });

    // weight-adjusted accuracy (weights sum to 100; unattempted → acc 0)
    var accSum = 0, totalW = 0;
    PGRE.TOPICS.forEach(function (t) {
      var p = per[t.id];
      accSum += t.weight * (p.total ? p.right / p.total : 0);
      totalW += t.weight;
    });
    var weightedAcc = totalW ? accSum / totalW : 0;   // 0..1

    // coverage: share of the default pool touched at least once (all time)
    var pool = PGRE.allQuestions();
    var touched = 0;
    pool.forEach(function (q) {
      var rec = s.questions[q.id];
      if (rec && rec.attempts > 0) touched += 1;
    });
    var coverage = pool.length ? touched / pool.length : 0;

    var readiness = 0.7 * weightedAcc + 0.3 * coverage;  // 0..1

    // blind spots: the emptiest topics in the window (fewest attempts, higher
    // exam weight breaks ties so a big untouched block surfaces first)
    var blind = PGRE.TOPICS.slice().sort(function (a, b) {
      var d = per[a.id].total - per[b.id].total;
      return d !== 0 ? d : b.weight - a.weight;
    }).slice(0, 3);

    // Naive scaled-score mapping. GRE Physics is reported on a 200–990 scale in
    // 10-point steps. We map readiness linearly onto that band — 200 at 0%,
    // 990 at 100% — and round to the nearest 10. This is intentionally crude
    // (a real scaled score needs a raw→scaled lookalike table from actual
    // exam forms). When submitted sims exist we blend 50/50 toward the latest
    // sim's own scaledEst, which is derived from real exam-form scoring.
    var scaled = 200 + readiness * 790;
    var blended = false, latest = null;
    var sims = s.exams.filter(function (x) { return x.submittedAt && typeof x.scaledEst === 'number'; });
    if (sims.length) {
      sims.sort(function (a, b) { return a.submittedAt < b.submittedAt ? -1 : 1; });
      latest = sims[sims.length - 1].scaledEst;
      scaled = (scaled + latest) / 2;
      blended = true;
    }
    scaled = Math.max(200, Math.min(990, Math.round(scaled / 10) * 10));

    return { readiness: readiness, scaled: scaled, blended: blended,
             blind: blind, coverage: coverage, touched: touched,
             poolLen: pool.length, hasAny: s.attempts.length > 0 };
  }

  function readinessCard() {
    var d = readinessData();
    var head = '<div class="dash-head"><h2>Exam readiness</h2>' +
      '<span class="dash-est-chip">Estimate</span></div>';

    if (!d.hasAny) {
      return '<div class="card dash-readiness-card">' + head +
        '<p class="muted">Answer a handful of questions and this fills with a readiness ' +
        'gauge and a projected score. Nothing to go on yet.</p>' +
        '<a class="btn btn-ghost" href="#/practice/all">Start practicing →</a></div>';
    }

    var pct = Math.round(100 * d.readiness);
    var tiles = '<div class="dash-tiles">' +
      PGRE.ui.statTile('Readiness', pct + '<span class="stat-unit">%</span>') +
      PGRE.ui.statTile('Projected score', '~' + d.scaled,
        d.blended ? 'blended 50/50 with your latest sim' : 'from accuracy + coverage') +
      '</div>';

    var blind = '<div class="dash-blind"><span class="dash-blind-label">Blind spots</span> ' +
      d.blind.map(function (t) {
        return '<a class="dash-chip" href="#/topic/' + t.id + '" title="' + PGRE.ui.esc(t.name) + '">' +
          PGRE.ui.esc(t.short) + '</a>';
      }).join(' ') + '</div>';

    return '<div class="card dash-readiness-card">' + head + tiles +
      PGRE.ui.meter(pct, 'meter-thin') +
      '<p class="muted dash-caption">Rough gauge — 70% last-30-day weight-adjusted accuracy, ' +
      '30% bank coverage (' + d.touched + ' of ' + d.poolLen + ' touched). Trust a full timed sim more.</p>' +
      blind +
      '<a class="btn btn-ghost" href="#/exam">Run a full sim →</a></div>';
  }

  /* ———————————————————————————————————————————————————————————— */

  function examDateStr() {
    var s = PGRE.store.state;
    return (s.settings && s.settings.examDate) || PGRE.EXAM_DATE || '';
  }

  function examDateLabel() {
    var d = examDateStr();
    if (!d) return '';
    var dt = new Date(d + 'T12:00:00');
    if (isNaN(dt.getTime())) return '';
    return dt.toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
    });
  }

  /* Next unused intact ETS form. Never GR8677/GR9277 as a fresh test.
     If ets2024 has not been sat, it is the pointer even when the catalog
     has not loaded. Shared with the exam setup screen as PGRE.nextMockPointer
     so both surfaces point at the same sitting. */
  function nextMockPointer() {
    var sat = {};
    (PGRE.store.state.exams || []).forEach(function (x) {
      if (x && x.source) sat[String(x.source).toLowerCase()] = true;
    });
    var skip = { gr8677: 1, gr9277: 1 };
    function catalogTitle(id, fallback) {
      var list = PGRE.ETS_EXAMS || [];
      for (var i = 0; i < list.length; i++) {
        if (list[i] && list[i].id === id) return list[i].title || fallback;
      }
      return fallback;
    }
    if (!sat.ets2024) return { id: 'ets2024', title: catalogTitle('ets2024', 'ETS 2024') };
    var list = PGRE.ETS_EXAMS || [];
    for (var i = 0; i < list.length; i++) {
      var ex = list[i];
      if (!ex || !ex.id) continue;
      var id = String(ex.id).toLowerCase();
      if (skip[id] || sat[id]) continue;
      return { id: ex.id, title: ex.title || ex.id };
    }
    return null;
  }
  PGRE.nextMockPointer = nextMockPointer;

  /* One "today" decision surface: mixed practice, SRS dues (mistakes +
     formulas), and the next intact mock. */
  function todayAgendaHTML() {
    var ui = PGRE.ui;
    var mock = nextMockPointer();
    var dueM = PGRE.srs.dueMistakes().length;
    var html = '<div class="card review-queue" id="today-agenda">' +
      '<h2>Today</h2><div class="rq-rows">' +
      '<div class="rq-row"><span class="rq-label">Mixed practice</span>' +
        '<span class="rq-count">Questions from the daily pool</span>' +
        '<a class="btn btn-primary btn-sm" href="#/practice/all">Practice →</a></div>' +
      '<div class="rq-row"><span class="rq-label">Mistake book</span>' +
        '<span class="rq-count">' + (dueM ? dueM + ' due now' : 'nothing due') + '</span>' +
        '<a class="btn ' + (dueM ? 'btn-primary' : 'btn-ghost') + ' btn-sm" href="#/mistakes">' +
          (dueM ? 'Drill →' : 'Open →') + '</a></div>' +
      '<div class="rq-row"><span class="rq-label">Formula review</span>' +
        '<span class="rq-count" id="today-formulas">…</span>' +
        '<button type="button" class="btn btn-primary btn-sm" id="today-formulas-btn">Study →</button></div>';
    if (mock) {
      html += '<div class="rq-row"><span class="rq-label">Mock exam</span>' +
        '<span class="rq-count">Next current-format mock: ' + ui.esc(mock.title) + '</span>' +
        '<a class="btn btn-ghost btn-sm" href="#/exam">Open →</a></div>';
    }
    html += '</div></div>';
    return html;
  }

  function formulaStatus(deck) {
    var srs = PGRE.srs;
    var T = srs.clampTarget(PGRE.store.state.settings &&
      PGRE.store.state.settings.formulaDailyTarget);
    if (!deck.length) {
      return { text: 'deck empty — awaits the book', remaining: 0,
        unlearned: 0, picked: 0, target: T };
    }
    var remaining = srs.formulaDayRemaining(deck).length;
    var batch = srs.formulaDay(deck);
    var picked = batch.reviewIds.length + batch.newIds.length;
    var unlearned = srs.newInDeck(deck).length;
    var text;
    if (remaining) text = remaining + ' left today';
    else if (picked) text = 'all caught up';
    else if (unlearned) text = unlearned + ' not yet introduced';
    else text = 'all introduced';
    return { text: text, remaining: remaining, unlearned: unlearned,
      picked: picked, target: T };
  }

  function startFormulaFromToday(ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    var todayBtn = document.getElementById('today-formulas-btn');
    if (todayBtn) todayBtn.disabled = true;
    PGRE.formulaDeck().then(function (deck) {
      PGRE.srs.fillFormulaDayIfEmpty(deck);
      if (PGRE.views.formulas && PGRE.views.formulas.armStudyFromFill) {
        PGRE.views.formulas.armStudyFromFill();
      }
      location.hash = '#/formulas';
    }).catch(function () {
      location.hash = '#/formulas';
    });
  }

  function render() {
    var ui = PGRE.ui, g = PGRE.gamify, s = PGRE.store.state;
    var lvl = g.levelInfo(s.xp);
    var hour = new Date().getHours();
    var greet = hour < 5 ? 'Burning the midnight oil' :
                hour < 12 ? 'Good morning' :
                hour < 18 ? 'Good afternoon' : 'Good evening';
    var days = g.daysToExam();

    var m = g.metrics();
    var accuracy = '—';
    var totalAttempts = 0, totalCorrect = 0;
    for (var id in s.questions) { totalAttempts += s.questions[id].attempts; totalCorrect += s.questions[id].correct; }
    if (totalAttempts > 0) accuracy = Math.round(100 * totalCorrect / totalAttempts) + '%';

    var html = '<div class="hero card">' +
      '<div class="hero-left">' +
        '<h1>' + greet + '.</h1>' +
        '<div class="hero-level">Level <span class="hero-level-num">' + lvl.level + '</span> · <span class="level-title">' + lvl.title + '</span></div>' +
        ui.meter(lvl.pct, 'meter-xp') +
        '<div class="hero-xp-note">' + ui.fmt(lvl.into) + ' / ' + ui.fmt(lvl.span) + ' XP to Level ' + (lvl.level + 1) + '</div>' +
      '</div>' +
      '<div class="hero-right">' +
        '<div class="countdown"><div class="countdown-num">' + days + '</div>' +
        '<div class="countdown-label">day' + (days === 1 ? '' : 's') + ' until the exam<br>' +
          examDateLabel() + '</div></div>' +
      '</div>' +
    '</div>';

    html += todayAgendaHTML();

    html += '<div class="stat-row">' +
      ui.statTile('Total XP', ui.fmt(s.xp)) +
      ui.statTile('Day streak', PGRE.store.liveStreak(), 'best ' + s.streak.best) +
      ui.statTile('Questions answered', ui.fmt(m.answered)) +
      ui.statTile('Accuracy', accuracy) +
      ui.statTile('Days active', s.daysActive.length) +
    '</div>';

    // #7 Question of the day — a low-friction daily hook that feeds the streak
    html += qotdCard();

    // Today's challenges + this week
    html += '<div class="two-col">';
    html += '<div class="card"><h2>Today’s challenges</h2><div class="challenge-list">';
    g.todaysChallenges().forEach(function (c) {
      // F4: an un-finished challenge gets a button to where you complete it
      var nav = CHALLENGE_NAV[c.id];
      var jump = (!c.done && nav)
        ? '<a class="btn btn-ghost btn-sm" href="' + nav.href + '">' + nav.label + ' →</a>'
        : '';
      html += '<div class="challenge' + (c.done ? ' done' : '') + '">' +
        '<div class="challenge-top"><span>' + (c.done ? '<span class="check">✓</span> ' : '') + ui.esc(c.label) + '</span>' +
        '<span class="challenge-xp">+' + c.xp + ' XP</span></div>' +
        ui.meter(100 * c.cur / c.max, 'meter-thin') +
        '<div class="challenge-foot">' +
          '<span class="challenge-prog">' + c.cur + ' / ' + c.max + '</span>' + jump +
        '</div>' +
      '</div>';
    });
    html += '</div></div>';

    var cw = PGRE.currentWeek();
    var weekTasks = PGRE.weekTasks(cw.week);
    var doneCount = weekTasks.filter(function (t) { return g.taskDone(t.id); }).length;
    var nextTasks = weekTasks.filter(function (t) { return !g.taskDone(t.id); }).slice(0, 3);
    html += '<div class="card"><h2>This week — ' + ui.esc(cw.week.title) + '</h2>' +
      '<div class="muted">' + ui.dateRange(cw.week.start, cw.week.end) + ' · ' + ui.esc(cw.phase.name) + ' · ~' + cw.week.hours + ' h</div>' +
      ui.meter(100 * doneCount / Math.max(1, weekTasks.length), 'meter-thin') +
      '<div class="challenge-prog">' + doneCount + ' / ' + weekTasks.length + ' tasks done</div>';
    if (nextTasks.length) {
      html += '<ul class="next-tasks">';
      nextTasks.forEach(function (t) { html += '<li>' + ui.esc(t.label) + '</li>'; });
      html += '</ul>';
    } else {
      html += '<p class="muted">Everything for this week is done. Get ahead or rest — both count.</p>';
    }
    html += '<a class="btn btn-ghost" href="#/plan">Open study plan →</a></div>';
    html += '</div>';

    // #11 Study-time  +  #10 Readiness — the "am I on pace / am I ready" block
    html += '<div class="two-col">' + studyCard() + readinessCard() + '</div>';

    // Topic portals
    html += '<h2 class="section-title">Knowledge portals</h2><div class="topic-grid">';
    PGRE.TOPICS.forEach(function (t) {
      var rec = s.topics[t.id] || { attempted: 0, correct: 0 };
      var acc = rec.attempted ? Math.round(100 * rec.correct / rec.attempted) + '% acc.' : 'not started';
      var mastery = g.mastery(t.id);
      html += '<a class="topic-card card" href="#/topic/' + t.id + '">' +
        '<div class="topic-card-head">' + ui.monogram(t) +
          '<span class="weight-chip">' + t.weight + '%</span></div>' +
        '<div class="topic-card-name">' + t.name + '</div>' +
        ui.meter(mastery, 'meter-thin') +
        '<div class="topic-card-sub">' + mastery + '% mastery · ' + acc + '</div>' +
      '</a>';
    });
    html += '</div>';

    // Achievements summary + mock exam teaser
    var tiers = ['bronze', 'silver', 'gold', 'platinum'];
    var tierCounts = {};
    tiers.forEach(function (tier) {
      var total = PGRE.ACHIEVEMENTS.filter(function (a) { return a.tier === tier; }).length;
      var got = PGRE.ACHIEVEMENTS.filter(function (a) { return a.tier === tier && s.achievements[a.id]; }).length;
      tierCounts[tier] = got + '/' + total;
    });
    html += '<div class="two-col">';
    html += '<div class="card"><h2>Achievements</h2><div class="tier-chips">';
    tiers.forEach(function (tier) {
      html += '<span class="tier-chip tier-' + tier + '">' + tier.charAt(0).toUpperCase() + tier.slice(1) + ' ' + tierCounts[tier] + '</span>';
    });
    html += '</div>';
    var recent = PGRE.ACHIEVEMENTS
      .filter(function (a) { return s.achievements[a.id]; })
      .sort(function (a, b) { return s.achievements[b.id] < s.achievements[a.id] ? -1 : 1; })
      .slice(0, 3);
    if (recent.length) {
      html += '<ul class="mini-list">';
      recent.forEach(function (a) {
        html += '<li><span class="tier-dot tier-' + a.tier + '"></span>' + a.name +
          '<span class="muted"> · ' + PGRE.ui.timeAgo(s.achievements[a.id]) + '</span></li>';
      });
      html += '</ul>';
    } else {
      html += '<p class="muted">Nothing unlocked yet — answer your first question to get started.</p>';
    }
    html += '<a class="btn btn-ghost" href="#/achievements">All achievements →</a></div>';

    html += '<div class="card exam-teaser"><h2>Timed mock exam</h2>' +
      '<p class="muted">A full timed simulation of the test — 70 questions in 2 hours, or a ' +
      '100-question legacy sitting of a real sample exam, with a scaled-score estimate ' +
      'and per-topic breakdown.</p>' +
      '<a class="btn btn-primary" href="#/exam">Start a simulation →</a></div>';
    html += '</div>';

    // Recent activity
    html += '<div class="card"><h2>Recent activity</h2>';
    if (s.log.length === 0) {
      html += '<p class="muted">Your activity will appear here.</p>';
    } else {
      html += '<ul class="activity-list">';
      s.log.slice(0, 8).forEach(function (e) {
        var icon = { practice: '✎', achievement: '★', plan: '☑', level: '↑', challenge: '◎',
                   import: '⤓', mistake: '✗', review: '⟳' }[e.kind] || '·';
        html += '<li><span class="act-icon act-' + ui.esc(e.kind) + '">' + icon + '</span>' +
          '<span class="act-text">' + ui.esc(e.text) + '</span>' +
          (e.xp ? '<span class="act-xp">+' + e.xp + ' XP</span>' : '') +
          '<span class="act-time">' + ui.timeAgo(e.ts) + '</span></li>';
      });
      html += '</ul>';
    }
    html += '</div>';

    return html;
  }

  /* ——— Views-A: entry motion helpers ———
     countUpText: tweens the first number in a plain-text element up to its
     current value (prefix/suffix preserved, e.g. "1,234" or "85%"). Elements
     with child markup (e.g. <span> units) are left untouched.
     animateMeters: lets every .meter-fill in scope run from 0 to its target. */
  function countUpText(el, duration) {
    if (!el || !(PGRE.motion && PGRE.motion.countUp)) return;
    if (el.children.length === 1 && el.firstElementChild.classList.contains('stat-unit')) {
      var textNode = el.childNodes[0];
      if (textNode && textNode.nodeType === 3) {
        var tm = textNode.textContent.trim().match(/^([^\d-]*)([\d,]+(?:\.\d+)?)(.*)$/);
        if (tm) {
          var tPrefix = tm[1], tSuffix = tm[3];
          var tDec = (tm[2].split('.')[1] || '').length;
          var tTo = parseFloat(tm[2].replace(/,/g, ''));
          if (!isNaN(tTo)) {
            PGRE.motion.countUp({
              set textContent(val) { textNode.textContent = val; },
              get textContent() { return textNode.textContent; }
            }, tTo, {
              duration: duration,
              decimals: tDec,
              format: function (v) {
                return tPrefix + v.toLocaleString('en-US', {
                  minimumFractionDigits: tDec,
                  maximumFractionDigits: tDec
                }) + tSuffix;
              }
            });
            return;
          }
        }
      }
    }
    if (el.children.length > 0) return;
    var m = el.textContent.trim().match(/^([^\d-]*)([\d,]+(?:\.\d+)?)(.*)$/);
    if (!m) return;
    var prefix = m[1], suffix = m[3];
    var decimals = (m[2].split('.')[1] || '').length;
    var to = parseFloat(m[2].replace(/,/g, ''));
    if (isNaN(to)) return;
    PGRE.motion.countUp(el, to, {
      duration: duration,
      decimals: decimals,
      format: function (v) {
        return prefix + v.toLocaleString('en-US', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        }) + suffix;
      }
    });
  }

  function animateMeters(scope) {
    if (!(PGRE.motion && PGRE.motion.animateMeter) || !scope) return;
    scope.querySelectorAll('.meter-fill').forEach(function (f) {
      var pct = parseFloat(f.style.width);
      if (!isNaN(pct)) PGRE.motion.animateMeter(f, pct);
    });
  }

  function mount() {
    if (!keyBound) { document.addEventListener('keydown', onKey); keyBound = true; }
    // #7 QOTD: typeset the math and wire up the one-tap choices
    bindQotd();
    // Views-A: entry motion — numbers count up, meters fill, challenges cascade
    if (PGRE.motion && !PGRE.motion.reduced) {
      countUpText(document.querySelector('.hero-level-num'), 700);
      countUpText(document.querySelector('.hero-xp-note'), 700);
      // countdown must paint at its final value — do not tween .countdown-num
      document.querySelectorAll('.stat-tile .stat-value').forEach(function (el) {
        countUpText(el, 700);
      });
      document.querySelectorAll('.challenge-prog').forEach(function (el) {
        countUpText(el, 700);
      });
      animateMeters(document.getElementById('view'));
      var challengeList = document.querySelector('.challenge-list');
      if (challengeList) {
        Array.prototype.forEach.call(challengeList.children, function (c) {
          c.classList.add('stagger-in');
        });
        PGRE.motion.stagger(challengeList, { step: 60, max: 6 });
      }
      var view = document.getElementById('view');
      if (view) {
        var cascade = 0;
        Array.prototype.forEach.call(view.children, function (el) {
          if (el.classList.contains('card') || el.classList.contains('stat-row') ||
              el.classList.contains('two-col') || el.classList.contains('review-queue')) {
            el.classList.add('stagger-in');
            el.style.animationDelay = (cascade * 70) + 'ms';
            cascade += 1;
          }
        });
      }
      var countdownNum = document.querySelector('.countdown-num');
      if (countdownNum) countdownNum.classList.add('countdown-breathe');
    }

    var tfBtn = document.getElementById('today-formulas-btn');
    if (tfBtn) tfBtn.addEventListener('click', startFormulaFromToday);

    // formula due count arrives async from the IndexedDB-backed deck
    PGRE.formulaDeck().then(function (deck) {
      var st = formulaStatus(deck);
      var todayEl = document.getElementById('today-formulas');
      if (todayEl) todayEl.textContent = st.text;
      if (tfBtn && !tfBtn.disabled) {
        if (st.remaining) {
          tfBtn.classList.remove('btn-ghost');
          tfBtn.classList.add('btn-primary');
          tfBtn.textContent = 'Study →';
        } else if (st.unlearned && !st.picked) tfBtn.textContent = 'Study ' + st.target + ' →';
        else tfBtn.textContent = 'Open →';
      }
      // remaining counts may tween; do not tween "N not yet introduced"
      if (PGRE.motion && !PGRE.motion.reduced && st.remaining) {
        if (todayEl) countUpText(todayEl, 600);
      }
    });
  }

  return { render: render, mount: mount };
})();
