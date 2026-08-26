# FINDINGS — Vintage ETS Physics GRE (GR8677, GR9277, GR9677)

These three forms (1986, 1992, 1996) are the oldest released Physics GRE papers. Each is a 100-item, 170-minute paper. The bank holds all 100 items of GR8677 and GR9277, and 99 of GR9677 (item 90 was unscored on the original form and is quarantined from the build). This memo is a design philosophy for that vintage, not a topic catalog. Later generators should absorb the *moves*, not the scenarios.

Nothing below quotes stems, choices, or worked solutions. Form IDs are evidence, not exhibits.

## What an item is for

A vintage ETS item is a five-way decision about a physical situation, not a request to produce a result. The stem stages a world (often with a figure, a handful of symbols, and one or two numbers), then asks which of five statements, formulas, graphs, or magnitudes is the right account of that world. The examinee is not being asked to “work the problem” in the textbook sense — set up, derive, substitute, box an answer. They are being asked to *decide*, under time pressure, which description survives contact with one governing idea.

That difference from an end-of-chapter exercise is the whole design. A textbook problem is typically well-posed for computation: every given is needed, the unknown is named, and the path is a derivation whose length is part of the pedagogy. A vintage GRE stem is well-posed for *discrimination*. It may include quantities that never enter, omit the name of the law, ask a qualitative question of a quantitative setup, or ask a quantitative question that a qualitative filter already settles. The correct choice is often the unique option compatible with a cheap constraint (units, a limit, a sign, an invariance, independence of amplitude). Computing the answer is one legitimate route; surviving the filter is another. The form is built so both routes exist.

Across GR8677 and GR9277, published percent-correct values cluster around a median near 40 percent; on GR9677 the median falls near 30 percent. Easy recognition items and items that fewer than a quarter of testers answer correctly sit on the same paper. The mix is the point. The form is not a sequence of equally effortful calculations. It is a sequence of decisions of unequal cost.

## What the stem actually does

The stem’s job is to load a situation and then withhold the obvious instruction. It says what is present, what is to be neglected, and what is asked — and it is careful about all three.

**Given.** Vintage stems are generous with *setup* and stingy with *procedure*. Geometry, idealizations, and a few numbers are stated. The law that turns those into an answer usually is not. When a figure carries the geometry, the stem still names the relevant objects and the question, but it does not narrate the free-body diagram or the Gaussian surface. Shared-stem clusters (explicit three-item blocks on GR8677; interior/exterior and circuit and well and two-level blocks on GR9277, some unlabeled; a pair of field-from-geometry items and a polarization pair on GR9677) amortize one setup across two or three decisions. The later items in a cluster are not restatements; they change the question (a derived quantity versus the quantity that defines it; occupation versus a derivative of energy versus an entropy bound).

**Omitted.** The name of the result is frequently omitted even when the result is standard. The stem will describe a limiting case, a material class, a boundary condition, or an experimental signature without naming the theorem that the choices are testing. The examinee supplies the identification. Conversely, quantities that a homework problem would need — a mass that cancels from a period, a resistance that does not set a resonance, a relative speed when the asked quantity is a Lorentz invariant, a source voltage when only a time-constant *shape* matters — are left in. They are live as decoys, not as ingredients.

**Asked.** The asked thing is often not “the value of *X*” but a comparison, a direction, a graph, a “which is true / NOT true,” a Roman-numeral subset, or a “most nearly.” About thirty items per form use some form of “which of the following.” EXCEPT / NOT items appear in all three years and force evaluation of several claims rather than production of one number. “Most nearly” with decade-spaced options is an order-of-magnitude item wearing a calculation’s clothes. The numerical work, if any, is there to land you on a decade, not a digit.

Stems are short by homework standards. Median length is about forty words on GR8677 and GR9277, about fifty on GR9677. A long stem in this vintage is almost always a shared setup or a wave function written out so that the actual work — squaring two coefficients, reading parity, recognizing a plane wave — is trivial once the expression is parsed. Length is not difficulty. Parsing is.

## How the choices are built

There are no per-distractor keys in this vintage’s bank. The construction is still legible from the options themselves, and from how a correct path makes the others fail.

The five choices are a diagnostic panel. Each wrong option corresponds to a move a competent but hurried physicist might actually make:

