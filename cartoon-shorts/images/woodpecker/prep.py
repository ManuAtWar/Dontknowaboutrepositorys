# prep.py - trim the raw cut-outs, measure anchor points, align edited pose pairs.
# Writes public/woodpecker/<name>.png and src/woodpecker/sprites.ts (all numbers in trimmed-sprite pixels).
import json
import os

import cv2
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
PUB = os.path.join(ROOT, 'public', 'woodpecker')
PAD = 12

NAMES = ['woodpecker_idle', 'woodpecker_pillow', 'woodpecker_smug', 'trunk',
         'guy_curious', 'guy_headbutt', 'guy_dizzy']


def load(name):
    im = np.array(Image.open(os.path.join(HERE, 'raw', name + '.png')).convert('RGBA')).astype(np.float32)
    a = im[:, :, 3]
    # GPT Image tops out at alpha 254: treat >= 250 as fully opaque, rescale the soft edge
    a = np.where(a >= 250, 255, np.clip(a * 255.0 / 250.0, 0, 255))
    im[:, :, 3] = a
    return im.astype(np.uint8)


def trim(im, full_height=False):
    a = im[:, :, 3]
    ys, xs = np.where(a > 8)
    x0, x1 = max(xs.min() - PAD, 0), min(xs.max() + PAD + 1, im.shape[1])
    if full_height:
        y0, y1 = 0, im.shape[0]
    else:
        y0, y1 = max(ys.min() - PAD, 0), min(ys.max() + PAD + 1, im.shape[0])
    return im[y0:y1, x0:x1], (int(x0), int(y0))


def head_disc(alpha, y_max=None):
    """Largest inscribed disc of the hole-filled silhouette (optionally only above y_max)."""
    a8 = (alpha > 128).astype(np.uint8)
    h, w = a8.shape
    ff = a8.copy()
    cv2.floodFill(ff, np.zeros((h + 2, w + 2), np.uint8), (0, 0), 2)
    solid = np.where(ff == 2, 0, 1).astype(np.uint8)
    if y_max is not None:
        solid[int(y_max):] = 0
    dt = cv2.distanceTransform(solid, cv2.DIST_L2, 5)
    hy, hx = np.unravel_index(dt.argmax(), dt.shape)
    return [float(hx), float(hy), float(dt[hy, hx])]


def feet(alpha):
    a = alpha > 128
    ys = np.where(a.any(1))[0]
    y_bot = ys.max()
    band = a[int(y_bot - 0.035 * len(ys)):y_bot + 1]
    xs = np.where(band.any(0))[0]
    return [float((xs.min() + xs.max()) / 2), float(y_bot)]


def align_translation(A, B, mask):
    """ECC (translation) that maps B onto A inside mask; returns (dx, dy) to add to B's position."""
    ga = cv2.GaussianBlur(A, (0, 0), 2)
    gb = cv2.GaussianBlur(B, (0, 0), 2)
    warp = np.eye(2, 3, dtype=np.float32)
    try:
        _, warp = cv2.findTransformECC(ga, gb, warp, cv2.MOTION_TRANSLATION,
                                       (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 300, 1e-6), mask, 5)
    except cv2.error as e:
        print('ECC failed', e)
    # warp maps A coords -> B coords: B(x + tx, y + ty) ~ A(x, y)  =>  draw B shifted by (-tx, -ty)
    return float(-warp[0, 2]), float(-warp[1, 2])


os.makedirs(PUB, exist_ok=True)
info = {}
raw = {n: load(n) for n in NAMES}
for n in NAMES:
    im, (x0, y0) = trim(raw[n])
    Image.fromarray(im).save(os.path.join(PUB, n + '.png'), optimize=True)
    info[n] = {'file': f'woodpecker/{n}.png', 'w': im.shape[1], 'h': im.shape[0], 'off': [x0, y0]}

# ---------------- woodpecker anchors (in idle's trimmed coords) ----------------
wa = raw['woodpecker_idle'][:, :, 3] > 128
H = wa.shape[0]
rows = np.where(wa.any(1))[0]
top, bot = rows.min(), rows.max()
# beak tip: leftmost opaque pixel in the top 35 % of the bird
yr = slice(top, int(top + 0.35 * (bot - top)))
xs_left = [np.where(wa[y])[0].min() if wa[y].any() else 10 ** 6 for y in range(yr.start, yr.stop)]
iy = int(np.argmin(xs_left))
beak = [float(xs_left[iy]), float(yr.start + iy)]
# claws: leftmost pixels in rows 35 %..75 % -> two claw clusters; pivot = mean of their tips
claw_rows = range(int(top + 0.35 * (bot - top)), int(top + 0.75 * (bot - top)))
lx = np.array([np.where(wa[y])[0].min() if wa[y].any() else 10 ** 6 for y in claw_rows])
order = np.argsort(lx)
tips = []
for i in order:
    y = claw_rows.start + i
    if all(abs(y - t[1]) > 120 for t in tips):
        tips.append((float(lx[i]), float(y)))
    if len(tips) == 2:
        break
