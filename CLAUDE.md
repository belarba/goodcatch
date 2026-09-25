# Good Catch

A daily fishing puzzle played in the browser. Live at https://goodcatch.fish (GitHub Pages, `main` branch, repo root).

## Concept
- Every day generates the same sea for everyone (seeded by the local date).
- A single score that can go positive or negative. Players chase the **highest** score or the **lowest** one, and both daily records count.
- Protected animals (turtle, dolphin, shark, coral) have negative points. Catching them is how "lowest score" players play.

## Modes
- **Purse net** (11x11 top view): tap or paint squares to drop up to 14 buoys. Buoys, rocks and the boat are fence; the board edge is open sea. The catch is every square the open sea cannot reach (4-directional) in the pen(s) touching the boat. Animals under a buoy escape. Rocks come in reef formations so they do real fencing work.
- **Bottom line** (9x12 side view): tap or paint squares to lay the line from the boat (row 0) to the seabed (last row), with a budget of 20. The marks must form one chain that never touches itself (`lineChain`).
  - Animals orthogonally adjacent to the line bite.
  - A regular fish under the line is scared off (no points) and costs 2 squares.
  - A protected animal under the line costs 2 squares and **counts its penalty**.
  - Rocks can't hold line.
- **Sea floor** (7x9 side view, `kind:'drop'`): the sea is packed in layers of fish. Tap a column: the hook drops to the first animal and hauls up its whole 4-connected school, worth N². What is above sinks to fill the gap (gravity per column). Turtles can't be hooked and block the column. 6 casts; the game ends by itself. The best possible score is solved live (`solveDrop`, memoised DFS, ~5 ms) and shown only on the result panel.

## Code
- Everything the page needs lives in one static `index.html` (inline CSS + JS, no build, no runtime dependencies). Dev-only Node tooling lives in `tools/` and is never loaded by the page.
- Key places in the script:
  - `// @gen-start` … `// @gen-end`: pure game logic (`SP`, PRNG, `genNet`/`genLine`, `games`, `evaluate`/`evaluateBuoys`, `solveLine`, `packCells`). No DOM in here: `tools/solve-net.mjs` evaluates this block in Node.
  - `SP`: species points. Names live in `STR` (`sp_<key>`), sprites in `SPRITES`.
  - `games`: board sizes, line length budget (`maxLen`), buoy budget (`maxBuoys`), casts (`lances`). `buoy: true` marks the net; `kind:'drop'` the sea floor.
  - `genNet` / `genLine`: deterministic generation (`mulberry` PRNG seeded from `DATE + ':' + game key`). Each one sets `g.start` (the boat) first: any cell for the net, any column of row 0 for the line. `genLine` retries until a path to the seabed exists.
  - Input (both games): `paint` toggles a mark, a buoy or a square of line (the first touch of a drag decides add or remove; fast drags are filled in square by square). `g.marks` holds cell keys and `g.history` feeds Undo. Blocked marks say why in the boat's speech bubble.
  - `lineChain`: turns the line's marks into the ordered path `evaluate` scores, or says why it can't (`start`, `go`, `self`). `solveLine` enforces the same no-touch rule, and `tools/solve-net.mjs` fails if any optimum breaks `lineChain`.
  - `evaluate`: what gets caught (`evaluateBuoys` flood fill for the net, adjacency for the line). The sea floor keeps its state in `g.cells` (`genDrop`, `dropFish`, `solveDrop`, all pure) and mirrors it into `g.grid[..].sp` through `syncDrop` so `render` stays shared; `dropAnimate` runs hook → haul → sink before committing the move.
  - `dailyReference`: the single seam for "today's best/worst". A future backend replaces this function only.
  - `NET_REF` (`// @net-ref-start` … `// @net-ref-end`): exact net best/worst per date plus the buoys of each (`packCells`), written by `node tools/solve-net.mjs [days] [from]` after `(cd tools && npm install)`. The tool solves an integer program with HiGHS (dev dependency only), checks every optimum against `evaluate` and self-checks a two-pen case before writing. A date missing from the table shows no range; keep it generated well ahead. The line's range is solved live in a Web Worker.
  - `SPRITES` / `PAL`: 12×12 pixel sprites as strings, rendered once to data URLs. `FRAME2` derives a second frame per species (`shift` moves a region by a pixel); the pair becomes a 2-frame sheet animated in CSS, kept in phase across re-renders by `--clock`.
  - `STR.en` / `STR.pt`: every UI string. Add a key to both.
  - `EPOCH`: the date of puzzle #1 (2026-09-25).
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
