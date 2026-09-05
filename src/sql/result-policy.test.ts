import { describe, expect, it } from "vitest";
import { diagnoseOrderedResult, matchesOrderedResult } from "./result-policy";

const expected = {
  columns: ["stall_id"],
  rows: [{ stall_id: 102 }, { stall_id: 107 }],
};

describe("ordered result comparison", () => {
  it("compares PostgreSQL dates with generated JSON dates", () => {
    expect(
      matchesOrderedResult(
        {
          columns: ["date"],
          rows: [{ date: new Date("2042-01-01T00:00:00.000Z") }],
        },
        { columns: ["date"], rows: [{ date: "2042-01-01T00:00:00.000Z" }] },
      ),
    ).toBe(true);
  });
  it("accepts the expected columns, values and order", () => {
    expect(matchesOrderedResult(expected, expected)).toBe(true);
  });

  it("rejects missing traps and wrong ordering", () => {
    expect(
      matchesOrderedResult(
        { columns: ["stall_id"], rows: [{ stall_id: 107 }, { stall_id: 102 }] },
        expected,
      ),
    ).toBe(false);
    expect(
      matchesOrderedResult(
        { columns: ["stall_id"], rows: [{ stall_id: 102 }] },
        expected,
      ),
    ).toBe(false);
  });

  it("rejects an aliased output column", () => {
    expect(
      matchesOrderedResult(
        { columns: ["id"], rows: [{ id: 102 }, { id: 107 }] },
        expected,
      ),
    ).toBe(false);
  });

  it("diagnoses result shape without exposing expected values", () => {
    expect(
      diagnoseOrderedResult({ columns: ["id"], rows: [{ id: 102 }] }, expected)
        .code,
    ).toBe("columns");
    expect(
      diagnoseOrderedResult(
        { columns: ["stall_id"], rows: [{ stall_id: 102 }] },
        expected,
      ).code,
    ).toBe("missing_rows");
    expect(
      diagnoseOrderedResult(
        {
          columns: ["stall_id"],
          rows: [{ stall_id: 102 }, { stall_id: 102 }, { stall_id: 107 }],
        },
        expected,
      ).code,
    ).toBe("duplicate_rows");
    expect(
      diagnoseOrderedResult(
        { columns: ["stall_id"], rows: [{ stall_id: 107 }, { stall_id: 102 }] },
        expected,
      ).code,
    ).toBe("order");
    const valueFeedback = diagnoseOrderedResult(
      { columns: ["stall_id"], rows: [{ stall_id: 999 }, { stall_id: 107 }] },
      expected,
    );
    expect(valueFeedback.code).toBe("values");
    expect(valueFeedback.message).not.toContain("102");
    expect(valueFeedback.message).not.toContain("107");
  });
});
