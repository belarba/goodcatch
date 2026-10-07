# Pista hook-set and weekly banquet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a one-tap tension-bar hook-set that sizes the caught fish, a Mon→Sun banquet table with villagers, a Sunday banquet scene, and village comparisons (size, week, streak) through the existing API.

**Architecture:** The score stays pure deduction (`@gen`, `POST /plays` untouched). Size is the tap quality `q` (0–100), stored locally under its own key and sent by a second idempotent request; the API never knows a species size. Pure page helpers for size and weeks live in a new `@meta` block (outside `@gen`, so no `sync-gen`/redeploy for them); the API gains a `q` column, `POST /plays/size`, and `week`/`streak`/`size` in the stats response it already returns.

**Tech Stack:** One static `index.html` (inline JS/CSS, no build), Node scripts in `tools/`, Cloudflare Worker + D1 in `api/` (`wrangler`).

**Spec:** `docs/superpowers/specs/2026-10-07-pista-fisgada-banquete-design.md`

## Global Constraints

- Score, stars, `n/6`, `POST /plays` and `@gen` are not changed. Missing the hook-set never loses the fish.
- `q` is an integer 0–100. Tiers: record `q ≥ 92`, good `q ≥ 60`, else small. `cmOf(q,[min,max]) = round(min + q/100·(max−min))`.
- Local key per day: `goodcatch:<date>:pista:q`. The casts record `goodcatch:<date>:pista` keeps its format.
- Every `localStorage` access in try/catch. Every UI string in both `STR.en` and `STR.pt`.
- Week = calendar Monday→Sunday.
- No tap within 4 s resolves as `q = 20` (small). Reduced motion: needle at half speed.
- Server: `UPDATE … WHERE won = 1 AND q IS NULL` (only a won game, first value stands). Streak window 60 days.
- Production deploy (`--remote` D1, `wrangler deploy`) only with the owner's explicit go.
- Commits: only when the owner says so; never add a `Co-Authored-By` trailer.
- Test at ~400 px and desktop (`.claude/launch.json` serves the page on :8765; the API dev server is :8787).

---

### Task 1: API — store `q` and accept `POST /plays/size`

**Files:**
- Modify: `api/schema.sql`
- Modify: `api/src/play.js`
- Modify: `api/src/index.js`
- Modify: `api/seed-local.mjs`
- Test: `api/test.mjs`

**Interfaces:**
- Produces: `validateSize(body, today) → {ok:true, date, player, q} | {ok:false, error}`; `summarize(rows, player)` now returns `you: {n, won, q}` and `size: {better, top}`; route `POST /plays/size` responds with the same body as `POST /plays`.

- [ ] **Step 1: Write the failing tests** — append to `api/test.mjs` before the final `console.log`, and change the import to `import { validatePlay, validateSize, summarize } from './src/play.js';`

```js
const sz = (q, extra = {}) => validateSize({ date: DATE, player: P, q, ...extra }, TODAY);
v = sz(73);
if (!v.ok || v.q !== 73 || v.player !== P || v.date !== DATE) fail(`a size of 73 must pass: ${JSON.stringify(v)}`);
if (!sz(0).ok || !sz(100).ok) fail('0 and 100 are valid sizes');
for (const [name, r] of Object.entries({
  'q below 0': sz(-1), 'q above 100': sz(101), 'q not integer': sz(50.5), 'q string': sz('50'),
  'size bad player': sz(50, { player: 'me' }), 'size date too far': sz(50, { date: '2026-09-25' }),
})) if (r.ok) fail(`must refuse: ${name}`);

const sized = rows.map((r, i) => ({ ...r, q: [80, 40, null, 95, null][i] }));
const z = summarize(sized, P);
if (z.you.q !== 80) fail(`you.q ${z.you.q}`);
if (z.size.top !== 95) fail(`size.top ${z.size.top}`);
if (z.size.better !== 50) fail(`80 beats 40 and loses to 95: 50, got ${z.size.better}`);
if (summarize(rows, P).size.better !== null || summarize(rows, P).size.top !== null) fail('no sizes, no size stats');
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd api && node test.mjs`
Expected: FAIL with `SyntaxError: The requested module './src/play.js' does not provide an export named 'validateSize'`

- [ ] **Step 3: Implement in `api/src/play.js`** — extract the date/player checks so both validators share them, then add `validateSize` and the size stats.

Replace the first three checks of `validatePlay` with a call to a shared helper:

```js
function who(body, today) {
  if (!body || typeof body !== 'object') return { ok: false, error: 'body' };
  const { date, player } = body;
  if (typeof date !== 'string' || !DAY.test(date)) return { ok: false, error: 'date' };
  if (Math.abs(Date.parse(date + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) > 864e5) return { ok: false, error: 'date' };
  if (typeof player !== 'string' || !UUID.test(player)) return { ok: false, error: 'player' };
  return { ok: true, date, player };
}

// Players send their local date, so it may sit a day either side of the server's UTC date.
export function validatePlay(body, today) {
  const w = who(body, today); if (!w.ok) return w;
  const { date, player } = w, { casts } = body;
  // ...rest of the existing body unchanged, from the `Array.isArray(casts)` check on
}

// q is the hook-set's tap quality, reported by the client: it cannot be verified, only bounded.
export function validateSize(body, today) {
  const w = who(body, today); if (!w.ok) return w;
  if (!Number.isInteger(body.q) || body.q < 0 || body.q > 100) return { ok: false, error: 'q' };
  return { ...w, q: body.q };
}
```

In `summarize`, change the `you` field and add `size` (keep everything else):

