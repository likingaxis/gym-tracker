create extension if not exists pgcrypto;

create table if not exists workout_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  month text not null,
  start_date date,
  end_date date,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists workout_days (
  id uuid primary key default gen_random_uuid(),
  workout_plan_id uuid not null references workout_plans(id) on delete cascade,
  name text not null,
  day_order integer not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists exercises (
  id uuid primary key default gen_random_uuid(),
  workout_day_id uuid not null references workout_days(id) on delete cascade,
  exercise_order integer not null,
  name text not null,
  exercise_db_query text,
  exercise_db_id text,
  exercise_db_name text,
  exercise_db_confidence text,
  exercise_db_match_status text,
  exercise_db_match_score integer,
  exercise_db_raw jsonb,
  muscle_group text,
  target_rpe text,
  sets integer,
  reps text,
  rest_seconds integer,
  suggested_weight text,
  technique_notes text,
  tips text,
  video_url text,
  media_url text,
  trainer_notes text,
  created_at timestamptz not null default now()
);

create table if not exists workout_sessions (
  id uuid primary key default gen_random_uuid(),
  workout_plan_id uuid not null references workout_plans(id) on delete cascade,
  workout_day_id uuid not null references workout_days(id) on delete cascade,
  date date not null default current_date,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'in_progress',
  general_notes text,
  created_at timestamptz not null default now(),
  constraint workout_sessions_status_check check (status in ('in_progress', 'completed', 'abandoned'))
);

create table if not exists session_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_session_id uuid not null references workout_sessions(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  completed boolean not null default false,
  actual_sets integer,
  actual_reps text,
  actual_weight text,
  rpe integer,
  personal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint session_exercises_rpe_check check (rpe is null or (rpe >= 1 and rpe <= 10))
);

create table if not exists exercise_sets (
  id uuid primary key default gen_random_uuid(),
  session_exercise_id uuid not null references session_exercises(id) on delete cascade,
  set_number integer not null,
  reps text,
  weight text,
  weight_source text not null default 'empty',
  rpe integer,
  completed boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  constraint exercise_sets_unique_set unique (session_exercise_id, set_number),
  constraint exercise_sets_rpe_check check (rpe is null or (rpe >= 1 and rpe <= 10))
);

create index if not exists idx_workout_days_plan_id on workout_days(workout_plan_id);
create index if not exists idx_exercises_day_id on exercises(workout_day_id);
create index if not exists idx_exercises_exercise_db_id on exercises(exercise_db_id);
create index if not exists idx_exercises_exercise_db_query on exercises(exercise_db_query);
create index if not exists idx_sessions_plan_id on workout_sessions(workout_plan_id);
create index if not exists idx_sessions_day_id on workout_sessions(workout_day_id);
create index if not exists idx_session_exercises_session_id on session_exercises(workout_session_id);

create index if not exists idx_exercise_sets_session_exercise_id on exercise_sets(session_exercise_id);

-- v0.7 profili utenti stile Netflix
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
