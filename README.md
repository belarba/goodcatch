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
