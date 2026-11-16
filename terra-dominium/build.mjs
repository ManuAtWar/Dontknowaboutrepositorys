// Build script for TERRA DOMINIUM.
// Usage: node build.mjs
// Produces:
//   index.html          – self-contained game, loads d3/topojson from ./vendor (works offline)
//   dist/artifact.html  – same game, loads d3/topojson from public CDNs (for web hosting)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const topojson = require('./vendor/topojson-client.min.js');

const topo = JSON.parse(readFileSync(join(ROOT, 'data/countries-50m.json'), 'utf8'));

// ---------- 1. Military database ----------
const KEYS = ['sol','res','tank','afv','art','mlrs','ftr','bmb','heli','cv','amph','dd','ff','cor','ss','nuk'];
const rows = readFileSync(join(ROOT, 'data/military.txt'), 'utf8')
  .split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
const db = new Map();
for (const line of rows) {
  const p = line.split(';');
  if (p.length !== 24) throw new Error(`Bad column count (${p.length}) in: ${line}`);
  const [id, name, pop, gdp, bud, ...rest] = p;
  const nums = rest.slice(0, 16).map(Number);
  if (nums.some(Number.isNaN)) throw new Error(`NaN in: ${line}`);
  db.set(id, {
    k: id, n: name, pop: +pop, gdp: +gdp, bud: +bud, m: nums,
    t: +rest[16], ter: +rest[17], s: rest[18],
  });
}

// ---------- 2. Map geometries -> sovereign states ----------
// Dependent territories are merged into the state that administers them.
const MERGE = {
  580:840, 850:840, 316:840, 16:840, 630:840,                                   // USA
  239:826, 86:826, 654:826, 612:826, 660:826, 238:826, 136:826, 60:826,          // UK
  92:826, 796:826, 500:826, 832:826, 831:826, 833:826,
  533:528, 531:528, 534:528,                                                     // Niederlande
  666:250, 876:250, 663:250, 652:250, 258:250, 540:250, 260:250,                 // Frankreich
  248:246,                                                                        // Finnland (Åland)
  304:208, 234:208,                                                              // Dänemark
  446:156, 344:156,                                                              // China
  334:36, 574:36,                                                                // Australien
  570:554, 184:554,                                                              // Neuseeland
  732:504,                                                                        // Marokko (W. Sahara)
};
const BY_NAME = { 'Kosovo': 'XKX', 'Somaliland': '706', 'N. Cyprus': '196', 'Indian Ocean Ter.': '036', 'Siachen Glacier': '356' };
const pad = n => String(n).padStart(3, '0');

const geoms = topo.objects.countries.geometries;
const keyOf = g => {
  if (g.properties.name === 'Antarctica') return null;
  if (!g.id) return BY_NAME[g.properties.name] ?? null;
  const n = +g.id;
  return pad(MERGE[n] ?? n);
};

const used = new Set();
for (const g of geoms) { const k = keyOf(g); if (k) used.add(k); }
const missingData = [...used].filter(k => !db.has(k));
const missingMap = [...db.keys()].filter(k => !used.has(k));
if (missingData.length) throw new Error('No military data for map ids: ' + missingData.join(', '));
if (missingMap.length) console.warn('Data rows without map shape (ignored):', missingMap.join(', '));

const countries = [...used].map(k => db.get(k)).sort((a, b) => a.n.localeCompare(b.n, 'de'));
const index = new Map(countries.map((c, i) => [c.k, i]));
const N = countries.length;

// keep only non-Antarctica geometries, tag with country index
const kept = [];
for (const g of geoms) {
  const k = keyOf(g);
  if (!k) continue;
  const terr = g.id && MERGE[+g.id] != null; // dependent territory merged into its state
  g.id = index.get(k);
  if (terr) g.properties = { t: 1 }; else delete g.properties;
  kept.push(g);
}
topo.objects = { c: { type: 'GeometryCollection', geometries: kept } };

