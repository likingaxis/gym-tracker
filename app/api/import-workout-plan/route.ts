import { NextResponse } from "next/server";
import { parseWorkoutPlanJson } from "@/lib/import/parseJson";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSelectedProfileId } from "@/lib/profiles";
import { isDirectImageUrl, resolveExerciseDbMediaById } from "@/lib/exerciseDb";

function errorResponse(
  errors: { path: string; message: string }[],
  status = 400,
) {
  return NextResponse.json({ success: false, errors }, { status });
}

function cleanDate(value?: string) {
  if (!value || value.trim() === "") return null;
  return value;
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (!contentType.includes("application/json")) {
      return errorResponse([
        {
          path: "file",
          message:
            "Import non valido: questa versione supporta solo file JSON.",
        },
      ]);
    }

    const body = await request.text();

    if (!body.trim()) {
      return errorResponse([
        { path: "file", message: "Il file JSON è vuoto." },
      ]);
    }

    const parsed = parseWorkoutPlanJson(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.errors, warnings: parsed.warnings },
        { status: 400 },
      );
    }

    const profileId = await getSelectedProfileId();

    if (!profileId) {
      return errorResponse(
        [{ path: "profile", message: "Seleziona o crea un profilo prima di importare la scheda." }],
        400,
      );
    }

    const supabase = createServerSupabaseClient();
    const plan = parsed.data;
    const replaceCurrentPlan =
      request.headers.get("x-replace-current-plan") === "true";

    if (replaceCurrentPlan) {
      const { error: deleteError } = await supabase
        .from("workout_plans")
        .delete()
        .eq("is_active", true)
        .eq("profile_id", profileId);

      if (deleteError) {
        return errorResponse(
          [{ path: "database.workout_plans", message: deleteError.message }],
          500,
        );
      }
    }

    const { data: planRow, error: planError } = await supabase
      .from("workout_plans")
      .insert({
        name: plan.name,
        month: plan.month,
        start_date: cleanDate(plan.start_date),
        end_date: cleanDate(plan.end_date),
        is_active: true,
        profile_id: profileId,
      })
      .select("id")
      .single();

    if (planError || !planRow) {
      return errorResponse(
        [
          {
            path: "database.workout_plans",
            message: planError?.message ?? "Errore creazione scheda",
          },
        ],
        500,
      );
    }

    const { error: deactivateError } = await supabase
      .from("workout_plans")
      .update({ is_active: false })
      .eq("profile_id", profileId)
      .neq("id", planRow.id);

    if (deactivateError) {
      return errorResponse(
        [{ path: "database.workout_plans", message: deactivateError.message }],
        500,
      );
    }

    let daysCreated = 0;
    let exercisesCreated = 0;
    let exerciseDbMatched = 0;
    let exerciseDbUnmatched = 0;
    const exerciseDbWarnings: { path: string; message: string }[] = [];

    for (const day of plan.days) {
      const { data: dayRow, error: dayError } = await supabase
        .from("workout_days")
        .insert({
          workout_plan_id: planRow.id,
          name: day.name,
          day_order: day.order,
          description: day.description ?? null,
        })
        .select("id")
        .single();

      if (dayError || !dayRow) {
        return errorResponse(
          [
            {
              path: `database.workout_days.${day.name}`,
              message: dayError?.message ?? "Errore creazione giorno",
            },
          ],
          500,
        );
      }

      daysCreated += 1;

      const exerciseRows = [];

      for (const exercise of day.exercises) {
        let mediaUrl = exercise.media_url ?? null;
        let exerciseDbId = exercise.exercise_db_id ?? null;
        let exerciseDbName = exercise.exercise_db_name ?? null;
        let exerciseDbMatchScore: number | null = null;
        let exerciseDbRaw: unknown = null;
        let exerciseDbMatchStatus: string | null = null;
        let exerciseDbConfidence = exercise.exercise_db_confidence ?? null;

        const resolvedById = resolveExerciseDbMediaById(exerciseDbId);

        if (resolvedById) {
          exerciseDbId = resolvedById.id;
          mediaUrl = resolvedById.gifUrl;
          exerciseDbMatchScore = 100;
          exerciseDbMatchStatus = resolvedById.matchStatus;
          exerciseDbMatched += 1;
          exerciseDbWarnings.push({
            path: `exercise_db.${exercise.name}`,
            message: `GIF assegnata da ID ExerciseDB ${resolvedById.id}.`,
          });
        } else if (mediaUrl && isDirectImageUrl(mediaUrl)) {
          exerciseDbMatchStatus = "manual_media";
          exerciseDbMatched += 1;
          exerciseDbWarnings.push({
            path: `exercise_db.${exercise.name}`,
            message: "GIF/media usato dal campo media_url del JSON.",
          });
        } else {
          mediaUrl = null;
          exerciseDbId = exerciseDbId || null;
          exerciseDbMatchStatus = exerciseDbId ? "id_not_valid" : "not_provided";
          exerciseDbUnmatched += 1;
          exerciseDbWarnings.push({
            path: `exercise_db.${exercise.name}`,
            message: exerciseDbId
              ? `ID ExerciseDB non valido o non utilizzabile: ${exerciseDbId}. Nessuna GIF assegnata.`
              : "Nessun ID ExerciseDB fornito. Nessuna GIF assegnata automaticamente.",
          });
        }

        exerciseRows.push({
          workout_day_id: dayRow.id,
          exercise_order: exercise.order,
          name: exercise.name,
          exercise_db_query: exercise.exercise_db_query ?? null,
          exercise_db_id: exerciseDbId,
          exercise_db_name: exerciseDbName,
          exercise_db_confidence: exerciseDbConfidence,
          exercise_db_match_status: exerciseDbMatchStatus,
          exercise_db_match_score: exerciseDbMatchScore,
          exercise_db_raw: exerciseDbRaw,
          target_rpe: exercise.target_rpe ?? null,
          muscle_group: exercise.muscle_group ?? null,
          sets: exercise.sets ?? null,
          reps: exercise.reps ?? null,
          rest_seconds: exercise.rest_seconds ?? 90,
          suggested_weight: exercise.suggested_weight ?? null,
          technique_notes: exercise.technique_notes ?? null,
          tips: exercise.tips ?? null,
          video_url: exercise.video_url ?? null,
          media_url: mediaUrl,
          trainer_notes: exercise.trainer_notes ?? null,
        });
      }

      const { error: exercisesError } = await supabase
        .from("exercises")
        .insert(exerciseRows);

      if (exercisesError) {
        return errorResponse(
          [
            {
              path: `database.exercises.${day.name}`,
              message: exercisesError.message,
            },
          ],
          500,
        );
      }

      exercisesCreated += exerciseRows.length;
    }

    return NextResponse.json({
      success: true,
      workout_plan_id: planRow.id,
      days_created: daysCreated,
      exercises_created: exercisesCreated,
      warnings: [...parsed.warnings, ...exerciseDbWarnings],
      exercise_db_matched: exerciseDbMatched,
      exercise_db_unmatched: exerciseDbUnmatched,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Errore server sconosciuto";
    return errorResponse([{ path: "server", message }], 500);
  }
}
