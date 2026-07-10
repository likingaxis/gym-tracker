import { normalizeWorkoutPlanJson } from "@/lib/import/cleanWorkoutPlan";
import { workoutPlanImportSchema } from "@/lib/validation/workoutPlanSchema";
import { findExerciseDbMatch, type ExerciseDbCandidate } from "@/lib/ai/matchExerciseDb";

type AiWarning = { path: string; message: string };
type AiError = { path: string; message: string };

type CandidateSelectionRequest = {
  key: string;
  exercise: Record<string, any>;
  candidates: ExerciseDbCandidate[];
};

type CandidateSelection = {
  key: string;
  selected_exercise_db_id: string;
  confidence: "high" | "medium" | "low";
  reason: string;
};

type CandidateSelector = (requests: CandidateSelectionRequest[]) => Promise<CandidateSelection[]>;

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
      exercise_db_id: exercise?.exercise_db_id ?? "",
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
      movement_patterns: exercise?.movement_patterns,
      position_hint: exercise?.position_hint,
      grip_hint: exercise?.grip_hint,
      bench_angle_hint: exercise?.bench_angle_hint,
      side_hint: exercise?.side_hint,
      variant_hints: exercise?.variant_hints,
    })) : [],
  }));

  return plan;
}

function applyCandidate(exercise: any, candidate: ExerciseDbCandidate, confidence: "high" | "medium") {
  exercise.exercise_db_id = candidate.exercise_db_id;
  exercise.exercise_db_name = candidate.name;
  exercise.exercise_db_confidence = confidence;
  exercise.media_url = candidate.gifUrl;
}

async function applyExerciseDbMatches(plan: any, warnings: AiWarning[], selectCandidates?: CandidateSelector) {
  if (!isRecord(plan) || !Array.isArray(plan.days)) return plan;

  let unmatchedCount = 0;
  let exactCount = 0;
  let aiMatchedCount = 0;
  let candidateReviewCount = 0;
  const requests: CandidateSelectionRequest[] = [];
  const requestMap = new Map<string, { exercise: any; candidates: ExerciseDbCandidate[] }>();

  plan.days.forEach((day: any, dayIndex: number) => {
    if (!Array.isArray(day.exercises)) return;

    day.exercises.forEach((exercise: any, exerciseIndex: number) => {
      const result = findExerciseDbMatch(exercise);

      if (result.item && result.confidence === "high") {
        exercise.exercise_db_id = result.item.exercise_db_id;
        exercise.exercise_db_name = result.item.name;
        exercise.exercise_db_confidence = "high";
        exercise.media_url = result.item.gifUrl;
        exactCount += 1;
        return;
      }

      exercise.exercise_db_id = "";
      exercise.media_url = "";
      exercise.exercise_db_name = "";
      exercise.exercise_db_confidence = "low";

      if (selectCandidates && result.candidates.length > 0) {
        const key = `${dayIndex}.${exerciseIndex}`;
        const request = {
          key,
          exercise: {
            name: exercise.name,
            exercise_db_query: exercise.exercise_db_query,
            alternative_queries: exercise.alternative_queries,
            equipment_hint: exercise.equipment_hint,
            target_muscle_hint: exercise.target_muscle_hint,
            body_part_hint: exercise.body_part_hint,
            movement_pattern: exercise.movement_pattern,
            movement_patterns: exercise.movement_patterns,
            position_hint: exercise.position_hint,
            grip_hint: exercise.grip_hint,
            bench_angle_hint: exercise.bench_angle_hint,
            side_hint: exercise.side_hint,
            variant_hints: exercise.variant_hints,
          },
          candidates: result.candidates.slice(0, 8),
        };
        requests.push(request);
        requestMap.set(key, { exercise, candidates: request.candidates });
      }
    });
  });

  if (selectCandidates && requests.length > 0) {
    try {
      const selections = await selectCandidates(requests);
      const byKey = new Map(selections.map((selection) => [selection.key, selection]));

      requests.forEach((request) => {
        const selection = byKey.get(request.key);
        const stored = requestMap.get(request.key);
        if (!selection || !stored) return;

        const selectedId = selection.selected_exercise_db_id;
        const candidate = stored.candidates.find((item) => item.exercise_db_id === selectedId);

        if (candidate && selection.confidence === "high") {
          applyCandidate(stored.exercise, candidate, "high");
          aiMatchedCount += 1;
          return;
        }

        if (candidate && selection.confidence === "medium") {
          stored.exercise.exercise_db_name = candidate.name;
          stored.exercise.exercise_db_confidence = "medium";
          candidateReviewCount += 1;
        }
      });
    } catch (error) {
      warnings.push({
        path: "exercise_db",
        message: `Selezione AI dei candidati ExerciseDB non riuscita: ${error instanceof Error ? error.message : "errore sconosciuto"}.`,
      });
    }
  }

  plan.days.forEach((day: any) => {
    if (!Array.isArray(day.exercises)) return;
    day.exercises.forEach((exercise: any) => {
      if (!String(exercise?.exercise_db_id ?? "").trim() && !String(exercise?.media_url ?? "").trim()) {
        unmatchedCount += 1;
      }
    });
  });

  if (exactCount > 0 || aiMatchedCount > 0) {
    warnings.push({
      path: "exercise_db",
      message: `${exactCount + aiMatchedCount} GIF applicate dal catalogo ExerciseDB dopo validazione backend.`,
    });
  }

  if (candidateReviewCount > 0) {
    warnings.push({
      path: "exercise_db",
      message: `${candidateReviewCount} esercizi hanno un candidato simile ma non abbastanza sicuro: non ho applicato la GIF automaticamente.`,
    });
  }

  if (unmatchedCount > 0) {
    warnings.push({
      path: "exercise_db",
      message: `${unmatchedCount} esercizi sono rimasti senza GIF automatica. In v0.23.6 Gemini usa il vocabolario controllato e il backend applica solo scelte high-confidence tra candidati reali.`,
    });
  }

  return plan;
}

export async function normalizeAndValidateAiWorkoutPlan(input: unknown, selectCandidates?: CandidateSelector) {
  const warnings: AiWarning[] = [];
  const errors: AiError[] = [];

  const shaped = ensureRequiredShape(input);
  const matched = await applyExerciseDbMatches(shaped, warnings, selectCandidates);
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
