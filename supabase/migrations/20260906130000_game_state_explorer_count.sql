-- Add a total-explorer count to game_state so the HUD can show how many players
-- are restoring Delhi. game_state is security definer, so the count sees every
-- profile past row-level security; it rides the existing polling, adding no new
-- RPC, grant, or client round-trip.
create or replace function public.game_state() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare p uuid := game_private.require_player(); result jsonb;
begin
  select jsonb_build_object('playerId', p, 'xp', pr.xp, 'completedAt',pr.completed_at,
    'signedUpAt', u.created_at,
    'isAdmin', exists(select 1 from game_private.admin_emails a where a.email=lower(u.email)),
    'explorers',(select count(*) from public.profiles),
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
