"use client";

import { useState } from "react";
import { AlertTriangle, Bot, Check, CheckCircle2, ChevronDown, Eye, FileJson, RefreshCw, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { parseWorkoutPlanJson } from "@/lib/import/parseJson";
import { formatDayCount, formatExerciseCount } from "@/lib/utils/copy";

type ImportMessage = { path: string; message: string };
type ImportMode = "ai" | "json";

type ImportPreview = {
  name: string;
  month: string;
  start_date?: string;
  end_date?: string;
  days: {
    name: string;
    exercises: { exercise_db_query?: string; exercise_db_id?: string; media_url?: string; trainer_notes?: string }[];
  }[];
};

type AiSummary = {
  days_count: number;
  exercises_count: number;
  matched_exercises_count: number;
  unmatched_exercises_count: number;
  review_exercises_count?: number;
  catalog_exercises_count?: number;
};

type UnmatchedExercise = { day: string; name: string; reason: string };

async function readJsonResponse(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}

export function ImportUploader() {
  const [mode, setMode] = useState<ImportMode>("ai");
  const [fileName, setFileName] = useState<string>();
  const [preview, setPreview] = useState<ImportPreview>();
  const [errors, setErrors] = useState<ImportMessage[]>([]);
  const [warnings, setWarnings] = useState<ImportMessage[]>([]);
  const [unmatched, setUnmatched] = useState<UnmatchedExercise[]>([]);
  const [summary, setSummary] = useState<AiSummary>();
  const [status, setStatus] = useState<string>();
  const [cleanJson, setCleanJson] = useState<string>();
  const [isImporting, setIsImporting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [makeActivePlan, setMakeActivePlan] = useState(true);

  function resetResult() {
    setStatus(undefined);
    setPreview(undefined);
    setErrors([]);
    setWarnings([]);
    setUnmatched([]);
    setSummary(undefined);
    setCleanJson(undefined);
  }

  async function onJsonFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    resetResult();
    if (!file.name.toLowerCase().endsWith(".json")) {
      setErrors([{ path: "file", message: "Seleziona un file JSON." }]);
      return;
    }
    const result = parseWorkoutPlanJson(await file.text());
    setWarnings(result.warnings ?? []);
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    setPreview(result.data);
    setCleanJson(JSON.stringify(result.data));
  }

  async function onAiFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    resetResult();
    setIsGenerating(true);
    setStatus("Lettura del documento");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/ai/convert-workout-plan", { method: "POST", body: formData });
      setStatus("Controllo degli esercizi");
      const data = await readJsonResponse(response);
      if (!response.ok || !data?.success) {
        setErrors(data?.errors ?? [{ path: "ai", message: "Non è stato possibile generare la scheda." }]);
        setWarnings(data?.warnings ?? []);
        setStatus(undefined);
        return;
      }
      setPreview(data.plan);
      setSummary(data.summary);
      setWarnings(data.warnings ?? []);
      setUnmatched(data.unmatched_exercises ?? []);
      setCleanJson(JSON.stringify(data.plan));
      setStatus("Anteprima pronta");
    } catch (error) {
      setErrors([{ path: "network", message: error instanceof Error ? error.message : "Errore di rete." }]);
      setStatus(undefined);
    } finally {
      setIsGenerating(false);
    }
  }

  async function importPlan() {
    if (!cleanJson) return;
    if (makeActivePlan && !window.confirm("La scheda attuale verrà archiviata. Continuare?")) return;

    setStatus("Importazione in corso");
    setIsImporting(true);
    setErrors([]);
    try {
      const response = await fetch("/api/import-workout-plan", {
        method: "POST",
        headers: { "content-type": "application/json", "x-replace-current-plan": makeActivePlan ? "true" : "false" },
        body: cleanJson,
      });
      const data = await readJsonResponse(response);
      if (!response.ok) {
        setErrors(data?.errors ?? [{ path: "server", message: "Importazione non riuscita." }]);
        setStatus(undefined);
        return;
      }
      setWarnings(data?.warnings ?? warnings);
      setStatus(`Scheda importata · ${formatDayCount(data.days_created)} · ${formatExerciseCount(data.exercises_created)}`);
    } catch (error) {
      setErrors([{ path: "network", message: error instanceof Error ? error.message : "Errore di rete." }]);
      setStatus(undefined);
    } finally {
      setIsImporting(false);
    }
  }

  const exerciseCount = preview?.days.reduce((total, day) => total + day.exercises.length, 0) ?? 0;
  const gifCount = preview?.days.reduce((total, day) => total + day.exercises.filter((exercise) => exercise.exercise_db_id?.trim() || exercise.media_url?.trim()).length, 0) ?? 0;
  const reviewCount = unmatched.length || summary?.review_exercises_count || 0;
  const imported = status?.startsWith("Scheda importata") ?? false;

  return (
    <div className="space-y-6">
      <ImportModeTabs mode={mode} onChange={(next) => { setMode(next); setFileName(undefined); resetResult(); }} />
      <ImportSteps fileReady={Boolean(fileName)} previewReady={Boolean(preview)} imported={imported} />

      <section className="surface p-4">
        <div className="flex items-center gap-3">
          <span className={`semantic-icon ${mode === "ai" ? "semantic-blue" : "semantic-violet"}`}>
            {mode === "ai" ? <Bot size={20} /> : <FileJson size={20} />}
          </span>
          <div>
            <h2 className="text-xl font-extrabold text-gym-soft">{mode === "ai" ? "Documento del trainer" : "JSON già pronto"}</h2>
            <p className="mt-1 text-sm text-gym-muted">{mode === "ai" ? "PDF, DOCX, immagine o testo" : "File .json"}</p>
          </div>
        </div>

        <label htmlFor={mode === "ai" ? "ai-file" : "json-file"} className="file-drop mt-4">
          <UploadCloud size={24} />
          <span className="font-extrabold">{fileName ?? "Seleziona file"}</span>
          <span className="text-sm text-gym-muted">{fileName ? "Tocca per sostituirlo" : "Massimo 10 MB"}</span>
        </label>
        <input
          id={mode === "ai" ? "ai-file" : "json-file"}
          type="file"
          accept={mode === "ai" ? ".pdf,.docx,.png,.jpg,.jpeg,.webp,.txt,.json,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp,text/plain,application/json" : "application/json,.json"}
          onChange={mode === "ai" ? onAiFileChange : onJsonFileChange}
          disabled={isGenerating}
          className="sr-only"
        />

        <label className="toggle-row mt-4">
          <span>
            <strong className="block text-gym-soft">Attiva nuova scheda</strong>
            <span className="mt-1 block text-sm text-gym-muted">La precedente resta in archivio.</span>
          </span>
          <input type="checkbox" checked={makeActivePlan} onChange={(event) => setMakeActivePlan(event.target.checked)} className="toggle-input" />
        </label>
      </section>

      {isGenerating ? (
        <div className="status-banner status-info"><RefreshCw size={17} className="animate-spin" /><span>{status}</span></div>
      ) : null}

      {errors.length ? (
        <div className="status-banner status-error items-start">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <strong>Controlla il file</strong>
            <ul className="mt-1 space-y-1 text-sm">
              {errors.map((error, index) => <li key={`${error.path}-${index}`}>{error.message}</li>)}
            </ul>
          </div>
        </div>
      ) : null}

      {preview ? (
        <section className="surface p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="status-pill status-success"><CheckCircle2 size={13} /> Anteprima pronta</span>
              <h2 className="mt-3 truncate text-3xl font-extrabold leading-none text-gym-soft">{preview.name}</h2>
            </div>
            <Eye size={22} className="shrink-0 text-gym-info" />
          </div>

          <div className="metric-grid mt-5">
            <PreviewStat label="Giorni" value={`${preview.days.length}`} tone="blue" />
            <PreviewStat label="Esercizi" value={`${exerciseCount}`} tone="violet" />
            <PreviewStat label="GIF" value={`${gifCount}`} tone="green" />
            <PreviewStat label="Da controllare" value={`${reviewCount}`} tone={reviewCount ? "orange" : "green"} />
          </div>

          <div className="technical-list mt-5">
            {preview.days.map((day, index) => (
              <div key={`${day.name}-${index}`} className="row-link cursor-default px-0">
                <span className="mono-type w-7 text-sm text-gym-muted">{String(index + 1).padStart(2, "0")}</span>
                <strong className="min-w-0 flex-1 truncate text-gym-soft">{day.name}</strong>
                <span className="text-sm text-gym-muted">{day.exercises.length}</span>
              </div>
            ))}
          </div>

          {reviewCount || warnings.length ? (
            <details className="disclosure mt-4">
              <summary><AlertTriangle size={16} /> Controlli ({reviewCount + warnings.length}) <ChevronDown size={17} /></summary>
              <div className="mt-3 space-y-3 text-sm text-gym-muted">
                {unmatched.slice(0, 20).map((item, index) => (
                  <div key={`${item.day}-${item.name}-${index}`}><strong className="text-gym-soft">{item.name}</strong><p>{item.reason}</p></div>
                ))}
                {warnings.slice(0, 20).map((warning, index) => <p key={`${warning.path}-${index}`}>{warning.message}</p>)}
              </div>
            </details>
          ) : null}

          <details className="disclosure mt-3">
            <summary>JSON e dettagli <ChevronDown size={17} /></summary>
            <textarea value={cleanJson ?? ""} onChange={(event) => setCleanJson(event.target.value)} className="input mt-3 h-64 font-mono text-xs" />
            <p className="mt-3 text-sm text-gym-muted">Mese {preview.month} · Catalogo {summary?.catalog_exercises_count ?? "-"}</p>
          </details>

          <Button onClick={importPlan} disabled={isImporting || !cleanJson} className="mt-5 w-full">
            {isImporting ? "Importazione…" : "Importa scheda"}
          </Button>
        </section>
      ) : null}

      {status && !isGenerating && !errors.length ? (
        <div className={imported ? "status-banner status-success" : "status-banner status-info"}>
          {imported ? <Check size={17} /> : <RefreshCw size={17} />}
          <span>{status}</span>
        </div>
      ) : null}
    </div>
  );
}

