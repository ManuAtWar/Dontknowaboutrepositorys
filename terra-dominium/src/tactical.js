  // =====================================================================
  //  TACTICAL BATTLE – send squads, fight to the last unit
  // =====================================================================
  const TU = {
    inf:  { n: 'Infanterie',   hint: 'stark gg. Artillerie, mit Fliegerfaust', keys: ['sol'],         hp: 60,  dmg: 7,  rof: 0.9, range: 80,  speed: 26, layer: 0, vs: { inf: 1, tank: 0.3, art: 1.3, heli: 0.55, jet: 0.3, bunker: 0.2, aa: 0.7 } },
    tank: { n: 'Panzer',       hint: 'stark gg. Infanterie & Artillerie',      keys: ['tank', 'afv'], hp: 240, dmg: 30, rof: 1.7, range: 125, speed: 33, layer: 0, vs: { inf: 1.3, tank: 1, art: 1.5, heli: 0.15, jet: 0.05, bunker: 1.0, aa: 1.3 } },
    art:  { n: 'Artillerie',   hint: 'große Reichweite, Flächenschaden',       keys: ['art', 'mlrs'], hp: 70,  dmg: 34, rof: 2.8, range: 340, minR: 70, speed: 15, layer: 0, splash: 32, vs: { inf: 1.2, tank: 0.8, art: 1, heli: 0, jet: 0, bunker: 1.3, aa: 1.3 } },
    heli: { n: 'Hubschrauber', hint: 'Panzerjäger, verwundbar durch Jets',      keys: ['heli'],        hp: 130, dmg: 24, rof: 1.1, range: 150, speed: 52, layer: 1, vs: { inf: 1, tank: 1.8, art: 1.5, heli: 0.8, jet: 0.25, bunker: 0.7, aa: 1.0 } },
    jet:  { n: 'Kampfjets',    hint: 'Luftüberlegenheit, schnelle Angriffe',    keys: ['ftr', 'bmb'],  hp: 120, dmg: 30, rof: 1.3, range: 185, speed: 95, layer: 2, vs: { inf: 0.35, tank: 0.55, art: 0.7, heli: 1.5, jet: 1.2, bunker: 0.8, aa: 1.0 } },
    bunker: { n: 'Bunker',        hint: 'Befestigung', keys: [], fort: true, hp: 650, dmg: 20, rof: 0.7, range: 155, speed: 0, layer: 0, vs: { inf: 1.6, tank: 0.6, art: 0.8, heli: 0.35, jet: 0 } },
    aa:     { n: 'Flak-Stellung', hint: 'Befestigung', keys: [], fort: true, hp: 230, dmg: 26, rof: 0.45, range: 290, speed: 0, layer: 0, vs: { heli: 2.0, jet: 1.8 } },
  };
  const TT = Object.keys(TU);
  const FW = 1000, FH = 560, HOLD_X = 610, TIME_LIMIT = 150;
  const btEl = $('#battle');
  let TB = null;

  function sideRaw(m, t, isDef, c, landCap) {
    const qq = q(t);
    return {
      inf: ((m.sol || 0) + (isDef ? (m.res || 0) * U.res.w : 0)) * qq * landCap + (isDef ? c.pop * 0.4 : 0),
      tank: ((m.tank || 0) * U.tank.w + (m.afv || 0) * U.afv.w) * qq * landCap,
      art: ((m.art || 0) * U.art.w + (m.mlrs || 0) * U.mlrs.w) * qq * landCap,
      heli: (m.heli || 0) * U.heli.w * qq,
      jet: ((m.ftr || 0) * U.ftr.w + (m.bmb || 0) * U.bmb.w) * qq * 0.3,
    };
  }
  const z5 = () => ({ inf: 0, tank: 0, art: 0, heli: 0, jet: 0, bunker: 0, aa: 0 });

  function startTactical(t, rtype, commit) {
    if (BUYABLE.every(k => !commit[k])) { ticker('bad', 'Keine einsatzbereiten Einheiten – nächste Runde abwarten oder nachkaufen.'); return; }
    const def = S.owner[t], Dp = S.pools[def], c = C[t];
    const dm = scaleM(Dp.m, deployShare(def, t));
    const tA = S.pools[S.P].t, tD = Dp.t;
    const rep = { kind: 'invade', tactical: true, att: S.P, def, tgt: t, rtype, commit: { ...commit }, lossA: zero(), lossD: zero(), phases: [], landCap: 1 };
    const nv = navalPhase(rep, commit, dm, tA, tD, rtype, (a, b) => a + (b - a) * Math.random());
    rep.landCap = nv.landCap;
    if (nv.repulsed) {
      rep.ratio = 0; rep.gain = 0; rep.repulsed = true;
      rep.from = nearestOwn(S.P, t).from;
      applyBattle(rep); afterPlayerBattle(rep, t, 'invade', tempo()); return;
    }
    const rawA = sideRaw(commit, tA, false, c, nv.landCap), rawD = sideRaw(dm, tD, true, c, 1);
    const tot = r => TT.reduce((s, k) => s + r[k], 0);
    const unit = Math.max(tot(rawA), tot(rawD)) / 46 || 1;
    const mk = raw => { const o = z5(); TT.forEach(k => { const v = raw[k] / unit; o[k] = Math.floor(v) + (Math.random() < v % 1 ? 1 : 0); }); return o; };
    const resA = mk(rawA), resD = mk(rawD);
    const FT = fortOf(t);
    resD.bunker = FT.w * 2; resD.aa = FT.a * 2;
    if (!TT.some(k => resA[k])) resA.inf = 1;
    if (!TT.some(k => resD[k])) resD.inf = 1;
    const ter = c.ter;
    TB = {
      t, rep, dm, sea: rtype !== 'land', ter,
      sides: [
        { res: resA, init: { ...resA }, lost: z5(), name: ownerName(S.P), col: CFG.color },
        { res: resD, init: { ...resD }, lost: z5(), name: C[def].n, col: COL.hostile },
      ],
      units: [], shells: [], shots: [], booms: [], strikes: [],
      time: 0, speed: 1, over: false, q: [], qT: 0, aiT: 1.5,
      hpMulD: Math.min(1.9, ter * 1.15),
      abil: { air: (commit.ftr || 0) + (commit.bmb || 0) > 0 ? 1 + ((commit.bmb || 0) > 0 ? 1 : 0) : 0, bar: (commit.art || 0) + (commit.mlrs || 0) > 0 ? 1 : 0 },
      enemyAir: (dm.ftr || 0) + (dm.bmb || 0) > 0 ? 1 + ((dm.bmb || 0) > 0 ? 1 : 0) : 0, enemyAirAt: 16,
      targeting: null,
    };
    const lookA = R3.lookFor(S.P, CFG.color), lookD = R3.lookFor(def, '#d8402f');
    btEl.hidden = false;
    $('#btResult').hidden = true;
    TB.aaLvl = FT.a;
    const ok3d = R3.setup({ fort: FT, ter, sea: rtype !== 'land', arid: R3.lookFor(t, '#fff').arid, lookA, lookD, seed: t + 1 });
    if (!ok3d) { btEl.hidden = true; ticker('info', '3D wird von diesem Gerät nicht unterstützt – die Schlacht wird automatisch ausgetragen.'); }
    $('#btArmyA').textContent = lookA.army; $('#btArmyD').textContent = lookD.army;
    // defender is dug in: 40 % of every arm already in position
    TT.forEach(k => { const n = TU[k].fort ? resD[k] : Math.round(resD[k] * 0.4); for (let i = 0; i < n; i++) spawn(1, k, true); });
    $('#btTitle').textContent = `Schlacht um ${c.n}`;
    $('#btSub').textContent = `${ROUTE_TXT[rtype]}${ter > 1.15 ? ' · schweres Gelände: Verteidiger +' + Math.round((TB.hpMulD - 1) * 100) + ' % Panzerung' : ''}`;
    $('#btNameA').textContent = TB.sides[0].name; $('#btNameD').textContent = TB.sides[1].name;
    document.documentElement.style.setProperty('--me', CFG.color);
    renderBtCards();
    setSpeed(1);
    audio();
    if (!ok3d) { autoFinish(); $('#btDone') && $('#btDone').click(); return; }
    btLast = 0; requestAnimationFrame(btFrame);
  }

  function spawn(side, ty, entrenched) {
    const s = TB.sides[side], d = TU[ty];
    if (s.res[ty] <= 0) return false;
    s.res[ty]--;
    const hpMul = side === 1 && d.layer === 0 ? TB.hpMulD : 1;
    let x, y = d.layer === 2 ? 40 + Math.random() * 480 : 150 + Math.random() * 380;
    if (d.fort) { const n = TB.sides[1].init[ty], i = n - s.res[ty] - 1; y = 170 + (i + 0.5) / n * 340 + (Math.random() - 0.5) * 30; }
    if (side === 0) x = TB.sea && d.layer === 0 ? 85 + Math.random() * 20 : 20 + Math.random() * 20;
    else x = ty === 'bunker' ? 640 + Math.random() * 30 : ty === 'aa' ? 830 + Math.random() * 90 : entrenched ? (d.layer === 0 ? 700 + Math.random() * 250 : 850 + Math.random() * 120) : 975 + Math.random() * 15;
    const unit = { side, ty, x, y, hp: d.hp * hpMul, max: d.hp * hpMul, cd: Math.random() * d.rof, dir: side ? -1 : 1, ent: entrenched, ph: Math.random() * 6, aimX: null, aimY: null };
    TB.units.push(unit);
    R3.add(unit);
    if (side === 0 && TB.sea && d.layer === 0) TB.booms.push({ x: x - 30, y, t: 0, dur: 0.6, s: 0.5, water: true });
    return true;
  }

  // ---------- simulation ----------
  function btStep(dt) {
    const B = TB; B.time += dt;
    // player wave queue
    B.qT -= dt; if (B.q.length && B.qT <= 0) { spawn(0, B.q.shift()); B.qT = 0.11; }
    // defender reinforcements
    B.aiT -= dt;
    if (B.aiT <= 0) {
      const R = B.sides[1].res, avail = TT.filter(k => R[k] > 0);
      if (avail.length) {
        const tot = avail.reduce((s, k) => s + R[k], 0); let x = Math.random() * tot, pick = avail[0];
        for (const k of avail) { x -= R[k]; if (x <= 0) { pick = k; break; } }
        spawn(1, pick, false);
      }
      const f0 = B.units.filter(u => u.side === 0).length, f1 = B.units.length - f0;
      B.aiT = f0 > f1 ? 0.45 : 1.1;
    }
    // defender air strike on the densest attacker cluster
    if (B.enemyAir > 0 && B.time > B.enemyAirAt) {
      const g = B.units.filter(u => u.side === 0 && TU[u.ty].layer === 0);
      if (g.length >= 3) {
        let best = g[0], bn = 0;
        g.forEach(a => { const n = g.filter(b => Math.hypot(a.x - b.x, a.y - b.y) < 70).length; if (n > bn) { bn = n; best = a; } });
        airStrike2(1, best.x, best.y); B.enemyAir--;
      }
      B.enemyAirAt += 22;
    }
    // units
    for (const u of B.units) {
      if (u.hp <= 0) continue;
      const d = TU[u.ty]; u.cd -= dt; u.ph += dt;
      let best = null, bs = Infinity, bd = 0;
      for (const e of B.units) {
        if (e.side === u.side || e.hp <= 0) continue;
        const m = d.vs[e.ty]; if (!m) continue;
        const dist = Math.hypot(e.x - u.x, e.y - u.y);
        if (d.minR && dist < d.minR) continue;
        const sc = dist / Math.sqrt(m);
        if (sc < bs) { bs = sc; best = e; bd = dist; }
      }
      const inRange = best && bd <= d.range;
      u.aimX = best ? best.x : null; u.aimY = best ? best.y : null;
      if (inRange && u.cd <= 0) fire(u, best, d);
      const moving = d.layer === 2 || !inRange;
      if (moving) {
        let hold = false;
        if (u.side === 1 && d.layer === 0 && B.time < 55) hold = u.x <= HOLD_X || u.ent;
        if (!hold) u.x += u.dir * d.speed * dt;
        if (best && d.layer < 2) u.y += clamp(best.y - u.y, -1, 1) * d.speed * 0.45 * dt;
        if (d.layer === 2) { if (u.x > 985) u.dir = -1; if (u.x < 15) u.dir = 1; if (best) u.y += clamp(best.y - u.y, -1, 1) * 30 * dt; }
        else u.x = clamp(u.x, 15, 985);
      }
      u.y = clamp(u.y, d.layer === 2 ? 30 : 140, 540);
      // keep formation: ground units of one side don't stack on top of each other
      if (d.layer === 0 && d.speed > 0) for (const o of B.units) {
        if (o === u || o.side !== u.side || TU[o.ty].layer !== 0) continue;
        const ddx = u.x - o.x, ddy = u.y - o.y, dd = ddx * ddx + ddy * ddy;
        if (dd < 400 && dd > 0.01) { const f = (20 - Math.sqrt(dd)) * dt * 2.2; u.y += ddy / Math.sqrt(dd) * f; u.x += ddx / Math.sqrt(dd) * f * 0.5; }
      }
      // air defence: aircraft bleed over enemy-held ground
      if (d.layer === 2 && (u.side === 0 ? u.x > HOLD_X : u.x < 390)) u.hp -= (2.6 + (u.side === 0 ? (B.aaLvl || 0) * 1.6 : 0)) * dt;
    }
    // shells
    for (let i = B.shells.length - 1; i >= 0; i--) {
      const sh = B.shells[i]; sh.t += dt;
      if (sh.t >= sh.dur) { B.shells.splice(i, 1); explode(sh.side, sh.x1, sh.y1, sh.r, sh.dmg, sh.big); }
    }
    // strikes (planes that drop bombs)
    for (let i = B.strikes.length - 1; i >= 0; i--) {
      const st = B.strikes[i]; st.t += dt;
      if (st.kind === 'air' && !st.dropped && st.t > 0.75) {
        st.dropped = true;
        for (let k = 0; k < 6; k++) B.shells.push({ x0: st.x, y0: st.y - 40, x1: st.x + (Math.random() - 0.5) * 110, y1: st.y + (Math.random() - 0.5) * 90, t: 0, dur: 0.18 + k * 0.07, side: st.side, dmg: 120, r: 42, big: true });
      }
      if (st.kind === 'bar' && st.t > st.next && st.n > 0) {
        st.n--; st.next += 0.17;
        const x0 = st.side ? 1040 : -40;
        B.shells.push({ x0, y0: 100 + Math.random() * 400, x1: st.x + (Math.random() - 0.5) * 160, y1: st.y + (Math.random() - 0.5) * 140, t: 0, dur: 0.6, side: st.side, dmg: 75, r: 36 });
      }
      if (st.t > 2.8) B.strikes.splice(i, 1);
    }
    // fx timers
    for (let i = B.shots.length - 1; i >= 0; i--) { B.shots[i].t += dt; if (B.shots[i].t > 0.09) B.shots.splice(i, 1); }
    for (let i = B.booms.length - 1; i >= 0; i--) { B.booms[i].t += dt; if (B.booms[i].t > B.booms[i].dur) B.booms.splice(i, 1); }
    // deaths
    for (let i = B.units.length - 1; i >= 0; i--) {
      const u = B.units[i];
      if (u.hp > 0) continue;
      B.units.splice(i, 1);
      B.sides[u.side].lost[u.ty]++;
      R3.kill(u);
      B.booms.push({ x: u.x, y: u.y, t: 0, dur: 0.8, s: u.ty === 'tank' || u.ty === 'jet' || u.ty === 'heli' ? 1 : 0.6 });
      if (u.ty !== 'inf' && speed <= 2 && B.speed <= 2) boom(0.5);
    }
    // end?
    const alive = side => B.units.some(u => u.side === side) || TT.some(k => B.sides[side].res[k] > 0);
    // only ground troops can take a country: attacker without ground forces left cannot win
    const ground0 = B.units.some(u => u.side === 0 && TU[u.ty].layer === 0) || ['inf', 'tank', 'art'].some(k => B.sides[0].res[k] > 0);
    if (!alive(1)) endTactical(ground0 ? 0 : 1);
    else if (!alive(0) || !ground0) endTactical(1);
    else if (B.time >= TIME_LIMIT) endTactical(powerLeft(0) > powerLeft(1) * 1.1 ? 0 : 1, true);
  }
  function fire(u, e, d) {
    const m = d.vs[e.ty];
    const dmg = d.dmg * m * (0.8 + Math.random() * 0.4);
    if (d.splash) TB.shells.push({ x0: u.x, y0: u.y, x1: e.x + (Math.random() - 0.5) * 24, y1: e.y + (Math.random() - 0.5) * 24, t: 0, dur: 0.75, side: u.side, dmg, r: d.splash });
    else { e.hp -= dmg; TB.shots.push({ x0: u.x, y0: u.y, x1: e.x, y1: e.y, t: 0, side: u.side, air: d.layer > 0, aa: u.ty === 'aa', tl: TU[e.ty].layer }); if (Math.random() < 0.18) TB.booms.push({ x: e.x, y: e.y, t: 0, dur: 0.3, s: 0.25 }); }
    u.cd = d.rof * (0.85 + Math.random() * 0.3);
    u.fireT = TB.time;
  }
  function explode(side, x, y, r, dmg, big) {
    TB.booms.push({ x, y, t: 0, dur: big ? 0.9 : 0.6, s: big ? 0.9 : 0.55 });
    for (const e of TB.units) {
      if (e.side === side || TU[e.ty].layer === 2) continue;
      const dd = Math.hypot(e.x - x, e.y - y);
      if (dd < r) e.hp -= dmg * (1 - dd / r * 0.6) * (TU[e.ty].layer === 1 ? 0.4 : 1);
    }
    if (big && speed <= 2 && TB.speed <= 2) { boom(0.7); }
  }
  function airStrike2(side, x, y) { TB.strikes.push({ kind: 'air', side, x, y, t: 0 }); }
  function barrage(side, x, y) { TB.strikes.push({ kind: 'bar', side, x, y, t: 0, n: 14, next: 0.2 }); }
  function powerLeft(side) {
    const B = TB; let p = 0;
    B.units.forEach(u => { if (u.side === side) p += u.hp / u.max; });
    TT.forEach(k => { p += B.sides[side].res[k]; });
    return p;
  }

  // ---------- render loop (3D) ----------
  let btLast = 0;
  function btFrame(now) {
    if (!TB) return;
    const dt = btLast ? Math.min(0.05, (now - btLast) / 1000) : 0.016; btLast = now;
    if (!TB.over) { let rem = dt * TB.speed; while (rem > 0 && !TB.over) { const st = Math.min(0.04, rem); btStep(st); rem -= st; } }
    if (TB) { R3.frame(TB.over ? dt * 0.7 : dt * TB.speed, TB); updBtHud(); }
    if (TB && !btEl.hidden) requestAnimationFrame(btFrame);
  }
  function btResize() { R3.resize(); }

  // ---------- HUD / controls ----------
  function renderBtCards() {
    const B = TB, R = B.sides[0].res;
    $('#btCards').innerHTML = TT.filter(k => B.sides[0].init[k] > 0).map(k => `
      <button class="bt-card" type="button" data-ty="${k}" ${R[k] <= 0 ? 'disabled' : ''}>
        <span class="bt-n">${TU[k].n}</span><span class="bt-c" data-cnt="${k}">${R[k]}</span><span class="bt-h">${TU[k].hint}</span>
      </button>`).join('') +
      `<button class="bt-card wave" type="button" data-ty="all"><span class="bt-n">Alle vorrücken</span><span class="bt-c">⇶</span><span class="bt-h">ganze Reserve als Welle</span></button>`;
    $('#btAbil').innerHTML = `
      <button class="btn sm" type="button" data-ab="air" ${B.abil.air ? '' : 'disabled'}>${B.targeting === 'air' ? '✈ Ziel antippen…' : `✈ Luftschlag (${B.abil.air})`}</button>
      <button class="btn sm" type="button" data-ab="bar" ${B.abil.bar ? '' : 'disabled'}>${B.targeting === 'bar' ? '✸ Ziel antippen…' : `✸ Sperrfeuer (${B.abil.bar})`}</button>`;
  }
  function updBtHud() {
    if (!TB) return;
    const a = powerLeft(0), d = powerLeft(1), tot = a + d || 1;
    $('#btBar').style.width = (a / tot * 100) + '%';
    $('#btCntA').textContent = `${TB.units.filter(u => u.side === 0).length} im Feld · ${TT.reduce((s, k) => s + TB.sides[0].res[k], 0)} Reserve`;
    $('#btCntD').textContent = `${TB.units.filter(u => u.side === 1).length} im Feld · ${TT.reduce((s, k) => s + TB.sides[1].res[k], 0)} Reserve`;
    const left = Math.max(0, TIME_LIMIT - TB.time);
    $('#btTime').textContent = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
    document.querySelectorAll('#btCards [data-cnt]').forEach(el => {
      const k = el.dataset.cnt, n = TB.sides[0].res[k];
      if (el.textContent !== String(n)) { el.textContent = n; el.closest('button').disabled = n <= 0; }
    });
  }
  function setSpeed(v) {
    if (!TB) return; TB.speed = v;
    document.querySelectorAll('#btSpeed [data-sp]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.sp === v)));
  }
  $('#btCards').addEventListener('click', e => {
    const b = e.target.closest('[data-ty]'); if (!b || !TB || TB.over) return;
    const k = b.dataset.ty;
    if (k === 'all') { TB.q = []; TT.forEach(ty => { for (let i = 0; i < TB.sides[0].res[ty]; i++) TB.q.push(ty); }); shuffle(TB.q); return; }
    spawn(0, k, false);
  });
  $('#btAbil').addEventListener('click', e => {
    const b = e.target.closest('[data-ab]'); if (!b || !TB || TB.over) return;
    TB.targeting = TB.targeting === b.dataset.ab ? null : b.dataset.ab;
    $('#btHint').hidden = !TB.targeting;
    $('#btHint').textContent = TB.targeting === 'air' ? 'Tippe auf das Ziel für den Luftschlag' : 'Tippe auf das Ziel für das Sperrfeuer';
    renderBtCards();
  });
  $('#btSpeed').addEventListener('click', e => { const b = e.target.closest('[data-sp]'); if (b) setSpeed(+b.dataset.sp); });
  R3.onTap = (cx, cy) => {
    if (!TB || TB.over || !TB.targeting) return;
    const pt = R3.pick(cx, cy); if (!pt) return;
    const x = clamp(pt.x, 20, 980), y = clamp(pt.y, 150, 530);
    if (TB.targeting === 'air' && TB.abil.air > 0) { airStrike2(0, x, Math.max(150, y)); TB.abil.air--; }
    if (TB.targeting === 'bar' && TB.abil.bar > 0) { barrage(0, x, Math.max(150, y)); TB.abil.bar--; }
    TB.targeting = null; $('#btHint').hidden = true; renderBtCards();
  };
  function autoFinish() {
    if (!TB || TB.over) return;
    TB.q = []; TT.forEach(ty => { for (let i = 0; i < TB.sides[0].res[ty]; i++) TB.q.push(ty); });
    if (TB.abil.air) { const tg = TB.units.find(u => u.side === 1) || { x: 800, y: 340 }; airStrike2(0, tg.x, tg.y); TB.abil.air--; }
    let guard = 0; while (!TB.over && guard++ < 8000) btStep(0.04);
  }
  $('#btAuto').addEventListener('click', autoFinish);
  $('#btRetreat').addEventListener('click', () => { if (TB && !TB.over) endTactical(1, false, true); });
  window.addEventListener('resize', () => { if (TB && !btEl.hidden) btResize(); });

  // ---------- result ----------
  function endTactical(winner, timeout, retreat) {
    const B = TB; if (B.over) return;
    B.over = true;
    const res = { A: {}, D: {} };
    TT.forEach(k => {
      const fieldA = B.units.filter(u => u.side === 0 && u.ty === k).length;
      const fieldD = B.units.filter(u => u.side === 1 && u.ty === k).length;
      res.A[k] = { init: B.sides[0].init[k], alive: B.sides[0].res[k] + fieldA };
      res.D[k] = { init: B.sides[1].init[k], alive: B.sides[1].res[k] + fieldD };
    });
    const sum = (o, f) => TT.reduce((s, k) => s + o[k][f], 0);
    const survA = sum(res.A, 'alive') / Math.max(1, sum(res.A, 'init'));
    const survD = sum(res.D, 'alive') / Math.max(1, sum(res.D, 'init'));
    const rep = B.rep;
    TT.forEach(k => {
      const fa = res.A[k].init ? 1 - res.A[k].alive / res.A[k].init : 0;
      const fd = res.D[k].init ? 1 - res.D[k].alive / res.D[k].init : 0;
      TU[k].keys.forEach(key => {
        const capF = TU[k].layer === 0 ? rep.landCap : 1;
        rep.lossA[key] += roundUnit(key, (rep.commit[key] || 0) * capF * clamp(fa * 0.85, 0, 0.95));
        rep.lossD[key] += roundUnit(key, (B.dm[key] || 0) * clamp(fd * 0.85, 0, 0.95));
      });
      if (k === 'inf') rep.lossD.res += roundUnit('res', (B.dm.res || 0) * clamp(fd * 0.6, 0, 0.9));
    });
    rep.phases.push({ k: 'land', a: sum(res.A, 'init'), d: sum(res.D, 'init'), sh: survA / (survA + survD || 1), win: winner === 0 });
    rep.tac = { winner, survA, survD, timeout: !!timeout, retreat: !!retreat, res };
    rep.ratio = winner === 0 ? 1 + survA * 2 : survA * 0.5;
    rep.gain = winner === 0 ? Math.min(100, 50 + 80 * survA) : (timeout ? 10 * survA : 0);
    rep.from = nearestOwn(S.P, B.t).from;
    applyBattle(rep);
    const willConquer = rep.conquered;
    const rows = TT.filter(k => res.A[k].init || res.D[k].init).map(k => `<tr><td>${TU[k].n}</td><td class="n">${res.A[k].alive}/${res.A[k].init}</td><td class="n">${res.D[k].alive}/${res.D[k].init}</td></tr>`).join('');
    const head = retreat ? 'Rückzug' : winner === 0 ? (willConquer ? 'Sieg – Land erobert!' : 'Sieg') : timeout ? 'Patt – Zeit abgelaufen' : 'Niederlage';
    $('#btResult').innerHTML = `<div class="bt-res-in">
      <div class="eyebrow">Schlacht um ${esc(C[B.t].n)}</div>
      <div class="outcome ${winner === 0 ? 'win' : 'lose'}" style="font-size:34px">${head}</div>
      <p class="sub">${winner === 0 ? (willConquer ? `${esc(C[B.t].n)} kapituliert.` : `Kriegsfortschritt jetzt ${pct(rep.progress)} – noch eine Schlacht bis zur Kapitulation.`) : 'Deine Truppen wurden zurückgeschlagen.'}${rep.nuke ? ' Nukleare Eskalation: Die Offensive wurde zurückgeworfen.' : ''}</p>
      <table class="mil"><tbody><tr class="grp"><td>Verbände</td><td class="n">Du</td><td class="n">Gegner</td></tr>${rows}</tbody></table>
      <div class="actions" style="justify-content:flex-end;margin-top:14px"><button class="btn ghost" type="button" id="btRep">Gefechtsbericht</button><button class="btn primary" type="button" id="btDone">Zur Weltkarte</button></div></div>`;
    $('#btResult').hidden = false;
    $('#btRep').addEventListener('click', () => showReport(rep));
    $('#btDone').addEventListener('click', () => {
      btEl.hidden = true; const t = B.t; TB = null; R3.clear();
      afterPlayerBattle(rep, t, 'invade', tempo() * 1.6);
    });
  }

  // =====================================================================
  //  SETTINGS
  // =====================================================================
  const SWATCHES = ['#f0b43c', '#4fc3f7', '#e85d9a', '#7bd88f', '#b18cff', '#ff8c42', '#f2f2f2', '#2ad4c0'];
  function showSettings() {
    const opt = (key, val, label) => `<button class="btn sm" type="button" data-cfg="${key}" data-v="${val}" aria-pressed="${String(CFG[key]) === String(val)}">${label}</button>`;
    openModal(`<div class="eyebrow">Anpassen</div><h2>Spieleinstellungen</h2>
      <h3 class="sec">Dein Reich</h3>
      <input id="cfgName" type="text" maxlength="28" placeholder="${S ? esc('Reich ' + C[S.P].n) : 'Name deines Reiches'}" value="${esc(CFG.name)}" class="inp">
      <div class="swatches">${SWATCHES.map(c => `<button type="button" class="sw-btn" data-cfg="color" data-v="${c}" aria-pressed="${CFG.color === c}" style="background:${c}" aria-label="Farbe ${c}"></button>`).join('')}</div>
      <h3 class="sec">Spieltempo <small>Animationen auf der Karte</small></h3>
      <div class="econ">${opt('tempo', 'normal', 'Normal')}${opt('tempo', 'fast', 'Schnell')}${opt('tempo', 'blitz', 'Blitz')}</div>
      <h3 class="sec">KI-Züge zeigen</h3>
      <div class="econ">${opt('aiShow', 'all', 'Alle')}${opt('aiShow', 'mine', 'Nur gegen mich')}${opt('aiShow', 'none', 'Keine (am schnellsten)')}</div>
      <h3 class="sec">KI-Aggressivität</h3>
      <div class="econ">${opt('aggr', 0.5, 'Friedlich')}${opt('aggr', 1, 'Normal')}${opt('aggr', 1.6, 'Kriegerisch')}${opt('aggr', 2.4, 'Brutal')}</div>
      <h3 class="sec">Siegziel <small>Anteil aller Länder</small></h3>
      <div class="econ">${opt('win', 0.4, '40 %')}${opt('win', 0.6, '60 %')}${opt('win', 0.8, '80 %')}${opt('win', 1, 'Ganze Welt')}</div>
      <h3 class="sec">Startkapital <small>gilt ab dem nächsten neuen Spiel</small></h3>
      <div class="econ">${opt('money', 1, 'Normal')}${opt('money', 5, 'Reich ×5')}${opt('money', 25, 'Kriegskasse ×25')}</div>
      <div class="actions" style="justify-content:flex-end;margin-top:16px"><button class="btn ghost" type="button" id="cfgReset">Zurücksetzen</button><button class="btn primary" type="button" id="cfgOk">Fertig</button></div>`);
    modalBody.querySelectorAll('[data-cfg]').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.cfg, v = b.dataset.v;
      CFG[k] = ['aggr', 'win', 'money'].includes(k) ? +v : v;
      applyCfg(); showSettings();
    }));
    $('#cfgName').addEventListener('input', e => { CFG.name = e.target.value.slice(0, 28); saveCfg(); if (S) renderHud(); });
    $('#cfgReset').addEventListener('click', () => { CFG = { ...CFG_DEF }; applyCfg(); showSettings(); });
    $('#cfgOk').addEventListener('click', closeModal);
  }
  function applyCfg() {
    saveCfg();
    WIN_SHARE = CFG.win;
    document.documentElement.style.setProperty('--me', CFG.color);
    if (S) { if (S.over && S.won && S.endReason === 'share' && WIN_SHARE > terrOf(S.P).length / N) S.over = false; renderAll(); }
  }
  $('#btnCfg').addEventListener('click', showSettings);
  $('#btnCfgStart').addEventListener('click', showSettings);
  document.documentElement.style.setProperty('--me', CFG.color);
