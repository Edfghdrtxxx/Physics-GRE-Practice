# FINDINGS — Formula visualizer aesthetics (parent Lab pass)

Parent stayed orchestrator: dispatched chrome/test + ten trio children; did not edit `js/visualizers/trio-g*.js`. Child checklists: `FINDINGS-g1.md` … `FINDINGS-g10.md`.

**Lab method.** Serve repo root on `127.0.0.1:8147` (not `:8000`). Isolated headless Chrome CDP. Inject `{id:'formula-deck', kind:'formula-deck', cards:[…]}` so the Visualizer Lab tab is not greyed out. `#/formulas` → Visualizer Lab → open each of the 30 `cpgf-` cards one by one. Desktop window 1280×900.

**Shared chrome (all 30).** Modal and inline both emit stacked `.viz-sim-grid`: canvas wrapper, then `.viz-legend-strip`, then `.viz-controls-panel` (`grid-template-columns: 1fr`, no 310px side column). Canvases stay cream `#faf9f5` in dark mode. At this window size the drawing is ~1051×690 so the legend/controls sit under the canvas (scroll the modal to see them). They are siblings of the canvas, not overlays. Confirmed on every open.

**Gating tests.** `node tools/test-visualizer-aesthetics.js` twice: 214 passed, 0 failed, both runs. 30 ids, no extra `cpgf-` keys. First full-canvas fill is cream. HUD helpers write through `PGRE.appendVizLegend`.

Screenshots: `shots/cpgf-*.png` next to this file.

---

## cpgf-1.35

1. native-to-site? Yes. Cream stage, gold sun, coral planet and equal-area sector, teal `r`, emerald `v`.
2. full-width + controls below? Yes (shared chrome). Ellipse fills the Lab canvas.
3. legend strip clear of motion? Yes. `l`, `dA/dt`, `r`, `φ̇`, speeds in the strip (“Kepler 2nd law”). No HUD box on the orbit.
4. remaining collision? None material. Canvas keeps one `r` chip mid-radius and one `v` chip at the velocity tip. `v_r` / `v_φ` numbers stay in the legend. Periapsis / apoapsis sit inside the ellipse, off the planet.
5. redesigned or restyled? Restyled; periapsis chips separated on re-dispatch. Screenshot: `shots/cpgf-1.35.png`.

## cpgf-1.38

1. native-to-site? Yes. Cream split: coral orbit | purple `V_eff` well, gold centrifugal, coral gravity, rose `E`.
2. full-width + controls below? Yes. Two teaching panels inside one full-width canvas.
3. legend strip clear of motion? Yes. `E`, orbit kind, `r`, `T_r` in the strip. Old `Total Energy E = …` overlay is gone; well keeps a short `E` tick.
4. remaining collision? Left-hand orbit is small relative to the Lab stage. `V_eff` can pass near the `E` tick at the right edge (child residual).
5. redesigned or restyled? Restyled. Screenshot: `shots/cpgf-1.38.png`.

## cpgf-1.3

1. native-to-site? Yes. Cream position space | reserved hodograph panel. Coral orbit, teal `r`, emerald `v`, rose `a`. Overlay `hudBg` / “VELOCITY HODOGRAPH” gone.
2. full-width + controls below? Yes.
3. legend strip clear of motion? Yes. `v`, `a_c`, `ω`, `T` in the strip.
4. remaining collision? `v` and `a` chips sit close at the particle on the circle.
5. redesigned or restyled? Redesigned layout (hodograph is a first-class panel). Screenshot: `shots/cpgf-1.3.png`.

## cpgf-1.4

1. native-to-site? Yes. Cream grid, coral orbit, ink tether, `T = F_c` and `v` chips.
2. full-width + controls below? Yes.
3. legend strip clear of motion? Yes. Bottom-of-canvas HUD removed.
4. remaining collision? Orbit is small on the Lab-width stage (physics `r` in px is not fitted to the wrapper). Caption lives in a reserved top band.
5. redesigned or restyled? Restyled. Screenshot: `shots/cpgf-1.4.png`.

## cpgf-1.22

1. native-to-site? Yes. Cream two-frame picture: coral inertial table, gold rotating table, teal path, violet `F_Cor`, gold `F_cent`.
2. full-width + controls below? Yes. Two equal full-height panels.
3. legend strip clear of motion? Yes. `Ω`, `|F_Cor|`, work = 0 in the strip.
4. remaining collision? None material. `v_rot` chip dropped (arrow stays; magnitude in the legend). `F_Cor` and `F_cent` sit beyond their arrow tips and are pushed apart if they would overlap.
5. redesigned or restyled? Restyled; puck chips separated on re-dispatch. Screenshot: `shots/cpgf-1.22.png`.

