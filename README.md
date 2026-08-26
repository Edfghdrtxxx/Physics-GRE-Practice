# Physics GRE · Prep Studio

A personal, fully-local practice site for the GRE Physics Test — exam day **October 28, 2026**.
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
| **Practice** | GRE-style 5-choice questions with instant feedback, worked solutions, and XP — all math written in LaTeX and typeset offline by KaTeX. Currently a 20-question preview bank spanning all topics |
| **History** | Every answer ever given, kept for good: question, your pick vs. the correct one, time taken, and its session. Session list + filterable attempt log |
| **Mistake book** | Every missed question with your wrong pick beside the solution. Re-drillable anytime; resurfaced on a spaced-repetition ladder (1→3→7→14→30→60 days). Solving never removes an entry — only your manual Archive does |
| **Formula recall** | Vocabulary-app flip cards: recall, flip, self-grade Again/Hard/Good/Easy → SM-2 intervals and a daily due queue. Deck is empty by design until the book import fills it |
| **Study plan** | Jul 13 → Oct 28, intensive (~15–17 h/wk): 16 weeks, 3 phases, 90 checkable tasks incl. 5 released ETS practice tests. Current week auto-opens; tasks grant XP |
| **Achievements** | 36 achievements, 6 categories × Bronze/Silver/Gold/Platinum, 5 secret |
| **Library** | Import the *Conquering the Physics GRE* markdown (drag & drop), map its sections to topics, export/restore/reset all progress |
| **Mock exam** | Designed but deferred until the real question bank arrives — see `20_docs/Project Docs/DESIGN.md` |

## The content that's still coming

The site is a **frame**: 20 hand-written preview questions stand in until the
*Conquering the Physics GRE* markdown arrives. When it does:

1. Drop the file in the **Library** page (it's stored locally in IndexedDB), or keep a
   copy in `content/` for reference.
2. Assign its sections to topic portals — they render in each portal's Notes card immediately.
3. The structure-aware parser (chapters → question bank) gets written against the real
   file's format; plan and spec are in `20_docs/Project Docs/DESIGN.md` §3.

## Where things live

```
index.html          app shell (hash-routed SPA)
css/                stylesheets (Anthropic-inspired theme, fonts, visualizer, print)
js/                 app logic, stores, engines, seed data (data-*.js), views (view-*.js)
simulations/        standalone interactive physics visualizers (oscillator.html)
tools/              offline build scripts, extraction pipelines, test runners
content/            question banks, book/ETS figures, raw question sources
20_docs/            project specs (Project Docs/), reference PDFs (ETS, Kahn)
99_System/          meta documents and cross-agent handoffs
fonts/              locally hosted web fonts
vendor/             marked + KaTeX (offline)
```

Backup: **Library → Export progress** writes a JSON snapshot you can restore anytime.
