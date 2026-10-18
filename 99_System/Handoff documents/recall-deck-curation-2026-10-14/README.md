# Recall deck curation, 2026-10-14

The Recall deck was cut from **525 cards to 294** on 2026-10-14. The student asked for this, 17 days before the 2026-11-01 exam. This note tells later agents what changed, why, and the rules the deck now follows. The per-card change log is at the end.

## Decisions the student made

1. **Removed cards are deleted, not suspended.** This covers exact duplicates, Kahn "Class 1" basics (Kahn §9.1, p.159), cards that can be derived in under 15 s from another card, and low-yield trivia such as the Nobel-prize lists. The student chose deletion over suspension.
2. **The target is about 300 cards in total.**
3. **The deck is maintained by hand.** `content/bank/cpg-formulas.js` and `content/bank/cpg-lists.js` used to come from a generator outside this repo, which is no longer run. Edit the cards in place when the student asks for a change.
4. **Four card problems the student named as daily pain points.** These were fixed across the whole deck and must not come back:
   - **Too many items on one card.** Every recall list now has 4 items or fewer, and its front ends with `(N)`, where N is the number of `<li>` items.
   - **Full formulas where the GRE tests scaling.** Where the exam only tests how a quantity scales, or a limiting case, the card now asks for that instead of the full formula. For example: "doubling $a$ multiplies the Larmor power by?"
   - **Math written as plain text.** Every symbol, including single-letter variables, is now written in LaTeX in the front, back and note. A raw `<P>` or `<a|b>` gets read by the browser as an HTML tag and swallowed, so write `\langle\rangle` instead.
   - **References to other cards.** No card refers to another card ("see cpgf-2.15a", "the card above"). Each card stands alone.

## Counts

| source | before | after |
|---|---|---|
| `content/bank/cpg-formulas.js` (`PGRE.BOOK_FORMULAS`) | 339 | 154 |
| `js/data-formulas.js` (`PGRE.FORMULAS`, public) | 81 | 80 |
| `content/bank/cpg-lists.js` (`PGRE.BOOK_LISTS`) | 105 | 60 |
| **deck after id de-dupe** | **525** | **294** |

After the first pass, by topic group: cm + sr 49, em + lb 86, qm + at 69, th + ow + sp 87 (291). The review fix pass below took it to 294.

## Invariants and gotchas

- **Visualizer cards were protected.** Every id with a `PGRE.visualizers[...]` registration, plus the two card-diagram ids, was kept. These are `cpgf-1.15`, `cpgf-1.20`, `cpgf-1.22`, `cpgf-1.24`, `cpgf-1.25`, `cpgf-1.26`, `cpgf-1.27`, `cpgf-1.28`, `cpgf-1.29`, `cpgf-1.3`, `cpgf-1.30`, `cpgf-1.31`, `cpgf-1.32`, `cpgf-1.33`, `cpgf-1.35`, `cpgf-1.38`, `cpgf-1.39`, `cpgf-1.4`, `cpgf-1.41`, `cpgf-1.42`, `cpgf-1.45`, `cpgf-1.47`, `cpgf-1.48`, `cpgf-1.9`, `cpgf-2.14`, `cpgf-2.15`, `cpgf-2.32`, `cpgf-2.33`, `cpgf-2.4`, `cpgf-2.42`, `cpgf-2.43`, `cpgf-2.6`, `cpgf-2.70`, `cpgf-2.8`, `cpgf-3.26`, `cpgf-3.32`, `cpgf-4.14`, `cpgf-4.32`, `cpgf-4.42`, `cpgf-5.18`, `cpgf-5.27`, `cpgf-6.1`, `cpgf-6.18`, `cpgf-7.17`, `supp-moment-of-inertia`, `supp-radiation-field` and `supp-drift-current`. Some of them were rewritten into higher-yield questions on the same physics. In particular, `cpgf-1.4`, `1.27`, `1.42`, `2.4`, `2.8`, `2.43` and `2.70` changed the most. Check in the app that the visualizer each one opens still fits the new question.
- **Ids of surviving cards were never changed.** SRS history in `localStorage['pgre-state-v1'].cards` is keyed by id.
  - Merged cards kept the survivor's id.
  - States of deleted ids stay in the student's store as orphans. `status.js` counts them as `orphaned`, and they are harmless.
  - Ids that now carry a substantially new question are listed in `PGRE.srs.CURATION_REQUEUE_IDS` in `js/srs.js`. On every load, `requeueCuratedCards()` brings each of them due today unless it has been graded since the cutoff (2026-10-14 14:45 UTC). It only changes `due`; reps, ease and interval stay as they were. The check runs on every load rather than once, because the cards merge rule prefers the later due date on a tie and a stale sibling tab could undo a one-shot change. `tools/test-curation-requeue.js` covers it.
- **Three duplicated ids were collapsed.** These are `cpgf-1.30b`, `cpgf-2.56a` and `cpgl-1.02`, each of which existed in two sources. The deck keeps the first source in the order BOOK_FORMULAS, FORMULAS, BOOK_LISTS.
- **New cards are `supp-*` with `eq: 'supp'`, in `js/data-formulas.js`.** That file is in the public repo, so its wording is original and contains no book text. Notes may cite a Kahn section and page.
- **Corrections that now differ from the book on purpose:**
  - `cpgf-2.36`: the cyclotron radius $R = p/(|q|B)$ holds at any speed. Kahn §2.2.6 says so himself, and his sample-exam answer 66 uses it.
  - `cpgf-2.37`: the sense of rotation is fixed. A positive charge circles clockwise when $\mathbf B$ points toward the viewer.
  - `cpgf-1.22`: absorbs 1.21. The centrifugal force points away from the axis.
  - `cpgl-7.08`: a free-electron laser works by synchrotron radiation from electrons wiggled by a periodic magnet. This follows Kahn's own answer to sample-exam Q98, not his §7.5.2 wording.
  - `cpgl-8.14`: the muon-spin T-violation clause was dropped.
  - `cpgl-5.13`: the 21 cm photon energy is about $6\times10^{-6}$ eV.
- **Kahn page numbers on new and rewritten cards are mostly section start pages**, taken from the book's table of contents. Check them before relying on an exact page.
- **The IndexedDB `formula-deck` record**, which comes from a Library import, is still merged into the deck last. If the student once imported a deck there, deleted ids from that import would come back. As of 2026-10-14 this has not been checked.


## Adversarial review and fix pass

An independent reviewer then read all 291 cards. It recomputed the numbers on every new and rewritten card and found no wrong factor, sign or value. It did report 4 major and 11 minor issues, and the fix pass (log group F below) addressed them:

