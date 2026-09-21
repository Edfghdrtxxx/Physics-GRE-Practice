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
    front: "For a coaxial cable (inner radius a, outer radius b) carrying current I with line charge lambda, what are E and B in the annulus, and the per-length capacitance, inductance, and characteristic impedance?",
    back: "$$a < r < b:\\quad E_r = \\frac{\\lambda}{2\\pi\\epsilon r},\\quad B_\\phi = \\frac{\\mu I}{2\\pi r}$$\nOutside ($r > b$) both vanish (return current and opposite charge on the shield). Per unit length:\n$$\\frac{C}{\\ell} = \\frac{2\\pi\\epsilon}{\\ln(b/a)},\\quad \\frac{L}{\\ell} = \\frac{\\mu}{2\\pi}\\ln\\frac{b}{a},\\quad Z_0 = \\sqrt{\\frac{L}{C}} = \\frac{1}{2\\pi}\\sqrt{\\frac{\\mu}{\\epsilon}}\\ln\\frac{b}{a}$$",
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
  }
];
