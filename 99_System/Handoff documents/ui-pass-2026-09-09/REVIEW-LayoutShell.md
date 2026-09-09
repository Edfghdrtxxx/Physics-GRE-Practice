# REVIEW — LayoutShell (adversarial)

Reviewer: LayoutReviewer. Date: 2026-09-09. Read-only on application code. Write-only this file.

Live checks on `http://127.0.0.1:8044` (`?v=20260909d`) at **390x844** and **1440x900** (headless Chromium). Screenshots: `/tmp/pgre-layoutrev/390-dash-closed.png`, `390-dash-open.png`, `390-study-time.png`, `1440-dash-rail.png`.

This is not a rubber stamp. Success-criteria claims were re-measured, not copied from `LayoutShell.md`. Leftover risks (350 ms fold transition, drawer nav overflow, matchMedia vs setViewport) were exercised.

Confidence key: **high** = source + live; **medium** = source and/or one viewport; **low** = inferred / not fully exercised.

Line numbers are as of this write (`css/style.css` drifted ~14 lines while InteractionFixer inserted practice/exam/disabled-button rules above the shell block; the `@media (max-width: 860px)` drawer rules and `.stweek-*` were not rewritten).

---

## 1. Confirmed claims (and how)

### 390 `#/`: closed-by-default overlay drawer, not an in-flow wrap-cloud
**Confirmed (high).**

Source: `css/style.css:1217–1244` (`position: fixed`, `transform: translateX(-100%)`, `flex-wrap: nowrap`); `js/app.js:647–650` boot path `applySidebar` → `applySidebarDrawer(false)` when `isNarrow()`.

Live 390x844 `#/`:

| probe | value |
|---|---|
| `PGRE.isNarrow()` / `matchMedia('(max-width: 860px)')` | true |
| `#sidebar` | `position:fixed`, `transform: matrix(1,0,0,1,-280,0)`, rect `x: -280`, width 280, `pointer-events: none` |
| `#sidebar-nav` | `flex-direction: column`, `flex-wrap: nowrap` |
| `body` class | `""` (no `sidebar-open`) |
| toggle | `aria-expanded=false`, label `Show sidebar` |
| `inert` / `aria-hidden` | true / `"true"` |
| link count | 23 |
| first paint focus | `BODY` (boot did not steal focus) |

Screenshot `390-dash-closed.png`: hamburger + breadcrumb + hero; no 23-link chip cloud above the content.

### First dashboard card (`.hero.card`) above the fold
**Confirmed (high).** `.hero.card` top **115 px**, left 16, 358×303. Viewport height 844. (Unit report said 115–118.)

### Open via ☰ focuses `aria-current`; close via scrim / Escape / hashchange; focus returns to `#sidebar-toggle`
**Confirmed (high).** `js/app.js:638–644, 613–614, 706–710, 513`.

| action | drawer | focus | `sidebarFolded` mem |
|---|---|---|---|
| click `#sidebar-toggle` | `left: 0`, width 280, `body.sidebar-open` | `a[data-nav=dashboard]` (`aria-current="page"`) | false |
| click scrim at (340,400) | `x: -280`, scrim `display:none` | `#sidebar-toggle` | false |
| Escape | same | `#sidebar-toggle` | false |
| hash `#/exam` then `#/study-time` (from an open drawer) | off-canvas | `#sidebar-toggle` | false |

Open: scrim `display:block`, z 35, `rgba(20,20,19,0.44)`. Links `min-height` / measured height **40 / 40** (all 23).

### Narrow never persists `settings.sidebarFolded`
**Confirmed (high).** `js/app.js:668–671` returns before `s.sidebarFolded = !…`. Memory stayed **false** across open/close/scrim/Escape/hash at 390. Desktop fold (below) *does* write `pgre-state-v1`.

### 390 `#/study-time`: no horizontal overflow
**Confirmed (high).** `css/style.css:4151, 4154` (`.stweek-lab { min-width: 0 }`, `.stweek-x { white-space: normal; text-align: center }`).

Live: `document.documentElement.scrollWidth === clientWidth === 390`. Cards 358 px inside 16 px padding. Eight `.stweek-lab` columns 30 px, labels `"Jul 20"` … `"this wk"` wrapping. Chart JS untouched.

Internal leftover, not document overflow: `.stbar-strip` scrollWidth 313 vs clientWidth 308 (~5 px). Does not move `documentElement.scrollWidth`.

### 1440: desktop rail + fold persist; `navBottom == footerTop`
**Confirmed (high).** `css/style.css:194–207, 3105–3108`.

