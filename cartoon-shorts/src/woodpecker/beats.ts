// Beat table + choreography for the woodpecker Short. Times in seconds on the composition clock
// (voice placed at 0.1 s; word times from images/woodpecker/words.json, +-0.1 s).
import {SPR} from './sprites';
import {
  CamKey, Hit, clamp, damped, deg, easeInCubic, easeInOutCubic, easeInQuad, easeOutBack, easeOutCubic, lerp, seg,
} from './lib';

export const T = {
  voice: 0.1,
  // S1 0.14-2.26 "Why don't woodpeckers get concussions?"
  // S2 2.84-5.38 "The popular answer was a shock-absorbing skull."
  lensIn: 2.98,
  // S3 5.78-7.80 "But high-speed video showed the opposite."
  rec: 5.98, // "high-speed"
  springsOff: 7.3, // "opposite"
  // S4 8.28-9.48 "The head doesn't cushion the hit."
  hit1: 9.3, // "hit"
  // S5 9.76-12.52 "It stops as suddenly as the beak, like a stiff hammer."
  hit2: 11.31, // "beak"
  lensOut: 11.4,
  hammerIn: 11.42,
  hammerHit: 12.16, // "hammer"
  hammerOut: 12.78,
  recOff: 12.62,
  // S6 13.12-14.72 "Cushioning would weaken every peck."
  pillowOn: 12.9,
  pillowOff: 14.98,
  // S7 15.24-16.72 "The real protection is size."
  lens2In: 15.5,
  size: 16.49,
  // S8 17.24-21.96 "A woodpecker's brain is so small and light that it can handle stops that would concuss a human."
  guyLensIn: 18.62, // "small and light" - the big human brain for contrast
  smallLight: 18.65, // "small and light"
  lensesOut: 19.42,
  anticip: 20.7,
  bonk: 20.97, // "concuss"
  dizzy: 21.4,
  smug: 21.6, // "human"
  end: 23.0,
};

// ---------------- world layout (main layer, Z = 1000) ----------------
export const TRUNK_R = 480; // right edge of the trunk (the woodpecker side)
export const TRUNK_W = 210;
export const TRUNK_TOP = -340;
export const GROUND_Y = 1960; // where the trunk enters the ground
export const TRUNK_BASE = {x: TRUNK_R - TRUNK_W / 2, y: GROUND_Y};

export const WS = 0.227; // woodpecker sprite px -> world px
export const PIVOT = {x: TRUNK_R + 1, y: 430}; // claw grip point on the trunk (world)
const WP = SPR.woodpecker_idle;
export const CLAW = {x: WP.claw[0], y: WP.claw[1]};
export const BEAK = {x: WP.beak[0], y: WP.beak[1]};
export const HEAD = {x: 560, y: 215}; // skull centre for the X-ray lens (sprite px, picked on qa/wp_markup.png)

