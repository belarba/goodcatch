# Pista: a daily deduction prototype

Date: 2026-09-30. Status: approved. A throwaway prototype on its own page, `novo-jogo/index.html`
(goodcatch.fish/novo-jogo/), built on the `novo-jogo` branch, to playtest against the purse net. The live
game is not touched and nothing reaches `main` without the owner's go.

## Why

Playtest feedback on the purse net: "I didn't understand how to play, not even with the help" and
"it said the pen must touch the boat, I have no idea how to fix that". The enclosure rule needs
spatial reasoning before the first move makes sense. The owner wants a daily that is instigating,
fun and challenging, and chose to test a deduction core instead: find the fish of the day from
clues, Mastermind style ("Mordidas", count-only feedback).

## Measured before designing

A throwaway script (not committed) played the rule over the whole feature space:

- 4 bottoms × 2 depths × 2 lights = 16 combinations: the optimal player needs 3.06 casts on
  average, worst case 4. A player who casts at any combination still consistent with the clues
  needs 3.16 (worst seen 6). Without deduction: 8.5.
- Larger spaces (30 to 54 combinations) add about one cast and no strategy: optimal and
  consistent players stay within 0.15 casts. The skill is keeping the clues consistent, as in
  Wordle, not optimising information.
- With all 16 combinations every opening cast is optimal, so a memorised tree works every day.
  With 12 of 16 present, 30 days gave 29 distinct sets of optimal openings; the mean drops to 2.75.
- Over 200 random 12-of-16 maps: the optimal worst case (par) is 4 on all 200, and the worst
  consistent player (adversarial casts and answer, computed exactly) catches in 5 (27 maps) or
  6 (173), never more. Six casts is the budget that never punishes a player who deduces.

## Rule

- The fish of the day has three habits: a bottom (sand, coral, rock, kelp), a depth (shallow,
  deep) and a light (sun, shade).
- Tapping a square selects it and shows its three features in a bar; **Cast** confirms. A cast
  answers only how many habits the square meets (🐟⬜⬜ … 🐟🐟🐟), never which ones. Three is a
  catch.
- Six casts. Any square with the three habits catches.

## Sea

- 7×7 open water; a beach and a wooden pier run along the bottom edge, where the cat fishes.
  (The first build had a 2×2 island; the owner swapped it for the cat on a pier, Sep 30.)
- Depth: each column has a shelf row (3–5, wandering by at most one row between neighbours);
  squares from the shelf down to the beach are shallow, the rest deep.
- Light: two cloud ellipses; a square whose centre is inside one is in shade.
- Bottom: contiguous patches from seeded points (nearest point wins).
- Seeded from `DATE + ':pista'` (then `:pista:2`, …). The generator retries until exactly 12 of the
  16 combinations are present; the fish is drawn among those 12. Measured over 90 days from
  2026-09-30 (`node tools/pista-check.mjs`): tries median 7, max 50; par 4 on all 90; the worst
  consistent player catches in 5 (18 days) or 6 (72); 84 distinct sets of missing combinations.

## Par and stars

- Par is the constant 4: the optimal worst case over the present combinations, measured 4 on every
  sampled map. The check asserts it for every generated day instead of the page computing it.
- ★★★ in 4 casts or fewer, ★★ in 5, ★ in 6. Lost: no stars.

## Screen

- Each cast leaves a badge on its square with the count.
- A log lists the casts: `coral · deep · shade → 🐟🐟⬜`.
- Lost after six: the squares that would have caught light up and the cat names the three habits.

## Daily

- One game per day, saved in `goodcatch:<date>:pista` (casts), so a reload restores it.
  localStorage in try/catch, as in the game.
- Share: `🎣 Good Catch · Pista #N  4/6 ★★☆` plus one 🐟/⬜ row per cast; lost shows `X/6`.
  `#N` counts from `EPOCH`. The link in the share is `goodcatch.fish/novo-jogo/`.
- `?dia=YYYY-MM-DD` on localhost only.

## Help, strings, measurement

- A three-line rule screen on the first visit (`goodcatch:pista:seenHelp`), reopened by "?".
  A guided tutorial waits for playtest.
- Every string in EN and PT, default from `navigator.language`.
- GoatCounter (`belarba`), skipped on localhost: page view `/novo-jogo/`, then `pista/caught-N`
  or `pista/lost` once per day, comparable with `haul/*`.

## Code

- `novo-jogo/index.html`: standalone static page, not linked from the game. Copies the sprites, palette,
  font and tokens it needs from `index.html` (a copy, not a shared module: the prototype may be
  deleted). Pure logic in a `// @gen-start` … `// @gen-end` block, no DOM.
- `tools/pista-check.mjs`: evaluates that block in Node and checks, over 60 days: the same date
  gives the same sea, exactly 12 combinations present, the fish among them, par = 4 (memoised
  minimax), and the worst consistent player, computed exactly, catches within six casts.

## Out of scope

A moving boat with fuel, weather, a journal of discoveries, species with their own habits, a
backend, and any change to `index.html`.
