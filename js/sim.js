/* EBM-9000 · Pestaña Simulación: reproducción, tablero, panel de la ecuación en vivo,
 * línea de tiempo, tooltips con la pregunta de cada variable.
 */
(function (global) {
  'use strict';
  var EBM = global.EBM;
  var U = EBM.Units, D = EBM.Data, M = EBM.Model, T = EBM.Tank;
  var V = D.VARS;

  var CYCLE_SEC = 300;         // duración de un ciclo completo a 1×
  var HOLD_MS = 4500;          // pausa en el punto muerto antes de reiniciar

  var state = { model: null, datasetName: 'example', t: 0, playing: false, speed: 1, lastTs: null, holdUntil: 0, frame: null, raf: null };
  var timeListeners = [], modelListeners = [];
  var els = {};

  function $(id) { return document.getElementById(id); }
  function h(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }
  function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }

  // ---------- Tooltip (pregunta didáctica) ----------
  var tip = { el: null, key: null, hideTimer: null };
  function tipContent(key) {
    var v = V[key]; if (!v) return null;
    var val = valueFor(key);
    var html = '<div class="tt-sym">' + v.sym + '</div>';
    if (v.name) html += '<div class="tt-name">' + v.name + '</div>';
    html += '<div class="tt-q">' + v.q + '</div>';
    if (val !== null && val !== undefined) html += '<div class="tt-v">' + val + '</div>';
    return html;
  }
  function valueFor(key) {
    var f = state.frame, m = state.model; if (!f || !m) return null;
    var v = V[key];
    switch (key) {
      case 'N': return 'N = ' + U.fmt(m.params.N, 'oilSTB');
      case 'm': return 'm = ' + U.fmtNum(m.params.m, 2);
      case 'G': return 'G = ' + U.fmt(m.derived.G, 'gasSCF');
      case 'NDwt': return '= ' + U.fmt(f.NDw + f.NDgw, 'resRB');
      case 'layerGas': return '= ' + U.fmt(f.gasCap, 'resRB');
      case 'layerOil': return '= ' + U.fmt(f.oil, 'resRB') + (f.gasEvolved > 0 ? ' + ' + U.fmt(f.gasEvolved, 'resRB') + ' de gas liberado' : '');
      case 'layerEvolved': return '= ' + U.fmt(f.gasEvolved, 'resRB');
      case 'layerWater': return '= ' + U.fmt(f.water, 'resRB');
      case 'layerRock': return '= ' + U.fmt(f.NDr, 'resRB');
      case 'aquifer': return 'Hoy: ' + U.fmt(f.qwe, 'rateLiq') + ' · acumulado We = ' + U.fmt(f.We, 'oilSTB');
      case 'wellProd': return 'q<sub>o</sub> ' + U.fmt(f.qo, 'rateLiq') + ' · q<sub>g</sub> ' + U.fmt(f.qg, 'rateGas') + ' · q<sub>w</sub> ' + U.fmt(f.qw, 'rateLiq') + ' · f<sub>w</sub> ' + U.fmt(f.fw, 'pct');
      case 'wellWinj': return f.qwi > 0 ? 'Hoy: ' + U.fmt(f.qwi, 'rateLiq') + ' · acumulado Wi = ' + U.fmt(f.Wi, 'oilSTB') : 'Aún no inyecta';
      case 'wellGinj': return f.qgi > 0 ? 'Hoy: ' + U.fmt(f.qgi, 'rateGas') + ' · acumulado Gi = ' + U.fmt(f.Gi, 'gasSCF') : 'Aún no inyecta';
      case 'goc0': return 'La capa de gas ocupa ahora ' + U.fmt(f.gasCap, 'resRB') + ' (inicial ' + U.fmt(m.frames[0].gasCap, 'resRB') + ')';
      case 'woc0': return 'El agua ocupa ahora ' + U.fmt(f.water, 'resRB') + ' (inicial ' + U.fmt(m.frames[0].water, 'resRB') + ')';
      case 'gauge': return 'P = ' + U.fmt(f.P, 'pressure') + ' · ΔP = ' + U.fmt(f.dP, 'pressure') + ' (P<sub>i</sub> = ' + U.fmt(m.params.Pi, 'pressure') + ')';
      case 't': return '= ' + U.fmt(f.years, 'years') + ' (' + U.fmtNum(100 * f.t, 0) + ' % de la vida productiva)';
      case 'lhs': return '= ' + U.fmt(f.lhs, 'resRB');
      case 'rhs': return '= ' + U.fmt(f.rhs, 'resRB');
      default:
        if (f[key] === undefined) return null;
        return '= ' + U.fmt(f[key], v.kind);
    }
  }
  function showTip(key, x, y) {
    var html = tipContent(key); if (!html) return;
    tip.el.innerHTML = html; tip.key = key;
    tip.el.classList.add('show'); tip.el.setAttribute('aria-hidden', 'false');
    moveTip(x, y);
  }
  function moveTip(x, y) {
    var r = tip.el.getBoundingClientRect();
    var left = x + 16, top = y + 18;
    if (left + r.width > window.innerWidth - 8) left = x - r.width - 12;
    if (top + r.height > window.innerHeight - 8) top = y - r.height - 12;
    tip.el.style.left = Math.max(6, left) + 'px'; tip.el.style.top = Math.max(6, top) + 'px';
  }
  function hideTip() { tip.el.classList.remove('show'); tip.el.setAttribute('aria-hidden', 'true'); tip.key = null; }
  function refreshTip() { if (tip.key && tip.el.classList.contains('show')) { var html = tipContent(tip.key); if (html) tip.el.innerHTML = html; } }
  function initTooltip() {
    tip.el = $('tooltip');
    document.addEventListener('mouseover', function (e) {
      var t = e.target.closest && e.target.closest('[data-tip]');
      if (t) showTip(t.getAttribute('data-tip'), e.clientX, e.clientY);
    });
    document.addEventListener('mousemove', function (e) {
      if (!tip.key) return;
      var t = e.target.closest && e.target.closest('[data-tip]');
      if (!t) { hideTip(); return; }
      if (t.getAttribute('data-tip') !== tip.key) showTip(t.getAttribute('data-tip'), e.clientX, e.clientY); else moveTip(e.clientX, e.clientY);
    });
    document.addEventListener('mouseout', function (e) {
      var t = e.target.closest && e.target.closest('[data-tip]');
      if (t && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('[data-tip]'))) hideTip();
    });
    // táctil: un toque muestra la pregunta unos segundos
    document.addEventListener('touchstart', function (e) {
      var t = e.target.closest && e.target.closest('[data-tip]');
      if (!t) { hideTip(); return; }
      var touch = e.touches[0];
      showTip(t.getAttribute('data-tip'), touch.clientX, touch.clientY);
      clearTimeout(tip.hideTimer); tip.hideTimer = setTimeout(hideTip, 3500);
    }, { passive: true });
  }

  // ---------- Tablero de variables ----------
  var DASH_KEYS = ['t', 'P', 'dP', 'Np', 'RF', 'Gp', 'Wp', 'We', 'Wi', 'Gi', 'R', 'fw', 'Bo', 'Rso', 'Bg', 'Bt', 'Bw', 'qo', 'qg', 'qw'];
  function buildDash() {
    els.dash.innerHTML = '';
    els.dashVals = {}; els.dashKeys = {};
    DASH_KEYS.forEach(function (k) {
      var v = V[k];
      var c = h('div', 'chip'); c.setAttribute('data-tip', k); c.tabIndex = 0;
      var kk = h('div', 'k'); var vv = h('div', 'v', '—');
      c.appendChild(kk); c.appendChild(vv); els.dash.appendChild(c);
      els.dashVals[k] = vv; els.dashKeys[k] = kk;
    });
    labelDash();
  }
  function labelDash() {
    DASH_KEYS.forEach(function (k) { var u = U.unit(V[k].kind); els.dashKeys[k].innerHTML = V[k].sym + (u ? ' <span class="muted">(' + u + ')</span>' : ''); });
  }
  function updateDash(f) {
    DASH_KEYS.forEach(function (k) { els.dashVals[k].textContent = U.fmt(k === 't' ? f.years : f[k], V[k].kind, { noUnit: true }); });
  }

  // ---------- Panel: la ecuación en vivo ----------
  var MECH_NAME = { NDo: 'expansión del petróleo y su gas disuelto', NDgo: 'expansión de la capa de gas', NDwt: 'expansión del agua connata', NDr: 'compactación de la roca', WeBw: 'empuje del acuífero', WiBw: 'inyección de agua', GiBg: 'inyección de gas' };
  function buildPanel() {
    var p = els.panel; p.innerHTML = '';
    p.appendChild(h('h3', null, 'La ecuación en vivo'));
    p.appendChild(h('div', 'eq-live', '<span class="L" data-tip="lhs">N·(D<sub>o</sub> + D<sub>go</sub> + D<sub>w</sub> + D<sub>gw</sub> + D<sub>r</sub>) + W<sub>e</sub>B<sub>w</sub> + W<sub>i</sub>B<sub>w</sub> + G<sub>i</sub>B<sub>g</sub>′</span> &nbsp;=&nbsp; <span class="R" data-tip="rhs">N<sub>p</sub>B<sub>o</sub> − N<sub>p</sub>R<sub>so</sub>B<sub>g</sub> + G<sub>ps</sub>B<sub>g</sub> + G<sub>pc</sub>B<sub>gc</sub> + W<sub>p</sub>B<sub>w</sub></span>'));

    var bL = h('div', 'bar-block'); bL.innerHTML = '<div class="bar-title"><span>Expansiones + entradas (lado izquierdo)</span><span class="tot" id="tot-L">—</span></div>';
    els.barL = h('div', 'bar'); bL.appendChild(els.barL); p.appendChild(bL);
    var bR = h('div', 'bar-block'); bR.innerHTML = '<div class="bar-title"><span>Producción (lado derecho)</span><span class="tot" id="tot-R">—</span></div>';
    els.barR = h('div', 'bar'); bR.appendChild(els.barR); p.appendChild(bR);
    els.segs = {};
    D.TERMS_L.forEach(function (k) { var s = h('div', 'sg'); s.style.background = V[k].color; s.style.width = '0%'; s.setAttribute('data-tip', k); els.barL.appendChild(s); els.segs[k] = s; });
    D.TERMS_R.forEach(function (k) { var s = h('div', 'sg'); s.style.background = V[k].color; s.style.width = '0%'; s.setAttribute('data-tip', k); els.barR.appendChild(s); els.segs[k] = s; });
    els.neg = h('div', 'neg'); els.neg.setAttribute('data-tip', 'NpRsoBg'); els.neg.style.left = '100%'; els.neg.style.width = '0%'; els.barR.appendChild(els.neg);
    els.markL = h('div', 'mark'); els.barL.appendChild(els.markL);
    els.markR = h('div', 'mark'); els.barR.appendChild(els.markR);

    els.bal = h('div', 'balance-line ok', '<span>Izquierda − derecha (residuo del balance)</span><b id="bal-diff">0</b>');
    p.appendChild(els.bal);

    els.legend = h('div', 'legend'); p.appendChild(els.legend);
    els.legendRows = {};
    function addHead(t) { els.legend.appendChild(h('div', 'lg-head', t)); }
    function addRow(k) {
      var row = h('div', 'row'); row.setAttribute('data-tip', k);
      var sw = h('div', 'sw' + (V[k].neg ? ' neg' : '')); if (!V[k].neg) sw.style.background = V[k].color;
      var sym = h('div', 'lg-sym', (V[k].neg ? '− ' : '') + V[k].sym);
      var val = h('div', 'lg-val', '—'); var pct = h('div', 'lg-pct', '');
      row.appendChild(sw); row.appendChild(sym); row.appendChild(val); row.appendChild(pct);
      els.legend.appendChild(row); els.legendRows[k] = { val: val, pct: pct };
    }
    addHead('¿De dónde sale el vaciamiento? (izquierda)');
    D.TERMS_L.forEach(addRow);
    addHead('¿A dónde se fue el volumen? (derecha)');
    ['NpBo', 'NpRsoBg', 'GpsBg', 'GpcBgc', 'WpBw'].forEach(addRow);

    els.mech = h('div', 'mech', ''); p.appendChild(els.mech);
    els.warns = h('div', 'warnbox'); els.warns.hidden = true; p.appendChild(els.warns);
  }
  function termValue(f, k) { return k === 'NDwt' ? f.NDw + f.NDgw : f[k]; }
  function updatePanel(f) {
    var gross = f.rhsGross > 0 ? f.rhsGross : 1;
    var scaleMax = Math.max(f.lhs, f.rhsGross, 1e-9);
    D.TERMS_L.forEach(function (k) { els.segs[k].style.width = (100 * termValue(f, k) / scaleMax) + '%'; });
    D.TERMS_R.forEach(function (k) { els.segs[k].style.width = (100 * f[k] / scaleMax) + '%'; });
    var negW = 100 * f.NpRsoBg / scaleMax;
    els.neg.style.left = (100 * f.rhs / scaleMax) + '%'; els.neg.style.width = negW + '%';
    els.markL.style.left = (100 * f.lhs / scaleMax) + '%'; els.markR.style.left = (100 * f.rhs / scaleMax) + '%';
    $('tot-L').textContent = U.fmt(f.lhs, 'resRB');
    $('tot-R').textContent = U.fmt(f.rhs, 'resRB') + (f.NpRsoBg > 0 ? '  (bruto ' + U.fmt(f.rhsGross, 'resRB', { noUnit: true }) + ')' : '');
    var res = f.lhs - f.rhs, ok = Math.abs(res) <= 1e-6 * Math.max(1, f.lhs);
    $('bal-diff').textContent = U.fmt(res, 'resRB', { dec: 3 }) + (ok ? ' ✓' : ' ⚠');
    els.bal.classList.toggle('ok', ok);
    D.TERMS_L.forEach(function (k) {
      var v = termValue(f, k); els.legendRows[k].val.textContent = U.fmt(v, 'resRB');
      els.legendRows[k].pct.textContent = f.lhs > 0 ? U.fmtNum(100 * v / f.lhs, 1) + ' %' : '';
    });
    ['NpBo', 'NpRsoBg', 'GpsBg', 'GpcBgc', 'WpBw'].forEach(function (k) {
      els.legendRows[k].val.textContent = (k === 'NpRsoBg' && f[k] > 0 ? '− ' : '') + U.fmt(f[k], 'resRB');
      els.legendRows[k].pct.textContent = f.rhsGross > 0 ? (k === 'NpRsoBg' ? '− ' : '') + U.fmtNum(100 * f[k] / gross, 1) + ' %' : '';
    });
    // mecanismo dominante
    if (f.lhs > 0) {
      var best = null, bv = -1;
      D.TERMS_L.forEach(function (k) { var v = termValue(f, k); if (v > bv) { bv = v; best = k; } });
      var share = 100 * bv / f.lhs;
      els.mech.innerHTML = '<b>Mecanismo dominante ahora:</b> ' + MECH_NAME[best] + ' (' + U.fmtNum(share, 0) + ' % del vaciamiento). ' +
        '<span class="muted">La barra de la izquierda es la <b>energía</b> del yacimiento; la de la derecha, el <b>volumen retirado</b>. Siempre miden lo mismo: eso es el balance.</span>';
    } else {
      els.mech.innerHTML = '<b>Estado inicial.</b> <span class="muted">Nada se ha producido y nada se ha expandido: ambos lados valen cero. Pulsa <b>Reproducir</b>.</span>';
    }
  }

  // ---------- Línea de tiempo ----------
  var EV_SHORT = { start: 'Inicio', pb: 'P. burbuja', inj: 'Inyección', bt: 'Irrupción de agua', end: 'Punto muerto' };
  function buildEvents() {
    els.events.innerHTML = '';
    els.evEls = [];
    state.model.events.forEach(function (ev) {
      var e = h('div', 'ev' + (ev.key === 'end' ? ' end' : ''), EV_SHORT[ev.key] || ev.label);
      e.style.left = (100 * ev.t) + '%'; e.title = ev.label + ' · año ' + U.fmtNum(ev.t * state.model.params.years, 1);
      if (ev.t > 0.92) { e.style.transform = 'translateX(-100%)'; }
      if (ev.t < 0.05) { e.style.transform = 'translateX(0)'; }
      els.events.appendChild(e); els.evEls.push({ el: e, t: ev.t });
    });
  }
  function updateTimeline(f) {
    var p = state.model.params;
    if (document.activeElement !== els.slider) els.slider.value = Math.round(state.t * 10000);
    els.timeLabel.textContent = 'Año ' + U.fmtNum(f.years, 1) + ' de ' + U.fmtNum(p.years, 0);
    els.timeSub.textContent = 'P = ' + U.fmt(f.P, 'pressure') + ' · FR = ' + U.fmt(f.RF, 'pct') + ' · fₓ = ' + U.fmt(f.fw, 'pct') + ' · RGP = ' + U.fmt(f.R, 'gor');
    els.evEls.forEach(function (e) { e.el.classList.toggle('past', state.t >= e.t - 1e-9); });
  }

  // ---------- Fase / estado ----------
  function updatePhase(f) {
    var p = state.model.params, badge = els.badge, text = '', cls = 'badge';
    if (state.t >= 1) {
      text = state.model.endReason === 'water' ? 'Punto muerto: producción de agua' : 'Punto muerto: depletación'; cls += ' end';
    } else if (state.t <= 0) {
      text = 'Estado inicial · listo para simular';
    } else if (f.P >= p.Pb - 1e-6 && p.Pb < p.Pi) {
      text = 'Fase: expansión del líquido (subsaturado)';
    } else if (f.fw > 0.5) {
      text = 'Fase: alta producción de agua'; cls += ' inj';
    } else if (f.qwi > 0 || f.qgi > 0) {
      text = 'Fase: inyección activa'; cls += ' inj';
    } else {
      text = p.m > 0 ? 'Fase: empuje por capa de gas y gas en solución' : 'Fase: empuje por gas en solución';
    }
    els.phaseText.textContent = text; badge.className = cls;
  }
  function showEndBanner(show) {
    var b = els.endBanner;
    if (!show) { b.classList.remove('show'); return; }
    var f = state.frame, m = state.model;
    var why = m.endReason === 'water'
      ? 'El corte de agua llegó a ' + U.fmt(f.fw, 'pct') + ': producir ya no es rentable.'
      : 'Se alcanzó la presión de abandono (' + U.fmt(f.P, 'pressure') + ').';
    b.innerHTML = (m.endReason === 'water' ? '💧 Punto muerto: producción de agua' : '📉 Punto muerto: depletación') +
      '<small>' + why + ' Recobro final ' + U.fmt(f.RF, 'pct') + ' · N<sub>p</sub> = ' + U.fmt(f.Np, 'oilSTB') + (state.playing ? ' · la simulación se reinicia en unos segundos' : '') + '</small>';
    b.classList.add('show');
  }

  // ---------- Render ----------
  function render() {
    var f = state.frame = M.sample(state.model, state.t);
    T.update(f, state.model);
    updateDash(f); updatePanel(f); updateTimeline(f); updatePhase(f); refreshTip();
    showEndBanner(state.t >= 1);
  }
  function setTime(t, silent) {
    state.t = clamp(t, 0, 1);
    if (state.t < 1) state.holdUntil = 0;
    render();
    if (!silent) timeListeners.forEach(function (fn) { fn(state.t); });
  }

  // ---------- Reproducción ----------
  function loop(ts) {
    if (!state.playing) { state.raf = null; return; }
    if (state.lastTs === null) state.lastTs = ts;
    var dt = Math.min(0.1, (ts - state.lastTs) / 1000); state.lastTs = ts;
    if (state.t >= 1) {
      if (!state.holdUntil) state.holdUntil = ts + HOLD_MS;
      if (ts >= state.holdUntil) { state.holdUntil = 0; setTime(0); }
    } else {
      var nt = state.t + dt * state.speed / CYCLE_SEC;
      if (nt >= 1) { nt = 1; state.holdUntil = ts + HOLD_MS; }
      setTime(nt);
    }
    state.raf = requestAnimationFrame(loop);
  }
  function play() {
    if (state.playing) return;
    if (state.t >= 1) state.t = 0;
    state.playing = true; state.lastTs = null; state.holdUntil = 0;
    els.play.innerHTML = '❚❚ Pausar'; els.play.setAttribute('aria-pressed', 'true');
    state.raf = requestAnimationFrame(loop);
  }
  function pause() {
    state.playing = false; state.lastTs = null;
    if (state.raf) { cancelAnimationFrame(state.raf); state.raf = null; }
    els.play.innerHTML = '▶ Reproducir'; els.play.setAttribute('aria-pressed', 'false');
    render();
  }
  function toggle() { if (state.playing) pause(); else play(); }
  function restart() { setTime(0); if (!state.playing) render(); }

  // ---------- Modelo / dataset ----------
  function setModel(params, name) {
    state.model = M.build(params);
    state.datasetName = name || 'example';
    buildEvents();
    els.warns.hidden = state.model.warnings.length === 0;
    els.warns.innerHTML = state.model.warnings.length ? '⚠ ' + state.model.warnings.join('<br>⚠ ') : '';
    $('btn-example').classList.toggle('active', state.datasetName === 'example');
    $('btn-user').classList.toggle('active', state.datasetName === 'user');
    setTime(0);
    modelListeners.forEach(function (fn) { fn(state.model, state.datasetName); });
  }

  function refreshUnits() { labelDash(); render(); }

  function initFullscreen() {
    els.full.addEventListener('click', function () {
      var root = $('sim');
      if (!document.fullscreenElement) { (root.requestFullscreen || root.webkitRequestFullscreen || function () {}).call(root); }
      else { (document.exitFullscreen || document.webkitExitFullscreen || function () {}).call(document); }
    });
    document.addEventListener('fullscreenchange', function () { $('sim').style.background = document.fullscreenElement ? getComputedStyle(document.body).backgroundColor : ''; });
  }

  function init() {
    els.dash = $('dash'); els.panel = $('panel'); els.events = $('events'); els.slider = $('time-slider');
    els.timeLabel = $('time-label'); els.timeSub = $('time-sub'); els.play = $('btn-play'); els.badge = $('phase-badge');
    els.phaseText = $('phase-text'); els.endBanner = $('end-banner'); els.full = $('btn-full');
    initTooltip();
    T.build($('tank'));
    buildDash(); buildPanel();
    els.play.addEventListener('click', toggle);
    $('btn-restart').addEventListener('click', restart);
    $('speed').addEventListener('change', function (e) { state.speed = parseFloat(e.target.value) || 1; });
    els.slider.addEventListener('input', function (e) { setTime(parseInt(e.target.value, 10) / 10000); });
    initFullscreen();
    document.addEventListener('keydown', function (e) {
      if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      if (!$('tab-sim').classList.contains('active')) return;
      if (e.code === 'Space') { e.preventDefault(); toggle(); }
      else if (e.code === 'ArrowRight') setTime(state.t + 0.01);
      else if (e.code === 'ArrowLeft') setTime(state.t - 0.01);
      else if (e.code === 'Home') setTime(0);
      else if (e.code === 'End') setTime(1);
    });
    document.addEventListener('visibilitychange', function () { if (document.hidden) state.lastTs = null; });
    setModel(D.EXAMPLE, 'example');
  }

  EBM.Sim = {
    init: init, setModel: setModel, setTime: setTime, play: play, pause: pause, toggle: toggle, restart: restart,
    refreshUnits: refreshUnits, getState: function () { return state; },
    onTime: function (fn) { timeListeners.push(fn); }, onModel: function (fn) { modelListeners.push(fn); },
    valueFor: valueFor
  };
})(typeof window !== 'undefined' ? window : globalThis);
