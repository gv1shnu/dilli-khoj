import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { it, expect } from "vitest";
import { RUIN_QUESTIONS } from "../src/questions/catalog";
import { fixtureSql } from "./practice-fixtures.mjs";
import { generateRevisits, revisitDefinitions } from "./revisit-content.mjs";
import { inspectJudgeQuery } from "../supabase/functions/_shared/query-policy";
it("forty revisits have different tested objectives and exclude solution SQL", async () => {
  const generated = await generateRevisits(RUIN_QUESTIONS);
  expect(
    await readFile(
      new URL("../src/questions/revisits.generated.json", import.meta.url),
      "utf8",
    ),
  ).toBe(generated);
  const db = new PGlite();
  try {
    for (const q of RUIN_QUESTIONS) {
      const definitions = revisitDefinitions(q);
      expect(definitions[0].description).not.toBe(definitions[1].description);
      await db.exec(
        `drop schema public cascade;create schema public;${fixtureSql(q, 0)}`,
      );
      const original = (await db.query(q.canonicalSolution)).rows;
      for (const v of definitions) {
        expect(v.description.split(/\s+/).length).toBeLessThanOrEqual(35);
        expect(
          await inspectJudgeQuery(v.sql, {
            allowedTables: q.schema.map((t) => t.name),
          }),
        ).toMatchObject({ ok: true });
        const actual = (await db.query(v.sql)).rows;
        expect(actual.length).toBeGreaterThan(0);
        expect(actual).not.toEqual(original);
        expect(generated).not.toContain(v.sql);
      }
    }
  } finally {
    await db.close();
  }
}, 30000);
