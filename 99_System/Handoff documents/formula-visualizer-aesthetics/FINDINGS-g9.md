# FINDINGS-g9

Trio file: `js/visualizers/trio-g9.js`. Chrome (stacked canvas, controls below, legend strip) is engine/CSS; this child only restyled the three pictures. No screenshots taken (optional). Node mock-canvas draw of all three ids on default and corner state did not throw.

## cpgf-2.70

- **Native-to-site?** Yes. Cream stage `#faf9f5`, panel `#f5f0e8`, ink/coral/gold/teal. Black electron fills and neon HUD colors are gone; tagged electron is coral with a gold ring (readable on cream).
- **Full-width + controls below?** Yes, via engine chrome. Custom dummy-DOM sliders removed; engine `parameters` drive EMF, R, r, T, material, tagged/Poynting toggles. Wire-stretch GRE trap is an engine toggle (`stretch2x`, R → 4R) instead of a dead init button.
- **Legend strip clear of motion?** Yes. I, V_R, P, efficiency, R_eff, r, v_drift, v_thermal, material, T go through `appendVizLegend`. On-canvas I/V/P badge and v_drift HUD box removed.
- **Remaining collision?** Schematic labels (ℰ, R, r, S, +ℰ / −Ir / −IR) sit in reserved headers or off the traces. Long Drude caption hides when the canvas is narrower than 420 px. Superconductor current is clamped for the moving dots so they do not fly off.
- **Redesigned or restyled?** Restyled (same Drude sea + circuit + V(s) staircase). Stretch control moved onto engine parameters.

## cpgf-4.14

- **Native-to-site?** Yes. Cream P–V, coral path and work shading, gold Q / coral W / teal ΔU bars, hot gas coral and cold gas teal (no cyan fill).
- **Full-width + controls below?** Yes. Dummy process-button panel removed; engine select/sliders remain (process, V_f/V_i, gas type, progress).
- **Legend strip clear of motion?** Yes. Process (including Carnot stage), P, V, T, Q, W, ΔU, Q−W check, and γ live in the strip. No W = ∫P dV overlay, no (V,P) tag on the moving state, no verification formula badge, no P = … atm on the piston.
- **Remaining collision?** P–V title lives in a 24 px header; plot is clipped below it. Energy bars sit *under* the piston (they were squeezed into a ~70 px side column at Lab width). Heat strip uses short “heat in / heat out / insulated”. Axis ticks are single digits.
- **Redesigned or restyled?** Restyled layout of the same teaching geometry (P–V + piston + signed energy meters). Numbers only in the strip.

## cpgf-5.18

- **Native-to-site?** Yes. Coral |ψ(x)|² / Re[ψ], teal |ψ̃(p)|², gold σ ticks. Indigo/emerald/neon HUD colors removed.
- **Full-width + controls below?** Yes. Dummy sliders removed; engine parameters (`sigmaX`, `p0`, `chirp`) unchanged in id.
- **Legend strip clear of motion?** Yes. σ_x, σ_p, product, ℏ/2 bound, and saturated/chirp status are in the strip. Bottom overlay product line and on-plot `σ_x = …` / `σ_p = …` boxes are gone.
- **Remaining collision?** Each panel has a reserved title strip. Wave amplitudes scale so Re[ψ] stays inside the body (not through the title or off the bottom). `σx` / `σp` sit on the baseline between the gold ticks, not on the peaks.
- **Redesigned or restyled?** Restyled (same Fourier pair). No extra keys; ids remain `cpgf-2.70`, `cpgf-4.14`, `cpgf-5.18`.
