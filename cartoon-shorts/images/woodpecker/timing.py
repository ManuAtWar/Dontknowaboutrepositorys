# timing.py - word times for the voice-over without a speech model:
# sentence spans come from long pauses (RMS < -42 dB for >= 0.18 s), words are spread by syllable count inside each
# span and snapped to short dips (RMS < -34 dB for >= 0.05 s) when one is within 0.12 s. Good to about +-0.1 s.
import json
import re
import wave

import numpy as np

SENTENCES = [
    "Why don't woodpeckers get concussions?",
    "The popular answer was a shock-absorbing skull.",
    "But high-speed video showed the opposite.",
    "The head doesn't cushion the hit.",
    "It stops as suddenly as the beak, like a stiff hammer.",
    "Cushioning would weaken every peck.",
    "The real protection is size.",
    "A woodpecker's brain is so small and light that it can handle stops that would concuss a human.",
]
OFFSET = 0.1  # the voice starts 0.1 s into the composition

w = wave.open('vo_take1.wav')
sr = w.getframerate()
x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768


def runs(db, thr, min_len, hop):
    sil = db < thr
    out, i, n = [], 0, len(db)
    while i < n:
        if sil[i]:
            j = i
            while j < n and sil[j]:
                j += 1
            if (j - i) * hop >= min_len:
                out.append((i * hop, j * hop))
            i = j
        else:
            i += 1
    return out


def rms_db(hop):
    h = int(hop * sr)
    n = len(x) // h
    return 20 * np.log10(np.sqrt(np.mean(x[:n * h].reshape(n, h) ** 2, 1) + 1e-12))


long_p = [p for p in runs(rms_db(0.02), -42, 0.18, 0.02)]
dips = runs(rms_db(0.01), -34, 0.05, 0.01)
# sentence spans = speech between long pauses
edges = [0.04] + [v for p in long_p for v in p] + [21.86]
spans = [(edges[i], edges[i + 1]) for i in range(0, len(edges), 2)]
assert len(spans) == len(SENTENCES), (len(spans), spans)


def syllables(word):
    w_ = re.sub(r'[^a-z]', '', word.lower())
    groups = re.findall(r'[aeiouy]+', w_)
    n = len(groups)
    if w_.endswith('e') and n > 1 and not w_.endswith('le'):
        n -= 1
    return max(n, 1)


words = []
for (a, b), s in zip(spans, SENTENCES):
    ws = s.split()
    syl = np.array([syllables(t) for t in ws], float) + 0.35  # small per-word cost
    cum = np.concatenate([[0], np.cumsum(syl)]) / syl.sum()
    bounds = a + cum * (b - a)
    # snap inner boundaries to the middle of a nearby dip
    for k in range(1, len(bounds) - 1):
        near = [((d0 + d1) / 2, abs((d0 + d1) / 2 - bounds[k])) for d0, d1 in dips if a < d0 and d1 < b]
        near = [n for n in near if n[1] < 0.12]
        if near:
            bounds[k] = min(near, key=lambda n: n[1])[0]
    for k, t in enumerate(ws):
        words.append({'w': t, 's': round(bounds[k] + OFFSET, 3), 'e': round(bounds[k + 1] + OFFSET, 3)})

json.dump({'offset': OFFSET, 'sentences': [{'text': s, 's': round(a + OFFSET, 3), 'e': round(b + OFFSET, 3)}
                                            for (a, b), s in zip(spans, SENTENCES)], 'words': words},
          open('words.json', 'w'), indent=1)
for (a, b), s in zip(spans, SENTENCES):
    print('%6.2f-%6.2f  %s' % (a + OFFSET, b + OFFSET, s))
print(' '.join('%s@%.2f' % (d['w'], d['s']) for d in words))
