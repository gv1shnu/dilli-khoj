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

  it("rejects an oversized value from its length without encoding a full copy", () => {
    const encode = TextEncoder.prototype.encode;
    let widestEncoded = 0;
    TextEncoder.prototype.encode = function (input?: string) {
      widestEncoded = Math.max(widestEncoded, input?.length ?? 0);
      return encode.call(this, input ?? "");
    };
    try {
      const huge = "x".repeat(5_000_000);
      const size = resultByteLength(["big"], [{ big: huge }], 64 * 1024);
      expect(size).toBeGreaterThan(64 * 1024);
      // The 5M-char value must never be handed to encode(); only small strings are.
      expect(widestEncoded).toBeLessThan(64 * 1024);
    } finally {
      TextEncoder.prototype.encode = encode;
    }
  });

  it("counts array and object values by their serialized size", () => {
    const scalarish = resultByteLength(["v"], [{ v: "[object Object]" }]);
    const object = resultByteLength(["v"], [{ v: { a: 1, b: "hello world" } }]);
    expect(object).toBeGreaterThan(scalarish);
  });
});
