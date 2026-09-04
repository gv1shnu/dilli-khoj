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
        {
          columns: ["stall_id"],
          rows: [{ stall_id: 102 }, { stall_id: 107n }],
        },
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
        {
          columns: ["status"],
          rows: [{ status: "open" }, { status: "closed" }, { status: "open" }],
        },
        {
          columns: ["status"],
          rows: [["open"], ["open"], ["closed"]],
          comparison: "unordered",
        },
      ),
    ).toBe(true);
  });
});

it("compares PostgreSQL bigint/numeric strings exactly without treating text as numbers", () => {
  const expected = {
    columns: ["n"],
    columnTypes: [1700],
    rows: [["12.00"]],
    comparison: "ordered" as const,
  };
  expect(
    compareResult(
      { columns: ["n"], columnTypes: [1700], rows: [{ n: "12" }] },
      expected,
    ),
  ).toBe(true);
  expect(
    compareResult(
      {
        columns: ["n"],
        columnTypes: [1700],
        rows: [{ n: "12.00000000000000000001" }],
      },
      expected,
    ),
  ).toBe(false);
  expect(
    compareResult(
      { columns: ["n"], columnTypes: [25], rows: [{ n: "12.00" }] },
      expected,
    ),
  ).toBe(false);
  expect(
    compareResult(
      { columns: ["n"], columnTypes: [20], rows: [{ n: "3" }] },
      { columns: ["n"], rows: [[3]], comparison: "ordered" },
    ),
  ).toBe(true);
});
