"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { MoreHorizontal, Pause, Play, X } from "lucide-react";
import { AnimatedProgressBar } from "@/components/motion/AnimatedProgressBar";
import { relationName } from "@/lib/relations";

type SessionSet = {
  completed?: boolean | null;
};

type SessionExercise = {
  completed?: boolean | null;
  exercise_sets?: SessionSet[] | null;
};

type ActiveSession = {
  id: string;
  status?: string | null;
  started_at?: string | null;
  workout_day_id?: string | null;
  workout_days?: { name?: string | null } | Array<{ name?: string | null }> | null;
  workout_plans?: { name?: string | null; month?: string | null } | Array<{ name?: string | null; month?: string | null }> | null;
  session_exercises?: SessionExercise[] | null;
};

export function ActiveWorkoutMiniPlayer() {
  const pathname = usePathname();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, setPending] = useState<"complete" | "pause" | "resume" | "delete" | null>(null);

  const shouldHide =
    pathname === "/profiles" ||
    pathname.startsWith("/profiles/") ||
    /^\/workout\/[^/]+/.test(pathname);

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

  async function runAction(action: "complete" | "pause" | "resume" | "delete") {
    if (!session) return;
    const confirmed = window.confirm(getConfirmMessage(action));
    if (!confirmed) return;

    setPending(action);
    try {
      const endpoint = action === "delete" ? `/api/workout-sessions/${session.id}` : `/api/workout-sessions/${session.id}/${action}`;
      const response = await fetch(endpoint, { method: action === "delete" ? "DELETE" : "POST" });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        throw new Error(result?.error ?? "Azione non riuscita.");
      }
      setMenuOpen(false);
      if (action === "delete" || action === "complete") {
        setSession(null);
      } else {
        setSession((current) => current ? { ...current, status: action === "pause" ? "paused" : "in_progress" } : current);
      }
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
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.98 }}
      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="fixed inset-x-0 bottom-[88px] z-40 mx-auto max-w-md px-4"
    >
      <div className={`relative rounded-[1.35rem] border ${isPaused ? "border-gym-info/35" : "border-white/10"} bg-gym-panel/95 p-3 shadow-2xl shadow-black/40 backdrop-blur supports-[padding:max(0px)]:mb-[max(0px,env(safe-area-inset-bottom))]`}>
        <div className="flex items-center gap-3">
          <Link
            href={`/workout/${session.workout_day_id}`}
            className="min-w-0 flex-1 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gym-accent/70"
            aria-label="Riprendi allenamento"
          >
            <div className="flex items-center gap-2">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${isPaused ? "bg-gym-info" : "bg-gym-accent"} text-slate-950 shadow-info`}>
                {isPaused ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold text-white">{isPaused ? "⏸️" : "🏋️"} {dayName}</p>
                <p className="text-xs font-semibold text-gym-muted">
                  {isPaused ? "In pausa" : `${summary.completed}/${summary.total} serie · ${summary.progress}%`}
                </p>
              </div>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-slate-200 transition active:scale-95"
            aria-label="Azioni allenamento in corso"
          >
            {menuOpen ? <X size={18} /> : <MoreHorizontal size={20} />}
          </button>
        </div>

        <div className="mt-2">
          <AnimatedProgressBar value={summary.progress} />
        </div>

        {menuOpen ? (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: -6 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            className="mt-3 grid grid-cols-2 gap-2"
          >
            <button
              type="button"
              onClick={() => runAction(isPaused ? "resume" : "pause")}
              disabled={Boolean(pending)}
              className="rounded-2xl bg-white/10 px-3 py-3 text-xs font-extrabold text-slate-100 disabled:opacity-60"
            >
              {pending === "pause" || pending === "resume" ? "Aggiorno..." : isPaused ? "Riprendi" : "Pausa"}
            </button>
            <button
              type="button"
              onClick={() => runAction("complete")}
              disabled={Boolean(pending)}
              className="rounded-2xl bg-gym-accent px-3 py-3 text-xs font-extrabold text-slate-950 disabled:opacity-60"
            >
              {pending === "complete" ? "Completamento..." : "Completa"}
            </button>
            <button
              type="button"
              onClick={() => runAction("delete")}
              disabled={Boolean(pending)}
              className="col-span-2 rounded-2xl border border-red-400/25 bg-red-500/10 px-3 py-3 text-xs font-extrabold text-red-100 disabled:opacity-60"
            >
              {pending === "delete" ? "Sposto nel cestino..." : "Elimina allenamento"}
            </button>
          </motion.div>
        ) : null}
      </div>
    </motion.div>
  );
}

function getConfirmMessage(action: "complete" | "pause" | "resume" | "delete") {
  if (action === "complete") return "Vuoi completare questo allenamento in corso?";
  if (action === "pause") return "Vuoi mettere in pausa questo allenamento?";
  if (action === "resume") return "Vuoi riprendere questo allenamento?";
  return "Vuoi spostare questa sessione nel cestino? Potrai recuperarla.";
}

function getSessionProgress(session: ActiveSession | null) {
  const exercises = session?.session_exercises ?? [];
  const sets = exercises.flatMap((exercise) => exercise.exercise_sets ?? []);
  const total = sets.length || exercises.length || 0;
  const completed = sets.length
    ? sets.filter((set) => Boolean(set.completed)).length
    : exercises.filter((exercise) => Boolean(exercise.completed)).length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { completed, total, progress };
}
