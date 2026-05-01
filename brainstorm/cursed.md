# Brainstorm: Infinite Escalation + Cursed Jokers

## Vision
- **Infinite rounds** — no fixed end, no win state. Play until you fail to hit a target.
- **Snowball then collapse** — build a joker engine early, cursed jokers erode it late.
- **Always forced to pick** — even if all 3 offers are curses, you must take one.

---

## Run structure

Remove the 8-round cap. Dynamic targets replace the fixed `ROUND_TARGETS` array:

```javascript
function getRoundTarget(round) {
  const BASE = [50, 120, 250, 450, 750, 1200, 2000, 3500];
  if (round <= BASE.length) return BASE[round - 1];
  return Math.floor(3500 * Math.pow(1.5, round - 8));
}
// Round 9: ~5250, Round 10: ~7875, Round 12: ~17719, Round 15: ~59895
```

Remove `runWon` phase entirely. Only end state is `runOver`. Lead with "ROUND X" as the achievement.

---

## Cursed joker pool

Add `CURSED_JOKERS` alongside `ALL_JOKERS`. Cursed jokers allow duplicates.

| ID | Display Name | Effect |
|---|---|---|
| `entropy` | ENTROPY | At round start, 1 random pile auto-kills before play begins |
| `deadweight` | DEAD WEIGHT | Wrong guesses kill 1 extra random alive pile |
| `leaky` | LEAKY BUCKET | Streak resets to 0 whenever it would reach 6 (blocks ×3+ tier) |
| `momtax` | MOMENTUM TAX | Wrong guesses subtract 25 from round score |
| `wither` | WITHER | Base score = `max(1, 10 × depth − correctCount)` — degrades as round goes on |
| `rusty` | RUSTY DECK | Round starts with 5 fewer cards in deck |

---

## Curse escalation formula

Per-slot probability of being cursed when building the 3-joker offer:

```javascript
const curseChance = Math.min(0.85, Math.max(0, (round - 3) * 0.05));
// Round 3: 0%, Round 6: 15%, Round 10: 35%, Round 14: 55%, Round 20: 85%
```

Each of the 3 offer slots independently rolls against `curseChance`. If the good joker pool is exhausted, fall back to cursed regardless.

---

## Implementation touch points

- `getRoundTarget(round)` — new function, replaces `ROUND_TARGETS[round-1]`
- `startRound()` — apply ENTROPY (kill pile) and RUSTY DECK (remove cards)
- `guess()` correct branch — apply WITHER base score, LEAKY BUCKET streak cap
- `guess()` wrong branch — apply DEAD WEIGHT (extra pile kill), MOMENTUM TAX (score penalty)
- `pickJokerOptions(ownedJokers, round)` — add `round` param, blend cursed slots
- `runOver` screen — show rounds survived + high score (localStorage)
- Remove `runWon` phase and `round >= 8` win condition check
