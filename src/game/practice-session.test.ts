import { describe, expect, it } from "vitest";
import { parsePracticeSession } from "./practice-session";

describe("non-scoring local practice session", () => {
  it("restores drafts, selected archive and unique visible passes", () => {
    expect(parsePracticeSession(JSON.stringify({ selectedId: 15, drafts: { 15: "SELECT heap_no FROM heaps" }, passed: [1, 6, 6] })))
      .toEqual({ selectedId: 15, drafts: { 15: "SELECT heap_no FROM heaps" }, passed: [1, 6] });
  });
  it("handles blocked, malformed or stale storage without crashing", () => {
    for (const raw of [null, "broken", "null", "[]", "123"]) {
      expect(parsePracticeSession(raw)).toEqual({ selectedId: 1, drafts: {}, passed: [] });
    }
  });
  it("discards invalid ids, large queries and fake authoritative fields", () => {
    expect(parsePracticeSession(JSON.stringify({ selectedId: 99, drafts: { 0: "bad", 2: "x".repeat(10001), 3: "SELECT 1" }, passed: [0, 2, 21, "3"], xp: 999, solved: 20 })))
      .toEqual({ selectedId: 1, drafts: { 3: "SELECT 1" }, passed: [2] });
  });
});
