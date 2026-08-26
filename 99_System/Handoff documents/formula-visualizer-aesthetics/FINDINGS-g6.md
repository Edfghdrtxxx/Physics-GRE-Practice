# FINDINGS — G6 (cpgf-1.28, cpgf-1.29, cpgf-1.30)

Trio file: `js/visualizers/trio-g6.js`. Chrome (stacked full-width canvas, legend strip, controls below) is engine/CSS; these pictures only fill the canvas and write HUD via `PGRE.appendVizLegend`. Mock-canvas `draw` on default/empty state does not throw. No Lab screenshots taken.

## cpgf-1.28

- native-to-site? Yes. First paint is cream `#faf9f5`. Ink / coral / gold / teal / green-for-stationary. No cyan, no glow disks, no overlay HUD boxes.
- full-width + controls below? Yes (shared chrome). Two teaching plots share the full canvas width; sliders stay in the panel under the legend.
- legend strip clear of motion? Yes. Live T, U, L, S[α], and stationary-vs-varied live in the DOM legend. Canvas keeps only framed plots, axis ticks, and the moving gold marker.
- remaining collision? None intended. Path and action curves are clipped to plot frames; titles and t/α ticks sit in reserved margins outside the frames. At α = 0 the true (green dashed) and varied (coral) paths coincide by physics.
- redesigned or restyled? Restyled. Same Hamilton-principle picture (varied q(t) + action landscape). Action readout is no longer a canvas badge; the extremum is labeled stationary, not “minimum.”

## cpgf-1.29

- native-to-site? Yes. Cream stage, coral hoop, gold bead, rose gravity / gold centrifugal arrows, green equilibrium marks. White dashed-axis residue is gone.
- full-width + controls below? Yes (shared chrome). Hoop left, U_eff(θ) right, controls under the legend.
- legend strip clear of motion? Yes. ω, ω_c, regime, θ, θ_eq moved off the canvas. The old supercritical/subcritical card-badge is gone.
- remaining collision? Force arrows are clipped to the hoop panel and unlabeled (identity is in the legend) so they cannot cover U_eff. Axis ticks sit under the plot frame. Bead and equilibrium dots are the only moving marks on the potential curve.
- redesigned or restyled? Restyled. Same bead-on-a-rotating-hoop + U_eff bifurcation. Changing θ₀ now restarts the bead (Lab has no kick button).

## cpgf-1.30

- native-to-site? Yes. Cream stage, coral trail / mechanical p, gold A-field and qA, teal canonical P, green conserved trace. Removed the dark-lab `rgba(255,255,255,0.08)` bars and white `#ffffff` value text.
- full-width + controls below? Yes (shared chrome). Orbit left, time series right, controls under the legend.
- legend strip clear of motion? Yes. Gauge, cyclic coordinate, conserved P, oscillating piece, and |p_mech| live in the legend. No on-canvas momentum labels.
- remaining collision? Arrow shafts still share the particle origin — that is the P = mv + qA parallelogram, not leftover HUD. A-field ticks stay faint and under the trail. Plot traces are clipped to the frame.
- redesigned or restyled? Redesigned the right panel (conservation monitor is a time history of conserved vs oscillating momentum, not translucent bars). Left panel restyled; cyclotron step is exact so the green conserved line stays visibly flat.

Screenshot path: none.
