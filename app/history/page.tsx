export const dynamic = "force-dynamic";

import Link from "next/link";
import { CalendarDays, History as HistoryIcon } from "lucide-react";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSelectedProfileId } from "@/lib/profiles";
import { relationName } from "@/lib/relations";
import { SessionActions } from "@/components/history/SessionActions";
import { formatCompactNumber, getSessionSummary as getSmartSessionSummary } from "@/lib/progress";
import { formatSetCount, formatWorkoutCount } from "@/lib/utils/copy";

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
  const weekSessions = sessions.filter((session: any) => {
    const started = new Date(session.started_at).getTime();
    return Number.isFinite(started) && Date.now() - started <= 7 * 24 * 60 * 60 * 1000;
  });
  const weekSets = weekSessions.reduce((total: number, session: any) => total + getSmartSessionSummary(session).completedSets, 0);

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-semibold text-gym-info">Storico</p>
        <h1 className="mt-2 text-3xl font-extrabold">Allenamenti recenti</h1>
        <p className="mt-2 text-gym-muted">Tocca una sessione per aprire il riepilogo.</p>
      </header>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <Link href="/history" className="flex items-center justify-center gap-2 rounded-2xl bg-gym-accent px-3 py-3 text-center font-extrabold text-slate-950 shadow-glow"><HistoryIcon size={15} /> Lista</Link>
        <Link href="/history/calendar" className="flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-3 py-3 text-center font-bold text-slate-200"><CalendarDays size={15} /> Calendario</Link>
      </div>

      <Card variant="subtle" className="p-3">
        <div className="flex items-center justify-between gap-3 text-sm">
          <div>
            <p className="font-bold text-slate-200">Questa settimana</p>
            <p className="text-gym-muted">{formatWorkoutCount(weekSessions.length)} · {formatSetCount(weekSets)}</p>
          </div>
          <details className="relative text-right">
            <summary className="cursor-pointer rounded-2xl bg-white/10 px-3 py-2 text-xs font-bold text-slate-200">Filtra</summary>
            <div className="absolute right-0 z-20 mt-2 grid w-44 gap-2 rounded-3xl border border-white/10 bg-gym-panel p-2 shadow-card">
              <FilterLink href="/history" active={filter === "completed"} label="Completati" />
              <FilterLink href="/history?status=in_progress" active={filter === "in_progress"} label="In corso" />
              <FilterLink href="/history?status=abandoned" active={filter === "abandoned"} label="Annullati" />
              <FilterLink href="/history?status=all" active={filter === "all"} label="Tutti" />
            </div>
          </details>
        </div>
      </Card>

      {sessions.length === 0 ? (
        <EmptyState
          icon={<HistoryIcon size={20} />}
          title="Nessun allenamento"
          description="Completa una sessione per vedere lo storico."
        />
      ) : (
        <div className="space-y-3">
          {sessions.map((session: any) => {
            const summary = getSmartSessionSummary(session);
            const startedAt = new Date(session.started_at).toLocaleDateString("it-IT", {
              day: "2-digit",
              month: "short",
            });

            return (
              <Card key={session.id} className={getCardClass(session.status)}>
                <Link href={`/history/${session.id}`} className="block transition active:scale-[0.99]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-xs font-bold ${getStatusColor(session.status)}`}>{getStatusLabel(session.status)}</p>
                      <h2 className="mt-1 text-xl font-extrabold">{relationName(session.workout_days, "Allenamento")}</h2>
                      <p className="mt-1 text-sm text-gym-muted">{startedAt} · {relationName(session.workout_plans, "Scheda")}</p>
                      <p className="mt-2 text-sm text-slate-300">{summary.completedSets}/{summary.totalSets} serie · {formatCompactNumber(summary.volume)} kg</p>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-bold">Dettaglio</span>
                  </div>
                </Link>

                {session.status !== "completed" ? (
                  <details className="mt-3 border-t border-white/10 pt-3 text-sm">
                    <summary className="cursor-pointer font-bold text-slate-300">Azioni</summary>
                    <div className="mt-3">
                      <SessionActions
                        sessionId={session.id}
                        workoutDayId={session.workout_day_id}
                        status={session.status}
                        compact
                      />
                    </div>
                  </details>
                ) : null}
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
          ? "rounded-2xl bg-gym-accent px-3 py-2 text-center text-xs font-extrabold text-slate-950"
          : "rounded-2xl bg-white/10 px-3 py-2 text-center text-xs font-bold text-slate-200"
      }
    >
      {label}
    </Link>
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
