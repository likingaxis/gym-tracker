"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ImageOff, RefreshCw, Search, X } from "lucide-react";
import { useAppDialog } from "@/components/ui/AppDialogProvider";

type Candidate = {
  exercise_db_id: string;
  name: string;
  gifUrl: string;
  bodyParts?: string[];
  equipments?: string[];
  targetMuscles?: string[];
  secondaryMuscles?: string[];
  movement_patterns?: string[];
  score?: number;
};

type UpdatedExercise = {
  exercise_db_id?: string | null;
  exercise_db_name?: string | null;
  exercise_db_confidence?: string | null;
  exercise_db_match_status?: string | null;
  exercise_db_match_score?: number | null;
  media_url?: string | null;
};

type Props = {
  exerciseId: string;
  exerciseName: string;
  currentMediaUrl?: string | null;
  currentExerciseDbName?: string | null;
  currentExerciseDbId?: string | null;
  onSaved: (exercise: UpdatedExercise) => void;
};

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function ExerciseDbMediaPicker({
  exerciseId,
  exerciseName,
  currentMediaUrl,
  currentExerciseDbName,
  currentExerciseDbId,
  onSaved,
}: Props) {
  const { confirmDialog } = useAppDialog();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(exerciseName);
  const [results, setResults] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const cleanCurrentMedia = currentMediaUrl?.trim() ?? "";
  const hasCurrentMedia = cleanCurrentMedia.length > 0;

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const normalized = query.trim();

    if (normalized.length < 2) {
      setResults([]);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setStatus(null);
      try {
        const response = await fetch(`/api/exercisedb/search?q=${encodeURIComponent(normalized)}&limit=18`, {
          signal: controller.signal,
        });
        const data = await readJson(response);
        if (!response.ok || !data?.success) {
          throw new Error(data?.error ?? "Ricerca non riuscita.");
        }
        setResults(data.results ?? []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setStatus(error instanceof Error ? error.message : "Ricerca non riuscita.");
        }
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [open, query]);

  async function saveCandidate(candidate: Candidate) {
    setSavingId(candidate.exercise_db_id);
    setStatus("Salvataggio GIF...");
    try {
      const response = await fetch(`/api/exercises/${exerciseId}/media`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exercise_db_id: candidate.exercise_db_id }),
      });
      const data = await readJson(response);
      if (!response.ok || !data?.success) {
        throw new Error(data?.error ?? "Salvataggio non riuscito.");
      }
      onSaved(data.exercise);
      setStatus("GIF aggiornata.");
      setOpen(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Salvataggio non riuscito.");
    } finally {
      setSavingId(null);
    }
  }

  async function removeMedia() {
    const confirmed = await confirmDialog({ title: "Rimuovere la GIF?", message: "L’esercizio resterà disponibile senza media. Potrai scegliere una nuova GIF in seguito.", confirmLabel: "Rimuovi GIF", tone: "danger" });
    if (!confirmed) return;

    setSavingId("remove");
    setStatus("Rimozione GIF...");
    try {
      const response = await fetch(`/api/exercises/${exerciseId}/media`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remove: true }),
      });
      const data = await readJson(response);
      if (!response.ok || !data?.success) {
        throw new Error(data?.error ?? "Rimozione non riuscita.");
      }
      onSaved(data.exercise);
      setStatus("GIF rimossa.");
      setOpen(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Rimozione non riuscita.");
    } finally {
      setSavingId(null);
    }
  }

  const currentLabel = useMemo(() => {
    if (currentExerciseDbName) return currentExerciseDbName;
    if (currentExerciseDbId) return currentExerciseDbId;
    return hasCurrentMedia ? "Media presente" : "Nessuna GIF";
  }, [currentExerciseDbId, currentExerciseDbName, hasCurrentMedia]);

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="secondary-button w-full"
      >
        {hasCurrentMedia ? "Cambia GIF" : "Cerca GIF"}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 px-4 pb-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Cambia GIF ExerciseDB"
            className="max-h-[86dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-gym-line bg-gym-panel p-4 shadow-2xl shadow-black/60"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="technical-label">Media esercizio</p>
                <h2 className="mt-1 line-clamp-2 text-xl font-extrabold">{exerciseName}</h2>
                <p className="mt-1 text-sm text-gym-muted">{currentLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="touch-icon"
                aria-label="Chiudi"
              >
                <X size={18} />
              </button>
            </div>

            {hasCurrentMedia ? (
              <div className="mt-4 flex justify-center rounded-lg border border-gym-line bg-black/20 p-3">
                <img src={cleanCurrentMedia} alt={exerciseName} className="h-36 w-36 rounded-lg object-contain" loading="lazy" />
              </div>
            ) : null}

            <label className="mt-4 block">
              <span className="field-label">Cerca nel catalogo</span>
              <div className="flex items-center gap-2 rounded-lg border border-gym-line bg-black/20 px-3 py-2">
                <Search size={16} className="text-gym-muted" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="lat pulldown, deadlift, leg curl..."
                  className="min-h-10 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-slate-500"
                />
                {loading ? <RefreshCw size={15} className="animate-spin text-gym-info" /> : null}
              </div>
            </label>

            <div className="mt-4 space-y-2">
              {results.length > 0 ? results.map((candidate) => {
                const isCurrent = candidate.exercise_db_id === currentExerciseDbId;
                return (
                  <div key={candidate.exercise_db_id} className="rounded-lg border border-gym-line bg-white/[0.04] p-3">
                    <div className="flex gap-3">
                      <img src={candidate.gifUrl} alt={candidate.name} className="h-20 w-20 shrink-0 rounded-lg bg-black/20 object-contain" loading="lazy" />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-extrabold text-slate-100">{candidate.name}</p>
                        <p className="mt-1 text-xs text-gym-muted">{formatMeta(candidate)}</p>
                        {candidate.score ? <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-gym-muted">score {candidate.score}</p> : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => saveCandidate(candidate)}
                      disabled={Boolean(savingId) || isCurrent}
                      className={isCurrent
                        ? "mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-gym-accent/15 px-4 py-3 text-sm font-extrabold text-gym-accent disabled:opacity-80"
                        : "mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-gym-info px-4 py-3 text-sm font-extrabold text-slate-950 disabled:opacity-60"}
                    >
                      {isCurrent ? <Check size={16} /> : null}
                      {savingId === candidate.exercise_db_id ? "Salvo..." : isCurrent ? "GIF attuale" : "Usa questa GIF"}
                    </button>
                  </div>
                );
              }) : (
                <div className="rounded-lg bg-black/20 p-3 text-sm text-gym-muted">
                  {query.trim().length < 2 ? "Scrivi almeno 2 caratteri." : loading ? "Ricerca..." : "Nessun risultato trovato."}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={removeMedia}
              disabled={Boolean(savingId) || !hasCurrentMedia}
              className="danger-button mt-4 w-full disabled:opacity-50"
            >
              <ImageOff size={16} /> {savingId === "remove" ? "Rimuovo..." : "Rimuovi GIF"}
            </button>

            {status ? <p className="status-banner mt-3">{status}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatMeta(candidate: Candidate) {
  const parts = [
    ...(candidate.equipments ?? []),
    ...(candidate.bodyParts ?? []),
    ...(candidate.targetMuscles ?? []),
  ].filter(Boolean);

  return parts.slice(0, 4).join(" · ") || candidate.exercise_db_id;
}
