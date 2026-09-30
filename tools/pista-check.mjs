// Invariants of the novo-jogo sea over 90 days from 2026-09-30: deterministic, exactly 12 combinations, the fish among them,
// par 4 and a consistent player always catching within six casts.
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../novo-jogo/index.html', import.meta.url), 'utf8');
const a = html.indexOf('// @gen-start'), b = html.indexOf('// @gen-end');
if (a < 0 || b < a) throw new Error('@gen markers not found');
const G = new Function(`${html.slice(a, b)}; return {genSea, combo, bites, stars, N};`)();

const F = [...Array(16).keys()].map(q => [...Array(16).keys()].map(s => G.bites(
  { b: q >> 2, d: (q >> 1) & 1, l: q & 1 }, { b: s >> 2, d: (s >> 1) & 1, l: s & 1 })));
const split = (q, S) => { const m = new Map(); for (const s of S) { const f = F[q][s]; if (!m.has(f)) m.set(f, []); m.get(f).push(s); } return m; };
function par(S, P, memo = new Map()) {
  if (S.length === 1) return 1; const k = S.join(); if (memo.has(k)) return memo.get(k); let best = 99;
  for (const q of P) { const m = split(q, S); if (m.size === 1 && !m.has(3)) continue;
    let w = 0; for (const [f, p] of m) if (f !== 3) w = Math.max(w, par(p, P, memo)); best = Math.min(best, 1 + w); }
  memo.set(k, best); return best;
}
// Adversary picks both the consistent cast and the answer.
function worst(S, memo = new Map()) {
  if (S.length === 1) return 1; const k = S.join(); if (memo.has(k)) return memo.get(k); let w = 1;
  for (const q of S) for (const [f, p] of split(q, S)) if (f !== 3) w = Math.max(w, 1 + worst(p, memo));
  memo.set(k, w); return w;
}
if (G.bites({ b: 1, d: 1, l: 0 }, { b: 1, d: 0, l: 0 }) !== 2) throw new Error('bites: coral deep sun vs coral shallow sun must be 2');
if (JSON.stringify([4, 5, 6].map(G.stars)) !== '[3,2,1]') throw new Error('stars: 4/5/6 casts must give 3/2/1');
const tries = [];
for (let i = 0; i < 90; i++) {
  const d = new Date(2026, 8, 30 + i), date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const s = G.genSea(date);
  if (JSON.stringify(s) !== JSON.stringify(G.genSea(date))) throw new Error(`${date}: not deterministic`);
  const cells = s.grid.flat(), present = [...new Set(cells.map(G.combo))].sort((x, y) => x - y);
  if (cells.length !== G.N * G.N || cells.some(x => x.island)) throw new Error(`${date}: expected 7x7 open water`);
  if (cells.some((x, i) => x.d !== (Math.floor(i / G.N) >= s.shelf[i % G.N] ? 0 : 1))) throw new Error(`${date}: depth must follow the shelf`);
  if (present.length !== 12 || present.join() !== s.present.join()) throw new Error(`${date}: ${present.length} combinations present`);
  if (!present.includes(G.combo(s.fish))) throw new Error(`${date}: the fish is not on the map`);
  const p = par(present, present), w = worst(present);
  if (p !== 4) throw new Error(`${date}: par ${p}, the stars assume 4`);
  if (w > 6) throw new Error(`${date}: a consistent player can need ${w} casts`);
  tries.push(s.tries);
}
tries.sort((x, y) => x - y);
console.log(`pista ok: 90 days, generator tries median ${tries[tries.length >> 1]} max ${tries.at(-1)}`);
