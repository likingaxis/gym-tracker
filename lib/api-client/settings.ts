import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { putInDB, getFromDB } from "@/lib/db/indexeddb";

export async function getBodySettingsProfile(profileId: string) {
  const cacheKey = "getBodySettingsProfile_" + profileId;
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

export async function getSettingsProfile(profileId: string) {
  const cacheKey = "getSettingsProfile_" + profileId;
  const isOnline = typeof window !== "undefined" && window.navigator.onLine;

  if (isOnline) {
    try {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from("app_profiles")
        .select("id, name, avatar_emoji, pin_enabled")
        .eq("id", profileId)
        .maybeSingle();

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