```js
  const sizes = rows.filter(r => r.won && Number.isInteger(r.q));
  const mineQ = me && Number.isInteger(me.q) ? me.q : null, otherQ = sizes.filter(r => r !== me);
  const size = {
    top: sizes.length ? Math.max(...sizes.map(r => r.q)) : null,
    better: mineQ !== null && otherQ.length ? Math.round((100 * otherQ.filter(r => r.q < mineQ).length) / otherQ.length) : null,
  };
  return { players: rows.length, dist, you: me && { n: me.n, won: me.won, q: mineQ }, better, heat, size };
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd api && node test.mjs`
Expected: `api ok: validator and stats`

- [ ] **Step 5: Wire the route and schema**

`api/schema.sql` — add the column to the CREATE (fresh databases):

```sql
  created_at INTEGER NOT NULL,
  q INTEGER,
  PRIMARY KEY (date, player)
```

`api/src/index.js` — import `validateSize`, add a body reader, select `q`, and the route:

```js
import { validatePlay, validateSize, summarize } from './play.js';
// ...
const readBody = async (req, max) => {
  const raw = await req.text();
  if (raw.length > max) return { error: 'size' };
  try { return { body: JSON.parse(raw) }; } catch { return { body: null }; }
};
```

In `stats`: `'SELECT player, casts, n, won, q FROM plays WHERE date = ?'`.

Replace the body parsing in the `/plays` branch with `const { body, error } = await readBody(req, 2048); if (error) return json(req, { error }, 413);` and add:

```js
    if (req.method === 'POST' && url.pathname === '/plays/size') {
      const { body, error } = await readBody(req, 512);
      if (error) return json(req, { error }, 413);
      const v = validateSize(body, today());
      if (!v.ok) return json(req, { error: v.error }, 400);
      // Only a won game gets a size, and the first one stands: a reload cannot re-roll it.
      await env.DB.prepare('UPDATE plays SET q = ? WHERE date = ? AND player = ? AND won = 1 AND q IS NULL')
        .bind(v.q, v.date, v.player).run();
      return json(req, await stats(env, v.date, v.player));
    }
```

`api/seed-local.mjs` — after the `/plays` fetch, give winners a size so the village has data:

```js
  const player = crypto.randomUUID();
  await fetch('http://localhost:8787/plays', { method: 'POST', body: JSON.stringify({ date, player, casts }) });
  if (bites(sea.grid[Math.floor(casts.at(-1) / 100)][casts.at(-1) % 100], sea.fish) === 3)
    await fetch('http://localhost:8787/plays/size', { method: 'POST', body: JSON.stringify({ date, player, q: Math.floor(Math.random() * 101) }) });
```

(replacing the existing single `fetch` line, whose inline `crypto.randomUUID()` moves into `player`).

- [ ] **Step 6: Integration check against local D1** (proves `q IS NULL` and `won = 1`, which unit tests cannot reach)

```bash
cd api && npx wrangler d1 execute goodcatch --local --command "ALTER TABLE plays ADD COLUMN q INTEGER"
```

Start `npx wrangler dev --port 8787 --local` in the background, then run this script from `api/` (scratch file, not committed):

```js
import { genSea, bites } from './src/gen.js';
const date = new Date().toISOString().slice(0, 10), sea = genSea(date), player = crypto.randomUUID(), U = 'http://localhost:8787';
let fish; sea.grid.forEach((row, r) => row.forEach((x, c) => { if (bites(x, sea.fish) === 3) fish ??= r * 100 + c; }));
const post = (p, b) => fetch(U + p, { method: 'POST', body: JSON.stringify(b) }).then(r => r.json());
await post('/plays', { date, player, casts: [fish] });
const a = await post('/plays/size', { date, player, q: 40 }), b = await post('/plays/size', { date, player, q: 99 });
if (a.you.q !== 40 || b.you.q !== 40) throw new Error(`first size must stand: ${a.you.q} ${b.you.q}`);
const loser = crypto.randomUUID(), miss = [...Array(49).keys()].map(i => Math.floor(i / 7) * 100 + i % 7).filter(k => bites(sea.grid[Math.floor(k / 100)][k % 100], sea.fish) < 3).slice(0, 6);
await post('/plays', { date, player: loser, casts: miss });
const l = await post('/plays/size', { date, player: loser, q: 90 });
if (l.you.q !== null) throw new Error('a lost game must not get a size');
console.log('size integration ok');
```

Expected: `size integration ok`. Mutation: remove `AND q IS NULL` from the UPDATE, restart dev, reset with `npx wrangler d1 execute goodcatch --local --command "DELETE FROM plays"`, rerun → must throw `first size must stand`. Restore.

