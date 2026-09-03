import { withSupabase } from "@supabase/server";
import postgres from "postgres";
import { inspectJudgeQuery } from "../_shared/query-policy.ts";
import { compareResult } from "../_shared/result-compare.ts";

interface SubmissionBody {
  submission_id: string;
  ruin: number;
  variant: string;
  dataset_version: string;
  sql: string;
}

interface JudgeCase {
  id: string;
  fixtureSchema: string;
  hidden: boolean;
  comparison: "ordered" | "unordered";
  expectedColumns: string[];
  expectedRows: unknown[][];
}

interface JudgeManifest {
  ruin: number;
  datasetVersion: string;
  allowedTables: string[];
  maxResultRows: number;
  statementTimeoutMs: number;
  cases: JudgeCase[];
}

interface LeaseDecision {
  status: "acquired" | "cached" | "locked" | "rate_limited";
  verdict?: JudgeVerdict;
}

interface Preparation {
  lease: LeaseDecision;
  manifest?: JudgeManifest;
}

interface JudgeVerdict {
  correct: boolean;
  code: string;
  message: string;
  casesPassed: number;
  casesTotal: number;
  xp: number;
}

interface Connections {
  executor: ReturnType<typeof postgres>;
  progress: ReturnType<typeof postgres>;
}

let connections: Connections | undefined;

export default {
  fetch: withSupabase({ auth: "user" }, async (request, context) => {
    if (request.method !== "POST") {
      return Response.json({ message: "Use POST for query submissions." }, { status: 405 });
    }

    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (Number.isFinite(contentLength) && contentLength > 12_000) {
      return Response.json({ message: "Submission payload is too large." }, { status: 413 });
    }

    const player = context.userClaims;
    if (!player?.id || !isApprovedIdentity(player.email, player.appMetadata)) {
      return Response.json({ message: "Use an approved university Google account." }, { status: 403 });
    }

    let body: SubmissionBody;
    try {
      body = validateBody(await request.json());
    } catch (error) {
      return Response.json({ message: getErrorMessage(error) }, { status: 400 });
    }

    const startedAt = performance.now();
    const { executor, progress } = getConnections();

    let preparation: Preparation;
    try {
      const rows = await progress<{ preparation: Preparation }[]>`
        select game_private.prepare_judge_submission(
          ${player.id}::uuid,
          ${body.submission_id}::uuid,
          ${body.ruin}::smallint,
          ${body.dataset_version}::text
        ) as preparation
      `;
      preparation = rows[0].preparation;
    } catch {
      return Response.json(
        { message: "This question version is not available. Refresh the game." },
        { status: 409 },
      );
    }

    const lease = preparation.lease;
    if (lease.status === "cached" && lease.verdict) return Response.json(lease.verdict);
    if (lease.status === "locked") {
      return Response.json({ message: "One submission is already being checked." }, { status: 409 });
    }
    if (lease.status === "rate_limited") {
      return Response.json({ message: "Wait a moment before submitting again." }, { status: 429 });
    }

    const manifest = preparation.manifest;
    if (!manifest) {
      await releaseLease(progress, player.id, body.submission_id);
      return Response.json({ message: "The judge manifest is unavailable." }, { status: 503 });
    }

    const policy = await inspectJudgeQuery(body.sql, {
      allowedTables: manifest.allowedTables,
      maxBytes: 10_000,
    });

    if (!policy.ok) {
      const verdict = await recordVerdict(progress, {
        player: player.id,
        body,
        correct: false,
        code: policy.code,
        casesPassed: 0,
        casesTotal: manifest.cases.length,
        latencyMs: Math.round(performance.now() - startedAt),
      });
      return Response.json({ ...verdict, message: policy.reason });
    }

    let casesPassed = 0;
    let verdictCode = "wrong_result";

    try {
      for (const testCase of manifest.cases) {
        const result = await executeCase(
          executor,
          policy.normalizedSql,
          testCase.fixtureSchema,
          manifest.statementTimeoutMs,
        );

        const matches =
          result.rows.length <= manifest.maxResultRows &&
          compareResult(
            { columns: result.columns, rows: result.rows },
            {
              columns: testCase.expectedColumns,
              rows: testCase.expectedRows,
              comparison: testCase.comparison,
            },
          );
        if (matches) casesPassed += 1;
      }
    } catch (error) {
      verdictCode = isTimeout(error) ? "timeout" : "sql_error";
    }

    const correct = verdictCode === "wrong_result" && casesPassed === manifest.cases.length;
    if (correct) verdictCode = "ok";

    try {
      const verdict = await recordVerdict(progress, {
        player: player.id,
        body,
        correct,
        code: verdictCode,
        casesPassed,
        casesTotal: manifest.cases.length,
        latencyMs: Math.round(performance.now() - startedAt),
      });
      return Response.json(verdict);
    } catch (error) {
      await releaseLease(progress, player.id, body.submission_id);
      console.error("Failed to record judge verdict", getErrorMessage(error));
      return Response.json({ message: "The verdict could not be saved. Try again." }, { status: 503 });
    }
  }),
};

