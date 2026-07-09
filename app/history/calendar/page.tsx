export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSelectedProfileId } from "@/lib/profiles";
import { relationName } from "@/lib/relations";
import { formatAverage, formatCompactNumber, getSessionSummary } from "@/lib/progress";

type CalendarSearchParams = {
  month?: string;
  day?: string;
};

type CalendarSession = {
  id: string;
  status: string;
  started_at: string;
  completed_at?: string | null;
  workout_day_id?: string | null;
  workout_days?: { name?: string | null } | null;
  workout_plans?: { name?: string | null; month?: string | null } | null;
  session_exercises?: Array<{
    completed?: boolean | null;
    exercise_sets?: Array<{ completed?: boolean | null; reps?: string | number | null; weight?: string | number | null; rpe?: number | null }> | null;
  }> | null;
};

async function getMonthSessions(profileId: string, month: string) {
  try {
    const supabase = createServerSupabaseClient();
    const { start, end } = getMonthBounds(month);
    const { data } = await supabase
      .from("workout_sessions")
      .select("id, status, started_at, completed_at, workout_day_id, workout_days(name), workout_plans(name, month), session_exercises(completed, exercise_sets(completed, reps, weight, rpe))")
      .eq("profile_id", profileId)
      .gte("started_at", start.toISOString())
      .lt("started_at", end.toISOString())
      .order("started_at", { ascending: true });

    return (data ?? []) as CalendarSession[];
  } catch {
    return [];
  }
}

export default async function CalendarHistoryPage({ searchParams }: { searchParams?: Promise<CalendarSearchParams> }) {
  const profileId = await getSelectedProfileId();
  if (!profileId) redirect("/profiles");

  const params = searchParams ? await searchParams : {};
  const month = normalizeMonth(params.month);
  const sessions = await getMonthSessions(profileId, month);
  const selectedDay = normalizeDay(params.day, month) ?? getMostRecentSessionDay(sessions) ?? todayKeyIfMonth(month) ?? `${month}-01`;

  const monthGrid = buildMonthGrid(month);
  const sessionsByDay = groupSessionsByDay(sessions);
  const selectedSessions = sessionsByDay.get(selectedDay) ?? [];
  const stats = buildMonthStats(sessions);
  const previousMonth = shiftMonth(month, -1);
  const nextMonth = shiftMonth(month, 1);

  return (
    <div className="space-y-5">
      <header className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-gym-card to-gym-panel p-5">
        <p className="text-sm font-semibold text-gym-info">Calendario</p>
        <h1 className="mt-2 text-3xl font-extrabold">Allenamenti</h1>
        <p className="mt-2 text-sm text-gym-muted">Guarda a colpo d’occhio quando ti sei allenato e apri il dettaglio del giorno.</p>
      </header>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <Link href="/history" className="rounded-2xl bg-white/10 px-3 py-3 text-center font-bold text-slate-200">Lista</Link>
        <Link href={`/history/calendar?month=${month}`} className="rounded-2xl bg-gym-accent px-3 py-3 text-center font-extrabold text-slate-950 shadow-glow">Calendario</Link>
      </div>

      <Card className="border-gym-accent/20">
        <div className="flex items-center justify-between gap-3">
          <Link href={`/history/calendar?month=${previousMonth}`} className="rounded-2xl bg-white/10 p-3 text-slate-200" aria-label="Mese precedente">
            <ChevronLeft size={20} />
          </Link>
          <div className="text-center">
            <p className="text-xs font-semibold text-gym-info">Mese</p>
            <h2 className="text-2xl font-extrabold capitalize">{formatMonthTitle(month)}</h2>
          </div>
          <Link href={`/history/calendar?month=${nextMonth}`} className="rounded-2xl bg-white/10 p-3 text-slate-200" aria-label="Mese successivo">
            <ChevronRight size={20} />
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <MiniStat label="Allenamenti" value={`${stats.totalSessions}`} hint="mese" />
          <MiniStat label="Serie" value={`${stats.completedSets}`} hint="completate" />
          <MiniStat label="Volume" value={`${formatCompactNumber(stats.volume)} kg`} hint="stimato" />
        </div>
      </Card>

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
                href={`/history/calendar?month=${month}&day=${day.key}`}
                className={getDayClass(day.inMonth, isSelected, isToday, daySessions.length > 0)}
              >
                <span className="text-sm font-extrabold">{day.date.getDate()}</span>
                <span className="mt-1 flex min-h-2 justify-center gap-0.5">
                  {daySessions.slice(0, 3).map((session) => (
                    <span key={session.id} className={`h-1.5 w-1.5 rounded-full ${getStatusDot(session.status)}`} />
                  ))}
                </span>
              </Link>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-gym-muted">
          <Legend color="bg-gym-accent" label="Completato" />
          <Legend color="bg-sky-300" label="In corso" />
          <Legend color="bg-amber-300" label="Annullato" />
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-white/10 p-3 text-gym-accent"><CalendarDays size={22} /></div>
          <div>
            <p className="text-xs font-semibold text-gym-info">Giorno selezionato</p>
            <h2 className="text-2xl font-extrabold">{formatFullDate(selectedDay)}</h2>
          </div>
        </div>

        {selectedSessions.length === 0 ? (
          <p className="mt-4 rounded-3xl bg-black/20 p-4 text-sm text-gym-muted">Nessun allenamento registrato in questo giorno.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {selectedSessions.map((session) => {
              const summary = getSessionSummary(session as any);
              return (
                <Link key={session.id} href={`/history/${session.id}`} className="block rounded-3xl border border-white/10 bg-black/20 p-4 transition active:scale-[0.99]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-xs font-bold uppercase ${getStatusText(session.status)}`}>{getStatusLabel(session.status)}</p>
                      <h3 className="mt-1 text-lg font-extrabold">{relationName(session.workout_days, "Allenamento")}</h3>
                      <p className="mt-1 text-xs text-gym-muted">{formatTime(session.started_at)} · {relationName(session.workout_plans, "Scheda")}</p>
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
    <div className="rounded-2xl bg-black/20 p-3">
      <p className="text-gym-muted">{label}</p>
      <p className="mt-1 truncate text-base font-extrabold text-slate-100">{value}</p>
      <p className="text-[0.65rem] text-slate-500">{hint}</p>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${color}`} />{label}</span>;
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
  if (status === "abandoned") return "Annullato";
  return "In corso";
}

function getStatusDot(status: string) {
  if (status === "completed") return "bg-gym-accent";
  if (status === "abandoned") return "bg-amber-300";
  return "bg-sky-300";
}

function getStatusText(status: string) {
  if (status === "completed") return "text-gym-accent";
  if (status === "abandoned") return "text-amber-200";
  return "text-sky-200";
}

function getDayClass(inMonth: boolean, selected: boolean, today: boolean, hasSessions: boolean) {
  const base = "flex min-h-14 flex-col items-center justify-center rounded-2xl border text-center transition active:scale-[0.98]";
  if (selected) return `${base} border-gym-accent bg-gym-accent text-slate-950 shadow-glow`;
  if (hasSessions) return `${base} border-gym-accent/30 bg-gym-accent/10 text-slate-100`;
  if (today) return `${base} border-white/20 bg-white/10 text-slate-100`;
  if (!inMonth) return `${base} border-transparent bg-transparent text-slate-700`;
  return `${base} border-white/5 bg-white/[0.03] text-slate-400`;
}
