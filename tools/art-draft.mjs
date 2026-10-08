// First-pass drafts of the UI sprites (fish and characters are drawn by art-draw.mjs), from today's 1x sprites: Scale2x (EPX) once for 2x, twice for 4x portraits,
// light from the top left, scales and an eye glint on fish portraits, and a 1 px outline.
// Writes only files art/ does not have yet, or files it wrote itself (listed in art/.drafts): the owner's never.
// Run `node tools/art-draft.mjs`, then `node tools/art-kit.mjs` to see them in the gallery.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { pieces } from './art-kit.mjs';
import { drawnPiece } from './art-draw.mjs';
import { encodePNG } from './png.mjs';

const root = new URL('../', import.meta.url), ledger = new URL('art/.drafts', root);
const OUTLINE = [0x2E, 0x1A, 0x0C, 255];
const at = (img, x, y) => x < 0 || y < 0 || x >= img.w || y >= img.h ? 0 : (img.rgba[(y * img.w + x) * 4 + 3] ? (y * img.w + x) + 1 : 0);
const same = (img, i, j) => (!i && !j) || (i && j && [0, 1, 2, 3].every(k => img.rgba[(i - 1) * 4 + k] === img.rgba[(j - 1) * 4 + k]));

function epx(img) {
  const w = img.w * 2, h = img.h * 2, out = new Uint8Array(w * h * 4);
  const put = (x, y, i) => { if (i) out.set(img.rgba.subarray((i - 1) * 4, i * 4), (y * w + x) * 4); };
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    const P = at(img, x, y), A = at(img, x, y - 1), B = at(img, x + 1, y), C = at(img, x - 1, y), D = at(img, x, y + 1);
    const eq = (u, v) => same(img, u, v);
    put(2 * x, 2 * y, eq(C, A) && !eq(C, D) && !eq(A, B) ? A : P);
    put(2 * x + 1, 2 * y, eq(A, B) && !eq(A, C) && !eq(B, D) ? B : P);
    put(2 * x, 2 * y + 1, eq(D, C) && !eq(D, B) && !eq(C, A) ? C : P);
    put(2 * x + 1, 2 * y + 1, eq(B, D) && !eq(B, A) && !eq(D, C) ? D : P);
  }
  return { w, h, rgba: out };
}

const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const tone = (rgb, f) => rgb.map((v, i) => Math.round(Math.min(255, f > 1 ? v + (255 - v) * (f - 1) * (i === 2 ? 0.7 : 1) : v * f)));

function finish(img, p) {
  const { w, h, rgba } = img, src = new Uint8Array(rgba), r = p.n === 4 ? 3 : 1;
  const skip = new Set([p.pal.e, p.pal.w, p.pal.W].filter(Boolean).map(c => hex(c).join()));
  const body = p.group === 'portrait' && p.pal.a ? hex(p.pal.a).join() : null;
  const empty = (x, y) => !at({ w, h, rgba: src }, x, y);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4; if (!src[o + 3]) continue;
    const rgb = [src[o], src[o + 1], src[o + 2]];
    if (skip.has(rgb.join())) continue;
    let dark = 0, light = 0, f = 1;
    for (let k = r; k >= 1; k--) { if (empty(x + k, y + k) || empty(x, y + k)) dark = k; if (empty(x - k, y - k) || empty(x, y - k)) light = k; }
    // Thin strokes (bone, whiskers) touch both sides; shading them would darken the whole stroke.
    if (dark && !light) f = 0.72 + 0.06 * dark;
    else if (light && !dark) f = 1.22 - 0.04 * light;
    // Fish scales: offset rows of small arcs on the body colour only.
    if (body && rgb.join() === body && f === 1) { const u = (x + ((y >> 2) & 1) * 2) % 4, v = y % 4; if ((v === 3 && u !== 0) || (v === 2 && u === 0)) f = 0.88; }
    rgba.set(tone(rgb, f), o);
  }
  if (p.group === 'portrait' && p.pal.e) {
    const eye = hex(p.pal.e).join(), seen = new Set();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      if (!src[o + 3] || [src[o], src[o + 1], src[o + 2]].join() !== eye || seen.has(o)) continue;
      const stack = [[x, y]]; while (stack.length) { const [a, b] = stack.pop(), q = (b * w + a) * 4; if (a < 0 || b < 0 || a >= w || b >= h || seen.has(q) || !src[q + 3] || [src[q], src[q + 1], src[q + 2]].join() !== eye) continue; seen.add(q); stack.push([a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]); }
      rgba.set([255, 255, 255, 255], o);
    }
  }
  const out = new Uint8Array(rgba);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (rgba[(y * w + x) * 4 + 3]) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => at(img, x + dx, y + dy))) out.set(OUTLINE, (y * w + x) * 4);
  }
  return { w, h, rgba: out };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const drafts = new Set(existsSync(ledger) ? readFileSync(ledger, 'utf8').split('\n').filter(Boolean) : []);
  let wrote = 0, kept = 0;
  for (const p of pieces()) {
    if (p.group === 'scenes' || drawnPiece(p)) continue;
    const f = new URL(p.path, root);
    if (existsSync(f) && !drafts.has(p.path)) { kept++; continue; }
    let img = p.img; for (let s = p.n; s > 1; s /= 2) img = epx(img);
    img = finish(img, p);
    mkdirSync(new URL('.', f), { recursive: true });
    writeFileSync(f, encodePNG(img.w, img.h, img.rgba)); drafts.add(p.path); wrote++;
  }
  writeFileSync(ledger, [...drafts].sort().join('\n') + '\n');
  console.log(`art drafts: ${wrote} UI sprites written, ${kept} owner files left alone`);
}
