/* Library — import the book markdown, map chapters to topics, manage local data.
   The real content parser is deferred until the actual file arrives
   (docs/Project Docs/DESIGN.md → Content pipeline); this view stores the raw markdown in
   IndexedDB, splits it naively on headings, and lets chapters be assigned to
   topic portals so their notes render there. */
window.PGRE = window.PGRE || {};
PGRE.views = PGRE.views || {};

PGRE.views.library = (function () {

  function fileCard(f) {
    var ui = PGRE.ui;
    var html = '<div class="card file-card" data-file="' + ui.esc(f.id) + '">' +
      '<div class="file-head"><h2>' + ui.esc(f.name) + '</h2>' +
      '<span class="muted">' + Math.round(f.size / 1024) + ' KB · ' + (f.chapters || []).length + ' section' +
      ((f.chapters || []).length === 1 ? '' : 's') + ' · imported ' + ui.timeAgo(f.added) + '</span></div>' +
      '<p class="muted">Assign each section to a knowledge portal — it will render on that topic’s Notes tab.</p>' +
      '<table class="map-table"><thead><tr><th>Section</th><th>Portal</th></tr></thead><tbody>';
    (f.chapters || []).forEach(function (ch, idx) {
      html += '<tr><td>' + ui.esc(ch.title) + '</td><td><select data-ch="' + idx + '">' +
        '<option value="">— unassigned —</option>';
      PGRE.TOPICS.forEach(function (t) {
        var sel = f.mapping && f.mapping[idx] === t.id ? ' selected' : '';
        html += '<option value="' + t.id + '"' + sel + '>' + t.name + '</option>';
      });
      html += '</select></td></tr>';
    });
    html += '</tbody></table>' +
      '<div class="btn-row"><button class="btn btn-danger-ghost" data-del="' + ui.esc(f.id) + '">Remove file</button></div>' +
      '</div>';
    return html;
  }

  function refreshFiles() {
    var box = document.getElementById('files-box');
    PGRE.contentDB.all().then(function (files) {
      // the formula deck (parser v2 output) shares the store but is not a book file
      files = files.filter(function (f) { return f.kind !== 'formula-deck'; });
      if (!files.length) {
        box.innerHTML = '<div class="card placeholder">' +
          '<p><strong>No content imported yet.</strong></p>' +
          '<p class="muted">This is where <em>Conquering the Physics GRE</em> lands when its markdown is ready. ' +
          'Drop the file above (or keep a copy in the <code>content/</code> folder). ' +
          'A proper parser — chapters, problems, solutions → question bank — is designed and will be built ' +
          'against the real file; see <code>docs/Project Docs/DESIGN.md</code>.</p></div>';
        return;
      }
      box.innerHTML = files.map(fileCard).join('');

      box.querySelectorAll('select[data-ch]').forEach(function (sel) {
        sel.addEventListener('change', function () {
          var fileId = sel.closest('[data-file]').getAttribute('data-file');
          PGRE.contentDB.get(fileId).then(function (f) {
            if (!f) return;
            f.mapping = f.mapping || {};
            var idx = parseInt(sel.getAttribute('data-ch'), 10);
            if (sel.value) f.mapping[idx] = sel.value; else delete f.mapping[idx];
            PGRE.contentDB.put(f).then(function () {
              PGRE.toast('Section mapping saved', 'info');
            });
          });
        });
      });

      box.querySelectorAll('[data-del]').forEach(function (b) {
        b.addEventListener('click', function () {
          if (!confirm('Remove this imported file? (Your XP and progress are unaffected.)')) return;
          PGRE.contentDB.del(b.getAttribute('data-del')).then(refreshFiles);
        });
      });
    });
  }

  function importFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var text = String(reader.result || '');
      var rec = {
        id: 'f-' + Date.now(),
        name: file.name,
        size: file.size,
        added: new Date().toISOString(),
        text: text,
        chapters: PGRE.splitChapters(text),
        mapping: {}
      };
      PGRE.contentDB.put(rec).then(function () {
        PGRE.store.log('import', 'Imported ' + file.name, 0);
        PGRE.gamify.markTomeImported();
        PGRE.store.save();
        PGRE.toast('<strong>' + PGRE.ui.esc(file.name) + '</strong> imported — ' +
          rec.chapters.length + ' sections found', 'info');
        refreshFiles();
      }).catch(function () {
        PGRE.toast('Import failed — IndexedDB unavailable in this browser context.', 'error');
      });
    };
    reader.readAsText(file);
  }

  return {
    render: function () {
      return '' +
      '<div class="card"><h1>Library</h1>' +
        '<p class="muted">Everything stays on this machine: progress in localStorage, book content in IndexedDB. Nothing is sent anywhere.</p>' +
        '<div id="dropzone" class="dropzone">' +
          '<p><strong>Drop the book markdown here</strong> (.md / .txt)</p>' +
          '<p class="muted">or</p>' +
          '<button class="btn btn-primary" id="pick-btn">Choose a file…</button>' +
          '<input type="file" id="file-input" accept=".md,.markdown,.txt" hidden>' +
        '</div>' +
      '</div>' +
      '<div id="files-box"></div>' +
      '<div class="card"><h2>Your data</h2>' +
        '<p class="muted">Back up or restore all progress (XP, achievements, plan, streaks) as a JSON file.</p>' +
        '<div class="btn-row">' +
          '<button class="btn btn-ghost" id="export-btn">Export progress</button>' +
          '<button class="btn btn-ghost" id="import-progress-btn">Restore from backup…</button>' +
          '<input type="file" id="progress-input" accept=".json" hidden>' +
          '<button class="btn btn-danger-ghost" id="reset-btn">Reset all progress</button>' +
        '</div>' +
      '</div>';
    },

    mount: function () {
      refreshFiles();

      var dz = document.getElementById('dropzone');
      var input = document.getElementById('file-input');
      document.getElementById('pick-btn').addEventListener('click', function () { input.click(); });
      input.addEventListener('change', function () {
        if (input.files.length) importFile(input.files[0]);
        input.value = '';
      });
      ['dragover', 'dragenter'].forEach(function (ev) {
        dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('drag'); });
      });
      ['dragleave', 'drop'].forEach(function (ev) {
        dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('drag'); });
      });
      dz.addEventListener('drop', function (e) {
        if (e.dataTransfer.files.length) importFile(e.dataTransfer.files[0]);
      });

      document.getElementById('export-btn').addEventListener('click', function () {
        var blob = new Blob([PGRE.store.exportJSON()], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'physics-gre-progress-' + PGRE.store.today() + '.json';
        a.click();
        URL.revokeObjectURL(a.href);
      });

      var pInput = document.getElementById('progress-input');
      document.getElementById('import-progress-btn').addEventListener('click', function () { pInput.click(); });
      pInput.addEventListener('change', function () {
        if (!pInput.files.length) return;
        var r = new FileReader();
        r.onload = function () {
          try {
            PGRE.store.importJSON(String(r.result));
            PGRE.toast('Progress restored.', 'info');
            PGRE.route();
          } catch (e) {
            PGRE.toast('Restore failed: ' + PGRE.ui.esc(e.message), 'error');
          }
        };
        r.readAsText(pInput.files[0]);
        pInput.value = '';
      });

      document.getElementById('reset-btn').addEventListener('click', function () {
        if (confirm('Reset ALL progress — XP, achievements, streaks and plan check-offs? This cannot be undone.') &&
            confirm('Really sure? Consider exporting a backup first.')) {
          PGRE.store.reset();
          PGRE.toast('Progress reset.', 'info');
          PGRE.route();
        }
      });
    }
  };
})();
