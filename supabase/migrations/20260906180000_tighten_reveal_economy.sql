-- Tighten the help economy:
--   1. Solving a ruin whose solution was revealed awards no XP (the reveal is a
--      dead end for scoring, not a cheap shortcut).
--   2. Opening/surveying an archive no longer awards XP.
-- Costs are unchanged (clue 1 free, clue 2 = 5, reveal = 15). surveyed_at and
-- revealed_at are still recorded; only the XP awards change.

-- (1) Internal recorder: award the solve only when the ruin was not revealed.
create or replace function game_private.record_judged_submission_internal(
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
  prior_revealed_at timestamptz;
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

    select solved_at, revealed_at into prior_solved_at, prior_revealed_at
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
      -- A revealed solution forfeits the solve award.
      awarded := case when prior_revealed_at is not null then 0 else 20 end;
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

-- (2) Wrapper: record the survey timestamp on first solve, but award no survey XP.
create or replace function game_private.record_judged_submission(
  requested_player uuid, requested_submission uuid, requested_ruin smallint, requested_variant text,
  requested_dataset_version text, requested_sql text, verdict_correct boolean, verdict_code text,
  verdict_cases_passed smallint, verdict_cases_total smallint, measured_latency_ms integer, is_practice boolean default false
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare prior game_private.submission_attempts%rowtype; result jsonb;
begin
  if not game_private.is_approved_player(requested_player) then raise exception 'Account is not approved.' using errcode='42501'; end if;
  perform 1 from public.profiles where id=requested_player for update;
  if requested_variant is distinct from 'first-pass' or is_practice is distinct from false then
    raise exception 'Use non-scoring revisit practice.' using errcode='22023';
  end if;
  if not coalesce(game_private.ruin_unlocked(requested_player,requested_ruin),false) then
    raise exception 'Restore the previous ruins first.' using errcode='42501';
  end if;
  select * into prior from game_private.submission_attempts where player_id=requested_player and submission_id=requested_submission;
  if found and (prior.ruin_id<>requested_ruin or prior.submitted_sql<>requested_sql or prior.dataset_version<>requested_dataset_version or prior.submitted_sql is distinct from requested_sql) then
    raise exception 'Request ID already used for another submission.' using errcode='22023';
  end if;
  if prior.id is null and verdict_correct then
    -- Opening/surveying an archive is recorded but no longer awards XP.
    insert into public.ruin_progress(player_id,ruin_id) values(requested_player,requested_ruin) on conflict do nothing;
    update public.ruin_progress set surveyed_at=clock_timestamp()
      where player_id=requested_player and ruin_id=requested_ruin and surveyed_at is null;
  end if;
  result := game_private.record_judged_submission_internal(requested_player,requested_submission,requested_ruin,
    requested_variant,requested_dataset_version,requested_sql,verdict_correct,verdict_code,
    verdict_cases_passed,verdict_cases_total,measured_latency_ms,false);
  update public.profiles set completed_at=clock_timestamp()
    where id=requested_player and completed_at is null
      and (select count(*) from public.ruin_progress where player_id=requested_player and solved_at is not null)=20;
  return result;
end;
$$;

-- (3) game_action: record the survey timestamp, but award no survey XP.
create or replace function public.game_action(action text, ruin smallint, request_id uuid, hint_index integer default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  p uuid := game_private.require_player(); profile public.profiles%rowtype;
  progress public.ruin_progress%rowtype; help game_private.question_help%rowtype;
  prior game_private.game_requests%rowtype; result jsonb; charge integer := 0;
begin
  if request_id is null or action not in ('survey','hint','reveal') or action is null then
    raise exception 'Invalid game operation.' using errcode='22023';
  end if;
  select * into profile from public.profiles where id=p for update;
  select * into prior from game_private.game_requests g where g.player_id=p and g.request_id=game_action.request_id;
  if found then
    if prior.action<>action or prior.ruin_id<>ruin or prior.hint_index is distinct from hint_index then
      raise exception 'Request ID already used for another operation.' using errcode='22023';
    end if;
    return prior.result;
  end if;
  if not coalesce(game_private.ruin_unlocked(p,ruin),false) then
    raise exception 'Restore the previous ruins first.' using errcode='42501';
  end if;
  select * into help from game_private.question_help where ruin_id=ruin and dataset_version='2026-09-04.1';
  if not found then raise exception 'Question is unavailable.'; end if;
  insert into public.ruin_progress(player_id,ruin_id) values(p,ruin) on conflict do nothing;
  select * into progress from public.ruin_progress where player_id=p and ruin_id=ruin;
  if action='survey' then
    if progress.surveyed_at is null and profile.completed_at is null then
      update public.ruin_progress set surveyed_at=clock_timestamp() where player_id=p and ruin_id=ruin;
    end if;
    result:=jsonb_build_object('surveyed',true);
  elsif action='hint' then
    if hint_index is null or hint_index<1 or hint_index>jsonb_array_length(help.hints) or hint_index>progress.hints_opened+1 then
      raise exception 'Open clues in order.' using errcode='22023';
    end if;
    if hint_index>progress.hints_opened then
      if profile.completed_at is not null then raise exception 'Scoring is closed after completion.'; end if;
      charge:=case when hint_index=1 then 0 else 5 end;
      update public.ruin_progress set hints_opened=hint_index where player_id=p and ruin_id=ruin;
    end if;
    result:=jsonb_build_object('hint',help.hints->>(hint_index-1));
  else
    if progress.hints_opened<jsonb_array_length(help.hints) then raise exception 'Open all clues before revealing.'; end if;
    if progress.revealed_at is null then
      if profile.completed_at is not null then raise exception 'Scoring is closed after completion.'; end if;
      charge:=15;
      update public.ruin_progress set revealed_at=clock_timestamp() where player_id=p and ruin_id=ruin;
    end if;
    result:=jsonb_build_object('solution',help.solution);
  end if;
  if profile.xp<charge then raise exception 'Not enough XP. Solving is always free.'; end if;
  if charge>0 then update public.profiles set xp=xp-charge,updated_at=clock_timestamp() where id=p; end if;
  insert into game_private.game_requests values(p,request_id,action,ruin,hint_index,result,clock_timestamp());
  return result;
end;
$$;