function ImportModeTabs({ mode, onChange }: { mode: ImportMode; onChange: (mode: ImportMode) => void }) {
  return (
    <div className="segmented" role="tablist" aria-label="Metodo di importazione">
      <button type="button" role="tab" aria-selected={mode === "ai"} onClick={() => onChange("ai")} className={mode === "ai" ? "segmented-item segmented-active" : "segmented-item"}><Bot size={17} /> Documento</button>
      <button type="button" role="tab" aria-selected={mode === "json"} onClick={() => onChange("json")} className={mode === "json" ? "segmented-item segmented-active" : "segmented-item"}><FileJson size={17} /> JSON</button>
    </div>
  );
}

function ImportSteps({ fileReady, previewReady, imported }: { fileReady: boolean; previewReady: boolean; imported: boolean }) {
  const steps = [
    { label: "File", done: fileReady },
    { label: "Revisione", done: previewReady },
    { label: "Attiva", done: imported },
  ];
  return (
    <ol className="stepper" aria-label="Avanzamento importazione">
      {steps.map((step, index) => (
        <li key={step.label} className={step.done ? "stepper-item stepper-done" : "stepper-item"}>
          <span>{step.done ? <Check size={14} /> : index + 1}</span>{step.label}
        </li>
      ))}
    </ol>
  );
}

function PreviewStat({ label, value, tone }: { label: string; value: string; tone: "blue" | "green" | "orange" | "violet" }) {
  return (
    <div className={`metric-cell metric-${tone}`}>
      <p className="text-sm text-gym-muted">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-gym-soft">{value}</p>
    </div>
  );
}
