"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, CirclePlus, Save } from "lucide-react";
import { Card } from "@/components/ui/Card";
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

type Props = {
  initialPlan: EditablePlan;
};

export function WorkoutPlanEditor({ initialPlan }: Props) {
  const router = useRouter();
  const [plan, setPlan] = useState<EditablePlan>(() => normalizePlan(initialPlan));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const exerciseCount = useMemo(
    () => plan.days.reduce((total, day) => total + day.exercises.length, 0),
    [plan.days],
  );

  function updatePlanField<K extends keyof EditablePlan>(field: K, value: EditablePlan[K]) {
    setPlan((current) => ({ ...current, [field]: value }));
  }

  function updateDay(index: number, patch: Partial<EditableDay>) {
    setPlan((current) => ({
      ...current,
      days: current.days.map((day, dayIndex) => dayIndex === index ? { ...day, ...patch } : day),
    }));
  }

  function updateExercise(dayIndex: number, exerciseIndex: number, patch: Partial<EditableExercise>) {
    setPlan((current) => ({
      ...current,
      days: current.days.map((day, currentDayIndex) => {
        if (currentDayIndex !== dayIndex) return day;
        return {
          ...day,
          exercises: day.exercises.map((exercise, currentExerciseIndex) =>
            currentExerciseIndex === exerciseIndex ? { ...exercise, ...patch } : exercise,
          ),
        };
      }),
    }));
  }

  function addDay() {
    setPlan((current) => ({
      ...current,
      days: normalizeDays([
        ...current.days,
        {
          day_order: current.days.length + 1,
          name: `Giorno ${current.days.length + 1} - Nuovo allenamento`,
          description: "",
          exercises: [],
        },
      ]),
    }));
  }

  function addExercise(dayIndex: number) {
    setPlan((current) => ({
      ...current,
      days: current.days.map((day, currentDayIndex) => {
        if (currentDayIndex !== dayIndex) return day;
        return {
          ...day,
          exercises: normalizeExercises([
            ...day.exercises,
            {
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
            },
          ]),
        };
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

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Errore salvataggio scheda.");
      }

      setMessage("Modifiche salvate.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Errore salvataggio scheda.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card variant="info">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gym-info">Editor scheda</p>
            <h1 className="mt-1 text-2xl font-extrabold">Modifica scheda attiva</h1>
            <p className="mt-2 text-sm text-gym-muted">
              Modifica testi, serie, reps, recuperi e ordine. Le eliminazioni arrivano con cestino/soft delete nella prossima patch.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-3 py-2 text-right text-xs font-bold text-slate-200">
            {plan.days.length} giorni<br />{exerciseCount} esercizi
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-3">
          <Field label="Nome scheda">
            <input className="input" value={plan.name} onChange={(event) => updatePlanField("name", event.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mese">
              <input className="input" value={plan.month} onChange={(event) => updatePlanField("month", event.target.value)} placeholder="YYYY-MM" />
            </Field>
            <Field label="Inizio">
              <input className="input" type="date" value={plan.start_date ?? ""} onChange={(event) => updatePlanField("start_date", event.target.value)} />
            </Field>
          </div>
          <Field label="Fine">
            <input className="input" type="date" value={plan.end_date ?? ""} onChange={(event) => updatePlanField("end_date", event.target.value)} />
          </Field>
        </div>
      </Card>

      <div className="flex gap-2">
        <Button type="button" onClick={save} disabled={saving} className="flex-1 inline-flex items-center justify-center gap-2">
          <Save size={18} /> {saving ? "Salvataggio..." : "Salva modifiche"}
        </Button>
        <button type="button" onClick={addDay} className="rounded-2xl bg-white/10 px-4 py-3 font-bold text-slate-100">
          + Giorno
        </button>
      </div>

      {message ? <p className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-slate-100">{message}</p> : null}

      <section className="space-y-4">
        {plan.days.map((day, dayIndex) => (
          <Card key={day.id ?? `new-day-${dayIndex}`}>
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-gym-muted">Giorno {day.day_order}</p>
                  <input
                    className="input mt-2 text-lg font-extrabold"
                    value={day.name}
                    onChange={(event) => updateDay(dayIndex, { name: event.target.value })}
                  />
                </div>
                <div className="flex gap-1">
                  <IconButton label="Sposta su" onClick={() => moveDay(dayIndex, -1)} disabled={dayIndex === 0}><ArrowUp size={16} /></IconButton>
                  <IconButton label="Sposta giù" onClick={() => moveDay(dayIndex, 1)} disabled={dayIndex === plan.days.length - 1}><ArrowDown size={16} /></IconButton>
                </div>
              </div>

              <Field label="Descrizione giorno">
                <textarea
                  className="input min-h-20"
                  value={day.description ?? ""}
                  onChange={(event) => updateDay(dayIndex, { description: event.target.value })}
                />
              </Field>

              <div className="space-y-3">
                {day.exercises.map((exercise, exerciseIndex) => (
                  <div key={exercise.id ?? `new-exercise-${exerciseIndex}`} className="rounded-3xl border border-white/10 bg-white/[0.035] p-3">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <p className="text-xs font-bold uppercase tracking-wide text-gym-muted">Esercizio {exercise.exercise_order}</p>
                      <div className="flex gap-1">
                        <IconButton label="Sposta esercizio su" onClick={() => moveExercise(dayIndex, exerciseIndex, -1)} disabled={exerciseIndex === 0}><ArrowUp size={15} /></IconButton>
                        <IconButton label="Sposta esercizio giù" onClick={() => moveExercise(dayIndex, exerciseIndex, 1)} disabled={exerciseIndex === day.exercises.length - 1}><ArrowDown size={15} /></IconButton>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Field label="Nome esercizio">
                        <input className="input" value={exercise.name} onChange={(event) => updateExercise(dayIndex, exerciseIndex, { name: event.target.value })} />
                      </Field>
                      <div className="grid grid-cols-3 gap-2">
                        <Field label="Serie">
                          <input className="input" inputMode="numeric" value={exercise.sets ?? ""} onChange={(event) => updateExercise(dayIndex, exerciseIndex, { sets: toNumberOrNull(event.target.value) })} />
                        </Field>
                        <Field label="Reps">
                          <input className="input" value={exercise.reps ?? ""} onChange={(event) => updateExercise(dayIndex, exerciseIndex, { reps: event.target.value })} />
                        </Field>
                        <Field label="Rec sec">
                          <input className="input" inputMode="numeric" value={exercise.rest_seconds ?? ""} onChange={(event) => updateExercise(dayIndex, exerciseIndex, { rest_seconds: toNumberOrNull(event.target.value) })} />
                        </Field>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Gruppo">
                          <input className="input" value={exercise.muscle_group ?? ""} onChange={(event) => updateExercise(dayIndex, exerciseIndex, { muscle_group: event.target.value })} />
                        </Field>
                        <Field label="RPE target">
                          <input className="input" value={exercise.target_rpe ?? ""} onChange={(event) => updateExercise(dayIndex, exerciseIndex, { target_rpe: event.target.value })} />
                        </Field>
                      </div>
                      <Field label="Peso suggerito">
                        <input className="input" value={exercise.suggested_weight ?? ""} onChange={(event) => updateExercise(dayIndex, exerciseIndex, { suggested_weight: event.target.value })} />
                      </Field>
                      <Field label="Note tecniche">
                        <textarea className="input min-h-20" value={exercise.technique_notes ?? ""} onChange={(event) => updateExercise(dayIndex, exerciseIndex, { technique_notes: event.target.value })} />
                      </Field>
                      <Field label="Trainer notes">
                        <textarea className="input min-h-20" value={exercise.trainer_notes ?? ""} onChange={(event) => updateExercise(dayIndex, exerciseIndex, { trainer_notes: event.target.value })} />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => addExercise(dayIndex)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 font-bold text-slate-100"
              >
                <CirclePlus size={18} /> Aggiungi esercizio
              </button>
            </div>
          </Card>
        ))}
      </section>

      <div className="sticky bottom-24 z-20">
        <Button type="button" onClick={save} disabled={saving} className="w-full inline-flex items-center justify-center gap-2">
          <Save size={18} /> {saving ? "Salvataggio..." : "Salva modifiche"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-bold uppercase tracking-wide text-gym-muted">{label}</span>
      {children}
    </label>
  );
}

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10 text-slate-200 disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function normalizePlan(plan: EditablePlan): EditablePlan {
  return {
    ...plan,
    days: normalizeDays(plan.days ?? []),
  };
}

function normalizeDays(days: EditableDay[]): EditableDay[] {
  return days.map((day, index) => ({
    ...day,
    day_order: index + 1,
    exercises: normalizeExercises(day.exercises ?? []),
  }));
}

function normalizeExercises(exercises: EditableExercise[]): EditableExercise[] {
  return exercises.map((exercise, index) => ({ ...exercise, exercise_order: index + 1 }));
}

function toNumberOrNull(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && value.trim() !== "" ? parsed : null;
}
