# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Casual daily-puzzle players, the Wordle / enclose.horse crowd: a few minutes on a phone, usually in a break, then they share the result. Desktop play exists but is secondary.

## Product Purpose
Good Catch is a daily fishing puzzle (goodcatch.fish, `index.html`, internally "Pista"). Everyone fishes the same sea each day (seeded by the local date): the fish of the day has three habits (a bottom, a depth and a light), and each cast answers only how many of them a square has. Six casts. A species of the day, a fish collection and a streak give a reason to come back. Success is a player who comes back tomorrow and shares today's result.

The earlier game (purse net with villager orders and rule cards) lives at goodcatch.fish/rede/ (`rede/index.html`), kept to return to later; it was replaced as the main game on Oct 1, 2026 because playtesters could not follow its enclosure rule.

## Positioning
Every day's sea is checked offline so the puzzle is fair: exactly 12 of the 16 habit combinations exist, the best possible play needs at most 4 casts, and a player who keeps the clues consistent always catches the fish within six. Stars (1–2 / 3 / 4–6 casts) separate deducers. Owner references for its look: Animal Crossing / Stardew, Alto's / Monument Valley, rich pixel art (Celeste, Eastward).

## Operating Context
- Played at phone width (~400 px) first, desktop second.
- One static `index.html` (and `rede/index.html` for the old game), no build, no runtime dependencies; hosted on GitHub Pages at goodcatch.fish.
- UI in English and Portuguese; default from `navigator.language`, switchable in the menu.
- One game a day, saved on the device; a streak counts the days in a row with at least one cast. (The old game: three counted hauls a day.)

## Capabilities and Constraints
- Game logic lives between `@gen-start` and `@gen-end` and must stay DOM-free (`tools/pista-check.mjs` evaluates it in Node); any visual change must not alter the rule.
- Score digits must be unambiguous: Pixelify Sans was rejected because its C/O, 2/8 and 5/S misread. Whatever font is chosen must pass that test.

## Brand Commitments
Only the name "Good Catch" is fixed. The look ("Água Clara": a pixel-art lagoon seen through clear water, wood and parchment UI, Jersey 10) was chosen by the owner on Sep 30, 2026; the orange cat fishing from a pier is the game's character.

## Evidence on Hand
No testimonials, player counts or press. Do not invent any.

## Product Principles
1. The same puzzle for everyone, every day; nothing random per player.
2. Deduction, not luck: the clues alone are always enough to catch the fish within the six casts.
3. Calm enough to read in a glance on a phone; the puzzle is the only thing that should demand attention.
4. A result always has a reference: casts out of six, stars, and the streak.

## Accessibility & Inclusion
WCAG AA contrast is required: 4.5:1 for text, 3:1 for board pieces and UI boundaries. No formal colour-blindness requirement.
