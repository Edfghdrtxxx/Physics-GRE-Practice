/* Topic definitions — the 9 knowledge areas of the GRE Physics Test,
   with official content weights (ETS Test Content outline). */
window.PGRE = window.PGRE || {};

PGRE.EXAM_DATE = '2026-10-28';

PGRE.TOPICS = [
  {
    id: 'cm', short: 'CM', weight: 20,
    name: 'Classical Mechanics',
    blurb: 'The backbone of the test — a fifth of all questions.',
    subtopics: [
      'Kinematics', "Newton's laws", 'Work & energy', 'Oscillatory motion',
      'Rotational motion about a fixed axis', 'Dynamics of systems of particles',
      'Central forces & celestial mechanics', '3-D particle dynamics',
      'Lagrangian & Hamiltonian formalism', 'Non-inertial reference frames',
      'Elementary fluid dynamics'
    ]
  },
  {
    id: 'em', short: 'EM', weight: 18,
    name: 'Electromagnetism',
    blurb: 'From electrostatics to Maxwell — the second-largest block.',
    subtopics: [
      'Electrostatics', 'Currents & DC circuits', 'Magnetic fields in free space',
      'Lorentz force', 'Induction', "Maxwell's equations & applications",
      'Electromagnetic waves', 'AC circuits', 'Magnetic & electric fields in matter'
    ]
  },
  {
    id: 'ow', short: 'OW', weight: 8,
    name: 'Optics & Wave Phenomena',
    blurb: 'Interference, diffraction and geometrical optics.',
    subtopics: [
      'Wave properties', 'Superposition', 'Interference', 'Diffraction',
      'Geometrical optics', 'Polarization', 'Doppler effect'
    ]
  },
  {
    id: 'th', short: 'TS', weight: 10,
    name: 'Thermodynamics & Statistical Mechanics',
    blurb: 'Laws, ensembles and ideal gases.',
    subtopics: [
      'Laws of thermodynamics', 'Thermodynamic processes', 'Equations of state',
      'Ideal gases', 'Kinetic theory', 'Ensembles', 'Statistical concepts',
      'Calculation of thermodynamic quantities', 'Thermal expansion & heat transfer'
    ]
  },
  {
    id: 'qm', short: 'QM', weight: 13,
    name: 'Quantum Mechanics',
    blurb: 'Wells, oscillators, spin and perturbation theory.',
    subtopics: [
      'Fundamental concepts', 'Schrödinger equation solutions', 'Square wells',
      'Harmonic oscillators', 'Hydrogenic atoms', 'Spin', 'Angular momentum',
      'Wave function symmetry', 'Elementary perturbation theory'
    ]
  },
  {
    id: 'at', short: 'AP', weight: 10,
    name: 'Atomic Physics',
    blurb: 'Bohr model, spectra, selection rules and X-rays.',
    subtopics: [
      'Properties of electrons', 'Bohr model', 'Energy quantization',
      'Atomic structure', 'Atomic spectra', 'Selection rules',
      'Black-body radiation', 'X-rays', 'Atoms in electric & magnetic fields'
    ]
  },
  {
    id: 'sr', short: 'SR', weight: 6,
    name: 'Special Relativity',
    blurb: 'Lorentz transformations, four-vectors and kinematics.',
    subtopics: [
      'Introductory concepts', 'Time dilation', 'Length contraction',
      'Simultaneity', 'Energy & momentum', 'Four-vectors',
      'Lorentz transformation', 'Velocity addition'
    ]
  },
  {
    id: 'lb', short: 'LM', weight: 6,
    name: 'Laboratory Methods',
    blurb: 'Error analysis, instrumentation and statistics.',
    subtopics: [
      'Data & error analysis', 'Electronics', 'Instrumentation',
      'Radiation detection', 'Counting statistics',
      'Interaction of charged particles with matter', 'Lasers & interferometers',
      'Dimensional analysis', 'Probability & statistics'
    ]
  },
  {
    id: 'sp', short: 'ST', weight: 9,
    name: 'Specialized Topics',
    blurb: 'Nuclear & particle physics, condensed matter, and more.',
    subtopics: [
      'Nuclear properties & radioactive decay', 'Fission & fusion', 'Reactions',
      'Elementary particles', 'Crystal structure', 'X-ray diffraction',
      'Thermal properties of solids', 'Electron theory of metals',
      'Semiconductors', 'Superconductors', 'Astrophysics',
      'Mathematical methods', 'Computer applications'
    ]
  }
];

PGRE.topicById = function (id) {
  return PGRE.TOPICS.find(function (t) { return t.id === id; }) || null;
};
