# FINDINGS-g2

Trio file: `js/visualizers/trio-g2.js`. IDs kept exactly: `cpgf-1.4`, `cpgf-1.22`, `cpgf-1.20`. Chrome (stacked canvas / legend strip / controls) is engine+CSS; this file only paints the pictures and writes the legend.

Canvas dry-run (mock 2d context, empty `{}` state and defaults, including cut-tether / CW Ω / all three torque modes): `draw` does not throw. No screenshots in this child pass (Lab IndexedDB deck not driven here).

## cpgf-1.4

- **Native-to-site?** Yes. First fill is cream `#faf9f5`. Ink / coral / gold / teal / rose / emerald only. Neon green fly-off trail and pink snap marker are gone.
- **Full-width + controls below?** Yes. Full-canvas orbit; sliders stay in the engine strip under the drawing.
- **Legend strip clear of motion?** Yes. `CV.drawHUD` overlay removed. Numbers go through `PGRE.appendVizLegend` (`F_c`, `m`, `v`, `r`, `K`, work = 0, path).
- **Remaining collision?** Short `T = F_c` and `v` pills sit on perpendicular arrows with cream backing, clamped inside the orbit margin. After a cut, `release` and `v const` can sit near each other for a frame or two while the mass is still at the snap point, then they separate. Caption lives in a reserved 28 px top band, not on the circle. Pivot word-label was dropped so it would not ride the tether.
- **Redesigned or restyled?** Restyled. Same teaching: uniform circle with tension as the real inward force, then Newton-I tangent fly-off when the tether is cut. Visual radius is fitted so arrows stay on the canvas; physics still uses the slider `r`.

## cpgf-1.22

- **Native-to-site?** Yes. Cream stage, coral inertial table, gold rotating table, teal curved path, violet `F_Cor`, gold `F_cent`. Magenta / fuchsia / neon green / white divider are gone.
- **Full-width + controls below?** Yes. Two equal full-height panels on one canvas; controls stay below.
- **Legend strip clear of motion?** Yes. Bottom-of-canvas HUD box removed. Legend holds `Ω`, `|F_Cor|`, `|v_rot|`, deflection side, work = 0.
- **Remaining collision?** Frame titles sit in a reserved top band (`Lab frame (inertial)` / `Turntable frame (rotating)`); panel trails and arrows are clipped below that band. Foot captions sit in a reserved bottom band. Rotating-frame chips: the `v_rot` pill is gone (arrow kept; `|v_rot|` is in the legend). `F_Cor` and `F_cent` sit just beyond their arrow tips. If those chip centers are within 28 px or their cream boxes overlap, the shorter chip (`F_cent`) is pushed out along a perpendicular until the boxes clear, then clamped to the right panel so they cannot restack.
- **Redesigned or restyled?** Restyled. Same two-frame teaching picture (straight inertial line vs curved rotating-frame path). Toggle `showForces` still hides the fictitious vectors. Boolean toggles now read correctly (`true`/`false`, not `parseInt`).

## cpgf-1.20

- **Native-to-site?** Yes. Cream fill, coral rotor (was electric blue), gold torque, rose `Mg`, teal precession ring. No cyan, no neon green `Ω_p`.
- **Full-width + controls below?** Yes. 3D gyro uses the whole canvas. Dummy `pgre-ctrl-panel` HTML `init` is gone (it never reached the real controls anyway). Engine sliders/select own `ω_s`, `θ`, `d`, `M`, torque mode.
- **Legend strip clear of motion?** Yes. Leftover overlay is gone: the `"DYNAMICS HUD (Eq 1.20)"` `fillText` block, `strokeRect(16,16,hudW,hudH)` (those locals were undefined under `'use strict'`), and the live `d L = τ dt` equation box. All of that is now `PGRE.appendVizLegend` (`dL = τ dt`, mode, `ω_s`, `L_s`, `τ_grav`, `Ω_p`, `T_prec`).
- **Remaining collision?** Vector labels are short (`L`, `τ`, `Mg`, `Ω_p`) and clamped. `Ω_p` is a ground-plane ring around the pivot, not a vertical arrow, so it no longer sits on `L` at small tilt. At large tilt the rotor sits low; `Mg` can pass near the stand. Mode sentence is in a reserved top band.
- **Redesigned or restyled?** Restyled 3D gyro, with one teaching fix: **Axial Spin-Up** now draws `τ ∥ L` along the axle and holds the tilt fixed (used to keep drawing gravity `τ` while spinning in place). **Impulse Perturbation** adds decaying nutation on top of precession (the old dummy “nudge” button never appeared in Lab).
