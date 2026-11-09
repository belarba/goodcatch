// Writes tools/art-kit/descida/: a template PNG per piece of the descent (today's placeholder at the target size)
// and a gallery that checks art/descida/ against the list. Run `node tools/art-kit-descida.mjs`,
// then open http://localhost:8765/tools/art-kit/descida/
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { encodePNG } from './png.mjs';

const root = new URL('../', import.meta.url), out = new URL('tools/art-kit/descida/', root);
const page = readFileSync(new URL('descida/index.html', root), 'utf8');
mkdirSync(out, { recursive: true });

function literal(name) {
  let j = page.indexOf('{', page.indexOf(`const ${name}=`)), depth = 0;
  const i = j;
  do { if (page[j] === '{') depth++; else if (page[j] === '}') depth--; j++; } while (depth);
  return new Function(`return (${page.slice(i, j)})`)();
}
const SPR = literal('SPR');
const LAYERS = new Function(`return ${page.slice(page.indexOf('const LAYERS=') + 13, page.indexOf('];', page.indexOf('const LAYERS=')) + 1)}`)();

const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
function canvas(w, h) {
  const rgba = new Uint8Array(w * h * 4);
  const rect = (c, x, y, rw, rh, a = 1) => {
    const [r, g, b] = typeof c === 'string' ? hex(c) : c;
    for (let yy = Math.max(0, y | 0); yy < Math.min(h, (y + rh) | 0); yy++) for (let xx = Math.max(0, x | 0); xx < Math.min(w, (x + rw) | 0); xx++) {
      const p = (yy * w + xx) * 4, k = rgba[p + 3] ? a : 1;
      rgba[p] = rgba[p] * (1 - k) + r * k; rgba[p + 1] = rgba[p + 1] * (1 - k) + g * k; rgba[p + 2] = rgba[p + 2] * (1 - k) + b * k; rgba[p + 3] = 255;
    }
  };
  return { rgba, rect, png: () => encodePNG(w, h, rgba) };
}

function sprite16(name) {
  const c = canvas(16, 16);
  if (name === 'boia' || name === 'pneu') {
    const [outer, inner] = name === 'boia' ? [6.3, 3.2] : [6.6, 3];
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = x - 7.5, dy = y - 7.5, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      if (d > outer + 1 || d < inner - 1) continue;
      const col = d > outer || d < inner ? '#2E1A0C' : name === 'boia'
        ? (Math.floor((a + Math.PI) / (Math.PI / 2) + 0.5) % 2 ? '#FFF1D0' : '#C2483A')
        : d > 5.4 ? (Math.floor((a + Math.PI) * 6 / Math.PI) % 2 ? '#4A4A55' : '#2B2B33') : '#3A3A44';
      c.rect(col, x, y, 1, 1);
    }
  } else {
    const { p, r } = SPR[name];
    r.forEach((row, y) => [...row.padEnd(16, '.').slice(0, 16)].forEach((ch, x) => { if (p[ch]) c.rect(p[ch], x, y, 1, 1); }));
  }
  return c.rgba;
}
function upscale(src, sw, sh, z) {
  const c = canvas(sw * z, sh * z);
  for (let y = 0; y < sh * z; y++) for (let x = 0; x < sw * z; x++) {
    const s = (((y / z) | 0) * sw + ((x / z) | 0)) * 4;
    if (src[s + 3]) c.rgba.set(src.subarray(s, s + 4), (y * sw * z + x) * 4);
  }
  return c.png();
}

const PIECES = [];
const add = (name, w, h, group, where, png) => { PIECES.push({ name, w, h, group, where }); writeFileSync(new URL(`${name}.png`, out), png); };

