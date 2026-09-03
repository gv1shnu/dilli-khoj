import { describe, expect, it } from "vitest";
import { compareResult } from "./result-compare";

const expected = {
  columns: ["stall_id"],
  rows: [[102], [107]],
  comparison: "ordered" as const,
};

describe("server result comparison", () => {
  it("accepts exact ordered output", () => {
    expect(
      compareResult(
        { columns: ["stall_id"], rows: [{ stall_id: 102 }, { stall_id: 107n }] },
        expected,
      ),
    ).toBe(true);
  });

  it("keeps order significant for ordered questions", () => {
    expect(
      compareResult(
        { columns: ["stall_id"], rows: [{ stall_id: 107 }, { stall_id: 102 }] },
        expected,
      ),
    ).toBe(false);
  });

  it("preserves duplicates while ignoring order for unordered questions", () => {
    expect(
      compareResult(
        { columns: ["status"], rows: [{ status: "open" }, { status: "closed" }, { status: "open" }] },
        {
          columns: ["status"],
          rows: [["open"], ["open"], ["closed"]],
          comparison: "unordered",
        },
      ),
    ).toBe(true);
  });
});
