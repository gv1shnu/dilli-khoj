// Sequential progression logic. Ruins must be cleared in order; a ruin is unlocked
// only once the previous one is cleared. Cleared ruins stay open for revisiting.
//
// "Cleared" is driven by the player's cleared set. Locally that is the set of ruins
// whose visible case has been passed (non-scoring practice proxy); in production it is
// the set of authoritative first-solves. Both are just an array of ruin ids.

import { RUIN_SEQUENCE, TOTAL_RUINS } from "./ruins";

export type RuinState = "locked" | "current" | "cleared";

export function isCleared(id: number, cleared: readonly number[]): boolean {
  return cleared.includes(id);
}

/** The first ruin (in order) that has not been cleared — the player's frontier. */
export function currentRuinId(cleared: readonly number[]): number {
  for (const ruin of RUIN_SEQUENCE) {
    if (!cleared.includes(ruin.id)) return ruin.id;
  }
  return TOTAL_RUINS; // everything cleared: stay on the last ruin
}

/** A ruin is playable if it is the current frontier or already cleared (revisit). */
export function isUnlocked(id: number, cleared: readonly number[]): boolean {
  return isCleared(id, cleared) || id === currentRuinId(cleared);
}

export function ruinState(id: number, cleared: readonly number[]): RuinState {
  if (isCleared(id, cleared)) return "cleared";
  if (id === currentRuinId(cleared)) return "current";
  return "locked";
}

export function clearedCount(cleared: readonly number[]): number {
  return RUIN_SEQUENCE.reduce((n, ruin) => (cleared.includes(ruin.id) ? n + 1 : n), 0);
}

export function allCleared(cleared: readonly number[]): boolean {
  return clearedCount(cleared) >= TOTAL_RUINS;
}

/** Clamp a desired selection to the nearest playable ruin (never a locked one). */
export function clampToUnlocked(id: number, cleared: readonly number[]): number {
  return isUnlocked(id, cleared) ? id : currentRuinId(cleared);
}
