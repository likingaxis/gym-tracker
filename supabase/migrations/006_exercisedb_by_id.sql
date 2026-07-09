-- v0.8.1: ExerciseDB by ID only
-- Adds metadata fields used to distinguish GIFs resolved by an explicit ExerciseDB id
-- from manual media URLs or missing/invalid ids.

alter table exercises
add column if not exists exercise_db_confidence text,
add column if not exists exercise_db_match_status text;

create index if not exists idx_exercises_exercise_db_match_status
on exercises(exercise_db_match_status);
