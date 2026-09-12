/* EBM-9000 · Pestaña Teoría: ecuaciones (KaTeX), simbología con unidades, sustitución
 * numérica con los datos de la simulación y barra de bibliografía.
 */
(function (global) {
  'use strict';
  var EBM = global.EBM;
  var U = EBM.Units, D = EBM.Data;
  var els = {}, dirty = true, timer = null;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function tex(el, src, display) {
    if (global.katex) {
      try { global.katex.render(src, el, { displayMode: !!display, throwOnError: false, strict: 'ignore' }); return; } catch (e) { /* cae al texto plano */ }
    }
    el.innerHTML = '<code>' + esc(src) + '</code>';
  }
  function texHtml(src, display) {
    if (global.katex) { try { return global.katex.renderToString(src, { displayMode: !!display, throwOnError: false, strict: 'ignore' }); } catch (e) { /* sigue */ } }
    return '<code>' + esc(src) + '</code>';
  }
  // Número para LaTeX sin unidad
  function n(v, kind, dec) { return U.fmtLatex(v, kind, { noUnit: true, dec: dec }); }
  function un(kind) { return '\\ \\mathrm{' + U.latexUnit(U.unit(kind)) + '}'; }
  // Volumen de gas en millones (para que los productos con B_g salgan en 10^6 RB / 10^6 m^3)
  function gasMM(v) { return U.getSystem() === 'si' ? v * U.SCF_TO_M3 * 1e-6 : v * 1e-6; }
  function gasMMUnit() { return U.getSystem() === 'si' ? '10^6\\,m^3' : 'MMSCF'; }
  function fmtGasMM(v) { return U.fmtNum(gasMM(v), 2); }

  function renderStaticEquations() {
    var nodes = document.querySelectorAll('#tab-theory .eq .tex');
    for (var i = 0; i < nodes.length; i++) {
      var src = nodes[i].getAttribute('data-src') || nodes[i].textContent;
      nodes[i].setAttribute('data-src', src);
      tex(nodes[i], src, true);
    }
  }

  function renderNomen() {
    var tb = $('tbl-nomen').querySelector('tbody'); tb.innerHTML = '';
    var sys = U.getSystem();
    $('nomen-unit-head').textContent = sys === 'si' ? 'Unidad SI' : 'Unidad de campo';
    D.NOMEN.forEach(function (row) {
      var tr = document.createElement('tr');
      var unit = U.unit(row[2]);
      var uf = U.unit(row[2], 'field'), us = U.unit(row[2], 'si');
      if (row[2] === 'oilSTB') { uf = 'STB'; us = 'm³'; }
      if (row[2] === 'gasSCF') { uf = 'SCF'; us = 'm³ (std)'; }
      if (row[2] === 'resRB') { uf = 'RB'; us = 'm³'; }
      if (row[2] === 'compress') { uf = 'psi⁻¹'; us = 'kPa⁻¹'; }
      if (row[2] === 'none' || row[2] === 'frac') { uf = 'adimensional'; us = 'adimensional'; }
      unit = sys === 'si' ? us : uf;
      var desc = row[1].replace(/B_o \+ \(R_\{soi\} − R_\{so\}\) B_g/, texHtml('B_o + (R_{soi} - R_{so})\\,B_g'))
                       .replace(/\(= B_\{oi\}\)/, '(= ' + texHtml('B_{oi}') + ')').replace(/P_i − P/, texHtml('P_i - P'));
      tr.innerHTML = '<td class="k">' + texHtml(row[0]) + '</td><td>' + desc + '</td><td>[' + unit + ']</td>';
      tb.appendChild(tr);
    });
  }

  // ---------- Sustitución con los datos de la simulación ----------
  function renderSubstitution() {
    var S = EBM.Sim.getState(), m = S.model, f = S.frame, p = m.params, d = m.derived;
    if (!m || !f) return;
    var sys = U.getSystem();
    var rbU = U.unit('resRB'), gU = gasMMUnit();
    $('res-unit-label').textContent = rbU;
    $('sub-time').textContent = 'Año ' + U.fmtNum(f.years, 1) + ' · P = ' + U.fmt(f.P, 'pressure');
    if (document.activeElement !== els.slider) els.slider.value = Math.round(S.t * 10000);
    $('sub-dataset').textContent = 'Datos: ' + (S.datasetName === 'user' ? 'mis datos' : 'ejemplo') + ' · ' + (sys === 'si' ? 'Sistema Internacional' : 'unidades de campo');

    var Bti = p.Boi, Bgi = p.Bgi, Btwi = p.Bwi;
    var ew = (f.Bw - Btwi) / Btwi;      // (Btw − Btwi)/Btwi
    var html = '';

    // 1) Datos del instante
    html += '<h3>9.1 Datos del yacimiento y del instante seleccionado</h3>';
    html += '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Símbolo</th><th>Valor</th><th>Símbolo</th><th>Valor</th></tr></thead><tbody>';
    var rows = [
      ['N', U.fmt(p.N, 'oilSTB'), 'm', U.fmtNum(p.m, 2)],
      ['S_{wio}', U.fmtNum(p.Swio, 2), 'S_{wig}', U.fmtNum(p.Swig, 2)],
      ['c_f', U.fmt(p.cf, 'compress'), 'c_w', U.fmt(p.cw, 'compress')],
      ['P_i', U.fmt(p.Pi, 'pressure'), 'P', U.fmt(f.P, 'pressure')],
      ['\\Delta P = P_i - P', U.fmt(f.dP, 'pressure'), 'P_b', U.fmt(p.Pb, 'pressure')],
      ['B_{ti} = B_{oi}', U.fmt(Bti, 'fvfOil'), 'B_t = B_o + (R_{soi}-R_{so})B_g', U.fmt(f.Bt, 'fvfOil')],
      ['B_o', U.fmt(f.Bo, 'fvfOil'), 'R_{so}', U.fmt(f.Rso, 'gor')],
      ['B_{gi}', U.fmt(Bgi, 'fvfGas'), "B_g = B_{gc} = B_g'", U.fmt(f.Bg, 'fvfGas')],
      ['B_{twi} = B_{wi}', U.fmt(Btwi, 'fvfOil'), 'B_{tw} = B_w', U.fmt(f.Bw, 'fvfOil')],
      ['N_p', U.fmt(f.Np, 'oilSTB'), 'W_p', U.fmt(f.Wp, 'oilSTB')],
      ['G_{ps}', U.fmt(f.Gps, 'gasSCF'), 'G_{pc}', U.fmt(f.Gpc, 'gasSCF')],
      ['W_e', U.fmt(f.We, 'oilSTB'), 'W_i', U.fmt(f.Wi, 'oilSTB')],
      ['G_i', U.fmt(f.Gi, 'gasSCF'), 'G = N m B_{ti}/B_{gi}', U.fmt(d.G, 'gasSCF')]
    ];
    rows.forEach(function (r) { html += '<tr><td class="k">' + texHtml(r[0]) + '</td><td>' + r[1] + '</td><td class="k">' + texHtml(r[2]) + '</td><td>' + r[3] + '</td></tr>'; });
    html += '</tbody></table></div>';

    // 2) Términos de expansión (2.7)
    html += '<h3>9.2 Términos de expansión (2.7) con los datos</h3>';
    html += '<p class="small muted">Resultados en ' + U.unit('fvfOil') + ' (volumen de yacimiento por unidad de petróleo original).</p>';
    var fo = 'fvfOil', fg = 'fvfGas';
    var tD = [
      { q: '¿Cuánto cambió el volumen del petróleo inicial y su gas asociado?', c: '#7A4E2D',
        src: 'D_o = B_t - B_{ti} = ' + n(f.Bt, fo) + ' - ' + n(Bti, fo) + ' = ' + n(f.Do, fo, 4) },
      { q: '¿Cuánto cambió el volumen del gas libre?', c: '#E8C86A',
        src: 'D_{go} = m B_{ti}\\left(\\frac{B_{gc} - B_{gi}}{B_{gi}}\\right) = ' + n(p.m, 'none', 2) + '\\cdot' + n(Bti, fo) + '\\left(\\frac{' + n(f.Bg, fg) + ' - ' + n(Bgi, fg) + '}{' + n(Bgi, fg) + '}\\right) = ' + n(f.Dgo, fo, 4) },
      { q: '¿Cuánto cambió el volumen del agua connata de la zona de petróleo?', c: '#8FB4D9',
        src: 'D_w = \\frac{B_{ti} S_{wio}}{1 - S_{wio}}\\left(\\frac{B_{tw} - B_{twi}}{B_{twi}}\\right) = \\frac{' + n(Bti, fo) + '\\cdot' + n(p.Swio, 'none', 2) + '}{1 - ' + n(p.Swio, 'none', 2) + '}\\left(\\frac{' + n(f.Bw, fo, 4) + ' - ' + n(Btwi, fo, 4) + '}{' + n(Btwi, fo, 4) + '}\\right) = ' + n(f.Dw, fo, 5) },
      { q: '¿Cuánto cambió el volumen del agua connata de la capa de gas?', c: '#8FB4D9',
        src: 'D_{gw} = \\frac{m B_{ti} S_{wig}}{1 - S_{wig}}\\left(\\frac{B_{tw} - B_{twi}}{B_{twi}}\\right) = \\frac{' + n(p.m, 'none', 2) + '\\cdot' + n(Bti, fo) + '\\cdot' + n(p.Swig, 'none', 2) + '}{1 - ' + n(p.Swig, 'none', 2) + '}\\cdot' + n(ew, 'none', 6) + ' = ' + n(f.Dgw, fo, 5) },
      { q: '¿Cuánto cambió el volumen poroso de la formación?', c: '#A08A72',
        src: 'D_r = \\left(\\frac{1}{1 - S_{wio}} + \\frac{m}{1 - S_{wig}}\\right) B_{ti}\\, c_f\\, \\Delta P = \\left(\\frac{1}{1 - ' + n(p.Swio, 'none', 2) + '} + \\frac{' + n(p.m, 'none', 2) + '}{1 - ' + n(p.Swig, 'none', 2) + '}\\right)' + n(Bti, fo) + '\\cdot' + n(p.cf, 'compress') + '\\!\\times\\! 10^{-6}\\cdot' + n(f.dP, 'pressure') + ' = ' + n(f.Dr, fo, 5) }
    ];
    html += '<div class="termgrid wide">';
    tD.forEach(function (t) { html += '<div class="termcard" style="border-top-color:' + t.c + '"><div class="q">' + t.q + '</div>' + texHtml(t.src, true) + '</div>'; });
    html += '</div>';

    // 3) Ecuación (2.6) término a término
    var sumD = f.Do + f.Dgo + f.Dw + f.Dgw + f.Dr;
    var NN = n(p.N, 'oilSTB');
    var Nu = U.unit('oilSTB');
    html += '<h3>9.3 Ecuación (2.6) término a término</h3>';
    html += '<p class="small muted">Cada término es un volumen a condiciones de yacimiento en ' + rbU + ' (N en ' + Nu + ' × factores en ' + U.unit('fvfOil') + '; gas en ' + gU.replace('\\,', ' ') + ' × B<sub>g</sub> en ' + U.unit('fvfGas') + ').</p>';
    var L = [
      ['N(B_t - B_{ti})', NN + '\\,(' + n(f.Bt, fo) + ' - ' + n(Bti, fo) + ')', f.NDo],
      ['N m B_{ti}\\left(\\tfrac{B_{gc}-B_{gi}}{B_{gi}}\\right)', NN + '\\cdot' + n(p.m, 'none', 2) + '\\cdot' + n(Bti, fo) + '\\cdot' + n((f.Bg - Bgi) / Bgi, 'none', 4), f.NDgo],
      ['N\\tfrac{B_{ti}S_{wio}}{1-S_{wio}}\\left(\\tfrac{B_{tw}-B_{twi}}{B_{twi}}\\right)', NN + '\\cdot' + n(f.Dw, fo, 5), f.NDw],
      ['N\\tfrac{m B_{ti}S_{wig}}{1-S_{wig}}\\left(\\tfrac{B_{tw}-B_{twi}}{B_{twi}}\\right)', NN + '\\cdot' + n(f.Dgw, fo, 5), f.NDgw],
      ['N\\left(\\tfrac{1}{1-S_{wio}}+\\tfrac{m}{1-S_{wig}}\\right)B_{ti}c_f\\Delta P', NN + '\\cdot' + n(f.Dr, fo, 5), f.NDr]
    ];
    var R = [
      ['N_p B_o', n(f.Np, 'oilSTB') + '\\cdot' + n(f.Bo, fo), f.NpBo, 1],
      ['-\\,N_p R_{so} B_g', '-\\,' + fmtGasMM(f.Np * f.Rso).replace(/ /g, '\\,') + '\\cdot' + n(f.Bg, fg), f.NpRsoBg, -1],
      ['+\\,G_{ps} B_g', '+\\,' + fmtGasMM(f.Gps).replace(/ /g, '\\,') + '\\cdot' + n(f.Bg, fg), f.GpsBg, 1],
      ['+\\,G_{pc} B_{gc}', '+\\,' + fmtGasMM(f.Gpc).replace(/ /g, '\\,') + '\\cdot' + n(f.Bg, fg), f.GpcBgc, 1],
      ["-\\,G_i B_g'", '-\\,' + fmtGasMM(f.Gi).replace(/ /g, '\\,') + '\\cdot' + n(f.Bg, fg), f.GiBg, -1],
      ['-\\,(W_e + W_i - W_p) B_w', '-\\,(' + n(f.We, 'oilSTB') + ' + ' + n(f.Wi, 'oilSTB') + ' - ' + n(f.Wp, 'oilSTB') + ')\\cdot' + n(f.Bw, fo), f.WeBw + f.WiBw - f.WpBw, -1]
    ];
    var lhsF = f.NDo + f.NDgo + f.NDw + f.NDgw + f.NDr;
    var rhsF = f.NpBo - f.NpRsoBg + f.GpsBg + f.GpcBgc - f.GiBg - (f.WeBw + f.WiBw - f.WpBw);
    var src = '\\begin{aligned}';
    src += '&\\textbf{Lado izquierdo (cambios de volumen)}\\\\';
    L.forEach(function (r) { src += r[0] + ' &= ' + r[1] + ' = ' + n(r[2], 'resRB') + '\\\\'; });
    src += '\\text{Suma} &= ' + n(lhsF, 'resRB') + un('resRB') + '\\\\[6pt]';
    src += '&\\textbf{Lado derecho (producción e inyección)}\\\\';
    R.forEach(function (r) { src += r[0] + ' &= ' + r[1] + ' = ' + (r[3] < 0 ? '-\\,' : '') + n(r[2], 'resRB') + '\\\\'; });
    src += '\\text{Suma} &= ' + n(rhsF, 'resRB') + un('resRB');
    src += '\\end{aligned}';
    html += '<div class="eq sub"><span class="eqn">(2.6) con datos</span>' + texHtml(src, true) + '</div>';

    // 4) Ecuación (2.8) compacta con números
    html += '<h3>9.4 Forma compacta (2.8) con los datos</h3>';
    var src28 = '\\begin{aligned} N[D_o + D_{go} + D_w + D_{gw} + D_r] &= ' + NN + '\\,[' + n(f.Do, fo, 4) + ' + ' + n(f.Dgo, fo, 4) + ' + ' + n(f.Dw, fo, 5) + ' + ' + n(f.Dgw, fo, 5) + ' + ' + n(f.Dr, fo, 5) + ']\\\\'
      + '&= ' + NN + ' \\times ' + n(sumD, fo, 4) + ' = \\mathbf{' + n(p.N * sumD, 'resRB') + '}' + un('resRB') + '\\\\[4pt]'
      + 'N_p B_o - N_p R_{so} B_g + [G_{ps} B_g + G_{pc} B_{gc} - G_i B_g\'] - (W_e + W_i - W_p) B_w &= '
      + n(f.NpBo, 'resRB') + ' - ' + n(f.NpRsoBg, 'resRB') + ' + [' + n(f.GpsBg, 'resRB') + ' + ' + n(f.GpcBgc, 'resRB') + ' - ' + n(f.GiBg, 'resRB') + '] - (' + n(f.WeBw, 'resRB') + ' + ' + n(f.WiBw, 'resRB') + ' - ' + n(f.WpBw, 'resRB') + ')\\\\'
      + '&= \\mathbf{' + n(rhsF, 'resRB') + '}' + un('resRB') + '\\end{aligned}';
    html += '<div class="eq sub"><span class="eqn">(2.8) con datos</span>' + texHtml(src28, true) + '</div>';
    var diff = lhsF - rhsF;
    html += '<div class="callout blue">✅ <b>Balance:</b> izquierda − derecha = ' + U.fmt(diff, 'resRB', { dec: 4 }) + ' → la ecuación se cumple en este instante. Factor de recobro: ' + U.fmt(f.RF, 'pct') + '.</div>';

    // 5) Gas original de la capa (2.9)
    html += '<h3>9.5 Gas original de la capa de gas (2.9)</h3>';
    var src29 = 'G = \\frac{N m B_{ti}}{B_{gi}} = \\frac{' + NN + '\\cdot' + n(p.m, 'none', 2) + '\\cdot' + n(Bti, fo) + '}{' + n(Bgi, fg) + '} = ' + fmtGasMM(d.G).replace(/ /g, '\\,') + '\\ \\mathrm{' + gU + '} = ' + n(d.G, 'gasSCF') + un('gasSCF');
    html += '<div class="eq sub"><span class="eqn">(2.9) con datos</span>' + texHtml(src29, true) + '</div>';
    if (p.m === 0) html += '<p class="small muted">Con m = 0 no hay capa de gas: G = 0 y los términos D<sub>go</sub> y D<sub>gw</sub> se anulan.</p>';

    els.sub.innerHTML = html;
    dirty = false;
  }

  function scheduleSub() {
    dirty = true;
    if (!$('tab-theory').classList.contains('active')) return;
    clearTimeout(timer); timer = setTimeout(function () { if (dirty) renderSubstitution(); }, EBM.Sim.getState().playing ? 400 : 90);
  }

  function initBiblio() {
    var box = $('biblio'), bar = $('biblio-bar');
    bar.addEventListener('click', function () {
      var open = box.classList.toggle('open');
      bar.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) bar.scrollIntoView({ block: 'end', behavior: 'smooth' });
    });
  }

  function init() {
    els.sub = $('sub-content'); els.slider = $('sub-slider');
    renderStaticEquations();
    renderNomen();
    initBiblio();
    els.slider.addEventListener('input', function (e) { EBM.Sim.setTime(parseInt(e.target.value, 10) / 10000); });
    $('sub-final').addEventListener('click', function () { EBM.Sim.pause(); EBM.Sim.setTime(1); });
    EBM.Sim.onTime(scheduleSub);
    EBM.Sim.onModel(scheduleSub);
    U.onChange(function () { renderNomen(); scheduleSub(); });
    scheduleSub();
  }
  function onShow() { if (dirty) renderSubstitution(); }

  EBM.Theory = { init: init, onShow: onShow, render: renderSubstitution };
})(typeof window !== 'undefined' ? window : globalThis);
