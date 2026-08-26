# Generation test of `docs/Project Docs/PGRE-Philosophy.md`

Closed-book run. The only source opened was the philosophy file. No bank, no FINDINGS, no PDFs, no CPG, no web. The items below are original physics situations written to the craft described there, not reconstructions of released stems.

Judgment is at the end: **BORDERLINE**.

---

## 1. Three GRE-style drafts

### Item G1 (classical mechanics)

Satellites of masses $m$ and $2m$ are in circular orbits of radii $3R$ and $6R$ about a planet of mass $M$ and radius $R$. The ratio of the lighter satellite's total mechanical energy to the heavier satellite's is

(A) $1/4$

(B) $1/2$

(C) $1$

(D) $2$

(E) $4$

**Intended key:** (C)

**Design note.** Cheap door: for circular orbits the slogan is $E=-GMm/(2r)$, so $E\propto -m/r$; the engineered pair $(m,3R)$ and $(2m,6R)$ makes the ratio $1$ by inspection. $M$ never enters, and $R$ is only a length unit. Failed theories in the distractors: $E\propto -mr$ gives $1/4$; keeping only the mass ratio or only the radius ratio gives $1/2$; inverting the ratio gives $2$; using force-scaling $E\propto -m/r^2$ gives $2$ as well, or the product of both naive ratios gives $4$. This is a decision about which quantities the energy depends on, not a derivation of Kepler plus virial from Newton's law. A student who writes the general formula using every symbol, including $M$, has already missed the cancellation the numbers were planted to expose. Arithmetic snaps; no calculator.

### Item G2 (electrostatics)

A point charge $q$ sits at the center of a grounded conducting spherical shell of inner radius $a$ and outer radius $b$. The charge on the outer surface of the shell is

(A) $0$

(B) $q$

(C) $-q$

(D) $qa/b$

(E) $q(1-a/b)$

**Intended key:** (A)

**Design note.** Cheap door is the refusal: grounded to infinity means the conductor's potential is zero, the field for $r>b$ is that of the net charge, and $V=kQ_{\mathrm{out}}/b=0$ forces $Q_{\mathrm{out}}=0$. The inner surface is $-q$ by Gauss inside the metal; that fact is not asked. $a$ and $b$ are unused givens. Failed theories: (B) is the outer charge on an *isolated neutral* shell (the correct answer to a nearby problem); (C) parks the induced charge on the wrong surface; (D) and (E) are capacitance-divider / geometric interpolations a student writes when they believe two radii must both appear. Two routes exist: the grounding slogan, or Gauss plus $V=0$ in one line. The expensive costume is a three-region boundary-value problem. The item does not ask for $\Phi(r)$.

### Item G3 (quantum mechanics)

A particle of mass $m$ occupies the ground state of an infinite well $0<x<a$. At $t=0$ the wall at $x=a$ is moved suddenly to $x=2a$. Which of the following changes discontinuously at $t=0$?

(A) $\Psi(x)$

(B) $|\Psi(x)|^2$

(C) $\langle x\rangle$

(D) the energy eigenvalues of the Hamiltonian

(E) the probability that $0<x<a/2$

**Intended key:** (D)

**Design note.** Cheap door: "immediately after" is a clock on which variables may jump. A finite-time Schrödinger evolution cannot discontinuity $\Psi$, so (A), (B), (C), and (E) are continuous; the Hamiltonian (the walls) is what the stem changed, so its eigenvalues jump. $m$ is unused bait for anyone who starts writing $E_n=\pi^2\hbar^2 n^2/(2ma^2)$ before and after. Failed theories: the state instantly becomes the new ground state (A); probability density tracks the new walls (B, E); the particle instantly occupies the opened region so $\langle x\rangle$ jumps (C). The sophisticated neighbor is the Fourier expansion in the new basis, which is the textbook problem below and is not being asked. One slogan — sudden approximation plus "operators can jump, the state cannot" — then stop.

---

## 2. Textbook counterexample (same physics family as G3)

### Item T1

A particle of mass $m$ occupies the ground state of a one-dimensional infinite square well of width $a$ ($0\le x\le a$). At $t=0$ the well expands suddenly to width $2a$ ($0\le x\le 2a$). The probability that an energy measurement immediately after $t=0$ yields the ground-state energy of the expanded well is

(A) $0$

(B) $\dfrac{4\sqrt{2}}{3\pi}$

(C) $\dfrac{16}{9\pi^2}$

