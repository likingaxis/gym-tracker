import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSelectedProfileId } from "@/lib/profiles";

type ExerciseSetPayload = {
  id?: string;
  set_number: number;
  reps?: string | null;
  weight?: string | null;
  weight_source?: string | null;
  rpe?: number | null;
  completed?: boolean;
};

type SessionExercisePayload = {
  id?: string;
  exercise_id: string;
  completed?: boolean;
  personal_notes?: string | null;
  sets?: ExerciseSetPayload[];
};

type PatchSessionBody = {
  general_notes?: string | null;
  exercises?: SessionExercisePayload[];
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profileId = await getSelectedProfileId();
  const supabase = createServerSupabaseClient();

  let query = supabase
    .from("workout_sessions")
    .select("*, workout_plans(name, month), workout_days(name), session_exercises(*, exercises(*), exercise_sets(*))")
    .eq("id", id);

  if (profileId) query = query.eq("profile_id", profileId);

  const { data, error } = await query.single();

  if (error || !data) {
    return NextResponse.json({ success: false, error: error?.message ?? "Sessione non trovata." }, { status: 404 });
  }

  return NextResponse.json({ success: true, session: data });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json()) as PatchSessionBody;
    const profileId = await getSelectedProfileId();
    const supabase = createServerSupabaseClient();

    if (!profileId) {
      return NextResponse.json({ success: false, error: "Seleziona un profilo." }, { status: 400 });
    }

    if (body.general_notes !== undefined) {
      const { error: sessionError } = await supabase
        .from("workout_sessions")
        .update({ general_notes: body.general_notes })
        .eq("id", id)
        .eq("profile_id", profileId);

      if (sessionError) {
        return NextResponse.json({ success: false, error: sessionError.message }, { status: 500 });
      }
    }

    if (body.exercises?.length) {
      for (const exercise of body.exercises) {
        const { data: sessionExercise, error: readError } = await supabase
          .from("session_exercises")
          .select("id, workout_sessions!inner(profile_id)")
          .eq("workout_session_id", id)
          .eq("workout_sessions.profile_id", profileId)
          .eq("exercise_id", exercise.exercise_id)
          .single();

        if (readError || !sessionExercise) {
          return NextResponse.json({ success: false, error: readError?.message ?? "Esercizio sessione non trovato." }, { status: 500 });
        }

        const { error: exerciseError } = await supabase
          .from("session_exercises")
          .update({
            completed: exercise.completed ?? false,
            personal_notes: exercise.personal_notes ?? null,
            actual_sets: exercise.sets?.length ?? null,
            actual_reps: exercise.sets?.map((set) => set.reps ?? "").filter(Boolean).join(", ") || null,
            actual_weight: exercise.sets?.map((set) => set.weight ?? "").filter(Boolean).join(", ") || null,
            rpe: calculateAverageRpe(exercise.sets),
            updated_at: new Date().toISOString()
          })
          .eq("id", sessionExercise.id);

        if (exerciseError) {
          return NextResponse.json({ success: false, error: exerciseError.message }, { status: 500 });
        }

        if (exercise.sets?.length) {
          const setRows = exercise.sets.map((set) => ({
            ...(set.id ? { id: set.id } : {}),
            session_exercise_id: sessionExercise.id,
            set_number: set.set_number,
            reps: set.reps ?? null,
            weight: set.weight ?? null,
            weight_source: normalizeWeightSource(set.weight_source, set.weight),
            rpe: set.rpe ?? null,
            completed: set.completed ?? false
          }));

          const { error: setError } = await supabase
            .from("exercise_sets")
            .upsert(setRows, { onConflict: "session_exercise_id,set_number" });

          if (setError) {
            return NextResponse.json({ success: false, error: setError.message }, { status: 500 });
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Errore imprevisto autosalvataggio." },
      { status: 500 }
    );
  }
}


export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const profileId = await getSelectedProfileId();

    if (!profileId) {
      return NextResponse.json({ success: false, error: "Seleziona un profilo." }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("workout_sessions")
      .delete()
      .eq("id", id)
      .eq("profile_id", profileId)
      .select("id")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: error?.message ?? "Sessione non trovata." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Errore eliminazione sessione." },
      { status: 500 }
    );
  }
}

function normalizeWeightSource(source: string | null | undefined, weight: string | null | undefined) {
  if (!weight?.trim()) return "empty";
  return source === "previous" ? "previous" : "manual";
}

function calculateAverageRpe(sets: ExerciseSetPayload[] | undefined) {
  const values = (sets ?? [])
    .map((set) => set.rpe)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (values.length === 0) return null;

  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}
