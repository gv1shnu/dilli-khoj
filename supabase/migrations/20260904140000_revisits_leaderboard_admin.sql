create table game_private.revisit_requests (
  player_id uuid not null references public.profiles(id) on delete cascade,
  request_id uuid not null, ruin_id smallint not null, visit integer not null, variant integer not null,
  created_at timestamptz not null default now(), primary key(player_id,request_id)
);
create table game_private.admin_audit (
  id bigint generated always as identity primary key, admin_id uuid not null,
  action text not null, target text, created_at timestamptz not null default now()
);
revoke all on game_private.revisit_requests,game_private.admin_audit from public,anon,authenticated;

create function public.begin_revisit(ruin smallint,request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare p uuid:=game_private.require_player(); prior game_private.revisit_requests%rowtype; visit integer; variant integer;
begin
  if request_id is null then raise exception 'Request ID required.'; end if;
  perform 1 from public.profiles where id=p for update;
  select * into prior from game_private.revisit_requests r where r.player_id=p and r.request_id=begin_revisit.request_id;
  if found then
    if prior.ruin_id<>ruin then raise exception 'Request ID already used.'; end if;
    return jsonb_build_object('visit',prior.visit,'variant',prior.variant);
  end if;
  update public.ruin_progress set revisit_count=revisit_count+1
    where player_id=p and ruin_id=ruin and solved_at is not null returning revisit_count into visit;
  if not found then raise exception 'Restore this ruin before revisiting.' using errcode='42501'; end if;
  -- Stable per-player initial choice, alternating objectives on subsequent visits.
  variant := (get_byte(decode(md5(p::text || ':' || ruin::text),'hex'),0)+visit-1)%2;
  insert into game_private.revisit_requests values(p,request_id,ruin,visit,variant,clock_timestamp());
  return jsonb_build_object('visit',visit,'variant',variant);
end;
$$;

create function public.completion_leaderboard() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare p uuid:=game_private.require_player(); result jsonb;
begin
  with ranked as (
    select pr.id,pr.display_name,pr.xp,
      greatest(0,extract(epoch from(pr.completed_at-u.created_at))*1000)::bigint as completion_ms,
      rank() over(order by pr.xp desc,pr.completed_at-u.created_at asc) as rank
    from public.profiles pr join auth.users u on u.id=pr.id
    where pr.completed_at is not null
      and (select count(*) from public.ruin_progress r where r.player_id=pr.id and r.solved_at is not null)=20
  ), selected as (
    select * from ranked order by rank,id limit 20
  )
  select jsonb_build_object('top',coalesce((select jsonb_agg(jsonb_build_object(
      'name',display_name,'xp',xp,'completionMs',completion_ms,'rank',rank,'isYou',id=p) order by rank,id) from selected),'[]'),
    'you',(select jsonb_build_object('name',display_name,'xp',xp,'completionMs',completion_ms,'rank',rank,'isYou',true) from ranked where id=p)) into result;
  return result;
end;
$$;

create function game_private.require_admin() returns uuid
language plpgsql stable security definer set search_path='' as $$
declare p uuid:=game_private.require_player();
begin
  if not exists(select 1 from auth.users u join game_private.admin_emails a on a.email=lower(u.email) where u.id=p) then
    raise exception 'Administrator access required.' using errcode='42501';
  end if;
  return p;
end;
$$;
create function public.admin_players(page integer default 0) returns jsonb
language plpgsql security definer set search_path='' as $$
declare p uuid:=game_private.require_admin(); result jsonb;
begin
  if page is null or page<0 or page>10000 then raise exception 'Invalid page.'; end if;
  insert into game_private.admin_audit(admin_id,action,target) values(p,'view_players',page::text);
  select coalesce(jsonb_agg(to_jsonb(t)),'[]') into result from (
    select pr.id,pr.display_name,pr.email,pr.xp,pr.ruins_solved,pr.completed_at,u.created_at as signed_up_at
    from public.profiles pr join auth.users u on u.id=pr.id
    order by u.created_at,pr.id limit 50 offset page*50
  ) t;
  return result;
end;
$$;
create function public.admin_question(ruin smallint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare p uuid:=game_private.require_admin(); result jsonb;
begin
  select to_jsonb(q) into result from game_private.question_help q where q.ruin_id=ruin and q.dataset_version='2026-09-04.1';
  if result is null then raise exception 'Unknown question.'; end if;
  insert into game_private.admin_audit(admin_id,action,target) values(p,'view_question',ruin::text);
  return result;
end;
$$;
revoke all on function game_private.require_admin() from public,anon,authenticated;
revoke all on function public.begin_revisit(smallint,uuid),public.completion_leaderboard(),public.admin_players(integer),public.admin_question(smallint) from public,anon;
grant execute on function public.begin_revisit(smallint,uuid),public.completion_leaderboard(),public.admin_players(integer),public.admin_question(smallint) to authenticated;
