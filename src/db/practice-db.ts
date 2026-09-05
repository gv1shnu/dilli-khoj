import { PGliteWorker } from "@electric-sql/pglite/worker";
import { practiceQuestion } from "../questions/practice";
import { checkPracticeQuery } from "../sql/query-policy";
import type { TabularResult } from "../sql/result-policy";

let databasePromise: Promise<PGliteWorker> | undefined;
const seeded = new Map<number, Promise<void>>();
const MAX_PRACTICE_RESULT_ROWS = 100;
const MAX_PRACTICE_RESULT_BYTES = 64 * 1024;

function getDatabase(): Promise<PGliteWorker> {
  databasePromise ??= PGliteWorker.create(
    new Worker(new URL("./pglite.worker.ts", import.meta.url), {
      type: "module",
    }),
  );
  return databasePromise;
}

export async function preparePracticeDatabase(ruinId = 6): Promise<void> {
  const question = practiceQuestion(ruinId);
  if (!seeded.has(ruinId))
    seeded.set(
      ruinId,
      (async () => {
        const database = await getDatabase();
        await database.transaction(async (transaction) => {
          await transaction.exec(`DROP SCHEMA IF EXISTS practice_${ruinId} CASCADE;
        CREATE SCHEMA practice_${ruinId}; SET LOCAL search_path TO practice_${ruinId};
        ${question.fixtureSql}`);
        });
      })().catch((error: unknown) => {
        seeded.delete(ruinId);
        throw error;
      }),
    );
  return seeded.get(ruinId)!;
}

export async function runPracticeQuery(
  sql: string,
  ruinId = 6,
): Promise<TabularResult> {
  const policy = checkPracticeQuery(sql);
  if (!policy.ok) throw new Error(policy.reason);

  await preparePracticeDatabase(ruinId);
  const database = await getDatabase();

  return database.transaction(async (transaction) => {
    await transaction.query("SET TRANSACTION READ ONLY");
    await transaction.query(`SET LOCAL search_path TO practice_${ruinId}`);
    await transaction.query("SET LOCAL statement_timeout = '900ms'");
    const result = await transaction.query<Record<string, unknown>>(
      policy.normalizedSql,
    );
    const columns = result.fields.map((field) => field.name);
    if (
      result.rows.length > MAX_PRACTICE_RESULT_ROWS ||
      practiceResultBytes(columns, result.rows) > MAX_PRACTICE_RESULT_BYTES
    )
      throw new Error(
        "Visible result is too large. Return fewer rows or smaller values.",
      );
    return {
      columns,
      rows: result.rows,
    };
  });
}

function practiceResultBytes(
  columns: readonly string[],
  rows: readonly Record<string, unknown>[],
): number {
  const encoder = new TextEncoder();
  let bytes = columns.reduce(
    (total, column) => total + encoder.encode(column).byteLength + 3,
    2,
  );
  for (const row of rows)
    for (const column of columns)
      bytes += encoder.encode(String(row[column] ?? "null")).byteLength + 3;
  return bytes;
}
