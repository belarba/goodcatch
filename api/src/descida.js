import { isDay } from './play.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PTS = [100, 150, 200, 250, 300], BOSS = 500, RELICS = 3, LAYERS = 6;

const base = d => PTS.slice(0, Math.min(d, 5)).reduce((a, b) => a + b, 0);
export const minScore = d => base(d) + (d === LAYERS ? BOSS : 0);
export const maxScore = d => base(d) * 1.5 + (d === LAYERS ? BOSS * 1.5 + 250 + RELICS * 50 : 0);

// depth is how many layers the run cleared (6 = the fish came up). The run itself is not replayed here:
// score and depth are client-reported and only bounded, like the Pista hook-set's q.
export function validateDescida(body, today) {
  if (!body || typeof body !== 'object') return { ok: false, error: 'body' };
  const { date, player, depth, score, perfect } = body;
  if (typeof date !== 'string' || !isDay(date)) return { ok: false, error: 'date' };
  if (Math.abs(Date.parse(date + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) > 864e5) return { ok: false, error: 'date' };
  if (typeof player !== 'string' || !UUID.test(player)) return { ok: false, error: 'player' };
  if (!Number.isInteger(depth) || depth < 0 || depth > LAYERS) return { ok: false, error: 'depth' };
  if (!Number.isInteger(score) || score < minScore(depth) || score > maxScore(depth)) return { ok: false, error: 'score' };
  if (perfect !== 0 && perfect !== 1 || perfect && depth !== LAYERS) return { ok: false, error: 'perfect' };
  return { ok: true, date, player, depth, score, perfect };
}

// dist[d]: players whose run ended after clearing d layers. better: share of the others who scored less.
export function summarizeDescida(rows, player) {
  const dist = Array(LAYERS + 1).fill(0);
  for (const r of rows) dist[r.depth]++;
  const me = rows.find(r => r.player === player) || null, others = rows.filter(r => r !== me);
  const better = me && others.length ? Math.round((100 * others.filter(r => r.score < me.score).length) / others.length) : null;
  return { players: rows.length, dist, you: me && { depth: me.depth, score: me.score, streak: me.streak ?? 1 }, better };
}
