alter table exercises
  add column if not exists group_type text,
  add column if not exists group_id text,
  add column if not exists group_order integer;

alter table exercises
  drop constraint if exists exercises_group_type_check;

alter table exercises
  add constraint exercises_group_type_check
  check (group_type is null or group_type in ('superset', 'jumpset', 'triset', 'circuit'));

-- Backfill "Scheda Luca - Imperium Servant 2026-09" (id = 0ad754de-bd7d-4976-ab29-ab435688688d)
update exercises set sets = 5, reps = '10-8-6-4'
where id = '5ee5b40b-e125-473e-8923-af3957d99d29';

update exercises set group_type = 'superset', group_id = 'A', group_order = 1, rest_seconds = 0
where id = '3b8e86df-1cae-4cb5-9498-fa9ee689c8a9';

update exercises set group_type = 'superset', group_id = 'A', group_order = 2, rest_seconds = 60
where id = 'c6d55085-d000-4b73-8807-4b451a2f09b7';

update exercises set group_type = 'jumpset', group_id = 'B', group_order = 1, rest_seconds = 30
where id = '730b9790-ad3a-4540-b031-3823c48c7094';

update exercises set group_type = 'jumpset', group_id = 'B', group_order = 2, rest_seconds = 80
where id = '9f83e225-fa0a-4e9c-a00f-703cd9962154';

update exercises set group_type = 'superset', group_id = 'A', group_order = 1, rest_seconds = 0
where id = '2dc81640-d845-445f-b27f-b1d4d3f00acd';

update exercises set group_type = 'superset', group_id = 'A', group_order = 2, rest_seconds = 60
where id = '03499389-1888-4807-a774-bc8054aabf66';

update exercises set group_type = 'superset', group_id = 'B', group_order = 1, rest_seconds = 0
where id = '3d86c632-4097-4a2d-9f35-86483ac1977e';

update exercises set group_type = 'superset', group_id = 'B', group_order = 2, rest_seconds = 50
where id = 'a3cf56f1-bf78-4eb2-992f-b36fa4a6eac8';
