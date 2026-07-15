"use client";

import { useState } from "react";
import { AlertTriangle, Bot, CheckCircle2, Eye, FileJson, FileUp, RefreshCw, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
  label?: string;
};

type UnmatchedExercise = { day: string; name: string; reason: string };

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
      setErrors([{ path: "file", message: "Scegli un file .json." }]);
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

  async function onAiFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    resetResult();
    setIsGenerating(true);
    setStatus("Sto leggendo la scheda...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      setStatus("Sto riconoscendo esercizi, serie e recuperi...");
      const response = await fetch("/api/ai/convert-workout-plan", {
        method: "POST",
        body: formData,
      });

      setStatus("Sto cercando candidati ExerciseDB reali...");
      const data = await readJsonResponse(response);

      if (!response.ok || !data?.success) {
        setStatus("Generazione non riuscita");
        setErrors(data?.errors ?? [{ path: "ai", message: "Non sono riuscito a generare la scheda." }]);
        setWarnings(data?.warnings ?? []);
        return;
      }

      setPreview(data.plan);
      setSummary(data.summary);
      setWarnings(data.warnings ?? []);
      setUnmatched(data.unmatched_exercises ?? []);
      setCleanJson(JSON.stringify(data.plan));
      setErrors([]);
      setStatus("Scheda generata. Controlla l’anteprima prima di importare.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Errore di rete sconosciuto";
      setStatus("Generazione non riuscita");
      setErrors([{ path: "network", message }]);
    } finally {
      setIsGenerating(false);
    }
  }

  async function importPlan() {
    if (!cleanJson) return;
    setStatus("Importazione...");
    setIsImporting(true);
    setErrors([]);

    try {
      if (makeActivePlan) {
        const confirmed = window.confirm(
          "Importando questa scheda, la scheda attiva precedente verrà archiviata. Lo storico rimane collegato alla scheda originale. Procedere?",
        );
        if (!confirmed) {
          setStatus("Import annullato.");
          setIsImporting(false);
          return;
        }
      }

      const response = await fetch("/api/import-workout-plan", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-replace-current-plan": makeActivePlan ? "true" : "false",
        },
        body: cleanJson,
      });

      const data = await readJsonResponse(response);

      if (!response.ok) {
        setStatus("Importazione non riuscita");
        setErrors(data?.errors ?? [{ path: "server", message: "Import non riuscito. Controlla il terminale e riprova." }]);
        return;
      }

      setWarnings(data?.warnings ?? warnings);
      setStatus(`Scheda importata: ${formatDayCount(data.days_created)}, ${formatExerciseCount(data.exercises_created)}, ${data.exercise_db_matched ?? 0} GIF. ${data.archived_previous_plan ? "Scheda precedente archiviata." : "Scheda salvata in archivio."}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Errore di rete sconosciuto";
      setStatus("Importazione non riuscita");
      setErrors([{ path: "network", message }]);
    } finally {
      setIsImporting(false);
    }
  }

  const exerciseCount = preview?.days.reduce((total, day) => total + day.exercises.length, 0) ?? 0;
  const exerciseDbIdCount = preview?.days.reduce((total, day) => total + day.exercises.filter((exercise) => exercise.exercise_db_id?.trim()).length, 0) ?? 0;
  const mediaUrlCount = preview?.days.reduce((total, day) => total + day.exercises.filter((exercise) => exercise.media_url?.trim()).length, 0) ?? 0;
  const gifCount = Math.max(exerciseDbIdCount, mediaUrlCount, summary?.matched_exercises_count ?? 0);

  return (
    <div className="space-y-4">
      <ImportModeTabs mode={mode} onChange={(nextMode) => { setMode(nextMode); setFileName(undefined); resetResult(); }} />
      <ImportSteps hasFile={Boolean(fileName)} hasPreview={Boolean(preview)} imported={status?.startsWith("Scheda importata") ?? false} />

      {mode === "ai" ? (
        <Card variant="primary">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gym-info/15 text-gym-info"><Bot size={18} /></div>
            <div>
              <p className="text-sm font-semibold text-gym-info">Genera con AI</p>
              <h2 className="mt-1 text-2xl font-extrabold">PDF, DOCX, foto o testo</h2>
              <p className="mt-2 text-sm text-gym-muted">Carica la scheda del trainer. L’app genera un JSON, cerca candidati ExerciseDB e applica GIF solo se Gemini sceglie un match sicuro.</p>
            </div>
          </div>
          <input
            type="file"
            accept=".pdf,.docx,.png,.jpg,.jpeg,.webp,.txt,.json,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp,text/plain,application/json"
            onChange={onAiFileChange}
            disabled={isGenerating}
            className="mt-4 w-full rounded-2xl border border-white/10 bg-black/20 p-3 text-sm"
          />
          <p className="mt-2 text-xs text-gym-muted">Max 10 MB. Le API key restano lato server.</p>
          {isGenerating ? (
            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-gym-info/10 px-3 py-2 text-sm text-gym-info">
              <RefreshCw size={15} className="animate-spin" />
              {status ?? "Generazione..."}
            </div>
          ) : null}
          {fileName ? <p className="mt-3 rounded-2xl bg-black/20 px-3 py-2 text-sm text-slate-200">File: {fileName}</p> : null}
          <MakeActivePlanCheckbox checked={makeActivePlan} onChange={setMakeActivePlan} />
        </Card>
      ) : (
        <Card variant="primary">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-slate-200"><FileJson size={18} /></div>
            <div>
              <p className="text-sm font-semibold text-gym-info">JSON pronto</p>
              <h2 className="mt-1 text-2xl font-extrabold">Carica scheda</h2>
              <p className="mt-2 text-sm text-gym-muted">Usa questa opzione per backup o JSON già generati.</p>
            </div>
          </div>
          <input
            type="file"
            accept="application/json,.json"
            onChange={onJsonFileChange}
            className="mt-4 w-full rounded-2xl border border-white/10 bg-black/20 p-3 text-sm"
          />
          {fileName ? <p className="mt-3 rounded-2xl bg-black/20 px-3 py-2 text-sm text-slate-200">File pronto: {fileName}</p> : null}
          <MakeActivePlanCheckbox checked={makeActivePlan} onChange={setMakeActivePlan} />
        </Card>
      )}

      {errors.length > 0 ? (
        <Card variant="danger">
          <h2 className="font-bold text-red-100">Operazione non riuscita</h2>
          <ul className="mt-2 space-y-1 text-sm text-red-100/90">
            {errors.map((error, index) => (
              <li key={`${error.path}-${index}`}><strong>{error.path}</strong>: {error.message}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      {unmatched.length > 0 ? (
        <details className="rounded-3xl border border-amber-300/30 bg-amber-500/5 p-4 text-sm">
          <summary className="flex cursor-pointer items-center gap-2 font-bold text-amber-100"><AlertTriangle size={16} /> Da controllare</summary>
          <div className="mt-3 space-y-2 text-amber-50/90">
            {unmatched.slice(0, 20).map((item, index) => (
              <div key={`${item.day}-${item.name}-${index}`} className="rounded-2xl bg-black/20 p-3">
                <p className="font-bold">{item.name}</p>
                <p className="mt-1 text-xs text-amber-100/80">{item.day}</p>
                <p className="mt-1 text-xs">{item.reason}</p>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      {warnings.length > 0 ? (
        <details className="rounded-3xl border border-amber-300/30 bg-amber-500/5 p-4 text-sm">
          <summary className="cursor-pointer font-bold text-amber-100">Correzioni e avvisi</summary>
          <ul className="mt-3 max-h-48 space-y-1 overflow-auto text-amber-50/90">
            {warnings.slice(0, 30).map((warning, index) => (
              <li key={`${warning.path}-${index}`}><strong>{warning.path}</strong>: {warning.message}</li>
            ))}
            {warnings.length > 30 ? <li>Altri {warnings.length - 30} avvisi nascosti.</li> : null}
          </ul>
        </details>
      ) : null}

      {preview ? (
        <Card>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-slate-200"><Eye size={18} /></div>
            <div>
              <p className="text-sm font-semibold text-gym-info">Scheda generata</p>
              <h2 className="mt-1 text-2xl font-extrabold">{preview.name}</h2>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
            <PreviewStat label="Giorni" value={`${preview.days.length}`} />
            <PreviewStat label="Esercizi" value={`${exerciseCount}`} />
            <PreviewStat label="GIF" value={`${gifCount}`} />
            <PreviewStat label="Check" value={`${summary?.review_exercises_count ?? unmatched.length}`} />
          </div>
          <div className="mt-4 space-y-2">
            {preview.days.map((day, index) => (
              <div key={`${day.name}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl bg-black/20 p-3 text-sm">
                <span className="line-clamp-1 font-bold text-slate-100">{day.name}</span>
                <span className="shrink-0 text-gym-muted">{formatExerciseCount(day.exercises.length)}</span>
              </div>
            ))}
          </div>
          <details className="mt-4 rounded-2xl bg-white/5 p-3 text-sm">
            <summary className="cursor-pointer font-bold text-slate-300">Modifica JSON</summary>
            <textarea
              value={cleanJson ?? ""}
              onChange={(event) => setCleanJson(event.target.value)}
              className="mt-3 h-64 w-full rounded-2xl border border-white/10 bg-black/30 p-3 font-mono text-xs text-slate-100"
            />
          </details>
          <details className="mt-3 rounded-2xl bg-white/5 p-3 text-sm">
            <summary className="cursor-pointer font-bold text-slate-300">Dettagli tecnici</summary>
            <div className="mt-3 space-y-1 text-gym-muted">
              <p>Mese: {preview.month}</p>
              <p>Date: {preview.start_date ?? "non impostata"} - {preview.end_date ?? "non impostata"}</p>
              <p>ID ExerciseDB: {exerciseDbIdCount}/{exerciseCount}</p>
              <p>Media URL nel JSON: {mediaUrlCount}/{exerciseCount}</p>
              {summary?.catalog_exercises_count ? <p>Catalogo ExerciseDB: {summary.catalog_exercises_count} esercizi</p> : null}
            </div>
          </details>
          <Button onClick={importPlan} disabled={isImporting || !cleanJson} className="mt-4 w-full py-4">
            {isImporting ? "Importazione..." : "Importa scheda"}
          </Button>
        </Card>
      ) : null}

      {status && !isGenerating ? <p className="rounded-2xl bg-white/10 p-3 text-sm text-slate-200">{status}</p> : null}
    </div>
  );
}

