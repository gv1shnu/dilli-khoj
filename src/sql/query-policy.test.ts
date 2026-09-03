import { describe, expect, it } from "vitest";
import { checkPracticeQuery, splitStatements } from "./query-policy";

describe("practice query policy", () => {
  it("accepts SELECT and WITH queries", () => {
    expect(checkPracticeQuery("SELECT stall_id FROM stalls;").ok).toBe(true);
    expect(checkPracticeQuery("WITH open AS (SELECT 1) SELECT * FROM open").ok).toBe(true);
  });

  it("rejects mutations and multiple statements", () => {
    expect(checkPracticeQuery("DELETE FROM stalls")).toEqual({
      ok: false,
      reason: "Practice accepts SELECT or WITH … SELECT only.",
    });
    expect(checkPracticeQuery("SELECT 1; SELECT 2")).toEqual({
      ok: false,
      reason: "Run one statement at a time.",
    });
  });

  it("does not split on semicolons inside strings or comments", () => {
    expect(splitStatements("SELECT ';' AS mark; -- ;\n")).toEqual(["SELECT ';' AS mark"]);
    expect(splitStatements("/* ; */ SELECT $$;$$ AS mark;")).toEqual([
      "/* ; */ SELECT $$;$$ AS mark",
    ]);
  });
});
