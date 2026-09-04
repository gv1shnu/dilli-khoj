import { describe, expect, it } from "vitest";
import { parsePracticeSession } from "./practice-session";

const EMPTY = { selectedId: 1, drafts: {}, passed: [], surveyed: [], startedAt: null, completedAt: null };

describe("non-scoring local practice session", () => {
  it("restores drafts, selected archive and unique visible passes", () => {
    expect(parsePracticeSession(JSON.stringify({ selectedId: 15, drafts: { 15: "SELECT heap_no FROM heaps" }, passed: [1, 6, 6] })))
      .toEqual({ ...EMPTY, selectedId: 15, drafts: { 15: "SELECT heap_no FROM heaps" }, passed: [1, 6] });
  });
  it("handles blocked, malformed or stale storage without crashing", () => {
    for (const raw of [null, "broken", "null", "[]", "123"]) {
      expect(parsePracticeSession(raw)).toEqual(EMPTY);
    }
  });
  it("discards invalid ids, large queries and fake authoritative fields", () => {
    expect(parsePracticeSession(JSON.stringify({ selectedId: 99, drafts: { 0: "bad", 2: "x".repeat(10001), 3: "SELECT 1" }, passed: [0, 2, 21, "3"], xp: 999, solved: 20 })))
      .toEqual({ ...EMPTY, drafts: { 3: "SELECT 1" }, passed: [2] });
  });
  it("restores survey progress and sign-up/completion timestamps", () => {
    expect(parsePracticeSession(JSON.stringify({ surveyed: [1, 2, 2, 99], startedAt: 1000, completedAt: 2000 })))
      .toEqual({ ...EMPTY, surveyed: [1, 2], startedAt: 1000, completedAt: 2000 });
    // Non-numeric timestamps are discarded.
    expect(parsePracticeSession(JSON.stringify({ startedAt: "soon", completedAt: null })).startedAt).toBeNull();
  });
});
