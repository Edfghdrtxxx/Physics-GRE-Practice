/* Formula deck — recall cards for the formula portal (#/formulas).
   EMPTY BY DESIGN: the deck fills only from the imported "Conquering the
   Physics GRE" markdown (parser v2, docs/Project Docs/DESIGN.md §3) — no hand-seeded cards.

   Card format (all math LaTeX in $...$, typeset offline by KaTeX):
     { id: 'cpg-f-001', topic: 'cm', name: 'Kepler’s third law',
       front: 'Relate a circular orbit’s period to its radius.',
       back: '$T^2 \\propto r^3$',
       note: 'optional one-line context' }

   The pipeline has three ways to supply cards:
   - write PGRE.BOOK_FORMULAS in content/bank/cpg-formulas.js (gitignored —
     the canonical route for book-derived cards),
   - append literals to PGRE.FORMULAS below, or
   - store { id: 'formula-deck', kind: 'formula-deck', cards: [...] } in the
     IndexedDB content store.
   PGRE.formulaDeck() (js/store.js) merges all three, id-deduped. */
window.PGRE = window.PGRE || {};

PGRE.FORMULAS = [];
