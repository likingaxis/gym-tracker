export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Clock3, FileText, Play, Settings, TrendingUp } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSelectedProfileId } from "@/lib/profiles";
import {
  buildExerciseProgress,
  buildProgressOverview,
  estimateFallbackDurationFromPlan,
  estimateWorkoutDurationFromSessions,
  formatDurationShort,
  getRecentImprovements,
  getSessionSummary,
  type SessionLike,
} from "@/lib/progress";
import { getDayNameSnapshot, getPlanColorSnapshot, getPlanDotClass, getPlanNameSnapshot } from "@/lib/workoutPlanHistory";
import { formatDayCount, formatExerciseCount, formatSetCount } from "@/lib/utils/copy";

async function getSelectedProfile(profileId: string) {
  try {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from("app_profiles")
      .select("id, name, avatar_emoji")
      .eq("id", profileId)
      .maybeSingle();
    return data;
  } catch {
    return null;
  }
}

async function getActivePlan(profileId: string) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: plan } = await supabase
      .from("workout_plans")
      .select("*, workout_days(*, exercises(*))")
      .eq("is_active", true)
      .eq("profile_id", profileId)
      .order("day_order", { referencedTable: "workout_days", ascending: true })
      .order("exercise_order", { referencedTable: "workout_days.exercises", ascending: true })
      .maybeSingle();
    return plan;
  } catch {
    return null;
  }
}

