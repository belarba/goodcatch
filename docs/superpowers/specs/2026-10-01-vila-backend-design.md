# A vila: daily stats and heat map on Cloudflare

Date: 2026-10-01. Status: approved in chat (owner chose Cloudflare and "score + heat map").

## Why

Roadmap item 1 and the last review: the biggest gap to enclose.horse is "how did everyone do today".
After finishing, the player sees where they stand and where the village cast.

## Hosting

- Cloudflare Workers + D1, free plan (Oct 1, 2026: 100,000 requests/day, 10 ms CPU per request; D1
  5M rows read/day, 100,000 rows written/day, 5 GB). A player makes about two requests a day.
- DNS for goodcatch.fish is at Porkbun, so the API lives at `goodcatch-api.<account>.workers.dev`.
  The site stays on GitHub Pages.
- Code in `api/` (`wrangler.toml`, `schema.sql`, `src/`), wrangler as a dev dependency. The owner
  runs `npx wrangler login` himself; deploying is a separate, confirmed step.

## Data

`plays(date TEXT, player TEXT, casts TEXT, n INTEGER, won INTEGER, created_at INTEGER,
PRIMARY KEY(date, player))`. One row per player per day; the first finished game stands
(`INSERT OR IGNORE`). `player` is a random UUID kept in `localStorage` (`goodcatch:player`);
nothing personal is sent or stored.

## API

- `POST /plays` `{date, player, casts}`, sent once when the day's game ends. The server rebuilds the
  sea from `date` with the page's own `@gen` (copied into `api/src/gen.js` by
  `node tools/sync-gen.mjs`; `pista-check` fails if the copy drifts) and accepts only a real finished
  game: date within a day of the server's UTC date, a UUID, 1–6 distinct in-board squares, a catch
  only on the last cast, or six casts without one. Answers with the day's stats.
- `GET /daily/:date?player=<uuid>`: `{players, dist: [1..6 casts, lost], you, better, heat}`.
  `better` is the share of the other players with a strictly worse result. `heat` (casts per
  square) comes only to a player who has a row that day, so the map never spoils an unfinished game.
- CORS allows `https://goodcatch.fish` and the local preview origin. Bodies over 2 KB are refused.

## Page

- When the game ends live, the page posts the play; on a later visit to a finished day it fetches
  the stats. Any failure hides the village section silently; the game never depends on the API.
- Result panel: "N fishers today · you did better than X%" and bars for 1–6 and ✕, the player's own
  bar highlighted.
- "Village map" button: toggles an overlay on the board, each square tinted by how many casts it
  got, with the count.
- `API` constant empty until deploy, which switches the feature off.

## Testing

- `node api/test.mjs`: the validator accepts real games and refuses each kind of bad one; stats on
  hand-made rows (distribution, better-than, heat only for players with a row).
- `node tools/pista-check.mjs` also checks `api/src/gen.js` against `index.html`.
- Local run: `wrangler dev` with a local D1 seeded with synthetic plays (local only), browser at
  ~400 px and desktop.
