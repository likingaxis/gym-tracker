"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, CalendarRange, ChevronDown, ChevronRight, CirclePlus, Dumbbell, Save, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

type EditableExercise = {
  id?: string;
  exercise_order: number;
  name: string;
  muscle_group?: string | null;
  sets?: number | null;
  reps?: string | null;
  rest_seconds?: number | null;
  suggested_weight?: string | null;
  target_rpe?: string | null;
  technique_notes?: string | null;
  tips?: string | null;
  trainer_notes?: string | null;
  exercise_db_query?: string | null;
  exercise_db_id?: string | null;
  media_url?: string | null;
};

type EditableDay = {
  id?: string;
  day_order: number;
  name: string;
  description?: string | null;
  exercises: EditableExercise[];
};

type EditablePlan = {
  id: string;
  name: string;
  month: string;
  start_date?: string | null;
  end_date?: string | null;
  days: EditableDay[];
};

type SelectedExercise = { dayIndex: number; exerciseIndex: number };

export function WorkoutPlanEditor({ initialPlan }: { initialPlan: EditablePlan }) {
  const router = useRouter();
  const [plan, setPlan] = useState<EditablePlan>(() => normalizePlan(initialPlan));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [selectedExercise, setSelectedExercise] = useState<SelectedExercise | null>(null);

  const exerciseCount = useMemo(() => plan.days.reduce((total, day) => total + day.exercises.length, 0), [plan.days]);
  const selectedDay = plan.days[selectedDayIndex] ?? plan.days[0];
  const editingExercise = selectedExercise ? plan.days[selectedExercise.dayIndex]?.exercises[selectedExercise.exerciseIndex] : null;

  function updatePlanField<K extends keyof EditablePlan>(field: K, value: EditablePlan[K]) {
    setPlan((current) => ({ ...current, [field]: value }));
  }

  function updateDay(index: number, patch: Partial<EditableDay>) {
    setPlan((current) => ({ ...current, days: current.days.map((day, dayIndex) => dayIndex === index ? { ...day, ...patch } : day) }));
  }

  function updateExercise(dayIndex: number, exerciseIndex: number, patch: Partial<EditableExercise>) {
    setPlan((current) => ({
      ...current,
      days: current.days.map((day, currentDayIndex) => currentDayIndex !== dayIndex ? day : {
        ...day,
        exercises: day.exercises.map((exercise, currentExerciseIndex) => currentExerciseIndex === exerciseIndex ? { ...exercise, ...patch } : exercise),
      }),
    }));
  }

  function addDay() {
    setPlan((current) => {
      const nextDays = normalizeDays([...current.days, {
        day_order: current.days.length + 1,
        name: `Giorno ${current.days.length + 1} - Nuovo allenamento`,
        description: "",
        exercises: [],
      }]);
      setSelectedDayIndex(nextDays.length - 1);
      setSelectedExercise(null);
      return { ...current, days: nextDays };
    });
  }

  function addExercise(dayIndex: number) {
    setPlan((current) => ({
      ...current,
      days: current.days.map((day, currentDayIndex) => {
        if (currentDayIndex !== dayIndex) return day;
        const exercises = normalizeExercises([...day.exercises, {
          exercise_order: day.exercises.length + 1,
          name: "Nuovo esercizio",
          muscle_group: "",
          sets: 3,
          reps: "10",
          rest_seconds: 90,
          suggested_weight: "",
          target_rpe: "",
          technique_notes: "",
          tips: "",
          trainer_notes: "",
          exercise_db_query: "",
          exercise_db_id: "",
          media_url: "",
        }]);
        setSelectedExercise({ dayIndex, exerciseIndex: exercises.length - 1 });
        return { ...day, exercises };
      }),
    }));
  }

  function moveDay(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= plan.days.length) return;
    setPlan((current) => {
      const days = [...current.days];
      const [day] = days.splice(index, 1);
      days.splice(target, 0, day);
      setSelectedDayIndex(target);
      setSelectedExercise(null);
      return { ...current, days: normalizeDays(days) };
    });
  }

  function moveExercise(dayIndex: number, exerciseIndex: number, direction: -1 | 1) {
    setPlan((current) => ({
      ...current,
      days: current.days.map((day, currentDayIndex) => {
        if (currentDayIndex !== dayIndex) return day;
        const target = exerciseIndex + direction;
        if (target < 0 || target >= day.exercises.length) return day;
        const exercises = [...day.exercises];
        const [exercise] = exercises.splice(exerciseIndex, 1);
        exercises.splice(target, 0, exercise);
        setSelectedExercise({ dayIndex, exerciseIndex: target });
        return { ...day, exercises: normalizeExercises(exercises) };
      }),
    }));
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/workout-plans/${plan.id}/editor`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalizePlan(plan)),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error ?? "Salvataggio non riuscito.");
      setMessage("Salvato");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Salvataggio non riuscito.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-7 pb-24">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="technical-label">Editor</p>
          <h1 className="page-title mt-1">Modifica scheda</h1>
        </div>
        <div className="mono-type rounded-lg border border-gym-line bg-gym-panel px-3 py-2 text-right text-sm text-gym-muted">
          <strong className="block text-lg text-gym-soft">{plan.days.length}</strong>
          {exerciseCount} esercizi
        </div>
      </header>

      <details className="disclosure" open={false}>
        <summary><span className="inline-flex items-center gap-2"><CalendarRange size={17} /> Dati scheda</span><ChevronDown size={17} /></summary>
        <div className="mt-4 space-y-4">
          <Field label="Nome programma"><input className="input" value={plan.name} onChange={(event) => updatePlanField("name", event.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Inizio"><input className="input" type="date" value={plan.start_date ?? ""} onChange={(event) => updatePlanField("start_date", event.target.value)} /></Field>
            <Field label="Fine"><input className="input" type="date" value={plan.end_date ?? ""} onChange={(event) => updatePlanField("end_date", event.target.value)} /></Field>
          </div>
          <Field label="Mese"><input className="input" value={plan.month} onChange={(event) => updatePlanField("month", event.target.value)} placeholder="YYYY-MM" /></Field>
        </div>
      </details>

      <section className="section-block">
        <div className="flex items-end justify-between gap-3">
          <div><p className="technical-label">Giorno</p><h2 className="section-title">Struttura allenamento</h2></div>
          <button type="button" onClick={addDay} className="secondary-button min-h-10 px-3 text-sm"><CirclePlus size={16} /> Aggiungi</button>
        </div>

        {plan.days.length ? (
          <>
            <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
              <label className="select-shell">
                <span className="sr-only">Scegli giorno</span>
                <select
                  value={selectedDayIndex}
                  onChange={(event) => { setSelectedDayIndex(Number(event.target.value)); setSelectedExercise(null); }}
                  className="select-control"
                >
                  {plan.days.map((day, index) => <option key={day.id ?? `day-${index}`} value={index}>Giorno {day.day_order} · {shortDayName(day.name)}</option>)}
                </select>
                <ChevronDown size={18} className="pointer-events-none absolute right-3 text-gym-muted" />
              </label>
              <div className="flex gap-1">
                <IconButton label="Sposta giorno indietro" onClick={() => moveDay(selectedDayIndex, -1)} disabled={selectedDayIndex === 0}><ArrowUp size={17} /></IconButton>
                <IconButton label="Sposta giorno avanti" onClick={() => moveDay(selectedDayIndex, 1)} disabled={selectedDayIndex === plan.days.length - 1}><ArrowDown size={17} /></IconButton>
              </div>
            </div>

            {selectedDay ? (
              <div className="mt-4 space-y-5">
                <Field label="Nome giorno"><input className="input text-lg font-bold" value={selectedDay.name} onChange={(event) => updateDay(selectedDayIndex, { name: event.target.value })} /></Field>
                <Field label="Indicazioni"><textarea className="input min-h-20" value={selectedDay.description ?? ""} onChange={(event) => updateDay(selectedDayIndex, { description: event.target.value })} placeholder="Facoltative" /></Field>

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="technical-label">Esercizi</p>
                    <button type="button" onClick={() => addExercise(selectedDayIndex)} className="secondary-button min-h-10 px-3 text-sm"><CirclePlus size={16} /> Esercizio</button>
                  </div>
                  {selectedDay.exercises.length ? (
                    <div className="technical-list mt-3">
                      {selectedDay.exercises.map((exercise, exerciseIndex) => (
                        <div key={exercise.id ?? `exercise-${exerciseIndex}`} className="editor-exercise-row">
                          <button type="button" onClick={() => setSelectedExercise({ dayIndex: selectedDayIndex, exerciseIndex })} className="min-w-0 flex-1 py-3 text-left">
                            <span className="mono-type text-xs text-gym-muted">{String(exercise.exercise_order).padStart(2, "0")}</span>
                            <strong className="mt-1 block truncate text-base text-gym-soft">{exercise.name}</strong>
                            <span className="mt-1 block text-sm text-gym-muted">{exercise.sets || 0} × {exercise.reps || "-"} · {exercise.rest_seconds || 0}s</span>
                          </button>
                          <div className="flex items-center gap-1">
                            <IconButton label="Sposta esercizio su" onClick={() => moveExercise(selectedDayIndex, exerciseIndex, -1)} disabled={exerciseIndex === 0}><ArrowUp size={15} /></IconButton>
                            <IconButton label="Sposta esercizio giù" onClick={() => moveExercise(selectedDayIndex, exerciseIndex, 1)} disabled={exerciseIndex === selectedDay.exercises.length - 1}><ArrowDown size={15} /></IconButton>
                            <button type="button" onClick={() => setSelectedExercise({ dayIndex: selectedDayIndex, exerciseIndex })} className="touch-icon h-10 w-10" aria-label={`Modifica ${exercise.name}`}><ChevronRight size={19} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <button type="button" onClick={() => addExercise(selectedDayIndex)} className="empty-action mt-3"><Dumbbell size={20} /> Aggiungi il primo esercizio</button>
                  )}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <button type="button" onClick={addDay} className="empty-action mt-4"><CirclePlus size={20} /> Aggiungi il primo giorno</button>
        )}
      </section>

      {message ? <div className={message === "Salvato" ? "status-banner status-success" : "status-banner status-error"}>{message}</div> : null}

      <div className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-md px-4">
        <div className="save-dock">
          <span className="min-w-0 flex-1 truncate text-sm text-gym-muted">{message ?? "Modifiche non salvate"}</span>
          <Button type="button" onClick={save} disabled={saving} className="min-h-11 shrink-0 px-4 py-2 text-sm"><Save size={16} /> {saving ? "Salvataggio…" : "Salva"}</Button>
        </div>
      </div>

      {editingExercise && selectedExercise ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 px-3 pt-12 backdrop-blur-sm" onClick={() => setSelectedExercise(null)}>
          <section className="editor-sheet" role="dialog" aria-modal="true" aria-label={`Modifica ${editingExercise.name}`} onClick={(event) => event.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-gym-line bg-gym-raised px-4 pb-4 pt-2">
              <div className="min-w-0"><p className="technical-label">Esercizio {editingExercise.exercise_order}</p><h2 className="mt-1 truncate text-2xl font-extrabold text-gym-soft">{editingExercise.name}</h2></div>
              <button type="button" onClick={() => setSelectedExercise(null)} className="touch-icon" aria-label="Chiudi"><X size={20} /></button>
            </div>
            <div className="space-y-4 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <Field label="Nome"><input className="input" value={editingExercise.name} onChange={(event) => updateExercise(selectedExercise.dayIndex, selectedExercise.exerciseIndex, { name: event.target.value })} /></Field>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Serie"><input className="input text-center text-xl font-extrabold" inputMode="numeric" value={editingExercise.sets ?? ""} onChange={(event) => updateExercise(selectedExercise.dayIndex, selectedExercise.exerciseIndex, { sets: toNumberOrNull(event.target.value) })} /></Field>
                <Field label="Reps"><input className="input text-center text-xl font-extrabold" value={editingExercise.reps ?? ""} onChange={(event) => updateExercise(selectedExercise.dayIndex, selectedExercise.exerciseIndex, { reps: event.target.value })} /></Field>
                <Field label="Recupero"><input className="input text-center text-xl font-extrabold" inputMode="numeric" value={editingExercise.rest_seconds ?? ""} onChange={(event) => updateExercise(selectedExercise.dayIndex, selectedExercise.exerciseIndex, { rest_seconds: toNumberOrNull(event.target.value) })} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Gruppo"><input className="input" value={editingExercise.muscle_group ?? ""} onChange={(event) => updateExercise(selectedExercise.dayIndex, selectedExercise.exerciseIndex, { muscle_group: event.target.value })} /></Field>
                <Field label="RPE target"><input className="input" value={editingExercise.target_rpe ?? ""} onChange={(event) => updateExercise(selectedExercise.dayIndex, selectedExercise.exerciseIndex, { target_rpe: event.target.value })} /></Field>
              </div>
              <Field label="Peso suggerito"><input className="input" value={editingExercise.suggested_weight ?? ""} onChange={(event) => updateExercise(selectedExercise.dayIndex, selectedExercise.exerciseIndex, { suggested_weight: event.target.value })} /></Field>
              <Field label="Note tecniche"><textarea className="input min-h-24" value={editingExercise.technique_notes ?? ""} onChange={(event) => updateExercise(selectedExercise.dayIndex, selectedExercise.exerciseIndex, { technique_notes: event.target.value })} /></Field>
              <Field label="Note trainer"><textarea className="input min-h-24" value={editingExercise.trainer_notes ?? ""} onChange={(event) => updateExercise(selectedExercise.dayIndex, selectedExercise.exerciseIndex, { trainer_notes: event.target.value })} /></Field>
              <button type="button" onClick={() => setSelectedExercise(null)} className="primary-link w-full">Fatto</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-2"><span className="field-label">{label}</span>{children}</label>;
}

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return <button type="button" aria-label={label} onClick={onClick} disabled={disabled} className="touch-icon h-10 w-10 disabled:opacity-30">{children}</button>;
}

function normalizePlan(plan: EditablePlan): EditablePlan { return { ...plan, days: normalizeDays(plan.days ?? []) }; }
function normalizeDays(days: EditableDay[]): EditableDay[] { return days.map((day, index) => ({ ...day, day_order: index + 1, exercises: normalizeExercises(day.exercises ?? []) })); }
function normalizeExercises(exercises: EditableExercise[]): EditableExercise[] { return exercises.map((exercise, index) => ({ ...exercise, exercise_order: index + 1 })); }
function toNumberOrNull(value: string) { const parsed = Number(value); return Number.isFinite(parsed) && value.trim() !== "" ? parsed : null; }
function shortDayName(name: string) { return name.replace(/^Giorno\s+\d+\s*[-–—]\s*/i, "") || name; }
