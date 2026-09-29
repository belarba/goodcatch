# Purse net phase A: a dilemma, curated depth, stars and a clue

Date: 2026-09-29. Status: approved in chat, awaiting spec review. Follows
`2026-09-29-net-feedback-design.md` (phase B, shipped).

## Why

Owner after phase B: better, but still no strategy, no pull, no "aha". The depth meter
(`tools/depth.mjs`, first full run, 252 map/card pairs with a positive best) says why:

- A naive player reaches ≥ 90% of the best on 129 of 252 (97 of the 180 daily ones).
- Ignoring protected animals' penalties has a median of 86% of the best.
- 195 of 213 optima (Release excluded) put a buoy on a protected animal, 360 buoys in all: an
  animal under a buoy escapes, so a protected animal costs one buoy and is never a dilemma.

## A2. Protected animals refuse buoys

- A buoy cannot be dropped on a protected animal (`SP[sp].p < 0`). The rule is one pure function
  in `@gen`, `canBuoy(g, r, c)` (false on a protected animal unless the card is Release); `paint`
  uses it to block with a new reason `protected`, said in the boat's bubble like the other blocks. The square stays water: the
  open sea flows through it, so a protected animal is a hole the net cannot plug. The player
  swallows the penalty, nets around it, or gives up that school.
- Release becomes the card that lifts the rule: "Buoys may sit on protected animals: +3 each".
  `scoreOf` is unchanged (it already pays `release` per protected animal under a buoy); only the
  block is lifted.
- `solveBuoys`: `w = 0` on protected cells unless `card.release`.
- Strings in `STR.en` / `STR.pt`: the block, Release's rule, the net help paragraph.
- Every `CARD_REF` row (60 days + 24 practice maps) is regenerated under the new rule, since the
  optima change. `CARD_REF` already covers 2026-09-28 → 2026-11-26.

## A1. Curated depth

The page generates a map from its seed and cannot run HiGHS, so curation happens in the tool,
which records its choice in `CARD_REF`.

- For each map key (`<date>:rede`, `carta:<i>`) the tool tries generation seeds `key`, then
  `key:1`, `key:2`, … up to `MAX_VARIANTS` (10). For a candidate it deals the trio as today (bonus
  reachable, gap ≤ 10%), then solves the three naive players of `depth.mjs` for the trio's cards.
  It accepts the first candidate where, for every card, no naive player reaches `DEEP`
  (starting at 0.80) of that card's best. No-reef is skipped for High tide.
- If none passes, it keeps the candidate whose worst card is deepest (smallest max naive ratio),
  and logs `SHALLOW`.
- `CARD_REF` rows become `{"s": "<generation seed>", "c": [trio]}`; `s` is omitted when it equals
  the key. Every reader moves to the new shape: `newMap` (generates from `row.s ?? seed`, deals
  `row.c`), `dailyReference`, `tools/net-lib.mjs`, `tools/depth.mjs`.
- `DEEP` and `MAX_VARIANTS` are calibrated with the meter after A2: pick the strictest `DEEP` at
  which most days pass within `MAX_VARIANTS`. The numbers chosen go into the commit and CLAUDE.md.
- The naive players move from `depth.mjs` into `net-lib.mjs` so both tools use one definition.

## I1. Stars

- Against the exact best of the map (the same reference as the `%` line): ★ ≥ 70%, ★★ ≥ 85%,
  ★★★ = 100%. Shown under the big number in the result panel and in the share line
  (`🕸️ Purse net · Fin ★★☆ 88%`). Empty stars are shown (☆) so the next tier is visible.
- Only with an exact reference and a positive best; an uncounted haul shows no stars.

## I2. A clue after the haul

Below 100%, one sentence comparing the player's pen with the optimum of the card they played
(`CARD_REF` row for `g.cardKey`), naming the idea they missed without drawing the answer. The first
rule that applies wins:

1. **Protected:** the player's catch has a protected species the best catch does not →
   "The best catch leaves the {animal} out."
2. **Reef:** the best pen borders rock squares on a side of the boat (N/S/E/W by the rock squares'
   centre relative to the boat) where the player's pen borders none →
   "The best catch leans on the reef {north|south|east|west} of the boat."
3. **Species:** the species with the largest shortfall (best count − player count > 0) →
   "The best catch has {n} {animal}; yours has {m}."
4. **Side:** the two pens' centres lie on different sides of the boat →
   "The best catch is {north|south|east|west} of the boat."

- `clueFor(g, bestMarks)` in `@gen` (pure): returns `{k, …params}` or `null`; the page turns it into
  a string. Tested in Node with hand-built boards, one per rule, plus the "no clue at 100%" case.
- Shown on counted and uncounted hauls alike (it is a clue, not a record), never after "Show top
  catch" (the answer is on the board).

## Out of scope

Buoys between squares (roadmap), backend, the other two games.

## Testing

- `node tools/depth.mjs check` gains: a buoy on a protected animal is refused by `canBuoy` and by the
  solver (a board whose only closing square holds a turtle), and allowed with
  Release; `clueFor` cases above.
- `node tools/solve-net.mjs` self-checks still pass; a full run logs no `UNFAIR`, and the number of
  `SHALLOW` days is reported.
- The meter's before/after numbers (trivial pairs, greedy median, optima with a buoy on a protected
  animal) are reported from command output.
- Browser at ~400 px and desktop, with a mutation per feature: blocked tap on a protected animal
  (and allowed with Release), stars in panel and share, the clue for a deliberately bad pen.
