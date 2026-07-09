export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { PinSettings } from "@/components/profiles/PinSettings";
import { DataManagement } from "@/components/settings/DataManagement";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSelectedProfileId } from "@/lib/profiles";

async function getSelectedProfile() {
  const profileId = await getSelectedProfileId();
  if (!profileId) return null;

  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("app_profiles")
    .select("id, name, avatar_emoji, pin_enabled")
    .eq("id", profileId)
    .maybeSingle();

  return data;
}

export default async function SettingsPage() {
  const profile = await getSelectedProfile();
  if (!profile) redirect("/profiles");

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-semibold text-gym-info">Impostazioni</p>
        <h1 className="mt-2 text-3xl font-extrabold">App e dati</h1>
        <p className="mt-2 text-gym-muted">Profilo attivo: {profile.avatar_emoji || "🏋️"} {profile.name}</p>
      </header>

      <Card>
        <p className="text-xs font-semibold text-gym-info">Profilo</p>
        <h2 className="mt-1 text-xl font-extrabold">Gestisci utente</h2>
        <p className="mt-2 text-gym-muted">Cambia profilo o crea un nuovo utente per separare schede e storico.</p>
        <Link href="/profiles" className="mt-4 inline-block w-full rounded-2xl bg-white/10 px-4 py-3 text-center text-sm font-extrabold text-slate-100">Gestisci profili</Link>
      </Card>

      <Card>
        <p className="text-xs font-semibold text-gym-info">Sicurezza</p>
        <h2 className="mt-1 text-xl font-extrabold">PIN profilo</h2>
        <div className="mt-4">
          <PinSettings profile={profile} />
        </div>
      </Card>

      <Card>
        <p className="text-xs font-semibold text-gym-info">Scheda</p>
        <h2 className="mt-1 text-xl font-extrabold">Scheda mensile</h2>
        <p className="mt-2 text-gym-muted">Importa o sostituisci la scheda attiva quando il personal trainer ti manda il nuovo JSON.</p>
        <Link href="/import" className="mt-4 inline-block w-full rounded-2xl bg-gym-accent px-4 py-3 text-center text-sm font-extrabold text-slate-950">Importa nuova scheda</Link>
      </Card>

      <Card variant="info">
        <p className="text-xs font-semibold text-gym-info">Backup e reset</p>
        <h2 className="mt-1 text-xl font-extrabold">Dati del profilo</h2>
        <p className="mt-2 text-gym-muted">Scarica una copia dei dati prima di usare azioni irreversibili.</p>
        <div className="mt-4">
          <DataManagement profileName={profile.name} />
        </div>
      </Card>

      <Card>
        <p className="text-xs font-semibold text-gym-info">Info app</p>
        <h2 className="mt-1 text-xl font-extrabold">Gym Tracker</h2>
        <p className="mt-2 text-gym-muted">Versione app: v0.18.2</p>
        <p className="mt-1 text-sm text-gym-muted">Novità: gerarchia visiva più chiara, colori semantici, timer più pulito e allenamento più leggibile.</p>
      </Card>
    </div>
  );
}
