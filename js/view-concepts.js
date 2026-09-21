/* Concept visualization — front door, session search, mixed gallery, teaching page. */
window.PGRE = window.PGRE || {};
PGRE.views = PGRE.views || {};

PGRE.views.concepts = (function () {
  var teachApi = null;
  var galleryKind = 'all';
  var galleryTopic = 'all';
  var galleryQuery = '';
  var searchTimer = null;

  function esc(s) { return PGRE.ui.esc(s); }

  function formatThumbFormula(formula) {
    if (!formula) return '';
    var latex = String(formula).trim();
    if (latex.indexOf('$$') !== 0 && latex.charAt(0) !== '$' && latex.indexOf('\\(') !== 0 && latex.indexOf('\\[') !== 0) {
      latex = '$$' + latex + '$$';
    }
    return latex;
  }

  function formatThumbStory(text, maxLen) {
    if (!text) return '';
    var clean = String(text).trim().replace(/\s+/g, ' ');
    var tokenRegex = /(\$\$[\s\S]*?\$\$|\$[^$]*?\$|\*\*[^*]+?\*\*|[^\s$*]+|\s+)/g;
    var match;
    var result = '';
    var limit = maxLen || 135;
    while ((match = tokenRegex.exec(clean)) !== null) {
      var token = match[0];
      if (result.length + token.length > limit && result.length >= 60) break;
      result += token;
    }
    result = result.trim();
    if (result.length < clean.length) result = result.replace(/[,;:\s]+$/, '') + '...';
    return result.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
  }



  function subnav(active) {
    var isConceptActive = active === 'spherical' || active === 'azimuth' || active === 'concepts';
    var items = [
      { id: 'search', href: '#/concepts/search', label: 'Search', active: active === 'search' },
      { id: 'visualizers', href: '#/concepts/visualizers', label: 'Visualizers', active: active === 'visualizers' },
      { id: 'concepts', href: '#/concepts/spherical', label: 'Concepts', active: isConceptActive }
    ];
    var h = '<nav class="cv-subnav" aria-label="Concept visualization">';
    items.forEach(function (it) {
      h += '<a href="' + it.href + '" class="cv-subnav-link' + (it.active ? ' active' : '') + '"' +
        (it.active ? ' aria-current="page"' : '') + '>' + esc(it.label) + '</a>';
    });
    h += '</nav>';
    return h;
  }

  function cvModeBar(activeMode) {
    var isAz = activeMode === 'azimuth';
    return '<div class="cv-mode-bar" role="tablist" aria-label="Concept view modes">' +
      '<a href="#/concepts/spherical" class="cv-mode-btn' + (!isAz ? ' active' : '') + '" role="tab" aria-selected="' + (!isAz ? 'true' : 'false') + '">' +
        '<span class="cv-mode-num">1</span>' +
        '<span class="cv-mode-label">Spherical coordinates $(r, \\theta, \\varphi)$</span>' +
      '</a>' +
      '<a href="#/concepts/azimuth" class="cv-mode-btn' + (isAz ? ' active' : '') + '" role="tab" aria-selected="' + (isAz ? 'true' : 'false') + '">' +
        '<span class="cv-mode-num">2</span>' +
        '<span class="cv-mode-label">Direction of azimuth & Ampère ($B \\propto \\hat{\\phi}$)</span>' +
      '</a>' +
    '</div>';
  }

  function destroyTeach() {
    if (teachApi && typeof teachApi.destroy === 'function') {
      try { teachApi.destroy(); } catch (e) {}
    }
    teachApi = null;
  }

  function renderDoor() {
    return '<div id="cv-root" class="cv-root cv-door">' +
      '<div id="cv-door-fx" class="cv-door-fx" aria-hidden="true"></div>' +
      '<div class="cv-door-stage">' +
        '<p class="cv-kicker">Concept visualization</p>' +
        '<h1 class="cv-door-title">See the geometry</h1>' +
        '<p class="muted cv-door-lead">Search, browse every visualizer, or sit with a concept until $\\theta$ and $\\varphi$ stop swapping places.</p>' +
        '<div class="cv-door-cards">' +
          '<a class="cv-door-card" href="#/concepts/search">' +
            '<div class="cv-door-card-kicker">Search</div>' +
            '<div class="cv-door-card-title">Find a visualizer or concept</div>' +
            '<p class="muted">Jump anywhere in this session.</p>' +
          '</a>' +
          '<a class="cv-door-card" href="#/concepts/visualizers">' +
            '<div class="cv-door-card-kicker">Visualizers</div>' +
            '<div class="cv-door-card-title">Mixed gallery</div>' +
            '<p class="muted">Formula simulations and concept tools.</p>' +
          '</a>' +
          '<a class="cv-door-card" href="#/concepts/spherical">' +
            '<div class="cv-door-card-kicker">Concepts</div>' +
            '<div class="cv-door-card-title">Spherical coordinates & azimuth</div>' +
            '<p class="muted">$(r,\\theta,\\varphi)$ against $(x,y,z)$, basis triads, and Ampère\'s law $\\mathbf{B} = \\frac{\\mu_0 I}{2\\pi \\rho}\\hat{\\boldsymbol{\\phi}}$ compared.</p>' +
          '</a>' +
        '</div>'
      '</div>' +
    '</div>';
  }

  function renderSearch() {
    return '<div id="cv-root" class="cv-root">' +
      subnav('search') +
      '<h1>Search</h1>' +
      '<p class="muted">Visualizers and concepts in this session. Whole-studio search stays at Search in the sidebar.</p>' +
      '<label class="cv-search-label" for="cv-q">Query</label>' +
      '<input id="cv-q" class="cv-search-input" type="search" autocomplete="off" spellcheck="false" placeholder="theta, Hamiltonian, spherical">' +
      '<p id="cv-search-status" class="muted cv-search-status"></p>' +
      '<div id="cv-search-results"></div>' +
    '</div>';
  }

  function formulaItems() {
    var out = [];
    var viz = (window.PGRE && PGRE.visualizers) || {};
    Object.keys(viz).forEach(function (id) {
      if (id.indexOf('cpgf-') !== 0) return;
      var v = viz[id];
      if (!v || typeof v.draw !== 'function') return;
      out.push({
        kind: 'formula',
        id: id,
        title: v.title || id,
        topic: v.topic || 'cm',
        formulaLatex: v.formulaLatex || '',
        physicalStory: v.physicalStory || ''
      });
    });
    return out;
  }

  function conceptItems() {
    var out = [];
    var bag = (window.PGRE && PGRE.conceptVisualizers) || {};
    Object.keys(bag).forEach(function (id) {
      var v = bag[id];
      if (!v) return;
      out.push({
        kind: 'concept',
        id: v.id || id,
        title: v.title || id,
        topic: v.topic || 'cm',
        formulaLatex: v.formulaLatex || '',
        physicalStory: v.physicalStory || '',
        href: v.href || ('#/concepts/' + (v.id || id))
      });
    });
    return out;
  }

  function allItems() { return conceptItems().concat(formulaItems()); }

  function topicName(id) {
    var t = PGRE.topicById && PGRE.topicById(id);
    return t ? t.name : String(id || '').toUpperCase();
  }

  function galleryFiltered() {
    var items = allItems();
    if (galleryKind === 'formula') items = items.filter(function (it) { return it.kind === 'formula'; });
    else if (galleryKind === 'concept') items = items.filter(function (it) { return it.kind === 'concept'; });
    if (galleryTopic !== 'all') {
      items = items.filter(function (it) { return it.topic === galleryTopic; });
    }
    if (PGRE.conceptSearch && typeof PGRE.conceptSearch.matchGallery === 'function') {
      items = PGRE.conceptSearch.matchGallery(galleryQuery, items);
    } else if (galleryQuery) {
      var q = galleryQuery.toLowerCase();
      items = items.filter(function (it) {
        return (it.title + ' ' + (it.physicalStory || '')).toLowerCase().indexOf(q) !== -1;
      });
    }
    return items;
  }

  function chip(cls, on, key, val, label) {
    return '<button type="button" class="' + cls + (on ? ' active' : '') + '" data-' + key + '="' + esc(val) + '">' +
      esc(label) + '</button>';
  }

  function cardsHtml(items) {
    if (!items.length) return '<p class="muted">Nothing matches.</p>';
    var h = '';
    items.forEach(function (it) {
      var kindLabel = it.kind === 'concept' ? 'Concept' : 'Formula';
      h += '<div class="viz-thumb-card cv-gal-card" data-kind="' + it.kind + '" data-viz-id="' + esc(it.id) + '"' +
        (it.href ? ' data-href="' + esc(it.href) + '"' : '') + '>' +
        '<div class="viz-thumb-head">' +
          '<span class="viz-inline-badge">' + esc(topicName(it.topic)) + '</span>' +
          '<span class="viz-thumb-eq">' + esc(kindLabel) + '</span>' +
        '</div>' +
        '<div class="viz-thumb-title">' + esc(it.title) + '</div>' +
        '<div class="viz-thumb-formula">' + formatThumbFormula(it.formulaLatex) + '</div>' +
        '<div class="viz-thumb-desc">' + formatThumbStory(it.physicalStory, 135) + '</div>' +
        '<button type="button" class="btn btn-primary btn-sm">' +
          (it.kind === 'concept' ? 'Open teaching page' : 'Open Simulation') +
        '</button>' +
      '</div>';
    });
    return h;
  }

  function bindGalleryCards(root) {
    if (!root) return;
    root.querySelectorAll('.cv-gal-card').forEach(function (card) {
      card.addEventListener('click', function (e) {
        if (e.target && e.target.closest && e.target.closest('button')) {
          e.preventDefault();
        }
        openGalleryCard(card);
      });
    });
  }

  function paintGalleryGrid() {
    var grid = document.querySelector('#cv-root .viz-cards-grid');
    if (!grid) return;
    grid.innerHTML = cardsHtml(galleryFiltered());
    if (PGRE.typesetMath) PGRE.typesetMath(grid);
    bindGalleryCards(grid);
  }

  function renderGallery() {
    var topics = [
      { id: 'all', name: 'All topics' },
      { id: 'cm', name: 'Classical Mechanics' },
      { id: 'em', name: 'Electromagnetism' },
      { id: 'ow', name: 'Optics & Waves' },
      { id: 'th', name: 'Thermodynamics' },
      { id: 'qm', name: 'Quantum Mechanics' },
      { id: 'at', name: 'Atomic Physics' },
      { id: 'sr', name: 'Special Relativity' },
      { id: 'lb', name: 'Lab Methods' },
      { id: 'sp', name: 'Special Topics' }
    ];
    return '<div id="cv-root" class="cv-root">' +
      subnav('visualizers') +
      '<div class="viz-lab-header">' +
        '<h1 class="viz-lab-title">Visualizers</h1>' +
        '<p class="viz-lab-sub">Formula simulations and concept tools. Formula cards open the existing popup; concept cards open the teaching page.</p>' +
      '</div>' +
      '<label class="cv-search-label" for="cv-gal-q">Filter this list</label>' +
      '<input id="cv-gal-q" class="cv-search-input" type="search" autocomplete="off" spellcheck="false" value="' + esc(galleryQuery) + '">' +
      '<div class="viz-filter-bar cv-kind-bar">' +
        chip('viz-filter-chip', galleryKind === 'all', 'kind', 'all', 'All') +
        chip('viz-filter-chip', galleryKind === 'formula', 'kind', 'formula', 'Formula') +
        chip('viz-filter-chip', galleryKind === 'concept', 'kind', 'concept', 'Concept') +
      '</div>' +
      '<div class="viz-filter-bar">' +
        topics.map(function (tp) {
          return chip('viz-filter-chip', galleryTopic === tp.id, 'topic', tp.id, tp.name);
        }).join('') +
      '</div>' +
      '<div class="viz-cards-grid">' + cardsHtml(galleryFiltered()) + '</div></div>';
  }

  function renderTeach() {
    return '<div id="cv-root" class="cv-root">' +
      subnav('spherical') +
      '<div class="cv-teach-head">' +
        '<h1>Spherical coordinates & azimuth</h1>' +
        '<p class="muted">Integrated concept portal: compare spatial geometry $(r, \\theta, \\varphi)$ against physical magnetic circulation $\\mathbf{B} = \\frac{\\mu_0 I}{2\\pi \\rho}\\hat{\\boldsymbol{\\phi}}$.</p>' +
      '</div>' +
      cvModeBar('spherical') +
      '<div class="cv-teach-search-row">' +
        '<label class="cv-search-label" for="cv-teach-q">Highlight in the picture</label>' +
        '<input id="cv-teach-q" class="cv-search-input" type="search" autocomplete="off" spellcheck="false" placeholder="azimuth, phi, hat phi, theta, z axis">' +
        '<p id="cv-teach-status" class="muted cv-search-status"></p>' +
      '</div>' +
      '<div id="cv-teach" class="cv-teach"></div>' +
      '<div class="cv-teach-physics-panel" style="margin-top:24px;padding:18px 22px;background:var(--surface,#faf9f5);border:1px solid var(--line,#e6dfd8);border-radius:var(--radius,8px);">' +
        '<div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:var(--accent-deep,#964b32);margin-bottom:6px;font-weight:600;">Physics Connection · Direction of Azimuth</div>' +
        '<h3 style="margin:0 0 8px;font-size:16px;font-weight:500;">Ampère\'s Law & The Azimuthal Unit Vector $\\hat{\\boldsymbol{\\phi}}$</h3>' +
        '<p style="margin:0 0 8px;color:var(--ink-2,#6c6a64);font-size:14px;line-height:1.55;">' +
          'In both spherical and cylindrical coordinates, the direction of increasing azimuth is the unit vector tangent to the horizontal circle of latitude (curling counter-clockwise looking down from $+z$):' +
        '</p>' +
        '<div style="margin:8px 0;font-size:15px;color:var(--ink,#141413);">' +
          '$$\\hat{\\boldsymbol{\\phi}} = -\\sin\\varphi\\,\\hat{\\mathbf{x}} + \\cos\\varphi\\,\\hat{\\mathbf{y}}$$' +
        '</div>' +
        '<p style="margin:8px 0 8px;color:var(--ink-2,#6c6a64);font-size:13.5px;line-height:1.5;">' +
          'For an infinite straight wire carrying current $I$ along $+z$, Ampère\'s law gives a purely <strong>azimuthal</strong> magnetic field directed along $\\hat{\\boldsymbol{\\phi}}$:' +
        '</p>' +
        '<div style="margin:8px 0;font-size:15px;color:var(--ink,#141413);">' +
          '$$|\\mathbf{B}|(2\\pi\\rho) = \\mu_0 I \\implies \\mathbf{B} = \\frac{\\mu_0 I}{2\\pi\\rho}\\hat{\\boldsymbol{\\phi}} = \\frac{\\mu_0 I}{2\\pi r\\sin\\theta}\\hat{\\boldsymbol{\\phi}}$$' +
        '</div>' +
        '<p style="margin:8px 0 0;color:var(--ink-3,#8e8b82);font-size:13px;line-height:1.45;">' +
          '<strong>GRE Caution:</strong> $\\hat{\\boldsymbol{\\phi}}$ is identical in cylindrical and spherical coordinates, but the Ampère radius is the perpendicular distance to the $z$-axis (cylindrical $\\rho = r\\sin\\theta$), not the spherical origin distance $r$. Notice also that $\\hat{\\boldsymbol{\\phi}}$ has zero $\\hat{\\mathbf{z}}$-component (strictly horizontal: $\\hat{\\boldsymbol{\\phi}}\\cdot\\hat{\\mathbf{z}} = 0$). Drag the $\\varphi$ slider or drag the canvas to move $P$ in $(\\theta, \\varphi)$ and watch $\\hat{\\boldsymbol{\\phi}}$ rotate.' +
        '</p>'
      '</div>' +
    '</div>';
  }
  function renderAzimuthTeach() {
    return '<div id="cv-root" class="cv-root">' +
      subnav('azimuth') +
      '<div class="cv-teach-head">' +
        '<h1>Spherical coordinates & azimuth</h1>' +
        '<p class="muted">Integrated concept portal: compare spatial geometry $(r, \\theta, \\varphi)$ against physical magnetic circulation $\\mathbf{B} = \\frac{\\mu_0 I}{2\\pi \\rho}\\hat{\\boldsymbol{\\phi}}$.</p>' +
      '</div>' +
      cvModeBar('azimuth') +
      '<div class="cv-teach-search-row">' +
        '<label class="cv-search-label" for="cv-teach-q">Highlight in the picture</label>' +
        '<input id="cv-teach-q" class="cv-search-input" type="search" autocomplete="off" spellcheck="false" placeholder="phi, B field, current, rho, spherical">' +
        '<p id="cv-teach-status" class="muted cv-search-status"></p>' +
      '</div>' +
      '<div id="cv-teach" class="cv-teach"></div>' +
      '<div class="cv-teach-physics-panel" style="margin-top:24px;padding:18px 22px;background:var(--surface,#faf9f5);border:1px solid var(--line,#e6dfd8);border-radius:var(--radius,8px);">' +
        '<div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:var(--accent-deep,#964b32);margin-bottom:6px;font-weight:600;">Coordinate Comparison · Spherical vs Cylindrical</div>' +
        '<h3 style="margin:0 0 8px;font-size:16px;font-weight:500;">Why $\\hat{\\boldsymbol{\\phi}}$ is Identical in Both Coordinate Systems</h3>' +
        '<p style="margin:0 0 8px;color:var(--ink-2,#6c6a64);font-size:14px;line-height:1.55;">' +
          'In both cylindrical $(\\rho, \\varphi, z)$ and spherical $(r, \\theta, \\varphi)$ systems, the azimuth angle $\\varphi$ measures rotation around $+z$ from $+x$ toward $+y$. Because this rotation is purely horizontal, the azimuth unit vector is identical in both systems:' +
        '</p>' +
        '<div style="margin:8px 0;font-size:15px;color:var(--ink,#141413);">' +
          '$$\\hat{\\boldsymbol{\\phi}} = -\\sin\\varphi\\,\\hat{\\mathbf{x}} + \\cos\\varphi\\,\\hat{\\mathbf{y}}$$' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:14px;margin:12px 0;">' +
          '<div style="padding:12px 14px;border:1px solid var(--line,#e6dfd8);border-radius:6px;background:var(--bg,#faf9f5);">' +
            '<strong style="color:var(--ink,#141413);font-size:13.5px;">Spherical Coordinates $(r, \\theta, \\varphi)$</strong>' +
            '<p style="margin:4px 0 0;font-size:13px;color:var(--ink-2,#6c6a64);line-height:1.45;">Origin-centered. Basis: $(\\hat{\\mathbf{r}}, \\hat{\\boldsymbol{\\theta}}, \\hat{\\boldsymbol{\\phi}})$. Radial distance $r = \\sqrt{x^2+y^2+z^2}$.</p>' +
          '</div>' +
          '<div style="padding:12px 14px;border:1px solid var(--line,#e6dfd8);border-radius:6px;background:var(--bg,#faf9f5);">' +
            '<strong style="color:var(--ink,#141413);font-size:13.5px;">Cylindrical Coordinates $(\\rho, \\varphi, z)$</strong>' +
            '<p style="margin:4px 0 0;font-size:13px;color:var(--ink-2,#6c6a64);line-height:1.45;">Axis-centered. Basis: $(\\hat{\\boldsymbol{\\rho}}, \\hat{\\boldsymbol{\\phi}}, \\hat{\\mathbf{z}})$. Perpendicular wire distance $\\rho = r\\sin\\theta = \\sqrt{x^2+y^2}$.</p>' +
          '</div>' +
        '</div>' +
        '<p style="margin:8px 0 0;color:var(--ink-3,#8e8b82);font-size:13px;line-height:1.45;">' +
          '<strong>GRE Reference (Kahn, <em>Conquering the Physics GRE</em>, eq. 2.30):</strong> Kahn writes $|\\mathbf{B}|(2\\pi r) = \\mu_0 I$, where $r$ denotes the perpendicular distance to the wire. In full 3D problems combining wires with spherical geometry, always substitute $\\rho = r\\sin\\theta$ into the denominator to avoid confusing wire distance with distance to the origin.' +
        '</p>' +
      '</div>' +
    '</div>';
  }

  function wireAzimuthTeach() {
    var host = document.getElementById('cv-teach');
    var rec = PGRE.conceptVisualizers && PGRE.conceptVisualizers.azimuth;
    if (host && rec && typeof rec.mount === 'function') {
      teachApi = rec.mount(host, {});
    } else if (host) {
      host.innerHTML = '<p class="muted">Azimuth teaching widget did not load.</p>';
    }
    var input = document.getElementById('cv-teach-q');
    var st = document.getElementById('cv-teach-status');
    if (!input) return;
    var allowedIds = (rec && rec.highlightIds) || ['phi', 'theta', 'r', 'rho', 'bField', 'current', 'wire', 'basis', 'spherical', 'cylindrical'];
    function run() {
      var q = input.value;
      var rawId = (PGRE.conceptSearch && PGRE.conceptSearch.matchTeach) ? PGRE.conceptSearch.matchTeach(q) : null;
      var id = (rawId && allowedIds.indexOf(rawId) !== -1) ? rawId : null;
      if (teachApi && typeof teachApi.highlight === 'function') teachApi.highlight(id, true);
      if (st) {
        if (!q) {
          st.textContent = '';
        } else if (id) {
          var lbl = id === 'rho' ? '\\rho = r\\sin\\theta\\text{ (wire distance)}'
            : id === 'bField' ? '\\mathbf{B}\\text{ (magnetic field)}'
            : id === 'current' || id === 'wire' ? 'I\\text{ (wire current along }+z\\text{)}'
            : (id === 'phi' || id === 'phiHat') ? '\\varphi\\text{ / }\\hat{\\boldsymbol{\\phi}}\\text{ (azimuth direction)}'
            : id === 'theta' ? '\\theta\\text{ (polar angle)}'
            : id === 'r' ? 'r\\text{ (spherical radius)}'
            : id === 'basis' ? '\\text{basis comparison}'
            : id === 'spherical' ? '\\text{spherical coordinates } (r,\\theta,\\varphi)'
            : id === 'cylindrical' ? '\\text{cylindrical coordinates } (\\rho,\\varphi,z)'
            : id;
          st.textContent = 'Highlighting $' + lbl + '$.';
        } else {
          st.textContent = 'No matching part.';
        }
        if (PGRE.typesetMath) PGRE.typesetMath(st);
      }
    }
    input.addEventListener('input', function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(run, 80);
    });
  }

  function paintSearchResults(q) {
    var box = document.getElementById('cv-search-results');
    var st = document.getElementById('cv-search-status');
    if (!box) return;
    if (PGRE.conceptSearch && PGRE.conceptSearch.build) PGRE.conceptSearch.build();
    var hits = (PGRE.conceptSearch && PGRE.conceptSearch.matchSession)
      ? PGRE.conceptSearch.matchSession(q)
      : [];
    if (st) st.textContent = q ? (hits.length + ' match' + (hits.length === 1 ? '' : 'es')) : '';
    if (!q) { box.innerHTML = ''; return; }
    if (!hits.length) { box.innerHTML = '<p class="muted">No matches.</p>'; return; }
    var h = '';
    hits.forEach(function (hit) {
      var kind = hit.kind === 'concept' ? 'Concept' : 'Formula';
      h += '<a class="cv-hit" href="' + esc(hit.href || '#/concepts/visualizers') + '" data-kind="' + esc(hit.kind || '') + '" data-id="' + esc(hit.id || '') + '">' +
        '<span class="cv-hit-kind">' + esc(kind) + '</span>' +
        '<span class="cv-hit-title">' + esc(hit.title || hit.id) + '</span>' +
        (hit.snippet ? '<span class="cv-hit-sn">' + hit.snippet + '</span>' : '') +
      '</a>';
    });
    box.innerHTML = h;
    if (PGRE.typesetMath) PGRE.typesetMath(box);
    box.querySelectorAll('a.cv-hit').forEach(function (a) {
      a.addEventListener('click', function (e) {
        if (a.getAttribute('data-kind') !== 'formula') return;
        e.preventDefault();
        var id = a.getAttribute('data-id');
        if (id && PGRE.openVisualizerModal) PGRE.openVisualizerModal(id);
      });
    });
  }

  function wireSearch() {
    var input = document.getElementById('cv-q');
    if (!input) return;
    input.addEventListener('input', function () {
      var q = input.value;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () { paintSearchResults(q); }, 120);
    });
    input.focus();
  }

  function openGalleryCard(card) {
    var kind = card.getAttribute('data-kind');
    var id = card.getAttribute('data-viz-id');
    var href = card.getAttribute('data-href');
    if (kind === 'formula' && id && PGRE.openVisualizerModal) {
      PGRE.openVisualizerModal(id);
      return;
    }
    if (href) location.hash = href;
  }

  function wireGallery() {
    var root = document.getElementById('cv-root');
    if (!root) return;
    root.querySelectorAll('[data-kind].viz-filter-chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        galleryKind = btn.getAttribute('data-kind') || 'all';
        PGRE.route();
      });
    });
    root.querySelectorAll('[data-topic].viz-filter-chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        galleryTopic = btn.getAttribute('data-topic') || 'all';
        PGRE.route();
      });
    });
    var qel = document.getElementById('cv-gal-q');
    if (qel) {
      qel.addEventListener('input', function () {
        galleryQuery = qel.value;
        clearTimeout(searchTimer);
        searchTimer = setTimeout(paintGalleryGrid, 120);
      });
    }
    bindGalleryCards(root);
  }

  function wireTeach() {
    var host = document.getElementById('cv-teach');
    var rec = PGRE.conceptVisualizers && PGRE.conceptVisualizers.spherical;
    if (host && rec && typeof rec.mount === 'function') {
      teachApi = rec.mount(host, {});
    } else if (host) {
      host.innerHTML = '<p class="muted">Spherical teaching widget did not load.</p>';
    }
    var input = document.getElementById('cv-teach-q');
    var st = document.getElementById('cv-teach-status');
    if (!input) return;
    var allowedIds = (rec && rec.highlightIds) || ['r', 'theta', 'phi', 'x', 'y', 'z', 'origin', 'equator', 'sphere', 'phiHat', 'basis'];
    function run() {
      var q = input.value;
      var rawId = (PGRE.conceptSearch && PGRE.conceptSearch.matchTeach) ? PGRE.conceptSearch.matchTeach(q) : null;
      var id = (rawId && allowedIds.indexOf(rawId) !== -1) ? rawId : null;
      if (teachApi && typeof teachApi.highlight === 'function') teachApi.highlight(id, true);
      if (st) {
        if (!q) {
          st.textContent = '';
        } else if (id) {
          st.textContent = 'Highlighting $' + (
            id === 'theta' ? '\\theta\\text{ (polar)}' : (id === 'phi' || id === 'phiHat') ? '\\varphi\\text{ / }\\hat{\\boldsymbol{\\phi}}\\text{ (azimuth direction)}' : id === 'basis' ? '\\text{basis triad } (\\hat{\\mathbf{r}},\\hat{\\boldsymbol{\\theta}},\\hat{\\boldsymbol{\\phi}})' : id
          ) + '$.';
        } else if (rawId === 'rho' || rawId === 'bField' || rawId === 'current') {
          st.textContent = 'See Mode 2 ("Direction of azimuth") for $' + (rawId === 'rho' ? '\\rho' : rawId === 'bField' ? '\\mathbf{B}' : 'I') + '$.';
        } else {
          st.textContent = 'No matching part.';
        }
        if (PGRE.typesetMath) PGRE.typesetMath(st);
      }
    }
    input.addEventListener('input', function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(run, 80);
    });
  }

  if (typeof window !== 'undefined' && !window.__pgreCvHashBound) {
    window.__pgreCvHashBound = true;
    window.addEventListener('hashchange', function () {
      destroyTeach();
    });
  }

  return {
    render: function (params) {
      destroyTeach();
      var s = (params && params.sub) || '';
      if (s === 'search') return renderSearch();
      if (s === 'visualizers') return renderGallery();
      if (s === 'spherical') return renderTeach();
      if (s === 'azimuth') return renderAzimuthTeach();
      return renderDoor();
    },
    mount: function (params) {
      var root = document.getElementById('cv-root');
      var s = (params && params.sub) || '';
      if (!s) {
        if (root && PGRE.typesetMath) PGRE.typesetMath(root);
        var fx = document.getElementById('cv-door-fx');
        if (fx && PGRE.conceptDoorFx && typeof PGRE.conceptDoorFx.mount === 'function') {
          PGRE.conceptDoorFx.mount(fx);
        }
        return;
      }
      if (s === 'search') wireSearch();
      else if (s === 'visualizers') wireGallery();
      else if (s === 'spherical') wireTeach();
      else if (s === 'azimuth') wireAzimuthTeach();
      if (root && PGRE.typesetMath) PGRE.typesetMath(root);
      var sub = root && root.querySelector ? root.querySelector('.cv-subnav') : document.querySelector('.cv-subnav');
      if (sub && PGRE.motion && typeof PGRE.motion.letterSwapNav === 'function') {
        PGRE.motion.letterSwapNav(sub);
      }
    }
  };
})();
