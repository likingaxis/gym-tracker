-- v0.25.2: cestino sessioni e pausa/riprendi allenamento

alter table public.workout_sessions
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_reason text,
  add column if not exists paused_at timestamptz,
  add column if not exists total_paused_seconds integer not null default 0;

alter table public.workout_sessions
  drop constraint if exists workout_sessions_status_check;

alter table public.workout_sessions
  add constraint workout_sessions_status_check
  check (status in ('in_progress', 'paused', 'completed', 'abandoned'));

update public.workout_sessions
set total_paused_seconds = 0
where total_paused_seconds is null;

create index if not exists idx_workout_sessions_profile_deleted
  on public.workout_sessions(profile_id, deleted_at);

create index if not exists idx_workout_sessions_profile_status_deleted
  on public.workout_sessions(profile_id, status, deleted_at);
