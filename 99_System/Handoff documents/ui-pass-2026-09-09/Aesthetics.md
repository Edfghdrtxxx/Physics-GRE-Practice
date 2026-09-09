# Aesthetics pass — 2026-09-09

## What changed

1. Ambient particle canvas removed (clean cutover, no setting added; there is no settings surface beyond the theme toggle and a half-hidden effect was judged worse than none).
   - Deleted `css/ambient.css` and `js/ambient-fx.js`.
   - `index.html`: removed the `ambient.css` link and the `ambient-fx.js` script tag; comment before `motion.js` reworded. (Requested from Performance over hub; they went idle without applying it, so I made the two-line edit myself and broadcast the change.)
   - `js/app.js`: removed the two `PGRE.ambient.setIntensity(...)` lines in the route function. (Same story with LayoutShell.)
   - Nothing else referenced `PGRE.ambient`, `.ambient-fx` or the file names (grep of the whole repo; tools/ has no test for it). `.focus-ambient` on the focus page is an unrelated CSS backdrop and is untouched.
2. Button radius normalised to the control token in `css/style.css`: `.btn { border-radius: 10px }` -> `var(--ctl-r)` (8px); `.btn-sm { border-radius: 8px }` -> `var(--ctl-r)`. Buttons now match `.topbar-arrow`, `a.today-learn`, `.focus-open`, `.exam-*` controls and the inputs which already used the token.

## Computed-style audit (1440x900, light theme; dashboard, #/topic/cm, practice, formulas, achievements)

Collected via `getComputedStyle` on every visible element in `#main`.

| Element class | Property | Values found | Verdict |
| --- | --- | --- | --- |
| `.card`, `.hero.card`, `.stat-tile`, `.topic-card`, `.ach-card`, `.practice-card`, `.portal-head` | radius / shadow / border | all `12px / none / 1px solid #e6dfd8` | Consistent already (`--radius`, `--line`, no shadow). No change. |
| `h1` (all 5 routes) | font | Newsreader 400 28px everywhere | Consistent. |
| `h2` | font | Inter 500 19px; `.section-title` Inter 500 22px | One deliberate size step for section titles; not an inconsistency. |
| `h3.caught-up` | font | Inter 500 17px | Consistent with "headings below h1 are sans 500". |
| `.btn`, `.btn-primary`, `.btn-ghost` | radius | `10px` while `.topbar-arrow`, `.today-learn`, `.focus-open`, inputs use `--ctl-r` 8px | FIXED (tokens: `.btn`, `.btn-sm` -> `var(--ctl-r)`). |
| `.portal-group` (topic portal) | radius | `10px` bordered box | Inside topic/portal feature section, not mine. Left as is; it is a bordered sub-panel, a 10px step between 8px controls and 12px cards is defensible. Not handed off. |
| `.flash-tabs` 10px / `.flash-tab` 7px | radius | one-off values | InteractionB's flash section; reported here rather than sent, since the nested 10/7 pair is intentional (outer/inner). |
| `.mono` topic badge 9px, `.nav-mono` 6px, `.key-hint` 3px, `.meter` 4px | radius | small decorative one-offs | Left; sub-8px radii on 18-22px-tall glyph chips are proportional, not drift. |
| box-shadow | any | none on any card; only `.toast`, `.exam-overlay-card`, `.fs-card.is-open` use `0 1px 3px var(--shadow)`; focus rings use the sanctioned coral alpha | Consistent with the "no shadows" rule. |
| serif at weight != 400 | font | none found | Clean. |
| Inter >= 600 | font | only chips/badges/labels (`.crumb-here`, `.tier-chip`, `.filter-btn`, `.choice-letter`, `.mono`) | Small-caps/label voice; no headings or body at 600+. |

## Dark theme spot-check (`PGRE.setTheme('dark')`, same five routes)

Scanned every visible element for light backgrounds/borders and dark-on-dark text. Only hits:
- `rgb(250,249,245)` backgrounds on `.btn-primary`, `.flash-tab.active`, `.browse-tab.active`, `.filter-btn.active`, `.skip-link` — these are `background: var(--ink)`, the intended inverted primary control. Token-driven, not hard-coded.
- tier borders/dots in `--bronze/--silver/--gold/--platinum` — decorative medal tokens, intended.
- No `#fff`/`#fafafa`-style literals leak: the only literal light colours in style.css outside the token blocks are `.q-fig img { background:#fff }` (documented: ETS figure plates) and `.fci-badge { color:#fff }` on a coral fill (= `--on-accent`).
No dark-block edits were needed.

## Typography: `--ink-3` as body copy

Across all 23 sidebar routes, scanned for elements coloured `rgb(142,139,130)` carrying >= 25 chars of own text at >= 14px: zero hits. `--ink-3` is used only for captions, meta, chips, placeholders and struck-through done tasks. Nothing to fix.

## Verification

- Served with `python3 -m http.server 8005`; headless Chromium at 1440x900 and 390x844.
- `document.querySelector('.ambient-fx')` is null and `PGRE.ambient` is undefined on all five routes, both themes, with cache disabled.
- 0 console errors, 0 page errors, 0 HTTP >= 400 across the run (after the stale `ambient.css`/`ambient-fx.js` requests disappeared with the index.html edit).
- Screenshots: `/tmp/pgre-aesthetics/before-<route>-1440.png`, `dark-<route>-1440.png` (before), `after-light-<route>-1440.png`, `after-dark-<route>-1440.png`, `after-light-dashboard-390.png`.

## Open / for other owners

- Sidebar footer overlap: at 1440x900 the "Dark mode" toggle in `#sidebar-footer` (top 824) overlaps the last nav rows (nav bottom 1134, sidebar scrollHeight 1211) — visible in every screenshot. LayoutShell owns the sidebar; flagged here.
- The `--radius`-vs-10px sub-panels (`.portal-group`, `.miss`, `.note-chapter`, `.hist-session`, `.flash-tabs`, `.srch-stat`, `.stbar-*`) are a consistent "inner panel" step of 10px. If a token is wanted, add `--radius-sm: 10px` and sweep; not done here to avoid touching sibling sections mid-flight.
