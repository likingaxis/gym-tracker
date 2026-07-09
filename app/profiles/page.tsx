export const dynamic = "force-dynamic";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ProfileSelector } from "@/components/profiles/ProfileSelector";

async function getProfiles() {
  try {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from("app_profiles")
      .select("id, name, avatar_emoji, color, pin_enabled, created_at")
      .order("created_at", { ascending: true });
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function ProfilesPage() {
  const profiles = await getProfiles();

  return (
    <div className="space-y-6 py-6">
      <header className="text-center">
        <p className="text-sm font-semibold text-gym-info">Profili</p>
        <h1 className="mt-3 text-3xl font-extrabold">Chi si allena oggi?</h1>
        <p className="mt-2 text-gym-muted">
          Ogni profilo ha scheda, sessioni e storico separati.
        </p>
      </header>
      <ProfileSelector initialProfiles={profiles} />
    </div>
  );
}
