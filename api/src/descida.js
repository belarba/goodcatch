import { isDay } from './play.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Same date as TEN in descida/index.html: from it on a descent has ten layers, the seabed included.
const TEN = '2026-11-17';
const PTS5 = [100, 150, 200, 250, 300], PTS10 = [100, 120, 140, 170, 200, 230, 260, 280, 300];
const BOSS = 500, RELICS = 3;
export const pts = date => (date >= TEN ? PTS10 : PTS5);
export const layersOf = date => pts(date).length + 1;

const base = (d, date) => pts(date).slice(0, d).reduce((a, b) => a + b, 0);
export const minScore = (d, date = '') => base(d, date) + (d === layersOf(date) ? BOSS : 0);
export const maxScore = (d, date = '') => base(d, date) * 1.5 + (d === layersOf(date) ? BOSS * 1.5 + 250 + RELICS * 50 : 0);

// used: "<layer><i|t|r>" per piece of tackle spent, comma-separated ("" = none). Absent from older pages, stored as NULL.
const USED = /^(\d{1,2}[itr](,\d{1,2}[itr])*)?$/;
const validUsed = (used, depth, date) => used === undefined ||
  typeof used === 'string' && USED.test(used) && (used ? used.split(',') : []).every(u => parseInt(u) <= Math.min(depth, layersOf(date) - 1)) &&
  (used ? used.split(',').length : 0) <= RELICS;

// depth is how many layers the run cleared (layersOf = the fish came up). The run itself is not replayed here:
// score, depth and used are client-reported and only bounded, like the Pista hook-set's q.
export function validateDescida(body, today) {
  if (!body || typeof body !== 'object') return { ok: false, error: 'body' };
  const { date, player, depth, score, perfect, used } = body;
  if (typeof date !== 'string' || !isDay(date)) return { ok: false, error: 'date' };
  if (Math.abs(Date.parse(date + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) > 864e5) return { ok: false, error: 'date' };
  if (typeof player !== 'string' || !UUID.test(player)) return { ok: false, error: 'player' };
  const L = layersOf(date);
  if (!Number.isInteger(depth) || depth < 0 || depth > L) return { ok: false, error: 'depth' };
  if (!Number.isInteger(score) || score < minScore(depth, date) || score > maxScore(depth, date)) return { ok: false, error: 'score' };
  if (perfect !== 0 && perfect !== 1 || perfect && depth !== L) return { ok: false, error: 'perfect' };
  if (!validUsed(used, depth, date)) return { ok: false, error: 'used' };
  return { ok: true, date, player, depth, score, perfect, used: used ?? null };
}

// dist[d]: players whose run ended after clearing d layers. better: share of the others who scored less.
export function summarizeDescida(rows, player, date = '') {
  const dist = Array(layersOf(date) + 1).fill(0);
  for (const r of rows) dist[r.depth]++;
  const me = rows.find(r => r.player === player) || null, others = rows.filter(r => r !== me);
  const better = me && others.length ? Math.round((100 * others.filter(r => r.score < me.score).length) / others.length) : null;
  return { players: rows.length, dist, you: me && { depth: me.depth, score: me.score, streak: me.streak ?? 1 }, better };
}
