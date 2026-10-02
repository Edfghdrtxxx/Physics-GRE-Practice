# PR #50 End-to-End Visual Evidence and Test Results

Date: 2026-10-02
Pull Request: https://github.com/Edfghdrtxxx/Physics-GRE-Practice/pull/50
Branch: fm/pgre-flashcards-evidence
Base Commit: c764c40b35118994cfa3f20b7b1506f10c0f5f35

## Overview

Visual verification and automated test evidence for the three supplemental formula flashcards added in PR #50:
1. `supp-relativistic-velocity-addition` (Special Relativity)
2. `supp-relativistic-doppler` (Special Relativity)
3. `supp-brewster-angle` (Optics & Wave Phenomena)

Verification was performed on the real application served from an isolated test instance (`http://localhost:8123`) using an isolated browser session with fresh storage (`/tmp/chrome-pgre-profile-evidence`).

## Screenshots

### 1. Relativistic Velocity Addition (`supp-relativistic-velocity-addition`)
- **Study Face (Front)**: `shots/supp-relativistic-velocity-addition-front.png`
  - Prompt: "For frame $S'$ moving at velocity $v$ along the $x$-axis relative to $S$, how does a particle's longitudinal velocity $u_x'$ in $S'$ transform to its velocity $u_x$ in $S$?"
- **Flipped Back**: `shots/supp-relativistic-velocity-addition-back.png`
  - Shows longitudinal velocity addition formula $u_x = \frac{u_x' + v}{1 + \frac{u_x' v}{c^2}}$, inverse transformation rule, light speed invariance limit ($u_x' = c \implies u_x = c$), Galilean low-speed limit, and SRS rating buttons (Again, Hard, Good, Easy).

### 2. Relativistic Doppler Effect (`supp-relativistic-doppler`)
- **Study Face (Front)**: `shots/supp-relativistic-doppler-front.png`
  - Prompt: "What observed frequency $f$ is detected when a light source emitting proper frequency $f_0$ moves directly toward or away from an observer at speed $v$ (with $\beta = v/c$)?"
- **Flipped Back**: `shots/supp-relativistic-doppler-back.png`
  - Shows blueshift formula $f = f_0\sqrt{\frac{1+\beta}{1-\beta}} = f_0\sqrt{\frac{c+v}{c-v}}$, redshift formula $f = f_0\sqrt{\frac{1-\beta}{1+\beta}} = f_0\sqrt{\frac{c-v}{c+v}}$, low-speed Taylor series approximation, physical note on the medium-free nature of light Doppler shift, and SRS rating buttons.

### 3. Brewster's Angle (`supp-brewster-angle`)
- **Study Face (Front)**: `shots/supp-brewster-angle-front.png`
  - Prompt: "What is Brewster's angle $\theta_B$ for light incident from a medium of index $n_1$ onto a medium of index $n_2$, and what are the polarization and angular properties of the reflected beam?"
- **Flipped Back**: `shots/supp-brewster-angle-back.png`
  - Shows $\tan\theta_B = \frac{n_2}{n_1}$, complete $s$-polarization ($R_p = 0$), perpendicular ray geometry $\theta_B + \theta_r = 90^\circ$ derived via Snell's law, and SRS rating buttons.

## Automated Test Results

| Test Suite | Result | Details |
|---|---|---|
| `tools/test-public-formulas.js` | 912 passed, 0 failed | Validates unique IDs, topics, tags, names, front/back/notes, KaTeX math parsing |
| `tools/test-formula-consumers.js` | 13 passed, 0 failed | Verifies tag filters, dashboard readiness, deck status integration |
| `tools/test-formula-picker.js` | 34 passed, 0 failed | Verifies formula day picks, auto-fill, list card ordering, deck stability |
| `tools/test-formula-checkin.js` | 71 passed, 0 failed | Verifies streak handling, daily check-in bonus XP, persistence |
| `tools/test-formula-export.js` | 65 passed, 0 failed | Verifies formula learning status export and receipt generation |
| `tools/test-recall-lists.js` | 14 passed, 0 failed | Verifies book lists append and flashmode queue behavior |
| `tools/test-srs-intervals.js` | 222 passed, 0 failed | Verifies SRS intervals, cascade clamping, ease monotonicity |
| `tools/test-file-structure.js` | Passed | Verifies canonical file placement and naming rules |
| `tools/check-katex-latex.js` | Passed (665 segments) | Validates clean KaTeX math parsing across all segments |
