/* Formula deck — recall cards for the formula portal (#/formulas).
   EMPTY BY DESIGN: the deck fills only from the imported "Conquering the
   Physics GRE" markdown (parser v2, docs/Project Docs/DESIGN.md §3) — no hand-seeded cards.

   Card format (all math LaTeX in $...$, typeset offline by KaTeX):
     { id: 'cpg-f-001', topic: 'cm', name: 'Kepler’s third law',
       front: 'Relate a circular orbit’s period to its radius.',
       back: '$T^2 \\propto r^3$',
       note: 'optional one-line context' }

   Parser v2 has two ways to supply cards:
   - append literals to PGRE.FORMULAS below, or
   - store { id: 'formula-deck', kind: 'formula-deck', cards: [...] } in the
     IndexedDB content store; PGRE.formulaDeck() merges both (id-deduped). */
window.PGRE = window.PGRE || {};

PGRE.FORMULAS = [];

PGRE.formulaDeck = function () {
  return PGRE.contentDB.get('formula-deck').then(function (rec) {
    var seen = {};
    return PGRE.FORMULAS.concat((rec && rec.cards) || []).filter(function (c) {
      if (!c || !c.id || seen[c.id]) return false;
      seen[c.id] = true;
      return true;
    });
  });
};
