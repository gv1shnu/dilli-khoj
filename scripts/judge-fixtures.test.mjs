import { beforeAll, afterAll, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { RUIN_QUESTIONS } from "../src/questions/catalog";
import { generateJudgeContent, JUDGE_VERSION } from "./judge-content.mjs";
import { localDatabase } from "./local-database.mjs";
import { compareResult } from "../supabase/functions/_shared/result-compare";
let db;
beforeAll(async () => {
  db = await localDatabase();
}, 30000);
afterAll(async () => {
  await db?.close();
});
it("server fixture migration is reproducible from authoring sources", async () => {
  expect(
    await readFile(
      new URL(
        "../supabase/migrations/20260904120000_all_ruin_fixtures.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  ).toBe(await generateJudgeContent(RUIN_QUESTIONS));
}, 30000);
for (const q of RUIN_QUESTIONS)
  it(`server ruin ${q.id}: three cases, equivalent queries, actual near misses and role boundaries`, async () => {
    const manifest = (
      await db.query(
        "select game_private.get_judge_manifest($1::smallint,$2) as value",
        [q.id, JUDGE_VERSION],
      )
    ).rows[0].value;
    expect(manifest.cases).toHaveLength(3);
    for (const c of manifest.cases) {
      await db.exec(
        `set role dilli_judge_executor; set search_path = ${c.fixtureSchema}, pg_catalog;`,
      );
      try {
        for (const sql of [q.canonicalSolution, ...q.acceptedVariants]) {
          const result = await db.query(sql);
          expect(
            compareResult(
              { columns: result.fields.map((f) => f.name), rows: result.rows },
              {
                columns: c.expectedColumns,
                rows: c.expectedRows,
                comparison: c.comparison,
              },
            ),
          ).toBe(true);
        }
        for (const sql of [
          q.starterSql,
          `SELECT * FROM (${q.canonicalSolution.replace(/;\s*$/, "")}) q LIMIT 0`,
          `SELECT * FROM (${q.canonicalSolution.replace(/;\s*$/, "")}) q UNION ALL SELECT * FROM (${q.canonicalSolution.replace(/;\s*$/, "")}) q`,
        ]) {
          const result = await db.query(sql);
          expect(
            compareResult(
              { columns: result.fields.map((f) => f.name), rows: result.rows },
              {
                columns: c.expectedColumns,
                rows: c.expectedRows,
                comparison: c.comparison,
              },
            ),
          ).toBe(false);
        }
        await expect(
          db.query("select * from game_private.question_help"),
        ).rejects.toThrow(/permission denied/);
        await expect(
          db.query(`delete from "${q.schema[0].name}"`),
        ).rejects.toThrow();
      } finally {
        await db.exec("reset role; reset search_path");
      }
      await db.exec("set role authenticated");
      try {
        await expect(
          db.query(`select * from ${c.fixtureSchema}."${q.schema[0].name}"`),
        ).rejects.toThrow(/permission denied/);
      } finally {
        await db.exec("reset role");
      }
    }
  });
