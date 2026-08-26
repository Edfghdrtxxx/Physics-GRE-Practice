# FINDINGS-g7

Trio file: `js/visualizers/trio-g7.js`. Smoke-tested `draw` at 640×420 / 640×380 / 500×300 on default and stressed state (no throw; first fill `#faf9f5`; legend rows present). No Lab screenshots taken.

## cpgf-1.31

- native-to-site?: yes — cream stage, ink axes, coral `L(q-dot)`, gold tangent, rose intercept `-H`, teal dual `H(p)`. No cyan, purple, or overlay HUD.
- full-width + controls below?: yes — picture uses the full canvas; Lab/card chrome stacks legend + sliders under the drawing.
- legend strip clear of motion?: yes — `p`, `L`, `H`, `p q-dot`, intercept live in `PGRE.appendVizLegend`. No `E =` / `H =` canvas overlays, no “Velocity Space” / “Momentum Space” titles.
- remaining collision?: none expected at 640×420. Dual plots are clipped to frames with a divider. Axis names (`q-dot`, `L`, `p`, `H`) sit on cream chips after the curves. `L` vs `-H` labels drop if the operating point sits on the intercept.
- redesigned or restyled?: restyled. Kept the Legendre teaching geometry (L-curve, tangent, intercept, dual H(p)); added a stacked L/H bar at the working velocity so `L + H = p q-dot` is visible.

## cpgf-1.32

- native-to-site?: yes — cream stage; ink/stone rod (was white-on-cream); coral bead and spring; gold `E(t)`; teal conserved `H(t)`.
- full-width + controls below?: yes — full canvas; controls remain in the engine strip underneath.
- legend strip clear of motion?: yes — `E`, `H`, `T2`, `T0`, `U`, `r`, and the conservation note live in the legend. Removed “Energy Comparison” title and in-plot numeric overlays.
- remaining collision?: none expected at 640×420. Rod is clipped to the left pane; `E` / `H` end-labels offset if they collide with each other or the `t` axis. The dummy `init` kick button still does not appear in Lab (engine `buildControls` has no button type); ω and k sliders are enough to drive the demo.
- redesigned or restyled?: restyled. Kept bead-on-rotating-rod plus E-vs-H history; that picture is the formula.

## cpgf-1.33

- native-to-site?: yes — cream phase plane, coral probe trail, gold Liouville swarm, rose dashed separatrix. No overlay badge.
- full-width + controls below?: yes — single full-canvas phase portrait; controls underneath via chrome.
- legend strip clear of motion?: yes — `q`, `p`, `q-dot`, `p-dot`, `H`, Liouville statement, and (pendulum) separatrix note are in the legend. The old full-width Liouville card-badge is gone.
- remaining collision?: none expected at 640×420. Flow, swarm, trail, and separatrix clip to the plot frame; axis labels `q` / `p` paint after the motion so they are not covered. Trail breaks on pendulum wrap so it does not draw a chord across the plane.
- redesigned or restyled?: restyled. Kept Hamilton flow + Liouville swarm + pendulum separatrix.
