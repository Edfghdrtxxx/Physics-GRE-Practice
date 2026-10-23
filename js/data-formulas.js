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
    id: "supp-coaxial",
    eq: "supp",
    topic: "em",
    tag: "Coaxial cable",
    name: "Coaxial cable capacitance and inductance per length (supplemental)",
    front: "A long coaxial cable has inner radius $a$ and outer radius $b$, with a filling of permittivity $\\epsilon$ and permeability $\\mu$. What are its capacitance and inductance per unit length?",
    back: "$$\\frac{C}{\\ell} = \\frac{2\\pi\\epsilon}{\\ln(b/a)}, \\qquad \\frac{L}{\\ell} = \\frac{\\mu}{2\\pi}\\ln\\frac{b}{a}$$<p class=\"card-key\"><strong>The radii enter only through $\\ln(b/a)$.</strong></p><ul class=\"recall-list\"><li><strong>Fields:</strong> between the conductors $E = \\lambda/(2\\pi\\epsilon r)$ and $B = \\mu I/(2\\pi r)$. Both vanish outside.</li><li><strong>Capacitance:</strong> integrating $E$ from $a$ to $b$ gives $V = (\\lambda/2\\pi\\epsilon)\\ln(b/a)$, and $C/\\ell = \\lambda/V$.</li></ul>",
    note: "Supplemental. Kahn §2.8, Electrostatics solution 2, p.59."
  },
  {
    id: "supp-pec-reflect",
    eq: "supp",
    topic: "em",
    tag: "EM waves",
    name: "Normal reflection from a perfect conductor (supplemental)",
    front: "A plane EM wave hits a perfect conductor at normal incidence. What are the fields inside, and how do the reflected $\\mathbf{E}$ and $\\mathbf{B}$ compare with the incident ones at the surface?",
    back: "$$\\mathbf{E}_{\\text{refl}} = -\\mathbf{E}_{\\text{inc}}, \\qquad \\mathbf{B}_{\\text{refl}} = +\\mathbf{B}_{\\text{inc}} \\quad \\text{(at the surface)}$$<p class=\"card-key\"><strong>At the wall the total $\\mathbf{E}$ vanishes and $\\mathbf{B}$ doubles.</strong></p><ul class=\"recall-list\"><li><strong>Inside:</strong> $\\mathbf{E} = \\mathbf{B} = 0$, so nothing is transmitted.</li><li><strong>Reflected $\\mathbf{E}$:</strong> tangential $\\mathbf{E}$ must vanish at the surface, so $\\mathbf{E}$ flips.</li><li><strong>Reflected $\\mathbf{B}$:</strong> $\\hat{\\mathbf{k}}$ also flips, so $\\mathbf{B} = \\hat{\\mathbf{k}}\\times\\mathbf{E}/c$ keeps its direction.</li></ul>",
    note: "Supplemental. Kahn §2.6.1, p.54."
  },
  {
    id: "supp-em-triad",
    eq: "supp",
    topic: "em",
    tag: "EM waves",
    name: "Plane-wave direction and its magnetic field (supplemental)",
    front: "A vacuum plane wave has $\\mathbf{E} = E_0\\cos(kx - \\omega t)\\,\\hat{\\mathbf{y}}$. Which way does it travel, and what is its magnetic field $\\mathbf{B}$?",
    back: "$$\\mathbf{B} = \\frac{1}{c}\\hat{\\mathbf{k}}\\times\\mathbf{E} = \\frac{E_0}{c}\\cos(kx - \\omega t)\\,\\hat{\\mathbf{z}}$$<p class=\"card-key\"><strong>$\\mathbf{E}$, $\\mathbf{B}$, $\\hat{\\mathbf{k}}$ form a right-handed set: $\\mathbf{E}\\times\\mathbf{B}$ points along $\\hat{\\mathbf{k}}$.</strong></p><ul class=\"recall-list\"><li><strong>Direction of travel:</strong> the phase $kx - \\omega t$ moves toward $+x$; $kx + \\omega t$ would move toward $-x$.</li><li><strong>Reflected wave:</strong> rebuild $\\mathbf{B}$ from the new $\\hat{\\mathbf{k}}$.</li></ul>",
    note: "Supplemental. Kahn (2.61)–(2.62), §2.6.1, p.55."
  },
  {
    id: "supp-moment-of-inertia",
    eq: "supp",
    topic: "cm",
    tag: "Moment of inertia",
    name: "Moments of inertia — standard geometries (supplemental)",
    front: "Moments of inertia about the central symmetry axis: rank the hoop, spherical shell, solid disk and solid sphere (same $M$ and $R$), and give the thin rod about its centre and about one end.",
    back: "$$\\frac{I}{MR^2}:\\quad \\text{hoop } 1 \\gt \\text{shell } \\tfrac{2}{3} \\gt \\text{disk } \\tfrac{1}{2} \\gt \\text{sphere } \\tfrac{2}{5}$$All about the symmetry axis through the center of mass unless noted:<br><table class=\"moi-inertia-table\"><thead><tr><th>Geometry</th><th>Axis</th><th>Moment of Inertia $I$</th></tr></thead><tbody><tr class=\"moi-group-hoop-disk\"><td><strong>Thin hoop / ring</strong> (or point mass, radius $R$)</td><td>Central symmetry axis</td><td>$I = MR^2$</td></tr><tr class=\"moi-group-hoop-disk\"><td><strong>Solid disk / cylinder</strong> (radius $R$)</td><td>Central symmetry axis</td><td>$I = \\frac{1}{2}MR^2$</td></tr><tr class=\"moi-group-shell-sphere\"><td><strong>Thin spherical shell</strong> (radius $R$)</td><td>Any diameter (through CM)</td><td>$I = \\frac{2}{3}MR^2$</td></tr><tr class=\"moi-group-shell-sphere\"><td><strong>Solid sphere</strong> (radius $R$)</td><td>Any diameter (through CM)</td><td>$I = \\frac{2}{5}MR^2$</td></tr><tr class=\"moi-group-rod\"><td><strong>Thin rod through center</strong> (length $L$)</td><td>Axis $\\perp$ rod through center</td><td>$I = \\frac{1}{12}ML^2$</td></tr><tr class=\"moi-group-rod\"><td><strong>Thin rod through end</strong> (length $L$)</td><td>Axis $\\perp$ rod through one end</td><td>$I = \\frac{1}{3}ML^2$</td></tr></tbody></table>",
    note: "Supplemental. More mass far from the axis means larger $I$. Rod about an end follows from the parallel-axis theorem: $\\tfrac{1}{12}ML^2 + M(L/2)^2$."
  },
  {
    id: "supp-nuclear-force-range",
    eq: "supp",
    topic: "sp",
    tag: "Nuclear physics",
    name: "Characteristic range of the nuclear force (supplemental)",
    front: "What is the characteristic range of the strong nuclear force, beyond which Coulomb repulsion between two protons wins?",
    back: "$$r \\sim 1\\ \\mathrm{fm} = 10^{-15}\\ \\mathrm{m}$$ Pion exchange makes the nuclear attraction die off exponentially beyond about $1\\ \\mathrm{fm}$. Scale anchors: atoms $\\sim 10^{-10}\\ \\mathrm{m}$, nuclei $\\sim 10^{-15}\\ \\mathrm{m}$.",
    note: "Supplemental — Kahn Ch. 8, solution to problem 10. Useful companion: $\\hbar c \\approx 200\\ \\mathrm{MeV\\cdot fm}$."
  },
  {
    id: "supp-coulomb-coupling",
    eq: "supp",
    topic: "em",
    tag: "Electrostatics",
    name: "Coulomb coupling in natural fm·MeV units (supplemental)",
    front: "What is $e^2/(4\\pi\\epsilon_0)$ in $\\mathrm{MeV\\cdot fm}$ and in $\\mathrm{eV\\cdot nm}$, and how does it follow from $\\alpha$ and $\\hbar c$?",
    back: "$$\\frac{e^2}{4\\pi\\epsilon_0} = \\alpha\\hbar c \\approx \\frac{197\\ \\mathrm{MeV\\cdot fm}}{137} \\approx 1.44\\ \\mathrm{MeV\\cdot fm} = 1.44\\ \\mathrm{eV\\cdot nm}$$<p class=\"card-key\"><strong>Two elementary charges a distance $r$ apart have $U \\approx 1.44\\ \\mathrm{MeV\\cdot fm}/r$.</strong></p><ul class=\"recall-list\"><li><strong>Nuclear scale:</strong> two protons $1\\ \\mathrm{fm}$ apart, about $1.4\\ \\mathrm{MeV}$.</li><li><strong>Atomic scale:</strong> an electron and a proton $0.1\\ \\mathrm{nm}$ apart, about $14\\ \\mathrm{eV}$.</li></ul>",
    note: "Supplemental. Uses $\\alpha \\approx 1/137$ and $\\hbar c \\approx 197\\ \\mathrm{MeV\\cdot fm}$."
  },
  {
    id: "supp-energy-phase",
    eq: "supp",
    topic: "qm",
    tag: "Schrödinger equation",
    name: "Energy-eigenstate time phase (supplemental)",
    front: "For a time-independent Hamiltonian, how does an energy eigenstate of energy $E_n$ evolve in time, and at what angular frequency do observables oscillate in a superposition of two levels $E_1$ and $E_2$?",
    back: "$$\\psi_n(t) = \\psi_n\\,e^{-iE_nt/\\hbar}$$ Only the phase changes, so each $P(E_n) = |c_n|^2$ stays constant. In a two-level superposition the relative phase turns at $\\omega = (E_2 - E_1)/\\hbar$, so quantities such as $\\langle x\\rangle$ oscillate at that frequency.",
    note: "Supplemental — not a numbered CPG equation. The sign comes from $i\\hbar\\,\\partial_t\\Psi = \\hat{H}\\Psi$: with $\\hat{H}\\psi = E\\psi$, the time factor $f(t)$ obeys $i\\hbar\\,f' = Ef$. This factor has modulus $1$ and changes no probability, unlike the real Boltzmann weight $e^{-E/k_B T}$."
  },
  {
    id: "supp-sho-ladder",
    eq: "supp",
    topic: "qm",
    tag: "Harmonic oscillator",
    name: "Harmonic-oscillator ladder operators (supplemental)",
    front: "Write the oscillator ladder operators $a$ and $a^{\\dagger}$ in terms of $\\hat{x}$ and $\\hat{p}$, and $\\hat{x}$ and $\\hat{p}$ in terms of $a$ and $a^{\\dagger}$.",
    back: "$$a = \\sqrt{\\frac{m\\omega}{2\\hbar}}\\left(\\hat{x} + \\frac{i\\hat{p}}{m\\omega}\\right), \\qquad a^{\\dagger} = \\sqrt{\\frac{m\\omega}{2\\hbar}}\\left(\\hat{x} - \\frac{i\\hat{p}}{m\\omega}\\right)$$ $\\hat{x} = \\sqrt{\\frac{\\hbar}{2m\\omega}}\\,(a + a^{\\dagger})$ and $\\hat{p} = i\\sqrt{\\frac{\\hbar m\\omega}{2}}\\,(a^{\\dagger} - a)$. Since $\\hat{x}$ only links $n$ to $n \\pm 1$, $\\langle n|\\hat{x}|n\\rangle = 0$.",
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
    back: "$$2\\langle T\\rangle = k\\langle V\\rangle$$<p class=\"card-key\"><strong>Coulomb or gravity, $k = -1$: $\\langle T\\rangle = -E$, $\\langle V\\rangle = 2E$.</strong></p><ul class=\"recall-list\"><li><strong>Energy split:</strong> with $E = \\langle T\\rangle + \\langle V\\rangle$, $$\\langle T\\rangle = \\frac{k}{k+2}E, \\qquad \\langle V\\rangle = \\frac{2}{k+2}E$$</li><li><strong>Oscillator, $k = 2$:</strong> half and half.</li><li><strong>One dimension:</strong> the same rule holds for $V \\propto x^k$.</li><li><strong>Trap:</strong> these are expectation values in a stationary state, or a long time average, not an operator identity.</li></ul>",
    note: "Supplemental — not a numbered CPG equation."
  },
  {
    id: "supp-infinite-well",
    eq: "supp",
    topic: "qm",
    tag: "Particle in a box",
    name: "Infinite square well on 0 to L (supplemental)",
    front: "Infinite square well with zero potential for $0 \\lt x \\lt L$: what are $E_n$ and $\\psi_n$, how many interior nodes does $\\psi_n$ have, and how do the energies change if $L$ doubles?",
    back: "$$E_n = \\frac{n^2\\pi^2\\hbar^2}{2mL^2} = \\frac{n^2h^2}{8mL^2}, \\quad n = 1, 2, \\ldots$$<p class=\"card-key\"><strong>$E_n \\propto n^2$, so $E_2 = 4E_1$.</strong></p><ul class=\"recall-list\"><li><strong>Wavefunction:</strong> $\\psi_n = \\sqrt{2/L}\\,\\sin(n\\pi x/L)$, zero at both walls.</li><li><strong>Interior nodes:</strong> $n-1$.</li><li><strong>Doubling $L$</strong> divides every $E_n$ by $4$.</li></ul>",
    note: "Supplemental — Kahn §5.3.1, p.101."
  },
  {
    id: "supp-newton-momentum",
    eq: "supp",
    topic: "cm",
    tag: "Momentum",
    name: "Collisions with a target at rest (supplemental)",
    front: "Mass $m_1$ moving at $v$ hits mass $m_2$ at rest, head-on. If the collision is elastic, what happens to the relative velocity, what are the final velocities, and what fraction of the kinetic energy goes to $m_2$? If they stick together, what fraction is lost?",
    back: "<strong>Elastic, head-on</strong><br>The relative velocity reverses: $v_2' - v_1' = v$.<br>With momentum $m_1 v = m_1 v_1' + m_2 v_2'$, these are two linear equations: $$v_1' = \\frac{m_1 - m_2}{m_1 + m_2}\\,v, \\qquad v_2' = \\frac{2m_1}{m_1 + m_2}\\,v$$ Fraction of $K_0 = \\tfrac{1}{2}m_1v^2$ given to $m_2$: $$\\frac{K_2'}{K_0} = \\frac{4m_1m_2}{(m_1 + m_2)^2}$$ Symmetric in $m_1 \\leftrightarrow m_2$; equal to $1$ only when $m_1 = m_2$.<br><br><strong>Limits</strong><br><ul class=\"recall-list\"><li>$m_2 \\gg m_1$: $v_1' \\to -v$, $v_2' \\to 0$; $m_2$ takes only $\\approx 4m_1/m_2$ of the energy.</li><li>$m_2 \\ll m_1$: $v_2' \\to 2v$.</li><li>$m_1 = m_2$, head-on: the velocities swap.</li><li>$m_1 = m_2$, glancing: the final velocities are perpendicular.</li></ul><br><strong>Perfectly inelastic</strong> (they stick)<br>Common velocity $v' = \\frac{m_1}{m_1 + m_2}\\,v$. $$\\frac{\\Delta K}{K_0} = \\frac{m_2}{m_1 + m_2}, \\qquad \\frac{K'}{K_0} = \\frac{m_1}{m_1 + m_2}$$ The lost energy is $\\tfrac{1}{2}\\mu v^2$ with $\\mu = \\frac{m_1 m_2}{m_1 + m_2}$: the kinetic energy in the centre-of-mass frame, turned into internal energy.",
    note: "Supplemental. Kahn §1.4.1, p.12. Neutron moderators use hydrogen because $m_2 \\approx m_1$ lets one head-on hit stop the neutron; lead ($m_2 \\approx 207\\,m_1$) takes only about $2\\%$ of its energy per hit."
  },
  {
    id: "supp-friction",
    eq: "supp",
    topic: "cm",
    tag: "Friction",
    name: "Friction and the incline (supplemental)",
    front: "Static and kinetic friction laws. For a block on an incline of angle $\\theta$: when does it start to slip, when does it slide at constant speed, and what is its acceleration otherwise?",
    back: "$$f_s \\le \\mu_s N, \\qquad f_k = \\mu_k N$$<p class=\"card-key\"><strong>Slipping starts when $\\tan\\theta = \\mu_s$, because static friction cannot exceed $\\mu_s N$.</strong></p><ul class=\"recall-list\"><li><strong>Sliding at constant speed</strong> needs $\\tan\\theta = \\mu_k$.</li><li><strong>Acceleration:</strong> otherwise, sliding down, $a = g(\\sin\\theta - \\mu_k\\cos\\theta)$.</li></ul>",
    note: "Supplemental. Kahn §1.1.1, p.1."
  },
  {
    id: "supp-rocket",
    eq: "supp",
    topic: "cm",
    tag: "Variable mass",
    name: "Rocket equation (supplemental)",
    front: "A rocket in free space ejects exhaust at constant speed $u$ relative to itself. What is its change in speed as its mass falls from $m_i$ to $m_f$?",
    back: "$$\\Delta v = u\\ln\\frac{m_i}{m_f}$$<p class=\"card-key\"><strong>Doubling $\\Delta v$ requires squaring the mass ratio.</strong></p><ul class=\"recall-list\"><li><strong>From momentum conservation</strong>, $m\\,dv = -u\\,dm$.</li><li><strong>Burning straight up</strong> in uniform gravity for a time $t$ subtracts $gt$.</li></ul>",
    note: "Supplemental."
  },
  {
    id: "supp-small-oscillation",
    eq: "supp",
    topic: "cm",
    tag: "Small oscillations",
    name: "Small-oscillation frequency from a potential minimum (supplemental)",
    front: "A particle of mass $m$ sits at a minimum $x_0$ of a one-dimensional potential $V(x)$. What is the angular frequency of small oscillations?",
    back: "$$\\omega = \\sqrt{\\frac{V''(x_0)}{m}}$$ Expanding, $V \\approx V(x_0) + \\tfrac{1}{2}V''(x_0)(x - x_0)^2$, so the effective spring constant is $V''(x_0)$. If $V''(x_0) = 0$, the motion is not simple harmonic.",
    note: "Supplemental."
  },
  {
    id: "supp-gravity-orbits",
    eq: "supp",
    topic: "cm",
    tag: "Gravity",
    name: "Orbital energy, vis-viva and escape speed (supplemental)",
    front: "A mass $m \\ll M$ orbits $M$ on an ellipse of semimajor axis $a$. What are its total energy and its speed at distance $r$? What do these give for a circular orbit and for the escape speed?",
    back: "$$E = -\\frac{GMm}{2a}, \\qquad v^2 = GM\\left(\\frac{2}{r} - \\frac{1}{a}\\right)$$<p class=\"card-key\"><strong>$E$ depends only on $a$, not on the eccentricity.</strong></p><ul class=\"recall-list\"><li><strong>Circular orbit ($r = a$):</strong> $v_{\\rm circ} = \\sqrt{GM/r}$ and $K = -E = -U/2$, with $U = -GMm/r$.</li><li><strong>Escape ($E = 0$, $a \\to \\infty$):</strong> $v_{\\rm esc} = \\sqrt{2GM/r} = \\sqrt{2}\\,v_{\\rm circ}$.</li></ul>",
    note: "Supplemental. Kahn §1.6, p.19–22."
  },
  {
    id: "supp-hydrostatics",
    kind: "list",
    eq: "supp",
    topic: "cm",
    tag: "Fluids",
    name: "Buoyancy and hydrostatic pressure difference (supplemental list)",
    front: "State the buoyant force in an incompressible fluid under uniform $g$, and how pressure changes with depth. (2)",
    back: "<ul class=\"recall-list\"><li><strong>Buoyant force:</strong> $\\rho_{\\mathrm{fluid}} g V_{\\mathrm{displaced}}$, directed upward.</li><li><strong>Pressure with depth:</strong> higher at greater depth by $\\rho g h$.<br>Here $h$ is the increase in depth.<br>This is a pressure difference, not an absolute pressure.</li></ul>",
    note: "Supplemental. Kahn §1.8.2, p.29."
  },
  {
    id: "supp-drift-current",
    kind: "list",
    eq: "supp",
    topic: "em",
    tag: "Current density",
    name: "Drift current density (supplemental list)",
    front: "For conduction in a wire, state the drift current density, the current through a cross-section of area $A$, and the typical drift speed in a metal. (3)",
    back: "<ul class=\"recall-list\"><li><strong>Drift current density:</strong> $\\mathbf{J} = nq\\mathbf{v}_d$, with carrier density $n$ and carrier charge $q$.<br>In a material of conductivity $\\sigma = 1/\\rho$, also $\\mathbf{J} = \\sigma\\mathbf{E}$.</li><li><strong>Current through $A$:</strong> $I = n|q|Av_d$, so $v_d = I/(n|q|A)$.<br>At fixed $I$, a thinner wire has a faster drift.</li><li><strong>Drift speed in a metal:</strong> $v_d \\sim 10^{-4}\\ \\mathrm{m/s}$, well below $1\\ \\mathrm{mm/s}$.<br>In a metal $n \\sim 10^{28}\\ \\mathrm{m^{-3}}$ gives this speed.<br>The electrical signal itself travels at a large fraction of $c$.</li></ul>",
    note: "Supplemental. The carriers in a length $v_d\\,\\Delta t$ of wire cross the area in a time $\\Delta t$."
  },
  {
    id: "supp-image-plane",
    eq: "supp",
    topic: "em",
    tag: "Method of images",
    name: "Image charge for a grounded conducting plane (supplemental)",
    front: "A point charge $q$ sits a distance $d$ from a grounded infinite conducting plane. Where is the image charge, what force does the plane exert on $q$, and how much work brings $q$ in from infinity?",
    back: "$$F = \\frac{q^2}{4\\pi\\epsilon_0 (2d)^2} = \\frac{q^2}{16\\pi\\epsilon_0 d^2} \\quad \\text{(attractive)}, \\qquad W = -\\frac{q^2}{16\\pi\\epsilon_0 d}$$<p class=\"card-key\"><strong>Use the full image force, but only half the pair energy.</strong></p><ul class=\"recall-list\"><li><strong>Image charge:</strong> $-q$ at the mirror point, a distance $d$ behind the plane.</li><li><strong>Work:</strong> half the energy $-\\frac{q^2}{4\\pi\\epsilon_0 (2d)}$ of a real pair of charges.</li><li><strong>Half factor:</strong> the image moves with $q$, so the separation $2z$ changes twice as fast as $q$ moves. The field exists only on the real charge's side.</li><li><strong>Valid region:</strong> the image reproduces the field only on the real charge's side.</li><li><strong>Induced surface charge</strong> totals $-q$.</li></ul>",
    note: "Supplemental. Kahn §2.1.7, p.40 and §2.8, Electrostatics solution 1, p.59."
  },
  {
    id: "supp-rc-rl-transients",
    kind: "list",
    eq: "supp",
    topic: "em",
    tag: "Transients",
    name: "RC and RL transients (supplemental list)",
    front: "In a series circuit with resistor $R$ and a constant source $V$ where present, state $Q(t)$ for a capacitor $C$ charging from zero and discharging from $Q_0$, and $I(t)$ for an inductor $L$ rising from zero and decaying from $I_0$. (4)",
    back: "<ul class=\"recall-list\"><li><strong>Charging:</strong> $Q = CV\\left(1 - e^{-t/RC}\\right)$.<br>About $63\\%$ charged after one time constant.</li><li><strong>Discharging:</strong> $Q = Q_0 e^{-t/RC}$.<br>Current is $I = (Q_0/RC)\\,e^{-t/RC}$.</li><li><strong>Inductor current rising:</strong> $I = (V/R)\\left(1 - e^{-Rt/L}\\right)$.</li><li><strong>Inductor current decaying:</strong> $I = I_0 e^{-Rt/L}$.<br>After one time constant a fraction $1/e \\approx 37\\%$ is left.</li></ul>",
    note: "Supplemental. Kahn §2.7.4, p.58."
  },
  {
    id: "supp-parallel-wire-force",
    eq: "supp",
    topic: "em",
    tag: "Magnetic force",
    name: "Force between parallel currents (supplemental)",
    front: "Two long parallel wires a distance $d$ apart carry currents $I_1$ and $I_2$. What is the force per unit length between them, and when do they attract?",
    back: "$$\\frac{F}{L} = \\frac{\\mu_0 I_1 I_2}{2\\pi d}$$<p class=\"card-key\"><strong>Currents in the same direction attract; opposite directions repel.</strong></p><ul class=\"recall-list\"><li><strong>Origin:</strong> the force comes from wire 1's field $\\mu_0 I_1/(2\\pi d)$ acting on wire 2 through $d\\mathbf{F} = I\\,d\\mathbf{l}\\times\\mathbf{B}$.</li></ul>",
    note: "Supplemental. Kahn (2.28) and (2.30), §2.2.1–2.2.3, pp.46–47."
  },
  {
    id: "supp-optical-magnification",
    kind: "list",
    eq: "supp",
    topic: "ow",
    tag: "Geometric optics",
    name: "Lens and telescope magnification (supplemental list)",
    front: "State the transverse magnification of a thin lens and what its sign and size mean, and the angular magnification of a two-lens astronomical telescope. (2)",
    back: "<ul class=\"recall-list\"><li><strong>Thin lens:</strong> $M = -s'/s$.<br>$M \\lt 0$ means an inverted image, $|M| \\gt 1$ an enlarged one.</li><li><strong>Astronomical telescope:</strong> $|M_\\theta| = f_o/f_e$, with an inverted image.<br>Two converging lenses a distance $f_o + f_e$ apart.</li></ul>",
    note: "Supplemental — uses the real-is-positive convention of Kahn §3.3.2, p.71."
  },
  {
    id: "supp-converging-lens-image",
    kind: "list",
    eq: "supp",
    topic: "ow",
    tag: "Geometric optics",
    name: "Converging lens: real or virtual image (supplemental list)",
    front: "A converging lens ($f \\gt 0$) images a real object ($s \\gt 0$). How does comparing the object distance $s$ with $f$ decide whether the image is real or virtual, and upright or inverted? (2)",
    back: "<ul class=\"recall-list\"><li><strong>$s \\gt f$:</strong> real ($s' \\gt 0$) and inverted.<br>The rays leaving the lens converge and meet.</li><li><strong>$s \\lt f$:</strong> virtual ($s' \\lt 0$), upright and enlarged.<br>The rays leaving the lens diverge and meet only when extended backward.<br>The lens acts as a magnifying glass.</li></ul>",
    note: "Supplemental — follows from $1/s + 1/s' = 1/f$ in the real-is-positive convention of Kahn §3.3.2, p.71."
  },
  {
    id: "supp-acoustic-modes",
    kind: "list",
    eq: "supp",
    topic: "ow",
    tag: "Standing waves",
    name: "String and pipe harmonics (supplemental list)",
    front: "Neglecting end corrections, state the harmonics of a fixed string or open–open pipe, of a closed–open pipe, the node types at open and closed ends, and the closed–closed sequence. (4)",
    back: "<ul class=\"recall-list\"><li><strong>Fixed–fixed string or open–open pipe:</strong> $f_n = nv/(2L)$ for length $L$, $n = 1, 2, 3, \\dots$<br>The longest wavelength is $2L$.</li><li><strong>Closed–open pipe:</strong> $f_n = (2n-1)v/(4L)$, odd harmonics only.<br>The longest wavelength is $4L$.</li><li><strong>Node types:</strong> an open end is a pressure node and a displacement antinode.<br>A closed end is a pressure antinode and a displacement node.</li><li><strong>Closed–closed pipe:</strong> the same frequencies as an open–open pipe.</li></ul>",
    note: "Supplemental — Kahn §3.4.3, p.73 gives the end conditions and the wavelengths $2L$ and $4L$."
  },
  {
    id: "supp-beats",
    eq: "supp",
    topic: "ow",
    tag: "Beats",
    name: "Beat frequency of loudness maxima (supplemental)",
    front: "Two pure tones of nearby frequencies $f_1$ and $f_2$ sound together. At what rate do the loudness maxima arrive?",
    back: "$$f_{\\mathrm{beat}} = |f_1 - f_2|$$ The loudness peaks come at the full difference, not half of it, even though the envelope cosine has frequency $|f_1 - f_2|/2$.",
    note: "Supplemental."
  },
  {
    id: "supp-michelson-double-pass",
    kind: "list",
    eq: "supp",
    topic: "ow",
    tag: "Interferometry",
    name: "Michelson fringe shifts for a moving mirror and a slab (supplemental list)",
    front: "In a Michelson interferometer at wavelength $\\lambda$, how many fringes pass when one mirror moves a distance $d$, and when a slab of thickness $L$ and index $n$ is placed in one arm? (2)",
    back: "<ul class=\"recall-list\"><li><strong>Mirror moved by $d$:</strong> $N = 2d/\\lambda$.<br>The light crosses the extra distance twice.</li><li><strong>Slab in one arm</strong> (normal incidence, in air): $N = 2L(n-1)/\\lambda$.<br>Again a double pass.</li></ul>",
    note: "Supplemental."
  },
  {
    id: "supp-lattice-heat-capacity",
    kind: "list",
    eq: "supp",
    topic: "th",
    tag: "Heat capacity",
    name: "Lattice heat capacity limits (supplemental list)",
    front: "For a crystal, state the high-temperature heat capacity, the low-temperature Debye law, and the low-temperature heat capacity of a metal. (3)",
    back: "<ul class=\"recall-list\"><li><strong>High $T$:</strong> $C_V \\to 3Nk_B$ ($3R$ per mole, Dulong–Petit).<br>Each atom has three vibrational coordinates, each with a kinetic and a potential quadratic term.</li><li><strong>Debye, $T \\ll \\theta_D$:</strong> $C_V \\propto T^3$.<br>The thermal energy grows as $T^4$.<br>The single-frequency Einstein model instead falls off exponentially.</li><li><strong>Metal at low $T$:</strong> $C = aT + bT^3$.<br>The linear term comes from electrons near the Fermi surface, the cubic term from the lattice.</li></ul>",
    note: "Supplemental."
  },
  {
    id: "supp-van-der-waals",
    kind: "list",
    eq: "supp",
    topic: "th",
    tag: "Equations of state",
    name: "Van der Waals equation and the critical point (supplemental list)",
    front: "In the one-mole van der Waals equation, what do the constants $a$ and $b$ correct for, and what conditions define the critical point? (2)",
    back: "<ul class=\"recall-list\"><li><strong>Constants $a$ and $b$:</strong> $a$ accounts for intermolecular attraction, which lowers the pressure on the walls.<br>$b$ is the volume excluded by the molecules themselves.<br>Both appear in $\\left(P + \\dfrac{a}{V_m^2}\\right)(V_m - b) = RT$.</li><li><strong>Critical point:</strong> $(\\partial P/\\partial V_m)_T = 0$ and $(\\partial^2 P/\\partial V_m^2)_T = 0$.<br>An inflection of the critical isotherm.</li></ul>",
    note: "Supplemental — Kahn §4.2.2, p.82. Critical values: $V_{m,c} = 3b$, $T_c = 8a/(27Rb)$, $P_c = a/(27b^2)$."
  },
  {
    id: "supp-fourier-conduction",
    eq: "supp",
    topic: "th",
    tag: "Heat conduction",
    name: "Fourier conduction law (supplemental)",
    front: "How is the heat current $\\dot Q$ through a uniform slab of area $A$ and conductivity $\\kappa$ related to the temperature gradient?",
    back: "$$\\dot Q = -\\kappa A\\,\\frac{dT}{dx}$$ Heat flows down the gradient. For a slab of thickness $L$, $|\\dot Q| = \\kappa A\\,\\Delta T/L$, so slabs in series add their thermal resistances $L/(\\kappa A)$, like resistors.",
    note: "Supplemental."
  },
  {
    id: "supp-heat-pump-cop",
    kind: "list",
    eq: "supp",
    topic: "th",
    tag: "Heat engines",
    name: "Heat engine, refrigerator and heat pump compared (supplemental list)",
    front: "A heat engine, a refrigerator and a heat pump are each rated as goal divided by cost. State each one's ratio and the Carnot value it cannot exceed. (3)",
    back: "<ul class=\"recall-list\"><li><strong>Heat engine:</strong> $e = W/Q_H = 1 - Q_C/Q_H$, which cannot exceed $1 - T_C/T_H$.<br>Goal $W$, cost $Q_H$.</li><li><strong>Refrigerator:</strong> $Q_C/W$, which cannot exceed $T_C/(T_H - T_C)$.<br>Goal $Q_C$, cost $W$.</li><li><strong>Heat pump:</strong> $Q_H/W = Q_C/W + 1$, which cannot exceed $T_H/(T_H - T_C)$ and cannot fall below $1$.<br>Goal $Q_H$, cost $W$.</li></ul>",
    note: "All three obey $Q_H = Q_C + W$ in magnitudes; use kelvin. A smaller $T_H - T_C$ raises both coefficients of performance but lowers $e$. Kahn §4.2.6, p.85, (4.36)–(4.37) covers the engine; the refrigerator and heat pump are supplemental."
  },
  {
    id: "supp-step-barrier",
    kind: "list",
    eq: "supp",
    topic: "qm",
    tag: "Scattering states",
    name: "Step reflection and transmission (supplemental list)",
    front: "A particle of energy $E$ meets a step from potential $V_L$ (left) to $V_R$ (right). State $R$ and $T$ when $E$ exceeds both, the wavefunction on the right when $E \\lt V_R$ for a step extending to $+\\infty$, and $T$ in that case. (3)",
    back: "<ul class=\"recall-list\"><li><strong>$E$ exceeds both:</strong> $R = \\left(\\dfrac{k_L - k_R}{k_L + k_R}\\right)^2$, $T = \\dfrac{4k_Lk_R}{(k_L + k_R)^2}$, and $R + T = 1$.<br>With $k_{L,R} = \\sqrt{2m(E - V_{L,R})}/\\hbar$.</li><li><strong>Right side, $E \\lt V_R$:</strong> $\\psi \\propto e^{-\\kappa x}$ with $\\kappa = \\sqrt{2m(V_R - E)}/\\hbar$.</li><li><strong>$T$ for $E \\lt V_R$:</strong> $T = 0$ and $R = 1$: no flux is transmitted.<br>A barrier of finite width can still transmit by tunneling.</li></ul>",
    note: "Supplemental — Kahn §5.3.5, p.103, treats steps and barriers only qualitatively."
  },
  {
    id: "supp-well-scattering",
    kind: "list",
    eq: "supp",
    topic: "qm",
    tag: "Scattering states",
    name: "Scattering over a finite square well (supplemental list)",
    front: "A particle of energy $E \\gt 0$ comes from the left onto a finite square well: $V = -V_0$ for $0 \\lt x \\lt L$ and $V = 0$ outside. What form does $\\psi$ take left of the well, inside it, and right of it, and when does the particle pass with no reflection? (4)",
    back: "<ul class=\"recall-list\"><li><strong>Left:</strong> $Ae^{ikx} + Be^{-ikx}$ with $k = \\sqrt{2mE}/\\hbar$.<br>The incident wave plus the reflected wave.</li><li><strong>Inside:</strong> oscillating, with $k' = \\sqrt{2m(E + V_0)}/\\hbar \\gt k$.<br>The wavelength is shorter.</li><li><strong>Right:</strong> only $Ce^{ikx}$, with the same $k$ as on the left.<br>Nothing comes back from $+\\infty$, so there is no $e^{-ikx}$ term and no standing wave such as $\\sin kx$ or $\\cos kx$.</li><li><strong>No reflection:</strong> $R = 0$ and $T = 1$ only when $k'L = n\\pi$, with $n$ a positive integer.<br>At any other energy $R \\gt 0$, although a classical particle never reflects off a drop in potential.</li></ul>",
    note: "Supplemental — Kahn §5.3.5, pp.103–104, gives the incident, reflected and transmitted forms $Ae^{ikx} + Be^{-ikx}$ and $Ce^{ikx}$. The no-reflection condition is not in Kahn."
  },
  {
    id: "supp-dipole-selection-extra",
    kind: "list",
    eq: "supp",
    topic: "at",
    tag: "Selection rules",
    name: "Extra electric-dipole rules in LS coupling (supplemental list)",
    front: "State the electric-dipole selection rules for parity, $\\Delta S$, $\\Delta L$ and $\\Delta J$ in LS coupling. (4)",
    back: "<ul class=\"recall-list\"><li><strong>Parity:</strong> the initial and final states have opposite parity (electric dipole, LS coupling).</li><li><strong>Spin:</strong> $\\Delta S = 0$.</li><li><strong>Orbital:</strong> $\\Delta L = 0,\\pm 1$, excluding $0 \\leftrightarrow 0$.<br>Uppercase $L$ is the total orbital angular momentum.</li><li><strong>Total:</strong> $\\Delta J = 0,\\pm 1$, excluding $0 \\leftrightarrow 0$.</li></ul>",
    note: "Supplemental — the one-electron rules $\\Delta l = \\pm 1$ and $\\Delta m = 0, \\pm 1$ still apply to the electron that jumps."
  },
  {
    id: "supp-term-hund",
    kind: "list",
    eq: "supp",
    topic: "at",
    tag: "Atomic terms",
    name: "Term symbols and Hund's ground-term rules (supplemental list)",
    front: "State the term-symbol notation, the order for choosing the ground term of equivalent electrons, the rule for $J$, and what closed shells contribute. (4)",
    back: "<ul class=\"recall-list\"><li><strong>Term symbol:</strong> $^{2S+1}L_J$, with the letters $S, P, D, F$ for $L = 0, 1, 2, 3$.</li><li><strong>Ground term:</strong> largest total $S$ first, then largest $L$ allowed by the Pauli principle.</li><li><strong>Rule for $J$:</strong> $J = |L - S|$ if the subshell is less than half full, $J = L + S$ if more than half full.<br>Exactly half full gives $L = 0$, so $J = S$.</li><li><strong>Closed shells</strong> and subshells have $S = L = J = 0$ and add nothing.</li></ul>",
    note: "Supplemental — valid when the Coulomb interaction dominates spin–orbit coupling."
  },
  {
    id: "supp-hydrogenic-z-scaling",
    eq: "supp",
    topic: "at",
    tag: "Hydrogen atom",
    name: "Hydrogenic scaling with Z and reduced mass (supplemental)",
    front: "A hydrogen-like system has nuclear charge $Ze$ and reduced mass $\\mu$. How do $E_n$, the orbit radii $r_n$ and the emitted wavelengths scale with $\\mu$ and $Z$? What is $E_1$ for $\\mathrm{He}^+$?",
    back: "$$E_n \\propto \\frac{\\mu Z^2}{n^2}, \\qquad r_n \\propto \\frac{n^2}{\\mu Z}, \\qquad \\lambda \\propto \\frac{1}{\\mu Z^2}$$<p class=\"card-key\"><strong>A nucleus $Ze$ gives $(Ze^2)^2$, a factor $Z^2$, not $Z^4$.</strong></p><ul class=\"recall-list\"><li><strong>$\\mathrm{He}^+$:</strong> $E_1 = -4(13.6\\ \\text{eV}) = -54.4\\ \\text{eV}$ and $r_1 = a_0/2$.</li><li><strong>Trap:</strong> $e^4$ is $(e^2)^2$, where $e^2$ is the electron charge times the nuclear charge.</li></ul>",
    note: "Supplemental — Kahn §5.4.3, p.107, warns about the $Z^4$ trap."
  },
  {
    id: "supp-xray-edges",
    kind: "list",
    eq: "supp",
    topic: "at",
    tag: "Inner-shell spectra",
    name: "Moseley K-alpha estimate and Duane-Hunt limit (supplemental list)",
    front: "State Moseley's estimate of the $K\\alpha$ photon energy, why it uses $Z - 1$, and the short-wavelength limit of an X-ray tube run at voltage $V$. (3)",
    back: "<ul class=\"recall-list\"><li><strong>$K\\alpha$ energy:</strong> $E_{K\\alpha} \\approx \\tfrac{3}{4}(13.6\\ \\text{eV})(Z-1)^2$.<br>An $n = 2 \\to 1$ jump, and $1 - \\tfrac{1}{4} = \\tfrac{3}{4}$.</li><li><strong>Why $Z - 1$:</strong> the remaining $1s$ electron screens one unit of nuclear charge.<br>So the jumping electron sees about $(Z-1)e$.</li><li><strong>Short-wavelength limit:</strong> Duane–Hunt, $\\lambda_{\\min} = hc/(eV)$.<br>It is reached when an electron's whole kinetic energy $eV$ becomes one photon.<br>$\\lambda_{\\min}\\,[\\text{nm}] \\approx 1240/V\\,[\\text{V}]$.</li></ul>",
    note: "Supplemental — the screening estimate is rough."
  },
  {
    id: "supp-rigid-rotor",
    kind: "list",
    eq: "supp",
    topic: "at",
    tag: "Molecular rotation",
    name: "Rigid rotor levels and pure-rotation selection (supplemental list)",
    front: "State the rigid-rotor energies and degeneracy, the diatomic moment of inertia, the pure-rotation selection rule, and the spacing of the rotational lines. (4)",
    back: "<ul class=\"recall-list\"><li><strong>Energies and degeneracy:</strong> $E_J = \\hbar^2J(J+1)/(2I)$ for $J = 0, 1, 2, \\ldots$, with degeneracy $2J+1$.<br>Classical $T = L^2/(2I)$ with the quantum eigenvalue $L^2 = \\hbar^2J(J+1)$ (not $J$, not $J+1$).</li><li><strong>Diatomic:</strong> $I = \\mu r_e^2$, with reduced mass $\\mu = m_1m_2/(m_1+m_2)$ and bond length $r_e$.<br>The rotor turns about its center of mass, not the midpoint.<br>Two masses $m$ give $I = 2m(r_e/2)^2 = \\tfrac{1}{2}mr_e^2$, so a rod of length $a$ has $E_J = \\hbar^2J(J+1)/(ma^2)$.<br>$m$ and $3m$ give $\\tfrac{3}{4}mr_e^2$, not $mr_e^2$.</li><li><strong>Selection rule:</strong> $\\Delta J = \\pm 1$.<br>Pure rotational absorption needs a permanent electric dipole (none for $\\mathrm{H}_2$ or $\\mathrm{N}_2$).</li><li><strong>Line spacing:</strong> neighboring lines are spaced by $2B$.<br>$J \\to J+1$ absorbs $2B(J+1)$ with $B = \\hbar^2/(2I)$.</li></ul>",
    note: "Supplemental — dumbbell example from Kahn Sample Exam 1 #100."
  },
  {
    id: "supp-hall",
    eq: "supp",
    topic: "sp",
    tag: "Hall effect",
    name: "Single-carrier Hall field (supplemental)",
    front: "For one type of carrier with signed charge $q$ and density $n$, with current density $J_x$ in a field $B_z$, what is the Hall field $E_y$?",
    back: "$$E_y = R_H J_x B_z, \\qquad R_H = \\frac{1}{nq}$$ The sign of $R_H$ gives the carrier sign: electrons give $R_H \\lt 0$, holes $R_H \\gt 0$. Fewer carriers give a larger Hall field, which is why semiconductors show a big effect.",
    note: "Supplemental — single band, low field."
  },
  {
    id: "supp-nuclear-q",
    eq: "supp",
    topic: "sp",
    tag: "Nuclear reactions",
    name: "Binding energy and the iron peak (supplemental)",
    front: "How is the nuclear binding energy $B$ defined, where does $B/A$ peak, and why do both fission and fusion release energy?",
    back: "$$B = \\left[Zm_p + (A-Z)m_n - M_{\\text{nucleus}}\\right]c^2$$<p class=\"card-key\"><strong>$B/A$ peaks near iron and nickel, at about $8.8\\ \\mathrm{MeV}$.</strong></p><ul class=\"recall-list\"><li><strong>Fission and fusion:</strong> splitting heavy nuclei or fusing light ones moves toward the peak. This raises the total binding and releases the difference.</li><li><strong>Mass unit:</strong> $1\\ \\mathrm{u}\\,c^2 \\approx 931.5\\ \\mathrm{MeV}$.</li></ul>",
    note: "Supplemental."
  },
  {
    id: "supp-magnetons",
    kind: "list",
    eq: "supp",
    topic: "at",
    tag: "Magnetons",
    name: "Bohr and nuclear magnetons and the weak-field Zeeman shift (supplemental list)",
    front: "State the Bohr and nuclear magnetons, their ratio, and the weak-field Zeeman shift of a level with Landé factor $g_J$, including the pure-spin and pure-orbital values of $g_J$. (3)",
    back: "<ul class=\"recall-list\"><li><strong>Magnetons:</strong> $\\mu_B = e\\hbar/(2m_e) \\approx 5.8\\times10^{-5}\\ \\text{eV/T}$ and $\\mu_N = e\\hbar/(2m_p)$.</li><li><strong>Ratio:</strong> $\\mu_B/\\mu_N = m_p/m_e \\approx 1836$.<br>Nuclear magnetic effects are roughly $2000$ times weaker.</li><li><strong>Weak-field Zeeman shift:</strong> $\\Delta E = g_J\\mu_B m_J B$.<br>$g_J = 2$ for pure spin ($L = 0$) and $g_J = 1$ for pure orbit ($S = 0$).<br>No first-order shift for a $J = 0$ level.</li></ul>",
    note: "Supplemental."
  },
  {
    id: "supp-fourier-series",
    kind: "list",
    eq: "supp",
    topic: "sp",
    tag: "Math methods",
    name: "Fourier series on a full period (supplemental list)",
    front: "On $[-\\pi,\\pi]$, state the $a_0/2$ series, both coefficient integrals, what even and odd symmetry kill, and what the series does at a jump. (4)",
    back: "<ul class=\"recall-list\"><li><strong>Series:</strong> on $[-\\pi,\\pi]$, with that periodic extension, $$f(x) = \\frac{a_0}{2}+\\sum_{n=1}^{\\infty}\\left[a_n\\cos(nx)+b_n\\sin(nx)\\right].$$</li><li><strong>Coefficients:</strong> $a_n = (1/\\pi)\\int_{-\\pi}^{\\pi} f(x)\\cos(nx)\\,dx$ for $n \\ge 0$.<br>$b_n = (1/\\pi)\\int_{-\\pi}^{\\pi} f(x)\\sin(nx)\\,dx$ for $n \\ge 1$.</li><li><strong>Even and odd:</strong> even $f$ kills every $b_n$.<br>Odd $f$ kills every $a_n$.</li><li><strong>At a jump:</strong> the series equals the average of the two limits.</li></ul>",
    note: "Supplemental."
  },
  {
    id: "supp-residues",
    kind: "list",
    eq: "supp",
    topic: "sp",
    tag: "Math methods",
    name: "Residue theorem and a simple pole (supplemental list)",
    front: "State the residue theorem for a counterclockwise contour, the residue at a simple pole, what a clockwise contour changes, and the residue at a pole of order $n$. (4)",
    back: "<ul class=\"recall-list\"><li><strong>Residue theorem:</strong> $\\oint f\\,dz = 2\\pi i\\sum\\mathrm{Res}$.<br>Counterclockwise simple closed curve, $f$ analytic on and inside it except at isolated singularities inside.</li><li><strong>Simple pole $z_0$:</strong> $\\mathrm{Res} = \\lim_{z\\to z_0}(z - z_0)f(z)$.</li><li><strong>Clockwise:</strong> $\\oint f\\,dz = -2\\pi i\\sum\\mathrm{Res}$.<br>The theorem changes sign; the residues themselves do not.</li><li><strong>Pole of order $n$:</strong> $\\mathrm{Res} = \\dfrac{1}{(n-1)!}\\lim_{z\\to z_0}\\dfrac{d^{n-1}}{dz^{n-1}}\\left[(z - z_0)^n f(z)\\right]$.</li></ul>",
    note: "Supplemental."
  },
  {
    id: "supp-matrix-det-trace",
    kind: "list",
    eq: "supp",
    topic: "sp",
    tag: "Math methods",
    name: "Determinant, trace, and eigenvalues (supplemental list)",
    front: "For square matrices of one size, state the determinant product rule, the trace identity, the characteristic equation, and the trace and determinant in terms of the eigenvalues. (4)",
    back: "<ul class=\"recall-list\"><li><strong>Product rule:</strong> $\\det(AB) = \\det A\\,\\det B$.</li><li><strong>Trace identity:</strong> $\\operatorname{Tr}(AB) = \\operatorname{Tr}(BA)$.<br>For three factors only cyclic reorders are allowed.</li><li><strong>Characteristic equation:</strong> eigenvalues solve $\\det(A - \\lambda I) = 0$.</li><li><strong>In eigenvalues:</strong> $\\operatorname{Tr} A = \\sum_i \\lambda_i$ and $\\det A = \\prod_i \\lambda_i$, counting multiplicity.</li></ul>",
    note: "Supplemental — useful for normal modes and spin matrices."
  },
  {
    id: "supp-counting-distributions",
    kind: "list",
    eq: "supp",
    topic: "lb",
    tag: "Counting statistics",
    name: "Binomial, Poisson, and Gaussian: one family (supplemental list)",
    front: "Binomial, Poisson, Gaussian: give the picture each one counts, its formula with mean and spread, and how one turns into the next. For Poisson, add the upper limit that zero counts give. (4)",
    back: "<ul class=\"recall-list\"><li><strong>Binomial: the coin-toss tally.</strong><br>A fixed number $N$ of yes/no tries, each a yes with chance $p$; count the yeses.<br>$P(k) = \\binom{N}{k}p^k(1-p)^{N-k}$, $\\langle k\\rangle = Np$, $\\sigma^2 = Np(1-p)$.<br>The hard ceiling $k \\le N$ squeezes the spread below the mean: a fair coin gives $\\sigma = \\sqrt{N}/2$, not $\\sqrt{N}$.<br>At least one yes: $1-(1-p)^N$ (all-no is $(1-p)^N$, not $p^N$).</li><li><strong>Poisson: raindrops on a paving stone.</strong><br>No list of tries, only a steady rate $r$ of rare, independent clicks; count them for a time $t$.<br>$P(n) = \\lambda^n e^{-\\lambda}/n!$ with $\\lambda = rt$; a silent window has $P(0) = e^{-\\lambda}$.<br>Mean $=$ variance $= \\lambda$, so the absolute error is $\\sigma = \\sqrt{\\lambda}$ counts.<br>The relative (fractional) error is $\\sigma/\\lambda = 1/\\sqrt{\\lambda}$: $400 \\pm 20$ counts is $5\\%$.<br>Count $4$ times longer to halve the relative error.<br>Zero events in time $T$ give an upper limit.<br>Exclude every rate under which a silent window is rarer than $1-\\mathrm{CL}$, so $e^{-r_{\\rm up}T} = 1-\\mathrm{CL}$.<br>$90\\%$: about $2.3$ events; $95\\%$: about $3.0$; higher confidence, larger limit.</li><li><strong>Gaussian: the bell that every big pile becomes.</strong><br>Add many small independent nudges and the histogram melts into $p(x) = \\tfrac{1}{\\sigma\\sqrt{2\\pi}}\\,e^{-(x-\\mu)^2/(2\\sigma^2)}$, where $\\mu$ and $\\sigma$ are free knobs.<br>Within $\\pm1\\sigma$, $\\pm2\\sigma$, $\\pm3\\sigma$: $68\\%$, $95\\%$, $99.7\\%$.<br>$\\mathrm{FWHM} \\approx 2.35\\,\\sigma$.<br>The mean of $N$ readings has $\\sigma_{\\bar{x}} = \\sigma/\\sqrt{N}$.</li><li><strong>One family, three ages.</strong><br>Binomial with $N \\to \\infty$, $p \\to 0$, $Np = \\lambda$ fixed is Poisson.<br>Slice the time into $N$ tiny windows: $P(0) = (1-\\lambda/N)^N \\to e^{-\\lambda}$.<br>Poisson with large $\\lambda$ is a Gaussian with $\\mu = \\lambda$, $\\sigma = \\sqrt{\\lambda}$ (central limit theorem).<br>It holds because the count is a sum of many independent sub-window counts.<br>Binomial with $Np(1-p) \\gg 1$ is a Gaussian with $\\mu = Np$, $\\sigma^2 = Np(1-p)$.<br>Spread fingerprint: binomial $\\sigma^2 \\lt$ mean, Poisson $\\sigma^2 =$ mean, Gaussian $\\sigma$ set by hand.</li></ul>",
    note: "Supplemental. Which one to reach for: the problem hands you $N$ and $p$, use binomial; it hands you only a rate or an average count, use Poisson; it hands you $\\mu$ and $\\sigma$, or the count is large, use the Gaussian."
  },
  {
    id: "supp-thin-film",
    kind: "list",
    eq: "supp",
    topic: "ow",
    tag: "Thin films",
    name: "Normal-incidence thin-film reflection (supplemental list)",
    front: "At normal incidence on a film of index $n$ and thickness $t$, state the extra optical path and phase rule, the one-flip bright and dark conditions, and the thinnest anti-reflection coating on glass. (3)",
    back: "<ul class=\"recall-list\"><li><strong>Path and phase rule:</strong> extra optical path $2nt$.<br>A reflection off a higher-index medium adds a phase $\\pi$.</li><li><strong>One flip</strong> (soap film in air): bright when $2nt = \\left(m + \\tfrac12\\right)\\lambda$, dark when $2nt = m\\lambda$.<br>A film much thinner than $\\lambda$ looks dark.</li><li><strong>Thinnest anti-reflection coating:</strong> $t = \\lambda/(4n)$.<br>Two flips (coating with $n_{\\mathrm{air}} \\lt n \\lt n_{\\mathrm{glass}}$): dark when $2nt = \\left(m + \\tfrac12\\right)\\lambda$.</li></ul>",
    note: "Supplemental — Kahn §3.2.4, p.69. $\\lambda$ is the vacuum wavelength."
  },
  {
    id: "supp-fresnel-normal",
    eq: "supp",
    topic: "ow",
    tag: "Thin films",
    name: "Normal-incidence reflectance (supplemental)",
    front: "Light at normal incidence goes from index $n_1$ toward index $n_2$. What fraction of the intensity is reflected, and what does the sign of the reflected amplitude say about its phase?",
    back: "$$r = \\frac{n_1 - n_2}{n_1 + n_2}, \\qquad R = r^2 = \\left(\\frac{n_1 - n_2}{n_1 + n_2}\\right)^2, \\qquad T = 1 - R$$<p class=\"card-key\"><strong>The reflected wave flips by $\\pi$ only off the higher-index side: $r \\lt 0$ when $n_2 \\gt n_1$.</strong></p><ul class=\"recall-list\"><li><strong>Air to glass ($n = 1.5$):</strong> $R = 0.04$, about $4\\%$ per surface.</li><li><strong>Limits:</strong> equal indices give $R = 0$. A very large mismatch drives $R$ toward $1$.</li><li><strong>Quantum step:</strong> from wavenumber $k_1$ to $k_2$, the same form holds with $k_1, k_2$ in place of $n_1, n_2$.</li></ul>",
    note: "Supplemental — Kahn §3.2.4, p.69, gives only the phase rule, equations (3.19)–(3.20). The reflectance formula is not in Kahn."
  },
  {
    id: "supp-radiation-pressure",
    kind: "list",
    eq: "supp",
    topic: "em",
    tag: "Radiation pressure",
    name: "Radiation pressure at normal incidence (supplemental list)",
    front: "At normal incidence in vacuum, state the pressure on an absorber and the pressure on a perfect reflector. (2)",
    back: "<ul class=\"recall-list\"><li><strong>Absorber:</strong> pressure $I/c$.<br>Momentum per unit time per unit area is that pressure.</li><li><strong>Perfect reflector:</strong> pressure $2I/c$, because the normal momentum reverses.</li></ul>",
    note: "Supplemental. An EM wave of intensity $I$ carries momentum flux $I/c$."
  },
  {
    id: "supp-grating-power",
    kind: "list",
    eq: "supp",
    topic: "ow",
    tag: "Diffraction grating",
    name: "Grating resolving power (supplemental list)",
    front: "What is the resolving power of a diffraction grating, and how does it depend on the diffraction order and the number of lines? (2)",
    back: "<ul class=\"recall-list\"><li><strong>Resolving power:</strong> $R = \\lambda/\\Delta\\lambda$.<br>$\\Delta\\lambda$ is the smallest resolvable wavelength difference near $\\lambda$.</li><li><strong>Order and number of lines:</strong> $R = mN$ in order $m$ with $N$ illuminated lines.<br>Doubling the illuminated lines halves the resolvable $\\Delta\\lambda$.</li></ul>",
    note: "Supplemental — from the Rayleigh criterion applied to the principal maxima."
  },
  {
    id: "supp-mean-free-path",
    kind: "list",
    eq: "supp",
    topic: "th",
    tag: "Mean free path",
    name: "Hard-sphere mean free path (supplemental list)",
    front: "For an equilibrium gas of identical hard spheres of diameter $d$ and number density $n$, state the mean free path, the mean time between collisions, and when the factor $\\sqrt2$ drops out. (3)",
    back: "<ul class=\"recall-list\"><li><strong>Mean free path:</strong> $\\ell = \\dfrac{1}{\\sqrt2\\,\\pi d^2 n} = \\dfrac{1}{\\sqrt2\\,n\\sigma}$ with $\\sigma = \\pi d^2$.<br>$\\ell \\propto 1/n$.</li><li><strong>Mean time between collisions:</strong> $\\tau = \\ell/\\langle v\\rangle$.</li><li><strong>When $\\sqrt2$ drops out:</strong> a beam fired into stationary targets has $\\ell = 1/(n\\sigma)$.<br>The $\\sqrt2$ comes from the relative speed of moving molecules.</li></ul>",
    note: "Supplemental."
  },
  {
    id: "supp-brewster-angle",
    eq: "supp",
    topic: "ow",
    tag: "Polarization",
    name: "Brewster's polarizing angle (supplemental)",
    front: "Unpolarized light goes from index $n_1$ toward index $n_2$. At what angle of incidence is the reflected light completely polarized, and what are its polarization and geometry?",
    back: "$$\\tan\\theta_B = \\frac{n_2}{n_1}$$<p class=\"card-key\"><strong>The reflected and refracted rays are perpendicular: $\\theta_B + \\theta_t = 90^\\circ$.</strong></p><ul class=\"recall-list\"><li><strong>Polarization:</strong> the reflected light is polarized perpendicular to the plane of incidence.</li><li><strong>In-plane light:</strong> light polarized in the plane of incidence is fully transmitted.</li></ul>",
    note: "Kahn §3.1.6, p.66."
  },
  {
    id: "supp-radiation-field",
    kind: "list",
    eq: "supp",
    topic: "em",
    tag: "Radiation",
    name: "Nonrelativistic radiation-field direction (supplemental list)",
    front: "For an accelerating point charge with $v \\ll c$, state the direction of the radiation field $\\mathbf{E}_{\\mathrm{rad}}$, the plane it lies in, and its angular dependence. (3)",
    back: "<ul class=\"recall-list\"><li><strong>Direction:</strong> $\\mathbf{E}_{\\mathrm{rad}} \\propto q\\,\\hat{\\mathbf{r}}\\times(\\hat{\\mathbf{r}}\\times\\mathbf{a}) = -q\\,\\mathbf{a}_{\\perp}$.<br>For $q \\gt 0$ it points opposite to $\\mathbf{a}_{\\perp}$, the part of $\\mathbf{a}$ perpendicular to the line of sight $\\hat{\\mathbf{r}}$.</li><li><strong>Plane:</strong> it is perpendicular to $\\hat{\\mathbf{r}}$ and lies in the plane of $\\hat{\\mathbf{r}}$ and $\\mathbf{a}$.</li><li><strong>Angular dependence:</strong> $|\\mathbf{E}_{\\mathrm{rad}}| \\propto \\sin\\theta/R$ and the power per solid angle $\\propto \\sin^2\\theta$, with $\\theta$ measured from $\\mathbf{a}$.<br>Zero along $\\mathbf{a}$, largest at $90^\\circ$.</li></ul>",
    note: "Supplemental. $\\hat{\\mathbf{r}}$ points from the charge to the field point a distance $R$ away."
  },
  {
    id: "supp-rotating-loop-emf",
    kind: "list",
    eq: "supp",
    topic: "em",
    tag: "Induction",
    name: "Rotating-loop flux and induced emf (supplemental list)",
    front: "For an $N$-turn loop of area $A$ rotating at $\\omega$ in uniform $B$, state the flux, the induced emf, and when the emf is largest. (3)",
    back: "<ul class=\"recall-list\"><li><strong>Flux:</strong> $\\Phi_B = NBA\\cos\\omega t$ when the angle between the loop normal and $\\mathbf{B}$ is $\\omega t$.</li><li><strong>Induced emf:</strong> $\\mathcal{E} = NBA\\omega\\sin\\omega t$, with peak $\\mathcal{E}_0 = NBA\\omega$.</li><li><strong>Largest emf:</strong> when the flux is zero.</li></ul>",
    note: "Supplemental. From $\\mathcal{E} = -d\\Phi_B/dt$; the peak $NBA\\omega$ does not depend on the starting orientation. Kahn §2.3.2, p.50."
  },
  {
    id: "supp-sin2-cycle-average",
    kind: "list",
    eq: "supp",
    topic: "em",
    tag: "AC averages",
    name: "Cycle average of sine-squared and average Joule power (supplemental list)",
    front: "Over one period, state $\\langle\\sin^2\\omega t\\rangle$ and $\\langle\\sin\\omega t\\rangle$, the rms value of $V_0\\sin\\omega t$, and the average power it delivers to a resistor $R$. (3)",
    back: "<ul class=\"recall-list\"><li><strong>Cycle averages:</strong> $\\langle\\sin^2\\omega t\\rangle = \\langle\\cos^2\\omega t\\rangle = \\tfrac{1}{2}$, while $\\langle\\sin\\omega t\\rangle = \\langle\\cos\\omega t\\rangle = 0$.</li><li><strong>rms value:</strong> $V_{\\mathrm{rms}} = V_0/\\sqrt{2}$.</li><li><strong>Average power:</strong> $\\langle P\\rangle = V_0^2/(2R) = V_{\\mathrm{rms}}^2/R$.<br>Zero average voltage does not mean zero average power.</li></ul>",
    note: "Supplemental."
  },
  {
    id: "supp-rolling-incline",
    eq: "supp",
    topic: "cm",
    tag: "Rolling",
    name: "Rolling without slipping down an incline (supplemental)",
    front: "A round body with $I = \\alpha MR^2$ rolls without slipping from rest down an incline of angle $\\theta$, dropping a height $h$. Speed at the bottom, acceleration, and the race order of hoop, disk and solid sphere?",
    back: "$$v = \\sqrt{\\frac{2gh}{1 + \\alpha}}, \\qquad a = \\frac{g\\sin\\theta}{1 + \\alpha}$$<p class=\"card-key\"><strong>$M$ and $R$ cancel; only $\\alpha$ matters.</strong></p><ul class=\"recall-list\"><li><strong>Race order:</strong> solid sphere ($\\alpha = \\tfrac{2}{5}$) beats disk ($\\tfrac{1}{2}$), then shell ($\\tfrac{2}{3}$), then hoop ($1$).</li><li><strong>Rolling</strong> means $v = R\\omega$.</li><li><strong>Static friction</strong> does no work.</li></ul>",
    note: "Supplemental. Kahn §1.3.3, p.9."
  },
  {
    id: "supp-invariant-mass",
    eq: "supp",
    topic: "sr",
    tag: "Energy-momentum",
    name: "Invariant mass of a system (supplemental)",
    front: "A system has total energy $E_{\\rm tot}$ and total momentum $\\mathbf{p}_{\\rm tot}$. What is its invariant mass $M$? Why can a lone photon not create an electron–positron pair in vacuum?",
    back: "$$Mc^2 = \\sqrt{E_{\\rm tot}^2 - |\\mathbf{p}_{\\rm tot}|^2c^2}$$<p class=\"card-key\"><strong>$Mc^2$ is the total energy in the zero-momentum frame.</strong></p><ul class=\"recall-list\"><li><strong>Lone photon:</strong> a photon has $E = pc$, so $M = 0$, but an $e^+e^-$ pair has invariant mass of at least $2m_e$.</li><li><strong>Head-on collision:</strong> two particles of mass $m$, each with factor $\\gamma$, give $M = 2\\gamma m$.</li></ul>",
    note: "Supplemental. Kahn §6.3.2, p.128."
  },
  {
    id: "supp-cl-switch-limits",
    eq: "supp",
    topic: "em",
    tag: "Circuits",
    name: "Capacitor and inductor at switch-on and long after (supplemental)",
    front: "A DC source is switched on at $t = 0$ in a circuit containing an uncharged capacitor and an inductor carrying no current. What does each element act like just after the switch closes, and a long time later?",
    back: "$$t = 0^{+}:\\ C \\to \\text{short},\\ L \\to \\text{open}; \\qquad t \\to \\infty:\\ C \\to \\text{open},\\ L \\to \\text{short}$$<p class=\"card-key\"><strong>The voltage across a capacitor and the current through an inductor cannot jump.</strong></p><ul class=\"recall-list\"><li><strong>Just after closing:</strong> $V_C = 0$ and $I_L = 0$.</li><li><strong>Long time later:</strong> in steady state, no current flows through $C$ and no voltage sits across $L$.</li></ul>",
    note: "Supplemental. Kahn §7.3.1, Example 7.1."
  },
  {
    id: "supp-lenz-law",
    eq: "supp",
    topic: "em",
    tag: "Induction",
    name: "Lenz's law with a magnet and a ring (supplemental)",
    front: "A bar magnet's north pole is pushed toward a conducting ring along the ring's axis. Which way does the induced current circulate, as seen from the magnet, and what force does the ring exert on the magnet?",
    back: "$$\\text{counterclockwise as seen from the magnet; the ring repels the magnet}$$<p class=\"card-key\"><strong>The induced current opposes the change in flux.</strong></p><ul class=\"recall-list\"><li><strong>Flux:</strong> the flux through the ring, pointing away from the magnet, grows.</li><li><strong>Induced current:</strong> by $\\mathcal{E} = -d\\Phi_B/dt$ it makes a field pointing back toward the magnet, so the ring turns its north face toward the magnet's north pole.</li><li><strong>Receding magnet:</strong> it would be attracted instead.</li></ul>",
    note: "Supplemental. Kahn §2.3.2, p.50."
  },
  {
    id: "supp-sphere-inside-field",
    eq: "supp",
    topic: "em",
    tag: "Gauss's law",
    name: "Field inside a uniformly charged sphere and a shell (supplemental)",
    front: "A solid sphere of radius $R$ carries total charge $Q$ spread uniformly through its volume. What is $E(r)$ inside and outside? What if the same charge sits on a thin shell instead?",
    back: "$$E = \\frac{Qr}{4\\pi\\epsilon_0 R^3}\\ \\ (r \\lt R), \\qquad E = \\frac{Q}{4\\pi\\epsilon_0 r^2}\\ \\ (r \\gt R)$$ Inside, only the charge within radius $r$ counts, a fraction $r^3/R^3$, so $E$ grows linearly and peaks at the surface. A thin shell gives $E = 0$ everywhere inside.",
    note: "Supplemental. Kahn §2.1.4, p.37, and Example 2.2."
  },
  {
    id: "supp-rc-filters",
    eq: "supp",
    topic: "lb",
    tag: "Impedance",
    name: "RC low-pass and high-pass filters (supplemental)",
    front: "In an $RC$ filter the output is taken across one element. Which arrangement passes low frequencies, which passes high frequencies, and where is the crossover?",
    back: "$$\\omega_c = \\frac{1}{RC}$$<p class=\"card-key\"><strong>At $\\omega_c$, $|Z_C| = R$ and the output amplitude is $1/\\sqrt{2}$ of the input.</strong></p><ul class=\"recall-list\"><li><strong>Output across $C$</strong> (capacitor to ground): low-pass, because $C$ shorts high frequencies.</li><li><strong>Output across $R$:</strong> high-pass, because $C$ blocks low frequencies.</li></ul>",
    note: "Supplemental. Kahn §7.3.1, Figure 7.1."
  },
  {
    id: "supp-laser-operation",
    eq: "supp",
    topic: "lb",
    tag: "Lasers",
    name: "How a laser works (supplemental)",
    front: "What three ingredients make a laser work, and why can a system with only two energy levels not lase?",
    back: "$$N_{\\text{upper}} \\gt N_{\\text{lower}} \\quad \\text{(population inversion)}$$<p class=\"card-key\"><strong>With two levels, pumping can at best equalize the populations.</strong></p><ul class=\"recall-list\"><li><strong>Pumping</strong> creates the inversion.</li><li><strong>Metastable level:</strong> a long-lived upper laser level holds the inversion.</li><li><strong>Stimulated emission</strong> copies photons with the same frequency, phase, direction and polarization.</li><li><strong>Two levels:</strong> at equal populations, absorption and stimulated emission balance.</li></ul>",
    note: "Supplemental. Kahn §7.5.1, p.141."
  },
  {
    id: "supp-motional-emf",
    eq: "supp",
    topic: "em",
    tag: "Induction",
    name: "Sliding rod on rails: motional emf (supplemental)",
    front: "A conducting rod of length $L$ slides at speed $v$ along rails in a uniform field $B$ perpendicular to the circuit, whose resistance is $R$. What emf and current arise, and what force acts on the rod?",
    back: "$$\\mathcal{E} = BLv, \\qquad I = \\frac{BLv}{R}, \\qquad F = ILB = \\frac{B^2L^2 v}{R}$$<p class=\"card-key\"><strong>The force opposes the motion (Lenz's law).</strong></p><ul class=\"recall-list\"><li><strong>Coasting rod:</strong> it slows down.</li><li><strong>Constant pull:</strong> a rod pulled by a constant force $F_0$ reaches the terminal speed $F_0 R/(B^2L^2)$.</li><li><strong>Power:</strong> the mechanical power in equals $I^2R$.</li></ul>",
    note: "Supplemental. From $\\mathcal{E} = -d\\Phi_B/dt$ with $\\Phi_B = BLx$; Kahn §2.3.2, p.50."
  },
  {
    id: "supp-displacement-current",
    eq: "supp",
    topic: "em",
    tag: "Displacement current",
    name: "Displacement current: definition and the capacitor gap (supplemental)",
    front: "How is the displacement current $I_d$ through a surface $S$ defined? While a current $I$ charges a parallel-plate capacitor, how large is $I_d$ through the gap between the plates?",
    back: "$$I_d = \\epsilon_0\\frac{d\\Phi_E}{dt}, \\qquad \\Phi_E = \\int_S \\mathbf{E}\\cdot d\\mathbf{S}$$<p class=\"card-key\"><strong>The gap carries exactly the wire's current.</strong></p><ul class=\"recall-list\"><li><strong>Definition:</strong> the rate of change of the electric flux, not the flux itself, and nothing magnetic (the rate of change of the magnetic flux is Faraday's emf).</li><li><strong>In the gap</strong> $E = Q/(\\epsilon_0 A)$, so $I_d = \\epsilon_0 A\\,dE/dt = dQ/dt = I$.</li><li><strong>Ampère's law</strong> becomes $\\oint \\mathbf{B}\\cdot d\\mathbf{l} = \\mu_0\\left(I_{\\text{enc}} + I_d\\right)$, so between circular plates $B = \\mu_0 I r/(2A)$, growing linearly with $r$.</li></ul>",
    note: "Supplemental. Kahn (2.41), §2.3.1, p.50; charging capacitor in §2.3.4 Problem 4, solution p.60–61."
  },
  {
    id: "supp-scintillation-detector",
    eq: "supp",
    topic: "lb",
    tag: "Detectors",
    name: "Scintillation detector with photomultiplier (supplemental)",
    front: "How does a scintillation detector such as sodium iodide doped with thallium measure the energy of a $\\gamma$-ray photon?",
    back: "$$\\text{light output} \\propto \\text{deposited energy}$$<p class=\"card-key\"><strong>High $Z$ (iodine, $Z = 53$) raises the interaction probability.</strong></p><ul class=\"recall-list\"><li><strong>Photon to electron:</strong> the photon gives its energy to an electron (photoelectric effect, Compton scattering or pair production).</li><li><strong>Scintillation:</strong> the electron produces visible scintillation light.</li><li><strong>Photomultiplier tube:</strong> turns the light into an amplified current pulse through photoemission and a cascade of dynodes.</li></ul>",
    note: "Supplemental. Kahn §7.4.3, p.141."
  },
  {
    id: "supp-infinite-well-centered",
    eq: "supp",
    topic: "qm",
    tag: "Particle in a box",
    name: "Infinite well centered on the origin (supplemental)",
    front: "An infinite square well has walls at $x = \\pm a$. What are its energies, and what are the ground-state and first-excited wavefunctions inside?",
    back: "$$E_n = \\frac{n^2\\pi^2\\hbar^2}{8ma^2}$$<p class=\"card-key\"><strong>Odd $n$ give cosines and even $n$ sines, as a symmetric well requires definite parity.</strong></p><ul class=\"recall-list\"><li><strong>Width:</strong> $2a$.</li><li><strong>Ground state:</strong> $\\psi_1 = \\frac{1}{\\sqrt{a}}\\cos\\frac{\\pi x}{2a}$ (even).</li><li><strong>First excited:</strong> $\\psi_2 = \\frac{1}{\\sqrt{a}}\\sin\\frac{\\pi x}{a}$ (odd).</li></ul>",
    note: "Supplemental — Kahn §5.3.1, p.101."
  },
  {
    id: "supp-hydrogen-series",
    eq: "supp",
    topic: "at",
    tag: "Hydrogen spectrum",
    name: "Hydrogen spectral series (supplemental)",
    front: "Which final level $n_f$ defines the Lyman, Balmer and Paschen series of hydrogen, and in which spectral band does each lie?",
    back: "$$\\frac{1}{\\lambda} = R_H\\left(\\frac{1}{n_f^2} - \\frac{1}{n_i^2}\\right), \\qquad R_H \\approx 1.097\\times10^{7}\\ \\text{m}^{-1}$$<p class=\"card-key\"><strong>Lyman: ultraviolet. Balmer: visible. Paschen: infrared.</strong></p><ul class=\"recall-list\"><li><strong>Lyman, $n_f = 1$:</strong> $91$–$122\\ \\text{nm}$.</li><li><strong>Balmer, $n_f = 2$:</strong> $365$–$656\\ \\text{nm}$.</li><li><strong>Paschen, $n_f = 3$:</strong> $820$–$1875\\ \\text{nm}$.</li><li><strong>For nuclear charge $Ze$</strong>, multiply $R_H$ by $Z^2$.</li></ul>",
    note: "Supplemental — Kahn §5.4.3, p.107, gives the Rydberg formula without naming the series."
  },
  {
    id: "supp-hydrogen-line-1240",
    eq: "supp",
    topic: "at",
    tag: "Hydrogen spectrum",
    name: "Hydrogen lines from 1240 over E (supplemental)",
    front: "Using $\\lambda\\,[\\text{nm}] \\approx 1240/E\\,[\\text{eV}]$, find the hydrogen Lyman-$\\alpha$ ($n = 2 \\to 1$) and H-$\\alpha$ ($n = 3 \\to 2$) wavelengths. Which transition emits near $486\\ \\text{nm}$?",
    back: "$$\\lambda_{\\text{Ly-}\\alpha} \\approx 122\\ \\text{nm}, \\qquad \\lambda_{\\text{H-}\\alpha} \\approx 656\\ \\text{nm}$$<p class=\"card-key\"><strong>Doubling both $n$ divides $\\Delta E$ by $4$.</strong></p><ul class=\"recall-list\"><li><strong>Lyman-$\\alpha$:</strong> $\\tfrac{3}{4}(13.6) = 10.2\\ \\text{eV}$, ultraviolet.</li><li><strong>H-$\\alpha$:</strong> $13.6\\left(\\tfrac{1}{4} - \\tfrac{1}{9}\\right) = 1.89\\ \\text{eV}$, red.</li><li><strong>Near $486\\ \\text{nm}$:</strong> $n = 4 \\to 2$ (H-$\\beta$) emits at $4 \\times 121.6 \\approx 486\\ \\text{nm}$.</li></ul>",
    note: "Supplemental — Kahn §5.4.4, Problem 2, p.108, uses the $122\\ \\text{nm}$ line; $hc \\approx 1240\\ \\text{eV}\\cdot\\text{nm}$ is on recent Tables of Information."
  },
  {
    id: "supp-two-electron-exchange",
    eq: "supp",
    topic: "qm",
    tag: "Identical particles",
    name: "Two-electron spin and spatial symmetry (supplemental)",
    front: "Two electrons are in a spin triplet. What exchange symmetry must their spatial wavefunction have, and what is $\\langle\\mathbf{S}_1\\cdot\\mathbf{S}_2\\rangle$ in the triplet and in the singlet?",
    back: "$$\\text{triplet: spatial part antisymmetric}, \\qquad \\text{singlet: spatial part symmetric}$$<p class=\"card-key\"><strong>Electrons are fermions, so the full state is antisymmetric.</strong></p><ul class=\"recall-list\"><li><strong>$\\langle\\mathbf{S}_1\\cdot\\mathbf{S}_2\\rangle$:</strong> $+\\hbar^2/4$ in the triplet and $-3\\hbar^2/4$ in the singlet, from $\\mathbf{S}_1\\cdot\\mathbf{S}_2 = \\tfrac{1}{2}\\left(S^2 - S_1^2 - S_2^2\\right)$.</li><li><strong>An antisymmetric spatial state</strong> keeps the electrons apart.</li></ul>",
    note: "Supplemental — Kahn §5.5.4, p.111."
  },
  {
    id: "supp-spin-half-properties",
    eq: "supp",
    topic: "qm",
    tag: "Spin",
    name: "Spin-1/2 operator properties (supplemental)",
    front: "For a spin-$\\tfrac{1}{2}$ particle, what results can a measurement of any spin component give, what is the eigenvalue of $S^2$, and what is the square of each Pauli matrix?",
    back: "$$S_i = \\pm\\frac{\\hbar}{2}, \\qquad S^2 = \\tfrac{3}{4}\\hbar^2, \\qquad \\sigma_i^2 = I$$ With $\\hat{S}_i = \\tfrac{\\hbar}{2}\\sigma_i$, each $\\hat{S}_i^2 = \\tfrac{\\hbar^2}{4}I$, and the three add to $\\tfrac{3}{4}\\hbar^2$. The components obey $[\\hat{S}_x, \\hat{S}_y] = i\\hbar\\hat{S}_z$.",
    note: "Supplemental — Kahn §5.5.1, pp.108–109: $\\hat{S}_i = \\tfrac{\\hbar}{2}\\sigma_i$ on p.108; the three matrices and their eigenvalues $\\pm 1$ on p.109, where the book advises remembering their properties rather than their entries. Some questions name the matrices without printing them (GR1777 question 71)."
  },
  {
    id: "supp-spin-measurement",
    eq: "supp",
    topic: "qm",
    tag: "Spin",
    name: "Spin-1/2 measurement probabilities (supplemental)",
    front: "A normalized spin-$\\tfrac{1}{2}$ state is $c_\\uparrow|\\!\\uparrow\\rangle + c_\\downarrow|\\!\\downarrow\\rangle$. What are the probabilities of $S_z = \\pm\\hbar/2$, and of $S_x = +\\hbar/2$?",
    back: "$$P\\!\\left(S_z = +\\tfrac{\\hbar}{2}\\right) = |c_\\uparrow|^2, \\qquad P\\!\\left(S_z = -\\tfrac{\\hbar}{2}\\right) = |c_\\downarrow|^2$$ For $S_x$, project onto $\\tfrac{1}{\\sqrt{2}}(1, 1)$: $P\\!\\left(S_x = +\\tfrac{\\hbar}{2}\\right) = \\tfrac{1}{2}|c_\\uparrow + c_\\downarrow|^2$. Example: $|\\!\\uparrow\\rangle$ gives $\\tfrac{1}{2}$ for each $S_x$ result.",
    note: "Supplemental — Kahn §5.5.1."
  },
  {
    id: "supp-stern-gerlach",
    eq: "supp",
    topic: "at",
    tag: "Stern-Gerlach",
    name: "Stern-Gerlach splitting (supplemental)",
    front: "In a Stern–Gerlach experiment, why must the magnetic field be nonuniform, and into how many beams does a beam of atoms with angular momentum $j$ split?",
    back: "$$F_z = \\mu_z\\,\\frac{\\partial B_z}{\\partial z}, \\qquad \\text{number of beams} = 2j + 1$$<p class=\"card-key\"><strong>Only a nonuniform field gives a net force. A uniform one only exerts a torque.</strong></p><ul class=\"recall-list\"><li><strong>Evidence for spin:</strong> silver or hydrogen ground-state atoms ($l = 0$, $s = \\tfrac{1}{2}$) give $2$ beams, an even number that no orbital $l$ can produce.</li></ul>",
    note: "Supplemental — Kahn §5.7.4 mentions the experiment."
  },
  {
    id: "supp-delta-well-bound",
    eq: "supp",
    topic: "qm",
    tag: "Delta potential",
    name: "Delta-well and shallow-well bound states (supplemental)",
    front: "How many bound states does the attractive one-dimensional well $V(x) = -A\\,\\delta(x)$ have, how does its binding energy scale with $A$ and $m$, and does every shallow 1D square well bind?",
    back: "$$E = -\\frac{mA^2}{2\\hbar^2}\\quad\\text{(exactly one bound state)}$$<p class=\"card-key\"><strong>Doubling $A$ quadruples the binding.</strong></p><ul class=\"recall-list\"><li><strong>Units:</strong> $A$ has units of energy times length, so $mA^2/\\hbar^2$ is the only energy available.</li><li><strong>Shallow 1D well:</strong> every attractive 1D square well, however shallow, has at least one even bound state.</li><li><strong>Wavefunction:</strong> $\\psi \\propto e^{-mA|x|/\\hbar^2}$ has a kink at $0$.</li></ul>",
    note: "Supplemental — Kahn §5.3.3–5.3.4, pp.102–103."
  },
  {
    id: "supp-tunneling-scaling",
    eq: "supp",
    topic: "qm",
    tag: "Scattering states",
    name: "Tunneling probability scaling (supplemental)",
    front: "A particle of mass $m$ and energy $E$ meets a wide barrier of height $V_0 \\gt E$ and width $d$. How does the transmission probability depend on $d$, $m$ and $V_0 - E$?",
    back: "$$T \\approx e^{-2\\kappa d}, \\qquad \\kappa = \\frac{\\sqrt{2m(V_0 - E)}}{\\hbar}$$<p class=\"card-key\"><strong>Doubling $d$ squares $T$, and a heavier particle tunnels exponentially less.</strong></p><ul class=\"recall-list\"><li><strong>Valid for</strong> $\\kappa d \\gg 1$, with the prefactor dropped.</li><li><strong>Inside the barrier</strong> the wavefunction decays instead of oscillating.</li></ul>",
    note: "Supplemental — Kahn §5.3.5 treats tunneling only qualitatively."
  },
  {
    id: "supp-beta-q-value",
    eq: "supp",
    topic: "sp",
    tag: "Nuclear reactions",
    name: "Reaction and beta-decay Q values (supplemental)",
    front: "With atomic masses $M_P$ (parent) and $M_D$ (daughter), what is a reaction's $Q$ value, and what are the $Q$ values for $\\beta^-$ and $\\beta^+$ decay?",
    back: "$$Q = \\left(\\sum M_i - \\sum M_f\\right)c^2$$<p class=\"card-key\"><strong>$\\beta^+$ can occur only if $M_P - M_D$ exceeds $2m_e$.</strong></p><ul class=\"recall-list\"><li><strong>$Q \\gt 0$</strong> releases kinetic energy.</li><li><strong>$\\beta^-$:</strong> $Q = (M_P - M_D)c^2$.</li><li><strong>$\\beta^+$:</strong> $Q = (M_P - M_D - 2m_e)c^2$, because atomic masses include the electrons.</li></ul>",
    note: "Supplemental — neglects electron binding energies."
  },
  {
    id: "supp-free-expansion",
    eq: "supp",
    topic: "th",
    tag: "Thermodynamic processes",
    name: "Free expansion of an ideal gas (supplemental)",
    front: "An ideal gas expands freely into vacuum from $V_1$ to $V_2$ inside an insulated container. What are $\\Delta U$, the final temperature and $\\Delta S$?",
    back: "$$\\Delta U = 0, \\qquad T_f = T_i, \\qquad \\Delta S = Nk_B\\ln\\frac{V_2}{V_1} \\gt 0$$<p class=\"card-key\"><strong>Irreversible process: compute $\\Delta S$ along a reversible isotherm between the same end states.</strong></p><ul class=\"recall-list\"><li><strong>Energy:</strong> no work is done (nothing to push against) and no heat enters, so $U$, and with it $T$, is unchanged.</li></ul>",
    note: "Supplemental — Kahn §4.2.3, pp.83–84, and Example 4.2, p.85."
  },
  {
    id: "supp-adiabatic-temperature",
    eq: "supp",
    topic: "th",
    tag: "Thermodynamic processes",
    name: "Reversible adiabatic: temperature and work (supplemental)",
    front: "In a reversible adiabatic process an ideal gas goes from $(T_i, V_i)$ to $(T_f, V_f)$. How are the temperatures related, and how much work does the gas do?",
    back: "$$TV^{\\gamma-1} = \\text{const}$$ So $T_f = T_i\\,(V_i/V_f)^{\\gamma-1}$: halving the volume of a monatomic gas raises $T$ by $2^{2/3} \\approx 1.59$. Work by the gas: $W = -\\Delta U = nC_V(T_i - T_f) = \\dfrac{P_iV_i - P_fV_f}{\\gamma - 1}$.",
    note: "Supplemental — from $PV^{\\gamma} = \\text{const}$ (Kahn §4.2.3, p.83) and $PV = nRT$."
  },
  {
    id: "supp-cycle-area",
    eq: "supp",
    topic: "th",
    tag: "Heat engines",
    name: "Work and heat from cycle diagrams (supplemental)",
    front: "A gas runs a closed cycle. How do you read the net work from a $P$–$V$ diagram, and what is the net heat absorbed?",
    back: "$$W_{\\mathrm{net}} = \\oint P\\,dV = \\text{enclosed area}$$<p class=\"card-key\"><strong>$\\Delta U = 0$ per cycle, so $Q_{\\mathrm{net}} = W_{\\mathrm{net}}$.</strong></p><ul class=\"recall-list\"><li><strong>Clockwise</strong> on a $P$–$V$ diagram, the gas does positive net work (an engine). Counterclockwise, net work is done on it.</li><li><strong>On a $T$–$S$ diagram</strong> the enclosed area is $Q_{\\mathrm{net}}$; a Carnot cycle is a rectangle there.</li></ul>",
    note: "Supplemental — Kahn §4.2.6, Figs. 4.2 and 4.3. Breathing picture (an analogy only; the gas stays sealed): inhale hard in the heat (expand along the high-$P$ path), exhale easily in the cold (compress along the low-$P$ path), so more work comes out than goes in."
  },
  {
    id: "supp-decay-bookkeeping",
    eq: "supp",
    topic: "sp",
    tag: "Nuclear physics",
    name: "How decays change Z and A (supplemental)",
    front: "How do the atomic number $Z$ and the mass number $A$ change in $\\alpha$, $\\beta^-$, $\\beta^+$ and $\\gamma$ decay?",
    back: "$$\\alpha:\\ (Z, A) \\to (Z-2,\\ A-4)$$<p class=\"card-key\"><strong>For a decay chain, count the alphas from $\\Delta A/4$, then fix $Z$ with betas.</strong></p><ul class=\"recall-list\"><li><strong>$\\beta^-$:</strong> $Z \\to Z+1$, $A$ unchanged ($n \\to p + e^- + \\bar\\nu_e$).</li><li><strong>$\\beta^+$ or electron capture:</strong> $Z \\to Z-1$, $A$ unchanged.</li><li><strong>$\\gamma$:</strong> no change.</li></ul>",
    note: "Supplemental — Kahn §8.1.2, p.147."
  },
  {
    id: "supp-pn-junction",
    eq: "supp",
    topic: "sp",
    tag: "Semiconductors",
    name: "Built-in field of a p-n junction (supplemental)",
    front: "A $p$-$n$ junction sits at equilibrium with zero bias. Which way does the electric field point, and where is it?",
    back: "$$\\mathbf{E}:\\ n \\to p,\\ \\text{perpendicular to the interface, only in the depletion region}$$<p class=\"card-key\"><strong>The two charged layers act like a capacitor, so $\\mathbf{E}$ points from $n$ to $p$.</strong></p><ul class=\"recall-list\"><li><strong>Diffusion:</strong> electrons diffuse from $n$ to $p$ (holes from $p$ to $n$).</li><li><strong>Fixed ions</strong> stay behind: $+$ donors on the $n$ side, $-$ acceptors on the $p$ side.</li><li><strong>Equilibrium:</strong> $\\mathbf{E}$ pushes electrons back until drift balances diffusion.</li><li><strong>Magnetic field:</strong> none.</li></ul>",
    note: "Supplemental — Kahn Sample Exam 1 #76.<img class=\"q-fig\" src=\"content/book-assets/pn-junction-field.svg\" alt=\"p-n junction: electrons diffuse from n to p, leaving + donors on the n side and − acceptors on the p side; the built-in field points from n to p\">"
  },
  {
    id: "supp-neutrino-oscillation",
    eq: "supp",
    topic: "sp",
    tag: "Particle physics",
    name: "Neutrino flavor oscillation (supplemental)",
    front: "A $\\nu_e$ from the Sun can be detected on Earth as a $\\nu_\\tau$. Why, and what does this imply about neutrino masses? What mass do you use in decay kinematics?",
    back: "$$|\\nu_e\\rangle = \\cos\\theta\\,|\\nu_1\\rangle + \\sin\\theta\\,|\\nu_2\\rangle$$<p class=\"card-key\"><strong>Each flavor state is a mix of mass states, so flavor changes in free flight.</strong></p><ul class=\"recall-list\"><li><strong>Flavor</strong> ($\\nu_e$, $\\nu_\\mu$, $\\nu_\\tau$) is an internal label like spin: the charged lepton the neutrino is made with or makes at detection.</li><li><strong>Mass states</strong> $\\nu_1$, $\\nu_2$ are the energy eigenstates of free flight. The two bases differ.</li><li><strong>Why flavor changes:</strong> each mass state gains its own phase $e^{-iE_kt/\\hbar}$. The relative phase grows, and a $\\nu_\\tau$ component appears. No collision or decay is needed.</li><li><strong>Neutrino mass:</strong> oscillation needs $m_1 \\ne m_2$, so neutrinos have mass. Oscillation measures only mass differences; directly, $m_{\\nu_e} \\lt 0.45$ eV ($90\\%$ CL).</li><li><strong>Decay kinematics:</strong> treat $\\nu$ as massless. Its mass is 4 to 6 orders of magnitude below keV to MeV decay energies, visible only near the endpoint of the $\\beta$ spectrum.</li></ul>",
    note: "Supplemental — Kahn Sample Exam 1 #80; Kahn §8 (2015 Nobel entry); KATRIN, Science 388, 180 (2025). Neutrino mass goes against the original Standard Model (only left-handed $\\nu$, massless; 2015 Nobel Prize). Analogy: spin prepared along $+x$ precessing in a field along $z$; prepare and measure in one basis, evolve in another."
  },
  {
    id: "supp-total-internal-reflection",
    eq: "supp",
    topic: "ow",
    tag: "Geometric optics",
    name: "Total internal reflection (supplemental)",
    front: "Light travels from index $n_1$ toward a medium of lower index $n_2$. Beyond what angle of incidence is it totally reflected?",
    back: "$$\\sin\\theta_c = \\frac{n_2}{n_1}$$<p class=\"card-key\"><strong>Total internal reflection happens only going from higher to lower index.</strong></p><ul class=\"recall-list\"><li><strong>Angle:</strong> it happens at angles of incidence above $\\theta_c$.</li><li><strong>Any wave:</strong> with speeds $v_1 \\lt v_2$, $\\sin\\theta_c = v_1/v_2$.</li><li><strong>Glass ($n = 1.5$) to air:</strong> $\\theta_c \\approx 42^\\circ$.</li></ul>",
    note: "Supplemental — Kahn Ch. 3, solution to problem 12."
  },
  {
    id: "supp-reservoir-entropy",
    eq: "supp",
    topic: "th",
    tag: "Entropy",
    name: "Entropy of irreversible heat flow (supplemental)",
    front: "Heat $Q$ flows directly from a reservoir at $T_H$ to one at $T_C$. What is the total entropy change? What is it when equal masses of water at $T_1$ and $T_2$ are mixed?",
    back: "$$\\Delta S_{\\mathrm{tot}} = \\frac{Q}{T_C} - \\frac{Q}{T_H} \\gt 0$$ Each reservoir changes by its heat divided by its own fixed temperature. Mixing equal masses $m$: $T_f = (T_1 + T_2)/2$ and $\\Delta S = mc\\ln\\dfrac{T_f^2}{T_1T_2} \\gt 0$, because the arithmetic mean exceeds the geometric mean.",
    note: "Supplemental — uses Kahn eq. (4.19), §4.2.3."
  },
  {
    id: "supp-helmholtz-from-z",
    eq: "supp",
    topic: "th",
    tag: "Thermodynamic potentials",
    name: "Helmholtz free energy from the partition function (supplemental)",
    front: "In the canonical ensemble (fixed $T$ and $V$), how is the Helmholtz free energy $F$ obtained from the partition function $Z$?",
    back: "$$F = U - TS = -k_BT\\ln Z \\quad\\Longleftrightarrow\\quad Z = e^{-\\beta F}$$<p class=\"card-key\"><strong>Differentiate $F$ to get $S$ and $P$.</strong></p><ul class=\"recall-list\"><li><strong>Quick check:</strong> $\\Omega$ states all at energy $E$ give $Z = \\Omega e^{-\\beta E}$, so $-k_BT\\ln Z = E - k_BT\\ln\\Omega = E - TS$.</li><li><strong>From $dF = -S\\,dT - P\\,dV$:</strong> $S = -(\\partial F/\\partial T)_V$ and $P = -(\\partial F/\\partial V)_T = k_BT\\,\\partial\\ln Z/\\partial V$.</li><li><strong>Ideal gas:</strong> $Z \\propto V^N$ gives $P = Nk_BT/V$.</li></ul>",
    note: "Supplemental — Kahn writes the Helmholtz free energy as $A$, eq. (4.26), §4.2.4, p.84; $Z$ is eq. (4.5), §4.1.1, p.79."
  },
  {
    id: "supp-free-energy-minimum",
    eq: "supp",
    topic: "th",
    tag: "Thermodynamic potentials",
    name: "Free energy minimum: energy against entropy (supplemental)",
    front: "A system at fixed $T$ and $V$ exchanges heat with a reservoir. What does equilibrium minimize, and which side wins at low $T$ and at high $T$?",
    back: "$$F = U - TS \\ \\text{is minimized}, \\qquad \\Delta S_{\\rm tot} = \\Delta S - \\frac{\\Delta U}{T} = -\\frac{\\Delta F}{T} \\ge 0$$<p class=\"card-key\"><strong>Lowering $F$ is the same as raising the total entropy of system plus reservoir.</strong></p><ul class=\"recall-list\"><li><strong>Low $T$:</strong> $F \\approx U$, the lowest energy wins (ordered, ground state).</li><li><strong>High $T$:</strong> $F \\approx -TS$, the largest entropy wins (disordered).</li><li><strong>The reservoir</strong> pays $\\Delta U$ and loses entropy $\\Delta U/T$.</li><li><strong>Maximum work:</strong> at constant $T$ the gas can do at most $-\\Delta F$ of work, hence the name free energy.</li></ul>",
    note: "Supplemental — Kahn mentions the free energy only in passing, eq. (4.26), §4.2.4, p.84."
  },
  {
    id: "supp-two-level-populations",
    eq: "supp",
    topic: "th",
    tag: "Statistical mechanics",
    name: "Two-level system populations (supplemental)",
    front: "A system has two levels separated by $\\Delta E$, with degeneracies $g_1$ (lower) and $g_2$ (upper). What is the population ratio at temperature $T$, and what are its limits?",
    back: "$$\\frac{N_2}{N_1} = \\frac{g_2}{g_1}\\,e^{-\\Delta E/k_BT}$$<p class=\"card-key\"><strong>The ratio cannot exceed $g_2/g_1$, so equilibrium never gives a population inversion.</strong></p><ul class=\"recall-list\"><li><strong>Limits:</strong> as $T \\to 0$ the ratio goes to $0$. As $T \\to \\infty$ it rises toward $g_2/g_1$.</li><li><strong>Nondegenerate levels</strong> at $0$ and $\\Delta E$: $\\langle E\\rangle = \\Delta E/(e^{\\Delta E/k_BT} + 1)$.</li></ul>",
    note: "Supplemental — Boltzmann factor, Kahn §4.1.1, p.78."
  },
  {
    id: "supp-oscillator-partition",
    eq: "supp",
    topic: "th",
    tag: "Partition function",
    name: "Quantum oscillator partition function (supplemental)",
    front: "A single quantum harmonic oscillator has levels $E_n = \\left(n+\\tfrac{1}{2}\\right)\\hbar\\omega$. With $x = \\hbar\\omega/k_BT$, what is its partition function $Z$, and what does $Z$ approach as $T \\to 0$ and as $T \\to \\infty$?",
    back: "$$Z = \\frac{e^{-x/2}}{1 - e^{-x}} = \\frac{1}{2\\sinh(x/2)} = \\frac{e^{x/2}}{e^{x} - 1}$$<p class=\"card-key\"><strong>Ground-state factor $e^{-x/2}$ times the geometric series $\\sum_{n} e^{-nx}$.</strong></p><ul class=\"recall-list\"><li><strong>$T \\to 0$:</strong> $Z \\to e^{-x/2}$, only $n = 0$ counts.</li><li><strong>$T \\to \\infty$:</strong> $Z \\to k_BT/\\hbar\\omega$.</li><li><strong>Trap:</strong> $1/(e^{x} \\pm 1)$ is a mean occupation number, not a partition function.</li></ul>",
    note: "Supplemental — Kahn §4.4 problem 1, solved in §4.5, p.90; $Z$ is eq. (4.5), p.79."
  },
  {
    id: "supp-battery-internal-resistance",
    eq: "supp",
    topic: "em",
    tag: "Circuits",
    name: "Battery internal resistance and maximum load power (supplemental)",
    front: "A battery of emf $\\mathcal{E}$ and internal resistance $r$ drives a load resistor $R$. What are the current and the terminal voltage, and which $R$ draws the most power?",
    back: "$$I = \\frac{\\mathcal{E}}{R + r}, \\qquad V_{\\text{term}} = \\mathcal{E} - Ir = \\frac{\\mathcal{E}R}{R + r}$$<p class=\"card-key\"><strong>The load power peaks at $R = r$.</strong></p><ul class=\"recall-list\"><li><strong>Terminal voltage</strong> cannot exceed $\\mathcal{E}$. It equals $\\mathcal{E}$ only when $I = 0$.</li><li><strong>Load power:</strong> $P = I^2R = \\mathcal{E}^2R/(R + r)^2$.</li><li><strong>At $R = r$:</strong> $P_{\\max} = \\mathcal{E}^2/(4r)$, and only half the battery's output reaches the load.</li></ul>",
    note: "Supplemental — built from $V = IR$, Kahn (2.70), §2.7.1, p.57."
  },
  {
    id: "supp-kirchhoff-rules",
    eq: "supp",
    topic: "em",
    tag: "Circuits",
    name: "Kirchhoff's rules and resistor power (supplemental)",
    front: "State Kirchhoff's two circuit rules and the conservation law behind each. What power does a resistor dissipate?",
    back: "$$\\sum_{\\text{node}} I_k = 0, \\qquad \\sum_{\\text{loop}} V_k = 0$$<p class=\"card-key\"><strong>Junction rule: charge conservation. Loop rule: energy conservation.</strong></p><ul class=\"recall-list\"><li><strong>Junction rule:</strong> current in equals current out.</li><li><strong>Loop rule:</strong> holds since $V$ is single-valued. A battery adds $+\\mathcal{E}$ going from $-$ to $+$, and a resistor drops $IR$ along the current.</li><li><strong>Resistor power:</strong> $P = IV = I^2R = V^2/R$.</li></ul>",
    note: "Supplemental — Kahn (2.80)–(2.82), §2.7.2–2.7.3, p.57."
  },
  {
    id: "supp-impulse-power",
    eq: "supp",
    topic: "cm",
    tag: "Momentum",
    name: "Impulse and mechanical power (supplemental)",
    front: "How is the impulse of a force related to momentum, and how do you read it from a graph of $F$ against $t$? What instantaneous power does a force $\\mathbf{F}$ deliver to a body moving at $\\mathbf{v}$?",
    back: "$$\\Delta\\mathbf{p} = \\int \\mathbf{F}\\,dt, \\qquad P = \\frac{dW}{dt} = \\mathbf{F}\\cdot\\mathbf{v}$$<p class=\"card-key\"><strong>The impulse is the area under $F(t)$.</strong></p><ul class=\"recall-list\"><li><strong>Spreading the same $\\Delta p$</strong> over a longer time lowers the average force.</li><li><strong>Constant engine power:</strong> with no drag, $a = P/(mv)$ falls as the car speeds up. With drag, the top speed is where $P = F_{\\rm drag}v$.</li></ul>",
    note: "Supplemental."
  },
  {
    id: "supp-rutherford-scattering",
    eq: "supp",
    topic: "at",
    tag: "Rutherford scattering",
    name: "Rutherford scattering and the nucleus (supplemental)",
    front: "A projectile of charge $ze$ and kinetic energy $E_k$ (for example an $\\alpha$ particle, $z = 2$) scatters off a nucleus of charge $Ze$. How does $d\\sigma/d\\Omega$ depend on $E_k$ and the scattering angle $\\theta$, and what did the gold-foil results reveal?",
    back: "$$\\frac{d\\sigma}{d\\Omega} \\propto \\frac{(zZe^2)^2}{E_k^2\\sin^4(\\theta/2)}$$<p class=\"card-key\"><strong>At fixed $\\theta$, doubling $E_k$ cuts the rate by $4$.</strong></p><ul class=\"recall-list\"><li><strong>Gold-foil results:</strong> most $\\alpha$ particles pass nearly undeflected, but a rare few scatter through large angles, some almost straight back.</li><li><strong>Nucleus:</strong> only a small, massive, positive nucleus holding nearly all the atom's mass can do that. A spread-out charge cannot.</li></ul>",
    note: "Supplemental — Kahn §7.4.1, p.139, mentions Rutherford's gold-foil experiment as the discovery of the nucleus but gives no cross-section."
  },
  {
    id: "supp-magnetic-materials",
    kind: "list",
    eq: "supp",
    topic: "em",
    tag: "Magnetic materials",
    name: "Diamagnetic, paramagnetic, ferromagnetic cores (supplemental list)",
    front: "A solenoid core gives $B = \\mu_r\\mu_0 nI$ with $\\mu_r = 1 + \\chi_m$. Give the sign and size of $\\chi_m$ for diamagnetic, paramagnetic and ferromagnetic cores, and say whether any core can reverse $B$. (4)",
    back: "<ul class=\"recall-list\"><li><strong>Diamagnetic:</strong> $\\chi_m \\lt 0$, tiny, so $\\mu_r$ is just below $1$ and $B$ drops slightly.<br>The applied field changes the electron orbits, which induce a moment against it (Lenz's law).<br>Every material has this.</li><li><strong>Paramagnetic:</strong> $\\chi_m \\gt 0$, tiny, so $\\mu_r$ is just above $1$ and $B$ rises slightly.<br>Permanent moments from unpaired electrons partly align with the field.<br>Thermal motion limits the alignment.</li><li><strong>Ferromagnetic:</strong> $\\chi_m \\gg 1$, so $B$ rises many times.<br>Exchange coupling aligns spins inside domains, and the domains turn toward the applied field.</li><li><strong>Reversing $B$:</strong> no core reverses $B$, because $\\mu_r$ cannot fall below $0$ (a superconductor reaches $0$).<br>An answer with $B$ opposite to the coil's own field is wrong.</li></ul>",
    note: "Supplemental."
  },
  {
    id: "supp-charge-integral-origin",
    eq: "supp",
    topic: "em",
    tag: "Electrostatics",
    name: "Where to put the origin in a charge-distribution integral (supplemental)",
    front: "You integrate $dE$ or $dV$ over a charged body. Where do you put the origin (a) for a straight rod with the field point on the rod's extension line, and (b) for a ring, cylinder or sphere, or when you need $E(\\mathbf{r})$ at an arbitrary point $\\mathbf{r}$?",
    back: "$$E = \\int_{d}^{d+L} \\frac{k\\lambda\\,dx}{x^2} = k\\lambda\\left(\\frac{1}{d} - \\frac{1}{d+L}\\right)$$<p class=\"card-key\"><strong>Rod's extension line: origin at the field point. Otherwise: center of symmetry.</strong></p><ul class=\"recall-list\"><li><strong>(a) Rod, extension line:</strong> the distance to each element $dq = \\lambda\\,dx$ is just $x$, and the limits are the near and far distances.</li><li><strong>(b) Ring, cylinder or sphere:</strong> the field point $\\mathbf{r}$ stays a variable and symmetry cancels the transverse components.</li><li><strong>Ring's axis:</strong> $E_z = \\dfrac{kQz}{(z^2+R^2)^{3/2}}$.</li></ul>",
    note: "Supplemental."
  }
];
