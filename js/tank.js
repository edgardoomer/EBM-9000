/* EBM-9000 · Dibujo SVG del yacimiento tipo tanque
 * Capas apiladas por VOLUMEN (condiciones de yacimiento): capa de gas / zona de petróleo
 * (con burbujas de gas liberado) / agua / roca compactada. Pozos productor e inyectores,
 * acuífero, manómetro y barras de caudal en superficie.
 */
(function (global) {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var EBM = global.EBM;
  var U = EBM.Units, C = EBM.Data.COLORS;

  var W = 900, H = 620;
  var TK = { x: 130, y: 150, w: 560, h: 435 };     // rectángulo del tanque (altura = volumen poroso inicial)
  var SURF_Y = 108;                                  // superficie del terreno
  var WELL_X = { winj: 245, prod: 410, ginj: 575 };
  var refs = {}, bubbles = [], initial = null;

  function mk(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(x, y, s, cls, attrs, parent) {
    var a = { x: x, y: y, 'class': 'lbl ' + (cls || '') };
    for (var k in (attrs || {})) a[k] = attrs[k];
    var t = mk('text', a, parent); t.textContent = s; return t;
  }
  function setAttrs(e, attrs) { for (var k in attrs) e.setAttribute(k, attrs[k]); }
  function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }

  // Posiciones pseudoaleatorias deterministas para las burbujas de gas liberado
  (function () {
    var s = 20240912;
    function rnd() { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }
    for (var i = 0; i < 110; i++) bubbles.push({ x: rnd(), y: rnd(), r: 2 + rnd() * 3.2, d: rnd() * 3 });
  })();

  function buildWell(svg, key, x, title, tip) {
    var g = mk('g', { 'data-tip': tip, 'class': 'hot' }, svg);
    var isProd = key === 'prod';
    // torre / cabezal
    if (isProd) {
      mk('polygon', { points: (x - 18) + ',' + SURF_Y + ' ' + (x + 18) + ',' + SURF_Y + ' ' + x + ',' + (SURF_Y - 62), fill: 'none', stroke: '#2B1F16', 'stroke-width': 2.5 }, g);
      mk('line', { x1: x - 11, y1: SURF_Y - 24, x2: x + 11, y2: SURF_Y - 24, stroke: '#2B1F16', 'stroke-width': 2 }, g);
      mk('line', { x1: x - 6, y1: SURF_Y - 42, x2: x + 6, y2: SURF_Y - 42, stroke: '#2B1F16', 'stroke-width': 2 }, g);
    } else {
      mk('rect', { x: x - 8, y: SURF_Y - 26, width: 16, height: 26, rx: 3, fill: '#2B1F16' }, g);
      mk('rect', { x: x - 16, y: SURF_Y - 18, width: 32, height: 6, rx: 2, fill: '#2B1F16' }, g);
      mk('circle', { cx: x, cy: SURF_Y - 30, r: 5, fill: key === 'winj' ? C.aguaOscura : C.gasDark, stroke: '#2B1F16', 'stroke-width': 1.5 }, g);
    }
    txt(x, SURF_Y - (isProd ? 70 : 42), title, 'b', { 'text-anchor': 'middle', 'font-size': 12 }, g);
    // revestimiento (casing)
    var casing = mk('line', { x1: x, y1: SURF_Y, x2: x, y2: TK.y + 40, stroke: '#3a2c20', 'stroke-width': 7, 'stroke-linecap': 'round' }, g);
    var inner = mk('line', { x1: x, y1: SURF_Y, x2: x, y2: TK.y + 40, stroke: '#d8cbbd', 'stroke-width': 3 }, g);
    var perf = mk('g', {}, g);
    for (var i = -2; i <= 2; i++) {
      mk('line', { x1: x - 9, y1: i * 7, x2: x + 9, y2: i * 7, stroke: '#2B1F16', 'stroke-width': 2, 'class': 'perf' }, perf);
    }
    var flows = mk('g', {}, g);
    var obj = { g: g, casing: casing, inner: inner, perf: perf, flows: flows, lines: [] };
    var cols = isProd ? [C.oil, C.gasDark, C.aguaOscura] : [key === 'winj' ? C.aguaOscura : C.gasDark];
    var offs = isProd ? [-6, 0, 6] : [0];
    for (var j = 0; j < cols.length; j++) {
      // productor: de abajo hacia arriba (los guiones suben); inyector: de arriba hacia abajo
      var l = mk('line', { x1: x + offs[j], y1: isProd ? TK.y + 40 : SURF_Y, x2: x + offs[j], y2: isProd ? SURF_Y - 62 : TK.y + 40, stroke: cols[j], 'stroke-width': 3, 'class': 'flow', opacity: 0 }, flows);
      obj.lines.push(l);
    }
    obj.label = txt(x + 14, TK.y + 40, '', 'w', { 'font-size': 11, style: 'paint-order:stroke;stroke:rgba(43,31,22,.85);stroke-width:3px;font-weight:600' }, g);
    return obj;
  }

  function buildGauge(svg) {
    var cx = 66, cy = 78, r = 46;
    var g = mk('g', { 'data-tip': 'gauge', 'class': 'hot' }, svg);
    mk('circle', { cx: cx, cy: cy, r: r + 4, fill: '#2B1F16' }, g);
    mk('circle', { cx: cx, cy: cy, r: r, fill: '#FCF8F2' }, g);
    // arco de color: verde (alta P) a rojo (baja P), recorriendo de -135° a +135°
    for (var a = -135; a < 135; a += 9) {
      var t = (a + 135) / 270;    // 0 = baja presión, 1 = alta
      var col = t < 0.33 ? '#c0392b' : (t < 0.66 ? '#d9a94a' : '#2E7D4F');
      var a1 = (a - 90) * Math.PI / 180, a2 = (a + 8 - 90) * Math.PI / 180;
      mk('path', { d: 'M' + (cx + (r - 4) * Math.cos(a1)) + ',' + (cy + (r - 4) * Math.sin(a1)) + ' A' + (r - 4) + ',' + (r - 4) + ' 0 0 1 ' + (cx + (r - 4) * Math.cos(a2)) + ',' + (cy + (r - 4) * Math.sin(a2)), stroke: col, 'stroke-width': 7, fill: 'none' }, g);
    }
    refs.needle = mk('line', { x1: cx, y1: cy, x2: cx, y2: cy - (r - 12), stroke: '#2B1F16', 'stroke-width': 3, 'stroke-linecap': 'round', 'class': 'gauge-needle' }, g);
    mk('circle', { cx: cx, cy: cy, r: 5, fill: '#2B1F16' }, g);
    refs.gaugeVal = txt(cx, cy + 74, '', 'b', { 'text-anchor': 'middle', 'font-size': 13 }, g);
    refs.gaugeSub = txt(cx, cy + 90, '', 'muted', { 'text-anchor': 'middle' }, g);
    txt(cx, cy + 30, 'P', 'b', { 'text-anchor': 'middle', 'font-size': 12 }, g);
    refs.gaugeCx = cx; refs.gaugeCy = cy;
  }

  function buildLayerLabel(svg, tip) {
    var g = mk('g', { 'data-tip': tip, 'class': 'hot' }, svg);
    var bg = mk('rect', { x: TK.x + TK.w + 12, y: 0, width: 190, height: 40, rx: 8, fill: 'rgba(252,248,242,.92)', stroke: C.botones, 'stroke-width': 1 }, g);
    var t1 = txt(TK.x + TK.w + 22, 0, '', 'b', { 'font-size': 12 }, g);
    var t2 = txt(TK.x + TK.w + 22, 0, '', '', { 'font-size': 12 }, g);
    var pointer = mk('line', { x1: TK.x + TK.w + 2, y1: 0, x2: TK.x + TK.w + 12, y2: 0, stroke: C.botones, 'stroke-width': 1.5 }, g);
    return { g: g, bg: bg, t1: t1, t2: t2, pointer: pointer };
  }

  function build(svg) {
    svg.innerHTML = '';
    refs = {};
    var defs = mk('defs', {}, svg);
    var pr = mk('pattern', { id: 'p-rock', width: 10, height: 10, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
    mk('rect', { width: 10, height: 10, fill: '#B8A48F' }, pr);
    mk('line', { x1: 0, y1: 0, x2: 0, y2: 10, stroke: '#7d6a56', 'stroke-width': 3 }, pr);
    var pg = mk('pattern', { id: 'p-gas', width: 18, height: 18, patternUnits: 'userSpaceOnUse' }, defs);
    mk('circle', { cx: 5, cy: 5, r: 1.8, fill: 'rgba(255,255,255,.6)' }, pg);
    mk('circle', { cx: 13, cy: 13, r: 1.2, fill: 'rgba(255,255,255,.5)' }, pg);
    var grd = mk('linearGradient', { id: 'g-sky', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    mk('stop', { offset: 0, 'stop-color': '#EEF3F8' }, grd);
    mk('stop', { offset: 1, 'stop-color': '#F7F1E8' }, grd);

    // Cielo, superficie y sobrecarga
    mk('rect', { x: 0, y: 0, width: W, height: SURF_Y, fill: 'url(#g-sky)' }, svg);
    mk('rect', { x: 0, y: SURF_Y, width: W, height: H - SURF_Y, fill: '#DCCAB4' }, svg);
    mk('line', { x1: 0, y1: SURF_Y, x2: W, y2: SURF_Y, stroke: '#7d6a56', 'stroke-width': 2.5 }, svg);
    for (var i = 0; i < 6; i++) {   // estratos decorativos
      mk('line', { x1: 0, y1: SURF_Y + 14 + i * 7, x2: W, y2: SURF_Y + 12 + i * 7, stroke: 'rgba(125,106,86,.25)', 'stroke-width': 1 }, svg);
    }
    txt(W - 12, 22, 'EBM-9000 · yacimiento como tanque', 'b', { 'text-anchor': 'end', 'font-size': 14, fill: C.botones }, svg);
    refs.timeTxt = txt(W - 12, 42, '', 'muted', { 'text-anchor': 'end', 'font-size': 12 }, svg);

    // Acuífero
    refs.aquifer = mk('g', { 'data-tip': 'aquifer', 'class': 'hot' }, svg);
    mk('rect', { x: TK.x - 34, y: TK.y + TK.h + 4, width: TK.w + 68, height: 28, rx: 9, fill: C.agua, stroke: C.aguaOscura, 'stroke-width': 1.5 }, refs.aquifer);
    refs.aqTxt = txt(TK.x + TK.w / 2, TK.y + TK.h + 23, 'ACUÍFERO', 'b', { 'text-anchor': 'middle', 'font-size': 12, fill: C.botones }, refs.aquifer);
    refs.aqArrows = [];
    for (i = 0; i < 6; i++) {
      var ax = TK.x + 45 + i * (TK.w - 90) / 5;
      refs.aqArrows.push(mk('line', { x1: ax, y1: TK.y + TK.h + 16, x2: ax, y2: TK.y + TK.h - 26, stroke: C.aguaOscura, 'stroke-width': 4, 'class': 'flow', opacity: 0, 'stroke-linecap': 'round' }, refs.aquifer));
    }

    // Tanque
    mk('rect', { x: TK.x - 7, y: TK.y - 7, width: TK.w + 14, height: TK.h + 14, rx: 14, fill: '#5e4b3a' }, svg);
    refs.layerGas = mk('rect', { x: TK.x, y: TK.y, width: TK.w, height: 0, fill: C.gas, 'data-tip': 'layerGas', 'class': 'hot' }, svg);
    refs.layerGasPat = mk('rect', { x: TK.x, y: TK.y, width: TK.w, height: 0, fill: 'url(#p-gas)', 'pointer-events': 'none' }, svg);
    refs.layerOil = mk('rect', { x: TK.x, y: TK.y, width: TK.w, height: 0, fill: C.oil, 'data-tip': 'layerOil', 'class': 'hot' }, svg);
    refs.bubbleG = mk('g', { 'pointer-events': 'none' }, svg);
    refs.bubbleEls = bubbles.map(function (b) { return mk('circle', { r: b.r, fill: '#F3E2A9', opacity: 0, style: 'animation-delay:' + b.d.toFixed(2) + 's' }, refs.bubbleG); });
    refs.layerWater = mk('rect', { x: TK.x, y: TK.y, width: TK.w, height: 0, fill: C.agua, 'data-tip': 'layerWater', 'class': 'hot' }, svg);
    refs.layerRock = mk('rect', { x: TK.x, y: TK.y, width: TK.w, height: 0, fill: 'url(#p-rock)', 'data-tip': 'layerRock', 'class': 'hot' }, svg);
    // contactos iniciales
    refs.goc0 = mk('line', { x1: TK.x, x2: TK.x + TK.w, stroke: '#2B1F16', 'stroke-dasharray': '7 5', 'stroke-width': 1.6, opacity: .75, 'data-tip': 'goc0', 'class': 'hot' }, svg);
    refs.woc0 = mk('line', { x1: TK.x, x2: TK.x + TK.w, stroke: '#1F3B5C', 'stroke-dasharray': '7 5', 'stroke-width': 1.6, opacity: .8, 'data-tip': 'woc0', 'class': 'hot' }, svg);
    refs.goc0Lbl = txt(TK.x + 8, 0, 'CGP inicial', 'muted', { 'pointer-events': 'none' }, svg);
    refs.woc0Lbl = txt(TK.x + 8, 0, 'CAP inicial', 'muted', { 'pointer-events': 'none', fill: '#1F3B5C' }, svg);

    // Etiquetas de capas (columna derecha)
    refs.lblGas = buildLayerLabel(svg, 'layerGas');
    refs.lblOil = buildLayerLabel(svg, 'layerOil');
    refs.lblEvo = buildLayerLabel(svg, 'layerEvolved');
    refs.lblWat = buildLayerLabel(svg, 'layerWater');
    refs.lblRock = buildLayerLabel(svg, 'layerRock');

    // Pozos
    refs.wProd = buildWell(svg, 'prod', WELL_X.prod, 'Productor', 'wellProd');
    refs.wWinj = buildWell(svg, 'winj', WELL_X.winj, 'Inyector de agua', 'wellWinj');
    refs.wGinj = buildWell(svg, 'ginj', WELL_X.ginj, 'Inyector de gas', 'wellGinj');

    // Barras de caudal en superficie (junto al productor)
    refs.rateG = mk('g', {}, svg);
    var rx = WELL_X.prod + 42, keys = ['qo', 'qg', 'qw'], cols = [C.oil, C.gasDark, C.aguaOscura], names = ['petróleo', 'gas', 'agua'];
    refs.rateBars = {}; refs.rateVals = {};
    txt(rx, SURF_Y - 86, 'Caudales de producción', 'b', { 'font-size': 11.5 }, refs.rateG);
    for (i = 0; i < 3; i++) {
      var g = mk('g', { 'data-tip': keys[i], 'class': 'hot' }, refs.rateG);
      mk('rect', { x: rx + i * 40, y: SURF_Y - 78, width: 26, height: 74, rx: 4, fill: 'rgba(43,31,22,.07)' }, g);
      refs.rateBars[keys[i]] = mk('rect', { x: rx + i * 40, y: SURF_Y - 4, width: 26, height: 0, rx: 4, fill: cols[i] }, g);
      txt(rx + i * 40 + 13, SURF_Y + 14, names[i], 'muted', { 'text-anchor': 'middle', 'font-size': 10.5 }, g);
      refs.rateVals[keys[i]] = txt(rx + i * 40 + 13, SURF_Y - 82 + 0, '', 'muted', { 'text-anchor': 'middle', 'font-size': 10, opacity: 0 }, g);
    }

    buildGauge(svg);

    // Leyenda de colores (abajo a la izquierda, sobre el suelo)
    var lg = mk('g', {}, svg);
    var items = [['Gas', C.gas], ['Petróleo', C.oil], ['Agua', C.agua], ['Roca', '#B8A48F']];
    for (i = 0; i < items.length; i++) {
      mk('rect', { x: 14, y: 250 + i * 22, width: 14, height: 14, rx: 3, fill: items[i][1], stroke: 'rgba(0,0,0,.25)' }, lg);
      txt(34, 262 + i * 22, items[i][0], '', { 'font-size': 12 }, lg);
    }
    txt(14, 238, 'Leyenda', 'b', { 'font-size': 12 }, lg);
    refs.satTxt = [txt(14, 380, '', 'muted', {}, lg), txt(14, 396, '', 'muted', {}, lg), txt(14, 412, '', 'muted', {}, lg)];
    txt(14, 362, 'Saturaciones medias', 'b', { 'font-size': 12 }, lg);
  }

  // Coloca etiquetas evitando solapamientos verticales
  function spreadLabels(items, minGap, top, bottom) {
    items.sort(function (a, b) { return a.y - b.y; });
    var i;
    for (i = 1; i < items.length; i++) if (items[i].y < items[i - 1].y + minGap) items[i].y = items[i - 1].y + minGap;
    if (items.length && items[items.length - 1].y > bottom) items[items.length - 1].y = bottom;
    for (i = items.length - 2; i >= 0; i--) if (items[i].y > items[i + 1].y - minGap) items[i].y = items[i + 1].y - minGap;
    for (i = 0; i < items.length; i++) if (items[i].y < top) items[i].y = top;
  }
  function placeLabel(lbl, y, line1, line2, show, srcY) {
    if (!show) { lbl.g.setAttribute('visibility', 'hidden'); return; }
    lbl.g.removeAttribute('visibility');
    var h = line2 ? 40 : 26;
    setAttrs(lbl.bg, { y: y - h / 2, height: h });
    setAttrs(lbl.t1, { y: y - h / 2 + 16 }); lbl.t1.textContent = line1;
    setAttrs(lbl.t2, { y: y - h / 2 + 32 }); lbl.t2.textContent = line2 || '';
    setAttrs(lbl.pointer, { y1: srcY, y2: y });
  }

  function update(f, model) {
    if (!refs.layerGas) return;
    var scale = TK.h / model.derived.PVi;
    var hGas = Math.max(0, f.gasCap) * scale;
    var hOil = Math.max(0, f.oil + f.gasEvolved) * scale;
    var hWat = Math.max(0, f.water) * scale;
    var hRock = clamp(TK.h - hGas - hOil - hWat, 0, TK.h);
    var yOil = TK.y + hGas, yWat = yOil + hOil, yRock = yWat + hWat;

    setAttrs(refs.layerGas, { height: hGas });
    setAttrs(refs.layerGasPat, { height: hGas });
    setAttrs(refs.layerOil, { y: yOil, height: hOil });
    setAttrs(refs.layerWater, { y: yWat, height: hWat });
    setAttrs(refs.layerRock, { y: yRock, height: hRock });

    // burbujas de gas liberado en la zona de petróleo
    var frac = f.gasEvolved / Math.max(1, f.oil + f.gasEvolved);
    var nb = hOil > 16 ? Math.min(bubbles.length, Math.round(frac * 260)) : 0;
    for (var i = 0; i < bubbles.length; i++) {
      var b = bubbles[i], e = refs.bubbleEls[i];
      if (i < nb) {
        setAttrs(e, { cx: TK.x + 10 + b.x * (TK.w - 20), cy: yOil + 10 + b.y * Math.max(1, hOil - 20), opacity: .85 });
      } else if (e.getAttribute('opacity') !== '0') { e.setAttribute('opacity', 0); }
    }

    // contactos iniciales
    var f0 = model.frames[0];
    var yG0 = TK.y + f0.gasCap * scale, yW0 = TK.y + TK.h - f0.water * scale;
    setAttrs(refs.goc0, { y1: yG0, y2: yG0 }); setAttrs(refs.woc0, { y1: yW0, y2: yW0 });
    refs.goc0Lbl.setAttribute('y', yG0 - 5); refs.woc0Lbl.setAttribute('y', yW0 + 14);
    if (f0.gasCap <= 0) { refs.goc0.setAttribute('visibility', 'hidden'); refs.goc0Lbl.setAttribute('visibility', 'hidden'); }
    else { refs.goc0.removeAttribute('visibility'); refs.goc0Lbl.removeAttribute('visibility'); }

    // etiquetas de capas
    var items = [
      { lbl: refs.lblGas, y: TK.y + hGas / 2, l1: 'Capa de gas', l2: U.fmt(f.gasCap, 'resRB'), show: f.gasCap > 0 || model.params.m > 0 },
      { lbl: refs.lblOil, y: yOil + hOil / 2 - (f.gasEvolved > 0 ? 12 : 0), l1: 'Petróleo remanente', l2: U.fmt(f.oil, 'resRB') + ' · So ' + U.fmt(f.So, 'pct'), show: true },
      { lbl: refs.lblEvo, y: yOil + hOil / 2 + 26, l1: 'Gas liberado en la zona', l2: U.fmt(f.gasEvolved, 'resRB'), show: f.gasEvolved > 0 },
      { lbl: refs.lblWat, y: yWat + hWat / 2, l1: 'Agua (connata + neta)', l2: U.fmt(f.water, 'resRB') + ' · Sw ' + U.fmt(f.Sw, 'pct'), show: true },
      { lbl: refs.lblRock, y: yRock + hRock / 2, l1: 'Compactación de la roca', l2: U.fmt(f.NDr, 'resRB'), show: f.NDr > 0 }
    ].filter(function (it) { return it.show; });
    var src = items.map(function (it) { return it.y; });
    spreadLabels(items, 44, TK.y + 22, TK.y + TK.h - 22);
    [refs.lblGas, refs.lblOil, refs.lblEvo, refs.lblWat, refs.lblRock].forEach(function (l) { l.g.setAttribute('visibility', 'hidden'); });
    items.forEach(function (it, k) { placeLabel(it.lbl, it.y, it.l1, it.l2, true, src[k]); });

    // pozos
    var p = model.params;
    var yPerfProd = hOil > 12 ? yOil + hOil / 2 : yWat - 6;
    setWell(refs.wProd, yPerfProd, [f.qo / (model.max.qo || 1), f.qg / (model.max.qg || 1), f.qw / (model.max.qw || 1)], true,
      f.qo > 0 ? 'fw ' + U.fmt(f.fw, 'pct') + ' · RGP ' + U.fmt(f.R, 'gor') : '');
    var showW = p.Wif > 0, showG = p.Gif > 0;
    refs.wWinj.g.setAttribute('visibility', showW ? 'visible' : 'hidden');
    refs.wGinj.g.setAttribute('visibility', showG ? 'visible' : 'hidden');
    if (showW) setWell(refs.wWinj, yWat + Math.max(8, hWat * 0.6), [f.qwi / (model.max.qwi || 1)], f.qwi > 0, f.qwi > 0 ? U.fmt(f.qwi, 'rateLiq') : 'sin inyectar');
    if (showG) setWell(refs.wGinj, TK.y + Math.max(8, hGas * 0.5), [f.qgi / (model.max.qgi || 1)], f.qgi > 0, f.qgi > 0 ? U.fmt(f.qgi, 'rateGas') : 'sin inyectar');

    // acuífero
    var aq = model.max.qwe > 0 ? f.qwe / model.max.qwe : 0;
    refs.aqArrows.forEach(function (a) { a.setAttribute('opacity', aq > 0.01 ? 0.25 + 0.75 * aq : 0); });
    refs.aqTxt.textContent = p.Wef > 0 ? 'ACUÍFERO · ' + U.fmt(f.qwe, 'rateLiq') + ' · We ' + U.fmt(f.We, 'oilSTB') : 'SIN ACUÍFERO ACTIVO';

    // barras de caudal
    ['qo', 'qg', 'qw'].forEach(function (k) {
      var r = f[k] / (model.max[k] || 1), h = 72 * clamp(r, 0, 1);
      setAttrs(refs.rateBars[k], { y: SURF_Y - 4 - h, height: h });
      refs.rateVals[k].textContent = U.fmt(f[k], k === 'qg' ? 'rateGas' : 'rateLiq', { noUnit: true });
      setAttrs(refs.rateVals[k], { y: SURF_Y - 8 - h, opacity: f[k] > 0 ? 1 : 0 });
    });

    // manómetro
    var fr = clamp(f.P / p.Pi, 0, 1), ang = -135 + 270 * fr;
    refs.needle.setAttribute('transform', 'rotate(' + ang.toFixed(2) + ' ' + refs.gaugeCx + ' ' + refs.gaugeCy + ')');
    refs.gaugeVal.textContent = U.fmt(f.P, 'pressure');
    refs.gaugeSub.textContent = 'ΔP = ' + U.fmt(f.dP, 'pressure');

    refs.timeTxt.textContent = 'Año ' + U.fmtNum(f.years, 1) + ' de ' + U.fmtNum(p.years, 0) + ' · FR ' + U.fmt(f.RF, 'pct');
    refs.satTxt[0].textContent = 'So ' + U.fmt(f.So, 'pct');
    refs.satTxt[1].textContent = 'Sg ' + U.fmt(f.Sg, 'pct');
    refs.satTxt[2].textContent = 'Sw ' + U.fmt(f.Sw, 'pct');
  }

  function setWell(w, yPerf, ratios, active, label) {
    setAttrs(w.casing, { y2: yPerf + 16 }); setAttrs(w.inner, { y2: yPerf + 14 });
    w.perf.setAttribute('transform', 'translate(0,' + yPerf + ')');
    w.lines.forEach(function (l, i) {
      var r = clamp(ratios[i] || 0, 0, 1);
      var isProd = w.lines.length === 3;
      if (isProd) setAttrs(l, { y1: yPerf }); else setAttrs(l, { y2: yPerf });
      setAttrs(l, { opacity: active && r > 0.005 ? 0.35 + 0.65 * r : 0, 'stroke-width': 2 + 3 * r });
    });
    setAttrs(w.label, { y: yPerf + 4 }); w.label.textContent = label || '';
  }

  EBM.Tank = { build: build, update: update, TK: TK };
})(typeof window !== 'undefined' ? window : globalThis);
