# Encomenda Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `?modo=encomenda`: the daily purse net fished by a cat, with three villager orders that pay a bonus, the best meeting exactly two.

**Architecture:** Orders are data on the map (`g.orders`) scored by `scoreOf` and mirrored in the solver, so the exact best, stars and clue keep working. A new offline table `ORDER_REF` carries each day's generation seed, orders and best. A `MODE` flag switches the page's deal (orders instead of cards), records key, strings (cat voice via a `cat_` prefix in `t`), share line and boat sprite.

**Tech Stack:** static `index.html`, Node dev tools with `highs`.

**Spec:** `docs/superpowers/specs/2026-09-29-encomenda-design.md`

## Global Constraints

- Daily mode (no `?modo`) must render and score exactly as before: no orders, cards dealt.
- Villagers: otter chef → `dourada`, pelican → `sardinha`, raccoon → `lula`, grandma cat → `lagosta`.
- q is 2–4 (lobster 1–2); B = 4 × q (lobster 8 × q). The day's best meets exactly two of three orders.
- Records: `goodcatch:<date>:encomenda`. Share: `🐱 Good Catch #N · <Orders> ▲+42 ★★☆ 🦦✓ 🐦✓ 🦝✗`.
- Phase A rules apply (protected animals refuse buoys). No rule cards in this mode; practice hidden.
- Work in the worktree `../goodcatch-encomenda` (branch `prototype/encomenda` from `design/net-depth`), preview on port 8766.
- Strings in both languages; comments only on critical lines; numbers from commands.

---

### Task 1: Orders in the rules and the solver

**Files:** `index.html` (`@gen`: `genOrders`, `orderStatus`, `scoreOf`, `boardModel`), `tools/net-lib.mjs` (`solveBuoys`, self-check, `G` factory), `tools/depth.mjs` (checks).

**Interfaces:**
- `genOrders(g, rng) → [{sp, q, b}]×3` (needs `g.grid`).
- `orderStatus(g, hits) → [{sp, q, b, have, met}]` (empty array when `!g.orders`).
- `scoreOf` adds `Σ b` of met orders. `boardModel(g).orders = g.orders || []`.

- [ ] **Step 1: Checks (fail first).** In `depth.mjs`:

```js
function checkOrders() {
  if (!G.orderStatus || !G.genOrders) throw new Error('orders missing from @gen');
  const g = { ...G.games.rede, start: [5, 5], marks: new Set(), card: null, orders: [{ sp: 'sardinha', q: 2, b: 8 }, { sp: 'sardinha', q: 3, b: 12 }],
    grid: Array.from({ length: 11 }, () => Array.from({ length: 11 }, () => ({ sp: null, rock: false }))) };
  g.grid[6][5].sp = g.grid[7][5].sp = 'sardinha';
  const st = G.orderStatus(g, [[6, 5], [7, 5]]).map(o => o.met);
  if (JSON.stringify(st) !== '[true,false]') throw new Error(`orders: met ${JSON.stringify(st)}`);
  if (G.scoreOf(g, [[6, 5], [7, 5]], new Set([605, 705])) !== 2 * G.SP.sardinha.p + 8) throw new Error('orders: bonus not in score');
  const a = { ...G.games.rede }; a.grid = a.gen(a, G.mulberry(G.seedFrom('2026-10-01:rede')));
  const o1 = G.genOrders(a, G.mulberry(G.seedFrom('2026-10-01:pedido'))), o2 = G.genOrders(a, G.mulberry(G.seedFrom('2026-10-01:pedido')));
  if (JSON.stringify(o1) !== JSON.stringify(o2) || o1.length !== 3) throw new Error('genOrders must be deterministic and give 3 orders');
}
checkOrders();
```

`net-lib.mjs` self-check (after the protected one): a 5×5 board where pen A (`v=3`, one sardine) only beats pen B (`v=5`, one squid) with an order `{sp:'sardinha',q:1,b:4}`; expect best 7 with the order and 5 without. Cells: rocks `[1,1],[3,1],[1,3],[3,3],[1,2],[3,2]`, boat `[2,2]`, A = `[2,1]` (mouth `[2,0]`), B = `[2,3]` (mouth `[2,4]`), `maxBuoys: 1`, `m.species` a 5×5 grid of species keys with `'sardinha'` at `[2,1]`, `'lula'` at `[2,3]`.

- [ ] **Step 2:** `node tools/depth.mjs check` → fails (`orders missing`).
- [ ] **Step 3: Implement** in `@gen` (after `scoreOf`):

