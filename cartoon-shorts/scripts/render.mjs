// node scripts/render.mjs <scale> <out.mp4> [png|jpeg] [crf]
// Bundles once into .bundle/ and renders the Woodpecker composition with the pre-installed headless Chromium.
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const BROWSER = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const [scale = '0.5', out = 'out/preview.mp4', imageFormat = 'jpeg', crf = '20'] = process.argv.slice(2);

const serveUrl = await bundle({
  entryPoint: path.join(ROOT, 'src/index.ts'),
  outDir: path.join(ROOT, '.bundle'),
  publicDir: path.join(ROOT, 'public'),
});
// env: FRAMES=a-b (subset), DOF=0 (no depth-of-field blur), CONC=n, GL=swangle|angle|swiftshader|...
const inputProps = {dof: process.env.DOF !== '0'};
const frameRange = process.env.FRAMES ? process.env.FRAMES.split('-').map(Number) : null;
const composition = await selectComposition({serveUrl, id: 'Woodpecker', browserExecutable: BROWSER, inputProps});
const t0 = Date.now();
let last = -1;
await renderMedia({
  composition,
  serveUrl,
  codec: 'h264',
  outputLocation: path.resolve(ROOT, out),
  scale: Number(scale),
  imageFormat,
  jpegQuality: imageFormat === 'jpeg' ? 92 : undefined,
  crf: Number(crf),
  pixelFormat: 'yuv420p',
  audioBitrate: '320k',
  concurrency: Number(process.env.CONC || 4),
  inputProps,
  frameRange,
  browserExecutable: BROWSER,
  chromiumOptions: {gl: process.env.GL || 'swangle'},
  onProgress: ({progress}) => {
    const p = Math.floor(progress * 20);
    if (p !== last) {
      last = p;
      process.stdout.write(`${Math.round(progress * 100)}% (${((Date.now() - t0) / 1000).toFixed(0)}s) `);
    }
  },
});
console.log(`\ndone in ${((Date.now() - t0) / 1000).toFixed(0)} s -> ${out}`);
