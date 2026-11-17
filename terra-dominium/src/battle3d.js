  // =====================================================================
  //  3D BATTLE RENDERER – three.js, procedural low-poly models per nation
  // =====================================================================
  const R3 = (() => {
    const T3 = window.THREE;
    const SC = 0.12;
    const wx = x => (x - 500) * SC, wz = y => (y - 340) * SC;
    const host = $('#bt3d');
    let renderer = null, scene = null, camera = null, world = null, ok = !!T3;
    let sun = null, flash = null, ground = null, water = null;
    const V = new Map();               // sim unit -> visual
    const dying = [];                  // falling soldiers, burning wrecks
    const parts = [];                  // particles
    const pools = { tracer: [], shell: [], jet: [] };
    let looks = [null, null], terA = 0.3, time3 = 0, lowFx = false;
    const cam = { yaw: -0.55, pitch: 0.6, dist: 80, tx: -10, tz: 0, auto: true };
    const ray = T3 ? new T3.Raycaster() : null;

    // ---------- nations: camouflage & equipment families ----------
    const CAMO = {
      fleck:     { pat: 'fleck',    cols: ['#5f6548', '#3c4a2e', '#1e221a', '#6d5b3c', '#808b5d'] },
      multicam:  { pat: 'multicam', cols: ['#a39a7c', '#7b7254', '#5a5340', '#c4bb98', '#6c6a48'] },
      mtp:       { pat: 'multicam', cols: ['#8c8461', '#6a6648', '#4b4a35', '#a9a07a', '#5b5f3f'] },
      ru:        { pat: 'digital',  cols: ['#6b6f50', '#4a4f36', '#2e3223', '#8a8a68', '#5a5e43'] },
      cn:        { pat: 'digital',  cols: ['#5e6a4a', '#3d4a33', '#283126', '#7e7c5d', '#4b573c'] },
      ua:        { pat: 'digital',  cols: ['#6c6f52', '#4c5238', '#30352a', '#8d8a6a', '#5a604a'] },
      kr:        { pat: 'digital',  cols: ['#5d6648', '#3f4a33', '#24291f', '#7a6c4e', '#4f5a3f'] },
      jp:        { pat: 'fleck',    cols: ['#5d6a45', '#3f4d30', '#2a2a22', '#77684a', '#4c5a3a'] },
      woodland:  { pat: 'woodland', cols: ['#5a613f', '#3d4a2c', '#262019', '#6e5a3c', '#4c5534'] },
      desert:    { pat: 'desert',   cols: ['#c6b289', '#a8926a', '#8a7350', '#d8c8a0', '#b39f78'] },
      desertdig: { pat: 'digital',  cols: ['#c2ae88', '#a38f69', '#7f6d4f', '#d4c5a0', '#b09c78'] },
      olive:     { pat: 'plain',    cols: ['#4f553a', '#454b33', '#3b402c', '#5a6042', '#4a5036'] },
      tropic:    { pat: 'woodland', cols: ['#4d5a36', '#2f3d24', '#1f2618', '#5f6b3e', '#3c4a2d'] },
    };
    const NATION = {
      'USA': ['multicam', 'US Army', 'sand'], 'Deutschland': ['fleck', 'Bundeswehr', 'nato3'], 'Russland': ['ru', 'Russische Armee', 'plain'],
      'China': ['cn', 'Volksbefreiungsarmee', 'digital'], 'Vereinigtes Königreich': ['mtp', 'British Army', 'plain'], 'Frankreich': ['woodland', 'Armée de Terre', 'nato3'],
      'Ukraine': ['ua', 'Ukrainische Streitkräfte', 'plain'], 'Polen': ['ua', 'Wojsko Polskie', 'nato3'], 'Israel': ['olive', 'IDF', 'sand'],
      'Japan': ['jp', 'Japanische Bodenstreitkräfte', 'nato3'], 'Südkorea': ['kr', 'ROK Army', 'nato3'], 'Nordkorea': ['olive', 'Koreanische Volksarmee', 'plain'],
      'Indien': ['kr', 'Indian Army', 'nato3'], 'Pakistan': ['ua', 'Pakistan Army', 'sand'], 'Türkei': ['ua', 'Türkische Landstreitkräfte', 'nato3'],
      'Iran': ['woodland', 'IRGC / Artesh', 'sand'], 'Saudi-Arabien': ['desertdig', 'Royal Saudi Land Forces', 'sand'], 'Ägypten': ['desert', 'Ägyptische Armee', 'sand'],
      'Italien': ['woodland', 'Esercito Italiano', 'nato3'], 'Spanien': ['ua', 'Ejército de Tierra', 'nato3'], 'Kanada': ['kr', 'Canadian Army', 'nato3'],
      'Australien': ['multicam', 'Australian Army', 'nato3'], 'Brasilien': ['tropic', 'Exército Brasileiro', 'nato3'], 'Schweiz': ['fleck', 'Schweizer Armee', 'nato3'],
      'Schweden': ['woodland', 'Försvarsmakten', 'nato3'], 'Finnland': ['ru', 'Puolustusvoimat', 'nato3'], 'Österreich': ['olive', 'Bundesheer', 'nato3'],
      'Niederlande': ['fleck', 'Koninklijke Landmacht', 'nato3'], 'Taiwan': ['cn', 'Heer der Republik China', 'nato3'], 'Vietnam': ['olive', 'Vietnamesische Volksarmee', 'plain'],
      'Griechenland': ['ua', 'Ellinikos Stratos', 'nato3'], 'Mexiko': ['ua', 'Ejército Mexicano', 'nato3'],
    };
    const ARID = new Set(['Ägypten', 'Libyen', 'Algerien', 'Tunesien', 'Marokko', 'Mauretanien', 'Mali', 'Niger', 'Tschad', 'Sudan', 'Saudi-Arabien', 'Jemen', 'Oman',
      'Vereinigte Arabische Emirate', 'Katar', 'Bahrain', 'Kuwait', 'Irak', 'Iran', 'Syrien', 'Jordanien', 'Afghanistan', 'Turkmenistan', 'Usbekistan', 'Dschibuti',
      'Somalia', 'Eritrea', 'Namibia', 'Botswana', 'Mongolei', 'Pakistan', 'Libanon', 'Palästina', 'Kasachstan']);
    const TROPIC = new Set(['Brasilien', 'Kolumbien', 'Venezuela', 'Peru', 'Ecuador', 'Indonesien', 'Philippinen', 'Malaysia', 'Thailand', 'Myanmar', 'Kambodscha', 'Laos',
      'DR Kongo', 'Republik Kongo', 'Gabun', 'Kamerun', 'Nigeria', 'Ghana', 'Elfenbeinküste', 'Liberia', 'Sierra Leone', 'Guinea', 'Papua-Neuguinea', 'Sri Lanka', 'Bangladesch']);
    function lookFor(ci, accent) {
      const c = C[ci], sys = c.s || '', n = c.n;
      const nat = NATION[n];
      const east = /T-90|T-72|T-80|T-64|T-55|T-62|PT-91|M-84|TR-85|Chonma|BMP|Su-2|Su-3|MiG|Mi-24|Mi-35|Mi-28|Ka-52/.test(sys);
      const cnF = /Type 99|Type 15|Type 59|VT-4|MBT-2000|Al-Khalid|J-10|J-20|JF-17|Z-10/.test(sys);
      let camo = nat ? nat[0] : ARID.has(n) ? 'desert' : TROPIC.has(n) ? 'tropic' : east ? 'ru' : c.t >= 0.75 ? 'fleck' : 'olive';
      const army = nat ? nat[1] : `Streitkräfte ${n}`;
      const vpat = nat ? nat[2] : ARID.has(n) ? 'sand' : east ? 'plain' : 'nato3';
      const tank = /Abrams/.test(sys) ? 'west' : /Leopard|Strv|Panzer 87|Challenger|Leclerc|Merkava|K2|K1|Type 10|Type 90|Ariete|Altay|Arjun|TAM/.test(sys) ? 'west'
        : cnF ? 'cn' : east ? 'east' : c.t >= 0.8 ? 'west' : 'east';
      const heli = /Ka-52/.test(sys) ? 'ka52' : /Mi-24|Mi-35|Mi-28/.test(sys) ? 'hind' : 'apache';
      const jet = /F-35|J-20|J-35|Su-57|KF-21|F-22/.test(sys) ? 'stealth' : /Su-27|Su-30|Su-35|Su-34|J-11|J-16|MiG-29|MiG-31|F-15|F-14/.test(sys) ? 'flanker' : 'f16';
      const skin = ARID.has(n) ? '#a77a58' : TROPIC.has(n) ? '#8a5f44' : /China|Japan|Korea|Taiwan|Vietnam|Mongolei|Thailand/.test(n) ? '#c8a07a' : '#c49a7c';
      const gear = camo === 'desert' || camo === 'desertdig' || camo === 'multicam' ? '#7a6a4a' : '#3d4230';
      const vcol = vpat === 'sand' ? ['#b29e74', '#9a875f', '#7c6a4b'] : vpat === 'digital' ? ['#5b6648', '#3f4a34', '#2c3326'] : vpat === 'plain' ? ['#56603f', '#4b5537', '#414a30'] : ['#4b5536', '#2f2a20', '#1d1f19'];
      return { camo: CAMO[camo], army, vpat, vcol, tank, heli, jet, skin, gear, accent, arid: ARID.has(n) };
    }

    // ---------- textures ----------
    function seeded(s) { return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
    function atlas(look, kind) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 256;
      const g = cv.getContext('2d'), rnd = seeded(kind === 'veh' ? 777 : 4242);
      const cols = kind === 'veh' ? look.vcol : look.camo.cols;
      const pat = kind === 'veh' ? ({ nato3: 'woodland', sand: 'plain', digital: 'digital', plain: 'plain' })[look.vpat] : look.camo.pat;
      g.fillStyle = cols[0]; g.fillRect(0, 0, 256, 192);
      const pick = () => cols[1 + Math.floor(rnd() * (cols.length - 1))];
      if (pat === 'fleck') {
        for (let i = 0; i < 1100; i++) { const x = rnd() * 256, y = rnd() * 192; g.fillStyle = pick(); g.beginPath(); g.arc(x, y, 1.5 + rnd() * 3.2, 0, 7); g.fill(); }
      } else if (pat === 'digital') {
        for (let i = 0; i < 320; i++) { let x = Math.floor(rnd() * 64) * 4, y = Math.floor(rnd() * 48) * 4; g.fillStyle = pick(); for (let k = 0; k < 7; k++) { g.fillRect(x, y, 4, 4); x += (rnd() < 0.5 ? 4 : -4) * (rnd() < 0.5 ? 1 : 0); y += rnd() < 0.5 ? 4 : 0; } }
      } else if (pat === 'woodland') {
        for (let i = 0; i < 46; i++) { g.fillStyle = pick(); g.beginPath(); const x = rnd() * 256, y = rnd() * 192; g.ellipse(x, y, 10 + rnd() * 22, 6 + rnd() * 12, rnd() * 3, 0, 7); g.fill(); }
      } else if (pat === 'multicam') {
        for (let i = 0; i < 80; i++) { g.globalAlpha = 0.55; g.fillStyle = pick(); g.beginPath(); g.ellipse(rnd() * 256, rnd() * 192, 6 + rnd() * 16, 4 + rnd() * 9, rnd() * 3, 0, 7); g.fill(); }
        g.globalAlpha = 1; g.strokeStyle = cols[2]; g.lineWidth = 2;
        for (let i = 0; i < 30; i++) { const x = rnd() * 256, y = rnd() * 192; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 14, y + rnd() * 10); g.stroke(); }
      } else if (pat === 'desert') {
        for (let i = 0; i < 30; i++) { g.globalAlpha = 0.6; g.fillStyle = pick(); g.beginPath(); g.ellipse(rnd() * 256, rnd() * 192, 10 + rnd() * 20, 5 + rnd() * 10, rnd() * 3, 0, 7); g.fill(); }
        g.globalAlpha = 1;
      } else {
        for (let i = 0; i < 400; i++) { g.globalAlpha = 0.15; g.fillStyle = pick(); g.fillRect(rnd() * 256, rnd() * 192, 3, 3); }
        g.globalAlpha = 1;
      }
      const sw = [[look.skin, look.gear, '#2a2c2e', look.accent], ['#1b2a36', '#d8d4c4', '#121314', '#eeeeee']];
      sw.forEach((row, r) => row.forEach((col, i) => { g.fillStyle = col; g.fillRect(i * 64, r === 0 ? 224 : 192, 64, 32); }));
      const tex = new T3.CanvasTexture(cv);
      tex.minFilter = T3.LinearFilter; tex.generateMipmaps = false;
      return tex;
    }
    const REG = { skin: [0.125, 0.0625], gear: [0.375, 0.0625], metal: [0.625, 0.0625], accent: [0.875, 0.0625], glass: [0.125, 0.1875], light: [0.375, 0.1875], black: [0.625, 0.1875], white: [0.875, 0.1875] };
    function softTex(inner, outer, size = 64) {
      const cv = document.createElement('canvas'); cv.width = cv.height = size; const g = cv.getContext('2d');
      const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      gr.addColorStop(0, inner); gr.addColorStop(1, outer); g.fillStyle = gr; g.fillRect(0, 0, size, size);
      return new T3.CanvasTexture(cv);
    }

    // ---------- geometry helpers ----------
    const tmpM = T3 && new T3.Matrix4(), tmpQ = T3 && new T3.Quaternion(), tmpE = T3 && new T3.Euler();
    function P(g, r, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
      tmpE.set(rx, ry, rz); tmpQ.setFromEuler(tmpE);
      g.applyMatrix4(tmpM.compose(new T3.Vector3(x, y, z), tmpQ, new T3.Vector3(sx, sy, sz)));
      return { g, r };
    }
    function merge(list) {
      const pos = [], nor = [], uv = [], idx = []; let off = 0;
      for (const { g, r } of list) {
        const Pp = g.attributes.position, Nn = g.attributes.normal, UV = g.attributes.uv;
        // normalise this part's UVs into 0..1 (extruded shapes use world-sized UVs)
        let u0 = 0, u1 = 1, v0 = 0, v1 = 1;
        if (UV && r === 'camo') { u0 = v0 = Infinity; u1 = v1 = -Infinity; for (let i = 0; i < UV.count; i++) { const a = UV.getX(i), b = UV.getY(i); if (a < u0) u0 = a; if (a > u1) u1 = a; if (b < v0) v0 = b; if (b > v1) v1 = b; } if (u1 - u0 < 1e-6) u1 = u0 + 1; if (v1 - v0 < 1e-6) v1 = v0 + 1; }
        for (let i = 0; i < Pp.count; i++) {
          pos.push(Pp.getX(i), Pp.getY(i), Pp.getZ(i)); nor.push(Nn.getX(i), Nn.getY(i), Nn.getZ(i));
          if (r === 'camo') uv.push(0.01 + (UV ? (UV.getX(i) - u0) / (u1 - u0) : 0.5) * 0.98, 0.26 + (UV ? (UV.getY(i) - v0) / (v1 - v0) : 0.5) * 0.73);
          else { const c = REG[r]; uv.push(c[0], c[1]); }
        }
        if (g.index) for (let j = 0; j < g.index.count; j++) idx.push(g.index.getX(j) + off);
        else for (let i = 0; i < Pp.count; i++) idx.push(off + i);
        off += Pp.count; g.dispose();
      }
      const geo = new T3.BufferGeometry();
      geo.setAttribute('position', new T3.Float32BufferAttribute(pos, 3));
      geo.setAttribute('normal', new T3.Float32BufferAttribute(nor, 3));
      geo.setAttribute('uv', new T3.Float32BufferAttribute(uv, 2));
      geo.setIndex(idx); geo.computeBoundingSphere();
      return geo;
    }
    const Box = (w, h, d) => new T3.BoxGeometry(w, h, d);
    const Cyl = (rt, rb, h, s = 10) => new T3.CylinderGeometry(rt, rb, h, s);
    const Sph = (r, ws = 10, hs = 8, ps = 0, pl = Math.PI * 2, ts = 0, tl = Math.PI) => new T3.SphereGeometry(r, ws, hs, ps, pl, ts, tl);
    const flatShape = (pts, depth) => { const s = new T3.Shape(); pts.forEach(([x, y], i) => i ? s.lineTo(x, y) : s.moveTo(x, y)); return new T3.ExtrudeGeometry(s, { depth, bevelEnabled: false }); };
    const H = Math.PI / 2;

    // ---------- models (forward = +Z) ----------
    function soldierGeo() {
      const body = merge([
        P(Box(0.5, 0.62, 0.3), 'camo', 0, 1.2, 0),
        P(Box(0.55, 0.42, 0.36), 'gear', 0, 1.24, 0.01),
        P(Box(0.44, 0.12, 0.12), 'gear', 0, 1.05, 0.19),
        P(Box(0.36, 0.44, 0.22), 'gear', 0, 1.26, -0.26),
        P(Box(0.22, 0.24, 0.24), 'skin', 0, 1.66, 0.01),
        P(Sph(0.17, 10, 6, 0, Math.PI * 2, 0, H), 'camo', 0, 1.72, 0, 0, 0, 0, 1, 0.9, 1.08),
        P(Box(0.35, 0.045, 0.37), 'accent', 0, 1.735, 0),
        P(Box(0.13, 0.46, 0.13), 'camo', 0.29, 1.24, 0.15, -1.05, 0, 0),
        P(Box(0.13, 0.46, 0.13), 'camo', -0.27, 1.24, 0.22, -1.25, 0.35, 0),
        P(Box(0.15, 0.09, 0.15), 'accent', 0.3, 1.43, 0.02),
        P(Box(0.08, 0.11, 1.0), 'metal', 0.1, 1.31, 0.5),
        P(Box(0.06, 0.2, 0.09), 'metal', 0.1, 1.17, 0.45),
        P(Box(0.1, 0.1, 0.2), 'metal', 0.1, 1.38, 0.32),
      ]);
      const leg = merge([P(Box(0.2, 0.78, 0.22), 'camo', 0, -0.39, 0), P(Box(0.22, 0.12, 0.32), 'black', 0, -0.8, 0.05)]);
      return { body, leg };
    }
    function tankGeo(fam, art) {
      const hull = [
        P(Box(3.5, 0.95, 6.8), 'camo', 0, 0.98, 0),
        P(Box(3.5, 0.8, 1.3), 'camo', 0, 1.05, 3.45, 0.85, 0, 0),
        P(Box(0.75, 0.95, 7.1), 'black', 1.52, 0.55, 0), P(Box(0.75, 0.95, 7.1), 'black', -1.52, 0.55, 0),
      ];
      for (let i = 0; i < 6; i++) { [1.55, -1.55].forEach(x => hull.push(P(Cyl(0.42, 0.42, 0.3, 10), 'metal', x * 1.12, 0.5, -2.7 + i * 1.08, 0, 0, H))); }
      if (fam === 'west' || fam === 'cn') hull.push(P(Box(0.08, 0.62, 6.4), 'camo', 1.93, 1.05, 0), P(Box(0.08, 0.62, 6.4), 'camo', -1.93, 1.05, 0));
      if (fam === 'east') hull.push(P(Cyl(0.32, 0.32, 1.1, 8), 'gear', 0.8, 1.55, -3.3, 0, 0, H), P(Cyl(0.32, 0.32, 1.1, 8), 'gear', -0.8, 1.55, -3.3, 0, 0, H));
      let tur;
      if (art) {
        tur = [P(Box(3.0, 1.45, 3.9), 'camo', 0, 0.75, -0.6), P(Box(0.6, 0.35, 0.6), 'metal', 0.9, 1.6, -1.2),
          P(Cyl(0.18, 0.2, 6.4, 10), 'camo', 0, 1.2, 3.5, H - 0.35, 0, 0), P(Cyl(0.26, 0.26, 0.6, 10), 'metal', 0, 2.2, 6.4, H - 0.35, 0, 0),
          P(Box(1.0, 0.03, 0.8), 'accent', 0, 1.49, -1.6)];
      } else if (fam === 'east') {
        tur = [P(Sph(1.7, 14, 8, 0, Math.PI * 2, 0, H), 'camo', 0, 0.15, -0.2, 0, 0, 0, 1, 0.52, 1.12),
          P(Cyl(0.11, 0.13, 5.6, 8), 'camo', 0, 0.55, 3.9, H, 0, 0), P(Cyl(0.16, 0.16, 0.5, 8), 'metal', 0, 0.55, 6.6, H, 0, 0),
          P(Box(0.55, 0.28, 0.5), 'gear', 0.85, 0.75, 1.15, 0, 0.5, 0), P(Box(0.55, 0.28, 0.5), 'gear', -0.85, 0.75, 1.15, 0, -0.5, 0),
          P(Box(0.5, 0.25, 0.45), 'gear', 1.3, 0.62, 0.45, 0, 0.9, 0), P(Box(0.5, 0.25, 0.45), 'gear', -1.3, 0.62, 0.45, 0, -0.9, 0),
          P(Cyl(0.3, 0.3, 0.25, 8), 'metal', 0.5, 1.0, -0.5), P(Box(0.9, 0.03, 0.7), 'accent', -0.3, 0.98, -0.6)];
      } else {
        tur = [P(Box(3.2, 0.82, 3.6), 'camo', 0, 0.42, -0.6), P(Box(2.7, 0.7, 1.3), 'camo', 0, 0.4, -2.9),
          P(Box(1.7, 0.78, 1.4), 'camo', 0.75, 0.42, 1.55, 0, 0.55, 0), P(Box(1.7, 0.78, 1.4), 'camo', -0.75, 0.42, 1.55, 0, -0.55, 0),
          P(Cyl(0.12, 0.14, 5.4, 8), 'camo', 0, 0.48, 4.3, H, 0, 0), P(Cyl(0.18, 0.18, 0.4, 8), 'metal', 0, 0.48, 6.9, H, 0, 0),
          P(Cyl(0.3, 0.3, 0.3, 8), 'metal', 0.8, 0.95, -0.9), P(Box(0.08, 0.08, 0.8), 'metal', 0.8, 1.15, -0.5),
          P(Box(1.2, 0.03, 0.9), 'accent', -0.5, 0.84, -1.6)];
        if (fam === 'cn') tur.push(P(Box(1.3, 0.35, 0.5), 'gear', 0.95, 0.5, 1.9, 0, 0.5, 0), P(Box(1.3, 0.35, 0.5), 'gear', -0.95, 0.5, 1.9, 0, -0.5, 0));
      }
      return { hull: merge(hull), tur: merge(tur) };
    }
    function heliGeo(kind) {
      const b = [];
      if (kind === 'hind') {
        b.push(P(Cyl(0.95, 0.7, 7.5, 10), 'camo', 0, 0, 0.6, H, 0, 0), P(Sph(0.75, 10, 8), 'glass', 0, 0.15, 4.6, 0, 0, 0, 1, 0.9, 1.3),
          P(Sph(0.62, 10, 8), 'glass', 0, 0.75, 3.4, 0, 0, 0, 1, 0.9, 1.2), P(Cyl(0.32, 0.18, 6.5, 8), 'camo', 0, 0.35, -5.5, H, 0, 0),
          P(Box(5.2, 0.15, 1.2), 'camo', 0, -0.3, 0.4, 0, 0, 0.12), P(Box(1.0, 1.9, 0.18), 'camo', 0, 1.0, -8.5),
          P(Cyl(0.25, 0.25, 1.4, 8), 'black', 2.2, -0.6, 0.5, H, 0, 0), P(Cyl(0.25, 0.25, 1.4, 8), 'black', -2.2, -0.6, 0.5, H, 0, 0),
          P(Box(1.6, 0.7, 2.6), 'camo', 0, 0.95, -0.4));
      } else if (kind === 'ka52') {
        b.push(P(Box(1.6, 1.4, 4.6), 'camo', 0, 0, 1.0), P(Box(1.5, 0.9, 1.6), 'glass', 0, 0.55, 2.6), P(Cyl(0.6, 0.3, 2.0, 8), 'camo', 0, -0.1, 4.1, H, 0, 0),
          P(Cyl(0.32, 0.2, 5.5, 8), 'camo', 0, 0.3, -3.7, H, 0, 0), P(Box(3.0, 0.12, 0.7), 'camo', 0, 0.4, -6.0),
          P(Box(0.12, 1.4, 1.0), 'camo', 1.5, 0.9, -6.0), P(Box(0.12, 1.4, 1.0), 'camo', -1.5, 0.9, -6.0),
          P(Box(4.2, 0.14, 0.9), 'camo', 0, -0.35, 0.6), P(Cyl(0.24, 0.24, 1.4, 8), 'black', 1.9, -0.65, 0.6, H, 0, 0), P(Cyl(0.24, 0.24, 1.4, 8), 'black', -1.9, -0.65, 0.6, H, 0, 0),
          P(Cyl(0.15, 0.15, 1.6, 8), 'metal', 0, 1.4, 0.6));
      } else {
        b.push(P(Cyl(0.6, 0.45, 6.2, 10), 'camo', 0, 0, 0.6, H, 0, 0), P(Cyl(0.45, 0.1, 1.6, 8), 'camo', 0, -0.1, 4.4, H, 0, 0),
          P(Box(0.7, 0.55, 1.1), 'glass', 0, 0.55, 3.0), P(Box(0.7, 0.7, 1.1), 'glass', 0, 0.75, 1.9),
          P(Cyl(0.26, 0.14, 6.2, 8), 'camo', 0, 0.25, -5.2, H, 0, 0), P(Box(0.15, 1.7, 1.1), 'camo', 0, 0.9, -8.0),
          P(Box(1.8, 0.1, 0.6), 'camo', 0, 0.2, -7.7), P(Box(3.9, 0.12, 0.85), 'camo', 0, -0.15, 0.6),
          P(Box(0.62, 0.6, 1.9), 'camo', 0.8, 0.55, -0.2), P(Box(0.62, 0.6, 1.9), 'camo', -0.8, 0.55, -0.2),
          P(Cyl(0.22, 0.22, 1.3, 8), 'black', 1.6, -0.45, 0.6, H, 0, 0), P(Cyl(0.22, 0.22, 1.3, 8), 'black', -1.6, -0.45, 0.6, H, 0, 0),
          P(Box(0.15, 0.15, 0.6), 'metal', 0, -0.6, 3.6), P(Cyl(0.14, 0.14, 1.0, 8), 'metal', 0, 1.15, 0.6));
      }
      b.push(P(Box(0.6, 0.04, 0.6), 'accent', 0, kind === 'ka52' ? 0.72 : 0.72, -1.5));
      const blades = kind === 'hind' ? 5 : kind === 'ka52' ? 3 : 4, len = kind === 'hind' ? 8.5 : 7;
      const rot = []; for (let i = 0; i < blades; i++) rot.push(P(Box(0.32, 0.05, len), 'black', 0, 0, len / 2, 0, i * Math.PI * 2 / blades, 0));
      rot.push(P(Cyl(0.25, 0.25, 0.3, 8), 'metal', 0, 0, 0));
      const tail = merge([P(Box(0.1, 1.6, 0.18), 'black', 0, 0, 0), P(Box(0.1, 0.18, 1.6), 'black', 0, 0, 0)]);
      return { body: merge(b), rotor: merge(rot), tail, coax: kind === 'ka52', mastY: kind === 'hind' ? 1.5 : kind === 'ka52' ? 1.6 : 1.4 };
    }
    function jetGeo(kind) {
      const b = [];
      const wingPts = kind === 'stealth' ? [[-5.4, -2.2], [-1.2, 2.2], [1.2, 2.2], [5.4, -2.2], [5.4, -3.0], [-5.4, -3.0]]
        : kind === 'flanker' ? [[-6.6, -2.8], [-1.4, 3.4], [1.4, 3.4], [6.6, -2.8], [6.6, -3.6], [-6.6, -3.6]]
          : [[-4.8, -2.3], [-0.9, 2.8], [0.9, 2.8], [4.8, -2.3], [4.8, -3.0], [-4.8, -3.0]];
      b.push(P(flatShape(wingPts, 0.16), 'camo', 0, 0, 0, -H, 0, 0));
      if (kind === 'flanker') {
        b.push(P(Box(2.2, 0.55, 9.5), 'camo', 0, 0.05, 0), P(Cyl(0.5, 0.45, 9, 10), 'camo', 0.85, -0.15, -1.2, H, 0, 0), P(Cyl(0.5, 0.45, 9, 10), 'camo', -0.85, -0.15, -1.2, H, 0, 0),
          P(Cyl(0.55, 0.12, 5.5, 10), 'camo', 0, 0.2, 7.2, H, 0, 0), P(Sph(0.5, 10, 8), 'glass', 0, 0.6, 5.0, 0, 0, 0, 1, 0.9, 2.0),
          P(flatShape([[0, 0], [2.0, 0], [2.6, 2.6], [1.6, 2.6]], 0.12), 'camo', 1.4, 0.3, -5.6, 0, -H, 0), P(flatShape([[0, 0], [2.0, 0], [2.6, 2.6], [1.6, 2.6]], 0.12), 'camo', -1.4, 0.3, -5.6, 0, -H, 0),
          P(Cyl(0.5, 0.5, 0.6, 10), 'black', 0.85, -0.15, -5.9, H, 0, 0), P(Cyl(0.5, 0.5, 0.6, 10), 'black', -0.85, -0.15, -5.9, H, 0, 0));
      } else if (kind === 'stealth') {
        b.push(P(flatShape([[-1.4, -5.5], [-1.6, 1.5], [-0.8, 4.5], [0, 7.5], [0.8, 4.5], [1.6, 1.5], [1.4, -5.5]], 1.0), 'camo', 0, -0.5, 0, -H, 0, 0),
          P(Sph(0.48, 10, 8), 'glass', 0, 0.75, 3.6, 0, 0, 0, 1, 0.8, 2.2),
          P(flatShape([[0, 0], [1.7, 0], [2.2, 2.0], [1.2, 2.0]], 0.1), 'camo', 1.1, 0.4, -4.4, 0, -H, -0.4), P(flatShape([[0, 0], [1.7, 0], [2.2, 2.0], [1.2, 2.0]], 0.1), 'camo', -1.1, 0.4, -4.4, 0, -H, 0.4),
          P(Cyl(0.55, 0.55, 0.6, 10), 'black', 0, 0, -5.6, H, 0, 0));
      } else {
        b.push(P(Cyl(0.55, 0.45, 11, 10), 'camo', 0, 0, 0, H, 0, 0), P(Cyl(0.55, 0.05, 3, 10), 'camo', 0, 0, 7.0, H, 0, 0),
          P(Sph(0.48, 10, 8), 'glass', 0, 0.5, 3.4, 0, 0, 0, 1, 0.85, 2.0), P(Box(1.0, 0.7, 2.2), 'black', 0, -0.55, 2.0),
          P(flatShape([[0, 0], [2.3, 0], [2.8, 2.6], [1.8, 2.6]], 0.12), 'camo', 0, 0.35, -5.3, 0, -H, 0),
          P(flatShape([[-2.6, -1.2], [-0.4, 0.6], [0.4, 0.6], [2.6, -1.2], [2.6, -1.6], [-2.6, -1.6]], 0.1), 'camo', 0, 0, -4.2, -H, 0, 0),
          P(Cyl(0.5, 0.5, 0.6, 10), 'black', 0, 0, -5.8, H, 0, 0));
      }
      b.push(P(Cyl(0.35, 0.35, 0.05, 12), 'accent', 3.0, 0.12, -1.7), P(Cyl(0.35, 0.35, 0.05, 12), 'accent', -3.0, 0.12, -1.7));
      return merge(b);
    }
    function bunkerGeo() {
      return merge([
        P(Box(5.2, 2.2, 4.2), 'light', 0, 1.1, 0), P(Box(5.8, 0.55, 4.8), 'light', 0, 2.45, 0),
        P(Box(3.4, 0.38, 0.3), 'black', 0, 1.55, 2.12), P(Box(0.25, 0.9, 0.25), 'metal', 1.7, 3.0, -1.2),
        P(Box(6.2, 0.7, 1.1), 'gear', 0, 0.35, 2.9), P(Box(1.1, 0.7, 4.6), 'gear', 3.3, 0.35, 0.4), P(Box(1.1, 0.7, 4.6), 'gear', -3.3, 0.35, 0.4),
        P(Box(1.6, 0.04, 1.2), 'accent', -1.4, 2.74, -0.8),
      ]);
    }
    function aaGeo() {
      const base = merge([P(Cyl(1.7, 1.9, 0.6, 12), 'gear', 0, 0.3, 0), P(new T3.TorusGeometry(2.7, 0.5, 6, 16), 'gear', 0, 0.45, 0, H, 0, 0)]);
      const tur = merge([
        P(Box(1.7, 1.1, 1.9), 'camo', 0, 0.55, 0), P(Box(0.5, 0.5, 0.6), 'glass', 0, 0.8, 0.9),
        P(Cyl(0.09, 0.09, 3.4, 6), 'metal', 0.5, 1.7, 1.25, H - 0.85, 0, 0), P(Cyl(0.09, 0.09, 3.4, 6), 'metal', -0.5, 1.7, 1.25, H - 0.85, 0, 0),
        P(Box(0.2, 0.04, 0.6), 'accent', 0, 1.12, -0.6),
      ]);
      const radar = merge([P(Cyl(0.06, 0.06, 0.8, 6), 'metal', 0, 0.4, 0), P(Box(1.5, 0.7, 0.1), 'light', 0, 0.9, 0, -0.3, 0, 0)]);
      return { base, tur, radar };
    }
    function boatGeo() {
      return merge([P(Box(4.5, 1.2, 9), 'camo', 0, 0.3, 0), P(Box(4.5, 1.6, 0.25), 'camo', 0, 0.8, 4.4, -0.2, 0, 0), P(Box(1.4, 1.2, 1.5), 'camo', 0, 1.4, -3.6), P(Box(1.2, 0.4, 0.2), 'glass', 0, 1.7, -2.85)]);
    }

    // ---------- kits (materials + geometry per side) ----------
    const kits = [null, null];
    const HQ = () => !lowFx;
    function stdMat(map, rough, metal, extra) {
      return HQ() ? new T3.MeshStandardMaterial(Object.assign({ map, roughness: rough, metalness: metal }, extra || {})) : new T3.MeshLambertMaterial(Object.assign({ map }, extra || {}));
    }
    function makeKit(look) {
      const mat = stdMat(atlas(look, 'inf'), 0.92, 0);
      const vmat = stdMat(atlas(look, 'veh'), 0.6, 0.2);
      return { look, mat, vmat, sol: soldierGeo(), tank: tankGeo(look.tank, false), art: tankGeo(look.tank === 'west' ? 'west' : 'east', true), heli: heliGeo(look.heli), jet: jetGeo(look.jet), boat: boatGeo(), bunker: bunkerGeo(), aa: aaGeo() };
    }
    const kitGeos = k => [k.sol.body, k.sol.leg, k.tank.hull, k.tank.tur, k.art.hull, k.art.tur, k.heli.body, k.heli.rotor, k.heli.tail, k.jet, k.boat, k.bunker, k.aa.base, k.aa.tur, k.aa.radar];
    function disposeKit(k) {
      if (!k) return;
      [k.mat, k.vmat].forEach(m => { m.map.dispose(); m.dispose(); });
      kitGeos(k).forEach(g => g.dispose());
    }

    // ---------- scene ----------
    let glowT, smokeT, burnt, tracerGeo, tracerMat = [], shellGeo, shellMat, ringGeo, debrisGeo, debrisMat;
    let hemi = null, composer = null, bloom = null, sky = null, envRT = null, pmrem = null, sunOff = null;
    const windU = { value: 0 };
    function height(x, z) {
      const inField = Math.abs(z) < 34 && Math.abs(x) < 64;
      const base = Math.sin(x * 0.11) * Math.cos(z * 0.13) * terA + Math.sin(x * 0.037 + z * 0.05) * terA * 0.8;
      if (inField) return base;
      const out = Math.max(0, Math.abs(z) - 34) + Math.max(0, Math.abs(x) - 64);
      return base + out * (terA > 0.9 ? 0.55 : 0.12) * (0.6 + 0.4 * Math.sin(x * 0.07 + z * 0.09));
    }
    // wind sway for instanced vegetation (vertex shader patch)
    function windify(mat, amp) {
      mat.onBeforeCompile = sh => {
        sh.uniforms.uTime = windU;
        sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
          #ifdef USE_INSTANCING
            float wph = instanceMatrix[3].x * 0.31 + instanceMatrix[3].z * 0.23;
            float wy = max(position.y, 0.0);
            transformed.x += sin(uTime * 1.7 + wph) * ${amp.toFixed(3)} * wy;
            transformed.z += cos(uTime * 1.3 + wph) * ${(amp * 0.6).toFixed(3)} * wy;
          #endif`);
      };
      return mat;
    }
    function mergeSimple(list) {
      const pos = [], nor = [];
      list.forEach(g => { const n = g.index ? g.toNonIndexed() : g; const P2 = n.attributes.position, N2 = n.attributes.normal;
        for (let i = 0; i < P2.count; i++) { pos.push(P2.getX(i), P2.getY(i), P2.getZ(i)); nor.push(N2.getX(i), N2.getY(i), N2.getZ(i)); } g.dispose(); if (n !== g) n.dispose(); });
      const geo = new T3.BufferGeometry();
      geo.setAttribute('position', new T3.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new T3.Float32BufferAttribute(nor, 3));
      geo.computeBoundingSphere(); return geo;
    }
    function grassGeo() {
      const pos = [], col = [];
      for (let k = 0; k < 3; k++) {
        const a = k * Math.PI / 3 + 0.3, cx = Math.cos(a), sz = Math.sin(a);
        for (let b = 0; b < 3; b++) {
          const ox = (b - 1) * 0.22, h = 0.32 + b * 0.09;
          pos.push(-0.2 * cx + ox, 0, -0.2 * sz, 0.2 * cx + ox, 0, 0.2 * sz, ox + 0.06, h, 0.04);
          col.push(0.62, 0.68, 0.48, 0.62, 0.68, 0.48, 1, 1, 0.82);
        }
      }
      const g = new T3.BufferGeometry();
      g.setAttribute('position', new T3.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T3.Float32BufferAttribute(col, 3));
      g.computeVertexNormals(); return g;
    }
    function groundTex() {
      const cv = document.createElement('canvas'); cv.width = cv.height = 512; const g = cv.getContext('2d'), rnd = seeded(31);
      g.fillStyle = '#d9d9d9'; g.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 9000; i++) { const v = 170 + Math.floor(rnd() * 85); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(rnd() * 512, rnd() * 512, 2, 2); }
      for (let i = 0; i < 70; i++) { g.globalAlpha = 0.18; g.fillStyle = rnd() < 0.5 ? '#9a9a9a' : '#f2f2f2'; g.beginPath(); g.ellipse(rnd() * 512, rnd() * 512, 10 + rnd() * 40, 6 + rnd() * 24, rnd() * 3, 0, 7); g.fill(); }
      g.globalAlpha = 0.35; g.strokeStyle = '#8c8c8c'; g.lineWidth = 1;
      for (let i = 0; i < 2600; i++) { const x = rnd() * 512, y = rnd() * 512; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 3, y - 3 - rnd() * 5); g.stroke(); }
      g.globalAlpha = 1;
      const t = new T3.CanvasTexture(cv); t.wrapS = t.wrapT = T3.RepeatWrapping; t.repeat.set(30, 19);
      t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t;
    }
    function skyDome(top, hor, bot, sunDir, sunCol) {
      const m = new T3.ShaderMaterial({
        side: T3.BackSide, depthWrite: false, fog: false,
        uniforms: { top: { value: new T3.Color(top) }, hor: { value: new T3.Color(hor) }, bot: { value: new T3.Color(bot) }, sd: { value: sunDir.clone().normalize() }, sc: { value: new T3.Color(sunCol) } },
        vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'uniform vec3 top, hor, bot, sd, sc; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(hor, top, pow(clamp(h, 0.0, 1.0), 0.5)) : mix(hor, bot, clamp(-h * 5.0, 0.0, 1.0)); float s = max(dot(vP, sd), 0.0); c += sc * (pow(s, 900.0) * 3.0 + pow(s, 18.0) * 0.3 + pow(s, 4.0) * 0.08); gl_FragColor = vec4(c, 1.0); }',
      });
      const o = new T3.Mesh(new T3.SphereGeometry(450, 32, 16), m); o.renderOrder = -1; o.frustumCulled = false; return o;
    }
    const TOD = {
      morning: { sun: [-80, 38, -60], sunC: 0xffd8ae, sunI: 1.2, hs: 0xbfd6f2, hg: 0x564a3a, hi: 0.55, top: 0x4c84c8, hor: 0xf1d8be },
      noon:    { sun: [-35, 95, 35], sunC: 0xfff6e6, sunI: 1.3, hs: 0xcfe3ff, hg: 0x4f4636, hi: 0.6, top: 0x3a7ccf, hor: 0xc6dded },
      dusk:    { sun: [150, 30, -80], sunC: 0xffb07a, sunI: 0.95, hs: 0x9aaad8, hg: 0x4f3f35, hi: 0.62, top: 0x2a3d72, hor: 0xffaa78 },
    };
    const GradeShader = {
      uniforms: { tDiffuse: { value: null }, exposure: { value: 1.0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform sampler2D tDiffuse; uniform float exposure; varying vec2 vUv; vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); } void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb * exposure; c = mix(c, aces(c * 1.5), 0.55); float l = dot(c, vec3(0.299, 0.587, 0.114)); c = mix(vec3(l), c, 1.12); gl_FragColor = vec4(c, 1.0); }',
    };
    function init() {
      if (renderer || !ok) return;
      try { renderer = new T3.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); }
      catch (e) { ok = false; return; }
      lowFx = Math.min(window.innerWidth, window.innerHeight) < 600;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowFx ? 1.5 : 2));
      renderer.shadowMap.enabled = !lowFx;
      renderer.shadowMap.type = T3.PCFSoftShadowMap;
      host.appendChild(renderer.domElement);
      scene = new T3.Scene();
      camera = new T3.PerspectiveCamera(46, 1, 0.5, 900);
      hemi = new T3.HemisphereLight(0xcfe3ff, 0x4a4030, 0.6); scene.add(hemi);
      sun = new T3.DirectionalLight(0xfff1d6, 1.2);
      sun.castShadow = !lowFx;
      Object.assign(sun.shadow.camera, { left: -85, right: 85, top: 55, bottom: -55, near: 10, far: 320 });
      sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
      scene.add(sun, sun.target);
      flash = new T3.PointLight(0xffa040, 0, 45); scene.add(flash);
      glowT = softTex('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
      smokeT = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'); const rnd = seeded(99);
        for (let i = 0; i < 18; i++) { const x = 18 + rnd() * 28, y = 18 + rnd() * 28, r = 8 + rnd() * 14; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
        return new T3.CanvasTexture(cv); })();
      burnt = HQ() ? new T3.MeshStandardMaterial({ color: 0x1c1a17, roughness: 1 }) : new T3.MeshLambertMaterial({ color: 0x1c1a17 });
      tracerGeo = new T3.CylinderGeometry(0.06, 0.06, 1, 4); tracerGeo.rotateX(H); tracerGeo.translate(0, 0, 0.5);
      tracerMat = [new T3.MeshBasicMaterial({ color: 0xffe08a, transparent: true, blending: T3.AdditiveBlending, depthWrite: false }), new T3.MeshBasicMaterial({ color: 0xff8a70, transparent: true, blending: T3.AdditiveBlending, depthWrite: false })];
      shellGeo = new T3.SphereGeometry(0.28, 6, 4); shellMat = new T3.MeshBasicMaterial({ color: 0xffd27a });
      ringGeo = new T3.RingGeometry(0.75, 1, 32).rotateX(-H);
      debrisGeo = new T3.BoxGeometry(0.45, 0.3, 0.6); debrisMat = new T3.MeshLambertMaterial({ color: 0x2a2724 });
      if (HQ()) {
        pmrem = new T3.PMREMGenerator(renderer);
        if (T3.EffectComposer && T3.UnrealBloomPass) {
          const size = renderer.getDrawingBufferSize(new T3.Vector2());
          const rt = renderer.capabilities.isWebGL2 && T3.WebGLMultisampleRenderTarget ? new T3.WebGLMultisampleRenderTarget(size.x, size.y, { format: T3.RGBAFormat }) : undefined;
          composer = new T3.EffectComposer(renderer, rt);
          composer.addPass(new T3.RenderPass(scene, camera));
          bloom = new T3.UnrealBloomPass(new T3.Vector2(size.x, size.y), 0.55, 0.5, 0.82);
          composer.addPass(bloom);
          composer.addPass(new T3.ShaderPass(GradeShader));
        }
      }
      // pointer controls
      const el = renderer.domElement;
      const pts = new Map(); let dragDist = 0, pinch0 = 0;
      el.addEventListener('pointerdown', e => { el.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); dragDist = 0; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); } });
      el.addEventListener('pointermove', e => {
        const p = pts.get(e.pointerId); if (!p) return;
        const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
        if (pts.size === 1) { dragDist += Math.abs(dx) + Math.abs(dy); cam.yaw -= dx * 0.006; cam.pitch = clamp(cam.pitch + dy * 0.004, 0.14, 1.35); }
        else if (pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) cam.dist = clamp(cam.dist * pinch0 / d, 18, 160); pinch0 = d; dragDist += 20; }
      });
      const up = e => {
        const was = pts.size; pts.delete(e.pointerId); if (pts.size < 2) pinch0 = 0;
        if (was === 1 && dragDist < 8 && e.type === 'pointerup' && onTap) onTap(e.clientX, e.clientY);
      };
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
      el.addEventListener('wheel', e => { e.preventDefault(); cam.dist = clamp(cam.dist * (1 + Math.sign(e.deltaY) * 0.1), 18, 160); }, { passive: false });
    }
    let onTap = null;

    function setup(opts) {
      init(); if (!ok) return false;
      clear();
      const rnd = seeded(opts.seed || 7);
      terA = opts.ter >= 1.3 ? 1.1 : opts.ter >= 1.15 ? 0.6 : 0.3;
      // time of day & atmosphere
      const todKey = opts.tod || ['morning', 'noon', 'dusk'][Math.floor(Math.random() * 3)];
      const tod = TOD[todKey];
      const hor = new T3.Color(tod.hor); if (opts.arid) hor.lerp(new T3.Color(0xe6cfa2), 0.45);
      sunOff = new T3.Vector3(...tod.sun);
      sun.color.setHex(tod.sunC); sun.intensity = tod.sunI;
      hemi.color.setHex(tod.hs); hemi.groundColor.setHex(tod.hg); hemi.intensity = tod.hi;
      scene.background = hor.clone();
      scene.fog = new T3.Fog(hor.clone(), 85, 340);
      world = new T3.Group(); scene.add(world);
      sky = skyDome(tod.top, hor, hor.clone().multiplyScalar(0.8), sunOff, tod.sunC);
      scene.add(sky);
      if (pmrem) { if (envRT) envRT.dispose(); const es = new T3.Scene(); es.add(skyDome(tod.top, hor, new T3.Color(0x3a3a30), sunOff, tod.sunC)); envRT = pmrem.fromScene(es, 0.02); scene.environment = envRT.texture; }
      const pal = opts.ter >= 1.3 ? [0x6d6a58, 0x575548, 0x86806a] : opts.arid ? [0xc2a874, 0xa88f60, 0xd6bf8c] : opts.ter >= 1.15 ? [0x4b6a32, 0x384f27, 0x668244] : [0x6f8440, 0x596d32, 0x8a9a52];
      // ground: vertex colours (hue) × tiled detail texture
      const gg = new T3.PlaneGeometry(340, 220, 110, 70); gg.rotateX(-H);
      const pos = gg.attributes.position, col = [];
      const cs = pal.map(h => new T3.Color(h));
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i), y = height(x, z); pos.setY(i, y);
        const k = rnd(), c = cs[0].clone().lerp(k < 0.5 ? cs[1] : cs[2], Math.abs(Math.sin(x * 0.21 + z * 0.17)) * 0.6 + k * 0.25);
        if (Math.abs(z) < 3 + Math.sin(x * 0.2) * 1.5 && Math.abs(x) < 70) c.lerp(new T3.Color(opts.arid ? 0xb39a70 : 0x7d6c50), 0.55); // dirt track
        if (y > 6) c.lerp(new T3.Color(0xeef1f3), clamp((y - 9) / 8, 0, 1));
        col.push(c.r, c.g, c.b);
      }
      gg.setAttribute('color', new T3.Float32BufferAttribute(col, 3)); gg.computeVertexNormals();
      const gtex = groundTex();
      ground = new T3.Mesh(gg, HQ() ? new T3.MeshStandardMaterial({ map: gtex, vertexColors: true, roughness: 1, metalness: 0, envMapIntensity: 0.4 }) : new T3.MeshLambertMaterial({ map: gtex, vertexColors: true }));
      ground.receiveShadow = true; world.add(ground);
      // sea for amphibious landings (animated waves)
      if (opts.sea) {
        const wg = new T3.PlaneGeometry(150, 220, 36, 50).rotateX(-H);
        water = new T3.Mesh(wg, HQ() ? new T3.MeshStandardMaterial({ color: 0x1d5876, roughness: 0.12, metalness: 0.35, transparent: true, opacity: 0.93 }) : new T3.MeshPhongMaterial({ color: 0x1f5674, transparent: true, opacity: 0.9, shininess: 90 }));
        water.position.set(-125, 0.15, 0); world.add(water);
        const beach = new T3.Mesh(new T3.PlaneGeometry(9, 220).rotateX(-H), new T3.MeshLambertMaterial({ color: 0xd2c194 }));
        beach.position.set(-48, 0.22, 0); beach.receiveShadow = true; world.add(beach);
      }
      const m = new T3.Matrix4(), q4 = new T3.Quaternion(), s3 = new T3.Vector3(), p3 = new T3.Vector3(), yAx = new T3.Vector3(0, 1, 0), tc = new T3.Color();
      const placeOK = (x, z) => !(opts.sea && x < -46);
      // grass tufts (wind-animated)
      const nGrass = lowFx ? 0 : opts.arid ? 1500 : opts.ter >= 1.3 ? 2500 : 5500;
      if (nGrass) {
        const gm = windify(new T3.MeshLambertMaterial({ vertexColors: true, side: T3.DoubleSide }), 0.22);
        const grass = new T3.InstancedMesh(grassGeo(), gm, nGrass);
        const gcol = new T3.Color(pal[2]).lerp(new T3.Color(opts.arid ? 0xd8c890 : 0x9ccf5a), 0.35);
        for (let i = 0; i < nGrass; i++) {
          let x = (rnd() - 0.5) * 220, z = (rnd() - 0.5) * 120; if (!placeOK(x, z)) x = -40 + rnd() * 120;
          const sc = 0.8 + rnd() * 0.9;
          q4.setFromAxisAngle(yAx, rnd() * 6.28); s3.set(sc * 1.3, sc * (0.7 + rnd() * 0.5), sc * 1.3); p3.set(x, height(x, z) - 0.03, z);
          grass.setMatrixAt(i, m.compose(p3, q4, s3));
          grass.setColorAt(i, tc.copy(gcol).multiplyScalar(0.75 + rnd() * 0.4));
        }
        world.add(grass);
      }
      // trees: layered pines and leafy trees, instanced, swaying
      const nPine = opts.arid ? 0 : opts.ter >= 1.3 ? 110 : opts.ter >= 1.15 ? 230 : 110;
      const nLeaf = opts.arid ? 18 : opts.ter >= 1.3 ? 10 : opts.ter >= 1.15 ? 70 : 90;
      const trunkGeo = new T3.CylinderGeometry(0.2, 0.32, 2.2, 6); trunkGeo.translate(0, 1.1, 0);
      const pineGeo = mergeSimple([P(new T3.ConeGeometry(2.1, 2.8, 8), 'camo', 0, 2.6).g, P(new T3.ConeGeometry(1.7, 2.5, 8), 'camo', 0, 3.9).g, P(new T3.ConeGeometry(1.15, 2.1, 8), 'camo', 0, 5.1).g]);
      const leafGeo = mergeSimple([P(new T3.IcosahedronGeometry(1.7, 0), 'camo', 0, 3.4).g, P(new T3.IcosahedronGeometry(1.25, 0), 'camo', 1.0, 3.0, 0.4).g, P(new T3.IcosahedronGeometry(1.2, 0), 'camo', -0.9, 3.2, -0.5).g]);
      const vegMat = () => windify(HQ() ? new T3.MeshStandardMaterial({ roughness: 0.95, flatShading: true }) : new T3.MeshLambertMaterial({ flatShading: true }), 0.035);
      const nTrees = nPine + nLeaf;
      const trunks = new T3.InstancedMesh(trunkGeo, new T3.MeshLambertMaterial({ color: 0x4a3826 }), Math.max(1, nTrees));
      const pines = new T3.InstancedMesh(pineGeo, vegMat(), Math.max(1, nPine));
      const leafs = new T3.InstancedMesh(leafGeo, vegMat(), Math.max(1, nLeaf));
      pines.castShadow = leafs.castShadow = trunks.castShadow = !lowFx;
      const pineC = new T3.Color(opts.ter >= 1.3 ? 0x2c4a34 : 0x2a4a26), leafC = new T3.Color(opts.arid ? 0x7d8a4c : 0x4f7a32);
      let ti = 0;
      const placeTree = (inst, i, colr) => {
        let x, z; do { x = (rnd() - 0.5) * 320; z = (rnd() - 0.5) * 200; } while (Math.abs(z) < 26 && Math.abs(x) < 60 && rnd() < 0.85);
        if (!placeOK(x, z)) x = -40 + rnd() * 130;
        const sc = 0.75 + rnd() * 0.75, y = height(x, z);
        q4.setFromAxisAngle(yAx, rnd() * 6.28); s3.set(sc, sc * (0.9 + rnd() * 0.3), sc); p3.set(x, y - 0.1, z);
        m.compose(p3, q4, s3); inst.setMatrixAt(i, m); trunks.setMatrixAt(ti++, m);
        inst.setColorAt(i, tc.copy(colr).multiplyScalar(0.8 + rnd() * 0.4));
      };
      for (let i = 0; i < nPine; i++) placeTree(pines, i, pineC);
      for (let i = 0; i < nLeaf; i++) placeTree(leafs, i, leafC);
      pines.count = nPine; leafs.count = nLeaf; trunks.count = ti;
      world.add(trunks, pines, leafs);
      const nRock = opts.ter >= 1.3 ? 110 : 34;
      const rocks = new T3.InstancedMesh(new T3.DodecahedronGeometry(1, 0), HQ() ? new T3.MeshStandardMaterial({ color: 0x7b776c, roughness: 0.9, flatShading: true }) : new T3.MeshLambertMaterial({ color: 0x77736a }), nRock);
      rocks.castShadow = !lowFx; rocks.receiveShadow = true;
      for (let i = 0; i < nRock; i++) { const x = (rnd() - 0.5) * 280, z = (rnd() - 0.5) * 180, sc = 0.4 + rnd() * (opts.ter >= 1.3 ? 2.4 : 0.9); q4.setFromAxisAngle(yAx, rnd() * 6.28); s3.set(sc, sc * 0.7, sc * (0.8 + rnd() * 0.4)); p3.set(x, height(x, z), z); rocks.setMatrixAt(i, m.compose(p3, q4, s3)); }
      world.add(rocks);
      // defensive line: sandbags
      const bagMat = HQ() ? new T3.MeshStandardMaterial({ color: 0xa08f66, roughness: 1 }) : new T3.MeshLambertMaterial({ color: 0x9a8a62 });
      const bagGeo = new T3.BoxGeometry(5, 1.1, 1.3);
      for (let z = -26; z <= 26; z += 7.5) {
        const x = wx(HOLD_X) + 2 + (rnd() - 0.5) * 2, bag = new T3.Mesh(bagGeo, bagMat);
        bag.position.set(x, height(x, z) + 0.5, z + (rnd() - 0.5) * 2); bag.rotation.y = H + (rnd() - 0.5) * 0.4; bag.castShadow = !lowFx; bag.receiveShadow = true; world.add(bag);
      }
      // border fortifications: rows of concrete dragon's teeth, T-walls from level 2
      const fw = (opts.fort && opts.fort.w) || 0;
      if (fw) {
        const conc = HQ() ? new T3.MeshStandardMaterial({ color: 0xb9b5aa, roughness: 0.95 }) : new T3.MeshLambertMaterial({ color: 0xb9b5aa });
        const toothGeo = new T3.ConeGeometry(0.9, 1.6, 4);
        const nT = Math.ceil(58 / 2.2) * fw, teeth = new T3.InstancedMesh(toothGeo, conc, nT); let k2 = 0;
        teeth.castShadow = !lowFx; teeth.receiveShadow = true;
        for (let row = 0; row < fw; row++) for (let z = -29; z <= 29 && k2 < nT; z += 2.2) {
          const x = wx(HOLD_X) - 5 - row * 2.6 + (row % 2) * 0.6;
          m.makeRotationY(Math.PI / 4).setPosition(x, height(x, z) + 0.7, z + (row % 2) * 1.1); teeth.setMatrixAt(k2++, m);
        }
        teeth.count = k2; world.add(teeth);
        if (fw >= 2) {
          const wallGeo = new T3.BoxGeometry(0.7, 3.2, 3.6);
          for (let z = -27; z <= 27; z += 4.2) {
            if (rnd() < 0.18) continue; // breaches
            const x = wx(HOLD_X) + 6.5, w2 = new T3.Mesh(wallGeo, conc);
            w2.position.set(x, height(x, z) + 1.5, z); w2.castShadow = !lowFx; w2.receiveShadow = true; world.add(w2);
          }
        }
      }
      // kits per side
      kits[0] = makeKit(opts.lookA); kits[1] = makeKit(opts.lookD);
      cam.yaw = -0.62; cam.pitch = 0.46; cam.tx = -20; cam.tz = 0; cam.dist = 62; cam.auto = true; cam.shake = 0;
      resize();
      return true;
    }

    function clear() {
      V.forEach(v => world && world.remove(v.g)); V.clear();
      dying.length = 0; parts.forEach(p => p.o.parent && p.o.parent.remove(p.o)); parts.length = 0;
      pools.tracer.forEach(t => t.parent && t.parent.remove(t)); pools.tracer.length = 0;
      pools.shell.forEach(t => t.parent && t.parent.remove(t)); pools.shell.length = 0;
      pools.jet.forEach(t => t.parent && t.parent.remove(t)); pools.jet.length = 0;
      if (world) {
        world.traverse(o => { if (o.isMesh || o.isInstancedMesh) { if (o.geometry && !isKitGeo(o.geometry)) o.geometry.dispose(); } });
        scene.remove(world); world = null;
      }
      disposeKit(kits[0]); disposeKit(kits[1]); kits[0] = kits[1] = null;
      if (sky) { scene.remove(sky); sky.geometry.dispose(); sky.material.dispose(); sky = null; }
      water = null; ground = null;
    }
    const isKitGeo = g => kits.some(k => k && kitGeos(k).includes(g));

    // ---------- units ----------
    const mesh = (geo, mat, shadow = true) => { const o = new T3.Mesh(geo, mat); o.castShadow = shadow && !lowFx; return o; };
    function add(u) {
      if (!ok || !world) return;
      const k = kits[u.side]; const g = new T3.Group(); const v = { g, u, hd: u.side ? -H : H, px: u.x, py: u.y, moving: 0 };
      if (u.ty === 'inf') {
        const n = lowFx ? 3 : 4; v.sol = [];
        for (let i = 0; i < n; i++) {
          const s = new T3.Group();
          const body = mesh(k.sol.body, k.mat), lL = mesh(k.sol.leg, k.mat, false), lR = mesh(k.sol.leg, k.mat, false);
          lL.position.set(-0.13, 0.86, 0); lR.position.set(0.13, 0.86, 0);
          s.add(body, lL, lR); s.scale.setScalar(1.6);
          const off = [[0, 0], [-1.6, -1.4], [1.5, -1.2], [0.2, -2.8]][i];
          s.position.set(off[0], 0, off[1]); s.userData = { lL, lR, ph: Math.random() * 6, alive: true };
          g.add(s); v.sol.push(s);
        }
      } else if (u.ty === 'tank' || u.ty === 'art') {
        const geo = k[u.ty];
        v.hull = mesh(geo.hull, k.vmat); v.tur = mesh(geo.tur, k.vmat); v.tur.position.y = 1.45;
        g.add(v.hull, v.tur); v.tur.rotation.y = 0;
      } else if (u.ty === 'bunker') {
        v.body = mesh(k.bunker, k.vmat); g.add(v.body); v.body.receiveShadow = true;
      } else if (u.ty === 'aa') {
        v.body = mesh(k.aa.base, k.vmat); v.tur = mesh(k.aa.tur, k.vmat); v.tur.position.y = 0.7;
        v.radar = mesh(k.aa.radar, k.vmat, false); v.radar.position.set(0, 1.2, -0.7); v.tur.add(v.radar);
        g.add(v.body, v.tur);
      } else if (u.ty === 'heli') {
        v.body = mesh(k.heli.body, k.vmat); v.rot = mesh(k.heli.rotor, k.vmat, false); v.rot.position.y = k.heli.mastY;
        g.add(v.body, v.rot);
        if (k.heli.coax) { v.rot2 = mesh(k.heli.rotor, k.vmat, false); v.rot2.position.y = k.heli.mastY + 0.55; g.add(v.rot2); }
        else { v.tail = mesh(k.heli.tail, k.vmat, false); v.tail.position.set(0.35, 1.0, -8.2); g.add(v.tail); }
      } else {
        v.body = mesh(k.jet, k.vmat); g.add(v.body); v.body.scale.setScalar(0.75);
      }
      const p = pos3(u); g.position.copy(p); g.rotation.y = v.hd;
      world.add(g); V.set(u, v);
      if (u.side === 0 && TB && TB.sea && TU[u.ty].layer === 0) spawnBoat(u);
    }
    function pos3(u) {
      const X = wx(u.x), Z = wz(u.y), L = TU[u.ty].layer;
      const y = L === 0 ? height(X, Z) : L === 1 ? height(X, Z) + 8 : 30 + (u.y % 9);
      return new T3.Vector3(X, y, Z);
    }
    function spawnBoat(u) {
      const b = mesh(kits[0].boat, kits[0].vmat); const Z = wz(u.y);
      b.position.set(-90, 0.2, Z); b.rotation.y = H; world.add(b);
      parts.push({ o: b, t: 0, life: 3.5, upd: (p, t) => { p.o.position.x = t < 2.4 ? lerp(-90, -52, Math.min(1, t / 2.4)) : -52 - (t - 2.4) * 12; p.o.position.y = 0.2 + Math.sin(t * 3) * 0.15; } });
    }
    function kill(u) {
      const v = V.get(u); if (!v) return; V.delete(u);
      const P0 = v.g.position.clone();
      if (u.ty === 'inf') {
        v.sol.forEach(s => { if (s.userData.alive) fall(s); });
        dying.push({ g: v.g, t: 0, life: 4, kind: 'inf' });
      } else if (u.ty === 'bunker' || u.ty === 'aa') {
        v.g.traverse(o => { if (o.isMesh) o.material = burnt; });
        if (v.tur) { v.tur.rotation.z = 0.5; v.tur.position.y += 0.4; }
        v.g.scale.y = 0.75;
        dying.push({ g: v.g, t: 0, life: 18, kind: 'wreck', smokeT: 0 });
        burst(P0.x, P0.y + 1.5, P0.z, 1.6);
      } else if (u.ty === 'tank' || u.ty === 'art') {
        v.g.traverse(o => { if (o.isMesh) o.material = burnt; });
        v.tur.rotation.z = 0.15; v.tur.position.y += 0.3; v.tur.rotation.y += (Math.random() - 0.5) * 0.6;
        dying.push({ g: v.g, t: 0, life: 14, kind: 'wreck', smokeT: 0 });
        burst(P0.x, P0.y + 1.5, P0.z, 1.3);
      } else {
        dying.push({ g: v.g, t: 0, life: 3, kind: 'fall', vy: 0, spin: (Math.random() - 0.5) * 3 });
        burst(P0.x, P0.y, P0.z, 1.2);
      }
    }
    function fall(s) { s.userData.alive = false; s.userData.fallT = 0; s.userData.fallDir = Math.random() < 0.5 ? 1 : -1; }

    // ---------- particles ----------
    function sprite(tex, color, blend) {
      const m = new T3.SpriteMaterial({ map: tex, color, transparent: true, depthWrite: false, blending: blend ? T3.AdditiveBlending : T3.NormalBlending });
      return new T3.Sprite(m);
    }
    function addPart(o, life, upd) { world.add(o); parts.push({ o, t: 0, life, upd }); }
    function burst(x, y, z, s = 1) {
      if (!world) return;
      const fire = sprite(glowT, 0xffb050, true); fire.position.set(x, y + 0.8 * s, z);
      addPart(fire, 0.7, (p, t) => { const k = t / p.life; p.o.scale.setScalar((2 + 9 * Math.min(1, k * 2)) * s); p.o.material.opacity = 1 - k; });
      const core = sprite(glowT, 0xffffe0, true); core.position.set(x, y + 0.6 * s, z);
      addPart(core, 0.25, (p, t) => { const k = t / p.life; p.o.scale.setScalar((1 + 6 * k) * s); p.o.material.opacity = 1 - k; });
      const nSm = lowFx ? 3 : 6;
      for (let i = 0; i < nSm; i++) {
        const sm = sprite(smokeT, 0x3a3836, false); sm.position.set(x + (Math.random() - 0.5) * 2 * s, y + 1, z + (Math.random() - 0.5) * 2 * s);
        const vx = (Math.random() - 0.5) * 1.5, vz = (Math.random() - 0.5) * 1.5;
        addPart(sm, 2.6 + Math.random(), (p, t, dt) => { const k = t / p.life; p.o.position.y += dt * 2.2; p.o.position.x += vx * dt; p.o.position.z += vz * dt; p.o.scale.setScalar((2 + 7 * k) * s); p.o.material.opacity = 0.75 * (1 - k); });
      }
      if (!lowFx) for (let i = 0; i < 6; i++) {
        const d = sprite(glowT, 0xffc070, true); d.position.set(x, y + 0.5, z);
        const vx = (Math.random() - 0.5) * 16, vy = 6 + Math.random() * 8, vz = (Math.random() - 0.5) * 16; let VY = vy;
        addPart(d, 0.9, (p, t, dt) => { VY -= 22 * dt; p.o.position.x += vx * dt; p.o.position.y = Math.max(0.2, p.o.position.y + VY * dt); p.o.position.z += vz * dt; p.o.scale.setScalar(0.6); p.o.material.opacity = 1 - t / p.life; });
      }
      const ring = new T3.Mesh(ringGeo, new T3.MeshBasicMaterial({ color: 0xffdcae, transparent: true, blending: T3.AdditiveBlending, depthWrite: false, side: T3.DoubleSide }));
      ring.position.set(x, height(x, z) + 0.3, z);
      addPart(ring, 0.55, (p, t) => { const k = t / p.life; p.o.scale.setScalar(1 + 13 * s * easeOut(k)); p.o.material.opacity = 0.7 * (1 - k); });
      if (!lowFx) for (let i = 0; i < Math.round(4 * s); i++) {
        const d = new T3.Mesh(debrisGeo, debrisMat); d.position.set(x, y + 0.8, z); d.castShadow = true;
        const vx = (Math.random() - 0.5) * 14, vz = (Math.random() - 0.5) * 14, sp = (Math.random() - 0.5) * 12; let VY = 7 + Math.random() * 9;
        addPart(d, 2.2, (p, t, dt) => { const gy = height(p.o.position.x, p.o.position.z) + 0.15; if (p.o.position.y > gy) { VY -= 24 * dt; p.o.position.x += vx * dt; p.o.position.z += vz * dt; p.o.position.y = Math.max(gy, p.o.position.y + VY * dt); p.o.rotation.x += sp * dt; p.o.rotation.z += sp * 0.7 * dt; } });
      }
      cam.shake = Math.min(1.6, (cam.shake || 0) + 0.45 * s);
      const sc = new T3.Mesh(new T3.CircleGeometry(1.6 * s, 10).rotateX(-H), new T3.MeshBasicMaterial({ color: 0x15130f, transparent: true, opacity: 0.55, depthWrite: false }));
      sc.position.set(x, height(x, z) + 0.06, z);
      addPart(sc, 18, (p, t) => { p.o.material.opacity = 0.55 * (1 - t / p.life); });
      if (flash) { flash.position.set(x, y + 3, z); flash.intensity = Math.min(4, flash.intensity + 2.5 * s); }
    }
    function splash(x, z) {
      if (!world) return;
      for (let i = 0; i < 4; i++) { const sp = sprite(glowT, 0xd8eeff, false); sp.position.set(x + (Math.random() - 0.5) * 3, 0.5, z + (Math.random() - 0.5) * 3);
        addPart(sp, 0.8, (p, t) => { const k = t / p.life; p.o.scale.set(2 + 3 * k, 3 + 4 * Math.sin(k * Math.PI), 1); p.o.material.opacity = 0.8 * (1 - k); }); }
    }

    // ---------- per-frame ----------
    const seenBoom = new WeakSet();
    function angLerp(a, b, t) { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * t; }
    function frame(dt, B) {
      if (!ok || !renderer || !world) return;
      time3 += dt;
      // units
      for (const [u, v] of V) {
        const L = TU[u.ty].layer, target = pos3(u);
        const dx = u.x - v.px, dy = u.y - v.py; v.px = u.x; v.py = u.y;
        const sp = Math.hypot(dx, dy) / Math.max(dt, 1e-3);
        v.moving = lerp(v.moving, sp > 2 ? 1 : 0, Math.min(1, dt * 8));
        let want = v.hd;
        if (sp > 2) want = Math.atan2(dx, dy);
        if (u.aimX != null && (L > 0 || sp < 2)) { const ax = u.aimX - u.x, ay = u.aimY - u.y; if (L !== 2 && (u.ty !== 'tank' && u.ty !== 'art')) want = Math.atan2(ax, ay); }
        v.hd = angLerp(v.hd, want, Math.min(1, dt * (L === 2 ? 2.2 : 5)));
        v.g.position.lerp(target, Math.min(1, dt * 12));
        v.g.rotation.y = v.hd;
        const firing = B.time - (u.fireT || -9) < 0.08;
        if (u.ty === 'inf') {
          v.sol.forEach((s, i) => {
            const d = s.userData;
            if (!d.alive) { d.fallT += dt; s.rotation.x = Math.min(H, d.fallT * 4) * d.fallDir; s.position.y = -Math.min(0.2, d.fallT); if (d.fallT > 3) s.visible = false; return; }
            d.ph += dt * 9 * v.moving;
            const sw = Math.sin(d.ph) * 0.6 * v.moving;
            d.lL.rotation.x = sw; d.lR.rotation.x = -sw;
            s.position.y = Math.abs(Math.sin(d.ph)) * 0.08 * v.moving;
            s.rotation.x = firing && i % 2 === 0 ? -0.05 : 0;
          });
          const alive = Math.ceil(clamp(u.hp / u.max, 0, 1) * v.sol.length);
          let cnt = v.sol.filter(s => s.userData.alive).length;
          for (let i = v.sol.length - 1; i >= 0 && cnt > alive; i--) if (v.sol[i].userData.alive) { fall(v.sol[i]); cnt--; }
          if (firing && !lowFx) muzzle(v.g, 0.16, 2.1, 1.6, 0.6);
        } else if (u.ty === 'tank' || u.ty === 'art') {
          let tw = 0;
          if (u.aimX != null) tw = Math.atan2(u.aimX - u.x, u.aimY - u.y) - v.hd;
          v.tur.rotation.y = angLerp(v.tur.rotation.y, tw, Math.min(1, dt * 3));
          v.g.position.y += Math.sin(time3 * 14 + u.ph) * 0.03 * v.moving;
          v.dustT = (v.dustT || 0) - dt;
          if (v.moving > 0.5 && v.dustT <= 0) {
            v.dustT = lowFx ? 0.35 : 0.13;
            const pd = new T3.Vector3((Math.random() - 0.5) * 2.4, 0.5, -3.6); v.g.localToWorld(pd);
            const du = sprite(smokeT, 0xbba98a, false); du.position.copy(pd);
            addPart(du, 1.8, (p, t, dt2) => { const k = t / p.life; p.o.position.y += dt2 * 0.8; p.o.scale.setScalar(1.6 + 5 * k); p.o.material.opacity = 0.5 * (1 - k); });
          }
          if (firing) { muzzleT(v); v.tur.position.z = -0.25; } else v.tur.position.z = lerp(v.tur.position.z, 0, dt * 6);
        } else if (u.ty === 'bunker') {
          if (firing) muzzle(v.g, (Math.random() - 0.5) * 2.4, 1.55, 2.4, 1.1);
        } else if (u.ty === 'aa') {
          v.radar.rotation.y += dt * 3;
          if (u.aimX != null) v.tur.rotation.y = angLerp(v.tur.rotation.y, Math.atan2(u.aimX - u.x, u.aimY - u.y) - v.hd, Math.min(1, dt * 4));
          if (firing) { muzzle(v.tur, 0.5, 2.9, 2.5, 1.3); muzzle(v.tur, -0.5, 2.9, 2.5, 1.3); }
        } else if (u.ty === 'heli') {
          v.rot.rotation.y += dt * 28; if (v.rot2) v.rot2.rotation.y -= dt * 28; if (v.tail) v.tail.rotation.x += dt * 40;
          v.g.position.y += Math.sin(time3 * 2 + u.ph) * 0.4;
          v.body.rotation.x = lerp(v.body.rotation.x, 0.18 * v.moving, dt * 3);
          if (firing) muzzle(v.g, 0, -0.6, 3.8, 1.2);
        } else {
          const turn = angLerp(0, want - v.hd, 1);
          v.body.rotation.z = lerp(v.body.rotation.z, clamp(-turn * 1.4, -1.2, 1.2), dt * 3);
          if (firing) muzzle(v.g, 0.6, 0, 5, 1.2);
        }
      }
      // tracers from shots
      for (const s of B.shots) {
        if (s.t > 0.1 || s.r3) continue; s.r3 = true;
        const a = new T3.Vector3(wx(s.x0), 0, wz(s.y0)), b = new T3.Vector3(wx(s.x1), 0, wz(s.y1));
        a.y = height(a.x, a.z) + (s.air ? 10 : s.aa ? 3 : 1.8); b.y = height(b.x, b.z) + (s.tl === 2 ? 30 : s.tl === 1 ? 8 : 1.2);
        const tr = new T3.Mesh(tracerGeo, tracerMat[s.side]);
        const len = a.distanceTo(b); tr.position.copy(a); tr.lookAt(b);
        const seg = Math.min(4, len * 0.35);
        addPart(tr, 0.16, (p, t) => { const k = t / p.life; p.o.position.lerpVectors(a, b, Math.min(1, k)); p.o.scale.set(1, 1, seg); p.o.material.opacity = 1; });
      }
      // shells
      let si = 0;
      for (const sh of B.shells) {
        let m = pools.shell[si]; if (!m) { m = new T3.Mesh(shellGeo, shellMat); pools.shell.push(m); }
        if (!m.parent) world.add(m);
        const k = sh.t / sh.dur, x = lerp(wx(sh.x0), wx(sh.x1), k), z = lerp(wz(sh.y0), wz(sh.y1), k);
        m.position.set(x, height(x, z) + (sh.big ? 26 * (1 - k) : 2 + Math.sin(k * Math.PI) * 16), z); m.visible = true; si++;
      }
      for (; si < pools.shell.length; si++) pools.shell[si].visible = false;
      // explosions
      for (const b of B.booms) {
        if (seenBoom.has(b)) continue; seenBoom.add(b);
        const X = wx(b.x), Z = wz(b.y);
        if (b.water) splash(X, Z); else if (b.s >= 0.5) burst(X, height(X, Z), Z, b.s);
        else if (!lowFx) { const f = sprite(glowT, 0xffd080, true); f.position.set(X, height(X, Z) + 1.2, Z); addPart(f, 0.18, (p, t) => { p.o.scale.setScalar(1.6); p.o.material.opacity = 1 - t / p.life; }); }
      }
      // strike planes
      let ji = 0;
      for (const st of B.strikes) {
        if (st.kind !== 'air') continue;
        for (let n = 0; n < 3; n++) {
          let jm = pools.jet[ji]; const kit = kits[st.side];
          if (!jm || jm.userData.side !== st.side) { if (jm) world.remove(jm); jm = mesh(kit.jet, kit.vmat); jm.scale.setScalar(0.8); jm.userData.side = st.side; pools.jet[ji] = jm; }
          if (!jm.parent) world.add(jm);
          const p = st.t / 1.6, X = st.side ? lerp(140, -140, p) : lerp(-140, 140, p);
          jm.position.set(X - (st.side ? -1 : 1) * n * 9, 26 + n * 2, wz(st.y) + (n - 1) * 7); jm.rotation.set(0, st.side ? -H : H, 0); jm.visible = p < 1; ji++;
        }
      }
      for (; ji < pools.jet.length; ji++) if (pools.jet[ji]) pools.jet[ji].visible = false;
      // dying / wrecks
      for (let i = dying.length - 1; i >= 0; i--) {
        const d = dying[i]; d.t += dt;
        if (d.kind === 'wreck') {
          d.smokeT -= dt;
          if (d.smokeT <= 0 && d.t < d.life - 2) {
            d.smokeT = lowFx ? 0.5 : 0.25;
            const sm = sprite(smokeT, 0x222020, false); const P0 = d.g.position;
            sm.position.set(P0.x + (Math.random() - 0.5), P0.y + 2.5, P0.z + (Math.random() - 0.5));
            addPart(sm, 3, (p, t, dt2) => { const k = t / p.life; p.o.position.y += dt2 * 3; p.o.position.x += dt2 * 1.2; p.o.scale.setScalar(2 + 6 * k); p.o.material.opacity = 0.6 * (1 - k); });
            if (Math.random() < 0.35) { const fl = sprite(glowT, 0xff7a20, true); fl.position.set(P0.x, P0.y + 1.8, P0.z); addPart(fl, 0.4, (p, t) => { p.o.scale.setScalar(2.2 + Math.random()); p.o.material.opacity = 0.8 * (1 - t / p.life); }); }
          }
          if (d.t > d.life - 2) d.g.position.y -= dt * 0.8;
        } else if (d.kind === 'fall') {
          d.vy -= 18 * dt; d.g.position.y = Math.max(height(d.g.position.x, d.g.position.z), d.g.position.y + d.vy * dt);
          d.g.rotation.z += d.spin * dt; d.g.rotation.x += dt;
          if (!d.boomed && d.g.position.y <= height(d.g.position.x, d.g.position.z) + 0.1) { d.boomed = true; burst(d.g.position.x, d.g.position.y, d.g.position.z, 1.1); d.g.visible = false; }
        } else if (d.kind === 'inf') {
          d.g.children.forEach(s => { const u2 = s.userData; if (u2.fallT != null) { u2.fallT += dt; s.rotation.x = Math.min(H, u2.fallT * 4) * u2.fallDir; } });
        }
        if (d.t >= d.life) { world.remove(d.g); dying.splice(i, 1); }
      }
      // particles
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.t += dt;
        if (p.t >= p.life) { world.remove(p.o); if (p.o.isSprite) p.o.material.dispose(); else if (p.o.geometry && p.o.geometry.type === 'CircleGeometry') { p.o.geometry.dispose(); p.o.material.dispose(); } else if (p.o.geometry === ringGeo) p.o.material.dispose(); parts.splice(i, 1); continue; }
        p.upd(p, p.t, dt);
      }
      if (flash) flash.intensity = Math.max(0, flash.intensity - dt * 8);
      windU.value = time3;
      if (water) {
        const wp = water.geometry.attributes.position;
        for (let i = 0; i < wp.count; i++) { const x = wp.getX(i), z = wp.getZ(i); wp.setY(i, Math.sin(x * 0.22 + time3 * 1.4) * 0.22 + Math.cos(z * 0.17 + time3 * 1.1) * 0.16); }
        wp.needsUpdate = true; if (!lowFx && (Math.floor(time3 * 10) % 3 === 0)) water.geometry.computeVertexNormals();
      }
      // camera: follow the front
      if (cam.auto) {
        let sx = 0, n = 0;
        for (const u of B.units) if (TU[u.ty].layer === 0) { sx += wx(u.x); n++; }
        const fx = n ? sx / n : 0;
        cam.tx = lerp(cam.tx, clamp(fx, -45, 45), Math.min(1, dt * 0.8));
      }
      const asp = renderer.domElement.clientWidth / Math.max(1, renderer.domElement.clientHeight);
      const dist = cam.dist * (asp < 1 ? 1.35 / Math.max(0.55, asp) * 0.75 : 1);
      const cx = cam.tx - Math.cos(cam.yaw) * Math.cos(cam.pitch) * dist, cz = cam.tz + Math.sin(cam.yaw) * Math.cos(cam.pitch) * dist;
      cam.shake = Math.max(0, (cam.shake || 0) - dt * 2.5);
      const sh = prefersReduced ? 0 : cam.shake * 0.35;
      camera.position.set(cx + (Math.random() - 0.5) * sh, Math.sin(cam.pitch) * dist + 2 + (Math.random() - 0.5) * sh, cz + (Math.random() - 0.5) * sh);
      camera.lookAt(cam.tx + 6, 0, cam.tz);
      const so = sunOff || new T3.Vector3(-40, 70, 30), sl = 120 / so.length();
      sun.position.set(cam.tx + so.x * sl, so.y * sl, so.z * sl); sun.target.position.set(cam.tx, 0, 0); sun.target.updateMatrixWorld();
      if (sky) sky.position.copy(camera.position);
      if (composer) composer.render(); else renderer.render(scene, camera);
    }
    function muzzle(g, x, y, z, s) {
      const f = sprite(glowT, 0xffe39a, true); const p = new T3.Vector3(x, y, z); g.localToWorld(p);
      f.position.copy(p); addPart(f, 0.06, (pp) => { pp.o.scale.setScalar(s); });
    }
    function muzzleT(v) {
      const p = new T3.Vector3(0, 0.5, 7.2); v.tur.localToWorld(p);
      const f = sprite(glowT, 0xfff0b0, true); f.position.copy(p); addPart(f, 0.1, (pp, t) => { pp.o.scale.setScalar(3 + t * 20); pp.o.material.opacity = 1 - t / pp.life; });
      if (!lowFx) { const sm = sprite(smokeT, 0x9a9690, false); sm.position.copy(p); addPart(sm, 1.2, (pp, t, dt) => { pp.o.position.y += dt; pp.o.scale.setScalar(1.5 + t * 4); pp.o.material.opacity = 0.5 * (1 - t / pp.life); }); }
    }
    function pick(clientX, clientY) {
      if (!renderer) return null;
      const r = renderer.domElement.getBoundingClientRect();
      ray.setFromCamera({ x: (clientX - r.left) / r.width * 2 - 1, y: -(clientY - r.top) / r.height * 2 + 1 }, camera);
      const hit = new T3.Vector3();
      if (!ray.ray.intersectPlane(new T3.Plane(new T3.Vector3(0, 1, 0), 0), hit)) return null;
      return { x: hit.x / SC + 500, y: hit.z / SC + 340 };
    }
    function resize() {
      if (!renderer) return;
      const w = host.clientWidth || 800, h = host.clientHeight || 500;
      renderer.setSize(w, h, false); renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%';
      camera.aspect = w / h; camera.updateProjectionMatrix();
      if (composer) composer.setSize(w, h);
    }
    return {
      ok: () => ok && !!T3, setup, add, kill, frame, pick, resize, clear,
      lookFor, set onTap(fn) { onTap = fn; }, get cam() { return cam; },
    };
  })();
