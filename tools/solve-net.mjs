// Computes each day's exact best/worst purse-net catch and the buoys that make it, and writes them into
// index.html between the @net-ref markers (buoys packed as 2-char base-36 cell indices, see packCells).
// Buoy mode is solved as an integer program with HiGHS, which the page cannot load, so the page ships the table.
//
//   (cd tools && npm install)
//   node tools/solve-net.mjs [days=60] [from=today]
//   node tools/solve-net.mjs cards [maps=24]     → CARD_REF, practice maps offering three rule cards each
//
// Game logic is read from index.html (@gen markers), never duplicated here.
import { readFileSync, writeFileSync } from 'node:fs';
import highsLoader from 'highs';

const highs = await highsLoader();
const FILE = new URL('../index.html', import.meta.url);
const days = Number(process.argv[2] ?? 60);
const from = process.argv[3] ?? localDate(new Date());

let html = readFileSync(FILE, 'utf8');
const between = (a, b) => {
  const i = html.indexOf(a), j = html.indexOf(b);
  if (i < 0 || j < i) throw new Error(`markers ${a} / ${b} not found`);
  return [i + a.length, j];
};
const [gs, ge] = between('// @gen-start', '// @gen-end');
const G = new Function(`${html.slice(gs, ge)}; return {games, seedFrom, mulberry, evaluate, scoreOf, solveLine, boardModel, packCells, CARDS, applyCard, overArea};`)();

function localDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function map(key, date) {
  const g = { ...G.games[key] };
  g.grid = g.gen(g, G.mulberry(G.seedFrom(`${date}:${key}`)));
  return g;
}
function score(g) {
  const { hits, inside } = G.evaluate(g);
  if (G.overArea(g, inside)) throw new Error(`net: ${inside.size} squares in the pen > ${g.card.maxArea}`);
  return hits ? G.scoreOf(g, hits, inside) : null;
}
function checkLine(g, path, expected) {
  g.marks = new Set(path.slice(1).map(([r, c]) => r * 100 + c));
  if (score(g) !== expected) throw new Error(`line: solver says ${expected}, the page's lineChain + evaluate say ${score(g)}`);
}
function checkNet(g, sol) {
  g.marks = new Set(sol.buoys.map(([r, c]) => r * 100 + c));
  if (g.marks.size > g.maxBuoys) throw new Error(`net: ${g.marks.size} buoys > ${g.maxBuoys}`);
  if (score(g) !== sol.score) throw new Error(`net: solver says ${sol.score}, evaluate says ${score(g)}`);
  return G.packCells(g, sol.buoys);
}

