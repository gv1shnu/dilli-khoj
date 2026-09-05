-- Stage archive help gently: the first clue is free, a second clue costs 5 XP,
-- and the full solution costs 15 XP. Ordering, idempotency and server ownership
-- remain unchanged.
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
      update public.profiles set xp=xp+5,updated_at=clock_timestamp() where id=p;
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

revoke all on function public.game_action(text,smallint,uuid,integer) from public,anon;
grant execute on function public.game_action(text,smallint,uuid,integer) to authenticated;
