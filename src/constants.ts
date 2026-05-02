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

export const EVEN_RANKS = new Set(["2", "4", "6", "8", "10", "Q"]);

export const ROUND_TARGETS = [50, 120, 250, 450, 750, 1200, 2000, 3500, 6000, 10000, 17000, 28000];

export const ALL_JOKERS: Joker[] = [
  { id: "777", name: "777", desc: "Guessing on a 7 scores ×3.", color: "#ffcc00" },
  { id: "compound", name: "COMPOUND INT", desc: "Every 5th correct guess scores ×5.", color: "#00ffaa" },
  { id: "even", name: "EVEN STEVEN", desc: "Guessing on an even rank (2/4/6/8/10/Q) scores ×2.", color: "#88ddff" },
  { id: "laststand", name: "LAST STAND", desc: "When only 1 pile is alive, all scoring ×5.", color: "#ff8800" },
  { id: "underdog", name: "UNDERDOG", desc: "Correct guesses with <25% chance score ×2.", color: "#cc66ff" },
  { id: "surething", name: "SURE THING", desc: "Correct guesses with ≥75% chance score ×1.5.", color: "#66ff66" },
  { id: "luckyguess", name: "LUCKY GUESS", desc: "Unlikely guesses and streaks revive piles.", color: "#ff3355" },
  { id: "wildcard", name: "WILDCARD", desc: "5 cards in the deck are wild — any guess is correct.", color: "#ffd700" },
  { id: "phoenix", name: "PHOENIX", desc: "First dead pile auto-revives after 3 correct guesses.", color: "#ff6600" },
  { id: "counter", name: "CARD COUNTER", desc: "Shows count of each rank remaining in deck.", color: "#00ddff" },
  { id: "deadreck", name: "DEAD RECKONING", desc: "Shows the bottom card of the deck.", color: "#ddaa00" },
];

export const CURSED_JOKERS: Joker[] = [
  { id: "sticky", name: "STICKY BUTTONS", desc: "Piles must be guessed left to right — you cannot choose.", color: "#cc2222", cursed: true },
  { id: "gambler", name: "THE GAMBLER", desc: "All scores ×2. Wrong guesses kill 2 piles.", color: "#cc2222", cursed: true },
  { id: "royallyscrewed", name: "ROYALLY SCREWED", desc: "The deck has twice as many face cards (J/Q/K).", color: "#cc2222", cursed: true },
  { id: "hardwayout", name: "HARD WAY OUT", desc: "Every 5th guess, you cannot pick the highest-probability option.", color: "#cc2222", cursed: true },
  { id: "reshuffle", name: "AUTO-RESHUFFLE", desc: "Piles auto-shuffle when 13+ cards.", color: "#cc2222", cursed: true },
  { id: "smaller", name: "A LITTLE SMALLER", desc: "No 6s. Each of 2,3,4,5 appears 5 times instead of 4.", color: "#cc2222", cursed: true },
  { id: "bigger", name: "A LITTLE BIGGER", desc: "No 8s. Each of 9,10,J,Q appears 5 times instead of 4.", color: "#cc2222", cursed: true },
  { id: "dyslexic", name: "DYSLEXIC", desc: "All 2s become 5s.", color: "#cc2222", cursed: true },
  { id: "sevennine", name: "SEVEN ATE NINE", desc: "All 9s become 7s.", color: "#cc2222", cursed: true },
];

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

  if (jokerIds.includes("royallyscrewed")) {
    const faceRanks = ["J", "Q", "K"];
    const extraFaces = faceRanks.flatMap((r) => SUITS.map((s) => ({ rank: r, suit: s })));
    extraFaces.sort(() => Math.random() - 0.5);
    const nonFaceIdxs = result.map((_c, i) => i).filter((i) => !faceRanks.includes(result[i].rank));
    nonFaceIdxs.sort(() => Math.random() - 0.5);
    nonFaceIdxs.slice(0, 12).forEach((deckIdx, i) => { result[deckIdx] = extraFaces[i]; });
    result.sort(() => Math.random() - 0.5);
  }

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
    const indices = new Set<number>();
    while (indices.size < 5) indices.add(Math.floor(Math.random() * result.length));
    result = result.map((c, i) => indices.has(i) ? { ...c, wild: true } : c);
  }

  return result;
}

export function pickJokerOptions(owned: Joker[], round: number): Joker[] {
  if (round % 3 === 2) {
    const alreadyOwned = owned.filter((j) => j.cursed).map((j) => j.id);
    const available = CURSED_JOKERS.filter((j) => !alreadyOwned.includes(j.id));
    const pool = available.length >= 2 ? available : CURSED_JOKERS;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 2);
  }
  const available = ALL_JOKERS.filter((j) => !owned.find((o) => o.id === j.id));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
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

export function countByRank(deck: Card[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of RANKS) counts[r] = 0;
  for (const c of deck) counts[c.rank]++;
  return counts;
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
    unconditionalMult *= 5;
    unconditional.push("Last Stand ×5");
  }
  if (has("underdog") && prob < 0.25 && prob > 0) {
    unconditionalMult *= 2;
    unconditional.push("Underdog ×2");
  }
  if (has("surething") && prob >= 0.75) {
    unconditionalMult *= 1.5;
    unconditional.push("Sure Thing ×1.5");
  }
  if (has("compound") && (correctCount + 1) % 5 === 0) {
    unconditionalMult *= 5;
    unconditional.push("Compound ×5");
  }
  if (has("777") && top.rank === "7") {
    unconditionalMult *= 3;
    unconditional.push("Lucky 7 ×3");
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