# Middle-form ETS item design (GR0177, GR0877)

Coverage: every item on GR0177 (2001, 100 questions / 170 minutes) and every item on GR0877 (2008, same format). One hundred items on each form. Design was read from stems, five-choice sets, worked solutions, figure metadata, and official percent-correct (`pplus`). Per-choice distractor writeups (`choiceSols`) are not present in this bank, so wrong-answer purpose was inferred from the choice lattice itself and from how the solutions name the traps. No stem, choice, or solution is reproduced here.

These two books are the middle of the released 100-item era. They do not invent a new exam. They refine a voice: a timed multiple-choice instrument that looks like undergraduate problem-solving and actually tests whether the examinee can refuse the textbook grind.

The topic mix is almost a fixed recipe. Classical mechanics about one fifth, electromagnetism about one fifth, quantum mechanics about one eighth, thermodynamics/stat mech about one ninth, with smaller, stable slices of optics/waves, atomic, special relativity, specialized (solid state / nuclear / particle), and a three-item lab/experimental cluster. Figures appear on roughly a third of items. Five choices always. Difficulty is mixed through the booklet, not staged as easy-then-cliff. Mean percent-correct sits near half (about 47 on GR0177, 51 on GR0877), which is the intended operating point of a 100x170 form: many items around coin-flip, a thin tail of near-universal recognition, a thin tail of items that fewer than one in five finish correctly.

What follows is not a catalog of those items. It is the design philosophy they share.

## 1. The stem is a filter, not a homework prompt

A textbook end-of-chapter problem is a request to produce a quantity. It gives what you need, asks you to find what you do not have, and rewards a complete derivation. An ETS stem on these forms is a situation plus a narrow, often sideways ask. It is common for the stem to introduce masses, voltages, resistances, wavelengths, or geometric parameters that never enter the answer; it is equally common for a quantity the student expects to need (the mass of a circulating object, the friction coefficient when the blocks already share an acceleration, the work function when the question is a slope) to be absent or unused.

The omitted piece is frequently the point. If a satellite mass appears in the setup and then cancels, the item is testing that cancellation, not orbital algebra. If a moon is labeled “very small,” the item may be asking which orbital property cannot be recovered, because a test mass never enters the dynamics. If a collision angle is given and energy conservation alone fixes the unknown speed, the angle is scenery. The student who starts writing a general formula using every symbol on the page has already missed the item.

The ask itself is often not “compute.” It is: which statement is true; which statement is not true; which of I, II, III hold; which graph; which direction; which scaling; which conservation law forbids a decay; what happens immediately after a constraint is removed; what is independent of a named parameter. GR0877 uses “which of the following” more densely than GR0177 (nearly half the booklet versus a bit over a quarter), but both forms treat the stem as a filter that isolates one cognitive move.

Textbook problems also tend to stay inside one chapter. These stems do not. A kinematics figure can sit next to a Fermi-gas sentence. A circuit transient can sit next to a selection-rule diagram. The mixing is the instrument: the examinee cannot warm up a method and apply it for twenty minutes.

## 2. One move, theatrical setup

The governing aesthetic is *looks messy, solves clean*. A grounded plane and a point charge invite the method of images and a messy surface-density integral; the question asks for the total induced charge, which is the image charge. A sheet cuts a Gaussian sphere off-center; Gauss’s law reduces the problem to the area of a circle. A charged sphere expands and contracts; spherical symmetry makes the radiated power identically zero. A long Einstein heat-capacity formula is printed in the stem so that the high-temperature limit can be taken in two substitutions and recover a named classical result. A cyclotron-frequency item plants a factor of π in the field so that π cancels. Energy and momentum of 10 and 8 (in natural units) are a 6-8-10 triangle. Speeds of 4/5 of *c* are there so that γ is 5/3.

If an item takes four minutes of algebra, the examinee is off the designed path. The designed path is a single recognition: a symmetry that kills a sum, a conservation law that drops a variable, a boundary condition that forces a field to vanish, a high- or low-frequency limit of a filter, a geometric factor of a full loop that scales an arc, an operator identity that turns a commutator into a one-line expansion, a radial probability that is not |ψ|² at the origin.

Limiting cases are not a check at the end. They are often the solution. Extreme points of a pendulum; ω → ∞ on a voltage divider; object inside the focal length of a converging mirror; m → 0 in a two-body decay; K = 1 in a dielectric. The item is built so that the extremes discriminate among the five choices before the interior is computed.

Paired items inside a single form make the same point twice with different verbs. GR0177 places a particle-in-a-box superposition next to a harmonic-oscillator superposition with the same 1-2-3 coefficient pattern: one asks for a possible measurement outcome, the other for an expectation value. The physics is elementary. The design move is forcing the student to hear the verb.

