// XP economy for Dilli Khoj. Server-authoritative in production; this module is the
// single definition the UI, the judge and the leaderboard agree on.
//
// Design goals:
// - Never punish trying: a wrong Submit costs nothing, so students submit freely.
// - Solving is always free and always available — debt never blocks *solving*.
// - Help (hints, reveals) must be PAID FOR: you cannot open help you cannot afford.
//   This is the anti-bypass rule — you cannot reveal your way to the end.
//
// Anti-bypass math (see EXHAUSTS_AROUND below): a player who takes maximum help on
// every level (all hints, then the reveal) runs out of affordable help around level
// 13-14 of 20 (~two-thirds), and must solve the rest unaided. A no-help player tops
// out at MAX_XP.

import { RUIN_SEQUENCE, TOTAL_RUINS } from "./ruins";

export const XP = {
  /** Starting balance for every new player. */
  START: 100,
  /** First time a ruin's archive is surveyed (opened). */
  SURVEY: 5,
  /** First authoritative pass of a ruin. */
  SOLVE: 20,
  /** Each hint opened (a purchase — must be affordable). */
  HINT: -10,
  /** Full solution reveal, available only after all of a ruin's hints are open (a purchase). */
  REVEAL: -20,
  /** A wrong submission. */
  WRONG: 0,
  /** A non-scoring revisit / practice attempt. */
  REVISIT: 0,
} as const;

export const HINT_COST = -XP.HINT; // 10
export const REVEAL_COST = -XP.REVEAL; // 20

/** Can the player afford to open a hint? (Help is gated by balance; solving is not.) */
export function canOpenHint(xp: number): boolean {
  return xp >= HINT_COST;
}

/** Can the player afford to reveal? Requires all hints already open (checked by caller) and the cost. */
export function canReveal(xp: number): boolean {
  return xp >= REVEAL_COST;
}

/** Total hints available across all ruins (ruins 1-10 have one, 11-20 have two). */
export const TOTAL_HINTS = RUIN_SEQUENCE.reduce((sum, ruin) => sum + ruin.hints, 0);

/** Best possible balance: start + every survey + every solve, taking no help. */
export const MAX_XP = XP.START + TOTAL_RUINS * XP.SURVEY + TOTAL_RUINS * XP.SOLVE;

/**
 * The level at which a maximum-help player can no longer afford the reveal, computed
 * by walking the sequence (each level pays its hints then the reveal, and earns
 * survey + solve). This is the "no bypass" guarantee; it should land near two-thirds.
 */
export const EXHAUSTS_AROUND = (() => {
  let xp = XP.START;
  for (const ruin of RUIN_SEQUENCE) {
    xp += XP.SURVEY; // survey on arrival
    // Open every hint you can afford.
    for (let h = 0; h < ruin.hints; h += 1) {
      if (!canOpenHint(xp)) return ruin.order;
      xp += XP.HINT;
    }
    // Reveal if the hints are all open and you can afford it; else you must solve unaided.
    if (!canReveal(xp)) return ruin.order;
    xp += XP.REVEAL;
    xp += XP.SOLVE; // you still must (and do) solve to progress
  }
  return TOTAL_RUINS; // survived to the end (should not happen with these values)
})();

export interface Scorecard {
  solved: number;
  xp: number;
  /** Milliseconds from sign-up to the moment all ruins were solved; null until complete. */
  completionMs: number | null;
}

/** True once every ruin has been solved. Only completers appear on the leaderboard. */
export function hasCompleted(card: Scorecard): boolean {
  return card.solved >= TOTAL_RUINS;
}

/**
 * Leaderboard order for COMPLETERS: highest XP first, then fastest completion time.
 * Non-completers are excluded by the caller (hasCompleted).
 */
export function compareCompletion(a: Scorecard, b: Scorecard): number {
  if (a.xp !== b.xp) return b.xp - a.xp;
  return (a.completionMs ?? Infinity) - (b.completionMs ?? Infinity);
}

if (import.meta.env.DEV) {
  if (MAX_XP !== 600) console.error(`XP math drifted: MAX_XP is ${MAX_XP}, expected 600.`);
  if (TOTAL_HINTS !== 30) console.error(`Hint total drifted: ${TOTAL_HINTS}, expected 30.`);
  // Anti-bypass sanity: full-help exhaustion should be in the back third (levels 12-16).
  if (EXHAUSTS_AROUND < 12 || EXHAUSTS_AROUND > 16) {
    console.error(`Anti-bypass drift: full-help exhausts at level ${EXHAUSTS_AROUND} (want ~13-14).`);
  }
}
