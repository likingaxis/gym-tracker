"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Calendar, CheckCircle2, HeartPulse, LoaderCircle, Ruler, Save, Scale, User } from "lucide-react";
import { updateBodyData } from "./actions";

export function BodyForm({ 
  profileId, 
  initialData 
}: { 
  profileId: string; 
  initialData: { 
    gender: string | null; 
    birth_date: string | null; 
    height_cm: number | null; 
    weight_kg: number | null; 
  } 
}) {
  const [gender, setGender] = useState(initialData.gender || "");
  const [birthDate, setBirthDate] = useState(initialData.birth_date || "");
  const [height, setHeight] = useState(initialData.height_cm ? String(initialData.height_cm) : "");
  const [weight, setWeight] = useState(initialData.weight_kg ? String(initialData.weight_kg) : "");
  
  const [pending, setPending] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const router = useRouter();

  // Live BMI Calculation
  const bmiInfo = useMemo(() => {
    const h = parseFloat(height) / 100;
    const w = parseFloat(weight);
    if (!h || !w || h <= 0 || w <= 0) return null;
    const bmi = +(w / (h * h)).toFixed(1);
    let category = "Normopeso";
    let color = "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
    if (bmi < 18.5) {
      category = "Sottopeso";
      color = "text-amber-400 border-amber-500/30 bg-amber-500/10";
    } else if (bmi >= 25 && bmi < 30) {
      category = "Sovrappeso";
      color = "text-amber-400 border-amber-500/30 bg-amber-500/10";
    } else if (bmi >= 30) {
      category = "Obesità";
      color = "text-rose-400 border-rose-500/30 bg-rose-500/10";
    }
    return { bmi, category, color };
  }, [height, weight]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setSavedSuccess(false);
    try {
      await updateBodyData(profileId, {
        gender: gender || null,
        birth_date: birthDate || null,
        height_cm: height ? parseFloat(height) : null,
        weight_kg: weight ? parseFloat(weight) : null,
      });
      setSavedSuccess(true);
      router.refresh();
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch {
      alert("Errore nel salvataggio dei dati fisici.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Live BMI Preview Badge */}
      {bmiInfo ? (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center justify-between rounded-2xl border p-4 backdrop-blur-xl ${bmiInfo.color}`}
        >
          <div className="flex items-center gap-3">
            <HeartPulse size={22} className="shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider opacity-80">BMI Stimato</p>
              <p className="text-sm font-extrabold">{bmiInfo.category}</p>
            </div>
          </div>
          <span className="font-mono text-3xl font-black">{bmiInfo.bmi}</span>
        </motion.div>
      ) : null}

      {/* Sesso / Genere */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-gym-muted mb-2">
          Sesso BIOLOGICO / GENERE
        </label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: "male", label: "Uomo" },
            { id: "female", label: "Donna" },
          ].map((item) => {
            const active = gender === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setGender(item.id)}
                className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-extrabold transition-all duration-300 ${
                  active
                    ? "bg-gradient-to-br from-[#c65f37] to-[#ea580c] text-white shadow-[0_0_15px_rgba(198,95,55,0.35)]"
                    : "border border-white/10 bg-white/[0.03] text-gym-muted hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                <User size={16} /> {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Data di Nascita */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-gym-muted mb-2">
          Data di Nascita
        </label>
        <div className="relative flex items-center">
          <Calendar size={18} className="absolute left-3.5 text-gym-muted pointer-events-none" />
          <input 
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 pl-11 pr-4 text-sm font-bold text-white outline-none transition-all focus:border-[#c65f37] focus:bg-white/[0.06] focus:ring-1 focus:ring-[#c65f37]"
          />
        </div>
      </div>

      {/* Altezza e Peso */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gym-muted mb-2">
            Altezza (cm)
          </label>
          <div className="relative flex items-center">
            <Ruler size={18} className="absolute left-3.5 text-gym-muted pointer-events-none" />
            <input 
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="175"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 pl-11 pr-4 font-mono text-base font-extrabold text-white outline-none transition-all focus:border-[#c65f37] focus:bg-white/[0.06] focus:ring-1 focus:ring-[#c65f37]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gym-muted mb-2">
            Peso (kg)
          </label>
          <div className="relative flex items-center">
            <Scale size={18} className="absolute left-3.5 text-gym-muted pointer-events-none" />
            <input 
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="70.0"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 pl-11 pr-4 font-mono text-base font-extrabold text-white outline-none transition-all focus:border-[#c65f37] focus:bg-white/[0.06] focus:ring-1 focus:ring-[#c65f37]"
            />
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {savedSuccess ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-sm font-extrabold text-emerald-400"
        >
          <CheckCircle2 size={18} /> Dati salvati con successo!
        </motion.div>
      ) : null}

      {/* Submit Button */}
      <motion.button 
        whileTap={{ scale: 0.97 }}
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#c65f37] to-[#ea580c] p-4 text-base font-extrabold text-white shadow-[0_0_20px_rgba(198,95,55,0.35)] transition-all disabled:opacity-60"
      >
        {pending ? <LoaderCircle size={20} className="animate-spin" /> : <Save size={20} />}
        Salva dati fisici
      </motion.button>
    </form>
  );
}
