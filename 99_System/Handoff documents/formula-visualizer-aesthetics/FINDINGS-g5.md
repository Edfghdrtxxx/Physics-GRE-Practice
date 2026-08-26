# FINDINGS — G5 (cpgf-1.26, cpgf-1.27, cpgf-1.15)

File restyled: `js/visualizers/trio-g5.js` only. Chrome / engine / CSS untouched. IDs unchanged; no extra keys. Node smoke: each `draw` fills `#faf9f5` first, writes `PGRE.appendVizLegend`, and does not throw on `{}` / missing `dt`. No Lab screenshots taken.

## cpgf-1.26

- **native-to-site?** Yes. Cream stage, coral disk, rose dashed hole (negative mass), gold CM cross, teal comparison marks, ink labels. No navy fill, neon green CM, or pink wire.
- **full-width + controls below?** Yes. The old right-column formula card is gone, so the shape is centered on the full canvas. Sliders / shape select / plumb toggle live in the engine control panel under the picture.
- **legend strip clear of motion?** Yes. Live `x_CM` and the high-yield ranking (wire 2R/π, shell R/2, disk 4R/3π, solid hemi 3R/8, cone h/4) go through `PGRE.appendVizLegend`. No on-canvas HUD panel.
- **remaining collision?** At default `holeOffset = 0.30`, `|x_CM|` is only ~0.04 R, so the marks nearly coincide. Labels are now split: `O` below-left of the origin (`centerX - 18`, `centerY + 26`), `CM` above the gold cross when `|x_cm_px - centerX| < 40` (`y_cm - 22`, center-aligned). Halo boxes are 16 px tall, so that layout leaves ~30 px of vertical gap; they no longer stack. When CM is farther from O it sits beside the cross. `-M` stays above the hole; `P` on the rim. Plumb line is clipped to the canvas.
- **redesigned or restyled?** Restyled. Same four shape models. Semicircle / hemisphere now drawn on the same side as the CM marks (upper half-plane). Formula readout moved off the drawing.

## cpgf-1.27

- **native-to-site?** Yes. Cream paper, coral / teal / gold / rose / violet masses, gold CM, teal water wash. Leftover `#0369a1` water is gone.
- **full-width + controls below?** Yes. Mode select and mass count are engine parameters under the canvas. Drag still works on the picture (pivot mode).
- **legend strip clear of motion?** Yes. Totals, `r_CM`, boat conservation (`ΔX_CM = 0`), and the explosion moral live in the legend. The old “System CM is STRICTLY STATIONARY” banner and kg callouts on the drawing are gone.
- **remaining collision?** Pivot: a mass dragged onto the CM can cover the gold mark; labels sit beside the balls, not on them, with cream halos. Fulcrum sits in a reserved bottom strip. Boat: “boat” left of the hull, “m” above the person, “CM (fixed)” at the top of the gold plumb. Projectile fragment labels are one character (“1”, “2”).
- **redesigned or restyled?** Restyled. Same three stories (lever, man on boat, exploding shell). Palette and HUD placement were the weak parts, not the mechanics.

## cpgf-1.15

- **native-to-site?** Yes. Cream fill first (the old `clearRect` + white 18% field arrows were invisible on cream). Teal / coral / gold field, coral path 1, gold path 2, emerald A, rose B, coral **F** on the bead.
- **full-width + controls below?** Yes. Field select and path-2 bulge are engine parameters. No overlay badge.
- **legend strip clear of motion?** Yes. Field, curl, `W1`, `W2`, and path dependence go to `PGRE.appendVizLegend`. The `U.drawCardBadge` HUD is gone.
- **remaining collision?** Path labels sit off the curves on opposite sides. A / B stay at the ends. The **F** arrow uses the engine halo; at some bead phases it can graze path 2. Extreme bulge can push path 2 toward the canvas edge.
- **redesigned or restyled?** Restyled, with a small teaching fix: A and B are no longer the same radius, so conservative work is a nonzero equal pair instead of `W1 = W2 = 0`. Defaults (`field = vortex`, `detour = 1.2`) now match the declared parameters (engine `default`, not unused `value`).
