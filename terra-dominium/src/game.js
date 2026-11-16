'use strict';
(() => {
  // =====================================================================
  //  DATA
  // =====================================================================
  const D = window.TD_DATA, TOPO = window.TD_TOPO;
  const C = D.c, N = C.length;
  const KEYS = ['sol','res','tank','afv','art','mlrs','ftr','bmb','heli','cv','amph','dd','ff','cor','ss','nuk'];
  const LAND = ['sol','tank','afv','art','mlrs'];
  const AIR = ['ftr','bmb','heli'];
  const SEA = ['cv','amph','dd','ff','cor','ss'];
  const BUYABLE = [...LAND, ...AIR, ...SEA];

  // w = combat weight, cost = Mrd. US-$ per unit (soldiers: per 1.000)
  const U = {
    sol:  { n: 'Aktive Soldaten',            w: 1,    cost: 0.06 },
    res:  { n: 'Reservisten',                w: 0.25 },
    tank: { n: 'Kampfpanzer',                w: 0.15, cost: 0.009 },
    afv:  { n: 'Schützen-/Transportpanzer',  w: 0.04, cost: 0.004 },
    art:  { n: 'Rohrartillerie',             w: 0.06, cost: 0.005 },
    mlrs: { n: 'Raketenartillerie',          w: 0.12, cost: 0.007 },
    ftr:  { n: 'Kampfflugzeuge',             w: 1,    cost: 0.09 },
    bmb:  { n: 'Strategische Bomber',        w: 3,    cost: 0.45 },
    heli: { n: 'Kampfhubschrauber',          w: 0.6,  cost: 0.04 },
    cv:   { n: 'Flugzeugträger',             w: 60,   cost: 13 },
    amph: { n: 'Amphibische Angriffsschiffe',w: 8,    cost: 1.5 },
    dd:   { n: 'Zerstörer & Kreuzer',        w: 12,   cost: 2.2 },
    ff:   { n: 'Fregatten',                  w: 7,    cost: 0.9 },
    cor:  { n: 'Korvetten & OPV',            w: 2.5,  cost: 0.35 },
    ss:   { n: 'U-Boote',                    w: 8,    cost: 2.0 },
    nuk:  { n: 'Atomsprengköpfe',            w: 0 },
  };
  C.forEach(c => { c.mil = {}; KEYS.forEach((k, i) => { c.mil[k] = c.m[i]; }); });

  const DIST = (() => {
    const b = atob(D.dist); const u = new Uint16Array(b.length / 2);
    for (let i = 0; i < u.length; i++) u[i] = b.charCodeAt(2 * i) | (b.charCodeAt(2 * i + 1) << 8);
    return u;
  })();
  const dist = (a, b) => DIST[a * N + b] * 10;
  const NB = D.nb.map(a => new Set(a));

  // =====================================================================
  //  HELPERS
  // =====================================================================
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const nf0 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
  const nf1 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });
  const fmt = n => (Math.abs(n) < 10 && n % 1 !== 0 ? nf1 : nf0).format(n);
  const money = n => (n >= 100 ? nf0 : nf1).format(n) + ' Mrd $';
  const priceStr = n => n >= 1 ? money(n) : nf0.format(n * 1000) + ' Mio $';
  const fmtUnit = (k, v) => k === 'sol' || k === 'res' ? nf0.format(Math.round(v * 1000)) : nf0.format(Math.round(v));
  const pct = x => nf0.format(x) + ' %';
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const q = t => Math.pow(t, 1.5);
  const sumW = (m, keys) => keys.reduce((s, k) => s + (m[k] || 0) * U[k].w, 0);
  const landP = (m, t) => sumW(m, LAND) * q(t);
  const airP = (m, t) => sumW(m, AIR) * q(t);
  const seaRaw = m => sumW(m, SEA);
  const seaP = (m, t) => seaRaw(m) * q(t);
  const strength = (m, t) => landP(m, t) + airP(m, t) * 0.8 + seaP(m, t) * 0.25 + (m.res || 0) * 0.1 * q(t);
  const zero = () => Object.fromEntries(KEYS.map(k => [k, 0]));
  const scaleM = (m, f, keys = KEYS) => { const o = zero(); keys.forEach(k => { o[k] = (m[k] || 0) * f; }); return o; };
  const roundUnit = (k, v) => (k === 'sol' || k === 'res') ? Math.round(v * 10) / 10 : Math.round(v);
  const dateStr = t => new Date(2026, t, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const WORLD_POP = C.reduce((s, c) => s + c.pop, 0);

  // Ranking by initial military strength
  const RANK = C.map((c, i) => ({ i, s: strength(c.mil, c.t) })).sort((a, b) => b.s - a.s);
  const rankOf = new Array(N); RANK.forEach((r, idx) => { rankOf[r.i] = idx + 1; });
  const diffOf = i => { const r = rankOf[i]; return r <= 5 ? 1 : r <= 20 ? 2 : r <= 60 ? 3 : r <= 120 ? 4 : 5; };
  const DIFF = ['', 'Leicht', 'Mittel', 'Schwer', 'Sehr schwer', 'Legendär'];

  // =====================================================================
  //  STATE
  // =====================================================================
  const SAVE_KEY = 'terra-dominium-v1';
  let S = null;

  function newGame(p) {
    S = { v: 1, turn: 0, P: p, owner: C.map((_, i) => i), pools: {}, used: zero(), money: Math.max(0.05, C[p].bud * 0.25),
      econ: 1, queue: [], prog: {}, tension: 0, log: [], over: false, won: false };
    C.forEach((c, i) => { S.pools[i] = { m: { ...c.mil }, t: c.t }; });
    log('info', `Du übernimmst das Oberkommando von ${C[p].n}. Ziel: die Welt.`);
  }
  const save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ } };
  const loadSave = () => { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); return s && s.v === 1 && s.owner && s.owner.length === N ? s : null; } catch (e) { return null; } };
  const clearSave = () => { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } };
  function log(type, text, rep) { S.log.unshift({ type, text, turn: S.turn, rep: rep || null }); if (S.log.length > 160) S.log.length = 160; }

  const terrOf = o => { const r = []; for (let i = 0; i < N; i++) if (S.owner[i] === o) r.push(i); return r; };
  const budEff = t => Math.max(C[t].bud, C[t].gdp * 0.004, 0.002);
  const ownerBud = o => terrOf(o).reduce((s, t) => s + budEff(t), 0);
  const deployShare = (o, t) => { const ts = terrOf(o); if (ts.length <= 1) return 1; return Math.min(1, 0.35 + 0.65 * budEff(t) / ownerBud(o)); };
  const ownerName = o => o === S.P ? `Reich ${C[S.P].n}` : (terrOf(o).length > 1 ? `Block ${C[o].n}` : C[o].n);
  const avail = () => { const m = S.pools[S.P].m, o = zero(); KEYS.forEach(k => { o[k] = Math.max(0, (m[k] || 0) - (S.used[k] || 0)); }); return o; };
  const income = () => {
    const ts = terrOf(S.P);
    const base = ts.reduce((s, t) => s + C[t].bud, 0) * S.econ / 12;
    const cap = ts.reduce((s, t) => s + C[t].gdp, 0) * 0.22 / 12;
    return Math.max(0.01, Math.min(base, cap));
  };

  function seaRange(o) {
    const m = S.pools[o].m; const raw = seaRaw(m);
    if (raw <= 0) return 0;
    return Math.min(9000, 400 + 60 * Math.sqrt(raw) + 1500 * Math.min(3, m.cv || 0));
  }
  function airRange(o) {
    const m = S.pools[o].m;
    if ((m.ftr || 0) + (m.bmb || 0) + (m.heli || 0) <= 0) return 0;
    return 1100 + ((m.bmb || 0) > 0 ? 5000 : 0) + ((m.cv || 0) > 0 ? 1500 : 0);
  }
  function route(o, t) {
    if (S.owner[t] === o) return null;
    const ts = terrOf(o);
    for (const i of ts) if (NB[i].has(t)) return { type: 'land', from: i, d: 0 };
    let md = Infinity, from = -1;
    for (const i of ts) { const d = dist(i, t); if (d < md) { md = d; from = i; } }
    if (md <= 60) return { type: 'strait', from, d: md };
    if (md <= seaRange(o)) return { type: 'sea', from, d: md };
    return { type: 'none', from, d: md };
  }
  const minDist = (o, t) => { let md = Infinity; for (const i of terrOf(o)) { if (NB[i].has(t)) return 0; md = Math.min(md, dist(i, t)); } return md; };
  const ROUTE_TXT = { land: 'Landgrenze', strait: 'Meerenge', sea: 'Seeweg / amphibische Landung' };

  // =====================================================================
  //  COMBAT
  // =====================================================================
  function addLoss(into, src, keys, frac) {
    keys.forEach(k => {
      const v = (src[k] || 0) * clamp(frac * (k === 'sol' || k === 'res' ? 0.6 : 1), 0, 0.95);
      into[k] += roundUnit(k, v);
    });
  }
  const landingCap = m => (m.amph || 0) * 3 + (m.cv || 0) * 2 + ((m.dd || 0) + (m.ff || 0)) * 0.3 + (m.cor || 0) * 0.1 + 2;

  function battle(att, tgt, commit, rtype, dry) {
    const def = S.owner[tgt], Dp = S.pools[def], c = C[tgt];
    const dm = scaleM(Dp.m, deployShare(def, tgt));
    const tA = S.pools[att].t, tD = Dp.t;
    const r = (a, b) => dry ? (a + b) / 2 : a + (b - a) * Math.random();
    const rep = { kind: 'invade', att, def, tgt, rtype, commit: { ...commit }, lossA: zero(), lossD: zero(), phases: [], landCap: 1 };
    let repulsed = false, landCap = 1;

    if (rtype !== 'land') {
      const aN = seaP(commit, tA), dN = seaP(dm, tD) * 1.1;
      if (dN > 0) {
        const ra = aN * r(0.8, 1.2), rd = dN * r(0.8, 1.2);
        const sh = ra + rd > 0 ? ra / (ra + rd) : 0;
        addLoss(rep.lossA, commit, SEA, 0.35 * (1 - sh) * r(0.7, 1.3));
        addLoss(rep.lossD, dm, SEA, 0.35 * sh * r(0.7, 1.3));
        const win = ra > rd;
        rep.phases.push({ k: 'sea', a: aN, d: dN, sh, win });
        if (!win) { if (rtype === 'sea') repulsed = true; else landCap *= 0.5; }
      } else {
        rep.phases.push({ k: 'sea', a: aN, d: 0, sh: 1, win: true });
      }
      const cap = landingCap(commit) + (rtype === 'strait' ? 40 : 0);
      landCap *= Math.min(1, cap / Math.max(1, commit.sol || 0));
      rep.cap = cap;
    }
    rep.landCap = landCap;

    if (repulsed) { rep.ratio = 0; rep.gain = 0; rep.repulsed = true; return rep; }

    const aA = airP(commit, tA), aD = airP(dm, tD);
    const ra = aA * r(0.85, 1.15), rd = aD * r(0.85, 1.15);
    const sh = ra + rd > 0 ? ra / (ra + rd) : 0.5;
    addLoss(rep.lossA, commit, AIR, 0.18 * (1 - sh) * r(0.7, 1.3));
    addLoss(rep.lossD, dm, AIR, 0.18 * sh * r(0.7, 1.3));
    rep.phases.push({ k: 'air', a: aA, d: aD, sh, win: sh > 0.5 });
    const mA = 0.6 + 0.8 * sh, mD = 0.6 + 0.8 * (1 - sh);

    const atk = landP(commit, tA) * landCap * mA * r(0.85, 1.15);
    const militia = c.pop * 0.4;
    const defv = (landP(dm, tD) + (dm.res || 0) * U.res.w * q(tD) + militia) * c.ter * 1.15 * mD * r(0.85, 1.15);
    const tot = atk + defv || 1;
    const ratio = atk / Math.max(0.01, defv);
    addLoss(rep.lossA, commit, LAND, 0.3 * (defv / tot) * r(0.7, 1.3));
    addLoss(rep.lossD, dm, [...LAND, 'res'], 0.3 * (atk / tot) * r(0.7, 1.3));
    rep.phases.push({ k: 'land', a: atk, d: defv, sh: atk / tot, win: ratio > 1 });
    rep.ratio = ratio;
    rep.gain = ratio > 0.6 ? Math.min(100, (ratio - 0.6) * 55) : 0;
    return rep;
  }

  function airStrike(att, tgt, commit, dry) {
    const def = S.owner[tgt], Dp = S.pools[def];
    const dm = scaleM(Dp.m, deployShare(def, tgt));
    const tA = S.pools[att].t, tD = Dp.t;
    const r = (a, b) => dry ? (a + b) / 2 : a + (b - a) * Math.random();
    const rep = { kind: 'air', att, def, tgt, commit: { ...commit }, lossA: zero(), lossD: zero(), phases: [] };
    const aA = airP(commit, tA);
    const aD = airP(dm, tD) * 1.3 + landP(dm, tD) * 0.04; // fighters + ground-based air defence
    const ra = aA * r(0.85, 1.15), rd = aD * r(0.85, 1.15);
    const sh = ra + rd > 0 ? ra / (ra + rd) : 0;
    addLoss(rep.lossA, commit, AIR, 0.16 * (1 - sh) * r(0.7, 1.3));
    addLoss(rep.lossD, dm, AIR, 0.14 * sh * r(0.7, 1.3));
    addLoss(rep.lossD, dm, ['tank', 'afv', 'art', 'mlrs'], 0.09 * sh * r(0.7, 1.3));
    addLoss(rep.lossD, dm, SEA, 0.05 * sh * r(0.5, 1.5));
    rep.phases.push({ k: 'air', a: aA, d: aD, sh, win: sh > 0.5 });
    rep.ratio = sh / Math.max(0.01, 1 - sh);
    rep.gain = 14 * sh;
    return rep;
  }

  function subLoss(m, loss) { KEYS.forEach(k => { m[k] = Math.max(0, roundUnit(k, (m[k] || 0) - (loss[k] || 0))); }); }

  function applyBattle(rep) {
    const { att, def, tgt } = rep;
    const A = S.pools[att], Dp = S.pools[def];
    subLoss(A.m, rep.lossA);
    subLoss(Dp.m, rep.lossD);
    if (att === S.P) KEYS.forEach(k => { S.used[k] = (S.used[k] || 0) + (rep.commit[k] || 0) - (rep.lossA[k] || 0); });
    let p = S.prog[tgt];
    if (!p || p.by !== att) p = S.prog[tgt] = { by: att, v: 0, t: S.turn };
    p.v = Math.min(100, p.v + rep.gain); p.t = S.turn;
    rep.progress = p.v;

    if (rep.kind === 'invade' && (Dp.m.nuk || 0) > 0 && p.v >= 60 && p.v < 100 && Math.random() < 0.3) {
      rep.nuke = true;
      const extra = zero(); addLoss(extra, rep.commit, LAND, 0.2); subLoss(A.m, extra);
      KEYS.forEach(k => { rep.lossA[k] += extra[k]; });
      p.v = Math.max(0, p.v - 45); rep.progress = p.v;
      if (att === S.P) S.tension += 3;
    }
    if (p.v >= 100) { rep.captured = conquer(att, tgt); rep.conquered = true; }
    return rep;
  }

  function conquer(att, tgt) {
    const prev = S.owner[tgt], Pp = S.pools[prev];
    const ts = terrOf(prev);
    let removed;
    if (ts.length <= 1) { removed = { ...Pp.m }; }
    else {
      const s = Math.min(0.6, 0.5 * budEff(tgt) / ownerBud(prev) + 0.08);
      removed = scaleM(Pp.m, s);
      KEYS.forEach(k => { if (k !== 'nuk') Pp.m[k] = roundUnit(k, Pp.m[k] - removed[k]); });
    }
    S.owner[tgt] = att;
    delete S.prog[tgt];
    if (ts.length <= 1) {
      delete S.pools[prev];
      Object.keys(S.prog).forEach(k => { if (S.prog[k].by === prev) delete S.prog[k]; });
    }
    const A = S.pools[att];
    const conv = Math.min(1.5, q(Pp.t) / q(A.t));
    const cap = zero();
    BUYABLE.forEach(k => { cap[k] = roundUnit(k, (removed[k] || 0) * (k === 'sol' ? 0.1 : 0.2) * conv); A.m[k] = roundUnit(k, (A.m[k] || 0) + cap[k]); });
    if (att === S.P) S.tension += 1;
    return cap;
  }

  // =====================================================================
  //  TURN
  // =====================================================================
  function endTurn() {
    if (S.over) return;
    const events = [];
    const P = S.P;
    // deliveries
    if (S.queue.length) {
      const m = S.pools[P].m; const parts = [];
      S.queue.forEach(o => { m[o.k] = roundUnit(o.k, (m[o.k] || 0) + o.n); parts.push(`${fmtUnit(o.k, o.n)} ${U[o.k].n}`); });
      events.push({ type: 'good', text: `Lieferung eingetroffen: ${parts.join(', ')}.` });
      S.queue = [];
    }
    // income
    const inc = income(); S.money += inc;
    // AI
    aiTurn(events);
    // rebellions in occupied territories
    const mine = terrOf(P);
    const garrisonLow = (S.pools[P].m.sol || 0) < 25 * mine.length;
    for (const t of mine) {
      if (t === P) continue;
      const pr = 0.004 * S.econ * S.econ + (garrisonLow ? 0.02 : 0) + (S.econ >= 3 ? 0.01 : 0);
      if (Math.random() < pr) {
        S.owner[t] = t;
        S.pools[t] = { m: scaleM(C[t].mil, 0.35), t: C[t].t };
        S.pools[t].m.nuk = 0;
        delete S.prog[t];
        events.push({ type: 'bad', text: `Aufstand in ${C[t].n}! Das Land erklärt sich unabhängig.${garrisonLow ? ' (Zu wenige Soldaten für die Besatzung.)' : ''}` });
      }
    }
    // regeneration
    const owners = new Set(S.owner);
    owners.forEach(o => {
      const pool = S.pools[o]; if (!pool) return;
      const target = zero();
      terrOf(o).forEach(t => KEYS.forEach(k => { target[k] += C[t].mil[k]; }));
      const keys = o === P ? ['sol', 'res'] : KEYS.filter(k => k !== 'nuk');
      keys.forEach(k => { if (pool.m[k] < target[k]) pool.m[k] = roundUnit(k, pool.m[k] + (target[k] - pool.m[k]) * (o === P ? 0.03 : 0.04)); });
    });
    // war progress decays when not pressed
    Object.keys(S.prog).forEach(k => { const p = S.prog[k]; if (p.t < S.turn) { p.v -= 10; if (p.v <= 0) delete S.prog[k]; } });

    S.turn++;
    S.used = zero();
    events.forEach(e => log(e.type, e.text, e.rep));
    const left = terrOf(P).length;
    if (left === 0) { S.over = true; log('bad', 'Dein Reich ist gefallen.'); }
    else if (left === N) { S.over = true; S.won = true; log('good', 'Die ganze Welt steht unter deiner Kontrolle.'); }
    save();
    renderAll();
    showTurnSummary(events, inc);
  }

  function aiTurn(events) {
    const P = S.P;
    const owners = shuffle([...new Set(S.owner)].filter(o => o !== P));
    const pPlayer = Math.min(0.15, 0.008 + S.tension * 0.006);
    let count = 0;
    for (const o of owners) {
      if (count >= 7) break;
      const pool = S.pools[o]; if (!pool) continue;
      const roll = Math.random();
      if (roll > 0.025 + pPlayer) continue;
      const cands = [];
      for (let t = 0; t < N; t++) {
        if (S.owner[t] === o) continue;
        const rt = route(o, t); if (!rt || rt.type === 'none') continue;
        cands.push({ t, rt, isP: S.owner[t] === P });
      }
      if (!cands.length) continue;
      let pick;
      const pc = cands.filter(c => c.isP);
      if (pc.length && roll < pPlayer) pick = pc[Math.floor(Math.random() * pc.length)];
      else {
        const others = cands.filter(c => !c.isP);
        if (!others.length) continue;
        others.forEach(c => { const d = S.pools[S.owner[c.t]]; c.s = strength(scaleM(d.m, deployShare(S.owner[c.t], c.t)), d.t) * C[c.t].ter; });
        others.sort((a, b) => a.s - b.s);
        pick = others[Math.floor(Math.random() * Math.min(3, others.length))];
      }
      const commit = scaleM(pool.m, 0.7, BUYABLE);
      const est = battle(o, pick.t, commit, pick.rt.type, true);
      if (est.ratio < (pick.isP ? 1.0 : 1.3)) continue;
      count++;
      const prevOwner = S.owner[pick.t];
      const rep = applyBattle(battle(o, pick.t, commit, pick.rt.type, false));
      if (pick.isP) {
        events.push({ type: 'bad', text: rep.conquered
          ? `${C[o].n} hat ${C[pick.t].n} von dir erobert!`
          : `${C[o].n} greift dein Territorium ${C[pick.t].n} an – Kriegsfortschritt des Gegners ${pct(rep.progress)}.`, rep });
      } else if (rep.conquered) {
        events.push({ type: 'info', text: `${ownerName(o)} erobert ${C[pick.t].n}${prevOwner !== pick.t ? ` (bisher ${ownerName(prevOwner)})` : ''}.` });
      } else if (rep.gain > 0) {
        events.push({ type: 'info', text: `${C[o].n} greift ${C[pick.t].n} an (${pct(rep.progress)}).` });
      }
    }
  }

  // =====================================================================
  //  MAP
  // =====================================================================
  const W = 1600, H = 820;
  const svg = d3.select('#map');
  const root = svg.append('g');
  const feats = topojson.feature(TOPO, TOPO.objects.c).features;
  const proj = d3.geoNaturalEarth1().fitExtent([[8, 8], [W - 8, H - 8]], { type: 'FeatureCollection', features: feats });
  const path = d3.geoPath(proj);
  root.append('path').attr('class', 'sphere').attr('d', path({ type: 'Sphere' })).attr('fill', 'none');
  root.append('path').attr('class', 'grat').attr('d', path(d3.geoGraticule10()));

  // main polygon per country (largest projected area) for centroid / zoom
  const MAIN = C.map(() => ({ a: -1, poly: null, total: 0 }));
  feats.forEach(f => {
    const g = f.geometry; if (!g) return;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    polys.forEach(coords => {
      const poly = { type: 'Polygon', coordinates: coords };
      const a = path.area(poly);
      MAIN[f.id].total += a;
      if (a > MAIN[f.id].a) { MAIN[f.id].a = a; MAIN[f.id].poly = poly; }
    });
  });
  MAIN.forEach(m => { if (m.poly) { m.c = path.centroid(m.poly); m.b = path.bounds(m.poly); } else { m.c = [W / 2, H / 2]; m.b = [[0, 0], [W, H]]; } });

  const gC = root.append('g');
  const paths = gC.selectAll('path').data(feats).join('path')
    .attr('class', 'c').attr('d', path)
    .on('click', (e, f) => { e.stopPropagation(); select(f.id); })
    .on('pointermove', (e, f) => showTip(e, f.id))
    .on('pointerleave', hideTip);
  const tiny = C.map((_, i) => i).filter(i => MAIN[i].total < 6);
  const gM = root.append('g');
  const marks = gM.selectAll('circle').data(tiny).join('circle')
    .attr('class', 'mk').attr('cx', i => MAIN[i].c[0]).attr('cy', i => MAIN[i].c[1])
    .on('click', (e, i) => { e.stopPropagation(); select(i); })
    .on('pointermove', (e, i) => showTip(e, i))
    .on('pointerleave', hideTip);
  const gL = root.append('g');

  let K = 1, baseK = 1;
  const zoom = d3.zoom().on('zoom', e => {
    root.attr('transform', e.transform);
    K = e.transform.k;
    marks.attr('r', 4 / K);
    gL.selectAll('text').attr('font-size', 13 / K);
  });
  svg.call(zoom).on('click', () => select(null));

  function fitZoom() {
    const el = svg.node(); const w = el.clientWidth || W, h = el.clientHeight || H;
    baseK = Math.min(w / W, h / H);
    zoom.extent([[0, 0], [w, h]]).scaleExtent([baseK, baseK * 60]).translateExtent([[-40, -40], [W + 40, H + 40]]);
  }
  function zoomTo(i, maxK = 7, dur = 750) {
    const el = svg.node(); const w = el.clientWidth || W, h = el.clientHeight || H;
    const b = MAIN[i].b; const dx = Math.max(20, b[1][0] - b[0][0]), dy = Math.max(20, b[1][1] - b[0][1]);
    const narrow = w < 860;
    const vh = narrow ? h * 0.5 : h; // leave room for bottom sheet on phones
    const vw = narrow ? w : w - 390;
    const k = Math.min(baseK * maxK, 0.55 / Math.max(dx / vw, dy / vh));
    const cx = (b[0][0] + b[1][0]) / 2, cy = (b[0][1] + b[1][1]) / 2;
    const tx = vw / 2 - k * cx, ty = vh / 2 - k * cy;
    svg.transition().duration(dur).call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(k));
  }
  function homeZoom() {
    const el = svg.node(); const w = el.clientWidth || W, h = el.clientHeight || H;
    const k = Math.max(w / W, h / H);
    svg.call(zoom.transform, d3.zoomIdentity.translate((w - W * k) / 2, (h - H * k) / 2).scale(k));
  }

  const hue = i => (i * 137.508) % 360;
  const colorOf = o => {
    if (S && o === S.P) return 'var(--gold)';
    return `hsl(${hue(o).toFixed(0)} ${22 + (o % 3) * 5}% ${30 + (o % 5) * 3.2}%)`;
  };

  let sel = null;
  let attackable = new Set(), seaOnly = new Set();
  function computeAttackable() {
    attackable = new Set(); seaOnly = new Set();
    if (!S || S.over) return;
    for (let t = 0; t < N; t++) { const r = route(S.P, t); if (r && r.type !== 'none') (r.type === 'sea' ? seaOnly : attackable).add(t); }
  }
  function paint() {
    const own = i => S ? S.owner[i] : i;
    paths.attr('fill', f => colorOf(own(f.id)))
      .classed('tgt', f => attackable.has(f.id))
      .classed('tgts', f => seaOnly.has(f.id))
      .classed('war', f => !!(S && S.prog[f.id]))
      .classed('sel', f => f.id === sel);
    marks.attr('fill', i => colorOf(own(i))).classed('sel', i => i === sel).classed('tgt', i => attackable.has(i) || seaOnly.has(i));
    paths.filter(f => f.id === sel).raise();
    // empire labels: show biggest blocks
    const labels = [];
    if (S) {
      const owners = new Map();
      S.owner.forEach((o, t) => { if (!owners.has(o)) owners.set(o, []); owners.get(o).push(t); });
      owners.forEach((ts, o) => { if (ts.length > 1 || o === S.P) labels.push({ o, t: o !== undefined && S.owner[o] === o ? o : ts[0], n: ts.length }); });
    }
    gL.selectAll('text').data(labels, d => d.o).join('text').attr('class', 'lbl')
      .attr('x', d => MAIN[d.t].c[0]).attr('y', d => MAIN[d.t].c[1])
      .attr('font-size', 13 / K)
      .text(d => d.o === S.P ? `▲ ${C[S.P].n}` : `${C[d.o].n} (${d.n})`);
  }

  const tip = $('#tip');
  function showTip(e, i) {
    if (e.pointerType === 'touch') return;
    const rect = $('#stage').getBoundingClientRect();
    const o = S ? S.owner[i] : i;
    tip.innerHTML = `<b>${esc(C[i].n)}</b>${o !== i ? `<div class="o">besetzt von ${esc(ownerName(o))}</div>` : ''}${S && S.prog[i] ? `<div class="o">Kriegsfortschritt ${pct(S.prog[i].v)}</div>` : ''}`;
    tip.hidden = false;
    let x = e.clientX - rect.left + 14, y = e.clientY - rect.top + 14;
    if (x + tip.offsetWidth > rect.width - 8) x = e.clientX - rect.left - tip.offsetWidth - 14;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  function hideTip() { tip.hidden = true; }

  // =====================================================================
  //  UI – panel
  // =====================================================================
  const panel = $('#panel');
  function select(i) {
    sel = i;
    paint();
    if (i == null) { panel.classList.remove('open'); return; }
    renderPanel();
    panel.classList.add('open');
    panel.scrollTop = 0;
  }

  function milTable(m, opts = {}) {
    const groups = [
      ['Heer', ['sol', 'res', 'tank', 'afv', 'art', 'mlrs']],
      ['Luftwaffe', ['ftr', 'bmb', 'heli']],
      ['Marine', ['cv', 'amph', 'dd', 'ff', 'cor', 'ss']],
      ['Strategisch', ['nuk']],
    ];
    let h = '<table class="mil"><tbody>';
    groups.forEach(([g, ks]) => {
      h += `<tr class="grp"><td colspan="${opts.extra ? 3 : 2}">${g}</td></tr>`;
      ks.forEach(k => {
        const v = m[k] || 0;
        h += `<tr class="${v <= 0 ? 'zero' : ''}"><td>${U[k].n}</td><td class="n">${fmtUnit(k, v)}</td>${opts.extra ? `<td class="d">${opts.extra(k)}</td>` : ''}</tr>`;
      });
    });
    return h + '</tbody></table>';
  }
  const powerBox = (m, t) => `<div class="power">
      <div><div class="k">Boden</div><div class="v">${fmt(landP(m, t))}</div></div>
      <div><div class="k">Luft</div><div class="v">${fmt(airP(m, t))}</div></div>
      <div><div class="k">See</div><div class="v">${fmt(seaP(m, t))}</div></div></div>`;

  function renderPanel() {
    const i = sel; if (i == null) return;
    const c = C[i], o = S ? S.owner[i] : i;
    const pool = S ? S.pools[o] : { m: c.mil, t: c.t };
    const mine = S && o === S.P;
    const occupied = o !== i;
    const chips = [];
    if (mine) chips.push(`<span class="chip me">${i === S.P ? 'Heimatland' : 'Dein Territorium'}</span>`);
    else if (occupied) chips.push(`<span class="chip hostile">Besetzt von ${esc(ownerName(o))}</span>`);
    chips.push(`<span class="chip">Rang #${rankOf[i]} weltweit</span>`);
    if (c.mil.nuk > 0) chips.push(`<span class="chip nuke">Atommacht</span>`);
    if (c.ter > 1.15) chips.push(`<span class="chip">Schweres Gelände</span>`);
    const terPct = Math.round((c.ter - 1) * 100);
    let h = `<button class="p-close" type="button" aria-label="Schließen" data-act="close">×</button>
      <div class="eyebrow">Länderdossier</div>
      <div class="p-title">${esc(c.n)}</div>
      <div class="chips">${chips.join('')}</div>
      <div class="kv">
        <div><div class="k">Bevölkerung</div><div class="v">${nf1.format(c.pop)} Mio.</div></div>
        <div><div class="k">BIP</div><div class="v">${money(c.gdp)}</div></div>
        <div><div class="k">Militärbudget</div><div class="v">${money(c.bud)}</div></div>
        <div><div class="k">Gelände-Bonus</div><div class="v">${terPct > 0 ? '+' + terPct + ' % Verteid.' : 'keiner'}</div></div>
      </div>`;

    if (S && !mine) {
      const p = S.prog[i];
      if (p) h += `<h3 class="sec">Kriegsfortschritt <small>${p.by === S.P ? 'deine Offensive' : 'durch ' + esc(ownerName(p.by))}</small></h3><div class="bar"><i style="width:${p.v}%"></i></div><div class="note" style="margin-top:4px">${pct(p.v)} – bei 100 % kapituliert das Land.</div>`;
      const r = route(S.P, i);
      const ar = airRange(S.P), md = minDist(S.P, i);
      h += `<h3 class="sec">Operation</h3>`;
      if (S.over) h += `<div class="note">Das Spiel ist beendet.</div>`;
      else {
        if (r.type !== 'none') h += `<div class="route">Angriffsweg: <b>${ROUTE_TXT[r.type]}</b> von ${esc(C[r.from].n)}${r.d ? ` · ${nf0.format(r.d)} km` : ''}</div>`;
        else h += `<div class="route">Außer Reichweite für eine Invasion (${nf0.format(r.d)} km, Seereichweite deiner Marine ${nf0.format(seaRange(S.P))} km).</div>`;
        h += `<div class="actions">
          <button class="btn danger" type="button" data-act="invade" ${r.type === 'none' ? 'disabled' : ''}>Invasion planen</button>
          <button class="btn" type="button" data-act="air" ${md > ar ? 'disabled' : ''}>Luftschlag</button></div>`;
        if (md > ar) h += `<div class="note" style="margin-top:6px">Luftschlag außer Reichweite (${nf0.format(ar)} km). Bomber oder Flugzeugträger erhöhen die Reichweite.</div>`;
      }
    } else if (S && mine) {
      const p = S.prog[i];
      if (p) h += `<h3 class="sec">Feindliche Offensive <small>${esc(ownerName(p.by))}</small></h3><div class="bar"><i style="width:${p.v}%"></i></div><div class="note warn" style="margin-top:4px">${pct(p.v)} – bei 100 % verlierst du dieses Gebiet.</div>`;
    }

    const occNote = occupied || (S && terrOf(o).length > 1) ? `Gesamtkräfte von ${esc(ownerName(o))}` : (S && S.turn > 0 ? 'aktueller Stand' : 'Stand 2024/25');
    h += `<h3 class="sec">Streitkräfte <small>${occNote}</small></h3>${powerBox(pool.m, pool.t)}
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin:10px 0 4px"><span>Technologiestand</span><span>${Math.round(pool.t * 100)}/100</span></div>
      <div class="bar tech"><i style="width:${pool.t * 100}%"></i></div>
      ${milTable(pool.m)}
      <h3 class="sec">Hauptwaffensysteme <small>${esc(c.n)}</small></h3>
      <div class="systems">${esc(c.s)}</div>`;
    panel.innerHTML = h;
  }

  panel.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act;
    if (a === 'close') select(null);
    else if (a === 'invade') openAttack(sel, 'invade');
    else if (a === 'air') openAttack(sel, 'air');
  });

  // =====================================================================
  //  UI – modal
  // =====================================================================
  const modal = $('#modal'), modalBody = $('#modalBody');
  let onModalClose = null;
  function openModal(html, onClose) { modalBody.innerHTML = html; modal.hidden = false; modal.scrollTop = 0; onModalClose = onClose || null; }
  function closeModal() { modal.hidden = true; modalBody.innerHTML = ''; const f = onModalClose; onModalClose = null; if (f) f(); }
  $('#modalX').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

  function oddsLabel(ratio, kind) {
    if (kind === 'air') return ratio > 2 ? ['Luftüberlegenheit', 4] : ratio > 1 ? ['Vorteil', 3] : ratio > 0.5 ? ['Verlustreich', 2] : ['Selbstmordkommando', 1];
    return ratio >= 2.4 ? ['Erdrückend – sofortige Kapitulation möglich', 4] : ratio >= 1.4 ? ['Überlegen', 3] : ratio >= 0.9 ? ['Ausgeglichen', 2] : ['Sehr riskant', 1];
  }

  function openAttack(t, kind) {
    const r = route(S.P, t);
    const av = avail();
    const st = { land: kind === 'invade' ? 60 : 0, air: 70, sea: kind === 'invade' && r.type !== 'land' ? 70 : 0 };
    const branches = kind === 'invade'
      ? [['land', 'Heer', LAND], ['air', 'Luftwaffe', AIR], ['sea', 'Marine', SEA]]
      : [['air', 'Luftwaffe', AIR]];
    const mk = () => {
      const commit = zero();
      branches.forEach(([b, , ks]) => ks.forEach(k => { commit[k] = roundUnit(k, av[k] * st[b] / 100); }));
      return commit;
    };
    const render = () => {
      const commit = mk();
      const est = kind === 'invade' ? battle(S.P, t, commit, r.type, true) : airStrike(S.P, t, commit, true);
      const [lbl, cls] = est.repulsed ? ['Seeschlacht verloren – Landung unmöglich', 1] : oddsLabel(est.ratio, kind);
      const brHtml = branches.map(([b, name, ks]) => `
        <div class="branch">
          <div class="branch-h"><span>${name}</span><output>${st[b]} %</output></div>
          <input type="range" min="0" max="100" step="5" value="${st[b]}" data-b="${b}" aria-label="${name} Einsatzstärke">
          <div class="units">${ks.filter(k => av[k] > 0).map(k => `${U[k].n}: ${fmtUnit(k, commit[k])}`).join(' · ') || 'Keine verfügbaren Einheiten'}</div>
        </div>`).join('');
      let extra = '';
      if (kind === 'invade' && r.type !== 'land') {
        const cap = landingCap(commit) + (r.type === 'strait' ? 40 : 0);
        extra = `<div class="note ${est.landCap < 0.99 ? 'warn' : ''}">Landekapazität: ca. ${nf0.format(cap * 1000)} Soldaten${est.landCap < 0.99 ? ` – nur ${pct(est.landCap * 100)} der Bodentruppen kommen an Land. Mehr amphibische Schiffe einsetzen.` : '.'}</div>`;
      }
      const d = S.pools[S.owner[t]];
      modalBody.querySelector('#atkDyn').innerHTML = `${brHtml}${extra}
        <div class="odds o${cls}"><div><div class="eyebrow">Lagebeurteilung</div><div class="big">${lbl}</div></div>
          <div class="note" style="margin-left:auto;text-align:right">${kind === 'invade' ? `Kräfteverhältnis Boden ${nf1.format(est.ratio)} : 1<br>erwarteter Fortschritt +${pct(est.gain)}` : `Erwarteter Fortschritt +${pct(est.gain)}`}</div></div>
        ${(d.m.nuk || 0) > 0 && kind === 'invade' ? '<div class="note warn">Achtung: Atommacht. Ab 60 % Kriegsfortschritt droht nukleare Eskalation, die deine Offensive zurückwirft.</div>' : ''}`;
      modalBody.querySelectorAll('input[type=range]').forEach(inp => inp.addEventListener('input', () => { st[inp.dataset.b] = +inp.value; render(); }));
    };
    const def = S.owner[t];
    openModal(`<div class="eyebrow">${kind === 'invade' ? 'Operationsplanung · ' + ROUTE_TXT[r.type] : 'Luftoperation'}</div>
      <h2>${kind === 'invade' ? 'Invasion' : 'Luftschlag gegen'} ${esc(C[t].n)}</h2>
      <p class="sub">Verteidiger: ${esc(ownerName(def))} · Technologie ${Math.round(S.pools[def].t * 100)}/100 vs. deine ${Math.round(S.pools[S.P].t * 100)}/100. Bereits in dieser Runde eingesetzte Einheiten stehen nicht zur Verfügung.</p>
      <div id="atkDyn"></div>
      <div class="actions" style="justify-content:flex-end"><button class="btn ghost" type="button" id="atkCancel">Abbrechen</button><button class="btn danger" type="button" id="atkGo">${kind === 'invade' ? 'Angriff befehlen' : 'Luftschlag befehlen'}</button></div>`);
    render();
    $('#atkCancel').addEventListener('click', closeModal);
    $('#atkGo').addEventListener('click', () => {
      const commit = mk();
      if (BUYABLE.every(k => !commit[k])) return;
      const rep = applyBattle(kind === 'invade' ? battle(S.P, t, commit, r.type, false) : airStrike(S.P, t, commit, false));
      log(rep.conquered ? 'good' : (rep.gain > 0 ? 'info' : 'bad'),
        rep.conquered ? `${C[t].n} kapituliert und gehört nun zu deinem Reich.` : `${kind === 'invade' ? 'Angriff' : 'Luftschlag'} auf ${C[t].n}: Fortschritt ${pct(rep.progress)}.`, rep);
      checkEnd();
      save();
      renderAll();
      showReport(rep);
    });
  }

  function checkEnd() {
    const n = terrOf(S.P).length;
    if (n === N) { S.over = true; S.won = true; }
  }

  function lossTable(loss, commitOrSrc) {
    const ks = KEYS.filter(k => loss[k] > 0);
    if (!ks.length) return '<div class="note">Keine nennenswerten Verluste.</div>';
    return `<table class="mil"><tbody>${ks.map(k => `<tr><td>${U[k].n}</td><td class="n">−${fmtUnit(k, loss[k])}</td></tr>`).join('')}</tbody></table>`;
  }

  function showReport(rep) {
    const PH = { sea: 'Seeschlacht', air: 'Luftkampf', land: 'Bodenkampf' };
    const attN = ownerName(rep.att), defN = ownerName(rep.def);
    const phases = rep.phases.map(p => {
      const a = Math.max(0.0001, p.a), d = Math.max(0.0001, p.d), s = a / (a + d) * 100;
      return `<div class="phase"><div class="ph">${PH[p.k]}</div><div class="vs" title="${fmt(p.a)} gegen ${fmt(p.d)}"><i style="width:${s}%"></i><i style="width:${100 - s}%"></i></div>
        <div class="res ${p.win ? 'win' : 'lose'}">${p.win ? 'Angreifer siegt' : 'Verteidiger hält'} · ${fmt(p.a)} : ${fmt(p.d)}</div></div>`;
    }).join('');
    let outcome, cls;
    if (rep.conquered) { outcome = `${C[rep.tgt].n} kapituliert.`; cls = rep.att === S.P ? 'win' : 'lose'; }
    else if (rep.repulsed) { outcome = 'Die Landung wurde auf See abgewehrt.'; cls = rep.att === S.P ? 'lose' : 'win'; }
    else if (rep.gain > 0) { outcome = `Vorstoß gelungen: Kriegsfortschritt ${pct(rep.progress)}.`; cls = 'mid'; }
    else { outcome = 'Der Angriff ist gescheitert.'; cls = rep.att === S.P ? 'lose' : 'win'; }
    let capHtml = '';
    if (rep.captured) {
      const ks = BUYABLE.filter(k => rep.captured[k] > 0);
      if (ks.length) capHtml = `<h3 class="sec">Erbeutet <small>übernommen in die Streitkräfte von ${esc(attN)}</small></h3><div class="note">${ks.map(k => `${fmtUnit(k, rep.captured[k])} ${U[k].n}`).join(' · ')}</div>`;
    }
    openModal(`<div class="eyebrow">Gefechtsbericht · ${dateStr(S.turn)}</div>
      <h2>${rep.kind === 'air' ? 'Luftschlag' : 'Schlacht'} um ${esc(C[rep.tgt].n)}</h2>
      <p class="sub">${esc(attN)} (gelb) gegen ${esc(defN)} (rot)${rep.rtype && rep.rtype !== 'land' ? ' · ' + ROUTE_TXT[rep.rtype] : ''}</p>
      ${phases}
      ${rep.landCap < 0.99 && !rep.repulsed ? `<div class="note warn" style="margin-top:8px">Nur ${pct(rep.landCap * 100)} der Bodentruppen konnten anlanden.</div>` : ''}
      ${rep.nuke ? `<div class="note warn" style="margin-top:8px"><b>Nukleare Eskalation:</b> ${esc(defN)} hat mit dem Einsatz von Atomwaffen gedroht und taktische Schläge gegen Aufmarschgebiete geführt. Die Offensive wurde zurückgeworfen.</div>` : ''}
      <div class="outcome ${cls}">${outcome}</div>
      ${!rep.conquered ? `<div class="bar"><i style="width:${rep.progress || 0}%"></i></div>` : ''}
      <div class="loss2">
        <div><h3 class="sec">Verluste ${esc(attN)}</h3>${lossTable(rep.lossA)}</div>
        <div><h3 class="sec">Verluste ${esc(defN)}</h3>${lossTable(rep.lossD)}</div>
      </div>
      ${capHtml}
      <div class="actions" style="justify-content:flex-end;margin-top:16px"><button class="btn primary" type="button" id="repOk">Weiter</button></div>`,
      () => { if (S.over) showEnd(); });
    $('#repOk').addEventListener('click', closeModal);
  }

  function showTurnSummary(events, inc) {
    const mine = events.length ? events : [{ type: 'info', text: 'Ruhiger Monat an allen Fronten.' }];
    const TAG = { good: 'Meldung', bad: 'Alarm', info: 'Welt' };
    openModal(`<div class="eyebrow">Lagebericht</div><h2>${dateStr(S.turn)}</h2>
      <p class="sub">Einnahmen: +${money(inc)} · Kasse: ${money(S.money)} · Spannung der Weltmächte: ${tensionTxt()}</p>
      <div>${mine.map((e, idx) => `<div class="ev ${e.type}"><span class="tag2">${TAG[e.type]}</span><span class="txt">${esc(e.text)}${e.rep ? ` <button class="btn sm ghost" type="button" data-rep="${idx}">Bericht</button>` : ''}</span></div>`).join('')}</div>
      <div class="actions" style="justify-content:flex-end;margin-top:16px"><button class="btn primary" type="button" id="sumOk">Weiter</button></div>`,
      () => { if (S.over) showEnd(); });
    $('#sumOk').addEventListener('click', closeModal);
    modalBody.querySelectorAll('[data-rep]').forEach(b => b.addEventListener('click', () => { const rep = mine[+b.dataset.rep].rep; onModalClose = null; showReport(rep); }));
  }
  const tensionTxt = () => S.tension < 3 ? 'gering' : S.tension < 10 ? 'erhöht' : S.tension < 20 ? 'hoch' : 'extrem – Koalitionen bilden sich';

  function showLog() {
    const TAG = { good: 'Meldung', bad: 'Alarm', info: 'Welt' };
    openModal(`<div class="eyebrow">Kriegstagebuch</div><h2>Lagebericht</h2>
      <div>${S.log.map((e, idx) => `<div class="ev ${e.type}"><span class="tag2">${dateStr(e.turn).replace(/ \d{4}$/, '')}</span><span class="txt">${esc(e.text)}${e.rep ? ` <button class="btn sm ghost" type="button" data-rep="${idx}">Bericht</button>` : ''}</span></div>`).join('')}</div>
      <div class="actions" style="justify-content:space-between;margin-top:16px"><button class="btn ghost" type="button" id="newGame">Neues Spiel</button><button class="btn primary" type="button" id="logOk">Schließen</button></div>`);
    $('#logOk').addEventListener('click', closeModal);
    $('#newGame').addEventListener('click', () => { clearSave(); S = null; closeModal(); select(null); showStart(); });
    modalBody.querySelectorAll('[data-rep]').forEach(b => b.addEventListener('click', () => showReport(S.log[+b.dataset.rep].rep)));
  }

  function showEnd() {
    openModal(`<div class="eyebrow">${dateStr(S.turn)}</div>
      <h2>${S.won ? 'Weltherrschaft erreicht' : 'Dein Reich ist gefallen'}</h2>
      <p class="sub">${S.won ? `Von ${esc(C[S.P].n)} aus hast du in ${S.turn} Monaten alle ${N} Länder unter deine Kontrolle gebracht.` : `Nach ${S.turn} Monaten ist das letzte Territorium verloren.`}</p>
      <div class="actions" style="justify-content:flex-end"><button class="btn primary" type="button" id="endNew">Neues Spiel</button></div>`);
    $('#endNew').addEventListener('click', () => { clearSave(); S = null; closeModal(); select(null); showStart(); });
  }

  // ---------- Forces / shop ----------
  function showForces() {
    const P = S.P, pool = S.pools[P], av = avail();
    const queued = zero(); S.queue.forEach(o => { queued[o.k] += o.n; });
    const modCost = Math.max(0.3, ownerBud(P) * 0.06);
    const shopRows = BUYABLE.map(k => `<div class="srow"><div class="nm">${U[k].n}<div class="note">${k === 'sol' ? '1.000 Soldaten' : 'je Stück'}: ${priceStr(U[k].cost)}</div></div>
      <div class="num">${fmtUnit(k, pool.m[k])}${queued[k] ? `<div class="note">+${fmtUnit(k, queued[k])} bestellt</div>` : ''}</div>
      <div class="num av">${fmtUnit(k, av[k])}</div>
      <div class="buy">${[1, 10, 100].map(n => `<button class="btn" type="button" data-buy="${k}" data-n="${n}" ${S.money < U[k].cost * n ? 'disabled' : ''}>+${k === 'sol' ? fmtUnit('sol', n) : n}</button>`).join('')}</div></div>`).join('');
    const ECON = [[1, 'Friedensetat'], [1.5, 'Aufrüstung'], [2, 'Kriegswirtschaft'], [3, 'Totaler Krieg']];
    openModal(`<div class="eyebrow">Oberkommando · ${dateStr(S.turn)}</div><h2>Streitkräfte ${esc(ownerName(P))}</h2>
      <p class="sub">Kasse <b>${money(S.money)}</b> · Einnahmen ${money(income())}/Monat · Bestellungen werden zur nächsten Runde geliefert.</p>
      ${powerBox(pool.m, pool.t)}
      <h3 class="sec">Rüstungsetat <small>höher = mehr Geld, aber mehr Aufstände</small></h3>
      <div class="econ">${ECON.map(([v, l]) => `<button class="btn sm" type="button" data-econ="${v}" aria-pressed="${S.econ === v}">${l} ×${nf1.format(v)}</button>`).join('')}</div>
      <h3 class="sec">Modernisierung <small>Technologie ${Math.round(pool.t * 100)}/100</small></h3>
      <div class="actions" style="align-items:center"><button class="btn" type="button" id="modBtn" ${S.money < modCost || pool.t >= 1 ? 'disabled' : ''}>+2 Technologie für ${money(modCost)}</button><span class="note">Besseres Gerät multipliziert die Kampfkraft aller Einheiten.</span></div>
      <h3 class="sec">Beschaffung <small>Bestand · verfügbar diese Runde</small></h3>
      <div class="shop">${shopRows}
        <div class="srow"><div class="nm">Reservisten<div class="note">nur zur Verteidigung, füllen sich langsam auf</div></div><div class="num">${fmtUnit('res', pool.m.res)}</div></div>
        <div class="srow"><div class="nm">Atomsprengköpfe<div class="note">Abschreckung, nicht beschaffbar</div></div><div class="num">${fmtUnit('nuk', pool.m.nuk)}</div></div></div>
      <div class="actions" style="justify-content:flex-end;margin-top:14px"><button class="btn primary" type="button" id="frcOk">Fertig</button></div>`);
    $('#frcOk').addEventListener('click', closeModal);
    modalBody.querySelectorAll('[data-buy]').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.buy, n = +b.dataset.n, cost = U[k].cost * n;
      if (S.money < cost) return;
      S.money -= cost;
      const ex = S.queue.find(o => o.k === k); if (ex) ex.n += n; else S.queue.push({ k, n });
      save(); renderHud(); showForces();
    }));
    modalBody.querySelectorAll('[data-econ]').forEach(b => b.addEventListener('click', () => { S.econ = +b.dataset.econ; save(); renderHud(); showForces(); }));
    $('#modBtn').addEventListener('click', () => {
      if (S.money < modCost) return;
      S.money -= modCost; pool.t = Math.min(1, Math.round((pool.t + 0.02) * 100) / 100);
      save(); renderHud(); showForces();
    });
  }

  // =====================================================================
  //  HUD
  // =====================================================================
  function renderHud() {
    if (!S) return;
    const mine = terrOf(S.P);
    $('#hudName').textContent = ownerName(S.P);
    $('#hudDate').textContent = dateStr(S.turn);
    $('#hudMoney').textContent = money(S.money);
    $('#hudIncome').textContent = '+' + money(income());
    $('#hudLands').textContent = `${mine.length} / ${N}`;
    $('#hudPop').textContent = pct(mine.reduce((s, t) => s + C[t].pop, 0) / WORLD_POP * 100);
    $('#btnEnd').disabled = S.over;
  }
  function renderAll() { computeAttackable(); paint(); renderHud(); if (sel != null) renderPanel(); }

  $('#btnEnd').addEventListener('click', () => endTurn());
  $('#btnForces').addEventListener('click', () => S && showForces());
  $('#btnLog').addEventListener('click', () => S && showLog());
  $('#hudName').addEventListener('click', () => S && showLog());
  $('#zIn').addEventListener('click', () => svg.transition().duration(250).call(zoom.scaleBy, 1.6));
  $('#zOut').addEventListener('click', () => svg.transition().duration(250).call(zoom.scaleBy, 1 / 1.6));
  $('#zHome').addEventListener('click', () => S && zoomTo(S.P, 4));

  // =====================================================================
  //  START SCREEN
  // =====================================================================
  const startEl = $('#start'), listEl = $('#countryList');
  let openRow = null;
  function showStart() {
    startEl.hidden = false;
    const sv = loadSave();
    $('#resumeBox').innerHTML = sv ? `<button class="btn primary" type="button" id="resume">Spiel fortsetzen: ${esc(C[sv.P].n)} · ${dateStr(sv.turn)}</button><span class="note">oder unten ein neues Land wählen</span>` : '';
    if (sv) $('#resume').addEventListener('click', () => { S = sv; startEl.hidden = true; afterStart(); });
    renderList();
  }
  function renderList() {
    const qy = $('#search').value.trim().toLowerCase();
    const sort = $('#sortSel').value;
    let items = C.map((c, i) => i).filter(i => !qy || C[i].n.toLowerCase().includes(qy));
    if (sort === 'rank') items.sort((a, b) => rankOf[a] - rankOf[b]);
    else if (sort === 'hard') items.sort((a, b) => rankOf[b] - rankOf[a]);
    else items.sort((a, b) => C[a].n.localeCompare(C[b].n, 'de'));
    listEl.innerHTML = items.map(i => {
      const c = C[i], d = diffOf(i);
      return `<button class="crow" type="button" role="listitem" data-i="${i}" aria-expanded="${openRow === i}">
        <span class="rk">#${rankOf[i]}</span>
        <span style="min-width:0"><div class="nm">${esc(c.n)}</div><div class="mini">${fmtUnit('sol', c.mil.sol)} Soldaten · ${nf0.format(c.mil.tank)} Panzer · ${nf0.format(c.mil.ftr)} Kampfjets · ${money(c.bud)}</div></span>
        <span class="diff d${d}">${DIFF[d]}</span></button>${openRow === i ? detailHtml(i) : ''}`;
    }).join('') || '<div class="note" style="padding:14px">Kein Land gefunden.</div>';
  }
  function detailHtml(i) {
    const c = C[i];
    return `<div class="cdetail">
      <div class="grid2">
        <div>
          <div class="kv" style="margin-top:10px">
            <div><div class="k">Bevölkerung</div><div class="v">${nf1.format(c.pop)} Mio.</div></div>
            <div><div class="k">BIP</div><div class="v">${money(c.gdp)}</div></div>
            <div><div class="k">Militärbudget</div><div class="v">${money(c.bud)}</div></div>
            <div><div class="k">Technologie</div><div class="v">${Math.round(c.t * 100)}/100</div></div>
          </div>
          ${powerBox(c.mil, c.t)}
          <h3 class="sec">Hauptwaffensysteme</h3><div class="systems">${esc(c.s)}</div>
          <h3 class="sec">Nachbarn</h3><div class="note">${[...NB[i]].map(j => esc(C[j].n)).join(', ') || 'keine Landgrenzen – Inselstaat'}</div>
        </div>
        <div>${milTable(c.mil)}</div>
      </div>
      <div class="actions" style="margin-top:14px"><button class="btn primary" type="button" data-start="${i}">Als ${esc(c.n)} starten</button></div>
    </div>`;
  }
  listEl.addEventListener('click', e => {
    const s = e.target.closest('[data-start]');
    if (s) { startGame(+s.dataset.start); return; }
    const row = e.target.closest('.crow'); if (!row) return;
    const i = +row.dataset.i;
    openRow = openRow === i ? null : i;
    renderList();
    const el = listEl.querySelector(`.crow[data-i="${i}"]`); if (el && openRow === i) el.scrollIntoView({ block: 'nearest' });
  });
  $('#search').addEventListener('input', () => { openRow = null; renderList(); });
  $('#sortSel').addEventListener('change', renderList);
  $('#btnRandom').addEventListener('click', () => { openRow = Math.floor(Math.random() * N); $('#search').value = ''; renderList(); const el = listEl.querySelector(`.crow[data-i="${openRow}"]`); if (el) el.scrollIntoView({ block: 'center' }); });

  function startGame(i) {
    newGame(i);
    save();
    startEl.hidden = true;
    afterStart(true);
  }
  function afterStart(fresh) {
    fitZoom();
    homeZoom();
    renderAll();
    select(S.P);
    setTimeout(() => zoomTo(S.P, 4, 900), 60);
    if (fresh) setTimeout(() => {
      openModal(`<div class="eyebrow">Einsatzbefehl · ${dateStr(0)}</div><h2>Oberkommando ${esc(C[S.P].n)}</h2>
      <p class="sub">Deine Streitkräfte entsprechen dem realen Stand. Rot gestrichelte Länder kannst du direkt angreifen.</p>
      <div class="ev"><span class="tag2">1</span><span class="txt">Tippe ein Nachbarland an und plane eine <b>Invasion</b>. Lege fest, wie viel Heer, Luftwaffe und Marine du einsetzt.</span></div>
      <div class="ev"><span class="tag2">2</span><span class="txt">Jeder Angriff erhöht den <b>Kriegsfortschritt</b>. Bei 100 % kapituliert das Land, und du erbeutest Teile seiner Ausrüstung.</span></div>
      <div class="ev"><span class="tag2">3</span><span class="txt">Eingesetzte Einheiten sind bis zur nächsten Runde gebunden. Unter <b>Streitkräfte</b> kaufst du Nachschub und modernisierst.</span></div>
      <div class="ev"><span class="tag2">4</span><span class="txt">Inseln erreichst du nur mit Marine und Landungsschiffen. Gebirge, Winter und Dschungel stärken Verteidiger.</span></div>
      <div class="ev"><span class="tag2">5</span><span class="txt">Je mehr du eroberst, desto nervöser wird die Welt. Andere Mächte greifen dich an, und besetzte Länder können rebellieren.</span></div>
      <div class="actions" style="justify-content:flex-end;margin-top:14px"><button class="btn primary" type="button" id="goOk">Los geht's</button></div>`);
      $('#goOk').addEventListener('click', closeModal);
    }, 950);
  }

  window.addEventListener('resize', () => { if (!S) return; fitZoom(); });

  // initial background map behind the start screen
  fitZoom(); homeZoom(); paint();
  showStart();
})();
