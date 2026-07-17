export const dynamic = "force-dynamic";

import Link from "next/link";
import { CalendarDays, History as HistoryIcon } from "lucide-react";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSelectedProfileId } from "@/lib/profiles";
import { getDayNameSnapshot, getPlanColorSnapshot, getPlanDotClass, getPlanNameSnapshot } from "@/lib/workoutPlanHistory";
import { SessionActions } from "@/components/history/SessionActions";
import { formatCompactNumber, getSessionSummary as getSmartSessionSummary } from "@/lib/progress";
import { formatSetCount, formatWorkoutCount } from "@/lib/utils/copy";
import { FadeIn, SlideUp, StaggeredList, StaggeredItem } from "@/components/ui/animations";

type Filter = "completed" | "in_progress" | "paused" | "abandoned" | "all";

type HistorySearchParams = {
  status?: string;
  plan?: string;
};

type HistoryPlan = {
  id: string;
  name: string;
  month?: string | null;
  is_active?: boolean | null;
  status?: string | null;
  color?: string | null;
};

async function getPlans(profileId: string) {
  try {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from("workout_plans")
      .select("id, name, month, is_active, status, color, created_at")
      .eq("profile_id", profileId)
      .order("is_active", { ascending: false })
      .order("created_at", { ascending: false });

    return (data ?? []) as HistoryPlan[];
  } catch {
    return [];
  }
}

