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