function solveBuoys(m, sense) {
  const { rows: R, cols: C, start: [sr, sc], maxBuoys, v, rock } = m;
  const card = m.card ?? {};
  const D = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const inB = (r, c) => r >= 0 && c >= 0 && r < R && c < C;
  const free = (r, c) => inB(r, c) && !rock[r][c] && !(r === sr && c === sc);
  const edge = (r, c) => r === 0 || c === 0 || r === R - 1 || c === C - 1;
  const id = (r, c) => `${r}_${c}`;
  const cells = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (free(r, c)) cells.push([r, c]);
  const M = cells.length;
  const obj = [], st = [], bounds = [], bin = [];
  const inflow = new Map(cells.map(([r, c]) => [id(r, c), { x: [], y: [] }]));
  const out = new Map(cells.map(([r, c]) => [id(r, c), { x: [], y: [] }]));

  for (const [r, c] of cells) {
    const i = id(r, c);
    bin.push(`w_${i}`, `x_${i}`, `y_${i}`);
    const val = v[r][c] || (card.empty ?? 0);
    if (val) obj.push(`${val > 0 ? '+' : '-'} ${Math.abs(val)} x_${i}`);
    if (card.release && m.prot[r][c]) obj.push(`+ ${card.release} w_${i}`);
    st.push(`w_${i} + x_${i} + y_${i} <= 1`);
    if (edge(r, c)) {
      st.push(`x_${i} = 0`);
      st.push(`y_${i} + w_${i} = 1`);
      bounds.push(`0 <= gs_${i} <= ${M}`); inflow.get(i).y.push(`gs_${i}`); st.push(`gs_${i} - ${M} y_${i} <= 0`);
    }
    if (Math.abs(r - sr) + Math.abs(c - sc) === 1) {
      st.push(`w_${i} + x_${i} + y_${i} = 1`);
      bounds.push(`0 <= fs_${i} <= ${M}`); inflow.get(i).x.push(`fs_${i}`); st.push(`fs_${i} - ${M} x_${i} <= 0`);
    }
    for (const [dr, dc] of D) {
      const nr = r + dr, nc = c + dc;
      if (!free(nr, nc)) continue;
      const j = id(nr, nc);
      st.push(`x_${i} - x_${j} - w_${j} <= 0`);
      st.push(`y_${i} - y_${j} - w_${j} <= 0`);
      for (const k of ['x', 'y']) {
        const f = `${k === 'x' ? 'f' : 'g'}_${i}_${j}`;
        bounds.push(`0 <= ${f} <= ${M}`);
        st.push(`${f} - ${M} ${k}_${i} <= 0`, `${f} - ${M} ${k}_${j} <= 0`);
        out.get(i)[k].push(f); inflow.get(j)[k].push(f);
      }
    }
  }
  for (const [r, c] of cells) {
    const i = id(r, c);
    for (const k of ['x', 'y']) {
      const terms = [...inflow.get(i)[k].map(f => `+ ${f}`), ...out.get(i)[k].map(f => `- ${f}`)];
      if (terms.length) st.push(`${terms.join(' ')} - ${k}_${i} = 0`);
      else st.push(`${k}_${i} = 0`);
    }
  }
  st.push(cells.map(([r, c]) => `w_${id(r, c)}`).join(' + ') + ` <= ${maxBuoys}`);
  st.push(cells.map(([r, c]) => `x_${id(r, c)}`).join(' + ') + ' >= 1');
  if (card.maxArea) st.push(cells.map(([r, c]) => `x_${id(r, c)}`).join(' + ') + ` <= ${card.maxArea}`);

  const lp = [
    sense === 'max' ? 'Maximize' : 'Minimize',
    ` obj: ${obj.length ? obj.join(' ') : '0 w_' + id(...cells[0])}`,
    'Subject To', ...st.map((s, n) => ` c${n}: ${s}`),
    'Bounds', ...bounds.map(b => ` ${b}`),
    'Binary', ` ${bin.join(' ')}`,
    'End',
  ].join('\n');
  const sol = highs.solve(lp);
  if (sol.Status !== 'Optimal') throw new Error(`HiGHS: ${sol.Status}`);
  const buoys = cells.filter(([r, c]) => sol.Columns[`w_${id(r, c)}`].Primal > 0.5);
  return { score: Math.round(sol.ObjectiveValue), buoys };
}

// Two pens already sealed by rocks on either side of the boat, no buoys: both always count, so best = worst = -8 + 5.
// Dropping either the boat-neighbour rule or the sea flow lets the solver ignore one pen and report [5, -8].
{
  const rock = Array.from({ length: 5 }, () => Array(5).fill(false)), v = Array.from({ length: 5 }, () => Array(5).fill(0));
  for (const [r, c] of [[1, 1], [3, 1], [2, 0], [1, 3], [3, 3], [2, 4]]) rock[r][c] = true;
  v[2][1] = -8; v[2][3] = 5;
  const m = { rows: 5, cols: 5, start: [2, 2], maxBuoys: 0, v, rock };
  const got = [solveBuoys(m, 'max').score, solveBuoys(m, 'min').score];
  if (got[0] !== -3 || got[1] !== -3) throw new Error(`self-check: two pens gave ${got}, expected -3,-3`);
}