## 3. Distractors are autopsies of wrong moves

Without official per-choice rationales, the choice sets still read as constructed, not sampled. The four wrong answers are the four ways a competent undergraduate actually fails the move.

Recurring families, visible on both forms:

- **The missing or extra factor of two**, from confusing frequency with angular frequency, diameter with radius, round-trip path with one-way path, or series with parallel.
- **The missing square root**, or its inverse, when a ratio of energies or masses is asked for a ratio of speeds or wavelengths.
- **The reciprocal**, when a ratio of wavelengths is computed as a ratio of wave-numbers and not flipped.
- **The sign**, of work on a counterclockwise cycle, of entropy of a free expansion, of a Boltzmann exponent, of a Lagrangian that wrote +bq⁴ rather than −V, of a commutator that needed [A,C] = −[C,A].
- **The other member of a conjugate pair**: resistor voltage when inductor voltage was asked; transmission coefficient when reflection was asked; even harmonic of a closed pipe; group-III dopant when n-type was asked; the second ionization energy when the first was asked; |c| when |c|² was required.
- **The naive non-relativistic or superluminal number**, sitting next to the relativistic answer, so that skipping the Lorentz factor is a named choice.
- **Zero when the answer is not zero**, and **nonzero when the answer is zero**: crossed polarizers without the middle filter; net field of a symmetric charge ring; force on a loop whose current is parallel to B.

Numeric choices are rarely a jitter around a computed value. They are spaced by factors of two, by decades, or by named wrong formulas (½kT, kT, 3/2 kT, 3kT, 6kT). When the choices span four orders of magnitude, the item is an order-of-magnitude and unit-conversion test; dropping a dimensionless prefactor of 1.22 still lands on the correct decade. When the choices are 0.43c, 0.95c, 0.967c, 0.993c, and c, the item is testing that the naive v = L/τ exceeds c and that the physical root sits just under c.

Verbal choices are not vague. They are the other physical story: lines connecting unlike poles versus a neutral point between like poles; precision as tightness of a histogram versus accuracy as closeness to the known-height line; a metal’s rising resistivity versus a semiconductor’s falling one.

A drill that fills distractors with “nearby numbers” is not speaking this dialect.

## 4. Null, unchanged, and “cannot” are first-class answers

A distinctive cruelty of these forms is that the sophisticated-looking setup is sometimes a demonstration that nothing happens, that something is independent of a parameter, or that a quantity cannot be recovered.

Force on a centered loop around a long wire: zero, because every dl is parallel to B. Orbits after the Sun is replaced by an equal-mass black hole: unchanged, because the exterior field depends only on M. Frequency of a siren in a tailwind with source and observer at rest: unchanged, because a moving medium rescales speed and wavelength together. Radiated power of a pulsating spherically symmetric charge: zero; there is no monopole radiation. Mass of a test-particle moon: cannot be found. Combined half-life of two parallel channels: shorter than either, like resistors in parallel, which kills every choice at or above the smaller given half-life.

These items are systematically hard. Official percent-correct in the low teens to low thirties is typical. The trap is the student’s belief that a GRE item with a figure and three symbols must have a nonzero formula. The designed move is the refusal.

The same spirit appears in inverted stems: which statement is NOT true; which CANNOT be calculated; which ion CANNOT dope n-type. One poison word (“nuclear” in an optical-spectra item; “isothermal” in an adiabatic item) is enough. The I/II/III bundles (a handful on each form) are a variant: the work is not computing, it is noticing the one false conjunct — emission is not a continuum; a linear potential is not the oscillator; a superposition of opposite m is not an Lz eigenstate.

## 5. Figures are the question, not the illustration

About thirty to thirty-four items per form carry a figure. They do three jobs, and they do not decorate.

First, **the choices are pictures**. Acceleration-vector diagrams for a pendulum; iron-filing patterns; histogram shapes; vx and vy graphs; lens cross-sections; filter Bode sketches; B(r) for a hollow wire; magnetic energy versus time in an LC circuit. The physics is pattern recognition: node versus antinode, high-pass versus low-pass, precision versus accuracy, zero inside a cavity, sin² humps that start at zero because current cannot jump.

Second, **geometry that would take a paragraph is shown so the algebra is one line**. A two-lens axis with labeled focal lengths; a sheet cutting a sphere; two shells ten diameters apart with a charge inside one of them; a coil’s normal at t = 0 relative to B; an arc with radial leads; a child on a disk; a convex mirror with C and R marked. The figure is a compression format. Reading it is the skill.