async function getCompletedSessions(profileId: string) {
  try {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from("workout_sessions")
      .select("id, status, started_at, completed_at, workout_day_id, total_paused_seconds, workout_plan_name_snapshot, workout_day_name_snapshot, workout_plan_color_snapshot, workout_days(name), workout_plans(name, month, color), session_exercises(completed, exercises(name, exercise_db_id, muscle_group), exercise_sets(completed, reps, weight, rpe, set_number))")
      .eq("profile_id", profileId)
      .eq("status", "completed")
      .is("deleted_at", null)
      .order("started_at", { ascending: false })
      .limit(80);
    return (data ?? []) as SessionLike[];
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const profileId = await getSelectedProfileId();
  if (!profileId) redirect("/profiles");

  const [profile, plan, completedSessions] = await Promise.all([
    getSelectedProfile(profileId),
    getActivePlan(profileId),
    getCompletedSessions(profileId),
  ]);

  const days = [...(plan?.workout_days ?? [])].sort((a: any, b: any) => a.day_order - b.day_order);
  const overview = buildProgressOverview(completedSessions);
  const exercises = buildExerciseProgress(completedSessions);
  const firstImprovement = getRecentImprovements(exercises)[0] ?? null;
  const lastSession = completedSessions[0] ?? null;
  const exerciseCount = days.reduce((total: number, day: any) => total + (day.exercises?.length ?? 0), 0);
  const lastByDay = buildLastSessionByDay(completedSessions);
  const recommendedDay = getRecommendedDay(days, lastByDay);
  const completedThisWeek = new Set((overview.sessionsThisWeek as any[]).map((session) => session.workout_day_id).filter(Boolean));
  const recommendedDuration = recommendedDay
    ? estimateWorkoutDurationFromSessions(
        completedSessions,
        recommendedDay.id,
        estimateFallbackDurationFromPlan(recommendedDay.exercises ?? []) ?? undefined,
      )
    : null;

  return (
    <div className="space-y-7">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="technical-label">Settimana {getItalianWeekNumber()}</p>
          <h1 className="page-title mt-1">Ciao {profile?.name ?? "atleta"}</h1>
        </div>
        <Link href="/settings" className="touch-icon" aria-label="Apri impostazioni">
          <Settings size={21} />
        </Link>
      </header>

      {!plan ? (
        <section className="surface-accent p-5">
          <span className="status-pill status-signal">Primo passo</span>
          <h2 className="mt-3 text-3xl font-extrabold leading-none">Carica la tua scheda</h2>
          <Link href="/import" className="primary-link mt-5">Importa scheda</Link>
        </section>
      ) : null}

      {plan && recommendedDay ? (
        <section className="surface-accent p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="status-pill status-signal">Consigliato</span>
            <span className="mono-type text-sm text-gym-muted">G{recommendedDay.day_order}</span>
          </div>
          <h2 className="mt-4 text-4xl font-extrabold leading-[0.95]">{getShortDayName(recommendedDay.name)}</h2>
          <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-sm text-gym-muted">
            <span>{lastByDay.get(recommendedDay.id) ? `Ultima volta ${formatDate(lastByDay.get(recommendedDay.id)?.started_at)}` : "Prima sessione"}</span>
            <span>{formatExerciseCount(recommendedDay.exercises?.length ?? 0)}</span>
            {recommendedDuration?.estimatedSeconds ? <span>circa {formatDurationShort(recommendedDuration.estimatedSeconds)}</span> : null}
          </div>
          <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
            <Link href={`/workout/${recommendedDay.id}`} className="primary-link"><Play size={18} fill="currentColor" /> Inizia</Link>
            <Link href={`/workout/${recommendedDay.id}/preview`} className="secondary-button px-4">Vedi</Link>
          </div>
        </section>
      ) : null}

      {plan ? (
        <section className="section-block">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="technical-label">Questa settimana</p>
              <h2 className="section-title">{completedThisWeek.size} di {days.length} giorni</h2>
            </div>
            <p className="mono-type text-sm text-gym-muted">{formatSetCount(overview.totalSetsThisWeek)}</p>
          </div>
          <div className="mt-4 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(days.length, 1)}, minmax(0, 1fr))` }}>
            {days.map((day: any) => {
              const done = completedThisWeek.has(day.id);
              const recommended = recommendedDay?.id === day.id;
              return <div key={day.id} className={`h-2 rounded-full ${done ? "bg-gym-success" : recommended ? "bg-gym-accent" : "bg-gym-line"}`} title={day.name} />;
            })}
          </div>
        </section>
      ) : null}

      <section className="section-block">
        <div className="technical-list">
          {lastSession ? (
            <Link href={`/history/${lastSession.id}`} className="row-link">
              <span className="semantic-icon semantic-blue"><Clock3 size={19} /></span>
              <span className="min-w-0 flex-1">
                <span className="technical-label">Ultima sessione</span>
                <strong className="mt-1 block truncate text-lg text-gym-soft">{getDayNameSnapshot(lastSession)}</strong>
                <span className="mt-1 flex items-center gap-2 text-sm text-gym-muted">
                  {formatDate(lastSession.started_at)} · {formatSetCount(getSessionSummary(lastSession).completedSets)}
                  <span className={`h-1.5 w-1.5 rounded-full ${getPlanDotClass(getPlanColorSnapshot(lastSession))}`} />
                  <span className="truncate">{getPlanNameSnapshot(lastSession)}</span>
                </span>
              </span>
              <ChevronRight size={20} className="text-gym-muted" />
            </Link>
          ) : (
            <div className="row-link cursor-default">
              <span className="semantic-icon semantic-blue"><Clock3 size={19} /></span>
              <span className="min-w-0 flex-1">
                <span className="technical-label">Ultima sessione</span>
                <strong className="mt-1 block text-lg text-gym-soft">Nessun allenamento</strong>
              </span>
            </div>
          )}

          <Link href="/progress" className="row-link">
            <span className="semantic-icon semantic-green"><TrendingUp size={19} /></span>
            <span className="min-w-0 flex-1">
              <span className="technical-label">Progressione</span>
              {firstImprovement ? (
                <>
                  <strong className="mt-1 block text-lg text-gym-soft">{firstImprovement.name}</strong>
                  <span className="mt-1 block text-sm font-bold text-gym-success">+{firstImprovement.diff.toFixed(1).replace(".", ",")} kg dall’ultima volta</span>
                </>
              ) : (
                <strong className="mt-1 block text-lg text-gym-soft">Dati insufficienti</strong>
              )}
            </span>
            <ChevronRight size={20} className="text-gym-muted" />
          </Link>
        </div>
      </section>

      {plan ? (
        <section className="section-block">
          <div className="row-link cursor-default px-0">
            <span className="semantic-icon semantic-violet"><FileText size={19} /></span>
            <span className="min-w-0 flex-1">
              <span className="technical-label">Scheda attiva</span>
              <strong className="mt-1 block truncate text-lg text-gym-soft">{plan.name}</strong>
              <span className="mt-1 block text-sm text-gym-muted">{formatDayCount(days.length)} · {formatExerciseCount(exerciseCount)}</span>
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link href="/workout" className="secondary-button">Apri scheda</Link>
            <Link href="/import" className="secondary-button">Importa nuova</Link>
          </div>
        </section>
      ) : null}
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

function getItalianWeekNumber() {
  const date = new Date();
  const firstThursday = new Date(date.getFullYear(), 0, 4);
  const dayOffset = (firstThursday.getDay() + 6) % 7;
  const weekOne = new Date(firstThursday);
  weekOne.setDate(firstThursday.getDate() - dayOffset);
  const diff = date.getTime() - weekOne.getTime();
  return Math.max(1, Math.ceil((diff / 86400000 + 1) / 7));
}
