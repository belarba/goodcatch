# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Casual daily-puzzle players, the Wordle / enclose.horse crowd: a few minutes on a phone, usually in a break, then they share the result. Desktop play exists but is secondary.

## Product Purpose
Good Catch is a daily fishing puzzle. Every day everyone gets the same sea (seeded by the local date) in three modes: purse net, bottom line and sea floor. One score can go positive or negative; players chase the day's highest score, and some chase the lowest. Success is a player who comes back tomorrow and shares today's result.

## Positioning
Each mode has an exact, solver-computed best (and worst) for the day, so a player always knows how far they were from the possible. Protected animals (turtle, dolphin, shark, coral) carry negative points, which is what makes the "lowest score" side of the challenge exist.

## Operating Context
- Played at phone width (~400 px) first, desktop second.
- One static `index.html`, no build, no runtime dependencies; hosted on GitHub Pages at goodcatch.fish.
- UI in English and Portuguese; default from `navigator.language`, switchable in the menu.
- Optional tournament mode: the first haul of the day is the one that counts.
- Practice maps (purse net) offer three face-up rule cards; the player picks one (prototype on branch `prototype/cards`).

## Capabilities and Constraints
- Game logic lives between `@gen-start` and `@gen-end` and must stay DOM-free (the Node solver evaluates it).
- Exact references come from `tools/solve-net.mjs` (HiGHS, offline) and live solvers in the page; any visual change must not alter scoring.
- Score digits must be unambiguous: Pixelify Sans was rejected because its C/O, 2/8 and 5/S misread. Whatever font is chosen must pass that test.

## Brand Commitments
Only the name "Good Catch" is fixed. The current dark palette, the 12×12 pixel sprites and the Jersey 10 font are incumbent choices, not commitments (owner, 2026-09-26).

## Evidence on Hand
No testimonials, player counts or press. Do not invent any.

## Product Principles
1. The same puzzle for everyone, every day; nothing random per player.
2. A score always has a reference: the day's exact best and worst.
3. Calm enough to read in a glance on a phone; the puzzle is the only thing that should demand attention.
4. Both extremes stay open, but the high score is the main challenge.

## Accessibility & Inclusion
WCAG AA contrast is required: 4.5:1 for text, 3:1 for board pieces and UI boundaries. No formal colour-blindness requirement.
