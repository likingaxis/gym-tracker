import { NextResponse } from "next/server";
import { buildWorkoutPlanPrompt } from "@/lib/ai/workoutPlanPrompt";
import { generateWorkoutPlanWithGemini } from "@/lib/ai/providers/gemini";
import { extractWorkoutInputFromFile, isSupportedAiImportFile } from "@/lib/ai/extractFileText";
import { parseAiJson } from "@/lib/ai/parseAiJson";
import { normalizeAndValidateAiWorkoutPlan } from "@/lib/ai/normalizeAiWorkoutPlan";
import { formatDayCount, formatExerciseCount } from "@/lib/utils/copy";
import { getExerciseDbCatalogMeta } from "@/lib/ai/exerciseDbCatalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

type ImportError = { path: string; message: string };

function errorResponse(errors: ImportError[], status = 400) {
  return NextResponse.json({ success: false, errors }, { status });
}

function createSummary(plan: any) {
  const daysCount = Array.isArray(plan?.days) ? plan.days.length : 0;
  const exercises = Array.isArray(plan?.days) ? plan.days.flatMap((day: any) => Array.isArray(day.exercises) ? day.exercises : []) : [];
  const matched = exercises.filter((exercise: any) => String(exercise?.exercise_db_id ?? "").trim() || String(exercise?.media_url ?? "").trim()).length;
  const review = exercises.filter((exercise: any) => String(exercise?.exercise_db_confidence ?? "") === "medium").length;
  const catalog = getExerciseDbCatalogMeta();
  return {
    days_count: daysCount,
    exercises_count: exercises.length,
    matched_exercises_count: matched,
    unmatched_exercises_count: Math.max(0, exercises.length - matched),
    review_exercises_count: review,
    catalog_exercises_count: catalog.total,
    label: `${formatDayCount(daysCount)} · ${formatExerciseCount(exercises.length)}`,
  };
}

function createUnmatched(plan: any) {
  if (!Array.isArray(plan?.days)) return [];

  return plan.days.flatMap((day: any) => {
    if (!Array.isArray(day.exercises)) return [];
    return day.exercises
      .filter((exercise: any) => !String(exercise?.exercise_db_id ?? "").trim() && !String(exercise?.media_url ?? "").trim())
      .map((exercise: any) => {
        const candidate = String(exercise?.exercise_db_name ?? "").trim();
        const confidence = String(exercise?.exercise_db_confidence ?? "").trim();
        return {
          day: day.name,
          name: exercise.name,
          reason: candidate && confidence === "medium"
            ? `Possibile GIF da controllare: ${candidate}. Non applicata automaticamente.`
            : "Nessuna corrispondenza sicura trovata nel catalogo ExerciseDB.",
        };
      });
  });
}

export async function POST(request: Request) {
  try {
    const provider = process.env.AI_PROVIDER || "gemini";
    if (provider !== "gemini") {
      return errorResponse([{ path: "AI_PROVIDER", message: "Per la v0.23 e' supportato solo AI_PROVIDER=gemini." }], 501);
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return errorResponse([{ path: "file", message: "Carica un file PDF, DOCX, immagine, TXT o JSON." }]);
    }

    if (file.size <= 0) {
      return errorResponse([{ path: "file", message: "Il file e' vuoto." }]);
    }

    if (file.size > MAX_FILE_SIZE) {
      return errorResponse([{ path: "file", message: "File troppo grande. Usa un file entro 10 MB." }]);
    }

    if (!isSupportedAiImportFile(file)) {
      return errorResponse([{ path: "file", message: "Formato non supportato. Usa PDF, DOCX, PNG, JPG, WEBP, TXT o JSON." }]);
    }

    const extracted = await extractWorkoutInputFromFile(file);
    if (!extracted.text && !extracted.file) {
      return errorResponse([{ path: "file", message: "Non sono riuscito a leggere il contenuto del file." }]);
    }

    const prompt = buildWorkoutPlanPrompt(extracted.text ? "text" : "file");
    const raw = await generateWorkoutPlanWithGemini({
      prompt,
      text: extracted.text,
      file: extracted.file,
    });

    const parsedJson = parseAiJson(raw);
    const result = normalizeAndValidateAiWorkoutPlan(parsedJson);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        errors: result.errors,
        warnings: [
          ...extracted.warnings.map((message) => ({ path: "file", message })),
          ...result.warnings,
        ],
      }, { status: 422 });
    }

    const summary = createSummary(result.plan);
    const unmatched = createUnmatched(result.plan);
    const warnings = [
      ...extracted.warnings.map((message) => ({ path: "file", message })),
      ...result.warnings,
    ];

    if (summary.unmatched_exercises_count > 0) {
      warnings.unshift({
        path: "exercise_db",
        message: `${summary.unmatched_exercises_count} esercizi senza GIF sicura. ${summary.review_exercises_count ?? 0} hanno un possibile candidato da controllare.`,
      });
    }

    return NextResponse.json({
      success: true,
      plan: result.plan,
      summary,
      warnings,
      unmatched_exercises: unmatched,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore AI sconosciuto.";
    return errorResponse([{ path: "ai", message }], 500);
  }
}
