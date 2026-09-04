import { createServer } from "vite";
import { PGlite } from "@electric-sql/pglite";
import { fixtureSql } from "./practice-fixtures.mjs";

export async function loadAuthoringCatalog() {
  const server = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    const { RUIN_QUESTIONS } = await server.ssrLoadModule("/src/questions/catalog.ts");
    return RUIN_QUESTIONS;
  } finally {
    await server.close();
  }
}

export function tabular(result) {
  return JSON.parse(JSON.stringify({ columns: result.fields.map((field) => field.name), rows: result.rows }));
}

export async function generatePracticeContent(questions) {
  const db = await PGlite.create();
  try {
    const output = [];
    for (const question of questions) {
      const sql = fixtureSql(question, 0);
      await db.exec(`DROP SCHEMA public CASCADE; CREATE SCHEMA public; ${sql}`);
      const expected = tabular(await db.query(question.canonicalSolution));
      const { canonicalSolution, acceptedVariants, ...publicQuestion } = question;
      output.push({ ...publicQuestion, fixtureSql: sql, expected });
    }
    return `${JSON.stringify(output, null, 2)}\n`;
  } finally {
    await db.close();
  }
}
