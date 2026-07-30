"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BodyForm } from "./BodyForm";
import { getBodySettingsProfile } from "@/lib/api-client/settings";

export default function BodySettingsPage() {
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

      const data = await getBodySettingsProfile(profileId);
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
    return <div className="p-6 text-center text-gym-muted">Caricamento dati fisici...</div>;
  }

  if (!profile) return null;

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
