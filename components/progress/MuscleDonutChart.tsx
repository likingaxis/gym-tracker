"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Sparkles } from "lucide-react";

type MuscleData = {
  group: string;
  sets: number;
};

const PALETTE = [
  "#c65f37", // Neon Copper (Brand Accent)
  "#3b82f6", // Electric Blue
  "#10b981", // Emerald Green
  "#f59e0b", // Warm Gold
  "#8b5cf6", // Royal Violet
  "#f97316", // Bright Coral
  "#06b6d4", // Vivid Cyan
  "#d946ef", // Electric Magenta
  "#e11d48", // Crimson Rose
  "#84cc16", // Bright Lime
  "#6366f1", // Deep Indigo
  "#fbbf24", // Golden Amber
];

export function MuscleDonutChart({ data }: { data: MuscleData[] }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const totalSets = useMemo(() => data.reduce((acc, curr) => acc + curr.sets, 0), [data]);

  const processedData = useMemo(() => {
    if (totalSets === 0) return [];
    
    const sorted = [...data].sort((a, b) => b.sets - a.sets).filter(d => d.sets > 0);
    
    return sorted.map((item, index) => {
      const percentage = item.sets / totalSets;
      return {
        ...item,
        percentage,
        color: PALETTE[index % PALETTE.length],
        index
      };
    });
  }, [data, totalSets]);

  if (processedData.length === 0) {
    return (
      <section className="px-4 mt-8">
        <div className="rounded-[1.75rem] border border-white/5 bg-white/[0.02] p-6 shadow-inner text-center py-12">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-gym-muted">
            <PieChart size={22} />
          </div>
          <p className="text-gym-muted text-sm font-bold">Nessun dato muscolare negli ultimi 30 giorni</p>
        </div>
      </section>
    );
  }

  const activeSlice = selectedIndex !== null ? processedData[selectedIndex] : null;

  // Extra Large SVG Dimensions & Thick Ring Parameters
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = 40; // Thick color ring
  const radius = (size - strokeWidth - 4) / 2;
  const circumference = 2 * Math.PI * radius;

  // Gap between segments
  const gapLength = processedData.length > 1 ? 10 : 0;
  const totalGapLength = processedData.length * gapLength;
  const usableCircumference = Math.max(0, circumference - totalGapLength);

  let currentOffset = 0;
  const slicesWithOffsets = processedData.map((slice) => {
    const sliceLength = slice.percentage * usableCircumference;
    const offset = currentOffset;
    currentOffset += sliceLength + gapLength;
    return {
      ...slice,
      sliceLength,
      offset
    };
  });

  return (
    <section className="px-4 mt-8">
      <div className="rounded-[2rem] border border-[#c65f37]/20 bg-gradient-to-br from-[#c65f37]/[0.06] via-white/[0.02] to-transparent p-5 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Subtle background glow when a muscle is selected */}
        {activeSlice && (
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-[90px] opacity-20 pointer-events-none transition-all duration-500"
            style={{ backgroundColor: activeSlice.color }}
          />
        )}

        <header className="flex items-center justify-between mb-2 relative z-10">
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
              <PieChart size={15} className="text-gym-accent" /> Ripartizione Volume
            </h3>
            <p className="mt-0.5 text-[10px] font-semibold text-gym-muted">Serie completate negli ultimi 30 giorni</p>
          </div>
          {selectedIndex !== null && (
            <button 
              onClick={() => setSelectedIndex(null)}
              className="rounded-full bg-white/10 hover:bg-white/20 px-3 py-1 text-[10px] font-bold text-white border border-white/10 transition active:scale-95 cursor-pointer"
            >
              Mostra Tutti
            </button>
          )}
        </header>

        <div className="flex flex-col items-center justify-center pt-3 relative z-10">
          {/* Donut Ring */}
          <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg 
              width={size} 
              height={size} 
              viewBox={`0 0 ${size} ${size}`} 
              className="-rotate-90 cursor-pointer"
              onClick={() => setSelectedIndex(null)}
            >
              {/* Deep 3D background ring track */}
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill="transparent"
                stroke="rgba(0,0,0,0.4)"
                strokeWidth={strokeWidth}
                style={{ filter: "drop-shadow(inset 0 4px 10px rgba(0,0,0,0.8))" }}
              />
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill="transparent"
                stroke="rgba(255,255,255,0.03)"
                strokeWidth={strokeWidth}
              />

              {slicesWithOffsets.map((slice) => {
                const isSelected = selectedIndex === slice.index;
                const isFaded = selectedIndex !== null && !isSelected;
                const isDefault = selectedIndex === null;
                
                const dashArray = `${slice.sliceLength} ${circumference - slice.sliceLength}`;

                return (
                  <g key={`${slice.group || 'unknown'}-${slice.index}`}>
                    {/* Visual Segment with 3D depth in default state */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={radius}
                      fill="transparent"
                      stroke={slice.color}
                      strokeWidth={strokeWidth}
                      strokeDasharray={dashArray}
                      strokeDashoffset={-slice.offset}
                      strokeLinecap="round"
                      className="transition-all duration-300 ease-out cursor-pointer"
                      style={{
                        pointerEvents: "stroke",
                        opacity: isFaded ? 0.15 : 1,
                        filter: isSelected 
                          ? `drop-shadow(0 0 16px ${slice.color})` 
                          : isDefault 
                            ? `drop-shadow(0 4px 8px rgba(0,0,0,0.6))` 
                            : "none",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedIndex(selectedIndex === slice.index ? null : slice.index);
                      }}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Premium Center Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-4">
              <AnimatePresence mode="wait">
                {activeSlice ? (
                  <motion.div
                    key={activeSlice.group}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-col items-center"
                  >
                    <span className="text-4xl font-black text-white tracking-tight leading-none">
                      {activeSlice.sets}
                    </span>
                    <span 
                      className="text-[11px] font-black uppercase tracking-wider mt-1 px-3 py-0.5 rounded-full bg-white/10 border border-white/10 shadow-sm" 
                      style={{ color: activeSlice.color }}
                    >
                      {activeSlice.group}
                    </span>
                    <span className="text-[10px] font-bold text-gym-muted mt-1.5">
                      {Math.round(activeSlice.percentage * 100)}% del volume totale
                    </span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="total-display"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-col items-center"
                  >
                    <span className="text-4xl font-black text-white tracking-tight leading-none">
                      {totalSets}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider mt-1.5 px-3 py-0.5 rounded-full bg-gym-accent/10 text-gym-accent border border-gym-accent/20">
                      <Sparkles size={11} /> Serie Totali
                    </span>
                    <span className="text-[9px] font-bold text-white/40 mt-1.5">
                      Tocca uno spicchio per i dettagli
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Interactive Badges Below */}
          <div className="mt-6 flex flex-wrap justify-center gap-1.5 w-full">
            {processedData.map((slice) => {
              const isSelected = selectedIndex === slice.index;

              return (
                <button
                  key={`${slice.group || 'unknown'}-${slice.index}`}
                  onClick={() => setSelectedIndex(selectedIndex === slice.index ? null : slice.index)}
                  className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-200 text-left cursor-pointer ${
                    isSelected 
                      ? "bg-white/15 border-white/30 shadow-lg scale-[1.03]" 
                      : "bg-white/[0.03] border-white/5 hover:bg-white/[0.07] hover:border-white/10"
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0 transition-transform duration-200"
                    style={{
                      backgroundColor: slice.color,
                      boxShadow: isSelected ? `0 0 10px ${slice.color}` : "none",
                    }}
                  />
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                    {slice.group}
                  </span>
                  <span className="text-[10px] font-black text-gym-muted ml-0.5">
                    {Math.round(slice.percentage * 100)}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}



