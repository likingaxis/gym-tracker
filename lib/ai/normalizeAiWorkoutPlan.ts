import { normalizeWorkoutPlanJson } from "@/lib/import/cleanWorkoutPlan";
import { workoutPlanImportSchema } from "@/lib/validation/workoutPlanSchema";
import { findExerciseDbMatch } from "@/lib/ai/matchExerciseDb";

type AiWarning = { path: string; message: string };
type AiError = { path: string; message: string };

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function currentMonth() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
}

function positiveNumber(value: unknown, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function ensureRequiredShape(input: unknown) {
  if (!isRecord(input)) return input;

  const month = currentMonth();
  const plan: Record<string, any> = {
    name: input.name || `Scheda ${month}`,
    month: input.month || month,
    start_date: input.start_date ?? "",
    end_date: input.end_date ?? "",
    days: Array.isArray(input.days) ? input.days : [],
  };

  plan.days = plan.days.map((day: any, dayIndex: number) => ({
    name: day?.name || `Giorno ${dayIndex + 1}`,
    order: positiveNumber(day?.order, dayIndex + 1),
    description: day?.description ?? "",
    exercises: Array.isArray(day?.exercises) ? day.exercises.map((exercise: any, exerciseIndex: number) => ({
      order: positiveNumber(exercise?.order, exerciseIndex + 1),
      name: exercise?.name || `Esercizio ${exerciseIndex + 1}`,
      exercise_db_query: exercise?.exercise_db_query ?? "",
      exercise_db_id: "",
      exercise_db_name: "",
      exercise_db_confidence: "",
      muscle_group: exercise?.muscle_group ?? "",
      sets: positiveNumber(exercise?.sets, 1),
      reps: String(exercise?.reps ?? ""),
      rest_seconds: positiveNumber(exercise?.rest_seconds, 90),
      target_rpe: exercise?.target_rpe ?? "",
      suggested_weight: exercise?.suggested_weight ?? "",
      technique_notes: exercise?.technique_notes ?? "",
      tips: exercise?.tips ?? "",
      video_url: exercise?.video_url ?? "",
      media_url: "",
      trainer_notes: exercise?.trainer_notes ?? "",
      alternative_queries: exercise?.alternative_queries,
      equipment_hint: exercise?.equipment_hint,
      target_muscle_hint: exercise?.target_muscle_hint,
      body_part_hint: exercise?.body_part_hint,
      movement_pattern: exercise?.movement_pattern,
    })) : [],
  }));

  return plan;
}

function formatCandidateReason(matchName: string, confidence: string) {
  if (confidence === "medium") {
    return `Possibile match ExerciseDB da controllare: ${matchName}. La GIF non e' stata applicata automaticamente.`;
  }
  return "Nessuna corrispondenza sicura trovata nel catalogo ExerciseDB.";
}

function applyExerciseDbMatches(plan: any, warnings: AiWarning[]) {
  if (!isRecord(plan) || !Array.isArray(plan.days)) return plan;

  plan.days.forEach((day: any, dayIndex: number) => {
    if (!Array.isArray(day.exercises)) return;

    day.exercises.forEach((exercise: any, exerciseIndex: number) => {
      const result = findExerciseDbMatch(exercise);
      const path = `days.${dayIndex}.exercises.${exerciseIndex}`;
      const bestCandidate = result.candidates[0];

      if (result.item) {
        exercise.exercise_db_id = result.item.exercise_db_id;
        exercise.exercise_db_name = result.item.name;
        exercise.exercise_db_confidence = "high";
        exercise.media_url = result.item.gifUrl;
        return;
      }

      exercise.exercise_db_id = "";
      exercise.media_url = "";
      exercise.exercise_db_name = bestCandidate?.name ?? "";
      exercise.exercise_db_confidence = result.confidence === "medium" ? "medium" : "low";

      warnings.push({
        path,
        message: bestCandidate
          ? `${exercise.name || "Esercizio"}: ${formatCandidateReason(bestCandidate.name, result.confidence)}`
          : `${exercise.name || "Esercizio"}: nessun candidato ExerciseDB rilevante trovato.`,
      });
    });
  });

  return plan;
}

export function normalizeAndValidateAiWorkoutPlan(input: unknown) {
  const warnings: AiWarning[] = [];
  const errors: AiError[] = [];

  const shaped = ensureRequiredShape(input);
  const matched = applyExerciseDbMatches(shaped, warnings);
  const cleaned = normalizeWorkoutPlanJson(matched);
  warnings.push(...cleaned.warnings);
  errors.push(...cleaned.errors);

  if (errors.length > 0) {
    return { success: false as const, errors, warnings, plan: null };
  }

  const parsed = workoutPlanImportSchema.safeParse(cleaned.data);
  if (!parsed.success) {
    return {
      success: false as const,
      plan: null,
      warnings,
      errors: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    };
  }

  return { success: true as const, plan: parsed.data, warnings, errors: [] };
}
