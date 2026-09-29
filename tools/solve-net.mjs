// Deals three rule cards per purse-net map and computes each card's exact best/worst catch and the buoys that
// make it, written into index.html between the @card-ref markers (buoys packed as 2-char base-36 cell indices,
// see packCells). Buoy mode is solved as an integer program with HiGHS, which the page cannot load, so the page
// ships the table.
//
//   (cd tools && npm install)
//   node tools/solve-net.mjs [days=60] [from=today]   → CARD_REF["<date>:rede"], the daily maps (+ line self-check)
//   node tools/solve-net.mjs cards [maps=24]           → CARD_REF["carta:<i>"], the practice maps
//
// Game logic is read from index.html (@gen markers), never duplicated here.
import { G, localDate, map, checkNet, checkLine, solveBuoys, readTable, writeTable } from './net-lib.mjs';

const days = Number(process.argv[2] ?? 60);
const from = process.argv[3] ?? localDate(new Date());

// A trio is offered only if its best two cards finish within CLOSE of each other, so no card is an obvious pick,
// and every boon card in it is used by its own optimum, so the bonus it promises is reachable.
const CLOSE = 0.10;
const boonUsed = (net, sol) => {
  const cd = net.card;
  if (!cd.set && !cd.release) return true;
  net.marks = new Set(sol.buoys.map(([r, c]) => r * 100 + c));
  return cd.set ? G.evaluate(net).hits.some(([r, c]) => net.grid[r][c].sp in cd.set)
    : sol.buoys.some(([r, c]) => G.SP[net.grid[r][c].sp]?.p < 0);
};
const keys = Object.keys(G.CARDS);
const trios = keys.flatMap((a, x) => keys.slice(x + 1).flatMap((b, y) => keys.slice(x + y + 2).map(c => [a, b, c])));
const netFor = (seed, k) => {
  const net = { ...G.games.rede, card: G.CARDS[k] };
  net.grid = net.gen(net, G.mulberry(G.seedFrom(seed)));
  G.applyCard(net);
  return net;
};
function deal(seed) {
  const t0 = Date.now(), hi = {}, used = {};
  for (const k of keys) { const net = netFor(seed, k); hi[k] = solveBuoys(G.boardModel(net), 'max'); used[k] = boonUsed(net, hi[k]); }
  const rng = G.mulberry(G.seedFrom(`${seed}:trio`)), order = trios.map(t => [rng(), t]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  const gap = t => { const s = t.map(k => hi[k].score).sort((a, b) => b - a); return (s[0] - s[1]) / Math.max(1, Math.abs(s[0])); };
  const fair = order.filter(t => t.every(k => used[k])), pool = fair.length ? fair : order;
  const trio = pool.find(t => gap(t) <= CLOSE) ?? pool.reduce((a, b) => gap(b) < gap(a) ? b : a);
  const row = trio.map(k => {
    const net = netFor(seed, k), lo = solveBuoys(G.boardModel(net), 'min');
    return [k, hi[k].score, lo.score, checkNet(net, hi[k]), checkNet(net, lo)];
  });
  console.log(`${seed.padEnd(15)} ${row.map(([k, b, w]) => `${k} ${b}/${w}`).join('  ').padEnd(58)} gap ${Math.round(100 * gap(trio))}%${fair.length ? '' : '  UNFAIR: no trio uses every boon'}  ${Date.now() - t0}ms`);
  return row;
}

const table = readTable('card-ref');
if (process.argv[2] === 'cards') {
  const n = Number(process.argv[3] ?? 24);
  for (const k of Object.keys(table)) if (k.startsWith('carta:')) delete table[k];
  for (let i = 0; i < n; i++) table[`carta:${i}`] = deal(`carta:${i}`);
} else {
  const start = new Date(`${from}T12:00:00`);
  for (let i = 0; i < days; i++) {
    const date = localDate(new Date(start.getTime() + i * 864e5));
    table[`${date}:rede`] = deal(`${date}:rede`);
    const line = map('linha', date), l = G.solveLine(G.boardModel(line));
    checkLine(line, l.bestPath, l.best);
    checkLine(line, l.worstPath, l.worst);
  }
}
writeTable('card-ref', 'CARD_REF', table);
