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
