"use client";

import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  ArrowLeft,
  CalendarRange,
  ChevronDown,
  ChevronRight,
  CirclePlus,
  Dumbbell,
  Edit3,
  Plus,
  Save,
  Trash2,
  X,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ExerciseDbMediaPicker } from "@/components/workout/ExerciseDbMediaPicker";

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
  exercise_db_name?: string | null;
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
  const reduceMotion = useReducedMotion();
  const [plan, setPlan] = useState<EditablePlan>(() => normalizePlan(initialPlan));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [selectedExercise, setSelectedExercise] = useState<SelectedExercise | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Blocca lo scroll della pagina principale quando il Bottom Sheet è aperto
  useEffect(() => {
    if (selectedExercise) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedExercise]);

  const exerciseCount = useMemo(
    () => plan.days.reduce((total, day) => total + day.exercises.length, 0),
    [plan.days]
  );
  const selectedDay = plan.days[selectedDayIndex] ?? plan.days[0];
  const editingExercise = selectedExercise
    ? plan.days[selectedExercise.dayIndex]?.exercises[selectedExercise.exerciseIndex]
    : null;

  function updatePlanField<K extends keyof EditablePlan>(field: K, value: EditablePlan[K]) {
    setPlan((current) => ({ ...current, [field]: value }));
  }

  function updateDay(index: number, patch: Partial<EditableDay>) {
    setPlan((current) => ({
      ...current,
      days: current.days.map((day, dayIndex) => (dayIndex === index ? { ...day, ...patch } : day)),
    }));
  }

  function deleteDay(index: number) {
    if (plan.days.length <= 1) {
      alert("Devi mantenere almeno un giorno nella scheda.");
      return;
    }
    if (!confirm(`Sei sicuro di voler eliminare "${plan.days[index]?.name}"?`)) return;

    setPlan((current) => {
      const nextDays = normalizeDays(current.days.filter((_, i) => i !== index));
      setSelectedDayIndex(Math.max(0, index - 1));
      setSelectedExercise(null);
      return { ...current, days: nextDays };
    });
  }

  function updateExercise(dayIndex: number, exerciseIndex: number, patch: Partial<EditableExercise>) {
    setPlan((current) => ({
      ...current,
      days: current.days.map((day, currentDayIndex) =>
        currentDayIndex !== dayIndex
          ? day
          : {
              ...day,
              exercises: day.exercises.map((exercise, currentExerciseIndex) =>
                currentExerciseIndex === exerciseIndex ? { ...exercise, ...patch } : exercise
              ),
            }
      ),
    }));
  }

  function deleteExercise(dayIndex: number, exerciseIndex: number) {
    setPlan((current) => ({
      ...current,
      days: current.days.map((day, currentDayIndex) => {
        if (currentDayIndex !== dayIndex) return day;
        const exercises = normalizeExercises(day.exercises.filter((_, i) => i !== exerciseIndex));
        return { ...day, exercises };
      }),
    }));
    if (selectedExercise?.dayIndex === dayIndex && selectedExercise?.exerciseIndex === exerciseIndex) {
      setSelectedExercise(null);
    }
  }

  function addDay() {
    setPlan((current) => {
      const nextDays = normalizeDays([
        ...current.days,
        {
          day_order: current.days.length + 1,
          name: `Giorno ${current.days.length + 1} - Nuovo allenamento`,
          description: "",
          exercises: [],
        },
      ]);
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
        const exercises = normalizeExercises([
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
        ]);
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
      setMessage("Scheda salvata!");
      router.refresh();
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Salvataggio non riuscito.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative space-y-6 pb-36">
      {/* Header Pagina */}
      <header className="app-hero relative overflow-hidden rounded-3xl border border-white/10 bg-[#0f121a]/80 p-5 backdrop-blur-xl shadow-xl">
        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-gym-accent/15 blur-2xl pointer-events-none" />
        <p className="technical-label text-gym-accent">Editor Scheda</p>
        <h1 className="mt-1 text-2xl font-extrabold leading-tight text-white">{plan.name || "Modifica Scheda"}</h1>
        <p className="mt-1 text-xs font-semibold text-gym-muted">
          {plan.days.length} giorni · {exerciseCount} esercizi totali
        </p>
      </header>

      {/* Dati e Periodo Scheda (Pannello Morbido) */}
      <details className="group rounded-3xl border border-white/10 bg-white/[0.02] p-4 transition-all duration-300 backdrop-blur-md">
        <summary className="flex cursor-pointer items-center justify-between font-bold text-slate-200 select-none">
          <span className="inline-flex items-center gap-2 text-sm">
            <CalendarRange size={18} className="text-gym-accent" /> Dati Scheda & Periodo
          </span>
          <ChevronDown size={18} className="transition-transform duration-300 group-open:rotate-180 text-gym-muted" />
        </summary>
        <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
          <Field label="Nome programma">
            <input
              className="input font-bold text-white bg-white/[0.04] border-white/10 focus:border-gym-accent"
              value={plan.name}
              onChange={(event) => updatePlanField("name", event.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data Inizio">
              <input
                className="input bg-white/[0.04] border-white/10"
                type="date"
                value={plan.start_date ?? ""}
                onChange={(event) => updatePlanField("start_date", event.target.value)}
              />
            </Field>
            <Field label="Data Fine">
              <input
                className="input bg-white/[0.04] border-white/10"
                type="date"
                value={plan.end_date ?? ""}
                onChange={(event) => updatePlanField("end_date", event.target.value)}
              />
            </Field>
          </div>
          <Field label="Mese / Obiettivo">
            <input
              className="input bg-white/[0.04] border-white/10"
              value={plan.month}
              onChange={(event) => updatePlanField("month", event.target.value)}
              placeholder="Es. Luglio 2026 / Fase Ipertrofia"
            />
          </Field>
        </div>
      </details>

      {/* Sezione Struttura Giorni */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="technical-label">Giorni della Scheda</p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={addDay}
            className="flex items-center gap-1.5 rounded-xl border border-gym-accent/30 bg-gym-accent/10 px-3 py-1.5 text-xs font-bold text-gym-accent hover:bg-gym-accent/20 transition"
          >
            <Plus size={15} /> Aggiungi Giorno
          </motion.button>
        </div>

        {/* Tab Bar Giorni */}
        {plan.days.length > 0 ? (
          <div
            className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar no-scrollbar"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {plan.days.map((day, index) => {
              const isActive = index === selectedDayIndex;
              return (
                <button
                  key={day.id ?? `day-tab-${index}`}
                  type="button"
                  onClick={() => {
                    setSelectedDayIndex(index);
                    setSelectedExercise(null);
                  }}
                  className={`flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-extrabold transition-all duration-200 ${
                    isActive
                      ? "border-gym-accent bg-gym-accent text-slate-950 shadow-[0_4px_15px_rgba(198,95,55,0.3)]"
                      : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
                  }`}
                >
                  <span>Giorno {day.day_order}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-black ${
                      isActive ? "bg-slate-950/20 text-slate-950" : "bg-white/10 text-gym-muted"
                    }`}
                  >
                    {day.exercises.length}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        {/* Dettagli Giorno Selezionato */}
        {selectedDay ? (
          <Card variant="primary" className="p-5 space-y-5">
            {/* Header / Controlli Giorno - Solo Input Nome + Tastino Elimina */}
            <div className="flex items-end gap-3 border-b border-white/10 pb-4">
              <div className="min-w-0 flex-1">
                <Field label={`Nome Giorno ${selectedDay.day_order}`}>
                  <input
                    className="input text-lg font-extrabold text-white bg-white/[0.04] border-white/10 focus:border-gym-accent"
                    value={selectedDay.name}
                    onChange={(event) => updateDay(selectedDayIndex, { name: event.target.value })}
                  />
                </Field>
              </div>
              <button
                type="button"
                onClick={() => deleteDay(selectedDayIndex)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 active:scale-95 transition"
                aria-label="Elimina giorno"
              >
                <Trash2 size={18} />
              </button>
            </div>

            <Field label="Indicazioni / Focus Giorno">
              <textarea
                className="input min-h-16 text-sm"
                value={selectedDay.description ?? ""}
                onChange={(event) => updateDay(selectedDayIndex, { description: event.target.value })}
                placeholder="Facoltativo (es. Focus petto alto, 90s recupero base)"
              />
            </Field>

            {/* Lista Esercizi del Giorno */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <p className="technical-label">Esercizi ({selectedDay.exercises.length})</p>
                <button
                  type="button"
                  onClick={() => addExercise(selectedDayIndex)}
                  className="secondary-button text-xs py-2 px-3"
                >
                  <CirclePlus size={15} /> Aggiungi Esercizio
                </button>
              </div>

              {selectedDay.exercises.length > 0 ? (
                <div className="space-y-2.5">
                  {selectedDay.exercises.map((exercise, exerciseIndex) => (
                    <motion.div
                      key={exercise.id ?? `ex-${exerciseIndex}`}
                      whileHover={{ scale: 1.01 }}
                      className="group flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 transition-all hover:border-gym-accent/40 hover:bg-white/[0.07] shadow-sm"
                    >
                      {/* Clicca sulla card per aprire l'editor full-screen */}
                      <button
                        type="button"
                        onClick={() => setSelectedExercise({ dayIndex: selectedDayIndex, exerciseIndex })}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gym-accent/30 bg-gym-accent/15 text-xs font-black text-gym-accent">
                          {String(exercise.exercise_order).padStart(2, "0")}
                        </span>
                        <div className="min-w-0 flex-1">
                          <strong className="block truncate text-base font-extrabold text-white group-hover:text-gym-accent transition-colors">
                            {exercise.name}
                          </strong>
                          <span className="block text-xs font-semibold text-gym-muted mt-0.5">
                            {exercise.sets || 0} serie × {exercise.reps || "-"} · {exercise.rest_seconds || 0}s rec
                            {exercise.muscle_group ? ` · ${exercise.muscle_group}` : ""}
                          </span>
                        </div>
                      </button>

                      {/* Bottoni Ordinamento ed Edit */}
                      <div className="flex items-center gap-1 shrink-0">
                        <IconButton
                          label="Sposta su"
                          onClick={() => moveExercise(selectedDayIndex, exerciseIndex, -1)}
                          disabled={exerciseIndex === 0}
                        >
                          <ArrowUp size={15} />
                        </IconButton>
                        <IconButton
                          label="Sposta giù"
                          onClick={() => moveExercise(selectedDayIndex, exerciseIndex, 1)}
                          disabled={exerciseIndex === selectedDay.exercises.length - 1}
                        >
                          <ArrowDown size={15} />
                        </IconButton>
                        <button
                          type="button"
                          onClick={() => setSelectedExercise({ dayIndex: selectedDayIndex, exerciseIndex })}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-slate-200 hover:bg-white/20 active:scale-95 transition"
                          aria-label={`Modifica ${exercise.name}`}
                        >
                          <Edit3 size={16} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => addExercise(selectedDayIndex)}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 bg-white/[0.02] p-8 text-center transition-all hover:bg-white/[0.04]"
                >
                  <Dumbbell size={28} className="text-gym-muted" />
                  <span className="text-sm font-bold text-slate-300">Nessun esercizio in questo giorno</span>
                  <span className="text-xs text-gym-muted">Tocca per aggiungere il primo esercizio</span>
                </button>
              )}
            </div>
          </Card>
        ) : null}
      </section>

      {/* Floating Elements Portaled to Body per superare il transform di MotionPage */}
      {mounted && typeof document !== "undefined" ? createPortal(
        <>
          {/* Banner Messaggio Toast */}
          {message ? (
            <div
              className={`fixed bottom-36 left-1/2 z-50 -translate-x-1/2 rounded-2xl px-5 py-3 text-sm font-extrabold shadow-2xl backdrop-blur-md ${
                message.includes("salva") || message.includes("successo") || message === "Salvato"
                  ? "border border-emerald-500/40 bg-emerald-950/90 text-emerald-300"
                  : "border border-red-500/40 bg-red-950/90 text-red-300"
              }`}
            >
              {message}
            </div>
          ) : null}

          {/* Sticky Bottom Bar per Salvataggio Scheda (Posizionato SOPRA la Bottom Navbar dell'app) */}
          <div className="fixed bottom-[calc(5.2rem+env(safe-area-inset-bottom))] inset-x-4 z-[90] mx-auto max-w-md pointer-events-none">
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={save}
              disabled={saving}
              className="pointer-events-auto flex w-full items-center justify-center gap-2.5 rounded-2xl border border-gym-accent/50 bg-gym-accent py-3.5 text-base font-extrabold text-slate-950 shadow-[0_4px_25px_rgba(198,95,55,0.4)] transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
            >
              <Save size={20} />
              <span>{saving ? "Salvataggio in corso…" : "Salva Scheda"}</span>
            </motion.button>
          </div>

          {/* Premium Glass Bottom Sheet per la Modifica Esercizio */}
          <AnimatePresence>
            {editingExercise && selectedExercise ? (
              <>
                {/* Backdrop Scuro Sfumato */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedExercise(null)}
                  className="fixed inset-0 z-[95] bg-black/75 backdrop-blur-md"
                />

                {/* Bottom Sheet Drawer */}
                <motion.div
                  initial={reduceMotion ? { opacity: 1 } : { y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 30, stiffness: 300 }}
                  className="fixed inset-x-0 bottom-0 z-[100] mx-auto flex max-h-[85dvh] max-w-md flex-col rounded-t-[2.5rem] border-t border-white/15 bg-[#050708]/98 text-gym-soft shadow-2xl backdrop-blur-3xl pb-[calc(1rem+env(safe-area-inset-bottom))]"
                  role="dialog"
                  aria-modal="true"
                  aria-label={`Modifica ${editingExercise.name}`}
                >
                  {/* Maniglia di Trascinamento & Header Bottom Sheet */}
                  <div className="sticky top-0 z-30 flex flex-col items-center border-b border-white/10 bg-[#050708]/95 px-4 pt-3 pb-3.5 backdrop-blur-2xl rounded-t-[2.5rem]">
                    {/* Visual Drag Handle Pill */}
                    <div className="h-1.5 w-12 rounded-full bg-white/20 mb-3" />

                    <div className="flex w-full items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="technical-label text-gym-accent">Esercizio {editingExercise.exercise_order}</p>
                        <h2 className="truncate text-lg font-extrabold text-white">{editingExercise.name}</h2>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedExercise(null)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-slate-300 hover:bg-white/20 active:scale-95 transition"
                        aria-label="Chiudi"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Form Corpo Scrollabile */}
                  <div 
                    className="overflow-y-auto hide-scrollbar no-scrollbar space-y-4 p-4 pb-12"
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                  >
                  <Card variant="primary" className="space-y-4 p-4">
                    <Field label="Nome Esercizio">
                      <input
                        className="input font-bold text-white text-lg"
                        value={editingExercise.name}
                        onChange={(event) =>
                          updateExercise(selectedExercise.dayIndex, selectedExercise.exerciseIndex, {
                            name: event.target.value,
                          })
                        }
                      />
                    </Field>

                    <div className="grid grid-cols-3 gap-2.5">
                      <Field label="Serie">
                        <input
                          className="input text-center text-lg font-black text-gym-accent"
                          inputMode="numeric"
                          value={editingExercise.sets ?? ""}
                          onChange={(event) =>
                            updateExercise(selectedExercise.dayIndex, selectedExercise.exerciseIndex, {
                              sets: toNumberOrNull(event.target.value),
                            })
                          }
                        />
                      </Field>
                      <Field label="Reps">
                        <input
                          className="input text-center text-lg font-black text-white"
                          value={editingExercise.reps ?? ""}
                          onChange={(event) =>
                            updateExercise(selectedExercise.dayIndex, selectedExercise.exerciseIndex, {
                              reps: event.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="Recupero (s)">
                        <input
                          className="input text-center text-lg font-black text-white"
                          inputMode="numeric"
                          value={editingExercise.rest_seconds ?? ""}
                          onChange={(event) =>
                            updateExercise(selectedExercise.dayIndex, selectedExercise.exerciseIndex, {
                              rest_seconds: toNumberOrNull(event.target.value),
                            })
                          }
                        />
                      </Field>
                    </div>
                  </Card>

                  <Card className="space-y-4 p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Gruppo Muscolare">
                        <input
                          className="input text-sm"
                          value={editingExercise.muscle_group ?? ""}
                          onChange={(event) =>
                            updateExercise(selectedExercise.dayIndex, selectedExercise.exerciseIndex, {
                              muscle_group: event.target.value,
                            })
                          }
                          placeholder="Petto, Dorsali..."
                        />
                      </Field>
                      <Field label="RPE Target">
                        <input
                          className="input text-sm"
                          value={editingExercise.target_rpe ?? ""}
                          onChange={(event) =>
                            updateExercise(selectedExercise.dayIndex, selectedExercise.exerciseIndex, {
                              target_rpe: event.target.value,
                            })
                          }
                          placeholder="8.5 / RIR 2"
                        />
                      </Field>
                    </div>

                    <Field label="Peso Suggerito">
                      <input
                        className="input text-sm"
                        value={editingExercise.suggested_weight ?? ""}
                        onChange={(event) =>
                          updateExercise(selectedExercise.dayIndex, selectedExercise.exerciseIndex, {
                            suggested_weight: event.target.value,
                          })
                        }
                        placeholder="Es. 60kg o 70%"
                      />
                    </Field>
                  </Card>

                  <Card className="space-y-4 p-4">
                    <Field label="Note Tecniche / Esecuzione">
                      <textarea
                        className="input min-h-20 text-sm"
                        value={editingExercise.technique_notes ?? ""}
                        onChange={(event) =>
                          updateExercise(selectedExercise.dayIndex, selectedExercise.exerciseIndex, {
                            technique_notes: event.target.value,
                          })
                        }
                        placeholder="Focus sul fermo al petto..."
                      />
                    </Field>

                    <Field label="Note Trainer">
                      <textarea
                        className="input min-h-20 text-sm"
                        value={editingExercise.trainer_notes ?? ""}
                        onChange={(event) =>
                          updateExercise(selectedExercise.dayIndex, selectedExercise.exerciseIndex, {
                            trainer_notes: event.target.value,
                          })
                        }
                        placeholder="Indicazioni dal PT..."
                      />
                    </Field>
                  </Card>

                  {/* Picker GIF ExerciseDB */}
                  <Card className="p-4">
                    <p className="technical-label text-gym-accent mb-1">Animazione & GIF Demonstrativa</p>
                    <ExerciseDbMediaPicker
                      exerciseId={editingExercise.id ?? ""}
                      exerciseName={editingExercise.name}
                      currentMediaUrl={editingExercise.media_url}
                      currentExerciseDbName={editingExercise.exercise_db_name}
                      currentExerciseDbId={editingExercise.exercise_db_id}
                      offlineMode={true}
                      onSaved={(updated) =>
                        updateExercise(selectedExercise.dayIndex, selectedExercise.exerciseIndex, updated)
                      }
                    />
                  </Card>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => deleteExercise(selectedExercise.dayIndex, selectedExercise.exerciseIndex)}
                      className="flex-1 rounded-2xl border border-red-500/30 bg-red-500/10 py-3.5 text-sm font-extrabold text-red-400 hover:bg-red-500/20 active:scale-95 transition"
                    >
                      Elimina Esercizio
                    </button>
                    <Button
                      type="button"
                      onClick={() => setSelectedExercise(null)}
                      className="flex-1 rounded-2xl py-3.5 text-sm font-extrabold"
                    >
                      Conferma e Chiudi
                    </Button>
                  </div>
                </div>
              </motion.div>
              </>
            ) : null}
          </AnimatePresence>
        </>,
        document.body
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 active:scale-95 disabled:opacity-20 transition"
    >
      {children}
    </button>
  );
}

function normalizePlan(plan: EditablePlan): EditablePlan {
  return { ...plan, days: normalizeDays(plan.days ?? []) };
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
