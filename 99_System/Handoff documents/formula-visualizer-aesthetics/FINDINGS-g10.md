# FINDINGS — trio-g10

Canvas restyle only (`js/visualizers/trio-g10.js`). Chrome (stacked full-width canvas, legend strip, controls below) is the engine; these three draws now feed it instead of painting overlay HUDs. First fill is `#faf9f5`. Live numbers go through `PGRE.appendVizLegend`. IDs unchanged: `cpgf-5.27`, `cpgf-6.18`, `cpgf-7.17`.

Checked at 640×420 in Visualizer Lab (direct `PGRE.openVisualizerModal`, cream stage). Shots: `shots/cpgf-5.27.png`, `shots/cpgf-6.18.png`, `shots/cpgf-7.17.png`.

## cpgf-5.27

- **native-to-site?** Yes. Cream stage, ink labels, coral Re ψ / carrier, teal Im ψ and phase-crest bead, gold envelope bead and |ψ|². Electric cyan `#06b6d4` / `#0891b2` removed from the wavefunction.
- **full-width + controls below?** Yes. Picture is the full canvas; engine controls sit under the legend strip. Phasor is a reserved right-hand column inside the drawing, not a side HUD.
- **legend strip clear of motion?** Yes. E, v_p, v_g, and the factor-of-two ratio live in the DOM strip. Canvas keeps only a static key (envelope v_g / ripples v_p) and a reserved phase-crest track under the x-axis.
- **remaining collision?** None material at 640×420. vg/vp numbers no longer chase the beads. Packet peak can sit near the top-left key when the envelope is at the left edge; the bead is below the key, not on it. Wave stops before the phasor column.
- **redesigned or restyled?** Restyled. Same three modes (plane / packet / standing) and the e^{-iωt} phasor; HUD overlay and cyan/magenta palette are gone.

## cpgf-6.18

- **native-to-site?** Yes. Cream plot, coral T = (γ−1)mc², gold dashed ½mv², teal rest-energy block, rose v = c guide. Sci-fi glow and emerald/purple telemetry colors are gone.
- **full-width + controls below?** Yes. T(β) curve plus the energy-stack geometry still share the canvas; sliders stay in the engine panel underneath.
- **legend strip clear of motion?** Yes. γ, E₀, T, T_Newton, pc, and the Newtonian error are in the legend strip. The stack keeps only the short words T and mc² (the height ratio is the lesson).
- **remaining collision?** None material at 640×420. The relativistic curve is clipped to the plot so T → ∞ as β → c runs off the top rather than flattening (that flattening was the wrong physics picture). Curve key stays in the empty top-left. Operating point is a hollow coral dot on the curve.
- **redesigned or restyled?** Restyled. Same teaching geometry (T vs β + rest/kinetic stack); energy-budget numbers left the canvas.

## cpgf-7.17

- **native-to-site?** Yes. Cream stage, coral exponential and parent nuclei, teal τ / 1/e guide, gold / rose / teal ejections by mode. Lattice cyan `#06b6d4` / `#0891b2` and purple curve `#a855f7` are gone. No glow.
- **full-width + controls below?** Yes. The picture itself is stacked full-width (N(t) on top, lattice underneath) so both the law and the Poisson story get horizontal room at 640×420. Controls remain below via the engine.
- **legend strip clear of motion?** Yes. t, t½, τ, N_parent, N_theory, and activity sit in the legend strip. Canvas has only a static parent / daughter / mode key in a reserved strip above the atoms.
- **remaining collision?** None material at 640×420. Half-life tick labels skip if they would overlap. 1/e and 1/4 on the y-axis are close (~18 px) but readable. Ejections are clipped to the lattice panel so they cannot cross the graph. The t ≈ 0 marker sits at the top-left of the curve, offset from the N axis name.
- **redesigned or restyled?** Redesigned layout (was a cramped left-lattice / right-graph split with on-canvas HUD). Same formula, same stochastic lattice + exponential law.
