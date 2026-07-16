/* Custom quiz builder (proposal #3) — build a practice set by topic(s),
   difficulty and status (unseen / previously missed / slowest / bookmarked),
   with an optional "include sample-exam questions" source toggle and a live
   match-count preview. Start writes sessionStorage['pgre-quiz-config'] =
   { ids, label } and routes to #/practice/custom, where view-practice consumes
   it. Deep link #/build/topic-<id> pre-selects a topic. */
window.PGRE = window.PGRE || {};
PGRE.views = PGRE.views || {};

PGRE.views.build = (function () {
  var STATUS = [
    { key: 'unseen', label: 'Unseen', hint: 'never attempted' },
    { key: 'missed', label: 'Previously missed', hint: 'in your mistake book' },
    { key: 'slowest', label: 'Slowest', hint: 'above your median time' },
    { key: 'bookmarked', label: 'Bookmarked', hint: 'starred questions' }
  ];
  var STATUS_LABEL = { unseen: 'unseen', missed: 'missed', slowest: 'slowest', bookmarked: 'bookmarked' };

  // selection buckets (objects used as sets)
  var sel;

  function resetSel() {
    sel = { topics: {}, diffs: {}, statuses: {}, includeExam: false };
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  /* ——— Status membership (computed from state, as the brief specifies) ——— */
  function statusContext() {
    var s = PGRE.store.state;
    var seen = {}, missed = {}, bookmarked = {};
    for (var qid in s.questions) if (s.questions[qid] && s.questions[qid].attempts > 0) seen[qid] = true;
    for (var mid in s.mistakes) missed[mid] = true;
    for (var bid in s.bookmarks) bookmarked[bid] = true;

    // slowest: average answered ms per question; membership = at/above the median
    // of all timed questions (the slower half).
    var agg = {};
    s.attempts.forEach(function (a) {
      if (a.ms == null) return;
      var m = agg[a.qid] || (agg[a.qid] = { sum: 0, n: 0 });
      m.sum += a.ms; m.n += 1;
    });
    var avgs = [];
    var avgByQid = {};
    for (var aqid in agg) {
      var v = agg[aqid].sum / agg[aqid].n;
      avgByQid[aqid] = v;
      avgs.push(v);
    }
    avgs.sort(function (x, y) { return x - y; });
    var median = avgs.length ? avgs[Math.floor((avgs.length - 1) / 2)] : Infinity;
    var slowest = {};
    for (var sqid in avgByQid) if (avgByQid[sqid] >= median) slowest[sqid] = true;

    return { seen: seen, missed: missed, bookmarked: bookmarked, slowest: slowest };
  }

  function matchesStatus(q, keys, ctx) {
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (k === 'unseen' && !ctx.seen[q.id]) return true;
      if (k === 'missed' && ctx.missed[q.id]) return true;
      if (k === 'slowest' && ctx.slowest[q.id]) return true;
      if (k === 'bookmarked' && ctx.bookmarked[q.id]) return true;
    }
    return false;
  }

  function matching() {
    var pool = PGRE.allQuestions(sel.includeExam ? { includeExam: true } : {});
    var topicKeys = Object.keys(sel.topics);
    var diffKeys = Object.keys(sel.diffs);
    var statusKeys = Object.keys(sel.statuses);
    var ctx = statusKeys.length ? statusContext() : null;
    return pool.filter(function (q) {
      if (topicKeys.length && !sel.topics[q.topic]) return false;
      if (diffKeys.length && !sel.diffs[String(q.difficulty)]) return false;
      if (ctx && !matchesStatus(q, statusKeys, ctx)) return false;
      return true;
    });
  }

  function buildLabel(n) {
    var parts = [];
    var tk = Object.keys(sel.topics);
    if (tk.length) {
      parts.push(tk.map(function (id) {
        var t = PGRE.topicById(id); return t ? t.short : id;
      }).join('/'));
    } else {
      parts.push('All topics');
    }
    var dk = Object.keys(sel.diffs).map(Number).sort();
    if (dk.length && dk.length < 3) parts.push('diff ' + dk.join('/'));
    var sk = Object.keys(sel.statuses);
    if (sk.length) parts.push(sk.map(function (k) { return STATUS_LABEL[k]; }).join('+'));
    if (sel.includeExam) parts.push('+exam');
    return 'Custom · ' + parts.join(' · ') + ' · ' + n + ' Q';
  }

  /* ——— Live preview + count picker ——— */
  function updatePreview() {
    var matches = matching();
    var n = matches.length;

    var prev = document.getElementById('build-preview');
    if (prev) {
      prev.innerHTML = '<span class="build-count-num">' + n + '</span> question' +
        (n === 1 ? '' : 's') + ' match your filters.';
    }

    var cnt = document.getElementById('build-count');
    if (!cnt) return;
    var counts = [5, 10, 20].filter(function (c) { return c < n; });
    var html = '';
    counts.forEach(function (c) {
      html += '<button class="btn btn-ghost" data-start="' + c + '">' + c + ' questions</button>';
    });
    html += '<button class="btn btn-primary" data-start="' + n + '"' + (n ? '' : ' disabled') + '>' +
      (n ? 'Start all ' + n : 'No matches') + '</button>';
    cnt.innerHTML = html;
    cnt.querySelectorAll('[data-start]').forEach(function (b) {
      b.addEventListener('click', function () {
        startQuiz(parseInt(b.getAttribute('data-start'), 10));
      });
    });
  }

  function startQuiz(count) {
    var ids = shuffle(matching().map(function (q) { return q.id; })).slice(0, count);
    if (!ids.length) return;
    var cfg = { ids: ids, label: buildLabel(ids.length) };
    try { sessionStorage.setItem('pgre-quiz-config', JSON.stringify(cfg)); }
    catch (e) { PGRE.toast('Could not start the set (storage blocked).', 'error'); return; }
    location.hash = '#/practice/custom';
  }

  /* ——— Chip groups ——— */
  function chip(attr, val, inner, active) {
    return '<button class="filter-btn build-chip' + (active ? ' active' : '') + '" ' +
      attr + '="' + val + '">' + inner + '</button>';
  }

  function render(params) {
    var ui = PGRE.ui;
    var html = '<div class="card"><h1>Custom quiz</h1>' +
      '<p class="muted">Assemble a practice set the way UWorld does — pick topics, ' +
      'difficulty and status, then start. Nothing is timed here; misses still feed the ' +
      '<a href="#/mistakes">mistake book</a>.</p></div>';

    html += '<div class="card build-section"><h2>Topics</h2>' +
      '<p class="muted">Leave all off for a mix across every topic.</p>' +
      '<div class="build-chips" id="build-topics">';
    PGRE.TOPICS.forEach(function (t) {
      html += chip('data-topic', t.id,
        '<span class="build-chip-mono">' + t.short + '</span>' + ui.esc(t.name), false);
    });
    html += '</div></div>';

    html += '<div class="card build-section"><h2>Difficulty</h2>' +
      '<div class="build-chips" id="build-diffs">';
    [1, 2, 3].forEach(function (d) {
      var name = d === 1 ? 'Intro' : d === 2 ? 'Standard' : 'Hard';
      html += chip('data-diff', d,
        '<span class="chip-diff-dots">' + '●'.repeat(d) + '○'.repeat(3 - d) + '</span> ' + name, false);
    });
    html += '</div></div>';

    html += '<div class="card build-section"><h2>Status</h2>' +
      '<p class="muted">Any selected status matches (e.g. missed or bookmarked). ' +
      'Computed from your attempt history.</p>' +
      '<div class="build-chips" id="build-statuses">';
    STATUS.forEach(function (st) {
      html += chip('data-status', st.key,
        st.label + ' <span class="build-chip-hint">' + st.hint + '</span>', false);
    });
    html += '</div></div>';

    html += '<div class="card build-section"><h2>Sources</h2>' +
      '<div class="build-chips">' +
        chip('data-source', 'exam',
          'Include sample-exam questions <span class="build-chip-hint">off keeps your mock sims fresh</span>', false) +
      '</div></div>';

    html += '<div class="card build-start-card">' +
      '<div class="build-preview" id="build-preview"></div>' +
      '<div class="btn-row build-count" id="build-count"></div>' +
    '</div>';

    return '<div id="build-root">' + html + '</div>';
  }

  return {
    render: render,
    mount: function (params) {
      resetSel();

      // deep link: #/build/topic-<id> pre-selects a topic
      var pre = params && params.sub;
      if (pre && pre.indexOf('topic-') === 0) {
        var tid = pre.slice('topic-'.length);
        if (tid && PGRE.topicById(tid)) sel.topics[tid] = true;
      }

      function wire(containerId, bucket) {
        var box = document.getElementById(containerId);
        if (!box) return;
        box.querySelectorAll('[data-' + bucket.attr + ']').forEach(function (b) {
          var key = b.getAttribute('data-' + bucket.attr);
          if (sel[bucket.set][key]) b.classList.add('active');
          b.addEventListener('click', function () {
            if (sel[bucket.set][key]) delete sel[bucket.set][key];
            else sel[bucket.set][key] = true;
            b.classList.toggle('active');
            updatePreview();
          });
        });
      }
      wire('build-topics', { attr: 'topic', set: 'topics' });
      wire('build-diffs', { attr: 'diff', set: 'diffs' });
      wire('build-statuses', { attr: 'status', set: 'statuses' });

      var srcBtn = document.querySelector('[data-source]');
      if (srcBtn) srcBtn.addEventListener('click', function () {
        sel.includeExam = !sel.includeExam;
        srcBtn.classList.toggle('active');
        updatePreview();
      });

      updatePreview();
    }
  };
})();
