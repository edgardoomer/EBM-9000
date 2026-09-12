/* EBM-9000 · Aplicación: pestañas, unidades, modal "Mis datos" e inicialización */
(function (global) {
  'use strict';
  var EBM = global.EBM;
  var U = EBM.Units, D = EBM.Data;
  var TAB_HASH = { sim: 'simulacion', theory: 'teoria', credits: 'creditos' };
  var userParams = null, modalOpen = false;

  function $(id) { return document.getElementById(id); }
  function toast(msg, ms) {
    var t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(t._tm); t._tm = setTimeout(function () { t.classList.remove('show'); }, ms || 2600);
  }

  // ---------- Pestañas ----------
  function showTab(key, pushHash) {
    var btns = document.querySelectorAll('.tab-btn');
    for (var i = 0; i < btns.length; i++) {
      var on = btns[i].getAttribute('data-tab') === key;
      btns[i].classList.toggle('active', on); btns[i].setAttribute('aria-selected', on ? 'true' : 'false');
    }
    ['sim', 'theory', 'credits'].forEach(function (k) { $('tab-' + k).classList.toggle('active', k === key); });
    if (key === 'theory') EBM.Theory.onShow();
    if (pushHash !== false) { try { history.replaceState(null, '', '#' + TAB_HASH[key]); } catch (e) { location.hash = TAB_HASH[key]; } }
    window.scrollTo(0, 0);
  }
  function tabFromHash() {
    var hsh = (location.hash || '').replace('#', '');
    for (var k in TAB_HASH) if (TAB_HASH[k] === hsh) return k;
    return 'sim';
  }
  function initTabs() {
    var btns = document.querySelectorAll('.tab-btn');
    for (var i = 0; i < btns.length; i++) btns[i].addEventListener('click', function (e) { showTab(e.currentTarget.getAttribute('data-tab')); });
    $('brand-link').addEventListener('click', function (e) { e.preventDefault(); showTab('sim'); });
    window.addEventListener('hashchange', function () { showTab(tabFromHash(), false); });
    showTab(tabFromHash(), false);
  }

  // ---------- Unidades ----------
  function paintUnitSegs() {
    var sys = U.getSystem();
    var bs = document.querySelectorAll('.units-seg button[data-sys]');
    for (var i = 0; i < bs.length; i++) bs[i].classList.toggle('active', bs[i].getAttribute('data-sys') === sys);
  }
  function initUnits() {
    var saved = null; try { saved = localStorage.getItem('ebm9000.units'); } catch (e) { /* sin almacenamiento */ }
    if (saved === 'si') U.setSystem('si');
    paintUnitSegs();
    var bs = document.querySelectorAll('.units-seg button[data-sys]');
    for (var i = 0; i < bs.length; i++) bs[i].addEventListener('click', function (e) {
      var sys = e.currentTarget.getAttribute('data-sys');
      var current = modalOpen ? readForm(false).values : null;   // conserva lo tecleado al cambiar de sistema
      U.setSystem(sys);
      if (modalOpen) renderForm(current || userParams || D.EXAMPLE);
    });
    U.onChange(function () { paintUnitSegs(); EBM.Sim.refreshUnits(); toast(U.getSystem() === 'si' ? 'Unidades: Sistema Internacional (m³, kPa)' : 'Unidades de campo (STB, SCF, psia)'); });
  }

  // ---------- Formulario "Mis datos" ----------
  var FIELDS = [];
  D.INPUT_GROUPS.forEach(function (g) { g.fields.forEach(function (f) { FIELDS.push(f); }); });

  function displayDecimals(kind) {
    var sp = U.spec(kind); return Math.max(sp.dec, kind === 'oilSTB' || kind === 'gasSCF' ? 3 : (kind === 'compress' ? 2 : 0));
  }
  function renderForm(values) {
    var form = $('data-form'); form.innerHTML = '';
    $('modal-units').textContent = U.getSystem() === 'si' ? 'Sistema Internacional' : 'Unidades de campo';
    D.INPUT_GROUPS.forEach(function (g) {
      var fg = document.createElement('div'); fg.className = 'fgroup';
      fg.innerHTML = '<h4>' + g.title + '</h4>';
      var grid = document.createElement('div'); grid.className = 'fgrid';
      g.fields.forEach(function (f) {
        var v = values[f.key];
        var shown = v === undefined || v === null ? '' : +U.toDisplay(v, f.kind).toPrecision(6);
        var unit = U.unit(f.kind) || '—';
        var div = document.createElement('div'); div.className = 'field';
        div.innerHTML = '<label for="in-' + f.key + '"><span class="sym">' + f.sym + '</span> · ' + f.label + '</label>' +
          '<div class="in"><input id="in-' + f.key + '" name="' + f.key + '" type="number" step="any" inputmode="decimal" value="' + shown + '"' +
          (f.min !== undefined ? ' min="' + U.toDisplay(f.min, f.kind) + '"' : '') + '><span class="u">' + unit + '</span></div>';
        grid.appendChild(div);
      });
      fg.appendChild(grid); form.appendChild(fg);
    });
    $('form-errors').classList.remove('show');
  }
  // Lee el formulario y devuelve valores en unidades de campo + errores
  function readForm(validate) {
    var values = {}, errors = [];
    FIELDS.forEach(function (f) {
      var inp = $('in-' + f.key); if (!inp) return;
      inp.classList.remove('bad');
      var raw = inp.value.trim().replace(',', '.');
      var num = parseFloat(raw);
      if (raw === '' || isNaN(num)) { if (validate) { errors.push('Falta un valor numérico para ' + f.sym.replace(/<[^>]+>/g, '') + ' (' + f.label + ').'); inp.classList.add('bad'); } return; }
      values[f.key] = U.fromDisplay(num, f.kind);
    });
    if (!validate) return { values: values, errors: errors };
    function bad(key, msg) { errors.push(msg); var i = $('in-' + key); if (i) i.classList.add('bad'); }
    var v = values;
    if (v.N <= 0) bad('N', 'N debe ser mayor que cero.');
    if (v.m < 0) bad('m', 'm no puede ser negativo.');
    if (!(v.Swio >= 0 && v.Swio < 0.9)) bad('Swio', 'S_wio debe estar entre 0 y 0.9.');
    if (!(v.Swig >= 0 && v.Swig < 0.9)) bad('Swig', 'S_wig debe estar entre 0 y 0.9.');
    if (v.cf < 0 || v.cw < 0 || v.co < 0) bad('cf', 'Las compresibilidades no pueden ser negativas.');
    if (!(v.Pi > 0)) bad('Pi', 'P_i debe ser positiva.');
    if (!(v.Pf > 0 && v.Pf < v.Pi)) bad('Pf', 'La presión final debe ser positiva y menor que P_i.');
    if (v.Pb > v.Pi + 1e-9) bad('Pb', 'P_b no puede ser mayor que P_i (usa P_b = P_i si el petróleo está saturado).');
    if (v.Pb <= v.Pf) bad('Pb', 'P_b debe ser mayor que la presión final para que exista tramo saturado.');
    if (v.Boi < 0.5 || v.Bof < 0.5 || v.Bwi < 0.5) bad('Boi', 'Los factores volumétricos de líquidos deben ser ≥ 0.5.');
    if (v.Rsof > v.Rsoi) bad('Rsof', 'R_so final no puede ser mayor que R_so inicial.');
    if (v.Rsof < 0) bad('Rsof', 'R_so final no puede ser negativo.');
    if (!(v.Bgi > 0)) bad('Bgi', 'B_gi debe ser positivo.');
    if (v.Bgf < v.Bgi) bad('Bgf', 'B_g final debe ser mayor o igual que B_g inicial (el gas se expande al bajar la presión).');
    if (v.Wef < 0 || v.Wif < 0 || v.Gif < 0) bad('Wef', 'Los volúmenes de intrusión e inyección no pueden ser negativos.');
    if (!(v.tInj >= 0 && v.tInj <= 1)) bad('tInj', 'El inicio de la inyección debe estar entre 0 y 100 %.');
    if (v.Rf < v.Rsof) bad('Rf', 'La RGP final debe ser al menos igual al R_so final.');
    if (!(v.fwf >= 0 && v.fwf < 1)) bad('fwf', 'El corte de agua final debe estar entre 0 y 99 %.');
    if (!(v.tBt >= 0 && v.tBt <= 1)) bad('tBt', 'La irrupción de agua debe estar entre 0 y 100 %.');
    if (!(v.years >= 1)) bad('years', 'La vida productiva debe ser de al menos 1 año.');
    return { values: values, errors: errors };
  }
  function openModal() {
    renderForm(userParams || D.EXAMPLE);
    $('modal-data').classList.add('open'); modalOpen = true;
    var first = $('data-form').querySelector('input'); if (first) first.focus();
  }
  function closeModal() { $('modal-data').classList.remove('open'); modalOpen = false; }
  function applyForm() {
    var r = readForm(true), box = $('form-errors');
    if (r.errors.length) { box.innerHTML = '<b>Revisa estos datos:</b><br>• ' + r.errors.join('<br>• '); box.classList.add('show'); box.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return; }
    userParams = r.values;
    try { localStorage.setItem('ebm9000.user', JSON.stringify(userParams)); } catch (e) { /* sin almacenamiento */ }
    closeModal();
    EBM.Sim.pause();
    EBM.Sim.setModel(userParams, 'user');
    var w = EBM.Sim.getState().model.warnings;
    if (r.values.m > 0 && r.values.Pb < r.values.Pi) toast('Aviso: con capa de gas el petróleo suele estar saturado (P_b = P_i).', 4200);
    else if (w.length) toast('Datos aplicados con avisos: revisa el panel de la derecha.', 4200);
    else toast('Simulando con tus datos. Pulsa Reproducir.');
    showTab('sim');
  }
  function initModal() {
    try { var s = localStorage.getItem('ebm9000.user'); if (s) userParams = JSON.parse(s); } catch (e) { userParams = null; }
    $('btn-user').addEventListener('click', openModal);
    $('btn-example').addEventListener('click', function () {
      if (EBM.Sim.getState().datasetName !== 'example') { EBM.Sim.pause(); EBM.Sim.setModel(D.EXAMPLE, 'example'); toast('Datos del ejemplo cargados.'); }
    });
    $('modal-close').addEventListener('click', closeModal);
    $('modal-data').addEventListener('click', function (e) { if (e.target === e.currentTarget) closeModal(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modalOpen) closeModal(); });
    $('form-apply').addEventListener('click', function (e) { e.preventDefault(); applyForm(); });
    $('data-form').addEventListener('submit', function (e) { e.preventDefault(); applyForm(); });
    $('form-load-example').addEventListener('click', function () { renderForm(D.EXAMPLE); toast('Valores del ejemplo cargados en el formulario.'); });
  }

  function init() {
    EBM.Sim.init();
    EBM.Theory.init();
    initUnits();
    initModal();
    initTabs();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  EBM.App = { showTab: showTab, toast: toast };
})(typeof window !== 'undefined' ? window : globalThis);