const OBJ = { garrafa: 'trivia', conchas: 'mais ou menos', jornal: 'linha do tempo', caixa: 'intruso', radio: 'história de pescador', boia: 'forca' };
for (const [k, f] of Object.entries(OBJ)) add(k, 32, 32, 'Objetos fisgados', `No anzol, durante o desafio (${f}). Aparece em 32×32.`, upscale(sprite16(k), 16, 16, 2));
const SNAG = { bota: 'superfície', lata: 'recife', pneu: 'algas', ancora: 'naufrágio', polvo: 'abismo' };
for (const [k, l] of Object.entries(SNAG)) add(k, 32, 32, 'Enroscos', `Sobe na linha quando erra no ${l}, e vai para a foto em 64×64 (dobro).`, upscale(sprite16(k), 16, 16, 2));

for (const L of LAYERS) {
  const c = canvas(320, 200), mix = (a, b, t) => hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * t));
  for (let b = 0; b < 10; b++) c.rect(mix(L.c[0], L.c[1], b / 9), 0, b * 20, 320, 20);
  const slug = L.name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  add(`camada-${slug}`, 320, 200, 'Fundos das camadas', `A água da camada ${L.name.toLowerCase()} (${L.m} m), atrás da linha, dos peixes e das bolhas. Deixe o centro livre: a linha desce no meio.`, c.png());
}

{ const c = canvas(12, 16); c.rect('#C9CED6', 6, 2, 2, 8); c.rect('#C9CED6', 2, 10, 6, 2); c.rect('#C9CED6', 2, 6, 2, 4);
  add('anzol', 12, 16, 'Peças pequenas', 'A ponta da linha, na coluna d’água. Aparece em 12×16, sem ampliar.', c.png()); }
for (const k of ['isca', 'troca', 'rede'])
  add(`reliquia-${k}`, 16, 16, 'Peças pequenas', `O ícone da relíquia ${k} no rodapé "Precisa de ajuda?", desenhado no dobro (32×32 na tela).`, canvas(16, 16).png());

{ const c = canvas(320, 216), hz = 96, sky = ['#9FE3F2', '#C9F1F6'], sea = ['#3FC1C9', '#1E8FA6', '#14708A'];
  c.rect(sky[0], 0, 0, 320, hz * .5); c.rect(sky[1], 0, hz * .5, 320, hz * .5); c.rect('#FFF3B0', 260, 14, 18, 18);
  const bands = [hz, hz + (216 - hz) * .3, hz + (216 - hz) * .65, 216]; sea.forEach((col, i) => c.rect(col, 0, bands[i], 320, bands[i + 1] - bands[i]));
  for (let i = 0; i < 336; i += 16) c.rect([255, 255, 255], i, hz + 1 + ((i >> 4) % 2) * 3, 8, 1, .35);
  c.rect('#E9D49A', 0, 206, 320, 10); for (let i = 0; i < 7; i++) c.rect('#F28A80', i * 53 + 17, 200, 10 + i % 3 * 4, 6);
  add('foto-fundo', 320, 216, 'Foto final', 'O céu e o mar da foto. O barco e o gato ficam à esquerda (até x=150), o peixão ou o enrosco à direita. Deixe a faixa de baixo calma: os peixinhos pescados aparecem ali.', c.png()); }

const copy = (name, src, w, h, where) => { PIECES.push({ name, w, h, group: 'Foto final', where }); writeFileSync(new URL(`${name}.png`, out), readFileSync(new URL(`art/${src}.png`, root))); };
copy('gato-feliz', 'portrait/catHappy', 64, 56, 'O gato no barco quando pega o peixão. Hoje é o retrato do Pista; desenhando aqui, a Descida ganha o seu.');
copy('gato-triste', 'portrait/catFace', 64, 56, 'O gato no barco quando enrosca. A bota, a lata ou o polvo aparecem ao lado dele.');
{ const c = canvas(56, 16); c.rect([4, 20, 40], 2, 12, 52, 4, .35); c.rect('#5E3A1A', 2, 0, 52, 4); c.rect('#5E3A1A', 6, 4, 44, 4); c.rect('#5E3A1A', 10, 8, 36, 4); c.rect('#9A6A3C', 4, 2, 48, 2); c.rect('#B98553', 8, 6, 40, 2);
  add('barco', 56, 16, 'Foto final', 'O barco do gato na foto, boiando na linha do horizonte. O gato senta em cima, centralizado.', c.png()); }

