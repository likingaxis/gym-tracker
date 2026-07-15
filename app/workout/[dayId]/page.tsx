export const dynamic = "force-dynamic";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getSelectedProfileId } from "@/lib/profiles";
import { WorkoutSessionClient } from "@/components/workout/WorkoutSessionClient";
import { estimateFallbackDurationFromPlan, estimateWorkoutDurationFromSessions, type SessionLike } from "@/lib/progress";

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

  let estimate: ReturnType<typeof estimateWorkoutDurationFromSessions> = { estimatedSeconds: estimateFallbackDurationFromPlan(sortedDay.exercises), sampleSize: 0, source: "fallback" };
  try {
    const { data: previousSessions } = await supabase
      .from("workout_sessions")
      .select("id, status, started_at, completed_at, workout_day_id, total_paused_seconds")
      .eq("profile_id", profileId)
      .eq("status", "completed")
      .is("deleted_at", null)
      .order("started_at", { ascending: false })
      .limit(80);
    estimate = estimateWorkoutDurationFromSessions(
      (previousSessions ?? []) as SessionLike[],
      dayId,
      estimateFallbackDurationFromPlan(sortedDay.exercises) ?? undefined,
    );
  } catch {
    // La stima è un aiuto, non deve bloccare l’allenamento.
  }

  return <WorkoutSessionClient day={sortedDay} durationEstimate={estimate} />;
}