(D) $\dfrac{32}{9\pi^2}$

(E) $1$

**Intended key:** (D), from the overlap $c_1=4\sqrt{2}/(3\pi)$.

**Why this fails as GRE, using only the philosophy's tests.**

A homework grader would accept a page of overlap integrals as the intended solution. The intended path is not a named identity, a limit, a symmetry, a conservation selector, a units veto, or a one-line substitution after an identification; it is a Fourier coefficient. That already fails "How to know you have written one."

The stem is well-posed for *computation*: every given is needed for the integral (even though $a$ and $m$ cancel after a few lines), the unknown is named ("the probability that a measurement yields the new ground-state energy"), and the path length is part of the pedagogy. A GRE stem is well-posed for discrimination. This one does not withhold the procedure and does not plant an unused given that a grinding solver will try to use.

There is no cheap door. The situation could support a general expansion; the item asks the general expansion. "If the setup could support a general problem and you have asked the general problem, you have written the clone." Attaching five choices — even autopsy choices (forgetting to square $c$, dropping a normalization $\sqrt{2}$, claiming orthogonality so the answer is $0$, claiming it remains in "the" ground state so the answer is $1$) — does not convert a derivation. "Harder" is not a synonym for "more GRE-like." A prepared examinee who sees no trick still needs several minutes and a careful integral; the arithmetic does not snap. That fails the hundred-second / no-calculator design constraint.

G3 uses the same apparatus and asks a different unknown: which quantity is allowed to jump. That is the GRE item this costume can support. T1 is the textbook unknown with five numbers glued on.

---

## 3. Audit of the three GRE-style drafts

Tests taken from "How to know you have written one" and neighboring sections. Applied one item at a time.

### G1 — satellite energy ratio

| Test | Result |
|---|---|
| Would a homework grader accept a page of algebra as the intended solution? | No. Intended path is $E=-GMm/(2r)$ and a cancellation. A student *can* derive circular-orbit energy from Newton; that is the expensive look, not the designed path. |
| Does the stem use every given? | No. $M$ cancels. $R$ is a unit. Unused-given filter present. |
| Theatrical setup with a cheap door? | Mildly theatrical (two satellites, a planet of radius $R$). Door is the engineered $m/r$ match. Not as theatrical as G2/G3. |
| Hide the instruction? Name the world, not the theorem? | Does not say "use $E=-GMm/2r$" or "virial theorem." Asks a ratio. Pass. |
| Four wrong choices name failed theories? | Yes: $E\propto mr$, $E\propto m$, $E\propto 1/r$, $E\propto m/r^2$, inverted ratio. Not a jitter around a computed value. |
| Second route (limit, dimensions, symmetry) the stem did not request? | Dimensions: ratio is dimensionless, so $G,M$ drop. Seeing $E\propto m/r$ plus the planted $2$'s is enough; one need not remember the $1/2$. Weak limit-check (sending $M\to\infty$ does not discriminate among the five). Pass on dimensions; weak on limits. |
| Graduate costume demanding graduate machinery? | No. Freshman gravity. |
| Could the key be zero / unchanged / independent / cannot? | Key is $1$, which is a cancellation, not a refusal. Legal; the set as a whole has a refusal in G2. |
| Figure an argument? | No figure. Stem stands alone; choices carry the numbers. Correct dependency. |
| Hundred seconds, no calculator, arithmetic snaps? | Yes: $(m)/(2m)\times(6R)/(3R)=1$. |
| At home as unmarked textbook exercise / REA / qualifier / chapter-end with five choices? | A textbook would ask for each energy, or the work to move one satellite. Asking the ratio with planted $2$'s is not that workout. Pass. |
| One cognitive move, then stop? | Yes: dependence $E\propto m/r$. The item does *not* test the factor $1/2$ (kinetic-only and potential-only give the same ratio). That is a feature if the move is the cancellation; it would be a defect if the writer had wanted virial. |

**Verdict: survives.** Reservation: the costume is a canonical satellite, and the unknown is close to a standard formula plug-in. The planted cancellation and unused $M$ are what keep it on the GRE side of the line. A later agent who omitted the unused $M$ and the engineered $2$'s would be writing homework.

### G2 — grounded shell, outer charge

