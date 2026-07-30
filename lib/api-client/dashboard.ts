import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { putInDB, getFromDB } from "@/lib/db/indexeddb";

export async function getSelectedProfile(profileId: string) {
  const cacheKey = "getSelectedProfile_" + profileId;
  const isOnline = typeof window !== "undefined" && window.navigator.onLine;

  if (isOnline) {
    try {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from("app_profiles")
        .select("id, name, avatar_emoji")
        .eq("id", profileId)
        .maybeSingle();

      if (!error) {
        const result = data;
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

export async function getActivePlan(profileId: string) {
  const cacheKey = "getActivePlan_" + profileId;
  const isOnline = typeof window !== "undefined" && window.navigator.onLine;

  if (isOnline) {
    try {
      const supabase = createBrowserSupabaseClient();
      const { data: plan, error } = await supabase
        .from("workout_plans")
        .select("*, workout_days(*, exercises(*))")
        .eq("is_active", true)
        .eq("profile_id", profileId)
        .order("day_order", { referencedTable: "workout_days", ascending: true })
        .order("exercise_order", { referencedTable: "workout_days.exercises", ascending: true })
        .maybeSingle();

      if (!error) {
        const result = plan;
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

export async function getCompletedSessions(profileId: string) {
  const cacheKey = "getCompletedSessions_" + profileId;
  const isOnline = typeof window !== "undefined" && window.navigator.onLine;

  if (isOnline) {
    try {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("id, status, started_at, completed_at, workout_day_id, total_paused_seconds, workout_plan_name_snapshot, workout_day_name_snapshot, workout_plan_color_snapshot, workout_days(name), workout_plans(name, month, color), session_exercises(completed, exercises(name, exercise_db_id, muscle_group), exercise_sets(completed, reps, weight, rpe, set_number))")
        .eq("profile_id", profileId)
        .eq("status", "completed")
        .is("deleted_at", null)
        .order("started_at", { ascending: false })
        .limit(80);

      if (!error) {
        const result = data ?? [];
        await putInDB("api_cache", { id: cacheKey, data: result });
        return result;
      }
    } catch {
      // Fall through to offline cache
    }
  }

  const cached = await getFromDB<{ id: string; data: any }>("api_cache", cacheKey);
  if (cached) return cached.data;
  return [];
}