```js
const ORDER_SP={dourada:4,sardinha:4,lula:4,lagosta:8};
function genOrders(g,rng){
  const have={}; for(const row of g.grid) for(const x of row) if(x.sp in ORDER_SP) have[x.sp]=(have[x.sp]||0)+1;
  const pool=Object.keys(ORDER_SP).filter(sp=>have[sp]>=(sp==='lagosta'?1:2));
  const pick=[]; while(pick.length<3&&pool.length) pick.push(pool.splice(Math.floor(rng()*pool.length),1)[0]);
  return pick.map(sp=>{const hi=sp==='lagosta'?Math.min(2,have[sp]):Math.min(4,have[sp]),lo=sp==='lagosta'?1:2,q=lo+Math.floor(rng()*(hi-lo+1));return {sp,q,b:ORDER_SP[sp]*q}});
}
function orderStatus(g,hits){
  if(!g.orders) return [];
  const n={}; for(const [r,c] of hits||[]){const sp=g.grid[r][c].sp;n[sp]=(n[sp]||0)+1}
  return g.orders.map(o=>({...o,have:n[o.sp]||0,met:(n[o.sp]||0)>=o.q}));
}
```

In `scoreOf`, before `return s`: `for(const o of orderStatus(g,hits)) if(o.met) s+=o.b;`. `boardModel`: add `orders:g.orders||[], species:g.grid.map(row=>row.map(x=>x.sp))`. Solver (`solveBuoys`), after the cell loop:

```js
(m.orders ?? []).forEach((o, j) => {
  const cellsOf = cells.filter(([r, c]) => m.species?.[r][c] === o.sp).map(([r, c]) => `x_${id(r, c)}`);
  bin.push(`o_${j}`); obj.push(`+ ${o.b} o_${j}`);
  st.push(cellsOf.length ? `${o.q} o_${j} - ${cellsOf.join(' - ')} <= 0` : `o_${j} = 0`);
});
```

plus the forcing line `st.push(cellsOf.length ? \`${cellsOf.join(' + ')} - ${o.q} o_${j} <= ${o.q - 1}\` : ...)` so `o_j = 1` exactly when the count reaches q; without it the worst-catch solve would simply decline the bonus. Export `genOrders`, `orderStatus` in `G`.
- [ ] **Step 4:** checks pass. Add a min-sense self-check: the same board with `[2,3]` also a rock (pen A is the only pen), order `{sp:'sardinha',q:1,b:4}`: worst must be 7 (3 + 4). Mutation: drop the forcing line → worst comes out 3 and the check fails; revert.
- [ ] **Step 5: Commit** "Let villagers' orders pay a bonus, in the page and the solver".

### Task 2: `ORDER_REF` and curation

**Files:** `tools/solve-net.mjs` (`orders` mode), `index.html` (`// @order-ref-start` … `// @order-ref-end` markers, empty table first).

