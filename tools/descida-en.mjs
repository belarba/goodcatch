// Checks that the Descida's English banks (BANK_EN) line up with the Portuguese ones position by position, and
// rebuilds FROZEN_EN from FROZEN: each frozen challenge is matched to its Portuguese bank item and swapped for the
// English item at the same position. Items that have since left the banks are translated in GONE below.
// Run `node tools/descida-en.mjs` after editing any bank or FROZEN; it exits 1 and lists what is missing.
import { readFileSync, writeFileSync } from 'node:fs';

const file = new URL('../descida/index.html', import.meta.url), html = readFileSync(file, 'utf8');
const between = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); if (i < 0 || j < 0) throw new Error(`${a} not found`); return html.slice(i, j); };
const PT = new Function(between('const TRIVIA=[', 'const BANK_EN=') + ';return {TRIVIA,NUM,EVENTS,ODD,WORDS,TALES,EST}')();
const EN = new Function(between('const BANK_EN=', '// ---------- helpers') + ';return BANK_EN')();
const FROZEN = new Function(between('const FROZEN=', '// @frozen-en-start') + ';return FROZEN')();

const GONE = {
  events: {
    'a chegada da família real portuguesa ao Brasil': 'the Portuguese royal family’s arrival in Brazil',
    'a primeira transmissão de TV no Brasil': 'the first TV broadcast in Brazil',
    'o voo do 14-Bis': 'Santos-Dumont’s flight in the 14-bis',
    'o Plano Real': 'the opening of the Channel Tunnel',
  },
  trivia: {
    'Quem foi o primeiro presidente do Brasil?': ['Who was the first president of the United States?', { 'Juscelino Kubitschek': 'Abraham Lincoln', 'Getúlio Vargas': 'Thomas Jefferson', 'Deodoro da Fonseca': 'George Washington', 'Dom Pedro II': 'John Adams' }],
    'Quem escreveu Dom Casmurro?': ['Who wrote Don Quixote?', { 'Machado de Assis': 'Cervantes', 'José de Alencar': 'Dante', 'Graciliano Ramos': 'Goethe', 'Eça de Queirós': 'Homer' }],
  },
  words: {},
  est: {
    'Em que ano Brasília foi inaugurada?': { q: 'In what year did the Beatles get together?', u: '' },
    'Quantas estrelas tem a bandeira do Brasil?': { q: 'How many bones are in one human hand?', u: '' },
  },
  odd: {
    'Os outros três são metais.': ['metals', { Enxofre: 'Sulfur', Prata: 'Silver', Cobre: 'Copper', Zinco: 'Zinc' }],
    'Os outros três são livros de Machado de Assis.': ['plays by Shakespeare', { 'Memórias Póstumas de Brás Cubas': 'Hamlet', 'Quincas Borba': 'Macbeth', 'O Alienista': 'Othello', 'Vidas Secas': 'Don Quixote' }],
  },
};

const bad = [], missing = new Set();
const check = (ok, msg) => ok || bad.push(msg);
const band = w => (w.length <= 7 ? 1 : w.length <= 9 ? 2 : 3);
for (const k of Object.keys(PT)) check(PT[k].length === EN[k]?.length, `${k}: ${PT[k].length} in Portuguese, ${EN[k]?.length} in English`);
PT.TRIVIA.forEach((p, i) => { const e = EN.TRIVIA[i]; if (!e) return; check(p[0] === e[0], `TRIVIA ${i}: level`); check(e.length === 6 && new Set(e.slice(2)).size === 4, `TRIVIA ${i}: options`); });
PT.NUM.forEach((p, i) => { const e = EN.NUM[i]; check(e && p.items.length === e.items.length && p.items.every(([, v], j) => v === e.items[j][1]), `NUM ${i}: values`); });
PT.EVENTS.forEach((p, i) => check(EN.EVENTS[i]?.[0] === p[0], `EVENTS ${i}: year`));
PT.ODD.forEach((p, i) => { const e = EN.ODD[i]; if (!e) return;
  check(p.d === e.d && p.in.length === e.in.length && p.out.length === e.out.length, `ODD ${i}: shape`);
  check(new Set([...e.in, ...e.out]).size === e.in.length + e.out.length, `ODD ${i}: repeated name`); });
