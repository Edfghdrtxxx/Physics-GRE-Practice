# Physics GRE · Prep Studio

A personal, fully-local practice site for the GRE Physics Test — exam day **November 1, 2026**.
No accounts, no network calls: progress lives in your browser (localStorage + IndexedDB),
libraries are vendored, and the whole thing is plain HTML/CSS/JS with no build step.

## Run it

```bash
cd "/Users/Reid Hu/Physics GRE"
python3 -m http.server 8000
```

Then open **http://localhost:8000**.

(Double-clicking `index.html` mostly works too, but some browsers restrict IndexedDB
on `file://` pages — the local server is the reliable way.)

## What's inside

| Page | What it does |
|---|---|
| **Dashboard** | Level + XP bar, exam countdown, day streak, stat tiles, today's 3 challenges, week-at-a-glance, all 9 topic portals, achievements summary, recent activity |
| **Knowledge portals** (×9) | One per exam topic with official weights (CM 20% … LM 6%): mastery/accuracy stats, subtopic map, practice launcher, and a Notes section that renders imported book chapters (markdown + KaTeX, offline) |
| **Practice** | GRE-style 5-choice questions with instant feedback, worked solutions, and XP — all math written in LaTeX and typeset offline by KaTeX. Mixed pool of ~366 questions: 20 preview + 146 *Conquering the Physics GRE* chapter problems + 200 drills from the two oldest released ETS forms (GR8677/GR9277) |
| **History** | Every answer ever given, kept for good: question, your pick vs. the correct one, time taken, and its session. Session list + filterable attempt log |
| **Mistake book** | Every missed question with your wrong pick beside the solution. Re-drillable anytime; resurfaced on a spaced-repetition ladder (1→3→7→14→30→60 days). Solving never removes an entry — only your manual Archive does |
| **Formula recall** | Vocabulary-app flip cards: recall, flip, self-grade Again/Hard/Good/Easy → SM-2 intervals and a daily due queue. 334 cards extracted from the book; Match/Type/Cloze/Auto-quiz flash modes plus a daily check-in |
| **Study plan** | Sep 14 → Nov 1 · 7 live weeks · 5+6+2 (~16 h/wk) · generated from the vault syllabus via tools/build-plan.js |
| **Achievements** | 80 achievements across 10 categories, 7 secret |
| **Library** | Import the *Conquering the Physics GRE* markdown (drag & drop), map its sections to topics, export/restore/reset all progress |
| **Mock exam** | Timed simulator: weighted 70-question/120-minute draw, or verbatim replay of the 5 released ETS exams (incl. the 70-question 2024 form) and the book's 3 sample exams. Official scale tables where published |
| **Focus timer** | Pomodoro-style focus sessions with ambient sound, session log, and per-day study-time totals |
| **Concept visualization** | Interactive teaching widgets (10 trio visualizers + spherical harmonics) under `#/concepts`, plus a Formula Lab |
| **Analytics & tools** | Study-time page, per-topic analytics, custom quiz builder, global search, notes & bookmarks |

## Content

The question bank is already in: `content/bank/` (gitignored, generated) holds the
146 chapter problems, 3 sample exams, 334 formula cards, and the released ETS
exams. `js/bank.js` merges the practice pool; intact exams stay out of it so they
remain fresh for simulation.

The **Library** page still imports the *Conquering the Physics GRE* markdown
(drag & drop, stored in IndexedDB) — its chapters render in each portal's Notes
card once sections are mapped to topics.

## Where things live

```
index.html          app shell (hash-routed SPA)
css/                stylesheets (Anthropic-inspired theme, fonts, visualizer, print)
js/                 app logic: stores/engines (store, srs, gamify, bank, exam-engine,
                    plan-engine, timer), seed data (data-*.js), views (view-*.js),
                    router (app.js), teaching widgets (visualizers/)
simulations/        standalone interactive physics visualizers (oscillator.html)
tools/              offline build scripts, extraction pipelines, test runners
content/            question banks, book/ETS figures, raw question sources
20_docs/            project specs (Project Docs/), reference PDFs (ETS, Kahn)
99_System/          meta documents and cross-agent handoffs
fonts/              locally hosted web fonts
vendor/             marked + KaTeX (offline)
```

Backup: **Library → Export progress** writes a JSON snapshot you can restore anytime.
