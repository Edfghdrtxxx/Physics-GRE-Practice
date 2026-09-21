/* Topic-set packs: lookup + one-shot launch into custom practice.
   Pack membership lives in js/data-packs.js (id → { ids, n, label }).
   Launch writes sessionStorage['pgre-quiz-config'] = { ids, label } and
   routes to #/practice/custom — the same handoff view-build.js uses.
   storage and loc are injectable so Node tests can drive the shipped
   function without a browser. */
window.PGRE = window.PGRE || {};

PGRE.packId = function (raw) {
  var s = String(raw == null ? '' : raw).trim();
  s = s.replace(/^pack[-_]?/i, '').replace(/^set[-_]?/i, '');
  if (!/^\d{1,2}$/.test(s)) return null;
  var n = parseInt(s, 10);
  if (n < 1 || n > 35) return null;
  return n < 10 ? '0' + n : String(n);
};

PGRE.packById = function (raw) {
  var id = PGRE.packId(raw);
  if (!id || !PGRE.PACKS || !PGRE.PACKS[id]) return null;
  var p = PGRE.PACKS[id];
  var ids = (p.ids || []).slice();
  return {
    id: id,
    title: p.title,
    label: p.label,
    n: p.n,
    ids: ids
  };
};

PGRE.launchPack = function (raw, storage, loc) {
  var pack = PGRE.packById(raw);
  if (!pack || !pack.ids.length) return null;
  var cfg = { ids: pack.ids.slice(), label: pack.label };
  var store = storage;
  if (!store && typeof sessionStorage !== 'undefined') store = sessionStorage;
  if (!store || typeof store.setItem !== 'function') return null;
  try {
    store.setItem('pgre-quiz-config', JSON.stringify(cfg));
  } catch (e) {
    return null;
  }
  var where = loc;
  if (!where && typeof location !== 'undefined') where = location;
  if (where) {
    var dest = '#/practice/custom';
    if (where.hash === dest) {
      // Same hash does not fire hashchange — remount so the new ids load.
      if (typeof PGRE.route === 'function') PGRE.route();
    } else {
      where.hash = dest;
    }
  }
  return cfg;
};
function learnTerms(values) {
  var stop = {
    a: 1, an: 1, and: 1, are: 1, be: 1, by: 1, for: 1, from: 1,
    how: 1, in: 1, is: 1, of: 1, on: 1, or: 1, the: 1, to: 1,
    what: 1, when: 1, with: 1
  };
  var seen = {};
  var out = [];
  (values || []).forEach(function (value) {
    String(value || '').toLowerCase()
      .replace(/<[^>]*>/g, ' ')
      .replace(/\\[a-z]+/g, ' ')
      .split(/[^a-z0-9]+/)
      .forEach(function (word) {
        if (word.length < 3 || stop[word] || seen[word]) return;
        seen[word] = true;
        out.push(word);
      });
  });
  return out;
}

PGRE.selectLearnQuestions = function (opts) {
  opts = opts || {};
  var count = opts.count == null ? 3 : Number(opts.count);
  if (count !== 3 || typeof PGRE.allQuestions !== 'function') return null;
  var topicValues = opts.topicIds;
  if (topicValues == null) topicValues = opts.topic_id;
  if (topicValues == null) topicValues = opts.topicId;
  if (!Array.isArray(topicValues)) topicValues = topicValues == null ? [] : [topicValues];
  var topics = {};
  topicValues.forEach(function (id) { topics[String(id)] = true; });
  var subtopics = opts.subtopics;
  if (subtopics == null) subtopics = opts.subtopic;
  if (!Array.isArray(subtopics)) subtopics = subtopics == null ? [] : [subtopics];
  var concepts = Array.isArray(opts.concepts) ? opts.concepts : (opts.concepts == null ? [] : [opts.concepts]);
  var weakSpots = opts.weakSpots;
  if (weakSpots == null) weakSpots = opts.weak_spots;
  if (!Array.isArray(weakSpots)) weakSpots = weakSpots == null ? [] : [weakSpots];
  var terms = learnTerms(subtopics.concat(concepts));
  var weakTerms = learnTerms(weakSpots);
  var excluded = {};
  (opts.excludeIds || []).forEach(function (id) { excluded[String(id)] = true; });
  var attempted = PGRE.store && PGRE.store.state && PGRE.store.state.questions || {};
  var rows = PGRE.allQuestions().filter(function (q) {
    return q && q.id && q.src !== 'ets-exam' && q.src !== 'cpg-exam' && !excluded[q.id];
  }).map(function (q) {
    var topic = String(q.topic || q.topic_id || '');
    var sub = String(q.subtopic || '').toLowerCase();
    var text = String(q.q || '').toLowerCase();
    var score = topics[topic] ? 100 : 0;
    terms.forEach(function (term) {
      if (sub.indexOf(term) !== -1) score += 45;
      else if (text.indexOf(term) !== -1) score += 10;
    });
    weakTerms.forEach(function (term) {
      if (sub.indexOf(term) !== -1) score += 20;
      else if (text.indexOf(term) !== -1) score += 6;
    });
    if (!attempted[q.id]) score += 5;
    if (opts.difficulty != null && isFinite(Number(q.difficulty))) {
      var distance = Math.abs(Number(q.difficulty) - Number(opts.difficulty));
      score += distance === 0 ? 8 : distance === 1 ? 3 : 0;
    }
    return { id: q.id, score: score };
  }).sort(function (a, b) {
    return b.score - a.score || String(a.id).localeCompare(String(b.id));
  });
  if (rows.length < count) return null;
  return rows.slice(0, count).map(function (row) { return row.id; });
};

