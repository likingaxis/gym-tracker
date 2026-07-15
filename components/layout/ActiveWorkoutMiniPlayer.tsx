"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown, ChevronUp, Pause, Play, Trash2 } from "lucide-react";
import { AnimatedProgressBar } from "@/components/motion/AnimatedProgressBar";
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
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [pending, setPending] = useState<"complete" | "pause" | "resume" | "delete" | null>(null);

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
        const openSession = (result.sessions ?? []).find((item: ActiveSession) => item.status === "in_progress" || item.status === "paused");
        setSession(openSession ?? null);
      } catch {
        if (!cancelled) setSession(null);
      }
    }
    loadOpenSession();
    const interval = window.setInterval(loadOpenSession, 45000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [pathname, shouldHide]);

  const summary = useMemo(() => getSessionProgress(session), [session]);
  if (shouldHide || !session?.workout_day_id) return null;

  async function runAction(action: "complete" | "pause" | "resume" | "delete") {
    if (!session) return;
    if ((action === "complete" || action === "delete") && !window.confirm(getConfirmMessage(action))) return;
    setPending(action);
    try {
      const endpoint = action === "delete" ? `/api/workout-sessions/${session.id}` : `/api/workout-sessions/${session.id}/${action}`;
      const response = await fetch(endpoint, { method: action === "delete" ? "DELETE" : "POST" });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) throw new Error(result?.error ?? "Azione non riuscita.");
      setMoreOpen(false);
      if (action === "delete" || action === "complete") setSession(null);
      else setSession((current) => current ? { ...current, status: action === "pause" ? "paused" : "in_progress" } : current);
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Azione non riuscita.");
    } finally {
      setPending(null);
    }
  }

  const dayName = relationName(session.workout_days, "Allenamento");
  const isPaused = session.status === "paused";

  return (
    <motion.aside
      initial={reduceMotion ? false : { opacity: 0, y: 20 }}
      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="fixed inset-x-0 bottom-[78px] z-40 mx-auto max-w-md px-3"
      aria-label="Allenamento in corso"
    >
      <div className={`dock-panel ${isPaused ? "dock-paused" : "dock-active"} p-3`}>
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isPaused ? "bg-gym-warning" : "bg-gym-accent"} text-white`}>
            {isPaused ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
          </span>
          <Link href={`/workout/${session.workout_day_id}`} className="min-w-0 flex-1 focus-visible:outline-none">
            <span className="technical-label">{isPaused ? "In pausa" : "Allenamento attivo"}</span>
            <strong className="mt-1 block truncate text-base text-white">{dayName}</strong>
            <span className="mt-1 block text-sm text-gym-muted">{summary.completed}/{summary.total} serie · {summary.progress}%</span>
          </Link>
          <button
            type="button"
            onClick={() => runAction(isPaused ? "resume" : "pause")}
            disabled={Boolean(pending)}
            className={isPaused ? "dock-action dock-action-primary" : "dock-action"}
          >
            {pending === "pause" || pending === "resume" ? "…" : isPaused ? "Riprendi" : "Pausa"}
          </button>
        </div>

        <div className="mt-3"><AnimatedProgressBar value={summary.progress} /></div>

        <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
          <Link href={`/workout/${session.workout_day_id}`} className="secondary-button min-h-11">Apri allenamento</Link>
          <button type="button" onClick={() => setMoreOpen((value) => !value)} className="secondary-button min-h-11 px-3" aria-expanded={moreOpen}>
            Altro {moreOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {moreOpen ? (
          <motion.div initial={reduceMotion ? false : { opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
            <button type="button" onClick={() => runAction("complete")} disabled={Boolean(pending)} className="secondary-button min-h-11">{pending === "complete" ? "Completamento…" : "Completa"}</button>
            <button type="button" onClick={() => runAction("delete")} disabled={Boolean(pending)} className="danger-button min-h-11"><Trash2 size={16} /> {pending === "delete" ? "Elimino…" : "Elimina"}</button>
          </motion.div>
        ) : null}
      </div>
    </motion.aside>
  );
}

function getConfirmMessage(action: "complete" | "pause" | "resume" | "delete") {
  if (action === "complete") return "Completare questo allenamento?";
  if (action === "delete") return "Spostare questa sessione nel cestino?";
  return "";
}

function getSessionProgress(session: ActiveSession | null) {
  const exercises = session?.session_exercises ?? [];
  const sets = exercises.flatMap((exercise) => exercise.exercise_sets ?? []);
  const total = sets.length || exercises.length || 0;
  const completed = sets.length ? sets.filter((set) => Boolean(set.completed)).length : exercises.filter((exercise) => Boolean(exercise.completed)).length;
  return { completed, total, progress: total > 0 ? Math.round((completed / total) * 100) : 0 };
}
