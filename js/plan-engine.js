/* Plan task resolver.
   Weeks in PGRE.PLAN carry no static .tasks — the vault calendar has a Set 02
   carry rule that depends on whether set-02 was finished before 2026-09-14, so
   the task list is resolved at runtime by PGRE.weekTasks(w).
   Carry: if state.plan['set-02'] has no done timestamp, or the LOCAL calendar
   date of that timestamp (getFullYear/getMonth/getDate, not the ISO prefix)
   is on/after the carry deadline, W1 timed becomes 02–06 and Set 07 is an
   extra-set on W1 and W2 (only if misses are empty). Otherwise W1 timed is
   the table default 03–07.
   If PGRE.store / state.plan is unavailable, every task is treated as undone
   (so the carry applies). */
window.PGRE = window.PGRE || {};

PGRE.planWeeks = function () {
  var out = [];
  PGRE.PLAN.forEach(function (phase) {
    phase.weeks.forEach(function (w) { out.push({ phase: phase, week: w }); });
  });
  return out;
};

PGRE.currentWeek = function (dateStr) {
  var d = dateStr || PGRE.store.today();
  var all = PGRE.planWeeks();
  for (var i = 0; i < all.length; i++) {
    if (d >= all[i].week.start && d <= all[i].week.end) return all[i];
  }
  if (d < all[0].week.start) return all[0];
  return all[all.length - 1];
};

PGRE.weekTasks = function (w) {
  var tasks = [];
  if (!w) return tasks;

  function pad2(n) {
    n = String(n);
    return n.length < 2 ? '0' + n : n;
  }
  function setTitle(n) {
    var id = pad2(n);
    return (PGRE.PLAN_SETS && PGRE.PLAN_SETS[id]) || ('Set ' + id);
  }
  function localDay(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var y = d.getFullYear();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return y + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }
  function planRec(id) {
    if (!PGRE.store || !PGRE.store.state || !PGRE.store.state.plan) return null;
    return PGRE.store.state.plan[id] || null;
  }
  function findCarrySpec() {
    if (w.carry) return w.carry;
    var phases = PGRE.PLAN || [];
    for (var i = 0; i < phases.length; i++) {
      var list = phases[i].weeks || [];
      for (var j = 0; j < list.length; j++) {
        if (list[j].carry) return list[j].carry;
      }
    }
    return null;
  }
  function isCarried(spec) {
    if (!spec) return false;
    var rec = planRec('set-' + pad2(spec.set));
    if (!rec || !rec.done) return true;
    return localDay(rec.done) >= spec.deadline;
  }

  var spec = findCarrySpec();
  var carried = isCarried(spec);
  var timed = (w.timedSets || []).slice();
  if (carried && w.carry && w.carry.timed) timed = w.carry.timed.slice();

  var isW0 = !!(w.historical || w.id === 'w0');
  var mins = isW0 ? '~60 min' : '~100 min';
  var timedHours = isW0 ? 1 : 1.7;
  timed.forEach(function (n) {
    var id = 'set-' + pad2(n);
    tasks.push({
      id: id,
      label: 'Set ' + pad2(n) + ' · ' + setTitle(n) + ' — timed (' + mins + ')',
      hours: timedHours,
      xp: 20,
      kind: 'timed'
    });
  });

  var extraNums = w.carryExtras || [];
  if (carried && extraNums.length) {
    extraNums.forEach(function (n) {
      tasks.push({
        id: 'set-' + pad2(n),
        label: 'Set ' + pad2(n) + ' · ' + setTitle(n) +
          ' — extra (~50 min, carried; only if misses are empty)',
        hours: 0.9,
        xp: 15,
        kind: 'extra-set'
      });
    });
  }

  if (!isW0) {
    var leftover = '';
    if (w.id === 'w1' || w.id === 'w2') leftover = '; then Set 07 if carried';
    else if (w.id === 'w6') leftover = '; then Set 30';
    else if (w.id === 'w7') leftover = '; deferred 30/31/34/35 after misses';
    tasks.push({
      id: w.id + '-formula',
      label: 'Formula recall ×6 — 20 formulas/session (~50 min each)',
      hours: 5,
      xp: 15,
      kind: 'formula'
    });
    tasks.push({
      id: w.id + '-extra',
      label: 'Extra ×2 (~50 min each) — misses-first' + leftover,
      hours: 1.7,
      xp: 15,
      kind: 'extra'
    });
  }

  // Mock tasks come from the generated week.mocks (Mock schedule in the
  // syllabus). A checkpoint whose label already names that form is the same
  // sitting — emit the mock row instead of duplicating it.
  var mockIds = (w.mocks || []).map(function (t) { return String(t.id).toLowerCase(); });
  if (w.checkpoint) {
    var covered = mockIds.some(function (id) {
      return w.checkpoint.label.toLowerCase().indexOf(id) !== -1;
    });
    if (!covered) {
      tasks.push({
        id: w.checkpoint.id,
        label: w.checkpoint.label,
        hours: 2, xp: 30, kind: 'checkpoint'
      });
    }
  }
  (w.mocks || []).forEach(function (t) {
    tasks.push({ id: t.id, label: t.label, hours: t.hours, xp: t.xp, kind: 'mock' });
  });

  if (w.reviewSlot) {
    tasks.push({
      id: 'w4-review',
      label: 'Thermo review slot — timed (~100 min)',
      hours: 1.7,
      xp: 15,
      kind: 'review'
    });
  }

  if (w.id === 'w7') {
    tasks.push({
      id: 'w7-replay-1',
      label: 'Replay latest miss-heavy set (else Set 32) — timed slot',
      hours: 1.7, xp: 15, kind: 'replay'
    });
    tasks.push({
      id: 'w7-replay-2',
      label: 'Replay latest miss-heavy set (else Set 32) — timed slot',
      hours: 1.7, xp: 15, kind: 'replay'
    });
    tasks.push({
      id: 'w7-logistics',
      label: 'Fri — logistics & formula sheet; no timed set',
      hours: 1, xp: 10, kind: 'logistics'
    });
    tasks.push({
      id: 'w7-rest',
      label: 'Sat — sleep & travel; no timed set',
      hours: 0.5, xp: 5, kind: 'rest'
    });
    tasks.push({
      id: 'w7-exam',
      label: 'Sun Nov 1 — EXAM DAY, 14:00 STN80177D (arrive 13:30)',
      hours: 0.5, xp: 50, kind: 'exam'
    });
  }

  return tasks;
};
