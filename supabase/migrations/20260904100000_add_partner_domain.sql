-- Add partner.example as an approved player domain (owner decision, 2026-09-04).
--
-- Any @partner.example Google account may now sign in and play, in addition to the
-- university domains and the explicit admin allowlist.
--
-- REQUIRES on the Google side: the OAuth app audience must be **External** (and
-- published), otherwise Google blocks non-university-org accounts before this hook runs.
-- See docs/setup-supabase-google.md.

create or replace function public.hook_restrict_dilli_khoj_signup(event jsonb)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  signup_email text := lower(event -> 'user' ->> 'email');
  signup_domain text := split_part(signup_email, '@', 2);
  signup_provider text := lower(event -> 'user' -> 'app_metadata' ->> 'provider');
begin
  if signup_provider = 'google'
    and (
      signup_domain in ('example.edu', 'students.example.edu', 'partner.example')
      or exists (select 1 from game_private.admin_emails a where a.email = signup_email)
    )
  then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 403,
      'message', 'Use an approved Example University or Partner School Google account.'
    )
  );
end;
$$;

grant execute on function public.hook_restrict_dilli_khoj_signup(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_restrict_dilli_khoj_signup(jsonb) from public, anon, authenticated;
