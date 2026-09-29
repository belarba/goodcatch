// Deals three rule cards per purse-net map and computes each card's exact best/worst catch and the buoys that
// make it, written into index.html between the @card-ref markers (buoys packed as 2-char base-36 cell indices,
// see packCells). Buoy mode is solved as an integer program with HiGHS, which the page cannot load, so the page
// ships the table.
//
//   (cd tools && npm install)
//   node tools/solve-net.mjs [days=60] [from=today]   → CARD_REF["<date>:rede"], the daily maps (+ line self-check)
//   node tools/solve-net.mjs orders [days=60] [from]    → ORDER_REF["<date>"], the Encomenda maps and orders
//   node tools/solve-net.mjs cards [maps=24] [first=0] → CARD_REF["carta:<i>"], the practice maps first..maps-1
//
// Game logic is read from index.html (@gen markers), never duplicated here.
import { G, localDate, map, checkNet, checkLine, solveBuoys, readTable, writeTable, netFor, realScore, NAIVE } from './net-lib.mjs';

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
function deal(seed, gen = seed) {
  const t0 = Date.now(), hi = {}, used = {};
  for (const k of keys) { const net = netFor(gen, k); hi[k] = solveBuoys(G.boardModel(net), 'max'); used[k] = boonUsed(net, hi[k]); }
  const rng = G.mulberry(G.seedFrom(`${seed}:trio`)), order = trios.map(t => [rng(), t]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  const gap = t => { const s = t.map(k => hi[k].score).sort((a, b) => b - a); return (s[0] - s[1]) / Math.max(1, Math.abs(s[0])); };
  const fair = order.filter(t => t.every(k => used[k])), pool = fair.length ? fair : order;
  const trio = pool.find(t => gap(t) <= CLOSE) ?? pool.reduce((a, b) => gap(b) < gap(a) ? b : a);
  const row = trio.map(k => {
    const net = netFor(gen, k), lo = solveBuoys(G.boardModel(net), 'min');
    return [k, hi[k].score, lo.score, checkNet(net, hi[k]), checkNet(net, lo)];
  });
  console.log(`${seed.padEnd(15)} ${row.map(([k, b, w]) => `${k} ${b}/${w}`).join('  ').padEnd(58)} gap ${Math.round(100 * gap(trio))}%${fair.length ? '' : '  UNFAIR: no trio uses every boon'}  ${Date.now() - t0}ms`);
  return { ...(gen !== seed && { s: gen }), c: row };
}

// A map is deep when, on its median dealt card, no naive player reaches DEEP of the best; variants of the key are tried
// until one is. Median, 0.8 and 10 variants come from a calibration on 8 days x 5 variants (Sep 2026): the median
// passed 5 of 8 days within 5 variants, requiring every card passed 2 of 8 at any cut.
const MAX_VARIANTS = Number(process.env.MAXV ?? 10), DEEP = Number(process.env.DEEP ?? 0.8);
function depthOf(gen, cards) {
  const per = [];
  for (const [k, best] of cards) {
    if (best <= 0) continue;
    const m = G.boardModel(netFor(gen, k)), r = {};
    for (const [name, f] of Object.entries(NAIVE))
      if (!(name === 'noReef' && G.CARDS[k].noRocks)) r[name] = realScore(netFor(gen, k), solveBuoys(f(m), 'max').buoys) / best;
    per.push({ k, max: Math.max(...Object.values(r)), ...r });
  }
  console.log(`    ${per.map(p => `${p.k} ${Object.entries(p).filter(([n]) => n !== 'k' && n !== 'max').map(([n, v]) => `${{ greedy: 'g', near: 'n', noReef: 'r' }[n]}${Math.round(100 * v)}`).join('/')}`).join('  ')}`);
  const sorted = per.map(p => p.max).sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)] : 1;
}
function curate(key) {
  let pick = null;
  for (let v = 0; v < MAX_VARIANTS; v++) {
    const gen = v ? `${key}:${v}` : key, row = deal(key, gen), d = depthOf(gen, row.c);
    console.log(`  ${gen} depth ${Math.round(100 * d)}%`);
    if (!pick || d < pick.d) pick = { row, d, v };
    if (d < DEEP) break;
  }
  console.log(`${key} → variant ${pick.v}, depth ${Math.round(100 * pick.d)}%${pick.d < DEEP ? '' : '  SHALLOW'}`);
  return pick.row;
}

// Encomenda: per day, a map variant and an order roll whose best catch meets exactly two of the three orders.
if (process.argv[2] === 'orders') {
  const n = Number(process.argv[3] ?? 60), start = new Date(`${process.argv[4] ?? localDate(new Date())}T12:00:00`), ref = readTable('order-ref');
  for (let i = 0; i < n; i++) {
    const date = localDate(new Date(start.getTime() + i * 864e5)), key = `${date}:rede`, t0 = Date.now();
    let pick = null;
    for (let v = 0; v < 5 && pick?.met !== 2; v++) for (let k = 0; k < 10; k++) {
      const gen = v ? `${key}:${v}` : key, net = { ...G.games.rede };
      net.grid = net.gen(net, G.mulberry(G.seedFrom(gen)));
      net.orders = G.genOrders(net, G.mulberry(G.seedFrom(k ? `${date}:pedido:${k}` : `${date}:pedido`)));
      if (net.orders.length < 3) continue;
      const hi = solveBuoys(G.boardModel(net), 'max'), bb = checkNet(net, hi);
      const met = G.orderStatus(net, G.evaluate(net).hits).filter(o => o.met).length;
      if (!pick || Math.abs(met - 2) < Math.abs(pick.met - 2)) pick = { gen, net, hi, bb, met, k };
      if (met === 2) break;
    }
    const lo = solveBuoys(G.boardModel(pick.net), 'min');
    ref[date] = { ...(pick.gen !== key && { s: pick.gen }), o: pick.net.orders, b: pick.hi.score, w: lo.score, bb: pick.bb, wb: checkNet(pick.net, lo) };
    console.log(`${date} ${pick.gen} roll ${pick.k}: ${pick.net.orders.map(o => `${o.sp}x${o.q}+${o.b}`).join(' ')}  best ${pick.hi.score} meets ${pick.met}${pick.met === 2 ? '' : '  NOT-TWO'}  ${Date.now() - t0}ms`);
  }
  writeTable('order-ref', 'ORDER_REF', ref);
  process.exit(0);
}

const table = readTable('card-ref');
if (process.argv[2] === 'cards') {
  const n = Number(process.argv[3] ?? 24), first = Number(process.argv[4] ?? 0);
  if (!first) for (const k of Object.keys(table)) if (k.startsWith('carta:')) delete table[k];
  for (let i = first; i < n; i++) table[`carta:${i}`] = curate(`carta:${i}`);
} else {
  const start = new Date(`${from}T12:00:00`);
  for (let i = 0; i < days; i++) {
    const date = localDate(new Date(start.getTime() + i * 864e5));
    table[`${date}:rede`] = curate(`${date}:rede`);
    const line = map('linha', date), l = G.solveLine(G.boardModel(line));
    checkLine(line, l.bestPath, l.best);
    checkLine(line, l.worstPath, l.worst);
  }
}
writeTable('card-ref', 'CARD_REF', table);
