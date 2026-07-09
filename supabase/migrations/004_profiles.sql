create table if not exists app_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  avatar_emoji text,
  color text,
  pin_enabled boolean not null default false,
  pin_hash text,
  created_at timestamptz not null default now()
);

alter table workout_plans
add column if not exists profile_id uuid references app_profiles(id) on delete cascade;

alter table workout_sessions
add column if not exists profile_id uuid references app_profiles(id) on delete cascade;

create index if not exists idx_workout_plans_profile_id on workout_plans(profile_id);
create index if not exists idx_workout_sessions_profile_id on workout_sessions(profile_id);