- [ ] **Step 7: Commit** (only with the owner's go)

```bash
git add api/schema.sql api/src/play.js api/src/index.js api/seed-local.mjs api/test.mjs
git commit -m "Let the village store the hook-set's tap quality"
```

---

### Task 2: API — the village's week and streaks in the stats

**Files:**
- Modify: `api/src/play.js`
- Modify: `api/src/index.js`
- Test: `api/test.mjs`

**Interfaces:**
- Consumes: `summarize` from Task 1.
- Produces: `weekDates(date) → string[7]` (Mon→Sun), `shiftDay(date, n) → string`, `weekStats(date, rows) → [{players, caught}] × 7`, `streakStats(date, rows, player) → {you, better}`. Stats response gains `week` and `streak`.

- [ ] **Step 1: Write the failing tests** — append to `api/test.mjs` (extend the import with `weekDates, weekStats, streakStats`):

```js
if (weekDates('2026-10-07').join() !== '2026-10-05,2026-10-06,2026-10-07,2026-10-08,2026-10-09,2026-10-10,2026-10-11') fail(`week of a Wednesday ${weekDates('2026-10-07')}`);
if (weekDates('2026-10-11')[0] !== '2026-10-05') fail('a Sunday belongs to the week that started on Monday');
if (weekDates('2026-11-02')[0] !== '2026-11-02') fail('a Monday starts its own week');
const ws = weekStats('2026-10-07', [{ date: '2026-10-05', players: 3, caught: 2 }, { date: '2026-10-07', players: 1, caught: 0 }]);
if (JSON.stringify(ws) !== JSON.stringify([{ players: 3, caught: 2 }, { players: 0, caught: 0 }, { players: 1, caught: 0 }, ...Array(4).fill({ players: 0, caught: 0 })])) fail(`weekStats ${JSON.stringify(ws)}`);
const hist = [
  ...['2026-10-05', '2026-10-06', '2026-10-07'].map(date => ({ player: P, date })),
  ...['2026-10-03', '2026-10-05', '2026-10-07'].map(date => ({ player: 'gap', date })),
  { player: 'one', date: '2026-10-07' },
  ...['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07'].map(date => ({ player: 'long', date })),
];
const st = streakStats('2026-10-07', hist, P);
if (st.you !== 3) fail(`three days in a row, got ${st.you}`);
if (st.better !== 67) fail(`3 beats gap(1) and one(1), loses to long(7): 67, got ${st.better}`);
if (streakStats('2026-10-07', hist, 'stranger').you !== null) fail('no streak without a play today');
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd api && node test.mjs`
Expected: FAIL with `does not provide an export named 'weekDates'`

- [ ] **Step 3: Implement in `api/src/play.js`**

```js
export const shiftDay = (date, n) => { const d = new Date(date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const weekDates = date => { const wd = (new Date(date + 'T12:00:00Z').getUTCDay() + 6) % 7; return Array.from({ length: 7 }, (_, i) => shiftDay(date, i - wd)); };
export const weekStats = (date, rows) => weekDates(date).map(d => { const r = rows.find(x => x.date === d); return { players: r ? r.players : 0, caught: r ? r.caught || 0 : 0 }; });

// Only finished days reach the server, so this can run shorter than the page's own streak.
export function streakStats(date, rows, player) {
  const days = new Map();
  for (const r of rows) { if (!days.has(r.player)) days.set(r.player, new Set()); days.get(r.player).add(r.date); }
  const len = set => { let n = 0, d = date; while (set.has(d)) { n++; d = shiftDay(d, -1); } return n; };
  const all = [...days].filter(([, s]) => s.has(date)).map(([p, s]) => [p, len(s)]);
  const mine = all.find(([p]) => p === player)?.[1] ?? null, others = all.filter(([p]) => p !== player);
  return { you: mine, better: mine !== null && others.length ? Math.round((100 * others.filter(([, n]) => n < mine).length) / others.length) : null };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd api && node test.mjs`
Expected: `api ok: validator and stats`

- [ ] **Step 5: Use them in `stats` (`api/src/index.js`)** — one D1 batch, three reads:

```js
import { validatePlay, validateSize, summarize, weekDates, weekStats, streakStats, shiftDay } from './play.js';

const STREAK_DAYS = 60; // ponytail: streaks cap at 60 days — keep a per-player streak table if plays grow large

async function stats(env, date, player) {
  const week = weekDates(date);
  const [day, wk, hist] = await env.DB.batch([
    env.DB.prepare('SELECT player, casts, n, won, q FROM plays WHERE date = ?').bind(date),
    env.DB.prepare('SELECT date, COUNT(*) AS players, SUM(won) AS caught FROM plays WHERE date BETWEEN ? AND ? GROUP BY date').bind(week[0], week[6]),
    env.DB.prepare('SELECT player, date FROM plays WHERE date > ? AND date <= ? AND player IN (SELECT player FROM plays WHERE date = ?)').bind(shiftDay(date, -STREAK_DAYS), date, date),
  ]);
  return { ...summarize(day.results, player), week: weekStats(date, wk.results), streak: streakStats(date, hist.results, player) };
}
```

- [ ] **Step 6: Local check** — with `wrangler dev` running: `node seed-local.mjs` then

```bash
curl -s http://localhost:8787/daily/$(date -u +%F) | node -e "const s=JSON.parse(require('fs').readFileSync(0));if(s.week.length!==7||!s.streak||!('top' in s.size))throw new Error(JSON.stringify(s));console.log('stats ok',s.week,s.size,s.streak)"
```

Expected: `stats ok` with today's slot in `week` equal to the seeded count.

- [ ] **Step 7: Commit** (only with the owner's go)

```bash
git add api/src/play.js api/src/index.js api/test.mjs
git commit -m "Give the village its week and streak ranking"
```

---

### Task 3: Page — the `@meta` block and its check

**Files:**
- Modify: `index.html` (insert right after the `// @gen-end` line, ~line 250)
- Modify: `tools/pista-check.mjs:6-8` and before the final `console.log`

**Interfaces:**
- Produces (globals in the page script): `CM` (`{[speciesId]: [min,max]}`), `ZONE_W` (14), `zoneOf(date) → int 20..79`, `qOf(x, centre) → int 0..100`, `cmOf(q, range) → int`, `tierOf(q) → 'small'|'good'|'record'`, `weekOf(date) → string[7]` Mon→Sun.

- [ ] **Step 1: Write the failing check** — in `tools/pista-check.mjs` replace lines 6–8 so the evaluated slice runs through `@meta-end` and returns the new names:

```js
const a = html.indexOf('// @gen-start'), b = html.indexOf('// @gen-end'), e = html.indexOf('// @meta-end');
if (a < 0 || b < a) throw new Error('@gen markers not found');
if (e < b) throw new Error('@meta block (after @gen-end) not found');
const G = new Function(`${html.slice(a, e)}; return {genSea, combo, bites, stars, N, SPECIES: typeof SPECIES === 'undefined' ? null : SPECIES, speciesOf: typeof speciesOf === 'undefined' ? null : speciesOf, speciesMap: typeof speciesMap === 'undefined' ? null : speciesMap, CM, zoneOf, qOf, cmOf, tierOf, weekOf};`)();
```

and before the final `console.log` add:

```js
// The hook-set and the banquet: the same green zone for everyone each day, sizes inside each species' range, weeks Mon→Sun.
const day = i => { const d = new Date(2026, 8, 30 + i); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const zones = Array.from({ length: 30 }, (_, i) => G.zoneOf(day(i)));
if (zones.some((z, i) => z !== G.zoneOf(day(i)) || z < 20 || z > 79)) throw new Error('zoneOf must be deterministic and within 20..79');
if (new Set(zones).size < 10) throw new Error(`zoneOf barely varies by date: ${zones}`);
if (G.qOf(50, 50) !== 100 || G.qOf(57, 50) < 90 || G.qOf(58, 50) >= 90 || G.qOf(0, 79) < 0) throw new Error('qOf: centre 100, inside the zone ≥ 90, outside below, never negative');
if ([91, 92, 59, 60].map(G.tierOf).join() !== 'good,record,small,good') throw new Error('tierOf thresholds 60 / 92');
for (const s of G.SPECIES) {
  const r = G.CM[s.id]; if (!r || !(r[0] < r[1])) throw new Error(`CM: ${s.id} needs [min,max]`);
  for (const q of [0, 50, 100]) { const c = G.cmOf(q, r); if (c < r[0] || c > r[1]) throw new Error(`cmOf(${q}) out of ${s.id} range`); }
}
if (G.weekOf('2026-10-07').join() !== '2026-10-05,2026-10-06,2026-10-07,2026-10-08,2026-10-09,2026-10-10,2026-10-11') throw new Error(`weekOf of a Wednesday: ${G.weekOf('2026-10-07')}`);
if (G.weekOf('2026-10-11')[0] !== '2026-10-05' || G.weekOf('2026-11-02')[0] !== '2026-11-02') throw new Error('weekOf: Sunday closes the week, Monday opens it');
```

- [ ] **Step 2: Run to verify it fails**

Run: `node tools/pista-check.mjs`
Expected: FAIL with `@meta block (after @gen-end) not found`

- [ ] **Step 3: Add the block to `index.html`** right after `// @gen-end`:

```js
// @meta-start
// Page-only rules: the server never sees a size, only the tap quality q, so none of this is in @gen.
const CM={dourado:[30,60],palhaco:[6,11],cirurgiao:[15,30],garoupa:[50,90],baiacu:[15,35],papagaio:[30,60],linguado:[25,45],sardinha:[12,20],anjo:[20,40],cavalo:[8,18],leao:[20,38],manta:[250,450]};
const ZONE_W=14;
const zoneOf=date=>20+Math.floor(mulberry(seedFrom(`${date}:fisgada`))()*60);
const qOf=(x,centre)=>{const off=Math.abs(x-centre);return Math.max(0,Math.min(100,Math.round(off<=ZONE_W/2?100-off*1.4:90-(off-ZONE_W/2)*1.6)))};
const cmOf=(q,[a,b])=>Math.round(a+q/100*(b-a));
const tierOf=q=>q>=92?'record':q>=60?'good':'small';
function weekOf(date){
  const d=new Date(date+'T12:00:00'),wd=(d.getDay()+6)%7;
  return Array.from({length:7},(_,i)=>{const x=new Date(d);x.setDate(d.getDate()-wd+i);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`});
}
// @meta-end
```

- [ ] **Step 4: Run to verify it passes**

Run: `node tools/pista-check.mjs`
Expected: `pista ok: 90 days, …` (and `api/src/gen.js` still not stale: `@gen` untouched).

- [ ] **Step 5: Mutation checks** — each must fail `pista-check`, then restore:
  - `zoneOf=date=>50` → `zoneOf barely varies by date`
  - in `weekOf`, `wd=d.getDay()` (week from Sunday) → `weekOf of a Wednesday`

- [ ] **Step 6: Commit** (only with the owner's go)

```bash
git add index.html tools/pista-check.mjs
git commit -m "Add the page-only rules for fish size and the Mon-Sun week"
```

---

### Task 4: Page — the hook-set

**Files:**
- Modify: `index.html` — CSS (near `.sea`, ~line 53), markup (`#seabox`, ~line 167), `STR` (en ~line 480, pt ~line 498), state near `const MAX=6` (~line 517), `drawSea` (`if(won)` branch), `render` (`busy`), `$('cast').onclick`, `sendPlay`, init lines at the end.

