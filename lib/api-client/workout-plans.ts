import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { normalizeGroupId, normalizeGroupType } from "@/lib/workoutGroups";
import { invalidateWorkoutCache } from "@/lib/api-client/workout";

type EditableExercise = {
  id?: string;
  exercise_order?: number;
  name?: string;
  muscle_group?: string | null;
  sets?: number | null;
  reps?: string | null;
  rest_seconds?: number | null;
  suggested_weight?: string | null;
  target_rpe?: string | null;
  technique_notes?: string | null;
  tips?: string | null;
  trainer_notes?: string | null;
  exercise_db_query?: string | null;
  exercise_db_id?: string | null;
  media_url?: string | null;
  group_type?: string | null;
  group_id?: string | null;
  group_order?: number | null;
  exercise_db_raw?: unknown;
};

type EditableDay = {
  id?: string;
  day_order?: number;
  name?: string;
  description?: string | null;
  exercises?: EditableExercise[];
};

export type EditablePlan = {
  name?: string;
  month?: string;
  start_date?: string | null;
  end_date?: string | null;
  days?: EditableDay[];
};

export async function saveWorkoutPlan(profileId: string, planId: string, body: EditablePlan) {
  try {
    const supabase = createBrowserSupabaseClient();

    const { data: existingPlan, error: planReadError } = await supabase
      .from("workout_plans")
      .select("id, profile_id")
      .eq("id", planId)
      .eq("profile_id", profileId)
      .single();

    if (planReadError || !existingPlan) {
      return { success: false, error: planReadError?.message ?? "Scheda non trovata." };
    }

    const name = cleanText(body.name) || "Scheda";
    const month = cleanText(body.month) || "";

    const { error: planUpdateError } = await supabase
      .from("workout_plans")
      .update({
        name,
        month,
        start_date: cleanDate(body.start_date),
        end_date: cleanDate(body.end_date),
        updated_at: new Date().toISOString(),
      })
      .eq("id", planId)
      .eq("profile_id", profileId);

    if (planUpdateError) {
      return { success: false, error: planUpdateError.message };
    }

    let daysTouched = 0;
    let exercisesTouched = 0;

    for (const [dayIndex, day] of (body.days ?? []).entries()) {
      const dayOrder = dayIndex + 1;
      let dayId = day.id;

      if (dayId) {
        const { error } = await supabase
          .from("workout_days")
          .update({
            name: cleanText(day.name) || `Giorno ${dayOrder}`,
            day_order: dayOrder,
            description: cleanNullableText(day.description),
          })
          .eq("id", dayId)
          .eq("workout_plan_id", planId);

        if (error) return { success: false, error: error.message };
      } else {
        const { data, error } = await supabase
          .from("workout_days")
          .insert({
            workout_plan_id: planId,
            name: cleanText(day.name) || `Giorno ${dayOrder}`,
            day_order: dayOrder,
            description: cleanNullableText(day.description),
          })
          .select("id")
          .single();

        if (error || !data) {
          return { success: false, error: error?.message ?? "Errore creazione giorno." };
        }
        dayId = data.id;
      }

      daysTouched += 1;

      if (day.id) {
        const { data: existingExercises, error: existingExercisesError } = await supabase
          .from("exercises")
          .select("id")
          .eq("workout_day_id", dayId);

        if (existingExercisesError) {
          return { success: false, error: existingExercisesError.message };
        }

        const retainedIds = new Set(
          (day.exercises ?? [])
            .map((item) => item.id)
            .filter((id): id is string => Boolean(id)),
        );
        const removedIds = (existingExercises ?? [])
          .map((item: { id: string }) => item.id)
          .filter((id: string) => !retainedIds.has(id));

        if (removedIds.length > 0) {
          const { error: deleteError } = await supabase
            .from("exercises")
            .delete()
            .in("id", removedIds)
            .eq("workout_day_id", dayId);

          if (deleteError) return { success: false, error: deleteError.message };
        }
      }

      for (const [exerciseIndex, exercise] of (day.exercises ?? []).entries()) {
        const exerciseOrder = exerciseIndex + 1;
        const groupType = normalizeGroupType(exercise.group_type);
        const groupId = groupType ? normalizeGroupId(exercise.group_id) ?? "A" : null;
        const groupOrder = groupType
          ? cleanNumber(exercise.group_order) ?? exerciseOrder
          : null;

        const existingRaw = isRecord(exercise.exercise_db_raw)
          ? { ...exercise.exercise_db_raw }
          : {};
        if (groupType && groupId) {
          existingRaw.group = {
            group_type: groupType,
            group_id: groupId,
            group_order: groupOrder,
          };
        } else {
          delete existingRaw.group;
        }
        const nextRaw = Object.keys(existingRaw).length > 0 ? existingRaw : null;

        const baseRow = {
          workout_day_id: dayId,
          exercise_order: exerciseOrder,
          name: cleanText(exercise.name) || `Esercizio ${exerciseOrder}`,
          muscle_group: cleanNullableText(exercise.muscle_group),
          sets: cleanNumber(exercise.sets),
          reps: cleanNullableText(exercise.reps),
          rest_seconds: cleanNumber(exercise.rest_seconds) ?? 90,
          suggested_weight: cleanNullableText(exercise.suggested_weight),
          target_rpe: cleanNullableText(exercise.target_rpe),
          technique_notes: cleanNullableText(exercise.technique_notes),
          tips: cleanNullableText(exercise.tips),
          trainer_notes: cleanNullableText(exercise.trainer_notes),
          exercise_db_query: cleanNullableText(exercise.exercise_db_query),
          exercise_db_id: cleanNullableText(exercise.exercise_db_id),
          media_url: cleanNullableText(exercise.media_url),
          exercise_db_raw: nextRaw,
        };

        const rowWithGroup = {
          ...baseRow,
          group_type: groupType,
          group_id: groupId,
          group_order: groupOrder,
        };

        if (exercise.id) {
          let { error } = await supabase
            .from("exercises")
            .update(rowWithGroup)
            .eq("id", exercise.id)
            .eq("workout_day_id", dayId);

          if (error && /group_type|group_id|group_order/i.test(error.message)) {
            const retry = await supabase
              .from("exercises")
              .update(baseRow)
              .eq("id", exercise.id)
              .eq("workout_day_id", dayId);
            error = retry.error;
          }

          if (error) return { success: false, error: error.message };
        } else {
          let { error } = await supabase.from("exercises").insert(rowWithGroup);

          if (error && /group_type|group_id|group_order/i.test(error.message)) {
            const retry = await supabase.from("exercises").insert(baseRow);
            error = retry.error;
          }

          if (error) return { success: false, error: error.message };
        }

        exercisesTouched += 1;
      }
    }

    await invalidateWorkoutCache(profileId);
    return { success: true, days_touched: daysTouched, exercises_touched: exercisesTouched };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Errore client." };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanNullableText(value: unknown) {
  const text = cleanText(value);
  return text ? text : null;
}

function cleanDate(value: unknown) {
  const text = cleanText(value);
  return text ? text : null;
}

function cleanNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
