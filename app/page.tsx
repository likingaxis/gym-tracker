export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { Settings } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSelectedProfileId } from "@/lib/profiles";
import { SessionActions } from "@/components/history/SessionActions";
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

type OpenSession = {
  id: string;
  workout_day_id?: string | null;
  started_at: string;
  workout_days?: { name?: string | null } | Array<{ name?: string | null }> | null;
};

async function getOpenSession(profileId: string) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: session } = await supabase
      .from("workout_sessions")
      .select("id, workout_day_id, started_at, workout_days(name)")
      .eq("status", "in_progress")
      .eq("profile_id", profileId)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return session as OpenSession | null;
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

  const [profile, plan, openSession, completedSessions] = await Promise.all([
    getSelectedProfile(profileId),
    getActivePlan(profileId),
    getOpenSession(profileId),
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
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-gym-accent">Home</p>
          <h1 className="mt-2 text-3xl font-black">Ciao {profile?.name ?? "atleta"} {profile?.avatar_emoji ?? "🏋️"}</h1>
          <p className="mt-1 text-sm text-gym-muted">Cosa facciamo oggi?</p>
        </div>
        <Link href="/settings" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-slate-200" aria-label="Impostazioni">
          <Settings size={20} />
        </Link>
      </header>

      {!plan ? (
        <Card className="border-gym-accent/40 bg-gym-accent/10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gym-accent">Primo passo</p>
          <h2 className="mt-2 text-2xl font-black">Nessuna scheda attiva</h2>
          <p className="mt-2 text-gym-muted">Importa il JSON della tua scheda mensile per iniziare ad allenarti.</p>
          <Link href="/import">
            <Button className="mt-4 w-full py-4">Importa nuova scheda</Button>
          </Link>
        </Card>
      ) : openSession?.workout_day_id ? (
        <Card className="border-gym-accent/50 bg-gym-accent/10 shadow-glow">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gym-accent">Allenamento in corso</p>
          <h2 className="mt-2 text-2xl font-black">{relationName(openSession.workout_days, "Allenamento")}</h2>
          <p className="mt-1 text-sm text-gym-muted">
            Iniziato {new Date(openSession.started_at).toLocaleString("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
          </p>
          <div className="mt-4">
            <SessionActions sessionId={openSession.id} workoutDayId={openSession.workout_day_id} status="in_progress" compact />
          </div>
        </Card>
      ) : recommendedDay ? (
        <Card className="border-gym-accent/40 bg-gradient-to-br from-gym-card to-gym-panel shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gym-accent">Consigliato oggi</p>
          <h2 className="mt-2 text-2xl font-black">{recommendedDay.name}</h2>
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
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gym-accent">Ultimo allenamento</p>
          <div className="mt-2 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">{relationName(lastSession.workout_days, "Allenamento")}</h2>
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
              <h2 className="mt-1 text-2xl font-black">{plan.name}</h2>
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
            <h2 className="text-xl font-black">Giorni scheda</h2>
            <Link href="/workout" className="text-sm font-bold text-gym-accent">Vedi tutti</Link>
          </div>
          {days.slice(0, 3).map((day: any) => {
            const last = lastByDay.get(day.id);
            return (
              <Link key={day.id} href={`/workout/${day.id}`} className="block">
                <Card className="transition active:scale-[0.99]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase text-gym-accent">Giorno {day.day_order}</p>
                      <h3 className="text-lg font-black">{day.name}</h3>
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
      <p className="mt-1 truncate text-lg font-black text-slate-100">{value}</p>
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
