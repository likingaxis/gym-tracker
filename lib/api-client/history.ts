import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export async function getSessionDetail(profileId: string, sessionId: string) {
  try {
    const supabase = createBrowserSupabaseClient();
    const { data: session, error } = await supabase
      .from("workout_sessions")
      .select("*, workout_plans(name, month, color), workout_days(name), session_exercises(*, exercises(*), exercise_sets(*))")
      .eq("id", sessionId)
      .eq("profile_id", profileId)
      .single();
      
    if (error || !session) return null;
    return session;
  } catch {
    return null;
  }
}
