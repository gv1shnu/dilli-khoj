import { PRACTICE_VERSION } from "../questions/practice";

export const PRACTICE_STORAGE_KEY = `dk_practice_${PRACTICE_VERSION}`;

export interface PracticeSession {
  selectedId: number;
  drafts: Record<number, string>;
  passed: number[];
}

export function parsePracticeSession(raw: string | null): PracticeSession {
  const empty: PracticeSession = { selectedId: 1, drafts: {}, passed: [] };
  try {
    const value: unknown = JSON.parse(raw ?? "null");
    if (!value || typeof value !== "object") return empty;
    const data = value as Record<string, unknown>;
    const validId = (id: unknown): id is number => Number.isInteger(id) && Number(id) >= 1 && Number(id) <= 20;
    const drafts: Record<number, string> = {};
    if (data.drafts && typeof data.drafts === "object") {
      for (const [id, sql] of Object.entries(data.drafts)) {
        if (validId(Number(id)) && typeof sql === "string" && new TextEncoder().encode(sql).length <= 10_000) {
          drafts[Number(id)] = sql;
        }
      }
    }
    return {
      selectedId: validId(data.selectedId) ? data.selectedId : 1,
      drafts,
      passed: Array.isArray(data.passed) ? [...new Set(data.passed.filter(validId))] : [],
    };
  } catch {
    return empty;
  }
}
