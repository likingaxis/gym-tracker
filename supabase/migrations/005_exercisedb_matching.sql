-- v0.8 ExerciseDB: matching GIF automatico in fase di import
alter table exercises
add column if not exists exercise_db_query text,
add column if not exists exercise_db_id text,
add column if not exists exercise_db_name text,
add column if not exists exercise_db_match_score integer,
add column if not exists exercise_db_raw jsonb;

create index if not exists idx_exercises_exercise_db_id on exercises(exercise_db_id);
create index if not exists idx_exercises_exercise_db_query on exercises(exercise_db_query);