- **SRS history on rewritten ids.** These cards kept review history from their old questions. They now come due through the requeue described above.
- **Four protected cards no longer matched their visualizers:** `cpgf-1.39`, `cpgf-2.70`, `cpgf-1.4` and `cpgf-1.20`. Each was rewritten so the visualizer answers part of the card. The internal-resistance content moved to `supp-battery-internal-resistance`, and `cpgf-2.79` was merged into `cpgf-2.70`.
- **Eight vague "what does the book say" fronts** (`cpgl-5.01`–`5.17`) became concrete questions with single answers.
- **Lost content was restored:**
  - $E=-GMm/2a$ and vis-viva, now in `supp-gravity-orbits`;
  - Kirchhoff's rules, in `supp-kirchhoff-rules`;
  - impulse and power, in `supp-impulse-power`;
  - Rutherford scattering, added as `supp-rutherford-scattering`.
- **Smaller fixes:**
  - Hydrogen $\mu$/$Z$ scaling now lives only on `supp-hydrogenic-z-scaling`, and `cpgf-5.44` uses $a_0$ consistently.
  - Overloaded fronts were trimmed.
  - Cards whose first display formula was not the answer now lead with the answer; Cloze and Type quiz that first formula.
  - About 30 page citations were corrected against Kahn's Equation Index.
  - Tags were normalised to one string per concept, giving 135 tags. For book cards the tag doubles as the visible card title.

Open items the reviewer raised that were not changed:
- Some facts still appear on two cards, as deliberate overlap, e.g. Poisson $\sqrt N$ and the adiabat.
- `supp-moment-of-inertia` keeps its 92-word table, which its visualizer styles.
- 56 book cards carry no Kahn citation.

## Tests

- `tools/test-public-formulas.js` was rewritten for this curation. It no longer locks the old 45-id write set. It locks:
  - the wording rules above, on every public card;
  - the removed supp ids staying absent;
  - the added supp ids staying present.
- `tools/test-curation-requeue.js` is new. All other node suites pass unchanged: recall-lists, formula-checkin/consumers/export/picker, card-diagrams, visualizer-aesthetics, srs-intervals, search, status, mem-history, store-persist, ux-interaction and bank. `tools/check-katex-latex.js` also passes on all bank files.

## Backups

Pre-curation copies of all three card files are in `content/bank/.backups/` (gitignored): `cpg-formulas.pre-curation-2026-10-14.js`, `cpg-lists.pre-curation-2026-10-14.js`, `data-formulas.pre-curation-2026-10-14.js`. To restore one card, copy its object back from the matching backup.

## Per-card change log

Actions are:
- `delete`: dropped.
- `merge-into:<id>`: the content was folded into that surviving card.
- `rewrite`: the same id now holds new wording.
- `add`: a new card.
- `split-from:<id>`: a new card carved out of that card.


### Group A (cm + sr)

