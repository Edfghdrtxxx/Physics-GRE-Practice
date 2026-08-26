/* Formula visualizers — G10 free particle / relativistic KE / decay */
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
  var clamp = H.clamp;
  var formatSci = H.formatSci;
  var getPotentialColor = H.getPotentialColor;
  var initCard1Charges = H.initCard1Charges;
  var drawMarchingContours = H.drawMarchingContours;
  var initAtomLattice = H.initAtomLattice;
  var EPSILON_0 = H.EPSILON_0;
  var K_COULOMB = H.K_COULOMB;

  var CREAM = '#faf9f5';
  var PANEL = '#f5f0e8';
  var LINE = '#e6dfd8';
  var INK = '#141413';
  var MUTED = '#6c6a64';
  var CORAL = '#cc785c';
  var CORAL_DEEP = '#964b32';
  var GOLD = '#d4a017';
  var TEAL = '#5db8a6';
  var AXIS = '#8e8b82';
  var ROSE = '#e05666';
  var GRID = 'rgba(20, 20, 19, 0.08)';
  var SANS = '11px Inter, -apple-system, sans-serif';
  var MONO = '11px "JetBrains Mono", ui-monospace, monospace';

  function fillStage(ctx, width, height) {
    ctx.fillStyle = (CV && CV.colors && CV.colors.bg) || CREAM;
    ctx.fillRect(0, 0, width, height);
  }

  function vizLegend(title, rows) {
    if (PGRE.appendVizLegend) PGRE.appendVizLegend(title, rows);
  }


  PGRE.visualizers['cpgf-5.27'] = {
    id: 'cpgf-5.27',
    title: 'Free Particle Quantum Wave & Energy: $\\psi(x) = e^{\\pm ikx}, \\; E = \\hbar^2 k^2/(2m)$',
    formulaLatex: '\\psi(x) = e^{\\pm ikx}, \\qquad E = \\frac{\\hbar^2 k^2}{2m} = \\hbar \\omega',
    physicalStory: `For a free quantum particle ($V(x) = 0$), the time-independent Schrödinger equation yields complex plane-wave energy eigenstates $\\psi(x) = e^{\\pm ikx}$. The probability density $|\\psi(x)|^2 = 1$ is uniform throughout all space, reflecting absolute spatial delocalization in exchange for exact de Broglie momentum $p = \\hbar k$. The quantum dispersion relation $\\omega(k) = \\frac{\\hbar k^2}{2m}$ is quadratic in wavenumber $k$, creating a fundamental quantum phenomenon: the phase velocity $v_p = \\frac{\\omega}{k} = \\frac{\\hbar k}{2m} = \\frac{1}{2} v_{\\text{particle}}$ travels at exactly HALF the speed of the classical particle and group velocity $v_g = \\frac{d\\omega}{dk} = \\frac{\\hbar k}{m} = v_{\\text{particle}}$.`,

    derivationSteps: [
      {
        step: "1. Free Particle Schrödinger Equation",
        latex: "-\\frac{\\hbar^2}{2m} \\frac{d^2 \\psi}{dx^2} = E \\psi(x) \\implies \\frac{d^2 \\psi}{dx^2} + k^2 \\psi(x) = 0",
        explanation: "Where wavenumber $k = \\frac{\\sqrt{2mE}}{\\hbar}$ is real for any unbound scattering energy $E > 0$."
      },
      {
        step: "2. Plane Wave Momentum Eigenstates",
        latex: "\\hat{p} e^{ikx} = -i\\hbar \\frac{d}{dx} e^{ikx} = \\hbar k e^{ikx} \\implies p = \\hbar k = \\frac{h}{\\lambda}",
        explanation: "$e^{+ikx}$ is an exact right-moving momentum eigenstate with eigenvalue $+p$; $e^{-ikx}$ represents left-moving momentum $-p$."
      },
      {
        step: "3. Time-Dependent State & Dispersion Relation",
        latex: "\\Psi(x,t) = e^{i(kx - \\omega t)}, \\quad \\hbar \\omega = E = \\frac{\\hbar^2 k^2}{2m} \\implies \\omega(k) = \\frac{\\hbar k^2}{2m}",
        explanation: "The angular frequency $\\omega$ scales quadratically with $k$, unlike classical light waves where $\\omega = c k$ is linear."
      },
      {
        step: "4. Phase Velocity vs Group Velocity Factor of 2",
        latex: "v_p = \\frac{\\omega}{k} = \\frac{\\hbar k}{2m} = \\frac{v}{2}, \\qquad v_g = \\frac{d\\omega}{dk} = \\frac{\\hbar k}{m} = v",
        explanation: "The individual phase ripples move at $v/2$, while the localized packet envelope containing the particle moves at classical velocity $v = p/m$."
      }
    ],

    limitingCases: [
      {
        name: "Zero Momentum ($k \\to 0$)",
        condition: "k \\to 0",
        formula: "\\lambda \\to \\infty, \\quad E = 0, \\quad \\psi(x) = 1",
        explanation: "Static constant wavefunction with zero kinetic energy and infinite de Broglie wavelength."
      },
      {
        name: "Standing Wave Superposition",
        condition: "\\psi(x) = \\frac{e^{ikx} + e^{-ikx}}{2} = \\cos(kx)",
        formula: "|\\psi(x)|^2 = \\cos^2(kx), \\quad j = 0",
        explanation: "Equal counter-propagating waves create stationary spatial nodes with zero net probability current flux."
      },
      {
        name: "Relativistic de Broglie Wave",
        condition: "E = \\sqrt{p^2 c^2 + m^2 c^4} = \\gamma m c^2",
        formula: "v_p = \\frac{\\omega}{k} = \\frac{E}{p} = \\frac{c^2}{v} > c, \\quad v_g = v < c, \\quad v_p \\cdot v_g = c^2",
        explanation: "In special relativity, the phase velocity exceeds the speed of light, while the physical group velocity remains strictly subluminal."
      },
      {
        name: "Probability Current Density",
        condition: "j = \\frac{\\hbar}{2mi}\\left(\\psi^* \\nabla \\psi - \\psi \\nabla \\psi^*\\right)",
        formula: "j = \\frac{\\hbar k}{m} |A|^2 = v \\cdot \\rho",
        explanation: "Directly gives the classical fluid flux of probability flowing in the direction of wave propagation."
      }
    ],

    greTraps: [
      {
        trap: "Phase Velocity is $v/2$, Not $v$",
        description: "For non-relativistic Schrödinger matter waves, $v_{\\text{phase}} = v_{\\text{particle}} / 2$, while $v_{\\text{group}} = v_{\\text{particle}}$.",
        proTip: "Favorite PGRE multiple-choice question! If asked for phase velocity of an electron, divide the particle speed by 2."
      },
      {
        trap: "Non-Normalizability of Pure Plane Waves",
        description: "Pure plane waves $e^{ikx}$ cannot be normalized to 1 over infinite space ($\\int |e^{ikx}|^2 dx = \\infty$).",
        proTip: "They use Dirac delta normalization $\\langle k|k'\\rangle = 2\\pi \\delta(k - k')$. Physical localized particles are wavepackets formed by continuous Fourier integrals."
      },
      {
        trap: "Relativistic vs Non-Relativistic Dispersion",
        description: "Non-relativistic: $E \\propto k^2$ ($v_p = v/2$). Massless photons: $E = \\hbar c k \\propto k$ ($v_p = v_g = c$). Relativistic massive: $E^2 = (\\hbar k)^2 c^2 + m^2 c^4$ ($v_p = c^2/v > c$).",
        proTip: "Always identify whether the particle is non-relativistic or relativistic before computing $v_p$."
      }
    ],

    parameters: [
      { id: 'mode', name: 'Wave Mode', type: 'select', options: ['plane', 'packet', 'standing'], default: 'packet' },
      { id: 'k', name: 'Wavenumber $k$', min: 1.0, max: 6.0, step: 0.2, default: 3.0, unit: 'rad/m' },
      { id: 'speed', name: 'Time Speed', min: 0.2, max: 2.0, step: 0.1, default: 1.0, unit: 'x' }
    ],

    init(container, state, redraw) {
      createControlStyles();
      container.innerHTML = '';

      const panel = document.createElement('div');
      panel.className = 'pgre-control-panel';

      // Mode selector
      const mRow = document.createElement('div');
      mRow.className = 'pgre-control-row';
      mRow.innerHTML = `<span class="pgre-control-label">Wave Superposition:</span>`;
      const btnGroup = document.createElement('div');
      btnGroup.className = 'pgre-btn-group';

      const modes = [
        { id: 'plane', label: 'Plane Wave $e^{i(kx-\\omega t)}$' },
        { id: 'packet', label: 'Dispersive Wavepacket ($v_g$ vs $v_p$)' },
        { id: 'standing', label: 'Standing Wave $\\cos(kx)$' }
      ];

      modes.forEach(m => {
        const btn = document.createElement('button');
        btn.className = `pgre-btn ${(state.mode || 'packet') === m.id ? 'active' : ''}`;
        btn.textContent = m.label;
        btn.addEventListener('click', () => {
          state.mode = m.id;
          btnGroup.querySelectorAll('.pgre-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          redraw();
        });
        btnGroup.appendChild(btn);
      });
      mRow.appendChild(btnGroup);
      panel.appendChild(mRow);

      // k slider
      const kRow = document.createElement('div');
      kRow.className = 'pgre-control-row';
      kRow.innerHTML = `
        <span class="pgre-control-label">Wavenumber $k$:</span>
        <input type="range" class="pgre-slider" min="1.0" max="6.0" step="0.2" value="${state.k || 3.0}">
        <span class="pgre-control-value">${(state.k || 3.0).toFixed(1)}</span>
      `;
      const kSlider = kRow.querySelector('input');
      const kVal = kRow.querySelector('.pgre-control-value');
      kSlider.addEventListener('input', (e) => {
        state.k = parseFloat(e.target.value);
        kVal.textContent = state.k.toFixed(1);
        redraw();
      });
      panel.appendChild(kRow);

      // Speed slider
      const sRow = document.createElement('div');
      sRow.className = 'pgre-control-row';
      sRow.innerHTML = `
        <span class="pgre-control-label">Time Evolution Speed:</span>
        <input type="range" class="pgre-slider" min="0.2" max="2.0" step="0.1" value="${state.speed || 1.0}">
        <span class="pgre-control-value">${(state.speed || 1.0).toFixed(1)}x</span>
      `;
      const sSlider = sRow.querySelector('input');
      const sVal = sRow.querySelector('.pgre-control-value');
      sSlider.addEventListener('input', (e) => {
        state.speed = parseFloat(e.target.value);
        sVal.textContent = state.speed.toFixed(1) + 'x';
        redraw();
      });
      panel.appendChild(sRow);

      container.appendChild(panel);

      if (state._animTime === undefined) state._animTime = 0;
    },

    draw(ctx, width, height, state, dt) {
      const mode = state.mode || 'packet';
      const k = state.k || 3.0;
      const speed = state.speed || 1.0;

      state._animTime = (state._animTime || 0) + (dt || 0.016) * speed;
      const t = state._animTime;

      const omega = 0.5 * k * k;
      const vp = omega / k;
      const vg = k;

      fillStage(ctx, width, height);
      ctx.save();

      const padL = 28;
      const padR = 100;
      const padT = 30;
      const padB = 52;
      const plotX = padL;
      const plotY = padT;
      const plotW = Math.max(48, width - padL - padR);
      const plotH = Math.max(48, height - padT - padB);
      const midY = plotY + plotH * 0.52;
      const amp = plotH * 0.34;
      const numPts = 320;
      const xSpan = 10;

      function mapX(xNorm) { return plotX + xNorm * plotW; }

      ctx.strokeStyle = LINE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(plotX, midY);
      ctx.lineTo(plotX + plotW, midY);
      ctx.stroke();

      ctx.fillStyle = MUTED;
      ctx.font = SANS;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText('x', plotX + plotW, midY + 5);

      function keyItem(x, y, color, dashed, label) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = dashed ? 1.5 : 2.2;
        if (dashed) ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 16, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = INK;
        ctx.font = SANS;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x + 20, y);
        const tw = ctx.measureText ? ctx.measureText(label).width : label.length * 6;
        ctx.restore();
        return x + 20 + tw + 16;
      }

      if (mode === 'plane') {
        ctx.strokeStyle = CORAL;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        for (let i = 0; i <= numPts; i++) {
          const xNorm = i / numPts;
          const phase = k * (xNorm * xSpan) - omega * t;
          const py = midY - Math.cos(phase) * amp;
          const px = mapX(xNorm);
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();

        ctx.strokeStyle = TEAL;
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let i = 0; i <= numPts; i++) {
          const xNorm = i / numPts;
          const phase = k * (xNorm * xSpan) - omega * t;
          const py = midY - Math.sin(phase) * amp;
          const px = mapX(xNorm);
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(plotX, midY - amp);
        ctx.lineTo(plotX + plotW, midY - amp);
        ctx.stroke();

        let kx = plotX + 4;
        const ky = plotY + 10;
        kx = keyItem(kx, ky, CORAL, false, 'Re ψ');
        kx = keyItem(kx, ky, TEAL, true, 'Im ψ');
        keyItem(kx, ky, GOLD, false, '|ψ|² = 1');
      } else if (mode === 'standing') {
        ctx.strokeStyle = 'rgba(212, 160, 23, 0.55)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i <= numPts; i++) {
          const xNorm = i / numPts;
          const prob = Math.pow(Math.cos(k * xNorm * xSpan), 2);
          const px = mapX(xNorm);
          const py = midY - prob * amp;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();

        ctx.strokeStyle = CORAL;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        for (let i = 0; i <= numPts; i++) {
          const xNorm = i / numPts;
          const val = Math.cos(k * xNorm * xSpan) * Math.cos(omega * t);
          const px = mapX(xNorm);
          const py = midY - val * amp;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();

        ctx.fillStyle = GOLD;
        for (let n = 0; n < 20; n++) {
          const xNode = (Math.PI / 2 + n * Math.PI) / k;
          if (xNode < 0 || xNode > xSpan) continue;
          const px = mapX(xNode / xSpan);
          ctx.beginPath();
          ctx.arc(px, midY, 2.4, 0, Math.PI * 2);
          ctx.fill();
        }

        let kx = plotX + 4;
        const ky = plotY + 10;
        kx = keyItem(kx, ky, CORAL, false, 'Standing Wave Profile');
        keyItem(kx, ky, GOLD, false, 'Nodes of |ψ|²');
      } else {
        const sigma = 1.2;
        const timeScale = 0.25;
        const L = xSpan;
        const packetCenter = ((vg * t * timeScale) % L + L) % L;
        const phaseCrest = ((vp * t * timeScale) % L + L) % L;

        function envAt(xVal) {
          const d = xVal - packetCenter;
          return Math.exp(-(d * d) / (2 * sigma * sigma));
        }

        ctx.beginPath();
        ctx.moveTo(mapX(0), midY);
        for (let i = 0; i <= numPts; i++) {
          const xNorm = i / numPts;
          ctx.lineTo(mapX(xNorm), midY - envAt(xNorm * L) * amp);
        }
        ctx.lineTo(mapX(1), midY);
        ctx.closePath();
        ctx.fillStyle = 'rgba(93, 184, 166, 0.20)';
        ctx.fill();

        ctx.strokeStyle = CORAL;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i <= numPts; i++) {
          const xNorm = i / numPts;
          const xVal = xNorm * L;
          const val = envAt(xVal) * Math.cos(k * (xVal - vp * t * timeScale));
          const px = mapX(xNorm);
          const py = midY - val * amp;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();

        const peakX = mapX(packetCenter / L);
        const peakY = midY - amp - 6;
        ctx.fillStyle = GOLD;
        ctx.beginPath();
        ctx.arc(peakX, Math.max(plotY + 4, peakY), 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = CORAL_DEEP;
        ctx.lineWidth = 1;
        ctx.stroke();

        const trackY = plotY + plotH + 16;
        ctx.strokeStyle = LINE;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(plotX, trackY);
        ctx.lineTo(plotX + plotW, trackY);
        ctx.stroke();

        const crestX = mapX(phaseCrest / L);
        ctx.fillStyle = TEAL;
        ctx.beginPath();
        ctx.arc(crestX, trackY, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = MUTED;
        ctx.font = SANS;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('Phase Crest', plotX, trackY + 16);

        let kx = plotX + 4;
        const ky = plotY + 10;
        ctx.save();
        ctx.fillStyle = GOLD;
        ctx.beginPath();
        ctx.arc(kx + 4, ky, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = INK;
        ctx.font = SANS;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('Envelope', kx + 12, ky);
        const tw = ctx.measureText ? ctx.measureText('Envelope').width : 60;
        kx = kx + 12 + tw + 18;
        ctx.fillStyle = TEAL;
        ctx.beginPath();
        ctx.arc(kx + 4, ky, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = INK;
        ctx.fillText('Ripples', kx + 12, ky);
        ctx.restore();
      }

      const wheelX = width - padR / 2;
      const wheelY = padT + 42;
      const wheelR = 32;

      ctx.fillStyle = PANEL;
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(wheelX, wheelY, wheelR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = LINE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(wheelX - wheelR + 4, wheelY);
      ctx.lineTo(wheelX + wheelR - 4, wheelY);
      ctx.moveTo(wheelX, wheelY - wheelR + 4);
      ctx.lineTo(wheelX, wheelY + wheelR - 4);
      ctx.stroke();

      const phasorAngle = -omega * t;
      const tipX = wheelX + wheelR * Math.cos(phasorAngle);
      const tipY = wheelY + wheelR * Math.sin(phasorAngle);

      ctx.strokeStyle = CORAL;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(wheelX, wheelY);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();

      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(tipX, tipY, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = MUTED;
      ctx.font = SANS;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('Phasor', wheelX, wheelY + wheelR + 8);
      ctx.fillText('Re', wheelX + wheelR - 4, wheelY + 4);
      ctx.textAlign = 'left';
      ctx.fillText('Im', wheelX + 4, wheelY - wheelR + 2);

      ctx.restore();

      vizLegend('Free-particle wave', [
        { label: 'Mode', value: mode },
        { label: '$k$', value: '$' + k.toFixed(1) + '\\text{ rad/m}$' },
        { label: '$E = \\hbar^2 k^2/(2m)$', value: '$' + omega.toFixed(2) + '$' },
        { label: '$v_p = \\omega/k$', value: '$' + vp.toFixed(2) + '$' },
        { label: '$v_g = d\\omega/dk$', value: '$' + vg.toFixed(2) + '$' },
        { label: '$v_g / v_p$', value: '$2$' }
      ]);
    },

    challenge: {
      question: "A non-relativistic free particle of mass $m$ is described by the plane wave $\\Psi(x,t) = A \\exp(i(kx - \\omega t))$. If the classical particle velocity is $v = p/m$, what is the relationship between its quantum phase velocity $v_p = \\omega/k$ and its classical velocity $v$?",
      options: [
        "$v_p = v$",
        "$v_p = 2v$",
        "$v_p = v / 2$",
        "$v_p = c^2 / v$",
        "$v_p = v / 4$"
      ],
      correct: 2,
      explanation: "For a non-relativistic Schrödinger particle, $E = p^2/(2m) = \\hbar^2 k^2/(2m) = \\hbar \\omega$, so the dispersion relation is $\\omega(k) = \\hbar k^2/(2m)$. Phase velocity is $v_p = \\omega/k = \\hbar k/(2m) = p/(2m) = v/2$. Group velocity is $v_g = d\\omega/dk = \\hbar k/m = p/m = v$. Thus, the phase velocity is exactly HALF the classical particle velocity ($v_p = v/2$)."
    }
  };

  PGRE.visualizers['cpgf-6.18'] = {
    id: 'cpgf-6.18',
    title: 'Relativistic Kinetic Energy: $T = (\\gamma - 1)mc^2$',
    formulaLatex: 'T = E - mc^2 = (\\gamma - 1)mc^2, \\qquad \\gamma = \\frac{1}{\\sqrt{1 - v^2/c^2}}',
    physicalStory: `In special relativity, accelerating a particle with constant force does not produce infinite linear velocity because its relativistic inertia increases asymptotically as $v \\to c$. Total relativistic energy is $E = \\gamma mc^2 = \\sqrt{p^2 c^2 + m^2 c^4}$. Kinetic energy $T$ is defined as the work required to accelerate the particle from rest to speed $v$, which equals total energy minus rest energy: $T = E - mc^2 = (\\gamma - 1)mc^2$. In the non-relativistic limit $v \\ll c$, Taylor expanding $\\gamma$ recovers classical Newtonian kinetic energy $\\frac{1}{2}mv^2$ plus higher-order corrections. As $\\beta = v/c \\to 1$, $T \\to \\infty$, establishing the speed of light $c$ as an impassable cosmic speed limit for all massive bodies.`,

    derivationSteps: [
      {
        step: "1. Relativistic Work-Energy Theorem",
        latex: "W = \\int_0^x F\\, dx' = \\int_0^t \\frac{dp}{dt} v\\, dt' = \\int_0^v v\\, dp",
        explanation: "Work done by an external force accumulates as relativistic kinetic energy $T = W$."
      },
      {
        step: "2. Relativistic Momentum Integration",
        latex: "p = \\gamma m v = \\frac{mv}{\\sqrt{1 - v^2/c^2}} \\implies dp = \\gamma^3 m\\, dv",
        explanation: "Differentiating $p(v)$ yields the longitudinal relativistic mass factor $\\gamma^3 m$."
      },
      {
        step: "3. Direct Integration",
        latex: "T = \\int_0^v v (\\gamma^3 m)\\, dv = m \\int_0^v \\frac{v\\, dv}{(1 - v^2/c^2)^{3/2}} = mc^2 \\left[ \\frac{1}{\\sqrt{1 - v^2/c^2}} - 1 \\right] = (\\gamma - 1)mc^2",
        explanation: "Evaluating the definite integral from rest ($v=0, \\gamma=1$) to speed $v$ gives the exact relativistic kinetic energy."
      },
      {
        step: "4. Low-Velocity Taylor Expansion",
        latex: "\\gamma = (1 - \\beta^2)^{-1/2} = 1 + \\frac{1}{2}\\beta^2 + \\frac{3}{8}\\beta^4 + \\mathcal{O}(\\beta^6) \\implies T \\approx \\frac{1}{2}mv^2 + \\frac{3}{8}m\\frac{v^4}{c^2}",
        explanation: "For $v \\ll c$, the first term reproduces Newtonian $\\frac{1}{2}mv^2$. The second term is the first relativistic fine-structure correction."
      }
    ],

    limitingCases: [
      {
        name: "Classical Non-Relativistic Limit ($\\beta \\to 0$)",
        condition: "\\beta = v/c \\ll 1",
        formula: "T \\approx \\frac{1}{2}mv^2, \\quad E \\approx mc^2 + \\frac{1}{2}mv^2",
        explanation: "Relativistic discrepancy is less than $1\\%$ for speeds below $\\beta \\approx 0.115$."
      },
      {
        name: "Ultra-Relativistic Limit ($\\beta \\to 1, \\; \\gamma \\gg 1$)",
        condition: "\\gamma \\gg 1 \\implies E \\gg mc^2",
        formula: "T \\approx E \\approx pc \\approx \\gamma mc^2",
        explanation: "Rest mass becomes negligible; particle behaves like a massless photon with $E \\approx pc$ (e.g. LHC protons, cosmic rays)."
      },
      {
        name: "Massless Particle Limit ($m = 0$)",
        condition: "m = 0",
        formula: "E = pc, \\quad v = c \\text{ always}",
        explanation: "Photons and gluons possess zero rest mass and travel strictly at $c$, carrying energy purely via momentum."
      },
      {
        name: "Invariant Momentum-Energy Relation",
        condition: "E^2 - p^2 c^2 = m^2 c^4",
        formula: "pc = \\sqrt{T(T + 2mc^2)}",
        explanation: "Extremely useful PGRE formula relating momentum directly to kinetic energy without calculating $\\gamma$ or $v$."
      }
    ],

    greTraps: [
      {
        trap: "Confusing Total Energy $E$ with Kinetic Energy $T$",
        description: "Total energy is $E = \\gamma mc^2$. Kinetic energy is $T = (\\gamma - 1)mc^2$. If a question says 'total energy is 3 times rest energy', then $\\gamma = 3$ and $T = 2 mc^2$.",
        proTip: "Always check whether the problem asks for Total Energy $E$ or Kinetic Energy $T$!"
      },
      {
        trap: "Using $T = \\frac{1}{2} m v^2$ at High Speeds",
        description: "At $v = 0.8c$, $\\gamma = 1/0.6 = 1.667$. Exact $T = 0.667 mc^2$, whereas classical formula gives $0.32 mc^2$ (over $100\\%$ error!).",
        proTip: "Whenever $\\beta > 0.1$, you MUST use the relativistic formula $T = (\\gamma - 1)mc^2$."
      },
      {
        trap: "Electron Accelerated Across 1 MV",
        description: "An electron accelerated across potential $V$ acquires $T = e V$. For $V = 0.511\\text{ MV}$, $T = 1 m_e c^2 \\implies \\gamma = 2 \\implies v = (\\sqrt{3} / 2)c \\approx 0.866c$.",
        proTip: "Memorize $m_e c^2 \\approx 0.511\\text{ MeV}$ and $m_p c^2 \\approx 938\\text{ MeV}$ for rapid PGRE calculations."
      }
    ],

    parameters: [
      { id: 'beta', name: 'Velocity Ratio $\\beta = v/c$', min: 0.0, max: 0.99, step: 0.01, default: 0.80, unit: 'c' },
      { id: 'particle', name: 'Particle Type', type: 'select', options: ['electron', 'proton', 'muon'], default: 'electron' }
    ],

    init(container, state, redraw) {
      createControlStyles();
      container.innerHTML = '';

      const panel = document.createElement('div');
      panel.className = 'pgre-control-panel';

      // Beta slider
      const bRow = document.createElement('div');
      bRow.className = 'pgre-control-row';
      bRow.innerHTML = `
        <span class="pgre-control-label">Particle Velocity $\\beta = v/c$:</span>
        <input type="range" class="pgre-slider" min="0.0" max="0.99" step="0.01" value="${state.beta !== undefined ? state.beta : 0.80}">
        <span class="pgre-control-value">${(state.beta !== undefined ? state.beta : 0.80).toFixed(2)} c</span>
      `;
      const bSlider = bRow.querySelector('input');
      const bVal = bRow.querySelector('.pgre-control-value');
      bSlider.addEventListener('input', (e) => {
        state.beta = parseFloat(e.target.value);
        bVal.textContent = state.beta.toFixed(2) + ' c';
        redraw();
      });
      panel.appendChild(bRow);

      // Particle selection buttons
      const pRow = document.createElement('div');
      pRow.className = 'pgre-control-row';
      pRow.innerHTML = `<span class="pgre-control-label">Target Particle:</span>`;
      const btnGroup = document.createElement('div');
      btnGroup.className = 'pgre-btn-group';

      const particles = [
        { id: 'electron', label: 'Electron (0.511 MeV)' },
        { id: 'muon', label: 'Muon (105.7 MeV)' },
        { id: 'proton', label: 'Proton (938.3 MeV)' }
      ];

      particles.forEach(p => {
        const btn = document.createElement('button');
        btn.className = `pgre-btn ${(state.particle || 'electron') === p.id ? 'active' : ''}`;
        btn.textContent = p.label;
        btn.addEventListener('click', () => {
          state.particle = p.id;
          btnGroup.querySelectorAll('.pgre-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          redraw();
        });
        btnGroup.appendChild(btn);
      });
      pRow.appendChild(btnGroup);
      panel.appendChild(pRow);

      container.appendChild(panel);
    },

    draw(ctx, width, height, state, dt) {
      const beta = state.beta !== undefined ? state.beta : 0.80;
      const particle = state.particle || 'electron';

      let restMassMeV = 0.511;
      if (particle === 'proton') restMassMeV = 938.3;
      if (particle === 'muon') restMassMeV = 105.7;

      const gamma = 1 / Math.sqrt(Math.max(0.0001, 1 - beta * beta));
      const T_rel = (gamma - 1) * restMassMeV;
      const T_class = 0.5 * beta * beta * restMassMeV;
      const pc_MeV = Math.sqrt(Math.max(0, T_rel * (T_rel + 2 * restMassMeV)));
      const errPct = ((T_rel - T_class) / Math.max(0.001, T_rel)) * 100;

      fillStage(ctx, width, height);
      ctx.save();

      const margin = 16;
      const stackW = 118;
      const splitX = width - margin - stackW;
      const originX = margin + 42;
      const originY = height - margin - 32;
      const plotW = Math.max(40, splitX - originX - 12);
      const plotH = Math.max(40, originY - (margin + 28));

      const maxT_norm = Math.max(1.0, (gamma - 1) * 1.45, 0.6);
      function mapB(b) { return originX + (b / 1.0) * plotW; }
      function mapT(t_norm) { return originY - (t_norm / maxT_norm) * plotH; }

      ctx.strokeStyle = GRID;
      ctx.lineWidth = 1;
      ctx.fillStyle = MUTED;
      ctx.font = MONO;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (let b = 0; b <= 1.001; b += 0.2) {
        const gx = mapB(Math.min(b, 1));
        ctx.beginPath();
        ctx.moveTo(gx, originY);
        ctx.lineTo(gx, originY - plotH);
        ctx.stroke();
        ctx.fillText(b >= 0.99 ? 'c' : b.toFixed(1), gx, originY + 6);
      }

      const yTicks = 4;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (let i = 0; i <= yTicks; i++) {
        const tVal = (i / yTicks) * maxT_norm;
        const gy = mapT(tVal);
        ctx.beginPath();
        ctx.moveTo(originX, gy);
        ctx.lineTo(originX + plotW, gy);
        ctx.stroke();
        ctx.fillText(tVal.toFixed(1), originX - 6, gy);
      }

      const cX = mapB(1);
      ctx.strokeStyle = ROSE;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(cX, originY);
      ctx.lineTo(cX, originY - plotH);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = ROSE;
      ctx.font = SANS;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText('v = c', cX - 6, originY - plotH - 4);

      ctx.strokeStyle = AXIS;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(originX, originY - plotH);
      ctx.lineTo(originX, originY);
      ctx.lineTo(originX + plotW, originY);
      ctx.stroke();

      ctx.fillStyle = MUTED;
      ctx.font = SANS;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText('T / mc²', originX + 8, originY - plotH - 4);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText('β = v/c', originX + plotW - 10, originY + 20);

      ctx.save();
      ctx.beginPath();
      ctx.rect(originX, originY - plotH, plotW, plotH);
      ctx.clip();

      ctx.strokeStyle = GOLD;
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 100; i++) {
        const b = (i / 100) * 0.999;
        const px = mapB(b);
        const py = mapT(0.5 * b * b);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = CORAL;
      ctx.lineWidth = 2.6;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      for (let i = 0; i <= 120; i++) {
        const b = (i / 120) * 0.999;
        const g = 1 / Math.sqrt(Math.max(1e-6, 1 - b * b));
        const px = mapB(b);
        const py = mapT(g - 1);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();

      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = 'rgba(20, 20, 19, 0.28)';
      ctx.lineWidth = 1;
      const curX = mapB(Math.min(beta, 1));
      const curY = mapT(gamma - 1);
      ctx.beginPath();
      ctx.moveTo(curX, originY);
      ctx.lineTo(curX, curY);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = CREAM;
      ctx.strokeStyle = CORAL;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(curX, curY, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      const keyX = originX + 10;
      const keyY = originY - plotH + 16;
      ctx.strokeStyle = CORAL;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(keyX, keyY);
      ctx.lineTo(keyX + 18, keyY);
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.font = SANS;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('Relativistic Kinetic Energy', keyX + 24, keyY);

      ctx.strokeStyle = GOLD;
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(keyX, keyY + 16);
      ctx.lineTo(keyX + 18, keyY + 16);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = INK;
      ctx.fillText('Classical Kinetic Energy', keyX + 24, keyY + 16);

      const barX = splitX + 8;
      const barY = originY - plotH + 8;
      const barW = 36;
      const maxBarH = plotH - 16;
      const e0H = Math.max(10, maxBarH / gamma);
      const tH = Math.max(0, maxBarH - e0H);

      ctx.fillStyle = TEAL;
      ctx.fillRect(barX, barY + maxBarH - e0H, barW, e0H);
      ctx.strokeStyle = '#3d8f82';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY + maxBarH - e0H, barW, e0H);

      if (tH > 1) {
        ctx.fillStyle = CORAL;
        ctx.fillRect(barX, barY, barW, tH);
        ctx.strokeStyle = CORAL_DEEP;
        ctx.strokeRect(barX, barY, barW, tH);
      }

      ctx.font = SANS;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const labX = barX + barW + 8;
      if (tH > 18) {
        ctx.fillStyle = CORAL_DEEP;
        ctx.fillText('T', labX, barY + tH / 2);
      }
      if (e0H > 18) {
        ctx.fillStyle = MUTED;
        ctx.fillText('mc²', labX, barY + maxBarH - e0H / 2);
      }

      ctx.restore();

      vizLegend('Relativistic kinetic energy', [
        { label: 'Particle', value: particle },
        { label: '$\\beta = v/c$', value: '$' + beta.toFixed(2) + '$' },
        { label: '$\\gamma$', value: '$' + gamma.toFixed(3) + '$' },
        { label: '$E_0 = mc^2$', value: '$' + restMassMeV.toFixed(3) + '\\text{ MeV}$' },
        { label: '$T = (\\gamma - 1)mc^2$', value: '$' + T_rel.toFixed(3) + '\\text{ MeV}$' },
        { label: '$T_{\\text{Newton}}$', value: '$' + T_class.toFixed(3) + '\\text{ MeV}$' },
        { label: '$pc$', value: '$' + pc_MeV.toFixed(3) + '\\text{ MeV}$' },
        { label: 'Error vs Newton', value: '$' + errPct.toFixed(1) + '\\%$' }
      ]);
    },

    challenge: {
      question: "An electron of rest mass $m_e$ ($m_e c^2 \\approx 0.511\\text{ MeV}$) is accelerated from rest across a potential difference of $\\Delta V = 1.022\\text{ MV}$, acquiring kinetic energy $T = 2 m_e c^2$. What is the electron's final speed $v$ in terms of $c$?",
      options: [
        "$(\\sqrt{3} / 2) c \\approx 0.866 c$",
        "$(2\\sqrt{2} / 3) c \\approx 0.943 c$",
        "$(1 / 3) c \\approx 0.333 c$",
        "$(8 / 9) c \\approx 0.889 c$",
        "$2 c$"
      ],
      correct: 1,
      explanation: "Kinetic energy is $T = (\\gamma - 1) m_e c^2 = 2 m_e c^2 \\implies \\gamma - 1 = 2 \\implies \\gamma = 3$. By definition of $\\gamma = 1 / \\sqrt{1 - \\beta^2}$, we have $1 - \\beta^2 = 1 / \\gamma^2 = 1/9 \\implies \\beta^2 = 8/9 \\implies \\beta = \\sqrt{8}/3 = 2\\sqrt{2} / 3 \\approx 0.9428 c$. Note: Using classical $T = \\frac{1}{2} m v^2 = 2 mc^2$ would yield $v = 2c > c$, which violates relativity."
    }
  };

  PGRE.visualizers['cpgf-7.17'] = {
    id: 'cpgf-7.17',
    title: 'Radioactive Decay Law: $N(t) = N_0 e^{-t/\\tau}$',
    formulaLatex: 'N(t) = N_0 e^{-t/\\tau} = N_0 e^{-\\lambda t} = N_0 \\left(\\frac{1}{2}\\right)^{t/t_{1/2}}',
    physicalStory: `Radioactive decay is a memoryless Poisson stochastic process where every unstable parent nucleus possesses a fixed transition probability per unit time $\\lambda$ of spontaneously decaying into a daughter nucleus, regardless of its previous age. For a large macroscopic ensemble $N_0$, the statistical aggregate follows a smooth exponential curve $N(t) = N_0 e^{-\\lambda t} = N_0 e^{-t/\\tau}$. The mean lifetime $\\tau = 1/\\lambda$ represents the average survival duration of a nucleus before decay (when $N(\\tau) = N_0/e \\approx 36.8\\% N_0$). The half-life $t_{1/2} = \\tau \\ln 2 \\approx 0.693 \\tau$ is the time elapsed when exactly half the original sample has decayed.`,

    derivationSteps: [
      {
        step: "1. Differential Decay Rate & Poisson Probability",
        latex: "dN = -\\lambda N(t)\\, dt \\implies \\frac{dN}{N} = -\\lambda\\, dt",
        explanation: "The rate of loss of parent nuclei is directly proportional to the number of surviving nuclei $N(t)$ present at time $t$."
      },
      {
        step: "2. Direct Integration",
        latex: "\\int_{N_0}^{N(t)} \\frac{dN'}{N'} = -\\lambda \\int_0^t dt' \\implies \\ln\\left(\\frac{N(t)}{N_0}\\right) = -\\lambda t \\implies N(t) = N_0 e^{-\\lambda t}",
        explanation: "Integrating both sides yields the classical exponential radioactive decay law."
      },
      {
        step: "3. Half-Life & Lifetime Relationship",
        latex: "N(t_{1/2}) = \\frac{N_0}{2} = N_0 e^{-t_{1/2}/\\tau} \\implies t_{1/2} = \\tau \\ln 2 = \\frac{\\ln 2}{\\lambda} \\approx 0.69315\\, \\tau",
        explanation: "Because $\\ln 2 < 1$, the half-life $t_{1/2}$ is always shorter than the mean lifetime $\\tau$."
      },
      {
        step: "4. Mean Lifetime & Activity",
        latex: "\\langle t \\rangle = \\frac{\\int_0^\\infty t \\lambda N_0 e^{-\\lambda t}\\, dt}{N_0} = \\frac{1}{\\lambda} = \\tau, \\qquad A(t) = -\\frac{dN}{dt} = \\lambda N(t) = A_0 e^{-\\lambda t}",
        explanation: "Activity $A(t)$ (measured in Becquerels $1\\text{ Bq} = 1\\text{ decay/s}$) decays exponentially in lockstep with the number of nuclei."
      }
    ],

    limitingCases: [
      {
        name: "Short Time Limit ($t \\ll \\tau$)",
        condition: "t \\ll \\tau",
        formula: "N(t) \\approx N_0 (1 - \\lambda t) = N_0\\left(1 - \\frac{t}{\\tau}\\right)",
        explanation: "Taylor expansion shows approximately linear decay for times much shorter than the mean lifetime."
      },
      {
        name: "Multi-Half-Life Binary Progression",
        condition: "t = n \\cdot t_{1/2}",
        formula: "N(n\\, t_{1/2}) = N_0 \\left(\\frac{1}{2}\\right)^n, \\quad \\frac{N_{\\text{daughter}}}{N_{\\text{parent}}} = 2^n - 1",
        explanation: "After 1 half-life: $1/2$ left; after 2: $1/4$; after 3: $1/8$; after 4: $1/16$; after 10: $1/1024 < 0.1\\%$."
      },
      {
        name: "Branching Parallel Decays",
        condition: "\\lambda_{\\text{total}} = \\lambda_1 + \\lambda_2",
        formula: "\\frac{1}{\\tau_{\\text{total}}} = \\frac{1}{\\tau_1} + \\frac{1}{\\tau_2}, \\quad \\text{Branching Ratio}_1 = \\frac{\\lambda_1}{\\lambda_1 + \\lambda_2}",
        explanation: "When multiple decay channels exist (e.g. $\\alpha$ vs $\\beta$), decay rates add linearly, reducing the net lifetime."
      },
      {
        name: "Secular Radioactive Equilibrium",
        condition: "A \\xrightarrow{\\lambda_A} B \\xrightarrow{\\lambda_B} C \\quad (\\tau_A \\gg \\tau_B)",
        formula: "A_B(t) = A_A(t) \\implies \\lambda_B N_B = \\lambda_A N_A",
        explanation: "When parent is much longer-lived than daughter, the daughter's activity equals the parent's activity."
      }
    ],

    greTraps: [
      {
        trap: "Confusing Half-Life $t_{1/2}$ with Mean Lifetime $\\tau$",
        description: "$t_{1/2} = \\tau \\ln 2 \\approx 0.693 \\tau < \\tau$. Mean lifetime is ALWAYS longer than half-life.",
        proTip: "If a problem specifies lifetime $\\tau = 10\\text{ s}$, do NOT assume half-life is $10\\text{ s}$ (half-life is $6.93\\text{ s}$)."
      },
      {
        trap: "Daughter to Parent Ratio Question",
        description: "After 3 half-lives, remaining parent is $1/8 N_0$, so daughter count is $7/8 N_0$. The ratio $N_{\\text{daughter}} / N_{\\text{parent}} = 7$ (NOT 8 or 1/8).",
        proTip: "Read carefully: Does the question ask for $N_{\\text{parent}} / N_0$, $N_{\\text{daughter}} / N_0$, or $N_{\\text{daughter}} / N_{\\text{parent}}$?"
      },
      {
        trap: "Activity Proportionality",
        description: "Activity $A = \\lambda N = N / \\tau$. A sample with half the lifetime has twice the activity for the same number of atoms.",
        proTip: "High activity = fast decay = short half-life."
      }
    ],

    parameters: [
      { id: 'tHalf', name: 'Half-Life $t_{1/2}$', min: 2.0, max: 15.0, step: 0.5, default: 5.0, unit: 's' },
      { id: 'decayType', name: 'Decay Particle', type: 'select', options: ['alpha', 'beta', 'gamma'], default: 'alpha' },
      { id: 'playing', name: 'Simulation Active', type: 'boolean', default: true }
    ],

    init(container, state, redraw) {
      createControlStyles();
      container.innerHTML = '';

      const panel = document.createElement('div');
      panel.className = 'pgre-control-panel';

      // Half-life slider
      const thRow = document.createElement('div');
      thRow.className = 'pgre-control-row';
      thRow.innerHTML = `
        <span class="pgre-control-label">Half-Life $t_{1/2}$:</span>
        <input type="range" class="pgre-slider" min="2.0" max="15.0" step="0.5" value="${state.tHalf || 5.0}">
        <span class="pgre-control-value">${(state.tHalf || 5.0).toFixed(1)} s</span>
      `;
      const thSlider = thRow.querySelector('input');
      const thVal = thRow.querySelector('.pgre-control-value');
      thSlider.addEventListener('input', (e) => {
        state.tHalf = parseFloat(e.target.value);
        thVal.textContent = state.tHalf.toFixed(1) + ' s';
        redraw();
      });
      panel.appendChild(thRow);

      // Decay Mode selector
      const dRow = document.createElement('div');
      dRow.className = 'pgre-control-row';
      dRow.innerHTML = `<span class="pgre-control-label">Radiation Mode:</span>`;
      const btnGroup = document.createElement('div');
      btnGroup.className = 'pgre-btn-group';

      const modes = [
        { id: 'alpha', label: 'Alpha ($\\alpha$ cluster)' },
        { id: 'beta', label: 'Beta ($\\beta^-$ electron)' },
        { id: 'gamma', label: 'Gamma ($\\gamma$ photon)' }
      ];

      modes.forEach(m => {
        const btn = document.createElement('button');
        btn.className = `pgre-btn ${(state.decayType || 'alpha') === m.id ? 'active' : ''}`;
        btn.textContent = m.label;
        btn.addEventListener('click', () => {
          state.decayType = m.id;
          btnGroup.querySelectorAll('.pgre-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          redraw();
        });
        btnGroup.appendChild(btn);
      });
      dRow.appendChild(btnGroup);
      panel.appendChild(dRow);

      // Simulation Play / Reset Controls
      const ctlRow = document.createElement('div');
      ctlRow.className = 'pgre-control-row';
      ctlRow.innerHTML = `
        <span class="pgre-control-label">Simulation Control:</span>
        <div class="pgre-btn-group">
          <button class="pgre-btn accent" id="pgre-decay-reset">Reset Atoms</button>
          <button class="pgre-btn" id="pgre-decay-toggle">${state.playing !== false ? 'Pause' : 'Play'}</button>
        </div>
      `;
      const resetBtn = ctlRow.querySelector('#pgre-decay-reset');
      const toggleBtn = ctlRow.querySelector('#pgre-decay-toggle');

      resetBtn.addEventListener('click', () => {
        state._simTime = 0;
        initAtomLattice(state);
        redraw();
      });

      toggleBtn.addEventListener('click', () => {
        state.playing = state.playing === false ? true : false;
        toggleBtn.textContent = state.playing ? 'Pause' : 'Play';
        redraw();
      });
      panel.appendChild(ctlRow);

      container.appendChild(panel);

      initAtomLattice(state);
    },

    draw(ctx, width, height, state, dt) {
      const tHalf = state.tHalf || 5.0;
      const tau = tHalf / Math.LN2;
      const lambda = 1 / tau;
      const isPlaying = state.playing !== false;
      const decayType = state.decayType || 'alpha';

      if (!state._atoms) initAtomLattice(state);
      if (!state._ejections) state._ejections = [];

      if (isPlaying) {
        state._simTime = (state._simTime || 0) + (dt || 0.016);
        const simDt = dt || 0.016;
        const decayProbPerStep = 1 - Math.exp(-lambda * simDt);

        state._atoms.forEach(atom => {
          if (!atom.decayed && Math.random() < decayProbPerStep) {
            atom.decayed = true;
            atom.decayTime = state._simTime;
            const angle = Math.random() * Math.PI * 2;
            const speed = decayType === 'gamma' ? 160 : 80;
            state._ejections.push({
              x: atom.x,
              y: atom.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              life: 1.0,
              type: decayType
            });
          }
        });
      }
      const curTime = state._simTime || 0;

      fillStage(ctx, width, height);
      ctx.save();

      const margin = 14;
      const graphTop = 10;
      const graphH = Math.max(120, height * 0.48);
      const latticeTop = graphTop + graphH + 8;
      const latticeH = Math.max(80, height - latticeTop - margin);
      const latticeX = margin;
      const latticeW = width - margin * 2;

      let survivingCount = 0;
      state._atoms.forEach(a => { if (!a.decayed) survivingCount++; });
      const totalAtoms = state._atoms.length || 1;
      const curTheoryN = totalAtoms * Math.exp(-curTime / tau);
      const simActivity = lambda * survivingCount;

      const originX = margin + 40;
      const originY = graphTop + graphH - 28;
      const plotW = Math.max(40, width - originX - margin - 8);
      const plotH = Math.max(40, originY - (graphTop + 18));
      const maxTime = Math.max(tHalf * 3.5, curTime * 1.15, 0.5);

      function mapT(tVal) { return originX + (tVal / maxTime) * plotW; }
      function mapN(n) { return originY - (n / totalAtoms) * plotH; }

      ctx.strokeStyle = GRID;
      ctx.lineWidth = 1;
      const fracLabels = [
        { frac: 0.5, text: '1/2' },
        { frac: 1 / Math.E, text: '1/e' },
        { frac: 0.25, text: '1/4' },
        { frac: 0.125, text: '1/8' }
      ];
      ctx.font = MONO;
      ctx.fillStyle = MUTED;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      fracLabels.forEach(item => {
        const ny = mapN(totalAtoms * item.frac);
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(originX, ny);
        ctx.lineTo(originX + plotW, ny);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillText(item.text, originX - 6, ny);
      });

      const halfLabels = [];
      [1, 2, 3, 4].forEach(mult => {
        const tMark = mult * tHalf;
        const tx = mapT(tMark);
        if (tx > originX + 8 && tx < originX + plotW - 8) {
          ctx.setLineDash([]);
          ctx.strokeStyle = GRID;
          ctx.beginPath();
          ctx.moveTo(tx, originY);
          ctx.lineTo(tx, originY - plotH);
          ctx.stroke();
          halfLabels.push({ x: tx, text: (mult === 1 ? 't½' : (mult + ' t½')) });
        }
      });

      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = SANS;
      ctx.fillStyle = MUTED;
      let lastRight = originX;
      halfLabels.forEach(lab => {
        const tw = ctx.measureText ? ctx.measureText(lab.text).width : 24;
        if (lab.x - tw / 2 > lastRight + 4 && lab.x + tw / 2 < originX + plotW) {
          ctx.fillText(lab.text, lab.x, originY + 6);
          lastRight = lab.x + tw / 2;
        }
      });

      const tauX = mapT(tau);
      const tauY = mapN(totalAtoms / Math.E);
      if (tauX <= originX + plotW) {
        ctx.strokeStyle = TEAL;
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(tauX, originY);
        ctx.lineTo(tauX, tauY);
        ctx.lineTo(originX, tauY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.strokeStyle = AXIS;
      ctx.lineWidth = 1.6;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(originX, originY - plotH);
      ctx.lineTo(originX, originY);
      ctx.lineTo(originX + plotW, originY);
      ctx.stroke();

      ctx.fillStyle = MUTED;
      ctx.font = SANS;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText('N', originX - 6, originY - plotH + 2);

      ctx.strokeStyle = CORAL;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      const numPts = 160;
      for (let i = 0; i <= numPts; i++) {
        const timeVal = (i / numPts) * maxTime;
        const gx = mapT(timeVal);
        const gy = mapN(totalAtoms * Math.exp(-timeVal / tau));
        if (i === 0) ctx.moveTo(gx, gy); else ctx.lineTo(gx, gy);
      }
      ctx.stroke();

      const curX = mapT(Math.min(curTime, maxTime));
      const curY = mapN(curTheoryN);
      ctx.strokeStyle = CORAL;
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(curX, originY);
      ctx.lineTo(curX, curY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = CREAM;
      ctx.strokeStyle = CORAL;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(curX, curY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = PANEL;
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 1;
      ctx.fillRect(latticeX, latticeTop, latticeW, latticeH);
      ctx.strokeRect(latticeX, latticeTop, latticeW, latticeH);

      ctx.fillStyle = INK;
      ctx.font = SANS;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const keyY = latticeTop + 12;
      ctx.fillStyle = CORAL;
      ctx.beginPath();
      ctx.arc(latticeX + 14, keyY, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = INK;
      ctx.fillText('parent', latticeX + 22, keyY);
      ctx.fillStyle = AXIS;
      ctx.beginPath();
      ctx.arc(latticeX + 78, keyY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = INK;
      ctx.fillText('daughter', latticeX + 86, keyY);
      const ejectColor = decayType === 'gamma' ? GOLD : (decayType === 'alpha' ? ROSE : TEAL);
      ctx.fillStyle = ejectColor;
      ctx.beginPath();
      ctx.arc(latticeX + 158, keyY, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = INK;
      ctx.fillText(decayType, latticeX + 166, keyY);

      const atomLeft = latticeX + 10;
      const atomTop = latticeTop + 24;
      const atomW = latticeW - 20;
      const atomH = latticeH - 32;

      ctx.save();
      ctx.beginPath();
      ctx.rect(latticeX, latticeTop, latticeW, latticeH);
      ctx.clip();
      ctx.shadowBlur = 0;

      state._atoms.forEach(a => {
        const ax = atomLeft + a.x * atomW;
        const ay = atomTop + a.y * atomH;
        ctx.beginPath();
        if (!a.decayed) {
          ctx.fillStyle = CORAL;
          ctx.arc(ax, ay, 3.6, 0, Math.PI * 2);
        } else {
          ctx.fillStyle = '#c8c2b8';
          ctx.arc(ax, ay, 2.8, 0, Math.PI * 2);
        }
        ctx.fill();
      });

      state._ejections = state._ejections.filter(p => p.life > 0);
      state._ejections.forEach(p => {
        p.life -= (dt || 0.016) * 1.5;
        const px = atomLeft + p.x * atomW + p.vx * (1 - p.life) * 0.5;
        const py = atomTop + p.y * atomH + p.vy * (1 - p.life) * 0.5;
        ctx.fillStyle = p.type === 'gamma' ? GOLD : (p.type === 'alpha' ? ROSE : TEAL);
        ctx.beginPath();
        ctx.arc(px, py, p.type === 'alpha' ? 3.2 : 2, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      ctx.restore();

      vizLegend('Radioactive decay', [
        { label: '$t$', value: '$' + curTime.toFixed(2) + '\\text{ s}$' },
        { label: '$t_{1/2}$', value: '$' + tHalf.toFixed(1) + '\\text{ s}$' },
        { label: '$\\tau = t_{1/2} / \\ln 2$', value: '$' + tau.toFixed(2) + '\\text{ s}$' },
        { label: '$N_{\\text{parent}}$', value: '$' + survivingCount + ' / ' + totalAtoms + '$' },
        { label: '$N_{\\text{theory}}$', value: '$' + curTheoryN.toFixed(1) + '$' },
        { label: 'Activity $\\lambda N$', value: '$' + simActivity.toFixed(1) + '\\text{ Bq}$' },
        { label: 'Radiation Mode', value: decayType }
      ]);
    },

    challenge: {
      question: "A pure sample initially contains $N_0$ radioactive nuclei of isotope X, which decays with a half-life $t_{1/2} = 4\\text{ hours}$ into a stable daughter isotope Y. After $12\\text{ hours}$, what is the ratio of the number of daughter nuclei $N_Y$ to the remaining parent nuclei $N_X$?",
      options: [
        "$3$",
        "$4$",
        "$7$",
        "$8$",
        "$1 / 8$"
      ],
      correct: 2,
      explanation: "Elapsed time $t = 12\\text{ hours}$ corresponds to $n = 12 / 4 = 3$ half-lives. The fraction of parent nuclei remaining is $N_X(t) = N_0 (1/2)^3 = 1/8 N_0$. The number of decayed parent nuclei (which have transformed into daughter nuclei) is $N_Y(t) = N_0 - N_X(t) = N_0 - 1/8 N_0 = 7/8 N_0$. The ratio of daughter to parent nuclei is $N_Y / N_X = (7/8 N_0) / (1/8 N_0) = 7$. (GRE Trap: Do not confuse $N_Y / N_X = 7$ with $N_0 / N_X = 8$)."
    }
  };


})(typeof window !== 'undefined' ? window : globalThis);