PGRE.launchLearnDrill = function (opts, storage, loc) {
  opts = opts || {};
  var ids = Array.isArray(opts.ids) ? opts.ids.slice() : PGRE.selectLearnQuestions(opts);
  if (!ids) return null;
  var next = {};
  Object.keys(opts).forEach(function (key) { next[key] = opts[key]; });
  next.ids = ids;
  next.label = opts.label || 'Learn transfer · 3 GRE questions';
  return PGRE.launchCustomQuiz(next, storage, loc);
};

/* Learn transfer handoff: the Learn drill trigger supplies the exact three
   bank ids after matching the session's concepts. This stays separate from
   timed packs so it never touches plan tasks or pack receipts. */
PGRE.launchCustomQuiz = function (opts, storage, loc) {
  opts = opts || {};
  var ids = Array.isArray(opts.ids) ? opts.ids.slice() : [];
  if (ids.length !== 3) return null;
  var eligible = null;
  if (typeof PGRE.allQuestions === 'function') {
    eligible = {};
    PGRE.allQuestions().forEach(function (q) {
      if (!q || !q.id || q.src === 'ets-exam' || q.src === 'cpg-exam') return;
      eligible[q.id] = true;
    });
  }
  var seen = {};
  for (var i = 0; i < ids.length; i++) {
    if (typeof ids[i] !== 'string' || !ids[i] || seen[ids[i]]) return null;
    seen[ids[i]] = true;
    if (eligible && !eligible[ids[i]]) return null;
    if (!eligible && typeof PGRE.questionById === 'function') {
      var q = PGRE.questionById(ids[i]);
      if (!q || q.src === 'ets-exam' || q.src === 'cpg-exam') return null;
    }
  }
  var store = storage;
  if (!store && typeof sessionStorage !== 'undefined') store = sessionStorage;
  if (!store || typeof store.setItem !== 'function') return null;
  var cfg = {
    ids: ids,
    label: String(opts.label || 'Learn transfer · 3 GRE questions'),
    learnDrill: true,
    purpose: 'learn-drill',
    topicIds: Array.isArray(opts.topicIds) ? opts.topicIds.slice() : [],
    subtopics: Array.isArray(opts.subtopics) ? opts.subtopics.slice() : [],
    concepts: Array.isArray(opts.concepts) ? opts.concepts.slice() : [],
    weakSpots: Array.isArray(opts.weakSpots) ? opts.weakSpots.slice() : [],
    difficulty: opts.difficulty == null ? null : opts.difficulty
  };
  try {
    store.setItem('pgre-quiz-config', JSON.stringify(cfg));
  } catch (e) {
    return null;
  }
  var where = loc;
  if (!where && typeof location !== 'undefined') where = location;
  if (where) {
    var dest = '#/practice/custom';
    if (where.hash === dest) {
      if (typeof PGRE.route === 'function') PGRE.route();
    } else {
      where.hash = dest;
    }
  }
  return cfg;
};
