/* Formula deck — recall cards for the formula portal (#/formulas).
   EMPTY BY DESIGN: the deck fills only from the imported "Conquering the
   Physics GRE" markdown (parser v2, 20_docs/Project Docs/DESIGN.md §3) — no hand-seeded cards.

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

   Unnumbered supplements (not in the CPG equation index) append here with
   id 'supp-…' and eq: 'supp'. Never invent a cpgf-X.Y serial — formulaBackTagged
   would print it as a fake book number.
   PGRE.formulaDeck() (js/store.js) merges all three, id-deduped. */
window.PGRE = window.PGRE || {};

PGRE.FORMULAS = [
  {
    id: "cpgf-1.30b",
    eq: "1.30b",
    topic: "cm",
    tag: "Lagrangian",
    name: "Cyclic coordinate & conserved momentum",
    front: "Condition for a generalized coordinate q to be cyclic (ignorable) in a Lagrangian L, and the resulting conserved quantity?",
    back: "$$\\frac{\\partial L}{\\partial q} = 0 \\implies p \\equiv \\frac{\\partial L}{\\partial \\dot{q}} = \\text{constant}$$",
    note: "The canonical momentum $p$ conjugate to the cyclic coordinate $q$ is conserved (e.g. for cyclic $\\phi$, $p_\\phi = \\frac{\\partial L}{\\partial \\dot{\\phi}} = ml^2\\sin^2\\theta\\,\\dot{\\phi}$ is constant)."
  },
  {
    id: "cpgf-2.56a",
    eq: "2.56a",
    topic: "em",
    tag: "Dielectrics",
    name: "Definition and direction of polarization vector P",
    front: "What is the physical definition of polarization P (dipole moment per unit volume) and what direction does it point relative to bound charges?",
    back: "Definition: $$\\mathbf{P} = \\frac{d\\mathbf{p}}{dV} = \\frac{\\sum \\mathbf{p}_i}{\\Delta V}$$\nDirection: Points from **negative to positive** bound charge (the direction of individual dipole moments $\\mathbf{p} = q\\mathbf{d}$ with $\\mathbf{d}$ from $-q$ to $+q$).",
    note: "In a polarized slab with $\\mathbf{P} = P\\hat{\\mathbf{z}}$, the top surface has $\\sigma_b = +P$ and bottom has $\\sigma_b = -P$, creating an opposing internal field $\\mathbf{E}_{\\text{in}} = -\\frac{\\mathbf{P}}{\\epsilon_0}$ pointing from positive to negative."
  },
  {
    id: "cpgf-2.15a",
    eq: "2.15",
    topic: "em",
    tag: "Conductors",
    name: "Electrostatic properties of an ideal conductor",
    front: "What are the 5 fundamental electrostatic properties of an ideal conductor in electrostatic equilibrium?",
    back: "1. $\\mathbf{E} = \\mathbf{0}$ inside the conductor everywhere.\n2. Bulk charge density $\\rho = 0$ inside (any excess charge resides entirely on the surface $\\sigma$).\n3. The entire conductor is an equipotential volume ($V = \\text{constant}$ inside and on the surface).\n4. Immediately outside the surface, $\\mathbf{E}$ is perpendicular to the surface: $\\mathbf{E} = \\frac{\\sigma}{\\epsilon_0}\\hat{\\mathbf{n}}$ (or $D = \\sigma$); tangential field vanishes ($E_\\parallel = 0$).\n5. Cavity shielding: In a charge-free cavity inside a conductor, $\\mathbf{E} = \\mathbf{0}$, shielding the interior from external fields.",
    note: "In Gaussian pillbox applications straddling a conductor boundary, the interior flux vanishes because $\\mathbf{E} = \\mathbf{0}$ and $\\mathbf{D} = \\mathbf{0}$ inside the metal."
  },
  {
    id: "supp-impedance",
    eq: "supp",
    topic: "lb",
    tag: "Impedance",
    name: "Impedance (supplemental)",
    front: "What is impedance Z, and how is it related to the complex voltage and current in an AC circuit?",
    back: "$$Z \\equiv \\frac{\\tilde{V}}{\\tilde{I}} = R + iX$$\n$Z$ is the complex generalization of resistance: phasors obey Ohm's law $\\tilde{V} = \\tilde{I} Z$. $|Z|$ is the amplitude ratio $V_0/I_0$; $\\arg(Z)$ is the phase of voltage relative to current.",
    note: "Supplemental — not a numbered CPG equation. Kahn (ch. 7) defines $Z$ in prose ($V = IZ$) and numbers only the element formulas (7.7)–(7.11)."
  },
  {
    id: "supp-reactance",
    eq: "supp",
    topic: "lb",
    tag: "Reactance",
    name: "Reactance (supplemental)",
    front: "What is reactance X, and how does it relate to impedance?",
    back: "$$Z = R + iX, \\qquad X = \\mathrm{Im}(Z)$$\nReactance is the imaginary part of impedance. $R$ dissipates energy; $X$ stores and returns it (no time-average power). $X > 0$ is inductive (current lags voltage); $X < 0$ is capacitive (current leads voltage).",
    note: "Supplemental — not a numbered CPG equation. Kahn never names reactance; it is $\\mathrm{Im}(Z)$ of (7.7)–(7.9)."
  },
  {
    id: "supp-reactance-LC",
    eq: "supp",
    topic: "lb",
    tag: "Reactance",
    name: "Inductor and capacitor reactance (supplemental)",
    front: "What are the reactances of an inductor L and a capacitor C at angular frequency omega?",
    back: "$$X_L = \\omega L, \\qquad X_C = -\\frac{1}{\\omega C}$$\nSigned convention $Z = R + iX$: $Z_L = i X_L = i\\omega L$ (eq. 7.8) and $Z_C = i X_C = 1/(i\\omega C)$ (eq. 7.7). GRE stems often quote the positive magnitude $|X_C| = 1/(\\omega C)$.",
    note: "Supplemental — not a numbered CPG equation. Distinct from the complex $Z$ already on cards 7.7 and 7.8."
  },
  {
    id: "supp-ac-reflection",
    eq: "supp",
    topic: "em",
    tag: "Transmission lines",
    name: "AC reflection at an impedance mismatch (supplemental)",
    front: "Why does an AC wave on a transmission line reflect at a load, and what is the voltage reflection coefficient?",
    back: "$$\\Gamma = \\frac{Z_L - Z_0}{Z_L + Z_0}$$\nA forward wave on a line of characteristic impedance $Z_0$ has $V/I = Z_0$. At a load $Z_L \\neq Z_0$ that ratio cannot hold, so a reflected wave is required to match $V = I Z_L$ at the termination. Matched $Z_L = Z_0 \\Rightarrow \\Gamma = 0$; open $Z_L \\to \\infty \\Rightarrow \\Gamma = +1$; short $Z_L = 0 \\Rightarrow \\Gamma = -1$.",
    note: "Supplemental — not a numbered CPG equation. Circuit/line form of mismatch. A PEC wall is the wave analogue of a short ($Z_L=0$, $\\Gamma=-1$): $E_\\parallel$ reverses, $B_\\parallel$ does not. Not optical thin-film phase-shift cards (3.x)."
  },
  {
    id: "supp-coaxial",
    eq: "supp",
    topic: "em",
    tag: "Coaxial cable",
    name: "Coaxial cable fields, C, L, and Z0 (supplemental)",
    front: "For a coaxial cable (inner radius a, outer radius b) carrying current I with line charge lambda, what are E and B in the annulus, and the per-length capacitance, inductance, and characteristic impedance? Also derive E by Gauss's law, the potential difference between the conductors, and the capacitance per length from them.",
    back: "$$a < r < b:\\quad E_r = \\frac{\\lambda}{2\\pi\\epsilon r},\\quad B_\\phi = \\frac{\\mu I}{2\\pi r}$$\nOutside ($r > b$) both vanish (return current and opposite charge on the shield). Per unit length:\n$$\\frac{C}{\\ell} = \\frac{2\\pi\\epsilon}{\\ln(b/a)},\\quad \\frac{L}{\\ell} = \\frac{\\mu}{2\\pi}\\ln\\frac{b}{a},\\quad Z_0 = \\sqrt{\\frac{L}{C}} = \\frac{1}{2\\pi}\\sqrt{\\frac{\\mu}{\\epsilon}}\\ln\\frac{b}{a}$$\nDerivation in vacuum, $\\epsilon = \\epsilon_0$: take a coaxial Gaussian cylinder of radius $r$ and length $L$ around the inner conductor, which holds charge $\\lambda L$. The field is radial, so the flux is $E_r\\,2\\pi r L = \\lambda L/\\epsilon_0$ and $E_r = \\lambda/(2\\pi\\epsilon_0 r)$, outward for $\\lambda > 0$. Then the potential difference between the conductors is $$V = V_a - V_b = \\int_a^b E_r\\,dr = \\frac{\\lambda}{2\\pi\\epsilon_0}\\ln\\frac{b}{a},$$ positive for $\\lambda > 0$ because the field points from the inner conductor to the outer one. With $Q = \\lambda L$ the capacitance is $C = Q/V = 2\\pi\\epsilon_0 L/\\ln(b/a)$, so $C/\\ell = \\lambda/V = 2\\pi\\epsilon_0/\\ln(b/a)$ in $\\mathrm{F/m}$, with $2\\pi\\epsilon_0 \\approx 55.6\\ \\mathrm{pF/m}$.\nA line charge has no finite potential at infinity: $V(r) = -\\dfrac{\\lambda}{2\\pi\\epsilon_0}\\ln(r/r_0)$ diverges as $r \\to \\infty$, so choose a reference radius $r_0$ where $V = 0$. A difference such as $V_a - V_b$ does not depend on $r_0$.\nOutside ($r > R$) a long uniformly charged cylinder or cylindrical shell of radius $R$ with charge $\\lambda$ per unit length has the same field as the line, $E_r = \\lambda/(2\\pi\\epsilon_0 r)$. Inside a shell ($r < R$) the enclosed charge is zero, so $E = 0$.",
    note: "Supplemental — not a numbered CPG equation. Kahn works $C/\\ell$ in a cylindrical line-plus-shell example but does not index it. TEM: fields live only in the annulus."
  },
  {
    id: "supp-wave-travel",
    eq: "supp",
    topic: "em",
    tag: "EM waves",
    name: "Reading a traveling-wave phase (supplemental)",
    front: "Which way does a wave with electric field E = E_0 cos(k x − omega t) n-hat propagate?",
    back: "$$+\\hat{\\mathbf{x}}$$\nConstant-phase surfaces of $kx-\\omega t$ move toward $+x$. After normal reflection at a wall near $x=0$ the returning wave travels $-\\hat{\\mathbf{x}}$: $\\cos(-kx-\\omega t)$ or $\\cos(kx+\\omega t)$.",
    note: "Supplemental — not a numbered CPG equation. Operational reading of eq. 2.61. Do not guess $\\hat{\\mathbf{k}}$ from the polarization $\\hat{\\mathbf{n}}$."
  },
  {
    id: "supp-pec-em",
    eq: "supp",
    topic: "em",
    tag: "EM waves",
    name: "Perfect conductor vs an EM wave (supplemental)",
    front: "For an EM wave incident on a perfect conductor, what are the fields inside, the tangential E just outside, and is there a transmitted wave?",
    back: "$$\\mathbf{E}=\\mathbf{B}=\\mathbf{0}\\ \\text{inside};\\quad \\mathbf{E}_\\parallel^{\\text{out}}=0$$\nIdeal conductivity $\\Rightarrow$ skin depth $0$: no transmitted wave. Tangential $E$ is continuous (eq. 2.14) and vanishes inside, so $E_\\parallel$ just outside is identically zero. A reflected wave must exist to cancel the incident $E_\\parallel$ at the surface.",
    note: "Supplemental — not a numbered CPG equation. Electrostatics card 2.15a is the static version; $E=0$ inside still holds for an ideal PEC at finite frequency. A dielectric interface does transmit."
  },
  {
    id: "supp-pec-reflect",
    eq: "supp",
    topic: "em",
    tag: "EM waves",
    name: "Normal reflection from a perfect conductor (supplemental)",
    front: "A plane EM wave is normally incident on a perfect conductor. How do the reflected E and B relate to the incident fields?",
    back: "$$\\mathbf{E}_{\\text{refl},\\parallel} = -\\mathbf{E}_{\\text{inc},\\parallel},\\qquad \\hat{\\mathbf{k}}_{\\text{refl}} = -\\hat{\\mathbf{k}}_{\\text{inc}}$$\nThen recompute $\\mathbf{B}_{\\text{refl}} = (1/c)\\,\\hat{\\mathbf{k}}_{\\text{refl}}\\times\\mathbf{E}_{\\text{refl}}$ (eq. 2.62) from the reflected triad — never the incident $\\hat{\\mathbf{k}}$. Result: $E_\\parallel$ reverses, $B_\\parallel$ does not (incident and reflected $\\mathbf{B}$ point the same way). Trap: $\\hat{\\mathbf{k}}_{\\text{inc}}\\times\\mathbf{E}_{\\text{refl}}$ flips $B$ and is wrong.",
    note: "Supplemental — Kahn 2.6.1 prose, unnumbered. Mechanism behind GRE conductor-plate items. Not the transmission-line $\\Gamma$ card and not thin-film optics."
  },
  {
    id: "supp-em-triad",
    eq: "supp",
    topic: "em",
    tag: "EM waves",
    name: "EM-wave triad for each traveling wave (supplemental)",
    front: "For a vacuum plane wave, how are k-hat, E, and B related, and what must be true of the Poynting vector?",
    back: "$$\\hat{\\mathbf{k}},\\ \\mathbf{E},\\ \\mathbf{B}\\ \\text{are right-handed};\\quad \\mathbf{B}=\\frac{1}{c}\\hat{\\mathbf{k}}\\times\\mathbf{E},\\quad \\mathbf{S}\\parallel\\hat{\\mathbf{k}}$$\nApply this separately to every traveling piece (incident, reflected, transmitted). After a bounce $\\hat{\\mathbf{k}}$ has changed, so $\\mathbf{B}$ must be rebuilt from the new $\\hat{\\mathbf{k}}$ and the new $\\mathbf{E}$.",
    note: "Supplemental — operational form of eqs. 2.62–2.63. The book cards state the formulas; this card is the do-not-reuse-the-incident-triad rule."
  },
  {
    id: "supp-torque-cross",
    eq: "supp",
    topic: "cm",
    tag: "Angular Momentum",
    name: "Torque cross product, expanded (supplemental)",
    front: "What is the full expanded cross product for torque $\\tau = \\mathbf{r} \\times \\mathbf{F}$, component by component?",
    back: "$$\\tau = (yF_z - zF_y)\\hat{i} + (zF_x - xF_z)\\hat{j} + (xF_y - yF_x)\\hat{k}$$\n- x-component ($\\tau_x$): $yF_z - zF_y$\n- y-component ($\\tau_y$): $zF_x - xF_z$\n- z-component ($\\tau_z$): $xF_y - yF_x$",
    note: "Supplemental — not a numbered CPG equation. Determinant expansion of $\\mathbf{r} \\times \\mathbf{F}$; companion to the torque cards cpgf-1.18/1.20."
  },
  {
    id: "supp-moment-of-inertia",
    eq: "supp",
    topic: "cm",
    tag: "Moment of Inertia",
    name: "Moments of inertia — standard geometries (supplemental)",
    front: "What are the standard moments of inertia for the common GRE geometries (point mass/hoop, disk, spherical shell, solid sphere, rod about center and about end)?",
    back: "All about the symmetry axis through the center of mass unless noted:<br><table class=\"moi-inertia-table\"><thead><tr><th>Geometry</th><th>Axis</th><th>Moment of Inertia $I$</th></tr></thead><tbody><tr class=\"moi-group-hoop-disk\"><td><strong>Thin hoop / ring</strong> (or point mass, radius $R$)</td><td>Central symmetry axis</td><td>$I = MR^2$</td></tr><tr class=\"moi-group-hoop-disk\"><td><strong>Solid disk / cylinder</strong> (radius $R$)</td><td>Central symmetry axis</td><td>$I = \\frac{1}{2}MR^2$</td></tr><tr class=\"moi-group-shell-sphere\"><td><strong>Thin spherical shell</strong> (radius $R$)</td><td>Any diameter (through CM)</td><td>$I = \\frac{2}{3}MR^2$</td></tr><tr class=\"moi-group-shell-sphere\"><td><strong>Solid sphere</strong> (radius $R$)</td><td>Any diameter (through CM)</td><td>$I = \\frac{2}{5}MR^2$</td></tr><tr class=\"moi-group-rod\"><td><strong>Thin rod through center</strong> (length $L$)</td><td>Axis $\\perp$ rod through center</td><td>$I = \\frac{1}{12}ML^2$</td></tr><tr class=\"moi-group-rod\"><td><strong>Thin rod through end</strong> (length $L$)</td><td>Axis $\\perp$ rod through one end</td><td>$I = \\frac{1}{3}ML^2$</td></tr></tbody></table>",
    note: "Supplemental — not a numbered CPG equation. The ETS sheet lists only a few of these; the rest must be reflexes. Rod-about-end follows from rod-about-center by the parallel-axis theorem $I = I_{\\rm CM} + Md^2$ with $d = L/2$."
  },
  {
    id: "supp-discrete-physical-pendulum",
    eq: "supp",
    topic: "cm",
    tag: "Oscillations",
    name: "Physical pendulum small-oscillation frequency — discrete masses (supplemental)",
    front: "For a rigid body pivoted at one end carrying discrete point masses $m_i$ at distances $x_i$ from the pivot, what is the small-oscillation angular frequency $\\omega$?",
    back: "$$\\omega^2 = \\frac{g \\sum_i m_i x_i}{\\sum_i m_i x_i^2} \\iff \\omega = \\sqrt{\\frac{g \\sum_i m_i x_i}{\\sum_i m_i x_i^2}}$$\n- **Numerator** ($g \\sum_i m_i x_i$): Gravitational restoring torque coefficient per unit angle (first mass moment $\\times g = M g d_{\\mathrm{CM}}$).\n- **Denominator** ($\\sum_i m_i x_i^2$): Moment of inertia $I_{\\mathrm{pivot}}$ about the pivot (second mass moment).\n- **Effective simple-pendulum length**: $$L_{\\mathrm{eff}} = \\frac{I_{\\mathrm{pivot}}}{M d_{\\mathrm{CM}}} = \\frac{\\sum_i m_i x_i^2}{\\sum_i m_i x_i} \\implies \\omega = \\sqrt{\\frac{g}{L_{\\mathrm{eff}}}}$$",
    note: "Supplemental — discrete physical pendulum $\\omega = \\sqrt{mgd_{\\mathrm{CM}}/I_{\\mathrm{pivot}}}$. For two masses $m$ on rod length $\\ell$, both at $\\ell$ gives $\\omega_I = \\sqrt{g/\\ell}$; one at $\\ell/2$ and one at $\\ell$ gives $\\sum m_i x_i = \\frac{3}{2}m\\ell$, $\\sum m_i x_i^2 = \\frac{5}{4}m\\ell^2$, yielding $\\omega_{II}^2 = \\frac{6}{5}\\frac{g}{\\ell}$ and ratio $\\omega_{II}/\\omega_I = \\sqrt{6/5}$."
  },
  {
    id: "supp-pendulum-mass-shift-shortcut",
    eq: "supp",
    topic: "cm",
    tag: "Oscillations",
    name: "When an inward mass shift raises the pendulum frequency (supplemental)",
    front: "For a discrete physical pendulum, when does moving mass closer to the pivot raise $\\omega$, and when can the same move lower it?",
    back: "$$\\frac{\\omega^2}{g} = \\frac{\\sum_i m_i x_i}{\\sum_i m_i x_i^2}$$\nIf every distance from the pivot is scaled by the same factor $\\lambda$ with $0 \\lt \\lambda \\lt 1$, then $\\omega$ rises as $1/\\sqrt{\\lambda}$.\nMoving one mass closer to the pivot does not always raise $\\omega$. That move is not a common scale factor. Two equal masses at distances $1$ and $0.1$, in one length unit, give $\\sum_i x_i/\\sum_i x_i^2 \\approx 1.089$ per that unit. Moving the second mass from $0.1$ to $0.05$ changes the ratio to about $1.047$, so $\\omega$ falls.\nDo not discard an option only because a mass moved toward the pivot.",
    note: "Supplemental — not a numbered CPG equation. The frequency formula is on supp-discrete-physical-pendulum. A common scale factor $\\lambda$ is not the same operation as moving one mass."
  },
  {
    id: "supp-nuclear-force-range",
    eq: "supp",
    topic: "sp",
    tag: "Nuclear Physics",
    name: "Characteristic range of the nuclear force (supplemental)",
    front: "What is the characteristic range (characteristic length) of the strong nuclear force — i.e., at approximately what separation does Coulomb repulsion between two protons overtake the strong attraction?",
    back: "$$r \\sim 1\\ \\mathrm{fm} = 10^{-15}\\ \\mathrm{m}$$\nThe strong force is short-ranged (pion exchange gives an exponentially decaying potential), so beyond $\\sim 1$ fm the nuclear attraction dies out and Coulomb repulsion wins. Comparison anchors: atomic scale $\\sim 10^{-10}$ m (Angstrom), nuclear scale $\\sim 10^{-15}$ m (fermi).",
    note: "Supplemental — not a numbered CPG equation. Kahn states this as a fact to know cold (ch. 8 solutions, problem 8.5-10). Useful companion scale: $\\hbar c \\approx 200\\ \\mathrm{MeV\\cdot fm}$."
  },
  {
    id: "supp-qm-length-scales",
    eq: "supp",
    topic: "qm",
    tag: "Dimensional analysis",
    name: "QM characteristic length scales (supplemental)",
    front: "What characteristic length does dimensional analysis assign to each QM system — harmonic oscillator, hydrogen atom, and massive particle?",
    back: "Each QM problem's constants combine into exactly one length:\n- **Oscillator ground-state width**: $\\sqrt{\\hbar/(m\\omega)}$ — the only length from $\\hbar$, $m$, $\\omega$.\n- **Bohr radius**: $a_0 = \\dfrac{4\\pi\\epsilon_0\\hbar^2}{\\mu e^2}$ — only length from $\\mu$, $\\hbar$, $e^2/4\\pi\\epsilon_0$ (eq. 5.44). Positronium has $\\mu = m_e/2$, so its Bohr radius is double hydrogen's.\n- **Compton wavelength**: $\\lambda_C = \\dfrac{h}{mc}$ — depends only on mass, not momentum (eq. 7.15).\n- **de Broglie wavelength**: $\\lambda = h/p$ — momentum-dependent (eq. 5.28, $p = \\hbar k$).",
    note: "Supplemental — not a numbered CPG equation; Kahn derives the oscillator width, Bohr radius, and Compton wavelength by the same trick: the parameters admit exactly one combination with units of length. The Bohr radius, Compton, and de Broglie formulas already have their own cards (cpgf-5.44, 7.15, 5.28); this card drills the shared dimensional-analysis pattern."
  },
  {
    id: "supp-coulomb-coupling",
    eq: "supp",
    topic: "em",
    tag: "Electrostatics",
    name: "Coulomb coupling in natural fm·MeV units (supplemental)",
    front: "What is the Coulomb coupling constant $e^2/(4\\pi\\epsilon_0)$ in natural $\\mathrm{MeV\\cdot fm}$ units, and how does it follow from the fine-structure constant $\\alpha$ and $\\hbar c$?",
    back: "$$\\frac{e^2}{4\\pi\\epsilon_0} = \\alpha \\hbar c \\approx \\frac{197\\ \\mathrm{MeV\\cdot fm}}{137} \\approx 1.44\\ \\mathrm{MeV\\cdot fm}$$\n- **Fine-structure constant**: $$\\alpha = \\frac{e^2}{4\\pi\\epsilon_0 \\hbar c} = \\frac{1}{137}$$\n- **Reduced Planck $\\times$ $c$**: $\\hbar c \\approx 197\\ \\mathrm{MeV\\cdot fm}$ (often quoted as $\\approx 200\\ \\mathrm{MeV\\cdot fm}$).\n- **Use**: the Coulomb energy of two elementary charges separated by $r$ is $U = \\dfrac{e^2}{4\\pi\\epsilon_0}\\dfrac{1}{r} \\approx \\dfrac{1.44\\ \\mathrm{MeV\\cdot fm}}{r}$ — e.g., two protons $1$ fm apart repel with $\\sim 1.4$ MeV.",
    note: "Supplemental — not a numbered CPG equation. Transcribed from the captain's handwritten note: combining $\\alpha = 1/137$ with $\\hbar c \\approx 197\\ \\mathrm{MeV\\cdot fm}$ yields the Coulomb scale $e^2/4\\pi\\epsilon_0 \\approx 1.44\\ \\mathrm{MeV\\cdot fm}$, the fast route to electrostatic energies at atomic and nuclear scales."
  },
  {
    id: "supp-energy-phase",
    eq: "supp",
    topic: "qm",
    tag: "Schrodinger equation",
    name: "Energy-eigenstate time phase (supplemental)",
    front: "For a time-independent Hamiltonian, how does an energy eigenstate of energy $E_n$ evolve in time, and what stays constant about the probability of measuring that energy?",
    back: "$$\\psi_n(t) = \\psi_n\\, e^{-i E_n t/\\hbar}$$\nEach energy eigenstate picks up only this phase. In a superposition the weights stay $|c_n|^2$, so $P(E_n) = |c_n|^2$ does not change with time. Relative phases between different energies do change, so an observable that is not the energy can oscillate.\n\n**Origin of the sign.** Put $\\Psi = \\psi(x)\\, T(t)$ into $i\\hbar\\,\\partial_t\\Psi = \\hat{H}\\Psi$ with $\\hat{H}\\psi = E\\psi$. Then $i\\hbar\\, T' = ET$, so\n$$T = e^{-i Et/\\hbar}$$\n\n**Not the Boltzmann factor.** $e^{-E/k_B T}$ is real: an occupation weight (how likely a level is occupied). $e^{-i Et/\\hbar}$ is imaginary and has modulus 1: a pure phase, and it changes no probability. Same shape, different job.",
    note: "Supplemental — not a numbered CPG equation. The time-dependent equation is cpgf-5.12 and the definite-energy form is cpgf-5.14. This card is the solution of that ODE, kept with the one-line origin so the sign stays put, and kept apart from $e^{-E/k_B T}$."
  },
  {
    id: "supp-sho-ladder",
    eq: "supp",
    topic: "qm",
    tag: "Harmonic oscillator",
    name: "Harmonic-oscillator ladder operators (supplemental)",
    front: "How are the ladder operators $a$ and $a^{\\dagger}$ built from $\\hat{x}$ and $\\hat{p}$, and how is $\\hat{p}$ built from $a$ and $a^{\\dagger}$? Give both the proportional sign pattern and the exact formulas with prefactors.",
    back: "**Proportional**\n$$\\hat{p} \\propto a^{\\dagger} - a$$\n$$a \\propto \\hat{x} + \\frac{i\\hat{p}}{m\\omega}$$\n$$a^{\\dagger} \\propto \\hat{x} - \\frac{i\\hat{p}}{m\\omega}$$\n\n**Precise**\n$$a = \\sqrt{\\frac{m\\omega}{2\\hbar}}\\left(\\hat{x} + \\frac{i\\hat{p}}{m\\omega}\\right)$$\n$$a^{\\dagger} = \\sqrt{\\frac{m\\omega}{2\\hbar}}\\left(\\hat{x} - \\frac{i\\hat{p}}{m\\omega}\\right)$$\n$$\\hat{p} = i\\sqrt{\\frac{\\hbar m\\omega}{2}}\\left(a^{\\dagger} - a\\right)$$\n\nThe proportional $\\hat{p}$ line hides the leading $i$; $a^{\\dagger}-a$ is anti-Hermitian, and that $i$ is what makes $\\hat{p}$ Hermitian. Swapping the $\\pm i\\hat{p}$ signs conjugates the wrong way.",
    note: "Supplemental — not a numbered CPG equation."
  },
  {
    id: "supp-ho-moments",
    eq: "supp",
    topic: "qm",
    tag: "Harmonic oscillator",
    name: "Harmonic-oscillator energy shares (supplemental)",
    front: "For a one-dimensional harmonic-oscillator energy eigenstate $|n\\rangle$ of energy $E_n = \\hbar\\omega\\left(n+\\frac{1}{2}\\right)$, what are $\\langle T\\rangle_n$, $\\langle V\\rangle_n$, $\\langle p^2\\rangle_n$, and $\\langle x^2\\rangle_n$?",
    back: "$$\\langle T\\rangle_n = \\langle V\\rangle_n = \\frac{1}{2} E_n$$\nKinetic energy is $T = p^2/(2m)$, so\n$$\\langle p^2\\rangle_n = 2m\\langle T\\rangle_n = m E_n = m\\left(n+\\frac{1}{2}\\right)\\hbar\\omega$$\nThe same split gives\n$$\\langle x^2\\rangle_n = \\frac{E_n}{m\\omega^2}$$\n\n**Trap.** $m E_n$ is $\\langle n|\\hat{p}^2|n\\rangle$; $\\hat{p}^2|n\\rangle$ also contains $|n\\pm 2\\rangle$, so this is not an eigenvalue.",
    note: "Supplemental — not a numbered CPG equation."
  },
  {
    id: "supp-virial",
    eq: "supp",
    topic: "qm",
    tag: "Virial theorem",
    name: "Virial theorem (supplemental)",
    front: "For a stationary bound state in a potential $V \\propto r^k$, how do $\\langle T\\rangle$ and $\\langle V\\rangle$ share the energy $E$?",
    back: "$$2\\langle T\\rangle = k\\langle V\\rangle$$\nWith $E = \\langle T\\rangle + \\langle V\\rangle$,\n$$\\langle T\\rangle = \\frac{k}{k+2}E, \\qquad \\langle V\\rangle = \\frac{2}{k+2}E$$\nOscillator, $k = 2$: half and half. Coulomb or gravity, $k = -1$: $\\langle T\\rangle = -E$, $\\langle V\\rangle = 2E$.\n\nThe same rule holds for $V \\propto x^k$ in one dimension, and these are expectation values in a stationary state, or a long time average, not an operator identity.",
    note: "Supplemental — not a numbered CPG equation."
  },
  {
    id: "supp-infinite-well",
    kind: "list",
    eq: "supp",
    topic: "qm",
    tag: "Particle in a box",
    name: "Infinite square well (supplemental list)",
    front: "State the infinite-well energies in both $\\hbar$ and $h$ forms, the domain and what $L$ is, the eigenfunction on $0 \\lt x \\lt L$, the interior node count, and why walls at $\\pm a$ are not this sine copied unchanged. (4)",
    back: "<ul class=\"recall-list\"><li>Zero potential for $0 \\lt x \\lt L$, infinite outside, $n \\ge 1$, and $L$ the wall-to-wall distance: $$E_n = \\frac{n^2\\pi^2\\hbar^2}{2mL^2} = \\frac{n^2 h^2}{8mL^2}.$$</li><li>Walls at $\\pm a$ mean $L = 2a$.</li><li>On $0 \\lt x \\lt L$, $\\psi_n = \\sqrt{2/L}\\sin(n\\pi x/L)$, and $\\psi_n$ is zero on the walls.</li><li>There are $n-1$ interior nodes. A well centered on the origin is not this sine copied onto that interval unchanged.</li></ul>",
    note: "Supplemental — not a numbered CPG equation."
  },
  {
    id: "supp-newton-momentum",
    kind: "list",
    eq: "supp",
    topic: "cm",
    tag: "Momentum",
    name: "Momentum, impulse, and equal-mass collisions (supplemental list)",
    front: "For a closed system in an inertial frame, state the momentum theorem, the constant-mass law, the impulse, when linear momentum is conserved, the Newtonian internal-force model and why it is not the rocket equation, the power $P = \\mathbf{F}\\cdot\\mathbf{v}$, the one-dimensional equal-mass elastic exchange, and the two-dimensional equal-mass right angle. (8)",
    back: "<ul class=\"recall-list\"><li>For a closed material system in an inertial frame, $\\dot{\\mathbf{P}} = \\mathbf{F}_{\\mathrm{ext}}$.</li><li>Constant mass: $\\sum\\mathbf{F} = m\\mathbf{a}$.</li><li>Impulse: $\\int\\mathbf{F}\\,dt = \\Delta\\mathbf{p}$.</li><li>Linear momentum is conserved when the net external force vanishes.</li><li>Internal forces cancel in pairs in the Newtonian particle model. Do not apply $\\dot{(m\\mathbf{v})} = \\mathbf{F}_{\\mathrm{ext}}$ to a rocket.</li><li>Instantaneous power: $P = \\mathbf{F}\\cdot\\mathbf{v}$.</li><li>One dimension, elastic collision, equal masses: the two velocities are exchanged.</li><li>Two dimensions, elastic collision, equal masses, target at rest, and both final speeds nonzero: the final velocities are perpendicular.</li></ul>",
    note: "Supplemental — not a numbered CPG equation. Rotational power $P = \\boldsymbol{\\tau}\\cdot\\boldsymbol{\\omega}$ is not a required line. The general one-dimensional elastic finals follow from momentum and energy; the equal-mass exchange is the required case."
  },
  {
    id: "supp-friction",
    kind: "list",
    eq: "supp",
    topic: "cm",
    tag: "Friction",
    name: "Static and kinetic friction (supplemental list)",
    front: "State the static and kinetic friction laws, what each force opposes, what $N$ is, and how a moving belt can drag a lab-stationary object. (3)",
    back: "<ul class=\"recall-list\"><li>$f_s \\le \\mu_s N$ opposes impending slip. $N$ is the normal-force magnitude.</li><li>$f_k = \\mu_k N$ opposes relative slip at the contact, not necessarily the laboratory velocity.</li><li>A moving belt can drag an object that is stationary in the lab.</li></ul>",
    note: "Supplemental — not a numbered CPG equation."
  },
  {
    id: "supp-rocket",
    kind: "list",
    eq: "supp",
    topic: "cm",
    tag: "Variable mass",
    name: "Rocket equation without external force (supplemental list)",
    front: "State the one-dimensional rocket equation with no external force, the constant-exhaust-speed integral, and the gravitational term that is not part of this card. (3)",
    back: "<ul class=\"recall-list\"><li>One dimension, no external force, $u \\gt 0$ the backward exhaust speed relative to the rocket, and $\\dot{m} \\lt 0$ while burning: $m\\dot{v} = -u\\dot{m}$.</li><li>Constant $u$: $\\Delta v = u\\ln(m_i/m_f)$.</li><li>An external gravitational field along the burn adds $-gt$. That term is not this card.</li></ul>",
    note: "Supplemental — not a numbered CPG equation."
  },
  {
    id: "supp-driven-response",
    kind: "list",
    eq: "supp",
    topic: "cm",
    tag: "Driven oscillator",
    name: "Driven oscillator amplitude (supplemental list)",
    front: "State the steady driven amplitude with $\\beta = b/(2m)$, and the undamped limit, including exact undamped resonance. (2)",
    back: "<ul class=\"recall-list\"><li>With $\\beta = b/(2m)$, $$A(\\omega) = \\frac{F_0/m}{\\sqrt{(\\omega_0^2-\\omega^2)^2+(2\\beta\\omega)^2}}.$$</li><li>Undamped, and only for $\\omega \\ne \\omega_0$: $(F_0/m)/|\\omega_0^2-\\omega^2|$. At exact undamped resonance there is no finite stationary amplitude.</li></ul>",
    note: "Supplemental — not a numbered CPG equation. The damping symbol matches cpgf-1.45."
  },
  {
    id: "supp-small-oscillation",
    eq: "supp",
    topic: "cm",
    tag: "Small oscillations",
    name: "Small-oscillation frequency from a potential minimum (supplemental)",
    front: "For one dimension, a small displacement from a potential minimum, what is $\\omega$?",
    back: "$$\\omega = \\sqrt{\\frac{V''(x_0)}{m}}$$\nThe point $x_0$ is an equilibrium, $V'(x_0) = 0$, with $V''(x_0) \\gt 0$. A flat minimum, $V''(x_0) = 0$, is not this frequency.",
    note: "Supplemental — not a numbered CPG equation."
  },
  {
    id: "supp-gravity-orbits",
    kind: "list",
    eq: "supp",
    topic: "cm",
    tag: "Gravity",
    name: "Newtonian gravity, vis-viva, and Kepler (supplemental list)",
    front: "State $U = -GMm/r$ and its zero, the relative-orbit vis-viva equation, the two-body Kepler law with its coefficient, and the $m \\ll M$ circular and escape speeds. (4)",
    back: "<ul class=\"recall-list\"><li>$U = -GMm/r$, with zero at infinity.</li><li>Relative orbit: $v^2 = G(M+m)\\left(\\dfrac{2}{r}-\\dfrac{1}{a}\\right)$.</li><li>Relative orbit: $T^2 = \\dfrac{4\\pi^2 a^3}{G(M+m)}$.</li><li>Circular speed $\\sqrt{GM/r}$ and escape speed $\\sqrt{2GM/r}$ are the $m \\ll M$ limits of those laws.</li></ul>",
    note: "Supplemental — not a numbered CPG equation. The proportionality without this coefficient is already on cpgl-1.03."
  },
  {
    id: "supp-hydrostatics",
    kind: "list",
    eq: "supp",
    topic: "cm",
    tag: "Fluids",
    name: "Buoyancy and hydrostatic pressure difference (supplemental list)",
    front: "State the buoyant force in an incompressible fluid under uniform $g$, and how pressure changes with depth. (2)",
    back: "<ul class=\"recall-list\"><li>Buoyant force $\\rho_{\\mathrm{fluid}} g V_{\\mathrm{displaced}}$, directed upward.</li><li>Pressure is higher at greater depth by $\\rho g h$. Here $h$ is the increase in depth. This is a pressure difference, not an absolute pressure.</li></ul>",
    note: "Supplemental — not a numbered CPG equation. This is the static limit of the fluid relations on cpgf-1.49 and cpgf-1.51, printed here because those cards do not state the difference."
  },
  {
    id: "supp-drift-current",
    kind: "list",
    eq: "supp",
    topic: "em",
    tag: "Current density",
    name: "Drift current density (supplemental list)",
    front: "State the drift current density with the sign of $q$, the current through an area perpendicular to the drift, the drift speed from the current for a round wire, the microscopic form of Ohm's law, and the size of the drift speed in a metal. (5)",
    back: "<ul class=\"recall-list\"><li>$\\mathbf{J} = n q \\mathbf{v}_d$, with $q$ signed. Here $n$ is the carrier number density and $\\mathbf{v}_d$ the drift velocity.</li><li>$I = n|q| A v_d$ when $A$ is perpendicular to the drift.</li><li>Solving for the drift speed: $v_d = I/(n|q|A)$. For a round wire of radius $r$, $A = \\pi r^2$.</li><li>Microscopic Ohm's law: $\\mathbf{J} = \\sigma\\mathbf{E}$, with conductivity $\\sigma$ and resistivity $\\rho = 1/\\sigma$.</li><li>In a metal $n \\sim 10^{28}\\ \\mathrm{m^{-3}}$ and $|q| = e = 1.6\\times10^{-19}\\ \\mathrm{C}$, so $ne \\approx 1.6\\times10^{9}\\ \\mathrm{C/m^3}$. Example: $I = 100\\ \\mathrm{A}$, $r = 0.01\\ \\mathrm{m}$ gives $A \\approx 3.1\\times10^{-4}\\ \\mathrm{m^2}$ and $v_d \\approx 100/(5\\times10^{5}) \\approx 2\\times10^{-4}\\ \\mathrm{m/s}$. Drift speeds are of order $10^{-4}\\ \\mathrm{m/s}$, below $1\\ \\mathrm{mm/s}$.</li></ul>",
    note: "Supplemental — not a numbered CPG equation."
  },
  {
    id: "supp-material-aux-fields",
    kind: "list",
    eq: "supp",
    topic: "em",
    tag: "Fields in matter",
    name: "Auxiliary fields and interface conditions (supplemental list)",
    front: "State the SI definitions of $\\mathbf{D}$ and $\\mathbf{H}$, the linear isotropic relations for $\\mathbf{P}$ and $\\mathbf{M}$, and the free-charge interface conditions. (4)",
    back: "<ul class=\"recall-list\"><li>SI: $\\mathbf{D} = \\epsilon_0\\mathbf{E}+\\mathbf{P}$.</li><li>SI: $\\mathbf{H} = \\mathbf{B}/\\mu_0-\\mathbf{M}$.</li><li>Linear isotropic electric response: $\\mathbf{P} = \\epsilon_0\\chi_e\\mathbf{E}$. The magnetic companion, a syllabus relation, is $\\mathbf{M} = \\chi_m\\mathbf{H}$.</li><li>Normal from side 1 into side 2: $\\hat{\\mathbf{n}}\\cdot(\\mathbf{D}_2-\\mathbf{D}_1) = \\sigma_f$ and $\\hat{\\mathbf{n}}\\times(\\mathbf{H}_2-\\mathbf{H}_1) = \\mathbf{K}_f$.</li></ul>",
    note: "Supplemental — not a numbered CPG equation. A conductor-surface result $D = \\sigma$ on cpgf-2.15a is not this pair of definitions. The magnetic lines are syllabus companions of the electric ones."
  },
  {
    id: "supp-image-plane",
    kind: "list",
    eq: "supp",
    topic: "em",
    tag: "Method of images",
    name: "Image charge for a grounded conducting plane (supplemental list)",
    front: "For a grounded infinite conducting plane, state the image charge and where it sits, and state the induced surface density together with its integral. (2)",
    back: "<ul class=\"recall-list\"><li>Electrostatics, grounded infinite conducting plane: the image is $-q$ at the mirror point. This is not a sphere and not an isolated neutral plane.</li><li>Real charge $q$ a distance $d$ from the plane, and $\\rho$ the in-plane distance: $\\sigma(\\rho) = -qd/[2\\pi(\\rho^2+d^2)^{3/2}]$. The density integrates to $-q$.</li></ul>",
    note: "Supplemental — not a numbered CPG equation."
  },
  {
    id: "supp-rc-rl-transients",
    kind: "list",
    eq: "supp",
    topic: "em",
    tag: "Transients",
    name: "RC and RL transients (supplemental list)",
    front: "For constant $R$, $C$, and $L$ with no mutual inductance, state the RC charge approach and discharge, the RL current approach and decay, and the two stored-energy time factors. (5)",
    back: "<ul class=\"recall-list\"><li>Charge from zero toward $Q_f = CV$: $Q = Q_f(1-e^{-t/RC})$.</li><li>Capacitor discharging through a resistor from charge $Q_0$ at $t=0$: $Q(t) = Q_0 e^{-t/RC}$. Here $Q$ is charge, $Q_0$ initial charge, $R$ resistance, $C$ capacitance, and $t$ elapsed time. Current magnitude $I(t) = |dQ/dt| = (Q_0/RC)e^{-t/RC}$; capacitor voltage $V(t) = Q(t)/C = (Q_0/C)e^{-t/RC}$. The time constant $\\tau = RC$ gives $Q(\\tau) = Q_0/e \\approx 0.37Q_0$ (about $37\\%$ of the initial charge). Stored energy falls as $e^{-2t/RC}$.</li><li>Inductor current from zero toward $I_f = V/R$: $I = I_f\\left(1-e^{-(R/L)t}\\right)$.</li><li>Inductor current decaying from $I_0$: $I = I_0 e^{-(R/L)t}$.</li><li>While the capacitor is charging, stored energy approaches its final value as $(1-e^{-t/RC})^2$, not as $e^{-2t/RC}$. Constant-current charging $Q = Q_0+It$ is not this card.</li></ul>",
    note: "Supplemental — not a numbered CPG equation. The time constants $RC$ and $L/R$ are already on cpgf-2.83 and cpgf-2.84. The pattern is: approach the final value as $1-e^{-t/\\tau}$, and leave the initial value as $e^{-t/\\tau}$."
  },
  {
    id: "supp-capacitor-energy-halving",
    kind: "list",
    eq: "supp",
    topic: "em",
    tag: "Transients",
    name: "Capacitor energy and half-times (supplemental list)",
    front: "State the stored energy of a capacitor in three forms, the energy of a capacitor discharging through a resistor, and the times for its charge and for its energy to fall to half. (4)",
    back: "<ul class=\"recall-list\"><li>Stored energy: $U = Q^2/(2C) = \\tfrac{1}{2}CV^2 = \\tfrac{1}{2}QV$.</li><li>Discharge through $R$ from charge $Q_0$: $Q = Q_0 e^{-t/RC}$, so $U = U_0 e^{-2t/RC}$ with $U_0 = Q_0^2/(2C)$. The energy decays twice as fast as the charge because $U \\propto Q^2$.</li><li>Time for the charge to fall to half: set $e^{-t/RC} = 1/2$ and take the logarithm, giving $t = RC\\ln 2 \\approx 0.69\\,RC$.</li><li>Time for the energy to fall to half: set $e^{-2t/RC} = 1/2$, giving $t = (RC\\ln 2)/2 \\approx 0.35\\,RC$. The method for any fraction is to set the exponential equal to that fraction and take the logarithm.</li></ul>",
    note: "Supplemental — not a numbered CPG equation. The charge, current, and voltage decay and the time constant $\\tau = RC$ are also on supp-rc-rl-transients."
  },
  {
    id: "supp-parallel-wire-force",
    kind: "list",
    eq: "supp",
    topic: "em",
    tag: "Magnetic force",
    name: "Field of a long straight wire and the force between parallel wires (supplemental list)",
    front: "State the magnetic field of a long straight wire, the force on a straight current-carrying segment in a field, the force per unit length between two long parallel wires, and whether parallel or antiparallel currents attract. (4)",
    back: "<ul class=\"recall-list\"><li>Long straight wire carrying current $I$: $B = \\mu_0 I/(2\\pi r)$ at perpendicular distance $r$, with $\\mu_0 = 4\\pi\\times10^{-7}\\ \\mathrm{T\\,m/A}$. The field lines are circles around the wire, in the direction of the fingers of the right hand when the thumb points along the current.</li><li>Straight segment of length $L$ carrying current $I$ in a uniform field $\\mathbf{B}$: $\\mathbf{F} = I\\mathbf{L}\\times\\mathbf{B}$, with $\\mathbf{L}$ pointing along the current. Its magnitude is $ILB\\sin\\theta$, with $\\theta$ the angle between $\\mathbf{L}$ and $\\mathbf{B}$.</li><li>Two long parallel wires a distance $d$ apart, carrying currents $I_1$ and $I_2$: the field of wire 1 at wire 2 is $\\mu_0 I_1/(2\\pi d)$, perpendicular to wire 2, so the force per unit length on either wire is $F/L = \\mu_0 I_1 I_2/(2\\pi d)$. For equal currents $I$ this is $\\mu_0 I^2/(2\\pi d)$. The units are $\\mathrm{N/m}$, and $\\mu_0/(2\\pi) = 2\\times10^{-7}\\ \\mathrm{N/A^2}$, so $1\\ \\mathrm{A}$ in each wire at $d = 1\\ \\mathrm{m}$ gives $2\\times10^{-7}\\ \\mathrm{N/m}$.</li><li>Currents in the same direction attract; currents in opposite directions repel. Check: put wire 1 along $\\hat{\\mathbf{z}}$ with the field $\\mathbf{B} = (\\mu_0 I_1/2\\pi d)\\,\\hat{\\boldsymbol{\\phi}}$ at wire 2. Then $\\hat{\\mathbf{z}}\\times\\hat{\\boldsymbol{\\phi}} = -\\hat{\\mathbf{r}}$, so the force on wire 2 points toward wire 1. Reversing $I_2$ reverses the force. The two wires push or pull on each other with equal magnitude and opposite direction.</li></ul>",
    note: "Supplemental — not a numbered CPG equation. The sign comes from the cross product $I\\mathbf{L}\\times\\mathbf{B}$, so attract versus repel is decided by whether the two currents are parallel or antiparallel."
  },
  {
    id: "supp-lorentz-fields",
    kind: "list",
    eq: "supp",
    topic: "em",
    tag: "Field transformations",
    name: "Lorentz transformation of the fields (supplemental list)",
    front: "With $\\mathbf{v}$ the velocity of the primed frame relative to the unprimed frame, state the parallel and perpendicular transformations of $\\mathbf{E}$ and $\\mathbf{B}$, and the two field invariants. (4)",
    back: "<ul class=\"recall-list\"><li>$\\mathbf{v}$ is the velocity of the primed frame relative to the unprimed frame, and $\\gamma = 1/\\sqrt{1-v^2/c^2}$. Parallel pieces are unchanged: $\\mathbf{E}'_{\\parallel} = \\mathbf{E}_{\\parallel}$ and $\\mathbf{B}'_{\\parallel} = \\mathbf{B}_{\\parallel}$.</li><li>$\\mathbf{E}'_{\\perp} = \\gamma(\\mathbf{E}+\\mathbf{v}\\times\\mathbf{B})_{\\perp}$.</li><li>$\\mathbf{B}'_{\\perp} = \\gamma\\left(\\mathbf{B}-\\mathbf{v}\\times\\mathbf{E}/c^2\\right)_{\\perp}$.</li><li>Invariants: $\\mathbf{E}\\cdot\\mathbf{B}$ and $E^2-c^2 B^2$. Keep $\\gamma$ in the formulas; do not replace it by $1$.</li></ul>",
    note: "Supplemental — not a numbered CPG equation. This is not the reflection rule on supp-ac-reflection."
  },
  {
    id: "supp-max-power-match",
    kind: "list",
    eq: "supp",
    topic: "em",
    tag: "Maximum power",
    name: "Load match for maximum average power (supplemental list)",
    front: "For a fixed linear source and a passive load, state the complex match for maximum average power, the resistive special case, and why the reactances must cancel. (3)",
    back: "<ul class=\"recall-list\"><li>Maximum average power when $Z_L = Z_g^*$. This is not the reflectionless choice $Z_L = Z_0$.</li><li>If $R_g > 0$ and the loop reactance is zero, $R_L = R_g$. If only $R_L$ can vary, the best value is $\\sqrt{R_g^2+(X_g+X_L)^2}$; when $X_L = 0$ that is $|Z_g|$, which is not $R_g$ unless $X_g = 0$.</li><li>Reactances add in series, so the load reactance cancels the source reactance: $X_L = -X_g$. With $R_L$ held fixed, that zeroes the loop reactance and maximises $|I|$, and therefore maximises $P = I_{\\mathrm{rms}}^2 R_L$. $X_L = 0$ is the trap: a purely resistive load, not a purely resistive loop.</li></ul>",
    note: "Supplemental — not a numbered CPG equation. $Z_L = Z_0$ is the condition on supp-ac-reflection."
  },
  {
    id: "supp-optical-magnification",
    kind: "list",
    eq: "supp",
    topic: "ow",
    tag: "Geometrical optics",
    name: "Transverse magnification and the astronomical telescope (supplemental list)",
    front: "State the transverse magnification and what its sign means, and state the lens separation and angular-magnification magnitude of an astronomical telescope. (2)",
    back: "<ul class=\"recall-list\"><li>Transverse magnification $M = -s'/s$. In this sign convention, $M \\lt 0$ means the image is inverted.</li><li>Astronomical telescope: two thin converging lenses, object and final image at infinity. Separation $f_o+f_e$, angular-magnification magnitude $|M_\\theta| = f_o/f_e$, and the image is inverted. Do not use that separation for a Galilean telescope.</li></ul>",
    note: "Supplemental — not a numbered CPG equation. The sign convention is the one on cpgf-3.26 through cpgf-3.30."
  },
  {
    id: "supp-acoustic-modes",
    kind: "list",
    eq: "supp",
    topic: "ow",
    tag: "Standing waves",
    name: "String and pipe harmonics (supplemental list)",
    front: "Neglecting end correction, state the fixed-string and open-open frequencies, the closed-open frequencies, how displacement nodes differ from pressure nodes, and which sequence a closed-closed pipe matches. (4)",
    back: "<ul class=\"recall-list\"><li>Fixed string, or an open-open pipe: $f_n = nv/(2L)$ for $n = 1,2,3,\\ldots$.</li><li>Closed-open pipe: $f_n = (2n-1)v/(4L)$, odd harmonics only.</li><li>A displacement node is not a pressure node.</li><li>A closed-closed pipe has the same frequency sequence as an open-open pipe.</li></ul>",
    note: "Supplemental — not a numbered CPG equation. cpgl-3.02 states the fundamental lengths $2L$ and $4L$ only."
  },
  {
    id: "supp-beats",
    eq: "supp",
    topic: "ow",
    tag: "Beats",
    name: "Beat frequency of loudness maxima (supplemental)",
    front: "Two close pure tones: at what rate do the loudness maxima arrive?",
    back: "$$f_{\\mathrm{beat}} = |f_1-f_2|$$\nLoudness maxima come at $|f_1-f_2|$, not at half of that difference.",
    note: "Supplemental — not a numbered CPG equation."
  },
  {
    id: "supp-michelson-double-pass",
    kind: "list",
    eq: "supp",
    topic: "ow",
    tag: "Interferometry",
    name: "Michelson fringe shifts for a moving mirror and a slab (supplemental list)",
    front: "State the Michelson fringe count when one mirror moves a distance $d$, and the fringe count when a slab is inserted in one arm. (2)",
    back: "<ul class=\"recall-list\"><li>One mirror moves a distance $d$: $N = 2d/\\lambda$.</li><li>A slab of thickness $L$ and index $n$ in one arm, double pass, normal incidence, surroundings of index $1$: $N = 2L(n-1)/\\lambda$. Do not put the mirror travel into this slab formula.</li></ul>",
    note: "Supplemental — not a numbered CPG equation."
  },
  {
    id: "supp-equipartition",
    kind: "list",
    eq: "supp",
    topic: "th",
    tag: "Kinetic theory",
    name: "Equipartition and the diatomic count (supplemental list)",
    front: "State the energy per classical quadratic term, the internal energy and heat capacity for $N$ molecules, the room-temperature three-dimensional diatomic count with frozen vibration, and why a two-dimensional gas is not that count. (4)",
    back: "<ul class=\"recall-list\"><li>Each active classical quadratic term contributes $\\tfrac{1}{2}k_B T$.</li><li>For $N$ molecules and a temperature-independent count $f$: $U = f N k_B T/2$, $C_V = f N k_B/2$, and the molar heat capacity is $f R/2$.</li><li>A room-temperature three-dimensional diatomic gas with frozen vibration has $f = 5$. A vibrating mode adds both a kinetic term and a potential term.</li><li>A two-dimensional gas is not $f = 5$. Do not use $f = 7$ as the diatomic default.</li></ul>",
    note: "Supplemental — not a numbered CPG equation. cpgf-4.38 is the monatomic gas only."
  },
  {
    id: "supp-lattice-heat-capacity",
    kind: "list",
    eq: "supp",
    topic: "th",
    tag: "Heat capacity",
    name: "Einstein and Debye lattice heat capacity (supplemental list)",
    front: "State the Einstein and Debye pictures, the high-temperature lattice limit, the Einstein low-temperature law, the three-dimensional Debye low-temperature law for $C_V$ and $U$, and a metal's total heat capacity. (5)",
    back: "<ul class=\"recall-list\"><li>Three vibrational coordinates per atom. Einstein: one frequency. Debye: an acoustic spectrum.</li><li>High temperature: the lattice heat capacity $C_V \\to 3Nk_B$.</li><li>Einstein model at low temperature: $C_V$ falls exponentially in $1/T$.</li><li>Three-dimensional Debye phonons with $T \\ll \\theta_D$: the lattice heat capacity $C_V \\propto T^3$, so the lattice energy $U \\propto T^4$.</li><li>A metal's total heat capacity is $\\gamma T+AT^3$. Do not print $C_V \\propto T^3$ unless the lattice piece is the piece being named.</li></ul>",
    note: "Supplemental — not a numbered CPG equation. The word Einstein on cpgf-5.29, cpgf-6.8, and cpgl-5.06 is not this model."
  },
  {
    id: "supp-van-der-waals",
    kind: "list",
    eq: "supp",
    topic: "th",
    tag: "Equations of state",
    name: "Van der Waals equation and the critical point (supplemental list)",
    front: "State the one-mole van der Waals equation and the two derivative conditions that define the critical point. (2)",
    back: "<ul class=\"recall-list\"><li>One mole: $\\left(P+\\dfrac{a}{V_m^2}\\right)(V_m-b) = RT$, with $V_m \\gt b$ and positive $a$ and $b$.</li><li>The critical point is defined by $\\left(\\dfrac{\\partial P}{\\partial V}\\right)_T = \\left(\\dfrac{\\partial^2 P}{\\partial V^2}\\right)_T = 0$.</li></ul>",
    note: "Supplemental — not a numbered CPG equation. Optional closed forms, same molar constants, not required recall: $V_{m,c} = 3b$, $T_c = 8a/(27Rb)$, $P_c = a/(27b^2)$."
  },
  {
    id: "supp-fourier-conduction",
    eq: "supp",
    topic: "th",
    tag: "Heat conduction",
    name: "Fourier conduction law (supplemental)",
    front: "How is the signed heat current related to the temperature gradient along a uniform section?",
    back: "$$\\dot{Q} = -\\kappa A\\,\\frac{dT}{dx}$$\nThis is the signed flux through an oriented uniform section. Heat absorbed by a body is the opposite of the outward flux. $\\kappa$ may depend on temperature.",
    note: "Supplemental — not a numbered CPG equation."
  },
  {
    id: "supp-heat-pump-cop",
    kind: "list",
    eq: "supp",
    topic: "th",
    tag: "Heat engines",
    name: "Refrigerator and heat-pump coefficients (supplemental list)",
    front: "State the coefficient of performance of any refrigerator and of any heat pump, and both Carnot temperature ratios. (4)",
    back: "<ul class=\"recall-list\"><li>Heat and work are positive quantities per cycle. Any refrigerator: $Q_c/W$.</li><li>Any heat pump: $Q_h/W$.</li><li>Carnot, absolute temperature, reversible between those two reservoirs: $Q_c/W = T_c/(T_h-T_c)$.</li><li>The Carnot heat pump is that result plus one: $Q_h/W = T_h/(T_h-T_c)$.</li></ul>",
    note: "Supplemental — not a numbered CPG equation. Engine efficiency $1-T_c/T_h$ stays on cpgf-4.37."
  },
  {
    id: "supp-qm-probability-current",
    eq: "supp",
    topic: "qm",
    tag: "Probability current",
    name: "One-dimensional probability current (supplemental)",
    front: "For one dimension, a real scalar potential, and no vector potential, what is the probability current $j$?",
    back: "$$j = \\frac{\\hbar}{m}\\,\\operatorname{Im}\\!\\left(\\psi^*\\frac{d\\psi}{dx}\\right)$$\nA magnetic vector potential adds a term. This form is not that case.",
    note: "Supplemental — not a numbered CPG equation."
  },
  {
    id: "supp-step-barrier",
    kind: "list",
    eq: "supp",
    topic: "qm",
    tag: "Potential step",
    name: "Step reflection, transmission, and barrier decay (supplemental list)",
    front: "For equal mass, state $R$ and $T$ when $E$ is above both levels, the decay constant when $E$ is below a level, and the transmitted flux of an infinite step versus a finite barrier. (3)",
    back: "<ul class=\"recall-list\"><li>Same mass, $E$ above both levels, $k = \\sqrt{2m(E-V)}/\\hbar$: $$R = \\left[\\frac{k_L-k_R}{k_L+k_R}\\right]^2, \\qquad T = \\frac{4k_L k_R}{(k_L+k_R)^2} = \\frac{k_R}{k_L}\\left|\\frac{C}{A}\\right|^2,$$ and $R+T = 1$.</li><li>For $E \\lt V$, $\\kappa = \\sqrt{2m(V-E)}/\\hbar$. A barrier that extends toward $+\\infty$ decays as $e^{-\\kappa x}$.</li><li>An infinite step whose transmitted region is forbidden has zero transmitted flux. A finite barrier may transmit.</li></ul>",
    note: "Supplemental — not a numbered CPG equation. cpgl-5.07 is the equal-speed factor $|C/A|^2$ only."
  },
  {
    id: "supp-adiabatic-condition",
    kind: "list",
    eq: "supp",
    topic: "qm",
    tag: "Adiabatic theorem",
    name: "Adiabatic change of an energy eigenstate (supplemental list)",
    front: "State what a slow expansion does to the quantum number and the energy of an infinite well, the general nondegenerate adiabatic condition, and the assumptions that condition needs. (3)",
    back: "<ul class=\"recall-list\"><li>A slow expansion of an infinite well keeps $n$ the same. $E_n \\propto 1/L^2$ still changes, because $L$ changes.</li><li>Nondegenerate condition, for every $m \\ne n$: $$\\hbar\\left|\\left\\langle m\\middle|\\frac{\\partial H}{\\partial t}\\middle|n\\right\\rangle\\right| \\ll (E_n-E_m)^2.$$</li><li>The change has to be smooth, the initial state an isolated eigenstate, and every gap nonzero. There is no universal guarantee for a resonant drive or for an arbitrarily long drive.</li></ul>",
    note: "Supplemental — not a numbered CPG equation. The comparison is an energy squared on the right and $\\hbar$ times a matrix element on the left."
  },
  {
    id: "supp-dipole-selection-extra",
    kind: "list",
    eq: "supp",
    topic: "at",
    tag: "Selection rules",
    name: "Extra electric-dipole rules in LS coupling (supplemental list)",
    front: "In addition to the one-electron orbital and magnetic rules already on cpgl-5.17, state the electric-dipole parity, $\\Delta S$, $\\Delta L$, and $\\Delta J$ rules in LS coupling. (4)",
    back: "<ul class=\"recall-list\"><li>Electric dipole, LS coupling: the initial and final states have opposite parity.</li><li>$\\Delta S = 0$.</li><li>$\\Delta L = 0,\\pm 1$, excluding $0 \\leftrightarrow 0$. Uppercase $L$ is the total orbital angular momentum.</li><li>$\\Delta J = 0,\\pm 1$, excluding $0 \\leftrightarrow 0$.</li></ul>",
    note: "Supplemental — not a numbered CPG equation. Do not treat $\\Delta l$ and $\\Delta m$ as missing: they are the one-electron rules on cpgl-5.17."
  },
  {
    id: "supp-term-hund",
    kind: "list",
    eq: "supp",
    topic: "at",
    tag: "Atomic terms",
    name: "Term symbols and Hund's ground-term rules (supplemental list)",
    front: "State the term symbol and the letter code for $L$, the ground-term order for equivalent electrons, both $J$ rules, the half-filled case, and what closed shells contribute. (5)",
    back: "<ul class=\"recall-list\"><li>A term is $^{2S+1}L_J$. The letters $S,P,D,F,G$ mean $L = 0,1,2,3,4$.</li><li>Ground term of equivalent electrons when the Coulomb interaction dominates spin-orbit: highest $S$, then highest $L$.</li><li>Then $J = |L-S|$ if the subshell is less than half filled, and $J = L+S$ if it is more than half filled.</li><li>Exactly half filled, the usual ground term has $L = 0$, so $J = S$.</li><li>Closed shells contribute nothing.</li></ul>",
    note: "Supplemental — not a numbered CPG equation."
  },
  {
    id: "supp-hydrogenic-z-scaling",
    kind: "list",
    eq: "supp",
    topic: "at",
    tag: "Hydrogenic atoms",
    name: "Hydrogenic energy and Bohr scale (supplemental list)",
    front: "State the two-charge Coulomb energy and Bohr scale, the ordinary hydrogenic $Z$ scaling including the $n$th orbit, and the $13.6\\,\\mathrm{eV}$ form that already contains $\\mu_H$. (3)",
    back: "<ul class=\"recall-list\"><li>Coulomb strength $g = |Q_1 Q_2|/(4\\pi\\epsilon_0)$. Then $E_n = -\\mu g^2/(2\\hbar^2 n^2)$, which is negative, and the Bohr scale is $a = \\hbar^2/(\\mu g)$.</li><li>Ordinary hydrogenic ions use $g = Ze^2/(4\\pi\\epsilon_0)$. The energy scales as $\\mu Z^2$, the Bohr radius as $1/(\\mu Z)$, and the radius of the $n$th orbit also as $n^2$.</li><li>The number $13.6\\,\\mathrm{eV}$ already includes the hydrogen reduced mass $\\mu_H$, so $E_n = -(\\mu/\\mu_H) Z^2 (13.6\\,\\mathrm{eV})/n^2$. There is no multi-electron bare-charge rule on this card.</li></ul>",
    note: "Supplemental — not a numbered CPG equation. Reduced mass without $Z$ is already on cpgf-5.43 through cpgf-5.47. The product form in $g$ is the one that survives when the orbiting charge changes."
  },
  {
    id: "supp-xray-edges",
    kind: "list",
    eq: "supp",
    topic: "at",
    tag: "Inner-shell spectra",
    name: "K-edge estimate, K line energy, and Duane-Hunt limit (supplemental list)",
    front: "State the rough K-binding estimate, the $K\\alpha$ photon estimate, why those two energies differ, the Duane-Hunt cutoff, and the approximate nanometer rounding. (4)",
    back: "<ul class=\"recall-list\"><li>Rough K-binding estimate: $B_K \\simeq (13.6\\,\\mathrm{eV})(Z-1)^2$. Do not reuse the screening $1$ for an L line.</li><li>$K\\alpha$ photon: $E_{K\\alpha} \\simeq \\tfrac{3}{4}(13.6\\,\\mathrm{eV})(Z-1)^2$. The edge and the line are not the same energy.</li><li>Duane-Hunt: $\\lambda_{\\min} = hc/(eV)$ when the whole electron kinetic energy $eV$ goes into one photon. Here $V$ is the accelerating voltage.</li><li>A recall rounding $\\lambda_{\\min}(\\mathrm{nm}) \\approx 1240/V$, with $V$ in volts, is acceptable only if it is labeled approximate.</li></ul>",
    note: "Supplemental — not a numbered CPG equation. Both screening formulas are rough estimates."
  },
  {
    id: "supp-rigid-rotor",
    kind: "list",
    eq: "supp",
    topic: "at",
    tag: "Molecular rotation",
    name: "Rigid rotor levels and pure-rotation selection (supplemental list)",
    front: "State the rigid-rotor energies and degeneracy, the diatomic moment, the electric-dipole pure-rotation rule, the line spacing, and why $\\mathrm{H}_2$ has levels but no ordinary pure-rotation spectrum. (4)",
    back: "<ul class=\"recall-list\"><li>$E_J = \\hbar^2 J(J+1)/(2I)$ for $J = 0,1,2,\\ldots$, with degeneracy $2J+1$. A diatomic has $I = \\mu r_e^2$.</li><li>Electric-dipole pure rotation needs a permanent dipole, and then $\\Delta J = \\pm 1$ only.</li><li>Adjacent lines are spaced by $2B$ with $B = \\hbar^2/(2I)$. The quantum for $J \\to J+1$ is $2B(J+1)$.</li><li>$\\mathrm{H}_2$ has these levels. It has no permanent dipole, so an ordinary pure-rotation electric-dipole spectrum does not occur. This card is not a Raman rule.</li></ul>",
    note: "Supplemental — not a numbered CPG equation."
  },
  {
    id: "supp-hall",
    eq: "supp",
    topic: "sp",
    tag: "Hall effect",
    name: "Single-carrier Hall field (supplemental)",
    front: "For one isotropic carrier, low field, and one band, how are the Hall field and the Hall coefficient defined?",
    back: "$$E_y = R_H J_x B_z, \\qquad R_H = \\frac{1}{nq}$$\nThe charge $q$ is signed, so electrons give $R_H \\lt 0$. This is not the two-carrier formula.",
    note: "Supplemental — not a numbered CPG equation. The coefficient $R_H = 1/(nq)$ is the single-carrier companion to a qualitative Hall measurement."
  },
  {
    id: "supp-band-mass",
    kind: "list",
    eq: "supp",
    topic: "sp",
    tag: "Band mass",
    name: "Effective mass and cyclotron frequency (supplemental list)",
    front: "State the one-band effective mass, what negative curvature means, the cyclotron-frequency magnitude, and what the three-dimensional mass is. (3)",
    back: "<ul class=\"recall-list\"><li>One dimension, one band: $1/m^* = (1/\\hbar^2)\\,d^2E/dk^2$. Negative curvature is a negative mass.</li><li>For a locally isotropic parabolic band, the cyclotron-frequency magnitude is $|q|B/|m^*|$.</li><li>In three dimensions the mass is a tensor. Do not copy a signed cyclotron radius onto this frequency.</li></ul>",
    note: "Supplemental — not a numbered CPG equation. cpgf-2.37 does not define $m^*$. The signed cyclotron radius on cpgf-2.36 is a different relation."
  },
  {
    id: "supp-scattering-rate",
    kind: "list",
    eq: "supp",
    topic: "sp",
    tag: "Cross section",
    name: "Rate from flux, number, and cross section (supplemental list)",
    front: "State the interaction rate and the differential rate for a steady beam on $N$ scatterers, and name the product that is the luminosity. (3)",
    back: "<ul class=\"recall-list\"><li>A steady beam of flux $\\Phi$ on $N$ scatterers: $R = \\Phi N\\sigma$. Luminosity is the name of the product $\\Phi N$.</li><li>The differential rate is $dR/d\\Omega = \\Phi N\\,d\\sigma/d\\Omega$.</li><li>A small detector also brings in solid angle and efficiency. Rutherford closest approach is a different relation.</li></ul>",
    note: "Supplemental — not a numbered CPG equation. Do not lead with an undefined script L. A geometric area called a cross section on cpgf-1.50, cpgf-2.46, or cpgf-2.79 is not this rate."
  },
  {
    id: "supp-nuclear-q",
    kind: "list",
    eq: "supp",
    topic: "sp",
    tag: "Nuclear reactions",
    name: "Binding, Q value, and the iron peak (supplemental list)",
    front: "State the nuclear binding energy, the reaction $Q$ inside one mass table, the atomic-mass $Q$ for $\\beta^-$ and $\\beta^+$, why $B/A$ peaks near iron and nickel, and the atomic-mass-unit conversion. (5)",
    back: "<ul class=\"recall-list\"><li>$B = [Z m_p+(A-Z)m_n-M_{\\mathrm{nucleus}}]c^2$.</li><li>$Q = (\\sum M_i-\\sum M_f)c^2$ inside one mass table. $Q$ is positive when the reaction releases kinetic energy.</li><li>With atomic masses, and electronic binding neglected: $\\beta^-$ has $Q = (M_P-M_D)c^2$, and $\\beta^+$ has $Q = (M_P-M_D-2m_e)c^2$. Saying only that every mass is atomic, or that every mass is nuclear, does not fix the $\\beta^+$ case.</li><li>$B/A$ is largest near iron and nickel. That is why heavy fission and light fusion release energy.</li><li>$1\\,\\mathrm{u}\\,c^2 \\simeq 931.5\\,\\mathrm{MeV}$.</li></ul>",
    note: "Supplemental — not a numbered CPG equation. Decay bookkeeping on the numbered decay cards, and the range on supp-nuclear-force-range, stay separate from this card."
  },
  {
    id: "supp-magnetons",
    kind: "list",
    eq: "supp",
    topic: "at",
    tag: "Magnetons",
    name: "Bohr and nuclear magnetons and the Landé factor (supplemental list)",
    front: "State both magnetons and their ratio, the weak-field Landé factor and the first-order shift, the $L = 0$, $S = 0$, and $J = 0$ limits, and what this card is not. (4)",
    back: "<ul class=\"recall-list\"><li>$\\mu_B = e\\hbar/(2m_e)$ and $\\mu_N = e\\hbar/(2m_p)$. The ratio $\\mu_B/\\mu_N$ equals $m_p/m_e$.</li><li>Weak field, LS coupling, electron $g \\approx 2$, and $J \\ne 0$: $$g_J = 1+\\frac{J(J+1)+S(S+1)-L(L+1)}{2J(J+1)}, \\qquad \\Delta E = \\mu_B g_J m_J B.$$</li><li>$L = 0$ gives $g_J = 2$. $S = 0$ gives $g_J = 1$. At $J = 0$ do not divide, and there is no first-order Zeeman shift.</li><li>This is not the Paschen-Back regime.</li></ul>",
    note: "Supplemental — not a numbered CPG equation. The two magneton definitions are the lines to recall. The exact $g_J$ is the companion formula for a qualitative Zeeman shift."
  },
  {
    id: "supp-fourier-series",
    kind: "list",
    eq: "supp",
    topic: "sp",
    tag: "Fourier series",
    name: "Fourier series on a full period (supplemental list)",
    front: "On $[-\\pi,\\pi]$, state the $a_0/2$ series, both coefficient integrals, what even and odd symmetry kill, and what the series does at a jump. (4)",
    back: "<ul class=\"recall-list\"><li>On $[-\\pi,\\pi]$, with that periodic extension, $$f(x) = \\frac{a_0}{2}+\\sum_{n=1}^{\\infty}\\left[a_n\\cos(nx)+b_n\\sin(nx)\\right].$$</li><li>$a_n = (1/\\pi)\\int_{-\\pi}^{\\pi} f(x)\\cos(nx)\\,dx$ for $n \\ge 0$, and $b_n = (1/\\pi)\\int_{-\\pi}^{\\pi} f(x)\\sin(nx)\\,dx$ for $n \\ge 1$.</li><li>Even $f$ kills every $b_n$. Odd $f$ kills every $a_n$.</li><li>At a jump the series equals the average of the two limits.</li></ul>",
    note: "Supplemental — not a numbered CPG equation. cpgl-5.06 is not this series."
  },
  {
    id: "supp-residues",
    kind: "list",
    eq: "supp",
    topic: "sp",
    tag: "Complex analysis",
    name: "Residue theorem and a simple pole (supplemental list)",
    front: "State the residue theorem for a counterclockwise contour, the simple-pole formula, and the two ways that formula fails. (3)",
    back: "<ul class=\"recall-list\"><li>Counterclockwise simple closed curve, isolated singularities inside, analytic elsewhere on and inside the curve: $\\oint f\\,dz = 2\\pi i\\sum\\mathrm{Res}$.</li><li>At a simple pole, the residue is $\\lim_{z\\to z_0}(z-z_0)f(z)$.</li><li>A clockwise curve flips the sign. The simple-pole limit is the wrong formula for a higher-order pole.</li></ul>",
    note: "Supplemental — not a numbered CPG equation."
  },
  {
    id: "supp-matrix-det-trace",
    kind: "list",
    eq: "supp",
    topic: "sp",
    tag: "Matrices",
    name: "Determinant, trace, and eigenvalues (supplemental list)",
    front: "For square matrices of one size, state the product rule for determinants, the trace identity, the characteristic equation, and the trace and determinant in terms of the eigenvalues. (5)",
    back: "<ul class=\"recall-list\"><li>$\\det(AB) = \\det A\\,\\det B$.</li><li>$\\operatorname{Tr}(AB) = \\operatorname{Tr}(BA)$ when both products are square. This is not an arbitrary reorder of three factors.</li><li>$\\det(A-\\lambda I) = 0$.</li><li>$\\operatorname{Tr} A = \\sum_i \\lambda_i$, with multiplicity counted.</li><li>$\\det A = \\prod_i \\lambda_i$, with multiplicity counted.</li></ul>",
    note: "Supplemental — not a numbered CPG equation. The statement that a Hermitian operator has real eigenvalues stays on the quantum cards. The word trace on cpgf-1.43 is not a matrix trace."
  },
  {
    id: "supp-binomial-counting",
    kind: "list",
    eq: "supp",
    topic: "lb",
    tag: "Counting",
    name: "Binomial mean and variance (supplemental list)",
    front: "For $N$ independent Bernoulli trials with one success probability $p$, state the mean of the number of successes and its variance. (2)",
    back: "<ul class=\"recall-list\"><li>$\\langle X\\rangle = Np$.</li><li>$\\mathrm{Var}\\,X = Np(1-p)$. Do not set the variance equal to the mean, and do not replace it by a Poisson $\\sigma \\approx \\sqrt{N}$.</li></ul>",
    note: "Supplemental — not a numbered CPG equation. The probability of $k$ successes is $\\binom{N}{k}p^k(1-p)^{N-k}$. Poisson counting is already on cpgf-7.6 and cpgl-7.04. The inverse-variance weighted mean is already on cpgf-7.4 and cpgf-7.5."
  },
  {
    id: "supp-thin-film",
    kind: "list",
    eq: "supp",
    topic: "ow",
    tag: "Thin films",
    name: "Normal-incidence thin-film reflection (supplemental list)",
    front: "At normal incidence, state the extra optical path, the reflection phase rule, the constructive condition for one phase flip, and the constructive condition for zero or two flips. (3)",
    back: "<ul class=\"recall-list\"><li>Film index $n$, thickness $t$, vacuum wavelength $\\lambda$: the extra optical path is $2nt$. A reflection from a higher-index medium contributes a phase $\\pi$. A reflection from a lower-index medium does not.</li><li>Net one flip: constructive reflection when $2nt = \\left(m+\\tfrac{1}{2}\\right)\\lambda$, with $m = 0,1,2,\\ldots$. A very thin soap film, $2nt \\to 0$, one phase flip, is dark in reflection, and that limit is $m = 0$ of $2nt = m\\lambda$.</li><li>Net zero flips or two flips: constructive reflection when $2nt = m\\lambda$. Printing $2nt = m\\lambda$ with no phase condition is wrong for an ordinary soap film.</li></ul>",
    note: "Supplemental — not a numbered CPG equation. The phase rule is the same one as cpgf-3.19 and cpgf-3.20. Oblique path $2nt\\cos\\theta$, with $\\theta$ inside the film, is not a second required recall. cpgf-3.12 through cpgf-3.14 give phase and path, not this $2nt$ condition."
  },
  {
    id: "supp-maxwell-speeds",
    kind: "list",
    eq: "supp",
    topic: "th",
    tag: "Maxwell distribution",
    name: "Most probable, mean, and rms speeds (supplemental list)",
    front: "For a three-dimensional classical ideal gas, state $v_{\\mathrm{mp}}$, $\\langle v\\rangle$, $v_{\\mathrm{rms}}$, their order, and the mean velocity vector. (4)",
    back: "<ul class=\"recall-list\"><li>$v_{\\mathrm{mp}} = \\sqrt{2k_B T/m}$.</li><li>$\\langle v\\rangle = \\sqrt{8k_B T/(\\pi m)}$.</li><li>$v_{\\mathrm{rms}} = \\sqrt{3k_B T/m}$, and $v_{\\mathrm{mp}} \\lt \\langle v\\rangle \\lt v_{\\mathrm{rms}}$.</li><li>$\\langle\\vec{v}\\rangle = 0$. That vector mean is not $\\langle v\\rangle$ and not $v_{\\mathrm{mp}}$.</li></ul>",
    note: "Supplemental — not a numbered CPG equation. The rms formula is also on cpgf-4.39, which states rms only."
  },
  {
    id: "supp-radiation-pressure",
    kind: "list",
    eq: "supp",
    topic: "em",
    tag: "Radiation pressure",
    name: "Radiation pressure at normal incidence (supplemental list)",
    front: "At normal incidence in vacuum, state the pressure on an absorber and the pressure on a perfect reflector. (2)",
    back: "<ul class=\"recall-list\"><li>An absorber receives pressure $I/c$. Momentum per unit time per unit area is that pressure.</li><li>A perfect reflector receives pressure $2I/c$, because the normal momentum reverses.</li></ul>",
    note: "Supplemental — not a numbered CPG equation. The Poynting relations on cpgf-2.63 through cpgf-2.65 do not state these pressures."
  },
  {
    id: "supp-grating-power",
    kind: "list",
    eq: "supp",
    topic: "ow",
    tag: "Diffraction grating",
    name: "Grating resolving power (supplemental list)",
    front: "State the definition $R = \\lambda/\\Delta\\lambda$ and the grating result $nN$, including what $n$ and $N$ are. (2)",
    back: "<ul class=\"recall-list\"><li>$R = \\lambda/\\Delta\\lambda$.</li><li>$R = nN$ for order $n$ and $N$ illuminated lines, from the Rayleigh criterion on the principal maxima. The order is sometimes written $m$. This is not the circular-aperture factor $1.22\\,\\lambda/D$.</li></ul>",
    note: "Supplemental — not a numbered CPG equation. The grating equation is cpgf-3.15. The factor $1.22\\,\\lambda/D$ is cpgf-3.21."
  },
  {
    id: "supp-mean-free-path",
    kind: "list",
    eq: "supp",
    topic: "th",
    tag: "Mean free path",
    name: "Hard-sphere mean free path (supplemental list)",
    front: "State the equilibrium hard-sphere mean free path, the relation of $\\tau$ to that path, and when the factor $\\sqrt{2}$ is absent. (3)",
    back: "<ul class=\"recall-list\"><li>Equilibrium gas of identical hard spheres, diameter $d$, number density $n$: $\\lambda = 1/(\\sqrt{2}\\,\\pi d^2 n)$. With $\\sigma = \\pi d^2$, the same law is $\\ell = 1/(\\sqrt{2}\\,n\\sigma)$. The factor $\\sqrt{2}$ is the relative-speed factor for a gas in equilibrium.</li><li>$\\tau = \\lambda/\\langle v\\rangle$.</li><li>A beam on fixed targets has no factor $\\sqrt{2}$.</li></ul>",
    note: "Supplemental — not a numbered CPG equation."
  },
  {
    id: "cpgl-1.02",
    kind: "list",
    topic: "cm",
    tag: "Classification of Orbits",
    name: "Orbit classification by total energy (list)",
    front: "For an attractive potential $U(r) = k/r$ ($k \\lt 0$), how does total energy $E$ classify the orbit shape? (4)",
    back: "<ul class=\"recall-list\"><li>$E \\gt 0$: hyperbolic orbit.</li><li>$E = 0$: parabolic orbit.</li><li>$E \\lt 0$: elliptical orbit. It is bound, since $U(r)$ falls off at large $r$; for an attractive $1/r$ potential ($k \\lt 0$) the shape happens to be elliptical.</li><li>$E = V_{\\min}$: circular orbit, the special case of lowest possible energy, where $V_{\\min}$ is the minimum of the effective potential.</li></ul>",
    note: "Kahn §1.6.2. These shapes require an attractive potential $U(r) = k/r$ with $k \\lt 0$ (such as Newtonian gravity $k = -GMm$). If $k \\gt 0$, the potential is repulsive and only hyperbolic scattering orbits occur; no bound states exist."
  },
  {
    id: "supp-relativistic-velocity-addition",
    eq: "supp",
    topic: "sr",
    tag: "Velocity addition",
    name: "Relativistic velocity addition in one dimension (supplemental)",
    front: "For frame $S'$ moving at velocity $v$ along the $x$-axis relative to $S$, how does a particle's longitudinal velocity $u_x'$ in $S'$ transform to its velocity $u_x$ in $S$?",
    back: "$$u_x = \\frac{u_x' + v}{1 + \\frac{u_x' v}{c^2}}$$\nInverse transformation (from $S$ to $S'$, exchange frames: replace $v$ with $-v$ and swap $u_x$ with $u_x'$):\n$$u_x' = \\frac{u_x - v}{1 - \\frac{u_x v}{c^2}}$$\n\n**Limits & Invariants**\n<ul class=\"recall-list\"><li>If $u_x' = c$, then $u_x = \\frac{c+v}{1+v/c} = c$, ensuring light speed invariance in all inertial frames.</li><li>For low speeds $u_x', v \\ll c$, the denominator approaches $1$, reducing to the Galilean addition law $u_x \\approx u_x' + v$.</li></ul>",
    note: "Supplemental — not a numbered CPG equation."
  },
  {
    id: "supp-relativistic-doppler",
    eq: "supp",
    topic: "sr",
    tag: "Doppler effect",
    name: "Relativistic longitudinal Doppler effect (supplemental)",
    front: "What observed frequency $f$ is detected when a light source emitting proper frequency $f_0$ moves directly toward or away from an observer at speed $v$ (with $\\beta = v/c$)?",
    back: "$$f = f_0\\sqrt{\\frac{1+\\beta}{1-\\beta}} = f_0\\sqrt{\\frac{c+v}{c-v}}$$\nApproaching source (blueshift).\n\n<ul class=\"recall-list\"><li>**Receding source (redshift)**: $$f = f_0\\sqrt{\\frac{1-\\beta}{1+\\beta}} = f_0\\sqrt{\\frac{c-v}{c+v}}$$</li><li>For $\\beta \\ll 1$, Taylor expansion gives $f \\approx f_0(1 \\pm \\beta)$, matching the classical first-order Doppler shift $\\Delta f/f_0 \\approx \\pm v/c$.</li><li>Unlike sound waves, no medium exists: only the relative speed $v$ between source and observer matters.</li></ul>",
    note: "Supplemental — not a numbered CPG equation."
  },
  {
    id: "supp-brewster-angle",
    eq: "supp",
    topic: "ow",
    tag: "Polarization",
    name: "Brewster's polarizing angle (supplemental)",
    front: "What is Brewster's angle $\\theta_B$ for light incident from a medium of index $n_1$ onto a medium of index $n_2$, and what are the polarization and angular properties of the reflected beam?",
    back: "$$\\tan\\theta_B = \\frac{n_2}{n_1}$$\n\n**Key Properties**\n<ul class=\"recall-list\"><li>**Reflected beam**: Completely polarized with electric field perpendicular to the plane of incidence ($s$-polarized / parallel to the interface). The parallel component ($p$-polarization) is completely transmitted with zero reflection ($R_p = 0$).</li><li>**Ray geometry**: The reflected ray and refracted ray are mutually perpendicular:\n$$\\theta_B + \\theta_t = 90^\\circ$$\nFrom Snell's law: $n_1\\sin\\theta_B = n_2\\sin\\theta_t = n_2\\sin(90^\\circ - \\theta_B) = n_2\\cos\\theta_B \\implies \\tan\\theta_B = n_2/n_1$.</li></ul>",
    note: "Supplemental — not a numbered CPG equation."
  },
  {
    id: "supp-radiation-field",
    kind: "list",
    eq: "supp",
    topic: "em",
    tag: "Radiation field",
    name: "Nonrelativistic radiation-field direction (supplemental list)",
    front: "For the nonrelativistic radiation field of a point charge with $q > 0$, give the direction of $\\mathbf{E}_{\\mathrm{rad}}$, the line it lies on, and the angular factors in $|\\mathbf{E}_{\\mathrm{rad}}|$ and in the power per solid angle. (4)",
    back: "<ul class=\"recall-list\"><li>Radiation zone ($v \\ll c$): $\\mathbf{E}_{\\mathrm{rad}}$ is parallel to $\\hat{\\mathbf{r}}\\times(\\hat{\\mathbf{r}}\\times\\mathbf{a})/R = -\\mathbf{a}_{\\perp}/R$, where $\\hat{\\mathbf{r}}$ points from the charge to the field point and $R$ is that distance. For $q > 0$, $\\mathbf{E}_{\\mathrm{rad}}$ points opposite the sideways acceleration $\\mathbf{a}_{\\perp}$ (the part of $\\mathbf{a}$ perpendicular to $\\hat{\\mathbf{r}}$); a negative charge reverses it.</li><li>$\\mathbf{E}_{\\mathrm{rad}}$ lies in the plane of the line of sight $\\hat{\\mathbf{r}}$ and the acceleration $\\mathbf{a}$. For a charge accelerating along a wire on the $x$-axis, seen from the $xy$-plane, that plane is the $xy$-plane, so the $z$ component is $0$.</li><li>$\\mathbf{E}_{\\mathrm{rad}}$ is perpendicular to the line of sight $\\hat{\\mathbf{r}}$. When $\\mathbf{E}_{\\mathrm{rad}} \\ne 0$, this and the plane fix the line of $\\mathbf{E}_{\\mathrm{rad}}$, but leave both directions along that line open. The triple product gives the direction.</li><li>$|\\mathbf{E}_{\\mathrm{rad}}| \\propto \\sin\\theta$ and the power per solid angle $\\propto \\sin^2\\theta$, where $\\theta$ is the angle from $\\mathbf{a}$. Both are zero both ways along the acceleration axis ($\\theta = 0$ and $\\theta = 180^\\circ$), and both are largest at $\\theta = 90^\\circ$.</li></ul>",
    note: "Supplemental — not a numbered CPG equation. These statements are for the radiation field at $v \\ll c$. They are not the velocity field, and $\\sin^2\\theta$ is not the total radiated power."
  },
  {
    id: "supp-hamilton-principle",
    eq: "supp",
    topic: "cm",
    tag: "Lagrangian",
    name: "Hamilton's principle and the action (supplemental)",
    front: "What is Hamilton's principle for the motion of a system between two fixed times $t_1$ and $t_2$, expressed in terms of the action $S$?",
    back: "The actual path followed by a system between fixed endpoints makes the action $S$ stationary ($\\delta S = 0$):\n$$S = \\int_{t_1}^{t_2} L\\,dt$$\nwhere $L = T - U$ is the Lagrangian ($T$ is kinetic energy and $U$ is potential energy), and the integration variable is time $dt$.",
    note: "Supplemental — not a numbered CPG equation. Two key checks eliminate common GRE traps: the Lagrangian sign is $T - U$ (never $T + U$), and the action integral is over time $dt$ (never spatial coordinate $dx$)."
  }
];