| id | action | why |
|---|---|---|
| `cpgf-1.1` | delete | Class 1 projectile kinematics |
| `cpgf-1.2` | delete | Class 1 constant-acceleration kinematics |
| `cpgf-1.5` | delete | Class 1 basic; student knows it |
| `cpgf-1.6` | delete | Class 1 basic; student knows it |
| `cpgf-1.7` | delete | Class 1 basic; student knows it |
| `cpgf-1.8` | delete | Class 1 basic; student knows it |
| `cpgf-1.10` | delete | Class 1 basic; student knows it |
| `cpgf-1.11` | merge-into:cpgf-1.9 | F = -grad U folded into potential card |
| `cpgf-1.12` | merge-into:supp-rolling-incline | v = R omega stated in rolling card |
| `cpgf-1.13` | merge-into:cpgf-1.15 | non-conservative work folded into work-energy card |
| `cpgf-1.14` | merge-into:cpgf-1.15 | work-energy theorem duplicate |
| `cpgf-1.16` | delete | Class 1 basic; student knows it |
| `cpgf-1.17` | merge-into:cpgf-1.20 | L = I omega used in spin-up card |
| `cpgf-1.18` | delete | Class 1 basic; student knows it |
| `cpgf-1.19` | merge-into:cpgf-1.20 | duplicate of L = I omega |
| `cpgf-1.21` | merge-into:cpgf-1.22 | centrifugal sign fixed, combined with Coriolis |
| `cpgf-1.23` | merge-into:cpgf-1.24 | point-mass I stated in integral card |
| `cpgf-1.30b` | merge-into:cpgf-1.30 | cyclic-coordinate rule folded into conjugate momentum |
| `cpgf-1.34` | merge-into:cpgf-1.30 | central-force Lagrangian used as cyclic example |
| `cpgf-1.36` | merge-into:cpgf-1.35 | effective potential joined to conserved l |
| `cpgf-1.40` | merge-into:cpgf-1.39 | omega = sqrt(k/m) in springs card |
| `cpgf-1.43` | merge-into:cpgf-1.42 | secular equation given as method for normal modes |
| `cpgf-1.44` | merge-into:cpgl-1.04 | damped EOM stated in damping-regimes card |
| `cpgf-1.46` | merge-into:cpgf-1.47 | pendulum EOM redundant with period card |
| `cpgf-1.49` | merge-into:cpgf-1.51 | duplicate Bernoulli form |
| `cpgf-1.50` | merge-into:cpgf-1.51 | continuity stated with Bernoulli |
| `supp-torque-cross` | delete | cross-product expansion, no GRE payoff |
| `supp-discrete-physical-pendulum` | merge-into:cpgf-1.48 | discrete-mass formula added to physical pendulum |
| `supp-pendulum-mass-shift-shortcut` | delete | ultra-low-yield edge case |
| `supp-driven-response` | merge-into:cpgf-1.45 | amplitude formula joined to resonance card |
| `supp-hamilton-principle` | merge-into:cpgf-1.28 | action principle and traps added to Lagrangian |
| `cpgl-1.01` | delete | book-quote recall, no GRE payoff |
| `cpgl-1.02` | merge-into:cpgf-1.38 | orbit classification moved to energy card |
| `cpgl-1.05` | merge-into:cpgf-1.39 | spring combination rules moved to springs card |
| `cpgf-6.2` | merge-into:cpgf-6.12 | covered by boost matrix |
| `cpgf-6.3` | delete | Class 1 definition of gamma |
| `cpgf-6.4` | merge-into:cpgf-6.12 | inverse transform is v to -v |
| `cpgf-6.5` | merge-into:cpgf-6.12 | inverse transform is v to -v |
| `cpgf-6.9` | delete | duplicate position 4-vector definition |
| `cpgf-6.10` | delete | Class 1 position 4-vector definition |
| `cpgf-6.11` | delete | Class 1 definition of beta |
| `cpgf-6.13` | merge-into:cpgl-6.02 | p-mu stated with invariant square |
| `cpgf-6.14` | delete | current 4-vector rarely tested |
| `cpgf-6.15` | delete | wave 4-vector rarely tested |
| `cpgf-6.16` | merge-into:cpgf-6.18 | energy-momentum-KE combined |
| `cpgf-6.17` | delete | Class 1 basic; student knows it |
| `cpgf-6.19` | merge-into:cpgf-6.18 | energy-momentum-KE combined |
| `cpgf-6.20` | merge-into:cpgf-6.18 | energy-momentum-KE combined |
| `cpgf-6.21` | merge-into:cpgl-6.02 | dot product joined to invariant-square card |
| `cpgf-6.22` | merge-into:cpgl-6.04 | interval signs in one card |
| `cpgf-6.23` | merge-into:cpgl-6.04 | interval signs in one card |
| `cpgf-6.24` | merge-into:cpgl-6.04 | interval signs in one card |
| `cpgf-6.25` | merge-into:cpgl-6.02 | E^2 relation joined to invariant square |
| `cpgf-6.26` | merge-into:cpgl-6.05 | 4-momentum conservation in conserved-vs-invariant |
| `cpgf-6.29` | merge-into:cpgf-6.28 | gamma values in one table |
| `supp-relativistic-velocity-addition` | merge-into:cpgf-6.8 | duplicate velocity addition |
| `supp-relativistic-doppler` | merge-into:cpgf-6.27 | duplicate Doppler |
| `cpgl-6.01` | delete | postulates, low GRE yield |
| `cpgl-6.03` | delete | meta-list repeating other formulas |
| `cpgl-6.05a` | merge-into:cpgl-6.05b | general and numeric head-on cases combined |
| `cpgf-1.3` | rewrite | Class 1 recall turned into scaling question |
| `cpgf-1.4` | rewrite | Class 1 recall turned into loop-the-loop application |
| `cpgf-1.9` | rewrite | merged gradient form, added sign check |
| `cpgf-1.15` | rewrite | merged work-energy theorem and non-conservative work |
| `cpgf-1.20` | rewrite | torque law turned into angular-momentum conservation question |
| `cpgf-1.22` | rewrite | centrifugal sign error fixed; merged with Coriolis |
| `cpgf-1.24` | rewrite | definition turned into worked integral |
| `cpgf-1.25` | rewrite | added worked example and bound |
| `cpgf-1.26` | rewrite | definition turned into worked integral |
| `cpgf-1.27` | rewrite | definition turned into exploding-projectile application |
| `cpgf-1.28` | rewrite | merged action principle and traps |
| `cpgf-1.29` | rewrite | LaTeX sweep, added check example |
| `cpgf-1.30` | rewrite | index typo fixed; merged cyclic-coordinate rule |
| `cpgf-1.31` | rewrite | definition turned into worked Legendre transform |
| `cpgf-1.32` | rewrite | back trimmed; condition clarified |
| `cpgf-1.33` | rewrite | LaTeX sweep, added check example |
| `cpgf-1.35` | rewrite | merged effective potential and Kepler II |
| `cpgf-1.37` | rewrite | added limiting cases |
| `cpgf-1.38` | rewrite | energy equation turned into orbit classification |
| `cpgf-1.39` | rewrite | Hooke law turned into spring-combination question |
| `cpgf-1.41` | rewrite | complex solution turned into SHM maxima question |
| `cpgf-1.42` | rewrite | ansatz turned into concrete normal-mode problem |
| `cpgf-1.45` | rewrite | merged amplitude formula; added limits |
| `cpgl-1.04` | rewrite | list turned into regimes card with criteria |
| `cpgf-1.47` | rewrite | frequency recall turned into scaling question |
| `cpgf-1.48` | rewrite | merged discrete-mass case; added rod example |
| `cpgf-1.51` | rewrite | merged Bernoulli forms and continuity; added Torricelli |
| `supp-moment-of-inertia` | rewrite | front reframed as ranking; ranking line added |
| `supp-rocket` | rewrite | list cut to one result; self-reference removed |
| `supp-small-oscillation` | rewrite | wording clarified |
| `supp-gravity-orbits` | rewrite | list cut; added orbit energetics; cross-reference removed |
| `cpgl-1.03` | rewrite | list cut to third law; second law moved to central-force card |
| `supp-friction` | rewrite | list turned into incline application |
| `supp-newton-momentum` | rewrite | 7-item list replaced by collision results |
| `cpgf-6.1` | rewrite | transform recall turned into simultaneity question |
| `cpgf-6.6` | rewrite | time dilation turned into decay-length question |
| `cpgf-6.7` | rewrite | LaTeX sweep; added transverse and bound |
| `cpgf-6.8` | rewrite | merged limits; LaTeX sweep |
| `cpgf-6.12` | rewrite | LaTeX sweep; absorbs explicit transforms |
| `cpgf-6.18` | rewrite | merged E, p, T into one card |
| `cpgl-6.02` | rewrite | merged dot product, p-mu and E^2 relation |
| `cpgf-6.27` | rewrite | merged approaching case and small-speed limit |
| `cpgf-6.28` | rewrite | gamma values combined and extended |
| `cpgl-6.04` | rewrite | merged sign cards; trimmed |
| `cpgl-6.05` | rewrite | merged 4-momentum conservation; added invariant mass |
| `cpgl-6.05b` | rewrite | merged general and numeric head-on cases |
| `supp-rolling-incline` | add | rolling-race problems appear on most forms |
| `supp-invariant-mass` | add | decay and threshold problems use invariant mass |

### Group B (em + lb)

