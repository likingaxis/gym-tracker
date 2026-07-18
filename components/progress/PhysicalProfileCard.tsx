"use client";

import Link from "next/link";
import { User, Activity, AlertCircle, Info } from "lucide-react";
import { motion } from "framer-motion";
import { useAppDialog } from "@/components/ui/AppDialogProvider";

export function PhysicalProfileCard({ profile }: { profile: any }) {
  const { showDialog } = useAppDialog();
  const hasData = profile?.weight_kg && profile?.height_cm;

  if (!hasData) {
    return (
      <section className="px-4 mt-2">
        <div className="rounded-[1.5rem] border border-[#c65f37]/20 bg-gradient-to-br from-[#c65f37]/[0.06] via-white/[0.02] to-transparent p-5 shadow-inner backdrop-blur-md">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] bg-[#c65f37]/10 text-gym-accent border border-[#c65f37]/20 shadow-inner">
              <User size={22} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Statistiche relative</h3>
              <p className="mt-1 text-xs text-white/60 font-medium leading-relaxed">Inserisci altezza e peso per sbloccare il calcolo del BMI e il tuo rapporto Forza/Peso.</p>
              <Link 
                href="/settings/body"
                className="mt-3.5 inline-flex items-center gap-2 rounded-xl bg-[#c65f37]/15 border border-[#c65f37]/30 px-4 py-2 text-[11px] font-extrabold uppercase tracking-wider text-gym-accent transition hover:bg-[#c65f37]/25 active:scale-95 shadow-sm"
              >
                Inserisci dati fisici
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const w = profile.weight_kg;
  const h = profile.height_cm;
  const bmi = w / ((h / 100) * (h / 100));
  
  let bmiLabel = "Obesità";
  let bmiColor = "bg-red-500/20 text-red-400 border border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.2)]";
  let dotColor = "bg-red-500";
  let offset = 90; // percentage on the slider

  if (bmi < 18.5) {
    bmiLabel = "Sottopeso";
    bmiColor = "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.2)]";
    dotColor = "bg-cyan-400";
    offset = 15;
  } else if (bmi >= 18.5 && bmi < 25) {
    bmiLabel = "Normopeso";
    bmiColor = "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]";
    dotColor = "bg-emerald-400";
    offset = 40;
  } else if (bmi >= 25 && bmi < 30) {
    bmiLabel = "Sovrappeso";
    bmiColor = "bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.2)]";
    dotColor = "bg-amber-400";
    offset = 70;
  }

  // clamp offset between 5 and 95
  offset = Math.max(5, Math.min(95, offset));

  return (
    <section className="px-4 mt-2">
      <div className="rounded-[1.5rem] border border-[#c65f37]/20 bg-gradient-to-br from-[#c65f37]/[0.06] via-white/[0.02] to-transparent p-5 shadow-inner backdrop-blur-md relative overflow-hidden">
        <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-gradient-to-bl from-[#c65f37]/20 to-transparent blur-xl pointer-events-none" />
        <div className="mb-4 flex items-center justify-between relative z-10">
           <div>
             <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
               <Activity size={15} className="text-gym-accent" /> Situazione Corporea
             </h3>
             <p className="mt-0.5 text-[10px] font-bold text-gym-muted">Basata sui tuoi dati fisici</p>
           </div>
           <div className="flex gap-2">
             <button 
               onClick={() => showDialog({
                 title: "Che cos'è il BMI?",
                 message: "L'Indice di Massa Corporea (BMI) è un indicatore che mette in relazione peso e altezza. Attenzione: nei soggetti molto muscolosi può risultare 'sballato' e sovrastimare il grasso corporeo, in quanto la formula matematica non fa distinzione tra massa grassa e massa magra.",
                 tone: "default"
               })}
               className="rounded-full bg-white/5 border border-white/5 p-2 text-white/60 transition hover:bg-white/10 hover:text-white cursor-pointer"
               title="Cosa significano questi dati?"
             >
               <Info size={16} />
             </button>
             <Link href="/settings/body" className="rounded-full bg-white/5 border border-white/5 p-2 text-white/60 transition hover:bg-white/10 hover:text-white">
               <User size={16} />
             </Link>
           </div>
        </div>

        <div className="flex items-center gap-6 mb-6 relative z-10">
           <div>
              <span className="block text-[10px] font-black tracking-wider text-[#c65f37]/80 mb-1">PESO</span>
              <span className="text-2xl font-black text-white tracking-tight">{w} <span className="text-sm font-bold text-gym-muted">kg</span></span>
           </div>
           <div className="h-8 w-px bg-white/10" />
           <div>
              <span className="block text-[10px] font-black tracking-wider text-[#c65f37]/80 mb-1">ALTEZZA</span>
              <span className="text-2xl font-black text-white tracking-tight">{h} <span className="text-sm font-bold text-gym-muted">cm</span></span>
           </div>
           <div className="h-8 w-px bg-white/10" />
           <div>
              <span className="block text-[10px] font-black tracking-wider text-[#c65f37]/80 mb-1">BMI</span>
              <span className="text-2xl font-black text-white tracking-tight">{bmi.toFixed(1)}</span>
           </div>
        </div>

        <div className="relative z-10">
          {/* Label */}
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-2 flex items-center justify-between"
          >
             <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${bmiColor}`}>
                {bmiLabel}
             </span>
          </motion.div>

          {/* Slider Track & Centered Indicator Dot */}
          <div className="relative flex items-center">
            <div className="h-2.5 w-full rounded-full bg-black/40 overflow-hidden flex border border-white/5 p-0.5 gap-0.5">
              <div className="h-full w-1/4 rounded-l-full bg-cyan-500/70" />
              <div className="h-full w-1/4 bg-emerald-500/70" />
              <div className="h-full w-1/4 bg-amber-500/70" />
              <div className="h-full w-1/4 rounded-r-full bg-red-500/70" />
            </div>

            <motion.div 
               className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)] z-10"
               initial={{ left: 0 }}
               animate={{ left: `${offset}%` }}
               transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
               <div className={`h-2 w-2 rounded-full ${dotColor}`} />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
