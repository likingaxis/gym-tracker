"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Archive, ChevronRight, DatabaseBackup, FileText, Shield, UserRound, Trash2 } from "lucide-react";
import { PinSettings } from "@/components/profiles/PinSettings";
import { DataManagement } from "@/components/settings/DataManagement";
import { getSettingsProfile } from "@/lib/api-client/settings";

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      const profileId = localStorage.getItem("active_profile_id");
      if (!profileId) {
        router.push("/profiles");
        return;
      }

      const data = await getSettingsProfile(profileId);
      if (!data) {
        router.push("/profiles");
        return;
      }

      setProfile(data);
      setLoading(false);
    }

    loadData();
  }, [router]);

  if (loading) {
    return <div className="p-6 text-center text-gym-muted">Caricamento impostazioni...</div>;
  }

  if (!profile) return null;

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
          <SettingsLink href="/settings/body" icon={<UserRound size={18} />} title="Dati Fisici" description="Peso, altezza, età e sesso." />
          <div className="p-4 border-t border-white/5">
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
        <p className="technical-label">Dati e Archiviazione</p>
        <div className="app-list mt-3">
          <SettingsLink href="/history/trash" icon={<Trash2 size={18} />} title="Cestino" description="Recupera o elimina definitivamente gli allenamenti." />
          <div className="p-4 border-t border-white/5">
            <div className="mb-4 flex items-center gap-3">
              <div className="icon-action"><DatabaseBackup size={18} /></div>
              <div>
                <h2 className="font-extrabold text-gym-soft">Backup e manutenzione</h2>
                <p className="text-sm text-gym-muted">Esporta, ripristina o elimina dati.</p>
              </div>
            </div>
            <DataManagement profileName={profile.name} />
          </div>
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
