// How deep is each purse-net map? For every CARD_REF map and card, three naive players are solved exactly and
// scored with the page's own evaluate, as a % of the card's best. A naive player near 100% means a trivial map.
//
//   node tools/depth.mjs check              → self-checks only
//   node tools/depth.mjs [prefix] [limit]   → maps whose key starts with prefix (e.g. 2026-10, carta:)
import { G, solveBuoys, cardRef, netFor, realScore, NAIVE } from './net-lib.mjs';

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
function checkProtected() {
  if (!G.canBuoy) throw new Error('canBuoy missing from @gen');
  const g = { ...G.games.rede, start: [5, 5], marks: new Set(), card: null,
    grid: Array.from({ length: 11 }, () => Array.from({ length: 11 }, () => ({ sp: null, rock: false }))) };
  g.grid[3][3].sp = 'tartaruga'; g.grid[4][4].sp = 'sardinha';
  if (G.canBuoy(g, 3, 3)) throw new Error('a buoy on a turtle must be refused');
  if (!G.canBuoy(g, 4, 4) || !G.canBuoy(g, 6, 6)) throw new Error('fish and water must take a buoy');
  g.card = G.CARDS.soltura;
  if (!G.canBuoy(g, 3, 3)) throw new Error('Release must allow a buoy on a turtle');
}
checkProtected();
function checkStars() {
  if (!G.stars) throw new Error('stars missing from @gen');
  const got = [[69, 100], [70, 100], [84, 100], [85, 100], [99, 100], [100, 100], [5, 0]].map(([x, b]) => G.stars(x, b));
  if (JSON.stringify(got) !== JSON.stringify([0, 1, 1, 2, 2, 3, null])) throw new Error(`stars: got ${JSON.stringify(got)}`);
}
checkStars();
function checkClue() {
  if (!G.clueFor) throw new Error('clueFor missing from @gen');
  // Boat at (5,5); a pen is the squares listed, fenced by buoys on every free neighbour.
  const board = () => ({ ...G.games.rede, start: [5, 5], marks: new Set(), card: null,
    grid: Array.from({ length: 11 }, () => Array.from({ length: 11 }, () => ({ sp: null, rock: false }))) });
  const fence = (g, cells) => {
    const inside = new Set(cells.map(([r, c]) => G.key(r, c))), m = new Set();
    for (const [r, c] of cells) for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = G.key(r + dr, c + dc);
      if (!inside.has(k) && !(r + dr === 5 && c + dc === 5) && !g.grid[r + dr][c + dc].rock) m.add(k);
    }
    return m;
  };
  const expect = (name, got, want) => { if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`clue ${name}: expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`); };
  let g = board(); g.grid[4][5].sp = 'tartaruga'; g.grid[6][5].sp = 'sardinha';
  g.marks = fence(g, [[4, 5]]); expect('prot', G.clueFor(g, fence(g, [[6, 5]])), { k: 'prot', sp: 'tartaruga' });
  g = board(); g.grid[3][5].rock = true; g.grid[4][5].sp = 'sardinha'; g.grid[6][5].sp = 'sardinha';
  g.marks = fence(g, [[6, 5]]); expect('reef', G.clueFor(g, fence(g, [[4, 5]])), { k: 'reef', dir: 'n' });
  g = board(); for (const [r, c] of [[6, 5], [7, 5], [8, 5]]) g.grid[r][c].sp = 'sardinha';
  g.marks = fence(g, [[6, 5]]); expect('species', G.clueFor(g, fence(g, [[6, 5], [7, 5], [8, 5]])), { k: 'species', sp: 'sardinha', n: 3, m: 1 });
  g = board(); g.grid[4][5].sp = 'sardinha'; g.grid[6][5].sp = 'sardinha';
  g.marks = fence(g, [[4, 5]]); expect('side', G.clueFor(g, fence(g, [[6, 5]])), { k: 'side', dir: 's' });
  g = board(); g.grid[6][5].sp = 'sardinha'; g.marks = fence(g, [[6, 5]]); expect('same', G.clueFor(g, fence(g, [[6, 5]])), null);
}
checkClue();
if (process.argv[2] === 'check') { console.log('depth self-checks ok'); process.exit(0); }

const REF = cardRef();

const [prefix = '', limit = Infinity] = process.argv.slice(2);
const rows = [];
for (const seed of Object.keys(REF).filter(k => k.startsWith(prefix)).slice(0, Number(limit))) {
  const gen = REF[seed].s ?? seed;
  for (const [k, best] of REF[seed].c) {
    const row = { seed, k, best }, m = G.boardModel(netFor(gen, k));
    // High tide already removes the reef, so the no-reef player would just be playing the real game.
    for (const [name, f] of Object.entries(NAIVE)) row[name] = name === 'noReef' && G.CARDS[k].noRocks ? null : realScore(netFor(gen, k), solveBuoys(f(m), 'max').buoys);
    if (Object.keys(NAIVE).some(n => row[n] > best)) throw new Error(`${seed} ${k}: a naive player beat the optimum ${JSON.stringify(row)}`);
    rows.push(row);
    const pct = x => best > 0 && x !== null ? `${Math.round(100 * x / best)}%` : '—';
    console.log(`${seed.padEnd(16)} ${k.padEnd(9)} best ${String(best).padStart(3)}  greedy ${pct(row.greedy).padStart(4)}  near ${pct(row.near).padStart(4)}  noReef ${pct(row.noReef).padStart(4)}`);
  }
}
const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const scored = rows.filter(r => r.best > 0);
for (const n of Object.keys(NAIVE)) console.log(`${n}: median ${Math.round(100 * med(scored.filter(r => r[n] !== null).map(r => r[n] / r.best)))}% of best`);
const trivial = scored.filter(r => Object.keys(NAIVE).some(n => r[n] !== null && r[n] / r.best >= 0.9));
console.log(`${trivial.length} of ${scored.length} map/card pairs have a naive player at >= 90% of best (trivial)`);
