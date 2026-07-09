"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { parseWorkoutPlanJson } from "@/lib/import/parseJson";

type ImportMessage = { path: string; message: string };

type ImportPreview = {
  name: string;
  month: string;
  start_date?: string;
  end_date?: string;
  days: {
    name: string;
    exercises: { exercise_db_query?: string; exercise_db_id?: string; media_url?: string }[];
  }[];
};

async function readJsonResponse(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function ImportUploader() {
  const [fileName, setFileName] = useState<string>();
  const [preview, setPreview] = useState<ImportPreview>();
  const [errors, setErrors] = useState<ImportMessage[]>([]);
  const [warnings, setWarnings] = useState<ImportMessage[]>([]);
  const [status, setStatus] = useState<string>();
  const [cleanJson, setCleanJson] = useState<string>();
  const [isImporting, setIsImporting] = useState(false);
  const [replaceCurrentPlan, setReplaceCurrentPlan] = useState(true);

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setStatus(undefined);
    setPreview(undefined);
    setErrors([]);
    setWarnings([]);
    setCleanJson(undefined);

    if (!file.name.toLowerCase().endsWith(".json")) {
      setErrors([
        {
          path: "file",
          message:
            "Carica un file .json. CSV non è più previsto in questa app.",
        },
      ]);
      return;
    }

    const text = await file.text();
    const result = parseWorkoutPlanJson(text);

    setWarnings(result.warnings ?? []);

    if (!result.success) {
      setPreview(undefined);
      setErrors(result.errors);
      return;
    }

    setErrors([]);
    setPreview(result.data);
    setCleanJson(JSON.stringify(result.data));
  }

  async function importPlan() {
    if (!cleanJson) return;
    setStatus("Importazione in corso...");
    setIsImporting(true);
    setErrors([]);

    try {
      if (replaceCurrentPlan) {
        const confirmed = window.confirm(
          "Vuoi sostituire la scheda attiva attuale? Questa operazione elimina la scheda attiva precedente e i dati collegati a quella scheda.",
        );
        if (!confirmed) {
          setStatus("Importazione annullata.");
          setIsImporting(false);
          return;
        }
      }

      const response = await fetch("/api/import-workout-plan", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-replace-current-plan": replaceCurrentPlan ? "true" : "false",
        },
        body: cleanJson,
      });

      const data = await readJsonResponse(response);

      if (!response.ok) {
        setStatus("Importazione non riuscita");
        setErrors(
          data?.errors ?? [
            {
              path: "server",
              message:
                "Errore del server durante l'importazione. Controlla il terminale dove gira npm run dev.",
            },
          ],
        );
        return;
      }

      setWarnings(data?.warnings ?? warnings);
      setStatus(
        `Scheda importata: ${data.days_created} giorni, ${data.exercises_created} esercizi. GIF assegnate: ${data.exercise_db_matched ?? 0}. Senza GIF: ${data.exercise_db_unmatched ?? 0}.`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Errore di rete sconosciuto";
      setStatus("Importazione non riuscita");
      setErrors([{ path: "network", message }]);
    } finally {
      setIsImporting(false);
    }
  }

  const exerciseCount =
    preview?.days.reduce((total, day) => total + day.exercises.length, 0) ?? 0;
  const exerciseDbIdCount =
    preview?.days.reduce(
      (total, day) =>
        total + day.exercises.filter((exercise) => exercise.exercise_db_id?.trim()).length,
      0,
    ) ?? 0;
  const mediaUrlCount =
    preview?.days.reduce(
      (total, day) =>
        total + day.exercises.filter((exercise) => exercise.media_url?.trim()).length,
      0,
    ) ?? 0;

  return (
    <div className="space-y-4">
      <Card>
        <label className="block text-sm font-semibold text-slate-300">
          Carica scheda JSON
        </label>
        <input
          type="file"
          accept="application/json,.json"
          onChange={onFileChange}
          className="mt-3 w-full rounded-2xl border border-white/10 bg-black/20 p-3 text-sm"
        />
        {fileName ? (
          <p className="mt-3 text-sm text-gym-muted">File: {fileName}</p>
        ) : null}
        <p className="mt-3 text-xs leading-5 text-gym-muted">
          La v0.8.1 supporta solo JSON. Se un esercizio contiene
          exercise_db_id, l’app genera direttamente la GIF ExerciseDB da quell’ID.
          Non viene più scelto automaticamente il primo risultato da una query.
        </p>
        <label className="mt-4 flex items-start gap-3 rounded-2xl bg-black/20 p-3 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={replaceCurrentPlan}
            onChange={(event) => setReplaceCurrentPlan(event.target.checked)}
            className="mt-1 h-4 w-4 accent-lime-300"
          />
          <span>
            <strong>Sostituisci la scheda attiva attuale</strong>
            <span className="mt-1 block text-xs text-gym-muted">
              Consigliato per il tuo flusso mensile: importi la scheda nuova e
              rimuovi quella precedente.
            </span>
          </span>
        </label>
      </Card>

      {errors.length > 0 ? (
        <Card className="border-red-400/40">
          <h2 className="font-bold text-red-200">Errori da correggere</h2>
          <ul className="mt-2 space-y-1 text-sm text-red-100">
            {errors.map((error, index) => (
              <li key={`${error.path}-${index}`}>
                <strong>{error.path}</strong>: {error.message}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {warnings.length > 0 ? (
        <Card className="border-amber-300/40">
          <h2 className="font-bold text-amber-100">Correzioni automatiche</h2>
          <ul className="mt-2 max-h-48 space-y-1 overflow-auto text-sm text-amber-50/90">
            {warnings.slice(0, 30).map((warning, index) => (
              <li key={`${warning.path}-${index}`}>
                <strong>{warning.path}</strong>: {warning.message}
              </li>
            ))}
            {warnings.length > 30 ? (
              <li>Altre {warnings.length - 30} correzioni nascoste.</li>
            ) : null}
          </ul>
        </Card>
      ) : null}

      {preview ? (
        <Card>
          <h2 className="text-xl font-black">{preview.name}</h2>
          <p className="text-sm text-gym-muted">Mese: {preview.month}</p>
          <p className="text-sm text-gym-muted">
            Date: {preview.start_date ?? "non impostata"} -{" "}
            {preview.end_date ?? "non impostata"}
          </p>
          <p className="mt-2 text-sm">Giorni: {preview.days.length}</p>
          <p className="text-sm">Esercizi: {exerciseCount}</p>
          <p className="text-sm text-gym-accent">
            ID ExerciseDB: {exerciseDbIdCount}/{exerciseCount}
          </p>
          <p className="text-sm text-gym-muted">
            Media URL già presenti nel JSON: {mediaUrlCount}/{exerciseCount}
          </p>
          <div className="mt-3 space-y-1 text-sm text-gym-muted">
            {preview.days.map((day, index) => (
              <p key={`${day.name}-${index}`}>
                • {day.name}: {day.exercises.length} esercizi
              </p>
            ))}
          </div>
          <Button
            onClick={importPlan}
            disabled={isImporting}
            className="mt-4 w-full"
          >
            {isImporting ? "Importazione..." : "Conferma importazione"}
          </Button>
        </Card>
      ) : null}

      {status ? (
        <p className="rounded-2xl bg-white/10 p-3 text-sm text-slate-200">
          {status}
        </p>
      ) : null}
    </div>
  );
}
