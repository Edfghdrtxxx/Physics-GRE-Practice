/* Spaced-repetition engine — shared by the mistake book and the formula deck.
   Two schedulers live here:
   - Mistake ladder: fixed intervals for missed questions. A miss (re)sets the
     entry to step 0 (due tomorrow); a correct solve climbs one rung. Entries
     are PERMANENT — solving never removes one, only schedules it further out;
     removal is the user's manual archive action.
   - Formula cards: classic Anki SM-2 with Again/Hard/Good/Easy grades, an
     ease factor per card, and day-granularity due dates. An optional
     exam-date cap (settings.formulaExamCap, default on) squeezes long
     intervals toward exam day without inverting grade order. */
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
    if (!(typeof PGRE.store.canWrite === 'function' ? PGRE.store.canWrite() : true)) {
      PGRE.persistWarning(true);
      return null;   // refused: never re-stamp an older row for this qid
    }
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
    mk.lastTouchedAt = now;
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
      mk.lastTouchedAt = new Date().toISOString();
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
      mk.lastTouchedAt = new Date().toISOString();
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
  getMnemonic: function (id) {
    if (!id || !PGRE.store || !PGRE.store.state || !PGRE.store.state.cardNotes) return '';
    var n = PGRE.store.state.cardNotes[id];
    return (n && n.text) ? n.text : (typeof n === 'string' ? n : '');
  },

  /* F2 — a leech: a card lapsed so often that more raw reps won't stick; the UI
     nudges the user toward a mnemonic instead. */
  isLeech: function (st) { return !!st && st.lapses >= 8; },

  /* F3 — exam-date interval cap. Whole days until the exam; null when the user
     has turned the cap off (settings.formulaExamCap === false), or the date is
     invalid/past/due within a day. Otherwise the cap is max(1, days - 1):
     a fresh card can't schedule onto or past exam day. Missing/undefined
     formulaExamCap means ON (the default), so older saved states stay
     exam-capped until migrate() backfills the key. */
  examCap: function () {
    var settings = (PGRE.store.state && PGRE.store.state.settings) || {};
    if (settings.formulaExamCap === false) return null;
    var days = this.daysUntil(settings.examDate);
    if (!isFinite(days) || days <= 1) return null;
    return Math.max(1, days - 1);
  },
  /* F3 — final pass: the last week before the exam. Scheduling is unchanged;
     the formula home shows a banner nudging the user to pick due cards into
     the batch so every learned formula gets one more look before exam day. */
  finalPassActive: function () {
    var days = this.daysUntil(PGRE.store.state.settings.examDate);
    return isFinite(days) && days > 0 && days <= 7;
  },

  /* Candidate next intervals (days) for each grade — used both to schedule
     and to preview on the grade buttons, so what you see is what you get.
     Classic Anki SM-2 (day granularity, no fuzz), matching Anki's
     passing_nonearly_review_intervals:
       new cards graduate Hard/Good → 1 day and Easy → 4 days;
       reviews: Hard = interval×1.2, Good = (interval + daysLate/2)×ease,
       Easy = (interval + daysLate)×ease×1.3.
     Anki then floors every passing grade: Hard ≥ current interval + 1,
     Good ≥ Hard + 1, Easy ≥ Good + 1. (FAQ: "all new intervals except Again
     are at least one day longer than the previous interval.") The exam cap
     may still equalize them afterwards. The old "second Good is always 3
     days" shortcut and the 10-day Easy floor are gone — they inverted
     Hard > Good after an Easy. */
  nextIntervals: function (st) {
    var out;
    if (!st || !st.reps) {
      out = { again: 0, hard: 1, good: 1, easy: 4 };
    } else {
      var ease = st.ease || this.EASE_START;
      var ivl = Math.max(1, st.interval || 1);
      var late = 0;
      if (st.due) {
        var until = this.daysUntil(st.due);
        if (until < 0) late = -until;
      }
      var hard = Math.round(ivl * 1.2);
      if (hard < ivl + 1) hard = ivl + 1;
      var good = Math.round((ivl + late / 2) * ease);
      if (good < hard + 1) good = hard + 1;
      var easy = Math.round((ivl + late) * ease * 1.3);
      if (easy < good + 1) easy = good + 1;
      out = { again: 0, hard: hard, good: good, easy: easy };
    }
    // F3: clamp each non-Again interval to the exam cap so the grade-button
    // previews match what gradeCard schedules automatically (Again stays 0).
    // Backward cascade clamping preserves strict monotonicity (Hard < Good < Easy)
    // whenever cap >= 3.
    var cap = this.examCap();
    if (cap != null) {
      if (cap >= 3) {
        out.easy = Math.min(out.easy, cap);
        out.good = Math.min(out.good, out.easy - 1);
        out.hard = Math.min(out.hard, out.good - 1);
        if (out.hard < 1) out.hard = 1;
      } else {
        out.hard = Math.min(out.hard, cap);
        out.good = Math.min(out.good, cap);
        out.easy = Math.min(out.easy, cap);
      }
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
    if (!(typeof PGRE.store.canWrite === 'function' ? PGRE.store.canWrite() : true)) {
      PGRE.persistWarning(true);
      return PGRE.store.state.cards[id];
    }
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

  /* Ever studied = graded at least once (`state.cards[id]` exists after the
     first grade). Inverse of newInDeck. Existing card state is the backfill —
     no extra "ever picked" store. */
  everStudied: function (id) {
    return !!this.cardState(id);
  },

  countEverStudied: function (deck) {
    var self = this, n = 0;
    (deck || []).forEach(function (c) {
      if (self.everStudied(c.id)) n++;
    });
    return n;
  },

  /* ——— User-curated daily formula batch ———
     Nothing is auto-selected. state.formulaDay starts empty and contains only
     cards the user explicitly picked (picker dialog, browse chips, search
     Add). The batch PERSISTS across day rolls: un-studied picks carry over,
     completed ones are pruned by reconcile. The daily target (clampTarget)
     is a soft suggestion shown in the UI — never a cap or an auto-fill quota. */

  /* Integer clamp of the daily target to [1, 100]; 10 when it isn't a finite
     number. Every batch read routes the raw setting through here so a corrupt
     or imported value can never poison the queue. */
  clampTarget: function (n) {
    n = Number(n);
    if (!isFinite(n)) return 10;
    n = Math.round(n);
    return n < 1 ? 1 : n > 100 ? 100 : n;
  },

  /* In-place reconcile of the persistent batch; returns whether anything
     changed (so the caller only persists on a real edit). The batch is fully
     user-curated: reconcile only prunes — it never adds or re-fills. */
  _reconcileFormulaDay: function (batch, deck, byId, t) {
    var self = this, changed = false;
    var susp = PGRE.store.state.formulaSuspended || {};

    // (a) soft pins that no longer mean anything: card left the deck, is
    // suspended, or was already studied today (the pin's one job — keeping a
    // not-yet-due add review-eligible — is done once today's grade is in).
    if (batch.softIds && batch.softIds.length) {
      var beforeS = batch.softIds.length;
      batch.softIds = batch.softIds.filter(function (id) {
        return byId[id] && !susp[id] && !self.studiedToday(self.cardState(id));
      });
      if (batch.softIds.length !== beforeS) changed = true;
      if (!batch.softIds.length) delete batch.softIds;
    }
    var softSet = {};
    if (batch.softIds) batch.softIds.forEach(function (id) { softSet[id] = 1; });

    // (b) drop ids that left the deck or are suspended, and retire completed
    // picks: a card graded on an EARLIER day whose due is now in the future
    // has served its turn. Carry-over keeps never-studied picks, due/overdue
    // reviews, today's again-graded cards (due today) and soft-pinned adds.
    function drop(id) {
      if (!byId[id] || susp[id]) return true;
      var st = self.cardState(id);
      return !!st && st.due > t && !softSet[id] && !self.studiedToday(st);
    }
    var beforeR = batch.reviewIds.length, beforeN = batch.newIds.length;
    batch.reviewIds = batch.reviewIds.filter(function (id) { return !drop(id); });
    batch.newIds = batch.newIds.filter(function (id) { return !drop(id); });
    if (batch.reviewIds.length !== beforeR || batch.newIds.length !== beforeN) changed = true;

    return changed;
  },

  /* The picked batch { date, reviewIds, newIds, softIds? }. Never auto-built:
     an absent batch becomes an empty one; an existing batch is only reconciled
     (pruned). Persisted when it changed. An empty deck returns a transient
     empty batch WITHOUT persisting — this path also runs from the nav badge
     before the IndexedDB deck has resolved, and must not stamp an empty batch
     over a real one. softIds pin not-yet-due adds so they stay review-eligible
     until studied today (see formulaDayRemaining). */
  formulaDay: function (deck) {
    deck = deck || [];
    var s = PGRE.store.state, t = this.today();
    if (!deck.length) return { date: t, reviewIds: [], newIds: [] };

    var byId = {};
    deck.forEach(function (c) { byId[c.id] = c; });

    var batch = s.formulaDay, changed = false;
    if (!batch) {
      batch = { date: t, reviewIds: [], newIds: [] };
      s.formulaDay = batch;
      changed = true;
    } else {
      changed = this._reconcileFormulaDay(batch, deck, byId, t);
    }
    if (changed) PGRE.store.save();
    return batch;
  },

  /* Explicit Today-agenda fill. formulaDay() still never auto-adds.
     If the picked batch is empty and unlearned cards exist, put up to
     clampTarget(formulaDailyTarget) unseen ids into newIds and persist.
     Does not raise the target. */
  fillFormulaDayIfEmpty: function (deck) {
    deck = deck || [];
    var batch = this.formulaDay(deck);
    if (!deck.length) return batch;
    if (batch.reviewIds.length + batch.newIds.length) return batch;
    var self = this;
    var ids = [];
    var T = this.clampTarget(PGRE.store.state.settings &&
      PGRE.store.state.settings.formulaDailyTarget);
    this.newInDeck(deck).some(function (c) {
      if (!c || !c.id || self.isSuspended(c.id)) return false;
      ids.push(c.id);
      return ids.length >= T;
    });
    if (!ids.length) return batch;
    batch.newIds = ids;
    PGRE.store.state.formulaDay = batch;
    PGRE.store.save();
    return batch;
  },

  /* Membership check against the picked batch. Does NOT call formulaDay() —
     search UI uses this and must stay side-effect free until the user
     explicitly clicks Add. */
  isInFormulaDay: function (deck, id) {
    var batch = PGRE.store.state.formulaDay;
    if (!batch || !id) return false;
    return batch.reviewIds.indexOf(id) !== -1 || batch.newIds.indexOf(id) !== -1;
  },

  /* Add cards into the picked batch (search "Add to today", browse chips).
     Classification: no state → newIds; has state → reviewIds (including
     not-yet-due — a deliberate topical add); suspended → unsuspend then add;
     already in batch → idempotent. Not-yet-due learned adds are pinned in
     batch.softIds so they stay review-eligible until studied today.
     @returns {{ batch, added: string[], already: string[], skipped: string[] }} */
  addFormulaDaySoft: function (deck, ids) {
    var self = this;
    deck = deck || [];
    ids = ids || [];
    var added = [], already = [], skipped = [];
    if (!deck.length) {
      return { batch: { date: this.today(), reviewIds: [], newIds: [] },
        added: added, already: already, skipped: skipped };
    }
    var batch = this.formulaDay(deck);
    var byId = {};
    deck.forEach(function (c) { byId[c.id] = c; });
    if (!batch.softIds) batch.softIds = [];
    var softSet = {}, inBatch = {};
    batch.softIds.forEach(function (id) { softSet[id] = 1; });
    batch.reviewIds.concat(batch.newIds).forEach(function (id) { inBatch[id] = 1; });

    var changed = false;
    var seen = {};
    ids.forEach(function (id) {
      if (!id || seen[id]) return;
      seen[id] = 1;
      if (!byId[id]) { skipped.push(id); return; }
      if (self.isSuspended(id)) { self.unsuspendCard(id); changed = true; }
      if (!softSet[id]) { batch.softIds.push(id); softSet[id] = 1; changed = true; }
      if (inBatch[id]) { already.push(id); return; }
      if (self.cardState(id)) batch.reviewIds.push(id);
      else batch.newIds.push(id);
      inBatch[id] = 1;
      added.push(id);
      changed = true;
    });

    if (!batch.softIds.length) delete batch.softIds;
    if (changed) {
      PGRE.store.state.formulaDay = batch;
      PGRE.store.save();
    }
    return { batch: batch, added: added, already: already, skipped: skipped };
  },

  /* Drop soft pins and remove the ids from today's batch lists (if present).
     Studied cards stay put — same rule as clear/reroll of new picks: a grade
     already committed today is not undone by un-pinning. */
  removeFormulaDaySoft: function (deck, ids) {
    var self = this;
    deck = deck || [];
    ids = ids || [];
    if (!deck.length || !ids.length) {
      return this.formulaDay(deck);
    }
    var batch = this.formulaDay(deck);
    var drop = {};
    ids.forEach(function (id) { if (id) drop[id] = 1; });
    if (batch.softIds && batch.softIds.length) {
      batch.softIds = batch.softIds.filter(function (id) { return !drop[id]; });
      if (!batch.softIds.length) delete batch.softIds;
    }
    batch.reviewIds = batch.reviewIds.filter(function (id) {
      if (!drop[id]) return true;
      // Keep studiedToday members in the batch even when the pin is cleared.
      return self.studiedToday(self.cardState(id));
    });
    batch.newIds = batch.newIds.filter(function (id) {
      if (!drop[id]) return true;
      return self.studiedToday(self.cardState(id));
    });
    PGRE.store.state.formulaDay = batch;
    PGRE.store.save();
    return batch;
  },

  /* Cards from the picked batch still owed: never-studied (no state), due
     today or overdue, or soft-pinned not-yet-due adds not yet studied today
     (without the pin rule a topical add would sit in the batch but never
     surface in Study / the nav badge). An again-graded card (due today) stays
     remaining across reloads; a good/hard/easy card (due later) is done and
     reconcile prunes it. */
  formulaDayRemaining: function (deck) {
    var self = this, t = this.today();
    var batch = this.formulaDay(deck);
    var softSet = {};
    if (batch.softIds) batch.softIds.forEach(function (id) { softSet[id] = 1; });
    var byId = {};
    (deck || []).forEach(function (c) { byId[c.id] = c; });
    var out = [];
    batch.reviewIds.concat(batch.newIds).forEach(function (id) {
      var c = byId[id];
      if (!c) return;
      var st = self.cardState(id);
      if (!st || st.due <= t ||
          (softSet[id] && !self.studiedToday(st))) out.push(c);
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

  /* Replace the picked batch wholesale (picker Save): the passed ids become
     the batch, classified no-state → newIds / has-state → reviewIds. Cards
     already studied today are locked — they stay in the batch whatever the
     checkbox said (a grade committed today is not undone by un-picking).
     Added cards are unsuspended; not-yet-due learned adds are soft-pinned so
     they surface until studied today. The daily target is advisory — the
     batch may fall below or rise above it freely.
     @returns the updated batch */
  setFormulaDayPicks: function (deck, ids) {
    var self = this;
    var batch = this.formulaDay(deck);
    var byId = {};
    (deck || []).forEach(function (c) { byId[c.id] = c; });
    var keep = {};
    batch.reviewIds.concat(batch.newIds).forEach(function (id) {
      if (byId[id] && self.studiedToday(self.cardState(id))) keep[id] = 1;
    });
    var reviewIds = [], newIds = [], softIds = [], seen = {};
    function add(id) {
      if (!id || seen[id] || !byId[id]) return;
      seen[id] = 1;
      if (self.isSuspended(id)) self.unsuspendCard(id);
      var st = self.cardState(id);
      if (st) {
        reviewIds.push(id);
        if (!keep[id] && st.due > self.today()) softIds.push(id);
      } else {
        newIds.push(id);
      }
    }
    Object.keys(keep).forEach(add);
    (ids || []).forEach(add);
    batch.reviewIds = reviewIds;
    batch.newIds = newIds;
    if (softIds.length) batch.softIds = softIds;
    else delete batch.softIds;
    delete batch.skipNew;
    batch.date = this.today();
    PGRE.store.state.formulaDay = batch;
    PGRE.store.save();
    return batch;
  },

  suspendCard: function (id) {
    var s = PGRE.store.state;
    if (!s.formulaSuspended) s.formulaSuspended = {};
    s.formulaSuspended[id] = new Date().toISOString(); // ISO so tombstone ts can compare
    PGRE.store.untombstone('formulaSuspended', id);
    var batch = s.formulaDay;
    if (batch) {
      batch.reviewIds = batch.reviewIds.filter(function (x) { return x !== id; });
      batch.newIds = batch.newIds.filter(function (x) { return x !== id; });
      if (batch.softIds) {
        batch.softIds = batch.softIds.filter(function (x) { return x !== id; });
        if (!batch.softIds.length) delete batch.softIds;
      }
    }
  },

  unsuspendCard: function (id) {
    var susp = PGRE.store.state.formulaSuspended;
    if (susp) { delete susp[id]; PGRE.store.tombstone('formulaSuspended', id); }
  },

  isSuspended: function (id) {
    var susp = PGRE.store.state.formulaSuspended;
    return !!(susp && susp[id]);
  },

  /* ——— Per-card memorizing history (browse peek strip) ———
     Pure derivation over the append-only cardReviews log + optional schedule.
     Read-only: never mutates store, cards, or the log. Day index is 1-based
     whole days since the card's first surviving review date (inclusive),
     matching the Dn@grade reference pattern. The 8000-cap can drop early
     entries — the strip shows what remains, without inventing missing days. */

  /* Grades that gradeCard may write; anything else is corrupt and skipped. */
  MEM_GRADES: { again: 1, hard: 1, good: 1, easy: 1, mastered: 1 },

  /* Own-key only — never treat Object.prototype names (constructor, toString…)
     as grades. Used by the builder and by the view class-name policy. */
  isMemGrade: function (g) {
    return typeof g === 'string' &&
      Object.prototype.hasOwnProperty.call(this.MEM_GRADES, g);
  },

  /* Default max review chips painted per card (DOM bound). count still
     reflects the full filtered total when more exist. */
  MEM_HIST_MAX_CHIPS: 80,

  /* YYYY-MM-DD only — rejects non-strings and malformed stamps. */
  _isDayStr: function (d) {
    return typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
  },

  /* 1-based day index of dayStr relative to firstDay (both YYYY-MM-DD). */
  dayIndexFrom: function (firstDay, dayStr) {
    var a = new Date(firstDay + 'T12:00:00');
    var b = new Date(dayStr + 'T12:00:00');
    return Math.round((b - a) / 86400000) + 1;
  },

  /* Build a read-only timeline model for one card.
     reviews — full cardReviews array (or any array of { d, id, g, … })
     cardId  — formula card id to filter on
     opts    — optional {
                 due: 'YYYY-MM-DD'|null,
                 today: 'YYYY-MM-DD',
                 maxChips: number   // default MEM_HIST_MAX_CHIPS; 0 = unlimited
               }
               due paints a trailing scheduled chip; today labels it
               "due today" vs "next due". Missing/invalid opts are fine.
     Returns null when there are no usable reviews for this id.
     Does not mutate reviews or any store state. */
  buildMemHistory: function (reviews, cardId, opts) {
    opts = opts || {};
    if (!cardId || !Array.isArray(reviews)) return null;
    var mine = [];
    for (var i = 0; i < reviews.length; i++) {
      var r = reviews[i];
      if (!r || typeof r !== 'object') continue;
      if (r.id !== cardId) continue;
      if (!this._isDayStr(r.d)) continue;
      if (!this.isMemGrade(r.g)) continue;
      mine.push(r);
    }
    if (!mine.length) return null;

    var firstDay = mine[0].d;
    var lastDay = mine[0].d;
    var j;
    for (j = 0; j < mine.length; j++) {
      var e = mine[j];
      if (e.d < firstDay) firstDay = e.d;
      if (e.d > lastDay) lastDay = e.d;
    }
    // Second pass so day indices use the true earliest surviving day even if
    // the log is not sorted (defensive; gradeCard appends in order).
    var allChips = [];
    for (var k = 0; k < mine.length; k++) {
      var row = mine[k];
      allChips.push({
        kind: 'review',
        day: this.dayIndexFrom(firstDay, row.d),
        grade: row.g,
        d: row.d
      });
    }

    var total = allChips.length;
    var maxChips = opts.maxChips;
    if (maxChips == null || maxChips === undefined) maxChips = this.MEM_HIST_MAX_CHIPS;
    maxChips = Number(maxChips);
    if (!isFinite(maxChips) || maxChips < 0) maxChips = this.MEM_HIST_MAX_CHIPS;
    // 0 = unlimited (tests); otherwise keep the most recent chips.
    var chips = allChips;
    var chipsTruncated = false;
    if (maxChips > 0 && total > maxChips) {
      chips = allChips.slice(total - maxChips);
      chipsTruncated = true;
    }

    var pending = null;
    var due = opts.due;
    if (this._isDayStr(due)) {
      var today = this._isDayStr(opts.today) ? opts.today : null;
      var dueDay = this.dayIndexFrom(firstDay, due);
      var label = (today && due <= today) ? 'due today' : 'next due';
      // When due predates the surviving first day (8000-cap loss or bad due),
      // omit the day number rather than inventing D1 next to a real D1@grade.
      pending = {
        kind: 'pending',
        day: dueDay >= 1 ? dueDay : null,
        label: label,
        d: due
      };
    }

    return {
      firstDay: firstDay,
      lastDay: lastDay,
      count: total,
      chips: chips,
      chipsTruncated: chipsTruncated,
      pending: pending
    };
  }
};
