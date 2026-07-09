export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, BarChart3, CalendarDays, Dumbbell, Flame, Trophy, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSelectedProfileId } from "@/lib/profiles";
import {
  buildExerciseProgress,
  buildMonthComparison,
  buildMuscleGroupSets,
  buildMuscleGroupVolume,
  buildProgressOverview,
  formatAverage,
  formatCompactNumber,
  formatShortDate,
  getExerciseRecords,
  getExerciseTrend,
  getRecentImprovements,
  getTrainingStreak,
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
  const streak = getTrainingStreak(sessions);
  const muscleGroups = buildMuscleGroupSets(overview.sessionsThisMonth);
  const muscleVolume = buildMuscleGroupVolume(overview.sessionsThisMonth);
  const exercises = buildExerciseProgress(sessions);
  const improvements = getRecentImprovements(exercises);
  const records = getExerciseRecords(exercises);
  const topExercise = exercises.find((exercise) => exercise.entries.some((entry) => entry.averageWeight !== null));
  const latestExercises = exercises
    .filter((exercise) => exercise.entries.length > 0)
    .slice(0, 8);

  return (
    <div className="space-y-5">
      <header className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-gym-card via-gym-panel to-black p-5 shadow-sm">
        <p className="text-sm font-semibold text-gym-info">Progressi</p>
        <h1 className="mt-2 text-3xl font-extrabold">I tuoi miglioramenti</h1>
        <p className="mt-2 text-gym-muted">Carichi, serie e volume.</p>
      </header>

      <Card variant={improvements.length ? "primary" : "subtle"}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gym-info">In crescita</p>
            {improvements.length ? (
              <h2 className="mt-2 text-2xl font-extrabold">{improvements[0].name} +{improvements[0].diff.toFixed(1).replace(".", ",")} kg</h2>
            ) : (
              <h2 className="mt-2 text-2xl font-extrabold">Ancora pochi dati</h2>
            )}
            <p className="mt-2 text-sm text-gym-muted">
              {improvements.length
                ? "Dall’ultima volta"
                : "Registra qualche kg per vedere i trend."}
            </p>
          </div>
          <TrendingUp size={24} className={improvements.length ? "text-gym-accent" : "text-gym-muted"} />
        </div>
        {improvements.length > 1 ? (
          <div className="mt-4 space-y-2">
            {improvements.slice(1, 3).map((item) => (
              <div key={item.name} className="flex items-center justify-between gap-3 rounded-2xl bg-black/20 p-3 text-sm">
                <span className="line-clamp-1 font-bold text-slate-100">{item.name}</span>
                <span className="shrink-0 rounded-full bg-gym-accent/20 px-3 py-1 font-extrabold text-gym-accent">+{item.diff.toFixed(1).replace(".", ",")} kg</span>
              </div>
            ))}
          </div>
        ) : null}
      </Card>

      <section className="grid grid-cols-2 gap-3">
        <StatCard icon={<CalendarDays size={18} />} label="Allenamenti" value={`${overview.sessionsThisWeek.length}`} hint="7 giorni" />
        <StatCard icon={<Dumbbell size={18} />} label="Serie" value={`${overview.totalSetsThisWeek}`} hint="7 giorni" />
        <StatCard icon={<Activity size={18} />} label="Volume" value={`${formatCompactNumber(overview.totalVolumeThisMonth)} kg`} hint="mese corrente" />
        <StatCard icon={<Flame size={18} />} label="Streak" value={`${streak.currentStreak}`} hint="giorni consecutivi" />
      </section>

      {records.length ? (
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gym-info">Record</p>
              <h2 className="mt-1 text-2xl font-extrabold">Migliori carichi</h2>
            </div>
            <Trophy size={22} className="text-gym-accent" />
          </div>
          <div className="mt-4 space-y-2">
            {records.slice(0, 5).map((record) => (
              <Link key={record.key} href={`/progress/exercise?key=${encodeURIComponent(record.key)}`} className="block rounded-2xl bg-black/20 p-3 transition active:scale-[0.99]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-extrabold text-slate-100">{record.name}</p>
                    <p className="text-xs text-gym-muted">{record.muscleGroup} · {record.sessions} sessioni</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-extrabold text-slate-100">{record.bestWeight ? `${record.bestWeight.toFixed(1).replace(".", ",")} kg` : "-"}</p>
                    <p className={record.trend.direction === "up" ? "text-xs font-bold text-gym-accent" : "text-xs text-gym-muted"}>{record.trend.label}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      ) : null}

      {topExercise ? (
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gym-info">Grafico</p>
              <h2 className="mt-1 text-2xl font-extrabold">{topExercise.name}</h2>
              <p className="text-sm text-gym-muted">Peso medio nelle ultime sessioni.</p>
            </div>
            <Link href={`/progress/exercise?key=${encodeURIComponent(topExercise.key)}`} className="rounded-2xl bg-white/10 px-3 py-2 text-xs font-bold text-slate-200">Dettaglio</Link>
          </div>
          <WeightLineChart entries={topExercise.entries.slice(-8)} />
        </Card>
      ) : (
        <EmptyState
          icon={<BarChart3 size={20} />}
          title="Ancora pochi dati"
          description="Registra qualche kg per vedere l’andamento."
        />
      )}

      <Card className="border-gym-info/20">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gym-info">Questo mese</p>
            <h2 className="mt-1 text-2xl font-extrabold">Confronto mese</h2>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <DeltaStat label="Allenamenti" value={comparison.currentMonthSessions.length} diff={comparison.sessionDiff} suffix="" />
          <DeltaStat label="Serie" value={comparison.currentSets} diff={comparison.setsDiff} suffix="" />
          <DeltaStat label="Volume" value={Math.round(comparison.currentVolume)} diff={Math.round(comparison.volumeDiff)} suffix=" kg" />
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gym-info">Gruppi</p>
            <h2 className="mt-1 text-2xl font-extrabold">Distribuzione</h2>
          </div>
        </div>
        {muscleVolume.length ? (
          <div className="mt-4 space-y-3">
            {muscleVolume.slice(0, 8).map((item) => (
              <div key={item.group} className="rounded-2xl bg-black/20 p-3">
                <BarRow label={item.group} value={item.sets} max={muscleGroups[0]?.sets ?? item.sets} />
                <div className="mt-2 flex items-center justify-between text-xs text-gym-muted">
                  <span>{formatCompactNumber(item.volume)} kg</span>
                  <span>RPE {formatAverage(item.averageRpe)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-gym-muted">I gruppi appariranno dopo qualche allenamento.</p>
        )}
      </Card>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold">Ultimi esercizi</h2>
          <Link href="/history" className="text-sm font-bold text-gym-accent">Storico</Link>
        </div>
        {latestExercises.length ? latestExercises.map((exercise) => {
          const last = exercise.entries[exercise.entries.length - 1];
          const trend = getExerciseTrend(exercise.entries);
          return (
            <Link key={exercise.key} href={`/progress/exercise?key=${encodeURIComponent(exercise.key)}`} className="block">
              <Card className="transition active:scale-[0.99]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-gym-muted">{exercise.muscleGroup}</p>
                    <h3 className="text-xl font-extrabold">{exercise.name}</h3>
                    <p className="mt-1 text-sm text-gym-muted">Ultima volta {formatShortDate(last?.date)} · {last?.repsLabel || "reps n/d"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-extrabold">{last?.averageWeight ? `${last.averageWeight.toFixed(1).replace(".", ",")} kg` : "-"}</p>
                    <p className={trend.direction === "up" ? "text-xs font-bold text-gym-accent" : "text-xs text-gym-muted"}>{trend.label}</p>
                  </div>
                </div>
              </Card>
            </Link>
          );
        }) : (
          <Card>
            <p className="text-gym-muted">Completa qualche allenamento per vedere gli esercizi recenti.</p>
          </Card>
        )}
      </section>
    </div>
  );
}

function StatCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) {
  return (
    <Card className="p-3">
      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-2xl bg-gym-info/15 text-gym-info">{icon}</div>
      <p className="text-xs text-gym-muted">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-slate-100">{value}</p>
      <p className="text-xs text-slate-500">{hint}</p>
    </Card>
  );
}

function DeltaStat({ label, value, diff, suffix }: { label: string; value: number; diff: number; suffix: string }) {
  const positive = diff > 0;
  const neutral = diff === 0;
  const displayDiff = `${diff > 0 ? "+" : ""}${new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 }).format(diff)}${suffix}`;
  return (
    <div className="rounded-2xl bg-black/20 p-3">
      <p className="text-gym-muted">{label}</p>
      <p className="mt-1 text-lg font-extrabold text-slate-100">{formatCompactNumber(value)}{suffix}</p>
      <p className={positive ? "text-xs font-bold text-gym-accent" : neutral ? "text-xs text-gym-muted" : "text-xs font-bold text-amber-200"}>
        {displayDiff}
      </p>
    </div>
  );
}

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const width = max > 0 ? Math.max(8, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-bold text-slate-200">{label}</span>
        <span className="text-gym-muted">{value} serie</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gym-accent" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function WeightLineChart({ entries }: { entries: Array<{ date: string; averageWeight: number | null }> }) {
  const points = entries.filter((entry) => entry.averageWeight !== null) as Array<{ date: string; averageWeight: number }>;
  if (points.length < 2) {
    return <p className="mt-4 text-gym-muted">Servono almeno due sessioni con peso numerico per disegnare il grafico.</p>;
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