// ---------- 3. Land neighbours ----------
const nbGeom = topojson.neighbors(kept);
const nb = Array.from({ length: N }, () => new Set());
kept.forEach((g, i) => nbGeom[i].forEach(j => { const a = g.id, b = kept[j].id; if (a !== b) { nb[a].add(b); nb[b].add(a); } }));

// ---------- 3b. Coastal states (any border arc not shared with another shape) ----------
const arcUse = new Map();
const walkArcs = (a, fn) => Array.isArray(a) ? a.forEach(x => walkArcs(x, fn)) : fn(a < 0 ? ~a : a);
kept.forEach(g => walkArcs(g.arcs, i => arcUse.set(i, (arcUse.get(i) || 0) + 1)));
const coast = new Array(N).fill(0);
kept.forEach(g => walkArcs(g.arcs, i => { if (arcUse.get(i) === 1) coast[g.id] = 1; }));

// ---------- 4. Coast-to-coast distances (km) ----------
const feats = topojson.feature(topo, topo.objects.c).features;
const pts = Array.from({ length: N }, () => []);
const pushRing = (i, ring) => { for (const [lon, lat] of ring) pts[i].push([lon, lat]); };
for (const f of feats) {
  const g = f.geometry; if (!g) continue;
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  for (const poly of polys) pushRing(f.id, poly[0]);
}
const MAXP = 260;
const vec = pts.map(list => {
  const step = Math.max(1, Math.floor(list.length / MAXP));
  const out = [];
  for (let i = 0; i < list.length; i += step) {
    const [lon, lat] = list[i]; const la = lat * Math.PI / 180, lo = lon * Math.PI / 180;
    out.push(Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la));
  }
  return Float64Array.from(out);
});
const dist = new Uint16Array(N * N);
for (let a = 0; a < N; a++) {
  for (let b = a + 1; b < N; b++) {
    let best = -1; const A = vec[a], B = vec[b];
    for (let i = 0; i < A.length; i += 3) {
      const x = A[i], y = A[i + 1], z = A[i + 2];
      for (let j = 0; j < B.length; j += 3) {
        const d = x * B[j] + y * B[j + 1] + z * B[j + 2];
        if (d > best) best = d;
      }
    }
    const km = nb[a].has(b) ? 0 : Math.acos(Math.min(1, best)) * 6371;
    const v = Math.min(65535, Math.round(km / 10));
    dist[a * N + b] = dist[b * N + a] = v;
  }
}

const data = {
  c: countries,
  nb: nb.map(s => [...s].sort((x, y) => x - y)),
  coast,
  dist: Buffer.from(dist.buffer).toString('base64'),
};

// ---------- 5. Assemble HTML ----------
const tpl = readFileSync(join(ROOT, 'src/template.html'), 'utf8');
const css = readFileSync(join(ROOT, 'src/style.css'), 'utf8');
const js = readFileSync(join(ROOT, 'src/game.js'), 'utf8').replace('/*TACTICAL*/', () => readFileSync(join(ROOT, 'src/tactical.js'), 'utf8'));
const dataScript = `<script>window.TD_DATA=${JSON.stringify(data)};window.TD_TOPO=${JSON.stringify(topo)};</script>`;

const page = libs => tpl
  .replace('/*CSS*/', () => css)
  .replace('<!--LIBS-->', () => libs)
  .replace('<!--DATA-->', () => dataScript)
  .replace('/*GAME*/', () => js);

const cdn = '<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js"></script>\n'
  + '<script src="https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js"></script>';
const local = '<script src="vendor/d3.min.js"></script>\n<script src="vendor/topojson-client.min.js"></script>';

mkdirSync(join(ROOT, 'dist'), { recursive: true });
writeFileSync(join(ROOT, 'dist/artifact.html'), page(cdn));
writeFileSync(join(ROOT, 'index.html'),
  '<!doctype html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n'
  + '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
  + '</head>\n<body>\n' + page(local) + '\n</body>\n</html>\n');

console.log(`Built ${N} countries, ${kept.length} shapes. index.html ${(readFileSync(join(ROOT, 'index.html')).length / 1024).toFixed(0)} KB`);
