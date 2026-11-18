# Descida — história de pescador Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Who did not catch the big fish shares a seeded, exaggerated fish story instead of the bar; who caught it gets a boast line above the bar.

**Architecture:** One pure block in `descida/index.html` (`// @historia-start` … `// @historia-end`) holding the banks and `fishStory`; `shareText` calls it. A Node check reads the block like `tools/descida-en.mjs` reads the banks.

**Tech Stack:** Inline JS in a static page; Node for the dev-only check. No dependencies.

**Spec:** `docs/superpowers/specs/2026-11-18-descida-historia-de-pescador-design.md`

## Global Constraints
- Story banks: `OPEN`, `BEAST`, `ESCAPE`, `EXCUSE`, 40 items each; `BOAST` 20 items, each containing `{cm}`. Every bank is `{pt:[…],en:[…]}`, aligned by position.
- `ESCAPE` items never use ele/ela (he/she): any beast fits.
- The story never names the snag object, the depth, the layer, the rank or the points.
- Pick per bank: `N = 40` (20 for `BOAST`), `c = Math.floor(n/N)`, shuffle `0..N-1` with `mulberry(seedFrom(`${player}:historia:${bank}:${c}`))`, take `perm[n % N]`; `n = num(date)`; `player = playerId() || ''`.
- PT texts approved: the first 15 of each bank as written in the spec (BOAST: the 10 in the spec), in order.

## Review Focus
- Storage blocked (`playerId()` null) → story still appears, seeded with `''`.
- Past day from the diary (practice) → same rule; the date in the header is that day's.
- English page → English story at the same positions.
- Reload on the same day → identical text.
- A piece ending with an emoji (`👐`) or `?` → no stray period or double space when joined.

---

### Task 1: Banks, `fishStory`, check tool

**Files:**
- Modify: `descida/index.html` (new block right above `function shareText`, ~line 1056)
- Create: `tools/historia-check.mjs`

**Interfaces:**
- Produces: `fishStory({n, player, en, caught, cm}) -> string` — `caught:false` → `OPEN + ' ' + BEAST + ' ' + ESCAPE + ' ' + EXCUSE` as two lines (`OPEN BEAST` / `ESCAPE EXCUSE`); `caught:true` → `BOAST` with `{cm}` replaced by `cm`.
- Consumes: `mulberry`, `seedFrom` (already module-level in the page).

- [ ] **Step 1: Write `tools/historia-check.mjs`** that slices the block between the markers, evaluates it with `mulberry`/`seedFrom` taken from `index.html` (`function seedFrom` / `function mulberry` lines), and exits 1 listing failures for:
  - bank sizes 40/40/40/40/20, `pt.length === en.length`;
  - each piece trimmed, no double space, `BEAST` ends in `.`, `OPEN` ends without punctuation, every `BOAST` has `{cm}`;
  - `ESCAPE` has no `/\b(ele|ela)\b/i` and no `/\b(he|she)\b/i`;
  - for players `'a'`, `'b'`, `''` and days 1..400: every window of 40 consecutive days within one cycle has 40 distinct `BEAST` picks; same input twice → same text;
  - on day 10, players `'a'..'e'` don't all tell the same story;
  - the longest possible story (max of each bank joined) is ≤ 280 characters.
- [ ] **Step 2: Run** `node tools/historia-check.mjs` → expected FAIL `@historia-start not found`.
- [ ] **Step 3: Add the block** with the 4 banks + `BOAST` (PT approved items first, completed to 40/20 in the same tone; EN aligned) and `fishStory`.
- [ ] **Step 4: Run** `node tools/historia-check.mjs` → expected `ok`.
- [ ] **Step 5: Commit** `descida/index.html tools/historia-check.mjs`.

### Task 2: `shareText` uses it

**Files:** Modify `descida/index.html` `shareText` (~line 1056).

- [ ] **Step 1:** `shareText` — not caught: `🎣 Good Catch · ${dm(date)}\n${fishStory(...)}\ngoodcatch.fish`; caught: header, boast line, bar, `Rank … · … pts`, link.
- [ ] **Step 2: Verify in the browser** at ~400px: localhost `?dia=` a snagged day and a caught day (seed localStorage), PT and EN; the textarea shows the story; reload keeps it.
- [ ] **Step 3:** Add one line to `CLAUDE.md` (Descida layout) naming the block and `node tools/historia-check.mjs`. Commit.
