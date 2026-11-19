// Freezes the Descida's challenges for every day after the last frozen one up to <until> (default today),
// as the current page deals them, in Portuguese (FROZEN) and English (FROZEN_EN). Run it BEFORE editing any bank:
// `queue` seeds each format's order with its pool size, so growing a bank reshuffles that format on every unfrozen
// day, the one being played included. Then edit, then `node tools/descida-en.mjs`.
// Usage: node tools/descida-freeze.mjs [YYYY-MM-DD]
import { readFileSync, writeFileSync } from 'node:fs';

const file = new URL('../descida/index.html', import.meta.url);
let html = readFileSync(file, 'utf8');
const lib = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const fn = n => lib.split('\n').find(l => l.startsWith(`function ${n}(`));
const slice = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); if (i < 0 || j < 0) throw new Error(`${a} not found`); return [i, j]; };

const deal = (lang, dates) => {
  const [i, j] = slice('const TRIVIA=[', '// ---------- state ----------');
  const env = `const localStorage={getItem:k=>k==='goodcatch:lang'?'${lang}':null,setItem(){}},navigator={language:'${lang}'};${fn('seedFrom')}\n${fn('mulberry')}\n`;
  const { puzzle, genDay } = new Function(env + html.slice(i, j) + ';return {puzzle,genDay}')();
  const ser = o => JSON.parse(JSON.stringify(o, (k, v) => (v instanceof Set ? { __set: [...v] } : v)));
  return dates.map(d => [d, genDay(d).formats.map((id, L) => [0, 1, 2].map(s => ser(puzzle(d, L, id, s))))]);
};

const [fa, fb] = slice('const FROZEN=', '// @frozen-en-start');
const FROZEN = new Function(html.slice(fa, fb) + ';return FROZEN')();
const ymd = t => new Date(t).toISOString().slice(0, 10);
const until = process.argv[2] || ymd(Date.now());
const dates = [];
for (let t = Date.parse(Object.keys(FROZEN).sort().at(-1)) + 864e5; ymd(t) <= until; t += 864e5) dates.push(ymd(t));
if (!dates.length) { console.log(`nothing to freeze: frozen through ${Object.keys(FROZEN).sort().at(-1)}`); process.exit(0); }

const pt = deal('pt', dates), en = deal('en', dates);
const block = html.slice(fa, fb), close = block.lastIndexOf('};');
html = html.slice(0, fa) + block.slice(0, close) + ',\n' + pt.map(([d, v]) => `'${d}':${JSON.stringify(v)}`).join(',\n') + block.slice(close) + html.slice(fb);

const [ea, eb] = slice('const FROZEN_EN=', '// @frozen-en-end');
const FROZEN_EN = new Function(html.slice(ea, eb) + ';return FROZEN_EN')();
html = html.slice(0, ea) + `const FROZEN_EN=${JSON.stringify({ ...FROZEN_EN, ...Object.fromEntries(en) })};\n` + html.slice(eb);

writeFileSync(file, html);
console.log(`frozen ${dates.join(', ')} (pt + en). Now edit the banks, then run node tools/descida-en.mjs`);
