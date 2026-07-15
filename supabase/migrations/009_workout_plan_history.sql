-- v0.25.0: più schede nel tempo, archivio schede e snapshot storico

alter table public.workout_plans
  add column if not exists status text not null default 'active',
  add column if not exists color text,
  add column if not exists archived_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.workout_plans
  drop constraint if exists workout_plans_status_check;

alter table public.workout_plans
  add constraint workout_plans_status_check
  check (status in ('active', 'archived', 'draft', 'deleted'));

update public.workout_plans
set status = case when is_active then 'active' else 'archived' end,
    archived_at = case when is_active then null else coalesce(archived_at, created_at, now()) end;

with ranked as (
  select
    id,
    row_number() over (
      partition by profile_id
      order by is_active desc, created_at desc, id
    ) as rn
  from public.workout_plans
)
update public.workout_plans wp
set is_active = ranked.rn = 1,
    status = case when ranked.rn = 1 then 'active' else 'archived' end,
    archived_at = case when ranked.rn = 1 then null else coalesce(wp.archived_at, wp.created_at, now()) end
from ranked
where wp.id = ranked.id;

with palette as (
  select
    id,
    ((row_number() over (partition by profile_id order by created_at, id) - 1) % 8) as color_index
  from public.workout_plans
  where color is null
)
update public.workout_plans wp
set color = case palette.color_index
  when 0 then 'lime'
  when 1 then 'sky'
  when 2 then 'violet'
  when 3 then 'amber'
  when 4 then 'rose'
  when 5 then 'emerald'
  when 6 then 'cyan'
  else 'orange'
end
from palette
where wp.id = palette.id;

alter table public.workout_sessions
  add column if not exists workout_plan_name_snapshot text,
  add column if not exists workout_day_name_snapshot text,
  add column if not exists workout_plan_color_snapshot text;

update public.workout_sessions ws
set workout_plan_name_snapshot = coalesce(ws.workout_plan_name_snapshot, wp.name),
    workout_day_name_snapshot = coalesce(ws.workout_day_name_snapshot, wd.name),
    workout_plan_color_snapshot = coalesce(ws.workout_plan_color_snapshot, wp.color)
from public.workout_plans wp,
     public.workout_days wd
where ws.workout_plan_id = wp.id
  and ws.workout_day_id = wd.id;

create index if not exists idx_workout_plans_profile_status on public.workout_plans(profile_id, status);
create index if not exists idx_workout_plans_profile_active on public.workout_plans(profile_id, is_active);
create index if not exists idx_sessions_plan_snapshot on public.workout_sessions(workout_plan_id, workout_plan_name_snapshot);
