---
title: Adversarial review — topic-set packs 01–35 + launch
type: review
created: 2026-09-15
repo: "/Users/Reid Hu/Physics GRE"
related_vault: "/Users/Reid Hu/OrbitOS/20_Project/GRE_Physics_Prep"
---
# Adversarial review: packs, launch, syllabus rewrite

Scope: Studio pack catalog 01–35, `PGRE.launchPack` → `#/practice/custom`, vault/plan/daily language.

## Packs

- Shipped catalog is `js/data-packs.js`. Lookup is `PGRE.packById` in `js/packs.js`.
- `node tools/test-packs.js` loads that catalog plus shipped `js/bank.js` against the real local practice pool (preview + cpg + ets-drill). Two runs: **212 passed, 0 failed** each.
- Every key 01–35 present; `n === ids.length` and `n >= 1`; ids unique within and across packs; every id resolves in the default pool; no `cpg-exam` / `ets-exam`.
- Thin themes kept short (pack 07 n=4 fluids; pack 24 n=5 hydrogen; pack 35 n=6 astro+math). Titles recut where the old 25-Q theme had no bank: **07** Fluid Statics & Dynamics (no Coriolis in pool); **35** Astrophysics, Cosmology & Math Methods (no fake comprehensive dump).

## Launch

- One path: `PGRE.launchPack(id)` writes `sessionStorage['pgre-quiz-config'] = { ids, label }` and sets `#/practice/custom`. Convenience hash `#/practice/pack/<NN>` calls the same function.
- `node tools/test-pack-launch.js` drives the **shipped** `launchPack` (ordinary pack 03 n=8, thin pack 07 n=4). Two runs: **21 passed, 0 failed** each.
- Chrome (`tools/test-pack-launch-chrome.js`): serve `index.html`, call shipped `launchPack`, assert practice surface **Question 1 of that pack’s n** plus the pack label. Two launches each of 03 and 07. Both matched. Screenshots in the implementer scratch dir.
- Finding (fixed in this diff): a second `launchPack` while already on `#/practice/custom` did not remount (same hash, no `hashchange`), so pack 07 still showed pack 03’s n=8. `launchPack` now calls `PGRE.route()` when the hash is already custom. Chrome re-run shows 03 n=8 then 07 n=4.

## Syllabus rewrite

- Live vault: `8-Week-Syllabus.md`, `03_Topic_Sets/*.md` (all 35 headings name Studio pack + honest n), `GRE_Physics_Prep.md` weekly row, `Misses-Log.md`, start-my-day Learning Target + SKILL example, today’s `10_Daily/2026-09-15.md` GRE child and Notes summary.
- `node tools/build-plan.js` regenerated `js/data-plan.js` (version 2026-09-15). PLAN_SETS titles match the recut 07/35 names. Plan-engine labels append `(n=N)` from `PGRE.PACKS` when loaded.
- Language scan of those live surfaces: no remaining **25 Qs** / **Q1–25** / **25-item** / **Kahn PS · 25** claims. Historical dailies before today were left as-is (non-goal).

## Open findings

None. No user-waived items.

## Residuals (not success-criteria failures)

- Pack membership is a frozen id list. Bank growth does not auto-rebuild packs; re-run the assigner against the pool and rewrite `js/data-packs.js`.
- `startCustom` still shuffles the resolved ids (existing custom-quiz behavior). The pack is a bag of ids, not a numbered Q1…Qn script.
- Agent ask-then-open / auto-open Chrome is still out of scope; open only on explicit request.
