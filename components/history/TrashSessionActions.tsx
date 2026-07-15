"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAppDialog } from "@/components/ui/AppDialogProvider";

type Props = {
  sessionId: string;
};

export function TrashSessionActions({ sessionId }: Props) {
  const router = useRouter();
  const { confirmDialog } = useAppDialog();
  const [pending, setPending] = useState<"restore" | "permanent" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: "restore" | "permanent") {
    setError(null);

    const confirmed = await confirmDialog({
      title: action === "restore" ? "Ripristinare la sessione?" : "Eliminare definitivamente?",
      message: action === "restore" ? "La sessione tornerà nello storico." : "Questa azione non può essere annullata.",
      confirmLabel: action === "restore" ? "Ripristina" : "Elimina per sempre",
      tone: action === "restore" ? "success" : "danger",
    });
    if (!confirmed) return;

    setPending(action);
    const endpoint = action === "restore" ? `/api/workout-sessions/${sessionId}/restore` : `/api/workout-sessions/${sessionId}/permanent`;
    const response = await fetch(endpoint, { method: action === "restore" ? "POST" : "DELETE" });
    const data = await response.json().catch(() => null);
    setPending(null);

    if (!response.ok || !data?.success) {
      setError(data?.error ?? "Operazione non riuscita.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-2">
      {error ? <p className="rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</p> : null}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => run("restore")}
          className="rounded-2xl bg-gym-accent px-4 py-3 text-sm font-extrabold text-slate-950 disabled:opacity-50"
        >
          {pending === "restore" ? "Ripristino..." : "Ripristina"}
        </button>
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => run("permanent")}
          className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-extrabold text-red-100 disabled:opacity-50"
        >
          {pending === "permanent" ? "Elimino..." : "Elimina per sempre"}
        </button>
      </div>
    </div>
  );
}