Live 1440x900 `#/`: rail `position:sticky` width **252**, `transform: none`, not inert. 23 links. **`navBottom 824 == footerTop 824`**. Last link layout-bottom **1134** (overflow inside `#sidebar-nav`, not visual overlap). Last *visible* link was EM (bottom 777).

Fold via ☰: `settings.sidebarFolded` memory **and** `localStorage['pgre-state-v1']` → `true`; `aria-expanded=false`; after the display transition, `display:none`. Unfold restores 252 / sticky / `navBottom 824 == footerTop 824` / disk `false`.

### `body.exam-fullscreen` and `body.focus-zen` hide sidebar + scrim
**Confirmed (high).** `css/style.css:1341, 1269–1270, 3622`.

- 390 `#/exam/run` (70-set): `body.exam-fullscreen`, sidebar `display:none` (rect 0×0), scrim `none`, topbar `none`. Forcing `sidebar-open` and `sidebar-folded` on top still `display:none` (exam rule wins equal-specificity later rule vs `body.sidebar-folded #sidebar { display:flex }` at `:1223`).
- 390 `#/focus` Zen: `body.focus-zen`, sidebar `none`, scrim `none`. Same with forced `sidebar-open`. Topbar hid after the 350 ms display transition (`block` at ~400 ms, `none` at ~800 ms) — sidebar/scrim hid immediately because `body #sidebar` (`:1227`) overrides the zen transition to `transform` only.

### Closed drawer not in tab order
**Confirmed (high).** 12 Tabs from `#sidebar-toggle` at 390 closed: topbar back/fwd, Home, Today, focus controls, skip-link, back to toggle. **Zero hops inside `#sidebar`.** `inert` + `aria-hidden="true"` present. (`tabIndex` on the links is still 0; `inert` is what removes them.)

### Stay-narrow resize does not close an open drawer
**Confirmed (high).** `js/app.js:713–715` (`if (n === PGRE._narrow && n) return`). 390 open → setViewport 500: still `sidebar-open`, `position:fixed`, not inert.

### Cache-buster / test harness path
**Confirmed (medium).** `index.html` still `?v=20260909d`. `PGRE.isNarrow` (`js/app.js:603–604`) uses `matchMedia('(max-width: 860px)')`. The UX harness stub returns false for non-reduce queries, so tests stay on the desktop persist path (as claimed).

---

## 2. Leftover risks — verified, not taken on faith

### Desktop fold still rides the 350 ms `display` transition
**Confirmed (high).** `css/style.css:3615–3617` (`transition: … display .35s ease allow-discrete`). After ☰ fold at 1440:

| t (ms) | `display` | `opacity` |
|---|---|---|
| 0 | flex | 1 |
| 100 | flex | 0.62 |
| 200 | flex | 0.17 |
| 350 | flex | ~0.001 |
| 450 | **none** | 0 |

Pre-existing; not introduced by the drawer. `getComputedStyle` reports `flex` until the discrete transition settles. Rail *does* hide.

### Drawer nav overflow; Dark mode footer pinned
**Confirmed (high).** 390 open: `#sidebar-nav` height 671, `scrollHeight` 984; last link bottom 1080; footer 768–818. Same pattern as desktop (last link 1134 vs footer 824). Not a visual overlap of the last *visible* link. Screenshot `390-dash-open.png` cuts CM at the footer hairline.

### `setViewport` does not fire `matchMedia('change')` *or* `resize`; a real `resize` event does
**Confirmed (high).** `js/app.js:712–724`.

Headless `page.setViewport` updates `matchMedia('(max-width: 860px)').matches` but **does not** run `onBreak`: `PGRE._narrow` stays stale.

| cross | silent setViewport | after `window.dispatchEvent(new Event('resize'))` |
|---|---|---|
| 390 **closed** drawer → 1440 | rail looks right (`sticky` 252, `x:0`) but **`inert` leftover**, `aria-hidden="true"`, `focus()` on a nav link fails, `_narrow` still true | `_narrow` false, inert cleared, `aria-hidden` removed |
| 390 **open** drawer → 1440 | rail 252, inert already false, leftover `body.sidebar-open` (no desktop CSS for that class). Not wrap-cloud, not `display:none` | `applySidebar` strips `sidebar-open` |
| 1440 **folded** → 390 | overlay off-canvas (`x:-280`), `flex-wrap:nowrap`, hero top 115, leftover `sidebar-folded` (narrow CSS restores `display:flex` at `:1223`). **`inert` missing** | class cleaned, `inert` + `aria-hidden` applied, still closed, `sidebarFolded` mem still true (not overwritten) |