writeFileSync(new URL('pieces.json', out), JSON.stringify(PIECES, null, 1));
writeFileSync(new URL('index.html', out), `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Kit de arte · Descida</title>
<style>
body{margin:0;padding:16px;font:16px/1.4 system-ui,sans-serif;background:#0B2233;color:#FFF1D0}
h1{margin:0 0 4px;font-size:26px}h2{margin:24px 0 8px;font-size:20px;color:#F2B33D}
ol{max-width:720px}code{background:#163246;padding:1px 4px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}
.card{background:#122E40;border:2px solid #2E1A0C;padding:10px;display:flex;flex-direction:column;gap:6px}
.pair{display:flex;gap:8px;align-items:flex-end;min-height:72px}
.pair figure{margin:0;font-size:12px;color:#BFE7E6;text-align:center}
.pair img{display:block;image-rendering:pixelated;background:repeating-conic-gradient(#2a4556 0 25%,#1c3546 0 50%) 0 0/8px 8px}
.st{font-weight:600}.ok{color:#7CCB7F}.bad{color:#F28A80}.no{color:#BFE7E6}
small{color:#BFE7E6}
</style>
<h1>Kit de arte · Descida</h1>
<p>Cada peça abaixo tem o molde de hoje no tamanho certo. Quando um PNG com o mesmo nome entra em <code>art/descida/</code>, ele substitui o provisório no jogo.</p>
<ol>
<li>No iPad, crie uma tela com o tamanho exato em pixels (ex.: 32×32). No Procreate, importe o molde como camada para ter a proporção.</li>
<li>Use pincel de pixel, sem suavizar, com fundo transparente (os fundos de camada e a foto são opacos).</li>
<li>Exporte em PNG e mande para o Mac (AirDrop serve). Salve como <code>art/descida/&lt;nome&gt;.png</code>.</li>
<li>Rode <code>node tools/art-embed.mjs</code> e recarregue o jogo. Esta página marca o que está pronto.</li>
</ol>
<p><small>Use o tamanho exato de cada peça: a cena do jogo tem 320×200 pixels de verdade, então uma peça maior apareceria maior, não mais detalhada.</small></p>
<div id="list"></div>
<script>
const P=${JSON.stringify(PIECES)};
const groups=[...new Set(P.map(p=>p.group))];
const zoom=p=>Math.max(1,Math.floor(200/Math.max(p.w,p.h)));
document.getElementById('list').innerHTML=groups.map(g=>'<h2>'+g+'</h2><div class="grid">'+P.filter(p=>p.group===g).map(p=>
  '<div class="card" id="c-'+p.name+'"><b>'+p.name+'.png</b><small>'+p.w+'×'+p.h+' px</small><div class="pair"><figure><img src="'+p.name+'.png" width="'+p.w*zoom(p)+'" height="'+p.h*zoom(p)+'">molde</figure>'+
  '<figure class="mine"></figure></div><span class="st no">falta</span><small>'+p.where+'</small></div>').join('')+'</div>').join('');
for(const p of P){const i=new Image();i.onload=()=>{const c=document.getElementById('c-'+p.name),ok=i.naturalWidth===p.w&&i.naturalHeight===p.h;
  c.querySelector('.mine').innerHTML='<img src="'+i.src+'" width="'+p.w*zoom(p)+'" height="'+p.h*zoom(p)+'">seu';
  const st=c.querySelector('.st');st.className='st '+(ok?'ok':'bad');st.textContent=ok?'pronto ✓':'tamanho '+i.naturalWidth+'×'+i.naturalHeight+' (esperado '+p.w+'×'+p.h+')'};
  i.src='/art/descida/'+p.name+'.png?'+Date.now()}
</script>
`);
console.log(`art kit: ${PIECES.length} pieces → tools/art-kit/descida/`);
