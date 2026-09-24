# Good Catch

A daily fishing puzzle played in the browser. Live at https://goodcatch.fish (GitHub Pages, `main` branch, repo root).

## Concept
- Every day generates the same sea for everyone (seeded by the local date).
- A single score that can go positive or negative. Players chase the **highest** score or the **lowest** one, and both daily records count.
- Protected animals (turtle, dolphin, shark, coral) have negative points. Catching them is how "lowest score" players play.

## Modes
- **Purse net** (11x11 top view): drag a closed loop from the boat, up to 26 squares. Animals strictly inside are caught. Animals under the net itself escape. Rocks block the net but do not act as walls for the enclosure.
- **Bottom line** (9x12 side view): drag from the boat (row 0) to the seabed (last row), with a budget of 20.
  - Animals orthogonally adjacent to the line bite.
  - Crossing a regular fish scares it off (no points) and costs 2 squares.
  - Crossing a protected animal costs 2 squares and **counts its penalty**.
  - Only rocks block the line.

## Code
- Everything lives in one static `index.html` (inline CSS + JS, no build, no dependencies). Keep it that way until there's a real reason to split.
- Key places in the script:
  - `SP`: species, emoji, points.
  - `games`: board sizes, start cell, length budget.
  - `genNet` / `genLine`: deterministic generation (`mulberry` PRNG seeded from `DATE + ':' + game key`). `genLine` retries until a path to the seabed exists.
  - `canStep` / `touch`: drawing rules. `stepCost` handles the 2-square crossing cost.
  - `evaluate`: what gets caught (flood fill for the net, adjacency for the line).
  - `EPOCH`: the date of puzzle #1. Set it to the launch date.
- Records live in `localStorage` under `goodcatch:<date>:<game>`, always wrapped in try/catch.
- Changing generation logic changes every past and future map. That's fine before launch, but bump a version in the seed afterwards.

## Roadmap ideas
1. Compute each day's best and worst possible score (solver) and show "31 / 38".
2. Limit tries per day (or count only the first attempt for sharing).
3. Tune difficulty so both extremes are hard. Test with the practice map.
4. Replace emoji with custom illustrations.
5. Optional: a global daily leaderboard (would need a backend).

## Conventions
- UI text in English (international audience).
- Test in a browser at phone width (~400px) and desktop.
