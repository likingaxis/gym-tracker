import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSelectedProfileId } from "@/lib/profiles";

type CreateSessionBody = {
  workout_plan_id?: string;
  workout_day_id?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateSessionBody;

    if (!body.workout_plan_id || !body.workout_day_id) {
      return NextResponse.json(
        {
          success: false,
          error: "workout_plan_id e workout_day_id sono obbligatori.",
        },
        { status: 400 },
      );
    }

    const profileId = await getSelectedProfileId();

    if (!profileId) {
      return NextResponse.json(
        {
          success: false,
          error: "Seleziona o crea un profilo prima di iniziare l’allenamento.",
        },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();

    const { data: existingSession, error: existingError } = await supabase
      .from("workout_sessions")
      .select("*, session_exercises(*, exercise_sets(*))")
      .eq("workout_day_id", body.workout_day_id)
      .eq("status", "in_progress")
      .eq("profile_id", profileId)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        { success: false, error: existingError.message },
        { status: 500 },
      );
    }

    if (existingSession) {
      return NextResponse.json({
        success: true,
        session: existingSession,
        resumed: true,
      });
    }

    const { data: exercises, error: exercisesError } = await supabase
      .from("exercises")
      .select("id, name, exercise_db_id, sets, reps")
      .eq("workout_day_id", body.workout_day_id)
      .order("exercise_order", { ascending: true });

    if (exercisesError) {
      return NextResponse.json(
        { success: false, error: exercisesError.message },
        { status: 500 },
      );
    }

    const { data: previousSessions, error: previousSessionsError } =
      await supabase
        .from("workout_sessions")
        .select(
          "started_at, session_exercises(exercise_id, personal_notes, exercises(id, name, exercise_db_id), exercise_sets(set_number, weight))",
        )
        .eq("profile_id", profileId)
        .eq("status", "completed")
        .order("started_at", { ascending: false })
        .limit(25);

    if (previousSessionsError) {
      return NextResponse.json(
        { success: false, error: previousSessionsError.message },
        { status: 500 },
      );
    }

    const previousDataByExercise = buildPreviousDataByExercise(
      exercises ?? [],
      previousSessions ?? [],
    );
    const previousWeightsByExercise = Object.fromEntries(
      Object.entries(previousDataByExercise).map(([exerciseId, data]) => [
        exerciseId,
        data.weights,
      ]),
    );

    const { data: session, error: sessionError } = await supabase
      .from("workout_sessions")
      .insert({
        workout_plan_id: body.workout_plan_id,
        workout_day_id: body.workout_day_id,
        profile_id: profileId,
        status: "in_progress",
      })
      .select("*")
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        {
          success: false,
          error: sessionError?.message ?? "Errore creazione sessione.",
        },
        { status: 500 },
      );
    }

    const exerciseRows = (exercises ?? []).map((exercise) => ({
      workout_session_id: session.id,
      exercise_id: exercise.id,
      completed: false,
      personal_notes: previousDataByExercise[exercise.id]?.note ?? null,
    }));

    if (exerciseRows.length > 0) {
      const { data: sessionExercises, error: insertExerciseError } =
        await supabase
          .from("session_exercises")
          .insert(exerciseRows)
          .select("id, exercise_id");

      if (insertExerciseError) {
        return NextResponse.json(
          { success: false, error: insertExerciseError.message },
          { status: 500 },
        );
      }

      const setRows = (sessionExercises ?? []).flatMap((sessionExercise) => {
        const sourceExercise = (exercises ?? []).find(
          (exercise) => exercise.id === sessionExercise.exercise_id,
        );
        const setCount = Math.max(1, Number(sourceExercise?.sets ?? 1));

        return Array.from({ length: setCount }, (_item, index) => {
          const setNumber = index + 1;
          const previousWeight =
            previousWeightsByExercise[sourceExercise?.id ?? ""]?.[setNumber] ??
            null;

          return {
            session_exercise_id: sessionExercise.id,
            set_number: setNumber,
            reps: getPlannedRepForSet(
              sourceExercise?.reps,
              setCount,
              setNumber,
            ),
            weight: previousWeight,
            weight_source: previousWeight ? "previous" : "empty",
            rpe: null,
            completed: false,
          };
        });
      });

      if (setRows.length > 0) {
        const { error: setError } = await supabase
          .from("exercise_sets")
          .insert(setRows);
        if (setError) {
          return NextResponse.json(
            { success: false, error: setError.message },
            { status: 500 },
          );
        }
      }
    }

    const { data: createdSession, error: readError } = await supabase
      .from("workout_sessions")
      .select("*, session_exercises(*, exercise_sets(*))")
      .eq("id", session.id)
      .single();

    if (readError || !createdSession) {
      return NextResponse.json(
        {
          success: false,
          error: readError?.message ?? "Sessione creata ma non riletta.",
        },
        { status: 500 },
      );
    }

    const createdSessionWithInheritedNotes = {
      ...createdSession,
      session_exercises: (createdSession.session_exercises ?? []).map(
        (sessionExercise: any) => {
          const previousData =
            previousDataByExercise[sessionExercise.exercise_id ?? ""];
          return {
            ...sessionExercise,
            personal_notes_inherited: Boolean(previousData?.note),
            personal_notes_inherited_at: previousData?.started_at ?? null,
          };
        },
      ),
    };

    return NextResponse.json({
      success: true,
      session: createdSessionWithInheritedNotes,
      resumed: false,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Errore imprevisto creazione sessione.",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  const profileId = await getSelectedProfileId();

  if (!profileId) {
    return NextResponse.json({ success: true, sessions: [] });
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("workout_sessions")
    .select(
      "*, workout_plans(name, month), workout_days(name), session_exercises(*, exercise_sets(*))",
    )
    .eq("profile_id", profileId)
    .order("started_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, sessions: data ?? [] });
}

type CurrentExercise = {
  id: string;
  name?: string | null;
  exercise_db_id?: string | null;
  sets?: number | null;
  reps?: string | null;
};

type PreviousExerciseRef = {
  id?: string | null;
  name?: string | null;
  exercise_db_id?: string | null;
};

type PreviousSessionExercise = {
  exercise_id?: string | null;
  // Supabase can infer joined rows as either an object or an array depending on
  // generated relationship typing. At runtime this relation is expected to be a
  // single exercise, but accepting both shapes keeps `next build` strict-mode safe.
  exercises?: PreviousExerciseRef | PreviousExerciseRef[] | null;
  personal_notes?: string | null;
  exercise_sets?: Array<{
    set_number?: number | null;
    weight?: string | null;
  }> | null;
};

type PreviousSession = {
  started_at?: string | null;
  session_exercises?: PreviousSessionExercise[] | null;
};

function buildPreviousDataByExercise(
  currentExercises: CurrentExercise[],
  previousSessions: PreviousSession[],
) {
  const result: Record<
    string,
    {
      weights: Record<number, string>;
      note: string | null;
      started_at: string | null;
    }
  > = {};

  for (const exercise of currentExercises) {
    const previousExercise = findPreviousExercise(exercise, previousSessions);
    if (!previousExercise) continue;

    const weights: Record<number, string> = {};
    for (const set of previousExercise.exercise_sets ?? []) {
      const setNumber = Number(set.set_number);
      const weight = set.weight?.trim();
      if (!Number.isFinite(setNumber) || !weight) continue;
      weights[setNumber] = weight;
    }

    const note = previousExercise.personal_notes?.trim() || null;
    if (!note && Object.keys(weights).length === 0) continue;

    result[exercise.id] = {
      weights,
      note,
      started_at: previousExercise.started_at ?? null,
    };
  }

  return result;
}

function findPreviousExercise(
  exercise: CurrentExercise,
  previousSessions: PreviousSession[],
) {
  const normalizedName = normalizeExerciseName(exercise.name);
  const exerciseDbId = exercise.exercise_db_id?.trim();

  for (const session of previousSessions) {
    const sessionExercises = session.session_exercises ?? [];

    const byExerciseDbId = exerciseDbId
      ? sessionExercises.find(
          (item) =>
            getPreviousExerciseRef(item)?.exercise_db_id?.trim() ===
            exerciseDbId,
        )
      : undefined;
    if (byExerciseDbId && hasPreviousExerciseData(byExerciseDbId))
      return { ...byExerciseDbId, started_at: session.started_at };

    const byName = normalizedName
      ? sessionExercises.find(
          (item) =>
            normalizeExerciseName(getPreviousExerciseRef(item)?.name) ===
            normalizedName,
        )
      : undefined;
    if (byName && hasPreviousExerciseData(byName))
      return { ...byName, started_at: session.started_at };

    const bySameExerciseId = sessionExercises.find(
      (item) => item.exercise_id === exercise.id,
    );
    if (bySameExerciseId && hasPreviousExerciseData(bySameExerciseId))
      return { ...bySameExerciseId, started_at: session.started_at };
  }

  return null;
}

function hasPreviousExerciseData(item: PreviousSessionExercise) {
  return Boolean(
    item.personal_notes?.trim() ||
    item.exercise_sets?.some((set) => set.weight?.trim()),
  );
}

function getPreviousExerciseRef(item: PreviousSessionExercise) {
  const linkedExercise = item.exercises;
  return Array.isArray(linkedExercise) ? linkedExercise[0] : linkedExercise;
}

function normalizeExerciseName(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getPlannedRepForSet(
  reps: string | null | undefined,
  setCount: number,
  setNumber: number,
) {
  const value = reps?.trim();
  if (!value) return null;

  const descendingPattern = /^\d+(?:\s*-\s*\d+){2,}$/;
  if (descendingPattern.test(value)) {
    const parts = value
      .split("-")
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length === setCount) return parts[setNumber - 1] ?? value;
  }

  return value;
}