- Apply the right relation to the wrong object (the constant belonging to a different particle; the Doppler formula for the other moving party; the free damped frequency when the question is driven resonance).
- Drop or insert a factor of two (a quadratic observable versus its linear cousin; a round trip counted as a single pass; a well formula off by a power of two in the width).
- Keep the wrong sign or the wrong phase (relative phase π taken as 0; torque component from a force parallel to the axis).
- Use a Galilean or Celsius surrogate (adding speeds near *c*; feeding Celsius into Carnot).
- Treat a decoy as live (amplitude into a frequency; mass into a hoop period; resistance into a tuning frequency; a boost speed into an interval).
- Satisfy three of four boundary conditions on a graph (oscillatory tails on a bound state; a discontinuous join at a well edge; a low-pass when a high-pass was asked).
- Report a related but distinct quantity (decade time instead of half-life on a semi-log plot; the coordinate of a packet instead of its width).

Numeric clusters are not random neighbors. They are the outputs of those moves. Qualitative clusters are not vague synonyms. They are mutually exclusive accounts of the same situation (always / only at an instant / never; increases then decreases / increases monotonically to a limit; depends on *b* but not *m* / depends on both). Roman-numeral items package several such accounts and ask which subset is jointly true — a design that punishes partial knowledge more cleanly than a single claim can.

A large fraction of items, on all three forms, can be finished without carrying a derivation to the last line. Units kill two or three options. A limit (*T → 0*, *k → 0*, *M → ∞*, amplitude → 0, *x = 0* on a track) kills two or three more. An invariance (interval, *v = c* in every frame, *SHM* frequency independent of amplitude) finishes the rest. ETS is testing whether the examinee will *use* those filters. The existence of a longer calculation does not mean the item wants it.

## Figures, data, and “looks messy / solves clean”

Figures are arguments. On these three papers they do three jobs, sometimes at once.

They replace a paragraph of geometry: circuits, wedges, coaxial sections, a loop next to a wire, a rod at an angle, overlapping current cylinders. The figure is schematic. It is not a photograph and not a data table. What matters is topology and which object is which.

They ask the examinee to pick a curve: field versus radius inside and outside a uniform ball; current after a switch throw; a wave function that must decay outside a well; isotherms on a *pV* diagram; specific heat through a superconducting jump; *H(r)* in a coax. The tested knowledge is the *shape* — linear then inverse-square, exponential decay to zero, a discontinuity at a second-order transition, a square-wave emf from a linearly changing enclosed area — not a plotted number.

They host shared stems, so one drawing pays for two or three questions. That is a pacing device as much as a pedagogical one.

Numerical data in the stem are almost always chosen to be clean after the right identification: temperatures that become 1000 K and 800 K, a 3-4-5 Lorentz triangle, a 3/5 boost, a ratio that is exactly 1/4 even with crude *Z²* scaling, a Bragg angle whose sine is 0.1. Algebra that looks messy (a Gaussian plugged into Schrödinger, a three-term spherical-harmonic state, a Lagrangian with a constraint) collapses to a substitution, a square-and-add, or a *T − V* with the right projections. If a vintage item appears to need a page, the design intends an invariant, a limit, a symmetry, or a units check. The mess is costume. The clean landing is the item.

Laboratory items in this vintage (three per form, consistently) are the same philosophy applied to instruments: which plot linearizes a given relation; what a trace’s period and amplitude are given a sweep speed; how uncorrelated relative errors combine; Poisson counting; a Bode slope on log-log paper; a diode network that is an OR. The skill is reading a representation, not operating a lab.

## The cognitive move the item wants

Topic codes on these papers (classical mechanics and electromagnetism about twenty items each; quantum, atomic, thermo, optics in the high single digits to low teens; relativity and “specialty” a handful; lab three) describe the *costume*. The move underneath repeats.

**Recognition.** A large minority of items are decided by naming what the situation is. A kinematic limit that forces rest mass to vanish; a closed shell that implies a bonding type; a penetration argument that names which species survive; a sign that diagnoses carrier type; a threshold speed in a medium; a quantum-number change that selects an interaction; an exchange symmetry that is a named principle. These are not trivia for their own sake; they are identifications that then kill every distractor. GR8677 in particular carries several items where a standard constant or a named particle property can be recalled or rebuilt from a defining relation. GR9677 still has them but leans harder on a recognition *plus* a one-line consequence.

