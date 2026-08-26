# ETS item design, recent era (GR1777 and ets2024)

This memo is a reading of every item on GR1777 (100 items, `100x170`) and every item on ets2024 (70 items, `70x120`, the current official practice book, internally labeled GR1775). It is not a topic catalog and not an archetype list. The bank's per-choice rationales are empty on both forms; distractor claims below come from the choice sets themselves and from the worked solutions, which often name the failed nearby theory.

A fact that should sit in front of everything else: **ets2024 is not a new generation of item writing.** Every ets2024 stem, choice set, and figure is already on GR1777. The practice book is GR1777 with thirty deletions and new numbering. Stem length, figure rate, choice grammar, and difficulty mix among the surviving items are therefore identical because the items are identical. What changed in the 70-question / 120-minute format is operational — how many of these items you sit, and which of them ETS chose to drop — not how an item is built.

## 1. The stem selects a principle; it does not pose a homework problem

A textbook end-of-chapter problem narrates a situation, supplies the symbols of the chapter, and asks you to compute an unknown. These stems do something narrower. They name a physical situation just completely enough that one identity applies, then ask for the *consequence* of that identity: a ratio, a direction, a comparison, a functional dependence, a classification, or a one-line evaluation.

What is given is identifying information: which objects, which constraints (frictionless, ideal, electrostatics, rest frame), sometimes a figure that is the rest of the given. What is omitted is scaffolding. The relevant formula is almost never written in the stem. Intermediate variables are not introduced. Boundary conditions are left implicit in a sketch. Extra numbers that a homework problem would use often sit unused: a kinematic datum when energy is asked at the point where one form vanishes; a nuclear mass number when only charge enters the formula; a coordinate tuple that only establishes which side of a surface the source occupies. The unused given is not sloppiness. It is a filter: the item rewards noticing what is irrelevant.

What is asked is rarely "solve the system." It is "which of these is true of…", "the quantity is proportional to…", "the pair that can be measured together is…", "the value of the ratio is…". On both forms, about half the stems are framed as "which of the following." That is the grammar of selection among theories, not of calculation.

## 2. Choices are a diagnostic, not a menu of numbers

Five options, always. They are not a spread around a computed value. They are the outputs of adjacent wrong theories, and a working physicist can often kill three of them without finishing the arithmetic.

The failed nearby theories that actually appear, repeatedly, on these two forms:

- The wrong scaling: period linear in length instead of square root; force as mass *or* acceleration instead of the product; Kepler as $r^2$ or $r^3$ instead of $r^{3/2}$; drag terminal speed linear in mass instead of square root.
- The wrong member of a conjugate pair: Lagrangian in place of Hamiltonian; $C_P$ at constant volume; peak current's factor of one-half left on an rms formula; $\gamma$ where the kinetic energy is $\gamma-1$.
- The forgotten factor of two: a single Doppler shift instead of source-and-observer; a one-way optical path in a round-trip interferometer; radiation pressure of an absorber instead of a reflector; half the flux of a plane instead of Gauss's full accounting.
- The wrong region or boundary condition: field formula for outside a conductor used inside the metal; standing-wave forms in a region that can only support a traveling transmitted wave; a full-wave rectifier's graph offered for a single diode.
- The classification error: meson content attributed to a baryon; nuclear radiation placed in the optical band; a speed distribution's peak put at zero because a *component* distribution peaks there.
- The units veto: a choice that is an area where a length is required; a product $EB$ where only $E/B$ is a speed; a rest energy sitting in a kinetic-energy slot.

The right answer is often the unique choice that survives a limiting-case check the stem did not ask you to perform: vanishing torque at the upright position; $R=0$ when the two wave numbers are equal and $R\to 1$ for an infinite step; entropy of universe unchanged, not increased, for a reversible process; a stiffer spring that both stretches less *and* stores less at fixed force. ETS builds the options so that "check a limit" is a legal solution path, not a luxury.

## 3. The situation is allowed to look expensive; the intended path is cheap

