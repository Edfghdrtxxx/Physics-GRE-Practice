/* Achievement definitions — 40 achievements in 7 categories × 4 tiers.
   Two kinds:
     metric-based: { metric, goal }  — progress computed from state (see gamify.js metrics)
     flag-based:   { flag }          — set once by a specific event
   Secret achievements are hidden until unlocked.
   Tier XP bonuses: bronze 25 · silver 50 · gold 100 · platinum 200. */
window.PGRE = window.PGRE || {};

PGRE.TIER_XP = { bronze: 25, silver: 50, gold: 100, platinum: 200 };

PGRE.ACH_CATEGORIES = [
  { id: 'progress',   name: 'Progress'   },
  { id: 'knowledge',  name: 'Knowledge'  },
  { id: 'dedication', name: 'Dedication' },
  { id: 'mastery',    name: 'Mastery'    },
  { id: 'plan',       name: 'Study Plan' },
  { id: 'exam',       name: 'Mock Exams' },
  { id: 'secret',     name: 'Secret'     }
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

  // ——— Secret (hidden until unlocked) ———
  { id: 'night-owl',    cat: 'secret', tier: 'bronze', name: 'Night Owl',             desc: 'Answer a question correctly between midnight and 4 a.m.', flag: 'nightOwl',   secret: true },
  { id: 'quick',        cat: 'secret', tier: 'silver', name: 'Quick Thinker',         desc: 'Answer correctly in under 15 seconds.',    flag: 'quickThinker', secret: true },
  { id: 'unstoppable',  cat: 'secret', tier: 'gold',   name: 'Unstoppable',           desc: 'Answer 15 questions correctly in a row.',  flag: 'run15',      secret: true },
  { id: 'tome',         cat: 'secret', tier: 'silver', name: 'The Tome Arrives',      desc: 'Import the Conquering the Physics GRE markdown.', flag: 'tome', secret: true },
  { id: 'eve',          cat: 'secret', tier: 'gold',   name: 'Eve of Battle',         desc: 'Study on the day before the exam.',        flag: 'eveOfBattle', secret: true }
];
