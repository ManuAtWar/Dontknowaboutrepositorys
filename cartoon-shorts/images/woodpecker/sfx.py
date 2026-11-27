# sfx.py - synthesize the cartoon sound effects (48 kHz mono WAV, peak -1 dBFS) into public/woodpecker/sfx/
import os
import wave

import numpy as np

SR = 48000
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'woodpecker', 'sfx')
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)


def t_(dur):
    return np.arange(int(dur * SR)) / SR


def env(t, attack, decay):
    return np.minimum(t / max(attack, 1e-4), 1.0) * np.exp(-np.maximum(t - attack, 0) / decay)


def lowpass(x, fc):
    # one-pole low-pass, run twice
    a = np.exp(-2 * np.pi * fc / SR)
    for _ in range(2):
        y = np.empty_like(x); acc = 0.0
        for i, v in enumerate(x):
            acc = (1 - a) * v + a * acc; y[i] = acc
        x = y
    return x


def bandpass(x, f0, q):
    # RBJ biquad band-pass (constant peak gain)
    w0 = 2 * np.pi * f0 / SR; alpha = np.sin(w0) / (2 * q)
    b0, b1, b2 = alpha, 0, -alpha
    a0, a1, a2 = 1 + alpha, -2 * np.cos(w0), 1 - alpha
    y = np.zeros_like(x); x1 = x2 = y1 = y2 = 0.0
    for i, v in enumerate(x):
        o = (b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0
        x2, x1, y2, y1 = x1, v, y1, o
        y[i] = o
    return y


def save(name, x, pad=0.02):
    x = np.concatenate([x, np.zeros(int(pad * SR))])
    x = x / (np.abs(x).max() + 1e-9) * 10 ** (-1 / 20)
    with wave.open(os.path.join(OUT, name + '.wav'), 'w') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())
    print(name, '%.3f s' % (len(x) / SR))


def knock(dur=0.12, modes=((1150, 0.018), (1900, 0.012), (2900, 0.008), (620, 0.03)), click=0.6):
    t = t_(dur)
    x = sum(np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) * np.exp(-t / d) * (1.0 / (k + 1)) for k, (f, d) in enumerate(modes))
    burst = rng.normal(0, 1, len(t)) * np.exp(-t / 0.0015) * click
    return x + bandpass(burst, 2500, 0.8)


# woodpecker peck: sharp dry wood tap (4 slightly different takes so repeats don't machine-gun)
for i in range(4):
    j = 1 + (i - 1.5) * 0.04
    save(f'knock{i}', knock(modes=((1150 * j, 0.018), (1900 * j, 0.012), (2900 * j, 0.008), (620 * j, 0.03))))

# slow-motion peck: deep, long wooden thunk
t = t_(0.7)
slow = knock(0.7, modes=((300, 0.12), (520, 0.08), (820, 0.05), (140, 0.2)), click=0.3)
slow += 0.9 * np.sin(2 * np.pi * (70 + 40 * np.exp(-t / 0.05)) * t) * env(t, 0.002, 0.18)
save('knock_slow', slow)

# spring boing: wobbling pitch rise with vibrato
t = t_(0.55)
f = 170 + 110 * (1 - np.exp(-t / 0.08)) + 28 * np.sin(2 * np.pi * 13 * t) * np.exp(-t / 0.25)
save('boing', np.sin(2 * np.pi * np.cumsum(f) / SR) * env(t, 0.004, 0.2) + 0.25 * np.sin(4 * np.pi * np.cumsum(f) / SR) * env(t, 0.004, 0.12))

# spring snapping away: fast rising sproing
t = t_(0.45)
f = 220 * np.exp(t * 4.2) + 30 * np.sin(2 * np.pi * 22 * t)
save('sproing', np.sin(2 * np.pi * np.cumsum(f) / SR) * env(t, 0.003, 0.16))

# whoosh: band-passed noise sweeping up then down
t = t_(0.7)
n = rng.normal(0, 1, len(t))
sweep = np.concatenate([bandpass(n[i:i + 2400], 500 + 1300 * np.sin(np.pi * i / len(t)), 1.2) for i in range(0, len(t), 2400)])[:len(t)]
save('whoosh', sweep * np.sin(np.pi * t / t[-1]) ** 1.6)

# pillow pomf: soft muffled thump
t = t_(0.3)
pomf = lowpass(rng.normal(0, 1, len(t)), 260) * env(t, 0.012, 0.07) + 0.5 * np.sin(2 * np.pi * 95 * t) * env(t, 0.01, 0.06)
save('pomf', pomf)

# poof: airy puff for the pillow swap
t = t_(0.35)
save('poof', bandpass(rng.normal(0, 1, len(t)), 900, 0.7) * env(t, 0.01, 0.09))

# pop: lens bubble popping in
t = t_(0.12)
f = 500 + 900 * (1 - np.exp(-t / 0.02))
save('pop', np.sin(2 * np.pi * np.cumsum(f) / SR) * env(t, 0.002, 0.035) + bandpass(rng.normal(0, 1, len(t)) * np.exp(-t / 0.003), 3000, 1) * 0.5)

# camera record beep (two short beeps)
t = t_(0.09)
b = np.sin(2 * np.pi * 1320 * t) * np.minimum(1, np.minimum(t, t[-1] - t) / 0.006)
save('beep', np.concatenate([b, np.zeros(int(0.07 * SR)), b]))

# hammer clonk: metallic partials + wood
t = t_(0.6)
clonk = sum(np.sin(2 * np.pi * f * t) * np.exp(-t / d) / (k + 1) for k, (f, d) in enumerate(((520, 0.16), (1347, 0.11), (2210, 0.07), (3380, 0.05))))
save('clonk', clonk + 0.8 * knock(0.6, modes=((700, 0.03), (1200, 0.02)), click=0.6))

# headbutt bonk: hollow pitch-drop bonk + thud
t = t_(0.5)
f = 330 * np.exp(-t * 2.5) + 150
bonk = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(t, 0.002, 0.13) + 0.8 * np.sin(2 * np.pi * 75 * t) * env(t, 0.002, 0.12)
save('bonk', bonk + 0.5 * knock(0.5, modes=((500, 0.04), (900, 0.025)), click=0.8))

# dizzy twinkle: little bell arpeggio, played twice
t = t_(0.35)
bell = lambda f: (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2.76 * f * t) * np.exp(-t / 0.05)) * env(t, 0.002, 0.11)
notes = [2093, 2637, 3136, 2637, 3520, 3136]
tw = np.zeros(int(1.3 * SR))
for i, fq in enumerate(notes):
    s = int(i * 0.16 * SR); seg = bell(fq) * (0.9 - 0.08 * i)
    tw[s:s + len(seg)] += seg[:len(tw) - s]
save('twinkle', tw)

# small tick for hard stops in slow motion (impact accent)
t = t_(0.2)
save('impact', lowpass(rng.normal(0, 1, len(t)), 900) * env(t, 0.001, 0.03) + 0.7 * np.sin(2 * np.pi * 110 * t) * env(t, 0.001, 0.06))
