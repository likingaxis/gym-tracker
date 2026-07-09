import { normalizeWorkoutPlanJson } from "@/lib/import/cleanWorkoutPlan";
import { workoutPlanImportSchema } from "@/lib/validation/workoutPlanSchema";

export function parseWorkoutPlanJson(rawText: string) {
  let json: unknown;

  try {
    json = JSON.parse(rawText);
  } catch (error) {
    const message = error instanceof Error ? error.message : "JSON non valido";
    return {
      success: false as const,
      errors: [{ path: "file", message: `JSON non valido: ${message}` }],
      warnings: [] as { path: string; message: string }[]
    };
  }

  const normalized = normalizeWorkoutPlanJson(json);

  if (normalized.errors.length > 0) {
    return {
      success: false as const,
      errors: normalized.errors,
      warnings: normalized.warnings
    };
  }

  const result = workoutPlanImportSchema.safeParse(normalized.data);

  if (!result.success) {
    return {
      success: false as const,
      errors: result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      })),
      warnings: normalized.warnings
    };
  }

  return {
    success: true as const,
    data: result.data,
    warnings: normalized.warnings
  };
}
