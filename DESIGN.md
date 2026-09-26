---
name: Good Catch
description: A daily fishing puzzle on a daylight pixel board. Go for the best catch, or the worst.
colors:
  seafoam-page: "#E4F4F2"
  white-stock: "#FFFFFF"
  foam-tint: "#EEF7F6"
  harbour-slate: "#5F8A92"
  navy-ink: "#10324A"
  tide-grey: "#48656F"
  buoy-orange: "#F08A24"
  rust-text: "#A04C08"
  seabed-sand: "#E8C77E"
  kelp-green: "#157A4C"
  signal-red: "#C8352A"
  shallow-water: "#9EDFE4"
  open-sea-ring: "#6CC4D2"
  pen-sand: "#F7E6B0"
  protect-glow: "rgba(214,60,45,.42)"
  sprite-outline: "#051019"
typography:
  display:
    fontFamily: "\"Jersey 10\", ui-rounded, system-ui, sans-serif"
    fontSize: "clamp(36px, 10vw, 44px)"
    fontWeight: 400
    lineHeight: 1
  score:
    fontFamily: "\"Jersey 10\", ui-rounded, system-ui, sans-serif"
    fontSize: "72px"
    fontWeight: 400
    lineHeight: 1
  headline:
    fontFamily: "\"Jersey 10\", ui-rounded, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 400
  title:
    fontFamily: "\"Jersey 10\", ui-rounded, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 400
  label:
    fontFamily: "\"Jersey 10\", ui-rounded, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1
  body:
    fontFamily: "Figtree, system-ui, -apple-system, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: "Figtree, system-ui, -apple-system, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  xs: "6px"
  sm: "8px"
  md: "10px"
  lg: "12px"
  xl: "14px"
spacing:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "16px"
components:
  button:
    backgroundColor: "{colors.white-stock}"
    textColor: "{colors.navy-ink}"
    typography: "{typography.title}"
    rounded: "{rounded.lg}"
    padding: "10px 12px"
  button-hover:
    backgroundColor: "{colors.foam-tint}"
  button-primary:
    backgroundColor: "{colors.buoy-orange}"
    textColor: "{colors.navy-ink}"
    typography: "{typography.title}"
    rounded: "{rounded.lg}"
    padding: "10px 12px"
  button-disabled:
    backgroundColor: "transparent"
    textColor: "{colors.harbour-slate}"
    rounded: "{rounded.lg}"
  icon-button:
    backgroundColor: "{colors.white-stock}"
    textColor: "{colors.navy-ink}"
    rounded: "{rounded.md}"
    size: "40px"
  icon-button-hover:
    backgroundColor: "{colors.pen-sand}"
  switch-tab:
    backgroundColor: "{colors.white-stock}"
    textColor: "{colors.navy-ink}"
    typography: "{typography.title}"
    rounded: "{rounded.lg}"
    height: "52px"
  switch-tab-selected:
    backgroundColor: "{colors.buoy-orange}"
    textColor: "{colors.navy-ink}"
  rule-card:
    backgroundColor: "{colors.white-stock}"
    textColor: "{colors.navy-ink}"
    rounded: "{rounded.md}"
    padding: "5px 5px 7px"
  result-panel:
    backgroundColor: "{colors.white-stock}"
    textColor: "{colors.navy-ink}"
    rounded: "{rounded.xl}"
    padding: "18px"
  practice-badge:
    backgroundColor: "{colors.pen-sand}"
    textColor: "{colors.navy-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.xs}"
    padding: "0 7px"
  speech-bubble:
    backgroundColor: "{colors.white-stock}"
    textColor: "{colors.navy-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "6px 10px"
  legend:
    backgroundColor: "{colors.white-stock}"
    textColor: "{colors.navy-ink}"
    rounded: "{rounded.lg}"
    padding: "6px 4px"
---

# Design System: Good Catch

## Overview

**Creative North Star: "The Daylight Harbour Board"**

Good Catch is the category-standard daily-puzzle board, done with care: a seafoam page, white card-stock surfaces and navy ink outlines, with the pixel sea as the only thing that asks for attention. It is a canon build held to the bar of enclose.horse and Puzzmo; its job is to be read in a glance on a phone in a break, then left alone. Everything off the board is quiet, outlined and flat; everything on the board is ranked by how much it matters to the rule.