Numbers are chosen so that the right identity produces a clean number, often a 3-4-5 triangle in disguise, a perfect square under a Lorentz factor, or an integer count ($2\ell+1$, occupation triples, a ratio of small integers). If the arithmetic is ugly, the wrong identity is in play.

Figures do the same job. A $PV$ loop looks like a thermodynamics problem and is an area. Three charge arrangements look like Coulomb bookkeeping and are vector addition of two magnitudes. A potential step looks like a boundary-value problem and is the universal $R=(k_1-k_2)^2/(k_1+k_2)^2$ plus the constraints $0\le R\le 1$. A data plot (excitation curve, absorption dip, schematic speed histogram) asks you to extract one physically meaningful feature: equal spacing of drops, not the absolute voltages; evenness of a waveform, not its Fourier coefficients; area under a curve equal to particle number, not a fit.

This is the design move that textbook clones miss. A clone sets up the general problem the figure *could* support. The item supports one door: symmetry, conservation, a matching condition, an enclosed area, a dimensional veto. "Looks messy / solves clean" is not a personality of hard items. It is how almost every computational item on these forms is built.

## 4. One cognitive move, then stop

The item wants a single recognized move, executed once.

Recognition: this is displacement current, not ordinary current; this is a maximum-spin filling rule, not a sum over all electrons; this is a sign-sensitive transport coefficient, not resistivity; this is a tunable source if the task is broadband spectroscopy.

Limiting case and symmetry: even function, only cosines; field inside a conductor is zero, so inner-surface induced charge cancels whatever is in the cavity; an infinite plane intercepts half the flux of a point charge that does not sit on it.

Conservation, used as a selector, not as a chain of equations: energy around a cycle equals enclosed work; charge is conserved when capacitors are reconnected; mechanical energy is most easily read where one form vanishes.

Units and dimensions as a first move, not a last check: Planck length, cyclotron combination $qB/m$, velocity-selector $E/B$, infinite-well energy carrying $\hbar^2/ma^2$.

Approximation: small two-way Doppler as $2u/v$; a near-on-shell energy-momentum product instead of subtracting two large squares; "most nearly" as permission to use $g\approx 10$ or $\sqrt{0.99}\approx 1$.

When a calculation appears, it is one substitution into a named relation, or a two-line conservation (momentum components, then $\Delta K$). Multi-page derivations do not live here. An item that looks like rigid-body dynamics still collapses to $\tau=I\alpha$ with a standard $I$ and a moment arm read from the figure. An item that looks like time-dependent perturbation theory is, on these forms, not present at all.

## 5. The costume may be graduate; the tested content is not

A stem can dress itself in Pauli matrices, a Hamiltonian, a superconductor, an exotic two-body atom, a named nuclear resonance, a three-dimensional oscillator, or a quark-content table. What is tested in each case is the undergraduate slogan that makes the costume collapse:

- Hermitian $\Rightarrow$ real eigenvalues; an algebraic constraint on $\lambda$ then drops the non-real roots.
- $H=T+V$ in $p,x$; the minus-sign choice is $L$.
- $\nabla\cdot\mathbf{B}=0$ $\Rightarrow$ normal $B$ continuous $\Rightarrow$ just outside an ideal superconductor, $B$ is tangential. Not microscopic pairing, not flux quantization (that option is present as a distractor).
- Reduced mass of equal masses is $m/2$; spectroscopic constants scale with $\mu$.
- Linewidth $\times$ lifetime $\sim\hbar$, read off a plotted width.
- Degeneracy is the number of nonnegative integer triples summing to $N$.
- Lepton: no quarks. Baryon: three quarks.

ETS is not testing whether you can derive the slogan. It is testing whether you possess it as a reflex and can refuse the sophisticated-looking wrong neighbor (flux quantization, $\pm\sigma_z$ without the $i$, treating $A$ as if it entered the spectrum, putting a quark-antiquark pair on a baryon).

Conversely, items whose topics look elementary are not giveaways. They still require the right identity and the unused-given filter. Newton's second law as a product of factors, buoyancy that depends on displaced volume rather than orientation, a relative-velocity question whose horizontal parts cancel: these are the same design as the "advanced" items, with a cheaper costume.

