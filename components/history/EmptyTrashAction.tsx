"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, LoaderCircle } from "lucide-react";
import { useAppDialog } from "@/components/ui/AppDialogProvider";

export function EmptyTrashAction({ hasSessions }: { hasSessions: boolean }) {
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const { showDialog, confirmDialog } = useAppDialog();

  if (!hasSessions) return null;

  async function handleEmptyTrash() {
    const accepted = await confirmDialog({
      title: "Svuotare il cestino?",
      message: "Vuoi davvero eliminare definitivamente tutte le sessioni nel cestino? Questa azione non può essere annullata.",
      confirmLabel: "Svuota cestino",
      tone: "danger",
    });

    if (!accepted) return;

    setPending(true);
    try {
      const res = await fetch("/api/workout-sessions/trash", { method: "DELETE" });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Azione non riuscita.");
      }

      router.refresh();
      await showDialog({
        title: "Cestino svuotato",
        message: "Tutte le sessioni sono state eliminate definitivamente.",
        tone: "success",
      });
    } catch (err) {
      await showDialog({
        title: "Errore",
        message: err instanceof Error ? err.message : "Riprova tra poco.",
        tone: "danger",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleEmptyTrash}
      disabled={pending}
      className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-1.5 text-sm font-bold text-red-400 transition hover:bg-red-500/20 active:scale-95 disabled:opacity-50"
    >
      {pending ? <LoaderCircle size={16} className="animate-spin" /> : <Trash2 size={16} />}
      <span>Svuota tutto</span>
    </button>
  );
}
