/* Topic portal — one per knowledge area: stats, subtopics, practice entry
   points, and the notes section fed by the imported book markdown. */
window.PGRE = window.PGRE || {};
PGRE.views = PGRE.views || {};

PGRE.views.topic = {
  render: function (params) {
    var t = PGRE.topicById(params.id);
    if (!t) return '<p>Unknown topic.</p>';
    var ui = PGRE.ui, g = PGRE.gamify, s = PGRE.store.state;
    var rec = s.topics[t.id] || { attempted: 0, correct: 0, xp: 0 };
    var acc = rec.attempted ? Math.round(100 * rec.correct / rec.attempted) + '%' : '—';
    var mastery = g.mastery(t.id);
    var bank = PGRE.questionsForTopic(t.id);

    // Break the topic bank down by source so the copy reflects what is actually
    // loaded: 'cpg' rows come from the imported book, everything else is preview.
    var bookCount = 0;
    bank.forEach(function (q) { if (q && q.src === 'cpg') bookCount++; });
    var previewCount = bank.length - bookCount;
    var bankSub, practiceCopy;
    if (bookCount > 0) {
      bankSub = previewCount > 0
        ? bookCount + ' book · ' + previewCount + ' preview'
        : 'from the book';
      practiceCopy = 'The bank holds ' + bank.length + ' question' + (bank.length === 1 ? '' : 's') +
        ' for this topic, drawn from Conquering the Physics GRE' +
        (previewCount > 0 ? ' plus the preview set.' : '.');
    } else {
      bankSub = 'preview set';
      practiceCopy = 'The bank holds ' + bank.length + ' preview question' + (bank.length === 1 ? '' : 's') +
        ' for this topic — it grows when the book content is imported.';
    }

    var html = '<div class="card portal-head">' +
      '<div class="portal-title">' + ui.monogram(t) +
        '<div><h1>' + t.name + '</h1>' +
        '<div class="muted">' + ui.esc(t.blurb) + ' · <strong>' + t.weight + '%</strong> of the exam</div></div>' +
      '</div>' +
      '<div class="chip-row">';
    t.subtopics.forEach(function (st) { html += '<span class="chip">' + ui.esc(st) + '</span>'; });
    html += '</div></div>';

    html += '<div class="stat-row">' +
      ui.statTile('Mastery', mastery + '%') +
      ui.statTile('Attempted', ui.fmt(rec.attempted)) +
      ui.statTile('Accuracy', acc) +
      ui.statTile('Topic XP', ui.fmt(rec.xp || 0)) +
      ui.statTile('In bank', bank.length + ' <span class="stat-unit">questions</span>', bankSub) +
    '</div>';

    // Split the bank by whether each question has been attempted at least once
    // (same state.questions criterion as the quiz builder's "unseen" filter —
    // practice, drills and mock exams all count).
    var doneQs = [], newQs = [];
    bank.forEach(function (q) {
      var r = s.questions[q.id];
      ((r && r.attempts > 0) ? doneQs : newQs).push(q);
    });
    var covPct = bank.length ? Math.round(100 * doneQs.length / bank.length) : 0;

    html += '<div class="card"><h2>Practice</h2>' +
      '<p class="muted">' + practiceCopy + ' You have done <strong>' + doneQs.length +
        ' of ' + bank.length + '</strong> at least once.</p>' +
      ui.meter(covPct, 'meter-thin') +
      '<div class="portal-split">' +
        '<div class="portal-group">' +
          '<div class="portal-group-num">' + newQs.length + '</div>' +
          '<div class="portal-group-label">not yet done</div>' +
          (newQs.length
            ? '<a class="btn btn-primary btn-sm" href="#/practice/' + t.id + '/new">Practice these</a>'
            : '<span class="muted">all done ✓</span>') +
        '</div>' +
        '<div class="portal-group">' +
          '<div class="portal-group-num">' + doneQs.length + '</div>' +
          '<div class="portal-group-label">done at least once</div>' +
          (doneQs.length
            ? '<a class="btn btn-ghost btn-sm" href="#/practice/' + t.id + '/done">Redo these</a>'
            : '<span class="muted">none yet</span>') +
        '</div>' +
      '</div>' +
      '<div class="btn-row">' +
        '<a class="btn btn-ghost" href="#/practice/' + t.id + '">Practice everything (' + bank.length + ')</a>' +
        '<a class="btn btn-ghost" href="#/practice/all">Mixed practice (all topics)</a>' +
      '</div></div>';

    html += '<div class="card" id="notes-card"><h2>Notes & reading</h2><div id="notes-body">' +
      '<p class="muted">Loading…</p></div></div>';

    return html;
  },

  mount: function (params) {
    var t = PGRE.topicById(params.id);
    if (!t) return;
    PGRE.gamify.noteVisited();

    var body = document.getElementById('notes-body');
    PGRE.contentDB.all().then(function (files) {
      var sections = [];
      files.forEach(function (f) {
        (f.chapters || []).forEach(function (ch, idx) {
          if (f.mapping && f.mapping[idx] === t.id) {
            sections.push({ file: f.name, title: ch.title, text: ch.text });
          }
        });
      });

      if (sections.length === 0) {
        body.innerHTML =
          '<div class="placeholder">' +
            '<p><strong>Waiting for “Conquering the Physics GRE”.</strong></p>' +
            '<p class="muted">When the book markdown arrives, import it in the ' +
            '<a href="#/library">Library</a> and assign its chapters to topics — the ' +
            'matching chapters will render here (with math typeset offline via KaTeX).</p>' +
          '</div>';
        return;
      }

      var html = '';
      sections.forEach(function (sec, i) {
        html += '<details class="note-chapter"' + (i === 0 ? ' open' : '') + '>' +
          '<summary>' + PGRE.ui.esc(sec.title) +
          ' <span class="muted">· ' + PGRE.ui.esc(sec.file) + '</span></summary>' +
          '<div class="note-md">' + PGRE.renderMarkdown(sec.text) + '</div>' +
        '</details>';
      });
      body.innerHTML = html;
      PGRE.typesetMath(body);
    });
  }
};
