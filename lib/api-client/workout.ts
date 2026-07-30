import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { estimateFallbackDurationFromPlan, estimateWorkoutDurationFromSessions, type SessionLike } from "@/lib/progress";
import { putInDB, getFromDB } from "@/lib/db/indexeddb";

export async function getWorkoutDayClient(profileId: string, dayId: string) {
  const cacheKey = "getWorkoutDayClient_" + profileId + "_" + dayId;
  const isOnline = typeof window !== "undefined" && window.navigator.onLine;

  if (isOnline) {
    try {
      const supabase = createBrowserSupabaseClient();
      const { data: day, error } = await supabase
        .from("workout_days")
        .select("*, workout_plans!inner(profile_id), exercises(*)")
        .eq("id", dayId)
        .eq("workout_plans.profile_id", profileId)
        .order("exercise_order", { referencedTable: "exercises", ascending: true })
        .single();

      if (!error && day) {
        const sortedDay = {
          ...day,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          exercises: [...(day.exercises ?? [])].sort((a: any, b: any) => a.exercise_order - b.exercise_order)
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

        const result = { day: sortedDay, estimate };
        await putInDB("api_cache", { id: cacheKey, data: result });
        return result;
      }
    } catch {
      // Fall through to offline cache
    }
  }

  const cached = await getFromDB<{ id: string; data: any }>("api_cache", cacheKey);
  if (cached) return cached.data;
  return null;
}

