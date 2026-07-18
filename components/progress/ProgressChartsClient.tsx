"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Clock3, TrendingUp, TrendingDown, Target, CalendarDays } from "lucide-react";
import { formatCompactNumber } from "@/lib/progress";
import type { SessionLike } from "@/lib/progress";
import { getWorkoutDurationSeconds, getSessionSummary } from "@/lib/progress";

export function DurationChartClient({ sessions }: { sessions: SessionLike[] }) {
  const completed = sessions.filter(s => s.status === "completed").slice(0, 10).reverse();
  if (completed.length < 2) return null;

  const durations = completed.map(s => {
    const sec = getWorkoutDurationSeconds(s);
    return { date: s.started_at, duration: sec ?? 0 };
  }).filter(d => d.duration > 0);
  
  if (durations.length < 2) return null;

  const maxDuration = Math.max(...durations.map(d => d.duration));
  const w = 300;
  const h = 70;
  
  const points = durations.map((d, i) => {
    const x = (i * w) / (durations.length - 1);
    const y = h - (d.duration / maxDuration) * h;
    return { x, y, duration: Math.round(d.duration / 60), date: d.date };
  });
  
  const [activePoint, setActivePoint] = useState<typeof points[0] | null>(null);
  
  const polyline = points.map(p => `${p.x},${p.y}`).join(" ");
  const area = `0,${h + 4} ${polyline} ${w},${h + 4}`;

  function formatDurationFromMinutes(minutes: number): string {
    if (minutes <= 0) return "0m";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  }

  function formatDate(iso: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("it-IT", { day: '2-digit', month: 'short', year: 'numeric' });
  }

  return (
    <div className="px-4 mt-2">
      <div className="rounded-[1.5rem] border border-[#3b82f6]/20 bg-[#3b82f6]/[0.02] p-5 shadow-inner">
        <div className="mb-6 flex items-start justify-between">
           <div className="min-h-[40px]">
             <h3 className="text-sm font-black text-white uppercase tracking-wider">Durata Allenamenti</h3>
             {activePoint ? (
               <motion.p 
                 initial={{ opacity: 0, y: -5 }} 
                 animate={{ opacity: 1, y: 0 }} 
                 className="mt-0.5 text-[11px] font-bold text-[#3b82f6]"
               >
                 {formatDate(activePoint.date || null)}: <span className="text-white">{formatDurationFromMinutes(activePoint.duration)}</span>
               </motion.p>
             ) : (
               <p className="mt-0.5 text-[10px] font-bold text-gym-muted">Ultime 10 sessioni</p>
             )}
           </div>
           <Clock3 size={16} className="text-[#3b82f6] mt-0.5" />
        </div>
        <div className="relative">
          {/* Y Axis Labels */}
          <div className="absolute -left-1 top-0 h-full flex flex-col justify-between text-[8px] font-bold text-gym-muted pb-4">
             <span>{formatDurationFromMinutes(Math.round(maxDuration / 60))}</span>
             <span>{formatDurationFromMinutes(Math.round((maxDuration / 60) / 2))}</span>
             <span>0m</span>
          </div>
          
          <svg viewBox={`0 -4 ${w} ${h + 10}`} className="w-full h-20 overflow-visible pl-8" aria-hidden="true">
             <defs>
               <linearGradient id="durationGrad" x1="0" x2="0" y1="0" y2="1">
                 <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                 <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
               </linearGradient>
             </defs>
             <motion.polygon 
               points={area} 
               fill="url(#durationGrad)" 
               initial={{ opacity: 0 }}
               whileInView={{ opacity: 1 }}
               viewport={{ once: true, margin: "-30px" }}
               transition={{ duration: 1, ease: "easeOut" }}
             />
             <motion.polyline 
               points={polyline} 
               fill="none" 
               stroke="#3b82f6" 
               strokeWidth="3" 
               strokeLinecap="round" 
               strokeLinejoin="round" 
               className="drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" 
               initial={{ pathLength: 0 }}
               whileInView={{ pathLength: 1 }}
               viewport={{ once: true, margin: "-30px" }}
               transition={{ duration: 1.5, ease: "easeInOut" }}
             />
             {points.map((p, i) => (
               <g 
                 key={i} 
                 onClick={() => setActivePoint(activePoint === p ? null : p)} 
                 className="cursor-pointer"
                 style={{ touchAction: 'manipulation' }}
               >
                 <motion.circle 
                   cx={p.x} cy={p.y} 
                   r={activePoint === p ? "5" : "3"} 
                   fill={activePoint === p ? "#ffffff" : "#3b82f6"} 
                   initial={{ scale: 0 }}
                   whileInView={{ scale: 1 }}
                   viewport={{ once: true, margin: "-30px" }}
                   transition={{ delay: 1 + (i * 0.05) }}
                   className={activePoint === p ? "drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]" : ""}
                 />
                 {/* Invisible larger circle for easier clicking on mobile */}
                 <circle cx={p.x} cy={p.y} r="15" fill="transparent" />
               </g>
             ))}
          </svg>
        </div>
      </div>
    </div>
  );
}

