"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ImageIcon,
  Pause,
  Play,
  PlayCircle,
  RotateCcw,
  Save,
  TimerReset,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCountdown, formatRestTime } from "@/lib/utils/time";
import { AnimatedAccordion } from "@/components/motion/AnimatedAccordion";
import { AnimatedProgressBar } from "@/components/motion/AnimatedProgressBar";

type Exercise = {
  id: string;
  name: string;
  exercise_db_query?: string | null;
  exercise_db_id?: string | null;
  exercise_db_name?: string | null;
  exercise_db_confidence?: string | null;
  exercise_db_match_status?: string | null;
  exercise_db_match_score?: number | null;
  muscle_group?: string | null;
  target_rpe?: string | null;
  sets?: number | null;
  reps?: string | null;
  rest_seconds?: number | null;
  suggested_weight?: string | null;
  technique_notes?: string | null;
  tips?: string | null;
  video_url?: string | null;
  media_url?: string | null;
  trainer_notes?: string | null;
};

type Day = {
  id: string;
  workout_plan_id: string;
  exercises: Exercise[];
};

type SetDraft = {
  id?: string;
  set_number: number;
  reps: string;
  weight: string;
  weight_source: "previous" | "manual" | "empty";
  rpe: string;
  completed: boolean;
};

type ExerciseDraft = {
  id?: string;
  exercise_id: string;
  completed: boolean;
  personal_notes: string;
  sets: SetDraft[];
};

type ActiveTimer = {
  exerciseId: string;
  exerciseName: string;
  defaultSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  finished: boolean;
};

type Props = {
  day: Day;
};

