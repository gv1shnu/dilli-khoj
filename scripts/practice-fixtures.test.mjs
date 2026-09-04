import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { RUIN_QUESTIONS } from "../src/questions/catalog";
import { fixtureSql } from "./practice-fixtures.mjs";
import { generatePracticeContent, tabular } from "./practice-content.mjs";
import { inspectJudgeQuery } from "../supabase/functions/_shared/query-policy";
import { matchesOrderedResult } from "../src/sql/result-policy";

let db;
beforeAll(async () => {
  db = await PGlite.create();
}, 30_000);
afterAll(async () => {
  await db?.close();
});

describe("20-archive fixture acceptance", () => {
  for (const question of RUIN_QUESTIONS) {
    it(`ruin ${question.id}: all variants, three fixtures and near misses`, async () => {
      expect(
        question.description.trim().split(/\s+/).length,
      ).toBeLessThanOrEqual(35);
      expect(question.hints.length).toBe(question.id <= 10 ? 1 : 2);
      for (const hint of question.hints)
        expect(hint.split(/\s+/).length).toBeLessThanOrEqual(20);
      let visible;
      for (let variant = 0; variant < 3; variant++) {
        await db.exec(
          `DROP SCHEMA public CASCADE; CREATE SCHEMA public; ${fixtureSql(question, variant)}`,
        );
        const expected = tabular(await db.query(question.canonicalSolution));
        expect(expected.columns).toEqual(question.sampleColumns);
        if (!variant) visible = expected;
        else expect(expected).not.toEqual(visible); // A literal visible answer must fail.
        for (const sql of [
          question.canonicalSolution,
          ...question.acceptedVariants,
        ]) {
          const policy = await inspectJudgeQuery(sql, {
            allowedTables: question.schema.map((table) => table.name),
          });
          expect(policy, sql).toMatchObject({ ok: true });
          expect(tabular(await db.query(sql)), sql).toEqual(expected);
        }
        expect(
          matchesOrderedResult(
            tabular(await db.query(question.starterSql)),
            expected,
          ),
        ).toBe(false);
        expect(
          matchesOrderedResult(
            { ...expected, rows: expected.rows.slice(1) },
            expected,
          ),
        ).toBe(false);
        expect(
          matchesOrderedResult(
            { ...expected, rows: [...expected.rows, expected.rows[0]] },
            expected,
          ),
        ).toBe(false);
        expect(
          matchesOrderedResult(
            { ...expected, columns: ["wrong_column"] },
            expected,
          ),
        ).toBe(false);
        if (expected.rows.length > 1)
          expect(
            matchesOrderedResult(
              { ...expected, rows: [...expected.rows].reverse() },
              expected,
            ),
          ).toBe(false);
      }
    }, 30_000);
  }

  it("generated browser content is current and contains no author solutions", async () => {
    const generated = await generatePracticeContent(RUIN_QUESTIONS);
    expect(
      await readFile(
        new URL("../src/questions/practice.generated.json", import.meta.url),
        "utf8",
      ),
    ).toBe(generated);
    const entries = JSON.parse(generated);
    expect(entries).toHaveLength(20);
    for (const entry of entries) {
      expect(entry).not.toHaveProperty("canonicalSolution");
      expect(entry).not.toHaveProperty("acceptedVariants");
      expect(entry).not.toHaveProperty("hints");
      expect(entry.hintCount).toBe(entry.id <= 10 ? 1 : 2);
      expect(entry.fixtureSql).toBe(
        fixtureSql(RUIN_QUESTIONS[entry.id - 1], 0),
      );
    }
  }, 30_000);

  it("read-only practice rejects data-changing CTEs and preserves fixtures", async () => {
    await db.exec(
      "DROP SCHEMA public CASCADE; CREATE SCHEMA public; CREATE TABLE sample(id int); INSERT INTO sample VALUES(1);",
    );
    await expect(
      db.transaction(async (tx) => {
        await tx.query("SET TRANSACTION READ ONLY");
        await tx.query(
          "WITH removed AS (DELETE FROM sample RETURNING *) SELECT * FROM removed",
        );
      }),
    ).rejects.toThrow();
    expect((await db.query("SELECT * FROM sample")).rows).toEqual([{ id: 1 }]);
  });
});
