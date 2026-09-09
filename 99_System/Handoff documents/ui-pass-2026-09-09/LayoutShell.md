# LayoutShell — handoff (stopped early by Main, 2026-09-09)

Assignment: three shell layout defects (desktop footer overlap, sub-860px sidebar drawer, #/study-time 390px overflow). Stopped by Main mid-way; tree left consistent. Server `pgre-shell` (python3 -m http.server 8004) is still running via hub.

## Finished

1. Defect 1 (desktop footer overlap) — done in css/style.css.
   - `#sidebar` rule (~line 190): removed `overflow-y: auto` from the aside; added `#sidebar-nav { flex: 1 1 auto; min-height: 0; overflow-y: auto; }` so the link list is the only scrolling flex child.
   - SIDEBAR FOOTER block (~line 3042): dropped `position: sticky; bottom: 0` (footer now sits outside the scroll area, so it is redundant). Comment updated; glyph mention removed.
   - Verified after reload: 1440x900 navBottom 824 == footerTop 824; 1280x720 navBottom 644 == footerTop 644; 23 links; no page errors; PGRE.motion defined at first route. Screenshots: /tmp/pgre-layout/after-desktop-dashboard.png, after-laptop-dashboard.png. Before shots for all 3 viewports x 3 routes: /tmp/pgre-layout/before-*.png.
2. Performance2 patch applied to js/app.js boot guard (lines 666-675): boots immediately only when `readyState === 'complete'`, else waits for DOMContentLoaded (index.html now uses `defer`). Performance2 was told "applied".

## Not done (remains for the next agent)

- Defect 2: narrow-screen drawer. Nothing landed. A partial js/app.js hunk was written and then fully reverted; `PGRE.applySidebar` / `PGRE.toggleSidebar` are the original versions. The @media (max-width: 860px) block in css/style.css (~line 1203) is untouched: sidebar still renders inline as a wrapped link cloud (first card top at 648px at 390x844).
- Defect 3: #/study-time at 390px: scrollWidth 397. Cause measured: `.stweek-x` labels ("Jul 20", "Aug 10", "this wk") are `white-space: nowrap` at 10.5px (~30-36px each) inside 8 `.stweek-lab` flex:1 columns with gap 8px on a ~330px plot; the two `.card`s grow to 397px wide. `.stbar-x` day chart labels ("1w".."today") were not the overflow. Fix candidates (CSS only, no chart logic): `.stweek-lab { min-width: 0 }` + `.stweek-x { white-space: normal; text-align: center }`, or a `@media (max-width: 480px)` override on `.stweek-x`.

## Design notes for the drawer (from the reverted draft, for reuse)

- Decide narrow via `window.matchMedia('(max-width: 860px)')` in JS; never write to settings.sidebarFolded when narrow. Use a new body class (e.g. `sidebar-open`) plus a backdrop element (index.html is owned by Performance2 — coordinate, or create the scrim from app.js) using `var(--scrim)`.
- Toggle button already carries `aria-expanded` / `aria-controls="sidebar"`; keep `PGRE.setActiveNav` aria-current and `applyTheme` aria-pressed behaviour intact (tools/test-ux-interaction.js lines 899-926 assert them; harness matchMedia stub returns false for non-reduce queries, so narrow == false in tests).
- Close on backdrop click, Escape keydown, and in `PGRE.route` (hashchange). Focus first/aria-current link on open; return focus to `#sidebar-toggle` on close.
- Transition on `transform` using `--dur` / `--ease-out` from motion.css; the `prefers-reduced-motion` block there already collapses `--dur` to 1ms. Note `#sidebar, #topbar { transition: opacity .35s ease, display ... }` at ~line 3560 (zen mode) and `body.sidebar-folded #sidebar { display: none }` — the narrow rule must not fight either.
- Links at >= 40px tall on narrow (currently padding 6px 10px in the 860px block).
- `node tools/test-ux-interaction.js` was NOT run (stopped before end).

## Finished this session (LayoutFinisher, 2026-09-09)

Defects 2 and 3 landed. Cache-buster in `index.html` is `?v=20260909d` (search-replace of the one token). `buildNav` untouched. No new test files. `node tools/test-ux-interaction.js`: 108 passed, 0 failed.

### Defect 2 — overlay drawer below 860px

JS (`js/app.js`):
- `PGRE.isNarrow()` uses `matchMedia('(max-width: 860px)')`. Harness stub returns false for that query, so tests stay on the desktop persist path.
- Narrow: `body.sidebar-open` overlay. Never writes `settings.sidebarFolded`. Closed by default at boot.
- Desktop: existing `body.sidebar-folded` + persist unchanged.
- Scrim `#sidebar-scrim` created in JS (`var(--scrim)`), not in `index.html`.
- Close: scrim click, Escape, `PGRE.route` (hashchange). Open focuses `a[aria-current="page"]` (else first nav link). Close returns focus to `#sidebar-toggle` only if the drawer was actually open (boot does not steal focus).
- Closed drawer is `inert` + `aria-hidden` so off-canvas links are not in the tab order.
- Breakpoint cross: `matchMedia('change')` + `resize`, but a stay-narrow resize does not close an open drawer. Crossing to desktop calls `applySidebar(settings.sidebarFolded)` (clears inert). A leftover inert on desktop is also cleared on the next `route()`.

CSS (`@media (max-width: 860px)` shell block only):
- `#sidebar` is `position: fixed` off-canvas (`transform: translateX(-100%)`, `transition: transform var(--dur) var(--ease-out)`). `body #sidebar` beats the later zen `#sidebar, #topbar { transition: opacity }` so the slide keeps the motion tokens.
- `body.sidebar-folded #sidebar { display: flex; opacity: 1 }` so a leftover desktop fold class cannot `display: none` the drawer. JS also strips that class while narrow.
- Nav is a column (`flex-wrap: nowrap`), links `min-height: 40px`. Headings/mono/weight stay visible (no chip-cloud).
- `body.exam-fullscreen` / `body.focus-zen` still `display: none` the sidebar; scrim is also hidden in those modes.

Measurements (Chromium, `http://127.0.0.1:8034`, 0 console errors):
- 390x844 `#/`: sidebar `position:fixed`, closed `left: -280`, not an in-flow wrap (`flex-wrap: nowrap`). First dashboard card (`.hero.card`) top **115–118px** (was 648). Toggle `aria-expanded=false`. Open: `left: 0`, width 280, focus `data-nav=dashboard`. Close via scrim / Escape / `#/exam` and `#/study-time` hash: drawer off-canvas, focus `#sidebar-toggle`. Link height 40. `sidebarFolded` memory+disk stayed **false** across open/close.
- 1440x900: rail `position:sticky` width 252. Fold: `display:none` / width 0 after the pre-existing zen `display` transition settles (~350ms). Unfold restores 252. `navBottom 824 == footerTop 824` (23 links; last link layout-bottom 1134 is overflow inside the scrolling nav, not visual overlap). Persist writes `sidebarFolded` on desktop only.

### Defect 3 — `#/study-time` 390px overflow

CSS only on `.stweek-lab` / `.stweek-x`: `min-width: 0` + `white-space: normal; text-align: center`. Chart JS unchanged.
- 390x844 `#/study-time`: `document.documentElement.scrollWidth === clientWidth === 390` (was 397). Cards 358px wide inside 16px view padding.

### Leftover risk

- Fold hide on desktop still rides the zen `#sidebar { transition: display .35s allow-discrete }` — `getComputedStyle` reports `display:flex` for a few hundred ms after the class flips; the rail does hide once it settles. Pre-existing, not introduced here.
- Drawer nav scrolls; Dark mode footer is pinned. Remaining knowledge-portal links sit in overflow below the footer box (same pattern as desktop). Not a visual overlap.
- Headless `setViewport` does not always fire `matchMedia('change')`; a `resize` listener covers real window resizes. If a client changes width without either event, leftover `inert` clears on the next hashchange.
- `body #sidebar` at 860px is more specific than the zen transition rule; if zen-on-narrow ever needs an opacity fade on the rail, it will not get one (exam/zen already `display:none` the sidebar).
- Cache-buster bumped a→b→c→d in this session as CSS/JS changed under verification. Final token: `20260909d`.

