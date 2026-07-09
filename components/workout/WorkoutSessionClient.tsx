"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ImageIcon,
  PlayCircle,
  TimerReset,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatCountdown, formatRestTime } from "@/lib/utils/time";
import { AnimatedAccordion } from "@/components/motion/AnimatedAccordion";

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
  name?: string | null;
  description?: string | null;
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
  personal_notes_source: "previous" | "manual" | "empty";
  personal_notes_inherited_at?: string | null;
  sets: SetDraft[];
};

type ActiveTimer = {
  exerciseId: string;
  exerciseName: string;
  defaultSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  finished: boolean;
  targetEndAt: number | null;
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
  const [progressOpen, setProgressOpen] = useState(false);
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
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
          personal_notes_source: getPersonalNotesSource(
            existing?.personal_notes,
            existing?.personal_notes_inherited,
          ),
          personal_notes_inherited_at:
            existing?.personal_notes_inherited_at ?? null,
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
              weight_source: getWeightSource(
                current?.weight_source,
                current?.weight,
              ),
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
    if (!activeTimer?.isRunning || !activeTimer.targetEndAt) return;

    const syncTimer = () => {
      setActiveTimer((current) => {
        if (!current || !current.isRunning || !current.targetEndAt)
          return current;
        const nextRemaining = Math.max(
          0,
          Math.ceil((current.targetEndAt - Date.now()) / 1000),
        );
        return {
          ...current,
          remainingSeconds: nextRemaining,
          isRunning: nextRemaining > 0,
          finished: nextRemaining === 0,
          targetEndAt: nextRemaining > 0 ? current.targetEndAt : null,
        };
      });
    };

    syncTimer();
    const interval = window.setInterval(syncTimer, 1000);
    window.addEventListener("focus", syncTimer);
    document.addEventListener("visibilitychange", syncTimer);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", syncTimer);
      document.removeEventListener("visibilitychange", syncTimer);
    };
  }, [activeTimer?.isRunning, activeTimer?.targetEndAt]);

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
    setDrafts((current) => {
      const currentDraft = current[exerciseId];
      if (!currentDraft) return current;
      const notePatch = Object.prototype.hasOwnProperty.call(
        patch,
        "personal_notes",
      )
        ? {
            personal_notes_source: patch.personal_notes?.trim()
              ? ("manual" as const)
              : ("empty" as const),
            personal_notes_inherited_at: null,
          }
        : {};

      return {
        ...current,
        [exerciseId]: {
          ...currentDraft,
          ...patch,
          ...notePatch,
        },
      };
    });
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
          return {
            ...set,
            weight: patch.weight ?? "",
            weight_source: "manual",
          };
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
              ? {
                  ...set,
                  weight: previous.weight,
                  weight_source:
                    previous.weight_source === "previous"
                      ? "previous"
                      : "manual",
                }
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
      targetEndAt: Date.now() + total * 1000,
    });
  }

  function pauseTimer() {
    setActiveTimer((current) => {
      if (!current) return current;
      const nextRemaining = current.targetEndAt
        ? Math.max(0, Math.ceil((current.targetEndAt - Date.now()) / 1000))
        : current.remainingSeconds;
      return {
        ...current,
        remainingSeconds: nextRemaining,
        isRunning: false,
        finished: nextRemaining === 0,
        targetEndAt: null,
      };
    });
  }

  function resumeTimer() {
    setActiveTimer((current) =>
      current && current.remainingSeconds > 0
        ? {
            ...current,
            isRunning: true,
            finished: false,
            targetEndAt: Date.now() + current.remainingSeconds * 1000,
          }
        : current,
    );
  }

  function closeTimer() {
    setActiveTimer(null);
  }

  function resetTimer() {
    setActiveTimer((current) =>
      current
        ? {
            ...current,
            remainingSeconds: current.defaultSeconds,
            isRunning: false,
            finished: false,
            targetEndAt: null,
          }
        : current,
    );
  }

  function adjustTimer(deltaSeconds: number) {
    setActiveTimer((current) => {
      if (!current) return current;
      const baseRemaining =
        current.isRunning && current.targetEndAt
          ? Math.max(0, Math.ceil((current.targetEndAt - Date.now()) / 1000))
          : current.remainingSeconds;
      const nextRemaining = Math.max(0, baseRemaining + deltaSeconds);
      const isRunning = nextRemaining > 0 ? current.isRunning : false;
      return {
        ...current,
        remainingSeconds: nextRemaining,
        isRunning,
        finished: nextRemaining === 0,
        targetEndAt: isRunning ? Date.now() + nextRemaining * 1000 : null,
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
    setStatus("Completo allenamento...");

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
      <div className="fixed right-4 top-[calc(env(safe-area-inset-top)+4.25rem)] z-50">
        <WorkoutProgressButton
          progress={progress}
          completedSets={completedSets}
          totalSets={totalSets}
          onClick={() => setProgressOpen(true)}
        />
      </div>

      <Card variant="subtle" className="p-3 pr-20">
        <h1 className="line-clamp-2 text-xl font-extrabold leading-tight">
          {day.name ?? "Allenamento"}
        </h1>
        {day.description ? (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setGuidelinesOpen((value) => !value)}
              className="flex w-full items-center justify-between rounded-2xl bg-white/[0.05] px-3 py-2 text-sm font-bold text-slate-200"
            >
              <span>Linee guida</span>
              {guidelinesOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            <AnimatedAccordion open={guidelinesOpen}>
              <p className="mt-2 rounded-2xl bg-black/20 p-3 text-sm leading-relaxed text-gym-muted">
                {day.description}
              </p>
            </AnimatedAccordion>
          </div>
        ) : null}
      </Card>

      <WorkoutProgressSheet
        open={progressOpen}
        onClose={() => setProgressOpen(false)}
        dayName={day.name ?? "Allenamento"}
        exercises={day.exercises}
        drafts={drafts}
        completedSets={completedSets}
        totalSets={totalSets}
        progress={progress}
        saving={saving}
        onGoCurrent={() => {
          setProgressOpen(false);
          goToNextIncompleteExercise();
        }}
        onCompleteSession={completeSession}
      />

      <AnimatePresence initial={false}>
        {activeTimer ? (
          <StickyTimer
            key="sticky-timer"
            timer={activeTimer}
            onPause={pauseTimer}
            onResume={resumeTimer}
            onReset={resetTimer}
            onClose={closeTimer}
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

      <Card variant="subtle" className="mb-6">
        <button
          onClick={completeSession}
          disabled={!sessionId || completing}
          className="w-full rounded-2xl border border-gym-info/25 bg-gym-info/10 px-4 py-3 text-sm font-extrabold text-gym-info transition active:scale-[0.98] disabled:opacity-50"
        >
          {completing ? "Sto chiudendo..." : "Chiudi allenamento"}
        </button>
      </Card>
    </div>
  );
}


function WorkoutProgressButton({
  progress,
  completedSets,
  totalSets,
  onClick,
}: {
  progress: number;
  completedSets: number;
  totalSets: number;
  onClick: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, progress)) / 100) * circumference;
  const isComplete = progress >= 100;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={reduceMotion ? undefined : { scale: 0.96 }}
      className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-gym-active text-center shadow-info"
      aria-label="Apri dettaglio andamento allenamento"
    >
      <svg className="h-12 w-12 -rotate-90" viewBox="0 0 48 48" aria-hidden="true">
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth="5"
        />
        <motion.circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: reduceMotion ? 0 : 0.35, ease: "easeOut" }}
          className="text-gym-accent"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-extrabold text-white">
        {isComplete ? "✓" : `${progress}%`}
      </span>
      <span className="sr-only">
        {completedSets}/{totalSets} serie
      </span>
    </motion.button>
  );
}

