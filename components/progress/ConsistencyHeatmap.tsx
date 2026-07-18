"use client";

import { useMemo } from "react";
import { format, subDays, isSameDay, startOfWeek, addDays, getMonth } from "date-fns";
import { it } from "date-fns/locale";

export function ConsistencyHeatmap({ sessions }: { sessions: any[] }) {
  // Generate last 12 weeks of days (12 * 7 = 84 days)
  const days = useMemo(() => {
    const today = new Date();
    // Start from 12 weeks ago (Sunday or Monday based on locale, let's use startOfWeek with Monday as first day)
    const startDate = startOfWeek(subDays(today, 12 * 7), { weekStartsOn: 1 });
    const result = [];
    
    // We render exactly 13 weeks to reach today
    for (let i = 0; i < 13 * 7; i++) {
      const date = addDays(startDate, i);
      // Stop rendering if date is in the future
      if (date > today && !isSameDay(date, today)) {
         break;
      }
      
      const sessionForDay = sessions.find(s => isSameDay(new Date(s.started_at), date));
      result.push({
        date,
        hasSession: !!sessionForDay,
        count: sessionForDay ? 1 : 0 // in the future we could count multiple sessions
      });
    }
    return result;
  }, [sessions]);

  // Group into weeks for the columns
  const weeks: Array<typeof days> = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  // Month labels
  const monthLabels: { label: string; index: number }[] = [];
  weeks.forEach((week, i) => {
    if (week.length > 0) {
      const d = week[0].date;
      if (d.getDate() <= 7) {
        monthLabels.push({ label: format(d, 'MMM', { locale: it }), index: i });
      }
    }
  });

  return (
    <section className="px-4 mt-8">
      <div className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] p-5 shadow-inner">
        <header className="mb-4">
          <h3 className="text-sm font-black text-white uppercase tracking-wider">Mappa della Costanza</h3>
          <p className="mt-0.5 text-[10px] font-bold text-gym-muted">Ultimi 3 mesi di allenamenti</p>
        </header>

        <div className="flex">
          {/* Days of week labels */}
          <div className="flex flex-col justify-between pr-2 text-[9px] font-bold text-gym-muted pt-5 pb-1">
            <span>Lun</span>
            <span>Mer</span>
            <span>Ven</span>
            <span>Dom</span>
          </div>

          <div className="flex-1 overflow-x-auto hide-scrollbar">
            <div className="min-w-max">
              {/* Months */}
              <div className="flex relative h-5 mb-1 text-[10px] font-bold text-gym-muted uppercase">
                {monthLabels.map(m => (
                  <span key={m.index} className="absolute" style={{ left: `${m.index * 16}px` }}>
                    {m.label}
                  </span>
                ))}
              </div>

              {/* Grid */}
              <div className="flex gap-1">
                {weeks.map((week, wIndex) => (
                  <div key={wIndex} className="flex flex-col gap-1">
                    {week.map((day, dIndex) => (
                      <div 
                        key={dIndex}
                        title={`${format(day.date, 'dd MMM yyyy', { locale: it })}: ${day.hasSession ? '1 sessione' : 'Nessun allenamento'}`}
                        className={`h-3 w-3 rounded-[2px] transition-colors ${
                          day.hasSession 
                            ? 'bg-gym-accent shadow-[0_0_8px_rgba(239,68,68,0.3)]' 
                            : 'bg-white/5'
                        }`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-gym-muted justify-end">
           <span>Meno</span>
           <div className="h-2.5 w-2.5 rounded-[2px] bg-white/5" />
           <div className="h-2.5 w-2.5 rounded-[2px] bg-gym-accent/50" />
           <div className="h-2.5 w-2.5 rounded-[2px] bg-gym-accent" />
           <span>Più</span>
        </div>
      </div>
    </section>
  );
}
