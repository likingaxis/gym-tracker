export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Clock3, Dumbbell, FileText, PlayCircle, Settings, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
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
import { formatDayCount, formatExerciseCount, formatWorkoutCount, formatSetCount } from "@/lib/utils/copy";

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
  const improvements = getRecentImprovements(exercises);
  const firstImprovement = improvements[0] ?? null;
  const lastSession = completedSessions[0] ?? null;
  const exerciseCount = days.reduce((total: number, day: any) => total + (day.exercises?.length ?? 0), 0);
  const lastByDay = buildLastSessionByDay(completedSessions);
  const recommendedDay = getRecommendedDay(days, lastByDay);
  const recommendedDuration = recommendedDay
    ? estimateWorkoutDurationFromSessions(
        completedSessions,
        recommendedDay.id,
        estimateFallbackDurationFromPlan(recommendedDay.exercises ?? []) ?? undefined,
      )
    : null;

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gym-info">Home</p>
          <h1 className="mt-2 text-3xl font-extrabold">Ciao {profile?.name ?? "atleta"} {profile?.avatar_emoji ?? "🏋️"}</h1>
          <p className="mt-1 text-sm text-gym-muted">Ultimo workout, progressi e scheda attiva.</p>
        </div>
        <Link href="/settings" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-slate-200" aria-label="Impostazioni">
          <Settings size={20} />
        </Link>
      </header>

      {!plan ? (
        <Card variant="primary">
          <p className="text-sm font-semibold text-gym-info">Scheda</p>
          <h2 className="mt-2 text-2xl font-extrabold">Carica la tua scheda</h2>
          <p className="mt-2 text-gym-muted">Importa il JSON creato da ChatGPT per iniziare.</p>
          <Link href="/import">
            <Button className="mt-4 w-full py-4">Carica scheda</Button>
          </Link>
        </Card>
      ) : null}

      {plan && recommendedDay ? (
        <Card variant="primary">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-gym-accent/15 text-gym-accent"><PlayCircle size={20} /></div>
              <p className="text-sm font-semibold text-gym-accent">Giorno consigliato</p>
              <h2 className="mt-1 line-clamp-2 text-2xl font-extrabold">{recommendedDay.name}</h2>
              <p className="mt-2 text-sm text-gym-muted">
                {lastByDay.get(recommendedDay.id) ? `Ultima volta ${formatDate(lastByDay.get(recommendedDay.id)?.started_at)}` : "Mai completato"}
                <span className="mx-2 text-slate-600">·</span>
                {formatExerciseCount(recommendedDay.exercises?.length ?? 0)}
                {recommendedDuration?.estimatedSeconds ? (
                  <>
                    <span className="mx-2 text-slate-600">·</span>
                    circa {formatDurationShort(recommendedDuration.estimatedSeconds)}
                  </>
                ) : null}
              </p>
            </div>
          </div>
          <Link href={`/workout/${recommendedDay.id}`}>
            <Button className="mt-4 w-full py-4">Inizia</Button>
          </Link>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        {lastSession ? (
          <Link href={`/history/${lastSession.id}`} className="block">
            <Card variant="subtle" className="h-full transition active:scale-[0.99]">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-2xl bg-white/10 text-slate-300"><Clock3 size={16} /></div>
              <p className="text-sm font-semibold text-gym-muted">Ultimo</p>
              <h2 className="mt-1 line-clamp-2 text-lg font-extrabold">{getDayNameSnapshot(lastSession)}</h2>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-gym-muted"><span>{formatDate(lastSession.started_at)}</span><span>·</span><span className={`h-1.5 w-1.5 rounded-full ${getPlanDotClass(getPlanColorSnapshot(lastSession))}`} /><span className="line-clamp-1">{getPlanNameSnapshot(lastSession)}</span></p>
              <p className="mt-1 text-xs text-gym-muted">{formatSetCount(getSessionSummary(lastSession).completedSets)}</p>
            </Card>
          </Link>
        ) : (
          <Card variant="subtle" className="h-full">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-2xl bg-white/10 text-slate-300"><Clock3 size={16} /></div>
            <p className="text-sm font-semibold text-gym-muted">Ultimo</p>
            <p className="mt-2 text-sm text-gym-muted">Completa una sessione per vedere lo storico.</p>
          </Card>
        )}

        <Link href="/progress" className="block">
          <Card variant="info" className="h-full transition active:scale-[0.99]">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-2xl bg-sky-400/15 text-sky-200"><TrendingUp size={16} /></div>
            <p className="text-sm font-semibold text-gym-info">Progressi</p>
            {firstImprovement ? (
              <>
                <h2 className="mt-1 line-clamp-2 text-lg font-extrabold">+{firstImprovement.diff.toFixed(1).replace(".", ",")} kg</h2>
                <p className="mt-2 line-clamp-2 text-xs text-gym-muted">su {firstImprovement.name}</p>
              </>
            ) : (
              <>
                <h2 className="mt-1 text-lg font-extrabold">{overview.sessionsThisWeek.length ? formatWorkoutCount(overview.sessionsThisWeek.length) : "Nessun dato"}</h2>
                <p className="mt-2 text-xs text-gym-muted">7 giorni</p>
              </>
            )}
          </Card>
        </Link>
      </div>

      {plan ? (
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-2xl bg-white/10 text-slate-300"><FileText size={16} /></div>
              <p className="text-sm text-gym-muted">Scheda attiva</p>
              <h2 className="mt-1 line-clamp-2 text-xl font-extrabold">{plan.name}</h2>
              <p className="text-sm text-gym-muted">{formatDayCount(days.length)} · {formatExerciseCount(exerciseCount)}</p>
            </div>
            <Link href="/import" className="shrink-0 rounded-2xl bg-white/10 px-3 py-2 text-xs font-bold text-slate-200">Importa</Link>
          </div>
        </Card>
      ) : null}

      {plan ? (
        <Card variant="subtle">
          <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-2xl bg-white/10 text-slate-300"><CalendarDays size={16} /></div>
          <p className="text-sm font-semibold text-gym-muted">Settimana</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="text-xl font-extrabold text-slate-100">{formatWorkoutCount(overview.sessionsThisWeek.length)}</p>
            <span className="text-gym-muted">·</span>
            <p className="text-xl font-extrabold text-slate-100">{formatSetCount(overview.totalSetsThisWeek)}</p>
          </div>
          <p className="mt-1 text-xs text-gym-muted">da lunedì</p>
        </Card>
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

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
}
