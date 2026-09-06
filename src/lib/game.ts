import { supabase } from "./supabase";
export interface RuinProgress {
  ruin: number;
  surveyed: boolean;
  hintsOpened: number;
  revealed: boolean;
  hints: string[];
  solution: string | null;
}
export interface GameState {
  playerId: string;
  xp: number;
  completedAt: string | null;
  signedUpAt: string;
  isAdmin: boolean;
  /** Total registered explorers, counted server-side across all players. */
  explorers: number;
  cleared: number[];
  progress: RuinProgress[];
}
export interface RankEntry {
  name: string;
  xp: number;
  completionMs: number;
  rank: number;
  isYou: boolean;
}
export interface Leaderboard {
  top: RankEntry[];
  you: RankEntry | null;
}
export async function gameRpc<T>(
  name: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  if (!supabase) throw new Error("Server play is unavailable.");
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message);
  if (data === null) throw new Error("The server returned no data.");
  return data as T;
}
export const fetchGameState = () => gameRpc<GameState>("game_state");
export const gameAction = (
  action: "survey" | "hint" | "reveal",
  ruin: number,
  hintIndex: number | null = null,
) =>
  gameRpc("game_action", {
    action,
    ruin,
    request_id: crypto.randomUUID(),
    hint_index: hintIndex,
  });
