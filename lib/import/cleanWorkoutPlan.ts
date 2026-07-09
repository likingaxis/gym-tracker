type ImportError = { path: string; message: string };
type ImportWarning = { path: string; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  let text = String(value).trim();
  if (!text) return undefined;

  // Keep the visible label from complete Markdown links, then remove broken
  // Markdown fragments that ChatGPT can accidentally paste inside JSON fields.
  text = text.replace(/\[([^\]]+)]\(https?:\/\/[^)]*\)/gi, "$1");
  text = text.replace(/\]\(https?:\/\/[^)]*\)/gi, " ");
  text = text.replace(/\[https?:\/\/[^\s\])"]+/gi, " ");
  text = text.replace(/https?:\/\/[^\s\])"]+/gi, " ");
  text = text.replace(/%22|%7B|%7D|%5B|%5D|%2C|%3A|%20/gi, " ");
  text = text.replace(/[{}[\]"]/g, " ");
  text = text.replace(/\s+/g, " ").trim();
  return text || undefined;
}

function cleanUrl(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  if (!text) return undefined;

  const match = text.match(/https?:\/\/[^\s\]")]+/i);
  if (!match) return undefined;

  return match[0].replace(/[.,;]+$/g, "");
}

function cleanDate(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  if (!text) return undefined;
  return text;
}

function cleanNumber(value: unknown): unknown {
  if (value === null || value === undefined || value === "") return undefined;
  return value;
}

function addWarning(warnings: ImportWarning[], path: string, before: unknown, after: unknown, label: string) {
  if (before === after) return;
  const beforeText = before === undefined || before === null ? "" : String(before).trim();
  const afterText = after === undefined || after === null ? "" : String(after).trim();
  if (beforeText !== afterText) {
    warnings.push({ path, message: `${label}: valore ripulito automaticamente.` });
  }
}

export function normalizeWorkoutPlanJson(input: unknown): {
  data: unknown;
  warnings: ImportWarning[];
  errors: ImportError[];
} {
  const warnings: ImportWarning[] = [];
  const errors: ImportError[] = [];

  if (!isRecord(input)) {
    return {
      data: input,
      warnings,
      errors: [{ path: "file", message: "Il JSON deve contenere un oggetto principale." }]
    };
  }

  const normalized: Record<string, unknown> = {
    name: cleanText(input.name),
    month: cleanText(input.month),
    start_date: cleanDate(input.start_date),
    end_date: cleanDate(input.end_date),
    days: []
  };

  addWarning(warnings, "start_date", input.start_date, normalized.start_date, "Data inizio");
  addWarning(warnings, "end_date", input.end_date, normalized.end_date, "Data fine");

  const rawDays = Array.isArray(input.days) ? input.days : [];
  normalized.days = rawDays.map((rawDay, dayIndex) => {
    if (!isRecord(rawDay)) return rawDay;

    const dayPath = `days.${dayIndex}`;
    const day = {
      name: cleanText(rawDay.name),
      order: cleanNumber(rawDay.order),
      description: cleanText(rawDay.description) ?? "",
      exercises: [] as unknown[]
    };

    addWarning(warnings, `${dayPath}.name`, rawDay.name, day.name, "Nome giorno");
    addWarning(warnings, `${dayPath}.description`, rawDay.description, day.description, "Descrizione giorno");

    const rawExercises = Array.isArray(rawDay.exercises) ? rawDay.exercises : [];
    day.exercises = rawExercises.map((rawExercise, exerciseIndex) => {
      if (!isRecord(rawExercise)) return rawExercise;

      const exercisePath = `${dayPath}.exercises.${exerciseIndex}`;
      const exercise = {
        order: cleanNumber(rawExercise.order),
        name: cleanText(rawExercise.name),
        exercise_db_query: cleanText(rawExercise.exercise_db_query) ?? "",
        exercise_db_id: cleanText(rawExercise.exercise_db_id) ?? "",
        exercise_db_name: cleanText(rawExercise.exercise_db_name) ?? "",
        exercise_db_confidence: cleanText(rawExercise.exercise_db_confidence) ?? "",
        muscle_group: cleanText(rawExercise.muscle_group) ?? "",
        sets: cleanNumber(rawExercise.sets),
        reps: cleanText(rawExercise.reps) ?? "",
        rest_seconds: cleanNumber(rawExercise.rest_seconds) ?? 90,
        target_rpe: cleanText(rawExercise.target_rpe) ?? "",
        suggested_weight: cleanText(rawExercise.suggested_weight) ?? "",
        technique_notes: cleanText(rawExercise.technique_notes) ?? "",
        tips: cleanText(rawExercise.tips) ?? "",
        video_url: cleanUrl(rawExercise.video_url),
        media_url: cleanUrl(rawExercise.media_url),
        trainer_notes: cleanText(rawExercise.trainer_notes) ?? ""
      };

      addWarning(warnings, `${exercisePath}.name`, rawExercise.name, exercise.name, "Nome esercizio");
      addWarning(warnings, `${exercisePath}.exercise_db_query`, rawExercise.exercise_db_query, exercise.exercise_db_query, "Query ExerciseDB");
      addWarning(warnings, `${exercisePath}.exercise_db_id`, rawExercise.exercise_db_id, exercise.exercise_db_id, "ID ExerciseDB");
      addWarning(warnings, `${exercisePath}.exercise_db_name`, rawExercise.exercise_db_name, exercise.exercise_db_name, "Nome ExerciseDB");
      addWarning(warnings, `${exercisePath}.exercise_db_confidence`, rawExercise.exercise_db_confidence, exercise.exercise_db_confidence, "Confidenza ExerciseDB");
      addWarning(warnings, `${exercisePath}.target_rpe`, rawExercise.target_rpe, exercise.target_rpe, "RPE target");
      addWarning(warnings, `${exercisePath}.media_url`, rawExercise.media_url, exercise.media_url, "Link media");
      addWarning(warnings, `${exercisePath}.video_url`, rawExercise.video_url, exercise.video_url, "Link video");
      addWarning(warnings, `${exercisePath}.trainer_notes`, rawExercise.trainer_notes, exercise.trainer_notes, "Note trainer");
      addWarning(warnings, `${exercisePath}.rest_seconds`, rawExercise.rest_seconds, exercise.rest_seconds, "Recupero");

      return exercise;
    });

    return day;
  });

  return { data: normalized, warnings, errors };
}
