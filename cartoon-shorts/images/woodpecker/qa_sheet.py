# qa_sheet.py OUT.png name1 name2 ... : every raw cut-out on blue and orange, half size, side by side
import sys
from PIL import Image
out, names = sys.argv[1], sys.argv[2:]
tiles = []
for n in names:
    im = Image.open(f'raw/{n}.png').convert('RGBA')
    im.thumbnail((700, 1000))
    w, h = im.size
    t = Image.new('RGBA', (w * 2 + 30, h + 20), (255, 255, 255, 255))
    for i, col in enumerate([(155, 207, 253, 255), (255, 170, 90, 255)]):
        bg = Image.new('RGBA', (w, h), col); bg.alpha_composite(im); t.paste(bg, (10 + i * (w + 10), 10))
    tiles.append(t)
W = sum(t.size[0] for t in tiles); H = max(t.size[1] for t in tiles)
sheet = Image.new('RGB', (W, H), 'white'); x = 0
for t in tiles: sheet.paste(t, (x, 0)); x += t.size[0]
sheet.thumbnail((2400, 1200)); sheet.save(out)
for n in names:
    im = Image.open(f'raw/{n}.png'); print(n, im.size, im.mode)