// rotation (deg, clockwise) that puts the beak tip exactly on the bark
const solveHit = () => {
  const dx = BEAK.x - CLAW.x;
  const dy = BEAK.y - CLAW.y;
  const target = (TRUNK_R - 0.5 - PIVOT.x) / WS;
  let lo = -20;
  let hi = 40;
  for (let i = 0; i < 60; i++) {
    const m = (lo + hi) / 2;
    const x = dx * Math.cos(deg(m)) - dy * Math.sin(deg(m));
    if (x < target) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
};
export const ANG_HIT = solveHit();
export const ANG_REST = ANG_HIT + 9;

/** sprite px (idle frame) -> world, for a given bird angle (deg). */
export const birdToWorld = (p: {x: number; y: number}, ang: number) => {
  const dx = (p.x - CLAW.x) * WS;
  const dy = (p.y - CLAW.y) * WS;
  const c = Math.cos(deg(ang));
  const s = Math.sin(deg(ang));
  return {x: PIVOT.x + dx * c - dy * s, y: PIVOT.y + dx * s + dy * c};
};
export const beakWorldAtHit = () => birdToWorld(BEAK, ANG_HIT);

// ---------------- pecks ----------------
export type Peck = {t: number; kind: 'hard' | 'slow' | 'soft'};
const burst = (t0: number, n: number, step = 0.11): Peck[] =>
  Array.from({length: n}, (_, i) => ({t: +(t0 + i * step).toFixed(3), kind: 'hard' as const}));

export const PECKS: Peck[] = [
  ...burst(0.3, 7),
  ...burst(1.42, 6),
  ...[4.42, 4.66, 4.9, 5.14].map((t) => ({t, kind: 'hard' as const})), // springy myth pecks on "shock-absorbing skull"
  {t: T.hit1, kind: 'slow'},
  {t: T.hit2, kind: 'slow'},
  {t: T.hammerHit, kind: 'hard'},
  ...[13.44, 13.92, 14.36].map((t) => ({t, kind: 'soft' as const})), // pillow; last one on "peck"
  ...burst(19.56, 9),
  ...burst(22.12, 5),
];

const HIT = ANG_HIT - ANG_REST; // negative: toward the trunk
const SLOW_BACK = 14; // wind-up lean for the slow-motion strikes

/** Bird angle offset from rest (deg) at time t. */
export const birdAngleOffset = (t: number): number => {
  // slow-motion section 6.1 .. 11.8 is hand-keyed
  if (t >= 6.1 && t < 11.8) {
    if (t < 8.3) return lerp(0, SLOW_BACK, easeInOutCubic(seg(t, 6.1, 8.25)));
    if (t < T.hit1) return lerp(SLOW_BACK, HIT, easeInCubic(seg(t, 8.3, T.hit1)));
    if (t < 9.66) return HIT; // stays stopped dead on the bark
    if (t < 10.5) return lerp(HIT, SLOW_BACK, easeInOutCubic(seg(t, 9.66, 10.45)));
    if (t < T.hit2) return lerp(SLOW_BACK, HIT, easeInCubic(seg(t, 10.58, T.hit2)));
    if (t < 11.48) return HIT;
    return lerp(HIT, 0, easeOutCubic(seg(t, 11.48, 11.8)));
  }
  // nearest normal / soft peck
  let best: Peck | null = null;
  let bi = -1;
  PECKS.forEach((p, i) => {
    if (p.kind === 'slow') return;
    if (best === null || Math.abs(t - p.t) < Math.abs(t - best.t)) {
      best = p;
      bi = i;
    }
  });
  if (!best) return 0;
  const p = best as Peck;
  const prev = PECKS[bi - 1];
  const next = PECKS[bi + 1];
  const gapPrev = prev ? p.t - prev.t : 1;
  const gapNext = next ? next.t - p.t : 1;
  if (p.kind === 'soft') {
    const soft = HIT + 2.2; // the pillow keeps the beak off the bark
    if (t < p.t - 0.22) return 0;
    if (t < p.t - 0.12) return lerp(0, 3, easeOutCubic(seg(t, p.t - 0.22, p.t - 0.12)));
    if (t < p.t) return lerp(3, soft, easeInQuad(seg(t, p.t - 0.12, p.t)));
    if (t < p.t + 0.07) return lerp(soft, HIT + 0.6, easeOutCubic(seg(t, p.t, p.t + 0.07))); // squish
    return lerp(HIT + 0.6, 0, easeOutBack(seg(t, p.t + 0.07, p.t + 0.32), 1.4));
  }
  const strike = Math.min(0.055, gapPrev * 0.42);
  const pre = Math.min(0.07, gapPrev * 0.35);
  const back = Math.min(0.1, gapNext * 0.5);
  const hold = 1 / 60;
  if (t < p.t - strike - pre) return 0;
  if (t < p.t - strike) return lerp(0, 2.5, easeOutCubic(seg(t, p.t - strike - pre, p.t - strike)));
  if (t < p.t) return lerp(2.5, HIT, easeInQuad(seg(t, p.t - strike, p.t)));
  if (t < p.t + hold) return HIT;
  if (t < p.t + hold + back) return lerp(HIT, 0, easeOutCubic(seg(t, p.t + hold, p.t + hold + back)));
  return 0;
};

export type BirdPose = 'woodpecker_idle' | 'woodpecker_pillow' | 'woodpecker_smug';
export const birdPose = (t: number): BirdPose =>
  t >= T.smug ? 'woodpecker_smug' : t >= T.pillowOn && t < T.pillowOff ? 'woodpecker_pillow' : 'woodpecker_idle';

/** Squash on pose swaps (scale about the claw grip). */
export const birdSquash = (t: number) => {
  let sx = 1;
  let sy = 1;
  for (const s of [T.pillowOn, T.pillowOff, T.smug]) {
    const k = damped(t, s - 0.05, 0.06, 3.5, 0.12);
    sx += k * 0.7;
    sy -= k;
  }
  return {sx, sy};
};

// brain wobble inside the lens while the springs exist (myth): inertia keeps the brain going forward (-x)
const MYTH = [4.42, 4.66, 4.9, 5.14];
export const brainWobble = (t: number) =>
  t > T.springsOff ? 0 : MYTH.reduce((acc, c) => acc + damped(t, c, -34, 5.2, 0.16), 0);

// ---------------- hammer ----------------
export const HAMMER = {pivot: {x: TRUNK_R + 287, y: 172}};
export const hammerAngle = (t: number) => {
  if (t < 11.98) return lerp(50, 68, easeOutCubic(seg(t, T.hammerIn, 11.98)));
  if (t < T.hammerHit) return lerp(68, 0, easeInCubic(seg(t, 11.98, T.hammerHit)));
  return Math.abs(damped(t, T.hammerHit, 6, 4.5, 0.07));
};

// ---------------- guy ----------------
export const GUY_FEET_Y = 2030;
const HB = SPR.guy_headbutt;
const GUY_R = SPR.guy_curious.head[2];
export const GUY_SCALE = 1000 / (SPR.guy_curious.feet[1] - SPR.guy_curious.top); // world px per sprite px
export const poseScale = (p: GuyPose) => GUY_SCALE * (GUY_R / SPR[p].head[2]);
// feet x so that the headbutt forehead lands exactly on the bark
export const GUY_FEET_X = TRUNK_R + (HB.feet[0] - HB.forehead[0]) * poseScale('guy_headbutt') - 1;

export type GuyPose = 'guy_curious' | 'guy_headbutt' | 'guy_dizzy';
export const guyPose = (t: number): GuyPose =>
  t >= T.dizzy ? 'guy_dizzy' : t >= T.bonk - 0.01 ? 'guy_headbutt' : 'guy_curious';

/** rotation (deg, about the feet) and squash for the guy. */
export const guyMotion = (t: number) => {
  let rot = 0;
  let sx = 1;
  let sy = 1 + 0.009 * Math.sin(2 * Math.PI * 0.6 * t); // breathing
  let dx = 0;
  if (t >= T.anticip && t < T.bonk - 0.01) {
    const u = easeOutCubic(seg(t, T.anticip, T.bonk - 0.06));
    rot = 5 * u; // lean back
    sy *= 1 - 0.05 * u;
    sx *= 1 + 0.035 * u;
  }
  if (t >= T.bonk - 0.01 && t < T.dizzy) {
    dx = -damped(t, T.bonk, 6, 9, 0.06); // squish into the bark
    dx += 1.5 * Math.sin(2 * Math.PI * 23 * t) * clamp((T.dizzy - t) / 0.3); // tremble
  }
  if (t >= T.dizzy) {
    const k = damped(t, T.dizzy, 0.05, 3, 0.14);
    sy *= 1 + k;
    sx *= 1 - k * 0.7;
    rot = 3.2 * Math.sin(2 * Math.PI * 0.75 * (t - T.dizzy)) * clamp((t - T.dizzy) / 0.4);
  }
  return {rot, sx, sy, dx};
};

// trunk (and everything on it) wobbles after the headbutt, about its base
export const trunkWobble = (t: number) => damped(t, T.bonk, 0.55, 3.2, 0.3);

// ---------------- camera ----------------
export const CAM: CamKey[] = [
  {t: 0, x: 565, y: 455, k: 1.85},
  {t: 2.55, x: 568, y: 445, k: 2.0, e: 'lin'},
  {t: 3.55, x: 600, y: 345, k: 2.85},
  {t: 7.9, x: 596, y: 338, k: 3.0, e: 'lin'},
  {t: 8.95, x: 562, y: 330, k: 3.0},
  {t: 11.38, x: 556, y: 328, k: 3.05, e: 'lin'},
  {t: 12.05, x: 592, y: 262, k: 2.3},
  {t: 12.85, x: 592, y: 262, k: 2.3, e: 'lin'},
  {t: 13.6, x: 578, y: 430, k: 2.1},
  {t: 15.0, x: 578, y: 430, k: 2.14, e: 'lin'},
  {t: 16.0, x: 600, y: 345, k: 2.9},
  {t: 17.1, x: 600, y: 345, k: 2.95, e: 'lin'},
  {t: 18.6, x: 735, y: 1170, k: 0.92},
  {t: 23.0, x: 735, y: 1170, k: 0.95, e: 'lin'},
];

export const HITS: Hit[] = [
  {t: T.hit1, amp: 9, tau: 0.12},
  {t: T.hit2, amp: 6, tau: 0.1},
  {t: T.hammerHit, amp: 9, tau: 0.1},
  {t: T.bonk, amp: 22, tau: 0.16},
];
