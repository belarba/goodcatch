# Pista: the hook-set and grandma's weekly banquet

Date: 2026-10-07. Status: approved in conversation. Touches `index.html` (Pista),
`tools/pista-check.mjs` and the village API (`api/`: schema, `src/index.js`, `src/play.js`,
`test.mjs`). `@gen` and `api/src/gen.js` are not touched.

## Why

The owner wants Pista to be more than "a Wordle with fish": one fishing moment with a bit of
skill, and a background story the player gets attached to, without adding complexity to the
puzzle. Today the story is flavour only (the cat on the pier, species of the day, a journal, the
village stats).

## Decisions taken (with the owner)

1. **The skill moment never touches the score.** Casts, stars, the village (`POST /plays`) and
   the share's `n/6` stay pure deduction. The server cannot verify a client-side timing, and
   `PRODUCT.md` holds "Deduction, not luck". The hook-set decides only the **size** of the fish.
2. **One hook-set per day, on the winning cast only.** Lost days have none.
3. **Missing the timing never loses the fish.** Whoever deduced it caught it; the tap decides
   small, good or record.
4. **Mechanic: tension bar** (owner's pick over a closing ring and a sinking bobber: simpler and
   familiar). A needle sweeps back and forth; tap with it in the green zone.
5. **Story: both layers.** Villagers give each day colour (one line in the result panel); a
   long goal ties the week together: **grandma's weekly banquet**, every catch is a dish on her
   table, Sunday is the feast.
6. **The week strip becomes calendar Mon→Sun** (was "last 7 days"), because the banquet is on
   Sunday.
7. **The village compares sizes, weeks and streaks** (owner, after the first review): see "Village
   API". Size reaches the server as the tap quality `q`, trusted, since no timing is verifiable.
8. **Later, not now:** a different table and guest list per week, and new species per week. Both
   are art-driven and the owner will draw them. The design keeps them as data (see Cast).

## The hook-set

- **When:** inside `$('cast').onclick`, on a cast with 3 matches. `casts` is saved and
  `sendPlay()` runs exactly as today **before** the hook-set: the score is final first, so closing
  the tab during the bar never drops the game from the village.
- **Flow:** the bobber lands (`LAND`, 520 ms) → the bar appears over the lagoon instead of the
  fish hopping straight to `TMAP` → the player taps **anywhere** (big target on a phone) → the size
  is saved → the existing hop → `showCatch()`.
- **No tap in ~4 s** resolves as "small". Nobody gets stuck on a screen.
- **The zone is seeded by the date** (`zoneOf(date)`), so the record is equally reachable for
  everyone and `📏 38/45 cm` compares across players. The needle's speed is fixed.
- **Look:** drawn with the Água Clara 9-slice (`nine`, wood/parchment), the needle reads as the
  cat's rod. Not a generic golf bar.
- **Reduced motion** (`prefers-reduced-motion`): the needle runs at half speed. The score is not
  at stake, so no one is locked out.
- **Quality → size:** `q` is an integer 0–100 from the needle's distance to the zone centre
  (inside the zone ≥ 90). `cmOf(q, [min,max]) = round(min + q/100·(max−min))`. Tiers: record
  `q ≥ 92`, good `q ≥ 60`, else small.

## Data

- **One new key per day:** `goodcatch:<date>:pista:q` holds the tap quality (integer 0–100); the
  size in cm is always derived (`cmOf(q, CM[species])`), so one source. Retuning `CM` later
  recomputes past sizes too, accepted. The existing record
  (`goodcatch:<date>:pista`, a JSON array of casts) does not change, so `castsOn`, `streakOf`,
  `playedDays` and `sendPlay` keep working and existing progress carries over.
- **Everything else is derived** from the per-day keys, as `streakOf` already does: the table,
  record per species, the Sunday scene. Nothing else is stored.
- **Size ranges per species** (`CM`, one `[min,max]` in cm for each of the 12 `SPECIES`, e.g.
  `sardinha:[12,20]`, `garoupa:[50,90]`; plausible real-world sizes, the owner may tune) live **outside**
  `@gen`: the server never reads a size, and any byte inside `@gen` would force `sync-gen` and an
  API redeploy. `SPECIES` itself stays as is.
- **New pure helpers** `zoneOf(date)`, `cmOf(q, range)`, `weekOf(date)` (the Monday→Sunday dates)
  and `CM` go in a second marked block, `// @meta-start` … `// @meta-end`, DOM-free, outside
  `@gen`. The block marks the boundary "the server validates this / the server ignores this":
  the API stores only `q`, never a cm, so it needs no species table.

## The table (replaces the "Last 7 days" strip in `weekHTML`)

Seven plates, Monday→Sunday of the current week. Each plate is one of:

- **caught:** the species sprite, portion in 3 tiers (small / good / record) by its cm;
- **got away:** a plate with a fishbone;
- **not played:** an empty plate;
- **future:** a covered plate.

A day won before this feature has no `q`: its plate shows the "good" portion and it never counts
as a record. Someone starting mid-week sees the earlier days empty, with no nagging text. The
streak line under the strip stays as today.

## Cast

