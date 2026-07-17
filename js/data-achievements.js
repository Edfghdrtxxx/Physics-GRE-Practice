/* Achievement definitions — 80 achievements across 10 categories.
   Two kinds:
     metric-based: { metric, goal }  — progress computed from state (see gamify.js metrics)
     flag-based:   { flag }          — set once by a specific event
   Secret achievements are hidden until unlocked.
   Tier XP bonuses: bronze 25 · silver 50 · gold 100 · platinum 200. */
window.PGRE = window.PGRE || {};

PGRE.TIER_XP = { bronze: 25, silver: 50, gold: 100, platinum: 200 };

PGRE.ACH_CATEGORIES = [
  { id: 'progress',   name: 'Progress'      },
  { id: 'knowledge',  name: 'Knowledge'     },
  { id: 'dedication', name: 'Dedication'    },
  { id: 'mastery',    name: 'Mastery'       },
  { id: 'plan',       name: 'Study Plan'    },
  { id: 'exam',       name: 'Mock Exams'    },
  { id: 'formulas',   name: 'Formula Recall'},
  { id: 'focus',      name: 'Focus & Time'  },
  { id: 'review',     name: 'Review Lab'    },
  { id: 'secret',     name: 'Secret'        }
];

PGRE.ACHIEVEMENTS = [
  // ——— Progress: questions answered ———
  { id: 'first-steps',  cat: 'progress', tier: 'bronze',   name: 'First Steps',        desc: 'Answer your first question.',              metric: 'answered', goal: 1 },
  { id: 'solver-1',     cat: 'progress', tier: 'bronze',   name: 'Problem Solver I',   desc: 'Answer 25 questions.',                     metric: 'answered', goal: 25 },
  { id: 'solver-2',     cat: 'progress', tier: 'silver',   name: 'Problem Solver II',  desc: 'Answer 100 questions.',                    metric: 'answered', goal: 100 },
  { id: 'solver-3',     cat: 'progress', tier: 'gold',     name: 'Problem Solver III', desc: 'Answer 250 questions.',                    metric: 'answered', goal: 250 },
  { id: 'solver-4',     cat: 'progress', tier: 'platinum', name: 'Problem Solver IV',  desc: 'Answer 500 questions.',                    metric: 'answered', goal: 500 },

  // ——— Knowledge: XP milestones ———
  { id: 'spark',        cat: 'knowledge', tier: 'bronze',   name: 'Spark',             desc: 'Reach 100 XP.',                            metric: 'xp', goal: 100 },
  { id: 'charged-up',   cat: 'knowledge', tier: 'bronze',   name: 'Charged Up',        desc: 'Reach 500 XP.',                            metric: 'xp', goal: 500 },
  { id: 'high-voltage', cat: 'knowledge', tier: 'silver',   name: 'High Voltage',      desc: 'Reach 2,000 XP.',                          metric: 'xp', goal: 2000 },
  { id: 'megajoule',    cat: 'knowledge', tier: 'gold',     name: 'Megajoule',         desc: 'Reach 5,000 XP.',                          metric: 'xp', goal: 5000 },
  { id: 'supernova',    cat: 'knowledge', tier: 'platinum', name: 'Supernova',         desc: 'Reach 10,000 XP.',                         metric: 'xp', goal: 10000 },

  // ——— Dedication: streaks & days active ———
  { id: 'streak-3',     cat: 'dedication', tier: 'bronze',   name: 'Warming Up',       desc: 'Keep a 3-day study streak.',               metric: 'bestStreak', goal: 3 },
  { id: 'streak-7',     cat: 'dedication', tier: 'silver',   name: 'Momentum',         desc: 'Keep a 7-day study streak.',               metric: 'bestStreak', goal: 7 },
  { id: 'streak-14',    cat: 'dedication', tier: 'gold',     name: 'Inertia',          desc: 'Keep a 14-day study streak.',              metric: 'bestStreak', goal: 14 },
  { id: 'streak-30',    cat: 'dedication', tier: 'platinum', name: 'Perpetual Motion', desc: 'Keep a 30-day study streak.',              metric: 'bestStreak', goal: 30 },
  { id: 'days-5',       cat: 'dedication', tier: 'bronze',   name: 'Regular',          desc: 'Study on 5 different days.',               metric: 'daysActive', goal: 5 },
  { id: 'days-20',      cat: 'dedication', tier: 'silver',   name: 'Devoted',          desc: 'Study on 20 different days.',              metric: 'daysActive', goal: 20 },
  { id: 'days-50',      cat: 'dedication', tier: 'gold',     name: 'Relentless',       desc: 'Study on 50 different days.',              metric: 'daysActive', goal: 50 },
  { id: 'days-90',      cat: 'dedication', tier: 'platinum', name: 'Iron Discipline',  desc: 'Study on 90 different days.',              metric: 'daysActive', goal: 90 },

  // ——— Mastery: accuracy & topic coverage ———
  { id: 'sharp',        cat: 'mastery', tier: 'bronze',   name: 'Sharp',              desc: 'Finish a session of 10+ questions at 80% or better.', flag: 'session80' },
  { id: 'precise',      cat: 'mastery', tier: 'silver',   name: 'Precise',            desc: 'Finish a session of 10+ questions at 90% or better.', flag: 'session90' },
  { id: 'flawless',     cat: 'mastery', tier: 'gold',     name: 'Flawless',           desc: 'Finish a session of 10+ questions with a perfect score.', flag: 'session100' },
  { id: 'explorer',     cat: 'mastery', tier: 'silver',   name: 'Explorer',           desc: 'Practice in all 9 topics.',                metric: 'topicsPracticed', goal: 9 },
  { id: 'adept-1',      cat: 'mastery', tier: 'bronze',   name: 'Topic Adept',        desc: 'Reach 60% mastery in 1 topic.',            metric: 'topics60', goal: 1 },
  { id: 'adept-3',      cat: 'mastery', tier: 'silver',   name: 'Triple Threat',      desc: 'Reach 60% mastery in 3 topics.',           metric: 'topics60', goal: 3 },
  { id: 'master-6',     cat: 'mastery', tier: 'gold',     name: 'Polymath',           desc: 'Reach 80% mastery in 6 topics.',           metric: 'topics80', goal: 6 },
  { id: 'master-9',     cat: 'mastery', tier: 'platinum', name: 'Renaissance Physicist', desc: 'Reach 80% mastery in all 9 topics.',    metric: 'topics80', goal: 9 },

  // ——— Study Plan ———
  { id: 'plan-first',   cat: 'plan', tier: 'bronze',   name: 'On the Board',          desc: 'Complete your first plan task.',           metric: 'planTasks', goal: 1 },
  { id: 'plan-25',      cat: 'plan', tier: 'silver',   name: 'Steady Climb',          desc: 'Complete 25 plan tasks.',                  metric: 'planTasks', goal: 25 },
  { id: 'plan-week',    cat: 'plan', tier: 'silver',   name: 'Clean Sweep',           desc: 'Complete every task in one week.',         metric: 'planWeeksDone', goal: 1 },
  { id: 'plan-phase',   cat: 'plan', tier: 'gold',     name: 'Phase Transition',      desc: 'Complete an entire phase of the plan.',    metric: 'planPhasesDone', goal: 1 },
  { id: 'plan-all',     cat: 'plan', tier: 'platinum', name: 'The Long March',        desc: 'Complete the entire review plan.',         metric: 'planPhasesDone', goal: 3 },

  // ——— Mock exams (simulator; metrics read submitted state.exams only) ———
  { id: 'exam-first',    cat: 'exam', tier: 'bronze', name: 'First Full Sim',    desc: 'Complete a full timed mock exam.',                     metric: 'examsDone', goal: 1 },
  { id: 'exam-marathon', cat: 'exam', tier: 'silver', name: 'Marathoner',        desc: 'Complete 3 full timed mock exams.',                    metric: 'examsDone', goal: 3 },
  { id: 'exam-peak',     cat: 'exam', tier: 'gold',   name: 'Peak Performer',    desc: 'Score 85% or better raw on a mock exam.',              metric: 'examBestPct', goal: 85 },
  { id: 'exam-victory',  cat: 'exam', tier: 'gold',   name: 'Simulated Victory', desc: 'Beat your previous sim score twice.',                  metric: 'examImprovements', goal: 2 },

  // ——— Progress: extend the questions ladder ———
  { id: 'solver-5',     cat: 'progress', tier: 'platinum', name: 'Kilo-Solver',        desc: 'Answer 1,000 questions.',                  metric: 'answered', goal: 1000 },

  // ——— Knowledge: extend the XP ladder ———
  { id: 'event-horizon', cat: 'knowledge', tier: 'platinum', name: 'Event Horizon',    desc: 'Reach 20,000 XP.',                         metric: 'xp', goal: 20000 },

  // ——— Dedication: deeper streak & days-active rungs ———
  { id: 'streak-60',    cat: 'dedication', tier: 'platinum', name: 'Standing Wave',    desc: 'Keep a 60-day study streak.',              metric: 'bestStreak', goal: 60 },
  { id: 'days-150',     cat: 'dedication', tier: 'platinum', name: 'Immovable',        desc: 'Study on 150 different days.',              metric: 'daysActive', goal: 150 },

  // ——— Mock exams: more sims, higher score ———
  { id: 'exam-regular',    cat: 'exam', tier: 'gold',     name: 'Battle-Tested',       desc: 'Complete 5 full timed mock exams.',        metric: 'examsDone', goal: 5 },
  { id: 'exam-montecarlo', cat: 'exam', tier: 'platinum', name: 'Monte Carlo',         desc: 'Complete 10 full timed mock exams.',       metric: 'examsDone', goal: 10 },
  { id: 'exam-topcurve',   cat: 'exam', tier: 'platinum', name: 'Top of the Curve',    desc: 'Score 95% or better raw on a mock exam.',  metric: 'examBestPct', goal: 95 },

  // ——— Formula Recall (formula deck: state.cards / cardReviews / cardNotes) ———
  { id: 'fr-first',     cat: 'formulas', tier: 'bronze',   name: 'First Equation',     desc: 'Study your first formula card.',           metric: 'cardsSeen', goal: 1 },
  { id: 'fr-25',        cat: 'formulas', tier: 'bronze',   name: 'Chalk Dust',         desc: 'Study 25 formula cards.',                  metric: 'cardsSeen', goal: 25 },
  { id: 'fr-100',       cat: 'formulas', tier: 'silver',   name: 'Equation Arsenal',   desc: 'Study 100 formula cards.',                 metric: 'cardsSeen', goal: 100 },
  { id: 'fr-codex',     cat: 'formulas', tier: 'platinum', name: 'The Whole Codex',    desc: 'Study 300 formula cards.',                 metric: 'cardsSeen', goal: 300 },
  { id: 'fr-rev-100',   cat: 'formulas', tier: 'silver',   name: 'Repetition Engine',  desc: 'Log 100 formula reviews.',                 metric: 'formulaReviews', goal: 100 },
  { id: 'fr-rev-500',   cat: 'formulas', tier: 'gold',     name: 'Muscle Memory',      desc: 'Log 500 formula reviews.',                 metric: 'formulaReviews', goal: 500 },
  { id: 'fr-mat-20',    cat: 'formulas', tier: 'silver',   name: 'Taking Root',        desc: 'Mature 20 formula cards (recall each 5 times).', metric: 'cardsMature', goal: 20 },
  { id: 'fr-mat-100',   cat: 'formulas', tier: 'gold',     name: 'Long-Term Storage',  desc: 'Mature 100 formula cards.',                metric: 'cardsMature', goal: 100 },
  { id: 'fr-mat-200',   cat: 'formulas', tier: 'platinum', name: 'Burned Into Memory', desc: 'Mature 200 formula cards.',                metric: 'cardsMature', goal: 200 },
  { id: 'fr-mnem-1',    cat: 'formulas', tier: 'bronze',   name: 'Memory Palace',      desc: 'Write your first formula mnemonic.',       metric: 'mnemonics', goal: 1 },
  { id: 'fr-mnem-10',   cat: 'formulas', tier: 'silver',   name: 'Mnemonic Architect', desc: 'Write mnemonics for 10 formulas.',         metric: 'mnemonics', goal: 10 },
  { id: 'fr-clean',     cat: 'formulas', tier: 'gold',     name: 'Total Recall',       desc: 'Finish a formula study session of 20+ cards with no Again.', flag: 'cleanRecall' },

  // ——— Focus & Time (studyLog seconds + F3 timerStats) ———
  { id: 'fo-hr-1',      cat: 'focus', tier: 'bronze',   name: 'In the Zone',          desc: 'Log 1 hour of study time.',                metric: 'studyHours', goal: 1 },
  { id: 'fo-hr-10',     cat: 'focus', tier: 'silver',   name: 'Deep Work',            desc: 'Log 10 hours of study time.',              metric: 'studyHours', goal: 10 },
  { id: 'fo-hr-50',     cat: 'focus', tier: 'gold',     name: 'The Long Haul',        desc: 'Log 50 hours of study time.',              metric: 'studyHours', goal: 50 },
  { id: 'fo-hr-100',    cat: 'focus', tier: 'platinum', name: 'Sustained Reaction',   desc: 'Log 100 hours of study time.',             metric: 'studyHours', goal: 100 },
  { id: 'fo-s-1',       cat: 'focus', tier: 'bronze',   name: 'Locked In',            desc: 'Complete your first focus-timer session.', metric: 'focusSessions', goal: 1 },
  { id: 'fo-s-10',      cat: 'focus', tier: 'silver',   name: 'Tunnel Vision',        desc: 'Complete 10 focus-timer sessions.',        metric: 'focusSessions', goal: 10 },
  { id: 'fo-s-50',      cat: 'focus', tier: 'gold',     name: 'Laser Focused',        desc: 'Complete 50 focus-timer sessions.',        metric: 'focusSessions', goal: 50 },
  { id: 'fo-fh-5',      cat: 'focus', tier: 'silver',   name: 'Off the Grid',         desc: 'Log 5 hours on the focus timer.',          metric: 'focusHours', goal: 5 },
  { id: 'fo-fh-25',     cat: 'focus', tier: 'gold',     name: 'Chalkboard Hours',     desc: 'Log 25 hours on the focus timer.',         metric: 'focusHours', goal: 25 },

  // ——— Review Lab (mistake book, notes, bookmarks, sessions) ———
  { id: 'rv-arch-1',    cat: 'review', tier: 'bronze',   name: 'Case Closed',         desc: 'Resolve and archive your first mistake.',  metric: 'mistakesArchived', goal: 1 },
  { id: 'rv-arch-10',   cat: 'review', tier: 'silver',   name: 'Error Correction',    desc: 'Resolve and archive 10 mistakes.',         metric: 'mistakesArchived', goal: 10 },
  { id: 'rv-arch-50',   cat: 'review', tier: 'gold',     name: 'Zero Defects',        desc: 'Resolve and archive 50 mistakes.',         metric: 'mistakesArchived', goal: 50 },
  { id: 'rv-note-1',    cat: 'review', tier: 'bronze',   name: 'Marginalia',          desc: 'Write your first question note.',          metric: 'notesWritten', goal: 1 },
  { id: 'rv-note-20',   cat: 'review', tier: 'silver',   name: 'Annotated',           desc: 'Write notes on 20 questions.',             metric: 'notesWritten', goal: 20 },
  { id: 'rv-note-60',   cat: 'review', tier: 'gold',     name: 'The Lab Notebook',    desc: 'Write notes on 60 questions.',             metric: 'notesWritten', goal: 60 },
  { id: 'rv-bm-5',      cat: 'review', tier: 'bronze',   name: 'Dog-Eared',           desc: 'Bookmark 5 questions.',                    metric: 'bookmarks', goal: 5 },
  { id: 'rv-bm-25',     cat: 'review', tier: 'silver',   name: 'Curator',             desc: 'Bookmark 25 questions.',                   metric: 'bookmarks', goal: 25 },
  { id: 'rv-sess-10',   cat: 'review', tier: 'bronze',   name: 'Rep by Rep',          desc: 'Complete 10 practice sessions.',           metric: 'sessionsCompleted', goal: 10 },
  { id: 'rv-sess-50',   cat: 'review', tier: 'silver',   name: 'Set Machine',         desc: 'Complete 50 practice sessions.',           metric: 'sessionsCompleted', goal: 50 },

  // ——— Secret (hidden until unlocked) ———
  { id: 'night-owl',    cat: 'secret', tier: 'bronze', name: 'Night Owl',             desc: 'Answer a question correctly between midnight and 4 a.m.', flag: 'nightOwl',   secret: true },
  { id: 'quick',        cat: 'secret', tier: 'silver', name: 'Quick Thinker',         desc: 'Answer correctly in under 15 seconds.',    flag: 'quickThinker', secret: true },
  { id: 'unstoppable',  cat: 'secret', tier: 'gold',   name: 'Unstoppable',           desc: 'Answer 15 questions correctly in a row.',  flag: 'run15',      secret: true },
  { id: 'tome',         cat: 'secret', tier: 'silver', name: 'The Tome Arrives',      desc: 'Import the Conquering the Physics GRE markdown.', flag: 'tome', secret: true },
  { id: 'eve',          cat: 'secret', tier: 'gold',   name: 'Eve of Battle',         desc: 'Study on the day before the exam.',        flag: 'eveOfBattle', secret: true },
  { id: 'early-bird', cat: 'secret', tier: 'bronze', name: 'Early Bird', desc: 'Answer a question correctly between 5 and 7 a.m.', flag: 'earlyBird', secret: true },
  { id: 'crit-mass', cat: 'secret', tier: 'gold', name: 'Critical Mass', desc: 'Answer 30 questions in a single day.', flag: 'marathonDay', secret: true }
];
