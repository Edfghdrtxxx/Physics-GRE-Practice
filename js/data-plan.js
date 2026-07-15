/* Review plan: Jul 13 – Oct 28, 2026 (exam day: Wed, Oct 28).
   Intensity: Intensive (~15–17 h/week).
   Three phases: Foundation Pass → Second Pass & Practice Tests → Sharpen & Taper.
   Reading tasks refer to the corresponding chapters of "Conquering the Physics GRE";
   until the markdown is imported, use your own copy of the text.
   Practice-test tasks use released ETS exams (GR8677 … GR1777) on paper —
   the in-app timed simulator is designed but deferred (docs/Project Docs/DESIGN.md). */
window.PGRE = window.PGRE || {};

PGRE.PLAN = [
  {
    id: 'p1', name: 'Phase 1 · Foundation Pass',
    desc: 'One deep pass through all nine topics, ordered by exam weight. Build the formula sheet as you go.',
    weeks: [
      {
        id: 'w01', start: '2026-07-13', end: '2026-07-19', title: 'Classical Mechanics I', topics: ['cm'], hours: 15,
        tasks: [
          { id: 'w01t1', label: 'Read: kinematics, Newton’s laws, work & energy (book chapter — import pending)', hours: 3, xp: 15 },
          { id: 'w01t2', label: 'Read: momentum, systems of particles, collisions', hours: 2.5, xp: 15 },
          { id: 'w01t3', label: 'Oscillations: derive SHM, damped & driven results; memorize pendulum/spring formulas', hours: 2.5, xp: 15 },
          { id: 'w01t4', label: 'Drill: 20 CM questions (in-app + end-of-chapter problems)', hours: 3, xp: 20 },
          { id: 'w01t5', label: 'Start formula sheet: mechanics page', hours: 1.5, xp: 10 },
          { id: 'w01t6', label: 'Rework every miss from scratch; log the error pattern', hours: 2.5, xp: 15 }
        ]
      },
      {
        id: 'w02', start: '2026-07-20', end: '2026-07-26', title: 'Classical Mechanics II', topics: ['cm'], hours: 15,
        tasks: [
          { id: 'w02t1', label: 'Read: rotational dynamics, moments of inertia, angular momentum', hours: 3, xp: 15 },
          { id: 'w02t2', label: 'Read: central forces, orbits, Kepler; effective potential method', hours: 2.5, xp: 15 },
          { id: 'w02t3', label: 'Lagrangian & Hamiltonian formalism: practice setting up L and H fast', hours: 3, xp: 20 },
          { id: 'w02t4', label: 'Non-inertial frames (centrifugal, Coriolis) + fluid statics/Bernoulli', hours: 2, xp: 15 },
          { id: 'w02t5', label: 'Drill: 20 mixed CM questions under 1.7 min/question pacing', hours: 3, xp: 20 },
          { id: 'w02t6', label: 'Finish mechanics formula sheet; self-quiz it blank', hours: 1.5, xp: 10 }
        ]
      },
      {
        id: 'w03', start: '2026-07-27', end: '2026-08-02', title: 'Electromagnetism I', topics: ['em'], hours: 16,
        tasks: [
          { id: 'w03t1', label: 'Read: electrostatics — Coulomb, Gauss, potential, conductors, capacitors', hours: 3.5, xp: 15 },
          { id: 'w03t2', label: 'Read: DC circuits — Kirchhoff, RC transients, equivalent networks', hours: 2.5, xp: 15 },
          { id: 'w03t3', label: 'Read: magnetostatics — Biot–Savart, Ampère, Lorentz force, cyclotron motion', hours: 3, xp: 15 },
          { id: 'w03t4', label: 'Drill: 20 EM questions (fields & circuits)', hours: 3, xp: 20 },
          { id: 'w03t5', label: 'Memorize the standard field results (wire, loop, solenoid, sphere, plane)', hours: 2, xp: 15 },
          { id: 'w03t6', label: 'Rework misses; add E&M page to formula sheet', hours: 2, xp: 10 }
        ]
      },
      {
        id: 'w04', start: '2026-08-03', end: '2026-08-09', title: 'Electromagnetism II', topics: ['em'], hours: 16,
        tasks: [
          { id: 'w04t1', label: 'Read: induction, inductance, LR/LC/RLC circuits', hours: 3, xp: 15 },
          { id: 'w04t2', label: 'Read: Maxwell’s equations, EM waves, Poynting vector, radiation basics', hours: 3, xp: 15 },
          { id: 'w04t3', label: 'AC circuits: impedance, resonance, phasors — speed drills', hours: 2.5, xp: 15 },
          { id: 'w04t4', label: 'Fields in matter: dielectrics, magnetization, boundary conditions', hours: 2.5, xp: 15 },
          { id: 'w04t5', label: 'Drill: 20 mixed EM questions, timed', hours: 3, xp: 20 },
          { id: 'w04t6', label: 'Consolidate EM formula sheet; self-quiz blank', hours: 2, xp: 10 }
        ]
      },
      {
        id: 'w05', start: '2026-08-10', end: '2026-08-16', title: 'Optics & Wave Phenomena', topics: ['ow'], hours: 15,
        tasks: [
          { id: 'w05t1', label: 'Read: wave properties, superposition, standing waves, beats, Doppler', hours: 3, xp: 15 },
          { id: 'w05t2', label: 'Read: interference & diffraction — double slit, thin films, gratings, single slit', hours: 3, xp: 15 },
          { id: 'w05t3', label: 'Geometrical optics: lens/mirror equations, sign conventions, optical instruments', hours: 2.5, xp: 15 },
          { id: 'w05t4', label: 'Polarization: Malus, Brewster, wave plates', hours: 1.5, xp: 10 },
          { id: 'w05t5', label: 'Drill: 20 optics/waves questions', hours: 3, xp: 20 },
          { id: 'w05t6', label: 'Optics formula page + rework misses', hours: 2, xp: 10 }
        ]
      },
      {
        id: 'w06', start: '2026-08-17', end: '2026-08-23', title: 'Thermodynamics & Statistical Mechanics', topics: ['th'], hours: 15,
        tasks: [
          { id: 'w06t1', label: 'Read: laws of thermodynamics, processes, cycles, entropy', hours: 3, xp: 15 },
          { id: 'w06t2', label: 'Read: ideal gases, equipartition, kinetic theory, Maxwell–Boltzmann', hours: 3, xp: 15 },
          { id: 'w06t3', label: 'Statistical mechanics: ensembles, partition functions, Fermi/Bose basics', hours: 3, xp: 20 },
          { id: 'w06t4', label: 'Heat transfer, thermal expansion, black-body scaling laws', hours: 1.5, xp: 10 },
          { id: 'w06t5', label: 'Drill: 20 thermo/stat-mech questions', hours: 3, xp: 20 },
          { id: 'w06t6', label: 'Thermo formula page + rework misses', hours: 1.5, xp: 10 }
        ]
      },
      {
        id: 'w07', start: '2026-08-24', end: '2026-08-30', title: 'Quantum Mechanics I', topics: ['qm'], hours: 16,
        tasks: [
          { id: 'w07t1', label: 'Read: postulates, operators, commutators, uncertainty', hours: 3, xp: 15 },
          { id: 'w07t2', label: 'Read: infinite/finite square wells, tunneling, harmonic oscillator', hours: 3.5, xp: 15 },
          { id: 'w07t3', label: 'Memorize standard results: well energies, SHO ladder, expectation values', hours: 2.5, xp: 15 },
          { id: 'w07t4', label: 'Drill: 20 QM questions (wells & oscillators)', hours: 3, xp: 20 },
          { id: 'w07t5', label: 'QM formula page (part 1)', hours: 1.5, xp: 10 },
          { id: 'w07t6', label: 'Rework misses; flag concepts to revisit in pass 2', hours: 2.5, xp: 15 }
        ]
      },
      {
        id: 'w08', start: '2026-08-31', end: '2026-09-06', title: 'Quantum Mechanics II + Atomic I', topics: ['qm', 'at'], hours: 16,
        tasks: [
          { id: 'w08t1', label: 'Read: hydrogen atom, angular momentum, spin, addition of angular momenta', hours: 3.5, xp: 15 },
          { id: 'w08t2', label: 'Read: identical particles, symmetry, perturbation theory (1st/2nd order)', hours: 3, xp: 15 },
          { id: 'w08t3', label: 'Read: Bohr model, hydrogenic energies, atomic spectra & notation', hours: 2.5, xp: 15 },
          { id: 'w08t4', label: 'Drill: 20 QM + atomic questions', hours: 3, xp: 20 },
          { id: 'w08t5', label: 'QM formula page (part 2) + hydrogen/Bohr numbers cold', hours: 2, xp: 15 },
          { id: 'w08t6', label: 'Rework misses', hours: 2, xp: 10 }
        ]
      },
      {
        id: 'w09', start: '2026-09-07', end: '2026-09-13', title: 'Atomic II + Special Relativity', topics: ['at', 'sr'], hours: 16,
        tasks: [
          { id: 'w09t1', label: 'Read: selection rules, Zeeman/Stark effects, X-rays, black-body radiation', hours: 3, xp: 15 },
          { id: 'w09t2', label: 'Read: SR — postulates, time dilation, length contraction, simultaneity', hours: 2.5, xp: 15 },
          { id: 'w09t3', label: 'SR: energy–momentum, four-vectors, velocity addition, Doppler shift', hours: 3, xp: 15 },
          { id: 'w09t4', label: 'Drill: 20 atomic + SR questions', hours: 3, xp: 20 },
          { id: 'w09t5', label: 'Atomic + SR formula pages', hours: 2, xp: 10 },
          { id: 'w09t6', label: 'Rework misses; schedule practice test for next week', hours: 2.5, xp: 15 }
        ]
      }
    ]
  },
  {
    id: 'p2', name: 'Phase 2 · Second Pass & Practice Tests',
    desc: 'Close out the syllabus, then re-sweep everything faster while layering in full released exams (on paper, timed).',
    weeks: [
      {
        id: 'w10', start: '2026-09-14', end: '2026-09-20', title: 'Lab Methods + Specialized · Test #1', topics: ['lb', 'sp'], hours: 17,
        tasks: [
          { id: 'w10t1', label: 'Read: error analysis, counting statistics, instrumentation, detectors', hours: 3, xp: 15 },
          { id: 'w10t2', label: 'Read: nuclear/particle basics — decay law, binding energy, particle zoo', hours: 3, xp: 15 },
          { id: 'w10t3', label: 'Read: condensed matter basics — crystals, bands, semiconductors, superconductors', hours: 2.5, xp: 15 },
          { id: 'w10t4', label: 'Drill: 15 lab + specialized questions', hours: 2.5, xp: 20 },
          { id: 'w10t5', label: 'PRACTICE TEST #1: GR8677, full, timed, on paper', hours: 3, xp: 30 },
          { id: 'w10t6', label: 'Score test #1; classify every miss by topic and cause', hours: 3, xp: 20 }
        ]
      },
      {
        id: 'w11', start: '2026-09-21', end: '2026-09-27', title: 'Second pass: CM + EM · Test #2', topics: ['cm', 'em'], hours: 17,
        tasks: [
          { id: 'w11t1', label: 'Rapid re-read of CM notes; redo the 10 hardest CM problems from pass 1', hours: 3.5, xp: 20 },
          { id: 'w11t2', label: 'Rapid re-read of EM notes; redo the 10 hardest EM problems', hours: 3.5, xp: 20 },
          { id: 'w11t3', label: 'Drill: 25 mixed CM/EM questions at exam pace', hours: 3, xp: 20 },
          { id: 'w11t4', label: 'PRACTICE TEST #2: GR9277, full, timed', hours: 3, xp: 30 },
          { id: 'w11t5', label: 'Score test #2; update weak-topic list', hours: 2.5, xp: 20 },
          { id: 'w11t6', label: 'Formula sheets: self-quiz CM + EM pages blank', hours: 1.5, xp: 10 }
        ]
      },
      {
        id: 'w12', start: '2026-09-28', end: '2026-10-04', title: 'Second pass: Optics + Thermo + QM · Test #3', topics: ['ow', 'th', 'qm'], hours: 17,
        tasks: [
          { id: 'w12t1', label: 'Rapid re-read optics + thermo notes; redo hardest problems', hours: 3.5, xp: 20 },
          { id: 'w12t2', label: 'Rapid re-read QM notes; redo hardest problems', hours: 3, xp: 20 },
          { id: 'w12t3', label: 'Drill: 25 mixed OW/TS/QM questions at exam pace', hours: 3, xp: 20 },
          { id: 'w12t4', label: 'PRACTICE TEST #3: GR9677, full, timed', hours: 3, xp: 30 },
          { id: 'w12t5', label: 'Score test #3; update weak-topic list', hours: 2.5, xp: 20 },
          { id: 'w12t6', label: 'Self-quiz optics/thermo/QM formula pages', hours: 2, xp: 10 }
        ]
      },
      {
        id: 'w13', start: '2026-10-05', end: '2026-10-11', title: 'Second pass: Atomic + SR + Lab + Specialized · Test #4', topics: ['at', 'sr', 'lb', 'sp'], hours: 17,
        tasks: [
          { id: 'w13t1', label: 'Rapid re-read atomic + SR notes; redo hardest problems', hours: 3, xp: 20 },
          { id: 'w13t2', label: 'Rapid re-read lab + specialized notes; redo hardest problems', hours: 3, xp: 20 },
          { id: 'w13t3', label: 'Drill: 25 mixed AP/SR/LM/ST questions at exam pace', hours: 3, xp: 20 },
          { id: 'w13t4', label: 'PRACTICE TEST #4: GR0177, full, timed', hours: 3, xp: 30 },
          { id: 'w13t5', label: 'Score test #4; is the weak-topic list shrinking? Adjust next week', hours: 2.5, xp: 20 },
          { id: 'w13t6', label: 'Self-quiz remaining formula pages', hours: 2, xp: 10 }
        ]
      }
    ]
  },
  {
    id: 'p3', name: 'Phase 3 · Sharpen & Taper',
    desc: 'Data-driven drilling on your weakest topics, final mock, then taper so you arrive fresh on October 28.',
    weeks: [
      {
        id: 'w14', start: '2026-10-12', end: '2026-10-18', title: 'Weak-topic offensive · Test #5', topics: [], hours: 16,
        tasks: [
          { id: 'w14t1', label: 'Pick your 3 weakest topics from the dashboard stats; deep-drill topic 1', hours: 3, xp: 20 },
          { id: 'w14t2', label: 'Deep-drill weak topic 2', hours: 3, xp: 20 },
          { id: 'w14t3', label: 'Deep-drill weak topic 3', hours: 3, xp: 20 },
          { id: 'w14t4', label: 'PRACTICE TEST #5: GR1777, full, timed', hours: 3, xp: 30 },
          { id: 'w14t5', label: 'Score test #5; write a one-page "exam playbook" (pacing, guessing, skips)', hours: 2.5, xp: 20 },
          { id: 'w14t6', label: 'Formula sheets: full blank self-quiz, all pages', hours: 1.5, xp: 15 }
        ]
      },
      {
        id: 'w15', start: '2026-10-19', end: '2026-10-25', title: 'Final mock + consolidation', topics: [], hours: 14,
        tasks: [
          { id: 'w15t1', label: 'FINAL MOCK: re-take your worst practice test, timed', hours: 3, xp: 30 },
          { id: 'w15t2', label: 'Review final mock; close out remaining misses', hours: 2.5, xp: 20 },
          { id: 'w15t3', label: 'Speed drills: 30 mixed questions, strict 1.7 min pace', hours: 3, xp: 20 },
          { id: 'w15t4', label: 'Memorization sweep: constants, standard results, order-of-magnitude estimates', hours: 2.5, xp: 15 },
          { id: 'w15t5', label: 'Light review of formula sheets each evening', hours: 2, xp: 10 },
          { id: 'w15t6', label: 'Logistics: test center route, ID, admission ticket, calculator rules (none allowed!)', hours: 1, xp: 10 }
        ]
      },
      {
        id: 'w16', start: '2026-10-26', end: '2026-10-28', title: 'Taper — exam Wednesday Oct 28', topics: [], hours: 4,
        tasks: [
          { id: 'w16t1', label: 'Mon: light skim of formula sheets and exam playbook only — no new material', hours: 2, xp: 15 },
          { id: 'w16t2', label: 'Tue: 30-minute confidence review, pack bag, early night', hours: 1.5, xp: 15 },
          { id: 'w16t3', label: 'Wed: EXAM DAY — arrive early, trust the preparation', hours: 0.5, xp: 50 }
        ]
      }
    ]
  }
];

PGRE.planWeeks = function () {
  var out = [];
  PGRE.PLAN.forEach(function (phase) {
    phase.weeks.forEach(function (w) { out.push({ phase: phase, week: w }); });
  });
  return out;
};

PGRE.currentWeek = function (dateStr) {
  var d = dateStr || PGRE.store.today();
  var all = PGRE.planWeeks();
  for (var i = 0; i < all.length; i++) {
    if (d >= all[i].week.start && d <= all[i].week.end) return all[i];
  }
  if (d < all[0].week.start) return all[0];
  return all[all.length - 1];
};
