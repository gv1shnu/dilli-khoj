begin;
select plan(13);

select is(
  jsonb_array_length(game_private.get_judge_manifest(6, '2026-09-03.1') -> 'cases'),
  3,
  'Ruin 06 has one visible and two hidden cases'
);

select is(
  game_private.get_judge_manifest(6, '2026-09-03.1') -> 'allowedTables',
  '["stalls"]'::jsonb,
  'Ruin 06 exposes only stalls'
);

select ok(
  has_schema_privilege('dilli_judge_executor', 'fixture_r06_visible', 'usage'),
  'executor can enter fixture schema'
);

select ok(
  has_table_privilege('dilli_judge_executor', 'fixture_r06_visible.stalls', 'select'),
  'executor can select fixture rows'
);

select ok(
  not has_table_privilege('dilli_judge_executor', 'public.profiles', 'select'),
  'executor cannot read profiles'
);

select ok(
  has_function_privilege(
    'dilli_judge_progress',
    'game_private.prepare_judge_submission(uuid,uuid,smallint,text,text)',
    'execute'
  ),
  'progress role can call fixed preparation function'
);

select ok(
  not has_function_privilege(
    'dilli_judge_executor',
    'game_private.get_judge_manifest(smallint,text)',
    'execute'
  ),
  'executor cannot read hidden expected answers'
);

select is(
  (select jsonb_agg(stall_id order by stall_id)
   from fixture_r06_visible.stalls
   where ward_code = 'K-7' and status = 'open'),
  '[102, 107]'::jsonb,
  'visible fixture has expected answer'
);

select is(
  (select jsonb_agg(stall_id order by stall_id)
   from fixture_r06_hidden_a.stalls
   where ward_code = 'K-7' and status = 'open'),
  '[4, 11]'::jsonb,
  'hidden A changes the answer'
);

select is(
  (select jsonb_agg(stall_id order by stall_id)
   from fixture_r06_hidden_b.stalls
   where ward_code = 'K-7' and status = 'open'),
  '[33, 34]'::jsonb,
  'hidden B includes zero-value and case traps'
);

select isnt(
  (select jsonb_agg(stall_id order by stall_id)
   from fixture_r06_visible.stalls
   where status = 'open'),
  '[102, 107]'::jsonb,
  'missing ward filter fails'
);

select isnt(
  (select jsonb_agg(stall_id order by stall_id)
   from fixture_r06_hidden_b.stalls
   where ward_code = 'K-7' and lower(status) = 'open'),
  '[33, 34]'::jsonb,
  'case-insensitive status near miss fails hidden B'
);

select isnt(
  (select jsonb_agg(stall_id order by stall_id)
   from fixture_r06_hidden_a.stalls
   where stall_id in (102, 107)),
  '[4, 11]'::jsonb,
  'hard-coded visible answer fails hidden A'
);

select * from finish();
rollback;
