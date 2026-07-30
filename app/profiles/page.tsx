"use client";

import { useEffect, useState } from "react";
import { ProfileSelector } from "@/components/profiles/ProfileSelector";
import { getProfiles } from "@/lib/api-client/profiles";

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfiles() {
      const res = await getProfiles();
      if (res.success) {
        setProfiles(res.profiles || []);
      }
      setLoading(false);
    }
    loadProfiles();
  }, []);

  if (loading) {
    return <div className="p-6 text-center text-gym-muted">Caricamento profili...</div>;
  }

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

