"use client";

import { AlertTriangle, Download, FileDown, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";
import { useAppDialog } from "@/components/ui/AppDialogProvider";

type ResetAction = "trash_open_sessions" | "trash_sessions" | "empty_trash" | "delete_workout_data";

type DataManagementProps = {
  profileName: string;
};

const RESET_ACTIONS: Record<ResetAction, { label: string; description: string; confirm: string; danger?: boolean }> = {
  trash_open_sessions: {
    label: "Elimina sessioni aperte",
    description: "Sposta allenamenti in corso o in pausa nel cestino. Puoi recuperarli.",
    confirm: "Vuoi spostare nel cestino tutti gli allenamenti aperti di questo profilo?"
  },
  trash_sessions: {
    label: "Sposta storico nel cestino",
    description: "Nasconde tutte le sessioni dallo storico normale. Puoi ripristinarle dal cestino.",
    confirm: "Vuoi spostare tutto lo storico allenamenti nel cestino?",
    danger: true
  },
  empty_trash: {
    label: "Svuota cestino",
    description: "Elimina definitivamente le sessioni gia nel cestino.",
    confirm: "Vuoi eliminare definitivamente tutte le sessioni nel cestino? Questa azione non si puo annullare.",
    danger: true
  },
  delete_workout_data: {
    label: "Elimina schede",
    description: "Elimina schede e sessioni collegate. Scarica un backup prima di continuare.",
    confirm: "Vuoi eliminare definitivamente schede e dati collegati di questo profilo? Scarica un backup prima di continuare.",
    danger: true
  }
};

export function DataManagement({ profileName }: DataManagementProps) {
  const router = useRouter();
  const { confirmDialog } = useAppDialog();
  const [pendingAction, setPendingAction] = useState<ResetAction | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runReset(action: ResetAction) {
    const config = RESET_ACTIONS[action];
    setStatus(null);
    setError(null);

    const accepted = await confirmDialog({ title: "Conferma operazione", message: config.confirm, confirmLabel: "Continua", tone: "danger" });
    if (!accepted) return;

    setPendingAction(action);

    try {
      const response = await fetch("/api/profile-data/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action })
      });

      let data: any = null;
      try {
        const text = await response.text();
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (!response.ok) {
        setError(data?.error ?? "Operazione non riuscita.");
        return;
      }

      setStatus(`Fatto. Elementi interessati: ${data?.affected ?? 0}.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore di rete.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="divide-y divide-gym-line rounded-lg border border-white/10 bg-black/10">
        <DataLink href="/api/export/history-csv" icon={<FileDown size={17} />} title="Esporta CSV" description="Storico allenamenti in formato tabellare." />
        <DataLink href="/api/export/backup-json" icon={<Download size={17} />} title="Scarica backup JSON" description={`Copia completa del profilo ${profileName}.`} />
        <DataLink href="/history/trash" icon={<Trash2 size={17} />} title="Cestino" description="Sessioni eliminate, ripristino e svuotamento." />
      </div>

      {status ? <p className="rounded-lg border border-gym-accent/35 bg-gym-accent/10 px-4 py-3 text-sm text-gym-accent">{status}</p> : null}
      {error ? <p className="rounded-lg border border-gym-danger/35 bg-gym-danger/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}

      <details className="rounded-lg border border-gym-danger/35 bg-gym-danger/10 p-4">
        <summary className="cursor-pointer list-none">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="icon-action border-gym-danger/40 bg-gym-danger/10 text-red-100">
                <AlertTriangle size={18} />
              </div>
              <div>
                <p className="font-extrabold text-red-100">Zona pericolosa</p>
                <p className="text-xs text-red-100/70">Azioni distruttive o di manutenzione massiva.</p>
              </div>
            </div>
            <span className="rounded-lg border border-gym-danger/30 px-3 py-1 text-xs font-bold text-red-100">Mostra</span>
          </div>
        </summary>
        <div className="mt-4 divide-y divide-gym-danger/25">
          {Object.entries(RESET_ACTIONS).map(([key, config]) => {
            const action = key as ResetAction;
            return (
              <div key={action} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-extrabold text-gym-soft">{config.label}</h3>
                    <p className="mt-1 text-xs leading-5 text-gym-muted">{config.description}</p>
                  </div>
                  <button
                    type="button"
                    disabled={pendingAction !== null}
                    onClick={() => runReset(action)}
                    className={
                      config.danger
                        ? "min-w-max rounded-lg border border-gym-danger/40 bg-gym-danger/15 px-3 py-2 text-xs font-extrabold text-red-100 disabled:opacity-50"
                        : "min-w-max rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs font-extrabold text-gym-soft disabled:opacity-50"
                    }
                  >
                    {pendingAction === action ? "In corso" : config.danger ? "Esegui" : "Sposta"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </details>
    </div>
  );
}

function DataLink({ href, icon, title, description }: { href: string; icon: ReactNode; title: string; description: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 p-3 transition active:scale-[0.99]">
      <div className="icon-action">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="font-extrabold text-gym-soft">{title}</p>
        <p className="text-xs text-gym-muted">{description}</p>
      </div>
    </Link>
  );
}
