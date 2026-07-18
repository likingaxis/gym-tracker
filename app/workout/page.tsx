export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { Archive, BadgeCheck, CheckCircle2, ChevronRight, Dumbbell, Eye, Pencil, Play } from "lucide-react";
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
      <header className="relative overflow-hidden rounded-[2rem] border border-[#c65f37]/20 bg-gradient-to-br from-[#c65f37]/[0.12] via-black/40 to-black p-6 shadow-2xl backdrop-blur-xl">
        <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-gradient-to-bl from-[#c65f37]/25 to-transparent blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)] ${getPlanDotClass(plan.color)}`} />
            <p className="text-[11px] font-black uppercase tracking-widest text-[#c65f37]">Scheda attiva</p>
          </div>
          <h1 className="mt-3 text-4xl font-black leading-tight text-white tracking-tight">{plan.name}</h1>
          <p className="mt-2 text-sm font-semibold text-gym-muted">
            {formatPlanDateRange(plan.start_date, plan.end_date)} <span className="mx-1.5 text-white/20">•</span> {formatDayCount(days.length)} <span className="mx-1.5 text-white/20">•</span> {formatExerciseCount(exerciseCount)}
          </p>
        </div>
      </header>

      <nav className="grid grid-cols-3 gap-2 px-1" aria-label="Azioni scheda">
        <Link href="/workout/edit" className="flex items-center justify-center gap-2 rounded-2xl border border-white/5 bg-white/[0.03] py-3 text-xs font-bold text-white transition-all active:scale-95 hover:bg-white/[0.06] hover:border-white/10 shadow-inner">
          <Pencil size={16} className="text-gym-muted" /> Modifica
        </Link>
        <Link href="/import" className="flex items-center justify-center gap-2 rounded-2xl border border-white/5 bg-white/[0.03] py-3 text-xs font-bold text-white transition-all active:scale-95 hover:bg-white/[0.06] hover:border-white/10 shadow-inner">
          <Dumbbell size={16} className="text-gym-muted" /> Nuova
        </Link>
        <Link href="/workout/archive" className="flex items-center justify-center gap-2 rounded-2xl border border-white/5 bg-white/[0.03] py-3 text-xs font-bold text-white transition-all active:scale-95 hover:bg-white/[0.06] hover:border-white/10 shadow-inner">
          <Archive size={16} className="text-gym-muted" /> Archivio
        </Link>
      </nav>

      <section className="section-block border-t-0 pt-0">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="technical-label">Giorni</p>
            <h2 className="section-title">Scegli cosa consultare</h2>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {days.map((day: any) => {
            const last = lastByDay.get(day.id);
            const isRecommended = recommended?.id === day.id;
            
            // Revert back to app-row for the base satiny background, add glow for recommended
            const cardStyle = isRecommended 
              ? "app-row day-row-recommended !p-4 !border-[#c65f37]/40 !shadow-[0_0_20px_rgba(198,95,55,0.15)]"
              : "app-row !p-4";
              
            const pillStyle = isRecommended
              ? "bg-[#c65f37]/20 text-[#c65f37] border border-[#c65f37]/30"
              : "bg-white/5 text-gym-muted border border-white/5";

            return (
              <article key={day.id} className={`group relative flex items-center justify-between transition-all duration-300 ${cardStyle}`}>
                <Link href={`/workout/${day.id}/preview`} className="min-w-0 flex-1 pr-4 focus-visible:outline-none">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${pillStyle}`}>
                      G{day.day_order}
                    </span>
                    {isRecommended ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[#c65f37]">
                        <BadgeCheck size={12} strokeWidth={3} /> Consigliato
                      </span>
                    ) : null}
                  </div>
                  
                  <h2 className={`mt-2 text-xl font-black leading-tight ${isRecommended ? "text-white" : "text-white/90"}`}>
                    {getShortDayName(day.name)}
                  </h2>
                  
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-gym-muted uppercase tracking-wider">
                    <span>{formatExerciseCount(day.exercises?.length ?? 0)}</span>
                    <span className="inline-flex items-center gap-1.5">
                      {last ? <CheckCircle2 size={13} className="text-gym-success" strokeWidth={3} /> : null}
                      {last ? `Ultimo ${formatDate(last.started_at)}` : "Mai completato"}
                    </span>
                  </div>
                </Link>

                <div className="flex shrink-0 items-center gap-3">
                  <Link 
                    href={`/workout/${day.id}/preview`} 
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white"
                    aria-label={`Visualizza ${day.name}`}
                  >
                    <Eye size={18} />
                  </Link>
                  <Link 
                    href={`/workout/${day.id}`} 
                    className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition active:scale-90 ${isRecommended ? "bg-gradient-to-br from-[#c65f37] to-[#ea580c] text-white shadow-[#c65f37]/30" : "bg-white/10 text-white hover:bg-white/20"}`}
                    aria-label={`Inizia ${day.name}`}
                  >
                    <Play size={24} fill="currentColor" className="ml-1" />
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
