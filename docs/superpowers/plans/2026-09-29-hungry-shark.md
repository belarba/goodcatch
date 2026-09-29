# Hungry Shark Tide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On Saturdays and Sundays, Encomenda carries the Hungry shark tide: a shark in the pen zeroes its sardines, turtles and dolphins.

**Architecture:** The tide is a card object (`CARDS.faminto = {hungry:true}`) set as `g.card` on weekend days, so `scoreOf`, `canBuoy`, `boardModel` and the solver pick it up through the existing card path. One helper decides which hits still score; the solver mirrors it with a binary `z` and per-cell `s_i`.

**Tech Stack:** static `index.html`, Node dev tools with `highs`.

**Spec:** `docs/superpowers/specs/2026-09-29-crazy-tides-design.md` (this plan ships only the Hungry shark part; Drunk captain and Inverted tide follow later, and until then both weekend days carry the shark).

## Global Constraints

- Hungry shark: with ≥ 1 shark among the pen's hits, sardines, turtles and dolphins in the pen score 0 and do not count toward orders; the shark keeps −4.
- Weekdays unchanged: calm sea, no tide.
- `?dia=YYYY-MM-DD` overrides the date only when `location.hostname` is `localhost` or `127.0.0.1`.
- Strings in both languages; comments only on critical lines; numbers from commands.

---

### Task 1: Rule, scoring and solver

**Files:** `index.html` (`@gen`: `CARDS.faminto`, `crazyTide`, `FLEE`, `eaten`, `scoreOf`, `orderStatus`, `clueFor`), `tools/net-lib.mjs` (solver + self-checks, `G` exports), `tools/depth.mjs` (checks).

- [ ] **Step 1: Checks (fail first)** in `depth.mjs`:

```js
function checkShark() {
  if (!G.crazyTide || !G.CARDS.faminto) throw new Error('Hungry shark missing from @gen');
  if (G.crazyTide('2026-10-03') !== 'faminto' || G.crazyTide('2026-10-04') !== 'faminto' || G.crazyTide('2026-10-05') !== null)
    throw new Error('crazyTide: weekends carry the shark, weekdays nothing');
  const g = { ...G.games.rede, start: [5, 5], marks: new Set(), card: G.CARDS.faminto, orders: [{ sp: 'sardinha', q: 1, b: 4 }],
    grid: Array.from({ length: 11 }, () => Array.from({ length: 11 }, () => ({ sp: null, rock: false }))) };
  g.grid[6][5].sp = 'sardinha'; g.grid[6][6].sp = 'tartaruga'; g.grid[7][5].sp = 'tubarao';
  const withShark = G.scoreOf(g, [[6, 5], [6, 6], [7, 5]], new Set([605, 606, 705]));
  if (withShark !== G.SP.tubarao.p) throw new Error(`shark in: expected only the shark's ${G.SP.tubarao.p}, got ${withShark}`);
  const without = G.scoreOf(g, [[6, 5], [6, 6]], new Set([605, 606]));
  if (without !== G.SP.sardinha.p + G.SP.tartaruga.p + 4) throw new Error(`no shark: expected sardine + turtle + order, got ${without}`);
}
checkShark();
```

In `net-lib.mjs`, two forced-pen self-checks (5×5, boat `[2,2]`, every cell a rock except the boat and the pen `[1,1],[2,1]`, `maxBuoys: 0`, `card: {hungry: true}`, `species` grid): (a) turtle at `[1,1]` (v −6, prot) and shark at `[2,1]` (v −4, prot): max = min = −4; (b) sardine at `[1,1]` (v 1), no shark: min = 1.

- [ ] **Step 2:** `node tools/depth.mjs check` → fails.
- [ ] **Step 3: Implement** in `@gen`:

```js
// in CARDS: faminto:{hungry:true},
const crazyTide=date=>{const d=new Date(date+'T12:00:00').getDay();return d===0||d===6?'faminto':null};
const FLEE=new Set(['sardinha','tartaruga','golfinho']);
// With a shark in the pen, these hits no longer score nor fill orders.
const eaten=(g,hits)=>g.card?.hungry&&(hits||[]).some(([r,c])=>g.grid[r][c].sp==='tubarao')?new Set((hits||[]).filter(([r,c])=>FLEE.has(g.grid[r][c].sp)).map(([r,c])=>key(r,c))):new Set();
```

`scoreOf`: `const gone=eaten(g,hits); let s=hits.reduce((s,[r,c])=>s+(gone.has(key(r,c))?0:pts(g,g.grid[r][c].sp)),0);`. `orderStatus`: skip hits in `eaten(g,hits)` when counting. `clueFor`: count species from hits minus `eaten` for both pens.

Solver (after the order block, before the buoy budget):

```js
if (card.hungry) {
  const sharks = cells.filter(([r, c]) => m.species?.[r][c] === 'tubarao').map(([r, c]) => `x_${id(r, c)}`);
  const flee = cells.filter(([r, c]) => ['sardinha', 'tartaruga', 'golfinho'].includes(m.species?.[r][c]));
  if (sharks.length && flee.length) {
    bin.push('z'); sharks.forEach(x => st.push(`z - ${x} >= 0`)); st.push(`z - ${sharks.join(' - ')} <= 0`);
    for (const [r, c] of flee) {
      const i = id(r, c); bin.push(`s_${i}`);
      st.push(`s_${i} - x_${i} <= 0`, `s_${i} + z <= 1`, `s_${i} - x_${i} + z >= 0`);
    }
  }
}
```

and the objective and the order counts use `s_i` instead of `x_i` for those cells (build a `score(i)` name map before writing `obj` and the order constraints).

- [ ] **Step 4:** checks pass; mutations: drop `s_i - x_i + z >= 0` → self-check (b) fails; make `eaten` always empty → the Node check fails.
- [ ] **Step 5: Commit** "Let a shark in the pen eat the sardines and scare the protected".

### Task 2: Weekend tide in Encomenda and the table

**Files:** `index.html` (`newMap`, render banner, share, `?dia=`), `tools/solve-net.mjs` (orders mode).

- [ ] **Step 1:** `newMap` (MODE): `g.card=CARDS[row?.k??crazyTide(DATE)]||null` after the grid is generated (the tide does not change generation). Banner: when `MODE&&g.card?.hungry`, the order row gets a full-width first tile `<div class="tide">${sprite('tubarao')}<b>${t('tide_faminto')}</b><span>${t('tiderule_faminto')}</span></div>` (`grid-column:1/-1`). Share adds ` 🦈` after `Orders` when the tide is on. Strings: `tide_faminto` "Hungry shark" / "Tubarão faminto", `tiderule_faminto` "A shark in the net eats the sardines and scares the turtles and dolphins away." / "Tubarão no cerco come as sardinhas e espanta tartarugas e golfinhos.".
- [ ] **Step 2:** `?dia=`: `const DAY_PARAM=/^(localhost|127\.0\.0\.1)$/.test(location.hostname)&&new URLSearchParams(location.search).get('dia');` and `DATE = DAY_PARAM||<today>`.
- [ ] **Step 3:** `solve-net orders`: `net.card = G.CARDS[G.crazyTide(date)] ?? null` before solving; row gains `k` when set. Regenerate all 60 days in parallel scratch copies; weekday rows must come out byte-identical (checked by diffing the merged table's weekday rows against the current ones); every row meets exactly two orders.
- [ ] **Step 4: Browser** with `?dia=` on a Saturday: banner shows, a pen with a shark and sardines scores and ticks orders without the sardines, share shows 🦈; a weekday shows no banner. Mutation: remove the banner → absent.
- [ ] **Step 5:** docs (CLAUDE.md tide line), commit "Put the Hungry shark on weekends".