**Limiting case.** Many items are written so that sending a parameter to 0 or ∞ distinguishes the options without solving the interior. A bound-state graph must decay outside. A true frequency of small oscillation cannot depend on amplitude. A very heavy ring at the end of a string is a fixed end; a massless ring is a free end. High *T* equalizes occupation of a few discrete levels; the mean energy is then an arithmetic mean. The design wants the limit used as a tool, not as an afterthought.

**Symmetry and invariance.** Equal distances make potential a scalar sum. An antisymmetric mode cancels the force on a middle mass or a sliding tube. An even perturbation does not mix odd states. Orthogonal polarizations do not interfere. A spacetime interval does not care which observer you compute it in. A photon’s speed does not care which frame you boost from. When the stem offers a boost speed and asks for an invariant, the speed is the trap.

**Conservation without dynamics.** Linear momentum gives the center-of-mass speed after a collision even when rotation is also happening. Energy plus “constant speed on an incline” gives the frictional dissipation as *mgh*, with *μ* and *θ* canceling. Charge sharing on identical conductors is sequential averaging. Relativistic inelastic sticking converts *γ* into rest mass. The item does not want the full collision algebra; it wants the conserved quantity named and applied.

**Units and dimensions.** A frequency must be a square root of (charge² / (ε₀ m R³)). An angular speed must be emf over (B times area). A length built from *G*, *ħ*, *c* has one surviving combination. Several items on all three forms are finished by this filter alone. ETS is not testing dimensional analysis as a topic; it is testing whether the examinee treats units as a weapon.

**One-line calculation after the identification.** Once the law is named, the arithmetic is short: *I = n e A v_d*, *nσt* for a beam fraction, *λ_min ≈ 12.4 / V[kV]*, *d = λ / θ*, *F ≈ mv² / 2s*. The numbers are round. The work is the identification.

**Trap.** The remaining items are built around a known mix-up and exist to see whether the examinee walks into it. Energy versus charge time constants. Inverse-square outside versus linear inside a uniform ball. *E_t = 0* and *B_n = 0* at a perfect conductor, not the other pairing. Linear Stark vanishing in the ground state by parity. The trap is not cruelty. It is the measurement.

## What the form is not testing

Even when the topic looks advanced, the demanded performance is not the interior of a graduate derivation.

Method of images appears as a remembered substitution, not as a boundary-value problem to be posed. Laplace in a wedge is “the potential can depend only on angle, hence is linear in angle.” A Lagrangian is *T − V* with the right geometric projections, not Euler–Lagrange algebra. Perturbation theory is parity or “the linear Stark matrix element vanishes,” not a sum over states. Two-level statistical mechanics is occupation from Boltzmann factors, then a derivative for heat capacity, then *S = k ln Ω* at the two temperature ends — not a full partition-function apparatus. Radiation reaction is Larmor’s *q² a²* dependence, with mass and speed left in the stem as decoys. Overlapping current cylinders are a superposition trick whose field is uniform and proportional to the center spacing.

Quantum mechanics in this vintage is structure, not technique: an operator applied to a plane wave; coefficients squared because of orthonormality; simultaneous eigenfunctions if and only if operators commute; a real standing wave carrying zero mean momentum; odd levels only once a wall sits at the origin; a lowering operator that cannot be Hermitian and cannot commute with *H*. Nobody is being asked to solve a differential equation, evaluate a difficult integral, or look up a Clebsch–Gordan coefficient.

Electronics and “modern” set pieces (a logic gate, a Bode slope, a high-pass versus low-pass layout, negative feedback’s trade of gain for everything else) test one qualitative fact each. They are not circuit-analysis exams.

The form also does not test stamina-of-algebra. An item that can be expanded into a long calculation has been written so a short one exists. An item that cannot be shortened is rare, and when it occurs (a statics wedge with friction, a multi-resistor voltage, an induced-current-plus-force table) it is still one idea applied twice, not a project.

## Stability and drift across the three years

