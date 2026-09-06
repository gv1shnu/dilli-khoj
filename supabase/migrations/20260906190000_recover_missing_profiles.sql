-- A profile-only reset leaves Auth users intact. Recreate approved missing
-- profiles using defaults; never overwrite existing balances or progress.
insert into public.profiles(id, display_name, email)
select u.id, left(coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
  nullif(trim(u.raw_user_meta_data->>'name'), ''), split_part(u.email, '@', 1)), 100), lower(u.email)
from auth.users u
where game_private.is_approved_player(u.id)
  and not exists(select 1 from public.profiles p where p.id=u.id)
on conflict (id) do nothing;

-- Keep the existing response contract in a private reader. The public entry
-- point is VOLATILE because recovery writes and the reader must see that write.
alter function public.game_state() set schema game_private;
alter function game_private.game_state() rename to read_game_state;
revoke all on function game_private.read_game_state() from public, anon, authenticated;

create function public.game_state() returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare p uuid := game_private.require_player();
begin
  -- Holding the Auth row prevents account deletion racing profile recovery.
  perform 1 from auth.users where id=p for key share;
  if not found then
    raise exception 'Sign in with an approved account.' using errcode='42501';
  end if;
  insert into public.profiles(id, display_name, email)
  select u.id, left(coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(u.raw_user_meta_data->>'name'), ''), split_part(u.email, '@', 1)), 100), lower(u.email)
  from auth.users u where u.id=p
    and not exists(select 1 from public.profiles pr where pr.id=p)
  on conflict (id) do nothing;
  return game_private.read_game_state();
end;
$$;
revoke all on function public.game_state() from public, anon;
grant execute on function public.game_state() to authenticated;
