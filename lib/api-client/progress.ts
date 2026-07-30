import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { putInDB, getFromDB } from "@/lib/db/indexeddb";

export async function getProgressSessions(profileId: string) {
  const cacheKey = "getProgressSessions_" + profileId;
  const isOnline = typeof window !== "undefined" && window.navigator.onLine;

  if (isOnline) {
    try {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("id, status, started_at, completed_at, workout_day_id, total_paused_seconds, workout_days(name), workout_plans(name, month), session_exercises(completed, exercises(name, exercise_db_id, muscle_group), exercise_sets(completed, reps, weight, rpe, set_number))")
        .eq("profile_id", profileId)
        .eq("status", "completed")
        .is("deleted_at", null)
        .order("started_at", { ascending: false })
        .limit(180);

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

export async function getProfileData(profileId: string) {
  const cacheKey = "getProfileData_" + profileId;
  const isOnline = typeof window !== "undefined" && window.navigator.onLine;

  if (isOnline) {
    try {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from("app_profiles")
        .select("id, gender, birth_date, height_cm, weight_kg")
        .eq("id", profileId)
        .single();

      if (!error && data) {
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

export async function getBodyWeightLogs(profileId: string) {
  const cacheKey = "getBodyWeightLogs_" + profileId;
  const isOnline = typeof window !== "undefined" && window.navigator.onLine;

  if (isOnline) {
    try {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from("body_weight_logs")
        .select("weight_kg, logged_at")
        .eq("profile_id", profileId)
        .order("logged_at", { ascending: true });

      if (!error && data) {
        const formatted = data.map((log: any) => ({
          weight: log.weight_kg,
          date: log.logged_at,
        }));
        await putInDB("api_cache", { id: cacheKey, data: formatted });
        return formatted;
      }
    } catch {
      // Fall through
    }
  }

  const cached = await getFromDB<{ id: string; data: any }>("api_cache", cacheKey);
  return cached?.data ?? [];
}