| id | action | why |
|---|---|---|
| `cpgf-2.1` | merge-into:cpgf-2.38 | Same equation as cpgf-2.38 |
| `cpgf-2.2` | delete | Static case of Faraday's law |
| `cpgf-2.3` | delete | Class 1 basic |
| `cpgf-2.5` | delete | Class 1; inverse of E equals minus grad V |
| `cpgf-2.7` | merge-into:cpgf-2.6 | Poisson with zero charge |
| `cpgf-2.10` | delete | Integral form of curl-free E; trivial |
| `cpgf-2.11` | delete | Class 1 Coulomb's law |
| `cpgf-2.12` | delete | Class 1 Coulomb potential |
| `cpgf-2.17` | delete | Continuous version of energy sum; low yield |
| `cpgf-2.19` | merge-into:cpgf-2.20 | Class 1 definition Q = CV |
| `cpgf-2.22` | merge-into:cpgf-2.38 | Same equation as Maxwell div B |
| `cpgf-2.23` | delete | Static case of Ampere-Maxwell law |
| `cpgf-2.24` | delete | Integral form of div B; trivial |
| `cpgf-2.26` | delete | Definition only; low GRE yield |
| `cpgf-2.27` | delete | Class 1 Lorentz force |
| `cpgf-2.28` | merge-into:supp-parallel-wire-force | Wire-element force folded into parallel-wire card |
| `cpgf-2.34` | merge-into:cpgf-2.33 | B boundary conditions in one card |
| `cpgf-2.39` | merge-into:cpgf-2.38 | Divergence equations in one card |
| `cpgf-2.44` | merge-into:cpgf-2.45 | Definition folded into inductor emf |
| `cpgf-2.48` | delete | Definition p = qd; trivial |
| `cpgf-2.49` | delete | Integral dipole definition; low yield |
| `cpgf-2.51` | merge-into:cpgf-2.52 | Dipole torque and energy together |
| `cpgf-2.54` | merge-into:cpgf-2.52 | Magnetic analogue folded in |
| `cpgf-2.55` | merge-into:cpgf-2.52 | Magnetic analogue folded in |
| `cpgf-2.56a` | merge-into:cpgf-2.56 | Polarization direction folded into bound charge |
| `cpgf-2.57` | delete | Bound volume charge; low yield, kept in note |
| `cpgf-2.58` | merge-into:cpgf-2.59 | Substitution rule folded into dielectric card |
| `cpgf-2.61` | delete | Complex wave notation; definition only |
| `cpgf-2.62` | merge-into:supp-em-triad | B of plane wave in one card |
| `cpgf-2.64` | delete | Complex time-averaged Poynting; Griffiths-level |
| `cpgf-2.68` | merge-into:cpgf-2.67 | Total dipole power folded into scaling card |
| `cpgf-2.71` | delete | Duplicates Q = CV; Class 1 |
| `cpgf-2.72` | merge-into:cpgf-2.45 | Duplicates inductor emf |
| `cpgf-2.73` | delete | Class 1 series resistors |
| `cpgf-2.75` | merge-into:cpgf-2.74 | Inductor rules folded into combination card |
| `cpgf-2.76` | delete | Class 1 parallel resistors |
| `cpgf-2.77` | merge-into:cpgf-2.74 | Capacitor rules in one card |
| `cpgf-2.78` | merge-into:cpgf-2.74 | Inductor rules folded into combination card |
| `cpgf-2.80` | delete | Class 1 Kirchhoff current rule |
| `cpgf-2.81` | delete | Class 1 Kirchhoff voltage rule |
| `cpgf-2.82` | delete | Class 1 resistor power |
| `cpgf-2.83` | merge-into:cpgf-2.84 | Time constants in one card |
| `cpgf-7.1` | delete | Sample variance n-1; low GRE yield |
| `cpgf-7.2` | merge-into:cpgl-7.02b | Quadrature sum folded in |
| `cpgf-7.3` | delete | General propagation; special-case cards are faster |
| `cpgf-7.8` | merge-into:cpgf-7.7 | Impedances in one card |
| `cpgf-7.9` | merge-into:cpgf-7.7 | Impedances in one card |
| `cpgf-7.10` | delete | Same as resistor series rule |
| `cpgf-7.11` | delete | Same as resistor parallel rule |
| `cpgf-7.13` | merge-into:cpgf-7.12 | Both De Morgan laws in one card |
| `cpgf-7.15` | merge-into:cpgf-7.16 | Compton wavelength folded into shift card |
| `cpgf-7.18` | merge-into:cpgf-7.17 | Half-life folded into decay card |
| `cpgf-2.15a` | merge-into:cpgl-2.01 | Conductor facts in one card |
| `supp-impedance` | delete | Definition only; Kahn defines in prose |
| `supp-reactance` | delete | Not in Kahn; sign conventions only |
| `supp-reactance-LC` | merge-into:cpgf-7.7 | Duplicates impedance card |
| `supp-ac-reflection` | delete | Transmission lines; not in Kahn, rare on GRE |
| `supp-wave-travel` | merge-into:supp-em-triad | Phase-direction reading folded in |
| `supp-pec-em` | merge-into:supp-pec-reflect | Conductor reflection in one card |
| `supp-material-aux-fields` | delete | D and H fields; rare on GRE |
| `supp-capacitor-energy-halving` | merge-into:cpgf-2.84 | Half-times folded into time-constant card |
| `supp-lorentz-fields` | delete | Field transformations; rare on GRE |
| `supp-max-power-match` | merge-into:cpgf-2.70 | Resistive match R = r kept |
| `supp-magnetic-dipole-far-field` | merge-into:cpgf-2.32a | Far field folded into loop card |
| `supp-loop-axis-field` | merge-into:cpgf-2.32a | On-axis field folded into loop card |
| `supp-parallel-plate-field` | delete | Derivable in seconds from sheet field |
| `cpgl-2.02` | delete | Low GRE yield |
| `cpgl-7.02` | delete | Exactly the two error-propagation special-case cards |
| `cpgl-7.02a` | merge-into:cpgf-7.5 | Combined-error comparison folded in |
| `cpgl-7.03` | delete | Pure definition; low GRE yield |
| `cpgl-7.08a` | merge-into:cpgl-7.08 | Laser levels in one card |
| `cpgf-2.4` | rewrite | Protected; now a graph-reading question |
| `cpgf-2.8` | rewrite | Protected; now ring-centre application of superposition integral |
| `cpgf-2.16` | rewrite | Pair-sum form plus square-of-charges example |
| `cpgf-2.20` | rewrite | Rewritten as a scaling question |
| `cpgf-2.25` | rewrite | Added inside-a-thick-wire application |
| `cpgf-2.32a` | rewrite | Absorbed on-axis and far-field loop cards |
| `cpgf-2.33` | rewrite | Absorbed tangential B boundary condition |
| `cpgf-2.36` | rewrite | Fixed: radius formula holds relativistically with p |
| `cpgf-2.37` | rewrite | Fixed rotation sense; added speed independence |
| `cpgf-2.38` | rewrite | Absorbed div B; added monopole question |
| `cpgf-2.43` | rewrite | Protected; now emf and reciprocity application |
| `cpgf-2.45` | rewrite | Absorbed flux definition of L |
| `cpgf-2.46` | rewrite | Rewritten as a scaling question |
| `cpgf-2.50` | rewrite | Rewritten as a fall-off comparison |
| `cpgf-2.52` | rewrite | Absorbed dipole torque and magnetic analogues |
| `cpgf-2.56` | rewrite | Absorbed direction of polarization |
| `cpgf-2.59` | rewrite | Absorbed substitution rule; fixed-Q vs fixed-V cases |
| `cpgf-2.60` | rewrite | Extended to wave speed in a medium |
| `cpgf-2.65` | rewrite | Added scaling and energy-density link |
| `cpgf-2.66` | rewrite | Rewritten as a scaling question |
| `cpgf-2.67` | rewrite | Absorbed total dipole power; scaling form |
| `cpgf-2.69` | rewrite | Fixed raw HTML front; electric vs magnetic comparison |
| `cpgf-2.70` | rewrite | Protected; now internal resistance, divider, max power |
| `cpgf-2.74` | rewrite | Absorbed all C and L combination rules |
| `cpgf-2.79` | rewrite | Rewritten as a scaling question |
| `cpgf-2.84` | rewrite | Absorbed RL constant and capacitor half-times |
| `cpgf-7.5` | rewrite | Absorbed below-smallest-error comparison |
| `cpgf-7.6` | rewrite | Added P(0) and sigma equals root-mean |
| `cpgf-7.7` | rewrite | Absorbed L and R impedances; added limits |
| `cpgf-7.12` | rewrite | Absorbed second De Morgan law |
| `cpgf-7.14` | rewrite | Trimmed; stopping-voltage graph and threshold |
| `cpgf-7.16` | rewrite | Absorbed Compton wavelength; added maximum shift |
| `cpgf-7.17` | rewrite | Absorbed half-life relation |
| `supp-coaxial` | rewrite | Cut to C and L per length |
| `supp-em-triad` | rewrite | Absorbed B-wave form and phase-direction reading |
| `supp-pec-reflect` | rewrite | Absorbed fields-inside-conductor facts |
| `supp-coulomb-coupling` | rewrite | Added atomic eV nm form; removed meta note |
| `supp-drift-current` | rewrite | Protected; cut from 5 items to 3 |
| `supp-image-plane` | rewrite | Now asks for the image force |
| `supp-rc-rl-transients` | rewrite | Cut from 5 items to 4 |
| `supp-parallel-wire-force` | rewrite | Absorbed wire-segment force; dropped repeated wire field |
| `supp-radiation-field` | rewrite | Protected; cut from 4 items to 3 |
| `supp-sin2-cycle-average` | rewrite | Added rms voltage |
| `cpgl-2.01` | rewrite | Absorbed conductor field and cavity facts |
| `cpgl-7.01` | rewrite | Cut from 4 items to 2 |
| `cpgl-7.02b` | rewrite | Absorbed stat-plus-sys quadrature example |
| `cpgl-7.04` | rewrite | Now counting-time scaling question |
| `cpgl-7.05` | rewrite | Added ideal op-amp rules and inverting gain |
| `cpgl-7.05a` | rewrite | Self-gradable gate question instead of drawing |
| `cpgl-7.06` | rewrite | Cut from 4 bloated items to 3 |
| `cpgl-7.07` | rewrite | Trimmed; energy ranges and Z scaling |
| `cpgl-7.08` | rewrite | Cut to 4 types; fixed free-electron laser mechanism |
| `supp-cl-switch-limits` | add | Standard GRE graph question; Kahn Example 7.1 |
| `supp-lenz-law` | add | Induced-current direction questions; no card covered Lenz |
| `supp-sphere-inside-field` | add | Classic Gauss-law configuration missing from deck |
| `supp-rc-filters` | add | Kahn's most common impedance application on GRE |
| `supp-laser-operation` | add | Laser questions increasingly common; no operation card |
| `supp-motional-emf` | add | Frequent ETS induction setup; not in deck |
| `supp-scintillation-detector` | add | Detector trivia from Kahn 7.4.3; no card covered it |

