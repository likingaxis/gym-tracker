import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSelectedProfileId } from "@/lib/profiles";

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
};

type EditableDay = {
  id?: string;
  day_order?: number;
  name?: string;
  description?: string | null;
  exercises?: EditableExercise[];
};

type EditablePlan = {
  name?: string;
  month?: string;
  start_date?: string | null;
  end_date?: string | null;
  days?: EditableDay[];
};

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const profileId = await getSelectedProfileId();

    if (!profileId) {
      return NextResponse.json({ success: false, error: "Seleziona un profilo." }, { status: 401 });
    }

    const body = (await request.json()) as EditablePlan;
    const supabase = createServerSupabaseClient();

    const { data: existingPlan, error: planReadError } = await supabase
      .from("workout_plans")
      .select("id, profile_id")
      .eq("id", id)
      .eq("profile_id", profileId)
      .single();

    if (planReadError || !existingPlan) {
      return NextResponse.json(
        { success: false, error: planReadError?.message ?? "Scheda non trovata." },
        { status: 404 },
      );
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
      .eq("id", id)
      .eq("profile_id", profileId);

    if (planUpdateError) {
      return NextResponse.json({ success: false, error: planUpdateError.message }, { status: 500 });
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
          .eq("workout_plan_id", id);

        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      } else {
        const { data, error } = await supabase
          .from("workout_days")
          .insert({
            workout_plan_id: id,
            name: cleanText(day.name) || `Giorno ${dayOrder}`,
            day_order: dayOrder,
            description: cleanNullableText(day.description),
          })
          .select("id")
          .single();

        if (error || !data) {
          return NextResponse.json({ success: false, error: error?.message ?? "Errore creazione giorno." }, { status: 500 });
        }
        dayId = data.id;
      }

      daysTouched += 1;

      for (const [exerciseIndex, exercise] of (day.exercises ?? []).entries()) {
        const exerciseOrder = exerciseIndex + 1;
        const row = {
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
        };

        if (exercise.id) {
          const { error } = await supabase
            .from("exercises")
            .update(row)
            .eq("id", exercise.id)
            .eq("workout_day_id", dayId);

          if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        } else {
          const { error } = await supabase.from("exercises").insert(row);
          if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        exercisesTouched += 1;
      }
    }

    return NextResponse.json({ success: true, days_touched: daysTouched, exercises_touched: exercisesTouched });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Errore server." },
      { status: 500 },
    );
  }
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
