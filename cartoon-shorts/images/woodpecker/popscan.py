# popscan.py video.mp4 - flag frames whose change from the previous frame is > 2.2x the local median
# (blurred 270x480 grey). Every flag should be an intended swap, hit or cut.
import subprocess
import sys

import numpy as np

src = sys.argv[1]
W, H = 270, 480
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-vf', f'scale={W}:{H},boxblur=2:1', '-f', 'rawvideo',
                      '-pix_fmt', 'gray', '-'], capture_output=True, check=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.float32)
d = np.abs(np.diff(fr, axis=0)).mean(axis=(1, 2))
fps = 60
flags = []
for i in range(len(d)):
    lo, hi = max(0, i - 30), min(len(d), i + 31)
    med = np.median(d[lo:hi]) + 0.15
    if d[i] > 2.2 * med and d[i] > 1.0:
        flags.append((i + 1, d[i], med))
print(f'{len(fr)} frames, mean diff {d.mean():.2f}')
for f, v, m in flags:
    print(f'frame {f:5d}  t={f / fps:6.2f}s  diff {v:5.2f}  (local median {m:4.2f})')