## cpgf-1.20

1. native-to-site? Yes. Cream 3D gyro, coral rotor, gold `τ`, rose `Mg`, teal precession ring. No cyan, no “DYNAMICS HUD” box.
2. full-width + controls below? Yes. Dummy HTML `init` controls removed.
3. legend strip clear of motion? Yes. `ω_s`, `L_s`, `τ`, `Ω_p` in the strip.
4. remaining collision? At large tilt `Mg` can pass near the stand. Labels are short chips (`L`, `τ`, `Mg`, `Ω_p`).
5. redesigned or restyled? Restyled (axial spin-up now draws `τ ∥ L`). Screenshot: `shots/cpgf-1.20.png`.

## cpgf-1.39

1. native-to-site? Yes. Cream spring-mass on top, phase ellipse below. Coral spring, rose `F`, emerald `v`.
2. full-width + controls below? Yes.
3. legend strip clear of motion? Yes. `ω0`, `T`, `V`, `E` in the strip.
4. remaining collision? None material at Lab size. `x = 0` sits under the floor.
5. redesigned or restyled? Redesigned (was side-by-side + overlay HUD). Screenshot: `shots/cpgf-1.39.png`.

## cpgf-1.41

1. native-to-site? Yes. Cream Argand plane | `x(t)` panel. Coral phasor `z`, teal `v`.
2. full-width + controls below? Yes.
3. legend strip clear of motion? Yes. `ω`, `|z|`, `x`, `v` in the strip.
4. remaining collision? Mild: `v` near the Re-axis bead at turning points.
5. redesigned or restyled? Restyled. Screenshot: `shots/cpgf-1.41.png`.

## cpgf-1.42

1. native-to-site? Yes. Cream two-mass line, coral wall springs, teal coupling, beat graph full-width below.
2. full-width + controls below? Yes. Old HUD column gone.
3. legend strip clear of motion? Yes. `ω1`, `ω2`, beat in the strip.
4. remaining collision? None material. `k` / `kc` sit in a reserved strip above the coils.
5. redesigned or restyled? Redesigned. Screenshot: `shots/cpgf-1.42.png`.

## cpgf-1.47

1. native-to-site? Yes. Cream pendulum, coral bob, gold `θ`, reserved phase portrait.
2. full-width + controls below? Yes.
3. legend strip clear of motion? Yes. `T0`, `T(θ0)`, `θ(t)` in the strip.
4. remaining collision? Bob and linear ghost overlap when the models agree (that is the lesson). Pivot is a dark disk (one sampled “dark” pixel).
5. redesigned or restyled? Restyled. Screenshot: `shots/cpgf-1.47.png`.

## cpgf-1.24

1. native-to-site? Yes. Cream, teal r²-weighted rings, gold highlighted `dm`, incline race with S/D/H/R. Navy strokes gone.
2. full-width + controls below? Yes. Dead custom panel replaced by engine sliders.
3. legend strip clear of motion? Yes. `I`, formula, race time in the strip.
4. remaining collision? None material. `R` chip sits on the radius tick. Racers start in a vertical gate.
5. redesigned or restyled? Restyled / chrome redesigned. Screenshot: `shots/cpgf-1.24.png`.

## cpgf-1.25

1. native-to-site? Yes. Cream rod, gold `d`, green CM, `I(d)` and `T(d)` cards. Clock-emoji title gone.
2. full-width + controls below? Yes.
3. legend strip clear of motion? Yes. `I_CM`, `d`, `I_P`, `T(d)` in the strip.
4. remaining collision? `pivot` / `d` / `CM` pills sit near the small rod at Lab size; readable, not spinning with the body.
5. redesigned or restyled? Restyled. Screenshot: `shots/cpgf-1.25.png`.

## cpgf-1.26

1. native-to-site? Yes. Cream, coral disk, rose hole, gold CM, teal plumb. “HIGH-YIELD CM FORMULAS” overlay gone.
2. full-width + controls below? Yes. Shape fills the canvas.
3. legend strip clear of motion? Yes. `x_CM` and the ranking live in the strip.
4. remaining collision? None material. When CM is near O, `O` sits below-left of the origin mark and `CM` sits above the gold cross; cream halos no longer cover each other. `-M` stays on the hole.
5. redesigned or restyled? Restyled; CM/O separated on re-dispatch. Screenshot: `shots/cpgf-1.26.png`.

## cpgf-1.27

