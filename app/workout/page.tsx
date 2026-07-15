export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { Archive, BadgeCheck, CheckCircle2, ChevronRight, Dumbbell, Pencil, Play } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSelectedProfileId } from "@/lib/profiles";
import { type SessionLike } from "@/lib/progress";
import { formatDayCount, formatExerciseCount } from "@/lib/utils/copy";
import { formatPlanDateRange, getPlanDotClass } from "@/lib/workoutPlanHistory";

async function getActivePlan(profileId: string) {
  try {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from("workout_plans")
      .select("*, workout_days(*, exercises(*))")
      .eq("is_active", true)
      .eq("profile_id", profileId)
      .order("day_order", { referencedTable: "workout_days", ascending: true })
      .order("exercise_order", { referencedTable: "workout_days.exercises", ascending: true })
      .maybeSingle();
    return data;
  } catch {
    return null;
  }
}

async function getCompletedSessions(profileId: string) {
  try {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from("workout_sessions")
      .select("id, started_at, workout_day_id, workout_days(name)")
      .eq("profile_id", profileId)
      .eq("status", "completed")
      .is("deleted_at", null)
      .order("started_at", { ascending: false })
      .limit(60);
    return (data ?? []) as SessionLike[];
  } catch {
    return [];
  }
}

export default async function WorkoutIndexPage() {
  const profileId = await getSelectedProfileId();
  if (!profileId) redirect("/profiles");

  const [plan, sessions] = await Promise.all([getActivePlan(profileId), getCompletedSessions(profileId)]);

  if (!plan) {
    return (
      <div className="space-y-6">
        <header>
          <p className="technical-label">Scheda</p>
          <h1 className="page-title mt-1">Nessun programma</h1>
        </header>
        <Link href="/import" className="primary-link">Importa scheda</Link>
      </div>
    );
  }

  const days = [...(plan.workout_days ?? [])].sort((a: any, b: any) => a.day_order - b.day_order);
  const lastByDay = buildLastSessionByDay(sessions);
  const recommended = getRecommendedDay(days, lastByDay);
  const exerciseCount = days.reduce((total: number, day: any) => total + (day.exercises?.length ?? 0), 0);

  return (
    <div className="space-y-7">
      <header>
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${getPlanDotClass(plan.color)}`} />
          <p className="technical-label">Scheda attiva</p>
        </div>
        <h1 className="page-title mt-2">{plan.name}</h1>
        <p className="mt-2 text-base text-gym-muted">
          {formatPlanDateRange(plan.start_date, plan.end_date)} · {formatDayCount(days.length)} · {formatExerciseCount(exerciseCount)}
        </p>
      </header>

      <nav className="grid grid-cols-3 gap-2" aria-label="Azioni scheda">
        <Link href="/workout/edit" className="secondary-button"><Pencil size={17} /> Modifica</Link>
        <Link href="/import" className="secondary-button"><Dumbbell size={17} /> Nuova</Link>
        <Link href="/workout/archive" className="secondary-button"><Archive size={17} /> Archivio</Link>
      </nav>

      <section className="section-block">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="technical-label">Giorni</p>
            <h2 className="section-title">Scegli cosa consultare</h2>
          </div>
        </div>

        <div className="technical-list">
          {days.map((day: any) => {
            const last = lastByDay.get(day.id);
            const isRecommended = recommended?.id === day.id;
            return (
              <article key={day.id} className={`day-row ${isRecommended ? "day-row-recommended" : ""}`}>
                <Link href={`/workout/${day.id}/preview`} className="min-w-0 flex-1 py-4 pr-3 focus-visible:outline-none">
                  <div className="flex items-center gap-2">
                    <span className="mono-type text-xs text-gym-muted">G{day.day_order}</span>
                    {isRecommended ? <span className="status-pill status-signal"><BadgeCheck size={12} /> Consigliato</span> : null}
                  </div>
                  <h2 className="mt-2 text-2xl font-extrabold leading-none text-gym-soft">{getShortDayName(day.name)}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gym-muted">
                    <span>{formatExerciseCount(day.exercises?.length ?? 0)}</span>
                    <span className="inline-flex items-center gap-1.5">
                      {last ? <CheckCircle2 size={15} className="text-gym-success" /> : null}
                      {last ? `Ultima volta ${formatDate(last.started_at)}` : "Mai completato"}
                    </span>
                  </div>
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <Link href={`/workout/${day.id}/preview`} className="touch-icon" aria-label={`Visualizza ${day.name}`}>
                    <ChevronRight size={20} />
                  </Link>
                  <Link href={`/workout/${day.id}`} className="start-button" aria-label={`Inizia ${day.name}`}>
                    <Play size={17} fill="currentColor" />
                    <span className="sr-only">Inizia</span>
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function buildLastSessionByDay(sessions: SessionLike[]) {
  const map = new Map<string, SessionLike>();
  for (const session of sessions) {
    const dayId = (session as any).workout_day_id;
    if (dayId && !map.has(dayId)) map.set(dayId, session);
  }
  return map;
}

function getRecommendedDay(days: any[], lastByDay: Map<string, SessionLike>) {
  if (!days.length) return null;
  const neverDone = days.find((day) => !lastByDay.has(day.id));
  if (neverDone) return neverDone;
  return [...days].sort((a, b) => {
    const aTime = new Date(lastByDay.get(a.id)?.started_at ?? 0).getTime();
    const bTime = new Date(lastByDay.get(b.id)?.started_at ?? 0).getTime();
    return aTime - bTime;
  })[0];
}

function getShortDayName(name: string | null | undefined) {
  const raw = name ?? "Allenamento";
  return raw.replace(/^Giorno\s*\d+\s*[-–—]\s*/i, "") || raw;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
}
