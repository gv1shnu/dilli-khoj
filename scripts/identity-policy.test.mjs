import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const db = new PGlite();
const player = '00000000-0000-4000-8000-000000000001';
beforeAll(async () => {
  await db.exec(`
    create role anon; create role authenticated; create role supabase_auth_admin;
    create role dilli_judge_progress; create role dilli_judge_executor;
    create schema auth; create schema game_private;
    grant usage on schema game_private to supabase_auth_admin, dilli_judge_progress;
    create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz,
      is_anonymous boolean default false, raw_app_meta_data jsonb);
    create table game_private.admin_emails (email text primary key);
    insert into game_private.admin_emails values ('owner@example.org');
  `);
  await db.exec(await readFile(new URL('../supabase/migrations/20260904110000_shared_identity_policy.sql', import.meta.url), 'utf8'));
  // Open access: any Google account is an approved player (2026-09-14).
  await db.exec(await readFile(new URL('../supabase/migrations/20260914010000_open_to_any_google.sql', import.meta.url), 'utf8'));
});
afterAll(() => db.close());

async function authorize(email, provider = 'google', confirmed = true, anonymous = false) {
  await db.query(`insert into auth.users values ($1,$2,$3,$4,$5)
    on conflict (id) do update set email=excluded.email, email_confirmed_at=excluded.email_confirmed_at,
      is_anonymous=excluded.is_anonymous, raw_app_meta_data=excluded.raw_app_meta_data`,
    [player, email, confirmed ? '2026-09-04T00:00:00Z' : null, anonymous, JSON.stringify({ provider })]);
  return (await db.query('select game_private.is_approved_player($1) as approved', [player])).rows[0].approved;
}
async function signup(email, provider = 'google') {
  return (await db.query('select public.hook_restrict_dilli_khoj_signup($1) as result',
    [JSON.stringify({ user: { email, app_metadata: { provider } } })])).rows[0].result;
}

describe('shared signup and judge database policy', () => {
  it.each(['student@example.edu', 'student@students.example.edu', 'student@partner.example',
    'student@gmail.com', 'anyone@example.com', 'OWNER@example.org', 'Student@GMAIL.COM'])(
    'allows confirmed Google identity %s', async email => {
    expect(await signup(email)).toEqual({});
    expect(await authorize(email)).toBe(true);
  });
  it.each(['student@evil@partner.example', '@partner.example', ' student@partner.example',
    'nodomain', '', null])('rejects malformed email %s', async email => {
    expect((await signup(email)).error.http_code).toBe(403);
    expect(await authorize(email)).toBe(false);
  });
  it.each(['email', 'github', null])('rejects provider %s even for an admin', async provider => {
    expect((await signup('owner@example.org', provider)).error.http_code).toBe(403);
    expect(await authorize('owner@example.org', provider)).toBe(false);
  });
  it('requires confirmation and disallows anonymous users, including admins', async () => {
    expect(await authorize('owner@example.org', 'google', false)).toBe(false);
    expect(await authorize('owner@example.org', 'google', true, true)).toBe(false);
    expect((await db.query('select game_private.is_approved_player(null) as approved')).rows[0].approved).toBe(false);
  });
  it('approves any Google account without an allowlist entry', async () => {
    // With open access the admin allowlist no longer gates play: a brand-new,
    // never-listed email is approved for both signup and submission.
    expect(await signup('random.person@somewhere.io')).toEqual({});
    expect(await authorize('random.person@somewhere.io')).toBe(true);
  });
  it('exposes only the fixed authorization function to the progress role', async () => {
    for (const role of ['anon', 'authenticated', 'dilli_judge_executor', 'supabase_auth_admin']) {
      expect((await db.query("select has_function_privilege($1, 'game_private.is_approved_player(uuid)', 'execute') as allowed", [role])).rows[0].allowed).toBe(false);
    }
    await db.exec('set role dilli_judge_progress');
    try {
      // The progress role may execute the fixed authorization function (the player
      // row left by earlier tests is an approved Google account) but cannot read the
      // underlying tables directly.
      expect((await db.query('select game_private.is_approved_player($1) as approved', [player])).rows[0].approved).toBe(true);
      await expect(db.query('select * from auth.users')).rejects.toThrow(/permission denied/);
      await expect(db.query('select * from game_private.admin_emails')).rejects.toThrow(/permission denied/);
    } finally { await db.exec('reset role'); }
    await db.exec('set role supabase_auth_admin');
    try { expect(await signup('student@partner.example')).toEqual({}); }
    finally { await db.exec('reset role'); }
  });
});
