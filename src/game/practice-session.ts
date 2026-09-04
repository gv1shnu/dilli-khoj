import { PRACTICE_VERSION } from "../questions/practice";

export const PRACTICE_STORAGE_KEY = `dk_practice_${PRACTICE_VERSION}`;
/** The legacy shared key is deliberately never imported into a signed-in account. */
export function practiceStorageKey(playerId: string | null): string {
  return `${PRACTICE_STORAGE_KEY}_${playerId ?? "local-dev"}`;
}

export interface PracticeSession {
  selectedId: number;
  drafts: Record<number, string>;
  /** Ruins whose visible case has been passed (the local "cleared" set). */
  passed: number[];
  /** Ruins whose archive has been opened at least once. */
  surveyed: number[];
  /** Epoch ms of first play (proxy for sign-up until server-authoritative). */
  startedAt: number | null;
  /** Epoch ms when all 20 ruins were first cleared. */
  completedAt: number | null;
}

const validId = (id: unknown): id is number =>
  Number.isInteger(id) && Number(id) >= 1 && Number(id) <= 20;

function idArray(value: unknown): number[] {
  return Array.isArray(value) ? [...new Set(value.filter(validId))] : [];
}

function epoch(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function parsePracticeSession(raw: string | null): PracticeSession {
  const empty: PracticeSession = {
    selectedId: 1,
    drafts: {},
    passed: [],
    surveyed: [],
    startedAt: null,
    completedAt: null,
  };
  try {
    const value: unknown = JSON.parse(raw ?? "null");
    if (!value || typeof value !== "object") return empty;
    const data = value as Record<string, unknown>;
    const drafts: Record<number, string> = {};
    if (data.drafts && typeof data.drafts === "object") {
      for (const [id, sql] of Object.entries(data.drafts)) {
        if (
          validId(Number(id)) &&
          typeof sql === "string" &&
          new TextEncoder().encode(sql).length <= 10_000
        ) {
          drafts[Number(id)] = sql;
        }
      }
    }
    return {
      selectedId: validId(data.selectedId) ? data.selectedId : 1,
      drafts,
      passed: idArray(data.passed),
      surveyed: idArray(data.surveyed),
      startedAt: epoch(data.startedAt),
      completedAt: epoch(data.completedAt),
    };
  } catch {
    return empty;
  }
}
