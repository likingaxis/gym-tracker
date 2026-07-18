"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion, type PanInfo } from "framer-motion";
import { LoaderCircle, Pause, Play, Trash2, Dumbbell } from "lucide-react";
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

  // When the user explicitly navigates to the workout page, clear the dismiss flag
  // so that the MiniPlayer can show a newly created session.
  useEffect(() => {
    if (isWorkoutSessionPage) {
      sessionStorage.removeItem("hide_miniplayer_until_new");
    }
  }, [isWorkoutSessionPage]);

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
        if (openSession) {
          // Check if user dismissed the miniplayer globally — don't show it again
          const dismissed = sessionStorage.getItem("hide_miniplayer_until_new");
          if (dismissed === "true") {
            setSession(null);
            return;
          }
        }
        setSession(openSession ?? null);
      } catch (err) {
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
    const currentSessionId = session.id;

    if (action === "delete") {
      const accepted = await confirmDialog({
        title: "Spostare l’allenamento nel cestino?",
        message: "La sessione sparirà dalle attività correnti, ma potrai ripristinarla dal cestino.",
        confirmLabel: "Sposta nel cestino",
        tone: "danger",
      });
      if (!accepted) return;
      
      // ELIMINAZIONE OTTIMISTICA E GLOBALE
      // Nascondiamo il player fino a che non viene avviata una nuova sessione.
      sessionStorage.setItem("hide_miniplayer_until_new", "true");
      setSession(null);
    } else {
      setPending(action);
      // Aggiornamento ottimistico per pausa/riprendi
      setSession((current) =>
        current
          ? { ...current, status: action === "pause" ? "paused" : "in_progress" }
          : current,
      );
    }

    try {
      const endpoint =
        action === "delete"
          ? `/api/workout-sessions/${currentSessionId}`
          : `/api/workout-sessions/${currentSessionId}/${action}`;
          
      // Se è un delete, non blocchiamo l'UI. Eseguiamo la fetch in background 
      // con keepalive: true in modo che il browser non la cancelli se l'utente cambia pagina!
      if (action === "delete") {
        fetch(endpoint, { method: "DELETE", keepalive: true }).catch(() => {});
        return; // Usciamo subito, l'UI è già aggiornata ottimisticamente.
      }

      const response = await fetch(endpoint, { method: "POST" });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) throw new Error(result?.error ?? "Azione non riuscita.");

      router.refresh();
    } catch (error) {
      await showDialog({
        title: "Azione non riuscita",
        message: error instanceof Error ? error.message : "Riprova tra poco.",
        tone: "danger",
      });
    } finally {
      if (action !== "delete") {
        setPending(null);
      }
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
        className="relative overflow-hidden rounded-[1.4rem] bg-[#121518]/95 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] border border-white/10 flex items-center gap-3 p-2 pr-2.5 cursor-grab active:cursor-grabbing"
      >
        {/* Background glow */}
        <div className={`absolute inset-0 opacity-15 bg-gradient-to-r ${isPaused ? "from-white/10" : "from-gym-accent/50"} to-transparent pointer-events-none`} />

        {/* Left Icon (Album Art style) */}
        <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] bg-gradient-to-br ${isPaused ? "from-white/10 to-white/5" : "from-gym-accent/20 to-gym-accent/5"} border border-white/5 shadow-inner`}>
           <Dumbbell size={22} className={isPaused ? "text-white/50" : "text-gym-accent"} />
           {/* Pulsing indicator when active */}
           {!isPaused && (
             <span className="absolute -top-1 -right-1 flex h-3 w-3">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gym-accent opacity-75"></span>
               <span className="relative inline-flex rounded-full h-3 w-3 bg-gym-accent border-2 border-[#121518]"></span>
             </span>
           )}
        </div>

        {/* Middle Text Content */}
        <Link
          href={`/workout/${session.workout_day_id}`}
          className="flex-1 min-w-0 py-1 focus-visible:outline-none"
        >
          <strong className="block text-[15px] font-extrabold text-white leading-tight truncate mb-0.5">
            {dayName}
          </strong>
          <span className="block text-[10.5px] font-bold text-white/50 tracking-wide uppercase">
            {isPaused ? "In Pausa" : "In Corso"} • {summary.completed}/{summary.total} serie
          </span>
        </Link>

        {/* Right Action Button */}
        <motion.button
          whileTap={reduceMotion ? {} : { scale: 0.9 }}
          type="button"
          onClick={() => runAction(toggleAction)}
          disabled={Boolean(pending)}
          className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full shadow-lg transition-all duration-300 ${
            isPaused ? "bg-white text-black hover:bg-gray-200" : "bg-gym-accent text-white hover:brightness-110"
          }`}
          aria-label={isPaused ? "Riprendi allenamento" : "Metti in pausa"}
          title={isPaused ? "Riprendi" : "Pausa"}
        >
          {pending === toggleAction ? (
            <LoaderCircle size={22} className="animate-spin text-current" />
          ) : isPaused ? (
            <Play size={22} fill="currentColor" className="ml-1" />
          ) : (
            <Pause size={22} fill="currentColor" />
          )}
        </motion.button>

        {/* Edge-to-edge Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5" aria-hidden="true">
          <motion.div 
            className={`h-full ${isPaused ? "bg-white/30" : "bg-gym-accent"}`}
            initial={{ width: 0 }}
            animate={{ width: `${summary.progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
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
