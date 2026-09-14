-- Reassign administrator (owner decision, 2026-09-14).
--
-- Move admin identity to the maintainer's personal Google account and demote the
-- former admin to an ordinary player. Admin identity is defined solely by membership
-- in game_private.admin_emails; game_state() computes isAdmin from this table, so a
-- single insert/delete here is the whole change.
--
-- Adding admin@example.com also lets that account sign in even though gmail.com is
-- not an approved student domain: the before-user-created hook admits any email in this
-- allowlist. The former admin (former.admin@example.edu) keeps normal player access
-- because example.edu is still an approved domain; their profile, XP and progress
-- are untouched -- only the isAdmin flag flips off.

insert into game_private.admin_emails (email) values
  ('admin@example.com')
on conflict (email) do nothing;

delete from game_private.admin_emails
where email = 'former.admin@example.edu';
