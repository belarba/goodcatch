import { validatePlay, validateSize, summarize, isDay, weekDates, weekStats, streakStats, shiftDay } from './play.js';

const ORIGINS = new Set(['https://goodcatch.fish', 'http://localhost:8765']);
const cors = req => {
  const o = req.headers.get('Origin');
  return ORIGINS.has(o) ? { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' } : {};
};
const json = (req, body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors(req) } });
const today = () => new Date().toISOString().slice(0, 10);

const readBody = async (req, max) => {
  const raw = await req.text();
  if (raw.length > max) return { error: 'size' };
  try { return { body: JSON.parse(raw) }; } catch { return { body: null }; }
};

async function stats(env, date, player) {
  const week = weekDates(date);
  const [day, wk] = await env.DB.batch([
    env.DB.prepare('SELECT player, casts, n, won, q, streak FROM plays WHERE date = ?').bind(date),
    env.DB.prepare('SELECT date, COUNT(*) AS players, SUM(won) AS caught FROM plays WHERE date BETWEEN ? AND ? GROUP BY date').bind(week[0], week[6]),
  ]);
  return { ...summarize(day.results, player), week: weekStats(date, wk.results), streak: streakStats(day.results, player) };
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
    const url = new URL(req.url);
    if (req.method === 'POST' && url.pathname === '/plays') {
      const { body, error } = await readBody(req, 2048);
      if (error) return json(req, { error }, 413);
      const v = validatePlay(body, today());
      if (!v.ok) return json(req, { error: v.error }, 400);
      const prev = await env.DB.prepare('SELECT streak FROM plays WHERE date = ? AND player = ?').bind(shiftDay(v.date, -1), v.player).first('streak');
      await env.DB.prepare('INSERT OR IGNORE INTO plays (date, player, casts, n, won, created_at, streak) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(v.date, v.player, JSON.stringify(v.casts), v.n, v.won, Date.now(), (prev ?? 0) + 1).run();
      return json(req, await stats(env, v.date, v.player));
    }
    if (req.method === 'POST' && url.pathname === '/plays/size') {
      const { body, error } = await readBody(req, 512);
      if (error) return json(req, { error }, 413);
      const v = validateSize(body, today());
      if (!v.ok) return json(req, { error: v.error }, 400);
      // Only a won game gets a size, and the first one stands: a reload cannot re-roll it.
      await env.DB.prepare('UPDATE plays SET q = ? WHERE date = ? AND player = ? AND won = 1 AND q IS NULL')
        .bind(v.q, v.date, v.player).run();
      return json(req, await stats(env, v.date, v.player));
    }
    const m = /^\/daily\/(\d{4}-\d\d-\d\d)$/.exec(url.pathname);
    if (req.method === 'GET' && m && !isDay(m[1])) return json(req, { error: 'date' }, 400);
    if (req.method === 'GET' && m) return json(req, await stats(env, m[1], url.searchParams.get('player') || ''));
    return json(req, { error: 'not found' }, 404);
  },
};
