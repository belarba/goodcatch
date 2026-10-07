// Checks the play validator and the daily stats without Cloudflare: node api/test.mjs
import { genSea, bites, combo } from './src/gen.js';
import { validatePlay, validateSize, summarize, isDay, weekDates, weekStats, streakStats } from './src/play.js';

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

const sz = (q, extra = {}) => validateSize({ date: DATE, player: P, q, ...extra }, TODAY);
v = sz(73);
if (!v.ok || v.q !== 73 || v.player !== P || v.date !== DATE) fail(`a size of 73 must pass: ${JSON.stringify(v)}`);
if (!sz(0).ok || !sz(100).ok) fail('0 and 100 are valid sizes');
for (const [name, r] of Object.entries({
  'q below 0': sz(-1), 'q above 100': sz(101), 'q not integer': sz(50.5), 'q string': sz('50'),
  'size bad player': sz(50, { player: 'me' }), 'size date too far': sz(50, { date: '2026-09-25' }),
})) if (r.ok) fail(`must refuse: ${name}`);

const sized = rows.map((r, i) => ({ ...r, q: [80, 40, null, 95, null][i] }));
const z = summarize(sized, P);
if (z.you.q !== 80) fail(`you.q ${z.you.q}`);
if (z.size.top !== 95) fail(`size.top ${z.size.top}`);
if (z.size.better !== 50) fail(`80 beats 40 and loses to 95: 50, got ${z.size.better}`);
if (summarize(rows, P).size.better !== null || summarize(rows, P).size.top !== null) fail('no sizes, no size stats');
if (weekDates('2026-10-07').join() !== '2026-10-05,2026-10-06,2026-10-07,2026-10-08,2026-10-09,2026-10-10,2026-10-11') fail(`week of a Wednesday ${weekDates('2026-10-07')}`);
if (weekDates('2026-10-11')[0] !== '2026-10-05') fail('a Sunday belongs to the week that started on Monday');
if (weekDates('2026-11-02')[0] !== '2026-11-02') fail('a Monday starts its own week');
const ws = weekStats('2026-10-07', [{ date: '2026-10-05', players: 3, caught: 2 }, { date: '2026-10-07', players: 1, caught: 0 }]);
if (JSON.stringify(ws) !== JSON.stringify([{ players: 3, caught: 2 }, { players: 0, caught: 0 }, { players: 1, caught: 0 }, ...Array(4).fill({ players: 0, caught: 0 })])) fail(`weekStats ${JSON.stringify(ws)}`);
const day = [{ player: P, streak: 3 }, { player: 'new', streak: 1 }, { player: 'old', streak: null }, { player: 'long', streak: 7 }, { player: 'tie', streak: 3 }];
const st = streakStats(day, P);
if (st.you !== 3) fail(`three days in a row, got ${st.you}`);
if (st.better !== 50) fail(`3 beats new(1) and old(null counts 1), not long(7) nor tie(3): 50, got ${st.better}`);
if (streakStats(day, 'stranger').you !== null || streakStats(day, 'stranger').better !== null) fail('no streak without a play today');
if (streakStats([{ player: P, streak: 2 }], P).better !== null) fail('no streak percentile without others');
if (!isDay('2026-10-07')) fail('a real day passes isDay');
for (const d of ['2026-99-99', '2026-02-30', '2026-1-1']) if (isDay(d)) fail(`isDay accepted ${d}`);
if (validatePlay({ date: '2026-02-30', player: P, casts: [fishKey] }, '2026-03-01').error !== 'date') fail('an impossible date must be refused even next to today');
console.log('api ok: validator and stats');
