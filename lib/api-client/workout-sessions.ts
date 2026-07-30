import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export type CreateSessionBody = {
  workout_plan_id?: string;
  workout_day_id?: string;
};

export type CurrentExercise = {
  id: string;
  name?: string | null;
  exercise_db_id?: string | null;
  sets?: number | null;
  reps?: string | null;
};

export type PreviousExerciseRef = {
  id?: string | null;
  name?: string | null;
  exercise_db_id?: string | null;
};

export type PreviousSessionExercise = {
  exercise_id?: string | null;
  exercises?: PreviousExerciseRef | PreviousExerciseRef[] | null;
  personal_notes?: string | null;
  exercise_sets?: Array<{
    set_number?: number | null;
    weight?: string | null;
  }> | null;
};

export type PreviousSession = {
  started_at?: string | null;
  session_exercises?: PreviousSessionExercise[] | null;
};

export type ExerciseSetPayload = {
  id?: string;
  set_number: number;
  reps?: string | null;
  weight?: string | null;
  weight_source?: string | null;
  rpe?: number | null;
  completed?: boolean;
};

export type SessionExercisePayload = {
  id?: string;
  exercise_id: string;
  completed?: boolean;
  personal_notes?: string | null;
  sets?: ExerciseSetPayload[];
};

export type PatchSessionBody = {
  general_notes?: string | null;
  exercises?: SessionExercisePayload[];
};

