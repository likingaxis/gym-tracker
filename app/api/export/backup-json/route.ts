import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSelectedProfileId } from "@/lib/profiles";

export async function GET() {
  const profileId = await getSelectedProfileId();

  if (!profileId) {
    return NextResponse.json({ success: false, error: "Seleziona un profilo." }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  const { data: profile, error: profileError } = await supabase
    .from("app_profiles")
    .select("id, name, avatar_emoji, color, pin_enabled, created_at")
    .eq("id", profileId)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json({ success: false, error: profileError?.message ?? "Profilo non trovato." }, { status: 404 });
  }

  const { data: workoutPlans } = await supabase
    .from("workout_plans")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: true });

  const planIds = (workoutPlans ?? []).map((plan: any) => plan.id);

  const { data: workoutDays } = planIds.length
    ? await supabase.from("workout_days").select("*").in("workout_plan_id", planIds).order("day_order", { ascending: true })
    : { data: [] } as any;

  const dayIds = (workoutDays ?? []).map((day: any) => day.id);

  const { data: exercises } = dayIds.length
    ? await supabase.from("exercises").select("*").in("workout_day_id", dayIds).order("exercise_order", { ascending: true })
    : { data: [] } as any;

  const { data: workoutSessions } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("profile_id", profileId)
    .order("started_at", { ascending: true });

  const sessionIds = (workoutSessions ?? []).map((session: any) => session.id);

  const { data: sessionExercises } = sessionIds.length
    ? await supabase.from("session_exercises").select("*").in("workout_session_id", sessionIds)
    : { data: [] } as any;

  const sessionExerciseIds = (sessionExercises ?? []).map((item: any) => item.id);

  const { data: exerciseSets } = sessionExerciseIds.length
    ? await supabase.from("exercise_sets").select("*").in("session_exercise_id", sessionExerciseIds).order("set_number", { ascending: true })
    : { data: [] } as any;

  const backup = {
    app: "gym-tracker-app",
    version: "0.14",
    exported_at: new Date().toISOString(),
    profile,
    workout_plans: workoutPlans ?? [],
    workout_days: workoutDays ?? [],
    exercises: exercises ?? [],
    workout_sessions: workoutSessions ?? [],
    session_exercises: sessionExercises ?? [],
    exercise_sets: exerciseSets ?? []
  };

  const fileName = `backup-${slugify(profile.name)}-${new Date().toISOString().slice(0, 10)}.json`;

  return new Response(JSON.stringify(backup, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${fileName}"`,
      "cache-control": "no-store"
    }
  });
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "profilo";
}
