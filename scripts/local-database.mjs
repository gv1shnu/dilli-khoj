// Disposable PostgreSQL harness. Models Auth tables/roles; does not emulate GoTrue or PostgREST.
import { PGlite } from "@electric-sql/pglite";
import { readdir, readFile } from "node:fs/promises";
export async function localDatabase() {
  const db = new PGlite();
  await bootstrapDatabase(db);
  return db;
}
export async function bootstrapDatabase(db) {
  await db.exec(`
    create role anon; create role authenticated; create role supabase_auth_admin;
    create schema auth;
    create table auth.users (
      id uuid primary key, email text, email_confirmed_at timestamptz,
      is_anonymous boolean default false, raw_app_meta_data jsonb, raw_user_meta_data jsonb,
      created_at timestamptz default now()
    );
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
    grant usage on schema auth to authenticated;
  `);
  const dir = new URL("../supabase/migrations/", import.meta.url);
  for (const file of (await readdir(dir))
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    await db.exec(await readFile(new URL(file, dir), "utf8"));
  }
}
export async function addPlayer(db, id, email = "student@partner.example") {
  await db.query(
    `insert into auth.users (id,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data)
    values ($1,$2,now(),' {"provider":"google"}', '{"full_name":"Local test explorer"}')`,
    [id, email],
  );
}