function readTable(name) {
  const [rs, re] = between(`// @${name}-start`, `// @${name}-end`);
  return JSON.parse(html.slice(rs, re).match(/=\s*(\{[\s\S]*?\});/)[1]);
}
function writeTable(name, constName, table) {
  const keys = Object.keys(table).sort();
  const body = keys.map(k => `"${k}":${JSON.stringify(table[k])}`).reduce((rows, e) => {
    if (!rows.length || rows[rows.length - 1].length > 90) rows.push(e); else rows[rows.length - 1] += ',' + e;
    return rows;
  }, []).join(',\n  ');
  html = readFileSync(FILE, 'utf8');
  const [ws, we] = between(`// @${name}-start`, `// @${name}-end`);
  html = html.slice(0, ws) + `\nconst ${constName} = {\n  ${body}\n};\n` + html.slice(we);
  writeFileSync(FILE, html);
  console.log(`${constName}: ${keys.length} entries, ${keys[0]} → ${keys[keys.length - 1]}`);
}

// A trio is offered only if its best two cards finish within CLOSE of each other, so no card is an obvious pick.
const CLOSE = 0.10;
if (process.argv[2] === 'cards') {
  const n = Number(process.argv[3] ?? 24), table = {}, keys = Object.keys(G.CARDS);
  const trios = keys.flatMap((a, x) => keys.slice(x + 1).flatMap((b, y) => keys.slice(x + y + 2).map(c => [a, b, c])));
  const netFor = (seed, k) => {
    const net = { ...G.games.rede, card: G.CARDS[k] };
    net.grid = net.gen(net, G.mulberry(G.seedFrom(seed)));
    G.applyCard(net);
    return net;
  };
  for (let i = 0; i < n; i++) {
    const t0 = Date.now(), seed = `carta:${i}`, hi = {};
    for (const k of keys) hi[k] = solveBuoys(G.boardModel(netFor(seed, k)), 'max');
    const rng = G.mulberry(G.seedFrom(`${seed}:trio`)), order = trios.map(t => [rng(), t]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
    const gap = t => { const s = t.map(k => hi[k].score).sort((a, b) => b - a); return (s[0] - s[1]) / Math.max(1, Math.abs(s[0])); };
    const trio = order.find(t => gap(t) <= CLOSE) ?? order.reduce((a, b) => gap(b) < gap(a) ? b : a);
    table[seed] = trio.map(k => {
      const net = netFor(seed, k), lo = solveBuoys(G.boardModel(net), 'min');
      return [k, hi[k].score, lo.score, checkNet(net, hi[k]), checkNet(net, lo)];
    });
    console.log(`${seed.padEnd(9)} ${table[seed].map(([k, b, w]) => `${k} ${b}/${w}`).join('  ').padEnd(58)} gap ${Math.round(100 * gap(trio))}%  ${Date.now() - t0}ms`);
  }
  writeTable('card-ref', 'CARD_REF', table);
  process.exit(0);
}

const table = readTable('net-ref');
const start = new Date(`${from}T12:00:00`);
for (let i = 0; i < days; i++) {
  const date = localDate(new Date(start.getTime() + i * 864e5));
  const t0 = Date.now();
  const net = map('rede', date), m = G.boardModel(net);
  const hi = solveBuoys(m, 'max'), lo = solveBuoys(m, 'min');
  const bestBuoys = checkNet(net, hi), worstBuoys = checkNet(net, lo);
  const line = map('linha', date);
  const l = G.solveLine(G.boardModel(line));
  checkLine(line, l.bestPath, l.best);
  checkLine(line, l.worstPath, l.worst);
  table[date] = [hi.score, lo.score, bestBuoys, worstBuoys];
  console.log(`${date}  net ${hi.score}/${lo.score} (${hi.buoys.length}/${lo.buoys.length} buoys)  line ${l.best}/${l.worst}  ${Date.now() - t0}ms`);
}

writeTable('net-ref', 'NET_REF', table);