The board is a strict stack of meaning. The fence (12×12 warm stone blocks, outlined like Mario terrain) is the loudest layer, because the net's first rule is that rocks fence. The player's pen comes next: sand fill with a 3px navy rope drawn on the true perimeter of what the flood fill encloses, sweeping in from the boat. Animals, as outlined 12×12 two-frame pixel sprites, sit above flat turquoise water. The water is the quietest layer: a 1px 8% navy grid and a deeper wavy outer ring that means open sea.

The world refuses the dark teal game grid it replaced. Colour carries score meaning, never decoration: green is gain, red is loss, and protected animals sit on a soft red glow.

**Key Characteristics:**
- Daylight: light page, white surfaces, navy ink as the single outline colour.
- 2px navy outlines on every interactive surface; depth comes from outline, not shadow.
- Two voices of type: Jersey 10 for every number and label, Figtree for sentences.
- Pixel sprites are the fun: 12×12, 1px near-black outline, two-frame idle loop.
- Board layer order is fence > pen > animals > water, and it is enforced.

## Colors

A daylight sea palette: pale seafoam and white carry the page, navy ink draws every edge, one warm orange marks the action, and green/red are reserved for score.

### Primary
- **Buoy Orange** (`buoy-orange`): the primary action (the haul button, the selected game tab), the focus ring, the boat's ping, and the ring around a picked rule card. Always paired with navy ink text (5.30:1), never white.
- **Rust Text** (`rust-text`): the orange's text-safe form (5.95:1 on white, 5.24:1 on page). Used for "Catch" in the wordmark, notes on the result range, and the border of a picked card.

### Secondary
- **Kelp Green** (`kelp-green`): positive points and good hits (catch squares tinted at 14%, the "▲" arrow sprite, best-score tab labels, positive result numbers).
- **Signal Red** (`signal-red`): negative only. Penalties, bad hits (tinted at 16%), blocked-move marks, the "▼" arrow sprite, alert hints, negative result numbers.
- **Protected Glow** (`protect-glow`, rgba(214,60,45,.42)): a radial red glow behind every protected animal (turtle, dolphin, shark, coral), drawn as a background image so it layers over the pen's sand. It follows the card: an animal a card turns positive loses the glow.

### Tertiary
- **Shallow Water** (`shallow-water`): the net board's water.
- **Open Sea Ring** (`open-sea-ring`): the outermost ring of net cells, deeper than the water with white wave ticks, meaning "the sea reaches here". Line boards instead grade from `#D6F1F3` surface row down through an HSL depth ramp (hue 186→194, darker with depth).
- **Pen Sand** (`pen-sand`): the enclosed pen fill, the practice badge, the pressed legend item, icon-button hover and text selection.
- **Seabed Sand** (`seabed-sand`): the 8px seabed strip under the line and sea-floor boards.

### Neutral
- **Seafoam Page** (`seafoam-page`): the page background.
- **White Stock** (`white-stock`): buttons, tabs, cards, panel, dialogs, legend, bubble, menu.
- **Foam Tint** (`foam-tint`): hover fill for outlined buttons, tabs, menu and legend items; range-bar track.
- **Navy Ink** (`navy-ink`): all text, all outlines, the board frame, rope, hook line (11.74:1 on page).
- **Tide Grey** (`tide-grey`): secondary text, hints, date, record rows, card rule text (6.24:1 on white, 5.50:1 on page).
- **Harbour Slate** (`harbour-slate`): disabled button stroke and text, range-bar border, unpicked card border once a card is picked. Boundary use only (3.79:1 on white).
- **Sprite Outline** (`sprite-outline`): the 1px outline the sprite renderer draws around every sprite pixel.

### Named Rules
**The Score Owns Red And Green Rule.** Green means points gained and red means points lost. Neither appears for decoration, branding or generic "error" chrome; a red element on screen is always a cost.

**The Navy Edge Rule.** There is one outline colour, navy ink, at 2px on controls and 3px on the board frame and rope. Grey borders only mean "inactive".

**The Orange Is Action Rule.** Buoy orange marks where the player acts next (primary button, selected tab, focus, picked card, boat ping). Text in orange uses rust text.

## Typography

**Display Font:** Jersey 10 (with ui-rounded, system-ui, sans-serif)
**Body Font:** Figtree (with system-ui, -apple-system, sans-serif)

