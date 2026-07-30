import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { hashPin, verifyPin } from "@/lib/pin";
import { putInDB, getFromDB } from "@/lib/db/indexeddb";

export async function getProfiles() {
  const cacheKey = "getProfiles";
  const isOnline = typeof window !== "undefined" && window.navigator.onLine;

  if (isOnline) {
    try {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from("app_profiles")
        .select("id, name, avatar_emoji, color, pin_enabled, created_at")
        .order("created_at", { ascending: true });

      if (!error) {
        const result = { success: true, profiles: data ?? [] };
        await putInDB("api_cache", { id: cacheKey, data: result });
        return result;
      }
    } catch {
      // Fall through to offline cache
    }
  }

  const cached = await getFromDB<{ id: string; data: any }>("api_cache", cacheKey);
  if (cached) return cached.data;
  return { success: false, error: "Errore caricamento profili." };
}


export async function createProfile(body: { name?: string; avatar_emoji?: string; color?: string }) {
  try {
    const name = body.name?.trim();

    if (!name) {
      return { success: false, error: "Il nome profilo è obbligatorio." };
    }

    const supabase = createBrowserSupabaseClient();
    const { data, error } = await supabase
      .from("app_profiles")
      .insert({
        name,
        avatar_emoji: body.avatar_emoji?.trim() || "🏋️",
        color: body.color?.trim() || "lime",
        pin_enabled: false,
      })
      .select("id, name, avatar_emoji, color, pin_enabled, created_at")
      .single();

    if (error || !data) {
      return { success: false, error: error?.message ?? "Errore creazione profilo." };
    }

    return { success: true, profile: data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Errore creazione profilo." };
  }
}

export async function setProfilePin(profileId: string, action: "set" | "remove" | "verify", pin?: string) {
  const supabase = createBrowserSupabaseClient();
  
  if (action === "set") {
    if (!pin || pin.length !== 4) return { success: false, error: "PIN non valido." };
    const hashed = await hashPin(pin);
    const { error } = await supabase.from("app_profiles").update({ pin_hash: hashed, pin_enabled: true }).eq("id", profileId);
    return error ? { success: false, error: error.message } : { success: true };
  } else if (action === "remove") {
    const { error } = await supabase.from("app_profiles").update({ pin_hash: null, pin_enabled: false }).eq("id", profileId);
    return error ? { success: false, error: error.message } : { success: true };
  } else if (action === "verify") {
    if (!pin) return { success: false, error: "PIN mancante." };
    const { data, error } = await supabase.from("app_profiles").select("pin_hash").eq("id", profileId).single();
    if (error) return { success: false, error: error.message };
    const isValid = await verifyPin(pin, data.pin_hash);
    if (!isValid) return { success: false, error: "PIN errato." };
    return { success: true };
  }
  return { success: false, error: "Azione non valida." };
}

export async function selectProfile(profileId: string, pin?: string) {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase.from("app_profiles").select("pin_enabled, pin_hash").eq("id", profileId).single();
  if (error || !data) return { success: false, error: "Profilo non trovato." };

  if (data.pin_enabled) {
    if (!pin) return { success: false, error: "PIN obbligatorio." };
    const isValid = await verifyPin(pin, data.pin_hash);
    if (!isValid) return { success: false, error: "PIN non corretto." };
  }

  if (typeof window !== "undefined") {
    localStorage.setItem("active_profile_id", profileId);
  }
  return { success: true };
}

export async function lockProfile() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("active_profile_id");
  }
  return { success: true };
}