Third, **data to be read**. A blackbody peak off a curve, then Wien. A log-log slope, then a power law. Oscilloscope traces whose horizontal offset as a fraction of a period is the phase; the stated sweep speed and vertical gain are unused. A PV cycle whose missing vertex is fixed by an isothermal condition; the sign of the work is the sense of the loop.

A later generator that writes a fully specified verbal stem and then “adds a figure” has the dependency backward. On these forms the figure is often what makes the item an ETS item rather than a paragraph of homework.

## 6. Numbers are engineered to vanish or to snap

The arithmetic is never realistic-messy. Temperatures 7 °C and 27 °C exist so that a heat-pump COP is 300/20 = 15. A glancing angle whose sine is given as 1/4 exists so that Bragg’s law is a division by two. Coefficients 1, 2, 3 over √14 exist so that probabilities are 1/14, 4/14, 9/14 and an expectation is a single fraction. Two wires of lengths 2L and L with areas A and 2A exist so that a voltage divider is 4:1. A 3 μF and a 6 μF in series exist so that Ceq is 2 μF and ½CV² is 0.09 J. Equal tangential and centripetal accelerations of 10 and 10 exist so that the angle is 45°.

When a number does not vanish and does not snap, it is there to force a unit conversion, which is itself the test: millihenries into farads across nF/μF decades; cm² into m² before dividing flux by resistance; rpm into rad/s. Choices spaced by decades make the conversion the discriminator.

“Most nearly,” “closest to,” and “approximately” are not softness. They license dropping 1.22, replacing ln(2/5) by a nearby round number, or reading a graph peak to the nearest labeled tick. They also license the designed near-c clustering in time-dilation travel problems.

Dimensional veto is a first-class strategy the items themselves teach. Force must look like ρv²A, not v²A/ρ. A length cannot be v·(m/k) without a square root. Entropy cannot be mcΔT. Several choice sets are built so that three of five die on units before physics begins.

## 7. Advanced costume, undergraduate skeleton

Items that wear QFT, general relativity, BCS, charmonium, muonic atoms, perturbation theory, or Maxwell-with-monopoles clothing are almost never testing the advanced machinery.

A magnetic-monopole item asks which two of Maxwell’s four equations must gain a source term; it is a symmetry of the existing equations, not a derivation. A BCS item asks what mediates Cooper pairing; the answer is the ionic lattice, not a gap equation. A J/ψ item (GR0877) is a one-to-one pairing of a named resonance with a named quark; it is the hardest specialized item on that form by percent-correct, which is a reminder that factoid survey items are part of the voice, not a failure of it. A Schwarzschild-radius sentence about the Sun tests the shell theorem. First-order perturbation on (a + a†)² tests that only number-conserving pieces survive on the diagonal. A hydrogen fine-structure diagram tests Δℓ = ±1, not a Dirac-equation derivation. Positronium and muonic hydrogen test reduced mass, the same undergraduate lever, twice.

What is *not* being tested, even when the topic looks like a graduate qualifier: solving PDEs, contour integrals, perturbation series beyond first-order diagonal elements, experimental apparatus beyond error combination / counting statistics / oscilloscope literacy / Boolean gate reading, the detailed solar pp-chain (the net 4H → He is enough), computing σ(r) on a conductor, or evaluating a full Compton wavelength conversion when the energy form at 90° is a one-line inversion.

Lab is a three-item island on both forms: precision versus accuracy, Poisson counting time, solid-angle efficiency, inverse-variance combination of two mass measurements (the single hardest item on GR0877), oscilloscope phase, a logic-gate schematic. These are not “modern physics.” They are the experimental dialect of the same philosophy — read the graph, ignore the unused gain knob, combine uncertainties as 1/σ², translate a symbol into Boolean algebra without simplifying first.

Quantum items on both forms lean on a short list of verbs: eigenvalues of Hermitian operators are real; orthonormality is a Kronecker delta; expectation is Σ |c|² λ; a measurement returns only a present eigenvalue; L² and Lz quantum numbers; symmetric versus antisymmetric two-electron spin; Pauli-matrix commutators and Sx eigenstates; most probable radius is a0, not r = 0; a step with E > V0 still reflects. None of this is a textbook “solve the well.” All of it is a textbook “know what the well is for.”

## 8. Time is part of the specification

One hundred items in 170 minutes is about 102 seconds each, with no separate sectioning. That number is not a consequence of the content. It is a design constraint that the content is built to satisfy.

