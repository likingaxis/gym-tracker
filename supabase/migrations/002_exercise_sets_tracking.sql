alter table exercise_sets
add column if not exists rpe integer;

do $$
begin
  alter table exercise_sets
  add constraint exercise_sets_unique_set unique (session_exercise_id, set_number);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table exercise_sets
  add constraint exercise_sets_rpe_check check (rpe is null or (rpe >= 1 and rpe <= 10));
exception
  when duplicate_object then null;
end $$;

create index if not exists idx_exercise_sets_session_exercise_id on exercise_sets(session_exercise_id);
