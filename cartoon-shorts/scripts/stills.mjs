// node scripts/stills.mjs [times...] - bundle once (cached in .bundle/), render stills at the given seconds
// (default: every beat) at scale 0.5 and tile them into images/woodpecker/qa/contact.png
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const BROWSER = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const OUT = path.join(ROOT, 'images/woodpecker/qa/stills');
fs.mkdirSync(OUT, {recursive: true});

const times = process.argv.slice(2).map(Number);
const T = times.length
  ? times
  : [0, 1.0, 2.5, 3.3, 4.5, 5.0, 6.4, 7.5, 8.9, 9.32, 10.3, 11.31, 12.0, 12.17, 13.0, 13.45, 14.36, 15.0, 15.8, 16.55, 18.2, 19.0, 19.9, 20.85, 20.99, 21.3, 21.8, 22.95];

const serveUrl = await bundle({
  entryPoint: path.join(ROOT, 'src/index.ts'),
  outDir: path.join(ROOT, '.bundle'),
  publicDir: path.join(ROOT, 'public'),
});
const comp = await selectComposition({serveUrl, id: 'Woodpecker', browserExecutable: BROWSER});
const files = [];
for (const t of T) {
  const frame = Math.min(comp.durationInFrames - 1, Math.round(t * comp.fps));
  const f = path.join(OUT, `t${t.toFixed(2).padStart(5, '0')}.png`);
  await renderStill({composition: comp, serveUrl, frame, output: f, scale: 0.5, browserExecutable: BROWSER, chromiumOptions: {gl: 'swangle'}});
  files.push(f);
  process.stdout.write(`${t} `);
}
console.log('\nrendered', files.length);
// contact sheet with labels
execFileSync('python3', ['-c', `
import sys
from PIL import Image, ImageDraw
fs = sys.argv[1:]
ims = [Image.open(f).convert('RGB') for f in fs]
w, h = ims[0].size
s = 0.5
tw, th = int(w*s), int(h*s)
cols = 7
rows = (len(ims)+cols-1)//cols
sheet = Image.new('RGB', (cols*(tw+6)+6, rows*(th+30)+6), 'white')
d = ImageDraw.Draw(sheet)
for i,(f,im) in enumerate(zip(fs, ims)):
    x = 6 + (i%cols)*(tw+6); y = 6 + (i//cols)*(th+30)
    sheet.paste(im.resize((tw,th)), (x, y+24))
    d.text((x+4, y+4), f.split('/')[-1][1:-4]+' s', fill='black')
sheet.save('${path.join(ROOT, 'images/woodpecker/qa/contact.png')}')
`, ...files]);
console.log('contact sheet written');
