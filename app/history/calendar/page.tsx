"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, History as HistoryIcon, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { getDayNameSnapshot, getPlanColorSnapshot, getPlanDotClass, getPlanNameSnapshot } from "@/lib/workoutPlanHistory";
import { formatAverage, formatCompactNumber, getSessionSummary } from "@/lib/progress";
import { getHistoryPlans, getMonthSessions } from "@/lib/api-client/history";

type HistoryPlan = {
  id: string;
  name: string;
  month?: string | null;
  is_active?: boolean | null;
  status?: string | null;
  color?: string | null;
};

type CalendarSession = {
  id: string;
  status: string;
  started_at: string;
  completed_at?: string | null;
  workout_plan_id?: string | null;
  workout_day_id?: string | null;
  workout_days?: { name?: string | null } | null;
  workout_plans?: { name?: string | null; month?: string | null; color?: string | null } | null;
  workout_plan_name_snapshot?: string | null;
  workout_day_name_snapshot?: string | null;
  workout_plan_color_snapshot?: string | null;
  session_exercises?: Array<{
    completed?: boolean | null;
    exercise_sets?: Array<{ completed?: boolean | null; reps?: string | number | null; weight?: string | number | null; rpe?: number | null }> | null;
  }> | null;
};

function CalendarHistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawMonth = searchParams.get("month") ?? undefined;
  const rawDay = searchParams.get("day") ?? undefined;
  const rawPlan = searchParams.get("plan") ?? undefined;

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<HistoryPlan[]>([]);
  const [sessions, setSessions] = useState<CalendarSession[]>([]);

  const month = normalizeMonth(rawMonth);
  const selectedPlanId = plans.some((plan) => plan.id === rawPlan) ? rawPlan ?? null : null;
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? null;
  const selectedDay = normalizeDay(rawDay, month) ?? getMostRecentSessionDay(sessions) ?? todayKeyIfMonth(month) ?? `${month}-01`;

  useEffect(() => {
    async function loadData() {
      const profileId = localStorage.getItem("active_profile_id");
      if (!profileId) {
        router.push("/profiles");
        return;
      }

      setLoading(true);
      const [plansData, sessionsData] = await Promise.all([
        getHistoryPlans(profileId),
        getMonthSessions(profileId, month, selectedPlanId),
      ]);

      setPlans(plansData as HistoryPlan[]);
      setSessions(sessionsData as CalendarSession[]);
      setLoading(false);
    }

    loadData();
  }, [month, selectedPlanId, router]);

  if (loading) {
    return <div className="p-6 text-center text-gym-muted">Caricamento calendario...</div>;
  }

  const monthGrid = buildMonthGrid(month);
  const sessionsByDay = groupSessionsByDay(sessions);
  const selectedSessions = sessionsByDay.get(selectedDay) ?? [];
  const stats = buildMonthStats(sessions);
  const previousMonth = shiftMonth(month, -1);
  const nextMonth = shiftMonth(month, 1);
  const visiblePlans = buildVisiblePlanLegend(sessions);

  return (
    <div className="space-y-5">
      <header className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-5">
        <p className="text-sm font-semibold text-gym-info">Calendario</p>
        <h1 className="mt-2 text-3xl font-extrabold">Allenamenti</h1>
        <p className="mt-2 text-sm text-gym-muted">Ogni pallino indica la scheda usata in quel giorno.</p>
      </header>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <Link href={buildHistoryHref(selectedPlanId)} className="flex items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-3 text-center font-bold text-slate-200 hover:bg-white/15"><HistoryIcon size={16} /> Lista</Link>
        <Link href={buildCalendarHref(month, selectedDay, selectedPlanId)} className="flex items-center justify-center gap-2 rounded-xl bg-gym-accent px-3 py-3 text-center font-extrabold text-slate-950 shadow-md shadow-gym-accent/20"><CalendarDays size={16} /> Calendario</Link>
      </div>

      <Card className="border-gym-accent/20">
        <div className="flex items-center justify-between gap-3">
          <Link href={buildCalendarHref(previousMonth, undefined, selectedPlanId)} className="rounded-lg bg-white/10 p-3 text-slate-200" aria-label="Mese precedente">
            <ChevronLeft size={20} />
          </Link>
          <div className="text-center">
            <p className="text-xs font-semibold text-gym-info">Mese</p>
            <h2 className="text-2xl font-extrabold capitalize">{formatMonthTitle(month)}</h2>
            <p className="mt-1 text-xs text-gym-muted">{selectedPlan ? selectedPlan.name : "Tutte le schede"}</p>
          </div>
          <div className="flex items-center gap-1">
            <Link href={buildCalendarHref(nextMonth, undefined, selectedPlanId)} className="rounded-lg bg-white/10 p-3 text-slate-200" aria-label="Mese successivo">
              <ChevronRight size={20} />
            </Link>
            <Link href="/history/trash" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-400 hover:bg-red-500/20" title="Cestino" aria-label="Apri cestino">
              <Trash2 size={20} />
            </Link>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <MiniStat label="Allenamenti" value={`${stats.totalSessions}`} hint="mese" />
          <MiniStat label="Serie" value={`${stats.completedSets}`} hint="completate" />
          <MiniStat label="Volume" value={`${formatCompactNumber(stats.volume)} kg`} hint="stimato" />
        </div>
      </Card>

      {plans.length > 1 ? (
        <Card variant="subtle" className="p-3">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gym-muted">Filtro scheda</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <PlanChip href={buildCalendarHref(month, selectedDay, null)} active={!selectedPlanId} label="Tutte" />
            {plans.map((plan) => (
              <PlanChip
                key={plan.id}
                href={buildCalendarHref(month, selectedDay, plan.id)}
                active={selectedPlanId === plan.id}
                label={plan.name}
                color={plan.color}
                status={Boolean(plan.is_active) || plan.status === "active" ? "Attiva" : "Archiviata"}
              />
            ))}
          </div>
        </Card>
      ) : null}

      <Card>
        <div className="mb-3 grid grid-cols-7 gap-1 text-center text-[0.7rem] font-bold uppercase text-gym-muted">
          {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((day) => <span key={day}>{day}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {monthGrid.map((day) => {
            const daySessions = sessionsByDay.get(day.key) ?? [];
            const isSelected = day.key === selectedDay;
            const isToday = day.key === getDateKey(new Date());
            return (
              <Link
                key={day.key}
                href={buildCalendarHref(month, day.key, selectedPlanId)}
                className={getDayClass(day.inMonth, isSelected, isToday, daySessions.length > 0)}
              >
                <span className="text-sm font-extrabold">{day.date.getDate()}</span>
                <span className="mt-1 flex min-h-2 justify-center gap-0.5">
                  {daySessions.slice(0, 4).map((session) => (
                    <span key={session.id} className={`h-1.5 w-1.5 rounded-full ${getPlanDotClass(getPlanColorSnapshot(session))}`} />
                  ))}
                </span>
              </Link>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-gym-muted">
          {visiblePlans.length === 0 ? (
            <span>Nessuna sessione nel mese selezionato.</span>
          ) : (
            visiblePlans.map((plan) => <Legend key={plan.label + plan.color} color={getPlanDotClass(plan.color)} label={plan.label} />)
          )}
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-white/10 p-3 text-gym-accent"><CalendarDays size={22} /></div>
          <div>
            <p className="text-xs font-semibold text-gym-info">Giorno selezionato</p>
            <h2 className="text-2xl font-extrabold capitalize">{formatFullDate(selectedDay)}</h2>
          </div>
        </div>

        {selectedSessions.length === 0 ? (
          <p className="mt-4 rounded-lg bg-black/20 p-4 text-sm text-gym-muted">Nessun allenamento registrato in questo giorno.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {selectedSessions.map((session) => {
              const summary = getSessionSummary(session as any);
              return (
                <Link key={session.id} href={`/history/detail?sessionId=${session.id}`} className="block rounded-lg border border-white/10 bg-black/20 p-4 transition active:scale-[0.99]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-xs font-bold uppercase ${getStatusText(session.status)}`}>{getStatusLabel(session.status)}</p>
                      <h3 className="mt-1 text-lg font-extrabold">{getDayNameSnapshot(session)}</h3>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gym-muted"><span>{formatTime(session.started_at)}</span><span>·</span><span className={`h-2 w-2 rounded-full ${getPlanDotClass(getPlanColorSnapshot(session))}`} /><span>{getPlanNameSnapshot(session)}</span></p>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">{summary.completedSets}/{summary.totalSets}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <MiniStat label="Serie" value={`${summary.completedSets}`} hint="ok" />
                    <MiniStat label="Volume" value={`${formatCompactNumber(summary.volume)} kg`} hint="stimato" />
                    <MiniStat label="RPE" value={formatAverage(summary.averageRpe)} hint="medio" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

export default function CalendarHistoryPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-gym-muted">Caricamento...</div>}>
      <CalendarHistoryContent />
    </Suspense>
  );
}

function buildMonthStats(sessions: CalendarSession[]) {
  return sessions.reduce(
    (acc, session) => {
      if (session.status === "completed") {
        const summary = getSessionSummary(session as any);
        acc.completedSessions += 1;
        acc.completedSets += summary.completedSets;
        acc.volume += summary.volume;
      }
      acc.totalSessions += 1;
      return acc;
    },
    { totalSessions: 0, completedSessions: 0, completedSets: 0, volume: 0 },
  );
}

function MiniStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg bg-black/20 p-3">
      <p className="text-gym-muted">{label}</p>
      <p className="mt-1 truncate text-base font-extrabold text-slate-100">{value}</p>
      <p className="text-[0.65rem] text-slate-500">{hint}</p>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${color}`} />{label}</span>;
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

function groupSessionsByDay(sessions: CalendarSession[]) {
  const map = new Map<string, CalendarSession[]>();
  for (const session of sessions) {
    const key = getDateKey(new Date(session.started_at));
    const list = map.get(key) ?? [];
    list.push(session);
    map.set(key, list);
  }
  return map;
}

function buildVisiblePlanLegend(sessions: CalendarSession[]) {
  const map = new Map<string, { label: string; color: string | null | undefined }>();
  for (const session of sessions) {
    const label = getPlanNameSnapshot(session);
    const color = getPlanColorSnapshot(session);
    const key = `${label}-${color ?? ""}`;
    if (!map.has(key)) map.set(key, { label, color });
  }
  return [...map.values()].slice(0, 8);
}

function buildMonthGrid(month: string) {
  const { start, end } = getMonthBounds(month);
  const gridStart = new Date(start);
  const dayOfWeek = (gridStart.getDay() + 6) % 7;
  gridStart.setDate(gridStart.getDate() - dayOfWeek);

  const gridEnd = new Date(end);
  const endDayOfWeek = (gridEnd.getDay() + 6) % 7;
  gridEnd.setDate(gridEnd.getDate() + (6 - endDayOfWeek));

  const days: Array<{ key: string; date: Date; inMonth: boolean }> = [];
  const cursor = new Date(gridStart);
  while (cursor < gridEnd) {
    const date = new Date(cursor);
    days.push({ key: getDateKey(date), date, inMonth: getMonthKey(date) === month });
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function getMonthBounds(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  const start = new Date(year, monthIndex - 1, 1);
  const end = new Date(year, monthIndex, 1);
  return { start, end };
}

function normalizeMonth(value: string | undefined) {
  if (value && /^\d{4}-\d{2}$/.test(value)) return value;
  return getMonthKey(new Date());
}

function normalizeDay(value: string | undefined, month: string) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value) && value.startsWith(month)) return value;
  return null;
}

function getMostRecentSessionDay(sessions: CalendarSession[]) {
  const latest = [...sessions].reverse().find((session) => session.started_at);
  return latest ? getDateKey(new Date(latest.started_at)) : null;
}

function todayKeyIfMonth(month: string) {
  const today = new Date();
  return getMonthKey(today) === month ? getDateKey(today) : null;
}

function shiftMonth(month: string, amount: number) {
  const { start } = getMonthBounds(month);
  start.setMonth(start.getMonth() + amount);
  return getMonthKey(start);
}

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function buildCalendarHref(month: string, day?: string, planId?: string | null) {
  const params = new URLSearchParams();
  params.set("month", month);
  if (day) params.set("day", day);
  if (planId) params.set("plan", planId);
  return `/history/calendar?${params.toString()}`;
}

function buildHistoryHref(planId: string | null) {
  return planId ? `/history?plan=${planId}` : "/history";
}

function formatMonthTitle(month: string) {
  const { start } = getMonthBounds(month);
  return start.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
}

function formatFullDate(day: string) {
  return new Date(`${day}T12:00:00`).toLocaleDateString("it-IT", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

function formatTime(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

function getStatusLabel(status: string) {
  if (status === "completed") return "Completato";
  if (status === "abandoned") return "Interrotto";
  if (status === "paused") return "In pausa";
  return "In corso";
}

function getStatusText(status: string) {
  if (status === "completed") return "text-gym-accent";
  if (status === "abandoned") return "text-amber-200";
  if (status === "paused") return "text-gym-info";
  return "text-sky-200";
}

function getDayClass(inMonth: boolean, selected: boolean, today: boolean, hasSessions: boolean) {
  const base = "flex min-h-[3.5rem] flex-col items-center justify-center rounded-2xl border text-center transition active:scale-[0.96]";
  if (selected) return `${base} border-gym-accent bg-gym-accent text-[#050708] shadow-[0_4px_15px_rgba(198,95,55,0.4)]`;
  if (hasSessions) return `${base} border-gym-accent/40 bg-[radial-gradient(ellipse_at_top_right,_rgba(198,95,55,0.2),_transparent)] text-slate-100`;
  if (today) return `${base} border-white/20 bg-white/10 text-slate-100`;
  if (!inMonth) return `${base} border-transparent bg-transparent text-slate-700`;
  return `${base} border-white/5 bg-white/[0.02] text-slate-400`;
}