| Test | Result |
|---|---|
| Page of algebra as intended solution? | No. Intended path is grounded $\Rightarrow Q_{\mathrm{out}}=0$. The three-region Laplace solution is the costume, not the work. |
| Every given used? | No. $a$ and $b$ never enter. Strong unused-given filter. |
| Theatrical setup, cheap door? | Yes. Thick shell, two radii, a point charge: looks like a boundary-value problem. Door is grounding. |
| Hide the instruction? | Does not name Gauss, uniqueness, or "induced charge." Asks for a charge on a named surface. Pass. |
| Failed theories? | (B) isolated-neutral outer charge — the correct answer to the neighboring problem. (C) wrong surface. (D),(E) both radii must appear. Pass. |
| Second route? | Gauss in the metal gives inner $=-q$; $V=0$ at infinity plus $E=0$ in the metal gives $Q_{\mathrm{net,\;shell}}=-q$, hence outer $=0$. Limit $b\to a$ (thin shell) still $0$, which kills (D) and (E) without the grounding slogan. Pass. |
| Graduate machinery? | No. Undergraduate conductors. |
| Refusal as key? | Yes: $0$. The setup looks expensive and nothing is on the outer surface. |
| Figure? | None. A figure would be decoration of a stem that already names inner/outer radii. Correctly omitted. |
| Hundred seconds, snaps? | Yes, if the slogan is held. If the examinee starts expanding in Legendre polynomials, they are off the designed path — which is how the item is built. |
| Textbook exercise with five choices? | A textbook *does* ask induced charges on spherical shells. The GRE move is asking *only* the outer surface after grounding, with $a,b$ as bait, and planting the isolated-shell answer as a distractor. Narrowly pass. |

**Verdict: survives, with a cloning-risk flag.** The apparatus is extremely standard. The philosophy says write new situations that make the same *kind of demand*, and not to paraphrase an ETS stem closely enough to be recognized. Closed-book, I cannot know whether a grounded-shell outer-charge item already sits on a released form. The *demand* (grounded vs isolated, unused radii, key $0$) is what the document authorizes. A later agent should restage the same demand on a less canonical conductor (coaxial sheath, conducting plane with a cavity) rather than reuse this apparatus.

### G3 — sudden well, what jumps

| Test | Result |
|---|---|
| Page of algebra as intended solution? | No. If the examinee starts computing overlaps, they are solving T1, not G3. |
| Every given used? | $m$ unused. $a$ and $2a$ stage the world. Pure-recognition-plus-unused-mass. Pass. |
| Theatrical setup, cheap door? | Yes. Expanding well is a time-dependent Hamiltonian. Door is continuity of $\Psi$. |
| Hide the instruction? | Does not name "sudden approximation." Pass. |
| Failed theories? | Instant projection onto the new ground state; probability instantly filling the new region; $\langle x\rangle$ jumping. Pass. |
| Second route? | Time-continuity of the Schrödinger equation: $\Psi$ cannot jump, so (A)(B)(C)(E) die together and only (D) remains. The stem never asks for that argument. Pass. |
| Graduate costume? | Infinite well is freshman/sophomore. Demanded performance is not a time-dependent perturbation series (explicitly out of scope in the document). Pass. |
| Refusal? | Key is not "unchanged"; four of five choices *are* unchanged and are wrong because the question asked what *does* change. The poison word is "changes." Related spirit, different grammar. |
| Figure? | None. Correct. |
| Hundred seconds? | Yes. No arithmetic. |
| Textbook with five choices? | The textbook unknown on this apparatus is T1. G3 asks a different unknown. Pass. |
| One move then stop? | Yes. |

