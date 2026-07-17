"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion, type PanInfo } from "framer-motion";
import { LoaderCircle, Pause, Play, Trash2 } from "lucide-react";
import { AnimatedProgressBar } from "@/components/motion/AnimatedProgressBar";
import { useAppDialog } from "@/components/ui/AppDialogProvider";
import { relationName } from "@/lib/relations";

type SessionSet = { completed?: boolean | null };
type SessionExercise = { completed?: boolean | null; exercise_sets?: SessionSet[] | null };
type ActiveSession = {
  id: string;
  status?: string | null;
  workout_day_id?: string | null;
  workout_days?: { name?: string | null } | Array<{ name?: string | null }> | null;
  session_exercises?: SessionExercise[] | null;
};

export function ActiveWorkoutMiniPlayer() {
  const pathname = usePathname();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { confirmDialog, showDialog } = useAppDialog();
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [pending, setPending] = useState<"pause" | "resume" | "delete" | null>(null);

  const isWorkoutSessionPage = /^\/workout\/(?!edit(?:\/|$)|archive(?:\/|$))[^/]+\/?$/.test(pathname);
  const shouldHide = pathname === "/profiles" || pathname.startsWith("/profiles/") || isWorkoutSessionPage;

  useEffect(() => {
    if (shouldHide) return;

    let cancelled = false;
    async function loadOpenSession() {
      try {
        const response = await fetch("/api/workout-sessions", { cache: "no-store" });
        const result = await response.json().catch(() => null);
        if (cancelled || !response.ok || !result?.success) return;
        const openSession = (result.sessions ?? []).find(
          (item: ActiveSession) => item.status === "in_progress" || item.status === "paused",
        );
        setSession(openSession ?? null);
      } catch {
        if (!cancelled) setSession(null);
      }
    }

    loadOpenSession();
    const interval = window.setInterval(loadOpenSession, 45000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [pathname, shouldHide]);

  const summary = useMemo(() => getSessionProgress(session), [session]);
  if (shouldHide || !session?.workout_day_id) return null;

  async function runAction(action: "pause" | "resume" | "delete") {
    if (!session) return;

    if (action === "delete") {
      const accepted = await confirmDialog({
        title: "Spostare l’allenamento nel cestino?",
        message: "La sessione sparirà dalle attività correnti, ma potrai ripristinarla dal cestino.",
        confirmLabel: "Sposta nel cestino",
        tone: "danger",
      });
      if (!accepted) return;
    }

    setPending(action);
    try {
      const endpoint =
        action === "delete"
          ? `/api/workout-sessions/${session.id}`
          : `/api/workout-sessions/${session.id}/${action}`;
      const response = await fetch(endpoint, { method: action === "delete" ? "DELETE" : "POST" });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) throw new Error(result?.error ?? "Azione non riuscita.");

      if (action === "delete") {
        setSession(null);
      } else {
        setSession((current) =>
          current
            ? { ...current, status: action === "pause" ? "paused" : "in_progress" }
            : current,
        );
      }
      router.refresh();
    } catch (error) {
      await showDialog({
        title: "Azione non riuscita",
        message: error instanceof Error ? error.message : "Riprova tra poco.",
        tone: "danger",
      });
    } finally {
      setPending(null);
    }
  }

  const dayName = relationName(session.workout_days, "Allenamento");
  const isPaused = session.status === "paused";
  const toggleAction = isPaused ? "resume" : "pause";

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 80 && !pending) {
      runAction("delete");
    }
  };

  return (
    <motion.aside
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="fixed inset-x-0 bottom-[96px] z-40 mx-auto max-w-md px-4"
      aria-label="Allenamento in corso"
      aria-busy={Boolean(pending)}
    >
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.6}
        onDragEnd={handleDragEnd}
        className={`session-dock cursor-grab active:cursor-grabbing ${isPaused ? "session-dock-paused" : "session-dock-active"}`}
      >
        <motion.button
          whileTap={reduceMotion ? {} : { scale: 0.85 }}
          type="button"
          onClick={() => runAction(toggleAction)}
          disabled={Boolean(pending)}
          className="session-dock-icon session-dock-icon-primary shrink-0"
          aria-label={isPaused ? "Riprendi allenamento" : "Metti in pausa"}
          title={isPaused ? "Riprendi" : "Pausa"}
        >
          {pending === toggleAction ? (
            <LoaderCircle size={20} className="animate-spin" />
          ) : isPaused ? (
            <Play size={20} fill="currentColor" />
          ) : (
            <Pause size={20} />
          )}
        </motion.button>

        <Link
          href={`/workout/${session.workout_day_id}`}
          className="session-dock-content min-w-0 flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gym-accent"
        >
          <span className="block text-[11px] font-bold uppercase tracking-wider text-gym-muted mb-1.5">{isPaused ? "Allenamento in pausa" : "Allenamento in corso"}</span>
          <strong className="block text-xl font-extrabold text-white leading-none mb-1.5 truncate">{dayName}</strong>
          <span className="block text-sm font-medium text-slate-300">
            {summary.completed}/{summary.total} serie completate
          </span>
        </Link>


        <div className="session-dock-progress" aria-hidden="true">
          <AnimatedProgressBar value={summary.progress} />
        </div>
      </motion.div>
    </motion.aside>
  );
}

function getSessionProgress(session: ActiveSession | null) {
  const exercises = session?.session_exercises ?? [];
  const sets = exercises.flatMap((exercise) => exercise.exercise_sets ?? []);
  const total = sets.length || exercises.length || 0;
  const completed = sets.length
    ? sets.filter((set) => Boolean(set.completed)).length
    : exercises.filter((exercise) => Boolean(exercise.completed)).length;

  return {
    completed,
    total,
    progress: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}
