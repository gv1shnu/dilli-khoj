import { beforeAll, afterAll, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { localDatabase, addPlayer } from "./local-database.mjs";
let db;
const p = randomUUID(),
  other = randomUUID(),
  admin = randomUUID();
beforeAll(async () => {
  db = await localDatabase();
  await addPlayer(db, p);
  await addPlayer(db, other, "other@example.edu");
  await addPlayer(db, admin, "former.admin@example.edu");
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
const action = (a, r, id = randomUUID(), hint = null) =>
  db.query(
    "select public.game_action($1,$2::smallint,$3::uuid,$4::integer) as result",
    [a, r, id, hint],
  );
const state = async () =>
  (await db.query("select public.game_state() as state")).rows[0].state;
async function solve(id, r, correct = true, submission = randomUUID()) {
  await db.exec("set role dilli_judge_progress");
  try {
    return (
      await db.query(
        `select game_private.record_judged_submission($1,$2,$3::smallint,'first-pass','2026-09-04.1','SELECT test', $4, $5, $6::smallint,3::smallint,5,false) as verdict`,
        [
          id,
          submission,
          r,
          correct,
          correct ? "ok" : "wrong_result",
          correct ? 3 : 0,
        ],
      )
    ).rows[0].verdict;
  } finally {
    await db.exec("reset role");
  }
}
it("rejects locked ruins, spoofed identities and browser writes", async () => {
  await asPlayer(p, async () => {
    expect((await state()).xp).toBe(100);
    await expect(action("survey", 2)).rejects.toThrow(/previous ruins/);
    await expect(
      db.query("update public.profiles set xp=999"),
    ).rejects.toThrow();
    await expect(
      db.query("select * from game_private.question_help"),
    ).rejects.toThrow();
  });
  await expect(solve(p, 2)).rejects.toThrow(/previous ruins/);
  await asPlayer(randomUUID(), async () => {
    await expect(state()).rejects.toThrow(/approved/);
  });
});
it("survey/hints/reveal are atomic, ordered and idempotent", async () => {
  await asPlayer(p, async () => {
    const id = randomUUID();
    await action("survey", 1, id);
    await action("survey", 1, id);
    await action("survey", 1);
    expect((await state()).xp).toBe(100);
    await expect(action("hint", 1, id, 1)).rejects.toThrow(/another operation/);
    await expect(action("reveal", 1)).rejects.toThrow(/all clues/);
    await action("hint", 1, randomUUID(), 1);
    await action("hint", 1, randomUUID(), 1);
    expect((await state()).xp).toBe(100);
    await action("reveal", 1);
    await action("reveal", 1);
    const s = await state();
    expect(s.xp).toBe(85);
    expect(s.cleared).toEqual([]);
    expect(s.progress[0].solution).toContain("SELECT");
    expect(s.progress[0].hints).toHaveLength(1);
  });
  await asPlayer(other, async () => {
    expect((await state()).progress).toEqual([]);
    expect((await state()).xp).toBe(100);
  });
});
it("wrong answers are free; revealed solves and retries award no XP", async () => {
  expect((await solve(p, 1, false)).xp).toBe(85);
  const id = randomUUID();
  expect((await solve(p, 1, true, id)).xp).toBe(85);
  expect((await solve(p, 1, true, id)).xp).toBe(85);
  expect((await solve(p, 1)).xp).toBe(85);
  await asPlayer(p, async () => {
    expect((await state()).cleared).toEqual([1]);
  });
});
it("insufficient XP rolls back help and does not block solving", async () => {
  await db.query("update public.profiles set xp=0 where id=$1", [other]);
  await asPlayer(other, async () => {
    await action("hint", 1, randomUUID(), 1);
    await expect(action("reveal", 1)).rejects.toThrow(/Not enough XP/);
    expect((await state()).progress[0].hintsOpened).toBe(1);
  });
  expect((await solve(other, 1)).xp).toBe(20);
});
it("revisits alternate deterministically, retry safely and never change scoring", async () => {
  await asPlayer(p, async () => {
    const id = randomUUID();
    const visit = async (id, r = 1) =>
      (
        await db.query(
          "select public.begin_revisit($1::smallint,$2) as result",
          [r, id],
        )
      ).rows[0].result;
    const first = await visit(id);
    expect(await visit(id)).toEqual(first);
    const second = await visit(randomUUID());
    expect(second.variant).not.toBe(first.variant);
    expect(second.visit).toBe(2);
    expect((await state()).xp).toBe(85);
    await expect(visit(randomUUID(), 2)).rejects.toThrow(/Restore this ruin/);
  });
});
it("leaderboard shows only completers with server timing and no email", async () => {
  await asPlayer(p, async () => {
    expect(
      (await db.query("select public.completion_leaderboard() as value"))
        .rows[0].value.top,
    ).toEqual([]);
  });
  for (let r = 2; r <= 20; r++) await solve(p, r);
  await asPlayer(p, async () => {
    const s = await state();
    expect(s.cleared).toHaveLength(20);
    expect(s.completedAt).toBeTruthy();
    const board = (
      await db.query("select public.completion_leaderboard() as value")
    ).rows[0].value;
    expect(board.top).toHaveLength(1);
    expect(board.you.rank).toBe(1);
    expect(board.you.completionMs).toBeGreaterThanOrEqual(0);
    expect(JSON.stringify(board)).not.toContain("@");
    await expect(action("hint", 20, randomUUID(), 1)).rejects.toThrow(
      /Scoring is closed/,
    );
    const completed = s.completedAt;
    await db.query("select public.begin_revisit(20::smallint,$1)", [
      randomUUID(),
    ]);
    expect((await state()).completedAt).toBe(completed);
  });
});
it("admin RPCs check current allowlist and audit access; ordinary players are denied", async () => {
  await asPlayer(other, async () => {
    await expect(db.query("select public.admin_players()")).rejects.toThrow(
      /Administrator/,
    );
    await expect(
      db.query("select public.admin_question(1::smallint)"),
    ).rejects.toThrow(/Administrator/);
  });
  await asPlayer(admin, async () => {
    expect((await state()).isAdmin).toBe(true);
    expect(
      (await db.query("select public.admin_players() as value")).rows[0].value,
    ).toHaveLength(3);
    expect(
      (await db.query("select public.admin_question(1::smallint) as value"))
        .rows[0].value.solution,
    ).toContain("SELECT");
  });
  expect(
    (await db.query("select count(*)::int as n from game_private.admin_audit"))
      .rows[0].n,
  ).toBe(2);
  await db.query("delete from game_private.admin_emails where email=$1", [
    "former.admin@example.edu",
  ]);
  await asPlayer(admin, async () => {
    await expect(db.query("select public.admin_players()")).rejects.toThrow(
      /Administrator/,
    );
  });
});
