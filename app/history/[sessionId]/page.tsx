export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSelectedProfileId } from "@/lib/profiles";
import { firstRelation, relationName } from "@/lib/relations";
import { SessionActions } from "@/components/history/SessionActions";
import { formatAverage, formatCompactNumber, getSessionSummary } from "@/lib/progress";

export default async function SessionDetailPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const profileId = await getSelectedProfileId();
  if (!profileId) redirect("/profiles");

  const supabase = createServerSupabaseClient();
  const { data: session, error } = await supabase
    .from("workout_sessions")
    .select("*, workout_plans(name, month), workout_days(name), session_exercises(*, exercises(*), exercise_sets(*))")
    .eq("id", sessionId)
    .eq("profile_id", profileId)
    .single();

  if (error || !session) {
    return <p className="text-red-200">Sessione non trovata.</p>;
  }

  const startedAt = new Date(session.started_at).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  const completedAt = session.completed_at
    ? new Date(session.completed_at).toLocaleString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : null;

  const summary = getSessionSummary(session);

  const exercises = [...(session.session_exercises ?? [])].sort((a: any, b: any) => {
    return (firstRelation(a.exercises)?.exercise_order ?? 0) - (firstRelation(b.exercises)?.exercise_order ?? 0);
  });

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-semibold text-gym-info">Dettaglio</p>
        <h1 className="mt-2 text-3xl font-extrabold">{relationName(session.workout_days, "Allenamento")}</h1>
        <p className="mt-2 text-gym-muted">{relationName(session.workout_plans, "Scheda")}</p>
      </header>

      <Card>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Info label="Stato" value={getStatusLabel(session.status)} />
          <Info label="Inizio" value={startedAt} />
          {completedAt ? <Info label="Fine" value={completedAt} /> : null}
          <Info label="Serie" value={`${summary.completedSets}/${summary.totalSets}`} />
          <Info label="Volume" value={`${formatCompactNumber(summary.volume)} kg`} />
          <Info label="RPE medio" value={formatAverage(summary.averageRpe)} />
        </div>
        {session.general_notes ? <p className="mt-4 rounded-2xl bg-black/20 p-3 text-sm text-slate-200">{session.general_notes}</p> : null}
      </Card>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold">Esercizi</h2>
        {exercises.map((item: any) => (
          <Card key={item.id} className={item.completed ? "border-gym-accent/60" : undefined}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-gym-muted">{firstRelation(item.exercises)?.muscle_group ?? "Esercizio"}</p>
                <h3 className="mt-1 text-xl font-extrabold">{relationName(item.exercises, "Esercizio")}</h3>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">{item.completed ? "OK" : "No"}</span>
            </div>
            <div className="mt-3 space-y-2">
              {[...(item.exercise_sets ?? [])]
                .sort((a: any, b: any) => a.set_number - b.set_number)
                .map((set: any) => (
                  <div key={set.id} className="grid grid-cols-4 gap-2 rounded-2xl bg-black/20 p-2 text-center text-sm">
                    <Info label="Serie" value={set.set_number ?? "-"} />
                    <Info label="Reps" value={set.reps ?? "-"} />
                    <Info label="Kg" value={set.weight || "-"} />
                    <Info label="RPE" value={set.rpe ?? "-"} />
                  </div>
                ))}
            </div>
            {item.personal_notes ? <p className="mt-3 rounded-2xl bg-black/20 p-3 text-sm text-slate-200">{item.personal_notes}</p> : null}
          </Card>
        ))}
      </section>

      <Card>
        <h2 className="mb-3 text-xl font-extrabold">Gestione sessione</h2>
        <SessionActions
          sessionId={session.id}
          workoutDayId={session.workout_day_id}
          status={session.status}
        />
      </Card>
    </div>
  );
}

function getStatusLabel(status: string) {
  if (status === "completed") return "Completato";
  if (status === "abandoned") return "Annullato";
  return "In corso";
}

function Info({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-black/20 p-2 text-center">
      <p className="text-xs text-gym-muted">{label}</p>
      <p className="font-extrabold">{value}</p>
    </div>
  );
}
