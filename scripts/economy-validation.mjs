// Exhaustive economy contract on disposable PostgreSQL; never contacts hosted data.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { postgresHarness } from "./postgres-harness.mjs";
import { addPlayer } from "./local-database.mjs";
const pg = await postgresHarness();
const report = [];
async function xp(p) {
  return (await pg.sql`select xp from public.profiles where id=${p}`)[0].xp;
}
async function action(p, r, kind, hint = null, id = randomUUID()) {
  return pg.sql.begin(async (tx) => {
    await tx`select set_config('request.jwt.claim.sub',${p},true)`;
    await tx`set local role authenticated`;
    return tx`select public.game_action(${kind},${r}::smallint,${id}::uuid,${hint}::integer)`;
  });
}
async function solve(p, r, correct = true, id = randomUUID()) {
  return pg.sql.begin(async (tx) => {
    await tx`set local role dilli_judge_progress`;
    const rows =
      await tx`select game_private.record_judged_submission(${p}::uuid,${id}::uuid,${r}::smallint,'first-pass','2026-09-04.1','SELECT economy_contract',${correct},${correct ? "ok" : "wrong_result"},${correct ? 3 : 0}::smallint,3::smallint,1,false) as result`;
    return rows[0].result;
  });
}
try {
  for (let r = 1; r <= 20; r++) {
    const hints = r <= 10 ? 1 : 2;
    const row = { ruin: r, hints, scenarios: {} };
    for (const mode of [
      "auto-survey",
      "survey",
      "hint1",
      "all-hints",
      "reveal",
    ]) {
      const p = randomUUID();
      await addPlayer(pg.db, p, `${p}@example.edu`);
      // Unlock only the target, leaving its stats untouched and its starting balance 100.
      if (r > 1)
        await pg.sql`insert into public.ruin_progress(player_id,ruin_id,solved_at) select ${p}::uuid,n,now() from generate_series(1,${r - 1}) n`;
      assert.equal(await xp(p), 100);
      if (mode !== "auto-survey") {
        const request = randomUUID();
        await action(p, r, "survey", null, request);
        await action(p, r, "survey", null, request);
        await action(p, r, "survey");
        assert.equal(await xp(p), 100, `ruin ${r}: survey must be free`);
      }
      let cost = 0;
      if (["hint1", "all-hints", "reveal"].includes(mode)) {
        await action(p, r, "hint", 1);
        await action(p, r, "hint", 1);
        assert.equal(await xp(p), 100, `ruin ${r}: first clue free`);
      }
      if (["all-hints", "reveal"].includes(mode) && hints === 2) {
        await action(p, r, "hint", 2);
        await action(p, r, "hint", 2);
        cost = 5;
        assert.equal(await xp(p), 95, `ruin ${r}: second clue charged once`);
      }
      if (mode === "reveal") {
        await action(p, r, "reveal");
        await action(p, r, "reveal");
        cost += 15;
      }
      const before = 100 - cost;
      assert.equal(await xp(p), before);
      assert.equal(
        (await solve(p, r, false)).xp,
        before,
        `ruin ${r}: wrong solve free`,
      );
      const request = randomUUID(),
        award = mode === "reveal" ? 0 : 20;
      assert.equal(
        (await solve(p, r, true, request)).xp,
        before + award,
        `ruin ${r}/${mode}: solve award`,
      );
      assert.equal((await solve(p, r, true, request)).xp, before + award);
      assert.equal((await solve(p, r)).xp, before + award);
      await action(p, r, "survey");
      assert.equal(await xp(p), before + award);
      const progress = (
        await pg.sql`select surveyed_at,solved_at,revealed_at from public.ruin_progress where player_id=${p} and ruin_id=${r}`
      )[0];
      assert.ok(progress.surveyed_at);
      assert.ok(progress.solved_at);
      assert.equal(Boolean(progress.revealed_at), mode === "reveal");
      const awards =
        await pg.sql`select sum(xp_awarded)::int as total from game_private.submission_attempts where player_id=${p}`;
      assert.equal(awards[0].total, award);
      row.scenarios[mode] = {
        helpCost: cost,
        solveAward: award,
        finalXp: before + award,
      };
    }
    report.push(row);
  }
  // Real starting balance: revealing every ruin cannot reach a negative balance.
  const p = randomUUID();
  await addPlayer(pg.db, p, `${p}@example.edu`);
  for (let r = 1; r <= 6; r++) {
    await action(p, r, "hint", 1);
    await action(p, r, "reveal");
    await solve(p, r);
  }
  assert.equal(await xp(p), 10);
  await action(p, 7, "hint", 1);
  await assert.rejects(action(p, 7, "reveal"), /Not enough XP/);
  assert.equal(await xp(p), 10);
  assert.equal(
    (
      await pg.sql`select revealed_at from public.ruin_progress where player_id=${p} and ruin_id=7`
    )[0].revealed_at,
    null,
  );
  assert.equal(
    (await solve(p, 7)).xp,
    30,
    "unrevealed solving remains available after unaffordable reveal",
  );
  await mkdir("output/economy", { recursive: true });
  await writeFile(
    "output/economy/validation.json",
    JSON.stringify(
      {
        testedAt: new Date().toISOString(),
        backend: "disposable PostgreSQL 17",
        scenarios: 100,
        ruins: report,
        affordability: {
          balanceAfterSixRevealedSolves: 10,
          seventhReveal: "rejected without charge",
          balanceAfterUnrevealedSeventhSolve: 30,
        },
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "PASS: all 20 ruins × 5 help/survey paths (100 scenarios), wrong answers, repeat surveys, hint/reveal deduplication, solve retries, recorded timestamps and persisted awards. All-reveal affordability fails safely at ruin 7; solving recovers XP.",
  );
} finally {
  await pg.close();
}
