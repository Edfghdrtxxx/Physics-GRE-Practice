# FINDINGS-g4 — pendulum / continuous I / parallel-axis

File: `js/visualizers/trio-g4.js`. Engine, CSS, other trios, and `oscillator.html` untouched. Default-state `draw` for all three ids fills `#faf9f5` first, calls `PGRE.appendVizLegend`, and does not throw. No Lab screenshots (parent pass).

## cpgf-1.47

- **native-to-site?** Yes. Cream stage, ink pivot, coral bob/rod, gold θ arc, teal dashed linear ghost. No cyan glow, no overlay HUD box, no sci-fi floor.
- **full-width + controls below?** Yes. Engine stacked chrome; parameters unchanged (L, g, θ0, simple/rod, damping). Dead on-canvas readout removed so the drawing uses the full canvas.
- **legend strip clear of motion?** Yes. Type, ω0, T0, T(θ0), θ(t), trace key, and drag hint go through `appendVizLegend`. Nothing painted as a HUD over the swing.
- **remaining collision?** Small: exact bob and linear ghost overlap when the models agree (that is the lesson). θ is a short pill on the angle arc; values live in the legend. Pivot is centered so a 170° release stays on the 640×420 stage instead of clipping off the top.
- **redesigned or restyled?** Restyled. Same RK4 + linear comparison + phase portrait; portrait sits in a reserved right card with clipped traces, not a cramped overlay.

## cpgf-1.24

- **native-to-site?** Yes. Cream stage, teal r²-weighted rings, coral rod slices, gold highlighted dm, ink axis. Leftover navy `#1e3a8a` ring strokes and purple rod fills are gone.
- **full-width + controls below?** Yes. Custom `innerHTML` panel (never reached the engine dummy `init`) replaced by the existing `parameters` plus an **Incline race** toggle. Engine sliders sit under the canvas.
- **legend strip clear of motion?** Yes. I, formula, c, a/(g sin θ), and race time are in the legend. The old “INERTIA SPECS” box on the drawing is gone.
- **remaining collision?** On-body `dm = …` / `R = …` / `Axis` labels that sat on the rings and rod are moved to a reserved caption band under the figure. Racers start in a vertical gate (separate lanes) with a color key under the ramp, not on the balls. Finish still gathers them at the bottom-right, but lane y-offsets keep the letters from stacking.
- **redesigned or restyled?** Redesigned chrome (engine controls + legend); picture restyled around the same integral and the incline race.

## cpgf-1.25

- **native-to-site?** Yes. Cream stage, coral body, gold d-segment, green CM, ink pivot. Clock-emoji plot title removed.
- **full-width + controls below?** Yes. Dead custom panel replaced by engine parameters (shape, M, L/R, d) plus **Pause swing**. Re-release happens when pause turns off or when geometry sliders change.
- **legend strip clear of motion?** Yes. I_CM, d, I_P, k_g, T(d), T_min live in the legend. Plots keep a gold current-point and a rose k_g marker with no value strings glued to the dots.
- **remaining collision?** Fixed the main one: “CM”, “pivot”, and “d” were drawn inside the rotated body, so they spun and stacked. They are now screen-space pills; when d is tiny they collapse to a single “pivot = CM”. Plot numbers no longer sit on the curves (they collided when d ≈ k_g). k_g tick sits on the T-plot baseline, right-aligned if it is near the rim.
- **redesigned or restyled?** Restyled picture and labels; same Steiner formula, same I(d) and T(d) plots in reserved cards. Ring vs disk is now an annulus vs a filled disk.
