export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, CheckCircle2, Circle, Clock3, Dumbbell, PlayCircle, Repeat2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSelectedProfileId } from "@/lib/profiles";
import { type SessionLike } from "@/lib/progress";
import { formatDayCount, formatExerciseCount } from "@/lib/utils/copy";

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
          <p className="text-sm font-semibold text-gym-info">Scheda</p>
          <h1 className="mt-2 text-3xl font-extrabold">Nessuna scheda</h1>
        </header>
        <Card>
          <h2 className="text-2xl font-extrabold">Carica la tua scheda</h2>
          <p className="mt-2 text-gym-muted">Importa il JSON della tua scheda per iniziare.</p>
          <Link href="/import"><Button className="mt-4 w-full">Importa scheda</Button></Link>
        </Card>
      </div>
    );
  }

  const days = [...(plan.workout_days ?? [])].sort((a: any, b: any) => a.day_order - b.day_order);
  const lastByDay = buildLastSessionByDay(sessions);
  const recommended = getRecommendedDay(days, lastByDay);
  const exerciseCount = days.reduce((total: number, day: any) => total + (day.exercises?.length ?? 0), 0);

  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gym-info/15 text-gym-info">
            <Dumbbell size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gym-info">Scheda</p>
            <h1 className="mt-1 text-3xl font-extrabold">{plan.name}</h1>
            <p className="mt-1 text-sm text-gym-muted">{formatDayCount(days.length)} · {formatExerciseCount(exerciseCount)}</p>
          </div>
        </div>
      </header>

      <section className="space-y-3">
        {days.map((day: any) => {
          const last = lastByDay.get(day.id);
          const isRecommended = recommended?.id === day.id;
          const title = getShortDayName(day);
          return (
            <Link key={day.id} href={`/workout/${day.id}`} className="block">
              <Card variant={isRecommended ? "active" : last ? "default" : "subtle"} className="transition active:scale-[0.99]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <p className="text-sm font-semibold text-gym-muted">Giorno {day.day_order}</p>
                      {isRecommended ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gym-info/15 px-2 py-1 text-[0.7rem] font-bold text-gym-info">
                          <BadgeCheck size={12} /> Consigliato
                        </span>
                      ) : null}
                    </div>
                    <h2 className="text-xl font-extrabold leading-tight">{title}</h2>
                    <div className="mt-3 grid gap-2 text-sm text-gym-muted">
                      <div className="flex items-center gap-2">
                        {last ? <CheckCircle2 size={16} className="text-gym-accent" /> : <Circle size={16} className="text-slate-500" />}
                        <span>{last ? `Ultima volta ${formatDate(last.started_at)}` : "Mai completato"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Dumbbell size={16} className="text-slate-400" />
                        <span>{formatExerciseCount(day.exercises?.length ?? 0)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-3">
                    {last ? <Repeat2 size={21} className="text-slate-400" /> : <PlayCircle size={22} className="text-gym-accent" />}
                    <span className={`rounded-2xl px-3 py-2 text-sm font-extrabold ${last ? "bg-white/10 text-slate-100" : "bg-gym-accent text-slate-950"}`}>
                      {last ? "Ripeti" : "Inizia"}
                    </span>
                  </div>
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

function getShortDayName(day: any) {
  const raw = String(day.name ?? "Allenamento");
  return raw.replace(/^Giorno\s*\d+\s*[-–—]\s*/i, "") || raw;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
}
