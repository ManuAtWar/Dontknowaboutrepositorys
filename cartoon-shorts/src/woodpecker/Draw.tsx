// Code-drawn props and effects in the same flat style as the cut-outs (thick black outlines, flat fills).
import React from 'react';

export const INK = '#151515';

const abs = (x: number, y: number, extra: React.CSSProperties = {}): React.CSSProperties => ({
  position: 'absolute',
  left: x,
  top: y,
  overflow: 'visible',
  ...extra,
});

// ---------------- brain (side view, front = left) ----------------
const LOBES: [number, number, number][] = [
  [27, 44, 21],
  [45, 31, 24],
  [66, 33, 23],
  [81, 46, 16],
  [60, 53, 19],
  [38, 57, 17],
];
const CEREB: [number, number, number] = [77, 62, 11];
const SULCI = [
  'M17 42 q8 -7 14 1 q6 8 12 0',
  'M36 23 q7 6 14 0',
  'M57 20 q-3 9 6 12 q8 3 10 -5',
  'M70 43 q7 -5 13 2',
  'M44 49 q6 -6 12 0 q5 6 11 1',
  'M27 59 q6 -5 11 1',
];
/** Cartoon brain, `w` px wide, drawn with its centre at (0,0) of the parent. */
export const Brain: React.FC<{w: number; ink?: number}> = ({w, ink = 7}) => {
  const h = (w * 90) / 110;
  return (
    <svg viewBox="0 0 110 90" width={w} height={h} style={abs(-w / 2, -h / 2)}>
      <path d="M62 62 L67 82" stroke={INK} strokeWidth={13 + ink} strokeLinecap="round" />
      {[...LOBES, CEREB].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r + ink / 2} fill={INK} />
      ))}
      <path d="M62 62 L67 82" stroke="#DE7C9A" strokeWidth={13} strokeLinecap="round" />
      <circle cx={CEREB[0]} cy={CEREB[1]} r={CEREB[2]} fill="#E88EAA" />
      {LOBES.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#F6A8C0" />
      ))}
      <path d="M30 26 q8 -9 20 -9" stroke="#FFD6E3" strokeWidth={4.5} strokeLinecap="round" fill="none" />
      {SULCI.map((d, i) => (
        <path key={i} d={d} stroke="#C35F81" strokeWidth={3.4} strokeLinecap="round" fill="none" />
      ))}
    </svg>
  );
};

// ---------------- coil spring between two points ----------------
export const Spring: React.FC<{x0: number; y0: number; x1: number; y1: number; r: number; turns: number; w: number}> = ({
  x0,
  y0,
  x1,
  y1,
  r,
  turns,
  w,
}) => {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const ux = (x1 - x0) / len;
  const uy = (y1 - y0) / len;
  const nx = -uy;
  const ny = ux;
  const lead = Math.min(len * 0.12, r * 0.8);
  const pts: string[] = [`${x0},${y0}`];
  const N = turns * 2;
  for (let i = 0; i <= N; i++) {
    const s = lead + ((len - 2 * lead) * i) / N;
    const o = i === 0 || i === N ? 0 : (i % 2 ? 1 : -1) * r;
    pts.push(`${x0 + ux * s + nx * o},${y0 + uy * s + ny * o}`);
  }
  pts.push(`${x1},${y1}`);
  const d = 'M' + pts.join(' L');
  return (
    <g>
      <path d={d} stroke={INK} strokeWidth={w * 2.1} strokeLinejoin="round" strokeLinecap="round" fill="none" />
      <path d={d} stroke="#BFC9D2" strokeWidth={w} strokeLinejoin="round" strokeLinecap="round" fill="none" />
    </g>
  );
};

// ---------------- hammer: pivot (grip end) at (0,0), head on the left, striking face at x = -287 ----------------
export const Hammer: React.FC = () => (
  <svg viewBox="-300 -80 320 160" width={320} height={160} style={abs(-300, -80)}>
    <rect x={-226} y={-13} width={238} height={26} rx={13} fill="#CB8C52" stroke={INK} strokeWidth={6} />
    <path d="M-200 -5 L-60 -5" stroke="#E2AE77" strokeWidth={5} strokeLinecap="round" />
    <rect x={-48} y={-15} width={52} height={30} rx={12} fill="#7B4A28" stroke={INK} strokeWidth={6} />
    <rect x={-280} y={-64} width={66} height={128} rx={12} fill="#9AA6B2" stroke={INK} strokeWidth={6} />
    <rect x={-270} y={-54} width={16} height={108} rx={8} fill="#CCD5DE" />
    <rect x={-287} y={-58} width={16} height={116} rx={6} fill="#7D8995" stroke={INK} strokeWidth={6} />
  </svg>
);

