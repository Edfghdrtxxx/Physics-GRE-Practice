# FINDINGS — G3 (cpgf-1.39, cpgf-1.41, cpgf-1.42)

File: `js/visualizers/trio-g3.js`. Desktop Lab size 640×420. Shots in `shots/`.

## cpgf-1.39

- **native-to-site?** Yes. Cream stage `#faf9f5`, coral spring, ink labels, rose **F** and emerald **v** as short cream-backed letters. No cyan, no on-canvas HUD box, no sci-fi all-caps title.
- **full-width + controls below?** Drawing uses the full canvas. Shared chrome (legend strip + sliders under the canvas) is unchanged; this picture no longer steals a bottom HUD band.
- **legend strip clear of motion?** Yes. ω0, T0, x, v, T, V, E go through `PGRE.appendVizLegend` (`Oscillator`, `Energy`). Nothing numeric is painted over the mass or the ellipse.
- **remaining collision?** None at 640×420. **F** sits above the block, **v** leaves from the block face (length-capped so it stays on canvas), `x = 0` sits below the floor, phase-space `x`/`p` sit in a reserved plot with cream pads. Drag hint is top-left, away from the spring.
- **redesigned or restyled?** Redesigned. Cramped side-by-side mass + phase space + overlay HUD is now stacked: full-width spring on top, phase portrait below. Screenshot: `shots/cpgf-1.39.png`.

## cpgf-1.41

- **native-to-site?** Yes. Cream Argand plane and cream `x(t)` panel, coral phasor **z**, teal **v**, gold real-axis projection. Plot keys live in a reserved title strip. No glow, no electric cyan.
- **full-width + controls below?** Yes via shared stacked chrome. The picture uses the full 640×420; HUD numbers are not on the canvas.
- **legend strip clear of motion?** Yes. ω, θ, |z|, x, v, a go to `PGRE.appendVizLegend` (`Phasor`, `Observables`).
- **remaining collision?** Mild only: at turning points **v** sits near the gold Re-axis bead. Label is now at the outer end of the **v** tick, so it no longer covers the bead. Long formula strings on the phasor and the old diagonal “shadow” line across the split were removed (they cut titles). Wave traces are clipped inside the plot frame.
- **redesigned or restyled?** Restyled with a layout fix. Still phasor | x(t) (that *is* the formula), but both panels get full height, short labels, and no bottom HUD. Screenshot: `shots/cpgf-1.41.png`.

## cpgf-1.42

- **native-to-site?** Yes. Cream stage, coral wall springs, teal coupling spring, coral **m1** / gold **m2**, beat traces in the same two colors. `k` / `kc` / `k` sit in a reserved strip *above* the springs, not on the coils.
- **full-width + controls below?** Yes via shared chrome. The drawing is full-width; the old left-bottom HUD column is gone.
- **legend strip clear of motion?** Yes. ω1, Q1, ω2, Q2, Δω beat go to `PGRE.appendVizLegend` (`Normal modes`).
- **remaining collision?** None at 640×420. Scale is chosen so the two masses do not overlap at the drag limits. Drag hint sits in the strip under the floor, above the divider. Beat graph is full-width under the masses; `x1`/`x2` keys are in a reserved title strip and do not sit on the traces.
- **redesigned or restyled?** Redesigned. Cramped two-mass + HUD + beat-graph split is now two-mass on top, full-width beat graph below. Screenshot: `shots/cpgf-1.42.png`.
