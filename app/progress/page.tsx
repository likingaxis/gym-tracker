export const dynamic = "force-dynamic";

import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AlertTriangle, CalendarDays, ChevronRight, Clock3, Dumbbell, Target, Trophy, TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSelectedProfileId } from "@/lib/profiles";
import {
  buildExerciseProgress,
  buildMonthComparison,
  buildMuscleGroupSets,
  buildMuscleGroupVolume,
  buildProgressOverview,
  buildConsistencyStats,
  formatAverage,
  formatCompactNumber,
  formatDurationShort,
  formatShortDate,
  getAverageWorkoutDuration,
  getExerciseRecords,
  getExerciseTrend,
  getMuscleFrequency,
  getRecentImprovements,
  getStalledExercises,
  type SessionLike,
} from "@/lib/progress";

async function getProgressSessions(profileId: string) {
  try {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from("workout_sessions")
      .select("id, status, started_at, completed_at, workout_day_id, total_paused_seconds, workout_days(name), workout_plans(name, month), session_exercises(completed, exercises(name, exercise_db_id, muscle_group), exercise_sets(completed, reps, weight, rpe, set_number))")
      .eq("profile_id", profileId)
      .eq("status", "completed")
      .is("deleted_at", null)
      .order("started_at", { ascending: false })
      .limit(160);
    return (data ?? []) as SessionLike[];
  } catch {
    return [];
  }
}

