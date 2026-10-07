// Turns a 1x PNG (transparent background, no outline: the page draws the outline) into a letter map for index.html.
//   node tools/sprite-import.mjs drawing.png [--pal P|GPAL|<species id>]
// With --pal, colours already in that palette keep their letter; new colours get free letters and are listed.
//   node tools/sprite-import.mjs --selftest
import { readFileSync } from 'node:fs';
import { decodePNG, encodePNG } from './png.mjs';
import { literal, sprites, rgbaOf } from './art-kit.mjs';

// e and w mean eye and white in species palettes, so a new colour never takes them.
const FREE = [...'abcdfghijkmnopqrstuvxyzABCDEFGHIJKLMNOPQRSTUVXYZ0123456789'];

export function toMap({ w, h, rgba }, known = {}) {
  const hex = i => '#' + [0, 1, 2].map(k => rgba[i * 4 + k].toString(16).padStart(2, '0')).join('').toUpperCase();
  const letterOf = Object.fromEntries(Object.entries(known).map(([l, c]) => [c.toUpperCase(), l]));
  const free = FREE.filter(l => !(l in known)), pal = {}, added = [], rows = [];
  for (let y = 0; y < h; y++) {
    let row = '';
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (rgba[i * 4 + 3] < 128) { row += '.'; continue; }
      const c = hex(i);
      if (!letterOf[c]) { letterOf[c] = free.shift(); if (!letterOf[c]) throw new Error('too many colours for one sprite'); added.push(letterOf[c]); }
      pal[letterOf[c]] = c; row += letterOf[c];
    }
    rows.push(row);
  }
  return { rows, pal, added };
}

function knownPalette(name) {
  if (!name) return {};
  if (name === 'P' || name === 'GPAL') return literal(name);
  const s = sprites().find(x => x.group === 'fish' && x.name === name);
  if (!s) throw new Error(`unknown palette ${name}: use P, GPAL or a species id`);
  return s.pal;
}

function selftest() {
  const list = sprites();
  for (const s of list) {
    const img = rgbaOf(s), back = toMap(decodePNG(encodePNG(img.w, img.h, img.rgba)), s.pal);
    if (Buffer.compare(Buffer.from(rgbaOf({ map: back.rows, pal: back.pal }).rgba), Buffer.from(img.rgba))) throw new Error(`${s.group}-${s.name}: round trip changed pixels`);
    if (back.added.length) throw new Error(`${s.group}-${s.name}: palette colours got new letters ${back.added}`);
  }
  // catFace re-encoded by macOS ImageIO (sips): rows use filters 1, 2 and 4, which encodePNG never emits; filter 3 stays untested.
  const fx = decodePNG(readFileSync(new URL('./fixtures/filtered.png', import.meta.url))), cat = list.find(s => s.name === 'catFace');
  if (Buffer.compare(Buffer.from(fx.rgba), Buffer.from(rgbaOf(cat).rgba))) throw new Error('filtered fixture decodes to different pixels');
  console.log(`sprite-import ok: ${list.length} sprites round-trip, filtered PNG decodes`);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const args = process.argv.slice(2);
  if (args[0] === '--selftest') selftest();
  else {
    const file = args.find(a => !a.startsWith('--')), p = args.indexOf('--pal');
    if (!file) throw new Error('usage: node tools/sprite-import.mjs drawing.png [--pal P|GPAL|<species id>]');
    const { rows, pal, added } = toMap(decodePNG(readFileSync(file)), knownPalette(p >= 0 ? args[p + 1] : null));
    console.log(`[${rows.map(r => JSON.stringify(r)).join(',')}]`);
    console.log(`colours: ${Object.entries(pal).map(([l, c]) => `${l}:'${c}'`).join(',')}`);
    if (added.length) console.log(`new letters (add to the palette): ${added.map(l => `${l}:'${pal[l]}'`).join(',')}`);
  }
}
