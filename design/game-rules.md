
## Game Rules

### Core loop

A run consists of 8 rounds with escalating score targets:

| Round | Target |
|-------|--------|
| 1 | 50 |
| 2 | 120 |
| 3 | 250 |
| 4 | 450 |
| 5 | 750 |
| 6 | 1,200 |
| 7 | 2,000 |
| 8 | 3,500 |

Each round starts with a fresh shuffled 52-card deck. 9 cards are dealt face-up in a 3×3 grid as starting piles. The remaining 43 cards form the deck.

### How a round plays

1. The player selects a pile and guesses **HIGHER**, **LOWER**, or **SAME** for the next deck card vs. the top of that pile.
2. The next card flips onto the chosen pile.
3. **Correct** guess → pile grows, points are scored, deck shrinks. Player guesses again.
4. **Wrong** guess → pile flips face-down (dead). The killed card peeks out from the bent corner of the flipped card so players can see what beat them.
5. The round ends as soon as the player **hits the score target**. They then choose 1 of 3 random jokers for the rest of the run.
6. The round is **lost** if all 9 piles die OR the deck is exhausted before reaching the target.

### Scoring

- **Higher / Lower**: `10 × stack depth` per correct guess. First guess on a pile = 10 pts, second guess = 20 pts, third = 30 pts...
- **Same** (matching rank): flat 50 pts AND revives all dead piles.
- **Streak multiplier**: 3 correct in a row = ×2, 6 = ×3, 9 = ×4, 12+ = ×5 (capped). Wrong guess resets streak to 0.
- Joker multipliers stack multiplicatively on top.

### Special rules

- **Aces are wild** — high (14) or low (1), whichever helps the player's guess.
- **Same rank counts as a miss** for higher/lower guesses (only SAME succeeds on a tie).

### Controls

- **Mobile**: flick a card UP for HIGHER, DOWN for LOWER. The card follows your finger with a tilt + drop-shadow glow as you cross the threshold. Tap to select for SAME via button.
- **Desktop keyboard**: ← → cycle alive piles, ↑ HIGHER, ↓ LOWER, Space SAME, 1–9 directly select a pile.

---