export default async function ProgressPage() {
  const profileId = await getSelectedProfileId();
  if (!profileId) redirect("/profiles");

  const sessions = await getProgressSessions(profileId);
  const overview = buildProgressOverview(sessions);
  const comparison = buildMonthComparison(sessions);
  const consistency = buildConsistencyStats(sessions);
  const averageDuration = getAverageWorkoutDuration(sessions);
  const muscleFrequency = getMuscleFrequency(sessions);
  const muscleGroups = buildMuscleGroupSets(overview.sessionsThisMonth);
  const muscleVolume = buildMuscleGroupVolume(overview.sessionsThisMonth);
  const exercises = buildExerciseProgress(sessions);
  const improvements = getRecentImprovements(exercises);
  const records = getExerciseRecords(exercises);
  const stalledExercises = getStalledExercises(exercises);
  const topExercise = exercises.find((exercise) => exercise.entries.some((entry) => entry.averageWeight !== null));
  const latestExercises = exercises.filter((exercise) => exercise.entries.length > 0).slice(0, 8);
  const primaryImprovement = improvements[0];
  const primaryStall = stalledExercises[0];

  return (
    <div className="space-y-7">
      <header className="statistics-hero">
        <p className="technical-label text-gym-accent">Statistiche</p>
        <h1 className="mt-3 text-4xl font-extrabold leading-none">Rapporto tecnico</h1>
        <p className="mt-3 text-base text-gym-muted">Prestazioni, frequenza e carichi in un’unica vista.</p>
      </header>

      <section className={primaryImprovement ? "insight-hero insight-growth" : primaryStall ? "insight-hero insight-warning" : "insight-hero"}>
        {primaryImprovement ? (
          <>
            <span className="status-pill status-success"><TrendingUp size={13} /> In crescita</span>
            <h2 className="mt-4 text-3xl font-extrabold leading-none">{primaryImprovement.name}</h2>
            <p className="mt-3 text-lg font-bold text-gym-success">+{primaryImprovement.diff.toFixed(1).replace(".", ",")} kg dall’ultima sessione</p>
          </>
        ) : primaryStall ? (
          <>
            <span className="status-pill status-warning"><AlertTriangle size={13} /> Da monitorare</span>
            <h2 className="mt-4 text-3xl font-extrabold leading-none">{primaryStall.name}</h2>
            <p className="mt-3 text-base text-gym-muted">Carico stabile nelle ultime sessioni registrate.</p>
          </>
        ) : (
          <>
            <span className="status-pill">Dati insufficienti</span>
            <h2 className="mt-4 text-3xl font-extrabold leading-none">Registra i carichi</h2>
            <p className="mt-3 text-base text-gym-muted">Servono almeno tre sessioni comparabili.</p>
          </>
        )}
      </section>

      <section className="section-block">
        <p className="technical-label">Questa settimana</p>
        <div className="metric-grid mt-3">
          <Metric icon={<CalendarDays size={18} />} label="Giorni" value={`${consistency.trainingDaysThisWeek}`} hint="da lunedì" tone="blue" />
          <Metric icon={<Dumbbell size={18} />} label="Serie" value={`${overview.totalSetsThisWeek}`} hint="completate" tone="violet" />
          <Metric icon={<Clock3 size={18} />} label="Durata media" value={formatDurationShort(averageDuration.averageSeconds)} hint={averageDuration.sampleSize ? `${averageDuration.sampleSize} sessioni` : "nessun dato"} tone="orange" />
          <Metric icon={<Target size={18} />} label="Sessioni" value={`${overview.sessionsThisWeek.length}`} hint="da lunedì" tone="green" />
        </div>
      </section>

      <section className="section-block">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="technical-label">Frequenza</p>
            <h2 className="section-title">Gruppi allenati</h2>
          </div>
        </div>
        {muscleFrequency.length ? (
          <div className="mt-4 space-y-4">
            {muscleFrequency.slice(0, 6).map((item, index) => (
              <FrequencyRow key={item.group} label={item.group} value={item.days} max={Math.max(...muscleFrequency.map((entry) => entry.days), 1)} tone={index % 4} />
            ))}
          </div>
        ) : (
          <p className="mt-3 text-base text-gym-muted">Nessun allenamento completato questa settimana.</p>
        )}
      </section>

      <section className="section-block">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="technical-label">Esercizi</p>
            <h2 className="section-title">Andamento recente</h2>
          </div>
        </div>
        {latestExercises.length ? (
          <div className="technical-list mt-3">
            {latestExercises.map((exercise) => {
              const last = exercise.entries[exercise.entries.length - 1];
              const trend = getExerciseTrend(exercise.entries);
              return (
                <Link key={exercise.key} href={`/progress/exercise?key=${encodeURIComponent(exercise.key)}`} className="row-link px-0">
                  <span className={`trend-mark trend-${trend.direction}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-lg text-gym-soft">{exercise.name}</strong>
                    <span className="mt-1 block text-sm text-gym-muted">{formatShortDate(last?.date)} · {last?.repsLabel || "ripetizioni non registrate"}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <strong className="block text-lg text-gym-soft">{last?.averageWeight ? `${last.averageWeight.toFixed(1).replace(".", ",")} kg` : "-"}</strong>
                    <TrendLabel direction={trend.direction} label={trend.label} sessions={exercise.entries.length} />
                  </span>
                  <ChevronRight size={19} className="text-gym-muted" />
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={<Dumbbell size={20} />} title="Nessun esercizio" description="Completa una sessione per iniziare l’analisi." />
        )}
      </section>

      {records.length ? (
        <section className="section-block">
          <div className="flex items-center justify-between gap-3">
            <div><p className="technical-label">Record</p><h2 className="section-title">Migliori carichi</h2></div>
            <Trophy size={22} className="text-gym-warning" />
          </div>
          <div className="technical-list mt-3">
            {records.slice(0, 5).map((record) => (
              <Link key={record.key} href={`/progress/exercise?key=${encodeURIComponent(record.key)}`} className="row-link px-0">
                <span className="semantic-icon semantic-orange"><Trophy size={17} /></span>
                <span className="min-w-0 flex-1"><strong className="block truncate text-gym-soft">{record.name}</strong><span className="mt-1 block text-sm text-gym-muted">{record.sessions} sessioni</span></span>
                <strong className="text-lg text-gym-soft">{record.bestWeight ? `${record.bestWeight.toFixed(1).replace(".", ",")} kg` : "-"}</strong>
                <ChevronRight size={19} className="text-gym-muted" />
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {topExercise ? (
        <section className="section-block">
          <div className="flex items-start justify-between gap-3">
            <div><p className="technical-label">Miglior set comparabile</p><h2 className="section-title">{topExercise.name}</h2></div>
            <Link href={`/progress/exercise?key=${encodeURIComponent(topExercise.key)}`} className="secondary-button min-h-10 px-3 text-sm">Dettaglio</Link>
          </div>
          <WeightLineChart entries={topExercise.entries.slice(-8)} />
        </section>
      ) : null}

      <section className="section-block">
        <div><p className="technical-label">Distribuzione</p><h2 className="section-title">Volume muscolare</h2></div>
        {muscleVolume.length ? (
          <div className="mt-4 space-y-5">
            {muscleVolume.slice(0, 8).map((item, index) => (
              <div key={item.group}>
                <BarRow label={item.group} value={item.sets} max={muscleGroups[0]?.sets ?? item.sets} tone={index % 4} />
                <div className="mt-2 flex items-center justify-between text-sm text-gym-muted"><span>{formatCompactNumber(item.volume)} kg</span><span>RPE {formatAverage(item.averageRpe)}</span></div>
              </div>
            ))}
          </div>
        ) : <p className="mt-3 text-base text-gym-muted">Nessun dato mensile.</p>}
      </section>

      <section className="section-block">
        <p className="technical-label">Questo mese</p>
        <div className="metric-strip mt-3">
          <DeltaStat label="Allenamenti" value={comparison.currentMonthSessions.length} diff={comparison.sessionDiff} suffix="" />
          <DeltaStat label="Serie" value={comparison.currentSets} diff={comparison.setsDiff} suffix="" />
          <DeltaStat label="Volume" value={Math.round(comparison.currentVolume)} diff={Math.round(comparison.volumeDiff)} suffix=" kg" />
        </div>
      </section>
    </div>
  );
}

function Metric({ icon, label, value, hint, tone }: { icon: ReactNode; label: string; value: string; hint: string; tone: "blue" | "green" | "orange" | "violet" }) {
  return <div className={`metric-cell metric-${tone}`}><span className="metric-icon">{icon}</span><p className="mt-3 text-sm text-gym-muted">{label}</p><p className="mt-1 text-3xl font-extrabold leading-none text-gym-soft">{value}</p><p className="mt-2 text-sm text-gym-muted">{hint}</p></div>;
}

function FrequencyRow({ label, value, max, tone }: { label: string; value: number; max: number; tone: number }) {
  const width = Math.max(8, Math.round((value / max) * 100));
  return <div><div className="mb-2 flex items-center justify-between"><strong className="text-gym-soft">{label}</strong><span className="text-sm text-gym-muted">{value} giorn{value === 1 ? "o" : "i"}</span></div><div className="h-2 overflow-hidden rounded-full bg-gym-line"><div className={`h-full rounded-full bar-tone-${tone}`} style={{ width: `${width}%` }} /></div></div>;
}

function TrendLabel({ direction, label, sessions }: { direction: string; label: string; sessions: number }) {
  if (sessions < 3) return <span className="text-sm text-gym-muted">{sessions} session{sessions === 1 ? "e" : "i"}</span>;
  return <span className={direction === "up" ? "text-sm font-bold text-gym-success" : direction === "down" ? "text-sm font-bold text-gym-danger" : "text-sm font-bold text-gym-warning"}>{label}</span>;
}

function DeltaStat({ label, value, diff, suffix }: { label: string; value: number; diff: number; suffix: string }) {
  const displayDiff = `${diff > 0 ? "+" : ""}${new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 }).format(diff)}${suffix}`;
  return <div className="p-3 text-center"><p className="text-sm text-gym-muted">{label}</p><p className="mt-1 text-xl font-extrabold text-gym-soft">{formatCompactNumber(value)}{suffix}</p><p className={diff > 0 ? "mt-1 text-sm font-bold text-gym-success" : diff < 0 ? "mt-1 text-sm font-bold text-gym-warning" : "mt-1 text-sm text-gym-muted"}>{displayDiff}</p></div>;
}

function BarRow({ label, value, max, tone }: { label: string; value: number; max: number; tone: number }) {
  const width = max > 0 ? Math.max(8, Math.round((value / max) * 100)) : 0;
  return <div><div className="mb-2 flex items-center justify-between text-sm"><strong className="text-gym-soft">{label}</strong><span className="text-gym-muted">{value} serie</span></div><div className="h-2 overflow-hidden rounded-full bg-gym-line"><div className={`h-full rounded-full bar-tone-${tone}`} style={{ width: `${width}%` }} /></div></div>;
}

function WeightLineChart({ entries }: { entries: Array<{ date: string; averageWeight: number | null }> }) {
  const points = entries.filter((entry) => entry.averageWeight !== null) as Array<{ date: string; averageWeight: number }>;
  if (points.length < 2) return <p className="mt-4 text-gym-muted">Servono almeno due sessioni con peso.</p>;
  const values = points.map((entry) => entry.averageWeight);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const svgPoints = points.map((entry, index) => ({ x: points.length === 1 ? 160 : 20 + (index * 280) / (points.length - 1), y: 130 - ((entry.averageWeight - min) * 100) / range, ...entry }));
  const polyline = svgPoints.map((point) => `${point.x},${point.y}`).join(" ");
  return (
    <div className="chart-surface mt-4">
      <svg viewBox="0 0 320 160" className="h-44 w-full" role="img" aria-label="Andamento del peso">
        <line x1="20" y1="130" x2="300" y2="130" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
        <line x1="20" y1="30" x2="300" y2="30" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        <polyline points={polyline} fill="none" stroke="currentColor" strokeWidth="4" className="text-gym-accent" strokeLinecap="round" strokeLinejoin="round" />
        {svgPoints.map((point) => <g key={`${point.date}-${point.x}`}><circle cx={point.x} cy={point.y} r="5" fill="currentColor" className="text-gym-accent" /><text x={point.x} y={point.y - 10} textAnchor="middle" fontSize="10" fill="rgba(240,241,237,0.9)">{point.averageWeight.toFixed(0)}kg</text><text x={point.x} y="150" textAnchor="middle" fontSize="9" fill="rgba(169,176,173,0.9)">{formatShortDate(point.date)}</text></g>)}
      </svg>
    </div>
  );
}
