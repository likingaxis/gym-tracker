"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Scale } from "lucide-react";

export function BodyWeightChartClient({ logs }: { logs: { date: string; weight: number }[] }) {
  // Sort logs by date ascending to ensure proper charting
  const sortedLogs = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  if (sortedLogs.length === 0) return null;

  // We want to show a flat line if there's only 1 log, or we just return null.
  // The user requested: "va bene anche solo con il peso di ora", so we should show the chart even with 1 point.
  // But SVG line needs at least 2 points. If there's 1 point, we can duplicate it to draw a straight line,
  // or just show a single dot. Let's duplicate it for the visual line.
  const chartData = sortedLogs.length === 1 
    ? [
        { ...sortedLogs[0], date: new Date(new Date(sortedLogs[0].date).getTime() - 86400000).toISOString() }, // 1 day before
        sortedLogs[0]
      ]
    : sortedLogs;

  const minWeight = Math.min(...chartData.map(d => d.weight));
  const maxWeight = Math.max(...chartData.map(d => d.weight));
  
  // Add some padding to Y axis
  const yMin = Math.max(0, minWeight - 5);
  const yMax = maxWeight + 5;
  const range = yMax - yMin;

  const w = 300;
  const h = 70;
  
  const points = chartData.map((d, i) => {
    const x = (i * w) / (chartData.length - 1);
    const y = h - ((d.weight - yMin) / range) * h;
    return { x, y, weight: d.weight, date: d.date, originalIndex: i };
  });
  
  const [activePoint, setActivePoint] = useState<typeof points[0] | null>(null);
  
  const polyline = points.map(p => `${p.x},${p.y}`).join(" ");
  const area = `0,${h + 4} ${polyline} ${w},${h + 4}`;

  function formatDate(iso: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("it-IT", { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // Se è un solo punto vero, modifichiamo il testo del tooltip di default
  const isSinglePoint = sortedLogs.length === 1;

  return (
    <div className="px-4 mt-2">
      <div className="rounded-[1.5rem] border border-[#c65f37]/20 bg-[#c65f37]/[0.02] p-5 shadow-inner">
        <div className="mb-6 flex items-start justify-between">
           <div className="min-h-[40px]">
             <h3 className="text-sm font-black text-white uppercase tracking-wider">Andamento Peso</h3>
             {activePoint ? (
               <motion.p 
                 initial={{ opacity: 0, y: -5 }} 
                 animate={{ opacity: 1, y: 0 }} 
                 className="mt-0.5 text-[11px] font-bold text-[#c65f37]"
               >
                 {formatDate(activePoint.date || null)}: <span className="text-white">{activePoint.weight.toFixed(1)} kg</span>
               </motion.p>
             ) : (
               <p className="mt-0.5 text-[10px] font-bold text-gym-muted">
                 {isSinglePoint ? "Registra altri pesi per vedere il trend" : "Storico pesate"}
               </p>
             )}
           </div>
           <Scale size={16} className="text-[#c65f37] mt-0.5" />
        </div>
        <div className="relative">
          {/* Y Axis Labels */}
          <div className="absolute -left-1 top-0 h-full flex flex-col justify-between text-[8px] font-bold text-gym-muted pb-4">
             <span>{yMax.toFixed(0)}</span>
             <span>{((yMax + yMin) / 2).toFixed(0)}</span>
             <span>{yMin.toFixed(0)}</span>
          </div>
          
          <svg viewBox={`0 -4 ${w} ${h + 10}`} className="w-full h-20 overflow-visible pl-8" aria-hidden="true">
             <defs>
               <linearGradient id="weightGrad" x1="0" x2="0" y1="0" y2="1">
                 <stop offset="0%" stopColor="#c65f37" stopOpacity="0.4" />
                 <stop offset="100%" stopColor="#c65f37" stopOpacity="0.0" />
               </linearGradient>
             </defs>
             <motion.polygon 
               points={area} 
               fill="url(#weightGrad)" 
               initial={{ opacity: 0 }}
               whileInView={{ opacity: 1 }}
               viewport={{ once: true, margin: "-30px" }}
               transition={{ duration: 1, ease: "easeOut" }}
             />
             <motion.polyline 
               points={polyline} 
               fill="none" 
               stroke="#c65f37" 
               strokeWidth="3" 
               strokeLinecap="round" 
               strokeLinejoin="round" 
               initial={{ pathLength: 0 }}
               whileInView={{ pathLength: 1 }}
               viewport={{ once: true, margin: "-30px" }}
               transition={{ duration: 1.5, ease: "easeInOut" }}
             />
             
             {/* Invisible rects for hover detection */}
             {points.map((p, i) => {
               // Se abbiamo clonato il punto iniziale, non mostriamo hover sul punto fantasma
               if (isSinglePoint && i === 0) return null;
               
               const prevX = i === 0 ? p.x : points[i - 1].x;
               const nextX = i === points.length - 1 ? p.x : points[i + 1].x;
               const hitAreaWidth = (nextX - prevX) / 2 + (p.x - prevX) / 2 || 20;
               const hitAreaX = p.x - hitAreaWidth / 2;
               
               return (
                 <g key={i}>
                   {/* Draw actual dots */}
                   <motion.circle
                     cx={p.x}
                     cy={p.y}
                     r={activePoint?.date === p.date ? 4 : 2}
                     fill={activePoint?.date === p.date ? "#fff" : "#c65f37"}
                     stroke="#000"
                     strokeWidth="1"
                     initial={{ scale: 0 }}
                     whileInView={{ scale: 1 }}
                     viewport={{ once: true }}
                     transition={{ delay: 1 + i * 0.1, duration: 0.3 }}
                     className="transition-all duration-200"
                   />
                   
                   {/* Transparent interaction layer */}
                   <rect
                     x={hitAreaX}
                     y={-10}
                     width={Math.max(hitAreaWidth, 20)}
                     height={h + 20}
                     fill="transparent"
                     onMouseEnter={() => setActivePoint(p)}
                     onMouseLeave={() => setActivePoint(null)}
                     onTouchStart={() => setActivePoint(p)}
                   />
                 </g>
               );
             })}
          </svg>
        </div>
      </div>
    </div>
  );
}
