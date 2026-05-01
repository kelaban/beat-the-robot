import { useState, useEffect, useMemo, useRef } from "react";

// ===== Card values =====
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const RANK_VALUE = { A: 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10, J: 11, Q: 12, K: 13 };
const EVEN_RANKS = new Set(["2", "4", "6", "8", "10", "Q"]);

const buildDeck = () => {
  const deck = [];
  for (const s of SUITS) for (const r of RANKS) deck.push({ rank: r, suit: s });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

// Round targets — exponential climb
const ROUND_TARGETS = [50, 120, 250, 450, 750, 1200, 2000, 3500];

// ===== Jokers =====
const ALL_JOKERS = [
  { id: "lucky7", name: "LUCKY.7", desc: "Drawing a 7 scores ×3.", color: "#ffcc00" },
  { id: "gambler", name: "THE GAMBLER", desc: "All scores ×2. Wrong guesses kill 2 piles.", color: "#ff5555" },
  { id: "compound", name: "COMPOUND INT", desc: "Every 5th correct guess scores ×5.", color: "#00ffaa" },
  { id: "even", name: "EVEN STEVEN", desc: "Drawing an even rank (2/4/6/8/10/Q) scores ×2.", color: "#88ddff" },
  { id: "laststand", name: "LAST STAND", desc: "When only 1 pile is alive, all scoring ×5.", color: "#ff8800" },
  { id: "underdog", name: "UNDERDOG", desc: "Correct guesses with <25% chance score ×2.", color: "#cc66ff" },
  { id: "surething", name: "SURE THING", desc: "Correct guesses with ≥75% chance score ×1.5.", color: "#66ff66" },
  { id: "defib", name: "DEFIBRILLATOR", desc: "Once per round: revive a dead pile.", color: "#ff3355" },
  { id: "reshuffle", name: "RESHUFFLE", desc: "Once per round: shuffle a live pile back into deck.", color: "#aa88ff" },
  { id: "phoenix", name: "PHOENIX", desc: "First dead pile auto-revives after 3 correct guesses.", color: "#ff6600" },
  { id: "counter", name: "CARD COUNTER", desc: "Shows count of each rank remaining in deck.", color: "#00ddff" },
  { id: "deadreck", name: "DEAD RECKONING", desc: "Shows the bottom card of the deck.", color: "#ddaa00" },
  { id: "combo", name: "COMBO BREAKER", desc: "Wrong guesses bank +1 streak for next hit.", color: "#ff99cc" },
];

const pickJokerOptions = (owned) => {
  const available = ALL_JOKERS.filter((j) => !owned.find((o) => o.id === j.id));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(3, shuffled.length));
};

// ===== Probability for a guess (uses remaining deck) =====
const guessProbability = (top, direction, deckRemaining) => {
  if (deckRemaining.length === 0) return 0;
  const topIsAce = top.rank === "A";
  const topLow = topIsAce ? 1 : RANK_VALUE[top.rank];
  const topHigh = topIsAce ? 14 : RANK_VALUE[top.rank];

  let favorable = 0;
  for (const c of deckRemaining) {
    const cIsAce = c.rank === "A";
    const cLow = cIsAce ? 1 : RANK_VALUE[c.rank];
    const cHigh = cIsAce ? 14 : RANK_VALUE[c.rank];
    if (direction === "higher" && cHigh > topLow && c.rank !== top.rank) favorable++;
    else if (direction === "lower" && cLow < topHigh && c.rank !== top.rank) favorable++;
    else if (direction === "same" && c.rank === top.rank) favorable++;
  }
  return favorable / deckRemaining.length;
};

// Compute base score before card-conditional jokers — this is the guaranteed
// floor if the guess is correct.
const previewScore = (pile, direction, deck, ownedJokers, streak, bankedStreak, aliveCount, correctCount) => {
  const has = (id) => ownedJokers.some((j) => j.id === id);
  const top = pile[pile.length - 1];
  const newDepth = pile.length + 1;
  const stackBonus = newDepth - 1;
  const base = direction === "same" ? 50 : 10 * Math.max(1, stackBonus);
  const prob = guessProbability(top, direction, deck);

  // Multipliers that apply regardless of next card
  let unconditionalMult = 1;
  const unconditional = [];
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

  // Conditional ones (depend on what next card is)
  const conditional = [];
  if (has("lucky7")) conditional.push("×3 if next is 7");
  if (has("even")) conditional.push("×2 if even rank");

  // Streak
  const projectedStreak = streak + 1 + bankedStreak;
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
};

// ===== Card counter from deck =====
const countByRank = (deck) => {
  const counts = {};
  for (const r of RANKS) counts[r] = 0;
  for (const c of deck) counts[c.rank]++;
  return counts;
};

// ===== Robot face =====
function RobotFace() {
  return (
    <svg viewBox="0 0 16 22" shapeRendering="crispEdges" style={{ width: "70%", height: "70%" }}>
      <rect x="7" y="1" width="2" height="1" fill="#ff3355" />
      <rect x="7" y="2" width="2" height="2" fill="#ffcc00" />
      <rect x="3" y="4" width="10" height="8" fill="#c0c0c0" />
      <rect x="3" y="4" width="10" height="1" fill="#ffffff" />
      <rect x="3" y="11" width="10" height="1" fill="#666" />
      <rect x="5" y="6" width="2" height="2" fill="#00ffaa" />
      <rect x="9" y="6" width="2" height="2" fill="#00ffaa" />
      <rect x="5" y="6" width="1" height="1" fill="#ffffff" />
      <rect x="9" y="6" width="1" height="1" fill="#ffffff" />
      <rect x="5" y="9" width="6" height="1" fill="#000" />
      <rect x="6" y="9" width="1" height="1" fill="#ff3355" />
      <rect x="8" y="9" width="1" height="1" fill="#ff3355" />
      <rect x="10" y="9" width="1" height="1" fill="#ff3355" />
      <rect x="6" y="12" width="4" height="1" fill="#888" />
      <rect x="2" y="13" width="12" height="7" fill="#a0a0b0" />
      <rect x="2" y="13" width="12" height="1" fill="#ffffff" />
      <rect x="2" y="19" width="12" height="1" fill="#555" />
      <rect x="6" y="15" width="4" height="3" fill="#000" />
      <rect x="7" y="16" width="1" height="1" fill="#ffcc00" />
      <rect x="8" y="16" width="1" height="1" fill="#00ffaa" />
      <rect x="1" y="14" width="1" height="4" fill="#666" />
      <rect x="14" y="14" width="1" height="4" fill="#666" />
    </svg>
  );
}

