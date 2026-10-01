---
name: Good Catch
description: A daily fishing deduction puzzle drawn as a rich pixel-art lagoon, framed in wood, parchment and gold.
colors:
  abyss: "#0B2233"
  deep-teal: "#0E4A5C"
  lagoon-surface: "#136A82"
  foam-text: "#BFE7E6"
  bark: "#2E1A0C"
  parchment: "#F6E7C1"
  parchment-edge: "#E0C58B"
  parchment-fleck: "#EEDBAE"
  log-rule: "#D9BE84"
  ink: "#3B2414"
  ink-soft: "#6B4A2A"
  cream: "#FFF1D0"
  gold: "#F2B33D"
  gold-highlight: "#FFD97A"
  gold-shade: "#B97A1F"
  sun: "#FFE27A"
  plank: "#8B5A2B"
  plank-grain: "#7A4A22"
  plank-seam: "#5E3A1A"
  plank-light: "#B97A45"
  nail: "#E8D9B0"
  driftwood: "#A08E6C"
  driftwood-highlight: "#BCAB88"
  driftwood-shade: "#7C6B4E"
  disabled-ink: "#4A3B26"
  pip-ring: "#8A6A3A"
  lost-coral: "#E8826A"
  cat-orange: "#E0703A"
  unknown-silhouette: "#1E4A5A"
  sand: "#E9CF96"
  wet-sand: "#C9A56A"
  shore-foam: "#F4FBFF"
  shallow-rim: "#9ED9D0"
  backdrop: "rgba(6,20,32,.7)"
typography:
  wordmark:
    fontFamily: "Jersey 10, ui-rounded, system-ui, sans-serif"
    fontSize: "clamp(40px, 12vw, 54px)"
    fontWeight: 400
    lineHeight: 0.9
    letterSpacing: "0.5px"
  score:
    fontFamily: "Jersey 10, ui-rounded, system-ui, sans-serif"
    fontSize: "84px"
    fontWeight: 400
    lineHeight: 0.85
  headline:
    fontFamily: "Jersey 10, ui-rounded, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 400
    lineHeight: 1
  title:
    fontFamily: "Jersey 10, ui-rounded, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 400
    lineHeight: 1
  button:
    fontFamily: "Jersey 10, ui-rounded, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 400
    lineHeight: 1
  body:
    fontFamily: "Jersey 10, ui-rounded, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 400
    lineHeight: 1.15
  dialogue:
    fontFamily: "Jersey 10, ui-rounded, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 400
    lineHeight: 1.05
  label:
    fontFamily: "Jersey 10, ui-rounded, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 400
    lineHeight: 1
  caption:
    fontFamily: "Jersey 10, ui-rounded, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1
  micro:
    fontFamily: "Jersey 10, ui-rounded, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1
rounded:
  pixel: "0px"
  pip: "50%"
spacing:
  hair: "2px"
  xs: "4px"
  sm: "6px"
  md: "10px"
  lg: "12px"
  xl: "16px"
components:
  button-gold:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pixel}"
    padding: "2px 14px 4px"
  button-gold-disabled:
    backgroundColor: "{colors.driftwood}"
    textColor: "{colors.disabled-ink}"
    rounded: "{rounded.pixel}"
  button-gold-small:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pixel}"
    padding: "0 10px 2px 6px"
  icon-button-wood:
    backgroundColor: "{colors.plank}"
    textColor: "{colors.cream}"
    rounded: "{rounded.pixel}"
    size: "48px"
  panel-parchment:
    backgroundColor: "{colors.parchment}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pixel}"
  plaque-wood:
    backgroundColor: "{colors.plank}"
    textColor: "{colors.cream}"
    rounded: "{rounded.pixel}"
  chip-tag:
    backgroundColor: "{colors.parchment}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pixel}"
    padding: "0 4px 0 0"
  cell-tag:
    backgroundColor: "{colors.parchment}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pixel}"
    padding: "0 3px"
  cell-tag-hit:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pixel}"
  week-day:
    backgroundColor: "{colors.parchment}"
    textColor: "{colors.ink-soft}"
    typography: "{typography.label}"
    rounded: "{rounded.pixel}"
    height: "52px"
  week-day-today:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.pixel}"
---

# Design System: Good Catch

## Overview

**Creative North Star: "The Window Into the Lagoon"**

