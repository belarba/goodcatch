// How deep is each purse-net map? For every CARD_REF map and card, three naive players are solved exactly and
// scored with the page's own evaluate, as a % of the card's best. A naive player near 100% means a trivial map.
//
//   node tools/depth.mjs check              → self-checks only
//   node tools/depth.mjs [prefix] [limit]   → maps whose key starts with prefix (e.g. 2026-10, carta:)
import { G } from './net-lib.mjs';

function checkLeak() {
  if (!G.leakPath) throw new Error('leakPath missing from @gen');
  const sea = start => ({ ...G.games.rede, start, marks: new Set(),
    grid: Array.from({ length: 11 }, () => Array.from({ length: 11 }, () => ({ sp: null, rock: false }))) });
  const beside = (g, k) => Math.max(Math.abs(Math.floor(k / 100) - g.start[0]), Math.abs(k % 100 - g.start[1])) === 1;

  // A one-square pen above the boat, its top buoy missing, while the rest of the boat is in open sea:
  // the current must go through that hole, not to the boat side nearest the edge.
  const small = sea([7, 5]);
  for (const [r, c] of [[6, 4], [6, 6]]) small.marks.add(G.key(r, c));
  const s = G.leakPath(small);
  if (!s || s.gap !== G.key(5, 5) || s.path.at(-1) !== G.key(6, 5))
    throw new Error(`small pen: expected the hole 505 and the path ending at 605, got ${JSON.stringify(s)}`);

  const g = sea([5, 5]);
  for (let r = 3; r <= 7; r++) for (let c = 3; c <= 7; c++)
    if (Math.max(Math.abs(r - 5), Math.abs(c - 5)) === 2) g.marks.add(G.key(r, c));
  g.marks.delete(G.key(3, 5));
  const one = G.leakPath(g);
  if (!one || one.gap !== G.key(3, 5)) throw new Error(`one hole: expected gap 305, got ${JSON.stringify(one)}`);
  if (!beside(g, one.path.at(-1)) || !one.path.includes(G.key(3, 5)))
    throw new Error(`one hole: path must pass the hole and end beside the boat, got ${JSON.stringify(one.path)}`);
  g.marks.add(G.key(3, 5));
  if (G.leakPath(g) !== null) throw new Error('closed pen: expected null');
  g.marks.delete(G.key(3, 5)); g.marks.delete(G.key(7, 5));
  const two = G.leakPath(g);
  if (!two || two.gap !== null || !two.path.length) throw new Error(`two holes: expected a path and no gap, got ${JSON.stringify(two)}`);
}
checkLeak();
if (process.argv[2] === 'check') { console.log('depth self-checks ok'); process.exit(0); }