claw = [float(np.mean([t[0] for t in tips])), float(np.mean([t[1] for t in tips]))]
head = head_disc(raw['woodpecker_idle'][:, :, 3], y_max=top + 0.33 * (bot - top))
# eye: darkest compact blob near the head disc
rgb = raw['woodpecker_idle'][:, :, :3].astype(np.float32)
dark = ((rgb.sum(2) < 120) & wa).astype(np.uint8)
n_lab, lab, stats, cent = cv2.connectedComponentsWithStats(dark)
best = None
for i in range(1, n_lab):
    x, y, w, h, area = stats[i]
    cx, cy = cent[i]
    if 800 < area < 20000 and 0.5 < w / h < 1.6 and abs(cy - head[1]) < 2.5 * head[2]:
        d = (cx - head[0]) ** 2 + (cy - head[1]) ** 2
        if best is None or d < best[0]:
            best = (d, [float(cx), float(cy)], float(max(w, h) / 2))
eye = best[1] if best else head[:2]
ox, oy = info['woodpecker_idle']['off']
sub = lambda p, o: [p[0] - o[0], p[1] - o[1]]
info['woodpecker_idle'].update({'beak': sub(beak, (ox, oy)), 'claw': sub(claw, (ox, oy)),
                                'head': sub(head[:2], (ox, oy)) + [head[2]], 'eye': sub(eye, (ox, oy)),
                                'clawTips': [sub(t, (ox, oy)) for t in tips],
                                'top': float(top - oy), 'bottom': float(bot - oy)})

# align pillow / smug onto idle using the lower body (head/beak differ)
A = (raw['woodpecker_idle'][:, :, 3] > 128).astype(np.float32)
mask = np.zeros_like(A, np.uint8)
mask[int(top + 0.4 * (bot - top)):bot] = 1
for n in ['woodpecker_pillow', 'woodpecker_smug']:
    B = (raw[n][:, :, 3] > 128).astype(np.float32)
    dx, dy = align_translation(A, B, mask)
    # position of B's trimmed top-left relative to idle's trimmed top-left
    bx, by = info[n]['off']
    info[n]['rel'] = [bx + dx - ox, by + dy - oy]
    print(n, 'shift vs idle (raw px): %.1f %.1f' % (dx, dy))
info['woodpecker_idle']['rel'] = [0.0, 0.0]

# ---------------- guy anchors ----------------
for n in ['guy_curious', 'guy_headbutt', 'guy_dizzy']:
    a = raw[n][:, :, 3]
    gx, gy = info[n]['off']
    f = feet(a)
    hd = head_disc(a)
    m = a > 128
    # forehead = leftmost opaque pixel within the head disc's rows
    r0, r1 = int(hd[1] - hd[2] * 0.9), int(hd[1] + hd[2] * 0.9)
    fl = [(np.where(m[y])[0].min(), y) for y in range(r0, r1) if m[y].any()]
    fx, fy = min(fl)
    info[n].update({'feet': sub(f, (gx, gy)), 'head': sub(hd[:2], (gx, gy)) + [hd[2]],
                    'forehead': [float(fx - gx), float(fy - gy)],
                    'top': float(np.where(m.any(1))[0].min() - gy)})
    print(n, 'feet', info[n]['feet'], 'head r %.0f' % hd[2], 'forehead', info[n]['forehead'])

# ---------------- trunk ----------------
ta = raw['trunk'][:, :, 3] > 128
tx, ty = info['trunk']['off']
L, R = [], []
for y in range(ta.shape[0] // 10, ta.shape[0] * 9 // 10, 8):
    xs = np.where(ta[y])[0]
    if len(xs):
        L.append(xs.min()); R.append(xs.max())
info['trunk'].update({'left': float(np.median(L) - tx), 'right': float(np.median(R) - tx)})

ts = os.path.join(ROOT, 'src', 'woodpecker', 'sprites.ts')
os.makedirs(os.path.dirname(ts), exist_ok=True)
with open(ts, 'w') as fh:
    fh.write('// Generated by images/woodpecker/prep.py - trimmed sprite sizes and anchor points (sprite pixels).\n')
    fh.write('export const SPR = ' + json.dumps(info, indent=2) + ' as const;\n')
print(json.dumps({k: {kk: vv for kk, vv in v.items() if kk != 'file'} for k, v in info.items()}, indent=1))