The sea is not a board, it is a window. The player looks down through clear water at a real seabed whose sand, coral, rock and kelp run across square boundaries, and the three facts the puzzle asks about (bottom, depth, light) are drawn as light: a sunlit caustic net where the sun reaches, a dithered cloud shadow where it does not, a pale shelf edge where the water drops. Everything around the window is the dock's own furniture: pixel-drawn wood planks with nails, sun-faded parchment, and gold buttons, all generated as 9-slice frames from a single integer pixel grid at runtime.

The page itself is the deep water around the dock: a teal gradient (lagoon surface to abyss) under a faint 32-pixel caustic tile, so even the margins read as sea. The single font, Jersey 10, carries every word from the 84px score to the 16px weekday, always weight 400, always pixel-crisp. A cat is the voice: its face sits beside a parchment speech bubble at the top, its back is drawn on the wooden pier at the bottom of the lagoon, rod in paw, and it reappears in the 80x64 catch scene that takes the foreground when the day ends.

Density is that of a handheld game screen: one 480px column, a board scaled to the largest integer pixel multiple that fits both width and height, and furniture panels stacked beneath it. Nothing is smooth-scaled; nothing is rounded; depth comes from soft drop-shadow filters under hard pixel silhouettes.

**Key Characteristics:**
- One integer pixel grid: every canvas draws at 1x and scales by a whole factor with smoothing off; every sprite carries a 1px bark outline.
- Furniture vocabulary of five 9-slice frames (wood, parchment, tag, gold, dull), with stepped (notched) corners instead of radii.
- Jersey 10 only, weight 400, sized by role from 16px to 84px.
- Light is information: sun, shade and depth are rendered as lighting on the seabed, never as icons or outlines.
- Motion is pixel-stepped: sprites bob a pixel, selection pulses in two steps, the board animates on a 125ms tick.

## Colors

A warm dock-and-parchment palette laid over a cool teal sea: wood browns and parchment creams carry the interface, gold marks the one action and the wins, and pale sun-yellow is reserved for selection and focus.

### Primary
- **Dock Gold** (`gold`): the face of every primary button (Cast, Share, Got it, Close, Collection) and of the winning states that reuse the gold frame: the cell tag that scored 3, today's square in the week strip, rare tiles in the collection. Also the "Catch" half of the wordmark and the score numeral. Lit by **Gold Highlight** on its top and left rows and shaded by **Gold Shade** on its bottom two rows.

### Secondary
- **Sun Glint** (`sun`): selection and focus only. The four corner brackets of the selected square, the 3px focus ring, the win outline on the revealed fish squares, the "today" outline in the collection, and text selection.
- **Plank Brown** (`plank`): the wood frame around the sea, the cast plaque and the header icon buttons, with **Plank Grain** speckle, a **Plank Seam** line every five rows, a **Plank Light** top-left bevel and **Nail** heads in the four corners.

### Tertiary
- **Lost Coral** (`lost-coral`): the score numeral when the fish got away. Its only use.
- **Cat Orange** (`cat-orange`): the cat, in the face sprite, the pier sprite and the catch scene.

### Neutral
- **Abyss** (`abyss`): the html background and theme colour; the bottom of the page gradient.
- **Deep Teal** (`deep-teal`) and **Lagoon Surface** (`lagoon-surface`): the page gradient (surface at 0, deep teal at 34%, abyss at 100%), fixed behind the caustic tile.
- **Foam Text** (`foam-text`): the puzzle number and date under the wordmark, the one piece of text set directly on water.
- **Cream** (`cream`): text on wood and on water, and the wordmark's "Good".
- **Parchment** (`parchment`): the fill of every reading surface (bubble, result, log, journal, legend, dialogs) and of the small tag frame, with a **Parchment Edge** inner rule and **Parchment Fleck** grain.
- **Bark** (`bark`): the universal 1px outline of every sprite and every 9-slice frame, the 8-direction stroke around the wordmark and score, the speech-bubble tail, the catch scene's 3px border.
- **Ink** (`ink`) and **Ink Soft** (`ink-soft`): text on parchment and gold; Ink Soft for secondary text (log index, notes, weekday cells, legend group headings, the "Today's fish" caption).
- **Driftwood** (`driftwood`, with `driftwood-highlight` and `driftwood-shade`) and **Disabled Ink** (`disabled-ink`): the disabled button, the gold frame drained of colour.
- **Log Rule** (`log-rule`): the separator between fishing-log rows. **Pip Ring** (`pip-ring`): the empty-bite pip.
- **Unknown Silhouette** (`unknown-silhouette`): every pixel of a species not yet caught, and of today's fish before it is caught, so it reads as a dark shape in water.
- **Sand**, **Wet Sand**, **Shore Foam**, **Shallow Rim**: the beach strip along the bottom of the lagoon.
- **Backdrop** (`backdrop`): behind every modal dialog.

