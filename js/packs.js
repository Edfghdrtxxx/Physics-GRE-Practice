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

/* Most-similar-problem lookup for a formula card: the single practice-pool
   question that best matches the card. Similarity is deliberately
   deterministic and conservative:
   - intact exam questions are excluded explicitly (the spoiler rule in
     AGENTS.md applies here too, even though the default pool already
     filters them),
   - same topic is required, except circuit cards allow the book's lb↔em
     split,
   - score specific token overlap, weighting card identity (name/tag) and
     the question's subtopic over stems,
   - a positive score threshold is required; ties break on id.
   A card with no qualifying candidate returns null so callers can render
   an honest disabled control rather than an unrelated question. */
var _similarStop = {
  a: 1, an: 1, and: 1, are: 1, as: 1, at: 1, be: 1, by: 1, can: 1, do: 1,
  does: 1, for: 1, from: 1, given: 1, how: 1, if: 1, in: 1, into: 1, is: 1,
  it: 1, its: 1, of: 1, on: 1, or: 1, that: 1, the: 1, their: 1, then: 1,
  there: 1, these: 1, this: 1, to: 1, was: 1, what: 1, when: 1, which: 1,
  with: 1, you: 1,
  accurately: 1, expressed: 1, dependence: 1, angular: 1, frequency: 1,
  circuit: 1, connected: 1, series: 1, parallel: 1, voltage: 1, current: 1,
  supply: 1, element: 1, elements: 1, total: 1, closed: 1, loop: 1,
  flowing: 1, node: 1, rule: 1, around: 1, across: 1, power: 1, dissipated: 1,
  time: 1, constant: 1, magnitude: 1,
  one: 1, two: 1, three: 1, four: 1, five: 1, first: 1, second: 1
};

function _similarPlain(value) {
  return String(value == null ? '' : value)
    .replace(/\\(omega|Delta|theta|lambda|mu|epsilon|hbar)\b/gi, ' $1 ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .toLowerCase();
}

function _similarTokens(parts) {
  var out = Object.create(null);
  var aliases = {
    circuits: 'circuit', capacitors: 'capacitor', capacitance: 'capacitor',
    inductors: 'inductor', inductance: 'inductor', resistors: 'resistor',
    resistances: 'resistor', reactances: 'reactance', admittances: 'admittance',
    phasors: 'phasor'
  };
  var shortWords = { ac: 1, dc: 1, lc: 1, rc: 1, rl: 1, emf: 1 };
  (parts || []).forEach(function (part) {
    _similarPlain(part).split(/\s+/).forEach(function (word) {
      if (word.length < 3 && !shortWords[word]) return;
      word = aliases[word] || word;
      if (_similarStop[word]) return;
      out[word] = 1;
    });
  });
  return out;
}

/* Question tokenization is the expensive half of the scan and the pool is
   stable within a page load, so cache it per question object. */
var _similarQTokens = (typeof WeakMap === 'function') ? new WeakMap() : null;

function _similarQuestionTokens(q) {
  var hit = _similarQTokens && _similarQTokens.get(q);
  if (hit) return hit;
  var tokens = {
    sub: _similarTokens([q.subtopic]),
    stem: _similarTokens([q.q, (q.choices || []).join(' ')])
  };
  if (_similarQTokens) _similarQTokens.set(q, tokens);
  return tokens;
}

PGRE.similarProblemFor = function (card) {
  if (!card || typeof PGRE.allQuestions !== 'function') return null;
  var identity = _similarTokens([card.name, card.tag]);
  var body = _similarTokens([
    card.front, card.back, card.note,
    Array.isArray(card.aliases) ? card.aliases.join(' ') : card.aliases
  ]);
  var circuit = { circuit: 1, impedance: 1, capacitor: 1, capacitance: 1,
    inductor: 1, inductance: 1, resistor: 1, resistance: 1, phasor: 1,
    reactance: 1, admittance: 1 };
  var best = null, bestScore = 2;
  PGRE.allQuestions().forEach(function (q) {
    if (!q || !q.id || q.src === 'ets-exam' || q.src === 'cpg-exam') return;
    var topicOK = q.topic === card.topic;
    if (!topicOK && (
      (card.topic === 'lb' && q.topic === 'em') ||
      (card.topic === 'em' && q.topic === 'lb')
    )) {
      topicOK = Object.keys(circuit).some(function (word) { return identity[word] || body[word]; });
    }
    if (!topicOK) return;
    var qt = _similarQuestionTokens(q);
    var score = 0, hits = 0, specificHit = false;
    Object.keys(identity).forEach(function (word) {
      if (qt.sub[word]) { score += 5; hits++; specificHit = specificHit || !!circuit[word]; }
      else if (qt.stem[word]) { score += 4; hits++; specificHit = specificHit || !!circuit[word]; }
    });
    Object.keys(body).forEach(function (word) {
      if (identity[word]) return;
      if (qt.sub[word]) { score += 3; hits++; specificHit = specificHit || !!circuit[word]; }
      else if (qt.stem[word]) { score += 2; hits++; specificHit = specificHit || !!circuit[word]; }
    });
    if (!hits || (hits < 2 && score < 5 && !specificHit)) return;
    if (score > bestScore ||
        (score === bestScore && best && String(q.id).localeCompare(String(best.id)) < 0)) {
      bestScore = score;
      best = q;
    }
  });
  return best;
};

/* One-question handoff into #/practice/custom — the same sessionStorage
   contract launchPack uses, but for a single id, so it cannot go through
   launchCustomQuiz (which requires exactly three). purpose: 'similar' marks
   the session so a stale saved practice run can never resume over it.
   storage and loc are injectable so Node tests can drive the shipped
   function. */
PGRE.launchSimilarProblem = function (card, storage, loc) {
  var q = PGRE.similarProblemFor(card);
  if (!q) return null;
  var store = storage;
  if (!store && typeof sessionStorage !== 'undefined') store = sessionStorage;
  if (!store || typeof store.setItem !== 'function') return null;
  var cfg = { ids: [q.id], label: 'Similar problem', purpose: 'similar' };
  try {
    store.setItem('pgre-quiz-config', JSON.stringify(cfg));
    if (typeof store.removeItem === 'function') store.removeItem('pgre-practice-session');
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