function ImportModeTabs({ mode, onChange }: { mode: ImportMode; onChange: (mode: ImportMode) => void }) {
  const tabs = [
    { id: "ai" as const, label: "Genera con AI", icon: <Bot size={16} /> },
    { id: "json" as const, label: "JSON pronto", icon: <FileJson size={16} /> },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 rounded-3xl bg-black/20 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={mode === tab.id
            ? "flex items-center justify-center gap-2 rounded-2xl bg-gym-info/15 px-3 py-3 text-sm font-extrabold text-gym-info"
            : "flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-bold text-gym-muted"}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function MakeActivePlanCheckbox({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="mt-4 flex items-start gap-3 rounded-2xl bg-black/20 p-3 text-sm text-slate-200">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-4 w-4 accent-lime-300" />
      <span>
        <strong>Rendi attiva e archivia la precedente</strong>
        <span className="mt-1 block text-xs text-gym-muted">Cambio mensile: la scheda attuale non viene eliminata, passa in archivio.</span>
      </span>
    </label>
  );
}

function ImportSteps({ hasFile, hasPreview, imported }: { hasFile: boolean; hasPreview: boolean; imported: boolean }) {
  const steps = [
    { label: "File", active: hasFile, icon: <FileUp size={15} /> },
    { label: "Anteprima", active: hasPreview, icon: <Eye size={15} /> },
    { label: "Importa", active: imported, icon: imported ? <CheckCircle2 size={15} /> : <UploadCloud size={15} /> },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {steps.map((step) => (
        <div key={step.label} className={step.active ? "flex items-center justify-center gap-2 rounded-2xl bg-gym-info/15 px-3 py-2 text-xs font-extrabold text-gym-info" : "flex items-center justify-center gap-2 rounded-2xl bg-white/5 px-3 py-2 text-xs font-bold text-gym-muted"}>
          {step.icon}
          {step.label}
        </div>
      ))}
    </div>
  );
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-black/20 p-3">
      <p className="text-gym-muted">{label}</p>
      <p className="mt-1 text-lg font-extrabold text-slate-100">{value}</p>
    </div>
  );
}
