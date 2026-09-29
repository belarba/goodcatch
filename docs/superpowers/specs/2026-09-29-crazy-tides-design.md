# Crazy tides: three absurd weekend rules in Encomenda

Date: 2026-09-29. Status: approved in chat, awaiting spec review.

## Why

The rule cards produced the only "aha" moments the old daily had, and the depth meter agrees: the
cards that change how the sea works are the deepest (Friendly dolphin was trivial on 6 of 33 maps,
Short net on 34 of 44). The owner asked for absurd rules that make the game funnier. Encomenda (the
daily since Sep 2026) has no cards, so the absurd rules arrive as a **tide of the day** on weekends,
the same for everyone, on top of the villagers' orders.

## When

- Saturdays and Sundays carry a crazy tide; weekdays are a calm sea (Encomenda as today).
- The three tides rotate over weekend days in order Drunk captain → Inverted tide → Hungry shark:
  weekend day number n = 2 × (whole weeks since `EPOCH`) + (Sunday ? 1 : 0), tide = n mod 3. So a
  Saturday/Sunday pair never repeats the previous weekend's pair.
- `crazyTide(date)` in `@gen` computes it; the `ORDER_REF` row stores the key (`k`) and, for the Drunk
  captain, the drift direction (`dd`), and the page reads the row, falling back to `crazyTide`.

## The three tides

All three keep the purse net a linear integer program, so the exact best, stars, clue and curation
keep working.

### Drunk captain (`bebado`)

- When the net is hauled the boat drifts 2 squares in the day's direction (N/S/E/W), shown on the
  card ("drifts 2 → east"). A dashed ghost boat marks the landing square from the start.
- Scoring uses the landing square as the boat: the pen must touch the ghost (side or corner), and the
  boat's current square is plain water, not fence, for the flood fill (it still takes no buoy: the
  boat sits there while the net is laid).
- The landing square is empty water (no rock, no animal), inside the board; no buoy may be dropped
  on it. The tool picks the direction among the valid ones from the day's seed.
- Open-pen hint: "Closed, but the boat will drift to the ghost: the net has to touch it there."
- The animated haul slides the boat to the ghost before hauling.

### Inverted tide (`invertida`)

- The open sea comes from a 3×3 whirlpool in the centre of the board instead of the outer ring. The
  ring becomes ordinary water that can be caught.
- The whirlpool and every square touching it (the 5×5 centre) take no buoy ("rough water"), so the
  whirlpool cannot be sealed with a few buoys to catch the whole board.
- The whirlpool squares are drawn in the open-sea ring colour; the rough ring is marked like water
  that refuses buoys (tapping it says "Rough water: no buoy holds here."). The boat never starts in
  the 5×5 centre (curation).

### Hungry shark (`faminto`)

- If at least one shark is inside the pen, the pen's sardines score 0, and its turtles and dolphins
  score 0 too (they flee the shark). The shark keeps its own −4.
- So a pen with sardines avoids sharks, while a pen full of protected animals can be cleared by
  letting a shark in.

## Engine (`@gen`)

- `evaluateBuoys`: the boat square is `boatAt(g)` (the ghost for Drunk captain, `g.start` otherwise)
  and the sea sources are the ring or, for Inverted tide, the whirlpool. `leakPath` uses the same
  sources and boat.
- `canBuoy`: also refuses the ghost square and the 5×5 centre under their tides.
- `scoreOf`: Hungry shark zeroes sardines, turtles and dolphins in a pen holding a shark.
- `boardModel` carries `dock` (boat square for scoring), `sources`, `noBuoy` and the shark rule.
- `clueFor` skips a "leaves the animal out" clue for an animal that scored 0 in the player's pen.

## Solver (`tools/net-lib.mjs`)

- Boat square = `m.dock`; source cells forced `y = 1` and no buoy; `noBuoy` cells `w = 0`.
- Hungry shark: binary `z` with `z ≥ x_s` for every shark cell and `z ≤ Σ x_s`; each sardine, turtle
  and dolphin cell scores through `s_i` with `s_i ≤ x_i`, `s_i ≤ 1 − z`, `s_i ≥ x_i − z`.
- `solve-net orders` applies the day's tide on weekend dates, curates as today (best meets exactly
  two orders) plus the tide's own validity (landing square, boat outside the centre), and writes
  `k`/`dd` into the row. The weekend rows of the existing 60 days are regenerated.

## Screen

- A tide banner above the order row on weekends: the tide's sprite, name and one-line rule, styled
  like the rule cards but not clickable ("Tide of the day" / "Maré do dia").
- Drunk captain: ghost boat (boat sprite at 40% with a dashed navy outline) on the landing square.
- Inverted tide: whirlpool squares in the ring colour, rough squares with a light navy hatch.
- Share line gains the tide icon on weekends: `🐱 Good Catch #N · Orders 🍺 ▲+35 ★★☆ 👵✗ 🦦✓ 🐦✓`
  (🍺 Drunk captain, 🌀 Inverted tide, 🦈 Hungry shark).
- Strings for names, rules, hints and blocks in English and Portuguese.

## Testing

- `depth.mjs check`: `crazyTide` rotation over two weekends; Drunk captain (a pen touching the ghost
  scores, one touching only the old boat does not); Inverted tide (a ring pen scores, rough squares
  refuse buoys); Hungry shark scoring (sardines and turtle zeroed with a shark in, not without).
- Solver self-checks, one small board per tide, including a Hungry shark board where letting the
  shark in is the best move and a min-sense case that exercises `s_i ≥ x_i − z`.
- `solve-net orders` on the regenerated weekends: every row meets exactly two orders, logged.
- Browser: a local-only `?dia=YYYY-MM-DD` override (honoured only on localhost, so players cannot
  preview future days) to open one day of each tide at ~400 px and desktop; a mutation per tide.

## Out of scope

Viagem, backend, new orders or villagers.
