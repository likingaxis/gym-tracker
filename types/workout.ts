export type WorkoutPlanImport = {
  name: string;
  month: string;
  start_date?: string;
  end_date?: string;
  days: WorkoutDayImport[];
};

export type WorkoutDayImport = {
  name: string;
  order: number;
  description?: string;
  exercises: ExerciseImport[];
};

export type ExerciseImport = {
  order: number;
  name: string;
  exercise_db_query?: string;
  exercise_db_id?: string;
  exercise_db_name?: string;
  exercise_db_confidence?: string;
  exercise_db_match_status?: string;
  exercise_db_match_score?: number;
  exercise_db_raw?: unknown;
  target_rpe?: string;
  muscle_group?: string;
  sets?: number;
  reps?: string;
  rest_seconds?: number;
  suggested_weight?: string;
  technique_notes?: string;
  tips?: string;
  video_url?: string;
  media_url?: string;
  trainer_notes?: string;
};

export type Exercise = ExerciseImport & { id: string; workout_day_id: string };
export type WorkoutDay = WorkoutDayImport & { id: string; workout_plan_id: string };
