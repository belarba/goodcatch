// How deep is each purse-net map? For every CARD_REF map and card, three naive players are solved exactly and
// scored with the page's own evaluate, as a % of the card's best. A naive player near 100% means a trivial map.
//
//   node tools/depth.mjs check              → self-checks only
//   node tools/depth.mjs [prefix] [limit]   → maps whose key starts with prefix (e.g. 2026-10, carta:)
import { G } from './net-lib.mjs';

function checkLeak() {
  if (!G.leakPath) throw new Error('leakPath missing from @gen');
  const g = { ...G.games.rede, start: [5, 5], marks: new Set(),
    grid: Array.from({ length: 11 }, () => Array.from({ length: 11 }, () => ({ sp: null, rock: false }))) };
  for (let r = 3; r <= 7; r++) for (let c = 3; c <= 7; c++)
    if (Math.max(Math.abs(r - 5), Math.abs(c - 5)) === 2) g.marks.add(G.key(r, c));
  g.marks.delete(G.key(3, 5));
  const one = G.leakPath(g);
  if (!one || one.gap !== G.key(3, 5)) throw new Error(`one hole: expected gap 305, got ${JSON.stringify(one)}`);
  if (one.path.at(-1) !== G.key(4, 5)) throw new Error(`one hole: path must end beside the boat (405), got ${JSON.stringify(one.path)}`);
  g.marks.add(G.key(3, 5));
  if (G.leakPath(g) !== null) throw new Error('closed pen: expected null');
  g.marks.delete(G.key(3, 5)); g.marks.delete(G.key(7, 5));
  const two = G.leakPath(g);
  if (!two || two.gap !== null || !two.path.length) throw new Error(`two holes: expected a path and no gap, got ${JSON.stringify(two)}`);
}
checkLeak();
if (process.argv[2] === 'check') { console.log('depth self-checks ok'); process.exit(0); }
