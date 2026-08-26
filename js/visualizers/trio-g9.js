/* Formula visualizers — G9 Ohm / First Law / Heisenberg */
(function (global) {
  'use strict';
  global.PGRE = global.PGRE || {};
  global.PGRE.visualizers = global.PGRE.visualizers || {};
  var PGRE = global.PGRE;
  var visualizers = PGRE.visualizers;
  var CV = PGRE.CV;
  var DrawUtils = PGRE.DrawUtils;
  var U = PGRE.VizU;
  function createStyleIfNotExists() { return; }
  function createControlStyles() { return; }
  var H = PGRE.VizH || {};
  function clamp(v, lo, hi) {
    v = Number(v);
    if (v !== v) v = lo;
    return Math.max(lo, Math.min(hi, v));
  }
  function legend(title, rows) {
    if (typeof PGRE.appendVizLegend === 'function') {
      PGRE.appendVizLegend(title, rows || []);
    }
  }
  var C = {
    bg: (CV && CV.colors && CV.colors.bg) || '#faf9f5',
    panel: '#f5f0e8',
    ivory: '#efe9de',
    line: '#e6dfd8',
    ink: '#141413',
    muted: '#6c6a64',
    coral: '#cc785c',
    deep: '#964b32',
    gold: '#d4a017',
    teal: '#5db8a6',
    stone: '#8e8b82',
    rose: '#e05666'
  };
  function panelPath(ctx, x, y, w, h, r) {
    r = r == null ? 8 : r;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
  }
  function seedElectrons(state, n) {
    n = n || 65;
    state.electrons = [];
    for (var i = 0; i < n; i++) {
      var vth = 120 + Math.random() * 40;
      var theta = Math.random() * 2 * Math.PI;
      state.electrons.push({
        x: Math.random() * 400,
        y: 20 + Math.random() * 140,
        vx: vth * Math.cos(theta),
        vy: vth * Math.sin(theta),
        trail: []
      });
    }
  }
  function seedLattice(state) {
    state.lattice = [];
    var cols = 12, rows = 4;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        state.lattice.push({ x0: 25 + c * 32, y0: 30 + r * 38 });
      }
    }
  }
  function seedGas(state, n) {
    n = n || 45;
    state._particles = [];
    for (var i = 0; i < n; i++) {
      state._particles.push({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2
      });
    }
  }


  PGRE.visualizers['cpgf-2.70'] = {
    id: "cpgf-2.70",
    title: "Ohm's Law: $V_R = IR$",
    formulaLatex: "V_R = IR",
    physicalStory: `Macroscopic Ohm's law $V_R = IR$ is the spatial integral of the fundamental microscopic constitutive relation for linear isotropic conductors:
$$\\mathbf{J} = \\sigma \\mathbf{E} = \\frac{1}{\\rho_R}\\mathbf{E}$$

In the Drude model of metallic conduction, valence electrons detach from parent atoms to form a free Fermi gas navigating a fixed crystal lattice of positive ions. The electrons undergo relentless thermal motion with enormous Fermi/thermal speeds ($v_{\\text{th}} \\sim 10^6\\text{ m/s}$), undergoing isotropic collisions with lattice vibrations (phonons) and impurities at a characteristic mean free collision time $\\tau$.

When a macroscopic potential difference $V$ is applied across a conductor of length $L$, an internal electric field $\\mathbf{E} = -\\nabla V = (V/L)\\hat{\\mathbf{x}}$ accelerates electrons with $\\mathbf{a} = -e\\mathbf{E}/m_e$. Between collisions, this acceleration imparts a tiny net drift velocity:
$$\\mathbf{v}_d = -\\frac{e\\tau}{m_e}\\mathbf{E} = -\\mu_e \\mathbf{E}$$

Crucially, the electron drift speed is astonishingly sluggish ($v_d \\sim 10^{-4}\\text{ m/s} = 0.1\\text{ mm/s}$), taking hours for an electron to travel through a circuit! Yet when a switch is flipped, the bulb illuminates almost instantaneously because the electromagnetic field and Poynting energy vector $\\mathbf{S} = \\frac{1}{\\mu_0}\\mathbf{E}\\times\\mathbf{B}$ propagate through the surrounding dielectric at relativistic speeds ($v \\sim c$).

Integrating current density over the cross-sectional area $A$ gives $I = J A = (n e v_d) A = \\left(\\frac{n e^2\\tau}{m_e}\\right)\\left(\\frac{V}{L}\\right)A$, which recovers $V = I \\left(\\rho_R \\frac{L}{A}\\right) = IR$.`,

    derivationSteps: [
      {
        step: 1,
        title: "Drude Equation of Motion",
        latex: "m_e \\frac{d\\langle\\mathbf{v}\\rangle}{dt} = -e\\mathbf{E} - \\frac{m_e}{\\tau}\\langle\\mathbf{v}\\rangle",
        description: "Newton's second law for an electron subject to electrostatic force $-e\\mathbf{E}$ and momentum relaxation drag from lattice collisions."
      },
      {
        step: 2,
        title: "Steady-State Drift Velocity",
        latex: "\\frac{d\\langle\\mathbf{v}\\rangle}{dt} = 0 \\implies \\mathbf{v}_d = -\\frac{e\\tau}{m_e}\\mathbf{E}",
        description: "In steady state, terminal drift velocity is proportional to electric field via electron mobility $\\mu_e = e\\tau / m_e$."
      },
      {
        step: 3,
        title: "Microscopic Current Density & Conductivity",
        latex: "\\mathbf{J} = -n e \\mathbf{v}_d = \\left( \\frac{n e^2 \\tau}{m_e} \\right) \\mathbf{E} \\equiv \\sigma \\mathbf{E}",
        description: "The Drude conductivity $\\sigma = \\frac{n e^2 \\tau}{m_e}$ and resistivity $\\rho_R = \\frac{m_e}{n e^2 \\tau}$ characterize the material."
      },
      {
        step: 4,
        title: "Spatial Integration over Conductor Geometry",
        latex: "I = \\int_A \\mathbf{J}\\cdot d\\mathbf{A} = \\sigma E A = \\sigma \\left(\\frac{V_R}{L}\\right) A",
        description: "For a uniform cylinder of length $L$ and cross-sectional area $A$, electric field is $E = V_R / L$ and current is $I = J A$."
      },
      {
        step: 5,
        title: "Macroscopic Ohm's Law & Resistance Formula",
        latex: "V_R = I \\left( \\frac{L}{\\sigma A} \\right) = I \\left( \\rho_R \\frac{L}{A} \\right) = IR",
        description: "Defining resistance $R = \\rho_R L / A = L / (\\sigma A)$ produces the macroscopic relation $V_R = IR$."
      }
    ],

    limitingCases: [
      {
        name: "Ideal Conductor / Superconductor ($R \\to 0$)",
        condition: "\\sigma \\to \\infty, \\quad \\rho_R \\to 0",
        formula: "V_R = 0 \\quad (\\mathbf{E}_{\\text{in}} = 0 \\text{ for finite current})",
        description: "In a superconductor below $T_c$, resistance is strictly zero; Cooper pairs flow without collision loss, yielding zero voltage drop."
      },
      {
        name: "Ideal Insulator / Open Circuit ($R \\to \\infty$)",
        condition: "\\sigma \\to 0, \\quad \\rho_R \\to \\infty",
        formula: "I = 0, \\quad V_{\\text{gap}} = \\mathcal{E}",
        description: "No current flows; the entire source EMF drops across the open circuit gap."
      },
      {
        name: "Temperature Scaling in Metals (Phonon Scattering)",
        condition: "T > T_{\\text{Debye}}",
        formula: "\\rho(T) = \\rho_0 [1 + \\alpha (T - T_0)] \\propto T",
        description: "As temperature rises, lattice vibrations (phonons) increase in amplitude, shortening mean free time $\\tau$ and increasing resistance."
      },
      {
        name: "Semiconductors (Thermal Carrier Activation)",
        condition: "n(T) \\propto e^{-E_g / (2 k_B T)}",
        formula: "\\rho(T) \\propto e^{+E_g / (2 k_B T)}",
        description: "Unlike metals, semiconductor resistivity decreases exponentially with temperature as valence electrons bridge the band gap $E_g$."
      }
    ],

    greTraps: [
      {
        trap: "Wire Stretching Resistance Scaling (Constant Volume)",
        explanation: "If a wire of length $L$ and radius $r$ is stretched to twice its length ($L' = 2L$) while keeping volume $V_{\\text{vol}} = A L$ constant, the cross-sectional area halves ($A' = A/2$). Thus $R' = \\rho \\frac{2L}{A/2} = 4 R_0$ (quadruples, not doubles!). High-yield PGRE favorite."
      },
      {
        trap: "Drift Velocity vs Electromagnetic Signal Speed",
        explanation: "Individual electrons drift at $v_d \\sim 0.1\\text{ mm/s}$, but energy travels via the Poynting vector $\\mathbf{S} = \\frac{1}{\\mu_0}\\mathbf{E}\\times\\mathbf{B}$ through the electromagnetic fields outside the wire at $\\sim c$."
      },
      {
        trap: "Internal Resistance & Maximum Power Transfer Theorem",
        explanation: "A real battery with EMF $\\mathcal{E}$ and internal resistance $r$ delivers maximum power $P_{\\text{max}} = \\frac{\\mathcal{E}^2}{4r}$ to an external load when $R_{\\text{load}} = r$ (impedance matching), at which point terminal voltage is $\\mathcal{E}/2$ and efficiency is $50\\%$."
      },
      {
        trap: "Ohm's Law is NOT a Fundamental Universal Law",
        explanation: "Ohm's law is an empirical constitutive approximation. Non-ohmic devices (diodes, vacuum tubes, transistors, filament lamps) do not exhibit constant resistance $V/I$."
      }
    ],

    parameters: [
      { id: "emf", label: "Battery EMF ($\\mathcal{E}$)", type: "slider", min: 1.0, max: 24.0, step: 0.5, default: 12.0 },
      { id: "resistorR", label: "Load resistor ($R$)", type: "slider", min: 1.0, max: 20.0, step: 0.5, default: 6.0 },
      { id: "internalR", label: "Internal resistance ($r$)", type: "slider", min: 0.0, max: 5.0, step: 0.2, default: 1.0 },
      { id: "temperature", label: "Temperature ($T$)", type: "slider", min: 50, max: 600, step: 10, default: 300 },
      { id: "material", label: "Wire Material", type: "select", options: ["Copper", "Aluminum", "Nichrome", "Carbon", "Superconductor"], default: "Copper" },
      { id: "showTagged", label: "Track tagged electron", type: "toggle", default: true },
      { id: "showPoynting", label: "Energy flow (Poynting $\\mathbf{S}$)", type: "toggle", default: true },
      { id: "stretch2x", label: "Stretch wire $2\\times$ ($R \\to 4R$)", type: "toggle", default: false }
    ],

    init: function(container, state, redraw) {
      state = state || {};
      state.emf = state.emf !== undefined ? state.emf : 12.0;
      state.resistorR = state.resistorR !== undefined ? state.resistorR : 6.0;
      state.internalR = state.internalR !== undefined ? state.internalR : 1.0;
      state.temperature = state.temperature !== undefined ? state.temperature : 300;
      state.material = state.material || "Copper";
      state.showTagged = state.showTagged !== undefined ? state.showTagged : true;
      state.showPoynting = state.showPoynting !== undefined ? state.showPoynting : true;
      state.stretch2x = !!state.stretch2x;
      seedElectrons(state);
      seedLattice(state);
    },

    draw: function(ctx, width, height, state, dt) {
      dt = dt || 0.016;
      state = state || {};
      state.time = (state.time || 0) + dt;

      state.emf = state.emf !== undefined ? state.emf : 12.0;
      state.resistorR = state.resistorR !== undefined ? state.resistorR : 6.0;
      state.internalR = state.internalR !== undefined ? state.internalR : 1.0;
      state.temperature = state.temperature !== undefined ? state.temperature : 300;
      state.material = state.material || "Copper";
      state.showTagged = state.showTagged !== undefined ? state.showTagged : true;
      state.showPoynting = state.showPoynting !== undefined ? state.showPoynting : true;
      state.stretch2x = !!state.stretch2x;

      if (!state.electrons) seedElectrons(state);
      if (!state.lattice) seedLattice(state);

      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, width, height);

      var geoR = Number(state.resistorR) * (state.stretch2x ? 4 : 1);
      var effectiveR = geoR;
      if (state.material === "Copper") {
        effectiveR *= 1 + 0.0039 * (state.temperature - 293);
      } else if (state.material === "Aluminum") {
        effectiveR *= 1 + 0.0043 * (state.temperature - 293);
      } else if (state.material === "Nichrome") {
        effectiveR *= 1 + 0.0004 * (state.temperature - 293);
      } else if (state.material === "Carbon") {
        effectiveR *= Math.exp(-0.0015 * (state.temperature - 293));
      } else if (state.material === "Superconductor") {
        effectiveR = state.temperature < 93 ? 0.00001 : effectiveR;
      }
      effectiveR = Math.max(0.001, effectiveR);

      var totalR = effectiveR + Number(state.internalR);
      var emf = Math.max(0.01, Number(state.emf));
      var current = emf / totalR;
      var vLoad = current * effectiveR;
      var vInt = current * Number(state.internalR);
      var power = current * vLoad;
      var eField = vLoad / 2.0;
      var driftSpeed = 35.0 * (eField / (effectiveR + 1.0));
      var thermalAmp = Math.sqrt(state.temperature / 300.0) * 1.5;
      var visI = clamp(current, 0, 18);

      legend("Ohm's law $V = I R$", [
        { label: "$I$", value: "$" + current.toFixed(2) + "\\text{ A}$" },
        { label: "$V_R$", value: "$" + vLoad.toFixed(2) + "\\text{ V}$" },
        { label: "$P = I V_R$", value: "$" + power.toFixed(2) + "\\text{ W}$" },
        { label: "$V_R / \\mathcal{E}$", value: "$" + ((vLoad / emf) * 100).toFixed(0) + "\\%$" },
        { label: "$R_{\\text{eff}}$", value: "$" + effectiveR.toFixed(2) + "\\;\\Omega$" },
        { label: "$r$", value: "$" + Number(state.internalR).toFixed(1) + "\\;\\Omega$" }
      ]);
      legend("Drude electrons", [
        { label: "$v_{\\text{drift}}$", value: "$" + (driftSpeed * 0.003).toFixed(4) + "\\text{ mm/s}$" },
        { label: "$v_{\\text{thermal}}$", value: "$" + (85 * Math.sqrt(state.temperature / 300)).toFixed(0) + "\\text{ km/s}$" },
        { label: "Material", value: String(state.material) },
        { label: "$T$", value: "$" + String(state.temperature) + "\\text{ K}$" }
      ]);

      var splitY = height * 0.50;

      ctx.save();
      var pad = 10;
      var drudeLeft = pad;
      var drudeTop = pad;
      var drudeW = width - pad * 2;
      var drudeH = splitY - pad - 6;
      var headH = 20;
      var stageTop = drudeTop + headH;
      var stageH = drudeH - headH;

      ctx.fillStyle = C.panel;
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 1;
      panelPath(ctx, drudeLeft, drudeTop, drudeW, drudeH, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = C.ink;
      ctx.font = "600 12px Inter, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText("Drude model", drudeLeft + 12, drudeTop + headH / 2);
      if (drudeW > 420) {
        ctx.fillStyle = C.muted;
        ctx.font = "11px Inter, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText("electrons drift opposite E", drudeLeft + drudeW - 12, drudeTop + headH / 2);
      }

      ctx.fillStyle = "rgba(204, 120, 92, 0.28)";
      ctx.fillRect(drudeLeft + drudeW - 14, stageTop + 4, 10, stageH - 10);
      ctx.fillStyle = C.coral;
      ctx.font = "bold 13px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("+", drudeLeft + drudeW - 9, stageTop + stageH / 2);

      ctx.fillStyle = "rgba(93, 184, 166, 0.28)";
      ctx.fillRect(drudeLeft + 4, stageTop + 4, 10, stageH - 10);
      ctx.fillStyle = C.teal;
      ctx.fillText("−", drudeLeft + 9, stageTop + stageH / 2);

      var eY = stageTop + 10;
      ctx.strokeStyle = C.coral;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(drudeLeft + drudeW - 28, eY);
      ctx.lineTo(drudeLeft + 28, eY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(drudeLeft + 28, eY);
      ctx.lineTo(drudeLeft + 36, eY - 4);
      ctx.lineTo(drudeLeft + 36, eY + 4);
      ctx.closePath();
      ctx.fillStyle = C.coral;
      ctx.fill();
      ctx.font = "600 10px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText("E", drudeLeft + drudeW / 2, eY + 3);

      var ionR = 6;
      var latticeTop = stageTop + 22;
      var latticeH = Math.max(24, stageH - 30);
      if (state.lattice) {
        state.lattice.forEach(function(site, idx) {
          var jitterX = Math.sin(state.time * 25 + idx * 1.7) * thermalAmp;
          var jitterY = Math.cos(state.time * 23 + idx * 2.3) * thermalAmp;
          var sx = drudeLeft + 24 + (site.x0 / 400) * (drudeW - 48) + jitterX;
          var sy = latticeTop + (site.y0 / 140) * latticeH + jitterY;
          ctx.fillStyle = C.gold;
          ctx.beginPath();
          ctx.arc(sx, sy, ionR, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = C.deep;
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = C.ink;
          ctx.font = "bold 9px Inter, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("+", sx, sy + 0.5);
        });
      }

      if (state.electrons) {
        var vthMag = 80 * Math.sqrt(state.temperature / 300);
        var visDrift = clamp(driftSpeed, -80, 80);
        state.electrons.forEach(function(el, idx) {
          var isSuper = (state.material === "Superconductor" && state.temperature < 93);
          var accel = (eField * 60) / (isSuper ? 0.3 : 1.0);
          el.vx += accel * dt;
          var collisionRate = isSuper ? 0.0 : (0.03 * (state.temperature / 300));
          if (Math.random() < collisionRate) {
            var phi = Math.random() * 2 * Math.PI;
            el.vx = vthMag * Math.cos(phi);
            el.vy = vthMag * Math.sin(phi);
          }
          el.x += (el.vx + visDrift) * dt;
          el.y += el.vy * dt;
          if (el.x > drudeW - 40) el.x = 22;
          if (el.x < 22) el.x = drudeW - 40;
          if (el.y < 34) { el.y = 34; el.vy = Math.abs(el.vy); }
          if (el.y > drudeH - 14) { el.y = drudeH - 14; el.vy = -Math.abs(el.vy); }

          var sx = drudeLeft + el.x;
          var sy = drudeTop + el.y;
          var isTagged = (idx === 0 && state.showTagged);
          if (isTagged) {
            el.trail.push({ x: sx, y: sy });
            if (el.trail.length > 40) el.trail.shift();
            ctx.strokeStyle = C.gold;
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            el.trail.forEach(function(pt, ti) {
              if (ti === 0) ctx.moveTo(pt.x, pt.y);
              else ctx.lineTo(pt.x, pt.y);
            });
            ctx.stroke();
            ctx.fillStyle = C.coral;
            ctx.beginPath();
            ctx.arc(sx, sy, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = C.gold;
            ctx.lineWidth = 2;
            ctx.stroke();
          } else {
            ctx.fillStyle = C.coral;
            ctx.beginPath();
            ctx.arc(sx, sy, 2.6, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      }

      ctx.restore();

      ctx.save();
      var botTop = splitY + 4;
      var botH = height - botTop - pad;
      var botW = width - pad * 2;
      var botLeft = pad;

      ctx.fillStyle = C.panel;
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 1;
      panelPath(ctx, botLeft, botTop, botW, botH, 8);
      ctx.fill();
      ctx.stroke();

      var circW = botW * 0.46;
      var cLeft = botLeft + 8;
      var cTop = botTop + 18;
      var cWidth = circW - 12;
      var cHeight = botH - 26;
      var loopX = cLeft + 28;
      var loopY = cTop + 14;
      var loopW = Math.max(70, cWidth - 50);
      var loopH = Math.max(50, cHeight - 28);

      ctx.fillStyle = C.ink;
      ctx.font = "600 11px Inter, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("Circuit", cLeft + 8, botTop + 5);

      ctx.strokeStyle = C.stone;
      ctx.lineWidth = 3.5;
      ctx.strokeRect(loopX, loopY, loopW, loopH);

      var batX = loopX;
      var batY = loopY + loopH / 2;
      ctx.fillStyle = C.panel;
      ctx.fillRect(batX - 12, batY - 24, 24, 48);
      ctx.strokeStyle = C.coral;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(batX - 12, batY - 10);
      ctx.lineTo(batX + 12, batY - 10);
      ctx.stroke();
      ctx.strokeStyle = C.teal;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(batX - 7, batY + 10);
      ctx.lineTo(batX + 7, batY + 10);
      ctx.stroke();
      ctx.fillStyle = C.coral;
      ctx.font = "600 11px Inter, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText("EMF", batX - 16, batY);

      var resX = loopX + loopW;
      var resY = loopY + loopH / 2;
      ctx.fillStyle = C.panel;
      ctx.fillRect(resX - 12, resY - 30, 24, 60);
      ctx.strokeStyle = C.gold;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(resX, resY - 28);
      var zigStep = 7;
      for (var z = 0; z < 6; z++) {
        ctx.lineTo(z % 2 === 0 ? resX - 8 : resX + 8, resY - 24 + z * zigStep);
      }
      ctx.lineTo(resX, resY + 28);
      ctx.stroke();
      ctx.fillStyle = C.gold;
      ctx.font = "600 11px Inter, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("R", resX + 14, resY);

      if (Number(state.internalR) > 0.05) {
        var rZigX = loopX + loopW * 0.45;
        var rZigY = loopY + loopH;
        ctx.fillStyle = C.panel;
        ctx.fillRect(rZigX - 22, rZigY - 8, 44, 16);
        ctx.strokeStyle = C.rose;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(rZigX - 18, rZigY);
        for (var rz = 0; rz < 5; rz++) {
          ctx.lineTo(rZigX - 14 + rz * 8, rZigY + (rz % 2 === 0 ? -6 : 6));
        }
        ctx.lineTo(rZigX + 18, rZigY);
        ctx.stroke();
        ctx.fillStyle = C.rose;
        ctx.font = "600 10px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText("r", rZigX, rZigY + 8);
      }

      if (power > 5) {
        ctx.strokeStyle = "rgba(204, 120, 92, " + clamp(power / 80, 0.2, 0.7) + ")";
        ctx.lineWidth = 1.2;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.arc(resX, resY, 18 + (state.time * 16) % 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (state.showPoynting) {
        ctx.strokeStyle = C.gold;
        ctx.fillStyle = C.gold;
        ctx.lineWidth = 1.6;
        [-1, 1].forEach(function(side) {
          var sx = resX + side * 26;
          var sy = resY;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(resX + side * 12, sy);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(resX + side * 12, sy);
          ctx.lineTo(resX + side * 16, sy - 3.5);
          ctx.lineTo(resX + side * 16, sy + 3.5);
          ctx.closePath();
          ctx.fill();
        });
        ctx.font = "600 10px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText("S", resX, resY - 32);
      }

      var w1 = loopW;
      var h1 = loopH;
      var loopLen = 2 * (w1 + h1);
      var dotSpeed = visI * 48;
      var numDots = 12;
      for (var d = 0; d < numDots; d++) {
        var prog = (state.time * dotSpeed + (d / numDots) * loopLen) % loopLen;
        var dx = 0, dy = 0;
        if (prog < w1) {
          dx = loopX + prog;
          dy = loopY;
        } else if (prog < w1 + h1) {
          dx = loopX + w1;
          dy = loopY + (prog - w1);
        } else if (prog < 2 * w1 + h1) {
          dx = loopX + w1 - (prog - (w1 + h1));
          dy = loopY + h1;
        } else {
          dx = loopX;
          dy = loopY + h1 - (prog - (2 * w1 + h1));
        }
        ctx.fillStyle = C.gold;
        ctx.beginPath();
        ctx.arc(dx, dy, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }

      var graphX = botLeft + circW + 6;
      var graphW = botW - circW - 16;
      var graphY = botTop + 22;
      var graphH = botH - 30;

      ctx.fillStyle = C.bg;
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 1;
      panelPath(ctx, graphX, graphY, graphW, graphH, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = C.ink;
      ctx.font = "600 11px Inter, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillText("V(s) around the loop", graphX + 8, graphY - 4);

      var base0Y = graphY + graphH - 16;
      var topPad = graphY + 16;
      ctx.strokeStyle = C.line;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(graphX + 10, base0Y);
      ctx.lineTo(graphX + graphW - 10, base0Y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = "10px JetBrains Mono, monospace";
      ctx.fillStyle = C.muted;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText("0", graphX + graphW - 8, base0Y);

      var vScale = (base0Y - topPad) / Math.max(12, emf);
      var yEmf = clamp(base0Y - emf * vScale, topPad, base0Y);
      var yAfterInt = clamp(base0Y - vLoad * vScale, topPad, base0Y);
      var p0 = { x: graphX + 14, y: base0Y };
      var p1 = { x: graphX + 14 + graphW * 0.20, y: yEmf };
      var p2 = { x: graphX + 14 + graphW * 0.36, y: yAfterInt };
      var p3 = { x: graphX + 14 + graphW * 0.64, y: yAfterInt };
      var p4 = { x: graphX + 14 + graphW * 0.82, y: base0Y };
      var p5 = { x: graphX + graphW - 14, y: base0Y };

      ctx.strokeStyle = C.teal;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.lineTo(p4.x, p4.y);
      ctx.lineTo(p5.x, p5.y);
      ctx.stroke();

      ctx.font = "600 10px Inter, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillStyle = C.coral;
      ctx.fillText("+EMF", p1.x - 8, p1.y - 3);
      ctx.fillStyle = C.rose;
      ctx.textBaseline = "top";
      ctx.fillText("−Ir", p2.x + 4, p2.y + 3);
      ctx.fillStyle = C.gold;
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillText("−IR", p4.x - 4, Math.min(p4.y, p3.y) - 4);

      ctx.restore();
    },

    challenge: {
      question: "A cylindrical copper wire with initial resistance $R_0$ is uniformly drawn and stretched through a wire die such that its length increases by $100\\%$ ($L_{\\text{new}} = 2 L_0$) without changing its total mass or density. Next, this stretched wire is connected across a real battery of EMF $\\mathcal{E}$ and internal resistance $r = R_0$. What is the current $I$ drawn from the battery and the power $P$ dissipated in the stretched wire?",
      options: [
        "$I = \\frac{\\mathcal{E}}{3 R_0}, \\quad P = \\frac{2\\mathcal{E}^2}{9 R_0}$",
        "$I = \\frac{\\mathcal{E}}{5 R_0}, \\quad P = \\frac{4\\mathcal{E}^2}{25 R_0}$",
        "$I = \\frac{\\mathcal{E}}{8 R_0}, \\quad P = \\frac{\\mathcal{E}^2}{16 R_0}$",
        "$I = \\frac{\\mathcal{E}}{4 R_0}, \\quad P = \\frac{\\mathcal{E}^2}{8 R_0}$",
        "$I = \\frac{\\mathcal{E}}{5 R_0}, \\quad P = \\frac{2\\mathcal{E}^2}{25 R_0}$"
      ],
      correct: 1,
      explanation: "Step 1: Wire stretching resistance scaling with constant volume:\n" +
        "Volume $V = A L = \\text{const} \\implies$ when $L_{\\text{new}} = 2 L_0$, area $A_{\\text{new}} = A_0 / 2$.\n" +
        "Resistance $R_{\\text{new}} = \\rho \\frac{L_{\\text{new}}}{A_{\\text{new}}} = \\rho \\frac{2 L_0}{A_0 / 2} = 4 \\rho \\frac{L_0}{A_0} = 4 R_0$.\n\n" +
        "Step 2: Circuit analysis with internal resistance $r = R_0$:\n" +
        "Total loop resistance $R_{\\text{total}} = R_{\\text{new}} + r = 4 R_0 + R_0 = 5 R_0$.\n" +
        "Then current $I = \\frac{\\mathcal{E}}{5 R_0}$.\n" +
        "Power dissipated in wire $P = I^2 R_{\\text{new}} = \\left(\\frac{\\mathcal{E}}{5 R_0}\\right)^2 (4 R_0) = \\frac{4 \\mathcal{E}^2}{25 R_0}$."
    }
  };

  PGRE.visualizers['cpgf-4.14'] = {
    id: 'cpgf-4.14',
    title: 'First Law of Thermodynamics: $\\Delta U = Q - W$',
    formulaLatex: '\\Delta U = Q - W = \\int \\delta Q - \\int P\\,dV',
    physicalStory: `The First Law of Thermodynamics is the macroscopic statement of energy conservation for a closed thermodynamic system. Internal energy $U$ is a state function—dependent only on the equilibrium thermodynamic coordinates (for an ideal gas, $U(T) = n C_V T$). In contrast, heat $Q$ (thermal energy flux across the system boundary driven by a temperature gradient) and work $W$ (mechanical energy transferred via macroscopic boundary displacement, defined in physics as $W = \\int P dV$ done *by* the system) are path-dependent process quantities. Over any thermodynamic transformation, the difference $Q - W$ is invariant and exactly equals $\\Delta U$. Over a complete cyclic process ($\\oint dU = 0$), the net work output equals the net heat absorbed ($W_{\\text{net}} = Q_{\\text{net}}$), which equals the enclosed area on the $P-V$ diagram.`,
    
    derivationSteps: [
      {
        step: "1. Global Energy Conservation",
        latex: "dE_{\\text{total}} = dE_{\\text{kinetic}} + dE_{\\text{potential}} + dU = \\delta Q - \\delta W",
        explanation: "For a stationary system with no external center-of-mass motion or external potential shifts, all energy exchanges alter the microscopic internal kinetic and potential degrees of freedom ($dU$)."
      },
      {
        step: "2. Reversible Mechanical Work",
        latex: "\\delta W = \\mathbf{F}_{\\text{gas}} \\cdot d\\mathbf{x} = (P \\cdot A) dx = P\\, dV \\implies W = \\int_{V_i}^{V_f} P(V)\\, dV",
        explanation: "Physics standard sign convention: $W > 0$ when the gas expands ($dV > 0$) doing positive work on its surroundings, which lowers internal energy if uncompensated."
      },
      {
        step: "3. Ideal Gas Internal Energy & Heat Capacities",
        latex: "U = n C_V T = \\frac{f}{2} n R T \\implies \\Delta U = n C_V \\Delta T = \\frac{f}{2}(P_f V_f - P_i V_i)",
        explanation: "By Joule's experiment and equipartition, $U$ depends purely on $T$ (with $f=3$ for monatomic, $f=5$ for diatomic). Mayer's relation gives $C_P = C_V + R$, and adiabatic index $\\gamma = C_P / C_V$."
      },
      {
        step: "4. Cyclic Processes & Enclosed Area",
        latex: "\\oint dU = 0 \\implies Q_{\\text{net}} = W_{\\text{net}} = \\oint P\\, dV",
        explanation: "For a clockwise cycle on a P-V indicator diagram, $W_{\\text{net}} > 0$ (heat engine operating between reservoirs). Counter-clockwise represents a refrigerator or heat pump consuming work."
      }
    ],

    limitingCases: [
      {
        name: "Isochoric / Isometric Process ($V = \\text{const}$)",
        condition: "dV = 0",
        formula: "W = 0, \\quad \\Delta U = Q = n C_V \\Delta T",
        explanation: "No boundary displacement occurs, so zero mechanical work is performed. All added heat directly increases the gas temperature and internal energy."
      },
      {
        name: "Isobaric Process ($P = \\text{const}$)",
        condition: "P = \\text{const}",
        formula: "W = P\\Delta V = nR\\Delta T, \\quad Q = n C_P \\Delta T, \\quad \\frac{W}{Q} = \\frac{\\gamma - 1}{\\gamma}",
        explanation: "Expansion at constant pressure requires heat input for both increasing internal energy and doing mechanical work against the external atmosphere."
      },
      {
        name: "Isothermal Process ($T = \\text{const}$)",
        condition: "T = \\text{const}",
        formula: "\\Delta U = 0, \\quad Q = W = n R T \\ln\\left(\\frac{V_f}{V_i}\\right)",
        explanation: "For an ideal gas, $\\Delta U = 0$. All absorbed heat is converted directly into mechanical expansion work without heating the system."
      },
      {
        name: "Adiabatic Process ($Q = 0$)",
        condition: "Q = 0 \\implies P V^\\gamma = \\text{const}",
        formula: "W = \\frac{P_i V_i - P_f V_f}{\\gamma - 1}, \\quad \\Delta U = -W = n C_V (T_f - T_i) = \\frac{P_f V_f - P_i V_i}{\\gamma - 1}",
        explanation: "In a thermally insulated chamber, gas expansion cools the gas ($\\Delta T < 0$) because work is done entirely at the expense of internal energy."
      },
      {
        name: "Adiabatic Free Expansion (Joule Expansion)",
        condition: "Q = 0, \\; W = 0 \\text{ (into vacuum)}",
        formula: "\\Delta U = 0 \\implies T_f = T_i \\text{ (ideal gas)}, \\quad \\Delta S > 0",
        explanation: "Expanding freely into a vacuum does no work ($P_{\\text{ext}} = 0$) and has no heat transfer; hence $\\Delta U = 0$, but the process is highly irreversible."
      }
    ],

    greTraps: [
      {
        trap: "Physics vs Chemistry Work Sign Convention",
        description: "Physics writes $\\Delta U = Q - W$ with $W = \\int P dV$ (work done BY gas). Chemistry writes $\\Delta U = Q + W$ with $W = -\\int P dV$ (work done ON gas).",
        proTip: "Look for keywords: 'work done by the system' ($W > 0$ on expansion) vs 'work done on the gas'."
      },
      {
        trap: "Internal Energy Depends ONLY on Initial & Final ($P,V,T$)",
        description: "$\\Delta U$ is a state function: $\\Delta U = n C_V \\Delta T$ for any process between state 1 and 2, even irreversible ones. $W$ and $Q$ depend heavily on the path.",
        proTip: "If $P_i V_i = P_f V_f$, then $T_i = T_f$ and $\\Delta U = 0$ for an ideal gas, regardless of the intermediate trajectory!"
      },
      {
        trap: "Slope of Adiabat vs Isotherm on P-V Diagram",
        description: "Adiabatic curves are steeper than isotherms by factor $\\gamma$: $(dP/dV)_{\\text{ad}} = -\\gamma (P/V)$ vs $(dP/dV)_{\\text{iso}} = -(P/V)$.",
        proTip: "On PGRE cycle diagrams, the steeper curve is ALWAYS the adiabat ($\\gamma = 5/3$ or $7/5 > 1$). "
      }
    ],

    parameters: [
      { id: 'process', name: 'Process type', type: 'select', options: [
        { value: 'isothermal', label: 'Isothermal ($\\Delta U = 0$)' },
        { value: 'adiabatic', label: 'Adiabatic ($Q = 0$)' },
        { value: 'isobaric', label: 'Isobaric ($P = \\text{const}$)' },
        { value: 'isochoric', label: 'Isochoric ($W = 0$)' },
        { value: 'carnot', label: 'Carnot cycle' }
      ], default: 'isothermal' },
      { id: 'vRatio', name: 'Volume ratio $V_f / V_i$', min: 1.2, max: 4.0, step: 0.1, default: 2.5, unit: 'x' },
      { id: 'gasType', name: 'Gas type', type: 'select', options: [
        { value: 'monatomic', label: 'Monatomic ($\\gamma = 5/3$)' },
        { value: 'diatomic', label: 'Diatomic ($\\gamma = 7/5$)' }
      ], default: 'monatomic' },
      { id: 'progress', name: 'Process progress', min: 0, max: 1, step: 0.01, default: 0.7, unit: '' }
    ],

    init(container, state, redraw) {
      state = state || {};
      if (!state._particles) seedGas(state);
    },

    draw(ctx, width, height, state, dt) {
      state = state || {};
      const process = state.process || 'isothermal';
      const vRatio = state.vRatio || 2.5;
      const progress = state.progress !== undefined ? state.progress : 0.7;
      const isMonatomic = (state.gasType || 'monatomic') === 'monatomic';
      const gamma = isMonatomic ? 5/3 : 7/5;
      const f = isMonatomic ? 3 : 5; // degrees of freedom: Cv = (f/2) R

      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, width, height);
      if (!state._particles) seedGas(state);

      // Base thermodynamic state (n*R = 1)
      const P1 = 3.5; // atm / bar scale
      const V1 = 1.0;
      const T1 = P1 * V1;
      let V2 = V1 * vRatio;
      let P2 = P1;
      let T2 = T1;

      // Calculate path curve P(V)
      const curvePoints = [];
      const numPts = 100;
      let curP = P1;
      let curV = V1;
      let curT = T1;
      let W_val = 0;
      let DeltaU_val = 0;
      let Q_val = 0;

      if (process === 'isothermal') {
        P2 = (P1 * V1) / V2;
        T2 = T1;
        curV = V1 + (V2 - V1) * progress;
        curP = (P1 * V1) / curV;
        curT = T1;
        W_val = T1 * Math.log(curV / V1);
        DeltaU_val = 0;
        Q_val = W_val;
        for (let i = 0; i <= numPts; i++) {
          const v = V1 + (V2 - V1) * (i / numPts);
          const p = (P1 * V1) / v;
          curvePoints.push({ v, p });
        }
      } else if (process === 'adiabatic') {
        P2 = P1 * Math.pow(V1 / V2, gamma);
        T2 = P2 * V2;
        curV = V1 + (V2 - V1) * progress;
        curP = P1 * Math.pow(V1 / curV, gamma);
        curT = curP * curV;
        W_val = (P1 * V1 - curP * curV) / (gamma - 1);
        DeltaU_val = (f / 2) * (curT - T1);
        Q_val = 0;
        for (let i = 0; i <= numPts; i++) {
          const v = V1 + (V2 - V1) * (i / numPts);
          const p = P1 * Math.pow(V1 / v, gamma);
          curvePoints.push({ v, p });
        }
      } else if (process === 'isobaric') {
        P2 = P1;
        T2 = P2 * V2;
        curV = V1 + (V2 - V1) * progress;
        curP = P1;
        curT = curP * curV;
        W_val = P1 * (curV - V1);
        DeltaU_val = (f / 2) * (curT - T1);
        Q_val = DeltaU_val + W_val;
        for (let i = 0; i <= numPts; i++) {
          const v = V1 + (V2 - V1) * (i / numPts);
          curvePoints.push({ v, p: P1 });
        }
      } else if (process === 'isochoric') {
        V2 = V1;
        P2 = P1 * 0.4; // cooling isochoric
        curV = V1;
        curP = P1 + (P2 - P1) * progress;
        curT = curP * curV;
        W_val = 0;
        DeltaU_val = (f / 2) * (curT - T1);
        Q_val = DeltaU_val;
        for (let i = 0; i <= numPts; i++) {
          const p = P1 + (P2 - P1) * (i / numPts);
          curvePoints.push({ v: V1, p });
        }
      } else if (process === 'carnot') {
        // 4-stage Carnot Cycle:
        // A->B Isothermal at Th
        // B->C Adiabatic expansion to Tc
        // C->D Isothermal compression at Tc
        // D->A Adiabatic compression to Th
        const Th = 4.0;
        const Tc = 2.0;
        const Va = 1.0, Pa = Th / Va;
        const Vb = 2.0, Pb = Th / Vb;
        const Vc = Vb * Math.pow(Th / Tc, 1 / (gamma - 1));
        const Pc = Tc / Vc;
        const Vd = Va * Math.pow(Th / Tc, 1 / (gamma - 1));
        const Pd = Tc / Vd;

        // Stage work & heat totals
        const W_AB = Th * Math.log(Vb / Va);
        const Q_AB = W_AB;
        const W_BC = (Pb * Vb - Pc * Vc) / (gamma - 1); // = (Th - Tc)/(gamma - 1)
        const W_CD = Tc * Math.log(Vd / Vc); // negative
        const Q_CD = W_CD; // negative (heat expelled)
        const W_DA = (Pd * Vd - Pa * Va) / (gamma - 1); // = (Tc - Th)/(gamma - 1) = -W_BC

        const s = progress * 4; // 0 to 4
        if (s <= 1) {
          // Stage 1: A -> B
          const t = s;
          curV = Va + (Vb - Va) * t;
          curP = Th / curV;
          curT = Th;
          W_val = Th * Math.log(curV / Va);
          DeltaU_val = 0;
          Q_val = W_val;
        } else if (s <= 2) {
          // Stage 2: B -> C
          const t = s - 1;
          curV = Vb + (Vc - Vb) * t;
          curP = Pb * Math.pow(Vb / curV, gamma);
          curT = curP * curV;
          W_val = W_AB + (Pb * Vb - curP * curV) / (gamma - 1);
          DeltaU_val = (f / 2) * (curT - Th);
          Q_val = Q_AB;
        } else if (s <= 3) {
          // Stage 3: C -> D
          const t = s - 2;
          curV = Vc + (Vd - Vc) * t;
          curP = Tc / curV;
          curT = Tc;
          const W_stage3 = Tc * Math.log(curV / Vc);
          W_val = W_AB + W_BC + W_stage3;
          DeltaU_val = (f / 2) * (Tc - Th);
          Q_val = Q_AB + W_stage3;
        } else {
          // Stage 4: D -> A
          const t = s - 3;
          curV = Vd + (Va - Vd) * t;
          curP = Pd * Math.pow(Vd / curV, gamma);
          curT = curP * curV;
          const W_stage4 = (Pd * Vd - curP * curV) / (gamma - 1);
          W_val = W_AB + W_BC + W_CD + W_stage4;
          DeltaU_val = (f / 2) * (curT - Th);
          Q_val = Q_AB + Q_CD; // net heat
        }

        // Populate full cycle loop points for PV plotting
        for (let i = 0; i <= 25; i++) { const v = Va + (Vb - Va)*(i/25); curvePoints.push({ v, p: Th/v }); }
        for (let i = 0; i <= 25; i++) { const v = Vb + (Vc - Vb)*(i/25); curvePoints.push({ v, p: Pb * Math.pow(Vb/v, gamma) }); }
        for (let i = 0; i <= 25; i++) { const v = Vc + (Vd - Vc)*(i/25); curvePoints.push({ v, p: Tc/v }); }
        for (let i = 0; i <= 25; i++) { const v = Vd + (Va - Vd)*(i/25); curvePoints.push({ v, p: Pd * Math.pow(Vd/v, gamma) }); }
      }

      var stageName = process;
      if (process === 'carnot') {
        var sStage = progress * 4;
        if (sStage <= 1) stageName = 'Carnot A→B isothermal (Th)';
        else if (sStage <= 2) stageName = 'Carnot B→C adiabatic expand';
        else if (sStage <= 3) stageName = 'Carnot C→D isothermal (Tc)';
        else stageName = 'Carnot D→A adiabatic compress';
      }
      legend('First law $\\Delta U = Q - W$', [
        { label: 'Process', value: stageName },
        { label: '$P$', value: '$' + curP.toFixed(2) + ' P_0$' },
        { label: '$V$', value: '$' + curV.toFixed(2) + ' V_0$' },
        { label: '$T$', value: '$' + curT.toFixed(2) + ' T_0$' },
        { label: '$Q$', value: '$' + (Q_val >= 0 ? '+' : '') + Q_val.toFixed(2) + '$' },
        { label: '$W$', value: '$' + (W_val >= 0 ? '+' : '') + W_val.toFixed(2) + '$' },
        { label: '$\\Delta U$', value: '$' + (DeltaU_val >= 0 ? '+' : '') + DeltaU_val.toFixed(2) + '$' },
        { label: '$Q - W$', value: '$' + (Q_val - W_val).toFixed(2) + '$' },
        { label: '$\\gamma$', value: isMonatomic ? '$5/3$' : '$7/5$' }
      ]);

      var pad = 12;
      var splitX = Math.floor(width * 0.58);
      var pvL = pad;
      var pvT = pad;
      var pvW = splitX - pad * 1.4;
      var pvH = height - pad * 2;
      var pvOriginX = pvL + 36;
      var pvOriginY = pvT + pvH - 20;
      var plotW = pvW - 48;
      var plotH = pvH - 42;
      var maxV = process === 'carnot' ? 6.2 : 4.8;
      var maxP = 4.6;
      function mapV(v) { return pvOriginX + (v / maxV) * plotW; }
      function mapP(p) { return pvOriginY - (p / maxP) * plotH; }

      ctx.fillStyle = C.panel;
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 1;
      panelPath(ctx, pvL, pvT, pvW, pvH, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = C.ink;
      ctx.font = '600 12px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('P–V diagram', pvL + 10, pvT + 8);

      ctx.save();
      ctx.beginPath();
      ctx.rect(pvL + 1, pvT + 24, pvW - 2, pvH - 26);
      ctx.clip();

      ctx.strokeStyle = C.ivory;
      ctx.lineWidth = 1;
      var maxVGrid = process === 'carnot' ? 6 : 4;
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillStyle = C.muted;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (var vg = 1; vg <= maxVGrid; vg++) {
        var gx = mapV(vg);
        ctx.beginPath();
        ctx.moveTo(gx, mapP(0));
        ctx.lineTo(gx, mapP(maxP));
        ctx.stroke();
        ctx.fillText(String(vg), gx, pvOriginY + 4);
      }
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (var pg = 1; pg <= 4; pg++) {
        var gy = mapP(pg);
        ctx.beginPath();
        ctx.moveTo(mapV(0), gy);
        ctx.lineTo(mapV(maxV), gy);
        ctx.stroke();
        ctx.fillText(String(pg), pvOriginX - 6, gy);
      }

      ctx.strokeStyle = 'rgba(212, 160, 23, 0.28)';
      ctx.setLineDash([3, 4]);
      [2.0, 3.5, 5.0].forEach(function(T_iso) {
        ctx.beginPath();
        var started = false;
        for (var v = 0.8; v <= maxV; v += 0.1) {
          var pIso = T_iso / v;
          if (pIso <= maxP && pIso >= 0) {
            var x = mapV(v), y = mapP(pIso);
            if (!started) { ctx.moveTo(x, y); started = true; }
            else ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      });
      ctx.setLineDash([]);

      ctx.strokeStyle = C.stone;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(mapV(0), mapP(maxP));
      ctx.lineTo(mapV(0), mapP(0));
      ctx.lineTo(mapV(maxV), mapP(0));
      ctx.stroke();

      ctx.fillStyle = C.muted;
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText('P', mapV(0) + 6, mapP(maxP) + 12);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText('V', mapV(maxV) - 4, pvOriginY - 4);

      if (curvePoints.length > 1) {
        ctx.beginPath();
        if (process === 'carnot') {
          curvePoints.forEach(function(pt, i) {
            var x = mapV(pt.v), y = mapP(pt.p);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          });
          ctx.closePath();
          ctx.fillStyle = 'rgba(204, 120, 92, 0.22)';
          ctx.fill();
        } else {
          var pt0 = curvePoints[0];
          ctx.moveTo(mapV(pt0.v), mapP(0));
          ctx.lineTo(mapV(pt0.v), mapP(pt0.p));
          var activeCount = Math.max(2, Math.floor(curvePoints.length * progress));
          for (var i = 1; i < activeCount; i++) {
            ctx.lineTo(mapV(curvePoints[i].v), mapP(curvePoints[i].p));
          }
          var lastPt = curvePoints[activeCount - 1];
          ctx.lineTo(mapV(lastPt.v), mapP(0));
          ctx.closePath();
          var gradWork = ctx.createLinearGradient(0, mapP(maxP), 0, mapP(0));
          gradWork.addColorStop(0, 'rgba(204, 120, 92, 0.32)');
          gradWork.addColorStop(1, 'rgba(204, 120, 92, 0.05)');
          ctx.fillStyle = gradWork;
          ctx.fill();
        }

        ctx.strokeStyle = C.coral;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        curvePoints.forEach(function(pt, i) {
          var x = mapV(pt.v), y = mapP(pt.p);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        if (process === 'carnot') ctx.closePath();
        ctx.stroke();

        var curX = mapV(curV);
        var curY = mapP(curP);
        ctx.fillStyle = C.ink;
        ctx.strokeStyle = C.coral;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(curX, curY, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();

      var rightX = splitX + 4;
      var rightW = width - rightX - pad;
      var cylW = Math.min(rightW - 8, 148);
      var cylX = rightX + (rightW - cylW) / 2;
      var cylY = pad + 8;
      var cylH = Math.min(148, height * 0.36);

      ctx.fillStyle = C.ivory;
      ctx.strokeStyle = C.stone;
      ctx.lineWidth = 2.4;
      ctx.fillRect(cylX, cylY, cylW, cylH);
      ctx.strokeRect(cylX, cylY, cylW, cylH);

      var pistonFrac = clamp(curV / maxV, 0.12, 0.92);
      var pistonY = cylY + cylH - (cylH - 28) * pistonFrac;
      pistonY = clamp(pistonY, cylY + 16, cylY + cylH - 18);
      var tempNormalized = clamp(curT / 4.5, 0, 1);
      var hot = tempNormalized;
      ctx.fillStyle = 'rgba(' +
        Math.floor(204 * hot + 93 * (1 - hot)) + ', ' +
        Math.floor(120 * hot + 184 * (1 - hot)) + ', ' +
        Math.floor(92 * hot + 166 * (1 - hot)) + ', 0.42)';
      ctx.fillRect(cylX + 2, pistonY, cylW - 4, cylY + cylH - pistonY - 2);

      var gasH = cylY + cylH - pistonY - 8;
      if (state._particles && gasH > 8) {
        var pSpeed = Math.sqrt(Math.max(0.2, curT)) * 1.5;
        ctx.fillStyle = tempNormalized > 0.55 ? C.gold : C.coral;
        state._particles.forEach(function(p) {
          p.x += p.vx * pSpeed * 0.01;
          p.y += p.vy * pSpeed * 0.01;
          if (p.x < 0) { p.x = 0; p.vx *= -1; }
          if (p.x > 1) { p.x = 1; p.vx *= -1; }
          if (p.y < 0) { p.y = 0; p.vy *= -1; }
          if (p.y > 1) { p.y = 1; p.vy *= -1; }
          var px = cylX + 6 + p.x * (cylW - 12);
          var py = pistonY + 4 + p.y * gasH;
          ctx.beginPath();
          ctx.arc(px, py, 2.4, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      ctx.fillStyle = C.stone;
      ctx.fillRect(cylX + 2, pistonY - 11, cylW - 4, 11);
      ctx.fillStyle = C.muted;
      var rodTop = cylY + 2;
      var rodH = Math.max(0, pistonY - 11 - rodTop);
      if (rodH > 0) ctx.fillRect(cylX + cylW / 2 - 4, rodTop, 8, rodH);

      var resY = cylY + cylH + 6;
      if (process === 'adiabatic') {
        ctx.fillStyle = C.line;
        ctx.fillRect(cylX, resY, cylW, 18);
        ctx.fillStyle = C.muted;
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('insulated  Q = 0', cylX + cylW / 2, resY + 9);
      } else {
        var isHeating = Q_val >= 0;
        ctx.fillStyle = isHeating ? 'rgba(204, 120, 92, 0.28)' : 'rgba(93, 184, 166, 0.28)';
        ctx.fillRect(cylX, resY, cylW, 18);
        ctx.fillStyle = isHeating ? C.coral : C.teal;
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isHeating ? 'heat in' : 'heat out', cylX + cylW / 2, resY + 9);
      }

      var meterX = rightX + 6;
      var meterW = Math.max(40, rightW - 12);
      var meterStartY = resY + 32;
      ctx.fillStyle = C.ink;
      ctx.font = '600 11px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('Energy accounting', meterX, meterStartY);

      var barItems = [
        { label: 'Q', val: Q_val, color: C.gold, max: 8 },
        { label: 'W', val: W_val, color: C.coral, max: 8 },
        { label: 'ΔU', val: DeltaU_val, color: C.teal, max: 8 }
      ];
      var barGap = Math.max(28, Math.min(40, (height - pad - meterStartY - 16) / 3));
      barItems.forEach(function(b, idx) {
        var y = meterStartY + 16 + idx * barGap;
        if (y + 14 > height - pad) return;
        ctx.fillStyle = C.muted;
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(b.label, meterX, y);
        var barH = 9;
        var barY = y + 5;
        ctx.fillStyle = C.ivory;
        ctx.fillRect(meterX, barY, meterW, barH);
        var frac = clamp(b.val / b.max, -1, 1);
        var fillW = Math.abs(frac) * (meterW / 2);
        ctx.fillStyle = b.color;
        if (frac >= 0) ctx.fillRect(meterX + meterW / 2, barY, fillW, barH);
        else ctx.fillRect(meterX + meterW / 2 - fillW, barY, fillW, barH);
        ctx.fillStyle = C.stone;
        ctx.fillRect(meterX + meterW / 2, barY - 2, 1, barH + 4);
      });
    },

    challenge: {
      question: "One mole of a monatomic ideal gas ($C_V = \\frac{3}{2}R, \\; C_P = \\frac{5}{2}R$) undergoes an isobaric expansion at constant pressure $P_0$ from volume $V_0$ to $2V_0$. What fraction of the total heat $Q$ absorbed by the gas is converted into work $W$ done by the gas?",
      options: [
        "$2/3 \\; (66.7\\%)$",
        "$2/5 \\; (40.0\\%)$",
        "$3/5 \\; (60.0\\%)$",
        "$1/2 \\; (50.0\\%)$",
        "$5/2 \\; (250\\%)$"
      ],
      correct: 1,
      explanation: "For an isobaric expansion: Work done $W = P_0 \\Delta V = P_0 (2V_0 - V_0) = P_0 V_0 = R \\Delta T$. Heat absorbed $Q = n C_P \\Delta T = \\frac{5}{2} R \\Delta T = \\frac{5}{2} P_0 V_0$. Change in internal energy $\\Delta U = n C_V \\Delta T = \\frac{3}{2} P_0 V_0$. Note that $\\Delta U = Q - W = \\frac{5}{2} P_0 V_0 - P_0 V_0 = \\frac{3}{2} P_0 V_0$. The fraction of heat converted to work is $W / Q = \\frac{R \\Delta T}{\\frac{5}{2} R \\Delta T} = \\frac{2}{5} = 40\\%$. The remaining $60\\%$ ($\\frac{3}{5}$) goes into increasing internal energy."
    }
  };

  PGRE.visualizers['cpgf-5.18'] = {
    id: 'cpgf-5.18',
    title: 'Heisenberg Uncertainty Principle: $\\sigma_x \\sigma_p \\ge \\hbar/2$',
    formulaLatex: '\\sigma_x \\sigma_p \\ge \\frac{\\hbar}{2}, \\qquad [\\hat{x}, \\hat{p}] = i\\hbar',
    physicalStory: `The Heisenberg uncertainty principle is a mathematical consequence of the non-commutativity of conjugate quantum observables in Hilbert space and the wave nature of matter. Position space $\\psi(x)$ and momentum space $\\tilde{\\psi}(p)$ are connected by the Fourier transform: $\\tilde{\\psi}(p) = \\frac{1}{\\sqrt{2\\pi\\hbar}}\\int_{-\\infty}^\\infty \\psi(x) e^{-ipx/\\hbar} dx$. Squeezing a wavepacket in real space (reducing $\\sigma_x$) forces a wider superposition of spatial frequencies, inherently broadening $\\sigma_p$. The Gaussian wavepacket uniquely achieves the theoretical minimum uncertainty limit $\\sigma_x \\sigma_p = \\hbar/2$. Any non-Gaussian profile or phase chirp strictly increases the uncertainty product beyond $\\hbar/2$.`,

    derivationSteps: [
      {
        step: "1. Canonical Commutation Relation",
        latex: "[\\hat{x}, \\hat{p}] = \\hat{x}\\left(-i\\hbar \\frac{\\partial}{\\partial x}\\right) - \\left(-i\\hbar \\frac{\\partial}{\\partial x}\\right)\\hat{x} = i\\hbar \\hat{I}",
        explanation: "Position and momentum operators do not commute, meaning a quantum state cannot simultaneously be an eigenstate of both operators."
      },
      {
        step: "2. Robertson-Schrödinger Uncertainty Relation",
        latex: "\\sigma_A^2 \\sigma_B^2 \\ge \\frac{1}{4} |\\langle [\\hat{A}, \\hat{B}] \\rangle|^2",
        explanation: "Derived via the Cauchy-Schwarz inequality for state vectors $|\\alpha\\rangle = (\\hat{A} - \\langle A \\rangle)|\\psi\\rangle$ and $|\\beta\\rangle = (\\hat{B} - \\langle B \\rangle)|\\psi\\rangle$."
      },
      {
        step: "3. Minimum Uncertainty Bound",
        latex: "\\sigma_x^2 \\sigma_p^2 \\ge \\frac{1}{4} |\\langle i\\hbar \\rangle|^2 = \\frac{\\hbar^2}{4} \\implies \\sigma_x \\sigma_p \\ge \\frac{\\hbar}{2}",
        explanation: "Taking the square root gives the universal lower bound $\\hbar/2$ on the product of root-mean-square standard deviations."
      },
      {
        step: "4. Saturation by Gaussian Wavepackets",
        latex: "\\psi(x) = \\left(\\frac{1}{2\\pi\\sigma_x^2}\\right)^{1/4} e^{-\\frac{(x-x_0)^2}{4\\sigma_x^2} + \\frac{i p_0 x}{\\hbar}} \\implies \\sigma_x \\sigma_p = \\frac{\\hbar}{2}",
        explanation: "Equality $\\sigma_x \\sigma_p = \\hbar/2$ holds if and only if the wavefunction is a Gaussian with linear phase (e.g. the ground state of the simple harmonic oscillator)."
      }
    ],

    limitingCases: [
      {
        name: "Extreme Spatial Localization (Dirac Delta)",
        condition: "\\sigma_x \\to 0",
        formula: "\\sigma_p \\to \\infty, \\quad \\langle \\hat{T} \\rangle = \\frac{\\langle p^2 \\rangle}{2m} \\to \\infty",
        explanation: "Confining a particle to a pinpoint creates an infinite spread in momentum and infinite zero-point confinement kinetic energy."
      },
      {
        name: "Momentum Eigenstate (Plane Wave)",
        condition: "\\sigma_p \\to 0 \\implies p = p_0",
        formula: "\\sigma_x \\to \\infty, \\quad |\\psi(x)|^2 = \\text{const}",
        explanation: "A monochromatic de Broglie plane wave has perfectly known momentum $p = \\hbar k$, but is completely delocalized across the entire universe."
      },
      {
        name: "Harmonic Oscillator Ground State",
        condition: "\\sigma_x = \\sqrt{\\frac{\\hbar}{2m\\omega}}, \\; \\sigma_p = \\sqrt{\\frac{m\\hbar\\omega}{2}}",
        formula: "\\sigma_x \\sigma_p = \\frac{\\hbar}{2}, \\quad E_0 = \\frac{1}{2}\\hbar\\omega",
        explanation: "The ground state energy $E_0 = \\hbar\\omega/2$ of a harmonic oscillator represents the exact minimum zero-point energy permitted by the uncertainty principle."
      },
      {
        name: "Energy-Time Uncertainty (Mandelstam-Tamm)",
        condition: "\\Delta t = \\tau = \\frac{\\sigma_Q}{|d\\langle Q \\rangle/dt|}",
        formula: "\\Delta E \\Delta t \\ge \\frac{\\hbar}{2}",
        explanation: "Relates the resonance energy width $\\Gamma = \\Delta E$ of an unstable state to its mean decay lifetime $\\tau$: $\\Gamma \\tau \\sim \\hbar$."
      }
    ],

    greTraps: [
      {
        trap: "Factor of 2: $\\hbar/2$ vs $\\hbar$ vs $h$",
        description: "Standard quantum mechanics uses RMS standard deviations $\\sigma_x \\sigma_p \\ge \\hbar/2$. Heuristic order-of-magnitude estimates often use $\\Delta x \\Delta p \\approx \\hbar$ or $h$.",
        proTip: "If a PGRE question asks for the rigorous quantum mechanical lower bound, choose $\\hbar/2$ (not $\\hbar$ or $h$)."
      },
      {
        trap: "Confinement Energy Scaling",
        description: "Confining a particle inside size $L$ means $\\Delta p \\approx \\hbar/L$, so non-relativistic kinetic energy scales as $E \\approx \\frac{\\hbar^2}{2m L^2}$, while ultra-relativistic energy scales as $E \\approx \\frac{\\hbar c}{L}$.",
        proTip: "Use this trick to immediately estimate ground state energies of atoms, nuclei, and quantum dots."
      },
      {
        trap: "Phase Chirping Increases Uncertainty",
        description: "Adding a quadratic phase $e^{i \\alpha x^2}$ widens the momentum distribution without changing $|\\psi(x)|^2$, making $\\sigma_x \\sigma_p > \\hbar/2$.",
        proTip: "Only unchirped Gaussian wavepackets saturate the minimum $\\hbar/2$ bound."
      }
    ],

    parameters: [
      { id: 'sigmaX', name: 'Position width $\\sigma_x$', min: 0.2, max: 2.5, step: 0.05, default: 0.8, unit: 'x_0' },
      { id: 'p0', name: 'Central momentum $p_0 / \\hbar$', min: 0.0, max: 8.0, step: 0.5, default: 4.0, unit: 'k_0' },
      { id: 'chirp', name: 'Phase chirp $\\alpha$', min: 0.0, max: 2.0, step: 0.1, default: 0.0, unit: '' }
    ],

    init: function(container, state, redraw) {
      state = state || {};
      if (state.sigmaX === undefined) state.sigmaX = 0.8;
      if (state.p0 === undefined) state.p0 = 4.0;
      if (state.chirp === undefined) state.chirp = 0.0;
    },

    draw: function(ctx, width, height, state, dt) {
      state = state || {};
      var sigmaX = Math.max(0.12, Number(state.sigmaX) || 0.8);
      var p0 = state.p0 !== undefined ? Number(state.p0) : 4.0;
      var chirp = Number(state.chirp) || 0.0;
      var hbar = 1.0;
      var sigmaP_min = hbar / (2 * sigmaX);
      var sigmaP = Math.sqrt(sigmaP_min * sigmaP_min + Math.pow(2 * chirp * sigmaX, 2));
      var product = sigmaX * sigmaP;
      var isMin = Math.abs(product - 0.5) < 0.005;

      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, width, height);

      legend('Heisenberg $\\sigma_x \\sigma_p \\ge \\hbar/2$', [
        { label: '$\\sigma_x$', value: '$' + sigmaX.toFixed(2) + '$' },
        { label: '$\\sigma_p$', value: '$' + sigmaP.toFixed(2) + ' \\hbar$' },
        { label: '$\\sigma_x \\sigma_p$', value: '$' + product.toFixed(3) + ' \\hbar$' },
        { label: 'Bound $\\hbar/2$', value: '$0.500 \\hbar$' },
        { label: 'Status', value: isMin ? 'Minimum saturated' : (chirp > 0 ? 'Above bound (chirp)' : 'Above bound') }
      ]);

      var pad = 12;
      var gap = 12;
      var subH = (height - pad * 2 - gap) / 2;
      var subW = width - pad * 2;
      var numPts = 280;

      function drawPanel(x0, y0, w, h, title) {
        ctx.fillStyle = C.panel;
        ctx.strokeStyle = C.line;
        ctx.lineWidth = 1;
        panelPath(ctx, x0, y0, w, h, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = C.ink;
        ctx.font = '600 12px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(title, x0 + 10, y0 + 12);
        return { bodyTop: y0 + 24, bodyBot: y0 + h - 8 };
      }

      var topY = pad;
      var xRange = Math.max(6.0, 3.2 * sigmaX);
      var pos = drawPanel(pad, topY, subW, subH, 'ψ(x)  position');
      var yBase1 = pos.bodyTop + (pos.bodyBot - pos.bodyTop) * 0.62;
      var yAmpUp1 = yBase1 - pos.bodyTop - 6;
      var yAmpDown1 = pos.bodyBot - yBase1 - 14;
      function mapX(x) { return pad + 8 + ((x + xRange) / (2 * xRange)) * (subW - 16); }
      var normX = 1 / Math.pow(2 * Math.PI * sigmaX * sigmaX, 0.25);
      var maxRe = 0;
      var maxProb = 0;
      var i, x, env, phase, re, prob;
      for (i = 0; i <= numPts; i++) {
        x = -xRange + (2 * xRange) * (i / numPts);
        env = Math.exp(-(x * x) / (4 * sigmaX * sigmaX)) * normX;
        re = Math.abs(env);
        if (re > maxRe) maxRe = re;
        prob = Math.exp(-(x * x) / (2 * sigmaX * sigmaX)) * (normX * normX);
        if (prob > maxProb) maxProb = prob;
      }
      var scaleProb = yAmpUp1 / Math.max(maxProb, 1e-6);
      var scaleRe = Math.min(yAmpUp1, yAmpDown1) / Math.max(maxRe, 1e-6);

      ctx.strokeStyle = C.line;
      ctx.beginPath();
      ctx.moveTo(pad + 8, yBase1);
      ctx.lineTo(pad + subW - 8, yBase1);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(mapX(-xRange), yBase1);
      for (i = 0; i <= numPts; i++) {
        x = -xRange + (2 * xRange) * (i / numPts);
        prob = Math.exp(-(x * x) / (2 * sigmaX * sigmaX)) * (normX * normX);
        ctx.lineTo(mapX(x), yBase1 - prob * scaleProb);
      }
      ctx.lineTo(mapX(xRange), yBase1);
      ctx.closePath();
      var gradX = ctx.createLinearGradient(0, pos.bodyTop, 0, pos.bodyBot);
      gradX.addColorStop(0, 'rgba(204, 120, 92, 0.38)');
      gradX.addColorStop(1, 'rgba(204, 120, 92, 0.03)');
      ctx.fillStyle = gradX;
      ctx.fill();

      ctx.strokeStyle = C.coral;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (i = 0; i <= numPts; i++) {
        x = -xRange + (2 * xRange) * (i / numPts);
        env = Math.exp(-(x * x) / (4 * sigmaX * sigmaX)) * normX;
        phase = p0 * x + chirp * x * x;
        re = env * Math.cos(phase);
        if (i === 0) ctx.moveTo(mapX(x), yBase1 - re * scaleRe);
        else ctx.lineTo(mapX(x), yBase1 - re * scaleRe);
      }
      ctx.stroke();

      var sxL = mapX(-sigmaX);
      var sxR = mapX(sigmaX);
      ctx.strokeStyle = C.gold;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(sxL, pos.bodyTop);
      ctx.lineTo(sxL, pos.bodyBot);
      ctx.moveTo(sxR, pos.bodyTop);
      ctx.lineTo(sxR, pos.bodyBot);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C.gold;
      ctx.font = '600 10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('1σ Position Spread', clamp((sxL + sxR) / 2, pad + 24, pad + subW - 24), yBase1 + 3);

      var botY = pad + subH + gap;
      var mom = drawPanel(pad, botY, subW, subH, 'Momentum Distribution |ψ(p)|²');
      var pMin = Math.min(-3.0, p0 - 3.5 * sigmaP);
      var pMax = Math.max(12.0, p0 + 3.5 * sigmaP);
      var pSpan = Math.max(1e-6, pMax - pMin);
      function mapPm(p) { return pad + 8 + ((p - pMin) / pSpan) * (subW - 16); }
      var yBase2 = mom.bodyTop + (mom.bodyBot - mom.bodyTop) * 0.78;
      var yAmp2 = yBase2 - mom.bodyTop - 6;
      var normP = 1 / (Math.sqrt(2 * Math.PI) * Math.max(sigmaP, 1e-6));
      var maxProbP = 0;
      var p, probP;
      for (i = 0; i <= numPts; i++) {
        p = pMin + pSpan * (i / numPts);
        probP = Math.exp(-Math.pow(p - p0, 2) / (2 * sigmaP * sigmaP)) * normP;
        if (probP > maxProbP) maxProbP = probP;
      }
      var scaleP = yAmp2 / Math.max(maxProbP, 1e-6);

      ctx.strokeStyle = C.line;
      ctx.beginPath();
      ctx.moveTo(pad + 8, yBase2);
      ctx.lineTo(pad + subW - 8, yBase2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(mapPm(pMin), yBase2);
      for (i = 0; i <= numPts; i++) {
        p = pMin + pSpan * (i / numPts);
        probP = Math.exp(-Math.pow(p - p0, 2) / (2 * sigmaP * sigmaP)) * normP;
        ctx.lineTo(mapPm(p), yBase2 - probP * scaleP);
      }
      ctx.lineTo(mapPm(pMax), yBase2);
      ctx.closePath();
      var gradP = ctx.createLinearGradient(0, mom.bodyTop, 0, mom.bodyBot);
      gradP.addColorStop(0, 'rgba(93, 184, 166, 0.40)');
      gradP.addColorStop(1, 'rgba(93, 184, 166, 0.03)');
      ctx.fillStyle = gradP;
      ctx.fill();

      ctx.strokeStyle = C.teal;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (i = 0; i <= numPts; i++) {
        p = pMin + pSpan * (i / numPts);
        probP = Math.exp(-Math.pow(p - p0, 2) / (2 * sigmaP * sigmaP)) * normP;
        if (i === 0) ctx.moveTo(mapPm(p), yBase2 - probP * scaleP);
        else ctx.lineTo(mapPm(p), yBase2 - probP * scaleP);
      }
      ctx.stroke();

      var spL = mapPm(p0 - sigmaP);
      var spR = mapPm(p0 + sigmaP);
      ctx.strokeStyle = C.gold;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(spL, mom.bodyTop);
      ctx.lineTo(spL, mom.bodyBot);
      ctx.moveTo(spR, mom.bodyTop);
      ctx.lineTo(spR, mom.bodyBot);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C.gold;
      ctx.font = '600 10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('1σ Momentum Spread', clamp((spL + spR) / 2, pad + 24, pad + subW - 24), yBase2 + 3);
    },

    challenge: {
      question: "A quantum particle of mass $m$ is in the ground state of a 1D simple harmonic oscillator of classical frequency $\\omega$, described by wavefunction $\\psi_0(x) = \\left(\\frac{m\\omega}{\\pi \\hbar}\\right)^{1/4} \\exp\\left(-\\frac{m\\omega x^2}{2\\hbar}\\right)$. What is the exact product of the standard deviations $\\sigma_x \\sigma_p$ for this state?",
      options: [
        "$\\hbar$",
        "$\\hbar / 2$",
        "$\\hbar / \\sqrt{2}$",
        "$3\\hbar / 2$",
        "$0$"
      ],
      correct: 1,
      explanation: "The ground state of a quantum harmonic oscillator is a Gaussian wavepacket. For $\\psi_0(x)$, the position uncertainty is $\\sigma_x = \\sqrt{\\frac{\\hbar}{2m\\omega}}$ and momentum uncertainty is $\\sigma_p = \\sqrt{\\frac{m \\hbar \\omega}{2}}$. The product is $\\sigma_x \\sigma_p = \\sqrt{\\frac{\\hbar}{2m\\omega}} \\cdot \\sqrt{\\frac{m \\hbar \\omega}{2}} = \\frac{\\hbar}{2}$, which uniquely saturates the Heisenberg minimum uncertainty equality. Higher excited states $n$ have $\\sigma_x \\sigma_p = \\left(n + \\frac{1}{2}\\right)\\hbar > \\frac{\\hbar}{2}$."
    }
  };

  /* Helper particle seeders for cpgf-4.32 */
  function seedGasP432(state, n) {
    n = n || 24;
    state._particlesP = [];
    for (var i = 0; i < n; i++) {
      state._particlesP.push({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2
      });
    }
  }
  function seedGasV432(state, n) {
    n = n || 24;
    state._particlesV = [];
    for (var i = 0; i < n; i++) {
      state._particlesV.push({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2
      });
    }
  }

  /* -------------------------------------------------------------------------- */
  /* cpgf-4.32: Heat Capacity at Constant Pressure $C_P = (\partial Q/\partial T)_P$ */
  /* -------------------------------------------------------------------------- */
  PGRE.visualizers['cpgf-4.32'] = {
    id: 'cpgf-4.32',
    title: 'Heat Capacity at Constant Pressure: $C_P = (\\partial Q/\\partial T)_P$',
    formulaLatex: 'C_P = \\left(\\frac{\\partial Q}{\\partial T}\\right)_P = \\left(\\frac{\\partial H}{\\partial T}\\right)_P = T \\left(\\frac{\\partial S}{\\partial T}\\right)_P',
    physicalStory: `Heat capacity $C \\equiv \\delta Q / dT$ quantifies a thermodynamic system's thermal inertia—the amount of thermal energy required to produce a unit increase in temperature. Because heat $\\delta Q$ is path-dependent, the heat capacity depends crucially on the external constraints maintained during heating.

At constant volume ($C_V = (\\partial Q/\\partial T)_V = (\\partial U/\\partial T)_V$), rigid boundaries prevent volume changes ($dV = 0$). Zero mechanical work is performed on the surroundings ($W = 0$). Consequently, by the First Law ($dU = \\delta Q - \\delta W$), 100% of the injected thermal energy directly fuels the microscopic kinetic degrees of freedom of the particles, raising internal energy and temperature.

At constant pressure ($C_P = (\\partial Q/\\partial T)_P$), the system is free to expand against the constant external pressure ($dV > 0$). In expanding, the gas performs positive boundary work on the environment: $W = \\int P\\, dV = P\\Delta V = n R \\Delta T$. Therefore, added heat must simultaneously increase the internal thermal energy *and* supply the mechanical energy needed to push back the surroundings:
$$\\delta Q_P = dU + P\\,dV = d(U + PV) = dH$$
where $H \\equiv U + PV$ is the thermodynamic enthalpy.

Because energy is siphoned into mechanical expansion work, a larger heat input is required to achieve the exact same $1\\text{ K}$ temperature rise under constant pressure than under constant volume. Hence, $C_P > C_V$ is guaranteed for all normal matter. For an ideal gas, Mayer's relation gives $C_P - C_V = n R$. For arbitrary substances, the universal thermodynamic identity $C_P - C_V = \\frac{V T \\beta^2}{\\kappa_T} \\ge 0$ guarantees this inequality as a direct consequence of thermodynamic stability ($\kappa_T > 0, T > 0$).`,

    derivationSteps: [
      {
        step: "1. Heat Differential & First Law Decomposition",
        latex: "\\delta Q = dU + \\delta W = dU + P\\,dV",
        explanation: "Express internal energy as a function of temperature and volume $U(T, V)$: $dU = \\left(\\frac{\\partial U}{\\partial T}\\right)_V dT + \\left(\\frac{\\partial U}{\\partial V}\\right)_T dV$. Substituting into the First Law gives $\\delta Q = \\left(\\frac{\\partial U}{\\partial T}\\right)_V dT + \\left[P + \\left(\\frac{\\partial U}{\\partial V}\\right)_T\\right] dV$."
      },
      {
        step: "2. Constant Pressure Constraint & Enthalpy Equivalence",
        latex: "C_P \\equiv \\left(\\frac{\\partial Q}{\\partial T}\\right)_P = \\left(\\frac{\\partial U}{\\partial T}\\right)_V + \\left[P + \\left(\\frac{\\partial U}{\\partial V}\\right)_T\\right] \\left(\\frac{\\partial V}{\\partial T}\\right)_P = \\left(\\frac{\\partial H}{\\partial T}\\right)_P",
        explanation: "Dividing by $dT$ at constant $P$ yields $C_P$. Enthalpy $H \\equiv U + PV$ has differential $dH = dU + P dV + V dP = \\delta Q + V dP$. At constant pressure $dP = 0$, so $dH_P = \\delta Q_P$, confirming $C_P = (\\partial H/\\partial T)_P = T(\\partial S/\\partial T)_P$."
      },
      {
        step: "3. Ideal Gas & Mayer's Relation",
        latex: "C_P - C_V = n R \\implies C_{P,m} - C_{V,m} = R",
        explanation: "For an ideal gas, Joule's free expansion experiment confirms $(\\partial U/\\partial V)_T = 0$. The ideal gas equation $PV = nRT$ gives $P(\\partial V/\\partial T)_P = nR$. Substituting into Step 2 yields $C_P = C_V + nR$, or molar $C_{P,m} = \\frac{f+2}{2}R$ where $f$ is the active degrees of freedom."
      },
      {
        step: "4. Universal Thermodynamic Relation for Arbitrary Matter",
        latex: "C_P - C_V = T \\left(\\frac{\\partial P}{\\partial T}\\right)_V \\left(\\frac{\\partial V}{\\partial T}\\right)_P = \\frac{V T \\beta^2}{\\kappa_T} \\ge 0",
        explanation: "Using Maxwell relations and the triple product rule, the difference depends on the thermal expansion coefficient $\\beta = \\frac{1}{V}\\left(\\frac{\\partial V}{\\partial T}\\right)_P$ and isothermal compressibility $\\kappa_T = -\\frac{1}{V}\\left(\\frac{\\partial V}{\\partial P}\\right)_T$. Since mechanical stability requires $\\kappa_T > 0$, $C_P \\ge C_V$ unconditionally."
      }
    ],

    limitingCases: [
      {
        name: "Monatomic Ideal Gas (He, Ne, Ar)",
        condition: "f = 3 \\text{ (pure translation)}",
        formula: "C_V = \\frac{3}{2}R, \\quad C_P = \\frac{5}{2}R, \\quad \\gamma = \\frac{C_P}{C_V} = \\frac{5}{3} \\approx 1.667",
        explanation: "At all accessible temperatures, only the 3 translational degrees of freedom are active ($U = \\frac{3}{2}nRT$)."
      },
      {
        name: "Diatomic Ideal Gas at Room Temp (N₂, O₂, Air)",
        condition: "f = 5 \\text{ (3 trans + 2 rot, vib frozen)}",
        formula: "C_V = \\frac{5}{2}R, \\quad C_P = \\frac{7}{2}R, \\quad \\gamma = \\frac{7}{5} = 1.400",
        explanation: "Rotational levels are thermally excited ($\\Theta_{\\text{rot}} \\sim 2-85\\text{ K}$), but vibrational excitation requires $T \\gg \\Theta_{\\text{vib}} \\sim 1000-3000\\text{ K}$ and remains frozen in the quantum ground state."
      },
      {
        name: "Diatomic Ideal Gas at High Temperature",
        condition: "f = 7 \\text{ (3 trans + 2 rot + 1 vib mode)}",
        formula: "C_V = \\frac{7}{2}R, \\quad C_P = \\frac{9}{2}R, \\quad \\gamma = \\frac{9}{7} \\approx 1.286",
        explanation: "At high temperatures, the vibrational mode activates, contributing $R$ ($\\frac{1}{2}R$ kinetic + $\\frac{1}{2}R$ potential) to molar heat capacity."
      },
      {
        name: "Incompressible Solid or Liquid",
        condition: "\\beta \\to 0, \\; \\Delta V \\approx 0",
        formula: "C_P \\approx C_V \\approx 3R \\text{ (Dulong-Petit limit for solids)}",
        explanation: "Because the expansion work $P\\Delta V$ is negligible in dense condensed phases, isobaric and isochoric heat capacities nearly coincide."
      },
      {
        name: "Isothermal and Reversible Adiabatic Processes",
        condition: "dT = 0 \\text{ or } \\delta Q = 0",
        formula: "C_{\\text{iso}} = \\pm \\infty, \\quad C_{\\text{ad}} = 0",
        explanation: "Along an isotherm, heat enters without changing temperature ($C = \\delta Q / 0 = \\infty$). Along a reversible adiabat, zero heat enters ($C = 0 / dT = 0$)."
      }
    ],

    greTraps: [
      {
        trap: "Enthalpy vs Internal Energy Association",
        description: "$C_P$ is the temperature derivative of enthalpy $H$ at constant $P$: $C_P = (\\partial H/\\partial T)_P$. $C_V$ is the temperature derivative of internal energy $U$ at constant $V$: $C_V = (\\partial U/\\partial T)_V$.",
        proTip: "Remember: at constant pressure $dH = \\delta Q$; at constant volume $dU = \\delta Q$. Pair $P$ with $H$ and $V$ with $U$ on Physics GRE questions."
      },
      {
        trap: "Vibrational Degree of Freedom Adds R, Not (1/2)R",
        description: "Translation and rotation contribute $\\frac{1}{2}R$ per quadratic term. A 1D vibrational harmonic oscillator has two quadratic terms (kinetic $p^2/(2m)$ + potential $\\frac{1}{2}kx^2$), adding a full $R$ to molar heat capacity.",
        proTip: "For diatomic gas with active vibrations: $C_V = \\frac{3}{2}R\\text{ (trans)} + \\frac{2}{2}R\\text{ (rot)} + \\frac{2}{2}R\\text{ (vib)} = \\frac{7}{2}R$, giving $C_P = \\frac{9}{2}R$."
      },
      {
        trap: "Physical Reason Why $C_P > C_V$",
        description: "Isobaric heating allows gas expansion, performing work $W = P\\Delta V$ on the surroundings. Extra heat is required to perform this boundary work in addition to raising temperature.",
        proTip: "For identical heat $\\Delta Q$ injected, $\\Delta T_V > \\Delta T_P$ because no energy is lost to work in the constant-volume chamber."
      },
      {
        trap: "Water Anomaly Between $0^\\circ\\text{C}$ and $4^\\circ\\text{C}$",
        description: "Water contracts upon heating between $0^\\circ\\text{C}$ and $4^\\circ\\text{C}$ ($\\beta < 0$). However, $C_P - C_V = \\frac{V T \\beta^2}{\\kappa_T}$ is proportional to $\\beta^2$, so $C_P \\ge C_V$ is STILL strictly positive!",
        proTip: "$C_P$ is never less than $C_V$ for any thermodynamically stable single-phase equilibrium substance."
      }
    ],

    parameters: [
      { id: 'gasType', name: 'Gas model', type: 'select', options: [
        { value: 'monatomic', label: 'Monatomic (He, Ar): $\\gamma = 5/3$' },
        { value: 'diatomic_rt', label: 'Diatomic room temp (N₂, O₂): $\\gamma = 7/5$' },
        { value: 'diatomic_high', label: 'Diatomic high temp (+vib): $\\gamma = 9/7$' },
        { value: 'solid_dulong', label: 'Solid (Dulong-Petit): $C \\approx 3R$' }
      ], default: 'diatomic_rt' },
      { id: 'heatInput', name: 'Heat input $\\Delta Q$', min: 100, max: 1000, step: 50, default: 500, unit: 'J' },
      { id: 'tempK', name: 'Base temperature $T_0$', min: 20, max: 1500, step: 10, default: 300, unit: 'K' },
      { id: 'rightView', name: 'Right panel view', type: 'select', options: [
        { value: 'energy_bars', label: 'Energy partitioning ($\\Delta U$ vs $W$)' },
        { value: 'cp_curve', label: '$C(T)$ Quantum staircase' }
      ], default: 'energy_bars' },
      { id: 'animate', name: 'Particle animation', type: 'toggle', default: true }
    ],

    init(container, state, redraw) {
      state = state || {};
      if (!state._particlesP) seedGasP432(state);
      if (!state._particlesV) seedGasV432(state);
    },

    draw(ctx, width, height, state, dt) {
      state = state || {};
      const gasType = state.gasType || 'diatomic_rt';
      const heatInput = Number(state.heatInput != null ? state.heatInput : 500);
      const T0 = Number(state.tempK != null ? state.tempK : 300);
      const rightView = state.rightView || 'energy_bars';
      const animate = state.animate !== false;

      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, width, height);

      if (!state._particlesP) seedGasP432(state);
      if (!state._particlesV) seedGasV432(state);

      const R = 8.314; // J / (mol · K)
      const n = 1.0;   // 1 mole

      // Degrees of freedom & heat capacities per mole
      let f = 5;
      let Cv_m = 2.5 * R;
      let Cp_m = 3.5 * R;
      let gamma = 7 / 5;
      let gasLabel = 'Diatomic (N₂, O₂)';

      if (gasType === 'monatomic') {
        f = 3;
        Cv_m = 1.5 * R;
        Cp_m = 2.5 * R;
        gamma = 5 / 3;
        gasLabel = 'Monatomic (He, Ar)';
      } else if (gasType === 'diatomic_high') {
        f = 7;
        Cv_m = 3.5 * R;
        Cp_m = 4.5 * R;
        gamma = 9 / 7;
        gasLabel = 'Diatomic High-T (+Vib)';
      } else if (gasType === 'solid_dulong') {
        f = 6;
        Cv_m = 3.0 * R;
        Cp_m = 3.1 * R; // small thermal expansion work
        gamma = Cp_m / Cv_m;
        gasLabel = 'Solid (Dulong-Petit)';
      }

      const CP = n * Cp_m;
      const CV = n * Cv_m;

      // Thermodynamics response to heat injection ΔQ
      // 1. Isobaric (P = const): ΔT_P = ΔQ / C_P, W_P = PΔV = n R ΔT_P, ΔU_P = C_V ΔT_P = ΔQ - W_P
      const DeltaT_P = heatInput / CP;
      const T_P = T0 + DeltaT_P;
      const W_P = (gasType === 'solid_dulong') ? (heatInput * (Cp_m - Cv_m) / Cp_m) : (n * R * DeltaT_P);
      const DeltaU_P = heatInput - W_P;
      const vRatio_P = 1 + (DeltaT_P / Math.max(50, T0)) * 0.75;

      // 2. Isochoric (V = const): W_V = 0, ΔU_V = ΔQ, ΔT_V = ΔQ / C_V
      const DeltaT_V = heatInput / CV;
      const T_V = T0 + DeltaT_V;
      const W_V = 0;
      const DeltaU_V = heatInput;
      const pRatio_V = 1 + (DeltaT_V / Math.max(50, T0)) * 0.75;

      // Off-canvas legend strip (Typeset cleanly with KaTeX)
      legend('Heat capacity $C_P = (\\partial Q/\\partial T)_P$', [
        { label: 'Model', value: gasLabel },
        { label: '$C_P$', value: '$' + (Cp_m / R).toFixed(2) + ' R = ' + Cp_m.toFixed(1) + '\\text{ J/(mol}\\cdot\\text{K)}$' },
        { label: '$C_V$', value: '$' + (Cv_m / R).toFixed(2) + ' R = ' + Cv_m.toFixed(1) + '\\text{ J/(mol}\\cdot\\text{K)}$' },
        { label: '$C_P - C_V$', value: '$' + ((Cp_m - Cv_m) / R).toFixed(2) + ' R = ' + (Cp_m - Cv_m).toFixed(1) + '\\text{ J/(mol}\\cdot\\text{K)}$' },
        { label: '$\\gamma = C_P/C_V$', value: '$' + gamma.toFixed(3) + '$' }
      ]);
      legend('Isobaric vs Isochoric response ($\\Delta Q = ' + heatInput.toFixed(0) + '\\text{ J}$)', [
        { label: 'Isobaric $\\Delta T_P$', value: '$+' + DeltaT_P.toFixed(1) + '\\text{ K} \\quad (T_P = ' + T_P.toFixed(1) + '\\text{ K})$' },
        { label: 'Isochoric $\\Delta T_V$', value: '$+' + DeltaT_V.toFixed(1) + '\\text{ K} \\quad (T_V = ' + T_V.toFixed(1) + '\\text{ K})$' },
        { label: 'Isobaric work $W_P$', value: '$+' + W_P.toFixed(1) + '\\text{ J} \\quad (' + ((W_P / heatInput) * 100).toFixed(1) + '\\%)$' },
        { label: 'Isobaric $\\Delta U_P$', value: '$+' + DeltaU_P.toFixed(1) + '\\text{ J} \\quad (' + ((DeltaU_P / heatInput) * 100).toFixed(1) + '\\%)$' },
        { label: "Mayer's law $C_P - C_V$", value: '$n R = ' + (n * R).toFixed(2) + '\\text{ J/K}$' },
        { label: 'Work fraction $W_P/\\Delta Q$', value: '$(\\gamma-1)/\\gamma = ' + ((W_P / heatInput) * 100).toFixed(1) + '\\%$' },
        { label: 'Thermal fraction $\\Delta U_P/\\Delta Q$', value: '$1/\\gamma = ' + ((DeltaU_P / heatInput) * 100).toFixed(1) + '\\%$' }
      ]);

      var pad = 12;
      var leftW = Math.floor(width * 0.54);
      var leftH = height - pad * 2;
      var rightX = pad + leftW + 10;
      var rightW = width - rightX - pad;

      /* ==================================================================== */
      /* LEFT PANEL: Side-by-Side Dual Cylinder Simulation                   */
      /* ==================================================================== */
      ctx.fillStyle = C.panel;
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 1;
      panelPath(ctx, pad, pad, leftW, leftH, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = C.ink;
      ctx.font = '600 12px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('Constant Pressure vs Constant Volume', pad + 10, pad + 8);

      var subW = Math.floor((leftW - 32) / 2);
      var cylH = Math.min(136, Math.floor(leftH * 0.40));
      var cylY = pad + 38;

      // ----------------------------------------------------------------------
      // Chamber 1 (Left): Isobaric (Piston Free to Expand)
      // ----------------------------------------------------------------------
      var c1X = pad + 10;
      ctx.fillStyle = C.ivory;
      ctx.strokeStyle = C.stone;
      ctx.lineWidth = 1.6;
      ctx.fillRect(c1X, cylY, subW, cylH);
      ctx.strokeRect(c1X, cylY, subW, cylH);

      // Label header for chamber 1
      ctx.fillStyle = C.coral;
      ctx.font = '600 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Isobaric (Free Piston)', c1X + subW / 2, cylY - 14);

      // Piston height expands under heat
      var baseGasH = cylH * 0.52;
      var expandH = baseGasH * clamp(vRatio_P, 1.0, 1.65);
      var pistonY1 = cylY + cylH - expandH;
      var gasH1 = cylY + cylH - pistonY1;

      // Gas glow in chamber 1
      var normTP = clamp((T_P - 100) / 700, 0, 1);
      ctx.fillStyle = 'rgba(' +
        Math.floor(204 * normTP + 93 * (1 - normTP)) + ', ' +
        Math.floor(120 * normTP + 184 * (1 - normTP)) + ', ' +
        Math.floor(92 * normTP + 166 * (1 - normTP)) + ', 0.35)';
      ctx.fillRect(c1X + 2, pistonY1, subW - 4, gasH1 - 2);

      // Animated gas particles (speed ~ sqrt(T))
      if (state._particlesP && gasH1 > 6) {
        var spdP = Math.sqrt(Math.max(0.2, T_P / 300)) * (animate ? 1.4 : 0);
        ctx.fillStyle = normTP > 0.5 ? C.gold : C.coral;
        state._particlesP.forEach(function(p) {
          p.x += p.vx * spdP * 0.012;
          p.y += p.vy * spdP * 0.012;
          if (p.x < 0) { p.x = 0; p.vx *= -1; }
          if (p.x > 1) { p.x = 1; p.vx *= -1; }
          if (p.y < 0) { p.y = 0; p.vy *= -1; }
          if (p.y > 1) { p.y = 1; p.vy *= -1; }
          var px = c1X + 4 + p.x * (subW - 8);
          var py = pistonY1 + 3 + p.y * (gasH1 - 6);
          ctx.beginPath();
          ctx.arc(px, py, 2.2, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Piston slab & weight on top
      ctx.fillStyle = C.stone;
      ctx.fillRect(c1X + 2, pistonY1 - 9, subW - 4, 9);
      // Piston shaft & atmospheric load
      ctx.fillStyle = C.muted;
      var shaftH1 = Math.max(4, pistonY1 - 9 - (cylY + 4));
      ctx.fillRect(c1X + subW / 2 - 3, cylY + 4, 6, shaftH1);
      // Atmospheric pressure weight block
      ctx.fillStyle = C.deep;
      ctx.fillRect(c1X + subW / 2 - 18, cylY + 2, 36, 8);
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 8px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Piston Load', c1X + subW / 2, cylY + 8);

      // Upward work vector arrow (if expanding)
      if (W_P > 5) {
        ctx.strokeStyle = C.coral;
        ctx.fillStyle = C.coral;
        ctx.lineWidth = 2;
        var ax1 = c1X + subW - 10;
        var ay1Bot = pistonY1 - 12;
        var ay1Top = Math.max(cylY + 12, ay1Bot - 16);
        ctx.beginPath();
        ctx.moveTo(ax1, ay1Bot);
        ctx.lineTo(ax1, ay1Top);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ax1, ay1Top);
        ctx.lineTo(ax1 - 3, ay1Top + 5);
        ctx.lineTo(ax1 + 3, ay1Top + 5);
        ctx.fill();
      }

      // Heating coil at bottom of Chamber 1
      var coilY1 = cylY + cylH + 2;
      ctx.fillStyle = 'rgba(204, 120, 92, 0.35)';
      ctx.fillRect(c1X, coilY1, subW, 14);
      ctx.fillStyle = C.coral;
      ctx.font = '600 9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Heater', c1X + subW / 2, coilY1 + 7);

      // Temperature pill 1
      var pill1Y = coilY1 + 18;
      ctx.fillStyle = C.ivory;
      ctx.strokeStyle = C.coral;
      ctx.lineWidth = 1.2;
      panelPath(ctx, c1X, pill1Y, subW, 40, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = C.coral;
      ctx.font = '600 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('Isobaric Temperature', c1X + subW / 2, pill1Y + 4);
      ctx.fillStyle = C.ink;
      ctx.font = '600 12px "JetBrains Mono", monospace';
      ctx.fillText(T_P.toFixed(1) + ' K', c1X + subW / 2, pill1Y + 16);
      ctx.fillStyle = C.muted;
      ctx.font = '9px Inter, sans-serif';
      ctx.fillText('Rise: +' + DeltaT_P.toFixed(1) + ' K', c1X + subW / 2, pill1Y + 28);

      // ----------------------------------------------------------------------
      // Chamber 2 (Right): Isochoric (Rigid Clamps / Locked)
      // ----------------------------------------------------------------------
      var c2X = pad + 10 + subW + 12;
      ctx.fillStyle = C.ivory;
      ctx.strokeStyle = C.stone;
      ctx.lineWidth = 1.6;
      ctx.fillRect(c2X, cylY, subW, cylH);
      ctx.strokeRect(c2X, cylY, subW, cylH);

      // Label header for chamber 2
      ctx.fillStyle = C.teal;
      ctx.font = '600 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Isochoric (Locked Volume)', c2X + subW / 2, cylY - 14);

      // Piston height is locked at base height
      var pistonY2 = cylY + cylH - baseGasH;
      var gasH2 = cylH - (pistonY2 - cylY);

      // Gas glow in chamber 2 (warmer because ΔT_V > ΔT_P!)
      var normTV = clamp((T_V - 100) / 700, 0, 1);
      ctx.fillStyle = 'rgba(' +
        Math.floor(204 * normTV + 93 * (1 - normTV)) + ', ' +
        Math.floor(120 * normTV + 184 * (1 - normTV)) + ', ' +
        Math.floor(92 * normTV + 166 * (1 - normTV)) + ', 0.45)';
      ctx.fillRect(c2X + 2, pistonY2, subW - 4, gasH2 - 2);

      // Animated gas particles in Chamber 2 (faster!)
      if (state._particlesV && gasH2 > 6) {
        var spdV = Math.sqrt(Math.max(0.2, T_V / 300)) * (animate ? 1.4 : 0);
        ctx.fillStyle = normTV > 0.5 ? C.gold : C.coral;
        state._particlesV.forEach(function(p) {
          p.x += p.vx * spdV * 0.012;
          p.y += p.vy * spdV * 0.012;
          if (p.x < 0) { p.x = 0; p.vx *= -1; }
          if (p.x > 1) { p.x = 1; p.vx *= -1; }
          if (p.y < 0) { p.y = 0; p.vy *= -1; }
          if (p.y > 1) { p.y = 1; p.vy *= -1; }
          var px = c2X + 4 + p.x * (subW - 8);
          var py = pistonY2 + 3 + p.y * (gasH2 - 6);
          ctx.beginPath();
          ctx.arc(px, py, 2.2, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Piston slab & lock clamps
      ctx.fillStyle = C.stone;
      ctx.fillRect(c2X + 2, pistonY2 - 9, subW - 4, 9);
      // Rigid locking pins
      ctx.fillStyle = C.deep;
      ctx.fillRect(c2X - 3, pistonY2 - 12, 8, 6);
      ctx.fillRect(c2X + subW - 5, pistonY2 - 12, 8, 6);
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 7px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PIN', c2X + 1, pistonY2 - 7);
      ctx.fillText('PIN', c2X + subW - 1, pistonY2 - 7);

      // Lock status badge
      ctx.fillStyle = C.teal;
      ctx.font = '600 9px Inter, sans-serif';
      ctx.fillText('LOCKED (Zero Work)', c2X + subW / 2, cylY + 12);

      // Pressure gauge on side of Chamber 2
      var gaugeX = c2X + subW - 16;
      var gaugeY = cylY + cylH - 24;
      ctx.beginPath();
      ctx.arc(gaugeX, gaugeY, 9, 0, Math.PI * 2);
      ctx.fillStyle = C.ivory;
      ctx.fill();
      ctx.strokeStyle = C.stone;
      ctx.stroke();
      // Needle pointing up-right (high P)
      var needleAngle = -Math.PI * 0.7 + clamp(pRatio_V - 1, 0, 1) * Math.PI * 0.8;
      ctx.beginPath();
      ctx.moveTo(gaugeX, gaugeY);
      ctx.lineTo(gaugeX + 7 * Math.cos(needleAngle), gaugeY + 7 * Math.sin(needleAngle));
      ctx.strokeStyle = C.rose;
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Heating coil at bottom of Chamber 2 (identical heat input)
      var coilY2 = cylY + cylH + 2;
      ctx.fillStyle = 'rgba(93, 184, 166, 0.35)';
      ctx.fillRect(c2X, coilY2, subW, 14);
      ctx.fillStyle = C.teal;
      ctx.font = '600 9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Heater', c2X + subW / 2, coilY2 + 7);

      // Temperature pill 2
      var pill2Y = coilY2 + 18;
      ctx.fillStyle = C.ivory;
      ctx.strokeStyle = C.teal;
      ctx.lineWidth = 1.2;
      panelPath(ctx, c2X, pill2Y, subW, 40, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = C.teal;
      ctx.font = '600 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('Isochoric Temperature', c2X + subW / 2, pill2Y + 4);
      ctx.fillStyle = C.ink;
      ctx.font = '600 12px "JetBrains Mono", monospace';
      ctx.fillText(T_V.toFixed(1) + ' K', c2X + subW / 2, pill2Y + 16);
      ctx.fillStyle = C.muted;
      ctx.font = '9px Inter, sans-serif';
      ctx.fillText('Rise: +' + DeltaT_V.toFixed(1) + ' K', c2X + subW / 2, pill2Y + 28);

      // Bottom Comparison banner across left panel
      var bannerY = leftH - pad - 18;
      ctx.fillStyle = C.ivory;
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 1;
      panelPath(ctx, pad + 10, bannerY, leftW - 20, 26, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = C.deep;
      ctx.font = '600 10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Equal Heat: Isochoric chamber reaches higher temperature', pad + leftW / 2, bannerY + 13);

      /* ==================================================================== */
      /* RIGHT PANEL: Switchable Mode (Energy Bars OR C(T) Quantum Staircase)*/
      /* ==================================================================== */
      ctx.fillStyle = C.panel;
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 1;
      panelPath(ctx, rightX, pad, rightW, leftH, 8);
      ctx.fill();
      ctx.stroke();

      if (rightView === 'energy_bars') {
        // --- MODE A: ENERGY PARTITIONING BARS ---
        ctx.fillStyle = C.ink;
        ctx.font = '600 12px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('Energy Partitioning', rightX + 10, pad + 8);

        ctx.fillStyle = C.muted;
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText('First Law: Heat into internal energy vs work', rightX + 10, pad + 24);

        var barPanelY = pad + 44;
        var barPanelW = rightW - 20;

        // Section 1: Isobaric Bars
        ctx.fillStyle = C.coral;
        ctx.font = '600 11px Inter, sans-serif';
        ctx.fillText('Isobaric Partitioning', rightX + 10, barPanelY);

        var qP_w = Math.floor(barPanelW * 0.95);
        var barH = 12;

        // Q bar (Total heat added)
        var by1 = barPanelY + 16;
        ctx.fillStyle = C.muted;
        ctx.font = '9px Inter, sans-serif';
        ctx.fillText('Total Heat Input (100%)', rightX + 10, by1);
        ctx.fillStyle = C.gold;
        ctx.fillRect(rightX + 10, by1 + 12, qP_w, barH);

        // Partition split: ΔU and W
        var by2 = by1 + 30;
        var fracU_P = clamp(DeltaU_P / heatInput, 0, 1);
        var fracW_P = clamp(W_P / heatInput, 0, 1);
        var wU_P = Math.floor(qP_w * fracU_P);
        var wW_P = qP_w - wU_P;

        ctx.fillStyle = C.muted;
        ctx.fillText('Thermal Energy (' + (fracU_P * 100).toFixed(0) + '%)', rightX + 10, by2);
        ctx.textAlign = 'right';
        ctx.fillText('Work (' + (fracW_P * 100).toFixed(0) + '%)', rightX + 10 + qP_w, by2);
        ctx.textAlign = 'left';

        ctx.fillStyle = C.teal;
        ctx.fillRect(rightX + 10, by2 + 12, wU_P, barH);
        ctx.fillStyle = C.coral;
        ctx.fillRect(rightX + 10 + wU_P, by2 + 12, wW_P, barH);

        // Section 2: Isochoric Bars
        var barPanel2Y = by2 + 38;
        ctx.fillStyle = C.teal;
        ctx.font = '600 11px Inter, sans-serif';
        ctx.fillText('Isochoric Partitioning', rightX + 10, barPanel2Y);

        var by3 = barPanel2Y + 16;
        ctx.fillStyle = C.muted;
        ctx.font = '9px Inter, sans-serif';
        ctx.fillText('Total Heat Input (100%)', rightX + 10, by3);
        ctx.fillStyle = C.gold;
        ctx.fillRect(rightX + 10, by3 + 12, qP_w, barH);

        var by4 = by3 + 30;
        ctx.fillStyle = C.muted;
        ctx.fillText('Thermal Energy (100% — Zero Work)', rightX + 10, by4);
        ctx.fillStyle = C.teal;
        ctx.fillRect(rightX + 10, by4 + 12, qP_w, barH);

        // Section 3: Summary Mathematical Proportions Box
        var sumBoxY = by4 + 34;
        var sumBoxH = leftH - (sumBoxY - pad) - 10;
        if (sumBoxH > 45) {
          ctx.fillStyle = C.ivory;
          ctx.strokeStyle = C.line;
          ctx.lineWidth = 1;
          panelPath(ctx, rightX + 10, sumBoxY, barPanelW, sumBoxH, 6);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = C.ink;
          ctx.font = '600 10px Inter, sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText("Key Thermodynamic Insights", rightX + 18, sumBoxY + 8);

          ctx.fillStyle = C.muted;
          ctx.font = '9px Inter, sans-serif';
          ctx.fillText('• Isobaric work siphons energy: smaller temperature rise', rightX + 18, sumBoxY + 22);
          ctx.fillText('• Isochoric locks volume: all heat fuels internal energy', rightX + 18, sumBoxY + 36);
          if (sumBoxH > 64) {
            ctx.fillText('• Consequence: Heat capacity C_P > C_V for all matter', rightX + 18, sumBoxY + 50);
          }
        }

      } else {
        // --- MODE B: C(T) QUANTUM STAIRCASE CURVE ---
        ctx.fillStyle = C.ink;
        ctx.font = '600 12px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('Heat Capacity vs Temperature', rightX + 10, pad + 8);

        ctx.fillStyle = C.muted;
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText('Degree-of-freedom activation vs temperature', rightX + 10, pad + 24);

        // Coordinate axes for log10(T) from T=10K to T=2000K
        var plotX = rightX + 34;
        var plotY = pad + 44;
        var plotW = rightW - 48;
        var plotH = leftH - 74;

        ctx.fillStyle = C.ivory;
        ctx.fillRect(plotX, plotY, plotW, plotH);
        ctx.strokeStyle = C.line;
        ctx.strokeRect(plotX, plotY, plotW, plotH);

        var minLogT = 1.0; // 10 K
        var maxLogT = 3.3; // ~2000 K
        var maxC = 5.5;    // in units of R

        function mapT_X(t) {
          var logVal = Math.log10(Math.max(10, t));
          return plotX + ((logVal - minLogT) / (maxLogT - minLogT)) * plotW;
        }
        function mapC_Y(cR) {
          return plotY + plotH - (cR / maxC) * plotH;
        }

        // Horizontal gridlines for C/R = 1.5, 2.5, 3.5, 4.5
        ctx.strokeStyle = 'rgba(230, 223, 216, 0.7)';
        ctx.lineWidth = 1;
        ctx.fillStyle = C.muted;
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        [1.5, 2.5, 3.5, 4.5].forEach(function(val) {
          var gy = mapC_Y(val);
          ctx.beginPath();
          ctx.moveTo(plotX, gy);
          ctx.lineTo(plotX + plotW, gy);
          ctx.stroke();
          ctx.fillText(val.toFixed(1) + ' R', plotX - 4, gy);
        });

        // Vertical gridlines for T = 50K, 300K, 1000K
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        [50, 300, 1000].forEach(function(tVal) {
          var gx = mapT_X(tVal);
          ctx.beginPath();
          ctx.moveTo(gx, plotY);
          ctx.lineTo(gx, plotY + plotH);
          ctx.stroke();
          ctx.fillText(tVal >= 1000 ? (tVal/1000) + 'k' : String(tVal), gx, plotY + plotH + 4);
        });

        // Axis label for temperature
        ctx.fillStyle = C.muted;
        ctx.font = '9px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('T (K)', plotX + plotW, plotY + plotH + 4);

        // Quantum freeze-out model function:
        function calcCvModel(t) {
          var rotFrac = 1 / (1 + Math.exp(-(Math.log(t) - Math.log(70)) * 2.2));
          var vibFrac = 1 / (1 + Math.exp(-(Math.log(t) - Math.log(900)) * 2.0));
          return 1.5 + 1.0 * rotFrac + 1.0 * vibFrac;
        }

        // Plot Shaded Gap between C_P(T) and C_V(T) (Width = 1.0 R)
        var numCurvePts = 60;
        ctx.beginPath();
        for (var i = 0; i <= numCurvePts; i++) {
          var logT = minLogT + (maxLogT - minLogT) * (i / numCurvePts);
          var t = Math.pow(10, logT);
          var cvVal = calcCvModel(t);
          var cpVal = cvVal + 1.0;
          var x = plotX + (i / numCurvePts) * plotW;
          var y = mapC_Y(cpVal);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        for (var i = numCurvePts; i >= 0; i--) {
          var logT = minLogT + (maxLogT - minLogT) * (i / numCurvePts);
          var t = Math.pow(10, logT);
          var cvVal = calcCvModel(t);
          var x = plotX + (i / numCurvePts) * plotW;
          var y = mapC_Y(cvVal);
          ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(212, 160, 23, 0.16)';
        ctx.fill();

        // Plot C_P(T) curve (Coral)
        ctx.strokeStyle = C.coral;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        for (var i = 0; i <= numCurvePts; i++) {
          var logT = minLogT + (maxLogT - minLogT) * (i / numCurvePts);
          var t = Math.pow(10, logT);
          var cpVal = calcCvModel(t) + 1.0;
          var x = plotX + (i / numCurvePts) * plotW;
          var y = mapC_Y(cpVal);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Plot C_V(T) curve (Teal)
        ctx.strokeStyle = C.teal;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        for (var i = 0; i <= numCurvePts; i++) {
          var logT = minLogT + (maxLogT - minLogT) * (i / numCurvePts);
          var t = Math.pow(10, logT);
          var cvVal = calcCvModel(t);
          var x = plotX + (i / numCurvePts) * plotW;
          var y = mapC_Y(cvVal);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Regime annotations at top of plot
        ctx.fillStyle = C.stone;
        ctx.font = '8px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Translational (f=3)', mapT_X(25), plotY + 10);
        ctx.fillText('Rotational (f=5)', mapT_X(300), plotY + 10);
        ctx.fillText('Vibrational (f=7)', mapT_X(1400), plotY + 10);

        // Labels on curves
        ctx.fillStyle = C.coral;
        ctx.font = '600 10px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('C_P(T)', plotX + plotW - 36, mapC_Y(4.6) - 4);

        ctx.fillStyle = C.teal;
        ctx.fillText('C_V(T)', plotX + plotW - 36, mapC_Y(3.4) + 12);

        // Gap label
        ctx.fillStyle = C.gold;
        ctx.font = '600 9px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Mayer Gap: R', plotX + plotW * 0.45, mapC_Y(3.0));

        // Current operating point marker
        var curCvR = calcCvModel(T0);
        var curCpR = curCvR + 1.0;
        var opX = mapT_X(T0);
        var opYp = mapC_Y(curCpR);
        var opYv = mapC_Y(curCvR);

        ctx.strokeStyle = C.stone;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(opX, plotY);
        ctx.lineTo(opX, plotY + plotH);
        ctx.stroke();
        ctx.setLineDash([]);

        // Operating point dot on C_P
        ctx.fillStyle = C.coral;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(opX, opYp, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Operating point dot on C_V
        ctx.fillStyle = C.teal;
        ctx.beginPath();
        ctx.arc(opX, opYv, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    },

    challenge: {
      question: "A cylinder contains $2.0\\text{ moles}$ of an ideal diatomic gas at room temperature ($C_V = \\frac{5}{2}R, \\; C_P = \\frac{7}{2}R$). An electric heating element supplies $\\Delta Q = 700\\text{ J}$ of heat to the gas under constant atmospheric pressure ($P = 1.0\\text{ atm}$). How much mechanical work $W$ is done by the gas on the surroundings, and what is the increase in internal energy $\\Delta U$?",
      options: [
        "$W = 200\\text{ J}, \\quad \\Delta U = 500\\text{ J}$",
        "$W = 0\\text{ J}, \\quad \\Delta U = 700\\text{ J}$",
        "$W = 280\\text{ J}, \\quad \\Delta U = 420\\text{ J}$",
        "$W = 500\\text{ J}, \\quad \\Delta U = 200\\text{ J}$",
        "$W = 700\\text{ J}, \\quad \\Delta U = 0\\text{ J}$"
      ],
      correct: 0,
      explanation: "For an isobaric process: Heat added is $Q = n C_P \\Delta T = 700\\text{ J}$. Work done by expanding gas is $W = P \\Delta V = n R \\Delta T = \\left(\\frac{R}{C_P}\\right) Q = \\left(\\frac{R}{\\frac{7}{2} R}\\right) \\times 700\\text{ J} = \\frac{2}{7} \\times 700\\text{ J} = 200\\text{ J}$. Increase in internal energy is $\\Delta U = n C_V \\Delta T = \\left(\\frac{C_V}{C_P}\\right) Q = \\left(\\frac{\\frac{5}{2} R}{\\frac{7}{2} R}\\right) \\times 700\\text{ J} = \\frac{5}{7} \\times 700\\text{ J} = 500\\text{ J}$. Note that $\\Delta U + W = 500\\text{ J} + 200\\text{ J} = 700\\text{ J} = Q$, exactly conserving energy under the First Law."
    }
  };

})(typeof window !== 'undefined' ? window : globalThis);
