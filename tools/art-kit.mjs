// Writes tools/art-kit/: the page's letter-map sprites (fish, guests, M) as 1x PNGs to draw over in Piskel or Aseprite,
// blank 80x64 scene canvases, and a gallery page with sizes, slots and palettes. Run `node tools/art-kit.mjs`, then open http://localhost:8765/tools/art-kit/
// Bring a drawing back with `node tools/sprite-import.mjs <file.png>`.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { encodePNG } from './png.mjs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

// Object literals of the page script, read by brace matching: sprite maps hold no braces.
export function literal(name) {
  const s = html.indexOf(`const ${name}=`);
  if (s < 0) throw new Error(`const ${name} not found in index.html`);
  let j = html.indexOf('{', s), depth = 0;
  const i = j;
  do { if (html[j] === '{') depth++; else if (html[j] === '}') depth--; j++; } while (depth);
  return new Function(`return (${html.slice(i, j)})`)();
}

export function sprites() {
  const a = html.indexOf('// @gen-start'), b = html.indexOf('// @gen-end');
  const G = new Function(`${html.slice(a, b)}; return {SPECIES, speciesMap}`)();
  const P = literal('P'), M = literal('M'), GUESTS = literal('GUESTS'), GPAL = literal('GPAL');
  const blank = (w, h) => Array(h).fill('.'.repeat(w));
  return [
    ...G.SPECIES.map(s => ({ group: 'fish', name: s.id, map: G.speciesMap(s), pal: { ...s.pal, w: '#FFFFFF', e: '#0A1F2B' }, slot: `SPECIES '${s.id}' (shape '${s.shape}' + stripes/spots)` })),
    ...Object.entries(GUESTS).map(([k, map]) => ({ group: 'guests', name: k, map, pal: GPAL, slot: `GUESTS.${k}, palette GPAL` })),
    ...Object.entries(M).map(([k, map]) => ({ group: 'ui', name: k, map, pal: P, slot: `M.${k}, palette P` })),
    { group: 'scenes', name: 'banquet', map: blank(80, 64), pal: {}, slot: 'banquet() — drawn by code today' },
    { group: 'scenes', name: 'catch', map: blank(80, 64), pal: {}, slot: 'scene() — drawn by code today' },
  ];
}

export function rgbaOf({ map, pal }) {
  const w = Math.max(...map.map(r => r.length)), h = map.length, out = new Uint8Array(w * h * 4);
  map.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    if (!pal[ch]) throw new Error(`letter ${ch} has no colour`);
    const c = pal[ch];
    out.set([parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16), 255], (y * w + x) * 4);
  }));
  return { w, h, rgba: out };
}

function gallery(list) {
  const groups = [['fish', 'Peixes (espécie do dia)'], ['guests', 'Moradores'], ['ui', 'Interface e pratos'], ['scenes', 'Cenas 80×64 (em branco)']];
  const card = s => {
    const { w, h } = rgbaOf(s), k = w >= 80 ? 4 : 8, used = [...new Set(s.map.join('').replace(/\./g, ''))];
    return `<figure><a href="${s.group}-${s.name}.png" download><img src="${s.group}-${s.name}.png" width="${w * k}" height="${h * k}" style="--k:${k}px" alt="${s.name}"></a>`
      + `<figcaption><b>${s.name}</b> ${w}×${h}<br><code>${s.slot}</code><span class="pal">${used.map(l => `<i style="background:${s.pal[l]}" title="${l} ${s.pal[l]}"></i><code>${l} ${s.pal[l]}</code>`).join('')}</span></figcaption></figure>`;
  };
  return `<!doctype html><html lang="pt"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Good Catch art kit</title>
<style>
:root{--bg:#F6E7C1;--ink:#3B2414;--soft:#6B4A2A;--line:#D9BE84}
body{margin:0;padding:16px;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,sans-serif}
h1{margin:0 0 4px;font-size:24px}h2{margin:28px 0 8px;font-size:18px;border-bottom:2px dashed var(--line)}
ol{max-width:60ch;color:var(--soft)}
.grid{display:flex;flex-wrap:wrap;gap:16px}
figure{margin:0;padding:10px;background:#FFF8E6;border:1px solid var(--line);max-width:100%}
img{display:block;image-rendering:pixelated;max-width:100%;height:auto;background:
 linear-gradient(90deg,#0001 1px,transparent 1px) 0 0/var(--k) var(--k),linear-gradient(#0001 1px,transparent 1px) 0 0/var(--k) var(--k),#EFE3C4}
figcaption{margin-top:6px;font-size:13px;color:var(--soft)}code{font-size:12px}
.pal{display:flex;flex-wrap:wrap;gap:2px 8px;margin-top:4px;align-items:center}.pal i{width:12px;height:12px;border:1px solid var(--ink)}
</style>
<h1>Good Catch · kit de arte</h1>
<ol><li>Clique numa imagem para baixar o PNG em 1x (tamanho real).</li>
<li>Abra no Piskel ou Aseprite e desenhe no mesmo tamanho, fundo transparente, <b>sem contorno</b>: o jogo desenha o contorno escuro sozinho.</li>
<li>Poucas cores por sprite (até ~6). Pode reaproveitar as da paleta mostrada.</li>
<li>Exporte PNG 8-bit e rode <code>node tools/sprite-import.mjs arquivo.png --pal P</code> (ou <code>GPAL</code>, ou o id do peixe).</li></ol>
${groups.map(([g, title]) => `<h2>${title}</h2><div class="grid">${list.filter(s => s.group === g).map(card).join('')}</div>`).join('')}
</html>`;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const dir = new URL('./art-kit/', import.meta.url), list = sprites();
  mkdirSync(dir, { recursive: true });
  for (const s of list) { const { w, h, rgba } = rgbaOf(s); writeFileSync(new URL(`${s.group}-${s.name}.png`, dir), encodePNG(w, h, rgba)); }
  writeFileSync(new URL('index.html', dir), gallery(list));
  console.log(`art kit: ${list.length} sprites in tools/art-kit/`);
}
