export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { Settings } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSelectedProfileId } from "@/lib/profiles";
import { buildProgressOverview, formatCompactNumber, getSessionSummary, type SessionLike } from "@/lib/progress";
import { relationName } from "@/lib/relations";

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
      .select("id, status, started_at, completed_at, workout_day_id, workout_days(name), workout_plans(name, month), session_exercises(completed, exercises(name, exercise_db_id, muscle_group), exercise_sets(completed, reps, weight, rpe, set_number))")
      .eq("profile_id", profileId)
      .eq("status", "completed")
      .order("started_at", { ascending: false })
      .limit(50);
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
  const lastSession = completedSessions[0] ?? null;
  const lastByDay = buildLastSessionByDay(completedSessions);
  const recommendedDay = getRecommendedDay(days, lastByDay);

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gym-info">Home</p>
          <h1 className="mt-2 text-3xl font-extrabold">Ciao {profile?.name ?? "atleta"} {profile?.avatar_emoji ?? "🏋️"}</h1>
          <p className="mt-1 text-sm text-gym-muted">Cosa facciamo oggi?</p>
        </div>
        <Link href="/settings" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-slate-200" aria-label="Impostazioni">
          <Settings size={20} />
        </Link>
      </header>

      {!plan ? (
        <Card variant="primary">
          <p className="text-xs font-semibold text-gym-info">Primo passo</p>
          <h2 className="mt-2 text-2xl font-extrabold">Nessuna scheda attiva</h2>
          <p className="mt-2 text-gym-muted">Importa il JSON della tua scheda mensile per iniziare ad allenarti.</p>
          <Link href="/import">
            <Button className="mt-4 w-full py-4">Importa nuova scheda</Button>
          </Link>
        </Card>
      ) : recommendedDay ? (
        <Card variant="primary">
          <p className="text-xs font-semibold text-gym-info">Consigliato oggi</p>
          <h2 className="mt-2 text-2xl font-extrabold">{recommendedDay.name}</h2>
          <p className="mt-1 text-sm text-gym-muted">
            {lastByDay.get(recommendedDay.id) ? `Ultima volta: ${formatDate(lastByDay.get(recommendedDay.id)?.started_at)}` : "Mai completato"} · {recommendedDay.exercises?.length ?? 0} esercizi
          </p>
          <Link href={`/workout/${recommendedDay.id}`}>
            <Button className="mt-4 w-full py-4 text-base">Inizia allenamento</Button>
          </Link>
        </Card>
      ) : null}

      {lastSession ? (
        <Card>
          <p className="text-xs font-semibold text-gym-info">Ultimo allenamento</p>
          <div className="mt-2 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold">{relationName(lastSession.workout_days, "Allenamento")}</h2>
              <p className="mt-1 text-sm text-gym-muted">{formatDate(lastSession.started_at)} · {getSessionSummary(lastSession).completedSets} serie · {formatCompactNumber(getSessionSummary(lastSession).volume)} kg volume</p>
            </div>
            <Link href={`/history/${lastSession.id}`} className="rounded-2xl bg-white/10 px-3 py-2 text-xs font-bold text-slate-200">Dettaglio</Link>
          </div>
        </Card>
      ) : null}

      {plan ? (
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-gym-muted">Scheda attiva</p>
              <h2 className="mt-1 text-2xl font-extrabold">{plan.name}</h2>
              <p className="text-sm text-gym-muted">{plan.month} · {days.length} giorni · {days.reduce((total: number, day: any) => total + (day.exercises?.length ?? 0), 0)} esercizi</p>
            </div>
            <Link href="/import" className="rounded-2xl bg-white/10 px-3 py-2 text-xs font-bold text-slate-200">Importa</Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
            <MiniStat label="Ultimi 7 giorni" value={`${overview.sessionsThisWeek.length}`} hint="allenamenti" />
            <MiniStat label="Serie" value={`${overview.totalSetsThisWeek}`} hint="ultimi 7g" />
          </div>
        </Card>
      ) : null}

      {plan ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold">Giorni scheda</h2>
            <Link href="/workout" className="text-sm font-bold text-gym-info">Vedi tutti</Link>
          </div>
          {days.slice(0, 3).map((day: any) => {
            const last = lastByDay.get(day.id);
            return (
              <Link key={day.id} href={`/workout/${day.id}`} className="block">
                <Card className="transition active:scale-[0.99]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-gym-muted">Giorno {day.day_order}</p>
                      <h3 className="text-lg font-extrabold">{day.name}</h3>
                      <p className="mt-1 text-xs font-bold text-slate-400">{last ? `Ultima volta: ${formatDate(last.started_at)}` : "Mai completato"}</p>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-sm">{day.exercises?.length ?? 0}</span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}

function MiniStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl bg-black/20 p-3">
      <p className="text-gym-muted">{label}</p>
      <p className="mt-1 truncate text-lg font-extrabold text-slate-100">{value}</p>
      <p className="text-[0.65rem] text-slate-500">{hint}</p>
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
