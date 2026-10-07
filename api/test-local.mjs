// Checks the SQL guards against the local Worker, which test.mjs cannot reach.
// Run `npx wrangler dev --port 8787 --local` in api/ first, then: node test-local.mjs
import { genSea, bites } from './src/gen.js';
import { shiftDay } from './src/play.js';

const API = 'http://localhost:8787';
const fail = msg => { throw new Error(msg); };
const post = (path, body) => fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  .then(async r => (r.ok ? r.json() : fail(`${path} ${r.status} ${await r.text()}`)));

function game(date, won) {
  const sea = genSea(date), keys = [];
  sea.grid.forEach((row, r) => row.forEach((x, c) => keys.push([r * 100 + c, bites(x, sea.fish)])));
  const misses = keys.filter(([, n]) => n < 3).map(([k]) => k);
  return won ? [misses[0], keys.find(([, n]) => n === 3)[0]] : misses.slice(0, 6);
}

const today = new Date().toISOString().slice(0, 10), yesterday = shiftDay(today, -1);
const winner = crypto.randomUUID(), loser = crypto.randomUUID(), regular = crypto.randomUUID();

await post('/plays', { date: today, player: winner, casts: game(today, true) });
await post('/plays/size', { date: today, player: winner, q: 40 });
let v = await post('/plays/size', { date: today, player: winner, q: 100 });
if (v.you.q !== 40) fail(`the first size must stand, got ${v.you.q}`);

await post('/plays', { date: today, player: loser, casts: game(today, false) });
v = await post('/plays/size', { date: today, player: loser, q: 90 });
if (v.you.won !== 0 || v.you.q !== null) fail(`a lost game takes no size, got ${JSON.stringify(v.you)}`);

v = await post('/plays', { date: yesterday, player: regular, casts: game(yesterday, true) });
if (v.streak.you !== 1) fail(`a first day is a streak of 1, got ${v.streak.you}`);
v = await post('/plays', { date: today, player: regular, casts: game(today, false) });
if (v.streak.you !== 2) fail(`yesterday and today make 2, got ${v.streak.you}`);

console.log('api local ok: first size stands, lost games take none, streak carries over');
