import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { estimateFallbackDurationFromPlan, estimateWorkoutDurationFromSessions, type SessionLike } from "@/lib/progress";

export async function getWorkoutDayClient(profileId: string, dayId: string) {
  try {
    const supabase = createBrowserSupabaseClient();
    const { data: day, error } = await supabase
      .from("workout_days")
      .select("*, workout_plans!inner(profile_id), exercises(*)")
      .eq("id", dayId)
      .eq("workout_plans.profile_id", profileId)
      .order("exercise_order", { referencedTable: "exercises", ascending: true })
      .single();

    if (error || !day) return null;

    const sortedDay = {
      ...day,
      exercises: [...(day.exercises ?? [])].sort((a: any, b: any) => a.exercise_order - b.exercise_order)
    };

    let estimate = { estimatedSeconds: estimateFallbackDurationFromPlan(sortedDay.exercises), sampleSize: 0, source: "fallback" } as any;
    try {
      const { data: previousSessions } = await supabase
        .from("workout_sessions")
        .select("id, status, started_at, completed_at, workout_day_id, total_paused_seconds")
        .eq("profile_id", profileId)
        .eq("status", "completed")
        .is("deleted_at", null)
        .order("started_at", { ascending: false })
        .limit(80);
      estimate = estimateWorkoutDurationFromSessions(
        (previousSessions ?? []) as SessionLike[],
        dayId,
        estimateFallbackDurationFromPlan(sortedDay.exercises) ?? undefined,
      );
    } catch {
      // ignore
    }

    return { day: sortedDay, estimate };
  } catch {
    return null;
  }
}