**Clarity reservation (the document warns that even after review, items still have clarity/correctness issues).** A pedant can argue that "the wave function $\Psi(x)$" at $t=0^+$ is the old ground state padded with zeros, which is a different *named function* than the $t=0^-$ ground state on $(0,a)$ because the domain changed. The intended reading is sudden approximation: the state as a function of $x$ does not jump. If both (A) and (D) are defensible, the item is broken. A later pass should define $\Psi$ as the actual state of the particle, or replace (A) with "the expectation value of the Hamiltonian" (which *does* change, because $H$ changed while $\Psi$ did not — actually $\langle H\rangle=\langle p^2/2m\rangle$ is continuous for this expansion, since $V=0$ wherever the old $\Psi$ lives. That replacement would create a second-key problem. Leave (A) as $\Psi$ of the particle, and live with the domain quibble, or rewrite (A) as "the probability density in $a<x<2a$ becoming immediately nonzero." The latter is cleaner: it is false, and not ambiguous.

**Verdict: survives, with a clarity fix recommended for choice (A).** Not homework in GRE clothing. This is the item that most clearly demonstrates what the philosophy is for: same world as T1, different unknown, different species.

### Audit summary

- G1: survives.
- G2: survives, cloning-risk on the apparatus.
- G3: survives, needs a tighter wording of (A).

None of the three is a page-of-algebra workout with five numbers attached. G3 is the cleanest GRE item. G1 is a short-formula item whose move is a cancellation. G2 is the refusal. The set is not a mechanics-only quiz. Difficulty is mixed rather than easy-then-cliff: G1 is a snap if the slogan is held, G2 is a narrower identification, G3 is qualitative structure. No item requires a calculator. No item is a pure units-veto (units never kill a G1/G2/G3 choice by themselves; that is acceptable — the document forbids a paper of *nothing but* unit-veto items, and also forbids a paper where units *never* kill a choice; a three-item drill cannot satisfy both at once, and the document says mix is a sitting-level constraint).

Honest leftover: G1 and G2 both dress canonical undergraduate apparatus. The document's "costume is not content" and "finite reuse is not permission to clone" pull opposite directions for a closed-book writer. I used canonical apparatus on purpose so the *demand* would be visible. A production agent needs a sentence on how far to restage.

---

## 4. Gap list

Each entry is tagged **silent** (the file does not decide it) or **unused** (the file decides it and this run did not need to, or did not fully use it).

### Stem length

The file is not silent. Later forms: median under thirty words once markup is stripped; older closer to forty or fifty; length is not difficulty; do not add think-time by writing a longer stem; write for current grammar. G2 sits under thirty. G1 and G3 sit in the low thirties. I used what was there. Residual uncertainty is calibration (is $32$ words already "talkative"?), which a median cannot settle for a single item. **Mostly specified. Unused: none.**

### Numeric engineering

The file is not silent. No calculator; numbers snap; Pythagorean energy-momentum triples; $\gamma$ a small integer; kelvin ratios integers; coefficients that square to simple probabilities; if the arithmetic is ugly the wrong identity is in play; numeric clusters spaced by factors of two, by decades, or by named wrong formulas ($\tfrac12 kT$, $kT$, $\tfrac32 kT$). G1 uses planted $2$'s. G2 and G3 are not numeric. **Specified for computational items. Silent on:** when a short drill *must* include a numeric item at all; how to space distractors when the key is $0$ or $1$ and the wrong answers are formulas rather than numbers.

### When to use a figure

The file is not silent on the dependency. Figures are data, not illustration; roughly three in ten on later forms; if the figure is decoration, delete it; a fully specified verbal stem plus a figure has the dependency backward; when there is no figure the stem is short and the choices carry the content. All three drafts have no figure because the stems stand alone. **Used.** **Silent on:** whether a three-item drill should force a figure to hit the $3/10$ base rate; how to *write* a figure-as-argument item in prose (the generator still has to know what to draw); whether "five graphs described in words" counts as a figure item.

### How hard to make distractors

The file says each wrong option is the output of a nearby wrong theory a competent hurried physicist might actually make; if they would not produce it, replace it; do not make the key the only dimensionally legal *and* the only limit-survivor *and* the only slogan match unless the other four are still specific wrong theories; published percent-correct runs from the teens to the mid-eighties. **Actionable as a quality test, silent as a calibration.** I cannot know from the file whether G2's $qa/b$ is "hard enough" or merely ornamental. No mapping from "narrowness of identification" to a target percent-correct for a drill.

### Lab items

Not silent on what a lab item *is*: reading a representation (linearizing plot, uncorrelated errors, Poisson, Bode slope, precision vs accuracy as histogram shape), thin official slice, not operating a lab. Silent on whether a short drill must include one. Sitting-level mix is explicit: "Respect the committee's content mix at the level of a sitting, not at the level of every short drill." **I used that sentence** and omitted lab. Not a gap for this task. Mild gap for a later agent writing a full form: lab is named but not given a fraction.

### Shared stems

Not silent on function: pacing device; one drawing pays for two or three; later items change the verb, not the world; a set is a different time object; reading tax amortized only if the examinee does every item in the cluster. **Silent on craft:** how much the second question may reuse a computed intermediate; whether unused givens in item 1 may become used in item 2; how to avoid making item 2 a two-move chain. I wrote no cluster, so **unused.**

### Current 70-item mix

Coarse weights are given: mechanics and E&M together about two fifths; quantum plus atomic about a quarter; thermo, optics and waves, special relativity, laboratory methods, and specialized topics fill the rest. Do not unfold into chapters. The $70$-item sitting is a deletion-subset of a $100$-item form, not a new species. **Silent on exact percentages** (no $20\%$ / $18\%$ / ... table). For three items I mixed three areas and used the "not a mechanics-only quiz" rule. Exact blueprint is **silent** and, given "do not unfold the specification into chapters," possibly *deliberately* silent.

### Guessing

Not silent. Current sitting: raw score equals number correct; always guess, dated to October 2026; do not assume formula scoring. That is solver-facing. Writer-facing implication: items need not be built so that omitting is rational under a penalty; equal value; mix difficulty through the booklet. **Used** the writer implications. The solver slogan does not change how a drill item is *written*, except not to construct "omit this one" as a scoring strategy.

### Formula sheet

Not silent. Table is constants, a few SI conversions, a handful of moments of inertia; do not write look-up-and-plug; do not write a five-minute derivation of a result the examinee should hold as a reflex; slogan is a reflex, reconstruction is backup, clock prefers the reflex. **Used:** G1 assumes $E=-GMm/2r$ is a reflex, not a derivation and not a table lookup. **Silent on** the actual contents a writer may assume the examinee has in front of them (which constants, which three $I$'s). I avoided $I$ entirely so I would not accidentally write the forbidden look-up-and-plug item. A later agent who wants a rolling-object item cannot, from this file alone, know whether $I=\tfrac12 MR^2$ must be recalled or will be printed.

### Other silences (production rules, not philosophy of an item)

- **Choice order.** No instruction to sort numeric keys by magnitude, to scatter the keyed letter, or to avoid making the "simple-looking" option always the key. G1 keys (C); G2 keys (A) because $0$ is the refusal and belongs at the end *or* the beginning by convention I do not have; G3 keys (D). **Silent.**
- **"Most nearly."** Explained as licensing order-of-magnitude physics and as a warning that a distractor is a missing factor. No trigger for when the *writer* should print those two words. **Silent as a writing rule; specified as a solving signal.**
- **Roman-numeral / EXCEPT density.** Write for current grammar; do not let vintage set EXCEPT density. No quota. **Mostly specified by negation.**
- **Assumptions in the stem.** Whether to write "nonrelativistic," "ignore radiation," "classical," or leave idealizations implicit. The file says the stem is careful about what is present, what is to be neglected, and what is asked. **Partly specified.** I left "Newtonian gravity" and "ideal conductor" implicit.
- **Second legal key.** Implied by Conway's "six levels of review still find issues," not stated as a writer test. G3's choice (A) is exactly this failure mode. **Nearly silent; I used the review remark.**
- **How far to restage a canonical apparatus.** "Write new situations that make the same kind of demand. Do not paraphrase an ETS stem closely enough that a person who has sat a released form would recognize it." Closed-book, that rule cannot be checked. **Silent on the allowed distance from *textbook* apparatus** (infinite well, conducting shell, two-body satellite), which is a different axis from ETS-clone distance.
- **Optics/waves, SR, thermo, specialized, factoid survey.** Method is asserted to be the same; none of those costumes appear in this three-item set. Not required here. A later agent still has no worked example in the philosophy of a factoid item, a graph-choice item, or an SR invariant item other than the *mention* of boost-speed-as-trap.
- **Solution keys / explanations.** The document is about the item, not the official solution paragraph. This task asked for a design note, not a student-facing solution. **Silent, and out of scope.**

### What I failed to use (not silences)

- I did not write a "which is NOT true" / poison-word stem, though the file describes it.
- I did not write a figure-as-argument item, though the file says that is often what *makes* an item GRE rather than homework.
- I did not write a "most nearly" numeric item, a graph-choice item, a Roman-numeral bundle, a lab-representation item, or an SR item, though all are specified.
- I did not put a dimensional veto in the choice panel, though the file wants units to kill *some* choices on a paper.
- I treated the named moves as a small menu (cancellation, refusal, immediately-after) even though the file says not to treat them as a menu. That is a discipline failure, not a gap in the file. The three drafts still share one craft — five-way decision, cheap door, autopsies — which is what the file asked for.

---

## 5. Final judgment

**BORDERLINE** for a later agent to generate GRE-faithful drills from this file alone.

The file is sufficient as a *way of seeing*. After reading it, the difference between G3 and T1 is obvious, and it is the difference the file exists to teach. An agent can tell a GRE item from a textbook problem, from an REA calculator problem, and from a qualifier derivation, and can apply an operational audit. That is more than a topic list or a template catalog would have done.

The file is not sufficient as a *production spec*. A later agent still has to invent, without examples, how to order choices, when to print "most nearly," when a figure is mandatory, how far to restage a canonical apparatus so as not to clone ETS, what is on the formula table, and how to calibrate distractor difficulty. Those are not optional polish. G2 shows the risk: the philosophy authorizes the *demand*, and the writer's memory of undergraduate apparatus fills in a situation that may already be a released item. Closed-book generation will systematically over-use conducting shells, infinite wells, Atwoods, and solenoids unless the file forbids that class of clone, not only the ETS class.

I would not call it INSUFFICIENT: the three drafts are not homework with five choices glued on, and the audit tests caught T1 immediately. I would not call it SUFFICIENT: a second agent given only this file would not converge with this one on stem length, figure use, or apparatus choice, and could not know it.

### Concrete missing sentences (needed because the judgment is not SUFFICIENT)

1. **Choice order.** "Sort numeric and algebraic choices in increasing magnitude or in a single structural progression; scatter the keyed letter across a set; if the key is $0$, unchanged, independent, or cannot-be-determined, that simplicity is the physics and may sit in (A), but do not otherwise make the shortest-looking option the key."

2. **Figure quota vs figure necessity.** "A short drill may have no figure. A sitting should land near one figure in three. Never add a figure to a stem that already contains every given; if you want a figure item, omit from the stem the topology, the length, or the curve that the figure is responsible for."

3. **Writer's trigger for "most nearly."** "Print 'most nearly' only when the designed path is an order-of-magnitude estimate, a truncated expansion, or arithmetic that lands between two close distractors. Do not print it on an exact slogan, a ratio that snaps to an integer, or a qualitative decision."

4. **Canonical apparatus.** "A standard undergraduate apparatus is allowed; the *unknown those apparatuses have in textbooks* is not. If the situation is an infinite well, a conducting shell, a solenoid, or two satellites, the asked quantity must be a filter, a refusal, an immediately-after jump, or a cancellation — not $\Phi(r)$, not the overlap integrals, not $B$ on axis, and not $E=-GMm/2r$ evaluated once."

5. **ETS-distance, closed-book.** "You will not be shown released stems. Treat any situation you can name in three words ('grounded spherical shell,' 'expanding infinite well,' 'Atwood with massive pulley') as over-used. Restage the demand on a world you cannot name that compactly."

6. **Second-key test.** "After the autopsies are written, try to defend each wrong choice as correct under a coherent reading of the stem. If two choices survive, the item is not done."

7. **Formula table, writer-facing.** "Assume the examinee can see $c$, $h$, $\hbar$, $k$, $G$, $e$, $m_e$, $m_p$, $\epsilon_0$, $\mu_0$, and three moments of inertia, and cannot see anything else. Do not write an item whose move is looking up one of those and substituting. Do write items whose move is a slogan *not* on that table ($E=-GMm/2r$, $D$ from free charge, sudden approximation)."

8. **"Most nearly" and numeric spacing, one sentence.** "When the five choices are numbers, space them by the failed theory that produces each one — a missing $2$, a square root, a named wrong formula, an intermediate result — not by a percentage jitter around the key."

9. **Drill vs sitting.** "For a drill of three to ten items: at least two topic areas; at least two of {qualitative / refusal, short symbolic formula, engineered number}; at most one factoid; zero obligation to hit laboratory methods or the full blueprint. For a simulated sitting: use the coarse weights in this file, mix difficulty throughout, and include a refusal key somewhere in the form."

10. **Units on a short set.** "On a full form, units should kill at least some choices and should not be the whole item more than a handful of times. On a three-item drill, that constraint is waived; do not force a units-veto item to satisfy a sitting-level mix."

---

## 6. One-page recap for the parent agent

- **Judgment:** BORDERLINE.
- **Items that survived their own audit:** $3$ of $3$, with flags (G1 canonical-formula risk, G2 apparatus-clone risk, G3 wording of (A)). None had to be thrown out as homework in GRE clothing. The textbook counterexample T1 fails the audit immediately, which is evidence the tests work.
- **Top 3 gaps:** (1) how far to restage canonical apparatus so closed-book generation does not clone ETS or Griffiths; (2) production rules the philosophy never states — choice order, "most nearly" trigger, figure necessity vs quota; (3) writer-facing formula-table contents and sitting-vs-drill mix, which the file treats as atmosphere rather than constraints.
