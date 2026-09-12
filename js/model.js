/* EBM-9000 · Modelo de balance de materiales (yacimiento tipo tanque)
 *
 * Estrategia didáctica: se prescribe la declinación de presión P(t) y las relaciones
 * de producción (RGP y corte de agua); las propiedades PVT se interpolan entre los
 * valores inicial y final que da el usuario. En cada instante se calcula el vaciamiento
 * total disponible (expansión de fluidos y roca + intrusión + inyección) y se reparte
 * en producción de petróleo, gas y agua de modo que la ecuación general de Schilthuis
 * (Fanchi, ec. 2.6 / 2.8) se cumpla EXACTAMENTE en cada paso.
 * Unidades internas: campo (STB, SCF, RB, psia, 1/psi).
 */
(function (global) {
  'use strict';

  var N_FRAMES = 600;      // pasos de tiempo precalculados
  var K_PRESS = 1.7;       // forma de la curva de presión (cóncava: cae rápido al inicio)

  function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }
  function smoothstep(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function num(v, d) { v = +v; return isFinite(v) ? v : d; }

  // Normaliza y protege los parámetros (la validación fuerte se hace en el formulario).
  function normalize(q) {
    var p = {};
    p.N    = Math.max(1, num(q.N, 1e8));
    p.m    = Math.max(0, num(q.m, 0));
    p.Swio = clamp(num(q.Swio, 0.25), 0, 0.95);
    p.Swig = clamp(num(q.Swig, 0.2), 0, 0.95);
    p.cf   = Math.max(0, num(q.cf, 4e-6));
    p.cw   = Math.max(0, num(q.cw, 3e-6));
    p.co   = Math.max(0, num(q.co, 1.2e-5));
    p.Pi   = Math.max(1, num(q.Pi, 3300));
    p.Pf   = clamp(num(q.Pf, 800), 1, p.Pi * 0.999);
    p.Pb   = clamp(num(q.Pb, p.Pi), p.Pf * 1.001, p.Pi);
    p.Boi  = Math.max(0.5, num(q.Boi, 1.35));
    p.Bof  = Math.max(0.5, num(q.Bof, 1.15));
    p.Rsoi = Math.max(0, num(q.Rsoi, 650));
    p.Rsof = clamp(num(q.Rsof, 150), 0, p.Rsoi);
    p.Bgi  = Math.max(1e-6, num(q.Bgi, 0.00085));
    p.Bgf  = Math.max(p.Bgi, num(q.Bgf, 0.00375));
    p.Bwi  = Math.max(0.5, num(q.Bwi, 1.02));
    p.Wef  = Math.max(0, num(q.Wef, 0));
    p.Wif  = Math.max(0, num(q.Wif, 0));
    p.Gif  = Math.max(0, num(q.Gif, 0));
    p.tInj = clamp(num(q.tInj, 0.4), 0, 1);
    p.Rf   = Math.max(0, num(q.Rf, p.Rsoi));
    p.fwf  = clamp(num(q.fwf, 0), 0, 0.99);
    p.tBt  = clamp(num(q.tBt, 0.5), 0, 1);
    p.years = clamp(num(q.years, 25), 1, 200);
    return p;
  }

  // Presión prescrita: P(t) = Pi - (Pi - Pf)·[1 - (1 - t)^k]
  function pressureAt(p, t) {
    return p.Pi - (p.Pi - p.Pf) * (1 - Math.pow(1 - clamp(t, 0, 1), K_PRESS));
  }
  // Instante en que P(t) = Pb (0 si el petróleo ya está saturado inicialmente)
  function timeAtPb(p) {
    if (p.Pb >= p.Pi) return 0;
    var s = (p.Pi - p.Pb) / (p.Pi - p.Pf);
    return 1 - Math.pow(1 - s, 1 / K_PRESS);
  }

  // Propiedades PVT interpoladas (nivel didáctico, monótonas y consistentes en los extremos)
  function pvtAt(p, P) {
    var Pb = p.Pb;
    var Bob = p.Boi * (1 + p.co * (p.Pi - Pb));   // Bo en el punto de burbuja
    var Rso, Bo;
    if (P >= Pb) {                                 // subsaturado: sin gas libre
      Rso = p.Rsoi;
      Bo  = p.Boi * (1 + p.co * (p.Pi - P));
    } else {                                       // saturado: el gas sale de solución
      var x  = clamp((P - p.Pf) / (Pb - p.Pf), 0, 1);   // 1 en Pb, 0 en Pf
      var xs = Math.pow(x, 1.15);
      Rso = p.Rsof + (p.Rsoi - p.Rsof) * xs;
      Bo  = p.Bof + (Bob - p.Bof) * xs;
    }
    var a  = Math.log(p.Bgf / p.Bgi) / Math.log(p.Pi / p.Pf);   // Bg ~ (1/P)^a
    var Bg = p.Bgi * Math.pow(p.Pi / P, a);
    var dP = p.Pi - P;
    var Bw = p.Bwi * (1 + p.cw * dP);              // Btw ~ Bw (sin gas disuelto en el agua)
    var Bt = Bo + (p.Rsoi - Rso) * Bg;             // factor volumétrico total (bifásico)
    return { P: P, dP: dP, Bo: Bo, Rso: Rso, Bg: Bg, Bw: Bw, Bt: Bt, Bob: Bob };
  }

  // Términos de expansión por STB de petróleo original (Fanchi, ec. 2.7)
  function expansionTerms(p, pvt) {
    var Bti = p.Boi;
    var ew  = (pvt.Bw - p.Bwi) / p.Bwi;            // (Btw - Btwi)/Btwi = cw·dP
    return {
      Do:  pvt.Bt - Bti,
      Dgo: p.m * Bti * (pvt.Bg - p.Bgi) / p.Bgi,
      Dw:  Bti * p.Swio / (1 - p.Swio) * ew,
      Dgw: p.m * Bti * p.Swig / (1 - p.Swig) * ew,
      Dr:  (1 / (1 - p.Swio) + p.m / (1 - p.Swig)) * Bti * p.cf * pvt.dP
    };
  }

  function build(params) {
    var p = normalize(params);
    var n = N_FRAMES, dt = 1 / n, i, t;
    var frames = [], warnings = [];

    // Acuífero en estado estable (Schilthuis): dWe/dt = J·(Pi - P)  ->  We ~ integral de (Pi - P) dt
    var integ = new Array(n + 1); integ[0] = 0;
    for (i = 1; i <= n; i++) {
      integ[i] = integ[i - 1] + 0.5 * ((p.Pi - pressureAt(p, (i - 1) * dt)) + (p.Pi - pressureAt(p, i * dt))) * dt;
    }
    var integEnd = integ[n] > 0 ? integ[n] : 1;

    var tPb   = timeAtPb(p);
    var dtDays = p.years * 365.25 / n;
    var Gcap  = p.m * p.N * p.Boi / p.Bgi;                 // G de la capa de gas (ec. 2.9), SCF
    var PVo   = p.N * p.Boi / (1 - p.Swio);                // volumen poroso zona de petróleo, RB
    var PVg   = p.m * p.N * p.Boi / (1 - p.Swig);          // volumen poroso capa de gas, RB
    var PVi   = PVo + PVg;
    var Vwi   = p.Swio * PVo + p.Swig * PVg;               // agua connata inicial, RB

    var Np = 0, Gp = 0, Gps = 0, Gpc = 0, Wp = 0, WePrev = 0, WiPrev = 0, GiPrev = 0;
    var negSteps = 0, negGas = false, gasLimited = false;
    var max = { qo: 0, qg: 0, qw: 0, qwe: 0, qwi: 0, qgi: 0, lhs: 0, rhsGross: 0 };

    for (i = 0; i <= n; i++) {
      t = i * dt;
      var P   = pressureAt(p, t);
      var pvt = pvtAt(p, P);
      var D   = expansionTerms(p, pvt);
      var We  = p.Wef * integ[i] / integEnd;
      var ramp = (p.tInj >= 1 || t <= p.tInj) ? 0 : (t - p.tInj) / (1 - p.tInj);
      var Wi  = p.Wif * ramp, Gi = p.Gif * ramp;

      var lhsExp = p.N * (D.Do + D.Dgo + D.Dw + D.Dgw + D.Dr);
      var V = lhsExp + (We + Wi) * pvt.Bw + Gi * pvt.Bg;   // vaciamiento total disponible, RB

      // Relaciones instantáneas prescritas
      var fw  = (p.tBt >= 1) ? 0 : p.fwf * smoothstep((t - p.tBt) / (1 - p.tBt));
      var WOR = fw / (1 - fw);
      var h   = (tPb >= 1) ? 0 : smoothstep((t - tPb) / (1 - tPb));
      var R   = pvt.Rso + Math.max(0, p.Rf - p.Rsof) * h;    // RGP de producción instantánea

      var dNp = 0, dGp = 0, dWp = 0, freeAvail = 0;
      if (i > 0) {
        var unitOil = pvt.Bo - pvt.Rso * pvt.Bg;
        var already = Np * unitOil + Gp * pvt.Bg + Wp * pvt.Bw;  // lo ya producido, revaluado a P actual
        // gas libre disponible (SCF): capa de gas + gas liberado en la zona de petróleo
        var capAvail = Math.max(0, Gcap - Gpc + Gi);
        var evoAvail = Math.max(0, p.N * p.Rsoi - Gps - (p.N - Np) * pvt.Rso);
        freeAvail = capAvail + evoAvail;
        var Ruse = R;
        for (var it = 0; it < 3; it++) {           // limita la RGP si el gas libre se agota
          dNp = (V - already) / (unitOil + Ruse * pvt.Bg + WOR * pvt.Bw);
          if (dNp <= 0) break;
          var need = (Ruse - pvt.Rso) * dNp;
          if (need <= freeAvail) break;
          Ruse = pvt.Rso + freeAvail / dNp; gasLimited = true;
        }
        R = Ruse;
        if (dNp < 0) { dNp = 0; negSteps++; }
        dGp = R * dNp; dWp = WOR * dNp;
        // el gas libre producido se reparte entre la capa y el gas liberado según su volumen disponible
        var dFree = Math.max(0, R - pvt.Rso) * dNp;
        var shareCap = freeAvail > 0 ? capAvail / freeAvail : 0;
        var dGpc = Math.min(capAvail, dFree * shareCap);
        Np += dNp; Gp += dGp; Wp += dWp; Gpc += dGpc;
        Gps = Gp - Gpc;                                        // gas de origen "solución" (incluye el disuelto en Np)
      }

      var f = {
        t: t, years: t * p.years, P: P, dP: pvt.dP,
        Bo: pvt.Bo, Rso: pvt.Rso, Bg: pvt.Bg, Bw: pvt.Bw, Bt: pvt.Bt,
        Do: D.Do, Dgo: D.Dgo, Dw: D.Dw, Dgw: D.Dgw, Dr: D.Dr,
        Np: Np, Gp: Gp, Gps: Gps, Gpc: Gpc, Wp: Wp, We: We, Wi: Wi, Gi: Gi,
        R: R, fw: fw, WOR: WOR, Rp: Np > 0 ? Gp / Np : R,
        qo: dNp / dtDays, qg: dGp / dtDays, qw: dWp / dtDays,
        qwe: (We - WePrev) / dtDays, qwi: (Wi - WiPrev) / dtDays, qgi: (Gi - GiPrev) / dtDays,
        RF: Np / p.N
      };
      // Términos de la ecuación (volúmenes de yacimiento, RB)
      f.NDo = p.N * D.Do; f.NDgo = p.N * D.Dgo; f.NDw = p.N * D.Dw; f.NDgw = p.N * D.Dgw; f.NDr = p.N * D.Dr;
      f.WeBw = We * pvt.Bw; f.WiBw = Wi * pvt.Bw; f.GiBg = Gi * pvt.Bg;
      f.NpBo = Np * pvt.Bo; f.NpRsoBg = Np * pvt.Rso * pvt.Bg;
      f.GpsBg = Gps * pvt.Bg; f.GpcBgc = Gpc * pvt.Bg; f.WpBw = Wp * pvt.Bw;
      f.lhs = f.NDo + f.NDgo + f.NDw + f.NDgw + f.NDr + f.WeBw + f.WiBw + f.GiBg;
      f.rhs = f.NpBo - f.NpRsoBg + f.GpsBg + f.GpcBgc + f.WpBw;
      f.rhsGross = f.NpBo + f.GpsBg + f.GpcBgc + f.WpBw;
      f.residual = f.lhs - f.rhs;

      // Volúmenes en el tanque (RB)
      var gasCapSCF  = Gcap - Gpc + Gi;
      var evolvedSCF = p.N * p.Rsoi - Gps - (p.N - Np) * pvt.Rso;
      if (evolvedSCF < -1e-6 * p.N * p.Rsoi) negGas = true;
      f.oil = (p.N - Np) * pvt.Bo;
      f.gasCap = gasCapSCF * pvt.Bg;
      f.gasEvolved = Math.max(0, evolvedSCF) * pvt.Bg;
      f.water = Vwi * (1 + p.cw * pvt.dP) + (We + Wi - Wp) * pvt.Bw;
      f.PV = PVi * (1 - p.cf * pvt.dP);
      f.So = f.oil / f.PV; f.Sg = (f.gasCap + f.gasEvolved) / f.PV; f.Sw = f.water / f.PV;

      WePrev = We; WiPrev = Wi; GiPrev = Gi;
      if (f.qwe > max.qwe) max.qwe = f.qwe;
      if (f.qwi > max.qwi) max.qwi = f.qwi;
      if (f.qgi > max.qgi) max.qgi = f.qgi;
      if (f.qo > max.qo) max.qo = f.qo;
      if (f.qg > max.qg) max.qg = f.qg;
      if (f.qw > max.qw) max.qw = f.qw;
      if (f.lhs > max.lhs) max.lhs = f.lhs;
      if (f.rhsGross > max.rhsGross) max.rhsGross = f.rhsGross;
      frames.push(f);
    }

    var last = frames[n];
    if (negSteps > 0) warnings.push('En ' + negSteps + ' pasos la producción incremental resultó negativa y se fijó en cero; en esos instantes el balance no cierra exactamente.');
    if (last.RF > 0.7 && last.Np <= p.N) warnings.push('El factor de recobro resultante (' + Math.round(last.RF * 100) + ' %) es poco realista: la caída de presión prescrita exige más producción de la razonable. Sube la presión final o la RGP final.');
    if (last.Np > p.N) warnings.push('El petróleo producido acumulado supera el POES (N): revisa los datos de PVT y producción.');
    if (last.Wp > last.We + last.Wi + Vwi * p.cw * last.dP) warnings.push('Se produce más agua de la que aporta el acuífero y la inyección: reduce el corte de agua o aumenta We / Wi.');
    if (negGas) warnings.push('El gas en solución producido supera el gas liberado disponible en el yacimiento: reduce la RGP final.');
    if (gasLimited) warnings.push('El gas libre del yacimiento se agotó en algún instante: la RGP de producción se limitó automáticamente.');

    var events = [{ t: 0, key: 'start', label: 'Inicio de la producción' }];
    if (tPb > 0) events.push({ t: tPb, key: 'pb', label: 'Presión de burbuja: aparece gas libre' });
    if ((p.Wif > 0 || p.Gif > 0) && p.tInj < 1) events.push({ t: p.tInj, key: 'inj', label: 'Inicio de la inyección' });
    if (p.fwf > 0 && p.tBt < 1) events.push({ t: p.tBt, key: 'bt', label: 'Irrupción de agua en el productor' });
    var endReason = p.fwf >= 0.9 ? 'water' : 'depletion';
    events.push({ t: 1, key: 'end', label: endReason === 'water' ? 'Punto muerto: producción de agua' : 'Punto muerto: depletación' });

    return {
      params: p, frames: frames, n: n, events: events, warnings: warnings,
      endReason: endReason, max: max,
      derived: { G: Gcap, PVi: PVi, PVo: PVo, PVg: PVg, Vwi: Vwi, tPb: tPb, Bob: pvtAt(p, p.Pb).Bob, Bti: p.Boi }
    };
  }

  // Estado interpolado en un tiempo normalizado t en [0, 1]
  function sample(model, t) {
    t = clamp(t, 0, 1);
    var x = t * model.n, i = Math.floor(x), fr = x - i;
    if (i >= model.n) return model.frames[model.n];
    var a = model.frames[i], b = model.frames[i + 1], out = {}, k;
    for (k in a) out[k] = a[k] + (b[k] - a[k]) * fr;
    return out;
  }

  global.EBM = global.EBM || {};
  global.EBM.Model = {
    N_FRAMES: N_FRAMES, normalize: normalize, pressureAt: pressureAt, timeAtPb: timeAtPb,
    pvtAt: pvtAt, expansionTerms: expansionTerms, build: build, sample: sample
  };
})(typeof window !== 'undefined' ? window : globalThis);
