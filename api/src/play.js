import { N, genSea, bites } from './gen.js';

const DAY = /^\d{4}-\d\d-\d\d$/, UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, MAX = 6;

function who(body, today) {
  if (!body || typeof body !== 'object') return { ok: false, error: 'body' };
  const { date, player } = body;
  if (typeof date !== 'string' || !DAY.test(date)) return { ok: false, error: 'date' };
  if (Math.abs(Date.parse(date + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) > 864e5) return { ok: false, error: 'date' };
  if (typeof player !== 'string' || !UUID.test(player)) return { ok: false, error: 'player' };
  return { ok: true, date, player };
}

// Players send their local date, so it may sit a day either side of the server's UTC date.
export function validatePlay(body, today) {
  const w = who(body, today); if (!w.ok) return w;
  const { date, player } = w, { casts } = body;
  if (!Array.isArray(casts) || casts.length < 1 || casts.length > MAX) return { ok: false, error: 'casts' };
  if (new Set(casts).size !== casts.length) return { ok: false, error: 'casts' };
  const sea = genSea(date);
  for (const [i, k] of casts.entries()) {
    if (!Number.isInteger(k) || k % 100 >= N || Math.floor(k / 100) >= N || k < 0) return { ok: false, error: 'casts' };
    const caught = bites(sea.grid[Math.floor(k / 100)][k % 100], sea.fish) === 3;
    if (caught && i < casts.length - 1) return { ok: false, error: 'casts' };
    if (i === casts.length - 1 && !caught && casts.length < MAX) return { ok: false, error: 'unfinished' };
  }
  const last = casts.at(-1), won = bites(sea.grid[Math.floor(last / 100)][last % 100], sea.fish) === 3 ? 1 : 0;
  return { ok: true, date, player, casts, n: casts.length, won };
}

// q is the hook-set's tap quality, reported by the client: it cannot be verified, only bounded.
export function validateSize(body, today) {
  const w = who(body, today); if (!w.ok) return w;
  if (!Number.isInteger(body.q) || body.q < 0 || body.q > 100) return { ok: false, error: 'q' };
  return { ...w, q: body.q };
}

// dist: players who caught it in 1..6 casts, then those who lost. A loss ranks below six casts.
export function summarize(rows, player) {
  const dist = [0, 0, 0, 0, 0, 0, 0], score = r => (r.won ? r.n : MAX + 1);
  for (const r of rows) dist[r.won ? r.n - 1 : MAX]++;
  const me = rows.find(r => r.player === player) || null, others = rows.filter(r => r !== me);
  const better = me && others.length ? Math.round((100 * others.filter(r => score(r) > score(me)).length) / others.length) : null;
  let heat = null;
  if (me) {
    heat = {};
    for (const r of rows) for (const k of JSON.parse(r.casts)) heat[k] = (heat[k] || 0) + 1;
  }
  const sizes = rows.filter(r => r.won && Number.isInteger(r.q));
  const mineQ = me && Number.isInteger(me.q) ? me.q : null, otherQ = sizes.filter(r => r !== me);
  const size = {
    top: sizes.length ? Math.max(...sizes.map(r => r.q)) : null,
    better: mineQ !== null && otherQ.length ? Math.round((100 * otherQ.filter(r => r.q < mineQ).length) / otherQ.length) : null,
  };
  return { players: rows.length, dist, you: me && { n: me.n, won: me.won, q: mineQ }, better, heat, size };
}
