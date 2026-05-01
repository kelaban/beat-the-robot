## Joker Checklist

Jokers selected from the 50-idea brainstorm; checked items are implemented.

### Scoring multipliers
- [x] **Lucky 7s** — drawing a 7 scores ×3
- [x] **The Gambler** — all scoring ×2; wrong guesses kill 2 piles instead of 1
- [x] **Compound Interest** — every 5th correct guess scores ×5
- [x] **Even Steven** — drawing an even rank (2/4/6/8/10/Q) scores ×2
- [ ] Face Value — J/Q/K each worth +20 bonus pts when stacked
- [ ] Suit Specialist — pick a suit; that suit's cards score ×2
- [ ] Black Market — spades and clubs score ×2, hearts and diamonds ×0.5
- [ ] Streak Freak — streak cap raised from ×5 to ×10
- [ ] Odd Job — odd ranks score ×2
- [ ] High Roller — cards 10+ score ×3, cards 5 and below score nothing

### Pile manipulation
- [x] **Defibrillator** — once per round: revive a dead pile (active button)
- [x] **Reshuffle** — once per round: shuffle a live pile back into deck (active button)
- [x] **Phoenix** — first dead pile auto-revives after 3 correct guesses
- [x] **Surgeon** — once per round, move the top card of a dead pile onto a live pile
- [ ] The Cooler — once per round, discard the next deck card
- [ ] Tower of Pisa — piles can stack ×2 deeper before scoring caps
- [ ] Architect — at round start, see all 9 starting cards and rearrange them

### Risk/reward toggles
- [x] **Last Stand** — when only 1 pile is alive, all scoring ×5
- [x] **Underdog** — score ×2 on guesses with <25% probability
- [x] **Sure Thing** — score ×1.5 on guesses with ≥75% probability
- [ ] All In — first guess of each round scores ×10, but a miss ends the round
- [ ] Death Wish — score ×3 on piles that are 1-deep
- [ ] Hail Mary — SAME guesses score 200 instead of 50, but normal guesses score ×0.5

### Wrong-guess softeners
- [ ] Contrarian — wrong guesses on red top cards don't kill the pile
- [ ] Black Knight — same as Contrarian but for black cards
- [ ] Cat with Nine Lives — first wrong guess each round is forgiven
- [ ] Soft Landing — wrong guesses don't reset your streak
- [ ] The Insurance — flipped piles can be revived once at round end (costs 50 pts)
- [ ] Royal Pardon — wrong guesses on face cards don't kill the pile

### Information / probability
- [x] **Card Counter** — shows count of each rank remaining in deck
- [x] **Dead Reckoning** — shows the bottom card of the deck
- [ ] ~~Peek~~ *(removed — broke the core "guessing" mechanic)*
- [ ] Suit Sniffer — show suit distribution remaining
- [ ] Echo — top of every pile shows the suit of the next deck card
- [ ] Cold Read — once per round, see the next 3 ranks (not order)

### Streak / chain
- [x] **Combo Breaker** — wrong guesses bank +1 streak for next correct hit
- [ ] Snowball — streak multiplier doesn't cap at ×5
- [ ] Quickdraw — first 3 guesses each round score ×3 if all correct
- [ ] Marathon — streak builds ×0.5 per correct (slower but uncapped)

### Deck / setup modifiers
- [x] **A Little Smaller** — no 6s; each of 2, 3, 4, 5 appears 5 times instead of 4
- [x] **A Little Bigger** — no 8s; each of 9, 10, J, Q appears 5 times instead of 4
- [x] **Dyslexic** — all 2s become 5s
- [x] **Seven Ate Nine** — all 9s become 7s
- [ ] Loaded Dice
- [ ] Hot Deck
- [ ] Stacked Hand
- [ ] Lean Deck
- [ ] Chaos Theory
- [ ] Mirror Match

### Build-around / synergy enablers
- [x] **Wildcard** — 5 cards in the deck are wild; any guess is correct when one flips (golden border)
- [ ] The Collector — gain +5 pts per joker owned, per correct guess
- [ ] Synergy Engine — every 3rd correct guess copies a random joker effect
- [ ] The Investor — start each round with -50 score; first 5 correct guesses score ×4

### Boss / legendary tier
- [ ] The Architect of Fate — see full deck order, but commit pile choices 3 cards in advance
- [ ] Robot Sympathizer — wrong guesses score points equal to half what right guesses would have

**Currently implemented: 19 jokers**
