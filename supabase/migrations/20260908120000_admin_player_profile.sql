-- Shared profile builder so player_profile() and the admin view stay identical.
create function game_private.profile_json(target uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  select jsonb_build_object('id',target,'name',pr.display_name,'email',pr.email,'joinedAt',u.created_at,
    'xp',pr.xp,'completedAt',pr.completed_at,
    'rank',(select rank from (
        select pr2.id, rank() over(order by pr2.xp desc,pr2.completed_at-u2.created_at asc) as rank
        from public.profiles pr2 join auth.users u2 on u2.id=pr2.id
        where pr2.completed_at is not null
          and (select count(*) from public.ruin_progress r where r.player_id=pr2.id and r.solved_at is not null)=20
      ) ranked where ranked.id=target),
    'currentRuin',(select min(n) from generate_series(1,20) n where not exists(select 1 from public.ruin_progress r where r.player_id=target and r.ruin_id=n and r.solved_at is not null)),
    'ruins',(select jsonb_agg(jsonb_build_object('ruin',n,'solvedAt',r.solved_at,'surveyed',r.surveyed_at is not null,
      'help',r.solve_help,'hintsOpened',coalesce(r.hints_opened,0),'revealed',r.revealed_at is not null,
      'attempts',coalesce(r.attempts,0),'incorrectAttempts',coalesce(r.incorrect_attempts,0),'revisits',coalesce(r.revisit_count,0)) order by n)
      from generate_series(1,20) n left join public.ruin_progress r on r.player_id=target and r.ruin_id=n)) into result
  from public.profiles pr join auth.users u on u.id=pr.id where pr.id=target;
  return result;
end;
$$;
revoke all on function game_private.profile_json(uuid) from public,anon,authenticated;

create or replace function public.player_profile() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  return game_private.profile_json(game_private.require_player());
end;
$$;

-- Admin-only read of any explorer's profile, gated and recorded like the roster view.
create function public.admin_player_profile(target uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare p uuid:=game_private.require_admin(); result jsonb;
begin
  if target is null then raise exception 'Player ID required.'; end if;
  result := game_private.profile_json(target);
  if result is null then raise exception 'Unknown player.'; end if;
  insert into game_private.admin_audit(admin_id,action,target) values(p,'view_profile',target::text);
  return result;
end;
$$;
revoke all on function public.admin_player_profile(uuid) from public,anon;
grant execute on function public.admin_player_profile(uuid) to authenticated;
