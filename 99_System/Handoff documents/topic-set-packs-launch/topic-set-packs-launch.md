---
title: topic-set-packs-launch — residue brief
type: handoff-brief
created: 2026-09-15
repo: "/Users/Reid Hu/Physics GRE"
related_vault: "/Users/Reid Hu/OrbitOS/20_Project/GRE_Physics_Prep"
---
# Residue (not the prompt)

## Already true
- Custom practice already consumes `sessionStorage['pgre-quiz-config']` = `{ ids, label, criteria? }` then `#/practice/custom` (`js/view-build.js`, `js/view-practice.js`).
- Practice pool merge + spoiler rule: `js/bank.js`, Prep Studio `AGENTS.md` Content Rules (intact exams out of daily pool; GR8677/GR9277 as `ets-drill` only).
- Vault syllabus still labels many sets as fixed **25 Q** + Kahn “Practice Set N” (`20_Project/GRE_Physics_Prep/03_Topic_Sets/`, `01_Syllabus_&_Plan/8-Week-Syllabus.md`). Plan codegen: `tools/build-plan.js` → `js/data-plan.js`.
- 2026-09-15 bank spot-check (do not treat as final inventory): book CM ≈26 across ch.1 sections; osc-ish book handful; CM ets-drill ≈41; osc-ish drills ≈8. Full practice pool order-of-magnitude ~366. Fixed 25×35 does not match unique pool.

## Open implementation surface (follow-up owns HOW)
- Pack source of truth: **Prep Studio primary** (user-confirmed 2026-09-15).
- Scope: **all topic sets 01–35** + launch handoff + **full syllabus rewrite** to honest pack n (user-confirmed).
- Agent open habit (ask-then-open, lavish-axi-shaped) is desired product behavior once packs+launch exist; not a substitute for packs.

## Risks / leftovers
- Thin themes cannot fill old “25” without lying or pulling off-theme ids — syllabus must flex (merge, short n, or recut themes), not a generic CM-25 fallback.
- `build-plan.js` / daily-note injection / start-my-day learning-target may still assume 25 and Kahn PS labels — cutover must not leave a second calendar.
- Copyright: bank/PDF paths stay gitignored; packs may list ids only.

## FINDINGS / review artifacts
Write under this folder:
`/Users/Reid Hu/Physics GRE/99_System/Handoff documents/topic-set-packs-launch/`
On goal completion, run an **adversarial review stage** and leave the review artifact here before claiming done.
