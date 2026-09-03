-- Ruin 06 visible and hidden cases. These schemas are never exposed through
-- PostgREST. A future judge_executor role receives SELECT-only grants.

create schema if not exists fixture_r06_visible;
create schema if not exists fixture_r06_hidden_a;
create schema if not exists fixture_r06_hidden_b;

revoke all on schema fixture_r06_visible from public, anon, authenticated;
revoke all on schema fixture_r06_hidden_a from public, anon, authenticated;
revoke all on schema fixture_r06_hidden_b from public, anon, authenticated;

create table fixture_r06_visible.stalls (
  stall_id integer primary key,
  stall_name text not null,
  ward_code text not null,
  status text,
  daily_rations integer not null check (daily_rations >= 0)
);

insert into fixture_r06_visible.stalls values
  (101, 'Copper Kettle', 'K-7', 'closed', 0),
  (102, 'Moonlight Grain', 'K-7', 'open', 28),
  (103, 'Red Fort Repairs', 'K-4', 'open', 12),
  (104, 'Old Clock Spices', 'K-7', null, 7),
  (105, 'Yamuna Filters', 'K-9', 'open', 19),
  (107, 'Paranthe Power', 'K-7', 'open', 31);

create table fixture_r06_hidden_a.stalls
(like fixture_r06_visible.stalls including all);

insert into fixture_r06_hidden_a.stalls values
  (2, 'Silent Loom', 'K-7', 'closed', 2),
  (4, 'Battery Bazaar', 'K-7', 'open', 14),
  (7, 'North Gate Grain', 'K-8', 'open', 20),
  (9, 'Paper Lantern', 'K-7', null, 5),
  (11, 'Cycle Dynamo', 'K-7', 'open', 8);

create table fixture_r06_hidden_b.stalls
(like fixture_r06_visible.stalls including all);

insert into fixture_r06_hidden_b.stalls values
  (31, 'Dry Well Tools', 'K-2', 'open', 4),
  (32, 'Archive Ink', 'K-7', 'closed', 6),
  (33, 'Glass Compass', 'K-7', 'open', 1),
  (34, 'Radio Thread', 'K-7', 'open', 0),
  (35, 'West Wall Tea', 'K-7', 'OPEN', 9);

insert into game_private.question_cases (
  ruin_id,
  case_id,
  fixture_schema,
  dataset_version,
  hidden,
  comparison,
  expected_columns,
  expected_rows
) values
  (6, 'visible', 'fixture_r06_visible', '2026-09-03.1', false, 'ordered', '["stall_id"]', '[[102], [107]]'),
  (6, 'hidden-a', 'fixture_r06_hidden_a', '2026-09-03.1', true, 'ordered', '["stall_id"]', '[[4], [11]]'),
  (6, 'hidden-b', 'fixture_r06_hidden_b', '2026-09-03.1', true, 'ordered', '["stall_id"]', '[[33], [34]]');

analyze fixture_r06_visible.stalls;
analyze fixture_r06_hidden_a.stalls;
analyze fixture_r06_hidden_b.stalls;

revoke all on all tables in schema fixture_r06_visible from public, anon, authenticated;
revoke all on all tables in schema fixture_r06_hidden_a from public, anon, authenticated;
revoke all on all tables in schema fixture_r06_hidden_b from public, anon, authenticated;