Grandma cat is the host. The day's guest by weekday: Mon otter chef (`lontra`), Tue pelican
(`pelicano`), Wed raccoon (`guaxinim`), Thu otter, Fri pelican, Sat raccoon, Sun grandma
(`vovo`). Their 12×12 sprites already exist in `rede/index.html` and are copied over.

- The day's guest says **one line** in the result panel, by tier: small / good / record / got
  away. 4 characters × 4 lines × 2 languages, all in `STR` (`guest_<id>_<tier>`).
- The cast is a list indexed by week (`CAST[0]` only for now), which is the hook for the owner to
  rotate table and guests later with the art, with no code change beyond adding an entry.

## Sunday

After the Sunday game ends (won or lost), the result panel opens the banquet scene: an 80×64
pixel canvas like `scene`, with the table, the guests and the week's seven plates. A missed day is
an empty seat. Grandma closes the week with one line by plates filled: 0–2 / 3–5 / 6–7 ("full
table").

## Share

When caught, the share text gains a line `📏 <cm>/<max> cm` (max = the species' range top, the
same for everyone). Lost days add nothing.

## Village API

Everything rides on the call the page already makes (`sendPlay` → `VILLAGE`); any failure still
just hides the village.

1. **Size.** `ALTER TABLE plays ADD COLUMN q INTEGER`. New `POST /plays/size {date, player, q}`:
   same date/player validation as `/plays`, `q` an integer 0–100, then
   `UPDATE plays SET q=? WHERE date=? AND player=? AND won=1 AND q IS NULL` (only a won game, first
   value stands) and responds with the same stats as `/plays`. A second request because the play
   is posted before the hook-set. The page sends it right after the tap, and again on any later
   visit while the local `q` exists (idempotent, like `sendPlay`).
   `summarize` adds `size: {better, top}`: `better` = % of other winners with a `q` below mine
   (null without my `q` or others'), `top` = the day's highest `q`. Same species for everyone on a
   day and cm monotonic in `q`, so ranking by `q` is ranking by cm; the page turns `top` into
   "biggest in the village: 44 cm". Risk accepted: `q` is client-reported, someone can send 100.
2. **Village banquet.** The stats response gains `week: [{players, caught}] × 7` for the Mon→Sun
   week of the date (`SELECT date, COUNT(*), SUM(won) … WHERE date BETWEEN ? AND ? GROUP BY
   date`). The table shows the village total under each plate; the Sunday scene closes with "the
   village caught 142 fish this week". Built only from plays the server already verified.
3. **Streak.** `ALTER TABLE plays ADD COLUMN streak INTEGER`. `POST /plays` reads the player's
   row for the day before and inserts `streak = (yesterday's streak ?? 0) + 1`; the stats response
   gains `streak: {you, better}` from the day's rows (a row from before the column counts 1). The
   server only knows **finished** days, while the local streak counts days with a
   cast, so the panel shows only the server's percentile ("streak longer than 80% of the
   village") next to the local number it already shows.

Deploy (owner's go required, it is production): `npx wrangler d1 execute goodcatch --remote
--command "ALTER TABLE plays ADD COLUMN q INTEGER"` and `npx wrangler d1 execute goodcatch --remote
--command "ALTER TABLE plays ADD COLUMN streak INTEGER"` (both columns are in `schema.sql`), then
`npx wrangler deploy`. The page tolerates an API without the new fields (old deploy) by hiding
those lines.

## Edge cases

- **Reload during the hook-set:** the game is won and the `q` key is missing, so the bar reopens on
  load. No advantage: the zone is the same, reloading only buys time.
- **After the tap:** `q` is saved locally and sent (`POST /plays/size`), no second try.
- **Lost:** no hook-set; fishbone plate; the guest's "got away" line.
- **`?dia=YYYY-MM-DD`** (localhost only, already in the page) previews Sundays and partial weeks.
- **localStorage unavailable:** every read/write stays in try/catch like today; the hook-set
  still plays and `q` is still sent once, it simply is not kept locally.

## Testing

- `tools/pista-check.mjs` also loads `@meta` (≈3 lines) and asserts: `zoneOf` deterministic per
  date; `cmOf` always inside the range for q in {0, 0.5, 1}; `weekOf` of a Wednesday and of the
  following Sunday return the same Monday; every `SPECIES` id has a `CM` range.
- Mutation checks: a constant `zoneOf` seed, or `weekOf` starting on Sunday, must fail
  `pista-check`.
- `api/test.mjs`: `q` outside 0–100 or non-integer refused; size on a lost game ignored; a second
  size ignored (dropping `q IS NULL` must fail it); `size.better`/`top`; `week` has 7 entries in
  Mon→Sun order; streak with a gap in the middle. Locally against `wrangler dev` + `seed-local.mjs`.
- In the browser preview, at ~400 px and desktop: hook-set tapped in the green, outside it, and
  not tapped; `prefers-reduced-motion`; reload mid hook-set; `?dia=` on a Sunday with a full,
  gappy and empty week; the share line.

## Out of scope

- Per-week tables and guests, new species (art, owner, later; data hooks are in place).
- Friends' tables (group code + nickname): a bigger project with personal data, not now.
- Any verification of `q`: not possible from a single client tap.
- Any change to `@gen`, the puzzle, stars or `pista-check`'s existing invariants.