// ---------------- wood chip ----------------
export const Chip: React.FC<{s: number; seed: number}> = ({s, seed}) => {
  const p = [
    [-6, -4],
    [5 + (seed % 3), -6],
    [7, 3],
    [-2, 6 + (seed % 2) * 2],
  ];
  return (
    <svg viewBox="-12 -12 24 24" width={24 * s} height={24 * s} style={abs(-12 * s, -12 * s)}>
      <polygon points={p.map((q) => q.join(',')).join(' ')} fill="#E9B47C" stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
    </svg>
  );
};

// ---------------- impact burst (spiky star) ----------------
export const Burst: React.FC<{r: number; ink: number; spikes?: number; fill?: string}> = ({r, ink, spikes = 9, fill = '#FFF4B8'}) => {
  const pts: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const a = (Math.PI * i) / spikes - Math.PI / 2;
    const rr = i % 2 ? r * 0.5 : r;
    pts.push(`${Math.cos(a) * rr},${Math.sin(a) * rr}`);
  }
  return (
    <svg viewBox={`${-r - ink} ${-r - ink} ${2 * (r + ink)} ${2 * (r + ink)}`} width={2 * (r + ink)} height={2 * (r + ink)} style={abs(-r - ink, -r - ink)}>
      <polygon points={pts.join(' ')} fill={fill} stroke={INK} strokeWidth={ink} strokeLinejoin="round" />
    </svg>
  );
};

// ---------------- puff cloud: circles with ONE merged outline ----------------
export const Puff: React.FC<{circles: [number, number, number][]; ink: number; fill?: string}> = ({circles, ink, fill = '#FFFFFF'}) => {
  const xs = circles.map((c) => [c[0] - c[2], c[0] + c[2]]).flat();
  const ys = circles.map((c) => [c[1] - c[2], c[1] + c[2]]).flat();
  const x0 = Math.min(...xs) - ink;
  const y0 = Math.min(...ys) - ink;
  const w = Math.max(...xs) + ink - x0;
  const h = Math.max(...ys) + ink - y0;
  return (
    <svg viewBox={`${x0} ${y0} ${w} ${h}`} width={w} height={h} style={abs(x0, y0)}>
      {circles.map(([x, y, r], i) => (
        <circle key={'o' + i} cx={x} cy={y} r={r + ink / 2} fill={INK} />
      ))}
      {circles.map(([x, y, r], i) => (
        <circle key={'f' + i} cx={x} cy={y} r={r} fill={fill} />
      ))}
    </svg>
  );
};

// ---------------- 5-point star ----------------
export const Star: React.FC<{r: number; ink: number}> = ({r, ink}) => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI * i) / 5 - Math.PI / 2;
    const rr = i % 2 ? r * 0.47 : r;
    pts.push(`${Math.cos(a) * rr},${Math.sin(a) * rr}`);
  }
  const R = r + ink;
  return (
    <svg viewBox={`${-R} ${-R} ${2 * R} ${2 * R}`} width={2 * R} height={2 * R} style={abs(-R, -R)}>
      <polygon points={pts.join(' ')} fill="#FFD84A" stroke={INK} strokeWidth={ink} strokeLinejoin="round" />
      <circle cx={-r * 0.18} cy={-r * 0.25} r={r * 0.12} fill="#FFF3B5" />
    </svg>
  );
};

// ---------------- speed lines (short round strokes) ----------------
export const SpeedLines: React.FC<{lines: [number, number, number, number][]; w: number}> = ({lines, w}) => (
  <svg style={abs(0, 0)} width={1} height={1}>
    {lines.map(([x0, y0, x1, y1], i) => (
      <path key={i} d={`M${x0} ${y0} L${x1} ${y1}`} stroke={INK} strokeWidth={w} strokeLinecap="round" />
    ))}
  </svg>
);

