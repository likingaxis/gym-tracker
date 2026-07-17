export const dynamic = "force-dynamic";

import Link from "next/link";
import type { ReactNode } from "react";
import { Archive, ChevronRight, DatabaseBackup, FileText, Shield, UserRound } from "lucide-react";
import { redirect } from "next/navigation";
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
    <div className="space-y-6">
      <header className="app-hero">
        <p className="technical-label text-gym-warning">Profilo attivo</p>
        <h1 className="mt-3 text-4xl font-extrabold leading-none text-white">Impostazioni</h1>
        <p className="mt-3 text-base text-white/65">{profile.avatar_emoji || "🏋️"} {profile.name}</p>
      </header>

      <section className="section-block border-t-0 pt-0">
        <p className="technical-label">Profilo</p>
        <div className="app-list mt-3">
          <SettingsLink href="/profiles" icon={<UserRound size={18} />} title="Gestisci profili" description="Profilo attivo e accesso." />
          <div className="p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="icon-action"><Shield size={18} /></div>
              <div>
                <h2 className="font-extrabold text-gym-soft">PIN profilo</h2>
                <p className="text-sm text-gym-muted">{profile.pin_enabled ? "Attivo" : "Non attivo"}</p>
              </div>
            </div>
            <PinSettings profile={profile} />
          </div>
        </div>
      </section>

      <section className="section-block">
        <p className="technical-label">Schede</p>
        <div className="app-list mt-3">
          <SettingsLink href="/import" icon={<FileText size={18} />} title="Importa nuova scheda" description="Carica e attiva un nuovo programma." strong />
          <SettingsLink href="/workout/archive" icon={<Archive size={18} />} title="Schede archiviate" description="Consulta programmi precedenti." />
        </div>
      </section>

      <section className="section-block">
        <p className="technical-label">Dati</p>
        <div className="app-list mt-3 p-4">
          <div className="mb-4 flex items-center gap-3">
            <div className="icon-action"><DatabaseBackup size={18} /></div>
            <div>
              <h2 className="font-extrabold text-gym-soft">Backup e manutenzione</h2>
              <p className="text-sm text-gym-muted">Esporta, ripristina o elimina dati.</p>
            </div>
          </div>
          <DataManagement profileName={profile.name} />
        </div>
      </section>

      <section className="section-block">
        <p className="technical-label">Info</p>
        <div className="app-list mt-3 p-4">
          <h2 className="font-extrabold text-gym-soft">Gym Tracker</h2>
          <p className="mt-1 text-sm text-gym-muted">Versione app: v0.26.5</p>
          <p className="mt-1 text-xs text-gym-muted">Widget persistenti, dialoghi nativi e gerarchia aggiornata.</p>
        </div>
      </section>
    </div>
  );
}

function SettingsLink({ href, icon, title, description, strong }: { href: string; icon: ReactNode; title: string; description: string; strong?: boolean }) {
  return (
    <Link href={href} className="app-row transition active:scale-[0.99]">
      <div className={strong ? "icon-action border-gym-accent/40 bg-gym-accent/15 text-gym-accent" : "icon-action"}>{icon}</div>
      <div className="min-w-0 flex-1">
        <h2 className="font-extrabold text-gym-soft">{title}</h2>
        <p className="mt-1 text-sm text-gym-muted">{description}</p>
      </div>
      <ChevronRight size={18} className="text-gym-muted" />
    </Link>
  );
}
