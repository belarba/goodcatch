// Fills the LOCAL dev database (wrangler dev on :8787) with synthetic players for a date. Never point it at production.
import { genSea, bites } from './src/gen.js';
const [date = new Date().toISOString().slice(0, 10), count = 120] = process.argv.slice(2);
const sea = genSea(date), cells = [];
sea.grid.forEach((row, r) => row.forEach((x, c) => cells.push({ k: r * 100 + c, x })));
const match = (a, b) => (a.b === b.b) + (a.d === b.d) + (a.l === b.l);
for (let p = 0; p < Number(count); p++) {
  // A player who keeps the clues consistent, picking at random among the squares still possible.
  let left = cells.slice(), casts = [], seen = [];
  while (casts.length < 6) {
    const pool = left.filter(c => !casts.includes(c.k) && seen.every(([q, n]) => match(c.x, q) === n));
    const pick = (pool.length ? pool : left.filter(c => !casts.includes(c.k)))[Math.floor(Math.random() * (pool.length || 1))] ?? left[0];
    casts.push(pick.k); const n = bites(pick.x, sea.fish); seen.push([pick.x, n]); if (n === 3) break;
  }
  await fetch('http://localhost:8787/plays', { method: 'POST', body: JSON.stringify({ date, player: crypto.randomUUID(), casts }) });
}
const s = await (await fetch(`http://localhost:8787/daily/${date}`)).json();
console.log(`seeded ${date}: ${s.players} players, dist ${JSON.stringify(s.dist)}`);
