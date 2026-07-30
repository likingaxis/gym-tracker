"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { WorkoutPlanEditor } from "@/components/workout/WorkoutPlanEditor";
import { getActivePlan } from "@/lib/api-client/workout";

export default function WorkoutEditPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      const profileId = localStorage.getItem("active_profile_id");
      if (!profileId) {
        router.push("/profiles");
        return;
      }

      const data = await getActivePlan(profileId);
      setPlan(data);
      setLoading(false);
    }

    loadData();
  }, [router]);

  if (loading) {
    return <div className="p-6 text-center text-gym-muted">Caricamento scheda...</div>;
  }

  if (!plan) {
    return (
      <div className="space-y-5">
        <Link href="/workout" className="inline-flex items-center gap-2 text-sm font-bold text-slate-300">
          <ArrowLeft size={16} /> Scheda
        </Link>
        <Card>
          <h1 className="text-2xl font-extrabold">Nessuna scheda attiva</h1>
          <p className="mt-2 text-gym-muted">Importa una scheda prima di modificarla.</p>
          <Link href="/import"><Button className="mt-4 w-full">Importa scheda</Button></Link>
        </Card>
      </div>
    );
  }

  const normalizedPlan = {
    id: plan.id,
    name: plan.name ?? "Scheda",
    month: plan.month ?? "",
    start_date: plan.start_date ?? "",
    end_date: plan.end_date ?? "",
    days: [...(plan.workout_days ?? [])]
      .sort((a: any, b: any) => Number(a.day_order ?? 0) - Number(b.day_order ?? 0))
      .map((day: any) => ({
        id: day.id,
        day_order: Number(day.day_order ?? 0),
        name: day.name ?? "Giorno",
        description: day.description ?? "",
        exercises: [...(day.exercises ?? [])]
          .sort((a: any, b: any) => Number(a.exercise_order ?? 0) - Number(b.exercise_order ?? 0))
          .map((exercise: any) => ({
            id: exercise.id,
            exercise_order: Number(exercise.exercise_order ?? 0),
            name: exercise.name ?? "Esercizio",
            muscle_group: exercise.muscle_group ?? "",
            sets: exercise.sets ?? null,
            reps: exercise.reps ?? "",
            rest_seconds: exercise.rest_seconds ?? null,
            suggested_weight: exercise.suggested_weight ?? "",
            target_rpe: exercise.target_rpe ?? "",
            technique_notes: exercise.technique_notes ?? "",
            tips: exercise.tips ?? "",
            trainer_notes: exercise.trainer_notes ?? "",
            exercise_db_query: exercise.exercise_db_query ?? "",
            exercise_db_id: exercise.exercise_db_id ?? "",
            media_url: exercise.media_url ?? "",
          })),
      })),
  };

  return (
    <div className="space-y-4 pb-28">
      <Link href="/workout" className="inline-flex items-center gap-2 text-sm font-bold text-slate-300">
        <ArrowLeft size={16} /> Torna alla scheda
      </Link>
      <WorkoutPlanEditor initialPlan={normalizedPlan} />
    </div>
  );
}
