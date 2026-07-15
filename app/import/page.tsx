export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { ImportUploader } from "@/components/import/ImportUploader";
import { getSelectedProfileId } from "@/lib/profiles";

export default async function ImportPage() {
  const profileId = await getSelectedProfileId();
  if (!profileId) redirect("/profiles");

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
