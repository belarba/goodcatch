# Prototype: Encomenda (the cat's orders)

Date: 2026-09-29. Status: approved in chat, awaiting spec review. Playtest prototype, reached with
`?modo=encomenda`; the daily game stays the default and unchanged.

## Why

Owner, after phase A: the game still is not something people want to open every day. The puzzle
has no *pain*: the player is a generic boat maximising a number, nobody roots for it, and "% of the
best" measures without making anyone care. enclose.horse has a cute horse that wants out. Two loops
will be tested as separate prototypes (this one, then *Viagem*); a growing world comes after, around
the loop that wins. The daily challenge and the comparison with others stay the spine (the backend
for "how others did" is roadmap item 1, not part of this).

## The fantasy

A **cat fisherman** (Animal Crossing tone). Cats love fish: the want is obvious and kind. Turtles
and dolphins are the cat's neighbours, never food. The boat's speech bubble becomes the cat's voice.
Three villagers place orders each day; fishing is free, an order met pays a bonus.

## Rules

- The daily purse-net map (same generation, phase A rules: protected animals refuse buoys). No rule
  cards in this mode: the orders are the day's twist.
- Three orders a day, drawn from four villagers, each wanting one species:
  - Otter chef — golden fish (`dourada`)
  - Pelican at the fish shop — sardines (`sardinha`)
  - Raccoon at the market — squid (`lula`)
  - Grandma cat — lobster (`lagosta`)
- An order is "at least **q** of its species in the catch" and pays a bonus **B** once. q is 2–4
  (lobster 1–2), sized from what the map holds; B = 4 × q (lobster: 8 × q), so a bigger order pays more.
- Score = the catch as today + the bonuses of the orders met. Protected animals still cost points.
- Orders are generated in `@gen` from `<date>:pedido`, deterministic like the map.
- **Not every order fits:** the day's best meets exactly two of the three. Curation (offline, like
  phase A) retries order rolls, then map variants, until that holds.

## Solver and table

- The order bonus is linear: one binary `o_j` per order with `q_j · o_j ≤ Σ x_i` over that species'
  cells, objective `+ B_j · o_j`. `solveBuoys` takes `m.orders = [{sp, q, b}]`.
- A new table `ORDER_REF` (`// @order-ref-start` … `// @order-ref-end`), written by
  `node tools/solve-net.mjs orders [days] [from]`: per date the generation seed, the three orders,
  best/worst and the best buoys, the same shape as a `CARD_REF` row plus `o`.

## Screen (`?modo=encomenda`)

- The card row becomes an **order row**: three villager tiles (12×12 sprite, species sprite, "2 ×"
  and "+8"). While the player fences, each tile shows live progress ("1/2") and a ✓ when met, so the
  pen is read against the orders at every buoy.
- The boat shows the cat. The bubble speaks as the cat: new hint lines in both languages (hungry,
  lazy, dramatic), not a rewrite of every string: `hint_*` for the open/closed/far states, the
  protected block ("That's Tortuga, my neighbour!") and the result verdicts.
- Result panel: the orders met as chips with their bonus, then stars and the clue as in phase A.
- Share: `🐱 Good Catch #5 · Encomenda ▲+42 ★★☆ 🦦✓ 🐦✓ 🦝✗`.
- Records in `goodcatch:<date>:encomenda`, separate from the daily's.

## Sprites

Five new 12×12 sprites in the existing `SPRITES`/`PAL` system: the cat (on the boat) and the four
villagers. Drafted in code, reviewed on screen at ~400 px next to the fish; a second frame via
`FRAME2` like the animals.

## Out of scope

Backend and comparison with others, the growing world, rule cards in this mode, Viagem.

## Testing

- `depth.mjs check`: order generation is deterministic per date; a board where the catch holds 2
  sardines meets `{sardinha, q:2}` and not `q:3`; solver self-check where the best needs the order
  bonus to beat a bigger plain pen.
- `solve-net.mjs orders` over the table: every row's best meets exactly two orders (logged).
- Browser at ~400 px and desktop: order tiles tick live, bonus lands in the score and the share,
  the cat speaks, the daily mode is untouched (`?modo` absent shows cards, not orders). A mutation per
  feature.
