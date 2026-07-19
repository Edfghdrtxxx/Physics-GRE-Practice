/* Spaced-repetition engine — shared by the mistake book and the formula deck.
   Two schedulers live here:
   - Mistake ladder: fixed intervals for missed questions. A miss (re)sets the
     entry to step 0 (due tomorrow); a correct solve climbs one rung. Entries
     are PERMANENT — solving never removes one, only schedules it further out;
     removal is the user's manual archive action.
   - Formula cards: SM-2 style (Anki-flavored) with Again/Hard/Good/Easy
     grades, an ease factor per card, and day-granularity due dates. */
window.PGRE = window.PGRE || {};

PGRE.srs = {

  /* ——— Local-date helpers (same YYYY-MM-DD convention as store.today) ——— */
  dayStr: function (d) {
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  },

  today: function () { return this.dayStr(new Date()); },

  addDays: function (n) {
    var d = new Date();
    d.setDate(d.getDate() + n);
    return this.dayStr(d);
  },

  /* Local-date arithmetic anchored on an arbitrary base 'YYYY-MM-DD' (addDays
     anchors on today). Same local-midday-free construction as store.dayBefore.
     Used by the ITEM 5 Easy migration to re-derive due from each card's own
     last-review day. */
  addDaysTo: function (dayStr, n) {
    var p = String(dayStr).split('-');
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    d.setDate(d.getDate() + n);
    return this.dayStr(d);
  },

  /* Whole days from today until dateStr; 0 or negative means due. */
  daysUntil: function (dateStr) {
    var a = new Date(this.today() + 'T12:00:00');
    var b = new Date(dateStr + 'T12:00:00');
    return Math.round((b - a) / 86400000);
  },

  ivlLabel: function (days) {
    if (days <= 0) return 'today';
    if (days === 1) return '1 d';
    if (days < 30) return days + ' d';
    var mo = Math.round(days / 3) / 10;
    return (mo === Math.round(mo) ? Math.round(mo) : mo) + ' mo';
  },

  /* ——— Mistake book ladder ——— */
  MISTAKE_LADDER: [1, 3, 7, 14, 30, 60],

  /* A miss (first or repeat) puts the entry at the bottom rung: due tomorrow. */
  mistakeMissed: function (mk) {
    mk.srs = { step: 0, due: this.addDays(1) };
  },

  /* A correct solve climbs one rung (capped) — never removes the entry. */
  mistakeSolved: function (mk) {
    var cur = (mk.srs && typeof mk.srs.step === 'number') ? mk.srs.step : 0;
    var step = Math.min(cur + 1, this.MISTAKE_LADDER.length - 1);
    mk.srs = { step: step, due: this.addDays(this.MISTAKE_LADDER[step]) };
  },

  /* ——— Self-assessment tagging (proposal #6, extended to multi-select) ———
     The answer is recorded first (confidence null, no tags); the assessment
     taps land a beat later, so we stamp the most recent attempt row for this
     qid in place. confidence is 'sure' | 'guess' | null; tags is an array
     drawn from ['slow', 'forgot'] (absent when empty). Re-stamping the same
     row is fine — the chips stay editable until the next question.
     Store-safe: no-op if the row can't be found. */
  setLastAssess: function (qid, confidence, tags) {
    var arr = PGRE.store.state.attempts;
    for (var i = arr.length - 1; i >= 0; i--) {
      if (arr[i].qid === qid) {
        arr[i].confidence = confidence || null;
        if (tags && tags.length) arr[i].tags = tags.slice();
        else delete arr[i].tags;
        PGRE.store.save();
        return arr[i];
      }
    }
    return null;
  },

  /* A correct-but-guessed answer is a hidden weakness: flag (or create) the
     mistake-book entry as a lucky guess and, if it isn't already scheduled,
     seed it on the normal ladder (bottom rung, due tomorrow) so it resurfaces.
     Never counts as a miss; reopens an archived entry (fresh evidence). */
  markLucky: function (qid) {
    var s = PGRE.store.state, now = new Date().toISOString();
    var mk = s.mistakes[qid];
    if (!mk) {
      mk = s.mistakes[qid] = { firstMissedAt: now, misses: 0, solves: 0,
                               wrongPicks: [], archivedAt: null, srs: null };
    }
    mk.lucky = true;
    mk.lastLuckyAt = now;
    if (mk.archivedAt) mk.archivedAt = null;
    if (!mk.srs) this.mistakeMissed(mk);
    PGRE.store.save();
    return mk;
  },

  /* Undo a markLucky from the same feedback screen (the user un-toggled
     "Guessed"). An entry that exists ONLY because of that lucky filing
     (never missed, never re-solved) is removed outright so no ghost entry
     lingers in the book; an older entry just loses the flag. */
  unmarkLucky: function (qid) {
    var s = PGRE.store.state, mk = s.mistakes[qid];
    if (!mk || !mk.lucky) return;
    if (!mk.misses && !mk.solves) {
      delete s.mistakes[qid];
    } else {
      delete mk.lucky;
      delete mk.lastLuckyAt;
    }
    PGRE.store.save();
  },

  /* Clear the lucky-guess flag once the question is answered correctly AND with
     confidence (a sure practice tag, or a correct mistake re-drill): the earlier
     lucky guess is no longer a blind spot. Leaves the rest of the entry (misses,
     ladder, archive) intact; the chip only renders while mk.lucky is truthy. */
  clearLucky: function (qid) {
    var mk = PGRE.store.state.mistakes[qid];
    if (mk && mk.lucky) {
      delete mk.lucky;
      delete mk.lastLuckyAt;
      PGRE.store.save();
    }
  },

  /* Joined view of the book: [{qid, q, mk}], skipping ids that have left the
     question bank (their records stay in state untouched). */
  mistakeEntries: function () {
    var s = PGRE.store.state, out = [];
    for (var qid in s.mistakes) {
      var q = PGRE.questionById(qid);
      if (q) out.push({ qid: qid, q: q, mk: s.mistakes[qid] });
    }
    return out;
  },

  openMistakes: function () {
    return this.mistakeEntries().filter(function (e) { return !e.mk.archivedAt; });
  },

  archivedMistakes: function () {
    return this.mistakeEntries().filter(function (e) { return !!e.mk.archivedAt; });
  },

  dueMistakes: function () {
    var t = this.today();
    return this.openMistakes().filter(function (e) {
      return e.mk.srs && e.mk.srs.due <= t;
    });
  },

  /* ——— Formula cards (SM-2 style) ——— */
  EASE_START: 2.5,
  EASE_MIN: 1.3,
  EASE_MAX: 3.0,

  cardState: function (id) {
    return PGRE.store.state.cards[id] || null;
  },

  /* F2 — a leech: a card lapsed so often that more raw reps won't stick; the UI
     nudges the user toward a mnemonic instead. */
  isLeech: function (st) { return !!st && st.lapses >= 8; },

  /* F3 — exam-date interval cap. Whole days until the exam; null when the date
     is invalid or already past (capping silently disabled). Otherwise the cap is
     max(1, min(days - 1, ceil(0.2 * days))): a fresh card can't schedule onto or
     past exam day, and long intervals get squeezed toward a final pass. */
  examCap: function () {
    var days = this.daysUntil(PGRE.store.state.settings.examDate);
    if (!isFinite(days) || days <= 0) return null;
    return Math.max(1, Math.min(days - 1, Math.ceil(0.2 * days)));
  },

  /* F3 — final pass: the last week before the exam. While active EVERY card with
     state is review-eligible (see _buildFormulaDay/_reconcileFormulaDay and
     formulaDayRemaining), so all learned formulas get one more look. */
  finalPassActive: function () {
    var days = this.daysUntil(PGRE.store.state.settings.examDate);
    return isFinite(days) && days > 0 && days <= 7;
  },

  /* Candidate next intervals (days) for each grade — used both to schedule
     and to preview on the grade buttons, so what you see is what you get. */
  nextIntervals: function (st) {
    var out;
    if (!st || !st.reps) {
      // ITEM 4: Easy schedules 10 days out (was 3). Exam-cap clamping below
      // still applies, so late in the run this squeezes toward the final pass.
      out = { again: 0, hard: 1, good: 1, easy: 10 };
    } else {
      var ease = st.ease || this.EASE_START;
      var ivl = Math.max(1, st.interval || 1);
      out = {
        again: 0,
        hard: Math.max(1, Math.round(ivl * 1.2)),
        good: st.reps === 1 ? 3 : Math.max(2, Math.round(ivl * ease)),
        easy: Math.max(10, Math.round(ivl * ease * 1.3))  // ITEM 4: Easy floor 10 (was 3)
      };
    }
    // F3: clamp each non-Again interval to the exam cap so the grade-button
    // previews match what gradeCard schedules automatically (Again stays 0).
    var cap = this.examCap();
    if (cap != null) {
      out.hard = Math.min(out.hard, cap);
      out.good = Math.min(out.good, cap);
      out.easy = Math.min(out.easy, cap);
    }
    return out;
  },

  /* ITEM 3 — "Mark as mastered": a fixed 20-day interval, exam-cap clamped like
     every non-Again grade. Shared by gradeCard and the grade-button preview so
     the button label matches exactly what it schedules. Mastered is the strongest
     grade, so it must never schedule SOONER than Easy: for a maturing card Easy
     can reach the exam cap (e.g. 21 d today), which would exceed the fixed 20 and
     invert the Again<Hard<Good<Easy<Mastered order. Floor Mastered at that card's
     Easy interval (already exam-cap clamped by nextIntervals) before capping, so
     Mastered >= Easy always holds. Pass the card's current state; omitted (null)
     yields the stateless Easy floor and the plain 20-day value as before. */
  MASTERED_DAYS: 20,
  masteredInterval: function (st) {
    var cap = this.examCap();
    var raw = Math.max(this.MASTERED_DAYS, this.nextIntervals(st).easy);
    return cap != null ? Math.min(raw, cap) : raw;
  },

  gradeCard: function (id, grade) {
    var s = PGRE.store.state;
    // Review-log capture (bundle 2) — read BEFORE the default-object creation:
    // hadState (n) separates a real review from a card's first-ever grade;
    // prevIvl / m record whether the card was mature (>= 21 d) going in.
    var hadState = !!s.cards[id];
    var st = s.cards[id] || { reps: 0, lapses: 0, interval: 0,
                              ease: this.EASE_START, due: this.today(), reviews: 0 };
    var prevIvl = st.interval || 0;
    // ITEM 3: 'mastered' isn't an SM-2 grade — nextIntervals has no entry for it,
    // so schedule its fixed (capped) 20 days explicitly. It counts as a real
    // review and graduates the card (reps+1) via the non-Again branch below.
    var next = grade === 'mastered' ? this.masteredInterval(st)
                                    : this.nextIntervals(st)[grade];
    if (grade === 'again') {
      st.lapses += 1;
      st.reps = 0;
      st.ease = Math.max(this.EASE_MIN, st.ease - 0.20);
    } else {
      if (grade === 'hard') st.ease = Math.max(this.EASE_MIN, st.ease - 0.15);
      if (grade === 'easy') st.ease = Math.min(this.EASE_MAX, st.ease + 0.15);
      st.reps += 1;
    }
    st.interval = next;
    st.due = this.addDays(next);
    st.reviews += 1;
    st.lastGrade = grade;
    st.lastReviewedAt = new Date().toISOString();
    st.lastReviewedDay = this.today();   // LOCAL date — the studiedToday source of truth
    s.cards[id] = st;
    // Append to the capped review log (bundle 2 — stats foundation). Guard: the
    // array may be absent on states saved before this key existed. Bundle 1's
    // undo pops a matching trailing entry (same id + today's d field).
    var log = s.cardReviews || (s.cardReviews = []);
    log.push({ d: this.today(), id: id, g: grade, ivl: prevIvl,
               m: prevIvl >= 21 ? 1 : 0, n: hadState ? 1 : 0 });
    if (log.length > 8000) log.shift();
    return st;
  },

  /* ITEM 5 — one-time recompute (the user chose "recompute now" over "apply on
     next review"): bring every already-graded Easy card onto the new 10-day
     scheme. For each card with lastGrade === 'easy' and interval < 10, stretch
     the interval to min(10, examCap) and re-derive due from the card's own
     last-review day (fall back to today when that stamp predates it). A
     persistent one-shot flag (state.migrations.easy10) guards it to exactly one
     run per stored state; the flag is stamped and saved unconditionally so it
     never re-runs. No other grade is touched (no legacy card can be 'mastered',
     and Good/Hard/Again due dates are correct as-is). Called from store.load()
     after migrate(), where PGRE.srs and the backfilled settings are ready. */
  migrateEasy10: function () {
    var s = PGRE.store.state;
    if (!s.migrations || typeof s.migrations !== 'object') s.migrations = {};
    if (s.migrations.easy10) return;            // already migrated this state
    var cap = this.examCap();
    var target = Math.min(10, cap || 10);       // clamp to the exam cap when active
    var cards = s.cards || {};
    for (var id in cards) {
      var st = cards[id];
      if (!st || st.lastGrade !== 'easy' || (st.interval || 0) >= 10) continue;
      st.interval = target;
      st.due = this.addDaysTo(st.lastReviewedDay || this.today(), target);
    }
    // Stamping the flag is itself a state change, so persist once regardless of
    // whether any card moved — that is what makes the run one-shot.
    s.migrations.easy10 = new Date().toISOString();
    PGRE.store.save();
  },

  /* Was this card graded today (local date)? Prefer the local lastReviewedDay
     stamp; fall back to a local re-derivation of the ISO lastReviewedAt for
     cards graded before the stamp existed. NEVER compares a UTC ISO prefix to a
     local date string (that off-by-a-day bug is exactly what this guards). */
  studiedToday: function (st) {
    if (!st) return false;
    if (st.lastReviewedDay) return st.lastReviewedDay === this.today();
    return !!(st.lastReviewedAt &&
      this.dayStr(new Date(st.lastReviewedAt)) === this.today());
  },

  /* New cards (never graded) count as due — they enter the daily queue. */
  cardDue: function (id) {
    var st = this.cardState(id);
    return !st || st.due <= this.today();
  },

  dueDeck: function (deck) {
    var self = this;
    return deck.filter(function (c) { return self.cardDue(c.id); });
  },

  newInDeck: function (deck) {
    var self = this;
    return deck.filter(function (c) { return !self.cardState(c.id); });
  },

  /* ——— Progressive daily formula batch ———
     A user-set TOTAL cap (reviews + new combined) per day, instead of every
     never-studied card counting as due. state.formulaDay holds today's batch;
     it is (re)built at the day roll and reconciled on every access. */

  /* Integer clamp of the daily target to [1, 100]; 10 when it isn't a finite
     number. Every batch read routes the raw setting through here so a corrupt
     or imported value can never poison the queue. */
  clampTarget: function (n) {
    n = Number(n);
    if (!isFinite(n)) return 10;
    n = Math.round(n);
    return n < 1 ? 1 : n > 100 ? 100 : n;
  },

  /* Random sample (Fisher–Yates on a copy) of up to n items — no mutation. */
  _sample: function (arr, n) {
    if (n <= 0 || !arr.length) return [];
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a.slice(0, Math.min(n, a.length));
  },

  /* F9 — stratified round-robin sample of up to n items across topics: shuffle
     within each topic, then take one topic-at-a-time in a shuffled topic order
     each cycle, so a fill spreads across topics instead of clustering. Used for
     new-card auto-fill and re-roll; _sample stays for other callers. */
  _sampleSpread: function (cards, n) {
    if (n <= 0 || !cards.length) return [];
    var self = this, groups = {};
    cards.forEach(function (c) {
      var k = c.topic || '_';
      (groups[k] = groups[k] || []).push(c);
    });
    var keys = Object.keys(groups);
    keys.forEach(function (k) { groups[k] = self._sample(groups[k], groups[k].length); });
    var out = [], cap = Math.min(n, cards.length);
    while (out.length < cap) {
      var order = self._sample(keys, keys.length), progressed = false;
      for (var i = 0; i < order.length && out.length < cap; i++) {
        var g = groups[order[i]];
        if (g.length) { out.push(g.shift()); progressed = true; }
      }
      if (!progressed) break;
    }
    return out;
  },

  _buildFormulaDay: function (deck, T, t) {
    var self = this;
    var susp = PGRE.store.state.formulaSuspended || {};
    var finalPass = this.finalPassActive();
    var reviews = deck.filter(function (c) {
      var st = self.cardState(c.id);
      return st && !susp[c.id] && (finalPass || st.due <= t);
    });
    reviews.sort(function (a, b) {
      var da = self.cardState(a.id).due, db = self.cardState(b.id).due;
      return da < db ? -1 : da > db ? 1 : 0;
    });
    var reviewIds = reviews.slice(0, Math.min(T, reviews.length))
      .map(function (c) { return c.id; });
    var slots = Math.max(0, T - reviewIds.length);
    var never = deck.filter(function (c) { return !self.cardState(c.id) && !susp[c.id]; });
    var newIds = this._sampleSpread(never, slots).map(function (c) { return c.id; });
    return { date: t, reviewIds: reviewIds, newIds: newIds };
  },

  /* In-place reconcile of an existing same-day batch; returns whether anything
     changed (so the caller only persists on a real edit). */
  _reconcileFormulaDay: function (batch, deck, byId, T, t) {
    var self = this, changed = false;
    var susp = PGRE.store.state.formulaSuspended || {};
    var finalPass = this.finalPassActive();   // F3: all learned cards eligible
    function studied(id) { return self.studiedToday(self.cardState(id)); }

    // (a) drop ids that have left the deck or are suspended
    var beforeR = batch.reviewIds.length, beforeN = batch.newIds.length;
    batch.reviewIds = batch.reviewIds.filter(function (id) { return byId[id] && !susp[id]; });
    batch.newIds = batch.newIds.filter(function (id) { return byId[id] && !susp[id]; });
    if (batch.reviewIds.length !== beforeR || batch.newIds.length !== beforeN) changed = true;

    var inBatch = {};
    batch.reviewIds.concat(batch.newIds).forEach(function (id) { inBatch[id] = 1; });

    var total = batch.reviewIds.length + batch.newIds.length;

    // (c) over target: trim ONLY non-studiedToday items — new picks from the end
    // first, then unstudied reviews newest-due first (oldest-due kept). Studied
    // items are never trimmed, so the batch may stay above T.
    if (total > T) {
      var over = total - T, i;
      for (i = batch.newIds.length - 1; i >= 0 && over > 0; i--) {
        if (!studied(batch.newIds[i])) {
          delete inBatch[batch.newIds[i]];
          batch.newIds.splice(i, 1);
          over--; changed = true;
        }
      }
      if (over > 0) {
        var revU = [];
        batch.reviewIds.forEach(function (id) {
          if (!studied(id)) {
            var st = self.cardState(id);
            revU.push({ id: id, due: (st && st.due) || '' });
          }
        });
        revU.sort(function (a, b) { return a.due < b.due ? 1 : a.due > b.due ? -1 : 0; });
        var drop = {}, dropped = 0;
        for (i = 0; i < revU.length && over > 0; i++) { drop[revU[i].id] = 1; dropped++; over--; changed = true; }
        if (dropped) {
          batch.reviewIds = batch.reviewIds.filter(function (id) {
            if (drop[id]) { delete inBatch[id]; return false; }
            return true;
          });
        }
      }
    }

    total = batch.reviewIds.length + batch.newIds.length;

    // (d) under target: top up — due reviews (oldest first) not already in, then
    // random never-studied cards. Runs whenever slots and candidates both exist.
    if (total < T) {
      var slots = T - total;
      var dueRev = deck.filter(function (c) {
        var st = self.cardState(c.id);
        return st && !susp[c.id] && (finalPass || st.due <= t) && !inBatch[c.id];
      });
      dueRev.sort(function (a, b) {
        var da = self.cardState(a.id).due, db = self.cardState(b.id).due;
        return da < db ? -1 : da > db ? 1 : 0;
      });
      for (var m = 0; m < dueRev.length && slots > 0; m++) {
        batch.reviewIds.push(dueRev[m].id); inBatch[dueRev[m].id] = 1;
        slots--; changed = true;
      }
      if (slots > 0 && !batch.skipNew) {
        var never = deck.filter(function (c) { return !self.cardState(c.id) && !susp[c.id] && !inBatch[c.id]; });
        this._sampleSpread(never, slots).forEach(function (c) {
          batch.newIds.push(c.id); inBatch[c.id] = 1; changed = true;
        });
      }
    }

    return changed;
  },

  /* Today's batch { date, reviewIds, newIds }, (re)built or reconciled as
     needed; persisted only when it actually changed. An empty deck returns a
     transient empty batch WITHOUT persisting — this path also runs from the nav
     badge before the IndexedDB deck has resolved, and must not stamp an empty
     batch over a real one. */
  formulaDay: function (deck) {
    deck = deck || [];
    var s = PGRE.store.state, t = this.today();
    var T = this.clampTarget(s.settings.formulaDailyTarget);
    if (!deck.length) return { date: t, reviewIds: [], newIds: [] };

    var byId = {};
    deck.forEach(function (c) { byId[c.id] = c; });

    var batch = s.formulaDay, changed = false;
    if (!batch || batch.date !== t) {
      batch = this._buildFormulaDay(deck, T, t);
      s.formulaDay = batch;
      changed = true;
    } else {
      changed = this._reconcileFormulaDay(batch, deck, byId, T, t);
    }
    if (changed) PGRE.store.save();
    return batch;
  },

  /* Cards from today's batch still owed: never-studied (no state) OR due today.
     An again-graded card (due today) stays remaining across reloads, mirroring
     the in-session recycle; a good/hard/easy card (due in the future) is done. */
  formulaDayRemaining: function (deck) {
    var self = this, t = this.today();
    var finalPass = this.finalPassActive();
    var batch = this.formulaDay(deck);
    var byId = {};
    (deck || []).forEach(function (c) { byId[c.id] = c; });
    var out = [];
    batch.reviewIds.concat(batch.newIds).forEach(function (id) {
      var c = byId[id];
      if (!c) return;
      var st = self.cardState(id);
      // F3: in the final pass a learned card stays remaining until studied today,
      // even with a future due date — without this it would never surface.
      if (!st || st.due <= t || (finalPass && !self.studiedToday(st))) out.push(c);
    });
    return out;
  },

  /* Count of due reviews held back from today's batch (the overflow line). */
  formulaDayPostponed: function (deck) {
    var self = this, t = this.today();
    var batch = this.formulaDay(deck);
    var byId = {};
    (deck || []).forEach(function (c) { byId[c.id] = c; });
    var susp = PGRE.store.state.formulaSuspended || {};
    var allDue = (deck || []).filter(function (c) {
      var st = self.cardState(c.id);
      return st && !susp[c.id] && st.due <= t;
    }).length;
    var inBatchDue = 0;
    batch.reviewIds.concat(batch.newIds).forEach(function (id) {
      var st = self.cardState(id);
      if (byId[id] && st && st.due <= t) inBatchDue++;
    });
    return Math.max(0, allDue - inBatchDue);
  },

  /* Replace today's hand-picked new cards: studiedToday members of the current
     newIds are locked and preserved verbatim (and count toward the tally); the
     passed ids (never-studied candidates only) fill the remaining open slots. */
  setFormulaNewPicks: function (deck, ids) {
    var self = this;
    var batch = this.formulaDay(deck);
    var byId = {};
    (deck || []).forEach(function (c) { byId[c.id] = c; });
    var T = this.clampTarget(PGRE.store.state.settings.formulaDailyTarget);
    var S = Math.max(0, T - batch.reviewIds.length);
    var locked = batch.newIds.filter(function (id) {
      return byId[id] && self.studiedToday(self.cardState(id));
    });
    var lockedSet = {};
    locked.forEach(function (id) { lockedSet[id] = 1; });
    var picks = [];
    (ids || []).forEach(function (id) {
      if (lockedSet[id] || !byId[id] || self.cardState(id) || picks.indexOf(id) !== -1) return;
      self.unsuspendCard(id);
      picks.push(id);
    });
    var room = Math.max(0, S - locked.length);
    batch.newIds = locked.concat(picks.slice(0, room));
    delete batch.skipNew;
    PGRE.store.state.formulaDay = batch;
    PGRE.store.save();
    return batch;
  },

  /* Re-roll: keep the locked (studiedToday) new picks, replace the rest with a
     fresh random never-studied sample sized to the open slots. */
  rerollFormulaNewPicks: function (deck) {
    var self = this;
    var batch = this.formulaDay(deck);
    var byId = {};
    (deck || []).forEach(function (c) { byId[c.id] = c; });
    var T = this.clampTarget(PGRE.store.state.settings.formulaDailyTarget);
    var S = Math.max(0, T - batch.reviewIds.length);
    var locked = batch.newIds.filter(function (id) {
      return byId[id] && self.studiedToday(self.cardState(id));
    });
    var lockedSet = {};
    locked.forEach(function (id) { lockedSet[id] = 1; });
    var susp = PGRE.store.state.formulaSuspended || {};
    var never = deck.filter(function (c) { return !self.cardState(c.id) && !susp[c.id] && !lockedSet[c.id]; });
    var room = Math.max(0, S - locked.length);
    var pick = this._sampleSpread(never, room).map(function (c) { return c.id; });
    batch.newIds = locked.concat(pick);
    delete batch.skipNew;
    PGRE.store.state.formulaDay = batch;
    PGRE.store.save();
    return batch;
  },

  clearFormulaNewPicks: function (deck) {
    var self = this;
    var batch = this.formulaDay(deck);
    var byId = {};
    (deck || []).forEach(function (c) { byId[c.id] = c; });
    batch.newIds = batch.newIds.filter(function (id) {
      return byId[id] && self.studiedToday(self.cardState(id));
    });
    batch.skipNew = true;
    PGRE.store.state.formulaDay = batch;
    PGRE.store.save();
    return batch;
  },

  suspendCard: function (id) {
    var s = PGRE.store.state;
    if (!s.formulaSuspended) s.formulaSuspended = {};
    s.formulaSuspended[id] = 1;
    var batch = s.formulaDay;
    if (batch) {
      batch.reviewIds = batch.reviewIds.filter(function (x) { return x !== id; });
      batch.newIds = batch.newIds.filter(function (x) { return x !== id; });
    }
  },

  unsuspendCard: function (id) {
    var susp = PGRE.store.state.formulaSuspended;
    if (susp) delete susp[id];
  },

  isSuspended: function (id) {
    var susp = PGRE.store.state.formulaSuspended;
    return !!(susp && susp[id]);
  }
};