Hashchange at desktop with leftover inert **does** clear it (`js/app.js:514–518`). Hashchange does **not** clear leftover `body.sidebar-open` when inert is already false (the `else` branch only runs if `inert` / `aria-hidden`). Harmless on desktop: `body.sidebar-open` rules live only inside the 860 px block.

This matches the unit’s own leftover note. It is **not** a broken rail for a user dragging a window (resize fires). It **is** a broken rail (inert, untabbable) if some client changes width without resize/change.

---

## 3. Bugs / nits (not success-criteria fails)

### [low] Silent breakpoint cross can leave an inert desktop rail or a tabbable off-canvas drawer
Mechanism above. File: `js/app.js:713–724` plus `route` `:514–518`. Severity **low** for real windows; **medium** if a future test or embed uses `setViewport` without dispatching `resize`. The unit disclosed it.

### [nit] `#sidebar-scrim` is an unstyled flex child on desktop
`js/app.js:616` appends the scrim to `document.body`. All scrim CSS (`:1259–1270`) is inside `@media (max-width: 860px)`. Live 1440: scrim `display:block; position:static; width:0; height:3306; x:1440`. Main still starts at x 252, width 1188 — no width stolen. Empty third flex item. Harmless; a desktop `display:none` / `position:fixed` rule would make the node inert in the layout tree.

### [nit] Stay-desktop resizes always call `applySidebar`
`onBreak` early-returns only when `n === _narrow && n` (stay-narrow). A desktop-to-desktop resize re-applies fold state every event. No user-visible break observed.

### [nit] `.stbar-strip` still overflows itself by ~5 px at 390
Does not violate `documentElement.scrollWidth === clientWidth`. The original 397 px document overflow was the `.stweek-x` nowrap labels; that is gone.

---

## 4. Concurrent `css/style.css` / test contamination

InteractionFixer was given the practice/exam/disabled-button region of `css/style.css` after measurements-in. Post-measure snapshot: the drawer `@media (max-width: 860px)` block is intact at `:1217–1284`; `.stweek-lab` / `.stweek-x` intact at `:4151, 4154`. Exam hide rule still `:1341` (InteractionFixer added `body.exam-fullscreen { overflow: hidden; height: 100%; }` at `:1344` — not a drawer regression; 390 exam-room hide was measured *before* that insert).

`node tools/test-ux-interaction.js`: **107 passed, 1 failed** (`click undoLast restored SRS` in formulas). LayoutShell did not touch `js/view-formulas.js`. LayoutFinisher reported 108/0. Treat the fail as **concurrent InteractionFixer**, not a LayoutShell regression. Shell aria assertions in that file (setActiveNav / applyTheme) all passed.

---

## 5. Explicitly unchecked / uncertain

- Real OS window drag across 860 px (not headless `setViewport`). Resize-event path was simulated with `dispatchEvent('resize')` only.
- `matchMedia('change')` listener (`js/app.js:719–722`) — not observed to fire under `setViewport`; not separately dispatched.
- Dark theme, `prefers-reduced-motion` drawer slide (`--dur` → 1 ms in motion.css).
- Screen-reader announcement of `aria-expanded` / `aria-hidden` / `inert`.
- 390 `#/` first paint with a *saved* `sidebarFolded: true` from a previous desktop session (narrow boot calls `applySidebarDrawer(false)` and strips the class; source-only, not reloaded from a dirty store).
- 1280×720 footer geometry (unit claimed `navBottom 644 == footerTop 644`; this review measured 1440×900 only).
- Console on 1440 beyond `#/` (390 `#/`, `#/study-time`, `#/exam`, `#/focus`: **0** console errors / pageerrors).
- `body.exam-fullscreen` hide after InteractionFixer’s later exam CSS insert (measured before).
- Formulas undo SRS test fail (see §4).

---

## Verdict

**Pass** vs the 390 drawer + above-the-fold + study-time overflow success criteria.

- 390 `#/` is a closed overlay drawer (`x: -280`, not a wrap-cloud). `.hero.card` top 115. Open focuses Dashboard; close via scrim / Escape / hashchange returns focus to `#sidebar-toggle`. Links 40 px. `sidebarFolded` not written while narrow. Closed drawer is `inert` and out of tab order.
- 390 `#/study-time`: `scrollWidth === clientWidth === 390`.
- 1440 rail + persist + `navBottom == footerTop == 824` hold. Exam/zen still hide sidebar + scrim.

Do **not** treat “crossing 860 px never leaves inert” as true for headless `setViewport` without a resize event. For a real window resize, `onBreak` clears it. That leftover is verified, not a fail of the written 390/1440 success criteria.
