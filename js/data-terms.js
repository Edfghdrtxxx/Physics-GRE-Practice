/* Term explanations for Recall cards, shown by js/term-tip.js as a dotted
   underline with a hover popover. One entry:
     match  phrases to underline in card text (case-insensitive, whole words,
            a trailing "s"/"es" also matches)
     tex    KaTeX sources to underline as a whole formula (spaces and \tag{}
            ignored), e.g. 'f_0'
     tip    the explanation; HTML with $…$ math
     cards  optional card ids the entry is limited to; omit for every card
   Rules for a tip: define the term in plain words and say what each symbol
   is. Never state the card's answer: the same word may sit on the question
   face. A symbol means different things on different cards, so every tex
   entry carries cards. Entries for book cards (cpgf-/cpgl- ids) go in the
   gitignored content/bank/cpg-terms.js, which pushes onto PGRE.CARD_TERMS. */
window.PGRE = window.PGRE || {};
PGRE.CARD_TERMS = PGRE.CARD_TERMS || [];

PGRE.CARD_TERMS.push(
  /* ——— Every card ——— */
  {
    match: ['supplemental'],
    tip: 'A card written for this Studio. It is not one of the numbered equations in Kahn\'s book <em>Conquering the Physics GRE</em>; it fills a gap the GRE tests.'
  },
  {
    match: ['pure tone'],
    tip: 'A sound of a single frequency $f$: the air pressure at the ear varies as $\\cos(2\\pi f t)$. A tuning fork gives a nearly pure tone.'
  },
  {
    match: ['beat frequency', 'beat rate'],
    tip: 'How many times per second the combined sound of two tones of slightly different frequency swells to a loudness maximum. Unit: hertz ($\\mathrm{Hz}$), one per second.'
  },
  {
    match: ['loudness maxima', 'loudness peak'],
    tip: 'The moments when the combined sound is loudest. At these moments the two waves are in phase (their crests line up), so they add. Halfway between two maxima they are out of phase and nearly cancel.'
  },
  {
    match: ['tightening a string', 'tighten the string'],
    tip: 'Raising the tension $T$. The wave speed on the string is $v = \\sqrt{T/\\mu}$, where $\\mu$ is the mass per unit length, and the fundamental frequency is $f = v/(2L)$ for length $L$. So $f$ grows as $\\sqrt{T}$.'
  },

  /* ——— supp-coaxial: Coaxial cable capacitance and inductance per length ——— */
  {
    cards: ['supp-coaxial'],
    tex: ['a'],
    tip: '$a$: the radius of the inner conductor, the central wire.'
  },
  {
    cards: ['supp-coaxial'],
    tex: ['b'],
    tip: '$b$: the radius of the outer conductor, the cylindrical tube around the wire. The filling occupies the space between radius $a$ and radius $b$.'
  },
  {
    cards: ['supp-coaxial'],
    tex: ['\\epsilon'],
    tip: '$\\epsilon$: the permittivity of the material that fills the space between the conductors. In vacuum it equals $\\epsilon_0$.'
  },
  {
    cards: ['supp-coaxial'],
    tex: ['\\mu'],
    tip: '$\\mu$: the permeability of the filling material. In vacuum it equals $\\mu_0$.'
  },
  {
    cards: ['supp-coaxial'],
    tex: ['\\ln(b/a)'],
    tip: '$\\ln(b/a)$: the natural logarithm of the ratio of the outer radius $b$ to the inner radius $a$.'
  },
  {
    cards: ['supp-coaxial'],
    tex: ['E = \\lambda/(2\\pi\\epsilon r)'],
    tip: '$E$: the radial electric field at distance $r$ from the axis. $\\lambda$: the charge per unit length on the inner conductor. $\\epsilon$: the permittivity of the filling.'
  },
  {
    cards: ['supp-coaxial'],
    tex: ['B = \\mu I/(2\\pi r)'],
    tip: '$B$: the magnetic field at distance $r$ from the axis; it circles the axis. $I$: the current in the inner conductor, which returns along the outer one. $\\mu$: the permeability of the filling.'
  },
  {
    cards: ['supp-coaxial'],
    tex: ['E'],
    tip: '$E$: the size of the radial electric field between the conductors.'
  },
  {
    cards: ['supp-coaxial'],
    tex: ['V = (\\lambda/2\\pi\\epsilon)\\ln(b/a)'],
    tip: '$V$: the potential difference between the inner and the outer conductor. $\\lambda$: the charge per unit length on the inner conductor. $\\epsilon$: the permittivity of the filling.'
  },
  {
    cards: ['supp-coaxial'],
    tex: ['C/\\ell = \\lambda/V'],
    tip: '$C/\\ell$: the capacitance per unit length of cable. $\\lambda$: the charge per unit length on the inner conductor. $V$: the potential difference between the conductors.'
  },
  {
    cards: ['supp-coaxial'],
    match: ['coaxial cable'],
    tip: 'A cable made of a central wire inside a conducting cylindrical tube that shares its axis. An insulating filling occupies the space between the two conductors.'
  },
  {
    cards: ['supp-coaxial'],
    match: ['capacitance'],
    tip: 'The charge a pair of conductors holds per unit potential difference between them, $C = Q/V$. Unit: farad ($\\mathrm{F}$).'
  },
  {
    cards: ['supp-coaxial'],
    match: ['inductance'],
    tip: 'The magnetic flux through a circuit per unit current in it, $L = \\Phi/I$. Unit: henry ($\\mathrm{H}$).'
  },
  {
    cards: ['supp-coaxial'],
    match: ['permittivity'],
    tip: 'The material constant $\\epsilon$ in Gauss\'s law for a linear insulator, $\\oint \\epsilon\\mathbf{E}\\cdot d\\mathbf{A} = Q_{\\text{free}}$. In vacuum it equals $\\epsilon_0$.'
  },
  {
    cards: ['supp-coaxial'],
    match: ['permeability'],
    tip: 'The material constant $\\mu$ in Ampère\'s law for a uniform linear magnetic material, $\\oint \\mathbf{B}\\cdot d\\mathbf{l} = \\mu I_{\\text{free}}$. In vacuum it equals $\\mu_0$.'
  },

  /* ——— supp-pec-reflect: Normal reflection from a perfect conductor ——— */
  {
    cards: ['supp-pec-reflect', 'supp-em-triad'],
    tex: ['\\mathbf{E}'],
    tip: '$\\mathbf{E}$: the electric field vector of the wave.'
  },
  {
    cards: ['supp-pec-reflect', 'supp-em-triad'],
    tex: ['\\mathbf{B}'],
    tip: '$\\mathbf{B}$: the magnetic field vector of the wave.'
  },
  {
    cards: ['supp-pec-reflect', 'supp-em-triad'],
    tex: ['\\hat{\\mathbf{k}}'],
    tip: '$\\hat{\\mathbf{k}}$: the unit vector along the direction in which the wave travels.'
  },
  {
    cards: ['supp-pec-reflect'],
    tex: ['\\mathbf{E} = \\mathbf{B} = 0'],
    tip: '$\\mathbf{E}$, $\\mathbf{B}$: the electric and magnetic fields inside the conductor.'
  },
  {
    cards: ['supp-pec-reflect'],
    tex: ['\\mathbf{B} = \\hat{\\mathbf{k}}\\times\\mathbf{E}/c'],
    tip: '$\\mathbf{B}$: the magnetic field of the wave. $\\hat{\\mathbf{k}}$: the unit vector along its direction of travel. $\\mathbf{E}$: its electric field. $c$: the speed of light in vacuum. $\\times$: the cross product.'
  },
  {
    cards: ['supp-pec-reflect'],
    match: ['perfect conductor'],
    tip: 'An ideal conductor with infinite conductivity: current flows in it with no resistance at all.'
  },
  {
    cards: ['supp-pec-reflect'],
    match: ['normal incidence'],
    tip: 'The wave arrives travelling perpendicular to the surface, so the angle of incidence is $0$.'
  },
  {
    cards: ['supp-pec-reflect', 'supp-em-triad'],
    match: ['plane EM wave', 'plane wave'],
    tip: 'A wave whose fields have the same value at every point of each plane perpendicular to its direction of travel. Its wavefronts are flat planes.'
  },
  {
    cards: ['supp-pec-reflect'],
    match: ['tangential'],
    tip: 'Parallel to the surface. A field splits into a tangential part, along the surface, and a normal part, perpendicular to it.'
  },
  {
    cards: ['supp-pec-reflect'],
    match: ['transmitted'],
    tip: 'Carried through the surface into the material on the other side.'
  },

  /* ——— supp-em-triad: Plane-wave direction and its magnetic field ——— */
  {
    cards: ['supp-em-triad'],
    tex: ['\\mathbf{E} = E_0\\cos(kx - \\omega t)\\,\\hat{\\mathbf{y}}'],
    tip: '$\\mathbf{E}$: the electric field of the wave. $E_0$: its amplitude. $k$: the wave number, $2\\pi$ divided by the wavelength. $\\omega$: the angular frequency. $\\hat{\\mathbf{y}}$: the unit vector along $y$, the direction in which $\\mathbf{E}$ points.'
  },
  {
    cards: ['supp-em-triad'],
    tex: ['\\mathbf{E}\\times\\mathbf{B}'],
    tip: 'The cross product of the electric field $\\mathbf{E}$ and the magnetic field $\\mathbf{B}$: a vector perpendicular to both. Divided by $\\mu_0$ it is the Poynting vector, the energy flux of the wave.'
  },
  {
    cards: ['supp-em-triad'],
    tex: ['kx - \\omega t'],
    tip: 'The phase of the wave at position $x$ and time $t$. $k$: the wave number; $\\omega$: the angular frequency.'
  },
  {
    cards: ['supp-em-triad'],
    tex: ['kx + \\omega t'],
    tip: 'The phase of a wave with the same $k$ and $\\omega$ but the opposite sign in front of $\\omega t$.'
  },
  {
    cards: ['supp-em-triad'],
    tex: ['+x'],
    tip: '$+x$: the direction of increasing $x$.'
  },
  {
    cards: ['supp-em-triad'],
    tex: ['-x'],
    tip: '$-x$: the direction of decreasing $x$.'
  },
  {
    cards: ['supp-em-triad'],
    match: ['vacuum'],
    tip: 'Empty space with no charges, no currents and no material. A wave there travels at the speed of light $c$.'
  },
  {
    cards: ['supp-em-triad'],
    match: ['right-handed set'],
    tip: 'Three vectors oriented like the axes $\\hat{\\mathbf{x}}$, $\\hat{\\mathbf{y}}$, $\\hat{\\mathbf{z}}$: the cross product of the first with the second points along the third.'
  },
  {
    cards: ['supp-em-triad'],
    match: ['direction of travel'],
    tip: 'The direction in which the crests of the wave move as time increases.'
  },
  {
    cards: ['supp-em-triad'],
    match: ['reflected wave'],
    tip: 'The wave sent back from a surface that the original wave hits.'
  },

  /* ——— supp-moment-of-inertia: Moments of inertia — standard geometries ——— */
  {
    cards: ['supp-moment-of-inertia'],
    tex: ['M'],
    tip: '$M$: the total mass of the object.'
  },
  {
    cards: ['supp-moment-of-inertia'],
    tex: ['R'],
    tip: '$R$: the radius of the hoop, shell, disk or sphere.'
  },
  {
    cards: ['supp-moment-of-inertia'],
    tex: ['I'],
    tip: '$I$: the moment of inertia about the axis named in that row.'
  },
  {
    cards: ['supp-moment-of-inertia'],
    tex: ['I = MR^2', 'I = \\frac{1}{2}MR^2', 'I = \\frac{2}{3}MR^2', 'I = \\frac{2}{5}MR^2', 'I = \\frac{1}{12}ML^2', 'I = \\frac{1}{3}ML^2'],
    tip: '$I$: the moment of inertia about the axis in that row. $M$: the mass. $R$: the radius. $L$: the length of the rod.'
  },
  {
    cards: ['supp-moment-of-inertia'],
    tex: ['L'],
    tip: '$L$: the length of the thin rod.'
  },
  {
    cards: ['supp-moment-of-inertia'],
    tex: ['\\perp'],
    tip: '$\\perp$: perpendicular to.'
  },
  {
    cards: ['supp-moment-of-inertia'],
    tex: ['\\tfrac{1}{12}ML^2 + M(L/2)^2'],
    tip: 'The parallel-axis theorem for the rod. $\\tfrac{1}{12}ML^2$: its moment of inertia about its centre. $M$: its mass. $L/2$: the distance from the centre to the axis at the end.'
  },
  {
    cards: ['supp-moment-of-inertia'],
    match: ['moment of inertia', 'moments of inertia'],
    tip: 'The rotational counterpart of mass: $I = \\sum_i m_i r_i^2$, where $r_i$ is the distance of the mass $m_i$ from the rotation axis. The rotational kinetic energy is $\\tfrac{1}{2}I\\omega^2$.'
  },
  {
    cards: ['supp-moment-of-inertia'],
    match: ['central symmetry axis', 'symmetry axis'],
    tip: 'An axis through the centre of mass about which the object looks the same after any rotation. For a hoop or a disk it is the axis perpendicular to its plane.'
  },
  {
    cards: ['supp-moment-of-inertia'],
    match: ['hoop'],
    tip: 'A thin circular ring of radius $R$, with its mass spread evenly around the circle.'
  },
  {
    cards: ['supp-moment-of-inertia'],
    match: ['spherical shell'],
    tip: 'A thin hollow sphere of radius $R$, with its mass spread evenly over the surface.'
  },
  {
    cards: ['supp-moment-of-inertia'],
    match: ['solid disk'],
    tip: 'A flat, uniform circular plate of radius $R$.'
  },
  {
    cards: ['supp-moment-of-inertia'],
    match: ['solid sphere'],
    tip: 'A ball of radius $R$ with its mass spread uniformly through its volume.'
  },
  {
    cards: ['supp-moment-of-inertia'],
    match: ['thin rod'],
    tip: 'A uniform straight rod of length $L$ whose thickness is negligible.'
  },
  {
    cards: ['supp-moment-of-inertia'],
    match: ['parallel-axis theorem'],
    tip: 'For an axis parallel to one through the centre of mass and a distance $d$ from it, $I = I_{\\text{cm}} + Md^2$.'
  },

  /* ——— supp-nuclear-force-range: Characteristic range of the nuclear force ——— */
  {
    cards: ['supp-nuclear-force-range', 'supp-coulomb-coupling'],
    tex: ['1\\ \\mathrm{fm}'],
    tip: '$1\\ \\mathrm{fm}$: one femtometre, $10^{-15}\\ \\mathrm{m}$, also called one fermi.'
  },
  {
    cards: ['supp-nuclear-force-range'],
    tex: ['\\sim 10^{-10}\\ \\mathrm{m}'],
    tip: '$\\sim$: of the order of. $10^{-10}\\ \\mathrm{m}$ is $0.1\\ \\mathrm{nm}$, also called one angstrom.'
  },
  {
    cards: ['supp-nuclear-force-range'],
    tex: ['\\sim 10^{-15}\\ \\mathrm{m}'],
    tip: '$\\sim$: of the order of. $10^{-15}\\ \\mathrm{m}$ is one femtometre ($\\mathrm{fm}$).'
  },
  {
    cards: ['supp-nuclear-force-range', 'supp-coulomb-coupling'],
    tex: ['\\hbar c \\approx 200\\ \\mathrm{MeV\\cdot fm}', '\\hbar c \\approx 197\\ \\mathrm{MeV\\cdot fm}'],
    tip: '$\\hbar$: the reduced Planck constant, $h/2\\pi$. $c$: the speed of light. Their product is an energy times a length, so it converts between energies in $\\mathrm{MeV}$ and lengths in $\\mathrm{fm}$.'
  },
  {
    cards: ['supp-nuclear-force-range'],
    match: ['strong nuclear force'],
    tip: 'The force that binds protons and neutrons into nuclei. It acts between nucleons whatever their electric charge.'
  },
  {
    cards: ['supp-nuclear-force-range'],
    match: ['Coulomb repulsion'],
    tip: 'The electric force that pushes two like charges apart. For two protons a distance $r$ apart its size is $e^2/(4\\pi\\epsilon_0 r^2)$.'
  },
  {
    cards: ['supp-nuclear-force-range'],
    match: ['pion exchange'],
    tip: 'The strong attraction between nucleons arises from the exchange of pions, mesons with a rest energy of about $140\\ \\mathrm{MeV}$. Because the exchanged particle has mass, the force falls off exponentially with distance.'
  },
  {
    cards: ['supp-nuclear-force-range'],
    match: ['die off exponentially'],
    tip: 'Fall with distance $r$ roughly as $e^{-r/r_0}$, where $r_0$ is the range. Each further distance $r_0$ divides the strength by about $e \\approx 2.7$.'
  },
  {
    cards: ['supp-nuclear-force-range'],
    match: ['scale anchors'],
    tip: 'Typical sizes to compare a computed length with.'
  },
  {
    cards: ['supp-nuclear-force-range'],
    match: ['characteristic range'],
    tip: 'The distance beyond which a force becomes negligible.'
  },

  /* ——— supp-coulomb-coupling: Coulomb coupling in natural fm·MeV units ——— */
  {
    cards: ['supp-coulomb-coupling'],
    tex: ['e^2/(4\\pi\\epsilon_0)'],
    tip: '$e$: the elementary charge, the size of the proton\'s charge. $\\epsilon_0$: the permittivity of free space.'
  },
  {
    cards: ['supp-coulomb-coupling'],
    tex: ['\\mathrm{MeV\\cdot fm}'],
    tip: '$\\mathrm{MeV\\cdot fm}$: mega-electronvolt times femtometre, an energy times a length. It suits nuclear distances.'
  },
  {
    cards: ['supp-coulomb-coupling'],
    tex: ['\\mathrm{eV\\cdot nm}'],
    tip: '$\\mathrm{eV\\cdot nm}$: electronvolt times nanometre, an energy times a length. It suits atomic distances.'
  },
  {
    cards: ['supp-coulomb-coupling'],
    tex: ['\\alpha'],
    tip: '$\\alpha$: the fine-structure constant, a pure number that measures the strength of the electromagnetic interaction.'
  },
  {
    cards: ['supp-coulomb-coupling'],
    tex: ['\\hbar c'],
    tip: '$\\hbar$: the reduced Planck constant, $h/2\\pi$. $c$: the speed of light in vacuum.'
  },
  {
    cards: ['supp-coulomb-coupling'],
    tex: ['r'],
    tip: '$r$: the distance between the two charges.'
  },
  {
    cards: ['supp-coulomb-coupling'],
    tex: ['U \\approx 1.44\\ \\mathrm{MeV\\cdot fm}/r'],
    tip: '$U$: the electrostatic potential energy of the two charges. $r$: their separation, here in $\\mathrm{fm}$.'
  },
  {
    cards: ['supp-coulomb-coupling'],
    tex: ['1.4\\ \\mathrm{MeV}'],
    tip: '$\\mathrm{MeV}$: mega-electronvolt, $10^6\\ \\mathrm{eV}$.'
  },
  {
    cards: ['supp-coulomb-coupling'],
    tex: ['0.1\\ \\mathrm{nm}'],
    tip: '$0.1\\ \\mathrm{nm}$: a tenth of a nanometre, $10^{-10}\\ \\mathrm{m}$, a typical atomic size.'
  },
  {
    cards: ['supp-coulomb-coupling'],
    tex: ['14\\ \\mathrm{eV}'],
    tip: '$\\mathrm{eV}$: electronvolt, the energy one elementary charge gains across a potential difference of one volt, about $1.6\\times10^{-19}\\ \\mathrm{J}$.'
  },
  {
    cards: ['supp-coulomb-coupling'],
    tex: ['\\alpha \\approx 1/137'],
    tip: '$\\alpha$: the fine-structure constant.'
  },
  {
    cards: ['supp-coulomb-coupling'],
    match: ['Coulomb coupling'],
    tip: 'The constant that sets the strength of the electric force between two elementary charges: their potential energy is this constant divided by their separation.'
  },
  {
    cards: ['supp-coulomb-coupling'],
    match: ['elementary charge'],
    tip: 'The size of the charge of one proton, $e \\approx 1.6\\times 10^{-19}\\ \\mathrm{C}$. An electron carries $-e$.'
  },
  {
    cards: ['supp-coulomb-coupling'],
    match: ['nuclear scale'],
    tip: 'Distances of the order of $1\\ \\mathrm{fm}$, the size of a nucleus.'
  },
  {
    cards: ['supp-coulomb-coupling'],
    match: ['atomic scale'],
    tip: 'Distances of the order of $0.1\\ \\mathrm{nm}$, the size of an atom.'
  },

  /* ——— supp-energy-phase: Energy-eigenstate time phase ——— */
  {
    cards: ['supp-energy-phase'],
    tex: ['E_n'],
    tip: '$E_n$: the energy of the $n$-th energy eigenstate, an eigenvalue of the Hamiltonian $\\hat{H}$.'
  },
  {
    cards: ['supp-energy-phase'],
    tex: ['E_1', 'E_2'],
    tip: '$E_1$, $E_2$: the energies of the two eigenstates that make up the superposition.'
  },
  {
    cards: ['supp-energy-phase'],
    tex: ['P(E_n) = |c_n|^2'],
    tip: '$P(E_n)$: the probability that an energy measurement gives $E_n$. $c_n$: the coefficient of $\\psi_n$ when the state is written as a sum of energy eigenstates.'
  },
  {
    cards: ['supp-energy-phase'],
    tex: ['\\omega = (E_2 - E_1)/\\hbar'],
    tip: '$\\omega$: an angular frequency, in radians per second. $E_2 - E_1$: the energy difference of the two levels. $\\hbar$: the reduced Planck constant.'
  },
  {
    cards: ['supp-energy-phase'],
    tex: ['\\langle x\\rangle'],
    tip: '$\\langle x\\rangle$: the expectation value of position, the average of many position measurements on identically prepared systems.'
  },
  {
    cards: ['supp-energy-phase'],
    tex: ['i\\hbar\\,\\partial_t\\Psi = \\hat{H}\\Psi'],
    tip: 'The time-dependent Schrödinger equation. $\\Psi$: the wavefunction. $\\hat{H}$: the Hamiltonian, the operator for total energy. $\\partial_t$: the partial derivative with respect to time.'
  },
  {
    cards: ['supp-energy-phase'],
    tex: ['\\hat{H}\\psi = E\\psi'],
    tip: 'The time-independent Schrödinger equation: $\\psi$ is an energy eigenstate and $E$ is its energy.'
  },
  {
    cards: ['supp-energy-phase'],
    tex: ['f(t)'],
    tip: '$f(t)$: the time-dependent factor when the solution is written as a product $\\Psi(x,t) = \\psi(x)\\,f(t)$.'
  },
  {
    cards: ['supp-energy-phase'],
    tex: ['i\\hbar\\,f\' = Ef'],
    tip: 'The equation for $f(t)$ after separating variables. $f\'$: the time derivative $df/dt$. $E$: the energy of the eigenstate.'
  },
  {
    cards: ['supp-energy-phase'],
    tex: ['e^{-E/k_B T}'],
    tip: '$E$: the energy of a state. $k_B$: the Boltzmann constant. $T$: the absolute temperature.'
  },
  {
    cards: ['supp-energy-phase'],
    match: ['time-independent Hamiltonian'],
    tip: 'A Hamiltonian $\\hat{H}$, the operator for total energy, that does not depend explicitly on time.'
  },
  {
    cards: ['supp-energy-phase', 'supp-infinite-well'],
    match: ['superposition'],
    tip: 'A sum of states with complex coefficients, such as $c_1\\psi_1 + c_2\\psi_2$.'
  },
  {
    cards: ['supp-energy-phase', 'supp-small-oscillation'],
    match: ['angular frequency'],
    tip: 'The rate of change of a phase, $\\omega = 2\\pi f$ for a frequency $f$, in radians per second.'
  },
  {
    cards: ['supp-energy-phase'],
    match: ['relative phase'],
    tip: 'The difference between the complex phases of the two coefficients, for example $\\arg c_2 - \\arg c_1$.'
  },
  {
    cards: ['supp-energy-phase'],
    match: ['Boltzmann weight'],
    tip: 'The relative probability $e^{-E/k_B T}$ of a state of energy $E$ in thermal equilibrium at temperature $T$.'
  },
  {
    cards: ['supp-energy-phase'],
    match: ['modulus'],
    tip: 'The absolute value $|z|$ of a complex number $z$.'
  },
  {
    cards: ['supp-energy-phase'],
    match: ['observables'],
    tip: 'Measurable quantities, such as position or energy. Each one is represented by a Hermitian operator.'
  },
  {
    cards: ['supp-energy-phase', 'supp-ho-moments'],
    match: ['energy eigenstate'],
    tip: 'A state with a definite energy: the Hamiltonian $\\hat{H}$ acting on it gives the same state times its energy, $\\hat{H}\\psi_n = E_n\\psi_n$.'
  },

  /* ——— supp-sho-ladder: Harmonic-oscillator ladder operators ——— */
  {
    cards: ['supp-sho-ladder'],
    tex: ['a'],
    tip: '$a$: the lowering operator. Acting on the energy eigenstate $|n\\rangle$, it gives a multiple of $|n-1\\rangle$.'
  },
  {
    cards: ['supp-sho-ladder'],
    tex: ['a^{\\dagger}'],
    tip: '$a^{\\dagger}$: the raising operator, the Hermitian adjoint of $a$. Acting on $|n\\rangle$, it gives a multiple of $|n+1\\rangle$.'
  },
  {
    cards: ['supp-sho-ladder'],
    tex: ['\\hat{x}'],
    tip: '$\\hat{x}$: the position operator.'
  },
  {
    cards: ['supp-sho-ladder'],
    tex: ['\\hat{p}'],
    tip: '$\\hat{p}$: the momentum operator, $-i\\hbar\\,d/dx$ in position space.'
  },
  {
    cards: ['supp-sho-ladder'],
    tex: ['\\hat{x} = \\sqrt{\\frac{\\hbar}{2m\\omega}}\\,(a + a^{\\dagger})', '\\hat{p} = i\\sqrt{\\frac{\\hbar m\\omega}{2}}\\,(a^{\\dagger} - a)'],
    tip: '$\\hat{x}$, $\\hat{p}$: the position and momentum operators. $a$, $a^{\\dagger}$: the lowering and raising operators. $m$: the mass. $\\omega$: the angular frequency of the oscillator. $\\hbar$: the reduced Planck constant.'
  },
  {
    cards: ['supp-sho-ladder'],
    tex: ['n'],
    tip: '$n$: the level number of the oscillator eigenstate $|n\\rangle$, which has energy $(n+\\tfrac{1}{2})\\hbar\\omega$.'
  },
  {
    cards: ['supp-sho-ladder'],
    tex: ['n \\pm 1'],
    tip: '$n \\pm 1$: the levels one step above and one step below level $n$.'
  },
  {
    cards: ['supp-sho-ladder'],
    tex: ['\\langle n|\\hat{x}|n\\rangle = 0'],
    tip: '$\\langle n|\\hat{x}|n\\rangle$: the expectation value of the position operator $\\hat{x}$ in the eigenstate $|n\\rangle$.'
  },
  {
    cards: ['supp-sho-ladder'],
    match: ['ladder operators'],
    tip: 'Operators that move an oscillator eigenstate one level up or down: the raising operator $a^{\\dagger}$ and the lowering operator $a$.'
  },
  {
    cards: ['supp-sho-ladder', 'supp-ho-moments'],
    match: ['harmonic-oscillator', 'oscillator'],
    tip: 'A particle of mass $m$ in the potential $V = \\tfrac{1}{2}m\\omega^2x^2$, where $\\omega$ is the angular frequency of its classical oscillation.'
  },
  {
    cards: ['supp-sho-ladder'],
    match: ['links'],
    tip: 'An operator links level $n$ to level $m$ when its matrix element between them, such as $\\langle m|\\hat{x}|n\\rangle$, is not zero.'
  },

  /* ——— supp-ho-moments: Harmonic-oscillator energy shares ——— */
  {
    cards: ['supp-ho-moments'],
    tex: ['|n\\rangle'],
    tip: '$|n\\rangle$: the $n$-th energy eigenstate of the oscillator, $n = 0, 1, 2, \\ldots$'
  },
  {
    cards: ['supp-ho-moments'],
    tex: ['E_n = \\hbar\\omega\\left(n+\\frac{1}{2}\\right)'],
    tip: '$E_n$: the energy of level $n$. $\\hbar$: the reduced Planck constant. $\\omega$: the angular frequency of the oscillator.'
  },
  {
    cards: ['supp-ho-moments'],
    tex: ['\\langle T\\rangle_n'],
    tip: '$\\langle T\\rangle_n$: the expectation value of the kinetic energy in the state $|n\\rangle$.'
  },
  {
    cards: ['supp-ho-moments'],
    tex: ['\\langle V\\rangle_n'],
    tip: '$\\langle V\\rangle_n$: the expectation value of the potential energy in the state $|n\\rangle$.'
  },
  {
    cards: ['supp-ho-moments'],
    tex: ['\\langle p^2\\rangle_n'],
    tip: '$\\langle p^2\\rangle_n$: the expectation value of the square of the momentum in the state $|n\\rangle$.'
  },
  {
    cards: ['supp-ho-moments'],
    tex: ['\\langle x^2\\rangle_n'],
    tip: '$\\langle x^2\\rangle_n$: the expectation value of the square of the position, measured from the centre of the potential, in the state $|n\\rangle$.'
  },
  {
    cards: ['supp-ho-moments'],
    tex: ['T = p^2/(2m)'],
    tip: '$T$: the kinetic energy. $p$: the momentum. $m$: the mass.'
  },
  {
    cards: ['supp-ho-moments'],
    tex: ['m E_n'],
    tip: '$m$: the mass of the particle. $E_n$: the energy of level $n$.'
  },
  {
    cards: ['supp-ho-moments'],
    tex: ['\\langle n|\\hat{p}^2|n\\rangle'],
    tip: 'The expectation value of $\\hat{p}^2$, the square of the momentum operator, in the state $|n\\rangle$.'
  },
  {
    cards: ['supp-ho-moments'],
    tex: ['\\hat{p}^2|n\\rangle'],
    tip: 'The state obtained by applying $\\hat{p}^2$, the square of the momentum operator, to $|n\\rangle$.'
  },
  {
    cards: ['supp-ho-moments'],
    tex: ['|n\\pm 2\\rangle'],
    tip: 'The oscillator eigenstates two levels above and two levels below $n$.'
  },
  {
    cards: ['supp-ho-moments'],
    match: ['eigenvalue'],
    tip: 'A number $\\lambda$ with $\\hat{A}|\\phi\\rangle = \\lambda|\\phi\\rangle$ for some state $|\\phi\\rangle$: the operator returns the same state multiplied by $\\lambda$.'
  },
  {
    cards: ['supp-ho-moments'],
    match: ['energy shares'],
    tip: 'How the energy $E_n$ divides, on average, between kinetic and potential energy.'
  },
  {
    cards: ['supp-ho-moments'],
    match: ['kinetic energy'],
    tip: 'The energy of motion, $T = p^2/(2m)$ for momentum $p$ and mass $m$.'
  },

  /* ——— supp-virial: Virial theorem ——— */
  {
    cards: ['supp-virial'],
    tex: ['V \\propto r^k'],
    tip: '$V$: the potential energy. $r$: the distance from the centre of force. $k$: the power of $r$ in the potential. $\\propto$: proportional to.'
  },
  {
    cards: ['supp-virial'],
    tex: ['\\langle T\\rangle'],
    tip: '$\\langle T\\rangle$: the expectation value of the kinetic energy in the bound state.'
  },
  {
    cards: ['supp-virial'],
    tex: ['\\langle V\\rangle'],
    tip: '$\\langle V\\rangle$: the expectation value of the potential energy in the bound state.'
  },
  {
    cards: ['supp-virial'],
    tex: ['E'],
    tip: '$E$: the total energy of the bound state, its energy eigenvalue.'
  },
  {
    cards: ['supp-virial'],
    tex: ['k = -1'],
    tip: '$k = -1$: the potential falls as $1/r$, as for the Coulomb or the gravitational potential.'
  },
  {
    cards: ['supp-virial'],
    tex: ['\\langle T\\rangle = -E', '\\langle V\\rangle = 2E'],
    tip: '$\\langle T\\rangle$, $\\langle V\\rangle$: the mean kinetic and potential energies. $E$: the total energy, which is negative for a bound state in an attractive $1/r$ potential.'
  },
  {
    cards: ['supp-virial'],
    tex: ['E = \\langle T\\rangle + \\langle V\\rangle'],
    tip: 'The total energy $E$ as the sum of the mean kinetic energy $\\langle T\\rangle$ and the mean potential energy $\\langle V\\rangle$.'
  },
  {
    cards: ['supp-virial'],
    tex: ['k = 2'],
    tip: '$k = 2$: the potential grows as $r^2$, as for a harmonic oscillator.'
  },
  {
    cards: ['supp-virial'],
    tex: ['V \\propto x^k'],
    tip: '$V$: the potential energy. $x$: the position on the line. $k$: the power of $x$.'
  },
  {
    cards: ['supp-virial'],
    match: ['stationary state'],
    tip: 'An energy eigenstate. Its probability density does not change in time.'
  },
  {
    cards: ['supp-virial'],
    match: ['bound state'],
    tip: 'A state confined to a finite region by the potential, with energy below the value of the potential at large distance.'
  },
  {
    cards: ['supp-virial'],
    match: ['virial theorem'],
    tip: 'A relation between the average kinetic and potential energies of a system bound by a power-law potential.'
  },
  {
    cards: ['supp-virial'],
    match: ['operator identity'],
    tip: 'An equation between operators that holds when applied to every state, not only to particular states.'
  },
  {
    cards: ['supp-virial'],
    match: ['long time average'],
    tip: 'The average of a quantity over a time much longer than the period of the motion.'
  },
  {
    cards: ['supp-virial'],
    match: ['expectation values'],
    tip: 'The average result of many measurements of a quantity on identically prepared systems, $\\langle A\\rangle = \\langle\\psi|\\hat{A}|\\psi\\rangle$.'
  },

  /* ——— supp-infinite-well: Infinite square well on 0 to L ——— */
  {
    cards: ['supp-infinite-well'],
    tex: ['0 \\lt x \\lt L'],
    tip: '$x$: the position. $L$: the width of the well. The potential is zero between the walls at $x = 0$ and $x = L$ and infinite outside.'
  },
  {
    cards: ['supp-infinite-well'],
    tex: ['E_n'],
    tip: '$E_n$: the energy of the $n$-th level of the well, counting from the lowest level.'
  },
  {
    cards: ['supp-infinite-well'],
    tex: ['\\psi_n'],
    tip: '$\\psi_n$: the wavefunction of the $n$-th energy eigenstate.'
  },
  {
    cards: ['supp-infinite-well'],
    tex: ['L'],
    tip: '$L$: the width of the well.'
  },
  {
    cards: ['supp-infinite-well'],
    tex: ['E_n \\propto n^2'],
    tip: '$E_n$: the energy of level $n$. $\\propto$: proportional to.'
  },
  {
    cards: ['supp-infinite-well'],
    tex: ['E_2 = 4E_1'],
    tip: '$E_1$: the ground-state energy. $E_2$: the energy of the first excited level.'
  },
  {
    cards: ['supp-infinite-well'],
    tex: ['\\psi_n = \\sqrt{2/L}\\,\\sin(n\\pi x/L)'],
    tip: '$\\psi_n$: the wavefunction of level $n$. $x$: the position. $\\sqrt{2/L}$: the normalization constant that makes $\\int_0^L |\\psi_n|^2\\,dx = 1$.'
  },
  {
    cards: ['supp-infinite-well'],
    tex: ['n-1'],
    tip: '$n-1$: one less than the level number $n$.'
  },
  {
    cards: ['supp-infinite-well'],
    tex: ['n'],
    tip: '$n$: the level number, $1$ for the ground state.'
  },
  {
    cards: ['supp-infinite-well'],
    tex: ['\\psi'],
    tip: '$\\psi$: the wavefunction of the particle at the moment the wall moves.'
  },
  {
    cards: ['supp-infinite-well'],
    tex: ['\\langle E\\rangle'],
    tip: '$\\langle E\\rangle$: the expectation value of the energy, the average of many energy measurements.'
  },
  {
    cards: ['supp-infinite-well'],
    tex: ['V = 0'],
    tip: '$V$: the potential energy, zero inside the original well.'
  },
  {
    cards: ['supp-infinite-well'],
    tex: ['\\psi \\neq 0'],
    tip: 'The region where the wavefunction $\\psi$ is not zero.'
  },
  {
    cards: ['supp-infinite-well'],
    tex: ['E_n/4'],
    tip: '$E_n/4$: the level energies of the doubled well, each a quarter of the old $E_n$ with the same $n$.'
  },
  {
    cards: ['supp-infinite-well'],
    match: ['infinite square well'],
    tip: 'A potential that is zero inside a region of width $L$ and infinite outside it, so the particle cannot leave the region.'
  },
  {
    cards: ['supp-infinite-well'],
    match: ['interior nodes'],
    tip: 'Points strictly between the walls where the wavefunction is zero. The zeros at the walls do not count.'
  },
  {
    cards: ['supp-infinite-well'],
    match: ['adiabatic'],
    tip: 'Slow compared with $\\hbar/\\Delta E$, where $\\Delta E$ is the energy gap to the neighbouring levels.'
  },
  {
    cards: ['supp-infinite-well'],
    match: ['suddenly'],
    tip: 'Fast compared with $\\hbar/\\Delta E$, where $\\Delta E$ is the energy gap to the neighbouring levels.'
  },
  {
    cards: ['supp-infinite-well'],
    match: ['weighted average'],
    tip: 'A sum of values, each multiplied by its probability. Here the probabilities are the squared overlaps $|c_m|^2$ of $\\psi$ with the new levels.'
  },

  /* ——— supp-newton-momentum: Collisions with a target at rest ——— */
  {
    cards: ['supp-newton-momentum'],
    tex: ['m_1'],
    tip: '$m_1$: the mass of the moving body.'
  },
  {
    cards: ['supp-newton-momentum'],
    tex: ['v'],
    tip: '$v$: the velocity of $m_1$ before the collision.'
  },
  {
    cards: ['supp-newton-momentum'],
    tex: ['m_2'],
    tip: '$m_2$: the mass of the body at rest.'
  },
  {
    cards: ['supp-newton-momentum'],
    tex: ['v_2\' - v_1\' = v', 'm_1 v = m_1 v_1\' + m_2 v_2\''],
    tip: 'Primes mark velocities after the collision: $v_1\'$ for $m_1$, $v_2\'$ for $m_2$. $v$: the velocity of $m_1$ before; $m_2$ starts at rest.'
  },
  {
    cards: ['supp-newton-momentum'],
    tex: ['K_0 = \\tfrac{1}{2}m_1v^2'],
    tip: '$K_0$: the kinetic energy before the collision, all carried by $m_1$.'
  },
  {
    cards: ['supp-newton-momentum'],
    tex: ['m_1 \\leftrightarrow m_2'],
    tip: 'Exchanging the two masses.'
  },
  {
    cards: ['supp-newton-momentum'],
    tex: ['m_1 = m_2'],
    tip: 'Equal masses.'
  },
  {
    cards: ['supp-newton-momentum'],
    tex: ['m_2 \\gg m_1'],
    tip: '$\\gg$: much greater than. The target is far heavier than the moving body.'
  },
  {
    cards: ['supp-newton-momentum'],
    tex: ['m_2 \\ll m_1'],
    tip: '$\\ll$: much less than. The target is far lighter than the moving body.'
  },
  {
    cards: ['supp-newton-momentum'],
    tex: ['v_1\' \\to -v', 'v_2\' \\to 0', 'v_2\' \\to 2v'],
    tip: '$v_1\'$, $v_2\'$: the final velocities of $m_1$ and $m_2$. $v$: the initial velocity of $m_1$. $\\to$: approaches, in the limit.'
  },
  {
    cards: ['supp-newton-momentum'],
    tex: ['\\approx 4m_1/m_2'],
    tip: 'The approximate fraction of the initial kinetic energy that $m_2$ receives when $m_2 \\gg m_1$.'
  },
  {
    cards: ['supp-newton-momentum'],
    tex: ['v\' = \\frac{m_1}{m_1 + m_2}\\,v'],
    tip: '$v\'$: the common velocity of the joined bodies after they stick. $v$: the initial velocity of $m_1$.'
  },
  {
    cards: ['supp-newton-momentum'],
    tex: ['\\tfrac{1}{2}\\mu v^2'],
    tip: '$\\mu$: the reduced mass. $v$: the initial relative velocity, which equals the velocity of $m_1$.'
  },
  {
    cards: ['supp-newton-momentum'],
    tex: ['\\mu = \\frac{m_1 m_2}{m_1 + m_2}'],
    tip: '$\\mu$: the reduced mass of the two bodies.'
  },
  {
    cards: ['supp-newton-momentum'],
    tex: ['m_2 \\approx m_1'],
    tip: 'The target nucleus has nearly the mass of the neutron, as a hydrogen nucleus does.'
  },
  {
    cards: ['supp-newton-momentum'],
    tex: ['m_2 \\approx 207\\,m_1'],
    tip: 'A lead nucleus is about $207$ times as heavy as a neutron.'
  },
  {
    cards: ['supp-newton-momentum'],
    match: ['elastic'],
    tip: 'Describes a collision in which the total kinetic energy is the same before and after.'
  },
  {
    cards: ['supp-newton-momentum'],
    match: ['head-on'],
    tip: 'Describes a collision along the line joining the two centres, so all motion stays on that line.'
  },
  {
    cards: ['supp-newton-momentum'],
    match: ['relative velocity'],
    tip: 'The velocity of one body as seen from the other, $v_2 - v_1$.'
  },
  {
    cards: ['supp-newton-momentum'],
    match: ['perfectly inelastic'],
    tip: 'Describes a collision in which the bodies stick together and move with one common velocity afterward.'
  },
  {
    cards: ['supp-newton-momentum'],
    match: ['centre-of-mass frame'],
    tip: 'The reference frame that moves with the centre of mass. In it the total momentum is zero.'
  },
  {
    cards: ['supp-newton-momentum'],
    match: ['glancing'],
    tip: 'Describes a collision that is not head-on: the bodies move off at angles to the original line of motion.'
  },
  {
    cards: ['supp-newton-momentum'],
    match: ['internal energy'],
    tip: 'Energy stored inside the bodies, such as heat, vibration or deformation, rather than in their motion as a whole.'
  },
  {
    cards: ['supp-newton-momentum'],
    match: ['neutron moderator'],
    tip: 'Material in a nuclear reactor that slows fast neutrons through collisions with its nuclei.'
  },

  /* ——— supp-friction: Friction and the incline ——— */
  {
    cards: ['supp-friction'],
    tex: ['\\theta'],
    tip: '$\\theta$: the angle of the incline above the horizontal.'
  },
  {
    cards: ['supp-friction'],
    tex: ['\\tan\\theta = \\mu_s'],
    tip: '$\\theta$: the incline angle. $\\mu_s$: the coefficient of static friction between the block and the surface.'
  },
  {
    cards: ['supp-friction'],
    tex: ['\\mu_s N'],
    tip: '$\\mu_s$: the coefficient of static friction. $N$: the normal force of the surface on the block.'
  },
  {
    cards: ['supp-friction'],
    tex: ['\\tan\\theta = \\mu_k'],
    tip: '$\\theta$: the incline angle. $\\mu_k$: the coefficient of kinetic friction between the block and the surface.'
  },
  {
    cards: ['supp-friction'],
    tex: ['a = g(\\sin\\theta - \\mu_k\\cos\\theta)'],
    tip: '$a$: the acceleration of the block down the slope. $g$: the gravitational acceleration. $\\theta$: the incline angle. $\\mu_k$: the coefficient of kinetic friction.'
  },
  {
    cards: ['supp-friction'],
    match: ['static friction'],
    tip: 'Friction between two surfaces that do not slide relative to each other.'
  },
  {
    cards: ['supp-friction'],
    match: ['kinetic friction'],
    tip: 'Friction between two surfaces that slide relative to each other.'
  },
  {
    cards: ['supp-friction'],
    match: ['incline'],
    tip: 'A flat surface tilted at an angle $\\theta$ to the horizontal.'
  },
  {
    cards: ['supp-friction'],
    match: ['slip'],
    tip: 'To start sliding along the surface.'
  },

  /* ——— supp-rocket: Rocket equation ——— */
  {
    cards: ['supp-rocket'],
    tex: ['u'],
    tip: '$u$: the speed of the exhaust relative to the rocket.'
  },
  {
    cards: ['supp-rocket'],
    tex: ['m_i'],
    tip: '$m_i$: the initial mass of the rocket, fuel included.'
  },
  {
    cards: ['supp-rocket'],
    tex: ['m_f'],
    tip: '$m_f$: the final mass of the rocket, after the burn.'
  },
  {
    cards: ['supp-rocket'],
    tex: ['\\Delta v'],
    tip: '$\\Delta v$: the change in the speed of the rocket.'
  },
  {
    cards: ['supp-rocket'],
    tex: ['m\\,dv = -u\\,dm'],
    tip: '$m$: the mass of the rocket at one moment. $dv$: its small gain in speed. $dm$: the small change in its mass, negative while fuel burns. $u$: the exhaust speed relative to the rocket.'
  },
  {
    cards: ['supp-rocket'],
    tex: ['t'],
    tip: '$t$: the duration of the burn.'
  },
  {
    cards: ['supp-rocket'],
    tex: ['gt'],
    tip: '$g$: the gravitational acceleration. $t$: the duration of the burn.'
  },
  {
    cards: ['supp-rocket'],
    match: ['free space'],
    tip: 'A region with no gravity and no other external force.'
  },
  {
    cards: ['supp-rocket'],
    match: ['exhaust'],
    tip: 'The burned fuel that the rocket pushes out behind it.'
  },
  {
    cards: ['supp-rocket'],
    match: ['relative to itself'],
    tip: 'Measured by an observer who moves with the rocket.'
  },
  {
    cards: ['supp-rocket'],
    match: ['mass ratio'],
    tip: 'The ratio $m_i/m_f$ of the initial mass to the final mass.'
  },
  {
    cards: ['supp-rocket'],
    match: ['momentum conservation'],
    tip: 'With no external force, the total momentum of the rocket and its exhaust stays constant.'
  },
  {
    cards: ['supp-rocket'],
    match: ['uniform gravity'],
    tip: 'A gravitational field with the same size $g$ and the same direction everywhere.'
  },

  /* ——— supp-small-oscillation: Small-oscillation frequency from a potential minimum ——— */
  {
    cards: ['supp-small-oscillation'],
    tex: ['m'],
    tip: '$m$: the mass of the particle.'
  },
  {
    cards: ['supp-small-oscillation'],
    tex: ['x_0'],
    tip: '$x_0$: the position of the minimum of the potential.'
  },
  {
    cards: ['supp-small-oscillation'],
    tex: ['V(x)'],
    tip: '$V(x)$: the potential energy as a function of the position $x$.'
  },
  {
    cards: ['supp-small-oscillation'],
    tex: ['V \\approx V(x_0) + \\tfrac{1}{2}V\'\'(x_0)(x - x_0)^2'],
    tip: 'The Taylor expansion of $V$ about $x_0$ to second order. The first-derivative term is absent because $V\'(x_0) = 0$ at a minimum.'
  },
  {
    cards: ['supp-small-oscillation'],
    tex: ['V\'\'(x_0)'],
    tip: '$V\'\'(x_0)$: the second derivative of $V$ with respect to $x$, evaluated at $x_0$.'
  },
  {
    cards: ['supp-small-oscillation'],
    tex: ['V\'\'(x_0) = 0'],
    tip: 'The second derivative of $V$ is zero at $x_0$: the potential is flatter there than any parabola.'
  },
  {
    cards: ['supp-small-oscillation'],
    match: ['small oscillations'],
    tip: 'Motion close to the minimum, with an amplitude small compared with the distance over which the shape of the potential changes.'
  },
  {
    cards: ['supp-small-oscillation'],
    match: ['minimum'],
    tip: 'A point $x_0$ where $V\'(x_0) = 0$ and $V$ rises on both sides.'
  },
  {
    cards: ['supp-small-oscillation'],
    match: ['effective spring constant'],
    tip: 'The constant $k$ for which the force near $x_0$ is $-k(x - x_0)$, as for a spring that obeys Hooke\'s law.'
  },
  {
    cards: ['supp-small-oscillation'],
    match: ['simple harmonic'],
    tip: 'Describes oscillation in which the restoring force is proportional to the displacement, so the position is a sine function of time with one fixed frequency.'
  },

  /* ——— supp-gravity-orbits: Orbital energy, vis-viva and escape speed ——— */
  {
    cards: ['supp-gravity-orbits'],
    tex: ['m \\ll M'],
    tip: '$m$: the mass of the orbiting body. $M$: the mass of the central body. $\\ll$: much less than, so $M$ stays nearly at rest.'
  },
  {
    cards: ['supp-gravity-orbits'],
    tex: ['M'],
    tip: '$M$: the mass of the central body.'
  },
  {
    cards: ['supp-gravity-orbits'],
    tex: ['a'],
    tip: '$a$: the semimajor axis of the ellipse, half of its longest diameter.'
  },
  {
    cards: ['supp-gravity-orbits'],
    tex: ['r'],
    tip: '$r$: the distance from the centre of $M$ to the orbiting mass.'
  },
  {
    cards: ['supp-gravity-orbits'],
    tex: ['E'],
    tip: '$E$: the total mechanical energy of the orbit, kinetic plus gravitational potential energy.'
  },
  {
    cards: ['supp-gravity-orbits'],
    tex: ['r = a'],
    tip: 'The distance stays equal to the semimajor axis: the orbit is a circle.'
  },
  {
    cards: ['supp-gravity-orbits'],
    tex: ['v_{\\rm circ} = \\sqrt{GM/r}'],
    tip: '$v_{\\rm circ}$: the speed on a circular orbit of radius $r$. $G$: the gravitational constant. $M$: the central mass.'
  },
  {
    cards: ['supp-gravity-orbits'],
    tex: ['K = -E = -U/2'],
    tip: '$K$: the kinetic energy. $E$: the total energy. $U$: the gravitational potential energy.'
  },
  {
    cards: ['supp-gravity-orbits'],
    tex: ['U = -GMm/r'],
    tip: '$U$: the gravitational potential energy, taken as zero at infinite separation. $G$: the gravitational constant.'
  },
  {
    cards: ['supp-gravity-orbits'],
    tex: ['E = 0'],
    tip: '$E$: the total energy of the orbiting body.'
  },
  {
    cards: ['supp-gravity-orbits'],
    tex: ['a \\to \\infty'],
    tip: 'The semimajor axis grows without limit: the path no longer closes.'
  },
  {
    cards: ['supp-gravity-orbits'],
    tex: ['v_{\\rm esc} = \\sqrt{2GM/r} = \\sqrt{2}\\,v_{\\rm circ}'],
    tip: '$v_{\\rm esc}$: the escape speed at distance $r$. $v_{\\rm circ}$: the circular-orbit speed at the same $r$. $G$: the gravitational constant. $M$: the central mass.'
  },
  {
    cards: ['supp-gravity-orbits'],
    match: ['semimajor axis'],
    tip: 'Half of the longest diameter of an ellipse.'
  },
  {
    cards: ['supp-gravity-orbits'],
    match: ['escape speed'],
    tip: 'The smallest speed at distance $r$ with which a body moves away from $M$ forever without further thrust.'
  },
  {
    cards: ['supp-gravity-orbits'],
    match: ['circular orbit'],
    tip: 'An orbit at a constant distance from the centre of $M$.'
  },
  {
    cards: ['supp-gravity-orbits'],
    match: ['eccentricity'],
    tip: 'A number between $0$ and $1$ that measures how elongated an ellipse is; $0$ is a circle.'
  },
  {
    cards: ['supp-gravity-orbits'],
    match: ['vis-viva'],
    tip: 'The relation that gives the orbital speed at any distance $r$ from the size of the orbit. The name is Latin for living force.'
  },
  {
    cards: ['supp-gravity-orbits'],
    match: ['ellipse'],
    tip: 'A closed curve: the set of points whose distances from two fixed points, the foci, add up to a constant. A bound orbit is an ellipse with $M$ at one focus.'
  },

  /* ——— supp-hydrostatics: Buoyancy and hydrostatic pressure difference (supplemental list) ——— */
  {
    cards: ['supp-hydrostatics'],
    tex: ['g'],
    tip: '$g$: the gravitational acceleration, about $9.8\\ \\mathrm{m/s^2}$ near the surface of the Earth.'
  },
  {
    cards: ['supp-hydrostatics'],
    tex: ['\\rho_{\\mathrm{fluid}} g V_{\\mathrm{displaced}}'],
    tip: '$\\rho_{\\mathrm{fluid}}$: the density of the fluid. $g$: the gravitational acceleration. $V_{\\mathrm{displaced}}$: the volume of fluid the object pushes aside, equal to the volume of its submerged part.'
  },
  {
    cards: ['supp-hydrostatics'],
    tex: ['\\rho g h'],
    tip: '$\\rho$: the density of the fluid. $g$: the gravitational acceleration. $h$: the increase in depth.'
  },
  {
    cards: ['supp-hydrostatics'],
    tex: ['h'],
    tip: '$h$: the increase in depth between two points in the fluid.'
  },
  {
    cards: ['supp-hydrostatics'],
    match: ['buoyant force'],
    tip: 'The net force that the pressure of the surrounding fluid exerts on an object immersed in it.'
  },
  {
    cards: ['supp-hydrostatics'],
    match: ['incompressible'],
    tip: 'Describes a fluid whose density stays the same under any pressure.'
  },
  {
    cards: ['supp-hydrostatics'],
    match: ['hydrostatic'],
    tip: 'Of a fluid at rest.'
  },
  {
    cards: ['supp-hydrostatics'],
    match: ['absolute pressure'],
    tip: 'The full pressure at a point, measured from vacuum. It includes the pressure on the free surface of the fluid, such as the atmosphere.'
  },
  {
    cards: ['supp-hydrostatics'],
    match: ['depth'],
    tip: 'The vertical distance below the free surface of the fluid.'
  },

  /* ——— supp-drift-current: Drift current density (supplemental list) ——— */
  {
    cards: ['supp-drift-current'],
    tex: ['A'],
    tip: '$A$: the area of the cross-section of the wire.'
  },
  {
    cards: ['supp-drift-current'],
    tex: ['\\mathbf{J} = nq\\mathbf{v}_d'],
    tip: '$\\mathbf{J}$: the current density, current per unit area. $n$: the number of carriers per unit volume. $q$: the charge of one carrier. $\\mathbf{v}_d$: the drift velocity of the carriers.'
  },
  {
    cards: ['supp-drift-current'],
    tex: ['n'],
    tip: '$n$: the number of charge carriers per unit volume.'
  },
  {
    cards: ['supp-drift-current'],
    tex: ['q'],
    tip: '$q$: the charge of one carrier; $-e$ for an electron.'
  },
  {
    cards: ['supp-drift-current'],
    tex: ['\\sigma = 1/\\rho'],
    tip: '$\\sigma$: the conductivity of the material. $\\rho$: its resistivity.'
  },
  {
    cards: ['supp-drift-current'],
    tex: ['\\mathbf{J} = \\sigma\\mathbf{E}'],
    tip: '$\\mathbf{J}$: the current density. $\\sigma$: the conductivity. $\\mathbf{E}$: the electric field in the material. This is the local form of Ohm\'s law.'
  },
  {
    cards: ['supp-drift-current'],
    tex: ['I = n|q|Av_d', 'v_d = I/(n|q|A)'],
    tip: '$I$: the current. $n$: the number of carriers per unit volume. $|q|$: the size of the charge of one carrier. $A$: the cross-section area. $v_d$: the drift speed.'
  },
  {
    cards: ['supp-drift-current'],
    tex: ['I'],
    tip: '$I$: the current through the wire, the charge that crosses a cross-section per unit time.'
  },
  {
    cards: ['supp-drift-current'],
    tex: ['v_d \\sim 10^{-4}\\ \\mathrm{m/s}'],
    tip: '$v_d$: the drift speed. $\\sim$: of the order of.'
  },
  {
    cards: ['supp-drift-current'],
    tex: ['1\\ \\mathrm{mm/s}'],
    tip: 'One millimetre per second, $10^{-3}\\ \\mathrm{m/s}$.'
  },
  {
    cards: ['supp-drift-current'],
    tex: ['n \\sim 10^{28}\\ \\mathrm{m^{-3}}'],
    tip: '$n$: the number of carriers per cubic metre. In a metal it is about one conduction electron per atom.'
  },
  {
    cards: ['supp-drift-current'],
    tex: ['c'],
    tip: '$c$: the speed of light in vacuum.'
  },
  {
    cards: ['supp-drift-current'],
    tex: ['v_d\\,\\Delta t'],
    tip: '$v_d\\,\\Delta t$: the distance the carriers drift in the time $\\Delta t$.'
  },
  {
    cards: ['supp-drift-current'],
    tex: ['\\Delta t'],
    tip: '$\\Delta t$: a time interval.'
  },
  {
    cards: ['supp-drift-current'],
    match: ['drift current density'],
    tip: 'The current per unit area carried by the slow average motion of charges along the wire. Their fast random thermal motion averages to zero and carries no current.'
  },
  {
    cards: ['supp-drift-current'],
    match: ['drift speed'],
    tip: 'The average speed of the carriers along the wire. Their individual random speeds are far larger, but those average to zero.'
  },
  {
    cards: ['supp-drift-current'],
    match: ['conductivity'],
    tip: 'How easily a material carries current, written $\\sigma$ and measured in siemens per metre. Its inverse is the resistivity $\\rho$.'
  },
  {
    cards: ['supp-drift-current'],
    match: ['carrier'],
    tip: 'A mobile charged particle that carries current. In a metal it is a conduction electron.'
  },
  {
    cards: ['supp-drift-current'],
    match: ['cross-section'],
    tip: 'The surface cut straight across the wire, perpendicular to its length.'
  },
  {
    cards: ['supp-drift-current'],
    match: ['electrical signal'],
    tip: 'The change in current or voltage that travels along the wire. It moves as an electromagnetic wave, not with the carriers.'
  },

  /* ——— supp-image-plane: Image charge for a grounded conducting plane ——— */
  {
    cards: ['supp-image-plane'],
    tex: ['q'],
    tip: '$q$: the real point charge.'
  },
  {
    cards: ['supp-image-plane'],
    tex: ['d'],
    tip: '$d$: the distance from the charge to the plane.'
  },
  {
    cards: ['supp-image-plane'],
    tex: ['-q'],
    tip: '$-q$: a charge equal in size to $q$ and opposite in sign.'
  },
  {
    cards: ['supp-image-plane'],
    tex: ['-\\frac{q^2}{4\\pi\\epsilon_0 (2d)}'],
    tip: 'The potential energy of two real charges $q$ and $-q$ a distance $2d$ apart. $\\epsilon_0$: the permittivity of free space.'
  },
  {
    cards: ['supp-image-plane'],
    tex: ['2z'],
    tip: '$2z$: the distance between the charge and its image when the charge is a distance $z$ from the plane.'
  },
  {
    cards: ['supp-image-plane'],
    match: ['image charge'],
    tip: 'A fictitious charge, placed outside the region where the field is wanted, chosen so that it and the real charge together give the correct potential on the conductor\'s surface.'
  },
  {
    cards: ['supp-image-plane'],
    match: ['grounded'],
    tip: 'Connected to the Earth, so its potential is held at zero.'
  },
  {
    cards: ['supp-image-plane'],
    match: ['conducting plane'],
    tip: 'A flat conducting surface. In electrostatics its surface is an equipotential.'
  },
  {
    cards: ['supp-image-plane'],
    match: ['mirror point'],
    tip: 'The point reached by reflecting the position of the charge through the plane.'
  },
  {
    cards: ['supp-image-plane'],
    match: ['pair energy'],
    tip: 'The electrostatic potential energy of two real point charges at a given separation.'
  },
  {
    cards: ['supp-image-plane'],
    match: ['induced surface charge'],
    tip: 'Charge that collects on the surface of the conductor in response to the nearby point charge.'
  },

  /* ——— supp-rc-rl-transients: RC and RL transients (supplemental list) ——— */
  {
    cards: ['supp-rc-rl-transients'],
    tex: ['R'],
    tip: '$R$: the resistance of the resistor.'
  },
  {
    cards: ['supp-rc-rl-transients'],
    tex: ['V'],
    tip: '$V$: the constant voltage of the source.'
  },
  {
    cards: ['supp-rc-rl-transients'],
    tex: ['Q(t)'],
    tip: '$Q(t)$: the charge on the capacitor at time $t$.'
  },
  {
    cards: ['supp-rc-rl-transients'],
    tex: ['C'],
    tip: '$C$: the capacitance of the capacitor.'
  },
  {
    cards: ['supp-rc-rl-transients'],
    tex: ['Q_0'],
    tip: '$Q_0$: the charge on the capacitor at $t = 0$, when the discharge starts.'
  },
  {
    cards: ['supp-rc-rl-transients'],
    tex: ['I(t)'],
    tip: '$I(t)$: the current through the inductor at time $t$.'
  },
  {
    cards: ['supp-rc-rl-transients'],
    tex: ['L'],
    tip: '$L$: the inductance of the inductor.'
  },
  {
    cards: ['supp-rc-rl-transients'],
    tex: ['I_0'],
    tip: '$I_0$: the current at $t = 0$, when the decay starts.'
  },
  {
    cards: ['supp-rc-rl-transients'],
    tex: ['Q = CV\\left(1 - e^{-t/RC}\\right)', 'Q = Q_0 e^{-t/RC}'],
    tip: '$Q$: the charge on the capacitor at time $t$. $C$: the capacitance. $V$: the source voltage. $Q_0$: the starting charge. $R$: the resistance.'
  },
  {
    cards: ['supp-rc-rl-transients'],
    tex: ['I = (Q_0/RC)\\,e^{-t/RC}'],
    tip: '$I$: the discharge current, the rate at which charge leaves the capacitor. $Q_0$: the starting charge. $R$: the resistance. $C$: the capacitance.'
  },
  {
    cards: ['supp-rc-rl-transients'],
    tex: ['I = (V/R)\\left(1 - e^{-Rt/L}\\right)', 'I = I_0 e^{-Rt/L}'],
    tip: '$I$: the current through the inductor at time $t$. $V$: the source voltage. $R$: the resistance. $L$: the inductance. $I_0$: the starting current.'
  },
  {
    cards: ['supp-rc-rl-transients'],
    tex: ['1/e \\approx 37\\%'],
    tip: '$e \\approx 2.718$: the base of the natural logarithm, so $1/e \\approx 0.37$.'
  },
  {
    cards: ['supp-rc-rl-transients'],
    match: ['time constant'],
    tip: 'The time over which an exponential decay falls to $1/e$ of its starting value.'
  },
  {
    cards: ['supp-rc-rl-transients'],
    match: ['series circuit'],
    tip: 'A circuit in which the components form a single loop, so the same current flows through each.'
  },
  {
    cards: ['supp-rc-rl-transients'],
    match: ['charging'],
    tip: 'The source pushing charge onto the capacitor plates through the resistor.'
  },
  {
    cards: ['supp-rc-rl-transients'],
    match: ['discharging'],
    tip: 'The capacitor releasing its stored charge through the resistor, with no source in the loop.'
  },
  {
    cards: ['supp-rc-rl-transients'],
    match: ['inductor'],
    tip: 'A coil whose inductance $L$ opposes changes in its current with an induced voltage $-L\\,dI/dt$.'
  },
  {
    cards: ['supp-rc-rl-transients'],
    match: ['capacitor'],
    tip: 'Two conductors separated by an insulator. They hold opposite charges $\\pm Q$, and the capacitance $C$ is $Q$ divided by the voltage between them.'
  },

  /* ——— supp-parallel-wire-force: Force between parallel currents ——— */
  {
    cards: ['supp-parallel-wire-force'],
    tex: ['d'],
    tip: '$d$: the distance between the two wires.'
  },
  {
    cards: ['supp-parallel-wire-force'],
    tex: ['I_1', 'I_2'],
    tip: '$I_1$, $I_2$: the currents in wire 1 and in wire 2.'
  },
  {
    cards: ['supp-parallel-wire-force'],
    tex: ['\\mu_0 I_1/(2\\pi d)'],
    tip: '$\\mu_0$: the permeability of free space. $I_1$: the current in wire 1. $d$: the distance from wire 1.'
  },
  {
    cards: ['supp-parallel-wire-force'],
    tex: ['d\\mathbf{F} = I\\,d\\mathbf{l}\\times\\mathbf{B}'],
    tip: '$d\\mathbf{F}$: the force on a short piece of wire. $I$: its current. $d\\mathbf{l}$: the length vector of the piece, along the current. $\\mathbf{B}$: the magnetic field there. $\\times$: the cross product.'
  },
  {
    cards: ['supp-parallel-wire-force'],
    match: ['force per unit length'],
    tip: 'The force on a stretch of one wire divided by the length of that stretch.'
  },
  {
    cards: ['supp-parallel-wire-force'],
    match: ['attract'],
    tip: 'Pull toward each other.'
  },
  {
    cards: ['supp-parallel-wire-force'],
    match: ['repel'],
    tip: 'Push away from each other.'
  },
  {
    cards: ['supp-parallel-wire-force'],
    match: ['parallel currents'],
    tip: 'Currents in two straight wires that run side by side at a constant distance, in the same or in opposite directions.'
  },

  /* ——— supp-optical-magnification: Lens and telescope magnification (supplemental list) ——— */
  {
    cards: ['supp-optical-magnification'],
    tex: ['M = -s\'/s'],
    tip: '$M$: the transverse magnification. $s$: the distance from the object to the lens. $s\'$: the distance from the lens to the image.'
  },
  {
    cards: ['supp-optical-magnification'],
    tex: ['M \\lt 0'],
    tip: '$M$: the transverse magnification. $\\lt 0$: negative.'
  },
  {
    cards: ['supp-optical-magnification'],
    tex: ['|M| \\gt 1'],
    tip: '$|M|$: the size of the magnification, ignoring its sign.'
  },
  {
    cards: ['supp-optical-magnification'],
    tex: ['|M_\\theta| = f_o/f_e'],
    tip: '$M_\\theta$: the angular magnification. $f_o$: the focal length of the objective, the lens facing the object. $f_e$: the focal length of the eyepiece, the lens at the eye.'
  },
  {
    cards: ['supp-optical-magnification'],
    tex: ['f_o + f_e'],
    tip: '$f_o$: the focal length of the objective. $f_e$: the focal length of the eyepiece.'
  },
  {
    cards: ['supp-optical-magnification'],
    match: ['transverse magnification'],
    tip: 'The height of the image divided by the height of the object, both measured perpendicular to the lens axis.'
  },
  {
    cards: ['supp-optical-magnification'],
    match: ['angular magnification'],
    tip: 'The angle that the image subtends at the eye divided by the angle that the object subtends at the unaided eye.'
  },
  {
    cards: ['supp-optical-magnification'],
    match: ['astronomical telescope'],
    tip: 'A telescope made of two converging lenses: an objective that faces the distant object and an eyepiece at the eye.'
  },
  {
    cards: ['supp-optical-magnification'],
    match: ['thin lens'],
    tip: 'A lens whose thickness is small compared with its focal length and with the object and image distances, so that all distances can be measured from one plane.'
  },
  {
    cards: ['supp-optical-magnification', 'supp-converging-lens-image'],
    match: ['inverted'],
    tip: 'Upside down compared with the object.'
  },
  {
    cards: ['supp-optical-magnification', 'supp-converging-lens-image'],
    match: ['real-is-positive convention'],
    tip: 'The sign rule in which distances to real objects and real images are positive and distances to virtual ones are negative.'
  },
  {
    cards: ['supp-optical-magnification', 'supp-converging-lens-image'],
    match: ['converging lens'],
    tip: 'A lens that bends parallel incoming rays toward one focal point. Its focal length $f$ is positive.'
  },

  /* ——— supp-converging-lens-image: Converging lens: real or virtual image (supplemental list) ——— */
  {
    cards: ['supp-converging-lens-image'],
    tex: ['f \\gt 0'],
    tip: '$f$: the focal length of the lens. $\\gt 0$: positive.'
  },
  {
    cards: ['supp-converging-lens-image'],
    tex: ['s \\gt 0'],
    tip: '$s$: the distance from the object to the lens. $\\gt 0$: positive, as for an object on the side the light comes from.'
  },
  {
    cards: ['supp-converging-lens-image'],
    tex: ['s'],
    tip: '$s$: the distance from the object to the lens.'
  },
  {
    cards: ['supp-converging-lens-image'],
    tex: ['f'],
    tip: '$f$: the focal length of the lens.'
  },
  {
    cards: ['supp-converging-lens-image'],
    tex: ['s \\gt f', 's \\lt f'],
    tip: '$s$: the object distance. $f$: the focal length.'
  },
  {
    cards: ['supp-converging-lens-image'],
    tex: ['s\' \\gt 0', 's\' \\lt 0'],
    tip: '$s\'$: the distance from the lens to the image, with the sign given by the real-is-positive convention.'
  },
  {
    cards: ['supp-converging-lens-image'],
    tex: ['1/s + 1/s\' = 1/f'],
    tip: 'The thin-lens equation. $s$: the object distance. $s\'$: the image distance. $f$: the focal length.'
  },
  {
    cards: ['supp-converging-lens-image'],
    match: ['real object'],
    tip: 'An object on the side of the lens that the light comes from, which sends diverging rays into the lens.'
  },
  {
    cards: ['supp-converging-lens-image'],
    match: ['real'],
    tip: 'Said of an image: the light rays actually meet there, so the image can be caught on a screen.'
  },
  {
    cards: ['supp-converging-lens-image'],
    match: ['virtual'],
    tip: 'Said of an image: the light rays only appear to come from it and do not pass through it, so it cannot be caught on a screen.'
  },
  {
    cards: ['supp-converging-lens-image'],
    match: ['upright'],
    tip: 'The same way up as the object.'
  },
  {
    cards: ['supp-converging-lens-image'],
    match: ['magnifying glass'],
    tip: 'A single converging lens held near an object to give an enlarged view of it.'
  },

  /* ——— supp-acoustic-modes: String and pipe harmonics (supplemental list) ——— */
  {
    cards: ['supp-acoustic-modes'],
    tex: ['f_n = nv/(2L)'],
    tip: '$f_n$: the frequency of harmonic number $n$. $v$: the wave speed on the string, or the speed of sound in the pipe; $L$: the length of the string or pipe.'
  },
  {
    cards: ['supp-acoustic-modes'],
    tex: ['L'],
    tip: '$L$: the length of the string, or of the air column in the pipe.'
  },
  {
    cards: ['supp-acoustic-modes'],
    tex: ['n = 1, 2, 3, \\dots'],
    tip: '$n$: the harmonic number, a positive integer. $n = 1$ is the fundamental.'
  },
  {
    cards: ['supp-acoustic-modes'],
    tex: ['2L', '4L'],
    tip: '$2L$, $4L$: two and four times the length $L$ of the string or pipe.'
  },
  {
    cards: ['supp-acoustic-modes'],
    tex: ['f_n = (2n-1)v/(4L)'],
    tip: '$f_n$: the frequency of mode number $n$ of the closed–open pipe. As $n = 1, 2, 3, \\dots$, the factor $2n-1$ runs over $1, 3, 5, \\dots$; $v$: the speed of sound; $L$: the pipe length.'
  },
  {
    cards: ['supp-acoustic-modes'],
    tex: ['v/(2L)'],
    tip: '$v/(2L)$: the speed of sound $v$ divided by twice the pipe length $L$.'
  },
  {
    cards: ['supp-acoustic-modes'],
    tex: ['v/(4L)'],
    tip: '$v/(4L)$: the speed of sound $v$ divided by four times the pipe length $L$.'
  },
  {
    cards: ['supp-acoustic-modes'],
    match: ['end corrections', 'end correction'],
    tip: 'The air column vibrates a little beyond an open end, by about $0.6$ times the pipe radius. Neglecting this treats the open end as lying exactly at the end of the pipe.'
  },
  {
    cards: ['supp-acoustic-modes'],
    match: ['harmonics'],
    tip: 'The frequencies of the standing waves that a string or an air column can hold, listed from the lowest up.'
  },
  {
    cards: ['supp-acoustic-modes'],
    match: ['fixed–fixed string', 'fixed string'],
    tip: 'A string held fixed at both ends, such as a guitar string.'
  },
  {
    cards: ['supp-acoustic-modes'],
    match: ['open–open pipe'],
    tip: 'A pipe open at both ends.'
  },
  {
    cards: ['supp-acoustic-modes'],
    match: ['closed–open pipe'],
    tip: 'A pipe closed at one end and open at the other.'
  },
  {
    cards: ['supp-acoustic-modes'],
    match: ['closed–closed pipe', 'closed–closed sequence'],
    tip: 'A pipe closed at both ends. Its sequence is its list of standing-wave frequencies.'
  },
  {
    cards: ['supp-acoustic-modes'],
    match: ['node types'],
    tip: 'Whether an end is a node (no oscillation) or an antinode (the largest oscillation), stated for the pressure and for the displacement of the air.'
  },
  {
    cards: ['supp-acoustic-modes'],
    match: ['pressure node'],
    tip: 'A point where the pressure stays at its average value: the pressure oscillation there is zero.'
  },
  {
    cards: ['supp-acoustic-modes'],
    match: ['pressure antinode'],
    tip: 'A point where the pressure oscillates with the largest amplitude.'
  },
  {
    cards: ['supp-acoustic-modes'],
    match: ['displacement node'],
    tip: 'A point where the air does not move.'
  },
  {
    cards: ['supp-acoustic-modes'],
    match: ['displacement antinode'],
    tip: 'A point where the air moves back and forth with the largest amplitude.'
  },
  {
    cards: ['supp-acoustic-modes'],
    match: ['fundamental'],
    tip: 'The lowest standing-wave frequency, the harmonic with $n = 1$.'
  },

  /* ——— supp-beats: Beat frequency of loudness maxima ——— */
  {
    cards: ['supp-beats'],
    match: ['nearby frequencies'],
    tip: '$f_1$ and $f_2$ differ by much less than either one, for example $440\\ \\mathrm{Hz}$ and $443\\ \\mathrm{Hz}$. Only then does the ear hear one tone whose loudness rises and falls, instead of two separate tones.'
  },
  {
    cards: ['supp-beats'],
    match: ['sound together'],
    tip: 'Both tones reach the ear at once. The pressures add: $p(t) = \\cos(2\\pi f_1 t) + \\cos(2\\pi f_2 t)$ for equal amplitudes.'
  },
  {
    cards: ['supp-beats'],
    tex: ['f_1'],
    tip: '$f_1$: the frequency of the first tone, in hertz ($\\mathrm{Hz}$, oscillations per second).'
  },
  {
    cards: ['supp-beats'],
    tex: ['f_2'],
    tip: '$f_2$: the frequency of the second tone, in hertz.'
  },
  {
    cards: ['supp-beats'],
    tex: ['f_{\\mathrm{beat}} = |f_1 - f_2|'],
    tip: '$f_{\\mathrm{beat}}$: loudness maxima per second. $f_1$, $f_2$: the frequencies of the two tones. The bars $|\\,\\cdot\\,|$ are the absolute value, so the rate is positive whichever tone is higher.'
  },
  {
    cards: ['supp-beats'],
    match: ['full difference'],
    tip: '$|f_1 - f_2|$ itself, not half of it.'
  },
  {
    cards: ['supp-beats'],
    match: ['envelope cosine', 'envelope'],
    tip: 'The sum of two cosines factors as $\\cos(2\\pi f_1 t) + \\cos(2\\pi f_2 t) = 2\\cos\\!\\left(2\\pi \\tfrac{f_1 - f_2}{2} t\\right)\\cos\\!\\left(2\\pi \\tfrac{f_1 + f_2}{2} t\\right)$. The second cosine is the fast oscillation the ear hears as the pitch. The first, slow cosine is the envelope: it sets the size of the fast oscillation.'
  },
  {
    cards: ['supp-beats'],
    tex: ['|f_1 - f_2|/2'],
    tip: 'The frequency of the envelope cosine. The loudness depends on the size $|\\cos|$, which reaches $1$ twice in each period of the cosine (once at $+1$, once at $-1$). So the loudness maxima come twice as often as the envelope cosine repeats.'
  },
  {
    cards: ['supp-beats'],
    match: ['sign is lost'],
    tip: 'The beat rate is the absolute value $|f_1 - f_2|$. It tells how far apart the two frequencies are, but not which one is higher.'
  },
  {
    cards: ['supp-beats'],
    match: ['reference'],
    tip: 'A tone of known frequency, such as a tuning fork, sounded together with the tone being measured.'
  },
  {
    cards: ['supp-beats'],
    tex: ['f_0'],
    tip: '$f_0$: the known frequency of the reference tone.'
  },
  {
    cards: ['supp-beats'],
    match: ['unknown tone'],
    tip: 'The tone whose frequency is being measured against the reference.'
  },
  {
    cards: ['supp-beats'],
    tex: ['f_0 \\pm f_{\\mathrm{beat}}'],
    tip: 'The two frequencies that both give the measured beat rate: $f_0 + f_{\\mathrm{beat}}$, above the reference, and $f_0 - f_{\\mathrm{beat}}$, below it.'
  },
  {
    cards: ['supp-beats'],
    match: ['cannot be told'],
    tip: 'Both candidates give the same beat rate, so one beat measurement cannot choose between them. A second measurement can, for example retuning the string and watching whether the beat rate rises or falls.'
  },
  {
    cards: ['supp-beats'],
    match: ['raises its frequency'],
    tip: 'Higher tension gives a higher wave speed $v = \\sqrt{T/\\mu}$, and every harmonic $f_n = nv/(2L)$ rises with it.'
  },

  /* ——— supp-michelson-double-pass: Michelson fringe shifts for a moving mirror and a slab (supplemental list) ——— */
  {
    cards: ['supp-michelson-double-pass', 'supp-thin-film', 'supp-fresnel-normal', 'supp-radiation-pressure'],
    match: ['normal incidence'],
    tip: 'The light meets the surface at right angles, travelling perpendicular to it.'
  },
  {
    cards: ['supp-michelson-double-pass'],
    tex: ['\\lambda'],
    tip: '$\\lambda$: the wavelength of the light in vacuum (nearly the same in air).'
  },
  {
    cards: ['supp-michelson-double-pass'],
    tex: ['d'],
    tip: '$d$: the distance the movable mirror is moved along the beam.'
  },
  {
    cards: ['supp-michelson-double-pass'],
    tex: ['L'],
    tip: '$L$: the thickness of the slab, measured along the beam.'
  },
  {
    cards: ['supp-michelson-double-pass'],
    tex: ['n'],
    tip: '$n$: the refractive index of the slab.'
  },
  {
    cards: ['supp-michelson-double-pass'],
    tex: ['N = 2d/\\lambda'],
    tip: '$N$: the number of fringes that pass. $d$: the mirror displacement; $\\lambda$: the wavelength.'
  },
  {
    cards: ['supp-michelson-double-pass'],
    tex: ['N = 2L(n-1)/\\lambda'],
    tip: '$N$: the number of fringes that pass. $L$: the slab thickness; $n$: its refractive index; $\\lambda$: the vacuum wavelength. $n - 1$ is how far the index exceeds that of air, taken as $1$.'
  },
  {
    cards: ['supp-michelson-double-pass'],
    match: ['Michelson interferometer'],
    tip: 'An instrument that splits a beam of light into two arms, each ending at a mirror, and then recombines the two beams. The recombined light shows bright and dark fringes that depend on the difference between the two optical paths.'
  },
  {
    cards: ['supp-michelson-double-pass'],
    match: ['fringes'],
    tip: 'The bright and dark bands seen where the two beams recombine. A fringe passes a fixed point when a bright band moves to where the next bright band was.'
  },
  {
    cards: ['supp-michelson-double-pass'],
    match: ['slab'],
    tip: 'A flat plate of transparent material with parallel faces, placed across the beam.'
  },
  {
    cards: ['supp-michelson-double-pass'],
    match: ['index'],
    tip: 'The refractive index: the speed of light in vacuum divided by its speed in the material.'
  },
  {
    cards: ['supp-michelson-double-pass'],
    match: ['double pass'],
    tip: 'The light goes through the same stretch of path twice, once toward the mirror and once back.'
  },

  /* ——— supp-lattice-heat-capacity: Lattice heat capacity limits (supplemental list) ——— */
  {
    cards: ['supp-lattice-heat-capacity'],
    tex: ['T'],
    tip: '$T$: the absolute temperature of the crystal, in kelvin.'
  },
  {
    cards: ['supp-lattice-heat-capacity'],
    tex: ['C_V \\to 3Nk_B'],
    tip: '$C_V$: the heat capacity at constant volume. $N$: the number of atoms; $k_B$: the Boltzmann constant. The arrow points to the value approached.'
  },
  {
    cards: ['supp-lattice-heat-capacity'],
    tex: ['3R'],
    tip: '$R$: the gas constant, $R = N_A k_B$, where $N_A$ is Avogadro\'s number.'
  },
  {
    cards: ['supp-lattice-heat-capacity'],
    tex: ['T \\ll \\theta_D'],
    tip: '$\\theta_D$: the Debye temperature of the crystal, a constant of the material. $\\ll$ means much less than.'
  },
  {
    cards: ['supp-lattice-heat-capacity'],
    tex: ['C_V \\propto T^3'],
    tip: '$C_V$: the heat capacity at constant volume; $T$: the temperature. $\\propto$ means proportional to.'
  },
  {
    cards: ['supp-lattice-heat-capacity'],
    tex: ['T^4'],
    tip: '$T^4$: the fourth power of the temperature $T$.'
  },
  {
    cards: ['supp-lattice-heat-capacity'],
    tex: ['C = aT + bT^3'],
    tip: '$C$: the heat capacity of the metal; $T$: the temperature. $a$ and $b$: constants of the material.'
  },
  {
    cards: ['supp-lattice-heat-capacity'],
    match: ['heat capacity'],
    tip: 'The heat needed to raise the temperature of a body by one kelvin, $C = dQ/dT$.'
  },
  {
    cards: ['supp-lattice-heat-capacity'],
    match: ['Debye law', 'Debye'],
    tip: 'The Debye model treats the vibrations of the crystal as sound waves, with frequencies up to a maximum set by the spacing of the atoms. The Debye law is its result at low temperature.'
  },
  {
    cards: ['supp-lattice-heat-capacity'],
    match: ['Dulong–Petit'],
    tip: 'The rule found by Dulong and Petit in 1819 that the heat capacity per mole is about the same for most solid elements at room temperature.'
  },
  {
    cards: ['supp-lattice-heat-capacity'],
    match: ['vibrational coordinates'],
    tip: 'The three directions $x$, $y$, $z$ in which each atom can move about its rest position.'
  },
  {
    cards: ['supp-lattice-heat-capacity'],
    match: ['quadratic term'],
    tip: 'A term in the energy proportional to the square of one coordinate or velocity, such as $\\tfrac12 m v_x^2$ or $\\tfrac12 k x^2$. By equipartition, each holds $\\tfrac12 k_B T$ on average when the temperature is high.'
  },
  {
    cards: ['supp-lattice-heat-capacity'],
    match: ['Einstein model'],
    tip: 'A model in which every atom vibrates at the same single frequency, independently of its neighbours.'
  },
  {
    cards: ['supp-lattice-heat-capacity'],
    match: ['Fermi surface'],
    tip: 'The surface in momentum space that separates the filled electron states from the empty ones at zero temperature.'
  },
  {
    cards: ['supp-lattice-heat-capacity'],
    match: ['thermal energy'],
    tip: 'The energy held in the lattice vibrations above their value at zero temperature.'
  },

  /* ——— supp-van-der-waals: Van der Waals equation and the critical point (supplemental list) ——— */
  {
    cards: ['supp-van-der-waals'],
    tex: ['a'],
    tip: '$a$: the first van der Waals constant, a positive number measured for each gas.'
  },
  {
    cards: ['supp-van-der-waals'],
    tex: ['b'],
    tip: '$b$: the second van der Waals constant, a positive number measured for each gas.'
  },
  {
    cards: ['supp-van-der-waals'],
    tex: ['\\left(P + \\dfrac{a}{V_m^2}\\right)(V_m - b) = RT'],
    tip: '$P$: the pressure; $V_m$: the volume of one mole; $T$: the absolute temperature; $R$: the gas constant. $a$ and $b$ are the two constants of the gas.'
  },
  {
    cards: ['supp-van-der-waals'],
    tex: ['(\\partial P/\\partial V_m)_T = 0'],
    tip: 'The first derivative of the pressure $P$ with respect to the molar volume $V_m$, taken at constant temperature $T$, set equal to zero.'
  },
  {
    cards: ['supp-van-der-waals'],
    tex: ['(\\partial^2 P/\\partial V_m^2)_T = 0'],
    tip: 'The second derivative of the pressure $P$ with respect to the molar volume $V_m$, taken at constant temperature $T$, set equal to zero.'
  },
  {
    cards: ['supp-van-der-waals'],
    tex: ['V_{m,c} = 3b'],
    tip: '$V_{m,c}$: the molar volume at the critical point; $b$: the second van der Waals constant.'
  },
  {
    cards: ['supp-van-der-waals'],
    tex: ['T_c = 8a/(27Rb)'],
    tip: '$T_c$: the critical temperature; $a$, $b$: the van der Waals constants; $R$: the gas constant.'
  },
  {
    cards: ['supp-van-der-waals'],
    tex: ['P_c = a/(27b^2)'],
    tip: '$P_c$: the critical pressure; $a$, $b$: the van der Waals constants.'
  },
  {
    cards: ['supp-van-der-waals'],
    match: ['van der Waals equation'],
    tip: 'An equation of state for a real gas, a corrected form of the ideal gas law $PV_m = RT$.'
  },
  {
    cards: ['supp-van-der-waals'],
    match: ['one-mole'],
    tip: 'Written for one mole of gas, so the volume in it is the molar volume $V_m$.'
  },
  {
    cards: ['supp-van-der-waals'],
    match: ['critical point'],
    tip: 'The temperature and pressure at which the boundary between liquid and gas ends. Above it, liquid and gas no longer exist as two separate phases.'
  },
  {
    cards: ['supp-van-der-waals'],
    match: ['intermolecular attraction'],
    tip: 'The attractive force between separate molecules of the gas.'
  },
  {
    cards: ['supp-van-der-waals'],
    match: ['volume excluded'],
    tip: 'Volume that other molecules cannot enter because the molecules themselves fill it.'
  },
  {
    cards: ['supp-van-der-waals'],
    match: ['inflection'],
    tip: 'A point where the curvature of a curve changes sign; there the second derivative is zero.'
  },
  {
    cards: ['supp-van-der-waals'],
    match: ['critical isotherm'],
    tip: 'The curve of pressure $P$ against molar volume $V_m$ at the critical temperature $T_c$.'
  },

  /* ——— supp-fourier-conduction: Fourier conduction law ——— */
  {
    cards: ['supp-fourier-conduction'],
    tex: ['\\dot Q'],
    tip: '$\\dot Q$: the heat current, the heat energy crossing the slab per unit time, in watts.'
  },
  {
    cards: ['supp-fourier-conduction'],
    tex: ['A'],
    tip: '$A$: the area of the slab face through which the heat flows.'
  },
  {
    cards: ['supp-fourier-conduction'],
    tex: ['\\kappa'],
    tip: '$\\kappa$: the thermal conductivity of the material, in $\\mathrm{W/(m\\,K)}$.'
  },
  {
    cards: ['supp-fourier-conduction'],
    tex: ['L'],
    tip: '$L$: the thickness of the slab, along the direction of heat flow.'
  },
  {
    cards: ['supp-fourier-conduction'],
    tex: ['|\\dot Q| = \\kappa A\\,\\Delta T/L'],
    tip: '$|\\dot Q|$: the size of the heat current; $\\kappa$: the thermal conductivity; $A$: the area; $\\Delta T$: the temperature difference between the two faces; $L$: the thickness.'
  },
  {
    cards: ['supp-fourier-conduction'],
    tex: ['L/(\\kappa A)'],
    tip: '$L/(\\kappa A)$: the thickness $L$ divided by the conductivity $\\kappa$ times the area $A$.'
  },
  {
    cards: ['supp-fourier-conduction'],
    match: ['heat current'],
    tip: 'The heat energy that flows through a surface per unit time.'
  },
  {
    cards: ['supp-fourier-conduction'],
    match: ['temperature gradient'],
    tip: 'The rate at which the temperature changes with position, $dT/dx$ along the direction $x$ of the heat flow.'
  },
  {
    cards: ['supp-fourier-conduction'],
    match: ['conductivity'],
    tip: 'The thermal conductivity: a property of the material that sets how much heat it passes for a given temperature gradient.'
  },
  {
    cards: ['supp-fourier-conduction'],
    match: ['uniform slab'],
    tip: 'A flat layer of one material with the same thickness and properties everywhere.'
  },
  {
    cards: ['supp-fourier-conduction'],
    match: ['thermal resistance'],
    tip: 'The temperature difference across a layer divided by the heat current through it.'
  },
  {
    cards: ['supp-fourier-conduction'],
    match: ['in series'],
    tip: 'One after the other, so the same heat current passes through each slab.'
  },
  {
    cards: ['supp-fourier-conduction'],
    match: ['down the gradient'],
    tip: 'From the hotter side toward the colder side.'
  },

  /* ——— supp-heat-pump-cop: Heat engine, refrigerator and heat pump compared (supplemental list) ——— */
  {
    cards: ['supp-heat-pump-cop'],
    tex: ['e = W/Q_H = 1 - Q_C/Q_H'],
    tip: '$e$: the efficiency of the engine. $W$: the work done per cycle; $Q_H$: the heat taken from the hot reservoir; $Q_C$: the heat given to the cold reservoir.'
  },
  {
    cards: ['supp-heat-pump-cop'],
    tex: ['1 - T_C/T_H'],
    tip: '$T_H$, $T_C$: the absolute temperatures of the hot and cold reservoirs, in kelvin.'
  },
  {
    cards: ['supp-heat-pump-cop'],
    tex: ['W'],
    tip: '$W$: the work per cycle, done by the engine, or done on the refrigerator or heat pump.'
  },
  {
    cards: ['supp-heat-pump-cop'],
    tex: ['Q_H'],
    tip: '$Q_H$: the heat exchanged with the hot reservoir per cycle, as a magnitude.'
  },
  {
    cards: ['supp-heat-pump-cop'],
    tex: ['Q_C'],
    tip: '$Q_C$: the heat exchanged with the cold reservoir per cycle, as a magnitude.'
  },
  {
    cards: ['supp-heat-pump-cop'],
    tex: ['Q_C/W'],
    tip: '$Q_C$: the heat removed from the cold reservoir per cycle; $W$: the work put in per cycle.'
  },
  {
    cards: ['supp-heat-pump-cop'],
    tex: ['T_C/(T_H - T_C)'],
    tip: '$T_C$, $T_H$: the cold and hot reservoir temperatures in kelvin; $T_H - T_C$ is their difference.'
  },
  {
    cards: ['supp-heat-pump-cop'],
    tex: ['Q_H/W = Q_C/W + 1'],
    tip: '$Q_H$: the heat delivered to the hot side per cycle; $Q_C$: the heat taken from the cold side; $W$: the work put in.'
  },
  {
    cards: ['supp-heat-pump-cop'],
    tex: ['T_H/(T_H - T_C)'],
    tip: '$T_H$: the hot reservoir temperature in kelvin; $T_H - T_C$: its difference from the cold reservoir temperature $T_C$.'
  },
  {
    cards: ['supp-heat-pump-cop'],
    tex: ['Q_H = Q_C + W'],
    tip: 'Energy conservation over one cycle. $Q_H$ and $Q_C$: the heats exchanged with the hot and cold reservoirs; $W$: the work; all as magnitudes.'
  },
  {
    cards: ['supp-heat-pump-cop'],
    tex: ['T_H - T_C'],
    tip: '$T_H - T_C$: the temperature difference between the hot and cold reservoirs.'
  },
  {
    cards: ['supp-heat-pump-cop'],
    tex: ['e'],
    tip: '$e$: the efficiency of the heat engine.'
  },
  {
    cards: ['supp-heat-pump-cop'],
    match: ['heat engine'],
    tip: 'A device that runs in a cycle, takes heat from a hot reservoir, turns part of it into work, and gives the rest to a cold reservoir.'
  },
  {
    cards: ['supp-heat-pump-cop'],
    match: ['refrigerator'],
    tip: 'A device that runs in a cycle and uses work to move heat from a cold reservoir to a hot reservoir, which keeps the cold side cold.'
  },
  {
    cards: ['supp-heat-pump-cop'],
    match: ['heat pump'],
    tip: 'A device that runs in a cycle and uses work to move heat from a cold reservoir, such as outdoor air, into a hot reservoir, such as a building, to warm it.'
  },
  {
    cards: ['supp-heat-pump-cop'],
    match: ['Carnot value'],
    tip: 'The value for a reversible Carnot cycle running between the same two reservoirs. No device working between those reservoirs can do better.'
  },
  {
    cards: ['supp-heat-pump-cop'],
    match: ['goal divided by cost'],
    tip: 'The quantity the device is used to produce, divided by the energy that must be supplied to run it.'
  },
  {
    cards: ['supp-heat-pump-cop'],
    match: ['coefficients of performance'],
    tip: 'The name for the goal-over-cost ratio of a refrigerator or a heat pump, used in place of efficiency.'
  },
  {
    cards: ['supp-heat-pump-cop'],
    match: ['in magnitudes'],
    tip: 'Each of $Q_H$, $Q_C$ and $W$ is taken as a positive number; the direction of each flow is fixed by the device.'
  },
  {
    cards: ['supp-heat-pump-cop'],
    match: ['kelvin'],
    tip: 'The absolute temperature scale: $0\\ \\mathrm{K}$ is absolute zero, and $T[\\mathrm{K}] = T[^\\circ\\mathrm{C}] + 273.15$.'
  },

  /* ——— supp-step-barrier: Step reflection and transmission (supplemental list) ——— */
  {
    cards: ['supp-step-barrier'],
    tex: ['E'],
    tip: '$E$: the total energy of the particle.'
  },
  {
    cards: ['supp-step-barrier'],
    tex: ['V_L'],
    tip: '$V_L$: the constant potential energy to the left of the step.'
  },
  {
    cards: ['supp-step-barrier'],
    tex: ['V_R'],
    tip: '$V_R$: the constant potential energy to the right of the step.'
  },
  {
    cards: ['supp-step-barrier'],
    tex: ['R'],
    tip: '$R$: the reflection coefficient, the fraction of the incident probability flux that is reflected.'
  },
  {
    cards: ['supp-step-barrier'],
    tex: ['T'],
    tip: '$T$: the transmission coefficient, the fraction of the incident probability flux that is transmitted.'
  },
  {
    cards: ['supp-step-barrier'],
    tex: ['E \\lt V_R'],
    tip: 'The energy $E$ of the particle is less than the potential energy $V_R$ on the right.'
  },
  {
    cards: ['supp-step-barrier'],
    tex: ['+\\infty'],
    tip: '$+\\infty$: plus infinity. The step has no far edge on the right.'
  },
  {
    cards: ['supp-step-barrier'],
    tex: ['R = \\left(\\dfrac{k_L - k_R}{k_L + k_R}\\right)^2'],
    tip: '$R$: the reflection coefficient. $k_L$, $k_R$: the wavenumbers to the left and to the right of the step.'
  },
  {
    cards: ['supp-step-barrier'],
    tex: ['T = \\dfrac{4k_Lk_R}{(k_L + k_R)^2}'],
    tip: '$T$: the transmission coefficient. $k_L$, $k_R$: the wavenumbers to the left and to the right of the step.'
  },
  {
    cards: ['supp-step-barrier'],
    tex: ['R + T = 1'],
    tip: '$R$ and $T$: the reflected and transmitted fractions of the incident probability flux.'
  },
  {
    cards: ['supp-step-barrier'],
    tex: ['k_{L,R} = \\sqrt{2m(E - V_{L,R})}/\\hbar'],
    tip: '$k_{L,R}$: the wavenumber on the left or on the right. $m$: the particle mass; $E - V_{L,R}$: the kinetic energy on that side; $\\hbar$: the reduced Planck constant.'
  },
  {
    cards: ['supp-step-barrier'],
    tex: ['\\psi \\propto e^{-\\kappa x}'],
    tip: '$\\psi$: the wavefunction to the right of the step; $x$: the distance into the step; $\\kappa$: the decay constant. $\\propto$ means proportional to.'
  },
  {
    cards: ['supp-step-barrier'],
    tex: ['\\kappa = \\sqrt{2m(V_R - E)}/\\hbar'],
    tip: '$\\kappa$: the decay constant of the wavefunction inside the step. $V_R - E$: how far the energy lies below the step; $m$: the mass; $\\hbar$: the reduced Planck constant.'
  },
  {
    cards: ['supp-step-barrier'],
    tex: ['T = 0'],
    tip: '$T$: the transmission coefficient, the transmitted fraction of the incident flux.'
  },
  {
    cards: ['supp-step-barrier'],
    tex: ['R = 1'],
    tip: '$R$: the reflection coefficient, the reflected fraction of the incident flux.'
  },
  {
    cards: ['supp-step-barrier'],
    match: ['step'],
    tip: 'A potential energy that jumps from one constant value to another at a single point.'
  },
  {
    cards: ['supp-step-barrier'],
    match: ['wavefunction'],
    tip: 'The function $\\psi(x)$ whose squared size $|\\psi|^2$ is the probability density of finding the particle at $x$.'
  },
  {
    cards: ['supp-step-barrier'],
    match: ['exceeds both'],
    tip: 'The energy $E$ is greater than both $V_L$ and $V_R$.'
  },
  {
    cards: ['supp-step-barrier'],
    match: ['flux'],
    tip: 'The probability current: the probability per unit time that passes a point. For a plane wave it is proportional to the squared amplitude times the wavenumber.'
  },
  {
    cards: ['supp-step-barrier'],
    match: ['barrier of finite width', 'barrier'],
    tip: 'A region of higher potential energy with a far edge, beyond which the potential falls again.'
  },
  {
    cards: ['supp-step-barrier'],
    match: ['tunneling'],
    tip: 'Passing through a region where the energy $E$ is less than the potential energy, which a classical particle cannot do.'
  },

  /* ——— supp-well-scattering: Scattering over a finite square well (supplemental list) ——— */
  {
    cards: ['supp-well-scattering'],
    tex: ['E \\gt 0'],
    tip: '$E$: the total energy of the particle. $E \\gt 0$ puts it above the potential outside the well, so the particle is not bound.'
  },
  {
    cards: ['supp-well-scattering'],
    tex: ['V = -V_0'],
    tip: '$V$: the potential energy; $V_0 \\gt 0$: the depth of the well.'
  },
  {
    cards: ['supp-well-scattering'],
    tex: ['0 \\lt x \\lt L'],
    tip: '$x$: the position; $L$: the width of the well, which spans from $x = 0$ to $x = L$.'
  },
  {
    cards: ['supp-well-scattering'],
    tex: ['V = 0'],
    tip: '$V$: the potential energy outside the well.'
  },
  {
    cards: ['supp-well-scattering'],
    tex: ['\\psi'],
    tip: '$\\psi$: the wavefunction of the particle, a function of the position $x$.'
  },
  {
    cards: ['supp-well-scattering'],
    tex: ['Ae^{ikx} + Be^{-ikx}'],
    tip: '$A$, $B$: complex amplitudes; $k$: the wavenumber outside the well; $x$: the position. With the time factor $e^{-iEt/\\hbar}$, $e^{ikx}$ moves to the right and $e^{-ikx}$ to the left.'
  },
  {
    cards: ['supp-well-scattering'],
    tex: ['k = \\sqrt{2mE}/\\hbar'],
    tip: '$k$: the wavenumber outside the well; $m$: the mass; $E$: the energy; $\\hbar$: the reduced Planck constant.'
  },
  {
    cards: ['supp-well-scattering'],
    tex: ['k\' = \\sqrt{2m(E + V_0)}/\\hbar \\gt k'],
    tip: '$k\'$: the wavenumber inside the well; $E + V_0$: the kinetic energy there; $m$: the mass; $\\hbar$: the reduced Planck constant; $k$: the wavenumber outside.'
  },
  {
    cards: ['supp-well-scattering'],
    tex: ['Ce^{ikx}'],
    tip: '$C$: the complex amplitude of the transmitted wave; $k$: the wavenumber outside the well.'
  },
  {
    cards: ['supp-well-scattering'],
    tex: ['k'],
    tip: '$k$: the wavenumber outside the well.'
  },
  {
    cards: ['supp-well-scattering'],
    tex: ['+\\infty'],
    tip: '$+\\infty$: far to the right of the well, without limit.'
  },
  {
    cards: ['supp-well-scattering'],
    tex: ['e^{-ikx}'],
    tip: '$e^{-ikx}$: a plane wave moving to the left, toward negative $x$.'
  },
  {
    cards: ['supp-well-scattering'],
    tex: ['\\sin kx', '\\cos kx'],
    tip: '$\\sin kx$, $\\cos kx$: real standing waves. Each is an equal mix of a right-moving and a left-moving wave.'
  },
  {
    cards: ['supp-well-scattering'],
    tex: ['R = 0'],
    tip: '$R$: the reflection coefficient, the reflected fraction of the incident flux.'
  },
  {
    cards: ['supp-well-scattering'],
    tex: ['T = 1'],
    tip: '$T$: the transmission coefficient, the transmitted fraction of the incident flux.'
  },
  {
    cards: ['supp-well-scattering'],
    tex: ['k\'L = n\\pi'],
    tip: '$k\'$: the wavenumber inside the well; $L$: the width of the well; $n$: a positive integer.'
  },
  {
    cards: ['supp-well-scattering'],
    tex: ['n'],
    tip: '$n$: a positive integer, $1, 2, 3, \\dots$'
  },
  {
    cards: ['supp-well-scattering'],
    tex: ['R \\gt 0'],
    tip: '$R$: the reflection coefficient.'
  },
  {
    cards: ['supp-well-scattering'],
    match: ['finite square well'],
    tip: 'A potential that has a constant negative value over a region of finite width and is zero outside it, with sharp edges.'
  },
  {
    cards: ['supp-well-scattering'],
    match: ['no reflection'],
    tip: 'The reflected wave is absent: the reflection coefficient $R$ is zero.'
  },
  {
    cards: ['supp-well-scattering'],
    match: ['incident wave'],
    tip: 'The wave arriving from the left, moving toward the well.'
  },
  {
    cards: ['supp-well-scattering'],
    match: ['reflected wave'],
    tip: 'The wave moving back to the left, away from the well.'
  },
  {
    cards: ['supp-well-scattering'],
    match: ['standing wave'],
    tip: 'A wave that does not travel, such as $\\sin kx$, made of equal right-moving and left-moving parts.'
  },
  {
    cards: ['supp-well-scattering'],
    match: ['classical particle'],
    tip: 'A particle that obeys Newton\'s laws and shows no wave behavior.'
  },
  {
    cards: ['supp-well-scattering'],
    match: ['drop in potential'],
    tip: 'A place where the potential energy falls, as at the edge of the well.'
  },

  /* ——— supp-dipole-selection-extra: Extra electric-dipole rules in LS coupling (supplemental list) ——— */
  {
    cards: ['supp-dipole-selection-extra', 'supp-rigid-rotor'],
    match: ['selection rule'],
    tip: 'A rule that says which changes of the quantum numbers a transition can make with a nonzero probability at lowest order. A transition that breaks the rule is called forbidden.'
  },
  {
    cards: ['supp-dipole-selection-extra'],
    tex: ['\\Delta S'],
    tip: '$\\Delta S$: the change in the total spin quantum number $S$ of the atom between the initial and final states.'
  },
  {
    cards: ['supp-dipole-selection-extra'],
    tex: ['\\Delta L'],
    tip: '$\\Delta L$: the change in the total orbital angular momentum quantum number $L$.'
  },
  {
    cards: ['supp-dipole-selection-extra'],
    tex: ['\\Delta J'],
    tip: '$\\Delta J$: the change in the total angular momentum quantum number $J$.'
  },
  {
    cards: ['supp-dipole-selection-extra'],
    tex: ['\\Delta S = 0'],
    tip: '$\\Delta S$: the change in the total spin quantum number.'
  },
  {
    cards: ['supp-dipole-selection-extra'],
    tex: ['\\Delta L = 0,\\pm 1'],
    tip: '$\\Delta L$: the change in the total orbital quantum number.'
  },
  {
    cards: ['supp-dipole-selection-extra'],
    tex: ['\\Delta J = 0,\\pm 1'],
    tip: '$\\Delta J$: the change in the total angular momentum quantum number.'
  },
  {
    cards: ['supp-dipole-selection-extra'],
    tex: ['0 \\leftrightarrow 0'],
    tip: 'A transition from a state with the value $0$ to another state with the value $0$.'
  },
  {
    cards: ['supp-dipole-selection-extra'],
    tex: ['L'],
    tip: '$L$: the total orbital angular momentum quantum number of all the electrons.'
  },
  {
    cards: ['supp-dipole-selection-extra'],
    tex: ['\\Delta l = \\pm 1'],
    tip: '$l$: the orbital quantum number of the one electron that changes orbital.'
  },
  {
    cards: ['supp-dipole-selection-extra'],
    tex: ['\\Delta m = 0, \\pm 1'],
    tip: '$m$: the magnetic quantum number of that electron, the $z$ component of its orbital angular momentum in units of $\\hbar$.'
  },
  {
    cards: ['supp-dipole-selection-extra'],
    match: ['electric-dipole', 'electric dipole'],
    tip: 'The strongest kind of radiative transition, in which the light couples to the electric dipole moment of the atom, $-e\\vec r$ summed over the electrons.'
  },
  {
    cards: ['supp-dipole-selection-extra'],
    match: ['parity'],
    tip: 'Whether the wavefunction keeps its sign (even, $+$) or changes sign (odd, $-$) when every position $\\vec r$ is replaced by $-\\vec r$.'
  },
  {
    cards: ['supp-dipole-selection-extra'],
    match: ['LS coupling'],
    tip: 'A scheme in which the orbital angular momenta of the electrons add to a total $L$, their spins add to a total $S$, and $L$ and $S$ then combine to $J$. It holds when spin–orbit coupling is weak compared with the electrostatic repulsion between the electrons.'
  },
  {
    cards: ['supp-dipole-selection-extra'],
    match: ['electron that jumps'],
    tip: 'The one electron that changes orbital in the transition.'
  },

  /* ——— supp-term-hund: Term symbols and Hund's ground-term rules (supplemental list) ——— */
  {
    cards: ['supp-term-hund'],
    tex: ['J'],
    tip: '$J$: the total angular momentum quantum number of the atom, from adding $L$ and $S$.'
  },
  {
    cards: ['supp-term-hund'],
    tex: ['^{2S+1}L_J'],
    tip: '$S$: the total spin quantum number; $L$: the total orbital quantum number, written as a letter; $J$: the total angular momentum quantum number. $2S+1$ is called the multiplicity.'
  },
  {
    cards: ['supp-term-hund'],
    tex: ['S, P, D, F'],
    tip: 'The capital letters used in place of the number $L$ in a term symbol.'
  },
  {
    cards: ['supp-term-hund'],
    tex: ['L = 0, 1, 2, 3'],
    tip: '$L$: the total orbital angular momentum quantum number.'
  },
  {
    cards: ['supp-term-hund'],
    tex: ['S'],
    tip: '$S$: the total spin quantum number of the electrons.'
  },
  {
    cards: ['supp-term-hund'],
    tex: ['L'],
    tip: '$L$: the total orbital angular momentum quantum number of the electrons.'
  },
  {
    cards: ['supp-term-hund'],
    tex: ['J = |L - S|', 'J = L + S'],
    tip: '$J$, $L$, $S$: the total angular momentum, total orbital and total spin quantum numbers. In general $J$ takes the values from $|L - S|$ to $L + S$ in steps of $1$.'
  },
  {
    cards: ['supp-term-hund'],
    tex: ['L = 0'],
    tip: '$L$: the total orbital quantum number.'
  },
  {
    cards: ['supp-term-hund'],
    tex: ['J = S'],
    tip: '$J$: the total angular momentum quantum number; $S$: the total spin quantum number.'
  },
  {
    cards: ['supp-term-hund'],
    tex: ['S = L = J = 0'],
    tip: '$S$, $L$, $J$: the total spin, total orbital and total angular momentum quantum numbers.'
  },
  {
    cards: ['supp-term-hund'],
    match: ['term symbol', 'term-symbol notation'],
    tip: 'A short label for one term or level of a many-electron atom.'
  },
  {
    cards: ['supp-term-hund'],
    match: ['ground term'],
    tip: 'The term of lowest energy. A term is the set of states with one value of $L$ and one value of $S$.'
  },
  {
    cards: ['supp-term-hund'],
    match: ['equivalent electrons'],
    tip: 'Electrons in the same subshell, with the same $n$ and $l$.'
  },
  {
    cards: ['supp-term-hund'],
    match: ['closed shells'],
    tip: 'Shells or subshells that hold the largest number of electrons the Pauli principle allows.'
  },
  {
    cards: ['supp-term-hund'],
    match: ['Pauli principle'],
    tip: 'No two electrons in an atom can have the same four quantum numbers $n$, $l$, $m_l$, $m_s$.'
  },
  {
    cards: ['supp-term-hund'],
    match: ['half full'],
    tip: 'The subshell holds half its maximum number of electrons: $2l+1$ out of $2(2l+1)$.'
  },
  {
    cards: ['supp-term-hund'],
    match: ['subshell'],
    tip: 'The set of one-electron states with the same $n$ and $l$. It holds up to $2(2l+1)$ electrons.'
  },
  {
    cards: ['supp-term-hund'],
    match: ['spin–orbit coupling'],
    tip: 'The interaction between the spin of an electron and its orbital motion. It splits a term into levels of different $J$.'
  },
  {
    cards: ['supp-term-hund'],
    match: ['Coulomb interaction'],
    tip: 'The electrostatic repulsion between the electrons.'
  },
  {
    cards: ['supp-term-hund'],
    match: ['Hund'],
    tip: 'Friedrich Hund, who stated empirical rules for which term of a configuration has the lowest energy.'
  },

  /* ——— supp-hydrogenic-z-scaling: Hydrogenic scaling with Z and reduced mass ——— */
  {
    cards: ['supp-hydrogenic-z-scaling', 'supp-xray-edges'],
    match: ['nuclear charge'],
    tip: 'The electric charge of the nucleus, $Ze$, where $Z$ is the number of protons and $e$ is the elementary charge.'
  },
  {
    cards: ['supp-hydrogenic-z-scaling'],
    tex: ['Ze'],
    tip: '$Z$: the number of protons in the nucleus; $e$: the elementary charge.'
  },
  {
    cards: ['supp-hydrogenic-z-scaling'],
    tex: ['\\mu'],
    tip: '$\\mu$: the reduced mass of the electron and the nucleus, $\\mu = m_e M/(m_e + M)$ for nuclear mass $M$.'
  },
  {
    cards: ['supp-hydrogenic-z-scaling'],
    tex: ['E_n'],
    tip: '$E_n$: the energy of level $n$, where $n = 1, 2, 3, \\dots$ is the principal quantum number.'
  },
  {
    cards: ['supp-hydrogenic-z-scaling'],
    tex: ['r_n'],
    tip: '$r_n$: the radius of the Bohr orbit of level $n$.'
  },
  {
    cards: ['supp-hydrogenic-z-scaling'],
    tex: ['Z'],
    tip: '$Z$: the atomic number, the number of protons in the nucleus.'
  },
  {
    cards: ['supp-hydrogenic-z-scaling'],
    tex: ['E_1'],
    tip: '$E_1$: the ground-state energy, the level $n = 1$.'
  },
  {
    cards: ['supp-hydrogenic-z-scaling'],
    tex: ['\\mathrm{He}^+'],
    tip: '$\\mathrm{He}^+$: a helium atom with one of its two electrons removed. One electron is bound to a nucleus with $Z = 2$.'
  },
  {
    cards: ['supp-hydrogenic-z-scaling'],
    tex: ['(Ze^2)^2'],
    tip: 'The square of the product of the nuclear charge $Ze$ and the electron charge $e$.'
  },
  {
    cards: ['supp-hydrogenic-z-scaling'],
    tex: ['Z^2', 'Z^4'],
    tip: 'Powers of the atomic number $Z$: $Z^2 = Z \\cdot Z$ and $Z^4 = Z^2 \\cdot Z^2$.'
  },
  {
    cards: ['supp-hydrogenic-z-scaling'],
    tex: ['E_1 = -4(13.6\\ \\text{eV}) = -54.4\\ \\text{eV}'],
    tip: '$E_1$: the ground-state energy of $\\mathrm{He}^+$. $13.6\\ \\text{eV}$: the ionization energy of hydrogen.'
  },
  {
    cards: ['supp-hydrogenic-z-scaling'],
    tex: ['r_1 = a_0/2'],
    tip: '$r_1$: the radius of the lowest orbit; $a_0$: the Bohr radius of hydrogen, about $0.053\\ \\mathrm{nm}$.'
  },
  {
    cards: ['supp-hydrogenic-z-scaling'],
    tex: ['e^4'],
    tip: '$e^4$: the fourth power of the elementary charge $e$, as it appears in the hydrogen energy formula.'
  },
  {
    cards: ['supp-hydrogenic-z-scaling'],
    tex: ['(e^2)^2'],
    tip: 'The square of $e^2$.'
  },
  {
    cards: ['supp-hydrogenic-z-scaling'],
    tex: ['e^2'],
    tip: '$e^2$: the product of two charges of size $e$.'
  },
  {
    cards: ['supp-hydrogenic-z-scaling'],
    match: ['hydrogen-like'],
    tip: 'An atom or ion with exactly one electron bound to a nucleus, such as $\\mathrm{H}$, $\\mathrm{He}^+$ or $\\mathrm{Li}^{2+}$.'
  },
  {
    cards: ['supp-hydrogenic-z-scaling'],
    match: ['reduced mass'],
    tip: 'The mass $\\mu = m_1 m_2/(m_1 + m_2)$ that replaces the electron mass when the nucleus also moves about the common center of mass.'
  },
  {
    cards: ['supp-hydrogenic-z-scaling'],
    match: ['orbit radii'],
    tip: 'The radii of the circular orbits of the Bohr model, one for each level $n$.'
  },
  {
    cards: ['supp-hydrogenic-z-scaling'],
    match: ['emitted wavelengths'],
    tip: 'The wavelengths of the photons given off when the electron drops from one level to a lower one.'
  },

  /* ——— supp-xray-edges: Moseley K-alpha estimate and Duane-Hunt limit (supplemental list) ——— */
  {
    cards: ['supp-xray-edges'],
    tex: ['K\\alpha'],
    tip: '$K\\alpha$: the strongest X-ray line of an element. It is emitted when an electron from the next shell out fills a vacancy in the innermost ($K$) shell.'
  },
  {
    cards: ['supp-xray-edges'],
    tex: ['Z - 1'],
    tip: '$Z$: the atomic number of the target element; $Z - 1$ is one less than it.'
  },
  {
    cards: ['supp-xray-edges'],
    tex: ['V'],
    tip: '$V$: the accelerating voltage between the cathode and the anode of the X-ray tube.'
  },
  {
    cards: ['supp-xray-edges'],
    tex: ['E_{K\\alpha} \\approx \\tfrac{3}{4}(13.6\\ \\text{eV})(Z-1)^2'],
    tip: '$E_{K\\alpha}$: the photon energy of the $K\\alpha$ line; $13.6\\ \\text{eV}$: the ionization energy of hydrogen; $Z$: the atomic number.'
  },
  {
    cards: ['supp-xray-edges'],
    tex: ['n = 2 \\to 1'],
    tip: '$n$: the principal quantum number; the electron moves from $n = 2$ to $n = 1$.'
  },
  {
    cards: ['supp-xray-edges'],
    tex: ['1s'],
    tip: '$1s$: the innermost orbital, with $n = 1$ and $l = 0$. It holds two electrons.'
  },
  {
    cards: ['supp-xray-edges'],
    tex: ['(Z-1)e'],
    tip: '$(Z-1)e$: a charge of $Z - 1$ elementary charges $e$.'
  },
  {
    cards: ['supp-xray-edges'],
    tex: ['\\lambda_{\\min} = hc/(eV)'],
    tip: '$\\lambda_{\\min}$: the shortest wavelength in the spectrum of the tube; $h$: the Planck constant; $c$: the speed of light; $e$: the elementary charge; $V$: the tube voltage.'
  },
  {
    cards: ['supp-xray-edges'],
    tex: ['eV'],
    tip: '$eV$: the kinetic energy that an electron of charge $e$ gains when accelerated through the voltage $V$.'
  },
  {
    cards: ['supp-xray-edges'],
    tex: ['\\lambda_{\\min}\\,[\\text{nm}] \\approx 1240/V\\,[\\text{V}]'],
    tip: '$\\lambda_{\\min}$ in nanometres and $V$ in volts. The number $1240$ comes from $hc \\approx 1240\\ \\mathrm{eV\\,nm}$.'
  },
  {
    cards: ['supp-xray-edges'],
    match: ['Moseley'],
    tip: 'Henry Moseley, who in 1913 measured the X-ray lines of many elements and compared them with atomic number.'
  },
  {
    cards: ['supp-xray-edges'],
    match: ['short-wavelength limit'],
    tip: 'The shortest wavelength in the continuous X-ray spectrum of the tube. No photons of shorter wavelength come out.'
  },
  {
    cards: ['supp-xray-edges'],
    match: ['X-ray tube'],
    tip: 'A vacuum tube in which electrons accelerated through a voltage $V$ strike a metal target and produce X-rays.'
  },
  {
    cards: ['supp-xray-edges'],
    match: ['Duane–Hunt'],
    tip: 'The Duane–Hunt law, found by William Duane and Franklin Hunt in 1915, for the shortest wavelength an X-ray tube emits.'
  },
  {
    cards: ['supp-xray-edges'],
    match: ['screens'],
    tip: 'Its negative charge cancels part of the nuclear charge as seen by an electron farther out.'
  },

  /* ——— supp-rigid-rotor: Rigid rotor levels and pure-rotation selection (supplemental list) ——— */
  {
    cards: ['supp-rigid-rotor'],
    tex: ['E_J = \\hbar^2J(J+1)/(2I)'],
    tip: '$E_J$: the energy of rotational level $J$; $\\hbar$: the reduced Planck constant; $I$: the moment of inertia.'
  },
  {
    cards: ['supp-rigid-rotor'],
    tex: ['J = 0, 1, 2, \\ldots'],
    tip: '$J$: the rotational quantum number, a non-negative integer.'
  },
  {
    cards: ['supp-rigid-rotor'],
    tex: ['2J+1'],
    tip: '$2J+1$: one more than twice the rotational quantum number $J$.'
  },
  {
    cards: ['supp-rigid-rotor'],
    tex: ['T = L^2/(2I)'],
    tip: '$T$: the rotational kinetic energy; $L$: the angular momentum; $I$: the moment of inertia.'
  },
  {
    cards: ['supp-rigid-rotor'],
    tex: ['L^2 = \\hbar^2J(J+1)'],
    tip: '$L^2$: the square of the angular momentum; $J$: the rotational quantum number; $\\hbar$: the reduced Planck constant.'
  },
  {
    cards: ['supp-rigid-rotor'],
    tex: ['J'],
    tip: '$J$: the rotational quantum number.'
  },
  {
    cards: ['supp-rigid-rotor'],
    tex: ['J+1'],
    tip: '$J+1$: one more than the rotational quantum number $J$.'
  },
  {
    cards: ['supp-rigid-rotor'],
    tex: ['I = \\mu r_e^2'],
    tip: '$I$: the moment of inertia about the center of mass; $\\mu$: the reduced mass; $r_e$: the bond length.'
  },
  {
    cards: ['supp-rigid-rotor'],
    tex: ['\\mu = m_1m_2/(m_1+m_2)'],
    tip: '$\\mu$: the reduced mass; $m_1$, $m_2$: the masses of the two atoms.'
  },
  {
    cards: ['supp-rigid-rotor'],
    tex: ['r_e'],
    tip: '$r_e$: the equilibrium bond length, the distance between the two nuclei.'
  },
  {
    cards: ['supp-rigid-rotor'],
    tex: ['m'],
    tip: '$m$: the mass of one atom, treated as a point mass.'
  },
  {
    cards: ['supp-rigid-rotor'],
    tex: ['I = 2m(r_e/2)^2 = \\tfrac{1}{2}mr_e^2'],
    tip: '$I$: the moment of inertia; $m$: the mass of each of the two equal atoms; $r_e/2$: the distance of each atom from the center.'
  },
  {
    cards: ['supp-rigid-rotor'],
    tex: ['a'],
    tip: '$a$: the length of the rod, the distance between its two end masses.'
  },
  {
    cards: ['supp-rigid-rotor'],
    tex: ['E_J = \\hbar^2J(J+1)/(ma^2)'],
    tip: '$E_J$: the energy of level $J$; $m$: each end mass; $a$: the rod length; $\\hbar$: the reduced Planck constant.'
  },
  {
    cards: ['supp-rigid-rotor'],
    tex: ['3m'],
    tip: '$3m$: a mass three times $m$.'
  },
  {
    cards: ['supp-rigid-rotor'],
    tex: ['\\tfrac{3}{4}mr_e^2'],
    tip: '$\\tfrac{3}{4}mr_e^2$: three quarters of $m r_e^2$, where $m$ is the lighter mass and $r_e$ the bond length.'
  },
  {
    cards: ['supp-rigid-rotor'],
    tex: ['mr_e^2'],
    tip: '$mr_e^2$: the mass $m$ times the square of the bond length $r_e$.'
  },
  {
    cards: ['supp-rigid-rotor'],
    tex: ['\\Delta J = \\pm 1'],
    tip: '$\\Delta J$: the change in the rotational quantum number in a transition.'
  },
  {
    cards: ['supp-rigid-rotor'],
    tex: ['\\mathrm{H}_2', '\\mathrm{N}_2'],
    tip: '$\\mathrm{H}_2$, $\\mathrm{N}_2$: the hydrogen and nitrogen molecules, each made of two identical atoms.'
  },
  {
    cards: ['supp-rigid-rotor'],
    tex: ['2B'],
    tip: '$B$: the rotational constant of the molecule, in energy units.'
  },
  {
    cards: ['supp-rigid-rotor'],
    tex: ['J \\to J+1'],
    tip: 'A transition from rotational level $J$ up to level $J+1$.'
  },
  {
    cards: ['supp-rigid-rotor'],
    tex: ['2B(J+1)'],
    tip: '$B$: the rotational constant; $J$: the quantum number of the lower level.'
  },
  {
    cards: ['supp-rigid-rotor'],
    tex: ['B = \\hbar^2/(2I)'],
    tip: '$B$: the rotational constant; $\\hbar$: the reduced Planck constant; $I$: the moment of inertia.'
  },
  {
    cards: ['supp-rigid-rotor'],
    match: ['rigid rotor', 'rigid-rotor'],
    tip: 'A model of a molecule as point masses at fixed distances from each other, which can rotate but not stretch.'
  },
  {
    cards: ['supp-rigid-rotor'],
    match: ['degeneracy'],
    tip: 'The number of distinct quantum states that share one energy.'
  },
  {
    cards: ['supp-rigid-rotor'],
    match: ['moment of inertia'],
    tip: 'The quantity that relates angular momentum to angular velocity, $L = I\\omega$. It is larger when the mass sits farther from the rotation axis.'
  },
  {
    cards: ['supp-rigid-rotor'],
    match: ['diatomic'],
    tip: 'Made of two atoms.'
  },
  {
    cards: ['supp-rigid-rotor'],
    match: ['pure-rotation', 'pure rotational'],
    tip: 'A transition in which only the rotational state changes, while the vibrational and electronic states stay the same.'
  },
  {
    cards: ['supp-rigid-rotor'],
    match: ['rotational lines'],
    tip: 'The spectral lines from transitions between rotational levels, usually in the microwave or far-infrared range.'
  },
  {
    cards: ['supp-rigid-rotor'],
    match: ['reduced mass'],
    tip: 'A single mass that describes the motion of two bodies relative to each other about their common center of mass.'
  },
  {
    cards: ['supp-rigid-rotor'],
    match: ['center of mass'],
    tip: 'The mass-weighted average position of the atoms, $\\sum_i m_i \\vec r_i / \\sum_i m_i$.'
  },
  {
    cards: ['supp-rigid-rotor'],
    match: ['permanent electric dipole'],
    tip: 'A separation of positive and negative charge that the molecule has with no applied field, as in $\\mathrm{HCl}$.'
  },
  {
    cards: ['supp-rigid-rotor'],
    match: ['bond length'],
    tip: 'The distance between the two nuclei at the minimum of the molecular potential energy.'
  },
  {
    cards: ['supp-rigid-rotor'],
    match: ['dumbbell'],
    tip: 'Two point masses joined by a massless rod.'
  },

  /* ——— supp-hall: Single-carrier Hall field ——— */
  {
    cards: ['supp-hall'],
    tex: ['q'],
    tip: '$q$: the charge of one carrier, with its sign: $-e$ for an electron, $+e$ for a hole.'
  },
  {
    cards: ['supp-hall'],
    tex: ['n'],
    tip: '$n$: the number of carriers per unit volume.'
  },
  {
    cards: ['supp-hall'],
    tex: ['J_x'],
    tip: '$J_x$: the current density along $x$, the current per unit cross-sectional area.'
  },
  {
    cards: ['supp-hall'],
    tex: ['B_z'],
    tip: '$B_z$: the magnetic field along $z$.'
  },
  {
    cards: ['supp-hall'],
    tex: ['E_y'],
    tip: '$E_y$: the Hall field, the electric field along $y$ that builds up across the sample.'
  },
  {
    cards: ['supp-hall'],
    tex: ['R_H'],
    tip: '$R_H$: the Hall coefficient of the material.'
  },
  {
    cards: ['supp-hall'],
    tex: ['R_H \\lt 0', 'R_H \\gt 0'],
    tip: '$R_H$: the Hall coefficient. $\\lt 0$ means negative and $\\gt 0$ means positive.'
  },
  {
    cards: ['supp-hall'],
    match: ['carrier'],
    tip: 'A mobile charged particle that carries the current: a conduction electron or a hole.'
  },
  {
    cards: ['supp-hall'],
    match: ['signed charge'],
    tip: 'The charge including its sign: negative for an electron, positive for a hole.'
  },
  {
    cards: ['supp-hall'],
    match: ['current density'],
    tip: 'The current per unit cross-sectional area, a vector along the direction of flow.'
  },
  {
    cards: ['supp-hall'],
    match: ['Hall field'],
    tip: 'The transverse electric field that builds up across a current-carrying sample in a magnetic field.'
  },
  {
    cards: ['supp-hall'],
    match: ['hole'],
    tip: 'A missing electron in a nearly filled band. It moves like a carrier of charge $+e$.'
  },
  {
    cards: ['supp-hall'],
    match: ['semiconductors'],
    tip: 'Materials with far fewer conduction carriers per unit volume than metals, whose number grows with temperature.'
  },
  {
    cards: ['supp-hall'],
    match: ['single band'],
    tip: 'All the carriers are of one kind, in one energy band.'
  },
  {
    cards: ['supp-hall'],
    match: ['low field'],
    tip: 'The magnetic field is weak enough that a carrier completes only a small part of a cyclotron orbit between collisions.'
  },

  /* ——— supp-nuclear-q: Binding energy and the iron peak ——— */
  {
    cards: ['supp-nuclear-q'],
    tex: ['B'],
    tip: '$B$: the binding energy of a nucleus, usually given in $\\mathrm{MeV}$.'
  },
  {
    cards: ['supp-nuclear-q'],
    tex: ['B/A'],
    tip: '$B/A$: the binding energy per nucleon. $A$: the mass number, the number of protons plus neutrons.'
  },
  {
    cards: ['supp-nuclear-q'],
    tex: ['8.8\\ \\mathrm{MeV}'],
    tip: '$\\mathrm{MeV}$: a million electron volts, about $1.602\\times10^{-13}\\ \\mathrm{J}$.'
  },
  {
    cards: ['supp-nuclear-q'],
    tex: ['1\\ \\mathrm{u}\\,c^2 \\approx 931.5\\ \\mathrm{MeV}'],
    tip: '$\\mathrm{u}$: the atomic mass unit, one twelfth of the mass of a carbon-12 atom; $c$: the speed of light.'
  },
  {
    cards: ['supp-nuclear-q'],
    match: ['fission'],
    tip: 'The splitting of a heavy nucleus into two lighter nuclei.'
  },
  {
    cards: ['supp-nuclear-q'],
    match: ['fusion'],
    tip: 'The joining of two light nuclei into one heavier nucleus.'
  },
  {
    cards: ['supp-nuclear-q'],
    match: ['iron peak'],
    tip: 'The maximum of the curve of binding energy per nucleon plotted against mass number.'
  },
  {
    cards: ['supp-nuclear-q'],
    match: ['mass unit'],
    tip: 'The atomic mass unit $\\mathrm{u}$: one twelfth of the mass of a carbon-12 atom.'
  },

  /* ——— supp-magnetons: Bohr and nuclear magnetons and the weak-field Zeeman shift (supplemental list) ——— */
  {
    cards: ['supp-magnetons'],
    tex: ['g_J'],
    tip: '$g_J$: the Landé $g$-factor of the level, the number that converts its angular momentum into magnetic moment.'
  },
  {
    cards: ['supp-magnetons'],
    tex: ['\\mu_B = e\\hbar/(2m_e) \\approx 5.8\\times10^{-5}\\ \\text{eV/T}'],
    tip: '$\\mu_B$: the Bohr magneton; $e$: the elementary charge; $\\hbar$: the reduced Planck constant; $m_e$: the electron mass. $\\text{eV/T}$: electron volts per tesla.'
  },
  {
    cards: ['supp-magnetons'],
    tex: ['\\mu_N = e\\hbar/(2m_p)'],
    tip: '$\\mu_N$: the nuclear magneton; $e$: the elementary charge; $\\hbar$: the reduced Planck constant; $m_p$: the proton mass.'
  },
  {
    cards: ['supp-magnetons'],
    tex: ['\\mu_B/\\mu_N = m_p/m_e \\approx 1836'],
    tip: '$\\mu_B$, $\\mu_N$: the Bohr and nuclear magnetons; $m_p/m_e$: the proton mass divided by the electron mass.'
  },
  {
    cards: ['supp-magnetons'],
    tex: ['\\Delta E = g_J\\mu_B m_J B'],
    tip: '$\\Delta E$: the energy shift; $\\mu_B$: the Bohr magneton; $m_J$: the magnetic quantum number of the state, from $-J$ to $J$; $B$: the magnetic field.'
  },
  {
    cards: ['supp-magnetons'],
    tex: ['g_J = 2', 'g_J = 1'],
    tip: '$g_J$: the Landé $g$-factor of the level.'
  },
  {
    cards: ['supp-magnetons'],
    tex: ['L = 0'],
    tip: '$L$: the total orbital angular momentum quantum number.'
  },
  {
    cards: ['supp-magnetons'],
    tex: ['S = 0'],
    tip: '$S$: the total spin quantum number.'
  },
  {
    cards: ['supp-magnetons'],
    tex: ['J = 0'],
    tip: '$J$: the total angular momentum quantum number.'
  },
  {
    cards: ['supp-magnetons'],
    match: ['magneton'],
    tip: 'A natural unit of magnetic moment for atoms or nuclei.'
  },
  {
    cards: ['supp-magnetons'],
    match: ['Zeeman shift'],
    tip: 'The shift of an energy level in an applied magnetic field.'
  },
  {
    cards: ['supp-magnetons'],
    match: ['weak-field'],
    tip: 'The applied magnetic field is small compared with the internal field that causes fine structure, so $J$ stays a good quantum number.'
  },
  {
    cards: ['supp-magnetons'],
    match: ['Landé factor'],
    tip: 'The $g$-factor of a level with given $L$, $S$ and $J$. It depends on how the spin and orbital moments combine.'
  },
  {
    cards: ['supp-magnetons'],
    match: ['pure-spin', 'pure spin'],
    tip: 'A level whose angular momentum is all spin, with no orbital part.'
  },
  {
    cards: ['supp-magnetons'],
    match: ['pure-orbital', 'pure orbit'],
    tip: 'A level whose angular momentum is all orbital, with no spin part.'
  },
  {
    cards: ['supp-magnetons'],
    match: ['first-order shift'],
    tip: 'The part of the energy shift proportional to $B$, from first-order perturbation theory.'
  },

  /* ——— supp-fourier-series: Fourier series on a full period (supplemental list) ——— */
  {
    cards: ['supp-fourier-series'],
    tex: ['[-\\pi,\\pi]'],
    tip: '$[-\\pi,\\pi]$: the interval of $x$ from $-\\pi$ to $\\pi$, one full period of length $2\\pi$.'
  },
  {
    cards: ['supp-fourier-series'],
    tex: ['a_0/2'],
    tip: '$a_0$: the cosine coefficient with $n = 0$; $a_0/2$ is half of it.'
  },
  {
    cards: ['supp-fourier-series'],
    tex: ['a_n = (1/\\pi)\\int_{-\\pi}^{\\pi} f(x)\\cos(nx)\\,dx'],
    tip: '$a_n$: the cosine coefficient of order $n$; $f(x)$: the function being expanded; $x$: the variable on $[-\\pi,\\pi]$.'
  },
  {
    cards: ['supp-fourier-series'],
    tex: ['b_n = (1/\\pi)\\int_{-\\pi}^{\\pi} f(x)\\sin(nx)\\,dx'],
    tip: '$b_n$: the sine coefficient of order $n$; $f(x)$: the function being expanded; $x$: the variable on $[-\\pi,\\pi]$.'
  },
  {
    cards: ['supp-fourier-series'],
    tex: ['n \\ge 0', 'n \\ge 1'],
    tip: '$n$: the order of the coefficient, a whole number.'
  },
  {
    cards: ['supp-fourier-series'],
    tex: ['f'],
    tip: '$f$: the function being expanded, given on $[-\\pi,\\pi]$.'
  },
  {
    cards: ['supp-fourier-series'],
    tex: ['b_n'],
    tip: '$b_n$: the coefficient of $\\sin(nx)$ in the series.'
  },
  {
    cards: ['supp-fourier-series'],
    tex: ['a_n'],
    tip: '$a_n$: the coefficient of $\\cos(nx)$ in the series.'
  },
  {
    cards: ['supp-fourier-series'],
    match: ['coefficient integrals'],
    tip: 'The integrals that give each coefficient of the series from the function $f$.'
  },
  {
    cards: ['supp-fourier-series'],
    match: ['odd symmetry'],
    tip: 'A function is odd when $f(-x) = -f(x)$ and even when $f(-x) = f(x)$.'
  },
  {
    cards: ['supp-fourier-series'],
    match: ['kill'],
    tip: 'Make every one of those coefficients zero.'
  },
  {
    cards: ['supp-fourier-series'],
    match: ['jump'],
    tip: 'A point where $f$ has a finite discontinuity: its limits from the left and from the right differ.'
  },
  {
    cards: ['supp-fourier-series'],
    match: ['periodic extension'],
    tip: 'The function made by repeating $f$ from $[-\\pi,\\pi]$ every $2\\pi$ along the whole $x$ axis.'
  },

  /* ——— supp-residues: Residue theorem and a simple pole (supplemental list) ——— */
  {
    cards: ['supp-residues'],
    tex: ['n'],
    tip: '$n$: the order of the pole, a positive integer.'
  },
  {
    cards: ['supp-residues'],
    tex: ['\\oint f\\,dz = 2\\pi i\\sum\\mathrm{Res}'],
    tip: '$\\oint$: an integral once around a closed contour, counterclockwise; $f$: the function; $z$: the complex variable; $\\sum\\mathrm{Res}$: the sum of the residues of $f$ at the singularities inside.'
  },
  {
    cards: ['supp-residues'],
    tex: ['f'],
    tip: '$f$: a function of the complex variable $z$.'
  },
  {
    cards: ['supp-residues'],
    tex: ['z_0'],
    tip: '$z_0$: the point in the complex plane where $f$ has the pole.'
  },
  {
    cards: ['supp-residues'],
    tex: ['\\mathrm{Res} = \\lim_{z\\to z_0}(z - z_0)f(z)'],
    tip: '$\\mathrm{Res}$: the residue of $f$ at $z_0$; $\\lim_{z\\to z_0}$: the limit as $z$ approaches $z_0$.'
  },
  {
    cards: ['supp-residues'],
    tex: ['\\oint f\\,dz = -2\\pi i\\sum\\mathrm{Res}'],
    tip: '$\\oint$: an integral once around a closed contour, here clockwise; $f$: the function; $z$: the complex variable; $\\sum\\mathrm{Res}$: the sum of the residues inside.'
  },
  {
    cards: ['supp-residues'],
    tex: ['\\mathrm{Res} = \\dfrac{1}{(n-1)!}\\lim_{z\\to z_0}\\dfrac{d^{n-1}}{dz^{n-1}}\\left[(z - z_0)^n f(z)\\right]'],
    tip: '$n$: the order of the pole at $z_0$; $\\dfrac{d^{n-1}}{dz^{n-1}}$: the derivative of order $n-1$ with respect to $z$; $(n-1)!$: the factorial of $n-1$.'
  },
  {
    cards: ['supp-residues'],
    match: ['residue theorem'],
    tip: 'A theorem of complex analysis about the integral of a function once around a closed contour.'
  },
  {
    cards: ['supp-residues'],
    match: ['residue'],
    tip: 'The coefficient of $(z - z_0)^{-1}$ in the Laurent series of $f$ about the point $z_0$.'
  },
  {
    cards: ['supp-residues'],
    match: ['simple pole'],
    tip: 'A pole of order $1$.'
  },
  {
    cards: ['supp-residues'],
    match: ['pole'],
    tip: 'A point $z_0$ where $|f(z)|$ grows without bound, while $(z - z_0)^n f(z)$ stays finite and nonzero for some positive integer $n$. The smallest such $n$ is the order of the pole.'
  },
  {
    cards: ['supp-residues'],
    match: ['contour'],
    tip: 'A closed path in the complex plane along which the integral is taken.'
  },
  {
    cards: ['supp-residues'],
    match: ['counterclockwise'],
    tip: 'Going around with the enclosed region on the left.'
  },
  {
    cards: ['supp-residues'],
    match: ['clockwise'],
    tip: 'Going around with the enclosed region on the right.'
  },
  {
    cards: ['supp-residues'],
    match: ['analytic'],
    tip: 'Having a complex derivative at every point of a region.'
  },
  {
    cards: ['supp-residues'],
    match: ['isolated singularities'],
    tip: 'Points where $f$ is not analytic, each with a small neighbourhood that contains no other such point.'
  },
  {
    cards: ['supp-residues'],
    match: ['simple closed curve'],
    tip: 'A closed curve that does not cross itself.'
  },

  /* ——— supp-matrix-det-trace: Determinant, trace, and eigenvalues (supplemental list) ——— */
  {
    cards: ['supp-matrix-det-trace'],
    tex: ['\\det(AB) = \\det A\\,\\det B'],
    tip: '$A$, $B$: square matrices of the same size; $\\det$: the determinant; $AB$: their matrix product.'
  },
  {
    cards: ['supp-matrix-det-trace'],
    tex: ['\\operatorname{Tr}(AB) = \\operatorname{Tr}(BA)'],
    tip: '$\\operatorname{Tr}$: the trace, the sum of the diagonal entries; $A$, $B$: square matrices of the same size.'
  },
  {
    cards: ['supp-matrix-det-trace'],
    tex: ['\\det(A - \\lambda I) = 0'],
    tip: '$\\lambda$: a number to be solved for; $I$: the identity matrix of the same size as $A$; $\\det$: the determinant.'
  },
  {
    cards: ['supp-matrix-det-trace'],
    tex: ['\\operatorname{Tr} A = \\sum_i \\lambda_i', '\\det A = \\prod_i \\lambda_i'],
    tip: '$\\lambda_i$: the eigenvalues of $A$. $\\sum_i$ is a sum and $\\prod_i$ a product over all of them.'
  },
  {
    cards: ['supp-matrix-det-trace'],
    match: ['determinant'],
    tip: 'A single number computed from the entries of a square matrix, for example $ad - bc$ for the $2\\times2$ matrix with rows $(a, b)$ and $(c, d)$.'
  },
  {
    cards: ['supp-matrix-det-trace'],
    match: ['trace identity'],
    tip: 'A rule for the trace of a product of matrices.'
  },
  {
    cards: ['supp-matrix-det-trace'],
    match: ['trace'],
    tip: 'The sum of the diagonal entries of a square matrix.'
  },
  {
    cards: ['supp-matrix-det-trace'],
    match: ['characteristic equation'],
    tip: 'The polynomial equation in $\\lambda$ whose roots are the eigenvalues of a matrix.'
  },
  {
    cards: ['supp-matrix-det-trace'],
    match: ['eigenvalues'],
    tip: 'The numbers $\\lambda$ for which $A\\vec v = \\lambda \\vec v$ has a nonzero solution $\\vec v$.'
  },
  {
    cards: ['supp-matrix-det-trace'],
    match: ['cyclic'],
    tip: 'A cyclic reorder moves the last factor to the front, one step at a time: $ABC \\to CAB \\to BCA$.'
  },
  {
    cards: ['supp-matrix-det-trace'],
    match: ['multiplicity'],
    tip: 'An eigenvalue that is a double root of the characteristic equation is counted twice, a triple root three times, and so on.'
  },
  {
    cards: ['supp-matrix-det-trace'],
    match: ['normal modes'],
    tip: 'Patterns of oscillation in which every part of a system moves at one shared frequency.'
  },
  {
    cards: ['supp-matrix-det-trace'],
    match: ['spin matrices'],
    tip: 'Matrices for the components of spin, such as the Pauli matrices for spin $\\tfrac12$.'
  },

  /* ——— supp-counting-distributions: Binomial, Poisson, and Gaussian: one family (supplemental list) ——— */
  {
    cards: ['supp-counting-distributions'],
    tex: ['N'],
    tip: '$N$: a whole number of trials: the number of yes/no tries in the binomial, or the number of readings or time slices where the line says so.'
  },
  {
    cards: ['supp-counting-distributions'],
    tex: ['p'],
    tip: '$p$: the chance that one try gives a yes, between $0$ and $1$.'
  },
  {
    cards: ['supp-counting-distributions'],
    tex: ['P(k) = \\binom{N}{k}p^k(1-p)^{N-k}'],
    tip: '$P(k)$: the chance of exactly $k$ yeses in $N$ tries; $\\binom{N}{k}$: the number of ways to choose which $k$ tries are the yeses; $p$: the chance of a yes in one try.'
  },
  {
    cards: ['supp-counting-distributions'],
    tex: ['\\langle k\\rangle = Np'],
    tip: '$\\langle k\\rangle$: the mean number of yeses.'
  },
  {
    cards: ['supp-counting-distributions'],
    tex: ['\\sigma^2 = Np(1-p)'],
    tip: '$\\sigma^2$: the variance of the count, the mean squared distance from the mean.'
  },
  {
    cards: ['supp-counting-distributions'],
    tex: ['k \\le N'],
    tip: '$k$: the number of yeses; $N$: the number of tries.'
  },
  {
    cards: ['supp-counting-distributions'],
    tex: ['\\sigma = \\sqrt{N}/2'],
    tip: '$\\sigma$: the standard deviation of the number of heads; $N$: the number of tosses.'
  },
  {
    cards: ['supp-counting-distributions'],
    tex: ['\\sqrt{N}'],
    tip: '$\\sqrt{N}$: the square root of the number of tries.'
  },
  {
    cards: ['supp-counting-distributions'],
    tex: ['1-(1-p)^N'],
    tip: 'One minus the chance $(1-p)^N$ that all $N$ tries give a no.'
  },
  {
    cards: ['supp-counting-distributions'],
    tex: ['(1-p)^N'],
    tip: '$(1-p)^N$: the chance $1-p$ of a no in one try, raised to the number of tries $N$.'
  },
  {
    cards: ['supp-counting-distributions'],
    tex: ['p^N'],
    tip: '$p^N$: the chance $p$ of a yes in one try, raised to the power $N$.'
  },
  {
    cards: ['supp-counting-distributions'],
    tex: ['r'],
    tip: '$r$: the average rate of events, in events per unit time.'
  },
  {
    cards: ['supp-counting-distributions'],
    tex: ['t'],
    tip: '$t$: the length of the counting time.'
  },
  {
    cards: ['supp-counting-distributions'],
    tex: ['P(n) = \\lambda^n e^{-\\lambda}/n!'],
    tip: '$P(n)$: the chance of exactly $n$ events; $\\lambda$: the expected number of events; $n!$: the factorial of $n$.'
  },
  {
    cards: ['supp-counting-distributions'],
    tex: ['\\lambda = rt'],
    tip: '$\\lambda$: the expected number of events in the time $t$ at the rate $r$.'
  },
  {
    cards: ['supp-counting-distributions'],
    tex: ['P(0) = e^{-\\lambda}'],
    tip: '$P(0)$: the chance of zero events; $\\lambda$: the expected number of events.'
  },
  {
    cards: ['supp-counting-distributions'],
    tex: ['= \\lambda'],
    tip: '$\\lambda$: the expected number of events in the window.'
  },
  {
    cards: ['supp-counting-distributions'],
    tex: ['\\sigma = \\sqrt{\\lambda}'],
    tip: '$\\sigma$: the standard deviation of the count; $\\lambda$: the expected count.'
  },
  {
    cards: ['supp-counting-distributions'],
    tex: ['\\sigma/\\lambda = 1/\\sqrt{\\lambda}'],
    tip: '$\\sigma/\\lambda$: the standard deviation divided by the expected count $\\lambda$.'
  },
  {
    cards: ['supp-counting-distributions'],
    tex: ['400 \\pm 20'],
    tip: 'A count of $400$ with an uncertainty of $20$.'
  },
  {
    cards: ['supp-counting-distributions'],
    tex: ['T'],
    tip: '$T$: the length of the counting time in which zero events were seen.'
  },
  {
    cards: ['supp-counting-distributions'],
    tex: ['1-\\mathrm{CL}'],
    tip: '$\\mathrm{CL}$: the confidence level, for example $0.90$; $1-\\mathrm{CL}$ is what is left of $1$.'
  },
  {
    cards: ['supp-counting-distributions'],
    tex: ['e^{-r_{\\rm up}T} = 1-\\mathrm{CL}'],
    tip: '$r_{\\rm up}$: the upper limit on the rate; $T$: the counting time; $\\mathrm{CL}$: the confidence level.'
  },
  {
    cards: ['supp-counting-distributions'],
    tex: ['p(x) = \\tfrac{1}{\\sigma\\sqrt{2\\pi}}\\,e^{-(x-\\mu)^2/(2\\sigma^2)}'],
    tip: '$p(x)$: the probability density at the value $x$; $\\mu$: the mean; $\\sigma$: the standard deviation.'
  },
  {
    cards: ['supp-counting-distributions'],
    tex: ['\\mu'],
    tip: '$\\mu$: the mean, the center of the distribution.'
  },
  {
    cards: ['supp-counting-distributions'],
    tex: ['\\sigma'],
    tip: '$\\sigma$: the standard deviation, the typical spread about the mean.'
  },
  {
    cards: ['supp-counting-distributions'],
    tex: ['\\pm1\\sigma', '\\pm2\\sigma', '\\pm3\\sigma'],
    tip: 'Within one, two or three standard deviations $\\sigma$ of the mean.'
  },
  {
    cards: ['supp-counting-distributions'],
    tex: ['\\mathrm{FWHM} \\approx 2.35\\,\\sigma'],
    tip: '$\\mathrm{FWHM}$: the full width at half maximum, the width of the curve where it falls to half its peak height; $\\sigma$: the standard deviation.'
  },
  {
    cards: ['supp-counting-distributions'],
    tex: ['\\sigma_{\\bar{x}} = \\sigma/\\sqrt{N}'],
    tip: '$\\sigma_{\\bar{x}}$: the standard deviation of the mean $\\bar x$ of $N$ readings; $\\sigma$: the standard deviation of one reading.'
  },
  {
    cards: ['supp-counting-distributions'],
    tex: ['N \\to \\infty'],
    tip: 'The number of tries $N$ grows without bound.'
  },
  {
    cards: ['supp-counting-distributions'],
    tex: ['p \\to 0'],
    tip: 'The chance per try $p$ shrinks toward zero.'
  },
  {
    cards: ['supp-counting-distributions'],
    tex: ['Np = \\lambda'],
    tip: '$Np$: the mean count, held fixed at the value $\\lambda$.'
  },
  {
    cards: ['supp-counting-distributions'],
    tex: ['P(0) = (1-\\lambda/N)^N \\to e^{-\\lambda}'],
    tip: '$\\lambda/N$: the chance of an event in one of $N$ tiny time windows; $(1-\\lambda/N)^N$: the chance that all $N$ windows are empty.'
  },
  {
    cards: ['supp-counting-distributions'],
    tex: ['\\lambda'],
    tip: '$\\lambda$: the expected (mean) number of events in the counting time.'
  },
  {
    cards: ['supp-counting-distributions'],
    tex: ['\\mu = \\lambda'],
    tip: '$\\mu$: the mean of the Gaussian; $\\lambda$: the Poisson mean.'
  },
  {
    cards: ['supp-counting-distributions'],
    tex: ['Np(1-p) \\gg 1'],
    tip: '$Np(1-p)$: the binomial variance. $\\gg 1$ means much larger than one.'
  },
  {
    cards: ['supp-counting-distributions'],
    tex: ['\\mu = Np'],
    tip: '$\\mu$: the Gaussian mean; $Np$: the binomial mean.'
  },
  {
    cards: ['supp-counting-distributions'],
    tex: ['\\sigma^2 \\lt', '\\sigma^2 ='],
    tip: '$\\sigma^2$: the variance of the count.'
  },
  {
    cards: ['supp-counting-distributions'],
    match: ['Poisson'],
    tip: 'Named after Siméon Denis Poisson, who published the distribution in 1837.'
  },
  {
    cards: ['supp-counting-distributions'],
    match: ['Gaussian'],
    tip: 'Named after Carl Friedrich Gauss. It is also called the normal distribution.'
  },
  {
    cards: ['supp-counting-distributions'],
    match: ['spread'],
    tip: 'How widely the values scatter about the mean, given as the variance $\\sigma^2$ or the standard deviation $\\sigma$.'
  },
  {
    cards: ['supp-counting-distributions'],
    match: ['upper limit'],
    tip: 'The largest value of the rate that the data do not rule out at the chosen confidence level.'
  },
  {
    cards: ['supp-counting-distributions'],
    match: ['confidence'],
    tip: 'The confidence level $\\mathrm{CL}$: the fraction of repeated experiments, such as $90\\%$, in which a limit found this way would lie above the true rate.'
  },
  {
    cards: ['supp-counting-distributions'],
    match: ['variance'],
    tip: 'The mean of the squared distance from the mean, written $\\sigma^2$.'
  },
  {
    cards: ['supp-counting-distributions'],
    match: ['absolute error'],
    tip: 'The size of the uncertainty in counts, in the same unit as the count itself.'
  },
  {
    cards: ['supp-counting-distributions'],
    match: ['silent window'],
    tip: 'A counting interval with zero events.'
  },
  {
    cards: ['supp-counting-distributions'],
    match: ['central limit theorem'],
    tip: 'The theorem that a sum of many independent random quantities with finite variance has a distribution close to a Gaussian.'
  },
  {
    cards: ['supp-counting-distributions'],
    match: ['free knobs'],
    tip: 'Parameters that can be set independently: $\\mu$ to any real number and $\\sigma$ to any positive number.'
  },
  {
    cards: ['supp-counting-distributions'],
    match: ['spread fingerprint'],
    tip: 'A test that tells the three distributions apart by comparing the variance with the mean.'
  },

  /* ——— supp-thin-film: Normal-incidence thin-film reflection (supplemental list) ——— */
  {
    cards: ['supp-thin-film'],
    tex: ['n'],
    tip: '$n$: the refractive index of the film.'
  },
  {
    cards: ['supp-thin-film'],
    tex: ['t'],
    tip: '$t$: the thickness of the film.'
  },
  {
    cards: ['supp-thin-film'],
    tex: ['180^\\circ'],
    tip: '$180^\\circ$: half a turn of phase, equal to $\\pi$ radians.'
  },
  {
    cards: ['supp-thin-film'],
    tex: ['\\pi'],
    tip: '$\\pi$: a phase of $\\pi$ radians, the same as $180^\\circ$.'
  },
  {
    cards: ['supp-thin-film'],
    tex: ['2nt'],
    tip: '$2nt$: twice the refractive index $n$ of the film times its thickness $t$.'
  },
  {
    cards: ['supp-thin-film'],
    tex: ['2nt = \\left(m + \\tfrac12\\right)\\lambda'],
    tip: '$m$: an integer $0, 1, 2, \\dots$; $\\lambda$: the vacuum wavelength; $n$, $t$: the index and thickness of the film.'
  },
  {
    cards: ['supp-thin-film'],
    tex: ['2nt = m\\lambda'],
    tip: '$m$: an integer; $\\lambda$: the vacuum wavelength; $n$: the refractive index of the film; $t$: its thickness.'
  },
  {
    cards: ['supp-thin-film'],
    tex: ['\\lambda'],
    tip: '$\\lambda$: the wavelength of the light in vacuum.'
  },
  {
    cards: ['supp-thin-film'],
    tex: ['n_{\\mathrm{air}} \\lt n \\lt n_{\\mathrm{glass}}'],
    tip: '$n_{\\mathrm{air}}$, $n$, $n_{\\mathrm{glass}}$: the refractive indices of air, of the coating and of the glass.'
  },
  {
    cards: ['supp-thin-film'],
    tex: ['t = \\lambda/(4n)'],
    tip: '$t$: the coating thickness; $\\lambda$: the vacuum wavelength; $n$: the refractive index of the coating.'
  },
  {
    cards: ['supp-thin-film'],
    tex: ['\\lambda/n'],
    tip: '$\\lambda/n$: the vacuum wavelength divided by the refractive index of the film.'
  },
  {
    cards: ['supp-thin-film'],
    match: ['phase change'],
    tip: 'A jump in the phase of the reflected wave, relative to the incident wave, at the moment of reflection.'
  },
  {
    cards: ['supp-thin-film'],
    match: ['constructive interference', 'constructive'],
    tip: 'Two waves meeting in phase, so that their amplitudes add.'
  },
  {
    cards: ['supp-thin-film'],
    match: ['destructive'],
    tip: 'Two waves meeting half a cycle out of phase, so that they cancel.'
  },
  {
    cards: ['supp-thin-film'],
    match: ['enhanced'],
    tip: 'Made brighter by the interference: the reflected light is strong.'
  },
  {
    cards: ['supp-thin-film'],
    match: ['cancelled'],
    tip: 'Made dark by the interference: the reflected light is weak or absent.'
  },
  {
    cards: ['supp-thin-film'],
    match: ['non-reflecting coating', 'non-reflecting', 'anti-reflection'],
    tip: 'A thin transparent layer on a lens or glass surface, chosen so that the light reflected from its two faces cancels.'
  },
  {
    cards: ['supp-thin-film'],
    match: ['optical path'],
    tip: 'The geometric distance travelled times the refractive index of the medium.'
  },
  {
    cards: ['supp-thin-film'],
    match: ['soap film'],
    tip: 'A thin layer of soapy water, of index about $1.33$, with air on both sides.'
  },
  {
    cards: ['supp-thin-film'],
    match: ['vacuum wavelength'],
    tip: 'The wavelength the light has in vacuum, nearly the same as in air.'
  },

  /* ——— supp-fresnel-normal: Normal-incidence reflectance ——— */
  {
    cards: ['supp-fresnel-normal'],
    tex: ['n_1'],
    tip: '$n_1$: the refractive index of the medium the light comes from.'
  },
  {
    cards: ['supp-fresnel-normal'],
    tex: ['n_2'],
    tip: '$n_2$: the refractive index of the medium the light goes into.'
  },
  {
    cards: ['supp-fresnel-normal'],
    tex: ['\\pi'],
    tip: '$\\pi$: a phase change of $\\pi$ radians, $180^\\circ$.'
  },
  {
    cards: ['supp-fresnel-normal'],
    tex: ['r \\lt 0'],
    tip: '$r$: the reflected amplitude divided by the incident amplitude.'
  },
  {
    cards: ['supp-fresnel-normal'],
    tex: ['n_2 \\gt n_1'],
    tip: '$n_1$, $n_2$: the refractive indices of the first and the second medium.'
  },
  {
    cards: ['supp-fresnel-normal'],
    tex: ['n = 1.5'],
    tip: '$n$: the refractive index of the glass.'
  },
  {
    cards: ['supp-fresnel-normal'],
    tex: ['R = 0.04', 'R = 0', 'R'],
    tip: '$R$: the reflectance, the fraction of the incident intensity that is reflected.'
  },
  {
    cards: ['supp-fresnel-normal'],
    tex: ['k_1'],
    tip: '$k_1$: the wavenumber of the particle on the side it comes from.'
  },
  {
    cards: ['supp-fresnel-normal'],
    tex: ['k_2'],
    tip: '$k_2$: the wavenumber of the particle on the far side of the step.'
  },
  {
    cards: ['supp-fresnel-normal'],
    tex: ['k_1, k_2'],
    tip: '$k_1$, $k_2$: the wavenumbers on the two sides of the step.'
  },
  {
    cards: ['supp-fresnel-normal'],
    tex: ['n_1, n_2'],
    tip: '$n_1$, $n_2$: the refractive indices of the two media.'
  },
  {
    cards: ['supp-fresnel-normal'],
    match: ['intensity'],
    tip: 'The power the wave carries per unit area, in $\\mathrm{W/m^2}$.'
  },
  {
    cards: ['supp-fresnel-normal'],
    match: ['reflected amplitude'],
    tip: 'The electric field amplitude of the reflected wave divided by that of the incident wave, a number $r$ that can be positive or negative.'
  },
  {
    cards: ['supp-fresnel-normal'],
    match: ['higher-index'],
    tip: 'The medium with the larger refractive index.'
  },
  {
    cards: ['supp-fresnel-normal'],
    match: ['mismatch'],
    tip: 'A large difference between the indices $n_1$ and $n_2$.'
  },
  {
    cards: ['supp-fresnel-normal'],
    match: ['quantum step'],
    tip: 'A potential step for a quantum particle, where its wavenumber changes from one constant value to another.'
  },
  {
    cards: ['supp-fresnel-normal'],
    match: ['wavenumber'],
    tip: '$k = 2\\pi/\\lambda$, the phase in radians per unit length.'
  },

  /* ——— supp-radiation-pressure: Radiation pressure at normal incidence (supplemental list) ——— */
  {
    cards: ['supp-radiation-pressure'],
    tex: ['I/c'],
    tip: '$I$: the intensity of the wave; $c$: the speed of light in vacuum.'
  },
  {
    cards: ['supp-radiation-pressure'],
    tex: ['2I/c'],
    tip: '$I$: the intensity of the wave; $c$: the speed of light in vacuum.'
  },
  {
    cards: ['supp-radiation-pressure'],
    tex: ['I'],
    tip: '$I$: the intensity of the wave, the power per unit area, in $\\mathrm{W/m^2}$.'
  },
  {
    cards: ['supp-radiation-pressure'],
    match: ['absorber'],
    tip: 'A surface that takes in all the light that falls on it and reflects none.'
  },
  {
    cards: ['supp-radiation-pressure'],
    match: ['perfect reflector'],
    tip: 'A surface that reflects all the light that falls on it and absorbs none.'
  },
  {
    cards: ['supp-radiation-pressure'],
    match: ['radiation pressure'],
    tip: 'The force per unit area that light exerts on a surface it strikes.'
  },
  {
    cards: ['supp-radiation-pressure'],
    match: ['momentum flux'],
    tip: 'Momentum carried across a unit area per unit time.'
  },
  {
    cards: ['supp-radiation-pressure'],
    match: ['normal momentum'],
    tip: 'The component of the momentum perpendicular to the surface.'
  },
  {
    cards: ['supp-radiation-pressure'],
    match: ['EM wave'],
    tip: 'An electromagnetic wave: oscillating electric and magnetic fields that travel at $c$ in vacuum.'
  },

  /* ——— supp-grating-power: Grating resolving power (supplemental list) ——— */
  {
    cards: ['supp-grating-power'],
    tex: ['R = \\lambda/\\Delta\\lambda'],
    tip: '$R$: the resolving power, a pure number. $\\lambda$: the wavelength being observed. $\\Delta\\lambda$: the smallest wavelength difference the grating can still show as two separate lines.'
  },
  {
    cards: ['supp-grating-power'],
    tex: ['\\Delta\\lambda'],
    tip: '$\\Delta\\lambda$: the difference between two nearby wavelengths.'
  },
  {
    cards: ['supp-grating-power'],
    tex: ['\\lambda'],
    tip: '$\\lambda$: the wavelength of the light, near which two lines are to be separated.'
  },
  {
    cards: ['supp-grating-power'],
    tex: ['R = mN'],
    tip: '$R$: the resolving power. $m$: the diffraction order. $N$: the number of grating lines the beam covers.'
  },
  {
    cards: ['supp-grating-power'],
    tex: ['m'],
    tip: '$m$: the diffraction order, the integer in the grating condition $d\\sin\\theta = m\\lambda$, where $d$ is the line spacing and $\\theta$ the angle of the bright line.'
  },
  {
    cards: ['supp-grating-power'],
    tex: ['N'],
    tip: '$N$: the number of grating lines that the incident beam covers.'
  },
  {
    cards: ['supp-grating-power'],
    match: ['resolving power'],
    tip: 'A number that measures how well a spectral instrument shows two close wavelengths as two separate lines. A larger value means closer wavelengths can be separated.'
  },
  {
    cards: ['supp-grating-power'],
    match: ['diffraction grating'],
    tip: 'A plate with many equally spaced parallel slits or grooves. Light from all the lines interferes and gives sharp bright lines at angles that depend on the wavelength.'
  },
  {
    cards: ['supp-grating-power'],
    match: ['diffraction order'],
    tip: 'The integer $m$ that labels the bright lines of a grating: $m = 0$ is the straight-through line, and $m = 1, 2, \\dots$ are the lines further out on each side.'
  },
  {
    cards: ['supp-grating-power'],
    match: ['illuminated lines'],
    tip: 'The grating lines that the incident beam actually covers. Lines outside the beam do not contribute.'
  },
  {
    cards: ['supp-grating-power'],
    match: ['Rayleigh criterion'],
    tip: 'Two lines count as just resolved when the intensity maximum of one falls on the first intensity minimum of the other.'
  },
  {
    cards: ['supp-grating-power'],
    match: ['principal maxima'],
    tip: 'The bright, sharp lines of a grating, at the angles where the light from all the slits arrives in phase.'
  },

  /* ——— supp-mean-free-path: Hard-sphere mean free path (supplemental list) ——— */
  {
    cards: ['supp-mean-free-path'],
    tex: ['d'],
    tip: '$d$: the diameter of one hard-sphere molecule.'
  },
  {
    cards: ['supp-mean-free-path'],
    tex: ['n'],
    tip: '$n$: the number density, the number of molecules per unit volume (unit $\\mathrm{m^{-3}}$).'
  },
  {
    cards: ['supp-mean-free-path'],
    tex: ['\\sqrt2'],
    tip: '$\\sqrt2 \\approx 1.414$, a numerical factor in the hard-sphere mean free path.'
  },
  {
    cards: ['supp-mean-free-path'],
    tex: ['\\ell = \\dfrac{1}{\\sqrt2\\,\\pi d^2 n} = \\dfrac{1}{\\sqrt2\\,n\\sigma}'],
    tip: '$\\ell$: the mean free path. $d$: the molecular diameter. $n$: the number density. $\\sigma$: the collision cross section.'
  },
  {
    cards: ['supp-mean-free-path'],
    tex: ['\\sigma = \\pi d^2'],
    tip: '$\\sigma$: the collision cross section, the target area one molecule presents to another. Two spheres of diameter $d$ touch when their centers come within $d$ of each other, so the area is a disk of radius $d$.'
  },
  {
    cards: ['supp-mean-free-path'],
    tex: ['\\ell \\propto 1/n'],
    tip: '$\\ell$: the mean free path. $n$: the number density. $\\propto$ means "proportional to".'
  },
  {
    cards: ['supp-mean-free-path'],
    tex: ['\\tau = \\ell/\\langle v\\rangle'],
    tip: '$\\tau$: the mean time between collisions. $\\ell$: the mean free path. $\\langle v\\rangle$: the mean speed of the molecules.'
  },
  {
    cards: ['supp-mean-free-path'],
    tex: ['\\ell = 1/(n\\sigma)'],
    tip: '$\\ell$: the mean free path of a beam particle. $n$: the number density of the targets. $\\sigma$: the collision cross section.'
  },
  {
    cards: ['supp-mean-free-path'],
    match: ['mean free path'],
    tip: 'The average distance a molecule travels between one collision and the next.'
  },
  {
    cards: ['supp-mean-free-path'],
    match: ['hard spheres', 'hard-sphere'],
    tip: 'Molecules modeled as rigid balls that exert no force on each other except at contact.'
  },
  {
    cards: ['supp-mean-free-path'],
    match: ['number density'],
    tip: 'The number of particles per unit volume, $n = N/V$.'
  },
  {
    cards: ['supp-mean-free-path'],
    match: ['equilibrium gas'],
    tip: 'A gas in thermal equilibrium: its molecules move in random directions with the Maxwell–Boltzmann distribution of speeds for one temperature.'
  },
  {
    cards: ['supp-mean-free-path'],
    match: ['stationary targets'],
    tip: 'Target particles at rest. Only the beam particle moves.'
  },
  {
    cards: ['supp-mean-free-path'],
    match: ['relative speed'],
    tip: 'The speed of one molecule as seen from another, $|\\mathbf{v}_1 - \\mathbf{v}_2|$.'
  },

  /* ——— supp-brewster-angle: Brewster's polarizing angle ——— */
  {
    cards: ['supp-brewster-angle'],
    tex: ['n_1'],
    tip: '$n_1$: the refractive index of the medium the light comes from.'
  },
  {
    cards: ['supp-brewster-angle'],
    tex: ['n_2'],
    tip: '$n_2$: the refractive index of the medium the light goes into.'
  },
  {
    cards: ['supp-brewster-angle'],
    tex: ['\\theta_B + \\theta_t = 90^\\circ'],
    tip: '$\\theta_B$: the Brewster angle of incidence, measured from the normal. $\\theta_t$: the angle of the refracted (transmitted) ray, also measured from the normal.'
  },
  {
    cards: ['supp-brewster-angle'],
    match: ['unpolarized'],
    tip: 'Light whose electric-field direction changes randomly in time, so it has no preferred polarization direction.'
  },
  {
    cards: ['supp-brewster-angle'],
    match: ['completely polarized'],
    tip: 'All of the light has its electric field oscillating along one fixed direction.'
  },
  {
    cards: ['supp-brewster-angle'],
    match: ['angle of incidence'],
    tip: 'The angle between the incoming ray and the normal (the line perpendicular to the surface).'
  },
  {
    cards: ['supp-brewster-angle'],
    match: ['plane of incidence'],
    tip: 'The plane that contains the incoming ray and the normal to the surface. The reflected and refracted rays lie in it too.'
  },
  {
    cards: ['supp-brewster-angle'],
    match: ['refracted ray', 'refracted'],
    tip: 'The ray that passes into the second medium. Its angle $\\theta_t$ follows Snell\'s law, $n_1\\sin\\theta_1 = n_2\\sin\\theta_t$.'
  },
  {
    cards: ['supp-brewster-angle'],
    match: ['index'],
    tip: 'The refractive index $n = c/v$: the speed of light in vacuum divided by the speed of light in the material.'
  },
  {
    cards: ['supp-brewster-angle'],
    match: ['fully transmitted'],
    tip: 'None of this light is reflected; all of it enters the second medium.'
  },

  /* ——— supp-radiation-field: Nonrelativistic radiation-field direction (supplemental list) ——— */
  {
    cards: ['supp-radiation-field'],
    tex: ['v \\ll c'],
    tip: '$v$: the speed of the charge. $c$: the speed of light. $\\ll$ means "much less than".'
  },
  {
    cards: ['supp-radiation-field'],
    tex: ['\\mathbf{E}_{\\mathrm{rad}}'],
    tip: '$\\mathbf{E}_{\\mathrm{rad}}$: the radiation field, the part of the electric field of a charge that is produced by its acceleration and carries energy away from it.'
  },
  {
    cards: ['supp-radiation-field'],
    tex: ['\\mathbf{E}_{\\mathrm{rad}} \\propto q\\,\\hat{\\mathbf{r}}\\times(\\hat{\\mathbf{r}}\\times\\mathbf{a}) = -q\\,\\mathbf{a}_{\\perp}'],
    tip: '$q$: the charge. $\\hat{\\mathbf{r}}$: the unit vector from the charge to the field point. $\\mathbf{a}$: the acceleration of the charge. $\\mathbf{a}_{\\perp}$: the part of $\\mathbf{a}$ perpendicular to $\\hat{\\mathbf{r}}$. $\\times$: the cross product.'
  },
  {
    cards: ['supp-radiation-field'],
    tex: ['q \\gt 0'],
    tip: '$q$: the charge of the particle. $q \\gt 0$ means a positive charge.'
  },
  {
    cards: ['supp-radiation-field'],
    tex: ['\\mathbf{a}_{\\perp}'],
    tip: '$\\mathbf{a}_{\\perp} = \\mathbf{a} - (\\mathbf{a}\\cdot\\hat{\\mathbf{r}})\\,\\hat{\\mathbf{r}}$: the component of the acceleration perpendicular to the line of sight.'
  },
  {
    cards: ['supp-radiation-field'],
    tex: ['\\mathbf{a}'],
    tip: '$\\mathbf{a}$: the acceleration of the charge, taken at the earlier time when the radiation now arriving left the charge.'
  },
  {
    cards: ['supp-radiation-field'],
    tex: ['\\hat{\\mathbf{r}}'],
    tip: '$\\hat{\\mathbf{r}}$: the unit vector pointing from the charge to the field point.'
  },
  {
    cards: ['supp-radiation-field'],
    tex: ['|\\mathbf{E}_{\\mathrm{rad}}| \\propto \\sin\\theta/R'],
    tip: '$|\\mathbf{E}_{\\mathrm{rad}}|$: the magnitude of the radiation field. $\\theta$: the angle between $\\mathbf{a}$ and $\\hat{\\mathbf{r}}$. $R$: the distance from the charge to the field point.'
  },
  {
    cards: ['supp-radiation-field'],
    tex: ['\\propto \\sin^2\\theta'],
    tip: '$\\propto$ means "proportional to". $\\theta$: the angle between the acceleration $\\mathbf{a}$ and the direction $\\hat{\\mathbf{r}}$ to the field point.'
  },
  {
    cards: ['supp-radiation-field'],
    tex: ['\\theta'],
    tip: '$\\theta$: the angle between the acceleration $\\mathbf{a}$ and the direction $\\hat{\\mathbf{r}}$ to the field point.'
  },
  {
    cards: ['supp-radiation-field'],
    tex: ['90^\\circ'],
    tip: '$90^\\circ$: a right angle, a direction perpendicular to $\\mathbf{a}$.'
  },
  {
    cards: ['supp-radiation-field'],
    tex: ['R'],
    tip: '$R$: the distance from the charge to the field point.'
  },
  {
    cards: ['supp-radiation-field'],
    match: ['radiation field'],
    tip: 'The part of the electric field of a charge that is produced by its acceleration and carries energy away to large distances.'
  },
  {
    cards: ['supp-radiation-field'],
    match: ['nonrelativistic'],
    tip: 'Moving much slower than light, $v \\ll c$, so relativistic corrections can be neglected.'
  },
  {
    cards: ['supp-radiation-field'],
    match: ['point charge'],
    tip: 'A charge whose size is negligible compared with the distances involved.'
  },
  {
    cards: ['supp-radiation-field'],
    match: ['angular dependence'],
    tip: 'How a quantity changes with the direction of observation, here with the angle $\\theta$ measured from the acceleration.'
  },
  {
    cards: ['supp-radiation-field'],
    match: ['line of sight'],
    tip: 'The line from the charge to the field point, along $\\hat{\\mathbf{r}}$.'
  },
  {
    cards: ['supp-radiation-field'],
    match: ['power per solid angle'],
    tip: '$dP/d\\Omega$: the radiated power through a small area far from the charge, divided by the solid angle $d\\Omega$ that the area subtends at the charge.'
  },
  {
    cards: ['supp-radiation-field'],
    match: ['field point'],
    tip: 'The point at which the field is evaluated.'
  },

  /* ——— supp-rotating-loop-emf: Rotating-loop flux and induced emf (supplemental list) ——— */
  {
    cards: ['supp-rotating-loop-emf', 'supp-lenz-law', 'supp-motional-emf'],
    tex: ['\\mathcal{E} = -d\\Phi_B/dt'],
    tip: '$\\mathcal{E}$: the emf induced around the circuit. $\\Phi_B$: the magnetic flux through the circuit. $d\\Phi_B/dt$: its rate of change in time.'
  },
  {
    cards: ['supp-rotating-loop-emf'],
    tex: ['N'],
    tip: '$N$: the number of turns of wire in the loop.'
  },
  {
    cards: ['supp-rotating-loop-emf'],
    tex: ['A'],
    tip: '$A$: the area enclosed by one turn of the loop.'
  },
  {
    cards: ['supp-rotating-loop-emf'],
    tex: ['\\omega'],
    tip: '$\\omega$: the angular speed of the rotation, in radians per second.'
  },
  {
    cards: ['supp-rotating-loop-emf'],
    tex: ['B', '\\mathbf{B}'],
    tip: '$\\mathbf{B}$: the uniform magnetic field. $B$: its magnitude.'
  },
  {
    cards: ['supp-rotating-loop-emf'],
    tex: ['\\Phi_B = NBA\\cos\\omega t'],
    tip: '$\\Phi_B$: the magnetic flux through all $N$ turns together. $B$: the field magnitude. $A$: the loop area. $\\omega t$: the angle between the loop normal and $\\mathbf{B}$ at time $t$.'
  },
  {
    cards: ['supp-rotating-loop-emf'],
    tex: ['\\omega t'],
    tip: '$\\omega t$: the angle, in radians, between the loop normal and $\\mathbf{B}$ at time $t$. It grows at the rate $\\omega$.'
  },
  {
    cards: ['supp-rotating-loop-emf'],
    tex: ['\\mathcal{E} = NBA\\omega\\sin\\omega t'],
    tip: '$\\mathcal{E}$: the emf induced around the loop at time $t$. $N$: turns. $B$: field magnitude. $A$: loop area. $\\omega$: angular speed.'
  },
  {
    cards: ['supp-rotating-loop-emf'],
    tex: ['\\mathcal{E}_0 = NBA\\omega', 'NBA\\omega'],
    tip: '$\\mathcal{E}_0$: the peak (largest) value of the induced emf over one rotation.'
  },
  {
    cards: ['supp-rotating-loop-emf'],
    match: ['emf'],
    tip: 'Electromotive force: the work done per unit charge on a charge carried once around a closed circuit. Unit: volt ($\\mathrm{V}$).'
  },
  {
    cards: ['supp-rotating-loop-emf'],
    match: ['flux'],
    tip: 'The magnetic flux through a surface: the integral of the component of $\\mathbf{B}$ normal to the surface over that surface. Unit: weber ($\\mathrm{Wb} = \\mathrm{T\\,m^2}$).'
  },
  {
    cards: ['supp-rotating-loop-emf'],
    match: ['loop normal'],
    tip: 'The direction perpendicular to the plane of the loop.'
  },
  {
    cards: ['supp-rotating-loop-emf'],
    match: ['peak'],
    tip: 'The largest value reached during one cycle.'
  },
  {
    cards: ['supp-rotating-loop-emf'],
    match: ['starting orientation'],
    tip: 'The angle between the loop normal and $\\mathbf{B}$ at $t = 0$.'
  },
  {
    cards: ['supp-rotating-loop-emf'],
    match: ['turn'],
    tip: 'One complete winding of the wire around the loop. With $N$ turns, the same flux passes through each winding.'
  },

  /* ——— supp-sin2-cycle-average: Cycle average of sine-squared and average Joule power (supplemental list) ——— */
  {
    cards: ['supp-sin2-cycle-average'],
    tex: ['\\langle\\sin^2\\omega t\\rangle', '\\langle\\sin\\omega t\\rangle', '\\langle\\sin^2\\omega t\\rangle = \\langle\\cos^2\\omega t\\rangle = \\tfrac{1}{2}', '\\langle\\sin\\omega t\\rangle = \\langle\\cos\\omega t\\rangle = 0'],
    tip: 'The angle brackets $\\langle\\ \\rangle$ mean the time average over one full period $T = 2\\pi/\\omega$: $\\langle f\\rangle = \\frac{1}{T}\\int_0^T f(t)\\,dt$. $\\omega$: the angular frequency. $t$: time.'
  },
  {
    cards: ['supp-sin2-cycle-average'],
    tex: ['V_0\\sin\\omega t'],
    tip: '$V_0$: the peak value (amplitude) of the AC voltage. $\\omega$: its angular frequency. $t$: time.'
  },
  {
    cards: ['supp-sin2-cycle-average'],
    tex: ['R'],
    tip: '$R$: the resistance of the resistor.'
  },
  {
    cards: ['supp-sin2-cycle-average'],
    tex: ['V_{\\mathrm{rms}} = V_0/\\sqrt{2}'],
    tip: '$V_{\\mathrm{rms}}$: the root-mean-square voltage, $\\sqrt{\\langle V^2\\rangle}$. $V_0$: the peak voltage.'
  },
  {
    cards: ['supp-sin2-cycle-average'],
    tex: ['\\langle P\\rangle = V_0^2/(2R) = V_{\\mathrm{rms}}^2/R'],
    tip: '$\\langle P\\rangle$: the power delivered to the resistor, averaged over one period. $V_0$: the peak voltage. $R$: the resistance. $V_{\\mathrm{rms}}$: the rms voltage.'
  },
  {
    cards: ['supp-sin2-cycle-average'],
    match: ['rms'],
    tip: 'Root mean square: square the quantity, average the square over one period, then take the square root.'
  },
  {
    cards: ['supp-sin2-cycle-average'],
    match: ['cycle average'],
    tip: 'The time average of a periodic quantity over one full period.'
  },
  {
    cards: ['supp-sin2-cycle-average'],
    match: ['Joule power'],
    tip: 'The rate at which a resistor turns electrical energy into heat (Joule heating).'
  },
  {
    cards: ['supp-sin2-cycle-average'],
    match: ['period'],
    tip: 'The time $T = 2\\pi/\\omega$ of one full oscillation.'
  },
  {
    cards: ['supp-sin2-cycle-average'],
    match: ['sine-squared'],
    tip: 'The function $\\sin^2\\omega t$, the square of the sine.'
  },

  /* ——— supp-rolling-incline: Rolling without slipping down an incline ——— */
  {
    cards: ['supp-rolling-incline'],
    tex: ['I = \\alpha MR^2'],
    tip: '$I$: the moment of inertia about the body\'s central axis. $M$: its mass. $R$: its radius. $\\alpha$: a pure number set by how the mass is distributed about the axis.'
  },
  {
    cards: ['supp-rolling-incline'],
    tex: ['\\theta'],
    tip: '$\\theta$: the angle of the incline above the horizontal.'
  },
  {
    cards: ['supp-rolling-incline'],
    tex: ['h'],
    tip: '$h$: the vertical height through which the center of the body drops.'
  },
  {
    cards: ['supp-rolling-incline'],
    tex: ['M'],
    tip: '$M$: the mass of the body.'
  },
  {
    cards: ['supp-rolling-incline'],
    tex: ['R'],
    tip: '$R$: the radius of the body.'
  },
  {
    cards: ['supp-rolling-incline'],
    tex: ['\\alpha'],
    tip: '$\\alpha$: the pure number in $I = \\alpha MR^2$.'
  },
  {
    cards: ['supp-rolling-incline'],
    tex: ['\\alpha = \\tfrac{2}{5}'],
    tip: '$\\alpha$ for a uniform solid sphere, whose moment of inertia is $I = \\tfrac{2}{5}MR^2$.'
  },
  {
    cards: ['supp-rolling-incline'],
    tex: ['v = R\\omega'],
    tip: '$v$: the speed of the center of the body. $R$: its radius. $\\omega$: its angular speed of rotation.'
  },
  {
    cards: ['supp-rolling-incline'],
    match: ['without slipping'],
    tip: 'The point of the body touching the surface is at rest at each instant, so the body does not skid.'
  },
  {
    cards: ['supp-rolling-incline'],
    match: ['incline'],
    tip: 'A flat ramp tilted at an angle $\\theta$ to the horizontal.'
  },
  {
    cards: ['supp-rolling-incline'],
    match: ['hoop'],
    tip: 'A thin circular ring that rolls on its edge.'
  },
  {
    cards: ['supp-rolling-incline'],
    match: ['solid sphere'],
    tip: 'A ball with its mass spread uniformly through its volume.'
  },
  {
    cards: ['supp-rolling-incline'],
    match: ['disk'],
    tip: 'A uniform flat cylinder that rolls on its curved edge.'
  },
  {
    cards: ['supp-rolling-incline'],
    match: ['shell'],
    tip: 'A thin hollow sphere with all its mass on its surface.'
  },
  {
    cards: ['supp-rolling-incline'],
    match: ['static friction'],
    tip: 'The friction force at a contact that does not slide. It can take any value up to $\\mu_s N$, where $\\mu_s$ is the coefficient of static friction and $N$ the normal force.'
  },
  {
    cards: ['supp-rolling-incline'],
    match: ['race order'],
    tip: 'The order in which bodies released together from rest at the same height reach the bottom.'
  },

  /* ——— supp-invariant-mass: Invariant mass of a system ——— */
  {
    cards: ['supp-invariant-mass'],
    tex: ['E_{\\rm tot}'],
    tip: '$E_{\\rm tot}$: the sum of the relativistic energies of all particles in the system, measured in one chosen inertial frame.'
  },
  {
    cards: ['supp-invariant-mass'],
    tex: ['\\mathbf{p}_{\\rm tot}'],
    tip: '$\\mathbf{p}_{\\rm tot}$: the vector sum of the relativistic momenta of all particles, measured in the same frame.'
  },
  {
    cards: ['supp-invariant-mass'],
    tex: ['M'],
    tip: '$M$: the invariant mass of the whole system.'
  },
  {
    cards: ['supp-invariant-mass'],
    tex: ['Mc^2'],
    tip: '$M$: the invariant mass. $c$: the speed of light. $Mc^2$ is that mass expressed as an energy.'
  },
  {
    cards: ['supp-invariant-mass'],
    tex: ['E = pc'],
    tip: '$E$: the energy of the photon. $p$: the magnitude of its momentum. $c$: the speed of light.'
  },
  {
    cards: ['supp-invariant-mass'],
    tex: ['M = 0'],
    tip: '$M$: the invariant mass, here of a single photon.'
  },
  {
    cards: ['supp-invariant-mass'],
    tex: ['e^+e^-'],
    tip: '$e^-$: an electron. $e^+$: a positron, the antiparticle of the electron, with the same mass and the opposite charge.'
  },
  {
    cards: ['supp-invariant-mass'],
    tex: ['2m_e'],
    tip: '$m_e$: the electron mass, about $0.511\\ \\mathrm{MeV}/c^2$. The positron has the same mass.'
  },
  {
    cards: ['supp-invariant-mass'],
    tex: ['m'],
    tip: '$m$: the rest mass of each of the two colliding particles.'
  },
  {
    cards: ['supp-invariant-mass'],
    tex: ['\\gamma'],
    tip: '$\\gamma = 1/\\sqrt{1 - v^2/c^2}$: the Lorentz factor of each particle, in the frame where the two move toward each other with equal speeds $v$.'
  },
  {
    cards: ['supp-invariant-mass'],
    tex: ['M = 2\\gamma m'],
    tip: '$M$: the invariant mass of the two-particle system. $\\gamma$: the Lorentz factor of each particle. $m$: the rest mass of each particle.'
  },
  {
    cards: ['supp-invariant-mass'],
    match: ['invariant mass'],
    tip: 'A mass assigned to a whole system of particles. It has the same value in every inertial frame, while the total energy and the total momentum change from frame to frame.'
  },
  {
    cards: ['supp-invariant-mass'],
    match: ['zero-momentum frame'],
    tip: 'The inertial frame in which the total momentum of the system is zero, also called the center-of-momentum frame.'
  },
  {
    cards: ['supp-invariant-mass'],
    match: ['electron–positron pair'],
    tip: 'An electron and a positron created together. The positron is the antiparticle of the electron: same mass, opposite charge.'
  },
  {
    cards: ['supp-invariant-mass'],
    match: ['head-on collision'],
    tip: 'A collision in which the two particles move toward each other along one line.'
  },
  {
    cards: ['supp-invariant-mass'],
    match: ['total energy'],
    tip: 'The sum of the energies $\\gamma mc^2$ of all particles, including their rest energies.'
  },

  /* ——— supp-cl-switch-limits: Capacitor and inductor at switch-on and long after ——— */
  {
    cards: ['supp-cl-switch-limits'],
    tex: ['t = 0'],
    tip: '$t$: time. $t = 0$ is the instant the switch closes.'
  },
  {
    cards: ['supp-cl-switch-limits'],
    tex: ['V_C = 0'],
    tip: '$V_C$: the voltage across the capacitor.'
  },
  {
    cards: ['supp-cl-switch-limits'],
    tex: ['I_L = 0'],
    tip: '$I_L$: the current through the inductor.'
  },
  {
    cards: ['supp-cl-switch-limits'],
    tex: ['C'],
    tip: '$C$: the capacitor (and its capacitance).'
  },
  {
    cards: ['supp-cl-switch-limits'],
    tex: ['L'],
    tip: '$L$: the inductor (and its inductance).'
  },
  {
    cards: ['supp-cl-switch-limits'],
    match: ['DC source'],
    tip: 'A source of constant voltage, such as a battery.'
  },
  {
    cards: ['supp-cl-switch-limits'],
    match: ['uncharged capacitor'],
    tip: 'A capacitor whose plates carry no charge at the start.'
  },
  {
    cards: ['supp-cl-switch-limits'],
    match: ['capacitor'],
    tip: 'Two conductors separated by an insulator. It stores charge $Q = CV$, where $C$ is its capacitance and $V$ the voltage across it.'
  },
  {
    cards: ['supp-cl-switch-limits'],
    match: ['inductor'],
    tip: 'A coil of wire. The voltage across it is $V = L\\,dI/dt$, where $L$ is its inductance and $I$ the current through it.'
  },
  {
    cards: ['supp-cl-switch-limits'],
    match: ['cannot jump'],
    tip: 'It changes continuously in time, with no sudden step. A step in $V_C$ would need an infinite current, and a step in $I_L$ an infinite voltage.'
  },
  {
    cards: ['supp-cl-switch-limits'],
    match: ['steady state'],
    tip: 'The condition reached after all transients have died out, when no current or voltage in the circuit changes any more.'
  },

  /* ——— supp-lenz-law: Lenz's law with a magnet and a ring ——— */
  {
    cards: ['supp-lenz-law', 'supp-motional-emf'],
    match: ['Lenz\'s law'],
    tip: 'The rule that fixes the sign in Faraday\'s law: the induced current flows in the direction whose own magnetic field opposes the change in flux that drives it.'
  },
  {
    cards: ['supp-lenz-law'],
    match: ['bar magnet'],
    tip: 'A straight permanent magnet with a north pole at one end and a south pole at the other. Its field lines leave the north pole and enter the south pole.'
  },
  {
    cards: ['supp-lenz-law'],
    match: ['north pole'],
    tip: 'The end of a magnet from which its magnetic field lines point outward.'
  },
  {
    cards: ['supp-lenz-law'],
    match: ['conducting ring'],
    tip: 'A closed loop of wire or metal in which a current can flow.'
  },
  {
    cards: ['supp-lenz-law'],
    match: ['induced current'],
    tip: 'The current driven around a closed conductor by the emf that a changing magnetic flux produces.'
  },
  {
    cards: ['supp-lenz-law'],
    match: ['flux'],
    tip: 'The magnetic flux through the ring: the integral of the component of $\\mathbf{B}$ normal to the ring\'s plane over the area of the ring.'
  },
  {
    cards: ['supp-lenz-law'],
    match: ['north face'],
    tip: 'The side of a current loop from which the loop\'s own magnetic field points outward. A loop with current acts like a short bar magnet with this face as its north pole.'
  },
  {
    cards: ['supp-lenz-law'],
    match: ['receding'],
    tip: 'Moving away from the ring.'
  },

  /* ——— supp-sphere-inside-field: Field inside a uniformly charged sphere and a shell ——— */
  {
    cards: ['supp-sphere-inside-field'],
    tex: ['R'],
    tip: '$R$: the radius of the sphere (or of the shell).'
  },
  {
    cards: ['supp-sphere-inside-field'],
    tex: ['Q'],
    tip: '$Q$: the total charge of the sphere.'
  },
  {
    cards: ['supp-sphere-inside-field'],
    tex: ['E(r)'],
    tip: '$E(r)$: the magnitude of the electric field at distance $r$ from the center of the sphere.'
  },
  {
    cards: ['supp-sphere-inside-field'],
    tex: ['r'],
    tip: '$r$: the distance from the center of the sphere to the field point.'
  },
  {
    cards: ['supp-sphere-inside-field'],
    tex: ['r^3/R^3'],
    tip: '$r^3/R^3$: the volume of a sphere of radius $r$, $\\tfrac{4}{3}\\pi r^3$, divided by the volume of the whole charged sphere, $\\tfrac{4}{3}\\pi R^3$.'
  },
  {
    cards: ['supp-sphere-inside-field'],
    tex: ['E'],
    tip: '$E$: the magnitude of the electric field.'
  },
  {
    cards: ['supp-sphere-inside-field'],
    tex: ['E = 0'],
    tip: '$E$: the magnitude of the electric field, here at points inside the thin shell.'
  },
  {
    cards: ['supp-sphere-inside-field'],
    match: ['spread uniformly through its volume', 'uniformly charged sphere'],
    tip: 'The charge per unit volume, $\\rho = Q/(\\tfrac{4}{3}\\pi R^3)$, is the same at every point inside the sphere.'
  },
  {
    cards: ['supp-sphere-inside-field'],
    match: ['solid sphere'],
    tip: 'A sphere filled throughout with charged material, not hollow.'
  },
  {
    cards: ['supp-sphere-inside-field'],
    match: ['thin shell'],
    tip: 'A hollow sphere of negligible thickness, with all its charge on its surface at radius $R$.'
  },
  {
    cards: ['supp-sphere-inside-field'],
    match: ['linearly'],
    tip: 'In proportion to $r$.'
  },

  /* ——— supp-rc-filters: RC low-pass and high-pass filters ——— */
  {
    cards: ['supp-rc-filters'],
    tex: ['RC'],
    tip: '$R$: the resistance of the resistor. $C$: the capacitance of the capacitor. An $RC$ filter has one of each in series with the input.'
  },
  {
    cards: ['supp-rc-filters'],
    tex: ['\\omega_c'],
    tip: '$\\omega_c$: the crossover angular frequency, in radians per second.'
  },
  {
    cards: ['supp-rc-filters'],
    tex: ['|Z_C| = R'],
    tip: '$|Z_C| = 1/(\\omega C)$: the magnitude of the capacitor\'s impedance at angular frequency $\\omega$. $R$: the resistance.'
  },
  {
    cards: ['supp-rc-filters'],
    tex: ['1/\\sqrt{2}'],
    tip: '$1/\\sqrt{2} \\approx 0.707$. Power goes as the amplitude squared, so the output power is then half the input power (the $-3\\ \\mathrm{dB}$ point).'
  },
  {
    cards: ['supp-rc-filters'],
    tex: ['C'],
    tip: '$C$: the capacitor (and its capacitance).'
  },
  {
    cards: ['supp-rc-filters'],
    tex: ['R'],
    tip: '$R$: the resistor (and its resistance).'
  },
  {
    cards: ['supp-rc-filters'],
    match: ['low-pass'],
    tip: 'A filter that passes signals below a crossover frequency and weakens those above it.'
  },
  {
    cards: ['supp-rc-filters'],
    match: ['high-pass'],
    tip: 'A filter that passes signals above a crossover frequency and weakens those below it.'
  },
  {
    cards: ['supp-rc-filters'],
    match: ['crossover'],
    tip: 'The frequency that separates the passed band of a filter from the weakened band.'
  },
  {
    cards: ['supp-rc-filters'],
    match: ['ground'],
    tip: 'The reference point of the circuit, taken as zero voltage.'
  },
  {
    cards: ['supp-rc-filters'],
    match: ['shorts'],
    tip: 'Acts as a path of nearly zero impedance, so almost no voltage appears across it.'
  },
  {
    cards: ['supp-rc-filters'],
    match: ['output'],
    tip: 'The voltage taken from the filter, measured across one of its two elements.'
  },

  /* ——— supp-laser-operation: How a laser works ——— */
  {
    cards: ['supp-laser-operation'],
    match: ['laser'],
    tip: 'A device that emits a narrow, intense beam of light of one frequency.'
  },
  {
    cards: ['supp-laser-operation'],
    match: ['lase'],
    tip: 'To work as a laser: to produce a growing, self-sustained beam of light.'
  },
  {
    cards: ['supp-laser-operation'],
    match: ['energy level'],
    tip: 'One of the allowed energies of an atom.'
  },
  {
    cards: ['supp-laser-operation'],
    match: ['pumping'],
    tip: 'Supplying energy from outside, for example with a flash lamp, an electric discharge or another laser, to raise atoms to higher energy levels.'
  },
  {
    cards: ['supp-laser-operation'],
    match: ['inversion'],
    tip: 'Population inversion: more atoms in the upper laser level than in the lower one.'
  },
  {
    cards: ['supp-laser-operation'],
    match: ['population'],
    tip: 'The number of atoms in a given energy level.'
  },
  {
    cards: ['supp-laser-operation'],
    match: ['metastable level'],
    tip: 'An excited level with a long lifetime, typically microseconds to milliseconds, compared with about $10^{-8}\\ \\mathrm{s}$ for an ordinary excited atomic level.'
  },
  {
    cards: ['supp-laser-operation'],
    match: ['stimulated emission'],
    tip: 'An incoming photon whose energy equals the gap between two levels makes an excited atom drop to the lower level and emit a second photon.'
  },
  {
    cards: ['supp-laser-operation'],
    match: ['absorption'],
    tip: 'An atom in the lower level takes in a photon and moves to the upper level.'
  },

  /* ——— supp-motional-emf: Sliding rod on rails: motional emf ——— */
  {
    cards: ['supp-motional-emf'],
    tex: ['L'],
    tip: '$L$: the length of the rod between the rails.'
  },
  {
    cards: ['supp-motional-emf'],
    tex: ['v'],
    tip: '$v$: the speed of the rod along the rails.'
  },
  {
    cards: ['supp-motional-emf'],
    tex: ['B'],
    tip: '$B$: the magnitude of the uniform magnetic field, perpendicular to the plane of the rails.'
  },
  {
    cards: ['supp-motional-emf'],
    tex: ['R'],
    tip: '$R$: the total resistance of the circuit.'
  },
  {
    cards: ['supp-motional-emf'],
    tex: ['F_0'],
    tip: '$F_0$: the constant applied force that pulls the rod along the rails.'
  },
  {
    cards: ['supp-motional-emf'],
    tex: ['F_0 R/(B^2L^2)'],
    tip: '$F_0$: the pulling force. $R$: the circuit resistance. $B$: the field magnitude. $L$: the rod length.'
  },
  {
    cards: ['supp-motional-emf'],
    tex: ['I^2R'],
    tip: '$I$: the current. $R$: the resistance. $I^2R$ is the power turned into heat in the resistance.'
  },
  {
    cards: ['supp-motional-emf'],
    tex: ['\\Phi_B = BLx'],
    tip: '$\\Phi_B$: the magnetic flux through the circuit. $x$: the distance from the closed end of the rails to the rod, so $Lx$ is the area the circuit encloses.'
  },
  {
    cards: ['supp-motional-emf'],
    match: ['motional emf'],
    tip: 'An emf produced in a conductor because the conductor moves through a magnetic field.'
  },
  {
    cards: ['supp-motional-emf'],
    match: ['rails'],
    tip: 'Two fixed parallel conducting tracks. The rod slides on them and closes the circuit.'
  },
  {
    cards: ['supp-motional-emf'],
    match: ['coasting'],
    tip: 'Moving with no applied force after being given an initial speed.'
  },
  {
    cards: ['supp-motional-emf'],
    match: ['terminal speed'],
    tip: 'The constant speed reached when the net force on the rod is zero.'
  },
  {
    cards: ['supp-motional-emf'],
    match: ['mechanical power'],
    tip: 'The rate $F_0 v$ at which the external pull does work on the rod.'
  },
  {
    cards: ['supp-motional-emf'],
    match: ['emf'],
    tip: 'Electromotive force: the work done per unit charge on a charge carried once around the circuit. Unit: volt ($\\mathrm{V}$).'
  },

  /* ——— supp-displacement-current: Displacement current: definition and the capacitor gap ——— */
  {
    cards: ['supp-displacement-current'],
    tex: ['I_d'],
    tip: '$I_d$: the displacement current through the surface $S$, measured in amperes.'
  },
  {
    cards: ['supp-displacement-current'],
    tex: ['S'],
    tip: '$S$: an open surface whose edge is a closed loop.'
  },
  {
    cards: ['supp-displacement-current'],
    tex: ['I'],
    tip: '$I$: the conduction current in the wire that charges the capacitor.'
  },
  {
    cards: ['supp-displacement-current'],
    tex: ['E = Q/(\\epsilon_0 A)'],
    tip: '$E$: the electric field between the plates. $Q$: the charge on one plate. $\\epsilon_0$: the vacuum permittivity. $A$: the area of each plate.'
  },
  {
    cards: ['supp-displacement-current'],
    tex: ['I_d = \\epsilon_0 A\\,dE/dt = dQ/dt = I'],
    tip: '$I_d$: the displacement current through the gap. $A$: the plate area. $E$: the field in the gap. $Q$: the charge on a plate. $I$: the current in the wire.'
  },
  {
    cards: ['supp-displacement-current'],
    tex: ['\\oint \\mathbf{B}\\cdot d\\mathbf{l} = \\mu_0\\left(I_{\\text{enc}} + I_d\\right)'],
    tip: '$\\oint \\mathbf{B}\\cdot d\\mathbf{l}$: the integral of the magnetic field along a closed loop. $\\mu_0$: the vacuum permeability. $I_{\\text{enc}}$: the conduction current through a surface bounded by the loop. $I_d$: the displacement current through the same surface.'
  },
  {
    cards: ['supp-displacement-current'],
    tex: ['B = \\mu_0 I r/(2A)'],
    tip: '$B$: the magnetic field magnitude between the plates. $\\mu_0$: the vacuum permeability. $I$: the charging current. $r$: the distance from the axis of the plates. $A$: the plate area.'
  },
  {
    cards: ['supp-displacement-current'],
    tex: ['r'],
    tip: '$r$: the distance from the central axis of the circular plates.'
  },
  {
    cards: ['supp-displacement-current'],
    match: ['displacement current'],
    tip: 'The term Maxwell added to Ampère\'s law so that the law also holds where charge builds up, as on a capacitor plate. It is measured in amperes, but no charge flows.'
  },
  {
    cards: ['supp-displacement-current'],
    match: ['parallel-plate capacitor'],
    tip: 'Two flat conducting plates of area $A$ a small distance apart. The field between them is nearly uniform.'
  },
  {
    cards: ['supp-displacement-current'],
    match: ['gap'],
    tip: 'The empty space between the two capacitor plates.'
  },
  {
    cards: ['supp-displacement-current'],
    match: ['electric flux'],
    tip: 'The integral of the component of $\\mathbf{E}$ normal to a surface over that surface.'
  },
  {
    cards: ['supp-displacement-current'],
    match: ['magnetic flux'],
    tip: 'The integral of the component of $\\mathbf{B}$ normal to a surface over that surface.'
  },
  {
    cards: ['supp-displacement-current'],
    match: ['Faraday\'s emf'],
    tip: 'The emf around a closed loop caused by a changing magnetic flux through the loop.'
  },
  {
    cards: ['supp-displacement-current'],
    match: ['Ampère'],
    tip: 'Ampère\'s law relates the integral of $\\mathbf{B}$ along a closed loop to the current through a surface bounded by that loop.'
  },

  /* ——— supp-scintillation-detector: Scintillation detector with photomultiplier ——— */
  {
    cards: ['supp-scintillation-detector'],
    tex: ['\\gamma'],
    tip: '$\\gamma$: gamma. A $\\gamma$-ray photon is a high-energy photon emitted by an atomic nucleus, typically from about $0.1$ to several $\\mathrm{MeV}$.'
  },
  {
    cards: ['supp-scintillation-detector'],
    tex: ['Z', 'Z = 53'],
    tip: '$Z$: the atomic number, the number of protons in the nucleus.'
  },
  {
    cards: ['supp-scintillation-detector'],
    match: ['sodium iodide doped with thallium'],
    tip: '$\\mathrm{NaI(Tl)}$: a sodium iodide crystal with a small fraction of thallium atoms added as an impurity.'
  },
  {
    cards: ['supp-scintillation-detector'],
    match: ['photoelectric effect'],
    tip: 'The photon is absorbed by a bound atomic electron, which leaves the atom with the photon energy minus its binding energy.'
  },
  {
    cards: ['supp-scintillation-detector'],
    match: ['Compton scattering'],
    tip: 'The photon scatters off a nearly free electron, gives it part of its energy and continues with a lower energy.'
  },
  {
    cards: ['supp-scintillation-detector'],
    match: ['pair production'],
    tip: 'Near a nucleus, a photon with energy above $2m_ec^2 \\approx 1.022\\ \\mathrm{MeV}$ turns into an electron and a positron.'
  },
  {
    cards: ['supp-scintillation-detector'],
    match: ['scintillation light'],
    tip: 'The flash of visible photons given off as excited states in the crystal, mostly at the thallium sites, return to lower energy.'
  },
  {
    cards: ['supp-scintillation-detector'],
    match: ['photoemission'],
    tip: 'The release of electrons from a surface (the photocathode) when light falls on it.'
  },
  {
    cards: ['supp-scintillation-detector'],
    match: ['dynode'],
    tip: 'An electrode in a photomultiplier tube, each one held at a higher voltage than the one before. Each electron that hits a dynode knocks out several more.'
  },
  {
    cards: ['supp-scintillation-detector'],
    match: ['interaction probability'],
    tip: 'The chance that the photon interacts in the crystal instead of passing through it.'
  },
  {
    cards: ['supp-scintillation-detector'],
    match: ['photomultiplier tube'],
    tip: 'A vacuum tube with a photocathode followed by a chain of dynodes.'
  },

  /* ——— supp-infinite-well-centered: Infinite well centered on the origin ——— */
  {
    cards: ['supp-infinite-well-centered'],
    tex: ['x = \\pm a'],
    tip: '$x$: position along the well. $a$: the distance from the center of the well to each wall, so the walls stand at $x = -a$ and $x = +a$.'
  },
  {
    cards: ['supp-infinite-well-centered'],
    tex: ['n'],
    tip: '$n$: the quantum number that labels the energy levels, $n = 1, 2, 3, \\dots$, with $n = 1$ the lowest.'
  },
  {
    cards: ['supp-infinite-well-centered'],
    tex: ['2a'],
    tip: '$2a$: the distance between the two walls.'
  },
  {
    cards: ['supp-infinite-well-centered'],
    tex: ['\\psi_1 = \\frac{1}{\\sqrt{a}}\\cos\\frac{\\pi x}{2a}'],
    tip: '$\\psi_1$: the wavefunction of the lowest level for $-a \\lt x \\lt a$; it is zero outside. The factor $1/\\sqrt{a}$ makes $\\int_{-a}^{a}|\\psi_1|^2\\,dx = 1$.'
  },
  {
    cards: ['supp-infinite-well-centered'],
    tex: ['\\psi_2 = \\frac{1}{\\sqrt{a}}\\sin\\frac{\\pi x}{a}'],
    tip: '$\\psi_2$: the wavefunction of the second level for $-a \\lt x \\lt a$; it is zero outside. The factor $1/\\sqrt{a}$ makes $\\int_{-a}^{a}|\\psi_2|^2\\,dx = 1$.'
  },
  {
    cards: ['supp-infinite-well-centered'],
    match: ['infinite square well', 'infinite well'],
    tip: 'A potential that is zero between two walls and infinite outside them, so the wavefunction must be zero at the walls and beyond.'
  },
  {
    cards: ['supp-infinite-well-centered'],
    match: ['ground state', 'ground-state'],
    tip: 'The state of lowest energy.'
  },
  {
    cards: ['supp-infinite-well-centered'],
    match: ['first-excited', 'first excited'],
    tip: 'The state with the next-lowest energy above the ground state.'
  },
  {
    cards: ['supp-infinite-well-centered'],
    match: ['wavefunction'],
    tip: 'The function $\\psi(x)$ whose squared magnitude $|\\psi(x)|^2$ is the probability density of finding the particle at $x$.'
  },
  {
    cards: ['supp-infinite-well-centered'],
    match: ['definite parity', 'parity'],
    tip: 'Parity tells whether a function keeps its sign, $\\psi(-x) = \\psi(x)$ (even), or flips it, $\\psi(-x) = -\\psi(x)$ (odd), when $x$ is replaced by $-x$.'
  },
  {
    cards: ['supp-infinite-well-centered'],
    match: ['symmetric well'],
    tip: 'A well whose potential satisfies $V(-x) = V(x)$.'
  },

  /* ——— supp-hydrogen-series: Hydrogen spectral series ——— */
  {
    cards: ['supp-hydrogen-series', 'supp-hydrogen-line-1240'],
    tex: ['122\\ \\text{nm}', '656\\ \\text{nm}', '1875\\ \\text{nm}', '486\\ \\text{nm}'],
    tip: 'A wavelength in nanometers: $1\\ \\text{nm} = 10^{-9}\\ \\text{m}$.'
  },
  {
    cards: ['supp-hydrogen-series'],
    tex: ['n_f'],
    tip: '$n_f$: the principal quantum number of the final level, the level the electron drops to as it emits the photon.'
  },
  {
    cards: ['supp-hydrogen-series'],
    tex: ['n_f = 1', 'n_f = 2', 'n_f = 3'],
    tip: '$n_f$: the principal quantum number of the final level of the transition.'
  },
  {
    cards: ['supp-hydrogen-series'],
    tex: ['Ze'],
    tip: '$Ze$: the charge of the nucleus. $Z$: the number of protons. $e$: the elementary charge.'
  },
  {
    cards: ['supp-hydrogen-series'],
    tex: ['R_H'],
    tip: '$R_H$: the Rydberg constant for hydrogen.'
  },
  {
    cards: ['supp-hydrogen-series'],
    tex: ['Z^2'],
    tip: '$Z^2$: the square of the atomic number $Z$.'
  },
  {
    cards: ['supp-hydrogen-series'],
    match: ['spectral series'],
    tip: 'The set of hydrogen lines produced by electrons that drop from all higher levels to one fixed lower level.'
  },
  {
    cards: ['supp-hydrogen-series'],
    match: ['spectral band'],
    tip: 'A range of wavelengths: ultraviolet (below about $400\\ \\text{nm}$), visible (about $400$ to $700\\ \\text{nm}$) or infrared (above about $700\\ \\text{nm}$).'
  },
  {
    cards: ['supp-hydrogen-series'],
    match: ['Rydberg formula'],
    tip: 'The formula for $1/\\lambda$ of a hydrogen line in terms of the initial and final levels $n_i$ and $n_f$.'
  },
  {
    cards: ['supp-hydrogen-series'],
    match: ['nuclear charge'],
    tip: 'The charge of the nucleus, $+Ze$ for $Z$ protons.'
  },

  /* ——— supp-hydrogen-line-1240: Hydrogen lines from 1240 over E ——— */
  {
    cards: ['supp-hydrogen-line-1240'],
    tex: ['\\lambda\\,[\\text{nm}] \\approx 1240/E\\,[\\text{eV}]'],
    tip: '$\\lambda$: the photon wavelength in nanometers. $E$: the photon energy in electronvolts. The square brackets give the units.'
  },
  {
    cards: ['supp-hydrogen-line-1240'],
    tex: ['\\alpha'],
    tip: '$\\alpha$: the Greek letter alpha. In a line name it marks the first line of a series, the one from the next level up.'
  },
  {
    cards: ['supp-hydrogen-line-1240'],
    tex: ['\\beta'],
    tip: '$\\beta$: the Greek letter beta. In a line name it marks the second line of a series, the one from two levels up.'
  },
  {
    cards: ['supp-hydrogen-line-1240'],
    tex: ['n = 2 \\to 1', 'n = 3 \\to 2', 'n = 4 \\to 2'],
    tip: '$n$: the principal quantum number. The arrow points from the initial (upper) level to the final (lower) level.'
  },
  {
    cards: ['supp-hydrogen-line-1240'],
    tex: ['n'],
    tip: '$n$: the principal quantum number of a hydrogen level.'
  },
  {
    cards: ['supp-hydrogen-line-1240'],
    tex: ['\\Delta E'],
    tip: '$\\Delta E$: the energy difference between the two levels, which equals the energy of the emitted photon.'
  },
  {
    cards: ['supp-hydrogen-line-1240'],
    tex: ['\\tfrac{3}{4}(13.6) = 10.2\\ \\text{eV}', '13.6\\left(\\tfrac{1}{4} - \\tfrac{1}{9}\\right) = 1.89\\ \\text{eV}'],
    tip: '$13.6\\ \\text{eV}$: the ionization energy of hydrogen; level $n$ has energy $-13.6\\ \\text{eV}/n^2$. The result is the photon energy in electronvolts.'
  },
  {
    cards: ['supp-hydrogen-line-1240'],
    tex: ['4 \\times 121.6 \\approx 486\\ \\text{nm}'],
    tip: '$121.6\\ \\text{nm}$: the Lyman-$\\alpha$ wavelength. The factor $4$ is the ratio of the two wavelengths, the inverse of the ratio of the two photon energies.'
  },
  {
    cards: ['supp-hydrogen-line-1240'],
    tex: ['hc \\approx 1240\\ \\text{eV}\\cdot\\text{nm}'],
    tip: '$h$: the Planck constant. $c$: the speed of light. The product converts a photon energy into a wavelength through $\\lambda = hc/E$.'
  },
  {
    cards: ['supp-hydrogen-line-1240'],
    match: ['transition'],
    tip: 'A jump of the electron from one energy level to another. A downward jump emits a photon of energy $\\Delta E$.'
  },
  {
    cards: ['supp-hydrogen-line-1240'],
    match: ['ultraviolet'],
    tip: 'Light with wavelength shorter than about $400\\ \\text{nm}$.'
  },
  {
    cards: ['supp-hydrogen-line-1240'],
    match: ['Tables of Information'],
    tip: 'The sheet of constants and conversion factors printed in the GRE Physics test booklet.'
  },
  {
    cards: ['supp-hydrogen-line-1240'],
    match: ['Lyman'],
    tip: 'The Lyman series: the hydrogen lines whose final level is $n = 1$.'
  },

  /* ——— supp-two-electron-exchange: Two-electron spin and spatial symmetry ——— */
  {
    cards: ['supp-two-electron-exchange'],
    tex: ['\\langle\\mathbf{S}_1\\cdot\\mathbf{S}_2\\rangle'],
    tip: '$\\mathbf{S}_1$, $\\mathbf{S}_2$: the spin angular momentum operators of electron 1 and electron 2. $\\langle\\ \\rangle$: the expectation value in the given spin state.'
  },
  {
    cards: ['supp-two-electron-exchange'],
    tex: ['+\\hbar^2/4', '-3\\hbar^2/4'],
    tip: '$\\hbar$: the reduced Planck constant, $h/(2\\pi)$.'
  },
  {
    cards: ['supp-two-electron-exchange'],
    tex: ['\\mathbf{S}_1\\cdot\\mathbf{S}_2 = \\tfrac{1}{2}\\left(S^2 - S_1^2 - S_2^2\\right)'],
    tip: '$S^2$: the square of the total spin $\\mathbf{S} = \\mathbf{S}_1 + \\mathbf{S}_2$, with eigenvalue $s(s+1)\\hbar^2$. $S_1^2$, $S_2^2$: the squared spin of each electron, each $\\tfrac{3}{4}\\hbar^2$.'
  },
  {
    cards: ['supp-two-electron-exchange'],
    match: ['spin triplet', 'triplet'],
    tip: 'The three two-electron spin states with total spin quantum number $s = 1$.'
  },
  {
    cards: ['supp-two-electron-exchange'],
    match: ['singlet'],
    tip: 'The single two-electron spin state with total spin quantum number $s = 0$.'
  },
  {
    cards: ['supp-two-electron-exchange'],
    match: ['exchange symmetry'],
    tip: 'How a two-particle wavefunction behaves when the labels of the two particles are swapped: symmetric if it stays the same, antisymmetric if it changes sign.'
  },
  {
    cards: ['supp-two-electron-exchange'],
    match: ['spatial wavefunction', 'spatial state'],
    tip: 'The part of the two-electron wavefunction that depends on the positions $\\mathbf{r}_1$ and $\\mathbf{r}_2$, as opposed to the spin part.'
  },
  {
    cards: ['supp-two-electron-exchange'],
    match: ['fermions'],
    tip: 'Particles with half-integer spin, such as electrons, protons and neutrons.'
  },
  {
    cards: ['supp-two-electron-exchange'],
    match: ['full state'],
    tip: 'The product of the spatial part and the spin part of the two-electron wavefunction.'
  },
  {
    cards: ['supp-two-electron-exchange'],
    match: ['antisymmetric'],
    tip: 'Changes sign when the two particles are exchanged.'
  },

  /* ——— supp-spin-half-properties: Spin-1/2 operator properties ——— */
  {
    cards: ['supp-spin-half-properties'],
    tex: ['S^2'],
    tip: '$S^2 = S_x^2 + S_y^2 + S_z^2$: the operator for the square of the total spin angular momentum.'
  },
  {
    cards: ['supp-spin-half-properties'],
    tex: ['\\hat{S}_i = \\tfrac{\\hbar}{2}\\sigma_i'],
    tip: '$\\hat{S}_i$: the spin operator for the component $i = x, y, z$. $\\hbar$: the reduced Planck constant. $\\sigma_i$: the Pauli matrix for that component.'
  },
  {
    cards: ['supp-spin-half-properties'],
    tex: ['\\hat{S}_i^2 = \\tfrac{\\hbar^2}{4}I'],
    tip: '$\\hat{S}_i^2$: the square of one spin-component operator. $I$: the $2\\times2$ identity matrix.'
  },
  {
    cards: ['supp-spin-half-properties'],
    tex: ['\\tfrac{3}{4}\\hbar^2'],
    tip: '$\\hbar$: the reduced Planck constant, $h/(2\\pi)$.'
  },
  {
    cards: ['supp-spin-half-properties'],
    tex: ['[\\hat{S}_x, \\hat{S}_y] = i\\hbar\\hat{S}_z'],
    tip: '$[\\hat{A}, \\hat{B}] = \\hat{A}\\hat{B} - \\hat{B}\\hat{A}$: the commutator. $\\hat{S}_x$, $\\hat{S}_y$, $\\hat{S}_z$: the spin-component operators. $i$: the imaginary unit.'
  },
  {
    cards: ['supp-spin-half-properties'],
    tex: ['\\pm 1'],
    tip: '$+1$ and $-1$.'
  },
  {
    cards: ['supp-spin-half-properties'],
    match: ['Pauli matrix'],
    tip: 'The three $2\\times2$ matrices $\\sigma_x$, $\\sigma_y$, $\\sigma_z$ that represent the spin components of a spin-$\\tfrac{1}{2}$ particle.'
  },
  {
    cards: ['supp-spin-half-properties'],
    match: ['spin component'],
    tip: 'The projection of the spin angular momentum on one axis: $S_x$, $S_y$ or $S_z$.'
  },
  {
    cards: ['supp-spin-half-properties'],
    match: ['eigenvalue'],
    tip: 'A number $\\lambda$ with $\\hat{A}\\psi = \\lambda\\psi$ for some nonzero state $\\psi$. A measurement of $\\hat{A}$ can only give one of its eigenvalues.'
  },
  {
    cards: ['supp-spin-half-properties'],
    match: ['GR1777'],
    tip: 'A released GRE Physics practice test from ETS, form number GR1777.'
  },

  /* ——— supp-spin-measurement: Spin-1/2 measurement probabilities ——— */
  {
    cards: ['supp-spin-measurement'],
    tex: ['c_\\uparrow|\\!\\uparrow\\rangle + c_\\downarrow|\\!\\downarrow\\rangle'],
    tip: '$|\\!\\uparrow\\rangle$, $|\\!\\downarrow\\rangle$: the eigenstates of $S_z$, spin up and spin down along $z$. $c_\\uparrow$, $c_\\downarrow$: complex numbers, the amplitudes of the two parts.'
  },
  {
    cards: ['supp-spin-measurement'],
    tex: ['S_z = \\pm\\hbar/2'],
    tip: '$S_z$: the spin component along $z$. $\\hbar$: the reduced Planck constant. $\\pm\\hbar/2$: the two possible results, up and down.'
  },
  {
    cards: ['supp-spin-measurement'],
    tex: ['S_x = +\\hbar/2', 'S_x'],
    tip: '$S_x$: the spin component along $x$. $+\\hbar/2$: the spin-up result along $x$.'
  },
  {
    cards: ['supp-spin-measurement'],
    tex: ['\\tfrac{1}{\\sqrt{2}}(1, 1)'],
    tip: 'The $S_x = +\\hbar/2$ eigenstate, written as its two components along $|\\!\\uparrow\\rangle$ and $|\\!\\downarrow\\rangle$.'
  },
  {
    cards: ['supp-spin-measurement'],
    tex: ['P\\!\\left(S_x = +\\tfrac{\\hbar}{2}\\right) = \\tfrac{1}{2}|c_\\uparrow + c_\\downarrow|^2'],
    tip: '$P$: the probability of the result in the brackets. $c_\\uparrow$, $c_\\downarrow$: the amplitudes of the state.'
  },
  {
    cards: ['supp-spin-measurement'],
    tex: ['|\\!\\uparrow\\rangle'],
    tip: '$|\\!\\uparrow\\rangle$: the spin-up eigenstate of $S_z$, the state with $c_\\uparrow = 1$ and $c_\\downarrow = 0$.'
  },
  {
    cards: ['supp-spin-measurement'],
    match: ['normalized'],
    tip: 'Scaled so that the inner product of the state with itself is $1$.'
  },
  {
    cards: ['supp-spin-measurement'],
    match: ['project'],
    tip: 'Take the inner product of the state with the eigenstate. The result is a complex number.'
  },

  /* ——— supp-stern-gerlach: Stern-Gerlach splitting ——— */
  {
    cards: ['supp-stern-gerlach'],
    tex: ['j'],
    tip: '$j$: the quantum number of the total angular momentum of the atom; the magnitude of that angular momentum is $\\sqrt{j(j+1)}\\,\\hbar$.'
  },
  {
    cards: ['supp-stern-gerlach'],
    tex: ['l = 0', 'l'],
    tip: '$l$: the orbital angular momentum quantum number.'
  },
  {
    cards: ['supp-stern-gerlach'],
    tex: ['s = \\tfrac{1}{2}'],
    tip: '$s$: the spin quantum number.'
  },
  {
    cards: ['supp-stern-gerlach'],
    match: ['Stern–Gerlach', 'Stern-Gerlach'],
    tip: 'An experiment first done in 1922 by Otto Stern and Walther Gerlach: a beam of neutral silver atoms passes between the poles of a magnet and lands on a plate, where the positions of the atoms are recorded.'
  },
  {
    cards: ['supp-stern-gerlach'],
    match: ['nonuniform'],
    tip: 'Varying in strength or direction from point to point in space.'
  },
  {
    cards: ['supp-stern-gerlach'],
    match: ['net force'],
    tip: 'The vector sum of all forces on the atom. It changes the motion of the atom\'s center of mass.'
  },
  {
    cards: ['supp-stern-gerlach'],
    match: ['torque'],
    tip: 'A twisting action. On a magnetic moment $\\boldsymbol{\\mu}$ in a field $\\mathbf{B}$ it is $\\boldsymbol{\\tau} = \\boldsymbol{\\mu}\\times\\mathbf{B}$, which turns the moment without moving its center.'
  },
  {
    cards: ['supp-stern-gerlach'],
    match: ['ground-state atoms'],
    tip: 'Atoms in their state of lowest energy.'
  },
  {
    cards: ['supp-stern-gerlach'],
    match: ['angular momentum'],
    tip: 'Here the total angular momentum of the atom, the sum of orbital and spin parts.'
  },

  /* ——— supp-delta-well-bound: Delta-well and shallow-well bound states ——— */
  {
    cards: ['supp-delta-well-bound', 'supp-tunneling-scaling'],
    tex: ['m'],
    tip: '$m$: the mass of the particle.'
  },
  {
    cards: ['supp-delta-well-bound'],
    tex: ['V(x) = -A\\,\\delta(x)'],
    tip: '$V(x)$: the potential energy at position $x$. $\\delta(x)$: the Dirac delta function, zero everywhere except at $x = 0$ and with total area $1$. $A$: a positive constant that sets the strength; the minus sign makes the well attractive.'
  },
  {
    cards: ['supp-delta-well-bound'],
    tex: ['A'],
    tip: '$A$: the strength of the delta well, a positive constant. The potential integrates to $\\int V\\,dx = -A$.'
  },
  {
    cards: ['supp-delta-well-bound'],
    tex: ['mA^2/\\hbar^2'],
    tip: '$m$: the particle mass. $A$: the well strength. $\\hbar$: the reduced Planck constant, $h/2\\pi$.'
  },
  {
    cards: ['supp-delta-well-bound'],
    tex: ['\\psi \\propto e^{-mA|x|/\\hbar^2}'],
    tip: '$\\psi$: the bound-state wavefunction. $\\propto$: proportional to. $|x|$: the distance from the well at $x = 0$, so the same decay holds on both sides.'
  },
  {
    cards: ['supp-delta-well-bound'],
    match: ['bound state'],
    tip: 'A state with energy below the potential far away, so the particle stays near the well and its wavefunction goes to zero at large distance.'
  },
  {
    cards: ['supp-delta-well-bound'],
    match: ['even bound state'],
    tip: 'A bound state whose wavefunction is symmetric about the center of the well: $\\psi(-x) = \\psi(x)$.'
  },
  {
    cards: ['supp-delta-well-bound'],
    match: ['binding energy', 'binding'],
    tip: 'The energy needed to free the particle: the distance from its bound-state energy up to $E = 0$, the potential far from the well.'
  },
  {
    cards: ['supp-delta-well-bound'],
    match: ['square well'],
    tip: 'A potential equal to a constant $-V_0$ inside a region of width $a$ and zero outside. Shallow means $V_0$ is small compared with $\\hbar^2/(ma^2)$.'
  },
  {
    cards: ['supp-delta-well-bound'],
    match: ['attractive'],
    tip: 'The potential is negative near the origin, so the force pulls the particle toward the well.'
  },
  {
    cards: ['supp-delta-well-bound'],
    match: ['kink'],
    tip: 'A point where a function is continuous but its slope jumps. Here $d\\psi/dx$ jumps at $x = 0$ because the delta potential is infinite there.'
  },

  /* ——— supp-tunneling-scaling: Tunneling probability scaling ——— */
  {
    cards: ['supp-tunneling-scaling'],
    tex: ['E'],
    tip: '$E$: the total energy of the particle.'
  },
  {
    cards: ['supp-tunneling-scaling'],
    tex: ['V_0 \\gt E'],
    tip: '$V_0$: the height of the barrier, the potential energy inside it. $E$: the particle\'s energy. The inequality says the energy lies below the top of the barrier, so a classical particle could not pass.'
  },
  {
    cards: ['supp-tunneling-scaling'],
    tex: ['d'],
    tip: '$d$: the width of the barrier, the distance the particle must cross.'
  },
  {
    cards: ['supp-tunneling-scaling'],
    tex: ['V_0 - E'],
    tip: '$V_0 - E$: how far the top of the barrier lies above the particle\'s energy.'
  },
  {
    cards: ['supp-tunneling-scaling'],
    tex: ['T'],
    tip: '$T$: the transmission probability, the fraction of incident particles that come out on the far side of the barrier.'
  },
  {
    cards: ['supp-tunneling-scaling'],
    tex: ['\\kappa d \\gg 1'],
    tip: '$\\kappa$: the decay constant of the wavefunction inside the barrier, in units of inverse length. $d$: the barrier width. $\\gg 1$: much greater than $1$.'
  },
  {
    cards: ['supp-tunneling-scaling'],
    match: ['transmission probability'],
    tip: 'The probability that a particle sent at the barrier passes to the other side: the transmitted flux divided by the incident flux.'
  },
  {
    cards: ['supp-tunneling-scaling'],
    match: ['wide barrier'],
    tip: 'A barrier whose width $d$ is large compared with the length $1/\\kappa$ over which the wavefunction decays inside it.'
  },
  {
    cards: ['supp-tunneling-scaling'],
    match: ['barrier'],
    tip: 'A region where the potential energy $V_0$ is higher than the particle\'s energy $E$.'
  },
  {
    cards: ['supp-tunneling-scaling'],
    match: ['tunneling', 'tunnel'],
    tip: 'Passing through a region where the particle\'s energy is below the potential energy, which classical mechanics forbids. In quantum mechanics the wavefunction is nonzero inside and beyond the barrier.'
  },
  {
    cards: ['supp-tunneling-scaling'],
    match: ['prefactor'],
    tip: 'The factor that multiplies the exponential in the full result. It depends on $E$ and $V_0$ but changes slowly compared with the exponential, so it is left out.'
  },
  {
    cards: ['supp-tunneling-scaling'],
    match: ['decays instead of oscillating'],
    tip: 'Inside the barrier the Schrödinger equation reads $\\psi\'\' = \\kappa^2\\psi$ with real $\\kappa$, so the solutions are real exponentials, not sines and cosines.'
  },

  /* ——— supp-beta-q-value: Reaction and beta-decay Q values ——— */
  {
    cards: ['supp-beta-q-value', 'supp-decay-bookkeeping'],
    tex: ['\\beta^-'],
    tip: '$\\beta^-$: beta-minus decay, in which a nucleus emits an electron and an electron antineutrino.'
  },
  {
    cards: ['supp-beta-q-value', 'supp-decay-bookkeeping'],
    tex: ['\\beta^+'],
    tip: '$\\beta^+$: beta-plus decay, in which a nucleus emits a positron (the antiparticle of the electron) and an electron neutrino.'
  },
  {
    cards: ['supp-beta-q-value'],
    tex: ['M_P'],
    tip: '$M_P$: the atomic mass of the parent, the neutral atom before the decay.'
  },
  {
    cards: ['supp-beta-q-value'],
    tex: ['M_D'],
    tip: '$M_D$: the atomic mass of the daughter, the neutral atom of the element the decay produces.'
  },
  {
    cards: ['supp-beta-q-value'],
    tex: ['Q'],
    tip: '$Q$: the Q value of a reaction or decay, the kinetic energy it releases (negative if energy must be supplied).'
  },
  {
    cards: ['supp-beta-q-value'],
    tex: ['M_P - M_D'],
    tip: '$M_P - M_D$: the atomic mass of the parent minus the atomic mass of the daughter.'
  },
  {
    cards: ['supp-beta-q-value'],
    tex: ['2m_e'],
    tip: '$m_e$: the electron mass, $0.511\\ \\mathrm{MeV}/c^2$. $2m_e$ is twice it.'
  },
  {
    cards: ['supp-beta-q-value'],
    tex: ['Q \\gt 0'],
    tip: '$Q \\gt 0$: a positive Q value, so the initial particles have more rest energy than the final ones.'
  },
  {
    cards: ['supp-beta-q-value'],
    tex: ['Q = (M_P - M_D)c^2', 'Q = (M_P - M_D - 2m_e)c^2'],
    tip: '$Q$: the Q value. $M_P$, $M_D$: the atomic masses of parent and daughter. $m_e$: the electron mass. $c$: the speed of light.'
  },
  {
    cards: ['supp-beta-q-value'],
    match: ['Q value'],
    tip: 'The energy released in a nuclear reaction or decay, shared as kinetic energy among the products.'
  },
  {
    cards: ['supp-beta-q-value'],
    match: ['atomic mass'],
    tip: 'The mass of a whole neutral atom, as listed in mass tables, in contrast to the mass of the bare nucleus.'
  },
  {
    cards: ['supp-beta-q-value'],
    match: ['parent'],
    tip: 'The nucleus or atom before the decay.'
  },
  {
    cards: ['supp-beta-q-value'],
    match: ['daughter'],
    tip: 'The nucleus or atom that the decay produces.'
  },
  {
    cards: ['supp-beta-q-value'],
    match: ['electron binding energies'],
    tip: 'The energy that holds the electrons to the atom. The values for parent and daughter differ by far less than a typical decay energy, so the card leaves them out.'
  },

  /* ——— supp-free-expansion: Free expansion of an ideal gas ——— */
  {
    cards: ['supp-free-expansion', 'supp-adiabatic-temperature', 'supp-cycle-area', 'supp-carnot-steps', 'supp-helmholtz-from-z', 'supp-free-energy-minimum', 'supp-two-level-populations'],
    tex: ['T'],
    tip: '$T$: the absolute temperature, in kelvin ($\\mathrm{K}$).'
  },
  {
    cards: ['supp-free-expansion', 'supp-carnot-steps', 'supp-free-energy-minimum'],
    tex: ['\\Delta U'],
    tip: '$\\Delta U$: the change in the internal energy of the system (here the gas), final value minus initial value.'
  },
  {
    cards: ['supp-free-expansion', 'supp-carnot-steps', 'supp-cycle-area'],
    tex: ['\\Delta S'],
    tip: '$\\Delta S$: the change in the entropy of the gas, final value minus initial value.'
  },
  {
    cards: ['supp-free-expansion', 'supp-adiabatic-temperature', 'supp-carnot-steps', 'supp-helmholtz-from-z'],
    match: ['ideal gas'],
    tip: 'A model gas whose molecules have negligible size and exert no forces on each other except in collisions. It obeys $PV = nRT$, with $n$ the number of moles and $R$ the gas constant.'
  },
  {
    cards: ['supp-free-expansion', 'supp-adiabatic-temperature', 'supp-carnot-steps'],
    match: ['reversible'],
    tip: 'Carried out so slowly that the system stays in equilibrium at every step, so that an infinitesimal change of the conditions could run the process backward.'
  },
  {
    cards: ['supp-free-expansion', 'supp-carnot-steps', 'supp-reservoir-entropy'],
    match: ['irreversible'],
    tip: 'Not reversible: an infinitesimal change of the conditions cannot run the process backward. Examples are a gas rushing into vacuum and heat flowing across a finite temperature difference.'
  },
  {
    cards: ['supp-free-expansion', 'supp-carnot-steps'],
    match: ['insulated'],
    tip: 'Enclosed by walls that let no heat pass through.'
  },
  {
    cards: ['supp-free-expansion'],
    tex: ['V_1'],
    tip: '$V_1$: the volume of the gas before the expansion.'
  },
  {
    cards: ['supp-free-expansion'],
    tex: ['V_2'],
    tip: '$V_2$: the volume of the gas after the expansion.'
  },
  {
    cards: ['supp-free-expansion'],
    tex: ['U'],
    tip: '$U$: the internal energy of the gas, the total kinetic and potential energy of its molecules.'
  },
  {
    cards: ['supp-free-expansion'],
    tex: ['W = Q = 0'],
    tip: '$W$: the work done by the gas. $Q$: the heat that flows into the gas.'
  },
  {
    cards: ['supp-free-expansion'],
    tex: ['\\Delta S \\gt 0'],
    tip: '$\\Delta S$: the change in the entropy of the gas. $\\gt 0$: the entropy increases.'
  },
  {
    cards: ['supp-free-expansion'],
    tex: ['Q \\ne T\\,\\Delta S'],
    tip: '$Q$: the heat into the gas. $T$: its temperature. $\\Delta S$: its change in entropy. $\\ne$: not equal to.'
  },
  {
    cards: ['supp-free-expansion'],
    tex: ['\\Delta S = Q/T'],
    tip: '$\\Delta S$: the change in entropy. $Q$: the heat that enters. $T$: the fixed temperature at which it enters.'
  },
  {
    cards: ['supp-free-expansion'],
    tex: ['\\Delta S \\gt \\int \\delta Q/T'],
    tip: '$\\delta Q$: a small amount of heat that enters the gas during one step of the process. $\\int \\delta Q/T$: the sum of each such heat divided by the temperature at which it enters.'
  },
  {
    cards: ['supp-free-expansion'],
    tex: ['\\int P_{\\mathrm{ext}}\\,dV'],
    tip: '$P_{\\mathrm{ext}}$: the external pressure that the gas pushes against. $dV$: a small change of the gas volume. The integral is the work done by the gas.'
  },
  {
    cards: ['supp-free-expansion'],
    tex: ['P_{\\mathrm{ext}} = 0'],
    tip: '$P_{\\mathrm{ext}}$: the external pressure on the gas. It is zero because the gas expands into vacuum.'
  },
  {
    cards: ['supp-free-expansion'],
    tex: ['\\int (nRT/V)\\,dV'],
    tip: '$n$: the number of moles. $R$: the gas constant. $T$: the temperature. $V$: the volume. $nRT/V$ is the pressure of the gas itself, from $PV = nRT$.'
  },
  {
    cards: ['supp-free-expansion'],
    match: ['free expansion', 'expands freely'],
    tip: 'Expansion of a gas into an empty region, with no piston for it to push. For a gas it is also called Joule expansion.'
  },
  {
    cards: ['supp-free-expansion'],
    match: ['reversible isotherm'],
    tip: 'A path at constant temperature, carried out slowly enough that the gas stays in equilibrium at every step.'
  },
  {
    cards: ['supp-free-expansion'],
    match: ['end states'],
    tip: 'The initial and final equilibrium states of the gas. Entropy is a state function, so $\\Delta S$ depends only on them, not on the path between them.'
  },

  /* ——— supp-adiabatic-temperature: Reversible adiabatic: temperature and work ——— */
  {
    cards: ['supp-adiabatic-temperature', 'supp-carnot-steps'],
    match: ['adiabatic'],
    tip: 'With no heat exchanged between the gas and its surroundings, $Q = 0$.'
  },
  {
    cards: ['supp-adiabatic-temperature'],
    tex: ['(T_i, V_i)'],
    tip: '$T_i$, $V_i$: the temperature and the volume of the gas at the start.'
  },
  {
    cards: ['supp-adiabatic-temperature'],
    tex: ['(T_f, V_f)'],
    tip: '$T_f$, $V_f$: the temperature and the volume of the gas at the end.'
  },
  {
    cards: ['supp-adiabatic-temperature'],
    tex: ['T_f = T_i\\,(V_i/V_f)^{\\gamma-1}'],
    tip: '$T_i$, $T_f$: the initial and final temperatures. $V_i$, $V_f$: the initial and final volumes. $\\gamma = C_P/C_V$: the ratio of the heat capacities at constant pressure and at constant volume.'
  },
  {
    cards: ['supp-adiabatic-temperature'],
    tex: ['2^{2/3} \\approx 1.59'],
    tip: '$2^{2/3}$: the volume ratio $2$ raised to $\\gamma - 1 = 2/3$, the exponent for a monatomic gas with $\\gamma = 5/3$.'
  },
  {
    cards: ['supp-adiabatic-temperature'],
    tex: ['W = -\\Delta U = nC_V(T_i - T_f) = \\dfrac{P_iV_i - P_fV_f}{\\gamma - 1}'],
    tip: '$W$: the work done by the gas. $\\Delta U$: the change in its internal energy. $n$: the number of moles. $C_V$: the molar heat capacity at constant volume. $P_i, V_i$ and $P_f, V_f$: the initial and final pressure and volume. $\\gamma = C_P/C_V$.'
  },
  {
    cards: ['supp-adiabatic-temperature'],
    tex: ['PV^{\\gamma} = \\text{const}'],
    tip: '$P$: the pressure. $V$: the volume. $\\gamma = C_P/C_V$: the ratio of the heat capacities at constant pressure and at constant volume.'
  },
  {
    cards: ['supp-adiabatic-temperature'],
    tex: ['PV = nRT'],
    tip: 'The ideal gas law. $P$: pressure. $V$: volume. $n$: number of moles. $R$: the gas constant, $8.31\\ \\mathrm{J/(mol\\,K)}$. $T$: temperature.'
  },
  {
    cards: ['supp-adiabatic-temperature'],
    match: ['monatomic'],
    tip: 'Made of single atoms, such as helium or argon. Each atom has only $3$ translational degrees of freedom, so $C_V = \\tfrac{3}{2}R$ per mole and $\\gamma = 5/3$.'
  },
  {
    cards: ['supp-adiabatic-temperature'],
    match: ['work by the gas'],
    tip: 'The work the gas does on its surroundings, $\\int P\\,dV$. It is positive when the gas expands and negative when it is compressed.'
  },

  /* ——— supp-cycle-area: Work and heat from cycle diagrams ——— */
  {
    cards: ['supp-cycle-area', 'supp-helmholtz-from-z', 'supp-free-energy-minimum'],
    tex: ['V'],
    tip: '$V$: the volume of the gas or system.'
  },
  {
    cards: ['supp-cycle-area', 'supp-helmholtz-from-z'],
    tex: ['P'],
    tip: '$P$: the pressure of the gas.'
  },
  {
    cards: ['supp-cycle-area', 'supp-helmholtz-from-z'],
    tex: ['S'],
    tip: '$S$: the entropy of the gas or system.'
  },
  {
    cards: ['supp-cycle-area', 'supp-carnot-steps'],
    tex: ['\\Delta U = 0'],
    tip: '$\\Delta U$: the change in the internal energy of the gas. Here it is zero: the gas ends with the internal energy it started with.'
  },
  {
    cards: ['supp-cycle-area', 'supp-carnot-steps'],
    tex: ['\\Delta S = 0'],
    tip: '$\\Delta S$: the change in the entropy of the gas. Here it is zero: the entropy at the end equals the entropy at the start.'
  },
  {
    cards: ['supp-cycle-area', 'supp-carnot-steps'],
    tex: ['Q = W'],
    tip: '$Q$: the heat that flows into the gas. $W$: the work done by the gas.'
  },
  {
    cards: ['supp-cycle-area', 'supp-carnot-steps'],
    match: ['adiabat'],
    tip: 'The curve that a reversible adiabatic process (no heat exchanged) traces on a state diagram. Along it the entropy of the gas stays constant.'
  },
  {
    cards: ['supp-cycle-area', 'supp-carnot-steps'],
    match: ['isothermal', 'isotherm'],
    tip: 'At constant temperature. An isotherm is the curve such a process traces on a state diagram.'
  },
  {
    cards: ['supp-cycle-area', 'supp-carnot-steps'],
    match: ['Carnot engine', 'Carnot cycle', 'Carnot'],
    tip: 'The cycle of an ideal reversible heat engine that works between two reservoirs at fixed temperatures. No engine working between the same two temperatures has a higher efficiency.'
  },
  {
    cards: ['supp-cycle-area'],
    tex: ['Q_{\\mathrm{net}} = W_{\\mathrm{net}}'],
    tip: '$Q_{\\mathrm{net}}$: the net heat absorbed by the gas over one cycle. $W_{\\mathrm{net}}$: the net work done by the gas over one cycle.'
  },
  {
    cards: ['supp-cycle-area'],
    tex: ['Q_{\\mathrm{net}}'],
    tip: '$Q_{\\mathrm{net}}$: the net heat absorbed by the gas in one cycle, heat taken in minus heat given off.'
  },
  {
    cards: ['supp-cycle-area'],
    tex: ['|Q| = T\\,\\Delta S'],
    tip: '$|Q|$: the size of the heat exchanged on one isotherm. $T$: the temperature of that isotherm. $\\Delta S$: the change in entropy along it.'
  },
  {
    cards: ['supp-cycle-area'],
    tex: ['T = 0'],
    tip: '$T = 0$: absolute zero, the bottom of the temperature axis of the diagram.'
  },
  {
    cards: ['supp-cycle-area'],
    tex: ['|Q_H| = T_H\\,\\Delta S', '|Q_C| = T_C\\,\\Delta S'],
    tip: '$Q_H$, $Q_C$: the heat exchanged with the hot and with the cold reservoir. $T_H$, $T_C$: the hot and cold temperatures. $\\Delta S$: the change in entropy on each isotherm.'
  },
  {
    cards: ['supp-cycle-area'],
    tex: ['|W_{\\mathrm{net}}| = (T_H - T_C)\\,\\Delta S'],
    tip: '$W_{\\mathrm{net}}$: the net work per cycle. $T_H$, $T_C$: the hot and cold temperatures. $\\Delta S$: the width of the rectangle along the entropy axis.'
  },
  {
    cards: ['supp-cycle-area'],
    tex: ['|Q_H| - |Q_C|'],
    tip: '$|Q_H|$: the heat taken from the hot reservoir. $|Q_C|$: the heat given to the cold reservoir.'
  },
  {
    cards: ['supp-cycle-area'],
    match: ['closed cycle'],
    tip: 'A sequence of processes that brings the gas back to the state it started in.'
  },
  {
    cards: ['supp-cycle-area'],
    match: ['net work'],
    tip: 'The work done by the gas minus the work done on it, added up over the whole cycle.'
  },
  {
    cards: ['supp-cycle-area'],
    match: ['net heat'],
    tip: 'The heat absorbed by the gas minus the heat it gives off, added up over the whole cycle.'
  },
  {
    cards: ['supp-cycle-area'],
    match: ['clockwise'],
    tip: 'Traversed in the direction of a clock\'s hands, with the horizontal axis pointing right and the vertical axis pointing up.'
  },
  {
    cards: ['supp-cycle-area'],
    match: ['engine'],
    tip: 'A device that takes heat from a hot reservoir, turns part of it into work, and gives the rest to a cold reservoir.'
  },
  {
    cards: ['supp-cycle-area'],
    match: ['refrigerator'],
    tip: 'A cycle that takes in work in order to move heat from a cold reservoir to a hot one.'
  },

  /* ——— supp-carnot-steps: Carnot cycle: the four steps and their signs (supplemental list) ——— */
  {
    cards: ['supp-carnot-steps', 'supp-reservoir-entropy'],
    tex: ['T_H'],
    tip: '$T_H$: the temperature of the hot reservoir.'
  },
  {
    cards: ['supp-carnot-steps', 'supp-reservoir-entropy'],
    tex: ['T_C'],
    tip: '$T_C$: the temperature of the cold reservoir.'
  },
  {
    cards: ['supp-carnot-steps', 'supp-reservoir-entropy', 'supp-free-energy-minimum'],
    match: ['reservoir'],
    tip: 'A body so large that heat flowing into it or out of it does not change its temperature.'
  },
  {
    cards: ['supp-carnot-steps'],
    tex: ['Q'],
    tip: '$Q$: the heat that flows into the gas during a step; it is negative when heat leaves the gas.'
  },
  {
    cards: ['supp-carnot-steps'],
    tex: ['W'],
    tip: '$W$: the work done by the gas during a step; it is negative when work is done on the gas.'
  },
  {
    cards: ['supp-carnot-steps'],
    tex: ['\\Delta F'],
    tip: '$\\Delta F$: the change in the Helmholtz free energy $F = U - TS$ of the gas, where $U$ is the internal energy, $T$ the temperature and $S$ the entropy.'
  },
  {
    cards: ['supp-carnot-steps'],
    tex: ['1 \\to 2', '2 \\to 3', '3 \\to 4', '4 \\to 1'],
    tip: '$1 \\to 2$ and the like: one step of the cycle, from one numbered corner state to the next.'
  },
  {
    cards: ['supp-carnot-steps'],
    tex: ['Q \\gt 0', 'Q \\lt 0', 'Q = 0'],
    tip: '$Q$: the heat into the gas. Its sign says whether heat enters the gas ($\\gt 0$), leaves it ($\\lt 0$), or neither ($= 0$).'
  },
  {
    cards: ['supp-carnot-steps'],
    tex: ['W \\gt 0', 'W \\lt 0'],
    tip: '$W$: the work done by the gas. Its sign says whether the gas does work ($\\gt 0$) or has work done on it ($\\lt 0$).'
  },
  {
    cards: ['supp-carnot-steps'],
    tex: ['\\Delta U \\lt 0', '\\Delta U \\gt 0'],
    tip: '$\\Delta U$: the change in the internal energy of the gas. Its sign says whether the internal energy falls ($\\lt 0$) or rises ($\\gt 0$) in the step.'
  },
  {
    cards: ['supp-carnot-steps'],
    tex: ['\\Delta S = Q_H/T_H \\gt 0'],
    tip: '$\\Delta S$: the change in the entropy of the gas. $Q_H$: the heat taken from the hot reservoir. $T_H$: the temperature of that reservoir.'
  },
  {
    cards: ['supp-carnot-steps'],
    tex: ['\\Delta S = -|Q_C|/T_C \\lt 0'],
    tip: '$\\Delta S$: the change in the entropy of the gas. $|Q_C|$: the size of the heat given to the cold reservoir. $T_C$: the temperature of that reservoir.'
  },
  {
    cards: ['supp-carnot-steps'],
    tex: ['\\Delta F = -W \\lt 0', '\\Delta F = -W \\gt 0'],
    tip: '$\\Delta F$: the change in the Helmholtz free energy of the gas. $W$: the work done by the gas. On an isotherm of an ideal gas $\\Delta U = 0$ and $Q = T\\,\\Delta S$, so $\\Delta F = \\Delta U - T\\,\\Delta S = -W$.'
  },
  {
    cards: ['supp-carnot-steps'],
    tex: ['\\Delta U = Q - W'],
    tip: 'The first law of thermodynamics. $\\Delta U$: the change in internal energy. $Q$: the heat into the gas. $W$: the work done by the gas.'
  },
  {
    cards: ['supp-carnot-steps'],
    tex: ['\\delta Q = C\\,dT'],
    tip: '$\\delta Q$: a small amount of heat into the gas. $C$: its heat capacity along the path. $dT$: the small temperature change that the heat causes.'
  },

  /* ——— supp-decay-bookkeeping: How decays change Z and A ——— */
  {
    cards: ['supp-decay-bookkeeping'],
    tex: ['Z'],
    tip: '$Z$: the atomic number, the number of protons in the nucleus.'
  },
  {
    cards: ['supp-decay-bookkeeping'],
    tex: ['A'],
    tip: '$A$: the mass number, the number of protons plus neutrons in the nucleus.'
  },
  {
    cards: ['supp-decay-bookkeeping'],
    tex: ['\\alpha'],
    tip: '$\\alpha$: alpha decay, in which a nucleus emits an alpha particle.'
  },
  {
    cards: ['supp-decay-bookkeeping'],
    tex: ['\\gamma'],
    tip: '$\\gamma$: gamma decay, in which an excited nucleus emits a high-energy photon.'
  },
  {
    cards: ['supp-decay-bookkeeping'],
    tex: ['\\Delta A/4'],
    tip: '$\\Delta A$: the total decrease of the mass number $A$ from the first nucleus of the chain to the last.'
  },
  {
    cards: ['supp-decay-bookkeeping'],
    tex: ['Z \\to Z+1', 'Z \\to Z-1'],
    tip: '$Z$: the atomic number. The arrow joins its value before the decay to its value after.'
  },
  {
    cards: ['supp-decay-bookkeeping'],
    tex: ['n \\to p + e^- + \\bar\\nu_e'],
    tip: '$n$: a neutron. $p$: a proton. $e^-$: an electron. $\\bar\\nu_e$: an electron antineutrino.'
  },
  {
    cards: ['supp-decay-bookkeeping'],
    match: ['atomic number'],
    tip: 'The number of protons in a nucleus. It fixes which chemical element the atom is.'
  },
  {
    cards: ['supp-decay-bookkeeping'],
    match: ['mass number'],
    tip: 'The number of nucleons (protons plus neutrons) in a nucleus.'
  },
  {
    cards: ['supp-decay-bookkeeping'],
    match: ['decay chain'],
    tip: 'A sequence of decays in which each daughter nucleus decays again, until a stable nucleus is reached.'
  },
  {
    cards: ['supp-decay-bookkeeping'],
    match: ['electron capture'],
    tip: 'A process in which the nucleus absorbs one of the atom\'s inner electrons; a proton becomes a neutron and an electron neutrino is emitted.'
  },

  /* ——— supp-pn-junction: Built-in field of a p-n junction ——— */
  {
    cards: ['supp-pn-junction', 'supp-free-energy-minimum'],
    match: ['equilibrium'],
    tip: 'The state a system settles into and then keeps: on average nothing changes in time and no net flow of energy or charge occurs.'
  },
  {
    cards: ['supp-pn-junction'],
    tex: ['p'],
    tip: '$p$: the p-type side, semiconductor doped with acceptor atoms so that holes are the main charge carriers.'
  },
  {
    cards: ['supp-pn-junction'],
    tex: ['n'],
    tip: '$n$: the n-type side, semiconductor doped with donor atoms so that electrons are the main charge carriers.'
  },
  {
    cards: ['supp-pn-junction'],
    tex: ['\\mathbf{E}'],
    tip: '$\\mathbf{E}$: the electric field, a vector (shown in bold).'
  },
  {
    cards: ['supp-pn-junction'],
    match: ['p-n junction', 'junction'],
    tip: 'The boundary between a p-type region and an n-type region in one semiconductor crystal. A diode is made from one.'
  },
  {
    cards: ['supp-pn-junction'],
    match: ['zero bias'],
    tip: 'No external voltage is applied across the junction.'
  },
  {
    cards: ['supp-pn-junction'],
    match: ['diffusion', 'diffuse'],
    tip: 'Net motion of particles from where they are more concentrated to where they are less concentrated, caused by random thermal motion.'
  },
  {
    cards: ['supp-pn-junction'],
    match: ['hole'],
    tip: 'A missing electron in the valence band of a semiconductor. It moves through the crystal and acts as a positive charge carrier.'
  },
  {
    cards: ['supp-pn-junction'],
    match: ['donor'],
    tip: 'An impurity atom that gives an electron to the crystal and stays behind as a fixed positive ion.'
  },
  {
    cards: ['supp-pn-junction'],
    match: ['acceptor'],
    tip: 'An impurity atom that takes an electron from the crystal and stays behind as a fixed negative ion.'
  },
  {
    cards: ['supp-pn-junction'],
    match: ['drift'],
    tip: 'Motion of charge carriers driven by an electric field, as opposed to diffusion.'
  },
  {
    cards: ['supp-pn-junction'],
    match: ['capacitor'],
    tip: 'Two layers of opposite charge facing each other. The field between them points from the positive layer to the negative layer.'
  },

  /* ——— supp-neutrino-oscillation: Neutrino flavor oscillation ——— */
  {
    cards: ['supp-neutrino-oscillation'],
    tex: ['\\nu_e', '\\nu_\\mu', '\\nu_\\tau'],
    tip: '$\\nu_e$, $\\nu_\\mu$, $\\nu_\\tau$: the electron, muon and tau neutrino, each named for the charged lepton ($e$, $\\mu$ or $\\tau$) it is produced with.'
  },
  {
    cards: ['supp-neutrino-oscillation'],
    tex: ['\\nu_1', '\\nu_2'],
    tip: '$\\nu_1$, $\\nu_2$: neutrino states of definite mass, $m_1$ and $m_2$.'
  },
  {
    cards: ['supp-neutrino-oscillation'],
    tex: ['e^{-iE_kt/\\hbar}'],
    tip: '$E_k$: the energy of mass state $k$. $t$: the time. $\\hbar$: the reduced Planck constant. A state of definite energy changes in time only by this phase factor.'
  },
  {
    cards: ['supp-neutrino-oscillation'],
    tex: ['m_1 \\ne m_2'],
    tip: '$m_1$, $m_2$: the masses of the mass states $\\nu_1$ and $\\nu_2$. $\\ne$: not equal to.'
  },
  {
    cards: ['supp-neutrino-oscillation'],
    tex: ['m_{\\nu_e} \\lt 0.45'],
    tip: '$m_{\\nu_e}$: the effective mass of the electron neutrino, measured from the tritium beta spectrum. The value $0.45\\ \\mathrm{eV}$ is an upper limit: the mass cannot exceed it at the stated confidence level.'
  },
  {
    cards: ['supp-neutrino-oscillation'],
    tex: ['\\nu'],
    tip: '$\\nu$: a neutrino of any flavor.'
  },
  {
    cards: ['supp-neutrino-oscillation'],
    tex: ['\\beta'],
    tip: '$\\beta$: beta decay; here its spectrum of electron energies.'
  },
  {
    cards: ['supp-neutrino-oscillation'],
    tex: ['+x', 'z'],
    tip: '$+x$, $z$: directions in space in the spin analogy: the spin starts along $+x$ and the magnetic field points along $z$.'
  },
  {
    cards: ['supp-neutrino-oscillation'],
    match: ['flavor'],
    tip: 'The type of a neutrino ($e$, $\\mu$ or $\\tau$), named by the charged lepton it is created with or creates when it is detected.'
  },
  {
    cards: ['supp-neutrino-oscillation'],
    match: ['oscillation'],
    tip: 'A periodic change. Here the probability of detecting each flavor rises and falls along the flight path.'
  },
  {
    cards: ['supp-neutrino-oscillation'],
    match: ['mass states', 'mass state'],
    tip: 'Neutrino states with a definite mass, written $\\nu_1$, $\\nu_2$, $\\nu_3$.'
  },
  {
    cards: ['supp-neutrino-oscillation'],
    match: ['decay kinematics'],
    tip: 'The energies and momenta of the particles in a decay, fixed by conservation of energy and momentum.'
  },
  {
    cards: ['supp-neutrino-oscillation'],
    match: ['energy eigenstates'],
    tip: 'States of definite energy. In time each one only gains a phase factor and keeps its form.'
  },
  {
    cards: ['supp-neutrino-oscillation'],
    match: ['endpoint'],
    tip: 'The highest electron energy in a beta-decay spectrum, reached when the neutrino carries away almost no kinetic energy.'
  },
  {
    cards: ['supp-neutrino-oscillation'],
    match: ['CL'],
    tip: 'Confidence level. A $90\\%$ CL upper limit is a value the true quantity lies below with $90\\%$ confidence.'
  },
  {
    cards: ['supp-neutrino-oscillation'],
    match: ['Standard Model'],
    tip: 'The established theory of the strong, weak and electromagnetic interactions and of the particles they act on.'
  },
  {
    cards: ['supp-neutrino-oscillation'],
    match: ['left-handed'],
    tip: 'For a massless particle: spin pointing opposite to the direction of motion.'
  },

  /* ——— supp-total-internal-reflection: Total internal reflection ——— */
  {
    cards: ['supp-total-internal-reflection'],
    tex: ['n_1'],
    tip: '$n_1$: the refractive index of the medium the light starts in.'
  },
  {
    cards: ['supp-total-internal-reflection'],
    tex: ['n_2'],
    tip: '$n_2$: the refractive index of the medium on the far side of the surface.'
  },
  {
    cards: ['supp-total-internal-reflection'],
    tex: ['\\theta_c', '\\theta_c \\approx 42^\\circ'],
    tip: '$\\theta_c$: the critical angle, an angle of incidence measured from the normal (the line perpendicular to the surface).'
  },
  {
    cards: ['supp-total-internal-reflection'],
    tex: ['v_1 \\lt v_2'],
    tip: '$v_1$: the wave speed in the starting medium. $v_2$: the wave speed in the far medium.'
  },
  {
    cards: ['supp-total-internal-reflection'],
    tex: ['\\sin\\theta_c = v_1/v_2'],
    tip: '$\\theta_c$: the critical angle. $v_1$, $v_2$: the wave speeds in the starting medium and in the far medium.'
  },
  {
    cards: ['supp-total-internal-reflection'],
    tex: ['n = 1.5'],
    tip: '$n$: the refractive index of the glass.'
  },
  {
    cards: ['supp-total-internal-reflection'],
    match: ['index'],
    tip: 'The refractive index $n$ of a medium: the speed of light in vacuum divided by the speed of light in the medium, $n = c/v$.'
  },
  {
    cards: ['supp-total-internal-reflection'],
    match: ['angle of incidence'],
    tip: 'The angle between the incoming ray and the normal, the line perpendicular to the surface.'
  },
  {
    cards: ['supp-total-internal-reflection'],
    match: ['total internal reflection', 'totally reflected'],
    tip: 'All of the light is reflected at the surface, and none is transmitted into the second medium.'
  },

  /* ——— supp-reservoir-entropy: Entropy of irreversible heat flow ——— */
  {
    cards: ['supp-reservoir-entropy'],
    tex: ['Q'],
    tip: '$Q$: the amount of heat that flows from the hot reservoir to the cold one.'
  },
  {
    cards: ['supp-reservoir-entropy'],
    tex: ['T_1', 'T_2'],
    tip: '$T_1$, $T_2$: the starting temperatures of the two equal masses of water.'
  },
  {
    cards: ['supp-reservoir-entropy'],
    tex: ['m'],
    tip: '$m$: the mass of each water sample.'
  },
  {
    cards: ['supp-reservoir-entropy'],
    tex: ['T_f = (T_1 + T_2)/2'],
    tip: '$T_f$: the final common temperature of the mixed water. $T_1$, $T_2$: the starting temperatures.'
  },
  {
    cards: ['supp-reservoir-entropy'],
    tex: ['\\Delta S = mc\\ln\\dfrac{T_f^2}{T_1T_2} \\gt 0'],
    tip: '$\\Delta S$: the total entropy change of the water. $m$: the mass of each sample. $c$: the specific heat of water. $T_f$: the final temperature. $T_1$, $T_2$: the starting temperatures.'
  },
  {
    cards: ['supp-reservoir-entropy'],
    match: ['total entropy change'],
    tip: 'The entropy change of the hot reservoir plus that of the cold reservoir: the change for the whole isolated system.'
  },
  {
    cards: ['supp-reservoir-entropy'],
    match: ['arithmetic mean'],
    tip: 'For two numbers $a$ and $b$: $(a + b)/2$.'
  },
  {
    cards: ['supp-reservoir-entropy'],
    match: ['geometric mean'],
    tip: 'For two positive numbers $a$ and $b$: $\\sqrt{ab}$.'
  },

  /* ——— supp-helmholtz-from-z: Helmholtz free energy from the partition function ——— */
  {
    cards: ['supp-helmholtz-from-z', 'supp-free-energy-minimum'],
    tex: ['F'],
    tip: '$F$: the Helmholtz free energy of the system, an energy-like state function used when the temperature and the volume are held fixed.'
  },
  {
    cards: ['supp-helmholtz-from-z', 'supp-oscillator-partition'],
    tex: ['Z'],
    tip: '$Z$: the partition function, the sum of the Boltzmann factors $e^{-E_s/k_BT}$ over all states $s$ of the system, where $E_s$ is the energy of state $s$ and $k_B$ is the Boltzmann constant.'
  },
  {
    cards: ['supp-helmholtz-from-z', 'supp-oscillator-partition'],
    match: ['partition function'],
    tip: 'The sum of the Boltzmann factors $e^{-E_s/k_BT}$ over all states $s$ of a system in contact with a heat bath at temperature $T$. Dividing one state\'s factor by it gives that state\'s probability.'
  },
  {
    cards: ['supp-helmholtz-from-z'],
    tex: ['\\Omega'],
    tip: '$\\Omega$: the number of microstates, here the number of states that all have energy $E$.'
  },
  {
    cards: ['supp-helmholtz-from-z'],
    tex: ['E'],
    tip: '$E$: the energy shared by all $\\Omega$ states in the quick check.'
  },
  {
    cards: ['supp-helmholtz-from-z'],
    tex: ['Z = \\Omega e^{-\\beta E}'],
    tip: '$Z$: the partition function. $\\Omega$: the number of states. $\\beta = 1/k_BT$, with $k_B$ the Boltzmann constant. $E$: the common energy of the states.'
  },
  {
    cards: ['supp-helmholtz-from-z'],
    tex: ['-k_BT\\ln Z = E - k_BT\\ln\\Omega = E - TS'],
    tip: '$k_B$: the Boltzmann constant. $T$: the temperature. $Z$: the partition function. $\\Omega$: the number of states. $S = k_B\\ln\\Omega$: the Boltzmann entropy.'
  },
  {
    cards: ['supp-helmholtz-from-z'],
    tex: ['dF = -S\\,dT - P\\,dV'],
    tip: '$dF$, $dT$, $dV$: small changes of the free energy, the temperature and the volume. $S$: the entropy. $P$: the pressure.'
  },
  {
    cards: ['supp-helmholtz-from-z'],
    tex: ['S = -(\\partial F/\\partial T)_V'],
    tip: '$\\partial F/\\partial T$: the partial derivative of $F$ with respect to $T$. The subscript $V$ means the volume is held fixed.'
  },
  {
    cards: ['supp-helmholtz-from-z'],
    tex: ['P = -(\\partial F/\\partial V)_T = k_BT\\,\\partial\\ln Z/\\partial V'],
    tip: '$\\partial F/\\partial V$: the partial derivative of $F$ with respect to $V$ at fixed $T$. $k_B$: the Boltzmann constant. $\\ln Z$: the natural logarithm of the partition function.'
  },
  {
    cards: ['supp-helmholtz-from-z'],
    tex: ['Z \\propto V^N'],
    tip: '$N$: the number of particles. $\\propto$: proportional to. Each particle of an ideal gas contributes one factor of the volume $V$.'
  },
  {
    cards: ['supp-helmholtz-from-z'],
    tex: ['P = Nk_BT/V'],
    tip: '$P$: the pressure. $N$: the number of particles. $k_B$: the Boltzmann constant. $T$: the temperature. $V$: the volume.'
  },
  {
    cards: ['supp-helmholtz-from-z'],
    tex: ['A'],
    tip: '$A$: Kahn\'s symbol for the Helmholtz free energy, the quantity this card calls $F$.'
  },
  {
    cards: ['supp-helmholtz-from-z'],
    match: ['canonical ensemble'],
    tip: 'The collection of all states of a system kept at fixed temperature by contact with a large heat bath, with fixed volume and particle number. A state of energy $E_s$ has probability proportional to $e^{-E_s/k_BT}$.'
  },
  {
    cards: ['supp-helmholtz-from-z'],
    match: ['Helmholtz free energy'],
    tip: 'The state function $F = U - TS$, where $U$ is the internal energy, $T$ the temperature and $S$ the entropy.'
  },

  /* ——— supp-free-energy-minimum: Free energy minimum: energy against entropy ——— */
  {
    cards: ['supp-free-energy-minimum'],
    tex: ['F \\approx U'],
    tip: '$F$: the free energy. $U$: the internal energy. $\\approx$: approximately equal to.'
  },
  {
    cards: ['supp-free-energy-minimum'],
    tex: ['F \\approx -TS'],
    tip: '$F$: the free energy. $T$: the temperature. $S$: the entropy of the system.'
  },
  {
    cards: ['supp-free-energy-minimum'],
    tex: ['\\Delta U/T'],
    tip: '$\\Delta U$: the energy the system takes from the reservoir. $T$: the reservoir temperature.'
  },
  {
    cards: ['supp-free-energy-minimum'],
    tex: ['-\\Delta F'],
    tip: '$\\Delta F$: the change in the free energy of the gas, so $-\\Delta F$ is its decrease.'
  },
  {
    cards: ['supp-free-energy-minimum'],
    match: ['free energy'],
    tip: 'Here the Helmholtz free energy $F$, a state function for a system held at fixed temperature and volume.'
  },
  {
    cards: ['supp-free-energy-minimum'],
    match: ['total entropy'],
    tip: 'The entropy of the system plus the entropy of the reservoir.'
  },
  {
    cards: ['supp-free-energy-minimum'],
    match: ['ground state'],
    tip: 'The state of lowest energy.'
  },
  {
    cards: ['supp-free-energy-minimum'],
    match: ['maximum work'],
    tip: 'The largest work a system can deliver in a process at constant temperature. A reversible process delivers it.'
  },

  /* ——— supp-two-level-populations: Two-level system populations ——— */
  {
    cards: ['supp-two-level-populations', 'supp-oscillator-partition'],
    tex: ['T \\to 0'],
    tip: '$T \\to 0$: the temperature approaches absolute zero.'
  },
  {
    cards: ['supp-two-level-populations', 'supp-oscillator-partition'],
    tex: ['T \\to \\infty'],
    tip: '$T \\to \\infty$: the temperature grows without limit.'
  },
  {
    cards: ['supp-two-level-populations'],
    tex: ['\\Delta E'],
    tip: '$\\Delta E$: the energy of the upper level minus the energy of the lower level.'
  },
  {
    cards: ['supp-two-level-populations'],
    tex: ['g_1'],
    tip: '$g_1$: the degeneracy of the lower level, the number of distinct states with that energy.'
  },
  {
    cards: ['supp-two-level-populations'],
    tex: ['g_2'],
    tip: '$g_2$: the degeneracy of the upper level, the number of distinct states with that energy.'
  },
  {
    cards: ['supp-two-level-populations'],
    tex: ['g_2/g_1'],
    tip: '$g_2/g_1$: the degeneracy of the upper level divided by the degeneracy of the lower level.'
  },
  {
    cards: ['supp-two-level-populations'],
    tex: ['\\langle E\\rangle = \\Delta E/(e^{\\Delta E/k_BT} + 1)'],
    tip: '$\\langle E\\rangle$: the mean energy of the system. $\\Delta E$: the energy of the upper level, with the lower level at $0$. $k_B$: the Boltzmann constant. $T$: the temperature.'
  },
  {
    cards: ['supp-two-level-populations'],
    match: ['degeneracies'],
    tip: 'The number of distinct quantum states that share one energy level.'
  },
  {
    cards: ['supp-two-level-populations'],
    match: ['population ratio'],
    tip: 'The number of systems in the upper level divided by the number in the lower level.'
  },
  {
    cards: ['supp-two-level-populations'],
    match: ['population inversion'],
    tip: 'More systems per state in the upper level than in the lower one: $N_2/g_2 \\gt N_1/g_1$. A laser needs it.'
  },
  {
    cards: ['supp-two-level-populations'],
    match: ['nondegenerate'],
    tip: 'Each level holds a single state, $g = 1$.'
  },
  {
    cards: ['supp-two-level-populations'],
    match: ['Boltzmann factor'],
    tip: 'The factor $e^{-E/k_BT}$ that sets the relative probability of a single state of energy $E$ at temperature $T$.'
  },

  /* ——— supp-oscillator-partition: Quantum oscillator partition function ——— */
  {
    cards: ['supp-oscillator-partition'],
    tex: ['E_n = \\left(n+\\tfrac{1}{2}\\right)\\hbar\\omega'],
    tip: '$E_n$: the energy of level $n$, with $n = 0, 1, 2, \\ldots$. $\\hbar$: the reduced Planck constant. $\\omega$: the angular frequency of the oscillator.'
  },
  {
    cards: ['supp-oscillator-partition'],
    tex: ['x = \\hbar\\omega/k_BT'],
    tip: '$x$: the level spacing $\\hbar\\omega$ divided by the thermal energy $k_BT$. $k_B$: the Boltzmann constant. $T$: the temperature.'
  },
  {
    cards: ['supp-oscillator-partition'],
    tex: ['e^{-x/2}'],
    tip: '$e^{-x/2}$: the Boltzmann factor of the ground state, whose energy is $\\tfrac{1}{2}\\hbar\\omega$.'
  },
  {
    cards: ['supp-oscillator-partition'],
    tex: ['\\sum_{n=0}^{\\infty} e^{-nx} = \\dfrac{1}{1 - e^{-x}}'],
    tip: '$\\sum_{n=0}^{\\infty}$: the sum over all levels $n = 0, 1, 2, \\ldots$. $e^{-nx}$: the Boltzmann factor of level $n$ measured from the ground state.'
  },
  {
    cards: ['supp-oscillator-partition'],
    tex: ['\\sum_{n=0}^{\\infty} r^n = \\dfrac{1}{1 - r}'],
    tip: '$r$: the common ratio of the geometric series; each term is $r$ times the one before.'
  },
  {
    cards: ['supp-oscillator-partition'],
    tex: ['|r| \\lt 1'],
    tip: '$|r|$: the absolute value of the common ratio $r$.'
  },
  {
    cards: ['supp-oscillator-partition'],
    tex: ['r = e^{-x}'],
    tip: '$r$: the ratio between the Boltzmann factors of two neighboring oscillator levels.'
  },
  {
    cards: ['supp-oscillator-partition'],
    tex: ['Z \\to e^{-x/2}', 'Z \\to k_BT/\\hbar\\omega'],
    tip: '$Z$: the partition function. $x = \\hbar\\omega/k_BT$. $k_BT$: the thermal energy. $\\hbar\\omega$: the level spacing. The arrow gives the value $Z$ approaches in the limit.'
  },
  {
    cards: ['supp-oscillator-partition'],
    tex: ['n = 0'],
    tip: '$n$: the level number; $n = 0$ is the ground state.'
  },
  {
    cards: ['supp-oscillator-partition'],
    tex: ['1/(e^{x} \\pm 1)'],
    tip: '$x$: the energy of a state divided by $k_BT$ (measured from the chemical potential). $\\pm$: plus for fermions (Fermi–Dirac), minus for bosons (Bose–Einstein).'
  },
  {
    cards: ['supp-oscillator-partition'],
    match: ['harmonic oscillator'],
    tip: 'A system whose potential energy grows as the square of the displacement from equilibrium, so the restoring force is proportional to the displacement.'
  },
  {
    cards: ['supp-oscillator-partition'],
    match: ['geometric series'],
    tip: 'A sum $1 + r + r^2 + \\cdots$ in which each term is the previous one times a fixed ratio $r$.'
  },
  {
    cards: ['supp-oscillator-partition'],
    match: ['mean occupation number'],
    tip: 'The average number of particles (or quanta) in one state at temperature $T$.'
  },
  {
    cards: ['supp-oscillator-partition'],
    match: ['ground-state factor'],
    tip: 'The factor that comes from the zero-point energy $\\tfrac{1}{2}\\hbar\\omega$, which every level contains.'
  },

  /* ——— supp-battery-internal-resistance: Battery internal resistance and maximum load power ——— */
  {
    cards: ['supp-battery-internal-resistance'],
    tex: ['\\mathcal{E}'],
    tip: '$\\mathcal{E}$: the emf (electromotive force) of the battery, the work it does on each unit of charge that passes through it.'
  },
  {
    cards: ['supp-battery-internal-resistance'],
    tex: ['r'],
    tip: '$r$: the internal resistance of the battery.'
  },
  {
    cards: ['supp-battery-internal-resistance'],
    tex: ['R'],
    tip: '$R$: the resistance of the load resistor.'
  },
  {
    cards: ['supp-battery-internal-resistance'],
    tex: ['R = r'],
    tip: '$R$: the load resistance. $r$: the internal resistance of the battery.'
  },
  {
    cards: ['supp-battery-internal-resistance'],
    tex: ['I = 0'],
    tip: '$I$: the current through the battery and the load.'
  },
  {
    cards: ['supp-battery-internal-resistance'],
    tex: ['P = I^2R = \\mathcal{E}^2R/(R + r)^2'],
    tip: '$P$: the power delivered to the load. $I$: the current. $R$: the load resistance. $\\mathcal{E}$: the emf. $r$: the internal resistance.'
  },
  {
    cards: ['supp-battery-internal-resistance'],
    tex: ['P_{\\max} = \\mathcal{E}^2/(4r)'],
    tip: '$P_{\\max}$: the largest load power over all choices of $R$. $\\mathcal{E}$: the emf. $r$: the internal resistance.'
  },
  {
    cards: ['supp-battery-internal-resistance'],
    tex: ['V = IR'],
    tip: 'Ohm\'s law. $V$: the voltage across a resistor. $I$: the current through it. $R$: its resistance.'
  },
  {
    cards: ['supp-battery-internal-resistance'],
    match: ['emf'],
    tip: 'Electromotive force: the work the battery does on each unit of charge that passes through it, measured in volts.'
  },
  {
    cards: ['supp-battery-internal-resistance'],
    match: ['internal resistance'],
    tip: 'The resistance of the battery\'s own materials.'
  },
  {
    cards: ['supp-battery-internal-resistance'],
    match: ['terminal voltage'],
    tip: 'The voltage between the two terminals of the battery, measured while current flows.'
  },
  {
    cards: ['supp-battery-internal-resistance'],
    match: ['load resistor', 'load'],
    tip: 'The external resistor that the battery drives and that uses the delivered power.'
  },

  /* ——— supp-kirchhoff-rules: Kirchhoff's rules and resistor power ——— */
  {
    cards: ['supp-kirchhoff-rules'],
    tex: ['V'],
    tip: '$V$: the electric potential (voltage) at a point of the circuit.'
  },
  {
    cards: ['supp-kirchhoff-rules'],
    tex: ['+\\mathcal{E}'],
    tip: '$\\mathcal{E}$: the emf of the battery. The sign gives the direction of the potential change across it.'
  },
  {
    cards: ['supp-kirchhoff-rules'],
    tex: ['IR'],
    tip: '$I$: the current through the resistor. $R$: its resistance.'
  },
  {
    cards: ['supp-kirchhoff-rules'],
    tex: ['P = IV = I^2R = V^2/R'],
    tip: '$P$: the power dissipated in the resistor. $I$: the current through it. $V$: the voltage across it. $R$: its resistance.'
  },
  {
    cards: ['supp-kirchhoff-rules'],
    match: ['Kirchhoff'],
    tip: 'Gustav Kirchhoff, who stated two rules for the currents and voltages in a circuit in 1845.'
  },
  {
    cards: ['supp-kirchhoff-rules'],
    match: ['junction'],
    tip: 'A point in a circuit where three or more wires meet, also called a node.'
  },
  {
    cards: ['supp-kirchhoff-rules'],
    match: ['loop'],
    tip: 'Any closed path through the circuit that returns to its starting point.'
  },
  {
    cards: ['supp-kirchhoff-rules'],
    match: ['single-valued'],
    tip: 'Having exactly one value at each point of the circuit.'
  },
  {
    cards: ['supp-kirchhoff-rules'],
    match: ['dissipate'],
    tip: 'To turn electrical energy into heat.'
  },
  {
    cards: ['supp-kirchhoff-rules'],
    match: ['conservation law'],
    tip: 'A law stating that some quantity keeps the same total value in every process of an isolated system.'
  },

  /* ——— supp-impulse-power: Impulse and mechanical power ——— */
  {
    cards: ['supp-impulse-power'],
    tex: ['F'],
    tip: '$F$: the force acting on the body.'
  },
  {
    cards: ['supp-impulse-power'],
    tex: ['t'],
    tip: '$t$: the time.'
  },
  {
    cards: ['supp-impulse-power'],
    tex: ['\\mathbf{F}'],
    tip: '$\\mathbf{F}$: the force acting on the body, as a vector.'
  },
  {
    cards: ['supp-impulse-power'],
    tex: ['\\mathbf{v}'],
    tip: '$\\mathbf{v}$: the velocity of the body, as a vector.'
  },
  {
    cards: ['supp-impulse-power'],
    tex: ['F(t)'],
    tip: '$F(t)$: the force as a function of the time $t$.'
  },
  {
    cards: ['supp-impulse-power'],
    tex: ['\\Delta p'],
    tip: '$\\Delta p$: the change in the momentum of the body.'
  },
  {
    cards: ['supp-impulse-power'],
    tex: ['a = P/(mv)'],
    tip: '$a$: the acceleration of the car. $P$: the engine power. $m$: the mass of the car. $v$: its speed.'
  },
  {
    cards: ['supp-impulse-power'],
    tex: ['P = F_{\\rm drag}v'],
    tip: '$P$: the engine power. $F_{\\rm drag}$: the drag force. $v$: the speed.'
  },
  {
    cards: ['supp-impulse-power'],
    match: ['impulse'],
    tip: 'A vector quantity that measures the push a force gives over a time interval, in newton-seconds ($\\mathrm{N\\,s}$).'
  },
  {
    cards: ['supp-impulse-power'],
    match: ['instantaneous power'],
    tip: 'The power at one moment, not averaged over a time interval.'
  },
  {
    cards: ['supp-impulse-power'],
    match: ['drag'],
    tip: 'A force from the air or another fluid that opposes the motion and grows with speed.'
  },
  {
    cards: ['supp-impulse-power'],
    match: ['top speed'],
    tip: 'The largest speed the car reaches, where its speed stops rising.'
  },
  {
    cards: ['supp-impulse-power'],
    match: ['average force'],
    tip: 'The constant force that would give the same impulse over the same time interval.'
  },

  /* ——— supp-rutherford-scattering: Rutherford scattering and the nucleus ——— */
  {
    cards: ['supp-rutherford-scattering'],
    tex: ['ze'],
    tip: '$z$: the charge number of the projectile. $e$: the elementary charge, $1.6\\times 10^{-19}\\ \\mathrm{C}$.'
  },
  {
    cards: ['supp-rutherford-scattering'],
    tex: ['E_k'],
    tip: '$E_k$: the kinetic energy of the projectile before the collision.'
  },
  {
    cards: ['supp-rutherford-scattering'],
    tex: ['\\alpha'],
    tip: '$\\alpha$: an alpha particle, a helium-4 nucleus.'
  },
  {
    cards: ['supp-rutherford-scattering'],
    tex: ['z = 2'],
    tip: '$z$: the charge number of the projectile. An alpha particle carries charge $+2e$.'
  },
  {
    cards: ['supp-rutherford-scattering'],
    tex: ['Ze'],
    tip: '$Z$: the atomic number of the target nucleus. $e$: the elementary charge.'
  },
  {
    cards: ['supp-rutherford-scattering'],
    tex: ['d\\sigma/d\\Omega'],
    tip: '$d\\sigma/d\\Omega$: the differential cross-section, the effective target area per unit solid angle for scattering into the direction at angle $\\theta$.'
  },
  {
    cards: ['supp-rutherford-scattering'],
    tex: ['\\theta'],
    tip: '$\\theta$: the scattering angle, between the directions of the projectile before and after the collision.'
  },
  {
    cards: ['supp-rutherford-scattering'],
    match: ['Rutherford scattering'],
    tip: 'Elastic scattering of a charged particle by the Coulomb field of a nucleus.'
  },
  {
    cards: ['supp-rutherford-scattering'],
    match: ['gold-foil'],
    tip: 'The experiment of Geiger and Marsden under Rutherford (1909): alpha particles from a radioactive source were aimed at a thin gold foil, and their deflections were counted.'
  },
  {
    cards: ['supp-rutherford-scattering'],
    match: ['scattering angle'],
    tip: 'The angle between the projectile\'s direction before and after the collision.'
  },
  {
    cards: ['supp-rutherford-scattering'],
    match: ['cross-section'],
    tip: 'An effective target area: the rate of scattering events divided by the incident flux.'
  },
  {
    cards: ['supp-rutherford-scattering'],
    match: ['spread-out charge'],
    tip: 'A positive charge distributed through the whole volume of the atom, as in Thomson\'s model.'
  },

  /* ——— supp-magnetic-materials: Diamagnetic, paramagnetic, ferromagnetic cores (supplemental list) ——— */
  {
    cards: ['supp-magnetic-materials'],
    tex: ['B = \\mu_r\\mu_0 nI'],
    tip: '$B$: the magnetic field inside the solenoid. $\\mu_r$: the relative permeability of the core. $\\mu_0$: the permeability of free space. $n$: the number of turns per unit length. $I$: the current.'
  },
  {
    cards: ['supp-magnetic-materials'],
    tex: ['\\mu_r = 1 + \\chi_m'],
    tip: '$\\mu_r$: the relative permeability of the core. $\\chi_m$: the magnetic susceptibility of the core material.'
  },
  {
    cards: ['supp-magnetic-materials'],
    tex: ['\\chi_m', '\\chi_m \\lt 0', '\\chi_m \\gt 0', '\\chi_m \\gg 1'],
    tip: '$\\chi_m$: the magnetic susceptibility, the magnetization $M$ produced per unit applied field $H$: $M = \\chi_m H$.'
  },
  {
    cards: ['supp-magnetic-materials'],
    tex: ['B'],
    tip: '$B$: the magnetic field inside the solenoid.'
  },
  {
    cards: ['supp-magnetic-materials'],
    tex: ['\\mu_r'],
    tip: '$\\mu_r$: the relative permeability of the core, its permeability $\\mu$ divided by $\\mu_0$.'
  },
  {
    cards: ['supp-magnetic-materials'],
    match: ['solenoid'],
    tip: 'A long coil of wire wound as a helix. A current in it makes a nearly uniform magnetic field inside.'
  },
  {
    cards: ['supp-magnetic-materials'],
    match: ['core'],
    tip: 'The material that fills the inside of the solenoid.'
  },
  {
    cards: ['supp-magnetic-materials'],
    match: ['diamagnetic'],
    tip: 'Describes a material in which all electron spins and orbits are paired, so its atoms carry no net magnetic moment of their own.'
  },
  {
    cards: ['supp-magnetic-materials'],
    match: ['paramagnetic'],
    tip: 'Describes a material whose atoms each carry a permanent magnetic moment, with negligible coupling between neighboring moments.'
  },
  {
    cards: ['supp-magnetic-materials'],
    match: ['ferromagnetic'],
    tip: 'Describes a material, such as iron, in which neighboring atomic moments are strongly coupled to point the same way (below the Curie temperature).'
  },
  {
    cards: ['supp-magnetic-materials'],
    match: ['exchange coupling'],
    tip: 'A quantum-mechanical interaction between neighboring electron spins, from the Pauli principle together with the Coulomb repulsion. In a ferromagnet it favors parallel spins.'
  },
  {
    cards: ['supp-magnetic-materials'],
    match: ['domain'],
    tip: 'A region of a ferromagnet in which all the atomic moments point the same way.'
  },
  {
    cards: ['supp-magnetic-materials'],
    match: ['Lenz\'s law'],
    tip: 'An induced current or moment opposes the change of magnetic flux that produces it.'
  },
  {
    cards: ['supp-magnetic-materials'],
    match: ['superconductor'],
    tip: 'A material that, below a critical temperature, has zero electrical resistance and expels magnetic field from its interior.'
  },
  {
    cards: ['supp-magnetic-materials'],
    match: ['unpaired electrons'],
    tip: 'Electrons whose spin is not cancelled by a partner of opposite spin in the same orbital.'
  },

  /* ——— supp-charge-integral-origin: Where to put the origin in a charge-distribution integral ——— */
  {
    cards: ['supp-charge-integral-origin'],
    tex: ['dE'],
    tip: '$dE$: the electric field produced by one small piece of the charged body.'
  },
  {
    cards: ['supp-charge-integral-origin'],
    tex: ['dV'],
    tip: '$dV$: the electric potential produced by one small piece of the charged body.'
  },
  {
    cards: ['supp-charge-integral-origin'],
    tex: ['E(\\mathbf{r})'],
    tip: '$E(\\mathbf{r})$: the electric field at the position $\\mathbf{r}$.'
  },
  {
    cards: ['supp-charge-integral-origin'],
    tex: ['\\mathbf{r}'],
    tip: '$\\mathbf{r}$: the position vector of the field point.'
  },
  {
    cards: ['supp-charge-integral-origin'],
    tex: ['dq = \\lambda\\,dx'],
    tip: '$dq$: the charge of one small element of the rod. $\\lambda$: the charge per unit length. $dx$: the length of the element.'
  },
  {
    cards: ['supp-charge-integral-origin'],
    tex: ['x'],
    tip: '$x$: the integration variable, the position of a rod element along the rod\'s line.'
  },
  {
    cards: ['supp-charge-integral-origin'],
    tex: ['E_z = \\dfrac{kQz}{(z^2+R^2)^{3/2}}'],
    tip: '$E_z$: the field component along the ring\'s axis. $k = 1/(4\\pi\\varepsilon_0)$: the Coulomb constant. $Q$: the total charge of the ring. $z$: the distance along the axis from the ring\'s center. $R$: the radius of the ring.'
  },
  {
    cards: ['supp-charge-integral-origin'],
    match: ['field point'],
    tip: 'The point where you want the field or the potential, as opposed to the points of the charged body (the source points).'
  },
  {
    cards: ['supp-charge-integral-origin'],
    match: ['extension line'],
    tip: 'The straight line that continues the rod beyond its ends.'
  },
  {
    cards: ['supp-charge-integral-origin'],
    match: ['center of symmetry'],
    tip: 'The point about which the body looks the same after its symmetry operations, such as the center of a ring or a sphere.'
  },
  {
    cards: ['supp-charge-integral-origin'],
    match: ['transverse components'],
    tip: 'The parts of the field perpendicular to the symmetry axis.'
  },
  {
    cards: ['supp-charge-integral-origin'],
    match: ['charge-distribution integral'],
    tip: 'The field or the potential written as a sum over small pieces $dq$ of the charge, taken in the limit as an integral.'
  }
);
