"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, Target, ChevronDown, ChevronUp, Activity } from "lucide-react";
import { SparklineClient } from "@/components/progress/ProgressChartsClient";
import { getExerciseTrend } from "@/lib/progress";

type ExerciseItem = {
  key: string;
  name: string;
  entries: Array<{ maxWeight: number | null }>;
};

function TrendIcon({ direction }: { direction: string }) {
  if (direction === "up") return <TrendingUp size={14} className="text-gym-success" />;
  if (direction === "down") return <TrendingDown size={14} className="text-gym-danger" />;
  return <Target size={14} className="text-gym-warning" />;
}

export function ExpandableSparklinesList({ exercises }: { exercises: ExerciseItem[] }) {
  const [expanded, setExpanded] = useState(false);

  if (!exercises || exercises.length === 0) return null;

  const visibleCount = 4;
  const initialExercises = exercises.slice(0, visibleCount);
  const extraExercises = exercises.slice(visibleCount);
  const hasMore = extraExercises.length > 0;

  return (
    <section className="px-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Activity size={18} className="text-gym-accent" /> Tracciato Forza (Carico Max)
          </h2>
          <p className="mt-0.5 text-xs font-bold text-gym-muted">Esercizi ordinati per progresso recente</p>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-gym-muted bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
          {exercises.length} Esercizi
        </span>
      </div>

      <div className="relative">
        {/* Always Visible Top 4 Exercises */}
        <div className="space-y-3">
          {initialExercises.map((exercise) => {
            const entriesWithMax = exercise.entries.filter((e) => e.maxWeight !== null);
            const last = entriesWithMax[entriesWithMax.length - 1];
            const trend = getExerciseTrend(exercise.entries);

            return (
              <Link
                key={exercise.key}
                href={`/progress/exercise?key=${encodeURIComponent(exercise.key)}`}
                className="flex items-center gap-4 rounded-[1.25rem] border border-white/5 bg-[#050708] p-4 shadow-inner transition active:scale-[0.98] hover:border-white/10 hover:bg-white/[0.02]"
              >
                <div className="min-w-0 flex-1">
                  <strong className="block truncate text-base font-extrabold text-white">{exercise.name}</strong>
                  <span className="mt-1 flex items-center gap-1.5 text-xs font-bold text-gym-muted">
                    <TrendIcon direction={trend.direction} /> {last?.maxWeight ? `${last.maxWeight.toFixed(1).replace(".", ",")} kg` : "-"}
                  </span>
                </div>
                <div className="w-20 shrink-0">
                  <SparklineClient entries={exercise.entries} direction={trend.direction} />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Collapsible Accordion Wrapper for Extra Exercises */}
        {hasMore && (
          <motion.div
            initial={false}
            animate={{
              height: expanded ? "auto" : 0,
              opacity: expanded ? 1 : 0,
            }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-3 pt-3">
              {extraExercises.map((exercise) => {
                const entriesWithMax = exercise.entries.filter((e) => e.maxWeight !== null);
                const last = entriesWithMax[entriesWithMax.length - 1];
                const trend = getExerciseTrend(exercise.entries);

                return (
                  <Link
                    key={exercise.key}
                    href={`/progress/exercise?key=${encodeURIComponent(exercise.key)}`}
                    className="flex items-center gap-4 rounded-[1.25rem] border border-white/5 bg-[#050708] p-4 shadow-inner transition active:scale-[0.98] hover:border-white/10 hover:bg-white/[0.02]"
                  >
                    <div className="min-w-0 flex-1">
                      <strong className="block truncate text-base font-extrabold text-white">{exercise.name}</strong>
                      <span className="mt-1 flex items-center gap-1.5 text-xs font-bold text-gym-muted">
                        <TrendIcon direction={trend.direction} /> {last?.maxWeight ? `${last.maxWeight.toFixed(1).replace(".", ",")} kg` : "-"}
                      </span>
                    </div>
                    <div className="w-20 shrink-0">
                      <SparklineClient entries={exercise.entries} direction={trend.direction} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Translucent Blur Fade & Show More Button */}
        {hasMore && (
          <div className={`relative ${!expanded ? "-mt-12 pt-16 bg-gradient-to-t from-[#000000] via-[#000000]/80 to-transparent backdrop-blur-[2px]" : "mt-4"} flex justify-center pb-2 z-10 transition-all duration-300`}>
            <button
              onClick={() => setExpanded(!expanded)}
              className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-2 text-xs font-bold text-white shadow-xl backdrop-blur-md transition hover:bg-white/20 active:scale-95 cursor-pointer"
            >
              <span>{expanded ? "Mostra Meno" : `Mostra Tutti (${extraExercises.length} altri)`}</span>
              {expanded ? <ChevronUp size={14} className="transition-transform group-hover:-translate-y-0.5" /> : <ChevronDown size={14} className="transition-transform group-hover:translate-y-0.5" />}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
