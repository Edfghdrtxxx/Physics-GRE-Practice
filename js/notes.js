/* Per-question margin notes & bookmarks — the storage API only; the browsing
   view (js/view-notes.js) and the note/bookmark buttons in practice build on
   this. State (see store.js defaults):
     notes:     qid -> { text, updatedAt }
     bookmarks: qid -> ISO timestamp */
window.PGRE = window.PGRE || {};

PGRE.notes = {
  get: function (qid) {
    var rec = PGRE.store.state.notes[qid];
    return rec ? rec.text : '';
  },

  /* Text is trimmed; saving an empty note deletes the entry. */
  set: function (qid, text) {
    var s = PGRE.store.state;
    text = String(text == null ? '' : text).trim();
    if (text) s.notes[qid] = { text: text, updatedAt: new Date().toISOString() };
    else delete s.notes[qid];
    PGRE.gamify.checkAchievements(); // before save() so a just-unlocked badge persists now
    PGRE.store.save();
  },

  /* Returns the new state: true = now bookmarked. */
  toggleBookmark: function (qid) {
    var s = PGRE.store.state;
    if (s.bookmarks[qid]) delete s.bookmarks[qid];
    else s.bookmarks[qid] = new Date().toISOString();
    PGRE.gamify.checkAchievements(); // before save() so a just-unlocked badge persists now
    PGRE.store.save();
    return !!s.bookmarks[qid];
  },

  isBookmarked: function (qid) {
    return !!PGRE.store.state.bookmarks[qid];
  },

  all: function () {
    var s = PGRE.store.state;
    return { notes: s.notes, bookmarks: s.bookmarks };
  }
};

/* ——— Browse-side query internals (the #/notes view builds on these) ———
   Added by the B5 notes agent; the get/set/toggleBookmark/isBookmarked/all
   signatures above stay untouched — other agents rely on them. */
(function () {
  function stripHtml(html) { return String(html == null ? '' : html).replace(/<[^>]*>/g, ' '); }

  /* Later ISO timestamp of the two (either may be null). */
  function maxIso(a, b) {
    if (!a) return b || null;
    if (!b) return a;
    return a > b ? a : b;
  }

  /* Header-tile totals: every note entry, every bookmark (orphans included). */
  PGRE.notes.counts = function () {
    var s = PGRE.store.state;
    return { notes: Object.keys(s.notes).length, bookmarks: Object.keys(s.bookmarks).length };
  };

  /* Joined, filtered, sorted list for the browser. Each row:
       { qid, q, topic, note, hasNote, bookmarked, updatedAt }
     q/topic are null for an id no longer in the bank (an orphan — the view
     renders those with a "not in the current bank" placeholder rather than
     dropping or crashing on them). opts:
       filter: 'all' | 'notes' | 'bookmarks'   (default 'all')
       topic:  topic id | 'all'                (default 'all')
       text:   substring over note text + question stem
     Sorted most-recently-updated first (a bookmark toggle counts as an update,
     so newly-starred rows surface). */
  PGRE.notes.list = function (opts) {
    opts = opts || {};
    var s = PGRE.store.state;
    var filter = opts.filter || 'all';
    var topic = opts.topic || 'all';
    var text = String(opts.text == null ? '' : opts.text).trim().toLowerCase();

    var ids = {}, id;
    for (id in s.notes) ids[id] = true;
    for (id in s.bookmarks) ids[id] = true;

    var out = [];
    for (id in ids) {
      var noteRec = s.notes[id];
      var noteText = noteRec ? noteRec.text : '';
      var hasNote = !!(noteRec && noteText);
      var bookmarked = !!s.bookmarks[id];

      if (filter === 'notes' && !hasNote) continue;
      if (filter === 'bookmarks' && !bookmarked) continue;

      var q = PGRE.questionById(id);
      if (topic !== 'all' && (!q || q.topic !== topic)) continue;

      if (text) {
        var hay = noteText.toLowerCase();
        if (q) hay += ' ' + stripHtml(q.q).toLowerCase();
        if (hay.indexOf(text) === -1) continue;
      }

      out.push({
        qid: id,
        q: q,
        topic: q ? PGRE.topicById(q.topic) : null,
        note: noteText,
        hasNote: hasNote,
        bookmarked: bookmarked,
        updatedAt: maxIso(noteRec ? noteRec.updatedAt : null, s.bookmarks[id] || null)
      });
    }

    out.sort(function (a, b) {
      var av = a.updatedAt || '', bv = b.updatedAt || '';
      return av < bv ? 1 : av > bv ? -1 : 0;
    });
    return out;
  };
})();