// ===== Card =====
function Card({ card, faceDown, dim, peelCard }) {
  if (!card && !faceDown) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#008080",
          border: "2px dashed #00cccc",
          color: "#00cccc",
          fontFamily: "'VT323', monospace",
          fontSize: "clamp(20px, 8cqw, 40px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          containerType: "inline-size",
        }}
      >
        ✕
      </div>
    );
  }

  if (faceDown) {
    const isRedPeel = peelCard && (peelCard.suit === "♥" || peelCard.suit === "♦");
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          border: "2px solid #000",
          boxShadow: "3px 3px 0 #000",
          background: "#fff",
          overflow: "hidden",
          position: "relative",
          containerType: "inline-size",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "#1a1a2e",
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(0,255,170,0.08) 0 1px, transparent 1px 4px), repeating-linear-gradient(90deg, rgba(0,255,170,0.06) 0 1px, transparent 1px 8px)",
            border: "2px solid #00ffaa",
            boxSizing: "border-box",
            clipPath: peelCard ? "polygon(0 0, 100% 0, 100% 65%, 65% 100%, 0 100%)" : "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <RobotFace />
          <div style={{ position: "absolute", top: "3%", left: "3%", width: "8%", height: "5%", background: "#00ffaa", boxShadow: "0 0 0 1px #000" }} />
          <div style={{ position: "absolute", top: "3%", right: "3%", width: "8%", height: "5%", background: "#00ffaa", boxShadow: "0 0 0 1px #000" }} />
          <div style={{ position: "absolute", bottom: "3%", left: "3%", width: "8%", height: "5%", background: "#00ffaa", boxShadow: "0 0 0 1px #000" }} />
          <div style={{ position: "absolute", bottom: "3%", right: "3%", width: "8%", height: "5%", background: "#00ffaa", boxShadow: "0 0 0 1px #000" }} />
        </div>
        {peelCard && (
          <>
            <div style={{ position: "absolute", inset: 0, background: "#fff", clipPath: "polygon(100% 65%, 100% 100%, 65% 100%)", zIndex: 1 }} />
            <div
              style={{
                position: "absolute",
                bottom: "2%",
                right: "5%",
                lineHeight: 1,
                fontFamily: "'VT323', monospace",
                fontWeight: 700,
                color: isRedPeel ? "#c00000" : "#000",
                fontSize: "clamp(14px, 14cqw, 28px)",
                textAlign: "right",
                zIndex: 3,
                transform: "rotate(180deg)",
              }}
            >
              <div>{peelCard.rank}</div>
              <div style={{ fontSize: "0.8em" }}>{peelCard.suit}</div>
            </div>
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                zIndex: 2,
                background: "linear-gradient(135deg, transparent calc(100% - 2px), #000 calc(100% - 2px), #000 100%)",
                clipPath: "polygon(100% 60%, 100% 70%, 60% 100%, 70% 100%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                zIndex: 2,
                background: "linear-gradient(135deg, transparent 60%, rgba(0,0,0,0.25) 75%, transparent 80%)",
              }}
            />
          </>
        )}
      </div>
    );
  }

  const isRed = card.suit === "♥" || card.suit === "♦";
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#fff",
        border: "2px solid #000",
        boxShadow: "3px 3px 0 #000",
        opacity: dim ? 0.5 : 1,
        filter: dim ? "grayscale(0.4)" : "none",
        fontFamily: "'VT323', monospace",
        color: isRed ? "#c00000" : "#000",
        position: "relative",
        containerType: "inline-size",
        boxSizing: "border-box",
      }}
    >
      <div style={{ position: "absolute", top: "3%", left: "6%", lineHeight: 1, fontSize: "clamp(14px, 14cqw, 28px)", fontWeight: 700 }}>
        <div>{card.rank}</div>
        <div style={{ fontSize: "0.8em" }}>{card.suit}</div>
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "clamp(28px, 28cqw, 56px)",
        }}
      >
        {card.suit}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: "3%",
          right: "6%",
          lineHeight: 1,
          fontSize: "clamp(14px, 14cqw, 28px)",
          fontWeight: 700,
          transform: "rotate(180deg)",
        }}
      >
        <div>{card.rank}</div>
        <div style={{ fontSize: "0.8em" }}>{card.suit}</div>
      </div>
    </div>
  );
}

// ===== Chunky button =====
function DOSButton({ children, onClick, disabled, variant = "default", small, full }) {
  const colors = {
    default: { bg: "#c0c0c0", fg: "#000" },
    primary: { bg: "#ffff00", fg: "#000" },
    danger: { bg: "#ff5555", fg: "#000" },
    success: { bg: "#00ffaa", fg: "#000" },
  }[variant];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-transform"
      style={{
        background: disabled ? "#888" : colors.bg,
        color: colors.fg,
        border: "2px solid #000",
        boxShadow: disabled ? "none" : "3px 3px 0 #000",
        padding: small ? "6px 8px" : "10px 14px",
        fontFamily: "'VT323', monospace",
        fontSize: small ? 16 : 18,
        letterSpacing: 1,
        textTransform: "uppercase",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        width: full ? "100%" : "auto",
      }}
    >
      {children}
    </button>
  );
}

// ===== Joker card =====
function JokerCard({ joker, onSelect, selectable, small, depleted }) {
  return (
    <button
      onClick={onSelect}
      disabled={!selectable}
      style={{
        background: "#1a1a2e",
        border: `2px solid ${joker.color}`,
        boxShadow: `3px 3px 0 #000`,
        padding: small ? "4px 6px" : "8px 10px",
        cursor: selectable ? "pointer" : "default",
        textAlign: "left",
        fontFamily: "'VT323', monospace",
        color: "#fff",
        width: "100%",
        opacity: depleted ? 0.4 : 1,
        position: "relative",
      }}
    >
      <div
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: small ? 7 : 10,
          color: joker.color,
          letterSpacing: 1,
          marginBottom: small ? 2 : 4,
        }}
      >
        {joker.name}
      </div>
      {!small && <div style={{ fontSize: 14, lineHeight: 1.2, color: "#ddd" }}>{joker.desc}</div>}
      {depleted && small && (
        <div
          style={{
            position: "absolute",
            top: 2,
            right: 4,
            fontSize: 9,
            color: "#ff5555",
            fontFamily: "'Press Start 2P', monospace",
          }}
        >
          ✕
        </div>
      )}
    </button>
  );
}

