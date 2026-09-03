begin;
select plan(7);

select has_table('public', 'profiles', 'profiles exists');
select has_table('public', 'ruin_progress', 'ruin_progress exists');
select has_table('game_private', 'submission_attempts', 'private attempts exist');
select is(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  true,
  'profiles has RLS enabled'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.ruin_progress'::regclass),
  true,
  'ruin_progress has RLS enabled'
);

select is(
  public.hook_restrict_dilli_khoj_signup(
    '{"user":{"email":"student@example.edu","app_metadata":{"provider":"google"}}}'::jsonb
  ),
  '{}'::jsonb,
  'approved Google domain is accepted'
);

select is(
  public.hook_restrict_dilli_khoj_signup(
    '{"user":{"email":"student@gmail.com","app_metadata":{"provider":"google"}}}'::jsonb
  ) -> 'error' ->> 'http_code',
  '403',
  'unapproved domain is rejected'
);

select * from finish();
rollback;
