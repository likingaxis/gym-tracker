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

export async function getArchivePlans(profileId: string) {
  const cacheKey = "getArchivePlans_" + profileId;
  const isOnline = typeof window !== "undefined" && window.navigator.onLine;

  if (isOnline) {
    try {
      const supabase = createBrowserSupabaseClient();
      const [{ data: plans, error: planErr }, { data: sessions }] = await Promise.all([
        supabase
          .from("workout_plans")
          .select("id, name, month, start_date, end_date, is_active, status, color, created_at, archived_at, workout_days(id, exercises(id))")
          .eq("profile_id", profileId)
          .order("is_active", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase
          .from("workout_sessions")
          .select("id, status, workout_plan_id, deleted_at")
          .eq("profile_id", profileId),
      ]);

      if (!planErr && plans) {
        const counts = new Map<string, { total: number; completed: number; active: number; deleted: number }>();
        for (const session of (sessions ?? [])) {
          if (!session.workout_plan_id) continue;
          const current = counts.get(session.workout_plan_id) ?? { total: 0, completed: 0, active: 0, deleted: 0 };
          current.total += 1;
          if (session.deleted_at) current.deleted += 1;
          else if (session.status === "completed") current.completed += 1;
          else current.active += 1;
          counts.set(session.workout_plan_id, current);
        }

        const result = plans.map((plan: any) => ({
          ...plan,
          sessionStats: counts.get(plan.id) ?? { total: 0, completed: 0, active: 0, deleted: 0 },
        }));

        await putInDB("api_cache", { id: cacheKey, data: result });
        return result;
      }
    } catch {
      // Fall through
    }
  }

  const cached = await getFromDB<{ id: string; data: any }>("api_cache", cacheKey);
  return cached?.data ?? [];
}

export async function getActivePlan(profileId: string) {
  const cacheKey = "getActivePlan_" + profileId;
  const isOnline = typeof window !== "undefined" && window.navigator.onLine;

  if (isOnline) {
    try {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from("workout_plans")
        .select("*, workout_days(*, exercises(*))")
        .eq("is_active", true)
        .eq("profile_id", profileId)
        .order("day_order", { referencedTable: "workout_days", ascending: true })
        .order("exercise_order", { referencedTable: "workout_days.exercises", ascending: true })
        .maybeSingle();

      if (!error) {
        await putInDB("api_cache", { id: cacheKey, data });
        return data;
      }
    } catch {
      // Fall through
    }
  }

  const cached = await getFromDB<{ id: string; data: any }>("api_cache", cacheKey);
  return cached?.data ?? null;
}

export async function getCompletedSessionsForWorkout(profileId: string) {
  const cacheKey = "getCompletedSessionsForWorkout_" + profileId;
  const isOnline = typeof window !== "undefined" && window.navigator.onLine;

  if (isOnline) {
    try {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("id, started_at, workout_day_id, workout_days(name)")
        .eq("profile_id", profileId)
        .eq("status", "completed")
        .is("deleted_at", null)
        .order("started_at", { ascending: false })
        .limit(60);

      if (!error && data) {
        await putInDB("api_cache", { id: cacheKey, data });
        return data;
      }
    } catch {
      // Fall through
    }
  }

  const cached = await getFromDB<{ id: string; data: any }>("api_cache", cacheKey);
  return cached?.data ?? [];
}

export async function getWorkoutDayPreview(profileId: string, dayId: string) {
  const cacheKey = "getWorkoutDayPreview_" + profileId + "_" + dayId;
  const isOnline = typeof window !== "undefined" && window.navigator.onLine;

  if (isOnline) {
    try {
      const supabase = createBrowserSupabaseClient();
      const { data: day, error } = await supabase
        .from("workout_days")
        .select("*, workout_plans!inner(profile_id, name), exercises(*)")
        .eq("id", dayId)
        .eq("workout_plans.profile_id", profileId)
        .order("exercise_order", { referencedTable: "exercises", ascending: true })
        .single();

      if (!error && day) {
        await putInDB("api_cache", { id: cacheKey, data: day });
        return day;
      }
    } catch {
      // Fall through
    }
  }

  const cached = await getFromDB<{ id: string; data: any }>("api_cache", cacheKey);
  return cached?.data ?? null;
}
