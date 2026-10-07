// Invariants of the daily sea over 90 days from 2026-09-30: deterministic, exactly 12 combinations, the fish among them,
// par 4 and a consistent player always catching within six casts.
import { readFileSync } from 'node:fs';
import { genModule } from './sync-gen.mjs';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const a = html.indexOf('// @gen-start'), b = html.indexOf('// @gen-end'), e = html.indexOf('// @meta-end');
if (a < 0 || b < a) throw new Error('@gen markers not found');
if (e < b) throw new Error('@meta block (after @gen-end) not found');
const G = new Function(`${html.slice(a, e)}; return {genSea, combo, bites, stars, N, SPECIES: typeof SPECIES === 'undefined' ? null : SPECIES, speciesOf: typeof speciesOf === 'undefined' ? null : speciesOf, speciesMap: typeof speciesMap === 'undefined' ? null : speciesMap, CM, zoneOf, qOf, cmOf, tierOf, weekOf};`)();

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
if (JSON.stringify([1, 2, 3, 4, 6].map(G.stars)) !== '[3,3,2,1,1]') throw new Error('stars: 1-2 casts give 3, 3 gives 2, 4-6 give 1');
if (!G.speciesOf || !G.SPECIES) throw new Error('speciesOf / SPECIES missing from @gen');
for (const s of G.SPECIES) {
  const map = G.speciesMap(s), letters = new Set(map.join('').replace(/\./g, ''));
  for (const ch of letters) if (!(ch in s.pal) && ch !== 'w' && ch !== 'e') throw new Error(`${s.id}: letter ${ch} has no colour`);
}
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
  const sp = G.speciesOf(date), wd = (d.getDay() + 6) % 7, rare = G.SPECIES.find(x => x.id === sp)?.rare === 2;
  if (!G.SPECIES.some(x => x.id === sp) || sp !== G.speciesOf(date)) throw new Error(`${date}: species ${sp}`);
  if (rare !== (wd === 5)) throw new Error(`${date}: rare species on Saturdays only, got ${sp}`);
  if (wd === 6) {
    const week = Array.from({ length: 7 }, (_, j) => { const x = new Date(d); x.setDate(d.getDate() - 6 + j); return G.speciesOf(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`); });
    if (new Set(week).size !== 7) throw new Error(`week ending ${date} repeats a species: ${week}`);
  }
  tries.push(s.tries);
}
tries.sort((x, y) => x - y);
// The hook-set and the banquet: the same green zone for everyone each day, sizes inside each species' range, weeks Mon→Sun.
const day = i => { const d = new Date(2026, 8, 30 + i); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const zones = Array.from({ length: 30 }, (_, i) => G.zoneOf(day(i)));
if (zones.some((z, i) => z !== G.zoneOf(day(i)) || z < 20 || z > 79)) throw new Error('zoneOf must be deterministic and within 20..79');
if (new Set(zones).size < 10) throw new Error(`zoneOf barely varies by date: ${zones}`);
if (G.qOf(50, 50) !== 100 || G.qOf(57, 50) < 90 || G.qOf(58, 50) >= 90 || G.qOf(0, 79) < 0) throw new Error('qOf: centre 100, inside the zone ≥ 90, outside below, never negative');
if ([91, 92, 59, 60].map(G.tierOf).join() !== 'good,record,small,good') throw new Error('tierOf thresholds 60 / 92');
for (const s of G.SPECIES) {
  const r = G.CM[s.id]; if (!r || !(r[0] < r[1])) throw new Error(`CM: ${s.id} needs [min,max]`);
  for (const q of [0, 50, 100]) { const c = G.cmOf(q, r); if (c < r[0] || c > r[1]) throw new Error(`cmOf(${q}) out of ${s.id} range`); }
}
if (G.weekOf('2026-10-07').join() !== '2026-10-05,2026-10-06,2026-10-07,2026-10-08,2026-10-09,2026-10-10,2026-10-11') throw new Error(`weekOf of a Wednesday: ${G.weekOf('2026-10-07')}`);
if (G.weekOf('2026-10-11')[0] !== '2026-10-05' || G.weekOf('2026-11-02')[0] !== '2026-11-02') throw new Error('weekOf: Sunday closes the week, Monday opens it');
if (readFileSync(new URL('../api/src/gen.js', import.meta.url), 'utf8') !== genModule) throw new Error('api/src/gen.js is stale: run node tools/sync-gen.mjs');
console.log(`pista ok: 90 days, generator tries median ${tries[tries.length >> 1]} max ${tries.at(-1)}`);