function WorkoutProgressSheet({
  open,
  onClose,
  dayName,
  exercises,
  drafts,
  completedSets,
  totalSets,
  progress,
  saving,
  onGoCurrent,
  onCompleteSession,
}: {
  open: boolean;
  onClose: () => void;
  dayName: string;
  exercises: Exercise[];
  drafts: Record<string, ExerciseDraft>;
  completedSets: number;
  totalSets: number;
  progress: number;
  saving: boolean;
  onGoCurrent: () => void;
  onCompleteSession: () => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 px-4 pb-4 backdrop-blur-sm"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Andamento"
            className="max-h-[82dvh] w-full max-w-md overflow-y-auto rounded-[2rem] border border-white/10 bg-gym-panel p-4 shadow-2xl shadow-black/50"
            initial={reduceMotion ? false : { y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-gym-info">Andamento</p>
                <h2 className="mt-1 text-xl font-extrabold leading-tight">{dayName}</h2>
                <p className="mt-1 text-sm text-gym-muted">
                  {completedSets}/{totalSets} serie · {progress}% · {saving ? "Salvataggio..." : "Salvato"}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-white/10 p-2 text-slate-200"
                aria-label="Chiudi dettaglio andamento"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {exercises.map((exercise) => {
                const draft = drafts[exercise.id];
                const total = Math.max(1, Number(exercise.sets ?? draft?.sets.length ?? 1));
                const completed = draft?.sets.filter((set) => set.completed).length ?? 0;
                const status = completed >= total ? "completed" : completed > 0 ? "active" : "todo";
                return (
                  <div
                    key={exercise.id}
                    className="flex items-center gap-3 rounded-2xl bg-white/[0.045] px-3 py-2"
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                        status === "completed"
                          ? "bg-gym-accent text-slate-950"
                          : status === "active"
                            ? "bg-gym-info/20 text-gym-info"
                            : "bg-white/10 text-gym-muted"
                      }`}
                    >
                      {status === "completed" ? "✓" : status === "active" ? "●" : "○"}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-100">
                      {exercise.name}
                    </span>
                    <span className="text-sm font-extrabold text-gym-muted">
                      {completed}/{total}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onGoCurrent}
                className="rounded-2xl bg-gym-info px-4 py-3 text-sm font-extrabold text-slate-950 shadow-info"
              >
                Vai all’attuale
              </button>
              <button
                type="button"
                onClick={onCompleteSession}
                className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-extrabold text-slate-100"
              >
                Chiudi allenamento
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
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
  const [completedLogOpen, setCompletedLogOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  if (!draft) {
    return (
      <Card>
        <p className="text-gym-muted">Caricamento esercizio...</p>
      </Card>
    );
  }

  const completedSets = draft.sets.filter((set) => set.completed).length;
  const timerForThisExercise =
    activeTimer?.exerciseId === exercise.id ? activeTimer : null;
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
        <Card variant="primary">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gym-accent text-slate-950">
              <CheckCircle2 size={30} fill="currentColor" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gym-accent">
                Completato
              </p>
              <h3 className="line-clamp-2 text-xl font-extrabold leading-tight">
                {exercise.name}
              </h3>
              <p className="text-sm text-slate-300">
                {completedSets}/{draft.sets.length} serie ·{" "}
                {exercise.muscle_group ?? "Esercizio"}
              </p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onGoNext}
              className="rounded-2xl bg-gym-accent px-4 py-3 text-sm font-extrabold text-slate-950"
            >
              Prossimo
            </button>
            <button
              type="button"
              onClick={() => setForceExpanded(true)}
              className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-extrabold text-slate-200"
            >
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
      transition={{
        duration: 0.22,
        ease: "easeOut",
        delay: reduceMotion ? 0 : Math.min(index * 0.035, 0.12),
      }}
    >
      <Card variant={draft.completed ? "primary" : "default"}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gym-soft">
              {exercise.muscle_group ?? "Esercizio"}
            </p>
            <h3 className="mt-1 line-clamp-2 text-2xl font-extrabold leading-tight">
              {exercise.name}
            </h3>
            <p className="mt-2 text-sm font-bold text-slate-300">
              {exercise.sets ?? "-"} serie x {exercise.reps ?? "-"} · Recupero{" "}
              {formatRestTime(exercise.rest_seconds)}
            </p>
            {exercise.target_rpe ? (
              <p className="mt-1 text-xs font-semibold text-gym-info">
                RPE target: {exercise.target_rpe}
              </p>
            ) : null}
          </div>
        </div>

        {draft.completed && forceExpanded ? (
          <button
            type="button"
            onClick={() => setForceExpanded(false)}
            className="mt-3 w-full rounded-2xl bg-white/10 px-4 py-3 text-sm font-extrabold text-slate-200"
          >
            Richiudi card completata
          </button>
        ) : null}

        <MediaPreview
          mediaUrl={exercise.media_url}
          name={exercise.name}
          exerciseDbName={exercise.exercise_db_name}
          exerciseDbScore={exercise.exercise_db_match_score}
        />

        <AnimatePresence mode="wait">
          {nextSet ? (
            <motion.div
              key={nextSet.set_number}
              initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.99 }}
              animate={
                reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }
              }
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="mt-4 rounded-[1.5rem] border border-gym-accent/35 bg-emerald-400/[0.08] p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-2xl font-extrabold">
                  Serie {nextSet.set_number} di {draft.sets.length}
                </h4>
                {timerForThisExercise ? (
                  <span className="rounded-full bg-black/25 px-3 py-1 text-xs font-bold text-slate-200">
                    Timer{" "}
                    {formatCountdown(timerForThisExercise.remainingSeconds)}
                  </span>
                ) : null}
              </div>
              {nextSet.weight ? (
                <p className="mt-2 text-sm text-slate-300">
                  {nextSet.weight_source === "previous"
                    ? "Ultima volta"
                    : "Oggi"}
                  : <strong>{nextSet.weight} kg</strong>
                  {nextSet.reps ? ` x ${nextSet.reps}` : ""}
                </p>
              ) : (
                <p className="mt-2 text-sm text-gym-muted">
                  Inserisci il carico della serie.
                </p>
              )}

              <div className="mt-4">
                <Field
                  label="Kg"
                  value={nextSet.weight}
                  inputMode="decimal"
                  sourceLabel={getWeightSourceLabel(
                    nextSet.weight_source,
                    nextSet.weight,
                  )}
                  mutedValue={nextSet.weight_source === "previous"}
                  big
                  onChange={(value) =>
                    onSetChange(nextSet.set_number, {
                      weight: value,
                      weight_source: value.trim() ? "manual" : "empty",
                    })
                  }
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Field
                  label="Reps"
                  value={nextSet.reps}
                  inputMode="text"
                  onChange={(value) =>
                    onSetChange(nextSet.set_number, { reps: value })
                  }
                />
                <Field
                  label="RPE"
                  value={nextSet.rpe}
                  inputMode="numeric"
                  onChange={(value) =>
                    onSetChange(nextSet.set_number, {
                      rpe: clampRpeInput(value),
                    })
                  }
                />
              </div>

              {nextSet.set_number > 1 ? (
                <button
                  type="button"
                  onClick={() => onCopyPreviousWeight(nextSet.set_number)}
                  className="mt-3 rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-slate-200"
                >
                  Usa kg precedente
                </button>
              ) : null}

              <motion.button
                type="button"
                onClick={() => onCompleteSet(nextSet.set_number)}
                whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                transition={{ duration: 0.12 }}
                className="mt-4 w-full rounded-2xl bg-gym-accent px-4 py-4 text-base font-extrabold text-slate-950 shadow-glow"
              >
                Completa serie
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="all-done"
              initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
              className="mt-4 rounded-3xl bg-gym-accent/10 p-4 text-center"
            >
              <p className="font-extrabold text-gym-accent">
                Tutte le serie sono completate.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <CompactSetLog
          sets={draft.sets}
          nextSetNumber={nextSetNumber}
          open={completedLogOpen}
          onToggle={() => setCompletedLogOpen((value) => !value)}
          onEditCompleted={(setNumber) =>
            onSetChange(setNumber, { completed: false })
          }
        />

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onStartTimer}
            className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-extrabold text-slate-100"
          >
            <TimerReset size={18} />{" "}
            {timerForThisExercise
              ? `Recupero ${formatCountdown(timerForThisExercise.remainingSeconds)}`
              : "Avvia recupero"}
          </button>
          {exercise.video_url ? (
            <a
              href={exercise.video_url}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-extrabold"
            >
              <PlayCircle size={18} /> Video
            </a>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setNotesOpen((value) => !value)}
            className="rounded-2xl bg-black/20 px-4 py-3 text-sm font-extrabold text-slate-200"
          >
            {draft.personal_notes ? "Nota" : "+ Nota"}
          </button>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="rounded-2xl bg-black/20 px-4 py-3 text-sm font-extrabold text-slate-200"
          >
            {open ? "Nascondi tecnica" : "Tecnica"}
          </button>
        </div>

        {draft.personal_notes && !notesOpen ? (
          <button
            type="button"
            onClick={() => setNotesOpen(true)}
            className="mt-3 w-full rounded-2xl bg-black/20 p-3 text-left"
          >
            <p className="text-xs font-bold text-gym-muted">
              {draft.personal_notes_source === "previous" ? "Nota ultima volta" : "Nota"}
            </p>
            <p className={`mt-1 line-clamp-2 text-sm ${draft.personal_notes_source === "previous" ? "text-slate-400" : "text-slate-200"}`}>
              “{draft.personal_notes}”
            </p>
          </button>
        ) : null}

        <AnimatedAccordion open={notesOpen}>
          <div className="mt-3 rounded-2xl bg-black/20 p-3">
            <label className="block">
              <span className="mb-1 flex items-center justify-between gap-2 text-xs font-bold text-gym-muted">
                <span>{draft.personal_notes_source === "previous" ? "Nota ultima volta" : "Nota"}</span>
                {draft.personal_notes_source === "previous" ? (
                  <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-extrabold text-slate-400">
                    Ripresa dall’ultima volta
                    {formatInheritedNoteDate(draft.personal_notes_inherited_at)}
                  </span>
                ) : null}
              </span>
              <textarea
                value={draft.personal_notes}
                onChange={(event) =>
                  onChange({ personal_notes: event.target.value })
                }
                placeholder="Sensazioni, dolore, tecnica, carico da aumentare..."
                className={`min-h-20 w-full rounded-2xl border px-3 py-3 text-sm placeholder:text-slate-500 ${
                  draft.personal_notes_source === "previous"
                    ? "border-white/10 bg-white/[0.04] text-slate-400"
                    : "border-white/10 bg-gym-bg text-white"
                }`}
              />
            </label>
            {draft.personal_notes_source === "previous" ? (
              <p className="mt-2 text-xs font-medium text-gym-muted">
                Modificala o cancellala se oggi è cambiata.
              </p>
            ) : null}
            <QuickNoteChips
              onAdd={(text) => {
                const separator = draft.personal_notes.trim() ? " " : "";
                onChange({
                  personal_notes: `${draft.personal_notes}${separator}${text}`,
                });
              }}
            />
          </div>
        </AnimatedAccordion>

        <AnimatedAccordion open={open}>
          <div className="mt-3 space-y-3 rounded-2xl bg-black/20 p-3 text-sm text-slate-200">
            {exercise.technique_notes ? (
              <p>
                <strong>Tecnica:</strong> {exercise.technique_notes}
              </p>
            ) : null}
            {exercise.tips ? (
              <p>
                <strong>Consigli:</strong> {exercise.tips}
              </p>
            ) : null}
            {exercise.trainer_notes ? (
              <p>
                <strong>Note PT:</strong> {exercise.trainer_notes}
              </p>
            ) : null}
            {!exercise.technique_notes &&
            !exercise.tips &&
            !exercise.trainer_notes ? (
              <p className="text-gym-muted">
                Nessuna tecnica inserita.
              </p>
            ) : null}
          </div>
        </AnimatedAccordion>
      </Card>
    </motion.div>
  );
}

function CompactSetLog({
  sets,
  nextSetNumber,
  open,
  onToggle,
  onEditCompleted,
}: {
  sets: SetDraft[];
  nextSetNumber: number | null;
  open: boolean;
  onToggle: () => void;
  onEditCompleted: (setNumber: number) => void;
}) {
  const completedSets = sets.filter((set) => set.completed);
  if (completedSets.length === 0) return null;

  return (
    <div className="mt-4 rounded-3xl bg-black/20 p-3">
      <button
        type="button"
        onClick={onToggle}
        disabled={completedSets.length === 0}
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-1 py-1 text-left disabled:cursor-default"
      >
        <span className="text-sm font-extrabold text-slate-100">
          {completedSets.length > 0
            ? `✓ ${completedSets.length} ${completedSets.length === 1 ? "serie completata" : "serie completate"}`
            : ""}
        </span>
        {completedSets.length > 0 ? (
          <span className="text-gym-muted">
            {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </span>
        ) : null}
      </button>

      <AnimatedAccordion open={open && completedSets.length > 0}>
        <div className="mt-2 space-y-1.5">
          {completedSets.map((set) => (
            <div
              key={set.set_number}
              className="flex items-center justify-between gap-2 rounded-2xl bg-gym-accent/10 px-3 py-2 text-xs text-slate-100"
            >
              <span className="font-extrabold">✓ S{set.set_number}</span>
              <span className="min-w-0 flex-1 truncate text-right font-bold text-slate-300">
                {formatSetSummary(set)}
              </span>
              <button
                type="button"
                onClick={() => onEditCompleted(set.set_number)}
                className="rounded-xl bg-white/10 px-2 py-1 text-[10px] font-bold text-slate-200"
              >
                Modifica
              </button>
            </div>
          ))}
        </div>
      </AnimatedAccordion>
    </div>
  );
}

function formatSetSummary(set: SetDraft) {
  const reps = set.reps?.trim() || "-";
  const weight = set.weight?.trim() ? `${set.weight.trim()}kg` : "-kg";
  const rpe = set.rpe?.trim() ? ` · RPE${set.rpe.trim()}` : "";
  return `${reps} × ${weight}${rpe}`;
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
  onClose,
  onAdjust,
}: {
  timer: ActiveTimer;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onClose: () => void;
  onAdjust: (deltaSeconds: number) => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.98 }}
      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="fixed inset-x-0 bottom-24 z-40 mx-auto max-w-md px-4"
    >
      <div
        className={`${timer.finished ? "border-gym-accent shadow-glow" : "border-gym-info/25 shadow-info"} rounded-[1.35rem] border bg-gym-panel/95 p-3 shadow-2xl shadow-black/40 backdrop-blur supports-[padding:max(0px)]:mb-[max(0px,env(safe-area-inset-bottom))]`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold text-gym-info">
              {timer.finished ? "Recupero finito" : "Recupero"}
            </p>
            <p className="mt-0.5 truncate text-sm font-bold text-slate-300">
              {timer.exerciseName}
            </p>
          </div>
          <p className="shrink-0 text-3xl font-extrabold text-gym-info">
            {formatCountdown(timer.remainingSeconds)}
          </p>
        </div>
        <TimerControls
          timer={timer}
          onPause={onPause}
          onResume={onResume}
          onReset={onReset}
          onClose={onClose}
          onAdjust={onAdjust}
        />
      </div>
    </motion.div>
  );
}

function TimerControls({
  timer,
  onPause,
  onResume,
  onClose,
  onAdjust,
}: {
  timer: ActiveTimer;
  compact?: boolean;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onClose: () => void;
  onAdjust: (deltaSeconds: number) => void;
}) {
  return (
    <div className="mt-3 grid grid-cols-3 gap-2">
      {timer.isRunning ? (
        <motion.button
          type="button"
          onClick={onPause}
          whileTap={{ scale: 0.96 }}
          className="flex min-h-11 items-center justify-center rounded-2xl bg-white/10 px-3 py-2 text-xs font-extrabold text-slate-100"
        >
          Pausa
        </motion.button>
      ) : (
        <motion.button
          type="button"
          onClick={onResume}
          whileTap={{ scale: 0.96 }}
          className="flex min-h-11 items-center justify-center rounded-2xl bg-gym-info px-3 py-2 text-xs font-extrabold text-slate-950 shadow-info"
        >
          Riprendi
        </motion.button>
      )}
      <motion.button
        type="button"
        onClick={() => onAdjust(15)}
        whileTap={{ scale: 0.96 }}
        className="min-h-11 rounded-2xl bg-white/10 px-3 py-2 text-xs font-extrabold text-slate-100"
      >
        +15s
      </motion.button>
      <motion.button
        type="button"
        onClick={onClose}
        whileTap={{ scale: 0.96 }}
        className="flex min-h-11 items-center justify-center gap-1 rounded-2xl bg-white/10 px-3 py-2 text-xs font-extrabold text-slate-100"
        aria-label="Chiudi timer recupero"
      >
        <X size={14} /> Chiudi
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
            GIF ExerciseDB:{" "}
            <span className="font-bold text-slate-200">{exerciseDbName}</span>
            {exerciseDbScore ? ` · match ${exerciseDbScore}/100` : ""}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-3xl border border-white/10 bg-black/20 p-4 text-center">
      <ImageIcon className="mx-auto text-gym-muted" size={32} />
      <p className="mt-2 font-extrabold">Media esercizio collegato</p>
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
        className={`w-full rounded-2xl border border-white/10 bg-gym-bg px-3 ${big ? "py-4 text-2xl" : "py-3 text-base"} font-extrabold ${mutedValue ? "text-slate-400" : "text-white"}`}
      />
      {sourceLabel ? (
        <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide text-gym-muted">
          {sourceLabel}
        </span>
      ) : null}
    </label>
  );
}

function getPersonalNotesSource(
  note: unknown,
  inherited: unknown,
): "previous" | "manual" | "empty" {
  const hasNote = typeof note === "string" && note.trim().length > 0;
  if (!hasNote) return "empty";
  return inherited ? "previous" : "manual";
}

function formatInheritedNoteDate(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return ` · ${date.toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}`;
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

function getWeightSource(
  source: unknown,
  weight: unknown,
): "previous" | "manual" | "empty" {
  if (!weight || String(weight).trim() === "") return "empty";
  return source === "previous" ? "previous" : "manual";
}

function getWeightSourceLabel(
  source: "previous" | "manual" | "empty",
  weight: string,
) {
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
