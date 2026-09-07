import { describe, expect, it } from "vitest";
import { toFriendlyError } from "./errors";

describe("toFriendlyError", () => {
  it("rewrites a fetch failure into an actionable line and keeps the raw detail", () => {
    const result = toFriendlyError(new TypeError("Failed to fetch"));
    expect(result.message).toMatch(/can't reach the server/i);
    expect(result.message).toMatch(/connection/i);
    expect(result.detail).toBe("Failed to fetch");
  });

  it("recognises expired sessions", () => {
    expect(toFriendlyError(new Error("JWT expired")).message).toMatch(
      /session expired/i,
    );
  });

  it("recognises permission errors", () => {
    expect(
      toFriendlyError(new Error("permission denied for function game_state"))
        .message,
    ).toMatch(/don't have access/i);
  });

  it("recognises timeouts", () => {
    expect(toFriendlyError(new Error("Request timed out")).message).toMatch(
      /too long/i,
    );
  });

  it("shows human-written domain messages verbatim without a details toggle", () => {
    const result = toFriendlyError(new Error("You already opened this hint."));
    expect(result.message).toBe("You already opened this hint.");
    expect(result.detail).toBeNull();
  });

  it("genericises raw exception noise but preserves it as detail", () => {
    const result = toFriendlyError(
      new TypeError("Cannot read properties of undefined (reading 'map')"),
    );
    expect(result.message).toBe("Something went wrong. Try again.");
    expect(result.detail).toBe(
      "Cannot read properties of undefined (reading 'map')",
    );
  });

  it("handles non-Error throws", () => {
    const result = toFriendlyError("boom");
    expect(result.message).toBe("boom");
    expect(toFriendlyError(undefined).message).toBe(
      "Something went wrong. Try again.",
    );
  });
});
