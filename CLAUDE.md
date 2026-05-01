# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # start dev server (Vite)
npm run build      # tsc type-check + Vite production build
npm run lint       # ESLint
npm run preview    # serve the production build locally
```

No tests are configured.

## Architecture

The entire game is a single React component in `src/App.jsx`. There is no routing, no state management library, no backend — everything lives in component state managed by `useState`/`useEffect`.

### State layers

There are two distinct layers of state that reset at different points:

- **Run state** (`round`, `runScore`, `ownedJokers`, `jokerOptions`) — persists across rounds, resets only on "New Run".
- **Round state** (`deck`, `piles`, `deadPiles`, `streak`, `correctCount`, etc.) — resets when `startRound()` is called at the start of each round and after joker selection.

Joker per-round state (`defibUsed`, `reshuffleUsed`, `phoenixUsed`, `phoenixTarget`, `phoenixCounter`, `bankedStreak`) also resets each round.

### Game phases

The `phase` state drives what renders in the main flex-1 slot. Only one is shown at a time:

| Phase | What's rendered |
|---|---|
| `"playing"` | 3×3 pile grid + guess buttons |
| `"roundWon"` | Joker selection screen |
| `"runOver"` | ROBOT WINS screen |
| `"runWon"` | RUN COMPLETE screen |

### Core mechanics

- **Deck**: array of 52 card objects `{rank, suit}`. `deck[0]` is always the next card to flip. `deck[deck.length-1]` is the bottom (used by Dead Reckoning joker).
- **Piles**: array of 9 arrays of cards. `pile[pile.length-1]` is the top (visible) card. Pile depth drives H/L score: `10 × pile.length`.
- **Dead piles**: tracked separately in `deadPiles[9]` boolean array; the pile card array is preserved (needed to show the peel-corner effect on dead pile cards).
- **Aces are dual-value**: A has low value 1 and high value 14. `guessProbability()` and `guess()` both handle this — correct/wrong is whichever interpretation favors the player's guess.
- **Probability**: `guessProbability()` counts favorable cards in the remaining deck (not an approximation). This value is displayed live on buttons and used to check Underdog/Sure Thing joker thresholds.

### Scoring pipeline

`guess()` → compute base score → apply joker multipliers sequentially → apply streak multiplier → `Math.floor()` the total.

`previewScore()` runs the same pipeline before a guess is made, but only for multipliers that are card-independent (can't know Lucky7/Even Steven until the card flips). Used to show guaranteed minimum on buttons.

Streak multiplier: `min(1 + floor(streak / 3), 5)` — hits ×2 at streak 3, ×5 at streak 12.

### Input

Two input paths hit the same `guess(direction, explicitPileIdx?)` function:

- **Buttons**: click triggers `guess(dir)` using `selectedPile` state.
- **Swipe (mobile)**: `onPileTouchStart/Move/End` handlers track the gesture; a flick ≥50px commits via `guess(dir, pileIdx)` directly, bypassing selection.
- **Keyboard**: arrow keys cycle piles (← →) and trigger guesses (↑ ↓ Space).

`activeMode` (`"defib"` | `"reshuffle"` | `null`) changes what pile clicks do — in active mode, clicking a pile triggers the joker ability rather than selecting for a guess.

### Jokers

All 13 implemented jokers live in `ALL_JOKERS`. Three categories by behavior:

1. **Passive multipliers** (Lucky 7, Gambler, Compound Interest, Even Steven, Last Stand, Underdog, Sure Thing) — applied in `guess()` and previewed in `previewScore()`.
2. **Active abilities** (Defibrillator, Reshuffle) — gated by `activeMode`; each usable once per round, tracked with `defibUsed`/`reshuffleUsed`.
3. **Passive triggers** (Phoenix, Card Counter, Dead Reckoning, Combo Breaker) — Phoenix tracks its own counter state; Counter/Dead Reckoning just render extra UI when owned.

`window.storage` is used for first-visit onboarding persistence (not localStorage directly — caller is expected to provide this API).

## Design principles (from `design/design.md`)

- **DOS solitaire aesthetic**: teal `#008080` background, hard 3px black box-shadows, `VT323` + `Press Start 2P` fonts (loaded from Google Fonts on mount), no gradients or soft shadows.
- **Always-visible scoring math**: live formula in the terminal bar, guaranteed score + odds % on every guess button.
- **Mobile-first**: flick gestures, viewport-fit layout (`100dvh`, no scroll), cards scale via CSS container queries.
- **One thing at a time**: the `flex: 1 1 0` center slot renders exactly one phase's content. Do not add content outside this constraint.
- **Transparent randomness**: probabilities computed from actual remaining deck, not approximations. Don't add "feels more fair" adjustments.

## Joker backlog

`jokers.md` tracks the full joker idea list with checkboxes. 13 are implemented; unchecked items are candidates for future rounds. The file notes which were deliberately excluded (e.g. Peek — broke the guessing mechanic).
