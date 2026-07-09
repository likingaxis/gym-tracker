export const dynamic = "force-dynamic";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getSelectedProfileId } from "@/lib/profiles";
import { WorkoutSessionClient } from "@/components/workout/WorkoutSessionClient";

export default async function WorkoutDayPage({ params }: { params: Promise<{ dayId: string }> }) {
  const { dayId } = await params;
  const profileId = await getSelectedProfileId();
  if (!profileId) redirect("/profiles");

  const supabase = createServerSupabaseClient();
  const { data: day, error } = await supabase
    .from("workout_days")
    .select("*, workout_plans!inner(profile_id), exercises(*)")
    .eq("id", dayId)
    .eq("workout_plans.profile_id", profileId)
    .order("exercise_order", { referencedTable: "exercises", ascending: true })
    .single();

  if (error || !day) {
    return <p className="text-red-200">Giorno non trovato.</p>;
  }

  const sortedDay = {
    ...day,
    exercises: [...(day.exercises ?? [])].sort((a: any, b: any) => a.exercise_order - b.exercise_order)
  };

  return (
    <div className="space-y-4">
      <header className="sticky top-0 z-20 -mx-4 bg-gym-bg/95 px-4 py-3 backdrop-blur">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-gym-accent">Allenamento</p>
        <h1 className="mt-1 text-3xl font-black">{day.name}</h1>
        {day.description ? <p className="mt-1 text-sm text-gym-muted">{day.description}</p> : null}
      </header>

      <WorkoutSessionClient day={sortedDay} />
    </div>
  );
}
