import { beforeAll, afterAll, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { localDatabase, addPlayer } from "./local-database.mjs";
let db;
const player = randomUUID(),
  other = randomUUID();
beforeAll(async () => {
  db = await localDatabase();
  await addPlayer(db, player);
  await addPlayer(db, other, "other@example.edu");
}, 30000);
afterAll(async () => {
  await db?.close();
});
async function asPlayer(id, fn) {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
  }
}
async function profile(id = player) {
  return asPlayer(
    id,
    async () =>
      (await db.query("select public.player_profile() as value")).rows[0].value,
  );
}
async function record(ruin, correct, submission = randomUUID()) {
  await db.query(
    `select game_private.record_judged_submission($1,$2,$3::smallint,'first-pass','2026-09-04.1','SELECT test',$4,$5,$6::smallint,3::smallint,5,false)`,
    [
      player,
      submission,
      ruin,
      correct,
      correct ? "ok" : "wrong_result",
      correct ? 3 : 0,
    ],
  );
  return submission;
}
it("returns only the caller profile and denies anonymous access and direct mutations", async () => {
  const p = await profile();
  expect(p.id).toBe(player);
  expect(p.ruins).toHaveLength(20);
  expect(p.currentRuin).toBe(1);
  expect((await profile(other)).email).toBe("other@example.edu");
  await db.exec("set role anon");
  try {
    await expect(db.query("select public.player_profile()")).rejects.toThrow(
      /permission denied/,
    );
    await expect(
      db.query("select public.delete_player_account('DELETE')"),
    ).rejects.toThrow(/permission denied/);
  } finally {
    await db.exec("reset role");
  }
  await asPlayer(player, async () => {
    await expect(
      db.query("update public.ruin_progress set solve_help='independent'"),
    ).rejects.toThrow(/permission denied/);
  });
});
it("freezes mutually exclusive solve categories and counts retries once, surviving retention", async () => {
  await record(1, false);
  const id = await record(1, true);
  await record(1, true, id);
  await db.query(
    "update public.ruin_progress set hints_opened=1,revealed_at=now() where player_id=$1 and ruin_id=1",
    [player],
  );
  for (const [ruin, hints, reveal] of [
    [2, 1, false],
    [3, 2, false],
    [4, 2, true],
  ]) {
    await db.query(
      "insert into public.ruin_progress(player_id,ruin_id,hints_opened,revealed_at) values($1,$2,$3,case when $4 then now() else null end)",
      [player, ruin, hints, reveal],
    );
    await record(ruin, true);
  }
  let p = await profile();
  expect(p.ruins.slice(0, 4).map((r) => r.help)).toEqual([
    "independent",
    "hint1",
    "hint2",
    "revealed",
  ]);
  expect(p.ruins[0].attempts).toBe(2);
  expect(p.ruins[0].incorrectAttempts).toBe(1);
  expect(p.currentRuin).toBe(5);
  await db.query(
    "delete from game_private.submission_attempts where player_id=$1",
    [player],
  );
  p = await profile();
  expect(p.ruins[0].attempts).toBe(2);
  expect(p.ruins[0].help).toBe("independent");
});
it("deletes only the caller, cleans every personal table, and permits safe repeat deletion", async () => {
  await db.query(
    "insert into game_private.admin_audit(admin_id,action) values($1,'view_players')",
    [player],
  );
  await db.query(
    "insert into game_private.submission_leases values($1,$2,now())",
    [player, randomUUID()],
  );
  await db.query(
    "insert into game_private.game_requests values($1,$2,'survey',1,null,'{}',now())",
    [player, randomUUID()],
  );
  await db.query(
    "insert into game_private.revisit_requests values($1,$2,1,1,0,now())",
    [player, randomUUID()],
  );
  await record(5, false);
  await asPlayer(player, async () => {
    await expect(
      db.query("select public.delete_player_account('delete')"),
    ).rejects.toThrow(/Type DELETE/);
  });
  expect((await profile()).id).toBe(player);
  await db.exec(
    "create table public.deletion_blocker (id uuid references auth.users(id))",
  );
  await db.query("insert into public.deletion_blocker values($1)", [player]);
  await asPlayer(player, async () => {
    await expect(
      db.query("select public.delete_player_account('DELETE')"),
    ).rejects.toThrow(/foreign key/);
  });
  expect((await profile()).id).toBe(player);
  expect(
    (
      await db.query(
        "select count(*)::int as n from game_private.admin_audit where admin_id=$1",
        [player],
      )
    ).rows[0].n,
  ).toBe(1);
  await db.exec("drop table public.deletion_blocker");
  await asPlayer(player, async () => {
    await db.query("select public.delete_player_account('DELETE')");
    await db.query("select public.delete_player_account('DELETE')");
  });
  for (const [table, column] of [
    ["auth.users", "id"],
    ["public.profiles", "id"],
    ["public.ruin_progress", "player_id"],
    ["game_private.submission_attempts", "player_id"],
    ["game_private.submission_leases", "player_id"],
    ["game_private.game_requests", "player_id"],
    ["game_private.revisit_requests", "player_id"],
    ["game_private.admin_audit", "admin_id"],
  ])
    expect(
      (
        await db.query(
          `select count(*)::int as n from ${table} where ${column}=$1`,
          [player],
        )
      ).rows[0].n,
    ).toBe(0);
  expect((await profile(other)).id).toBe(other);
  await expect(profile()).rejects.toThrow(/approved/);
});

it("shows completed players without a phantom level 21 and with their rank", async () => {
  await db.query(
    "insert into public.ruin_progress(player_id,ruin_id,solved_at) select $1,n,now() from generate_series(1,20) n",
    [other],
  );
  await db.query(
    "update public.profiles set completed_at=now(),xp=600 where id=$1",
    [other],
  );
  const p = await profile(other);
  expect(p.currentRuin).toBeNull();
  expect(p.rank).toBe(1);
  expect(p.ruins.filter((r) => r.solvedAt)).toHaveLength(20);
});
