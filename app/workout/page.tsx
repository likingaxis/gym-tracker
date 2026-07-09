export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSelectedProfileId } from "@/lib/profiles";
import { type SessionLike } from "@/lib/progress";

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

  const [plan, sessions] = await Promise.all([
    getActivePlan(profileId),
    getCompletedSessions(profileId),
  ]);

  if (!plan) {
    return (
      <div className="space-y-5">
        <header>
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-gym-accent">Allenati</p>
          <h1 className="mt-2 text-4xl font-black">Scheda</h1>
        </header>
        <Card>
          <h2 className="text-2xl font-black">Nessuna scheda attiva</h2>
          <p className="mt-2 text-gym-muted">Importa il JSON della tua scheda per iniziare.</p>
          <Link href="/import"><Button className="mt-4 w-full">Importa nuova scheda</Button></Link>
        </Card>
      </div>
    );
  }

  const days = [...(plan.workout_days ?? [])].sort((a: any, b: any) => a.day_order - b.day_order);
  const lastByDay = buildLastSessionByDay(sessions);
  const recommended = getRecommendedDay(days, lastByDay);

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-gym-accent">Allenati</p>
        <h1 className="mt-2 text-4xl font-black">Scegli il giorno</h1>
        <p className="mt-2 text-gym-muted">{plan.name} · {plan.month}</p>
      </header>

      {recommended ? (
        <Card className="border-gym-accent/50 bg-gym-accent/10 shadow-glow">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gym-accent">Consigliato oggi</p>
          <h2 className="mt-2 text-2xl font-black">{recommended.name}</h2>
          <p className="mt-1 text-sm text-gym-muted">
            {lastByDay.get(recommended.id) ? `Ultima volta: ${formatDate(lastByDay.get(recommended.id)?.started_at)}` : "Mai completato"} · {recommended.exercises?.length ?? 0} esercizi
          </p>
          {recommended.description ? <p className="mt-2 line-clamp-2 text-sm text-slate-400">{recommended.description}</p> : null}
          <Link href={`/workout/${recommended.id}`}><Button className="mt-4 w-full py-4">Inizia {recommended.name}</Button></Link>
        </Card>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-xl font-black">Tutti i giorni</h2>
        {days.map((day: any) => {
          const last = lastByDay.get(day.id);
          const isRecommended = recommended?.id === day.id;
          return (
            <Link key={day.id} href={`/workout/${day.id}`} className="block">
              <Card className={isRecommended ? "border-gym-accent/40" : "transition active:scale-[0.99]"}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase text-gym-accent">Giorno {day.day_order}{isRecommended ? " · consigliato" : ""}</p>
                    <h3 className="text-xl font-black">{day.name}</h3>
                    <p className="mt-1 text-sm text-gym-muted">{day.exercises?.length ?? 0} esercizi · {last ? `ultima volta ${formatDate(last.started_at)}` : "mai completato"}</p>
                    {day.description ? <p className="mt-2 line-clamp-2 text-sm text-slate-500">{day.description}</p> : null}
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-bold">Apri</span>
                </div>
              </Card>
            </Link>
          );
        })}
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

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
}