### Group C (qm + at)

| id | action | why |
|---|---|---|
| `cpgf-5.1` | merge-into:cpgl-5.01 | Expectation-value rule already on 1D QM rules list |
| `cpgf-5.2` | delete | Class 1 normalization |
| `cpgf-5.3` | delete | Definition only; payoff facts kept on Hermitian list |
| `cpgf-5.4` | delete | Class 1 operator definitions |
| `cpgf-5.5` | merge-into:cpgl-5.01 | Expansion coefficient folded into measurement rule |
| `cpgf-5.6` | delete | Derivable in seconds from measurement rule |
| `cpgf-5.7` | delete | Dirac-notation definition, no GRE payoff |
| `cpgf-5.8` | delete | Dirac-notation definition, no GRE payoff |
| `cpgf-5.9` | delete | Dirac-notation definition, no GRE payoff |
| `cpgf-5.10` | delete | Dirac-notation definition, no GRE payoff |
| `cpgf-5.11` | delete | Dirac-notation definition, no GRE payoff |
| `cpgf-5.12` | delete | Class 1 Schrodinger equation |
| `cpgf-5.13` | delete | Class 1 Hamiltonian |
| `cpgf-5.14` | delete | Trivial substitution; time phase card kept |
| `cpgf-5.17` | merge-into:cpgf-5.16 | Variance definition added to uncertainty card |
| `cpgf-5.21` | delete | Class 1 oscillator Hamiltonian |
| `cpgf-5.23` | merge-into:cpgf-5.22 | Commutator added to ladder Hamiltonian card |
| `cpgf-5.25` | merge-into:supp-ho-moments | Duplicate oscillator energy split |
| `cpgf-5.29` | delete | Class 1 Planck relation |
| `cpgf-5.30` | delete | Class 1 3D Hamiltonian |
| `cpgf-5.31` | merge-into:cpgf-5.15 | 3D commutators folded into canonical commutator |
| `cpgf-5.32` | merge-into:cpgf-5.15 | 3D commutators folded into canonical commutator |
| `cpgf-5.34` | merge-into:cpgf-5.36 | Angular momentum components merged, cyclic |
| `cpgf-5.35` | merge-into:cpgf-5.36 | Angular momentum components merged, cyclic |
| `cpgf-5.38` | delete | Class 1 definition of L squared |
| `cpgf-5.39` | merge-into:cpgf-5.41 | Spherical harmonic eigenvalues merged |
| `cpgf-5.40` | merge-into:cpgf-5.41 | Spherical harmonic eigenvalues merged |
| `cpgf-5.42` | delete | Duplicate of spherical harmonics list |
| `cpgf-5.43` | delete | Class 1 hydrogen Hamiltonian |
| `cpgf-5.45` | merge-into:cpgl-5.12e | Ground-state wavefunction folded into 1s distances card |
| `cpgf-5.47` | merge-into:cpgf-5.46 | Hydrogen cluster: energy formulas consolidated |
| `cpgf-5.50` | merge-into:cpgf-5.49 | Sx and Sy eigenvectors on one card |
| `cpgf-5.51` | merge-into:cpgf-5.52 | Spin ladder definition and action merged |
| `cpgf-5.53` | merge-into:cpgf-5.52 | Spin ladder definition and action merged |
| `cpgf-5.55` | merge-into:cpgf-5.54 | Projections add; folded into spin addition |
| `cpgf-5.58` | merge-into:cpgl-5.11 | Kahn: remember features; formula folded into list |
| `cpgf-5.60` | merge-into:cpgl-5.15 | Same Stark Hamiltonian as Stark list item |
| `supp-qm-length-scales` | delete | Every entry duplicated elsewhere |
| `supp-qm-probability-current` | delete | Low yield for 17 days |
| `supp-adiabatic-condition` | delete | Low yield for 17 days |
| `cpgl-5.04` | delete | Product rules derivable on the spot |
| `cpgl-5.04a` | merge-into:cpgf-5.20 | Line width folded into energy-time card |
| `cpgl-5.06` | merge-into:cpgf-5.27 | Free-particle points folded into sin(kx) card |
| `cpgl-5.10` | merge-into:cpgf-5.56 | Maximal-spin symmetry folded into triplet card |
| `cpgl-5.12a` | merge-into:cpgf-5.46 | Hydrogen cluster: energy formulas consolidated |
| `cpgl-5.12b` | delete | One-step division from L = n hbar |
| `cpgl-5.12c` | merge-into:cpgl-5.12 | De Broglie condition folded into Bohr model card |
| `cpgl-5.12f` | merge-into:cpgf-5.46 | Hydrogen cluster: energy formulas consolidated |
| `cpgl-5.12g` | merge-into:cpgf-5.44 | Hydrogen cluster: orbit radius on Bohr radius card |
| `cpgl-5.12k` | merge-into:cpgl-5.12j | Muon atoms on one card |
| `cpgl-5.14c` | merge-into:cpgl-5.14b | Noble gases folded into filling-order card |
| `cpgl-5.14d` | delete | Chemistry trivia, low GRE yield |
| `cpgl-5.14e` | merge-into:cpgl-5.14a | Allowed l and m folded into state counts |
| `cpgl-5.14f` | delete | Trivial electron counting |
| `cpgl-5.14g` | delete | Trivial configuration example |
| `cpgl-5.14h` | delete | Notation only |
| `cpgl-5.18` | merge-into:cpgf-5.63 | Duplicate of Stefan-Boltzmann and Wien cards |
| `cpgl-5.19` | delete | Class 1 bound versus scattering |
| `cpgf-5.15` | rewrite | LaTeX front; absorbs 3D commutators |
| `cpgf-5.16` | rewrite | Floor wording; absorbs variance definition |
| `cpgf-5.18` | rewrite | Protected; rewritten as floor and minimum-uncertainty question |
| `cpgf-5.19` | rewrite | Rewritten as confinement-energy scaling |
| `cpgf-5.20` | rewrite | LaTeX front; absorbs natural line width |
| `cpgf-5.22` | rewrite | LaTeX front; absorbs ladder commutator |
| `cpgf-5.24` | rewrite | LaTeX front; adds level spacing |
| `cpgf-5.26` | rewrite | LaTeX front; adds degeneracy counting |
| `cpgf-5.27` | rewrite | Protected; rewritten as sin(kx) measurement question |
| `cpgf-5.28` | rewrite | LaTeX front; adds kinetic-energy scaling |
| `cpgf-5.33` | rewrite | LaTeX front; adds origin of r squared |
| `cpgf-5.36` | rewrite | LaTeX front; absorbs other two components |
| `cpgf-5.37` | rewrite | LaTeX front; adds compatibility consequence |
| `cpgf-5.41` | rewrite | LaTeX front; absorbs both eigenvalue equations |
| `cpgf-5.44` | rewrite | Hydrogen cluster survivor: Bohr radius plus r_n |
| `cpgf-5.46` | rewrite | Hydrogen cluster survivor: all energy forms on one card |
| `cpgf-5.48` | rewrite | LaTeX front; absorbs alpha facts from hydrogen list |
| `cpgf-5.49` | rewrite | LaTeX front; absorbs Sy eigenvectors |
| `cpgf-5.52` | rewrite | LaTeX front; absorbs ladder definition and spin-down action |
| `cpgf-5.54` | rewrite | Absorbs projection rule |
| `cpgf-5.56` | rewrite | Now singlet plus triplet with exchange symmetry |
| `cpgf-5.57` | rewrite | LaTeX front; adds zero-by-symmetry consequence |
| `cpgf-5.59` | rewrite | Adds expectation values in a j state |
| `cpgf-5.61` | rewrite | LaTeX front; explains factor 2 |
| `cpgf-5.62` | rewrite | Kahn says do not memorize; now conceptual limits |
| `cpgf-5.64` | rewrite | LaTeX front; adds worked peaks |
| `supp-energy-phase` | rewrite | Adds two-level oscillation frequency |
| `supp-sho-ladder` | rewrite | Cut to exact formulas plus one use |
| `supp-infinite-well` | rewrite | Split; part 1 with width scaling |
| `supp-step-barrier` | rewrite | Cross-card reference removed from note |
| `supp-dipole-selection-extra` | rewrite | Cross-card references removed |
| `supp-term-hund` | rewrite | Cut from 5 to 4 items |
| `supp-hydrogenic-z-scaling` | rewrite | Hydrogen cluster: rewritten as scaling question with Z trap |
| `supp-xray-edges` | rewrite | Cut to Moseley and Duane-Hunt; counts fixed |
| `supp-rigid-rotor` | rewrite | Cut to 4 items; self-reference removed |
| `supp-magnetons` | rewrite | Cut to 3 items; self-reference removed |
| `cpgl-5.01` | rewrite | Absorbs expansion-coefficient formula |
| `cpgl-5.03` | rewrite | Cut from 6 to 4 items |
| `cpgl-5.05` | rewrite | Virial item removed (duplicate) |
| `cpgl-5.07` | rewrite | Plain-text delta fixed; step caveat added |
| `cpgl-5.08` | rewrite | Orthonormality integral trimmed |
| `cpgl-5.09` | rewrite | Alpha item removed (duplicate) |
| `cpgl-5.11` | rewrite | Absorbs second-order formula |
| `cpgl-5.12` | rewrite | Hydrogen cluster: absorbs de Broglie standing-wave condition |
| `cpgl-5.12h` | rewrite | Trimmed; front self-contained |
| `cpgl-5.12j` | rewrite | Hydrogen cluster: absorbs muonium comparison |
| `cpgl-5.12d` | rewrite | 1s duplicate and cross-card note removed |
| `cpgl-5.12e` | rewrite | Hydrogen cluster: absorbs ground-state wavefunction |
| `cpgl-5.13` | rewrite | Trimmed to sizes and causes |
| `cpgl-5.14a` | rewrite | Absorbs allowed l and m; table removed |
| `cpgl-5.14b` | rewrite | Absorbs noble gases; front self-contained |
| `cpgl-5.16` | rewrite | Weak-field spin clause corrected |
| `cpgl-9.01` | rewrite | Five-number list cut to the one fact found nowhere else |
| `supp-infinite-well-centered` | add | Split from infinite-well card: centered well |
| `supp-hydrogen-series` | add | Missing high-yield spectral series |
| `supp-hydrogen-line-1240` | add | Missing 1240/E conversion with Lyman-alpha and H-alpha |
| `supp-two-electron-exchange` | add | Missing exchange-symmetry fact, frequent on ETS exams |
| `supp-spin-half-properties` | add | Missing Pauli-matrix properties |
| `supp-spin-measurement` | add | Missing common spin-measurement question |
| `supp-stern-gerlach` | add | Missing classic spin experiment |
| `supp-delta-well-bound` | add | Missing delta-well bound-state facts |
| `supp-tunneling-scaling` | add | Missing tunneling scaling |

