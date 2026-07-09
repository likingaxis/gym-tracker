export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSelectedProfileId } from "@/lib/profiles";
import { relationName } from "@/lib/relations";
import { SessionActions } from "@/components/history/SessionActions";
import { formatAverage, formatCompactNumber, getSessionSummary as getSmartSessionSummary } from "@/lib/progress";

type Filter = "completed" | "in_progress" | "abandoned" | "all";

async function getSessions(profileId: string, filter: Filter) {
  try {
    const supabase = createServerSupabaseClient();
    let query = supabase
      .from("workout_sessions")
      .select("*, workout_plans(name, month), workout_days(name), session_exercises(completed, exercise_sets(completed, reps, weight, rpe))")
      .eq("profile_id", profileId)
      .order("started_at", { ascending: false })
      .limit(50);

    if (filter !== "all") query = query.eq("status", filter);

    const { data } = await query;
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function HistoryPage({ searchParams }: { searchParams?: Promise<{ status?: string }> }) {
  const profileId = await getSelectedProfileId();
  if (!profileId) redirect("/profiles");

  const params = searchParams ? await searchParams : {};
  const rawFilter = params.status;
  const filter: Filter = rawFilter === "all" || rawFilter === "in_progress" || rawFilter === "abandoned" ? rawFilter : "completed";
  const sessions = await getSessions(profileId, filter);

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-gym-accent">Storico</p>
        <h1 className="mt-2 text-4xl font-black">Allenamenti recenti</h1>
        <p className="mt-2 text-gym-muted">Di default vedi gli allenamenti completati. Usa i filtri solo per sessioni in corso, annullate o di test.</p>
      </header>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <Link href="/history" className="rounded-2xl bg-gym-accent px-3 py-3 text-center font-black text-slate-950 shadow-glow">Lista</Link>
        <Link href="/history/calendar" className="rounded-2xl bg-white/10 px-3 py-3 text-center font-bold text-slate-200">Calendario</Link>
      </div>

      <details className="rounded-2xl bg-white/5 p-3 text-sm">
        <summary className="cursor-pointer font-black text-slate-200">Filtri avanzati</summary>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <FilterLink href="/history" active={filter === "completed"} label="Completati" />
          <FilterLink href="/history?status=in_progress" active={filter === "in_progress"} label="In corso" />
          <FilterLink href="/history?status=abandoned" active={filter === "abandoned"} label="Annullati" />
          <FilterLink href="/history?status=all" active={filter === "all"} label="Tutti" />
        </div>
      </details>

      {sessions.length === 0 ? (
        <Card>
          <h2 className="text-xl font-black">Nessuna sessione qui</h2>
          <p className="mt-2 text-gym-muted">Cambia filtro oppure apri un giorno di allenamento dalla dashboard.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((session: any) => {
            const summary = getSmartSessionSummary(session);
            const startedAt = new Date(session.started_at).toLocaleString("it-IT", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            });

            return (
              <Card key={session.id} className={getCardClass(session.status)}>
                <Link href={`/history/${session.id}`} className="block transition active:scale-[0.99]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-xs font-bold uppercase ${getStatusColor(session.status)}`}>{getStatusLabel(session.status)}</p>
                      <h2 className="mt-1 text-xl font-black">{relationName(session.workout_days, "Allenamento")}</h2>
                      <p className="mt-1 text-sm text-gym-muted">{relationName(session.workout_plans, "Scheda")}</p>
                      <p className="mt-1 text-sm text-gym-muted">{startedAt}</p>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-bold">{summary.completedSets}/{summary.totalSets}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
                    <MiniStat label="Esercizi" value={`${summary.completedExercises}/${summary.totalExercises}`} />
                    <MiniStat label="Serie" value={`${summary.completedSets}/${summary.totalSets}`} />
                    <MiniStat label="Volume" value={`${formatCompactNumber(summary.volume)} kg`} />
                    <MiniStat label="RPE" value={formatAverage(summary.averageRpe)} />
                  </div>
                </Link>

                <div className="mt-3 border-t border-white/10 pt-3">
                  <SessionActions
                    sessionId={session.id}
                    workoutDayId={session.workout_day_id}
                    status={session.status}
                    compact
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-2xl bg-gym-accent px-3 py-3 text-center font-black text-slate-950 shadow-glow"
          : "rounded-2xl bg-white/10 px-3 py-3 text-center font-bold text-slate-200"
      }
    >
      {label}
    </Link>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-black/20 p-2">
      <p className="text-gym-muted">{label}</p>
      <p className="font-black text-slate-100">{value}</p>
    </div>
  );
}

function getStatusLabel(status: string) {
  if (status === "completed") return "Completato";
  if (status === "abandoned") return "Annullato";
  return "In corso";
}

function getStatusColor(status: string) {
  if (status === "completed") return "text-gym-accent";
  if (status === "abandoned") return "text-amber-200";
  return "text-sky-200";
}

function getCardClass(status: string) {
  if (status === "abandoned") return "border-amber-400/30 bg-amber-500/5";
  if (status === "in_progress") return "border-sky-400/30 bg-sky-500/5";
  return undefined;
}
