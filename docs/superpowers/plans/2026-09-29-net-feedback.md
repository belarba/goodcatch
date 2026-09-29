# Purse Net Feedback + Depth Meter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the open purse net explain itself (leak current, buoy deltas, animated haul) and measure how deep each map is.

**Architecture:** Pure logic (`leakPath`) goes in the `@gen` block of `index.html` so Node can test it; DOM work (render, deltas, haul animation) goes next to `render`/`dropAnimate`. The dev tools share one module, `tools/net-lib.mjs`, so `depth.mjs` reuses the HiGHS model instead of copying it.

**Tech Stack:** one static `index.html` (inline CSS/JS, no build), Node ≥ 20 dev tools with `highs` (already in `tools/package.json`).

**Spec:** `docs/superpowers/specs/2026-09-29-net-feedback-design.md`

## Global Constraints

- No rule change, no generation change, no `CARD_REF` regeneration.
- `@gen` stays DOM-free; `tools/solve-net.mjs` must keep producing byte-identical `CARD_REF` rows.
- Board marks meet 3:1 on the water: use `#10324A` (navy-ink) for the current and the gap, never `buoy-orange` / `signal-red` for them.
- `prefers-reduced-motion`: current drawn static, haul goes straight to the panel.
- Every UI string in both `STR.en` and `STR.pt`.
- Comments only on critical lines (owner's rule); no `Co-Authored-By` trailer.
- Verify at ~400 px and desktop in the browser pane (`preview_start {name:"static"}`), with a mutation per feature.

---

### Task 1: Shared tool module

**Files:**
- Create: `tools/net-lib.mjs`
- Modify: `tools/solve-net.mjs` (everything from `import` through `writeTable` moves to the lib)

**Interfaces:**
- Produces (exports of `tools/net-lib.mjs`): `G` (the `@gen` exports, now also `key`, `leakPath` once Task 2 adds it — listed defensively with `typeof`), `localDate(d)`, `map(key, date)`, `checkNet(g, sol)`, `checkLine(g, path, expected)`, `solveBuoys(m, sense)`, `readTable(name)`, `writeTable(name, constName, table)`.
- `solveBuoys` gains an optional `m.maxDist`: cells farther than `maxDist` (Chebyshev) from the boat get `x = 0`.

- [ ] **Step 1:** Move the loader, helpers, `solveBuoys`, the two-pen self-check, `readTable`, `writeTable` into `tools/net-lib.mjs` and `export` them. The `G` factory returns `{games, seedFrom, mulberry, evaluate, scoreOf, solveLine, boardModel, packCells, unpackCells, CARDS, applyCard, overArea, SP, key, leakPath: typeof leakPath === 'function' ? leakPath : null}`.
- [ ] **Step 2:** In `solveBuoys`, after the per-cell loop header, add:

```js
if (m.maxDist != null && Math.max(Math.abs(r - sr), Math.abs(c - sc)) > m.maxDist) st.push(`x_${i} = 0`);
```

- [ ] **Step 3:** `tools/solve-net.mjs` imports what it uses from `./net-lib.mjs`; keeps `days`, `from`, `CLOSE`, `boonUsed`, `deal`, and the two modes.
- [ ] **Step 4: Verify byte-identical output**

Run: `node tools/solve-net.mjs 1 2026-09-29 && git diff --quiet index.html && echo same`
Expected: the `2026-09-29:rede` log line, then `same`.

- [ ] **Step 5: Commit** `git commit -m "Share the net solver between dev tools"` (files: both tool files).

### Task 2: `leakPath` (TDD in Node)

**Files:**
- Create: `tools/depth.mjs` (only the `check` mode in this task)
- Modify: `index.html` (`@gen` block, after `evaluateBuoys`)

**Interfaces:**
- Produces: `leakPath(g) → null | {path: number[] /* cell keys, sea → boat */, gap: number|null}`.

- [ ] **Step 1: Write the failing check** in `tools/depth.mjs`:

```js
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
  g.marks.add(G.key(3, 5));
  if (G.leakPath(g) !== null) throw new Error('closed pen: expected null');
  g.marks.delete(G.key(3, 5)); g.marks.delete(G.key(7, 5));
  const two = G.leakPath(g);
  if (!two || two.gap !== null || !two.path.length) throw new Error(`two holes: expected path and no gap, got ${JSON.stringify(two)}`);
}
checkLeak();
if (process.argv[2] === 'check') { console.log('depth self-checks ok'); process.exit(0); }
```

- [ ] **Step 2:** Run `node tools/depth.mjs check`. Expected: `Error: leakPath missing from @gen`.
- [ ] **Step 3: Implement** in `@gen`, right after `evaluateBuoys`:

```js
// While the pen is open: the shortest way the open sea reaches the boat, and the first square on it one buoy would close.
function leakPath(g){
  if(!g.buoy||!g.marks.size) return null;
  const e=evaluateBuoys(g); if(e.hits) return null;
  const [sr,sc]=g.start, rc=k=>[Math.floor(k/100),k%100];
  const edge=([r,c])=>r===0||c===0||r===g.rows-1||c===g.cols-1, near=([r,c])=>Math.max(Math.abs(r-sr),Math.abs(c-sc))===1;
  const prev=new Map(), q=[];
  for(const k of e.out) if(edge(rc(k))){prev.set(k,null);q.push(k)}
  let end=null;
  for(let i=0;i<q.length;i++){
    const k=q[i],[r,c]=rc(k); if(near([r,c])){end=k;break}
    for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){const n=key(r+dr,c+dc);if(e.out.has(n)&&!prev.has(n)){prev.set(n,k);q.push(n)}}
  }
  if(end===null) return null;
  const path=[]; for(let k=end;k!==null;k=prev.get(k)) path.unshift(k);
  const gap=path.find(k=>{g.marks.add(k);const shut=!!evaluateBuoys(g).hits;g.marks.delete(k);return shut})??null;
  return {path,gap};
}
```

- [ ] **Step 4:** Run `node tools/depth.mjs check`. Expected: `depth self-checks ok`.
- [ ] **Step 5: Mutation:** change `near(...)===1` to `===2`, rerun, expect a thrown check; revert.
- [ ] **Step 6:** `node tools/solve-net.mjs 1 2026-09-29 && git diff --stat` shows only the `@gen` addition (no table change).
- [ ] **Step 7: Commit** `"Find where the open sea leaks into the purse net"`.

### Task 3: B1 render the current

**Files:** Modify `index.html`: CSS (next to `.ov .rope`, line ~64, and the reduced-motion rule at ~142), `render(g)` buoy branch.

- [ ] **Step 1: CSS**

```css
.ov .leak{animation:flow .7s linear infinite}
@keyframes flow{to{stroke-dashoffset:-12}}
```
and add `.ov .leak` to the reduced-motion `animation:none!important` list.

- [ ] **Step 2: Render.** In `render(g)`, inside `if(g.buoy){ … }`, in the `else` branch (pen not closed), after the faint buoy lines:

```js
const lk=leakPath(g);
if(lk){
  const pts=[...lk.path.map(k=>`${k%100+.5},${Math.floor(k/100)+.5}`),`${g.start[1]+.5},${g.start[0]+.5}`].join(' ');
  svg+=`<polyline class="leak" points="${pts}" fill="none" stroke="#10324A" stroke-width="3" stroke-dasharray="7 5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;
  if(lk.gap!==null) svg+=`<rect class="gap" x="${lk.gap%100+.08}" y="${Math.floor(lk.gap/100)+.08}" width=".84" height=".84" fill="none" stroke="#10324A" stroke-width="3" vector-effect="non-scaling-stroke"/>`;
}
```

- [ ] **Step 3: Browser check** (cache-bust `/?v=<ts>`): pick a card, place buoys around the boat leaving one hole → `.ov .leak` exists and `.ov .gap` sits on the hole; fill the hole → both gone and `.c.in` cells appear; 0 buoys → no `.leak`. Screenshot at 375 px and desktop.
- [ ] **Step 4: Mutation:** make `leakPath` return `null` at the top → no `.leak` in the same flow; revert.
- [ ] **Step 5: Docs:** CLAUDE.md code map line for `leakPath`. **Commit** `"Show the current that leaks into an open net"`.

### Task 4: B2 buoy delta and counter pulse

**Files:** Modify `index.html`: CSS (`.mark.cost`, `.meta .pv`), board pointer handlers in `setup`, `render`.

- [ ] **Step 1: CSS**

```css
.mark.cost.up{color:var(--good)}
.meta .pv b{display:inline-block}
.meta .pv.bump b{animation:bump .3s ease-out}
@keyframes bump{50%{transform:scale(1.3)}}
```

- [ ] **Step 2: Score helper** (outside `@gen`, next to `ready`):

```js
const scoreNow=g=>{const e=evaluate(g);return e.hits?scoreOf(g,e.hits,e.inside):null};
```

- [ ] **Step 3: Stroke tracking.** In the net `pointerdown` (after `drawing=true`): `g.strokeFrom=scoreNow(g);`. Replace `const stop=()=>{drawing=false};` with:

```js
const stop=()=>{
  if(drawing&&g.buoy&&g.strokeFrom!==undefined){
    const to=scoreNow(g), [r,c]=[Math.floor(g.painted/100),g.painted%100];
    if(to!==null&&g.strokeFrom===null) spawn(g,...g.start,'cost '+(to>=0?'up':''),fmt(to));
    else if(to!==null&&to!==g.strokeFrom){const d=to-g.strokeFrom;spawn(g,r,c,'cost '+(d>0?'up':''),fmt(d))}
    g.strokeFrom=undefined;
  }
  drawing=false;
};
```

- [ ] **Step 4: Pulse.** In `render(g)`, after setting `g.el.pv.className`: 

```js
if(g.buoy&&now!==g.pvShown){if(g.pvShown!==undefined&&hits){g.el.pv.classList.remove('bump');void g.el.pv.offsetWidth;g.el.pv.classList.add('bump')}g.pvShown=now}
```

- [ ] **Step 5: Browser check:** close a pen → a `.mark.cost.up` with the total appears on the boat; add a buoy that drops a fish → `.mark.cost` with `−N` on that cell; pulse class toggles on `.pv`.
- [ ] **Step 6: Mutation:** remove the `spawn` calls from `stop` → no `.mark.cost` after the same strokes; revert.
- [ ] **Step 7: Commit** `"Show what each buoy changed"`.

### Task 5: B3 animated haul

**Files:** Modify `index.html`: CSS, `renderResult` (hide while hauling), `g.el.go` click handler, new `haulAnimate(g)` after `dropAnimate`, net `pointerdown` guard.

**Interfaces:**
- Consumes: `evaluate`, `pts`, `SP`, `spawn`, `fmt`, `commit`.
- Produces: `haulAnimate(g)`; flag `g.hauling` (panel hidden while true); `g.busy` blocks board input.

- [ ] **Step 1: CSS**

```css
.board.haul .ov .rope{transition:opacity .35s;opacity:0}
.board.haul .c.in{transition:background-color .35s;background-color:transparent}
```

- [ ] **Step 2:** `renderResult`: `g.el.result.hidden=!L||g.hauling;` and early-return when `g.hauling` after that line. Net `pointerdown`: `if(g.busy) return;` as its first line after `cellAt`.
- [ ] **Step 3: Handler:** `g.el.go.addEventListener('click',()=>g.buoy?haulAnimate(g):commit(g));`
- [ ] **Step 4: `haulAnimate`**

```js
function haulAnimate(g){
  if(!ready(g)) return;
  const {hits,inside}=evaluate(g);
  if(matchMedia('(prefers-reduced-motion: reduce)').matches) return commit(g);
  // commit first: the record is final before anything moves, so skipping the animation can never change it.
  g.hauling=true; g.busy=true; commit(g);
  const b=g.board, cw=b.clientWidth/g.cols, ch=b.clientHeight/g.rows, [br,bc]=g.start, cell=(r,c)=>b.children[r*g.cols+c];
  const steps=hits.map(([r,c])=>({r,c,p:pts(g,g.grid[r][c].sp)})).sort((a,x)=>Math.max(Math.abs(a.r-br),Math.abs(a.c-bc))-Math.max(Math.abs(x.r-br),Math.abs(x.c-bc)));
  const freed=g.card?.release?[...g.marks].map(k=>[Math.floor(k/100),k%100]).filter(([r,c])=>g.grid[r][c].sp&&SP[g.grid[r][c].sp].p<0):[];
  const extra=g.last.extra-freed.length*(g.card?.release??0);
  const n=steps.length+freed.length+(extra?1:0), step=Math.min(100,1000/Math.max(1,n)), timers=[];
  let total=0; const shown=g.el.pv.querySelector('b'); if(shown) shown.textContent=fmt(0);
  const add=v=>{total+=v;if(shown){shown.textContent=fmt(total);shown.className=cls(total)}};
  const done=()=>{if(!g.hauling)return;timers.forEach(clearTimeout);document.removeEventListener('pointerdown',done,true);b.classList.remove('haul');g.hauling=false;g.busy=false;render(g)};
  b.classList.add('haul');
  steps.forEach(({r,c,p},i)=>timers.push(setTimeout(()=>{
    const sp=cell(r,c)?.querySelector('.sp');
    if(sp){sp.style.transition='transform .3s ease-in, opacity .3s';sp.style.transform=`translate(${(bc-c)*cw}px,${(br-r)*ch}px)`;sp.style.opacity='0'}
    if(p<0) cell(r,c)?.classList.add('hit','bad');
    spawn(g,r,c,'cost '+(p>0?'up':''),fmt(p)); add(p);
  },250+i*step)));
  freed.forEach(([r,c],i)=>timers.push(setTimeout(()=>{
    const sp=cell(r,c)?.querySelector('.sp'), dr=r<g.rows/2?-r-1:g.rows-r, dc=c<g.cols/2?-c-1:g.cols-c, far=Math.abs(dr)<Math.abs(dc);
    if(sp){sp.style.transition='transform .4s ease-in, opacity .4s';sp.style.transform=far?`translateY(${dr*ch}px)`:`translateX(${dc*cw}px)`;sp.style.opacity='0'}
    spawn(g,r,c,'cost up',fmt(g.card.release)); add(g.card.release);
  },250+(steps.length+i)*step)));
  if(extra) timers.push(setTimeout(()=>{spawn(g,br,bc,'cost '+(extra>0?'up':''),fmt(extra));add(extra)},250+(n-1)*step));
  timers.push(setTimeout(done,250+n*step+250));
  document.addEventListener('pointerdown',done,true);
}
```

- [ ] **Step 5: Browser check:** haul a pen with ≥ 3 animals: during the animation the panel is hidden and `.pv b` counts up; at the end it equals the panel's big number and `rec.best` in localStorage. Tap mid-animation → panel appears at once with the same number. Protected caught → `.c.hit.bad` during the animation.
- [ ] **Step 6: Mutation:** make `haulAnimate` call `commit(g)` only at `done` instead of first → a mid-animation reload loses the record (localStorage `tries` unchanged); revert to commit-first and confirm the record is stored before the animation ends.
- [ ] **Step 7: Docs:** CLAUDE.md mentions `haulAnimate` next to `dropAnimate`. **Commit** `"Haul the catch into the boat before the result"`.

### Task 6: B4 depth meter

**Files:** Modify `tools/depth.mjs`; docs in CLAUDE.md (code map) and README (tools).

- [ ] **Step 1: Naive players** (after the checks):

```js
import { G, solveBuoys, cardRef } from './net-lib.mjs';
const REF = cardRef();
const netFor = (seed, k) => { const net = { ...G.games.rede, card: G.CARDS[k] }; net.grid = net.gen(net, G.mulberry(G.seedFrom(seed))); G.applyCard(net); return net; };
const realScore = (net, buoys) => { net.marks = new Set(buoys.filter(([r, c]) => !net.grid[r][c].rock).map(([r, c]) => G.key(r, c))); const e = G.evaluate(net); return e.hits ? G.scoreOf(net, e.hits, e.inside) : 0; };
const NAIVE = {
  greedy: m => ({ ...m, v: m.v.map((row, r) => row.map((x, c) => m.prot[r][c] ? 0 : x)) }),
  near: m => ({ ...m, maxDist: 3 }),
  noReef: m => ({ ...m, rock: m.rock.map(row => row.map(() => false)) }),
};
```

`net-lib.mjs` also exports `cardRef()`, which returns `readTable('card-ref')`.

- [ ] **Step 2: Loop and report** (args: `[prefix=''] [limit=Infinity]` to select keys, so ranges can run in parallel):

```js
const [prefix = '', limit = Infinity] = process.argv.slice(2);
const rows = [];
for (const seed of Object.keys(REF).filter(k => k.startsWith(prefix)).slice(0, Number(limit))) {
  for (const [k, best] of REF[seed]) {
    const net = netFor(seed, k), m = G.boardModel(net), row = { seed, k, best };
    for (const [name, f] of Object.entries(NAIVE)) row[name] = realScore(netFor(seed, k), solveBuoys(f(m), 'max').buoys);
    rows.push(row);
    const pct = x => best > 0 ? Math.round(100 * x / best) + '%' : '—';
    console.log(`${seed.padEnd(16)} ${k.padEnd(9)} best ${String(best).padStart(3)}  greedy ${pct(row.greedy).padStart(4)}  near ${pct(row.near).padStart(4)}  noReef ${pct(row.noReef).padStart(4)}`);
  }
}
const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const ratio = n => rows.filter(r => r.best > 0).map(r => r[n] / r.best);
for (const n of Object.keys(NAIVE)) console.log(`${n}: median ${Math.round(100 * med(ratio(n)))}% of best`);
const trivial = rows.filter(r => r.best > 0 && Object.keys(NAIVE).some(n => r[n] / r.best >= 0.9));
console.log(`${trivial.length} of ${rows.length} map/card pairs have a naive player at ≥ 90% (trivial)`);
```

- [ ] **Step 3: Smoke:** `node tools/depth.mjs carta:0 1` prints 3 lines (one per card) + summary. Sanity: every naive % ≤ 100 (the naive score can't beat the optimum); if one does, the realScore path is wrong.
- [ ] **Step 4: Full run** in parallel ranges by prefix (`2026-09`, `2026-10`, `2026-11`, `carta:`), save logs to the scratchpad; report medians and the trivial count in the final summary (numbers from the logs, not memory).
- [ ] **Step 5: Docs + commit** `"Measure how far naive players land from each map's best"`.

### Task 7: Finish

- [ ] `node tools/depth.mjs check`, `node tools/solve-net.mjs 1 2026-09-29 && git diff --quiet index.html` (after committing), browser pass with no console errors at 375 px and desktop.
- [ ] Ask the owner before merging to `main` (push = deploy).
