-- One database-owned policy for signup and judge authorization. No client allowlist.
create or replace function game_private.is_approved_email(candidate text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    candidate ~ '^[^@[:space:]]+@[^@[:space:]]+$'
    and (
      split_part(lower(candidate), '@', 2) in
        ('example.edu', 'students.example.edu', 'partner.example')
      or exists (
        select 1 from game_private.admin_emails a where a.email = lower(candidate)
      )
    ), false
  );
$$;
revoke all on function game_private.is_approved_email(text) from public, anon, authenticated;
grant execute on function game_private.is_approved_email(text) to supabase_auth_admin;

create or replace function public.hook_restrict_dilli_khoj_signup(event jsonb)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  -- Confirmation happens after this before-user-created hook. The judge checks it.
  if lower(event -> 'user' -> 'app_metadata' ->> 'provider') = 'google'
    and game_private.is_approved_email(event -> 'user' ->> 'email')
  then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object(
    'http_code', 403,
    'message', 'Use an approved Example University or Partner School Google account.'
  ));
end;
$$;
revoke all on function public.hook_restrict_dilli_khoj_signup(jsonb) from public, anon, authenticated;
grant execute on function public.hook_restrict_dilli_khoj_signup(jsonb) to supabase_auth_admin;

create or replace function game_private.is_approved_player(player_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  -- Read current Auth records, never user-editable metadata or a submitted email.
  select exists (
    select 1 from auth.users u
    where u.id = player_id
      and u.email_confirmed_at is not null
      and u.is_anonymous is false
      and lower(u.raw_app_meta_data ->> 'provider') = 'google'
      and game_private.is_approved_email(u.email)
  );
$$;
revoke all on function game_private.is_approved_player(uuid) from public, anon, authenticated;
grant execute on function game_private.is_approved_player(uuid) to dilli_judge_progress;