1. native-to-site? Yes. Cream paper, coral/teal/gold masses, gold CM. Navy water gone.
2. full-width + controls below? Yes.
3. legend strip clear of motion? Yes. Totals and `r_CM` in the strip. Stationary-CM banner gone.
4. remaining collision? Lots of unused cream (three masses). Labels sit beside the balls.
5. redesigned or restyled? Restyled. Screenshot: `shots/cpgf-1.27.png`.

## cpgf-1.15

1. native-to-site? Yes. Cream field of teal ticks, coral path 1, gold path 2, emerald A, rose B.
2. full-width + controls below? Yes.
3. legend strip clear of motion? Yes. `W1`, `W2`, path dependence in the strip. Badge HUD gone.
4. remaining collision? `F` chip on the bead can graze path 2.
5. redesigned or restyled? Restyled. Screenshot: `shots/cpgf-1.15.png`.

## cpgf-1.28

1. native-to-site? Yes. Cream path `q(t)` | action `S[α]`. Coral varied path, green true path.
2. full-width + controls below? Yes.
3. legend strip clear of motion? Yes. `T`, `U`, `L`, `S` in the strip.
4. remaining collision? None material. Curves clipped to frames.
5. redesigned or restyled? Restyled. Screenshot: `shots/cpgf-1.28.png`.

## cpgf-1.29

1. native-to-site? Yes. Cream hoop | `U_eff(θ)`. Coral hoop and well, gold bead, green equilibria.
2. full-width + controls below? Yes.
3. legend strip clear of motion? Yes. `ω`, regime, `θ_eq` in the strip. Card-badge gone.
4. remaining collision? Gravity arrow is a short unlabeled tick (identity in the legend).
5. redesigned or restyled? Restyled. Screenshot: `shots/cpgf-1.29.png`.

## cpgf-1.30

1. native-to-site? Yes. Cream cyclotron | `P_y` vs `mv_y`. Coral trail, teal canonical `P`, green conserved line. Translucent white bars gone.
2. full-width + controls below? Yes.
3. legend strip clear of motion? Yes. Conserved `P` and oscillating piece in the strip.
4. remaining collision? Arrow shafts share the particle (the `P = mv + qA` parallelogram).
5. redesigned or restyled? Right panel redesigned (time history, not bars). Screenshot: `shots/cpgf-1.30.png`.

## cpgf-1.31

1. native-to-site? Yes. Cream Legendre pair: coral `L(q̇)`, gold tangent, rose `−H`, teal dual `H(p)`.
2. full-width + controls below? Yes.
3. legend strip clear of motion? Yes. `p`, `L`, `H` in the strip. Dual-panel all-caps titles gone.
4. remaining collision? `L` chip sits on the operating point (readable).
5. redesigned or restyled? Restyled. Screenshot: `shots/cpgf-1.31.png`.

## cpgf-1.32

1. native-to-site? Yes. Cream rod + bead | `E(t)` gold vs conserved `H(t)` teal. Ink rod (was white-on-cream).
2. full-width + controls below? Yes.
3. legend strip clear of motion? Yes. `E`, `H`, `T2`, `T0`, `U` in the strip.
4. remaining collision? `E` and `H` end-labels sit on top of each other at the right of the history plot in this frame.
5. redesigned or restyled? Restyled. Screenshot: `shots/cpgf-1.32.png`.

## cpgf-1.33

1. native-to-site? Yes. Cream phase plane, coral trail, gold Liouville swarm, rose separatrix. Overlay badge gone.
2. full-width + controls below? Yes.
3. legend strip clear of motion? Yes. `q`, `p`, `H`, Liouville statement in the strip.
4. remaining collision? None material. Flow clipped to the frame.
5. redesigned or restyled? Restyled. Screenshot: `shots/cpgf-1.33.png`.

## cpgf-1.9

1. native-to-site? Yes. Cream contours, coral equipotentials, teal Manhattan path, gold A/B.
2. full-width + controls below? Yes. Dummy control strip removed.
3. legend strip clear of motion? Yes. `ΔU` vs `∫F·dl` in the strip. On-canvas ΔU badge gone.
4. remaining collision? Teal `F` at the bead can graze A or B at the endpoints.
5. redesigned or restyled? Redesigned. Screenshot: `shots/cpgf-1.9.png`.

## cpgf-2.4

1. native-to-site? Yes. Cream dipole, coral `+` / teal `−`, gold field ticks, probe `E` in site teal (was `#06b6d4`). “TEST PROBE TELEMETRY” gone.
2. full-width + controls below? Yes. 1D `V` / `E_x` slice is a reserved band under the field.
3. legend strip clear of motion? Yes. `V`, `|E|`, angle in the strip.
4. remaining collision? `∇V` / `E` chips near the probe; crowded if every layer is on (child residual).
5. redesigned or restyled? Restyled. Screenshot: `shots/cpgf-2.4.png`.

