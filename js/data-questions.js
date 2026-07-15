/* Preview question bank — 20 placeholder questions spanning all 9 topics.
   These stand in until the real content from "Conquering the Physics GRE"
   markdown is imported (see docs/Project Docs/DESIGN.md → Content pipeline).
   Format: id, topic, difficulty 1–3; q/choices/sol are HTML strings in which
   ALL math is LaTeX inside $...$ (typeset offline by KaTeX at render time).
   answer is the 0-based index of the correct choice. GRE style: 5 choices. */
window.PGRE = window.PGRE || {};

PGRE.QUESTIONS = [
  // ——— Classical Mechanics (4) ———
  {
    id: 'q01', topic: 'cm', difficulty: 2,
    q: 'A particle moves at constant speed $v$ around a circle of radius $R$. What is the magnitude of its <strong>average</strong> acceleration over half a revolution?',
    choices: ['$v^2/R$', '$2v^2/(\\pi R)$', '$\\pi v^2/R$', '$v^2/(2R)$', '$0$'],
    answer: 1,
    sol: 'Over half a revolution the velocity reverses direction, so $|\\Delta\\vec{v}| = 2v$. The elapsed time is half the period, $\\Delta t = \\pi R/v$. Thus $|\\vec{a}_{\\mathrm{avg}}| = \\dfrac{2v}{\\pi R/v} = \\dfrac{2v^2}{\\pi R}$. Note this differs from the instantaneous value $v^2/R$.'
  },
  {
    id: 'q02', topic: 'cm', difficulty: 1,
    q: 'A system has Lagrangian $L = \\tfrac{1}{2}m\\dot{x}^2 - \\tfrac{1}{2}kx^2$. The period of its motion is',
    choices: ['$2\\pi\\sqrt{k/m}$', '$\\pi\\sqrt{m/k}$', '$2\\pi\\sqrt{m/k}$', '$\\sqrt{m/k}$', '$2\\pi m/k$'],
    answer: 2,
    sol: 'The Euler–Lagrange equation gives $m\\ddot{x} = -kx$, simple harmonic motion with $\\omega = \\sqrt{k/m}$, so $T = \\dfrac{2\\pi}{\\omega} = 2\\pi\\sqrt{m/k}$.'
  },
  {
    id: 'q03', topic: 'cm', difficulty: 1,
    q: 'A satellite in a circular orbit of radius $r$ has period $T$. If it is moved to a circular orbit of radius $4r$, its new period is',
    choices: ['$2T$', '$4T$', '$8T$', '$16T$', '$64T$'],
    answer: 2,
    sol: "Kepler's third law: $T^2 \\propto r^3$. Scaling $r \\to 4r$ gives $T' = T \\cdot 4^{3/2} = 8T$."
  },
  {
    id: 'q04', topic: 'cm', difficulty: 1,
    q: 'An iceberg of density $917\\ \\mathrm{kg/m^3}$ floats in sea water of density $1025\\ \\mathrm{kg/m^3}$. Approximately what fraction of its volume is submerged?',
    choices: ['$11\\%$', '$50\\%$', '$75\\%$', '$89\\%$', '$92\\%$'],
    answer: 3,
    sol: 'Buoyancy: $\\rho_{\\mathrm{ice}} V g = \\rho_{\\mathrm{sea}} V_{\\mathrm{sub}} g$, so $\\dfrac{V_{\\mathrm{sub}}}{V} = \\dfrac{\\rho_{\\mathrm{ice}}}{\\rho_{\\mathrm{sea}}} = \\dfrac{917}{1025} \\approx 0.89$.'
  },

  // ——— Electromagnetism (4) ———
  {
    id: 'q05', topic: 'em', difficulty: 2,
    q: 'A parallel-plate capacitor remains connected to a battery of fixed voltage while a dielectric of constant $\\kappa$ is inserted, filling the gap. The stored energy',
    choices: ['decreases by a factor $\\kappa$', 'is unchanged', 'increases by a factor $\\kappa$', 'increases by a factor $\\kappa^2$', 'decreases by a factor $\\kappa^2$'],
    answer: 2,
    sol: 'With the battery connected, $V$ is fixed and $C \\to \\kappa C$. Then $U = \\tfrac{1}{2}CV^2 \\to \\tfrac{1}{2}(\\kappa C)V^2 = \\kappa U$. (Had the capacitor been isolated, $Q$ fixed, the energy would <em>drop</em> by $\\kappa$: $U = Q^2/2C$.)'
  },
  {
    id: 'q06', topic: 'em', difficulty: 1,
    q: 'A point charge $q$ sits at the center of a cube. The electric flux through one face of the cube is',
    choices: ['$q/\\varepsilon_0$', '$q/(2\\varepsilon_0)$', '$q/(4\\varepsilon_0)$', '$q/(6\\varepsilon_0)$', '$q/(8\\varepsilon_0)$'],
    answer: 3,
    sol: "Gauss's law gives total flux $\\Phi = q/\\varepsilon_0$ through the closed surface; by symmetry each of the 6 faces carries an equal share: $\\Phi_{\\mathrm{face}} = \\dfrac{q}{6\\varepsilon_0}$."
  },
  {
    id: 'q07', topic: 'em', difficulty: 2,
    q: 'An initially uncharged capacitor charges through a resistor from a battery. After one time constant $\\tau = RC$, the charge on the capacitor is closest to what fraction of its final value?',
    choices: ['$25\\%$', '$37\\%$', '$50\\%$', '$63\\%$', '$75\\%$'],
    answer: 3,
    sol: '$q(t) = Q_f\\left(1 - e^{-t/\\tau}\\right)$. At $t = \\tau$: $1 - e^{-1} \\approx 1 - 0.368 = 0.632 \\approx 63\\%$.'
  },
  {
    id: 'q08', topic: 'em', difficulty: 1,
    q: 'In a plane electromagnetic wave in vacuum, the ratio of the magnitudes of the electric and magnetic fields, $|\\vec{E}|/|\\vec{B}|$, equals',
    choices: ['$1$', '$c$', '$1/c$', '$c^2$', '$\\mu_0\\varepsilon_0$'],
    answer: 1,
    sol: "From Maxwell's equations for a plane wave, $E = cB$, and $\\vec{E} \\times \\vec{B}$ points along the propagation direction."
  },

  // ——— Optics & Wave Phenomena (2) ———
  {
    id: 'q09', topic: 'ow', difficulty: 2,
    q: 'Light of wavelength $500\\ \\mathrm{nm}$ passes through two slits separated by $0.1\\ \\mathrm{mm}$. On a screen $2\\ \\mathrm{m}$ away, the spacing between adjacent bright fringes is',
    choices: ['$0.1\\ \\mathrm{cm}$', '$0.5\\ \\mathrm{cm}$', '$1\\ \\mathrm{cm}$', '$2\\ \\mathrm{cm}$', '$5\\ \\mathrm{cm}$'],
    answer: 2,
    sol: '$\\Delta y = \\dfrac{\\lambda L}{d} = \\dfrac{(500 \\times 10^{-9}\\ \\mathrm{m})(2\\ \\mathrm{m})}{1 \\times 10^{-4}\\ \\mathrm{m}} = 1 \\times 10^{-2}\\ \\mathrm{m} = 1\\ \\mathrm{cm}$.'
  },
  {
    id: 'q10', topic: 'ow', difficulty: 2,
    q: 'Unpolarized light in air reflects off a glass surface ($n = 1.5$). The reflected beam is completely polarized when the angle of incidence is closest to',
    choices: ['$34^\\circ$', '$42^\\circ$', '$49^\\circ$', '$56^\\circ$', '$90^\\circ$'],
    answer: 3,
    sol: "Brewster's angle: $\\tan\\theta_B = \\dfrac{n_2}{n_1} = 1.5$, so $\\theta_B = \\arctan(1.5) \\approx 56.3^\\circ$. At this angle the reflected light is polarized perpendicular to the plane of incidence."
  },

  // ——— Thermodynamics & Statistical Mechanics (2) ———
  {
    id: 'q11', topic: 'th', difficulty: 1,
    q: 'A Carnot engine operates between reservoirs at $600\\ \\mathrm{K}$ and $300\\ \\mathrm{K}$. Its efficiency is',
    choices: ['$25\\%$', '$33\\%$', '$50\\%$', '$67\\%$', '$100\\%$'],
    answer: 2,
    sol: '$\\eta = 1 - \\dfrac{T_c}{T_h} = 1 - \\dfrac{300}{600} = 0.5 = 50\\%$. This is the maximum efficiency of any engine between these temperatures.'
  },
  {
    id: 'q12', topic: 'th', difficulty: 2,
    q: 'For an ideal diatomic gas (rotating but not vibrating), the molar heat capacity at constant volume is',
    choices: ['$\\tfrac{1}{2}R$', '$R$', '$\\tfrac{3}{2}R$', '$\\tfrac{5}{2}R$', '$\\tfrac{7}{2}R$'],
    answer: 3,
    sol: 'Equipartition: 3 translational + 2 rotational quadratic degrees of freedom, each contributing $\\tfrac{1}{2}R$ per mole: $C_V = \\tfrac{5}{2}R$. (Vibration would add 2 more at high temperature, giving $\\tfrac{7}{2}R$.)'
  },

  // ——— Quantum Mechanics (3) ———
  {
    id: 'q13', topic: 'qm', difficulty: 1,
    q: 'For a particle in a one-dimensional infinite square well, the ratio of the energy of the first excited state to the ground state, $E_2/E_1$, is',
    choices: ['$2$', '$3$', '$4$', '$8$', '$9$'],
    answer: 2,
    sol: '$E_n = \\dfrac{n^2\\pi^2\\hbar^2}{2mL^2} \\propto n^2$, so $\\dfrac{E_2}{E_1} = 4$.'
  },
  {
    id: 'q14', topic: 'qm', difficulty: 1,
    q: 'The canonical commutator of position and momentum, $[\\hat{x}, \\hat{p}]$, equals',
    choices: ['$0$', '$\\hbar$', '$i\\hbar$', '$-i\\hbar$', '$i\\hbar/2$'],
    answer: 2,
    sol: '$[\\hat{x}, \\hat{p}] = i\\hbar$ — the fundamental commutation relation from which the Heisenberg uncertainty principle $\\Delta x\\, \\Delta p \\ge \\hbar/2$ follows.'
  },
  {
    id: 'q15', topic: 'qm', difficulty: 1,
    q: 'The ground-state energy of a one-dimensional quantum harmonic oscillator of angular frequency $\\omega$ is',
    choices: ['$0$', '$\\tfrac{1}{2}\\hbar\\omega$', '$\\hbar\\omega$', '$\\tfrac{3}{2}\\hbar\\omega$', '$2\\hbar\\omega$'],
    answer: 1,
    sol: '$E_n = \\left(n + \\tfrac{1}{2}\\right)\\hbar\\omega$ with $n = 0, 1, 2, \\dots$ The zero-point energy is $E_0 = \\tfrac{1}{2}\\hbar\\omega$, a direct consequence of the uncertainty principle.'
  },

  // ——— Atomic Physics (2) ———
  {
    id: 'q16', topic: 'at', difficulty: 1,
    q: 'The minimum energy required to ionize a hydrogen atom initially in its $n = 2$ state is',
    choices: ['$1.5\\ \\mathrm{eV}$', '$3.4\\ \\mathrm{eV}$', '$6.8\\ \\mathrm{eV}$', '$10.2\\ \\mathrm{eV}$', '$13.6\\ \\mathrm{eV}$'],
    answer: 1,
    sol: '$E_n = -\\dfrac{13.6\\ \\mathrm{eV}}{n^2}$, so $E_2 = -3.4\\ \\mathrm{eV}$. Ionization takes the electron to $E = 0$, requiring $3.4\\ \\mathrm{eV}$.'
  },
  {
    id: 'q17', topic: 'at', difficulty: 2,
    q: 'For electric-dipole transitions in an atom, the selection rule on the orbital quantum number $\\ell$ is',
    choices: ['$\\Delta\\ell = 0$', '$\\Delta\\ell = \\pm 1$', '$\\Delta\\ell = 0, \\pm 1$', '$\\Delta\\ell = \\pm 2$', 'no restriction'],
    answer: 1,
    sol: 'The photon carries one unit of angular momentum and the dipole operator has odd parity, forcing $\\Delta\\ell = \\pm 1$ (while $\\Delta m = 0, \\pm 1$). $\\Delta\\ell = 0$ is parity-forbidden for electric-dipole transitions.'
  },

  // ——— Special Relativity (1) ———
  {
    id: 'q18', topic: 'sr', difficulty: 2,
    q: 'A muon has a proper lifetime of $2.2\\ \\mu\\mathrm{s}$. Moving at $v = 0.8c$ through the lab, its lifetime as measured in the lab frame is closest to',
    choices: ['$1.3\\ \\mu\\mathrm{s}$', '$2.2\\ \\mu\\mathrm{s}$', '$2.8\\ \\mu\\mathrm{s}$', '$3.7\\ \\mu\\mathrm{s}$', '$11\\ \\mu\\mathrm{s}$'],
    answer: 3,
    sol: '$\\gamma = \\dfrac{1}{\\sqrt{1 - 0.8^2}} = \\dfrac{1}{0.6} = \\dfrac{5}{3} \\approx 1.67$. Time dilation: $t_{\\mathrm{lab}} = \\gamma\\tau \\approx 1.67 \\times 2.2\\ \\mu\\mathrm{s} \\approx 3.7\\ \\mu\\mathrm{s}$.'
  },

  // ——— Laboratory Methods (1) ———
  {
    id: 'q19', topic: 'lb', difficulty: 2,
    q: 'A resistance is determined from $R = V/I$. The independent fractional uncertainties are $2\\%$ in $V$ and $1\\%$ in $I$. The fractional uncertainty in $R$ is closest to',
    choices: ['$1\\%$', '$1.4\\%$', '$2.2\\%$', '$3\\%$', '$4\\%$'],
    answer: 2,
    sol: 'For quotients, independent fractional errors add in quadrature: $\\dfrac{\\delta R}{R} = \\sqrt{(2\\%)^2 + (1\\%)^2} = \\sqrt{5}\\,\\% \\approx 2.2\\%$.'
  },

  // ——— Specialized Topics (1) ———
  {
    id: 'q20', topic: 'sp', difficulty: 1,
    q: 'A radioactive sample has a half-life of 10 days. After 30 days, the fraction of the original nuclei remaining is',
    choices: ['$1/2$', '$1/3$', '$1/4$', '$1/8$', '$1/16$'],
    answer: 3,
    sol: 'Three half-lives have elapsed: $\\left(\\tfrac{1}{2}\\right)^3 = \\tfrac{1}{8} = 12.5\\%$ remains. Equivalently $N(t) = N_0 e^{-\\lambda t}$ with $\\lambda = \\dfrac{\\ln 2}{t_{1/2}}$.'
  }
];

PGRE.questionsForTopic = function (topicId) {
  if (!topicId || topicId === 'all') return PGRE.QUESTIONS.slice();
  return PGRE.QUESTIONS.filter(function (q) { return q.topic === topicId; });
};

PGRE.questionById = function (id) {
  return PGRE.QUESTIONS.find(function (q) { return q.id === id; }) || null;
};
