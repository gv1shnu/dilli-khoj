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
async function addLoadPlayer(id, question) {
  await addPlayer(pg.db, id, `${id}@partner.example`);
  if (question.id <= 1) return;
  await pg.sql`
    insert into public.ruin_progress (player_id, ruin_id, solved_at)
    select ${id}::uuid, prior::smallint, clock_timestamp()
    from generate_series(1, ${question.id - 1}) prior
  `;
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
  assert.equal(profile.xp, 500);
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
    500,
  );
  assert.equal((await submit(questions[0], "SELECT 1", firstId)).status, 409);
  // Staged help: the first clue is free, and a competing paid action (the reveal)
  // must charge exactly once. Ruin 1 has a single clue, so opening it unlocks reveal.
  const buyer = randomUUID();
  await addPlayer(pg.db, buyer, "buyer@partner.example");
  const act = (action, hintIndex) =>
    pg.sql.begin(async (tx) => {
      await tx`select set_config('request.jwt.claim.sub',${buyer},true)`;
      await tx`set local role authenticated`;
      return tx`select public.game_action(${action}::text,1::smallint,${randomUUID()}::uuid,${hintIndex})`;
    });
  await act("hint", 1); // free first clue; balance unchanged at 100
  assert.equal(
    (await pg.sql`select xp from public.profiles where id=${buyer}`)[0].xp,
    100,
  );
  await Promise.all(Array.from({ length: 12 }, () => act("reveal", null)));
  assert.equal(
    (await pg.sql`select xp from public.profiles where id=${buyer}`)[0].xp,
    85, // 100 - 15 reveal, charged once despite 12 concurrent reveals
  );
  // game_state reports a total explorer count for the HUD; it must match the
  // profiles table and see every player past row-level security.
  const state = (
    await pg.sql.begin(async (tx) => {
      await tx`select set_config('request.jwt.claim.sub',${player},true)`;
      await tx`set local role authenticated`;
      return tx`select public.game_state() as state`;
    })
  )[0].state;
  const profileCount = Number(
    (await pg.sql`select count(*)::int as n from public.profiles`)[0].n,
  );
  assert.ok(profileCount >= 2, `expected several profiles, saw ${profileCount}`);
  assert.equal(state.explorers, profileCount);
  console.log(
    `PostgreSQL 17 integration passed: 20 authenticated three-case submissions, 500 XP completion, concurrent retries and purchases, explorer count ${state.explorers}.`,
  );
  if (process.argv.includes("--profile")) {
    // Only the disposable cluster: log server durations, then retain aggregates.
    await pg.sql.unsafe("alter system set log_min_duration_statement = 0");
    await pg.sql`select pg_reload_conf()`;
    const cohort = Array.from({ length: 200 }, (_, index) => ({
      id: randomUUID(),
      question: questions[index % questions.length],
    }));
    for (const item of cohort) await addLoadPlayer(item.id, item.question);
    const logPath = `${pg.dir}/server.log`;
    const offset = (await readFile(logPath)).length;
    const latencies = [];
    const started = performance.now();
    const results = await Promise.all(
      cohort.map(async ({ id, question }) => {
        const start = performance.now();
        const result = await submit(
          question,
          question.canonicalSolution,
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
        "Disposable local PostgreSQL 17; single Node judge; 200 simultaneous submissions rotating through all 20 ruins; server duration logging enabled. No HTTP or hosted pooler.",
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
      const cohort = Array.from({ length: rate * duration }, (_, index) => ({
        id: randomUUID(),
        question: questions[index % questions.length],
      }));
      for (const item of cohort) await addLoadPlayer(item.id, item.question);
      const start = performance.now();
      for (let i = 0; i < rate * duration; i++) {
        const due = start + (i * 1000) / rate;
        if (due > performance.now())
          await new Promise((r) => setTimeout(r, due - performance.now()));
        // Each request is a new player's first solve: JWT, three fixtures and recording.
        const before = performance.now();
        tasks.push(
          submit(
            cohort[i].question,
            cohort[i].question.canonicalSolution,
            randomUUID(),
            cohort[i].id,
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
        mode: "local-mixed-first-solve",
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
            "Local PostgreSQL 17, one Node judge instance, submissions rotating through all 20 ruins, direct database connections; no Supavisor, HTTP transport or cloud capacity claim",
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
