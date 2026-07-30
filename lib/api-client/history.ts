import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { putInDB, getFromDB } from "@/lib/db/indexeddb";

export async function getSessionDetail(profileId: string, sessionId: string) {
  const cacheKey = "getSessionDetail_" + profileId + "_" + sessionId;
  const isOnline = typeof window !== "undefined" && window.navigator.onLine;

  if (isOnline) {
    try {
      const supabase = createBrowserSupabaseClient();
      const { data: session, error } = await supabase
        .from("workout_sessions")
        .select("*, workout_plans(name, month, color), workout_days(name), session_exercises(*, exercises(*), exercise_sets(*))")
        .eq("id", sessionId)
        .eq("profile_id", profileId)
        .single();
        
      if (!error && session) {
        const result = session;
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

export async function getHistoryPlans(profileId: string) {
  const cacheKey = "getHistoryPlans_" + profileId;
  const isOnline = typeof window !== "undefined" && window.navigator.onLine;

  if (isOnline) {
    try {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from("workout_plans")
        .select("id, name, month, is_active, status, color, created_at")
        .eq("profile_id", profileId)
        .order("is_active", { ascending: false })
        .order("created_at", { ascending: false });

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

export async function getMonthSessions(profileId: string, month: string, planId: string | null) {
  const cacheKey = "getMonthSessions_" + profileId + "_" + month + "_" + (planId ?? "all");
  const isOnline = typeof window !== "undefined" && window.navigator.onLine;

  if (isOnline) {
    try {
      const supabase = createBrowserSupabaseClient();
      const [year, monthIndex] = month.split("-").map(Number);
      const start = new Date(year, monthIndex - 1, 1);
      const end = new Date(year, monthIndex, 1);

      let query = supabase
        .from("workout_sessions")
        .select("id, status, started_at, completed_at, workout_plan_id, workout_day_id, workout_plan_name_snapshot, workout_day_name_snapshot, workout_plan_color_snapshot, workout_days(name), workout_plans(name, month, color), session_exercises(completed, exercise_sets(completed, reps, weight, rpe))")
        .eq("profile_id", profileId)
        .is("deleted_at", null)
        .gte("started_at", start.toISOString())
        .lt("started_at", end.toISOString())
        .order("started_at", { ascending: true });

      if (planId) query = query.eq("workout_plan_id", planId);

      const { data, error } = await query;
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

export async function getHistorySessions(profileId: string, filter: string, planId: string | null) {
  const cacheKey = "getHistorySessions_" + profileId + "_" + filter + "_" + (planId ?? "all");
  const isOnline = typeof window !== "undefined" && window.navigator.onLine;

  if (isOnline) {
    try {
      const supabase = createBrowserSupabaseClient();
      let query = supabase
        .from("workout_sessions")
        .select("*, workout_plans(name, month, color), workout_days(name), session_exercises(completed, exercise_sets(completed, reps, weight, rpe))")
        .eq("profile_id", profileId)
        .is("deleted_at", null)
        .order("started_at", { ascending: false })
        .limit(80);

      if (filter !== "all") query = query.eq("status", filter);
      if (planId) query = query.eq("workout_plan_id", planId);

      const { data, error } = await query;
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

export async function getDeletedSessions(profileId: string) {
  const cacheKey = "getDeletedSessions_" + profileId;
  const isOnline = typeof window !== "undefined" && window.navigator.onLine;

  if (isOnline) {
    try {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("*, workout_plans(name, month, color), workout_days(name), session_exercises(completed, exercise_sets(completed, reps, weight, rpe))")
        .eq("profile_id", profileId)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false })
        .limit(80);

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
