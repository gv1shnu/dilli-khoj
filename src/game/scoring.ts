// XP economy for Dilli Khoj. Server-authoritative in production; this module is the
// single definition the UI, the judge and the leaderboard agree on.
//
// Design goals:
// - Never punish trying: a wrong Submit costs nothing, so students submit freely.
// - Help has a real but survivable price, so the leaderboard rewards independence.
// - XP may go negative; debt never blocks learning or movement.
//
// The numbers below are chosen so a hint costs half a solve, and a full reveal costs
// more than the solve it unlocks (a reveal is a last resort, and you must still solve).

import { RUIN_SEQUENCE, TOTAL_RUINS } from "./ruins";

export const XP = {
  /** Starting balance for every new player. */
  START: 100,
  /** First time a ruin's archive is surveyed (opened). */
  SURVEY: 5,
  /** First authoritative pass of a ruin. */
  SOLVE: 20,
  /** Each hint opened. */
  HINT: -10,
  /** Full solution reveal, available only after all of a ruin's hints are open. */
  REVEAL: -30,
  /** A wrong submission. */
  WRONG: 0,
  /** A non-scoring revisit / practice attempt. */
  REVISIT: 0,
} as const;

/** Total hints available across all ruins (ruins 1-10 have one, 11-20 have two). */
export const TOTAL_HINTS = RUIN_SEQUENCE.reduce((sum, ruin) => sum + ruin.hints, 0);

/** Best possible balance: start + every survey + every solve, taking no help. */
export const MAX_XP = XP.START + TOTAL_RUINS * XP.SURVEY + TOTAL_RUINS * XP.SOLVE;

/** Lowest balance a fully-helped completion can reach (all hints + all reveals used). */
export const MIN_XP_FLOOR =
  MAX_XP + TOTAL_HINTS * XP.HINT + TOTAL_RUINS * XP.REVEAL;

// With 20 ruins and the values above:
//   MAX_XP        = 100 + 20*5 + 20*20 = 600
//   TOTAL_HINTS   = 10*1 + 10*2        = 30   (=> -300 if every hint is opened)
//   all reveals   = 20 * -30           = -600
//   MIN_XP_FLOOR  = 600 - 300 - 600    = -300 (negative is allowed by design)

export interface Scorecard {
  solved: number;
  xp: number;
}

/** Leaderboard order: most first-time solves, then most XP, then least time (handled elsewhere). */
export function compareScorecards(a: Scorecard, b: Scorecard): number {
  if (a.solved !== b.solved) return b.solved - a.solved;
  return b.xp - a.xp;
}

if (import.meta.env.DEV) {
  if (MAX_XP !== 600) console.error(`XP math drifted: MAX_XP is ${MAX_XP}, expected 600.`);
  if (TOTAL_HINTS !== 30) console.error(`Hint total drifted: ${TOTAL_HINTS}, expected 30.`);
}