Easy recognition items are scattered, including late: Hermitian eigenvalues; de Broglie constant; 2n² shell filling; LC–SHO analogy; canonical-ensemble average as a weighted mean; a Michelson fringe-ratio wavemeter. They buy time. They are not concentrated in questions 1–10 as a confidence-builder, though GR0877 does open noticeably easier than GR0177 (first-twenty mean percent-correct about 64 versus 49). The last twenty on both forms still mix a few high-pplus gifts with the booklet’s hardest work (implicit differentiation of Snell; pair production with three equal-speed products; concentric shells with V(a) = 0 rather than V(∞) = 0).

The student who treats every item as a five-minute derivation will not finish. The student who can sort, in under twenty seconds, “this is a T⁴ scaling,” “this is a node of E and an antinode of B,” “this mass cancels,” “this is immediately after, so the spring has not moved,” will finish with time to return to the commutator and the fiber-acceptance angle.

“Immediately after” is a recurring clock inside the physics. A string breaks; spring force is continuous; the upper block sees 2g for an instant. An inductor at t = 0 is an open circuit. Current in an LC starts at zero, so magnetic energy starts at zero. The item is testing which variables are allowed to jump.

Pacing also explains the unused given. A stem loaded with numbers that do not matter is a time tax on the student who uses them and a time gift to the student who does not.

## 9. Stability, and what actually drifted from 0177 to 0877

The voice is the same instrument. Topic weights, figure density, five-choice architecture, mixed difficulty, the one-move aesthetic, the autopsy distractor, the null answer, the engineered number, the lab trio, seven special-relativity items, thirteen quantum items — all persist.

Visible drift, from the items themselves, not from a history of the 1980s:

- GR0877 is a more survey-like opener. Named-constant, named-formula, and classification items (which constant belongs to de Broglie; which laser uses free atoms; which interaction mediates β⁺; fermions versus bosons) appear earlier and more often. “Which of the following” roughly doubles.
- GR0877 admits a particle-physics history factoid and a digital-logic schematic that GR0177 does not match in kind. That is a slight widening of the specialized/lab edge, not a new center of gravity.
- GR0877’s mean percent-correct is a few points higher and its first twenty are substantially easier. The hard tail is as hard (weighted-average uncertainty at 11 percent; J/ψ at 11 percent; simultaneity at 12 percent; wind-and-siren at 15 percent).
- Recurring templates reappear almost as twins: T⁴ scaling; hydrogen most-probable radius; time-dilation flight of an unstable particle; thin-film phase bookkeeping; Malus with a relative 45°; Gauss and Lenz; HO zero-point energy; relativistic E² = p²c² + m²c⁴ Pythagorean; springs series versus parallel; rolling without slipping with a non-obvious I.

Nothing in these two booklets, taken alone, supports a claim that 2000s ETS abandoned 1990s style or invented the 2017/2024 style. The claim the items do support is narrower: between 2001 and 2008 the philosophy is stable, with a mild shift toward classification stems and a milder opening.

## What this forbids in later generated drills

If a drill item can be answered only by carrying a full chapter derivation to a messy number, it is not in this voice. If every distractor is a rounded neighbor of the right number, it is not in this voice. If a figure is optional decoration, it is not in this voice. If an “advanced” topic is actually testing the advanced machinery rather than a definition, a symmetry, a selection rule, or a one-line operator identity, it is not in this voice. If the stem uses every given, it is missing the filter. If “zero / unchanged / cannot” never appears as a key, the generator has not learned the refusal.

The positive instruction is tighter than “write a hard multiple choice.” Write a situation whose extra symbols are bait. Ask a narrow verb. Put the four standard wrong moves in the choices. Make the clean path a conservation law, a limit, a symmetry, a unit veto, or a pattern in a figure. Time the item at a minute if the move is seen and at four minutes if it is not. That is what GR0177 and GR0877 are.

## Residual uncertainty

- `choiceSols` are absent for both forms. Distractor purpose is inferred, not official. A few choice sets (especially graph-as-choice items whose original art is not in the bank images array) are described rather than seen; figure `desc` fields and solution commentary were used in lieu of the PDFs.
- `pplus` is treated as the released-book percent-correct. It measures what a particular cohort found hard, which is evidence for design but is not a pure design parameter (coaching, calculator policy, and the 100-item fatigue curve all mix in).
- Topic tags in the bank (`th` not `td`, `lb` not `lm`) are the local schema; they were used only as a census, not as ETS’s own content-spec labels.
- Cross-era claims about 1980s–90s or post-2017 forms were not observed here and are not made. Twin templates (T⁴, most-probable radius, muon flight) look inherited; that is a resemblance, not a documented genealogy.
- A handful of solutions in the bank include later editorial “GRE shortcut” notes. Those notes were used as hints about the intended move, not as ETS’s own voice.
