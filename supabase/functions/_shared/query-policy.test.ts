import { describe, expect, it } from "vitest";
import { inspectJudgeQuery } from "./query-policy";

const options = { allowedTables: ["stalls"] } as const;

describe("authoritative judge query policy", () => {
  it("accepts curriculum SELECT forms parsed by PostgreSQL 17", async () => {
    const accepted = [
      "SELECT stall_id FROM stalls WHERE status = 'open'",
      "WITH open_stalls AS (SELECT * FROM stalls WHERE status = 'open') SELECT count(*) FROM open_stalls",
      "SELECT stall_id FROM stalls EXCEPT SELECT stall_id FROM stalls WHERE status = 'closed'",
      "SELECT row_number() OVER (ORDER BY stall_id), lag(stall_id) OVER (ORDER BY stall_id) FROM stalls",
      "SELECT lower(stall_name), coalesce(status, 'unknown') FROM stalls",
    ];

    for (const sql of accepted) {
      await expect(inspectJudgeQuery(sql, options)).resolves.toMatchObject({ ok: true });
    }
  });

  it("rejects multiple and data-changing statements", async () => {
    await expect(inspectJudgeQuery("SELECT 1; SELECT 2", options)).resolves.toMatchObject({
      ok: false,
      code: "unsafe_query",
    });
    await expect(inspectJudgeQuery("DELETE FROM stalls", options)).resolves.toMatchObject({
      ok: false,
      code: "unsafe_query",
    });
    await expect(
      inspectJudgeQuery(
        "WITH removed AS (DELETE FROM stalls RETURNING *) SELECT * FROM removed",
        options,
      ),
    ).resolves.toMatchObject({ ok: false, code: "unsafe_query" });
  });

  it("rejects schema escapes, unknown relations and unsafe functions", async () => {
    await expect(inspectJudgeQuery("SELECT * FROM public.stalls", options)).resolves.toMatchObject({
      ok: false,
    });
    await expect(inspectJudgeQuery("SELECT * FROM pg_class", options)).resolves.toMatchObject({
      ok: false,
    });
    await expect(inspectJudgeQuery("SELECT pg_sleep(10) FROM stalls", options)).resolves.toMatchObject({
      ok: false,
    });
  });
});
