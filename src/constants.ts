import type { Card, Joker, Direction, JokerId } from "./types";

export const SUITS = ["♠", "♥", "♦", "♣"] as const;
export const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] as const;

export const RANK_VALUE: Record<string, number> = {
  A: 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 11,
  Q: 12,
  K: 13,
};

export const EVEN_RANKS = new Set(["2", "4", "6", "8", "10"]);

export const ROUND_TARGETS = [50, 120, 250, 450, 750, 1200, 1800, 2800, 4200, 6000, 8500, 12000];

export const WILDCARD_COUNT = 2;

export const UNDERDOG_MULTIPLIER = 5;
export const UNDERDOG_THRESHOLD = 0.5;
export const LASTSTAND_MULTIPLIER = 10;
export const LUCKY7_MULTIPLIER = 3;
export const LUCKY5_MULTIPLIER = 3;
export const LUCKY5_RANK = "5";
export const LUCKYGUESS_THRESHOLD = 0.2;

export const ALL_JOKERS: Joker[] = [
  { id: "777", name: "777", desc: `Guessing on a 7 scores ×${LUCKY7_MULTIPLIER}.`, color: "#ffcc00", rarity: "common" },
  { id: "555", name: "555", desc: `Guessing on a ${LUCKY5_RANK} scores ×${LUCKY5_MULTIPLIER}.`, color: "#ffcc00", rarity: "common" },
  { id: "compound", name: "COMPOUND INT", desc: "Every 5th correct guess scores ×5.", color: "#00ffaa", rarity: "common" },
  { id: "even", name: "EVEN STEVEN", desc: "Guessing on an even rank (2/4/6/8/10) scores ×2.", color: "#88ddff", rarity: "common" },
  { id: "laststand", name: "LAST STAND", desc: `When only 1 pile is alive, all scoring ×${LASTSTAND_MULTIPLIER}.`, color: "#ff8800", rarity: "common" },
  { id: "underdog", name: "UNDERDOG", desc: `Correct guesses with <${Math.round(UNDERDOG_THRESHOLD * 100)}% chance score ×${UNDERDOG_MULTIPLIER}.`, color: "#cc66ff", rarity: "common" },
  { id: "surething", name: "SURE THING", desc: "Correct guesses with ≥60% chance score ×1.5.", color: "#66ff66", rarity: "common" },
  { id: "luckyguess", name: "LUCKY GUESS", desc: "Unlikely guesses and streaks revive piles.", color: "#ff3355", rarity: "uncommon" },
  { id: "wildcard", name: "WILDCARD", desc: `${WILDCARD_COUNT} cards in the deck are wild — any guess is correct.`, color: "#ffd700", rarity: "uncommon" },
  { id: "phoenix", name: "PHOENIX", desc: "First dead pile auto-revives after 3 correct guesses.", color: "#ff6600", rarity: "uncommon" },
  { id: "deadreck", name: "DEAD RECKONING", desc: "Shows the bottom 5 cards of the deck.", color: "#ddaa00", rarity: "common" },
];

export const CURSED_DECK_MOD: Joker[] = [
  { id: "smaller", name: "A LITTLE SMALLER", desc: "No 6s. Each of 2,3,4,5 appears 5 times instead of 4.", color: "#cc2222", cursed: true },
  { id: "bigger", name: "A LITTLE BIGGER", desc: "No 8s. Each of 9,10,J,Q appears 5 times instead of 4.", color: "#cc2222", cursed: true },
  { id: "dyslexic", name: "DYSLEXIC", desc: "All 2s become 5s.", color: "#cc2222", cursed: true },
  { id: "sevennine", name: "SEVEN ATE NINE", desc: "All 9s become 7s.", color: "#cc2222", cursed: true },
];

export const CURSED_GAMEPLAY: Joker[] = [
  { id: "sticky", name: "STICKY BUTTONS", desc: "Piles must be guessed left to right — you cannot choose.", color: "#cc2222", cursed: true },
  { id: "gambler", name: "THE GAMBLER", desc: "All scores ×2. Wrong guesses kill 2 piles.", color: "#cc2222", cursed: true },
  { id: "hardwayout", name: "HARD WAY OUT", desc: "Every 5th guess, you cannot pick the highest-probability option.", color: "#cc2222", cursed: true },
  { id: "reshuffle", name: "AUTO-RESHUFFLE", desc: "Piles auto-shuffle when 10+ cards.", color: "#cc2222", cursed: true },
];

export const CURSED_JOKERS = [...CURSED_DECK_MOD, ...CURSED_GAMEPLAY];

export function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const s of SUITS) for (const r of RANKS) deck.push({ rank: r, suit: s });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function applyJokerEffects(deck: Card[], jokerIds: string[]): Card[] {
  let result = [...deck];

  if (jokerIds.includes("smaller")) {
    const filtered = result.filter(c => c.rank !== "6");
    ["5", "4", "3", "2"].forEach((r, i) => filtered.push({ rank: r, suit: SUITS[i % 4] }));
    for (let i = filtered.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
    }
    result = filtered;
  }

  if (jokerIds.includes("bigger")) {
    const filtered = result.filter(c => c.rank !== "8");
    ["Q", "J", "10", "9"].forEach((r, i) => filtered.push({ rank: r, suit: SUITS[i % 4] }));
    for (let i = filtered.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
    }
    result = filtered;
  }

  if (jokerIds.includes("dyslexic")) {
    result = result.map(c => c.rank === "2" ? { ...c, rank: "5" } : c);
  }

  if (jokerIds.includes("sevennine")) {
    result = result.map(c => c.rank === "9" ? { ...c, rank: "7" } : c);
  }

  if (jokerIds.includes("wildcard")) {
    const wildCard = { rank: "W", suit: "★", wild: true };
    for (let i = 0; i < WILDCARD_COUNT; i++) {
      const pos = Math.floor(Math.random() * (result.length + 1));
      result.splice(pos, 0, wildCard);
    }
  }

  return result;
}

