export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSelectedProfileId } from "@/lib/profiles";
import { BodyForm } from "./BodyForm";

export default async function BodySettingsPage() {
  const profileId = await getSelectedProfileId();
  if (!profileId) redirect("/profiles");

  const supabase = createServerSupabaseClient();
  const { data: profile } = await supabase
    .from("app_profiles")
    .select("id, gender, birth_date, height_cm, weight_kg")
    .eq("id", profileId)
    .single();

  if (!profile) redirect("/profiles");

  return (
    <div className="space-y-6">
      <Link href="/settings" className="inline-flex items-center gap-2 text-sm font-extrabold text-[#c65f37] hover:underline transition-all">
        <ArrowLeft size={16} /> Impostazioni
      </Link>

      <header>
        <h1 className="text-3xl font-extrabold leading-none text-white">Dati Fisici</h1>
        <p className="mt-2 text-sm font-medium text-gym-muted">
          Inserisci i tuoi dati fisici per sbloccare le statistiche avanzate come il calcolo del Normopeso (BMI) e la Forza Relativa nei progressi.
        </p>
      </header>

      <section className="app-row flex-col items-stretch !p-6 border-[#c65f37]/20 shadow-xl">
        <BodyForm profileId={profile.id} initialData={profile} />
      </section>
    </div>
  );
}
