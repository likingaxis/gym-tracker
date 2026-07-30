"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Dumbbell, Target, Trophy, TrendingUp, TrendingDown, Flame } from "lucide-react";
import {
  buildExerciseProgress,
  buildMonthComparison,
  buildMuscleGroupSets,
  buildProgressOverview,
  formatCompactNumber,
  getAverageWorkoutDuration,
  getExerciseRecords,
  getRecentImprovements,
  getStalledExercises,
  getTrainingStreak,
  type SessionLike,
} from "@/lib/progress";

import {
  ActivityChartClient,
  DurationChartClient,
} from "@/components/progress/ProgressChartsClient";
import { BodyWeightChartClient } from "@/components/progress/BodyWeightChartClient";

import { PhysicalProfileCard } from "@/components/progress/PhysicalProfileCard";
import { MuscleDonutChart } from "@/components/progress/MuscleDonutChart";
import { RPEIntensityChart } from "@/components/progress/RPEIntensityChart";
import { ExpandableSparklinesList } from "@/components/progress/ExpandableSparklinesList";
import { getProgressSessions, getProfileData, getBodyWeightLogs } from "@/lib/api-client/progress";

export default function ProgressPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionLike[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [weightLogs, setWeightLogs] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      const profileId = localStorage.getItem("active_profile_id");
      if (!profileId) {
        router.push("/profiles");
        return;
      }

      const [sessData, profData, rawWeightLogs] = await Promise.all([
        getProgressSessions(profileId),
        getProfileData(profileId),
        getBodyWeightLogs(profileId),
      ]);

      setSessions(sessData as SessionLike[]);
      setProfile(profData);

      let logs = rawWeightLogs;
      if (logs.length === 0 && profData?.weight_kg) {
        logs = [{
          weight: profData.weight_kg,
          date: new Date().toISOString(),
        }];
      }
      setWeightLogs(logs);
      setLoading(false);
    }

    loadData();
  }, [router]);

  if (loading) {
    return <div className="p-6 text-center text-gym-muted">Caricamento progressi...</div>;
  }

  const overview = buildProgressOverview(sessions);
  const comparison = buildMonthComparison(sessions);
  const averageDuration = getAverageWorkoutDuration(sessions);
  const consistency = getTrainingStreak(sessions);
  const muscleSets = buildMuscleGroupSets(overview.sessionsThisMonth);
  const exercises = buildExerciseProgress(sessions);
  const improvements = getRecentImprovements(exercises);
  const records = getExerciseRecords(exercises);
  const stalledExercises = getStalledExercises(exercises);
  const primaryImprovement = improvements[0];
  const primaryStall = stalledExercises[0];

  const avgDurationMins = Math.round((averageDuration.averageSeconds ?? 0) / 60);

  function formatDuration(minutes: number): { value: number | string; suffix: string } {
    if (minutes < 60) return { value: minutes, suffix: " m" };
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (m === 0) return { value: h, suffix: " h" };
    return { value: `${h}h ${m}`, suffix: "m" };
  }

  const avgDurationFormatted = formatDuration(avgDurationMins);

  return (
    <div className="pb-12 space-y-7">
      {/* HEADER & HERO DASHBOARD */}
      <header className="app-hero">
        <p className="technical-label text-gym-accent">Statistiche</p>
        <h1 className="mt-3 text-4xl font-extrabold leading-none text-white">Rapporto tecnico</h1>
        <p className="mt-3 text-base text-white/65">Analisi avanzata e oggettiva dei tuoi allenamenti.</p>
      </header>

      {/* DATI FISICI E BMI */}
      <PhysicalProfileCard profile={profile} />

      {/* GRAFICO ANDAMENTO PESO CORPOREO */}
      {weightLogs.length > 0 && (
        <BodyWeightChartClient logs={weightLogs} />
      )}

      {/* DASHBOARD PANORAMICA MESE CORRENTE */}
      <section className="px-4">
        <div className="grid grid-cols-3 gap-3">
          <DeltaCard label="Workout" value={comparison.currentMonthSessions.length} diff={comparison.sessionDiff} suffix="" />
          <DeltaCard label="Costanza" value={consistency.currentStreak} diff={null} suffix=" gg" />
          <DeltaCard label="Durata Media" value={avgDurationFormatted.value} diff={null} suffix={avgDurationFormatted.suffix} />
        </div>
      </section>

      {/* GRAFICO VOLUME MUSCOLARE */}
      <MuscleDonutChart data={muscleSets} />

      {/* NUOVO GRAFICO RPE E QUALITÀ DELLO SFORZO */}
      <RPEIntensityChart sessions={sessions} />

      {/* ATTIVITA' CHART - SERIE COMPLETATE CON ANIMAZIONI E ASSI */}
      <ActivityChartClient sessions={sessions} />
      
      {/* TEMPO DI ALLENAMENTO CHART CON ANIMAZIONI E ASSI */}
      <DurationChartClient sessions={sessions} />

      {/* INSIGHT FOCUS */}
      <section className="px-4">
        {primaryImprovement ? (
          <div className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-gym-success/15 to-[#050708] border border-gym-success/20 p-5 shadow-[0_0_30px_rgba(16,185,129,0.05)]">
            <div className="absolute -right-4 -top-4 opacity-[0.06] text-gym-success">
               <TrendingUp size={120} />
            </div>
            <div className="relative z-10">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gym-success/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gym-success shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                <Flame size={12} /> Record Battuto
              </span>
              <h2 className="mt-3 line-clamp-1 text-2xl font-black text-white">{primaryImprovement.name}</h2>
              <p className="mt-1 text-sm font-bold text-gym-success leading-snug">
                Hai sollevato un carico massimo di <strong className="text-base text-white">+{primaryImprovement.diff.toFixed(1).replace(".", ",")} kg</strong> in più rispetto alla sessione precedente!
              </p>
            </div>
          </div>
        ) : primaryStall ? (
          <div className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-gym-warning/15 to-[#050708] border border-gym-warning/20 p-5 shadow-[0_0_30px_rgba(245,158,11,0.05)]">
            <div className="absolute -right-4 -top-4 opacity-[0.06] text-gym-warning">
               <AlertTriangle size={120} />
            </div>
            <div className="relative z-10">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gym-warning/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gym-warning shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                <Target size={12} /> Da monitorare
              </span>
              <h2 className="mt-3 line-clamp-1 text-2xl font-black text-white">{primaryStall.name}</h2>
              <p className="mt-1 text-sm font-bold text-gym-warning leading-snug">
                I massimali sono fermi. Potresti aver raggiunto uno stallo, prova a variare schema serie o aumentare il recupero.
              </p>
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-white/5 to-[#050708] border border-white/10 p-5">
            <div className="relative z-10">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gym-muted">
                <Dumbbell size={12} /> Dati in elaborazione
              </span>
              <h2 className="mt-3 line-clamp-1 text-xl font-black text-white">Continua ad allenarti</h2>
              <p className="mt-1 text-sm font-bold text-gym-muted">
                Servono almeno 3 sessioni per elaborare i trend massimali.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* RECORD CAROUSEL */}
      {records.length > 0 && (
        <section>
          <div className="px-5 mb-4 flex items-center justify-between">
            <h2 className="text-xl font-black text-white">I tuoi Record</h2>
            <Trophy size={18} className="text-gym-warning" />
          </div>
          <div className="flex gap-4 overflow-x-auto px-5 pb-4 snap-x hide-scrollbar">
            {records.slice(0, 8).map((record) => (
              <Link key={record.key} href={`/progress/exercise?key=${encodeURIComponent(record.key)}`} className="snap-start shrink-0 w-[160px] rounded-[1.25rem] border border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent p-4 shadow-inner transition active:scale-95">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gym-warning/15 text-gym-warning shadow-inner">
                  <Trophy size={14} />
                </span>
                <p className="mt-3 truncate text-xs font-bold text-slate-400">{record.name}</p>
                <div className="mt-1 flex items-baseline gap-1">
                  <p className="text-2xl font-black text-white">{record.bestWeight ? `${record.bestWeight.toFixed(1).replace(".", ",")} kg` : "-"}</p>
                </div>
                {record.bestReps && record.bestWeight && (
                  <p className="mt-0.5 text-xs font-bold text-gym-muted">Per {record.bestReps} ripetizioni</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* TREND ESERCIZI (ESPANDIBILE CON SOSPENSIONE OPACA) */}
      <ExpandableSparklinesList exercises={exercises} />

    </div>
  );
}

// ---- SOTTO-COMPONENTI ----

function DeltaCard({ label, value, diff, suffix }: { label: string; value: number | string; diff: number | null; suffix: string }) {
  const displayDiff = diff !== null ? `${diff > 0 ? "+" : ""}${new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 }).format(diff)}${suffix}` : "";
  
  return (
    <div className="relative overflow-hidden flex flex-col items-center justify-center rounded-[1.25rem] border border-[#c65f37]/25 bg-gradient-to-br from-[#c65f37]/[0.09] via-white/[0.02] to-transparent p-3 text-center shadow-[0_4px_20px_rgba(198,95,55,0.06)] backdrop-blur-md">
      <div className="absolute -top-4 -right-4 h-16 w-16 rounded-full bg-gradient-to-bl from-[#c65f37]/30 to-transparent blur-xl pointer-events-none" />
      <div className="relative z-10">
        <p className="text-[9px] font-black uppercase tracking-widest text-[#c65f37]/80">{label}</p>
        <p className="mt-1 text-2xl font-black text-white tracking-tight">{typeof value === "number" ? formatCompactNumber(value) : value}{suffix}</p>
        {diff !== null && (
          <div className={`mt-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase ${diff > 0 ? "bg-gym-success/15 text-gym-success" : diff < 0 ? "bg-gym-warning/15 text-gym-warning" : "bg-white/5 text-gym-muted"}`}>
            {diff > 0 ? <TrendingUp size={10} strokeWidth={3} /> : diff < 0 ? <TrendingDown size={10} strokeWidth={3} /> : <Target size={10} strokeWidth={3} />}
            {displayDiff}
          </div>
        )}
      </div>
    </div>
  );
}
