import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSelectedProfileId } from "@/lib/profiles";
import { getExerciseDbCatalog } from "@/lib/ai/exerciseDbCatalog";

type Body = {
  exercise_db_id?: string;
  remove?: boolean;
};

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const profileId = await getSelectedProfileId();

    if (!profileId) {
      return NextResponse.json({ success: false, error: "Seleziona un profilo." }, { status: 401 });
    }

    const body = (await request.json()) as Body;
    const supabase = createServerSupabaseClient();

    const { data: exercise, error: readError } = await supabase
      .from("exercises")
      .select("id, workout_days!inner(workout_plans!inner(profile_id))")
      .eq("id", id)
      .eq("workout_days.workout_plans.profile_id", profileId)
      .maybeSingle();

    if (readError) {
      return NextResponse.json({ success: false, error: readError.message }, { status: 500 });
    }

    if (!exercise) {
      return NextResponse.json({ success: false, error: "Esercizio non trovato per questo profilo." }, { status: 404 });
    }

    if (body.remove) {
      const { data, error } = await supabase
        .from("exercises")
        .update({
          exercise_db_id: null,
          exercise_db_name: null,
          exercise_db_confidence: "manual",
          exercise_db_match_status: "manual_removed",
          exercise_db_match_score: null,
          exercise_db_raw: null,
          media_url: null,
        })
        .eq("id", id)
        .select("id, name, exercise_db_id, exercise_db_name, exercise_db_confidence, exercise_db_match_status, exercise_db_match_score, media_url")
        .single();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, exercise: data });
    }

    const selectedId = String(body.exercise_db_id ?? "").trim();
    const selected = getExerciseDbCatalog().find((item) => item.exercise_db_id === selectedId);

    if (!selected) {
      return NextResponse.json({ success: false, error: "ID ExerciseDB non valido." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("exercises")
      .update({
        exercise_db_id: selected.exercise_db_id,
        exercise_db_name: selected.name,
        exercise_db_confidence: "manual",
        exercise_db_match_status: "manual_selected",
        exercise_db_match_score: 100,
        exercise_db_raw: {
          source: "manual_media_review",
          selected_at: new Date().toISOString(),
          bodyParts: selected.bodyParts,
          equipments: selected.equipments,
          targetMuscles: selected.targetMuscles,
          secondaryMuscles: selected.secondaryMuscles,
        },
        media_url: selected.gifUrl,
      })
      .eq("id", id)
      .select("id, name, exercise_db_id, exercise_db_name, exercise_db_confidence, exercise_db_match_status, exercise_db_match_score, media_url")
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, exercise: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore sconosciuto.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
