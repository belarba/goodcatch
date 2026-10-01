import { validatePlay, summarize } from './play.js';

const ORIGINS = new Set(['https://goodcatch.fish', 'http://localhost:8765']);
const cors = req => {
  const o = req.headers.get('Origin');
  return ORIGINS.has(o) ? { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' } : {};
};
const json = (req, body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors(req) } });
const today = () => new Date().toISOString().slice(0, 10);

async function stats(env, date, player) {
  const { results } = await env.DB.prepare('SELECT player, casts, n, won FROM plays WHERE date = ?').bind(date).all();
  return summarize(results, player);
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
    const url = new URL(req.url);
    if (req.method === 'POST' && url.pathname === '/plays') {
      const raw = await req.text();
      if (raw.length > 2048) return json(req, { error: 'size' }, 413);
      let body = null; try { body = JSON.parse(raw); } catch {}
      const v = validatePlay(body, today());
      if (!v.ok) return json(req, { error: v.error }, 400);
      await env.DB.prepare('INSERT OR IGNORE INTO plays (date, player, casts, n, won, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(v.date, v.player, JSON.stringify(v.casts), v.n, v.won, Date.now()).run();
      return json(req, await stats(env, v.date, v.player));
    }
    const m = /^\/daily\/(\d{4}-\d\d-\d\d)$/.exec(url.pathname);
    if (req.method === 'GET' && m) return json(req, await stats(env, m[1], url.searchParams.get('player') || ''));
    return json(req, { error: 'not found' }, 404);
  },
};