### Group D (th + ow + sp)

| id | action | why |
|---|---|---|
| `cpgf-3.2` | delete | Class 1 wave basics |
| `cpgf-3.3` | delete | Class 1 wave basics |
| `cpgf-3.4` | delete | Class 1 wave basics |
| `cpgf-3.23` | delete | Class 1: law of reflection |
| `cpgl-3.01` | delete | Book-meta front; Snell general form kept elsewhere |
| `cpgl-3.02a` | delete | Trivial definition of fundamental mode |
| `cpgl-3.10b` | delete | Trivial average; fact kept in polarizer card |
| `cpgf-4.2` | delete | Class 1 definitions |
| `cpgf-4.3` | delete | Class 1 definitions |
| `cpgf-4.12` | delete | Class 1 definitions |
| `cpgf-4.19` | delete | Equality case of reversible heat relation |
| `cpgf-4.22` | merge-into:cpgf-4.21 | Read off fundamental identity |
| `cpgf-4.23` | merge-into:cpgf-4.21 | Read off fundamental identity |
| `cpgf-8.4` | delete | Special case of particle-number integral |
| `cpgl-8.06` | delete | Nobel trivia; Kahn calls it anecdotal |
| `cpgl-8.07` | delete | Nobel trivia; Kahn calls it anecdotal |
| `supp-euler` | delete | Class 1 math |
| `cpgf-4.9` | delete | Full Sackur-Tetrode low yield; scaling form kept |
| `cpgf-4.11` | delete | Classical N-particle partition integral low yield |
| `cpgf-4.13` | delete | Stirling rarely tested |
| `cpgf-4.16` | delete | Class 1 formulas |
| `cpgf-4.35` | delete | Class 1 formulas |
| `cpgf-4.24` | delete | Maxwell relations derivable; one method card kept |
| `cpgf-4.28` | delete | Maxwell relations derivable; one method card kept |
| `cpgf-4.30` | delete | Maxwell relations derivable; one method card kept |
| `cpgf-8.3` | delete | Full DOS prefactor low yield; scaling kept |
| `cpgl-8.01` | delete | Reciprocal lattice low yield |
| `cpgl-8.05` | delete | Qualitative cosmology low yield |
| `supp-band-mass` | delete | Low-yield specialized topic |
| `supp-scattering-rate` | delete | Low-yield specialized topic |
| `cpgf-3.5` | merge-into:cpgf-3.6a | Definitions folded into dispersion card |
| `cpgf-3.6` | merge-into:cpgf-3.6a | Definitions folded into dispersion card |
| `cpgf-3.9` | merge-into:cpgf-3.8 | Same index-of-refraction fact |
| `cpgf-3.12` | merge-into:cpgf-3.14 | Interference conditions merged with phase card |
| `cpgf-3.13` | merge-into:cpgf-3.14 | Interference conditions merged with phase card |
| `cpgf-3.16` | merge-into:cpgf-3.15 | Double-slit maxima and minima together |
| `cpgf-3.20` | merge-into:cpgf-3.19 | Two halves of one phase rule |
| `cpgf-3.25` | merge-into:cpgf-3.24 | General-wave Snell form |
| `cpgf-3.30` | merge-into:cpgf-3.29 | Two halves of one sign rule |
| `cpgf-3.11` | merge-into:supp-brewster-angle | Duplicate Brewster card |
| `cpgl-3.02` | merge-into:supp-acoustic-modes | Duplicate pipe boundary conditions |
| `cpgf-4.1` | merge-into:cpgf-4.5 | Duplicate Boltzmann probability |
| `cpgf-4.4` | merge-into:cpgf-4.5 | Duplicate Boltzmann probability |
| `cpgf-4.17` | merge-into:cpgf-4.18 | Reversible work and heat together |
| `cpgf-4.25` | merge-into:cpgf-4.27 | Three potentials on one card |
| `cpgf-4.26` | merge-into:cpgf-4.27 | Three potentials on one card |
| `cpgf-4.31` | merge-into:cpgf-4.32 | Heat-capacity definitions on one card |
| `cpgf-4.33` | merge-into:cpgf-4.32 | Heat-capacity definitions on one card |
| `cpgl-4.03b` | merge-into:cpgf-4.32 | Heat-capacity definitions on one card |
| `cpgl-4.03c` | merge-into:cpgf-4.34 | Mayer relation and reason on one card |
| `cpgl-4.03d` | merge-into:cpgf-4.34 | Mayer relation and reason on one card |
| `cpgf-4.36` | merge-into:cpgf-4.37 | Efficiency, Carnot bound and entropy link together |
| `cpgl-4.03k` | merge-into:cpgf-4.37 | Efficiency, Carnot bound and entropy link together |
| `cpgf-4.38` | merge-into:cpgl-4.03g | Equipartition cluster on one card |
| `supp-equipartition` | merge-into:cpgl-4.03g | Equipartition cluster on one card |
| `cpgl-4.03e` | merge-into:cpgl-4.03g | Equipartition cluster on one card |
| `cpgf-4.39` | merge-into:cpgl-4.03a | Duplicate Maxwell speeds |
| `supp-maxwell-speeds` | merge-into:cpgl-4.03a | Duplicate Maxwell speeds |
| `cpgf-4.41` | merge-into:cpgf-4.40 | Two forms of sound speed |
| `cpgf-4.43` | merge-into:cpgf-4.42 | FD and BE differ by one sign |
| `cpgf-4.44` | merge-into:cpgf-4.45 | Sum and integral forms together |
| `cpgl-4.03j` | merge-into:supp-heat-pump-cop | Duplicate heat-pump COP |
| `cpgf-8.1` | merge-into:cpgf-8.2 | Fermi wavevector and energy together |
| `cpgf-8.5` | merge-into:cpgf-8.6 | DOS at Fermi level folded in |
| `cpgf-8.7` | merge-into:cpgl-8.04a | Redshift cluster on one card |
| `cpgf-8.9` | merge-into:cpgl-8.04a | Redshift cluster on one card |
| `cpgl-8.04` | merge-into:cpgl-8.04a | Redshift cluster on one card |
| `cpgl-8.03a` | merge-into:cpgl-8.03 | Phonon pairing folded into superconductivity list |
| `cpgf-3.6a` | rewrite | Absorbed phase and group velocity definitions |
| `cpgf-3.8` | rewrite | Absorbed wavelength-in-medium card |
| `cpgf-3.14` | rewrite | Absorbed constructive and destructive conditions |
| `cpgf-3.15` | rewrite | Absorbed minima; added fringe spacing |
| `cpgf-3.19` | rewrite | Absorbed no-shift case |
| `cpgf-3.24` | rewrite | Absorbed general-wave form |
| `cpgf-3.29` | rewrite | Absorbed negative case; added real/virtual |
| `cpgf-3.31` | rewrite | Rewritten as scaling question |
| `cpgf-4.5` | rewrite | Absorbed Boltzmann probability cards |
| `cpgf-4.10` | rewrite | Rewritten as scaling question |
| `cpgf-4.15` | rewrite | Bound wording fixed |
| `cpgf-4.18` | rewrite | Absorbed reversible work card |
| `cpgf-4.21` | rewrite | Absorbed temperature and pressure derivatives |
| `cpgf-4.27` | rewrite | Absorbed enthalpy and Helmholtz differentials |
| `cpgf-4.29` | rewrite | Now the one Maxwell-relation method card |
| `cpgf-4.32` | rewrite | Absorbed C_V definition and derivation cards |
| `cpgf-4.34` | rewrite | Absorbed molar form and reason |
| `cpgf-4.37` | rewrite | Bound wording fixed; absorbed efficiency and entropy link |
| `cpgf-4.40` | rewrite | Absorbed temperature form; scaling added |
| `cpgf-4.42` | rewrite | Absorbed Bose-Einstein card |
| `cpgf-4.45` | rewrite | Absorbed discrete-sum form |
| `cpgf-8.2` | rewrite | Absorbed Fermi wavevector; scaling added |
| `cpgf-8.6` | rewrite | Absorbed DOS at the Fermi level |
| `supp-optical-magnification` | rewrite | Galilean telescope wording fixed |
| `supp-acoustic-modes` | rewrite | Back now answers the node question |
| `supp-lattice-heat-capacity` | rewrite | Cut to three key items |
| `supp-van-der-waals` | rewrite | Front now asks what a and b mean |
| `supp-fourier-conduction` | rewrite | Added slab and series scaling |
| `supp-heat-pump-cop` | rewrite | Absorbed duplicate; cut to three items |
| `supp-nuclear-q` | rewrite | Split; Q values moved to new card |
| `supp-fourier-series` | rewrite | Re-tagged as math methods |
| `supp-residues` | rewrite | Re-tagged as math methods |
| `supp-matrix-det-trace` | rewrite | Re-tagged; cut to four items |
| `supp-thin-film` | rewrite | Added anti-reflection coating limit |
| `supp-mean-free-path` | rewrite | Single symbol for mean free path |
| `supp-brewster-angle` | rewrite | Absorbed duplicate Brewster card |
| `cpgl-3.10a` | rewrite | Rewritten as three-polarizer problem |
| `cpgl-4.01` | rewrite | Trimmed to two items |
| `cpgl-4.02` | rewrite | Cut to third and zeroth laws |
| `cpgl-4.03` | rewrite | Cut from six items to three |
| `cpgl-4.03a` | rewrite | Absorbed duplicate speed cards |
| `cpgl-4.03g` | rewrite | Absorbed equipartition cluster |
| `cpgl-4.03h` | rewrite | Cut to isothermal case; adiabatic moved to new card |
| `cpgl-8.03` | rewrite | Absorbed phonon pairing and isotope effect |
| `cpgl-8.04a` | rewrite | Absorbed redshift cluster |
| `cpgl-8.13` | rewrite | Rewritten as application question |
| `cpgl-8.14` | rewrite | Dropped doubtful muon-spin claim |
| `cpgl-8.09` | rewrite | Particle names put in LaTeX |
| `supp-beta-q-value` | split-from:supp-nuclear-q | Split from binding-energy card |
| `supp-free-expansion` | add | Classic GRE irreversible-entropy item |
| `supp-adiabatic-temperature` | add | Adiabatic compression temperature questions are frequent |
| `supp-cycle-area` | add | Cycle-diagram questions appear on most exams |
| `supp-decay-bookkeeping` | add | Daughter-nucleus and chain-counting questions recur |
| `supp-total-internal-reflection` | add | Critical-angle questions recur, also for sound |
| `supp-reservoir-entropy` | add | Total-entropy sign and mixing questions recur |
| `supp-two-level-populations` | add | Boltzmann population ratios are a frequent GRE item |