The seabed is not painted in these tokens directly. Its four floors (sand, coral rubble, rock, kelp) are drawn in warm land colours and then passed through a clear-water filter (red x0.4, green x0.88 + 14, blue x0.9 + 62) so the floor reads as lagoon turquoise while what grows on it keeps its colour. Deep squares are darkened again (red x0.34, green x0.56 + 8, blue x0.76 + 34) and cloud-shaded squares by (x0.52, x0.58, x0.66 + 6).

### Named Rules
**The Water Eats Red Rule.** Anything under the surface is filtered toward turquoise and darkened with depth; anything above it (pier, beach, cat, bobbers, the caught fish leaping out) keeps full colour. A new underwater element is drawn in true colour and run through the same filter, never hand-picked teal.

**The One Gold Rule.** Gold means the action you can take now, or a win. A surface that is neither stays parchment or wood.

**The Sun Is Selection Rule.** Sun Glint appears only on what is selected, focused or revealed. It is never a fill for a static surface.

## Typography

**Display Font:** Jersey 10 (with ui-rounded, system-ui, sans-serif)
**Body Font:** Jersey 10
**Label Font:** Jersey 10

**Character:** One condensed pixel face for everything, chosen because its digits and letters stay distinct at score sizes (Pixelify Sans was rejected for confusing C/O, 2/8 and 5/S). Hierarchy comes from size and from the bark stroke, never from weight.

### Hierarchy
- **Wordmark** (400, clamp(40px, 12vw, 54px), 0.9): "Good Catch" in the header only, cream with a gold "Catch", wrapped in a 3px 8-direction bark stroke plus a 7px soft drop.
- **Score** (400, 84px, 0.85): the "n/6" on the result and catch panels, gold (lost coral when lost) with a 4px 8-direction bark stroke.
- **Headline** (400, 34px, 1): dialog titles. The collection dialog uses 30px.
- **Button** (400, 28px, 1): gold buttons. The small Collection button drops to 22px.
- **Title** (400, 26px, 1): panel headings (Fishing log, Reading the water) and today's species name.
- **Body** (400, 22px, 1.15): the page default, log rows, streak line, the help list and the result sentence.
- **Dialogue** (400, 20px, 1.05): the cat's line in the bubble; legend keys.
- **Label** (400, 20px): chips, cell tags (20px on a 14px line), notes, week-day marks, legend group headings.
- **Caption** (400, 18px): the date under the wordmark, the "Today's fish" caption.
- **Micro** (400, 16px): weekday abbreviations in the week strip, species names in collection tiles.

### Named Rules
**The Single Face Rule.** Jersey 10 at weight 400, everywhere. Emphasis is size, colour or the bark stroke; `<b>` is reset to 400.

**The Stroke For Shouting Rule.** Only the wordmark and the score get the 8-direction bark outline. Everything else is plain text on its surface.

## Layout

A single centred column, max 480px, padded 10px 16px 40px, with a 10px gap between blocks. Top to bottom: header (48px icon button, wordmark, 48px icon button in a 48px / 1fr / 48px grid), the cat's face beside the speech bubble (54px / 1fr, 16px gap), the sea, the cast plaque, then the parchment panels (result, fishing log, today's fish and collection, the legend).

The sea is a 7x7 lagoon of 24-pixel squares plus a 32-pixel beach strip (168 x 200 logical pixels). `fit()` scales it by the largest integer factor that fits both the column width and the viewport height left above the cast plaque, with a floor of 200 device pixels, so the board and the Cast button share the first viewport on a phone. A transparent 7x7 button grid sits exactly over the water part of the canvas. The catch scene (80 x 64) uses the same integer-fit rule against its panel width (at most 400px).