- [ ] **Step 1:** Add the markers with `const ORDER_REF = {};` after the card table.
- [ ] **Step 2: `orders` mode.** For each date: for map variant `v` in 0..4 and order roll `k` in 0..9: `gen = v ? key:v : key` (key `<date>:rede`), `orders = genOrders(net, rng(<date>:pedido:<k>))`; solve max with orders; accept when exactly two orders are met by the best; row `{s?, o: orders, b: best, w: worst, bb: pack(bestBuoys), wb: pack(worstBuoys)}`; check both optima with `checkNet` (`scoreOf` includes bonuses). Log `v`, `k`, met count; fallback: the candidate whose best meets two if any else one, logged `NOT-TWO`.
- [ ] **Step 3:** run 3 days into the repo table, inspect rows; then the full 60 days in parallel scratch copies merged by key (same approach as phase A's `merge2.mjs`, table `order-ref`).
- [ ] **Step 4: Commit** "Solve each day's orders and keep days whose best meets two".

### Task 3: The mode on the page

**Files:** `index.html` (MODE flag, `newMap`, `setup` storeKey, `dailyReference`, `render` order row, `renderResult`, `shareText`, help, init).

- [ ] **Step 1:** `const MODE=new URLSearchParams(location.search).get('modo')==='encomenda'?'encomenda':null;` next to `NET_ONLY`. Store key `goodcatch:${DATE}:${MODE||g.key}` for the net. Init: hide `#train-btn` when `MODE`.
- [ ] **Step 2: Deal.** In `newMap`, when `MODE&&g.buoy`: `const row=ORDER_REF[DATE]; g.genSeed=row?.s??seed; g.cards=null; g.orders=row?.o??null;` and if no row, `g.orders=genOrders(g,mulberry(seedFrom(DATE+':pedido')))` after generating the grid. `dailyReference` in MODE: from `ORDER_REF[DATE]` (`best:row.b, worst:row.w, bestBuoys:unpackCells(g,row.bb), worstBuoys:unpackCells(g,row.wb), exact:true`).
- [ ] **Step 3: Order row.** Reuse the `g.el.card` container: when `g.orders`, render tiles `<div class="order${met?' met':''}">${sprite(VILLAGER[o.sp])}${sprite(o.sp)}<b>${have}/${o.q}</b><span>+${o.b}</span></div>` from `orderStatus(g,hits)` every render; CSS `.orders` grid like `.cards`, `.order.met` border `var(--good)` + ✓ badge. `VILLAGER={dourada:'lontra',sardinha:'pelicano',lula:'guaxinim',lagosta:'vovo'}`.
- [ ] **Step 4: Result + share.** Panel chips for met orders (`villager sprite +B`). Share in MODE: `🐱 Good Catch #${DAYNUM} · ${t('mode_orders')} ▲${fmt(best)} ${stars} ${orders.map(o=>ICON[o.sp]+(met?'✓':'✗')).join(' ')}`, ICON `{dourada:'🦦',sardinha:'🐦',lula:'🦝',lagosta:'👵'}`; `met` from the recorded best haul: store `rec.met` (array of booleans) on a counted haul.
- [ ] **Step 5:** Browser: `?modo=encomenda` shows three tiles, ticks live while fencing, bonus in score and share, records under the new key; `/` without the param still deals cards and no tiles. Mutations: remove the tile render → no tiles; remove the `scoreOf` bonus → share/score lose it (and `depth.mjs check` fails).
- [ ] **Step 6: Commit** "Play the orders at ?modo=encomenda".

### Task 4: The cat and the villagers

**Files:** `index.html` (`SPRITES`, `FRAME2`, `t`, STR `cat_*`, `render` boat sprite).

- [ ] **Step 1: Sprites** (PAL letters; outline is automatic):

```js
boatcat:["......rr....","......mrr...","......ww....","o...o.www...","ooooo.wwww..","oeoeo.wwwww.","ooOoo.wwwwww",".ooo..m.....","nnnnnnnnnnnn","nNNNNNNNNNNn",".nnnnnnnnnn.","............"],
lontra:["...wwwwww...","..wwwwwwww..","..wwwwwwww..","...wwwwww...","..mmmmmmmm..",".mmlmmmmlmm.",".mmemmmmemm.",".mmmllllmmm.","..mmleelmm..","..mmmllmmm..","...mmmmmm...","............"],
pelicano:["............","....wwww....","...wwwwww...","...wwewwww..","...wwwwwyyy.","....wwwyyyYY","....wwwYyyyY","...wwwwwYYY.","..wwwwwww...","..wwwwwww...","...wwwww....","............"],
guaxinim:[".q........q.",".qq......qq.","..qqqqqqqq..",".qqqqqqqqqq.",".zzzqqqqzzz.",".zezqqqqzez.",".zzzqqqqzzz.","..qqqxxqqq..","..qqxeexqq..","...qxxxxq...","....qqqq....","............"],
vovo:[".x........x.",".xx......xx.",".xxxxxxxxxx.","xxxxxxxxxxxx","xjjjxxxxjjjx","xjejjjjjjejx","xjjjxxxxjjjx","xxxxxkkxxxxx",".xxxxxxxxxx.",".pppppppppp.","pppppppppppp","............"],
```

`FRAME2.boatcat=m=>shift(m,[0,11],[0,11],1,0)`; the villagers are static portraits (a deliberate departure from the spec's "second frame": a bobbing face reads as noise in a row of three). In `render`, the boat cell uses `sprite(MODE?'boatcat':'boat')`.
- [ ] **Step 2: Cat voice.** `t` becomes `k=>(MODE&&STR[LANG]['cat_'+k])??STR[LANG][k]??STR.en[k]??k`. Add `cat_` keys (en/pt) for `hint_rede_start`, `hint_rede_go`, `hint_rede_ready`, `hint_rede_far`, `block_protected_rede`, `v1`…`v6`, plus `mode_orders`, `help_intro_orders` (help body in MODE uses it instead of the cards paragraph).
- [ ] **Step 3:** Screenshots at 375 px and desktop of the board (cat on the boat), the order row and a result; adjust sprite pixels until each reads at 24–40 px next to the fish.
- [ ] **Step 4: Commit** "Put a cat on the boat and faces on the orders".

### Task 5: Finish

- [ ] Checks, a browser pass in both modes with no console errors, CLAUDE.md (mode, `ORDER_REF`, orders), and ask the owner before merging (the prototype ships hidden behind `?modo`).
