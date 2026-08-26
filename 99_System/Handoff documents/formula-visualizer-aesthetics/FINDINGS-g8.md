# FINDINGS-g8

Trio file: `js/visualizers/trio-g8.js`. Chrome (stacked full-width canvas, controls below, reserved `.viz-legend-strip`) is engine/CSS, not this file. No Lab screenshots taken here; `draw` was mock-exercised on default state and all presets/paths/view modes without throw. Only ids `cpgf-1.9`, `cpgf-2.4`, `cpgf-2.8`.

## cpgf-1.9

- **Native-to-site?** Yes. First fill is cream `#faf9f5`. Equipotentials, coral force ticks, teal Manhattan / coral direct / gold arc path, ink A/B labels on cream chips. No neon, no overlay badge.
- **Full-width + controls below?** Yes, via shared Lab/inline chrome. This card no longer builds a dummy control strip; engine `parameters` drive the sliders.
- **Legend strip clear of motion?** Yes. ΔU, W_field, and the path-independence check go through `PGRE.appendVizLegend`. No `drawCardBadge` HUD on the picture.
- **Remaining collision?** Small. Cream-backed A sits below the start and B above the end. A teal F arrow at the moving bead can graze A or B at the endpoints. Engine marching-square zero contours are still a faint slate (engine helper, not this file).
- **Redesigned or restyled?** Redesigned. Dotted contour field and on-canvas ΔU banner replaced by marching contours, a bead along the path, and a live ∫F·dl vs ΔU check in the legend.

## cpgf-2.4

- **Native-to-site?** Yes. Cream stage; coral (+) / teal (−) sources; gold field ticks; probe E in site teal `#5db8a6` (was electric cyan `#06b6d4`); ∇V in coral (was magenta). Potential heatmap is cream–teal–coral, not blue/cyan.
- **Full-width + controls below?** Yes. Dummy innerHTML controls removed; engine panel owns preset, |q|, and layer toggles.
- **Legend strip clear of motion?** Yes. “TEST PROBE TELEMETRY” overlay is gone. V, |E|, angle, and the E ⟂ equipotential sentence live in the legend strip.
- **Remaining collision?** Moderate if every layer is ON (heatmap + contours + vectors + streamlines + charges + probe). Grid arrows skip charges and the probe. Probe “E” / “∇V” chips have cream backing and are clamped inside the field pane; they can still meet a charge if the user drags the probe onto one. The 1D V / E_x slice is a reserved band under the field, not an overlay.
- **Redesigned or restyled?** Restyled. Same teaching geometry (equipotentials, E = −∇V, orthogonality, slice). Palette, HUD, and label placement changed.

## cpgf-2.8

- **Native-to-site?** Yes. Cream fill; coral source outline; gold E ticks; cream–coral potential coloring on the 2D map and 3D funnel; 1D V teal, |E| gold, r = R coral.
- **Full-width + controls below?** Yes. Dummy control bar / tip removed; geometry, view mode, R, Q, and 3D angles are engine parameters.
- **Legend strip clear of motion?** Yes. “POISSON KERNEL PROBE” and “3D POTENTIAL LANDSCAPE” canvas boxes are gone. Probe V/E, inside/outside, Coulomb 1/r, and 1D series names go to `PGRE.appendVizLegend`.
- **Remaining collision?** Small. 2D R chip uses a cream backing on the radius tick. Gold arrows skip the probe. On the 1D plot, the r = R label flips to the left if the boundary is near the right edge. 3D funnel can still clip at extreme tilt (camera geometry, not a HUD).
- **Redesigned or restyled?** Restyled. Same Poisson pictures (2D map, 3D V(x,y), 1D radial falloff); overlays and sci-fi colors removed.
