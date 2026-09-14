-- Open sign-in and gameplay to ANY Google account (owner decision, 2026-09-14).
--
-- Previously only the university/partner student domains (plus the admin allowlist)
-- could sign in and play. This drops the domain restriction: any Google-authenticated
-- account is now an approved player.
--
-- Both functions must change together. is_approved_email() gates the signup hook AND
-- game_private.is_approved_player() (used by the judge Edge Function for every
-- submission). Relaxing only the hook would let anyone sign in but still 403 them the
-- moment they try to submit an answer.
--
-- REQUIRES on the Google side: the OAuth app audience must be External and published,
-- or Google blocks non-org accounts before this hook ever runs.

-- Any well-formed email is approved. The signup hook and judge still require the
-- account to be Google-provider, email-confirmed and non-anonymous (see
-- game_private.is_approved_player), so this only removes the domain allowlist.
create or replace function game_private.is_approved_email(candidate text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(candidate ~ '^[^@[:space:]]+@[^@[:space:]]+$', false);
$$;
revoke all on function game_private.is_approved_email(text) from public, anon, authenticated;
grant execute on function game_private.is_approved_email(text) to supabase_auth_admin;

-- Signup hook: admit any Google account, with a generic rejection message for
-- non-Google providers.
create or replace function public.hook_restrict_dilli_khoj_signup(event jsonb)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if lower(event -> 'user' -> 'app_metadata' ->> 'provider') = 'google'
    and game_private.is_approved_email(event -> 'user' ->> 'email')
  then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object(
    'http_code', 403,
    'message', 'Sign in with a Google account.'
  ));
end;
$$;
revoke all on function public.hook_restrict_dilli_khoj_signup(jsonb) from public, anon, authenticated;
grant execute on function public.hook_restrict_dilli_khoj_signup(jsonb) to supabase_auth_admin;
