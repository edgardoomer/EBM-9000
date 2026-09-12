/* EBM-9000 · Unidades y formato de números
 * Todo el modelo trabaja internamente en unidades de campo (STB, SCF, RB, psia, 1/psi).
 * Este módulo convierte a Sistema Internacional para la presentación y para el formulario.
 */
(function (global) {
  'use strict';

  var STB_TO_M3 = 0.158987294928;      // 1 barril = 0.158987 m³
  var SCF_TO_M3 = 0.028316846592;      // 1 pie cúbico = 0.0283168 m³
  var PSI_TO_KPA = 6.894757293168;     // 1 psi = 6.894757 kPa

  // Cada "kind" describe cómo se muestra una magnitud en cada sistema:
  //  factor: multiplica el valor interno (campo) para obtener el valor mostrado.
  //  unit  : etiqueta de la unidad mostrada.  dec: decimales por defecto.
  var KINDS = {
    oilSTB:   { label: 'Volumen de líquido en superficie',
                field: { factor: 1e-6,               unit: 'MMSTB',      dec: 2 },
                si:    { factor: STB_TO_M3 * 1e-6,   unit: '×10⁶ m³',     dec: 3 } },
    gasSCF:   { label: 'Volumen de gas en superficie',
                field: { factor: 1e-9,               unit: 'BSCF',       dec: 2 },
                si:    { factor: SCF_TO_M3 * 1e-9,   unit: '×10⁹ m³',     dec: 3 } },
    resRB:    { label: 'Volumen a condiciones de yacimiento',
                field: { factor: 1e-6,               unit: 'MMRB',       dec: 2 },
                si:    { factor: STB_TO_M3 * 1e-6,   unit: '×10⁶ m³',     dec: 3 } },
    pressure: { label: 'Presión',
                field: { factor: 1,                  unit: 'psia',       dec: 0 },
                si:    { factor: PSI_TO_KPA,         unit: 'kPa',        dec: 0 } },
    fvfOil:   { label: 'Factor volumétrico de petróleo / agua',
                field: { factor: 1,                  unit: 'RB/STB',     dec: 3 },
                si:    { factor: 1,                  unit: 'm³/m³',      dec: 3 } },
    fvfGas:   { label: 'Factor volumétrico de gas',
                field: { factor: 1,                  unit: 'RB/SCF',     dec: 5 },
                si:    { factor: STB_TO_M3 / SCF_TO_M3, unit: 'm³/m³',   dec: 4 } },
    gor:      { label: 'Relación gas-petróleo',
                field: { factor: 1,                  unit: 'SCF/STB',    dec: 0 },
                si:    { factor: SCF_TO_M3 / STB_TO_M3, unit: 'm³/m³',   dec: 1 } },
    compress: { label: 'Compresibilidad',
                field: { factor: 1e6,                unit: '10⁻⁶ psi⁻¹', dec: 2 },
                si:    { factor: 1e6 / PSI_TO_KPA,   unit: '10⁻⁶ kPa⁻¹', dec: 3 } },
    rateLiq:  { label: 'Caudal de líquido',
                field: { factor: 1,                  unit: 'STB/d',      dec: 0 },
                si:    { factor: STB_TO_M3,          unit: 'm³/d',       dec: 0 } },
    rateGas:  { label: 'Caudal de gas',
                field: { factor: 1e-3,               unit: 'MSCF/d',     dec: 0 },
                si:    { factor: SCF_TO_M3 * 1e-3,   unit: '×10³ m³/d',   dec: 1 } },
    frac:     { label: 'Fracción',
                field: { factor: 1,                  unit: '',           dec: 3 },
                si:    { factor: 1,                  unit: '',           dec: 3 } },
    pct:      { label: 'Porcentaje',
                field: { factor: 100,                unit: '%',          dec: 1 },
                si:    { factor: 100,                unit: '%',          dec: 1 } },
    years:    { label: 'Tiempo',
                field: { factor: 1,                  unit: 'años',       dec: 1 },
                si:    { factor: 1,                  unit: 'años',       dec: 1 } },
    none:     { label: 'Adimensional',
                field: { factor: 1,                  unit: '',           dec: 3 },
                si:    { factor: 1,                  unit: '',           dec: 3 } }
  };

  var state = { system: 'field' };
  var listeners = [];

  function getSystem() { return state.system; }
  function setSystem(sys) {
    if (sys !== 'field' && sys !== 'si') return;
    if (state.system === sys) return;
    state.system = sys;
    try { localStorage.setItem('ebm9000.units', sys); } catch (e) { /* sin almacenamiento */ }
    listeners.forEach(function (fn) { fn(sys); });
  }
  function onChange(fn) { listeners.push(fn); }

  function spec(kind, sys) {
    var k = KINDS[kind] || KINDS.none;
    return k[sys || state.system];
  }
  function unit(kind, sys) { return spec(kind, sys).unit; }

  // Valor interno (campo) -> valor en el sistema activo
  function toDisplay(value, kind, sys) { return value * spec(kind, sys).factor; }
  // Valor en el sistema activo -> valor interno (campo)
  function fromDisplay(value, kind, sys) { return value / spec(kind, sys).factor; }

  // Formato numérico: punto decimal y separador de miles con espacio fino (neutral entre idiomas).
  function fmtNum(x, dec) {
    if (x === null || x === undefined || isNaN(x)) return '—';
    if (!isFinite(x)) return x > 0 ? '∞' : '−∞';
    var neg = x < 0;
    var ax = Math.abs(x);
    var s;
    if (dec === undefined) {
      if (ax === 0) dec = 0;
      else if (ax >= 100) dec = 0;
      else if (ax >= 10) dec = 1;
      else if (ax >= 1) dec = 2;
      else if (ax >= 0.01) dec = 3;
      else dec = 5;
    }
    s = ax.toFixed(dec);
    if (parseFloat(s) === 0) neg = false;   // evita '−0.000'
    var parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');
    s = parts.join('.');
    return (neg ? '−' : '') + s;
  }

  // Formatea un valor interno en el sistema activo: "12.35 MMSTB"
  function fmt(value, kind, opts) {
    opts = opts || {};
    var sp = spec(kind, opts.system);
    var v = value * sp.factor;
    var dec = opts.dec !== undefined ? opts.dec : sp.dec;
    if (opts.auto && Math.abs(v) < 1 && v !== 0) dec = Math.max(dec, 3);
    var num = fmtNum(v, dec);
    return opts.noUnit || !sp.unit ? num : num + '\u00A0' + sp.unit;
  }

  // Número para LaTeX (KaTeX): 1{,}234.56 no se usa; usamos \, como separador de miles
  function fmtLatex(value, kind, opts) {
    opts = opts || {};
    var sp = spec(kind, opts.system);
    var v = value * sp.factor;
    var dec = opts.dec !== undefined ? opts.dec : sp.dec;
    var neg = v < 0; var av = Math.abs(v);
    var s = av.toFixed(dec).split('.');
    if (parseFloat(s.join('.')) === 0) neg = false;
    s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '\,');
    var num = (neg ? '-' : '') + s.join('.');
    var u = sp.unit ? '\ \mathrm{' + latexUnit(sp.unit) + '}' : '';
    return opts.noUnit ? num : num + u;
  }
  function latexUnit(u) {
    return u.replace(/×/g, '\\times ').replace(/³/g, '^3').replace(/⁶/g, '^6').replace(/⁹/g, '^9')
            .replace(/⁻¹/g, '^{-1}').replace(/⁻⁶/g, '^{-6}').replace(/⁻/g, '^-')
            .replace(/ /g, '\,').replace(/%/g, '\%');
  }

  global.EBM = global.EBM || {};
  global.EBM.Units = {
    KINDS: KINDS,
    STB_TO_M3: STB_TO_M3, SCF_TO_M3: SCF_TO_M3, PSI_TO_KPA: PSI_TO_KPA,
    getSystem: getSystem, setSystem: setSystem, onChange: onChange,
    spec: spec, unit: unit, toDisplay: toDisplay, fromDisplay: fromDisplay,
    fmtNum: fmtNum, fmt: fmt, fmtLatex: fmtLatex, latexUnit: latexUnit
  };
})(typeof window !== 'undefined' ? window : globalThis);
