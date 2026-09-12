/* EBM-9000 · Datos: ejemplo, registro de variables (símbolo + pregunta didáctica),
 * colores de los términos y definición del formulario "Mis datos".
 * Sin dependencias del DOM (también se usa en pruebas con Node).
 */
(function (global) {
  'use strict';

  // Paleta del proyecto
  var C = {
    botones: '#1F3B5C', menu: '#3F6FA6', agua: '#A9C9E8', oil: '#7A4E2D', fondo: '#E7D8C9',
    gas: '#E8C86A', gasDark: '#C99A3B', gasLight: '#F3E2A9', roca: '#A08A72', aguaMedia: '#7FA6CC', aguaOscura: '#4F7FB5',
    connata: '#8FB4D9'
  };

  // Yacimiento de ejemplo: capa de gas (m = 0.25), acuífero moderado, inyección de agua y gas desde el 40 % de la vida.
  // Unidades de campo: STB, SCF, RB, psia, 1/psi. Vida productiva: 25 años.
  var EXAMPLE = {
    N: 1.0e8, m: 0.25, Swio: 0.25, Swig: 0.20, cf: 4e-6, cw: 3e-6, co: 1.2e-5,
    Pi: 3300, Pb: 3300, Pf: 1500,
    Boi: 1.35, Bof: 1.21, Rsoi: 650, Rsof: 320, Bgi: 0.00085, Bgf: 0.0020, Bwi: 1.02,
    Wef: 40e6, Wif: 25e6, Gif: 6e9, tInj: 0.40,
    Rf: 3500, fwf: 0.95, tBt: 0.50, years: 25
  };

  // Registro de variables. `q` es la PREGUNTA a la que responde la variable (se muestra al pasar el puntero).
  // `sym` es HTML (sub/sup), `tex` es LaTeX, `kind` define la unidad (ver units.js).
  var VARS = {
    t:    { sym: 't',                 tex: 't',               name: 'Tiempo de producción',         q: '¿Cuánto tiempo lleva produciendo el yacimiento?', kind: 'years' },
    P:    { sym: 'P',                 tex: 'P',               name: 'Presión del yacimiento',       q: '¿A qué presión está el yacimiento en este instante?', kind: 'pressure' },
    dP:   { sym: 'ΔP',                tex: '\\Delta P',       name: 'Caída de presión',             q: '¿Cuánto ha caído la presión desde el inicio (P<sub>i</sub> − P)?', kind: 'pressure' },
    N:    { sym: 'N',                 tex: 'N',               name: 'Petróleo original en sitio',   q: '¿Cuánto petróleo había originalmente en el yacimiento (POES)?', kind: 'oilSTB' },
    m:    { sym: 'm',                 tex: 'm',               name: 'Tamaño relativo de la capa de gas', q: '¿Qué tan grande es la capa de gas frente a la zona de petróleo (en volumen de yacimiento)?', kind: 'none' },
    G:    { sym: 'G',                 tex: 'G',               name: 'Gas original en la capa',      q: '¿Cuánto gas había originalmente en la capa de gas?', kind: 'gasSCF' },
    Np:   { sym: 'N<sub>p</sub>',     tex: 'N_p',             name: 'Petróleo producido acumulado', q: '¿Cuánto petróleo se ha producido hasta ahora (en superficie)?', kind: 'oilSTB' },
    Gp:   { sym: 'G<sub>p</sub>',     tex: 'G_p',             name: 'Gas producido acumulado',      q: '¿Cuánto gas se ha producido en total hasta ahora?', kind: 'gasSCF' },
    Gps:  { sym: 'G<sub>ps</sub>',    tex: 'G_{ps}',          name: 'Gas de solución producido',    q: '¿Cuánto gas que estaba disuelto en el petróleo se ha producido?', kind: 'gasSCF' },
    Gpc:  { sym: 'G<sub>pc</sub>',    tex: 'G_{pc}',          name: 'Gas de la capa producido',     q: '¿Cuánto gas de la capa de gas se ha producido?', kind: 'gasSCF' },
    Wp:   { sym: 'W<sub>p</sub>',     tex: 'W_p',             name: 'Agua producida acumulada',     q: '¿Cuánta agua se ha producido hasta ahora?', kind: 'oilSTB' },
    We:   { sym: 'W<sub>e</sub>',     tex: 'W_e',             name: 'Intrusión de agua acumulada',  q: '¿Cuánta agua ha entrado desde el acuífero?', kind: 'oilSTB' },
    Wi:   { sym: 'W<sub>i</sub>',     tex: 'W_i',             name: 'Agua inyectada acumulada',     q: '¿Cuánta agua se ha inyectado al yacimiento?', kind: 'oilSTB' },
    Gi:   { sym: 'G<sub>i</sub>',     tex: 'G_i',             name: 'Gas inyectado acumulado',      q: '¿Cuánto gas se ha inyectado al yacimiento?', kind: 'gasSCF' },
    Bo:   { sym: 'B<sub>o</sub>',     tex: 'B_o',             name: 'Factor volumétrico del petróleo', q: '¿Cuántos barriles de yacimiento ocupa hoy un barril de petróleo de superficie?', kind: 'fvfOil' },
    Bt:   { sym: 'B<sub>t</sub>',     tex: 'B_t',             name: 'Factor volumétrico total (bifásico)', q: '¿Cuánto volumen ocupan en el yacimiento un barril de petróleo más todo el gas que tenía disuelto al inicio?', kind: 'fvfOil' },
    Bg:   { sym: 'B<sub>g</sub>',     tex: 'B_g',             name: 'Factor volumétrico del gas',   q: '¿Cuánto volumen ocupa en el yacimiento un pie cúbico estándar de gas?', kind: 'fvfGas' },
    Bw:   { sym: 'B<sub>w</sub>',     tex: 'B_w',             name: 'Factor volumétrico del agua',  q: '¿Cuánto volumen ocupa en el yacimiento un barril de agua de superficie?', kind: 'fvfOil' },
    Rso:  { sym: 'R<sub>so</sub>',    tex: 'R_{so}',          name: 'Gas en solución',              q: '¿Cuánto gas sigue disuelto en cada barril de petróleo a esta presión?', kind: 'gor' },
    R:    { sym: 'RGP',               tex: 'R',               name: 'Relación gas-petróleo instantánea', q: '¿Cuánto gas sale hoy por cada barril de petróleo producido?', kind: 'gor' },
    Rp:   { sym: 'R<sub>p</sub>',     tex: 'R_p',             name: 'RGP acumulada',                q: '¿Cuánto gas se ha producido por cada barril de petróleo acumulado?', kind: 'gor' },
    fw:   { sym: 'f<sub>w</sub>',     tex: 'f_w',             name: 'Corte de agua',                q: '¿Qué fracción del líquido que se produce hoy es agua?', kind: 'pct' },
    qo:   { sym: 'q<sub>o</sub>',     tex: 'q_o',             name: 'Caudal de petróleo',           q: '¿Cuánto petróleo se produce por día en este instante?', kind: 'rateLiq' },
    qg:   { sym: 'q<sub>g</sub>',     tex: 'q_g',             name: 'Caudal de gas',                q: '¿Cuánto gas se produce por día en este instante?', kind: 'rateGas' },
    qw:   { sym: 'q<sub>w</sub>',     tex: 'q_w',             name: 'Caudal de agua',               q: '¿Cuánta agua se produce por día en este instante?', kind: 'rateLiq' },
    RF:   { sym: 'FR',                tex: 'FR',              name: 'Factor de recobro',            q: '¿Qué fracción del petróleo original se ha recuperado?', kind: 'pct' },
    So:   { sym: 'S<sub>o</sub>',     tex: 'S_o',             name: 'Saturación media de petróleo', q: '¿Qué fracción del volumen poroso ocupa el petróleo ahora?', kind: 'pct' },
    Sg:   { sym: 'S<sub>g</sub>',     tex: 'S_g',             name: 'Saturación media de gas libre', q: '¿Qué fracción del volumen poroso ocupa el gas libre ahora?', kind: 'pct' },
    Sw:   { sym: 'S<sub>w</sub>',     tex: 'S_w',             name: 'Saturación media de agua',     q: '¿Qué fracción del volumen poroso ocupa el agua ahora?', kind: 'pct' },
    Swio: { sym: 'S<sub>wio</sub>',   tex: 'S_{wio}',         name: 'Agua connata inicial (zona de petróleo)', q: '¿Qué fracción del poro de la zona de petróleo ocupaba el agua connata al inicio?', kind: 'frac' },
    Swig: { sym: 'S<sub>wig</sub>',   tex: 'S_{wig}',         name: 'Agua connata inicial (capa de gas)', q: '¿Qué fracción del poro de la capa de gas ocupaba el agua connata al inicio?', kind: 'frac' },
    cf:   { sym: 'c<sub>f</sub>',     tex: 'c_f',             name: 'Compresibilidad de la formación', q: '¿Cuánto se reduce el volumen poroso por cada unidad de caída de presión?', kind: 'compress' },
    cw:   { sym: 'c<sub>w</sub>',     tex: 'c_w',             name: 'Compresibilidad del agua',     q: '¿Cuánto se expande el agua por cada unidad de caída de presión?', kind: 'compress' },
    PV:   { sym: 'V<sub>p</sub>',     tex: 'V_p',             name: 'Volumen poroso',               q: '¿Cuánto volumen poroso tiene el yacimiento ahora?', kind: 'resRB' },

    // Elementos del dibujo del tanque
    layerGas:     { sym: 'Capa de gas',        tex: 'V_{gas}',  name: 'Volumen actual de la capa de gas', q: '¿Cuánto volumen ocupa hoy el gas libre de la capa de gas?', kind: 'resRB' },
    layerOil:     { sym: 'Zona de petróleo',   tex: 'V_{oil}',  name: 'Volumen actual del petróleo remanente', q: '¿Cuánto volumen ocupa hoy el petróleo que queda en el yacimiento (con el gas liberado que lo acompaña)?', kind: 'resRB' },
    layerEvolved: { sym: 'Gas liberado',       tex: 'V_{gl}',   name: 'Gas liberado en la zona de petróleo', q: '¿Cuánto gas que salió de solución sigue libre dentro de la zona de petróleo?', kind: 'resRB' },
    layerWater:   { sym: 'Agua',               tex: 'V_{w}',    name: 'Volumen actual de agua', q: '¿Cuánto volumen ocupa hoy el agua (connata + la que entró o se inyectó − la producida)?', kind: 'resRB' },
    layerRock:    { sym: 'Compactación',       tex: 'N D_r',    name: 'Volumen poroso perdido', q: '¿Cuánto volumen poroso ha perdido la roca al compactarse?', kind: 'resRB' },
    aquifer:      { sym: 'Acuífero',           tex: 'q_{we}',   name: 'Tasa de intrusión de agua', q: '¿Cuánta agua está entrando hoy desde el acuífero?', kind: 'rateLiq' },
    wellProd:     { sym: 'Pozo productor',     tex: 'q_o, q_g, q_w', name: 'Producción instantánea', q: '¿Qué fluidos y en qué cantidad está produciendo el pozo en este instante?', kind: 'none' },
    wellWinj:     { sym: 'Inyector de agua',   tex: 'q_{wi}',   name: 'Tasa de inyección de agua', q: '¿Cuánta agua se está inyectando hoy?', kind: 'rateLiq' },
    wellGinj:     { sym: 'Inyector de gas',    tex: 'q_{gi}',   name: 'Tasa de inyección de gas', q: '¿Cuánto gas se está inyectando hoy?', kind: 'rateGas' },
    goc0:         { sym: 'CGP inicial',        tex: 'CGP_i',    name: 'Contacto gas-petróleo inicial', q: '¿Dónde estaba el contacto gas-petróleo al inicio y cuánto ha bajado al expandirse la capa?', kind: 'none' },
    woc0:         { sym: 'CAP inicial',        tex: 'CAP_i',    name: 'Contacto agua-petróleo inicial', q: '¿Dónde estaba el contacto agua-petróleo al inicio y cuánto ha subido con la intrusión e inyección?', kind: 'none' },
    gauge:        { sym: 'Manómetro',          tex: 'P',        name: 'Presión del yacimiento', q: '¿Cuánto ha caído la presión del yacimiento respecto a la inicial?', kind: 'pressure' },

    // Términos de la ecuación (Tabla 2-1 de Fanchi, convertida en preguntas)
    NDo:     { sym: 'N·D<sub>o</sub>',          tex: 'N D_o',            name: 'Expansión del petróleo y su gas disuelto', q: '¿Cuánto cambió el volumen del petróleo inicial y su gas asociado?', kind: 'resRB', side: 'L', color: C.oil },
    NDgo:    { sym: 'N·D<sub>go</sub>',         tex: 'N D_{go}',         name: 'Expansión del gas libre (capa de gas)', q: '¿Cuánto cambió el volumen del gas libre?', kind: 'resRB', side: 'L', color: C.gas },
    NDwt:    { sym: 'N·(D<sub>w</sub>+D<sub>gw</sub>)', tex: 'N (D_w + D_{gw})', name: 'Expansión del agua connata', q: '¿Cuánto cambió el volumen del agua connata inicial?', kind: 'resRB', side: 'L', color: C.connata },
    NDw:     { sym: 'N·D<sub>w</sub>',          tex: 'N D_w',            name: 'Expansión del agua connata (zona de petróleo)', q: '¿Cuánto cambió el volumen del agua connata de la zona de petróleo?', kind: 'resRB', side: 'L', color: C.connata },
    NDgw:    { sym: 'N·D<sub>gw</sub>',         tex: 'N D_{gw}',         name: 'Expansión del agua connata (capa de gas)', q: '¿Cuánto cambió el volumen del agua connata de la capa de gas?', kind: 'resRB', side: 'L', color: C.connata },
    NDr:     { sym: 'N·D<sub>r</sub>',          tex: 'N D_r',            name: 'Reducción del volumen poroso', q: '¿Cuánto cambió el volumen poroso de la formación?', kind: 'resRB', side: 'L', color: C.roca },
    WeBw:    { sym: 'W<sub>e</sub>·B<sub>w</sub>', tex: 'W_e B_w',       name: 'Intrusión de agua', q: '¿Cuánta agua ha entrado del acuífero (en volumen de yacimiento)?', kind: 'resRB', side: 'L', color: C.agua },
    WiBw:    { sym: 'W<sub>i</sub>·B<sub>w</sub>', tex: 'W_i B_w',       name: 'Inyección de agua', q: '¿Cuánta agua se ha inyectado (en volumen de yacimiento)?', kind: 'resRB', side: 'L', color: C.aguaOscura },
    GiBg:    { sym: 'G<sub>i</sub>·B<sub>g</sub>′', tex: "G_i B_g'",     name: 'Inyección de gas', q: '¿Cuánto gas se ha inyectado (en volumen de yacimiento)?', kind: 'resRB', side: 'L', color: C.gasLight },
    NpBo:    { sym: 'N<sub>p</sub>·B<sub>o</sub>', tex: 'N_p B_o',       name: 'Producción acumulada de petróleo', q: '¿Cuánto volumen de yacimiento ocupa el petróleo producido acumulado?', kind: 'resRB', side: 'R', color: C.oil },
    NpRsoBg: { sym: 'N<sub>p</sub>·R<sub>so</sub>·B<sub>g</sub>', tex: 'N_p R_{so} B_g', name: 'Gas producido disuelto en el petróleo', q: '¿Cuánto gas se produjo disuelto en el petróleo (ya está contado dentro de N<sub>p</sub>·B<sub>o</sub>, por eso se resta)?', kind: 'resRB', side: 'R', neg: true, color: '#4A2E1A' },
    GpsBg:   { sym: 'G<sub>ps</sub>·B<sub>g</sub>', tex: 'G_{ps} B_g',   name: 'Gas de solución producido', q: '¿Cuánto gas de solución se produjo como gas liberado?', kind: 'resRB', side: 'R', color: C.gasDark },
    GpcBgc:  { sym: 'G<sub>pc</sub>·B<sub>gc</sub>', tex: 'G_{pc} B_{gc}', name: 'Gas de la capa producido', q: '¿Cuánto gas de la capa de gas se ha producido?', kind: 'resRB', side: 'R', color: C.gas },
    WpBw:    { sym: 'W<sub>p</sub>·B<sub>w</sub>', tex: 'W_p B_w',       name: 'Producción acumulada de agua', q: '¿Cuánta agua se ha producido (en volumen de yacimiento)?', kind: 'resRB', side: 'R', color: C.aguaMedia },
    lhs:     { sym: 'Σ izquierda',  tex: '\\Sigma_{izq}', name: 'Expansión + entradas', q: '¿Cuánto vaciamiento han creado la expansión de fluidos y roca, la intrusión y la inyección?', kind: 'resRB' },
    rhs:     { sym: 'Σ derecha',    tex: '\\Sigma_{der}', name: 'Producción neta', q: '¿Cuánto volumen de yacimiento ha sido retirado por la producción?', kind: 'resRB' }
  };

  var TERMS_L = ['NDo', 'NDgo', 'NDwt', 'NDr', 'WeBw', 'WiBw', 'GiBg'];
  var TERMS_R = ['NpBo', 'GpsBg', 'GpcBgc', 'WpBw'];   // + NpRsoBg (negativo)

  // Formulario "Mis datos". `kind` fija la unidad mostrada; los valores internos siempre son de campo.
  var INPUT_GROUPS = [
    { title: 'Yacimiento y roca', fields: [
      { key: 'N',    label: 'Petróleo original en sitio (POES)', sym: 'N', kind: 'oilSTB', min: 0.001 },
      { key: 'm',    label: 'Relación capa de gas / zona de petróleo (0 = sin capa)', sym: 'm', kind: 'none', min: 0, max: 10, step: 0.01 },
      { key: 'Swio', label: 'Saturación de agua connata, zona de petróleo', sym: 'S<sub>wio</sub>', kind: 'frac', min: 0, max: 0.9, step: 0.01 },
      { key: 'Swig', label: 'Saturación de agua connata, capa de gas', sym: 'S<sub>wig</sub>', kind: 'frac', min: 0, max: 0.9, step: 0.01 },
      { key: 'cf',   label: 'Compresibilidad de la formación', sym: 'c<sub>f</sub>', kind: 'compress', min: 0 },
      { key: 'cw',   label: 'Compresibilidad del agua', sym: 'c<sub>w</sub>', kind: 'compress', min: 0 }
    ]},
    { title: 'Presiones', fields: [
      { key: 'Pi', label: 'Presión inicial', sym: 'P<sub>i</sub>', kind: 'pressure', min: 1 },
      { key: 'Pb', label: 'Presión de burbuja (= P<sub>i</sub> si hay capa de gas)', sym: 'P<sub>b</sub>', kind: 'pressure', min: 1 },
      { key: 'Pf', label: 'Presión final o de abandono', sym: 'P<sub>f</sub>', kind: 'pressure', min: 1 },
      { key: 'co', label: 'Compresibilidad del petróleo subsaturado (P > P<sub>b</sub>)', sym: 'c<sub>o</sub>', kind: 'compress', min: 0 }
    ]},
    { title: 'PVT inicial (a P<sub>i</sub>)', fields: [
      { key: 'Boi',  label: 'Factor volumétrico del petróleo', sym: 'B<sub>oi</sub>', kind: 'fvfOil', min: 0.5 },
      { key: 'Rsoi', label: 'Gas en solución', sym: 'R<sub>soi</sub>', kind: 'gor', min: 0 },
      { key: 'Bgi',  label: 'Factor volumétrico del gas', sym: 'B<sub>gi</sub>', kind: 'fvfGas', min: 0.00001 },
      { key: 'Bwi',  label: 'Factor volumétrico del agua', sym: 'B<sub>wi</sub>', kind: 'fvfOil', min: 0.5 }
    ]},
    { title: 'PVT final (a P<sub>f</sub>)', fields: [
      { key: 'Bof',  label: 'Factor volumétrico del petróleo', sym: 'B<sub>o</sub>(P<sub>f</sub>)', kind: 'fvfOil', min: 0.5 },
      { key: 'Rsof', label: 'Gas en solución', sym: 'R<sub>so</sub>(P<sub>f</sub>)', kind: 'gor', min: 0 },
      { key: 'Bgf',  label: 'Factor volumétrico del gas', sym: 'B<sub>g</sub>(P<sub>f</sub>)', kind: 'fvfGas', min: 0.00001 }
    ]},
    { title: 'Acuífero e inyección', fields: [
      { key: 'Wef',  label: 'Intrusión de agua acumulada al final de la vida', sym: 'W<sub>e</sub>', kind: 'oilSTB', min: 0 },
      { key: 'Wif',  label: 'Agua inyectada acumulada al final', sym: 'W<sub>i</sub>', kind: 'oilSTB', min: 0 },
      { key: 'Gif',  label: 'Gas inyectado acumulado al final', sym: 'G<sub>i</sub>', kind: 'gasSCF', min: 0 },
      { key: 'tInj', label: 'Inicio de la inyección (% de la vida productiva)', sym: 't<sub>iny</sub>', kind: 'pct', min: 0, max: 100, step: 1 }
    ]},
    { title: 'Producción', fields: [
      { key: 'Rf',    label: 'Relación gas-petróleo de producción al final', sym: 'R<sub>f</sub>', kind: 'gor', min: 0 },
      { key: 'fwf',   label: 'Corte de agua al final', sym: 'f<sub>w,f</sub>', kind: 'pct', min: 0, max: 99, step: 1 },
      { key: 'tBt',   label: 'Irrupción de agua (% de la vida productiva)', sym: 't<sub>irr</sub>', kind: 'pct', min: 0, max: 100, step: 1 },
      { key: 'years', label: 'Vida productiva simulada', sym: 't<sub>vida</sub>', kind: 'years', min: 1, max: 200, step: 1 }
    ]}
  ];

  // Nomenclatura para la pestaña de teoría (símbolo LaTeX, descripción, unidad por sistema)
  var NOMEN = [
    ['B_g',     'Factor volumétrico del gas en solución producido', 'fvfGas'],
    ["B_g'",    'Factor volumétrico del gas inyectado', 'fvfGas'],
    ['B_{gc}',  'Factor volumétrico del gas de la capa de gas', 'fvfGas'],
    ['B_{gi}',  'Factor volumétrico del gas a la presión inicial', 'fvfGas'],
    ['B_o',     'Factor volumétrico del petróleo', 'fvfOil'],
    ['B_t',     'Factor volumétrico total (bifásico) del petróleo: B_o + (R_{soi} − R_{so}) B_g', 'fvfOil'],
    ['B_{ti}',  'Factor volumétrico total a la presión inicial (= B_{oi})', 'fvfOil'],
    ['B_{tw}',  'Factor volumétrico total del agua (agua + gas disuelto en ella)', 'fvfOil'],
    ['B_{twi}', 'Factor volumétrico total del agua a la presión inicial', 'fvfOil'],
    ['B_w',     'Factor volumétrico del agua', 'fvfOil'],
    ['c_f',     'Compresibilidad de la formación (poro)', 'compress'],
    ['G',       'Gas original en sitio (capa de gas)', 'gasSCF'],
    ['G_i',     'Gas inyectado acumulado', 'gasSCF'],
    ['G_{pc}',  'Gas producido acumulado de la capa de gas', 'gasSCF'],
    ['G_{ps}',  'Gas de solución producido acumulado', 'gasSCF'],
    ['m',       'Relación entre el volumen inicial de la capa de gas y el de la zona de petróleo (condiciones de yacimiento)', 'none'],
    ['N',       'Petróleo original en sitio (POES)', 'oilSTB'],
    ['N_p',     'Petróleo producido acumulado', 'oilSTB'],
    ['\\Delta P', 'Caída de presión: P_i − P', 'pressure'],
    ['R_{so}',  'Relación gas-petróleo en solución', 'gor'],
    ['S_{wio}', 'Saturación inicial de agua en la zona de petróleo', 'frac'],
    ['S_{wig}', 'Saturación inicial de agua en la capa de gas', 'frac'],
    ['W_e',     'Intrusión de agua acumulada (del acuífero)', 'oilSTB'],
    ['W_i',     'Agua inyectada acumulada', 'oilSTB'],
    ['W_p',     'Agua producida acumulada', 'oilSTB']
  ];

  global.EBM = global.EBM || {};
  global.EBM.Data = { COLORS: C, EXAMPLE: EXAMPLE, VARS: VARS, TERMS_L: TERMS_L, TERMS_R: TERMS_R, INPUT_GROUPS: INPUT_GROUPS, NOMEN: NOMEN };
})(typeof window !== 'undefined' ? window : globalThis);
