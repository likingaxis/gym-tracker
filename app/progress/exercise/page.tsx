export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Trophy } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSelectedProfileId } from "@/lib/profiles";
import {
  buildExerciseProgress,
  formatAverage,
  formatCompactNumber,
  formatShortDate,
  getExerciseTrend,
  type SessionLike,
} from "@/lib/progress";

async function getProgressSessions(profileId: string) {
  try {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from("workout_sessions")
      .select("id, status, started_at, completed_at, workout_day_id, workout_days(name), workout_plans(name, month), session_exercises(completed, exercises(name, exercise_db_id, muscle_group), exercise_sets(completed, reps, weight, rpe, set_number))")
      .eq("profile_id", profileId)
      .eq("status", "completed")
      .order("started_at", { ascending: false })
      .limit(180);
    return (data ?? []) as SessionLike[];
  } catch {
    return [];
  }
}

export default async function ExerciseProgressPage({ searchParams }: { searchParams?: Promise<{ key?: string }> }) {
  const profileId = await getSelectedProfileId();
  if (!profileId) redirect("/profiles");

  const params = searchParams ? await searchParams : {};
  const key = params.key ? decodeURIComponent(params.key) : "";
  const sessions = await getProgressSessions(profileId);
  const exercises = buildExerciseProgress(sessions);
  const exercise = exercises.find((item) => item.key === key) ?? null;

  if (!exercise) {
    return (
      <div className="space-y-5">
        <Link href="/progress" className="inline-flex items-center gap-2 text-sm font-bold text-gym-accent"><ArrowLeft size={16} /> Progressi</Link>
        <Card>
          <h1 className="text-2xl font-black">Esercizio non trovato</h1>
          <p className="mt-2 text-gym-muted">Torna ai progressi e scegli un esercizio disponibile.</p>
        </Card>
      </div>
    );
  }

  const entries = exercise.entries;
  const entriesWithWeight = entries.filter((entry) => entry.averageWeight !== null);
  const last = entries[entries.length - 1];
  const best = entriesWithWeight.length
    ? entriesWithWeight.reduce((winner, entry) => Number(entry.maxWeight ?? 0) > Number(winner.maxWeight ?? 0) ? entry : winner, entriesWithWeight[0])
    : null;
  const trend = getExerciseTrend(entries);
  const totalVolume = entries.reduce((sum, entry) => sum + entry.volume, 0);
  const rpeValues = entries
    .map((entry) => entry.averageRpe)
    .filter((value): value is number => value !== null && Number.isFinite(value));
  const averageRpe = rpeValues.length ? rpeValues.reduce((sum, value) => sum + value, 0) / rpeValues.length : null;

  return (
    <div className="space-y-5">
      <Link href="/progress" className="inline-flex items-center gap-2 text-sm font-bold text-gym-accent"><ArrowLeft size={16} /> Progressi</Link>

      <header className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-gym-card via-gym-panel to-black p-5">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-gym-accent">Dettaglio esercizio</p>
        <h1 className="mt-2 text-4xl font-black">{exercise.name}</h1>
        <p className="mt-2 text-gym-muted">{exercise.muscleGroup} · {entries.length} sessioni registrate</p>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <MiniStat label="Ultima media" value={last?.averageWeight ? `${last.averageWeight.toFixed(1).replace(".", ",")} kg` : "-"} hint={formatShortDate(last?.date)} />
        <MiniStat label="Record" value={best?.maxWeight ? `${best.maxWeight.toFixed(1).replace(".", ",")} kg` : "-"} hint={best ? formatShortDate(best.date) : "n/d"} />
        <MiniStat label="Volume tot." value={`${formatCompactNumber(totalVolume)} kg`} hint="storico esercizio" />
        <MiniStat label="RPE medio" value={formatAverage(averageRpe)} hint="storico esercizio" />
      </section>

      <Card className="border-gym-accent/20">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gym-accent">Trend recente</p>
            <h2 className="mt-1 text-2xl font-black">{trend.label}</h2>
            <p className="text-sm text-gym-muted">Confronto tra le ultime due sessioni con peso numerico.</p>
          </div>
          <Trophy size={28} className={trend.direction === "up" ? "text-gym-accent" : "text-gym-muted"} />
        </div>
      </Card>

      <Card>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gym-accent">Andamento peso</p>
        <h2 className="mt-1 text-2xl font-black">Peso medio nel tempo</h2>
        <WeightLineChart entries={entries.slice(-10)} />
      </Card>

      <section className="space-y-3">
        <h2 className="text-xl font-black">Storico dettagliato</h2>
        {entries.slice().reverse().map((entry) => (
          <Card key={`${entry.sessionId}-${entry.date}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase text-gym-accent">{formatShortDate(entry.date)}</p>
                <p className="mt-1 text-lg font-black text-slate-100">{entry.repsLabel || "Reps non indicate"}</p>
                <p className="text-sm text-gym-muted">Volume stimato: {formatCompactNumber(entry.volume)} kg · RPE medio {formatAverage(entry.averageRpe)}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-black">{entry.averageWeight ? `${entry.averageWeight.toFixed(1).replace(".", ",")} kg` : "-"}</p>
                <p className="text-xs text-gym-muted">media</p>
              </div>
            </div>
            <Link href={`/history/${entry.sessionId}`} className="mt-3 inline-block rounded-2xl bg-white/10 px-3 py-2 text-xs font-bold text-slate-200">Apri sessione</Link>
          </Card>
        ))}
      </section>
    </div>
  );
}

function MiniStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="p-3">
      <p className="text-xs text-gym-muted">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-100">{value}</p>
      <p className="text-xs text-slate-500">{hint}</p>
    </Card>
  );
}

function WeightLineChart({ entries }: { entries: Array<{ date: string; averageWeight: number | null }> }) {
  const points = entries.filter((entry) => entry.averageWeight !== null) as Array<{ date: string; averageWeight: number }>;
  if (points.length < 2) {
    return <p className="mt-4 text-gym-muted">Servono almeno due sessioni con peso numerico.</p>;
  }

  const values = points.map((entry) => entry.averageWeight);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const svgPoints = points.map((entry, index) => {
    const x = points.length === 1 ? 160 : 20 + (index * 280) / (points.length - 1);
    const y = 130 - ((entry.averageWeight - min) * 100) / range;
    return { x, y, ...entry };
  });
  const polyline = svgPoints.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="mt-4 rounded-3xl bg-black/20 p-3">
      <svg viewBox="0 0 320 160" className="h-44 w-full" role="img" aria-label="Grafico peso esercizio">
        <line x1="20" y1="130" x2="300" y2="130" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
        <line x1="20" y1="30" x2="300" y2="30" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        <polyline points={polyline} fill="none" stroke="currentColor" strokeWidth="4" className="text-gym-accent" strokeLinecap="round" strokeLinejoin="round" />
        {svgPoints.map((point) => (
          <g key={`${point.date}-${point.x}`}>
            <circle cx={point.x} cy={point.y} r="5" fill="currentColor" className="text-gym-accent" />
            <text x={point.x} y={point.y - 10} textAnchor="middle" fontSize="10" fill="rgba(226,232,240,0.9)">{point.averageWeight.toFixed(0)}kg</text>
            <text x={point.x} y="150" textAnchor="middle" fontSize="9" fill="rgba(148,163,184,0.9)">{formatShortDate(point.date)}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