The philosophy is stable. All three papers are 100 × 170, five choices, the same coarse topic weights, the same mixture of qualitative decisions and short formulas, the same appetite for EXCEPT / which-is-true / Roman-numeral items, the same use of figures as arguments, the same recirculation of templates. Reduced-mass positronium, coaxial cancellation outside, two-level systems, the half-oscillator, *E1* selection rules, Carnot as a temperature ratio, dipole radiation broadside rather than end-on, and “most nearly” order-of-magnitude items appear in more than one year. Answer keys are roughly uniform across A–E; there is no letter to farm.

What drifts is surface and calibration, not the idea of an item.

GR8677 is the most talkative qualitatively: more “which of the following is correct,” more EXCEPT, more lab electronics (a diode OR, a log-log gain slope), more fact-identification sitting beside reasoning. Shared-stem clusters are explicit. Percent-correct is the gentlest of the three (mean in the mid-forties), with a handful of items almost everyone gets.

GR9277 tightens the same machine. It uses more figures, more “most nearly,” more consecutive items from one setup that are not always labeled as a block (a circuit pair, a well trio, a two-level trio, a *pV* pair). Specialty and optics contribute more of the very hard items. The philosophy is unchanged: a Fourier series is odd-versus-even and sines-versus-cosines; a rolling rim point has centripetal acceleration upward at contact; a Lorentz transformation is the one that preserves the interval.

GR9677 is the same design under a harder calibration. Mean percent-correct drops into the mid-thirties; no item in the bank reaches the high-eighties; thirty items fall below 25 percent. Stems run a little longer. “Most nearly” decade items recede; more items wear named graduate-course vocabulary (field angular momentum, a unique combination of constants, étendue, probability current, a specific-heat discontinuity, compositeness). The move underneath is still a filter: the only dimensionally legal combination; a thermodynamic prohibition on a passive concentrator; a current that must be a cross term or it would not vanish for a real standing wave. Harder here means a narrower identification, not a longer calculation. That is the vintage’s drift: same machine, less forgiveness, slightly more costume.

Knowledge-of-fact items never disappear, but they are always doing double duty. A standard constant can be recalled or rebuilt from a defining relation. A peak on a binding curve can be recalled or inferred from which processes release energy. The fact is a shortcut; the rebuild is available.

## Pacing as a design constraint

One hundred items in 170 minutes is about 100 seconds each if time is split evenly. It will not be. The paper is a mixture of items that a prepared examinee finishes in twenty seconds (a recognition, a units kill, a “which graph has the monopole”) and items that can consume three or four minutes if taken as homework (a statics figure, a multi-loop reduction, a small-oscillation frequency with two masses). That mixture is not an accident of assembly. It is how a 100-item paper can exist. If every item demanded a full derivation, the form would be unfinishable; if every item were a slogan, it would not discriminate.

Shared stems are a time gift: the second question does not re-explain the apparatus. “Most nearly” with widely spaced options is a time gift: stop at the decade. Decoy quantities are a time tax on anyone who starts computing before asking what is live. Graph-choice items are fast for someone who knows the shape and slow for someone who tries to plot. The implied skill is not only physics. It is triage — which items to decide by filter, which to compute, which to skip.

The published difficulty spread confirms the intention. A paper whose items range from ~90 percent correct to the low teens is a paper on which raw score is a count of good decisions, not a count of completed derivations. Vintage ETS is measuring a physicist’s reflex: name the governing idea, drop what does not belong, apply one clean consequence, move.

## Instruction for later generators

If a generated drill could be handed to a student as an unmarked textbook exercise — every given used, the unknown named, a unique number at the end of a derivation, distractors that are merely nearby numbers — it is not in this vintage’s voice. The vintage voice is: stage a situation, hide the instruction, build four wrong answers that are the shadows of four real mistakes, and make the right answer the one that a principle, a limit, a symmetry, or a unit will pick even if the algebra is never finished. Advanced vocabulary is costume. The move is elementary and strict.

## Residual notes

GR9677 item 90 is absent from the bank (unscored originally, quarantined in the build) and was not read. Distractor intent is inferred from option structure and from later worked solutions in the bank; those solutions are ours, not ETS’s, and their “shortcut” language should not be mistaken for ETS voice. The design implication — that shortcuts exist and are intended — still holds. Figures were read through stem-and-solution description and presence flags, not as a separate visual inventory.
