-- Admin allowlist.
--
-- Specific admin emails may sign in (and therefore play) even if their domain is not
-- one of the approved student domains. This lets the maintainer/team in WITHOUT opening
-- a whole extra domain to every one of its users. Kept in sync with the client
-- allowlist in src/game/admins.ts.
--
-- NOTE: Google's OAuth audience still applies first. If the Google app is "Internal"
-- to the university Workspace org, a different-org email (e.g. @partner.example) is
-- rejected by Google before this hook runs; that admin should sign in with their
-- approved-domain account instead. Allowing the email here is harmless in that case.

create table if not exists game_private.admin_emails (
  email text primary key
);

insert into game_private.admin_emails (email) values
  ('former.admin@example.edu'),
  ('staff.admin@partner.example')
on conflict (email) do nothing;

revoke all on game_private.admin_emails from public, anon, authenticated;
-- The signup hook runs as supabase_auth_admin (security invoker), so that role needs
-- to read the allowlist.
grant usage on schema game_private to supabase_auth_admin;
grant select on game_private.admin_emails to supabase_auth_admin;

-- Allow an approved student domain OR an explicit admin email.
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
      signup_domain in ('example.edu', 'students.example.edu')
      or exists (select 1 from game_private.admin_emails a where a.email = signup_email)
    )
  then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 403,
      'message', 'Use an approved Example University Google account.'
    )
  );
end;
$$;

grant execute on function public.hook_restrict_dilli_khoj_signup(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_restrict_dilli_khoj_signup(jsonb) from public, anon, authenticated;
