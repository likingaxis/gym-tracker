export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Clock3, Dumbbell, Play } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSelectedProfileId } from "@/lib/profiles";
import { formatRestTime } from "@/lib/utils/time";
import { estimateFallbackDurationFromPlan, formatDurationShort } from "@/lib/progress";

export default async function WorkoutDayPreviewPage({ params }: { params: Promise<{ dayId: string }> }) {
  const { dayId } = await params;
  const profileId = await getSelectedProfileId();
  if (!profileId) redirect("/profiles");

  const supabase = createServerSupabaseClient();
  const { data: day, error } = await supabase
    .from("workout_days")
    .select("*, workout_plans!inner(profile_id, name), exercises(*)")
    .eq("id", dayId)
    .eq("workout_plans.profile_id", profileId)
    .order("exercise_order", { referencedTable: "exercises", ascending: true })
    .single();

  if (error || !day) return <p className="text-gym-danger">Giorno non trovato.</p>;

  const exercises = [...(day.exercises ?? [])].sort((a: any, b: any) => a.exercise_order - b.exercise_order);
  const duration = estimateFallbackDurationFromPlan(exercises);

  return (
    <div className="space-y-7 pb-24">
      <header>
        <Link href="/workout" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-gym-muted">
          <ArrowLeft size={18} /> Scheda
        </Link>
        <p className="technical-label mt-4">Anteprima giorno</p>
        <h1 className="page-title mt-1">{day.name}</h1>
        <div className="mt-3 flex flex-wrap gap-3 text-sm text-gym-muted">
          <span className="inline-flex items-center gap-1.5"><Dumbbell size={16} /> {exercises.length} esercizi</span>
          {duration ? <span className="inline-flex items-center gap-1.5"><Clock3 size={16} /> circa {formatDurationShort(duration)}</span> : null}
        </div>
        {day.description ? <p className="mt-4 text-base leading-7 text-gym-soft">{day.description}</p> : null}
      </header>

      <section className="section-block">
        <p className="technical-label">Programma</p>
        <div className="technical-list mt-3">
          {exercises.map((exercise: any, index: number) => (
            <article key={exercise.id} className="preview-exercise-row">
              <span className="mono-type w-7 shrink-0 text-sm text-gym-muted">{String(index + 1).padStart(2, "0")}</span>
              {exercise.media_url ? (
                <img src={exercise.media_url} alt="" className="h-14 w-14 shrink-0 rounded-lg border border-gym-line bg-gym-bg object-contain" />
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-gym-line bg-gym-panel text-gym-muted"><Dumbbell size={20} /></span>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-extrabold leading-tight text-gym-soft">{exercise.name}</h2>
                <p className="mt-1 text-sm text-gym-muted">
                  {exercise.sets ?? "-"} × {exercise.reps ?? "-"} · {formatRestTime(exercise.rest_seconds)}
                </p>
                {exercise.muscle_group ? <p className="mt-1 text-sm font-bold text-gym-info">{exercise.muscle_group}</p> : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-md px-4">
        <Link href={`/workout/${dayId}`} className="primary-link"><Play size={18} fill="currentColor" /> Inizia allenamento</Link>
      </div>
    </div>
  );
}
