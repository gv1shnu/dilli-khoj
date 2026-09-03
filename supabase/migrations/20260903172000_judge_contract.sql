-- Fixed judge contracts and least-privilege runtime roles.
-- Passwords are intentionally absent. Provision them out-of-band, then put
-- the two transaction-pooler URLs in Edge Function secrets.

create table game_private.questions (
  ruin_id smallint not null check (ruin_id between 1 and 20),
  dataset_version text not null,
  allowed_tables jsonb not null check (jsonb_typeof(allowed_tables) = 'array'),
  max_result_rows smallint not null default 50 check (max_result_rows between 1 and 100),
  statement_timeout_ms smallint not null default 400 check (statement_timeout_ms between 100 and 1000),
  enabled boolean not null default true,
  primary key (ruin_id, dataset_version)
);

insert into game_private.questions (
  ruin_id,
  dataset_version,
  allowed_tables,
  max_result_rows,
  statement_timeout_ms
) values (6, '2026-09-03.1', '["stalls"]', 50, 400);

alter table game_private.question_cases
add constraint question_cases_question_fk
foreign key (ruin_id, dataset_version)
references game_private.questions (ruin_id, dataset_version)
on delete cascade;

alter table game_private.submission_attempts
add column verdict_code text not null default 'wrong_result',
add column xp_awarded integer not null default 0 check (xp_awarded >= 0);

create table game_private.submission_leases (
  player_id uuid primary key references public.profiles (id) on delete cascade,
  submission_id uuid not null,
  leased_until timestamptz not null
);

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'dilli_judge_executor') then
    create role dilli_judge_executor
      login noinherit nosuperuser nocreatedb nocreaterole noreplication;
  end if;

  if not exists (select 1 from pg_roles where rolname = 'dilli_judge_progress') then
    create role dilli_judge_progress
      login noinherit nosuperuser nocreatedb nocreaterole noreplication;
  end if;
end;
$$;

alter role dilli_judge_executor set default_transaction_read_only = on;
alter role dilli_judge_executor set statement_timeout = '500ms';
alter role dilli_judge_executor set lock_timeout = '100ms';
alter role dilli_judge_executor set idle_in_transaction_session_timeout = '2s';
alter role dilli_judge_executor set search_path = 'pg_catalog';

revoke all on schema public, game_private from dilli_judge_executor;
revoke all on all tables in schema public, game_private from dilli_judge_executor;
revoke all on all functions in schema public, game_private from dilli_judge_executor;

grant usage on schema fixture_r06_visible, fixture_r06_hidden_a, fixture_r06_hidden_b
to dilli_judge_executor;
grant select on all tables in schema fixture_r06_visible, fixture_r06_hidden_a, fixture_r06_hidden_b
to dilli_judge_executor;

revoke all on schema public from dilli_judge_progress;
revoke all on all tables in schema public, game_private from dilli_judge_progress;
revoke all on all functions in schema public, game_private from dilli_judge_progress;
grant usage on schema game_private to dilli_judge_progress;

