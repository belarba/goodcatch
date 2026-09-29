# Good Catch

A daily fishing puzzle for the browser. Everyone gets the same sea each day.
Go for the highest score, or the lowest: protected animals take points away.

- **Purse net**: draw a closed loop from the boat. Everything inside is caught.
- **Bottom line**: draw a line from the boat to the seabed. Everything touching it bites.

Single static file (`index.html`), no build step. Served at [goodcatch.fish](https://goodcatch.fish) via GitHub Pages.

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