export default function BeatTheRobot() {
  // Run state
  const [phase, setPhase] = useState("playing");
  const [round, setRound] = useState(1);
  const [runScore, setRunScore] = useState(0);
  const [ownedJokers, setOwnedJokers] = useState([]);
  const [jokerOptions, setJokerOptions] = useState([]);

  // Round state
  const [deck, setDeck] = useState([]);
  const [piles, setPiles] = useState([]);
  const [deadPiles, setDeadPiles] = useState([]);
  const [selectedPile, setSelectedPile] = useState(null);
  const [message, setMessage] = useState("");
  const [roundScore, setRoundScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [flashPile, setFlashPile] = useState(null);
  const [flashKind, setFlashKind] = useState(null);
  const [floaters, setFloaters] = useState([]); // {id, pileIdx, text, color}
  const [streakPulse, setStreakPulse] = useState(0); // increments to retrigger pulse animation
  const [scorePulse, setScorePulse] = useState(0);
  const [newCardPile, setNewCardPile] = useState(null); // pile idx for slide-in animation

  // Joker per-round state
  const [defibUsed, setDefibUsed] = useState(false);
  const [reshuffleUsed, setReshuffleUsed] = useState(false);
  const [phoenixUsed, setPhoenixUsed] = useState(false);
  const [phoenixCounter, setPhoenixCounter] = useState(0); // counts correct guesses since first death
  const [phoenixTarget, setPhoenixTarget] = useState(null); // pile idx to revive
  const [bankedStreak, setBankedStreak] = useState(0); // combo breaker
  const [correctCount, setCorrectCount] = useState(0); // for compound interest
  const [activeMode, setActiveMode] = useState(null); // 'defib' | 'reshuffle' — pile-targeting
  const [showRules, setShowRules] = useState(false);
  const [rulesClosing, setRulesClosing] = useState(false);
  const helpBtnRef = useRef(null);
  const [helpBtnPos, setHelpBtnPos] = useState(null); // {x, y} for shrink target

  // Swipe tracking (mobile)
  const swipeStart = useRef(null);
  const [swipeDir, setSwipeDir] = useState(null); // 'up' | 'down' for visual feedback
  const [swipeOffset, setSwipeOffset] = useState(null); // {pileIdx, dy}
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  const hasJoker = (id) => ownedJokers.some((j) => j.id === id);

  useEffect(() => {
    if (!document.getElementById("vt323-font")) {
      const link = document.createElement("link");
      link.id = "vt323-font";
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=VT323&family=Press+Start+2P&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  const target = round <= ROUND_TARGETS.length
    ? ROUND_TARGETS[round - 1]
    : Math.floor(ROUND_TARGETS[ROUND_TARGETS.length - 1] * Math.pow(1.5, round - ROUND_TARGETS.length));

  const startRound = (roundNum) => {
    const d = buildDeck();
    const initial = [];
    for (let i = 0; i < 9; i++) initial.push([d.shift()]);
    setPiles(initial);
    setDeadPiles(Array(9).fill(false));
    setDeck(d);
    setSelectedPile(null);
    setRoundScore(0);
    setStreak(0);
    setBankedStreak(0);
    setCorrectCount(0);
    setDefibUsed(false);
    setReshuffleUsed(false);
    setPhoenixUsed(false);
    setPhoenixCounter(0);
    setPhoenixTarget(null);
    setActiveMode(null);
    setMessage(`ROUND ${roundNum} — Reach ${ROUND_TARGETS[roundNum - 1]} pts.`);
    setFlashPile(null);
    setFlashKind(null);
    setPhase("playing");
  };

  const startNewRun = () => {
    setRound(1);
    setRunScore(0);
    setOwnedJokers([]);
    startRound(1);
  };

  useEffect(() => {
    startNewRun();
  }, []);

  // Detect touch device on mount
  useEffect(() => {
    const touchy =
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia("(pointer: coarse)").matches;
    setIsTouchDevice(touchy);
  }, []);

  // Show help on first visit ever
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await window.storage.get("hasSeenIntro");
        if (cancelled) return;
        if (!result) {
          setShowRules(true);
        }
      } catch {
        // First time — key doesn't exist
        if (!cancelled) setShowRules(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-clear transient messages after 3.5s so the formula line breathes
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 3500);
    return () => clearTimeout(t);
  }, [message]);

  const aliveCount = deadPiles.filter((d) => !d).length;
  const rankCounts = useMemo(() => countByRank(deck), [deck]);
  const bottomCard = deck.length > 0 ? deck[deck.length - 1] : null;

  // ===== Pile click =====
  const handlePileClick = (idx) => {
    if (phase !== "playing") return;

    // Active modes: defib/reshuffle target a pile
    if (activeMode === "defib") {
      if (!deadPiles[idx]) {
        setMessage("Pick a DEAD pile to revive.");
        return;
      }
      const newDead = deadPiles.map((d, i) => (i === idx ? false : d));
      setDeadPiles(newDead);
      setDefibUsed(true);
      setActiveMode(null);
      setMessage(`*** DEFIB! Pile ${idx + 1} revived. ***`);
      // If phoenix was targeting this pile, clear it (already revived)
      if (phoenixTarget === idx) setPhoenixTarget(null);
      return;
    }
    if (activeMode === "reshuffle") {
      if (deadPiles[idx]) {
        setMessage("Pick a LIVE pile to reshuffle.");
        return;
      }
      const pile = piles[idx];
      // Put pile cards back into deck, shuffle, then deal one new card to that pile
      const newDeck = [...deck, ...pile];
      for (let i = newDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
      }
      const newCard = newDeck.shift();
      const newPiles = piles.map((p, i) => (i === idx ? [newCard] : p));
      setDeck(newDeck);
      setPiles(newPiles);
      setReshuffleUsed(true);
      setActiveMode(null);
      setMessage(`*** Pile ${idx + 1} reshuffled into deck. ***`);
      return;
    }

    if (deadPiles[idx]) return;
    setSelectedPile(idx);

    // Show context about active conditional jokers if any
    const conditionals = [];
    if (hasJoker("lucky7")) conditionals.push("L7×3 on a 7");
    if (hasJoker("even")) conditionals.push("EVEN×2 on 2/4/6/8/10/Q");
    if (conditionals.length > 0) {
      setMessage(`Pick a guess. Bonus: ${conditionals.join(" · ")}`);
    } else {
      setMessage(`Pick a guess. Streak ×${streak} · ${deck.length} deck`);
    }
  };

  // ===== Guess =====
  const guess = (direction, explicitPileIdx) => {
    if (phase !== "playing") return;
    const idx = explicitPileIdx !== undefined ? explicitPileIdx : selectedPile;
    if (idx === null || idx === undefined) return;
    if (deadPiles[idx]) return;
    const pile = piles[idx];
    const top = pile[pile.length - 1];
    if (deck.length === 0) return;

    const next = deck[0];
    const remainingDeck = deck.slice(1);
    const probability = guessProbability(top, direction, deck);

    const topIsAce = top.rank === "A";
    const nextIsAce = next.rank === "A";
    const topLow = topIsAce ? 1 : RANK_VALUE[top.rank];
    const topHigh = topIsAce ? 14 : RANK_VALUE[top.rank];
    const nextLow = nextIsAce ? 1 : RANK_VALUE[next.rank];
    const nextHigh = nextIsAce ? 14 : RANK_VALUE[next.rank];

    let correct = false;
    if (direction === "higher") correct = nextHigh > topLow && top.rank !== next.rank;
    else if (direction === "lower") correct = nextLow < topHigh && top.rank !== next.rank;
    else if (direction === "same") correct = top.rank === next.rank;

    const newPiles = piles.map((p, i) => (i === idx ? [...p, next] : p));
    setPiles(newPiles);
    setDeck(remainingDeck);

    if (correct) {
      const newDepth = newPiles[idx].length;
      const stackBonus = newDepth - 1;
      let base = direction === "same" ? 50 : 10 * Math.max(1, stackBonus);

      // ===== Joker multipliers =====
      let mult = 1;
      const breakdown = [];

      if (hasJoker("lucky7") && next.rank === "7") {
        mult *= 3;
        breakdown.push("L7×3");
      }
      if (hasJoker("even") && EVEN_RANKS.has(next.rank)) {
        mult *= 2;
        breakdown.push("EVEN×2");
      }
      if (hasJoker("gambler")) {
        mult *= 2;
        breakdown.push("GMB×2");
      }
      if (hasJoker("laststand") && aliveCount === 1) {
        mult *= 5;
        breakdown.push("LAST×5");
      }
      if (hasJoker("underdog") && probability < 0.25 && probability > 0) {
        mult *= 2;
        breakdown.push("UD×2");
      }
      if (hasJoker("surething") && probability >= 0.75) {
        mult *= 1.5;
        breakdown.push("ST×1.5");
      }
      const newCorrectCount = correctCount + 1;
      if (hasJoker("compound") && newCorrectCount % 5 === 0) {
        mult *= 5;
        breakdown.push("CMP×5");
      }
      setCorrectCount(newCorrectCount);

      // Streak (with banked from combo breaker)
      const newStreak = streak + 1 + bankedStreak;
      const streakMult = Math.min(1 + Math.floor(newStreak / 3), 5);
      setStreak(newStreak);
      setBankedStreak(0);
      setStreakPulse((p) => p + 1);

      const earned = Math.floor(base * mult * streakMult);
      setRoundScore((s) => s + earned);
      setScorePulse((p) => p + 1);

      // Floating score popup
      const floaterId = Date.now() + Math.random();
      const floaterText =
        breakdown.length > 0
          ? `+${earned}\n${breakdown.join(" ")}`
          : `+${earned}`;
      setFloaters((f) => [...f, { id: floaterId, pileIdx: idx, text: floaterText, color: "#00ff66" }]);
      setTimeout(() => {
        setFloaters((f) => f.filter((x) => x.id !== floaterId));
      }, 1600);

      setNewCardPile(idx);
      setTimeout(() => setNewCardPile(null), 550);

      setFlashPile(idx);
      setFlashKind("good");
      setTimeout(() => {
        setFlashPile(null);
        setFlashKind(null);
      }, 550);

      // SAME revives all dead piles
      let revived = 0;
      let newDeadAfter = deadPiles;
      if (direction === "same") {
        revived = deadPiles.filter((d) => d).length;
        if (revived > 0) {
          newDeadAfter = Array(9).fill(false);
          setDeadPiles(newDeadAfter);
          setPhoenixTarget(null); // already revived
        }
      }

      // Phoenix tick
      if (hasJoker("phoenix") && !phoenixUsed && phoenixTarget !== null) {
        const newCounter = phoenixCounter + 1;
        if (newCounter >= 3) {
          newDeadAfter = newDeadAfter.map((d, i) => (i === phoenixTarget ? false : d));
          setDeadPiles(newDeadAfter);
          setPhoenixUsed(true);
          setPhoenixTarget(null);
          setPhoenixCounter(0);
        } else {
          setPhoenixCounter(newCounter);
        }
      }

      const newRoundScore = roundScore + earned;

      // Round cleared
      if (newRoundScore >= target) {
        setRunScore((rs) => rs + newRoundScore);
        setPhase("roundWon");
        setJokerOptions(pickJokerOptions(ownedJokers));
        setMessage(`*** ROUND ${round} CLEARED — ${newRoundScore} pts ***`);
        setSelectedPile(null);
        return;
      }

      if (remainingDeck.length === 0) {
        setRunScore((rs) => rs + newRoundScore);
        setPhase("runWon");
        setMessage(`*** DECK CLEARED — YOU BEAT THE ROBOT! ***`);
        setSelectedPile(null);
        return;
      }

      let msg = `+${earned}`;
      if (breakdown.length) msg += ` [${breakdown.join(" ")}]`;
      if (streakMult > 1) msg += ` ×${streakMult} streak`;
      if (direction === "same" && revived > 0) msg += ` — ${revived} revived!`;
      setMessage(msg);
      // Keep the pile selected so desktop players don't need to re-click after each guess.
    } else {
      // Wrong guess
      setStreak(0);
      // Combo Breaker banks
      if (hasJoker("combo")) {
        setBankedStreak((b) => b + 1);
      }

      // Determine kills (Gambler kills 2)
      const killCount = hasJoker("gambler") ? 2 : 1;
      let newDead = deadPiles.map((d, i) => (i === idx ? true : d));
      // Pick additional pile to kill (random alive)
      if (killCount > 1) {
        const aliveIndices = newDead
          .map((d, i) => (!d ? i : -1))
          .filter((i) => i !== -1);
        if (aliveIndices.length > 0) {
          const victim = aliveIndices[Math.floor(Math.random() * aliveIndices.length)];
          newDead = newDead.map((d, i) => (i === victim ? true : d));
        }
      }

      // Phoenix tracks first death
      if (hasJoker("phoenix") && !phoenixUsed && phoenixTarget === null) {
        setPhoenixTarget(idx);
        setPhoenixCounter(0);
      }

      setDeadPiles(newDead);
      setFlashPile(idx);
      setFlashKind("bad");
      setTimeout(() => {
        setFlashPile(null);
        setFlashKind(null);
      }, 850);

      // Miss floater
      const missId = Date.now() + Math.random();
      setFloaters((f) => [...f, { id: missId, pileIdx: idx, text: "MISS", color: "#ff5555" }]);
      setTimeout(() => {
        setFloaters((f) => f.filter((x) => x.id !== missId));
      }, 1600);

      const remainingAlive = newDead.filter((d) => !d).length;

      if (remainingAlive === 0) {
        if (roundScore >= target) {
          setRunScore((rs) => rs + roundScore);
          setPhase("roundWon");
          setJokerOptions(pickJokerOptions(ownedJokers));
          setMessage(`*** ROUND ${round} CLEARED — ${roundScore} pts ***`);
        } else {
          setPhase("runOver");
          setMessage(`*** ALL PILES DEAD. Needed ${target}, got ${roundScore}. ***`);
        }
        setSelectedPile(null);
        return;
      }
      if (remainingDeck.length === 0) {
        setRunScore((rs) => rs + roundScore);
        setPhase("runWon");
        setMessage(`*** DECK CLEARED — YOU BEAT THE ROBOT! ***`);
        setSelectedPile(null);
        return;
      }

      let msg = `MISS! Pile ${idx + 1} dead.`;
      if (killCount > 1) msg += ` Gambler killed another!`;
      if (hasJoker("combo")) msg += ` Streak banked.`;
      msg += ` ${remainingAlive} alive.`;
      setMessage(msg);
      // Pile is dead — advance to next alive pile so desktop players don't lose selection.
      const nextAlive = newDead.findIndex((d, i) => !d && i > idx) !== -1
        ? newDead.findIndex((d, i) => !d && i > idx)
        : newDead.findIndex((d) => !d);
      setSelectedPile(nextAlive === -1 ? null : nextAlive);
    }
  };

  const chooseJoker = (joker) => {
    const newJokers = [...ownedJokers, joker];
    setOwnedJokers(newJokers);
    const nextRound = round + 1;
    setRound(nextRound);
    setTimeout(() => startRound(nextRound), 0);
  };

  // Close rules modal with shrink-to-help-button animation
  const closeRules = () => {
    if (helpBtnRef.current) {
      const r = helpBtnRef.current.getBoundingClientRect();
      setHelpBtnPos({
        x: r.left + r.width / 2,
        y: r.top + r.height / 2,
      });
    }
    setRulesClosing(true);
    // Mark intro as seen
    (async () => {
      try {
        await window.storage.set("hasSeenIntro", "1");
      } catch {}
    })();
    setTimeout(() => {
      setShowRules(false);
      setRulesClosing(false);
      setHelpBtnPos(null);
    }, 350);
  };

  // Helper: cycle selection among alive piles
  const cycleSelection = (delta) => {
    if (phase !== "playing") return;
    const alive = deadPiles.map((d, i) => (!d ? i : -1)).filter((i) => i !== -1);
    if (alive.length === 0) return;
    let nextIdx;
    if (selectedPile === null) {
      nextIdx = delta > 0 ? alive[0] : alive[alive.length - 1];
    } else {
      const cur = alive.indexOf(selectedPile);
      if (cur === -1) {
        nextIdx = alive[0];
      } else {
        nextIdx = alive[(cur + delta + alive.length) % alive.length];
      }
    }
    setSelectedPile(nextIdx);
    const conditionals = [];
    if (hasJoker("lucky7")) conditionals.push("L7×3 on a 7");
    if (hasJoker("even")) conditionals.push("EVEN×2 on 2/4/6/8/10/Q");
    if (conditionals.length > 0) {
      setMessage(`Pile ${nextIdx + 1}. Bonus: ${conditionals.join(" · ")}`);
    } else {
      setMessage(`Pile ${nextIdx + 1} selected.`);
    }
  };

  // Keyboard input
  useEffect(() => {
    const handler = (e) => {
      if (phase !== "playing") return;
      if (showRules) return;
      // Pile selection by number
      if (/^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (!deadPiles[idx]) {
          handlePileClick(idx);
          e.preventDefault();
        }
        return;
      }
      switch (e.key) {
        case "ArrowLeft":
          cycleSelection(-1);
          e.preventDefault();
          break;
        case "ArrowRight":
          cycleSelection(1);
          e.preventDefault();
          break;
        case "ArrowUp":
          if (selectedPile !== null && !activeMode) {
            guess("higher");
            e.preventDefault();
          }
          break;
        case "ArrowDown":
          if (selectedPile !== null && !activeMode) {
            guess("lower");
            e.preventDefault();
          }
          break;
        case " ":
        case "s":
        case "S":
          if (selectedPile !== null && !activeMode) {
            guess("same");
            e.preventDefault();
          }
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, selectedPile, activeMode, deadPiles, piles, deck, showRules]);

  // Swipe-from-pile: track which pile the touch started on, follow finger,
  // release to commit guess. The card itself moves with the finger.
  const onPileTouchStart = (i) => (e) => {
    if (e.touches.length !== 1) return;
    if (deadPiles[i] || activeMode || phase !== "playing") return;
    swipeStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      pileIdx: i,
      committed: false,
    };
    setSwipeOffset({ pileIdx: i, dy: 0 });
    setSwipeDir(null);
  };
  const onPileTouchMove = (e) => {
    if (!swipeStart.current || e.touches.length !== 1) return;
    const dy = e.touches[0].clientY - swipeStart.current.y;
    const dx = e.touches[0].clientX - swipeStart.current.x;
    // Only follow vertical motion; ignore horizontal gestures
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
      // user is scrolling/swiping horizontally — abort
      swipeStart.current = null;
      setSwipeOffset(null);
      setSwipeDir(null);
      return;
    }
    setSwipeOffset({ pileIdx: swipeStart.current.pileIdx, dy });
    if (Math.abs(dy) > 25) {
      setSwipeDir(dy < 0 ? "up" : "down");
    } else {
      setSwipeDir(null);
    }
    e.preventDefault();
  };
  const onPileTouchEnd = (e) => {
    if (!swipeStart.current) return;
    const t = e.changedTouches[0];
    const dy = t.clientY - swipeStart.current.y;
    const dx = t.clientX - swipeStart.current.x;
    const pileIdx = swipeStart.current.pileIdx;
    swipeStart.current = null;
    setSwipeOffset(null);
    setSwipeDir(null);

    // Trigger threshold for a flick
    const FLICK_THRESHOLD = 50;
    if (
      Math.abs(dy) > FLICK_THRESHOLD &&
      Math.abs(dy) > Math.abs(dx) &&
      !deadPiles[pileIdx] &&
      !activeMode &&
      phase === "playing"
    ) {
      // Auto-select the pile and guess in one motion
      setSelectedPile(pileIdx);
      guess(dy < 0 ? "higher" : "lower", pileIdx);
    } else {
      // Tap (no flick) — just select the pile
      if (Math.abs(dy) < 10 && Math.abs(dx) < 10 && !deadPiles[pileIdx]) {
        handlePileClick(pileIdx);
      }
    }
  };

  return (
    <div
      style={{
        height: "100dvh",
        maxHeight: "100dvh",
        width: "100vw",
        background: "#008080",
        fontFamily: "'VT323', monospace",
        padding: "8px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes flashGood { 0%,100% { box-shadow: 3px 3px 0 #000; } 50% { box-shadow: 0 0 0 4px #00ff00, 3px 3px 0 #000; } }
        @keyframes flashBad { 0% { transform: translateX(0); } 25% { transform: translateX(-3px); } 50% { transform: translateX(3px); } 75% { transform: translateX(-2px); } 100% { transform: translateX(0); } }
        @keyframes blink { 0%,49% { opacity: 1; } 50%,100% { opacity: 0; } }
        @keyframes floatUp {
          0% { transform: translateY(20%) scale(0.6); opacity: 0; }
          15% { transform: translateY(0) scale(1.15); opacity: 1; }
          35% { transform: translateY(-15%) scale(1); opacity: 1; }
          100% { transform: translateY(-180%) scale(0.85); opacity: 0; }
        }
        @keyframes cardSlideIn {
          0% { transform: translateY(-150%) rotate(-12deg); opacity: 0; }
          70% { transform: translateY(8%) rotate(2deg); opacity: 1; }
          100% { transform: translateY(0) rotate(0deg); opacity: 1; }
        }
        @keyframes cardFlip {
          0% { transform: rotateY(0); }
          50% { transform: rotateY(90deg); }
          100% { transform: rotateY(0); }
        }
        @keyframes stackBadgePop {
          0% { transform: scale(0); }
          60% { transform: scale(1.4); }
          100% { transform: scale(1); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.25); }
        }
        @keyframes scoreCount {
          0%, 100% { transform: scale(1); color: inherit; }
          50% { transform: scale(1.15); color: #008000; }
        }
        @keyframes modalPop {
          0% { transform: scale(0.7); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes helpBtnReceive {
          0% { transform: scale(1); }
          40% { transform: scale(1.6); background: #ffff00; }
          100% { transform: scale(1); }
        }
      `}</style>

      <div
        style={{
          width: "100%",
          maxWidth: "min(520px, 95vmin)",
          height: "100%",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        {/* Title bar */}
        <div
          style={{
            background: "#000080",
            color: "#fff",
            padding: "6px 10px",
            border: "2px solid #000",
            boxShadow: "3px 3px 0 #000",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
            flexShrink: 0,
          }}
        >
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, letterSpacing: 1 }}>BEAT.THE.ROBOT</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 14 }}>R{round}/{ROUND_TARGETS.length}</div>
            <button
              ref={helpBtnRef}
              onClick={() => setShowRules(true)}
              style={{
                background: "#c0c0c0",
                color: "#000",
                border: "1px solid #000",
                width: 18,
                height: 18,
                fontFamily: "'VT323', monospace",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                lineHeight: 1,
                padding: 0,
                animation: rulesClosing ? "helpBtnReceive 0.45s ease" : "none",
              }}
            >
              ?
            </button>
          </div>
        </div>

        {/* Score panel */}
        <div
          style={{
            background: "#c0c0c0",
            border: "2px solid #000",
            boxShadow: "3px 3px 0 #000",
            padding: "6px 10px",
            marginBottom: 8,
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr",
            gap: 4,
            fontSize: "clamp(14px, 2.6vmin, 22px)",
            color: "#000",
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ fontSize: "clamp(10px, 1.6vmin, 14px)", opacity: 0.7 }}>SCORE</div>
            <div
              key={`score-${scorePulse}`}
              style={{
                fontWeight: 700,
                color: roundScore >= target ? "#008000" : "#000",
                animation: scorePulse > 0 ? "scoreCount 0.55s ease" : "none",
                transformOrigin: "left center",
              }}
            >
              {roundScore}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "clamp(10px, 1.6vmin, 14px)", opacity: 0.7 }}>GOAL</div>
            <div style={{ fontWeight: 700 }}>{target}</div>
          </div>
          <div>
            <div style={{ fontSize: "clamp(10px, 1.6vmin, 14px)", opacity: 0.7 }}>STREAK</div>
            <div
              key={`streak-${streakPulse}`}
              style={{
                fontWeight: 700,
                color: streak >= 3 ? "#c00000" : "#000",
                animation: streakPulse > 0 ? "pulse 0.55s ease" : "none",
                transformOrigin: "left center",
                display: "inline-block",
              }}
            >
              ×{streak}
              {bankedStreak > 0 && <span style={{ color: "#cc66ff" }}> +{bankedStreak}</span>}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "clamp(10px, 1.6vmin, 14px)", opacity: 0.7 }}>DECK</div>
            <div style={{ fontWeight: 700 }}>{deck.length}</div>
          </div>
        </div>

        {/* Card Counter (joker) */}
        {hasJoker("counter") && (
          <div
            style={{
              background: "#1a1a2e",
              border: "2px solid #00ddff",
              boxShadow: "3px 3px 0 #000",
              padding: "4px 8px",
              marginBottom: 8,
              fontSize: 13,
              color: "#fff",
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              flexShrink: 0,
            }}
          >
            <span style={{ color: "#00ddff", fontFamily: "'Press Start 2P', monospace", fontSize: 9 }}>COUNT:</span>
            {RANKS.map((r) => (
              <span key={r} style={{ opacity: rankCounts[r] === 0 ? 0.3 : 1 }}>
                {r}:{rankCounts[r]}
              </span>
            ))}
          </div>
        )}

        {/* Dead Reckoning (joker) */}
        {hasJoker("deadreck") && bottomCard && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#1a1a2e",
              border: "2px solid #ddaa00",
              boxShadow: "3px 3px 0 #000",
              padding: "4px 8px",
              marginBottom: 8,
              flexShrink: 0,
            }}
          >
            <div style={{ fontSize: 9, color: "#ddaa00", fontFamily: "'Press Start 2P', monospace" }}>BOTTOM:</div>
            <div
              style={{
                background: "#fff",
                color: bottomCard.suit === "♥" || bottomCard.suit === "♦" ? "#c00000" : "#000",
                padding: "2px 6px",
                fontWeight: 700,
                border: "1px solid #000",
                fontSize: 16,
              }}
            >
              {bottomCard.rank}
              {bottomCard.suit}
            </div>
          </div>
        )}

        {/* Owned jokers strip */}
        {ownedJokers.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Math.min(ownedJokers.length, 4)}, 1fr)`,
              gap: 4,
              marginBottom: 8,
              flexShrink: 0,
            }}
          >
            {ownedJokers.map((j) => {
              const depleted =
                (j.id === "defib" && defibUsed) ||
                (j.id === "reshuffle" && reshuffleUsed) ||
                (j.id === "phoenix" && phoenixUsed);
              return (
                <JokerCard
                  key={j.id}
                  joker={j}
                  small
                  depleted={depleted}
                  selectable={false}
                  onSelect={() => {}}
                />
              );
            })}
          </div>
        )}

        {/* 3x3 grid — flick cards up/down to guess */}
        {phase === "playing" && (
          <div
            style={{
              flex: "1 1 0",
              minHeight: 0,
              minWidth: 0,
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gridTemplateRows: "repeat(3, 1fr)",
              gap: "clamp(4px, 1.2vmin, 12px)",
              padding: "4px 6px 6px 4px",
              marginBottom: 8,
              overflow: "visible",
              touchAction: "none",
            }}
          >
          {piles.map((pile, i) => {
            const top = pile[pile.length - 1];
            const isDead = deadPiles[i];
            const isSelected = selectedPile === i;
            const flashing = flashPile === i;
            const isPhoenixTarget = phoenixTarget === i;
            const justGotCard = newCardPile === i;
            const pileFloaters = floaters.filter((f) => f.pileIdx === i);

            const isBeingDragged = swipeOffset && swipeOffset.pileIdx === i;
            const dragDy = isBeingDragged ? swipeOffset.dy : 0;
            // Cap visual movement to avoid weird overflow
            const visualDy = Math.max(-120, Math.min(120, dragDy));
            const dragRotation = isBeingDragged ? visualDy * 0.1 : 0;
            const dragOpacity = isBeingDragged ? Math.max(0.6, 1 - Math.abs(visualDy) / 300) : 1;
            const dragGlow =
              isBeingDragged && Math.abs(dragDy) > 25
                ? dragDy < 0
                  ? "0 0 0 4px #ffff00, 0 0 24px rgba(255,255,0,0.6)"
                  : "0 0 0 4px #ffffff, 0 0 24px rgba(255,255,255,0.5)"
                : null;

            return (
              <button
                key={i}
                onClick={() => handlePileClick(i)}
                onTouchStart={onPileTouchStart(i)}
                onTouchMove={onPileTouchMove}
                onTouchEnd={onPileTouchEnd}
                onTouchCancel={onPileTouchEnd}
                disabled={(isDead && activeMode !== "defib") || phase !== "playing"}
                style={{
                  position: "relative",
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  width: "100%",
                  height: "100%",
                  cursor:
                    (isDead && activeMode !== "defib") || phase !== "playing"
                      ? "default"
                      : "pointer",
                  outline: isSelected
                    ? "3px solid #ffff00"
                    : activeMode === "defib" && isDead
                    ? "3px dashed #ff3355"
                    : activeMode === "reshuffle" && !isDead
                    ? "3px dashed #aa88ff"
                    : "none",
                  outlineOffset: 2,
                  animation: flashing
                    ? flashKind === "good"
                      ? "flashGood 0.55s ease"
                      : "flashBad 0.85s ease"
                    : "none",
                  zIndex: isBeingDragged ? 20 : "auto",
                  touchAction: "none",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    transform: isBeingDragged
                      ? `translateY(${visualDy}px) rotate(${dragRotation}deg)`
                      : undefined,
                    opacity: dragOpacity,
                    transition: isBeingDragged ? "none" : "transform 0.2s ease, opacity 0.2s ease",
                    filter: dragGlow ? `drop-shadow(${dragGlow})` : "none",
                    animation: !isBeingDragged && justGotCard
                      ? "cardSlideIn 0.55s cubic-bezier(0.2, 0.8, 0.2, 1)"
                      : !isBeingDragged && isDead && flashing
                      ? "cardFlip 0.85s ease"
                      : "none",
                  }}
                >
                  <Card card={top} faceDown={isDead} dim={isDead} peelCard={isDead ? top : null} />
                </div>
                {/* Direction hint that follows the dragged card */}
                {isBeingDragged && Math.abs(dragDy) > 25 && (
                  <div
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: dragDy < 0 ? "auto" : "auto",
                      bottom: dragDy < 0 ? "auto" : "auto",
                      transform: "translateX(-50%)",
                      [dragDy < 0 ? "bottom" : "top"]: "calc(100% + 8px)",
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: 11,
                      color: dragDy < 0 ? "#ffff00" : "#ffffff",
                      textShadow: "2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000",
                      pointerEvents: "none",
                      whiteSpace: "nowrap",
                      letterSpacing: 1,
                      zIndex: 30,
                    }}
                  >
                    {dragDy < 0 ? "▲ HIGHER" : "▼ LOWER"}
                  </div>
                )}
                {pile.length > 1 && !isDead && (
                  <div
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      background: "#000080",
                      color: "#ffff00",
                      border: "2px solid #000",
                      fontSize: 11,
                      padding: "0 4px",
                      fontFamily: "'VT323', monospace",
                      animation: justGotCard ? "stackBadgePop 0.55s ease" : "none",
                    }}
                  >
                    ×{pile.length}
                  </div>
                )}
                {isPhoenixTarget && isDead && !phoenixUsed && (
                  <div
                    style={{
                      position: "absolute",
                      top: -6,
                      left: -6,
                      background: "#ff6600",
                      color: "#000",
                      border: "2px solid #000",
                      fontSize: 10,
                      padding: "0 4px",
                      fontFamily: "'Press Start 2P', monospace",
                    }}
                  >
                    🔥{3 - phoenixCounter}
                  </div>
                )}
                {/* Floating score popups */}
                {pileFloaters.map((f) => (
                  <div
                    key={f.id}
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      pointerEvents: "none",
                      zIndex: 30,
                      animation: "floatUp 1.6s ease-out forwards",
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: "clamp(11px, 3vmin, 18px)",
                      color: f.color,
                      textShadow: "2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000",
                      whiteSpace: "pre",
                      textAlign: "center",
                      lineHeight: 1.3,
                    }}
                  >
                    {f.text}
                  </div>
                ))}
              </button>
            );
          })}
          </div>
        )}

        {/* Terminal message */}
        {phase === "playing" && (() => {
          // Always-visible scoring formula reflecting current state.
          const selPile = selectedPile !== null ? piles[selectedPile] : null;
          const depth = selPile ? selPile.length : null;
          const projectedStreak = streak + 1 + bankedStreak;
          const projStreakMult = Math.min(1 + Math.floor(projectedStreak / 3), 5);

          let formula;
          if (selPile) {
            // Show the actual numbers for the selected pile
            formula = `H/L: 10×${depth} = ${10 * depth} · SAME: 50 · streak ×${projStreakMult}`;
          } else {
            formula = `H/L: 10 × stack depth · SAME: 50 · next streak ×${projStreakMult}`;
          }

          const stats = `Streak ×${streak}${bankedStreak > 0 ? ` (+${bankedStreak} banked)` : ""} · ${deck.length} in deck · ${aliveCount} alive`;

          return (
            <div
              style={{
                background: "#000",
                color: "#00ff00",
                border: "2px solid #000",
                boxShadow: "3px 3px 0 #000",
                padding: "6px 10px",
                marginBottom: 8,
                fontSize: 14,
                flexShrink: 0,
                fontFamily: "'VT323', monospace",
                lineHeight: 1.3,
              }}
            >
              {message && (
                <div style={{ color: "#ffff00", marginBottom: 2 }}>
                  <span style={{ marginRight: 4 }}>&gt;</span>
                  {message}
                </div>
              )}
              <div>
                <span style={{ marginRight: 4, opacity: 0.6 }}>$</span>
                <span>{formula}</span>
              </div>
              <div style={{ opacity: 0.7 }}>
                <span style={{ marginRight: 4, opacity: 0.6 }}>$</span>
                <span>{stats}</span>
                <span style={{ animation: "blink 1s steps(2) infinite" }}>_</span>
              </div>
            </div>
          );
        })()}

        {/* Active joker abilities */}
        {phase === "playing" && (hasJoker("defib") || hasJoker("reshuffle")) && (
          <div style={{ display: "flex", gap: 6, marginBottom: 8, flexShrink: 0 }}>
            {hasJoker("defib") && (
              <DOSButton
                onClick={() =>
                  setActiveMode((m) => (m === "defib" ? null : "defib")) ||
                  setMessage(activeMode === "defib" ? "Cancelled." : "DEFIB: tap a dead pile.")
                }
                disabled={defibUsed || deadPiles.every((d) => !d)}
                variant="danger"
                small
                full
              >
                {activeMode === "defib" ? "✕ Cancel" : "⚡ Defib"}
              </DOSButton>
            )}
            {hasJoker("reshuffle") && (
              <DOSButton
                onClick={() =>
                  setActiveMode((m) => (m === "reshuffle" ? null : "reshuffle")) ||
                  setMessage(activeMode === "reshuffle" ? "Cancelled." : "RESHUFFLE: tap a live pile.")
                }
                disabled={reshuffleUsed}
                variant="default"
                small
                full
              >
                {activeMode === "reshuffle" ? "✕ Cancel" : "♻ Reshuffle"}
              </DOSButton>
            )}
          </div>
        )}

        {/* Guess controls with score previews */}
        {phase === "playing" && (() => {
          const previews = selectedPile !== null
            ? {
                lower: previewScore(piles[selectedPile], "lower", deck, ownedJokers, streak, bankedStreak, aliveCount, correctCount),
                same: previewScore(piles[selectedPile], "same", deck, ownedJokers, streak, bankedStreak, aliveCount, correctCount),
                higher: previewScore(piles[selectedPile], "higher", deck, ownedJokers, streak, bankedStreak, aliveCount, correctCount),
              }
            : null;

          const renderBtn = (dir, label, variant, keyHint) => {
            const p = previews?.[dir];
            const disabled = selectedPile === null || !!activeMode;
            const colors = {
              default: { bg: "#c0c0c0", fg: "#000" },
              primary: { bg: "#ffff00", fg: "#000" },
              danger: { bg: "#ff5555", fg: "#000" },
            }[variant];
            return (
              <button
                onClick={() => guess(dir)}
                disabled={disabled}
                className="active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-transform"
                style={{
                  background: disabled ? "#888" : colors.bg,
                  color: colors.fg,
                  border: "2px solid #000",
                  boxShadow: disabled ? "none" : "3px 3px 0 #000",
                  padding: "8px 6px",
                  fontFamily: "'VT323', monospace",
                  cursor: disabled ? "not-allowed" : "pointer",
                  opacity: disabled ? 0.6 : 1,
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  position: "relative",
                }}
              >
                {!isTouchDevice && keyHint && (
                  <div
                    style={{
                      position: "absolute",
                      top: 2,
                      right: 4,
                      fontSize: 9,
                      fontFamily: "'Press Start 2P', monospace",
                      color: "rgba(0,0,0,0.55)",
                      border: "1px solid rgba(0,0,0,0.5)",
                      padding: "1px 3px",
                      lineHeight: 1,
                      borderRadius: 2,
                      background: "rgba(255,255,255,0.3)",
                    }}
                  >
                    {keyHint}
                  </div>
                )}
                <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1 }}>{label}</div>
                {p && (
                  <>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        lineHeight: 1,
                        color: dir === "same" ? "#5a0000" : "#000",
                      }}
                    >
                      +{p.guaranteedScore}
                      {p.conditional.length > 0 && <span style={{ fontSize: 12 }}>+</span>}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.7, lineHeight: 1 }}>
                      {Math.round(p.prob * 100)}% chance
                    </div>
                  </>
                )}
              </button>
            );
          };

          return (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, flexShrink: 0 }}>
              {renderBtn("lower", "▼ Lower", "default", "↓")}
              {renderBtn("same", "= Same", "danger", "SPC")}
              {renderBtn("higher", "▲ Higher", "primary", "↑")}
            </div>
          );
        })()}

        {phase === "roundWon" && (
          <div
            style={{
              flex: "1 1 0",
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              overflow: "auto",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                background: "#c0c0c0",
                border: "2px solid #000",
                boxShadow: "3px 3px 0 #000",
                padding: 10,
                color: "#000",
                fontSize: 15,
                textAlign: "center",
                flexShrink: 0,
              }}
            >
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11, marginBottom: 6 }}>CHOOSE A JOKER</div>
              <div style={{ fontSize: 14 }}>Run total: {runScore} pts</div>
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {jokerOptions.map((j) => (
                <JokerCard key={j.id} joker={j} selectable onSelect={() => chooseJoker(j)} />
              ))}
              {jokerOptions.length === 0 && (
                <DOSButton
                  onClick={() => {
                    const nextRound = round + 1;
                    setRound(nextRound);
                    startRound(nextRound);
                  }}
                  variant="success"
                  full
                >
                  No more jokers — continue
                </DOSButton>
              )}
            </div>
          </div>
        )}

        {phase === "runOver" && (
          <div
            style={{
              flex: "1 1 0",
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              justifyContent: "center",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                background: "#ff5555",
                border: "2px solid #000",
                boxShadow: "3px 3px 0 #000",
                padding: 16,
                color: "#000",
                textAlign: "center",
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 12,
              }}
            >
              ROBOT WINS
              <div style={{ fontFamily: "'VT323', monospace", fontSize: 16, marginTop: 8 }}>
                Reached round {round}
              </div>
              <div style={{ fontFamily: "'VT323', monospace", fontSize: 16 }}>
                {runScore} total pts
              </div>
            </div>
            <DOSButton onClick={startNewRun} variant="danger" full>
              ↻ New Run
            </DOSButton>
          </div>
        )}

        {phase === "runWon" && (
          <div
            style={{
              flex: "1 1 0",
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              justifyContent: "center",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                background: "#ffff00",
                border: "2px solid #000",
                boxShadow: "3px 3px 0 #000",
                padding: 16,
                color: "#000",
                textAlign: "center",
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 12,
              }}
            >
              ★ YOU BEAT THE ROBOT ★
              <div style={{ fontFamily: "'VT323', monospace", fontSize: 20, marginTop: 8 }}>
                You exhausted the full deck!
              </div>
              <div style={{ fontFamily: "'VT323', monospace", fontSize: 16, marginTop: 4 }}>
                Total: {runScore} pts
              </div>
            </div>
            <DOSButton onClick={startNewRun} variant="primary" full>
              ↻ New Run
            </DOSButton>
          </div>
        )}

      </div>

      {/* Rules modal */}
      {showRules && (
        <div
          onClick={closeRules}
          style={{
            position: "fixed",
            inset: 0,
            background: rulesClosing ? "rgba(0,0,0,0)" : "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 20,
            transition: "background 0.35s ease",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#c0c0c0",
              border: "2px solid #000",
              boxShadow: "4px 4px 0 #000",
              padding: 16,
              maxWidth: 400,
              width: "100%",
              fontFamily: "'VT323', monospace",
              color: "#000",
              transformOrigin:
                rulesClosing && helpBtnPos
                  ? `${helpBtnPos.x}px ${helpBtnPos.y}px`
                  : "center center",
              transform: rulesClosing ? "scale(0.02) rotate(-12deg)" : "scale(1) rotate(0)",
              opacity: rulesClosing ? 0 : 1,
              transition: rulesClosing
                ? "transform 0.35s cubic-bezier(0.5, 0, 0.75, 0), opacity 0.35s ease 0.1s"
                : "transform 0.2s ease, opacity 0.2s ease",
              animation: !rulesClosing ? "modalPop 0.3s cubic-bezier(0.2, 1.3, 0.4, 1)" : "none",
            }}
          >
            <div
              style={{
                background: "#000080",
                color: "#fff",
                padding: "4px 8px",
                marginBottom: 10,
                marginTop: -16,
                marginLeft: -16,
                marginRight: -16,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 10,
              }}
            >
              <span>HOW TO PLAY</span>
              <button
                onClick={closeRules}
                style={{
                  background: "#c0c0c0",
                  border: "1px solid #000",
                  width: 18,
                  height: 18,
                  cursor: "pointer",
                  fontSize: 12,
                  lineHeight: 1,
                  padding: 0,
                }}
              >
                ×
              </button>
            </div>
            <div style={{ fontSize: 16, lineHeight: 1.4 }}>
              Tap a pile, guess HIGHER, LOWER, or SAME. Hit the round score goal to clear. Clear a round → choose a joker.
              <br />
              <br />
              <b>Scoring:</b> Higher/Lower = 10 × stack depth (1st guess = 10, 2nd guess on same pile = 20, 3rd = 30...). SAME correct = 50 + revives all dead piles. Streak ×2 at 3 in a row, scaling up to ×5.
              <br />
              <br />
              <b>Aces</b> are high or low, whichever helps you. Jokers stack their multipliers.
              <br />
              <br />
              <b>Controls:</b>
              <br />
              <span style={{ fontSize: 14 }}>
                · <b>Mobile:</b> flick a card UP for HIGHER, DOWN for LOWER. Tap to select for SAME guess via button.
                <br />
                · <b>Desktop:</b> ← → cycle piles, ↑ HIGHER, ↓ LOWER, Space SAME, 1-9 select pile.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
