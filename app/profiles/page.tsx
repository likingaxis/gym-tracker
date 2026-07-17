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
      <section className="app-hero">
        <header className="text-center">
          <p className="technical-label">Profili</p>
          <h1 className="page-title mt-2">Chi si allena?</h1>
        </header>
      </section>
      <ProfileSelector initialProfiles={profiles} />
    </div>
  );
}
