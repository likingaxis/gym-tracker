import { z } from "zod";

const emptyToUndefined = (value: unknown) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
};

const optionalText = z.preprocess(emptyToUndefined, z.string().trim().optional());

const optionalDate = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La data deve essere in formato YYYY-MM-DD")
    .optional()
);

const optionalUrl = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .refine((value) => /^https?:\/\//i.test(value), "Il link deve iniziare con http:// o https://")
    .optional()
);

const positiveInt = z.preprocess(
  emptyToUndefined,
  z.coerce.number().int("Deve essere un numero intero").positive("Deve essere maggiore di zero").optional()
);

export const exerciseImportSchema = z.object({
  order: z.coerce.number().int().positive(),
  name: z.string().trim().min(1, "Nome esercizio obbligatorio"),
  exercise_db_query: optionalText,
  exercise_db_id: optionalText,
  exercise_db_name: optionalText,
  exercise_db_confidence: optionalText,
  target_rpe: optionalText,
  muscle_group: optionalText,
  sets: positiveInt,
  reps: optionalText,
  rest_seconds: positiveInt.default(90),
  suggested_weight: optionalText,
  technique_notes: optionalText,
  tips: optionalText,
  video_url: optionalUrl,
  media_url: optionalUrl,
  trainer_notes: optionalText
});

export const workoutDayImportSchema = z.object({
  name: z.string().trim().min(1, "Nome giorno obbligatorio"),
  order: z.coerce.number().int().positive(),
  description: optionalText,
  exercises: z.array(exerciseImportSchema).min(1, "Ogni giorno deve avere almeno un esercizio")
});

export const workoutPlanImportSchema = z.object({
  name: z.string().trim().min(1, "Nome scheda obbligatorio"),
  month: z.string().trim().regex(/^\d{4}-\d{2}$/, "Il mese deve essere in formato YYYY-MM"),
  start_date: optionalDate,
  end_date: optionalDate,
  days: z.array(workoutDayImportSchema).min(1, "La scheda deve avere almeno un giorno")
});

export type WorkoutPlanImportInput = z.infer<typeof workoutPlanImportSchema>;
