"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Zap, Activity, Flame, ShieldAlert, Sparkles } from "lucide-react";
import type { SessionLike } from "@/lib/progress";

export function RPEIntensityChart({ sessions }: { sessions: SessionLike[] }) {
  const rpeStats = useMemo(() => {
    let failureCount = 0; // 9.5 - 10
    let optimalCount = 0; // 7.5 - 9
    let moderateCount = 0; // 6 - 7
    let warmupCount = 0; // < 6
    let totalRpeSum = 0;
    let totalRpeSets = 0;

    sessions.forEach((s) => {
      (s.session_exercises ?? []).forEach((se) => {
        (se.exercise_sets ?? []).forEach((set) => {
          if (!set.completed) return;
          const rpe = set.rpe !== null && set.rpe !== undefined ? Number(set.rpe) : null;
          if (rpe !== null && !isNaN(rpe) && rpe > 0) {
            totalRpeSum += rpe;
            totalRpeSets++;

            if (rpe >= 9.5) failureCount++;
            else if (rpe >= 7.5) optimalCount++;
            else if (rpe >= 6) moderateCount++;
            else warmupCount++;
          }
        });
      });
    });

    if (totalRpeSets === 0) return null;

    const avgRpe = totalRpeSum / totalRpeSets;
    const failurePerc = Math.round((failureCount / totalRpeSets) * 100);
    const optimalPerc = Math.round((optimalCount / totalRpeSets) * 100);
    const moderatePerc = Math.round((moderateCount / totalRpeSets) * 100);
    const warmupPerc = Math.round((warmupCount / totalRpeSets) * 100);

    return {
      avgRpe,
      totalRpeSets,
      failureCount,
      optimalCount,
      moderateCount,
      warmupCount,
      failurePerc,
      optimalPerc,
      moderatePerc,
      warmupPerc,
    };
  }, [sessions]);

  if (!rpeStats) {
    return (
      <div className="px-4">
        <div className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] p-5 text-center">
          <Zap className="mx-auto mb-2 text-gym-muted" size={20} />
          <p className="text-xs font-bold text-gym-muted">Inserisci l&apos;RPE nelle tue serie per sbloccare l&apos;analisi di intensità.</p>
        </div>
      </div>
    );
  }

  // Determine feedback message
  let feedback = {
    title: "Gestione Sforzo Ottimale",
    desc: "Il tuo sforzo è ben bilanciato tra serie di accumulo e stimolo ipertrofico.",
    color: "text-gym-success",
    bgColor: "bg-gym-success/10 border-gym-success/20",
    icon: Sparkles,
  };

  if (rpeStats.failurePerc >= 40) {
    feedback = {
      title: "Alta Fatica Accumulata",
      desc: "Oltre il 40% delle serie è stato portato a cedimento assoluto (RPE 9.5-10). Attenzione al recupero del SNC!",
      color: "text-red-400",
      bgColor: "bg-red-500/10 border-red-500/20",
      icon: ShieldAlert,
    };
  } else if (rpeStats.optimalPerc >= 45) {
    feedback = {
      title: "Zona Ipertrofica Perfetta",
      desc: "La maggior parte delle tue serie è nel range ideale (RPE 7.5-9) per massimizzare la crescita riducendo il rischio infortuni.",
      color: "text-gym-accent",
      bgColor: "bg-gym-accent/10 border-gym-accent/20",
      icon: Flame,
    };
  } else if (rpeStats.warmupPerc + rpeStats.moderatePerc >= 60) {
    feedback = {
      title: "Intensità da Incrementare",
      desc: "Molte serie sono sotto l'RPE 7. prova ad avvicinarti di più al limite sulle ultime 1-2 serie di ogni esercizio.",
      color: "text-amber-400",
      bgColor: "bg-amber-500/10 border-amber-500/20",
      icon: Activity,
    };
  }

  const FeedbackIcon = feedback.icon;

  return (
    <div className="px-4">
      <div className="rounded-[1.75rem] border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-5 shadow-2xl backdrop-blur-xl">
        <header className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Zap size={15} className="text-gym-accent" /> Qualità dello Sforzo (RPE)
            </h3>
            <p className="mt-0.5 text-[10px] font-semibold text-gym-muted">Distribuzione intensità su {rpeStats.totalRpeSets} serie registrate</p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-white tracking-tight">{rpeStats.avgRpe.toFixed(1)}</span>
            <span className="block text-[9px] font-bold text-gym-muted uppercase">RPE Medio</span>
          </div>
        </header>

        {/* Multi-segment Stacked Bar */}
        <div className="h-4 w-full rounded-full bg-black/40 overflow-hidden flex p-0.5 gap-0.5 border border-white/5 shadow-inner">
          {rpeStats.failurePerc > 0 && (
            <motion.div
              style={{ width: `${rpeStats.failurePerc}%` }}
              initial={{ width: "0%" }}
              whileInView={{ width: `${rpeStats.failurePerc}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="h-full rounded-l-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
            />
          )}
          {rpeStats.optimalPerc > 0 && (
            <motion.div
              style={{ width: `${rpeStats.optimalPerc}%` }}
              initial={{ width: "0%" }}
              whileInView={{ width: `${rpeStats.optimalPerc}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="h-full bg-gym-accent shadow-[0_0_8px_rgba(198,95,55,0.5)]"
            />
          )}
          {rpeStats.moderatePerc > 0 && (
            <motion.div
              style={{ width: `${rpeStats.moderatePerc}%` }}
              initial={{ width: "0%" }}
              whileInView={{ width: `${rpeStats.moderatePerc}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="h-full bg-emerald-500"
            />
          )}
          {rpeStats.warmupPerc > 0 && (
            <motion.div
              style={{ width: `${rpeStats.warmupPerc}%` }}
              initial={{ width: "0%" }}
              whileInView={{ width: `${rpeStats.warmupPerc}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="h-full rounded-r-full bg-blue-500"
            />
          )}
        </div>

        {/* Legend Cards */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500 shrink-0" />
              <div>
                <p className="text-[10px] font-black text-white uppercase">Cedimento</p>
                <p className="text-[9px] font-bold text-gym-muted">RPE 9.5 - 10</p>
              </div>
            </div>
            <span className="text-xs font-black text-white">{rpeStats.failurePerc}%</span>
          </div>

          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-gym-accent shrink-0" />
              <div>
                <p className="text-[10px] font-black text-white uppercase">Ipertrofico</p>
                <p className="text-[9px] font-bold text-gym-muted">RPE 7.5 - 9</p>
              </div>
            </div>
            <span className="text-xs font-black text-white">{rpeStats.optimalPerc}%</span>
          </div>

          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
              <div>
                <p className="text-[10px] font-black text-white uppercase">Accumulo</p>
                <p className="text-[9px] font-bold text-gym-muted">RPE 6 - 7</p>
              </div>
            </div>
            <span className="text-xs font-black text-white">{rpeStats.moderatePerc}%</span>
          </div>

          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shrink-0" />
              <div>
                <p className="text-[10px] font-black text-white uppercase">Leggero</p>
                <p className="text-[9px] font-bold text-gym-muted">RPE &lt; 6</p>
              </div>
            </div>
            <span className="text-xs font-black text-white">{rpeStats.warmupPerc}%</span>
          </div>
        </div>

        {/* Coach Insight Banner */}
        <div className={`mt-4 rounded-xl border p-3 flex items-start gap-2.5 ${feedback.bgColor}`}>
          <FeedbackIcon size={16} className={`shrink-0 mt-0.5 ${feedback.color}`} />
          <div>
            <h4 className={`text-xs font-black uppercase ${feedback.color}`}>{feedback.title}</h4>
            <p className="mt-0.5 text-[11px] font-medium text-white/80 leading-snug">{feedback.desc}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
