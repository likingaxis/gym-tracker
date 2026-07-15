export type SessionStatus = "in_progress" | "paused" | "completed" | "abandoned";

export type SessionExerciseDraft = {
  exercise_id: string;
  completed: boolean;
  actual_sets?: number;
  actual_reps?: string;
  actual_weight?: string;
  rpe?: number;
  personal_notes?: string;
};
