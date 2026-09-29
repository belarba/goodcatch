# Purse net: feedback while playing (phase B) and a depth meter

Date: 2026-09-29. Status: approved in chat, awaiting spec review.

## Why

Playtest read (owner, 2026-09-29): the purse net lacks emotion, some maps are trivial and others
turn into trial and error, and the board does not explain itself. enclose.horse shows the horse's
escape route while the pen is open and fills the field when it closes. Good Catch already does the
second half (sand sweep and rope, `.c.in` / `.ov .rope`), but shows nothing while the pen is open,
which is where the player spends most of the time.

Two phases, in this order:

- **Phase B (this spec):** the sea tells the story. No rule change, no table regeneration.
- **Phase A (next spec):** curated depth. Generation and rules change, driven by the numbers the
  depth meter below produces. Weak limit cards (roadmap item 2) belong there.

## B1. Leak current

When the pen is open and at least one buoy is on the board, draw the shortest path the open sea
takes to the boat, animated as a current, and outline the gap it goes through.

- `leakPath(g)` in `@gen` (pure, no DOM), purse net only. Returns `null` when the pen is closed
  (`evaluate(g).hits` is non-null) or no buoy is placed; otherwise `{path, gap}`.
- `path`: BFS over free cells (not rock, buoy or boat), from the ring cells of `out` to any free
  cell 8-adjacent to the boat (the pen touches the boat at a side or a corner). The path is the
  list of cell keys from the ring to that cell. Ties break by BFS order, so the same board always
  draws the same path.
- `gap`: walking `path` from the sea side, the first cell that closes the pen if a buoy were put
  there (`evaluate` with that cell added to `g.marks` returns non-null `hits`). `null` when no single
  buoy closes it (two or more holes).
- Render: a dashed navy polyline through the path cell centres in the existing `.ov` SVG, with a
  CSS dash-offset animation toward the boat; the gap cell gets a solid `navy-ink` square outline
  (the current is dashed, so the two read apart). `navy-ink` measures 8.96:1 on `shallow-water` and
  6.63:1 on `open-sea-ring`; `buoy-orange` (1.69:1) and `signal-red` (2.62:1 on the ring, and
  already overloaded per the 2026-09-26 critique) were rejected. No new colour token.
- Closing one hole moves the current to the next. Closing the last one removes it and the existing
  sand/rope sweep plays.
- Reduced motion: the path is drawn static.

## B2. Buoy delta

- When a paint action changes the score of a pen that was closed before and after, spawn `+N` / `−N`
  on the painted cell with the existing `spawn(g,r,c,'cost',text)`.
- When the pen closes for the first time (open to closed), spawn the total on the boat cell.
- The `Catch:` counter pulses when its value changes.
- A drag that paints several cells shows one delta, on the cell where the drag ends.

## B3. Animated haul

On `Haul net`, before the result panel:

1. The rope tightens toward the boat (the pen cells fade in reverse sweep order).
2. Caught animals rise to the boat one by one, nearest first; the counter adds each `+p` and each
   animal shows its points. Caught protected animals flash red with `−p`. With the Release card,
   protected animals under a buoy swim to the nearest edge instead. Card extras (Costly bait's
   empty squares) are added as one final step labelled with the card.
3. The result panel opens (`renderResult`, unchanged).

- Total length at most ~1.5 s whatever the catch size (per-animal delay = min(120 ms, 1.2 s / n)).
- A tap anywhere skips to the panel. `g.busy` blocks input meanwhile, as `dropAnimate` does.
- `prefers-reduced-motion`: straight to the panel.
- The score is computed by `commit` before the animation starts; the animation only displays it,
  so skipping can never change a record.

## B4. Depth meter (`tools/depth.mjs`, dev only)

For every `CARD_REF` entry (daily and practice) and every card in its trio, solve three naive
players with HiGHS and score their buoys with the page's real `evaluate` / `scoreOf`:

- **Greedy:** the optimum when protected animals are worth 0 (it ignores penalties).
- **Near the boat:** the optimum with the pen restricted to Chebyshev distance ≤ 3 from the boat.
- **No reef:** the optimum with rocks removed; its buoys are then scored on the real board (buoys
  that would sit on a rock are dropped).

Output: one line per map and card with the optimum and each naive score as a % of it, then the
median per naive player and how many maps have a naive player at ≥ 90% (trivial). The tool reuses
`solveBuoys`, `boardModel` and `checkNet` from `solve-net.mjs`; if that needs an export, split the
shared part into a module rather than copying it. It writes nothing into `index.html`.

## Out of scope

Rule changes, generation changes, backend, the other two games.

## Testing

- `leakPath`: a Node self-check in `tools/depth.mjs` (it already loads `@gen`): a hand-built board
  with one hole returns that hole as `gap`; with the hole filled it returns `null`; with two holes
  `gap` is `null` and `path` is non-null.
- B1–B3 in the browser at ~400 px and desktop, each with a mutation (disable the piece, see the
  effect disappear), plus a haul skipped mid-animation checked against the stored record.
- No console errors; `node tools/solve-net.mjs 1` still passes its self-checks (`@gen` changed).
