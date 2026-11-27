// "Why don't woodpeckers get concussions?" - cut-out cartoon Short (Higgsfield cut-outs + code animation).
import React from 'react';
import {AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {SPR} from './sprites';
import {
  ANG_REST, BEAK, CAM, CLAW, GROUND_Y, GUY_FEET_X, GUY_FEET_Y, HAMMER, HEAD, HITS, PECKS, PIVOT, T, TRUNK_BASE, TRUNK_R,
  TRUNK_TOP, TRUNK_W, WS, BirdPose, beakWorldAtHit, birdAngleOffset, birdPose, birdSquash, brainWobble, guyMotion, guyPose,
  hammerAngle, poseScale, trunkWobble,
} from './beats';
import {Cam, FPS, camAt, clamp, damped, easeInCubic, easeOutBack, easeOutCubic, layerK, pop, rand, seg, shakeAt} from './lib';
import {
  Brain, Burst, Bush, Chip, Cloud, GrassTuft, Hammer, Hills, INK, Puff, SpeedLines, Spring, Star, Tree, Viewfinder,
} from './Draw';

const A = (x: number, y: number, extra: React.CSSProperties = {}): React.CSSProperties => ({
  position: 'absolute',
  left: x,
  top: y,
  ...extra,
});

// ---------------- multiplane layer ----------------
const Layer: React.FC<{cam: Cam; Z: number; blur?: number; children: React.ReactNode}> = ({cam, Z, blur = 0, children}) => {
  const d = Z - cam.z;
  if (d < 300) return null;
  const k = 1000 / d;
  return (
    <AbsoluteFill style={{filter: blur > 0.05 ? `blur(${blur}px)` : undefined}}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transformOrigin: '0 0',
          transform: `translate(540px, 960px) scale(${k}) translate(${-cam.x}px, ${-cam.y}px)`,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

// ---------------- X-ray lens (in the parent sprite's pixel space) ----------------
const Lens: React.FC<{
  cx: number;
  cy: number;
  r: number;
  s: number;
  ink: number;
  ghost: {file: string; x: number; y: number; w: number; h: number};
  children: React.ReactNode;
}> = ({cx, cy, r, s, ink, ghost, children}) => {
  if (s <= 0.001) return null;
  return (
    <div style={A(cx - r, cy - r, {width: 2 * r, height: 2 * r, transform: `scale(${s})`, transformOrigin: '50% 50%'})}>
      <div style={{position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden', background: '#E2F5FF'}}>
        <Img
          src={staticFile(ghost.file)}
          style={A(ghost.x - (cx - r), ghost.y - (cy - r), {
            width: ghost.w,
            height: ghost.h,
            opacity: 0.26,
            filter: 'grayscale(1) brightness(1.2)',
          })}
        />
        {children}
      </div>
      <svg style={A(0, 0, {overflow: 'visible'})} width={2 * r} height={2 * r}>
        <circle cx={r} cy={r} r={r} fill="none" stroke={INK} strokeWidth={ink} />
        <path
          d={`M${r - r * 0.62} ${r - r * 0.5} A ${r * 0.8} ${r * 0.8} 0 0 1 ${r - r * 0.05} ${r - r * 0.79}`}
          stroke="#FFFFFF"
          strokeWidth={ink * 0.55}
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
  );
};

// ---------------- the woodpecker ----------------
const SLOW_HITS = [T.hit1, T.hit2];
const Bird: React.FC<{t: number}> = ({t}) => {
  const pose: BirdPose = birdPose(t);
  const S = SPR[pose];
  const ang = ANG_REST + birdAngleOffset(t);
  const {sx, sy} = birdSquash(t);
  const ghost = {file: S.file, x: S.rel[0], y: S.rel[1], w: S.w, h: S.h};

  // lens 1: myth (springs) -> truth; lens 2: "size"
  const s1 = pop(t, T.lensIn, T.lensOut);
  const s2 = pop(t, T.lens2In, T.lensesOut);
  const R = 235;
  const brainPulse = 1 + damped(t, T.size - 0.05, 0.3, 2.2, 0.35) + damped(t, T.smallLight, 0.06, 1.6, 0.5);
  const bob = t > T.smallLight && t < T.lensesOut ? -14 * Math.sin(Math.PI * seg(t, T.smallLight, T.smallLight + 0.7)) : 0;
  const bx = R + brainWobble(t);
  const by = R + 8 + bob;
  const bw = 110 * brainPulse;
  // springs fly off on "opposite"
  const off = seg(t, T.springsOff, T.springsOff + 0.5);
  const springsOn = t < T.springsOff + 0.5;
  const fly = (dir: number) => ({
    transform: `translate(${dir * 420 * easeInCubic(off)}px, ${-160 * off + 420 * off * off}px) rotate(${dir * 200 * off}deg)`,
    transformOrigin: `${R + dir * R * 0.55}px ${by}px`,
  });

  // pillow swap puffs
  const puffAt = (ts: number) => {
    const u = seg(t, ts - 0.08, ts + 0.42);
    if (u <= 0 || u >= 1) return 0;
    return u < 0.25 ? easeOutBack(u / 0.25) : easeInCubic(1 - (u - 0.25) / 0.75);
  };
  const ps = Math.max(puffAt(T.pillowOn), puffAt(T.pillowOff));
  // soft-peck fluff
  const soft = PECKS.filter((p) => p.kind === 'soft' && t >= p.t && t < p.t + 0.36);
  // slow-hit speed lines right before contact
  const speed = SLOW_HITS.some((h) => t > h - 0.3 && t < h);

  return (
    <div
      style={A(0, 0, {
        transformOrigin: '0 0',
        transform: `translate(${PIVOT.x}px, ${PIVOT.y}px) rotate(${ang}deg) scale(${WS * sx}, ${WS * sy}) translate(${-CLAW.x}px, ${-CLAW.y}px)`,
      })}
    >
      <Img src={staticFile(S.file)} style={A(S.rel[0], S.rel[1], {width: S.w, height: S.h})} />
      {speed ? (
        <SpeedLines
          w={15}
          lines={[
            [770, 70, 930, 30],
            [820, 200, 1010, 175],
            [790, 330, 950, 330],
          ]}
        />
      ) : null}
      <Lens cx={HEAD.x} cy={HEAD.y} r={R} s={Math.max(s1, s2)} ink={18} ghost={ghost}>
        <svg style={A(0, 0, {overflow: 'visible'})} width={2 * R} height={2 * R}>
          {springsOn && s1 > 0 ? (
            <>
              <g style={fly(-1)}>
                <Spring x0={20} y0={by} x1={bx - bw * 0.4} y1={by} r={50} turns={4} w={12} />
              </g>
              <g style={fly(1)}>
                <Spring x0={bx + bw * 0.42} y0={by} x1={2 * R - 20} y1={by} r={50} turns={4} w={12} />
              </g>
            </>
          ) : null}
        </svg>
        <div style={A(bx, by)}>
          <Brain w={bw} ink={10} />
        </div>
      </Lens>
      {ps > 0 ? (
        <div style={A(150, 170, {transform: `scale(${ps})`})}>
          <Puff
            ink={16}
            circles={[
              [-90, -40, 95],
              [30, -95, 115],
              [140, -20, 100],
              [40, 60, 110],
              [-70, 70, 85],
            ]}
          />
        </div>
      ) : null}
      {soft.map((p, i) => {
        const u = (t - p.t) / 0.36;
        const sc = Math.sin(Math.PI * u);
        return (
          <div key={i} style={A(60 - 90 * u, 150 - 60 * u, {transform: `scale(${sc})`})}>
            <Puff ink={12} circles={[[0, 0, 40], [44, -18, 30], [30, 26, 28]]} />
          </div>
        );
      })}
    </div>
  );
};

// ---------------- wood chips + impact bursts (world) ----------------
const Chips: React.FC<{t: number}> = ({t}) => {
  const c = beakWorldAtHit();
  const out: React.ReactNode[] = [];
  PECKS.forEach((p, pi) => {
    if (p.kind === 'soft') return;
    const slow = p.kind === 'slow';
    const tau = (t - p.t) * (slow ? 0.5 : 1);
    if (tau < 0 || tau > 0.6) return;
    const n = slow ? 6 : 3;
    for (let i = 0; i < n; i++) {
      const seed = pi * 17 + i * 5;
      const vx = 150 + 260 * rand(seed);
      const vy = -(140 + 330 * rand(seed + 1));
      const x = c.x + 6 + vx * tau;
      const y = c.y + (rand(seed + 2) - 0.5) * 16 + vy * tau + 0.5 * 1500 * tau * tau;
      const s = (0.75 + 0.5 * rand(seed + 3)) * (tau > 0.42 ? 1 - (tau - 0.42) / 0.18 : 1);
      const rot = (rand(seed + 4) - 0.5) * 1400 * tau;
      out.push(
        <div key={`${pi}-${i}`} style={A(x, y, {transform: `rotate(${rot}deg)`})}>
          <Chip s={s} seed={seed} />
        </div>,
      );
    }
  });
  // bursts on the slow-motion hits and the hammer
  const bursts: [number, number, number, number][] = [
    [T.hit1, c.x, c.y, 30],
    [T.hit2, c.x, c.y, 26],
    [T.hammerHit, TRUNK_R + 2, HAMMER.pivot.y, 34],
  ];
  bursts.forEach(([tb, x, y, r], i) => {
    const u = seg(t, tb, tb + 0.26);
    if (u <= 0 || u >= 1) return;
    const sc = u < 0.3 ? easeOutBack(u / 0.3) : 1 - easeInCubic((u - 0.3) / 0.7);
    out.push(
      <div key={'b' + i} style={A(x, y, {transform: `scale(${sc}) rotate(${i * 13}deg)`})}>
        <Burst r={r} ink={4.5} />
      </div>,
    );
  });
  return <>{out}</>;
};

// ---------------- the guy ----------------
const Guy: React.FC<{t: number}> = ({t}) => {
  const pose = guyPose(t);
  const S = SPR[pose];
  const sc = poseScale(pose);
  const m = guyMotion(t);
  const sLens = pose === 'guy_curious' ? pop(t, T.guyLensIn, T.lensesOut) : 0;
  const cur = SPR.guy_curious;
  const RL = 290;
  const starsOn = t >= T.dizzy + 0.04;
  const starPop = pop(t, T.dizzy + 0.04);
  const head = S.head;
  return (
    <>
      <div
        style={A(GUY_FEET_X - 215, GUY_FEET_Y - 22, {
          width: 430,
          height: 48,
          borderRadius: '50%',
          background: 'rgba(72, 54, 42, 0.26)',
          filter: 'blur(3px)',
        })}
      />
      <div
        style={A(0, 0, {
          transformOrigin: '0 0',
          transform: `translate(${GUY_FEET_X + m.dx}px, ${GUY_FEET_Y}px) rotate(${m.rot}deg) scale(${sc * m.sx}, ${sc * m.sy}) translate(${-S.feet[0]}px, ${-S.feet[1]}px)`,
        })}
      >
        <Img src={staticFile(S.file)} style={A(0, 0, {width: S.w, height: S.h})} />
        {pose === 'guy_curious' ? (
          <Lens cx={cur.head[0]} cy={cur.head[1] + 10} r={RL} s={sLens} ink={16} ghost={{file: cur.file, x: 0, y: 0, w: cur.w, h: cur.h}}>
            <div style={A(RL + 6, RL + 4, {transform: `scale(${1 + damped(t, T.guyLensIn + 0.1, 0.05, 2, 0.3)})`})}>
              <Brain w={375} ink={6} />
            </div>
          </Lens>
        ) : null}
        {starsOn
          ? [0, 1, 2].map((i) => {
              const a = 2 * Math.PI * (1.25 * (t - T.dizzy) + i / 3);
              const x = head[0] + 300 * Math.cos(a);
              const y = head[1] - head[2] * 1.02 + 72 * Math.sin(a);
              const depth = 0.82 + 0.18 * Math.sin(a);
              return (
                <div key={i} style={A(x, y, {transform: `scale(${starPop * depth}) rotate(${(t - T.dizzy) * 220 + i * 40}deg)`})}>
                  <Star r={64} ink={11} />
                </div>
              );
            })
          : null}
      </div>
    </>
  );
};

// headbutt impact burst (world)
const HB = SPR.guy_headbutt;
const FOREHEAD_Y = GUY_FEET_Y - (HB.feet[1] - HB.forehead[1]) * poseScale('guy_headbutt');
const Bonk: React.FC<{t: number}> = ({t}) => {
  const u = seg(t, T.bonk, T.bonk + 0.34);
  if (u <= 0 || u >= 1) return null;
  const sc = u < 0.25 ? easeOutBack(u / 0.25) : 1 - easeInCubic((u - 0.25) / 0.75);
  return (
    <div style={A(TRUNK_R - 4, FOREHEAD_Y, {transform: `scale(${sc})`})}>
      <Burst r={70} ink={7} spikes={10} />
    </div>
  );
};

// ---------------- scenery ----------------
const TRUNK = SPR.trunk;
const TSX = TRUNK_W / (TRUNK.right - TRUNK.left);
const TRUNK_H = GROUND_Y + 80 - TRUNK_TOP;

const Background: React.FC<{cam: Cam}> = ({cam}) => {
  const blur = clamp((cam.k - 1.5) / 1.3) * 3.2;
  const kC = layerK(cam, 6000);
  const kH = layerK(cam, 3000);
  const kT = layerK(cam, 2200);
  const kB = layerK(cam, 1500);
  return (
    <>
      <Layer cam={cam} Z={6000} blur={blur * 0.8}>
        <Cloud x={-900} y={-3050} s={1.6} px={3.5 / kC} />
        <Cloud x={1500} y={-2700} s={1.25} px={3.5 / kC} />
        <Cloud x={3100} y={-3300} s={1.4} px={3.5 / kC} />
        <Cloud x={-2600} y={-2500} s={1.1} px={3.5 / kC} />
      </Layer>
      <Layer cam={cam} Z={3000} blur={blur}>
        <div style={A(0, 235)}><Hills px={4 / kH} /></div>
      </Layer>
      <Layer cam={cam} Z={2200} blur={blur}>
        <Tree x={-760} y={2540} s={1.0} px={4 / kT} />
        <Tree x={-280} y={2580} s={0.8} px={4 / kT} />
        <Tree x={1780} y={2550} s={1.1} px={4 / kT} />
        <Tree x={2310} y={2590} s={0.85} px={4 / kT} />
      </Layer>
      <Layer cam={cam} Z={1500} blur={blur * 0.7}>
        <Bush x={-260} y={2390} s={1.1} px={4.5 / kB} />
        <Bush x={420} y={2410} s={0.9} px={4.5 / kB} />
        <Bush x={1300} y={2380} s={1.2} px={4.5 / kB} />
        <Bush x={1900} y={2410} s={1.0} px={4.5 / kB} />
      </Layer>
    </>
  );
};

const TUFTS = Array.from({length: 26}, (_, i) => {
  const x = -620 + i * 110 + (rand(i + 40) - 0.5) * 50;
  return {x, y: GROUND_Y + 6 + rand(i + 90) * 20, s: 0.9 + rand(i + 7) * 0.6};
});

const Ground: React.FC = () => (
  <>
    <div style={A(-3000, GROUND_Y, {width: 9000, height: 4000, background: '#86C862'})} />
    {TUFTS.map((g, i) => (
      <GrassTuft key={i} x={g.x} y={g.y} s={g.s} ink={4.5} />
    ))}
    <GrassTuft x={TRUNK_BASE.x - 120} y={GROUND_Y + 14} s={1.5} ink={4.5} />
    <GrassTuft x={TRUNK_BASE.x - 40} y={GROUND_Y + 20} s={1.8} ink={4.5} />
    <GrassTuft x={TRUNK_BASE.x + 55} y={GROUND_Y + 16} s={1.6} ink={4.5} />
    <GrassTuft x={TRUNK_BASE.x + 130} y={GROUND_Y + 12} s={1.3} ink={4.5} />
  </>
);

// ---------------- sound ----------------
type Cue = {f: string; at: number; db: number};
const CUES: Cue[] = (() => {
  const c: Cue[] = [];
  PECKS.forEach((p, i) => {
    if (p.kind === 'hard') {
      const myth = p.t > 4 && p.t < 5.5;
      c.push({f: `knock${i % 4}`, at: p.t - 0.004, db: myth ? -15 : -18});
      if (myth) c.push({f: 'boing', at: p.t + 0.01, db: i % 2 ? -17 : -15});
    }
    if (p.kind === 'slow') {
      c.push({f: 'knock_slow', at: p.t - 0.006, db: -9});
      c.push({f: 'impact', at: p.t - 0.004, db: -15});
    }
    if (p.kind === 'soft') c.push({f: 'pomf', at: p.t - 0.01, db: -12});
  });
  c.push(
    {f: 'whoosh', at: 2.6, db: -28},
    {f: 'pop', at: T.lensIn, db: -17},
    {f: 'beep', at: T.rec, db: -21},
    {f: 'sproing', at: T.springsOff, db: -15},
    {f: 'pop', at: T.lensOut - 0.15, db: -22},
    {f: 'whoosh', at: 11.9, db: -24},
    {f: 'clonk', at: T.hammerHit - 0.004, db: -12},
    {f: 'poof', at: T.pillowOn - 0.08, db: -17},
    {f: 'poof', at: T.pillowOff - 0.08, db: -17},
    {f: 'whoosh', at: 15.1, db: -29},
    {f: 'pop', at: T.lens2In, db: -17},
    {f: 'whoosh', at: 17.3, db: -25},
    {f: 'pop', at: T.guyLensIn, db: -17},
    {f: 'pop', at: T.lensesOut - 0.15, db: -22},
    {f: 'whoosh', at: T.bonk - 0.16, db: -23},
    {f: 'bonk', at: T.bonk - 0.004, db: -8},
    {f: 'knock_slow', at: T.bonk - 0.004, db: -16},
    {f: 'twinkle', at: T.dizzy + 0.05, db: -20},
    {f: 'twinkle', at: T.dizzy + 1.35, db: -23},
  );
  return c;
})();

const Sound: React.FC = () => (
  <>
    <Sequence from={Math.round(T.voice * FPS)} layout="none">
      <Audio src={staticFile('woodpecker/vo/take1.mp3')} />
    </Sequence>
    {CUES.map((c, i) => (
      <Sequence key={i} from={Math.max(0, Math.round(c.at * FPS))} layout="none">
        <Audio src={staticFile(`woodpecker/sfx/${c.f}.wav`)} volume={10 ** (c.db / 20)} />
      </Sequence>
    ))}
  </>
);

// ---------------- composition ----------------
export const Woodpecker: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cam = camAt(t, CAM);
  const sh = shakeAt(t, HITS);
  const wob = trunkWobble(t);
  const vf = clamp(easeOutCubic(seg(t, T.rec, T.rec + 0.22))) * (1 - easeInCubic(seg(t, T.recOff - 0.16, T.recOff)));
  const recOn = Math.floor((t - T.rec) / 0.42) % 2 === 0;
  const hs = pop(t, T.hammerIn, T.hammerOut, 0.26, 0.16);
  return (
    <AbsoluteFill style={{background: 'linear-gradient(180deg, #8CCFFF 0%, #BDE6FF 55%, #E3F5FF 100%)'}}>
      <AbsoluteFill style={{transform: `translate(${sh.x}px, ${sh.y}px)`}}>
        <Background cam={cam} />
        <Layer cam={cam} Z={1000}>
          <div style={A(0, 0, {transformOrigin: `${TRUNK_BASE.x}px ${TRUNK_BASE.y}px`, transform: `rotate(${wob}deg)`})}>
            <Img
              src={staticFile(TRUNK.file)}
              style={A(TRUNK_R - TRUNK.right * TSX, TRUNK_TOP, {width: TRUNK.w * TSX, height: TRUNK_H})}
            />
            <Bird t={t} />
            <Chips t={t} />
            {hs > 0 ? (
              <div style={A(HAMMER.pivot.x, HAMMER.pivot.y, {transform: `rotate(${hammerAngle(t)}deg) scale(${hs})`, transformOrigin: '0 0'})}>
                <Hammer />
              </div>
            ) : null}
          </div>
          <Ground />
          <Guy t={t} />
          <Bonk t={t} />
        </Layer>
      </AbsoluteFill>
      {vf > 0 ? <Viewfinder s={vf} rec={recOn} /> : null}
      <Sound />
    </AbsoluteFill>
  );
};
