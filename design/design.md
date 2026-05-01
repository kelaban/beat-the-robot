## Design Principles

1. **DOS solitaire aesthetic** — teal background, chunky black borders with hard 3px shadows, VT323 + Press Start 2P fonts, classic Win 3.1 title bar with `_ □ ×` buttons, terminal-green message bar with blinking cursor. No smooth gradients, no soft shadows.

2. **Robot card backs** — pixel-art robot face on dark navy circuit-grid, neon green corner bolts. Replaces the standard playing-card pattern to lean into the "robot" theme.

3. **Always-visible scoring math** — players should never have to guess what they'll score. The terminal shows the live formula. Each guess button shows guaranteed points and odds %. Conditional joker bonuses are listed in the selection message.

4. **Mobile-first, desktop-equal** — single-handed thumb play with flick-to-guess. Cards scale to viewport via container queries. Whole game must always fit inside the viewport (no scrolling).

5. **One thing at a time in the main slot** — the flex-1 slot in the middle of the screen renders either the play grid OR the joker chooser OR the run-end screen, never multiple. Prevents layout overflow.

6. **Decisions over multipliers** — when picking new jokers, prefer ones that create *strategic decisions* over flat multipliers. Active abilities (Defibrillator, Reshuffle), conditional triggers (Underdog, Last Stand), and synergy enablers are more interesting than "X scores ×2."

7. **Don't break the core mechanic** — Beat the Robot is fundamentally a *guessing* game. Information jokers (Card Counter, Dead Reckoning) shift odds without eliminating uncertainty. Full-information jokers like Peek are excluded.

8. **Run structure (Balatro-style)** — escalating round targets, joker selection between rounds, builds compound across a run. Failure means starting a fresh run, but the ascent stays under ~20 minutes.

9. **Stretch jokers across categories** — every joker pool offering should feel like a real choice between archetypes (multiplier vs. utility vs. info vs. comeback). Avoid duplicating effects within a tier.

10. **Tactile feedback** — flick gestures, score floaters with breakdowns (`+240 [L7×3 GMB×2]`), pulse animations on score/streak ticks, card flip on death, peeled corner reveals. Every action should *feel* like something happened.

11. **First-time onboarding** — rules modal opens automatically on first visit (persisted via storage), shrinks toward the `?` button on close so players know where to find it again.

12. **Transparent randomness** — probabilities for guesses are computed from the actual remaining deck, not approximations. Card Counter exposes the underlying state. The game doesn't lie about odds.
