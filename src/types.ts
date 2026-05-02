export type Direction = "higher" | "lower" | "same";
export type GamePhase = "playing" | "roundWon" | "runOver" | "runWon";

export interface Card {
  rank: string;
  suit: string;
  wild?: boolean;
}

export type JokerId =
  | "777"
  | "compound"
  | "even"
  | "laststand"
  | "underdog"
  | "surething"
  | "luckyguess"
  | "wildcard"
  | "phoenix"
  | "counter"
  | "deadreck"
  | "sticky"
  | "gambler"
  | "royallyscrewed"
  | "hardwayout"
  | "reshuffle"
  | "smaller"
  | "bigger"
  | "dyslexic"
  | "sevennine";

export interface Joker {
  id: JokerId;
  name: string;
  desc: string;
  color: string;
  cursed?: boolean;
}

export interface Floater {
  id: number;
  pileIdx: number;
  text: string;
  color: string;
  isEmoji: boolean;
}

export interface SwipeOffset {
  pileIdx: number;
  dy: number;
}

export interface HelpBtnPos {
  x: number;
  y: number;
}

export interface ScorePreview {
  prob: number;
  base: number;
  unconditionalMult: number;
  unconditional: string[];
  conditional: string[];
  streakMult: number;
  guaranteedScore: number;
}

interface WindowStorage {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<void>;
}

declare global {
  interface Window {
    storage: WindowStorage;
  }
}