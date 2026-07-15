/* Gamification engine: XP, levels, daily challenges, achievement checking.
   XP sources: correct answer +10 (+5 first time), incorrect +2,
   plan tasks (task-specific), challenge bonuses, achievement bonuses. */
window.PGRE = window.PGRE || {};

PGRE.gamify = {

  /* ——— Levels ———
     Cumulative XP needed for level n: 50·n·(n−1)  → 0, 100, 300, 600, 1000, … */
  LEVEL_TITLES: ['Quark', 'Electron', 'Photon', 'Atom', 'Molecule', 'Oscillator',
                 'Wavefunction', 'Eigenstate', 'Hamiltonian', 'Lagrangian',
                 'Tensor', 'Quasar', 'Pulsar', 'Neutron Star', 'Supernova', 'Nobel Laureate'],

  levelThreshold: function (n) { return 50 * n * (n - 1); },

  levelInfo: function (xp) {
    var n = 1;
    while (this.levelThreshold(n + 1) <= xp) n++;
    var cur = this.levelThreshold(n);
    var next = this.levelThreshold(n + 1);
    var title = this.LEVEL_TITLES[Math.min(n - 1, this.LEVEL_TITLES.length - 1)];
    return { level: n, title: title, into: xp - cur, span: next - cur, next: next,
             pct: Math.min(100, Math.round(100 * (xp - cur) / (next - cur))) };
  },

  /* ——— XP ——— */
  addXP: function (amount, reason, quiet) {
    var s = PGRE.store.state;
    var before = this.levelInfo(s.xp).level;
    s.xp += amount;
    var after = this.levelInfo(s.xp);
    if (!quiet && amount > 0 && window.PGRE.toast) {
      PGRE.toast('<strong>+' + amount + ' XP</strong> ' + (reason || ''), 'xp');
    }
    if (after.level > before) {
      PGRE.store.log('level', 'Reached Level ' + after.level + ' — ' + after.title, 0);
      if (window.PGRE.toast) {
        PGRE.toast('<strong>Level up!</strong> Level ' + after.level + ' — ' + after.title, 'level');
      }
    }
  },

  /* ——— Recording an answered question ———
     ctx (optional): { picked: choiceIdx, sid: sessionId, mode: 'practice'|'mistakes' } */
  recordAnswer: function (q, isCorrect, elapsedMs, ctx) {
    var s = PGRE.store.state;
    var now = new Date().toISOString();
    ctx = ctx || {};
    PGRE.store.rollDay();
    PGRE.store.touchDay();

    // durable per-attempt log (append-only; browsable in #/history)
    s.attempts.push({
      ts: now, qid: q.id, topic: q.topic,
      picked: typeof ctx.picked === 'number' ? ctx.picked : null,
      answer: q.answer, correct: isCorrect,
      ms: elapsedMs == null ? null : elapsedMs,
      sid: ctx.sid || null, mode: ctx.mode || 'practice'
    });

    // mistake book: a miss creates/resets the entry (and reopens an archived
    // one — fresh evidence); a solve only pushes its next review further out
    var mk = s.mistakes[q.id];
    if (!isCorrect) {
      if (!mk) {
        mk = s.mistakes[q.id] = { firstMissedAt: now, misses: 0, solves: 0,
                                  wrongPicks: [], archivedAt: null, srs: null };
      }
      mk.misses += 1;
      mk.lastMissedAt = now;
      if (typeof ctx.picked === 'number') {
        mk.lastPick = ctx.picked;
        if (mk.wrongPicks.indexOf(ctx.picked) === -1) mk.wrongPicks.push(ctx.picked);
      }
      if (mk.archivedAt) mk.archivedAt = null;
      PGRE.srs.mistakeMissed(mk);
    } else if (mk) {
      mk.solves += 1;
      mk.lastSolvedAt = now;
      if (!mk.archivedAt) PGRE.srs.mistakeSolved(mk);
    }

    var rec = s.questions[q.id] || { attempts: 0, correct: 0, firstCorrect: false };
    rec.attempts += 1;
    if (isCorrect) rec.correct += 1;
    var isFirstCorrect = isCorrect && !rec.firstCorrect;
    if (isFirstCorrect) rec.firstCorrect = true;
    s.questions[q.id] = rec;

    var t = s.topics[q.topic] || { attempted: 0, correct: 0, xp: 0 };
    t.attempted += 1;
    if (isCorrect) t.correct += 1;

    var xp = isCorrect ? (isFirstCorrect ? 15 : 10) : 2;
    t.xp += xp;
    s.topics[q.topic] = t;

    var td = s.today;
    td.answered += 1;
    if (isCorrect) {
      td.correct += 1;
      td.run += 1;
      if (td.run > td.bestRun) td.bestRun = td.run;
    } else {
      td.run = 0;
    }
    if (td.topics.indexOf(q.topic) === -1) td.topics.push(q.topic);

    // secret flags
    var hour = new Date().getHours();
    if (isCorrect && hour >= 0 && hour < 4) s.flags.nightOwl = true;
    if (isCorrect && elapsedMs != null && elapsedMs < 15000) s.flags.quickThinker = true;
    if (td.bestRun >= 15) s.flags.run15 = true;

    // live session tallies (kept current so an abandoned session still shows
    // its real progress in the history)
    if (ctx.sid) {
      var sess = this._session(ctx.sid);
      if (sess) {
        sess.answered += 1;
        if (isCorrect) sess.correct += 1;
        sess.xp += xp;
      }
    }

    this.addXP(xp, isCorrect ? (isFirstCorrect ? '· first-time solve' : '· correct') : '· attempted', true);
    this.checkChallenges();
    this.checkAchievements();
    PGRE.store.save();
    return xp;
  },

  /* ——— Sessions: one record per practice run / mistake drill ——— */
  beginSession: function (topicId, mode, planned) {
    var s = PGRE.store.state;
    var id = 's-' + Date.now().toString(36) + '-' +
             Math.floor(Math.random() * 1e6).toString(36);
    s.sessions.push({ id: id, mode: mode || 'practice', topicId: topicId,
                      startedAt: new Date().toISOString(), endedAt: null,
                      planned: planned || 0, answered: 0, correct: 0, xp: 0 });
    PGRE.store.save();
    return id;
  },

  _session: function (sid) {
    var arr = PGRE.store.state.sessions;
    for (var i = arr.length - 1; i >= 0; i--) if (arr[i].id === sid) return arr[i];
    return null;
  },

  endSession: function (sid) {
    var sess = this._session(sid);
    if (sess && !sess.endedAt) {
      sess.endedAt = new Date().toISOString();
      PGRE.store.save();
    }
    return sess;
  },

  /* ——— Session end (from practice view) ——— */
  recordSession: function (total, correct) {
    var s = PGRE.store.state;
    if (total >= 10) {
      var acc = correct / total;
      if (acc >= 0.8) s.flags.session80 = true;
      if (acc >= 0.9) s.flags.session90 = true;
      if (acc >= 1.0) s.flags.session100 = true;
    }
    PGRE.store.log('practice', 'Practice session: ' + correct + '/' + total + ' correct', 0);
    this.checkAchievements();
    PGRE.store.save();
  },

  /* ——— Plan tasks ——— */
  toggleTask: function (taskId, xpValue) {
    var s = PGRE.store.state;
    PGRE.store.rollDay();
    var rec = s.plan[taskId];
    if (rec && rec.done) {
      rec.done = null; // un-check; XP is kept (xpGranted stays true)
    } else {
      var first = !rec || !rec.xpGranted;
      s.plan[taskId] = { done: new Date().toISOString(), xpGranted: true };
      PGRE.store.touchDay();
      s.today.planTasks += 1;
      if (first) {
        this.addXP(xpValue, '· plan task complete');
        PGRE.store.log('plan', 'Plan task completed', xpValue);
      }
      this.checkChallenges();
      this.checkAchievements();
    }
    PGRE.store.save();
  },

  taskDone: function (taskId) {
    var rec = PGRE.store.state.plan[taskId];
    return !!(rec && rec.done);
  },

  /* ——— Topic mastery: fraction of the topic's bank solved at least once ——— */
  mastery: function (topicId) {
    var qs = PGRE.questionsForTopic(topicId);
    if (!qs.length) return 0;
    var s = PGRE.store.state;
    var solved = qs.filter(function (q) {
      var rec = s.questions[q.id];
      return rec && rec.firstCorrect;
    }).length;
    return Math.round(100 * solved / qs.length);
  },

  /* ——— Metrics consumed by achievement definitions ——— */
  metrics: function () {
    var s = PGRE.store.state;
    var answered = 0;
    for (var id in s.questions) answered += s.questions[id].attempts;

    var topicsPracticed = 0, topics60 = 0, topics80 = 0;
    var self = this;
    PGRE.TOPICS.forEach(function (t) {
      var rec = s.topics[t.id];
      if (rec && rec.attempted > 0) topicsPracticed++;
      var m = self.mastery(t.id);
      if (m >= 60) topics60++;
      if (m >= 80) topics80++;
    });

    var planTasks = 0;
    for (var tid in s.plan) if (s.plan[tid] && s.plan[tid].xpGranted) planTasks++;

    var weeksDone = 0, phasesDone = 0;
    PGRE.PLAN.forEach(function (phase) {
      var phaseDone = true;
      phase.weeks.forEach(function (w) {
        var all = w.tasks.every(function (task) { return PGRE.gamify.taskDone(task.id); });
        if (all) weeksDone++; else phaseDone = false;
      });
      if (phaseDone) phasesDone++;
    });

    return {
      answered: answered,
      xp: s.xp,
      bestStreak: s.streak.best,
      daysActive: s.daysActive.length,
      topicsPracticed: topicsPracticed,
      topics60: topics60,
      topics80: topics80,
      planTasks: planTasks,
      planWeeksDone: weeksDone,
      planPhasesDone: phasesDone
    };
  },

  achievementProgress: function (a) {
    if (a.flag) {
      var unlocked = !!PGRE.store.state.achievements[a.id];
      return { cur: unlocked ? 1 : 0, max: 1 };
    }
    var m = this.metrics();
    return { cur: Math.min(m[a.metric] || 0, a.goal), max: a.goal };
  },

  /* Unlock any newly-earned achievements. Loops because achievement XP can
     itself cross an XP-milestone achievement. */
  checkAchievements: function () {
    var s = PGRE.store.state;
    var newly = [];
    for (var pass = 0; pass < 4; pass++) {
      var m = this.metrics();
      var changed = false;
      for (var i = 0; i < PGRE.ACHIEVEMENTS.length; i++) {
        var a = PGRE.ACHIEVEMENTS[i];
        if (s.achievements[a.id]) continue;
        var earned = a.flag ? !!s.flags[a.flag] : (m[a.metric] || 0) >= a.goal;
        if (earned) {
          s.achievements[a.id] = new Date().toISOString();
          var bonus = PGRE.TIER_XP[a.tier] || 25;
          this.addXP(bonus, null, true); // quiet: the achievement toast below announces it
          PGRE.store.log('achievement', 'Achievement unlocked: ' + a.name, bonus);
          newly.push(a);
          changed = true;
        }
      }
      if (!changed) break;
    }
    if (newly.length && window.PGRE.toast) {
      newly.forEach(function (a) {
        PGRE.toast('<strong>Achievement unlocked</strong><br>' +
          '<span class="ach-toast-tier tier-' + a.tier + '">' + a.tier + '</span> ' + a.name +
          ' <span class="toast-xp">+' + (PGRE.TIER_XP[a.tier] || 25) + ' XP</span>', 'achievement');
      });
    }
    return newly;
  },

  /* ——— Daily challenges: 3 per day, deterministic from the date ——— */
  CHALLENGE_POOL: [
    { id: 'c-answer8',  label: 'Answer 8 questions today',            xp: 25, prog: function (td) { return { cur: Math.min(td.answered, 8), max: 8 }; } },
    { id: 'c-correct5', label: 'Get 5 questions right today',         xp: 20, prog: function (td) { return { cur: Math.min(td.correct, 5), max: 5 }; } },
    { id: 'c-run4',     label: 'Get 4 correct in a row today',        xp: 25, prog: function (td) { return { cur: Math.min(td.bestRun, 4), max: 4 }; } },
    { id: 'c-topics2',  label: 'Practice in 2 different topics today', xp: 20, prog: function (td) { return { cur: Math.min(td.topics.length, 2), max: 2 }; } },
    { id: 'c-plantask', label: 'Complete a study-plan task today',    xp: 30, prog: function (td) { return { cur: Math.min(td.planTasks, 1), max: 1 }; } },
    { id: 'c-notes',    label: 'Open a topic’s notes today',          xp: 10, prog: function (td) { return { cur: td.notesVisited ? 1 : 0, max: 1 }; } }
  ],

  seededPick: function (seedStr, pool, n) {
    var h = 2166136261;
    for (var i = 0; i < seedStr.length; i++) {
      h ^= seedStr.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    var rng = function () {
      h += 0x6D2B79F5;
      var t = h;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    var copy = pool.slice();
    var out = [];
    while (out.length < n && copy.length) {
      out.push(copy.splice(Math.floor(rng() * copy.length), 1)[0]);
    }
    return out;
  },

  todaysChallenges: function () {
    PGRE.store.rollDay();
    var td = PGRE.store.state.today;
    var picks = this.seededPick('pgre-' + td.date, this.CHALLENGE_POOL, 3);
    return picks.map(function (c) {
      var p = c.prog(td);
      return { id: c.id, label: c.label, xp: c.xp, cur: p.cur, max: p.max,
               done: p.cur >= p.max, claimed: td.claimed.indexOf(c.id) !== -1 };
    });
  },

  /* Award bonuses for challenges that just crossed the line. */
  checkChallenges: function () {
    var td = PGRE.store.state.today;
    var list = this.todaysChallenges();
    var self = this;
    list.forEach(function (c) {
      if (c.done && !c.claimed) {
        td.claimed.push(c.id);
        self.addXP(c.xp, '· challenge: ' + c.label);
        PGRE.store.log('challenge', 'Challenge complete: ' + c.label, c.xp);
      }
    });
  },

  noteVisited: function () {
    PGRE.store.rollDay();
    if (!PGRE.store.state.today.notesVisited) {
      PGRE.store.state.today.notesVisited = true;
      this.checkChallenges();
      PGRE.store.save();
    }
  },

  markTomeImported: function () {
    PGRE.store.state.flags.tome = true;
    this.checkAchievements();
    PGRE.store.save();
  },

  daysToExam: function () {
    var now = new Date();
    var exam = new Date(PGRE.EXAM_DATE + 'T08:00:00');
    var ms = exam - new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.max(0, Math.ceil(ms / 86400000));
  }
};