Spacing is small and stepped: 2, 4, 6, 10, 12 and 16px, the larger steps reserved for gaps between the bubble and the face and between legend groups. Grids inside panels: the week strip is 7 equal columns at 4px, the collection 4 columns at 6px, the legend 2 columns (the bottom group spanning both) at 12px / 14px. The only media queries are `(hover:hover)` for the cell hover tint and `prefers-reduced-motion`.

## Elevation & Depth

Depth is a drop-shadow filter under hard pixel silhouettes. Because the frames are 9-slice images with notched corners, `filter: drop-shadow` follows the stepped outline where `box-shadow` would draw a rectangle. All shadows are the same abyss blue-black (rgba(4,16,26,...)) at different strengths; nothing is lit from a direction other than straight above.

### Shadow Vocabulary
- **Furniture** (`filter: drop-shadow(0 8px 10px rgba(4,16,26,.4))`): every wood and parchment panel, icon buttons, the cast plaque, the bubble.
- **Window** (`filter: drop-shadow(0 14px 18px rgba(4,16,26,.5))`): the sea frame only, the deepest object on the page.
- **Face** (`filter: drop-shadow(0 6px 6px rgba(4,16,26,.4))`): the cat's face sprite.
- **Wordmark drop** (`text-shadow: 0 7px 0 rgba(4,16,26,.45)` after the bark stroke): the wordmark only.

Inside the lagoon, depth is light: the shelf edge where shallow meets deep gets a dithered pale rim on the shallow side and a 3-pixel dithered shadow on the deep side; fish shadows drift across the bed; deep squares are darker and carry slow surface streaks.

### Named Rules
**The Silhouette Shadow Rule.** Shadows are filters that follow the pixel outline. A rectangular box-shadow under a notched frame is wrong.

## Shapes

There are no radii. Every frame is a 9-slice whose corner pixel is left empty, producing a one-pixel stepped notch at each corner, outlined in bark. The five frames, generated by `nine()` and exposed as `--wood9`, `--parch9`, `--tag9`, `--gold9`, `--dull9`:

- **Wood** (16px source, slice 5, drawn at 10px, round): plank fill, a seam every five rows, grain speckle, light bevel top-left, dark bevel bottom-right, four nail heads.
- **Parchment** (16px, slice 5, 10px): parchment fill, parchment-edge inner rule, flecked grain.
- **Tag** (8px, slice 3, 5-6px): the same parchment at small scale, for chips, cell tags, week days and collection tiles.
- **Gold** (12px, slice 4, 8px): gold fill, two-row highlight top and one column left, two-row shade at the bottom.
- **Dull** (12px, slice 4, 8px): the gold frame in driftwood, for disabled buttons.

Selection is drawn as eight 4px sun bars forming corner brackets (34% of the square on each arm), not an outline. The only circle in the system is the empty bite pip (50%), see Do's and Don'ts.

## Components

### Buttons
Tactile and coin-like: a slab of gold that presses down two pixels.
- **Shape:** gold 9-slice with stepped corners (8px border).
- **Primary:** ink text at 28px on gold, padding 2px 14px 4px.
- **Active:** `translateY(2px)`. No hover colour change; the press is the feedback.
- **Disabled:** the dull frame and disabled ink; default cursor. Cast is disabled until a square is selected.
- **Small:** 22px with a 24px sprite leading (the book on Collection), padding 0 10px 2px 6px.
- **Icon button (header):** 48 x 48 wood frame, centred 24px pixel sprite or the 22px language code in cream; presses 2px.

### Chips
- **Style:** tag frame (5px), parchment fill, ink text at 20px, a 24px seabed tile thumbnail leading, cut from the real seabed renderer so the chip shows the actual sand, coral, rock, kelp, shallow, deep, sun or shade.
- **Use:** the three habits of the selected square, shown inside the bubble in place of the cat's line; the legend keys reuse the same thumbnails at 32px without a frame.

### Cards / Containers
- **Parchment panel:** 10px parchment frame, ink text, furniture shadow. Result, fishing log, today's fish, legend, and every dialog body (padding 4px 6px).
- **Wood plaque (cast bar):** 10px wood frame, a single row: six bobber sprites (28px, spent ones at 30% opacity and greyscale) on the left, the gold Cast button on the right.
- **Speech bubble:** a parchment panel at least 52px tall beside the 54 x 48 cat face, with a two-layer clipped triangle tail (bark 17 x 20 under parchment 12 x 12) pointing at the face.