create or replace function game_private.get_judge_manifest(
  requested_ruin smallint,
  requested_dataset_version text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  manifest jsonb;
begin
  select jsonb_build_object(
    'ruin', question.ruin_id,
    'datasetVersion', question.dataset_version,
    'allowedTables', question.allowed_tables,
    'maxResultRows', question.max_result_rows,
    'statementTimeoutMs', question.statement_timeout_ms,
    'cases', (
      select jsonb_agg(
        jsonb_build_object(
          'id', test_case.case_id,
          'fixtureSchema', test_case.fixture_schema,
          'hidden', test_case.hidden,
          'comparison', test_case.comparison,
          'expectedColumns', test_case.expected_columns,
          'expectedRows', test_case.expected_rows
        ) order by test_case.hidden, test_case.case_id
      )
      from game_private.question_cases as test_case
      where test_case.ruin_id = question.ruin_id
        and test_case.dataset_version = question.dataset_version
    )
  )
  into manifest
  from game_private.questions as question
  where question.ruin_id = requested_ruin
    and question.dataset_version = requested_dataset_version
    and question.enabled;

  if manifest is null then
    raise exception 'judge manifest not found' using errcode = 'P0002';
  end if;

  return manifest;
end;
$$;

create or replace function game_private.acquire_submission_lease(
  requested_player uuid,
  requested_submission uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_attempt game_private.submission_attempts%rowtype;
  current_xp integer;
  acquired uuid;
begin
  select * into existing_attempt
  from game_private.submission_attempts
  where player_id = requested_player
    and submission_id = requested_submission;

  if found then
    select xp into current_xp from public.profiles where id = requested_player;
    return jsonb_build_object(
      'status', 'cached',
      'verdict', jsonb_build_object(
        'correct', existing_attempt.correct,
        'code', existing_attempt.verdict_code,
        'message', case
          when existing_attempt.correct and existing_attempt.xp_awarded > 0 then 'Ruin restored. +20 XP.'
          when existing_attempt.correct then 'All cases passed.'
          else 'Not quite yet. Check the result and try again.'
        end,
        'casesPassed', existing_attempt.cases_passed,
        'casesTotal', existing_attempt.cases_total,
        'xp', current_xp
      )
    );
  end if;

  if exists (
    select 1
    from game_private.submission_attempts
    where player_id = requested_player
      and created_at > clock_timestamp() - interval '300 milliseconds'
  ) then
    return jsonb_build_object('status', 'rate_limited');
  end if;

  insert into game_private.submission_leases (player_id, submission_id, leased_until)
  values (requested_player, requested_submission, clock_timestamp() + interval '5 seconds')
  on conflict (player_id) do update
  set submission_id = excluded.submission_id,
      leased_until = excluded.leased_until
  where game_private.submission_leases.leased_until < clock_timestamp()
  returning submission_id into acquired;

  if acquired is null then
    return jsonb_build_object('status', 'locked');
  end if;

  return jsonb_build_object('status', 'acquired');
end;
$$;

create or replace function game_private.release_submission_lease(
  requested_player uuid,
  requested_submission uuid
)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from game_private.submission_leases
  where player_id = requested_player
    and submission_id = requested_submission;
$$;

create or replace function game_private.prepare_judge_submission(
  requested_player uuid,
  requested_submission uuid,
  requested_ruin smallint,
  requested_dataset_version text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  lease jsonb;
begin
  lease := game_private.acquire_submission_lease(requested_player, requested_submission);

  if lease ->> 'status' <> 'acquired' then
    return jsonb_build_object('lease', lease);
  end if;

  return jsonb_build_object(
    'lease', lease,
    'manifest', game_private.get_judge_manifest(requested_ruin, requested_dataset_version)
  );
end;
$$;

create or replace function game_private.record_judged_submission(
  requested_player uuid,
  requested_submission uuid,
  requested_ruin smallint,
  requested_variant text,
  requested_dataset_version text,
  requested_sql text,
  verdict_correct boolean,
  verdict_code text,
  verdict_cases_passed smallint,
  verdict_cases_total smallint,
  measured_latency_ms integer,
  is_practice boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_id bigint;
  existing_attempt game_private.submission_attempts%rowtype;
  prior_solved_at timestamptz;
  first_solve boolean := false;
  awarded integer := 0;
  current_xp integer;
begin
  insert into game_private.submission_attempts (
    submission_id,
    player_id,
    ruin_id,
    variant,
    dataset_version,
    submitted_sql,
    correct,
    verdict_code,
    cases_passed,
    cases_total,
    latency_ms,
    practice
  ) values (
    requested_submission,
    requested_player,
    requested_ruin,
    requested_variant,
    requested_dataset_version,
    requested_sql,
    verdict_correct,
    verdict_code,
    verdict_cases_passed,
    verdict_cases_total,
    measured_latency_ms,
    is_practice
  )
  on conflict (player_id, submission_id) do nothing
  returning id into attempt_id;

  if attempt_id is null then
    select * into existing_attempt
    from game_private.submission_attempts
    where player_id = requested_player
      and submission_id = requested_submission;
    select xp into current_xp from public.profiles where id = requested_player;

    return jsonb_build_object(
      'correct', existing_attempt.correct,
      'code', existing_attempt.verdict_code,
      'message', case
        when existing_attempt.correct and existing_attempt.xp_awarded > 0 then 'Ruin restored. +20 XP.'
        when existing_attempt.correct then 'All cases passed.'
        else 'Not quite yet. Check the result and try again.'
      end,
      'casesPassed', existing_attempt.cases_passed,
      'casesTotal', existing_attempt.cases_total,
      'xp', current_xp
    );
  end if;

  if verdict_correct and not is_practice then
    perform 1 from public.profiles where id = requested_player for update;

    select solved_at into prior_solved_at
    from public.ruin_progress
    where player_id = requested_player and ruin_id = requested_ruin
    for update;

    if not found then
      insert into public.ruin_progress (player_id, ruin_id, solved_at)
      values (requested_player, requested_ruin, clock_timestamp());
      first_solve := true;
    elsif prior_solved_at is null then
      update public.ruin_progress
      set solved_at = clock_timestamp()
      where player_id = requested_player and ruin_id = requested_ruin;
      first_solve := true;
    end if;

    if first_solve then
      awarded := 20;
      update public.profiles
      set xp = xp + awarded,
          ruins_solved = ruins_solved + 1,
          updated_at = clock_timestamp()
      where id = requested_player;
    end if;
  end if;

  update game_private.submission_attempts
  set xp_awarded = awarded
  where id = attempt_id;

  delete from game_private.submission_leases
  where player_id = requested_player
    and submission_id = requested_submission;

  select xp into current_xp from public.profiles where id = requested_player;

  return jsonb_build_object(
    'correct', verdict_correct,
    'code', verdict_code,
    'message', case
      when verdict_correct and awarded > 0 then 'Ruin restored. +20 XP.'
      when verdict_correct then 'All cases passed.'
      when verdict_code = 'sql_error' then 'PostgreSQL could not run that query.'
      when verdict_code = 'timeout' then 'That query took too long.'
      else 'Not quite yet. Check the result and try again.'
    end,
    'casesPassed', verdict_cases_passed,
    'casesTotal', verdict_cases_total,
    'xp', current_xp
  );
end;
$$;

grant execute on function game_private.prepare_judge_submission(uuid, uuid, smallint, text)
to dilli_judge_progress;
grant execute on function game_private.release_submission_lease(uuid, uuid)
to dilli_judge_progress;
grant execute on function game_private.record_judged_submission(
  uuid, uuid, smallint, text, text, text, boolean, text, smallint, smallint, integer, boolean
) to dilli_judge_progress;

revoke all on function game_private.get_judge_manifest(smallint, text)
from public, anon, authenticated, dilli_judge_executor, dilli_judge_progress;
revoke all on function game_private.acquire_submission_lease(uuid, uuid)
from public, anon, authenticated, dilli_judge_executor, dilli_judge_progress;
revoke all on function game_private.prepare_judge_submission(uuid, uuid, smallint, text)
from public, anon, authenticated, dilli_judge_executor;
revoke all on function game_private.release_submission_lease(uuid, uuid)
from public, anon, authenticated, dilli_judge_executor;
revoke all on function game_private.record_judged_submission(
  uuid, uuid, smallint, text, text, text, boolean, text, smallint, smallint, integer, boolean
) from public, anon, authenticated, dilli_judge_executor;
