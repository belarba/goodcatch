// Shared by the dev tools: loads the page's game logic (@gen markers, never duplicated here), solves the purse net
// as an integer program with HiGHS, and reads/writes the tables inside index.html.
import { readFileSync, writeFileSync } from 'node:fs';
import highsLoader from 'highs';

const highs = await highsLoader();
const FILE = new URL('../index.html', import.meta.url);

let html = readFileSync(FILE, 'utf8');
const between = (a, b) => {
  const i = html.indexOf(a), j = html.indexOf(b);
  if (i < 0 || j < i) throw new Error(`markers ${a} / ${b} not found`);
  return [i + a.length, j];
};
const [gs, ge] = between('// @gen-start', '// @gen-end');
export const G = new Function(`${html.slice(gs, ge)}; return {games, seedFrom, mulberry, evaluate, scoreOf, solveLine, boardModel, packCells, unpackCells, CARDS, applyCard, overArea, SP, key, leakPath: typeof leakPath === 'function' ? leakPath : null, canBuoy: typeof canBuoy === 'function' ? canBuoy : null, stars: typeof stars === 'function' ? stars : null, clueFor: typeof clueFor === 'function' ? clueFor : null};`)();

export function localDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function map(key, date) {
  const g = { ...G.games[key] };
  g.grid = g.gen(g, G.mulberry(G.seedFrom(`${date}:${key}`)));
  return g;
}
function score(g) {
  const { hits, inside } = G.evaluate(g);
  if (G.overArea(g, inside)) throw new Error(`net: ${inside.size} squares in the pen > ${g.card.maxArea}`);
  return hits ? G.scoreOf(g, hits, inside) : null;
}
export function checkLine(g, path, expected) {
  g.marks = new Set(path.slice(1).map(([r, c]) => r * 100 + c));
  if (score(g) !== expected) throw new Error(`line: solver says ${expected}, the page's lineChain + evaluate say ${score(g)}`);
}
export function checkNet(g, sol) {
  g.marks = new Set(sol.buoys.map(([r, c]) => r * 100 + c));
  if (g.marks.size > g.maxBuoys) throw new Error(`net: ${g.marks.size} buoys > ${g.maxBuoys}`);
  if (score(g) !== sol.score) throw new Error(`net: solver says ${sol.score}, evaluate says ${score(g)}`);
  return G.packCells(g, sol.buoys);
}

export function solveBuoys(m, sense) {
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
    if (m.prot?.[r][c] && !card.release) st.push(`w_${i} = 0`);
    if (m.maxDist != null && Math.max(Math.abs(r - sr), Math.abs(c - sc)) > m.maxDist) st.push(`x_${i} = 0`);
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
    if (Math.max(Math.abs(r - sr), Math.abs(c - sc)) === 1) {
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
// Pen A (5) closes only with a buoy on the turtle at its mouth; pen B (1) closes with a plain buoy. One buoy.
{
  const rock = Array.from({ length: 5 }, () => Array(5).fill(false)), v = Array.from({ length: 5 }, () => Array(5).fill(0));
  const prot = Array.from({ length: 5 }, () => Array(5).fill(false));
  for (const [r, c] of [[1, 1], [3, 1], [1, 3], [3, 3], [1, 2], [3, 2]]) rock[r][c] = true;
  v[2][1] = 5; v[2][3] = 1; v[2][0] = -6; prot[2][0] = true;
  const m = { rows: 5, cols: 5, start: [2, 2], maxBuoys: 1, v, rock, prot };
  const plain = solveBuoys(m, 'max').score, freed = solveBuoys({ ...m, card: { release: 3 } }, 'max').score;
  if (plain !== 1 || freed !== 8) throw new Error(`self-check: protected mouth gave ${plain}/${freed}, expected 1/8`);
}

export function readTable(name) {
  const [rs, re] = between(`// @${name}-start`, `// @${name}-end`);
  return JSON.parse(html.slice(rs, re).match(/=\s*(\{[\s\S]*?\});/)[1]);
}
export function writeTable(name, constName, table) {
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
export const cardRef = () => readTable('card-ref');

export const netFor = (genSeed, k) => {
  const net = { ...G.games.rede, card: G.CARDS[k] };
  net.grid = net.gen(net, G.mulberry(G.seedFrom(genSeed)));
  G.applyCard(net);
  return net;
};
export const realScore = (net, buoys) => {
  net.marks = new Set(buoys.filter(([r, c]) => !net.grid[r][c].rock).map(([r, c]) => G.key(r, c)));
  const e = G.evaluate(net);
  return e.hits && !G.overArea(net, e.inside) ? G.scoreOf(net, e.hits, e.inside) : 0;
};
// Three naive players, each an exact optimum of a simplified game, later scored on the real board.
export const NAIVE = {
  greedy: m => ({ ...m, v: m.v.map((row, r) => row.map((x, c) => m.prot[r][c] ? 0 : x)) }),
  near: m => ({ ...m, maxDist: 3 }),
  noReef: m => ({ ...m, rock: m.rock.map(row => row.map(() => false)) }),
};
