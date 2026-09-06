-- Durable profile summaries, independent of raw submission retention.
alter table public.ruin_progress
  add column solve_help text check (solve_help in ('independent','hint1','hint2','revealed','unknown')),
  add column attempts integer not null default 0 check (attempts >= 0),
  add column incorrect_attempts integer not null default 0 check (incorrect_attempts >= 0);

update public.ruin_progress r set solve_help = case
  when r.revealed_at <= r.solved_at then 'revealed'
  when r.hints_opened = 0 then 'independent'
  when (select count(distinct g.hint_index) from game_private.game_requests g where g.player_id=r.player_id and g.ruin_id=r.ruin_id and g.action='hint') = r.hints_opened then
    case coalesce((select max(g.hint_index) from game_private.game_requests g where g.player_id=r.player_id and g.ruin_id=r.ruin_id and g.action='hint' and g.created_at <= r.solved_at),0)
      when 0 then 'independent' when 1 then 'hint1' else 'hint2' end
  else 'unknown' end
where r.solved_at is not null;

insert into public.ruin_progress(player_id,ruin_id,attempts,incorrect_attempts)
select player_id,ruin_id,count(*)::integer,count(*) filter(where not correct)::integer
from game_private.submission_attempts where not practice group by player_id,ruin_id
on conflict(player_id,ruin_id) do update set attempts=excluded.attempts, incorrect_attempts=excluded.incorrect_attempts;

create function game_private.snapshot_solve_help() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.solved_at is not null and (TG_OP='INSERT' or old.solved_at is null) then
    new.solve_help := case when new.revealed_at is not null then 'revealed'
      when new.hints_opened >= 2 then 'hint2' when new.hints_opened=1 then 'hint1' else 'independent' end;
  elsif TG_OP='UPDATE' then new.solve_help := old.solve_help;
  end if;
  return new;
end;
$$;
create trigger freeze_first_solve_help before insert or update on public.ruin_progress
for each row execute function game_private.snapshot_solve_help();

create function game_private.count_profile_attempt() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if not new.practice then
    insert into public.ruin_progress(player_id,ruin_id,attempts,incorrect_attempts)
    values(new.player_id,new.ruin_id,1,case when new.correct then 0 else 1 end)
    on conflict(player_id,ruin_id) do update set attempts=public.ruin_progress.attempts+1,
      incorrect_attempts=public.ruin_progress.incorrect_attempts+excluded.incorrect_attempts;
  end if;
  return new;
end;
$$;
create trigger count_profile_attempt after insert on game_private.submission_attempts
for each row execute function game_private.count_profile_attempt();
revoke all on function game_private.snapshot_solve_help(),game_private.count_profile_attempt() from public,anon,authenticated;

create function public.player_profile() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare p uuid:=game_private.require_player(); result jsonb;
begin
  select jsonb_build_object('id',p,'name',pr.display_name,'email',pr.email,'joinedAt',u.created_at,
    'xp',pr.xp,'completedAt',pr.completed_at,
    'rank',public.completion_leaderboard()->'you'->'rank',
    'currentRuin',(select min(n) from generate_series(1,20) n where not exists(select 1 from public.ruin_progress r where r.player_id=p and r.ruin_id=n and r.solved_at is not null)),
    'ruins',(select jsonb_agg(jsonb_build_object('ruin',n,'solvedAt',r.solved_at,'surveyed',r.surveyed_at is not null,
      'help',r.solve_help,'hintsOpened',coalesce(r.hints_opened,0),'revealed',r.revealed_at is not null,
      'attempts',coalesce(r.attempts,0),'incorrectAttempts',coalesce(r.incorrect_attempts,0),'revisits',coalesce(r.revisit_count,0)) order by n)
      from generate_series(1,20) n left join public.ruin_progress r on r.player_id=p and r.ruin_id=n)) into result
  from public.profiles pr join auth.users u on u.id=pr.id where pr.id=p;
  return result;
end;
$$;

-- Atomic self-deletion: the caller cannot supply another player's UUID.
-- Deleting auth.users cascades through profiles, progress, requests and attempts.
create function public.delete_player_account(confirmation text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare p uuid:=auth.uid();
begin
  if p is null then raise exception 'Sign in before deleting your account.' using errcode='42501'; end if;
  if confirmation is distinct from 'DELETE' then raise exception 'Type DELETE to confirm.' using errcode='22023'; end if;
  perform 1 from public.profiles where id=p for update;
  delete from game_private.admin_audit where admin_id=p;
  delete from auth.users where id=p;
  return jsonb_build_object('deleted',true);
end;
$$;
revoke all on function public.player_profile(),public.delete_player_account(text) from public,anon;
grant execute on function public.player_profile(),public.delete_player_account(text) to authenticated;
