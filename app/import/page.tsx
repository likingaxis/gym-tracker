export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { ImportUploader } from "@/components/import/ImportUploader";
import { getSelectedProfileId } from "@/lib/profiles";

export default async function ImportPage() {
  const profileId = await getSelectedProfileId();
  if (!profileId) redirect("/profiles");

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-gym-accent">Import</p>
        <h1 className="mt-2 text-4xl font-black">Nuova scheda</h1>
        <p className="mt-2 text-gym-muted">Carica un JSON con giorni, esercizi, consigli e link video.</p>
        <Link href="/profiles" className="mt-3 inline-block rounded-2xl bg-white/10 px-3 py-2 text-sm font-bold text-slate-200">Cambia profilo</Link>
      </header>
      <ImportUploader />
    </div>
  );
}
