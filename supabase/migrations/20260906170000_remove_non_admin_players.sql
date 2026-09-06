-- One-time reset before rollout: remove every player except the admin allowlist.
--
-- Deleting a non-admin profile cascades to that player's ruin progress, submission
-- attempts, submission leases, request logs and revisit records (every child table
-- references public.profiles with ON DELETE CASCADE). Auth accounts in auth.users
-- are intentionally left intact, so a removed player simply receives a fresh profile
-- (at the standard starting XP) if they ever sign in again. Admin profiles and their
-- XP/progress are untouched.
--
-- On a fresh database this runs against an empty profiles table and is a no-op.
delete from public.profiles
where lower(email) not in (
  select lower(email) from game_private.admin_emails
);