**Interfaces:**
- Consumes: `zoneOf`, `qOf`, `cmOf`, `tierOf`, `CM` (Task 3); `POST /plays/size` (Task 1).
- Produces: `QK` (today's q key), `qOn(date) → int|null`, `hook` (state or null), `startHook()`, `sendSize(q)`.

- [ ] **Step 1: CSS** (after the `.grid` rule)

```css
#hook{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:rgba(4,16,26,.35);border:0;padding:0 16px;cursor:pointer;touch-action:manipulation;font:400 22px/1 var(--pixel);color:var(--cream)}
#hook[hidden]{display:none}
#hook .bar{position:relative;width:100%;height:34px;border:10px solid transparent;border-image:var(--parch9) 5 fill / 10px round}
#hook .zone{position:absolute;top:0;bottom:0;background:#7FB84E}
#hook .needle{position:absolute;top:-8px;bottom:-8px;width:6px;margin-left:-3px;background:var(--bark)}
```

- [ ] **Step 2: Markup** — inside `#seabox`, after `#board`:

```html
<button id="hook" type="button" hidden><span id="hook-say"></span><span class="bar"><i class="zone" id="hook-zone"></i><i class="needle" id="hook-needle"></i></span></button>
```

- [ ] **Step 3: Strings** — add to `STR.en`:

```js
    hook:'It bit! Tap with the needle in the green.',hook_aria:'Reel in: tap when the needle is in the green',
    tier_small:'small',tier_good:'good size',tier_record:'record!',size:'{cm} cm · {t}',
```

and to `STR.pt`:

```js
    hook:'Mordeu! Toque com a agulha no verde.',hook_aria:'Puxar: toque quando a agulha estiver no verde',
    tier_small:'pequeno',tier_good:'bom tamanho',tier_record:'recorde!',size:'{cm} cm · {t}',
```

- [ ] **Step 4: State and helpers** — after `const MAX=6, …, LAND=520;`:

```js
const QK=`${REC}:q`, HOOK_MS=4000;
const qOn=d=>{try{const v=localStorage.getItem(`goodcatch:${d}:pista:q`);return v===null?null:Number(v)}catch(e){return null}};
let hook=null;
```

- [ ] **Step 5: The hook-set** — after `function showCatch(){…}`:

```js
// The score is already final here (sendPlay ran); the tap only sizes the fish, and a miss still lands it.
function startHook(){
  const b=$('hook'),centre=zoneOf(DATE),period=still.matches?760:380;
  hook={t0:performance.now(),centre,x:50};
  $('hook-zone').style.left=`${centre-ZONE_W/2}%`; $('hook-zone').style.width=`${ZONE_W}%`;
  $('hook-say').textContent=t('hook'); b.setAttribute('aria-label',t('hook_aria')); b.hidden=false; b.focus();
  render();
  const tick=now=>{
    if(!hook) return;
    hook.x=50+50*Math.sin((now-hook.t0)/period);
    $('hook-needle').style.left=`${hook.x}%`;
    if(now-hook.t0>HOOK_MS) return endHook(20);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
function endHook(q){
  if(!hook) return;
  hook=null; $('hook').hidden=true;
  try{localStorage.setItem(QK,String(q))}catch(e){}
  sendSize(q);
  anim={k:casts.at(-1),start:performance.now()-LAND,n:3}; render();
  setTimeout(()=>{anim=null;render();showCatch();if(still.matches)drawSea(performance.now())},still.matches?0:1100);
}
$('hook').onclick=()=>{if(hook)endHook(qOf(hook.x,hook.centre))};
```

- [ ] **Step 6: Send the size** — after `sendPlay`, add `sendSize`, and in `sendPlay`'s `.then` resend a size the server is missing:

```js
function sendSize(q){
  const id=playerId(); if(!API||!id) return;
  fetch(`${API}/plays/size`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:DATE,player:id,q})})
    .then(r=>r.ok?r.json():null).then(v=>{if(!v)return;VILLAGE=v;render();if($('catch').open){$('catch-body').innerHTML=resultHTML(true);wireResult($('catch-body'))}}).catch(()=>{});
}
```

In `sendPlay`, change `.then(v=>{if(!v)return;VILLAGE=v;…` to start with `if(!v)return;const q=qOn(DATE);if(q!==null&&v.you&&v.you.won&&v.you.q===null)sendSize(q);VILLAGE=v;…`.

- [ ] **Step 7: Route the winning cast into the hook-set** — in `$('cast').onclick` replace the final `setTimeout(...)` with:

```js
  const end=over(), won=caught();
  setTimeout(()=>{anim=null;if(won){startHook();return}render();if(end)showCatch();if(still.matches)drawSea(performance.now())},still.matches?0:won?LAND:LAND+500);
```

(drop the old `const end=over();` line). In `render`, change `busy=!!anim` to `busy=!!anim||!!hook`. In `drawSea`, change `if(won){const k=…` to `if(won&&!hook){const k=…` so the fish does not hop before the tap.

- [ ] **Step 8: Reload during the hook-set** — after `renderStatic(); render(); fit(); …` at the end of the script add:

```js
if(caught()&&qOn(DATE)===null) startHook();
```

- [ ] **Step 9: Browser check** — `preview_start` with the launch config (:8765), local API running (Task 1 Step 6). At 400 px and desktop, on `?dia=` of a day you have not played:
  - win; the bar appears after the bobber lands; tap in the green → `localStorage['goodcatch:<dia>:pista:q'] ≥ 90`, fish hops, catch panel opens;
  - new `?dia=`: tap far from green → q < 60; another: no tap → q = 20 after 4 s;
  - win, reload before tapping → bar reopens; tap → q saved, a second reload does not reopen;
  - reduced motion: temporarily change `const still=matchMedia(…)` to `const still={matches:true}`, reload, win → needle at half speed and the fish appears right after the tap; revert the line;
  - lose a day → no bar;
  - `read_network_requests`: one `POST /plays` before the bar, one `POST /plays/size` after the tap; local D1 row has `q`.
  - Mutation: comment out `b.hidden=false` → winning shows nothing and `hook` blocks the board: the check above must catch it. Restore.

- [ ] **Step 10: Commit** (only with the owner's go)

```bash
git add index.html
git commit -m "Add the hook-set: a tension bar that sizes the caught fish"
```

---

### Task 5: Page — the banquet table, guests and their lines

**Files:**
- Modify: `index.html` — `M` sprites, `mapURL`, `URLS`, a `GPAL`/`GUEST_URL`/`CAST`/`guestOf` block after `fishSprite`, `weekHTML`, `resultHTML`, CSS near `.day` (~line 113), `STR` (en/pt).

**Interfaces:**
- Consumes: `weekOf`, `tierOf`, `cmOf`, `CM` (Task 3); `qOn` (Task 4); `VILLAGE.week` (Task 2).
- Produces: `CAST` (`[{guests: string[7]}]`), `guestOf(date) → 'lontra'|'pelicano'|'guaxinim'|'vovo'`, `GUEST_URL`, `guestSprite(id)`, `tierOn(date) → 'small'|'good'|'record'|'lost'|null`.

- [ ] **Step 1: Sprites** — add to `M` (placeholders; the owner will redraw):

```js
  plate:["..wwwwwwww..",".wWWWWWWWWw.","wWWWWWWWWWWw",".wwwwwwwwww."],
  bone:["............",".q.q.q..qq..","qqqqqqqqqqq.",".q.q.q..qq..","............"],
  cover:[".....mm.....","...yyyyyy...","..yhhyyyyy..",".yhyyyyyyyy.",".yyyyyyyyyy.","YYYYYYYYYYYY"],
```

Change `mapURL` to take a palette: `const mapURL=(map,pal=P)=>{const cv=canvas(Math.max(...map.map(r=>r.length))+2,map.length+2);drawMap(cv.getContext('2d'),map,1,1,false,pal);return cv.toDataURL()};` and add `'plate','bone','cover'` to the `URLS` list.

- [ ] **Step 2: Guests** — after `fishSprite`, the four 12×12 maps from `rede/index.html:306-309` with the colours of their letters from `rede/index.html:287` (`PAL`):

```js
const GUESTS={
  lontra:["...wwwwww...","..wwwwwwww..","..wwwwwwww..","...wwwwww...","..mmmmmmmm..",".mmlmmmmlmm.",".mmemmmmemm.",".mmmllllmmm.","..mmleelmm..","..mmmllmmm..","...mmmmmm...","............"],
  pelicano:["............","....wwww....","...wwwwww...","...wwewwww..","...wwwwwyyy.","....wwwyyyYY","....wwwYyyyY","...wwwwwYYY.","..wwwwwww...","..wwwwwww...","...wwwww....","............"],
  guaxinim:[".q........q.",".qq......qq.","..qqqqqqqq..",".qqqqqqqqqq.",".zzzqqqqzzz.",".zezqqqqzez.",".zzzqqqqzzz.","..qqqxxqqq..","..qqxeexqq..","...qxxxxq...","....qqqq....","............"],
  vovo:[".x........x.",".xx......xx.",".xxxxxxxxxx.","xxxxxxxxxxxx","xjjjxxxxjjjx","xjejjjjjjejx","xjjjxxxxjjjx","xxxxxkkxxxxx",".xxxxxxxxxx.",".pppppppppp.","pppppppppppp","............"],
};
const GPAL={w:'#EDEAE0',e:'#0A1F2B',m:'#6B4A2E',l:'#EBDDB4',y:'#E9C25A',Y:'#C9962E',q:'#7A8A8C',z:'#36454A',x:'#C9D3D6',j:'#10324A',k:'#F07C9A',p:'#D98BB0'};
const GUEST_URL=Object.fromEntries(Object.entries(GUESTS).map(([k,m])=>[k,mapURL(m,GPAL)]));
const guestSprite=id=>`<i class="sp guest" style="background-image:url(${GUEST_URL[id]})"></i>`;
// One table and one guest list for now; the owner adds a week's entry to rotate them with new art.
const CAST=[{guests:['lontra','pelicano','guaxinim','lontra','pelicano','guaxinim','vovo']}];
const guestOf=d=>{const w=Math.floor((new Date(weekOf(d)[0]+'T12:00:00')-new Date(weekOf(EPOCH)[0]+'T12:00:00'))/6048e5);return CAST[w%CAST.length].guests[(new Date(d+'T12:00:00').getDay()+6)%7]};
// A day won before the hook-set existed has no q and shows a good portion.
const tierOn=d=>caughtOn(d)?tierOf(qOn(d)??70):castsOn(d).length>=MAX?'lost':null;
```

Before using it, verify every letter used by the four maps has a `GPAL` entry:

```bash
node -e "const s=require('fs').readFileSync('rede/index.html','utf8').split('\n').slice(305,309).map(l=>l.replace(/^\s*\w+:/,'')).join('');console.log([...new Set(s.replace(/[^A-Za-z]/g,''))].sort().join(''))"
```

Expected: `Yejklmpqwxyz` (measured 2026-10-07), every one a `GPAL` key. A new letter means copying its colour from `rede/index.html:287`.

- [ ] **Step 3: Guest lines** — add to `STR.en`:

```js
    g_lontra_small:'Small, but it makes a nice snack.',g_lontra_good:'This one becomes a lovely dish!',g_lontra_record:'A record! I’ll serve it whole.',g_lontra_lost:'No fish today? Stone soup it is.',
    g_pelicano_small:'Fits in my beak in one go.',g_pelicano_good:'Now that fills my pouch.',g_pelicano_record:'Not even my beak fits that one!',g_pelicano_lost:'I’ll have yesterday’s bones.',
    g_guaxinim_small:'I was going to steal it, but it’s tiny.',g_guaxinim_good:'I saved a seat at the table for this one.',g_guaxinim_record:'I wouldn’t dare steal this one.',g_guaxinim_lost:'Got away? I was going to wash it so nicely.',
    g_vovo_small:'A little one, I’ll make a broth.',g_vovo_good:'What a lovely fish!',g_vovo_record:'I’ve never seen one this big!',g_vovo_lost:'Never mind, there’s cake on the table.',
```

and to `STR.pt`:

```js
    g_lontra_small:'Pequeno, mas dá um petisco.',g_lontra_good:'Esse vira um belo prato!',g_lontra_record:'Recorde! Vou servir inteiro.',g_lontra_lost:'Sem peixe hoje? Faço sopa de pedra.',
    g_pelicano_small:'Cabe no meu bico de uma vez.',g_pelicano_good:'Esse enche a bolsa do bico.',g_pelicano_record:'Nem no meu bico cabe esse!',g_pelicano_lost:'Fico com as espinhas de ontem.',
    g_guaxinim_small:'Eu ia roubar, mas é pequeno.',g_guaxinim_good:'Guardei um lugar na mesa pra esse.',g_guaxinim_record:'Esse eu nem tenho coragem de roubar.',g_guaxinim_lost:'Escapou? Eu ia lavar direitinho.',
    g_vovo_small:'Pequenininho, faço um caldo.',g_vovo_good:'Que beleza de peixe!',g_vovo_record:'Nunca vi um desse tamanho!',g_vovo_lost:'Tudo bem, tem bolo na mesa.',
    week:'Mesa da semana',
```

and change `STR.en.week` from `'Last 7 days'` to `'This week’s table'` (`STR.pt.week` above replaces `'Últimos 7 dias'`; remove the old one).

- [ ] **Step 4: The table** — replace `weekHTML`'s `days`/`cells` lines:

```js
  const vw=VILLAGE?.week;
  const cells=weekOf(DATE).map((d,i)=>{const a=castsOn(d),tier=tierOn(d);
    const dish=d>DATE?sprite('cover'):tier==='lost'?sprite('bone'):tier?fishSprite(speciesOf(d),'portion-'+tier):a.length?'<b>…</b>':'';
    return `<span class="day${d===DATE?' today':''}"><small>${new Intl.DateTimeFormat(LANG,{weekday:'short'}).format(new Date(d+'T12:00:00')).replace('.','').slice(0,3)}</small>${dish}${sprite('plate','plate')}${vw?`<em>${vw[i].caught}</em>`:''}</span>`}).join('');
```

(the `return` line with `.week` and the streak stays as is). CSS after `.day .sp`:

```css
.day .sp.plate{width:30px;height:10px;margin-top:-4px}
.day .sp.portion-small{width:20px;height:16px}
.day .sp.portion-record{width:36px;height:28px}
.day em{font-style:normal;font-size:16px;line-height:1;color:var(--ink-soft)}
.guest-say{display:flex;align-items:center;gap:8px;margin:0;font-size:20px;line-height:1.1;color:var(--ink);text-align:left}
.guest-say .sp{width:36px;height:36px;flex:none}
```

- [ ] **Step 5: Size and guest line in the result panel** — in `resultHTML`, after `const won=…, st=…;` add `const q=qOn(DATE), tier=tierOn(DATE), g=guestOf(DATE);` and after the closing `</div>` of `.score` insert:

```js
    +(won&&q!==null?`<p class="verdict">${t('size',{cm:cmOf(q,CM[TODAY.id]),t:t('tier_'+tierOf(q))})}</p>`:'')
    +(tier?`<p class="guest-say">${guestSprite(g)}<span>${t(`g_${g}_${tier}`)}</span></p>`:'')
```

- [ ] **Step 6: Browser check** — at 400 px and desktop, with `?dia=` across one week (play Mon win/record, Tue lose, skip Wed, Thu win small, then open Thu):
  - Thu result: size line, the otter's "small" line; table Mon fish large, Tue bone, Wed empty plate, Thu fish small, Fri–Sun covers;
  - with the local API seeded for those dates, village counts appear under each plate; with the API stopped, the table still renders without counts;
  - PT and EN via the language button; no horizontal scroll at 400 px.
  - Mutation: make `tierOn` return `null` for lost days → Tue must show no bone. Restore.

- [ ] **Step 7: Commit** (only with the owner's go)

```bash
git add index.html
git commit -m "Turn the week strip into grandma's table, with a guest line each day"
```

---

### Task 6: Page — Sunday's banquet scene

**Files:**
- Modify: `index.html` — new `banquet` function after `scene`, `resultHTML`, `wireResult`, `STR` (en/pt), CSS.

**Interfaces:**
- Consumes: `weekOf`, `tierOn`, `GUESTS`, `GPAL`, `CAST`, `speciesOf`, `SP_BY` (earlier tasks); `VILLAGE.week`.
- Produces: `banquet(x)` drawing an 80×64 scene into a 2D context.

- [ ] **Step 1: Strings** — `STR.en`:

```js
    feast0:'A quiet table this week. Next week we fill it!',feast1:'A good table! Everyone ate.',feast2:'A full table! What a feast.',feast_village:'The village caught {n} fish this week.',
```

`STR.pt`:

```js
    feast0:'Mesa tranquila esta semana. Semana que vem a gente enche!',feast1:'Uma boa mesa! Todo mundo comeu.',feast2:'Mesa completa! Que banquete.',feast_village:'A vila pescou {n} peixes esta semana.',
```

- [ ] **Step 2: The scene** — after `function scene(…){…}`:

```js
// Sunday: grandma's table with the week's seven dishes, back row Mon–Wed, front row Thu–Sun.
function banquet(x){
  dot(x,'#F6E7C1',0,0,80,64); for(let y=0;y<30;y+=6)dot(x,'#EEDBAE',0,y,80,1);
  const g=CAST[0].guests; [...new Set(g)].forEach((id,i)=>drawMap(x,GUESTS[id],6+i*18,12,false,GPAL));
  dot(x,'#8B5A2B',4,30,72,26); dot(x,'#B97A45',4,30,72,2); dot(x,'#5E3A1A',4,54,72,2);
  weekOf(DATE).forEach((d,i)=>{
    const X=i<3?14+i*20:4+(i-3)*19, Y=i<3?33:43, tier=tierOn(d);
    drawMap(x,M.plate,X,Y+6);
    if(tier==='lost') drawMap(x,M.bone,X,Y+3);
    else if(tier){const s=SP_BY[speciesOf(d)];drawMap(x,M.fish,X,Y,false,{...P,y:s.pal.a,Y:s.pal.f||s.pal.b,h:s.pal.c||s.pal.a})}
  });
}
```

- [ ] **Step 3: Show it on Sundays** — in `resultHTML`, define `const sunday=new Date(DATE+'T12:00:00').getDay()===0, filled=weekOf(DATE).filter(caughtOn).length, vw=VILLAGE?.week;` and append before `villageHTML()`:

```js
    +(sunday?`<canvas class="banquet" aria-hidden="true"></canvas><p class="verdict">${t(filled>=6?'feast2':filled>=3?'feast1':'feast0')}${vw?' '+t('feast_village',{n:vw.reduce((a,w)=>a+w.caught,0)}):''}</p>`:'')
```

In `wireResult`, after the scene line:

```js
  const bq=el.querySelector('canvas.banquet');
  if(bq){fitScene(bq,Math.min(el.clientWidth||340,400)-8);const s=canvas(80,64);banquet(s.getContext('2d'));const bx=bq.getContext('2d');bx.imageSmoothingEnabled=false;bx.drawImage(s,0,0,bq.width,bq.height)}
```

CSS: `canvas.banquet{display:block;image-rendering:pixelated}`.

- [ ] **Step 4: Browser check** — `?dia=` on a Sunday with (a) all seven days won, (b) Mon won + Tue lost + rest empty, (c) only Sunday: the right dishes on the right seats, the right `feast0/1/2` line, the village total when the API is up; screenshot each at 400 px. Mutation: swap the two rows (`i<3` → `i>=4`) → Mon's dish moves to the front row: visible in the screenshot. Restore.

- [ ] **Step 5: Commit** (only with the owner's go)

```bash
git add index.html
git commit -m "Open grandma's banquet on Sundays"
```

---

### Task 7: Page — village comparisons and the share line

**Files:**
- Modify: `index.html` — `villageHTML`, `shareText`, `STR` (en/pt).

**Interfaces:**
- Consumes: `VILLAGE.size`, `VILLAGE.streak` (Tasks 1–2); `qOn`, `cmOf`, `CM` (Tasks 3–4).

- [ ] **Step 1: Strings** — `STR.en`: `size_top:'Biggest in the village: {cm} cm',size_better:'bigger than {p}%',streak_better:'Your streak beats {p}% of the village',` — `STR.pt`: `size_top:'Maior da vila: {cm} cm',size_better:'maior que {p}%',streak_better:'Sua sequência supera {p}% da vila',`

- [ ] **Step 2: `villageHTML`** — after the rank paragraph, before the bars:

```js
    +(v.size&&v.size.top!==null&&caught()?`<p class="rank">${t('size_top',{cm:cmOf(v.size.top,CM[TODAY.id])})}${v.size.better!==null?` · ${t('size_better',{p:v.size.better})}`:''}</p>`:'')
    +(v.streak&&v.streak.better!==null?`<p class="rank">${t('streak_better',{p:v.streak.better})}</p>`:'')
```

An older API without these fields leaves `v.size`/`v.streak` undefined and the lines simply do not render.

- [ ] **Step 3: Share line** — replace `shareText` with:

```js
function shareText(){
  const won=caught(), st=won?stars(casts.length):0, q=qOn(DATE), range=CM[TODAY.id];
  const fire=streakOf();
  return `🎣 Good Catch #${DAYNUM}  ${won?casts.length:'X'}/${MAX}${won?' '+'★'.repeat(st)+'☆'.repeat(3-st):''}${fire>1?` 🔥${fire}`:''}\n`
    +(won&&q!==null?`📏 ${cmOf(q,range)}/${range[1]} cm\n`:'')
    +casts.map(k=>fishes(bitesAt(k))).join('\n')+'\ngoodcatch.fish';
}
```

- [ ] **Step 4: Browser check** — local API seeded (`node seed-local.mjs <dia> 40`, which now sends sizes): after a win, the panel shows "Biggest in the village: N cm · bigger than P%" and the streak line; Share copies text with the `📏` line (read it back with `javascript_tool`: `await navigator.clipboard.readText()` or the `.note` fallback); a lost day has no `📏`. Stop the API → panel still renders, no village lines.

- [ ] **Step 5: Commit** (only with the owner's go)

```bash
git add index.html
git commit -m "Compare size and streak with the village, and put the size in the share"
```

---

### Task 8: Docs, full check, deploy (owner's go)

**Files:**
- Modify: `CLAUDE.md` (Pista entry under "Prototypes", and the `api/` line in "Layout")

- [ ] **Step 1: Update `CLAUDE.md`** — append to the Pista entry:

```markdown
 The winning cast opens a hook-set (tension bar, `startHook`/`endHook`): the tap quality `q` (0–100) sizes the fish (`cmOf(q, CM[species])`, tiers small/good/record) and never changes the score; stored at `goodcatch:<date>:pista:q` and sent once to `POST /plays/size`. `@meta-start` … `@meta-end` (right after `@gen`) holds the page-only rules (`CM`, `zoneOf`, `qOf`, `cmOf`, `tierOf`, `weekOf`), checked by `pista-check` but never copied to the API. The week strip is grandma's table (Mon→Sun, `weekHTML`), the day's guest (`CAST`, `guestOf`) says one line by tier, and Sunday's result opens the banquet scene (`banquet`). Spec `docs/superpowers/specs/2026-10-07-pista-fisgada-banquete-design.md`.
```

and in the `api/` line, after "validates each finished game…": `` `POST /plays/size` stores the hook-set's `q` (trusted, bounded 0–100, won games only, first value stands); the stats response carries `size`, `week` (Mon→Sun village counts) and `streak` (60-day window). ``

- [ ] **Step 2: Full check**

```bash
node tools/pista-check.mjs && (cd api && node test.mjs)
```

Expected: `pista ok: …` and `api ok: validator and stats`.

- [ ] **Step 3: Production (ask the owner first, one command at a time)**

```bash
cd api && npx wrangler d1 execute goodcatch --remote --command "ALTER TABLE plays ADD COLUMN q INTEGER"
```

```bash
cd api && npx wrangler deploy
```

Then push `main` (GitHub Pages). Order matters: the API first, so the live page never posts to a missing route (it would only fail silently, but sizes would be lost).

- [ ] **Step 4: Live smoke** — on https://goodcatch.fish: `read_network_requests` shows `POST /plays/size` → 200 after a win, and `GET`/`POST` responses carry `week`, `streak`, `size`.

- [ ] **Step 5: Commit** (only with the owner's go)

```bash
git add CLAUDE.md docs/superpowers/specs/2026-10-07-pista-fisgada-banquete-design.md docs/superpowers/plans/2026-10-07-pista-fisgada-banquete.md
git commit -m "Document the hook-set, the banquet and the village comparisons"
```
