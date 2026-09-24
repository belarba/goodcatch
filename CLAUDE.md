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
- Everything the page needs lives in one static `index.html` (inline CSS + JS, no build, no runtime dependencies). Dev-only Node tooling lives in `tools/` and is never loaded by the page.
- Key places in the script:
  - `// @gen-start` … `// @gen-end`: pure game logic (`SP`, PRNG, `genNet`/`genLine`, `games`, `evaluate`, `solveLine`/`solveNet`). No DOM in here: `tools/solve-net.mjs` evaluates this block in Node.
  - `SP`: species points. Names live in `STR` (`sp_<key>`), sprites in `SPRITES`.
  - `games`: board sizes, start cell, length budget.
  - `genNet` / `genLine`: deterministic generation (`mulberry` PRNG seeded from `DATE + ':' + game key`). `genLine` retries until a path to the seabed exists.
  - `stepBlock`: whether a step is allowed and, if not, why (shown to the player). Net steps that would leave no way back to the boat are refused; `returnPath` is the BFS behind that and behind "tap the boat to close".
  - `evaluate`: what gets caught (flood fill for the net, adjacency for the line).
  - `dailyReference`: the single seam for "today's best/worst". A future backend replaces this function only.
  - `NET_REF` (`// @net-ref-start` … `// @net-ref-end`): exact net best/worst per date, written by `node tools/solve-net.mjs [days] [from]`. The tool checks every optimum against `evaluate` before writing.
  - `SPRITES` / `PAL`: 12×12 pixel sprites as strings, rendered once to data URLs.
  - `STR.en` / `STR.pt`: every UI string. Add a key to both.
  - `EPOCH`: the date of puzzle #1. Set it to the launch date.
- Storage (`localStorage`, always in try/catch): `goodcatch:<date>:<game>` records, `goodcatch:tab`, `goodcatch:lang`, `goodcatch:seenHelp`.
- Changing generation logic changes every past and future map and invalidates `NET_REF`. That's fine before launch, but bump a version in the seed afterwards and regenerate the table.

## Roadmap ideas
1. Limit tries per day (or count only the first attempt for sharing). Today unlimited tries, best counts.
2. Tune difficulty so both extremes are hard. Test with the practice map.
3. Optional: a global daily leaderboard (would need a backend). Plug it in through `dailyReference`.

## Conventions
- UI in English and Portuguese: default from `navigator.language`, switchable in the menu.
- Pixel font is Jersey 10. Pixelify Sans was rejected: its C/O, 2/8 and 5/S are near-identical, which misreads scores.
- Test in a browser at phone width (~400px) and desktop.
