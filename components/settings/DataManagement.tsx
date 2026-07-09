"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ResetAction = "abandon_in_progress" | "delete_abandoned" | "delete_sessions" | "delete_workout_data";

type DataManagementProps = {
  profileName: string;
};

const RESET_ACTIONS: Record<ResetAction, { label: string; description: string; confirm: string; danger?: boolean }> = {
  abandon_in_progress: {
    label: "Annulla allenamenti in corso",
    description: "Sposta tutte le sessioni aperte nello stato Annullato, senza eliminarle.",
    confirm: "Vuoi annullare tutti gli allenamenti in corso di questo profilo?"
  },
  delete_abandoned: {
    label: "Elimina sessioni annullate",
    description: "Rimuove definitivamente gli allenamenti annullati o di test.",
    confirm: "Vuoi eliminare definitivamente tutte le sessioni annullate di questo profilo?",
    danger: true
  },
  delete_sessions: {
    label: "Elimina tutto lo storico",
    description: "Elimina tutte le sessioni del profilo. La scheda importata rimane disponibile.",
    confirm: "Vuoi eliminare definitivamente tutto lo storico allenamenti di questo profilo? Questa azione non si può annullare.",
    danger: true
  },
  delete_workout_data: {
    label: "Elimina schede e dati collegati",
    description: "Elimina le schede del profilo. Per struttura database, verranno eliminate anche le sessioni collegate.",
    confirm: "Vuoi eliminare definitivamente schede e dati collegati di questo profilo? Esporta un backup prima di continuare.",
    danger: true
  }
};

export function DataManagement({ profileName }: DataManagementProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<ResetAction | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runReset(action: ResetAction) {
    const config = RESET_ACTIONS[action];
    setStatus(null);
    setError(null);

    if (!window.confirm(config.confirm)) return;

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

      setStatus(`Operazione completata. Elementi interessati: ${data?.affected ?? 0}.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore di rete.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        <a
          href="/api/export/history-csv"
          className="rounded-2xl bg-gym-info px-4 py-3 text-center text-sm font-extrabold text-slate-950 shadow-info transition active:scale-[0.98]"
        >
          Esporta storico CSV
        </a>
        <a
          href="/api/export/backup-json"
          className="rounded-2xl bg-white/10 px-4 py-3 text-center text-sm font-bold text-slate-100 transition active:scale-[0.98]"
        >
          Scarica backup JSON completo
        </a>
      </div>

      <div className="rounded-2xl border border-gym-info/20 bg-blue-500/[0.06] p-3 text-xs leading-5 text-gym-muted">
        Il backup riguarda solo il profilo attivo: <strong className="text-slate-200">{profileName}</strong>. Prima di eliminare dati importanti, scarica sempre il backup JSON.
      </div>

      {status ? <p className="rounded-2xl bg-gym-accent/10 p-3 text-sm text-gym-accent">{status}</p> : null}
      {error ? <p className="rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</p> : null}

      <details className="rounded-2xl border border-red-400/20 bg-red-500/5 p-3">
        <summary className="cursor-pointer text-sm font-extrabold text-red-100">Zona pericolosa: mostra azioni reset</summary>
        <div className="mt-3 space-y-3">
          {Object.entries(RESET_ACTIONS).map(([key, config]) => {
            const action = key as ResetAction;
            return (
              <div key={action} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <div className="space-y-3">
                  <div>
                    <h3 className="font-extrabold text-slate-100">{config.label}</h3>
                    <p className="mt-1 text-xs leading-5 text-gym-muted">{config.description}</p>
                  </div>
                  <button
                    type="button"
                    disabled={pendingAction !== null}
                    onClick={() => runReset(action)}
                    className={
                      config.danger
                        ? "w-full rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-extrabold text-red-100 disabled:opacity-50"
                        : "w-full rounded-2xl bg-white/10 px-4 py-3 text-sm font-extrabold text-slate-100 disabled:opacity-50"
                    }
                  >
                    {pendingAction === action ? "Operazione in corso..." : config.label}
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
