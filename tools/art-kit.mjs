// Writes tools/art-kit/ for the 2x art set (spec docs/superpowers/specs/2026-10-07-art-2x-design.md): every piece as a
// 2x template (today's art scaled x2, a proportion guide) and a gallery that is a checklist against art/.
// Run `node tools/art-kit.mjs`, then open http://localhost:8765/tools/art-kit/
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { encodePNG, decodePNG } from './png.mjs';

const root = new URL('../', import.meta.url), html = readFileSync(new URL('index.html', root), 'utf8');

// Object literals of the page script, read by brace matching: sprite maps hold no braces.
export function literal(name) {
  const s = html.indexOf(`const ${name}=`);
  if (s < 0) throw new Error(`const ${name} not found in index.html`);
  let j = html.indexOf('{', s), depth = 0;
  const i = j;
  do { if (html[j] === '{') depth++; else if (html[j] === '}') depth--; j++; } while (depth);
  return new Function(`return (${html.slice(i, j)})`)();
}

// Today's 1x letter-map sprites (also what sprite-import's self-test round-trips).
export function sprites() {
  const a = html.indexOf('// @gen-start'), b = html.indexOf('// @gen-end');
  const G = new Function(`${html.slice(a, b)}; return {SPECIES, speciesMap}`)();
  const P = literal('P'), M = literal('M'), GUESTS = literal('GUESTS'), GPAL = literal('GPAL');
  return [
    ...G.SPECIES.map(s => ({ group: 'fish', name: s.id, map: G.speciesMap(s), pal: { ...s.pal, w: '#FFFFFF', e: '#0A1F2B' }, slot: `SPECIES '${s.id}'` })),
    ...Object.entries(GUESTS).map(([k, map]) => ({ group: 'guests', name: k, map, pal: GPAL, slot: `GUESTS.${k}` })),
    ...Object.entries(M).map(([k, map]) => ({ group: 'ui', name: k, map, pal: P, slot: `M.${k}` })),
    // The banquet paints the generic fish in each species' colours (index.html, banquet()).
    ...G.SPECIES.map(s => ({ group: 'plate', name: s.id, map: M.fish, pal: { ...P, y: s.pal.a, Y: s.pal.f || s.pal.b, h: s.pal.c || s.pal.a }, slot: `banquet() dish, ${s.id}` })),
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

const x2 = ({ w, h, rgba }) => {
  const out = new Uint8Array(w * h * 16);
  for (let y = 0; y < h * 2; y++) for (let x = 0; x < w * 2; x++) out.set(rgba.subarray(((y >> 1) * w + (x >> 1)) * 4, ((y >> 1) * w + (x >> 1)) * 4 + 4), (y * w * 2 + x) * 4);
  return { w: w * 2, h: h * 2, rgba: out };
};

// The 2x set: one entry per file the owner draws into art/.
export function pieces() {
  const scenes = [['catch-won', 'scene(), won: sky, sea, pier, cat'], ['catch-lost', 'scene(), lost: grey sky'], ['banquet', 'banquet(): wall, table, seated guests']]
    .map(([name, slot]) => ({ group: 'scenes', name, slot: `${slot} (background only)`, img: decodePNG(readFileSync(new URL(`art-kit-ref/${name}.png`, import.meta.url))), pal: {} }));
  return [...sprites().map(s => ({ ...s, img: rgbaOf(s) })), ...scenes]
    .map(p => ({ ...p, path: `art/${p.group}/${p.name}.png`, tpl: x2(p.img) }));
}

function status(p) {
  const f = new URL(p.path, root);
  if (!existsSync(f)) return { state: 'falta' };
  try { const { w, h } = decodePNG(readFileSync(f)); return w === p.tpl.w && h === p.tpl.h ? { state: 'pronta' } : { state: `tamanho ${w}×${h}, esperado ${p.tpl.w}×${p.tpl.h}` }; }
  catch (e) { return { state: `não abre: ${e.message}` }; }
}

function gallery(list) {
  const groups = [['fish', 'Peixes do dia'], ['guests', 'Moradores'], ['plate', 'Peixes no prato (banquete)'], ['ui', 'Gato, interface e pratos'], ['scenes', 'Fundos das cenas']];
  const done = list.filter(p => p.st.state === 'pronta').length;
  const card = p => {
    const k = p.tpl.w >= 160 ? 2 : 4, used = p.map ? [...new Set(p.map.join('').replace(/\./g, ''))] : [];
    const img = (src, alt) => `<img src="${src}" width="${p.tpl.w * k}" height="${p.tpl.h * k}" style="--k:${k * 2}px" alt="${alt}">`;
    return `<figure class="${p.st.state === 'pronta' ? 'ok' : p.st.state === 'falta' ? '' : 'bad'}"><div class="pair"><a href="${p.group}-${p.name}.png" download="${p.name}.png">${img(`${p.group}-${p.name}.png`, `${p.name} molde`)}</a>`
      + `${p.st.state === 'pronta' ? img(`../../${p.path}`, `${p.name} novo`) : ''}</div>`
      + `<figcaption><b>${p.name}</b> ${p.tpl.w}×${p.tpl.h} · <span class="st">${p.st.state}</span><br><code>${p.path}</code><br><code>${p.slot}</code>`
      + `<span class="pal">${used.map(l => `<i style="background:${p.pal[l]}" title="${p.pal[l]}"></i><code>${p.pal[l]}</code>`).join('')}</span></figcaption></figure>`;
  };
  return `<!doctype html><html lang="pt"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Good Catch art kit</title>
<style>
:root{--bg:#F6E7C1;--ink:#3B2414;--soft:#6B4A2A;--line:#D9BE84;--ok:#3F6E4E;--bad:#A33A28}
body{margin:0;padding:16px;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,sans-serif}
h1{margin:0 0 4px;font-size:24px}h2{margin:28px 0 8px;font-size:18px;border-bottom:2px dashed var(--line)}
ol{max-width:64ch;color:var(--soft);padding-left:20px}.count{font-size:18px}
.grid{display:flex;flex-wrap:wrap;gap:16px}
figure{margin:0;padding:10px;background:#FFF8E6;border:2px solid var(--line);max-width:100%;box-sizing:border-box}
figure.ok{border-color:var(--ok)}figure.ok .st{color:var(--ok);font-weight:600}figure.bad{border-color:var(--bad)}figure.bad .st{color:var(--bad);font-weight:600}
.pair{display:flex;gap:8px;flex-wrap:wrap}
img{display:block;image-rendering:pixelated;max-width:100%;height:auto;background:
 linear-gradient(90deg,#0001 1px,transparent 1px) 0 0/var(--k) var(--k),linear-gradient(#0001 1px,transparent 1px) 0 0/var(--k) var(--k),#EFE3C4}
figcaption{margin-top:6px;font-size:13px;color:var(--soft)}code{font-size:12px;overflow-wrap:anywhere}
.pal{display:flex;flex-wrap:wrap;gap:2px 8px;margin-top:4px;align-items:center}.pal i{width:12px;height:12px;border:1px solid var(--ink)}
</style>
<h1>Good Catch · kit de arte 2x</h1>
<p class="count"><b>${done} de ${list.length}</b> peças prontas em <code>art/</code></p>
<ol><li>Cada molde é a arte de hoje ampliada 2x, no tamanho final exato. Clique para baixar.</li>
<li>Desenhe por cima no Aseprite ou Piskel, mesmo tamanho, fundo transparente, <b>com o seu contorno</b> (sugestão: 1 px em <code>#2E1A0C</code>).</li>
<li>Nas cenas, só o fundo: peixe pulando, linha, respingo e pratos da semana continuam no código.</li>
<li>Salve como PNG no caminho indicado em <code>art/</code> e rode <code>node tools/art-kit.mjs</code> de novo: a peça fica verde e aparece ao lado do molde.</li></ol>
${groups.map(([g, title]) => `<h2>${title}</h2><div class="grid">${list.filter(p => p.group === g).map(card).join('')}</div>`).join('')}
</html>`;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const dir = new URL('./art-kit/', import.meta.url), list = pieces().map(p => ({ ...p, st: status(p) }));
  mkdirSync(dir, { recursive: true });
  for (const p of list) writeFileSync(new URL(`${p.group}-${p.name}.png`, dir), encodePNG(p.tpl.w, p.tpl.h, p.tpl.rgba));
  writeFileSync(new URL('index.html', dir), gallery(list));
  const done = list.filter(p => p.st.state === 'pronta').length;
  console.log(`art kit: ${done}/${list.length} pieces ready in art/`);
  for (const p of list) if (p.st.state !== 'pronta' && p.st.state !== 'falta') console.log(`  ${p.path}: ${p.st.state}`);
}
