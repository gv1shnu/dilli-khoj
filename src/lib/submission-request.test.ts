import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { pendingSubmission, finishSubmission } from "./submission-request";
import {
  practiceStorageKey,
  parsePracticeSession,
} from "../game/practice-session";
beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => values.set(k, v),
    removeItem: (k: string) => values.delete(k),
  });
});
afterEach(() => vi.unstubAllGlobals());
it("isolates drafts and offline preview keys by account", () => {
  const a = practiceStorageKey("alice"),
    b = practiceStorageKey("bob");
  expect(a).not.toBe(b);
  expect(a).not.toBe(practiceStorageKey(null));
  localStorage.setItem(
    a,
    JSON.stringify({ drafts: { 1: "SELECT private_draft" }, passed: [1] }),
  );
  expect(parsePracticeSession(localStorage.getItem(b)).drafts).toEqual({});
});
it("preserves a request ID across retries and replaces it only for new work", () => {
  const p = pendingSubmission("a", 1, "v1", "SELECT 1");
  expect(pendingSubmission("a", 1, "v1", "SELECT 1").id).toBe(p.id);
  expect(pendingSubmission("b", 1, "v1", "SELECT 1").id).not.toBe(p.id);
  const changed = pendingSubmission("a", 1, "v1", "SELECT 2");
  expect(changed.id).not.toBe(p.id);
  finishSubmission("a", 1, p.id);
  expect(pendingSubmission("a", 1, "v1", "SELECT 2").id).toBe(changed.id);
  finishSubmission("a", 1, changed.id);
  expect(pendingSubmission("a", 1, "v1", "SELECT 2").id).not.toBe(changed.id);
});
