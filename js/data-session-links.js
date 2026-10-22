/* Recall card → OrbitOS learning sessions that work through that card.
   Keys are card ids (PGRE.formulaDeck()); values are note paths relative to
   the Obsidian vault named in PGRE.SESSION_VAULT. Each path renders as a link
   on the card that opens the note in Obsidian (PGRE.sessionLinksHTML,
   js/bank.js). Hand-matched once from the physics folders of
   60_Learning_Progress (Classical Mechanics, Electrodynamics, Quantum
   Mechanics, Nuclear Physics, Mathematical Methods); a card is linked only
   when the session substantially works through the card's content. No
   generator: later sessions are not linked automatically.
   PGRE.SESSION_LABELS gives a LaTeX label where the note's file name writes a
   symbol as a plain letter; any other link is labelled with the file name
   without its date stamp. */
window.PGRE = window.PGRE || {};

PGRE.SESSION_VAULT = 'OrbitOS';

(function () {
  var CM = '60_Learning_Progress/Classical Mechanics/';
  var ED = '60_Learning_Progress/Electrodynamics/';
  var QM = '60_Learning_Progress/Quantum Mechanics/';
  var NP = '60_Learning_Progress/Nuclear Physics/';
  var MM = '60_Learning_Progress/Mathematical Methods/';

  var hoop = CM + '2026-09-08-1247 Bead on a rotating hoop.md';
  var continuity = CM + '2026-09-10-1501 Fluid continuity equation.md';
  var bernoulli = CM + '2026-09-10-1522 Bernoulli equation.md';
  var orbit = CM + '2026-09-18-1705 Circular orbit and effective potential.md';
  var pendulum = CM + '2026-09-19-1609 Pendulum angular vs linear displacement.md';
  var rolling = CM + '2026-09-22-2235 Rolling sphere launch energy.md';
  var collision = CM + '2026-10-22-1609 Elastic collision recoil velocities.md';
  var lagrangian = CM + '2026-10-22-1753 Energy conservation from a time-independent Lagrangian.md';

  var capEnergy = ED + '2026-09-14-0816 Capacitor energy.md';
  var normalE = ED + '2026-09-15-0916 Boundary condition on normal E.md';
  var dipole = ED + '2026-09-17-1537 Magnetic dipole moment of a current loop.md';
  var selfEmf = ED + '2026-09-17-2129 Self-induced emf across an inductor.md';
  var mutual = ED + '2026-09-18-0843 Mutual inductance.md';
  var polarization = ED + '2026-09-19-1816 Polarization and bound surface charge density.md';
  var displacementD = ED + '2026-09-20-1803 Electric displacement D and linear dielectrics.md';
  var toroid = ED + '2026-09-21-2048 Magnetic energy of a square-cross-section toroid.md';
  var ampereMaxwell = ED + '2026-10-10-1426 Ampère–Maxwell law and displacement current.md';
  var images = ED + '2026-10-22-1711 Method of images work.md';

  var oscillator = QM + '2026-07-26-2112 Harmonic oscillator.md';
  var ladder = QM + '2026-07-26-2113 Ladder operators.md';
  var tise = QM + '2026-07-26-2126 Time-independent Schrödinger equation.md';
  var expectation = QM + '2026-09-27-2235 Expectation value in an eigenbasis.md';
  var kahnDebrief = QM + '2026-09-30-1509 Kahn 5.1.5 and 5.2.3 debrief.md';
  var spin = QM + '2026-10-22-1831 Spin-3-2 multiplet symmetry.md';

  var beams = NP + '2026-08-07-1538 Radioactive beams projectile fragmentation.md';

  var determinant = MM + '2026-09-23-1713 Determinant equations.md';
  var sanity = MM + '2026-10-04-1801 Sanity checks.md';
  var poisson = MM + '2026-10-22-2132 Poisson upper limit with zero events.md';

  PGRE.SESSION_LINKS = {
    'cpgf-1.22': [hoop],
    'cpgf-1.32': [lagrangian],
    'cpgf-1.35': [orbit],
    'cpgf-1.38': [orbit],
    'cpgf-1.47': [pendulum],
    'cpgf-1.48': [pendulum],
    'cpgf-1.51': [continuity, bernoulli],
    'supp-hydrostatics': [bernoulli],
    'supp-newton-momentum': [collision],
    'supp-rolling-incline': [rolling],

    'cpgf-2.9': [displacementD],
    'cpgf-2.13': [polarization, displacementD],
    'cpgf-2.15': [normalE, displacementD],
    'cpgf-2.18': [images],
    'cpgf-2.20': [capEnergy],
    'cpgf-2.21': [capEnergy, images],
    'cpgf-2.32a': [dipole],
    'cpgf-2.35': [selfEmf, toroid],
    'cpgf-2.36': [beams],
    'cpgf-2.41': [ampereMaxwell],
    'cpgf-2.42': [selfEmf],
    'cpgf-2.43': [mutual],
    'cpgf-2.45': [selfEmf],
    'cpgf-2.46': [selfEmf],
    'cpgf-2.47': [selfEmf],
    'cpgf-2.52': [dipole],
    'cpgf-2.53': [dipole],
    'cpgf-2.56': [polarization, displacementD],
    'cpgf-2.59': [polarization, displacementD],
    'cpgl-2.01': [displacementD],
    'supp-displacement-current': [ampereMaxwell],
    'supp-image-plane': [images, sanity],

    'cpgf-5.19': [kahnDebrief],
    'cpgf-5.22': [ladder],
    'cpgf-5.24': [oscillator, ladder, kahnDebrief],
    'cpgf-5.26': [kahnDebrief],
    'cpgf-5.54': [spin],
    'cpgf-5.56': [spin],
    'cpgl-5.01': [expectation],
    'cpgl-5.03': [kahnDebrief],
    'cpgl-5.05': [kahnDebrief],
    'supp-energy-phase': [tise, kahnDebrief],
    'supp-ho-moments': [kahnDebrief],
    'supp-sho-ladder': [ladder, kahnDebrief],
    'supp-virial': [kahnDebrief],

    'cpgf-7.6': [poisson],
    'cpgl-5.02a': [determinant],
    'cpgl-7.04': [poisson],
    'supp-counting-distributions': [poisson],
    'supp-matrix-det-trace': [determinant]
  };

  PGRE.SESSION_LABELS = {};
  PGRE.SESSION_LABELS[normalE] = 'Boundary condition on normal $E$';
  PGRE.SESSION_LABELS[displacementD] = 'Electric displacement $\\mathbf{D}$ and linear dielectrics';
  PGRE.SESSION_LABELS[spin] = 'Spin-$\\tfrac{3}{2}$ multiplet symmetry';
})();
