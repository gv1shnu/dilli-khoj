// XP economy for Dilli Khoj. Server-authoritative in production; this module is the
// single definition the UI, the judge and the leaderboard agree on.
//
// Design goals:
// - Never punish trying: a wrong Submit costs nothing, so students submit freely.
// - Solving is always free and always available — debt never blocks *solving*.
// - Help unfolds in stages: the first clue is free, a deeper clue is inexpensive,
//   and the full answer carries the largest deduction.

import { RUIN_SEQUENCE, TOTAL_RUINS } from "./ruins";

export const XP = {
  /** Starting balance for every new player. */
  START: 100,
  /** First time a ruin's archive is surveyed (opened). */
  SURVEY: 5,
  /** First authoritative pass of a ruin. */
  SOLVE: 20,
  /** First clue in every ruin. */
  HINT_FIRST: 0,
  /** Second, more explicit clue in ruins 11-20. */
  HINT_DEEP: -5,
  /** Full solution reveal, available only after all of a ruin's hints are open (a purchase). */
  REVEAL: -15,
  /** A wrong submission. */
  WRONG: 0,
  /** A non-scoring revisit / practice attempt. */
  REVISIT: 0,
} as const;

export const REVEAL_COST = -XP.REVEAL; // 15

export function hintCost(index: number): number {
  return index <= 1 ? -XP.HINT_FIRST : -XP.HINT_DEEP;
}

/** Can the player afford to open a hint? (Help is gated by balance; solving is not.) */
export function canOpenHint(xp: number, index = 1): boolean {
  return xp >= hintCost(index);
}

/** Can the player afford to reveal? Requires all hints already open (checked by caller) and the cost. */
export function canReveal(xp: number): boolean {
  return xp >= REVEAL_COST;
}

/** Total hints available across all ruins (ruins 1-10 have one, 11-20 have two). */
export const TOTAL_HINTS = RUIN_SEQUENCE.reduce(
  (sum, ruin) => sum + ruin.hints,
  0,
);

/** Best possible balance: start + every survey + every solve, taking no help. */
export const MAX_XP =
  XP.START + TOTAL_RUINS * XP.SURVEY + TOTAL_RUINS * XP.SOLVE;

/** Balance after taking every staged clue and reveal, then solving all ruins. */
export const FULL_HELP_END_XP = (() => {
  let xp: number = XP.START;
  for (const ruin of RUIN_SEQUENCE) {
    xp += XP.SURVEY;
    for (let h = 1; h <= ruin.hints; h += 1) xp -= hintCost(h);
    xp += XP.REVEAL;
    xp += XP.SOLVE;
  }
  return xp;
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
  if (MAX_XP !== 600)
    console.error(`XP math drifted: MAX_XP is ${MAX_XP}, expected 600.`);
  if (TOTAL_HINTS !== 30)
    console.error(`Hint total drifted: ${TOTAL_HINTS}, expected 30.`);
  if (FULL_HELP_END_XP !== 250)
    console.error(
      `Help economy drifted: full-help completion ends at ${FULL_HELP_END_XP} XP.`,
    );
}
