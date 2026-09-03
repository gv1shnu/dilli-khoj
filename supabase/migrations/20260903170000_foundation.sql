-- Dilli Khoj application foundation.
-- Student SQL execution is intentionally not implemented here. The judge must
-- use a separately provisioned restricted database identity.

create schema if not exists game_private;
revoke all on schema game_private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 100),
  email text not null unique,
  xp integer not null default 100,
  ruins_solved smallint not null default 0 check (ruins_solved between 0 and 20),
  active_solving_ms bigint not null default 0 check (active_solving_ms >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ruin_progress (
  player_id uuid not null references public.profiles (id) on delete cascade,
  ruin_id smallint not null check (ruin_id between 1 and 20),
  surveyed_at timestamptz,
  solved_at timestamptz,
  hints_opened smallint not null default 0 check (hints_opened between 0 and 2),
  revisit_count integer not null default 0 check (revisit_count >= 0),
  primary key (player_id, ruin_id)
);

create table game_private.submission_attempts (
  id bigint generated always as identity primary key,
  submission_id uuid not null,
  player_id uuid not null references public.profiles (id) on delete cascade,
  ruin_id smallint not null check (ruin_id between 1 and 20),
  variant text not null,
  dataset_version text not null,
  submitted_sql text not null check (octet_length(submitted_sql) <= 10000),
  correct boolean not null,
  cases_passed smallint not null,
  cases_total smallint not null check (cases_total between 1 and 3),
  latency_ms integer not null check (latency_ms >= 0),
  practice boolean not null default false,
  created_at timestamptz not null default now(),
  unique (player_id, submission_id),
  check (cases_passed between 0 and cases_total)
);

create table game_private.question_cases (
  ruin_id smallint not null check (ruin_id between 1 and 20),
  case_id text not null,
  fixture_schema name not null,
  dataset_version text not null,
  hidden boolean not null,
  comparison text not null check (comparison in ('ordered', 'unordered')),
  expected_columns jsonb not null,
  expected_rows jsonb not null,
  primary key (ruin_id, case_id)
);

alter table public.profiles enable row level security;
alter table public.ruin_progress enable row level security;

create policy "players read their own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "players read their own ruin progress"
on public.ruin_progress for select
to authenticated
using ((select auth.uid()) = player_id);

-- There are no browser INSERT/UPDATE/DELETE policies. Progress changes only
-- through the future judge's fixed, privileged progression function.

create or replace function public.hook_restrict_dilli_khoj_signup(event jsonb)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  signup_email text := lower(event -> 'user' ->> 'email');
  signup_domain text := split_part(signup_email, '@', 2);
  signup_provider text := lower(event -> 'user' -> 'app_metadata' ->> 'provider');
begin
  if signup_provider = 'google'
    and signup_domain in ('example.edu', 'students.example.edu')
  then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 403,
      'message', 'Use an approved Example University Google account.'
    )
  );
end;
$$;

grant execute on function public.hook_restrict_dilli_khoj_signup(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_restrict_dilli_khoj_signup(jsonb) from public, anon, authenticated;

create or replace function public.handle_new_dilli_khoj_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  name_from_google text;
begin
  name_from_google := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, display_name, email)
  values (new.id, left(name_from_google, 100), lower(new.email));

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_dilli_khoj_user();

revoke all on function public.handle_new_dilli_khoj_user() from public, anon, authenticated;

create index submission_attempts_player_created_idx
on game_private.submission_attempts (player_id, created_at desc);

create index submission_attempts_created_idx
on game_private.submission_attempts (created_at);
