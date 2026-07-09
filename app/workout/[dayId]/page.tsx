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

  return <WorkoutSessionClient day={sortedDay} />;
}
