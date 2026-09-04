-- Fixed, authenticated game operations. All mutations serialize on the profile row.
alter table public.profiles add column completed_at timestamptz;
revoke insert, update, delete, truncate on public.profiles,public.ruin_progress from anon,authenticated;
grant select on public.profiles,public.ruin_progress to authenticated;
alter table public.ruin_progress add column revealed_at timestamptz;
create table game_private.game_requests (
  player_id uuid not null references public.profiles(id) on delete cascade,
  request_id uuid not null, action text not null, ruin_id smallint not null,
  hint_index integer, result jsonb not null,
  created_at timestamptz not null default now(),
  primary key(player_id, request_id)
);
revoke all on game_private.game_requests from public, anon, authenticated;

create function game_private.require_player() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare p uuid := auth.uid();
begin
  if p is null or not game_private.is_approved_player(p) then
    raise exception 'Use a verified approved Google account.' using errcode = '42501';
  end if;
  return p;
end;
$$;
create function game_private.ruin_unlocked(p uuid, r smallint) returns boolean
language sql stable security definer set search_path = '' as $$
  select r between 1 and 20 and not exists (
    select 1 from generate_series(1, r-1) prior
    where not exists (select 1 from public.ruin_progress rp
      where rp.player_id=p and rp.ruin_id=prior and rp.solved_at is not null)
  );
$$;
create function public.game_state() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare p uuid := game_private.require_player(); result jsonb;
begin
  select jsonb_build_object('playerId', p, 'xp', pr.xp, 'completedAt',pr.completed_at,
    'signedUpAt', u.created_at,
    'isAdmin', exists(select 1 from game_private.admin_emails a where a.email=lower(u.email)),
    'cleared',coalesce((select jsonb_agg(r.ruin_id order by r.ruin_id) from public.ruin_progress r where r.player_id=p and r.solved_at is not null),'[]'),
    'progress',coalesce((select jsonb_agg(jsonb_build_object(
      'ruin',r.ruin_id,'surveyed',r.surveyed_at is not null,'hintsOpened',r.hints_opened,
      'revealed',r.revealed_at is not null,
      'hints',(select coalesce(jsonb_agg(h.value order by h.ordinality),'[]')
        from jsonb_array_elements(q.hints) with ordinality h where h.ordinality <= r.hints_opened),
      'solution',case when r.revealed_at is not null then q.solution else null end
    ) order by r.ruin_id) from public.ruin_progress r
    left join game_private.question_help q on q.ruin_id=r.ruin_id and q.dataset_version='2026-09-04.1'
    where r.player_id=p),'[]')) into result
  from public.profiles pr join auth.users u on u.id=pr.id where pr.id=p;
  return result;
end;
$$;

create function public.game_action(action text, ruin smallint, request_id uuid, hint_index integer default null)
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
      update public.profiles set xp=xp+5,updated_at=clock_timestamp() where id=p;
    end if;
    result:=jsonb_build_object('surveyed',true);
  elsif action='hint' then
    if hint_index is null or hint_index<1 or hint_index>jsonb_array_length(help.hints) or hint_index>progress.hints_opened+1 then
      raise exception 'Open hints in order.' using errcode='22023';
    end if;
    if hint_index>progress.hints_opened then
      if profile.completed_at is not null then raise exception 'Scoring is closed after completion.'; end if;
      charge:=10;
      update public.ruin_progress set hints_opened=hint_index where player_id=p and ruin_id=ruin;
    end if;
    result:=jsonb_build_object('hint',help.hints->>(hint_index-1));
  else
    if progress.hints_opened<jsonb_array_length(help.hints) then raise exception 'Open all hints before revealing.'; end if;
    if progress.revealed_at is null then
      if profile.completed_at is not null then raise exception 'Scoring is closed after completion.'; end if;
      charge:=20;
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

-- Keep the recording implementation, but remove every external grant to it.
alter function game_private.record_judged_submission(uuid,uuid,smallint,text,text,text,boolean,text,smallint,smallint,integer,boolean)
rename to record_judged_submission_internal;
revoke all on function game_private.record_judged_submission_internal(uuid,uuid,smallint,text,text,text,boolean,text,smallint,smallint,integer,boolean)
from public,anon,authenticated,dilli_judge_executor,dilli_judge_progress;

create function game_private.record_judged_submission(
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
    -- Submitting a correct solution has necessarily opened/surveyed this archive.
    insert into public.ruin_progress(player_id,ruin_id) values(requested_player,requested_ruin) on conflict do nothing;
    update public.ruin_progress set surveyed_at=clock_timestamp()
      where player_id=requested_player and ruin_id=requested_ruin and surveyed_at is null;
    if found then update public.profiles set xp=xp+5 where id=requested_player; end if;
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

drop function game_private.prepare_judge_submission(uuid,uuid,smallint,text);
create function game_private.prepare_judge_submission(
  requested_player uuid, requested_submission uuid, requested_ruin smallint, requested_dataset_version text, requested_sql text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare lease jsonb; prior game_private.submission_attempts%rowtype;
begin
  if not game_private.is_approved_player(requested_player)
    or not coalesce(game_private.ruin_unlocked(requested_player,requested_ruin),false) then
    raise exception 'Account or ruin is locked.' using errcode='42501';
  end if;
  select * into prior from game_private.submission_attempts where player_id=requested_player and submission_id=requested_submission;
  if found and (prior.ruin_id<>requested_ruin or prior.dataset_version<>requested_dataset_version or prior.submitted_sql is distinct from requested_sql) then
    raise exception 'Request ID already used for another submission.' using errcode='22023';
  end if;
  lease := game_private.acquire_submission_lease(requested_player,requested_submission);
  if lease->>'status'<>'acquired' then return jsonb_build_object('lease',lease); end if;
  return jsonb_build_object('lease',lease,'manifest',game_private.get_judge_manifest(requested_ruin,requested_dataset_version));
end;
$$;

revoke all on function game_private.require_player(), game_private.ruin_unlocked(uuid,smallint) from public,anon,authenticated;
revoke all on function public.game_state(), public.game_action(text,smallint,uuid,integer) from public,anon;
grant execute on function public.game_state(), public.game_action(text,smallint,uuid,integer) to authenticated;
revoke all on function game_private.record_judged_submission(uuid,uuid,smallint,text,text,text,boolean,text,smallint,smallint,integer,boolean)
from public,anon,authenticated,dilli_judge_executor;
grant execute on function game_private.record_judged_submission(uuid,uuid,smallint,text,text,text,boolean,text,smallint,smallint,integer,boolean) to dilli_judge_progress;

revoke all on function game_private.prepare_judge_submission(uuid,uuid,smallint,text,text) from public,anon,authenticated,dilli_judge_executor;
grant execute on function game_private.prepare_judge_submission(uuid,uuid,smallint,text,text) to dilli_judge_progress;
