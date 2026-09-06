import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
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
// Bounded local stress test. The real judge handler runs in-process: no hosted traffic.
const results = [];
const members = Array.from({ length: 3000 }, (_, i) => ({
  id: randomUUID(),
  question: questions[i % 20],
}));
const limits = { p95Ms: 2000, maxErrorFraction: 0.01, maxOutstanding: 2000 };
let requestsSent = 0;
const stamp = new Date().toISOString().replaceAll(":", "-");
const destination = `output/stress/${stamp}`;
process.on("SIGTERM", () => {
  void pg.close().finally(() => process.exit(143));
});
const percentile = (values, p) =>
  Math.round(
    [...values].sort((a, b) => a - b)[
      Math.min(values.length - 1, Math.floor(values.length * p))
    ] ?? 0,
  );
async function save() {
  await writeFile(
    `${destination}/results.json`,
    JSON.stringify(
      {
        testedAt: stamp,
        scope:
          "Disposable PostgreSQL 17; one real Node judge instance, two single-connection pools; in-process Requests, no HTTP, GoTrue, PostgREST, hosted pooler or browser rendering",
        limits,
        players: members.length,
        requestsSent,
        results,
      },
      null,
      2,
    ) + "\n",
  );
}
async function stage(name, rate, seconds, burst = 0) {
  const total = burst || Math.round(rate * seconds),
    latencies = [],
    dispatch = [],
    statuses = {};
  let outstanding = 0,
    peak = 0,
    stop = false,
    done = 0,
    correct = 0;
  const tasks = [],
    started = performance.now();
  for (let i = 0; i < total; i++) {
    const due = started + (burst ? 0 : (i * 1000) / rate);
    if (due > performance.now())
      await new Promise((resolve) =>
        setTimeout(resolve, Math.max(0, due - performance.now())),
      );
    if (outstanding >= limits.maxOutstanding) {
      stop = true;
      break;
    }
    const item = members[requestsSent++ % members.length];
    outstanding++;
    peak = Math.max(peak, outstanding);
    dispatch.push(performance.now() - due);
    tasks.push(
      submit(
        item.question,
        item.question.canonicalSolution,
        randomUUID(),
        item.id,
      )
        .then((r) => {
          const key =
            r.status === 200
              ? r.body.correct
                ? "200-correct"
                : `200-${r.body.code ?? "incorrect"}`
              : String(r.status);
          statuses[key] = (statuses[key] ?? 0) + 1;
          if (key === "200-correct") correct++;
        })
        .catch((e) => {
          const key = `exception:${e.name}`;
          statuses[key] = (statuses[key] ?? 0) + 1;
        })
        .finally(() => {
          latencies.push(performance.now() - due);
          outstanding--;
          done++;
        }),
    );
  }
  const dispatchMs = performance.now() - started;
  await Promise.all(tasks);
  const elapsedMs = performance.now() - started;
  const r = {
    name,
    targetRate: burst ? null : rate,
    seconds: burst ? null : seconds,
    burst: burst || null,
    sent: tasks.length,
    correct,
    statuses,
    peakOutstanding: peak,
    stoppedAtBacklogLimit: stop,
    dispatchMs: Math.round(dispatchMs),
    elapsedMs: Math.round(elapsedMs),
    completedPerSecond: Math.round(done / (elapsedMs / 1000)),
    p50Ms: percentile(latencies, 0.5),
    p95Ms: percentile(latencies, 0.95),
    p99Ms: percentile(latencies, 0.99),
    maxMs: Math.round(latencies.reduce((a, b) => Math.max(a, b), 0)),
    dispatchLagP95Ms: percentile(dispatch, 0.95),
    nodeRssMB: Math.round(process.memoryUsage().rss / 1048576),
  };
  r.pass =
    !stop &&
    r.p95Ms <= limits.p95Ms &&
    (tasks.length - correct) / tasks.length < limits.maxErrorFraction;
  await writeFile(
    `${destination}/${name}-samples.json`,
    JSON.stringify({ latencyMs: latencies, dispatchLagMs: dispatch }) + "\n",
  );
  results.push(r);
  await save();
  console.log(JSON.stringify(r));
  return r;
}
try {
  await mkdir(destination, { recursive: true });
  console.log(`Stress results: ${destination}`);
  // Seed 3,000 approved accounts and prerequisites outside measured traffic.
  for (let offset = 0; offset < members.length; offset += 500) {
    const batch = members
      .slice(offset, offset + 500)
      .map((m) => ({ id: m.id, ruin: m.question.id }));
    await pg.sql`insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data) select id,id::text||'@example.edu',now(),'{"provider":"google"}'::jsonb,'{"full_name":"Stress explorer"}'::jsonb from jsonb_to_recordset(${pg.sql.json(batch)}::jsonb) as x(id uuid,ruin int)`;
    await pg.sql`insert into public.ruin_progress(player_id,ruin_id,solved_at) select x.id,n,now() from jsonb_to_recordset(${pg.sql.json(batch)}::jsonb) as x(id uuid,ruin int) cross join lateral generate_series(1,x.ruin-1) n`;
  }
  const confirmationRate = Number(process.env.STRESS_CONFIRM_RATE || 0);
  let low = 0,
    high = 0;
  if (confirmationRate) {
    assert.ok(
      Number.isInteger(confirmationRate) &&
        confirmationRate >= 25 &&
        confirmationRate <= 2000,
    );
    let candidate = confirmationRate;
    for (let attempt = 0; attempt < 4; attempt++) {
      const holdSeconds = Number(process.env.STRESS_HOLD_SECONDS || 300);
      assert.ok(
        Number.isInteger(holdSeconds) &&
          holdSeconds >= 30 &&
          holdSeconds <= 600,
      );
      const run = await stage(
        `confirmation-${candidate}`,
        candidate,
        holdSeconds,
      );
      if (run.pass) {
        low = candidate;
        break;
      }
      high = candidate;
      candidate = Math.floor(candidate * 0.7);
    }
  } else {
    for (const rate of [100, 250, 500, 750, 1000, 1500, 2000]) {
      const r = await stage(`ramp-${rate}`, rate, 15);
      if (r.pass) low = rate;
      else {
        high = rate;
        break;
      }
    }
    if (high && low)
      for (let i = 0; i < 2; i++) {
        const mid = Math.round((low + high) / 2);
        const r = await stage(`boundary-${mid}`, mid, 30);
        if (r.pass) low = mid;
        else high = mid;
      }
    if (low) {
      const sustained = await stage(`sustained-${low}`, low, 300);
      if (!sustained.pass) {
        low = Math.max(25, Math.floor(low * 0.7));
        await stage(`sustained-fallback-${low}`, low, 300);
      }
    }
  }
  if (high) await stage(`repeat-failing-${high}`, high, 30);
  await stage("recovery-100", 100, 15);
  await stage("burst-500", 0, 0, 500);
  await stage("burst-2000", 0, 0, 2000);
  await stage("post-burst-recovery-100", 100, 15);
  const audit = (
    await pg.sql`select count(*)::int as players,count(*) filter(where pr.xp<>120)::int as wrong_xp,count(*) filter(where rp.solved_at is null)::int as missing_solves from public.profiles pr join jsonb_to_recordset(${pg.sql.json(members.map((m) => ({ id: m.id, ruin: m.question.id })))}::jsonb) as x(id uuid,ruin int) on pr.id=x.id left join public.ruin_progress rp on rp.player_id=x.id and rp.ruin_id=x.ruin`
  )[0];
  const awards = (
    await pg.sql`select count(*)::int as recorded,sum(xp_awarded)::int as awarded from game_private.submission_attempts`
  )[0];
  const successful = results.reduce((n, r) => n + r.correct, 0);
  const integrity = {
    audit,
    awards,
    successful,
    pass:
      audit.wrong_xp === 0 &&
      audit.missing_solves === 0 &&
      awards.awarded === 60000 &&
      awards.recorded === successful,
  };
  await writeFile(
    `${destination}/integrity.json`,
    JSON.stringify(integrity, null, 2) + "\n",
  );
  console.log(JSON.stringify({ integrity }));
  assert.ok(
    integrity.pass,
    "Persisted results must match successful requests with one award per player",
  );
} finally {
  await vite.close();
  await pg.close();
}
process.exit(0);
