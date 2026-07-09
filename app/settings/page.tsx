export const dynamic = "force-dynamic";

import Link from "next/link";
import { DatabaseBackup, FileText, Shield, UserRound } from "lucide-react";
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
        <p className="mt-2 text-gym-muted">{profile.avatar_emoji || "🏋️"} {profile.name}</p>
      </header>

      <Card>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-slate-300"><UserRound size={18} /></div>
          <div>
            <p className="text-sm font-semibold text-gym-info">Profilo</p>
            <h2 className="mt-1 text-xl font-extrabold">Gestisci profili</h2>
            <p className="mt-2 text-sm text-gym-muted">Separa schede e storico per ogni utente.</p>
          </div>
        </div>
        <Link href="/profiles" className="mt-4 inline-block w-full rounded-2xl bg-white/10 px-4 py-3 text-center text-sm font-extrabold text-slate-100">Apri profili</Link>
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-slate-300"><Shield size={18} /></div>
          <div>
            <p className="text-sm font-semibold text-gym-info">Sicurezza</p>
            <h2 className="mt-1 text-xl font-extrabold">PIN profilo</h2>
          </div>
        </div>
        <div className="mt-4">
          <PinSettings profile={profile} />
        </div>
      </Card>

      <Card>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-slate-300"><FileText size={18} /></div>
          <div>
            <p className="text-sm font-semibold text-gym-info">Scheda</p>
            <h2 className="mt-1 text-xl font-extrabold">Scheda mensile</h2>
            <p className="mt-2 text-sm text-gym-muted">Carica il nuovo JSON quando cambia la scheda.</p>
          </div>
        </div>
        <Link href="/import" className="mt-4 inline-block w-full rounded-2xl bg-gym-accent px-4 py-3 text-center text-sm font-extrabold text-slate-950">Importa nuova scheda</Link>
      </Card>

      <Card variant="info">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-400/15 text-sky-200"><DatabaseBackup size={18} /></div>
          <div>
            <p className="text-sm font-semibold text-gym-info">Backup</p>
            <h2 className="mt-1 text-xl font-extrabold">I tuoi dati</h2>
            <p className="mt-2 text-sm text-gym-muted">Scarica una copia prima di fare reset.</p>
          </div>
        </div>
        <div className="mt-4">
          <DataManagement profileName={profile.name} />
        </div>
      </Card>

      <Card>
        <p className="text-sm font-semibold text-gym-info">Info app</p>
        <h2 className="mt-1 text-xl font-extrabold">Gym Tracker</h2>
        <p className="mt-2 text-gym-muted">Versione app: v0.22.3</p>
        <p className="mt-1 text-sm text-gym-muted">Polish UI e testi più puliti.</p>
      </Card>
    </div>
  );
}
