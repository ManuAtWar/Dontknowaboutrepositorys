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
  // ---- player settings (persisted per browser) ----
  const CFG_DEF = { v: 4, tempo: 'normal', aiShow: 'all', aggr: 1, win: 0.6, money: 1, name: '', color: '#f0b43c' };
  let CFG = { ...CFG_DEF };
  try { Object.assign(CFG, JSON.parse(localStorage.getItem('td-cfg')) || {}); } catch (e) { /* ignore */ }
  if (CFG.v !== 4) { CFG.v = 4; CFG.tempo = 'normal'; } // v4: smoother default pacing
  const saveCfg = () => { try { localStorage.setItem('td-cfg', JSON.stringify(CFG)); } catch (e) { /* ignore */ } };
  const TEMPO = { normal: 1, fast: 1.6, blitz: 3 };
  const tempo = () => TEMPO[CFG.tempo] || 2;
  let WIN_SHARE = CFG.win; // share of all countries needed for world domination

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
  const COAST = D.coast;

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
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const easeOut = t => 1 - Math.pow(1 - t, 3);
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

  const RANK = C.map((c, i) => ({ i, s: strength(c.mil, c.t) })).sort((a, b) => b.s - a.s);
  const rankOf = new Array(N); RANK.forEach((r, idx) => { rankOf[r.i] = idx + 1; });
  const diffOf = i => { const r = rankOf[i]; return r <= 5 ? 1 : r <= 20 ? 2 : r <= 60 ? 3 : r <= 120 ? 4 : 5; };
  const DIFF = ['', 'Leicht', 'Mittel', 'Schwer', 'Sehr schwer', 'Legendär'];

  // =====================================================================
  //  STATE
  // =====================================================================
  const SAVE_KEY = 'terra-dominium-v2';
  let S = null;
  let shown = C.map((_, i) => i); // owner shown on the map (lags behind S.owner while animations play)

  function newGame(p) {
    S = { v: 2, turn: 0, P: p, owner: C.map((_, i) => i), pools: {}, used: zero(), money: Math.max(0.05, C[p].bud * 0.25) * CFG.money,
      econ: 1, queue: [], prog: {}, tension: 0, log: [], over: false, won: false, ai: {}, prefs: { land: 60, air: 70, sea: 70 },
      milestones: {}, keepPlaying: false };
    C.forEach((c, i) => { S.pools[i] = { m: { ...c.mil }, t: c.t }; });
    terrCache = null;
    shown = S.owner.slice();
    log('me', `Du übernimmst das Oberkommando von ${C[p].n}. Ziel: die Welt.`);
  }
  const save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ } };
  const loadSave = () => { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); return s && s.v === 2 && s.owner && s.owner.length === N ? s : null; } catch (e) { return null; } };
  const clearSave = () => { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } };
  function log(type, text, rep) { S.log.unshift({ type, text, turn: S.turn, rep: rep || null }); if (S.log.length > 200) S.log.length = 200; }

  let terrCache = null;
  function terrOf(o) {
    if (!terrCache) { terrCache = new Map(); S.owner.forEach((ow, t) => { let a = terrCache.get(ow); if (!a) terrCache.set(ow, a = []); a.push(t); }); }
    return terrCache.get(o) || [];
  }
  const setOwner = (t, o) => { S.owner[t] = o; terrCache = null; };
  const budEff = t => Math.max(C[t].bud, C[t].gdp * 0.004, 0.002);
  const ownerBud = o => terrOf(o).reduce((s, t) => s + budEff(t), 0);
  const deployShare = (o, t) => { const ts = terrOf(o); if (ts.length <= 1) return 1; return Math.min(1, 0.35 + 0.65 * budEff(t) / ownerBud(o)); };
  const ownerName = o => S && o === S.P ? (CFG.name || `Reich ${C[S.P].n}`) : C[o].n;
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
    return Math.min(7000, 400 + 45 * Math.sqrt(raw) + 1100 * Math.min(3, m.cv || 0));
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
    if (COAST[t]) for (const i of ts) { if (!COAST[i]) continue; const d = dist(i, t); if (d < md) { md = d; from = i; } }
    if (md <= 60) return { type: 'strait', from, d: md };
    if (md <= seaRange(o)) return { type: 'sea', from, d: md };
    if (!COAST[t]) { const n = nearestOwn(o, t); return { type: 'none', from: n.from, d: n.d, landlocked: true }; }
    return { type: 'none', from, d: md };
  }
  const nearestOwn = (o, t) => { let md = Infinity, from = -1; for (const i of terrOf(o)) { const d = NB[i].has(t) ? 0 : dist(i, t); if (d < md) { md = d; from = i; } } return { from, d: md }; };
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

  function navalPhase(rep, commit, dm, tA, tD, rtype, r) {
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
    return { landCap, repulsed };
  }

  function battle(att, tgt, commit, rtype, dry) {
    const def = S.owner[tgt], Dp = S.pools[def], c = C[tgt];
    const dm = scaleM(Dp.m, deployShare(def, tgt));
    const tA = S.pools[att].t, tD = Dp.t;
    const r = (a, b) => dry ? (a + b) / 2 : a + (b - a) * Math.random();
    const rep = { kind: 'invade', att, def, tgt, rtype, commit: { ...commit }, lossA: zero(), lossD: zero(), phases: [], landCap: 1 };
    const nv = navalPhase(rep, commit, dm, tA, tD, rtype, r);
    const landCap = nv.landCap, repulsed = nv.repulsed;
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
    rep.gain = ratio > 0.6 ? Math.min(100, (ratio - 0.6) * 68) : 0;
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
    rep.prevOwner = def;
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
    const last = ts.length <= 1;
    let removed;
    if (last) { removed = { ...Pp.m }; if (prev === S.P) KEYS.forEach(k => { if (k !== 'nuk') Pp.m[k] = 0; }); }
    else {
      const s = Math.min(0.6, 0.5 * budEff(tgt) / ownerBud(prev) + 0.08);
      removed = scaleM(Pp.m, s);
      KEYS.forEach(k => { if (k !== 'nuk') Pp.m[k] = roundUnit(k, Pp.m[k] - removed[k]); });
    }
    setOwner(tgt, att);
    delete S.prog[tgt];
    if (last && prev !== S.P) {
      delete S.pools[prev]; delete S.ai[prev];
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
  //  AI – every power plays for world domination
  // =====================================================================
  function powersRanking() {
    const m = new Map();
    S.owner.forEach((o, t) => { m.set(o, (m.get(o) || 0) + 1); });
    return [...m.entries()].map(([o, n]) => ({ o, n, pop: terrOf(o).reduce((s, t) => s + C[t].pop, 0) }))
      .sort((a, b) => b.n - a.n || b.pop - a.pop);
  }

  function aiTurn(battles, events) {
    const P = S.P;
    const ranked = [...new Set(S.owner)].filter(o => o !== P && S.pools[o])
      .map(o => ({ o, s: strength(S.pools[o].m, S.pools[o].t) })).sort((a, b) => b.s - a.s);
    const playerN = terrOf(P).length;
    let n = 0;
    ranked.forEach((r, idx) => {
      if (n >= 16) return;
      const o = r.o, pool = S.pools[o];
      if (!pool) return;
      const ai = S.ai[o] || (S.ai[o] = { focus: -1 });
      const terrN = terrOf(o).length;
      let pAct = (idx < 5 ? 0.55 : idx < 12 ? 0.28 : idx < 30 ? 0.1 : 0.025) * CFG.aggr;
      pAct += Math.min(0.3, (terrN - 1) * 0.04);
      if (ai.focus >= 0) pAct += 0.35; // finish what was started
      if (Math.random() > pAct) return;

      const commit = scaleM(pool.m, 0.75, BUYABLE);
      let tgt = -1, rt = null, est = null;
      if (ai.focus >= 0 && S.owner[ai.focus] !== o) {
        rt = route(o, ai.focus);
        if (rt && rt.type !== 'none') { tgt = ai.focus; est = battle(o, tgt, commit, rt.type, true); if (est.ratio < 0.8) tgt = -1; }
      }
      if (tgt < 0) {
        ai.focus = -1;
        const cands = [];
        for (let t = 0; t < N; t++) {
          const ow = S.owner[t]; if (ow === o) continue;
          const rr = route(o, t); if (!rr || rr.type === 'none') continue;
          const d = S.pools[ow];
          const defS = (strength(scaleM(d.m, deployShare(ow, t)), d.t) + C[t].pop * 0.4) * C[t].ter + 1;
          let score = (Math.sqrt(C[t].gdp) + 4 + C[t].pop * 0.05) / defS;
          if (rr.type === 'land') score *= 1.6;
          else { if (rr.d > 1500) continue; score *= 0.5 / (1 + rr.d / 600); }
          if (ow === P) score *= 1 + Math.min(2.5, S.tension * 0.08 + playerN * 0.04); // the leader becomes everyone's target
          cands.push({ t, rr, score });
        }
        cands.sort((a, b) => b.score - a.score);
        for (const c of cands.slice(0, 5)) {
          const e = battle(o, c.t, commit, c.rr.type, true);
          if (e.ratio >= 1.15) { tgt = c.t; rt = c.rr; est = e; break; }
        }
      }
      if (tgt < 0) return;
      ai.focus = tgt;
      n++;
      const rep = applyBattle(battle(o, tgt, commit, rt.type, false));
      rep.from = rt.from;
      if (rep.conquered) ai.focus = -1;
      battles.push(rep);
    });

    // milestones: warn when a rival gets close to world domination
    powersRanking().slice(0, 3).forEach(p => {
      if (p.o === P) return;
      const share = p.n / N;
      [0.15, 0.3, 0.45].forEach(th => {
        const key = p.o + ':' + th;
        if (share >= th && !S.milestones[key]) {
          S.milestones[key] = true;
          events.push({ type: 'bad', text: `${ownerName(p.o)} kontrolliert ${pct(share * 100)} aller Länder. Ab ${pct(WIN_SHARE * 100)} hat ${C[p.o].n} die Weltherrschaft.` });
        }
      });
    });
  }

  // =====================================================================
  //  TURN
  // =====================================================================
  let busy = false;
  function endTurn() {
    if (S.over) return;
    if (busy) { speed = 6; return; }
    const events = [];
    const P = S.P;
    if (S.queue.length) {
      const m = S.pools[P].m; const parts = [];
      S.queue.forEach(o => { m[o.k] = roundUnit(o.k, (m[o.k] || 0) + o.n); parts.push(`${fmtUnit(o.k, o.n)} ${U[o.k].n}`); });
      events.push({ type: 'good', text: `Lieferung: ${parts.join(', ')}.` });
      S.queue = [];
    }
    const inc = income(); S.money += inc;

    const battles = [];
    aiTurn(battles, events);

    // rebellions in occupied territories
    const rebels = [];
    const mine = terrOf(P).slice();
    const garrisonLow = (S.pools[P].m.sol || 0) < 25 * mine.length;
    for (const t of mine) {
      if (t === P) continue;
      const pr = 0.004 * S.econ * S.econ + (garrisonLow ? 0.02 : 0) + (S.econ >= 3 ? 0.01 : 0);
      if (Math.random() < pr) {
        setOwner(t, t);
        S.pools[t] = { m: scaleM(C[t].mil, 0.35), t: C[t].t };
        S.pools[t].m.nuk = 0;
        delete S.prog[t];
        rebels.push(t);
        events.push({ type: 'bad', text: `Aufstand in ${C[t].n}! Das Land ist wieder unabhängig.${garrisonLow ? ' Zu wenige Soldaten für die Besatzung.' : ''}` });
      }
    }
    // regeneration: AI powers rearm with their budgets, great powers build up beyond peace levels
    const ranked = [...new Set(S.owner)];
    ranked.forEach(o => {
      const pool = S.pools[o]; if (!pool) return;
      const target = zero();
      terrOf(o).forEach(t => KEYS.forEach(k => { target[k] += C[t].mil[k]; }));
      const isP = o === P;
      const boost = isP ? 1 : 1 + Math.min(0.5, S.turn * 0.01);
      const keys = isP ? ['sol', 'res'] : KEYS.filter(k => k !== 'nuk');
      keys.forEach(k => { const tg = target[k] * boost; if (pool.m[k] < tg) pool.m[k] = roundUnit(k, pool.m[k] + (tg - pool.m[k]) * (isP ? 0.03 : 0.05)); });
    });
    Object.keys(S.prog).forEach(k => { const p = S.prog[k]; if (p.t < S.turn) { p.v -= 10; if (p.v <= 0) delete S.prog[k]; } });

    S.turn++;
    S.used = zero();
    // battle events
    battles.forEach(rep => { rep.ev = battleEvent(rep); if (rep.ev) log(rep.ev.type, rep.ev.text, rep); });
    events.forEach(e => log(e.type, e.text, e.rep));
    checkEnd();
    save();

    // --- playback ---
    busy = true; speed = 1;
    renderHud();
    ticker('me', `${dateStr(S.turn)} · Einnahmen +${money(inc)}`);
    events.forEach((e, i) => setTimeout(() => ticker(e.type, e.text), 200 + i * 250));
    let tEnd = 0;
    const playerFirst = battles.filter(b => b.def === P || b.att === P).concat(battles.filter(b => b.def !== P && b.att !== P));
    const tp = tempo() * 0.9;
    playerFirst.forEach((rep, i) => {
      const mineB = rep.def === P || rep.att === P;
      const tick = () => { if (rep.ev && (rep.def === P || rep.ev.type !== 'info' || rep.conquered)) ticker(rep.ev.type, rep.ev.text, rep); };
      if (CFG.aiShow === 'none' || (CFG.aiShow === 'mine' && !mineB)) { if (rep.conquered) { shown[rep.tgt] = rep.att; } tick(); return; }
      const delay = i * 420 / tempo();
      const dur = playInvasion(rep, delay, tp, tick);
      tEnd = Math.max(tEnd, delay + dur);
    });
    requestDraw();
    rebels.forEach((t, i) => { fxFlood(t, MAIN[t].c, t, i * 300, 900); tEnd = Math.max(tEnd, i * 300 + 900); });
    afterFx(tEnd + 100, () => {
      busy = false; speed = 1;
      shown = S.owner.slice(); requestDraw();
      renderAll();
      if (S.over) showEnd();
    });
  }

  function battleEvent(rep) {
    const P = S.P, o = rep.att, t = rep.tgt;
    if (rep.def === P) return { type: 'bad', text: rep.conquered ? `${C[o].n} hat ${C[t].n} von dir erobert!` : `${C[o].n} greift ${C[t].n} an – Fortschritt des Gegners ${pct(rep.progress)}.` };
    if (rep.conquered) return { type: 'info', text: `${ownerName(o)} erobert ${C[t].n}${rep.prevOwner !== t ? ` (bisher ${ownerName(rep.prevOwner)})` : ''}.` };
    if (rep.gain > 0) return { type: 'info', text: `${C[o].n} greift ${C[t].n} an (${pct(rep.progress)}).` };
    return null;
  }

  function checkEnd() {
    if (S.over) return;
    const mine = terrOf(S.P).length;
    if (mine === 0) { S.over = true; S.won = false; S.endReason = 'fallen'; log('bad', 'Dein Reich ist gefallen.'); return; }
    if (mine === N) { S.over = true; S.won = true; S.endReason = 'total'; return; }
    if (!S.keepPlaying && mine >= Math.ceil(N * WIN_SHARE)) { S.over = true; S.won = true; S.endReason = 'share'; return; }
    const top = powersRanking().find(p => p.o !== S.P);
    if (top && top.n >= Math.ceil(N * WIN_SHARE)) { S.over = true; S.won = false; S.endReason = 'rival'; S.rival = top.o; log('bad', `${C[top.o].n} hat die Weltherrschaft errungen.`); }
  }

  // =====================================================================
  //  MAP – canvas renderer
  // =====================================================================
  const W = 1600, H = 820;
  const COL = { ocean: '#0b1824', ocean2: '#0e2030', grat: '#15293b', line: '#22384c', border: '#0b1824', gold: '#f0b43c', hostile: '#ef5a4c', warn: '#e9a23b', ink: '#e4ebf0', white: '#ffffff' };
  const stage = $('#stage');
  const cvBase = $('#map'), cvFx = $('#fx');
  const bctx = cvBase.getContext('2d'), fctx = cvFx.getContext('2d');
  const hctx = document.createElement('canvas').getContext('2d');

  const feats = topojson.feature(TOPO, TOPO.objects.c).features;
  const proj = d3.geoNaturalEarth1().fitExtent([[8, 8], [W - 8, H - 8]], { type: 'FeatureCollection', features: feats });

  // record projected rings (with antimeridian cutting done by d3)
  function record(obj) {
    const rings = []; let cur = null;
    const ctx = { moveTo(x, y) { cur = [x, y]; rings.push(cur); }, lineTo(x, y) { cur.push(x, y); }, closePath() {}, arc() {}, beginPath() {} };
    d3.geoPath(proj, ctx)(obj);
    return rings;
  }
  const LODS = [1.6, 0.6, 0.2, 0.05];
  function mkPath(rings, tol) {
    const p = new Path2D(); const t2 = tol * tol;
    for (const r of rings) {
      if (r.length < 6) continue;
      const pts = [r[0], r[1]]; let lx = r[0], ly = r[1];
      for (let i = 2; i < r.length; i += 2) {
        const x = r[i], y = r[i + 1], dx = x - lx, dy = y - ly;
        if (dx * dx + dy * dy >= t2) { pts.push(x, y); lx = x; ly = y; }
      }
      if (pts.length < 6) continue;
      p.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1]);
      p.closePath();
    }
    return p;
  }
  const FEAT = feats.map(f => {
    const rings = record(f);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    rings.forEach(r => { for (let i = 0; i < r.length; i += 2) { const x = r[i], y = r[i + 1]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } });
    return { id: f.id, rings, bb: [x0, y0, x1, y1], lod: [] };
  });
  const featPath = (f, li) => f.lod[li] || (f.lod[li] = mkPath(f.rings, LODS[li]));
  const BYC = C.map(() => []); FEAT.forEach(f => BYC[f.id].push(f));
  const cPathCache = [];
  const countryPath = id => {
    if (cPathCache[id]) return cPathCache[id];
    const p = new Path2D(); BYC[id].forEach(f => p.addPath(featPath(f, 2))); return (cPathCache[id] = p);
  };
  const spherePath = new Path2D(d3.geoPath(proj)({ type: 'Sphere' }));
  const gratPath = new Path2D(d3.geoPath(proj)(d3.geoGraticule10()));

  // main polygon per country (centroid, zoom box)
  const MAIN = C.map(() => ({ a: -1, poly: null, total: 0 }));
  const gpath = d3.geoPath(proj);
  feats.forEach(f => {
    const g = f.geometry; if (!g) return;
    const isTerr = f.properties && f.properties.t; // overseas territory: never the label/zoom anchor
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    polys.forEach(coords => {
      const poly = { type: 'Polygon', coordinates: coords };
      const a = gpath.area(poly);
      MAIN[f.id].total += a;
      const score = isTerr ? a * 1e-6 : a;
      if (score > MAIN[f.id].a) { MAIN[f.id].a = score; MAIN[f.id].poly = poly; }
    });
  });
  MAIN.forEach(m => { if (m.poly) { m.c = gpath.centroid(m.poly); m.b = gpath.bounds(m.poly); } else { m.c = [W / 2, H / 2]; m.b = [[0, 0], [W, H]]; } });
  const tiny = C.map((_, i) => i).filter(i => MAIN[i].total < 6);

  // random point inside a country (for explosions / troop destinations)
  function interior(id, near, spread) {
    const p = countryPath(id); const b = MAIN[id].b;
    for (let k = 0; k < 40; k++) {
      let x, y;
      if (near) { const s = spread || 30; x = near[0] + (Math.random() - 0.5) * s; y = near[1] + (Math.random() - 0.5) * s; }
      else { x = lerp(b[0][0], b[1][0], Math.random()); y = lerp(b[0][1], b[1][1], Math.random()); }
      if (hctx.isPointInPath(p, x, y)) return [x, y];
    }
    return MAIN[id].c.slice();
  }
  // point of country a's outline closest to point pt
  function edgeToward(a, pt) {
    let best = null, bd = Infinity;
    for (const f of BYC[a]) for (const r of f.rings) for (let i = 0; i < r.length; i += 6) {
      const dx = r[i] - pt[0], dy = r[i + 1] - pt[1], d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = [r[i], r[i + 1]]; }
    }
    return best || MAIN[a].c.slice();
  }

  // ---------- viewport ----------
  let T = d3.zoomIdentity, dpr = 1, cw = 1, ch = 1, baseK = 1;
  const zoom = d3.zoom().on('zoom', e => { T = e.transform; hideTip(); requestDraw(); });
  const fxSel = d3.select(cvFx).call(zoom);
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cw = stage.clientWidth || 800; ch = stage.clientHeight || 600;
    [cvBase, cvFx].forEach(c => { c.width = Math.round(cw * dpr); c.height = Math.round(ch * dpr); });
    baseK = Math.min(cw / W, ch / H);
    zoom.extent([[0, 0], [cw, ch]]).scaleExtent([baseK, baseK * 60]).translateExtent([[-60, -60], [W + 60, H + 60]]);
    requestDraw();
  }
  function zoomTo(i, maxK = 7, dur = 750) {
    const b = MAIN[i].b; const dx = Math.max(20, b[1][0] - b[0][0]), dy = Math.max(20, b[1][1] - b[0][1]);
    const narrow = cw < 860;
    const vh = narrow ? ch * 0.5 : ch, vw = narrow ? cw : cw - 390;
    const k = Math.min(baseK * maxK, 0.55 / Math.max(dx / vw, dy / vh));
    const cx = (b[0][0] + b[1][0]) / 2, cy = (b[0][1] + b[1][1]) / 2;
    fxSel.transition().duration(dur).call(zoom.transform, d3.zoomIdentity.translate(vw / 2 - k * cx, vh / 2 - k * cy).scale(k));
  }
  function homeZoom() {
    const k = Math.max(cw / W, ch / H);
    fxSel.call(zoom.transform, d3.zoomIdentity.translate((cw - W * k) / 2, (ch - H * k) / 2).scale(k));
  }

  const hue = i => (i * 137.508) % 360;
  const colorOf = o => (S && o === S.P) ? CFG.color : `hsl(${hue(o).toFixed(0)} ${22 + (o % 3) * 5}% ${30 + (o % 5) * 3.2}%)`;

  let sel = null, hover = null;
  let attackable = new Set(), seaOnly = new Set();
  function computeAttackable() {
    attackable = new Set(); seaOnly = new Set();
    if (!S || S.over) return;
    for (let t = 0; t < N; t++) { const r = route(S.P, t); if (r && r.type !== 'none') (r.type === 'sea' ? seaOnly : attackable).add(t); }
  }

  // ---------- frame loop ----------
  let needBase = true, raf = 0, last = 0, clock = 0, speed = 1, fxDirty = false;
  const FX = [];
  function requestDraw() { needBase = true; kick(); }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  function frame(now) {
    raf = 0;
    const dt = last ? Math.min(64, now - last) : 16; last = now;
    clock += dt * speed;
    if (needBase) { needBase = false; drawBase(); }
    drawFx();
    if (FX.length || timers.length) kick(); else last = 0;
  }
  // timers on the game clock (so fast-forward works)
  const timers = [];
  function afterFx(ms, fn) { timers.push({ at: clock + ms, fn }); kick(); }
  function runTimers() { for (let i = timers.length - 1; i >= 0; i--) if (clock >= timers[i].at) { const t = timers.splice(i, 1)[0]; t.fn(); } }

  function drawBase() {
    const c = bctx, k = T.k;
    c.setTransform(1, 0, 0, 1, 0, 0);
    const g = c.createRadialGradient(cvBase.width / 2, cvBase.height * 0.4, 10, cvBase.width / 2, cvBase.height * 0.4, Math.max(cvBase.width, cvBase.height) * 0.75);
    g.addColorStop(0, COL.ocean2); g.addColorStop(1, COL.ocean);
    c.fillStyle = g; c.fillRect(0, 0, cvBase.width, cvBase.height);
    c.setTransform(dpr * k, 0, 0, dpr * k, dpr * T.x, dpr * T.y);
    const px = 1 / k; // one CSS pixel in world units
    c.lineWidth = px; c.strokeStyle = COL.grat; c.stroke(gratPath);
    c.strokeStyle = COL.line; c.stroke(spherePath);

    const need = 0.7 / (k * dpr);
    let li = LODS.length - 1; for (let i = 0; i < LODS.length; i++) if (LODS[i] <= need * 2.2) { li = i; break; }
    const vx0 = -T.x / k, vy0 = -T.y / k, vx1 = vx0 + cw / k, vy1 = vy0 + ch / k;
    const vis = f => !(f.bb[2] < vx0 || f.bb[0] > vx1 || f.bb[3] < vy0 || f.bb[1] > vy1);

    c.lineJoin = 'round';
    for (const f of FEAT) {
      if (!vis(f)) continue;
      const p = featPath(f, li);
      c.fillStyle = colorOf(shown[f.id]);
      c.fill(p);
    }
    c.strokeStyle = COL.border; c.lineWidth = 0.7 * px;
    for (const f of FEAT) if (vis(f)) c.stroke(featPath(f, li));
    // own empire outline
    if (S) {
      c.strokeStyle = 'rgba(255,214,120,.55)'; c.lineWidth = 1.1 * px;
      for (const f of FEAT) if (shown[f.id] === S.P && vis(f)) c.stroke(featPath(f, li));
    }
    // targets
    if (S && !busy) {
      c.setLineDash([1 * px, 3 * px]); c.strokeStyle = 'rgba(239,90,76,.55)'; c.lineWidth = 1 * px;
      for (const f of FEAT) if (seaOnly.has(f.id) && vis(f)) c.stroke(featPath(f, li));
      c.setLineDash([3 * px, 2 * px]); c.strokeStyle = COL.hostile; c.lineWidth = 1.3 * px;
      for (const f of FEAT) if (attackable.has(f.id) && vis(f)) c.stroke(featPath(f, li));
      c.setLineDash([]);
    }
    if (S) {
      c.strokeStyle = COL.warn; c.lineWidth = 1.7 * px;
      for (const f of FEAT) if (S.prog[f.id] && vis(f)) c.stroke(featPath(f, li));
    }
    if (hover != null && hover !== sel) { c.fillStyle = 'rgba(255,255,255,.12)'; BYC[hover].forEach(f => c.fill(featPath(f, li))); }
    if (sel != null) { c.strokeStyle = COL.white; c.lineWidth = 2.2 * px; BYC[sel].forEach(f => c.stroke(featPath(f, li))); }
    // tiny states
    for (const i of tiny) {
      const [x, y] = MAIN[i].c; const r = 4 * px;
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2);
      c.fillStyle = colorOf(shown[i]); c.fill();
      c.lineWidth = (i === sel ? 2 : 1) * px;
      c.strokeStyle = i === sel ? COL.white : (attackable.has(i) || seaOnly.has(i)) ? COL.hostile : COL.border; c.stroke();
    }
    // labels: empires
    if (S) {
      c.textAlign = 'center'; c.textBaseline = 'middle';
      const groups = new Map(); shown.forEach((o, t) => { if (!groups.has(o)) groups.set(o, []); groups.get(o).push(t); });
      groups.forEach((ts, o) => {
        if (ts.length < 2 && o !== S.P) return;
        const anchor = ts.includes(o) ? o : ts.reduce((a, b) => MAIN[a].a > MAIN[b].a ? a : b);
        const [x, y] = MAIN[anchor].c;
        const isP = o === S.P;
        const fs = (isP ? 14 : 12.5) * px;
        c.font = `600 ${fs}px "Saira Condensed","Arial Narrow",sans-serif`;
        const label = isP ? `★ ${C[o].n.toUpperCase()}` : `${C[o].n.toUpperCase()} · ${ts.length}`;
        c.lineWidth = 3.2 * px; c.strokeStyle = 'rgba(8,16,24,.85)'; c.strokeText(label, x, y);
        c.fillStyle = isP ? COL.gold : COL.ink; c.fillText(label, x, y);
      });
    }
  }

  function drawFx() {
    runTimers();
    const c = fctx;
    if (!FX.length && !fxDirty) return;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cvFx.width, cvFx.height);
    fxDirty = FX.length > 0;
    if (!FX.length) return;
    c.setTransform(dpr * T.k, 0, 0, dpr * T.k, dpr * T.x, dpr * T.y);
    const px = 1 / T.k;
    for (let i = FX.length - 1; i >= 0; i--) {
      const e = FX[i];
      if (clock < e.t0) continue;
      const p = Math.min(1, (clock - e.t0) / e.dur);
      if (!e.started) { e.started = true; if (e.onStart) e.onStart(); }
      c.save(); e.draw(c, p, px); c.restore();
      if (p >= 1) { FX.splice(i, 1); if (e.onEnd) e.onEnd(); }
    }
  }
  function addFx(e) { e.t0 = clock + (e.delay || 0); FX.push(e); kick(); return e; }

  // ---------- effect primitives ----------
  function drawTank(c, x, y, ang, s, col) {
    c.save(); c.translate(x, y); c.rotate(ang);
    c.fillStyle = col; c.strokeStyle = 'rgba(5,10,16,.9)'; c.lineWidth = s * 0.18;
    c.beginPath(); c.rect(-s, -s * 0.62, s * 2, s * 1.24); c.fill(); c.stroke();
    c.beginPath(); c.arc(-s * 0.1, 0, s * 0.45, 0, Math.PI * 2); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(s * 0.2, 0); c.lineTo(s * 1.6, 0); c.lineWidth = s * 0.28; c.stroke();
    c.restore();
  }
  function drawShip(c, x, y, ang, s, col) {
    c.save(); c.translate(x, y); c.rotate(ang);
    c.fillStyle = col; c.strokeStyle = 'rgba(5,10,16,.9)'; c.lineWidth = s * 0.18;
    c.beginPath(); c.moveTo(s * 1.8, 0); c.lineTo(s * 0.8, -s * 0.6); c.lineTo(-s * 1.4, -s * 0.6); c.lineTo(-s * 1.4, s * 0.6); c.lineTo(s * 0.8, s * 0.6); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = 'rgba(5,10,16,.6)'; c.fillRect(-s * 0.6, -s * 0.3, s * 0.9, s * 0.6);
    c.restore();
  }
  function drawJet(c, x, y, ang, s, col) {
    c.save(); c.translate(x, y); c.rotate(ang);
    c.fillStyle = col; c.strokeStyle = 'rgba(5,10,16,.9)'; c.lineWidth = s * 0.15;
    c.beginPath();
    c.moveTo(s * 1.6, 0); c.lineTo(s * 0.2, -s * 0.25); c.lineTo(-s * 0.3, -s * 1.3); c.lineTo(-s * 0.7, -s * 1.3); c.lineTo(-s * 0.4, -s * 0.25);
    c.lineTo(-s * 1.2, -s * 0.2); c.lineTo(-s * 1.5, -s * 0.7); c.lineTo(-s * 1.7, -s * 0.7); c.lineTo(-s * 1.5, 0);
    c.lineTo(-s * 1.7, s * 0.7); c.lineTo(-s * 1.5, s * 0.7); c.lineTo(-s * 1.2, s * 0.2); c.lineTo(-s * 0.4, s * 0.25); c.lineTo(-s * 0.7, s * 1.3);
    c.lineTo(-s * 0.3, s * 1.3); c.lineTo(s * 0.2, s * 0.25); c.closePath(); c.fill(); c.stroke();
    c.restore();
  }
  const qbez = (a, m, b, t) => [(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * m[0] + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * m[1] + t * t * b[1]];
  const ctrl = (a, b, bend) => { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1]; return [mx - dy * bend, my + dx * bend]; };

  function fxArrow(a, b, col, delay, dur, bend = 0.18) {
    const m = ctrl(a, b, bend);
    return addFx({ delay, dur, draw(c, p, px) {
      const grow = clamp(p / 0.25, 0, 1), fade = p > 0.8 ? 1 - (p - 0.8) / 0.2 : 1;
      c.globalAlpha = 0.9 * fade;
      c.strokeStyle = 'rgba(5,10,16,.7)'; c.lineCap = 'round';
      const steps = 30, end = Math.max(1, Math.round(steps * ease(grow)));
      const pts = []; for (let i = 0; i <= end; i++) pts.push(qbez(a, m, b, i / steps));
      for (const [lw, st] of [[7 * px, 'rgba(5,10,16,.65)'], [4 * px, col]]) {
        c.lineWidth = lw; c.strokeStyle = st; c.setLineDash(st === col ? [10 * px, 5 * px] : []);
        c.lineDashOffset = -clock * 0.03 * px;
        c.beginPath(); pts.forEach((q2, i) => i ? c.lineTo(q2[0], q2[1]) : c.moveTo(q2[0], q2[1])); c.stroke();
      }
      c.setLineDash([]);
      const tip = pts[pts.length - 1], prev = pts[Math.max(0, pts.length - 3)];
      const ang = Math.atan2(tip[1] - prev[1], tip[0] - prev[0]), s = 11 * px;
      c.save(); c.translate(tip[0], tip[1]); c.rotate(ang);
      c.beginPath(); c.moveTo(s, 0); c.lineTo(-s * 0.7, -s * 0.75); c.lineTo(-s * 0.35, 0); c.lineTo(-s * 0.7, s * 0.75); c.closePath();
      c.fillStyle = col; c.strokeStyle = 'rgba(5,10,16,.8)'; c.lineWidth = 1.5 * px; c.fill(); c.stroke(); c.restore();
    } });
  }
  function fxMove(from, tos, col, kind, delay, dur, opts = {}) {
    const units = tos.map((to, i) => ({ to, off: (Math.random() - 0.5) * 0.25, d: i * 0.05, m: ctrl(from, to, opts.bend != null ? opts.bend : (Math.random() - 0.5) * 0.15) }));
    return addFx({ delay, dur, onEnd: opts.onEnd, draw(c, p, px) {
      for (const u of units) {
        const t = clamp((p - u.d) / (1 - 0.3), 0, 1); if (p < u.d) continue;
        const e = kind === 'jet' ? t : ease(t);
        const pos = qbez(from, u.m, u.to, e), nxt = qbez(from, u.m, u.to, Math.min(1, e + 0.02));
        const ang = Math.atan2(nxt[1] - pos[1], nxt[0] - pos[0]);
        const fade = opts.fadeOut && t >= 1 ? Math.max(0, 1 - (p - 0.7 - u.d) / 0.3) : 1;
        c.globalAlpha = fade * (opts.alpha || 1);
        if (kind === 'tank') {
          c.fillStyle = 'rgba(150,130,100,.25)'; c.beginPath(); c.arc(pos[0] - Math.cos(ang) * 6 * px, pos[1] - Math.sin(ang) * 6 * px, 3.5 * px, 0, Math.PI * 2); c.fill();
          drawTank(c, pos[0], pos[1], ang, 4.2 * px, col);
        } else if (kind === 'ship') {
          c.strokeStyle = 'rgba(200,230,255,.35)'; c.lineWidth = 1.2 * px; c.beginPath();
          c.moveTo(pos[0] - Math.cos(ang) * 6 * px, pos[1] - Math.sin(ang) * 6 * px); c.lineTo(pos[0] - Math.cos(ang) * 16 * px, pos[1] - Math.sin(ang) * 16 * px); c.stroke();
          drawShip(c, pos[0], pos[1], ang, 4.5 * px, col);
        } else {
          c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1 * px; c.beginPath();
          c.moveTo(pos[0], pos[1]); c.lineTo(pos[0] - Math.cos(ang) * 18 * px, pos[1] - Math.sin(ang) * 18 * px); c.stroke();
          drawJet(c, pos[0], pos[1], ang, 5 * px, col);
        }
      }
    } });
  }
  function fxBoom(pt, delay, size = 1, sound = true) {
    const parts = Array.from({ length: 9 }, () => ({ a: Math.random() * Math.PI * 2, v: 0.5 + Math.random() }));
    return addFx({ delay, dur: 1100, onStart: () => { if (sound) boom(size); shake(size); }, draw(c, p, px) {
      const [x, y] = pt, s = size * px;
      // smoke
      c.globalAlpha = 0.45 * (1 - p); c.fillStyle = '#2a2f36';
      c.beginPath(); c.arc(x + 4 * s * p, y - 16 * s * p, (6 + 12 * p) * s, 0, Math.PI * 2); c.fill();
      // fireball
      c.globalCompositeOperation = 'lighter';
      const r = (4 + 20 * easeOut(Math.min(1, p * 1.6))) * s;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      const a = Math.max(0, 1 - p * 1.3);
      g.addColorStop(0, `rgba(255,255,220,${a})`); g.addColorStop(0.35, `rgba(255,190,60,${a * 0.9})`); g.addColorStop(0.7, `rgba(240,80,30,${a * 0.6})`); g.addColorStop(1, 'rgba(200,30,10,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      // sparks
      c.fillStyle = `rgba(255,210,120,${Math.max(0, 1 - p * 1.5)})`;
      for (const q2 of parts) { const d = q2.v * 26 * s * easeOut(p); c.beginPath(); c.arc(x + Math.cos(q2.a) * d, y + Math.sin(q2.a) * d, 1.3 * s, 0, Math.PI * 2); c.fill(); }
      c.globalCompositeOperation = 'source-over';
      // shockwave
      c.globalAlpha = 0.6 * (1 - p); c.strokeStyle = '#ffe2b0'; c.lineWidth = 1.5 * px;
      c.beginPath(); c.arc(x, y, 34 * s * easeOut(p), 0, Math.PI * 2); c.stroke();
    } });
  }
  function fxSkirmish(id, center, delay, dur, n = 14) {
    const spots = Array.from({ length: n }, () => ({ pt: interior(id, center, 40), t: Math.random() * 0.85 }));
    return addFx({ delay, dur, draw(c, p, px) {
      c.globalCompositeOperation = 'lighter';
      for (const s of spots) {
        const lp = (p - s.t) / 0.15; if (lp < 0 || lp > 1) continue;
        const r = (2 + 7 * lp) * px;
        c.fillStyle = `rgba(255,200,90,${1 - lp})`; c.beginPath(); c.arc(s.pt[0], s.pt[1], r, 0, Math.PI * 2); c.fill();
      }
      c.globalCompositeOperation = 'source-over';
    } });
  }
  function fxFlood(id, origin, newOwner, delay, dur, onEnd) {
    const b = MAIN[id].b; let R = 0;
    BYC[id].forEach(f => { const corners = [[f.bb[0], f.bb[1]], [f.bb[2], f.bb[1]], [f.bb[0], f.bb[3]], [f.bb[2], f.bb[3]]]; corners.forEach(([x, y]) => { R = Math.max(R, Math.hypot(x - origin[0], y - origin[1])); }); });
    R = Math.min(R, Math.hypot(b[1][0] - b[0][0], b[1][1] - b[0][1]) * 1.4 + 20);
    const col = colorOf(newOwner);
    return addFx({ delay, dur, onEnd: () => { shown[id] = newOwner; requestDraw(); if (onEnd) onEnd(); }, draw(c, p, px) {
      const r = R * easeOut(p);
      c.save(); c.clip(countryPath(id));
      c.fillStyle = col; c.beginPath(); c.arc(origin[0], origin[1], r, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 2.5 * px; c.stroke();
      c.restore();
    } });
  }
  function fxText(pt, text, col, delay, dur = 1400) {
    return addFx({ delay, dur, draw(c, p, px) {
      c.globalAlpha = p < 0.15 ? p / 0.15 : 1 - Math.max(0, (p - 0.6) / 0.4);
      c.font = `700 ${15 * px}px "Saira Condensed","Arial Narrow",sans-serif`; c.textAlign = 'center';
      const y = pt[1] - 26 * px * easeOut(p);
      c.lineWidth = 3.5 * px; c.strokeStyle = 'rgba(5,10,16,.9)'; c.strokeText(text, pt[0], y);
      c.fillStyle = col; c.fillText(text, pt[0], y);
    } });
  }
  function fxPulse(id, col, delay, dur = 900) {
    return addFx({ delay, dur, draw(c, p, px) {
      c.globalAlpha = Math.sin(p * Math.PI) * 0.45; c.fillStyle = col; c.fill(countryPath(id));
    } });
  }

  // ---------- screen shake ----------
  let shakeAmt = 0;
  function shake(size) {
    if (prefersReduced) return;
    shakeAmt = Math.min(6, shakeAmt + size * 2.2);
    const step = () => { if (shakeAmt < 0.2) { stage.style.transform = ''; shakeAmt = 0; return; } stage.style.transform = `translate(${(Math.random() - 0.5) * shakeAmt}px,${(Math.random() - 0.5) * shakeAmt}px)`; shakeAmt *= 0.82; requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- sound (WebAudio, synthesised) ----------
  let actx = null, soundOn = true, lastBoom = 0;
  try { soundOn = localStorage.getItem('td-sound') !== 'off'; } catch (e) { /* ignore */ }
  const sndBtn = $('#sndBtn');
  const syncSnd = () => sndBtn.setAttribute('aria-pressed', String(soundOn));
  syncSnd();
  sndBtn.addEventListener('click', () => { soundOn = !soundOn; syncSnd(); try { localStorage.setItem('td-sound', soundOn ? 'on' : 'off'); } catch (e) { /* ignore */ } });
  function audio() {
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; } }
    if (actx && actx.state === 'suspended') actx.resume();
    return actx;
  }
  function boom(size = 1) {
    if (!soundOn || speed > 2) return;
    const now = performance.now(); if (now - lastBoom < 90) return; lastBoom = now;
    const a = audio(); if (!a) return;
    const len = 1.1, buf = a.createBuffer(1, a.sampleRate * len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.2);
    const src = a.createBufferSource(); src.buffer = buf;
    const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(1200, a.currentTime); f.frequency.exponentialRampToValueAtTime(80, a.currentTime + len);
    const g = a.createGain(); g.gain.setValueAtTime(0.0001, a.currentTime); g.gain.exponentialRampToValueAtTime(0.35 * Math.min(1.5, size), a.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + len);
    src.connect(f).connect(g).connect(a.destination); src.start();
  }
  function rumble() {
    if (!soundOn || speed > 2) return;
    const a = audio(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain(); o.type = 'sawtooth'; o.frequency.value = 42;
    const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 160;
    g.gain.setValueAtTime(0.0001, a.currentTime); g.gain.exponentialRampToValueAtTime(0.08, a.currentTime + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 1.6);
    o.connect(f).connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + 1.7);
  }

  // ---------- composite animations ----------
  function playInvasion(rep, delay, tempo = 1, onDone) {
    const s = 1 / tempo;
    const att = rep.att, tgt = rep.tgt;
    const from = rep.from != null && rep.from >= 0 ? rep.from : nearestOwn(att, tgt).from;
    const col = colorOf(att);
    const tc = MAIN[tgt].c, fc = MAIN[from >= 0 ? from : att].c;
    const fEdge = from >= 0 ? edgeToward(from, tc) : fc;
    const entry = edgeToward(tgt, fEdge);
    const start = [lerp(fEdge[0], fc[0], 0.18), lerp(fEdge[1], fc[1], 0.18)];
    const isP = att === S.P || rep.def === S.P;
    let t = delay;

    if (rep.kind === 'air') {
      const jets = 3 + Math.min(3, Math.round((rep.commit.ftr || 0) / 150));
      const hits = Array.from({ length: 4 + Math.round(rep.gain / 3) }, () => interior(tgt));
      fxMove(start, hits.slice(0, jets).map(h => [h[0] + (Math.random() - 0.5) * 10, h[1] + (Math.random() - 0.5) * 10]), col, 'jet', t, 1100 * s, { bend: 0.08, fadeOut: true });
      hits.forEach((h, i) => fxBoom(h, t + 900 * s + i * 140 * s, 0.9 + Math.random() * 0.5, isP || i < 2));
      const end = t + 900 * s + hits.length * 140 * s + 900;
      fxText(tc, rep.gain > 0 ? `LUFTSCHLAG +${nf0.format(rep.gain)} %` : 'ABGEFANGEN', rep.gain > 0 ? COL.gold : COL.hostile, end - 700);
      afterFx(end - delay + delay, () => { if (onDone) onDone(); requestDraw(); });
      return end - delay;
    }

    fxArrow(start, entry, col, t, 3600 * s);
    t += 350 * s;
    const sea = rep.rtype === 'sea' || rep.rtype === 'strait';
    const dests = Array.from({ length: 8 }, () => interior(tgt, entry, 70));
    if (sea) {
      const coast = entry;
      fxMove(start, Array.from({ length: 4 }, () => [coast[0] + (Math.random() - 0.5) * 14, coast[1] + (Math.random() - 0.5) * 14]), col, 'ship', t, 1300 * s, { bend: 0.22 });
      t += 1100 * s;
      fxMove(coast, dests, col, 'tank', t, 1200 * s, { fadeOut: !rep.conquered });
    } else {
      afterFx(t - clockOffset(), () => { if (isP) rumble(); });
      fxMove(start, dests, col, 'tank', t, 1500 * s, { fadeOut: !rep.conquered });
    }
    // air support
    if ((rep.commit.ftr || 0) + (rep.commit.bmb || 0) > 0) {
      const hits = Array.from({ length: 2 + (rep.phases.find(p => p.k === 'air' && p.win) ? 2 : 0) }, () => interior(tgt, entry, 90));
      fxMove(start, hits, col, 'jet', t, 900 * s, { bend: 0.05, fadeOut: true, alpha: 0.95 });
      hits.forEach((h, i) => fxBoom(h, t + 750 * s + i * 120 * s, 0.8, isP));
    }
    t += sea ? 700 * s : 1100 * s;
    fxSkirmish(tgt, entry, t, 1100 * s);
    fxBoom(interior(tgt, entry, 40), t + 300 * s, 0.7, isP);
    t += 1000 * s;
    if (rep.conquered) {
      fxFlood(tgt, entry, att, t, 1000 * s);
      fxText(tc, `${C[tgt].n.toUpperCase()} EROBERT`, rep.att === S.P ? COL.gold : COL.ink, t + 500 * s, 1800);
      t += 1000 * s;
    } else if (rep.repulsed) {
      fxText(entry, 'LANDUNG ABGEWEHRT', COL.hostile, t - 400 * s);
    } else if (rep.gain > 0) {
      fxPulse(tgt, COL.warn, t - 200 * s);
      fxText(entry, `+${nf0.format(rep.gain)} %  (${nf0.format(rep.progress)} %)`, COL.warn, t - 200 * s);
    } else {
      fxText(entry, 'ANGRIFF GESCHEITERT', COL.hostile, t - 400 * s);
    }
    afterFx(t - delay + delay, () => { if (onDone) onDone(); });
    return t - delay;
  }
  const clockOffset = () => 0;

  // ---------- picking & tooltip ----------
  function pick(sx, sy) {
    const [wx, wy] = T.invert([sx, sy]);
    for (const i of tiny) { const [x, y] = MAIN[i].c; if (Math.hypot(x - wx, y - wy) < 9 / T.k) return i; }
    for (let j = FEAT.length - 1; j >= 0; j--) {
      const f = FEAT[j];
      if (wx < f.bb[0] || wx > f.bb[2] || wy < f.bb[1] || wy > f.bb[3]) continue;
      if (hctx.isPointInPath(featPath(f, 2), wx, wy)) return f.id;
    }
    return null;
  }
  const tip = $('#tip');
  let tipRaf = 0, lastMove = null;
  cvFx.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch' || e.buttons) return;
    lastMove = e;
    if (tipRaf) return;
    tipRaf = requestAnimationFrame(() => {
      tipRaf = 0; const ev = lastMove; const r = cvFx.getBoundingClientRect();
      const i = pick(ev.clientX - r.left, ev.clientY - r.top);
      if (i !== hover) { hover = i; requestDraw(); }
      cvFx.classList.toggle('hover', i != null);
      if (i == null || !S) { hideTip(); return; }
      const o = S.owner[i];
      tip.innerHTML = `<b>${esc(C[i].n)}</b>${o !== i ? `<div class="o">besetzt von ${esc(ownerName(o))}</div>` : ''}${S.prog[i] ? `<div class="o">Kriegsfortschritt ${pct(S.prog[i].v)}</div>` : ''}`;
      tip.hidden = false;
      let x = ev.clientX - r.left + 14, y = ev.clientY - r.top + 14;
      if (x + tip.offsetWidth > r.width - 8) x = ev.clientX - r.left - tip.offsetWidth - 14;
      tip.style.left = x + 'px'; tip.style.top = y + 'px';
    });
  });
  cvFx.addEventListener('pointerleave', () => { hideTip(); if (hover != null) { hover = null; requestDraw(); } });
  function hideTip() { tip.hidden = true; }
  cvFx.addEventListener('click', e => {
    if (!S) return;
    const r = cvFx.getBoundingClientRect();
    select(pick(e.clientX - r.left, e.clientY - r.top));
  });

  // =====================================================================
  //  UI – ticker & powers
  // =====================================================================
  const tickerEl = $('#ticker');
  function ticker(type, text, rep) {
    const el = document.createElement('div');
    el.className = 'tk ' + type;
    el.innerHTML = `<span class="txt">${esc(text)}</span>${rep ? '<button type="button">Bericht</button>' : ''}`;
    if (rep) el.querySelector('button').addEventListener('click', () => showReport(rep));
    tickerEl.prepend(el);
    while (tickerEl.children.length > (cw < 860 ? 3 : 6)) tickerEl.lastChild.remove();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 420); }, type === 'bad' ? 9000 : 6000);
  }
  function renderPowers() {
    if (!S) { $('#powers').innerHTML = ''; return; }
    const r = powersRanking();
    const top = r.slice(0, 5);
    if (!top.some(p => p.o === S.P)) { const me = r.find(p => p.o === S.P); if (me) top.push(me); }
    const goal = Math.ceil(N * WIN_SHARE);
    $('#powers').innerHTML = `<div class="ph"><span>Weltmächte</span><span>Ziel ${goal}</span></div>` + top.map(p => `
      <div class="pw ${p.o === S.P ? 'me' : ''}" style="color:${colorOf(p.o)}"><i style="background:${colorOf(p.o)}"></i>
      <span class="n">${esc(p.o === S.P ? C[p.o].n + ' (Du)' : C[p.o].n)}</span><span class="v">${p.n}</span>
      <span class="goal"><b style="width:${Math.min(100, p.n / goal * 100)}%"></b></span></div>`).join('') +
      `<div class="foot">${r.length} unabhängige Mächte · Spannung ${tensionTxt()}</div>`;
    const rival = r.find(p => p.o !== S.P);
    $('#hudRival').textContent = rival ? `${C[rival.o].n} ${rival.n}` : '–';
  }
  const tensionTxt = () => S.tension < 3 ? 'gering' : S.tension < 10 ? 'erhöht' : S.tension < 20 ? 'hoch' : 'extrem';

  // =====================================================================
  //  UI – panel
  // =====================================================================
  const panel = $('#panel');
  function select(i) {
    sel = i;
    requestDraw();
    if (i == null) { panel.classList.remove('open'); stage.classList.remove('panel-open'); return; }
    renderPanel();
    panel.classList.add('open'); stage.classList.add('panel-open');
    panel.scrollTop = 0;
  }

  function milTable(m) {
    const groups = [
      ['Heer', ['sol', 'res', 'tank', 'afv', 'art', 'mlrs']],
      ['Luftwaffe', ['ftr', 'bmb', 'heli']],
      ['Marine', ['cv', 'amph', 'dd', 'ff', 'cor', 'ss']],
      ['Strategisch', ['nuk']],
    ];
    let h = '<table class="mil"><tbody>';
    groups.forEach(([g, ks]) => {
      h += `<tr class="grp"><td colspan="2">${g}</td></tr>`;
      ks.forEach(k => { const v = m[k] || 0; h += `<tr class="${v <= 0 ? 'zero' : ''}"><td>${U[k].n}</td><td class="n">${fmtUnit(k, v)}</td></tr>`; });
    });
    return h + '</tbody></table>';
  }
  const powerBox = (m, t) => `<div class="power">
      <div><div class="k">Boden</div><div class="v">${fmt(landP(m, t))}</div></div>
      <div><div class="k">Luft</div><div class="v">${fmt(airP(m, t))}</div></div>
      <div><div class="k">See</div><div class="v">${fmt(seaP(m, t))}</div></div></div>`;

  function quickCommit(kind, rtype) {
    const av = avail(), st = S.prefs, commit = zero();
    if (kind === 'invade') {
      LAND.forEach(k => { commit[k] = roundUnit(k, av[k] * st.land / 100); });
      AIR.forEach(k => { commit[k] = roundUnit(k, av[k] * st.air / 100); });
      if (rtype !== 'land') SEA.forEach(k => { commit[k] = roundUnit(k, av[k] * st.sea / 100); });
    } else AIR.forEach(k => { commit[k] = roundUnit(k, av[k] * Math.max(st.air, 60) / 100); });
    return commit;
  }
  function oddsLabel(ratio, kind) {
    if (kind === 'air') return ratio > 2 ? ['Luftüberlegenheit', 4] : ratio > 1 ? ['Vorteil', 3] : ratio > 0.5 ? ['Verlustreich', 2] : ['Selbstmordkommando', 1];
    return ratio >= 2.4 ? ['Erdrückend', 4] : ratio >= 1.4 ? ['Überlegen', 3] : ratio >= 0.9 ? ['Ausgeglichen', 2] : ['Sehr riskant', 1];
  }

  function renderPanel() {
    const i = sel; if (i == null || !S) return;
    const c = C[i], o = S.owner[i];
    const pool = S.pools[o];
    const mine = o === S.P;
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
      <div class="chips">${chips.join('')}</div>`;

    if (!mine) {
      const p = S.prog[i];
      if (p) h += `<div class="note" style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Kriegsfortschritt ${p.by === S.P ? '(deine Offensive)' : '– ' + esc(ownerName(p.by))}</span><b>${pct(p.v)}</b></div><div class="bar"><i style="width:${p.v}%"></i></div>`;
      const r = route(S.P, i);
      const ar = airRange(S.P), md = nearestOwn(S.P, i).d;
      h += `<h3 class="sec">Operation</h3>`;
      if (S.over) h += `<div class="note">Das Spiel ist beendet.</div>`;
      else {
        if (r.type !== 'none') {
          const est = battle(S.P, i, quickCommit('invade', r.type), r.type, true);
          const [lbl, cls] = est.repulsed ? ['Seeschlacht verloren', 1] : oddsLabel(est.ratio, 'invade');
          h += `<div class="route">Angriffsweg: <b>${ROUTE_TXT[r.type]}</b> von ${esc(C[r.from].n)}${r.d ? ` · ${nf0.format(r.d)} km` : ''}</div>
            <div class="odds o${cls}" style="margin:8px 0"><div><div class="eyebrow">Lage (Standardeinsatz)</div><div class="big">${lbl}</div></div><div class="note" style="margin-left:auto;text-align:right">+${pct(est.gain)} Fortschritt</div></div>`;
        } else if (r.landlocked) h += `<div class="route">Binnenland: nur über eine gemeinsame Landgrenze angreifbar. Erobere zuerst ein Nachbarland.</div>`;
        else h += `<div class="route">Außer Reichweite (${nf0.format(r.d)} km, deine Seereichweite ${nf0.format(seaRange(S.P))} km).</div>`;
        h += `<div class="actions">
          <button class="btn danger" type="button" data-act="quick" ${r.type === 'none' || busy ? 'disabled' : ''}>Angreifen!</button>
          <button class="btn" type="button" data-act="tac" ${r.type === 'none' || busy ? 'disabled' : ''}>⚔ 3D-Schlacht</button>
          <button class="btn" type="button" data-act="invade" ${r.type === 'none' || busy ? 'disabled' : ''}>Planen…</button>
          <button class="btn" type="button" data-act="air" ${md > ar || busy ? 'disabled' : ''}>Luftschlag</button></div>`;
        if (md > ar) h += `<div class="note" style="margin-top:6px">Luftschlag außer Reichweite (${nf0.format(ar)} km). Bomber oder Flugzeugträger erhöhen die Reichweite.</div>`;
      }
    } else {
      const p = S.prog[i];
      if (p) h += `<div class="note warn" style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Feindliche Offensive – ${esc(ownerName(p.by))}</span><b>${pct(p.v)}</b></div><div class="bar"><i style="width:${p.v}%"></i></div>`;
    }
    h += `<div class="kv" style="margin-top:16px">
        <div><div class="k">Bevölkerung</div><div class="v">${nf1.format(c.pop)} Mio.</div></div>
        <div><div class="k">BIP</div><div class="v">${money(c.gdp)}</div></div>
        <div><div class="k">Militärbudget</div><div class="v">${money(c.bud)}</div></div>
        <div><div class="k">Gelände-Bonus</div><div class="v">${terPct > 0 ? '+' + terPct + ' % Verteid.' : 'keiner'}</div></div>
      </div>`;
    const occNote = occupied || terrOf(o).length > 1 ? `Gesamtkräfte von ${esc(ownerName(o))}` : (S.turn > 0 ? 'aktueller Stand' : 'Stand 2024/25');
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
    else if (a === 'quick') { const r = route(S.P, sel); launch(sel, 'invade', r.type, quickCommit('invade', r.type)); }
    else if (a === 'tac') { const r = route(S.P, sel); startTactical(sel, r.type, quickCommit('invade', r.type)); }
    else if (a === 'invade') openAttack(sel, 'invade');
    else if (a === 'air') openAttack(sel, 'air');
  });

  // launch an attack: resolve instantly, animate, then report
  let playerAnims = 0;
  function launch(t, kind, rtype, commit) {
    if (BUYABLE.every(k => !commit[k])) { ticker('bad', 'Keine einsatzbereiten Einheiten für diesen Angriff – nächste Runde abwarten oder nachkaufen.'); return; }
    const from = nearestOwn(S.P, t).from;
    const rep = applyBattle(kind === 'invade' ? battle(S.P, t, commit, rtype, false) : airStrike(S.P, t, commit, false));
    rep.from = from;
    afterPlayerBattle(rep, t, kind, tempo());
    audio();
  }
  function afterPlayerBattle(rep, t, kind, tp) {
    const text = rep.conquered ? `${C[t].n} kapituliert und gehört nun zu deinem Reich.` : rep.repulsed ? `Landung in ${C[t].n} auf See abgewehrt.` : `${kind === 'invade' ? 'Angriff' : 'Luftschlag'} auf ${C[t].n}: Fortschritt ${pct(rep.progress)}.`;
    const type = rep.conquered ? 'good' : (rep.gain > 0 ? 'info' : 'bad');
    log(type, text, rep);
    checkEnd();
    save();
    playerAnims++;
    computeAttackable(); renderHud(); renderPowers();
    if (sel != null) renderPanel();
    playInvasion(rep, 0, tp, () => {
      playerAnims--;
      ticker(type, text, rep);
      if (rep.conquered) { shown[t] = S.P; }
      renderAll();
      if (S.over) showEnd();
    });
  }

  // =====================================================================
  //  UI – modal
  // =====================================================================
  const modal = $('#modal'), modalBody = $('#modalBody');
  let onModalClose = null;
  function openModal(html, onClose) { modalBody.innerHTML = html; modal.hidden = false; modal.scrollTop = 0; onModalClose = onClose || null; }
  function closeModal() { modal.hidden = true; modalBody.innerHTML = ''; const f = onModalClose; onModalClose = null; if (f) f(); }
  $('#modalX').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
    else if ((e.key === 'e' || e.key === 'E') && modal.hidden && S && startEl.hidden && btEl.hidden && document.activeElement.tagName !== 'INPUT') endTurn();
  });

  function openAttack(t, kind) {
    const r = route(S.P, t);
    const av = avail();
    const st = { land: kind === 'invade' ? S.prefs.land : 0, air: kind === 'invade' ? S.prefs.air : Math.max(60, S.prefs.air), sea: kind === 'invade' && r.type !== 'land' ? S.prefs.sea : 0 };
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
      $('#atkDyn').innerHTML = `${brHtml}${extra}
        <div class="odds o${cls}"><div><div class="eyebrow">Lagebeurteilung</div><div class="big">${lbl}</div></div>
          <div class="note" style="margin-left:auto;text-align:right">${kind === 'invade' ? `Kräfteverhältnis Boden ${nf1.format(est.ratio)} : 1<br>erwarteter Fortschritt +${pct(est.gain)}` : `Erwarteter Fortschritt +${pct(est.gain)}`}</div></div>
        ${(d.m.nuk || 0) > 0 && kind === 'invade' ? '<div class="note warn">Achtung: Atommacht. Ab 60 % Kriegsfortschritt droht nukleare Eskalation, die deine Offensive zurückwirft.</div>' : ''}`;
      modalBody.querySelectorAll('input[type=range]').forEach(inp => inp.addEventListener('input', () => { st[inp.dataset.b] = +inp.value; render(); }));
    };
    const def = S.owner[t];
    openModal(`<div class="eyebrow">${kind === 'invade' ? 'Operationsplanung · ' + ROUTE_TXT[r.type] : 'Luftoperation'}</div>
      <h2>${kind === 'invade' ? 'Invasion' : 'Luftschlag gegen'} ${esc(C[t].n)}</h2>
      <p class="sub">Verteidiger: ${esc(ownerName(def))} · Technologie ${Math.round(S.pools[def].t * 100)}/100 vs. deine ${Math.round(S.pools[S.P].t * 100)}/100. Deine Einstellung wird für „Angreifen!“ gespeichert.</p>
      <div id="atkDyn"></div>
      <div class="actions" style="justify-content:flex-end"><button class="btn ghost" type="button" id="atkCancel">Abbrechen</button>${kind === 'invade' ? '<button class="btn primary" type="button" id="atkTac">⚔ 3D-Schlacht</button>' : ''}<button class="btn danger" type="button" id="atkGo">${kind === 'invade' ? 'Angriff befehlen' : 'Luftschlag befehlen'}</button></div>`);
    render();
    $('#atkCancel').addEventListener('click', closeModal);
    const tacBtn = $('#atkTac');
    if (tacBtn) tacBtn.addEventListener('click', () => {
      const commit = mk();
      S.prefs.land = st.land; S.prefs.air = st.air; if (r.type !== 'land') S.prefs.sea = st.sea;
      closeModal();
      startTactical(t, r.type, commit);
    });
    $('#atkGo').addEventListener('click', () => {
      const commit = mk();
      if (kind === 'invade') { S.prefs.land = st.land; S.prefs.air = st.air; if (r.type !== 'land') S.prefs.sea = st.sea; }
      closeModal();
      launch(t, kind, r.type, commit);
    });
  }

  function lossTable(loss) {
    const ks = KEYS.filter(k => loss[k] > 0);
    if (!ks.length) return '<div class="note">Keine nennenswerten Verluste.</div>';
    return `<table class="mil"><tbody>${ks.map(k => `<tr><td>${U[k].n}</td><td class="n">−${fmtUnit(k, loss[k])}</td></tr>`).join('')}</tbody></table>`;
  }

  function showReport(rep) {
    const PH = { sea: 'Seeschlacht', air: 'Luftkampf', land: 'Bodenkampf' };
    const attN = ownerName(rep.att), defN = C[rep.prevOwner != null ? rep.prevOwner : rep.def].n;
    const phases = rep.phases.map(p => {
      const a = Math.max(0.0001, p.a), d = Math.max(0.0001, p.d), s = a / (a + d) * 100;
      return `<div class="phase"><div class="ph">${PH[p.k]}</div><div class="vs" title="${fmt(p.a)} gegen ${fmt(p.d)}"><i style="width:${s}%"></i><i style="width:${100 - s}%"></i></div>
        <div class="res ${p.win ? 'win' : 'lose'}">${p.win ? 'Angreifer siegt' : 'Verteidiger hält'} · ${fmt(p.a)} : ${fmt(p.d)}</div></div>`;
    }).join('');
    let outcome, cls;
    const mineAtt = rep.att === S.P;
    if (rep.conquered) { outcome = `${C[rep.tgt].n} kapituliert.`; cls = mineAtt ? 'win' : 'lose'; }
    else if (rep.repulsed) { outcome = 'Die Landung wurde auf See abgewehrt.'; cls = mineAtt ? 'lose' : 'win'; }
    else if (rep.gain > 0) { outcome = `Vorstoß gelungen: Kriegsfortschritt ${pct(rep.progress)}.`; cls = 'mid'; }
    else { outcome = 'Der Angriff ist gescheitert.'; cls = mineAtt ? 'lose' : 'win'; }
    let capHtml = '';
    if (rep.captured) {
      const ks = BUYABLE.filter(k => rep.captured[k] > 0);
      if (ks.length) capHtml = `<h3 class="sec">Erbeutet</h3><div class="note">${ks.map(k => `${fmtUnit(k, rep.captured[k])} ${U[k].n}`).join(' · ')}</div>`;
    }
    openModal(`<div class="eyebrow">Gefechtsbericht</div>
      <h2>${rep.kind === 'air' ? 'Luftschlag' : 'Schlacht'} um ${esc(C[rep.tgt].n)}</h2>
      <p class="sub">${esc(attN)} (gelb) gegen ${esc(defN)} (rot)${rep.rtype && rep.rtype !== 'land' ? ' · ' + ROUTE_TXT[rep.rtype] : ''}</p>
      ${phases}
      ${rep.landCap < 0.99 && !rep.repulsed ? `<div class="note warn" style="margin-top:8px">Nur ${pct(rep.landCap * 100)} der Bodentruppen konnten anlanden.</div>` : ''}
      ${rep.nuke ? `<div class="note warn" style="margin-top:8px"><b>Nukleare Eskalation:</b> ${esc(defN)} hat mit Atomwaffen gedroht und taktische Schläge gegen Aufmarschgebiete geführt. Die Offensive wurde zurückgeworfen.</div>` : ''}
      <div class="outcome ${cls}">${outcome}</div>
      ${!rep.conquered ? `<div class="bar"><i style="width:${rep.progress || 0}%"></i></div>` : ''}
      <div class="loss2">
        <div><h3 class="sec">Verluste ${esc(attN)}</h3>${lossTable(rep.lossA)}</div>
        <div><h3 class="sec">Verluste ${esc(defN)}</h3>${lossTable(rep.lossD)}</div>
      </div>
      ${capHtml}
      <div class="actions" style="justify-content:flex-end;margin-top:16px"><button class="btn primary" type="button" id="repOk">Schließen</button></div>`);
    $('#repOk').addEventListener('click', closeModal);
  }

  function showLog() {
    const TAG = { good: 'Erfolg', bad: 'Alarm', info: 'Welt', me: 'Info' };
    openModal(`<div class="eyebrow">Kriegstagebuch</div><h2>Lagebericht</h2>
      <div>${S.log.map((e, idx) => `<div class="ev ${e.type}"><span class="tag2">${dateStr(e.turn).replace(/ \d{4}$/, '')}</span><span class="txt">${esc(e.text)}${e.rep ? ` <button class="btn sm ghost" type="button" data-rep="${idx}">Bericht</button>` : ''}</span></div>`).join('')}</div>
      <div class="actions" style="justify-content:space-between;margin-top:16px"><button class="btn ghost" type="button" id="newGame">Neues Spiel</button><button class="btn primary" type="button" id="logOk">Schließen</button></div>`);
    $('#logOk').addEventListener('click', closeModal);
    $('#newGame').addEventListener('click', () => { clearSave(); S = null; closeModal(); select(null); showStart(); });
    modalBody.querySelectorAll('[data-rep]').forEach(b => b.addEventListener('click', () => showReport(S.log[+b.dataset.rep].rep)));
  }

  function showEnd() {
    const goal = Math.ceil(N * WIN_SHARE);
    let title, sub;
    if (S.won && S.endReason === 'share') { title = 'Weltherrschaft errungen'; sub = `Von ${esc(C[S.P].n)} aus kontrollierst du nach ${S.turn} Monaten ${terrOf(S.P).length} von ${N} Ländern (Ziel: ${goal}).`; }
    else if (S.won) { title = 'Die ganze Welt gehört dir'; sub = `Alle ${N} Länder in ${S.turn} Monaten.`; }
    else if (S.endReason === 'rival') { title = `${esc(C[S.rival].n)} beherrscht die Welt`; sub = `Ein Rivale kontrolliert ${goal} oder mehr Länder. Dein Reich hält noch ${terrOf(S.P).length}.`; }
    else { title = 'Dein Reich ist gefallen'; sub = `Nach ${S.turn} Monaten ist das letzte Territorium verloren.`; }
    openModal(`<div class="eyebrow">${dateStr(S.turn)}</div><h2>${title}</h2><p class="sub">${sub}</p>
      <div class="actions" style="justify-content:flex-end">${S.won && S.endReason === 'share' ? '<button class="btn" type="button" id="endGo">Weiterspielen bis zur ganzen Welt</button>' : ''}<button class="btn primary" type="button" id="endNew">Neues Spiel</button></div>`);
    $('#endNew').addEventListener('click', () => { clearSave(); S = null; closeModal(); select(null); showStart(); });
    const go = $('#endGo'); if (go) go.addEventListener('click', () => { S.over = false; S.keepPlaying = true; save(); closeModal(); renderAll(); });
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
    document.documentElement.style.setProperty('--me', CFG.color);
    $('#hudDate').textContent = dateStr(S.turn);
    $('#hudMoney').textContent = money(S.money);
    $('#hudIncome').textContent = '+' + money(income());
    $('#hudLands').textContent = `${mine.length} / ${Math.ceil(N * WIN_SHARE)}`;
    $('#hudPop').textContent = pct(mine.reduce((s, t) => s + C[t].pop, 0) / WORLD_POP * 100);
    const be = $('#btnEnd');
    be.disabled = S.over;
    be.textContent = busy ? 'Überspringen ⏩' : 'Runde beenden';
    be.classList.toggle('busy', busy);
  }
  function renderAll() { computeAttackable(); requestDraw(); renderHud(); renderPowers(); if (sel != null) renderPanel(); }

  $('#btnEnd').addEventListener('click', () => { audio(); endTurn(); });
  $('#btnForces').addEventListener('click', () => S && showForces());
  $('#btnLog').addEventListener('click', () => S && showLog());
  $('#hudName').addEventListener('click', () => S && showLog());
  $('#zIn').addEventListener('click', () => fxSel.transition().duration(250).call(zoom.scaleBy, 1.6));
  $('#zOut').addEventListener('click', () => fxSel.transition().duration(250).call(zoom.scaleBy, 1 / 1.6));
  $('#zHome').addEventListener('click', () => S && zoomTo(S.P, 4));

  // =====================================================================
  //  START SCREEN
  // =====================================================================
  const startEl = $('#start'), listEl = $('#countryList');
  let openRow = null;
  function showStart() {
    startEl.hidden = false;
    shown = C.map((_, i) => i); requestDraw();
    renderPowers();
    const sv = loadSave();
    $('#resumeBox').innerHTML = sv ? `<button class="btn primary" type="button" id="resume">Spiel fortsetzen: ${esc(C[sv.P].n)} · ${dateStr(sv.turn)}</button><span class="note">oder unten ein neues Land wählen</span>` : '';
    if (sv) $('#resume').addEventListener('click', () => { S = sv; terrCache = null; shown = S.owner.slice(); startEl.hidden = true; afterStart(); });
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
    audio();
    afterStart(true);
  }
  function afterStart(fresh) {
    resize();
    homeZoom();
    renderAll();
    select(S.P);
    setTimeout(() => zoomTo(S.P, 4, 900), 60);
    if (fresh) setTimeout(() => {
      openModal(`<div class="eyebrow">Einsatzbefehl · ${dateStr(0)}</div><h2>Oberkommando ${esc(C[S.P].n)}</h2>
      <p class="sub">Deine Streitkräfte entsprechen dem realen Stand. Alle anderen Mächte spielen ebenfalls auf Weltherrschaft: Wer zuerst ${Math.ceil(N * WIN_SHARE)} Länder (60 %) kontrolliert, gewinnt.</p>
      <div class="ev"><span class="tag2">1</span><span class="txt">Tippe ein rot umrandetes Land an und drücke <b>Angreifen!</b> Deine Panzer rollen über die Grenze. Mit <b>Planen…</b> stellst du Heer, Luftwaffe und Marine selbst ein.</span></div>
      <div class="ev"><span class="tag2">2</span><span class="txt">Jeder Angriff erhöht den <b>Kriegsfortschritt</b>. Bei 100 % kapituliert das Land, färbt sich in deiner Farbe, und du erbeutest Ausrüstung.</span></div>
      <div class="ev"><span class="tag2">3</span><span class="txt"><b>Luftschläge</b> zerstören Gerät aus der Distanz. Inseln erreichst du nur mit Marine und Landungsschiffen.</span></div>
      <div class="ev"><span class="tag2">4</span><span class="txt">Mit <b>Runde beenden</b> (Taste E) ziehen die KI-Mächte. Ihre Feldzüge siehst du live auf der Karte, die Rangliste oben rechts zeigt, wer vorne liegt.</span></div>
      <div class="ev"><span class="tag2">5</span><span class="txt">Unter <b>Streitkräfte</b> kaufst du Nachschub. Wer zu schnell erobert, wird zum Ziel aller, und besetzte Länder können rebellieren.</span></div>
      <div class="actions" style="justify-content:flex-end;margin-top:14px"><button class="btn primary" type="button" id="goOk">Los geht's</button></div>`);
      $('#goOk').addEventListener('click', closeModal);
    }, 950);
  }

/*TACTICAL*/
  let rzT = 0;
  window.addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(resize, 80); });

  // initial background map behind the start screen
  resize(); homeZoom();
  showStart();
  // debugging / testing hook
  window.__td = { get TB() { return TB; }, get S() { return S; }, pick, endTurn, get busy() { return busy; }, C, screen: i => T.apply(MAIN[i].c), idx: n => C.findIndex(c => c.n === n), get fx() { return FX.length; } };
})();
