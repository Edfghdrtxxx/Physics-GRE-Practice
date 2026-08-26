# FINDINGS-g1 — Kepler / effective potential / centripetal a

File: `js/visualizers/trio-g1.js`. IDs kept: `cpgf-1.35`, `cpgf-1.38`, `cpgf-1.3`. Chrome/engine/CSS untouched. Node eval of engine + this file: `draw` on `{}` and after `init` does not throw; first canvas fill is `#faf9f5`; readout goes through `PGRE.appendVizLegend`. No Lab screenshots in this pass.

## cpgf-1.35

1. native-to-site? Yes. Cream stage, coral planet and sectors, gold sun, teal `r`, coral `v`. No cyan trails; major axis is ink-muted instead of white-on-cream.
2. full-width + controls below? Picture uses the full canvas (~640×420). Ellipse is scaled into a padded box so large `a`/`e` no longer run off the right. Chrome stacking is unchanged.
3. legend strip clear of motion? Yes. Numbers (`l`, `dA/dt`, `r`, `φ̇`, speeds) go to the strip titled “Kepler 2nd law”. No on-canvas HUD panel.
4. remaining collision? Separated. Only two arrow chips: `r` at mid-radius (perpendicular offset), `v` at the velocity *tip* (not at the planet). Dropped `v_r` / `v_φ` chips — those values stay in the legend strip. Periapsis sits inside the ellipse above-left of the right vertex; apoapsis inside below-right of the left vertex, so neither rides the vertical tangent or the planet. Title stays in the top pad.
5. redesigned or restyled? Restyled. Same Kepler ellipse and equal-area wedges; fitted to the cream frame and HUD moved off the drawing.

## cpgf-1.38

1. native-to-site? Yes. Cream fill, coral orbit, gold centrifugal dashed curve, coral gravity, violet `V_eff`, rose energy line, emerald `T_r` bar. Magenta bead / purple HUD colors removed.
2. full-width + controls below? Full-width teaching split *inside* the canvas (orbit | well), not a 310px chrome column. Left orbit is scaled so `r_max` no longer walks into the plot.
3. legend strip clear of motion? Yes. `E`, `E_min`, orbit kind, `r`, `r_0`, `T_r` live in the strip. The old `Total Energy E = …` fillRect on the energy line is gone; the line keeps a short `E` tick.
4. remaining collision? Curve names (`l²/(2mr²)`, `−k/r`, `V_eff`) sit in a reserved header under the panel title. `r_min`/`r_max` sit on the baseline; near-circular energies collapse to a single `r_0`. `T_r` is a bar with no caption. Residual: the `V_eff` well can pass near the `E` tick at the right edge; `E` is nudged off the `V = 0` axis when they coincide.
5. redesigned or restyled? Restyled. Same 2D orbit + 1D well; orbit scaled, HUD numbers off the plot, leftover overlay box removed.

## cpgf-1.3

1. native-to-site? Yes. Cream stage, coral particle, teal `r`, emerald `v`, rose `a`. Overlay `hudBg` panel and “VELOCITY HODOGRAPH” title are gone.
2. full-width + controls below? Full-width canvas. With the hodograph on, position space is the left ~55% and velocity space the right ~45% (reserved region, not an inset). With the toggle off, the orbit uses the whole width.
3. legend strip clear of motion? Yes. `v`, `a_c`, `ω`, `r`, `T`, and a one-line hodograph reading sit in the strip. Canvas arrows use short `r` / `v` / `a` chips.
4. remaining collision? Separated. Position space: `r` at mid-radius (one side of the shaft), `v` at the velocity tip (outside the circle), `a` at the acceleration tip on the opposite side of the radius so it does not sit on `r` or the particle. Hodograph: `v` at mid-shaft, `a` at the `dv/dt` tip. Panel titles stay in the 28px top strip.
5. redesigned or restyled? Redesigned layout. Same formula (uniform circle / parametric ellipse + hodograph); the hodograph is a first-class panel instead of a box painted over the motion.