### Group F (review fix pass)

| id | action | why |
|---|---|---|
| `cpgf-1.39` | rewrite | Realigned with visualizer: spring EOM first, series/parallel second |
| `cpgf-2.70` | rewrite | Realigned with Ohm visualizer; absorbed stretched-wire card |
| `cpgf-2.79` | merge-into:cpgf-2.70 | Stretched-wire R scaling now on Ohm visualizer card |
| `supp-battery-internal-resistance` | add | Internal resistance and max power moved off cpgf-2.70 |
| `cpgf-1.4` | rewrite | Realigned with visualizer: centripetal force, tangential fly-off, loop top |
| `cpgf-1.20` | rewrite | Realigned with torque visualizer: conservation plus gyroscope precession |
| `cpgl-5.01` | rewrite | Vague book-based front made three concrete questions |
| `cpgl-5.02` | rewrite | Vague book-based front made two concrete questions |
| `cpgl-5.05` | rewrite | Vague trivia front made two concrete questions |
| `cpgl-5.07` | rewrite | Vague book-based front made three concrete questions |
| `cpgl-5.08` | rewrite | Vague book-based front made four concrete questions |
| `cpgl-5.09` | rewrite | Vague trivia front made two concrete questions |
| `cpgl-5.15` | rewrite | Vague book-based front made three concrete questions |
| `cpgl-5.17` | rewrite | Now asks which listed transitions are dipole-allowed |
| `supp-gravity-orbits` | rewrite | Added elliptical-orbit energy and vis-viva; circle and escape as limits |
| `supp-kirchhoff-rules` | add | Restored Kirchhoff rules; deleted earlier, still a GRE staple |
| `supp-impulse-power` | add | Mechanics staple missing: impulse-momentum and power |
| `cpgf-5.44` | rewrite | One symbol a0; scaling and e-squared remark left to Z-scaling card |
| `cpgf-5.46` | rewrite | Removed duplicated mu scaling; a renamed a0 |
| `supp-hydrogenic-z-scaling` | rewrite | Sole home of mu/Z scaling; radius written r_n |
| `cpgf-6.28` | rewrite | Cut to four standard speeds |
| `supp-optical-magnification` | rewrite | Front and back now agree on two items |
| `supp-free-expansion` | rewrite | Cut to three asked quantities |
| `cpgl-5.12i` | rewrite | Trimmed charge-conjugation item |
| `supp-step-barrier` | rewrite | Explicit V_L, V_R and step extending to infinity |
| `supp-residues` | rewrite | Clockwise flips theorem sign, not residues; added order-n formula |
| `cpgf-2.37` | rewrite | Viewing direction stated in front |
| `cpgf-3.22` | rewrite | Front names Bragg's law |
| `cpgf-2.32a` | rewrite | Stale name replaced to match centre, axis, far-field content |
| `supp-lenz-law` | rewrite | Lead display now the answer, not Faraday law |
| `supp-hydrogen-line-1240` | rewrite | Lead display now the two wavelengths |
| `cpgl-5.10a` | rewrite | Added leading display of exchange symmetry |
| `cpgl-8.09` | rewrite | Tau-to-muon mass ratio corrected from 20 to 17 |
| `supp-rutherford-scattering` | add | High-yield missing: Rutherford cross-section and nucleus discovery |
| `cpgl-5.12d` | retag:Hydrogen atom | Radial wavefunction or reduced-mass content, not Bohr model |
| `cpgl-5.12e` | retag:Hydrogen atom | Radial wavefunction or reduced-mass content, not Bohr model |
| `cpgl-5.12j` | retag:Hydrogen atom | Radial wavefunction or reduced-mass content, not Bohr model |
| `cpgl-5.12h` | retag:Positronium | One positronium tag |
