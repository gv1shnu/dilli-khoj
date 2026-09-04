import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { createServer } from "vite";
import { postgresHarness } from "./postgres-harness.mjs";
import { addPlayer } from "./local-database.mjs";
const pg = await postgresHarness();
const secret = randomBytes(32);
const player = randomUUID();
await addPlayer(pg.db, player);
process.env.SUPABASE_URL = "http://127.0.0.1:54321";
process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_local_integration";
process.env.SUPABASE_JWKS = JSON.stringify({
  keys: [
    { kty: "oct", alg: "HS256", kid: "test", k: secret.toString("base64url") },
  ],
});
process.env.JUDGE_EXECUTOR_DATABASE_URL = pg.url.replace(
  "postgres://",
  "postgres://dilli_judge_executor@",
);
process.env.JUDGE_PROGRESS_DATABASE_URL = pg.url.replace(
  "postgres://",
  "postgres://dilli_judge_progress@",
);
globalThis.Deno = { env: { get: (name) => process.env[name] } };
const vite = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});
const { default: judge } = await vite.ssrLoadModule(
  "/supabase/functions/judge-query/index.ts",
);
const { RUIN_QUESTIONS: questions } = await vite.ssrLoadModule(
  "/src/questions/catalog.ts",
);
function jwt(id) {
  const h = Buffer.from(JSON.stringify({ alg: "HS256", kid: "test" })).toString(
    "base64url",
  );
  const p = Buffer.from(
    JSON.stringify({
      sub: id,
      role: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 3600,
      app_metadata: { provider: "google" },
    }),
  ).toString("base64url");
  return `${h}.${p}.${createHmac("sha256", secret).update(`${h}.${p}`).digest("base64url")}`;
}
async function submit(
  q,
  sql = q.canonicalSolution,
  id = randomUUID(),
  who = player,
) {
  const response = await judge.fetch(
    new Request("http://localhost/judge-query", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt(who)}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        submission_id: id,
        ruin: q.id,
        variant: "first-pass",
        dataset_version: "2026-09-04.1",
        sql,
      }),
    }),
  );
  return { status: response.status, body: await response.json() };
}
try {
  const firstId = randomUUID();
  for (const q of questions) {
    await pg.sql`update game_private.submission_attempts set created_at=now()-interval '1 second' where player_id=${player}`;
    const result = await submit(
      q,
      q.canonicalSolution,
      q.id === 1 ? firstId : randomUUID(),
    );
    assert.equal(result.status, 200, JSON.stringify({ ruin: q.id, ...result }));
    assert.equal(
      result.body.correct,
      true,
      JSON.stringify({ ruin: q.id, ...result }),
    );
    assert.equal(result.body.casesPassed, 3);
  }
  const profile = (
    await pg.sql`select xp,ruins_solved,completed_at from public.profiles where id=${player}`
  )[0];
  assert.equal(profile.xp, 600);
  assert.equal(profile.ruins_solved, 20);
  assert.ok(profile.completed_at);
  const retries = await Promise.all(
    Array.from({ length: 12 }, () =>
      submit(questions[0], questions[0].canonicalSolution, firstId),
    ),
  );
  assert.ok(retries.every((r) => r.status === 200 && r.body.correct));
  assert.equal(
    (await pg.sql`select xp from public.profiles where id=${player}`)[0].xp,
    600,
  );
  assert.equal((await submit(questions[0], "SELECT 1", firstId)).status, 409);
  // Competing purchases on a fresh account must charge exactly once.
  const buyer = randomUUID();
  await addPlayer(pg.db, buyer, "buyer@partner.example");
  const purchase = () =>
    pg.sql.begin(async (tx) => {
      await tx`select set_config('request.jwt.claim.sub',${buyer},true)`;
      await tx`set local role authenticated`;
      return tx`select public.game_action('hint',1::smallint,${randomUUID()}::uuid,1)`;
    });
  await Promise.all(Array.from({ length: 12 }, purchase));
  assert.equal(
    (await pg.sql`select xp from public.profiles where id=${buyer}`)[0].xp,
    90,
  );
  console.log(
    "PostgreSQL 17 integration passed: 20 authenticated three-case submissions, 600 XP completion, concurrent retries and purchases.",
  );
  if (process.argv.includes("--profile")) {
    // Only the disposable cluster: log server durations, then retain aggregates.
    await pg.sql.unsafe("alter system set log_min_duration_statement = 0");
    await pg.sql`select pg_reload_conf()`;
    const cohort = Array.from({ length: 200 }, () => randomUUID());
    for (const id of cohort)
      await addPlayer(pg.db, id, `${id}@partner.example`);
    const logPath = `${pg.dir}/server.log`;
    const offset = (await readFile(logPath)).length;
    const latencies = [];
    const started = performance.now();
    const results = await Promise.all(
      cohort.map(async (id) => {
        const start = performance.now();
        const result = await submit(
          questions[0],
          questions[0].canonicalSolution,
          randomUUID(),
          id,
        );
        latencies.push(performance.now() - start);
        return result;
      }),
    );
    const elapsedMs = Math.round(performance.now() - started);
    assert.ok(
      results.every((result) => result.status === 200 && result.body.correct),
    );
    const log = (await readFile(logPath)).subarray(offset).toString();
    const stages = {};
    for (const match of log.matchAll(
      /duration: ([\d.]+) ms\s+(?:(?:parse|bind|execute) [^:]*:|statement:)\s*([^\n]*)/g,
    )) {
      const sql = match[2].trim().toLowerCase();
      const stage = sql.includes("is_approved_player")
        ? "authorization"
        : sql.includes("prepare_judge_submission")
          ? "preparation"
          : sql.includes("record_judged_submission")
            ? "recording"
            : /^(set |begin|commit)/.test(sql)
              ? "transaction_setup_and_commit"
              : "student_query_protocol";
      const item = (stages[stage] ??= { events: 0, totalMs: 0, maxMs: 0 });
      const ms = Number(match[1]);
      item.events++;
      item.totalMs += ms;
      item.maxMs = Math.max(item.maxMs, ms);
    }
    for (const item of Object.values(stages)) {
      item.totalMs = Math.round(item.totalMs * 100) / 100;
      item.meanMs = Math.round((item.totalMs / item.events) * 1000) / 1000;
    }
    latencies.sort((a, b) => a - b);
    const report = {
      environment:
        "Disposable local PostgreSQL 17; single Node judge; 200 simultaneous first-ruin submissions; server duration logging enabled. No HTTP or hosted pooler.",
      requests: cohort.length,
      correct: results.length,
      elapsedMs,
      p50Ms: Math.round(latencies[99]),
      p95Ms: Math.round(latencies[189]),
      stages,
      caveat:
        "Protocol events include parse/bind/execute. Server durations exclude time waiting in the Node connection queue. This profile is not comparable to the earlier rate-shaped load test or a cloud capacity claim.",
    };
    await writeFile(
      new URL("../docs/local-profile-results.json", import.meta.url),
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(JSON.stringify(report));
  }
  const measurements = [];
  if (process.argv.includes("--load")) {
    for (const rate of [25, 50, 100, 200]) {
      const latencies = [];
      const counts = {};
      const tasks = [];
      const duration = 3;
      const cohort = Array.from({ length: rate * duration }, () =>
        randomUUID(),
      );
      for (const id of cohort)
        await addPlayer(pg.db, id, `${id}@partner.example`);
      const start = performance.now();
      for (let i = 0; i < rate * duration; i++) {
        const due = start + (i * 1000) / rate;
        if (due > performance.now())
          await new Promise((r) => setTimeout(r, due - performance.now()));
        // Each request is a new player's first solve: JWT, three fixtures and recording.
        const before = performance.now();
        tasks.push(
          submit(
            questions[0],
            questions[0].canonicalSolution,
            randomUUID(),
            cohort[i],
          ).then((r) => {
            latencies.push(performance.now() - before);
            const status =
              r.status === 200 && !r.body.correct ? "incorrect" : r.status;
            counts[status] = (counts[status] ?? 0) + 1;
          }),
        );
      }
      await Promise.all(tasks);
      latencies.sort((a, b) => a - b);
      const measurement = {
        mode: "local-first-solve",
        rate,
        seconds: duration,
        requests: tasks.length,
        p50Ms: Math.round(latencies[Math.floor(latencies.length * 0.5)]),
        p95Ms: Math.round(latencies[Math.floor(latencies.length * 0.95)]),
        p99Ms: Math.round(latencies[Math.floor(latencies.length * 0.99)]),
        statuses: counts,
      };
      measurements.push(measurement);
      console.log(JSON.stringify(measurement));
    }
    await writeFile(
      new URL("../docs/local-load-results.json", import.meta.url),
      JSON.stringify(
        {
          environment:
            "Local PostgreSQL 17, one Node judge instance, direct database connections; no Supavisor, HTTP transport or cloud capacity claim",
          measurements,
        },
        null,
        2,
      ) + "\n",
    );
  }
} finally {
  await vite.close();
  // Stop the disposable cluster even if the judge's lazy pools remain idle.
  await pg.close();
}
