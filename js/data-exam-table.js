/* Official GRE Physics "Table of Information" for the mock-exam room.
   Transcribed from the printed page titled TABLE OF INFORMATION in:
     GRE Physics Test Practice Book (ETS, current practice book), page 8
     GR1777 practice book, page 8 (printed page mark -2-)
     GR0877 practice book, page 10 (printed page mark -2-)
   The three printings list the same symbols, values and units.
   Values are the printed ETS figures, not current CODATA.
   Do not add constants or formulas this page does not print. */
window.PGRE = window.PGRE || {};

PGRE.EXAM_TABLE = {
  source: {
    title: 'TABLE OF INFORMATION',
    documents: [
      { name: 'GRE Physics Test Practice Book (ETS current practice book)', page: 8 },
      { name: 'GRE Physics Test Practice Book GR1777', page: 8 },
      { name: 'GRE Physics Test Practice Book GR0877', page: 10 }
    ]
  },
  constants: [
    { name: 'Rest mass of the electron', latex: '$m_e = 9.11 \\times 10^{-31}\\,\\mathrm{kg}$' },
    { name: 'Magnitude of the electron charge', latex: '$e = 1.60 \\times 10^{-19}\\,\\mathrm{C}$' },
    { name: "Avogadro's number", latex: '$N_A = 6.02 \\times 10^{23}$' },
    { name: 'Universal gas constant', latex: '$R = 8.31\\,\\mathrm{J/(mol \\cdot K)}$' },
    { name: "Boltzmann's constant", latex: '$k = 1.38 \\times 10^{-23}\\,\\mathrm{J/K}$' },
    { name: 'Speed of light', latex: '$c = 3.00 \\times 10^{8}\\,\\mathrm{m/s}$' },
    { name: "Planck's constant", latex: '$h = 6.63 \\times 10^{-34}\\,\\mathrm{J \\cdot s} = 4.14 \\times 10^{-15}\\,\\mathrm{eV \\cdot s}$' },
    { name: '', latex: '$\\hbar = h/2\\pi$' },
    { name: '', latex: '$hc = 1240\\,\\mathrm{eV \\cdot nm}$' },
    { name: 'Vacuum permittivity', latex: '$\\epsilon_0 = 8.85 \\times 10^{-12}\\,\\mathrm{C^{2}/(N \\cdot m^{2})}$' },
    { name: 'Vacuum permeability', latex: '$\\mu_0 = 4\\pi \\times 10^{-7}\\,\\mathrm{T \\cdot m/A}$' },
    { name: 'Universal gravitational constant', latex: '$G = 6.67 \\times 10^{-11}\\,\\mathrm{m^{3}/(kg \\cdot s^{2})}$' },
    { name: 'Acceleration due to gravity', latex: '$g = 9.80\\,\\mathrm{m/s^{2}}$' },
    { name: '1 atmosphere pressure', latex: '$1\\,\\mathrm{atm} = 1.0 \\times 10^{5}\\,\\mathrm{N/m^{2}} = 1.0 \\times 10^{5}\\,\\mathrm{Pa}$' },
    { name: '1 angstrom', latex: '$1\\,$<span class="katex">Å</span>${} = 1 \\times 10^{-10}\\,\\mathrm{m} = 0.1\\,\\mathrm{nm}$' }
  ],
  prefixes: [
    { power: '$10^{-15}$', name: 'femto', symbol: 'f' },
    { power: '$10^{-12}$', name: 'pico', symbol: 'p' },
    { power: '$10^{-9}$', name: 'nano', symbol: 'n' },
    { power: '$10^{-6}$', name: 'micro', symbol: '$\\mu$' },
    { power: '$10^{-3}$', name: 'milli', symbol: 'm' },
    { power: '$10^{-2}$', name: 'centi', symbol: 'c' },
    { power: '$10^{3}$', name: 'kilo', symbol: 'k' },
    { power: '$10^{6}$', name: 'mega', symbol: 'M' },
    { power: '$10^{9}$', name: 'giga', symbol: 'G' },
    { power: '$10^{12}$', name: 'tera', symbol: 'T' },
    { power: '$10^{15}$', name: 'peta', symbol: 'P' }
  ],
  inertia: [
    { name: 'Rod', latex: '$\\dfrac{1}{12} M\\ell^{2}$' },
    { name: 'Disc', latex: '$\\dfrac{1}{2} MR^{2}$' },
    { name: 'Sphere', latex: '$\\dfrac{2}{5} MR^{2}$' }
  ]
};

PGRE.examTableHTML = function () {
  var t = PGRE.EXAM_TABLE;
  var html = '<div class="exam-table-overlay" id="exam-table-overlay">' +
    '<div class="card exam-table-card" id="exam-table-dialog" role="dialog" aria-modal="true" ' +
      'aria-labelledby="exam-table-title" tabindex="-1">' +
      '<div class="exam-table-head">' +
        '<h2 id="exam-table-title">Table of Information</h2>' +
        '<button type="button" class="btn btn-ghost btn-sm" id="exam-table-close">Close</button>' +
      '</div>' +
      '<div class="exam-table-body">';
  html += '<div class="exam-table-const">';
  t.constants.forEach(function (row) {
    html += '<div class="exam-table-row">' +
      '<div class="exam-table-name">' + (row.name || '') + '</div>' +
      '<div class="exam-table-eq">' + row.latex + '</div>' +
    '</div>';
  });
  html += '</div>';
  html += '<div class="exam-table-lower">';
  html += '<div class="exam-table-block">' +
    '<h3 class="exam-table-sub">Prefixes for Powers of 10</h3>' +
    '<table class="exam-table-grid"><tbody>';
  t.prefixes.forEach(function (row) {
    html += '<tr><td>' + row.power + '</td><td>' + row.name + '</td><td>' + row.symbol + '</td></tr>';
  });
  html += '</tbody></table></div>';
  html += '<div class="exam-table-block">' +
    '<h3 class="exam-table-sub">Rotational inertia about center of mass</h3>' +
    '<table class="exam-table-grid exam-table-inertia"><tbody>';
  t.inertia.forEach(function (row) {
    html += '<tr><td>' + row.name + '</td><td>' + row.latex + '</td></tr>';
  });
  html += '</tbody></table></div>';
  html += '</div></div></div></div>';
  return html;
};
