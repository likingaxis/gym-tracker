export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { WorkoutPlanEditor } from "@/components/workout/WorkoutPlanEditor";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSelectedProfileId } from "@/lib/profiles";

async function getActivePlan(profileId: string) {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("workout_plans")
    .select("*, workout_days(*, exercises(*))")
    .eq("is_active", true)
    .eq("profile_id", profileId)
    .order("day_order", { referencedTable: "workout_days", ascending: true })
    .order("exercise_order", { referencedTable: "workout_days.exercises", ascending: true })
    .maybeSingle();

  return data;
}

export default async function WorkoutEditPage() {
  const profileId = await getSelectedProfileId();
  if (!profileId) redirect("/profiles");

  const plan = await getActivePlan(profileId);

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