export function WorkoutSessionClient({ day }: Props) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, ExerciseDraft>>({});
  const [generalNotes, setGeneralNotes] = useState("");
  const [status, setStatus] = useState("Preparazione sessione...");
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const firstSaveSkipped = useRef(false);
  const hasVibratedForTimer = useRef(false);
  const exerciseRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    let cancelled = false;

    async function createOrResumeSession() {
      setStatus("Creo o riprendo la sessione...");
      const response = await fetch("/api/workout-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workout_plan_id: day.workout_plan_id,
          workout_day_id: day.id,
        }),
      });
      const result = await safeJson(response);

      if (cancelled) return;

      if (!response.ok || !result?.success) {
        setStatus(result?.error ?? "Errore creazione sessione.");
        return;
      }

      const session = result.session;
      setSessionId(session.id);
      setGeneralNotes(session.general_notes ?? "");

      const nextDrafts: Record<string, ExerciseDraft> = {};
      for (const exercise of day.exercises) {
        const existing = session.session_exercises?.find(
          (item: any) => item.exercise_id === exercise.id,
        );
        const setCount = Math.max(1, Number(exercise.sets ?? 1));
        const existingSets = [...(existing?.exercise_sets ?? [])].sort(
          (a: any, b: any) => a.set_number - b.set_number,
        );
        const plannedReps = getPlannedRepsBySet(exercise.reps, setCount);

        nextDrafts[exercise.id] = {
          id: existing?.id,
          exercise_id: exercise.id,
          completed: existing?.completed ?? false,
          personal_notes: existing?.personal_notes ?? "",
          sets: Array.from({ length: setCount }, (_item, index) => {
            const current = existingSets.find(
              (set: any) => set.set_number === index + 1,
            );
            const savedReps =
              current?.reps === null || current?.reps === undefined
                ? ""
                : String(current.reps);
            return {
              id: current?.id,
              set_number: index + 1,
              reps: savedReps || plannedReps[index] || "",
              weight: current?.weight ?? "",
              weight_source: getWeightSource(current?.weight_source, current?.weight),
              rpe: current?.rpe?.toString() ?? "",
              completed: current?.completed ?? false,
            };
          }),
        };
      }

      setDrafts(nextDrafts);
      firstSaveSkipped.current = false;
      setStatus(
        result.resumed ? "Sessione in corso ripresa." : "Sessione iniziata.",
      );
    }

    createOrResumeSession().catch((error) => setStatus(error.message));

    return () => {
      cancelled = true;
    };
  }, [day.id, day.workout_plan_id, day.exercises]);

  useEffect(() => {
    if (!sessionId) return;
    if (!firstSaveSkipped.current) {
      firstSaveSkipped.current = true;
      return;
    }

    const timeout = window.setTimeout(async () => {
      setSaving(true);
      try {
        const response = await fetch(`/api/workout-sessions/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            general_notes: generalNotes,
            exercises: Object.values(drafts).map(toApiPayload),
          }),
        });
        const result = await safeJson(response);
        if (!response.ok || !result?.success)
          throw new Error(result?.error ?? "Errore autosalvataggio.");
        setStatus("Salvato automaticamente.");
      } catch (error) {
        setStatus(
          error instanceof Error ? error.message : "Errore autosalvataggio.",
        );
      } finally {
        setSaving(false);
      }
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [drafts, generalNotes, sessionId]);

  useEffect(() => {
    if (!activeTimer?.isRunning || activeTimer.remainingSeconds <= 0) return;

    const interval = window.setInterval(() => {
      setActiveTimer((current) => {
        if (!current || !current.isRunning) return current;
        const nextRemaining = Math.max(0, current.remainingSeconds - 1);
        return {
          ...current,
          remainingSeconds: nextRemaining,
          isRunning: nextRemaining > 0,
          finished: nextRemaining === 0,
        };
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [activeTimer?.isRunning, activeTimer?.remainingSeconds]);

  useEffect(() => {
    if (!activeTimer?.finished) {
      hasVibratedForTimer.current = false;
      return;
    }

    if (!hasVibratedForTimer.current) {
      hasVibratedForTimer.current = true;
      if ("vibrate" in navigator) navigator.vibrate([250, 120, 250]);
    }
  }, [activeTimer?.finished]);

  const completedSets = useMemo(
    () =>
      Object.values(drafts).reduce(
        (total, draft) =>
          total + draft.sets.filter((set) => set.completed).length,
        0,
      ),
    [drafts],
  );
  const totalSets = useMemo(
    () =>
      day.exercises.reduce(
        (total, exercise) => total + Math.max(1, Number(exercise.sets ?? 1)),
        0,
      ),
    [day.exercises],
  );
  const progress =
    totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

  function updateDraft(exerciseId: string, patch: Partial<ExerciseDraft>) {
    setDrafts((current) => ({
      ...current,
      [exerciseId]: {
        ...current[exerciseId],
        ...patch,
      },
    }));
  }

  function updateSet(
    exerciseId: string,
    setNumber: number,
    patch: Partial<SetDraft>,
  ) {
    setDrafts((current) => {
      const draft = current[exerciseId];
      if (!draft) return current;

      let nextSets = draft.sets.map((set) => {
        if (set.set_number !== setNumber) return set;
        return { ...set, ...patch };
      });

      if (patch.weight !== undefined && patch.weight.trim()) {
        nextSets = nextSets.map((set) => {
          if (set.set_number <= setNumber) return set;
          if (set.weight.trim()) return set;
          return { ...set, weight: patch.weight ?? "", weight_source: "manual" };
        });
      }

      const completed =
        nextSets.length > 0 && nextSets.every((set) => set.completed);

      return {
        ...current,
        [exerciseId]: {
          ...draft,
          sets: nextSets,
          completed,
        },
      };
    });
  }

  function completeSetAndStartRest(exercise: Exercise, setNumber: number) {
    updateSet(exercise.id, setNumber, { completed: true });
    const draft = drafts[exercise.id];
    if (!draft) return;
    if (setNumber < draft.sets.length) startTimer(exercise);
  }

  function goToNextIncompleteExercise(currentExerciseId?: string) {
    const sourceExercises = currentExerciseId
      ? day.exercises.slice(
          day.exercises.findIndex(
            (exercise) => exercise.id === currentExerciseId,
          ) + 1,
        )
      : day.exercises;

    const nextExercise =
      sourceExercises.find((exercise) => !drafts[exercise.id]?.completed) ??
      day.exercises.find((exercise) => !drafts[exercise.id]?.completed);

    if (!nextExercise) return;

    exerciseRefs.current[nextExercise.id]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function copyPreviousWeight(exerciseId: string, setNumber: number) {
    setDrafts((current) => {
      const draft = current[exerciseId];
      const previous = draft.sets.find(
        (set) => set.set_number === setNumber - 1,
      );
      if (!previous?.weight) return current;

      return {
        ...current,
        [exerciseId]: {
          ...draft,
          sets: draft.sets.map((set) =>
            set.set_number === setNumber
              ? { ...set, weight: previous.weight, weight_source: previous.weight_source === "previous" ? "previous" : "manual" }
              : set,
          ),
        },
      };
    });
  }

  function startTimer(exercise: Exercise) {
    const total = Math.max(1, Number(exercise.rest_seconds ?? 60));
    setActiveTimer({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      defaultSeconds: total,
      remainingSeconds: total,
      isRunning: true,
      finished: false,
    });
  }

  function pauseTimer() {
    setActiveTimer((current) =>
      current ? { ...current, isRunning: false } : current,
    );
  }

  function resumeTimer() {
    setActiveTimer((current) =>
      current && current.remainingSeconds > 0
        ? { ...current, isRunning: true, finished: false }
        : current,
    );
  }

  function resetTimer() {
    setActiveTimer((current) =>
      current
        ? {
            ...current,
            remainingSeconds: current.defaultSeconds,
            isRunning: false,
            finished: false,
          }
        : current,
    );
  }

  function adjustTimer(deltaSeconds: number) {
    setActiveTimer((current) => {
      if (!current) return current;
      const nextRemaining = Math.max(
        0,
        current.remainingSeconds + deltaSeconds,
      );
      return {
        ...current,
        remainingSeconds: nextRemaining,
        isRunning: nextRemaining > 0 ? current.isRunning : false,
        finished: nextRemaining === 0,
      };
    });
  }

  async function completeSession() {
    if (!sessionId) return;

    if (completedSets < totalSets) {
      const confirmed = window.confirm(
        `Hai completato ${completedSets}/${totalSets} serie. Vuoi chiudere comunque l'allenamento?`,
      );
      if (!confirmed) return;
    }

    setCompleting(true);
    setStatus("Completo la sessione...");

    try {
      await fetch(`/api/workout-sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          general_notes: generalNotes,
          exercises: Object.values(drafts).map(toApiPayload),
        }),
      });

      const response = await fetch(
        `/api/workout-sessions/${sessionId}/complete`,
        { method: "POST" },
      );
      const result = await safeJson(response);
      if (!response.ok || !result?.success)
        throw new Error(result?.error ?? "Errore completamento.");
      router.push(`/history/${sessionId}`);
      router.refresh();
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Errore completamento.",
      );
      setCompleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="sticky top-24 z-20 border-gym-accent/30 bg-gym-card/95 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-gym-muted">Progresso serie</p>
            <p className="text-xl font-black">
              {completedSets}/{totalSets} serie completate
            </p>
          </div>
          <span className="rounded-full bg-gym-accent px-3 py-1 text-sm font-black text-slate-950">
            {progress}%
          </span>
        </div>
<AnimatedProgressBar value={progress} />
        <p className="mt-3 flex items-center gap-2 text-xs text-gym-muted">
          <Save size={14} /> {saving ? "Salvataggio..." : status}
        </p>
      </Card>

      <AnimatePresence initial={false}>
        {activeTimer ? (
          <StickyTimer
            key="sticky-timer"
            timer={activeTimer}
            onPause={pauseTimer}
            onResume={resumeTimer}
            onReset={resetTimer}
            onAdjust={adjustTimer}
          />
        ) : null}
      </AnimatePresence>

      {day.exercises.map((exercise, index) => (
        <TrackableExerciseCard
          index={index}
          key={exercise.id}
          exercise={exercise}
          draft={drafts[exercise.id]}
          activeTimer={activeTimer}
          onChange={(patch) => updateDraft(exercise.id, patch)}
          onSetChange={(setNumber, patch) =>
            updateSet(exercise.id, setNumber, patch)
          }
          onCompleteSet={(setNumber) =>
            completeSetAndStartRest(exercise, setNumber)
          }
          onCopyPreviousWeight={(setNumber) =>
            copyPreviousWeight(exercise.id, setNumber)
          }
          onStartTimer={() => startTimer(exercise)}
          onPauseTimer={pauseTimer}
          onResumeTimer={resumeTimer}
          onResetTimer={resetTimer}
          onAdjustTimer={adjustTimer}
          onGoNext={() => goToNextIncompleteExercise(exercise.id)}
          setCardRef={(element) => {
            exerciseRefs.current[exercise.id] = element;
          }}
        />
      ))}

      <Card>
        <label
          className="text-sm font-bold text-gym-muted"
          htmlFor="general-notes"
        >
          Note generali allenamento
        </label>
        <textarea
          id="general-notes"
          value={generalNotes}
          onChange={(event) => setGeneralNotes(event.target.value)}
          placeholder="Come è andata? Energia, fastidi, note utili..."
          className="mt-2 min-h-28 w-full rounded-2xl border border-white/10 bg-black/20 p-3 text-white placeholder:text-slate-500"
        />
      </Card>

      <button
        onClick={completeSession}
        disabled={!sessionId || completing}
        className="sticky bottom-24 z-10 w-full rounded-2xl bg-gym-accent px-4 py-4 text-lg font-black text-slate-950 shadow-glow disabled:opacity-50"
      >
        {completing ? "Completamento..." : "Completa allenamento"}
      </button>
    </div>
  );
}

function TrackableExerciseCard({
  index,
  exercise,
  draft,
  activeTimer,
  onChange,
  onSetChange,
  onCompleteSet,
  onCopyPreviousWeight,
  onStartTimer,
  onPauseTimer,
  onResumeTimer,
  onResetTimer,
  onAdjustTimer,
  onGoNext,
  setCardRef,
}: {
  index: number;
  exercise: Exercise;
  draft?: ExerciseDraft;
  activeTimer: ActiveTimer | null;
  onChange: (patch: Partial<ExerciseDraft>) => void;
  onSetChange: (setNumber: number, patch: Partial<SetDraft>) => void;
  onCompleteSet: (setNumber: number) => void;
  onCopyPreviousWeight: (setNumber: number) => void;
  onStartTimer: () => void;
  onPauseTimer: () => void;
  onResumeTimer: () => void;
  onResetTimer: () => void;
  onAdjustTimer: (deltaSeconds: number) => void;
  onGoNext: () => void;
  setCardRef: (element: HTMLDivElement | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [forceExpanded, setForceExpanded] = useState(false);
  const reduceMotion = useReducedMotion();

  if (!draft) {
    return (
      <Card>
        <p className="text-gym-muted">Caricamento esercizio...</p>
      </Card>
    );
  }

  const completedSets = draft.sets.filter((set) => set.completed).length;
  const timerForThisExercise = activeTimer?.exerciseId === exercise.id ? activeTimer : null;
  const nextSet = draft.sets.find((set) => !set.completed) ?? null;
  const nextSetNumber = nextSet?.set_number ?? null;

  if (draft.completed && !forceExpanded) {
    return (
      <motion.div
        ref={setCardRef}
        layout
        initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.98 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
      >
        <Card className="border-gym-accent/70 bg-gym-accent/10 shadow-glow">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gym-accent text-slate-950">
              <CheckCircle2 size={30} fill="currentColor" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wide text-gym-accent">Completato</p>
              <h3 className="line-clamp-2 text-xl font-black leading-tight">{exercise.name}</h3>
              <p className="text-sm text-slate-300">{completedSets}/{draft.sets.length} serie · {exercise.muscle_group ?? "Esercizio"}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={onGoNext} className="rounded-2xl bg-gym-accent px-4 py-3 text-sm font-black text-slate-950">
              Prossimo
            </button>
            <button type="button" onClick={() => setForceExpanded(true)} className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-slate-200">
              Modifica
            </button>
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={setCardRef}
      layout
      initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.985 }}
      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: "easeOut", delay: reduceMotion ? 0 : Math.min(index * 0.035, 0.12) }}
    >
      <Card className={draft.completed ? "border-gym-accent/70 bg-gym-accent/5 shadow-glow" : undefined}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-gym-accent">{exercise.muscle_group ?? "Esercizio"}</p>
            <h3 className="mt-1 line-clamp-2 text-2xl font-black leading-tight">{exercise.name}</h3>
            <p className="mt-2 text-sm font-bold text-slate-300">
              {exercise.sets ?? "-"} serie x {exercise.reps ?? "-"} · Recupero {formatRestTime(exercise.rest_seconds)}
            </p>
            {exercise.target_rpe ? <p className="mt-1 text-xs font-bold text-gym-accent">RPE target: {exercise.target_rpe}</p> : null}
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${draft.completed ? "bg-gym-accent text-slate-950" : "bg-white/10 text-slate-200"}`}>
            {completedSets}/{draft.sets.length}
          </span>
        </div>

        {draft.completed && forceExpanded ? (
          <button type="button" onClick={() => setForceExpanded(false)} className="mt-3 w-full rounded-2xl bg-gym-accent/15 px-4 py-3 text-sm font-black text-gym-accent">
            Richiudi card completata
          </button>
        ) : null}

        <MediaPreview mediaUrl={exercise.media_url} name={exercise.name} exerciseDbName={exercise.exercise_db_name} exerciseDbScore={exercise.exercise_db_match_score} />

        <AnimatePresence mode="wait">
        {nextSet ? (
          <motion.div
            key={nextSet.set_number}
            initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.99 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="mt-4 rounded-[1.5rem] border border-gym-accent/60 bg-gym-accent/10 p-4 shadow-sm"
          >
            <p className="text-xs font-black uppercase tracking-[0.22em] text-gym-accent">Prossima serie</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <h4 className="text-2xl font-black">Serie {nextSet.set_number} di {draft.sets.length}</h4>
              {timerForThisExercise ? <span className="rounded-full bg-black/25 px-3 py-1 text-xs font-bold text-slate-200">Timer {formatCountdown(timerForThisExercise.remainingSeconds)}</span> : null}
            </div>
            {nextSet.weight ? (
              <p className="mt-2 text-sm text-slate-300">
                {nextSet.weight_source === "previous" ? "Ultima volta" : "Oggi"}: <strong>{nextSet.weight} kg</strong>{nextSet.reps ? ` x ${nextSet.reps}` : ""}
              </p>
            ) : (
              <p className="mt-2 text-sm text-gym-muted">Inserisci il carico della serie.</p>
            )}

            <div className="mt-4">
              <Field
                label="Kg"
                value={nextSet.weight}
                inputMode="decimal"
                sourceLabel={getWeightSourceLabel(nextSet.weight_source, nextSet.weight)}
                mutedValue={nextSet.weight_source === "previous"}
                big
                onChange={(value) => onSetChange(nextSet.set_number, { weight: value, weight_source: value.trim() ? "manual" : "empty" })}
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Reps" value={nextSet.reps} inputMode="text" onChange={(value) => onSetChange(nextSet.set_number, { reps: value })} />
              <Field label="RPE" value={nextSet.rpe} inputMode="numeric" onChange={(value) => onSetChange(nextSet.set_number, { rpe: clampRpeInput(value) })} />
            </div>

            {nextSet.set_number > 1 ? (
              <button type="button" onClick={() => onCopyPreviousWeight(nextSet.set_number)} className="mt-3 rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-slate-200">
                Usa kg serie precedente
              </button>
            ) : null}

            <motion.button
              type="button"
              onClick={() => onCompleteSet(nextSet.set_number)}
              whileTap={reduceMotion ? undefined : { scale: 0.97 }}
              transition={{ duration: 0.12 }}
              className="mt-4 w-full rounded-2xl bg-gym-accent px-4 py-4 text-base font-black text-slate-950 shadow-glow"
            >
              Completa serie {nextSet.set_number}
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="all-done"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            className="mt-4 rounded-3xl bg-gym-accent/10 p-4 text-center"
          >
            <p className="font-black text-gym-accent">Tutte le serie sono completate.</p>
          </motion.div>
        )}
        </AnimatePresence>

        <div className="mt-4 space-y-2 rounded-3xl bg-black/20 p-3">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gym-muted">Serie</p>
          {draft.sets.map((set) => (
            <motion.div
              key={set.set_number}
              layout
              animate={reduceMotion ? undefined : { scale: set.set_number === nextSetNumber ? 1.01 : 1 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className={`flex items-center justify-between gap-3 rounded-2xl px-3 py-2 text-sm ${set.completed ? "bg-gym-accent/10 text-slate-100" : set.set_number === nextSetNumber ? "bg-white/10 text-white" : "text-gym-muted"}`}
            >
              <span className="font-bold">{set.completed ? "✓" : set.set_number === nextSetNumber ? "Ora" : ""} Serie {set.set_number}</span>
              <span className="text-right text-xs">
                {set.completed || set.weight || set.reps || set.rpe ? `${set.weight ? `${set.weight} kg` : "kg -"} · ${set.reps || "reps -"}${set.rpe ? ` · RPE ${set.rpe}` : ""}` : "da fare"}
              </span>
              {set.completed ? (
                <button type="button" onClick={() => onSetChange(set.set_number, { completed: false })} className="rounded-xl bg-white/10 px-2 py-1 text-[10px] font-bold text-slate-200">Modifica</button>
              ) : null}
            </motion.div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={onStartTimer} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-slate-100">
            <TimerReset size={18} /> {timerForThisExercise ? `Recupero ${formatCountdown(timerForThisExercise.remainingSeconds)}` : "Avvia recupero"}
          </button>
          {exercise.video_url ? (
            <a href={exercise.video_url} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-black">
              <PlayCircle size={18} /> Video
            </a>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setNotesOpen((value) => !value)} className="rounded-2xl bg-black/20 px-4 py-3 text-sm font-black text-slate-200">
            {draft.personal_notes ? "Modifica nota" : "+ Nota"}
          </button>
          <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-2xl bg-black/20 px-4 py-3 text-sm font-black text-slate-200">
            {open ? "Nascondi tecnica" : "Tecnica"}
          </button>
        </div>

        <AnimatedAccordion open={notesOpen || Boolean(draft.personal_notes)}>
          <div className="mt-3 rounded-2xl bg-black/20 p-3">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-gym-muted">Note personali</span>
              <textarea value={draft.personal_notes} onChange={(event) => onChange({ personal_notes: event.target.value })} placeholder="Sensazioni, dolore, tecnica, carico da aumentare..." className="min-h-20 w-full rounded-2xl border border-white/10 bg-gym-bg px-3 py-3 text-sm placeholder:text-slate-500" />
            </label>
            <QuickNoteChips onAdd={(text) => {
              const separator = draft.personal_notes.trim() ? " " : "";
              onChange({ personal_notes: `${draft.personal_notes}${separator}${text}` });
            }} />
          </div>
        </AnimatedAccordion>

        <AnimatedAccordion open={open}>
          <div className="mt-3 space-y-3 rounded-2xl bg-black/20 p-3 text-sm text-slate-200">
            {exercise.technique_notes ? <p><strong>Tecnica:</strong> {exercise.technique_notes}</p> : null}
            {exercise.tips ? <p><strong>Consigli:</strong> {exercise.tips}</p> : null}
            {exercise.trainer_notes ? <p><strong>Note PT:</strong> {exercise.trainer_notes}</p> : null}
            {!exercise.technique_notes && !exercise.tips && !exercise.trainer_notes ? <p className="text-gym-muted">Nessun consiglio tecnico inserito per questo esercizio.</p> : null}
          </div>
        </AnimatedAccordion>
      </Card>
    </motion.div>
  );
}

function QuickNoteChips({ onAdd }: { onAdd: (text: string) => void }) {
  const notes = [
    "Duro.",
    "Facile.",
    "Aumentare peso la prossima volta.",
    "Tecnica da migliorare.",
    "Fastidio/dolore.",
  ];

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {notes.map((note) => (
        <button
          key={note}
          type="button"
          onClick={() => onAdd(note)}
          className="rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-slate-300 active:scale-95"
        >
          + {note.replace(".", "")}
        </button>
      ))}
    </div>
  );
}

function StickyTimer({
  timer,
  onPause,
  onResume,
  onReset,
  onAdjust,
}: {
  timer: ActiveTimer;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onAdjust: (deltaSeconds: number) => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: -10, scale: 0.98 }}
      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.98 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="sticky top-[196px] z-20"
    >
    <Card
      className={`${timer.finished ? "border-gym-accent shadow-glow" : "border-white/10"}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-gym-muted">
            Timer recupero
          </p>
          <p className="line-clamp-1 text-sm font-bold text-slate-300">
            {timer.exerciseName}
          </p>
        </div>
        <p className="text-3xl font-black text-gym-accent">
          {formatCountdown(timer.remainingSeconds)}
        </p>
      </div>
      {timer.finished ? (
        <p className="mt-2 rounded-2xl bg-gym-accent/15 p-2 text-center text-sm font-black text-gym-accent">
          Recupero terminato
        </p>
      ) : null}
      <TimerControls
        timer={timer}
        onPause={onPause}
        onResume={onResume}
        onReset={onReset}
        onAdjust={onAdjust}
      />
    </Card>
    </motion.div>
  );
}

function TimerControls({
  timer,
  compact = false,
  onPause,
  onResume,
  onReset,
  onAdjust,
}: {
  timer: ActiveTimer;
  compact?: boolean;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onAdjust: (deltaSeconds: number) => void;
}) {
  return (
    <div className="mt-3 grid grid-cols-4 gap-2">
      {timer.isRunning ? (
        <motion.button type="button" onClick={onPause} whileTap={{ scale: 0.96 }} className="flex min-h-11 items-center justify-center rounded-2xl bg-white/10 px-3 py-2 text-xs font-black">
          Pausa
        </motion.button>
      ) : (
        <motion.button type="button" onClick={onResume} whileTap={{ scale: 0.96 }} className="flex min-h-11 items-center justify-center rounded-2xl bg-gym-accent px-3 py-2 text-xs font-black text-slate-950">
          Riprendi
        </motion.button>
      )}
      <motion.button type="button" onClick={() => onAdjust(15)} whileTap={{ scale: 0.96 }} className="min-h-11 rounded-2xl bg-white/10 px-3 py-2 text-xs font-black">+15s</motion.button>
      <motion.button type="button" onClick={() => onAdjust(-9999)} whileTap={{ scale: 0.96 }} className="min-h-11 rounded-2xl bg-white/10 px-3 py-2 text-xs font-black">Salta</motion.button>
      <motion.button type="button" onClick={onReset} whileTap={{ scale: 0.96 }} className="flex min-h-11 items-center justify-center rounded-2xl bg-white/5 px-3 py-2 text-xs font-bold text-gym-muted">
        Reset
      </motion.button>
    </div>
  );
}

function MediaPreview({
  mediaUrl,
  name,
  exerciseDbName,
  exerciseDbScore,
}: {
  mediaUrl?: string | null;
  name: string;
  exerciseDbName?: string | null;
  exerciseDbScore?: number | null;
}) {
  const cleanUrl = mediaUrl?.trim();

  if (!cleanUrl) {
    return (
      <div className="mt-3 rounded-2xl border border-dashed border-white/10 bg-black/10 px-3 py-2 text-xs font-bold text-gym-muted">
        GIF non disponibile per questo esercizio.
      </div>
    );
  }

  if (isDirectImageUrl(cleanUrl)) {
    return (
      <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.03] px-3 py-3">
        <div className="flex justify-center">
          <img
            src={cleanUrl}
            alt={name}
            className="h-40 w-40 rounded-2xl object-contain sm:h-44 sm:w-44"
            loading="lazy"
          />
        </div>
        {exerciseDbName ? (
          <div className="mt-2 text-center text-xs text-gym-muted">
            GIF ExerciseDB: <span className="font-bold text-slate-200">{exerciseDbName}</span>
            {exerciseDbScore ? ` · match ${exerciseDbScore}/100` : ""}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-3xl border border-white/10 bg-black/20 p-4 text-center">
      <ImageIcon className="mx-auto text-gym-muted" size={32} />
      <p className="mt-2 font-black">Media esercizio collegato</p>
      <p className="mt-1 text-sm text-gym-muted">
        Il link non sembra una foto/GIF diretta.
      </p>
      <a
        href={cleanUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex rounded-2xl bg-white/10 px-4 py-2 text-sm font-bold"
      >
        Apri media
      </a>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  inputMode,
  sourceLabel,
  mutedValue = false,
  big = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputMode?: "text" | "numeric" | "decimal";
  sourceLabel?: string;
  mutedValue?: boolean;
  big?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-gym-muted">
        {label}
      </span>
      <input
        value={value}
        inputMode={inputMode ?? "text"}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded-2xl border border-white/10 bg-gym-bg px-3 ${big ? "py-4 text-2xl" : "py-3 text-base"} font-black ${mutedValue ? "text-slate-400" : "text-white"}`}
      />
      {sourceLabel ? (
        <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide text-gym-muted">
          {sourceLabel}
        </span>
      ) : null}
    </label>
  );
}

function toApiPayload(draft: ExerciseDraft) {
  return {
    id: draft.id,
    exercise_id: draft.exercise_id,
    completed: draft.completed,
    personal_notes: draft.personal_notes,
    sets: draft.sets.map((set) => ({
      id: set.id,
      set_number: set.set_number,
      reps: set.reps.trim() || null,
      weight: set.weight.trim() || null,
      weight_source: set.weight_source,
      rpe: parseOptionalInteger(set.rpe),
      completed: set.completed,
    })),
  };
}

function getPlannedRepsBySet(
  reps: string | null | undefined,
  setCount: number,
) {
  const value = reps?.trim();
  if (!value) return Array.from({ length: setCount }, () => "");

  const descendingPattern = /^\d+(?:\s*-\s*\d+){2,}$/;
  if (descendingPattern.test(value)) {
    const parts = value
      .split("-")
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length === setCount) return parts;
  }

  return Array.from({ length: setCount }, () => value);
}

function parseOptionalInteger(value: string) {
  const normalized = value.trim();
  if (!normalized) return null;
  const parsed = Number(normalized.replace(",", "."));
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed);
}

function clampRpeInput(value: string) {
  const parsed = Number(value);
  if (!value) return "";
  if (!Number.isFinite(parsed)) return value;
  return String(Math.min(10, Math.max(1, parsed)));
}

function isDirectImageUrl(url: string) {
  return /\.(png|jpe?g|gif|webp|avif)(\?.*)?$/i.test(url);
}

function getWeightSource(source: unknown, weight: unknown): "previous" | "manual" | "empty" {
  if (!weight || String(weight).trim() === "") return "empty";
  return source === "previous" ? "previous" : "manual";
}

function getWeightSourceLabel(source: "previous" | "manual" | "empty", weight: string) {
  if (!weight.trim()) return undefined;
  if (source === "previous") return "ultima volta";
  if (source === "manual") return "oggi";
  return undefined;
}

async function safeJson(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
