import { PGliteWorker } from "@electric-sql/pglite/worker";
import { visibleFixtureSql } from "../questions/ruin-six";
import { checkPracticeQuery } from "../sql/query-policy";
import type { TabularResult } from "../sql/result-policy";

let databasePromise: Promise<PGliteWorker> | undefined;
let seededPromise: Promise<void> | undefined;

function getDatabase(): Promise<PGliteWorker> {
  databasePromise ??= PGliteWorker.create(
    new Worker(new URL("./pglite.worker.ts", import.meta.url), { type: "module" }),
  );
  return databasePromise;
}

export async function preparePracticeDatabase(): Promise<void> {
  seededPromise ??= (async () => {
    const database = await getDatabase();
    await database.exec(visibleFixtureSql);
  })();
  return seededPromise;
}

export async function runPracticeQuery(sql: string): Promise<TabularResult> {
  const policy = checkPracticeQuery(sql);
  if (!policy.ok) throw new Error(policy.reason);

  await preparePracticeDatabase();
  const database = await getDatabase();

  return database.transaction(async (transaction) => {
    await transaction.query("SET LOCAL statement_timeout = '900ms'");
    const result = await transaction.query<Record<string, unknown>>(policy.normalizedSql);
    return {
      columns: result.fields.map((field) => field.name),
      rows: result.rows,
    };
  });
}