export async function createSession(profileId: string | null | undefined, body: CreateSessionBody) {
  try {
    if (!body.workout_plan_id || !body.workout_day_id) {
      return {
        success: false,
        error: "workout_plan_id e workout_day_id sono obbligatori.",
      };
    }

    if (!profileId) {
      return {
        success: false,
        error: "Seleziona o crea un profilo prima di iniziare l’allenamento.",
      };
    }

    const supabase = createBrowserSupabaseClient();

    const { data: existingSession, error: existingError } = await supabase
      .from("workout_sessions")
      .select("*, session_exercises(*, exercise_sets(*))")
      .eq("workout_day_id", body.workout_day_id)
      .in("status", ["in_progress", "paused"])
      .eq("profile_id", profileId)
      .is("deleted_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      return { success: false, error: existingError.message };
    }

    if (existingSession) {
      return {
        success: true,
        session: existingSession,
        resumed: true,
      };
    }

    const { data: exercises, error: exercisesError } = await supabase
      .from("exercises")
      .select("id, name, exercise_db_id, sets, reps")
      .eq("workout_day_id", body.workout_day_id)
      .order("exercise_order", { ascending: true });

    if (exercisesError) {
      return { success: false, error: exercisesError.message };
    }

    const { data: dayContext, error: dayContextError } = await supabase
      .from("workout_days")
      .select("id, name, workout_plan_id, workout_plans!inner(id, name, color)")
      .eq("id", body.workout_day_id)
      .eq("workout_plan_id", body.workout_plan_id)
      .single();

    if (dayContextError || !dayContext) {
      return { success: false, error: dayContextError?.message ?? "Giorno scheda non trovato." };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const planContext = Array.isArray((dayContext as any).workout_plans)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (dayContext as any).workout_plans[0]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      : (dayContext as any).workout_plans;

    const currentExercises = (exercises ?? []) as CurrentExercise[];

    const { data: previousSessions, error: previousSessionsError } =
      await supabase
        .from("workout_sessions")
        .select(
          "started_at, session_exercises(exercise_id, personal_notes, exercises(id, name, exercise_db_id), exercise_sets(set_number, weight))",
        )
        .eq("profile_id", profileId)
        .eq("status", "completed")
        .is("deleted_at", null)
        .order("started_at", { ascending: false })
        .limit(25);

    if (previousSessionsError) {
      return { success: false, error: previousSessionsError.message };
    }

    const previousDataByExercise = buildPreviousDataByExercise(
      currentExercises,
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
        workout_plan_name_snapshot: planContext?.name ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        workout_day_name_snapshot: (dayContext as any).name ?? null,
        workout_plan_color_snapshot: planContext?.color ?? null,
      })
      .select("*")
      .single();

    if (sessionError || !session) {
      return {
        success: false,
        error: sessionError?.message ?? "Errore creazione sessione.",
      };
    }

    const exerciseRows = currentExercises.map((exercise) => ({
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
        return { success: false, error: insertExerciseError.message };
      }

      const insertedSessionExercises = (sessionExercises ?? []) as Array<{ id: string; exercise_id: string }>;
      const setRows = insertedSessionExercises.flatMap((sessionExercise) => {
        const sourceExercise = currentExercises.find(
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
          return { success: false, error: setError.message };
        }
      }
    }

    const { data: createdSession, error: readError } = await supabase
      .from("workout_sessions")
      .select("*, session_exercises(*, exercise_sets(*))")
      .eq("id", session.id)
      .single();

    if (readError || !createdSession) {
      return {
        success: false,
        error: readError?.message ?? "Sessione creata ma non riletta.",
      };
    }

    const createdSessionWithInheritedNotes = {
      ...createdSession,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      session_exercises: (createdSession.session_exercises ?? []).map((sessionExercise: any) => {
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

    return {
      success: true,
      session: createdSessionWithInheritedNotes,
      resumed: false,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Errore imprevisto creazione sessione.",
    };
  }
}

export async function getSessions(profileId: string | null | undefined) {
  if (!profileId) {
    return { success: true, sessions: [] };
  }

  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from("workout_sessions")
    .select(
      "*, workout_plans(name, month, color), workout_days(name), session_exercises(*, exercise_sets(*))",
    )
    .eq("profile_id", profileId)
    .is("deleted_at", null)
    .order("started_at", { ascending: false })
    .limit(50);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, sessions: data ?? [] };
}

export async function getSession(profileId: string | null | undefined, id: string) {
  const supabase = createBrowserSupabaseClient();

  let query = supabase
    .from("workout_sessions")
    .select("*, workout_plans(name, month, color), workout_days(name), session_exercises(*, exercises(*), exercise_sets(*))")
    .eq("id", id);

  if (profileId) query = query.eq("profile_id", profileId);

  const { data, error } = await query.single();

  if (error || !data) {
    return { success: false, error: error?.message ?? "Sessione non trovata." };
  }

  return { success: true, session: data };
}

export async function updateSession(profileId: string | null | undefined, id: string, body: PatchSessionBody) {
  try {
    const supabase = createBrowserSupabaseClient();

    if (!profileId) {
      return { success: false, error: "Seleziona un profilo." };
    }

    if (body.general_notes !== undefined) {
      const { error: sessionError } = await supabase
        .from("workout_sessions")
        .update({ general_notes: body.general_notes })
        .eq("id", id)
        .eq("profile_id", profileId);

      if (sessionError) {
        return { success: false, error: sessionError.message };
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
          return { success: false, error: readError?.message ?? "Esercizio sessione non trovato." };
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
          return { success: false, error: exerciseError.message };
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
            return { success: false, error: setError.message };
          }
        }
      }
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Errore imprevisto autosalvataggio." };
  }
}

export async function deleteSession(profileId: string | null | undefined, id: string) {
  try {
    if (!profileId) {
      return { success: false, error: "Seleziona un profilo." };
    }

    const supabase = createBrowserSupabaseClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("workout_sessions")
      .update({ deleted_at: now, deleted_reason: "user", paused_at: null })
      .eq("id", id)
      .eq("profile_id", profileId)
      .is("deleted_at", null)
      .select("id")
      .single();

    if (error || !data) {
      return { success: false, error: error?.message ?? "Sessione non trovata." };
    }

    return { success: true, trashed: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Errore spostamento nel cestino." };
  }
}

export async function abandonSession(profileId: string | null | undefined, id: string) {
  if (!profileId) {
    return { success: false, error: "Seleziona un profilo." };
  }

  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from("workout_sessions")
    .update({ deleted_at: new Date().toISOString(), deleted_reason: "user", paused_at: null })
    .eq("id", id)
    .eq("profile_id", profileId)
    .is("deleted_at", null)
    .select("id")
    .single();

  if (error || !data) {
    return { success: false, error: error?.message ?? "Sessione non trovata." };
  }

  return { success: true, session_id: data.id, trashed: true };
}

export async function completeSession(profileId: string | null | undefined, id: string) {
  if (!profileId) {
    return { success: false, error: "Seleziona un profilo." };
  }

  const supabase = createBrowserSupabaseClient();

  const { data: current, error: readError } = await supabase
    .from("workout_sessions")
    .select("id, paused_at, total_paused_seconds")
    .eq("id", id)
    .eq("profile_id", profileId)
    .is("deleted_at", null)
    .single();

  if (readError || !current) {
    return { success: false, error: readError?.message ?? "Sessione non trovata." };
  }

  const pausedAt = current.paused_at ? new Date(current.paused_at).getTime() : null;
  const elapsedPaused = pausedAt && Number.isFinite(pausedAt) ? Math.max(0, Math.round((Date.now() - pausedAt) / 1000)) : 0;

  const { data, error } = await supabase
    .from("workout_sessions")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      paused_at: null,
      total_paused_seconds: Number(current.total_paused_seconds ?? 0) + elapsedPaused,
    })
    .eq("id", id)
    .eq("profile_id", profileId)
    .is("deleted_at", null)
    .select("id")
    .single();

  if (error || !data) {
    return { success: false, error: error?.message ?? "Sessione non trovata." };
  }

  return { success: true, session_id: data.id };
}

export async function pauseSession(profileId: string | null | undefined, id: string) {
  if (!profileId) {
    return { success: false, error: "Seleziona un profilo." };
  }

  const supabase = createBrowserSupabaseClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("workout_sessions")
    .update({ status: "paused", paused_at: now })
    .eq("id", id)
    .eq("profile_id", profileId)
    .eq("status", "in_progress")
    .is("deleted_at", null)
    .select("id, status, paused_at, total_paused_seconds")
    .single();

  if (error || !data) {
    return { success: false, error: error?.message ?? "Sessione in corso non trovata." };
  }

  return { success: true, session: data };
}

export async function resumeSession(profileId: string | null | undefined, id: string) {
  if (!profileId) {
    return { success: false, error: "Seleziona un profilo." };
  }

  const supabase = createBrowserSupabaseClient();

  const { data: session, error: readError } = await supabase
    .from("workout_sessions")
    .select("id, status, paused_at, total_paused_seconds")
    .eq("id", id)
    .eq("profile_id", profileId)
    .is("deleted_at", null)
    .single();

  if (readError || !session) {
    return { success: false, error: readError?.message ?? "Sessione non trovata." };
  }

  const pausedAt = session.paused_at ? new Date(session.paused_at).getTime() : null;
  const elapsed = pausedAt && Number.isFinite(pausedAt) ? Math.max(0, Math.round((Date.now() - pausedAt) / 1000)) : 0;
  const totalPausedSeconds = Number(session.total_paused_seconds ?? 0) + elapsed;

  const { data, error } = await supabase
    .from("workout_sessions")
    .update({ status: "in_progress", paused_at: null, total_paused_seconds: totalPausedSeconds })
    .eq("id", id)
    .eq("profile_id", profileId)
    .select("id, status, paused_at, total_paused_seconds")
    .single();

  if (error || !data) {
    return { success: false, error: error?.message ?? "Sessione non aggiornata." };
  }

  return { success: true, session: data };
}

export async function deletePermanentSession(profileId: string | null | undefined, id: string) {
  if (!profileId) {
    return { success: false, error: "Seleziona un profilo." };
  }

  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from("workout_sessions")
    .delete()
    .eq("id", id)
    .eq("profile_id", profileId)
    .not("deleted_at", "is", null)
    .select("id")
    .single();

  if (error || !data) {
    return { success: false, error: error?.message ?? "Sessione eliminata non trovata." };
  }

  return { success: true };
}

export async function restoreSession(profileId: string | null | undefined, id: string) {
  if (!profileId) {
    return { success: false, error: "Seleziona un profilo." };
  }

  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from("workout_sessions")
    .update({ deleted_at: null, deleted_reason: null })
    .eq("id", id)
    .eq("profile_id", profileId)
    .not("deleted_at", "is", null)
    .select("id")
    .single();

  if (error || !data) {
    return { success: false, error: error?.message ?? "Sessione eliminata non trovata." };
  }

  return { success: true };
}

export async function emptyTrash(profileId: string | null | undefined) {
  try {
    if (!profileId) {
      return { success: false, error: "Non autorizzato" };
    }

    const supabase = createBrowserSupabaseClient();

    const { error } = await supabase
      .from("workout_sessions")
      .delete()
      .eq("profile_id", profileId)
      .not("deleted_at", "is", null);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: "Errore imprevisto" };
  }
}

// Helpers
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