async function getSessions(profileId: string, filter: Filter, planId: string | null) {
  try {
    const supabase = createServerSupabaseClient();
    let query = supabase
      .from("workout_sessions")
      .select("*, workout_plans(name, month, color), workout_days(name), session_exercises(completed, exercise_sets(completed, reps, weight, rpe))")
      .eq("profile_id", profileId)
      .is("deleted_at", null)
      .order("started_at", { ascending: false })
      .limit(80);

    if (filter !== "all") query = query.eq("status", filter);
    if (planId) query = query.eq("workout_plan_id", planId);

    const { data } = await query;
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function HistoryPage({ searchParams }: { searchParams?: Promise<HistorySearchParams> }) {
  const profileId = await getSelectedProfileId();
  if (!profileId) redirect("/profiles");

  const params = searchParams ? await searchParams : {};
  const rawFilter = params.status;
  const filter: Filter = rawFilter === "all" || rawFilter === "in_progress" || rawFilter === "paused" || rawFilter === "abandoned" ? rawFilter : "completed";

  const plans = await getPlans(profileId);
  const selectedPlanId = plans.some((plan) => plan.id === params.plan) ? params.plan ?? null : null;
  const sessions = await getSessions(profileId, filter, selectedPlanId);
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? null;

  const weekSessions = sessions.filter((session: any) => {
    const started = new Date(session.started_at).getTime();
    return Number.isFinite(started) && Date.now() - started <= 7 * 24 * 60 * 60 * 1000;
  });
  const weekSets = weekSessions.reduce((total: number, session: any) => total + getSmartSessionSummary(session).completedSets, 0);

  return (
    <div className="space-y-5">
      <FadeIn delay={0.1}>
        <header className="app-hero">
          <p className="technical-label text-gym-info">Storico</p>
          <h1 className="mt-2 text-4xl font-extrabold leading-none text-white">Allenamenti recenti</h1>
          <p className="mt-2 text-base text-white/65">Ogni sessione resta collegata alla scheda con cui è stata eseguita.</p>
        </header>
      </FadeIn>

      <SlideUp delay={0.2}>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Link href={buildHistoryHref(filter, selectedPlanId)} className="flex items-center justify-center gap-2 rounded-lg bg-gym-accent px-3 py-3 text-center font-extrabold text-slate-950 "><HistoryIcon size={15} /> Lista</Link>
          <Link href={buildCalendarHref(selectedPlanId)} className="flex items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-3 text-center font-bold text-slate-200"><CalendarDays size={15} /> Calendario</Link>
        </div>
      </SlideUp>

      <SlideUp delay={0.3} className="app-list p-3">
        <div className="flex items-center justify-between gap-3 text-sm">
          <div>
            <p className="font-bold text-slate-200">Questa vista</p>
            <p className="text-gym-muted">{selectedPlan ? selectedPlan.name : "Tutte le schede"} · {formatWorkoutCount(weekSessions.length)} · {formatSetCount(weekSets)}</p>
          </div>
          <details className="relative text-right">
            <summary className="cursor-pointer rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-slate-200">Filtra</summary>
            <div className="absolute right-0 z-20 mt-2 grid w-44 gap-2 rounded-lg border border-white/10 bg-white/[0.035] p-2 ">
              <FilterLink href={buildHistoryHref("completed", selectedPlanId)} active={filter === "completed"} label="Completati" />
              <FilterLink href={buildHistoryHref("in_progress", selectedPlanId)} active={filter === "in_progress"} label="In corso" />
              <FilterLink href={buildHistoryHref("paused", selectedPlanId)} active={filter === "paused"} label="In pausa" />
              <FilterLink href={buildHistoryHref("abandoned", selectedPlanId)} active={filter === "abandoned"} label="Interrotti" />
              <FilterLink href={buildHistoryHref("all", selectedPlanId)} active={filter === "all"} label="Tutti" />
              <FilterLink href="/history/trash" active={false} label="Cestino" />
            </div>
          </details>
        </div>
      </SlideUp>

      {plans.length > 1 ? (
        <SlideUp delay={0.4} className="app-list p-3">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gym-muted">Filtro scheda</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <PlanChip href={buildHistoryHref(filter, null)} active={!selectedPlanId} label="Tutte" />
            {plans.map((plan) => (
              <PlanChip
                key={plan.id}
                href={buildHistoryHref(filter, plan.id)}
                active={selectedPlanId === plan.id}
                label={plan.name}
                color={plan.color}
                status={Boolean(plan.is_active) || plan.status === "active" ? "Attiva" : "Archiviata"}
              />
            ))}
          </div>
        </SlideUp>
      ) : null}

      {sessions.length === 0 ? (
        <EmptyState
          icon={<HistoryIcon size={20} />}
          title="Nessun allenamento"
          description={selectedPlan ? "Questa scheda non ha sessioni con il filtro selezionato." : "Completa una sessione per vedere lo storico."}
        />
      ) : (
        <StaggeredList className="app-list">
          {sessions.map((session: any) => {
            const summary = getSmartSessionSummary(session);
            const startedAt = new Date(session.started_at).toLocaleDateString("it-IT", {
              day: "2-digit",
              month: "short",
            });

            return (
              <StaggeredItem key={session.id} className={`app-row block !py-4 ${getCardClass(session.status) || ""}`}>
                <Link href={`/history/${session.id}`} className="block w-full transition active:scale-[0.99]">
                  <div className="flex w-full items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-bold ${getStatusColor(session.status)}`}>{getStatusLabel(session.status)}</p>
                      <h2 className="mt-1 truncate text-xl font-extrabold text-white">{getDayNameSnapshot(session)}</h2>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gym-muted"><span>{startedAt}</span><span>·</span><span className={`h-2 w-2 shrink-0 rounded-full ${getPlanDotClass(getPlanColorSnapshot(session))}`} /><span>{getPlanNameSnapshot(session)}</span></p>
                      <p className="mt-2 text-sm text-slate-300">{summary.completedSets}/{summary.totalSets} serie · {formatCompactNumber(summary.volume)} kg</p>
                    </div>
                    <span className="ml-auto shrink-0 whitespace-nowrap rounded-full bg-white/10 px-3 py-1 text-sm font-bold">Dettaglio</span>
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
              </StaggeredItem>
            );
          })}
        </StaggeredList>
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
          ? "rounded-lg bg-gym-accent px-3 py-2 text-center text-xs font-extrabold text-slate-950"
          : "rounded-lg bg-white/10 px-3 py-2 text-center text-xs font-bold text-slate-200"
      }
    >
      {label}
    </Link>
  );
}

function PlanChip({ href, active, label, color, status }: { href: string; active: boolean; label: string; color?: string | null; status?: string }) {
  return (
    <Link
      href={href}
      className={
        active
          ? "min-w-max rounded-lg bg-gym-accent px-3 py-2 text-xs font-extrabold text-slate-950"
          : "min-w-max rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-slate-200"
      }
    >
      <span className="inline-flex items-center gap-2">
        {color ? <span className={`h-2 w-2 rounded-full ${getPlanDotClass(color)}`} /> : null}
        <span className="max-w-36 truncate">{label}</span>
        {status ? <span className={active ? "text-slate-700" : "text-gym-muted"}>{status}</span> : null}
      </span>
    </Link>
  );
}

function buildHistoryHref(filter: Filter, planId: string | null) {
  const params = new URLSearchParams();
  if (filter !== "completed") params.set("status", filter);
  if (planId) params.set("plan", planId);
  const qs = params.toString();
  return qs ? `/history?${qs}` : "/history";
}

function buildCalendarHref(planId: string | null) {
  return planId ? `/history/calendar?plan=${planId}` : "/history/calendar";
}

function getStatusLabel(status: string) {
  if (status === "completed") return "Completato";
  if (status === "abandoned") return "Interrotto";
  if (status === "paused") return "In pausa";
  return "In corso";
}

function getStatusColor(status: string) {
  if (status === "completed") return "text-gym-accent";
  if (status === "abandoned") return "text-amber-200";
  if (status === "paused") return "text-gym-info";
  return "text-sky-200";
}

function getCardClass(status: string) {
  if (status === "abandoned") return "border-amber-400/30 bg-amber-500/5";
  if (status === "paused") return "border-gym-info/30 bg-sky-500/5";
  if (status === "in_progress") return "border-sky-400/30 bg-sky-500/5";
  return undefined;
}
