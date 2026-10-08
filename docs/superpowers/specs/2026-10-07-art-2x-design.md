# Pista art at 2x

Date: 2026-10-07. Status: approved in conversation. Branch `pista-fisgada-banquete`. Owner draws, Claude
builds the kit now and the switch later.

## Why

The owner wants richer pixel art: still pixelated, with more pixels. Today every sprite is a letter map
inside `index.html` on one integer grid (a lagoon square is 24 art px, the lagoon 168 px, scenes 80×64),
and the page scales the whole grid by an integer (`fit()`).

## Decisions (with the owner)

1. **Everything doubles together.** One grid at 2x: lagoon square 48 px, lagoon 336 px, scenes 160×128.
   No mixed densities ("mixels") at any point.
2. **Art lives as PNG in `art/`, embedded into `index.html` by a command.** The PNG drawn in
   Aseprite/Piskel is the source. `node tools/art-embed.mjs` writes data URIs between
   `// @art-start` … `// @art-end` (the `solve-net` / `CARD_REF` precedent); `pista-check` fails when the
   embedded copy is stale. The game stays one offline file with nothing to wait for.
3. **All at once.** The owner draws the whole set first; the game switches to 2x in one go. Until then
   the page is untouched and nothing new shows in the game.
4. **Cats and fish also get dense portraits** (owner, 2026-10-08: denser art for the cats and the fish;
   the map is fine as planned). A portrait is drawn at 4× today's map and used only where the cat or fish is
   shown large; on the lagoon they use the 2x sprite, so nothing on the map is finer than the map.

## The set (owner)

| Piece | Today | 2x canvas | File |
|---|---|---|---|
| 12 fish of the day | map ≤ 16×14 | 2× its map | `art/fish/<species id>.png` |
| 4 guests | 12×12 | 24×24 | `art/guests/<id>.png` (`lontra`, `pelicano`, `guaxinim`, `vovo`) |
| UI sprites in `M` (cat face/happy/back, fish, tail, bobber, star, book, help, plate, bone, cover) | as mapped | 2× its map | `art/ui/<name>.png` |
| Fish on a plate, per species (replaces the tinted generic `M.fish` in `banquet`) | — | 24×14 | `art/plate/<species id>.png` |
| Catch scene background, won and lost (sky, sea, pier, cat) | 80×64 by code | 160×128 | `art/scenes/catch-won.png`, `art/scenes/catch-lost.png` |
| Banquet background (wall, table, seated guests) | 80×64 by code | 160×128 | `art/scenes/banquet.png` |
| **Portraits:** 12 fish | map ≤ 16×14 | 4× its map (e.g. garoupa 64×36) | `art/portrait/<species id>.png` |
| **Portraits:** cat face and happy face | 16×14 | 64×56 | `art/portrait/catFace.png`, `art/portrait/catHappy.png` |

Where each version shows:

| Context | Today | After the switch |
|---|---|---|
| Cat face beside the speech bubble (`.face`) | 16×14 map in a 54×48 box | portrait, 64×56 CSS px (1 art px = 1 CSS px) |
| Fish in the catch scene (`bigFish`) | map scaled ×2 in the 80×64 scene | portrait, 1:1 on the 160×128 scene grid |
| Journal cards (`.mon .sp`) and today's fish (`div.today>.sp`) | map in 40×34 / 56×44 boxes | portrait, at an integer fraction or 1:1 |
| Lagoon, pier cat, week strip, banquet dishes | maps | 2x sprites (the grid of the lagoon) |

The cat's back is not a portrait: it lives on the pier (2x sprite) and in the catch scene background.

`M.starOff` stays derived from the star (`index.html`), so it is not drawn.

## Drawing rules

- **The outline is the owner's.** The automatic 1 px outline `drawMap` adds today would look thin at 2x,
  so 2x art carries its own; suggested 1 px in `#2E1A0C` (today's outline tone).
- Transparent background, 8-bit PNG, exact canvas size from the table.
- Palette free; the kit shows today's colours to stay in the Água Clara world (`DESIGN.md`).
- **Scenes are backgrounds only.** What moves stays code-drawn on top: the hopping fish, the line, the
  splash and rings, sun rays, the week's dishes on the banquet table.
- **The lagoon floor stays code-painted** (it carries the clues: bottom, depth, light). Claude re-tunes the
  painter to 48 px per square at the switch; owner textures can replace it later.

## The kit (now)

`node tools/art-kit.mjs` writes `tools/art-kit/` (git-ignored):

- every piece of the set as a **template**: today's art scaled ×2 (×4 for portraits) nearest-neighbour, at
  the exact canvas size, as a proportion guide (silhouette without the automatic outline);
- for scenes, a ×2 snapshot of today's code-drawn scene from `tools/art-kit-ref/` (committed, captured
  from the browser) as a layout guide, animated parts included;
- a gallery page that is a **checklist**: each piece shows its target path in `art/` and whether that file
  exists and has the right size.

The 1x letter-map tools (`sprite-import.mjs`, `png.mjs`) stay until the switch.

## Status (2026-10-08)

The owner asked to see the drafts in the game before drawing, so the switch ran early with placeholder art:
`art/` holds drafts (`tools/art-draw.mjs` for fish and characters, `tools/art-draft.mjs` for UI), embedded by
`tools/art-embed.mjs`. The lagoon is painted at 48 px a square (tried behind `?lagoa=48`, owner approved): floor
textures, caustics, shadow dither, shelf lips and beach at native 2x, the 24 px decorations smoothed with Scale2x.
The catch scene and the banquet are painted at 160×128 the same way (code-drawn backgrounds with dithered
gradients, 1 px lines, planks and wood grain); owner-drawn backgrounds can still replace them later.

## The switch (later, its own plan once `art/` is complete)

- `tools/art-embed.mjs` + the `@art` block + the `pista-check` staleness check.
- Sprites drawn from embedded PNGs at 2x; `drawMap`'s outline kept only where letter maps remain (none
  expected).
- `fit()`, `GW`/`GH`, `S`, the seabed painter, `scene()` and `banquet()` move to the 2x grid; scene
  backgrounds become the bottom layer.
- `SPECIES` keeps ids, palettes and rarity in `@gen` (needed by `speciesOf`); fish art is looked up by id
  outside `@gen`, so the API copy (`api/src/gen.js`) does not change.
- `DESIGN.md` updated to the 2x grid. Letter maps and `sprite-import.mjs` retired.

## Out of scope

- Drawing the art (owner).
- Any gameplay change; any change to `@gen` or the API.
