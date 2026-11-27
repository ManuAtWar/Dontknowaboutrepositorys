// Small math + camera helpers for the woodpecker Short.
export const FPS = 60;
export const DURATION = 23.0; // seconds (voice ends at ~21.96 s)

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
export const seg = (t: number, t0: number, t1: number) => clamp((t - t0) / (t1 - t0));
export const easeInOutCubic = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
export const easeOutCubic = (u: number) => 1 - Math.pow(1 - u, 3);
export const easeInCubic = (u: number) => u * u * u;
export const easeInQuad = (u: number) => u * u;
export const easeOutQuad = (u: number) => 1 - (1 - u) * (1 - u);
export const easeOutBack = (u: number, s = 1.9) => 1 + (s + 1) * Math.pow(u - 1, 3) + s * Math.pow(u - 1, 2);
export const deg = (d: number) => (d * Math.PI) / 180;

/** Damped sine kick that starts at t0 (0 before). */
export const damped = (t: number, t0: number, amp: number, freq: number, tau: number) =>
  t < t0 ? 0 : amp * Math.exp(-(t - t0) / tau) * Math.sin(2 * Math.PI * freq * (t - t0));

/** Pop-in scale: 0 -> overshoot -> 1 over `dur`; pop-out mirrored before `t1` (if given). */
export const pop = (t: number, t0: number, t1 = Infinity, dur = 0.28, outDur = 0.18) => {
  if (t < t0 || t > t1) return 0;
  const a = easeOutBack(seg(t, t0, t0 + dur));
  const b = t1 === Infinity ? 1 : easeInCubic(1 - seg(t, t1 - outDur, t1));
  return Math.max(0, a) * b;
};

/** Deterministic pseudo random in [0,1) from an integer seed. */
export const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// ---------------- camera ----------------
export type CamKey = {t: number; x: number; y: number; k: number; e?: 'io' | 'out' | 'lin'};
export type Cam = {x: number; y: number; k: number; z: number};
const F = 1000; // focal length; the main layer sits at Z = 1000

export const camAt = (t: number, keys: CamKey[]): Cam => {
  let a = keys[0];
  let b = keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    if (t >= keys[i].t) {
      a = keys[i];
      b = keys[i + 1];
    }
  }
  if (t >= keys[keys.length - 1].t) a = b = keys[keys.length - 1];
  const u0 = a === b ? 1 : seg(t, a.t, b.t);
  const e = b.e ?? 'io';
  const u = e === 'lin' ? u0 : e === 'out' ? easeOutCubic(u0) : easeInOutCubic(u0);
  const k = Math.exp(lerp(Math.log(a.k), Math.log(b.k), u));
  return {x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), k, z: F - F / k};
};

/** Scale of a layer at depth Z for the camera. */
export const layerK = (cam: Cam, Z: number) => F / (Z - cam.z);

// ---------------- screen shake (sums of sines, never random per frame) ----------------
export type Hit = {t: number; amp: number; tau: number};
export const shakeAt = (t: number, hits: Hit[]) => {
  let x = 0;
  let y = 0;
  for (const h of hits) {
    if (t < h.t) continue;
    const e = h.amp * Math.exp(-(t - h.t) / h.tau);
    x += e * (Math.sin(2 * Math.PI * 13.3 * t) * 0.7 + Math.sin(2 * Math.PI * 7.1 * t + 1.3) * 0.5);
    y += e * (Math.sin(2 * Math.PI * 11.7 * t + 0.4) * 0.7 + Math.sin(2 * Math.PI * 5.3 * t + 2.1) * 0.5);
  }
  return {x, y};
};