**Character:** Jersey 10 is the arcade scoreboard: every number, button, tab and label speaks in it, and its digits stay unambiguous at a glance. Figtree is the friendly explainer, used only for full sentences.

### Hierarchy
- **Display** (400, clamp(36px, 10vw, 44px), 1): the "Good Catch" wordmark only.
- **Score** (400, 72px, 1): the final score on the result panel, coloured by sign (green, red, or tide grey for zero).
- **Headline** (400, 28px): the verdict line and dialog titles.
- **Title** (400, 22px): buttons, game tabs, buoy/length count, record rows, catch chips, dialog subheads.
- **Label** (400, 18px, line-height 1): the date, legend points, card names and corner ranks, badge, bubble, range ends, small buttons.
- **Body** (400, 15px, 1.5): hints and help text.
- **Caption** (400, 13px): range label and notes; rule-card text drops to 12px/1.25 to fit three cards across a phone.

### Named Rules
**The Digits Must Read Rule.** Any face that carries a number must keep 2/8, 5/S and 0/O distinct at 18px. Pixelify Sans failed that test and is out.

**The Pixel Speaks, The Sans Explains Rule.** Jersey 10 for anything a player scans (numbers, labels, controls); Figtree for anything a player reads as a sentence. Never set a sentence paragraph in Jersey 10.

## Layout

A single centred column (max-width 540px, padding 12px 16px 32px, 10px gap) built phone-first at ~400px. Order from top: header (40px icon button, centred wordmark and date, 40px icon button), game switcher (two tabs on a row, the third spans full width), practice rule cards when present, the board, a meta row (count, badge, points), a live hint line, a three-column control row (undo, clear, and a 1.5× wider primary), then the legend as a nine-column strip.

The board fills the column and sizes itself against the viewport so it never pushes the controls off screen (`min(100%, max(260px, cols/rows × (100svh − 360px)))`). Sprites snap to whole multiples of 14px (90% of a cell, floored) so pixels stay crisp at any width. Spacing runs on a tight 4/6/8/10/16px rhythm; interior gaps are 6–10px, never larger.

## Elevation & Depth

Flat by default: depth is conveyed by the navy outline and by tonal steps (page, white stock, foam tint), not by shadow. Soft navy-tinted shadows appear only on things that float above the board or the page, and on the rule cards, which are physical objects.

### Shadow Vocabulary
- **Board frame** (`box-shadow: 0 0 0 3px #10324A`): the board's 3px ink frame, drawn as a spread so the grid is not inset.
- **Card rest** (`box-shadow: 0 3px 8px rgba(16,50,74,.14)`): rule cards lying on the table.
- **Card picked** (`box-shadow: 0 0 0 3px #F08A24, 0 10px 18px rgba(16,50,74,.22)`): the chosen card, lifted with an orange ring.
- **Bubble** (`box-shadow: 0 4px 12px rgba(16,50,74,.22)`): the boat's speech bubble.
- **Menu** (`box-shadow: 0 8px 24px rgba(16,50,74,.18)`): the popover menu.
- **Result panel** (`box-shadow: 0 10px 30px rgba(16,50,74,.2)`): the result panel laid over the board.

### Named Rules
**The Floaters Only Rule.** Buttons, tabs and the legend are flat and outlined. A shadow means the element sits above something else (panel, menu, bubble) or is a card you can pick up. All shadows are soft and navy-tinted; there are no hard offset shadows.

## Shapes

Friendly rounded rectangles outlined in navy. Radius steps by size: 6px for small inner shapes (card art window, badge, hit squares), 8px for list items inside a container, 10px for icon buttons, cards and the bubble, 12px for buttons, tabs, the board, the legend and the menu, 14px for the result panel and dialogs. On the board, pixels stay square (`image-rendering: pixelated`); the only circle is the boat's ping. Rule cards fan at −3°, 0°, +3° like a dealt hand.

## Components

### Buttons
Outlined, chunky and arcade-legible.
- **Shape:** gently rounded (12px), 2px navy ink stroke.
- **Default:** white stock, navy ink text in Jersey 10 at 22px, padding 10px 12px. Hover fills foam tint.
- **Primary:** buoy orange fill with navy ink text; hover lightens the orange.
- **Disabled:** transparent fill, harbour slate stroke and text, default cursor.
- **Focus:** 3px buoy-orange outline, 2px offset, on every button.
- **Icon button:** 40px square, 10px radius, holding a 24px pixel sprite; hover fills pen sand.