## cpgf-2.8

1. native-to-site? Yes. Cream–coral Poisson map, gold `E` ticks, `R` chip. “POISSON KERNEL PROBE” overlay gone.
2. full-width + controls below? Yes.
3. legend strip clear of motion? Yes. Probe `V`/`E`, inside/outside in the strip.
4. remaining collision? `R` chip on the radius tick. 3D mode not on screen in this default frame.
5. redesigned or restyled? Restyled. Screenshot: `shots/cpgf-2.8.png`.

## cpgf-2.70

1. native-to-site? Yes. Cream Drude sea, coral electrons, gold ions, circuit + `V(s)` staircase. Black electron fills and I/V/P HUD boxes gone.
2. full-width + controls below? Yes. Stretch GRE trap is an engine toggle.
3. legend strip clear of motion? Yes. `I`, `V_R`, `P`, `v_drift` in the strip.
4. remaining collision? Schematic `ℰ` / `−Ir` / `−IR` sit off the traces.
5. redesigned or restyled? Restyled. Screenshot: `shots/cpgf-2.70.png`.

## cpgf-4.14

1. native-to-site? Yes. Cream P–V, coral path and work shading, gold Q / coral W meters, piston with heat strip.
2. full-width + controls below? Yes. Energy bars sit under the piston (not a side HUD).
3. legend strip clear of motion? Yes. `Q`, `W`, `ΔU`, `Q−W` check in the strip. No `W = ∫P dV` overlay.
4. remaining collision? None material. Axis ticks are single digits.
5. redesigned or restyled? Restyled. Screenshot: `shots/cpgf-4.14.png`.

## cpgf-5.18

1. native-to-site? Yes. Coral `ψ(x)`, teal `|ψ̃(p)|²`, gold `σ` ticks. Overlay product line gone.
2. full-width + controls below? Yes. Two stacked panels.
3. legend strip clear of motion? Yes. `σ_x`, `σ_p`, product, bound in the strip.
4. remaining collision? `σx` sits on the baseline between the gold ticks, not on the peaks.
5. redesigned or restyled? Restyled. Screenshot: `shots/cpgf-5.18.png`.

## cpgf-5.27

1. native-to-site? Yes. Cream packet, coral Re `ψ`, teal envelope, gold `v_g` bead, reserved phasor. Cyan `#06b6d4` gone.
2. full-width + controls below? Yes. Phasor is a reserved column inside the drawing.
3. legend strip clear of motion? Yes. `E`, `v_p`, `v_g` in the strip.
4. remaining collision? Packet peak can sit near the top-left key when the envelope is at the left edge.
5. redesigned or restyled? Restyled. Screenshot: `shots/cpgf-5.27.png`.

## cpgf-6.18

1. native-to-site? Yes. Cream `T(β)`, coral `(γ−1)mc²`, gold `½mv²`, teal rest-energy stack, rose `v = c`.
2. full-width + controls below? Yes.
3. legend strip clear of motion? Yes. `γ`, `E₀`, `T`, Newtonian error in the strip.
4. remaining collision? None material. Relativistic curve runs off the top toward `c` (T → ∞) instead of flattening.
5. redesigned or restyled? Restyled. Screenshot: `shots/cpgf-6.18.png`.

## cpgf-7.17

1. native-to-site? Yes. Cream exponential over a coral parent lattice, teal `1/e` / `τ` guides. Lattice cyan gone.
2. full-width + controls below? Yes. Graph on top, lattice full-width below.
3. legend strip clear of motion? Yes. `t`, `t½`, `τ`, `N` in the strip.
4. remaining collision? `1/e` and `1/4` ticks are close (~18 px) but readable.
5. redesigned or restyled? Redesigned layout. Screenshot: `shots/cpgf-7.17.png`.

---

## Residual

- At 1280×900 the Lab canvas is tall; legend + sliders require a scroll. Stacking is correct; they are not painted on the motion.
- Formula banner under the modal title is an empty cream strip in these headless shots (KaTeX typeset timing), not a picture defect.
- Re-dispatched G1/G2/G5: 1.35 periapsis chips, 1.22 puck chips, and 1.26 CM/O are separated in the drawings (not only logged). 1.4 orbit is still small relative to Lab width (empty cream, not a label collision). 1.32 `E`/`H` end-labels can meet when the traces coincide — that is the conservation lesson. No dark floors, no overlay HUD boxes, no electric cyan.