## 6. A figure is part of the argument, or it is not there

On both forms, roughly three items in ten carry a figure (27 of 100 on GR1777; 20 of 70 on ets2024). The figures are not illustrations of a stem that would stand alone. They are the data: circuit topology, process curves, spatial arrangements, a potential landscape, an apparatus plus its output plot.

When there is no figure, the stem is short — median length on both forms is about 28 words after stripping markup — and the choices carry the content (five symbolic expressions, five qualitative claims, five graphs described in words). Graph-as-choice is used for rectifier output and similar "which waveform" items: the design move is to make the *shape* the answer, so that recognizing the device is the whole problem.

What ETS does not do with figures on these forms: three-view engineering drawings, noisy experimental tables that must be fitted, or figures whose geometry has to be digitized. Angles that matter are labeled. Axes that matter are named. If a length is in the figure and not in the stem, it is the length you use.

## 7. Classification and comparison are first-class work, not a warmup

A large minority of items never want a number. They want an ordering of three magnitudes, an identification of which curve is which process, a direction of a Poynting vector, a statement about entropy of system-plus-environment, a yes/no on simultaneous measurability, a "greatest for which nucleus."

Roman-numeral "I, II, III" appears, but sparingly: three times on GR1777, once on ets2024 (the two extras were among the deletions). It is used to test the *boundary* of a principle — this law implies these two geometric-optics results and not a wave-optics criterion; this apparatus can demonstrate energy conservation and $g$, but not momentum conservation — rather than to pile three independent facts.

"Most nearly / approximately / nearest to" is the counterpart for numerical items (about a dozen on GR1777, nine of which survive on ets2024). It licenses order-of-magnitude physics and the clean-number arithmetic of principle 3. It is also a warning that a distractor will be the result of a missing Lorentz factor or a missing 2, sitting close enough to tempt anyone who computed carefully with the wrong theory.

## 8. The 70-item paper is a trim of the 100-item paper; time per item did not change

Observed, not inferred as committee intent:

- ets2024 contains 70 items; GR1777 contains 100. The 70 are a deletion-subset of the 100, in the same relative order.
- Official timing: 170 minutes for 100 items versus 120 minutes for 70. That is 1.70 versus 1.71 minutes per item. The format change does not buy think-time. It shortens the sitting.
- Stem length, five-choice structure, and figure load are unchanged among survivors because they are the same items.
- Difficulty tags in the bank (project-assigned, not ETS's) on the thirty deletions are mixed, with a somewhat heavier tail of tagged-hard items. The deletions are not "all the easy ones" or "all the hard ones."
- What was dropped, described only as design moves: several pure-recall classifications; a few two-step numerical items that actually require a short calculation rather than a veto; a second-lens imaging follow-up; a couple of specialized/lab-adjacent reads of a spectrum or a crystal condition; two of the three Roman-numeral items. What was kept is the same mixture of recognition, one-line evaluation, figure-as-argument, and comparison.

Implied pacing: you are supposed to see the identity in under two minutes or skip. An item that cannot be entered through a named relation, a limit, a symmetry, or a units veto is off-style for this era, on both formats.

Topic mix among the 70 tracks the practice book's published weights at the level the bank's tags can see (classical mechanics and electromagnetism dominant; relativity a handful; laboratory methods tagged lower than the published six percent because lab-adjacent items sit in other topic codes). The trim did not reweight the exam into a different subject. It made a shorter version of the same subject.

## What a later writer should refuse to do

Do not write a chapter-end problem and then attach five numbers. Do not derive a result the examinee is expected to already possess. Do not use every given. Do not make the right answer the only dimensionally legal choice *and* the only one that survives a limit *and* the only one that matches a slogan — unless you also plant, in the other four, the specific wrong theories a rushed physicist would actually run. Do not test a graduate costume. Test the undergraduate move the costume reduces to. Do not add think-time by writing a longer stem; these stems are short on purpose. If an item cannot be answered from a recognized identity in about a hundred seconds, it is not yet a GRE item in the sense of these two forms.