### Game Switcher
Three outlined tabs (52px min height, 12px radius), each with a 28px sprite, the mode name and, when a record exists, the best score in kelp green below. The selected tab fills buoy orange and its record turns navy ink.

### Rule Cards (signature)
Face-up playing cards offered on practice purse-net maps.
- **Stock:** white, 2px navy outline, 10px radius, resting shadow; three across in a fan (−3°, 0°, +3°), straightening and lifting 3px on hover.
- **Art window:** 46px tall, 6px radius, 1.5px ink border, holding a 28px sprite on the pale surface tint, the same for every card, always at full opacity.
- **Rank:** a Jersey 10 value in the top-left corner of the art window, only on cards that change points.
- **Picked:** lifts 6px, straightens, rust border, orange ring and deeper shadow; its rule text turns navy ink. Unpicked cards drop to a slate border and lose their shadow; art and text stay at full contrast. The pick is final for the map.
- **Motion:** 0.25s ease-out (`cubic-bezier(.16,1,.3,1)`) on transform and shadow; none under reduced motion.

### Board
The signature surface. Water is a generated pixel canvas (14px per cell): flat turquoise with sparse white wave ticks, 8% navy grid lines, deeper ring at the edge. Rocks are full-cell outlined stone blocks. The pen fills pen sand with a staggered sweep outward from the boat (0.45s per cell, 45ms step) and its 3px square-capped navy rope fades in 120ms behind. Protected animals sit on a soft red radial glow. The outer ring never holds animals: it is open sea and can never be caught. Catch and loss squares get a 3px green or red rounded outline with a 14–16% tint. Buoys are white with a navy band and an orange cap. The boat carries a soft white halo and an orange ping until the first mark.

### Result Panel
Laid over the board: 96% white, 2px navy outline, 14px radius, 18px padding, floated with the panel shadow. It stacks the 72px score, a 28px verdict, catch chips with sprites, a range bar (foam track, slate border, red-to-green fill) with the day's exact worst and best at its ends, and the player's records.

### Legend
A white strip with a navy outline and 12px radius, nine columns of 28px sprite over its Jersey 10 value in green or red. Items hover to foam tint and press to pen sand (spotlighting that species on the board).

### Speech Bubble
The boat's voice for blocked moves: white, 2px navy outline, 10px radius, Jersey 10 at 18px, a navy-outlined tail pointing at the boat; pops in over 0.18s and fades after 2.5s. While no rule card is picked it becomes the pick prompt: anchored to the top of the board, tail up toward the cards, it stays and bobs gently until a card is chosen (still, with reduced motion).

### Pixel Sprites
12×12 maps on a named palette, rendered once to data URLs with a 1px sprite-outline border and a second frame shifted one pixel, looped in 1.2s steps and phase-locked across re-renders. UI icons (menu, up/down arrows) are sprites from the same set, not font glyphs.

## Do's and Don'ts

### Do:
- **Do** keep the board layer order fence > pen > animals > water: rocks stay the highest-contrast element on the board, water the lowest.
- **Do** draw the pen's rope on the true perimeter of the enclosed cells, exactly what the 4-directional flood fill catches.
- **Do** outline every interactive surface in navy ink at 2px and fill the primary action with buoy orange under navy text.
- **Do** set every number and control label in Jersey 10 and every sentence in Figtree.
- **Do** measure every new pair against WCAG AA: 4.5:1 for text, 3:1 for board pieces and UI boundaries (e.g. navy ink on page 11.74:1, tide grey on white 6.24:1, sprite outline #051019 against every water tone at least 7.2:1).
- **Do** draw new icons as 12×12 sprites in the shared palette.
- **Do** honour `prefers-reduced-motion`: sweeps, pings, sprite frames and card transitions stop.

### Don't:
- **Don't** use green or red for anything but points gained and lost; protected status is the red glow, and it follows the card's values.
- **Don't** return to the dark teal game grid this world replaced.
- **Don't** put orange text on light surfaces; use rust text.
- **Don't** give the lobster or any species the buoy's orange-and-white; the lobster is blue so the buoy stays unique.
- **Don't** add shadows to flat controls or use hard offset shadows; shadows are soft, navy-tinted, and only for floating elements and cards.
- **Don't** set a score in a face whose 2/8, 5/S or 0/O can be confused (Pixelify Sans is rejected).
