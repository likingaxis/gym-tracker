"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  sessionId: string;
  workoutDayId?: string | null;
  status: "in_progress" | "paused" | "completed" | "abandoned" | string;
  compact?: boolean;
};

type Action = "pause" | "resume" | "complete" | "delete";

export function SessionActions({ sessionId, workoutDayId, status, compact = false }: Props) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAction(action: Action) {
    setError(null);

    const messages = {
      pause: "Vuoi mettere in pausa questo allenamento?",
      resume: "Vuoi riprendere questo allenamento?",
      complete: "Vuoi segnare questo allenamento come completato?",
      delete: "Vuoi spostare questa sessione nel cestino? Potrai recuperarla.",
    } as const;

    if (!window.confirm(messages[action])) return;

    setPendingAction(action);

    const endpoint =
      action === "delete"
        ? `/api/workout-sessions/${sessionId}`
        : `/api/workout-sessions/${sessionId}/${action}`;

    const response = await fetch(endpoint, {
      method: action === "delete" ? "DELETE" : "POST"
    });

    let data: any = null;
    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    setPendingAction(null);

    if (!response.ok) {
      setError(data?.error ?? "Operazione non riuscita.");
      return;
    }

    if (action === "delete") {
      router.push("/history");
      router.refresh();
      return;
    }

    router.refresh();
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {error ? <p className="rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</p> : null}

      <div className={compact ? "grid grid-cols-2 gap-2" : "grid gap-2"}>
        {(status === "in_progress" || status === "paused") && workoutDayId ? (
          <button
            type="button"
            onClick={() => router.push(`/workout/${workoutDayId}`)}
            className="rounded-2xl bg-gym-accent px-4 py-3 text-sm font-black text-slate-950 shadow-glow transition active:scale-[0.98]"
          >
            {status === "paused" ? "Riprendi" : "Torna al workout"}
          </button>
        ) : null}

        {status === "in_progress" ? (
          <button
            type="button"
            disabled={pendingAction !== null}
            onClick={() => runAction("pause")}
            className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-slate-100 transition active:scale-[0.98] disabled:opacity-50"
          >
            {pendingAction === "pause" ? "Metto in pausa..." : "Pausa"}
          </button>
        ) : null}

        {status === "paused" ? (
          <button
            type="button"
            disabled={pendingAction !== null}
            onClick={() => runAction("resume")}
            className="rounded-2xl bg-gym-info px-4 py-3 text-sm font-extrabold text-slate-950 transition active:scale-[0.98] disabled:opacity-50"
          >
            {pendingAction === "resume" ? "Riprendo..." : "Riprendi"}
          </button>
        ) : null}

        {(status === "in_progress" || status === "paused") ? (
          <button
            type="button"
            disabled={pendingAction !== null}
            onClick={() => runAction("complete")}
            className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-slate-100 transition active:scale-[0.98] disabled:opacity-50"
          >
            {pendingAction === "complete" ? "Completamento..." : "Completa"}
          </button>
        ) : null}

        <button
          type="button"
          disabled={pendingAction !== null}
          onClick={() => runAction("delete")}
          className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100 transition active:scale-[0.98] disabled:opacity-50"
        >
          {pendingAction === "delete" ? "Sposto nel cestino..." : compact ? "Elimina" : "Elimina sessione"}
        </button>
      </div>
    </div>
  );
}
