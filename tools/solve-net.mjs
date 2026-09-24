// Computes each day's exact best/worst purse-net score and writes them into
// index.html between the @net-ref markers. The exact search took 3–39 s per map
// in Node on a laptop (2026-09 spike), too slow for page load, so the page ships the table.
//
//   node tools/solve-net.mjs [days=60] [from=today]
//
// Game logic is read from index.html (@gen markers), never duplicated here.
import { readFileSync, writeFileSync } from 'node:fs';

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
const G = new Function(`${html.slice(gs, ge)}; return {games, seedFrom, mulberry, evaluate, scoreOf, solveLine, solveNet, boardModel};`)();

function localDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function map(key, date) {
  const g = { ...G.games[key] };
  g.grid = g.gen(g, G.mulberry(G.seedFrom(`${date}:${key}`)));
  return g;
}
function check(g, path, expected) {
  g.path = path; g.closed = g.kind === 'net';
  const got = G.scoreOf(g, G.evaluate(g).hits);
  if (got !== expected) throw new Error(`${g.key}: solver says ${expected}, evaluate says ${got}`);
}

const [rs, re] = between('// @net-ref-start', '// @net-ref-end');
const table = JSON.parse(html.slice(rs, re).match(/NET_REF\s*=\s*(\{[\s\S]*?\});/)[1]);

const start = new Date(`${from}T12:00:00`);
for (let i = 0; i < days; i++) {
  const date = localDate(new Date(start.getTime() + i * 864e5));
  const t0 = Date.now();
  const net = map('rede', date);
  const r = G.solveNet(G.boardModel(net), Infinity);
  if (!r.complete) throw new Error(`${date}: net search did not complete`);
  check(net, r.bestPath, r.best);
  check(net, r.worstPath, r.worst);
  const line = map('linha', date);
  const l = G.solveLine(G.boardModel(line));
  check(line, l.bestPath, l.best);
  check(line, l.worstPath, l.worst);
  table[date] = [r.best, r.worst];
  console.log(`${date}  net ${r.best}/${r.worst}  line ${l.best}/${l.worst}  ${Date.now() - t0}ms`);
}

const keys = Object.keys(table).sort();
const body = keys.map(k => `"${k}":[${table[k]}]`).reduce((rows, e) => {
  if (!rows.length || rows[rows.length - 1].length > 90) rows.push(e); else rows[rows.length - 1] += ',' + e;
  return rows;
}, []).join(',\n  ');
html = readFileSync(FILE, 'utf8');
const [ws, we] = between('// @net-ref-start', '// @net-ref-end');
html = html.slice(0, ws) + `\nconst NET_REF = {\n  ${body}\n};\n` + html.slice(we);
writeFileSync(FILE, html);
console.log(`NET_REF: ${keys.length} days, ${keys[0]} → ${keys[keys.length - 1]}`);
