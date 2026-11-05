# Good Catch

A daily fishing puzzle for the browser. Everyone fishes the same sea each day: the fish of the day has three
habits (a bottom, a depth and a light), and each cast tells you only how many of them a square has. Six casts.

- `index.html`: the daily game, served at [goodcatch.fish](https://goodcatch.fish).
- `rede/index.html`: the earlier purse-net game, kept at [goodcatch.fish/rede/](https://goodcatch.fish/rede/).

Single static files, no build step, via GitHub Pages.

## Run locally

Open `index.html` in a browser, or `python3 -m http.server` and visit http://localhost:8000.

## Deploy (GitHub Pages)

1. Settings → Pages → Deploy from branch → `main` / root.
2. The `CNAME` file sets the custom domain to `goodcatch.fish`.
3. At your registrar, point the apex domain to GitHub Pages:
   - `A` records: 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153
   - `AAAA` records: 2606:50c0:8000::153, 2606:50c0:8001::153, 2606:50c0:8002::153, 2606:50c0:8003::153
   - `CNAME` for `www` → `<your-user>.github.io`
4. Once the certificate is issued, enable "Enforce HTTPS".

## Tuning

- `EPOCH` sets which date is puzzle #1. Change it to the launch date.
- Species and points: `SP` object.
- Board sizes and line/net length: `games` object.

## Daily cards and best/worst (CARD_REF)

Every purse-net map deals three rule cards, and the result panel compares the player
with the map's best and worst possible score. The bottom line is solved in the page.
The purse net search is too slow for a phone, so each map's cards and results ship as
the `CARD_REF` table inside `index.html`, generated with:

```bash
node tools/solve-net.mjs 60
```

That fills 60 daily maps from today (pass a start date as the second argument);
`node tools/solve-net.mjs cards 24` refills the practice maps. Run it again before the
daily entries run out: a day missing from the table deals no cards and shows no range.
Changing `genNet`, `SP`, `CARDS` or the net rules invalidates the table: regenerate it.

## Map depth

```bash
node tools/depth.mjs 2026-10
```

For every `CARD_REF` map whose key starts with the prefix, solves three naive players
exactly (one ignores protected animals' penalties, one keeps the pen within 3 squares
of the boat, one ignores the reef) and prints each as a % of the card's best, then the
medians and how many map/card pairs a naive player solves to within 90% (trivial ones).
`node tools/depth.mjs check` only runs the self-checks, including `leakPath`'s.


## Fishing fight prototype (iteration 2)

On `prototype/timing-fishing`, serve the repo with `python3 -m http.server`
and open `/novo-jogo/`. One fish, three selectable behaviours, fixed seed (42).
Hold mouse, touch or Space/Enter to reel; release to ease the line. Restart repeats
the same schedule. Focus loss pauses and clears held input. No daily save or API.

Simulation: `novo-jogo/simulation.mjs` (DOM-free, 120 Hz substeps); presentation and
input: `novo-jogo/fight.mjs`. Frame deltas cap at 50 ms. All gameplay lives in
`novo-jogo/`; existing sprites and the bundled Jersey 10/OFL are retained.
Run `node tools/timing-check.mjs` (physics and input) and `node tools/pista-check.mjs`.

Tune `TUNE` in the simulation: `reel` (capture pace), `release` (tension relief),
`engage` (sustained-hold spool-up), `breakGrace` and `slackGrace` (recovery time).
`schedule()` controls force, warning time and rest/run durations. Force increases
line tension and reduces reeling efficiency. Warning phases last 0.85–1 seconds.
The constant pattern has a gentle periodic swell; impulsive fish have short strong
pulls; skittish fish have long runs with longer rests. Excess/slack risks decay
rather than resetting when the button changes.

Playtest: repeat each behaviour five times, first with seed 42, then a different
seed. Can you predict a pull from the fish turning? Do you look at the fish or only
the tension meter? Does release feel like yielding rather than waiting? If every
fish can be played with the same fixed button cadence, or repeated attempts feel
like meter maintenance, change behaviour/force tradeoffs before adding content.
Automated adaptive policies catch in about 12–16 seconds; this is balancing data,
not evidence of human enjoyment. Sustained hold, permanent release and 10 Hz tap
policies lose across five tested seeds. Human five-repetition playtesting is still
needed before calling the mechanic validated. No merge or production deployment.