export function pickJokerOptions(owned: Joker[], round: number): Joker[] {
  if (round % 3 === 2) {
    const alreadyOwned = owned.filter((j) => j.cursed).map((j) => j.id);
    const cursePool = Math.floor((round - 2) / 3) % 2 === 0 ? CURSED_DECK_MOD : CURSED_GAMEPLAY;
    const available = cursePool.filter((j) => !alreadyOwned.includes(j.id));
    const pool = available.length >= 2 ? available : cursePool;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 2);
  }

  const available = ALL_JOKERS.filter((j) => !owned.find((o) => o.id === j.id));
  const offerUncommon = round > 1 && round % 3 === 1;

  if (offerUncommon) {
    const uncommon = available.filter((j) => j.rarity === "uncommon");
    const common = available.filter((j) => j.rarity === "common");
    const shuffledUncommon = [...uncommon].sort(() => Math.random() - 0.5);
    const shuffledCommon = [...common].sort(() => Math.random() - 0.5);
    return [
      ...shuffledUncommon.slice(0, 1),
      ...shuffledCommon.slice(0, 2),
    ];
  }

  const commonOnly = available.filter((j) => j.rarity === "common");
  const shuffled = [...commonOnly].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(3, shuffled.length));
}

export function guessProbability(top: Card, direction: Direction, deckRemaining: Card[]): number {
  if (top.wild) return 1;
  if (deckRemaining.length === 0) return 0;
  const topIsAce = top.rank === "A";
  const topLow = topIsAce ? 1 : RANK_VALUE[top.rank];
  const topHigh = topIsAce ? 14 : RANK_VALUE[top.rank];

  let favorable = 0;
  for (const c of deckRemaining) {
    if (c.wild) { favorable++; continue; }
    const cIsAce = c.rank === "A";
    const cLow = cIsAce ? 1 : RANK_VALUE[c.rank];
    const cHigh = cIsAce ? 14 : RANK_VALUE[c.rank];
    if (direction === "higher" && cHigh > topLow && c.rank !== top.rank) favorable++;
    else if (direction === "lower" && cLow < topHigh && c.rank !== top.rank) favorable++;
    else if (direction === "same" && c.rank === top.rank) favorable++;
  }
  return favorable / deckRemaining.length;
}

export function previewScore(
  pile: Card[],
  direction: Direction,
  deck: Card[],
  ownedJokers: Joker[],
  streak: number,
  aliveCount: number,
  correctCount: number
): { prob: number; base: number; unconditionalMult: number; unconditional: string[]; conditional: string[]; streakMult: number; guaranteedScore: number } {
  const has = (id: JokerId) => ownedJokers.some((j) => j.id === id);
  const top = pile[pile.length - 1];
  const newDepth = pile.length + 1;
  const stackBonus = newDepth - 1;
  const base = direction === "same" ? 50 : 10 * Math.max(1, stackBonus);
  const prob = guessProbability(top, direction, deck);

  let unconditionalMult = 1;
  const unconditional: string[] = [];

  if (has("gambler")) {
    unconditionalMult *= 2;
    unconditional.push("Gambler ×2");
  }
  if (has("laststand") && aliveCount === 1) {
    unconditionalMult *= LASTSTAND_MULTIPLIER;
    unconditional.push(`Last Stand ×${LASTSTAND_MULTIPLIER}`);
  }
  if (has("underdog") && prob < UNDERDOG_THRESHOLD && prob > 0) {
    unconditionalMult *= UNDERDOG_MULTIPLIER;
    unconditional.push(`Underdog ×${UNDERDOG_MULTIPLIER}`);
  }
  if (has("surething") && prob >= 0.6) {
    unconditionalMult *= 1.5;
    unconditional.push("Sure Thing ×1.5");
  }
  if (has("compound") && (correctCount + 1) % 5 === 0) {
    unconditionalMult *= 5;
    unconditional.push("Compound ×5");
  }
  if (has("777") && top.rank === "7") {
    unconditionalMult *= LUCKY7_MULTIPLIER;
    unconditional.push(`Lucky 7 ×${LUCKY7_MULTIPLIER}`);
  }
  if (has("555") && top.rank === LUCKY5_RANK) {
    unconditionalMult *= LUCKY5_MULTIPLIER;
    unconditional.push(`Lucky 5 ×${LUCKY5_MULTIPLIER}`);
  }
  if (has("even") && EVEN_RANKS.has(top.rank)) {
    unconditionalMult *= 2;
    unconditional.push("Even Steven ×2");
  }

  const conditional: string[] = [];
  const projectedStreak = streak + 1;
  const streakMult = Math.min(1 + Math.floor(projectedStreak / 3), 5);

  const guaranteedScore = Math.floor(base * unconditionalMult * streakMult);
  return {
    prob,
    base,
    unconditionalMult,
    unconditional,
    conditional,
    streakMult,
    guaranteedScore,
  };
}