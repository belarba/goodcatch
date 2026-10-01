// Checks the play validator and the daily stats without Cloudflare: node api/test.mjs
import { genSea, bites, combo } from './src/gen.js';
import { validatePlay, summarize } from './src/play.js';

const fail = msg => { throw new Error(msg); };
const DATE = '2026-10-01', TODAY = '2026-10-01', P = '3f2b8c1e-6a4d-4c2e-9b7a-1d2e3f4a5b6c';
const sea = genSea(DATE), keys = [];
sea.grid.forEach((row, r) => row.forEach((x, c) => keys.push([r * 100 + c, bites(x, sea.fish)])));
const fishKey = keys.find(([, n]) => n === 3)[0], misses = keys.filter(([, n]) => n < 3).map(([k]) => k);

const ok = (casts, extra = {}) => validatePlay({ date: DATE, player: P, casts, ...extra }, TODAY);
let v = ok([misses[0], misses[1], fishKey]);
if (!v.ok || v.n !== 3 || v.won !== 1) fail(`a catch on the third cast must pass: ${JSON.stringify(v)}`);
v = ok(misses.slice(0, 6));
if (!v.ok || v.n !== 6 || v.won !== 0) fail(`six misses must pass as a loss: ${JSON.stringify(v)}`);

const bad = {
  'catch before the end': ok([fishKey, ...misses.slice(0, 5)]),
  'unfinished game': ok([misses[0], misses[1]]),
  'seven casts': ok(misses.slice(0, 7)),
  'repeated square': ok([misses[0], misses[0], fishKey]),
  'square off the board': ok([7, fishKey]),
  'not a number': ok(['x', fishKey]),
  'date too far': validatePlay({ date: '2026-09-25', player: P, casts: [fishKey] }, TODAY),
  'bad date': validatePlay({ date: '2026-1-1', player: P, casts: [fishKey] }, TODAY),
  'bad player': validatePlay({ date: DATE, player: 'me', casts: [fishKey] }, TODAY),
  'no body': validatePlay(null, TODAY),
};
for (const [name, r] of Object.entries(bad)) if (r.ok) fail(`must refuse: ${name}`);
if (!validatePlay({ date: '2026-10-02', player: P, casts: [genSeaFish('2026-10-02')] }, TODAY).ok) fail('a player one day ahead must pass');

function genSeaFish(date) {
  const s = genSea(date); for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) if (combo(s.grid[r][c]) === combo(s.fish)) return r * 100 + c;
}

const rows = [
  { player: P, casts: JSON.stringify([misses[0], misses[1], fishKey]), n: 3, won: 1 },
  { player: 'b', casts: JSON.stringify([misses[0], fishKey]), n: 2, won: 1 },
  { player: 'c', casts: JSON.stringify(misses.slice(0, 6)), n: 6, won: 0 },
  { player: 'd', casts: JSON.stringify([misses[2], misses[3], misses[4], fishKey]), n: 4, won: 1 },
  { player: 'e', casts: JSON.stringify([misses[5], misses[6], fishKey]), n: 3, won: 1 },
];
const s = summarize(rows, P);
if (s.players !== 5) fail(`players ${s.players}`);
if (JSON.stringify(s.dist) !== '[0,1,2,1,0,0,1]') fail(`dist ${JSON.stringify(s.dist)}`);
if (s.you?.n !== 3 || s.you?.won !== 1) fail(`you ${JSON.stringify(s.you)}`);
if (s.better !== 50) fail(`strictly better than 2 of 4 others (one tie) must be 50, got ${s.better}`);
if (s.heat[misses[0]] !== 3 || s.heat[fishKey] !== 4) fail(`heat ${JSON.stringify(s.heat)}`);
if (summarize(rows, 'stranger').heat !== null) fail('no heat map for a player without a play');
if (summarize([], P).better !== null) fail('no better-than with nobody else');
console.log('api ok: validator and stats');
