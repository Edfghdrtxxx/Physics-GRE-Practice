/* Mock exam — designed but deferred until the real question bank arrives.
   This page summarizes the design; the full spec lives in docs/Project Docs/DESIGN.md. */
window.PGRE = window.PGRE || {};
PGRE.views = PGRE.views || {};

PGRE.views.exam = {
  render: function () {
    return '' +
    '<div class="card"><h1>Timed mock exam <span class="soon-chip">coming soon</span></h1>' +
      '<p class="muted">The simulator is designed and reserved here. It activates once the real ' +
      'question bank from <em>Conquering the Physics GRE</em> and/or released ETS exams is imported — ' +
      '20 preview questions are not enough for a meaningful full-length simulation.</p>' +
    '</div>' +
    '<div class="card"><h2>What it will do</h2>' +
      '<ul class="doc-list">' +
        '<li><strong>Current format:</strong> 70 questions · 2 hours (revised Sept 2023 test). A legacy mode (100 questions · 170 min) matches the released practice PDFs GR8677–GR1777.</li>' +
        '<li><strong>Exam room UI:</strong> countdown timer, question palette with flag-for-review, skip &amp; return, no feedback until submission.</li>' +
        '<li><strong>Scoring:</strong> raw score with an approximate scaled-score conversion, plus a per-topic breakdown that feeds the weak-topic list used in Phase 3 of the plan.</li>' +
        '<li><strong>Gamification:</strong> completion XP, dedicated achievements, and results logged to the dashboard.</li>' +
      '</ul>' +
      '<p class="muted">Full specification: <code>docs/Project Docs/DESIGN.md</code> in the project folder.</p>' +
      '<div class="btn-row"><button class="btn btn-primary" disabled>Start simulation</button>' +
      '<a class="btn btn-ghost" href="#/practice/all">Do a practice set instead →</a></div>' +
    '</div>' +
    '<div class="card"><h2>Until then: paper tests in the plan</h2>' +
      '<p class="muted">Phases 2–3 of the <a href="#/plan">study plan</a> schedule five released ETS exams ' +
      '(GR8677, GR9277, GR9677, GR0177, GR1777) taken on paper under time. Log their scores as plan tasks — ' +
      'the simulator will replace this workflow when it lands.</p>' +
    '</div>';
  }
};
