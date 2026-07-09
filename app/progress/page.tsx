export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, CalendarDays, Dumbbell, Flame, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
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
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-gym-accent">Progressi</p>
        <h1 className="mt-2 text-4xl font-black">Analisi allenamenti</h1>
        <p className="mt-2 text-gym-muted">Trend, gruppi muscolari, carichi migliori e confronto mese su mese.</p>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <StatCard icon={<CalendarDays size={18} />} label="Allenamenti" value={`${overview.sessionsThisWeek.length}`} hint="ultimi 7 giorni" />
        <StatCard icon={<Dumbbell size={18} />} label="Serie" value={`${overview.totalSetsThisWeek}`} hint="ultimi 7 giorni" />
        <StatCard icon={<Activity size={18} />} label="Volume" value={`${formatCompactNumber(overview.totalVolumeThisMonth)} kg`} hint="mese corrente" />
        <StatCard icon={<Flame size={18} />} label="Streak" value={`${streak.currentStreak}`} hint="giorni consecutivi" />
      </section>

      <Card className="border-gym-accent/20">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gym-accent">Confronto mese</p>
            <h2 className="mt-1 text-2xl font-black">Questo mese vs precedente</h2>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">live</span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <DeltaStat label="Allenamenti" value={comparison.currentMonthSessions.length} diff={comparison.sessionDiff} suffix="" />
          <DeltaStat label="Serie" value={comparison.currentSets} diff={comparison.setsDiff} suffix="" />
          <DeltaStat label="Volume" value={Math.round(comparison.currentVolume)} diff={Math.round(comparison.volumeDiff)} suffix=" kg" />
        </div>
      </Card>

      {topExercise ? (
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gym-accent">Grafico carico</p>
              <h2 className="mt-1 text-2xl font-black">{topExercise.name}</h2>
              <p className="text-sm text-gym-muted">Peso medio registrato nelle ultime sessioni.</p>
            </div>
            <Link href={`/progress/exercise?key=${encodeURIComponent(topExercise.key)}`} className="rounded-2xl bg-white/10 px-3 py-2 text-xs font-bold text-slate-200">Dettaglio</Link>
          </div>
          <WeightLineChart entries={topExercise.entries.slice(-8)} />
        </Card>
      ) : (
        <Card>
          <h2 className="text-xl font-black">Ancora nessun grafico</h2>
          <p className="mt-2 text-gym-muted">Completa qualche allenamento con pesi numerici per vedere l’andamento.</p>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gym-accent">Gruppi muscolari</p>
            <h2 className="mt-1 text-2xl font-black">Distribuzione del mese</h2>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">serie + volume</span>
        </div>
        {muscleVolume.length ? (
          <div className="mt-4 space-y-3">
            {muscleVolume.slice(0, 8).map((item) => (
              <div key={item.group} className="rounded-2xl bg-black/20 p-3">
                <BarRow label={item.group} value={item.sets} max={muscleGroups[0]?.sets ?? item.sets} />
                <div className="mt-2 flex items-center justify-between text-xs text-gym-muted">
                  <span>Volume stimato: {formatCompactNumber(item.volume)} kg</span>
                  <span>RPE medio: {formatAverage(item.averageRpe)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-gym-muted">Nessun gruppo muscolare registrato questo mese.</p>
        )}
      </Card>

      <Card>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gym-accent">Miglioramenti recenti</p>
        <h2 className="mt-1 text-2xl font-black">Carichi in crescita</h2>
        {improvements.length ? (
          <div className="mt-4 space-y-2">
            {improvements.map((item) => (
              <div key={item.name} className="rounded-2xl bg-black/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-100">{item.name}</p>
                    <p className="text-xs text-gym-muted">{item.muscleGroup}</p>
                  </div>
                  <p className="rounded-full bg-gym-accent/20 px-3 py-1 text-sm font-black text-gym-accent">+{item.diff.toFixed(1).replace(".", ",")} kg</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-gym-muted">Quando aumenti il peso medio rispetto alla volta precedente, lo vedrai qui.</p>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gym-accent">Record esercizi</p>
            <h2 className="mt-1 text-2xl font-black">Migliori carichi</h2>
          </div>
          <TrendingUp size={22} className="text-gym-accent" />
        </div>
        {records.length ? (
          <div className="mt-4 space-y-2">
            {records.slice(0, 6).map((record) => (
              <Link key={record.key} href={`/progress/exercise?key=${encodeURIComponent(record.key)}`} className="block rounded-2xl bg-black/20 p-3 transition active:scale-[0.99]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-100">{record.name}</p>
                    <p className="text-xs text-gym-muted">{record.muscleGroup} · {record.sessions} sessioni</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-slate-100">{record.bestWeight ? `${record.bestWeight.toFixed(1).replace(".", ",")} kg` : "-"}</p>
                    <p className={record.trend.direction === "up" ? "text-xs font-bold text-gym-accent" : "text-xs text-gym-muted"}>{record.trend.label}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-gym-muted">I record compariranno quando registri pesi numerici.</p>
        )}
      </Card>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black">Ultimi esercizi tracciati</h2>
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
                    <p className="text-xs uppercase text-gym-accent">{exercise.muscleGroup}</p>
                    <h3 className="text-xl font-black">{exercise.name}</h3>
                    <p className="mt-1 text-sm text-gym-muted">Ultima volta: {formatShortDate(last?.date)} · {last?.repsLabel || "reps n/d"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black">{last?.averageWeight ? `${last.averageWeight.toFixed(1).replace(".", ",")} kg` : "-"}</p>
                    <p className={trend.direction === "up" ? "text-xs font-bold text-gym-accent" : "text-xs text-gym-muted"}>{trend.label}</p>
                  </div>
                </div>
              </Card>
            </Link>
          );
        }) : (
          <Card>
            <p className="text-gym-muted">Completa qualche allenamento per popolare questa sezione.</p>
          </Card>
        )}
      </section>
    </div>
  );
}

function StatCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) {
  return (
    <Card className="p-3">
      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-2xl bg-gym-accent/15 text-gym-accent">{icon}</div>
      <p className="text-xs text-gym-muted">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-100">{value}</p>
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
      <p className="mt-1 text-lg font-black text-slate-100">{formatCompactNumber(value)}{suffix}</p>
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
