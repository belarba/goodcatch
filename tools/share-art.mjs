// Writes the images other sites show for the page: favicon.png and icon.png (home screen) from the cat's face,
// and og.png (the link preview card) by screenshotting tools/og.html in headless Chrome.
// Run `node tools/share-art.mjs` after changing the cat's face, tools/og.html or the art it uses.
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { decodePNG, encodePNG } from './png.mjs';

const root = new URL('../', import.meta.url);
const ABYSS = [0x0B, 0x22, 0x33, 255];

function icon(src, size, scale, bg) {
  const a = decodePNG(readFileSync(new URL(`art/${src}.png`, root)));
  const out = new Uint8Array(size * size * 4);
  if (bg) for (let i = 0; i < out.length; i += 4) out.set(bg, i);
  const ox = (size - a.w * scale) >> 1, oy = (size - a.h * scale) >> 1;
  for (let y = 0; y < a.h * scale; y++) for (let x = 0; x < a.w * scale; x++) {
    const s = ((y / scale | 0) * a.w + (x / scale | 0)) * 4;
    if (a.rgba[s + 3]) out.set(a.rgba.subarray(s, s + 4), ((oy + y) * size + ox + x) * 4);
  }
  return encodePNG(size, size, out);
}

writeFileSync(new URL('favicon.png', root), icon('ui/catFace', 32, 1));
writeFileSync(new URL('icon.png', root), icon('portrait/catFace', 180, 2, ABYSS));

const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
execFileSync(chrome, ['--headless=new', '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=1200,630',
  '--virtual-time-budget=5000', `--screenshot=${fileURLToPath(new URL('og.png', root))}`, new URL('tools/og.html', root).href], { stdio: 'ignore' });
console.log('wrote favicon.png, icon.png, og.png');
