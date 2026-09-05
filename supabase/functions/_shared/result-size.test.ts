import { describe, expect, it } from "vitest";
import { resultByteLength } from "./result-size";

describe("judge result size accounting", () => {
  it("counts UTF-8 data instead of JavaScript characters", () => {
    const ascii = resultByteLength(["item"], [{ item: "amber" }]);
    const unicode = resultByteLength(["item"], [{ item: "अम्बर" }]);
    expect(unicode).toBeGreaterThan(ascii);
  });

  it("handles database values that JSON.stringify cannot safely encode", () => {
    expect(() =>
      resultByteLength(
        ["large_id", "stamp", "raw"],
        [
          {
            large_id: 9_007_199_254_740_993n,
            stamp: new Date("2026-09-05T00:00:00Z"),
            raw: new Uint8Array(32),
          },
        ],
      ),
    ).not.toThrow();
  });
});
