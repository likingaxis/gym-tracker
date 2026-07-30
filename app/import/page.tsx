"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ImportUploader } from "@/components/import/ImportUploader";
import { Loader2 } from "lucide-react";

export default function ImportPage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const profileId = typeof window !== "undefined" ? localStorage.getItem("active_profile_id") : null;
    if (!profileId) {
      router.push("/profiles");
    } else {
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gym-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <header>
        <p className="technical-label">Nuova scheda</p>
        <h1 className="page-title mt-1">Importa</h1>
      </header>
      <ImportUploader />
    </div>
  );
}