PT.WORDS.forEach((p, i) => { const e = EN.WORDS[i]; if (!e) return; check(band(p[0]) === band(e[0]), `WORDS ${i}: ${e[0]} is not in the length band of ${p[0]}`); check(/^[A-Z][A-Z -]*[A-Z]$/.test(e[0]), `WORDS ${i}: ${e[0]}`); });
PT.TALES.forEach((p, i) => { const e = EN.TALES[i]; check(e && p.d === e.d && e.v.length === p.v.length, `TALES ${i}: shape`); });
PT.EST.forEach((p, i) => { const e = EN.EST[i]; check(e && ['a', 'lo', 'hi', 'step', 'yr'].every(k => p[k] === e[k]), `EST ${i}: numbers`); });
const words = JSON.stringify(EN).match(/[^\s"',.:;!?()]*[ãõçêâô][^\s"',.:;!?()]*/gi) || [];
for (const w of new Set(words)) if (!['São', 'Paraná', 'Exupéry'].some(x => w.includes(x))) bad.push(`Portuguese left in BANK_EN: ${w}`);

const fmt = n => n.toLocaleString('en-US'), yr = y => (y < 0 ? `${-y} BC` : String(y));
const event = pt => { const i = PT.EVENTS.findIndex(e => e[1] === pt); if (i >= 0) return EN.EVENTS[i][1]; if (GONE.events[pt]) return GONE.events[pt]; missing.add(`event: ${pt}`); return pt; };
const cap = s => s[0].toUpperCase() + s.slice(1), uncap = s => s[0].toLowerCase() + s.slice(1);
const years = s => s.replace(/(\d+) a\.C\./g, '$1 BC').replace(' e ', ' and ');

function translate(p) {
  if (p.kind === 'word') {
    const i = PT.WORDS.findIndex(w => w[0] === p.w), [w, hint] = i >= 0 ? EN.WORDS[i] : GONE.words[p.w] || (missing.add(`word: ${p.w}`), [p.w, p.hint]);
    const letters = [...new Set(w.replace(/[^A-Z]/g, ''))], show = letters.filter((_, j) => j % 2 === 0).slice(0, p.show.__set.length);
    return { ...p, w, hint, show: { __set: show }, used: { __set: show } };
  }
  if (p.kind === 'num') { const i = PT.EST.findIndex(e => e.q === p.q); if (i < 0 && GONE.est[p.q]) return { ...p, ...GONE.est[p.q] }; if (i < 0) { missing.add(`estimate: ${p.q}`); return p; } return { ...p, ...EN.EST[i] }; }
  const t = PT.TRIVIA.findIndex(e => e[1] === p.q);
  if (t >= 0) { const pt = PT.TRIVIA[t].slice(2), en = EN.TRIVIA[t].slice(2); return { ...p, q: EN.TRIVIA[t][1], opts: p.opts.map(o => en[pt.indexOf(o)]), after: `Answer: ${en[0]}.` }; }
  if (GONE.trivia[p.q]) { const [q, map] = GONE.trivia[p.q]; return { ...p, q, opts: p.opts.map(o => map[o] ?? (missing.add(`option: ${o}`), o)), after: `Answer: ${map[p.opts[p.ans]]}.` }; }
  if (p.q === 'O que veio primeiro?') return { ...p, q: 'Which came first?', opts: p.opts.map(o => cap(event(uncap(o)))), after: years(p.after) };
  const n = PT.NUM.findIndex(c => c.q === p.q);
  if (n >= 0) { const c = EN.NUM[n], it = p.opts.map(o => PT.NUM[n].items.findIndex(x => x[0] === o));
    return { ...p, q: c.q, opts: it.map(j => c.items[j][0]), after: it.map(j => `${c.items[j][0]}: ${fmt(c.items[j][1])}${c.u}.`).join(' ') }; }
  if (p.q.startsWith('Quando foi ')) return { ...p, q: `When was ${event(p.q.slice(11, -1))}?`,
    ctx: p.ctx.split('<br>').map(l => { const [y, ...r] = l.split(': '); return `${years(y)}: ${event(r.join(': '))}`; }).join('<br>'),
    opts: p.opts.map(o => years(o).replace(/^Antes de /, 'Before ').replace(/^Depois de /, 'After ').replace(/^Entre (.*) e /, 'Between $1 and ')),
    after: `It was in ${years(p.after.slice(7, -1))}.` };
  if (p.q === 'Um destes não é do grupo. Qual?') {
    const g = PT.ODD.findIndex(o => p.after === `Os outros três são ${o.t}.`), pt = PT.ODD[g], en = EN.ODD[g];
    if (g < 0 && GONE.odd[p.after]) { const [t, map] = GONE.odd[p.after]; return { ...p, q: 'One of these doesn’t belong. Which?', opts: p.opts.map(o => map[o] ?? (missing.add(`option: ${o}`), o)), after: `The other three are ${t}.` }; }
    if (g < 0) { missing.add(`odd group: ${p.after}`); return p; }
    return { ...p, q: 'One of these doesn’t belong. Which?', opts: p.opts.map(o => pt.in.includes(o) ? en.in[pt.in.indexOf(o)] : en.out[pt.out.indexOf(o)]), after: `The other three are ${en.t}.` };
  }
  const s = PT.TALES.findIndex(x => p.opts.includes(x.m));
  if (s >= 0) { const pt = PT.TALES[s], en = EN.TALES[s];
    return { ...p, q: 'It’s a fish story: one of them is lying. Which?', opts: p.opts.map(o => o === pt.m ? en.m : en.v[pt.v.indexOf(o)]), after: en.fix }; }
  missing.add(`challenge: ${p.q}`); return p;
}
const FROZEN_EN = Object.fromEntries(Object.entries(FROZEN).map(([d, layers]) => [d, layers.map(l => l.map(translate))]));
for (const p of Object.values(FROZEN_EN).flat(2)) if (p.kind === 'choice') check(p.opts.every(Boolean) && new Set(p.opts).size === p.opts.length, `FROZEN_EN: broken options in “${p.q}”`);

for (const m of missing) bad.push(`not translated: ${m}`);
if (bad.length) { console.error(bad.join('\n')); process.exit(1); }
const start = '// @frozen-en-start', end = '// @frozen-en-end', a = html.indexOf(start), b = html.indexOf(end);
const block = `${start}\n// Generated by tools/descida-en.mjs from FROZEN. Do not edit.\nconst FROZEN_EN=${JSON.stringify(FROZEN_EN)};\n${end}`;
writeFileSync(file, html.slice(0, a) + block + html.slice(b + end.length));
console.log(`descida en ok: ${Object.keys(PT).map(k => `${k} ${PT[k].length}`).join(', ')}; FROZEN_EN ${Object.keys(FROZEN_EN).length} days`);