### Inputs / Fields
There are no text inputs. The board cells are the input.

### Navigation
None beyond the two header icon buttons (help, language) and the modal dialogs they open.

### The Sea Window (signature)
A wood-framed canvas: the lagoon, the beach and the wooden pier with the cat seen from behind, rod angled up into the water. Over it, a 7x7 grid of transparent buttons.
- **Hover (pointer devices):** a cream tint at 14%.
- **Selected:** sun corner brackets over an 18% sun tint, pulsing in two steps at 1s.
- **Cast:** a cream fishing line arcs from the rod tip to the square (quadratic curve, 520ms), a bobber lands and a pale ring spreads; a three-bite cast also splashes and the fish leaps out.
- **Read:** a tag-framed number (0-3) in the square's bottom-right corner; a 3 uses the gold frame.
- **Lost:** the fish's squares get a 4px inset sun outline and the fish sprite is drawn on them.

### Result Panel and Catch Dialog
The same content in two places: the catch dialog opens in the foreground when the day ends (live scene), the result panel stays on the page afterwards (still scene). Centred column, 10px gap: the 80x64 catch scene (3px bark border), the score, three star sprites (36px) on a win, the sentence, the week strip and streak line, then Share (and "Back to the sea" in the dialog). The won scene has a bright sky with turning sun rays and the cat hauling the golden fish up out of the water; the lost scene is overcast with only a tail diving away.

### Week Strip
Seven tag-framed days (min 52px tall, 4px gap): a 16px weekday abbreviation over the caught species sprite (28 x 22), or a mark when not caught. Today uses the gold frame. Below it, the streak line at 22px in ink, with the best streak appended when higher.

### Today's Fish and Collection
- **Today card:** the species sprite (56 x 44, drawn as the unknown silhouette until caught), the caption and the species name at 26px, and the small gold Collection n/12 button.
- **Collection dialog:** title at 30px and a 4-column grid of tag-framed tiles (40 x 34 sprite, 16px name). Rare species use the gold frame; today's species gets a 3px sun outline at 1px offset; uncaught species show the silhouette and "???".

### Fishing Log and Legend
- **Log:** newest cast first; rows in a 22px / 1fr / auto grid with 6px vertical padding: index in ink soft, the square's three habits, and three pips (a 28px sprite of today's fish per bite, an empty ring otherwise). Rows are separated by a 2px dashed log-rule line.
- **Legend ("Reading the water"):** groups for bottom, depth and light, each a 20px ink-soft heading over 32px seabed tiles with their names.

### Motion
- The board redraws on a 125ms tick: two seabed frames alternate every 8 ticks (kelp sways), caustics drift over sunny squares only, sparkles blink on sunny water, streaks move across deep water, shoreline foam laps the beach.
- Bobbers bob one pixel out of phase; the selection pulse is `steps(2)`.
- Under `prefers-reduced-motion`, all CSS animation stops, the canvas loop does not run, and casts resolve without delay.

## Do's and Don'ts

### Do:
- **Do** draw every new graphic at 1x on the integer pixel grid, with a 1px bark outline, and scale it by a whole number with smoothing off.
- **Do** frame new surfaces with one of the five 9-slice frames (wood for structure, parchment for reading, tag for small items, gold for the action or a win, dull for disabled).
- **Do** use `filter: drop-shadow` in abyss blue-black for depth (0 8px 10px at .4 for furniture).
- **Do** set every word in Jersey 10 at weight 400, choosing a size from the hierarchy above.
- **Do** run anything underwater through the clear-water filter, and express bottom, depth and light as lighting on the seabed.
- **Do** keep the board at the largest integer scale that fits beside the Cast button in the first viewport.
- **Do** make every icon a pixel sprite (the help "?" and the collection book are sprites).

### Don't:
- **Don't** use border-radius on frames, buttons or panels; corners are one-pixel steps.
- **Don't** smooth-scale a canvas or sprite, or use a fractional scale.
- **Don't** outline the board as a flat grid of boxed squares; squares are read through the water, separated only by faint corner sparkles.
- **Don't** use sun yellow as a static fill, or gold on anything that is not an action or a win.
- **Don't** add a second typeface or a bold weight, and don't stroke text other than the wordmark and the score.
- **Don't** use rectangular box-shadows under notched frames.