export function ActivityChartClient({ sessions }: { sessions: SessionLike[] }) {
  const now = new Date();
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (13 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const dailySets = days.map(day => {
    const daySessions = sessions.filter(s => {
      if (!s.started_at) return false;
      const sd = new Date(s.started_at);
      sd.setHours(0, 0, 0, 0);
      return sd.getTime() === day.getTime();
    });
    const setsCount = daySessions.reduce((sum, s) => sum + getSessionSummary(s).completedSets, 0);
    return { date: day, sets: setsCount };
  });

  const maxSets = Math.max(...dailySets.map(d => d.sets), 1);

  return (
    <div className="px-4">
      <div className="rounded-[1.5rem] border border-gym-accent/20 bg-gradient-to-b from-white/[0.04] to-transparent p-5 shadow-inner">
        <div className="mb-6 flex items-center justify-between">
           <div>
             <h3 className="text-sm font-black text-white uppercase tracking-wider">Volume di lavoro</h3>
             <p className="mt-0.5 text-[10px] font-bold text-gym-muted">Serie completate negli ultimi 14 gg</p>
           </div>
           <span className="flex h-2.5 w-2.5 rounded-full bg-gym-accent shadow-[0_0_12px_rgba(198,95,55,1)]" />
        </div>
        
        <div className="relative h-20 pl-6 pr-2 flex items-end justify-between gap-1.5 pb-2">
          {/* Y Axis Labels */}
          <div className="absolute -left-1 top-0 h-full flex flex-col justify-between text-[8px] font-bold text-gym-muted pb-2">
             <span>{maxSets}</span>
             <span>{Math.round(maxSets / 2)}</span>
             <span>0</span>
          </div>
          
          {dailySets.map((d, i) => {
            const heightPerc = maxSets > 0 ? (d.sets / maxSets) * 100 : 0;
            const isToday = i === 13;
            const hasData = heightPerc > 0;
            return (
              <div key={i} className="relative flex flex-col justify-end w-full max-w-[14px] h-full group">
                {hasData && (
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    {d.sets}
                  </span>
                )}
                <motion.div 
                  className={`w-full rounded-full ${isToday ? "bg-[#c65f37] drop-shadow-[0_0_10px_rgba(198,95,55,0.6)]" : hasData ? "bg-[#c65f37]/40" : "bg-white/5"}`}
                  initial={{ height: "4px" }}
                  whileInView={{ height: hasData ? `${Math.max(10, heightPerc)}%` : "4px" }}
                  viewport={{ once: true, margin: "-30px" }}
                  transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function SparklineClient({ entries, direction }: { entries: Array<{ maxWeight: number | null }>, direction: string }) {
  const points = entries.filter((entry) => entry.maxWeight !== null).slice(-6) as Array<{ maxWeight: number }>;
  if (points.length < 2) return <div className="h-4 w-full rounded-full bg-white/5" />;
  
  const values = points.map((entry) => entry.maxWeight);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const w = 80;
  const h = 28;
  
  const svgPoints = points.map((entry, index) => ({
    x: (index * w) / (points.length - 1),
    y: h - ((entry.maxWeight - min) * h) / range
  }));
  const polyline = svgPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPolyline = `0,${h + 8} ${polyline} ${w},${h + 8}`;
  
  const color = direction === "up" ? "#10b981" : direction === "down" ? "#ef4444" : "#f59e0b";

  return (
    <svg viewBox={`0 -4 ${w} ${h + 12}`} className="w-full h-8 overflow-visible" aria-hidden="true">
       <defs>
         <linearGradient id={`spark-${direction}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
         </linearGradient>
       </defs>
       <motion.polygon 
         points={areaPolyline} 
         fill={`url(#spark-${direction})`} 
         initial={{ opacity: 0 }}
         whileInView={{ opacity: 1 }}
         viewport={{ once: true, margin: "-20px" }}
         transition={{ duration: 0.8 }}
       />
       <motion.polyline 
         points={polyline} 
         fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" 
         initial={{ pathLength: 0 }}
         whileInView={{ pathLength: 1 }}
         viewport={{ once: true, margin: "-20px" }}
         transition={{ duration: 1, ease: "easeInOut" }}
       />
       <motion.circle 
         cx={svgPoints[svgPoints.length - 1].x} cy={svgPoints[svgPoints.length - 1].y} r="3.5" fill={color} className="drop-shadow-[0_0_4px_currentColor]" 
         initial={{ scale: 0 }}
         whileInView={{ scale: 1 }}
         viewport={{ once: true, margin: "-20px" }}
         transition={{ delay: 0.8 }}
       />
    </svg>
  );
}

export function CombinedMuscleRowClient({ label, sets, maxSets, days, tone }: { label: string; sets: number; maxSets: number; days: number; tone: number }) {
  const width = maxSets > 0 ? Math.max(8, Math.round((sets / maxSets) * 100)) : 0;
  return (
    <div className="rounded-[1.25rem] border border-white/5 bg-[#050708] p-4 shadow-inner">
      <div className="mb-3 flex items-end justify-between">
        <div className="min-w-0">
          <strong className="block text-base font-extrabold text-white">{label}</strong>
          <span className="mt-0.5 block text-xs font-bold text-gym-muted">{formatCompactNumber(sets)} serie completate</span>
        </div>
        <div className="text-right">
          <span className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gym-soft shadow-inner">
            <CalendarDays size={12} className="text-gym-muted" /> {days} gg
          </span>
        </div>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-black/40 shadow-inner">
        <motion.div 
          className={`h-full rounded-full bar-tone-${tone}`} 
          initial={{ width: "0%" }}
          whileInView={{ width: `${width}%` }}
          viewport={{ once: true, margin: "-20px" }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