function getConnections(): Connections {
  connections ??= {
    executor: postgres(requiredEnvironment("JUDGE_EXECUTOR_DATABASE_URL"), {
      max: 1,
      prepare: false,
      connect_timeout: 5,
      idle_timeout: 20,
    }),
    progress: postgres(requiredEnvironment("JUDGE_PROGRESS_DATABASE_URL"), {
      max: 1,
      prepare: false,
      connect_timeout: 5,
      idle_timeout: 20,
    }),
  };
  return connections;
}

async function releaseLease(
  progress: ReturnType<typeof postgres>,
  player: string,
  submission: string,
): Promise<void> {
  await progress`
    select game_private.release_submission_lease(
      ${player}::uuid,
      ${submission}::uuid
    )
  `;
}

async function recordVerdict(
  progress: ReturnType<typeof postgres>,
  input: {
    player: string;
    body: SubmissionBody;
    correct: boolean;
    code: string;
    casesPassed: number;
    casesTotal: number;
    latencyMs: number;
  },
): Promise<JudgeVerdict> {
  const rows = await progress<{ verdict: JudgeVerdict }[]>`
    select game_private.record_judged_submission(
      ${input.player}::uuid,
      ${input.body.submission_id}::uuid,
      ${input.body.ruin}::smallint,
      ${input.body.variant}::text,
      ${input.body.dataset_version}::text,
      ${input.body.sql}::text,
      ${input.correct}::boolean,
      ${input.code}::text,
      ${input.casesPassed}::smallint,
      ${input.casesTotal}::smallint,
      ${input.latencyMs}::integer,
      false::boolean
    ) as verdict
  `;
  return rows[0].verdict;
}

async function executeCase(
  executor: ReturnType<typeof postgres>,
  submittedSql: string,
  fixtureSchema: string,
  timeoutMs: number,
): Promise<{ columns: string[]; rows: Record<string, unknown>[] }> {
  if (!/^fixture_r\d{2}_(?:visible|hidden_[a-z])$/.test(fixtureSchema)) {
    throw new Error("Invalid fixture schema in judge manifest.");
  }

  return executor.begin("read only", async (transaction) => {
    await transaction.unsafe(`set local statement_timeout = '${timeoutMs}ms'`);
    await transaction.unsafe("set local lock_timeout = '100ms'");
    await transaction.unsafe(`set local search_path = "${fixtureSchema}", pg_catalog`);
    const result = await transaction.unsafe<Record<string, unknown>[]>(submittedSql);
    return {
      columns: result.columns.map((column) => column.name),
      rows: Array.from(result),
    };
  });
}

function validateBody(value: unknown): SubmissionBody {
  const body = readRecord(value);
  if (!body) throw new Error("Send a JSON submission body.");

  if (typeof body.submission_id !== "string" || !isUuid(body.submission_id)) {
    throw new Error("submission_id must be a UUID.");
  }
  if (!Number.isInteger(body.ruin) || Number(body.ruin) < 1 || Number(body.ruin) > 20) {
    throw new Error("ruin must be between 1 and 20.");
  }
  if (typeof body.variant !== "string" || !/^[a-z0-9-]{1,40}$/.test(body.variant)) {
    throw new Error("variant is invalid.");
  }
  if (
    typeof body.dataset_version !== "string" ||
    !/^\d{4}-\d{2}-\d{2}\.\d+$/.test(body.dataset_version)
  ) {
    throw new Error("dataset_version is invalid.");
  }
  if (typeof body.sql !== "string") throw new Error("sql must be text.");

  return {
    submission_id: body.submission_id,
    ruin: Number(body.ruin),
    variant: body.variant,
    dataset_version: body.dataset_version,
    sql: body.sql,
  };
}

function isApprovedIdentity(
  email: string | undefined,
  appMetadata: Record<string, unknown> | undefined,
): boolean {
  if (!email || appMetadata?.provider !== "google") return false;
  const domain = email.toLowerCase().split("@").at(-1);
  return domain === "example.edu" || domain === "students.example.edu";
}

function requiredEnvironment(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isTimeout(error: unknown): boolean {
  return readRecord(error)?.code === "57014";
}

function readRecord(value: unknown): Record<string, any> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : undefined;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected judge error.";
}