// ---------------- background pieces (world units at their own depth; `px` = outline in SCREEN px / layer k) ----------------
export const Hills: React.FC<{px: number}> = ({px}) => {
  const row = (y: number, amp: number, phase: number) => {
    let d = `M-3000 ${y}`;
    for (let x = -3000; x <= 4600; x += 400) {
      const yy = y + amp * Math.sin((x + phase) / 520) + amp * 0.5 * Math.sin((x + phase) / 210);
      d += ` Q${x + 200} ${yy - amp * 0.9} ${x + 400} ${yy}`;
    }
    return d + ' L4600 9000 L-3000 9000 Z';
  };
  return (
    <svg style={abs(0, 0)} width={1} height={1}>
      <path d={row(2380, 90, 0)} fill="#B4E19B" stroke={INK} strokeWidth={px} strokeLinejoin="round" />
      <path d={row(2540, 70, 900)} fill="#97D277" stroke={INK} strokeWidth={px} strokeLinejoin="round" />
    </svg>
  );
};

export const Tree: React.FC<{x: number; y: number; s: number; px: number}> = ({x, y, s, px}) => (
  <div style={abs(x, y)}>
    <svg style={abs(0, 0)} width={1} height={1}>
      <rect x={-22 * s} y={-260 * s} width={44 * s} height={262 * s} rx={10 * s} fill="#9A6439" stroke={INK} strokeWidth={px} />
    </svg>
    <Puff
      ink={px}
      fill="#62B94C"
      circles={[
        [-90 * s, -300 * s, 95 * s],
        [0, -380 * s, 120 * s],
        [95 * s, -300 * s, 100 * s],
        [0, -260 * s, 105 * s],
      ]}
    />
  </div>
);

export const Bush: React.FC<{x: number; y: number; s: number; px: number}> = ({x, y, s, px}) => (
  <div style={abs(x, y)}>
    <Puff
      ink={px}
      fill="#6FC152"
      circles={[
        [-110 * s, -40 * s, 70 * s],
        [-30 * s, -85 * s, 95 * s],
        [70 * s, -60 * s, 80 * s],
        [140 * s, -30 * s, 55 * s],
        [10 * s, -20 * s, 80 * s],
      ]}
    />
  </div>
);

export const Cloud: React.FC<{x: number; y: number; s: number; px: number}> = ({x, y, s, px}) => (
  <div style={abs(x, y)}>
    <Puff
      ink={px}
      circles={[
        [-180 * s, 20 * s, 110 * s],
        [-40 * s, -60 * s, 160 * s],
        [130 * s, -10 * s, 130 * s],
        [250 * s, 40 * s, 90 * s],
        [20 * s, 50 * s, 120 * s],
      ]}
    />
  </div>
);

export const GrassTuft: React.FC<{x: number; y: number; s: number; ink: number}> = ({x, y, s, ink}) => (
  <svg style={abs(x, y)} width={1} height={1}>
    <path
      d={`M${-26 * s} 0 L${-18 * s} ${-34 * s} L${-8 * s} ${-6 * s} L${0} ${-48 * s} L${9 * s} ${-6 * s} L${20 * s} ${-36 * s} L${28 * s} 0 Z`}
      fill="#6CB94B"
      stroke={INK}
      strokeWidth={ink}
      strokeLinejoin="round"
    />
  </svg>
);

// ---------------- camera viewfinder overlay (screen space, 1080 x 1920) ----------------
export const Viewfinder: React.FC<{s: number; rec: boolean}> = ({s, rec}) => {
  const m = 70;
  const a = 130;
  const corners = [
    `M${m} ${m + a} L${m} ${m} L${m + a} ${m}`,
    `M${1080 - m - a} ${m} L${1080 - m} ${m} L${1080 - m} ${m + a}`,
    `M${m} ${1920 - m - a} L${m} ${1920 - m} L${m + a} ${1920 - m}`,
    `M${1080 - m - a} ${1920 - m} L${1080 - m} ${1920 - m} L${1080 - m} ${1920 - m - a}`,
  ];
  return (
    <svg
      viewBox="0 0 1080 1920"
      width={1080}
      height={1920}
      style={{position: 'absolute', left: 0, top: 0, transform: `scale(${2 - s})`, transformOrigin: '540px 960px', opacity: s}}
    >
      {corners.map((d, i) => (
        <path key={'o' + i} d={d} stroke={INK} strokeWidth={24} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      ))}
      {corners.map((d, i) => (
        <path key={'w' + i} d={d} stroke="#FFFFFF" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      ))}
      <circle cx={m + 64} cy={m + 64} r={22} fill={rec ? '#FF3B30' : '#7A2320'} stroke={INK} strokeWidth={6} />
      <circle cx={m + 57} cy={m + 57} r={6} fill={rec ? '#FF9A93' : '#9C4B47'} />
    </svg>
  );
};
